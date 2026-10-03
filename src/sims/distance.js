/* 거리·경로·시간대: 빛의 속도가 정하는 최소 핑, 경로 우회, 저녁 피크의 국제 구간 혼잡.
   레이어 4(인터넷 회선) 장에서 쓴다. */
K.register('distance', function (root) {
  const TR = I18N.tr('sim-distance');   // 이 실험 묶음의 사전을 먼저 본다(i18n.js)
  const F = K.frame(root, {
    kicker: TR`레이어 4 · 인터넷 회선`,
    title: TR`거리·경로·시간대에 따른 핑`,
    lead: TR`패킷은 광케이블 속을 빛의 속도로 달리지만 광케이블 안의 빛은 초속 20만 km라 1,000km를 가는 데 5ms가 걸립니다. 실제 케이블은 바다와 국경을 따라 돌아가고 저녁에는 국제 구간이 붐빕니다. 서버 위치와 시간을 바꿔 보며 핑의 최솟값과 최댓값이 어떻게 정해지는지 보세요.`,
    tries: [
      TR`<b>서버 위치</b>를 미국 서부로 바꿔 보세요. 지도 위 패킷이 한참 걸려 건너가고 빛의 한계만으로도 왕복 80ms가 넘습니다.`,
      TR`<b>시각</b>을 오후에서 밤 10시로 옮겨 보세요. 평균보다 “최악 핑”이 훨씬 크게 오릅니다. 국제 구간이 붐비는 시간입니다.`,
      TR`<b>해저 케이블 장애</b>를 켜 보세요. 점선으로 우회 경로가 생기고 핑과 손실이 함께 오릅니다.`,
      TR`<b>내 위치</b>와 서버를 둘 다 서울로 두고 <b>가입자망</b>을 LTE로 바꿔 보세요. 거리가 0에 가까워도 모바일 회선만으로 35ms가 생깁니다.`,
    ],
    layout: 'side',
  });

  const CITY = {
    seoul: [TR`서울`, 37.57, 126.98, 'KR'], busan: [TR`부산`, 35.18, 129.08, 'KR'], tokyo: [TR`도쿄`, 35.68, 139.69, 'JP'],
    hk: [TR`홍콩`, 22.32, 114.17, 'HK'], sg: [TR`싱가포르`, 1.35, 103.82, 'SG'], syd: [TR`시드니`, -33.87, 151.21, 'AU'],
    fra: [TR`프랑크푸르트`, 50.11, 8.68, 'DE'], lon: [TR`런던`, 51.51, -0.13, 'UK'], use: [TR`미국 동부`, 38.9, -77.0, 'US'],
    usw: [TR`미국 서부`, 45.6, -121.2, 'US'], sp: [TR`상파울루`, -23.55, -46.63, 'BR'],
  };
  const ACC = { wired: [TR`유선`, 4, 1, 0], wifi: [TR`와이파이`, 8, 4, 0.001], lte: ['LTE', 35, 15, 0.003] };   // [이름, 지연, 지터, 손실]
  const CONG = [0.5, 0.3, 0.15, 0.08, 0.05, 0.05, 0.06, 0.1, 0.14, 0.16, 0.17, 0.18, 0.22, 0.2, 0.19, 0.2, 0.23, 0.28, 0.4, 0.58, 0.78, 0.94, 1.0, 0.88, 0.5];
  const DEF = { me: 'seoul', srv: 'tokyo', route: 1.5, acc: 'wired', hour: 14, cut: false };
  const P = Object.assign({}, DEF);
  const D = Math.PI / 180;

  K.addStyle('distance', '.sim[data-sim="distance"] .cv-cap{flex-wrap:wrap}.sim[data-sim="distance"] .cv-cap b{white-space:nowrap}');

  /* ---------- 계산 ---------- */
  function hav(a, b) {
    const [la1, lo1] = [a[1] * D, a[2] * D], [la2, lo2] = [b[1] * D, b[2] * D];
    const s = Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  // 한국·일본과 유럽 사이는 직선(시베리아) 위로 큰 케이블이 거의 없어 동남아·수에즈나 미국을 돌아간다.
  // 통신사 경로 우회(슬라이더)와 별개로 붙는 배수. 서울–프랑크푸르트 실측 약 230~270ms에 맞춘 값
  const EA = { KR: 1, JP: 1 }, EU = { DE: 1, UK: 1 };
  const geoOf = (a, b) => ((EA[a[3]] && EU[b[3]]) || (EA[b[3]] && EU[a[3]])) ? 1.8
    : ((a[3] === 'HK' && EU[b[3]]) || (b[3] === 'HK' && EU[a[3]])) ? 1.4 : 1;
  const cong = h => { const i = Math.floor(h) % 24, f = h - Math.floor(h); return K.lerp(CONG[i], CONG[i + 1], f); };
  function model() {
    const a = CITY[P.me], b = CITY[P.srv];
    const same = P.me === P.srv;
    const km = Math.max(30, hav(a, b));
    const light = 2 * km / 200;
    const geo = geoOf(a, b);
    const route = P.route * geo * (P.cut ? 1.7 : 1);
    const ac = ACC[P.acc];
    const base = light * route + ac[1] + 12 * 0.1;
    const scale = a[3] === b[3] ? 0.35 : km > 5000 ? 1.2 : 1.0;
    const at = h => {
      const f = cong(h), jm = 40 * f * scale;
      return { f, min: base, avg: base + jm / 3 + ac[2] / 3, p95: base + jm + ac[2], loss: 0.015 * f * f * scale + (P.cut ? 0.01 : 0) + ac[3] };
    };
    return { a, b, same, km, light, route, geo, base, scale, at, now: at(P.hour), intl: a[3] !== b[3] };
  }
  let M = model();

  /* ---------- 캔버스 ---------- */
  const mcv = K.canvas(F.stage, {
    height: w => K.clamp(w * 0.5, 210, 360), caption: TR`지도 위의 경로`,
    right: TR`<span class="legend"><span><i class="dot" style="background:var(--s1)"></i>내 위치</span><span><i class="dot" style="background:var(--s2)"></i>서버</span><span><i class="dot" style="background:var(--ink)"></i>패킷</span><span><i class="dot" style="border:1.5px solid var(--ink-2);box-sizing:border-box"></i>빛의 한계</span></span>`,
  });
  const ccv = K.canvas(F.stage, {
    height: w => K.clamp(w * 0.36, 190, 250), caption: TR`하루 동안의 예상 핑`,
    right: TR`<span class="legend"><span><i style="background:var(--s1)"></i>평균</span><span><i style="background:var(--s2)"></i>최악 (95%)</span><span><i style="background:var(--ink-2)"></i>빛의 한계</span></span>`,
  });

  /* ---------- 조작부 ---------- */
  const opts = Object.keys(CITY).map(k => [k, CITY[k][0]]);
  const g1 = K.group(F.controls, TR`어디서 어디로`);
  const cMe = K.choice(g1, { label: TR`내 위치`, value: P.me, options: opts, onChange: v => { P.me = v; changed(); } });
  const cSrv = K.choice(g1, { label: TR`서버 위치`, value: P.srv, options: opts, onChange: v => { P.srv = v; changed(); }, hint: TR`지도에서 도시를 눌러도 서버 위치가 바뀝니다.` });
  const g2 = K.group(F.controls, TR`경로`);
  const sRoute = K.slider(g2, { label: TR`경로 우회 정도`, min: 1, max: 3, step: 0.1, value: P.route, fmt: v => K.n(v, 1) + TR`배`, onInput: v => { P.route = v; changed(); }, hint: TR`직선 거리보다 실제 경로가 몇 배 긴지. 보통 1.3~2배입니다. 한국·일본↔유럽처럼 직선 위에 케이블이 없는 구간은 이 값에 1.8배가 더 붙습니다.` });
  const tCut = K.toggle(g2, { label: TR`해저 케이블 장애 (우회 경로)`, value: P.cut, onChange: v => { P.cut = v; changed(); } });
  const cAcc = K.choice(g2, { label: TR`가입자망`, value: P.acc, options: [['wired', TR`유선`], ['wifi', TR`와이파이`], ['lte', 'LTE']], onChange: v => { P.acc = v; changed(); } });
  const g3 = K.group(F.controls, TR`시간`);
  const hhmm = v => String(Math.floor(v) % 24).padStart(2, '0') + ':' + (v % 1 ? '30' : '00');
  const sHour = K.slider(g3, { label: TR`내 쪽 시각`, min: 0, max: 23.5, step: 0.5, value: P.hour, fmt: hhmm, onInput: v => { P.hour = v; changed(); }, hint: TR`저녁 9~11시 무렵은 모두가 영상을 보고 게임을 하는 시간이라 통신사 사이·국제 구간이 붐비기 쉽습니다.` });

  const ctlSet = () => { cMe.set(P.me, false); cSrv.set(P.srv, false); sRoute.set(P.route, false); tCut.set(P.cut, false); cAcc.set(P.acc, false); sHour.set(P.hour, false); };
  const preset = o => () => { Object.assign(P, DEF, o); ctlSet(); changed(); };
  const pre = K.presets(F, [
    { label: TR`서울 → 서울 서버`, apply: preset({ srv: 'seoul' }) },
    { label: TR`서울 → 도쿄`, apply: preset({}) },
    { label: TR`서울 → 미국 서부`, apply: preset({ srv: 'usw' }) },
    { label: TR`싱가포르 → 서울`, apply: preset({ me: 'sg', srv: 'seoul' }) },
    { label: TR`저녁 11시 해외`, apply: preset({ srv: 'fra', hour: 23 }) },
    { label: TR`해저 케이블 장애`, apply: preset({ srv: 'hk', cut: true, hour: 21 }) },
  ]);

  const stKm = K.stat(F.stats, { label: TR`직선 거리`, unit: 'km' });
  const stLight = K.stat(F.stats, { label: TR`빛의 한계 (왕복)` });
  const stAvg = K.stat(F.stats, { label: TR`예상 핑` });
  const stP95 = K.stat(F.stats, { label: TR`이 시간대 최악 핑`, sub: TR`100번 중 5번은 더 느림` });
  const stLoss = K.stat(F.stats, { label: TR`손실`, unit: '%' });

  /* ---------- 지도 ---------- */
  const WORLD = { lon0: -35, lon1: 325, lat0: 74, lat1: -52 };
  const nlon = l => ((((l + 35) % 360) + 360) % 360) - 35;     // 태평양 가운데 지도 (-35..325)
  const toV = (lat, lon) => [Math.cos(lat * D) * Math.cos(lon * D), Math.cos(lat * D) * Math.sin(lon * D), Math.sin(lat * D)];
  function gc(a, b, s) {             // 대권(지구 위 최단 경로) 위의 한 점 [lon, lat]
    const A = toV(a[1], a[2]), B = toV(b[1], b[2]);
    const dot = K.clamp(A[0] * B[0] + A[1] * B[1] + A[2] * B[2], -1, 1), w = Math.acos(dot);
    if (w < 1e-6) return [nlon(a[2]), a[1]];
    const k1 = Math.sin((1 - s) * w) / Math.sin(w), k2 = Math.sin(s * w) / Math.sin(w);
    const v = [k1 * A[0] + k2 * B[0], k1 * A[1] + k2 * B[1], k1 * A[2] + k2 * B[2]];
    return [nlon(Math.atan2(v[1], v[0]) / D), Math.asin(K.clamp(v[2], -1, 1)) / D];
  }
  const arcPts = (a, b, n = 64) => Array.from({ length: n + 1 }, (_, i) => gc(a, b, i / n));
  const wraps = pts => pts.some((p, i) => i && Math.abs(p[0] - pts[i - 1][0]) > 180);
  function targetView(w, h) {
    const pts = arcPts(M.a, M.b, 32);
    if (wraps(pts)) return WORLD;
    const lons = pts.map(p => p[0]), lats = pts.map(p => p[1]);
    const lo = Math.min(...lons), hi = Math.max(...lons), la = Math.min(...lats), lb = Math.max(...lats);
    const asp = (h - 30) / (w - 24);
    let ls = Math.max((hi - lo) * 1.4 + 14, 34), lt = ls * asp;
    const need = (lb - la) * 1.4 + 12;
    if (lt < need) { lt = need; ls = lt / asp; }
    if (ls >= 230 || lt >= 105) return WORLD;
    const cl = (lo + hi) / 2, ct = (la + lb) / 2;
    return { lon0: cl - ls / 2, lon1: cl + ls / 2, lat0: ct + lt / 2, lat1: ct - lt / 2 };
  }
  let view = null;
  function proj(lon, lat) {
    const { w, h } = mcv;
    return [12 + (lon - view.lon0) / (view.lon1 - view.lon0) * (w - 24), 12 + (view.lat0 - lat) / (view.lat0 - view.lat1) * (h - 40)];
  }
  const cityXY = c => proj(nlon(c[2]), c[1]);
  function detourCtrl() {            // 돌아가는 길: 직선 경로 가운데를 옆으로 밀어낸 곡선
    const A = cityXY(M.a), B = cityXY(M.b);
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
    const off = Math.max(24, (M.route - 1) * 0.35 * L);
    const m = gc(M.a, M.b, 0.5), mp = proj(m[0], m[1]);
    let nx = -dy / L, ny = dx / L;
    if (M.geo > 1 && ny < 0) { nx = -nx; ny = -ny; }   // 아시아–유럽은 남쪽(동남아·수에즈)으로 돌아간다
    return [A, [mp[0] + nx * off, mp[1] + ny * off], B];
  }
  const bez = ([A, Cp, B], s) => [(1 - s) ** 2 * A[0] + 2 * (1 - s) * s * Cp[0] + s * s * B[0], (1 - s) ** 2 * A[1] + 2 * (1 - s) * s * Cp[1] + s * s * B[1]];

  let animT = 0;
  function drawMap(dt) {
    const { ctx, w, h } = mcv, C = K.C;
    const tv = targetView(w, h);
    if (!view) view = Object.assign({}, tv);
    const k = K.reducedMotion ? 1 : 1 - Math.exp(-dt / 220);
    for (const key in tv) view[key] += (tv[key] - view[key]) * k;
    ctx.clearRect(0, 0, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h - 26); ctx.clip();
    // 점 격자 (해안선 없이 위도·경도만)
    const span = view.lon1 - view.lon0, stepD = span > 150 ? 10 : span > 60 ? 5 : 2.5;
    ctx.fillStyle = K.alpha(C.muted, 0.28);
    for (let lo = Math.ceil(view.lon0 / stepD) * stepD; lo <= view.lon1; lo += stepD) {
      for (let la = Math.ceil(view.lat1 / stepD) * stepD; la <= view.lat0; la += stepD) {
        const [x, y] = proj(lo, la); ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
      }
    }
    const [ex, ey] = proj(view.lon0, 0), [ex2] = proj(view.lon1, 0);
    if (ey > 8 && ey < h - 30) { ctx.strokeStyle = K.alpha(C.muted, 0.25); ctx.lineWidth = 1; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex2, ey); ctx.stroke(); ctx.setLineDash([]); if (w >= 520) K.text(ctx, TR`적도`, ex + 4, ey - 7, { size: 10, color: C.muted }); }
    // 최단 경로 (대권)
    const pts = arcPts(M.a, M.b).map(p => proj(p[0], p[1]));
    const wrap = wraps(arcPts(M.a, M.b, 64));
    ctx.strokeStyle = C.ink2; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => { if (i && Math.abs(p[0] - pts[i - 1][0]) > w / 2) ctx.moveTo(p[0], p[1]); else if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    ctx.stroke();
    const detour = !M.same && !wrap && (M.route >= 1.8 || P.cut);
    let dc = null;
    if (detour) {
      dc = detourCtrl();
      ctx.save(); ctx.strokeStyle = C.warn; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(dc[0][0], dc[0][1]); ctx.quadraticCurveTo(dc[1][0], dc[1][1], dc[2][0], dc[2][1]); ctx.stroke(); ctx.restore();
      const lp = bez(dc, 0.5), mid = pts[32];
      const nx = lp[0] - mid[0], ny = lp[1] - mid[1], nl = Math.hypot(nx, ny) || 1;
      const lx = lp[0] + nx / nl * 10, ly = lp[1] + ny / nl * 12;
      K.text(ctx, P.cut ? TR`장애 우회 경로` : TR`우회 경로`, lx, ly, { size: 11, weight: 600, align: nx < -2 ? 'right' : nx > 2 ? 'left' : 'center', color: C.warnInk });
    }
    // 도시
    const placed = [];
    const keys = Object.keys(CITY);
    const xy = {};
    keys.forEach(kk => { xy[kk] = cityXY(CITY[kk]); placed.push([xy[kk][0] - 4, xy[kk][1] - 4, 8, 8]); });
    pts.forEach((p, i) => { if (i % 3 === 0) placed.push([p[0] - 3, p[1] - 3, 6, 6]); });   // 이름표가 경로를 덮지 않게
    keys.forEach(kk => {
      const [x, y] = xy[kk];
      if (x < -10 || x > w + 10 || y < -10 || y > h) return;
      const sel = kk === P.me || kk === P.srv;
      if (!sel) K.dot(ctx, x, y, 2.5, C.muted, C.paper);
    });
    // 패킷과 빛
    const rtt = M.now.avg, per = Math.max(700, rtt * 20);
    if (!K.reducedMotion && !M.same) {
      const tm = (animT % per) / per * rtt;          // 경과한 실제 ms
      const half = rtt / 2;
      const s = tm < half ? tm / half : 2 - tm / half;
      const lh = M.light / 2;
      if (tm < M.light) {
        const g = tm < lh ? tm / lh : 2 - tm / lh;
        const gp = gc(M.a, M.b, g), [gx, gy] = proj(gp[0], gp[1]);
        ctx.strokeStyle = C.ink2; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(gx, gy, 5, 0, Math.PI * 2); ctx.stroke();
      }
      let px, py;
      if (dc) [px, py] = bez(dc, s); else { const pp = gc(M.a, M.b, s); [px, py] = proj(pp[0], pp[1]); }
      K.dot(ctx, px, py, 4.5, C.ink);
    }
    [[P.srv, C.s2], [P.me, C.s1]].forEach(([kk, col]) => { const [x, y] = xy[kk]; K.dot(ctx, x, y, 5.5, col, C.paper); });
    // 이름표: 선택된 도시 먼저, 겹치지 않는 자리에만
    const order = [P.me, P.srv].concat(keys.filter(kk => kk !== P.me && kk !== P.srv));
    const narrow = w < 560;
    const labels = [];   // 이미 놓은 이름표(선택된 도시는 배경까지 여유를 두고). 이름표끼리는 절대 겹치지 않게
    order.forEach((kk, i) => {
      if (i === 1 && P.me === P.srv) return;
      const sel = i < 2;
      if (!sel && narrow) return;
      const [x, y] = xy[kk];
      if (x < 0 || x > w || y < 0 || y > h - 28) return;
      const name = CITY[kk][0] + (sel && i === 0 ? (P.me === P.srv ? TR` (나·서버)` : TR` (나)`) : '');
      ctx.font = K.font(sel ? 12 : 10.5, sel ? 700 : 400);
      const tw = ctx.measureText(name).width, th = sel ? 14 : 12;
      const cand = [[x + 9, y - th / 2], [x - 9 - tw, y - th / 2], [x - tw / 2, y - 10 - th], [x - tw / 2, y + 9]];
      const inb = c => c[0] >= 2 && c[0] + tw <= w - 2 && c[1] >= 2 && c[1] + th <= h - 28;
      const hit = (c, rs) => rs.some(r => c[0] < r[0] + r[2] && c[0] + tw > r[0] && c[1] < r[1] + r[3] && c[1] + th > r[1]);
      // 1순위: 점·경로·이름표를 모두 피하는 자리. 선택된 도시는 없으면 경로를 덮더라도 다른 이름표만은 피한다
      let spot = cand.find(c => inb(c) && !hit(c, placed) && !hit(c, labels));
      if (!spot && sel) spot = cand.find(c => inb(c) && !hit(c, labels)) || cand.find(c => c[0] >= 2 && c[0] + tw <= w - 2) || cand[0];
      if (!spot) return;
      placed.push([spot[0], spot[1], tw, th]);
      labels.push(sel ? [spot[0] - 6, spot[1] - 3, tw + 12, th + 6] : [spot[0], spot[1], tw, th]);
      if (sel) { ctx.fillStyle = K.alpha(C.paper, 0.85); K.rr(ctx, spot[0] - 3, spot[1] - 1, tw + 6, th + 2, 4); ctx.fill(); }
      K.text(ctx, name, spot[0], spot[1] + th / 2, { size: sel ? 12 : 10.5, weight: sel ? 700 : 400, color: sel ? C.ink : C.muted });
    });
    ctx.restore();
    // 아래 설명 줄
    const info = M.same ? TR`같은 도시 안 (약 30km) · 왕복 ${K.ms(M.now.avg)}`
      : TR`왕복 ${K.ms(M.now.avg)} · 빛의 한계 ${K.ms(M.light)}` + (narrow ? '' : TR` · 패킷은 20배 느리게 표시`);
    K.text(ctx, info, 12, h - 12, { size: 11, color: C.ink2 });
    if (!narrow) K.text(ctx, TR`도시를 누르면 서버가 바뀝니다`, w - 12, h - 12, { size: 11, color: C.muted, align: 'right' });
  }
  function cityAt(x, y) {
    let best = null, bd = 18;
    Object.keys(CITY).forEach(kk => { const [cx, cy] = cityXY(CITY[kk]); const d = Math.hypot(cx - x, cy - y); if (d < bd) { bd = d; best = kk; } });
    return best;
  }
  mcv.cv.addEventListener('click', e => {
    const r = mcv.cv.getBoundingClientRect();
    const kk = cityAt(e.clientX - r.left, e.clientY - r.top);
    if (kk && kk !== P.srv) { P.srv = kk; cSrv.set(kk, false); pre.clear(); changed(); }
  });
  K.hover(mcv, (x, y) => {
    if (!view) return null;
    const kk = cityAt(x, y);
    if (!kk) return null;
    const c = CITY[kk], km = Math.max(30, hav(M.a, c));
    return kk === P.me ? TR`<b>${c[0]}</b> · 내 위치` : TR`<b>${c[0]}</b> · 내 위치에서 ${K.n(km)}km<br>빛의 한계 왕복 ${K.ms(2 * km / 200)}${kk === P.srv ? '' : TR`<br>누르면 이 도시를 서버로`}`;
  });

  /* ---------- 하루 차트 ---------- */
  let csc = null;
  function drawChart() {
    const { ctx, w, h } = ccv, C = K.C;
    ctx.clearRect(0, 0, w, h);
    const hrs = []; for (let x = 0; x <= 24; x += 0.5) hrs.push(x);
    const vals = hrs.map(x => M.at(x % 24));
    const top = Math.max(...vals.map(v => v.p95));
    const step = top > 400 ? 100 : top > 160 ? 50 : top > 60 ? 20 : 10;
    const yMax = Math.ceil(top * 1.08 / step) * step;
    const yt = []; for (let v = 0; v <= yMax; v += step) yt.push(v);
    while (yt.length > 6) { for (let i = yt.length - 2; i > 0; i -= 2) yt.splice(i, 1); }
    const box = { x: 44, y: 24, w: w - 56, h: h - 56 };
    csc = K.plot(ctx, box, { x0: 0, x1: 24, y0: 0, y1: yMax, yTicks: yt, yFmt: v => K.n(v), xTicks: w < 520 ? [0, 6, 12, 18, 24] : [0, 3, 6, 9, 12, 15, 18, 21, 24], xFmt: v => v + TR`시`, yTitle: TR`왕복 핑 (ms)` });
    // 저녁 피크 구간
    ctx.fillStyle = K.alpha(C.muted, 0.08);
    ctx.fillRect(csc.x(19), box.y, csc.x(24) - csc.x(19), box.h);
    K.text(ctx, TR`저녁 피크`, csc.x(21.5), box.y + 9, { size: 10.5, align: 'center', color: C.muted, weight: 600 });
    const band = hrs.map((x, i) => [x, vals[i].p95]);
    ctx.fillStyle = K.alpha(C.s1, 0.12);
    ctx.beginPath(); hrs.forEach((x, i) => { const X = csc.x(x), Y = csc.y(vals[i].min); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    for (let i = hrs.length - 1; i >= 0; i--) ctx.lineTo(csc.x(hrs[i]), csc.y(vals[i].p95));
    ctx.closePath(); ctx.fill();
    K.hline(ctx, csc, M.light, { color: C.ink2, dash: [4, 3] });
    K.line(ctx, csc, hrs.map((x, i) => [x, vals[i].avg]), C.s1, 2);
    K.line(ctx, csc, band, C.s2, 2);
    // 지금 시각
    const X = Math.round(csc.x(P.hour)) + 0.5;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X, box.y + 18); ctx.lineTo(X, box.y + box.h); ctx.stroke();
    K.dot(ctx, X, csc.y(M.now.avg), 4, C.s1);
    K.dot(ctx, X, csc.y(M.now.p95), 4, C.s2);
    K.text(ctx, TR`지금 ` + hhmm(P.hour), X + (P.hour > 18 ? -6 : 6), box.y + box.h - 10, { size: 11, weight: 600, color: C.ink, align: P.hour > 18 ? 'right' : 'left' });
  }
  K.hover(ccv, x => {
    if (!csc) return null;
    const hr = Math.round(((x - csc.box.x) / csc.box.w * 24) * 2) / 2;
    if (hr < 0 || hr > 24) return null;
    const v = M.at(hr % 24);
    return TR`<b>${hhmm(hr % 24)}</b><br>최소 ${K.ms(v.min)} · 평균 ${K.ms(v.avg)}<br>최악(95%) ${K.ms(v.p95)} · 손실 ${K.n(v.loss * 100, 1)}%`;
  });

  /* ---------- 수치·해설 ---------- */
  function changed() {
    M = model();
    const n = M.now;
    stKm.set(K.n(M.km), null, M.same ? TR`같은 도시 안` : `${M.a[0]} → ${M.b[0]}`);
    stLight.set(K.ms(M.light), null, TR`광케이블 직선 왕복`);
    const sa = n.avg <= 50 ? 'good' : n.avg <= 120 ? 'warn' : 'bad';
    const sp = n.p95 <= 80 ? 'good' : n.p95 <= 160 ? 'warn' : 'bad';
    stAvg.set(K.ms(n.avg), sa, TR`${hhmm(P.hour)} 평균`);
    stP95.set(K.ms(n.p95), sp);
    stLoss.set(K.n(n.loss * 100, 1), n.loss > 0.01 ? 'bad' : n.loss > 0.003 ? 'warn' : 'good');
    const st = sa === 'bad' || sp === 'bad' || n.loss > 0.01 ? 'bad' : sa === 'warn' || sp === 'warn' ? 'warn' : 'good';
    let m;
    if (M.same) {
      m = TR`같은 도시 안이라 거리는 30km 남짓, 빛의 한계는 왕복 ${K.ms(M.light)}뿐입니다. 핑 <b>${K.ms(n.avg)}</b>의 대부분은 ${ACC[P.acc][0]} 가입자망과 장비를 지나는 시간입니다.`;
    } else {
      m = TR`${M.a[0]}–${K.josa(M.b[0], 'eun')} 직선으로 약 <b>${K.n(Math.round(M.km / 10) * 10)}km</b>입니다. 빛도 광케이블 안에서는 왕복 <b>${K.ms(M.light)}</b>가 걸립니다. `;
      if (M.geo > 1) m += TR`${M.geo >= 1.8 ? TR`한국·일본` : TR`홍콩`}과 유럽 사이는 직선 위로 큰 케이블이 거의 없어, 패킷은 동남아·수에즈나 미국을 돌아갑니다. `;
      m += TR`실제 경로는 ${K.n(M.route, 1)}배쯤 돌아가고 가입자망·장비까지 더해 평균 <b>${K.ms(n.avg)}</b>입니다.`;
      if (P.cut) m += TR` 해저 케이블이 끊겨 먼 경로로 우회하느라 평소보다 ${K.ms(M.light * P.route * M.geo * 0.7)}가 늘고 손실도 생겼습니다.`;
    }
    if (n.f >= 0.6 && !M.same) m += TR` 지금 ${hhmm(P.hour)}은 저녁 피크라 ${M.intl ? TR`국제 구간` : TR`통신사 사이 구간`}이 붐빕니다. 100번 중 5번은 <b>${K.ms(n.p95)}</b>까지 튀고 손실도 ${K.n(n.loss * 100, 1)}%라 순간이동·고무줄이 섞입니다.`;
    m += n.avg <= 50 ? TR` 액션 전투에도 충분히 빠릅니다.`
      : n.avg <= 120 ? TR` 스킬 반응이 조금 늦게 느껴지는 입력 지연이 있고 가까운 서버의 플레이어보다 판정에서 불리합니다.`
        : TR` 입력 지연이 커서 회피·타이밍 판정에서 크게 불리합니다.`;
    if (M.km > 3000) m += TR` 서버 성능을 아무리 올려도 이 거리는 줄일 수 없어서 게임사는 지역마다 서버(리전)를 따로 둡니다.`;
    F.say(K.flag(st) + m);
  }
  changed();

  K.loop(root, dt => {
    animT += dt;
    drawMap(dt);
    drawChart();
  });
});
