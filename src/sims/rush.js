/* 서버 OS: 점검 직후 로그인 폭주. listen backlog(접속 대기 줄), 파일 디스크립터 한도, 재시도 방식, 대기열(순번표).
   사람 수를 묶음으로 계산하는 모형(100ms 단위, 0~300초). 조건이 바뀌면 300초를 통째로 다시 계산하고 재생 위치만 움직인다. */
K.register('rush', function (root) {
  const TR = I18N.tr('sim-rush');   // 이 실험 묶음의 사전을 먼저 본다(i18n.js)
  const F = K.frame(root, {
    kicker: TR`레이어 7 · 서버 OS`,
    title: TR`점검 끝! 10만 명이 동시에 접속 버튼을 누르면`,
    lead: TR`서버 운영체제는 새 접속을 받아 줄 때까지 “접속 대기열(listen backlog)”에 넣어 둡니다. 대기열이 꽉 차면 리눅스는 새 접속 요청을 응답 없이 버리고, 클라이언트는 기다리다 다시 시도합니다. 다시 시도하는 방식에 따라 같은 서버가 1분 만에 모두를 받기도 하고, 몇 분 동안 헛돌기도 합니다. 이 실험의 서버는 로그인을 처리할 수 있는 만큼만 접속을 받아 갑니다.`,
    tries: [
      TR`<b>재시도 폭풍</b>을 누르고 파란 선(시도)과 주황 선(성공)의 간격을 보세요. 시도는 초당 10만 번을 넘는데 성공은 처리 능력의 절반도 안 됩니다.`,
      TR`같은 상황에서 <b>재시도 방식</b>을 “지수 백오프 + 무작위”로 바꿔 보세요. 시도가 확 줄고 서버 효율이 올라갑니다.`,
      TR`<b>대기열 도입</b>: 모두 대기 순번을 받고 기다립니다. 성공 선이 처리 능력에 딱 붙어 가장 빨리 끝납니다.`,
      TR`<b>fd 한도 1024 (설정 실수)</b>: 처리 능력은 남는데 994명 이후로 아무도 못 들어옵니다.`,
    ],
    layout: 'side',
  });

  const DT = 0.1, NS = 3000, KM = 16, TEND = 300, SPEED = 10;   // 실제 1초 = 10초
  const P = { n: 100000, rate: 1500, backlog: 4096, fd: 1000000, retry: 'fixed', queue: false };
  const fdMax = () => P.fd - 30;   // 로그 파일·DB 연결 등 서버가 이미 쓰는 번호

  /* ---------- 모형 ---------- */
  function simulate() {
    const N = P.n, mu = P.rate, bl = P.backlog, FM = fdMax();
    const diff = Array.from({ length: KM }, () => new Float64Array(NS + 2));
    const cur = new Float64Array(KM), Bk = new Float64Array(KM);
    const R = { att: new Float32Array(NS), ok: new Float32Array(NS), logged: new Float32Array(NS), failCum: new Float64Array(NS), B: new Float32Array(NS), doneT: Infinity, fdT: Infinity, maxAtt: 0 };
    const spread = (k, t0, t1, n) => {   // n명을 t0~t1초에 고르게 흩뿌려 다시 시도하게 한다
      const b0 = Math.round(t0 / DT);
      if (b0 >= NS || n <= 0) return;
      const b1 = Math.max(b0 + 1, Math.round(t1 / DT)), r = n / (b1 - b0);
      diff[k][b0] += r; diff[k][Math.min(b1, NS + 1)] -= r;
    };
    const retry = (k, t, n) => {
      const k2 = Math.min(k + 1, KM - 1);
      if (P.retry === 'now') spread(k2, t + 0.5, t + 1.5, n);
      else if (P.retry === 'fixed') spread(k2, t + 4.75, t + 5.25, n);
      else { const b = Math.min(60, Math.pow(2, k2)); spread(k2, t + 0.5 * b, t + 1.5 * b, n); }
    };
    spread(0, 0, 2, N);   // 점검 종료 직후 2초 안에 모두 누른다
    let B = 0, logged = 0, failCum = 0, fr = 0, waiting = 0;
    for (let s = 0; s < NS; s++) {
      const t = s * DT;
      let A = 0;
      for (let k = 0; k < KM; k++) { cur[k] += diff[k][s]; if (cur[k] < 1e-9) cur[k] = 0; A += cur[k]; }
      let ok = 0, fails = 0;
      if (P.queue) {                   // 순번표: 가벼운 요청 한 번, 실패 없음, 처리 능력만큼 정확히 입장
        waiting += A;
        ok = Math.min(waiting, P.rate * DT, Math.max(0, FM - logged));
        waiting -= ok; logged += ok; B = waiting;
      } else {
        const space = Math.max(0, bl - B), frac = A > 0 ? Math.min(A, space) / A : 0;
        for (let k = 0; k < KM; k++) {
          const a = cur[k];
          Bk[k] += a * frac; B += a * frac;
          const rej = a * (1 - frac);
          if (rej > 0) { retry(k, t, rej); fails += rej; }
        }
        const eff = 1 - 0.7 * (1 - Math.exp(-fr / 30000));   // 거절·재시도 처리에 힘을 빼앗김 (최대 70%)
        const served = Math.min(B, mu * DT * eff);
        ok = Math.min(served, Math.max(0, FM - logged));
        const bad = served - ok;          // fd가 모자라 accept 실패 → 다시 시도
        if (B > 0) for (let k = 0; k < KM; k++) {
          const sk = served * (Bk[k] / B);
          Bk[k] -= sk;
          if (bad > 0) retry(k, t, sk * (bad / served));
        }
        B -= served; if (B < 1e-9) { B = 0; Bk.fill(0); }
        fails += bad; logged += ok;
        fr += (fails / DT - fr) * DT;   // 초당 실패의 1초 평균
      }
      failCum += fails;
      R.att[s] = A / DT; R.ok[s] = ok / DT; R.logged[s] = logged; R.failCum[s] = failCum; R.B[s] = B;
      R.maxAtt = Math.max(R.maxAtt, A / DT);
      if (R.doneT === Infinity && logged >= N - 0.5) R.doneT = t + DT;
      if (R.fdT === Infinity && logged >= FM - 0.5 && logged < N - 0.5) R.fdT = t + DT;
    }
    return R;
  }

  /* ---------- 화면 ---------- */
  const fmtB = v => (K.lang !== 'ko' ? (v >= 1000 ? K.compact(v) : K.n(v)) : v >= 10000 ? K.n(v / 10000, v % 10000 && v < 1e5 ? 1 : 0) + TR`만` : v >= 1000 ? K.n(v / 1000, v % 1000 ? 1 : 0) + TR`천` : K.n(v));
  const bar = K.el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:center' });
  F.stage.append(bar);
  const bPlay = K.button(bar, { label: TR`일시정지`, kind: 'small', onClick: () => { if (t >= TEND) t = 0; playing = !playing; syncBtn(); } });
  K.button(bar, { label: TR`처음부터`, kind: 'small', onClick: () => { t = 0; playing = true; syncBtn(); } });
  const clock = K.el('span', { class: 'num', style: 'font-size:13px;color:var(--ink-2)' });
  bar.append(clock, K.el('span', { style: 'font-size:12px;color:var(--muted)', text: TR`10배 빠르게 재생` }));

  const acv = K.canvas(F.stage, {
    height: w => K.clamp(w * 0.36, 200, 250),
    caption: TR`초당 접속 시도와 성공 <span style="font-weight:400;color:var(--muted)">(눈금 한 칸 = 10배)</span>`,
    right: TR`<span class="legend"><span><i style="background:var(--s1)"></i>시도</span><span><i style="background:var(--s2)"></i>성공</span></span>`,
  });
  const bcv = K.canvas(F.stage, {
    height: w => K.clamp(w * 0.22, 130, 160),
    caption: TR`누적 접속 인원`,
    right: TR`<span class="legend"><span><i style="background:var(--s3)"></i>들어간 사람</span></span>`,
  });
  const mBox = K.el('div', { class: 'ctl' });
  const mName = K.el('span'), mOut = K.el('output');
  mBox.append(K.el('div', { class: 'lab' }, mName, mOut));
  F.stage.append(mBox);
  const meter = K.meter(mBox);
  const mNote = K.el('small', { class: 'ctl-hint' });
  mBox.append(mNote);

  /* ---------- 조작부 ---------- */
  const g1 = K.group(F.controls, TR`사람과 서버`);
  const sN = K.slider(g1, { label: TR`대기 인원`, min: 1000, max: 200000, step: 1000, value: P.n, unit: TR`명`, onInput: v => { P.n = v; recalc(); } });
  const sRate = K.slider(g1, { label: TR`로그인 처리 속도`, min: 100, max: 5000, step: 100, value: P.rate, unit: TR`명/초`, onInput: v => { P.rate = v; recalc(); }, hint: TR`인증 DB 조회·캐릭터 불러오기까지 포함한 처리 능력. 이 실험은 서버가 이 속도로만 접속을 받아 간다고 가정합니다. 접속은 바로 받고 로그인만 따로 대기열에 넣는 서버라면 커널 대기열 대신 서버 안의 대기열이 찹니다.` });
  const g2 = K.group(F.controls, TR`서버 OS 설정`);
  const cBl = K.choice(g2, { label: TR`listen backlog (접속 대기열)`, value: P.backlog, options: [[128, '128'], [4096, '4,096'], [65535, '65,535']], onChange: v => { P.backlog = +v; recalc(); }, hint: TR`리눅스 커널 상한(somaxconn) 기본값은 5.4부터 4,096, 그 전에는 128입니다. 서버 코드가 listen에 더 작은 값을 주면 그 값이 한도입니다.` });
  const cFd = K.choice(g2, { label: TR`동시 접속 한도 (파일 디스크립터)`, value: P.fd, options: [[1024, '1,024'], [65535, '65,535'], [1000000, TR`100만`]], onChange: v => { P.fd = +v; recalc(); }, hint: TR`접속 하나에 파일 디스크립터 하나. 1,024는 리눅스에서 서비스 설정을 안 바꾸면 흔히 걸리는 값입니다.` });
  const g3 = K.group(F.controls, TR`게임 클라이언트`);
  const cRe = K.choice(g3, { label: TR`재시도 방식`, value: P.retry, options: [['now', TR`즉시 재시도`], ['fixed', TR`5초마다`], ['backoff', TR`지수 백오프 + 무작위`]], onChange: v => { P.retry = v; recalc(); }, hint: TR`백오프: 실패할 때마다 2초, 4초, 8초… 최대 60초에 무작위를 섞어 기다립니다. 이 실험은 거절 처리에 드는 서버 부담을 크게 잡았습니다. 실제 효율 저하는 반쯤 처리한 로그인이 클라이언트 타임아웃으로 버려지는 헛일에서 주로 옵니다.` });
  const tQ = K.toggle(g3, { label: TR`접속 대기열 시스템 (대기 순번 발급)`, value: P.queue, onChange: v => { P.queue = v; recalc(); }, hint: TR`누르면 바로 대기 순번을 받고, 서버가 처리할 수 있는 만큼만 차례로 들여보냅니다.` });

  const stIn = K.stat(F.stats, { label: TR`접속 완료 인원`, unit: TR`명` });
  const stDone = K.stat(F.stats, { label: TR`전원 접속까지` });
  const stFail = K.stat(F.stats, { label: TR`누적 실패`, unit: TR`회`, sub: TR`버려진 접속 요청` });
  const stAtt = K.stat(F.stats, { label: TR`지금 초당 시도`, unit: TR`번` });
  const stEff = K.stat(F.stats, { label: TR`서버 효율`, sub: TR`처리 능력 대비 실제 입장` });

  let R = simulate(), t = 60, playing = true;
  function recalc() { R = simulate(); }
  function syncBtn() { bPlay.textContent = playing ? TR`일시정지` : t >= TEND ? TR`다시 재생` : TR`재생`; }

  function setAll(o) {
    sN.set(o.n, false); P.n = o.n;
    sRate.set(o.rate || 1500, false); P.rate = o.rate || 1500;
    cBl.set(o.backlog || 4096, false); P.backlog = o.backlog || 4096;
    cFd.set(o.fd || 1000000, false); P.fd = o.fd || 1000000;
    cRe.set(o.retry || 'fixed', false); P.retry = o.retry || 'fixed';
    tQ.set(!!o.queue, false); P.queue = !!o.queue;
    recalc(); t = 0; playing = true; syncBtn();
  }
  K.presets(F, [
    { label: TR`소규모 점검 (1만 명)`, apply: () => setAll({ n: 10000 }) },
    { label: TR`대형 업데이트 (10만 명)`, apply: () => setAll({ n: 100000 }) },
    { label: TR`재시도 폭풍`, apply: () => setAll({ n: 150000, retry: 'now' }) },
    { label: TR`대기열 도입`, apply: () => setAll({ n: 150000, retry: 'now', queue: true }) },
    { label: TR`fd 한도 1024 (설정 실수)`, apply: () => setAll({ n: 100000, fd: 1024 }) },
    { label: TR`backlog 128 (옛 기본값)`, apply: () => setAll({ n: 100000, backlog: 128 }) },
  ]);

  const idx = () => K.clamp(Math.floor(t / DT) - 1, 0, NS - 1);
  const avg = (arr, s, n) => { let a = 0, c = 0; for (let i = Math.max(0, s - n + 1); i <= s; i++) { a += arr[i]; c++; } return c ? a / c : 0; };
  const abox = co => ({ x: 46, y: 24, w: co.w - 58, h: co.h - 24 - 26 });
  const xT = [0, 60, 120, 180, 240, 300], xF = v => (v ? v / 60 + TR`분` : '0');

  function playhead(ctx, sc, box, label) {
    const x = Math.round(sc.x(Math.min(t, TEND))) + 0.5;
    ctx.save(); ctx.strokeStyle = K.C.ink2; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, box.y - 4); ctx.lineTo(x, box.y + box.h); ctx.stroke(); ctx.restore();
    if (label) {
      ctx.font = K.font(10.5, 600);
      const tw = ctx.measureText(label).width;
      K.text(ctx, label, K.clamp(x, box.x + tw / 2, box.x + box.w - tw / 2), box.y - 12, { size: 10.5, weight: 600, align: 'center', color: K.C.ink });
    }
  }

  function drawA() {
    const { ctx } = acv, C = K.C;
    ctx.clearRect(0, 0, acv.w, acv.h);
    const box = abox(acv);
    const top = Math.max(4, Math.ceil(Math.log10(Math.max(R.maxAtt, P.rate * 2, 10))));
    const ticks = []; for (let e = 1; e <= top; e++) ticks.push(e);
    const sc = K.plot(ctx, box, { x0: 0, x1: TEND, y0: 1, y1: top, yTicks: ticks, yFmt: e => fmtB(Math.pow(10, e)), xTicks: xT, xFmt: xF });
    const L = v => Math.log10(Math.max(10, v));
    K.hline(ctx, sc, L(P.rate), { color: C.muted, dash: [4, 3] });
    ctx.font = K.font(10.5, 600);
    const lab = TR`처리 능력 ${K.n(P.rate)}/초`, tw = ctx.measureText(lab).width;
    ctx.fillStyle = K.alpha(C.paper, 0.9); ctx.fillRect(box.x + box.w - tw - 8, sc.y(L(P.rate)) - 15, tw + 6, 13);
    K.text(ctx, lab, box.x + box.w - 4, sc.y(L(P.rate)) - 8, { size: 10.5, weight: 600, align: 'right', color: C.ink2 });
    const end = idx(), a = [], o = [];
    for (let s = 0; s <= end; s += 5) {   // 0.5초 평균으로 그린다
      let sa = 0, so = 0, c = 0;
      for (let i = s; i < Math.min(s + 5, end + 1); i++) { sa += R.att[i]; so += R.ok[i]; c++; }
      a.push([(s + c / 2) * DT, sa / c]); o.push([(s + c / 2) * DT, so / c]);
    }
    // 0(=시도 없음)인 구간은 선을 끊는다
    const draw = (pts, col) => {
      let seg = [];
      pts.forEach((p, i) => {
        if (p[1] >= 10) seg.push([p[0], L(p[1])]);
        if ((p[1] < 10 || i === pts.length - 1) && seg.length) { K.line(ctx, sc, seg.length > 1 ? seg : [seg[0], [seg[0][0] + 0.25, seg[0][1]]], col); seg = []; }
      });
    };
    draw(a, C.s1); draw(o, C.s2);
    [[a, C.s1], [o, C.s2]].forEach(([pts, col]) => {
      const p = pts[pts.length - 1];
      if (p && p[1] >= 10) K.dot(ctx, sc.x(p[0]), sc.y(L(p[1])), 3.5, col);
    });
    playhead(ctx, sc, box, TR`${Math.floor(Math.min(t, TEND))}초`);
    K.text(ctx, TR`번/초`, box.x - 6, box.y - 12, { size: 10.5, color: C.muted, align: 'right' });
  }

  function drawB() {
    const { ctx } = bcv, C = K.C;
    ctx.clearRect(0, 0, bcv.w, bcv.h);
    const box = abox(bcv), N = P.n;
    const sc = K.plot(ctx, box, { x0: 0, x1: TEND, y0: 0, y1: N * 1.12, yTicks: [0, N / 2, N], yFmt: fmtB, xTicks: xT, xFmt: xF });
    K.hline(ctx, sc, N, { color: C.muted, dash: [4, 3] });
    K.text(ctx, TR`전체 ${K.n(N)}명`, box.x + 4, sc.y(N) - 8, { size: 10.5, weight: 600, color: C.ink2 });
    if (fdMax() < N) {
      K.hline(ctx, sc, fdMax(), { color: C.bad, dash: [4, 3] });
      K.text(ctx, TR`동시 접속 한도 ${K.n(fdMax())}명`, box.x + box.w - 4, sc.y(fdMax()) - 8, { size: 10.5, weight: 600, align: 'right', color: C.badInk });
    }
    const end = idx(), pts = [];
    for (let s = 0; s <= end; s += 5) pts.push([s * DT, R.logged[s]]);
    pts.push([(end + 1) * DT, R.logged[end]]);
    K.area(ctx, sc, pts, C.s3, 0.12);
    K.line(ctx, sc, pts, C.s3);
    K.dot(ctx, sc.x((end + 1) * DT), sc.y(R.logged[end]), 3.5, C.s3);
    playhead(ctx, sc, box, null);
  }

  const hoverStep = (co, x) => {
    const box = abox(co);
    const tt = ((x - box.x) / box.w) * TEND;
    if (tt < 0 || tt > TEND) return -1;
    return Math.min(Math.floor(tt / DT), idx());
  };
  K.hover(acv, x => {
    const s = hoverStep(acv, x);
    if (s < 0) return null;
    return TR`<b>${K.n(s * DT, 1)}초</b><br>시도 ${K.n(avg(R.att, s, 5))}번/초<br>성공 ${K.n(avg(R.ok, s, 5))}명/초<br>${P.queue ? TR`순번 대기` : TR`접속 대기열(backlog)`} ${K.n(R.B[s])}`;
  });
  K.hover(bcv, x => {
    const s = hoverStep(bcv, x);
    if (s < 0) return null;
    return TR`<b>${K.n(s * DT, 1)}초</b><br>들어간 사람 ${K.n(R.logged[s])}명<br>누적 실패 ${K.n(R.failCum[s])}회`;
  });

  /* ---------- 해설 ---------- */
  function explain(s) {
    const N = P.n, rem = N - R.logged[s], att = avg(R.att, s, 50), okps = avg(R.ok, s, 50), good = okps / P.rate;
    const minT = N / P.rate;
    if (rem < 0.5) {
      const d = R.doneT;
      return TR`${K.flag(d <= minT * 1.3 + 3 ? 'good' : 'warn')}전원 접속 완료까지 <b>${K.n(d)}초</b> 걸렸습니다. 처리 속도로만 보면 최소 ${K.n(minT)}초면 됩니다.${P.queue ? TR` 대기열 덕분에 최소 시간과 거의 같습니다.` : TR` 그동안 접속 요청이 모두 <b>${K.n(R.failCum[s])}번</b> 버려지고 다시 시도됐습니다.`}`;
    }
    if (R.fdT <= s * DT + DT) return TR`${K.flag('bad')}동시 접속 한도(파일 디스크립터 ${K.n(P.fd)}개)에 걸렸습니다. 서버는 접속 하나마다 파일 디스크립터를 하나씩 씁니다. ${K.n(fdMax())}명이 들어온 뒤로는 서버가 새 접속을 받을 때마다 “Too many open files” 오류가 나서, 나머지 <b>${K.n(rem)}명</b>은 <b>접속 불가·무한 로딩</b>입니다. 처리 능력은 남아도는데 아무도 못 들어오는, 설정 한 줄(ulimit) 실수로 생기는 장애입니다.`;
    if (P.queue) return TR`${K.flag('good')}모두 대기 순번을 받고 기다립니다. 서버는 초당 ${K.n(P.rate)}명씩 정확히 들여보내 헛일이 없습니다(효율 ${K.pct(Math.min(1, good))}). 플레이어 화면에는 “대기 순번 · 예상 시간”이 보입니다. 기다리긴 해도 “서버에 연결할 수 없습니다”를 수십 번 보는 일은 없습니다.`;
    if (s * DT < 3) return TR`${K.flag('warn')}점검이 끝나자마자 ${K.n(N)}명이 거의 동시에 접속 버튼을 눌렀습니다. 서버는 1초에 ${K.n(P.rate)}명을 받는데, 첫 2초 동안 초당 <b>${K.n(N / 2)}번</b>이 몰립니다. 접속 대기열(backlog, ${K.n(P.backlog)}개)이 순식간에 찹니다.`;
    const tail = TR`플레이어는 로딩이 끝나지 않거나 “서버에 연결할 수 없습니다”를 보고 다시 누릅니다(<b>접속 불가·무한 로딩</b>).`;
    if (P.retry === 'backoff') return TR`${K.flag(good < 0.5 ? 'bad' : 'warn')}실패한 사람은 2초, 4초, 8초… 점점 더 오래, 저마다 다른 시각에 다시 시도합니다. 시도가 초당 ${K.n(att)}번으로 줄어 서버가 거절 처리에 쓰는 자원이 줄었습니다. 대신 운 나쁜 사람은 수십 초를 기다립니다. 남은 사람 ${K.n(rem)}명.`;
    if (att > P.rate * 4 || good < 0.6) {
      const how = P.retry === 'now'
        ? TR`버려진 요청이 1초 만에 다시 들어오면서 시도가 눈덩이처럼 불어나고, 서버는 몰려드는 요청과 클라이언트 타임아웃으로 끊긴 로그인을 반쯤 처리하는 헛일에 자원을 빼앗겨`
        : TR`5초마다 모두 한꺼번에 다시 누르니 시도가 주기적으로 몰렸다 빠집니다. 몰릴 때는 버려지고, 그 사이엔 대기열이 비어 서버가 쉬고`;
      return TR`${K.flag('bad')}초당 <b>${K.n(att)}번</b> 접속을 시도하지만 접속 대기열(backlog)은 ${K.n(P.backlog)}개뿐이라 대부분 바로 버려집니다. ${how}, 실제로는 초당 <b>${K.n(okps)}명</b>(처리 능력의 ${K.pct(Math.min(1, good))})만 들어갑니다. ${tail}`;
    }
    return TR`${K.flag('warn')}접속 진행 중: 초당 ${K.n(okps)}명씩 들어가고 <b>${K.n(rem)}명</b>이 남았습니다. 초당 시도 ${K.n(att)}번.`;
  }

  function show() {
    const s = idx(), N = P.n, rem = N - R.logged[s], tt = Math.min(t, TEND);
    clock.textContent = TR`지금 ${K.n(Math.floor(tt))}초 / ${TEND}초`;
    stIn.set(K.n(R.logged[s]), rem < 0.5 ? 'good' : R.fdT <= tt ? 'bad' : 'warn', TR`전체의 ${K.pct(R.logged[s] / N)}`);
    if (R.doneT <= tt) stDone.set(K.n(R.doneT) + TR`초`, R.doneT <= (N / P.rate) * 1.3 + 3 ? 'good' : R.doneT < 150 ? 'warn' : 'bad', TR`최소 ${K.n(N / P.rate)}초`);
    else if (R.fdT <= tt) stDone.set(TR`불가능`, 'bad', TR`동시 접속 한도에 막힘`);
    else if (tt >= TEND) stDone.set(TR`300초 넘음`, 'bad', TR`최소 ${K.n(N / P.rate)}초`);
    else stDone.set(TR`진행 중`, null, TR`최소 ${K.n(N / P.rate)}초`);
    const fc = R.failCum[s];
    stFail.set(fmtB(Math.round(fc)), fc < N * 0.5 ? 'good' : fc < N * 5 ? 'warn' : 'bad');
    const att = avg(R.att, s, 10);
    stAtt.set(fmtB(Math.round(att)), att <= P.rate * 1.2 ? 'good' : att < P.rate * 10 ? 'warn' : 'bad');
    if (rem < 0.5) stEff.set('—', null, TR`모두 접속함`);
    else { const g = Math.min(1, avg(R.ok, s, 50) / P.rate); stEff.set(K.n(g * 100) + '<i>%</i>', g > 0.9 ? 'good' : g > 0.6 ? 'warn' : 'bad', TR`처리 능력 대비 실제 입장`); }
    if (P.queue) {
      const me = Math.round(N * 0.6), ahead = Math.max(0, me - R.logged[s]);
      mName.textContent = TR`순번 대기열`; mOut.textContent = TR`${K.n(R.B[s])}명 대기`;
      meter.set(R.B[s] / N, null);
      mNote.textContent = ahead > 0.5 ? TR`예: 내 순번 ${K.n(me)}번 → 앞에 ${K.n(ahead)}명 · 예상 대기 ${K.n(Math.ceil(ahead / P.rate))}초` : TR`예: 내 순번 ${K.n(me)}번 → 입장 완료`;
    } else {
      const f = R.B[s] / P.backlog;
      mName.textContent = TR`접속 대기열(listen backlog)`; mOut.textContent = `${K.n(R.B[s])} / ${K.n(P.backlog)}`;
      meter.set(f, f > 0.98 ? 'bad' : f > 0.7 ? 'warn' : null);
      mNote.textContent = f > 0.98 ? TR`꽉 참: 지금 들어온 접속 요청은 버려집니다.` : TR`운영체제가 서버 프로그램에 넘겨주기 전까지 접속을 넣어 두는 대기열입니다.`;
    }
    F.say(explain(s));
  }

  syncBtn();
  K.loop(root, dt => {
    if (playing) {
      t += (dt / 1000) * SPEED;
      if (t >= TEND) { t = TEND; playing = false; syncBtn(); }
    }
    drawA(); drawB(); show();
  });
});
