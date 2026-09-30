/* DB 커넥션 풀: 요청 하나하나가 커넥션을 기다리고, CPU 코어를 나눠 쓰고, 핫 로우 잠금 앞에서 대기 선다.
   실제 속도(1초 = 1초)로 돌고, 응답 시간은 1초 단위로 모아 중간값·99% 값을 그린다. */
K.register('dbpool', function (root) {
  const F = K.frame(root, {
    kicker: TR`레이어 12 · 데이터베이스`,
    title: TR`DB 앞에도 대기열이 생긴다: 커넥션 풀·인덱스·핫 로우 잠금`,
    lead: TR`게임 서버는 DB와 미리 열어 둔 연결(커넥션) 몇 개로만 통신합니다. 커넥션이 모두 사용 중이면 요청은 대기열에서 기다리고, 쿼리가 느리거나 핫 로우(모두가 동시에 고치려는 행)가 생기면 커넥션이 오래 묶입니다. 대기 시간이 타임아웃보다 길어지면 요청은 실패합니다.`,
    tries: [
      TR`<b>인덱스 빠진 쿼리 배포</b>를 눌러 보세요. 쿼리 하나가 2ms에서 150ms가 되자 커넥션 32개가 순식간에 차고, 5초 뒤부터 실패가 쏟아집니다.`,
      TR`<b>경매장 인기템 (핫 로우)</b>를 눌러 보세요. DB CPU는 한가한데 줄무늬 칸(행 잠금 기다림)이 커넥션을 차지해 평범한 요청까지 막힙니다.`,
      TR`같은 상태에서 <b>행 잠금 시간</b>을 2ms로 줄여 보세요. 트랜잭션을 짧게 만드는 것이 핫 로우의 가장 확실한 처방입니다.`,
      TR`<b>풀이 너무 작음 (4개)</b>에서 풀 크기를 하나씩 늘려 보세요. 어느 순간 대기열이 사라집니다. 인덱스가 빠진 상태라면 풀을 200까지 늘려도 CPU 코어가 모자라 모두가 같이 느려집니다.`,
      TR`<b>요청 타임아웃</b>을 30초로 바꿔 보세요. 실패는 줄지만 플레이어는 그 30초 동안 무한 로딩을 봅니다.`,
    ],
  });

  const P = { rate: 800, pool: 32, query: 'idx', hot: 5, lockMs: 10, timeout: 5000, cores: 16 };
  const BASE = { idx: 2, scan: 150 };
  const IDLE = 0, RUN = 1, LOCKW = 2, HOLD = 3;
  const QCAP = 1 << 18;
  const rnd = K.rng(5);
  const expo = m => -Math.log(1 - rnd()) * m;
  const tS = () => K.n(P.timeout / 1000) + TR`초`;

  const hatch = 'repeating-linear-gradient(135deg,var(--s2) 0 2px,transparent 2px 4px)';
  const cvP = K.canvas(F.stage, {
    height: w => (w < 560 ? 300 : 236),
    caption: TR`커넥션 풀과 대기열`,
    right: '<span class="legend">' +
      TR`<span><i class="box" style="background:transparent;box-shadow:inset 0 0 0 1.5px var(--muted)"></i>빈 커넥션</span>` +
      TR`<span><i class="box" style="background:var(--s1)"></i>쿼리 실행</span>` +
      TR`<span><i class="box" style="background:${hatch};box-shadow:inset 0 0 0 1.5px var(--s2)"></i>행 잠금 기다림</span>` +
      TR`<span><i class="box" style="background:var(--s3)"></i>잠금 잡은 요청</span>` +
      TR`<span><i class="dot" style="background:var(--s4)"></i>대기 중 요청</span></span>`,
  });
  const legendL = () => TR`<span class="legend"><span><i style="background:var(--s1)"></i>중간값</span><span><i style="background:var(--s2)"></i>99% 값</span>` +
    TR`<span><i class="box" style="background:var(--bad)"></i>실패</span><span><i style="background:none;height:0;border-top:2px dashed var(--muted)"></i>타임아웃 ${tS()}</span></span>`;
  const cvL = K.canvas(F.stage, { height: w => K.clamp(w * 0.42, 236, 290), caption: TR`최근 30초 응답 시간과 실패`, right: legendL() });

  // ---------- 조작부 ----------
  const g1 = K.group(F.controls, TR`요청`);
  const sRate = K.slider(g1, { label: TR`초당 요청`, min: 10, max: 5000, step: 10, value: P.rate, unit: TR`건/초`, onInput: v => { P.rate = v; }, hint: TR`아이템 저장·거래·우편·로그인 로딩이 모두 DB 요청입니다.` });
  const cTo = K.choice(g1, {
    label: TR`요청 타임아웃`, value: P.timeout, options: [[1000, TR`1초`], [5000, TR`5초`], [30000, TR`30초`]],
    onChange: v => { P.timeout = +v; cvL.setCaption(null, legendL()); },
    hint: TR`이 시간이 지나도록 응답이 없으면 게임 서버가 포기하고 실패로 처리합니다.`,
  });
  const g2 = K.group(F.controls, TR`DB 서버`);
  const sPool = K.slider(g2, { label: TR`커넥션 풀 크기`, min: 1, max: 200, value: P.pool, unit: TR`개`, onInput: v => { P.pool = v; ensurePool(); }, hint: TR`게임 서버가 DB에 미리 열어 둔 연결 수입니다.` });
  const cQ = K.choice(g2, {
    label: TR`쿼리 방식`, value: P.query, options: [['idx', TR`인덱스 있음 (2ms)`], ['scan', TR`인덱스 없음 (풀 스캔 150ms)`]],
    onChange: v => { P.query = v; }, hint: TR`인덱스 = 원하는 행을 바로 찾도록 미리 정렬해 둔 자료. 없으면 테이블 전체를 처음부터 읽습니다(풀 스캔).`,
  });
  const sCores = K.slider(g2, { label: TR`DB CPU 코어`, min: 2, max: 64, step: 2, value: P.cores, unit: TR`개`, onInput: v => { P.cores = v; }, hint: TR`동시에 도는 쿼리가 코어보다 많으면 모두가 그만큼 느려집니다.` });
  const g3 = K.group(F.controls, TR`핫 로우 (여러 요청이 고치는 행)`);
  const sHot = K.slider(g3, { label: TR`같은 행을 고치는 비율`, min: 0, max: 100, value: P.hot, unit: '%', onInput: v => { P.hot = v; }, hint: TR`길드 창고, 경매장 인기 아이템처럼 모두가 같은 행을 고치려는 경우입니다.` });
  const sLock = K.slider(g3, { label: TR`행 잠금 시간 (트랜잭션 길이)`, min: 1, max: 100, value: P.lockMs, unit: 'ms', onInput: v => { P.lockMs = v; }, hint: TR`쿼리 뒤에도 잠금을 잡은 채 다른 일을 하는 시간. 그동안 같은 행을 원하는 요청은 모두 기다립니다.` });

  K.presets(F, [
    { label: TR`평소`, apply() { set(800, 32, 'idx', 5, 10, 5000, 16); } },
    { label: TR`인덱스 빠진 쿼리 배포`, apply() { set(800, 32, 'scan', 5, 10, 5000, 16); } },
    { label: TR`경매장 인기템 (핫 로우)`, apply() { set(800, 32, 'idx', 20, 20, 5000, 16); } },
    { label: TR`점검 직후 로그인 폭주 (3,000/s)`, apply() { set(3000, 32, 'idx', 5, 10, 5000, 16); } },
    { label: TR`풀이 너무 작음 (4개)`, apply() { set(2800, 4, 'idx', 0, 10, 5000, 16); } },
  ]);
  function set(rate, pool, query, hot, lockMs, timeout, cores) {
    Object.assign(P, { rate, pool, query, hot, lockMs, timeout, cores });
    sRate.set(rate, false); sPool.set(pool, false); cQ.set(query, false); sHot.set(hot, false);
    sLock.set(lockMs, false); cTo.set(timeout, false); sCores.set(cores, false);
    cvL.setCaption(null, legendL());
    resetState();
  }

  const stAvg = K.stat(F.stats, { label: TR`평균 응답`, sub: TR`최근 2초` });
  const stP99 = K.stat(F.stats, { label: TR`99% 응답`, sub: TR`100건 중 가장 느린 1건` });
  const stQ = K.stat(F.stats, { label: TR`대기 중 요청`, unit: TR`건` });
  const stF = K.stat(F.stats, { label: TR`초당 실패`, unit: TR`건`, sub: TR`타임아웃` });
  const stU = K.stat(F.stats, { label: TR`풀 사용률`, unit: '%' });

  // ---------- 모형 (요청 하나하나) ----------
  const qT = new Float64Array(QCAP), qH = new Uint8Array(QCAP);
  let qHead = 0, qLen = 0, conns = [], active = 0, busy = 0, lockHolder = -1, lockQ = [];
  let now = 0, nextArr = 0;
  let secLat = [], secFail = 0, secDone = 0, busyInt = 0, secEnd = 1000;
  const hist = []; // 1초마다 {p50, p99, mean, fail, done, util}

  const mk = () => ({ st: IDLE, rem: 0, t0: 0, hot: 0, end: 0, late: false });
  function resetState() {
    qHead = 0; qLen = 0; conns = []; active = 0; busy = 0; lockHolder = -1; lockQ = [];
    nextArr = now;
    ensurePool();
  }
  function ensurePool() {
    while (conns.length < P.pool) conns.push(mk());
    for (let i = 0; i < P.pool && qLen; i++) if (conns[i].st === IDLE) serveNext(i);
  }
  const svc = () => BASE[P.query] * Math.exp(0.35 * K.gauss(rnd) - 0.06);
  function fail() { secFail++; secLat.push(P.timeout); }
  function run(c) { c.st = RUN; c.rem = svc(); active++; }
  function start(i, t0, hot) {
    const c = conns[i];
    c.t0 = t0; c.hot = hot; c.late = false; busy++;
    if (hot) {
      if (lockHolder < 0) { lockHolder = i; run(c); } else { c.st = LOCKW; lockQ.push(i); }
    } else run(c);
  }
  function serveNext(i) {
    while (qLen) {
      const t0 = qT[qHead], h = qH[qHead];
      qHead = (qHead + 1) & (QCAP - 1); qLen--;
      if (now - t0 > P.timeout) { fail(); continue; }
      start(i, t0, h); return;
    }
  }
  function done(i) {
    const c = conns[i];
    if (!c.late) { secLat.push(now - c.t0); secDone++; }
    c.st = IDLE; busy--;
    if (i < P.pool) serveNext(i);
  }
  function releaseLock() {
    lockHolder = -1;
    while (lockQ.length) {
      const j = lockQ.shift();
      if (conns[j].st === LOCKW) { lockHolder = j; run(conns[j]); break; }
    }
  }
  function arrive() {
    const hot = rnd() * 100 < P.hot ? 1 : 0;
    if (!qLen) { // 줄이 없으면 빈 커넥션이 있을 수 있다
      for (let i = 0; i < P.pool; i++) if (conns[i].st === IDLE) { start(i, now, hot); return; }
    }
    if (qLen < QCAP) { const k = (qHead + qLen) & (QCAP - 1); qT[k] = now; qH[k] = hot; qLen++; } else fail();
  }
  function advance(to) {
    for (let g = 0; g < 20000; g++) {
      const r = active > P.cores ? P.cores / active : 1; // 코어보다 많이 돌면 모두가 나눠 쓴다
      let tn = to, kind = 0, idx = -1;
      if (nextArr < tn) { tn = nextArr; kind = 1; }
      for (let i = 0; i < conns.length; i++) {
        const c = conns[i];
        if (c.st === RUN) { const te = now + Math.max(0, c.rem) / r; if (te < tn) { tn = te; kind = 2; idx = i; } }
        else if (c.st === HOLD && c.end < tn) { tn = c.end; kind = 3; idx = i; }
      }
      const d = Math.max(0, tn - now);
      if (d > 0) for (let i = 0; i < conns.length; i++) if (conns[i].st === RUN) conns[i].rem -= d * r;
      busyInt += d * Math.min(busy, P.pool);
      now = Math.max(now, tn);
      if (!kind) break;
      if (kind === 1) { arrive(); nextArr = now + expo(1000 / P.rate); }
      else if (kind === 2) {
        const c = conns[idx]; active--;
        if (c.hot) { c.st = HOLD; c.end = now + P.lockMs * (0.7 + 0.6 * rnd()); } else done(idx);
      } else { releaseLock(); done(idx); }
    }
  }
  function sweep() {
    while (qLen && now - qT[qHead] > P.timeout) { qHead = (qHead + 1) & (QCAP - 1); qLen--; fail(); }
    for (let i = 0; i < conns.length; i++) {
      const c = conns[i];
      if (c.st === IDLE || c.late || now - c.t0 <= P.timeout) continue;
      c.late = true; fail();
      if (c.st === LOCKW) { // 잠금을 기다리던 쿼리는 취소되고 커넥션이 돌아온다
        const k = lockQ.indexOf(i); if (k >= 0) lockQ.splice(k, 1);
        c.st = IDLE; busy--;
        if (i < P.pool) serveNext(i);
      } // 이미 실행 중이면 게임 서버는 포기했어도 DB는 끝까지 일한다
    }
  }
  function closeSecond() {
    const a = Float64Array.from(secLat).sort();
    const n = a.length;
    const q = f => (n ? a[Math.min(n - 1, Math.floor(f * n))] : null);
    let sum = 0; for (let i = 0; i < n; i++) sum += a[i];
    hist.push({ p50: q(0.5), p99: q(0.99), mean: n ? sum / n : null, n, fail: secFail, done: secDone, util: busyInt / (1000 * P.pool) });
    if (hist.length > 30) hist.shift();
    secLat = []; secFail = 0; secDone = 0; busyInt = 0; secEnd += 1000;
  }
  function step(dt) {
    const end = now + dt;
    while (now < end - 1e-9) {
      advance(Math.min(end, now + 10));
      sweep();
      if (now >= secEnd) closeSecond();
    }
  }
  resetState();
  step(30000); // 미리 30초를 돌려 차트를 채운다

  // ---------- 그리기 ----------
  function drawPool() {
    const { ctx, w, h } = cvP;
    const C = K.C, narrow = w < 560;
    ctx.clearRect(0, 0, w, h);
    let qa, ga;
    if (narrow) { qa = { x: 12, y: 30, w: w - 24, h: 60 }; ga = { x: 12, y: 142, w: w - 24, h: h - 142 - 46 }; }
    else { const qw = Math.round(w * 0.4); qa = { x: 12, y: 34, w: qw - 12, h: h - 34 - 42 }; ga = { x: qw + 34, y: 34, w: w - qw - 46, h: h - 34 - 42 }; }
    const lw = lockQ.length;
    // 줄
    K.text(ctx, TR`커넥션 대기열 ${K.n(qLen)}건`, qa.x, qa.y - 16, { size: 11.5, weight: 600, color: C.ink });
    const sp = 9, cols = Math.max(1, Math.floor(qa.w / sp)), rows = Math.max(1, Math.floor(qa.h / sp));
    const maxVis = cols * rows, shown = Math.min(qLen, maxVis);
    for (let i = 0; i < shown; i++) {
      const k = (qHead + i) & (QCAP - 1);
      const x = qa.x + qa.w - 4 - Math.floor(i / rows) * sp, y = qa.y + 4 + (i % rows) * sp;
      ctx.fillStyle = now - qT[k] > P.timeout / 2 ? C.bad : C.s4;
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    }
    if (!qLen) K.text(ctx, TR`대기 없음: 오자마자 커넥션을 받습니다`, qa.x + qa.w / 2, qa.y + qa.h / 2, { align: 'center', size: 11, color: C.muted });
    else {
      const old = qLen ? now - qT[qHead] : 0;
      K.text(ctx, TR`맨 앞 요청 ${K.ms(old)}째 대기` + (qLen > maxVis ? TR` · 화면 밖 ${K.n(qLen - maxVis)}건` : ''), qa.x, qa.y + qa.h + 14, { size: 11, color: old > P.timeout / 2 ? C.badInk : C.muted, weight: old > P.timeout / 2 ? 600 : 400 });
    }
    if (!narrow) K.text(ctx, '→', ga.x - 17, qa.y + qa.h / 2, { align: 'center', size: 16, color: C.muted });
    // 창구
    const N = P.pool;
    let s = 22, gap = 4, gc = 1;
    for (; s >= 5; s--) {
      gap = s > 12 ? 4 : 2;
      gc = Math.max(1, Math.floor((ga.w + gap) / (s + gap)));
      if (Math.ceil(N / gc) * (s + gap) - gap <= ga.h) break;
    }
    K.text(ctx, TR`커넥션 풀 ${N}개 · 사용 중 ${Math.min(busy, N)}개`, ga.x, ga.y - 16, { size: 11.5, weight: 600, color: C.ink });
    for (let i = 0; i < N; i++) {
      const c = conns[i];
      const x = ga.x + (i % gc) * (s + gap), y = ga.y + Math.floor(i / gc) * (s + gap);
      if (c.st === IDLE) {
        ctx.strokeStyle = K.alpha(C.muted, 0.8); ctx.lineWidth = 1.5;
        K.rr(ctx, x + 0.75, y + 0.75, s - 1.5, s - 1.5, 3); ctx.stroke();
      } else if (c.st === LOCKW) {
        ctx.save();
        K.rr(ctx, x, y, s, s, 3); ctx.clip();
        ctx.strokeStyle = C.s2; ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let d = -s; d < s; d += 4) { ctx.moveTo(x + d, y + s); ctx.lineTo(x + d + s, y); }
        ctx.stroke();
        ctx.lineWidth = 3; K.rr(ctx, x, y, s, s, 3); ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = c.hot ? C.s3 : C.s1;
        K.rr(ctx, x, y, s, s, 3); ctx.fill();
      }
    }
    // 아래 안내: CPU와 잠금
    const slow = active > P.cores ? active / P.cores : 1;
    const cpuTxt = narrow
      ? TR`DB CPU: 쿼리 ${active}개 / 코어 ${P.cores}개` + (slow > 1.05 ? TR` → ${K.n(slow, 1)}배 느림` : '')
      : TR`DB CPU: 실행 중 쿼리 ${active}개 / 코어 ${P.cores}개` + (slow > 1.05 ? TR` → 쿼리마다 ${K.n(slow, 1)}배 느려짐` : '');
    const lockTxt = TR`핫 로우 잠금 기다림 ${lw}개`;
    const by = h - (narrow ? 30 : 14);
    K.text(ctx, cpuTxt, 12, by, { size: 11, color: slow > 1.05 ? C.badInk : C.muted, weight: slow > 1.05 ? 600 : 400 });
    if (narrow) K.text(ctx, lockTxt, 12, h - 12, { size: 11, color: lw > N / 4 ? C.badInk : C.muted, weight: lw > N / 4 ? 600 : 400 });
    else K.text(ctx, lockTxt, w - 12, by, { size: 11, color: lw > N / 4 ? C.badInk : C.muted, align: 'right', weight: lw > N / 4 ? 600 : 400 });
  }

  const lg = v => Math.log10(K.clamp(v, 1, 40000));
  const LAT = ['1', '10', '100', TR`1초`, TR`10초`];
  let boxL = null;
  function drawLat() {
    const { ctx, w, h } = cvL;
    const C = K.C, narrow = w < 520;
    ctx.clearRect(0, 0, w, h);
    const L0 = narrow ? 40 : 50;
    const top = { x: L0, y: 24, w: w - L0 - 14, h: Math.round((h - 104) * 0.72) };
    const bot = { x: L0, y: top.y + top.h + 36, w: top.w, h: 0 };
    bot.h = h - bot.y - 24;
    boxL = top;
    const sc = K.plot(ctx, top, { x0: -30, x1: 0, y0: 0, y1: 4.6, yTicks: [0, 1, 2, 3, 4], yFmt: v => LAT[v], yTitle: TR`응답 시간 (ms, 눈금마다 10배)` });
    K.hline(ctx, sc, lg(P.timeout), { color: C.muted, dash: [4, 4] });
    const off = 30 - hist.length;
    const pts = key => {
      const out = []; let cur = [];
      hist.forEach((p, i) => { if (p[key] == null) { if (cur.length) out.push(cur); cur = []; } else cur.push([i + off - 29.5, lg(p[key])]); });
      if (cur.length) out.push(cur);
      return out;
    };
    for (const s of pts('p99')) { K.line(ctx, sc, s, C.s2); if (s.length === 1) K.dot(ctx, sc.x(s[0][0]), sc.y(s[0][1]), 3, C.s2, C.paper); }
    for (const s of pts('p50')) { K.line(ctx, sc, s, C.s1); if (s.length === 1) K.dot(ctx, sc.x(s[0][0]), sc.y(s[0][1]), 3, C.s1, C.paper); }
    // 실패 막대
    let fmax = 5; for (const p of hist) fmax = Math.max(fmax, p.fail);
    const st = fmax <= 5 ? 5 : fmax <= 10 ? 10 : Math.pow(10, Math.floor(Math.log10(fmax))) * (fmax / Math.pow(10, Math.floor(Math.log10(fmax))) <= 2 ? 2 : fmax / Math.pow(10, Math.floor(Math.log10(fmax))) <= 5 ? 5 : 10);
    const sc2 = K.plot(ctx, bot, {
      x0: -30, x1: 0, y0: 0, y1: st, yTicks: [0, st], yFmt: v => K.n(v),
      xTicks: narrow ? [-30, -15, 0] : [-30, -20, -10, 0], xFmt: v => (v === 0 ? TR`지금` : -v + TR`초 전`), yTitle: TR`초당 실패 (건)`,
    });
    const bw = Math.max(2, bot.w / 30 - 3);
    ctx.fillStyle = C.bad;
    hist.forEach((p, i) => {
      if (!p.fail) return;
      const x = sc2.x(i + off - 29.5) - bw / 2, y = sc2.y(Math.min(p.fail, st)), y0 = sc2.y(0);
      const r = Math.min(4, bw / 2, y0 - y);
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.lineTo(x + bw - r, y); ctx.arcTo(x + bw, y, x + bw, y + r, r); ctx.lineTo(x + bw, y0); ctx.closePath(); ctx.fill();
    });
    if (!hist.some(p => p.fail)) K.text(ctx, TR`실패 없음`, bot.x + bot.w / 2, bot.y + bot.h / 2, { align: 'center', size: 11, color: C.muted });
  }
  K.hover(cvL, x => {
    if (!boxL || x < boxL.x - 4 || x > boxL.x + boxL.w + 4 || !hist.length) return null;
    const i = K.clamp(Math.floor(((x - boxL.x) / boxL.w) * 30) - (30 - hist.length), 0, hist.length - 1);
    const p = hist[i], ago = hist.length - i;
    return TR`${ago === 1 ? TR`방금` : ago + TR`초 전`} 1초 동안<br>중간값 <b>${p.p50 == null ? TR`없음` : K.ms(p.p50)}</b> · 99% <b>${p.p99 == null ? TR`없음` : K.ms(p.p99)}</b><br>성공 ${K.n(p.done)}건 · 실패 <b>${K.n(p.fail)}</b>건 · 풀 사용 ${K.pct(Math.min(1, p.util))}`;
  });

  // ---------- 해설 ----------
  function explain(last, lw) {
    const base = BASE[P.query];
    const hotRate = (P.rate * P.hot) / 100;
    const lockCap = 1000 / (base + P.lockMs);        // 핫 로우가 1초에 처리할 수 있는 최대 건수
    const lockUtil = hotRate / lockCap;
    const cpuUtil = (P.rate * base) / 1000 / P.cores;
    const failing = last.fail > 0, q = qLen + lw;
    const tail = TR`타임아웃 ${tS()}가 지나면 실패로 끝납니다. 플레이어는 아이템이 늦게 들어오고, 거래·우편이 실패하고, 로그인이 <b>무한 로딩</b>에 빠집니다. 게임 서버가 DB 응답을 동기로 기다리는 구조라면 필드 전체에 <b>멈춤</b>이 옵니다.`;
    if (failing || (last.p99 != null && last.p99 > P.timeout * 0.4) || q > P.pool * 2) {
      let why;
      if (cpuUtil >= 0.9) {
        why = TR`<b>DB CPU가 모자랍니다.</b> 쿼리 한 건이 CPU를 ${base}ms씩 쓰는데 1초에 ${K.n(P.rate)}건이면 코어 ${P.cores}개가 감당할 양의 <b>${K.n(cpuUtil, 1)}배</b>입니다.` +
          (P.query === 'scan' ? TR` 인덱스가 없어 테이블 전체를 처음부터 읽고 있습니다(풀 스캔).` : '') +
          TR` 동시에 도는 쿼리가 코어보다 많아 모두가 같이 느려지고, 느려진 쿼리가 커넥션을 오래 점유해 대기열이 끝없이 늘어납니다.`;
      } else if (lockUtil >= 0.9 && P.hot > 0) {
        why = TR`<b>핫 로우 하나에 요청이 몰렸습니다.</b> 같은 행을 고치는 요청이 1초에 ${K.n(hotRate)}건인데, 잠금은 한 번에 하나만 쥘 수 있어 1초에 약 ${K.n(lockCap)}건만 지나갑니다.` +
          (lw ? TR` 잠금을 기다리는 요청도 커넥션을 점유하고 있어서, 커넥션 ${P.pool}개 중 <b>${lw}개</b>가 잠금 대기에 묶였고 평범한 요청까지 기다립니다.` : '') + TR` DB CPU는 한가합니다.` +
          (P.rate >= 2000 ? TR` 요청이 몰리면 평소 여유 있던 핫 로우 잠금이 가장 먼저 무너집니다. 로그인할 때마다 고치는 공용 행(동시 접속자 수, 출석 기록 등)이 흔한 예입니다.` : '');
      } else {
        why = TR`<b>커넥션 풀이 모자랍니다.</b> 커넥션 ${P.pool}개가 모두 사용 중이라 요청이 대기열에서 기다립니다. DB CPU는 ${K.pct(Math.min(cpuUtil, 1))}만 쓰고 있어 아직 여유가 있습니다.` + (lw ? TR` 그중 ${lw}개는 핫 로우 잠금을 기다리느라 아무 일도 못 합니다.` : '');
      }
      return K.flag('bad') + why + ' ' + tail;
    }
    if ((last.p99 != null && last.p99 > 100) || last.util > 0.75 || lockUtil > 0.6) {
      const hints = [];
      if (lockUtil > 0.6 && P.hot > 0) hints.push(TR`핫 로우 잠금이 ${K.pct(Math.min(lockUtil, 1))} 바쁩니다. 같은 행을 원하는 요청이 조금만 늘어도 대기열이 급격히 길어집니다`);
      if (last.util > 0.75) hints.push(TR`커넥션 ${P.pool}개 중 평균 ${K.pct(Math.min(last.util, 1))}가 바쁩니다`);
      if (cpuUtil > 0.75) hints.push(TR`DB CPU가 ${K.pct(Math.min(cpuUtil, 1))} 바쁩니다`);
      return K.flag('warn') + TR`평균은 ${last.mean == null ? '—' : K.ms(last.mean)}로 괜찮아 보여도 <b>100건 중 1건은 ${last.p99 == null ? '—' : K.ms(last.p99)} 넘게</b> 걸립니다. ` + (hints.length ? hints.join('. ') + '. ' : '') + TR`이벤트나 점검 직후처럼 요청이 몰리면 바로 대기열이 길어집니다.`;
    }
    return K.flag('good') + TR`커넥션 ${P.pool}개 중 평균 ${K.n(last.util * P.pool, 1)}개만 바쁩니다. 쿼리가 ${P.query === 'idx' ? TR`인덱스를 타서` : TR`풀 스캔인데도 요청이 적어`} 금방 끝나고, 핫 로우 잠금에도 여유가 있습니다. 요청 대부분이 <b>${last.p50 == null ? '—' : K.ms(last.p50)}</b> 안에 돌아옵니다.`;
  }

  K.loop(root, dt => {
    step(dt);
    drawPool();
    drawLat();
    const last = hist[hist.length - 1] || { p50: null, p99: null, mean: null, fail: 0, util: 0, n: 0 };
    const prev = hist[hist.length - 2] || last;
    const nn = last.n + prev.n;
    const mean = nn ? ((last.mean || 0) * last.n + (prev.mean || 0) * prev.n) / nn : null;
    const lw = lockQ.length;
    stAvg.set(mean == null ? '—' : K.ms(mean), mean == null ? null : mean > 500 ? 'bad' : mean > 30 ? 'warn' : 'good');
    stP99.set(last.p99 == null ? '—' : K.ms(last.p99), last.p99 == null ? null : last.p99 > 1000 ? 'bad' : last.p99 > 100 ? 'warn' : 'good');
    stQ.set(K.n(qLen + lw), qLen + lw > P.pool ? 'bad' : qLen + lw > 5 ? 'warn' : 'good', lw ? TR`잠금 기다림 ${lw}건 포함` : TR`커넥션 기다림`);
    stF.set(K.n(last.fail), last.fail > P.rate * 0.01 ? 'bad' : last.fail > 0 ? 'warn' : 'good', TR`${tS()} 넘게 기다림`);
    stU.set(K.n(Math.min(1, last.util) * 100), last.util > 0.9 ? 'bad' : last.util > 0.7 ? 'warn' : 'good', TR`${P.pool}개 중 평균 ${K.n(Math.min(1, last.util) * P.pool, 1)}개`);
    F.say(explain(last, lw));
  });
});
