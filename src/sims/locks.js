/* 락 경합과 데드락: 여러 스레드가 공유 자료(경매장 목록 등)를 고치려면 락을 잡아야 한다.
   락 안의 일이 길면 스레드를 늘려도 처리량이 1/f 에서 막히고, 락을 반대 순서로 잡으면 영원히 멈춘다. */
K.register('locks', function (root) {
  const TR = I18N.tr('sim-locks');   // 이 실험 묶음의 사전을 먼저 본다(i18n.js)
  const F = K.frame(root, {
    kicker: TR`레이어 9 · 서버 게임 프로세스`,
    title: TR`모든 스레드가 같은 락 하나를 기다린다`,
    lead: TR`서버에서는 여러 스레드(동시에 일하는 실행 단위)가 함께 일합니다. 경매장 목록처럼 모두가 함께 쓰는 공유 데이터는 한 번에 한 스레드만 고치도록 락(잠금)을 겁니다. 락 안에서 하는 일이 길수록 스레드들은 락을 기다리며 대기합니다. 스레드를 늘려도 빨라지지 않는 이유가 여기 있습니다.`,
    tries: [
      TR`<b>락 안에서 하는 일</b>을 20% → 40%로 올려 보세요. 줄무늬(기다림)가 레인을 채우고, 스레드 수는 그대로인데 초당 처리 작업이 절반 가까이 줄어듭니다.`,
      TR`<b>스레드만 늘리기 (16개, 큰 락)</b>를 눌러 보세요. 스레드가 두 배인데 처리량은 그대로이고, 기다리는 스레드만 늘어납니다.`,
      TR`<b>락 방식</b>을 “잘게 나눈 락 8개”로 바꿔 보세요. 서로 다른 락을 쓰는 스레드끼리는 기다리지 않아 대기가 거의 사라집니다.`,
      TR`<b>데드락 일으키기</b>를 눌러 보세요. 두 스레드가 서로가 잡은 락을 기다리며 영원히 멈추고, 다른 스레드도 하나둘 대기 상태에 갇힙니다.`,
    ],
  });

  const P = { T: 8, f: 0.2, mode: 'big' };
  const JOB = 2;          // 작업 하나 = 약 2ms
  const SLOW = 0.01;      // 100배 느리게 재생
  const WIN = 60;         // 레인에 보이는 시간 (ms)
  const MEAS = 60;        // 수치를 재는 구간 (ms, 실제로는 6초)
  const WATCHDOG = 5000;  // 감시 타이머 (실제 ms)
  const RESTART = 3200;
  let rnd = K.rng(3);

  K.addStyle('locks', `
    .sim[data-sim="locks"] .cv-cap { flex-wrap: wrap; row-gap: 4px; }
    .sim[data-sim="locks"] .lk-hatch { display:inline-block; width:14px; height:11px; border-radius:2px; vertical-align:middle; margin-right:5px;
      background: repeating-linear-gradient(135deg, var(--bad) 0 1.5px, transparent 1.5px 4px), color-mix(in srgb, var(--bad) 14%, transparent); }
    .sim[data-sim="locks"] .lk-btns { display:flex; flex-wrap:wrap; gap:8px; }
    .sim[data-sim="locks"] .tk-sw { display:inline-block; width:8px; height:8px; border-radius:2px; margin-right:5px; }
  `);

  const lcv = K.canvas(F.stage, {
    height: w => K.clamp(w * 0.42, 240, 310),
    caption: TR`스레드별로 무엇을 하고 있나 <span style="font-weight:400;color:var(--muted)">(100배 느리게)</span>`,
    right: TR`<span class="legend"><span><i class="box" style="background:var(--s1)"></i>일하는 중</span><span><i class="box" style="background:var(--s2)"></i>락 잡고 일하는 중</span><span><span class="lk-hatch"></span>락 기다리는 중</span></span>`,
  });
  const ccv = K.canvas(F.stage, {
    height: w => K.clamp(w * 0.36, 200, 250),
    caption: TR`스레드 수에 따른 처리량`,
    right: TR`<span class="legend"><span><i style="background:var(--s3)"></i>큰 락 하나</span><span><i style="background:var(--s4)"></i>잘게 나눈 락</span><span><i style="background:var(--muted)"></i>이상적</span></span>`,
  });

  /* ---------- 조작부 ---------- */
  const g1 = K.group(F.controls, TR`스레드와 작업`);
  const sT = K.slider(g1, { label: TR`스레드 수`, min: 1, max: 16, step: 1, value: P.T, unit: TR`개`, onInput: v => { P.T = v; reset(); }, hint: TR`CPU 코어는 16개라고 가정합니다` });
  const sF = K.slider(g1, {
    label: TR`락 안에서 하는 일`, min: 0, max: 80, step: 2, value: P.f * 100, fmt: v => v + '%', onInput: v => { P.f = v / 100; reset(); },
    hint: TR`작업 하나(약 2ms) 중 공유 데이터를 고치느라 락을 잡고 있어야 하는 비율`,
  });
  const g2 = K.group(F.controls, TR`락 방식`);
  const cMode = K.choice(g2, {
    label: TR`공유 데이터(경매장 목록) 보호 방식`, value: P.mode, options: [['big', TR`큰 락 하나`], ['fine', TR`잘게 나눈 락 8개`]],
    onChange: v => { P.mode = v; reset(); }, hint: TR`잘게 나눈 락: 아이템 종류별로 락을 따로 둡니다. 작업마다 8개 중 하나를 씁니다.`,
  });
  const g3 = K.group(F.controls, TR`사고 내 보기`);
  const bx = K.el('div', { class: 'lk-btns' });
  g3.append(bx);
  K.button(bx, { label: TR`데드락 일으키기`, kind: 'primary', onClick: () => armDeadlock() });
  K.button(bx, { label: TR`복구`, onClick: () => reset() });
  g3.append(K.el('small', { class: 'ctl-hint', text: TR`워치독(감시 타이머): 스레드가 5초 동안 풀려나지 못하면 서버를 강제로 다시 켭니다. 실제 서버는 보통 수십 초를 기다리지만 여기서는 짧게 줄였습니다.` }));

  K.presets(F, [
    { label: TR`락 거의 없음`, apply: () => { cMode.set('big'); sT.set(8); sF.set(2); } },
    { label: TR`큰 락 하나 (40%)`, apply: () => { cMode.set('big'); sT.set(8); sF.set(40); } },
    { label: TR`잘게 나눈 락`, apply: () => { cMode.set('fine'); sT.set(8); sF.set(40); } },
    { label: TR`스레드만 늘리기 (16개, 큰 락)`, apply: () => { cMode.set('big'); sT.set(16); sF.set(40); } },
    { label: TR`데드락`, apply: () => { cMode.set('big'); sT.set(8); sF.set(20); armDeadlock(); } },
  ]);

  const stThr = K.stat(F.stats, { label: TR`초당 처리 작업`, unit: TR`건/초` });
  const stWait = K.stat(F.stats, { label: TR`평균 락 대기` });
  const stRatio = K.stat(F.stats, { label: TR`스레드 대기 비율` });
  const stGain = K.stat(F.stats, { label: TR`스레드 늘린 이득` });

  /* ---------- 시뮬레이션 ---------- */
  let now = 0, th = [], locks = [], done = [], waits = [], dl = null, real = 0;
  const lockName = L => (P.mode === 'big' ? (L === 8 ? TR`B(우편함)` : TR`A(경매장)`) : (L === 0 ? 'A' : L === 1 ? 'B' : TR`${L + 1}번@@잠금 이름(3번 잠금)`));

  function setSt(t, st, at, until) {
    const last = t.segs[t.segs.length - 1];
    if (last && last[1] == null) last[1] = at;
    t.segs.push([at, null, st]);
    t.st = st; t.until = until;
  }
  function startJob(t, at) {
    if (t.script && !t.script.started) { runScript(t, at); return; }
    const out = JOB * (1 - P.f) * (0.6 + 0.8 * rnd());
    t.inside = JOB * P.f * (0.6 + 0.8 * rnd());
    t.lock = P.f > 0.001 ? (P.mode === 'big' ? 0 : Math.floor(rnd() * 8)) : -1;
    setSt(t, 'work', at, at + out);
  }
  function acquire(t, L, at) {
    const lk = locks[L];
    t.lock = L;
    if (lk.owner < 0) { lk.owner = t.id; waits.push([at, 0]); gotLock(t, at); }
    else { lk.q.push(t); t.waitFrom = at; setSt(t, 'wait', at, Infinity); }
  }
  function gotLock(t, at) {
    if (t.script && t.script.started) { scriptGot(t, at); return; }
    setSt(t, 'hold', at, at + t.inside);
  }
  function release(L, at) {
    const lk = locks[L];
    lk.owner = -1;
    const nx = lk.q.shift();
    if (nx) { lk.owner = nx.id; waits.push([at, at - nx.waitFrom]); gotLock(nx, at); }
  }
  function finish(t, at) {
    if (t.st === 'work') {
      if (t.script && !t.script.started) { runScript(t, at); return; }
      if (t.lock < 0) { done.push(at); startJob(t, at); } else acquire(t, t.lock, at);
    } else if (t.st === 'hold') {
      if (t.script && t.script.started) { scriptHoldDone(t, at); return; }
      release(t.lock, at); done.push(at); startJob(t, at);
    }
  }
  // 데드락 대본: 스레드 1은 A → B, 스레드 2는 B → A 순서로 잡는다
  function runScript(t, at) { t.script.started = true; acquire(t, t.script.seq[0], at); }
  function scriptGot(t, at) {
    const s = t.script;
    s.step = 1;
    t.note = lockName(s.seq[0]) + TR` 보유`;
    setSt(t, 'hold', at, Infinity);
    const other = th[1 - t.id];
    if (other.script.step === 1) { t.until = at + 0.4; other.until = at + 0.4; }
  }
  function scriptHoldDone(t, at) {
    const s = t.script;
    t.note = TR`${lockName(s.seq[0])} 잡고 ${lockName(s.seq[1])} 기다림`;
    s.step = 2;
    acquire(t, s.seq[1], at);
  }
  function armDeadlock() {
    if (dl) reset();
    if (P.T < 2) sT.set(2);
    const A = 0, B = P.mode === 'big' ? 8 : 1;
    th[0].script = { seq: [A, B], step: 0, started: false };
    th[1].script = { seq: [B, A], step: 0, started: false };
    dl = { phase: 'arm', A, B, t0: real };
  }

  function sim(d) {
    const end = now + d;
    for (let g = 0; g < 40000; g++) {
      let m = null;
      for (const t of th) if (t.until <= end && (!m || t.until < m.until)) m = t;
      if (!m) break;
      now = m.until;
      finish(m, m.until);
    }
    now = end;
    const cut = now - MEAS - 20;
    while (done.length && done[0] < cut) done.shift();
    while (waits.length && waits[0][0] < cut) waits.shift();
    for (const t of th) {
      let k = 0;
      while (k < t.segs.length - 1 && t.segs[k][1] != null && t.segs[k][1] < cut) k++;
      if (k) t.segs.splice(0, k);
    }
    if (dl && dl.phase === 'arm' && th[0].st === 'wait' && th[1].st === 'wait' && th[0].script.step === 2 && th[1].script.step === 2) {
      dl.phase = 'stuck'; dl.t0 = real;
    }
  }
  function reset() {
    rnd = K.rng(3 + Math.floor(Math.random() * 1000));
    now = 0; done = []; waits = []; dl = null;
    locks = Array.from({ length: 9 }, () => ({ owner: -1, q: [] }));
    th = Array.from({ length: P.T }, (_, i) => ({ id: i, st: 'work', until: 0, lock: -1, inside: 0, segs: [], script: null, waitFrom: 0, note: '' }));
    th.forEach(t => startJob(t, 0));
    sim(MEAS + 60);
  }
  function measure() {
    const t0 = now - MEAS;
    const n = done.filter(x => x > t0).length;
    let ws = 0, wn = 0;
    for (const [at, w] of waits) if (at > t0) { ws += w; wn++; }
    for (const t of th) if (t.st === 'wait') { ws += now - t.waitFrom; wn++; }
    let wt = 0;
    for (const t of th) for (const s of t.segs) {
      if (s[2] !== 'wait') continue;
      const a = Math.max(s[0], t0), b = s[1] == null ? now : s[1];
      if (b > a) wt += b - a;
    }
    return { thr: (n / MEAS) * 1000, wait: wn ? ws / wn : 0, ratio: wt / (MEAS * th.length) };
  }

  // 이론 곡선: 닫힌 대기열의 평균값 분석(MVA). 락 = 창구, 락 밖의 일 = 생각하는 시간
  function curve(mode, f) {
    const S = JOB * f, Z = JOB * (1 - f), out = [];
    const nL = mode === 'big' ? 1 : 8, D = S / nL;
    let Q = 0;
    for (let n = 1; n <= 16; n++) {
      if (S < 1e-9) { out.push((n * 1000) / JOB); continue; }
      const R = D * (1 + Q);
      const X = n / (Z + nL * R);
      Q = X * R;
      out.push(X * 1000);
    }
    return out;
  }

  reset();

  /* ---------- 그리기: 레인 ---------- */
  let hatch = null, hatchKey = '';
  function hatchPat(ctx) {
    if (hatch && hatchKey === K.C.bad) return hatch;
    const c = document.createElement('canvas');
    c.width = 6; c.height = 6;
    const x = c.getContext('2d');
    x.fillStyle = K.alpha(K.C.bad, 0.14); x.fillRect(0, 0, 6, 6);
    x.strokeStyle = K.C.bad; x.lineWidth = 1.3;
    x.beginPath(); x.moveTo(-1, 7); x.lineTo(7, -1); x.moveTo(-1, 1); x.lineTo(1, -1); x.moveTo(5, 7); x.lineTo(7, 5); x.stroke();
    hatch = ctx.createPattern(c, 'repeat'); hatchKey = K.C.bad;
    return hatch;
  }
  function drawLanes() {
    const { ctx, w, h } = lcv;
    const C = K.C;
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 480;
    const lx = narrow ? 24 : 58, rx = w - 10, top = 30, bot = h - 22;
    const T = th.length;
    const rowH = Math.min(30, (bot - top) / T);
    const bh = Math.max(3, rowH - (rowH > 9 ? 4 : 2));
    const win = narrow ? 36 : WIN;
    const t0 = now - win;
    const X = t => lx + ((t - t0) / win) * (rx - lx);
    const pat = hatchPat(ctx);
    // 위 줄: 락 상태
    const busy = locks.filter(l => l.owner >= 0).length;
    const queued = locks.reduce((a, l) => a + l.q.length, 0);
    let head;
    if (P.f < 0.001) head = TR`락을 쓰지 않음`;
    else if (P.mode === 'big') head = locks[0].owner >= 0 ? TR`경매장 락: 스레드 ${locks[0].owner + 1} 사용 중 · 대기 ${locks[0].q.length}개` : TR`경매장 락: 비어 있음`;
    else head = TR`락 8개 중 ${Math.min(8, busy)}개 사용 중 · 대기 ${queued}개`;
    K.text(ctx, narrow ? head.replace(TR`경매장 락: `, '') : head, lx, 14, { size: 11.5, color: C.ink2, weight: 600 });
    th.forEach((t, i) => {
      const y = top + i * rowH + (rowH - bh) / 2;
      if (rowH >= 9 || i % 2 === 0) K.text(ctx, narrow ? String(i + 1) : TR`스레드 ${i + 1}`, lx - 6, y + bh / 2, { align: 'right', size: narrow || rowH < 14 ? 10 : 11, color: C.muted });
      ctx.fillStyle = C.sunk; ctx.fillRect(lx, y, rx - lx, bh);
      for (const s of t.segs) {
        const e = s[1] == null ? now : s[1];
        if (e <= t0) continue;
        const a = X(Math.max(s[0], t0)), b = X(e);
        let ww = b - a;
        if (ww < 0.4) continue;
        if (ww > 4 && s[1] != null) ww -= 1;   // 이웃 조각 사이 1px 틈
        ctx.fillStyle = s[2] === 'work' ? C.s1 : s[2] === 'hold' ? C.s2 : pat;
        ctx.fillRect(a, y, ww, bh);
      }
      if (t.note && dl && rowH >= 12) {
        ctx.font = K.font(10.5, 600);
        const tw = ctx.measureText(t.note).width + 10;
        ctx.fillStyle = K.alpha(C.paper, 0.94);
        K.rr(ctx, rx - tw - 4, y + bh / 2 - 8, tw, 16, 4); ctx.fill();
        K.text(ctx, t.note, rx - 9, y + bh / 2, { align: 'right', size: 10.5, weight: 600, color: C.badInk });
      }
    });
    K.text(ctx, TR`${win}ms 전`, lx, h - 10, { size: 10.5, color: C.muted, mono: true });
    K.text(ctx, TR`지금`, rx, h - 10, { size: 10.5, color: C.muted, align: 'right' });
    // 감시 타이머
    if (dl && dl.phase === 'stuck') {
      const left = Math.max(0, (WATCHDOG - (real - dl.t0)) / 1000);
      const lab = TR`워치독 ${K.n(left, 1)}초`;
      ctx.font = K.font(11.5, 700);
      const tw = ctx.measureText(lab).width + 14;
      ctx.fillStyle = C.bad; K.rr(ctx, rx - tw, 4, tw, 20, 5); ctx.fill();
      K.text(ctx, lab, rx - 7, 14, { align: 'right', size: 11.5, weight: 700, color: '#fff' });
    }
    if (dl && dl.phase === 'restart') {
      ctx.fillStyle = K.alpha(C.surface, 0.9);
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      ctx.fillStyle = C.bad; K.rr(ctx, cx - 7, cy - 44, 14, 14, 2); ctx.fill();
      K.text(ctx, TR`서버 재시작`, cx, cy - 12, { align: 'center', size: narrow ? 17 : 20, weight: 700, color: C.ink });
      K.text(ctx, TR`이 서버의 모든 유저 접속 끊김`, cx, cy + 14, { align: 'center', size: narrow ? 13 : 14, weight: 600, color: C.badInk });
      K.text(ctx, TR`다시 켜는 중…`, cx, cy + 36, { align: 'center', size: 11.5, color: C.muted });
    }
  }

  /* ---------- 그리기: 처리량 곡선 ---------- */
  function curveBox() {
    const { w, h } = ccv;
    const wide = w >= 560;
    return { x: 50, y: 24, w: w - 62 - (wide ? 78 : 0), h: h - 58, wide };
  }
  function drawCurve(meas) {
    const { ctx, w, h } = ccv;
    const C = K.C;
    ctx.clearRect(0, 0, w, h);
    const box = curveBox();
    const sc = K.plot(ctx, box, {
      x0: 1, x1: 16, y0: 0, y1: 8000, yTicks: [0, 2000, 4000, 6000, 8000], yFmt: v => (v ? K.n(v / 1000) + TR`천` : '0'),
      xTicks: w < 420 ? [1, 4, 8, 12, 16] : [1, 2, 4, 6, 8, 10, 12, 14, 16], yTitle: TR`초당 처리 작업 (건)`, xTitle: TR`스레드 수`,
    });
    const big = curve('big', P.f), fine = curve('fine', P.f);
    const pts = arr => arr.map((v, i) => [i + 1, v]);
    const ideal = pts(Array.from({ length: 16 }, (_, i) => ((i + 1) * 1000) / JOB));
    K.line(ctx, sc, ideal, C.muted, 1.5);
    const curA = P.mode === 'big';
    ctx.save(); ctx.globalAlpha = curA ? 0.4 : 1; K.line(ctx, sc, pts(fine), C.s4, 2); ctx.restore();
    ctx.save(); ctx.globalAlpha = curA ? 1 : 0.4; K.line(ctx, sc, pts(big), C.s3, 2); ctx.restore();
    if (box.wide) {
      const labs = [[ideal[15][1], TR`이상적`], [big[15], TR`큰 락 하나`], [fine[15], TR`잘게 나눈 락`]]
        .map(([v, t]) => ({ y: sc.y(v), t })).sort((a, b) => a.y - b.y);
      for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 14) labs[i].y = labs[i - 1].y + 14;
      labs.forEach(l => K.text(ctx, l.t, box.x + box.w + 8, Math.min(l.y, box.y + box.h), { size: 11, color: C.ink2 }));
    }
    const T = P.T, cur = (curA ? big : fine)[T - 1];
    const xx = Math.round(sc.x(T)) + 0.5;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xx, box.y); ctx.lineTo(xx, box.y + box.h); ctx.stroke();
    K.dot(ctx, sc.x(T), sc.y(cur), 5, curA ? C.s3 : C.s4, C.paper);
    const my = sc.y(Math.min(meas.thr, 8000));
    ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sc.x(T), my, 7, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    const right = T > 11;
    K.text(ctx, TR`지금`, sc.x(T) + (right ? -12 : 12), Math.min(my, sc.y(cur)) - 12, { align: right ? 'right' : 'left', size: 11, weight: 600, color: C.ink });
  }
  K.hover(ccv, x => {
    const box = curveBox();
    const T = Math.round(1 + ((x - box.x) / box.w) * 15);
    if (T < 1 || T > 16) return null;
    const big = curve('big', P.f)[T - 1], fine = curve('fine', P.f)[T - 1];
    const sw = c => `<span class="tk-sw" style="background:var(--${c})"></span>`;
    return TR`스레드 <b>${T}개</b> · 락 안의 일 ${Math.round(P.f * 100)}%<br>${sw('s3')}큰 락 하나 <b>${K.n(big)}건/초</b> (×${K.n(big / 500, 1)})<br>${sw('s4')}잘게 나눈 락 <b>${K.n(fine)}건/초</b> (×${K.n(fine / 500, 1)})<br>이상적 ${K.n(T * 500)}건/초 (×${T})`;
  });

  /* ---------- 해설 ---------- */
  function explain(m) {
    const T = th.length, fp = Math.round(P.f * 100);
    const gain = m.thr / 500;
    if (dl && dl.phase === 'restart') {
      return TR`${K.flag('bad')} 워치독이 멈춘 서버를 강제로 다시 켭니다. 이 서버에 있던 <b>모든 플레이어</b>가 한꺼번에 <b>접속 끊김</b>을 겪고, 다시 들어오려는 사람이 몰려 한동안 <b>접속 불가·무한 로딩</b>이 이어집니다. 락에 기다림 제한 시간이 없으면 데드락은 스스로 풀리지 않아서, 재시작 말고는 방법이 없습니다.`;
    }
    if (dl && dl.phase === 'stuck') {
      const stuck = th.filter(t => t.st === 'wait').length;
      const left = Math.max(0, (WATCHDOG - (real - dl.t0)) / 1000);
      return TR`${K.flag('bad')} <b>데드락(교착 상태)</b>: 스레드 1은 ${lockName(dl.A)} 락을 잡은 채 ${lockName(dl.B)} 락을, 스레드 2는 ${lockName(dl.B)} 락을 잡은 채 ${lockName(dl.A)} 락을 기다립니다. 둘 다 상대가 먼저 놓기를 기다리니 영원히 풀리지 않습니다. 두 사람이 동시에 서로에게 거래를 걸 때처럼 락을 잡는 순서가 엇갈리면 생깁니다. 지금 스레드 ${T}개 중 <b>${stuck}개</b>가 갇혔습니다. 플레이어는 처음엔 경매장·거래만 멈추다가, 워커 스레드가 모두 갇히면 서버 전체가 <b>멈춤</b>을 겪습니다. 워치독이 <b>${K.n(left, 1)}초</b> 뒤 서버를 강제로 다시 켭니다.`;
    }
    if (dl && dl.phase === 'arm') {
      return TR`${K.flag('warn')} 스레드 1과 2가 두 락을 서로 <b>반대 순서</b>로 잡으려 합니다. 각자 첫 번째 락을 잡는 순간 서로의 두 번째 락을 기다리게 됩니다.`;
    }
    if (P.f < 0.001 || m.ratio < 0.1) {
      const why = P.mode === 'fine' && P.f > 0.001 ? TR`락을 8개로 나눠 서로 다른 락을 쓰는 스레드끼리는 기다리지 않습니다. 락 안의 일이 ${fp}%여도` : TR`락 안에서 하는 일이 ${fp}%뿐이라`;
      return TR`${K.flag('good')} ${why} 스레드들이 거의 기다리지 않습니다. 스레드 ${T}개가 각자 일해서 1개일 때보다 <b>×${K.n(gain, 1)}</b> 많이 처리합니다. 경매장·거래창 요청이 몰려도 금방 처리됩니다.`;
    }
    const waiting = K.n(m.ratio * T, 1);
    const cap = P.mode === 'big' ? TR`락 안의 일(${fp}%)은 한 번에 한 스레드만 할 수 있어서, 스레드를 아무리 늘려도 처리량은 최대 <b>×${K.n(1 / P.f, 1)}</b>(1 ÷ ${K.n(P.f, 2)})에서 멈춥니다.` : TR`락을 8개로 나눠 서로 다른 락을 쓰는 스레드끼리는 기다리지 않지만, 같은 락을 고른 스레드끼리는 여전히 대기합니다.`;
    const sym = TR`이 처리량(초당 ${K.n(m.thr)}건)보다 요청이 많이 몰리면 대기열이 끝없이 길어집니다. 플레이어는 경매장 검색·거래창이 늦게 열리는 <b>입력 지연</b>을 겪고, 심하면 그 기능만 <b>멈춤</b>처럼 느낍니다. 사냥·이동처럼 이 락을 안 쓰는 일은 멀쩡합니다.`;
    if (m.ratio < 0.3) return TR`${K.flag('warn')} 스레드 ${T}개 중 평균 <b>${waiting}개</b>가 락 앞에서 기다립니다. ${cap} ${sym}`;
    return TR`${K.flag('bad')} 스레드 ${T}개 중 평균 <b>${waiting}개</b>가 락을 기다리고 있습니다. 스레드를 늘려도 대기하는 스레드만 늘어납니다. ${cap} ${sym}`;
  }

  K.loop(root, dt => {
    real += dt;
    if (dl && dl.phase === 'stuck' && real - dl.t0 >= WATCHDOG) { dl.phase = 'restart'; dl.r0 = real; }
    if (dl && dl.phase === 'restart') { if (real - dl.r0 >= RESTART) reset(); }
    else sim(dt * SLOW);
    const m = measure();
    if (dl && dl.phase === 'restart') m.thr = 0;
    if (dl && dl.phase === 'stuck') {
      // 갇힌 뒤에는 6초 평균이 늦게 따라오므로 최근 1초(시뮬레이션 10ms)만 본다
      m.thr = (done.filter(x => x > now - 10).length / 10) * 1000;
      m.ratio = th.filter(t => t.st === 'wait').length / th.length;
    }
    drawLanes();
    drawCurve(m);
    const T = th.length;
    const gain = m.thr / 500;
    const down = dl && dl.phase === 'restart';
    stThr.set(down ? '0' : K.n(m.thr), down || gain < T * 0.4 ? 'bad' : gain < T * 0.75 ? 'warn' : 'good');
    stWait.set(down ? '—' : K.ms(m.wait), down ? 'bad' : m.wait > JOB * 2 ? 'bad' : m.wait > JOB * 0.3 ? 'warn' : 'good', down ? TR`서버 꺼짐` : TR`락 한 번 잡는 데`);
    stRatio.set(down ? '—' : K.n(m.ratio * 100) + '<i>%</i>', down || m.ratio > 0.3 ? 'bad' : m.ratio >= 0.1 ? 'warn' : 'good', down ? TR`서버 꺼짐` : TR`평균 ${K.n(m.ratio * T, 1)}개가 대기 중`);
    stGain.set('×' + K.n(gain, 1), gain < T * 0.4 ? 'bad' : gain < T * 0.75 ? 'warn' : 'good', TR`이상적이면 ×${T}`);
    F.say(explain(m));
  });
});
