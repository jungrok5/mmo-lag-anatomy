/* 한 명만 느릴 때: 서버 처리 방식에 따라 느린 사람 본인, 다른 사람, 몬스터가 각각 어떻게 보이는가
   서버 1대, 클라이언트 2개(A = 느린 회선, B = 정상 회선), 서버가 움직이는 몬스터 1마리 */
K.register('oneslow', function (root) {
  const TR = I18N.tr('sim-oneslow');   // 이 실험 묶음의 사전을 먼저 본다(i18n.js)
  const F = K.frame(root, {
    kicker: TR`누구에게 번지나 · 한 명만 느릴 때`,
    title: TR`느린 한 사람은 남의 화면에서 어떻게 보이고, 남에게 번질까`,
    lead: TR`같은 서버에 A와 B가 있습니다. A만 회선이 나쁩니다. 세 화면(서버, A의 화면, B의 화면)을 나란히 놓고, 서버가 입력을 처리하는 방식을 바꿔 보세요. 대부분의 방식에서 렉은 A에게만 나타나고 B는 “A가 이상하게 움직이는 것”만 봅니다. 하지만 어떤 방식에서는 A 한 사람 때문에 모두가 멈춥니다.`,
    layout: 'stack',
    tries: [
      TR`<b>틱마다 모아서</b> 방식에서 B의 화면을 보세요. A(파랑)는 멈칫했다가 한 번에 여러 걸음을 가지만, 몬스터와 B 자신은 멀쩡합니다. 아래 표에서 “B의 화면 → A의 모습”만 빨갛습니다. 지터와 손실을 0으로 내리면 핑이 높아도 A는 매끄럽게 보입니다. 남의 눈에 렉으로 보이게 하는 것은 핑보다 지터와 손실입니다.`,
      TR`<b>도착 즉시</b>로 바꾸면 서버가 A의 입력을 도착한 시각대로 알립니다. 이동은 조금 덜 튀지만 빨라졌다 느려졌다 하고, 스킬처럼 한 번에 끝나는 행동은 몰려 온 만큼 한순간에 실행됩니다.`,
      TR`<b>플레이어별 입력 버퍼</b>로 바꾸면 B의 화면에서 A가 훨씬 매끄러워집니다. 대신 A의 행동이 서버에서 확정되는 시점(스킬 결과, 위치 보정)이 버퍼만큼 늦어집니다.`,
      TR`<b>락스텝</b>으로 바꾸면 A 한 사람의 늦은 입력 때문에 B와 몬스터까지 모두 멈춥니다. 지터와 손실을 0으로 내리면 멈추지는 않지만, B의 입력도 A의 입력이 서버에 닿을 때까지 기다렸다가 반영됩니다.`,
      TR`<b>틱마다 모아서</b> 방식에서 <b>엄격한 이동 검증</b>을 켜면 A 본인의 화면에서 A가 고무줄처럼 끌려갑니다. 한 틱에 몰려 도착한 정상 입력을 서버가 과속으로 보고 거절하기 때문입니다. 같은 검증도 <b>플레이어별 입력 버퍼</b>에서는 걸리지 않습니다.`,
    ],
  });
  K.addStyle('oneslow', `
    .os-views { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    @media (max-width: 760px) { .os-views { grid-template-columns: minmax(0, 1fr); } }
    .os-matrix { overflow-x: auto; }
    .os-matrix table { border-collapse: collapse; width: 100%; min-width: 460px; font-size: 13.5px; }
    .os-matrix th, .os-matrix td { padding: 8px 10px; border-bottom: 1px solid var(--grid); text-align: left; }
    .os-matrix th { font-size: 12px; color: var(--muted); font-weight: 600; background: var(--paper); }
    .os-matrix td.v { white-space: nowrap; }
    .os-matrix .chip { display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px 2px 5px; border-radius: 999px; border: 1px solid var(--line); font-weight: 600; font-size: 12.5px; }
    .os-matrix .chip svg { width: 30px; height: 12px; }
    .os-matrix .chip.bad { border-color: var(--bad); color: var(--bad-ink); }
    .os-matrix .chip.warn { border-color: var(--warn); color: var(--warn-ink); }
    .os-matrix .chip.good { color: var(--good-ink); }
  `);

  const WW = 100, WH = 60, SPEED = 14, TICK = 50;
  const P = { ping: 220, jitter: 80, loss: 3, mode: 'tick', validate: false, interp: 100 };
  const NET_B = { ping: 40, jitter: 5, loss: 0 };
  const ROUTES = { A: [[12, 11], [88, 11], [88, 24], [12, 24]], B: [[12, 37], [88, 37], [88, 50], [12, 50]], M: [[26, 30.5], [74, 30.5]] };
  const NAMES = { A: TR`A(느림)`, B: 'B', M: TR`몬스터` };
  const rnd = K.rng(77);

  /* ---------------- 상태 ---------------- */
  let t, S, CL, flying;
  function follow(st, route, dist) {
    let x = st.x, y = st.y, wp = st.wp;
    let guard = 0;
    while (dist > 1e-6 && guard++ < 8) {
      const [tx, ty] = route[wp];
      const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy);
      if (d <= dist) { x = tx; y = ty; dist -= d; wp = (wp + 1) % route.length; }
      else { x += (dx / d) * dist; y += (dy / d) * dist; dist = 0; }
    }
    return { x, y, wp };
  }
  function newClient(id) {
    const [x, y] = ROUTES[id][0];
    return {
      id, wp: 1, base: { x, y }, pending: [], cur: { dx: 0, dy: 0 }, seq: 0, lastSend: 0, nextFrame: 0, lastFrame: 0,
      inbox: [], hist: { A: [], B: [], M: [] }, newest: -1, pc: null, corr: { x: 0, y: 0 },
      disp: {}, trail: { A: [], B: [], M: [] }, rec: { A: [], B: [], M: [] }, rubber: [],
    };
  }
  function reset() {
    t = 0;
    flying = [];
    S = { nextTick: TICK, turn: 0, wt: 0, stall: [], ticks: [], p: {}, m: { x: ROUTES.M[0][0], y: ROUTES.M[0][1], wp: 1 } };
    ['A', 'B'].forEach(id => {
      const [x, y] = ROUTES[id][0];
      S.p[id] = { x, y, q: [], buf: [], ls: new Map(), lastSeq: -1, lastApply: 0, under: 0 };
    });
    CL = { A: newClient('A'), B: newClient('B') };
  }

  /* ---------------- 회선 ---------------- */
  const netOf = who => (who === 'A' ? P : NET_B);
  function send(from, to, data) {
    const owner = from === 'S' ? to : from;
    const n = netOf(owner);
    if (rnd() * 100 < n.loss) return;
    flying.push({ at: t + n.ping / 2 + rnd() * n.jitter, to, data });
  }

  /* ---------------- 서버 ---------------- */
  function snapshot(ids) {
    const ents = {};
    (ids || ['A', 'B', 'M']).forEach(id => {
      if (id === 'M') ents.M = { x: S.m.x, y: S.m.y };
      else ents[id] = { x: S.p[id].x, y: S.p[id].y, ack: S.p[id].lastSeq };
    });
    const wt = P.mode === 'lock' ? S.wt : t;
    send('S', 'A', { wt, ents }); send('S', 'B', { wt, ents });
  }
  function apply(id, cmds, allowMs) {
    const sp = S.p[id];
    // 엄격한 검증: 이번에 적용할 이동이 허용 거리(경과 시간 + 한 틱 여유, 30% 관용)를 넘으면
    // 과속으로 보고 통째로 거절한다. 위치는 마지막으로 인정한 자리에 남고, 클라이언트는 그 자리로 끌려간다(고무줄).
    // 한 틱 여유가 있어 정상 회선의 작은 박자 어긋남(한 틱에 2개)은 통과하고, 3개 이상 몰리면 걸린다.
    const allow = (SPEED * (allowMs + TICK) * 1.3) / 1000;
    const total = cmds.reduce((a, c) => a + Math.hypot(c.dx, c.dy), 0);
    const reject = P.validate && total > allow;
    for (const c of cmds) {
      if (!reject) { sp.x = K.clamp(sp.x + c.dx, 1, WW - 1); sp.y = K.clamp(sp.y + c.dy, 1, WH - 1); }
      sp.lastSeq = c.seq;
    }
  }
  function moveMonster() { const r = follow(S.m, ROUTES.M, (SPEED * TICK) / 1000); S.m.x = r.x; S.m.y = r.y; S.m.wp = r.wp; }
  function serverRecv(from, pkt) {
    const sp = S.p[from];
    const fresh = pkt.cmds.filter(c => c.seq > Math.max(sp.lastSeq, sp.qMax == null ? -1 : sp.qMax));
    if (!fresh.length) return;
    sp.qMax = fresh[fresh.length - 1].seq;
    if (P.mode === 'tick') sp.q.push(...fresh);
    else if (P.mode === 'buffer') sp.buf.push(...fresh);
    else if (P.mode === 'lock') fresh.forEach(c => sp.ls.set(c.seq, c));
    else if (P.mode === 'event') {
      apply(from, fresh, Math.max(TICK, t - sp.lastApply));
      sp.lastApply = t;
      snapshot([from]); // 도착하자마자 모두에게 알린다
    }
  }
  function serverStep() {
    if (P.mode === 'lock') {
      const k = S.turn;
      const a = S.p.A.ls.get(k), b = S.p.B.ls.get(k);
      if (t >= S.nextTick && a && b) {
        apply('A', [a], TICK); apply('B', [b], TICK);
        S.p.A.ls.delete(k); S.p.B.ls.delete(k);
        moveMonster(); S.wt += TICK; S.turn++; S.ticks.push(t);
        snapshot();
        S.nextTick = Math.max(S.nextTick + TICK, t - TICK * 2);
        // 멈춤은 턴 사이 간격이 한 틱보다 길어진 부분만 센다.
        // 핑이 높아도 입력이 일정하게 오면 턴은 제 박자로 돌고, 모두가 같은 만큼 늦게 볼 뿐이다.
        if (S.lastTurn != null && t - S.lastTurn > TICK + 17) S.stall.push([S.lastTurn + TICK, t]);
        S.lastTurn = t;
      }
      return;
    }
    if (t < S.nextTick) return;
    S.nextTick += TICK;
    S.ticks.push(t);
    ['A', 'B'].forEach(id => {
      const sp = S.p[id];
      if (P.mode === 'tick') { apply(id, sp.q, TICK); sp.q = []; }
      else if (P.mode === 'buffer') {
        const n = sp.buf.length > 4 ? 2 : sp.buf.length ? 1 : 0;
        if (!n) sp.under++;
        apply(id, sp.buf.splice(0, n), TICK * n || TICK);
      }
    });
    moveMonster();
    // 도착 즉시 방식은 플레이어 위치를 도착할 때 이미 알렸으므로 틱에는 몬스터만 보낸다.
    // (같이 보내면 계단 모양 위치를 중간에 한 번 더 찍어 정상 회선도 몰아치기처럼 보인다)
    snapshot(P.mode === 'event' ? ['M'] : null);
  }

  /* ---------------- 클라이언트 ---------------- */
  const pred = c => { let x = c.base.x, y = c.base.y; for (const q of c.pending) { x += q.dx; y += q.dy; } return { x: x + c.cur.dx, y: y + c.cur.dy }; };
  function sample(h, wt) {
    if (!h.length) return null;
    for (let i = h.length - 1; i > 0; i--) if (h[i - 1].wt <= wt) {
      const a = h[i - 1], b = h[i], k = b.wt > a.wt ? K.clamp((wt - a.wt) / (b.wt - a.wt), 0, 1) : 1;
      return { x: K.lerp(a.x, b.x, k), y: K.lerp(a.y, b.y, k) };
    }
    return { x: h[0].x, y: h[0].y };
  }
  function clientFrame(c) {
    const dt = Math.max(1, t - c.lastFrame); c.lastFrame = t;
    const lock = P.mode === 'lock';
    for (const s of c.inbox) {
      for (const id in s.ents) {
        const e = s.ents[id], h = c.hist[id];
        if (h.length && s.wt <= h[h.length - 1].wt) continue;
        h.push({ wt: s.wt, x: e.x, y: e.y }); if (h.length > 120) h.shift();
        if (id === c.id && e.ack != null && !lock) {
          const before = pred(c);
          c.base = { x: e.x, y: e.y };
          while (c.pending.length && c.pending[0].seq <= e.ack) c.pending.shift();
          const after = pred(c);
          c.corr.x += before.x - after.x; c.corr.y += before.y - after.y;
          const j = Math.hypot(after.x - before.x, after.y - before.y);
          if (j > 1.0) c.rubber.push(t);
        }
      }
      if (s.wt > c.newest) c.newest = s.wt;
    }
    c.inbox.length = 0;
    // 내 입력: 자기 길을 따라 이동
    if (lock) {
      // 락스텝은 예측 없이 서버가 실행한 턴만 보여 준다. 입력은 턴마다 한 번.
      if (t - c.lastSend >= TICK) {
        const me = c.lsPos || { x: ROUTES[c.id][0][0], y: ROUTES[c.id][0][1], wp: 1 };
        const nx = follow(me, ROUTES[c.id], (SPEED * TICK) / 1000);
        const cmd = { seq: c.seq++, dx: nx.x - me.x, dy: nx.y - me.y };
        c.lsPos = nx;
        c.pending.push(cmd); if (c.pending.length > 40) c.pending.shift();
        c.lastSend = t;
        send(c.id, 'S', { from: c.id, cmds: c.pending.slice(-20) });
      }
    } else {
      const p = pred(c);
      const nx = follow({ x: p.x, y: p.y, wp: c.wp }, ROUTES[c.id], (SPEED * dt) / 1000);
      c.wp = nx.wp; c.cur.dx += nx.x - p.x; c.cur.dy += nx.y - p.y;
      if (t - c.lastSend >= TICK) {
        const cmd = { seq: c.seq++, dx: c.cur.dx, dy: c.cur.dy };
        c.cur = { dx: 0, dy: 0 }; c.pending.push(cmd); c.lastSend = t;
        if (c.pending.length > 60) c.pending.shift();
        send(c.id, 'S', { from: c.id, cmds: c.pending.slice(-20) });
      }
    }
    // 표시: 다른 개체는 보간(조금 과거), 나는 예측
    if (c.newest >= 0 && lock) {
      // 락스텝 화면에는 지터를 가려 줄 보간 버퍼가 없다. 받은 턴까지만 그리고, 다음 턴이 안 오면 그대로 멈춘다.
      // 멈춘 뒤 밀린 턴이 한꺼번에 오면 빨리 돌려 따라잡는다(몰아치기).
      if (c.pc == null || c.newest - c.pc > TICK * 6) c.pc = c.newest - TICK;
      c.pc = Math.min(c.newest, c.pc + dt * K.clamp(1 + (c.newest - c.pc - TICK) / 150, 1, 2.5));
    } else if (c.newest >= 0) {
      const target = c.newest - P.interp;
      if (c.pc == null) c.pc = target;
      let diff = target - c.pc;
      if (diff > 450 || diff < -1500) { c.pc = target; diff = 0; }
      c.pc = Math.min(c.newest, c.pc + dt * K.clamp(1 + diff / 300, 0.4, 1.25));
    }
    const k = Math.exp(-dt / 110);
    c.corr.x *= k; c.corr.y *= k;
    ['A', 'B', 'M'].forEach(id => {
      let pos;
      if (id === c.id && !lock) { const p = pred(c); pos = { x: p.x + c.corr.x, y: p.y + c.corr.y }; }
      else pos = c.pc == null ? null : sample(c.hist[id], c.pc);
      if (!pos) return;
      const prev = c.disp[id];
      c.disp[id] = pos;
      if (prev) c.rec[id].push([t, Math.hypot(pos.x - prev.x, pos.y - prev.y), dt]);
      while (c.rec[id].length && c.rec[id][0][0] < t - 3000) c.rec[id].shift();
      c.trail[id].push({ x: pos.x, y: pos.y, t });
      while (c.trail[id].length && c.trail[id][0].t < t - 1300) c.trail[id].shift();
    });
    while (c.rubber.length && c.rubber[0] < t - 3000) c.rubber.shift();
  }

  function step1() {
    t += 1;
    if (flying.length) {
      const keep = [];
      for (const f of flying) {
        if (f.at <= t) { if (f.to === 'S') serverRecv(f.data.from, f.data); else CL[f.to].inbox.push(f.data); }
        else keep.push(f);
      }
      flying = keep;
    }
    serverStep();
    ['A', 'B'].forEach(id => { const c = CL[id]; if (t >= c.nextFrame) { clientFrame(c); c.nextFrame = t + 16.7; } });
    if ((t & 511) === 0) {
      while (S.ticks.length && S.ticks[0] < t - 1000) S.ticks.shift();
      while (S.stall.length && S.stall[0][1] < t - 5000) S.stall.shift();
    }
  }
  /* ---------------- 판정 ---------------- */
  // 락스텝에서 최근 3초 중 턴이 제 박자보다 늦어진 시간의 비율 (지금 기다리는 중인 시간 포함)
  function lockStallFrac() {
    if (P.mode !== 'lock') return 0;
    const past = S.stall.reduce((a, s) => a + Math.max(0, Math.min(s[1], t) - Math.max(s[0], t - 3000)), 0);
    const now = S.lastTurn != null && t - S.lastTurn > TICK + 17 ? t - Math.max(S.lastTurn + TICK, t - 3000) : 0;
    return (past + now) / 3000;
  }
  function judge(viewer, target) {
    const c = CL[viewer];
    const rec = c.rec[target];
    if (rec.length < 20) return { sym: 'normal', label: TR`정상`, lvl: 'good' };
    let tele = 0, freeze = 0, fast = 0, n = 0;
    for (const [, d, dt] of rec) {
      const norm = (SPEED * dt) / 1000;
      n++;
      if (d > Math.max(2.5, norm * 3)) tele++;
      else if (d > norm * 1.8) fast++;
      if (d < norm * 0.08) freeze++;
    }
    const lockStall = lockStallFrac();
    if (lockStall > 0.12) return { sym: 'freeze', label: TR`멈춤`, lvl: 'bad' };
    if (target === viewer && c.rubber.length >= 1 && P.mode !== 'lock') return { sym: 'rubber', label: TR`고무줄`, lvl: 'bad' };
    if (tele >= 2) return { sym: 'teleport', label: TR`순간이동`, lvl: 'bad' };
    if (fast / n > 0.06 && freeze / n > 0.08) return { sym: 'burst', label: TR`몰아치기`, lvl: 'bad' };
    if (freeze / n > 0.14) return { sym: 'stutter', label: TR`뚝뚝 끊김`, lvl: 'warn' };
    if (fast / n > 0.06) return { sym: 'burst', label: TR`몰아치기(약하게)`, lvl: 'warn' };
    return { sym: 'normal', label: TR`정상`, lvl: 'good' };
  }

  /* ---------------- 화면 ---------------- */
  const views = K.el('div', { class: 'os-views' });
  F.stage.append(views);
  const mk = (cap, right) => { const box = K.el('div'); views.append(box); return K.canvas(box, { height: w => Math.round(w * 0.6), caption: cap, right }); };
  const cvS = mk(TR`서버의 실제 상태`, '');
  const cvA = mk(TR`A의 화면 (느린 회선)`, '');
  const cvB = mk(TR`B의 화면 (정상 회선)`, '');
  F.stage.append(K.el('div', { class: 'legend', html: TR`<span><i class="dot" style="background:var(--s1)"></i>A (회선 나쁨)</span><span><i class="dot" style="background:var(--s2)"></i>B (회선 정상)</span><span><i class="dot" style="background:var(--s3)"></i>몬스터 (서버가 움직임)</span><span>흐린 점: 최근 1.3초 동안 그려진 위치</span>` }));
  const mat = K.el('div', { class: 'os-matrix' });
  F.stage.append(K.el('div', { class: 'cv-cap' }, K.el('b', { text: TR`누가 무엇을 겪나 (최근 3초)` }), K.el('span', { text: TR`행: 누구의 화면인가 · 열: 그 화면에 보이는 대상` })), mat);
  const cvV = K.canvas(F.stage, { height: 118, caption: TR`B의 화면에서 본 이동 속도`, right: TR`<span class="legend"><span><i style="background:var(--s1)"></i>A</span><span><i style="background:var(--s3)"></i>몬스터</span><span>1 = 정상</span></span>` });

  const g1 = K.group(F.controls, TR`A의 회선 (B는 핑 40ms로 고정)`);
  const sPing = K.slider(g1, { label: TR`핑`, min: 0, max: 500, step: 10, value: P.ping, unit: 'ms', onInput: v => { P.ping = v; pr.clear(); } });
  const sJit = K.slider(g1, { label: TR`지터`, min: 0, max: 200, step: 5, value: P.jitter, unit: 'ms', onInput: v => { P.jitter = v; pr.clear(); } });
  const sLoss = K.slider(g1, { label: TR`손실`, min: 0, max: 20, step: 1, value: P.loss, unit: '%', onInput: v => { P.loss = v; pr.clear(); } });
  const g2 = K.group(F.controls, TR`서버가 입력을 처리하는 방식`);
  const cMode = K.choice(g2, { value: P.mode, options: [['tick', TR`틱마다 모아서`], ['event', TR`도착 즉시`], ['buffer', TR`플레이어별 입력 버퍼`], ['lock', TR`락스텝 (모두 기다림)`]], onChange: v => { P.mode = v; pr.clear(); reset(); warm(); },
    hint: TR`틱마다 모아서: 50ms마다 받은 입력을 한꺼번에 적용. 도착 즉시: 받자마자 적용하고 바로 알림. 입력 버퍼: 사람마다 한 틱에 입력 하나씩 꺼내 적용. 락스텝: 모두의 입력이 모여야 다음 턴.` });
  const g3 = K.group(F.controls, TR`그 밖에`);
  const tVal = K.toggle(g3, { label: TR`엄격한 이동 검증 (틱마다 이동 거리 검사)`, value: P.validate, onChange: v => { P.validate = v; pr.clear(); } });
  K.slider(g3, { label: TR`다른 사람 보간 버퍼`, min: 0, max: 300, step: 10, value: P.interp, unit: 'ms', onInput: v => { P.interp = v; } });
  const pr = K.presets(F, [
    { label: TR`모두 정상`, apply: () => set({ ping: 40, jitter: 5, loss: 0, mode: 'tick', validate: false }) },
    { label: TR`A만 느림 (틱 배치)`, apply: () => set({ ping: 220, jitter: 80, loss: 3, mode: 'tick', validate: false }) },
    { label: TR`도착 즉시 처리 서버`, apply: () => set({ ping: 220, jitter: 80, loss: 3, mode: 'event', validate: false }) },
    { label: TR`입력 버퍼 서버`, apply: () => set({ ping: 220, jitter: 80, loss: 3, mode: 'buffer', validate: false }) },
    { label: TR`락스텝 게임`, apply: () => set({ ping: 220, jitter: 80, loss: 3, mode: 'lock', validate: false }) },
    { label: TR`엄격한 이동 검증`, apply: () => set({ ping: 220, jitter: 100, loss: 3, mode: 'tick', validate: true }) },
  ], TR`상황`);
  function set(o) {
    Object.assign(P, o);
    sPing.set(P.ping, false); sJit.set(P.jitter, false); sLoss.set(P.loss, false); cMode.set(P.mode, false); tVal.set(P.validate, false);
    reset(); warm();
  }
  const stTick = K.stat(F.stats, { label: TR`서버 틱`, unit: TR`/초` });
  const stSelf = K.stat(F.stats, { label: TR`A가 느끼는 반응` });
  const stUnder = K.stat(F.stats, { label: TR`입력 버퍼 비어 멈춘 틱` });

  function drawView(co, who) {
    const { ctx, w, h } = co;
    const C = K.C;
    ctx.clearRect(0, 0, w, h);
    const sx = w / WW, sy = h / WH;
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (let gx = 10; gx < WW; gx += 10) { ctx.beginPath(); ctx.moveTo(Math.round(gx * sx) + 0.5, 0); ctx.lineTo(Math.round(gx * sx) + 0.5, h); ctx.stroke(); }
    const r = Math.max(4, w / 55);
    const col = { A: C.s1, B: C.s2, M: C.s3 };
    const ids = ['M', 'B', 'A'];
    if (who === 'S') {
      ids.forEach(id => {
        const p = id === 'M' ? S.m : S.p[id];
        K.dot(ctx, p.x * sx, p.y * sy, r, col[id], C.paper);
        K.text(ctx, NAMES[id], p.x * sx, p.y * sy - r - 7, { align: 'center', size: 10.5, weight: 600, color: C.ink });
      });
      if (P.mode === 'lock' && S.lastTurn != null && t - S.lastTurn > TICK * 1.5) K.text(ctx, TR`A의 입력 기다리는 중`, w - 8, 12, { align: 'right', size: 11, weight: 700, color: C.badInk });
      return;
    }
    const c = CL[who];
    ids.forEach(id => {
      const tr = c.trail[id], n = tr.length;
      tr.forEach((p, i) => { ctx.fillStyle = K.alpha(col[id], 0.12 + 0.5 * (i / Math.max(1, n))); ctx.beginPath(); ctx.arc(p.x * sx, p.y * sy, Math.max(1.4, r * 0.28), 0, Math.PI * 2); ctx.fill(); });
    });
    ids.forEach(id => {
      const p = c.disp[id]; if (!p) return;
      K.dot(ctx, p.x * sx, p.y * sy, r, col[id], C.paper);
      K.text(ctx, id === who ? TR`나` : NAMES[id], p.x * sx, p.y * sy - r - 7, { align: 'center', size: 10.5, weight: 600, color: C.ink });
    });
  }
  const vBox = () => ({ x: 34, y: 10, w: cvV.w - 44, h: cvV.h - 28 });
  function drawSpeed() {
    const { ctx } = cvV;
    const C = K.C;
    ctx.clearRect(0, 0, cvV.w, cvV.h);
    const box = vBox();
    const sc = K.plot(ctx, box, { x0: t - 3000, x1: t, y0: 0, y1: 3, yTicks: [0, 1, 2, 3], yFmt: v => v + '×' });
    K.hline(ctx, sc, 1, { color: C.ink2, dash: [4, 4] });
    const line = (id, color) => {
      const pts = CL.B.rec[id].map(([tt, d, dt]) => [tt, Math.min(3, d / ((SPEED * dt) / 1000))]);
      K.line(ctx, sc, pts, color, 2);
    };
    line('M', C.s3); line('A', C.s1);
  }
  function drawMatrix() {
    const rows = [['A', TR`A(느린 사람)의 화면`], ['B', TR`B(정상)의 화면`]];
    const cols = ['A', 'B', 'M'];
    const head = TR`<tr><th><span class="sr-only">누구의 화면</span></th>${cols.map(c => `<th>${c === 'M' ? TR`몬스터의 모습` : TR`${NAMES[c]}의 모습`}</th>`).join('')}</tr>`;
    const body = rows.map(([v, name]) => `<tr><th>${name}</th>${cols.map(tg => { const j = judge(v, tg); return `<td class="v"><span class="chip ${j.lvl}">${K.glyph(j.sym)}${tg === v && j.sym === 'normal' ? (P.mode === 'lock' ? TR`정상 (턴 대기만큼 늦게)` : TR`정상 (예측으로 즉시)`) : j.label}</span></td>`; }).join('')}</tr>`).join('');
    mat.innerHTML = `<table>${head}${body}</table>`;
  }
  function narrate() {
    const bA = judge('B', 'A'), bB = judge('B', 'B'), bM = judge('B', 'M'), aA = judge('A', 'A');
    const spread = bB.lvl !== 'good' || bM.lvl !== 'good';
    const tickRate = S.ticks.filter(x => x > t - 1000).length;
    stTick.set(String(tickRate), tickRate < 15 ? 'bad' : tickRate < 19 ? 'warn' : 'good');
    const lock = P.mode === 'lock';
    const stalled = lockStallFrac() > 0.12;
    stSelf.set(lock ? `${K.n(P.ping + TICK * 2)}ms+` : TR`즉시`, lock ? 'bad' : 'good', P.mode === 'buffer' ? TR`이동은 예측으로 즉시, 서버 확정은 버퍼만큼 더 늦음` : lock ? TR`예측 없이 턴을 기다림. B도 A를 기다리느라 늦게 반영` : TR`이동은 예측으로 즉시, 스킬 결과는 약 ${K.n(P.ping + (P.mode === 'event' ? 0 : TICK / 2))}ms 뒤`);
    stUnder.set(P.mode === 'buffer' ? String(S.p.A.under) : '—', P.mode === 'buffer' && S.p.A.under > 10 ? 'warn' : null, P.mode === 'buffer' ? TR`A의 버퍼가 비어 제자리` : TR`입력 버퍼 방식에서만`);
    const steady = TR`A는 핑이 ${K.n(P.ping)}ms라도 지터와 손실이 적어 입력이 고르게 도착합니다. 그래서 B의 화면에서 A는 <b>${bA.label}</b>입니다. 조금 과거의 위치에 보일 뿐입니다. 남의 눈에 이상하게 보이게 만드는 것은 핑보다 지터와 손실입니다.`;
    let msg;
    if (P.ping <= 60 && P.jitter <= 10 && P.loss === 0) msg = TR`${K.flag('good')}A와 B 모두 회선이 좋습니다. 세 화면이 거의 같게 움직입니다.`;
    else if (lock && stalled) msg = TR`${K.flag('bad')}<b>락스텝</b>: 다음 턴을 계산하려면 A의 입력이 꼭 있어야 합니다. A의 입력이 늦을 때마다 서버, A, B, 몬스터가 <b>모두 멈춥니다</b>. 느린 한 사람의 렉이 전원에게 번지는 대표적인 구조입니다.`;
    else if (lock) msg = TR`${K.flag('warn')}<b>락스텝</b>: A의 입력이 늦지만 일정하게 와서 턴은 정해진 주기대로 돕니다. 대신 서버는 A의 입력이 올 때까지 B의 입력도 대기시킵니다. 그래서 B도 자기 핑보다 늦게, A의 입력이 서버에 닿는 시간에 맞춰 반영되는 <b>입력 지연</b>을 겪습니다. 지터나 손실을 올리면 전원이 <b>멈춥니다</b>.`;
    else if (P.mode === 'event') msg = bA.lvl === 'good' ? TR`${K.flag('good')}<b>도착 즉시 처리</b>: ${steady}` : TR`${K.flag(bA.lvl === 'bad' ? 'bad' : 'warn')}<b>도착 즉시 처리</b>: A의 입력이 몰려 오면 서버가 받는 대로 바로 적용하고 바로 알립니다. B의 화면에서 A는 <b>${bA.label}</b>. 도착 시각대로 알리므로 이동은 틱 방식보다 덜 튀지만, 스킬처럼 한 번에 끝나는 행동은 몰려 온 만큼 한순간에 실행됩니다. B 자신과 몬스터는 ${spread ? TR`영향을 받습니다` : TR`멀쩡합니다`}.`;
    else if (P.mode === 'buffer') msg = TR`${K.flag(bA.lvl === 'good' ? 'good' : 'warn')}<b>플레이어별 입력 버퍼</b>: 서버가 A의 입력을 한 틱에 하나씩 꺼내 쓰니 몰려 온 입력이 고르게 펴집니다. B의 화면에서 A는 <b>${bA.label}</b>. 버퍼가 비는 순간(지금까지 ${S.p.A.under}틱)만 A가 잠깐 제자리에 섭니다. 대신 A의 행동이 서버에서 확정되는 시점은 버퍼만큼 늦어집니다.${P.validate ? TR` 한 틱에 한 걸음씩만 적용하므로 <b>엄격한 이동 검증</b>에도 걸리지 않습니다.` : ''}`;
    else msg = bA.lvl === 'good' && !P.validate ? TR`${K.flag('good')}<b>틱마다 모아서</b>: ${steady}` : TR`${K.flag(bA.lvl === 'good' ? 'good' : 'bad')}<b>틱마다 모아서</b>: A의 입력이 들쭉날쭉 도착해 어떤 틱엔 0개, 어떤 틱엔 2~3개가 한꺼번에 적용됩니다. B의 화면에서 A는 <b>${bA.label}</b>. 그래도 B 자신과 몬스터는 ${spread ? TR`영향을 받습니다` : TR`멀쩡합니다`}. 서버 권위 구조에서 렉은 대부분 느린 사람에게만 나타납니다.`;
    if (P.validate && aA.sym === 'rubber') msg += TR` <b>엄격한 이동 검증</b> 때문에 A 본인의 화면에서 A가 <b>고무줄</b>처럼 끌려갑니다. 한 틱에 몰려 도착한 정상 입력을 서버가 과속으로 보고 거절했기 때문입니다.`;
    F.say(msg);
  }

  function warm() { for (let i = 0; i < 3500; i++) step1(); }
  reset(); warm();
  let acc = 0, carry = 0;
  K.loop(root, dt => {
    carry += dt; const n = Math.floor(carry); carry -= n;
    for (let i = 0; i < n; i++) step1();
    drawView(cvS, 'S'); drawView(cvA, 'A'); drawView(cvB, 'B'); drawSpeed();
    acc += dt;
    if (acc > 300) { acc = 0; drawMatrix(); narrate(); }
  });
  drawMatrix(); narrate();
});
