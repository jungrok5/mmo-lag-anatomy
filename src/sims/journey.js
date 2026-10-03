/* 클릭에서 화면까지: 입력 → 내 PC → 집 회선 → 인터넷 → 서버·DB → 다시 내 화면.
   구간마다 쌓이는 ms 를 한 줄 막대와 구간 목록으로 나눠 보여 준다. 전체 구간 요약 장에서 쓴다. */
K.register('journey', function (root) {
  const TR = I18N.tr('sim-journey');   // 이 실험 묶음의 사전을 먼저 본다(i18n.js)
  const F = K.frame(root, {
    kicker: TR`전체 구간 · 지연 분해`,
    title: TR`클릭에서 화면 표시까지 구간별 지연`,
    lead: TR`스킬 버튼을 누른 순간부터 결과가 화면에 뜨기까지, 신호는 내 PC와 집 공유기, 통신사, 인터넷, 서버와 DB를 차례로 지나갑니다. 구간마다 몇 ms씩 쌓인 합이 플레이어가 느끼는 지연입니다. 조건을 바꾸며 어느 구간이 가장 크게 자라는지 보세요.`,
    tries: [
      TR`<b>서버 위치</b>를 “미국 서부”로 바꿔 보세요. 인터넷 구간이 막대의 절반 이상을 차지합니다.`,
      TR`<b>같은 집 다른 트래픽</b>을 60%에서 100%로 올려 보세요. 60%에서는 대기열이 금방 빠지지만 영상 업로드처럼 회선을 꽉 채우면 공유기 대기열 하나가 부산까지 가는 거리보다 수십 배 큰 지연을 만듭니다.`,
      TR`<b>FPS</b>를 30으로 낮추고 <b>모니터</b>를 TV로 바꿔 보세요. 네트워크가 멀쩡해도 내 PC 쪽에서만 100ms 넘게 쌓입니다.`,
      TR`<b>보는 관점</b>을 “다른 플레이어”로 바꾸면 보간 대기가 가장 큰 비중을 차지합니다. 남의 캐릭터는 늘 조금 과거 모습입니다.`,
      TR`<b>월드 보스</b> 프리셋에서 서버 부하를 100% 아래로 내려 보세요. 서버 쪽 두 구간이 한꺼번에 줄어듭니다.`,
    ],
    layout: 'side',
  });

  const CAT = [
    { name: TR`클라이언트 쪽`, c: 's1' },
    { name: TR`집·통신사 회선`, c: 's2' },
    { name: TR`인터넷·데이터센터`, c: 's3' },
    { name: TR`서버·DB`, c: 's4' },
  ];
  // [이름, 직선 거리 km, 실제 길이 직선의 몇 배인지]. 한국–유럽은 직선(시베리아) 위 케이블이 적어 동남아·수에즈나 미국을 돌아간다
  const SRV = { city: [TR`같은 도시`, 30, 1.5], busan: [TR`부산`, 400, 1.5], tokyo: [TR`도쿄`, 1150, 1.5], sg: [TR`싱가포르`, 4700, 1.5], usw: [TR`미국 서부`, 9000, 1.5], eu: [TR`유럽`, 8600, 2.7] };
  const LINK = {
    wired: { name: TR`유선 랜`, ms: 0.5, jit: 0.2, info: TR`랜선은 기다림이 거의 없습니다.`, fix: '' },
    wifi: { name: TR`와이파이`, ms: 3, jit: 4, info: TR`무선 채널이 빌 때까지 기다렸다 보내고 가끔 다시 보냅니다.`, fix: TR`랜선으로 바꾸면 이 구간이 거의 0이 됩니다.` },
    wifiBad: { name: TR`와이파이(약함)`, ms: 18, jit: 35, info: TR`신호가 약하면 전송 실패와 재전송이 잦습니다. 평균도 늘고 도착 간격도 들쭉날쭉해집니다(지터).`, fix: TR`공유기 가까이 가거나 랜선으로 바꾸면 이 구간이 거의 사라집니다.` },
    lte: { name: TR`LTE 무선`, ms: 14, jit: 15, mobile: true, info: TR`기지국이 전송 순서를 배정해 줄 때까지 기다립니다. 이동 중에는 기지국이 바뀌며 지터가 더 커집니다.`, fix: TR`가능하면 와이파이나 유선으로 바꾸세요.` },
    nr: { name: TR`5G 무선`, ms: 8, jit: 8, mobile: true, info: TR`기지국이 전송 순서를 배정해 줄 때까지 기다립니다. LTE보다 짧지만 유선보다는 깁니다.`, fix: TR`가능하면 유선으로 바꾸세요.` },
  };
  const MON = { gaming: [TR`게이밍 모니터`, 3], normal: [TR`일반 모니터`, 10], tv: ['TV', 40] };
  const TH = [50, 100, 150, 250];

  const DEF = { view: 'act', fps: 60, mon: 'gaming', bg: false, link: 'wired', line: 'ftth', traffic: 0, srv: 'city', ddos: false, tick: 30, load: 15, db: false, dbBusy: false, interp: 100 };
  const P = Object.assign({}, DEF);

  K.addStyle('journey', `
.jr-list{position:relative;display:grid;gap:1px}
.jr-sep{font-size:11px;font-weight:700;letter-spacing:.03em;color:var(--muted);padding:10px 6px 3px;border-bottom:1px solid var(--grid);margin-bottom:2px}
.jr-sep:first-child{padding-top:0}
.jr-row{display:grid;grid-template-columns:8px minmax(0,12.6em) minmax(0,1fr) 4.4em;gap:8px;align-items:center;padding:3px 6px;border-radius:6px;font-size:13px;line-height:1.35;color:var(--ink-2);cursor:default;outline-offset:-2px}
.jr-row:hover,.jr-row.on{background:var(--sunk)}
.jr-row .sw{width:8px;height:8px;border-radius:2px}
.jr-row .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.jr-row .br{height:8px;position:relative}
.jr-row .br i{position:absolute;left:0;top:0;bottom:0;border-radius:0 4px 4px 0;min-width:2px;opacity:.5}
.jr-row .v{font-family:var(--font-mono);font-variant-numeric:tabular-nums;font-size:12.5px;text-align:right;color:var(--ink);white-space:nowrap}
.jr-row.top .nm{color:var(--ink);font-weight:700}
.jr-row.top .br i{opacity:1}
.jr-row .rk{font-size:10.5px;font-weight:700;color:var(--ink);background:var(--sunk);border:1px solid var(--line);border-radius:4px;padding:0 4px;margin-right:5px}
.jr-list .tip{max-width:280px}
.sim[data-sim="journey"] .cv-cap{flex-wrap:wrap}
.sim[data-sim="journey"] .cv-cap b{white-space:nowrap}
@media (max-width:480px){.jr-row{grid-template-columns:8px minmax(0,10.6em) minmax(0,1fr) 3.9em;gap:6px;font-size:12.5px;padding:3px 4px}}
`);

  /* ---------- 구간 계산 ---------- */
  function build() {
    const fr = 1000 / P.fps;
    const L = LINK[P.link];
    const mobile = !!L.mobile;
    const acc = mobile ? (P.link === 'lte' ? 6 : 5) : (P.line === 'ftth' ? 2 : 8);
    const accName = mobile ? TR`통신사 코어망` : TR`통신사 가입자망`;
    const accInfo = mobile ? TR`기지국에서 통신사 코어망을 거쳐 인터넷으로 나가는 구간입니다.` : TR`집에서 통신사 국사까지 가는 구간입니다. ${P.line === 'ftth' ? TR`광랜은 빠릅니다.` : TR`케이블 인터넷은 여러 집이 선을 나눠 써서 광랜보다 깁니다.`}`;
    const accFix = mobile ? TR`모바일 회선의 기본 지연이라 플레이어가 줄이기 어렵습니다.` : (P.line === 'ftth' ? '' : TR`광랜으로 바꾸면 조금 줄어듭니다.`);
    // 대기열은 이용률에 비례하지 않는다: 회선이 거의 꽉 찰 때 급격히 길어지고, 100%(대용량 업로드)면 버퍼가 가득 찬다.
    // 속도가 정해진 전송(60~95%)은 bloat 실험처럼 수~수십 ms, 끝까지 밀어 넣는 업로드는 버퍼 전체(여기서는 250ms)
    const u = P.traffic / 100;
    const bloatUp = mobile ? 0 : u >= 1 ? 250 : Math.min(250, 2 * u / (1 - u));
    const km = SRV[P.srv][1], stretch = SRV[P.srv][2];
    const net = km / 200 * stretch;
    const dc = 0.3;
    const ddosIn = P.ddos ? 15 : 0;       // 스크러빙 센터는 보통 들어오는 쪽만 거친다. 서버의 응답은 곧바로 나간다
    const iv = 1000 / P.tick;
    const cost = Math.max(0.3, P.load / 100 * iv);
    const over = cost > iv;
    const effIv = Math.max(iv, cost);
    const nic = 0.1 * (over ? 20 : 1);
    const os = 0.2 + (P.bg ? 3 : 0);
    const S = [];
    // base: 같은 종류(올림·내림)를 합쳐 보여 줄 때 쓰는 이름(방향 표시 없음)
    const add = (phase, kind, cat, name, ms, jit, info, fix, base) => S.push({ phase, kind, cat, name, ms, jit, info, fix, base: base || name });
    const txt = {
      os: TR`운영체제와 랜 드라이버가 패킷을 주고받습니다. 평소엔 0.2ms지만 백그라운드 다운로드·백신 검사가 돌면 늦어집니다.`,
      osFix: P.bg ? TR`백그라운드 다운로드와 업데이트를 멈추면 됩니다.` : '',
      frame: TR`FPS를 올리면 한 프레임이 짧아져 이 구간이 함께 줄어듭니다.`,
      bloat: TR`공유기는 인터넷으로 올려 보낼 패킷을 대기열 하나에 쌓습니다. 가족이 영상을 올리면 대기열이 길어지고 게임 패킷도 그 뒤에서 기다립니다(버퍼블로트). 업로드 쪽만 막혀서 서버에서 오는 패킷은 늦어지지 않습니다.`,
      bloatFix: TR`공유기의 SQM(스마트 대기열 관리)을 켜거나 큰 업로드를 잠시 멈추면 바로 줄어듭니다.`,
      inet: TR`서버까지 직선으로 약 ${K.n(km)}km. 광케이블 속 빛도 1,000km에 5ms가 걸리고 ` + (stretch > 2
        ? TR`한국과 유럽 사이 직선 위로는 큰 케이블이 거의 없어 동남아·수에즈나 미국을 돌아갑니다. 실제 경로는 직선의 2.5~3배입니다.`
        : TR`실제 경로는 직선보다 1.5배쯤 깁니다.`),
      inetFix: km > 1000 ? TR`빛보다 빠를 수는 없습니다. 가까운 지역 서버에 접속해야만 줄어듭니다.` : '',
      dc: TR`방화벽·로드밸런서를 지나 서버에 닿습니다.` + (P.ddos ? TR` DDoS 방어 업체의 스크러빙 센터(공격 트래픽을 걸러 내는 거점)를 거쳐 돌아가느라 15ms가 더 듭니다.` : ''),
      dcBack: TR`서버의 응답이 데이터센터 장비를 지나 인터넷으로 나갑니다.` + (P.ddos ? TR` 스크러빙 센터는 보통 들어오는 쪽만 거치므로 돌아오는 경로는 늘지 않습니다.` : ''),
      dcFix: P.ddos ? TR`DDoS 방어 경유지를 서버 가까운 곳에 두면 대부분 사라집니다.` : '',
      srvFix: over ? TR`서버 부하를 나누거나(채널·인스턴스 분산) 틱당 계산을 줄여야 합니다.` : '',
    };
    const phases = P.view === 'act'
      ? [['go', TR`내 PC → 서버`], ['srv', TR`서버 안`], ['back', TR`서버 → 내 PC`], ['scr', TR`내 화면`]]
      : [['srv', TR`서버 안 (상대 움직임 반영)`], ['back', TR`서버 → 내 PC`], ['scr', TR`내 화면`]];
    if (P.view === 'act') {
      add('go', 'in', 0, TR`입력 인식`, fr / 2, fr / 2, TR`키를 누른 순간은 두 프레임 사이 어딘가입니다. 게임은 다음 프레임에 입력을 읽으므로 평균 반 프레임을 기다립니다.`, txt.frame);
      add('go', 'cpu', 0, TR`클라 게임 처리`, fr, fr * 0.2, TR`입력을 읽고 게임 로직을 돌려 서버로 보낼 패킷을 만듭니다. 한 프레임이 걸립니다.`, txt.frame);
      add('go', 'os', 0, TR`클라 OS 송신`, os, P.bg ? 4 : 0.1, txt.os, txt.osFix);
      add('go', 'link', 1, TR`${L.name} (업로드)`, L.ms, L.jit, L.info, L.fix, L.name);
      if (!mobile) add('go', 'bloat', 1, TR`공유기 대기열 (업로드)`, bloatUp, bloatUp * 0.5, txt.bloat, txt.bloatFix, TR`공유기 대기열`);
      add('go', 'acc', 1, accName, acc, mobile ? 5 : 1, accInfo, accFix);
      add('go', 'inet', 2, TR`인터넷 구간`, net, 1 + net * 0.05, txt.inet, txt.inetFix);
      add('go', 'dc', 2, TR`데이터센터 장비`, dc + ddosIn, P.ddos ? 4 : 0.1, txt.dc, txt.dcFix);
      add('srv', 'nic', 3, TR`서버 NIC·커널`, nic, nic * 0.5, TR`서버 운영체제가 패킷을 받아 게임 프로그램에 넘깁니다.` + (over ? TR` 서버가 과부하라 이 단계도 밀립니다.` : ''), txt.srvFix);
    }
    add('srv', 'wait', 3, TR`다음 틱까지 대기`, effIv / 2, effIv / 2,
      TR`서버는 ${P.tick}Hz 틱 주기로 입력을 모아 처리합니다. 도착한 입력은 다음 틱까지 평균 틱 간격의 절반을 기다립니다.` + (over ? TR` 서버가 밀려 틱 간격 자체가 늘어났습니다.` : ''),
      over ? txt.srvFix : TR`틱레이트를 올리면 기다림이 줄지만 서버 비용이 커집니다.`);
    add('srv', 'tick', 3, TR`서버 틱 계산`, cost, over ? cost * 0.3 : cost * 0.2, TR`한 틱 동안 모든 플레이어의 입력과 몬스터·스킬 판정을 계산합니다. 사람이 몰릴수록 오래 걸립니다.`, txt.srvFix);
    if (P.view === 'act' && P.db) {
      add('srv', 'db', 3, TR`DB 조회·저장`, P.dbBusy ? 80 : 5, P.dbBusy ? 60 : 2,
        TR`아이템 사용·거래처럼 기록이 필요한 행동은 DB에 다녀와야 결과가 확정됩니다.` + (P.dbBusy ? TR` DB가 붐벼 대기열에서 기다립니다.` : ''),
        TR`결과를 먼저 보여 주고 DB 저장은 뒤에서 처리(비동기)하면 체감 지연에서 빠집니다.`);
    }
    if (P.view === 'see') add('srv', 'nic', 3, TR`서버 NIC·커널`, nic, nic * 0.5, TR`서버 운영체제가 게임 프로그램이 만든 패킷을 네트워크로 내보냅니다.` + (over ? TR` 서버가 과부하라 이 단계도 밀립니다.` : ''), txt.srvFix);
    add('back', 'dc', 2, TR`데이터센터 장비`, dc, 0.1, txt.dcBack, '');
    add('back', 'inet', 2, TR`인터넷 구간`, net, 1 + net * 0.05, txt.inet, txt.inetFix);
    add('back', 'acc', 1, accName, acc, mobile ? 5 : 1, accInfo, accFix);
    add('back', 'link', 1, TR`${L.name} (다운로드)`, L.ms, L.jit, L.info, L.fix, L.name);
    add('back', 'os', 0, TR`클라 OS 수신`, os, P.bg ? 4 : 0.1, txt.os, txt.osFix);
    if (P.view === 'see') add('scr', 'interp', 0, TR`보간 대기`, P.interp, 0, TR`다른 플레이어의 움직임을 부드럽게 이어 보이려고 일부러 버퍼만큼 늦게 재생합니다.`, TR`버퍼를 줄이면 빨라지지만 패킷이 조금만 늦어도 뚝뚝 끊김·순간이동이 보입니다.`);
    add('scr', 'render', 0, TR`렌더링`, fr, fr * 0.2, TR`결과를 반영해 다음 화면을 그립니다. 한 프레임이 걸립니다.`, txt.frame);
    add('scr', 'disp', 0, TR`화면 표시`, MON[P.mon][1], 1, TR`모니터가 신호를 받아 실제로 빛을 내기까지 걸리는 시간입니다. TV는 화질 처리 때문에 특히 깁니다.`, P.mon === 'gaming' ? '' : TR`게이밍 모니터를 쓰거나 TV의 게임 모드를 켜세요.`);

    const total = S.reduce((a, s) => a + s.ms, 0);
    const worst = total + Math.sqrt(S.reduce((a, s) => a + s.jit * s.jit, 0)) * 1.6;
    // 같은 종류(올림·내림)는 합쳐서 순위를 매긴다
    const kinds = {};
    S.forEach(s => {
      const k = kinds[s.kind] || (kinds[s.kind] = { kind: s.kind, ms: 0, n: 0, cat: s.cat, name: s.base, info: s.info, fix: s.fix });
      k.ms += s.ms; k.n++;
    });
    const ranked = Object.values(kinds).sort((a, b) => b.ms - a.ms);
    ranked.forEach((k, i) => { k.rank = i + 1; k.rt = k.n > 1 ? TR`왕복 ` : ''; });
    S.forEach(s => { s.rank = kinds[s.kind].rank; });
    const netMs = S.filter(s => s.cat === 1 || s.cat === 2).reduce((a, s) => a + s.ms, 0);
    return { S, total, worst, ranked, netMs, phases, over, mobile };
  }

  /* ---------- 무대 ---------- */
  const viewCtl = K.choice(F.stage, {
    label: TR`보는 관점`, value: P.view,
    options: [['act', TR`내 행동이 화면에 반영되기까지`], ['see', TR`다른 플레이어 움직임이 내 화면에 보이기까지`]],
    onChange: v => { P.view = v; changed(); },
    hint: TR`내 행동은 클라이언트 예측을 끄고 서버 확인을 기다리는 경우입니다. 다른 플레이어는 서버에서 나에게 오는 한 방향만 셉니다.`,
  });
  const legend = '<span class="legend">' + CAT.map(c => `<span><i class="box" style="background:var(--${c.c})"></i>${c.name}</span>`).join('') + '</span>';
  const bar = K.canvas(F.stage, { height: 118, caption: TR`전체 구간`, right: legend });
  const listCap = K.el('div', { class: 'cv-cap' }, K.el('b', { text: TR`구간별 지연` }), K.el('span', { text: TR`막대는 모두 같은 눈금 · 눌러서 설명 보기` }));
  const list = K.el('div', { class: 'jr-list' });
  const tip = K.el('div', { class: 'tip', hidden: true });
  F.stage.append(listCap, list);

  /* ---------- 조작부 ---------- */
  const gC = K.group(F.controls, TR`클라이언트`);
  const sFps = K.slider(gC, { label: TR`FPS (초당 화면 수)`, min: 20, max: 240, step: 1, value: P.fps, onInput: v => { P.fps = v; changed(); }, fmt: v => v + ' fps' });
  const cMon = K.choice(gC, { label: TR`모니터`, value: P.mon, options: [['gaming', TR`게이밍`], ['normal', TR`일반`], ['tv', 'TV']], onChange: v => { P.mon = v; changed(); } });
  const tBg = K.toggle(gC, { label: TR`백그라운드 부하 (다운로드·백신)`, value: P.bg, onChange: v => { P.bg = v; changed(); } });

  const gH = K.group(F.controls, TR`집·회선`);
  const cLink = K.choice(gH, { label: TR`연결 방식`, value: P.link, options: [['wired', TR`유선`], ['wifi', TR`와이파이 좋음`], ['wifiBad', TR`와이파이 나쁨`], ['lte', 'LTE'], ['nr', '5G']], onChange: v => { P.link = v; changed(); } });
  const cLine = K.choice(gH, { label: TR`집 인터넷`, value: P.line, options: [['ftth', TR`광랜`], ['cable', TR`케이블`]], onChange: v => { P.line = v; changed(); } });
  const sTraffic = K.slider(gH, { label: TR`같은 집 다른 트래픽`, min: 0, max: 100, step: 5, value: P.traffic, unit: '%', onInput: v => { P.traffic = v; changed(); }, hint: TR`가족의 영상 업로드·클라우드 백업이 업로드 회선을 얼마나 채우는지. 대기열은 회선이 거의 꽉 찰 때 급격히 길어집니다. 100%는 영상 업로드처럼 회선을 끝까지 채우는 전송입니다. 업로드 쪽 대기열이라 “다른 플레이어” 관점에는 영향이 없습니다.` });

  const gI = K.group(F.controls, TR`인터넷`);
  const cSrv = K.choice(gI, { label: TR`서버 위치 (서울에서)`, value: P.srv, options: Object.keys(SRV).map(k => [k, SRV[k][0]]), onChange: v => { P.srv = v; changed(); } });
  const tDdos = K.toggle(gI, { label: TR`DDoS 방어 경유`, value: P.ddos, onChange: v => { P.ddos = v; changed(); }, hint: TR`공격 트래픽을 걸러 주는 스크러빙 센터를 한 번 거쳐 갑니다. 흔한 방식대로 들어오는 쪽만 거친다고 두었습니다.` });

  const gS = K.group(F.controls, TR`서버`);
  const cTick = K.choice(gS, { label: TR`틱레이트`, value: P.tick, options: [[10, '10Hz'], [20, '20Hz'], [30, '30Hz'], [60, '60Hz']], onChange: v => { P.tick = +v; changed(); } });
  const sLoad = K.slider(gS, { label: TR`서버 부하 (틱 시간 대비)`, min: 0, max: 200, step: 5, value: P.load, unit: '%', onInput: v => { P.load = v; changed(); }, hint: TR`100%를 넘으면 한 틱 계산이 다음 틱 시간을 잡아먹어 서버 전체가 밀립니다.` });
  const tDb = K.toggle(gS, { label: TR`아이템 사용처럼 DB가 필요한 행동`, value: P.db, onChange: v => { P.db = v; changed(); } });
  const tDbBusy = K.toggle(gS, { label: TR`DB 혼잡`, value: P.dbBusy, onChange: v => { P.dbBusy = v; changed(); } });

  const gD = K.group(F.controls, TR`표시`);
  const sInterp = K.slider(gD, { label: TR`보간 버퍼`, min: 0, max: 200, step: 10, value: P.interp, unit: 'ms', onInput: v => { P.interp = v; changed(); }, hint: TR`“다른 플레이어” 관점에서만 쓰입니다.` });

  function dim(el, off) {
    el.style.opacity = off ? 0.45 : '';
    el.querySelectorAll('input').forEach(i => { i.disabled = off; });
  }

  const ctlSet = () => {
    sFps.set(P.fps, false); cMon.set(P.mon, false); tBg.set(P.bg, false); cLink.set(P.link, false); cLine.set(P.line, false);
    sTraffic.set(P.traffic, false); cSrv.set(P.srv, false); tDdos.set(P.ddos, false); cTick.set(P.tick, false); sLoad.set(P.load, false);
    tDb.set(P.db, false); tDbBusy.set(P.dbBusy, false); sInterp.set(P.interp, false); viewCtl.set(P.view, false);
  };
  const preset = o => () => { Object.assign(P, DEF, o); ctlSet(); changed(); };
  K.presets(F, [
    { label: TR`유선 + 국내 서버`, apply: preset({}) },
    { label: TR`와이파이 + 가족이 영상 업로드`, apply: preset({ link: 'wifi', traffic: 100, mon: 'normal' }) },
    { label: TR`LTE 접속`, apply: preset({ link: 'lte', mon: 'normal' }) },
    { label: TR`미국 서버 접속`, apply: preset({ srv: 'usw', mon: 'normal' }) },
    { label: TR`월드 보스 (서버 과부하)`, apply: preset({ load: 180, mon: 'normal' }) },
    { label: TR`아이템 사용 + DB 혼잡`, apply: preset({ db: true, dbBusy: true, mon: 'normal' }) },
  ]);

  const stTotal = K.stat(F.stats, { label: TR`총 지연` });
  const stTop = K.stat(F.stats, { label: TR`가장 큰 원인` });
  const stNet = K.stat(F.stats, { label: TR`네트워크 비중`, unit: '%', sub: TR`집 회선 + 인터넷` });
  const stGrade = K.stat(F.stats, { label: TR`체감 등급` });

  /* ---------- 구간 목록 (DOM) ---------- */
  let cur = build(), rows = [], sig = '', sel = -1;
  function renderRows() {
    const s = cur.phases.map(p => p[0]).join() + '|' + cur.S.map(x => x.kind + x.name).join();
    if (s !== sig) {
      sig = s;
      list.innerHTML = '';
      rows = [];
      cur.phases.forEach(([ph, lab]) => {
        list.append(K.el('div', { class: 'jr-sep', text: lab }));
        cur.S.forEach((sg, i) => {
          if (sg.phase !== ph) return;
          const bi = K.el('i');
          const r = K.el('div', { class: 'jr-row', tabindex: '0', role: 'button', 'data-i': i },
            K.el('i', { class: 'sw', style: `background:var(--${CAT[sg.cat].c})` }),
            K.el('span', { class: 'nm' }), K.el('span', { class: 'br' }, bi), K.el('span', { class: 'v' }));
          bi.style.background = `var(--${CAT[sg.cat].c})`;
          r.addEventListener('pointerenter', e => showTip(i, e));
          r.addEventListener('pointerdown', e => showTip(i, e));
          r.addEventListener('focus', () => showTip(i));
          r.addEventListener('blur', hideTip);
          rows[i] = r;
          list.append(r);
        });
      });
      list.append(tip);
    }
    const mx = Math.max(...cur.S.map(x => x.ms), 1);
    cur.S.forEach((sg, i) => {
      const r = rows[i];
      const top = sg.rank <= 3 && sg.ms > 0.5;
      r.classList.toggle('top', top);
      r.children[1].innerHTML = (top ? TR`<span class="rk">${sg.rank}위</span>` : '') + sg.name;
      r.children[1].title = sg.name;
      r.children[2].firstChild.style.width = (sg.ms / mx * 100) + '%';
      r.children[3].textContent = K.ms(sg.ms);
      r.setAttribute('aria-label', `${sg.name} ${K.ms(sg.ms)}`);
    });
    if (sel >= 0 && !tip.hidden) showTip(sel);
  }
  function showTip(i, e) {
    const sg = cur.S[i], r = rows[i];
    if (!sg || !r) return;
    sel = i;
    rows.forEach(x => x && x.classList.remove('on'));
    r.classList.add('on');
    tip.innerHTML = `<b>${sg.name}</b> · ${K.ms(sg.ms)} (${K.n(sg.ms / cur.total * 100, 0)}%)<br>${sg.info}`;
    tip.hidden = false;
    const lr = list.getBoundingClientRect();
    const x = e && e.clientX ? e.clientX - lr.left : lr.width / 2;
    const tw = tip.offsetWidth;
    tip.style.left = K.clamp(x, tw / 2 + 4, lr.width - tw / 2 - 4) + 'px';
    tip.style.top = r.offsetTop + 'px';
  }
  function hideTip() { tip.hidden = true; sel = -1; rows.forEach(x => x && x.classList.remove('on')); }
  list.addEventListener('pointerleave', hideTip);

  /* ---------- 한 줄 막대 (캔버스) ---------- */
  let animT = 0;
  function geom() {
    const w = bar.w, narrow = w < 520;
    const x0 = 10, x1 = w - (narrow ? 62 : 80);
    const xMax = Math.max(300, Math.ceil(cur.total * 1.04 / 100) * 100);
    return { x0, x1, xMax, X: v => x0 + (v / xMax) * (x1 - x0), by: 34, bh: 30, narrow };
  }
  function segAt(ms) {
    let a = 0;
    for (let i = 0; i < cur.S.length; i++) { a += cur.S[i].ms; if (ms <= a) return i; }
    return cur.S.length - 1;
  }
  function drawBar() {
    const { ctx, w, h } = bar;
    const C = K.C;
    ctx.clearRect(0, 0, w, h);
    const G = geom(), { X, by, bh } = G;
    // 체감 기준선
    TH.forEach((v, i) => {
      const x = Math.round(X(v)) + 0.5;
      ctx.save(); ctx.strokeStyle = C.line; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 18); ctx.lineTo(x, by + bh + 4); ctx.stroke(); ctx.restore();
      K.text(ctx, v + (i === TH.length - 1 ? ' ms' : ''), x, 10, { align: 'center', size: 10.5, mono: true, color: C.muted });
    });
    // 구간 조각 (사이 2px 틈)
    ctx.save();
    K.rr(ctx, G.x0, by, Math.max(4, X(cur.total) - G.x0), bh, 4); ctx.clip();
    let acc = 0;
    cur.S.forEach(s => {
      const a = X(acc), b = X(acc + s.ms); acc += s.ms;
      const wpx = b - a - 2;
      if (wpx < 0.6) return;
      ctx.fillStyle = C[CAT[s.cat].c];
      ctx.fillRect(a, by, wpx, bh);
    });
    ctx.restore();
    K.text(ctx, K.ms(cur.total), X(cur.total) + 11, by + bh / 2, { size: 13, weight: 700, mono: true, color: C.ink });
    // 단계 괄호
    let a = 0;
    cur.phases.forEach(([ph, lab]) => {
      const segs = cur.S.filter(s => s.phase === ph);
      const sum = segs.reduce((q, s) => q + s.ms, 0);
      const xa = X(a) + 1, xb = X(a + sum) - 3; a += sum;
      if (xb - xa < 6) return;
      const y = by + bh + 7;
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xa + 0.5, y - 3); ctx.lineTo(xa + 0.5, y + 0.5); ctx.lineTo(xb + 0.5, y + 0.5); ctx.lineTo(xb + 0.5, y - 3); ctx.stroke();
      const short = { go: TR`보내기`, srv: TR`서버`, back: TR`돌아오기`, scr: TR`화면` }[ph];
      ctx.font = K.font(10.5);
      if (ctx.measureText(short).width < xb - xa - 2) K.text(ctx, short, (xa + xb) / 2, y + 10, { align: 'center', size: 10.5, color: C.muted });
    });
    // 느린 화면으로 지나가는 패킷
    const ty = h - 12;
    if (!K.reducedMotion) {
      const period = cur.total * 10 + 900;
      const p = Math.min(cur.total, (animT % period) / 10);
      const i = segAt(p);
      K.dot(ctx, X(p), by + bh / 2, 5, C.ink);
      const s = cur.S[i];
      const lab = p >= cur.total - 0.01 ? TR`화면에 도착` : s.name;
      K.text(ctx, (G.narrow ? '' : TR`느린 화면(10배): `) + TR`${K.n(p, 0)} ms 지점 · ${lab}`, G.x0, ty, { size: 11, color: C.ink2 });
    } else {
      K.text(ctx, TR`막대에 손가락이나 마우스를 올리면 구간 설명이 보입니다.`, G.x0, ty, { size: 11, color: C.muted });
    }
  }
  K.hover(bar, (x, y) => {
    const G = geom();
    if (y < G.by - 6 || y > G.by + G.bh + 20) return null;
    const ms = (x - G.x0) / (G.x1 - G.x0) * G.xMax;
    if (ms < 0 || ms > cur.total) return null;
    const s = cur.S[segAt(ms)];
    return `<b>${s.name}</b> · ${K.ms(s.ms)}<br>${s.info}`;
  });

  /* ---------- 수치·해설 ---------- */
  function grade() {
    const off = P.view === 'see' ? 70 : 0;   // 남의 움직임은 내 입력보다 늦어도 덜 느낀다
    const t = Math.round(cur.total);
    return t <= 80 + off ? 'good' : t <= 150 + off ? 'warn' : 'bad';
  }
  function updateStats() {
    const g = grade();
    stTotal.set(K.n(cur.total, 0) + '<i>ms</i>', g, TR`운 나쁘면 ~${K.n(cur.worst, 0)} ms`);
    const t = cur.ranked[0];
    stTop.set(t.name, null, TR`${t.rt}${K.ms(t.ms)} · 전체의 ${K.n(t.ms / cur.total * 100, 0)}%`);
    const np = cur.netMs / cur.total * 100;
    stNet.set(K.n(np, 0), null);
    stGrade.set({ good: TR`쾌적`, warn: TR`느껴짐`, bad: TR`답답함` }[g], g, P.view === 'see' ? TR`남의 움직임 기준` : TR`내 입력 기준`);
    // 해설
    const [a, b] = cur.ranked;
    const pa = K.n(a.ms / cur.total * 100, 0);
    let feel;
    if (P.view === 'act') {
      feel = g === 'good' ? TR`플레이어는 누르자마자 스킬이 나가는 것처럼 느낍니다.`
        : g === 'warn' ? TR`플레이어는 버튼을 누르고 조금 늦게 반응하는 입력 지연을 느낍니다. 회피 타이밍이 조금씩 밀립니다.`
          : TR`입력 지연이 커서 스킬과 회피가 한참 늦게 나갑니다. 연타하면 씹힘·롤백처럼 보이고 판정에서 계속 불리해집니다.`;
    } else {
      feel = TR`다른 플레이어는 실제보다 약 ${K.n(cur.total, 0)}ms 전의 모습으로 보입니다. ` + (g === 'good' ? TR`대부분의 전투에서 티가 나지 않습니다.`
        : g === 'warn' ? TR`분명히 피했는데 맞았다는 판정이 가끔 생깁니다.` : TR`피했는데 맞는 일이 잦고 상대가 순간이동하듯 보이기도 합니다.`);
    }
    const fix = a.fix || (b && b.fix) || '';
    const mid = cur.over ? TR` 서버가 틱 안에 계산을 끝내지 못해 모든 플레이어의 반응이 함께 늦어집니다(입력 지연. 틱마다 정해진 시간만큼 움직이는 서버라면 슬로우모션까지).` : '';
    F.say(TR`${K.flag(g)}총 <b>${K.n(cur.total, 0)}ms</b> 중 가장 큰 비중은 <b>${a.name}</b>(${a.rt}${K.ms(a.ms)}, ${pa}%)이고 그다음은 <b>${b.name}</b>(${b.rt}${K.ms(b.ms)})입니다. ${a.info}${mid} ${feel}${fix ? TR` <b>도움이 되는 것:</b> ` + fix : ''}`);
  }

  function changed() {
    cur = build();
    dim(cLine.el, cur.mobile);
    dim(sTraffic.el, cur.mobile || P.view === 'see');
    dim(tDdos.el, P.view === 'see');
    dim(tDb.el, P.view === 'see'); dim(tDbBusy.el, P.view === 'see' || !P.db);
    dim(sInterp.el, P.view !== 'see');
    renderRows();
    updateStats();
  }
  changed();

  K.loop(root, dt => {
    animT += dt;
    drawBar();
  });
});
