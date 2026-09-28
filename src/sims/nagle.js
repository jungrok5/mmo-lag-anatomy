/* Nagle + 지연 ACK. “작은 조각은 ACK 가 올 때까지 모았다 보낸다”(Nagle, 보내는 쪽)와
   “ACK 는 답장에 얹으려고 잠깐 미룬다”(지연 ACK, 받는 쪽)가 서로를 기다리며 메시지마다 수십~수백 ms 를 버린다.
   위에서 아래로 시간이 흐르는 순서도로 보여 준다. */
K.register('nagle', function (root) {
  const F = K.frame(root, {
    kicker: '소켓과 프로토콜 · 소켓 옵션',
    title: '작은 패킷을 모았다 보내려다 40~200ms를 버린다',
    lead: 'TCP에는 “작은 패킷은 모았다가 한 번에 보내자”는 <b>Nagle 규칙</b>과, “ACK(수신 확인)는 조금 미뤘다가 응답에 실어 보내자”는 <b>지연 ACK</b>가 기본으로 켜져 있습니다. 둘 다 패킷 수를 아끼려는 규칙입니다. 그런데 게임 메시지를 헤더와 본문으로 나눠 쓰면, 두 규칙이 서로를 기다리느라 메시지마다 수십~수백 ms를 그냥 버립니다.',
    tries: [
      '처음 화면(리눅스 기본값 + 나눠 쓰기)에서 오른쪽 막대를 보세요. 핑은 20ms인데 응답은 80ms 넘게 걸립니다.',
      '<b>지연 ACK</b>를 200ms(윈도우)로 바꿔 보세요. 메시지마다 200ms 넘게 늦어집니다. 받는 쪽이 윈도우일 때 생기는 입력 지연입니다. 서버가 Nagle을 켠 채 보내고 윈도우 PC가 받는 반대 방향에서도 똑같이 생깁니다.',
      '<b>TCP_NODELAY</b>를 켜 보세요. 헤더와 본문이 바로 연달아 나가고 노란 기다림이 사라집니다.',
      '<b>메시지 쓰는 방식</b>을 “한 번에 쓰기”로 바꿔도 풀립니다. 대기할 작은 패킷이 생기지 않기 때문입니다.',
      '“작은 이동 명령 연속”에서 NODELAY를 껐다 켜며 <b>초당 패킷 수</b>와 응답 시간을 비교하세요. Nagle이 무엇을 아끼고 무엇을 버리는지 보입니다.',
    ],
    layout: 'stack',
  });
  K.addStyle('nagle', '.ng-row{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:16px;align-items:start}@media (max-width:720px){.ng-row{grid-template-columns:minmax(0,1fr)}}');

  const P = { pat: 'split', nodelay: false, delack: 40, rtt: 20, speed: 0.1 };
  const MSS = 1460, PROC = 1, WIN = 600;
  const PAT = {
    split: { every: 250, parts: [[8, '헤더'], [40, '본문']], hint: '8바이트 헤더를 먼저 쓰고, 40바이트 본문을 따로 씁니다. 250ms마다 행동 하나.' },
    one: { every: 250, parts: [[48, '메시지']], hint: '헤더와 본문을 합친 48바이트를 한 번에 씁니다. 250ms마다 행동 하나.' },
    small: { every: 16, parts: [[30, '이동']], hint: '30바이트 이동 명령을 16ms마다 씁니다(초당 약 60개).' },
  };

  /* ---------- 무대 ---------- */
  const row = K.el('div', { class: 'ng-row' });
  const colA = K.el('div'), colB = K.el('div');
  row.append(colA, colB); F.stage.append(row);
  const seq = K.canvas(colA, {
    height: w => K.clamp(Math.round(w * 0.9), 380, 540),
    caption: '클라이언트 ↔ 서버 (시간은 아래로)',
    right: '<span class="legend"><span><i style="background:var(--s1)"></i>데이터</span><span><i style="background:var(--s2)"></i>응답</span><span><i style="background:var(--s3)"></i>ACK</span><span><i class="box" style="background:var(--warn)"></i>기다림</span></span>',
  });
  const bars = K.canvas(colB, {
    height: w => (colA.offsetTop === colB.offsetTop && seq.h ? seq.h : K.clamp(Math.round(w * 0.6), 200, 260)),
    caption: '메시지별 응답 시간',
    right: '<span class="legend"><span><i class="box" style="background:var(--s1)"></i>왕복</span><span><i class="box" style="background:var(--warn)"></i>기다림</span></span>',
  });
  seq.onResize(() => bars.fit());

  /* ---------- 조작부 ---------- */
  const g1 = K.group(F.controls, '게임 코드');
  const cPat = K.choice(g1, {
    label: '메시지 쓰는 방식', value: P.pat, hint: PAT[P.pat].hint,
    options: [['one', '한 번에 쓰기'], ['split', '헤더·본문 나눠 쓰기'], ['small', '작은 메시지 연속']],
    onChange: v => { P.pat = v; patHint(); rerun(); },
  });
  const patHintEl = cPat.el.querySelector('.ctl-hint');
  function patHint() { patHintEl.textContent = PAT[P.pat].hint; }
  const tNd = K.toggle(g1, { label: 'TCP_NODELAY (Nagle 끄기)', value: P.nodelay, hint: '켜면 작은 패킷도 기다리지 않고 바로 보냅니다.', onChange: v => { P.nodelay = v; rerun(); } });
  const g2 = K.group(F.controls, '운영체제와 회선');
  const cAck = K.choice(g2, {
    label: '서버의 지연 ACK', value: P.delack,
    options: [[0, '끔'], [40, '40ms 리눅스'], [200, '200ms 윈도우']],
    onChange: v => { P.delack = +v; rerun(); },
    hint: '보낼 응답이 없으면 ACK를 이만큼 미뤘다가 따로 보냅니다.',
  });
  const sRtt = K.slider(g2, { label: '핑(RTT, 왕복 시간)', min: 2, max: 200, step: 2, value: P.rtt, unit: 'ms', hint: '20ms ≈ 국내 서버', onInput: v => { P.rtt = v; rerun(); } });
  const g3 = K.group(F.controls, '보기');
  K.choice(g3, { label: '재생 속도', value: P.speed, options: [[0.1, '1/10 느리게'], [0.25, '1/4'], [0, '멈춤']], onChange: v => { P.speed = +v; }, hint: '실제로는 이 모든 일이 1초도 안 걸립니다.' });

  const stAvg = K.stat(F.stats, { label: '평균 응답', sub: '최근 메시지 20개' });
  const stMax = K.stat(F.stats, { label: '최대 응답', sub: '최근 20개' });
  const stPps = K.stat(F.stats, { label: '초당 패킷 수', unit: '개', sub: '양방향 합계' });
  const stWaste = K.stat(F.stats, { label: '낭비된 대기', unit: '%', sub: '응답 시간 중 기다린 몫' });

  /* ---------- 모형 ---------- */
  let t, ev, pkts, holds, msgs, sendBuf, sndNxt, sndUna, hold, srv, nextWrite, msgNo, byteEnd;
  function reset() {
    t = 0; ev = []; pkts = []; holds = []; msgs = []; sendBuf = [];
    sndNxt = 0; sndUna = 0; hold = null; nextWrite = 0; msgNo = 0; byteEnd = 0;
    srv = { rcv: 0, mi: 0, ack: null, gen: 0 };
  }
  const owd = () => P.rtt / 2;

  function write(tt) {
    const pat = PAT[P.pat];
    const size = pat.parts.reduce((a, p) => a + p[0], 0);
    byteEnd += size;
    const m = { id: ++msgNo, w: tt, end: byteEnd, resp: null, rtt: P.rtt };
    msgs.push(m);
    for (const [b, lab] of pat.parts) { sendBuf.push({ b, lab, w: tt }); flush(tt); }
  }
  function labelOf(parts, bytes) {
    const same = parts.every(p => p === parts[0]);
    const name = parts.length === 1 ? parts[0] : same ? parts[0] + '×' + parts.length : parts.length <= 3 ? parts.join('+') : parts[0] + ' 외 ' + (parts.length - 1) + '개';
    return name + ' ' + bytes + 'B';
  }
  // 보내는 쪽(클라이언트) TCP: Nagle 규칙
  function flush(tt) {
    while (sendBuf.length) {
      const pend = sendBuf.reduce((a, c) => a + c.b, 0);
      if (!P.nodelay && sndNxt > sndUna && pend < MSS) {
        if (!hold) { hold = { side: 'c', a: sendBuf[0].w, b: null }; holds.push(hold); }
        return;
      }
      let bytes = 0; const parts = [];
      while (sendBuf.length && bytes + sendBuf[0].b <= MSS) { const c = sendBuf.shift(); bytes += c.b; parts.push(c.lab); }
      if (hold) { hold.b = tt; hold = null; }
      sndNxt += bytes;
      const pk = { dir: 1, s: tt, a: tt + owd(), lab: labelOf(parts, bytes), kind: 'data', end: sndNxt };
      pkts.push(pk); ev.push({ t: pk.a, k: 'srv', p: pk });
    }
  }
  // 받는 쪽(서버) TCP: 지연 ACK
  function srvRecv(pk, tt) {
    srv.rcv = pk.end;
    const done = [];
    while (srv.mi < msgs.length && msgs[srv.mi].end <= srv.rcv) done.push(msgs[srv.mi++]);
    if (done.length) ev.push({ t: tt + PROC, k: 'resp', m: done });
    else if (!srv.ack) {
      if (P.delack === 0) sendBack(tt, 'ack');
      else {
        srv.ack = { gen: ++srv.gen, hold: { side: 's', a: tt, b: null } };
        holds.push(srv.ack.hold);
        ev.push({ t: tt + P.delack, k: 'dack', x: srv.gen });
      }
    }
  }
  function sendBack(tt, kind, done) {
    if (srv.ack) { srv.ack.hold.b = tt; srv.ack = null; }
    const pk = { dir: -1, s: tt, a: tt + owd(), kind, ackTo: srv.rcv, m: done || null, lab: kind === 'ack' ? 'ACK' : done.length > 1 ? '응답×' + done.length : '응답' };
    pkts.push(pk); ev.push({ t: pk.a, k: 'cli', p: pk });
  }
  function cliRecv(pk, tt) {
    sndUna = Math.max(sndUna, pk.ackTo);
    if (pk.m) pk.m.forEach(m => { m.resp = tt; });
    flush(tt);
  }

  function step(dt) {
    const end = t + dt;
    for (let guard = 0; guard < 6000; guard++) {
      let bi = -1, bt = nextWrite;
      for (let i = 0; i < ev.length; i++) if (ev[i].t < bt || (ev[i].t === bt && bi < 0)) { bt = ev[i].t; bi = i; }
      if (bt > end) break;
      t = bt;
      if (bi < 0) { write(t); nextWrite += PAT[P.pat].every; continue; }
      const e = ev.splice(bi, 1)[0];
      if (e.k === 'srv') srvRecv(e.p, t);
      else if (e.k === 'resp') sendBack(t, 'resp', e.m);
      else if (e.k === 'dack') { if (srv.ack && srv.ack.gen === e.x) sendBack(t, 'ack'); }
      else if (e.k === 'cli') cliRecv(e.p, t);
    }
    t = end;
    while (pkts.length && pkts[0].a < t - 2000) pkts.shift();
    while (holds.length && holds[0].b != null && holds[0].b < t - 2000) holds.shift();
    while (msgs.length > 40 && msgs[0].resp != null && srv.mi > 0) { msgs.shift(); srv.mi--; }
  }
  function rerun() { reset(); step(6000); }
  rerun();

  /* ---------- 순서도 ---------- */
  function halo(ctx, str, x, y, o) {
    ctx.font = K.font(o.size || 11, o.weight || 500, o.mono);
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = K.C.paper; ctx.strokeText(str, x, y);
    ctx.fillStyle = o.color || K.C.ink2; ctx.fillText(str, x, y);
  }
  function seqGeo() {
    const w = seq.w, h = seq.h, narrow = w < 440;
    const top = 40, bot = h - 20, cx = narrow ? 70 : Math.round(K.clamp(w * 0.22, 96, 140)), sx = w - cx;
    return { w, h, narrow, top, bot, cx, sx, Y: tt => top + ((tt - (t - WIN)) / WIN) * (bot - top), T: y => t - WIN + ((y - top) / (bot - top)) * WIN };
  }
  const colOf = k => (k === 'data' ? K.C.s1 : k === 'resp' ? K.C.s2 : K.C.s3);

  function drawSeq() {
    const { ctx } = seq, C = K.C, G = seqGeo();
    ctx.clearRect(0, 0, G.w, G.h);
    K.text(ctx, '클라이언트', G.cx, 14, { size: 12.5, weight: 700, color: C.ink, align: 'center' });
    K.text(ctx, '서버', G.sx, 14, { size: 12.5, weight: 700, color: C.ink, align: 'center' });
    K.text(ctx, P.nodelay ? 'NODELAY 켬' : 'Nagle 켜짐', G.cx, 29, { size: 10.5, color: C.muted, align: 'center' });
    K.text(ctx, P.delack ? '지연 ACK ' + P.delack + 'ms' : '지연 ACK 끔', G.sx, 29, { size: 10.5, color: C.muted, align: 'center' });
    ctx.save();
    ctx.beginPath(); ctx.rect(0, G.top - 2, G.w, G.bot - G.top + 4); ctx.clip();
    // 100ms 격자
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (let s = Math.ceil((t - WIN) / 100) * 100; s <= t; s += 100) {
      const y = Math.round(G.Y(s)) + 0.5;
      ctx.beginPath(); ctx.moveTo(G.cx, y); ctx.lineTo(G.sx, y); ctx.stroke();
    }
    // 생명선
    ctx.strokeStyle = C.line; ctx.lineWidth = 2;
    [G.cx, G.sx].forEach(x => { ctx.beginPath(); ctx.moveTo(x, G.top - 2); ctx.lineTo(x, G.bot + 2); ctx.stroke(); });

    // 기다림 막대
    const left = [], right = [];
    const free = (list, y, hgt) => list.every(([a, b]) => y + hgt / 2 < a || y - hgt / 2 > b);
    for (const hd of holds) {
      const a = hd.a, b = hd.b != null ? hd.b : t;
      if (b - a < 2 || b < t - WIN) continue;
      const c = hd.side === 'c', x = c ? G.cx - 10 : G.sx + 10;
      const ya = G.Y(a), yb = G.Y(b);
      ctx.fillStyle = K.alpha(C.warn, 0.35); ctx.fillRect(x - 4, ya, 8, yb - ya);
      ctx.fillStyle = C.warn; ctx.fillRect(x - 1.5, ya, 3, yb - ya);
      ctx.fillRect(x - 5, ya - 1, 10, 2); if (hd.b != null) ctx.fillRect(x - 5, yb - 1, 10, 2);
      if (yb - ya < 12) continue;
      const my = (ya + yb) / 2, name = c ? 'Nagle 대기' : (G.narrow ? '지연ACK' : '지연 ACK 대기'), val = K.ms(b - a);
      const lx = c ? x - 9 : x + 9, al = c ? 'right' : 'left', list = c ? left : right;
      if (yb - ya >= 20) {
        if (!free(list, my, 28)) continue;
        halo(ctx, G.narrow && c ? 'Nagle' : name, lx, my - 7, { size: G.narrow ? 10.5 : 11, weight: 600, color: C.warnInk, align: al });
        halo(ctx, val, lx, my + 7, { size: 11, weight: 600, mono: true, color: C.warnInk, align: al });
        list.push([my - 14, my + 14]);
      } else {
        if (!free(list, my, 14)) continue;
        halo(ctx, (c ? 'Nagle ' : '지연ACK ') + val, lx, my, { size: 11, weight: 600, color: C.warnInk, align: al });
        list.push([my - 7, my + 7]);
      }
    }
    // 메시지 쓰기 표시와 응답 시간
    for (const m of msgs) {
      if (m.w >= t - WIN && m.w <= t) {
        const y = G.Y(m.w);
        ctx.fillStyle = C.paper; ctx.strokeStyle = C.ink2; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(G.cx, y, 3.5, 0, 7); ctx.fill(); ctx.stroke();
      }
      if (m.resp != null && m.resp >= t - WIN && m.resp <= t) {
        const y = G.Y(m.resp);
        K.dot(ctx, G.cx, y, 3.5, C.s2, C.paper);
        if (P.pat === 'small' || !free(left, y, 14)) continue;
        halo(ctx, (G.narrow ? '' : '응답 ') + K.ms(m.resp - m.w), G.cx - 9, y, { size: 11, weight: 600, color: C.ink, align: 'right' });
        left.push([y - 7, y + 7]);
      }
    }
    // 패킷 화살표
    const labs = { 1: [], '-1': [] };
    let prev = null;
    for (let i = 0; i < pkts.length; i++) {
      const pk = pkts[i];
      if (pk.s > t || pk.a < t - WIN - 5) continue;
      const x0 = pk.dir > 0 ? G.cx : G.sx, x1 = pk.dir > 0 ? G.sx : G.cx;
      const f = K.clamp((t - pk.s) / Math.max(0.01, pk.a - pk.s), 0, 1);
      const ya = G.Y(pk.s), yb = G.Y(pk.a), xe = x0 + (x1 - x0) * f, ye = ya + (yb - ya) * f;
      const col = colOf(pk.kind);
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, ya); ctx.lineTo(xe, ye); ctx.stroke();
      const ang = Math.atan2(yb - ya, x1 - x0);
      ctx.fillStyle = col; ctx.beginPath();
      ctx.moveTo(xe, ye); ctx.lineTo(xe - 8 * Math.cos(ang - 0.4), ye - 8 * Math.sin(ang - 0.4)); ctx.lineTo(xe - 8 * Math.cos(ang + 0.4), ye - 8 * Math.sin(ang + 0.4));
      ctx.closePath(); ctx.fill();
      // 같은 순간 연달아 나간 패킷은 이름을 합친다
      let lab = pk.lab;
      if (prev && prev.dir === pk.dir && pk.s - prev.s < 2) { prev = pk; continue; }
      const next = pkts[i + 1];
      if (next && next.dir === pk.dir && next.s - pk.s < 2) lab = pk.lab.split(' ')[0] + ', ' + next.lab.split(' ')[0] + ' (패킷 2개)';
      prev = pk;
      // 이름은 화살표가 떠나는 쪽 가까이에 둔다 (보낸 쪽마다 따로 겹침 검사)
      ctx.font = K.font(11, 500);
      const tw = ctx.measureText(lab).width, span = Math.abs(x1 - x0);
      const fr = (14 + tw / 2) / span, ly = ya + (yb - ya) * fr - 8;
      if (f < fr + 0.1 || !free(labs[pk.dir], ly, 13)) continue;
      labs[pk.dir].push([ly - 6.5, ly + 6.5]);
      halo(ctx, lab, x0 + pk.dir * 14, ly, { size: 11, weight: 500, color: C.ink2, align: pk.dir > 0 ? 'left' : 'right' });
    }
    ctx.restore();
    // 지금
    ctx.strokeStyle = C.muted; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(G.cx - 16, G.bot + 0.5); ctx.lineTo(G.sx + 16, G.bot + 0.5); ctx.stroke(); ctx.setLineDash([]);
    K.text(ctx, P.speed === 0 ? '지금 (멈춤)' : '지금', (G.cx + G.sx) / 2, G.bot + 10, { size: 10.5, weight: P.speed === 0 ? 700 : 400, color: P.speed === 0 ? C.ink2 : C.muted, align: 'center' });
  }

  K.hover(seq, (x, y) => {
    const G = seqGeo(), tt = G.T(y);
    for (const hd of holds) {
      const b = hd.b != null ? hd.b : t, hx = hd.side === 'c' ? G.cx - 10 : G.sx + 10;
      if (Math.abs(x - hx) < 12 && tt >= hd.a - 3 && tt <= b + 3 && b - hd.a >= 2) {
        return hd.side === 'c' ? `<b>Nagle 대기 ${K.ms(b - hd.a)}</b><br>앞서 보낸 데이터의 ACK가 오기 전이라 작은 패킷을 보내지 않고 모아 둡니다.`
          : `<b>지연 ACK 대기 ${K.ms(b - hd.a)}</b><br>응답에 실어 보내려고 ACK를 미룹니다. 메시지가 반쪽이라 응답이 생기지 않습니다.`;
      }
    }
    let best = null, bd = 16;
    for (const pk of pkts) {
      if (pk.s > t) continue;
      const x0 = pk.dir > 0 ? G.cx : G.sx, x1 = pk.dir > 0 ? G.sx : G.cx;
      if ((x - x0) * (x - x1) > 0) continue;
      const f = (x - x0) / (x1 - x0), yy = G.Y(pk.s) + (G.Y(pk.a) - G.Y(pk.s)) * f;
      if (Math.abs(yy - y) < bd) { bd = Math.abs(yy - y); best = pk; }
    }
    if (!best) return null;
    const who = best.dir > 0 ? '클라이언트 → 서버' : '서버 → 클라이언트';
    const what = best.kind === 'ack' ? 'ACK(수신 확인)만 담은 빈 패킷' : best.kind === 'resp' ? '서버의 응답 (ACK도 함께 실림)' : '게임 메시지 데이터';
    return `<b>${best.lab}</b><br>${who}<br>${what}<br>가는 데 ${K.ms(best.a - best.s)}`;
  });

  /* ---------- 응답 시간 막대 ---------- */
  function topRound(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h); ctx.closePath();
  }
  const done20 = () => msgs.filter(m => m.resp != null).slice(-20);
  function barGeo() { const w = bars.w, h = bars.h; return { box: { x: 46, y: 28, w: w - 58, h: h - 62 } }; }
  function niceAxis(v) {
    for (const s of [20, 25, 50, 100, 200, 250, 500, 1000]) if (v / s <= 5) return { s, max: Math.ceil(v / s) * s };
    return { s: 2000, max: Math.ceil(v / 2000) * 2000 };
  }

  function drawBars() {
    const { ctx, w, h } = bars, C = K.C, list = done20(), { box } = barGeo();
    ctx.clearRect(0, 0, w, h);
    const top = Math.max(P.rtt + PROC, ...list.map(m => m.resp - m.w));
    const ax = niceAxis(Math.max(100, top * 1.12)), yTicks = [];
    for (let v = 0; v <= ax.max; v += ax.s) yTicks.push(v);
    const sc = K.plot(ctx, box, {
      x0: 0, x1: 20, y0: 0, y1: ax.max, yTicks, yFmt: v => K.n(v),
      yTitle: '응답 시간 (ms)', xTitle: '최근 메시지 →',
    });
    const slot = box.w / 20, bw = Math.max(3, slot * 0.64), off = 20 - list.length;
    list.forEach((m, i) => {
      const tot = m.resp - m.w, base = Math.min(tot, m.rtt + PROC), x = box.x + slot * (i + off) + (slot - bw) / 2;
      const yb = sc.y(0), yBase = sc.y(base), yTot = sc.y(tot);
      ctx.fillStyle = C.s1;
      if (tot - base < 0.5) { topRound(ctx, x, yBase, bw, yb - yBase, 4); ctx.fill(); }
      else {
        ctx.fillRect(x, yBase, bw, yb - yBase);
        ctx.fillStyle = C.warn; topRound(ctx, x, yTot, bw, yBase - yTot, 4); ctx.fill();
      }
    });
    K.hline(ctx, sc, P.rtt + PROC, { color: C.ink2, dash: [4, 3] });
    halo(ctx, '최소(핑+처리) ' + K.ms(P.rtt + PROC), box.x + 4, sc.y(P.rtt + PROC) - 9, { size: 10.5, weight: 600, color: C.ink, align: 'left' });
  }
  K.hover(bars, x => {
    const { box } = barGeo(), list = done20(), slot = box.w / 20;
    const i = Math.floor((x - box.x) / slot) - (20 - list.length);
    const m = list[i];
    if (!m) return null;
    const tot = m.resp - m.w, wait = Math.max(0, tot - m.rtt - PROC);
    return `메시지 #${m.id}<br>응답 <b>${K.ms(tot)}</b><br>왕복 ${K.ms(m.rtt)} + 처리 ${PROC}ms<br>기다림 <b>${K.ms(wait)}</b>`;
  });

  /* ---------- 프리셋 ---------- */
  function setAll(pat, nd, ack, rtt) {
    cPat.set(pat, false); tNd.set(nd, false); cAck.set(ack, false); sRtt.set(rtt, false);
    Object.assign(P, { pat, nodelay: nd, delack: ack, rtt }); patHint(); rerun();
  }
  K.presets(F, [
    { label: '기본값 + 나눠 쓰기 (리눅스)', apply() { setAll('split', false, 40, 20); } },
    { label: '기본값 + 나눠 쓰기 (윈도우 서버)', apply() { setAll('split', false, 200, 20); } },
    { label: 'TCP_NODELAY 켬', apply() { setAll('split', true, 40, 20); } },
    { label: '한 번에 쓰기', apply() { setAll('one', false, 40, 20); } },
    { label: '작은 이동 명령 연속', apply() { setAll('small', false, 40, 60); } },
  ]).buttons[0].setAttribute('aria-pressed', 'true');

  /* ---------- 해설 ---------- */
  K.loop(root, dt => {
    step(dt * P.speed);
    drawSeq();
    drawBars();
    const list = done20();
    const tots = list.map(m => m.resp - m.w);
    const avg = tots.length ? tots.reduce((a, b) => a + b, 0) / tots.length : 0;
    const mx = tots.length ? Math.max(...tots) : 0;
    const waste = list.reduce((a, m) => a + Math.max(0, m.resp - m.w - m.rtt - PROC), 0);
    const wr = tots.length ? waste / Math.max(1, tots.reduce((a, b) => a + b, 0)) : 0;
    const avgWaste = list.length ? waste / list.length : 0;
    const pps = pkts.filter(p => p.s > t - 1000 && p.s <= t).length;
    const ideal = P.rtt + PROC;
    const st = v => (v <= ideal * 1.2 + 3 ? 'good' : v <= ideal * 1.5 + 30 ? 'warn' : 'bad');
    stAvg.set(K.ms(avg), st(avg));
    stMax.set(K.ms(mx), st(mx));
    stPps.set(K.n(pps), null);
    stWaste.set(K.n(wr * 100), wr < 0.1 ? 'good' : wr < 0.4 ? 'warn' : 'bad');

    let msg;
    const tail = '플레이어는 핑 수치는 낮은데 모든 행동이 일정하게 굼뜬 <b>입력 지연</b>을 느낍니다.';
    if (P.pat === 'small') {
      msg = P.nodelay
        ? `${K.flag('good')}<b>명령을 쓰는 즉시 보냅니다.</b> 패킷은 초당 ${pps}개로 늘지만 기다림이 없어 응답은 핑(${K.ms(P.rtt)})만큼만 걸립니다. 작은 패킷이 많아지는 비용은 보통 게임 코드에서 한 틱 동안의 메시지를 묶어 한 번에 쓰는 식으로 줄입니다.`
        : `${K.flag(wr < 0.1 ? 'good' : 'warn')}<b>Nagle이 작은 이동 명령을 모아서 보냅니다.</b> 앞 명령의 ACK(여기서는 응답)가 돌아오기 전에 쓴 명령은 모였다가 한 패킷으로 나갑니다. 패킷 수는 초당 ${pps}개로 줄어 대역폭은 아끼지만, 명령마다 평균 ${K.ms(avgWaste)}(최대 핑 한 번)가 더해집니다. Nagle은 원격 터미널이 글자 하나마다 패킷을 보내 회선이 막히던 문제를 줄이려고 만든 규칙이라, 게임에서는 아끼는 것보다 잃는 것이 더 큽니다.`;
    } else if (P.nodelay) {
      msg = `${K.flag('good')}<b>TCP_NODELAY를 켜서 Nagle 규칙을 껐습니다.</b> ${P.pat === 'split' ? '헤더와 본문이 곧바로 연달아 나가고, ' : ''}서버는 메시지를 다 받자마자 응답에 ACK를 실어 보냅니다. 응답은 핑 ${K.ms(P.rtt)} + 처리 1ms 그대로입니다. Nagle은 패킷 수(대역폭)를 아끼는 대신 지연을 쓰는 규칙이라, 게임 서버와 클라이언트는 거의 항상 TCP_NODELAY를 켭니다.`;
    } else if (P.pat === 'one') {
      msg = `${K.flag(wr < 0.1 ? 'good' : 'warn')}<b>메시지를 한 번에 쓰면 Nagle에 걸릴 작은 패킷이 생기지 않습니다.</b> 새 메시지를 쓸 때 앞 메시지의 응답(ACK 포함)이 이미 돌아와 있기 때문입니다. 다만 핑이 길거나 메시지를 자주 보내 응답보다 다음 메시지가 먼저 나오면 다시 Nagle에 걸립니다. 그래서 게임은 보통 TCP_NODELAY도 함께 켭니다.`;
    } else if (P.delack === 0) {
      msg = `${K.flag('warn')}<b>지연 ACK를 끄면 서버가 헤더를 받자마자 ACK를 보냅니다.</b> 그래도 본문은 그 ACK가 돌아올 때까지 한 번 왕복(${K.ms(P.rtt)}) 동안 대기해서 메시지마다 약 +${K.ms(avgWaste)}입니다. 핑이 멀수록 손해가 커집니다. 지연 ACK는 상대 운영체제가 정하는 값이라 우리가 확실히 고칠 수 있는 쪽은 TCP_NODELAY입니다.`;
    } else {
      msg = `${K.flag('bad')}<b>헤더(8바이트)는 바로 나갔지만 본문(40바이트)은 대기 중입니다.</b> Nagle 규칙은 “ACK를 못 받은 데이터가 있으면 작은 패킷은 ACK가 올 때까지 모아 둔다”입니다. 서버는 헤더만으로는 메시지를 처리할 수 없어 응답이 없고, 그래서 ACK를 ${P.delack}ms 미룹니다(지연 ACK). 서로 기다리는 사이 메시지마다 약 <b>${K.ms(avgWaste)}</b>를 버립니다. 핑은 ${K.ms(P.rtt)}인데 응답은 ${K.ms(avg)}입니다. ${tail}`;
    }
    F.say(msg);
  });
});
