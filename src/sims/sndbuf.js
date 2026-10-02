/* 송신 버퍼와 느린 클라이언트. 서버 스레드 하나가 틱마다 8명에게 보낸다.
   회선이 느린 클라이언트의 송신 버퍼가 가득 찼을 때 서버 코드가 어떻게 하느냐(블로킹·최신만·킥·무제한)에 따라
   그 클라이언트만 불편하거나, 서버 전체가 렉에 빠지거나, 서버가 메모리 부족으로 죽는다. */
K.register('sndbuf', function (root) {
  const TR = I18N.tr('sim-sndbuf');   // 이 실험 묶음의 사전을 먼저 본다(i18n.js)
  const F = K.frame(root, {
    kicker: TR`소켓과 프로토콜 · 송신 버퍼`,
    title: TR`느린 클라이언트 하나가 모두를 느리게 만드는 법`,
    lead: TR`서버는 틱마다 클라이언트 8개에게 업데이트를 보냅니다. 보낸 데이터는 먼저 클라이언트마다 있는 <b>송신 버퍼</b>(운영체제가 연결마다 잡아 둔 전송 대기 메모리)에 담겼다가 회선 속도만큼 빠져나갑니다. 회선이 느린 클라이언트는 이 버퍼가 금방 가득 찹니다. 그때 서버 코드가 어떻게 하느냐에 따라 그 클라이언트만 불편하거나, 서버 전체가 렉에 빠집니다.`,
    tries: [
      TR`처음 화면(느린 클라이언트 1개 + 블로킹)에서 <b>서버 스레드</b> 줄의 빨간 구간을 보세요. 한 클라이언트에게 보내느라 서버가 멈춰 서 있고, 정상 클라이언트 7개의 지연도 함께 올라갑니다.`,
      TR`<b>가득 찼을 때</b>를 “최신만 남기기”로 바꿔 보세요. 느린 클라이언트만 뚝뚝 끊기고, 서버 틱과 나머지 클라이언트는 멀쩡해집니다.`,
      TR`블로킹 상태에서 <b>송신 버퍼</b>를 1MB로 키워 보세요. 막히는 시점이 30초쯤 늦춰질 뿐 결국 똑같이 막히고, 느린 클라이언트의 지연은 수십 초가 됩니다.`,
      TR`<b>무제한 쌓기</b>를 불러와 아래 서버 메모리 그래프를 보세요. 한도를 넘는 순간 서버가 죽고 모두의 접속이 끊깁니다.`,
      TR`<b>보낼 양</b>을 느린 클라이언트 회선 속도보다 낮춰 보세요. 어떤 정책이든 문제가 사라집니다. 원인은 “보낼 양 > 회선 속도”입니다.`,
    ],
    layout: 'side',
  });

  const N = 8, TICK = 50, WORK = 8, H = 2, NORM = 1000;
  const SLOT = [2, 5, 7];                       // 느린 클라이언트 자리: 3번, 6번, 8번
  const SCALE = 250, MEM0 = 1229, MEMMAX = 2048; // 8명은 2,000명의 표본. 메모리는 MB
  const WIN = 20000, TWIN = 3000;
  const P = { rate: 60, slowN: 1, slowDown: 30, buf: 64, pol: 'block' };
  const POL = {
    block: TR`버퍼에 빈 공간이 생길 때까지 send()가 반환되지 않습니다. 서버 스레드가 그 자리에서 멈춥니다.`,
    latest: TR`버퍼가 차 있으면 가장 새 업데이트 하나만 남기고 나머지는 버립니다.`,
    kick: TR`못 보낸 데이터를 서버 메모리에 쌓아 두다가, 5초 넘게 밀리면 연결을 끊습니다.`,
    unlimited: TR`못 보낸 데이터를 서버 메모리에 끝없이 쌓습니다.`,
  };

  /* ---------- 무대 ---------- */
  const room = K.canvas(F.stage, {
    height: 58 + 22 + N * 25 + 6,
    caption: TR`서버 스레드와 클라이언트 8개`,
    right: TR`<span class="legend"><span><i class="box" style="background:var(--good)"></i>일함</span><span><i class="box" style="background:var(--bad)"></i>send() 대기</span><span><i class="box" style="background:var(--line)"></i>쉼</span></span>`,
  });
  const chart = K.canvas(F.stage, {
    height: w => K.clamp(Math.round(w * 0.36), 190, 240),
    caption: TR`클라이언트 화면 지연 (최근 20초)`,
    right: TR`<span class="legend"><span><i style="background:var(--s1)"></i>정상 클라이언트 평균</span><span><i style="background:var(--s2)"></i>느린 클라이언트 평균</span></span>`,
  });
  const memBox = K.el('div');
  F.stage.append(memBox);
  const memCv = K.canvas(memBox, { height: 130, caption: TR`서버 메모리 (최근 20초)`, right: TR`동시 접속 2,000명 기준` });

  /* ---------- 조작부 ---------- */
  const g1 = K.group(F.controls, TR`서버`);
  const sRate = K.slider(g1, { label: TR`보낼 양 (주변 캐릭터 수)`, min: 10, max: 200, step: 10, value: P.rate, unit: 'KB/s', hint: TR`클라이언트 하나에 1초 동안 보내는 양. 주변 캐릭터가 많을수록 커집니다.`, onInput: v => { P.rate = v; } });
  const cBuf = K.choice(g1, { label: TR`송신 버퍼 크기 (SO_SNDBUF)`, value: P.buf, options: [[16, '16KB'], [64, '64KB'], [256, '256KB'], [1024, '1MB']], onChange: v => { P.buf = +v; } });
  const cPol = K.choice(g1, {
    label: TR`가득 찼을 때`, value: P.pol, hint: POL[P.pol],
    options: [['block', TR`블로킹 전송`], ['latest', TR`최신만 남기기`], ['kick', TR`밀리면 킥`], ['unlimited', TR`무제한 쌓기`]],
    onChange: v => { P.pol = v; polHint(); cl.forEach(c => { c.aq = []; c.af = 0; c.since = null; }); memBox.hidden = v !== 'unlimited'; },
  });
  const polHintEl = cPol.el.querySelector('.ctl-hint');
  function polHint() { polHintEl.textContent = POL[P.pol]; }
  const g2 = K.group(F.controls, TR`클라이언트 회선`);
  const sSlowN = K.slider(g2, { label: TR`느린 클라이언트 수`, min: 0, max: 3, step: 1, value: P.slowN, unit: TR`개`, onInput: v => { P.slowN = v; } });
  const sSlowD = K.slider(g2, { label: TR`느린 클라이언트 회선 속도`, min: 5, max: 200, step: 5, value: P.slowDown, unit: 'KB/s', hint: TR`정상 클라이언트는 1000 KB/s. 약한 LTE나 붐비는 와이파이는 수십 KB/s까지 떨어집니다.`, onInput: v => { P.slowDown = v; } });

  const stN = K.stat(F.stats, { label: TR`정상 클라이언트 지연`, sub: TR`화면이 몇 초 전 모습인지` });
  const stS = K.stat(F.stats, { label: TR`느린 클라이언트 지연`, sub: ' ' });
  const stHz = K.stat(F.stats, { label: TR`서버 틱레이트`, unit: 'Hz', sub: TR`목표 20Hz` });
  const stBlk = K.stat(F.stats, { label: TR`스레드 막힘`, unit: '%', sub: TR`최근 5초 중 send() 대기` });
  const stMem = K.stat(F.stats, { label: TR`서버 메모리`, unit: 'GB', sub: TR`한도 2 GB` });

  /* ---------- 모형 ---------- */
  let t, cl, sv, lat, thr, marks, bands, ticks, acc;
  function fresh(c, now) { Object.assign(c, { st: 'ok', kq: [], kf: 0, aq: [], af: 0, arr: [], lastGen: now, since: null, dropR: 0 }); }
  function reset() {
    t = 0;
    cl = Array.from({ length: N }, (_, i) => { const c = { i, ema: 40, skipT: -1e9, until: 0, band: null }; fresh(c, 0); return c; });
    sv = { st: 'idle', next: 0, end: 0, tick0: 0, idx: 0, downUntil: 0, band: null };
    lat = []; thr = [[0, 'idle']]; marks = []; bands = []; ticks = [];
    acc = { t0: 0, n: 0, cn: 0, s: 0, cs: 0 };
  }
  const isSlow = c => { const k = SLOT.indexOf(c.i); return k >= 0 && k < P.slowN; };
  const rateOf = c => (isSlow(c) ? P.slowDown : NORM) / 1000;   // KB/ms
  const propOf = c => (isSlow(c) ? 60 : 20);
  const memMB = () => MEM0 + (SCALE * cl.reduce((a, c) => a + c.af, 0)) / 1024;
  function setSt(s) { if (sv.st !== s) { sv.st = s; thr.push([t, s]); } }

  function kick(c, now) {
    Object.assign(c, { st: 'kicked', until: now + 4000, kq: [], kf: 0, aq: [], af: 0, arr: [], since: null });
    c.band = { a: now, b: null, kind: 'kick' }; bands.push(c.band);
  }
  function crash(now) {
    setSt('down'); sv.downUntil = now + 5000;
    cl.forEach(c => Object.assign(c, { st: 'down', kq: [], kf: 0, aq: [], af: 0, arr: [] }));
    sv.band = { a: now, b: null, kind: 'down' }; bands.push(sv.band);
  }

  function serverStep(now) {
    if (sv.st === 'down') {
      if (now < sv.downUntil) return;
      sv.band.b = now; setSt('idle'); sv.next = now; cl.forEach(c => fresh(c, now));
    }
    if (sv.st === 'idle' && now >= sv.next) { setSt('work'); sv.tick0 = now; sv.end = now + WORK; ticks.push(now); }
    if (sv.st === 'work' && now >= sv.end) { setSt('send'); sv.idx = 0; }
    if (sv.st !== 'send' && sv.st !== 'blocked') return;
    const kb = P.rate / 20;
    while (sv.idx < N) {
      const c = cl[sv.idx];
      if (c.st !== 'ok') { sv.idx++; continue; }
      const ch = { kb, left: kb, gen: sv.tick0 }, free = P.buf - c.kf;
      if (P.pol === 'block') {
        if (free + 1e-9 < kb) { setSt('blocked'); return; }
        c.kq.push(ch); c.kf += kb;
      } else if (!c.aq.length && free + 1e-9 >= kb) { c.kq.push(ch); c.kf += kb; c.dropR *= 0.95; }
      else if (P.pol === 'latest') { c.dropR = c.dropR * 0.95 + (c.aq.length ? 0.05 : 0); c.aq = [ch]; c.af = kb; c.skipT = now; }
      else { c.aq.push(ch); c.af += kb; }
      sv.idx++;
    }
    setSt('idle'); sv.next = sv.tick0 + TICK;
  }

  function sub() {
    const now = t;
    for (const c of cl) {
      if (c.st === 'kicked' && now >= c.until) { c.band.b = now; fresh(c, now); }
      if (c.st !== 'ok') continue;
      // 커널 송신 버퍼가 회선 속도로 빠진다
      let budget = rateOf(c) * H;
      while (budget > 1e-9 && c.kq.length) {
        const ch = c.kq[0], m = Math.min(budget, ch.left);
        ch.left -= m; budget -= m; c.kf -= m;
        if (ch.left <= 1e-9) { c.kq.shift(); c.arr.push([now + propOf(c), ch.gen]); }
      }
      if (c.kf < 1e-9) c.kf = 0;
      while (c.arr.length && c.arr[0][0] <= now) c.lastGen = Math.max(c.lastGen, c.arr.shift()[1]);
      // 앱 대기열 → 커널 버퍼 (블로킹이 아닐 때)
      while (c.aq.length && P.buf - c.kf + 1e-9 >= c.aq[0].kb) { const ch = c.aq.shift(); c.af -= ch.kb; c.kq.push(ch); c.kf += ch.kb; }
      if (!c.aq.length) c.af = 0;
      if (P.pol === 'kick') {
        if (c.aq.length) { if (c.since == null) c.since = now; else if (now - c.since >= 5000) kick(c, now); }
        else c.since = null;
      }
    }
    serverStep(now);
    if (P.pol === 'unlimited' && sv.st !== 'down' && memMB() > MEMMAX) crash(now);
    // 화면 나이 기록
    for (const c of cl) {
      if (c.st !== 'ok') continue;
      const age = now - c.lastGen;
      c.ema += (age - c.ema) * 0.0066;
      if (isSlow(c)) { acc.s += age; acc.cs++; } else { acc.n += age; acc.cn++; }
    }
    t += H;
    if (t - acc.t0 >= 250) {
      lat.push({ t, n: acc.cn ? acc.n / acc.cn : null, s: acc.cs ? acc.s / acc.cs : null, m: sv.st === 'down' ? null : memMB(), hz: hz() });
      acc = { t0: t, n: 0, cn: 0, s: 0, cs: 0 };
      while (lat.length && lat[0].t < t - WIN - 500) lat.shift();
      while (thr.length > 2 && thr[1][0] < t - 6000) thr.shift();
      while (ticks.length && ticks[0] < t - 2000) ticks.shift();
      while (bands.length && bands[0].b != null && bands[0].b < t - WIN) bands.shift();
      while (marks.length && marks[0].t < t - WIN) marks.shift();
    }
  }
  function step(dt) { const end = t + dt; while (t < end) sub(); }
  function hz() { return ticks.filter(x => x > t - 2000).length / 2; }
  function blockedFrac(span) {
    let s = 0;
    for (let i = 0; i < thr.length; i++) {
      const a = Math.max(thr[i][0], t - span), b = i + 1 < thr.length ? thr[i + 1][0] : t;
      if (b > a && thr[i][1] === 'blocked') s += b - a;
    }
    return s / span;
  }

  /* ---------- 서버실 그림 ---------- */
  function shape(ctx, x, y, s, col) {
    ctx.fillStyle = col; ctx.beginPath();
    if (s === 'good') ctx.arc(x, y, 4, 0, 7);
    else if (s === 'warn') { ctx.moveTo(x, y - 4.5); ctx.lineTo(x + 4.5, y + 3.5); ctx.lineTo(x - 4.5, y + 3.5); ctx.closePath(); }
    else ctx.rect(x - 3.8, y - 3.8, 7.6, 7.6);
    ctx.fill();
  }
  function rowState(c, narrow) {
    if (c.st === 'down') return ['bad', narrow ? TR`다운` : TR`서버 다운`];
    if (c.st === 'kicked') return ['bad', narrow ? TR`킥` : TR`끊김 (킥)`];
    if (sv.st === 'blocked' && sv.idx === c.i) return ['bad', narrow ? TR`막힘` : TR`send() 막힘`];
    if (P.pol === 'latest' && t - c.skipT < 400) return ['warn', TR`건너뜀`];
    if (c.aq.length) return ['warn', P.pol === 'kick' && c.since != null ? TR`밀림 ${K.n(Math.max(0, 5 - (t - c.since) / 1000), 0)}초@@킥까지 남은 초(카운트다운)` : TR`밀림`];
    if (c.kf >= P.buf - P.rate / 20) return ['warn', narrow ? TR`가득` : TR`버퍼 가득`];
    if (c.ema > 150) return ['warn', TR`늦음`];
    return ['good', TR`정상`];
  }
  function meter(ctx, x, y, w, h, frac, col, txt) {
    ctx.fillStyle = K.C.sunk; K.rr(ctx, x, y, w, h, 3); ctx.fill();
    const fw = K.clamp(frac, 0, 1) * w;
    if (fw > 0.5) { ctx.fillStyle = col; K.rr(ctx, x, y, Math.max(fw, 3), h, 3); ctx.fill(); }
    if (txt) K.text(ctx, txt, x + w - 4, y + h / 2 + 0.5, { size: 10, mono: true, color: K.C.ink, align: 'right' });
  }
  function drawRoom() {
    const { ctx, w, h } = room, C = K.C, narrow = w < 480;
    ctx.clearRect(0, 0, w, h);
    // 서버 스레드
    K.text(ctx, narrow ? TR`서버 스레드` : TR`서버 스레드 (하나뿐)`, 10, 14, { size: 12, weight: 700, color: C.ink });
    let st, sc;
    if (sv.st === 'down') { st = TR`서버 다운 · 재시작까지 ` + K.n(Math.max(0, (sv.downUntil - t) / 1000), 0) + TR`초`; sc = C.badInk; }
    else if (sv.st === 'blocked') { st = TR`send() 대기 중 → 클라이언트 ` + (sv.idx + 1); sc = C.badInk; }
    else if (hz() < 18.5) { st = TR`틱이 밀리는 중`; sc = C.warnInk; }
    else { st = TR`틱마다 ` + WORK + TR`ms 일하고 쉼`; sc = C.goodInk; }
    K.text(ctx, st, w - 10, 14, { size: 11.5, weight: 600, color: sc, align: 'right' });
    const bx0 = 10, bx1 = w - 10, by = 26, bh = 14, X = tt => bx0 + ((tt - (t - TWIN)) / TWIN) * (bx1 - bx0);
    ctx.fillStyle = C.line; K.rr(ctx, bx0, by, bx1 - bx0, bh, 3); ctx.fill();
    ctx.save(); K.rr(ctx, bx0, by, bx1 - bx0, bh, 3); ctx.clip();
    for (let i = 0; i < thr.length; i++) {
      const a = Math.max(thr[i][0], t - TWIN), b = i + 1 < thr.length ? thr[i + 1][0] : t, s = thr[i][1];
      if (b <= a || s === 'idle') continue;
      ctx.fillStyle = s === 'blocked' ? C.bad : s === 'down' ? C.muted : C.good;
      ctx.fillRect(X(a), by, Math.max(1, X(b) - X(a)), bh);
    }
    ctx.restore();
    K.text(ctx, TR`3초 전`, bx0, by + bh + 9, { size: 10, color: C.muted });
    K.text(ctx, TR`지금`, bx1, by + bh + 9, { size: 10, color: C.muted, align: 'right' });

    // 클라이언트 표
    const top = 72, RH = 25;
    const nameW = narrow ? 70 : 118, stW = narrow ? 62 : 104, latW = narrow ? 48 : 70;
    const mx0 = 10 + nameW, space = w - 10 - stW - latW - mx0 - 8;
    const twoM = !narrow, kW = twoM ? space * 0.56 : space, aX = mx0 + kW + 8, aW = space - kW - 8;
    const hy = top - 6;
    K.text(ctx, TR`클라이언트`, 10, hy, { size: 10.5, color: C.muted });
    K.text(ctx, narrow ? TR`송신 버퍼` : TR`송신 버퍼 (` + (P.buf >= 1024 ? '1MB' : P.buf + 'KB') + ')', mx0, hy, { size: 10.5, color: C.muted });
    if (twoM) K.text(ctx, TR`앱 대기열`, aX, hy, { size: 10.5, color: C.muted });
    K.text(ctx, TR`지연`, w - 10 - stW - 8, hy, { size: 10.5, color: C.muted, align: 'right' });
    K.text(ctx, TR`상태`, w - 10 - stW + 4, hy, { size: 10.5, color: C.muted });
    for (const c of cl) {
      const y = top + c.i * RH + RH / 2, slow = isSlow(c);
      if (slow) { ctx.fillStyle = K.alpha(C.s2, 0.1); ctx.fillRect(4, y - RH / 2 + 1, w - 8, RH - 2); }
      const nm = narrow ? TR`클라이언트${c.i + 1}@@좁은 화면(띄어쓰기 없이 짧게)` : TR`클라이언트 ${c.i + 1}`;
      K.text(ctx, nm, 10, y, { size: 12, weight: slow ? 700 : 400, color: C.ink });
      if (slow) {
        const lab = narrow ? TR`느림` : TR`느린 회선`, bx = 10 + ctx.measureText(nm).width + 5;
        ctx.font = K.font(10, 600); const tw = ctx.measureText(lab).width + 8;
        ctx.fillStyle = C.s2; K.rr(ctx, bx, y - 8, tw, 16, 4); ctx.fill();
        K.text(ctx, lab, bx + tw / 2, y + 0.5, { size: 10, weight: 600, color: '#fff', align: 'center' });
      }
      const off = c.st !== 'ok';
      const fk = c.kf / P.buf, colK = fk >= 0.95 ? C.bad : fk > 0.6 ? C.warn : C.accent;
      if (twoM) {
        meter(ctx, mx0, y - 6, kW, 12, off ? 0 : fk, colK, off || c.kf < 1 ? '' : K.n(c.kf, 0) + 'KB');
        if (P.pol === 'block') K.text(ctx, TR`없음 (스레드가 대기)`, aX, y, { size: 10.5, color: C.muted });
        else {
          const cap = P.pol === 'latest' ? P.rate / 20 : 1024;
          meter(ctx, aX, y - 6, aW, 12, c.af / cap, c.af > 0 ? C.warn : C.accent, c.af > 0 ? (c.af >= 1024 ? K.n(c.af / 1024, 1) + 'MB' : K.n(c.af, 0) + 'KB') : '');
        }
      } else {
        const extra = c.af > 0 ? '+' + (c.af >= 1024 ? K.n(c.af / 1024, 1) + 'MB' : K.n(c.af, 0) + 'KB') : '';
        meter(ctx, mx0, y - 6, kW, 12, off ? 0 : fk, colK, extra);
      }
      K.text(ctx, off ? '—' : K.ms(c.ema), w - 10 - stW - 8, y, { size: 11.5, mono: true, weight: slow ? 700 : 500, color: C.ink, align: 'right' });
      const [s, txt] = rowState(c, narrow);
      shape(ctx, w - 10 - stW + 8, y, s, s === 'good' ? C.good : s === 'warn' ? C.warn : C.bad);
      K.text(ctx, txt, w - 10 - stW + 17, y, { size: 11, weight: 600, color: s === 'good' ? C.goodInk : s === 'warn' ? C.warnInk : C.badInk });
    }
  }

  K.hover(room, (x, y) => {
    if (y >= 22 && y <= 44) {
      const blk = blockedFrac(3000);
      return TR`<b>서버 스레드</b><br>틱 ${K.n(hz(), 1)}Hz · 최근 3초 중 send() 대기 ${K.pct(blk)}<br>스레드가 하나라서 여기서 멈추면 모든 클라이언트의 틱이 멈춥니다.`;
    }
    const i = Math.floor((y - 72) / 25), c = cl[i];
    if (!c) return null;
    const q = c.af >= 1024 ? K.n(c.af / 1024, 1) + 'MB' : K.n(c.af, 0) + 'KB';
    return TR`<b>클라이언트 ${i + 1}</b> · 회선 ${isSlow(c) ? P.slowDown : NORM} KB/s<br>송신 버퍼 ${K.n(c.kf, 0)} / ${P.buf}KB` + (P.pol === 'block' ? '' : TR`<br>앱 대기열 ${q}`) + TR`<br>화면 지연 ${c.st === 'ok' ? K.ms(c.ema) : TR`접속 끊김`}`;
  });

  /* ---------- 차트 ---------- */
  const LOG0 = Math.log10(20);
  function latAxis() {
    let mx = 1000;
    lat.forEach(p => { if (p.n != null) mx = Math.max(mx, p.n); if (p.s != null) mx = Math.max(mx, p.s); });
    const y1 = Math.log10(Math.min(60000, mx * 1.3));
    const all = y1 - LOG0 > 2.6 ? [20, 100, 1000, 10000, 60000] : [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 60000];
    return { y1, ticks: all.filter(v => Math.log10(v) <= y1 + 1e-9).map(v => Math.log10(v)) };
  }
  const fmtMs = v => (v >= 1000 ? K.n(v / 1000, v % 1000 ? 1 : 0) + TR`초` : K.n(v) + 'ms');
  function chartBox(co) { return { x: 50, y: 24, w: co.w - 62, h: co.h - 54 }; }
  function drawBands(ctx, sc, box, kinds) {
    for (const b of bands) {
      if (kinds.indexOf(b.kind) < 0) continue;
      const a = Math.max(b.a, t - WIN), e = b.b != null ? b.b : t;
      if (e <= a) continue;
      ctx.fillStyle = K.alpha(K.C.bad, 0.1); ctx.fillRect(sc.x(a), box.y, sc.x(e) - sc.x(a), box.h);
      if (sc.x(e) - sc.x(a) > 34) K.text(ctx, b.kind === 'down' ? TR`서버 다운` : TR`킥`, (sc.x(a) + sc.x(e)) / 2, box.y + 9, { size: 10.5, weight: 600, color: K.C.badInk, align: 'center' });
    }
    for (const m of marks) {
      const x = Math.round(sc.x(m.t)) + 0.5;
      ctx.strokeStyle = K.C.ink2; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, box.y); ctx.lineTo(x, box.y + box.h); ctx.stroke(); ctx.setLineDash([]);
      K.text(ctx, m.lab, x + 5, box.y + 9, { size: 10.5, weight: 600, color: K.C.ink2 });
    }
  }
  const xTicks = [-20000, -15000, -10000, -5000, 0];
  function drawChart() {
    const { ctx, w, h } = chart, C = K.C, box = chartBox(chart), ax = latAxis();
    ctx.clearRect(0, 0, w, h);
    const sc = K.plot(ctx, box, {
      x0: t - WIN, x1: t, y0: LOG0, y1: ax.y1, yTicks: ax.ticks, yFmt: v => fmtMs(Math.round(Math.pow(10, v))),
      xTicks: xTicks.map(v => t + v), xFmt: v => (Math.round((v - t) / 1000) === 0 ? TR`지금` : Math.round((v - t) / 1000) + TR`초`),
      yTitle: TR`지연 (눈금이 10배씩 커짐)`,
    });
    drawBands(ctx, sc, box, ['kick', 'down']);
    const L = k => { const out = [], segs = []; lat.forEach(p => { if (p[k] == null) { if (out.length) segs.push(out.splice(0)); } else out.push([p.t, Math.log10(Math.max(20, p[k]))]); }); if (out.length) segs.push(out); return segs; };
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y - 4, box.w, box.h + 8); ctx.clip();
    L('n').forEach(s => K.line(ctx, sc, s, C.s1, 2));
    L('s').forEach(s => K.line(ctx, sc, s, C.s2, 2));
    ctx.restore();
    const last = lat[lat.length - 1];
    if (last && last.n != null) K.dot(ctx, sc.x(last.t), sc.y(Math.log10(Math.max(20, last.n))), 3.5, C.s1, C.paper);
    if (last && last.s != null) K.dot(ctx, sc.x(last.t), sc.y(Math.log10(Math.max(20, last.s))), 3.5, C.s2, C.paper);
  }
  function drawMem() {
    if (memBox.hidden) return;
    const { ctx, w, h } = memCv, C = K.C, box = { x: 50, y: 22, w: w - 62, h: h - 50 };
    ctx.clearRect(0, 0, w, h);
    const sc = K.plot(ctx, box, {
      x0: t - WIN, x1: t, y0: 0, y1: 2.5, yTicks: [0, 1, 2], yFmt: v => v + ' GB',
      xTicks: xTicks.map(v => t + v), xFmt: v => (Math.round((v - t) / 1000) === 0 ? TR`지금` : Math.round((v - t) / 1000) + TR`초`),
    });
    drawBands(ctx, sc, box, ['down']);
    K.hline(ctx, sc, MEMMAX / 1024, { color: C.bad, dash: [4, 3] });
    K.text(ctx, TR`한도 2 GB`, box.x + 4, sc.y(MEMMAX / 1024) - 8, { size: 10.5, weight: 600, color: C.badInk });
    const segs = [], cur = [];
    lat.forEach(p => { if (p.m == null) { if (cur.length) segs.push(cur.splice(0)); } else cur.push([p.t, p.m / 1024]); });
    if (cur.length) segs.push(cur);
    segs.forEach(s => { K.area(ctx, sc, s, C.s1, 0.12); K.line(ctx, sc, s, C.s1, 2); });
  }
  const nearest = (co, x) => {
    const box = chartBox(co), tt = t - WIN + ((x - box.x) / box.w) * WIN;
    if (x < box.x || x > box.x + box.w) return null;
    let best = null;
    lat.forEach(p => { if (!best || Math.abs(p.t - tt) < Math.abs(best.t - tt)) best = p; });
    return best;
  };
  K.hover(chart, x => {
    const p = nearest(chart, x);
    if (!p) return null;
    return TR`${K.n((p.t - t) / 1000, 1)}초<br>정상 클라이언트 <b>${p.n == null ? TR`접속 끊김` : K.ms(p.n)}</b><br>느린 클라이언트 <b>${p.s == null ? (P.slowN ? TR`접속 끊김` : TR`없음`) : K.ms(p.s)}</b><br>서버 틱 ${K.n(p.hz, 1)}Hz`;
  });
  K.hover(memCv, x => {
    const p = nearest(memCv, x);
    return p ? TR`${K.n((p.t - t) / 1000, 1)}초<br>메모리 <b>${p.m == null ? TR`서버 다운` : K.n(p.m / 1024, 2) + ' GB'}</b>` : null;
  });

  /* ---------- 프리셋 ---------- */
  function load(o) {
    Object.assign(P, { rate: 60, slowN: 1, slowDown: 30, buf: 64, pol: 'block' }, o);
    sRate.set(P.rate, false); sSlowN.set(P.slowN, false); sSlowD.set(P.slowDown, false);
    cBuf.set(P.buf, false); cPol.set(P.pol, false); polHint();
    memBox.hidden = P.pol !== 'unlimited';
    // 처음 7초는 모두 정상 → 느린 클라이언트 등장 → 13초 더
    reset();
    const n = P.slowN;
    P.slowN = 0; step(7000); P.slowN = n;
    if (n) marks.push({ t, lab: TR`느린 클라이언트 등장` });
    step(13000);
  }
  const pr = K.presets(F, [
    { label: TR`모두 정상`, apply() { load({ slowN: 0 }); } },
    { label: TR`느린 클라이언트 1개 + 블로킹`, apply() { load({}); } },
    { label: TR`최신만 보내기`, apply() { load({ pol: 'latest', buf: 16 }); } },
    { label: TR`킥 정책`, apply() { load({ pol: 'kick' }); } },
    { label: TR`무제한 쌓기`, apply() { load({ pol: 'unlimited', slowN: 3, slowDown: 20, rate: 120 }); } },
  ]);
  pr.press(1);

  /* ---------- 해설 ---------- */
  K.loop(root, dt => {
    step(dt);
    drawRoom(); drawChart(); drawMem();
    const slowC = cl.filter(isSlow), normC = cl.filter(c => !isSlow(c) && c.st === 'ok');
    const avg = a => (a.length ? a.reduce((s, c) => s + c.ema, 0) / a.length : null);
    const nL = avg(normC), live = slowC.filter(c => c.st === 'ok'), sL = avg(live);
    const f = hz(), blk = blockedFrac(5000), mem = sv.st === 'down' ? null : memMB();
    stN.set(nL == null ? '—' : K.ms(nL), nL == null ? 'bad' : nL < 100 ? 'good' : nL < 200 ? 'warn' : 'bad');
    if (!slowC.length) stS.set('—', null, TR`느린 클라이언트 없음`);
    else if (!live.length) stS.set(TR`끊김`, 'bad', TR`접속이 끊긴 상태`);
    else stS.set(K.ms(sL), sL < 150 ? 'good' : sL < 500 ? 'warn' : 'bad', TR`회선 ` + P.slowDown + ' KB/s');
    stHz.set(sv.st === 'down' ? '0' : K.n(f, 1), sv.st === 'down' || f < 15 ? 'bad' : f < 19 ? 'warn' : 'good');
    stBlk.set(K.n(blk * 100, 0), blk < 0.01 ? 'good' : blk < 0.2 ? 'warn' : 'bad');
    stMem.set(mem == null ? '0' : K.n(mem / 1024, 2), mem == null || mem > MEMMAX * 0.9 ? 'bad' : mem > 1600 ? 'warn' : 'good', mem == null ? TR`서버 다운 · 재시작 중` : TR`한도 2 GB`);

    const names = slowC.map(c => c.i + 1).join('·');
    const over = slowC.length > 0 && P.slowDown < P.rate;
    const kb = P.rate / 20;
    let msg;
    if (sv.st === 'down') {
      msg = TR`${K.flag('bad')}<b>서버 메모리가 한도(2 GB)를 넘어 서버 프로세스가 죽었습니다.</b> 쌓인 것은 느린 클라이언트 몇 개의 데이터였지만, 접속이 끊긴 건 모든 클라이언트입니다(<b>접속 끊김</b>). 재시작까지 ${K.n(Math.max(0, (sv.downUntil - t) / 1000), 0)}초. 로그에는 “메모리 부족”만 남아서 원인을 찾기도 어렵습니다.`;
    } else if (!over) {
      msg = slowC.length
        ? TR`${K.flag('good')}느린 클라이언트(${names}번)의 회선(${P.slowDown} KB/s)도 보낼 양(${P.rate} KB/s)보다 빨라서 송신 버퍼가 차지 않습니다. 문제는 보낼 양이 회선보다 많을 때 생깁니다. <b>보낼 양</b>을 올려 보세요.`
        : TR`${K.flag('good')}모든 클라이언트의 회선이 보낼 양(${P.rate} KB/s)보다 빠릅니다. 송신 버퍼는 틱마다 ${K.n(kb, 0)}KB쯤 찼다가 바로 비워지고, 서버 스레드는 틱마다 ${WORK}ms 일하고 나머지는 쉽니다.`;
    } else if (P.pol === 'block') {
      msg = blk > 0.01
        ? TR`${K.flag('bad')}<b>클라이언트 ${names}의 송신 버퍼(${P.buf}KB)가 가득 찼습니다.</b> 블로킹 소켓에서 send()는 버퍼에 빈 공간이 생길 때까지 반환되지 않습니다. 하나뿐인 서버 스레드가 거기서 멈춰 서니 틱이 ${K.n(f, 1)}Hz로 떨어지고, 나머지 클라이언트도 업데이트를 늦게 받습니다. 모두가 <b>뚝뚝 끊김</b>과 <b>슬로우모션</b>을 겪습니다. <b>블로킹 소켓 + 단일 스레드 = 한 명의 나쁜 회선이 서버 전체 렉.</b>`
        : TR`${K.flag('warn')}클라이언트 ${names}의 송신 버퍼가 차오르는 중입니다. 회선이 ${P.slowDown} KB/s인데 초당 ${P.rate} KB를 보내니 곧 가득 찹니다. 가득 차는 순간부터 서버 스레드가 send()에서 멈춥니다.`;
    } else if (P.pol === 'latest') {
      const c = slowC[0];
      const dr = c ? c.dropR : 0;
      msg = TR`${K.flag('warn')}<b>느린 클라이언트에게는 가장 새 업데이트 하나만 남기고 나머지는 버립니다.</b> 서버 스레드는 기다리지 않으니 틱은 ${K.n(f, 1)}Hz 그대로이고 다른 클라이언트는 멀쩡합니다. 느린 클라이언트는 업데이트를 ${K.pct(dr)} 건너뛰어 <b>뚝뚝 끊김</b>과 작은 <b>순간이동</b>을 겪습니다. 이미 송신 버퍼에 담긴 ${P.buf}KB는 순서대로 빠져야 해서 그 클라이언트의 화면은 ${sL == null ? '—' : K.ms(sL)} 늦습니다. 버퍼를 작게 잡을수록 이 지연이 줄어듭니다.`;
    } else if (P.pol === 'kick') {
      const kicked = slowC.filter(c => c.st === 'kicked'), lag = slowC.filter(c => c.st === 'ok' && c.aq.length);
      if (kicked.length) msg = TR`${K.flag('bad')}<b>5초 넘게 밀린 클라이언트 ${kicked.map(c => c.i + 1).join('·')}의 연결을 끊었습니다.</b> 그 클라이언트는 <b>접속 끊김</b>을 겪지만, 서버와 다른 클라이언트는 멀쩡합니다(틱 ${K.n(f, 1)}Hz). 회선이 그대로면 재접속해도 다시 밀리고 다시 끊깁니다. 대신 서버 메모리는 늘 일정하게 유지됩니다.`;
      else if (lag.length) {
        const c = lag[0];
        msg = TR`${K.flag('warn')}클라이언트 ${c.i + 1}에게 못 보낸 데이터가 서버 메모리에 쌓이는 중입니다(${K.n(c.af, 0)}KB). ${K.n(Math.max(0, 5 - (t - c.since) / 1000), 0)}초 안에 따라잡지 못하면 연결을 끊습니다. 그동안 그 클라이언트의 화면은 점점 늦어집니다(${K.ms(c.ema)}). 다른 클라이언트와 서버 틱은 멀쩡합니다.`;
      } else msg = TR`${K.flag('warn')}클라이언트 ${names}의 송신 버퍼가 차오르는 중입니다. 가득 찬 뒤 5초 넘게 밀리면 서버가 연결을 끊습니다.`;
    } else {
      const grow = (SCALE * slowC.filter(c => c.st === 'ok').length * Math.max(0, P.rate - P.slowDown)) / 1024;
      const eta = grow > 0 && mem != null ? (MEMMAX - mem) / grow : Infinity;
      msg = TR`${K.flag(eta < 8 ? 'bad' : 'warn')}<b>느린 클라이언트에게 못 보낸 데이터를 버리지도 끊지도 않고 서버 메모리에 계속 쌓습니다.</b> 화면의 클라이언트 8개는 샘플이고 실제로는 같은 비율로 2,000명이 접속해 있다고 치면, 메모리가 초당 ${K.n(grow, 0)}MB씩 늘어납니다. 한도까지 약 ${Number.isFinite(eta) ? K.n(eta, 0) + TR`초` : '—'}. 느린 클라이언트의 화면은 ${sL == null ? '—' : K.ms(sL)} 뒤처져 있고 계속 늘어납니다. 다른 클라이언트는 아직 멀쩡하지만, 한도를 넘는 순간 모두의 접속이 끊깁니다.`;
    }
    F.say(msg);
  });
});
