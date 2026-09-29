/* TCP 재전송 해부: 어디서 잃었나(근본 원인)와 어떻게 복구되나(빠른 재전송 · TLP · RTO · 불필요한 재전송)
   서버 → 클라이언트 한 방향 TCP 연결. 받는 쪽은 도착할 때마다 ACK(누적 + SACK)를 돌려보낸다. */
K.register('retrans', function (root) {
  const F = K.frame(root, {
    kicker: 'TCP 재전송 · 원인과 복구',
    title: '재전송 한 번이 게임에서는 왜 수백 ms 멈춤이 되나',
    lead: '서버가 TCP로 게임 패킷을 보냅니다. 오른쪽에서 경로상의 손실 원인을 하나씩 켜 보세요. 타임라인에서 어느 패킷이 어디서 사라졌는지(×와 원인 글자), 어떤 방식으로 다시 보냈는지(빠른 재전송, TLP, RTO), 잃지 않았는데 다시 보낸 불필요한 재전송은 없는지 볼 수 있습니다. 아래 막대는 최근 10초 동안의 손실을 원인별로 모은 것입니다. 복구 설정은 비교를 위해 옛 방식(RACK-TLP 꺼짐)에서 시작합니다. 최신 리눅스는 RACK-TLP가 기본으로 켜져 있습니다.',
    tries: [
      '<b>와이파이 손실 3%</b>를 누르세요. 게임 패킷은 100ms마다 작은 패킷 하나라 “중복 ACK 3개”가 모이기 전에 RTO(핑 + 200ms)가 먼저 옵니다. 한 번 잃을 때마다 약 300ms 멈춘 뒤 몰아서 전달됩니다. <b>게임 패킷 간격</b>을 30ms로 줄이면 빠른 재전송이 먼저 걸립니다.',
      '같은 상태에서 <b>RACK-TLP</b>를 켜 보세요. 다음 패킷이 도착했다는 SACK(선택적 수신 확인)이 오는 즉시, 약 “패킷 간격 + 핑” 만에 손실을 감지하고 다시 보냅니다. 뒤따르는 패킷이 없을 때는 끝 패킷을 한 번 더 보내는 TLP가 대신합니다. <b>선형 타임아웃</b>도 켜면 연속 손실 때 기다림이 두 배씩 늘지 않습니다.',
      '<b>MTU 블랙홀</b>을 누르세요. 2초마다 오는 큰 업데이트만 계속 사라지고, 같은 패킷을 몇 번이고 다시 보냅니다. <b>MTU 탐색</b>을 켜면 몇 초 멈춘 뒤에야 패킷을 작게 나눠 통과합니다. <b>MSS 조정</b>을 켜면 처음부터 사라지지 않습니다.',
      '<b>순서 뒤바뀜 (대용량)</b>을 누르세요. RACK-TLP가 꺼진 상태라 잃지도 않은 패킷을 다시 보내는 <b>불필요한 재전송</b>이 생기고 전송량(혼잡 윈도우)이 괜히 줄어듭니다. RACK-TLP를 켜면 불필요한 재전송이 줄어듭니다.',
      '<b>지연 급등</b>을 누르세요. 4초마다 0.5초씩 늦어지는 순간 RTO가 먼저 만료되어 불필요한 재전송이 납니다. 원본도 결국 도착했으니 손실 원인 막대에는 아무것도 없습니다. 화면의 멈춤은 지연 급등 자체에서 오고, 불필요한 재전송은 주로 재전송 지표를 올립니다.',
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
    rack: false, thin: false, mtuProbe: false, mss: false, rtoMin: 200,
  };
  const CAUSE = { W: '와이파이', C: '혼잡 대기열', L: '불량 케이블', M: 'MTU 블랙홀', A: 'ACK 손실' };
  const PATH_MTU = 1360, MSS = 1460, MSS_CLAMP = 1300, SMALL = 120;
  const rnd = K.rng(91);

  /* ---------------- 상태 ---------------- */
  let t, S, R, net, acks, lossLog, deliv, cwndLog, C, rateHist;
  function reset() {
    t = 0;
    S = { next: 0, segs: new Map(), una: 0, srtt: null, rttvar: 0, rto: 1000, backoff: 1, rtoAt: Infinity, tlpAt: Infinity, tlpOut: false,
      cwnd: 10, ssthresh: 1e9, dup: 0, lastCum: 0, frDone: -1, nextGame: 0, nextBig: 1000, mssNow: P.mss ? MSS_CLAMP : MSS, bhStrikes: 0, retries: 0, lastArr: 0, lastAck: 0,
      recover: 0, lossHigh: 0, lossAt: -1, rtxStamp: null, undo: null, minRtt: Infinity, reoSteps: 1, reoBumpAt: -1e9, q: [], credit: 0 };
    R = { expected: 0, buf: new Set(), got: new Set(), tsRecent: 0 };
    net = []; acks = []; lossLog = []; deliv = []; cwndLog = []; rateHist = [];
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
  const RTO_MAX = 120000; // 리눅스 TCP_RTO_MAX: 두 배씩 늘어도 120초에서 멈춘다
  const rtoNow = () => Math.min(S.rto * S.backoff, RTO_MAX);
  const inRecovery = () => S.una < S.recover;
  function newSeg(size, made, big) {
    const s = { id: S.next++, size, big: big == null ? size > SMALL : big, first: made == null ? t : made, tx: [], acked: false, sacked: false, delivered: null };
    S.segs.set(s.id, s);
    transmit(s, 'new');
  }
  function transmit(s, kind) {
    // tcp_mtu_probing=1: 재전송 타임아웃이 약 3초(tcp_retries1=3) 이어진 뒤에야 블랙홀로 보고 MSS를 1,024바이트(tcp_base_mss)로 낮춘다
    if (P.mtuProbe && kind === 'rto' && t - s.first >= 3000) S.mssNow = Math.min(S.mssNow, 1024);
    const size = Math.min(s.size, S.mssNow);
    const cause = lossCause(s, size, t);
    if (cause === 'M' && kind !== 'new') S.bhStrikes++;
    // 같은 길을 가는 패킷은 순서를 지킨다. “순서 뒤바뀜”에 걸린 패킷만 뒤에 온 것보다 늦게 도착한다.
    let arr = null;
    if (!cause) {
      const late = P.reorder && rnd() * 100 < P.reorder;
      // 혼잡 구간에서 살아남은 패킷은 꽉 찬 대기열 끝에서 50ms 더 기다린다(tail drop은 줄이 가득 찼을 때만 일어난다)
      arr = t + oneWay(t) + (inCong(t) ? 50 : 0) + (late ? 12 + rnd() * 10 : 0);
      if (!late) { arr = Math.max(arr, S.lastArr + 0.2); S.lastArr = arr; }
    }
    const tx = { at: t, kind, size, lost: cause, arr, spurious: false };
    s.tx.push(tx);
    C.out++;
    if (kind !== 'new') { C.retr++; if (S.rtxStamp == null) S.rtxStamp = t; if (inRecovery()) S.credit--; }
    if (cause) lossLog.push([t, cause]);
    else net.push({ at: tx.arr, id: s.id, tx });
    if (S.rtoAt === Infinity) S.rtoAt = t + rtoNow();
    // 맨 앞(가장 오래된) 패킷을 빠른 재전송하면 RTO 타이머를 지금부터 다시 건다(리눅스 tcp_xmit_retransmit_queue).
    // 그러지 않으면 방금 다시 보낸 것의 확인이 오기 전에 RTO가 같은 패킷을 또 보낸다.
    // 같은 패킷을 거듭 잃어도(MTU 블랙홀) 복구 중에는 새 패킷이 묶여(아래 credit) 뒤따르는 SACK이 끊기므로 결국 RTO가 터진다.
    if (kind === 'fast' && s.id === S.una) S.rtoAt = t + rtoNow();
    if (kind === 'new') armTlp();
  }
  function armTlp() {
    // TLP 대기(PTO) = 왕복 시간의 2배. 아직 ACK를 받지 못한 패킷이 하나뿐이면 지연 ACK를 감안해 RTO 최소값만큼 더 기다리고,
    // RTO보다 늦게 잡지는 않는다(RFC 8985, 리눅스 tcp_schedule_loss_probe). 복구 중에는 걸지 않는다.
    if (!P.rack || S.tlpOut || S.srtt == null || S.una < S.recover) return;
    S.tlpAt = Math.min(t + 2 * S.srtt + (outstanding() === 1 ? P.rtoMin : 2), S.rtoAt);
  }
  function onAck(a) {
    // DSACK: 받는 쪽이 이미 받은 것을 또 받았다고 알림 → 방금 재전송은 가짜였다
    if (a.dsack != null) {
      const s = S.segs.get(a.dsack);
      // 탐침(TLP)이 원본과 겹쳐 도착하는 것은 예상된 일이라 불필요한 재전송으로 세지 않는다
      const last = s && [...s.tx].reverse().find(x => x.kind !== 'new');
      if (last && last.kind !== 'tlp' && !last.spurious) { last.spurious = true; C.spurious++; }
      // RACK은 DSACK을 보면 순서 뒤바뀜 여유 시간을 한 단계 늘린다(한 왕복에 한 번, 리눅스 reo_wnd_steps)
      if (t - S.reoBumpAt > (S.srtt || P.rtt)) { S.reoSteps = Math.min(S.reoSteps + 1, 8); S.reoBumpAt = t; }
    }
    const inLoss = S.una < S.lossHigh, rtxStamp = S.rtxStamp, wasRec = inRecovery();
    let advanced = false, sample = null, rtxAcked = false, sackSample = null, newly = 0;
    if (a.cum > S.una) {
      for (let i = S.una; i < a.cum; i++) {
        const s = S.segs.get(i);
        if (!s || s.acked) continue;
        s.acked = true;
        if (!s.sacked) newly++;
        // 왕복 시간 표본: 재전송한 것은 어느 쪽의 확인인지 몰라 빼고(Karn 규칙),
        // 이미 SACK으로 확인된 것은 구멍이 메워지기를 기다린 시간이 섞여 뺀다
        if (s.tx.length > 1) rtxAcked = true;
        else if (!s.sacked && sample == null) sample = t - s.tx[0].at;
        if (P.mode === 'bulk') { if (S.cwnd < S.ssthresh) S.cwnd += 1; else S.cwnd += 1 / S.cwnd; S.cwnd = Math.min(S.cwnd, 64); }
      }
      S.una = a.cum; advanced = true; S.backoff = 1; S.dup = 0; S.retries = 0; S.rtxStamp = null;
      S.tlpOut = false;
    } else if (a.cum === S.una && outstanding() > 0) S.dup++;
    a.sack.forEach(id => { const s = S.segs.get(id); if (s && !s.sacked) { s.sacked = true; newly++; if (s.tx.length === 1 && sackSample == null) sackSample = t - s.tx[0].at; } });
    // 복구 중에는 혼잡 윈도우가 “아직 ACK를 받지 못한 패킷 + 방금 도착이 확인된 만큼”으로 묶인다(리눅스 PRR). RTO 뒤(슬로 스타트)는 그 두 배.
    // 다시 보낸 것이 이 한도를 먼저 쓰므로, thin stream은 복구가 끝날 때까지 새 패킷이 보내는 쪽에 쌓인다.
    if (wasRec) S.credit += newly * (inLoss ? 2 : 1);
    const rtt = rtxAcked || sample == null ? sackSample : sample;
    if (rtt != null) {
      S.minRtt = Math.min(S.minRtt, rtt);
      if (S.srtt == null) { S.srtt = rtt; S.rttvar = rtt / 2; }
      else { S.rttvar = 0.75 * S.rttvar + 0.25 * Math.abs(S.srtt - rtt); S.srtt = 0.875 * S.srtt + 0.125 * rtt; }
      S.rto = S.srtt + Math.max(P.rtoMin, 4 * S.rttvar);
    }
    // RTO 뒤 첫 확인이 “원본이 늦게 온 것”이면(타임스탬프로 구별) RTO가 가짜였다: 복구를 멈추고 줄인 혼잡 윈도우를 되돌린다(Eifel·F-RTO)
    if (inLoss && advanced && rtxStamp != null && a.ts < rtxStamp) {
      S.lossHigh = S.una; S.recover = S.una;
      if (P.mode === 'bulk' && S.undo) { S.cwnd = S.undo[0]; S.ssthresh = S.undo[1]; }
      S.undo = null;
    }
    // 손실 판단
    if (P.rack) {
      // RACK: 나중에 보낸 패킷이 도착했는데, 이 패킷은 그보다 (왕복 시간 + 여유)만큼 먼저 보냈으면 잃은 것
      let newestDel = -1;
      // 다시 보낸 지 최소 왕복 시간도 안 됐는데 확인된 것은 원본이 도착한 것일 수 있어 기준으로 쓰지 않는다(리눅스 tcp_rack_advance)
      for (const id of a.sack) { const s = S.segs.get(id); if (!s) continue; const x = s.tx[s.tx.length - 1]; if (x.kind !== 'new' && t - x.at < S.minRtt) continue; newestDel = Math.max(newestDel, x.at); }
      // 여유 시간 = 최소 왕복 시간의 1/4 × 단계(DSACK을 볼 때마다 늘어남), 왕복 시간을 넘지 않음
      const base = S.srtt || P.rtt, reo = Math.min((S.minRtt < Infinity ? S.minRtt : base) / 4 * S.reoSteps, base);
      for (let i = S.una; i < S.next; i++) {
        const s = S.segs.get(i);
        if (!s || s.acked || s.sacked) continue;
        const last = s.tx[s.tx.length - 1];
        if (last.at < newestDel && t - last.at > (S.srtt || P.rtt) + reo && !last.rackDone) { last.rackDone = true; transmit(s, 'fast'); C.fast++; reduce(); }
      }
    } else if (S.dup >= 3 && S.frDone !== S.una && S.una >= S.lossHigh) {
      const s = S.segs.get(S.una);
      if (s && !s.acked) { S.frDone = S.una; transmit(s, 'fast'); C.fast++; reduce(); }
    }
    // RTO 뒤에는 그때 이미 한 왕복 넘게 확인이 없던 나머지도 잃은 것으로 보고, 확인이 올 때마다 두 개씩 차례로 다시 보낸다
    if (advanced && S.una < S.lossHigh) {
      const old = S.lossAt - (S.srtt || P.rtt);
      for (let i = S.una, n = 0; i < S.lossHigh && n < 2; i++) {
        const s = S.segs.get(i);
        if (s && !s.acked && !s.sacked && s.tx[s.tx.length - 1].at <= old) { transmit(s, 'rto'); n++; }
      }
    }
    if (outstanding() === 0) { S.rtoAt = Infinity; S.tlpAt = Infinity; }
    else if (advanced) { S.rtoAt = t + rtoNow(); armTlp(); }
  }
  // 손실 한 번의 복구(같은 창 안의 손실 묶음)마다 한 번만 줄인다. CUBIC은 70%로.
  function reduce() {
    if (S.una < S.recover) return;
    S.recover = S.next; S.credit = 0; S.tlpAt = Infinity; // 복구에 들어서며 보낸 첫 재전송은 한도와 상관없이 나간다. 복구 중에는 TLP 대신 RTO만 건다.
    if (P.mode === 'bulk') { S.ssthresh = Math.max(2, S.cwnd * 0.7); S.cwnd = S.ssthresh; }
  }
  function senderStep() {
    if (P.mode === 'game') {
      if (t >= S.nextGame) {
        // 서버에서 기다리는 작은 패킷은 TCP가 MSS 크기까지 한 패킷으로 합친다(그래서 MTU 블랙홀에서는 이것도 사라진다)
        const tail = S.q[S.q.length - 1];
        if (tail && !tail[2] && tail[0] + SMALL <= S.mssNow) tail[0] += SMALL; else S.q.push([SMALL, S.nextGame, false]);
        S.nextGame += P.gap;
      }
      if (t >= S.nextBig) { // 2초마다 큰 업데이트 4KB (MSS 단위로 쪼개짐)
        for (let left = 4000; left > 0; left -= S.mssNow) S.q.push([Math.min(left, S.mssNow), S.nextBig, true]);
        S.nextBig += 2000;
      }
      // 게임이 만든 패킷은 바로 나간다. 복구 중에는 위의 한도(credit)만큼만 나가고 나머지는 서버에서 기다린다.
      while (S.q.length && (!inRecovery() || S.credit > 0)) { const [size, made, big] = S.q.shift(); if (inRecovery()) S.credit--; newSeg(size, made, big); }
    } else if (outstanding() < Math.floor(S.cwnd)) newSeg(MSS);
    // TLP: 한동안 ACK가 없으면 맨 끝 패킷을 한 번 더 보내 받는 쪽의 SACK을 끌어낸다
    if (P.rack && t >= S.tlpAt && !S.tlpOut && !inRecovery() && outstanding() > 0) {
      let last = null;
      for (let i = S.next - 1; i >= S.una; i--) { const s = S.segs.get(i); if (s && !s.acked) { last = s; break; } }
      // 탐침을 보낸 뒤 RTO 타이머는 지금부터 다시 건다(리눅스 tcp_send_loss_probe)
      if (last) { S.tlpOut = true; S.tlpAt = Infinity; transmit(last, 'tlp'); C.tlp++; S.rtoAt = t + rtoNow(); }
    }
    // RTO: 기다려도 확인이 안 오면 가장 오래된 것부터 다시 보낸다
    if (t >= S.rtoAt && outstanding() > 0) {
      C.rto++;
      const thinNow = P.thin && outstanding() < 4 && S.retries < 6;
      // 가장 오래된 것 하나를 다시 보낸다. 나머지는 확인이 돌아올 때마다 차례로(onAck).
      for (let i = S.una; i < S.next; i++) {
        const s = S.segs.get(i);
        if (s && !s.acked && !s.sacked) { transmit(s, 'rto'); break; }
      }
      // 혼잡 윈도우는 1로. 기준값(ssthresh)은 연속 RTO의 첫 번째에서만 70%로 낮춘다(CUBIC). 가짜로 밝혀지면 되돌릴 값을 남겨 둔다.
      if (P.mode === 'bulk') { if (S.retries === 0) { S.undo = [S.cwnd, S.ssthresh]; S.ssthresh = Math.max(2, S.cwnd * 0.7); } S.cwnd = 1; }
      // 혼잡 윈도우 1 = 방금 다시 보낸 하나로 꽉 참. 새 패킷은 확인이 올 때까지 서버에서 기다린다.
      S.lossHigh = S.next; S.lossAt = t; S.recover = S.next; S.frDone = S.una; S.dup = 0; S.tlpAt = Infinity; S.credit = 0;
      S.retries++;
      if (!thinNow) S.backoff = Math.min(1024, S.backoff * 2);
      S.rtoAt = t + rtoNow();
    }
  }

  /* ---------------- 받는 쪽 ---------------- */
  function recvData(p) {
    const s = S.segs.get(p.id);
    let dsack = null;
    if (R.got.has(p.id)) dsack = p.id; // 이미 받은 것 = 상대가 괜히 다시 보냄
    else {
      R.got.add(p.id);
      if (p.id === R.expected) R.tsRecent = p.tx.at; // 타임스탬프: 창을 앞으로 민 패킷의 보낸 시각을 ACK에 담아 돌려준다
      if (p.id >= R.expected) R.buf.add(p.id);
      while (R.buf.has(R.expected)) {
        R.buf.delete(R.expected);
        const d = S.segs.get(R.expected);
        if (d && d.delivered == null) { d.delivered = t; if (P.mode === 'game' || d.id % 10 === 0) deliv.push([t, t - d.first, P.mode === 'game' && d.big]); }
        R.expected++;
      }
    }
    const sack = [...R.buf].sort((a, b) => a - b); // 실제 SACK은 구간 몇 개로 이 전체를 알린다
    if (!(P.ackLoss && rnd() * 100 < P.ackLoss)) {
      // 업로드가 꽉 차면 ACK도 공유기 줄에 서서 늦게 간다
      let at = t + oneWay(t) + (P.ackLoss ? rnd() * P.ackLoss * 12 : 0);
      at = Math.max(at, S.lastAck + 0.2); S.lastAck = at;
      acks.push({ at, cum: R.expected, sack, dsack, ts: R.tsRecent });
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
  const cvT = K.canvas(F.stage, { height: w => (w < 520 ? 176 : 190), caption: '서버 → 내 PC (최근 3초, 오른쪽 끝이 지금)', right: '<span class="legend"><span><i style="background:var(--ink-2)"></i>처음 보냄</span><span><i style="background:var(--s2)"></i>재전송</span><span><i style="background:var(--warn)"></i>불필요한 재전송</span><span>× 사라짐</span></span>' });
  const barsWrap = K.el('div');
  F.stage.append(K.el('div', { class: 'cv-cap' }, K.el('b', { text: '어디서 잃었나 (최근 10초)' }), K.el('span', { text: '근본 원인별 손실 수' })), barsWrap);
  const cvD = K.canvas(F.stage, { height: 128, caption: '게임에 전달되기까지 걸린 시간 (최근 10초)', right: '<span class="legend"><span><i style="background:var(--s1)"></i>작은 패킷</span><span><i class="dot" style="background:var(--s3)"></i>큰 업데이트</span></span>' });
  const cwWrap = K.el('div', { hidden: true });
  F.stage.append(cwWrap);
  const cvW = K.canvas(cwWrap, { height: 110, caption: '혼잡 윈도우 (한 번에 보낼 수 있는 패킷 수)', right: '재전송마다 줄어듦' });

  const g0 = K.group(F.controls, '트래픽');
  const cMode = K.choice(g0, { value: P.mode, options: [['game', '게임 (작은 패킷이 드문드문)'], ['bulk', '대용량 (패치 다운로드)']], onChange: v => { P.mode = v; cwWrap.hidden = v !== 'bulk'; reset(); warm(); } });
  const sRtt = K.slider(g0, { label: '핑', min: 10, max: 300, step: 10, value: P.rtt, unit: 'ms', onInput: v => { P.rtt = v; } });
  K.slider(g0, { label: '게임 패킷 간격', min: 20, max: 300, step: 10, value: P.gap, unit: 'ms', onInput: v => { P.gap = v; }, hint: '패킷이 드문드문일수록 “중복 ACK 3개”가 늦게 모여 RTO에 기대게 됩니다(thin stream).' });
  const g1 = K.group(F.controls, '경로상의 손실 원인');
  const sWifi = K.slider(g1, { label: '와이파이 손실', min: 0, max: 10, step: 0.5, value: P.wifi, unit: '%', onInput: v => { P.wifi = v; pr.clear(); }, hint: '무선 장비가 여러 번 다시 보내 보고도 실패해 버린 비율. 재시도로 살린 패킷은 손실로 치지 않습니다.' });
  const tCong = K.toggle(g1, { label: '혼잡 대기열 넘침 (3초마다 0.35초)', value: P.cong, onChange: v => { P.cong = v; pr.clear(); }, hint: '병목 대기열이 가득 찬 동안 도착한 패킷의 35%가 버려지고, 살아남은 것도 대기열 끝에서 50ms 더 기다립니다.' });
  const tCable = K.toggle(g1, { label: '불량 케이블·광모듈 (1%)', value: P.cable, onChange: v => { P.cable = v; pr.clear(); }, hint: '실제 비트 오류는 큰 패킷일수록 잘 걸립니다. 여기서는 크기와 상관없이 1%로 단순화했습니다.' });
  const tMtu = K.toggle(g1, { label: 'MTU 블랙홀 (1,360바이트 넘으면 사라짐)', value: P.mtu, onChange: v => { P.mtu = v; pr.clear(); } });
  const sReo = K.slider(g1, { label: '순서 뒤바뀜', min: 0, max: 30, step: 1, value: P.reorder, unit: '%', onInput: v => { P.reorder = v; pr.clear(); }, hint: '패킷 단위로 경로를 나누는 장비, 경로가 바뀌는 순간 등에서 일부 패킷이 10~20ms 늦게 도착. 연결마다 경로를 고정하는 보통의 ECMP·링크 묶음(LAG)은 순서를 지킵니다.' });
  const tSpike = K.toggle(g1, { label: '지연 급등 (4초마다 0.5초)', value: P.spike, onChange: v => { P.spike = v; pr.clear(); }, hint: '와이파이 절전, 모바일 무선 전환, 가상 머신 일시 정지 등' });
  const sAck = K.slider(g1, { label: 'ACK 지연·손실 (업로드 포화)', min: 0, max: 30, step: 1, value: P.ackLoss, unit: '%', onInput: v => { P.ackLoss = v; pr.clear(); } });
  const g2 = K.group(F.controls, '복구 설정 (보내는 쪽 OS)');
  const tRack = K.toggle(g2, { label: 'RACK-TLP (시간 기준 손실 판단 + TLP)', value: P.rack, onChange: v => { P.rack = v; pr.clear(); }, hint: '최신 리눅스는 기본으로 켜져 있습니다. 끄면 “중복 ACK 3개” 방식만 씁니다.' });
  const tThin = K.toggle(g2, { label: 'thin stream 선형 타임아웃', value: P.thin, onChange: v => { P.thin = v; pr.clear(); }, hint: 'tcp_thin_linear_timeouts. 패킷이 적게 오가는 연결은 처음 6번까지 RTO를 두 배씩 늘리지 않습니다.' });
  const tProbe = K.toggle(g2, { label: 'MTU 탐색 (tcp_mtu_probing)', value: P.mtuProbe, onChange: v => { P.mtuProbe = v; pr.clear(); } });
  const tMss = K.toggle(g2, { label: 'MSS 조정 (1,300바이트로 제한)', value: P.mss, onChange: v => { P.mss = v; S.mssNow = v ? Math.min(S.mssNow, MSS_CLAMP) : S.mssNow === MSS_CLAMP ? MSS : S.mssNow; pr.clear(); }, hint: '방화벽·공유기의 MSS clamp나 서버의 TCP_MAXSEG로 처음부터 경로를 통과할 크기로 보냅니다. 새로 만드는 패킷부터 적용됩니다.' });
  const cRto = K.choice(g2, { label: 'RTO 최소값', value: P.rtoMin, options: [[200, '200ms (기본)'], [50, '50ms (내부망용)']], onChange: v => { P.rtoMin = +v; pr.clear(); } });

  const stRate = K.stat(F.stats, { label: '재전송률' });
  const stFast = K.stat(F.stats, { label: '빠른 재전송', unit: '회' });
  const stRto = K.stat(F.stats, { label: 'RTO 타임아웃', unit: '회' });
  const stTlp = K.stat(F.stats, { label: 'TLP', unit: '회' });
  const stSp = K.stat(F.stats, { label: '불필요한 재전송', unit: '회' });
  const stP99 = K.stat(F.stats, { label: '전달 지연 (99%)' });
  const stWait = K.stat(F.stats, { label: '대기 중인 패킷' });
  const stRtoV = K.stat(F.stats, { label: '지금 RTO' });

  const pr = K.presets(F, [
    { label: '깨끗한 회선', apply: () => set({}) },
    { label: '와이파이 손실 3%', apply: () => set({ wifi: 3 }) },
    { label: '저녁 혼잡', apply: () => set({ cong: true }) },
    { label: 'MTU 블랙홀', apply: () => set({ mtu: true }) },
    { label: '순서 뒤바뀜 (대용량)', apply: () => set({ mode: 'bulk', reorder: 12 }) },
    { label: '지연 급등', apply: () => set({ spike: true }) },
    { label: '업로드 포화 (ACK 지연·손실)', apply: () => set({ ackLoss: 15 }) },
    { label: '대책 모두 켜기', apply: () => set({ wifi: 3, cong: true, mtu: true, rack: true, thin: true, mtuProbe: true, mss: true }) },
  ], '상황');
  function set(o) {
    Object.assign(P, { mode: 'game', wifi: 0, cong: false, cable: false, mtu: false, reorder: 0, spike: false, ackLoss: 0, rack: false, thin: false, mtuProbe: false, mss: false, rtoMin: 200 }, o);
    cMode.set(P.mode, false); sWifi.set(P.wifi, false); tCong.set(P.cong, false); tCable.set(P.cable, false); tMtu.set(P.mtu, false);
    sReo.set(P.reorder, false); tSpike.set(P.spike, false); sAck.set(P.ackLoss, false); tRack.set(P.rack, false); tThin.set(P.thin, false);
    tProbe.set(P.mtuProbe, false); tMss.set(P.mss, false); cRto.set(P.rtoMin, false);
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
      const big = s.big;
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
        if (tx.kind !== 'new' && w > 440) K.text(ctx, tx.spurious ? '불필요' : TAG[tx.kind], x1 + 2, yS - 9, { size: 9.5, weight: 700, color: tx.spurious ? Cc.warnInk : Cc.ink });
      });
    }
    ctx.restore();
    // 복구 중에 보내지 못하고 서버에 쌓인 패킷(작은 패킷은 합쳐져 있어 원래 개수로 센다)
    if (P.mode === 'game' && S.q.length) {
      const n = S.q.reduce((a, q) => a + (q[2] ? 1 : Math.round(q[0] / SMALL)), 0);
      K.text(ctx, w < 520 ? `서버에 ${n}개 대기` : `복구를 기다리며 서버에 쌓인 패킷 ${n}개`, R - 4, yS + 14, { align: 'right', size: 10.5, weight: 700, color: Cc.warnInk });
    }
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
    // 재전송률은 최근 10초 기준(누적으로 보면 지나간 사건이 계속 숫자를 끌어올린다)
    rateHist.push({ t, out: C.out, retr: C.retr });
    while (rateHist.length > 1 && rateHist[1].t <= t - 10000) rateHist.shift();
    const base = rateHist[0].t <= t - 10000 || rateHist.length === 1 ? rateHist[0] : { out: 0, retr: 0 };
    const wOut = C.out - base.out, wRetr = C.retr - base.retr;
    const rate = wOut ? wRetr / wOut : 0;
    const head = S.segs.get(R.expected);
    // 받는 쪽에서 기다리는 것(구멍 뒤)과 서버에서 기다리는 것(복구 중 보내지 못한 패킷) 중 더 오래된 쪽
    const waitMs = Math.max(head && head.first < t ? t - head.first : 0, S.q.length ? t - S.q[0][1] : 0);
    const d = deliv.filter(x => x[0] > t - 10000).map(x => x[1]).sort((a, b) => a - b);
    const p99d = d.length ? d[Math.min(d.length - 1, Math.floor(d.length * 0.99))] : 0;
    // 맨 앞이 아직 안 왔으면 그 대기 시간도 지연이다(도착한 것만 세면 멈춘 동안 “좋음”으로 보인다)
    const stuck = waitMs > P.rtt ? waitMs : 0, p99 = Math.max(p99d, stuck);
    // 오래 멈춘 동안은 혼잡 윈도우가 1이라 새 패킷은 서버에 묶이고, 드문드문 다시 보낸 것만 나간다(개수가 적어 비율이 크게 흔들린다)
    stRate.set(K.pct(rate, 1), rate > 0.03 ? 'bad' : rate > 0.005 || stuck > 1000 ? 'warn' : 'good', stuck > 1000 ? `멈춘 동안은 다시 보낸 것만 나감 (${K.n(wOut)}개 중 ${K.n(wRetr)}개)` : `최근 10초 보낸 ${K.n(wOut)}개 중 ${K.n(wRetr)}개`);
    stFast.set(String(C.fast)); stRto.set(String(C.rto), C.rto > 3 ? 'bad' : C.rto ? 'warn' : 'good'); stTlp.set(String(C.tlp)); stSp.set(String(C.spurious), C.spurious ? 'warn' : 'good');
    stP99.set(d.length || stuck ? K.ms(p99) : '전달 없음', !d.length || p99 > 250 ? 'bad' : p99 > 120 ? 'warn' : 'good', stuck > p99d ? '아직 못 받은 맨 앞 패킷 포함' : `평소 ${K.ms(P.rtt / 2)}`);
    stWait.set(waitMs > P.rtt ? K.ms(waitMs) : '없음', waitMs > 1000 ? 'bad' : waitMs > 200 ? 'warn' : 'good', waitMs > P.rtt ? '맨 앞 하나를 기다리느라 뒤도 전부 대기' : '순서대로 바로 전달');
    stRtoV.set(K.ms(rtoNow()), S.backoff > 1 ? 'warn' : null, rtoNow() >= RTO_MAX ? '상한 120초에 닿음' : S.backoff > 1 ? `두 배씩 늘어난 상태 (×${S.backoff})` : '왕복 시간 + max(최소값, RTT 편차×4)');
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    const rtoWait = K.ms(P.rtt + P.rtoMin);
    let msg;
    if (top[1] === 0 && C.spurious === 0) msg = `${K.flag('good')}사라지는 패킷이 없습니다. 모든 패킷이 약 ${K.ms(P.rtt / 2)} 만에 도착해 바로 게임에 전달됩니다.`;
    else if (top[1] === 0 && C.spurious > 0) msg = `${K.flag('warn')}<b>불필요한 재전송</b> ${C.spurious}회. 잃어버린 패킷은 없는데 ${P.spike ? '지연이 순간적으로 RTO보다 길어져' : P.reorder ? '순서가 뒤바뀌어 중복 ACK가 쌓여' : 'ACK가 늦게 와서'} 보내는 쪽이 손실로 잘못 판단했습니다. ${P.mode === 'bulk' ? '회선 낭비와 함께 전송량(혼잡 윈도우)이 괜히 줄어 속도가 떨어집니다.' : P.spike ? '화면의 <b>멈춤</b>은 지연 급등 자체 때문이고, 불필요한 재전송이 멈춤을 거의 늘리지는 않습니다.' : '게임 패킷은 제때 전달되고 회선만 조금 낭비합니다.'} 손실 원인 막대가 비어 있는데 재전송률이 높다면 이 경우입니다.`;
    else {
      const name = CAUSE[top[0]];
      msg = `${K.flag(rate > 0.03 || p99 > 250 ? 'bad' : 'warn')}최근 10초 손실의 주 원인은 <b>${name}</b>(${top[1]}개)입니다. `;
      if (top[0] === 'M') msg += `1,360바이트를 넘는 큰 업데이트만 계속 사라지고 같은 패킷을 반복해서 다시 보냅니다. ${P.mtuProbe ? 'MTU 탐색이 켜져 있어도 바로 통과하지는 못합니다. 재전송 타임아웃이 3초쯤 이어져야 블랙홀로 판단하고, 그때부터 1,024바이트로 작게 나눠 통과합니다. 그 사이는 <b>멈춤</b>이라 미리 막는 MSS 조정이 먼저입니다.' : 'TCP는 순서를 지켜야 하므로 뒤따르는 작은 패킷까지 전부 대기합니다. RTO가 한 번 만료된 뒤에는 서버도 새 패킷을 보내지 않고 쌓아 둡니다. RTO는 두 배씩 늘어나 결국 <b>멈춤</b> 끝에 <b>접속 끊김</b>이 됩니다. 평소에는 멀쩡하다가 “큰 창을 열거나 사람 많은 곳에 가면 멈춘다”는 제보로 옵니다. MSS 조정이나 MTU 탐색이 해결책입니다.'}`;
      else if (top[0] === 'A') msg += `게임 패킷 자체는 제때 도착합니다. ACK는 뒤에 오는 ACK가 앞의 것을 대신 확인해 주므로 몇 개 사라져도 대개 괜찮습니다. 문제는 업로드가 꽉 차서 ACK가 대기열에 쌓여 늦게 가는 것입니다. 보내는 쪽이 느끼는 왕복 시간이 늘어 RTO가 커지고, ACK가 한꺼번에 늦으면 잃지 않은 것을 다시 보내며(불필요한 재전송) 대용량 전송은 속도가 떨어집니다. 실제 게임에서 더 크게 느껴지는 것은 같은 업로드 대기열에 쌓인 내 입력이 늦게 가는 <b>입력 지연</b>입니다(이 실험은 서버 → 내 PC 방향만 보여 줍니다).`;
      else if (P.mode === 'game' && !P.rack) {
        // 보내는 쪽 기준: 잃은 패킷을 보낸 뒤 세 번째 중복 ACK가 돌아오기까지 = 패킷 간격×3 + 왕복 시간.
        // RTO 타이머는 앞 패킷의 확인이 올 때마다 새로 걸리므로, 핑이 패킷 간격보다 길면 (핑 - 간격)만큼 늦게 터진다.
        const dupWait = 3 * P.gap + P.rtt, rtoW = P.rtt + P.rtoMin + Math.max(0, P.rtt - P.gap);
        const thr = Math.floor(Math.max(P.rtoMin / 3, (P.rtt + P.rtoMin) / 4) / 10) * 10 + 10;
        const rackTip = P.gap < P.rtoMin ? `RACK-TLP를 켜면 다음 패킷의 SACK이 오는 약 ${K.ms(Math.max(P.gap, P.rtt / 4) + P.rtt)} 뒤에 복구가 시작됩니다.` : 'RACK-TLP를 켜도 패킷이 이렇게 드문드문하면 크게 빨라지지 않습니다.';
        msg += dupWait > rtoW
          ? `게임 패킷이 ${P.gap}ms마다 하나라, 보내는 쪽에 중복 ACK 3개가 모이려면 약 ${K.ms(dupWait)}가 걸립니다. 그 전에 RTO(약 ${K.ms(rtoW)})가 먼저 옵니다. 한 번 잃을 때마다 그만큼 <b>멈춤</b>, 뒤 패킷은 대기하다가 한꺼번에 전달되는 <b>몰아치기</b>입니다. ${rackTip}`
          : `패킷 간격(${P.gap}ms)이 짧아 중복 ACK 3개가 약 ${K.ms(dupWait)} 만에 모여 빠른 재전송으로 복구합니다. 그래도 한 번 잃을 때마다 그만큼 <b>멈춤</b> 뒤 <b>몰아치기</b>입니다. 패킷 간격을 ${thr}ms 이상으로 늘리면 RTO에 기대게 됩니다.`;
      }
      else if (P.mode === 'game') {
        const rackAt = Math.max(P.gap, P.rtt / 4) + P.rtt; // RACK: 다음 패킷의 SACK이 돌아오는 시점
        msg += P.gap < P.rtoMin
          ? `RACK-TLP가 켜져 있어 다음 패킷이 도착했다는 SACK이 오는 순간, 약 ${K.ms(rackAt)} 만에 손실을 감지하고 다시 보냅니다. 그래도 잃은 패킷은 평소(${K.ms(P.rtt / 2)})보다 늦은 약 ${K.ms(rackAt + P.rtt / 2)} 만에 도착합니다. 그동안 뒤 패킷도 함께 기다리므로 화면은 <b>멈춤</b>입니다.`
          : `RACK-TLP가 켜져 있지만 패킷 간격(${P.gap}ms)이 길어 다음 패킷보다 TLP가 먼저 나갑니다. 아직 ACK를 받지 못한 패킷이 하나뿐이면 TLP도 지연 ACK를 감안해 RTO와 비슷하게(약 ${K.ms(P.rtt + P.rtoMin)}) 기다리므로 효과가 작습니다.`;
      }
      else msg += `대용량 전송은 뒤따르는 패킷이 많아 빠른 재전송으로 대부분 복구되지만, 손실이 난 왕복마다 혼잡 윈도우가 30% 줄어 속도가 떨어집니다. RTO까지 가면 혼잡 윈도우가 1로 떨어져 처음부터 다시 늘립니다.`;
      if (P.rack && (top[0] === 'W' || top[0] === 'C' || top[0] === 'L')) msg += ' 복구 설정은 멈춤을 줄여 줄 뿐, 사라지는 패킷 자체를 줄이지는 못합니다. 손실이 생기는 자리를 고치는 것이 근본 해결입니다.';
      if (C.spurious) msg += ` 불필요한 재전송도 ${C.spurious}회 있습니다.`;
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
