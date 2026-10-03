/* 판정 구간: 보스 예고 시간 중 얼마가 네트워크에 먹히는가. 판정 방식·연출 방식에 따라 달라진다 */
K.register('windows', function (root) {
  const TR = I18N.tr('sim-windows');   // 이 실험 묶음의 사전을 먼저 본다(i18n.js)
  const F = K.frame(root, {
    kicker: TR`동기화 방식 · 판정 구간`,
    title: TR`예고가 “핑 + 반응 시간”보다 짧으면 실력과 상관없이 맞는다`,
    lead: TR`보스가 공격을 예고하고 그 안에 피해야 한다고 합시다. 예고 시간의 일부는 패킷이 내게 오는 데, 일부는 사람이 반응하는 데, 일부는 내 입력이 서버에 가는 데 쓰입니다. 남는 시간이 없으면 아무리 잘해도 맞습니다. 이 계산 때문에 탭 타겟 MMO는 핑에 둔감하고 패링 게임은 민감합니다.`,
    tries: [
      TR`장르 버튼을 차례로 눌러 보세요. 예고가 긴 레이드는 핑 300ms에서도 여유가 남고 빠른 공격 패링은 핑 100ms만 돼도 모자랍니다.`,
      TR`<b>액션 MMO 회피</b>에서 <b>예고 전달</b>을 “서버 시각으로 미리 예약”으로 바꿔 보세요. 패킷이 늦게 오는 구간이 사라집니다. 보스 패턴을 미리 알려 주는 설계입니다.`,
      TR`<b>판정 기준</b>을 “지연 보상”으로 바꾸면 서버가 내가 본 시점으로 되감아 판정합니다. 억울한 피격이 줄어드는 대신, 다른 사람 화면에서는 “맞은 것 같은데 피했다”로 보일 수 있습니다.`,
      TR`아래 곡선에서 판정 방식마다 몇 ms 핑부터 피할 수 없는지 확인하세요.`,
    ],
  });

  const GENRES = [
    { label: TR`탭 타겟 레이드`, W: 2000, sched: 'arrive', judge: 'now', say: TR`레이드 보스는 1.5~3초 예고가 흔합니다. 핑이 꽤 높아도 반응할 시간이 충분합니다.` },
    { label: TR`액션 MMO 회피`, W: 700, sched: 'arrive', judge: 'now', say: TR`0.7초 예고라도 패킷이 늦게 오고 입력이 늦게 가면 여유가 금방 사라집니다.` },
    { label: TR`빠른 공격 패링`, W: 450, sched: 'arrive', judge: 'now', say: TR`0.45초 만에 들어오는 빠른 공격을 보고 패링하는 경우입니다. 사람 반응 0.25초를 빼면 0.2초만 남아, 핑이 조금만 있어도 모자랍니다. 타이밍을 외워 미리 누르는 패링은 반응 시간이 들지 않습니다. 대신 판정 시점이 네트워크가 쓰는 시간만큼 밀려 그만큼 일찍 눌러야 하고 지터만큼 판정 구간이 좁아집니다.` },
    { label: TR`격투 게임 가드`, W: 400, sched: 'arrive', judge: 'roll', say: TR`격투 게임은 롤백으로 내 입력을 누른 프레임 그대로 반영합니다(이 실험은 입력 지연 0프레임으로 가정). 대신 상대 공격은 핑의 절반만큼 늦게 보이고 앞부분이 잘려 나타나서, 보고 막을 시간이 그만큼 줄어듭니다. 0.25초보다 빠른 공격은 핑이 0이어도 보고 막을 수 없어 미리 읽고 막아야 합니다.` },
    { label: TR`리듬 게임`, W: 1500, sched: 'sched', judge: 'client', say: TR`리듬 게임은 박자를 미리 알고(예약), 판정도 내 기기에서 합니다. 노트가 1초 넘게 미리 보여 반응할 시간이 넉넉하고 핑이 1초여도 판정에는 영향이 없습니다. 판정 구간(±0.05초 안팎)은 박자를 맞추는 정확도라서 반응 시간과 상관이 없습니다.` },
  ];
  const P = { W: 700, rtt: 150, interp: 100, react: 250, tick: 20, sched: 'arrive', judge: 'now', speed: 0.5 };
  const CAP = 250; // 지연 보상 되감기 상한

  const cvScene = K.canvas(F.stage, { height: w => K.clamp(w * 0.34, 150, 210), caption: TR`같은 공격, 두 개의 화면`, right: TR`<span class="legend"><span><i class="dot" style="background:var(--s1)"></i>나</span><span><i class="dot" style="background:var(--s2)"></i>예고 범위</span></span>` });
  const cvBar = K.canvas(F.stage, { height: w => (w < 520 ? 176 : 132), caption: TR`예고 시간은 어디에 쓰이나`, right: '' });
  const cvCurve = K.canvas(F.stage, { height: w => K.clamp(w * 0.32, 180, 230), caption: TR`핑에 따른 여유 시간`, right: TR`<span class="legend"><span><i style="background:var(--s1)"></i>서버 현재 기준</span><span><i style="background:var(--s2)"></i>지연 보상</span><span><i style="background:var(--s3)"></i>클라이언트 판정</span><span><i style="background:var(--s4)"></i>롤백</span></span>` });

  const preset = K.presets(F, GENRES.map(g => ({ label: g.label, apply() { sW.set(g.W, false); cSched.set(g.sched, false); cJudge.set(g.judge, false); Object.assign(P, { W: g.W, sched: g.sched, judge: g.judge }); genreSay = g.say; restart(); } })), TR`장르`);
  let genreSay = '';
  const g1 = K.group(F.controls, TR`게임 규칙`);
  const sW = K.slider(g1, { label: TR`예고 시간 (반응해야 하는 구간)`, min: 100, max: 2500, step: 10, value: P.W, fmt: v => K.ms(v), onInput: v => { P.W = v; genreSay = ''; preset.clear(); restart(); } });
  const g2 = K.group(F.controls, TR`회선·서버`);
  K.slider(g2, { label: TR`핑(왕복)`, min: 0, max: 400, step: 10, value: P.rtt, unit: 'ms', onInput: v => { P.rtt = v; } });
  K.slider(g2, { label: TR`보간 버퍼`, min: 0, max: 250, step: 10, value: P.interp, unit: 'ms', onInput: v => { P.interp = v; } });
  K.choice(g2, { label: TR`서버 틱`, value: P.tick, options: [[10, TR`10/초`], [20, TR`20/초`], [30, TR`30/초`], [60, TR`60/초`]], onChange: v => { P.tick = +v; } });
  const g3 = K.group(F.controls, TR`사람`);
  K.slider(g3, { label: TR`사람 반응 시간`, min: 150, max: 400, step: 10, value: P.react, unit: 'ms', onInput: v => { P.react = v; } });
  const g4 = K.group(F.controls, TR`설계`);
  const cSched = K.choice(g4, { label: TR`예고 전달`, value: P.sched, options: [['arrive', TR`도착하면 재생`], ['sched', TR`서버 시각으로 미리 예약`]], onChange: v => { P.sched = v; preset.clear(); },
    hint: TR`미리 예약: 서버가 예고를 0.4초 먼저 보내고 모두가 서버 시각에 맞춰 같은 순간에 재생합니다.` });
  const cJudge = K.choice(g4, { label: TR`판정 기준`, value: P.judge, options: [['now', TR`서버 현재 기준`], ['lagcomp', TR`지연 보상`], ['client', TR`클라이언트 판정`], ['roll', TR`롤백`]], onChange: v => { P.judge = v; preset.clear(); },
    hint: TR`이 실험의 지연 보상은 최대 250ms까지 되감습니다(게임마다 0.2~1초). 클라이언트 판정은 내 화면에서 피했으면 성공입니다. 롤백은 내 입력을 누른 프레임에 반영하지만 상대 동작을 늦게 본 시간은 돌려받지 못합니다.` });
  K.choice(g4, { label: TR`관찰 속도`, value: P.speed, options: [[1, TR`1배`], [0.5, TR`0.5배`], [0.25, TR`0.25배`]], onChange: v => { P.speed = +v; } });

  const stLost = K.stat(F.stats, { label: TR`네트워크가 쓰는 시간` });
  const stMargin = K.stat(F.stats, { label: TR`남는 여유` });
  const stRes = K.stat(F.stats, { label: TR`결과` });
  const stMax = K.stat(F.stats, { label: TR`피할 수 있는 최대 핑` });

  /* ---------------- 계산 ---------------- */
  function parts(rtt, judge = P.judge, sched = P.sched) {
    const down = rtt / 2, up = rtt / 2;
    const roll = judge === 'roll'; // 롤백: 보간 버퍼·서버 틱 없이 프레임 단위로 입력을 주고받는다
    const seeDown = sched === 'sched' ? Math.max(0, down - 400) : down;
    const seeInterp = sched === 'sched' || roll ? 0 : P.interp;
    const tickWait = roll ? 0 : 1000 / P.tick / 2;
    const see = seeDown + seeInterp;
    const travel = up + tickWait;
    let comp = 0;
    if (judge === 'lagcomp') comp = Math.min(CAP, see + travel);
    if (judge === 'client') comp = see + travel;
    if (roll) comp = travel; // 내 입력은 누른 프레임으로 되감아 인정. 상대 동작을 늦게 본 시간은 못 돌려받음
    const used = see + P.react + travel - comp;
    return { seeDown, seeInterp, react: P.react, up, tickWait, comp, used, margin: P.W - used };
  }
  function maxPing(judge) {
    for (let r = 0; r <= 1000; r += 5) if (parts(r, judge).margin < 0) return r - 5;
    return Infinity;
  }

  /* ---------------- 장면 애니메이션 ---------------- */
  let ph = 0; // 한 판의 경과 시간(서버 기준)
  function restart() { ph = 0; }
  function drawScene() {
    const { ctx, w, h } = cvScene;
    const C = K.C;
    ctx.clearRect(0, 0, w, h);
    const p = parts(P.rtt);
    const gap = 12, pw = (w - gap) / 2;
    const tSee = p.seeDown + p.seeInterp;                   // 내 화면에서 예고가 시작되는 서버 시각
    const tPress = tSee + p.react;                           // 내가 누른 시각(서버 시계로)
    const tArrive = tPress + p.up + p.tickWait;              // 서버가 회피를 처리하는 시각
    const hitAtServer = P.W;
    const dodgedServer = P.judge === 'now' ? tArrive < hitAtServer : P.judge === 'client' ? P.react < P.W : p.used < P.W;
    const period = Math.max(P.W, tArrive) + 1300;
    const u = ph % period;
    const panels = [
      { x: 0, title: TR`서버의 실제 상태`, start: 0, move: P.judge === 'client' ? tPress + p.up : P.judge === 'roll' ? tPress : tArrive, local: false },
      { x: pw + gap, title: TR`내 화면`, start: tSee, move: tPress, local: true },
    ];
    panels.forEach(pn => {
      ctx.save();
      ctx.translate(pn.x, 0);
      ctx.fillStyle = C.paper; K.rr(ctx, 0, 0, pw, h, 8); ctx.fill();
      K.text(ctx, pn.title, 10, 14, { size: 11.5, weight: 700, color: C.ink });
      const cx = pw * 0.52, cy = h * 0.56, R = Math.min(pw * 0.2, h * 0.3);
      // 보스와 예고 범위의 자리 (항상 흐리게)
      ctx.fillStyle = K.alpha(C.ink2, 0.5);
      K.rr(ctx, cx - R * 2.2, cy - 14, 16, 28, 4); ctx.fill();
      K.text(ctx, TR`보스`, cx - R * 2.2 + 8, cy + 24, { align: 'center', size: 10.5, color: C.muted });
      ctx.strokeStyle = K.alpha(C.s2, 0.25); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      // 이 화면에서의 예고 진행 막대
      const pr = K.clamp((u - pn.start) / P.W, 0, 1);
      ctx.fillStyle = C.sunk; ctx.fillRect(10, 24, pw - 20, 4);
      ctx.fillStyle = C.s2; ctx.fillRect(10, 24, (pw - 20) * pr, 4);
      // 예고 원: 시작 시각부터 W 동안 차오름
      const prog = (u - pn.start) / P.W;
      if (prog > 0 && prog < 1.35) {
        ctx.strokeStyle = C.s2; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = K.alpha(C.s2, prog >= 1 ? 0.35 : 0.18);
        ctx.beginPath(); ctx.arc(cx, cy, R * Math.min(1, prog), 0, Math.PI * 2); ctx.fill();
      }
      // 플레이어: 누른(또는 처리된) 뒤 밖으로 이동
      const mv = K.clamp((u - pn.move) / 180, 0, 1);
      const px = cx + K.lerp(0, R * 1.55, mv);
      K.dot(ctx, px, cy, 6, C.s1, C.paper);
      // 결과
      const hitLocal = pn.start + P.W;
      if (u >= hitLocal) {
        if (pn.local) {
          // 내 화면에서는 이미 피한 것처럼 보이지만, 서버 판정은 내려오는 시간만큼 늦게 도착한다
          const verdictAt = P.judge === 'client' || P.judge === 'roll' ? hitLocal : Math.max(hitLocal, P.W + P.rtt / 2);
          if (u >= verdictAt) {
            const hit = !dodgedServer;
            K.text(ctx, hit ? (mv > 0.5 ? TR`피했는데 맞음` : TR`피격`) : TR`회피 성공`, pw / 2, h - 14, { align: 'center', size: 12.5, weight: 700, color: hit ? C.badInk : C.goodInk });
          } else K.text(ctx, TR`판정 기다리는 중…`, pw / 2, h - 14, { align: 'center', size: 11.5, color: C.muted });
        } else {
          K.text(ctx, dodgedServer ? TR`회피` : TR`적중`, pw / 2, h - 14, { align: 'center', size: 12.5, weight: 700, color: dodgedServer ? C.goodInk : C.badInk });
        }
      }
      if (u < pn.start) K.text(ctx, TR`아직 예고를 못 봄`, pw / 2, h - 14, { align: 'center', size: 11.5, color: C.muted });
      ctx.restore();
    });
  }

  /* ---------------- 막대 ---------------- */
  function drawBar() {
    const { ctx, w, h } = cvBar;
    const C = K.C;
    ctx.clearRect(0, 0, w, h);
    const p = parts(P.rtt);
    const segs = [
      [TR`패킷이 내려옴`, p.seeDown, C.s1],
      [TR`보간 대기`, p.seeInterp, C.s2],
      [TR`사람 반응`, p.react, C.s3],
      [TR`입력이 올라감`, p.up, C.s4],
      [TR`틱 대기`, p.tickWait, C.s5],
    ];
    const total = segs.reduce((a, s) => a + s[1], 0);
    const span = Math.max(P.W, total) * 1.08;
    const L = 8, Rr = w - 8;
    const X = v => L + (v / span) * (Rr - L);
    const y = 34, bh = 22;
    let acc = 0;
    segs.forEach(([name, v, col]) => {
      if (v <= 0.5) return;
      const x0 = X(acc), x1 = X(acc + v);
      // 돌려받은 구간과 겹치는 칸은 흐리게, 글자는 생략 (그 위에 “여유” 표시가 올라간다)
      const back = p.comp > 0 && acc + v > total - p.comp + 0.5;
      ctx.fillStyle = back && acc >= total - p.comp - 0.5 ? K.alpha(col, 0.3) : col;
      K.rr(ctx, x0 + 1, y, Math.max(1, x1 - x0 - 2), bh, 3); ctx.fill();
      ctx.font = K.font(10.5, 600);
      const lab = `${name} ${Math.round(v)}`;
      if (back) { /* 글자 생략 */ } else if (ctx.measureText(lab).width + 10 < x1 - x0) K.text(ctx, lab, (x0 + x1) / 2, y + bh / 2, { align: 'center', size: 10.5, weight: 600, color: '#fff' });
      else if (ctx.measureText(String(Math.round(v))).width + 8 < x1 - x0) K.text(ctx, String(Math.round(v)), (x0 + x1) / 2, y + bh / 2, { align: 'center', size: 10.5, weight: 600, color: '#fff' });
      acc += v;
    });
    // 되감기로 돌려받는 시간
    if (p.comp > 0) {
      const x0 = X(total - p.comp), x1 = X(total);
      ctx.strokeStyle = C.ink2; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x0, y - 6); ctx.lineTo(x0, y - 12); ctx.lineTo(x1, y - 12); ctx.lineTo(x1, y - 6); ctx.stroke();
      K.text(ctx, TR`${P.judge === 'client' ? TR`내 화면 기준 판정으로` : P.judge === 'roll' ? TR`누른 프레임 기준 판정으로` : TR`되감기로`} 돌려받음 ${Math.round(p.comp)}ms`, (x0 + x1) / 2, y - 21, { align: 'center', size: 10.5, weight: 600, color: C.ink });
    }
    // 적중 시각
    const xw = X(P.W);
    ctx.strokeStyle = C.bad; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(xw, y - 8); ctx.lineTo(xw, y + bh + 8); ctx.stroke();
    K.text(ctx, TR`공격 적중 (${K.ms(P.W)})`, Math.min(xw, Rr - 4), y + bh + 18, { align: xw > Rr - 90 ? 'right' : 'center', size: 11, weight: 700, color: C.badInk });
    const usedEnd = X(p.used);
    if (p.used > P.W) {
      ctx.fillStyle = K.alpha(C.bad, 0.18);
      ctx.fillRect(xw, y - 4, usedEnd - xw, bh + 8);
    } else {
      ctx.strokeStyle = C.goodInk; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2;
      ctx.strokeRect(usedEnd, y + 3, xw - usedEnd, bh - 6);
      ctx.setLineDash([]);
      if (xw - usedEnd > 56) K.text(ctx, TR`여유 ${Math.round(P.W - p.used)}ms`, (usedEnd + xw) / 2, y + bh / 2, { align: 'center', size: 10.5, weight: 600, color: C.goodInk });
    }
    // 범례 (좁은 화면은 두 줄)
    const items = segs.filter(s => s[1] > 0.5);
    let lx = L, ly = h - 30;
    items.forEach(([name, v, col]) => {
      const txt = `${name} ${Math.round(v)}ms`;
      ctx.font = K.font(11);
      const tw = ctx.measureText(txt).width + 22;
      if (lx + tw > Rr) { lx = L; ly += 16; }
      ctx.fillStyle = col; K.rr(ctx, lx, ly - 5, 10, 10, 2); ctx.fill();
      K.text(ctx, txt, lx + 14, ly, { size: 11, color: C.ink2 });
      lx += tw;
    });
  }

  /* ---------------- 곡선 ---------------- */
  const cBox = () => ({ x: 50, y: 22, w: cvCurve.w - 64, h: cvCurve.h - 56 });
  function drawCurve() {
    const { ctx, w, h } = cvCurve;
    const C = K.C;
    ctx.clearRect(0, 0, w, h);
    const box = cBox();
    const lo = Math.min(-400, P.W - 900), hi = Math.max(200, P.W);
    const step = (hi - lo) > 2000 ? 1000 : 250;
    const ticks = []; for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
    const sc = K.plot(ctx, box, { x0: 0, x1: 400, y0: lo, y1: hi, yTicks: ticks, yFmt: v => v + '', xTicks: [0, 100, 200, 300, 400], xFmt: v => v + 'ms', yTitle: TR`여유 시간 (ms, 0보다 아래면 못 피함)`, xTitle: TR`핑` });
    ctx.fillStyle = K.alpha(C.bad, 0.06);
    ctx.fillRect(box.x, sc.y(0), box.w, sc.y(lo) - sc.y(0));
    K.hline(ctx, sc, 0, { color: C.badInk });
    [['now', C.s1], ['lagcomp', C.s2], ['client', C.s3], ['roll', C.s4]].forEach(([j, col]) => {
      const pts = [];
      for (let r = 0; r <= 400; r += 10) pts.push([r, K.clamp(parts(r, j).margin, lo, hi)]);
      K.line(ctx, sc, pts, col, j === P.judge ? 2.5 : 2);
    });
    const x = sc.x(P.rtt);
    ctx.strokeStyle = C.ink2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, box.y); ctx.lineTo(x, box.y + box.h); ctx.stroke(); ctx.setLineDash([]);
    const m = parts(P.rtt).margin;
    K.dot(ctx, x, sc.y(K.clamp(m, lo, hi)), 5, P.judge === 'now' ? C.s1 : P.judge === 'lagcomp' ? C.s2 : P.judge === 'roll' ? C.s4 : C.s3);
    K.text(ctx, TR`지금 ${P.rtt}ms`, Math.min(x + 6, box.x + box.w - 60), box.y + 8, { size: 11, weight: 600, color: C.ink });
  }
  K.hover(cvCurve, x => {
    const box = cBox();
    const r = Math.round(((x - box.x) / box.w) * 40) * 10;
    if (r < 0 || r > 400) return null;
    const f = j => { const m = parts(r, j).margin; return `${Math.round(m)}ms${m < 0 ? TR` (못 피함)` : ''}`; };
    return TR`핑 <b>${r}ms</b><br>서버 현재 기준 ${f('now')}<br>지연 보상 ${f('lagcomp')}<br>클라이언트 판정 ${f('client')}<br>롤백 ${f('roll')}`;
  });

  /* ---------------- 수치·해설 ---------------- */
  function updateText() {
    const p = parts(P.rtt);
    const net = p.seeDown + p.seeInterp + p.up + p.tickWait - p.comp;
    stLost.set(K.ms(Math.max(0, net)), net > P.W * 0.4 ? 'bad' : net > P.W * 0.2 ? 'warn' : 'good', TR`예고 ${K.ms(P.W)} 중`);
    stMargin.set(K.ms(p.margin), p.margin < 0 ? 'bad' : p.margin < 100 ? 'warn' : 'good');
    stRes.set(p.margin < 0 ? TR`못 피함` : TR`피할 수 있음`, p.margin < 0 ? 'bad' : 'good');
    const mp = maxPing(P.judge);
    stMax.set(Number.isFinite(mp) ? (mp < 0 ? TR`0에서도 불가` : K.ms(mp)) : TR`1초 넘게@@값 칸에 홀로 쓰는 말`, mp < 60 ? 'bad' : mp < 150 ? 'warn' : 'good');
    let msg = genreSay ? genreSay + K.sp : '';
    if (p.margin < 0) {
      msg = TR`${K.flag('bad')}${msg}예고 ${K.ms(P.W)} 중 네트워크가 ${K.ms(Math.max(0, net))}, 사람 반응이 ${K.ms(P.react)}를 씁니다. <b>${K.ms(-p.margin)} 모자라서 실력과 상관없이 맞습니다</b>. 플레이어는 “분명 피했는데 맞았다”(씹힘·롤백)고 느낍니다.`;
      if (P.judge === 'now') msg += TR` 지연 보상이나 예고 예약으로 네트워크가 쓰는 시간을 줄일 수 있습니다.`;
    } else if (p.margin < 100) {
      msg = TR`${K.flag('warn')}${msg}아슬아슬합니다. 여유가 ${K.ms(p.margin)}뿐이라 핑이 조금만 튀어도 억울한 피격이 생깁니다.`;
    } else {
      msg = TR`${K.flag('good')}${msg}여유가 ${K.ms(p.margin)} 남습니다. 이 게임은 핑 ${Number.isFinite(mp) ? K.ms(mp) : TR`1초 넘게`}까지 버팁니다.`;
    }
    if (P.judge === 'client') msg += TR` 클라이언트 판정은 내 화면만 보면 공정하지만 조작된 클라이언트의 판정도 그대로 인정한다는 대가가 있습니다.`;
    if (P.judge === 'lagcomp') msg += TR` 지연 보상은 내가 본 시점으로 판정해 주지만 다른 사람 화면에서는 “맞은 것 같은데 안 맞음”으로 보일 수 있습니다.`;
    if (P.judge === 'roll') msg += TR` 롤백은 내 입력을 누른 프레임 그대로 인정하지만 상대 동작을 늦게 본 ${K.ms(p.seeDown)}는 돌려받지 못합니다. 그만큼 동작 앞부분이 잘려 보입니다.`;
    F.say(msg);
  }

  let acc = 0;
  K.loop(root, dt => {
    ph += dt * P.speed;
    drawScene(); drawBar(); drawCurve();
    acc += dt;
    if (acc > 200) { acc = 0; updateText(); }
  });
  preset.press(1);
});
