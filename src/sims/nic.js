/* 서버 NIC: 패킷이 링 버퍼(우편함 칸)에 쌓이고, 큐마다 코어 하나가 꺼내 간다.
   칸이 다 차면 새로 온 패킷은 조용히 버려진다(ethtool -S의 rx_missed_errors 등, 이름은 드라이버마다 다름). 1ms 단위, 패킷 수로 계산(개별 패킷 아님). */
K.register('nic', function (root) {
  const F = K.frame(root, {
    kicker: TR`레이어 6 · 서버 NIC`,
    title: TR`서버 네트워크 카드가 패킷을 버리는 순간`,
    lead: TR`네트워크 카드(NIC)는 받은 패킷을 링 버퍼(수신 슬롯 묶음)에 넣고 인터럽트로 CPU에 알립니다. RSS는 패킷을 여러 수신 큐로 나눠 여러 CPU 코어가 처리하게 하는 기능입니다. 코어가 꺼내는 속도보다 빨리 쌓이면 슬롯이 다 차고, 그 뒤에 온 패킷은 버려집니다. 네트워크 카드 통계의 숫자만 올라갈 뿐 게임 서버 로그에는 아무 기록도 남지 않습니다.`,
    tries: [
      TR`<b>월드 보스 (150만 pps, RSS 1개)</b>를 누르세요(게이트웨이 규모의 극단적인 예). 코어 하나가 100%에 붙고 링 버퍼가 넘쳐 초당 수십만 개가 버려집니다.`,
      TR`이어서 <b>RSS 큐 수</b>를 8로 올려 보세요. 같은 양을 코어 8개가 나눠 받아 버림이 0이 됩니다.`,
      TR`<b>클라우드 PPS 한도 초과</b>: 서버 쪽 그림은 멀쩡한데 “한도 초과 버림”만 쌓입니다. CPU·링 버퍼 같은 평소 지표로는 원인이 안 보이는 경우입니다.`,
      TR`<b>몰림 정도</b>를 올리면 평균은 여유가 있어도 몰리는 순간에 슬롯이 모자랍니다. <b>링 버퍼 크기</b>를 키우면 버림은 줄지만 대기열이 길어져 지연이 늘어납니다.`,
    ],
    layout: 'side',
  });

  const PPS = [10e3, 20e3, 30e3, 50e3, 70e3, 100e3, 150e3, 200e3, 300e3, 400e3, 500e3, 700e3, 1e6, 1.5e6, 2e6, 2.5e6, 3e6];
  const CORE = 700;          // 코어 하나가 1ms에 처리하는 패킷 (70만 pps, 병합 0 기준)
  const LIMIT = 1000;        // 클라우드 한도 1ms당 1000개 (100만 pps)
  const BIN = 100, NB = 100; // 차트: 100ms 칸 × 100개 = 10초
  const P = { pps: 700e3, burst: 40, ring: 1024, rss: 2, coal: 30, cloud: false, skew: false };
  const rnd = K.rng(21);

  const fmtP = v => (v >= 10000 ? K.n(v / 10000, v % 10000 && v < 1e5 ? 1 : 0) + TR`만` : K.n(v));
  const fmtLat = v => (v >= 1000 ? K.n(v / 1000, v >= 10000 ? 0 : 1) + ' ms' : K.n(v) + ' µs');
  const gain = () => 0.3 * (1 - Math.exp(-P.coal / 50));   // 병합: 인터럽트를 덜 걸어 처리 능력이 최대 +30%
  const capMs = () => CORE * (1 + gain());

  const mcv = K.canvas(F.stage, {
    height: w => (w < 520 ? 224 : 244),
    caption: TR`링 버퍼와 코어`,
    right: TR`큐 1개 = 코어 1개`,
  });
  const pcv = K.canvas(F.stage, {
    height: w => K.clamp(w * 0.3, 170, 210),
    caption: TR`초당 패킷 (최근 10초)`,
    right: TR`<span class="legend"><span><i style="background:var(--s1)"></i>처리</span><span><i style="background:var(--s2)"></i>버림(링 넘침)</span><span><i style="background:var(--s3)"></i>한도 초과 버림</span></span>`,
  });
  const lcv = K.canvas(F.stage, {
    height: w => (w < 520 ? 120 : 130),
    caption: TR`NIC에서 생긴 추가 지연`,
    right: TR`<span class="legend"><span><i style="background:var(--s4)"></i>평균 추가 지연</span></span>`,
  });

  /* ---------- 조작부 ---------- */
  const g1 = K.group(F.controls, TR`들어오는 패킷`);
  const sPps = K.slider(g1, { label: TR`초당 들어오는 패킷(PPS)`, min: 0, max: PPS.length - 1, step: 1, value: PPS.indexOf(P.pps), fmt: i => fmtP(PPS[i]) + TR`/초`, onInput: i => { P.pps = PPS[i]; }, hint: TR`유저 1명이 초당 20~30개를 보냅니다. 150만 pps ≈ 5만~7만 명분이라 게임 서버 한 대보다는 게이트웨이·프록시 한 대가 받는 규모입니다.` });
  const sBurst = K.slider(g1, { label: TR`몰림 정도`, min: 0, max: 100, step: 5, value: P.burst, unit: '%', onInput: v => { P.burst = v; }, hint: TR`평균은 같아도 짧은 순간에 몰려 들어옵니다(보스 등장, 광역 스킬).` });
  const tCloud = K.toggle(g1, { label: TR`클라우드 인스턴스 PPS 한도 (100만 pps)`, value: P.cloud, onChange: v => { P.cloud = v; }, hint: TR`이 실험은 한도를 100만 pps로 가정합니다(실제 한도는 인스턴스마다 다르고 공개하지 않는 경우가 많음). 넘은 패킷은 NIC에 닿기 전에 버려지고, AWS라면 ethtool -S의 pps_allowance_exceeded에만 남습니다.` });
  const g2 = K.group(F.controls, TR`네트워크 카드 설정`);
  const cRing = K.choice(g2, { label: TR`링 버퍼 크기`, value: P.ring, options: [[256, TR`256개`], [1024, TR`1024개`], [4096, TR`4096개`]], onChange: v => { P.ring = +v; } });
  const sRss = K.slider(g2, { label: TR`RSS 큐 수`, min: 1, max: 16, step: 1, value: P.rss, unit: TR`개`, onInput: v => { P.rss = v; setup(); }, hint: TR`1개면 모든 인터럽트가 코어 하나로 갑니다. 이 실험은 코어 하나가 초당 약 70만 개를 꺼낸다고 가정합니다(실측 예는 35만~43만, CPU·설정에 따라 다름).` });
  const tSkew = K.toggle(g2, { label: TR`해시 쏠림 (한 큐로 몰림)`, value: P.skew, onChange: v => { P.skew = v; setup(); }, hint: TR`큰 연결 몇 개(게이트웨이·프록시)가 같은 해시 값에 몰려 70%가 1번 큐로 갑니다.` });
  const sCoal = K.slider(g2, { label: TR`인터럽트 병합(coalescing)`, min: 0, max: 200, step: 10, value: P.coal, unit: 'µs', onInput: v => { P.coal = v; }, hint: TR`인터럽트를 모아서 한 번에 보냅니다. 처리 능력은 늘지만 패킷이 그만큼 기다립니다.` });

  const stCpu = K.stat(F.stats, { label: TR`최대 코어 사용률`, unit: '%', sub: TR`최근 1초` });
  const stRing = K.stat(F.stats, { label: TR`링 최고 채움`, unit: '%', sub: TR`최근 1초` });
  const stDrop = K.stat(F.stats, { label: TR`초당 버림`, unit: TR`개`, sub: TR`링 넘침(rx_missed_errors 등)` });
  const stLat = K.stat(F.stats, { label: TR`추가 지연`, sub: TR`평균 · NIC 안에서` });
  const stCloud = K.stat(F.stats, { label: TR`한도 초과 버림`, unit: TR`개/초`, sub: TR`NIC에 닿기 전` });

  /* ---------- 모형 ---------- */
  let t = 0, burstOn = false, tokens = LIMIT * 3, Q = [], share = [];
  let bins = [], bin = null;
  function setup() {
    const n = P.rss, wr = K.rng(5), w = [];
    for (let i = 0; i < n; i++) w.push(Math.max(0.6, 1 + 0.08 * K.gauss(wr)));   // 해시가 완벽히 고르진 않다
    if (n === 1) share = [1];
    else if (P.skew) { const rest = w.slice(1), s = rest.reduce((a, b) => a + b, 0); share = [0.7, ...rest.map(x => (0.3 * x) / s)]; }
    else { const s = w.reduce((a, b) => a + b, 0); share = w.map(x => x / s); }
    Q = share.map((_, i) => Q[i] || { q: 0, disp: 0, util: 0, lastDrop: -1e9 });
  }
  setup();
  function newBin() { return { t, arr: 0, proc: 0, drop: 0, cloud: 0, latW: 0, fill: new Float32Array(P.rss), served: new Float32Array(P.rss), n: P.rss, ms: 0, cap: capMs() }; }
  bin = newBin();

  function stepMs() {
    t++;
    if (burstOn) { if (rnd() < 1 / 3) burstOn = false; } else if (rnd() < 1 / 12) burstOn = true;   // 켜짐 평균 3ms, 꺼짐 12ms
    const b = P.burst / 100;
    const mean = (P.pps / 1000) * (burstOn ? 1 + 4 * b : 1 - b);
    let arr = Math.max(0, mean + K.gauss(rnd) * Math.sqrt(mean));
    let cl = 0;
    if (P.cloud) { tokens = Math.min(LIMIT * 3, tokens + LIMIT); const pass = Math.min(arr, tokens); cl = arr - pass; tokens -= pass; arr = pass; }
    const cap = capMs(), coalMs = P.coal / 2000;
    let proc = 0, drop = 0, latW = 0;
    for (let i = 0; i < Q.length; i++) {
      const s = Q[i], a = arr * share[i];
      s.q += a;
      const served = Math.min(s.q, cap);
      s.q -= served;
      const d = Math.max(0, s.q - P.ring);
      s.q -= d;
      if (d > 0.5) s.lastDrop = t;
      proc += served; drop += d;
      latW += a * (s.q / cap + coalMs);
      const fill = s.q / P.ring;
      s.disp = Math.max(fill, s.disp * 0.985);
      s.util = s.util * 0.97 + (served / cap) * 0.03;
      if (i < bin.n) { bin.fill[i] = Math.max(bin.fill[i], fill); bin.served[i] += served; }
    }
    bin.arr += arr; bin.proc += proc; bin.drop += drop; bin.cloud += cl; bin.latW += latW; bin.ms++;
    if (bin.ms >= BIN) { bins.push(bin); if (bins.length > NB) bins.shift(); bin = newBin(); }
  }
  for (let i = 0; i < NB * BIN; i++) stepMs();

  function recent() {   // 최근 1초 요약
    const L = bins.slice(-10);
    let arr = 0, drop = 0, cloud = 0, latW = 0, fill = 0, util = 0, ms = 0;
    const n = P.rss, srv = new Float64Array(n);
    L.forEach(B => {
      arr += B.arr; drop += B.drop; cloud += B.cloud; latW += B.latW; ms += B.ms;
      for (let i = 0; i < Math.min(n, B.n); i++) { fill = Math.max(fill, B.fill[i]); srv[i] += B.served[i]; }
    });
    for (let i = 0; i < n; i++) util = Math.max(util, srv[i] / (capMs() * ms));
    const sec = ms / 1000 || 1;
    return { arr: arr / sec, drop: drop / sec, cloud: cloud / sec, lat: arr ? (latW / arr) * 1000 : P.coal / 2, fill, util };
  }

  /* ---------- 그리기 ---------- */
  function drawMail() {
    const { ctx, w, h } = mcv, C = K.C;
    ctx.clearRect(0, 0, w, h);
    const n = Q.length, LW = w < 520 ? 52 : 70, x0 = LW, cw = (w - LW - 10) / n;
    const bw = Math.min(34, cw * 0.62);
    const yTop = 30, H1 = w < 520 ? 70 : 80, y2 = yTop + H1 + 34, H2 = 48;
    const blink = K.reducedMotion || Math.floor(performance.now() / 260) % 2 === 0;
    const arrNow = P.pps;
    let head = TR`들어옴 ${fmtP(arrNow)}/초`;
    if (P.cloud && arrNow > LIMIT * 1000) head += TR` → 클라우드 한도에서 ${fmtP(arrNow - LIMIT * 1000)}/초 버림`;
    K.text(ctx, head, 8, 12, { size: 11.5, weight: 600, color: P.cloud && arrNow > LIMIT * 1000 ? C.badInk : C.ink2 });
    K.text(ctx, TR`링 버퍼`, 8, yTop + H1 / 2, { size: 11, color: C.ink2, weight: 600 });
    K.text(ctx, w < 520 ? TR`코어` : TR`코어 CPU`, 8, y2 + H2 / 2, { size: 11, color: C.ink2, weight: 600 });
    const every = cw >= 22 ? 1 : cw >= 11 ? 2 : 4;
    for (let i = 0; i < n; i++) {
      const s = Q[i], cx = x0 + cw * i + cw / 2, bx = cx - bw / 2;
      // 링 버퍼 칸
      const f = K.clamp(s.disp, 0, 1), dropping = t - s.lastDrop < 300;
      ctx.fillStyle = C.sunk; K.rr(ctx, bx, yTop, bw, H1, 4); ctx.fill();
      if (f > 0.004) {
        ctx.fillStyle = dropping ? C.bad : f > 0.7 ? C.warn : C.s1;
        K.rr(ctx, bx, yTop + H1 * (1 - f), bw, Math.max(2, H1 * f), 4); ctx.fill();
      }
      if (dropping && blink) {
        ctx.fillStyle = C.bad; ctx.fillRect(cx - 4, yTop - 13, 8, 8);
        if (cw >= 44) K.text(ctx, TR`버림`, cx + 7, yTop - 9, { size: 10, weight: 700, color: C.badInk });
      }
      if (cw >= 30) K.text(ctx, K.n(f * 100) + '%', cx, yTop + H1 + 11, { size: 10, align: 'center', mono: true, color: C.muted });
      // 코어 사용률
      const u = K.clamp(s.util, 0, 1);
      ctx.fillStyle = C.sunk; K.rr(ctx, bx, y2, bw, H2, 4); ctx.fill();
      ctx.fillStyle = u > 0.98 ? C.bad : u > 0.85 ? C.warn : C.s1;
      if (u > 0.004) { K.rr(ctx, bx, y2 + H2 * (1 - u), bw, Math.max(2, H2 * u), 4); ctx.fill(); }
      if (cw >= 30) K.text(ctx, K.n(u * 100) + '%', cx, y2 + H2 + 11, { size: 10, align: 'center', mono: true, color: C.muted });
      if (i % every === 0) K.text(ctx, String(i + 1), cx, h - 9, { size: 10, align: 'center', mono: true, color: C.muted });
    }
    K.text(ctx, TR`큐 번호`, 8, h - 9, { size: 10.5, color: C.muted });
  }

  const nice = v => { const e = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1e-9)))), m = v / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e; };
  const cbox = (co, left) => ({ x: left, y: 22, w: co.w - left - 12, h: co.h - 22 - 26 });
  function series(k, per) { return bins.map((B, i) => [i - bins.length + 1, (B[k] * per) / B.ms]); }

  function drawPps() {
    const { ctx, w, h } = pcv, C = K.C;
    ctx.clearRect(0, 0, w, h);
    const box = cbox(pcv, 46);
    const proc = series('proc', 1000), drop = series('drop', 1000), cloud = series('cloud', 1000);
    let mx = 1000;
    bins.forEach(B => { mx = Math.max(mx, ((B.arr + B.cloud) * 1000) / B.ms); });
    const st = nice(mx / 4), y1 = st * Math.ceil((mx * 1.02) / st), yt = [];
    for (let v = 0; v <= y1 + 1e-6; v += st) yt.push(v);
    const sc = K.plot(ctx, box, {
      x0: -NB + 1, x1: 0, y0: 0, y1, yTicks: yt, yFmt: fmtP,
      xTicks: [-99, -79, -59, -39, -19, 0], xFmt: v => (v === 0 ? TR`지금` : K.n((v - 1) / 10) + TR`초`),
    });
    K.area(ctx, sc, proc, C.s1, 0.1);
    K.line(ctx, sc, proc, C.s1);
    if (bins.some(B => B.drop > 0)) K.line(ctx, sc, drop, C.s2);
    if (bins.some(B => B.cloud > 0)) K.line(ctx, sc, cloud, C.s3);
    const L = proc.length - 1;
    if (L >= 0) K.dot(ctx, sc.x(0), sc.y(proc[L][1]), 3.5, C.s1);
    K.text(ctx, TR`패킷/초`, box.x - 6, box.y - 12, { size: 10.5, color: C.muted, align: 'right' });
  }

  function drawLat() {
    const { ctx, w, h } = lcv, C = K.C;
    ctx.clearRect(0, 0, w, h);
    const box = cbox(lcv, 46);
    const lat = bins.map((B, i) => [i - bins.length + 1, B.arr ? (B.latW / B.arr) * 1000 : P.coal / 2]);
    const mx = Math.max(200, ...lat.map(p => p[1])), st = nice(mx / 2), y1 = st * Math.ceil((mx * 1.02) / st), yt = [];
    for (let v = 0; v <= y1 + 1e-6; v += st) yt.push(v);
    const sc = K.plot(ctx, box, {
      x0: -NB + 1, x1: 0, y0: 0, y1, yTicks: yt, yFmt: v => (v >= 1000 ? K.n(v / 1000, v % 1000 ? 1 : 0) + 'ms' : K.n(v) + 'µs'),
      xTicks: [-99, -79, -59, -39, -19, 0], xFmt: v => (v === 0 ? TR`지금` : K.n((v - 1) / 10) + TR`초`),
    });
    K.area(ctx, sc, lat, C.s4, 0.1);
    K.line(ctx, sc, lat, C.s4);
    if (lat.length) K.dot(ctx, sc.x(0), sc.y(lat[lat.length - 1][1]), 3.5, C.s4);
  }

  const hoverAt = (co, x) => {
    const box = cbox(co, 46);
    if (x < box.x - 4 || x > box.x + box.w + 4) return null;
    const i = Math.round(((x - box.x) / box.w) * (NB - 1)) - (NB - bins.length);
    return bins[K.clamp(i, 0, bins.length - 1)] ? { B: bins[K.clamp(i, 0, bins.length - 1)], ago: ((bins.length - 1 - K.clamp(i, 0, bins.length - 1)) / 10) } : null;
  };
  K.hover(pcv, x => {
    const r = hoverAt(pcv, x);
    if (!r) return null;
    const { B, ago } = r, k = 1000 / B.ms;
    return TR`<b>${ago ? K.n(ago, 1) + TR`초 전` : TR`지금`}</b><br>들어옴 ${fmtP((B.arr + B.cloud) * k)}/초<br>처리 ${fmtP(B.proc * k)}/초<br>버림(링 넘침) ${fmtP(B.drop * k)}/초${B.cloud ? TR`<br>한도 초과 버림 ${fmtP(B.cloud * k)}/초` : ''}`;
  });
  K.hover(lcv, x => {
    const r = hoverAt(lcv, x);
    if (!r) return null;
    const { B, ago } = r;
    return TR`<b>${ago ? K.n(ago, 1) + TR`초 전` : TR`지금`}</b><br>평균 추가 지연 ${fmtLat(B.arr ? (B.latW / B.arr) * 1000 : 0)}`;
  });

  /* ---------- 프리셋 ---------- */
  function setAll(o) {
    sPps.set(PPS.indexOf(o.pps)); sBurst.set(o.burst == null ? 30 : o.burst);
    cRing.set(o.ring || 1024); sRss.set(o.rss); sCoal.set(o.coal == null ? 30 : o.coal);
    tCloud.set(!!o.cloud); tSkew.set(!!o.skew);
  }
  K.presets(F, [
    { label: TR`평소 (20만 pps)`, apply: () => setAll({ pps: 200e3, rss: 4 }) },
    { label: TR`월드 보스 (150만 pps, RSS 1개)`, apply: () => setAll({ pps: 1.5e6, rss: 1, burst: 40 }) },
    { label: TR`RSS 8큐로 분산`, apply: () => setAll({ pps: 1.5e6, rss: 8, burst: 40 }) },
    { label: TR`클라우드 PPS 한도 초과`, apply: () => setAll({ pps: 1.5e6, rss: 8, burst: 40, cloud: true }) },
    { label: TR`인터럽트 병합 과다`, apply: () => setAll({ pps: 200e3, rss: 4, coal: 200 }) },
    { label: TR`해시 쏠림`, apply: () => setAll({ pps: 1.5e6, rss: 8, burst: 40, skew: true }) },
  ]);

  /* ---------- 해설 ---------- */
  const SYM = TR`플레이어는 사람이 많이 모인 곳에서만 여러 캐릭터가 한꺼번에 <b>순간이동</b>하고 스킬이 <b>씹힙니다</b>. 한산한 사냥터에서는 멀쩡합니다.`;
  function explain(r) {
    const cap = capMs() * 1000;
    if (r.cloud > 1000) return TR`${K.flag('bad')}클라우드가 이 서버에 허용한 한도는 초당 100만 패킷입니다. 넘친 <b>${fmtP(r.cloud)}개/초</b>는 네트워크 카드에 닿기도 전에 조용히 버려집니다. 서버 CPU와 링 버퍼는 멀쩡해 보여 평소 지표로는 원인을 찾기 어렵습니다. AWS라면 ethtool -S의 pps_allowance_exceeded 카운터로 확인합니다. ${SYM} 더 큰 인스턴스를 쓰거나 서버를 나눠야 합니다.`;
    if (r.drop > 100 && P.skew && P.rss > 1) return TR`${K.flag('bad')}큐는 ${P.rss}개인데 해시가 한쪽으로 쏠려 70%가 1번 큐로 몰렸습니다. 1번 코어는 꽉 찼고 나머지는 한가합니다. 1번 큐의 링 버퍼만 넘쳐 초당 <b>${fmtP(r.drop)}개</b>가 버려집니다. ${SYM} 큐를 늘려도 소용없고, 연결을 나누거나 해시 방식을 바꿔야 합니다.`;
    if (r.drop > 100 && P.rss === 1) return TR`${K.flag('bad')}모든 패킷이 코어 하나로만 들어갑니다(RSS 1개). 코어 하나는 초당 약 ${fmtP(cap)}개까지만 꺼내는데 ${fmtP(P.pps)}개가 들어옵니다. 링 버퍼(${K.n(P.ring)}개)가 넘쳐 초당 <b>${fmtP(r.drop)}개</b>가 게임 서버 로그에 아무 흔적 없이 버려집니다. ${SYM} RSS 큐를 늘려 여러 코어가 나눠 받게 하세요.`;
    if (r.drop > 100 && r.util < 0.9) return TR`${K.flag('warn')}평균으로는 코어에 여유가 있지만(최대 ${K.pct(r.util)}), 패킷이 몰려 들어오는 순간 링 버퍼 슬롯(${K.n(P.ring)}개)이 모자라 초당 <b>${fmtP(r.drop)}개</b>가 버려집니다. 링 버퍼를 키우면 줄어듭니다. 대신 대기열이 길어져 지연이 조금 늘어납니다.`;
    if (r.drop > 100) return TR`${K.flag('bad')}코어 ${P.rss}개가 모두 한계에 가깝습니다. 들어오는 ${fmtP(r.arr)}개/초를 다 못 꺼내 초당 <b>${fmtP(r.drop)}개</b>가 버려집니다. ${SYM}`;
    if (P.coal >= 120 && r.util < 0.5) return TR`${K.flag('warn')}인터럽트 병합을 ${P.coal}µs로 크게 잡았습니다. 패킷이 어느 정도 쌓일 때까지 기다렸다가 인터럽트를 한 번에 보내는 방식입니다. CPU는 아끼지만(처리 능력 +${K.pct(gain())}), 패킷마다 평균 <b>${fmtLat(r.lat)}</b>를 더 기다립니다. 지금처럼 한가할 땐 손해만 있습니다. 이것만으로 플레이어가 느끼진 않지만, 서버 안 여러 단계에서 이런 지연이 쌓입니다.`;
    if (r.util > 0.8) return TR`${K.flag('warn')}가장 바쁜 코어가 <b>${K.pct(r.util)}</b>입니다. 아직 버림은 없지만 조금만 더 몰리면 링 버퍼가 넘칩니다. 추가 지연 ${fmtLat(r.lat)}.`;
    return TR`${K.flag('good')}도착한 패킷을 코어 ${P.rss}개가 나눠 받아 링 버퍼가 거의 비어 있습니다(가장 바쁜 코어 ${K.pct(r.util)}). NIC에서 생기는 추가 지연은 ${fmtLat(r.lat)}로 플레이어가 느낄 수 없는 수준입니다.`;
  }

  let acc = 0, R = recent(), statT = 0;
  K.loop(root, dt => {
    acc += dt;
    const n = Math.floor(acc); acc -= n;
    for (let i = 0; i < n; i++) stepMs();
    statT += dt;
    if (statT > 200) { statT = 0; R = recent(); }
    drawMail(); drawPps(); drawLat();
    stCpu.set(K.n(R.util * 100), R.util < 0.7 ? 'good' : R.util < 0.9 ? 'warn' : 'bad');
    stRing.set(K.n(R.fill * 100), R.fill < 0.5 ? 'good' : R.fill < 0.95 ? 'warn' : 'bad');
    stDrop.set(fmtP(Math.round(R.drop)), R.drop < 1 ? 'good' : R.drop < 1000 ? 'warn' : 'bad');
    stLat.set(fmtLat(R.lat), R.lat < 100 ? 'good' : R.lat < 1000 ? 'warn' : 'bad');
    stCloud.set(P.cloud ? fmtP(Math.round(R.cloud)) : '0', R.cloud < 1 ? 'good' : 'bad', P.cloud ? TR`NIC에 닿기 전` : TR`한도 없음(꺼짐)`);
    F.say(explain(R));
  });
});
