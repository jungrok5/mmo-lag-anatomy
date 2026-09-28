/* TCP 재전송 해부: 어디서 잃었나(근본 원인)와 어떻게 복구되나(빠른 재전송 · TLP · RTO · 가짜 재전송)
   서버 → 클라이언트 한 방향 TCP 연결. 받는 쪽은 도착할 때마다 ACK(누적 + SACK)를 돌려보낸다. */
K.register('retrans', function (root) {
  const F = K.frame(root, {
    kicker: 'TCP 재전송 · 원인과 복구',
    title: '재전송 한 번이 게임에서는 왜 수백 ms 멈춤이 되나',
    lead: '서버가 TCP로 게임 소식을 보냅니다. 오른쪽에서 길 위의 손실 원인을 하나씩 켜 보세요. 타임라인에서 어느 패킷이 어디서 사라졌는지(×와 원인 글자), 어떤 방식으로 다시 보냈는지(빠른 재전송, TLP, RTO), 잃지 않았는데 다시 보낸 가짜 재전송은 없는지 볼 수 있습니다. 아래 막대는 최근 10초 동안의 손실을 원인별로 모은 것입니다.',
    tries: [
      '<b>와이파이 손실 3%</b>를 누르세요. 게임 소식은 100ms마다 작은 패킷 하나라 “중복 ACK 3개”가 모이기 전에 RTO(핑 + 200ms)가 먼저 옵니다. 한 번 잃을 때마다 약 300ms 멈춘 뒤 몰아서 전달됩니다. <b>게임 소식 간격</b>을 30ms로 줄이면 빠른 재전송이 먼저 걸립니다.',
      '같은 상태에서 <b>RACK-TLP</b>를 켜 보세요. 약 “핑의 2배” 만에 탐침(TLP)이 나가 복구가 빨라집니다. <b>선형 타임아웃</b>도 켜면 연속 손실 때 기다림이 두 배씩 늘지 않습니다.',
      '<b>MTU 블랙홀</b>을 누르세요. 2초마다 오는 큰 업데이트만 계속 사라지고, 같은 패킷을 몇 번이고 다시 보냅니다. <b>MTU 탐색</b>을 켜면 패킷을 작게 나눠 통과합니다.',
      '<b>순서 뒤바뀜 (대용량)</b>을 누르고 RACK-TLP를 끄세요. 잃지도 않은 패킷을 다시 보내는 <b>가짜 재전송</b>이 생기고 전송량(혼잡 창)이 괜히 줄어듭니다.',
      '<b>지연 급등</b>을 누르세요. 4초마다 0.5초씩 늦어지는 순간 RTO가 먼저 터져 가짜 재전송이 납니다. 원본도 결국 도착했으니 손실 원인 막대에는 아무것도 없습니다.',
    ],
  });
  K.addStyle('retrans', `
    .rt-bars { display: grid; gap: 5px; }
    .rt-bar { display: grid; grid-template-columns: 116px minmax(0, 1fr) 48px; gap: 8px; align-items: center; font-size: 12.5px; color: var(--ink-2); }
    .rt-bar .tr { height: 10px; background: var(--sunk); border-radius: 0 3px 3px 0; position: relative; }
    .rt-bar .tr i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 0 3px 3px 0; background: var(--s2); }
    .rt-bar b { font-family: var(--font-mono); font-weight: 600; color: var(--ink); text-align: right; }
  `);

  const P = {
    mode: 'game', rtt: 60, gap: 100,
    wifi: 0, cong: false, cable: false, mtu: false, reorder: 0, spike: false, ackLoss: 0,
    rack: false, thin: false, mtuProbe: false, rtoMin: 200,
  };
  const CAUSE = { W: '와이파이', C: '혼잡 대기열', L: '불량 케이블', M: 'MTU 블랙홀', A: 'ACK 손실' };
  const PATH_MTU = 1360, MSS = 1460, SMALL = 120;
  const rnd = K.rng(91);

  /* ---------------- 상태 ---------------- */
  let t, S, R, net, acks, lossLog, deliv, cwndLog, C;
  function reset() {
    t = 0;
    S = { next: 0, segs: new Map(), una: 0, srtt: null, rttvar: 0, rto: 1000, backoff: 1, rtoAt: Infinity, tlpAt: Infinity, tlpOut: false,
      cwnd: 10, ssthresh: 1e9, dup: 0, lastCum: 0, frDone: -1, nextGame: 0, nextBig: 1000, mssNow: MSS, bhStrikes: 0, retries: 0, lastArr: 0, lastAck: 0 };
    R = { expected: 0, buf: new Set(), got: new Set() };
    net = []; acks = []; lossLog = []; deliv = []; cwndLog = [];
    C = { out: 0, retr: 0, fast: 0, rto: 0, tlp: 0, spurious: 0 };
  }

  /* ---------------- 회선 ---------------- */
  const inCong = x => P.cong && (x % 3000) < 350;
  const inSpike = x => P.spike && (x % 4000) >= 2000 && (x % 4000) < 2500;
  function oneWay(x) { return P.rtt / 2 + rnd() * 3 + (inSpike(x) ? 450 : 0); }
  function lossCause(seg, size, x) {
    if (P.mtu && size > PATH_MTU) return 'M';
    if (P.wifi && rnd() * 100 < P.wifi) return 'W';
    if (P.cable && rnd() < 0.01) return 'L';
    if (inCong(x) && rnd() < 0.35) return 'C';
    return null;
  }

  /* ---------------- 보내는 쪽 ---------------- */
  const outstanding = () => { let n = 0; for (let i = S.una; i < S.next; i++) { const s = S.segs.get(i); if (s && !s.acked) n++; } return n; };
  function newSeg(size) {
    const s = { id: S.next++, size, first: t, tx: [], acked: false, sacked: false, delivered: null };
    S.segs.set(s.id, s);
    transmit(s, 'new');
  }
  function transmit(s, kind) {
    const size = Math.min(s.size, S.mssNow);
    const cause = lossCause(s, size, t);
    if (cause === 'M' && kind !== 'new') { S.bhStrikes++; if (P.mtuProbe && S.bhStrikes >= 2) S.mssNow = 1300; }
    // 같은 길을 가는 패킷은 순서를 지킨다. “순서 뒤바뀜”에 걸린 패킷만 뒤에 온 것보다 늦게 도착한다.
    let arr = null;
    if (!cause) {
      const late = P.reorder && rnd() * 100 < P.reorder;
      arr = t + oneWay(t) + (late ? 12 + rnd() * 10 : 0);
      if (!late) { arr = Math.max(arr, S.lastArr + 0.2); S.lastArr = arr; }
    }
    const tx = { at: t, kind, size, lost: cause, arr, spurious: false };
    s.tx.push(tx);
    C.out++;
    if (kind !== 'new') C.retr++;
    if (cause) lossLog.push([t, cause]);
    else net.push({ at: tx.arr, id: s.id, tx });
    if (S.rtoAt === Infinity) S.rtoAt = t + S.rto * S.backoff;
    if (P.rack && !S.tlpOut && S.srtt != null) S.tlpAt = t + Math.max(2 * S.srtt, 10);
  }
  function onAck(a) {
    // DSACK: 받는 쪽이 이미 받은 것을 또 받았다고 알림 → 방금 재전송은 가짜였다
    if (a.dsack != null) {
      const s = S.segs.get(a.dsack);
      if (s) { const last = [...s.tx].reverse().find(x => x.kind === 'rto' || x.kind === 'fast'); if (last && !last.spurious) { last.spurious = true; C.spurious++; } }
    }
    let advanced = false;
    if (a.cum > S.una) {
      for (let i = S.una; i < a.cum; i++) {
        const s = S.segs.get(i);
        if (!s || s.acked) continue;
        s.acked = true;
        if (s.tx.length === 1) { // 재전송 안 한 것만 왕복 시간 표본으로 (Karn 규칙)
          const sample = t - s.tx[0].at;
          if (S.srtt == null) { S.srtt = sample; S.rttvar = sample / 2; }
          else { S.rttvar = 0.75 * S.rttvar + 0.25 * Math.abs(S.srtt - sample); S.srtt = 0.875 * S.srtt + 0.125 * sample; }
          S.rto = S.srtt + Math.max(P.rtoMin, 4 * S.rttvar);
        }
        if (P.mode === 'bulk') { if (S.cwnd < S.ssthresh) S.cwnd += 1; else S.cwnd += 1 / S.cwnd; S.cwnd = Math.min(S.cwnd, 64); }
      }
      S.una = a.cum; advanced = true; S.backoff = 1; S.dup = 0; S.retries = 0;
      S.tlpOut = false;
    } else if (a.cum === S.una && outstanding() > 0) S.dup++;
    a.sack.forEach(id => { const s = S.segs.get(id); if (s) s.sacked = true; });
    // 손실 판단
    if (P.rack) {
      // RACK: 나중에 보낸 패킷이 도착했는데, 이 패킷은 그보다 (왕복 시간 + 여유)만큼 먼저 보냈으면 잃은 것
      let newestDel = -1;
      for (const id of a.sack) { const s = S.segs.get(id); if (s) newestDel = Math.max(newestDel, s.tx[s.tx.length - 1].at); }
      const reo = (S.srtt || P.rtt) / 4;
      for (let i = S.una; i < S.next; i++) {
        const s = S.segs.get(i);
        if (!s || s.acked || s.sacked) continue;
        const last = s.tx[s.tx.length - 1];
        if (last.at < newestDel && t - last.at > (S.srtt || P.rtt) + reo && !last.rackDone) { last.rackDone = true; transmit(s, 'fast'); C.fast++; reduce(); }
      }
    } else if (S.dup >= 3 && S.frDone !== S.una) {
      const s = S.segs.get(S.una);
      if (s && !s.acked) { S.frDone = S.una; transmit(s, 'fast'); C.fast++; reduce(); }
    }
    if (outstanding() === 0) { S.rtoAt = Infinity; S.tlpAt = Infinity; }
    else if (advanced) S.rtoAt = t + S.rto * S.backoff;
  }
  function reduce() { if (P.mode === 'bulk') { S.ssthresh = Math.max(2, S.cwnd * 0.7); S.cwnd = S.ssthresh; } }
  function senderStep() {
    if (P.mode === 'game') {
      if (t >= S.nextGame) { newSeg(SMALL); S.nextGame += P.gap; }
      if (t >= S.nextBig) { // 2초마다 큰 업데이트 4KB (MSS 단위로 쪼개짐)
        for (let left = 4000; left > 0; left -= S.mssNow) newSeg(Math.min(left, S.mssNow));
        S.nextBig += 2000;
      }
    } else if (outstanding() < Math.floor(S.cwnd)) newSeg(MSS);
    // TLP: 한동안 ACK가 없으면 맨 끝 패킷을 한 번 더 보내 받는 쪽의 SACK을 끌어낸다
    if (P.rack && t >= S.tlpAt && !S.tlpOut && outstanding() > 0) {
      let last = null;
      for (let i = S.next - 1; i >= S.una; i--) { const s = S.segs.get(i); if (s && !s.acked) { last = s; break; } }
      if (last) { S.tlpOut = true; S.tlpAt = Infinity; transmit(last, 'tlp'); C.tlp++; }
    }
    // RTO: 기다려도 확인이 안 오면 가장 오래된 것부터 다시 보낸다
    if (t >= S.rtoAt && outstanding() > 0) {
      C.rto++;
      const thinNow = P.thin && outstanding() < 4 && S.retries < 6;
      // 가장 오래된 것 하나를 다시 보낸다. 나머지는 이후 ACK·SACK을 보고 판단한다.
      for (let i = S.una; i < S.next; i++) {
        const s = S.segs.get(i);
        if (s && !s.acked && !s.sacked) { transmit(s, 'rto'); break; }
      }
      S.retries++;
      if (!thinNow) S.backoff = Math.min(64, S.backoff * 2);
      S.rtoAt = t + S.rto * S.backoff;
      if (P.mode === 'bulk') { S.ssthresh = Math.max(2, S.cwnd / 2); S.cwnd = 1; }
    }
  }

  /* ---------------- 받는 쪽 ---------------- */
  function recvData(p) {
    const s = S.segs.get(p.id);
    let dsack = null;
    if (R.got.has(p.id)) dsack = p.id; // 이미 받은 것 = 상대가 괜히 다시 보냄
    else {
      R.got.add(p.id);
      if (p.id >= R.expected) R.buf.add(p.id);
      while (R.buf.has(R.expected)) {
        R.buf.delete(R.expected);
        const d = S.segs.get(R.expected);
        if (d && d.delivered == null) { d.delivered = t; if (P.mode === 'game' || d.id % 10 === 0) deliv.push([t, t - d.first, P.mode === 'game' && d.size > SMALL]); }
        R.expected++;
      }
    }
    const sack = [...R.buf].sort((a, b) => a - b); // 실제 SACK은 구간 몇 개로 이 전체를 알린다
    if (!(P.ackLoss && rnd() * 100 < P.ackLoss)) {
      // 업로드가 꽉 차면 ACK도 공유기 줄에 서서 늦게 간다
      let at = t + oneWay(t) + (P.ackLoss ? rnd() * P.ackLoss * 12 : 0);
      at = Math.max(at, S.lastAck + 0.2); S.lastAck = at;
      acks.push({ at, cum: R.expected, sack, dsack });
    }
    else lossLog.push([t, 'A']);
    if (s) s.lastArr = t;
  }

  function step1() {
    t += 1;
    senderStep();
    if (net.length) { const keep = []; for (const p of net) { if (p.at <= t) recvData(p); else keep.push(p); } net = keep; }
    if (acks.length) { const keep = []; for (const a of acks) { if (a.at <= t) onAck(a); else keep.push(a); } acks = keep; }
    if ((t & 63) === 0) {
      cwndLog.push([t, S.cwnd]);
      const cut = t - 12000;
      while (lossLog.length && lossLog[0][0] < cut) lossLog.shift();
      while (deliv.length && deliv[0][0] < cut) deliv.shift();
      while (cwndLog.length && cwndLog[0][0] < cut) cwndLog.shift();
      for (const [id, s] of S.segs) { if (s.acked && s.first < t - 5000) S.segs.delete(id); else break; }
    }
  }

  /* ---------------- 화면 ---------------- */
  const cvT = K.canvas(F.stage, { height: w => (w < 520 ? 176 : 190), caption: '서버 → 내 PC (최근 3초, 오른쪽 끝이 지금)', right: '<span class="legend"><span><i style="background:var(--ink-2)"></i>처음 보냄</span><span><i style="background:var(--s2)"></i>재전송</span><span><i style="background:var(--warn)"></i>가짜 재전송</span><span>× 사라짐</span></span>' });
  const barsWrap = K.el('div');
  F.stage.append(K.el('div', { class: 'cv-cap' }, K.el('b', { text: '어디서 잃었나 (최근 10초)' }), K.el('span', { text: '근본 원인별 손실 수' })), barsWrap);
  const cvD = K.canvas(F.stage, { height: 128, caption: '게임에 전달되기까지 걸린 시간 (최근 10초)', right: '<span class="legend"><span><i style="background:var(--s1)"></i>작은 소식</span><span><i class="dot" style="background:var(--s3)"></i>큰 업데이트</span></span>' });
  const cwWrap = K.el('div', { hidden: true });
  F.stage.append(cwWrap);
  const cvW = K.canvas(cwWrap, { height: 110, caption: '혼잡 창 (한 번에 보낼 수 있는 패킷 수)', right: '재전송마다 줄어듦' });

  const g0 = K.group(F.controls, '트래픽');
  const cMode = K.choice(g0, { value: P.mode, options: [['game', '게임 (작은 소식이 드문드문)'], ['bulk', '대용량 (패치 다운로드)']], onChange: v => { P.mode = v; cwWrap.hidden = v !== 'bulk'; reset(); warm(); } });
  const sRtt = K.slider(g0, { label: '핑', min: 10, max: 300, step: 10, value: P.rtt, unit: 'ms', onInput: v => { P.rtt = v; } });
  K.slider(g0, { label: '게임 소식 간격', min: 20, max: 300, step: 10, value: P.gap, unit: 'ms', onInput: v => { P.gap = v; }, hint: '소식이 드문드문일수록 “중복 ACK 3개”가 늦게 모여 RTO에 기대게 됩니다(얇은 흐름).' });
  const g1 = K.group(F.controls, '길 위의 손실 원인');
  const sWifi = K.slider(g1, { label: '와이파이 손실', min: 0, max: 10, step: 0.5, value: P.wifi, unit: '%', onInput: v => { P.wifi = v; pr.clear(); } });
  const tCong = K.toggle(g1, { label: '혼잡 대기열 넘침 (3초마다 0.35초)', value: P.cong, onChange: v => { P.cong = v; pr.clear(); } });
  const tCable = K.toggle(g1, { label: '불량 케이블·광모듈 (1%)', value: P.cable, onChange: v => { P.cable = v; pr.clear(); } });
  const tMtu = K.toggle(g1, { label: 'MTU 블랙홀 (1,360바이트 넘으면 사라짐)', value: P.mtu, onChange: v => { P.mtu = v; pr.clear(); } });
  const sReo = K.slider(g1, { label: '순서 뒤바뀜', min: 0, max: 30, step: 1, value: P.reorder, unit: '%', onInput: v => { P.reorder = v; pr.clear(); }, hint: '여러 경로·링크 묶음에서 일부 패킷이 10~20ms 늦게 도착' });
  const tSpike = K.toggle(g1, { label: '지연 급등 (4초마다 0.5초)', value: P.spike, onChange: v => { P.spike = v; pr.clear(); }, hint: '와이파이 절전, 모바일 무선 전환, 가상 머신 일시 정지 등' });
  const sAck = K.slider(g1, { label: 'ACK 지연·손실 (업로드 포화)', min: 0, max: 30, step: 1, value: P.ackLoss, unit: '%', onInput: v => { P.ackLoss = v; pr.clear(); } });
  const g2 = K.group(F.controls, '복구 설정 (보내는 쪽 OS)');
  const tRack = K.toggle(g2, { label: 'RACK-TLP (시간 기준 손실 판단 + 꼬리 탐침)', value: P.rack, onChange: v => { P.rack = v; pr.clear(); }, hint: '최신 리눅스는 기본으로 켜져 있습니다. 끄면 “중복 ACK 3개” 방식만 씁니다.' });
  const tThin = K.toggle(g2, { label: '얇은 흐름 선형 타임아웃', value: P.thin, onChange: v => { P.thin = v; pr.clear(); }, hint: 'tcp_thin_linear_timeouts. 패킷이 적게 오가는 연결은 RTO를 두 배씩 늘리지 않습니다.' });
  const tProbe = K.toggle(g2, { label: 'MTU 탐색 (tcp_mtu_probing)', value: P.mtuProbe, onChange: v => { P.mtuProbe = v; pr.clear(); } });
  const cRto = K.choice(g2, { label: 'RTO 최소값', value: P.rtoMin, options: [[200, '200ms (기본)'], [50, '50ms (내부망용)']], onChange: v => { P.rtoMin = +v; pr.clear(); } });

  const stRate = K.stat(F.stats, { label: '재전송률' });
  const stFast = K.stat(F.stats, { label: '빠른 재전송', unit: '회' });
  const stRto = K.stat(F.stats, { label: 'RTO 타임아웃', unit: '회' });
  const stTlp = K.stat(F.stats, { label: 'TLP 탐침', unit: '회' });
  const stSp = K.stat(F.stats, { label: '가짜 재전송', unit: '회' });
  const stP99 = K.stat(F.stats, { label: '전달 지연 (99%)' });
  const stWait = K.stat(F.stats, { label: '지금 줄 선 소식' });
  const stRtoV = K.stat(F.stats, { label: '지금 RTO' });

  const pr = K.presets(F, [
    { label: '깨끗한 회선', apply: () => set({}) },
    { label: '와이파이 손실 3%', apply: () => set({ wifi: 3 }) },
    { label: '저녁 혼잡', apply: () => set({ cong: true }) },
    { label: 'MTU 블랙홀', apply: () => set({ mtu: true }) },
    { label: '순서 뒤바뀜 (대용량)', apply: () => set({ mode: 'bulk', reorder: 12 }) },
    { label: '지연 급등', apply: () => set({ spike: true }) },
    { label: '업로드 포화 (ACK 지연·손실)', apply: () => set({ ackLoss: 15 }) },
    { label: '대책 모두 켜기', apply: () => set({ wifi: 3, cong: true, mtu: true, rack: true, thin: true, mtuProbe: true }) },
  ], '상황');
  function set(o) {
    Object.assign(P, { mode: 'game', wifi: 0, cong: false, cable: false, mtu: false, reorder: 0, spike: false, ackLoss: 0, rack: false, thin: false, mtuProbe: false, rtoMin: 200 }, o);
    cMode.set(P.mode, false); sWifi.set(P.wifi, false); tCong.set(P.cong, false); tCable.set(P.cable, false); tMtu.set(P.mtu, false);
    sReo.set(P.reorder, false); tSpike.set(P.spike, false); sAck.set(P.ackLoss, false); tRack.set(P.rack, false); tThin.set(P.thin, false);
    tProbe.set(P.mtuProbe, false); cRto.set(P.rtoMin, false);
    cwWrap.hidden = P.mode !== 'bulk';
    reset(); warm();
  }

  function drawTimeline() {
    const { ctx, w, h } = cvT;
    const Cc = K.C;
    ctx.clearRect(0, 0, w, h);
    const L = w < 520 ? 46 : 60, R = w - 10, span = 3000, t0 = t - span;
    const X = x => L + ((x - t0) / span) * (R - L);
    const yS = 24, yR = h - 30;
    if (P.cong) for (let k = Math.floor(t0 / 3000) * 3000; k < t; k += 3000) { const a = Math.max(X(k), L), b = Math.min(X(k + 350), R); if (b > a) { ctx.fillStyle = K.alpha(Cc.bad, 0.1); ctx.fillRect(a, 6, b - a, h - 30); } }
    if (P.spike) for (let k = Math.floor(t0 / 4000) * 4000 + 2000; k < t; k += 4000) { const a = Math.max(X(k), L), b = Math.min(X(k + 500), R); if (b > a) { ctx.fillStyle = K.alpha(Cc.warn, 0.14); ctx.fillRect(a, 6, b - a, h - 30); } }
    ctx.strokeStyle = Cc.line; ctx.lineWidth = 1;
    [yS, yR].forEach(y => { ctx.beginPath(); ctx.moveTo(L, y + 0.5); ctx.lineTo(R, y + 0.5); ctx.stroke(); });
    K.text(ctx, '서버', L - 8, yS, { align: 'right', size: 11, weight: 600, color: Cc.ink2 });
    K.text(ctx, '내 PC', L - 8, yR, { align: 'right', size: 11, weight: 600, color: Cc.ink2 });
    for (let s = 0; s <= 3; s++) K.text(ctx, s === 3 ? '지금' : `-${3 - s}초`, X(t0 + s * 1000), h - 8, { align: s === 3 ? 'right' : 'center', size: 10, mono: s !== 3, color: Cc.muted });
    ctx.save(); ctx.beginPath(); ctx.rect(L, 0, R - L, h); ctx.clip();
    const TAG = { fast: '빠른', rto: 'RTO', tlp: 'TLP' };
    for (const s of S.segs.values()) {
      if (s.first < t0 - 3000) continue;
      const big = s.size > SMALL;
      s.tx.forEach(tx => {
        if (tx.at > t) return;
        const x1 = X(tx.at);
        const col = tx.kind === 'new' ? Cc.ink2 : tx.spurious ? Cc.warn : Cc.s2;
        ctx.strokeStyle = col; ctx.lineWidth = big ? 2.4 : 1.3;
        if (tx.kind !== 'new') ctx.setLineDash([4, 3]);
        if (tx.lost) {
          const mid = yS + (yR - yS) * 0.45, x2 = X(Math.min(tx.at + P.rtt / 4, t));
          ctx.beginPath(); ctx.moveTo(x1, yS); ctx.lineTo(x2, yS + (mid - yS) * Math.min(1, (t - tx.at) / (P.rtt / 4))); ctx.stroke();
          ctx.setLineDash([]);
          if (t >= tx.at + P.rtt / 4) {
            ctx.strokeStyle = Cc.bad; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x2 - 4, mid - 4); ctx.lineTo(x2 + 4, mid + 4); ctx.moveTo(x2 + 4, mid - 4); ctx.lineTo(x2 - 4, mid + 4); ctx.stroke();
            if (w > 440) K.text(ctx, tx.lost === 'W' ? 'W' : tx.lost, x2 + 6, mid, { size: 10, weight: 700, color: Cc.badInk });
          }
        } else {
          const arr = tx.arr, frac = arr > t ? (t - tx.at) / (arr - tx.at) : 1;
          ctx.beginPath(); ctx.moveTo(x1, yS); ctx.lineTo(X(Math.min(arr, t)), yS + (yR - yS) * frac); ctx.stroke();
          ctx.setLineDash([]);
          if (arr <= t && s.delivered != null && s.delivered - arr > 3 && tx === s.tx.find(q => !q.lost)) {
            ctx.fillStyle = Cc.warn; K.rr(ctx, X(arr), yR + 3, Math.max(1, X(s.delivered) - X(arr)), 4, 2); ctx.fill();
          }
        }
        if (tx.kind !== 'new' && w > 440) K.text(ctx, tx.spurious ? '가짜' : TAG[tx.kind], x1 + 2, yS - 9, { size: 9.5, weight: 700, color: tx.spurious ? Cc.warnInk : Cc.ink });
      });
    }
    ctx.restore();
  }
  function drawDelay() {
    const { ctx, w, h } = cvD;
    const Cc = K.C;
    ctx.clearRect(0, 0, w, h);
    const box = { x: 44, y: 10, w: w - 54, h: h - 28 };
    const vals = deliv.map(d => d[1]);
    const yMax = Math.max(300, Math.min(3000, Math.ceil((Math.max(0, ...vals) + 50) / 250) * 250));
    const ticks = []; for (let v = 0; v <= yMax; v += yMax > 1000 ? 1000 : 100) ticks.push(v);
    const sc = K.plot(ctx, box, { x0: t - 10000, x1: t, y0: 0, y1: yMax, yTicks: ticks, yFmt: v => (v >= 1000 ? v / 1000 + 's' : v + '') });
    K.hline(ctx, sc, P.rtt / 2, { color: Cc.ink2, dash: [3, 3], label: '잃지 않으면 (핑의 절반)' });
    K.line(ctx, sc, deliv.filter(d => !d[2]).map(d => [d[0], d[1]]), Cc.s1, 1.6);
    deliv.filter(d => d[2]).forEach(d => K.dot(ctx, sc.x(d[0]), sc.y(Math.min(d[1], yMax)), 3, Cc.s3));
  }
  function drawCwnd() {
    if (P.mode !== 'bulk') return;
    const { ctx, w, h } = cvW;
    const Cc = K.C;
    ctx.clearRect(0, 0, w, h);
    const box = { x: 44, y: 10, w: w - 54, h: h - 28 };
    const mx = Math.max(20, ...cwndLog.map(c => c[1]));
    const sc = K.plot(ctx, box, { x0: t - 10000, x1: t, y0: 0, y1: mx, yTicks: [0, Math.round(mx / 2), Math.round(mx)] });
    K.area(ctx, sc, cwndLog, Cc.s4, 0.12);
    K.line(ctx, sc, cwndLog, Cc.s4, 2);
  }
  function drawBars() {
    const cnt = { W: 0, C: 0, L: 0, M: 0, A: 0 };
    lossLog.forEach(([tt, c]) => { if (tt > t - 10000) cnt[c]++; });
    const mx = Math.max(1, ...Object.values(cnt));
    barsWrap.className = 'rt-bars';
    barsWrap.innerHTML = Object.keys(CAUSE).map(k => `<div class="rt-bar"><span>${k} · ${CAUSE[k]}</span><span class="tr"><i style="width:${(cnt[k] / mx) * 100}%"></i></span><b>${cnt[k]}</b></div>`).join('');
    return cnt;
  }
  function narrate(cnt) {
    const rate = C.out ? C.retr / C.out : 0;
    const d = deliv.map(x => x[1]).sort((a, b) => a - b);
    const p99 = d.length ? d[Math.min(d.length - 1, Math.floor(d.length * 0.99))] : 0;
    stRate.set(K.pct(rate, 1), rate > 0.03 ? 'bad' : rate > 0.005 ? 'warn' : 'good', `보낸 ${K.n(C.out)}개 중 ${K.n(C.retr)}개`);
    stFast.set(String(C.fast)); stRto.set(String(C.rto), C.rto > 3 ? 'bad' : C.rto ? 'warn' : 'good'); stTlp.set(String(C.tlp)); stSp.set(String(C.spurious), C.spurious ? 'warn' : 'good');
    stP99.set(K.ms(p99), p99 > 250 ? 'bad' : p99 > 120 ? 'warn' : 'good', `평소 ${K.ms(P.rtt / 2)}`);
    const head = S.segs.get(R.expected);
    const waitMs = head && head.first < t ? t - head.first : 0;
    stWait.set(waitMs > P.rtt ? K.ms(waitMs) : '없음', waitMs > 1000 ? 'bad' : waitMs > 200 ? 'warn' : 'good', waitMs > P.rtt ? '맨 앞 하나를 기다리느라 뒤도 전부 대기' : '순서대로 바로 전달');
    stRtoV.set(K.ms(S.rto * S.backoff), S.backoff > 1 ? 'warn' : null, S.backoff > 1 ? `두 배씩 늘어난 상태 (×${S.backoff})` : '왕복 시간 + max(최소값, 흔들림×4)');
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    const rtoWait = K.ms(P.rtt + P.rtoMin);
    let msg;
    if (top[1] === 0 && C.spurious === 0) msg = `${K.flag('good')}사라지는 패킷이 없습니다. 모든 소식이 약 ${K.ms(P.rtt / 2)} 만에 도착해 바로 게임에 전달됩니다.`;
    else if (top[1] === 0 && C.spurious > 0) msg = `${K.flag('warn')}<b>가짜 재전송</b> ${C.spurious}회. 잃어버린 패킷은 없는데 ${P.spike ? '지연이 순간적으로 RTO보다 길어져' : P.reorder ? '순서가 뒤바뀌어 중복 ACK가 쌓여' : '확인이 늦게 와서'} 보내는 쪽이 잃었다고 착각했습니다. 회선 낭비와 함께 전송량(혼잡 창)이 괜히 줄어듭니다. 손실 원인 막대가 비어 있는데 재전송률이 높다면 이 경우입니다.`;
    else {
      const name = CAUSE[top[0]];
      msg = `${K.flag(rate > 0.03 || p99 > 250 ? 'bad' : 'warn')}최근 10초 손실의 주범은 <b>${name}</b>(${top[1]}개)입니다. `;
      if (top[0] === 'M') msg += `1,360바이트를 넘는 큰 업데이트만 계속 사라지고 같은 패킷을 반복해서 다시 보냅니다. ${P.mtuProbe ? 'MTU 탐색이 켜져 있어 두 번 실패한 뒤부터는 작게 나눠 통과합니다.' : 'TCP는 순서를 지켜야 하므로 뒤따르는 작은 소식까지 전부 줄을 서고, RTO는 두 배씩 늘어나 결국 <b>멈춤</b> 끝에 <b>접속 끊김</b>이 됩니다. 평소에는 멀쩡하다가 “큰 창을 열거나 사람 많은 곳에 가면 멈춘다”는 제보로 옵니다. MSS 조정이나 MTU 탐색이 해결책입니다.'}`;
      else if (top[0] === 'A') msg += `게임 소식 자체는 제때 도착합니다. ACK는 뒤에 오는 ACK가 앞의 것을 대신 확인해 주므로 몇 개 사라져도 대개 괜찮습니다. 문제는 업로드가 꽉 차서 ACK가 줄을 서 늦게 가는 것입니다. 보내는 쪽이 느끼는 왕복 시간이 늘어 RTO가 커지고, ACK가 한꺼번에 늦으면 잃지 않은 것을 다시 보내며(가짜 재전송) 대용량 전송은 속도가 떨어집니다.`;
      else if (P.mode === 'game' && !P.rack) {
        const dupWait = 3 * P.gap + P.rtt / 2, rtoW = P.rtt + P.rtoMin;
        msg += dupWait > rtoW
          ? `게임 소식이 ${P.gap}ms마다 하나라 중복 ACK 3개가 모이려면 약 ${K.ms(dupWait)}이 걸리고, 그 전에 RTO(약 ${K.ms(rtoW)})가 먼저 옵니다. 한 번 잃을 때마다 그만큼 <b>멈춤</b>, 뒤 소식은 줄을 섰다 <b>몰아치기</b>입니다. RACK-TLP를 켜면 핑의 1~2배 만에 복구가 시작됩니다.`
          : `소식 간격(${P.gap}ms)이 짧아 중복 ACK 3개가 약 ${K.ms(dupWait)} 만에 모여 빠른 재전송으로 복구합니다. 그래도 한 번 잃을 때마다 그만큼 <b>멈춤</b> 뒤 <b>몰아치기</b>입니다. 소식 간격을 100ms 이상으로 늘리면 RTO에 기대게 됩니다.`;
      }
      else if (P.mode === 'game') msg += `RACK-TLP가 켜져 있어 약 ${K.ms(2 * P.rtt)} 만에 탐침이 나가 복구합니다. 그래도 한 번 잃을 때마다 핑의 두세 배는 멈춥니다. 손실 자체를 줄이는 것이 먼저입니다.`;
      else msg += `대용량 전송은 뒤따르는 패킷이 많아 빠른 재전송으로 대부분 복구되지만, 잃을 때마다 혼잡 창이 30% 줄어 속도가 떨어집니다.`;
      if (P.rack && (top[0] === 'W' || top[0] === 'C' || top[0] === 'L')) msg += ' 복구 설정은 멈춤을 줄여 줄 뿐, 사라지는 패킷 자체를 줄이지는 못합니다. 손실이 생기는 자리를 고치는 것이 근본 해결입니다.';
      if (C.spurious) msg += ` 가짜 재전송도 ${C.spurious}회 있습니다.`;
    }
    F.say(msg);
  }

  function warm() { for (let i = 0; i < 4000; i++) step1(); }
  reset(); warm();
  let acc = 0, carry = 0;
  K.loop(root, dt => {
    carry += dt; const n = Math.floor(carry); carry -= n;
    for (let i = 0; i < n; i++) step1();
    drawTimeline(); drawDelay(); drawCwnd();
    acc += dt;
    if (acc > 300) { acc = 0; narrate(drawBars()); }
  });
  pr.press(1); // 첫 화면은 손실이 보이는 상태로 연다
  narrate(drawBars());
});
