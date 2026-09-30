/* 클라이언트 게임 프로세스: 한 프레임의 일이 16.7ms를 넘기면 화면이 멈췄다가 튄다.
   실제 시간 위에서 "가상의 프레임"을 하나씩 끝낸다. 프레임이 끝나야만 화면 속 캐릭터 위치가 바뀐다. */
K.register('frames', function (root) {
  const F = K.frame(root, {
    kicker: TR`레이어 1 · 클라이언트 게임`,
    title: TR`프레임이 늦으면 화면이 멈췄다 튄다`,
    lead: TR`게임은 1초에 60번, 16.7ms마다 “계산하고 그리기”를 되풀이합니다. 한 프레임이라도 늦으면 그동안 화면은 멈춰 있고, 다음 프레임에서 캐릭터가 한꺼번에 이동합니다. 이 렉은 내 컴퓨터 안에서 생깁니다. 회선과 서버는 멀쩡하고, 다른 플레이어 화면 속의 나는 대개 평소처럼 움직입니다.`,
    tries: [
      TR`<b>GC 스파이크</b>를 누르고 아래 달리는 캐릭터를 지켜보세요. 몇 초마다 멈췄다가 앞으로 툭 튀어 나갑니다(순간이동). 위 차트에는 빨간 막대가 솟습니다.`,
      TR`그 상태에서 <b>점진적 GC</b>를 켜 보세요. 큰 멈춤 한 번을 3ms(유니티 기본값)짜리 작은 단위 여러 번으로 나눠 처리합니다. 가비지 생성을 500KB로 올리면 수집 속도가 못 따라가 다시 큰 멈춤이 나옵니다.`,
      TR`<b>V-Sync 경계 (17ms)</b>를 누르세요. 일이 16.7ms를 1ms 넘겼을 뿐인데 한 프레임에 33.3ms가 걸립니다. FPS가 60과 30 사이를 오가며 움직임이 들쭉날쭉해집니다.`,
      TR`<b>새 지역 로딩</b>을 켠 채 <b>밀린 시간 처리</b>를 하나씩 바꿔 보세요. 한 번에 점프하면 순간이동, 고정 스텝으로 따라잡으면 긴 프레임이 줄줄이(뚝뚝 끊김), 상한을 두면 넘친 시간이 버려져 슬로우모션이 됩니다.`,
    ],
    layout: 'side',
  });

  const VB = 1000 / 60;            // 60Hz 화면이 한 번 바뀌는 간격
  const SPEED = 6 / 1000;          // 캐릭터 달리기 속도 6 m/s (ms당 m)
  const TRACK = 24;                // 화면 폭 = 24m
  const HEAP0 = 8, HEAPMAX = 64, INC_START = 48; // MB
  const SLICE = 3;                 // 점진적 GC 한 조각(ms). 유니티 기본값 3ms
  const BAD = 50;                  // 이보다 긴 프레임 = 눈에 띄는 끊김
  const CAUSE = { load: TR`로딩`, gc: 'GC', catch: TR`따라잡기`, heavy: '' };
  const P = { base: 8, chars: 60, gc: false, garbage: 150, inc: false, load: false, vsync: true, mode: 'var' };
  const rnd = K.rng(11);

  const fcv = K.canvas(F.stage, {
    height: w => K.clamp(w * 0.36, 190, 260),
    caption: TR`프레임 시간`,
    right: TR`<span class="legend"><span><i class="box" style="background:var(--s1)"></i>프레임 1개</span><span><i class="box" style="background:var(--bad)"></i>50ms 넘음</span></span>`,
  });
  const scv = K.canvas(F.stage, {
    height: w => (w < 520 ? 110 : 140),
    caption: TR`플레이어 화면`,
    right: TR`<span class="legend"><span><i class="dot" style="background:var(--s1)"></i>그려진 위치</span><span><i class="dot" style="background:transparent;border:1.5px dashed var(--ink-2)"></i>원래 위치</span></span>`,
  });

  /* ---------- 조작부 ---------- */
  const g1 = K.group(F.controls, TR`한 프레임에 할 일`);
  const sBase = K.slider(g1, { label: TR`기본 비용`, min: 2, max: 30, step: 0.5, value: P.base, unit: 'ms', onInput: v => { P.base = v; }, hint: TR`지형·UI·효과를 그리고 게임 규칙을 계산하는 기본 일` });
  const sChars = K.slider(g1, { label: TR`화면 속 캐릭터 수`, min: 0, max: 500, step: 10, value: P.chars, unit: TR`명`, onInput: v => { P.chars = v; }, hint: TR`1명마다 그리기·애니메이션 0.04ms + 그 캐릭터 패킷 처리(프레임당 0.5개 × 0.01ms)` });

  const g2 = K.group(F.controls, TR`가비지 컬렉션(메모리 정리)`);
  const tGC = K.toggle(g2, { label: TR`C#/유니티 식 가비지 컬렉션`, value: P.gc, onChange: v => { P.gc = v; heap = HEAP0 + 30; incLeft = 0; sync(); } });
  const sGarb = K.slider(g2, { label: TR`프레임당 가비지 생성`, min: 0, max: 500, step: 10, value: P.garbage, unit: 'KB', onInput: v => { P.garbage = v; } });
  const tInc = K.toggle(g2, { label: TR`점진적 GC(incremental)`, value: P.inc, onChange: v => { P.inc = v; incLeft = 0; }, hint: TR`한 번에 몰아 수집하지 않고 프레임마다 3ms씩(유니티 기본값) 나눠 수집합니다.` });
  const heapRow = K.el('div', { class: 'ctl' });
  const heapOut = K.el('output');
  heapRow.append(K.el('div', { class: 'lab' }, K.el('span', { text: TR`쌓인 가비지(힙)` }), heapOut));
  g2.append(heapRow);
  const heapM = K.meter(heapRow);

  const g3 = K.group(F.controls, TR`그 밖의 원인`);
  const tLoad = K.toggle(g3, { label: TR`새 지역 진입 시 동기 로딩`, value: P.load, onChange: v => { P.load = v; nextLoad = now + 1200; }, hint: TR`약 6초마다 텍스처 읽기·셰이더 컴파일이 게임 스레드를 150~450ms 동안 막습니다.` });
  const tVs = K.toggle(g3, { label: TR`V-Sync (60Hz 화면에 맞춤)`, value: P.vsync, onChange: v => { P.vsync = v; }, hint: TR`프레임을 16.7ms 간격(화면 갱신 주기)에 맞춰 내보냅니다. 17ms 걸린 프레임은 다음 갱신 시점인 33.3ms까지 기다립니다(이중 버퍼 기준. 삼중 버퍼면 대부분 60에 가끔 33ms가 섞입니다).` });

  const g4 = K.group(F.controls, TR`게임 시간 진행`);
  const cMode = K.choice(g4, {
    label: TR`밀린 시간 처리`, value: P.mode,
    options: [['var', TR`가변 시간(한 번에 점프)`], ['fixed', TR`고정 스텝 따라잡기`], ['cap', TR`따라잡기 상한 (느려짐)`]],
    onChange: v => { P.mode = v; acc = 0; gameT = now; },
    hint: TR`고정 스텝: 16.7ms짜리 계산을 밀린 만큼 되풀이합니다. 상한: 최대 5번만 되풀이하고 나머지 시간은 버립니다.`,
  });

  function sync() {
    sGarb.el.style.opacity = P.gc ? '' : '0.5';
    tInc.el.style.opacity = P.gc ? '' : '0.5';
  }
  sync();

  const stF = K.stat(F.stats, { label: TR`평균 FPS`, sub: TR`최근 20초` });
  const stL = K.stat(F.stats, { label: TR`1% 최저 FPS`, sub: TR`가장 느린 1% 장면의 평균` });
  const stM = K.stat(F.stats, { label: TR`가장 긴 프레임`, sub: TR`최근 20초` });
  const stH = K.stat(F.stats, { label: TR`50ms 넘는 끊김`, unit: TR`회/분` });
  const stI = K.stat(F.stats, { label: TR`입력→화면 지연`, sub: TR`누르고 보이기까지` });

  /* ---------- 상태 ---------- */
  let now = 0, cur = null, frames = [], hist = [], events = [];
  let heap = HEAP0, incLeft = 0, incFloat = 0, nextLoad = 1500;
  let acc = 0, gameT = 0, prevDt = VB;
  let shown = 0, shownT = 0, trail = [], lastJump = null, spiralUntil = -1;

  const renderCost = () => P.base * 0.6 + P.chars * 0.015;
  const calcCost = () => P.base * 0.4 + P.chars * 0.03;   // 0.025ms/명 + 패킷 0.5개 × 0.01ms

  function reset() {
    now = 0; frames = []; hist = []; events = [];
    heap = HEAP0 + 30; incLeft = 0; incFloat = 0; nextLoad = 1500;
    acc = 0; gameT = 0; prevDt = VB;
    shown = 0; shownT = 0; trail = []; lastJump = null; spiralUntil = -1;
    cur = begin(0);
  }

  // 프레임 하나를 시작: 이번 장에 걸릴 시간을 정한다
  function begin(start) {
    const nz = 1 + (rnd() - 0.5) * 0.2;
    const render = renderCost() * nz, calc1 = calcCost() * nz;
    let steps = 1, adv = prevDt, drop = 0, spiral = false;
    if (P.mode !== 'var') {
      acc += prevDt;
      steps = Math.floor(acc / VB + 1e-6);
      const cap = P.mode === 'cap' ? 5 : 60;
      if (steps > cap) { spiral = P.mode === 'fixed'; steps = cap; }
      acc -= steps * VB;
      if (P.mode === 'cap' && acc >= VB) { drop = acc - (acc % VB); acc %= VB; }
      if (acc > 60 * VB) { drop = acc - 60 * VB; acc = 60 * VB; }
      adv = steps * VB;
    }
    gameT += adv;
    let rubber = false;
    if (start - gameT > 2000) { gameT = start; rubber = true; }   // 너무 뒤처지면 서버 위치로 당겨짐
    let gc = 0, gcKind = null, fallback = false;
    if (P.gc) {
      const mb = P.garbage / 1024;
      heap += mb;
      if (P.inc) {
        if (incLeft <= 0 && heap >= INC_START) { incLeft = 20 + heap * 2; incFloat = 0; }
        if (incLeft > 0) {
          incFloat += mb;
          if (heap >= HEAPMAX) { gc = 20 + heap * 2; incLeft = 0; heap = HEAP0; gcKind = 'full'; fallback = true; }   // 못 따라가면 전체를 한 번에
          else { gc = Math.min(SLICE, incLeft); incLeft -= gc; gcKind = 'inc'; if (incLeft <= 0) heap = HEAP0 + incFloat; }
        }
      } else if (heap >= HEAPMAX) { gc = 20 + heap * 2; heap = HEAP0; gcKind = 'full'; }
    }
    let load = 0;
    if (P.load && start >= nextLoad) { load = 150 + rnd() * 300; nextLoad = start + 5000 + rnd() * 2000; }
    const calc = steps * calc1;
    const work = Math.max(0.5, render + calc + gc + load);
    let end = start + work;
    if (P.vsync) end = Math.ceil((end - 0.01) / VB) * VB;
    const f = { start, end, render, calc, calc1, steps, gc, gcKind, fallback, load, drop, spiral, rubber, wait: end - start - work, pos: gameT * SPEED };
    f.cause = load > 0 ? 'load' : gcKind === 'full' ? 'gc' : (P.mode !== 'var' && steps >= 3) ? 'catch' : 'heavy';
    return f;
  }

  // 프레임이 끝나 화면에 나감
  function finish(f) {
    const dt = f.end - f.start;
    prevDt = dt;
    frames.push(f); if (frames.length > 2400) frames.shift();
    hist.push([f.end, dt]);
    const d = f.pos - shown;
    if (f.rubber) lastJump = { t: f.end, from: shown, to: f.pos, d: Math.abs(d), rubber: true };
    else if (d > 0.45) lastJump = { t: f.end, from: shown, to: f.pos, d };
    shown = f.pos; shownT = f.end;
    trail.push([f.end, f.pos]);
    if (dt > BAD) events.push({ t: f.end, kind: f.cause, ms: dt, fallback: f.fallback });
    if (P.mode === 'fixed' && (f.spiral || f.steps >= 5)) spiralUntil = f.end + 2500;
  }

  function step(dt) {
    now += dt;
    for (let guard = 0; cur.end <= now && guard < 400; guard++) { finish(cur); cur = begin(cur.end); }
    let k = 0;
    while (k < hist.length && hist[k][0] < now - 20000) k++;
    if (k) hist.splice(0, k);
    while (trail.length && trail[0][0] < now - 900) trail.shift();
    while (events.length && events[0].t < now - 20000) events.shift();
  }

  // 프리셋: 차트는 이어서 흐르게 두고, 통계와 사건만 새로 센다
  function fresh() {
    hist = []; events = []; spiralUntil = -1;
    heap = HEAP0 + 30; incLeft = 0; nextLoad = now + 1000;
    acc = 0; gameT = now; lastJump = null;
  }

  function setAll(o) {
    sBase.set(o.base); sChars.set(o.chars);
    tGC.set(!!o.gc); sGarb.set(o.garbage || 150); tInc.set(!!o.inc);
    tLoad.set(!!o.load); tVs.set(o.vsync !== false); cMode.set(o.mode || 'var');
    fresh();
  }
  K.presets(F, [
    { label: TR`쾌적`, apply: () => setAll({ base: 8, chars: 60 }) },
    { label: TR`공성전 (캐릭터 400명)`, apply: () => setAll({ base: 13, chars: 400 }) },
    { label: TR`GC 스파이크`, apply: () => setAll({ base: 8, chars: 100, gc: true, garbage: 300 }) },
    { label: TR`새 지역 로딩`, apply: () => setAll({ base: 8, chars: 80, load: true }) },
    { label: TR`V-Sync 경계 (17ms)`, apply: () => setAll({ base: 13.5, chars: 80 }) },
    { label: TR`따라잡기 폭주`, apply: () => setAll({ base: 8, chars: 330, load: true, vsync: false, mode: 'fixed' }) },
  ]);

  reset();
  for (let i = 0; i < 480; i++) step(16);

  /* ---------- 통계 ---------- */
  let S = null, statT = 0;
  function calcStats() {
    const n = hist.length;
    if (!n) return S;
    let tot = 0, over = 0;
    const arr = new Float64Array(n);
    for (let i = 0; i < n; i++) { const d = hist[i][1]; arr[i] = d; tot += d; if (d > BAD) over++; }
    arr.sort();
    const avg = tot / n, k1 = Math.max(1, Math.round(n * 0.01));
    let worst = 0;
    for (let i = n - k1; i < n; i++) worst += arr[i];
    const p99 = worst / k1;
    const rec = frames.slice(-60);
    let work = 0, wmax = 0, a16 = 0, a33 = 0, steps = 0;
    rec.forEach(f => {
      const wk = f.render + f.calc + f.gc + f.load;
      work += wk; wmax = Math.max(wmax, f.render + f.calc); steps += f.steps;
      const d = f.end - f.start;
      if (Math.abs(d - VB) < 1) a16++; else if (Math.abs(d - 2 * VB) < 1) a33++;
    });
    work /= rec.length || 1; steps /= rec.length || 1;
    let dropped = 0, span = 0, maxSteps = 0;
    for (let i = frames.length - 1; i >= 0 && frames[i].end > now - 3000; i--) {
      dropped += frames[i].drop; span += frames[i].end - frames[i].start; maxSteps = Math.max(maxSteps, frames[i].steps);
    }
    return {
      fps: 1000 / avg, low: 1000 / p99, max: arr[n - 1], perMin: (over * 60000) / Math.max(tot, 5000),
      lat: avg * 2 + 10 + (P.vsync ? avg : 0), avg, work, wmax, mixed: P.vsync && a16 >= 6 && a33 >= 6,
      slow: span ? dropped / span : 0, maxSteps, steps,
    };
  }
  function showStats() {
    stF.set(K.n(S.fps), S.fps >= 55 ? 'good' : S.fps >= 30 ? 'warn' : 'bad');
    stL.set(K.n(S.low), S.low >= 45 ? 'good' : S.low >= 20 ? 'warn' : 'bad');
    stM.set(K.ms(S.max), S.max <= 34 ? 'good' : S.max <= 100 ? 'warn' : 'bad');
    stH.set(K.n(S.perMin, S.perMin > 0 && S.perMin < 10 ? 1 : 0), S.perMin < 0.5 ? 'good' : S.perMin <= 6 ? 'warn' : 'bad');
    stI.set(K.ms(S.lat), S.lat <= 70 ? 'good' : S.lat <= 120 ? 'warn' : 'bad');
  }

  /* ---------- 그리기 ---------- */
  function barTop(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h));
    ctx.beginPath();
    ctx.moveTo(x, y + h); ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h); ctx.closePath();
  }
  const fbox = (w, h) => ({ x: 34, y: 30, w: w - 44, h: h - 52 });
  const winMs = w => (w < 520 ? 2500 : 4000);   // 차트에 보이는 시간 폭

  function drawFrames() {
    const { ctx, w, h } = fcv, C = K.C;
    ctx.clearRect(0, 0, w, h);
    const box = fbox(w, h), W = winMs(w), base = box.y + box.h;
    const sc = K.plot(ctx, box, { x0: now - W, x1: now, y0: 0, y1: 120, yTicks: [0, 50, 100] });
    K.text(ctx, 'ms', box.x - 6, box.y - 16, { align: 'right', size: 10.5, color: C.muted });
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, 0, box.w, h); ctx.clip();
    const labs = [];
    const bar = (t0, t1, dt, fill) => {
      const x0 = sc.x(t0), x1 = sc.x(t1), gap = Math.min(0.6, (x1 - x0) * 0.2);
      const y = sc.y(Math.min(dt, 120));
      ctx.fillStyle = fill;
      barTop(ctx, x0 + gap, y, Math.max(0.7, x1 - x0 - gap * 2), base - y, 4); ctx.fill();
      return [(x0 + x1) / 2, y];
    };
    for (let i = frames.length - 1; i >= 0; i--) {
      const f = frames[i];
      if (f.end < now - W) break;
      const dt = f.end - f.start, bad = dt > BAD;
      const [mx, y] = bar(f.start, f.end, dt, bad ? C.bad : C.s1);
      if (!bad) continue;
      ctx.fillStyle = C.bad;
      let ty;
      if (dt > 120) { // 눈금 위로 넘친 막대: 위쪽 화살표
        ctx.beginPath(); ctx.moveTo(mx, box.y - 10); ctx.lineTo(mx + 4, box.y - 3); ctx.lineTo(mx - 4, box.y - 3); ctx.closePath(); ctx.fill();
        ty = box.y - 19;
      } else { ctx.fillRect(mx - 2.5, y - 9, 5, 5); ty = y - 17; }
      labs.push([mx, ty, dt, (CAUSE[f.cause] ? CAUSE[f.cause] + ' ' : '') + Math.round(dt)]);
    }
    // 지금 그리는 중인 장: 멈춤이 길어지면 막대가 자라는 게 보인다
    const run = now - cur.start;
    if (run > 4) bar(cur.start, now, run, K.alpha(run > BAD ? C.bad : C.s1, 0.4));
    ctx.restore();
    // 기준선
    [[VB, '60 FPS'], [VB * 2, '30 FPS']].forEach(([v, lab]) => {
      const yy = Math.round(sc.y(v)) + 0.5;
      ctx.save(); ctx.strokeStyle = C.ink2; ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(box.x, yy); ctx.lineTo(box.x + box.w, yy); ctx.stroke(); ctx.restore();
      ctx.font = K.font(10, 600);
      const tw = ctx.measureText(lab).width;
      ctx.fillStyle = K.alpha(C.paper, 0.88); ctx.fillRect(box.x + 2, yy - 13, tw + 6, 12);
      K.text(ctx, lab, box.x + 5, yy - 7, { size: 10, weight: 600, color: C.ink2 });
    });
    // 큰 막대 이름표: 긴 것부터, 겹치면 건너뜀
    ctx.font = K.font(10, 600);
    const placed = [];
    labs.sort((a, b) => b[2] - a[2]).forEach(([mx, ty, , s]) => {
      const tw = ctx.measureText(s).width + 6;
      const cx = K.clamp(mx, box.x + tw / 2, box.x + box.w - tw / 2);
      const r = [cx - tw / 2, ty - 7, cx + tw / 2, ty + 7];
      if (placed.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) return;
      placed.push(r);
      ctx.fillStyle = K.alpha(C.paper, 0.9); ctx.fillRect(r[0], r[1], tw, 14);
      K.text(ctx, s, cx, ty, { size: 10, weight: 600, align: 'center', color: C.ink2 });
    });
    K.text(ctx, TR`${K.n(W / 1000, 1)}초 전`, box.x, base + 12, { size: 10.5, color: C.muted });
    K.text(ctx, TR`지금`, box.x + box.w, base + 12, { size: 10.5, color: C.muted, align: 'right' });
  }

  K.hover(fcv, x => {
    const box = fbox(fcv.w, fcv.h), W = winMs(fcv.w);
    if (x < box.x || x > box.x + box.w) return null;
    const t = now - W + ((x - box.x) / box.w) * W;
    const f = frames.find(q => q.start <= t && q.end >= t);
    if (!f) return null;
    const dt = f.end - f.start;
    let s = TR`<b>${K.ms(dt)}</b> · ${K.n(1000 / dt)} FPS 속도<br>그리기 ${K.ms(f.render)}<br>게임 계산 ${K.ms(f.calc)}${f.steps !== 1 ? TR` (${f.steps}번)` : ''}`;
    if (f.gc) s += `<br>GC ${K.ms(f.gc)}${f.gcKind === 'inc' ? TR` (점진적)` : ''}`;
    if (f.load) s += TR`<br>동기 로딩 ${K.ms(f.load)}`;
    if (f.wait > 0.5) s += TR`<br>V-Sync 기다림 ${K.ms(f.wait)}`;
    return s;
  });

  function drawScreen() {
    const { ctx, w, h } = scv, C = K.C;
    ctx.clearRect(0, 0, w, h);
    const pad = 18, gy = h - 26, cy = gy - 11, span = w - pad * 2;
    const X = m => pad + ((((m % TRACK) + TRACK) % TRACK) / TRACK) * span;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, gy + 0.5); ctx.lineTo(w - pad, gy + 0.5); ctx.stroke();
    for (let m = 0; m <= TRACK; m += 2) {
      const x = Math.round(pad + (m / TRACK) * span) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + (m % 10 === 0 ? 6 : 3)); ctx.stroke();
    }
    K.text(ctx, TR`눈금 = 2m`, w - pad, h - 9, { size: 10.5, color: C.muted, align: 'right' });
    // 잔상: 화면에 실제로 그려졌던 자리들. 빈틈 = 순간이동
    trail.forEach(([t, m]) => {
      const a = 1 - (now - t) / 900;
      if (a <= 0) return;
      ctx.fillStyle = K.alpha(C.s1, 0.35 * a);
      ctx.beginPath(); ctx.arc(X(m), cy, 3.5, 0, Math.PI * 2); ctx.fill();
    });
    // 원래 있어야 할 위치
    ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = C.ink2; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(X(now * SPEED), cy, 9, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    const cx = X(shown);
    K.dot(ctx, cx, cy, 8, C.s1, C.paper);
    // 멈춤 표시
    const frozen = now - shownT;
    if (frozen > BAD) {
      const s = TR`멈춤 ${Math.round(frozen)}ms`;
      ctx.font = K.font(11, 600);
      const tw = ctx.measureText(s).width + 10;
      const lx = K.clamp(cx - tw / 2, 2, w - tw - 2);
      ctx.fillStyle = C.bad; ctx.fillRect(lx, cy - 28, 6, 6);
      K.text(ctx, s, lx + 10, cy - 25, { size: 11, weight: 600, color: C.badInk });
    }
    // 순간이동 표시
    if (lastJump && now - lastJump.t < 1400) {
      const x1 = X(lastJump.from), x2 = X(lastJump.to), yb = cy - 42;
      const s = lastJump.rubber ? TR`서버 위치로 당겨짐 ${K.n(lastJump.d, 1)}m (고무줄)` : TR`순간이동 ${K.n(lastJump.d, 1)}m`;
      if (x2 > x1 + 6) {
        ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x1, yb + 5); ctx.lineTo(x1, yb); ctx.lineTo(x2, yb); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2 - 5, yb - 4); ctx.lineTo(x2, yb); ctx.lineTo(x2 - 5, yb + 4); ctx.stroke();
        ctx.restore();
      }
      ctx.font = K.font(11, 600);
      const tw = ctx.measureText(s).width;
      const lx = K.clamp((x1 + x2) / 2, tw / 2 + 4, w - tw / 2 - 4);
      K.text(ctx, s, lx, yb - 11, { size: 11, weight: 600, align: 'center', color: C.ink });
    }
    const lag = now - gameT;
    if (P.mode === 'cap' && lag > 100) K.text(ctx, TR`게임 시계가 ${K.n(lag / 1000, 1)}초 뒤처짐`, pad, h - 9, { size: 10.5, weight: 600, color: C.warnInk });
  }

  /* ---------- 해설 ---------- */
  const CLIENT = TR` 모두 내 컴퓨터 안의 일이라 <b>회선과 서버는 멀쩡하고</b>, 다른 플레이어 화면 속 나는 대개 평소처럼 움직입니다.`;
  function recent(kind) {
    // 지금 그리는 중인 장이 이미 길어지고 있으면 그 원인을 먼저 말한다
    if (now - cur.start > 30 && cur.cause === kind && cur.end - cur.start > BAD) return { ms: cur.end - cur.start, kind, fallback: cur.fallback };
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (now - e.t > 3000) break;
      if (e.kind === kind) return e;
    }
    return null;
  }
  function jumpText(e) {
    const d = lastJump && !lastJump.rubber && now - lastJump.t < 3000 ? lastJump.d : Math.min(e.ms, P.mode === 'cap' ? 5 * VB : e.ms) * SPEED;
    if (P.mode === 'var') return TR`풀리는 순간 캐릭터가 <b>${K.n(d, 1)}m 순간이동</b>합니다.`;
    if (P.mode === 'fixed') return TR`풀리면 밀린 계산을 몰아서 돌려 <b>${K.n(d, 1)}m 순간이동</b>하고, 몰아 돌린 계산 때문에 다음 프레임도 늦어집니다.`;
    return TR`따라잡기를 5번에서 멈추니 이동은 ${K.n(d, 1)}m에 그치지만, 나머지 시간은 버려져 게임 시계가 그만큼 뒤처집니다(<b>슬로우모션</b>).`;
  }
  function explain() {
    if (!S) return '';
    if (P.mode === 'fixed' && now < spiralUntil) {
      return TR`${K.flag('bad')}<b>따라잡기 폭주.</b> 늦어진 시간을 메우려고 게임 계산(한 번에 ${K.ms(calcCost())})을 한 프레임에 최대 <b>${S.maxSteps}번</b> 되풀이합니다. 되풀이하는 동안 또 시간이 밀려 긴 프레임이 줄줄이 이어집니다. 플레이어는 <b>뚝뚝 끊김</b>과 <b>순간이동</b>을 연달아 봅니다. “따라잡기 상한”으로 바꾸면 뚝뚝 끊김이 <b>슬로우모션</b>으로 바뀝니다.` + CLIENT;
    }
    const eL = recent('load');
    if (eL) return TR`${K.flag('bad')}<b>새 지역 로딩</b>: 텍스처를 읽고 셰이더를 컴파일하느라 게임 스레드가 <b>${K.ms(eL.ms)}</b> 동안 다른 일을 못 했습니다. 그동안 화면은 <b>멈춤</b>. ${jumpText(eL)} 로딩을 다른 스레드로 넘기거나 미리 해 두면 사라집니다.` + CLIENT;
    const eG = recent('gc');
    if (eG) return TR`${K.flag('bad')}<b>가비지 컬렉션</b>: ${eG.fallback ? TR`점진적 GC가 가비지 생성 속도를 못 따라가 결국 ` : ''}힙이 ${HEAPMAX}MB까지 차자 힙 전체를 훑어 가비지를 수집하느라 게임 전체를 <b>${K.ms(eG.ms)}</b> 멈췄습니다. 그동안 <b>멈춤</b>. ${jumpText(eG)} 가비지를 덜 만들거나(오브젝트 재사용) 점진적 GC를 켜면 줄어듭니다.` + CLIENT;
    if (P.mode === 'cap' && S.slow > 0.03) {
      return TR`${K.flag(S.slow > 0.2 ? 'bad' : 'warn')}한 프레임이 평균 ${K.ms(S.avg)}나 걸려 따라잡기 5번 상한에 걸립니다. 못 돌린 시간은 버려져 게임 세계가 실제의 <b>${K.pct(1 - S.slow)}</b> 속도로 흐릅니다(<b>슬로우모션</b>). 온라인 게임에서는 서버가 아는 위치와 벌어지면 <b>고무줄</b>처럼 당겨지기도 합니다.` + CLIENT;
    }
    if (S.mixed) return TR`${K.flag('warn')}한 프레임 작업이 평균 <b>${K.ms(S.work)}</b>로 16.7ms 언저리입니다. V-Sync는 16.7ms 간격에 맞춰 내보내므로 어떤 프레임은 16.7ms, 어떤 프레임은 33.3ms가 걸립니다. FPS가 60과 30 사이를 오가 움직임이 들쭉날쭉합니다(<b>뚝뚝 끊김</b>). GC·로딩을 뺀 가장 무거운 프레임이 ${K.ms(S.wmax)}이니, 작업을 ${K.ms(Math.max(0.5, S.wmax - VB + 0.3))}쯤 줄여 모든 프레임이 16.7ms 안에 끝나면 60에 고정됩니다.`;
    if (S.fps < 45) {
      return TR`${K.flag(S.fps < 25 ? 'bad' : 'warn')}한 프레임 작업이 평균 <b>${K.ms(S.work)}</b>입니다. 캐릭터 ${K.n(P.chars)}명을 그리고 패킷 ${K.n(P.chars * 0.5)}개를 처리${P.mode !== 'var' && S.steps > 1.3 ? TR`하고, 밀린 시간을 메우려 게임 계산을 한 프레임에 평균 ${K.n(S.steps, 1)}번 되풀이` : ''}하느라 1초에 <b>${K.n(S.fps)}프레임</b>밖에 못 그립니다. 화면은 <b>뚝뚝 끊김</b>, 누른 키는 ${K.ms(S.lat)} 뒤에야 보입니다(<b>입력 지연</b>).` + CLIENT;
    }
    if (P.load) return TR`${K.flag('warn')}지금은 한 프레임 작업이 ${K.ms(S.work)}라 매끄럽습니다. 하지만 몇 초마다 새 지역에 들어서며 게임 스레드가 에셋을 직접 읽습니다. 곧 화면이 <b>멈춤</b> 뒤 <b>순간이동</b>합니다.`;
    if (P.gc && P.inc && incLeft > 0) return TR`${K.flag('good')}점진적 GC가 프레임마다 ${SLICE}ms씩 가비지를 나눠 수집하는 중입니다. 큰 멈춤 없이 매끄럽게 달립니다.`;
    if (P.gc && P.inc && P.garbage > 0) return TR`${K.flag('good')}가비지가 <b>${K.n(heap)}MB</b> 쌓였습니다. ${INC_START}MB가 되면 점진적 GC가 프레임마다 ${SLICE}ms씩 나눠 수집하기 시작합니다. 가비지를 너무 빨리 만들면 다 수집하지 못하고 ${HEAPMAX}MB에서 결국 한 번에 멈춥니다.`;
    if (P.gc && P.garbage > 0) return TR`${K.flag('warn')}가비지가 <b>${K.n(heap)}MB</b> 쌓였습니다. ${HEAPMAX}MB가 되면 한꺼번에 수집하느라 게임이 잠깐 멈춥니다. 지금은 한 프레임 작업이 ${K.ms(S.work)}라 매끄럽습니다.`;
    return TR`${K.flag('good')}한 프레임 작업이 평균 <b>${K.ms(S.work)}</b>로 16.7ms 안에 넉넉히 끝납니다. 캐릭터가 매끄럽게 달리고, 누른 키는 ${K.ms(S.lat)} 뒤에 화면에 나타납니다.`;
  }

  K.loop(root, dt => {
    step(dt);
    statT += dt;
    if (statT > 250 || !S) { statT = 0; S = calcStats(); if (S) showStats(); }
    drawFrames();
    drawScreen();
    heapOut.textContent = P.gc ? `${K.n(heap)} / ${HEAPMAX} MB` : TR`꺼짐`;
    heapM.set(P.gc ? heap / HEAPMAX : 0, heap > 56 ? 'bad' : heap > 40 ? 'warn' : null);
    F.say(explain());
  });
});
