/* 동기화 방식 비교: 같은 회선에서 같은 버튼을 눌렀을 때 방식마다 언제 반응하고 언제 확정되는가 */
K.register('syncmodels', function (root) {
  const F = K.frame(root, {
    kicker: '동기화 방식 · 비교',
    title: '버튼 한 번, 다섯 가지 반응',
    lead: '같은 회선에서 같은 버튼을 눌렀을 때 방식마다 내 화면이 언제 반응하고, 서버나 상대는 언제 알게 되는지 나란히 봅니다. 핑을 올려 보세요. 어떤 방식은 반응이 핑만큼 늦어지고, 어떤 방식은 핑과 상관없이 바로 반응하는 대신 다른 대가를 치릅니다.',
    layout: 'stack',
    tries: [
      '<b>핑</b>을 30 → 150 → 300ms로 올리며 각 줄의 ▼(누름)와 ●(내 화면 반응) 사이 거리를 비교하세요. 요청-응답만 거리가 늘어납니다.',
      '<b>다음 행동은 서버가 거절</b>을 누르세요. 요청-응답은 늦게 “불가” 안내만, 예측은 먼저 보여 줬다가 취소(고무줄), 클라이언트 권위는 검증 없이 통과합니다.',
      '<b>지터</b>를 80ms로 올리고 <b>락스텝 입력 지연</b>을 80ms로 낮추세요. 락스텝 줄에 “모두 멈춤” 칸이 자주 생깁니다. 입력 지연을 200ms로 늘리면 멈춤은 사라지고 반응이 늦어집니다.',
      '<b>핑</b>을 300ms로 올리고 롤백 줄의 ↺(되감기) 표시를 보세요. 핑이 클수록 한 번에 되감는 프레임 수가 커져 상대가 순간이동처럼 보입니다.',
    ],
  });
  K.addStyle('syncmodels', `
    .sm-rows { display: grid; gap: 10px; }
    .sm-row { display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 14px; align-items: center; }
    .sm-row .nm { font-weight: 700; font-size: 14.5px; line-height: 1.35; }
    .sm-row .nm small { display: block; font-weight: 400; color: var(--muted); font-size: 12px; }
    .sm-row .st { font-size: 12.5px; color: var(--ink-2); margin-top: 4px; font-variant-numeric: tabular-nums; line-height: 1.5; }
    .sm-row .st b { font-family: var(--font-mono); color: var(--ink); font-weight: 600; }
    @media (max-width: 640px) { .sm-row { grid-template-columns: minmax(0, 1fr); gap: 6px; } }
  `);

  const P = { rtt: 150, jitter: 20, loss: 0, tick: 20, lockDelay: 120, auto: true, remote: true };
  const rnd = K.rng(41);
  const MODELS = [
    { id: 'rr', name: '요청-응답', sub: '서버 확인 후 표시' },
    { id: 'pred', name: '예측 + 서버 보정', sub: '먼저 보여 주고 나중에 확인' },
    { id: 'client', name: '클라이언트 권위', sub: '내가 결정, 서버는 전달' },
    { id: 'lock', name: '락스텝', sub: '입력 지연 고정, 모두 같은 턴에 계산' },
    { id: 'roll', name: '롤백', sub: '예측해 진행, 틀리면 되감기 (입력 지연 0 가정)' },
  ];
  const SPAN = 3500, FRAME = 16.7, INTERP = 100;

  /* ---------------- 화면 ---------------- */
  const legend = '<span class="legend"><span>▼ 누름</span><span><i class="dot" style="background:var(--s1)"></i>내 화면 반응</span><span>◆ 서버 확정·상대 화면</span><span>↺ 보정·되감기</span><span><i class="box" style="background:var(--warn);opacity:.4"></i>모두 멈춤</span></span>';
  F.stage.append(K.el('div', { class: 'cv-cap' }, K.el('b', { text: '최근 3.5초 (오른쪽 끝이 지금)' }), K.el('span', { html: legend })));
  const rowsBox = K.el('div', { class: 'sm-rows' });
  F.stage.append(rowsBox);
  MODELS.forEach(m => {
    const st = K.el('div', { class: 'st', html: '—' });
    const lab = K.el('div', null, K.el('div', { class: 'nm', html: `${m.name}<small>${m.sub}</small>` }), st);
    const cvBox = K.el('div');
    rowsBox.append(K.el('div', { class: 'sm-row' }, lab, cvBox));
    m.cv = K.canvas(cvBox, { height: 62, label: m.name + ' 타임라인' });
    m.stEl = st;
    m.ev = [];      // {p, react, confirm, kind}
    m.marks = [];   // [t, 'roll'|'fix'|'warn', label]
  });
  const cvC = K.canvas(F.stage, { height: w => K.clamp(w * 0.3, 190, 240), caption: '핑에 따른 반응 시간', right: '<span class="legend"><span><i style="background:var(--s1)"></i>요청-응답</span><span><i style="background:var(--s2)"></i>예측·클라 권위·롤백</span><span><i style="background:var(--s3)"></i>락스텝</span></span>' });

  const g1 = K.group(F.controls, '회선');
  K.slider(g1, { label: '핑(왕복)', min: 0, max: 400, step: 10, value: P.rtt, unit: 'ms', onInput: v => { P.rtt = v; } });
  K.slider(g1, { label: '지터', min: 0, max: 150, step: 5, value: P.jitter, unit: 'ms', onInput: v => { P.jitter = v; } });
  K.slider(g1, { label: '패킷 손실', min: 0, max: 20, step: 1, value: P.loss, unit: '%', onInput: v => { P.loss = v; } });
  const g2 = K.group(F.controls, '서버·방식');
  K.choice(g2, { label: '서버 틱 (락스텝 턴)', value: P.tick, options: [[10, '10/초'], [20, '20/초'], [30, '30/초'], [60, '60/초']], onChange: v => { P.tick = +v; } });
  K.slider(g2, { label: '락스텝 입력 지연', min: 30, max: 400, step: 10, value: P.lockDelay, unit: 'ms', onInput: v => { P.lockDelay = v; }, hint: '입력을 이만큼 뒤의 턴에 실행하도록 예약합니다. 입력이 상대에게 닿는 시간(서로 직접 주고받는 이 모델에서는 핑의 절반) + 지터보다 짧으면 멈춥니다.' });
  const g3 = K.group(F.controls, '누르기');
  K.button(g3, { label: '지금 누르기', kind: 'primary', onClick: () => press() });
  const rejBtn = K.button(g3, { label: '다음 행동은 서버가 거절', kind: 'small', onClick: () => { rejectNext = !rejectNext; rejBtn.setAttribute('aria-pressed', rejectNext ? 'true' : 'false'); } });
  rejBtn.setAttribute('aria-pressed', 'false');
  K.toggle(g3, { label: '자동으로 계속 누르기', value: P.auto, onChange: v => { P.auto = v; } });
  K.toggle(g3, { label: '상대도 행동하기 (롤백용)', value: P.remote, onChange: v => { P.remote = v; } });

  /* ---------------- 모델 ---------------- */
  let t = 0, nextPress = 600, nextRemote = 900, rejectNext = false;
  const oneWay = penalty => {
    let d = P.rtt / 2 + rnd() * P.jitter;
    let guard = 0;
    while (rnd() * 100 < P.loss && guard++ < 5) d += penalty; // 잃으면 재전송(또는 다음 묶음)에 실려 감
    return d;
  };
  const tickT = () => 1000 / P.tick;
  const nextTick = x => Math.ceil(x / tickT()) * tickT();
  const byId = Object.fromEntries(MODELS.map(m => [m.id, m]));

  // 락스텝: 턴 j 는 상대 입력이 도착해야 실행된다. 입력은 (j - 지연턴) 턴이 실행될 때 보내진다.
  const LS = { base: 0, e: [0], arr: new Map(), pend: [], stalls: [] };
  function lsGet(j) { return LS.e[j - LS.base]; }
  function lsAdvance() {
    const turn = tickT(), dT = Math.max(1, Math.ceil(P.lockDelay / turn));
    for (let g = 0; g < 500; g++) {
      const j = LS.base + LS.e.length;
      const prev = LS.e[LS.e.length - 1];
      let a = LS.arr.get(j);
      if (a == null) {
        const sj = j - dT;
        const sendT = sj >= LS.base ? lsGet(sj) : prev - (dT - 1) * turn;
        a = sendT + oneWay(turn);
        LS.arr.set(j, a);
      }
      const ej = Math.max(prev + turn, a);
      if (ej > t) break;
      LS.e.push(ej);
      LS.arr.delete(j);
      if (ej - prev > turn * 1.3) LS.stalls.push([prev + turn * 0.3, ej]);
      LS.pend = LS.pend.filter(pp => {
        if (pp.target === j) { pp.ev.react = ej; return false; }
        return true;
      });
    }
    while (LS.e.length > 400) { LS.e.shift(); LS.base++; }
    while (LS.stalls.length && LS.stalls[0][1] < t - SPAN - 1000) LS.stalls.shift();
  }

  function press() {
    const p = t, rej = rejectNext;
    rejectNext = false; rejBtn.setAttribute('aria-pressed', 'false');
    // 같은 순간 같은 회선 조건을 방식마다 따로 뽑되, 요청-응답과 예측은 같은 왕복을 공유
    const upR = oneWay(P.rtt + 200), downR = oneWay(P.rtt + 200); // TCP 재전송 대기(리눅스: 핑 + 200ms)
    const procR = nextTick(p + upR);
    const rrConfirm = procR + downR + FRAME;
    byId.rr.ev.push({ p, react: rrConfirm, confirm: rrConfirm, rej });
    const upP = oneWay(50), downP = oneWay(50);
    const predConfirm = nextTick(p + upP) + downP + FRAME;
    byId.pred.ev.push({ p, react: p + FRAME, confirm: predConfirm, rej });
    if (rej) byId.pred.marks.push([predConfirm, 'fix', '취소']);
    const other = p + oneWay(P.rtt + 200) + oneWay(P.rtt + 200) + INTERP;
    byId.client.ev.push({ p, react: p + FRAME, confirm: other, rej });
    if (rej) byId.client.marks.push([other, 'warn', '검증 없이 통과']);
    const lev = { p, react: null, confirm: null, rej };
    const dT = Math.max(1, Math.ceil(P.lockDelay / tickT()));
    const cur = LS.base + LS.e.length - 1;
    LS.pend.push({ target: cur + dT, ev: lev });
    byId.lock.ev.push(lev);
    byId.roll.ev.push({ p, react: p + FRAME, confirm: p + oneWay(FRAME) + FRAME, rej });
    MODELS.forEach(m => { while (m.ev.length > 30) m.ev.shift(); });
  }
  function remotePress() {
    // 상대 입력이 내 PC에 도착할 때, 예측이 틀렸으면 그만큼 되감는다 (약 30%는 “같은 입력 유지”로 예측 적중)
    const lat = oneWay(FRAME);
    if (rnd() < 0.7) {
      const frames = Math.max(1, Math.round(lat / FRAME));
      byId.roll.marks.push([t + lat, 'roll', `${frames}프레임`]);
    }
  }

  function step(dt) {
    const end = t + dt;
    while (t < end) {
      const nx = Math.min(end, P.auto ? nextPress : end, P.remote ? nextRemote : end);
      t = nx;
      if (P.auto && t >= nextPress) { press(); nextPress = t + 1100 + rnd() * 700; }
      if (P.remote && t >= nextRemote) { remotePress(); nextRemote = t + 700 + rnd() * 1300; }
      if (!P.auto) nextPress = Math.max(nextPress, t + 300);
      if (!P.remote) nextRemote = Math.max(nextRemote, t + 300);
      if (nx === end) break;
    }
    t = end;
    lsAdvance();
    MODELS.forEach(m => { m.marks = m.marks.filter(x => x[0] > t - SPAN - 500); });
  }

  /* ---------------- 그리기 ---------------- */
  function drawRow(m) {
    const { ctx, w, h } = m.cv;
    const C = K.C;
    ctx.clearRect(0, 0, w, h);
    const L = 6, R = w - 6, t0 = t - SPAN;
    const X = x => L + ((x - t0) / SPAN) * (R - L);
    const yTop = 12, yBase = h - 18;
    // 1초 눈금
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (let s = Math.ceil(t0 / 1000) * 1000; s <= t; s += 1000) { const x = Math.round(X(s)) + 0.5; ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, h - 4); ctx.stroke(); }
    if (m.id === 'lock') {
      ctx.fillStyle = K.alpha(C.warn, 0.28);
      for (const [a, b] of LS.stalls) { if (b < t0) continue; const xa = Math.max(L, X(a)), xb = Math.min(R, X(Math.min(b, t))); if (xb > xa) ctx.fillRect(xa, 2, xb - xa, h - 4); }
    }
    ctx.strokeStyle = C.line;
    ctx.beginPath(); ctx.moveTo(L, yBase + 0.5); ctx.lineTo(R, yBase + 0.5); ctx.stroke();
    let latestLabel = null;
    for (const e of m.ev) {
      if (e.p < t0 - 1500) continue;
      const xp = X(e.p);
      // 누름에서 반응까지
      const reacted = e.react != null && e.react <= t;
      const rEnd = e.react == null ? t : Math.min(e.react, t);
      ctx.strokeStyle = K.alpha(C.ink2, 0.7); ctx.lineWidth = 1.5;
      if (!reacted) ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(xp, yTop + 6); ctx.lineTo(X(rEnd), yBase); ctx.stroke();
      ctx.setLineDash([]);
      if (xp >= L) {
        ctx.fillStyle = C.ink;
        ctx.beginPath(); ctx.moveTo(xp - 5, yTop - 4); ctx.lineTo(xp + 5, yTop - 4); ctx.lineTo(xp, yTop + 4); ctx.closePath(); ctx.fill();
      }
      if (reacted) {
        const xr = X(e.react);
        if (m.id === 'rr' && e.rej) {
          ctx.strokeStyle = C.bad; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.moveTo(xr - 5, yBase - 5); ctx.lineTo(xr + 5, yBase + 5); ctx.moveTo(xr + 5, yBase - 5); ctx.lineTo(xr - 5, yBase + 5); ctx.stroke();
        } else K.dot(ctx, xr, yBase, 5, C.s1, C.paper);
        latestLabel = { x: xr, ms: e.react - e.p, rej: e.rej };
      }
      if (e.confirm != null && e.confirm <= t && e.confirm !== e.react) {
        const xc = X(e.confirm);
        ctx.strokeStyle = K.alpha(C.ink2, 0.45); ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X(e.react), yBase); ctx.lineTo(xc, yBase); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = C.ink2;
        ctx.beginPath(); ctx.moveTo(xc, yBase - 6); ctx.lineTo(xc + 5, yBase); ctx.lineTo(xc, yBase + 6); ctx.lineTo(xc - 5, yBase); ctx.closePath(); ctx.fill();
      }
    }
    for (const [mt, kind, lab] of m.marks) {
      if (mt > t || mt < t0) continue;
      const x = X(mt);
      const col = kind === 'warn' ? C.warnInk : C.badInk;
      K.text(ctx, kind === 'warn' ? '⚠' : '↺', x, yTop + 2, { align: 'center', size: 14, weight: 700, color: kind === 'warn' ? C.warn : C.bad });
      if (w > 420) K.text(ctx, lab, x + 9, yTop + 2, { size: 10.5, weight: 600, color: col });
    }
    if (latestLabel && latestLabel.x > L + 30) {
      const txt = latestLabel.rej && m.id === 'rr' ? `거절 안내 ${Math.round(latestLabel.ms)}ms` : `반응 ${Math.round(latestLabel.ms)}ms`;
      K.text(ctx, txt, Math.min(latestLabel.x + 8, R - 2), yBase - 12, { size: 11, weight: 600, color: C.ink, align: latestLabel.x + 8 > R - 90 ? 'right' : 'left' });
    }
  }

  const chartBox = () => ({ x: 46, y: 22, w: cvC.w - 60, h: cvC.h - 58 });
  // 모델 안에서는 입력 지연이 턴 단위로 올림된다. 누른 시점이 턴 사이 어디냐에 따라 평균 반 턴이 빠진다.
  const lockTurns = () => Math.max(1, Math.ceil(P.lockDelay / tickT()));
  function lockReact(rtt) { return (lockTurns() - 0.5) * tickT() + FRAME; }
  function rrReact(rtt) { return rtt + tickT() / 2 + FRAME; }
  function drawChart() {
    const { ctx, w, h } = cvC;
    const C = K.C;
    ctx.clearRect(0, 0, w, h);
    const box = chartBox();
    const yMax = 600;
    const sc = K.plot(ctx, box, { x0: 0, x1: 400, y0: 0, y1: yMax, yTicks: [0, 100, 200, 300, 400, 500, 600], yFmt: v => v + '', xTicks: [0, 100, 200, 300, 400], xFmt: v => v + 'ms', yTitle: '누르고 반응까지 (ms)', xTitle: '핑' });
    // 체감 기준선
    ctx.fillStyle = K.alpha(C.bad, 0.06);
    ctx.fillRect(box.x, sc.y(yMax), box.w, sc.y(100) - sc.y(yMax));
    K.text(ctx, '빨간 영역: 100ms 안팎부터 “굼뜨다”고 느낌', box.x + 6, box.y + 26, { size: 10.5, color: C.badInk, weight: 600 });
    const rr = [], pr = [], lk = [];
    for (let r = 0; r <= 400; r += 10) { rr.push([r, Math.min(rrReact(r), yMax)]); pr.push([r, FRAME]); lk.push([r, lockReact(r)]); }
    K.line(ctx, sc, lk, C.s3, 2);
    K.line(ctx, sc, pr, C.s2, 2);
    K.line(ctx, sc, rr, C.s1, 2);
    // 락스텝이 멈추기 시작하는 핑
    const breakRtt = Math.max(0, (lockTurns() * tickT() - P.jitter) * 2);
    if (breakRtt < 400) {
      ctx.fillStyle = K.alpha(C.warn, 0.18);
      ctx.fillRect(sc.x(breakRtt), sc.y(lockReact(0)) - 5, sc.x(400) - sc.x(breakRtt), 10);
      K.text(ctx, '여기부터 락스텝 멈춤', Math.min(sc.x(breakRtt) + 4, box.x + box.w - 110), sc.y(lockReact(0)) - 14, { size: 10.5, color: C.warnInk, weight: 600 });
    }
    // 현재 핑
    const x = sc.x(P.rtt);
    ctx.strokeStyle = C.ink2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, box.y); ctx.lineTo(x, box.y + box.h); ctx.stroke(); ctx.setLineDash([]);
    K.dot(ctx, x, sc.y(Math.min(rrReact(P.rtt), yMax)), 4.5, C.s1);
    K.dot(ctx, x, sc.y(FRAME), 4.5, C.s2);
    K.dot(ctx, x, sc.y(lockReact(P.rtt)), 4.5, C.s3);
    K.text(ctx, `지금 ${P.rtt}ms`, x + 6, box.y + 8, { size: 11, weight: 600, color: C.ink });
  }
  K.hover(cvC, x => {
    const box = chartBox();
    const r = Math.round(((x - box.x) / box.w) * 400 / 10) * 10;
    if (r < 0 || r > 400) return null;
    return `핑 <b>${r}ms</b><br>요청-응답 ${Math.round(rrReact(r))}ms<br>예측·클라 권위·롤백 ${Math.round(FRAME)}ms<br>락스텝 ${Math.round(lockReact(r))}ms${r / 2 + P.jitter > lockTurns() * tickT() ? ' (자주 멈춤)' : ''}`;
  });

  /* ---------------- 수치·해설 ---------------- */
  const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
  function updateText() {
    const recent = m => m.ev.filter(e => e.p > t - 8000 && e.react != null && e.react <= t);
    const out = {};
    MODELS.forEach(m => {
      const r = recent(m);
      const react = avg(r.map(e => e.react - e.p));
      const conf = avg(r.filter(e => e.confirm != null && e.confirm <= t).map(e => e.confirm - e.p));
      let extra = '';
      if (m.id === 'pred') extra = ` · 확정 <b>${K.n(conf)}</b>ms`;
      if (m.id === 'client') extra = ` · 상대 화면 <b>${K.n(conf)}</b>ms`;
      if (m.id === 'lock') extra = ` · 멈춤 <b>${LS.stalls.filter(s => s[1] > t - 8000).length}</b>회(8초)`;
      if (m.id === 'roll') extra = ` · 되감기 <b>${m.marks.filter(x => x[0] > t - 8000 && x[0] <= t).length}</b>회(8초)`;
      m.stEl.innerHTML = `반응 <b>${K.n(react)}</b>ms${extra}`;
      out[m.id] = react;
    });
    const lockStalls = LS.stalls.filter(s => s[1] > t - 8000).length;
    const rrMs = out.rr;
    let msg;
    if (P.rtt >= 120) msg = `${K.flag(rrMs > 250 ? 'bad' : 'warn')}핑 ${P.rtt}ms에서 <b>요청-응답</b>은 누르고 약 <b>${K.n(rrMs)}ms</b> 뒤에야 반응합니다(입력 지연). <b>예측·클라이언트 권위·롤백</b>은 핑과 상관없이 한 프레임(17ms) 만에 반응하지만, 각각 보정(고무줄), 화면 불일치·해킹, 되감기(순간이동)라는 대가가 있습니다.`;
    else msg = `${K.flag('good')}핑 ${P.rtt}ms에서는 요청-응답도 ${K.n(rrMs)}ms로 크게 굼뜨지 않습니다. 핑을 150ms 이상으로 올리면 방식 사이의 차이가 뚜렷해집니다.`;
    if (lockStalls >= 2) msg += ` <b>락스텝</b>은 입력 지연(${P.lockDelay}ms)이 입력이 상대에게 닿는 시간(핑의 절반)+지터(${Math.round(P.rtt / 2 + P.jitter)}ms)보다 짧아 최근 8초 동안 ${lockStalls}번 <b>모두가 멈췄습니다</b>.`;
    else msg += ` <b>락스텝</b>은 핑과 무관하게 입력 지연(${P.lockDelay}ms, 턴 단위로 올리면 최대 ${lockTurns() * tickT()}ms)만큼 일정하게 늦습니다.`;
    F.say(msg);
  }

  // 첫 화면을 채운다
  for (let i = 0; i < 260; i++) step(16);
  let acc = 0;
  K.loop(root, dt => {
    step(dt);
    MODELS.forEach(drawRow);
    drawChart();
    acc += dt;
    if (acc > 250) { acc = 0; updateText(); }
  });
  K.onTheme(drawChart);
});
