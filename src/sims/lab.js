/* =========================================================================
   렉 실험실 — 서버의 진실과 내 화면을 나란히 놓고, 회선·서버·클라이언트를 망가뜨려 본다.
   히어로에는 data-compact="1" 로 증상 버튼만 있는 작은 판이 올라간다.

   구성
     서버: 고정 틱으로 세계를 계산하고, 틱마다 스냅샷(세계 소식)을 보낸다. 내 입력 명령을 모아 적용한다.
     회선: 방향별 링크. 지연 + 지터 + 손실 + 회선 끊김. UDP 는 잃으면 끝, TCP 는 재전송 + 순서대로만 전달.
     클라: 프레임마다 받은 소식을 처리하고, 내 입력을 보내고, 다른 플레이어를 표시 방식대로 그린다.
   ========================================================================= */
K.register('lab', function (root) {
  const compact = root.dataset.compact === '1';
  const WW = 100, WH = 60, SPEED = 16; // 세계 크기(m), 이동 속도(m/s)

  const DEF = {
    rtt: 60, jitter: 10, loss: 0, lossDir: 'both', outEvery: 0, outMs: 1200,
    proto: 'udp', timeout: 5000,
    tick: 20, load: 25, stallEvery: 0, stallMs: 900, catchup: 'catchup', validate: false,
    fps: 60, hitchEvery: 0, hitchMs: 350,
    mode: 'interp', interp: 100,
    predict: true, smooth: true, redundancy: true,
    ghost: true, view: 1,
  };
  const P = Object.assign({}, DEF);

  // 증상별 재현 조건. set 은 기본값 위에 덮어쓴다.
  const PRESETS = [
    { id: 'normal', label: '정상', set: {},
      say: '<b>정상</b>: 핑 60ms, 약간의 흔들림. 다른 플레이어는 보간 버퍼 100ms만큼 더 과거 모습으로 그려지는 대신 매끄럽게 움직이고, 내 캐릭터는 예측 덕분에 즉시 반응합니다.' },
    { id: 'stutter', label: '뚝뚝 끊김', set: { jitter: 110, tick: 15, mode: 'snap' },
      say: '<b>뚝뚝 끊김</b>: 서버 소식이 들쭉날쭉(지터 110ms) 오는데 받자마자 그리니, 늦게 온 만큼 멈췄다가 몰려 온 만큼 튑니다. 오른쪽 “내 화면”의 상대(주황) 궤적 점 간격을 보세요.' },
    { id: 'teleport', label: '순간이동', set: { outEvery: 3.5, outMs: 900, loss: 3 },
      say: '<b>순간이동</b>: 3.5초마다 회선이 0.9초씩 끊깁니다. 그동안 상대는 제자리에 서 있다가, 소식이 다시 오면 이미 멀리 간 위치로 한 번에 옮겨집니다.' },
    { id: 'burst', label: '몰아치기', set: { proto: 'tcp', loss: 7, rtt: 120, jitter: 20, mode: 'queue' },
      say: '<b>몰아치기(파파팍)</b>: TCP는 잃어버린 패킷 하나를 다시 받을 때까지 뒤에 도착한 패킷을 전부 붙잡아 둡니다. 그러다 한꺼번에 넘겨주고, “순서대로 재생”하는 게임은 밀린 움직임을 빨리 감기로 따라잡습니다.' },
    { id: 'rubber', label: '고무줄', set: { loss: 25, lossDir: 'up', redundancy: false, smooth: false },
      say: '<b>고무줄</b>: 내 이동 명령의 25%가 서버에 못 갑니다. 내 화면은 예측으로 이미 움직였지만, 서버는 받은 명령만큼만 옮겼으므로 확인이 올 때마다 내 캐릭터(파랑)가 뒤로 끌려갑니다.' },
    { id: 'slowmo', label: '슬로우모션', set: { load: 230 },
      say: '<b>슬로우모션</b>: 서버가 한 틱을 50ms 안에 못 끝내고 115ms씩 걸립니다. 세계 시간이 0.4배속으로 흐르니 모두가 느리게 움직이고, 내 행동의 결과도 늦게 옵니다.' },
    { id: 'delay', label: '입력 지연', set: { predict: false, rtt: 350 },
      say: '<b>입력 지연</b>: 클라이언트 예측을 끄고 핑을 350ms로 올렸습니다. 화면을 눌러도 명령이 서버에 갔다가 결과가 돌아올 때까지 내 캐릭터가 꿈쩍하지 않습니다.' },
    { id: 'freeze', label: '멈춤', set: { stallEvery: 4, stallMs: 1600 },
      say: '<b>멈춤</b>: 서버가 4초마다 1.6초씩 멈춥니다(GC, 동기 DB 호출 등). 세상 전체가 얼었다가 풀리면서 한꺼번에 따라잡습니다. 예측 덕분에 나 혼자만 움직이는 이상한 장면도 보입니다.' },
    { id: 'disconnect', label: '접속 끊김', set: { timeout: 4000 }, action: () => outageNow(6500),
      say: '<b>접속 끊김</b>: 회선이 6.5초 끊겼고 타임아웃은 4초입니다. 4초 동안 아무 소식이 없자 게임이 연결을 포기합니다. 서버에는 내 캐릭터가 한동안 그대로 남아 있습니다.' },
  ];

  /* ---------------- 상태 ---------------- */
  const rnd = K.rng(compact ? 11 : 29);
  let t = 0;
  const ROUTE = [[14, 12], [86, 12], [86, 48], [52, 26], [14, 48]];
  let S, C, down, up, remView, meView, outages, stalls, hitches, events, nextOutAt, lastPreset = 'normal';

  function Link(dir) { this.dir = dir; this.q = []; this.all = []; this.id = 0; }
  Link.prototype.reset = function () { this.q.length = 0; };
  Link.prototype.send = function (payload) {
    const p = { id: this.id++, payload, sentAt: t, attemptAt: t, k: 0, arriveAt: null, deliverAt: null, dead: false, tries: [] };
    this.q.push(p); this.all.push(p);
    while (this.all.length && this.all[0].sentAt < t - 7000 && (this.all[0].deliverAt != null || this.all[0].dead)) this.all.shift();
    if (this.all.length > 600) this.all.shift();
  };
  Link.prototype.update = function (onDeliver) {
    const tcp = P.proto === 'tcp';
    let changed = false;
    const lossOn = P.lossDir === 'both' || P.lossDir === this.dir;
    for (const p of this.q) {
      let guard = 0;
      while (p.arriveAt == null && !p.dead && t >= p.attemptAt && guard++ < 4) {
        const lost = inOutage(p.attemptAt) || (lossOn && rnd() * 100 < P.loss);
        if (!lost) {
          p.arriveAt = p.attemptAt + P.rtt / 2 + rnd() * P.jitter;
          p.tries.push([p.attemptAt, true]);
        } else {
          p.tries.push([p.attemptAt, false]);
          if (!tcp) { p.dead = true; changed = true; break; }
          const rto = Math.max(200, P.rtt + 4 * P.jitter);
          const sendGap = 1000 / P.tick;
          const wait = p.k === 0 ? Math.min(rto, P.rtt + 3 * sendGap + P.jitter) : rto * Math.pow(2, p.k - 1);
          p.k++;
          p.attemptAt += Math.min(wait, 30000);
          if (p.k >= 3 && wait >= 400) ev('warn', `TCP 재전송 ${p.k}번째 · 다음 시도까지 ${K.ms(wait)}`);
          if (p.k > 14) { p.dead = true; changed = true; }
        }
      }
    }
    if (!tcp) {
      for (const p of this.q) if (p.arriveAt != null && p.deliverAt == null && t >= p.arriveAt) { p.deliverAt = t; onDeliver(p.payload); changed = true; }
    } else {
      let n = 0;
      for (const p of this.q) {
        if (p.deliverAt != null) continue;
        if (p.arriveAt != null && t >= p.arriveAt) { p.deliverAt = t; onDeliver(p.payload); n++; changed = true; }
        else break; // 앞의 구멍이 메워질 때까지 뒤는 못 나간다
      }
      if (n >= 3 && this.dir === 'down') ev('warn', `TCP가 붙잡고 있던 패킷 ${n}개를 한꺼번에 넘김`, 'burst');
    }
    if (changed) this.q = this.q.filter(p => p.deliverAt == null && !p.dead);
  };

  function View() { this.h = []; this.pc = null; this.under = false; }
  View.prototype.reset = function () { this.h = []; this.pc = null; };
  View.prototype.push = function (s) { this.h.push(s); if (this.h.length > 160) this.h.shift(); };
  View.prototype.sample = function (wt) {
    const h = this.h;
    for (let i = h.length - 1; i > 0; i--) {
      if (h[i - 1].wt <= wt) {
        const a = h[i - 1], b = h[i];
        const k = b.wt > a.wt ? K.clamp((wt - a.wt) / (b.wt - a.wt), 0, 1) : 1;
        return { x: K.lerp(a.x, b.x, k), y: K.lerp(a.y, b.y, k) };
      }
    }
    return { x: h[0].x, y: h[0].y };
  };
  View.prototype.pos = function (dt) {
    const h = this.h;
    if (!h.length) return null;
    const last = h[h.length - 1];
    this.under = false;
    if (P.mode === 'snap') return { x: last.x, y: last.y };
    if (P.mode === 'extrap') {
      const age = Math.min(1000, t - last.at + P.rtt / 2);
      return { x: K.clamp(last.x + (last.vx * age) / 1000, 0, WW), y: K.clamp(last.y + (last.vy * age) / 1000, 0, WH) };
    }
    const delay = P.mode === 'interp' ? P.interp : Math.max(P.interp, 60);
    const target = last.wt - delay;
    if (this.pc == null) this.pc = target;
    let diff = target - this.pc;
    if (P.mode === 'interp') {
      if (diff > 450 || diff < -1500) { this.pc = target; diff = 0; }
      this.pc += dt * K.clamp(1 + diff / 300, 0.4, 1.25);
    } else {
      if (diff < -3000) { this.pc = target; diff = 0; }
      this.pc += dt * (diff > 0 ? K.clamp(1 + diff / 110, 1, 7) : K.clamp(1 + diff / 300, 0.4, 1));
    }
    if (this.pc >= last.wt) { this.pc = last.wt; this.under = true; }
    if (this.pc < h[0].wt) this.pc = h[0].wt;
    return this.sample(this.pc);
  };

  function resetAll() {
    t = 0;
    S = {
      wt: 0, nextTickAt: 0, busyUntil: 0, stallUntil: 0, nextStallAt: Infinity,
      me: { x: 30, y: 30 }, rem: { x: 14, y: 12, vx: SPEED, vy: 0, wp: 1 },
      queue: [], lastQueued: -1, lastProc: -1, snapSeq: 0, ticks: [], lastInputAt: 0, trail: [],
    };
    C = {
      nextFrameAt: 0, lastFrameAt: 0, frames: [], hitchUntil: 0, nextHitchAt: Infinity,
      inbox: [], lastSnapSeq: -1, lastRecvAt: 0, base: { x: 30, y: 30 }, pending: [], cur: { dx: 0, dy: 0 },
      lastCmdAt: 0, cmdSeq: 0, sentAt: new Map(), corr: { x: 0, y: 0 }, meDisp: { x: 30, y: 30 }, remDisp: null,
      target: { x: 62, y: 34 }, userUntil: 0, nextAuto: 0, disc: null, trailMe: [], trailRem: [], speed: [], rtt: null, rttAt: 0,
      underFrames: [], lastSnapN: 0,
    };
    down = new Link('down'); up = new Link('up');
    remView = new View(); meView = new View();
    outages = []; stalls = []; hitches = []; events = [];
    nextOutAt = P.outEvery > 0 ? 1500 : Infinity;
    S.nextStallAt = P.stallEvery > 0 ? 2000 : Infinity;
    C.nextHitchAt = P.hitchEvery > 0 ? 2500 : Infinity;
  }

  /* ---------------- 사건 ---------------- */
  function ev(level, text, kind) {
    const last = events[events.length - 1];
    if (last && last.text === text && t - last.t < 800) return;
    events.push({ t, level, text, kind: kind || level });
    if (events.length > 60) events.shift();
    logDirty = true;
  }
  const inOutage = x => { for (const o of outages) if (x >= o.from && x < o.to) return true; return false; };
  function outageNow(ms) {
    outages.push({ from: t, to: t + ms, logged: false });
    ev('bad', `회선 끊김 시작 (${K.ms(ms)})`);
  }
  function stallNow(ms) {
    S.stallUntil = t + ms;
    stalls.push({ from: t, to: t + ms });
    S.nextStallAt = P.stallEvery > 0 ? t + P.stallEvery * 1000 : Infinity;
    ev('bad', `서버 멈춤 ${K.ms(ms)} (GC·동기 호출 등)`, 'stall');
  }
  function hitchNow(ms) {
    C.hitchUntil = t + ms;
    hitches.push({ from: t, to: t + ms });
    C.nextHitchAt = P.hitchEvery > 0 ? t + P.hitchEvery * 1000 : Infinity;
    ev('warn', `클라 멈춤 ${K.ms(ms)} (로딩·GC 등)`, 'hitch');
  }
  function disconnect(reason) {
    C.disc = { at: t, reason, retryAt: t + 3000, outage: inOutage(t) };
    C.inbox.length = 0;
    down.reset(); up.reset();
    ev('bad', reason === 'server' ? '서버가 연결을 끊음: 내 입력이 타임아웃 동안 한 번도 안 옴' : '접속 끊김: 타임아웃 동안 서버 소식이 없음', 'disc');
  }
  function reconnect() {
    if (inOutage(t)) { C.disc.retryAt = t + 2000; ev('warn', '재접속 실패: 회선이 아직 끊겨 있음'); return; }
    C.disc = null;
    C.inbox.length = 0; C.lastSnapSeq = -1; C.lastRecvAt = t; C.pending = []; C.cur = { dx: 0, dy: 0 };
    C.sentAt.clear(); C.base = { x: S.me.x, y: S.me.y }; C.corr = { x: 0, y: 0 }; C.lastCmdAt = t;
    remView.reset(); meView.reset();
    S.lastInputAt = t; S.queue = []; S.lastQueued = C.cmdSeq - 1; S.lastProc = C.cmdSeq - 1;
    ev('good', '재접속 완료: 서버가 현재 상태를 통째로 다시 보냄');
  }

  /* ---------------- 서버 ---------------- */
  function moveRemote(dtMs) {
    let remain = (SPEED * dtMs) / 1000;
    const r = S.rem;
    while (remain > 1e-6) {
      const [tx, ty] = ROUTE[r.wp];
      const dx = tx - r.x, dy = ty - r.y, d = Math.hypot(dx, dy);
      if (d <= remain) { r.x = tx; r.y = ty; remain -= d; r.wp = (r.wp + 1) % ROUTE.length; }
      else { r.x += (dx / d) * remain; r.y += (dy / d) * remain; r.vx = (dx / d) * SPEED; r.vy = (dy / d) * SPEED; remain = 0; }
    }
  }
  function doTick(interval) {
    S.wt += interval;
    S.ticks.push(t);
    const allow = (SPEED * interval * 1.3) / 1000;
    let moved = 0, clipped = 0;
    for (const c of S.queue) {
      let dx = c.dx, dy = c.dy;
      const d = Math.hypot(dx, dy);
      if (P.validate && d > 0 && moved + d > allow) {
        const k = Math.max(0, allow - moved) / d;
        clipped += d * (1 - k); dx *= k; dy *= k;
      }
      moved += Math.hypot(dx, dy);
      S.me.x = K.clamp(S.me.x + dx, 1, WW - 1);
      S.me.y = K.clamp(S.me.y + dy, 1, WH - 1);
      S.lastProc = c.seq;
    }
    if (S.queue.length > 1 && P.validate && clipped > 0.4) ev('warn', `서버 이동 검증: 명령 ${S.queue.length}개가 한 틱에 몰려 ${K.n(clipped, 1)}m를 잘라냄`, 'clip');
    S.queue.length = 0;
    moveRemote(interval);
    S.trail.push({ x: S.rem.x, y: S.rem.y, mx: S.me.x, my: S.me.y, t });
    while (S.trail.length && S.trail[0].t < t - 1600) S.trail.shift();
    if (!C.disc) down.send({ seq: S.snapSeq++, wt: S.wt, me: { x: S.me.x, y: S.me.y }, rem: { x: S.rem.x, y: S.rem.y, vx: S.rem.vx, vy: S.rem.vy }, ack: S.lastProc });
  }
  let behindLogged = 0;
  function serverStep() {
    if (t >= S.nextStallAt) stallNow(P.stallMs);
    if (t < S.stallUntil) return;
    const interval = 1000 / P.tick;
    if (t >= S.busyUntil && t >= S.nextTickAt) {
      const behind = t - S.nextTickAt;
      doTick(interval);
      S.busyUntil = t + (interval * P.load) / 100;
      S.nextTickAt += interval;
      if (P.catchup === 'catchup') {
        if (S.nextTickAt < t - 3000) S.nextTickAt = t - 3000;
        if (behind > interval * 4 && t - behindLogged > 2500) {
          behindLogged = t;
          if (P.load > 100) ev('warn', `서버 과부하: 틱이 ${Math.round(behind / interval)}개 밀려 있음`, 'behind');
          else ev('warn', `서버 따라잡기: 밀린 틱 ${Math.round(behind / interval)}개를 연달아 처리`, 'catch');
        }
      } else if (S.nextTickAt <= t) {
        S.nextTickAt = t + interval - ((t - S.nextTickAt) % interval);
      }
    }
    if (!C.disc && t - S.lastInputAt > P.timeout) disconnect('server');
  }
  function onServerRecv(pkt) {
    S.lastInputAt = t;
    for (const c of pkt.cmds) if (c.seq > S.lastQueued) { S.queue.push(c); S.lastQueued = c.seq; }
  }

  /* ---------------- 클라이언트 ---------------- */
  function predicted() {
    let x = C.base.x, y = C.base.y;
    for (const c of C.pending) { x += c.dx; y += c.dy; }
    return { x: x + C.cur.dx, y: y + C.cur.dy };
  }
  function reconcile(s) {
    const before = predicted();
    C.base = { x: s.me.x, y: s.me.y };
    while (C.pending.length && C.pending[0].seq <= s.ack) {
      const c = C.pending.shift();
      if (c.seq === s.ack && C.sentAt.has(c.seq)) {
        const sample = t - C.sentAt.get(c.seq);
        C.rtt = C.rtt == null ? sample : C.rtt * 0.8 + sample * 0.2; C.rttAt = t;
      }
      C.sentAt.delete(c.seq);
    }
    const after = predicted();
    const jump = Math.hypot(after.x - before.x, after.y - before.y);
    if (P.predict) {
      if (P.smooth) { C.corr.x += before.x - after.x; C.corr.y += before.y - after.y; }
      if (jump > 1.2) ev('bad', `내 캐릭터가 ${K.n(jump, 1)}m 뒤로 당겨짐 (서버가 내 이동을 다르게 계산)`, 'rubber');
    }
  }
  function sendCmd() {
    const cmd = { seq: C.cmdSeq++, dx: C.cur.dx, dy: C.cur.dy };
    C.pending.push(cmd);
    C.sentAt.set(cmd.seq, t);
    C.cur = { dx: 0, dy: 0 };
    C.lastCmdAt = t;
    up.send({ cmds: P.redundancy ? C.pending.slice(-40) : [cmd] });
    if (C.pending.length > 400) C.pending.splice(0, C.pending.length - 400);
  }
  function clientFrame() {
    const dt = Math.min(t - C.lastFrameAt, 1500);
    C.lastFrameAt = t;
    C.frames.push(t);
    if (C.disc) { if (t >= C.disc.retryAt) reconnect(); return; }
    // 1) 받은 소식 처리
    let n = 0;
    for (const s of C.inbox) {
      if (s.seq <= C.lastSnapSeq) continue; // 순서가 뒤바뀐 옛 소식은 버린다
      C.lastSnapSeq = s.seq; C.lastRecvAt = t; n++;
      remView.push({ wt: s.wt, x: s.rem.x, y: s.rem.y, vx: s.rem.vx, vy: s.rem.vy, at: t });
      meView.push({ wt: s.wt, x: s.me.x, y: s.me.y, vx: 0, vy: 0, at: t });
      reconcile(s);
    }
    C.inbox.length = 0;
    if (n >= 4 && dt > 200) ev('warn', `멈춰 있던 동안 쌓인 소식 ${n}개를 한 프레임에 처리`, 'burst');
    // 2) 타임아웃
    if (t - C.lastRecvAt > P.timeout) { disconnect('client'); return; }
    // 3) 내 입력: 클릭한 곳 또는 자동 조종 목표로 이동
    const pos = predicted();
    const dT = Math.hypot(C.target.x - pos.x, C.target.y - pos.y);
    if (t > C.userUntil && (t >= C.nextAuto || dT < 0.8)) {
      C.target = { x: 10 + rnd() * 80, y: 9 + rnd() * 42 };
      C.nextAuto = t + 2600 + rnd() * 2600;
    }
    const d = Math.hypot(C.target.x - pos.x, C.target.y - pos.y);
    const step = Math.min(d, (SPEED * dt) / 1000);
    if (d > 0.01) { C.cur.dx += ((C.target.x - pos.x) / d) * step; C.cur.dy += ((C.target.y - pos.y) / d) * step; }
    if (t - C.lastCmdAt >= 1000 / P.tick) sendCmd();
    // 4) 표시 위치
    const k = Math.exp(-dt / 110);
    C.corr.x *= k; C.corr.y *= k;
    if (P.predict) { const p = predicted(); C.meDisp = { x: p.x + C.corr.x, y: p.y + C.corr.y }; }
    else { C.meDisp = meView.pos(dt) || { x: C.base.x, y: C.base.y }; }
    const prev = C.remDisp;
    const rp = remView.pos(dt);
    if (rp) {
      C.remDisp = rp;
      if (prev && dt > 0) {
        const disp = Math.hypot(rp.x - prev.x, rp.y - prev.y);
        const v = disp / (dt / 1000) / SPEED;
        C.speed.push([t, v]);
        if (disp > Math.max(3, (SPEED * dt) / 1000 * 3)) ev('bad', `상대가 ${K.n(disp, 1)}m 순간이동`, 'teleport');
      }
    }
    C.underFrames.push([t, remView.under ? 1 : 0]);
    // 5) 궤적
    C.trailMe.push({ x: C.meDisp.x, y: C.meDisp.y, t });
    if (C.remDisp) C.trailRem.push({ x: C.remDisp.x, y: C.remDisp.y, t });
    const cut = t - 1400;
    while (C.trailMe.length && C.trailMe[0].t < cut) C.trailMe.shift();
    while (C.trailRem.length && C.trailRem[0].t < cut) C.trailRem.shift();
    while (C.speed.length && C.speed[0][0] < t - 6000) C.speed.shift();
    while (C.underFrames.length && C.underFrames[0][0] < t - 2000) C.underFrames.shift();
  }

  /* ---------------- 한 걸음 (1ms) ---------------- */
  function step1() {
    t += 1;
    if (t >= nextOutAt) { outageNow(P.outMs); nextOutAt = t + P.outEvery * 1000; }
    for (const o of outages) if (!o.logged && t >= o.to) { o.logged = true; ev('good', '회선 복구'); }
    if (t >= C.nextHitchAt) hitchNow(P.hitchMs);
    serverStep();
    down.update(s => { if (!C.disc) C.inbox.push(s); });
    up.update(pkt => { if (!C.disc) onServerRecv(pkt); });
    if (t >= C.hitchUntil && t >= C.nextFrameAt) {
      clientFrame();
      const fi = 1000 / P.fps;
      C.nextFrameAt += fi;
      if (C.nextFrameAt <= t) C.nextFrameAt = t + fi;
    }
    if ((t & 1023) === 0) {
      while (outages.length && outages[0].to < t - 8000) outages.shift();
      while (stalls.length && stalls[0].to < t - 8000) stalls.shift();
      while (hitches.length && hitches[0].to < t - 8000) hitches.shift();
      while (S.ticks.length && S.ticks[0] < t - 1000) S.ticks.shift();
      while (C.frames.length && C.frames[0] < t - 1000) C.frames.shift();
    }
  }
  let carry = 0;
  function advance(realDt) {
    carry += realDt * P.view;
    const n = Math.floor(carry);
    carry -= n;
    for (let i = 0; i < n; i++) step1();
  }

  /* ---------------- 화면 구성 ---------------- */
  root.classList.add(compact ? 'hero-lab' : 'sim');
  root.innerHTML = '';
  let F = null, explainEl, miniEl, logEl, logDirty = true, presetBtns = [];
  const symRow = K.el('div', { class: 'lab-sympick', role: 'group', 'aria-label': '증상 재현' });
  PRESETS.forEach(p => {
    const b = K.el('button', { type: 'button', class: 'btn small', 'aria-pressed': p.id === 'normal' ? 'true' : 'false', html: K.glyph(p.id) + '<span>' + p.label + '</span>' });
    b.addEventListener('click', () => applyPreset(p.id));
    presetBtns.push([p.id, b]);
    symRow.append(b);
  });

  let viewsBox, cvS, cvC, cvT, cvV;
  if (compact) {
    const head = K.el('div', { class: 'row' },
      K.el('span', { class: 'sim-kicker', text: '눌러서 증상 재현하기' }),
      K.el('a', { href: '#lab', class: 'note', html: '전체 실험실에서 직접 조작하기 →', on: { click: () => K.emit('lab:preset', lastPreset) } }));
    viewsBox = K.el('div', { class: 'lab-views' });
    root.append(head, symRow, viewsBox);
    explainEl = K.el('p', { class: 'lab-explain', 'aria-live': 'polite' });
    miniEl = K.el('div', { class: 'mini-stats' });
    root.append(explainEl, miniEl);
  } else {
    F = K.frame(root, {
      kicker: '렉 실험실',
      title: '서버의 진실과 내 화면은 언제나 조금 다르다',
      lead: '왼쪽은 서버가 계산한 “진짜” 세계, 오른쪽은 내 PC가 받은 소식으로 그려낸 화면입니다. 파랑이 나, 주황이 다른 플레이어입니다. 오른쪽 화면을 누르면 그곳으로 이동합니다. 아래 조건을 바꿔 가며 두 화면이 어떻게 어긋나는지 보세요. 흐린 점은 최근 1.4초 동안 그려진 위치로, 점 사이 간격이 곧 화면 속 속도입니다.',
      layout: 'stack',
      tries: [
        '위의 증상 버튼을 하나씩 눌러 보고, 아래 <b>사건 기록</b>과 <b>패킷 타임라인</b>에서 무슨 일이 있었는지 확인하세요.',
        '<b>지터</b>를 100ms로 올린 뒤 <b>다른 플레이어 표시</b>를 “받은 즉시” ↔ “보간”으로 바꿔 보세요. 보간 버퍼가 흔들림을 흡수하는 대신 상대가 과거에 머뭅니다.',
        '<b>손실</b> 10%에서 <b>프로토콜</b>을 UDP ↔ TCP로 바꿔 보세요. UDP는 가끔 튀고, TCP는 멈췄다 몰아칩니다.',
        '<b>엄격한 이동 검증</b>을 켜고 지터를 80ms로 올려 보세요. 명령이 몰려 도착한 틱마다 서버가 이동을 잘라 고무줄이 생깁니다.',
        '<b>끊김 길이</b>를 타임아웃보다 길게 하고 <b>지금 회선 끊기</b>를 눌러 보세요. 접속이 끊깁니다. 타임아웃보다 조금 짧게 하면, TCP에서는 회선이 돌아온 뒤에도 재전송 대기 때문에 한참 더 멈춰 있다가 끊기기도 합니다.',
      ],
    });
    F.presets.hidden = false;
    F.presets.append(K.el('span', { class: 'lbl', text: '증상 재현' }), symRow);
    explainEl = K.el('p', { class: 'lab-explain' });
    F.presets.after(explainEl);
    viewsBox = K.el('div', { class: 'lab-views' });
    F.stage.append(viewsBox);
  }
  const vS = K.el('div'), vC = K.el('div');
  viewsBox.append(vS, vC);
  cvS = K.canvas(vS, { height: w => Math.round(w * 0.6), caption: '서버의 진실', right: '<span class="srv-state"></span>', label: '서버가 계산한 실제 위치' });
  cvC = K.canvas(vC, { height: w => Math.round(w * 0.6), caption: '내 화면', right: '<span class="cli-state"></span>', label: '내 PC에 그려지는 위치. 누르면 그곳으로 이동' });
  cvC.cv.style.cursor = 'crosshair';
  cvC.cv.addEventListener('pointerdown', e => {
    const r = cvC.cv.getBoundingClientRect();
    C.target = { x: K.clamp(((e.clientX - r.left) / r.width) * WW, 3, WW - 3), y: K.clamp(((e.clientY - r.top) / r.height) * WH, 3, WH - 3) };
    C.userUntil = t + 7000;
  });

  const ctl = {};
  if (!compact) {
    const lg = '<span class="legend"><span><i style="background:var(--ink-2)"></i>서버→나 (세계 소식)</span><span><i style="background:var(--muted);height:2px"></i>나→서버 (내 입력)</span><span><i class="box" style="background:var(--warn)"></i>순서 대기(TCP)</span><span><i class="box" style="background:var(--bad);opacity:.35"></i>회선 끊김·멈춤</span></span>';
    cvT = K.canvas(F.stage, { height: w => (w < 520 ? 150 : 170), caption: '패킷 타임라인 (최근 3초, 오른쪽 끝이 지금)', right: '', label: '패킷이 보내지고 도착하는 시각' });
    F.stage.append(K.el('div', { html: lg }));
    cvV = K.canvas(F.stage, { height: 120, caption: '내 화면 속 상대의 이동 속도', right: '1 = 정상 속도 · 0 = 멈춤 · 위로 튀면 순간이동' });
    K.hover(cvV, x => {
      const box = spBox();
      const tt = t - 5000 + ((x - box.x) / box.w) * 5000;
      if (x < box.x || x > box.x + box.w) return null;
      let best = null;
      for (const s of C.speed) if (!best || Math.abs(s[0] - tt) < Math.abs(best[0] - tt)) best = s;
      if (!best) return null;
      return `${K.n((t - best[0]) / 1000, 1)}초 전<br>속도 <b>${K.n(best[1], 2)}배</b>`;
    });
    // 수치
    ctl.stPing = K.stat(F.stats, { label: '핑 (명령→확인)' });
    ctl.stLoss = K.stat(F.stats, { label: '패킷 손실' });
    ctl.stTick = K.stat(F.stats, { label: '서버 틱', unit: '/초' });
    ctl.stFps = K.stat(F.stats, { label: '화면 FPS' });
    ctl.stErr = K.stat(F.stats, { label: '상대 위치 오차', unit: 'm' });
    ctl.stWait = K.stat(F.stats, { label: '마지막 소식 이후' });
    ctl.waitMeter = K.meter(ctl.stWait.el);
    // 사건 기록
    const logBox = K.el('div', null, K.el('div', { class: 'cv-cap' }, K.el('b', { text: '사건 기록' }), K.el('span', { text: '가장 최근이 위' })));
    logEl = K.el('div', { class: 'log', 'aria-live': 'off' });
    logBox.append(logEl);
    F.sayEl.after(logBox);

    // 조작부
    const g1 = K.group(F.controls, '회선 (집 → 통신사 → 인터넷)');
    ctl.rtt = K.slider(g1, { label: '핑(왕복 지연)', min: 0, max: 600, step: 10, value: P.rtt, unit: 'ms', onInput: v => set('rtt', v) });
    ctl.jitter = K.slider(g1, { label: '지터(도착 흔들림)', min: 0, max: 300, step: 5, value: P.jitter, unit: 'ms', onInput: v => set('jitter', v), hint: '패킷마다 0~이 값만큼 더 늦게 도착합니다.' });
    ctl.loss = K.slider(g1, { label: '패킷 손실', min: 0, max: 50, step: 1, value: P.loss, unit: '%', onInput: v => set('loss', v) });
    ctl.lossDir = K.choice(g1, { label: '손실 방향', value: P.lossDir, options: [['both', '양쪽'], ['up', '내 입력만'], ['down', '서버 소식만']], onChange: v => set('lossDir', v) });
    const g2 = K.group(F.controls, '회선 끊김 · 프로토콜');
    ctl.outEvery = K.slider(g2, { label: '주기적 회선 끊김', min: 0, max: 15, step: 0.5, value: P.outEvery, fmt: v => (v ? v + '초마다' : '끔'), onInput: v => { set('outEvery', v); nextOutAt = v > 0 ? t + 800 : Infinity; } });
    ctl.outMs = K.slider(g2, { label: '끊김 길이', min: 200, max: 10000, step: 100, value: P.outMs, fmt: v => K.ms(v), onInput: v => set('outMs', v) });
    K.button(g2, { label: '지금 회선 끊기', kind: 'small', onClick: () => outageNow(P.outMs) });
    ctl.proto = K.choice(g2, { label: '프로토콜', value: P.proto, options: [['udp', 'UDP (잃으면 그만)'], ['tcp', 'TCP (재전송·순서 보장)']], onChange: v => set('proto', v) });
    ctl.timeout = K.slider(g2, { label: '접속 끊김 판정(타임아웃)', min: 1000, max: 15000, step: 500, value: P.timeout, fmt: v => K.ms(v), onInput: v => set('timeout', v) });
    const g3 = K.group(F.controls, '서버');
    ctl.tick = K.slider(g3, { label: '틱레이트', min: 2, max: 60, step: 1, value: P.tick, unit: '/초', onInput: v => set('tick', v), hint: '서버가 1초에 세계를 몇 번 계산하고 소식을 보내는지' });
    ctl.load = K.slider(g3, { label: '서버 부하 (틱 예산 대비)', min: 10, max: 300, step: 5, value: P.load, unit: '%', onInput: v => set('load', v), hint: '100%를 넘으면 한 틱을 제시간에 못 끝냅니다.' });
    ctl.stallEvery = K.slider(g3, { label: '주기적 서버 멈춤', min: 0, max: 10, step: 0.5, value: P.stallEvery, fmt: v => (v ? v + '초마다' : '끔'), onInput: v => { set('stallEvery', v); S.nextStallAt = v > 0 ? t + 800 : Infinity; } });
    ctl.stallMs = K.slider(g3, { label: '멈춤 길이', min: 100, max: 4000, step: 50, value: P.stallMs, fmt: v => K.ms(v), onInput: v => set('stallMs', v) });
    K.button(g3, { label: '지금 서버 멈추기', kind: 'small', onClick: () => stallNow(P.stallMs) });
    ctl.catchup = K.choice(g3, { label: '밀린 틱 처리', value: P.catchup, options: [['catchup', '몰아서 따라잡기'], ['skip', '건너뛰기']], onChange: v => set('catchup', v) });
    ctl.validate = K.toggle(g3, { label: '엄격한 이동 검증 (스피드핵 방지)', value: P.validate, onChange: v => set('validate', v), hint: '한 틱에 움직일 수 있는 거리를 넘으면 잘라 냅니다.' });
    const g4 = K.group(F.controls, '내 PC (클라이언트)');
    ctl.fps = K.slider(g4, { label: '화면 FPS', min: 5, max: 144, step: 1, value: P.fps, onInput: v => set('fps', v) });
    ctl.hitchEvery = K.slider(g4, { label: '주기적 클라 멈춤', min: 0, max: 10, step: 0.5, value: P.hitchEvery, fmt: v => (v ? v + '초마다' : '끔'), onInput: v => { set('hitchEvery', v); C.nextHitchAt = v > 0 ? t + 800 : Infinity; } });
    ctl.hitchMs = K.slider(g4, { label: '클라 멈춤 길이', min: 50, max: 8000, step: 50, value: P.hitchMs, fmt: v => K.ms(v), onInput: v => set('hitchMs', v) });
    K.button(g4, { label: '지금 클라 멈추기', kind: 'small', onClick: () => hitchNow(P.hitchMs) });
    const g5 = K.group(F.controls, '다른 플레이어 표시 방식');
    ctl.mode = K.choice(g5, { value: P.mode, options: [['snap', '받은 즉시'], ['interp', '보간'], ['extrap', '외삽(예측)'], ['queue', '순서대로 재생']], onChange: v => set('mode', v),
      hint: '보간: 두 소식 사이를 이어 그림(조금 과거를 봄). 외삽: 마지막 속도로 미래를 추측. 순서대로 재생: 밀리면 빨리 감기.' });
    ctl.interp = K.slider(g5, { label: '보간 버퍼', min: 0, max: 400, step: 10, value: P.interp, unit: 'ms', onInput: v => set('interp', v) });
    const g6 = K.group(F.controls, '내 캐릭터');
    ctl.predict = K.toggle(g6, { label: '클라이언트 예측', value: P.predict, onChange: v => set('predict', v), hint: '서버 확인 전에 먼저 움직여 보여 줍니다.' });
    ctl.smooth = K.toggle(g6, { label: '보정 부드럽게', value: P.smooth, onChange: v => set('smooth', v) });
    ctl.redundancy = K.toggle(g6, { label: '입력 중복 전송', value: P.redundancy, onChange: v => set('redundancy', v), hint: '서버가 아직 확인하지 않은 이동 명령을 매번 함께 다시 보냅니다(최대 2초 분량).' });
    const g7 = K.group(F.controls, '보기');
    ctl.ghost = K.toggle(g7, { label: '내 화면에 실제 위치 겹쳐 보기', value: P.ghost, onChange: v => set('ghost', v) });
    ctl.view = K.choice(g7, { label: '관찰 속도', value: P.view, options: [[1, '1배'], [0.5, '0.5배'], [0.25, '0.25배']], onChange: v => set('view', +v) });
    K.button(g7, { label: '처음부터 다시', kind: 'small', onClick: () => { resetAll(); warm(1500); } });
  }

  function set(k, v) {
    P[k] = v;
    presetBtns.forEach(([, b]) => b.setAttribute('aria-pressed', 'false'));
  }
  function applyPreset(id) {
    const p = PRESETS.find(x => x.id === id) || PRESETS[0];
    lastPreset = p.id;
    Object.assign(P, DEF, p.set);
    // 조작부 동기화 (onInput 은 부르지 않는다)
    for (const k in ctl) if (ctl[k] && ctl[k].set && k in P) ctl[k].set(P[k], false);
    nextOutAt = P.outEvery > 0 ? t + 1200 : Infinity;
    // 이전 상황의 밀린 틱은 버리고 새 상황을 깨끗하게 시작
    S.nextTickAt = t; S.busyUntil = t; S.stallUntil = 0;
    S.nextStallAt = P.stallEvery > 0 ? t + 1500 : Infinity;
    C.nextHitchAt = P.hitchEvery > 0 ? t + 1500 : Infinity;
    if (p.action) p.action();
    presetBtns.forEach(([pid, b]) => b.setAttribute('aria-pressed', pid === p.id ? 'true' : 'false'));
    explainEl.innerHTML = p.say;
    ev('good', `상황: ${p.label}`);
  }
  if (!compact) {
    K.on('lab:preset', id => { applyPreset(id); });
  }

  /* ---------------- 그리기 ---------------- */
  function drawArena(co, who) {
    const { ctx, w, h } = co;
    const sx = w / WW, sy = h / WH;
    const X = x => x * sx, Y = y => y * sy;
    const Cc = K.C;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = Cc.grid; ctx.lineWidth = 1;
    for (let gx = 10; gx < WW; gx += 10) { ctx.beginPath(); ctx.moveTo(Math.round(X(gx)) + 0.5, 0); ctx.lineTo(Math.round(X(gx)) + 0.5, h); ctx.stroke(); }
    for (let gy = 10; gy < WH; gy += 10) { ctx.beginPath(); ctx.moveTo(0, Math.round(Y(gy)) + 0.5); ctx.lineTo(w, Math.round(Y(gy)) + 0.5); ctx.stroke(); }
    const r = Math.max(5, w / 60);
    const trail = (pts, col) => {
      const n = pts.length;
      pts.forEach((p, i) => {
        ctx.fillStyle = K.alpha(col, 0.15 + 0.55 * (i / Math.max(1, n)));
        ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), Math.max(1.6, r * 0.28), 0, Math.PI * 2); ctx.fill();
      });
    };
    const body = (x, y, col, label) => {
      K.dot(ctx, X(x), Y(y), r, col, Cc.paper);
      K.text(ctx, label, X(x), Y(y) - r - 8, { align: 'center', size: 11, weight: 600, color: Cc.ink });
    };
    if (who === 'server') {
      trail(S.trail.map(p => ({ x: p.x, y: p.y })), Cc.s2);
      trail(S.trail.map(p => ({ x: p.mx, y: p.my })), Cc.s1);
      body(S.rem.x, S.rem.y, Cc.s2, '상대');
      body(S.me.x, S.me.y, Cc.s1, '나');
      if (t < S.stallUntil) banner(co, '서버 멈춤', 'bad');
      else if (P.load > 100) banner(co, `과부하 · 세계 ${K.n(100 / P.load, 2)}배속`, 'warn');
    } else {
      // 목표 지점
      const tx = X(C.target.x), ty = Y(C.target.y);
      ctx.strokeStyle = Cc.ink2; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(tx - 4, ty - 4); ctx.lineTo(tx + 4, ty + 4); ctx.moveTo(tx + 4, ty - 4); ctx.lineTo(tx - 4, ty + 4); ctx.stroke();
      trail(C.trailRem, Cc.s2);
      trail(C.trailMe, Cc.s1);
      if (P.ghost && !C.disc) {
        ghost(X(S.rem.x), Y(S.rem.y), r);
        ghost(X(S.me.x), Y(S.me.y), r);
      }
      if (C.remDisp) body(C.remDisp.x, C.remDisp.y, Cc.s2, '상대');
      body(C.meDisp.x, C.meDisp.y, Cc.s1, '나');
      const wait = t - C.lastRecvAt;
      if (C.disc) {
        ctx.fillStyle = K.alpha(Cc.paper, 0.82); ctx.fillRect(0, 0, w, h);
        K.text(ctx, '서버와의 연결이 끊어졌습니다', w / 2, h / 2 - 10, { align: 'center', size: Math.max(13, w / 26), weight: 700, color: Cc.ink });
        const left = Math.max(0, C.disc.retryAt - t);
        K.text(ctx, left > 0 ? `${K.n(left / 1000, 1)}초 후 재접속 시도` : '재접속 중…', w / 2, h / 2 + 14, { align: 'center', size: 12, color: Cc.ink2 });
      } else if (t < C.hitchUntil) {
        banner(co, '화면 멈춤 (클라 처리 중)', 'warn');
      } else if (wait > 400) {
        banner(co, `서버 응답 대기 ${K.n(wait / 1000, 1)}초`, wait > P.timeout * 0.6 ? 'bad' : 'warn');
      }
    }
    function ghost(x, y, rr) {
      ctx.save();
      ctx.strokeStyle = Cc.ink2; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(x, y, rr + 1, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
  function banner(co, text, level) {
    const { ctx, w } = co;
    const Cc = K.C;
    ctx.font = K.font(12, 600);
    const tw = ctx.measureText(text).width + 30;
    const x = w - tw - 8, y = 8;
    ctx.fillStyle = K.alpha(Cc.surface, 0.92);
    K.rr(ctx, x, y, tw, 24, 6); ctx.fill();
    ctx.strokeStyle = level === 'bad' ? Cc.bad : Cc.warn; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = level === 'bad' ? Cc.bad : Cc.warn;
    if (level === 'bad') ctx.fillRect(x + 9, y + 8, 8, 8);
    else { ctx.beginPath(); ctx.moveTo(x + 13, y + 7); ctx.lineTo(x + 18, y + 17); ctx.lineTo(x + 8, y + 17); ctx.closePath(); ctx.fill(); }
    K.text(ctx, text, x + 23, y + 12.5, { size: 12, weight: 600, color: Cc.ink });
  }

  function drawTimeline() {
    const { ctx, w, h } = cvT;
    const Cc = K.C;
    ctx.clearRect(0, 0, w, h);
    const L = w < 520 ? 44 : 58, R = w - 10;
    const yS = 22, yC = h - 26;
    const span = 3000, t0 = t - span;
    const X = tt => L + ((tt - t0) / span) * (R - L);
    const band = (from, to, y0, y1, col, label) => {
      if (to < t0) return;
      const a = Math.max(X(from), L), b = Math.min(X(to), R);
      ctx.fillStyle = K.alpha(col, 0.14); ctx.fillRect(a, y0, b - a, y1 - y0);
      if (label && b - a > 50) K.text(ctx, label, a + 4, y0 + 9, { size: 10.5, weight: 600, color: Cc.ink2 });
    };
    for (const o of outages) band(o.from, o.to, yS - 12, yC + 12, Cc.bad, '회선 끊김');
    for (const s of stalls) band(s.from, s.to, yS - 14, yS + 4, Cc.bad, '서버 멈춤');
    for (const hh of hitches) band(hh.from, hh.to, yC - 4, yC + 14, Cc.warn, '클라 멈춤');
    if (C.disc) band(C.disc.at, t, yS - 12, yC + 12, Cc.ink2, '연결 없음');
    // 레일
    ctx.strokeStyle = Cc.line; ctx.lineWidth = 1;
    [yS, yC].forEach(y => { ctx.beginPath(); ctx.moveTo(L, y + 0.5); ctx.lineTo(R, y + 0.5); ctx.stroke(); });
    K.text(ctx, '서버', L - 8, yS, { align: 'right', size: 11, weight: 600, color: Cc.ink2 });
    K.text(ctx, '내 PC', L - 8, yC, { align: 'right', size: 11, weight: 600, color: Cc.ink2 });
    // 시간 눈금
    for (let s = 0; s <= 3; s++) {
      const x = X(t0 + s * 1000);
      K.text(ctx, s === 3 ? '지금' : `-${3 - s}초`, x, h - 8, { align: s === 3 ? 'right' : 'center', size: 10, mono: s !== 3, color: Cc.muted });
    }
    const drawLink = (link, fromY, toY, col, wid) => {
      for (const p of link.all) {
        if (p.sentAt < t0 - 3000) continue;
        for (let i = 0; i < p.tries.length; i++) {
          const [at, ok] = p.tries[i];
          const x1 = X(at);
          if (ok) {
            const arr = p.arriveAt;
            const x2 = X(Math.min(arr, t));
            const frac = arr > t ? (t - at) / (arr - at) : 1;
            if (x2 < L) continue;
            ctx.strokeStyle = col; ctx.lineWidth = wid;
            if (i > 0) ctx.setLineDash([4, 3]);
            ctx.beginPath(); ctx.moveTo(x1, fromY); ctx.lineTo(x2, fromY + (toY - fromY) * frac); ctx.stroke();
            ctx.setLineDash([]);
            // TCP 순서 대기
            if (arr <= t && (p.deliverAt == null || p.deliverAt - arr > 2)) {
              const endT = p.deliverAt == null ? t : p.deliverAt;
              const a = Math.max(X(arr), L), b = X(endT);
              if (b - a > 1) {
                ctx.fillStyle = Cc.warn;
                const yy = toY + (toY > fromY ? 3 : -7);
                K.rr(ctx, a, yy, b - a, 4, 2); ctx.fill();
              }
            }
          } else {
            // 잃어버린 시도: 중간에서 끊기고 ×
            const lostAt = at + P.rtt / 4;
            const x2 = X(Math.min(lostAt, t));
            if (x2 < L) continue;
            const midY = fromY + (toY - fromY) * 0.45;
            ctx.strokeStyle = K.alpha(col, 0.7); ctx.lineWidth = wid;
            if (i > 0) ctx.setLineDash([4, 3]);
            ctx.beginPath(); ctx.moveTo(x1, fromY); ctx.lineTo(x2, midY); ctx.stroke();
            ctx.setLineDash([]);
            if (lostAt <= t) {
              ctx.strokeStyle = Cc.bad; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.moveTo(x2 - 4, midY - 4); ctx.lineTo(x2 + 4, midY + 4); ctx.moveTo(x2 + 4, midY - 4); ctx.lineTo(x2 - 4, midY + 4); ctx.stroke();
            }
          }
        }
      }
    };
    ctx.save();
    ctx.beginPath(); ctx.rect(L, 0, R - L, h); ctx.clip();
    drawLink(up, yC, yS, Cc.muted, 1);
    drawLink(down, yS, yC, Cc.ink2, 1.5);
    ctx.restore();
    // 서버 틱 눈금
    ctx.fillStyle = Cc.ink2;
    for (const p of down.all) { const x = X(p.sentAt); if (x >= L) ctx.fillRect(x - 1, yS - 3, 2, 6); }
  }

  const spBox = () => ({ x: 34, y: 10, w: cvV.w - 44, h: cvV.h - 30 });
  function drawSpeed() {
    const { ctx, w, h } = cvV;
    const Cc = K.C;
    ctx.clearRect(0, 0, w, h);
    const box = spBox();
    const sc = K.plot(ctx, box, { x0: t - 5000, x1: t, y0: 0, y1: 3, yTicks: [0, 1, 2, 3], yFmt: v => v + '×' });
    K.hline(ctx, sc, 1, { color: Cc.ink2, dash: [4, 4] });
    const pts = C.speed.filter(s => s[0] >= t - 5000).map(s => [s[0], Math.min(s[1], 3)]);
    K.area(ctx, sc, pts, Cc.s2, 0.1);
    K.line(ctx, sc, pts, Cc.s2, 2);
    for (const s of C.speed) if (s[0] >= t - 5000 && s[1] > 3) {
      const x = sc.x(s[0]);
      ctx.fillStyle = Cc.bad;
      ctx.beginPath(); ctx.moveTo(x, box.y - 2); ctx.lineTo(x + 5, box.y + 7); ctx.lineTo(x - 5, box.y + 7); ctx.closePath(); ctx.fill();
    }
    K.text(ctx, '정상', box.x + box.w - 4, sc.y(1) - 8, { align: 'right', size: 10.5, color: Cc.ink2, weight: 600 });
  }

  /* ---------------- 수치·해설 ---------------- */
  let statT = 0;
  function recentEvent(kind, within) { for (let i = events.length - 1; i >= 0; i--) { const e = events[i]; if (t - e.t > within) break; if (e.kind === kind) return e; } return null; }
  function lossStats() {
    let total = 0, lost = 0, retx = 0;
    for (const L of [down, up]) for (const p of L.all) {
      if (p.sentAt < t - 5000) continue;
      for (const [, ok] of p.tries) { total++; if (!ok) lost++; }
      if (p.tries.length > 1) retx += p.tries.length - 1;
    }
    return { rate: total ? lost / total : 0, retx };
  }
  function updateStats() {
    const wait = C.disc ? t - C.disc.at : t - C.lastRecvAt;
    const tickRate = S.ticks.filter(x => x > t - 1000).length;
    const fps = C.frames.filter(x => x > t - 1000).length;
    const remErr = C.remDisp ? Math.hypot(C.remDisp.x - S.rem.x, C.remDisp.y - S.rem.y) : 0;
    const ls = lossStats();
    const pingStale = t - C.rttAt > 1500;
    const ping = C.rtt;
    const pingTxt = C.disc ? '끊김' : ping == null ? '—' : pingStale ? `${K.n(ping)}+` : K.n(ping);
    const pingSt = C.disc ? 'bad' : ping == null ? null : pingStale || ping > 200 ? 'bad' : ping > 100 ? 'warn' : 'good';
    const underRatio = C.underFrames.length ? C.underFrames.reduce((a, b) => a + b[1], 0) / C.underFrames.length : 0;

    if (compact) {
      miniEl.innerHTML = `<span>핑 <b>${pingTxt}${ping != null && !C.disc ? ' ms' : ''}</b></span><span>손실 <b>${K.pct(ls.rate)}</b></span><span>서버 틱 <b>${tickRate}/초</b></span><span>화면 FPS <b>${fps}</b></span><span>상태 <b>${C.disc ? '연결 끊김' : wait > 400 ? '응답 대기 ' + K.n(wait / 1000, 1) + '초' : '연결됨'}</b></span>`;
      const sS = cvS.cap && cvS.cap.querySelector('.srv-state'); if (sS) sS.textContent = `틱 ${tickRate}/초`;
      const cS = cvC.cap && cvC.cap.querySelector('.cli-state'); if (cS) cS.textContent = C.disc ? '연결 끊김' : `핑 ${pingTxt}${ping != null ? 'ms' : ''}`;
      return;
    }
    ctl.stPing.set(pingTxt + (ping != null && !C.disc ? '<i>ms</i>' : ''), pingSt, `회선 ${P.rtt}ms + 틱·프레임 대기`);
    ctl.stLoss.set(K.pct(ls.rate, ls.rate < 0.1 ? 1 : 0), ls.rate > 0.05 ? 'bad' : ls.rate > 0.01 ? 'warn' : 'good', P.proto === 'tcp' ? `TCP 재전송 ${ls.retx}회 (5초)` : '최근 5초');
    ctl.stTick.set(String(tickRate), tickRate < P.tick * 0.6 ? 'bad' : tickRate < P.tick * 0.9 ? 'warn' : 'good', `목표 ${P.tick}/초`);
    ctl.stFps.set(String(fps), fps < 25 ? 'bad' : fps < 50 ? 'warn' : 'good', `목표 ${P.fps}`);
    ctl.stErr.set(C.disc ? '—' : K.n(remErr, 1), remErr > 5 ? 'bad' : remErr > 2 ? 'warn' : 'good', P.mode === 'interp' || P.mode === 'queue' ? '보간은 원래 조금 과거를 봅니다' : '');
    ctl.stWait.set(C.disc ? '연결 끊김' : K.ms(wait), C.disc || wait > P.timeout * 0.6 ? 'bad' : wait > 300 ? 'warn' : 'good', `타임아웃 ${K.ms(P.timeout)}`);
    ctl.waitMeter.set(C.disc ? 1 : wait / P.timeout, C.disc || wait > P.timeout * 0.6 ? 'bad' : wait > 300 ? 'warn' : '');
    ctl.stTick.el.title = '';
    // 해설
    let msg;
    const E = kind => recentEvent(kind, 1600);
    if (C.disc) {
      msg = `${K.flag('bad')}<b>접속 끊김</b>: ${C.disc.outage ? '회선이 끊겨 타임아웃(' + K.ms(P.timeout) + ') 동안 서버와 내 PC가 서로 한 통의 소식도 받지 못했습니다. 먼저 알아챈 쪽이 연결을 정리합니다.' : C.disc.reason === 'server' ? '서버가 내 입력을 타임아웃(' + K.ms(P.timeout) + ') 동안 한 번도 받지 못해 나를 내보냈습니다. 내 PC가 오래 멈췄거나(로딩) 올라가는 길이 막힌 경우입니다.' : '서버 소식이 타임아웃(' + K.ms(P.timeout) + ') 동안 한 통도 오지 않아 게임이 연결을 포기했습니다.'} 왼쪽 서버 화면을 보면 내 캐릭터가 그대로 서 있습니다. 서버도 곧 알아채지만, 그 전에 다시 접속하면 “이미 접속 중” 오류가 날 수 있습니다.`;
    } else if (t < C.hitchUntil) {
      msg = `${K.flag('warn')}<b>멈춤 (내 PC 쪽)</b>: 게임이 로딩·GC 같은 일로 화면을 못 그리고 있습니다. 소식은 계속 도착해 수신 버퍼에 쌓이고, 풀리는 순간 한꺼번에 처리되며 상대가 튑니다. 핑은 멀쩡한데 렉이라면 이 경우를 의심하세요.`;
    } else if (wait > 400) {
      const why = inOutage(t) ? '회선이 끊겨' : t < S.stallUntil ? '서버가 멈춰' : P.proto === 'tcp' && down.q.some(p => p.k > 0) ? 'TCP가 잃어버린 패킷을 재전송하느라(뒤 패킷은 도착했지만 붙잡혀 있음)' : '소식이 늦어져';
      msg = `${K.flag(wait > P.timeout * 0.6 ? 'bad' : 'warn')}<b>멈춤</b>: ${why} 서버 소식이 ${K.n(wait / 1000, 1)}초째 없습니다. 상대는 마지막 위치에 서 있고, 예측을 켠 내 캐릭터만 혼자 움직입니다. ${K.ms(P.timeout)}가 지나면 접속이 끊깁니다.`;
    } else if (E('burst')) {
      msg = `${K.flag('bad')}<b>몰아치기</b>: ${E('burst').text}. 멈춰 있던 동안의 움직임이 한 번에 들어와 ${P.mode === 'queue' ? '빨리 감기처럼 파파팍 재생됩니다' : P.mode === 'interp' ? '보간 버퍼를 넘어서면 한 번에 건너뜁니다(순간이동)' : '한 번에 점프합니다'}.`;
    } else if (E('rubber')) {
      msg = `${K.flag('bad')}<b>고무줄</b>: ${E('rubber').text}. ${P.validate && E('clip') ? '명령이 몰려 도착해 서버의 이동 검증이 잘라 냈기 때문입니다.' : P.loss > 0 && P.lossDir !== 'down' && !P.redundancy ? '서버가 받지 못한 이동 명령만큼 위치가 모자랍니다. “입력 중복 전송”을 켜면 대부분 사라집니다.' : '서버와 내 예측이 어긋났습니다.'}`;
    } else if (E('teleport')) {
      msg = `${K.flag('bad')}<b>순간이동</b>: ${E('teleport').text}. 소식이 한동안 끊겼거나(손실·회선 끊김·서버 멈춤) 늦게 와서, 그 사이 이동한 거리를 한 프레임에 건너뛰었습니다.${P.mode === 'extrap' ? ' 외삽은 모서리에서 방향이 바뀐 걸 모르고 직진하다 되돌아오기도 합니다.' : ''}`;
    } else if (P.load > 100) {
      msg = `${K.flag('warn')}<b>슬로우모션</b>: 서버가 틱 하나에 예산의 ${P.load}%를 씁니다. 1초에 ${tickRate}번만 계산하니 세계가 ${K.n(Math.min(1, 100 / P.load), 2)}배속으로 흐릅니다. 모든 플레이어가 같이 느려지고, 핑 수치도 함께 올라갑니다.`;
    } else if (underRatio > 0.25 && (P.mode === 'interp' || P.mode === 'queue')) {
      msg = `${K.flag('warn')}<b>뚝뚝 끊김</b>: 보간 버퍼(${P.interp}ms)가 자주 바닥납니다(프레임의 ${Math.round(underRatio * 100)}%). 다음 소식이 제때 안 와서 상대가 잠깐씩 멈춥니다. 버퍼를 늘리면 매끄러워지지만 그만큼 더 과거를 보게 됩니다.`;
    } else if (P.mode === 'snap' && (P.jitter > 30 || P.tick < 15)) {
      msg = `${K.flag('warn')}<b>뚝뚝 끊김</b>: 받은 소식을 바로 그리니 틱 간격(${K.ms(1000 / P.tick)})과 지터(${P.jitter}ms)가 그대로 화면에 드러납니다. 궤적 점이 뭉쳤다 벌어졌다 합니다.`;
    } else if (!P.predict && ping != null) {
      const ownBuf = P.mode === 'interp' ? P.interp : P.mode === 'queue' ? Math.max(P.interp, 60) : 0;
      msg = `${K.flag(ping > 150 ? 'bad' : 'warn')}<b>입력 지연</b>: 예측이 꺼져 있어 내 캐릭터가 서버 확인을 기다립니다. 누르고 약 ${K.ms(ping + ownBuf)} 뒤에야 움직이기 시작합니다${ownBuf ? `(왕복 ${K.ms(ping)} + 내 캐릭터도 다른 사람처럼 보간 버퍼 ${K.ms(ownBuf)}만큼 늦게 그림)` : ''}. 대부분의 게임은 이동에 예측을 쓰고, 스킬 판정처럼 서버 확인이 꼭 필요한 곳에서만 이 지연이 보입니다.`;
    } else if (fps < 25) {
      msg = `${K.flag('warn')}<b>뚝뚝 끊김 (화면)</b>: 네트워크는 멀쩡하지만 화면을 초당 ${fps}번만 그립니다. 궤적 점 간격이 넓고 일정합니다.`;
    } else {
      msg = `${K.flag('good')}<b>안정적</b>: 핑 ${ping == null ? '측정 중' : K.ms(ping)}, 손실 ${K.pct(ls.rate, 1)}. ${P.mode === 'interp' ? `보간 덕분에 상대가 매끄럽지만, 실제보다 약 ${K.ms(P.interp + P.rtt / 2)} 과거 모습입니다(위치 오차 ${K.n(remErr, 1)}m).` : ''} ${P.predict ? '내 캐릭터는 예측으로 즉시 움직입니다.' : ''}`;
    }
    F.say(msg);
    if (logDirty) {
      logDirty = false;
      const rows = events.slice(-9).reverse().map(e => {
        const s = e.t / 1000;
        const mm = Math.floor(s / 60), ss = (s % 60).toFixed(1).padStart(4, '0');
        return `<div><span class="t">${mm}:${ss}</span><span class="${e.level === 'bad' ? 'bad' : e.level === 'warn' ? 'warn' : ''}">${e.text}</span></div>`;
      });
      logEl.innerHTML = rows.join('') || '<div><span class="t">—</span><span>아직 특별한 사건이 없습니다</span></div>';
    }
  }

  function warm(ms) { for (let i = 0; i < ms; i++) step1(); }

  resetAll();
  applyPreset('normal');
  events.length = 0;
  warm(2500);

  K.loop(root, dt => {
    advance(dt);
    drawArena(cvS, 'server');
    if (t >= C.hitchUntil) drawArena(cvC, 'client');
    if (!compact) { drawTimeline(); drawSpeed(); }
    statT += dt;
    if (statT > 200) { statT = 0; updateStats(); }
  });
});
