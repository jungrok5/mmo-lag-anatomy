/* 같은 PC 두 클라이언트 중 한쪽만 NPC가 안 보일 때: 가장 흔한 경쟁 상태(로딩 중 도착한 등장 알림 폐기)와 진단 질문 */
K.register('npcmissing', function (root) {
  const F = K.frame(root, {
    kicker: '누구에게 번지나 · 한쪽 클라만 이상할 때',
    title: '같은 PC의 두 클라이언트, 한쪽만 NPC가 안 보인다면',
    lead: '같은 PC, 같은 회선이니 회선 탓은 거의 아닙니다. 서버가 그 클라이언트에게 무엇을 보냈는지, 클라이언트가 받은 것을 제대로 처리했는지, 두 클라이언트가 자원을 두고 부딪히는지 순서로 좁혀 갑니다. 위 타임라인은 가장 흔한 원인 하나를 보여 주고, 아래 질문에 답하면 후보를 좁혀 줍니다.',
    layout: 'side',
    tries: [
      '<b>클라 2 로딩 시간</b>을 400ms로 줄여 보세요. 등장 알림이 로딩이 끝난 뒤 도착해 NPC가 보입니다. 반대로 <b>서버 입장 처리 시간</b>을 100ms로 줄이면 클라 1도 알림을 놓칩니다. 서버가 빨라져서 생기는 버그입니다.',
      '<b>서버: 준비 완료 신호 뒤에 보내기</b> 또는 <b>클라: 로딩 중 받은 패킷 보관</b>을 켜 보세요. 어느 쪽이든 로딩 시간과 상관없이 NPC가 보입니다.',
      '아래 질문에 실제 상황대로 답해 보세요. 마지막에 이 백서의 원인 항목으로 연결됩니다.',
    ],
  });
  K.addStyle('npcmissing', `
    .nm-tree { display: grid; gap: 10px; }
    .nm-q { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 12px 14px; display: grid; gap: 8px; }
    .nm-q .q { font-weight: 700; font-size: 14.5px; }
    .nm-q .h { font-size: 13px; color: var(--ink-2); }
    .nm-q .row { display: flex; flex-wrap: wrap; gap: 6px; }
    .nm-path { font-size: 12.5px; color: var(--muted); display: flex; flex-wrap: wrap; gap: 4px 10px; }
    .nm-leaf { border-color: var(--accent); background: var(--surface); }
    .nm-leaf ul { margin: 0; padding-left: 1.2em; display: grid; gap: 4px; font-size: 14px; }
  `);

  const P = { rtt: 60, enter: 450, load1: 400, load2: 1300, serverWait: false, clientQueue: false, n: 12 };
  const cv = K.canvas(F.stage, { height: w => (w < 520 ? 200 : 176), caption: '존에 들어간 직후 3초', right: '<span class="legend"><span>▲ 등장 알림 도착</span><span>× 버림</span><span><i class="box" style="background:var(--s4);opacity:.5"></i>맵 로딩</span></span>' });
  const res = K.el('div', { class: 'sim-stats' });
  F.stage.append(res);
  const st1 = K.stat(res, { label: '클라 1에 보이는 NPC', unit: `/ ${P.n}` });
  const st2 = K.stat(res, { label: '클라 2에 보이는 NPC', unit: `/ ${P.n}` });

  const g1 = K.group(F.controls, '상황');
  K.slider(g1, { label: '핑', min: 0, max: 300, step: 10, value: P.rtt, unit: 'ms', onInput: v => { P.rtt = v; } });
  K.slider(g1, { label: '서버 입장 처리 시간', min: 50, max: 1500, step: 50, value: P.enter, fmt: v => K.ms(v), onInput: v => { P.enter = v; }, hint: '캐릭터 정보를 불러오고 시야에 등록하는 데 걸리는 시간. 끝나면 곧바로 주변 NPC 등장 알림을 보냅니다.' });
  K.slider(g1, { label: '클라 1 로딩 시간', min: 100, max: 2500, step: 50, value: P.load1, fmt: v => K.ms(v), onInput: v => { P.load1 = v; } });
  K.slider(g1, { label: '클라 2 로딩 시간', min: 100, max: 2500, step: 50, value: P.load2, fmt: v => K.ms(v), onInput: v => { P.load2 = v; }, hint: '같은 PC에서 두 클라이언트가 동시에 로딩하거나 한쪽이 백그라운드 창(뒤에 가려진 창)이면, CPU·디스크를 나눠 쓰고 처리도 제한되어 그쪽 로딩이 길어지기 쉽습니다.' });
  const g2 = K.group(F.controls, '고치는 방법');
  K.toggle(g2, { label: '서버: “준비 완료” 신호 뒤에 주변 정보 보내기', value: P.serverWait, onChange: v => { P.serverWait = v; } });
  K.toggle(g2, { label: '클라: 로딩 중 받은 패킷 보관했다 처리', value: P.clientQueue, onChange: v => { P.clientQueue = v; } });

  // 서버는 입장 처리가 끝나면 주변 NPC 등장 알림을 보내고, 그 뒤로는 “아는 개체”의 위치만 갱신한다.
  function outcome(load) {
    const sendAt = P.serverWait ? Math.max(P.enter, load + P.rtt / 2) : P.enter;
    const arrive = [];
    for (let i = 0; i < P.n; i++) arrive.push(sendAt + P.rtt / 2 + i * 6);
    const ok = arrive.map(a => a >= load || P.clientQueue);
    return { arrive, ok, seen: ok.filter(Boolean).length, readyAt: load };
  }

  function draw() {
    const { ctx, w, h } = cv;
    const C = K.C;
    ctx.clearRect(0, 0, w, h);
    const L = w < 520 ? 52 : 70, R = w - 12, span = 3000;
    const X = v => L + (v / span) * (R - L);
    const lanes = [['서버', null], ['클라 1', P.load1], ['클라 2', P.load2]];
    const laneH = (h - 34) / 3;
    lanes.forEach(([name, load], i) => {
      const y = 10 + i * laneH + laneH / 2;
      K.text(ctx, name, L - 8, y, { align: 'right', size: 11.5, weight: 700, color: C.ink });
      ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(L, y + 0.5); ctx.lineTo(R, y + 0.5); ctx.stroke();
      if (load == null) {
        const sendAt1 = P.serverWait ? null : P.enter;
        ctx.fillStyle = C.ink2;
        ctx.fillStyle = K.alpha(C.ink2, 0.25); K.rr(ctx, X(0), y - 4, X(P.enter) - X(0), 8, 3); ctx.fill(); ctx.fillStyle = C.ink2;
        if (X(P.enter) - X(0) > 58) K.text(ctx, '입장 처리', X(0) + 4, y + 13, { size: 10.5, color: C.muted });
        if (sendAt1 != null) {
          ctx.fillRect(X(P.enter) - 1, y - 6, 2, 12);
          K.text(ctx, '주변 NPC 등장 알림 발송', X(P.enter) + 6, y - 11, { size: 10.5, color: C.ink2 });
        } else {
          [P.load1, P.load2].forEach(ld => { const sx = X(Math.max(P.enter, ld + P.rtt / 2)); ctx.fillRect(sx - 1, y - 6, 2, 12); });
          K.text(ctx, '준비 완료를 받은 뒤 각자에게 발송', X(Math.max(P.enter, Math.min(P.load1, P.load2) + P.rtt / 2)) + 6, y - 11, { size: 10.5, color: C.ink2 });
        }
        return;
      }
      ctx.fillStyle = K.alpha(C.s4, 0.45);
      K.rr(ctx, X(0), y - 6, X(load) - X(0), 12, 3); ctx.fill();
      if (X(load) - X(0) > 60) K.text(ctx, '맵 로딩', X(0) + 6, y, { size: 10.5, weight: 600, color: C.ink });
      ctx.fillStyle = C.ink; ctx.fillRect(X(load) - 1, y - 9, 2, 18);
      const o = outcome(load);
      const narrow = w < 520;
      const label = o.seen === P.n ? (narrow ? '모두 보임' : `NPC ${o.seen}마리 모두 보임`) : o.seen === 0 ? (narrow ? 'NPC 안 보임' : '등장 알림을 모두 버림 → NPC 안 보임') : `${P.n - o.seen}마리 안 보임`;
      // 오른쪽 결과 글자와 겹치면 '처리기 준비' 글자는 생략한다 (글자 폭은 대략 11px로 어림)
      if (X(load) + 4 + 58 < R - label.length * 11 - 6) K.text(ctx, '처리 준비', X(load) + 4, y + 13, { size: 10, color: C.muted });
      o.arrive.forEach((a, k) => {
        const x = X(a), yy = y - 14 - (k % 3) * 3;
        if (o.ok[k]) { ctx.fillStyle = C.s1; ctx.beginPath(); ctx.moveTo(x, yy - 4); ctx.lineTo(x + 4, yy + 3); ctx.lineTo(x - 4, yy + 3); ctx.closePath(); ctx.fill(); }
        else { ctx.strokeStyle = C.bad; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 3, yy - 3); ctx.lineTo(x + 3, yy + 3); ctx.moveTo(x + 3, yy - 3); ctx.lineTo(x - 3, yy + 3); ctx.stroke(); }
      });
      K.text(ctx, label, R, y + 13, { align: 'right', size: 11, weight: 700, color: o.seen === P.n ? C.goodInk : C.badInk });
    });
    for (let s = 0; s <= 3; s++) K.text(ctx, `${s}초`, X(s * 1000), h - 8, { align: s === 0 ? 'left' : 'center', size: 10, mono: true, color: C.muted });
  }

  /* ---------------- 진단 질문 ---------------- */
  const Q = {
    q1: { q: '두 캐릭터가 같은 채널, 같은 인스턴스, 같은 퀘스트 단계인가요?', h: '퀘스트 진행도에 따라 NPC를 다르게 보여 주는 “페이즈”가 있는 게임이 많습니다.', yes: 'q2', no: 'phase' },
    q2: { q: '안 보이는 NPC의 이름표, 그림자, 클릭 판정은 있나요? (캐릭터 모델만 없나요?)', h: '이름표가 있으면 서버는 보냈고 클라이언트가 그리지 못한 것입니다.', yes: 'render', no: 'q3' },
    q3: { q: '그 자리를 벗어났다가 돌아오거나, 채널을 옮기면 보이나요?', h: '다시 시야에 들어가면 서버가 등장 알림을 새로 보냅니다.', yes: 'missed', no: 'q4' },
    q4: { q: '안 보이는 쪽 창을 앞으로 가져와 활성화하면 나아지나요?', h: '백그라운드 창은 프레임이나 처리를 제한하는 게임·OS 설정이 많습니다.', yes: 'background', no: 'q5' },
    q5: { q: '같은 버전의 두 번째 클라이언트를 다른 PC(다른 회선)에서 켜면 정상인가요?', h: '같은 PC·같은 공인 IP일 때만 생기는 충돌이 있습니다. 다른 PC에서 패치가 다른 설치본을 쓰면 버전 차이와 헷갈리니 버전을 맞춰서 봅니다.', yes: 'samepc', no: 'q6' },
    q6: { q: '사람이 많은 곳에서, 멀리 있는 NPC만 안 보이나요?', h: '서버가 연결마다 보낼 양에 한도를 두고 가까운 것부터 보내는 경우입니다.', yes: 'budget', no: 'other' },
  };
  const LEAF = {
    phase: { t: '정상 동작일 가능성이 큽니다: 채널·인스턴스·페이즈 차이', c: ['pt-phase'], check: '두 캐릭터의 채널 번호, 인스턴스 ID, 해당 퀘스트 진행 단계를 비교합니다.' },
    render: { t: '서버는 보냈는데 그리지 못했습니다', c: ['pt-asset-lock', 'pt-vram', 'pt-display-option', 'pt-version'], check: '클라이언트 로그의 에셋 로딩 오류, 캐시 폴더 공유 여부, 그래픽 옵션(표시 인원 제한), 두 클라이언트의 버전을 확인합니다.' },
    missed: { t: '등장 알림 하나가 빠졌습니다', c: ['pt-loading-drop', 'pt-spawn-burst', 'pt-background', 'pt-aoi-race', 'pt-baseline', 'pt-id-reuse'], check: '입장 직후 패킷 로그에서 해당 NPC의 등장 알림이 도착했는지, 도착 시각이 패킷 처리 준비보다 빠른지, 그때 창이 백그라운드였는지, 같은 ID의 개체가 직전에 사라진 적이 있는지 확인합니다. 위 타임라인이 이 경우입니다.' },
    background: { t: '백그라운드 창이 처리를 덜 하고 있습니다', c: ['pt-background'], check: '백그라운드 프레임 제한, 절전, 엔진의 백그라운드 실행 설정을 확인합니다. 오래 백그라운드에 두면 수신 버퍼가 넘쳐 알림이 사라질 수 있습니다.' },
    samepc: { t: '같은 PC·같은 IP라서 생기는 충돌입니다', c: ['pt-port-collision', 'pt-session-key', 'pt-multiclient'], check: '두 클라이언트가 같은 로컬 UDP 포트를 쓰는지, 서버가 IP나 기기 ID로 세션을 구분하는지, 멀티 클라이언트 제한 정책이 있는지 확인합니다.' },
    budget: { t: '서버가 보낼 양을 줄이고 있습니다', c: ['pt-priority', 'pt-display-option'], check: '연결별 전송 예산과 우선순위 설정, 표시 인원 상한을 확인합니다. 한쪽만 그렇다면 그 연결의 대역폭 추정치가 낮게 잡혔는지 봅니다.' },
    other: { t: '드문 경우입니다: 로그로 서버 개발자와 함께 확인하세요', c: ['pt-version', 'pt-clock-hold'], check: '안 보이는 NPC의 ID, 좌표, 시각을 적고 서버의 “이 연결에 보낸 개체 목록”과 비교합니다.' },
  };
  const tree = K.el('div', { class: 'nm-tree' });
  F.body.after(K.el('div', { class: 'cv-cap' }, K.el('b', { text: '진단 질문' }), K.el('span', { text: '실제 상황대로 답하세요' })), tree);
  let path = [];
  function render() {
    tree.innerHTML = '';
    const crumbs = K.el('div', { class: 'nm-path' });
    path.forEach(([id, ans]) => crumbs.append(K.el('span', { text: `${Q[id].q.replace(/\?.*$/, '?')} → ${ans === 'yes' ? '예' : '아니오'}` })));
    if (path.length) tree.append(crumbs);
    const cur = path.length ? Q[path[path.length - 1][0]][path[path.length - 1][1]] : 'q1';
    if (Q[cur]) {
      const box = K.el('div', { class: 'nm-q' }, K.el('div', { class: 'q', text: Q[cur].q }), K.el('div', { class: 'h', text: Q[cur].h }));
      const row = K.el('div', { class: 'row' });
      K.button(row, { label: '예', kind: 'small primary', onClick: () => { path.push([cur, 'yes']); render(); } });
      K.button(row, { label: '아니오', kind: 'small', onClick: () => { path.push([cur, 'no']); render(); } });
      if (path.length) K.button(row, { label: '한 단계 뒤로', kind: 'small ghost', onClick: () => { path.pop(); render(); } });
      box.append(row);
      tree.append(box);
    } else {
      const lf = LEAF[cur];
      const names = lf.c.map(id => {
        const c = (window.DATA && DATA.causes.find(x => x.id === id));
        return `<li><a href="#c-${id}">${c ? c.t : id}</a>${c ? ` <span class="note">${c.s}</span>` : ''}</li>`;
      }).join('');
      const box = K.el('div', { class: 'nm-q nm-leaf' }, K.el('div', { class: 'q', text: lf.t }), K.el('ul', { html: names }), K.el('div', { class: 'h', html: `<b>확인 방법</b> ${lf.check}` }));
      const row = K.el('div', { class: 'row' });
      K.button(row, { label: '처음부터', kind: 'small', onClick: () => { path = []; render(); } });
      K.button(row, { label: '한 단계 뒤로', kind: 'small ghost', onClick: () => { path.pop(); render(); } });
      box.append(row);
      tree.append(box);
    }
  }
  render();

  let acc = 200; // 첫 프레임에 바로 해설과 수치를 채운다
  K.loop(root, dt => {
    draw();
    acc += dt;
    if (acc < 200) return;
    acc = 0;
    const o1 = outcome(P.load1), o2 = outcome(P.load2);
    st1.set(String(o1.seen), o1.seen === P.n ? 'good' : 'bad');
    st2.set(String(o2.seen), o2.seen === P.n ? 'good' : 'bad');
    let msg;
    if ((o1.seen < P.n) !== (o2.seen < P.n)) {
      const [gn, gl, bn, bl, bo] = o2.seen < P.n ? [1, P.load1, 2, P.load2, o2] : [2, P.load2, 1, P.load1, o1];
      const eun = n => (n === 1 ? '은' : '는');
      const lost = P.n - bo.seen;
      msg = `${K.flag('bad')}클라 ${gn}${eun(gn)} 로딩(${K.ms(gl)})이 끝난 뒤 등장 알림을 받아 NPC가 모두 보입니다. 클라 ${bn}${eun(bn)} 로딩(${K.ms(bl)})이 길어서, 알림 ${lost === P.n ? '전부' : `${P.n}개 중 ${lost}개`}가 패킷 처리 준비가 끝나기 전에 도착해 <b>버려졌습니다</b>. 서버는 이미 보낸 것으로 처리하므로 다시 보내지 않고, 그 NPC${lost === P.n ? '' : ` ${lost}마리`}가 시야에서 나갔다 들어오기 전까지 클라 ${bn}에는 <b>안 보입니다</b>.`;
    }
    else if (o1.seen < P.n && o2.seen < P.n) msg = `${K.flag('bad')}두 클라이언트 모두 로딩이 끝나기 전에 등장 알림이 도착해 버려졌습니다(클라 1은 ${P.n - o1.seen}마리, 클라 2는 ${P.n - o2.seen}마리 안 보임). 이 구조에서는 로딩이 느린 쪽이 먼저 문제를 겪을 뿐, 누구에게나 생길 수 있습니다.`;
    else msg = `${K.flag('good')}${P.serverWait ? '서버가 준비 완료 신호를 받은 뒤에 보내므로' : P.clientQueue ? '클라이언트가 로딩 중 받은 패킷을 보관했다가 처리하므로' : '등장 알림이 로딩이 끝난 뒤 도착해'} 두 클라이언트 모두 NPC가 보입니다.`;
    F.say(msg);
  });
  K.onTheme(draw);
});
