/* 서버 틱 예산: 한 박자(1/Hz) 안에 입력·시야·AI·전송 준비를 끝내야 한다.
   넘치면 고정 스텝 서버는 늦게 끝난 만큼 세계 시간이 느리게 흐르고(슬로우모션),
   한 번 크게 막히면 밀린 틱을 연달아 돌려 따라잡는다(멈춤 → 몰아치기). */
K.register('tick', function (root) {
  const TR = I18N.tr('sim-tick');   // 이 실험 묶음의 사전을 먼저 본다(i18n.js)
  const F = K.frame(root, {
    kicker: TR`레이어 9 · 서버 게임 프로세스`,
    title: TR`한 틱 안에 할 일이 넘치면 서버의 틱이 밀린다`,
    lead: TR`게임 서버는 “틱”이라는 일정한 주기마다 게임 세계를 한 번씩 갱신합니다. 20Hz 서버라면 1초에 20번, 틱 간격 50ms 안에 모든 플레이어의 입력, 시야, 몬스터, 보낼 데이터를 끝내야 합니다. 사람을 늘려 보세요. 할 일이 틱 간격을 넘치는 순간 그 서버의 게임 세계 전체가 느려집니다. 이 실험의 서버는 틱마다 게임 시간을 정해진 만큼 진행하는 방식입니다. 흐른 시간만큼 한 번에 움직이는 서버라면 느려지지는 않지만 뚝뚝 끊기고 순간이동합니다.`,
    tries: [
      TR`<b>같은 지역 플레이어 수</b>를 60 → 800으로 천천히 올려 보세요. 막대가 <b>틱 예산</b> 선을 넘는 순간 아래 게임 시간이 느려지고 점들이 굼떠집니다.`,
      TR`<b>월드 보스 (800명, 전원 비교)</b>를 누른 뒤 <b>시야 계산</b>을 “격자로 나눠 근처만”으로 바꿔 보세요. 가장 큰 비중인 시야 계산이 절반 아래로 줄고 틱 전체가 예산 안으로 들어옵니다. 모두 보스 곁에 몰려 있어 격자로도 0이 되지는 않습니다.`,
      TR`<b>공성전</b>은 격자와 4스레드를 다 써도 넘칩니다. <b>사람들 분포</b>를 “흩어짐”으로 바꾸면 무엇이 달라지는지 비교해 보세요.`,
      TR`<b>게임 스레드에서 DB 직접 호출</b>을 켜 보세요. 가끔 솟는 막대만큼 게임이 멈칫하고(뚝뚝 끊김, DB가 더 오래 막히면 멈춤), 그 뒤 틱 간격이 촘촘해지는 구간이 몰아치기를 만듭니다.`,
    ],
    layout: 'stack',
  });

  const P = { N: 60, M: 200, aoi: 'brute', hz: 20, dist: 'spread', thr: 1, db: false, log: false, path: false };
  const rnd = K.rng(11);
  const SEG = [
    { name: TR`입력 처리`, c: 's1' },
    { name: TR`시야 계산`, c: 's2' },
    { name: TR`몬스터 AI`, c: 's3' },
    { name: TR`전송 준비`, c: 's4' },
    { name: TR`막힘(DB·로그)`, c: 's5' },
    { name: TR`기본`, c: 's6' },
  ];
  const VIS_CAP = 150;
  const budget = () => 1000 / P.hz;

  K.addStyle('tick', `
    .sim[data-sim="tick"] .cv-cap { flex-wrap: wrap; row-gap: 4px; }
    .sim[data-sim="tick"] .layout-stack .ctl-group { border-top: 0; padding-top: 0; }
    .sim[data-sim="tick"] .tk-sw { display:inline-block; width:8px; height:8px; border-radius:2px; margin-right:5px; vertical-align:0; }
  `);

  const legend = '<span class="legend">' + SEG.map(s => `<span><i class="box" style="background:var(--${s.c})"></i>${s.name}</span>`).join('') + '</span>';
  const bcv = K.canvas(F.stage, { height: w => K.clamp(w * 0.42, 210, 290), caption: TR`최근 틱마다 걸린 시간과 그 안의 일`, right: legend });
  const ccv = K.canvas(F.stage, { height: w => (w < 480 ? 150 : 140), caption: TR`게임 시간`, right: TR`점 = 이 서버의 플레이어` });

  /* ---------- 조작부 ---------- */
  const g1 = K.group(F.controls, TR`사람과 몬스터`);
  const sN = K.slider(g1, { label: TR`같은 지역 플레이어 수`, min: 1, max: 2000, step: 1, value: P.N, fmt: v => K.n(v) + TR` 명`, onInput: v => { P.N = v; } });
  const sM = K.slider(g1, { label: TR`몬스터 수`, min: 0, max: 2000, step: 10, value: P.M, fmt: v => K.n(v) + TR` 마리`, onInput: v => { P.M = v; } });
  const cDist = K.choice(g1, {
    label: TR`사람들 분포`, value: P.dist, options: [['spread', TR`흩어짐`], ['crowd', TR`한 곳에 몰림`]],
    onChange: v => { P.dist = v; }, hint: TR`몰림 = 월드 보스 한가운데, 공성전 성문 앞`,
  });
  const g2 = K.group(F.controls, TR`서버 설계`);
  const cHz = K.choice(g2, {
    label: TR`틱 목표`, value: P.hz, options: [[10, '10Hz'], [20, '20Hz'], [30, '30Hz'], [60, '60Hz']],
    onChange: v => { P.hz = +v; }, hint: TR`MMO 필드는 흔히 10~20Hz(EVE Online은 1Hz), 대전·액션 게임은 30~60Hz(VALORANT는 128Hz)`,
  });
  const cAoi = K.choice(g2, {
    label: TR`시야(AOI) 계산`, value: P.aoi, options: [['brute', TR`전원끼리 비교 (N²)`], ['grid', TR`격자로 나눠 근처만`]],
    onChange: v => { P.aoi = v; }, hint: TR`AOI(관심 영역) = 누가 누구를 볼 수 있는지 매 틱 따지는 일`,
  });
  const cThr = K.choice(g2, {
    label: TR`스레드 구조`, value: P.thr, options: [[1, TR`단일 스레드`], [4, TR`지역 나눠 4스레드`]],
    onChange: v => { P.thr = +v; },
  });
  const g3 = K.group(F.controls, TR`흔한 실수`);
  const tDb = K.toggle(g3, { label: TR`게임 스레드에서 DB 직접 호출`, value: P.db, onChange: v => { P.db = v; }, hint: TR`틱의 15%에서 DB 응답을 5~200ms 기다림` });
  const tLog = K.toggle(g3, { label: TR`로그를 디스크에 바로 쓰기`, value: P.log, onChange: v => { P.log = v; }, hint: TR`로그마다 확실한 저장(fsync)을 기다리거나, OS의 쓰기 버퍼(페이지 캐시)가 찼을 때를 가정. 틱의 5%에서 20~100ms 막힘. 보통 쓰기는 OS 메모리에 먼저 담겨 곧바로 끝납니다` });
  const tPath = K.toggle(g3, { label: TR`몬스터 길찾기 몰림`, value: P.path, onChange: v => { P.path = v; }, hint: TR`모든 몬스터가 동시에 플레이어를 쫓으며 길을 다시 계산` });

  function applyAll(o) {
    sN.set(o.N); sM.set(o.M); cDist.set(o.dist); cHz.set(o.hz); cAoi.set(o.aoi); cThr.set(o.thr);
    tDb.set(!!o.db); tLog.set(!!o.log); tPath.set(!!o.path);
  }
  K.presets(F, [
    { label: TR`평일 필드 (60명)`, apply: () => applyAll({ N: 60, M: 200, dist: 'spread', hz: 20, aoi: 'brute', thr: 1 }) },
    { label: TR`월드 보스 (800명, 전원 비교)`, apply: () => applyAll({ N: 800, M: 150, dist: 'crowd', hz: 20, aoi: 'brute', thr: 1 }) },
    { label: TR`월드 보스 + 격자 AOI`, apply: () => applyAll({ N: 800, M: 150, dist: 'crowd', hz: 20, aoi: 'grid', thr: 1 }) },
    { label: TR`공성전 (1,500명 한 곳)`, apply: () => applyAll({ N: 1500, M: 300, dist: 'crowd', hz: 20, aoi: 'grid', thr: 4 }) },
    { label: TR`게임 스레드 DB 호출`, apply: () => applyAll({ N: 200, M: 300, dist: 'spread', hz: 20, aoi: 'grid', thr: 1, db: true }) },
  ]);

  const stCost = K.stat(F.stats, { label: TR`틱 처리 시간`, sub: TR`평균 / 최대` });
  const stRate = K.stat(F.stats, { label: TR`실제 틱레이트`, unit: TR`회/초` });
  const stSpeed = K.stat(F.stats, { label: TR`게임 속도` });
  const stUpd = K.stat(F.stats, { label: TR`위치 업데이트`, unit: TR`건/초` });
  const stBw = K.stat(F.stats, { label: TR`필요 대역폭`, unit: 'Mbps', sub: TR`서버 회선 1Gbps 가정` });

  /* ---------- 비용 모델 ---------- */
  // 한 틱에 드는 시간(ms). 평균값(noise 없이)과 한 번 뽑은 값 둘 다 쓴다.
  function baseParts() {
    const N = P.N, M = P.M;
    const input = N * 0.004;                                        // 명당 4µs: 패킷 해석·이동 검증·스킬 처리
    const near = P.dist === 'crowd' ? 400 : 60;                     // 격자일 때 실제로 비교하는 이웃 수
    const aoi = P.aoi === 'brute' ? N * N * 0.0001 : N * Math.min(N, near) * 0.00008; // 쌍당 약 100ns
    const ai = M * 0.005 + (P.path ? M * 0.02 : 0);                 // 몬스터당 5µs, 길찾기 +20µs
    const ser = N * Math.min(N, VIS_CAP) * 0.00005;                 // 보이는 대상마다 변화분을 담는 일
    let par = [input, aoi, ai, ser];
    if (P.thr === 4 && P.dist === 'spread') par = par.map(v => v / 3.2); // 4스레드: 동기화 비용 때문에 3.2배
    return par;
  }
  function sampleTick() {
    const par = baseParts();
    const nz = () => 1 + (rnd() * 2 - 1) * 0.1;
    let block = 0;
    if (P.db && rnd() < 0.15) block += 5 + rnd() * 195;
    if (P.log && rnd() < 0.05) block += 20 + rnd() * 80;
    return [par[0] * nz(), par[1] * nz(), par[2] * nz(), par[3] * nz(), block, 1 * nz()];
  }
  const visible = () => Math.max(0, Math.min(P.N - 1, VIS_CAP));

  /* ---------- 서버 루프 (고정 스텝) ---------- */
  let rt = 0;            // 실제 시간
  let slot = 0;          // 다음 틱이 원래 시작해야 할 시각
  let nextStart = 0;
  let cur = null;        // 진행 중인 틱
  let wtEnd = 0;         // 마지막으로 끝난 틱까지의 세계 시간
  let lastEnd = 0;
  let seq = 0;
  const ticks = [];      // {id, parts, cost, late}
  const ends = [];       // [실제 끝난 시각, late]
  const disp = [];       // [실제 시각, 화면에 보이는 세계 시간]

  function step(dt) {
    const end = rt + dt;
    for (let guard = 0; guard < 400; guard++) {
      if (!cur) {
        if (nextStart > end) break;
        const parts = sampleTick();
        const cost = parts.reduce((a, b) => a + b, 0);
        cur = { start: nextStart, end: nextStart + cost, parts, cost };
      }
      if (cur.end > end) break;
      const B = budget();
      const late = cur.cost > B;
      ticks.push({ id: ++seq, parts: cur.parts, cost: cur.cost, late, B });
      if (ticks.length > 120) ticks.shift();
      ends.push([cur.end, late]);
      wtEnd += B; lastEnd = cur.end;
      slot += B;
      // 1초 넘게 밀리면 따라잡기를 포기하고 그만큼의 세계 시간을 버린다
      if (cur.end - slot > 1000) slot = cur.end - 1000;
      nextStart = Math.max(slot, cur.end);
      cur = null;
    }
    rt = end;
    while (ends.length && ends[0][0] < rt - 2500) ends.shift();
    // 클라이언트는 받은 상태 사이를 최대 한 틱만큼 보간해서 보여 준다
    const shown = wtEnd + K.clamp(rt - lastEnd, 0, budget());
    disp.push([rt, shown]);
    while (disp.length > 2 && disp[0][0] < rt - 2600) disp.shift();
  }
  function worldSpeed(win) {
    const now = disp[disp.length - 1];
    let old = disp[0];
    for (const d of disp) { if (d[0] >= now[0] - win) { old = d; break; } }
    const span = now[0] - old[0];
    return span > 0 ? (now[1] - old[1]) / span : 1;
  }
  function tickRate() {
    const w = ends.filter(e => e[0] > rt - 2000);
    if (w.length < 2) return w.length / 2;
    return ((w.length - 1) / (w[w.length - 1][0] - w[0][0])) * 1000;
  }

  // 첫 화면이 비지 않도록 3초쯤 미리 돌린다
  for (let i = 0; i < 180; i++) step(17);

  /* ---------- 그리기: 틱 막대 ---------- */
  const LADDER = [[20, 5], [30, 10], [40, 10], [60, 20], [80, 20], [100, 25], [150, 50], [200, 50], [300, 100], [400, 100], [600, 200]];
  let yTop = 80;
  function topRound(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h));
    ctx.beginPath();
    ctx.moveTo(x, y + h); ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r); ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h);
    ctx.closePath();
  }
  function barGeom() {
    const { w, h } = bcv;
    const nShow = w < 520 ? 36 : 60;
    const box = { x: 44, y: 26, w: w - 56, h: h - 48 };
    return { nShow, box, slotW: box.w / nShow };
  }
  function drawBars() {
    const { ctx, w, h } = bcv;
    const C = K.C;
    ctx.clearRect(0, 0, w, h);
    const B = budget();
    const { nShow, box, slotW } = barGeom();
    const list = ticks.slice(-nShow);
    const maxC = list.reduce((m, t) => Math.max(m, t.cost), 0);
    const need = Math.max(B * 1.5, maxC * 1.06);
    const row = LADDER.find(r => r[0] >= need) || LADDER[LADDER.length - 1];
    yTop = row[0];
    const yt = [];
    for (let v = 0; v <= yTop + 1e-9; v += row[1]) yt.push(v);
    const sc = K.plot(ctx, box, {
      x0: 0, x1: nShow, y0: 0, y1: yTop, yTicks: yt, yFmt: v => v + '',
      yTitle: TR`틱 1번 처리 시간 (ms)`,
    });
    K.text(ctx, TR`← 과거 틱`, box.x, box.y + box.h + 13, { size: 10.5, color: C.muted });
    K.text(ctx, TR`최근 틱 →`, box.x + box.w, box.y + box.h + 13, { size: 10.5, color: C.muted, align: 'right' });
    const bw = Math.max(2, Math.min(24, slotW - 2));
    const cols = SEG.map(s => C[s.c]);
    const off = nShow - list.length;
    list.forEach((t, i) => {
      const x = box.x + (off + i) * slotW + (slotW - bw) / 2;
      const top = Math.min(t.cost, yTop);
      const yT = sc.y(top), yB = sc.y(0);
      ctx.save();
      topRound(ctx, x, yT, bw, yB - yT, 4);
      ctx.clip();
      let acc = 0;
      const vis = t.parts.map((v, k) => [v, k]).filter(p => p[0] > 0);
      vis.forEach(([v, k], j) => {
        const y0 = sc.y(acc), y1 = sc.y(Math.min(acc + v, yTop));
        acc += v;
        let hh = y0 - y1;
        if (hh <= 0) return;
        // 조각 사이 2px 표면색 틈 (아주 얇은 조각은 틈을 두지 않는다)
        const gap = j < vis.length - 1 && hh > 3.5 ? 2 : 0;
        ctx.fillStyle = cols[k];
        ctx.fillRect(x, y1 + gap, bw, hh - gap);
      });
      ctx.restore();
      if (t.cost > yTop) {
        ctx.fillStyle = C.ink;
        ctx.beginPath(); ctx.moveTo(x + bw / 2, box.y - 9); ctx.lineTo(x + bw / 2 + 4, box.y - 3); ctx.lineTo(x + bw / 2 - 4, box.y - 3); ctx.closePath(); ctx.fill();
      }
    });
    // 틱 예산 선
    const yb = Math.round(sc.y(B)) + 0.5;
    ctx.save();
    ctx.strokeStyle = C.bad; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(box.x, yb); ctx.lineTo(box.x + box.w, yb); ctx.stroke();
    ctx.restore();
    const lab = TR`틱 예산 ${K.n(B, B % 1 ? 1 : 0)}ms`;
    ctx.font = K.font(11, 600);
    const lw = ctx.measureText(lab).width + 10;
    ctx.fillStyle = K.alpha(C.paper, 0.92);
    ctx.fillRect(box.x + box.w - lw, yb - 17, lw, 15);
    K.text(ctx, lab, box.x + box.w - 5, yb - 9, { align: 'right', size: 11, weight: 600, color: C.badInk });
  }
  K.hover(bcv, x => {
    const { nShow, box, slotW } = barGeom();
    const list = ticks.slice(-nShow);
    const i = Math.floor((x - box.x) / slotW) - (nShow - list.length);
    const t = list[i];
    if (!t) return null;
    const rows = SEG.map((s, k) => t.parts[k] > 0.005 || k === 4 ? `<span class="tk-sw" style="background:var(--${s.c})"></span>${s.name} <b>${K.ms(t.parts[k])}</b>` : null).filter(Boolean);
    const over = t.cost > t.B ? TR`예산 ${K.n(t.B, 0)}ms를 <b>${K.ms(t.cost - t.B)}</b> 넘김` : TR`예산 안 (${K.pct(t.cost / t.B)} 사용)`;
    return TR`틱 #${t.id} · 합계 <b>${K.ms(t.cost)}</b><br>${over}<br>${rows.join('<br>')}`;
  });

  /* ---------- 그리기: 세계 시계 ---------- */
  const players = [];
  const prng = K.rng(5);
  for (let i = 0; i < 14; i++) players.push({ x0: prng(), v: 0.07 + prng() * 0.06, y: prng() });
  function drawClock(sp, rate) {
    const { ctx, w, h } = ccv;
    const C = K.C;
    ctx.clearRect(0, 0, w, h);
    const pad = 14, narrow = w < 480;
    const st = sp > 0.93 && sp < 1.08 ? 'good' : sp > 0.7 && sp < 1.6 ? 'warn' : 'bad';
    // 1줄: 숫자
    K.text(ctx, TR`게임 속도`, pad, 16, { size: 11.5, color: C.muted });
    K.text(ctx, '×' + K.n(sp, 2), pad + 62, 16, { size: 16, weight: 700, mono: true, color: C.ink });
    K.text(ctx, narrow ? TR`틱 ${K.n(rate, 1)}/${P.hz}회·초` : TR`실제 틱 ${K.n(rate, 1)}회/초 · 목표 ${P.hz}회/초`, w - pad, 16, { align: 'right', size: 11.5, color: C.ink2 });
    // 2줄: 게이지 ×0 ~ ×2
    const gx = pad, gw = w - pad * 2, gy = 40;
    ctx.fillStyle = C.sunk; K.rr(ctx, gx, gy - 4, gw, 8, 4); ctx.fill();
    const fx = gx + gw * K.clamp(sp / 2, 0, 1);
    ctx.fillStyle = C[st]; K.rr(ctx, gx, gy - 4, Math.max(8, fx - gx), 8, 4); ctx.fill();
    ctx.fillStyle = C.ink2;
    for (const v of [0, 0.5, 1, 1.5, 2]) ctx.fillRect(Math.round(gx + (gw * v) / 2) - 0.5, gy + 6, 1, v === 1 ? 7 : 4);
    K.text(ctx, TR`멈춤 ×0`, gx, gy + 20, { size: 10.5, color: C.muted });
    K.text(ctx, TR`정상 ×1`, gx + gw / 2, gy + 20, { size: 10.5, color: C.ink2, align: 'center', weight: 600 });
    K.text(ctx, narrow ? '×2' : TR`몰아치기 ×2`, gx + gw, gy + 20, { size: 10.5, color: C.muted, align: 'right' });
    K.dot(ctx, fx, gy, 5, C.ink, C.paper);
    // 3줄: 틱 박자 (최근 2초)
    const lx = narrow ? 60 : 64, bx = lx, bw = w - pad - lx;
    const by = 84;
    K.text(ctx, TR`틱 간격`, pad, by, { size: 11, color: C.muted });
    ctx.fillStyle = C.grid; ctx.fillRect(bx, by, bw, 1);
    for (const [t, late] of ends) {
      const age = rt - t;
      if (age > 2000) continue;
      const x = bx + bw * (1 - age / 2000);
      ctx.fillStyle = late ? C.bad : C.ink2;
      ctx.fillRect(Math.round(x) - 1, by - (late ? 7 : 5), 2, late ? 14 : 10);
    }
    K.text(ctx, TR`2초 전`, bx, by + 13, { size: 9.5, color: C.muted });
    K.text(ctx, TR`지금`, bx + bw, by + 13, { size: 9.5, color: C.muted, align: 'right' });
    // 4줄: 세계 시간에 맞춰 움직이는 플레이어
    const py = 108, ph = h - py - 6;
    K.text(ctx, TR`플레이어`, pad, py + ph / 2, { size: 11, color: C.muted });
    ctx.fillStyle = C.sunk; K.rr(ctx, bx, py, bw, ph, 6); ctx.fill();
    const wt = disp[disp.length - 1][1] / 1000;
    for (const p of players) {
      const f = (p.x0 + p.v * wt) % 1;
      K.dot(ctx, bx + 8 + f * (bw - 16), py + 6 + p.y * (ph - 12), 3.5, C.ink2, C.sunk);
    }
  }

  /* ---------- 해설 ---------- */
  const kn = v => (K.lang !== 'ko' ? (v >= 1e4 ? K.compact(v) : K.n(v)) : v >= 1e8 ? K.n(v / 1e8, 1) + TR`억` : v >= 1e5 ? K.n(v / 1e4, 0) + TR`만` : v >= 1e4 ? K.n(v / 1e4, 1) + TR`만` : K.n(v));
  function explain(avg, mx, avgParts, sp, rate, bw) {
    const B = budget();
    const hz = P.hz;
    const dom = [0, 1, 2, 3, 4].reduce((a, b) => (avgParts[b] > avgParts[a] ? b : a), 0);
    const recent = ticks.slice(-40);   // 수치 타일의 '최대'와 같은 구간
    const blockMax = recent.reduce((m, t) => Math.max(m, t.parts[4]), 0);
    const scope = verb => P.thr === 1
      ? TR`게임 스레드가 하나라서 이 서버(채널)에 있는 <b>모든 플레이어</b>가 함께 ${verb}.`
      : P.dist === 'crowd'
        ? TR`지역을 4스레드로 나눴지만 모두 한 지역에 몰려 있어 한 스레드가 일을 다 떠안고 나머지 셋은 쉽니다. 그 지역에 있는 <b>모든 플레이어</b>가 ${verb}.`
        : TR`지역을 4스레드로 나눠 맡았습니다. 지역마다 따로 틱을 도는 구조라면 한 지역이 막혀도 <b>그 지역 플레이어만</b> ${verb}. 네 스레드가 매 틱 서로를 기다렸다 함께 넘어가는 구조라면 가장 느린 지역이 모두의 틱 간격을 정합니다.`;
    const domTip = [
      TR`사람 수만큼 입력을 처리해야 합니다.`,
      P.aoi === 'brute'
        ? TR`${K.n(P.N)}명이 서로를 모두 비교하면 매 틱 약 <b>${kn(P.N * P.N)} 번</b> 비교합니다. 격자로 나누면 가까운 셀(격자 한 칸)만 봅니다.`
        : P.dist === 'crowd' ? TR`격자로 나눠도 모두 같은 셀 근처에 몰려 있으면 비교할 이웃이 크게 줄지 않습니다.` : TR`격자 덕분에 가까운 이웃만 비교합니다.`,
      P.path ? TR`몬스터 ${K.n(P.M)}마리가 동시에 길을 다시 찾습니다.` : TR`몬스터 ${K.n(P.M)}마리의 AI를 매 틱 돌립니다.`,
      TR`한 사람에게 최대 ${VIS_CAP}명의 움직임을 담아 보내야 해서, 사람이 늘면 제곱에 가깝게 늘어납니다.`,
      TR`게임 스레드가 DB·디스크를 기다리는 동안 아무 일도 못 합니다.`,
    ][dom];
    let msg;
    if (avg > B * 1.03) {
      msg = TR`${K.flag('bad')} 틱 한 번에 평균 <b>${K.ms(avg)}</b>가 걸려 예산 ${K.n(B, 0)}ms를 넘습니다. 가장 큰 비중은 <b>${SEG[dom].name} ${K.ms(avgParts[dom])}</b>. ${domTip} 이 서버는 틱마다 게임 시간을 ${K.n(B, B % 1 ? 1 : 0)}ms씩만 진행하므로, 틱이 늦어지면 게임 시간이 실제보다 느리게 흐릅니다(게임 속도 <b>×${K.n(sp, 2)}</b>, 초당 ${K.n(rate, 1)}틱). 플레이어는 몬스터와 다른 캐릭터가 <b>슬로우모션</b>처럼 움직이고 스킬을 눌러도 조금 늦게 반응하는 <b>입력 지연</b>을 느낍니다. ${scope(TR`느려집니다`)}`;
    } else if (blockMax > B * 0.8) {
      const tickMax = mx;
      const stop = tickMax >= 500
        ? TR`게임이 완전히 멈췄다가(<b>멈춤</b>)`
        : TR`게임이 잠깐 멈칫했다가(<b>뚝뚝 끊김</b>, 0.5초를 넘기면 <b>멈춤</b>)`;
      msg = TR`${K.flag('bad')} 대부분의 틱은 금방 끝나지만 가끔 ${P.db ? TR`DB 응답을` : TR`디스크에 확실히 쓰이기(fsync)를`} 기다리느라 한 틱이 <b>${K.ms(tickMax)}</b>까지 늘어납니다. 그동안 ${stop} 밀린 틱을 쉬지 않고 연달아 돌려 따라잡습니다. 이때 캐릭터와 몬스터가 빨리 감기처럼 움직입니다(<b>몰아치기</b>). 틱 간격 줄에서 틱 사이가 벌어졌다가 촘촘해지는 곳이 그 순간입니다. 흐른 시간만큼 한 번에 움직이는 서버라면 틱을 따라잡지 않고 한 번에 크게 움직여 <b>순간이동</b>으로 보입니다. DB·로그 같은 느린 일은 게임 스레드 밖(따로 도는 스레드)에 맡겨야 합니다. ${scope(TR`멈칫했다 몰아칩니다`)}`;
    } else if (avg > B * 0.7 || mx > B) {
      msg = TR`${K.flag('warn')} 예산 ${K.n(B, 0)}ms 중 평균 <b>${K.pct(avg / B)}</b>를 씁니다. 가장 큰 비중은 <b>${SEG[dom].name}</b>. ${domTip} 지금은 버티지만 여유가 적어서 사람이 조금만 더 몰리면 틱이 넘치고 <b>슬로우모션</b>이 시작됩니다.`;
    } else {
      msg = TR`${K.flag('good')} 틱은 서버가 게임 세계를 한 번 갱신하는 단위입니다. ${hz}Hz면 1초에 ${hz}번, 틱 간격 <b>${K.n(B, B % 1 ? 1 : 0)}ms</b> 안에 할 일을 끝내야 합니다(틱 예산). 지금은 평균 <b>${K.ms(avg)}</b>만 쓰고 나머지 시간은 쉽니다. 게임 시간은 제 속도로 흐르고 점들도 고르게 움직입니다.`;
    }
    if (bw > 1000) msg += TR` 게다가 매 틱 보내야 할 위치 정보가 <b>${K.n(bw / 1000, 1)}Gbps</b>로, 이 실험이 가정한 서버 회선 1Gbps를 넘깁니다. 전송이 밀려 패킷이 늦게 가거나 버려집니다(입력 지연·순간이동).`;
    return msg;
  }

  K.loop(root, dt => {
    step(dt);
    const B = budget();
    const sp = worldSpeed(600);
    const rate = tickRate();
    drawBars();
    drawClock(sp, rate);
    const rec = ticks.slice(-Math.max(8, Math.min(40, Math.round(P.hz * 1.5))));
    const avg = rec.reduce((a, t) => a + t.cost, 0) / (rec.length || 1);
    const mx = ticks.slice(-40).reduce((m, t) => Math.max(m, t.cost), 0);   // 가끔 솟는 틱을 놓치지 않게 조금 넓게 본다
    const avgParts = SEG.map((s, k) => rec.reduce((a, t) => a + t.parts[k], 0) / (rec.length || 1));
    const spS = worldSpeed(2000);
    stCost.set(`${K.n(avg, avg < 10 ? 1 : 0)} / ${K.n(mx, mx < 10 ? 1 : 0)}<i>ms</i>`, avg > B || mx > B * 1.5 ? 'bad' : avg > B * 0.7 || mx > B ? 'warn' : 'good');
    stRate.set(K.n(rate, 1), rate < P.hz * 0.9 ? 'bad' : rate > P.hz * 1.15 ? 'warn' : 'good', TR`목표 ${P.hz}회/초`);
    stSpeed.set('×' + K.n(spS, 2), spS < 0.8 ? 'bad' : spS < 0.95 || spS > 1.1 ? 'warn' : 'good', spS < 0.97 ? TR`1초가 ` + K.n(1 / Math.max(spS, 0.01), 1) + TR`초처럼` : spS > 1.05 ? TR`밀린 틱 따라잡는 중` : TR`실제 시간과 같음`);
    const vis = visible();
    const upd = P.N * vis * P.hz;
    const bw = (P.N * P.hz * (28 + 40 * vis) * 8) / 1e6;
    stUpd.set(kn(upd), upd > 3e6 ? 'bad' : upd > 5e5 ? 'warn' : 'good', TR`${K.n(P.N)}명 × ${vis}명 × ${P.hz}Hz`);
    stBw.set(K.n(bw, bw < 10 ? 1 : 0), bw > 1000 ? 'bad' : bw > 300 ? 'warn' : 'good');
    F.say(explain(avg, mx, avgParts, spS, rate, bw));
  });
});
