/* 기다림의 법칙: 창구(처리자)와 줄(대기열). 이용률이 80%를 넘으면 대기가 폭발한다.
   모든 레이어(CPU·디스크·DB·네트워크)에 공통으로 적용되는 원리라 기본 개념 장에서 쓴다. */
K.register('queue', function (root) {
  const F = K.frame(root, {
    kicker: '기본 원리 · 대기열',
    title: '워커가 바쁠수록 대기열은 “갑자기” 길어진다',
    lead: '패킷·쿼리·디스크 요청·CPU 작업은 모두 워커(요청을 처리하는 주체) 앞 대기열에 쌓입니다. 요청이 오는 속도를 올려 보세요. 워커가 하나면 70%쯤 바쁠 때까지는 대기가 처리 시간의 2배 남짓이지만, 90%면 9배, 95%면 19배로 급격히 솟습니다. 렉의 대부분은 어딘가에서 이 곡선의 오른쪽 끝에 올라탄 것입니다.',
    tries: [
      '<b>도착 속도</b>를 천천히 올리며 오른쪽 곡선 위의 점이 어디서 급하게 꺾이는지 보세요.',
      '<b>이용률 95%</b> 근처에서 도착 속도를 아주 조금만 더 올려 보세요. 대기가 몇 배로 늘어납니다.',
      '<b>워커 수</b>를 1 → 4로 늘리고 처리 시간도 4배로 늘려 보세요. 같은 이용률이어도 워커가 많으면 대기열이 덜 막힙니다. 대신 한 건을 처리하는 시간은 4배입니다.',
      '<b>도착 방식</b>을 “몰려옴”으로 바꾸면, 평균 이용률이 낮아도 순간적으로 대기열이 생깁니다. 월드 보스 등장, 점검 직후 접속이 이런 패턴입니다.',
    ],
  });

  const P = { lambda: 7, service: 100, servers: 1, mode: 'random' };
  const rnd = K.rng(7);

  const qcv = K.canvas(F.stage, { height: 150, caption: '대기열과 워커', right: '<span class="legend"><span><i class="dot" style="background:var(--s1)"></i>대기 중</span><span><i class="dot" style="background:var(--s2)"></i>처리 중</span></span>' });
  const ccv = K.canvas(F.stage, { height: w => K.clamp(w * 0.42, 190, 260), caption: '이용률에 따른 평균 대기 시간', right: '곡선: 무작위 도착 이론값 · 점: 지금 측정값' });

  const g1 = K.group(F.controls, '요청');
  const sLambda = K.slider(g1, { label: '도착 속도', min: 0.5, max: 40, step: 0.5, value: P.lambda, unit: '건/초', onInput: v => { P.lambda = v; reset(); } });
  K.choice(g1, {
    label: '도착 방식', value: P.mode,
    options: [['even', '고르게'], ['random', '무작위'], ['burst', '몰려옴']],
    onChange: v => { P.mode = v; reset(); },
    hint: '“몰려옴”은 평균은 같아도 한 번에 여러 건이 동시에 도착합니다.',
  });
  const g2 = K.group(F.controls, '워커(처리 주체)');
  const sSvc = K.slider(g2, { label: '1건 처리 시간', min: 10, max: 400, step: 10, value: P.service, unit: 'ms', onInput: v => { P.service = v; reset(); } });
  const sSrv = K.slider(g2, { label: '워커 수', min: 1, max: 8, step: 1, value: P.servers, unit: '개', onInput: v => { P.servers = v; reset(); }, hint: '워커 = CPU 코어, 스레드, DB 커넥션, 디스크 채널, 회선 등' });

  const stU = K.stat(F.stats, { label: '이용률', unit: '%' });
  const stQ = K.stat(F.stats, { label: '대기열 길이', unit: '건' });
  const stW = K.stat(F.stats, { label: '평균 대기(측정)' });
  const stT = K.stat(F.stats, { label: '이론 평균 대기' });

  // 상태
  let t = 0, nextArr = 0, burstLeft = 0;
  let queue = [];           // 도착 시각 배열
  let busy = [];            // 창구별 {start, end} 또는 null
  let waits = [];           // 최근 대기 시간 (ms)
  let hist = [];            // [t, 줄 길이]

  function reset() {
    queue = []; waits = []; hist = [];
    busy = new Array(P.servers).fill(null);
    nextArr = t;
    burstLeft = 0;
  }
  reset();

  const expo = mean => -Math.log(1 - rnd()) * mean;
  function interArrival() {
    const mean = 1000 / P.lambda;
    if (P.mode === 'even') return mean;
    if (P.mode === 'random') return expo(mean);
    // 몰려옴: 5건씩 거의 동시에 온 뒤 쉬었다 온다 (평균 속도는 같다)
    if (burstLeft > 0) { burstLeft--; return 2 + rnd() * 3; }
    burstLeft = 4;
    return expo(mean * 5);
  }

  // Erlang C: M/M/c 평균 대기 (ms)
  function theoryWait(lambda, S, c) {
    const a = (lambda * S) / 1000;
    if (a >= c) return Infinity;
    let sum = 0, term = 1;
    for (let k = 0; k < c; k++) { if (k > 0) term *= a / k; sum += term; }
    const top = term * (a / c) * (c / (c - a));
    const C = top / (sum + top);
    return (C * S) / (c - a);
  }

  function step(dt) {
    const end = t + dt;
    // 1ms 단위가 아니라 사건 단위로 진행
    for (let guard = 0; guard < 2000; guard++) {
      let nextEvt = end, kind = null, idx = -1;
      if (nextArr < nextEvt) { nextEvt = nextArr; kind = 'arr'; }
      busy.forEach((b, i) => { if (b && b.end < nextEvt) { nextEvt = b.end; kind = 'done'; idx = i; } });
      if (!kind) break;
      t = nextEvt;
      if (kind === 'arr') { queue.push(t); nextArr = t + interArrival(); }
      else busy[idx] = null;
      // 빈 워커에 요청 배정
      for (let i = 0; i < busy.length && queue.length; i++) {
        if (!busy[i]) {
          const a = queue.shift();
          waits.push(t - a); if (waits.length > 300) waits.shift();
          busy[i] = { start: t, end: t + expo(P.service) };
        }
      }
    }
    t = end;
    // 줄이 너무 길면 화면용으로 자른다 (현실에서는 타임아웃·버림이 일어난다)
    if (queue.length > 400) queue.splice(0, queue.length - 400);
    hist.push([t, queue.length]);
    while (hist.length && hist[0][0] < t - 8000) hist.shift();
  }

  // 미리 몇 초 돌려 첫 화면을 채운다
  for (let i = 0; i < 300; i++) step(16);

  function drawQueue() {
    const { ctx, w, h } = qcv;
    ctx.clearRect(0, 0, w, h);
    const C = K.C;
    const counterX = w - 70;
    const laneY = h / 2;
    // 창구
    const n = busy.length;
    const slotH = Math.min(26, (h - 30) / n);
    const top = laneY - (slotH * n) / 2;
    for (let i = 0; i < n; i++) {
      const y = top + i * slotH + slotH / 2;
      ctx.fillStyle = C.sunk;
      K.rr(ctx, counterX, y - slotH / 2 + 2, 54, slotH - 4, 4); ctx.fill();
      const b = busy[i];
      if (b) {
        const prog = K.clamp((t - b.start) / Math.max(1, b.end - b.start), 0, 1);
        ctx.fillStyle = K.alpha(C.s2, 0.25);
        K.rr(ctx, counterX, y - slotH / 2 + 2, 54 * prog, slotH - 4, 4); ctx.fill();
        K.dot(ctx, counterX + 12, y, Math.min(5, slotH / 3), C.s2, C.sunk);
      }
    }
    K.text(ctx, '워커', counterX + 27, top - 10, { align: 'center', size: 11, color: C.muted });
    // 줄
    const r = 4.5, gap = 11;
    const maxVis = Math.floor((counterX - 30) / gap);
    const shown = Math.min(queue.length, maxVis);
    for (let i = 0; i < shown; i++) {
      const x = counterX - 14 - i * gap;
      const wait = t - queue[i];
      const hot = K.clamp(wait / 1500, 0, 1);
      K.dot(ctx, x, laneY, r, hot > 0.66 ? C.bad : C.s1, C.paper);
    }
    if (queue.length > maxVis) K.text(ctx, `+${queue.length - maxVis}건 더`, 8, laneY - 18, { size: 11, color: C.badInk, weight: 600 });
    K.text(ctx, '→ 도착', 8, h - 12, { size: 11, color: C.muted });
    if (queue.length) K.text(ctx, '빨간 점: 1.5초 넘게 기다리는 중', counterX - 8, h - 12, { size: 11, color: C.muted, align: 'right' });
  }

  function drawCurve() {
    const { ctx, w, h } = ccv;
    ctx.clearRect(0, 0, w, h);
    const C = K.C;
    const c = P.servers, S = P.service;
    const yMaxMult = 10; // 처리 시간의 10배까지 표시
    const box = { x: 46, y: 26, w: w - 60, h: h - 58 };
    const sc = K.plot(ctx, box, {
      x0: 0, x1: 1, y0: 0, y1: yMaxMult,
      yTicks: [0, 2, 4, 6, 8, 10], yFmt: v => v + '×',
      xTicks: [0, 0.2, 0.4, 0.6, 0.8, 1], xFmt: v => Math.round(v * 100) + '%',
      yTitle: '평균 대기 (처리 시간의 몇 배)', xTitle: '이용률',
    });
    // 위험 구간
    ctx.fillStyle = K.alpha(C.bad, 0.07);
    ctx.fillRect(sc.x(0.85), box.y, sc.x(1) - sc.x(0.85), box.h);
    K.text(ctx, '위험 구간', sc.x(0.925), box.y + 10, { align: 'center', size: 10.5, color: C.badInk, weight: 600 });
    const pts = [];
    for (let u = 0; u <= 0.995; u += 0.005) {
      const lam = (u * c * 1000) / S;
      const W = theoryWait(lam, S, c) / S;
      pts.push([u, Math.min(W, yMaxMult)]);
    }
    K.area(ctx, sc, pts, C.s1, 0.1);
    K.line(ctx, sc, pts, C.s1, 2);
    // 현재 점
    const u = (P.lambda * S) / 1000 / c;
    const thW = theoryWait(P.lambda, S, c);
    const meas = waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0;
    if (u < 1) {
      const y = Math.min(thW / S, yMaxMult);
      K.dot(ctx, sc.x(u), sc.y(y), 5, C.s1);
    }
    const ux = Math.min(u, 1);
    const my = Math.min(meas / S, yMaxMult);
    ctx.save();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sc.x(ux), sc.y(my), 6, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    K.text(ctx, u >= 1 ? '처리량 초과: 대기열이 끝없이 늘어남' : '지금', sc.x(ux) + (ux > 0.7 ? -10 : 10), sc.y(my) - 14, { align: ux > 0.7 ? 'right' : 'left', size: 11, weight: 600, color: C.ink });
  }

  K.hover(ccv, (x) => {
    const box = { x: 46, w: ccv.w - 60 };
    const u = (x - box.x) / box.w;
    if (u < 0 || u > 0.995) return null;
    const lam = (u * P.servers * 1000) / P.service;
    const W = theoryWait(lam, P.service, P.servers);
    return `이용률 <b>${Math.round(u * 100)}%</b><br>평균 대기 ≈ <b>${K.ms(W)}</b><br>(처리 시간 ${P.service}ms 기준)`;
  });

  K.loop(root, dt => {
    step(dt);
    drawQueue();
    drawCurve();
    const u = (P.lambda * P.service) / 1000 / P.servers;
    const meas = waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0;
    const th = theoryWait(P.lambda, P.service, P.servers);
    const st = u < 0.7 ? 'good' : u < 0.9 ? 'warn' : 'bad';
    stU.set(K.n(u * 100, 0), st);
    stQ.set(K.n(queue.length), queue.length > 20 ? 'bad' : queue.length > 5 ? 'warn' : 'good');
    stW.set(K.ms(meas), meas > P.service * 4 ? 'bad' : meas > P.service ? 'warn' : 'good');
    stT.set(u >= 1 ? '무한대' : K.ms(th));
    let msg;
    if (u >= 1) msg = `${K.flag('bad')}<b>들어오는 양이 처리 능력보다 많습니다.</b> 대기열은 줄지 않고 계속 길어집니다. 게임에서는 이 상태가 몇 초만 이어져도 요청이 타임아웃되거나(접속 끊김·무한 로딩), 뒤늦게 한꺼번에 처리됩니다(몰아치기).`;
    else if (u >= 0.9) msg = `${K.flag('bad')}이용률 <b>${Math.round(u * 100)}%</b>. 평균은 버티는 것 같아도 대기가 처리 시간의 <b>${K.n(th / P.service, 1)}배</b>입니다${P.mode === 'random' ? '' : '(무작위 도착일 때 이론값)'}. 요청이 조금만 몰려도 대기열이 급격히 길어집니다. 서버 CPU·DB·회선이 “아직 10% 남았는데 왜 렉이지?” 싶은 순간이 바로 여기입니다.`;
    else if (u >= 0.7) msg = `${K.flag('warn')}이용률 <b>${Math.round(u * 100)}%</b>. 곡선이 꺾이기 시작하는 구간입니다. 평소엔 괜찮지만 이벤트처럼 요청이 몰리면 바로 대기가 길어집니다.`;
    else msg = `${K.flag('good')}이용률 <b>${Math.round(u * 100)}%</b>. 워커에 여유가 있어 대부분 바로 처리됩니다. 대기열이 생겨도 금방 비워집니다.`;
    F.say(msg);
  });
});
