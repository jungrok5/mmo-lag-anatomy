/* =========================================================================
   app.js — 데이터로 본문을 채우고(원인 카드, 증상 사전, 지도, 용어), 진단 도우미와 내비게이션을 붙인다.
   ========================================================================= */
(function () {
  const D = window.DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const LAYER = Object.fromEntries(D.layers.map((l, i) => [l.id, Object.assign({ n: i + 1 }, l)]));
  const SYM = Object.fromEntries(D.symptoms.map(s => [s.id, s]));
  const FX = Object.fromEntries(D.fx.map(f => [f.id, f]));
  const WHO = { me: '나만', home: '같은 집', region: '특정 지역·통신사', zone: '특정 장소·채널', server: '서버 전체', feature: '특정 기능만' };
  const WHEN = { always: '항상', peak: '저녁 피크 시간', event: '사람이 몰릴 때', login: '접속·점검 직후', idle: '가만히 있다가', random: '가끔 무작위로', periodic: '일정한 주기로', uptime: '오래 켜 둘수록', moving: '이동·지역 전환 때', action: '특정 행동을 할 때' };
  const SIMNAME = {
    lab: '렉 실험실', queue: '대기열 실험', journey: '지연 분해', frames: '프레임 실험', cpu: 'CPU 스케줄러 실험', bloat: '버퍼블로트 실험',
    distance: '거리·경로 실험', timeouts: '타임아웃 사다리', nic: 'NIC 실험', rush: '접속 폭주 실험', hol: 'TCP vs UDP 실험', nagle: 'Nagle 실험',
    sndbuf: '느린 손님 실험', tick: '틱 예산 실험', locks: '락 실험', gc: 'GC 실험', leak: '메모리 누수 실험', ladder: '숫자 감각',
    disk: '디스크 실험', dbpool: 'DB 실험', arch: '서버 구성 실험',
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ARROW = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7h8m-3-3 3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const symChip = (id, link = true) => {
    const s = SYM[id]; if (!s) return '';
    return link ? `<a class="sym" href="#s-${id}">${K.glyph(id)}${s.name}</a>` : `<span class="sym">${K.glyph(id)}${s.name}</span>`;
  };
  const fxTag = id => `<span class="fx">${K.fxIcon(id)}${FX[id].name}</span>`;

  /* ---------------- 테마 ---------------- */
  function setTheme(t) {
    if (t === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    $$('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', b.dataset.themeSet === t ? 'true' : 'false'));
    try { localStorage.setItem('lag-theme', t); } catch (e) { /* 저장 불가 환경 */ }
  }
  let savedTheme = 'system';
  try { savedTheme = localStorage.getItem('lag-theme') || 'system'; } catch (e) { /* 무시 */ }
  setTheme(savedTheme);
  $$('[data-theme-set]').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.themeSet)));

  /* ---------------- 히어로: 네 가지 재료 ---------------- */
  const thesis = $('#thesis');
  thesis.innerHTML = `<div class="thesis-head"><b>모든 렉은 네 가지 중 하나에서 시작합니다.</b> 원인이 어느 층에 있든 게임이 받는 피해는 이것뿐이고, 그 피해를 가리는 방식에 따라 렉의 모양이 정해집니다.</div>` +
    D.fx.map(f => `<div><span class="fx-name">${K.fxIcon(f.id).replace('<svg', '<svg width="16" height="16"')}${f.name}</span><p>${f.how}. ${f.desc.split('. ')[0].replace(/\.$/, '')}.</p></div>`).join('');

  /* ---------------- 기본 개념: 재료 → 대처 → 증상 ---------------- */
  const fxMap = $('#fx-map');
  fxMap.className = 'causes';
  fxMap.innerHTML = D.fx.map(f => `
    <div class="cause">
      <div class="cause-top"><h4>${K.fxIcon(f.id).replace('<svg', '<svg width="16" height="16" style="vertical-align:-2px;margin-right:6px"')}${f.name}<span class="en">${f.en}</span></h4><div class="chips">${f.sym.map(s => symChip(s)).join('')}</div></div>
      <div class="chain">
        <div class="step"><b>무슨 일</b>${f.how}. ${f.desc}</div><div class="arr">${ARROW}</div>
        <div class="step"><b>게임의 대처</b>${f.cope}</div><div class="arr">${ARROW}</div>
        <div class="step out"><b>가리지 못하면</b>${f.sym.map(s => SYM[s].name).join(', ')}</div>
      </div>
    </div>`).join('');

  /* ---------------- 시간 감각 표 ---------------- */
  const tb = $('#time-table tbody');
  const lmin = Math.log10(0.0001), lmax = Math.log10(5000);
  tb.innerHTML = D.times.map(([name, ms, why]) => {
    const w = ((Math.log10(ms) - lmin) / (lmax - lmin)) * 100;
    return `<tr><td>${name}</td><td class="v"><span class="bar-inline" style="width:${Math.max(2, w * 0.9).toFixed(1)}px"></span>${K.ms(ms)}</td><td>${why}</td></tr>`;
  }).join('');
  // 막대는 로그 눈금: 0.1µs ~ 5초를 90px 안에
  const tcap = document.createElement('p');
  tcap.className = 'note';
  tcap.textContent = '막대 길이는 로그 눈금입니다. 한 칸 길어질 때마다 약 10배 느립니다.';
  $('#time-table').closest('.table-wrap').after(tcap);

  /* ---------------- 레이어 지도 & 내비 ---------------- */
  const byLayer = {};
  D.causes.forEach(c => { (byLayer[c.layer] = byLayer[c.layer] || []).push(c); });
  const topSyms = id => {
    const cnt = {};
    (byLayer[id] || []).forEach(c => c.sym.forEach(s => { cnt[s] = (cnt[s] || 0) + 1; }));
    return Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
  };
  const dmin = Math.log10(0.05), dmax = Math.log10(5000);
  const dpos = v => ((Math.log10(Math.max(0.05, v)) - dmin) / (dmax - dmin)) * 100;
  $('#layer-map').innerHTML = D.layers.map((l, i) => {
    const a = dpos(l.delay[0]), b = dpos(l.delay[1]);
    return `<a class="lm-row" href="#l-${l.id}">
      <span class="i">${String(i + 1).padStart(2, '0')}</span>
      <span class="n">${l.name}<small>${l.side} · 원인 ${(byLayer[l.id] || []).length}가지</small></span>
      <span class="d">${l.what}</span>
      <span class="t">평소 ${K.ms(l.delay[0])} · 나쁠 때 ${K.ms(l.delay[1])}<span class="track"><i style="left:${a.toFixed(1)}%;width:${Math.max(1.5, b - a).toFixed(1)}%"></i></span></span>
      <span class="g" title="이 층에서 자주 생기는 증상">${topSyms(l.id).map(s => K.glyph(s)).join('')}</span>
    </a>`;
  }).join('') + '<p class="note" style="margin-top:6px">막대: 이 층이 더하는 지연의 범위(로그 눈금, 0.05ms ~ 5초). 오른쪽 그림: 이 층에서 가장 흔한 증상.</p>';

  $('#nav-layers').innerHTML = D.layers.map((l, i) =>
    `<li><a href="#l-${l.id}"><span class="dot">${i + 1}</span><span>${l.short}</span><span class="side">${(byLayer[l.id] || []).length}</span></a></li>`).join('');

  /* ---------------- 레이어 장: 머리말 + 원인 카드 ---------------- */
  $$('section.layer').forEach(sec => {
    const l = LAYER[sec.dataset.layer];
    const n = (byLayer[l.id] || []).length;
    $('.ch-kicker', sec).innerHTML = `<span class="idx">L${String(l.n).padStart(2, '0')}</span>레이어 ${l.n} / ${D.layers.length} · ${l.side} · 원인 ${n}가지`;
    const h3 = $('h3.sec:last-of-type', sec);
    if (h3) h3.innerHTML = `이 층에서 렉을 만드는 원인 <span class="mono">${n}가지</span>`;
  });
  function causeHTML(c) {
    const meta = [
      `<span><span class="k">재료</span>${c.fx.map(fxTag).join(' ')}</span>`,
      `<span><span class="k">누가</span>${c.who.map(w => WHO[w]).join(', ')}</span>`,
      `<span><span class="k">언제</span>${c.when.map(w => WHEN[w]).join(', ')}</span>`,
      c.sim ? `<span><span class="k">실험</span><a href="#sim-${c.sim}">${SIMNAME[c.sim] || c.sim}</a></span>` : '',
    ].join('');
    const dl = [
      c.num ? `<dt>수치 감각</dt><dd>${c.num}</dd>` : '',
      c.fix ? `<dt>서버·클라팀의 대응</dt><dd>${c.fix}</dd>` : '',
      c.more ? `<dt>더 알아보기</dt><dd>${c.more}</dd>` : '',
    ].join('');
    return `<article class="cause" id="c-${c.id}">
      <div class="cause-top"><h4>${c.t}<span class="en">${esc(c.en)}</span></h4><div class="chips">${c.sym.map(s => symChip(s)).join('')}</div></div>
      <p class="short">${c.s}</p>
      <div class="chain">
        <div class="step"><b>왜</b>${c.c[0]}</div><div class="arr">${ARROW}</div>
        <div class="step"><b>그러면</b>${c.c[1]}</div><div class="arr">${ARROW}</div>
        <div class="step out"><b>화면에서는</b>${c.c[2]}</div>
      </div>
      <div class="cause-meta">${meta}</div>
      ${dl ? `<details><summary>수치 감각과 대응</summary><div class="more"><dl>${dl}</dl></div></details>` : ''}
    </article>`;
  }
  $$('[data-causes]').forEach(box => { box.innerHTML = (byLayer[box.dataset.causes] || []).map(causeHTML).join(''); });

  /* ---------------- 증상 사전 ---------------- */
  const symCauses = {};
  D.causes.forEach(c => c.sym.forEach(s => { (symCauses[s] = symCauses[s] || []).push(c); }));
  $('#sym-grid').innerHTML = D.symptoms.map(s => {
    const list = symCauses[s.id] || [];
    const groups = {};
    list.forEach(c => { (groups[c.layer] = groups[c.layer] || []).push(c); });
    const links = D.layers.filter(l => groups[l.id]).map(l =>
      `<span><span class="note">${l.short}</span> ${groups[l.id].map(c => `<a href="#c-${c.id}">${c.t}</a>`).join(', ')}</span>`).join('');
    return `<article class="sym-card" id="s-${s.id}">
      <header>${K.glyph(s.id)}<div><h4>${s.name}</h4><div class="alias">${s.alias}</div></div></header>
      <canvas data-anim="${s.id}" height="56" aria-label="${s.name} 움직임 예시" role="img"></canvas>
      <p>${s.what}</p>
      <div class="looks"><b>화면에서는</b>${s.looks}</div>
      <p><b>단서</b> ${s.tell}</p>
      <details class="cause-links"><summary>이 증상을 만드는 원인 ${list.length}가지</summary><div class="list">${links}</div></details>
      <div class="actions">
        ${s.preset ? `<button type="button" class="btn small primary" data-lab="${s.preset}">실험실에서 재현하기</button>` : ''}
        <button type="button" class="btn small" data-tri="${s.id}">진단 도우미로</button>
      </div>
    </article>`;
  }).join('');
  $$('[data-lab]').forEach(b => b.addEventListener('click', () => {
    K.emit('lab:preset', b.dataset.lab);
    $('#lab').scrollIntoView({ behavior: K.reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }));
  $$('[data-tri]').forEach(b => b.addEventListener('click', () => {
    K.emit('triage:sym', b.dataset.tri);
    $('#triage').scrollIntoView({ behavior: K.reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }));

  // 증상 카드의 작은 움직임 예시. 3.2초 주기로 점 하나가 왼쪽에서 오른쪽으로 간다.
  const ANIM = {
    normal: u => ({ x: u }),
    stutter: u => { const k = Math.floor(u * 14); return { x: (k + (Math.sin(k * 7.3) > 0.1 ? 1 : 0.35)) / 15 }; },
    teleport: u => (u < 0.3 ? { x: u } : u < 0.55 ? { x: 0.3, wait: true } : { x: u }),
    rubber: u => (u < 0.45 ? { x: u } : u < 0.5 ? { x: 0.3 + (0.5 - u) * 3, snap: true } : { x: 0.3 + (u - 0.5) * 1.2 }),
    burst: u => (u < 0.25 ? { x: u * 1.0 } : u < 0.55 ? { x: 0.25, wait: true } : u < 0.65 ? { x: 0.25 + (u - 0.55) * 4.5 } : { x: 0.7 + (u - 0.65) * 0.85 }),
    slowmo: u => ({ x: u * 0.42 }),
    delay: u => (u < 0.3 ? { x: 0.05, click: true } : { x: 0.05 + (u - 0.3) * 1.3 }),
    freeze: u => (u < 0.35 ? { x: u } : u < 0.7 ? { x: 0.35, pause: true } : { x: 0.35 + (u - 0.7) }),
    dropped: u => ({ x: u, skill: u > 0.35 && u < 0.6 }),
    disconnect: u => (u < 0.5 ? { x: u } : { x: 0.5, cut: true }),
    noconnect: u => ({ spin: true, x: 0.5, u }),
  };
  const animCanvases = $$('canvas[data-anim]');
  function drawAnims(now) {
    const C = K.C;
    animCanvases.forEach(cv => {
      const w = cv.clientWidth || 280, h = 56, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      const ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const f = ANIM[cv.dataset.anim];
      const period = 3200;
      const u = K.reducedMotion ? 0.62 : (now % period) / period;
      const X = x => 16 + x * (w - 32), y = h / 2 + 4;
      ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(12, y + 10.5); ctx.lineTo(w - 12, y + 10.5); ctx.stroke();
      if (cv.dataset.anim === 'noconnect') {
        const a = (now / 180) % (Math.PI * 2);
        ctx.strokeStyle = C.ink2; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(w / 2, y - 4, 10, a, a + Math.PI * 1.4); ctx.stroke();
        K.text(ctx, '접속 중…', w / 2 + 20, y - 4, { size: 11, color: C.muted });
        return;
      }
      // 궤적: 최근 0.9초 동안 그려진 위치를 한 프레임(1/15초) 간격으로
      for (let i = 12; i >= 1; i--) {
        const uu = u - i * 0.022;
        if (uu < 0) continue;
        const p = f(uu);
        ctx.fillStyle = K.alpha(C.s2, 0.12 + 0.5 * (1 - i / 12));
        ctx.beginPath(); ctx.arc(X(p.x), y, 3, 0, Math.PI * 2); ctx.fill();
      }
      const p = f(u);
      if (p.cut) {
        ctx.fillStyle = K.alpha(C.ink2, 0.35);
        ctx.beginPath(); ctx.arc(X(p.x), y, 7, 0, Math.PI * 2); ctx.fill();
        K.text(ctx, '서버와의 연결이 끊어졌습니다', X(p.x) + 14, y - 12, { size: 11, weight: 600, color: C.badInk });
        return;
      }
      K.dot(ctx, X(p.x), y, 7, C.s2, C.paper);
      if (p.wait) K.text(ctx, '소식 없음…', X(p.x) + 12, y - 14, { size: 11, color: C.muted });
      if (p.pause) { ctx.fillStyle = C.ink2; ctx.fillRect(X(p.x) - 4, y - 24, 3, 9); ctx.fillRect(X(p.x) + 1, y - 24, 3, 9); }
      if (p.click) { ctx.strokeStyle = C.accent; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(p.x), y, 12 + (u * 40) % 8, 0, Math.PI * 2); ctx.stroke(); K.text(ctx, '눌렀는데…', X(p.x) + 20, y - 14, { size: 11, color: C.muted }); }
      if (p.snap) K.text(ctx, '휙', X(p.x) - 2, y - 16, { size: 11, weight: 700, color: C.badInk, align: 'center' });
      if (p.skill) {
        const k = (u - 0.35) / 0.25;
        ctx.strokeStyle = K.alpha(C.s1, 1 - k); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(X(0.35), y, 8 + k * 14, 0, Math.PI * 2); ctx.stroke();
        if (k > 0.4) K.text(ctx, '스킬 발동 안 됨', X(0.35) + 26, y - 16, { size: 11, weight: 600, color: C.badInk });
      }
    });
  }
  K.loop($('#sym-grid'), (dt, now) => drawAnims(now));

  /* ---------------- 진단 도우미 ---------------- */
  K.register('triage', function (root) {
    root.classList.add('sim');
    const st = { who: 'zone', when: new Set(['event']), sym: new Set(['slowmo']) };
    root.innerHTML = '';
    const form = K.el('form', { class: 'triage', on: { submit: e => e.preventDefault() } });
    const fsWho = K.el('fieldset', null, K.el('legend', { text: '1. 누가 겪고 있나요?' }));
    const whoOpts = K.el('div', { class: 'opts' });
    Object.entries(WHO).forEach(([k, v]) => {
      const id = 'tw-' + k;
      const inp = K.el('input', { type: 'radio', name: 'tri-who', id, value: k });
      inp.checked = st.who === k;
      inp.addEventListener('change', () => { st.who = k; update(); });
      whoOpts.append(inp, K.el('label', { for: id, text: v }));
    });
    fsWho.append(whoOpts);
    const fsWhen = K.el('fieldset', null, K.el('legend', { text: '2. 언제 생기나요? (여러 개 선택)' }));
    const whenOpts = K.el('div', { class: 'opts' });
    Object.entries(WHEN).forEach(([k, v]) => {
      const id = 'tn-' + k;
      const inp = K.el('input', { type: 'checkbox', id, value: k });
      inp.checked = st.when.has(k);
      inp.addEventListener('change', () => { inp.checked ? st.when.add(k) : st.when.delete(k); update(); });
      whenOpts.append(inp, K.el('label', { for: id, text: v }));
    });
    fsWhen.append(whenOpts);
    const fsSym = K.el('fieldset', null, K.el('legend', { text: '3. 어떤 모양인가요? (여러 개 선택)' }));
    const symOpts = K.el('div', { class: 'opts' });
    const symInputs = {};
    D.symptoms.forEach(s => {
      const id = 'ts-' + s.id;
      const inp = K.el('input', { type: 'checkbox', id, value: s.id });
      inp.checked = st.sym.has(s.id);
      symInputs[s.id] = inp;
      inp.addEventListener('change', () => { inp.checked ? st.sym.add(s.id) : st.sym.delete(s.id); update(); });
      symOpts.append(inp, K.el('label', { for: id, html: K.glyph(s.id) + s.name }));
    });
    fsSym.append(symOpts);
    const reset = K.button(null, { label: '선택 모두 지우기', kind: 'small ghost', onClick: () => {
      st.who = null; st.when.clear(); st.sym.clear();
      $$('input', form).forEach(i => { i.checked = false; });
      update();
    } });
    form.append(fsWho, fsWhen, fsSym, reset);
    const hint = K.el('p', { class: 'sim-say', 'aria-live': 'polite' });
    const out = K.el('div', { class: 'tri-results' });
    root.append(form, hint, K.el('div', { class: 'cv-cap' }, K.el('b', { text: '가능성 높은 원인' }), K.el('span', { text: '누가·언제·모양이 대표 특징과 맞을수록 높음' })), out);

    const HINT = {
      me: '나만 겪는다면 먼저 <b>내 쪽 세 층</b>(게임, PC·폰, 집 네트워크)을 봅니다. 유선으로 바꾸거나, 다른 게임·영상 통화도 느린지 확인해 보세요. 핑은 멀쩡한데 끊기면 내 PC의 프레임 문제입니다.',
      home: '같은 집 사람들이 함께 겪는다면 <b>공유기와 집 회선</b>이 1순위입니다. 누가 큰 파일을 올리거나 받고 있지 않은지, 공유기를 재부팅하면 나아지는지 보세요.',
      region: '특정 지역·통신사만 겪는다면 <b>인터넷 회선 층</b>(경로, 피어링, 해외 구간)입니다. 게임 서버는 멀쩡할 가능성이 높습니다. 통신사별 핑 통계를 서버팀에 요청하세요.',
      zone: '특정 장소·채널에 모인 사람들만 겪는다면 <b>서버 게임 프로세스</b>(틱 예산, 시야 계산, 브로드캐스트)가 1순위입니다. 그 장소의 인원수와 시각을 함께 전달하세요.',
      server: '서버 전체가 동시에 겪는다면 <b>서버 쪽 공통 자원</b>(메모리·GC, DB, 네트워크 장비, 서버 OS)입니다. 정확한 시각이 가장 중요한 단서입니다.',
      feature: '특정 기능만 느리거나 실패한다면 그 기능을 맡은 <b>부가 서버나 DB</b>입니다. 전투는 멀쩡한지 함께 알려 주세요.',
    };

    function update() {
      const scored = D.causes.map(c => {
        let score = 0; const why = [];
        // 목록의 첫 항목은 그 원인의 대표 특징이라 가중치를 더 준다
        const wi = st.who ? c.who.indexOf(st.who) : -1;
        if (wi >= 0) { score += wi === 0 ? 3 : 2; why.push(WHO[st.who]); }
        const w = c.when.filter(x => st.when.has(x));
        w.forEach(x => { score += c.when.indexOf(x) === 0 ? 2 : 1.5; });
        if (w.length) why.push(w.map(x => WHEN[x]).join(', '));
        const s = c.sym.filter(x => st.sym.has(x));
        s.forEach(x => { score += c.sym.indexOf(x) === 0 ? 3 : 2; });
        if (s.length) why.push(s.map(x => SYM[x].name).join(', '));
        return { c, score, why };
      }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || D.layers.findIndex(l => l.id === a.c.layer) - D.layers.findIndex(l => l.id === b.c.layer));
      const max = (st.who ? 3 : 0) + st.when.size * 2 + st.sym.size * 3;
      hint.innerHTML = st.who ? HINT[st.who] : '선택할수록 후보가 좁혀집니다. “누가”가 가장 강한 단서입니다.';
      if (!scored.length || !max) { out.innerHTML = '<p class="note">조건을 하나 이상 골라 주세요.</p>'; return; }
      out.innerHTML = scored.slice(0, 10).map(({ c, score, why }) => {
        const pct = Math.round((score / max) * 100);
        return `<div class="tri-item">
          <div class="score">${pct}%<div class="meter"><i style="width:${pct}%"></i></div></div>
          <div><a href="#c-${c.id}">${c.t}</a> <span class="layer">· ${LAYER[c.layer].name}</span>
          <div class="why">${c.s}</div>
          <div class="why"><span class="note">맞는 조건: ${why.join(' · ')}</span></div></div>
        </div>`;
      }).join('') + (scored.length > 10 ? `<p class="note">그 밖에 ${scored.length - 10}가지 원인이 일부 조건과 맞습니다.</p>` : '');
    }
    K.on('triage:sym', id => {
      st.sym.clear(); st.sym.add(id);
      Object.entries(symInputs).forEach(([k, i]) => { i.checked = k === id; });
      update();
    });
    update();
  });

  /* ---------------- 제보 가이드 ---------------- */
  $('#report-cols').innerHTML = D.report.map(g => `<div class="analogy" style="grid-template-columns:1fr;max-width:none"><span class="tag">${g.title}</span><ol style="margin:0;padding-left:1.2em;display:grid;gap:6px;font-size:15px">${g.items.map(i => `<li>${i}</li>`).join('')}</ol></div>`).join('');

  /* ---------------- 용어 사전 ---------------- */
  const gl = $('#gloss');
  gl.innerHTML = D.glossary.map(([k, en, d, sec]) =>
    `<div data-q="${esc((k + ' ' + en + ' ' + d).toLowerCase())}"><dt>${k}<span class="en">${esc(en)}</span></dt><dd>${d}${sec ? ` <a href="#${sec}">관련 장 →</a>` : ''}</dd></div>`).join('');
  $('#gloss-q').addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    $$('div[data-q]', gl).forEach(d => { d.hidden = q && !d.dataset.q.includes(q); });
  });

  /* ---------------- 내비게이션 ---------------- */
  const nav = $('#nav'), openBtn = $('#nav-open');
  const closeNav = () => { nav.classList.remove('is-open'); openBtn.setAttribute('aria-expanded', 'false'); };
  openBtn.addEventListener('click', e => { e.stopPropagation(); const o = nav.classList.toggle('is-open'); openBtn.setAttribute('aria-expanded', o ? 'true' : 'false'); });
  nav.addEventListener('click', e => { if (e.target.closest('a')) closeNav(); });
  document.addEventListener('click', e => { if (nav.classList.contains('is-open') && !nav.contains(e.target) && e.target !== openBtn) closeNav(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });

  const navLinks = $$('.nav a[href^="#"]');
  const where = $('#where');
  const sections = $$('main section.chapter');
  if (window.IntersectionObserver) {
    const vis = new Map();
    const io = new IntersectionObserver(es => {
      es.forEach(e => vis.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : null));
      let best = null, bestTop = -Infinity;
      sections.forEach(s => { const tp = vis.get(s.id); if (tp != null && tp <= 140 && tp > bestTop) { best = s.id; bestTop = tp; } });
      if (!best) { const first = sections.find(s => vis.get(s.id) != null); best = first && first.id; }
      navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + best));
      const sec = best && document.getElementById(best);
      if (where) where.textContent = sec ? $('h2', sec).textContent : '';
    }, { rootMargin: '-64px 0px -55% 0px', threshold: [0, 0.01, 1] });
    sections.forEach(s => io.observe(s));
  }

  // 주소의 #c-… 로 들어오면 그 원인의 자세히를 펼친다
  function openHash() {
    const h = location.hash.slice(1);
    if (!h) return;
    const el = document.getElementById(h);
    if (el && el.classList.contains('cause')) { const d = $('details', el); if (d) d.open = true; }
  }
  window.addEventListener('hashchange', openHash);

  /* ---------------- 시뮬레이션 올리기 ---------------- */
  K.mountAll();
  openHash();
  if (location.hash) { const el = document.getElementById(location.hash.slice(1)); if (el) setTimeout(() => el.scrollIntoView(), 50); }
})();
