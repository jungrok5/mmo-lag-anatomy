/* 가비지 컬렉션(GC) 멈춤: 힙이 차면 청소를 한다. 전체 멈춤 방식은 청소하는 동안 게임 스레드도 얼린다.
   살아 있는 데이터가 클수록 오래 멈추고, 그동안 밀린 틱을 나중에 몰아서 처리한다. */
K.register('gc', function (root) {
  const F = K.frame(root, {
    kicker: '레이어 10 · 메모리',
    title: '청소하는 동안 세상이 멈춘다',
    lead: '서버 프로그램은 쉬지 않고 메모리를 빌려 씁니다(할당). 다 쓴 메모리를 모아 치우는 일이 GC(가비지 컬렉션, 쓰레기 청소)입니다. 청소 방식에 따라 서버 전체가 잠깐 얼어붙기도 합니다. 아래 두 그래프를 함께 보세요. 위쪽 톱니가 뚝 떨어지는 순간, 아래쪽 틱 막대가 하늘로 솟습니다.',
    tries: [
      '<b>큰 힙 + 전체 멈춤</b>을 눌러 보세요. 32GB 힙에 살아 있는 데이터가 8GB면 청소 한 번에 2초 넘게 서버 전체가 멈춥니다.',
      '같은 상태에서 <b>GC 방식</b>을 “세대별”로 바꿔 보세요. 짧은 청소가 자주 일어나고, 틱 막대는 예산 안에 머뭅니다.',
      '<b>이벤트 중 할당 폭주</b>를 눌러 보세요. 청소가 더 자주 필요해지고, 가끔 오는 전체 청소가 1초 넘게 멈춥니다.',
      '<b>동시 GC</b>를 켜고 <b>초당 할당량</b>을 1,500MB까지 올려 보세요. 청소가 할당을 따라잡지 못하면 결국 전체 멈춤으로 넘어갑니다.',
    ],
  });

  const P = { A: 200, H: 8, L: 2, mode: 'stw' };
  const B = 50;               // 20Hz 틱 예산
  const WIN = 60000;          // 최근 60초
  const LAPSE = 2;            // 실제 1초 = 시뮬레이션 2초
  let rnd = K.rng(21);

  const hcv = K.canvas(F.stage, { height: w => K.clamp(w * 0.34, 190, 250), caption: '힙(서버가 쓰는 메모리) 사용량', right: '최근 60초 · 2배속' });
  const tcv = K.canvas(F.stage, {
    height: w => K.clamp(w * 0.22, 140, 170), caption: '틱마다 걸린 시간',
    right: '<span class="legend"><span><i class="box" style="background:var(--s1)"></i>예산 안</span><span><i class="box" style="background:var(--bad)"></i>예산 초과</span></span>',
  });

  /* ---------- 조작부 ---------- */
  const g1 = K.group(F.controls, '메모리 쓰는 양');
  const sA = K.slider(g1, { label: '초당 할당량', min: 10, max: 2000, step: 10, value: P.A, fmt: v => K.n(v) + ' MB/s', onInput: v => { P.A = v; reset(); }, hint: '몬스터 스폰, 스킬 이펙트, 패킷 조립처럼 잠깐 쓰고 버리는 메모리' });
  const sL = K.slider(g1, { label: '오래 살아남는 데이터', min: 0.5, max: 16, step: 0.5, value: P.L, fmt: v => K.n(v, 1) + ' GB', onInput: v => { P.L = v; reset(); }, hint: '접속한 캐릭터, 인벤토리, 월드 상태처럼 치울 수 없는 것' });
  const g2 = K.group(F.controls, '청소 설정');
  const cH = K.choice(g2, { label: '힙 크기', value: P.H, options: [[2, '2GB'], [8, '8GB'], [32, '32GB']], onChange: v => { P.H = +v; fitLive(); reset(); } });
  const cM = K.choice(g2, {
    label: 'GC 방식', value: P.mode,
    options: [['stw', '전체 멈춤 (Stop-the-world)'], ['gen', '세대별 (짧게 자주)'], ['conc', '동시 수행 (Concurrent)']],
    onChange: v => { P.mode = v; reset(); }, hint: '틱 목표는 20Hz(예산 50ms)로 고정',
  });
  function fitLive() {
    const cap = Math.max(0.5, Math.floor((P.H * 0.85) / 0.5) * 0.5);
    sL.input.max = Math.min(16, cap);
    if (P.L > cap) { P.L = cap; }
    sL.set(P.L, false);
  }
  const setAll = (A, H, L, mode) => { sA.set(A, false); cH.set(H, false); cM.set(mode, false); Object.assign(P, { A, H, L, mode }); fitLive(); reset(); };
  K.presets(F, [
    { label: '작은 힙 + 세대별', apply: () => setAll(200, 2, 0.8, 'gen') },
    { label: '큰 힙 + 전체 멈춤', apply: () => setAll(500, 32, 8, 'stw') },
    { label: '이벤트 중 할당 폭주', apply: () => setAll(1500, 8, 4, 'gen') },
    { label: '동시 GC', apply: () => setAll(500, 8, 3, 'conc') },
  ]);

  const stInt = K.stat(F.stats, { label: 'GC 간격' });
  const stMax = K.stat(F.stats, { label: '최대 멈춤' });
  const stMiss = K.stat(F.stats, { label: '멈춤 중 밀린 틱', unit: '개' });
  const stSum = K.stat(F.stats, { label: '1분당 멈춤 총합' });
  const stFeel = K.stat(F.stats, { label: '체감' });

  /* ---------- 모델 ---------- */
  const GB = 1024;
  const young = () => K.clamp(P.H * 0.15, 0.3, 2) * GB;          // 젊은 세대 크기 (MB)
  const fullPause = () => 50 + P.L * 250;                          // 살아 있는 1GB 훑는 데 약 250ms
  const youngPause = () => 5 + 18 * K.clamp(P.A / 2000, 0, 1);
  const markDur = () => (0.3 + 0.6 * P.L) * 1000;                  // 동시 표시 단계 길이 (ms)
  const baseWork = () => 14 + P.A * 0.012;                         // 틱 기본 일 (할당이 많을수록 바쁜 서버)

  let t, heap, old, yng, mark, debt, ticks, pts, evs;
  function tickOnce() {
    let work = baseWork() * (mark ? 1.25 : 1) * (0.85 + rnd() * 0.3);
    const alloc = (P.A * B) / 1000;
    let pause = 0, ev = null;
    const Hm = P.H * GB, Lm = P.L * GB;
    if (P.mode === 'stw') {
      heap += alloc;
      if (heap >= Hm * 0.9) { pause = fullPause(); ev = { kind: 'full', before: heap }; heap = Lm + rnd() * 30; }
    } else if (P.mode === 'gen') {
      yng += alloc;
      if (yng >= young()) {
        old += yng * 0.02; yng = 0;
        pause = youngPause() + rnd() * 2; ev = { kind: 'minor', before: old + young() };
        if (old >= Hm * 0.9 - young()) { pause += fullPause(); ev = { kind: 'full', before: old + young() }; old = Lm; }
      }
      heap = old + yng;
    } else {
      heap += alloc;
      if (!mark && heap >= Hm * 0.75) { mark = { until: t + markDur(), garbage: heap - Lm }; pause = 1 + rnd() * 2; ev = { kind: 'mark', before: heap }; }
      else if (mark && heap >= Hm * 0.98) {
        pause = fullPause(); ev = { kind: 'fallback', before: heap }; heap = Lm; mark = null;
      } else if (mark && t >= mark.until) {
        pause = 3 + 5 * K.clamp(P.L / 16, 0, 1); ev = { kind: 'markEnd', before: heap };
        heap = Math.max(Lm, heap - mark.garbage); mark = null;
      }
    }
    const dur = work + pause;
    const d0 = debt;
    // 고정 스텝: 늦게 끝난 만큼 빚이 생기고, 빚이 있으면 다음 틱을 쉬지 않고 바로 돌린다
    debt = Math.max(0, d0 + dur - B);
    ticks.push({ t, dur, pause, catchup: d0 > 0, marking: !!mark });
    if (ev) { ev.t = t; ev.pause = pause; ev.after = heap; evs.push(ev); }
    pts.push([t, ev ? ev.before : heap]);
    if (ev) pts.push([t + pause, heap]);
    t += debt > 0 ? dur : Math.max(dur, B - d0);
  }
  function prune() {
    const cut = t - WIN - 2000;
    while (ticks.length && ticks[0].t < cut) ticks.shift();
    while (pts.length > 2 && pts[1][0] < cut) pts.shift();
    while (evs.length && evs[0].t < cut) evs.shift();
  }
  function reset() {
    rnd = K.rng(21);
    t = 0; debt = 0; mark = null; ticks = []; pts = []; evs = [];
    old = P.L * GB; yng = 0; heap = old;
    // 첫 큰 청소가 화면 안(약 20초 전)에 보이도록 미리 돌린다
    let first = null;
    while (t < 600000 && first == null) {
      tickOnce();
      const big = evs.find(e => e.kind === 'full' || e.kind === 'fallback' || (P.mode === 'conc' && e.kind === 'markEnd'));
      if (big) first = big.t;
      if (ticks.length > 3000) prune();
    }
    const target = Math.max(WIN + 1000, (first || 0) + 21000);
    while (t < target) { tickOnce(); if (ticks.length > 3000) prune(); }
    prune();
  }
  function simTo(dtReal) {
    const end = t + dtReal * LAPSE;
    let g = 0;
    while (t < end && g++ < 500) tickOnce();
    prune();
  }

  // 정상 상태의 분석값 (화면에 안 보이는 먼 미래의 전체 청소도 알려 주려고)
  function analytic() {
    const A = P.A, Hm = P.H * GB, Lm = P.L * GB, fp = fullPause();
    if (P.mode === 'stw') {
      const I = (Hm * 0.9 - Lm) / A;
      return { interval: I, sub: '청소 1번에 ' + K.ms(fp), maxP: fp, perMin: (fp * 60) / I, fullI: I };
    }
    if (P.mode === 'gen') {
      const Iy = young() / A, py = youngPause() + 1;
      const If = (Hm * 0.9 - young() - Lm) / (A * 0.02);
      return { interval: Iy, sub: `전체 청소는 ${fmtDur(If)}마다`, maxP: fp + py, perMin: (py * 60) / Iy + (fp * 60) / If, fullI: If, youngP: py };
    }
    const D = markDur() / 1000;
    const head = Hm * 0.98 - Hm * 0.75;
    if (A * D >= head) {
      const I = (Hm * 0.75 - Lm) / A + head / A;
      return { interval: I, sub: '청소가 할당을 못 따라잡음', maxP: fp, perMin: (fp * 60) / I, fullI: I, fallback: true };
    }
    const cyc = Math.max(D, (Hm * 0.75 - Lm - A * D) / A + D);
    return { interval: cyc, sub: `이 중 ${K.n(D, 1)}초는 틱이 25% 느림`, maxP: 3 + 5 * K.clamp(P.L / 16, 0, 1), perMin: (60 / cyc) * 8, fullI: Infinity, markShare: D / cyc };
  }
  function fmtDur(s) {
    if (!Number.isFinite(s)) return '—';
    if (s < 60) return K.n(s, s < 10 ? 1 : 0) + '초';
    if (s < 3600) return K.n(s / 60, s < 600 ? 1 : 0) + '분';
    return K.n(s / 3600, 1) + '시간';
  }

  reset();
  let capNow = '';

  /* ---------- 그리기 ---------- */
  const xTicks = [-60000, -40000, -20000, 0];
  const xFmt = v => (v === 0 ? '지금' : `${-v / 1000}초 전`);
  function heapBox() { const { w, h } = hcv; return { x: 44, y: 22, w: w - 56, h: h - 48 }; }
  function drawHeap() {
    const { ctx, w, h } = hcv;
    const C = K.C;
    ctx.clearRect(0, 0, w, h);
    const box = heapBox();
    const H = P.H, step = H / 4;
    const sc = K.plot(ctx, box, {
      x0: -WIN, x1: 0, y0: 0, y1: H * 1.1, yTicks: [0, step, step * 2, step * 3, H], yFmt: v => K.n(v, v % 1 ? 1 : 0),
      xTicks: w < 420 ? [-60000, -30000, 0] : xTicks, xFmt, yTitle: '사용 중 (GB)',
    });
    const X = tt => sc.x(tt - t);
    // 동시 청소 구간
    ctx.fillStyle = K.alpha(C.ink2, 0.08);
    let ms = null;
    for (const k of ticks) {
      if (k.marking && ms == null) ms = k.t;
      if (!k.marking && ms != null) { const a = Math.max(box.x, X(ms)); ctx.fillRect(a, box.y, X(k.t) - a, box.h); ms = null; }
    }
    if (ms != null) { const a = Math.max(box.x, X(ms)); ctx.fillRect(a, box.y, box.x + box.w - a, box.h); }
    // 오래 사는 데이터 띠
    ctx.fillStyle = K.alpha(C.ink2, 0.1);
    ctx.fillRect(box.x, sc.y(P.L), box.w, sc.y(0) - sc.y(P.L));
    if (sc.y(0) - sc.y(P.L) > 16) K.text(ctx, `오래 사는 데이터 ${K.n(P.L, 1)}GB (치울 수 없음)`, box.x + 6, sc.y(P.L) + 10, { size: 10.5, color: C.ink2 });
    // 힙 크기, 청소 시작선
    K.hline(ctx, sc, H, { color: C.ink2 });
    const trig = P.mode === 'conc' ? 0.75 : 0.9;
    const trigV = P.mode === 'gen' ? H * 0.9 - young() / GB : H * trig;
    K.hline(ctx, sc, trigV, { color: C.muted, dash: [4, 3] });
    const tl = P.mode === 'conc' ? '동시 청소 시작 75%' : P.mode === 'gen' ? '전체 청소 시작선' : '청소 시작 90%';
    K.text(ctx, tl, box.x + 6, sc.y(trigV) + 9, { size: 10.5, color: C.muted });
    // 사용량 선
    ctx.save();
    ctx.beginPath(); ctx.rect(box.x, box.y - 4, box.w, box.h + 8); ctx.clip();
    let i0 = pts.findIndex(p => p[0] >= t - WIN);
    i0 = Math.max(0, i0 - 1);
    const line = pts.slice(i0).map(p => [p[0] - t, p[1] / GB]);
    K.area(ctx, sc, line, C.s1, 0.1);
    K.line(ctx, sc, line, C.s1, 2);
    ctx.restore();
    // 큰 청소 표시
    for (const e of evs) {
      if (e.t < t - WIN || !(e.kind === 'full' || e.kind === 'fallback')) continue;
      const x = X(e.t);
      ctx.fillStyle = C.bad;
      K.rr(ctx, x - 4, sc.y(e.before / GB) - 13, 8, 8, 1.5); ctx.fill();
    }
    const hl = `힙 크기 ${H}GB`;
    ctx.font = K.font(10.5, 600);
    const hw = ctx.measureText(hl).width + 10;
    ctx.fillStyle = K.alpha(C.paper, 0.94);
    K.rr(ctx, box.x + box.w - hw, sc.y(H) - 16, hw, 14, 3); ctx.fill();
    K.text(ctx, hl, box.x + box.w - 5, sc.y(H) - 9, { align: 'right', size: 10.5, weight: 600, color: C.ink2 });
  }
  function tickBox() { const { w, h } = tcv; return { x: 44, y: 20, w: w - 56, h: h - 44 }; }
  function drawTicks() {
    const { ctx, w, h } = tcv;
    const C = K.C;
    ctx.clearRect(0, 0, w, h);
    const box = tickBox();
    const Y1 = 200;
    const sc = K.plot(ctx, box, {
      x0: -WIN, x1: 0, y0: 0, y1: Y1, yTicks: [0, 50, 100, 150, 200], yFmt: v => v,
      xTicks: w < 420 ? [-60000, -30000, 0] : xTicks, xFmt, yTitle: '틱 처리 시간 (ms)',
    });
    const bw = 3, n = Math.floor(box.w / bw);
    const cols = new Array(n).fill(0);
    for (const k of ticks) {
      const i = Math.floor(((k.t - (t - WIN)) / WIN) * n);
      if (i >= 0 && i < n) cols[i] = Math.max(cols[i], k.dur);
    }
    cols.forEach((v, i) => {
      if (!v) return;
      const x = box.x + i * bw;
      const top = sc.y(Math.min(v, Y1));
      ctx.fillStyle = v > B ? C.bad : C.s1;
      ctx.fillRect(x, top, bw - 1, sc.y(0) - top);
      if (v > Y1) {
        ctx.beginPath(); ctx.moveTo(x + 1, box.y - 8); ctx.lineTo(x + 5, box.y - 2); ctx.lineTo(x - 3, box.y - 2); ctx.closePath();
        ctx.fillStyle = C.bad; ctx.fill();
      }
    });
    const yb = Math.round(sc.y(B)) + 0.5;
    ctx.strokeStyle = C.bad; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(box.x, yb); ctx.lineTo(box.x + box.w, yb); ctx.stroke();
    // 큰 멈춤에 이름표
    // 최근 것부터 이름표를 달고, 겹치면 건너뛴다
    let lastL = 1e9;
    const big = evs.filter(e => e.t >= t - WIN && e.pause >= 100).sort((a, b) => b.t - a.t);
    ctx.font = K.font(11, 600);
    for (const e of big) {
      const x = sc.x(e.t - t);
      const missed = Math.floor(e.pause / B);
      const lab = w < 480 ? `${K.ms(e.pause)} · 밀린 틱 ${missed}개` : `${K.ms(e.pause)} 멈춤 · 밀린 틱 ${missed}개 → 몰아치기`;
      const tw = ctx.measureText(lab).width + 10;
      let lx = x + 8;
      if (lx + tw > Math.min(box.x + box.w, lastL - 6)) lx = x - 8 - tw;
      if (lx < box.x || lx + tw > lastL - 6) continue;
      ctx.fillStyle = K.alpha(C.paper, 0.94);
      K.rr(ctx, lx, box.y + 4, tw, 17, 4); ctx.fill();
      K.text(ctx, lab, lx + 5, box.y + 12.5, { size: 11, weight: 600, color: C.badInk });
      lastL = lx;
    }
    const lab = '틱 예산 50ms';
    const lw = ctx.measureText(lab).width + 10;
    ctx.fillStyle = K.alpha(C.paper, 0.92);
    ctx.fillRect(box.x + box.w - lw, yb - 16, lw, 14);
    K.text(ctx, lab, box.x + box.w - 5, yb - 9, { align: 'right', size: 10.5, weight: 600, color: C.badInk });
  }
  const evName = { full: '전체 청소', fallback: '전체 멈춤으로 전환', minor: '젊은 세대 청소', mark: '동시 청소 시작', markEnd: '동시 청소 끝' };
  K.hover(hcv, x => {
    const box = heapBox();
    const rel = ((x - box.x) / box.w) * WIN - WIN;
    if (rel < -WIN || rel > 0) return null;
    const tt = t + rel;
    let best = null;
    for (const p of pts) if (p[0] <= tt) best = p;
    if (!best) return null;
    const near = evs.filter(e => Math.abs(e.t - tt) < (WIN / box.w) * 5 && e.kind !== 'mark').pop();
    let s = `${K.n(-rel / 1000, 1)}초 전 · 사용 <b>${K.n(best[1] / GB, 2)}GB</b> / ${P.H}GB`;
    if (near) s += `<br>${evName[near.kind]}: <b>${K.ms(near.pause)}</b> 멈춤<br>${K.n(near.before / GB, 2)}GB → ${K.n(near.after / GB, 2)}GB`;
    return s;
  });
  K.hover(tcv, x => {
    const box = tickBox();
    const rel = ((x - box.x) / box.w) * WIN - WIN;
    if (rel < -WIN || rel > 0) return null;
    const span = (WIN / box.w) * 3;
    const ks = ticks.filter(k => Math.abs(k.t - (t + rel)) <= span);
    if (!ks.length) return null;
    const m = ks.reduce((a, b) => (b.dur > a.dur ? b : a));
    let s = `${K.n(-rel / 1000, 1)}초 전 · 틱 <b>${K.ms(m.dur)}</b>`;
    if (m.pause >= 1) s += `<br>이 중 GC 멈춤 <b>${K.ms(m.pause)}</b>`;
    if (m.pause >= B) s += `<br>밀린 틱 ${Math.floor(m.pause / B)}개를 뒤이어 몰아서 처리`;
    else if (m.marking) s += '<br>동시 청소 중이라 틱이 25% 느림';
    return s;
  });

  /* ---------- 해설 ---------- */
  function explain(a) {
    const fp = fullPause(), missed = Math.floor(a.maxP / B);
    const fix = '고치는 법: 할당 줄이기(자주 만드는 객체를 버리지 않고 다시 쓰는 <b>오브젝트 풀</b>), 살아 있는 데이터 줄이기, GC 종류 바꾸기.';
    const who = '이 서버 프로세스에 붙어 있는 <b>모든 플레이어가 같은 순간에</b> 겪습니다.';
    if (P.mode === 'stw') {
      const st = fp >= 300 ? 'bad' : fp >= B ? 'warn' : 'good';
      return `${K.flag(st)} GC는 더 안 쓰는 메모리를 모아 치우는 쓰레기 청소입니다. <b>전체 멈춤</b> 방식은 청소하는 동안 게임 스레드까지 모두 “얼음”입니다. 힙 ${P.H}GB의 90%가 차는 <b>${fmtDur(a.interval)}마다</b> 청소를 하고, 살아 있는 데이터 ${K.n(P.L, 1)}GB를 훑는 데 <b>${K.ms(fp)}</b>가 걸립니다. 그동안 틱 ${missed}개가 밀립니다. 플레이어는 세상이 <b>멈춤</b> 뒤, 밀린 틱이 한꺼번에 처리되며 몬스터가 순간이동하듯 움직이고 스킬이 한꺼번에 터지는 <b>몰아치기</b>를 봅니다. ${who} ${fix}`;
    }
    if (P.mode === 'gen') {
      const st = a.fullI < 300 && fp >= 300 ? 'bad' : fp >= B ? 'warn' : 'good';
      return `${K.flag(st)} <b>세대별</b> GC는 새로 만든 객체만 모아 두는 작은 칸(젊은 세대 ${K.n(young() / GB, 1)}GB)을 <b>${fmtDur(a.interval)}마다 ${K.ms(a.youngP)}</b>씩 짧게 청소합니다. 금방 버려지는 객체가 대부분이라 빨리 끝나고, 틱 예산 안에 흡수됩니다. 다만 청소에서 살아남은 2%가 늙은 세대에 쌓이면 <b>${fmtDur(a.fullI)}마다</b> 전체 청소가 필요하고, 그때는 <b>${K.ms(fp)}</b> 동안 <b>멈춤</b>, 이어서 <b>몰아치기</b>가 옵니다. ${who} ${st === 'good' ? '' : fix}`;
    }
    if (a.fallback) {
      return `${K.flag('bad')} <b>동시 수행</b> GC는 게임이 도는 동안 옆에서 청소하지만, 초당 ${K.n(P.A)}MB를 새로 쓰면 청소(${K.n(markDur() / 1000, 1)}초)가 끝나기 전에 힙이 가득 찹니다. 결국 전체 멈춤으로 넘어가 <b>${K.ms(fp)}</b> 동안 서버가 얼어붙습니다(<b>멈춤</b> 뒤 <b>몰아치기</b>). ${who} ${fix}`;
    }
    const work = baseWork();
    const slow = work * 1.25;
    const st = slow > B * 0.9 ? 'warn' : 'good';
    return `${K.flag(st)} <b>동시 수행</b> GC는 게임이 도는 동안 옆 스레드에서 청소합니다. 멈춤은 한 번에 <b>${K.ms(a.maxP)}</b> 이하라 거의 느낄 수 없습니다. 대신 청소하는 동안(시간의 ${K.pct(a.markShare)}) CPU를 나눠 써서 틱이 평소 ${K.ms(work)}에서 <b>${K.ms(slow)}</b>로 25% 느려집니다. ${slow > B * 0.9 ? '예산 50ms에 가까워서 조금만 더 바빠지면 <b>슬로우모션</b>이 됩니다.' : '예산 안이라 플레이어는 차이를 거의 못 느낍니다.'} 할당이 청소 속도를 넘으면 결국 전체 멈춤으로 넘어간다는 점은 기억하세요.`;
  }

  K.loop(root, dt => {
    simTo(dt);
    drawHeap();
    drawTicks();
    const a = analytic();
    const missed = Math.floor(a.maxP / B);
    stInt.set(fmtDur(a.interval), P.mode === 'stw' && a.interval < 10 && a.maxP > B ? 'bad' : null, a.sub);
    const cap = P.mode === 'conc' ? '<span class="legend"><span><i class="box" style="background:var(--sunk);outline:1px solid var(--line)"></i>동시 청소 중</span></span>' : '최근 60초 · 2배속';
    if (cap !== capNow) { hcv.setCaption(null, cap); capNow = cap; }
    stMax.set(K.ms(a.maxP), a.maxP >= 300 ? 'bad' : a.maxP >= B ? 'warn' : 'good', a.maxP >= B ? '서버 전체가 얼어붙음' : '틱 안에 흡수됨');
    stMiss.set(K.n(missed), missed >= 6 ? 'bad' : missed >= 1 ? 'warn' : 'good', missed ? '풀린 뒤 몰아서 처리' : '밀리지 않음');
    stSum.set(K.ms(a.perMin), a.perMin > 1000 ? 'bad' : a.perMin > 200 ? 'warn' : 'good', `1분 중 ${K.pct(a.perMin / 60000, 1)}`);
    const slowConc = P.mode === 'conc' && !a.fallback && baseWork() * 1.25 > B * 0.9;
    const feel = a.maxP >= 300 ? ['멈춤·몰아치기', 'bad'] : a.maxP >= B || slowConc ? ['가끔 끊김', 'warn'] : ['거의 못 느낌', 'good'];
    stFeel.set(feel[0], feel[1], a.maxP >= B ? `${fmtDur(a.fullI)}마다 한 번` : '');
    F.say(explain(a));
  });
});
