/* 연속 행동: 스킬 연계와 UI 흐름에서 “서버를 기다리는 횟수”가 체감을 정한다 */
K.register('chain', function (root) {
  const F = K.frame(root, {
    kicker: '동기화 방식 · 연속 행동',
    title: '핑은 “기다리는 횟수”만큼 곱해진다',
    lead: '스킬 하나, 버튼 하나는 핑 150ms를 크게 못 느낍니다. 하지만 행동이 이어질 때마다 서버 확인을 기다리면 그 150ms가 계속 쌓입니다. 같은 핑에서 스킬 연계와 상점 구매가 설계에 따라 얼마나 달라지는지 비교합니다.',
    tries: [
      '<b>핑</b>을 0 → 300ms로 올려 보세요. 맨 위 줄(확인 후 다음 입력)만 10초 동안 쓰는 스킬 수가 눈에 띄게 줄어듭니다.',
      '<b>선입력 창</b>을 0으로 줄여 보세요. 가운데 줄도 맨 위 줄과 똑같아집니다. 선입력 창이 핑보다 짧아도 효과가 줄어듭니다.',
      '아래 <b>순차 왕복 수</b>를 5로 두고 핑을 150ms로 맞춰 보세요. 상점에서 한 번 사는 데 1초 가까이 걸립니다. 한 번에 묶으면 0.2초로 줄어듭니다.',
    ],
  });
  const P = { rtt: 150, gcd: 1000, queue: 400, human: 60, tick: 20, trips: 5, proc: 20 };
  const cvLanes = K.canvas(F.stage, { height: w => (w < 520 ? 176 : 168), caption: '스킬 연계 10초', right: '<span class="legend"><span><i class="box" style="background:var(--s1)"></i>스킬 시전(글로벌 쿨다운)</span><span><i class="box" style="background:var(--warn);opacity:.45"></i>서버 확인 기다림</span></span>' });
  const cvUi = K.canvas(F.stage, { height: 132, caption: '상점에서 물건 하나 사기', right: '' });

  const g1 = K.group(F.controls, '회선');
  K.slider(g1, { label: '핑(왕복)', min: 0, max: 400, step: 10, value: P.rtt, unit: 'ms', onInput: v => { P.rtt = v; } });
  K.choice(g1, { label: '서버 틱', value: P.tick, options: [[10, '10/초'], [20, '20/초'], [30, '30/초'], [60, '60/초']], onChange: v => { P.tick = +v; } });
  const g2 = K.group(F.controls, '스킬 연계');
  K.slider(g2, { label: '글로벌 쿨다운', min: 500, max: 2000, step: 50, value: P.gcd, fmt: v => K.ms(v), onInput: v => { P.gcd = v; } });
  K.slider(g2, { label: '선입력 창', min: 0, max: 600, step: 25, value: P.queue, unit: 'ms', onInput: v => { P.queue = v; }, hint: '쿨다운이 끝나기 이만큼 전부터 다음 스킬 입력을 받아 둡니다.' });
  K.slider(g2, { label: '사람이 다시 누르기까지', min: 0, max: 200, step: 10, value: P.human, unit: 'ms', onInput: v => { P.human = v; }, hint: '쿨다운이 끝난 걸 보고 누르는 데 걸리는 시간' });
  const g3 = K.group(F.controls, '상점 UI');
  K.slider(g3, { label: '순차 왕복 수', min: 1, max: 10, step: 1, value: P.trips, unit: '번', onInput: v => { P.trips = v; }, hint: '예: 상점 열기 → 목록 → 가격 확인 → 구매 → 인벤토리 갱신' });
  K.slider(g3, { label: '요청당 서버 처리', min: 5, max: 100, step: 5, value: P.proc, unit: 'ms', onInput: v => { P.proc = v; } });

  const stA = K.stat(F.stats, { label: '확인 후 입력', unit: '회' });
  const stB = K.stat(F.stats, { label: '선입력 창', unit: '회' });
  const stC = K.stat(F.stats, { label: '선연출', unit: '회' });
  const stUi = K.stat(F.stats, { label: '상점 구매 (순차)' });

  /* ---------------- 계산 ---------------- */
  const tickWait = () => 1000 / P.tick / 2;
  // 스킬 사이 간격 (서버 기준)
  function intervals() {
    const g = P.gcd, r = P.rtt, tw = tickWait();
    // 1) 확인이 와야 내 화면 쿨다운이 시작되고, 끝난 걸 보고 누른 입력이 다시 서버까지 간다
    const confirmFirst = g + r + tw + P.human;
    // 2) 쿨다운이 끝나기 q 전부터 입력을 받아 서버에 미리 보내 두면, 왕복이 q 만큼 가려진다 (사람 반응도 미리 누르는 동안 가려짐)
    const queued = P.queue > 0 ? g + Math.max(0, r + tw - P.queue) : confirmFirst;
    // 3) 내 화면 기준으로 쿨다운을 돌리고 입력도 내 쪽에서 받아 두면, 서버는 허용 오차 안에서 그대로 인정
    const optimistic = g;
    return { confirmFirst, queued, optimistic };
  }
  const WIN = 10000;
  function lane(interval, wait) {
    const casts = [];
    for (let s = 0; s < WIN; s += interval) casts.push([s, Math.min(s + P.gcd, WIN), wait]);
    return casts;
  }

  function drawLanes() {
    const { ctx, w, h } = cvLanes;
    const C = K.C;
    ctx.clearRect(0, 0, w, h);
    const iv = intervals();
    const narrow = w < 520;
    const L = narrow ? 8 : 172, R = w - 44;
    const X = v => L + (v / WIN) * (R - L);
    const rows = [
      ['확인 후 다음 입력', iv.confirmFirst],
      ['선입력 창 (스킬 큐)', iv.queued],
      ['선연출 (내 화면 쿨다운)', iv.optimistic],
    ];
    const rowH = narrow ? 50 : 46;
    rows.forEach(([name, interval], i) => {
      const y = 8 + i * rowH;
      const bh = narrow ? 16 : 22;
      const yb = narrow ? y + 18 : y + 6;
      K.text(ctx, name, narrow ? L : 8, narrow ? y + 6 : yb + bh / 2, { size: 11.5, weight: 600, color: C.ink });
      ctx.fillStyle = C.sunk; ctx.fillRect(L, yb, R - L, bh);
      let n = 0;
      for (let s = 0; s < WIN; s += interval) {
        const x0 = X(s), x1 = X(Math.min(s + P.gcd, WIN));
        ctx.fillStyle = C.s1; K.rr(ctx, x0 + 1, yb, Math.max(1, x1 - x0 - 2), bh, 3); ctx.fill();
        if (interval > P.gcd + 1 && s + P.gcd < WIN) {
          const g0 = X(s + P.gcd), g1 = X(Math.min(s + interval, WIN));
          ctx.fillStyle = K.alpha(C.warn, 0.45); ctx.fillRect(g0, yb + 3, Math.max(1, g1 - g0 - 1), bh - 6);
        }
        n++;
      }
      K.text(ctx, `${n}회`, R + 6, yb + bh / 2, { size: 12, weight: 700, color: C.ink, mono: true });
    });
    for (let s = 0; s <= WIN; s += 2000) K.text(ctx, `${s / 1000}초`, X(s), h - 7, { align: s === 0 ? 'left' : 'center', size: 10, mono: true, color: C.muted });
  }

  function uiTimes() {
    const one = P.rtt + P.proc + tickWait();
    return { seq: P.trips * one, batch: P.rtt + P.proc * P.trips + tickWait(), prefetch: 17 };
  }
  function drawUi() {
    const { ctx, w, h } = cvUi;
    const C = K.C;
    ctx.clearRect(0, 0, w, h);
    const u = uiTimes();
    const narrow = w < 520;
    const L = narrow ? 8 : 172, R = w - 70;
    const max = Math.max(1000, u.seq * 1.05);
    const X = v => L + (v / max) * (R - L);
    const rows = [['순차 요청', u.seq, C.s1], ['한 번에 묶기', u.batch, C.s2], ['미리 받아 두기', u.prefetch, C.s3]];
    rows.forEach(([name, v, col], i) => {
      const y = 10 + i * (narrow ? 36 : 32);
      const yb = narrow ? y + 14 : y;
      const bh = narrow ? 14 : 20;
      K.text(ctx, name, narrow ? L : 8, narrow ? y + 4 : yb + bh / 2, { size: 11.5, weight: 600, color: C.ink });
      ctx.fillStyle = col;
      const x1 = X(v);
      ctx.beginPath(); ctx.moveTo(L, yb); ctx.lineTo(x1 - 4, yb); ctx.arcTo(x1, yb, x1, yb + 4, 4); ctx.lineTo(x1, yb + bh - 4); ctx.arcTo(x1, yb + bh, x1 - 4, yb + bh, 4); ctx.lineTo(L, yb + bh); ctx.closePath(); ctx.fill();
      if (i === 0 && P.trips > 1) {
        ctx.strokeStyle = C.surface; ctx.lineWidth = 2;
        for (let k = 1; k < P.trips; k++) { const x = X((u.seq / P.trips) * k); ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x, yb + bh); ctx.stroke(); }
      }
      K.text(ctx, K.ms(v), x1 + 6, yb + bh / 2, { size: 11.5, weight: 700, color: C.ink, mono: true });
    });
    const x100 = X(100);
    ctx.strokeStyle = C.ink2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x100, 4); ctx.lineTo(x100, h - 14); ctx.stroke(); ctx.setLineDash([]);
    K.text(ctx, '0.1초: 즉각적으로 느끼는 한계', x100 + 4, h - 7, { size: 10, color: C.muted });
  }

  function updateText() {
    const iv = intervals();
    const cnt = i => Math.ceil(WIN / i);
    const a = cnt(iv.confirmFirst), b = cnt(iv.queued), c = cnt(iv.optimistic);
    const loss = 1 - iv.optimistic / iv.confirmFirst;
    stA.set(String(a), loss > 0.15 ? 'bad' : loss > 0.07 ? 'warn' : 'good', `간격 ${K.ms(iv.confirmFirst)}`);
    stB.set(String(b), iv.queued > P.gcd * 1.07 ? 'warn' : 'good', `간격 ${K.ms(iv.queued)}`);
    stC.set(String(c), 'good', `간격 ${K.ms(iv.optimistic)}`);
    const u = uiTimes();
    stUi.set(K.ms(u.seq), u.seq > 600 ? 'bad' : u.seq > 250 ? 'warn' : 'good', `묶으면 ${K.ms(u.batch)}`);
    let msg = `${K.flag(loss > 0.12 ? 'bad' : loss > 0.05 ? 'warn' : 'good')}핑 ${P.rtt}ms, 쿨다운 ${K.ms(P.gcd)}에서 “확인 후 다음 입력” 방식은 스킬 사이마다 ${K.ms(iv.confirmFirst - P.gcd)}씩 비어 10초에 ${a}번만 씁니다. 같은 사람이 선연출 게임에서는 ${c}번을 씁니다(${Math.round(loss * 100)}% 차이). 플레이어는 이것을 <b>입력 지연</b>과 “손이 굼뜨다”로 느낍니다.`;
    if (P.queue > 0 && P.queue < P.rtt / 2 + tickWait()) msg += ` 선입력 창(${P.queue}ms)이 핑의 절반+틱 대기보다 짧아 일부만 가려집니다.`;
    msg += ` 상점 구매는 왕복 ${P.trips}번이 이어져 ${K.ms(u.seq)} 걸립니다. 요청을 한 번에 묶으면 ${K.ms(u.batch)}, 목록을 미리 받아 두면 누르는 즉시 반응합니다.`;
    F.say(msg);
  }

  let acc = 0;
  K.loop(root, dt => {
    drawLanes(); drawUi();
    acc += dt;
    if (acc > 200) { acc = 0; updateText(); }
  });
  K.onTheme(() => { drawLanes(); drawUi(); });
});
