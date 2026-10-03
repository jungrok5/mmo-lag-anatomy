/* 메모리 누수: 조금씩 새는 메모리가 며칠에 걸쳐 쌓이다가, 접속자가 몰리는 저녁에 RAM을 넘는다.
   RAM을 넘으면 디스크(스왑)를 쓰느라 틱이 수십 배 느려지고 스왑까지 차면 운영체제가 서버를 강제로 끝낸다(OOM). */
K.register('leak', function (root) {
  const TR = I18N.tr('sim-leak');   // 이 실험 묶음의 사전을 먼저 본다(i18n.js)
  const F = K.frame(root, {
    kicker: TR`레이어 10 · 메모리`,
    title: TR`점검 직후엔 멀쩡하다가 사흘째 저녁부터 렉`,
    lead: TR`서버가 다 쓴 메모리를 해제하지 않아 사용량이 조금씩 늘어나는 버그를 메모리 누수라고 합니다. 한 시간에 수백 MB씩이라 첫날은 티가 안 납니다. 며칠 쌓인 뒤 접속자가 가장 많은 저녁이 오면 RAM을 넘고 그때부터 서버가 디스크를 메모리처럼 쓰며 급격히 느려집니다. 재생해서 사흘을 빨리 감아 보세요.`,
    tries: [
      TR`그대로 재생해 보세요. <b>3일차 저녁</b>에 메모리 선이 RAM 선을 넘는 순간, 아래 틱 그래프가 치솟습니다.`,
      TR`<b>정기 점검</b>을 “24시간”으로 바꿔 보세요. 매일 다시 켜니 누수는 그대로인데도 문제가 사라진 것처럼 보입니다.`,
      TR`<b>스왑 끔 (바로 종료)</b>를 눌러 보세요. 느려지는 단계가 거의 없이 저녁 피크에 서버가 곧바로 꺼집니다.`,
      TR`<b>물리 메모리</b>를 64GB로 늘려 보세요. 위험이 며칠 뒤로 밀릴 뿐 누수가 있으면 언젠가 찾아옵니다.`,
    ],
  });

  const P = { leak: 250, ram: 32, base: 12, swap: true, maint: 0 };
  const SWAP = 8, PEAK = 2500, PER = 2;       // 스왑 8GB, 저녁 최대 2,500명, 1명당 2MB
  const STEP = 5 / 60, HMAX = 96, HCALC = 168; // 5분 단위, 96시간 표시, 7일까지 예측
  const N = Math.round(HCALC / STEP) + 1;
  const LAPSE = 2;                             // 실제 1초 = 2시간

  const mcv = K.canvas(F.stage, {
    height: w => K.clamp(w * 0.36, 210, 270), caption: TR`서버 메모리 사용량`,
    right: TR`<span class="legend"><span><i style="background:var(--s1)"></i>사용량</span><span><i class="box" style="background:color-mix(in srgb, var(--warn) 30%, transparent)"></i>스왑(디스크)</span><span><i class="box" style="background:color-mix(in srgb, var(--ink-2) 14%, transparent)"></i>저녁 7~11시</span></span>`,
  });
  const tcv = K.canvas(F.stage, { height: w => K.clamp(w * 0.22, 150, 180), caption: TR`틱 처리 시간`, right: TR`20Hz · 예산 50ms` });

  K.addStyle('leak', '.sim[data-sim="leak"] .cv-cap { flex-wrap: wrap; row-gap: 4px; }');

  /* ---------- 조작부 ---------- */
  const g0 = K.group(F.controls, TR`재생 (1초 = 2시간)`);
  const row = K.el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' });
  g0.append(row);
  const bPlay = K.button(row, { label: TR`일시정지`, kind: 'primary', onClick: () => { playing = !playing; if (playing && ph >= HMAX) ph = 0; syncPlay(); } });
  K.button(row, { label: TR`처음부터`, onClick: () => { ph = 0; playing = true; syncPlay(); } });
  const sPh = K.slider(g0, { label: TR`재생 위치`, min: 0, max: HMAX, step: 0.5, value: 54, fmt: v => clockLabel(v), onInput: v => { ph = v; } });
  const g1 = K.group(F.controls, TR`서버와 누수`);
  const sLeak = K.slider(g1, { label: TR`누수 속도`, min: 0, max: 1000, step: 10, value: P.leak, fmt: v => K.n(v) + TR` MB/시간`, onInput: v => { P.leak = v; compute(); } });
  const sBase = K.slider(g1, { label: TR`서버 기본 사용량`, min: 4, max: 24, step: 1, value: P.base, unit: 'GB', onInput: v => { P.base = v; compute(); }, hint: TR`월드 데이터, 캐시 등 켜자마자 쓰는 양. 저녁엔 접속자 1명당 2MB가 더해집니다.` });
  const cRam = K.choice(g1, { label: TR`물리 메모리(RAM)`, value: P.ram, options: [[16, '16GB'], [32, '32GB'], [64, '64GB']], onChange: v => { P.ram = +v; compute(); } });
  const tSwap = K.toggle(g1, { label: TR`스왑 사용 (디스크 8GB)`, value: P.swap, onChange: v => { P.swap = v; compute(); }, hint: TR`RAM이 모자라면 디스크 일부를 메모리처럼 씁니다.` });
  const cMaint = K.choice(g1, { label: TR`정기 점검(재시작)`, value: P.maint, options: [[0, TR`없음`], [24, TR`24시간마다`], [72, TR`72시간마다`]], onChange: v => { P.maint = +v; compute(); } });

  const stUp = K.stat(F.stats, { label: TR`가동 시간` });
  const stMem = K.stat(F.stats, { label: TR`메모리/RAM`, unit: 'GB' });
  const stTick = K.stat(F.stats, { label: TR`틱 처리 시간` });
  const stState = K.stat(F.stats, { label: TR`상태` });
  const stNext = K.stat(F.stats, { label: TR`다음 위험 예상` });

  /* ---------- 모델 ---------- */
  // 하루 접속자 곡선: 새벽 5시 바닥, 저녁 9시 최고
  const KEY = [[0, 0.55], [2, 0.3], [5, 0.12], [8, 0.2], [12, 0.45], [15, 0.5], [18, 0.72], [21, 1], [23, 0.85], [24, 0.55]];
  function load(clock) {
    for (let i = 1; i < KEY.length; i++) {
      if (clock <= KEY[i][0]) {
        const [a, fa] = KEY[i - 1], [b, fb] = KEY[i];
        const u = (clock - a) / (b - a);
        return fa + (fb - fa) * (0.5 - 0.5 * Math.cos(Math.PI * u));
      }
    }
    return KEY[0][1];
  }
  function clockOf(h) { return (6 + h) % 24; }
  function clockLabel(h) {
    const d = Math.floor((6 + h) / 24) + 1, c = clockOf(h);
    const hh = Math.floor(c + 1e-6), mm = Math.round((c - hh) * 60) % 60;
    return TR`${d}일차 ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  const S = { mem: new Float32Array(N), tick: new Float32Array(N), ppl: new Float32Array(N), st: new Uint8Array(N), up: new Float32Array(N) };
  let events = [];
  // st: 0 정상, 1 스왑 중, 2 강제 종료 후 재시작 중, 3 점검 재시작 중
  function compute() {
    const r = K.rng(9);
    events = [];
    let up = 0, down = 0, downKind = 0;
    const limit = P.ram + (P.swap ? SWAP : 0);
    for (let i = 0; i < N; i++) {
      const h = i * STEP;
      if (P.maint && i > 0 && Math.abs(h / P.maint - Math.round(h / P.maint)) * P.maint < STEP / 2 && down === 0) {
        events.push({ h, kind: 'maint' }); down = 2; downKind = 3;
      }
      const frac = load(clockOf(h)) * (0.97 + r() * 0.06);
      if (down > 0) {
        S.mem[i] = NaN; S.tick[i] = NaN; S.ppl[i] = 0; S.st[i] = downKind; S.up[i] = 0;
        if (--down === 0) up = 0;
        continue;
      }
      const ppl = PEAK * frac;
      const mem = P.base + (P.leak * up) / 1024 + (ppl * PER) / 1024;
      if (mem > limit) {
        events.push({ h, kind: 'oom', mem });
        S.mem[i] = limit; S.tick[i] = NaN; S.ppl[i] = 0; S.st[i] = 2; S.up[i] = up;
        down = 2; downKind = 2;
        continue;
      }
      const over = mem > P.ram ? (mem - P.ram) / mem : 0;
      S.mem[i] = mem; S.ppl[i] = ppl; S.up[i] = up;
      S.tick[i] = (8 + 12 * frac) * (1 + 50 * over) * (0.93 + r() * 0.14);
      S.st[i] = over > 0 ? 1 : 0;
      up += STEP;
    }
  }
  const idx = h => K.clamp(Math.round(h / STEP), 0, N - 1);
  function nextRisk(h) {
    const i0 = idx(h), s0 = S.st[i0];
    for (let i = i0 + 1; i < N; i++) {
      if (S.st[i] === 2 && s0 !== 2) return { dh: i * STEP - h, what: TR`강제 종료`, at: i * STEP, st: 'bad' };
      if (S.st[i] === 1 && s0 === 0) return { dh: i * STEP - h, what: TR`스왑 시작`, at: i * STEP, st: 'warn' };
      if (S.st[i] === 3) return null;   // 점검이 먼저 온다
    }
    return null;
  }
  function fmtH(dh) {
    if (dh < 1) return TR`${Math.max(5, Math.round(dh * 60))}분`;
    if (dh < 48) return TR`${K.n(dh, 0)}시간`;
    return TR`${Math.floor(dh / 24)}일 ${Math.round(dh % 24)}시간`;
  }

  compute();
  let ph = 54, playing = true, hold = 0;
  function syncPlay() { bPlay.textContent = playing ? TR`일시정지` : TR`재생`; }
  function jumpToStory() {
    // 프리셋: 첫 사고 몇 시간 전으로 옮겨서 이어서 재생한다 (사고가 없으면 거의 끝까지 보여 준다)
    let first = null;
    for (let i = 0; i < idx(HMAX); i++) if (S.st[i] === 1 || S.st[i] === 2) { first = i * STEP; break; }
    if (first == null) { ph = HMAX - 1; playing = false; } else { ph = Math.max(0, first - 3); playing = true; }
    syncPlay();
  }
  const setAll = o => {
    sLeak.set(o.leak, false); sBase.set(12, false); cRam.set(32, false); tSwap.set(o.swap, false); cMaint.set(o.maint, false);
    Object.assign(P, { base: 12, ram: 32 }, o); compute(); jumpToStory();
  };
  K.presets(F, [
    { label: TR`누수 없음`, apply: () => setAll({ leak: 0, swap: true, maint: 0 }) },
    { label: TR`느린 누수 + 매일 점검`, apply: () => setAll({ leak: 250, swap: true, maint: 24 }) },
    { label: TR`느린 누수 + 점검 없음`, apply: () => setAll({ leak: 250, swap: true, maint: 0 }) },
    { label: TR`빠른 누수 + 스왑 켬`, apply: () => setAll({ leak: 800, swap: true, maint: 0 }) },
    { label: TR`스왑 끔 (바로 종료)`, apply: () => setAll({ leak: 250, swap: false, maint: 0 }) },
  ]);

  /* ---------- 그리기 ---------- */
  const xT = w => (w < 420 ? [0, 48, 96] : [0, 24, 48, 72, 96]);
  const xF = v => (v === 0 ? TR`점검 직후` : v + TR`시간`);
  function boxOf(cv) { return { x: 44, y: 22, w: cv.w - 66, h: cv.h - 48 }; }
  function shadeDays(ctx, sc, box) {
    // 저녁 피크(19~23시) 띠
    ctx.fillStyle = K.alpha(K.C.ink2, 0.05);
    for (let d = 0; d < 5; d++) {
      const a = d * 24 + 13, b = a + 4;   // 06시 기준 +13h = 19시
      if (a > HMAX) break;
      ctx.fillRect(sc.x(a), box.y, sc.x(Math.min(b, HMAX)) - sc.x(a), box.h);
    }
  }
  function markers(ctx, sc, box, withLabels) {
    for (const e of events) {
      if (e.h > Math.min(ph, HMAX)) continue;
      const x = Math.round(sc.x(e.h)) + 0.5;
      const oom = e.kind === 'oom';
      ctx.strokeStyle = oom ? K.C.bad : K.C.muted; ctx.lineWidth = 1;
      if (!oom) ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x, box.y); ctx.lineTo(x, box.y + box.h); ctx.stroke();
      ctx.setLineDash([]);
      if (withLabels) {
        const lab = oom ? TR`강제 종료` : TR`점검`;
        ctx.font = K.font(10.5, 600);
        const tw = ctx.measureText(lab).width + (oom ? 20 : 10);
        const lx = x + tw + 4 > box.x + box.w ? x - tw - 3 : x + 3;
        ctx.fillStyle = K.alpha(K.C.paper, 0.94);
        K.rr(ctx, lx, box.y + 2, tw, 15, 3); ctx.fill();
        if (oom) { ctx.fillStyle = K.C.bad; ctx.fillRect(lx + 4, box.y + 5.5, 8, 8); }
        K.text(ctx, lab, lx + (oom ? 15 : 5), box.y + 9.5, { size: 10.5, weight: 600, color: oom ? K.C.badInk : K.C.ink2 });
      }
    }
  }
  function series(arr, cap) {
    const out = [], segs = [out];
    const last = idx(Math.min(ph, HMAX));
    let cur = out;
    for (let i = 0; i <= last; i++) {
      const v = arr[i];
      if (Number.isNaN(v)) { if (cur.length) { cur = []; segs.push(cur); } continue; }
      cur.push([i * STEP, cap ? Math.min(v, cap) : v]);
    }
    return segs.filter(s => s.length);
  }
  function drawMem() {
    const { ctx, w } = mcv;
    const C = K.C;
    ctx.clearRect(0, 0, w, mcv.h);
    const box = boxOf(mcv);
    const R = P.ram, stp = R / 4, top = Math.max(R + SWAP + 4, R * 1.3);
    const yt = []; for (let v = 0; v <= top; v += stp) yt.push(v);
    const sc = K.plot(ctx, box, { x0: 0, x1: HMAX, y0: 0, y1: top, yTicks: yt, yFmt: v => v, xTicks: xT(w), xFmt: xF, yTitle: TR`사용량 (GB)` });
    shadeDays(ctx, sc, box);
    if (P.swap) {
      ctx.fillStyle = K.alpha(C.warn, 0.16);
      ctx.fillRect(box.x, sc.y(R + SWAP), box.w, sc.y(R) - sc.y(R + SWAP));
      K.text(ctx, TR`스왑 구간: 디스크를 메모리처럼`, box.x + 6, (sc.y(R) + sc.y(R + SWAP)) / 2, { size: 10.5, color: C.ink2 });
    }
    const lim = R + (P.swap ? SWAP : 0);
    K.hline(ctx, sc, R, { color: C.ink2 });
    const yl = Math.round(sc.y(lim)) + 0.5;
    ctx.strokeStyle = C.bad; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(box.x, yl); ctx.lineTo(box.x + box.w, yl); ctx.stroke();
    K.text(ctx, `RAM ${R}GB`, box.x + box.w - 4, sc.y(R) + (P.swap ? -8 : 10), { align: 'right', size: 10.5, weight: 600, color: C.ink2 });
    K.text(ctx, TR`넘으면 강제 종료`, box.x + box.w - 4, yl - 8, { align: 'right', size: 10.5, weight: 600, color: C.badInk });
    for (const s of series(S.mem)) { K.area(ctx, sc, s, C.s1, 0.1); K.line(ctx, sc, s, C.s1, 2); }
    markers(ctx, sc, box, true);
    playhead(ctx, sc, box, S.mem);
  }
  function playhead(ctx, sc, box, arr, cap) {
    const x = Math.round(sc.x(Math.min(ph, HMAX))) + 0.5;
    ctx.strokeStyle = K.C.ink; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, box.y); ctx.lineTo(x, box.y + box.h); ctx.stroke();
    const v = arr[idx(ph)];
    if (!Number.isNaN(v)) K.dot(ctx, x, sc.y(cap ? Math.min(v, cap) : v), 4.5, K.C.s1, K.C.paper);
  }
  function drawTick() {
    const { ctx, w } = tcv;
    const C = K.C;
    ctx.clearRect(0, 0, w, tcv.h);
    const box = boxOf(tcv);
    const CAP = 250;
    const sc = K.plot(ctx, box, { x0: 0, x1: HMAX, y0: 0, y1: CAP, yTicks: [0, 50, 100, 150, 200, 250], yFmt: v => v, xTicks: xT(w), xFmt: xF, yTitle: TR`틱 처리 시간 (ms)` });
    // 스왑·꺼짐 구간 칠하기
    const last = idx(Math.min(ph, HMAX));
    for (let i = 0; i <= last; i++) {
      const s = S.st[i];
      if (!s) continue;
      ctx.fillStyle = s === 1 ? K.alpha(C.warn, 0.18) : s === 2 ? K.alpha(C.bad, 0.22) : K.alpha(C.ink2, 0.12);
      ctx.fillRect(sc.x(i * STEP), box.y, Math.max(1, sc.x(STEP) - sc.x(0)), box.h);
    }
    const yb = Math.round(sc.y(50)) + 0.5;
    ctx.strokeStyle = C.bad; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(box.x, yb); ctx.lineTo(box.x + box.w, yb); ctx.stroke();
    for (const s of series(S.tick, CAP)) K.line(ctx, sc, s, C.s1, 2);
    // 잘린 최대값 표시
    let mx = 0, mi = -1;
    for (let i = 0; i <= last; i++) if (S.tick[i] > mx) { mx = S.tick[i]; mi = i; }
    if (mx > CAP) {
      const x = sc.x(mi * STEP);
      const lab = TR`최대 ${K.ms(mx)} ▲`;
      ctx.font = K.font(10.5, 600);
      const tw = ctx.measureText(lab).width + 10;
      const lx = K.clamp(x - tw / 2, box.x, box.x + box.w - tw);
      ctx.fillStyle = K.alpha(C.paper, 0.94); K.rr(ctx, lx, box.y + 2, tw, 15, 3); ctx.fill();
      K.text(ctx, lab, lx + 5, box.y + 9.5, { size: 10.5, weight: 600, color: C.badInk });
    }
    K.text(ctx, TR`예산 50ms`, box.x + 6, yb - 8, { size: 10.5, weight: 600, color: C.badInk });
    markers(ctx, sc, box, false);
    playhead(ctx, sc, box, S.tick, CAP);
  }
  const stName = [TR`정상`, TR`스왑 중`, TR`강제 종료`, TR`점검 재시작`];
  function tipAt(cv, x) {
    const box = boxOf(cv);
    const h = ((x - box.x) / box.w) * HMAX;
    if (h < 0 || h > Math.min(ph, HMAX)) return null;
    const i = idx(h), s = S.st[i];
    if (s >= 2) return TR`${clockLabel(h)}<br><b>${stName[s]}</b> · 서버 꺼짐`;
    return TR`${clockLabel(h)} · <b>${stName[s]}</b><br>메모리 <b>${K.n(S.mem[i], 1)}GB</b> / RAM ${P.ram}GB<br>접속자 ${K.n(S.ppl[i])}명 · 틱 <b>${K.ms(S.tick[i])}</b>`;
  }
  K.hover(mcv, x => tipAt(mcv, x));
  K.hover(tcv, x => tipAt(tcv, x));

  /* ---------- 해설 ---------- */
  function explain(i, risk) {
    const s = S.st[i], h = ph;
    const upH = S.up[i];
    const leaked = (P.leak * upH) / 1024;
    const pplGB = (S.ppl[i] * PER) / 1024;
    if (s === 2) return TR`${K.flag('bad')} 메모리가 ${P.swap ? TR`RAM ${P.ram}GB와 스왑 ${SWAP}GB를 모두` : TR`RAM ${P.ram}GB를`} 채우자 운영체제가 서버 프로세스를 강제로 끝냈습니다(OOM, 메모리 부족 종료). 이 서버의 <b>모든 플레이어</b>가 한꺼번에 <b>접속 끊김</b>을 겪고 다시 켜지는 10분 동안 <b>접속 불가·무한 로딩</b>입니다. 다시 켜면 메모리가 비워져 멀쩡해 보이지만 누수는 그대로라 같은 일이 되풀이됩니다.`;
    if (s === 3) return TR`${K.flag('good')} 정기 점검으로 서버를 다시 켜는 중입니다. 누수된 메모리가 모두 해제되어 처음 상태로 돌아갑니다. 매일 점검하면 누수가 쌓일 틈이 없어 문제가 <b>숨어 버립니다</b>. 점검을 한 번 건너뛰거나 주기를 늘리면 그제야 드러납니다.`;
    if (s === 1) {
      const out = S.mem[i] - P.ram, tk = S.tick[i];
      const st = tk > 50 ? 'bad' : 'warn';
      const feel = tk > 50
        ? TR`틱 예산 50ms를 넘어 플레이어는 <b>입력 지연</b>과 <b>슬로우모션</b>(흐른 시간만큼 움직이는 서버라면 뚝뚝 끊김)을 겪고 심하면 <b>멈춤</b>이 옵니다.`
        : TR`아직 틱 예산 50ms 안이라 티가 덜 나지만 밀려난 양이 늘수록 틱이 빠르게 늘어납니다.`;
      return TR`${K.flag(st)} 메모리 ${K.n(S.mem[i], 1)}GB가 RAM ${P.ram}GB를 넘어 <b>${out < 1 ? K.n(Math.max(10, out * 1024)) + 'MB' : K.n(out, 1) + 'GB'}</b>가 디스크(스왑)로 밀려났습니다. RAM은 한 번 읽는 데 약 100ns, SSD는 약 100µs로 <b>1,000배</b> 느립니다. 누수된 메모리는 대개 다시 안 쓰지만 쓰는 데이터와 같은 메모리 페이지에 섞여 있거나 GC가 힙 전체를 훑으면 밀려난 메모리를 자주 건드립니다. 그때마다 디스크를 기다려 틱이 <b>${K.ms(tk)}</b>로 늘었습니다. ${feel} 접속자가 많은 저녁 9시 무렵 가장 심합니다.${risk && risk.what === TR`강제 종료` ? TR` 이대로면 약 ${fmtH(risk.dh)} 뒤 서버가 강제로 꺼집니다(전원 <b>접속 끊김</b>).` : ''}`;
    }
    if (P.leak === 0) return TR`${K.flag('good')} 누수가 없으면 메모리는 접속자 수를 따라 매일 같은 패턴으로 오르내립니다. 저녁 피크에도 기본 ${P.base}GB + 접속자 ${K.n(S.ppl[i])}명분 ${K.n(pplGB, 1)}GB로 RAM ${P.ram}GB 안이라 틱은 예산 안입니다.`;
    const lastEv = events.filter(e => e.h <= h).pop();
    const since = lastEv && lastEv.kind === 'oom' ? TR`다시 켠 지` : TR`점검 후`;
    const recent = lastEv && lastEv.kind === 'oom' && h - lastEv.h < 8 ? TR`<b>${fmtH(h - lastEv.h)} 전 서버가 강제로 꺼졌다가</b> 다시 켜졌습니다. 메모리가 비워져 지금은 멀쩡해 보이지만 누수는 그대로입니다. ` : '';
    const base = TR`${recent}${since} <b>${fmtH(upH)}</b>. 누수로 매시간 ${K.n(P.leak)}MB씩, 지금까지 <b>${K.n(leaked, 1)}GB</b>가 쌓였습니다. 여기에 접속자 ${K.n(S.ppl[i])}명분 ${K.n(pplGB, 1)}GB가 더해집니다(저녁 피크면 ${K.n((PEAK * PER) / 1024, 1)}GB).`;
    if (P.maint && (!risk || risk.at > h + P.maint)) return TR`${K.flag('good')} ${base} 하지만 ${P.maint}시간마다 점검으로 다시 켜서 RAM에 닿기 전에 비워집니다. 문제가 <b>숨어 있을 뿐</b> 사라진 게 아닙니다. 점검 주기를 늘리거나 없애면 드러납니다.`;
    if (risk) return TR`${K.flag(risk.dh < 12 ? 'warn' : 'good')} ${base} 아직 RAM 안이라 정상이지만 약 <b>${fmtH(risk.dh)} 뒤</b>(${clockLabel(risk.at)}) ${risk.what === TR`스왑 시작` ? TR`RAM을 넘어 느려지기 시작합니다` : TR`서버가 강제로 꺼집니다`}. 누수는 매일 조금씩 쌓이고 접속자가 몰리는 저녁에 먼저 선을 넘습니다. ${P.swap ? TR`플레이어는 “점점 느려짐 → 멈춤 → 전원 접속 끊김” 순서로 겪습니다.` : TR`스왑이 없으니 느려지는 단계가 거의 없이 곧바로 전원 <b>접속 끊김</b>이 옵니다.`}`;
    return TR`${K.flag('good')} ${base} 앞으로 7일 안에는 RAM을 넘지 않습니다.`;
  }

  K.loop(root, dt => {
    if (hold > 0) hold -= dt;
    else if (playing) {
      const prev = ph;
      ph += (dt / 1000) * LAPSE;
      // 강제 종료 순간에는 1.5초 멈춰서 보여 준다
      const hit = events.find(e => e.kind === 'oom' && e.h > prev && e.h <= ph);
      if (hit) { ph = hit.h; hold = 1500; }
      if (ph >= HMAX) { ph = HMAX; playing = false; syncPlay(); }
      sPh.set(Math.round(ph * 2) / 2, false);
    }
    drawMem();
    drawTick();
    const i = idx(ph), s = S.st[i];
    const risk = nextRisk(ph);
    stUp.set(s >= 2 ? TR`재시작 중` : fmtH(S.up[i]), null, clockLabel(ph));
    stMem.set(s >= 2 ? '— / ' + P.ram : `${K.n(S.mem[i], 1)} / ${P.ram}`, s === 3 ? null : s === 2 ? 'bad' : s === 1 ? 'warn' : S.mem[i] > P.ram * 0.9 ? 'warn' : 'good', TR`접속자 ${K.n(S.ppl[i])}명`);
    stTick.set(s >= 2 ? '—' : K.ms(S.tick[i]), s === 3 ? null : s === 2 || S.tick[i] > 50 ? 'bad' : S.tick[i] > 35 ? 'warn' : 'good', TR`예산 50ms`);
    stState.set(stName[s], s === 2 ? 'bad' : s === 1 ? 'warn' : 'good', s === 2 ? TR`전원 접속 끊김` : s === 1 ? TR`디스크를 메모리처럼 씀` : s === 3 ? TR`10분 뒤 다시 열림` : '');
    stNext.set(risk ? TR`${fmtH(risk.dh)} 뒤` : TR`7일 안엔 없음`, risk ? risk.st : 'good', risk ? `${risk.what} · ${clockLabel(risk.at)}` : '');
    F.say(explain(i, risk));
  });
});
