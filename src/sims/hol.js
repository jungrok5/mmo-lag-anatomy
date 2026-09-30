/* 머리 막힘(head-of-line blocking). TCP 는 순서를 지키려고 잃어버린 한 개가 다시 올 때까지
   뒤에 도착한 패킷을 수신 버퍼에 붙잡아 둔다. 같은 손실을 UDP 에도 똑같이 주고 나란히 비교한다. */
K.register('hol', function (root) {
  const TR = I18N.tr('sim-hol');   // 이 실험 묶음의 사전을 먼저 본다(i18n.js)
  const F = K.frame(root, {
    kicker: TR`소켓과 프로토콜 · TCP vs UDP`,
    title: TR`TCP는 잃어버린 패킷 하나 때문에 뒤의 패킷까지 모두 막힌다`,
    lead: TR`서버가 캐릭터 위치를 50ms마다 보냅니다. 위는 TCP, 아래는 UDP이고, 두 연결에서 똑같은 패킷이 똑같이 사라집니다. TCP는 받은 데이터를 <b>보낸 순서대로만</b> 게임에 넘겨줍니다. 하나가 빠지면 그 패킷이 다시 올 때까지 뒤에 도착한 패킷도 모두 기다립니다. UDP는 <b>도착하는 대로</b> 넘겨주고, 빠진 것은 건너뜁니다. 다시 보내는 규칙은 교과서 방식(뒤따르는 패킷 3개가 보내는 중복 ACK, 또는 타이머)으로 단순화했습니다. 최신 리눅스 기본인 RACK은 뒤따르는 패킷 하나로도 판단해 첫 재전송이 조금 더 빠릅니다. 또 실제 TCP는 타이머 재전송 뒤에는 한 번에 하나만 보내고 새 패킷은 서버에 남겨 두는데, 이 실험은 새 패킷을 계속 보내 수신 버퍼에 쌓이게 그렸습니다. 어느 쪽이든 게임에 전달되지 못하는 것은 같습니다(06 TCP 재전송 해부의 실험에서 비교).`,
    tries: [
      TR`<b>다음 패킷 하나 잃어버리기</b>를 누르세요. TCP의 “게임에 전달” 줄이 끊겼다가 한 점에 몰리는 곳(몰아치기)을 찾아보세요. UDP는 하나만 빠지고 끝납니다.`,
      TR`<b>핑(RTT)</b>을 250ms로 올리고 다시 잃어버려 보세요. 재전송이 한 번 왕복해야 하니 멈춤도 그만큼 길어집니다.`,
      TR`<b>와이파이 순간 끊김</b>을 누르세요. 끊긴 0.5초 동안은 둘 다 멈추지만, TCP는 그 사이 보낸 재전송까지 사라져서 훨씬 늦게 풀립니다.`,
      TR`<b>연속 손실 (백오프)</b>를 누른 뒤 <b>RTO 최소값</b>을 1초로 바꿔 보세요. 원본과 재전송 두 번이 연달아 사라지면 다시 보내기까지 기다리는 시간이 매번 두 배로 늘어, 멈춤이 3초를 넘깁니다(백오프).`,
      TR`<b>관찰 속도 0.25×</b>로 늦추면 수신 버퍼 막대가 계단처럼 자라다가 한꺼번에 풀리는 순간을 볼 수 있습니다.`,
    ],
    layout: 'stack',
  });
  K.addStyle('hol', '.hol-btn{white-space:normal;line-height:1.35;text-align:center}');

  const P = { rtt: 100, loss: 0.02, jit: 10, iv: 50, rtoMin: 200, speed: 1, auto: true };
  const rnd = K.rng(11);
  const TRACK = 3000;          // 캐릭터가 띠 한 바퀴를 도는 시간
  const LANE = 136;

  const cv = K.canvas(F.stage, {
    height: 2 * LANE + 36,
    caption: TR`패킷의 이동 경로: 서버 → 내 PC → 게임`,
    right: TR`<span class="legend"><span><i style="background:var(--s1)"></i>TCP</span><span><i style="background:var(--s2)"></i>UDP</span><span><i class="box" style="background:var(--warn)"></i>순서 대기</span><span>× 손실 · 점선 재전송</span></span>`,
  });

  /* ---------- 조작부 ---------- */
  const g1 = K.group(F.controls, TR`회선 상태`);
  const sRtt = K.slider(g1, { label: TR`핑(RTT, 왕복 시간)`, min: 20, max: 400, step: 10, value: P.rtt, unit: 'ms', onInput: v => { P.rtt = v; rtoHint(); } });
  const sLoss = K.slider(g1, { label: TR`손실률`, min: 0, max: 30, step: 1, value: P.loss * 100, unit: '%', onInput: v => { P.loss = v / 100; } });
  const sJit = K.slider(g1, { label: TR`지터(도착 간격의 흔들림)`, min: 0, max: 50, step: 5, value: P.jit, unit: 'ms', onInput: v => { P.jit = v; rtoHint(); } });
  const g2 = K.group(F.controls, TR`서버와 TCP 설정`);
  const cIv = K.choice(g2, { label: TR`전송 간격`, value: P.iv, options: [[50, '50ms (20Hz)'], [33, '33ms (30Hz)'], [100, '100ms (10Hz)']], onChange: v => { P.iv = +v; } });
  const cRto = K.choice(g2, {
    label: TR`RTO 최소값 (재전송 타이머)`, value: P.rtoMin,
    options: [[200, TR`200ms 리눅스 기본`], [1000, TR`1초 표준 권장값`]], onChange: v => { P.rtoMin = +v; rtoHint(); }, hint: ' ',
  });
  const rtoHintEl = cRto.el.querySelector('.ctl-hint');
  function rtoHint() { rtoHintEl.innerHTML = TR`지금 재전송 타이머 ≈ <b>${K.ms(RTO())}</b>. 재전송도 사라지면 두 배씩 늘어납니다.`; }
  const g3 = K.group(F.controls, TR`사건 일으키기`);
  K.button(g3, { label: TR`다음 패킷 하나 잃어버리기`, onClick: () => trigger('one') }).classList.add('hol-btn');
  K.button(g3, { label: TR`0.5초 동안 전부 잃어버리기 (와이파이 순간 끊김)`, onClick: () => trigger('wifi') }).classList.add('hol-btn');
  const tAuto = K.toggle(g3, { label: TR`4초마다 마지막 사건 반복`, value: P.auto, onChange: v => { P.auto = v; autoAt = t + 400; } });
  const cSpd = K.choice(g3, { label: TR`관찰 속도`, value: 1, options: [[1, '1×'], [0.25, TR`0.25× 느리게`]], onChange: v => { P.speed = +v; } });

  const stFreeze = K.stat(F.stats, { label: TR`TCP 최대 멈춤`, sub: TR`최근 10초` });
  const stClump = K.stat(F.stats, { label: TR`TCP 몰아치기`, unit: TR`개`, sub: TR`한 번에 전달된 최대 개수` });
  const stULoss = K.stat(F.stats, { label: TR`UDP 빠진 개수`, unit: TR`개` });
  const stDT = K.stat(F.stats, { label: TR`TCP 평균 지연`, sub: TR`보냄 → 게임에 전달` });
  const stDU = K.stat(F.stats, { label: TR`UDP 평균 지연`, sub: TR`보냄 → 게임에 전달` });

  /* ---------- 모형 ---------- */
  let t, nextSend, seqNo, pk, ev, holes, tcpNext, udpNewest, batches, blackout;
  let forceOrig, forceRetx, lastEvent = 'one', autoAt = 0;
  let lastTD, lastUD, tgtT, tgtU, dispT, dispU, udpJump, clump;
  function reset() {
    t = 0; nextSend = 0; seqNo = 0; pk = []; ev = []; holes = []; tcpNext = 0; udpNewest = -1;
    batches = []; blackout = null; forceOrig = 0; forceRetx = 0;
    lastTD = lastUD = tgtT = tgtU = dispT = dispU = 0; udpJump = { t: -1e9, n: 0 }; clump = { t: -1e9, n: 0 };
  }
  reset();

  function RTO() { return P.rtoMin === 200 ? P.rtt + Math.max(200, 4 * P.jit) : Math.max(1000, P.rtt + 4 * P.jit); }
  const owd = () => P.rtt / 2 + P.jit * rnd();
  const dark = x => !!blackout && x >= blackout.a && x < blackout.b;
  const byN = n => (pk.length ? pk[n - pk[0].n] : undefined);
  const push = (tt, k, p, x) => ev.push({ t: tt, k, p, x });

  function trigger(kind) {
    lastEvent = kind;
    if (kind === 'wifi') blackout = { a: t, b: t + 500 };
    else { forceOrig = 1; forceRetx = kind === 'burst' ? 2 : 0; }
    autoAt = t + 4000;
  }

  function send(tt) {
    const n = seqNo++, d = owd();
    let lost = dark(tt + d / 2), fx = 0;
    if (forceOrig > 0) { lost = true; forceOrig--; fx = forceRetx; forceRetx = 0; }
    if (rnd() < P.loss) lost = true;
    const p = { n, s: tt, d, lost, tx: [{ s: tt, d, lost, k: 0 }], tA: null, tD: null, uA: null, uD: null, late: false, dup: 0, fr: false, rtoed: false, bo: 0, gen: 0, fx };
    pk.push(p);
    if (!lost) { push(tt + d, 'aT', p); push(tt + d, 'aU', p); }
    else { holes.push(p); arm(p, tt); }
  }
  function arm(p, from) { p.gen++; push(from + RTO() * Math.pow(2, p.bo), 'rto', p, p.gen); }
  function retx(p, tt, kind) {
    const d = owd();
    let lost = dark(tt + d / 2);
    if (p.fx > 0) { lost = true; p.fx--; }
    if (rnd() < P.loss) lost = true;
    p.tx.push({ s: tt, d, lost, k: kind });
    if (kind === 2) { p.rtoed = true; p.bo = Math.min(p.bo + 1, 6); }
    if (!lost) push(tt + d, 'aT', p);
    arm(p, tt);
  }
  function arriveT(p, tt) {
    if (p.tA != null) return;
    p.tA = tt;
    // 뒤 번호가 도착할 때마다 앞의 빈자리마다 중복 ACK 하나 (SACK). 세 번째에서 빠른 재전송.
    for (const h of holes) {
      if (h.n < p.n && h.tA == null && !h.fr && !h.rtoed && ++h.dup === 3) { h.fr = true; push(tt + P.rtt / 2, 'fr', h); }
    }
    if (p.lost) holes = holes.filter(h => h.tA == null);
    let first = null, cnt = 0, q;
    while ((q = byN(tcpNext)) && q.tA != null) { q.tD = tt; if (!first) first = q; cnt++; tcpNext++; }
    if (cnt) { batches.push({ t: tt, n: first.n, c: cnt, gap: tt - lastTD }); lastTD = tt; tgtT = byN(tcpNext - 1).s; if (cnt >= 3) clump = { t: tt, n: cnt }; }
  }
  function arriveU(p, tt) {
    p.uA = tt;
    if (p.n > udpNewest) {
      if (udpNewest >= 0 && p.n > udpNewest + 1) udpJump = { t: tt, n: p.n - udpNewest - 1 };
      p.uD = tt; udpNewest = p.n; tgtU = p.s; lastUD = tt;
    } else p.late = true;
  }

  function step(dt) {
    const end = t + dt;
    for (let guard = 0; guard < 4000; guard++) {
      let bi = -1, bt = nextSend;
      for (let i = 0; i < ev.length; i++) if (ev[i].t < bt) { bt = ev[i].t; bi = i; }
      if (bt > end) break;
      t = bt;
      if (bi < 0) {
        if (P.auto && t >= autoAt) trigger(lastEvent);
        send(t); nextSend += P.iv; continue;
      }
      const e = ev[bi]; ev[bi] = ev[ev.length - 1]; ev.pop();
      if (e.k === 'aT') arriveT(e.p, t);
      else if (e.k === 'aU') arriveU(e.p, t);
      else if (e.k === 'fr') { if (e.p.tA == null && !e.p.rtoed) retx(e.p, t, 1); }
      else if (e.k === 'rto') { if (e.p.tA == null && e.x === e.p.gen) retx(e.p, t, 2); }
    }
    t = end;
    const a = 1 - Math.exp(-dt / 40);
    dispT += (tgtT - dispT) * a; dispU += (tgtU - dispU) * a;
    while (pk.length > 1 && pk[0].s < t - 12000 && pk[0].tD != null) pk.shift();
    while (batches.length && batches[0].t < t - 12000) batches.shift();
    if (blackout && blackout.b < t - 12000) blackout = null;
  }

  // 미리 돌려 첫 화면을 채운다 (자동 반복이 0초·4초에 패킷 하나씩 잃어버린다)
  step(5600);

  /* ---------- 그리기 ---------- */
  function geo() {
    const w = cv.w, narrow = w < 520;
    const L = narrow ? 34 : 84;
    const Wt = w < 480 ? 2000 : w < 820 ? 3000 : 4000;
    const x0 = L + 6, x1 = w - 12;
    return { w, narrow, L, Wt, x0, x1, X: tt => x0 + ((tt - (t - Wt)) / Wt) * (x1 - x0), T: x => t - Wt + ((x - x0) / (x1 - x0)) * Wt };
  }
  function railsOf(top) { const y1 = top + 34, y2 = y1 + 36, y3 = y2 + 28; return { y1, y2, y3, y4: y3 + 26 }; }
  const freezeThr = () => Math.max(2.5 * P.iv, P.iv + 60);

  // 선 위에 올라가는 글자: 바탕색 테두리를 둘러 읽히게 한다
  function label(ctx, str, x, y, o) {
    ctx.font = K.font(o.size || 10.5, o.weight || 600, o.mono);
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = K.C.paper; ctx.strokeText(str, x, y);
    ctx.fillStyle = o.color; ctx.fillText(str, x, y);
  }
  function cross(ctx, x, y, r, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke();
  }
  function flight(ctx, G, R, s, d, lost, col, dashed) {
    const end = lost ? s + d / 2 : s + d;
    const f = K.clamp((t - s) / (end - s), 0, 1);
    const xa = G.X(s), ya = R.y1, xb = G.X(end), yb = lost ? (R.y1 + R.y2) / 2 : R.y2;
    const xe = xa + (xb - xa) * f, ye = ya + (yb - ya) * f;
    ctx.strokeStyle = K.alpha(col, dashed ? 0.95 : 0.6); ctx.lineWidth = dashed ? 1.6 : 1.2;
    ctx.setLineDash(dashed ? [3, 3] : []);
    ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xe, ye); ctx.stroke();
    ctx.setLineDash([]);
    if (lost && f >= 1) cross(ctx, xb, yb, 3.5, K.C.bad);
  }

  function drawLane(ctx, G, top, tcp) {
    const C = K.C, R = railsOf(top), col = tcp ? C.s1 : C.s2;
    const t0 = t - G.Wt;
    // 제목
    K.text(ctx, tcp ? 'TCP' : 'UDP', 10, top + 12, { size: 13, weight: 700, color: C.ink });
    if (!G.narrow) K.text(ctx, tcp ? TR`보낸 순서대로만 전달` : TR`도착하는 대로 전달`, 44, top + 12, { size: 11.5, color: C.muted });
    if (!tcp) {
      // 캐릭터 띠 범례
      const xr = G.x1, yy = top + 12;
      ctx.font = K.font(11);
      const a = G.narrow ? TR`서버` : TR`서버의 실제 위치`, b = G.narrow ? TR`내 화면` : TR`내 화면 속 캐릭터`;
      const wa = ctx.measureText(a).width;
      K.text(ctx, a, xr, yy, { size: 11, color: C.muted, align: 'right' });
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(xr - wa - 9, yy, 4, 0, 7); ctx.stroke();
      const xb = xr - wa - 22;
      K.text(ctx, b, xb, yy, { size: 11, color: C.muted, align: 'right' });
      ctx.fillStyle = C.ink2; ctx.beginPath(); ctx.arc(xb - ctx.measureText(b).width - 8, yy, 4, 0, 7); ctx.fill();
    }
    // 레일
    const names = G.narrow ? [TR`보냄`, TR`도착`, TR`전달`, TR`위치`] : [TR`서버 보냄`, TR`내 PC 도착`, TR`게임에 전달`, TR`캐릭터 위치`];
    [R.y1, R.y2, R.y3].forEach((y, i) => {
      ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(G.x0, Math.round(y) + 0.5); ctx.lineTo(G.x1, Math.round(y) + 0.5); ctx.stroke();
      K.text(ctx, names[i], 8, y, { size: G.narrow ? 10.5 : 11, color: C.ink2 });
    });
    K.text(ctx, names[3], 8, R.y4, { size: G.narrow ? 10.5 : 11, color: C.ink2 });

    ctx.save();
    ctx.beginPath(); ctx.rect(G.x0 - 5, top + 20, G.x1 - G.x0 + 10, R.y3 - top); ctx.clip();

    // 멈춤 구간 (게임에 전달 줄)
    const dels = [];
    if (tcp) batches.forEach(b => dels.push([b.t, b.c]));
    else pk.forEach(p => { if (p.uD != null) dels.push([p.uD, 1]); });
    const thr = freezeThr();
    for (let i = 0; i <= dels.length; i++) {
      const a = i ? dels[i - 1][0] : null, b = i < dels.length ? dels[i][0] : t;
      if (a == null || b - a < thr || b < t0) continue;
      const xa = G.X(a), xb = G.X(b);
      ctx.fillStyle = K.alpha(C.bad, 0.13);
      ctx.fillRect(xa, R.y3 - 6, xb - xa, 12);
      const label = (G.narrow ? '' : TR`멈춤 `) + K.ms(b - a);
      ctx.font = K.font(10.5, 600);
      if (ctx.measureText(label).width + 8 < xb - Math.max(xa, G.x0)) K.text(ctx, label, (Math.max(xa, G.x0) + xb) / 2, R.y3 + 14, { size: 10.5, weight: 600, color: C.badInk, align: 'center' });
    }

    // 수신 버퍼 채움 (TCP): 계단 모양으로 쌓였다가 한꺼번에 풀린다
    if (tcp) {
      const edges = [];
      for (const p of pk) {
        if (p.tA == null) continue;
        const e = p.tD != null ? p.tD : t;
        if (e - p.tA < 1 || e < t0) continue;
        edges.push([p.tA, 1], [e, -1]);
      }
      edges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      let c = 0, px = null, peak = 0, peakX = 0;
      for (const [tt, dd] of edges) {
        if (c > 0 && px != null) {
          const hh = Math.min(20, 3 + c * 2.2), xa = G.X(px), xb = G.X(tt);
          ctx.fillStyle = K.alpha(C.warn, 0.55); ctx.fillRect(xa, R.y2 - hh, xb - xa, hh);
          ctx.fillStyle = C.warn; ctx.fillRect(xa, R.y2 - hh, xb - xa, 1.5);
          if (c >= peak) { peak = c; peakX = xb; }
        }
        c += dd; px = tt;
        if (c === 0 && peak >= 2) {
          ctx.font = K.font(10.5, 600);
          const lw = ctx.measureText(peak + TR`개 대기`).width;
          label(ctx, peak + TR`개 대기`, K.clamp(peakX, G.x0 + lw, G.x1 - 2), R.y2 - Math.min(20, 3 + peak * 2.2) - 7, { color: C.warnInk, align: 'right' });
          peak = 0;
        }
      }
      if (c > 0 && px != null) {
        const hh = Math.min(20, 3 + c * 2.2), xa = G.X(px);
        ctx.fillStyle = K.alpha(C.warn, 0.55); ctx.fillRect(xa, R.y2 - hh, G.X(t) - xa, hh);
        ctx.fillStyle = C.warn; ctx.fillRect(xa, R.y2 - hh, G.X(t) - xa, 1.5);
        label(ctx, c + TR`개 대기 중`, G.x1 - 2, R.y2 - hh - 7, { weight: 700, color: C.warnInk, align: 'right' });
      }
    }

    // 패킷
    const lostLbl = [];
    for (const p of pk) {
      if (p.s > t) continue;
      const lastEnd = Math.max(p.s + p.d, tcp ? (p.tD != null ? p.tD : t) : (p.uA || 0));
      if (lastEnd < t0 - 50) continue;
      const txs = tcp ? p.tx : [p.tx[0]];
      txs.forEach((x, i) => {
        if (x.s > t) return;
        flight(ctx, G, R, x.s, x.d, x.lost, col, i > 0);
        if (i > 0) { ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.strokeRect(G.X(x.s) - 2.5, R.y1 - 2.5, 5, 5); }
      });
      ctx.fillStyle = col; ctx.fillRect(G.X(p.s) - 2.5, R.y1 - 2.5, 5, 5);
      if (p.lost) lostLbl.push(p);
      // 도착 → 전달
      const del = tcp ? p.tD : p.uD;
      if (del != null) {
        const x = G.X(del);
        ctx.strokeStyle = K.alpha(col, 0.35); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, R.y2); ctx.lineTo(x, R.y3); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, R.y3 - 5); ctx.lineTo(x, R.y3 + 5); ctx.stroke();
      } else if (!tcp && p.late && p.uA != null) {
        ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(G.X(p.uA), R.y2, 3, 0, 7); ctx.stroke();
      } else if (!tcp && p.lost && p.s + p.d < t) {
        ctx.strokeStyle = C.bad; ctx.lineWidth = 1.5; ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.moveTo(G.X(p.s + p.d), R.y3 - 5); ctx.lineTo(G.X(p.s + p.d), R.y3 + 5); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    // 잃어버린 패킷 번호 (겹치면 생략)
    let lastX = -1e9;
    for (const p of lostLbl) {
      const x = G.X(p.s);
      if (x - lastX < 26) continue;
      lastX = x;
      const edge = x > G.x1 - 16;
      label(ctx, '#' + p.n, edge ? x + 4 : x, R.y1 - 10, { size: 10, mono: true, color: C.badInk, align: edge ? 'right' : 'center' });
    }
    // 몰아치기 표시
    if (tcp) {
      let lx = -1e9;
      for (const b of batches) {
        if (b.c < 2 || b.t < t0) continue;
        const x = G.X(b.t);
        if (x - lx < 30) continue;
        lx = x;
        const lab = '×' + b.c;
        ctx.font = K.font(10.5, 700);
        const tw = ctx.measureText(lab).width + 8;
        ctx.fillStyle = C.ink; K.rr(ctx, x - tw - 3, R.y3 - 22, tw, 15, 4); ctx.fill();
        K.text(ctx, lab, x - tw / 2 - 3, R.y3 - 14.5, { size: 10.5, weight: 700, color: C.surface, align: 'center' });
      }
    }
    ctx.restore();

    // 캐릭터 위치 띠
    const tw = G.x1 - G.x0, frac = v => ((v % TRACK) + TRACK) % TRACK / TRACK;
    ctx.strokeStyle = C.grid; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(G.x0, R.y4); ctx.lineTo(G.x1, R.y4); ctx.stroke(); ctx.lineCap = 'butt';
    const gx = G.x0 + frac(t) * tw;
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(gx, R.y4, 5, 0, 7); ctx.stroke();
    const disp = tcp ? dispT : dispU, dx = G.x0 + frac(disp) * tw;
    K.dot(ctx, dx, R.y4, 5, col, C.paper);
    const since = t - (tcp ? lastTD : lastUD);
    let tag = null, tc = C.badInk;
    if (since > freezeThr()) tag = TR`멈춤 ` + K.ms(since);
    else if (tcp && t - clump.t < 500) { tag = TR`몰아치기 ×` + clump.n; tc = C.warnInk; }
    else if (!tcp && t - udpJump.t < 450) { tag = udpJump.n + TR`개 건너뜀`; tc = C.warnInk; }
    if (tag) {
      // 유령(서버 위치)은 늘 앞쪽에 있으니 글자는 점 왼쪽에, 자리가 없으면 둘 다 지난 오른쪽에
      ctx.font = K.font(11, 700);
      const lw = ctx.measureText(tag).width, left = dx - G.x0 > lw + 14;
      const ax = left ? dx - 11 : (gx >= dx && gx - dx < lw + 30 ? gx : dx) + 11;
      label(ctx, tag, ax, R.y4, { size: 11, weight: 700, color: tc, align: left ? 'right' : 'left' });
    }
  }

  function draw() {
    const { ctx, w, h } = cv, C = K.C, G = geo();
    ctx.clearRect(0, 0, w, h);
    // 1초 격자
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (let s = Math.ceil((t - G.Wt) / 1000) * 1000; s <= t; s += 1000) {
      const x = Math.round(G.X(s)) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, h - 22); ctx.stroke();
    }
    drawLane(ctx, G, 4, true);
    ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(8, LANE + 4.5); ctx.lineTo(w - 8, LANE + 4.5); ctx.stroke();
    drawLane(ctx, G, LANE + 8, false);
    // 시간 축
    const ay = h - 10;
    for (let k = 0; k <= G.Wt / 1000; k++) {
      const x = G.X(t - k * 1000);
      K.text(ctx, k === 0 ? TR`지금` : '−' + k + TR`초`, x, ay, { size: 10.5, mono: k > 0, color: C.muted, align: k === 0 ? 'right' : 'center' });
    }
    if (blackout && t >= blackout.a && t < blackout.b + 200) K.text(ctx, TR`와이파이 끊김`, G.x1, 12, { size: 11, weight: 700, color: C.badInk, align: 'right' });
    else if (P.speed < 1) K.text(ctx, TR`0.25× 느리게 보는 중`, G.x1, 12, { size: 11, color: C.muted, align: 'right' });
  }

  K.hover(cv, (x, y) => {
    const G = geo();
    if (x < G.x0 - 4 || x > G.x1 + 4) return null;
    const tcp = y < LANE + 6, R = railsOf(tcp ? 4 : LANE + 8), tt = G.T(x);
    let best = null, bd = Infinity;
    const onDel = y > R.y2 + 8;
    for (const p of pk) {
      const ref = onDel ? (tcp ? p.tD : (p.uD != null ? p.uD : p.s + p.d)) : p.s;
      if (ref == null) continue;
      const d = Math.abs(ref - tt);
      if (d < bd) { bd = d; best = p; }
    }
    if (!best || bd > Math.max(P.iv, 60)) return null;
    const p = best;
    if (tcp) {
      if (onDel && p.tD != null) {
        const b = batches.find(q => Math.abs(q.t - p.tD) < 0.01);
        if (b && b.c > 1) return TR`<b>${b.c}개가 한꺼번에 게임에 전달</b><br>#${b.n} ~ #${b.n + b.c - 1}<br>직전 전달 뒤 ${K.ms(b.gap)} 만에`;
      }
      let s = `<b>#${p.n}</b>`;
      if (p.lost) s += TR` · 처음 보낸 것이 사라짐<br>재전송 ${p.tx.length - 1}번` + (p.tx.some(x => x.k === 2) ? TR` (타이머)` : p.tx.length > 1 ? TR` (빠른 재전송)` : '');
      if (p.tA != null) s += TR`<br>내 PC 도착 +${K.ms(p.tA - p.s)}`;
      if (p.tD != null) s += TR`<br>순서 대기 ${K.ms(p.tD - p.tA)}<br>게임 전달 +${K.ms(p.tD - p.s)}`;
      else if (p.tA != null) s += TR`<br>앞 패킷을 기다리는 중`;
      return s;
    }
    if (p.lost) return TR`<b>#${p.n}</b> 사라짐<br>UDP는 다시 보내지 않습니다. 게임은 이 업데이트를 건너뜁니다.`;
    if (p.late) return TR`<b>#${p.n}</b> 늦게 도착<br>더 새로운 업데이트가 먼저 와서 버렸습니다.`;
    if (p.uD != null) return TR`<b>#${p.n}</b> 도착하자마자 전달<br>보냄 → 게임 +${K.ms(p.uD - p.s)}`;
    return TR`<b>#${p.n}</b> 가는 중`;
  });

  /* ---------- 프리셋 ---------- */
  function setAll(o) {
    sRtt.set(o.rtt); sLoss.set(o.loss); sJit.set(o.jit != null ? o.jit : 10);
    cRto.set(o.rto || 200); cIv.set(50); tAuto.set(o.auto !== false);
  }
  K.presets(F, [
    { label: TR`손실 없음`, apply() { setAll({ rtt: 100, loss: 0, auto: false }); } },
    { label: TR`가끔 손실 (2%)`, apply() { setAll({ rtt: 100, loss: 2 }); trigger('one'); } },
    { label: TR`먼 서버 + 손실 (RTT 250, 3%)`, apply() { setAll({ rtt: 250, loss: 3 }); trigger('one'); } },
    { label: TR`와이파이 순간 끊김`, apply() { setAll({ rtt: 60, loss: 0 }); trigger('wifi'); } },
    { label: TR`연속 손실 (백오프)`, apply() { setAll({ rtt: 100, loss: 0 }); trigger('burst'); } },
  ]).buttons[1].setAttribute('aria-pressed', 'true');
  rtoHint();

  /* ---------- 해설 ---------- */
  function stats() {
    const from = t - 10000;
    let maxGap = 0, maxC = 0, sT = 0, nT = 0, sU = 0, nU = 0, uLost = 0, uAll = 0;
    let prev = null;
    for (const b of batches) {
      if (b.t >= from) { maxC = Math.max(maxC, b.c); if (prev != null) maxGap = Math.max(maxGap, b.t - prev); }
      prev = b.t;
    }
    if (prev != null) maxGap = Math.max(maxGap, t - prev);
    for (const p of pk) {
      if (p.s < from || p.s + p.d > t) continue;
      uAll++;
      if (p.lost || p.late) uLost++;
      if (p.tD != null) { sT += p.tD - p.s; nT++; }
      if (p.uD != null) { sU += p.uD - p.s; nU++; }
    }
    return { maxGap, maxC, aT: nT ? sT / nT : 0, aU: nU ? sU / nU : 0, uLost, uAll };
  }

  K.loop(root, dt => {
    step(dt * P.speed);
    draw();
    const S = stats(), base = P.rtt / 2 + P.jit / 2;
    stFreeze.set(K.ms(S.maxGap), S.maxGap <= 2 * P.iv + P.jit + 5 ? 'good' : S.maxGap <= 250 ? 'warn' : 'bad');
    stClump.set(K.n(S.maxC), S.maxC <= 1 ? 'good' : S.maxC <= 4 ? 'warn' : 'bad');
    stULoss.set(K.n(S.uLost), S.uLost === 0 ? 'good' : S.uLost / Math.max(1, S.uAll) < 0.05 ? 'warn' : 'bad', TR`최근 10초 ${S.uAll}개 중`);
    stDT.set(K.ms(S.aT), S.aT < base + 15 ? 'good' : S.aT < base + 80 ? 'warn' : 'bad');
    stDU.set(K.ms(S.aU), S.aU < base + 15 ? 'good' : S.aU < base + 80 ? 'warn' : 'bad');

    const hole = byN(tcpNext);
    const waiting = pk.reduce((a, p) => a + (p.tA != null && p.tD == null ? 1 : 0), 0);
    let lb = null;
    for (let i = batches.length - 1; i >= 0 && t - batches[i].t < 1600; i--) if (batches[i].c >= 3) { lb = batches[i]; break; }
    let msg;
    if (blackout && t >= blackout.a && t < blackout.b) {
      msg = TR`${K.flag('bad')}<b>와이파이가 끊겼습니다.</b> 0.5초 동안은 어떤 패킷도 오지 않으니 TCP와 UDP 모두 캐릭터가 <b>멈춤</b> 상태입니다. 차이는 연결이 돌아온 직후에 나옵니다. TCP는 끊긴 사이 보낸 재전송까지 사라져 타이머가 두 배로 늘어납니다.`;
    } else if (hole && hole.lost && hole.tA == null && t > hole.s + hole.d / 2) {
      const tx = hole.tx[hole.tx.length - 1];
      let why;
      if (!tx.lost && tx.k > 0 && t < tx.s + tx.d) why = TR`재전송 패킷이 오고 있습니다.`;
      else if (hole.bo > 0) why = TR`재전송마저 사라져서 다음 재전송까지 <b>${K.ms(RTO() * Math.pow(2, hole.bo))}</b>를 기다립니다(타이머가 매번 두 배로 늘어나는 백오프).`;
      else if (!hole.fr) why = TR`이 실험의 서버는 교과서 규칙대로 뒤따라 온 패킷 3개가 보내는 중복 ACK(수신 확인)로 빠진 것을 감지하거나, ${K.ms(RTO())} 타이머가 끝나야 다시 보냅니다.`;
      else why = TR`빠른 재전송 패킷이 사라졌습니다. 이제 타이머가 끝날 때까지 기다려야 합니다.`;
      const behind = hole.rtoed
        ? TR`뒤의 패킷 ${waiting}개도 앞 시퀀스 번호가 비어 있어 게임에 전달되지 못합니다(실제 TCP는 타이머 재전송 뒤 새 패킷을 서버에 남겨 두지만, 이 실험은 수신 버퍼에 쌓이게 그렸습니다).`
        : waiting ? TR`뒤에 온 ${waiting}개는 이미 내 PC에 와 있지만, 앞 시퀀스 번호가 비어 있어 수신 버퍼에서 기다립니다.` : TR`뒤따라 오는 패킷도 도착하는 대로 수신 버퍼에서 대기하게 됩니다.`;
      msg = TR`${K.flag('bad')}<b>TCP: #${hole.n}번 패킷이 사라졌습니다.</b> ${behind} ${why} 그동안 게임은 새 위치를 하나도 못 받아 캐릭터가 <b>멈춤</b>입니다. 같은 순간 UDP는 #${hole.n}번만 빼고 계속 전달하고 있습니다.`;
    } else if (lb) {
      // 여러 개를 잃으면 구멍이 차례로 메워지며 여러 번 풀린다. 마지막 묶음 직전 간격이 아니라 이번 사건의 가장 긴 공백을 말한다.
      const gapMax = batches.reduce((a, b) => (b.t >= lb.t - 1600 && b.t <= lb.t ? Math.max(a, b.gap) : a), 0);
      msg = TR`${K.flag('warn')}<b>빠졌던 #${lb.n}번이 다시 도착하자, 기다리던 것까지 ${lb.c}개가 한 번에 게임에 전달됐습니다.</b> 게임은 ${K.ms(gapMax)} 동안 새 패킷이 없다가 밀린 업데이트를 한꺼번에 처리합니다. 플레이어는 캐릭터가 멈췄다가 한꺼번에 앞으로 튀는 <b>몰아치기</b>를 봅니다. UDP 쪽은 그 하나만 빠져서 거의 티가 나지 않거나 작은 <b>순간이동</b>으로 끝납니다.`;
    } else if (P.loss === 0 && !P.auto && !blackout) {
      msg = TR`${K.flag('good')}손실이 없으면 TCP와 UDP는 똑같습니다. 둘 다 ${P.iv}ms마다 고르게 전달합니다. 차이는 패킷이 하나라도 사라지는 순간에 생깁니다. <b>다음 패킷 하나 잃어버리기</b>를 눌러 보세요.`;
    } else {
      const perSec = (1000 / P.iv) * P.loss;
      const EV = { one: TR`패킷 하나 잃어버리기`, wifi: TR`와이파이 순간 끊김`, burst: TR`연속 손실` };
      const why = [];
      if (P.loss > 0) why.push(TR`손실률 ${K.pct(P.loss)}면 ${perSec >= 1 ? TR`1초에 ${K.n(perSec, 1)}개꼴로` : TR`${K.n(1 / perSec, 1)}초에 한 번꼴로`} 패킷이 사라집니다.`);
      if (P.auto) why.push(TR`4초마다 “${EV[lastEvent]}” 사건이 다시 일어납니다.`);
      msg = TR`${K.flag(P.loss >= 0.05 ? 'bad' : 'warn')}지금은 잠잠합니다. ${K.sentences(why)} 패킷이 사라질 때마다 TCP는 핑 한 번 이상 <b>멈춤</b> 뒤 <b>몰아치기</b>를 하고, UDP는 하나를 건너뜁니다. 그래서 액션·FPS 게임은 UDP 위에 “꼭 필요한 것만 다시 보내는” 자체 규칙을 구현해 씁니다.`;
    }
    F.say(msg);
  });
});
