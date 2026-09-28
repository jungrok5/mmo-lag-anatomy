/* 타임아웃 사다리: 가만히 있는 연결은 길 위의 장비들이 하나씩 잊는다.
   가장 짧은 유휴 타임아웃이 범인이고, 서버가 모르면 유령 접속이 남는다. 레이어 5(네트워크 장비) 장에서 쓴다. */
K.register('timeouts', function (root) {
  const F = K.frame(root, {
    kicker: '레이어 5 · 네트워크 장비',
    title: '가만히 있으면 튕기는 이유: 타임아웃 사다리',
    lead: '퀘스트 글을 읽거나 마을에 세워 두는 동안, 조용한 곳(로비·채팅 서버·한적한 사냥터)에서는 연결에 패킷이 거의 지나가지 않습니다. 길 위의 공유기·방화벽·로드밸런서는 한동안 조용한 연결을 “끝난 것”으로 보고 기억에서 지웁니다. 각 장비의 타이머가 차오르는 모습을 빨리 감기로 보세요.',
    tries: [
      '<b>서버 무응답 판정</b>을 “끔”으로 내려 보세요. 공유기가 60초에 몰래 연결을 지우지만 서버는 모릅니다. 유령 접속입니다.',
      '<b>하트비트 간격</b>을 25초로 올려 보세요. 하트비트가 지나갈 때마다 모든 타이머가 0으로 돌아가 아무도 끊지 않습니다.',
      '<b>프로토콜</b>을 TCP로 바꾸고 하트비트와 서버 무응답 판정을 끈 채 <b>로드밸런서</b>를 60초로 줄여 보세요. 범인이 로드밸런서로 바뀝니다.',
      '<b>모바일 백그라운드</b> 프리셋을 눌러 보세요. 하트비트 간격이 짧아도 앱이 멈추면 소용이 없습니다.',
      '<b>회사 방화벽</b> 프리셋에서 <b>짧은 keepalive</b>를 켜 보세요. 운영체제가 60초마다 보내는 확인 패킷이 장비들을 깨워 둡니다.',
    ],
    layout: 'side',
  });

  const MAXT = 600, SPEED = 20;       // 10분을 30초에 (1초 = 20초)
  const LB_DEF = { udp: 120, tcp: 350 };   // AWS NLB 기본값 (UDP는 바꿀 수 없음)
  const DEF = { proto: 'udp', link: 'home', hb: 0, bg: false, fw: false, lb: LB_DEF.udp, srv: 30, ka: false };
  const P = Object.assign({}, DEF);

  // 받침에 따라 조사 고르기 (괄호 속 영문은 건너뛴다)
  const jong = w => { w = w.replace(/\s*\(.*\)$/, ''); const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 !== 0; };
  const ga = w => w + (jong(w) ? '이' : '가');
  const eul = w => w + (jong(w) ? '을' : '를');
  const fmtT = s => {
    if (!Number.isFinite(s)) return '∞';
    s = Math.round(s);
    if (s < 60) return s + '초';
    if (s < 3600) return Math.floor(s / 60) + '분' + (s % 60 ? ' ' + (s % 60) + '초' : '');
    const m = Math.round((s % 3600) / 60);
    return Math.floor(s / 3600) + '시간' + (m ? ' ' + m + '분' : '');
  };

  /* ---------- 분석 (결정적: 하트비트 시각이 정해져 있으므로 끝까지 계산해 둔다) ---------- */
  function lanes() {
    const udp = P.proto === 'udp', L = [];
    if (P.link === 'home') L.push({ key: 'nat', idx: 0, name: '가정 공유기(NAT)', T: udp ? 60 : 3600 });
    else L.push({ key: 'cgnat', idx: 0, name: '통신사 공유기(CGNAT)', T: udp ? 30 : 600 });
    if (P.fw) L.push({ key: 'fw', idx: 1, name: '회사·PC방 방화벽', T: P.proto === 'udp' ? 120 : 300 });
    L.push({ key: 'lb', idx: 2, name: '로드밸런서', T: P.lb });
    L.push({ key: 'srv', idx: 3, name: '게임 서버 무응답 판정', T: P.srv > 0 ? P.srv : Infinity });
    if (!udp) L.push({ key: 'ka', idx: 4, name: 'TCP keepalive (서버)', T: P.ka ? 60 : 7200, ka: true });
    return L;
  }
  function analyze() {
    const L = lanes(), H = 9000, tcp = P.proto === 'tcp';
    const appStop = P.link === 'mobile' && P.bg ? 10 : Infinity;
    const hbs = [];
    if (P.hb > 0) for (let x = P.hb; x <= H && x <= appStop + 1e-9; x += P.hb) hbs.push(x);
    const kaIdle = P.ka ? 60 : 7200, kaInt = P.ka ? 10 : 75, kaCnt = P.ka ? 3 : 9;
    let lastAny = 0, lastApp = 0, hi = 0, Tc = Infinity, culprit = null;
    const kas = [];
    for (let guard = 0; guard < 5000; guard++) {
      const nHb = hi < hbs.length ? hbs[hi] : Infinity;
      const nKa = tcp ? lastAny + kaIdle : Infinity;
      let exp = Infinity, who = null;
      L.forEach(l => { if (l.ka) return; const e = (l.key === 'srv' ? lastApp : lastAny) + l.T; if (e < exp) { exp = e; who = l; } });
      const nPk = Math.min(nHb, nKa);
      if (exp <= nPk) { if (exp <= H) { Tc = exp; culprit = who; } break; }
      if (nPk > H) break;
      if (nHb <= nKa) { lastAny = lastApp = nHb; hi++; } else { lastAny = nKa; kas.push(nKa); }
    }
    const R = {}; L.forEach(l => { R[l.key] = []; });
    const add = (x, f) => L.forEach(l => { if (f(l)) R[l.key].push(x); });
    hbs.filter(x => x < Tc).forEach(x => add(x, () => true));
    kas.filter(x => x < Tc).forEach(x => add(x, l => l.key !== 'srv'));
    let notice = Infinity, noticeBy = null, kaFail = null;
    if (culprit && culprit.key === 'srv') { notice = Tc; noticeBy = 'srv'; }
    else if (culprit) {
      const ci = culprit.idx;
      hbs.filter(x => x > Tc).forEach(x => add(x, l => l.idx < ci));         // 끊긴 곳 앞(내 쪽) 장비는 하트비트를 계속 본다
      const sl = L.find(l => l.key === 'srv');
      if (Number.isFinite(sl.T)) { notice = lastApp + sl.T; noticeBy = 'srv'; }
      if (tcp) {
        const p1 = lastAny + kaIdle, dead = p1 + kaInt * kaCnt;
        kaFail = { p1, dead };
        // 리눅스: 쉰 지 kaIdle초에 첫 확인, kaInt초 간격으로 모두 kaCnt번 보내고, 마지막 확인 뒤 kaInt초가 더 지나면 끊는다
        for (let k = 0; k < kaCnt; k++) add(p1 + k * kaInt, l => l.idx > ci && l.idx < 3);   // 서버 쪽 장비만 확인 패킷을 본다
        if (dead < notice) { notice = dead; noticeBy = 'ka'; }
      }
    }
    L.forEach(l => {
      const rs = R[l.key].sort((a, b) => a - b);
      if (l.ka) { l.E = kaFail ? kaFail.p1 : Infinity; l.end = kaFail ? l.E : Tc; l.rs = rs.filter(x => x < l.end); return; }
      if (l === culprit) { l.E = Tc; l.rs = rs.filter(x => x < Tc); return; }
      let last = 0, E = Infinity;
      for (const r of rs) { if (r - last >= l.T) { E = last + l.T; break; } last = r; }
      if (!Number.isFinite(E)) E = last + l.T;
      l.E = E > H ? Infinity : E;
      l.rs = rs.filter(x => x < l.E);
    });
    const ghost = !!culprit && culprit.key !== 'srv' && notice - Tc > 60;
    const finite = L.filter(l => !l.ka && Number.isFinite(l.T));
    const minL = finite.reduce((a, l) => (!a || l.T < a.T ? l : a), null);
    return { L, hbs, kas, Tc, culprit, notice, noticeBy, kaFail, ghost, appStop, minL, tcp, kaInt, kaCnt };
  }
  let A = analyze();

  /* ---------- 무대 ---------- */
  const legend = '<span class="legend"><span><i class="box" style="background:var(--s1)"></i>유휴 타이머</span><span><i style="background:var(--s2);width:3px;height:11px"></i>하트비트</span><span><i class="dot" style="background:var(--s3)"></i>keepalive</span></span>';
  let rowsN = A.L.length;
  const tcv = K.canvas(F.stage, { height: w => layoutH(w, rowsN), caption: '장비별 유휴 타이머 (가득 차면 연결을 지움)', right: legend });
  K.addStyle('timeouts', `
.sim[data-sim="timeouts"] .cv-cap{flex-wrap:wrap}
.to-play{display:flex;flex-wrap:wrap;align-items:end;gap:8px 12px}
.to-play .ctl{flex:1 1 200px}
.to-log{max-height:none}
.to-log div{grid-template-columns:5.6em minmax(0,1fr)}
.to-log .fut{opacity:.45}
`);
  const playRow = K.el('div', { class: 'to-play' });
  const logEl = K.el('div', { class: 'log to-log', 'aria-label': '사건 기록' });
  F.stage.append(playRow, logEl);
  let ph = K.reducedMotion ? MAXT : 0, playing = !K.reducedMotion;
  const bPlay = K.button(playRow, { label: playing ? '일시정지' : '재생', kind: 'small', onClick: () => { if (ph >= MAXT) ph = 0; playing = !playing; syncBtn(); } });
  K.button(playRow, { label: '처음부터', kind: 'small', onClick: () => { ph = 0; playing = true; syncBtn(); } });
  const sPh = K.slider(playRow, { label: '시각 (1초 = 20초로 빨리 감기)', min: 0, max: MAXT, step: 1, value: ph, fmt: fmtT, onInput: v => { ph = v; playing = false; syncBtn(); } });
  function syncBtn() { bPlay.textContent = playing ? '일시정지' : ph >= MAXT ? '다시 재생' : '재생'; }

  /* ---------- 조작부 ---------- */
  const g1 = K.group(F.controls, '연결');
  const cProto = K.choice(g1, { label: '프로토콜', value: P.proto, options: [['udp', 'UDP'], ['tcp', 'TCP']], onChange: v => {
    if (P.lb === LB_DEF[P.proto]) { P.lb = LB_DEF[v]; sLb.set(P.lb, false); }   // 기본값이면 프로토콜에 맞는 기본값으로
    P.proto = v; changed();
  } });
  const cLink = K.choice(g1, { label: '연결 방식', value: P.link, options: [['home', '유선·와이파이'], ['mobile', '모바일']], onChange: v => { P.link = v; changed(); } });
  const tBg = K.toggle(g1, { label: '백그라운드 전환 (모바일)', value: P.bg, onChange: v => { P.bg = v; changed(); }, hint: '게임 루프에서 하트비트를 보내면 앱을 내리는 즉시 멈춥니다(유니티 등 엔진은 내리면 루프를 세움). 이 실험은 하트비트를 따로 보내는 네트워크 스레드가 있어, OS가 앱을 얼리는 10초 뒤까지 버틴다고 둡니다(안드로이드 14 이상 약 10초, iOS는 몇 초~몇십 초).' });
  const tFw = K.toggle(g1, { label: '회사·PC방 방화벽 거침', value: P.fw, onChange: v => { P.fw = v; changed(); }, hint: '이 실험 값은 UDP 2분, TCP 5분입니다(TCP를 짧게 설정한 곳). 기본값은 장비마다 달라 UDP 30초~3분, TCP 30분~1시간이 흔합니다.' });
  const g2 = K.group(F.controls, '클라이언트');
  const sHb = K.slider(g2, { label: '하트비트 간격', min: 0, max: 300, step: 5, value: P.hb, fmt: v => (v ? fmtT(v) : '끔'), onInput: v => { P.hb = v; changed(); }, hint: '하트비트: 할 일이 없어도 “살아 있어요”라고 보내는 작은 패킷' });
  const g3 = K.group(F.controls, '타임아웃 설정');
  const sLb = K.slider(g3, { label: '로드밸런서 유휴 타임아웃', min: 30, max: 3600, step: 10, value: P.lb, fmt: fmtT, onInput: v => { P.lb = v; changed(); }, hint: '알리지 않고 지우는 방식 기준입니다. 기본값 예: AWS NLB는 TCP 350초·UDP 120초(UDP는 바꿀 수 없음), Azure Load Balancer는 TCP 4분. AWS ALB(60초)는 시간이 되면 서버 쪽 연결도 닫아 서버가 곧 압니다.' });
  const sSrv = K.slider(g3, { label: '서버 무응답 판정', min: 0, max: 120, step: 5, value: P.srv, fmt: v => (v ? fmtT(v) : '끔'), onInput: v => { P.srv = v; changed(); }, hint: '게임 서버가 하트비트·입력을 이만큼 못 받으면 접속을 정리합니다.' });
  const tKa = K.toggle(g3, { label: '짧은 keepalive 설정 (60초)', value: P.ka, onChange: v => { P.ka = v; changed(); }, hint: 'TCP 전용. 기본값은 2시간 동안 조용해야 첫 확인 패킷을 보냅니다.' });

  function dim(el, off) { el.style.opacity = off ? 0.45 : ''; el.querySelectorAll('input').forEach(i => { i.disabled = off; }); }
  const ctlSet = () => { cProto.set(P.proto, false); cLink.set(P.link, false); tBg.set(P.bg, false); tFw.set(P.fw, false); sHb.set(P.hb, false); sLb.set(P.lb, false); sSrv.set(P.srv, false); tKa.set(P.ka, false); };
  const preset = o => () => { Object.assign(P, DEF, o); ctlSet(); changed(); ph = 0; playing = !K.reducedMotion; if (!playing) ph = MAXT; syncBtn(); };
  K.presets(F, [
    { label: '하트비트 없음 (UDP)', apply: preset({ srv: 0 }) },
    { label: '하트비트 30초', apply: preset({ hb: 30, srv: 90 }) },
    { label: '모바일 백그라운드', apply: preset({ link: 'mobile', bg: true, hb: 10, srv: 60 }) },
    { label: '로드밸런서 60초', apply: preset({ proto: 'tcp', hb: 120, lb: 60, srv: 0 }) },
    { label: '회사 방화벽', apply: preset({ proto: 'tcp', fw: true, srv: 0, lb: LB_DEF.tcp }) },
  ]);

  const stCut = K.stat(F.stats, { label: '끊기는 시점' });
  const stWho = K.stat(F.stats, { label: '범인' });
  const stSrv = K.stat(F.stats, { label: '서버가 아는 시점' });
  const stGhost = K.stat(F.stats, { label: '유령 접속 위험' });

  /* ---------- 배치 ---------- */
  function lay(w, n) {
    const wide = w >= 600;
    const px0 = wide ? 158 : 10, px1 = w - (wide ? 16 : 10);
    const lab = wide ? 0 : 15;              // 좁을 때는 이름표를 줄 위에
    const rh = wide ? 28 : 18, gap = wide ? 14 : 10;
    let y = 24;
    const pk = { y: y + lab, h: wide ? 22 : 18, ly: y }; y += lab + pk.h + gap;
    const rows = [];
    for (let i = 0; i < n; i++) { rows.push({ y: y + lab, h: rh, ly: y }); y += lab + rh + gap; }
    const gh = { y: y + lab, h: wide ? 22 : 18, ly: y }; y += lab + gh.h;
    return { wide, px0, px1, pw: px1 - px0, pk, rows, gh, axisY: y + 12, H: y + 26 };
  }
  function layoutH(w, n) { return lay(w, n).H; }

  /* ---------- 그리기 ---------- */
  function hatch(ctx, x, y, w, h, color) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = x - h; k < x + w; k += 6) { ctx.moveTo(k, y + h); ctx.lineTo(k + h, y); }
    ctx.stroke(); ctx.restore();
  }
  function marker(ctx, G, x, y, h, text, color, weight) {
    ctx.fillStyle = color; ctx.fillRect(Math.round(x) - 1, y - 3, 2, h + 6);
    ctx.font = K.font(11, weight);
    const tw = ctx.measureText(text).width;
    const right = x + 6 + tw < G.px1;
    const tx = right ? x + 5 : x - 5, ty = y + h / 2;
    ctx.fillStyle = K.alpha(K.C.paper, 0.9); K.rr(ctx, right ? tx - 2 : tx - tw - 2, ty - 8, tw + 4, 16, 3); ctx.fill();
    K.text(ctx, text, tx, ty, { size: 11, weight, color: color === K.C.bad ? K.C.badInk : K.C.ink, align: right ? 'left' : 'right' });
  }
  function draw() {
    const { ctx, w, h } = tcv, C = K.C;
    ctx.clearRect(0, 0, w, h);
    const G = lay(w, A.L.length);
    const X = s => G.px0 + Math.min(s, MAXT) / MAXT * G.pw;
    const labels = [];               // 이름표는 흐림·재생선 위에 마지막으로 그린다
    const label = (row, name, sub) => labels.push(() => {
      if (G.wide) {
        K.text(ctx, name, 10, row.y + row.h / 2 - (sub ? 7 : 0), { size: 12, weight: 600, color: C.ink2 });
        if (sub) K.text(ctx, sub, 10, row.y + row.h / 2 + 8, { size: 10.5, mono: true, color: C.muted });
      } else {
        const t = name + (sub ? ' · ' + sub : '');
        ctx.font = K.font(11, 600);
        ctx.fillStyle = C.paper; ctx.fillRect(G.px0 - 2, row.ly - 1, ctx.measureText(t).width + 6, 14);
        K.text(ctx, t, G.px0, row.ly + 6, { size: 11, weight: 600, color: C.ink2 });
      }
    });
    // 시간 격자
    const step = G.wide ? 60 : 120;
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (let s = 0; s <= MAXT; s += step) {
      const x = Math.round(X(s)) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, G.pk.y); ctx.lineTo(x, G.gh.y + G.gh.h); ctx.stroke();
      K.text(ctx, s ? s / 60 + '분' : '0', x, G.axisY, { size: 10.5, mono: true, color: C.muted, align: s === MAXT ? 'right' : s ? 'center' : 'left' });
    }
    // 지나가는 패킷 줄
    label(G.pk, '지나가는 패킷', null);
    const pk = G.pk;
    if (Number.isFinite(A.appStop) && A.appStop < MAXT) {
      hatch(ctx, X(A.appStop), pk.y, G.px1 - X(A.appStop), pk.h, K.alpha(C.muted, 0.35));
      if (!A.hbs.some(x => x > A.appStop && x < MAXT)) K.text(ctx, '앱 정지 (백그라운드)', X(A.appStop) + 6, pk.y + pk.h / 2, { size: 10.5, color: C.muted, weight: 600 });
    }
    if (!A.hbs.length && !A.kas.length && !(Number.isFinite(A.appStop) && A.appStop < MAXT)) K.text(ctx, P.hb ? '' : '하트비트 없음: 아무 패킷도 지나가지 않음', G.px0 + 4, pk.y + pk.h / 2, { size: 10.5, color: C.muted });
    A.hbs.forEach(x => {
      if (x > MAXT) return;
      const lost = x > A.Tc;
      ctx.fillStyle = lost ? 'transparent' : C.s2;
      ctx.strokeStyle = C.s2; ctx.lineWidth = 1;
      if (lost) ctx.strokeRect(X(x) - 1, pk.y + 2.5, 2, pk.h - 5); else ctx.fillRect(X(x) - 1.5, pk.y + 2, 3, pk.h - 4);
    });
    const probes = A.kas.slice();
    if (A.kaFail) for (let k = 0; k < A.kaCnt; k++) probes.push(A.kaFail.p1 + k * A.kaInt);
    probes.forEach(x => {
      if (x > MAXT) return;
      const fail = A.kaFail && x >= A.kaFail.p1;
      ctx.beginPath(); ctx.arc(X(x), pk.y + pk.h / 2, 4, 0, Math.PI * 2);
      if (fail) { ctx.strokeStyle = C.s3; ctx.lineWidth = 1.5; ctx.stroke(); } else { ctx.fillStyle = C.s3; ctx.fill(); }
    });
    // 장비별 타이머
    A.L.forEach((l, i) => {
      const r = G.rows[i];
      label(r, l.name, Number.isFinite(l.T) ? fmtT(l.T) : '끔');
      ctx.fillStyle = C.sunk; ctx.fillRect(G.px0, r.y, G.pw, r.h);
      if (!Number.isFinite(l.T)) { K.text(ctx, '판정 안 함: 서버는 조용한 플레이어를 내보내지 않음', G.px0 + 6, r.y + r.h / 2, { size: 10.5, color: C.muted }); return; }
      const endT = Math.min(l.ka ? l.end : l.E, MAXT);
      const Y = f => r.y + r.h - Math.min(1, f) * r.h;
      ctx.beginPath(); ctx.moveTo(X(0), Y(0));
      let last = 0;
      l.rs.forEach(x => { if (x > endT) return; ctx.lineTo(X(x), Y((x - last) / l.T)); ctx.lineTo(X(x), Y(0)); last = x; });
      ctx.lineTo(X(endT), Y((endT - last) / l.T));
      const tip = [X(endT), Y((endT - last) / l.T)];
      ctx.lineTo(X(endT), Y(0)); ctx.closePath();
      ctx.fillStyle = K.alpha(C.s1, 0.28); ctx.fill();
      ctx.beginPath(); ctx.moveTo(X(0), Y(0)); last = 0;
      l.rs.forEach(x => { if (x > endT) return; ctx.lineTo(X(x), Y((x - last) / l.T)); ctx.moveTo(X(x), Y(0)); last = x; });
      ctx.lineTo(tip[0], tip[1]);
      ctx.strokeStyle = C.s1; ctx.lineWidth = 1.5; ctx.stroke();
      if (l.E <= MAXT) {
        const x = X(l.E);
        if (l.ka && A.kaFail) {
          const d = Math.min(A.kaFail.dead, MAXT);
          ctx.fillStyle = K.alpha(C.warn, 0.3); ctx.fillRect(x, r.y, X(d) - x, r.h);
          if (A.kaFail.dead <= MAXT) { ctx.fillStyle = K.alpha(C.bad, 0.22); ctx.fillRect(X(d), r.y, G.px1 - X(d), r.h); }
          marker(ctx, G, A.kaFail.dead <= MAXT ? X(d) : x, r.y, r.h, A.kaFail.dead <= MAXT ? '확인 실패: 서버가 알아챔' : '확인 패킷 무응답', A.kaFail.dead <= MAXT ? C.ink : C.warn, 600);
        } else {
          ctx.fillStyle = K.alpha(C.bad, l === A.culprit ? 0.3 : 0.14); ctx.fillRect(x, r.y, G.px1 - x, r.h);
          const txt = l === A.culprit ? (l.key === 'srv' ? '서버가 내보냄' : '여기서 끊김') : l.key === 'srv' ? '서버가 알아챔' : '뒤늦게 만료';
          marker(ctx, G, x, r.y, r.h, txt, l === A.culprit ? C.bad : C.ink2, l === A.culprit || l.key === 'srv' ? 700 : 400);
        }
      } else if (l.T > MAXT) {
        K.text(ctx, (l.ka ? '첫 확인은 ' : '가득 차려면 ') + fmtT(l.T) + ' →', G.px1 - 6, r.y + r.h / 2, { size: 10.5, color: C.muted, align: 'right' });
      }
    });
    // 서버가 보는 캐릭터
    const gh = G.gh;
    label(gh, '서버가 보는 캐릭터', null);
    const tc = Math.min(A.Tc, MAXT), tn = Math.min(A.notice, MAXT);
    const seg = (a, b, fill, text, tcol, hatchCol) => {
      if (b <= a) return;
      ctx.fillStyle = fill; ctx.fillRect(X(a), gh.y, X(b) - X(a), gh.h);
      if (hatchCol) hatch(ctx, X(a), gh.y, X(b) - X(a), gh.h, hatchCol);
      ctx.font = K.font(10.5, 600);
      if (ctx.measureText(text).width < X(b) - X(a) - 8) K.text(ctx, text, X(a) + 5, gh.y + gh.h / 2, { size: 10.5, weight: 600, color: tcol });
    };
    seg(0, tc, K.alpha(C.good, 0.22), A.culprit ? '접속 중' : '접속 중 (끊기지 않음)', C.goodInk);
    if (A.culprit && A.culprit.key !== 'srv') seg(tc, tn, K.alpha(C.bad, 0.12), A.ghost ? '유령: 실제로는 끊겼는데 서버는 접속 중으로 앎' : '서버는 아직 모름', C.badInk, K.alpha(C.bad, 0.35));
    if (A.culprit) seg(tn, MAXT, C.sunk, '정리됨', C.muted);
    // 아직 오지 않은 시간은 흐리게, 재생 위치
    const xp = X(ph);
    if (ph < MAXT) { ctx.fillStyle = K.alpha(C.paper, 0.62); ctx.fillRect(xp, G.pk.y - 2, G.px1 - xp + 1, gh.y + gh.h - G.pk.y + 4); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(Math.round(xp) + 0.5, 15); ctx.lineTo(Math.round(xp) + 0.5, gh.y + gh.h + 2); ctx.stroke();
    K.text(ctx, fmtT(ph), K.clamp(xp, G.px0 + 24, G.px1 - 24), 7, { size: 11, weight: 700, mono: true, color: C.ink, align: 'center' });
    labels.forEach(f => f());
  }
  K.hover(tcv, (x, y) => {
    const G = lay(tcv.w, A.L.length);
    if (x < G.px0 || x > G.px1) return null;
    const s = (x - G.px0) / G.pw * MAXT;
    const i = G.rows.findIndex(r => y >= r.y - 4 && y <= r.y + r.h + 4);
    if (i < 0) return `<b>${fmtT(s)}</b>`;
    const l = A.L[i];
    if (!Number.isFinite(l.T)) return `<b>${l.name}</b><br>꺼져 있음`;
    if (s >= l.E) return `<b>${l.name}</b> · ${fmtT(s)}<br>${l.ka ? '확인 패킷에 답이 없음' : '이미 이 연결을 지움'}`;
    const last = l.rs.filter(r => r <= s).pop() || 0;
    return `<b>${l.name}</b> · ${fmtT(s)}<br>조용한 시간 ${fmtT(s - last)} / 한도 ${fmtT(l.T)}`;
  });

  /* ---------- 수치·해설 ---------- */
  function changed() {
    A = analyze();
    dim(tBg.el, P.link !== 'mobile');
    dim(tKa.el, P.proto !== 'tcp');
    if (rowsN !== A.L.length) { rowsN = A.L.length; tcv.fit && tcv.fit(); }
    const c = A.culprit;
    stCut.set(c ? fmtT(A.Tc) : '끊기지 않음', c ? 'bad' : 'good', c ? '조용해진 뒤' : '10분 넘게 지켜봄');
    stWho.set(c ? c.name.replace(' 무응답 판정', '').replace(/\s*\(.*\)$/, '') : '없음', c ? 'bad' : 'good', c ? (c.key === 'srv' ? '서버가 직접 정리' : '알리지 않고 지움') : '타이머가 제때 초기화');
    if (!c) stSrv.set('—', null, '끊긴 적이 없음');
    else if (c.key === 'srv') stSrv.set(fmtT(A.notice), 'good', '서버가 직접 끊음');
    else if (Number.isFinite(A.notice)) stSrv.set(fmtT(A.notice), A.ghost ? 'bad' : 'warn', `끊긴 뒤 ${fmtT(A.notice - A.Tc)}`);
    else stSrv.set('끝까지 모름', 'bad', 'UDP는 스스로 확인 안 함');
    stGhost.set(A.ghost ? '예' : '아니오', A.ghost ? 'bad' : 'good', A.ghost ? (Number.isFinite(A.notice) ? `${fmtT(A.notice - A.Tc)} 동안 캐릭터가 남음` : '캐릭터가 계속 남음') : c ? '서버가 곧 정리' : '끊긴 적이 없음');
    F.say(narrate());
  }
  function events() {
    const ev = [];
    if (Number.isFinite(A.appStop)) ev.push([A.appStop, '앱이 백그라운드에서 멈춤. 하트비트가 더는 나가지 않음', '']);
    const lostHb = A.culprit ? A.hbs.find(x => x > A.Tc) : null;
    A.L.forEach(l => {
      if (l.ka || !Number.isFinite(l.E)) return;
      if (l === A.culprit) ev.push([l.E, l.key === 'srv' ? '게임 서버가 무응답으로 보고 플레이어를 내보냄' : `${ga(l.name)} 연결을 지움 (여기서 끊김)`, 'bad']);
      else if (l.key !== 'srv') ev.push([l.E, `${l.name}도 뒤늦게 이 연결을 지움`, '']);
    });
    if (lostHb != null) ev.push([lostHb, '다음 하트비트가 나갔지만 서버에 닿지 못함', 'warn']);
    if (A.kaFail) ev.push([A.kaFail.p1, '서버의 keepalive 확인 패킷에 답이 없음. 몇 번 더 물어봄', 'warn']);
    if (A.culprit && A.culprit.key !== 'srv') ev.push([A.notice, Number.isFinite(A.notice) ? '서버가 끊김을 알아채고 캐릭터를 정리' : '서버는 끝까지 모름. 캐릭터가 남아 있음', Number.isFinite(A.notice) ? '' : 'bad']);
    if (!A.culprit) ev.push([MAXT, '10분 동안 아무도 끊지 않음', '']);
    return ev.sort((a, b) => a[0] - b[0]);
  }
  let logSig = '';
  function renderLog() {
    const ev = events();
    const sig = ev.map(e => e[0] + e[1] + (e[0] <= ph)).join('|');
    if (sig === logSig) return;
    logSig = sig;
    logEl.innerHTML = '';
    ev.forEach(([t, txt, cls]) => logEl.append(K.el('div', { class: t > ph ? 'fut' : '' },
      K.el('span', { class: 't', text: Number.isFinite(t) ? fmtT(t) : '끝까지' }), K.el('span', { class: cls, text: txt }))));
  }
  function narrate() {
    const c = A.culprit, m = A.minL;
    const rec = m ? Math.max(5, Math.floor(m.T / 2 / 5) * 5) : 30;
    const bgStop = Number.isFinite(A.appStop);
    if (!c) {
      // TCP에서 짧은 keepalive가 켜져 있으면 하트비트가 없거나 뜸해도 운영체제의 확인 패킷(1분)이 타이머를 되돌린다
      const kaOn = A.tcp && P.ka, byKa = kaOn && (!P.hb || P.hb > 60);
      const iv = byKa ? 60 : P.hb;
      const safe = m && iv <= m.T / 2;
      const src = byKa ? `운영체제의 TCP keepalive 확인 패킷이 ${fmtT(60)}마다` : `하트비트가 ${fmtT(P.hb)}마다`;
      return `${K.flag(safe ? 'good' : 'warn')}${src} 지나가서 모든 장비의 타이머가 가득 차기 전에 0으로 돌아갑니다. 가장 짧은 타임아웃은 <b>${m.name} ${fmtT(m.T)}</b>입니다. ` +
        (safe ? '간격이 그 절반 이하라 패킷 하나가 늦거나 사라져도 버팁니다.' : `간격이 그 절반을 넘어서, 패킷 하나만 늦거나 사라져도 끊길 수 있습니다. ${fmtT(rec)} 이하로 줄이는 편이 안전합니다.`) +
        (byKa ? ' 다만 keepalive는 운영체제가 보내므로 게임이 멈춰도 계속 나갑니다. 게임이 살아 있는지는 하트비트로 따로 확인해야 합니다.' : '');
    }
    let why;
    if (bgStop) why = `휴대폰이 백그라운드로 가고 10초 뒤 OS가 앱을 멈춰 하트비트가 끊겼습니다. 그 뒤로 조용한 시간이 ${eul(fmtT(c.T))} 넘자`;
    else if (!P.hb) why = `하트비트가 없어 이 연결에는 ${fmtT(c.T)} 동안 아무 패킷도 지나가지 않았고, 그러자`;
    else why = `하트비트 간격(${fmtT(P.hb)})이 ${c.key === 'srv' ? '서버의 무응답 판정' : c.name + '의 타임아웃'}(${fmtT(c.T)})보다 길어서`;
    if (c.key === 'srv') {
      return `${K.flag('bad')}${why} <b>${fmtT(A.Tc)}</b>에 <b>게임 서버</b>가 플레이어를 응답 없음으로 보고 내보냈습니다. 가만히 있던 플레이어가 다시 움직이면 접속 끊김 화면이 뜹니다. 서버가 직접 끊었으니 유령 접속은 남지 않습니다. ` +
        (bgStop ? '백그라운드에서는 하트비트를 보낼 수 없으니, 복귀하면 자동으로 빠르게 재접속하는 흐름을 만들어 두어야 합니다.' : `<b>해결:</b> 하트비트를 가장 짧은 타임아웃의 절반 이하, 예를 들어 ${fmtT(rec)}마다 보내세요.`);
    }
    let s = `${K.flag('bad')}${why} <b>${fmtT(A.Tc)}</b>에 <b>${c.name}</b>${ga(c.name).slice(c.name.length)} 이 연결을 기억에서 지웠습니다. 플레이어는 가만히 있다가 다시 움직이는 순간 반응이 없다가 튕깁니다(접속 끊김). `;
    if (A.ghost) s += `그런데 서버는 ${Number.isFinite(A.notice) ? `${fmtT(A.notice - A.Tc)} 동안(${A.noticeBy === 'ka' ? 'TCP keepalive 확인이 실패할 때까지' : '무응답 판정까지'})` : '끝까지'} 이 사실을 모릅니다. 서버에는 캐릭터가 그대로 남아(유령 접속) 재접속하면 “이미 접속 중” 오류가 나고, 필드에 멍하니 선 캐릭터가 공격받기도 합니다. `;
    else s += `서버는 ${fmtT(A.notice)}에 ${A.noticeBy === 'ka' ? 'TCP keepalive 확인으로' : '무응답 판정으로'} 알아채고 캐릭터를 정리합니다. `;
    s += bgStop ? '백그라운드에서는 하트비트를 보낼 수 없으니, 복귀하면 자동 재접속하고 서버는 짧은 무응답 판정으로 캐릭터를 정리해야 합니다.'
      : `<b>해결:</b> 하트비트를 가장 짧은 타임아웃(${m.name} ${fmtT(m.T)})의 절반 이하, 예를 들어 ${fmtT(rec)}마다 보내고, 서버도 무응답 판정을 켜 두세요.`;
    return s;
  }
  changed();

  let lastSec = -1;
  K.loop(root, dt => {
    if (playing) {
      ph = Math.min(MAXT, ph + dt / 1000 * SPEED);
      if (ph >= MAXT) { playing = false; syncBtn(); }
    }
    if (Math.round(ph) !== lastSec) { lastSec = Math.round(ph); sPh.set(lastSec, false); }
    draw();
    renderLog();
  });
});
