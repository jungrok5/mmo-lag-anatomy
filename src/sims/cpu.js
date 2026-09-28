/* 클라이언트 OS 스케줄러: 게임 스레드도 다른 프로그램과 똑같이 코어 앞에 줄을 선다.
   0.25ms 단위 라운드로빈(시간 조각 5ms, 공용 대기 줄) 모형. 화면은 실제의 1/20 속도로 흐른다. */
K.register('cpu', function (root) {
  const F = K.frame(root, {
    kicker: '레이어 2 · 클라이언트 OS',
    title: '내 컴퓨터가 다른 일로 바쁘면 게임도 CPU를 기다린다',
    lead: '운영체제는 코어 몇 개를 여러 프로그램에 몇 ms씩(이 실험에서는 5ms) 번갈아 나눠 줍니다. 백신이나 방송 프로그램이 코어를 쓰고 있으면 게임의 계산도 CPU를 배정받을 때까지 기다려야 합니다. 16.7ms 안에 프레임을 못 끝내면 화면은 이전 프레임을 한 번 더 보여 줍니다. 회선과 서버는 멀쩡한데 내 화면만 뚝뚝 끊기는 경우입니다. 실제 윈도우는 앞에 띄운 창(포그라운드)의 우선순위를 조금 높이므로, 이 실험은 기다림이 큰 쪽으로 보여 줍니다.',
    tries: [
      '<b>방송 + 브라우저</b>를 누르고 “메인 상태” 줄을 보세요. 빨간 “대기” 구간은 게임 메인 스레드가 코어를 못 받고 기다린 시간입니다. 그 뒤에 ■(놓친 화면)가 찍힙니다.',
      '같은 상태에서 <b>게임 우선순위 높게</b>를 켜거나 코어를 <b>8개</b>로 늘려 보세요. 대기가 사라집니다.',
      '<b>폰 발열</b>을 누르고 20초쯤 지켜보세요. CPU 속도가 떨어지면서 처음엔 멀쩡하던 게임이 점점 뚝뚝 끊깁니다.',
      '<b>타이머 15.6ms</b>: CPU는 한가한데도 ■가 섞입니다. 잠들었다 깨는 시각이 15.6ms 단위로 맞춰져 프레임 간격이 들쭉날쭉하기 때문입니다.',
    ],
    layout: 'side',
  });

  const VB = 1000 / 60, TICK = 0.25, Q = 5, RATE = 0.05;   // RATE: 실제 1ms에 흐르는 시뮬레이션 시간
  const P = { cores: 4, W: 8, prio: false, power: 'hi', timer: false, av: false, upd: false, obs: false, web: true };
  const NAME = { main: '메인', render: '렌더', net: '네트워크', audio: '오디오' };
  const SER = { main: 's1', render: 's2', net: 's3', audio: 's4' };
  let heatStart = 0;
  const speedNow = () => P.power === 'hi' ? 1 : P.power === 'save' ? 0.6 : 1 - 0.5 * Math.min(1, (performance.now() - heatStart) / 20000);

  /* ---------- 스케줄러 모형 ---------- */
  function makeSim(speedFn, seed) {
    const rnd = K.rng(seed);
    const threads = [];
    const add = o => { const th = Object.assign({ state: 'sleep', rem: 0, wake: Infinity, q: 0, readyAt: 0, nextArr: Infinity }, o); threads.push(th); return th; };
    const main = add({ kind: 'main', game: true, wake: 0 });
    const rend = add({ kind: 'render', game: true, jobs: 0 });
    add({ kind: 'net', game: true, nextArr: rnd() * 5, per: () => 4 + rnd() * 2, work: 0.3 });   // 패킷 도착마다 0.3ms
    add({ kind: 'audio', game: true, nextArr: 2, per: () => 10, work: 0.5 });
    const bg = o => add(Object.assign({ kind: 'bg', game: false, wake: rnd() * 20 }, o));
    if (P.av) { bg({ label: '백신', duty: 0.9, run: [20, 60] }); bg({ label: '백신', burst: 30, gap: [100, 250], wake: 20 + rnd() * 60 }); }
    if (P.upd) { bg({ label: '업데이트', duty: 0.6, run: [10, 40] }); bg({ label: '업데이트', duty: 0.6, run: [10, 40] }); }
    if (P.obs) {
      bg({ label: '방송', duty: 0.7, run: [5, 15] });
      const e0 = 2 + rnd() * 4;   // 인코더 스레드 3개가 매 프레임 동시에 5ms씩
      for (let i = 0; i < 3; i++) bg({ label: '인코더', wake: Infinity, nextArr: e0, per: () => VB, work: 5 });
    }
    if (P.web) bg({ label: '브라우저', duty: 0.4, run: [3, 10] });
    const cores = new Array(P.cores).fill(null), queue = [];
    const S = { t: 0, from: 0, segs: cores.map(() => []), mseg: [], vbl: [], done: 0, lastV: 0, started: false, T: 0, gRun: 0, gWait: 0, mainW: 0, hit: 0, miss: 0, nW: 0, nN: 0, busy: 0, tot: 0 };
    const timer = x => (P.timer ? Math.ceil(x / 15.625 - 1e-9) * 15.625 : Math.ceil(x - 1e-9));
    function ready(th, t) { th.state = 'ready'; th.readyAt = t; th.q = 0; queue.push(th); }
    function onWake(th, t) {
      if (th.kind === 'main') th.rem = P.W;
      else if (th.duty) { th.plan = th.run[0] + rnd() * (th.run[1] - th.run[0]); th.rem = th.plan; }
      else if (th.burst) th.rem = th.burst;
      ready(th, t);
    }
    function finish(th, t) {
      th.state = 'sleep';
      if (th.kind === 'main') {         // 계산 끝 → 렌더 스레드에 넘기고, 다음 장 시각까지 잠든다
        rend.jobs++;
        if (rend.state === 'sleep') { rend.rem = 4; ready(rend, t); }
        let Tn = S.T + VB, wake;
        if (t <= Tn) wake = timer(Tn); else { wake = t; if (t > Tn + VB) Tn = t; }
        S.T = Tn; th.wake = wake;
      } else if (th.kind === 'render') {
        S.done++; S.started = true; rend.jobs--;
        if (rend.jobs > 0) { th.rem = 4; ready(th, t); }
      } else if (th.duty) th.wake = t + (th.plan * (1 - th.duty)) / th.duty;
      else if (th.burst) th.wake = t + th.gap[0] + rnd() * (th.gap[1] - th.gap[0]);
    }
    function tick() {
      const t = S.t, sp = speedFn(), inWin = t >= S.from;
      for (const th of threads) {
        if (th.per && t >= th.nextArr) {
          th.nextArr += th.per();
          if (th.state === 'sleep') { th.rem = th.work; ready(th, t); } else th.rem += th.work;
        } else if (th.state === 'sleep' && th.wake <= t) onWake(th, t);
      }
      const v = Math.floor(t / VB);   // 화면 갱신 시각: 새 그림이 있었나?
      if (v > S.lastV) {
        S.lastV = v;
        if (S.started) {
          const hit = S.done > 0; S.done = 0;
          S.vbl.push([v * VB, hit]);
          if (inWin) hit ? S.hit++ : S.miss++;
        }
      }
      if (P.prio) {                   // 게임 스레드가 줄에 있으면 다른 프로그램을 코어에서 내린다
        for (let c = 0; c < cores.length; c++) {
          const cur = cores[c];
          if (cur && !cur.game && queue.some(q => q.game)) { cur.state = 'ready'; cur.q = 0; queue.push(cur); cores[c] = null; }
        }
      }
      for (let c = 0; c < cores.length; c++) {
        if (cores[c] || !queue.length) continue;
        let i = 0;
        if (P.prio) { const g = queue.findIndex(q => q.game); if (g >= 0) i = g; }
        const th = queue.splice(i, 1)[0];
        th.state = 'run'; th.q = 0;
        if (th.kind === 'net' && inWin) { S.nW += t - th.readyAt; S.nN++; }
        cores[c] = th;
      }
      for (let c = 0; c < cores.length; c++) {
        const th = cores[c], sg = S.segs[c];
        if (inWin) S.tot += TICK;
        if (!th) continue;
        if (inWin) { S.busy += TICK; if (th.game) S.gRun += TICK; }
        const last = sg[sg.length - 1];
        if (last && last[2] === th && last[1] >= t - 1e-6) last[1] = t + TICK; else sg.push([t, t + TICK, th]);
        th.rem -= TICK * sp; th.q += TICK;
        if (th.rem <= 1e-9) { cores[c] = null; finish(th, t + TICK); }
        else if (th.q >= Q && queue.length) { cores[c] = null; th.state = 'ready'; th.q = 0; queue.push(th); }   // 시간 조각 끝: 줄 맨 뒤로
      }
      if (inWin) for (const th of queue) if (th.game) { S.gWait += TICK; if (th === main) S.mainW += TICK; }
      const ms = main.state === 'run' ? 'run' : main.state === 'ready' ? 'wait' : null;
      if (ms) {
        const l = S.mseg[S.mseg.length - 1];
        if (l && l[2] === ms && l[1] >= t - 1e-6) l[1] = t + TICK; else S.mseg.push([t, t + TICK, ms]);
      }
      S.t = t + TICK;
    }
    S.queue = queue; S.cores = cores;
    S.run = ms => { const end = S.t + ms; while (S.t < end - 1e-9) tick(); };
    S.trim = keep => {
      const lim = S.t - keep, cut = (a, i) => { let k = 0; while (k < a.length && a[k][i] < lim) k++; if (k) a.splice(0, k); };
      S.segs.forEach(sg => cut(sg, 1)); cut(S.mseg, 1); cut(S.vbl, 0);
    };
    S.stats = () => ({
      got: S.gRun / Math.max(1e-9, S.gRun + S.gWait), miss: S.miss / Math.max(1, S.hit + S.miss),
      netWait: S.nN ? S.nW / S.nN : 0, util: S.busy / Math.max(1e-9, S.tot), mainWait: S.mainW / Math.max(1, S.hit + S.miss),
    });
    return S;
  }

  /* ---------- 화면 ---------- */
  const rowH = () => (P.cores <= 2 ? 44 : P.cores <= 4 ? 34 : 23);
  const TOP = 8, VROW = 24, MROW = 22, GAP = 8, AXIS = 26, QROW = 34;
  const cv = K.canvas(F.stage, {
    height: () => TOP + VROW + MROW + GAP + P.cores * rowH() + AXIS + QROW,
    caption: 'CPU 코어 시간표',
    right: '<span class="legend"><span><i class="box" style="background:var(--s1)"></i>게임 메인</span><span><i class="box" style="background:var(--s2)"></i>렌더</span><span><i class="box" style="background:var(--s3)"></i>네트워크</span><span><i class="box" style="background:var(--s4)"></i>오디오</span><span><i class="box" style="background:repeating-linear-gradient(135deg,var(--muted) 0 2px,transparent 2px 4px);outline:1px solid var(--line)"></i>다른 프로그램</span></span>',
  });

  const g1 = K.group(F.controls, '게임');
  const sW = K.slider(g1, { label: '게임 한 프레임 계산량', min: 4, max: 14, step: 0.5, value: P.W, unit: 'ms', onInput: v => { P.W = v; rebuild(); }, hint: '메인 스레드가 한 프레임마다 할 계산(CPU 속도 100% 기준). 렌더 스레드는 따로 4ms.' });
  const tPrio = K.toggle(g1, { label: '게임 우선순위 높게', value: P.prio, onChange: v => { P.prio = v; rebuild(); }, hint: '게임 스레드가 대기 중이면 다른 프로그램을 코어에서 내립니다.' });
  const g2 = K.group(F.controls, '내 컴퓨터');
  const cCores = K.choice(g2, { label: '코어 수', value: P.cores, options: [[2, '2개'], [4, '4개'], [8, '8개']], onChange: v => { P.cores = +v; cv.fit(); rebuild(); } });
  const cPow = K.choice(g2, {
    label: '전원 모드', value: P.power, options: [['hi', '고성능'], ['save', '절전'], ['heat', '발열 스로틀링']],
    onChange: v => { P.power = v; if (v === 'heat') heatStart = performance.now(); rebuild(); },
    hint: '절전: CPU 속도 60%. 발열: 20초에 걸쳐 100% → 50%로 떨어집니다(실제로는 몇 분~20분쯤에 걸쳐 일어나는 일을 줄여 보여 줍니다).',
  });
  const tTimer = K.toggle(g2, { label: '타이머 해상도 15.6ms (윈도우 기본값)', value: P.timer, onChange: v => { P.timer = v; rebuild(); }, hint: '끄면 게임이 타이머를 1ms로 바꿔 쓴 상태입니다.' });
  const g3 = K.group(F.controls, '같이 돌고 있는 프로그램');
  const tAv = K.toggle(g3, { label: '백신 전체 검사', value: P.av, onChange: v => { P.av = v; rebuild(); }, hint: '1코어 90% + 가끔 30ms씩 집중 사용' });
  const tUpd = K.toggle(g3, { label: '윈도우 업데이트', value: P.upd, onChange: v => { P.upd = v; rebuild(); }, hint: '2코어 60%' });
  const tObs = K.toggle(g3, { label: '방송·녹화 프로그램', value: P.obs, onChange: v => { P.obs = v; rebuild(); }, hint: 'CPU로 영상을 압축하는 경우. 1코어 70% + 인코더 스레드 3개가 매 프레임 5ms. 그래픽카드로 압축하면 CPU 부담은 훨씬 적습니다.' });
  const tWeb = K.toggle(g3, { label: '브라우저 영상', value: P.web, onChange: v => { P.web = v; rebuild(); }, hint: '1코어 40%' });

  const stGot = K.stat(F.stats, { label: '게임이 받은 CPU', unit: '%', sub: '원할 때 바로 받은 비율' });
  const stMiss = K.stat(F.stats, { label: '놓친 프레임', unit: '%', sub: '이전 프레임을 반복한 비율' });
  const stNet = K.stat(F.stats, { label: '네트워크 대기', sub: '패킷 도착→읽기(평균)' });
  const stUtil = K.stat(F.stats, { label: '전체 CPU 사용률', unit: '%' });
  const stSpd = K.stat(F.stats, { label: '현재 CPU 속도', unit: '%' });

  let live = null, seed = 1, ST = null, statSpeed = -1, shadowTimer = 0;
  function shadow() {   // 같은 조건으로 1.2초를 빨리 돌려 통계를 낸다 (화면은 느리게 흐르므로)
    const sp = speedNow();
    const sh = makeSim(() => sp, 99);
    sh.run(200); sh.from = sh.t; sh.run(1200);
    ST = sh.stats(); statSpeed = sp;
  }
  function rebuild() {
    live = makeSim(speedNow, seed++);
    live.run(260);
    clearTimeout(shadowTimer);
    shadowTimer = setTimeout(shadow, 60);
  }
  function setAll(o) {
    sW.set(o.W, false); P.W = o.W;
    cCores.set(o.cores || 4, false); P.cores = o.cores || 4;
    cPow.set(o.power || 'hi', false); P.power = o.power || 'hi'; if (P.power === 'heat') heatStart = performance.now();
    [[tPrio, 'prio'], [tTimer, 'timer'], [tAv, 'av'], [tUpd, 'upd'], [tObs, 'obs'], [tWeb, 'web']].forEach(([c, k]) => { c.set(!!o[k], false); P[k] = !!o[k]; });
    cv.fit(); rebuild();
  }
  K.presets(F, [
    { label: '게임만', apply: () => setAll({ W: 8 }) },
    { label: '백신 전체 검사', title: '2코어 노트북에서 백신 검사', apply: () => setAll({ W: 10, cores: 2, av: true }) },
    { label: '방송 + 브라우저', apply: () => setAll({ W: 10, obs: true, web: true }) },
    { label: '노트북 절전 모드', apply: () => setAll({ W: 12, power: 'save', web: true }) },
    { label: '폰 발열', apply: () => setAll({ W: 12, cores: 8, power: 'heat' }) },
    { label: '타이머 15.6ms', apply: () => setAll({ W: 8, timer: true }) },
  ]);
  rebuild(); shadow();

  let pat = null;
  K.onTheme(() => { pat = null; });
  function stripes(ctx) {
    if (pat) return pat;
    const c = document.createElement('canvas'); c.width = c.height = 8;
    const x = c.getContext('2d');
    x.fillStyle = K.alpha(K.C.muted, 0.16); x.fillRect(0, 0, 8, 8);
    x.strokeStyle = K.alpha(K.C.muted, 0.6); x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(-2, 10); x.lineTo(10, -2); x.moveTo(-2, 2); x.lineTo(2, -2); x.moveTo(6, 10); x.lineTo(10, 6); x.stroke();
    pat = ctx.createPattern(c, 'repeat');
    return pat;
  }

  const LW = 58;
  const win = w => (w < 520 ? 70 : 120);
  function layout() {
    const { w } = cv, WIN = win(w), t1 = live.t, t0 = t1 - WIN;
    const X = t => LW + ((t - t0) / WIN) * (w - LW - 8);
    const yV = TOP + VROW / 2, yM = TOP + VROW, yC = yM + MROW + GAP, rh = rowH();
    return { WIN, t0, t1, X, yV, yM, yC, rh };
  }

  function draw() {
    const { ctx, w, h } = cv, C = K.C;
    ctx.clearRect(0, 0, w, h);
    const L = layout(), { X, t0, t1, rh } = L;
    const x0 = X(t0), x1 = X(t1);
    // 화면 갱신 눈금(16.7ms)
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (const [t] of live.vbl) {
      if (t < t0) continue;
      const x = Math.round(X(t)) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, TOP + VROW - 2); ctx.lineTo(x, L.yC + P.cores * rh); ctx.stroke();
    }
    K.text(ctx, '화면', 6, L.yV, { size: 11, color: C.ink2, weight: 600 });
    K.text(ctx, '메인 상태', 6, L.yM + MROW / 2, { size: 11, color: C.ink2, weight: 600 });
    for (const [t, hit] of live.vbl) {
      if (t < t0) continue;
      const x = X(t);
      if (hit) K.dot(ctx, x, L.yV, 3.5, C.good, C.paper);
      else { ctx.fillStyle = C.bad; ctx.fillRect(x - 4, L.yV - 4, 8, 8); }
    }
    // 메인 스레드 상태 띠
    ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, h); ctx.clip();
    for (const [a, b, s] of live.mseg) {
      if (b < t0) continue;
      const xa = X(a), xb = X(b);
      ctx.fillStyle = s === 'run' ? K.alpha(C.s1, 0.35) : C.bad;
      K.rr(ctx, xa, L.yM + 3, Math.max(1, xb - xa), MROW - 6, 3); ctx.fill();
      if (s === 'wait' && xb - xa > 30) K.text(ctx, '대기', (xa + xb) / 2, L.yM + MROW / 2, { size: 10, weight: 700, align: 'center', color: '#fff' });
    }
    // 코어 줄
    for (let c = 0; c < P.cores; c++) {
      const y = L.yC + c * rh;
      ctx.fillStyle = C.sunk; ctx.fillRect(x0, y + 1, x1 - x0, rh - 2);
      for (const [a, b, th] of live.segs[c]) {
        if (b < t0) continue;
        const xa = X(a), xb = X(b), bw = Math.max(1, xb - xa - 1);
        ctx.fillStyle = th.game ? C[SER[th.kind]] : stripes(ctx);
        K.rr(ctx, xa, y + 2, bw, rh - 4, 3); ctx.fill();
        const lab = th.game ? NAME[th.kind] : th.label;
        if (rh >= 17 && bw > lab.length * 11 + 8) K.text(ctx, lab, xa + bw / 2, y + rh / 2, { size: 10, weight: 600, align: 'center', color: th.game ? '#fff' : C.ink2 });
      }
    }
    ctx.restore();
    for (let c = 0; c < P.cores; c++) K.text(ctx, `코어 ${c + 1}`, 6, L.yC + c * rh + rh / 2, { size: 11, color: C.muted });
    const yb = L.yC + P.cores * rh + 14;
    K.text(ctx, `${L.WIN}ms 전`, x0, yb, { size: 10.5, color: C.muted });
    K.text(ctx, w < 520 ? '지금' : '지금 (20배 느리게 재생)', x1, yb, { size: 10.5, color: C.muted, align: 'right' });
    const mid = (x0 + x1) / 2;
    K.dot(ctx, mid - (w < 520 ? 44 : 78), yb, 3, C.good, C.paper);
    K.text(ctx, w < 520 ? '제때' : '제때 새 프레임', mid - (w < 520 ? 38 : 72), yb, { size: 10.5, color: C.ink2 });
    ctx.fillStyle = C.bad; ctx.fillRect(mid + 6, yb - 3.5, 7, 7);
    K.text(ctx, w < 520 ? '놓침' : '놓침(이전 프레임 반복)', mid + 17, yb, { size: 10.5, color: C.ink2 });
    // 지금 코어를 기다리며 줄 선 스레드
    const yq = L.yC + P.cores * rh + AXIS + QROW / 2 - 2;
    K.text(ctx, '대기열', 6, yq, { size: 11, color: C.ink2, weight: 600 });
    const q = live.queue;
    if (!q.length) K.text(ctx, w < 520 ? '비어 있음' : '비어 있음: 코어를 기다리는 스레드가 없습니다', LW, yq, { size: 11, color: C.muted });
    let cx = LW;
    const cw = w < 520 ? 50 : 62;
    for (let i = 0; i < q.length; i++) {
      const th = q[i];
      if (cx + cw > w - 8) { K.text(ctx, `+${q.length - i}`, cx + 2, yq, { size: 11, color: C.ink2, weight: 600 }); break; }
      ctx.fillStyle = th.game ? C[SER[th.kind]] : stripes(ctx);
      K.rr(ctx, cx, yq - 10, cw - 4, 20, 4); ctx.fill();
      K.text(ctx, th.game ? NAME[th.kind] : th.label, cx + (cw - 4) / 2, yq, { size: 10.5, weight: 600, align: 'center', color: th.kind === 'audio' ? '#1b1b1b' : th.game ? '#fff' : C.ink });
      cx += cw;
    }
  }

  K.hover(cv, (x, y) => {
    const L = layout();
    if (x < LW) return null;
    const t = L.t0 + ((x - LW) / (cv.w - LW - 8)) * L.WIN;
    if (y < L.yM) {
      const v = live.vbl.find(q => Math.abs(q[0] - t) < 4);
      return v ? (v[1] ? '<b>제때</b>: 이 순간 새 프레임이 화면에 나갔습니다.' : '<b>놓침</b>: 새 프레임이 준비되지 않아 이전 프레임을 한 번 더 보여 줬습니다.') : null;
    }
    if (y < L.yC) {
      const s = live.mseg.find(q => q[0] <= t && q[1] >= t);
      if (!s) return '메인 스레드가 다음 프레임까지 잠자는 중';
      return s[2] === 'run' ? `메인 스레드 실행 중 (${K.ms(s[1] - s[0])})` : `메인 스레드가 코어를 기다리는 중 <b>${K.ms(s[1] - s[0])}</b>`;
    }
    const c = Math.floor((y - L.yC) / L.rh);
    if (c < 0 || c >= P.cores) return null;
    const s = live.segs[c].find(q => q[0] <= t && q[1] >= t);
    if (!s) return `코어 ${c + 1}: 쉬는 중`;
    const th = s[2];
    return `코어 ${c + 1}: <b>${th.game ? '게임 ' + NAME[th.kind] : th.label}</b><br>이어서 ${K.ms(s[1] - s[0])} 실행`;
  });

  /* ---------- 해설 ---------- */
  function explain(sp) {
    const s = ST, bgOn = P.av || P.upd || P.obs || P.web, need = P.W / sp;
    const miss = K.pct(s.miss, 1), got = K.pct(s.got);
    if (P.timer && s.miss > 0.04) {
      return `${K.flag(s.miss > 0.15 ? 'bad' : 'warn')}CPU는 한가합니다(사용률 ${K.pct(s.util)}). 그런데 게임이 16.7ms 뒤에 깨어나도록 예약하고 잠들어도 윈도우 기본 타이머는 15.6ms 단위로만 깨웁니다. 어떤 프레임은 늦게 시작하고 어떤 프레임은 곧바로 이어 시작해 프레임 간격이 들쭉날쭉합니다. 화면 갱신의 <b>${miss}</b>를 놓쳐 <b>뚝뚝 끊김</b>으로 보입니다. 게임이 타이머를 1ms로 바꾸면 사라집니다.`;
    }
    if (need > VB * 0.98 && s.miss > 0.02) {
      const why = P.power === 'heat'
        ? ' 폰은 몇 분만 게임해도 뜨거워져 스스로 속도를 낮춥니다(발열 스로틀링). 처음엔 멀쩡하다가 점점 뚝뚝 끊기는 이유입니다.'
        : ' 노트북 절전 모드는 전기를 아끼려고 CPU를 느리게 돌립니다. 전원을 꽂고 고성능으로 바꾸면 돌아옵니다.';
      return `${K.flag('bad')}CPU 속도가 <b>${K.pct(sp)}</b>로 떨어져 ${K.n(P.W, 1)}ms짜리 계산에 <b>${K.ms(need)}</b>가 걸립니다. 16.7ms 안에 못 끝내 화면 갱신의 <b>${miss}</b>를 놓칩니다(<b>뚝뚝 끊김</b>).${why}`;
    }
    if (bgOn && s.got < 0.9) {
      return `${K.flag(s.miss > 0.05 || s.got < 0.7 ? 'bad' : 'warn')}게임 스레드가 코어를 얻으려고 대기열에서 기다립니다. 다른 프로그램도 코어를 5ms씩 번갈아 쓰니, 게임이 원할 때 바로 CPU를 받은 비율이 <b>${got}</b>뿐입니다. 메인 스레드는 한 프레임마다 평균 <b>${K.ms(s.mainWait)}</b> 기다리고, 화면 갱신의 <b>${miss}</b>를 놓칩니다(<b>뚝뚝 끊김</b>). 네트워크 스레드도 패킷을 평균 <b>${K.ms(s.netWait)}</b> 늦게 읽습니다. 이 정도는 보간 버퍼가 가려 주지만, 기다림이 수십 ms로 길어지면 다른 캐릭터 움직임이 뭉쳤다 풀립니다(<b>몰아치기</b>). 회선과 서버는 멀쩡합니다.`;
    }
    if (bgOn && P.prio) return `${K.flag('good')}게임 스레드가 대기열에 들어오면 다른 프로그램을 먼저 내리므로 게임은 거의 기다리지 않습니다(바로 받은 비율 ${got}). 대신 백신·방송 같은 프로그램이 그만큼 느려집니다.`;
    if (P.power === 'heat' && sp < 0.97) return need > VB
      ? `${K.flag('warn')}폰이 뜨거워지며 CPU 속도가 <b>${K.pct(sp)}</b>까지 내려왔습니다. 계산이 ${K.ms(need)}로 16.7ms를 막 넘어, 화면 갱신을 가끔 놓치기 시작했습니다(${miss}). 더 뜨거워지면 <b>뚝뚝 끊김</b>이 뚜렷해집니다.`
      : `${K.flag('warn')}폰이 뜨거워지며 CPU 속도가 <b>${K.pct(sp)}</b>까지 내려왔습니다. 지금은 계산이 ${K.ms(need)}라 버티지만, 16.7ms를 넘는 순간부터 <b>뚝뚝 끊김</b>이 시작됩니다.`;
    if (bgOn) return `${K.flag('good')}다른 프로그램이 돌고 있지만 코어 ${P.cores}개가 넉넉해 게임 스레드는 거의 기다리지 않습니다(바로 받은 비율 ${got}, 전체 사용률 ${K.pct(s.util)}).`;
    return `${K.flag('good')}게임 스레드가 코어를 기다리지 않고 바로 돕니다. 계산 ${K.ms(need)} + 렌더 4ms가 제시간에 끝나 화면이 바뀔 때마다 새 프레임이 나갑니다.`;
  }

  K.loop(root, dt => {
    live.run(dt * RATE);
    live.trim(140);
    const sp = speedNow();
    if (P.power === 'heat' && Math.abs(sp - statSpeed) > 0.02) shadow();
    draw();
    const s = ST;
    stGot.set(K.n(s.got * 100), s.got >= 0.95 ? 'good' : s.got >= 0.8 ? 'warn' : 'bad');
    stMiss.set(K.n(s.miss * 100, 1), s.miss < 0.02 ? 'good' : s.miss < 0.1 ? 'warn' : 'bad');
    stNet.set(K.ms(s.netWait), s.netWait < 5 ? 'good' : s.netWait < 20 ? 'warn' : 'bad');
    stUtil.set(K.n(s.util * 100), s.util < 0.7 ? 'good' : s.util < 0.9 ? 'warn' : 'bad');
    stSpd.set(K.n(sp * 100), sp >= 0.95 ? 'good' : sp >= 0.7 ? 'warn' : 'bad');
    F.say(explain(sp));
  });
});
