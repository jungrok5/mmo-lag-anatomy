/* 서버 구성도: 한 곳을 고장 내면 연쇄로 어디까지 번지는지, 플레이어는 누가 무엇을 겪는지 보여 준다.
   그림은 SVG(색은 CSS 변수라 테마 전환 자동), 번짐 규칙과 증상 표는 아래 데이터로 정해진다. */
K.register('arch', function (root) {
  const TR = I18N.tr('sim-arch');   // 이 실험 묶음의 사전을 먼저 본다(i18n.js)
  const F = K.frame(root, {
    kicker: TR`레이어 13 · 서버 구성과 운영`,
    title: TR`서버 하나에 장애가 나면 누가 무엇을 겪나`,
    lead: TR`MMO는 대개 역할이 다른 여러 서버가 서로 부르며 돌아갑니다. 상자를 누르면 그 서버가 느려지거나 멈춥니다. 장애가 어디까지 번지는지, 플레이어는 누가 무엇을 겪는지 아래 목록에서 확인하세요. 같은 고장도 “기다리는 방식”에 따라 영향 범위가 크게 달라집니다.`,
    tries: [
      TR`<b>DB 느려짐 (동기 호출)</b>을 눌러 보세요. DB 하나가 느려졌을 뿐인데 모든 필드와 던전의 틱이 늦어져 슬로우모션·뚝뚝 끊김에 빠집니다.`,
      TR`같은 고장에서 <b>비동기</b>로 바꾸고 <b>서킷 브레이커</b>를 켜 보세요. 영향이 “저장이 늦음”으로 줄어듭니다.`,
      TR`<b>캐시 장애 → DB 과부하</b>를 눌러 보세요. 캐시가 막아 주던 조회가 한꺼번에 DB로 쏟아져 멀쩡하던 DB까지 느려집니다.`,
      TR`<b>로그인 서버 장애</b>와 <b>게이트웨이 한 대 장애</b>를 비교해 보세요. 이미 게임 중인 사람이 겪는 일이 전혀 다릅니다.`,
      TR`<b>로그 수집</b>을 멈추고 기다리는 방식을 동기/비동기로 바꿔 보세요. 로그처럼 사소해 보이는 곳도 동기로 기다리면 게임이 멈춥니다.`,
    ],
    layout: 'stack',
  });

  K.addStyle('arch', `
.arch-cap{margin-bottom:5px}
.arch-cap .legend svg{width:11px;height:11px;vertical-align:-1px;margin-right:5px}
.arch-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:8px;background:var(--paper)}
.arch-svg{display:block;width:100%;min-width:860px;height:auto}
.arch-svg text{font-family:var(--font-body)}
.arch-svg .grp{fill:none;stroke:var(--line);stroke-width:1}
.arch-svg .grp-t,.arch-svg .col-t{font-size:11px;font-weight:700;fill:var(--muted);letter-spacing:.03em}
.arch-svg .edge{fill:none;stroke:var(--line);stroke-width:1.6}
.arch-svg .edge.slow{stroke:var(--warn);stroke-dasharray:5 4}
.arch-svg .edge.down{stroke:var(--bad);stroke-dasharray:5 4}
.arch-svg .elbl{font-size:10.5px;fill:var(--ink-2);paint-order:stroke;stroke:var(--paper);stroke-width:4px;stroke-linejoin:round}
.arch-svg .flow{fill:var(--s1)}
.arch-svg .node{cursor:pointer;outline:none}
.arch-svg .node .nb{fill:var(--surface);stroke:var(--line);stroke-width:1.2}
.arch-svg .node.ext .nb{fill:var(--sunk)}
.arch-svg .node:hover .nb{stroke:var(--ink-2)}
.arch-svg .node.s1 .nb{stroke:var(--warn);stroke-width:2.5}
.arch-svg .node.s2 .nb{stroke:var(--bad);stroke-width:2.5}
.arch-svg .node:focus-visible .nb{stroke:var(--accent);stroke-width:3}
.arch-svg .node.sel .nb{stroke-width:3}
.arch-svg .node .ring{fill:none;stroke-width:1.6;stroke-dasharray:4 3;display:none}
.arch-svg .node.c1 .ring{display:inline;stroke:var(--warn)}
.arch-svg .node.c2 .ring{display:inline;stroke:var(--bad)}
.arch-svg .nt{font-size:13px;font-weight:600;fill:var(--ink)}
.arch-svg .nt2{font-size:11px;fill:var(--muted)}
.arch-svg .ic{fill:var(--good)}
.arch-svg .ic.warn{fill:var(--warn)}
.arch-svg .ic.bad{fill:var(--bad)}
.arch-svg .badge rect{fill:var(--surface);stroke-width:1.2}
.arch-svg .badge text{font-size:10.5px;font-weight:700}
.arch-svg .badge.warn rect{stroke:var(--warn)}
.arch-svg .badge.warn text{fill:var(--warn-ink)}
.arch-svg .badge.bad rect{stroke:var(--bad)}
.arch-svg .badge.bad text{fill:var(--bad-ink)}
.arch-hint{font-size:12px;color:var(--muted);margin-top:4px;display:none}
@media (max-width:900px){.arch-hint{display:block}}
.arch-fx{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:16px;align-items:start}
@media (max-width:760px){.arch-fx{grid-template-columns:minmax(0,1fr)}}
.arch-fx h4{font-size:12px;font-weight:700;color:var(--muted);letter-spacing:.03em;margin:0 0 8px}
.arch-list,.arch-chain{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.arch-item{background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:9px 12px;display:grid;gap:7px}
.arch-item .who{font-size:14px;color:var(--ink);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.arch-item .why,.arch-chain li{font-size:13px;color:var(--ink-2);line-height:1.55;margin:0}
.arch-item .sym .glyph{width:30px;height:12px}
.arch-chain li{padding:8px 12px;border-left:3px solid var(--line);background:var(--paper);border-radius:0 8px 8px 0}
.arch-chain li b{color:var(--ink)}
.arch-chain li.warn{border-left-color:var(--warn)}
.arch-chain li.bad{border-left-color:var(--bad)}
.arch-chain li.good{border-left-color:var(--good)}
.arch-empty{font-size:13px;color:var(--muted);margin:0}
.arch-sel{width:100%;padding:7px 10px;border-radius:6px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-size:13.5px}
.arch-sel:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.sim[data-sim="arch"] .sim-stats{grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))}
.sim[data-sim="arch"] .stat-val{font-family:var(--font-body);font-size:17px;letter-spacing:-.01em}
`);

  // ---------- 서버(상자)와 연결(선) ----------
  const NODES = [
    { id: 'player', name: TR`플레이어`, l: [TR`플레이어`], x: 52, y: 250, w: 84 },
    { id: 'ddos', name: TR`DDoS 방어·방화벽`, l: [TR`DDoS 방어`, TR`방화벽`], x: 180, y: 250, w: 108 },
    { id: 'lb', name: TR`로드밸런서`, l: [TR`로드밸런서`], x: 316, y: 250, w: 104 },
    { id: 'auth', name: TR`인증·결제 플랫폼(외부)`, l: [TR`인증·결제 플랫폼`, TR`(외부)`], x: 480, y: 52, w: 144, ext: true },
    { id: 'login', name: TR`로그인 서버`, l: [TR`로그인 서버`], x: 480, y: 152, w: 132 },
    { id: 'gw', name: TR`게이트웨이(세션) 서버`, l: [TR`게이트웨이`, TR`(세션) ×3대`], x: 480, y: 350, w: 132 },
    { id: 'fa', name: TR`게임 서버: 필드 A`, l: [TR`필드 A`], x: 690, y: 160, w: 128 },
    { id: 'fb', name: TR`게임 서버: 필드 B`, l: [TR`필드 B`], x: 690, y: 212, w: 128 },
    { id: 'dg', name: TR`게임 서버: 던전`, l: [TR`던전`], x: 690, y: 264, w: 128 },
    { id: 'chat', name: TR`채팅 서버`, l: [TR`채팅 서버`], x: 690, y: 368, w: 128 },
    { id: 'party', name: TR`파티·길드 서버`, l: [TR`파티·길드 서버`], x: 690, y: 420, w: 128 },
    { id: 'auction', name: TR`경매장 서버`, l: [TR`경매장 서버`], x: 690, y: 472, w: 128 },
    { id: 'log', name: TR`로그 수집`, l: [TR`로그 수집`], x: 918, y: 160, w: 124 },
    { id: 'cache', name: TR`캐시(Redis)`, l: [TR`캐시 (Redis)`], x: 918, y: 260, w: 124 },
    { id: 'db', name: TR`주 DB`, l: [TR`주 DB`], x: 918, y: 360, w: 124 },
    { id: 'replica', name: TR`복제 DB(읽기용)`, l: [TR`복제 DB`, TR`(읽기용)`], x: 918, y: 472, w: 124 },
  ];
  const NH = 42;
  const BY = {}; NODES.forEach(n => { BY[n.id] = n; });
  const GAMES = ['fa', 'fb', 'dg'];
  const nm = id => (id === 'game' ? TR`게임 서버` : BY[id].name);
  const Hc = (x1, y1, x2, y2) => `M${x1} ${y1}C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}`;
  const EDGES = [
    { a: 'player', b: 'ddos', d: 'M94 250L126 250', lab: TR`접속`, lp: [110, 236] },
    { a: 'ddos', b: 'lb', d: 'M234 250L264 250' },
    { a: 'lb', b: 'login', d: 'M316 229C316 180 350 152 414 152', lab: TR`로그인`, lp: [372, 140] },
    { a: 'lb', b: 'gw', d: 'M316 271C316 320 350 350 414 350', lab: TR`게임 연결`, lp: [368, 366] },
    { a: 'login', b: 'auth', d: 'M480 131L480 73', lab: TR`로그인 확인·결제`, lp: [472, 102], anchor: 'end' },
    { a: 'login', b: 'db', d: 'M534 131L534 104Q534 96 542 96L1002 96Q1010 96 1010 104L1010 352Q1010 360 1002 360L980 360', lab: TR`계정 조회`, lp: [780, 89] },
    ...['fa', 'fb', 'dg', 'chat', 'party', 'auction'].map(b => ({ a: 'gw', b, d: Hc(546, 350, 626, BY[b].y) })),
    { a: 'game', b: 'log', d: Hc(762, 186, 856, 160), lab: TR`로그`, lp: [809, 166] },
    { a: 'game', b: 'cache', d: Hc(762, 212, 856, 260), lab: TR`조회`, lp: [809, 232] },
    { a: 'game', b: 'db', d: Hc(762, 238, 856, 352), lab: TR`저장`, lp: [812, 290] },
    { a: 'auction', b: 'db', d: Hc(754, 466, 856, 370), lab: TR`거래`, lp: [806, 413] },
    { a: 'auction', b: 'replica', d: Hc(754, 478, 856, 478), lab: TR`목록 조회`, lp: [806, 470] },
    { a: 'db', b: 'replica', d: 'M918 381L918 451', lab: TR`복제`, lp: [926, 417], anchor: 'start' },
  ];
  const EXTRA_LABELS = [{ t: TR`위치·전투`, x: 584, y: 126 }, { t: TR`메시지·기능`, x: 582, y: 334 }];

  // ---------- 증상 ----------
  const SYM = { [TR`뚝뚝 끊김`]: 'stutter', [TR`순간이동`]: 'teleport', [TR`고무줄`]: 'rubber', [TR`몰아치기`]: 'burst', [TR`슬로우모션`]: 'slowmo', [TR`입력 지연`]: 'delay', [TR`멈춤`]: 'freeze', [TR`씹힘·롤백`]: 'dropped', [TR`접속 끊김`]: 'disconnect', [TR`접속 불가·무한 로딩`]: 'noconnect', [TR`특정 기능만 안 됨`]: null };
  const SEV = [TR`접속 끊김`, TR`멈춤`, TR`접속 불가·무한 로딩`, TR`씹힘·롤백`, TR`슬로우모션`, TR`몰아치기`, TR`고무줄`, TR`순간이동`, TR`뚝뚝 끊김`, TR`입력 지연`, TR`특정 기능만 안 됨`];
  const FEATURE_GLYPH = '<svg class="glyph" viewBox="0 0 30 12" aria-hidden="true"><rect x="10.5" y="1.5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M12 9.5 18 2.5" stroke="currentColor" stroke-width="1.2"/></svg>';
  const chip = s => `<span class="sym">${SYM[s] ? K.glyph(SYM[s]) : FEATURE_GLYPH}${s}</span>`;

  // 서버 × {느려짐, 멈춤} → 플레이어가 겪는 일. r = 범위 크기(5 전원 … 0 없음), s = 짧은 범위 이름
  // 함수는 설계 선택 {sync, brk} 에 따라 달라지는 항목. null 이면 게임 서버 쪽 연쇄 항목이 대신 설명한다.
  const NOBODY = why => ({ who: TR`플레이어는 거의 모름`, s: TR`없음`, r: 0, sym: [], why });
  const FIELD = f => [
    { who: TR`필드 ${f}에 있는 사람`, s: TR`필드 ${f}`, r: 3, sym: [TR`슬로우모션`, TR`고무줄`, TR`순간이동`], why: TR`필드 ${f} 서버의 틱이 늦어져 그 필드만 느리게 흐르거나 뚝뚝 끊기고 이동 판정이 어긋나 뒤로 당겨집니다. 다른 필드는 멀쩡합니다.` },
    { who: TR`필드 ${f}에 있는 사람`, s: TR`필드 ${f}`, r: 3, sym: [TR`멈춤`, TR`접속 끊김`], why: TR`필드 ${f} 서버가 멈춰 화면이 굳었다가 접속이 끊깁니다. 필드 ${f}로 이동하려는 사람도 들어가지 못합니다.` },
  ];
  const E = {
    player: [
      { who: TR`그 플레이어 한 명`, s: TR`한 명`, r: 1, sym: [TR`뚝뚝 끊김`, TR`순간이동`, TR`고무줄`], why: TR`집 와이파이나 회선이 불안정하면 그 사람만 렉을 겪습니다. 서버와 다른 플레이어는 멀쩡합니다.` },
      { who: TR`그 플레이어 한 명`, s: TR`한 명`, r: 1, sym: [TR`접속 끊김`], why: TR`내 인터넷이 끊기면 나만 접속이 끊깁니다. 서버는 캐릭터를 잠시 남겨 두었다가 정리합니다.` },
    ],
    ddos: [
      { who: TR`전원`, s: TR`전원`, r: 5, sym: [TR`입력 지연`, TR`뚝뚝 끊김`, TR`순간이동`], why: TR`공격 트래픽을 걸러 내느라 검사 장비가 바빠 모든 패킷이 조금씩 늦고 일부는 버려집니다.` },
      { who: TR`전원 (오탐이면 일부 지역·통신사만)`, s: TR`전원`, r: 5, sym: [TR`접속 끊김`, TR`접속 불가·무한 로딩`], why: TR`모든 접속이 이 장비를 지나므로 장비가 멈추면 전원의 접속이 끊기고 다시 들어오지 못합니다. 장비가 정상 사용자를 공격으로 잘못 알고(오탐) 특정 통신사 주소 대역만 막으면 그 사람들만 이렇게 됩니다.` },
    ],
    lb: [
      { who: TR`전원 (특히 새로 접속하는 사람)`, s: TR`전원`, r: 5, sym: [TR`접속 불가·무한 로딩`, TR`입력 지연`], why: TR`모든 연결이 로드밸런서(접속을 여러 서버에 나눠 주는 장비)를 지나므로 접속과 로딩이 늦고, 게임 중 패킷도 조금 늦습니다.` },
      { who: TR`새로 접속하는 사람 전원 (중계 방식이면 게임 중인 사람도)`, s: TR`새 접속 전원`, r: 4, sym: [TR`접속 불가·무한 로딩`, TR`접속 끊김`], why: TR`새 연결을 나눠 줄 곳이 없습니다. 연결을 중계하는 방식이면 이미 붙은 연결도 함께 끊기고 처음 연결만 이어 주는 방식이면 게임 중인 사람은 버팁니다.` },
    ],
    auth: [
      { who: TR`로그인·결제하는 사람`, s: TR`로그인·결제`, r: 2, sym: [TR`접속 불가·무한 로딩`, TR`특정 기능만 안 됨`], why: TR`외부 플랫폼 응답이 늦어 로그인과 결제가 오래 걸립니다.` },
      c => ({ who: TR`결제하는 사람 · 새로 로그인하는 사람`, s: TR`결제·새 로그인`, r: 2, sym: [TR`특정 기능만 안 됨`, TR`접속 불가·무한 로딩`], why: c.brk ? TR`서킷 브레이커가 외부 호출을 바로 끊어 “잠시 후 다시 시도” 안내가 빨리 뜹니다. 게임 중인 사람은 결제만 안 됩니다.` : TR`결제가 실패하고 플랫폼 로그인이 막힙니다. 게임 중인 사람은 결제만 안 됩니다.` }),
    ],
    login: [
      { who: TR`새로 로그인하는 사람`, s: TR`새 로그인`, r: 2, sym: [TR`접속 불가·무한 로딩`], why: TR`로그인 버튼 뒤 대기가 길어집니다. 로그인 서버가 느린 것만으로는 이미 게임 중인 사람에게 영향이 없습니다.` },
      { who: TR`새로 로그인하는 사람`, s: TR`새 로그인`, r: 2, sym: [TR`접속 불가·무한 로딩`], why: TR`로그인 서버가 멈춘 것만으로는 이미 접속한 사람의 접속이 끊기지 않습니다. 하지만 한 번 끊기면 다시 들어올 수 없습니다.` },
    ],
    gw: [
      { who: TR`그 게이트웨이에 붙은 약 1/3`, s: TR`약 1/3`, r: 4, sym: [TR`입력 지연`, TR`몰아치기`, TR`고무줄`], why: TR`모든 패킷이 게이트웨이를 거쳐 가므로 입력이 늦게 닿고 밀린 결과가 한꺼번에 도착합니다.` },
      { who: TR`그 게이트웨이에 붙은 약 1/3`, s: TR`약 1/3`, r: 4, sym: [TR`접속 끊김`], why: TR`세션(접속 상태)을 들고 있던 서버가 사라져 붙어 있던 사람 모두의 접속이 끊깁니다. 나머지 두 대에 붙은 사람은 멀쩡합니다.` },
    ],
    fa: FIELD('A'),
    fb: FIELD('B'),
    dg: [
      { who: TR`던전 안에 있는 파티`, s: TR`던전`, r: 3, sym: [TR`슬로우모션`, TR`입력 지연`, TR`씹힘·롤백`], why: TR`던전 서버가 느려 보스 패턴과 스킬 판정이 늦습니다. 분명 피했는데 맞는 일이 생깁니다.` },
      { who: TR`던전 안 사람 · 던전에 들어가려는 사람`, s: TR`던전`, r: 3, sym: [TR`접속 끊김`, TR`씹힘·롤백`, TR`특정 기능만 안 됨`], why: TR`던전 진행이 끊기고 보상이 사라질 수 있습니다. 새 던전 입장도 안 됩니다.` },
    ],
    chat: [
      { who: TR`채팅하는 사람`, s: TR`채팅`, r: 2, sym: [TR`특정 기능만 안 됨`], why: TR`채팅이 몇 초 늦게 도착합니다. 전투와 이동은 멀쩡합니다.` },
      { who: TR`전원 (채팅만)`, s: TR`채팅`, r: 2, sym: [TR`특정 기능만 안 됨`], why: TR`채팅과 귓속말만 안 됩니다. 게임 플레이는 멀쩡합니다.` },
    ],
    party: [
      { who: TR`파티·길드 기능 쓰는 사람`, s: TR`파티·길드`, r: 2, sym: [TR`특정 기능만 안 됨`], why: TR`파티 초대와 길드 창이 늦게 열립니다.` },
      { who: TR`파티·길드 기능 쓰는 사람 · 던전에 들어가려는 사람`, s: TR`파티·던전 입장`, r: 2, sym: [TR`특정 기능만 안 됨`], why: TR`파티를 만들 수 없어 파티가 필요한 던전 입장도 막힙니다.` },
    ],
    auction: [
      { who: TR`경매장 이용자`, s: TR`경매장`, r: 2, sym: [TR`특정 기능만 안 됨`, TR`입력 지연`], why: TR`검색과 구매 버튼 반응이 늦습니다. 경매장 서버 탓으로 사냥과 전투가 느려지지는 않습니다.` },
      { who: TR`경매장 이용자`, s: TR`경매장`, r: 2, sym: [TR`특정 기능만 안 됨`], why: TR`경매장만 열리지 않습니다. 경매장 서버 탓으로 사냥과 전투가 멈추지는 않습니다.` },
    ],
    cache: [
      c => (c.sync && !c.brk ? null : NOBODY(TR`게임 서버가 캐시 응답을 오래 기다리지 않아 인벤토리·랭킹 창이 조금 늦게 열리는 정도입니다.`)),
      () => null,
    ],
    db: [
      c => (c.sync && !c.brk ? null : c.sync
        ? { who: TR`전원 (누군가 저장할 때마다)`, s: TR`전원`, r: 5, sym: [TR`멈춤`, TR`뚝뚝 끊김`, TR`특정 기능만 안 됨`], why: TR`게임 서버가 DB를 1초까지만 기다리고 포기합니다. 서킷 브레이커가 열리기 전까지는 누군가 저장할 때마다 틱이 최대 1초씩 멈추고, 그 뒤로는 바로 “저장 실패”로 처리해 게임은 계속됩니다. 1초 안에 겨우 답하는 느린 DB라면 실패로 세지 않아 서킷 브레이커가 열리지 않고 짧은 멈춤이 계속됩니다.` }
        : { who: TR`전원 (저장할 때)`, s: TR`전원`, r: 5, sym: [TR`특정 기능만 안 됨`], why: TR`게임은 멀쩡히 돌지만 얻은 아이템·우편이 늦게 들어옵니다(저장 지연).` + (c.brk ? TR` 너무 오래 걸리는 저장은 실패로 끊어 대기열이 쌓이지 않게 합니다.` : '') }),
      c => (c.sync && !c.brk ? null : c.brk
        ? { who: TR`전원`, s: TR`전원`, r: 5, sym: [TR`씹힘·롤백`, TR`특정 기능만 안 됨`], why: TR`서킷 브레이커가 DB 호출을 바로 끊어 게임은 계속됩니다. 대신 저장이 모두 실패해 거래·강화·우편이 막히고 그동안의 진행은 되돌려질 수 있습니다.` }
        : { who: TR`전원`, s: TR`전원`, r: 5, sym: [TR`씹힘·롤백`], why: TR`게임은 돌지만 저장할 것이 메모리에 계속 쌓입니다. 이대로 서버가 재시작되면 그동안의 진행이 사라집니다(롤백).` }),
    ],
    replica: [
      { who: TR`경매장·랭킹을 보는 사람`, s: TR`경매장·랭킹`, r: 2, sym: [TR`특정 기능만 안 됨`], why: TR`복제 지연: 방금 산 아이템이 목록에 안 보이고 경매장 가격이 몇 초~몇 분 전 값으로 보입니다.` },
      { who: TR`경매장·랭킹을 보는 사람`, s: TR`경매장·랭킹`, r: 2, sym: [TR`특정 기능만 안 됨`], why: TR`목록 조회가 실패합니다. 읽기를 주 DB로 돌리면 주 DB까지 느려집니다.` },
    ],
    log: [
      c => (c.sync && !c.brk ? null : NOBODY(TR`로그가 늦게 쌓일 뿐 게임에는 영향이 없습니다.`)),
      c => (c.sync && !c.brk ? null : NOBODY(c.sync ? TR`서킷 브레이커가 로그 쓰기를 포기시켜 게임은 계속됩니다. 그 사이 로그는 사라져 아이템 복사 같은 사고를 추적하기 어려워집니다.` : TR`로그가 메모리에 쌓이다 넘치면 버려집니다. 게임은 계속되지만 그 사이 기록은 사라집니다.`)),
    ],
  };

  // ---------- 상태 ----------
  const own = {}; NODES.forEach(n => { own[n.id] = 0; });
  const P = { mode: 'sync', brk: false };
  let sel = 'db';

  // 번짐 규칙: 조건이 맞으면 대상의 실제 상태를 끌어올리고 이유를 남긴다
  function propagate() {
    const eff = Object.assign({}, own), cause = {};
    const block = P.mode === 'sync' && !P.brk;
    let ch = true;
    const raise = (n, lv, from, why) => { if (lv > eff[n]) { eff[n] = lv; cause[n] = { from, why }; ch = true; } };
    for (let it = 0; it < 8 && ch; it++) {
      ch = false;
      if (eff.cache === 2) raise('db', 1, 'cache', TR`캐시가 받던 조회가 한꺼번에 주 DB로 쏟아집니다(캐시 스탬피드)`);
      if (eff.replica === 2) raise('db', 1, 'replica', TR`복제 DB가 받던 읽기가 주 DB로 넘어옵니다`);
      if (eff.db === 2) raise('replica', 1, 'db', TR`주 DB가 멈춰 복제가 멈춥니다. 복제 DB는 옛날 데이터를 보여 줍니다`);
      if (eff.db) raise('auction', eff.db, 'db', TR`거래는 주 DB에 기록해야 끝납니다`);
      if (eff.db) raise('login', eff.db, 'db', TR`계정 정보를 주 DB에서 읽어야 로그인이 끝납니다`);
      if (eff.auth && !P.brk) raise('login', eff.auth, 'auth', TR`로그인 서버의 워커 스레드가 모두 외부 인증 응답을 기다리며 묶입니다`);
      if (eff.gw === 2) raise('login', 1, 'gw', TR`접속이 끊긴 플레이어가 한꺼번에 다시 로그인합니다(재접속 폭주)`);
      if (block) for (const g of GAMES) {
        if (eff.db) raise(g, eff.db, 'db', eff.db === 2 ? TR`DB 응답을 끝없이 기다리며 게임 스레드가 멈춥니다(동기 호출)` : TR`저장할 때마다 DB 응답을 기다리느라 틱이 늦어집니다(동기 호출)`);
        if (eff.log) raise(g, eff.log, 'log', eff.log === 2 ? TR`로그 한 줄 쓰려다 응답 없는 로그 서버를 끝없이 기다립니다(동기 호출)` : TR`로그를 쓸 때마다 기다리느라 틱이 늦어집니다(동기 호출)`);
        if (eff.cache === 1) raise(g, 1, 'cache', TR`조회할 때마다 느린 캐시를 기다리느라 틱이 늦어집니다(동기 호출)`);
      }
    }
    return { eff, cause };
  }

  function effects(eff) {
    const c = { sync: P.mode === 'sync', brk: P.brk };
    const items = [], casc = {};
    for (const n of NODES) {
      const lv = eff[n.id];
      if (!lv) continue;
      if (GAMES.includes(n.id) && lv > own[n.id]) {
        const k = lastCause[n.id].from + lv;
        (casc[k] = casc[k] || { from: lastCause[n.id].from, lv, ids: [] }).ids.push(n.id);
        continue;
      }
      let e = E[n.id][lv - 1];
      if (typeof e === 'function') e = e(c);
      if (e) items.push(Object.assign({ lv }, e));
    }
    const SRC = { db: TR`주 DB`, log: TR`로그 수집 서버`, cache: TR`캐시` };
    for (const k in casc) {
      const g = casc[k], all = g.ids.length === 3;
      items.push({
        lv: g.lv, who: all ? TR`전원 (모든 필드·던전)` : TR`${g.ids.map(id => BY[id].l[0]).join(', ')}에 있는 사람`, s: all ? TR`전원` : TR`일부 필드`, r: all ? 5 : 3,
        sym: g.lv === 2 ? [TR`멈춤`, TR`접속 끊김`] : [TR`슬로우모션`, TR`뚝뚝 끊김`, TR`입력 지연`],
        why: g.lv === 2 ? TR`게임 서버가 ${SRC[g.from]} 응답을 끝없이 기다리며 멈췄습니다. 오래 가면 하트비트(연결 유지 신호)가 끊기거나 워치독(감시 타이머)이 서버를 재시작해 모두의 접속이 끊깁니다.`
          : TR`게임 서버가 ${SRC[g.from]} 응답을 기다리는 동안 틱이 멈춥니다. 게임이 느리게 흐르거나 뚝뚝 끊기고 입력이 늦게 반영됩니다.`,
      });
    }
    items.sort((a, b) => b.r - a.r || sevOf(a) - sevOf(b));
    return items;
  }
  const sevOf = it => (it.sym.length ? Math.min(...it.sym.map(s => SEV.indexOf(s))) : 99);
  // 심각한 증상(끊김·멈춤·접속 불가·롤백)이거나 넓은 범위가 움직임 증상을 겪으면 나쁨
  const statusOf = it => (!it.sym.length ? 'good' : sevOf(it) < 4 || (it.r >= 4 && sevOf(it) < 10) ? 'bad' : 'warn');
  const worst = list => (list.includes('bad') ? 'bad' : list.includes('warn') ? 'warn' : 'good');

  // ---------- SVG 그리기 ----------
  const NS = 'http://www.w3.org/2000/svg';
  const S = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.append(e);
    return e;
  };
  const icon = (st, x, y, s, parent) => {
    const cls = 'ic ' + (st === 2 ? 'bad' : st === 1 ? 'warn' : '');
    if (st === 2) return S('rect', { class: cls, x: x - s / 2, y: y - s / 2, width: s, height: s, rx: 1.2 }, parent);
    if (st === 1) return S('path', { class: cls, d: `M${x} ${y - s / 2 - 0.6}L${x + s / 2 + 0.6} ${y + s / 2}L${x - s / 2 - 0.6} ${y + s / 2}Z` }, parent);
    return S('circle', { class: cls, cx: x, cy: y, r: s / 2 }, parent);
  };
  const legend = '<span class="legend">' +
    TR`<span><svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.5" fill="var(--good)"/></svg>정상</span>` +
    TR`<span><svg viewBox="0 0 10 10"><path d="M5 .4 9.7 9.5H.3z" fill="var(--warn)"/></svg>느려짐</span>` +
    TR`<span><svg viewBox="0 0 10 10"><rect x=".6" y=".6" width="8.8" height="8.8" rx="1" fill="var(--bad)"/></svg>멈춤</span>` +
    TR`<span><svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" rx="1.5" fill="none" stroke="var(--ink-2)" stroke-width="1.2" stroke-dasharray="2 1.6"/></svg>연쇄로 번짐</span>` +
    TR`<span><svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="3" fill="var(--s1)"/></svg>요청 흐름</span></span>`;
  F.stage.append(K.el('div', { class: 'cv-cap arch-cap' }, K.el('b', { text: TR`서버 구성도 (상자를 누르면 고장 납니다)` }), K.el('span', { html: legend })));
  const scroll = K.el('div', { class: 'arch-scroll' });
  F.stage.append(scroll, K.el('p', { class: 'arch-hint', text: TR`좌우로 밀어서 그림 전체를 볼 수 있습니다.` }));
  const svg = S('svg', { class: 'arch-svg', viewBox: '0 0 1040 548', role: 'group', 'aria-label': TR`MMO 서버 구성도. 상자를 누르면 상태가 바뀝니다.` }, scroll);

  S('rect', { class: 'grp', x: 616, y: 118, width: 148, height: 176, rx: 10 }, svg);
  S('text', { class: 'grp-t', x: 626, y: 132 }, svg).textContent = TR`게임 서버`;
  S('rect', { class: 'grp', x: 616, y: 326, width: 148, height: 172, rx: 10 }, svg);
  S('text', { class: 'grp-t', x: 626, y: 340 }, svg).textContent = TR`기능 서버`;
  [[TR`클라이언트`, 52], [TR`네트워크 장비`, 248], [TR`접속 관리`, 480], [TR`게임·기능 서버`, 690], [TR`데이터`, 918]].forEach(([t, x]) => {
    S('text', { class: 'col-t', x, y: 534, 'text-anchor': 'middle' }, svg).textContent = t;
  });
  const gEdges = S('g', {}, svg), gLabels = S('g', {}, svg), gFlow = S('g', {}, svg), gNodes = S('g', {}, svg);
  EDGES.forEach(e => {
    e.el = S('path', { class: 'edge', d: e.d }, gEdges);
    if (e.lab) S('text', { class: 'elbl', x: e.lp[0], y: e.lp[1], 'text-anchor': e.anchor || 'middle', 'dominant-baseline': 'middle' }, gLabels).textContent = e.lab;
  });
  EXTRA_LABELS.forEach(l => { S('text', { class: 'elbl', x: l.x, y: l.y, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, gLabels).textContent = l.t; });

  NODES.forEach(n => {
    const g = S('g', { class: 'node' + (n.ext ? ' ext' : ''), tabindex: 0, role: 'button' }, gNodes);
    const x = n.x - n.w / 2, y = n.y - NH / 2;
    S('rect', { class: 'ring', x: x - 5, y: y - 5, width: n.w + 10, height: NH + 10, rx: 10 }, g);
    S('rect', { class: 'nb', x, y, width: n.w, height: NH, rx: 7 }, g);
    const tx = n.x + 6;
    if (n.l.length === 1) S('text', { class: 'nt', x: tx, y: n.y + 0.5, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, g).textContent = n.l[0];
    else {
      S('text', { class: 'nt', x: tx, y: n.y - 7, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, g).textContent = n.l[0];
      S('text', { class: 'nt2', x: tx, y: n.y + 10, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, g).textContent = n.l[1];
    }
    n.g = g; n.icon = S('g', {}, g); n.badge = S('g', { class: 'badge' }, g);
    n.title = S('title', {}, g);
    const cycle = () => { select(n.id); setState(n.id, (own[n.id] + 1) % 3); };
    g.addEventListener('click', cycle);
    g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); cycle(); } });
  });
  // 번역판: 상자보다 긴 이름은 글자를 줄여 상자 안에 넣는다(왼쪽 상태 아이콘과 겹치지 않게). 한국어판은 그대로
  let fitted = false;
  const fitLabels = () => {
    if (fitted || K.lang === 'ko') return;
    NODES.forEach(n => n.g.querySelectorAll('.nt, .nt2').forEach(t => {
      const max = n.w - 32, len = t.getComputedTextLength();
      if (!len) return;
      fitted = true;
      if (len <= max) return;
      const fs = parseFloat(getComputedStyle(t).fontSize) || 13;
      t.style.fontSize = Math.max(9, (fs * max) / len) + 'px';
      if (t.getComputedTextLength() > max) { t.setAttribute('textLength', max); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
    }));
  };
  requestAnimationFrame(fitLabels);

  // 흐름 점: 경로를 미리 잘게 나눠 두고 매 프레임 위치만 옮긴다
  EDGES.forEach((e, k) => {
    const len = e.el.getTotalLength();
    e.len = len;
    e.pts = [];
    for (let i = 0; i <= 48; i++) { const p = e.el.getPointAtLength((len * i) / 48); e.pts.push([p.x, p.y]); }
    const nd = Math.max(1, Math.round(len / 80));
    e.dots = [];
    for (let i = 0; i < nd; i++) e.dots.push({ ph: (i + (k % 3) / 3) / nd, el: S('circle', { class: 'flow', r: 3 }, gFlow) });
    e.f = 1;
  });
  function placeDots(e) {
    for (const d of e.dots) {
      const u = d.ph * 48, i = Math.min(47, Math.floor(u)), t = u - i;
      const a = e.pts[i], b = e.pts[i + 1];
      d.el.setAttribute('cx', (a[0] + (b[0] - a[0]) * t).toFixed(1));
      d.el.setAttribute('cy', (a[1] + (b[1] - a[1]) * t).toFixed(1));
    }
  }
  EDGES.forEach(placeDots);

  // ---------- 조작부 ----------
  const g1 = K.group(F.controls, TR`고장 내기`);
  const selEl = K.el('select', { id: K.uid('arch-sel'), class: 'arch-sel' }, NODES.map(n => K.el('option', { value: n.id, text: n.name })));
  g1.append(K.el('div', { class: 'ctl' }, K.el('label', { for: selEl.id }, K.el('span', { text: TR`고장 낼 곳` })), selEl,
    K.el('small', { class: 'ctl-hint', text: TR`그림의 상자를 눌러도 됩니다. 누를 때마다 정상 → 느려짐 → 멈춤 순서로 바뀝니다.` })));
  const cState = K.choice(g1, { label: TR`상태`, value: 0, options: [[0, TR`정상`], [1, TR`느려짐`], [2, TR`멈춤 (장애)`]], onChange: v => setState(sel, +v) });
  selEl.addEventListener('change', () => select(selEl.value, true));
  K.button(g1, { label: TR`모두 정상으로`, kind: 'small', onClick: () => { NODES.forEach(n => { own[n.id] = 0; }); presets.clear(); refresh(); } });
  const g2 = K.group(F.controls, TR`게임 서버 설계`);
  const cMode = K.choice(g2, {
    label: TR`게임 서버가 DB·로그를 기다리는 방식`, value: P.mode,
    options: [['sync', TR`동기 (응답 올 때까지 멈춤)`], ['async', TR`비동기 (기다리지 않음)`]],
    onChange: v => { P.mode = v; refresh(); },
    hint: TR`동기: 응답이 올 때까지 게임 스레드가 멈춰 기다립니다. 비동기: 요청만 보내 두고 바로 다음 틱을 돌립니다.`,
  });
  const tBrk = K.toggle(g2, { label: TR`타임아웃·서킷 브레이커`, value: P.brk, onChange: v => { P.brk = v; refresh(); }, hint: TR`상대가 느리면 1초만 기다리고 포기합니다. 계속 실패하면 한동안 아예 부르지 않고 바로 실패 처리합니다.` });

  function select(id, reveal) {
    sel = id; selEl.value = id; cState.set(own[id], false);
    NODES.forEach(n => n.g.classList.toggle('sel', n.id === id));
    // 좁은 화면에서는 그림이 가로로 밀리므로 고른 서버가 보이게 옮긴다
    if (reveal && scroll.scrollWidth > scroll.clientWidth + 4) {
      const left = (BY[id].x / 1040) * scroll.scrollWidth - scroll.clientWidth / 2;
      scroll.scrollTo({ left: Math.max(0, left), behavior: K.reducedMotion ? 'auto' : 'smooth' });
    }
  }
  function setState(id, v) { own[id] = v; if (id === sel) cState.set(v, false); presets.clear(); refresh(); }

  const presets = K.presets(F, [
    { label: TR`모두 정상`, apply() { apply({}, 'sync', false, 'db'); } },
    { label: TR`DB 느려짐 (동기 호출)`, apply() { apply({ db: 1 }, 'sync', false, 'db'); } },
    { label: TR`DB 느려짐 (비동기 + 서킷 브레이커)`, apply() { apply({ db: 1 }, 'async', true, 'db'); } },
    { label: TR`캐시 장애 → DB 과부하`, apply() { apply({ cache: 2 }, 'sync', false, 'cache'); } },
    { label: TR`게이트웨이 한 대 장애`, apply() { apply({ gw: 2 }, 'sync', false, 'gw'); } },
    { label: TR`로그인 서버 장애`, apply() { apply({ login: 2 }, 'sync', false, 'login'); } },
    { label: TR`복제 지연`, apply() { apply({ replica: 1 }, 'sync', false, 'replica'); } },
  ]);
  function apply(st, mode, brk, focus) {
    NODES.forEach(n => { own[n.id] = st[n.id] || 0; });
    P.mode = mode; P.brk = brk; cMode.set(mode, false); tBrk.set(brk, false);
    select(focus, true); refresh();
  }

  const stScope = K.stat(F.stats, { label: TR`영향받는 플레이어 범위` });
  const stSym = K.stat(F.stats, { label: TR`대표 증상` });
  const stCasc = K.stat(F.stats, { label: TR`연쇄로 번진 서버 수` });

  // 효과 목록 (그림 아래)
  const listEl = K.el('ul', { class: 'arch-list' }), chainEl = K.el('ol', { class: 'arch-chain' });
  F.stage.append(K.el('div', { class: 'arch-fx' },
    K.el('div', null, K.el('h4', { text: TR`플레이어가 겪는 일` }), listEl),
    K.el('div', null, K.el('h4', { text: TR`서버 사이에서 번진 일` }), chainEl)));

  // ---------- 갱신 ----------
  let lastEff = {}, lastCause = {};
  const word = lv => (lv === 2 ? TR`멈춤@@서버 상태(증상 이름과 다름)` : TR`느려짐@@서버 상태`);
  const fac = lv => (lv === 2 ? 0 : lv === 1 ? 0.3 : 1);
  function depth(id, cause, d = 0) { return cause[id] && d < 10 ? depth(cause[id].from, cause, d + 1) : d; }

  function refresh() {
    const { eff, cause } = propagate();
    lastEff = eff; lastCause = cause;
    const block = P.mode === 'sync' && !P.brk;
    // 상자
    NODES.forEach(n => {
      const o = own[n.id], e = eff[n.id], cas = e > o;
      n.g.classList.remove('s1', 's2', 'c1', 'c2');
      if (o) n.g.classList.add('s' + o);
      if (cas) n.g.classList.add('c' + e);
      n.icon.textContent = '';
      icon(e, n.x - n.w / 2 + 12, n.y, 8, n.icon);
      n.badge.textContent = '';
      n.badge.setAttribute('class', 'badge');
      if (e) {
        const txt = (cas ? TR`연쇄 ` : '') + word(e);
        const bw = (K.lang === 'ko' ? txt.length * 10.5 : [...txt].reduce((w, ch) => w + (ch.charCodeAt(0) >= 0x2e80 ? 10.5 : 6.6), 0)) + 12, bx = n.x + n.w / 2 - bw - 4, by = n.y - NH / 2 - 9;
        n.badge.setAttribute('class', 'badge ' + (e === 2 ? 'bad' : 'warn'));
        S('rect', { x: bx, y: by, width: bw, height: 17, rx: 8.5 }, n.badge);
        S('text', { x: bx + bw / 2, y: by + 9, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, n.badge).textContent = txt;
      }
      const st = e ? (cas ? TR`연쇄로 ` : '') + word(e) : TR`정상`;
      n.title.textContent = TR`${n.name}: ${st}. 눌러서 상태 바꾸기`;
      n.g.setAttribute('aria-label', TR`${n.name}, 지금 ${st}. 누르면 다음 상태로 바뀝니다.`);
    });
    // 선: 색은 부름을 받는 쪽(기다림이 생기는 곳) 상태를 따른다. 보내는 쪽이 느리면 흐름만 느려진다
    EDGES.forEach(e => {
      const la = e.a === 'game' ? Math.min(...GAMES.map(g => eff[g])) : eff[e.a];
      const lv = Math.max(la === 2 ? 2 : 0, eff[e.b]);
      e.f = fac(Math.max(la, lv));
      e.el.setAttribute('class', 'edge' + (lv === 2 ? ' down' : lv === 1 ? ' slow' : ''));
      e.dots.forEach(d => { d.el.style.display = e.f ? '' : 'none'; });
    });
    // 효과 목록
    const items = effects(eff);
    listEl.innerHTML = '';
    if (!items.length) listEl.append(K.el('li', { class: 'arch-empty', text: TR`고장 난 곳이 없습니다. 모두 평소처럼 플레이합니다.` }));
    items.forEach(it => {
      listEl.append(K.el('li', { class: 'arch-item' },
        K.el('div', { class: 'who', html: `${K.flag(statusOf(it))}<b>${it.who}</b>` }),
        it.sym.length ? K.el('div', { class: 'chips', html: it.sym.map(chip).join('') }) : null,
        K.el('p', { class: 'why', text: it.why })));
    });
    // 번짐 목록: 원인에서 가까운 순서, 같은 원인·같은 이유는 묶는다
    chainEl.innerHTML = '';
    const groups = [];
    Object.keys(cause).sort((a, b) => depth(a, cause) - depth(b, cause)).forEach(id => {
      const c = cause[id], k = c.from + '|' + c.why + '|' + eff[id];
      let g = groups.find(x => x.k === k);
      if (!g) groups.push(g = { k, from: c.from, why: c.why, lv: eff[id], ids: [] });
      g.ids.push(id);
    });
    const gName = ids => (ids.length === 3 && GAMES.every(g => ids.includes(g)) ? TR`게임 서버 3대` : ids.map(nm).join(', '));
    groups.forEach(g => {
      chainEl.append(K.el('li', { class: g.lv === 2 ? 'bad' : 'warn', html: `<b>${nm(g.from)} ${word(eff[g.from])}</b> → <b>${gName(g.ids)} ${word(g.lv)}</b><br>${K.end(g.why)}` }));
    });
    // 설계가 막아 낸 연쇄
    const saved = [], savedSay = [];
    ['db', 'log', 'cache'].forEach(id => {
      if (!eff[id] || block) return;
      if (id === 'cache' && eff[id] === 2) return;
      saved.push(P.mode === 'async'
        ? TR`<b>비동기</b>: 게임 서버가 ${nm(id)} 응답을 기다리지 않아 틱이 멈추지 않습니다.`
        : TR`<b>서킷 브레이커</b>: ${K.josa(nm(id), 'eul')} 1초까지만 기다리고 실패가 이어지면 아예 부르지 않아, 게임 서버가 오래 멈추지 않습니다. 기다리는 그 1초 동안은 틱이 멈추므로 비동기가 더 안전합니다.`);
      if (!savedSay.length) savedSay.push(P.mode === 'async' ? TR`설계 덕분에 게임 서버까지는 번지지 않았습니다.` : TR`서킷 브레이커 덕분에 게임 서버가 오래 멈추지는 않지만 기다리는 1초 동안은 틱이 멈춥니다.`);
    });
    if (eff.auth && P.brk) {
      saved.push(TR`<b>서킷 브레이커</b>: 로그인 서버가 외부 인증을 오래 기다리지 않아 스레드가 묶이지 않습니다.`);
      savedSay.push(TR`서킷 브레이커 덕분에 로그인 서버는 버티고 “잠시 후 다시 시도” 안내를 빨리 보여 줍니다.`);
    }
    saved.forEach(t => chainEl.append(K.el('li', { class: 'good', html: t })));
    if (!chainEl.children.length) chainEl.append(K.el('li', { class: 'arch-empty', text: NODES.some(n => own[n.id]) ? TR`번진 곳 없음: 장애가 그 서버 안에서 멈췄습니다.` : TR`번진 곳 없음.` }));

    // 수치 타일
    const hit = items.filter(it => it.sym.length);
    const top = hit[0];
    stScope.set(top ? top.s : TR`없음`, top ? statusOf(top) : 'good', top ? (hit.length > 1 ? TR`그 밖에 ${hit.length - 1}개 그룹` : top.who) : TR`플레이어는 모름`);
    const allSym = [...new Set(hit.flatMap(it => it.sym))].sort((a, b) => SEV.indexOf(a) - SEV.indexOf(b));
    stSym.set(allSym[0] || TR`없음`, !allSym.length ? 'good' : SEV.indexOf(allSym[0]) < 4 ? 'bad' : 'warn', allSym.length > 1 ? TR`그 밖에 ` + allSym.slice(1, 3).join(', ') + (allSym.length > 3 ? TR` 등` : '') : ' ');
    const cas = Object.keys(cause);
    stCasc.set(cas.length + TR`대`, cas.length >= 3 ? 'bad' : cas.length ? 'warn' : 'good', cas.length ? cas.slice(0, 3).map(id => (GAMES.includes(id) ? BY[id].l[0] : nm(id))).join(', ') + (cas.length > 3 ? TR` 등` : '') : TR`고장이 번지지 않음`);

    // 해설
    const faults = NODES.filter(n => own[n.id]);
    let msg;
    if (!faults.length) msg = K.flag('good') + TR`모든 서버가 정상입니다. 그림의 상자를 누르거나 “고장 낼 곳”을 골라 보세요. 누를 때마다 정상 → 느려짐 → 멈춤 → 정상 순서로 바뀝니다.`;
    else {
      const flag = worst(items.map(statusOf));
      msg = K.flag(flag) + K.end(faults.map(n => `<b>${n.name} ${word(own[n.id])}</b>`).join(', ')) + K.sp;
      groups.forEach(g => { msg += K.end(`→ <b>${gName(g.ids)} ${word(g.lv)}</b>: ${g.why}`) + K.sp; });
      msg += top ? TR`누가 겪나: <b>${top.who}</b>. 무엇을: ${top.sym.join(', ')}.` : TR`플레이어는 거의 알아채지 못합니다.`;
      if (block && GAMES.some(g => cause[g])) msg += TR` 기다리는 방식을 비동기로 바꾸거나 서킷 브레이커를 켜면 번지는 범위가 줄어듭니다.`;
      else if (savedSay.length) msg += K.sp + K.sentences(savedSay);
    }
    F.say(msg);
  }
  select(sel);
  refresh();

  // ---------- 흐름 점 움직이기 ----------
  K.loop(root, dt => {
    if (K.reducedMotion) return;
    for (const e of EDGES) {
      if (!e.f) continue;
      const v = (60 * e.f * dt) / 1000 / e.len;
      for (const d of e.dots) d.ph = (d.ph + v) % 1;
      placeDots(e);
    }
  });
});
