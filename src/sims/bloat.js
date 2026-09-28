/* 버퍼블로트: 집 공유기의 올림(업로드) 대기열이 큰 업로드로 가득 차면 작은 게임 패킷도 그 뒤에 선다.
   와이파이 재전송(지터·손실)까지 함께 본다. 레이어 3(집 네트워크) 장에서 쓴다. */
K.register('bloat', function (root) {
  const F = K.frame(root, {
    kicker: '레이어 3 · 집 네트워크',
    title: '동생이 영상을 올리면 내 핑이 튀는 이유 (버퍼블로트)',
    lead: '집 공유기는 인터넷으로 올려 보낼 패킷을 한 줄로 세워 둡니다. 누군가 큰 영상을 올리기 시작하면 이 줄이 꽉 차고, 작은 게임 패킷도 그 맨 뒤에 서야 합니다. 줄이 길어진 만큼 핑이 오릅니다. 와이파이 재전송까지 겹치면 핑은 들쭉날쭉해집니다.',
    tries: [
      '<b>다른 기기 업로드</b>를 “없음”으로 내렸다가 다시 “최대”로 올려 보세요. 몇 초에 걸쳐 대기열이 차오르고 핑이 따라 오릅니다.',
      '<b>SQM</b>을 켜 보세요. 업로드는 그대로인데 게임 핑은 기본 핑 근처로 돌아옵니다.',
      '<b>버퍼 크기</b>를 가장 작게 줄여 보세요. 줄이 짧아져 핑은 내려가지만, 넘치는 패킷은 버려집니다.',
      '업로드를 없음으로 두고 <b>와이파이 신호</b>를 “매우 약함”으로 옮겨 보세요. 차트의 뾰족한 가시는 재전송, × 표시는 끝내 사라진 패킷입니다.',
    ],
    layout: 'side',
  });

  K.addStyle('bloat', '.sim[data-sim="bloat"] .cv-cap{flex-wrap:wrap}.sim[data-sim="bloat"] .cv-cap b{white-space:nowrap}');
  const GAME_B = 80, GAME_IV = 50, MTU = 1500, BASE = 8, RTT_B = 30, CAPW = 8e6;
  const DEF = { cap: 10, up: 100, bufV: 75, sqm: false, sig: 10, intf: false };
  const P = Object.assign({}, DEF);
  const kb = v => Math.round(16 * Math.pow(2, 8 * v / 100));   // 슬라이더 0..100 → 16..4096 KB (로그 눈금)
  const bufBytes = () => kb(P.bufV) * 1000;
  const Cb = () => P.cap * 125;                                   // 바이트/ms
  const rnd = K.rng(11);

  const qcv = K.canvas(F.stage, {
    height: 156, caption: '공유기 올림 대기열',
    right: '<span class="legend"><span><i class="box" style="background:var(--muted)"></i>다른 트래픽</span><span><i class="box" style="background:var(--s1)"></i>게임 패킷</span></span>',
  });
  const ccv = K.canvas(F.stage, {
    height: w => K.clamp(w * 0.38, 190, 250), caption: '게임 패킷 핑 (최근 10초)',
    right: '<span class="legend"><span><i style="background:var(--s1)"></i>핑</span><span><i style="background:var(--ink-2)"></i>기본 핑</span><span><b style="color:var(--bad-ink)">×</b> 손실</span></span>',
  });

  /* ---------- 조작부 ---------- */
  const g1 = K.group(F.controls, '회선·공유기');
  const sCap = K.slider(g1, { label: '올림 속도', min: 1, max: 100, step: 1, value: P.cap, unit: 'Mbps', onInput: v => { P.cap = v; sBuf.set(P.bufV, false); } });
  const sBuf = K.slider(g1, {
    label: '공유기 버퍼 크기', min: 0, max: 100, step: 1, value: P.bufV,
    fmt: v => `${K.n(kb(v))} KB · ${K.ms(kb(v) * 8 / P.cap)}`,
    onInput: v => { P.bufV = v; trimToBuffer(); },
    hint: '버퍼가 꽉 찼을 때 줄을 다 비우는 데 걸리는 시간(ms)도 함께 표시합니다.',
  });
  const tSqm = K.toggle(g1, { label: 'SQM (스마트 대기열 관리: fq_codel/CAKE)', value: P.sqm, onChange: v => { P.sqm = v; switchMode(); }, hint: '흐름마다 줄을 따로 세우고, 큰 흐름의 줄은 5ms 안팎으로 짧게 유지합니다. 실제 공유기에서는 속도를 회선의 90~95%로 맞춰야 줄이 공유기 안에 생겨 효과가 납니다.' });
  const g2 = K.group(F.controls, '다른 트래픽');
  const sUp = K.slider(g2, {
    label: '다른 기기 업로드', min: 0, max: 100, step: 5, value: P.up,
    fmt: v => v === 0 ? '없음' : v >= 100 ? '최대 (대용량)' : `회선의 ${v}%`,
    onInput: v => { const was = P.up; P.up = v; if (v >= 100 && was < 100) startBulk(); },
    hint: '“최대”는 영상 업로드·클라우드 백업처럼 회선이 허락하는 만큼 계속 밀어 넣는 전송입니다.',
  });
  const g3 = K.group(F.controls, '와이파이');
  const sigName = v => v < 25 ? '좋음' : v < 55 ? '보통' : v < 85 ? '약함' : '매우 약함';
  const pFail = v => 0.02 + 0.58 * v / 100;
  const sSig = K.slider(g3, { label: '와이파이 신호', min: 0, max: 100, step: 5, value: P.sig, fmt: v => `${sigName(v)} · 실패 ${Math.round(pFail(v) * 100)}%`, onInput: v => { P.sig = v; }, hint: '한 번 보낼 때 실패할 확률. 실패하면 잠깐 쉬었다 다시 보내고, 8번 모두 실패하면 패킷을 잃습니다.' });
  const tIntf = K.toggle(g3, { label: '전자레인지·이웃 공유기 간섭', value: P.intf, onChange: v => { P.intf = v; }, hint: '2.5초마다 0.3초씩 전파가 거의 막힌다고 단순화했습니다. 실제 전자레인지는 돌아가는 내내 2.4GHz 와이파이를 방해하고, 5GHz는 영향을 거의 받지 않습니다.' });

  const ctlSet = () => { sCap.set(P.cap, false); sBuf.set(P.bufV, false); tSqm.set(P.sqm, false); sUp.set(P.up, false); sSig.set(P.sig, false); tIntf.set(P.intf, false); };
  const bv = k => Math.round(Math.log2(k / 16) / 8 * 100);
  const preset = o => () => {
    const wasUp = P.up, wasSqm = P.sqm;
    Object.assign(P, DEF, o); ctlSet();
    if (P.sqm !== wasSqm) switchMode();
    if (P.up >= 100 && wasUp < 100) startBulk();
    trimToBuffer();
    // 새 상황의 10초를 바로 채워 보여 준다
    hist.length = 0;
    for (let i = 0; i < 10; i++) step(1000);
  };
  K.presets(F, [
    { label: '혼자 게임', apply: preset({ up: 0 }) },
    { label: '가족이 4K 영상 업로드', apply: preset({}) },
    { label: '클라우드 백업 + 큰 버퍼 공유기', apply: preset({ cap: 20, bufV: bv(4096) }) },
    { label: 'SQM 켠 공유기', apply: preset({ sqm: true }) },
    { label: '벽 두 개 너머 와이파이', apply: preset({ up: 0, sig: 85 }) },
    { label: '전자레인지 간섭', apply: preset({ up: 0, sig: 30, intf: true }) },
  ]);

  const stPing = K.stat(F.stats, { label: '게임 핑 (지금)' });
  const stMax = K.stat(F.stats, { label: '최대 핑 (10초)' });
  const stJit = K.stat(F.stats, { label: '지터', sub: '연속 패킷 지연 차이 평균' });
  const stLoss = K.stat(F.stats, { label: '손실', unit: '%' });
  const stFill = K.stat(F.stats, { label: '대기열 채움', unit: '%' });

  /* ---------- 시뮬레이션 상태 ---------- */
  let t = 0;
  let q = [], qh = 0;          // 한 줄(FIFO): 배열 + 머리 위치
  let qg = [], qb = [];        // SQM: 게임 줄 / 다른 트래픽 줄
  let qBytes = 0, bulkBytes = 0;
  let cur = null;              // 지금 회선으로 나가는 중인 패킷
  let cwnd = 15000, wmax = 0, tLoss = 0, inSS = true, recUntil = 0;
  let tokens = 0, nextBurst = 0, nextGame = 0;
  const air = [];              // 와이파이를 건너는 중인 게임 패킷
  const hist = [];             // {t, lat, lost, r}
  const drops = [];            // 버려진 시각
  const flyOut = [];           // 화면용: 막 나간 게임 패킷

  function addHist(e) {       // 보낸 시각 순서를 유지한다 (늦게 도착한 패킷이 나중에 기록되므로)
    let i = hist.length;
    while (i > 0 && hist[i - 1].t > e.t) i--;
    hist.splice(i, 0, e);
  }
  function startBulk() { inSS = true; cwnd = 15000; recUntil = 0; }
  function switchMode() {
    if (P.sqm) {
      const rest = q.slice(qh); q = []; qh = 0;
      qg = rest.filter(p => p.g); qb = rest.filter(p => !p.g);
    } else {
      q = qg.concat(qb).sort((a, b) => a.ta - b.ta); qh = 0; qg = []; qb = [];
      inSS = true; cwnd = Math.max(cwnd, Cb() * RTT_B);
    }
  }
  function trimToBuffer() {
    const B = bufBytes();
    if (P.sqm) return;
    while (qBytes > B && q.length > qh) {
      const p = q.pop(); qBytes -= p.b; if (!p.g) bulkBytes -= p.b;
      else addHist({ t: p.ts, lat: null, lost: true, r: p.r });
    }
  }
  function enqueue(p) {
    p.ta = t;
    if (P.sqm) { (p.g ? qg : qb).push(p); qBytes += p.b; if (!p.g) bulkBytes += p.b; return true; }
    if (qBytes + p.b > bufBytes()) {
      drops.push(t);
      if (p.g) addHist({ t: p.ts, lat: null, lost: true, r: p.r });
      return false;
    }
    q.push(p); qBytes += p.b; if (!p.g) bulkBytes += p.b;
    return true;
  }
  function onBulkLoss() {
    if (t < recUntil) return;
    wmax = cwnd / MTU; cwnd *= 0.7; tLoss = t; inSS = false;   // CUBIC(리눅스·윈도우·macOS 기본)은 손실 때 30% 줄인다
    recUntil = t + RTT_B + qBytes / Cb();
  }
  function pick() {
    if (P.sqm) return qg.length ? qg.shift() : qb.shift();
    if (qh >= q.length) return null;
    const p = q[qh++];
    if (qh > 2000 && qh * 2 > q.length) { q = q.slice(qh); qh = 0; }
    return p;
  }
  function finish(p, tc) {
    if (!p.g) return;
    addHist({ t: p.ts, lat: BASE + (tc - p.ta) + p.tw, r: p.r, tw: p.tw });
    flyOut.push(t);
  }
  function wifiFailP(tt) {
    let p = pFail(P.sig);
    if (P.intf && tt % 2500 < 300) p = Math.max(p, 0.92);
    return p;
  }

  function step1() {          // 1ms 진행
    const C = Cb(), bdp = C * RTT_B;
    // 1) 게임 패킷 생성 → 와이파이
    if (t >= nextGame) {
      nextGame += GAME_IV;
      const p = wifiFailP(t);
      let d = 0.3, r = 0;
      while (r < 8 && rnd() < p) { d += (1 + 3 * rnd()) * Math.pow(1.6, r) + 0.3; r++; }
      if (r >= 8) addHist({ t, lat: null, lost: true, r });
      else air.push({ g: true, b: GAME_B, ts: t, tw: d, at: t + d, r });
    }
    while (air.length && air[0].at <= t) enqueue(air.shift());
    // 2) 다른 기기 업로드
    if (P.up > 0 && P.up < 100) {
      // 속도가 정해진 전송: 쌓인 만큼 30ms 마다 한 번에 몰아 보낸다
      tokens += P.up / 100 * C;
      if (t >= nextBurst) {
        nextBurst = t + RTT_B;
        while (tokens >= MTU) { tokens -= MTU; enqueue({ g: false, b: MTU }); }
      }
    } else if (P.up >= 100) {
      const rtt = RTT_B + qBytes / C;
      if (P.sqm) cwnd = bdp + C * 5 + 3000;
      else if (inSS) cwnd = Math.min(CAPW, cwnd * Math.pow(2, 1 / rtt));
      else {
        const el = (t - tLoss) / 1000, Kc = Math.cbrt(wmax * 0.3 / 0.4);
        cwnd = Math.min(CAPW, (wmax + 0.4 * Math.pow(el - Kc, 3)) * MTU);
      }
      let guard = 0;
      while (bulkBytes + MTU <= cwnd - bdp && guard++ < 400) {
        if (!enqueue({ g: false, b: MTU })) { onBulkLoss(); break; }
      }
    } else tokens = 0;
    // 3) 회선으로 내보내기
    let budget = C, tc = t;
    while (budget > 0) {
      if (!cur) {
        const p = pick();
        if (!p) break;
        qBytes -= p.b; if (!p.g) bulkBytes -= p.b;
        cur = { p, rem: p.b };
      }
      const take = Math.min(cur.rem, budget);
      cur.rem -= take; budget -= take; tc += take / C;
      if (cur.rem <= 0) { finish(cur.p, tc); cur = null; }
    }
    t += 1;
  }
  function step(dt) {
    const n = Math.round(dt);
    for (let i = 0; i < n; i++) step1();
    while (hist.length && hist[0].t < t - 10500) hist.shift();
    while (drops.length && drops[0] < t - 1000) drops.shift();
    while (flyOut.length && flyOut[0] < t - 400) flyOut.shift();
  }
  // 미리 15초 돌려 차트를 채운다 (업로드가 시작되어 대기열이 차오른 뒤의 모습)
  for (let i = 0; i < 15; i++) step(1000);

  /* ---------- 측정 ---------- */
  function measure() {
    const win = hist.filter(h => h.t >= t - 10000);
    const ok = win.filter(h => !h.lost);
    let jit = 0;
    for (let i = 1; i < ok.length; i++) jit += Math.abs(ok[i].lat - ok[i - 1].lat);
    jit = ok.length > 1 ? jit / (ok.length - 1) : 0;
    const last = ok.length ? ok[ok.length - 1].lat : BASE;
    const max = ok.reduce((a, h) => Math.max(a, h.lat), 0);
    const loss = win.length ? (win.length - ok.length) / win.length : 0;
    const qms = qBytes / Cb();
    const retry = ok.length ? ok.reduce((a, h) => a + h.r, 0) / ok.length : 0;
    const wifiMs = ok.length ? ok.reduce((a, h) => a + h.tw, 0) / ok.length : 0;
    return { win, ok, jit, last, max, loss, qms, retry, wifiMs, fill: qBytes / bufBytes() };
  }

  /* ---------- 그리기: 대기열 ---------- */
  function drawQueue(M) {
    const { ctx, w, h } = qcv, C = K.C;
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 520;
    const Lw = narrow ? 66 : 100, Rw = narrow ? 50 : 76;
    const px0 = Lw, px1 = w - Rw, pw = px1 - px0, py = 36, ph = 44;
    const B = bufBytes();
    K.text(ctx, `대기열 ${K.n(qBytes / 1000, qBytes < 10000 ? 1 : 0)} KB = ${K.ms(M.qms)}`, px0, 14, { size: 12.5, weight: 700, color: C.ink });
    if (!narrow) K.text(ctx, '앞의 패킷이 다 나가야 뒤의 패킷이 출발합니다', px1, 14, { size: 11, color: C.muted, align: 'right' });
    // 내 PC 와 와이파이 링크
    ctx.strokeStyle = C.line; ctx.lineWidth = 1.5;
    K.rr(ctx, 6, py + 8, Lw - 30, ph - 16, 5); ctx.fillStyle = C.surface; ctx.fill(); ctx.stroke();
    K.text(ctx, '내 PC', 6 + (Lw - 30) / 2, py + ph / 2, { size: 10.5, align: 'center', color: C.ink2, weight: 600 });
    ctx.save(); ctx.strokeStyle = C.muted; ctx.setLineDash(P.sig >= 55 || P.intf ? [2, 3] : []); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(Lw - 24, py + ph / 2); ctx.lineTo(px0 - 2, py + ph / 2); ctx.stroke(); ctx.restore();
    // 최근 게임 패킷의 와이파이 재전송 횟수
    const recent = hist.slice(-12);
    const bw = (Lw - 12) / 12;
    recent.forEach((hh, i) => {
      const x = 6 + i * bw, yb = py + ph + 30;
      if (hh.lost) K.text(ctx, '×', x + bw / 2, yb - 5, { size: 11, align: 'center', color: C.badInk, weight: 700 });
      else {
        const hh2 = 2 + Math.min(hh.r, 8) * 2.4;
        ctx.fillStyle = hh.r ? C.s1 : C.line; ctx.fillRect(x + 0.5, yb - hh2, Math.max(1.5, bw - 1.5), hh2);
      }
    });
    K.text(ctx, narrow ? '재전송' : '와이파이 재전송', 6, py + ph + 42, { size: 10.5, color: C.muted });
    // 관(버퍼)
    ctx.fillStyle = C.sunk; K.rr(ctx, px0, py, pw, ph, 6); ctx.fill();
    ctx.save(); K.rr(ctx, px0, py, pw, ph, 6); ctx.clip();
    const X = bytes => px1 - (bytes / B) * pw;
    if (P.sqm) {
      const gy = py + 4, gh = 12, by = py + 20, bh = ph - 24;
      let pos = 0;
      ctx.fillStyle = K.alpha(C.muted, 0.75);
      const bpx = MTU / B * pw;
      qb.forEach(p => { const x = X(pos + p.b); if (bpx >= 3) { K.rr(ctx, x, by, bpx - 1, bh, 2); ctx.fill(); } else ctx.fillRect(x, by, bpx + 0.3, bh); pos += p.b; });
      K.text(ctx, '다른 트래픽 줄 (5ms 안팎으로 유지)', px0 + 8, by + bh / 2, { size: 10.5, color: C.muted });
      K.text(ctx, '게임 전용 줄', px0 + 8, gy + gh / 2, { size: 10.5, color: C.muted });
      let gp = 0;
      qg.forEach(p => { pill(ctx, X(gp) - 12, gy, 12, gh); gp += p.b; });
    } else {
      let pos = 0;
      const bpx = MTU / B * pw;
      const yy = py + 6, hh = ph - 12;
      ctx.fillStyle = K.alpha(C.muted, 0.75);
      if (bpx < 3) ctx.fillRect(X(qBytes), yy, qBytes / B * pw, hh);
      const games = [];
      for (let i = qh; i < q.length; i++) {
        const p = q[i];
        if (p.g) games.push(X(pos + p.b));
        else if (bpx >= 3) { K.rr(ctx, X(pos + p.b), yy, bpx - 1, hh, 2); ctx.fill(); }
        pos += p.b;
      }
      const gap = GAME_IV * Cb() / B * pw;                 // 게임 패킷 사이 간격(px)
      const gw = K.clamp(gap - 6, 3, 12);
      games.forEach(x => pill(ctx, x - gw / 2, py + 12, gw, ph - 24));
      if (drops.length && drops[drops.length - 1] > t - 350) {
        const x = Math.max(px0 + 10, X(qBytes) - 10);
        K.text(ctx, '×', x, py + ph / 2, { size: 16, weight: 700, color: C.bad, align: 'center' });
      }
    }
    ctx.restore();
    // 나가는 쪽
    const ax = px1 + 6, ay = py + ph / 2;
    ctx.strokeStyle = C.ink2; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(w - 10, ay); ctx.moveTo(w - 15, ay - 4); ctx.lineTo(w - 10, ay); ctx.lineTo(w - 15, ay + 4); ctx.stroke();
    flyOut.forEach(ft => { const k = (t - ft) / 400; ctx.globalAlpha = 1 - k * 0.7; pill(ctx, ax + k * (w - 24 - ax), ay - 3.5, 7, 7); ctx.globalAlpha = 1; });
    K.text(ctx, '인터넷', (ax + w - 10) / 2, py + 2, { size: 10.5, align: 'center', color: C.muted });
    K.text(ctx, P.cap + ' Mbps', (ax + w - 10) / 2, py + ph + 6, { size: 10.5, align: 'center', color: C.muted, mono: true });
    // 아래 설명
    K.text(ctx, narrow ? `버퍼 ${K.n(B / 1000)} KB = ${K.ms(B / Cb())}` : `버퍼 ${K.n(B / 1000)} KB = 가득 차면 ${K.ms(B / Cb())} 대기`, px0, py + ph + 16, { size: 11, color: C.ink2 });
    const dps = drops.length;
    if (dps && !P.sqm) K.text(ctx, `넘쳐서 버림 ${dps}개/초`, px1, py + ph + 32, { size: 11, color: C.badInk, weight: 600, align: 'right' });
  }
  function pill(ctx, x, y, w, h) {
    ctx.fillStyle = K.C.surface; K.rr(ctx, x - 2, y - 2, w + 4, h + 4, (h + 4) / 2); ctx.fill();
    ctx.fillStyle = K.C.s1; K.rr(ctx, x, y, w, h, h / 2); ctx.fill();
  }

  /* ---------- 그리기: 핑 차트 ---------- */
  let sc = null;
  function niceMax(v) {
    const steps = [20, 40, 60, 80, 100, 160, 200, 300, 400, 600, 800, 1000, 1200, 1600, 2000, 3000, 4000, 6000, 8000];
    return steps.find(s => s >= v) || Math.ceil(v / 1000) * 1000;
  }
  function drawChart(M) {
    const { ctx, w, h } = ccv, C = K.C;
    ctx.clearRect(0, 0, w, h);
    const yMax = niceMax(Math.max(30, M.max * 1.1));
    const box = { x: 48, y: 24, w: w - 60, h: h - 56 };
    const yt = [0, yMax / 4, yMax / 2, yMax * 3 / 4, yMax];
    sc = K.plot(ctx, box, {
      x0: -10, x1: 0, y0: 0, y1: yMax, yTicks: yt, yFmt: v => K.n(v), xTicks: w < 520 ? [-10, -5, 0] : [-10, -8, -6, -4, -2, 0],
      xFmt: v => (v === 0 ? '지금' : -v + '초 전'), yTitle: '핑 (ms)',
    });
    K.hline(ctx, sc, BASE, { color: C.ink2, dash: [4, 3] });
    let run = [];
    const flush = () => { if (run.length) K.line(ctx, sc, run, C.s1, 2); run = []; };
    M.win.forEach(hh => {
      const x = (hh.t - t) / 1000;
      if (hh.lost) { flush(); K.text(ctx, '×', sc.x(x), box.y + 8, { size: 12, weight: 700, align: 'center', color: C.badInk }); }
      else run.push([x, Math.min(hh.lat, yMax)]);
    });
    flush();
    if (M.ok.length) { const l = M.ok[M.ok.length - 1]; K.dot(ctx, sc.x((l.t - t) / 1000), sc.y(Math.min(l.lat, yMax)), 3.5, C.s1); }
    // 기본 핑 이름표 (선 위에 겹치지 않게 바탕을 깐다)
    const lab = '기본 핑 ' + BASE + ' ms', ly = sc.y(BASE) - 9;
    ctx.font = K.font(10.5, 600);
    const lw = ctx.measureText(lab).width + 8;
    ctx.fillStyle = K.alpha(C.paper, 0.9); K.rr(ctx, box.x + 4, ly - 8, lw, 16, 4); ctx.fill();
    K.text(ctx, lab, box.x + 8, ly, { size: 10.5, weight: 600, color: C.ink2 });
  }
  K.hover(ccv, x => {
    if (!sc) return null;
    const b = sc.box;
    if (x < b.x || x > b.x + b.w) return null;
    const tt = t + ((x - b.x) / b.w - 1) * 10000;
    let best = null, bd = 1e9;
    hist.forEach(hh => { const d = Math.abs(hh.t - tt); if (d < bd) { bd = d; best = hh; } });
    if (!best || bd > 200) return null;
    const ago = K.n((t - best.t) / 1000, 1) + '초 전';
    if (best.lost) return `${ago}<br><b>손실</b>: 이 패킷은 도착하지 못했습니다`;
    return `${ago} · 핑 <b>${K.ms(best.lat)}</b><br>와이파이 재전송 ${best.r}회 · 대기열 ${K.ms(Math.max(0, best.lat - BASE - best.tw))}`;
  });

  /* ---------- 수치·해설 ---------- */
  function narrate(M) {
    const st = M.last > 100 || M.loss > 0.01 ? 'bad' : M.last > 30 || M.jit > 8 || M.max > 40 || M.loss > 0.002 ? 'warn' : 'good';
    stPing.set(K.ms(M.last), M.last > 100 ? 'bad' : M.last > 30 ? 'warn' : 'good');
    stMax.set(K.ms(M.max), M.max > 150 ? 'bad' : M.max > 40 ? 'warn' : 'good');
    stJit.set(K.ms(M.jit), M.jit > 20 ? 'bad' : M.jit > 5 ? 'warn' : 'good');
    stLoss.set(K.n(M.loss * 100, 1), M.loss > 0.01 ? 'bad' : M.loss > 0.001 ? 'warn' : 'good');
    stFill.set(K.n(M.fill * 100, 0), M.fill > 0.5 ? 'bad' : M.fill > 0.1 ? 'warn' : 'good');
    const parts = [];
    const bloated = !P.sqm && M.qms > 20;
    if (P.up >= 100 && bloated) {
      parts.push(`다른 기기의 대용량 업로드가 공유기 대기열을 <b>${K.n(M.fill * 100, 0)}%</b> 채웠습니다. 게임 패킷은 앞에 선 영상 패킷 ${K.n(qBytes / 1000)}KB가 다 나갈 때까지 <b>${K.ms(M.qms)}</b>를 기다립니다. 핑이 ${K.ms(M.last)}까지 올라 누른 스킬이 늦게 나가는 입력 지연이 생깁니다. 막힌 쪽은 올림 줄이라, 서버가 보내는 다른 캐릭터 패킷은 대부분 제때 옵니다. “남의 움직임은 멀쩡한데 내 스킬만 늦다”가 이 경우의 단서입니다.`);
      if (M.loss > 0.001) parts.push(`줄이 꽉 차면 게임 패킷까지 버려져(손실 ${K.n(M.loss * 100, 1)}%) 고무줄 현상도 납니다.`);
      parts.push('<b>SQM</b>을 켜면 게임 패킷이 따로 줄을 서서 바로 나갑니다.');
    } else if (P.up >= 100 && P.sqm) {
      parts.push(`SQM이 켜져 있어 업로드는 계속되지만 그 줄은 5ms 안팎으로 짧게 유지되고, 게임 패킷은 전용 줄로 바로 나갑니다. 핑 <b>${K.ms(M.last)}</b>, 버퍼 크기와 상관없이 기본 핑 근처입니다.`);
    } else if (P.up >= 100) {
      parts.push(`버퍼가 작아 줄이 금방 넘칩니다. 대기는 <b>${K.ms(M.qms)}</b>로 짧지만, 넘친 패킷은 버려지고 업로드는 속도를 30%쯤 줄였다 다시 올리기를 반복합니다. 다만 버퍼 크기 하나로는 회선 속도와 상황마다 알맞게 맞추기 어렵고, 더 줄이면 업로드가 회선 속도를 다 쓰지 못합니다. 그래서 답은 작은 버퍼보다 SQM입니다.`);
    } else if (P.up > 0) {
      parts.push(`업로드가 회선의 ${P.up}%만 씁니다. 몰려 들어온 패킷이 짧게 줄을 섰다가 금방 빠져서 대기는 평균 ${K.ms(Math.max(0, (M.ok.reduce((a, h) => a + h.lat, 0) / Math.max(1, M.ok.length)) - BASE - M.wifiMs))} 정도입니다. 회선이 거의 꽉 찰수록 지터가 커집니다.`);
    } else {
      parts.push('올릴 다른 트래픽이 없어 게임 패킷이 줄을 서지 않고 바로 나갑니다.');
    }
    if (P.intf) parts.push(`2.5초마다 간섭이 0.3초씩 전파를 막아 그 순간의 패킷이 재전송을 거듭하다 사라집니다(손실 ${K.n(M.loss * 100, 1)}%). 화면에서는 주기적인 멈춤 뒤에 순간이동·고무줄로 보입니다.`);
    else if (P.sig >= 55) parts.push(`와이파이 신호가 약해 패킷마다 평균 ${K.n(M.retry, 1)}번 다시 보냅니다. 도착 시간이 들쭉날쭉해져(지터 ${K.ms(M.jit)}) 캐릭터가 뚝뚝 끊기${M.loss > 0 ? `고, 8번 모두 실패한 패킷은 사라져(손실 ${K.n(M.loss * 100, 1)}%) 순간이동·고무줄이 생깁니다` : '는 모습으로 보입니다'}. 공유기 가까이 가거나 랜선을 쓰면 사라집니다.`);
    F.say(K.flag(st) + parts.join(' '));
  }

  K.loop(root, dt => {
    step(dt);
    const M = measure();
    drawQueue(M);
    drawChart(M);
    narrate(M);
  });
});
