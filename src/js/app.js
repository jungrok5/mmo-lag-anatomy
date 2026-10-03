/* =========================================================================
   app.js — 데이터로 본문을 채우고(원인 카드, 증상 사전, 지도, 용어), 진단 도우미와 내비게이션을 붙인다.
   ========================================================================= */
(function () {
  const TR = I18N.tr('ui-app');   // 화면 글자 묶음의 사전을 먼저 본다(i18n.js)
  const D = window.DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const ALL_LAYERS = D.layers.concat(D.extraLayers || []);
  const LAYER = Object.fromEntries(ALL_LAYERS.map((l, i) => [l.id, Object.assign({ n: i + 1 }, l)]));
  const SYM = Object.fromEntries(D.symptoms.map(s => [s.id, s]));
  const FX = Object.fromEntries(D.fx.map(f => [f.id, f]));
  const WHO = D.who;
  const WHEN = D.when;
  const SIMNAME = {
    lab: TR`렉 실험실`, queue: TR`대기열 실험`, journey: TR`지연 분해`, frames: TR`프레임 실험`, cpu: TR`CPU 스케줄러 실험`, bloat: TR`버퍼블로트 실험`,
    distance: TR`거리·경로 실험`, timeouts: TR`장비별 유휴 타임아웃 실험`, nic: TR`NIC 실험`, rush: TR`접속 폭주 실험`, hol: TR`TCP vs UDP 실험`, nagle: TR`Nagle 실험`,
    sndbuf: TR`느린 클라이언트 실험`, tick: TR`틱 예산 실험`, locks: TR`락 실험`, gc: TR`GC 실험`, leak: TR`메모리 누수 실험`, ladder: TR`숫자 감각`,
    disk: TR`디스크 실험`, dbpool: TR`DB 실험`, arch: TR`서버 구성 실험`,
    syncmodels: TR`동기화 방식 비교`, windows: TR`판정 구간 실험`, chain: TR`연속 행동 실험`, oneslow: TR`한 명만 느릴 때 실험`, npcmissing: TR`한쪽 클라 진단`, retrans: TR`TCP 재전송 실험`,
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* 공유 링크는 어디서 열었든(파일, 사내 사본, 아티팩트) 공개 사이트 주소로 복사한다. 주소는 package.json의 homepage(빌드가 data-site에 넣음) */
  const SITE = (m => (m && /^https?:/.test(m.dataset.site || '') ? m.dataset.site : location.href.split('#')[0].replace(/[^/]*$/, '')))(document.querySelector('main[data-site]'));
  const shareBtn = (link, name, cls = 'copy') => TR`<button type="button" class="${cls}" data-link="${link}" aria-label="${esc(name)} 링크 복사">링크 복사</button>`;
  // 용어의 앵커: 영문 이름으로 만든다(예: 핑 → #g-ping)
  const glossId = en => 'g-' + String(en).split(',')[0].toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  /* 그래프 모양(sig)과 확인 방법(chk), 실제 사례(cases): docs/CHECKS_GUIDE.md */
  const SIG = Object.fromEntries((D.sigs || []).map(s => [s.id, s]));
  const sigFig = k => (SIG[k] && window.SIGDRAW ? window.SIGDRAW(k, SIG[k].name + TR` 모양의 그래프`) : '');
  const CASES_OF = {};
  (D.cases || []).forEach(x => (x.causes || []).forEach(id => (CASES_OF[id] = CASES_OF[id] || []).push(x)));

  /* 해결 담당: own[0]이 주 담당, 나머지는 함께 대응하는 곳. act는 팀별 할 일 */
  const OWN = Object.fromEntries((D.owners || []).map(o => [o.id, o]));
  const TEAMS = D.teams || {};
  const TEAM_ORDER = ['game', 'infra', 'ext'];
  const ACT_LABEL = { game: TR`게임개발팀이 할 일`, infra: TR`인프라팀이 할 일`, ext: TR`유저 안내·외부 요청` };
  const leadTeam = c => (c.own && OWN[c.own[0]] ? OWN[c.own[0]].team : null);
  const teamsOf = c => [...new Set((c.own || []).map(id => OWN[id] && OWN[id].team).filter(Boolean))];
  const ownBadge = id => {
    const o = OWN[id]; if (!o) return '';
    return `<span class="own own-${o.team}" title="${esc(o.name + ': ' + o.desc)}"><span class="tm">${TEAMS[o.team].name}</span>${o.short}</span>`;
  };
  // 출처 목록: [{ t: 제목, u: 주소, p: 발행처, n: 무엇의 근거인지 }]
  const refList = refs => `<ul class="refs">${refs.map(r => `<li><a href="${esc(r.u)}" target="_blank" rel="noopener noreferrer">${esc(r.t)}</a>${r.p ? ` <span class="rp">${esc(r.p)}</span>` : ''}${r.n ? `<span class="rn">${esc(r.n)}</span>` : ''}</li>`).join('')}</ul>`;
  const ownRow = c => {
    if (!c.own || !c.own.length) return '';
    const rest = c.own.slice(1);
    return `<div class="own-row"><span class="k">${TR`주 담당`}</span>${ownBadge(c.own[0])}${rest.length ? TR`<span class="k">함께</span>${rest.map(ownBadge).join('')}` : ''}</div>`;
  };
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

  /* ---------------- 히어로: 네 가지 요인 ---------------- */
  const thesis = $('#thesis');
  thesis.innerHTML = TR`<div class="thesis-head"><b>렉은 대부분 네 가지 요인 중 하나에서 시작합니다.</b> 원인이 어느 층에 있든 게임에 미치는 영향은 이 넷으로 묶이고 게임이 이를 가리는 방식에 따라 렉의 모양이 정해집니다.</div>` +
    D.fx.map(f => `<div><span class="fx-name">${K.fxIcon(f.id).replace('<svg', '<svg width="16" height="16"')}${f.name}</span><p>${K.then(f.how, K.firstSentence(f.desc))}</p></div>`).join('');

  /* ---------------- 기본 개념: 요인 → 대처 → 증상 ---------------- */
  const fxMap = $('#fx-map');
  fxMap.className = 'causes';
  fxMap.innerHTML = D.fx.map(f => `
    <div class="cause">
      <div class="cause-top"><h4>${K.fxIcon(f.id).replace('<svg', '<svg width="16" height="16" style="vertical-align:-2px;margin-right:6px"')}${f.name}<span class="en">${f.en}</span></h4><div class="chips">${f.sym.map(s => symChip(s)).join('')}</div></div>
      <div class="chain">
        <div class="step">${TR`<b>무슨 일</b>${f.how}. ${f.desc}`}</div><div class="arr">${ARROW}</div>
        <div class="step">${TR`<b>게임의 대처</b>${f.cope}`}</div><div class="arr">${ARROW}</div>
        <div class="step out">${TR`<b>가리지 못하면</b>${f.sym.map(s => SYM[s].name).join(', ')}`}</div>
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
  tcap.textContent = TR`막대 길이는 로그 눈금입니다. 한 칸 길어질 때마다 약 10배 느립니다.`;
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
      <span class="n">${l.name}<small>${TR`${l.side} · 원인 ${(byLayer[l.id] || []).length}가지`}</small></span>
      <span class="d">${l.what}</span>
      <span class="t">${TR`평소 ${K.ms(l.delay[0])} · 나쁠 때 ${K.ms(l.delay[1])}`}<span class="track"><i style="left:${a.toFixed(1)}%;width:${Math.max(1.5, b - a).toFixed(1)}%"></i></span></span>
      <span class="g" title="${TR`이 층에서 자주 생기는 증상`}">${topSyms(l.id).map(s => K.glyph(s)).join('')}</span>
    </a>`;
  }).join('') + TR`<p class="note" style="margin-top:6px">막대: 이 층이 더하는 지연의 범위(로그 눈금, 0.05ms ~ 5초). 오른쪽 그림: 이 층에서 가장 흔한 증상.</p>`;

  $('#nav-layers').innerHTML = D.layers.map((l, i) =>
    `<li><a href="#l-${l.id}"><span class="dot">${i + 1}</span><span>${l.short}</span><span class="side">${(byLayer[l.id] || []).length}</span></a></li>`).join('');

  /* ---------------- 레이어 장: 머리말 + 원인 카드 ---------------- */
  $$('section.layer').forEach(sec => {
    const l = LAYER[sec.dataset.layer];
    const n = (byLayer[l.id] || []).length;
    $('.ch-kicker', sec).innerHTML = TR`<span class="idx">L${String(l.n).padStart(2, '0')}</span>레이어 ${l.n} / ${D.layers.length} · ${l.side} · 원인 ${n}가지`;
    const lead = {};
    (byLayer[l.id] || []).forEach(c => { if (c.own && OWN[c.own[0]]) lead[c.own[0]] = (lead[c.own[0]] || 0) + 1; });
    const top = Object.entries(lead).sort((a, b) => b[1] - a[1]);
    if (top.length) {
      const box = K.el('p', { class: 'own-sum', html: TR`<span class="k">주 담당</span>${top.map(([id, k]) => `${ownBadge(id)}<span class="mono">${k}</span>`).join('')} <a href="#owners">담당 구분 보기</a>` });
      $('.ch-head', sec).append(box);
    }
    const h3 = $('h3.sec:last-of-type', sec);
    if (h3) h3.innerHTML = TR`이 층에서 렉을 만드는 원인 <span class="mono">${n}가지</span>`;
  });
  function causeHTML(c) {
    const meta = [
      `<span><span class="k">${TR`요인`}</span>${c.fx.map(fxTag).join(' ')}</span>`,
      `<span><span class="k">${TR`누가`}</span>${c.who.map(w => WHO[w]).join(', ')}</span>`,
      `<span><span class="k">${TR`언제`}</span>${c.when.map(w => WHEN[w]).join(', ')}</span>`,
      c.sim ? `<span><span class="k">${TR`실험`}</span><a href="#sim-${c.sim}">${SIMNAME[c.sim] || c.sim}</a></span>` : '',
      `<span class="cid"><span class="k">ID</span><a class="mono" href="#c-${c.id}">${c.id}</a>${shareBtn(`c/${c.id}.html`, c.t)}</span>`,
    ].join('');
    const acts = c.act ? TEAM_ORDER.filter(t => c.act[t]).map(t => `<dt class="act act-${t}">${ACT_LABEL[t]}</dt><dd>${c.act[t]}</dd>`).join('') : '';
    const chk = c.chk ? [
      `<dt class="chk">${TR`확인할 곳`}</dt><dd>${c.chk.look}</dd>`,
      `<dt class="chk">${TR`이러면 맞음`}</dt><dd>${c.chk.yes}</dd>`,
      c.chk.no ? `<dt class="chk">${TR`이러면 아님`}</dt><dd>${c.chk.no}</dd>` : '',
      D.chkBy && D.chkBy[c.chk.by] ? `<dt class="chk">${TR`확인 수단`}</dt><dd>${D.chkBy[c.chk.by]}</dd>` : '',
    ].join('') : '';
    const cases = CASES_OF[c.id] || [];
    const dl = [
      c.num ? `<dt>${TR`수치 감각`}</dt><dd>${c.num}</dd>` : '',
      chk,
      acts || (c.fix ? `<dt>${TR`대응`}</dt><dd>${c.fix}</dd>` : ''),
      c.more ? `<dt>${TR`더 알아보기`}</dt><dd>${c.more}</dd>` : '',
      cases.length ? `<dt>${TR`실제 사례`}</dt><dd>${cases.map(x => `<a href="#case-${x.id}">${esc(x.org)} ${x.year}: ${esc(x.t)}</a>`).join('<br>')}</dd>` : '',
      c.ref && c.ref.length ? `<dt>${TR`출처`}</dt><dd>${refList(c.ref)}</dd>` : '',
    ].join('');
    const sig = c.sig && SIG[c.sig.k] ? `<div class="sig-row">${sigFig(c.sig.k)}<p>${TR`<b>그래프에서는</b> <a href="#sig-${c.sig.k}">${SIG[c.sig.k].name}</a>`}<span class="sig-g"> · ${c.sig.g}</span></p></div>` : '';
    const summary = [TR`수치 감각`, c.chk ? TR`확인 방법` : '', TR`팀별 대응`].filter(Boolean).join('·') + (cases.length ? TR` · 사례` : '') + (c.ref && c.ref.length ? TR` · 출처` : '');
    return `<article class="cause" id="c-${c.id}">
      <div class="cause-top"><h4>${c.t}<span class="en">${esc(c.en)}</span></h4><div class="chips">${c.sym.map(s => symChip(s)).join('')}</div></div>
      <p class="short">${c.s}</p>
      <div class="chain">
        <div class="step">${TR`<b>왜</b>${c.c[0]}`}</div><div class="arr">${ARROW}</div>
        <div class="step">${TR`<b>그러면</b>${c.c[1]}`}</div><div class="arr">${ARROW}</div>
        <div class="step out">${TR`<b>화면에서는</b>${c.c[2]}`}</div>
      </div>
      ${sig}
      ${ownRow(c)}
      <div class="cause-meta">${meta}</div>
      ${dl ? `<details><summary>${summary}</summary><div class="more"><dl>${dl}</dl></div></details>` : ''}
    </article>`;
  }
  $$('[data-causes]').forEach(box => { box.innerHTML = (byLayer[box.dataset.causes] || []).map(causeHTML).join(''); });
  const syncH3 = $('#sync h3.sec:last-of-type');
  if (syncH3) syncH3.innerHTML = TR`동기화 설계에서 렉을 만드는 원인 <span class="mono">${(byLayer.sync || []).length}가지</span>`;
  const partH3 = $('#partial h3.sec:last-of-type');
  if (partH3) partH3.innerHTML = TR`일부에게만 생기는 문제 <span class="mono">${(byLayer.partial || []).length}가지</span>`;
  const rtH3 = $('#retrans h3.sec:last-of-type');
  if (rtH3) rtH3.innerHTML = TR`TCP 재전송의 근본 원인 <span class="mono">${(byLayer.retrans || []).length}가지</span>`;

  // 원인 목록을 주 담당 팀별로 센 한 줄
  function teamSplit(list) {
    const k = { game: 0, infra: 0, ext: 0 };
    list.forEach(c => { const t = leadTeam(c); if (t) k[t]++; });
    if (!k.game && !k.infra && !k.ext) return '';
    return `<p class="team-split"><span class="k">${TR`주 담당`}</span>${TEAM_ORDER.filter(t => k[t]).map(t => `<span class="own own-${t}"><span class="tm">${TEAMS[t].name}</span>${TR`${k[t]}가지`}</span>`).join('')}</p>`;
  }

  /* ---------------- 증상 사전 ---------------- */
  const symCauses = {};
  D.causes.forEach(c => c.sym.forEach(s => { (symCauses[s] = symCauses[s] || []).push(c); }));
  $('#sym-grid').innerHTML = D.symptoms.map(s => {
    const list = symCauses[s.id] || [];
    const groups = {};
    list.forEach(c => { (groups[c.layer] = groups[c.layer] || []).push(c); });
    const links = ALL_LAYERS.filter(l => groups[l.id]).map(l =>
      `<span><span class="note">${l.short}</span> ${groups[l.id].map(c => `<a href="#c-${c.id}">${c.t}</a>`).join(', ')}</span>`).join('');
    return `<article class="sym-card" id="s-${s.id}">
      <header>${K.glyph(s.id)}<div><h3>${s.name}</h3><div class="alias">${s.alias}</div></div></header>
      <canvas data-anim="${s.id}" height="56" aria-label="${TR`${s.name} 움직임 예시`}" role="img"></canvas>
      <p>${s.what}</p>
      <div class="looks">${TR`<b>화면에서는</b>${s.looks}`}</div>
      <p>${TR`<b>단서</b> ${s.tell}`}</p>
      <details class="cause-links"><summary>${TR`이 증상을 만드는 원인 ${list.length}가지`}</summary><div class="list">${links}</div></details>
      ${teamSplit(list)}
      <div class="actions">
        ${s.preset ? TR`<button type="button" class="btn small primary" data-lab="${s.preset}">실험실에서 재현하기</button>` : ''}
        <button type="button" class="btn small" data-tri="${s.id}">${TR`진단 도우미로`}</button>
        ${shareBtn(`s/${s.id}.html`, s.name, 'btn small ghost')}
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
    freeze: u => (u < 0.35 ? { x: u } : u < 0.7 ? { x: 0.35, pause: true } : u < 0.8 ? { x: 0.35 + (u - 0.7) * 4.5 } : { x: u }),
    dropped: u => ({ x: u, skill: u > 0.35 && u < 0.6 }),
    disconnect: u => (u < 0.4 ? { x: u } : u < 0.6 ? { x: 0.4, wait: true } : { x: 0.4, cut: true }),
    noconnect: u => ({ spin: true, x: 0.5, u }),
    invisible: u => ({ x: u, ghost: true }),
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
        K.text(ctx, TR`접속 중…`, w / 2 + 20, y - 4, { size: 11, color: C.muted });
        return;
      }
      // 궤적: 최근 0.9초 동안 그려진 위치를 한 프레임(1/15초) 간격으로
      for (let i = 12; i >= 1; i--) {
        const uu = u - i * 0.022;
        if (uu < 0) continue;
        const p = f(uu);
        if (p.ghost) continue;
        ctx.fillStyle = K.alpha(C.s2, 0.12 + 0.5 * (1 - i / 12));
        ctx.beginPath(); ctx.arc(X(p.x), y, 3, 0, Math.PI * 2); ctx.fill();
      }
      const p = f(u);
      if (p.cut) {
        ctx.fillStyle = K.alpha(C.ink2, 0.35);
        ctx.beginPath(); ctx.arc(X(p.x), y, 7, 0, Math.PI * 2); ctx.fill();
        K.text(ctx, TR`서버와의 연결이 끊어졌습니다`, X(p.x) + 14, y - 12, { size: 11, weight: 600, color: C.badInk });
        return;
      }
      if (p.ghost) {
        ctx.save(); ctx.strokeStyle = C.ink2; ctx.lineWidth = 1.4; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(X(p.x), y, 7, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        K.text(ctx, TR`서버엔 있는데 내 화면엔 없음`, X(Math.min(p.x, 0.45)) + 12, y - 14, { size: 11, color: C.muted });
        return;
      }
      K.dot(ctx, X(p.x), y, 7, C.s2, C.paper);
      if (p.wait) K.text(ctx, TR`패킷 없음…`, X(p.x) + 12, y - 14, { size: 11, color: C.muted });
      if (p.pause) { ctx.fillStyle = C.ink2; ctx.fillRect(X(p.x) - 4, y - 24, 3, 9); ctx.fillRect(X(p.x) + 1, y - 24, 3, 9); }
      if (p.click) { ctx.strokeStyle = C.accent; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(p.x), y, 12 + (u * 40) % 8, 0, Math.PI * 2); ctx.stroke(); K.text(ctx, TR`눌렀는데…`, X(p.x) + 20, y - 14, { size: 11, color: C.muted }); }
      if (p.snap) K.text(ctx, TR`휙`, X(p.x) - 2, y - 16, { size: 11, weight: 700, color: C.badInk, align: 'center' });
      if (p.skill) {
        const k = (u - 0.35) / 0.25;
        ctx.strokeStyle = K.alpha(C.s1, 1 - k); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(X(0.35), y, 8 + k * 14, 0, Math.PI * 2); ctx.stroke();
        if (k > 0.4) K.text(ctx, TR`스킬 발동 안 됨`, X(0.35) + 26, y - 16, { size: 11, weight: 600, color: C.badInk });
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
    const fsWho = K.el('fieldset', null, K.el('legend', { text: TR`1. 누가 겪고 있나요?` }));
    const whoOpts = K.el('div', { class: 'opts' });
    Object.entries(WHO).forEach(([k, v]) => {
      const id = 'tw-' + k;
      const inp = K.el('input', { type: 'radio', name: 'tri-who', id, value: k });
      inp.checked = st.who === k;
      inp.addEventListener('change', () => { st.who = k; update(); });
      whoOpts.append(inp, K.el('label', { for: id, text: v }));
    });
    fsWho.append(whoOpts);
    const fsWhen = K.el('fieldset', null, K.el('legend', { text: TR`2. 언제 생기나요? (여러 개 선택)` }));
    const whenOpts = K.el('div', { class: 'opts' });
    Object.entries(WHEN).forEach(([k, v]) => {
      const id = 'tn-' + k;
      const inp = K.el('input', { type: 'checkbox', id, value: k });
      inp.checked = st.when.has(k);
      inp.addEventListener('change', () => { inp.checked ? st.when.add(k) : st.when.delete(k); update(); });
      whenOpts.append(inp, K.el('label', { for: id, text: v }));
    });
    fsWhen.append(whenOpts);
    const fsSym = K.el('fieldset', null, K.el('legend', { text: TR`3. 어떤 모양인가요? (여러 개 선택)` }));
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
    const reset = K.button(null, { label: TR`선택 모두 지우기`, kind: 'small ghost', onClick: () => {
      st.who = null; st.when.clear(); st.sym.clear();
      $$('input', form).forEach(i => { i.checked = false; });
      update();
    } });
    form.append(fsWho, fsWhen, fsSym, reset);
    const hint = K.el('p', { class: 'sim-say', 'aria-live': 'polite' });
    const out = K.el('div', { class: 'tri-results' });
    root.append(form, hint, K.el('div', { class: 'cv-cap' }, K.el('b', { text: TR`가능성 높은 원인` }), K.el('span', { text: TR`누가·언제·모양이 대표 특징과 맞을수록 높음` })), out);

    const HINT = {
      me: TR`나만 겪는다면 먼저 <b>내 쪽 세 층</b>(게임, PC·폰, 집 네트워크)을 봅니다. 유선으로 바꾸거나, 다른 게임·영상 통화도 느린지 확인해 보세요. 회선 핑(게임 밖에서 잰 핑)은 멀쩡한데 뚝뚝 끊기면 내 PC의 프레임 문제일 가능성이 큽니다.`,
      home: TR`같은 집 사람들이 함께 겪는다면 <b>공유기와 집 회선</b>이 1순위입니다. 누가 큰 파일을 올리거나 받고 있지 않은지, 공유기를 재부팅하면 나아지는지 보세요.`,
      region: TR`특정 지역·통신사만 겪는다면 <b>인터넷 회선 층</b>(경로, 피어링, 해외 구간)입니다. 게임 서버는 멀쩡할 가능성이 높습니다. 통신사별 핑·손실 통계를 인프라팀에 요청하세요.`,
      zone: TR`특정 장소·채널에 모인 사람들만 겪는다면 <b>서버 게임 프로세스</b>(틱 예산, 시야 계산, 브로드캐스트)가 1순위입니다. 그 장소의 인원수와 시각을 함께 전달하세요.`,
      server: TR`서버 전체가 동시에 겪는다면 <b>서버 쪽 공통 자원</b>(메모리·GC, DB, 네트워크 장비, 서버 OS)입니다. 게임 스레드 하나가 서버 전체를 돌리는 구조라면 <b>틱 예산 초과</b>나 게임 루프 안에서 기다리는 동기 호출(DB·파일·외부 서버)도 같은 모습입니다. 정확한 시각이 가장 중요한 단서입니다.`,
      feature: TR`특정 기능만 느리거나 실패한다면 그 기능을 맡은 <b>부가 서버나 DB</b>입니다. 전투는 멀쩡한지 함께 알려 주세요.`,
      onechar: TR`다른 사람들은 멀쩡한데 <b>특정 캐릭터 하나만</b> 버벅이거나 순간이동해 보인다면, 대개 그 사람의 회선이 나쁩니다. 서버 권위 구조에서는 정상 동작입니다. 그 사람 한 명 때문에 모두가 멈춘다면 락스텝·블로킹 전송처럼 “기다리는 구조”를 의심합니다.`,
      oneclient: TR`같은 PC의 두 클라이언트 중 <b>한쪽만</b> 이상하다면 회선 문제는 거의 아닙니다. 채널·페이즈 차이, 로딩 중 버려진 알림, 백그라운드 창 제한, 같은 PC라서 생기는 포트·세션 충돌, 캐시 파일 충돌 순서로 확인하세요. 아래 “같은 PC의 두 클라이언트” 진단 질문으로 좁힐 수 있습니다.`,
    };

    function update() {
      const scored = D.causes.map(c => {
        let score = 0; const why = [];
        // 목록의 첫 항목은 그 원인의 대표 특징이라 가중치를 더 준다
        const wi = st.who ? c.who.indexOf(st.who) : -1;
        if (wi >= 0) { score += wi === 0 ? 3 : 2; why.push(WHO[st.who]); }
        // “누가”가 가장 강한 단서라서, 고른 “누가”와 맞지 않는 원인은 2점을 뺀다(언제·모양만 맞는 서버 원인이 “같은 집” 결과 위로 올라오지 않게)
        else if (st.who) score -= 2;
        const w = c.when.filter(x => st.when.has(x));
        w.forEach(x => { score += c.when.indexOf(x) === 0 ? 2 : 1.5; });
        if (w.length) why.push(w.map(x => WHEN[x]).join(', '));
        const s = c.sym.filter(x => st.sym.has(x));
        s.forEach(x => { score += c.sym.indexOf(x) === 0 ? 3 : 2; });
        if (s.length) why.push(s.map(x => SYM[x].name).join(', '));
        return { c, score, why };
      }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || LAYER[a.c.layer].n - LAYER[b.c.layer].n);
      const max = (st.who ? 3 : 0) + st.when.size * 2 + st.sym.size * 3;
      hint.innerHTML = st.who ? HINT[st.who] : TR`선택할수록 후보가 좁혀집니다. “누가”가 가장 강한 단서입니다.`;
      if (!scored.length || !max) { out.innerHTML = TR`<p class="note">조건을 하나 이상 골라 주세요.</p>`; return; }
      // 상위 10개의 주 담당을 세어 “먼저 넘길 곳”을 알려 준다
      const route = {};
      scored.slice(0, 10).forEach(({ c }) => { if (c.own && OWN[c.own[0]]) route[c.own[0]] = (route[c.own[0]] || 0) + 1; });
      const routeHTML = Object.keys(route).length ? `<p class="tri-route"><span class="k">${TR`먼저 확인할 곳`}</span>${Object.entries(route).sort((a, b) => b[1] - a[1]).map(([id, k]) => `${ownBadge(id)}<span class="mono">${k}</span>`).join('')}<span class="note">${TR`상위 10개 원인의 주 담당`}</span></p>` : '';
      out.innerHTML = routeHTML + scored.slice(0, 10).map(({ c, score, why }, i) => {
        const pct = Math.round((score / max) * 100);
        return `<div class="tri-item">
          <div class="score">${pct}%<div class="meter"><i style="width:${pct}%"></i></div></div>
          <div><a href="#c-${c.id}">${c.t}</a> <span class="layer">· ${LAYER[c.layer].name}</span> ${c.own && c.own.length ? ownBadge(c.own[0]) : ''}
          <div class="why">${c.s}</div>
          <div class="why"><span class="note">${TR`맞는 조건: ${why.join(' · ')}`}</span></div>
          ${c.chk && i < 3 ? `<div class="why tri-chk"><span class="k">${TR`먼저 볼 것`}</span>${c.chk.look}${c.sig && SIG[c.sig.k] ? TR` <span class="note">· 그래프 모양: <a href="#sig-${c.sig.k}">${SIG[c.sig.k].name}</a></span>` : ''}</div>` : ''}</div>
        </div>`;
      }).join('') + (scored.length > 10 ? TR`<p class="note">그 밖에 ${scored.length - 10}가지 원인이 일부 조건과 맞습니다.</p>` : '');
    }
    K.on('triage:sym', id => {
      st.sym.clear(); st.sym.add(id);
      Object.entries(symInputs).forEach(([k, i]) => { i.checked = k === id; });
      update();
    });
    update();
  });

  /* ---------------- 담당 구분 탐색기 ---------------- */
  K.register('owners', function (root) {
    const st = { team: 'game', mode: 'lead', cell: null };   // mode: lead = 주 담당만, all = 함께 대응 포함
    const has = c => c.own && c.own.length;
    const causes = D.causes.filter(has);

    const stats = K.el('div', { class: 'sim-stats' });
    const sGame = K.stat(stats, { label: TR`게임개발팀이 주 담당`, unit: TR`가지` });
    const sInfra = K.stat(stats, { label: TR`인프라팀이 주 담당`, unit: TR`가지` });
    const sExt = K.stat(stats, { label: TR`외부가 주 담당`, unit: TR`가지` });
    const sBoth = K.stat(stats, { label: TR`두 팀 모두 할 일이 있음`, unit: TR`가지` });
    const k = { game: 0, infra: 0, ext: 0 };
    causes.forEach(c => { k[leadTeam(c)]++; });
    const both = causes.filter(c => c.act && c.act.game && c.act.infra).length;
    sGame.set(String(k.game), null, TR`전체 ${causes.length}가지 중`);
    sInfra.set(String(k.infra), null, TR`전체 ${causes.length}가지 중`);
    sExt.set(String(k.ext), null, TR`유저 환경·통신사·클라우드`);
    sBoth.set(String(both), null, TR`두 팀이 할 일을 나눠 맡는 경우`);

    // 층 × 담당 표. 칸의 굵은 숫자는 주 담당, +숫자는 함께 대응
    const matWrap = K.el('div', { class: 'table-wrap own-mat-wrap' });
    const rows = ALL_LAYERS.filter(l => causes.some(c => c.layer === l.id));
    const maxLead = Math.max(1, ...rows.flatMap(l => D.owners.map(o => causes.filter(c => c.layer === l.id && c.own[0] === o.id).length)));
    matWrap.innerHTML = `<table class="own-mat"><thead><tr><th scope="col">${TR`층·주제`}</th>${D.owners.map(o => `<th scope="col" class="own-${o.team}"><span class="tm">${TEAMS[o.team].name}</span>${o.short}</th>`).join('')}</tr></thead><tbody>${rows.map(l => {
      return `<tr><th scope="row"><a href="#${l.anchor || 'l-' + l.id}">${l.short}</a></th>${D.owners.map(o => {
        const lead = causes.filter(c => c.layer === l.id && c.own[0] === o.id).length;
        const also = causes.filter(c => c.layer === l.id && c.own.indexOf(o.id) > 0).length;
        if (!lead && !also) return '<td class="empty"></td>';
        return `<td class="own-${o.team}" style="--a:${(0.12 + 0.6 * lead / maxLead).toFixed(2)}"><button type="button" data-l="${l.id}" data-o="${o.id}" aria-label="${esc(TR`${l.short} · ${o.name}: 주 담당 ${lead}가지, 함께 ${also}가지`)}">${lead ? `<b>${lead}</b>` : ''}${also ? `<span>+${also}</span>` : ''}</button></td>`;
      }).join('')}</tr>`;
    }).join('')}</tbody></table>`;

    const ctl = K.el('div', { class: 'own-ctl' });
    const cTeam = K.choice(ctl, { label: TR`팀`, value: st.team, options: TEAM_ORDER.map(t => [t, TEAMS[t].name]), onChange: v => { st.team = v; st.cell = null; draw(); } });
    const cMode = K.choice(ctl, { label: TR`범위`, value: st.mode, options: [['lead', TR`주 담당만`], ['all', TR`함께 대응 포함`]], onChange: v => { st.mode = v; draw(); } });
    const out = K.el('div', { class: 'own-list' });

    matWrap.addEventListener('click', e => {
      const b = e.target.closest('button[data-l]'); if (!b) return;
      st.cell = { layer: b.dataset.l, owner: b.dataset.o };
      st.team = OWN[st.cell.owner].team; cTeam.set && cTeam.set(st.team, false);
      draw();
      out.scrollIntoView({ behavior: K.reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    });

    function item(c, team) {
      const act = c.act && c.act[team];
      return `<li><div class="own-li-top"><a href="#c-${c.id}">${c.t}</a>${ownBadge(c.own[0])}</div>${act ? `<div class="own-act">${act}</div>` : TR`<div class="own-act note">이 팀의 할 일은 없고 ${TEAMS[leadTeam(c)].name}에서 처리합니다.</div>`}</li>`;
    }
    function draw() {
      $$('button[data-l]', matWrap).forEach(b => b.classList.toggle('on', !!st.cell && b.dataset.l === st.cell.layer && b.dataset.o === st.cell.owner));
      if (st.cell) {
        const o = OWN[st.cell.owner], l = LAYER[st.cell.layer];
        const list = causes.filter(c => c.layer === l.id && (st.mode === 'all' ? c.own.includes(o.id) : c.own[0] === o.id));
        out.innerHTML = `<p class="own-list-head">${TR`<b>${l.name}</b> · ${o.name} ${st.mode === 'all' ? TR`(함께 대응 포함)` : TR`(주 담당)`} ${list.length}가지`} <button type="button" class="btn small" data-clear>${TR`팀 전체 보기`}</button></p>` +
          (list.length ? `<ul>${list.map(c => item(c, o.team)).join('')}</ul>` : TR`<p class="note">이 범위에 해당하는 원인이 없습니다. “함께 대응 포함”을 골라 보세요.</p>`);
        $('[data-clear]', out).addEventListener('click', () => { st.cell = null; draw(); });
        return;
      }
      const pick = c => (st.mode === 'all' ? teamsOf(c).includes(st.team) : leadTeam(c) === st.team);
      const groups = rows.map(l => [l, causes.filter(c => c.layer === l.id && pick(c))]).filter(([, v]) => v.length);
      const n = groups.reduce((a, [, v]) => a + v.length, 0);
      out.innerHTML = TR`<p class="own-list-head"><b>${TEAMS[st.team].name}</b> ${st.mode === 'all' ? TR`할 일이 있는` : TR`주 담당인`} 원인 ${n}가지. 층을 눌러 펼치세요. 표의 칸을 누르면 그 층·담당만 봅니다.</p>` +
        groups.map(([l, v], i) => `<details${i === 0 ? ' open' : ''}><summary>${l.short} <span class="mono">${v.length}</span></summary><ul>${v.map(c => item(c, st.team)).join('')}</ul></details>`).join('');
    }
    root.append(stats, matWrap, ctl, out);
    draw();
  });

  /* ---------------- 장별 출처 ---------------- */
  Object.entries(D.secRefs || {}).forEach(([id, refs]) => {
    const sec = document.getElementById(id);
    if (!sec || !refs || !refs.length) return;
    sec.append(K.el('details', { class: 'sec-refs', html: `<summary>${TR`이 장의 출처`} <span class="mono">${refs.length}</span></summary>${refList(refs)}` }));
  });

  /* ---------------- 제보 가이드 ---------------- */
  $('#report-cols').innerHTML = D.report.map(g => `<div class="analogy" style="grid-template-columns:1fr;max-width:none"><span class="tag">${g.title}</span><ol style="margin:0;padding-left:1.2em;display:grid;gap:6px;font-size:15px">${g.items.map(i => `<li>${i}</li>`).join('')}</ol></div>`).join('');

  /* ---------------- 용어 사전 ---------------- */
  const gl = $('#gloss');
  gl.innerHTML = D.glossary.map(([k, en, d, sec]) =>
    `<div data-q="${esc((k + ' ' + en + ' ' + d).toLowerCase())}"><dt id="${glossId(en)}">${k}<span class="en">${esc(en)}</span>${TR`<a class="h-link" href="#${glossId(en)}" aria-label="${esc(k)} 링크 복사"></a>`}</dt><dd>${d}${sec ? TR` <a href="#${sec}">관련 장 →</a>` : ''}</dd></div>`).join('');
  /* ---------------- 참고 문헌: 원인 카드와 장별 출처를 주소 기준으로 모은다 ---------------- */
  (function () {
    const box = $('#ref-list'); if (!box) return;
    const all = new Map();
    const add = (r, where) => {
      if (!r || !r.u) return;
      const k = r.u.replace(/#.*$/, '').replace(/\/$/, '');
      if (!all.has(k)) all.set(k, { t: r.t, u: r.u, p: r.p || TR`기타`, at: [] });
      const e = all.get(k);
      if (!e.at.some(w => w.href === where.href)) e.at.push(where);
    };
    D.causes.forEach(c => (c.ref || []).forEach(r => add(r, { href: '#c-' + c.id, label: c.t })));
    Object.entries(D.secRefs || {}).forEach(([id, refs]) => {
      const h = document.querySelector('#' + id + ' h2');
      refs.forEach(r => add(r, { href: '#' + id, label: (h ? h.textContent : id) + TR` (장)` }));
    });
    if (!all.size) { box.innerHTML = TR`<p class="note">아직 등록된 출처가 없습니다.</p>`; return; }
    const groups = {};
    all.forEach(e => { (groups[e.p] = groups[e.p] || []).push(e); });
    const order = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length || a.localeCompare(b, K.locale));
    box.innerHTML = TR`<p class="note">자료 ${all.size}건, 발행처 ${order.length}곳</p>` + order.map(p => `<h3 class="ref-pub">${esc(p)} <span class="mono">${groups[p].length}</span></h3><ul class="refs bib">${groups[p].sort((a, b) => a.t.localeCompare(b.t, K.locale)).map(e =>
      `<li><a href="${esc(e.u)}" target="_blank" rel="noopener noreferrer">${esc(e.t)}</a><details><summary>${TR`인용 ${e.at.length}곳`}</summary>${e.at.map(w => `<a href="${w.href}">${w.label}</a>`).join(' · ')}</details></li>`).join('')}</ul>`).join('');
  })();

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
  // 열린 목차를 Esc로 닫으면 초점을 목차 단추로 돌려준다(닫힌 목차 안에 초점이 남지 않게)
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { closeNav(); openBtn.focus(); } });

  const navLinks = $$('.nav a[href^="#"]');
  const where = $('#where');
  const sections = $$('main section.chapter');
  // 현재 위치: 머리가 화면 위쪽(140px)을 지난 장 중 마지막 장. 장이 길어 교차 이벤트가 오지 않아도 맞도록 스크롤할 때마다 위치를 잰다
  let navBest, navQueued = false;
  function trackNav() {
    navQueued = false;
    let best = null;
    for (const s of sections) { if (s.getBoundingClientRect().top <= 140) best = s; else break; }
    if (!best) best = sections.find(s => s.getBoundingClientRect().top < innerHeight) || null;
    const id = best ? best.id : null;
    if (id === navBest) return;
    navBest = id;
    navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
    if (where) where.textContent = best ? $('h2', best).textContent : '';
  }
  const queueNav = () => { if (!navQueued) { navQueued = true; requestAnimationFrame(trackNav); } };
  window.addEventListener('scroll', queueNav, { passive: true });
  window.addEventListener('resize', queueNav);
  if (window.ResizeObserver) new ResizeObserver(queueNav).observe($('main'));   // 실험이 자리를 잡으며 본문 높이가 바뀔 때도
  trackNav();

  // 주소의 #c-… 로 들어오면 그 원인의 자세히를 펼친다
  function openHash() {
    const h = location.hash.slice(1);
    if (!h) return;
    const el = document.getElementById(h);
    if (el && el.classList.contains('cause')) { const d = $('details', el); if (d) d.open = true; }
  }
  window.addEventListener('hashchange', openHash);

  // 원인 링크 복사: 장애 기록·티켓에 붙여 이 원인을 가리키는 주소
  function copyOld(t) {
    const ta = document.createElement('textarea');
    ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.append(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { /* 복사가 막힌 환경 */ }
    ta.remove();
    return ok ? Promise.resolve() : Promise.reject(new Error('copy'));
  }
  // 클립보드 API는 https·localhost에서만 되므로 http 서버·파일로 열었을 때는 예전 방식으로 복사한다
  const copyText = t => (navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(t).catch(() => copyOld(t)) : copyOld(t));
  // 버튼 이름(aria-label)은 그대로라 화면 낭독기가 “복사됨”을 듣도록 따로 알린다
  const copyLive = K.el('p', { class: 'sr-only', 'aria-live': 'polite' });
  document.body.append(copyLive);
  const share = (link, onDone) => {
    const url = SITE + (link.charAt(0) === '#' ? link : link.replace(/^\//, ''));
    copyText(url).then(() => onDone(true, url), () => onDone(false, url));
  };
  const toast = K.el('p', { class: 'share-toast', role: 'status' });
  document.body.append(toast);
  const flash = msg => { toast.textContent = msg; toast.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => toast.classList.remove('on'), 1800); };
  document.addEventListener('click', e => {
    const b = e.target.closest('button[data-link]');
    if (b) {
      const label = b.textContent;
      const show = msg => { b.textContent = msg; copyLive.textContent = msg; clearTimeout(b._t); b._t = setTimeout(() => { b.textContent = label; copyLive.textContent = ''; }, 1800); };
      share(b.dataset.link, ok => show(ok ? TR`복사됨` : TR`주소창에서 복사하세요`));
      if (b.dataset.link.charAt(0) === '#') history.replaceState(null, '', b.dataset.link);
      return;
    }
    // 제목·용어·단계 옆의 # 링크: 그 자리로 가면서 공개 주소를 복사한다
    const a = e.target.closest('a.h-link');
    if (a) share(a.getAttribute('href'), ok => { const msg = ok ? TR`링크를 복사했습니다` : TR`주소창의 주소를 복사하세요`; flash(msg); copyLive.textContent = msg; });
  });
  // 언어 바꾸기: 지금 보던 자리(#…)를 그대로 가져간다(원인·장·절 ID는 언어마다 같다)
  document.addEventListener('click', e => {
    const a = e.target.closest('a.lang-link');
    if (a && location.hash && !a.hash) a.href = a.href.split('#')[0] + location.hash;
  });
  // 장·절 제목에 # 링크를 단다(글자는 CSS로 그려 제목 textContent를 바꾸지 않는다)
  $$('main section[id] > .ch-head h2, h3.sec[id]').forEach(h => {
    const id = h.id || h.closest('section[id]').id;
    if (!id || $('.h-link', h)) return;
    h.append(K.el('a', { class: 'h-link', href: '#' + id, 'aria-label': h.textContent.trim() + TR` 링크 복사` }));
  });

  /* ---------------- 관측으로 판정하기: 그래프 모양 13가지, 확인 수단 분포 ---------------- */
  const causeLink = c => `<a href="#c-${c.id}">${c.t}</a>`;
  const layerName = id => (LAYER[id] ? LAYER[id].short || LAYER[id].name : id);
  (function () {
    const box = $('#sig-legend'); if (!box) return;
    box.innerHTML = (D.sigs || []).map(g => {
      const list = D.causes.filter(c => c.sig && c.sig.k === g.id);
      return `<div class="sig-tile" id="sig-${g.id}">${sigFig(g.id)}
        <div class="sig-body"><p class="sig-name"><b>${g.name}</b> <span class="mono">${list.length}</span>${TR`<a class="h-link" href="#sig-${g.id}" aria-label="${esc(g.name)} 링크 복사"></a>`}</p><p>${g.desc}</p>
        ${list.length ? `<details><summary>${TR`이 모양의 원인 ${list.length}가지`}</summary><ul>${list.map(c => `<li>${causeLink(c)} <span class="note">${layerName(c.layer)}</span></li>`).join('')}</ul></details>` : ''}</div></div>`;
    }).join('');
  })();
  (function () {
    const box = $('#chk-cover'); if (!box) return;
    const BY = ['ops', 'code', 'user'];
    const LABEL = { ops: TR`인프라 도구`, code: TR`게임 로그·지표`, user: TR`유저 쪽` };
    const rows = ALL_LAYERS.map(l => {
      const list = D.causes.filter(c => c.layer === l.id && c.chk);
      const n = Object.fromEntries(BY.map(b => [b, list.filter(c => c.chk.by === b).length]));
      return { l, n, list, total: list.length };
    }).filter(r => r.total);
    if (!rows.length) { box.innerHTML = ''; return; }
    const all = Object.fromEntries(BY.map(b => [b, rows.reduce((a, r) => a + r.n[b], 0)]));
    const sum = BY.reduce((a, b) => a + all[b], 0);
    const bar = n => `<div class="cover-bar" role="img" aria-label="${BY.map(b => `${LABEL[b]} ${n[b]}`).join(', ')}">${BY.map((b, i) => n[b] ? `<span class="cv-${i + 1}" style="flex:${n[b]}" title="${LABEL[b]} ${n[b]}">${n[b]}</span>` : '').join('')}</div>`;
    // 관측 커버리지 계산기: 가진 수단을 고르면 확인할 수 있는 원인 수와 아직 안 보이는 원인 목록을 보여 준다
    const have = new Set(['ops']);
    const pick = K.el('fieldset', { class: 'cover-pick' }, K.el('legend', { text: TR`지금 가진 확인 수단` }));
    const opts = K.el('div', { class: 'opts' });
    BY.forEach((b, i) => {
      const id = 'cvp-' + b;
      const inp = K.el('input', { type: 'checkbox', id, value: b });
      inp.checked = have.has(b);
      inp.addEventListener('change', () => { inp.checked ? have.add(b) : have.delete(b); calc(); });
      opts.append(inp, K.el('label', { for: id, html: `<i class="cv-dot cv-${i + 1}"></i>${LABEL[b]}` }));
    });
    pick.append(opts);
    const res = K.el('div', { class: 'cover-res', 'aria-live': 'polite' });
    box.innerHTML = `<p class="legend cover-legend">${BY.map((b, i) => TR`<span><i class="cv-${i + 1}"></i>${LABEL[b]} ${all[b]}가지 (${Math.round(all[b] / sum * 100)}%)</span>`).join('')}</p>
      <div class="cover">${rows.map(r => `<div class="cover-row"><a href="#${r.l.anchor || 'l-' + r.l.id}">${r.l.short || r.l.name}</a>${bar(r.n)}</div>`).join('')}</div>`;
    box.append(pick, res);
    function calc() {
      const ok = rows.reduce((a, r) => a + r.list.filter(c => have.has(c.chk.by)).length, 0);
      const miss = rows.map(r => ({ r, list: r.list.filter(c => !have.has(c.chk.by)) })).filter(x => x.list.length);
      const missN = sum - ok;
      res.innerHTML = TR`<p class="sim-say">${K.flag(ok / sum >= 0.7 ? 'good' : 'warn')}고른 수단으로 확인할 수 있는 원인은 <b>${ok}가지</b>(전체 ${sum}가지의 ${Math.round(ok / sum * 100)}%)입니다.${missN ? TR` 나머지 <b>${missN}가지</b>는 다른 수단으로 확인하는 편이 쉽습니다.${have.has('code') ? '' : TR` 게임 로그·지표가 필요한 원인은 개발팀에 계측을 요청할 목록이 됩니다.`}` : ''}</p>
        ${miss.length ? `<details class="cover-miss"><summary>${TR`다른 수단이 필요한 원인 ${missN}가지`}</summary>${miss.map(({ r, list }) => `<p class="cover-miss-l"><b>${r.l.short || r.l.name}</b> <span class="note">${list.length}</span></p><div class="chips">${list.map(c => `<a class="cause-chip cv-b-${BY.indexOf(c.chk.by) + 1}" href="#c-${c.id}" title="${LABEL[c.chk.by]}">${c.t}</a>`).join('')}</div>`).join('')}</details>` : ''}`;
    }
    calc();
  })();

  /* ---------------- 사례와 절차 ---------------- */
  const CAUSE = Object.fromEntries(D.causes.map(c => [c.id, c]));
  const causeChips = ids => (ids || []).filter(id => CAUSE[id]).map(id => `<a class="cause-chip" href="#c-${id}">${CAUSE[id].t}</a>`).join('');
  (function () {
    const box = $('#playbooks'); if (!box) return;
    box.innerHTML = (D.playbooks || []).map(pb => `<div class="playbook" id="pb-${pb.id}">
      <h4>${esc(pb.t)} ${shareBtn(`#pb-${pb.id}`, pb.t)}</h4><p class="note">${pb.when}</p>
      <ol class="pb-steps">${(pb.steps || []).map((st, i) => `<li id="pb-${pb.id}-${i + 1}">${TR`<b>${st.t}</b><a class="h-link" href="#pb-${pb.id}-${i + 1}" aria-label="${i + 1}단계 링크 복사"></a>`}<p>${st.d}</p>${st.causes && st.causes.length ? `<div class="chips">${causeChips(st.causes)}</div>` : ''}</li>`).join('')}</ol>
      ${pb.ref && pb.ref.length ? `<details><summary>${TR`출처 ${pb.ref.length}`}</summary>${refList(pb.ref)}</details>` : ''}</div>`).join('') || TR`<p class="note">준비 중입니다.</p>`;
  })();
  (function () {
    const box = $('#case-list'); if (!box) return;
    box.innerHTML = (D.cases || []).map(x => `<article class="case" id="case-${x.id}">
      <p class="case-org">${esc(x.org)} · ${x.year}</p><h4>${esc(x.t)}</h4>
      <dl><dt>${TR`무슨 일`}</dt><dd>${x.what}</dd><dt>${TR`배울 점`}</dt><dd>${x.lesson}</dd></dl>
      <details class="case-why"><summary>${TR`원인 자세히`}</summary><p>${x.why}</p></details>
      <div class="chips">${causeChips(x.causes)}</div>
      <p class="case-src">${TR`<a href="${esc(x.u)}" target="_blank" rel="noopener noreferrer">원문: ${esc(x.p || x.org)}</a>${shareBtn(`#case-${x.id}`, x.t)}`}</p></article>`).join('') || TR`<p class="note">준비 중입니다.</p>`;
  })();

  /* ---------------- 증상 × 층 지도 ---------------- */
  K.register('symmap', function (root) {
    const rows = ALL_LAYERS.filter(l => D.causes.some(c => c.layer === l.id));
    const count = (l, s) => D.causes.filter(c => c.layer === l.id && c.sym.includes(s.id));
    const max = Math.max(...rows.flatMap(l => D.symptoms.map(s => count(l, s).length)));
    const wrap = K.el('div', { class: 'table-wrap symmap-wrap' });
    wrap.innerHTML = `<table class="symmap"><thead><tr><th scope="col">${TR`층·주제`}</th>${D.symptoms.map(s => `<th scope="col"><span>${s.name}</span></th>`).join('')}</tr></thead><tbody>${rows.map(l => `<tr><th scope="row"><a href="#${l.anchor || 'l-' + l.id}">${l.short || l.name}</a></th>${D.symptoms.map(s => {
      const n = count(l, s).length;
      return `<td style="--a:${n ? (0.08 + 0.47 * n / max).toFixed(2) : 0}">${n ? `<button type="button" data-l="${l.id}" data-s="${s.id}" aria-label="${esc(TR`${l.short || l.name} · ${s.name}: 원인 ${n}가지`)}">${n}</button>` : ''}</td>`;
    }).join('')}</tr>`).join('')}</tbody><tfoot><tr><th scope="row">${TR`합계`}</th>${D.symptoms.map(s => `<td>${D.causes.filter(c => c.sym.includes(s.id)).length}</td>`).join('')}</tr></tfoot></table>`;
    const out = K.el('div', { class: 'symmap-out', 'aria-live': 'polite' });
    out.innerHTML = TR`<p class="note">칸을 누르면 그 층에서 그 증상을 만드는 원인이 여기에 나옵니다.</p>`;
    wrap.addEventListener('click', e => {
      const b = e.target.closest('button[data-l]'); if (!b) return;
      $$('button[aria-pressed="true"]', wrap).forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      const l = LAYER[b.dataset.l], sy = SYM[b.dataset.s];
      const list = count(l, sy);
      out.innerHTML = `<p class="own-list-head"><b>${l.short || l.name}</b> · ${sy.name} <span class="mono">${TR`${list.length}가지`}</span></p><div class="own-list"><ul>${list.map(c => `<li><div class="own-li-top">${causeLink(c)}${c.own ? ownBadge(c.own[0]) : ''}</div><div class="own-act">${c.s}</div></li>`).join('')}</ul></div>`;
    });
    const F = K.frame(root, {
      kicker: TR`증상 사전 · 한눈에 보기`, title: TR`어느 층이 어떤 증상을 만드나`,
      lead: TR`가로는 증상, 세로는 층과 주제입니다. 숫자는 그 층에서 그 증상을 만드는 원인의 수이고 진할수록 많습니다. 같은 증상이라도 여러 층에서 생길 수 있다는 것이 한눈에 보입니다.`,
      layout: 'stack',
    });
    F.stage.append(wrap, out);
  });

  /* ---------------- 시뮬레이션 올리기 ---------------- */
  K.mountAll();
  // 가로로 넘치는 표·그림은 키보드로도 스크롤할 수 있게 초점을 받게 한다(넘칠 때만)
  const scrollers = () => $$('.table-wrap, .fig-scroll, .os-matrix').forEach(el => {
    const over = el.scrollWidth > el.clientWidth + 1;
    if (over && !el.hasAttribute('tabindex')) { el.tabIndex = 0; el.dataset.sc = '1'; }
    else if (!over && el.dataset.sc) { el.removeAttribute('tabindex'); delete el.dataset.sc; }
  });
  scrollers();
  let scT; window.addEventListener('resize', () => { clearTimeout(scT); scT = setTimeout(scrollers, 200); });
  openHash();
  if (location.hash) { const el = document.getElementById(location.hash.slice(1)); if (el) setTimeout(() => el.scrollIntoView(), 50); }
})();
