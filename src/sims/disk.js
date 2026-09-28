/* 디스크 I/O: 창고(디스크)의 문이 좁아지면, 짐 넣기를 직접 기다리는 게임 스레드도 같이 멈춘다.
   위 두 차트는 10분을 10배속으로 흐르게 하고, 아래 띠는 실제 속도로 게임 서버의 최근 1초를 보여 준다. */
K.register('disk', function (root) {
  const F = K.frame(root, {
    kicker: '레이어 11 · 디스크',
    title: '디스크가 밀리면 게임 스레드도 같이 멈춘다',
    lead: '디스크는 서버의 창고입니다. 로그 한 줄, 캐릭터 저장 한 번이 모두 창고에 짐을 넣는 일입니다. IOPS는 창고 문 개수(1초에 드나들 수 있는 짐 수)이고, 클라우드 디스크의 버스트 크레딧은 잠깐 빨리 달릴 수 있는 체력입니다. 게임 스레드가 짐 넣기를 직접 기다리면, 창고 앞이 막히는 순간 게임도 같이 멈춥니다.',
    tries: [
      '<b>오래된 HDD + 동기 로그</b>를 눌러 보세요. 1초에 쓰기 120건뿐인데도 틱이 50ms를 넘겨 서버 시간이 느리게 흐릅니다(슬로우모션).',
      '이어서 <b>비동기로 해결</b>을 눌러 보세요. 같은 HDD인데 틱은 바로 정상이 되고, 대신 저장이 조금 밀립니다.',
      '<b>클라우드 디스크 크레딧 소진</b>을 누르고 20초쯤 지켜보세요. 크레딧이 바닥나는 순간 처리 능력이 1.6만에서 3천으로 뚝 떨어집니다.',
      '<b>새벽 백업과 겹침</b>에서 <b>백업 작업 동시 실행</b>을 껐다 켜 보세요. 매일 같은 시각에 렉이 난다면 이런 예약 작업이 겹친 경우가 많습니다.',
      '1분마다 짧게 솟는 봉우리는 <b>정기 저장</b>입니다. 동기 방식일 때 이 순간마다 게임이 뚝뚝 끊기는지 아래 띠에서 보세요.',
    ],
  });

  // 디스크 사양 (쓰기 한 건 기준, 현실에서 흔한 값)
  const DISKS = {
    hdd: { iops: 150, svc: 6, desc: '1초에 약 150건, 한 건 6ms. 바늘이 움직여야 해서 느립니다.' },
    sata: { iops: 40000, svc: 0.1, desc: '1초에 약 4만 건, 한 건 0.1ms.' },
    nvme: { iops: 400000, svc: 0.02, desc: '1초에 약 40만 건, 한 건 0.02ms.' },
    cloud: { iops: 3000, burst: 16000, svc: 0.5, desc: '평소 3천 건. 크레딧이 남은 동안만 1.6만 건까지 달립니다. 네트워크 너머라 한 건 0.5ms.' },
  };
  const TICK = 50;          // 20Hz 틱 예산
  const COMPUTE = 15;       // 틱 하나의 게임 계산 시간
  const WIN = 600;          // 10분 창 (시뮬레이션 초)
  const SPEED = 10;         // 현실 1초 = 시뮬레이션 10초
  const CREDIT_MAX = 900000;// I/O 크레딧 통 크기: 9천 IOPS로 달리면 약 3분에 바닥
  const REC_KB = 2;         // 쓰기 한 건이 메모리에서 차지하는 크기
  const P = { rate: 3000, disk: 'nvme', mode: 'async', fsync: false, backup: false };
  const rnd = K.rng(11);

  const LG = (c, t) => `<span><i style="background:var(--${c})"></i>${t}</span>`;
  const BX = (bg, t) => `<span><i class="box" style="background:${bg}"></i>${t}</span>`;
  const cvA = K.canvas(F.stage, {
    height: w => K.clamp(w * 0.46, 240, 300),
    caption: '10분 흐름: 쓰기 수요와 디스크 처리 능력 (10배속)',
    right: `<span class="legend">${LG('s1', '쓰기 수요')}${LG('s2', '처리 능력')}${BX('var(--s3)', '버스트 크레딧')}</span>`,
  });
  const cvB = K.canvas(F.stage, {
    height: w => K.clamp(w * 0.3, 170, 210),
    caption: '쓰기 한 건 지연과 틱이 막힌 시간',
    right: `<span class="legend">${LG('s1', '쓰기 1건')}${LG('s2', '틱 막힘')}<span><i style="background:none;height:0;border-top:2px dashed var(--muted)"></i>틱 예산 50ms</span></span>`,
  });
  const cvC = K.canvas(F.stage, {
    height: 104,
    caption: '지금 이 순간: 게임 서버의 최근 1초 (실제 속도)',
    right: `<span class="legend">${BX('var(--muted)', '게임 계산')}${BX('var(--s2)', '디스크 기다림')}${BX('var(--bad)', '50ms 넘김')}</span>`,
  });

  // ---------- 조작부 ----------
  const LOGMAX = Math.log(2000);
  const nice2 = v => { const m = Math.pow(10, Math.max(0, Math.floor(Math.log10(v)) - 1)); return Math.round(v / m) * m; };
  const posToRate = p => nice2(10 * Math.exp((LOGMAX * p) / 1000));
  const rateToPos = r => Math.round((1000 * Math.log(r / 10)) / LOGMAX);

  const g1 = K.group(F.controls, '쓰기 요청');
  const sRate = K.slider(g1, {
    label: '초당 쓰기 요청', min: 0, max: 1000, step: 1, value: rateToPos(P.rate),
    fmt: p => K.n(posToRate(p)) + ' 건/초', onInput: p => { P.rate = posToRate(p); },
    hint: '로그 한 줄, 캐릭터 저장 한 번이 쓰기 1건입니다. 1분마다 정기 저장 때 5초쯤 2배 가까이 몰립니다.',
  });
  const g2 = K.group(F.controls, '디스크');
  const cDisk = K.choice(g2, {
    label: '디스크 종류', value: P.disk,
    options: [['hdd', 'HDD'], ['sata', 'SATA SSD'], ['nvme', 'NVMe SSD'], ['cloud', '클라우드 기본 볼륨']],
    onChange: v => { if (v === 'cloud' && P.disk !== 'cloud') credits = CREDIT_MAX; P.disk = v; syncHint(); },
    hint: DISKS[P.disk].desc,
  });
  const diskHint = cDisk.el.querySelector('.ctl-hint');
  const tFsync = K.toggle(g2, { label: 'fsync 매번 (확실히 저장)', value: P.fsync, onChange: v => { P.fsync = v; }, hint: '디스크에 진짜로 새겨질 때까지 기다립니다. 쓰기 한 건이 4배 무거워집니다.' });
  const tBackup = K.toggle(g2, { label: '백업 작업 동시 실행', value: P.backup, onChange: v => { P.backup = v; }, hint: '백업이 디스크 처리 능력의 70%를 가져갑니다.' });
  const bRefill = K.button(g2, { label: '버스트 크레딧 다시 채우기', kind: 'small', onClick: () => { credits = CREDIT_MAX; } });
  const g3 = K.group(F.controls, '게임 서버');
  const cMode = K.choice(g3, {
    label: '쓰는 방식', value: P.mode,
    options: [['sync', '게임 스레드에서 직접 (동기)'], ['async', '별도 스레드로 넘김 (비동기)']],
    onChange: v => { P.mode = v; },
    hint: '동기: 쓰기가 끝날 때까지 게임이 기다립니다. 비동기: 쓰기를 줄에 맡기고 게임은 바로 다음 일을 합니다.',
  });
  function syncHint() {
    diskHint.textContent = DISKS[P.disk].desc;
    bRefill.disabled = P.disk !== 'cloud';
  }
  syncHint();

  // 프리셋은 기록을 지우고 새 상황으로 10분을 미리 돌린다.
  // 클라우드는 9분 동안 평소 부하(2천)로 달리다가 방금 이벤트로 8천이 몰린 순간에서 시작한다
  K.presets(F, [
    { label: '평소 (NVMe, 비동기)', apply() { set('nvme', 'async', 3000, false, false); } },
    { label: '오래된 HDD + 동기 로그', apply() { set('hdd', 'sync', 120, false, false); } },
    { label: '클라우드 디스크 크레딧 소진', apply() { set('cloud', 'async', 8000, false, false, 2000); } },
    { label: '새벽 백업과 겹침', apply() { set('sata', 'sync', 800, true, true); } },
    { label: '비동기로 해결', apply() { set('hdd', 'async', 120, false, false); } },
  ]);
  function set(disk, mode, rate, fsync, backup, lead) {
    cDisk.set(disk, false); cMode.set(mode, false); tFsync.set(fsync, false); tBackup.set(backup, false);
    Object.assign(P, { disk, mode, fsync, backup });
    syncHint();
    hist.length = 0; Q = 0; credits = CREDIT_MAX; cur.spd = 1;
    P.rate = lead || rate;
    prefill(lead ? WIN - 60 : WIN);
    P.rate = rate;
    sRate.set(rateToPos(rate), false);
  }

  const stL = K.stat(F.stats, { label: '디스크 지연' });
  const stQ = K.stat(F.stats, { label: '대기 중인 쓰기', unit: '건' });
  const stC = K.stat(F.stats, { label: '버스트 크레딧' });
  const stB = K.stat(F.stats, { label: '틱 막힘 시간', sub: '틱 예산 50ms 중' });
  const stS = K.stat(F.stats, { label: '저장 밀림', sub: '서버가 죽으면 잃는 시간' });

  // ---------- 모형 ----------
  let t = 0, credits = CREDIT_MAX, Q = 0, simAcc = 0, recAcc = 0;
  const cur = { lam: 0, dem: 0, cap: 1, capTot: 1, L: 0.02, blk: 0, spd: 1, behind: 0, pend: 0, mu: 1, used: 0, wave: false };
  const hist = [];

  function sub(h) {
    const D = DISKS[P.disk];
    const c = P.fsync ? 4 : 1, S = D.svc * c;
    const wave = t % 60 < 5; // 1분마다 정기 저장
    const lam = P.rate * (wave ? 1.8 : 1) * Math.max(0.4, 1 + 0.06 * K.gauss(rnd));
    // 클라우드: 크레딧이 남아 있는 만큼만 기본 속도 위로 달린다
    const capTot = D.burst ? Math.min(D.burst, D.iops + credits / h) : D.iops;
    const bk = P.backup ? 0.7 * capTot : 0;
    const mu = (capTot - bk) / c; // 게임이 1초에 넣을 수 있는 쓰기 수
    let L, blk = 0, spd = 1, issued, pend;
    if (P.mode === 'async') {
      const served = Math.min(Q + lam * h, mu * h);
      Q = Math.min(Q + lam * h - served, 5e7);
      issued = served / h;
      const rho = Math.min(0.95, (issued * c + bk) / capTot);
      const base = S / (1 - rho);
      L = base + (Q / mu) * 1000;
      pend = Q + (issued * base) / 1000;
    } else {
      // 틱마다 rate/20 건을 차례로 쓰고 그 지연만큼 멈춘다. 틱이 늘면 쓰기도 덜 나가므로 균형점을 찾는다
      let s = cur.spd || 1, Lx = S;
      for (let i = 0; i < 14; i++) {
        const rho = Math.min(0.95, (lam * s * c + bk) / capTot);
        Lx = S / (1 - rho);
        s = 0.5 * s + 0.5 * Math.min(1, TICK / (COMPUTE + (lam / 20) * Lx));
      }
      issued = lam * s;
      Q = Math.max(0, Q - Math.max(0, mu - issued) * h); // 비동기 때 밀린 쓰기는 남는 틈에 내려간다
      spd = s; L = Lx; blk = (lam / 20) * Lx;
      pend = Q + (issued * L) / 1000;
    }
    const used = Math.min(capTot, issued * c + bk);
    if (D.burst) credits = K.clamp(credits + (D.iops - used) * h, 0, CREDIT_MAX);
    Object.assign(cur, { lam, dem: lam * c, bk, cap: capTot - bk, capTot, L, blk, spd, behind: Q / mu, pend, mu, used, wave });
    t += h;
  }
  function record() {
    // 차트에는 디스크 전체 기준으로 싣는다: 수요 = 게임 쓰기 + 백업 몫, 능력 = 디스크 전체
    hist.push({ t, dem: cur.dem + cur.bk, game: cur.dem, bk: cur.bk, cap: cur.capTot, cr: DISKS[P.disk].burst ? credits / CREDIT_MAX : null, L: cur.L, blk: cur.blk, spd: cur.spd, behind: cur.behind });
    while (hist.length && hist[0].t < t - WIN) hist.shift();
  }
  function step(dtMs) {
    simAcc += (dtMs / 1000) * SPEED;
    while (simAcc >= 0.25) {
      simAcc -= 0.25; sub(0.25); recAcc += 0.25;
      if (recAcc >= 1) { recAcc -= 1; record(); }
    }
  }
  // 미리 10분을 돌려 차트를 채운다
  function prefill(sec) { for (let i = 0; i < sec * 4; i++) { sub(0.25); if (i % 4 === 3) record(); } recAcc = 0; }
  prefill(WIN);

  // '지금' 띠: 실제 속도로 틱을 하나씩 만든다
  let sNow = 0, nextTick = 0;
  const ticks = [];
  function poisson(m) { const L = Math.exp(-m); let k = 0, p = 1; do { k++; p *= rnd(); } while (p > L && k < 200); return k - 1; }
  function stepStrip(dt) {
    sNow += dt;
    for (let g = 0; nextTick <= sNow && g < 60; g++) {
      const wpt = cur.lam / 20;
      const n = Math.max(0, wpt > 30 ? wpt + Math.sqrt(wpt) * K.gauss(rnd) : poisson(wpt));
      const blk = P.mode === 'sync' ? n * cur.L * Math.exp(0.15 * K.gauss(rnd)) : 0;
      const comp = COMPUTE * (0.75 + 0.5 * rnd());
      ticks.push({ s: nextTick, comp, blk, dur: Math.max(TICK, comp + blk) });
      nextTick += Math.max(TICK, comp + blk);
    }
    while (ticks.length && ticks[0].s + ticks[0].dur < sNow - 1100) ticks.shift();
  }
  for (let i = 0; i < 70; i++) stepStrip(16);

  // ---------- 서식 ----------
  const trim = v => (Math.round(v * 10) / 10).toString();
  const kfmt = v => (v >= 10000 ? trim(v / 10000) + '만' : v >= 1000 ? trim(v / 1000) + '천' : K.n(v));
  function niceStep(v) { const p = Math.pow(10, Math.floor(Math.log10(v))); const m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
  function dur(s) {
    if (s < 10) return K.n(s, 1) + ' 초';
    if (s < 120) return K.n(s, 0) + ' 초';
    if (s < 3600) return K.n(Math.floor(s / 60)) + '분 ' + K.n(Math.round(s % 60)) + '초';
    return K.n(s / 3600, 1) + ' 시간';
  }
  const LAT = ['0.01', '0.1', '1', '10', '100', '1초', '10초'];
  const lg = v => Math.log10(K.clamp(v, 0.01, 10000));
  function segs(pts, ok) { const out = []; let cur = []; for (const p of pts) { if (ok(p)) cur.push(p); else if (cur.length) { out.push(cur); cur = []; } } if (cur.length) out.push(cur); return out; }
  const agoFmt = x1 => v => { const m = Math.round((x1 - v) / 60); return m === 0 ? '지금' : m + '분 전'; };

  // ---------- 그리기 ----------
  // 격자선 위에 올리는 안내 글: 바탕색 띠를 깔아 읽히게 한다
  function note(ctx, str, x, y, align) {
    ctx.font = K.font(11);
    const tw = ctx.measureText(str).width;
    const bx = align === 'center' ? x - tw / 2 : x;
    ctx.fillStyle = K.C.paper;
    ctx.fillRect(bx - 5, y - 8, tw + 10, 16);
    K.text(ctx, str, x, y, { align, size: 11, color: K.C.muted });
  }
  let boxA = null, boxB = null;
  function drawA() {
    const { ctx, w, h } = cvA;
    const C = K.C, narrow = w < 520;
    ctx.clearRect(0, 0, w, h);
    const L0 = narrow ? 44 : 54;
    const top = { x: L0, y: 24, w: w - L0 - 14, h: Math.round((h - 110) * 0.74) };
    const bot = { x: L0, y: top.y + top.h + 38, w: top.w, h: 0 };
    bot.h = h - bot.y - 24;
    boxA = top;
    const x0 = t - WIN, x1 = t;
    let dmax = 1, cmax = 1;
    for (const p of hist) { if (p.dem > dmax) dmax = p.dem; if (p.cap > cmax) cmax = p.cap; }
    let ymax = Math.max(dmax, cmax <= dmax * 3 ? cmax : 0) * 1.12;
    const st = niceStep(ymax / 4);
    ymax = Math.ceil(ymax / st) * st;
    const yT = []; for (let v = 0; v <= ymax + 1e-6; v += st) yT.push(v);
    const sc = K.plot(ctx, top, { x0, x1, y0: 0, y1: ymax, yTicks: yT, yFmt: kfmt, yTitle: '1초에 쓰는 건수 (IOPS)' });
    // 수요가 처리 능력을 넘은 구간
    ctx.fillStyle = K.alpha(C.bad, 0.1);
    for (let i = 1; i < hist.length; i++) {
      if (hist[i].dem > hist[i].cap) ctx.fillRect(sc.x(hist[i - 1].t), top.y, sc.x(hist[i].t) - sc.x(hist[i - 1].t) + 0.5, top.h);
    }
    const capPts = hist.map(p => [p.t, Math.min(p.cap, ymax)]);
    const demPts = hist.map(p => [p.t, Math.min(p.dem, ymax)]);
    K.area(ctx, sc, demPts, C.s1, 0.1);
    K.line(ctx, sc, capPts, C.s2);
    K.line(ctx, sc, demPts, C.s1);
    if (cur.capTot > ymax) K.text(ctx, `처리 능력 ${kfmt(cur.capTot)}: 차트 위로 벗어남`, top.x + top.w - 4, top.y + 9, { align: 'right', size: 10.5, color: C.ink2, weight: 600 });
    else if (P.backup) K.text(ctx, '수요에 백업이 쓰는 몫(능력의 70%) 포함', top.x + top.w - 4, top.y + 9, { align: 'right', size: 10.5, color: C.ink2, weight: 600 });
    else if (hist.some(p => p.dem > p.cap)) K.text(ctx, '붉은 구간: 수요가 처리 능력을 넘음', top.x + top.w - 4, top.y + 9, { align: 'right', size: 10.5, color: C.badInk, weight: 600 });

    const xT = narrow ? [x0, x0 + 300, x1] : [x0, x0 + 120, x0 + 240, x0 + 360, x0 + 480, x1];
    const sc2 = K.plot(ctx, bot, { x0, x1, y0: 0, y1: 1, yTicks: [0, 0.5, 1], yFmt: v => Math.round(v * 100) + '%', xTicks: xT, xFmt: agoFmt(x1), yTitle: '버스트 크레딧 (남은 체력)' });
    const crSegs = segs(hist, p => p.cr != null).map(s => s.map(p => [p.t, p.cr]));
    for (const s of crSegs) { K.area(ctx, sc2, s, C.s3, 0.18); K.line(ctx, sc2, s, C.s3); }
    if (!crSegs.length) note(ctx, narrow ? '크레딧 없음: 늘 같은 속도' : '이 디스크는 크레딧 없이 늘 같은 속도로 일합니다', bot.x + bot.w / 2, bot.y + bot.h / 2, 'center');
  }

  function drawB() {
    const { ctx, w, h } = cvB;
    const C = K.C, narrow = w < 520;
    ctx.clearRect(0, 0, w, h);
    const L0 = narrow ? 44 : 54;
    const box = { x: L0, y: 24, w: w - L0 - 14, h: h - 24 - 30 };
    boxB = box;
    const x0 = t - WIN, x1 = t;
    const yT = narrow ? [-2, 0, 2, 4] : [-2, -1, 0, 1, 2, 3, 4];
    const sc = K.plot(ctx, box, {
      x0, x1, y0: -2, y1: 4, yTicks: yT, yFmt: v => LAT[v + 2],
      xTicks: narrow ? [x0, x0 + 300, x1] : [x0, x0 + 120, x0 + 240, x0 + 360, x0 + 480, x1], xFmt: agoFmt(x1),
      yTitle: '밀리초 (눈금 한 칸마다 10배)',
    });
    K.hline(ctx, sc, lg(TICK), { color: C.muted, dash: [4, 4] });
    K.line(ctx, sc, hist.map(p => [p.t, lg(p.L)]), C.s1);
    const bs = segs(hist, p => p.blk > 0.01);
    for (const s of bs) K.line(ctx, sc, s.map(p => [p.t, lg(p.blk)]), C.s2);
    if (!bs.length) note(ctx, narrow ? '틱 막힘 0ms (비동기)' : '틱 막힘 0ms: 게임 스레드가 디스크를 기다리지 않음', box.x + 8, sc.y(3.5), 'left');
  }

  function drawC() {
    const { ctx, w, h } = cvC;
    const C = K.C, narrow = w < 520;
    ctx.clearRect(0, 0, w, h);
    const x0 = 10, x1 = w - 10, y = 34, bh = h - 34 - 26;
    const X = tm => x1 - ((sNow - tm) / 1000) * (x1 - x0);
    let count = 0, late = 0;
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, h); ctx.clip();
    for (const k of ticks) {
      if (k.s >= sNow - 1000) { count++; if (k.comp + k.blk > TICK) late++; }
      const xs = X(k.s) + 1, xe = X(Math.min(k.s + k.dur, sNow)) - 1;
      if (xe <= xs) continue;
      ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      K.rr(ctx, xs + 0.5, y + 0.5, xe - xs - 1, bh - 1, 3); ctx.stroke();
      const xc = Math.min(xe, X(k.s + k.comp));
      ctx.fillStyle = K.alpha(C.muted, 0.45);
      K.rr(ctx, xs, y, xc - xs, bh, 3); ctx.fill();
      if (k.blk > 0) {
        const xb = Math.min(xe, X(k.s + k.comp + k.blk));
        if (xb > xc + 0.5) { ctx.fillStyle = C.s2; K.rr(ctx, xc + 1, y, xb - xc - 1, bh, 3); ctx.fill(); }
      }
      if (k.comp + k.blk > TICK) {
        const xa = X(k.s + TICK), xb = Math.min(xe, X(k.s + k.comp + k.blk));
        if (xb > xa) { ctx.fillStyle = C.bad; K.rr(ctx, xa, y - 7, xb - xa, 4, 2); ctx.fill(); }
      }
    }
    ctx.restore();
    const spd = Math.min(1, (count * TICK) / 1000);
    K.text(ctx, `최근 1초 동안 틱 ${count}번 (정상 20번)`, x0, 14, { size: 11.5, weight: 600, color: C.ink });
    K.text(ctx, narrow ? `늦은 틱 ${late}번` : `50ms를 넘긴 틱 ${late}번 · 게임 시간이 ${Math.round(spd * 100)}% 속도로 흐름`, x1, 14, { size: 11, color: late ? C.badInk : C.muted, align: 'right', weight: late ? 600 : 400 });
    K.text(ctx, '1초 전', x0, h - 10, { size: 10.5, color: C.muted, mono: true });
    K.text(ctx, '지금', x1, h - 10, { size: 10.5, color: C.muted, mono: true, align: 'right' });
    if (!narrow) K.text(ctx, '칸 하나 = 틱 한 번 (예산 50ms, 넘치면 다음 틱이 밀림)', (x0 + x1) / 2, h - 10, { size: 10.5, color: C.muted, align: 'center' });
  }

  function nearest(x, box) {
    if (!box || !hist.length || x < box.x - 4 || x > box.x + box.w + 4) return null;
    const tv = t - WIN + ((x - box.x) / box.w) * WIN;
    let best = hist[0];
    for (const p of hist) if (Math.abs(p.t - tv) < Math.abs(best.t - tv)) best = p;
    return best;
  }
  const ago = p => { const s = Math.round(t - p.t); return s < 5 ? '지금' : `${Math.floor(s / 60)}분 ${s % 60}초 전`; };
  K.hover(cvA, x => {
    const p = nearest(x, boxA);
    if (!p) return null;
    return `${ago(p)}<br>쓰기 수요 <b>${K.n(p.dem)}</b> IOPS` + (p.bk ? `<br>(게임 ${K.n(p.game)} + 백업 ${K.n(p.bk)})` : '') + `<br>처리 능력 <b>${K.n(p.cap)}</b> IOPS` + (p.cr != null ? `<br>버스트 크레딧 <b>${K.pct(p.cr)}</b>` : '');
  });
  K.hover(cvB, x => {
    const p = nearest(x, boxB);
    if (!p) return null;
    return `${ago(p)}<br>쓰기 1건 <b>${K.ms(p.L)}</b><br>틱 막힘 <b>${K.ms(p.blk)}</b> · 게임 속도 <b>${K.pct(p.spd)}</b>`;
  });

  // ---------- 해설 ----------
  function explain() {
    const D = DISKS[P.disk];
    const c = P.fsync ? 4 : 1;
    let flag = 'good', msg;
    if (P.mode === 'sync') {
      const n = K.n(cur.lam / 20, 0);
      if (cur.spd < 0.97) {
        flag = 'bad';
        msg = `<b>게임 스레드가 디스크를 기다리느라 틱이 늦습니다.</b> 틱마다 쓰기 약 ${n}건 × 건당 ${K.ms(cur.L)} = <b>${K.ms(cur.blk)}</b> 동안 멈춰 있습니다. 틱 예산 50ms를 넘겨 서버 시간이 평소의 <b>${K.pct(cur.spd)}</b> 속도로 흐릅니다. 플레이어는 <b>슬로우모션</b>, 스킬이 늦게 나가는 <b>입력 지연</b>, 잠깐씩 서는 <b>멈춤</b>을 겪습니다.`;
      } else if (cur.blk > 12) {
        flag = 'warn';
        msg = `틱마다 <b>${K.ms(cur.blk)}</b>를 디스크 기다리는 데 씁니다. 아직 50ms 안이지만 정기 저장이 몰리는 순간 넘칠 수 있습니다. 그러면 1분 간격으로 <b>뚝뚝 끊김</b>이 생깁니다.`;
      } else {
        msg = `게임 스레드가 직접 쓰지만 쓰기 한 건이 <b>${K.ms(cur.L)}</b>로 짧아서 틱마다 ${K.ms(cur.blk)}만 기다립니다. 창고 문이 넉넉한 동안은 동기 방식도 버팁니다.`;
      }
    } else {
      const mb = (cur.pend * REC_KB) / 1024;
      if (cur.behind > 10) {
        flag = 'bad';
        msg = `<b>게임은 멀쩡히 돌지만 저장이 ${dur(cur.behind)} 밀렸습니다.</b> 디스크가 1초에 ${K.n(cur.mu)}건만 받는데 ${K.n(P.rate)}건이 들어옵니다. 쓰기 ${K.n(cur.pend)}건(메모리 약 ${mb >= 1024 ? K.n(mb / 1024, 1) + 'GB' : K.n(mb) + 'MB'})이 줄을 섰습니다. 지금 서버가 죽으면 그만큼의 진행이 사라집니다(<b>씹힘·롤백</b>: 방금 얻은 아이템이 없어짐). 메모리가 바닥나면 서버도 죽습니다.`;
      } else if (cur.behind > 0.5) {
        flag = 'warn';
        msg = `쓰기가 잠깐 몰려 저장이 <b>${dur(cur.behind)}</b> 밀렸습니다. 별도 스레드가 맡고 있어 게임 틱은 멀쩡합니다. 몰림이 지나가면 줄이 다시 줄어듭니다.`;
      } else if (cur.L / (D.svc * c) > 2.5) {
        flag = 'warn';
        msg = `창고 문이 거의 꽉 차서 쓰기 한 건에 <b>${K.ms(cur.L)}</b>가 걸립니다. 그래도 별도 스레드가 기다려 주므로 게임 틱은 멀쩡합니다. 정기 저장이 몰리면 저장이 몇 초 밀렸다가 다시 따라잡습니다.`;
      } else {
        msg = `별도 스레드가 쓰기를 맡아서 게임 틱은 디스크를 기다리지 않습니다. 창고(디스크)도 여유가 있어 쓰기 한 건이 <b>${K.ms(cur.L)}</b>에 끝납니다.`;
      }
    }
    const extra = [];
    if (D.burst) {
      const drain = cur.used - D.iops;
      if (credits < CREDIT_MAX * 0.01) {
        extra.push(`버스트 크레딧이 바닥났습니다. 체력이 떨어져 기본 속도 <b>3천 IOPS</b>로만 걷습니다.`);
        if (flag === 'good') flag = 'warn';
      } else if (drain > 50) {
        extra.push(`버스트 크레딧이 <b>${K.pct(credits / CREDIT_MAX)}</b> 남았습니다. 이대로면 약 <b>${dur(credits / drain)}</b> 뒤 바닥나고 처리 능력이 1.6만에서 3천으로 떨어집니다.`);
        if (flag === 'good') flag = 'warn';
      }
    }
    if (P.backup) extra.push('백업이 창고 문의 70%를 차지하고 있습니다. 매일 같은 시각에 렉이 난다면 이런 예약 작업을 먼저 의심합니다.');
    if (P.fsync && flag !== 'good') extra.push(`fsync 때문에 쓰기 한 건이 ${c}배 무겁습니다.`);
    F.say(K.flag(flag) + msg + (extra.length ? ' ' + extra.join(' ') : ''));
  }

  K.loop(root, dt => {
    step(dt);
    stepStrip(dt);
    drawA(); drawB(); drawC();
    const D = DISKS[P.disk];
    const S = D.svc * (P.fsync ? 4 : 1);
    const r = cur.L / S;
    stL.set(K.ms(cur.L), cur.L > 50 || r > 6 ? 'bad' : cur.L > 5 || r > 2.5 ? 'warn' : 'good', '쓰기 한 건이 끝나기까지');
    const mb = (cur.pend * REC_KB) / 1024;
    stQ.set(K.n(cur.pend), cur.behind > 10 ? 'bad' : cur.behind > 0.5 || cur.pend > Math.max(50, cur.lam * 0.2) ? 'warn' : 'good',
      P.mode === 'async' ? `메모리 약 ${mb >= 1024 ? K.n(mb / 1024, 1) + 'GB' : K.n(mb, mb < 10 ? 1 : 0) + 'MB'}` : '게임 스레드가 직접 기다림');
    if (D.burst) {
      const f = credits / CREDIT_MAX;
      stC.set(K.pct(f), f < 0.01 ? 'bad' : f < 0.3 ? 'warn' : 'good', f < 0.01 ? '바닥: 기본 3천 IOPS' : '남은 체력 (최대 1.6만)');
    } else stC.set('해당 없음', null, '클라우드 볼륨에만 있음');
    stB.set(K.ms(cur.blk), COMPUTE + cur.blk > TICK ? 'bad' : cur.blk > 12 ? 'warn' : 'good', COMPUTE + cur.blk > TICK ? `게임 속도 ${K.pct(cur.spd)}` : '틱 예산 50ms 중');
    stS.set(dur(cur.behind), cur.behind > 10 ? 'bad' : cur.behind > 0.5 ? 'warn' : 'good');
    explain();
  });
});
