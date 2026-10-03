/* 지연 시간 사다리: 나노초부터 초까지, 서버가 흔히 기다리는 일들을 한 줄로 세운다.
   로그 눈금(한 칸 = 10배)과 "1나노초 = 1초" 사람 시간으로 번갈아 본다. DOM 으로 그려 좁은 화면에서도 줄바꿈된다. */
K.register('ladder', function (root) {
  const TR = I18N.tr('sim-ladder');   // 이 실험 묶음의 사전을 먼저 본다(i18n.js)
  const F = K.frame(root, {
    kicker: TR`레이어 10 · 메모리 · 숫자 감각`,
    title: TR`컴퓨터의 시간을 사람의 시간으로 늘려 보면`,
    lead: TR`컴퓨터 안의 시간은 너무 짧아 감이 오지 않습니다. 나노초(10억분의 1초)부터 초까지, 서버가 흔히 기다리는 일들을 한 줄로 세웠습니다. 막대는 로그 눈금이라 눈금 한 칸마다 10배씩 길어집니다. 줄을 눌러 보세요.`,
    tries: [
      TR`<b>메모리(RAM) 읽기</b>를 눌러 보세요. CPU 입장에서 RAM은 L1 캐시보다 100배 먼 곳입니다.`,
      TR`<b>눈금</b>을 “1나노초를 1초로 늘리면”으로 바꿔 보세요. RAM 읽기는 1분 40초, 스왑된 메모리 되읽기는 약 1.2일이 됩니다.`,
      TR`빨간 세로선(<b>틱 50ms</b>)을 넘는 줄을 찾아보세요. 게임 스레드가 이 일을 기다리면 틱 하나가 통째로 날아갑니다.`,
      TR`<b>큰 힙 GC 전체 멈춤</b>을 눌러 보세요. 사람의 시간으로 늘리면 약 32년, 그동안 틱 20개가 밀립니다.`,
    ],
    layout: 'stack',
  });

  const G = [
    { name: TR`CPU·메모리`, c: 's1' },
    { name: TR`저장장치·DB`, c: 's2' },
    { name: TR`네트워크`, c: 's3' },
    { name: TR`게임 시간 단위`, c: 's4' },
  ];
  const TICK = 5e7; // 50ms (ns)
  const ROWS = [
    [TR`CPU L1 캐시 읽기`, 1, 0, TR`CPU 코어 바로 옆의 아주 작고 빠른 캐시입니다. 방금 쓴 데이터를 여기서 읽으면 비용이 거의 없습니다.`],
    [TR`L2 캐시 읽기`, 4, 0, TR`L1보다 조금 크고 조금 느린 캐시입니다. 그래도 L1의 4배밖에 걸리지 않습니다.`],
    [TR`메모리(RAM) 읽기`, 100, 0, TR`RAM에서 한 번 읽는 동안 CPU는 L1 캐시를 <b>100번</b> 읽을 수 있습니다. 그래서 자주 쓰는 데이터는 캐시에 올라가도록 모아 둡니다. 스왑된 메모리를 읽으면 여기서 다시 <b>1,000배</b>가 걸립니다.`],
    [TR`다른 CPU 쪽 메모리(NUMA)`, 150, 0, TR`CPU가 두 개인 서버에서 옆 CPU에 붙은 메모리를 읽으면 1.5배쯤 더 걸립니다. 스레드가 CPU를 옮겨 다니면 이런 손해가 쌓입니다.`],
    [TR`컨텍스트 스위칭(스레드 전환)`, 3e3, 0, TR`운영체제가 한 스레드를 멈추고 다른 스레드로 전환하는 시간입니다. 락을 기다리느라 스레드가 잠들고 깨기를 반복하면 이 비용이 계속 붙습니다.`],
    [TR`NVMe SSD 읽기`, 6e4, 1, TR`서버용 NVMe SSD에서 작은 블록 하나를 읽는 시간입니다. RAM보다 <b>600배</b> 느립니다. 한 건 속도는 SATA SSD와 크게 다르지 않고 대신 동시에 훨씬 많은 요청을 처리합니다.`],
    [TR`SATA SSD 읽기`, 1e5, 1, TR`보통 SSD 한 번 읽기는 RAM의 <b>1,000배</b>입니다.`],
    [TR`스왑된 메모리 되읽기(SSD)`, 1e5, 1, TR`RAM이 모자라 디스크로 밀려난 메모리를 다시 읽는 시간입니다. RAM이었다면 100ns였을 일이 <b>1,000배</b> 느려집니다. 메모리 누수가 쌓인 서버가 갑자기 느려지는 이유입니다.`],
    [TR`같은 데이터센터 서버끼리 왕복`, 5e5, 2, TR`같은 건물 안 서버끼리 요청 하나를 보내고 응답을 받는 데 보통 0.1~0.5ms가 걸립니다. 여기서는 넉넉하게 0.5ms로 잡았습니다. 게임 서버가 DB나 다른 서버를 호출할 때마다 이만큼 듭니다.`],
    [TR`DB 인덱스 쿼리`, 1e6, 1, TR`인덱스를 잘 탄 가벼운 쿼리 한 번이 네트워크 왕복을 합쳐 약 1ms입니다. 게임 스레드가 플레이어 100명에게 한 번씩 부르면 100ms, 틱 두 개가 통째로 사라집니다.`],
    [TR`SSD fsync(디스크에 확실히 쓰기)`, 2e6, 1, TR`로그나 저장 데이터를 “디스크에 확실히 썼다”고 확인받는 시간입니다. 전원 보호 기능이 없는 보통 SSD 기준입니다. 전원 보호 기능이 있는 서버용 SSD는 0.1ms 안팎, 클라우드 디스크는 1~2ms, HDD는 10ms를 넘깁니다. 게임 스레드에서 매번 하면 틱이 이만큼씩 멈춥니다.`],
    [TR`HDD 탐색`, 1e7, 1, TR`하드디스크 헤드가 데이터 위치로 이동하는 시간입니다. 한 번에 틱 예산의 5분의 1을 씁니다. 게임 서버가 HDD를 거의 쓰지 않는 이유입니다.`],
    [TR`모니터 한 프레임(60Hz)`, 1.67e7, 3, TR`60Hz 모니터가 화면을 한 번 그리는 간격입니다. 사람이 “부드럽다”고 느끼는 기준입니다.`],
    [TR`서울↔도쿄 왕복`, 3e7, 2, TR`서울과 도쿄 사이의 보통 핑입니다. 이 중 빛이 광섬유를 오가는 시간만 약 12ms이고 나머지는 우회 경로와 중간 장비에서 생깁니다. 이 빛의 이동 시간은 서버가 아무리 빨라도 줄일 수 없습니다.`],
    [TR`서버 틱 한 번(20Hz)`, 5e7, 3, TR`20Hz 서버의 틱 간격(게임 세계를 한 번 갱신하는 주기)입니다. 이 안에 모든 일을 끝내야 합니다. 이 표의 기준선입니다.`],
    [TR`서울↔미국 서부 왕복`, 1.4e8, 2, TR`태평양을 건너 왕복하는 시간으로, 서버 틱 한 번보다 깁니다. 해외 서버에서 스킬 반응이 조금 늦는(<b>입력 지연</b>) 이유입니다.`],
    [TR`TCP 재전송 최소 대기`, 2e8, 2, TR`잃은 패킷을 재전송 타이머(RTO)로 다시 보낼 때, 리눅스 TCP는 최소 “핑 + 200ms”를 기다렸다 다시 보냅니다. 게임처럼 드문드문 보내는 연결에서 흔합니다. 그동안 뒤따르는 데이터도 모두 멈춰 기다립니다(<b>멈춤</b> 뒤 <b>몰아치기</b>).`],
    [TR`사람 반응 속도`, 2.5e8, 3, TR`사람이 화면을 보고 반응하는 데 걸리는 시간입니다. 컴퓨터에게는 아주 긴 시간이지만 입력 지연은 이보다 훨씬 짧은 100ms 안팎부터 “굼뜨다”고 느낍니다.`],
    [TR`큰 힙 GC 전체 멈춤`, 1e9, 0, TR`큰 힙을 한 번에 수집하는 전체 멈춤 GC입니다. 그동안 틱 20개가 밀리고 이 서버의 모든 플레이어가 동시에 <b>멈춤</b>을 겪습니다.`],
  ].map(([n, v, g, why]) => ({ n, v, g, why }));

  K.addStyle('ladder', `
    .ld { container-type: inline-size; display: grid; gap: 2px; }
    .ld-top { display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .ld-top .ctl { min-width: min(100%, 330px); }
    .ld-row, .ld-head { display: grid; grid-template-columns: minmax(150px, 34%) minmax(0, 1fr) 104px; gap: 4px 14px; align-items: center; padding: 5px 8px; border-radius: 6px; }
    .ld-head { padding-top: 0; padding-bottom: 2px; font-size: 11.5px; color: var(--muted); }
    .ld-head .ld-cnt { font-family: inherit; font-size: 11.5px; line-height: 1.3; white-space: normal; }
    .ld-row { cursor: pointer; outline: none; }
    .ld-row:hover { background: var(--paper); }
    .ld-row:focus-visible { box-shadow: 0 0 0 2px var(--accent); }
    .ld-row.on { background: var(--accent-soft); }
    .ld-name { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 8px; font-size: 13.5px; color: var(--ink); min-width: 0; line-height: 1.35; }
    .ld-name .dot { flex: none; margin-right: -2px; width: 9px; height: 9px; border-radius: 50%; transform: translateY(-1px); }
    .ld-name small { color: var(--muted); font-size: 11px; white-space: nowrap; }
    .ld-bar { position: relative; height: 22px; min-width: 0; }
    .ld-grid { position: absolute; inset: 0; background-repeat: no-repeat; background-size: 100% 100%, var(--span) 100%, var(--span) 100%;
      background-image:
        linear-gradient(90deg, transparent calc(var(--tk) - 1px), var(--bad) calc(var(--tk) - 1px), var(--bad) calc(var(--tk) + 1px), transparent calc(var(--tk) + 1px)),
        repeating-linear-gradient(90deg, var(--line) 0 1px, transparent 1px 30%),
        repeating-linear-gradient(90deg, var(--grid) 0 1px, transparent 1px 10%); }
    .ld-fill { position: absolute; left: 0; top: 6px; height: 10px; border-radius: 0 4px 4px 0; min-width: 4px; }
    .ld-val { position: absolute; top: 50%; transform: translateY(-50%); font: 600 12px/1 var(--font-mono); color: var(--ink); white-space: nowrap; padding: 2px 4px; border-radius: 4px; background: color-mix(in srgb, var(--surface) 82%, transparent); }
    .ld-row.on .ld-val { background: color-mix(in srgb, var(--accent-soft) 82%, transparent); }
    .ld-cnt { text-align: right; font: 500 12.5px/1.2 var(--font-mono); color: var(--ink-2); white-space: nowrap; }
    .ld-cnt.long { color: var(--bad-ink); font-family: var(--font-body); font-weight: 600; }
    .ld-cnt .flag { vertical-align: -1px; }
    .ld-axis { position: relative; height: 16px; }
    .ld-axis span { position: absolute; top: 0; transform: translateX(-50%); font: 500 10.5px/1.4 var(--font-mono); color: var(--muted); white-space: nowrap; }
    .ld-axis span.first { transform: none; }
    .ld-axis span.tk { color: var(--bad-ink); font-family: var(--font-body); font-weight: 600; }
    @container (max-width: 600px) {
      .ld-row, .ld-head { grid-template-columns: minmax(0, 1fr) auto; }
      .ld-row .ld-bar, .ld-head .ld-axis { grid-column: 1 / -1; grid-row: 2; }
      .ld-head .ld-lab { display: none; }
      .ld-name { font-size: 13px; }
      .ld-cnt { font-size: 12px; }
    }
  `);

  /* ---------- 서식 ---------- */
  const trim = (v, d) => K.n(v, v < 10 && d && Math.abs(v - Math.round(v)) > 0.05 ? d : 0);
  function fmtReal(ns) {
    if (ns < 1e3) return K.n(ns) + 'ns';
    if (ns < 1e6) return trim(ns / 1e3, 1) + 'µs';
    if (ns < 1e9) return (ns / 1e6 < 100 && ns % 1e6 ? K.n(ns / 1e6, 1) : K.n(ns / 1e6)) + 'ms';
    return trim(ns / 1e9, 1) + TR`초`;
  }
  // 1나노초를 1초로 늘리면
  function fmtHuman(ns) {
    const s = ns;
    if (s < 60) return K.n(s) + TR`초`;
    if (s < 3600) { const m = Math.floor(s / 60), r = Math.round(s % 60); return r ? TR`${m}분 ${r}초` : TR`${m}분`; }
    if (s < 86400) return TR`약 ` + K.n(s / 3600, 1) + TR`시간`;
    if (s < 30.44 * 86400) return TR`약 ` + trim(s / 86400, 1) + TR`일`;
    if (s < 365.25 * 86400) return TR`약 ` + K.n(s / (30.44 * 86400)) + TR`개월`;
    return TR`약 ` + trim(s / (365.25 * 86400), 1) + TR`년`;
  }
  function fmtCount(n) {
    if (K.lang !== 'ko') return n >= 1e4 ? TR`${K.compact(n)}번@@횟수(큰 수)` : TR`${K.n(n)}번@@횟수`;
    if (n >= 1e8) return K.n(n / 1e8, 1) + TR`억 번`;
    if (n >= 1e5) return K.n(Math.round(n / 1e4)) + TR`만 번`;
    if (n >= 1e4) return K.n(n / 1e4, 1) + TR`만 번`;
    return K.n(n) + TR`번`;
  }
  // 1ns ~ 10초를 막대 칸의 82%에 담고(한 눈금 = 10배), 나머지는 값 글자 자리로 둔다
  const SPAN = 82;
  const pos = ns => (Math.log10(Math.max(1, ns)) / 10) * SPAN;
  const TKP = pos(TICK);

  /* ---------- DOM ---------- */
  let mode = 'real', pinned = 2, shown = 2;
  const box = K.el('div', { class: 'ld' });
  box.style.setProperty('--tk', TKP + '%');
  box.style.setProperty('--span', SPAN + '%');
  const top = K.el('div', { class: 'ld-top' });
  K.choice(top, {
    label: TR`눈금`, value: mode, options: [['real', TR`실제 시간 (로그 눈금)`], ['human', TR`1나노초를 1초로 늘리면`]],
    onChange: v => { mode = v; paint(); },
  });
  top.append(K.el('span', { class: 'legend', html: G.map(g => `<span><i class="dot" style="background:var(--${g.c})"></i>${g.name}</span>`).join('') }));
  box.append(top);
  const axis = K.el('div', { class: 'ld-axis' });
  box.append(K.el('div', { class: 'ld-head' }, K.el('div', { class: 'ld-lab', text: TR`기다리는 일` }), axis, K.el('div', { class: 'ld-cnt', text: TR`틱 한 번(50ms) 안에 몇 번?` })));
  const rowEls = ROWS.map((r, i) => {
    const val = K.el('span', { class: 'ld-val' });
    const cnt = K.el('div', { class: 'ld-cnt' });
    const el = K.el('div', { class: 'ld-row', tabindex: '0', role: 'button', 'aria-pressed': 'false' },
      K.el('div', { class: 'ld-name' }, K.el('i', { class: 'dot', style: { background: `var(--${G[r.g].c})` } }), K.el('span', { text: r.n }), K.el('small', { text: G[r.g].name })),
      K.el('div', { class: 'ld-bar' }, K.el('div', { class: 'ld-grid' }), K.el('div', { class: 'ld-fill', style: { width: pos(r.v) + '%', background: `var(--${G[r.g].c})` } }), val),
      cnt);
    const n = Math.floor(TICK / r.v);
    if (i === 14) cnt.textContent = TR`1번 (기준)`;
    else if (n < 1) { cnt.classList.add('long'); cnt.innerHTML = K.flag('bad').replace(TR`나쁨`, '') + TR`틱보다 김`; }
    else cnt.textContent = fmtCount(n);
    el.addEventListener('mouseenter', () => show(i));
    el.addEventListener('focus', () => show(i));
    el.addEventListener('click', () => { pinned = i; show(i); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pinned = i; show(i); } });
    box.append(el);
    return { el, val };
  });
  box.addEventListener('mouseleave', () => show(pinned));
  F.stage.append(box);
  F.panel.hidden = true;
  F.stats.hidden = true;

  function paint() {
    const ticks = [[1, '1ns', TR`1초`], [1e3, '1µs', TR`약 17분`], [1e6, '1ms', TR`약 12일`], [1e9, TR`1초`, TR`약 32년`]];
    axis.innerHTML = '';
    ticks.forEach(([v, a, b], k) => axis.append(K.el('span', { class: k ? '' : 'first', style: { left: pos(v) + '%' }, text: mode === 'real' ? a : b })));
    axis.append(K.el('span', { class: 'tk', style: { left: TKP + '%' }, text: TR`틱` }));
    ROWS.forEach((r, i) => {
      const p = pos(r.v);
      const { val } = rowEls[i];
      val.textContent = mode === 'real' ? fmtReal(r.v) : fmtHuman(r.v);
      val.style.left = `calc(max(${p}%, 4px) + 4px)`;   // 막대 끝 바로 뒤
    });
    show(shown);
  }

  function show(i) {
    shown = i;
    rowEls.forEach((r, k) => { r.el.classList.toggle('on', k === i); r.el.setAttribute('aria-pressed', k === pinned ? 'true' : 'false'); });
    const r = ROWS[i];
    const n = Math.floor(TICK / r.v);
    const st = n < 1 ? 'bad' : r.v >= 1e6 && i !== 14 ? 'warn' : 'good';
    const inTick = i === 14 ? '' : n < 1 ? TR`서버 틱 한 번(50ms)보다 <b>${K.n(r.v / TICK, 1)}배</b> 깁니다. 게임 스레드가 이것을 기다리면 틱이 통째로 밀립니다.` : TR`틱 한 번(50ms) 안에 <b>${fmtCount(n)}</b> 할 수 있는 시간입니다.${r.v >= 1e6 ? TR` 한 번이면 괜찮지만 플레이어마다 부르면 금방 예산을 넘습니다.` : ''}`;
    F.say(TR`${K.flag(st)} <b>${r.n}: ${fmtReal(r.v)}</b>. ${r.why} ${inTick} 1나노초를 1초로 늘리면 <b>${fmtHuman(r.v)}</b>입니다.`);
  }
  paint();
});
