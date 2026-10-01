/* =========================================================================
   kit.js — 모든 시뮬레이션이 함께 쓰는 도구 상자 (전역 K)

   ■ 등록
     K.register(id, mount)       mount(root, opts) 는 <div class="sim" data-sim="id"> 를 받는다.
                                 root.dataset 으로 옵션을 읽을 수 있다.

   ■ DOM
     K.el(tag, attrs?, ...kids)  attrs: class, text, html, style(객체|문자열), on:{click:fn}, 기타 속성
     K.frame(root, {kicker, title, lead, tries:[...], layout:'side'|'stack'})
        → { root, head, presets, stage, panel, controls, stats, say(html), tries }
          stage   : 캔버스/그림을 넣는 곳
          controls: 슬라이더·토글을 넣는 곳 (layout 'side' = 오른쪽 세로 패널, 'stack' = 아래 격자)
          stats   : K.stat 타일을 넣는 곳 (무대 아래 가로 격자)
          presets : '상황 불러오기' 버튼 줄 (K.presets 로 채움; 안 쓰면 숨겨짐)
          say(html): 지금 무슨 일이 일어나는지 쉬운 말로 해설 (300ms 에 한 번만 DOM 갱신)
     K.group(parent, title)      조작부 묶음 제목 → 그 묶음 div 반환

   ■ 조작부 (모두 {el, get(), set(v, fire=true)} 반환)
     K.slider(parent, {id, label, min, max, step, value, unit, fmt(v), hint, onInput(v)})
     K.toggle(parent, {id, label, value, hint, onChange(bool)})
     K.choice(parent, {id, label, options:[[value,label],...], value, onChange(v)})
     K.button(parent, {label, onClick, kind:'primary'|'ghost'|'small', title})
     K.presets(frame, [{label, title?, apply()}])   상황 프리셋 버튼 줄

   ■ 수치 타일
     K.stat(parent, {label, unit, sub}) → { set(valueText, status?, subText?) }
        status: 'good' | 'warn' | 'bad' | null  (색 + 모양 + 낱말: 좋음●/주의▲/나쁨■)
     K.flag(status) → 상태 표시 HTML 문자열
     K.meter(parent) → { set(frac 0..1, status?) }

   ■ 캔버스
     K.canvas(parent, {height: number | (w)=>number, caption?, right?})
        → { cv, ctx, w, h, wrap, cap, onResize(fn) }   CSS 픽셀 좌표로 그리면 된다(DPR 자동)
     K.loop(root, fn(dt, now))   화면에 보일 때만 돈다. dt(ms) 는 최대 100 으로 자른다.
                                 처음 한 번은 보이지 않아도 fn(16) 을 불러 첫 화면을 채운다.
     K.hover(canvasObj, fn(x, y) → html | null)   마우스/터치 위치에 툴팁

   ■ 색 (테마 바뀌면 자동 갱신)
     K.C.ink / ink2 / muted / line / grid / surface / paper / bg / sunk / accent / accentSoft
         good / warn / serious / bad / s1 ... s8
     K.onTheme(fn)               테마·폰트가 바뀔 때 다시 그려야 하는 정적 그림용
     K.alpha(color, a)           '#rrggbb' → 'rgba(...)'

   ■ 캔버스 그리기
     K.font(size, weight=400, mono=false)
     K.text(ctx, str, x, y, {size, weight, color, align, baseline, mono})
     K.rr(ctx, x, y, w, h, r)    둥근 사각형 path
     K.plot(ctx, box{x,y,w,h}, {x0,x1,y0,y1, yTicks, yFmt, xTicks, xFmt, yTitle, xTitle, grid=true})
        → 눈금·격자·축을 그리고 scale {x(v), y(v), box} 반환
     K.line(ctx, sc, pts[[x,y],...], color, width=2)
     K.area(ctx, sc, pts, color, alpha=.12, base=y0)
     K.hline(ctx, sc, yVal, {color, label, dash})
     K.dot(ctx, x, y, r, fill)   표면색 2px 고리 포함

   ■ 기타
     K.on(name, fn) / K.emit(name, detail)   장 사이 신호 (예: 'lab:preset')
     K.glyph(symptomId)          증상 그림 SVG 문자열 (stutter, teleport, rubber, burst, slowmo, delay, freeze, dropped, disconnect, noconnect, invisible)
     K.fxIcon('lat'|'jit'|'loss'|'stall')   네 가지 원요인 아이콘
     K.addStyle(id, css)         시뮬레이션 전용 CSS 를 한 번만 주입 (공용 style.css 는 수정 금지)
     K.reducedMotion             사용자가 움직임 줄이기를 켰는지

   ■ 수학·서식
     K.clamp, K.lerp, K.rng(seed) → ()=>0..1, K.gauss(rng)
     K.ms(v) → '85 ms' / '1.2 초', K.n(v, digits), K.pct(v)
   ========================================================================= */
(function () {
  const K = (window.K = {});
  K.SIMS = {};
  K.register = (id, mount) => { K.SIMS[id] = mount; };

  /* ---------------- 수학·서식 ---------------- */
  K.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  K.lerp = (a, b, t) => a + (b - a) * t;
  K.rng = function (seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  K.gauss = function (r) {
    const u = Math.max(1e-9, r()), v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  // 숫자 서식은 페이지 언어를 따른다(번역판은 빌드가 I18N.locale 을 넣는다)
  K.locale = (window.I18N && window.I18N.locale) || 'ko-KR';
  // 두 문장 잇기: 앞 문장 끝에 마침표를 찍고 띄운다. 번역판은 이 틀을 번역해 중국어·일본어는 “。”로 잇는다
  K.then = (a, b) => (a ? TR`${a}. ${b}` : b);
  // 문장 여러 개 잇기: 중국어·일본어는 문장 사이를 띄우지 않는다
  K.sp = /^(ja|zh)/.test((window.I18N && window.I18N.lang) || 'ko') ? '' : ' ';
  K.sentences = list => list.join(K.sp);
  // 문장 끝 마침표(번역판은 그 언어 문장 부호: 。, 태국어는 없음)
  K.end = s => TR`${s}.`;
  // 한국어 조사(받침에 따라 이/가, 을/를, 은/는, 과/와). 괄호 속 설명은 건너뛰고, 숫자는 읽는 소리로 본다.
  // 다른 언어에서는 빈 문자열이라, 번역문은 {0} 자리에 낱말만 받는다
  const JOSA = { ga: ['이', '가'], eul: ['을', '를'], eun: ['은', '는'], wa: ['과', '와'] };
  K.pp = (w, k) => {
    if (((window.I18N && window.I18N.lang) || 'ko') !== 'ko') return '';
    const s = String(w).replace(/\s*\(.*\)$/, ''), last = s.slice(-1), c = last.charCodeAt(0) - 0xac00;
    const has = /\d/.test(last) ? '0136789'.includes(last) : c >= 0 && c < 11172 && c % 28 !== 0;
    return JOSA[k][has ? 0 : 1];
  };
  K.josa = (w, k) => w + K.pp(w, k);
  K.firstSentence = s => (String(s).match(/^[\s\S]*?[.。！？!?](?=\s|$)/) || [String(s)])[0];
  K.lang = (window.I18N && window.I18N.lang) || 'ko';
  // 큰 수 줄여 쓰기(번역판: 16K, 1.6万, 16 Tsd.). 한국어판의 만·억 표기는 실험마다 따로 둔다
  // 줄임 표기가 1만 단위부터 없는 언어(독일어는 100만부터 Mio.)는 천 단위를 k 로 줄인다
  K.compact = function (v) {
    if (!Number.isFinite(v)) return '—';
    const s = v.toLocaleString(K.locale, { notation: 'compact', maximumFractionDigits: 1 });
    return Math.abs(v) >= 1e4 && /^[-−]?[\d.,\s\u00a0\u202f]+$/.test(s) ? K.nr(v / 1000) + 'k' : s;
  };
  // 소수 자리를 필요한 만큼만(1.5, 2), 천 단위 구분 없이. 소수점 기호는 언어를 따른다
  K.nr = (v, d = 1) => (Number.isFinite(v) ? v.toLocaleString(K.locale, { maximumFractionDigits: d, useGrouping: false }) : '—');
  K.n = (v, d = 0) => (Number.isFinite(v) ? v.toLocaleString(K.locale, { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');
  K.ms = function (v) {
    if (!Number.isFinite(v)) return '∞';
    if (Math.abs(v) >= 10000) return K.n(v / 1000, 0) + TR` 초`;
    if (Math.abs(v) >= 1000) return K.n(v / 1000, 1) + TR` 초`;
    if (v !== 0 && Math.abs(v) < 0.001) return K.n(v * 1e6, 0) + ' ns';
    if (v !== 0 && Math.abs(v) < 0.1) return K.n(v * 1000, 0) + ' µs';
    if (v !== 0 && Math.abs(v) < 1) return K.n(v, 2) + ' ms';
    if (Math.abs(v) < 10 && v !== 0) return K.n(v, 1) + ' ms';
    return K.n(v, 0) + ' ms';
  };
  K.pct = (v, d = 0) => K.n(v * 100, d) + '%';

  /* ---------------- DOM ---------------- */
  K.el = function (tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'text') e.textContent = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k === 'style') {
          if (typeof v === 'string') e.style.cssText = v; else Object.assign(e.style, v);
        } else if (k === 'on') { for (const ev in v) e.addEventListener(ev, v[ev]); }
        else if (v === true) e.setAttribute(k, '');
        else e.setAttribute(k, v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      e.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return e;
  };
  let uid = 0;
  K.uid = (p = 'k') => p + '-' + (++uid);

  // 실험 제목의 단계: 같은 장에서 바로 앞 제목이 장 제목(h2)이면 h3, 소제목(h3) 아래면 h4. 제목 단계를 건너뛰지 않게 한다
  const headTag = root => {
    const sec = root.closest('section');
    let prev = null;
    if (sec) sec.querySelectorAll('.ch-head h2, h3.sec').forEach(h => { if (h.compareDocumentPosition(root) & Node.DOCUMENT_POSITION_FOLLOWING) prev = h; });
    return prev && prev.tagName === 'H3' ? 'h4' : 'h3';
  };

  K.frame = function (root, o = {}) {
    root.classList.add('sim');
    root.innerHTML = '';
    const head = K.el('header', { class: 'sim-head' },
      K.el('span', { class: 'sim-kicker', text: o.kicker || TR`직접 해보기` }),
      o.title ? K.el(headTag(root), { html: o.title }) : null,
      o.lead ? K.el('p', { html: o.lead }) : null);
    const presets = K.el('div', { class: 'sim-presets', hidden: true });
    const stage = K.el('div', { class: 'sim-stage' });
    const controls = K.el('div', { class: 'sim-controls' });
    const panel = K.el('div', { class: 'sim-panel' }, controls);
    const body = K.el('div', { class: 'sim-body layout-' + (o.layout || 'side') }, stage, panel);
    const stats = K.el('div', { class: 'sim-stats' });
    const sayEl = K.el('p', { class: 'sim-say', 'aria-live': 'polite' });
    root.append(head, presets, body, stats, sayEl);
    let tries = null;
    if (o.tries && o.tries.length) {
      tries = K.el('details', { class: 'sim-try', open: true },
        K.el('summary', { text: TR`이렇게 해보세요` }),
        K.el('ol', null, o.tries.map(t => K.el('li', { html: t }))));
      root.append(tries);
    }
    let pending = null, last = '', timer = 0;
    function say(html) {
      pending = html;
      if (timer) return;
      timer = setTimeout(() => {
        timer = 0;
        if (pending !== last) { sayEl.innerHTML = pending; last = pending; }
      }, last ? 300 : 0);
    }
    return { root, head, presets, stage, panel, controls, stats, say, sayEl, tries, body };
  };

  K.group = function (parent, title) {
    const g = K.el('div', { class: 'ctl-group' });
    if (title) g.append(K.el('div', { class: 'gt', text: title }));
    parent.append(g);
    return g;
  };

  function fillVar(inp) {
    const min = +inp.min, max = +inp.max, v = +inp.value;
    inp.style.setProperty('--fill', ((v - min) / (max - min || 1)) * 100 + '%');
  }

  K.slider = function (parent, o) {
    const id = o.id || K.uid('sl');
    const fmt = o.fmt || (v => K.n(v, (String(o.step || 1).split('.')[1] || '').length) + (o.unit ? ' ' + o.unit : ''));
    const inp = K.el('input', { type: 'range', id, min: o.min, max: o.max, step: o.step || 1, value: o.value });
    const out = K.el('output', { for: id, text: fmt(+o.value) });
    const el = K.el('div', { class: 'ctl ctl-slider' },
      K.el('label', { for: id }, K.el('span', { text: o.label }), out), inp,
      o.hint ? K.el('small', { class: 'ctl-hint', html: o.hint }) : null);
    parent.append(el);
    fillVar(inp);
    inp.addEventListener('input', () => {
      out.textContent = fmt(+inp.value); fillVar(inp);
      o.onInput && o.onInput(+inp.value);
    });
    return {
      el, input: inp,
      get: () => +inp.value,
      set(v, fire = true) { inp.value = v; out.textContent = fmt(+inp.value); fillVar(inp); if (fire && o.onInput) o.onInput(+inp.value); },
      label(t) { el.querySelector('label span').textContent = t; },
    };
  };

  K.toggle = function (parent, o) {
    const id = o.id || K.uid('tg');
    const inp = K.el('input', { type: 'checkbox', id, role: 'switch' });
    inp.checked = !!o.value;
    const el = K.el('div', { class: 'ctl' },
      K.el('label', { class: 'ctl-toggle', for: id }, inp, K.el('span', { class: 'sw', 'aria-hidden': 'true' }), K.el('span', { html: o.label })),
      o.hint ? K.el('small', { class: 'ctl-hint', html: o.hint }) : null);
    parent.append(el);
    inp.addEventListener('change', () => o.onChange && o.onChange(inp.checked));
    return { el, input: inp, get: () => inp.checked, set(v, fire = true) { inp.checked = !!v; if (fire && o.onChange) o.onChange(!!v); } };
  };

  K.choice = function (parent, o) {
    const name = o.id || K.uid('ch');
    const seg = K.el('div', { class: 'seg', role: 'radiogroup', 'aria-label': o.label || '' });
    const inputs = [];
    o.options.forEach(([val, lab], i) => {
      const id = name + '-' + i;
      const inp = K.el('input', { type: 'radio', name, id, value: String(val) });
      if (String(val) === String(o.value)) inp.checked = true;
      inp.addEventListener('change', () => { if (inp.checked && o.onChange) o.onChange(cast(val)); });
      inputs.push([inp, val]);
      seg.append(inp, K.el('label', { for: id, html: lab }));
    });
    function cast(v) { return v; }
    const el = K.el('div', { class: 'ctl' }, o.label ? K.el('div', { class: 'lab' }, K.el('span', { text: o.label })) : null, seg,
      o.hint ? K.el('small', { class: 'ctl-hint', html: o.hint }) : null);
    parent.append(el);
    return {
      el,
      get() { const f = inputs.find(([i]) => i.checked); return f ? f[1] : undefined; },
      set(v, fire = true) { const f = inputs.find(([, val]) => String(val) === String(v)); if (f) { f[0].checked = true; if (fire && o.onChange) o.onChange(f[1]); } },
    };
  };

  K.button = function (parent, o) {
    const b = K.el('button', { type: 'button', class: 'btn ' + (o.kind || ''), title: o.title || null, html: o.label });
    b.addEventListener('click', e => o.onClick && o.onClick(e));
    parent && parent.append(b);
    return b;
  };

  K.presets = function (frame, list, label = TR`상황 불러오기`) {
    const box = frame.presets || frame;
    box.hidden = false;
    box.innerHTML = '';
    box.append(K.el('span', { class: 'lbl', text: label }));
    const btns = list.map(p => {
      const b = K.button(box, { label: p.label, kind: 'small', title: p.title });
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => {
        btns.forEach(x => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        p.apply();
      });
      return b;
    });
    return {
      buttons: btns,
      clear() { btns.forEach(x => x.setAttribute('aria-pressed', 'false')); },
      press(i) { btns[i] && btns[i].click(); },
    };
  };

  /* ---------------- 상태 표시 ---------------- */
  const FLAG = {
    good: [TR`좋음`, '<svg viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="4.5"/></svg>'],
    warn: [TR`주의`, '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 .6 9.6 9.4H.4z"/></svg>'],
    bad: [TR`나쁨`, '<svg viewBox="0 0 10 10" aria-hidden="true"><rect x=".8" y=".8" width="8.4" height="8.4" rx="1"/></svg>'],
  };
  K.flag = s => (s && FLAG[s] ? `<span class="flag ${s}">${FLAG[s][1]}${FLAG[s][0]}</span>` : '');

  K.stat = function (parent, o) {
    const lab = K.el('span', { class: 'stat-label' }, K.el('span', { text: o.label }), K.el('span', { class: 'f' }));
    const val = K.el('span', { class: 'stat-val', html: '—' });
    const sub = K.el('span', { class: 'stat-sub', text: o.sub || '' });
    const el = K.el('div', { class: 'stat' }, lab, val, sub);
    if (o.title) el.title = o.title;
    parent.append(el);
    let lv = null, ls = null, lsub = null;
    return {
      el,
      set(v, status, subText) {
        const html = v + (o.unit ? `<i>${o.unit}</i>` : '');
        if (html !== lv) { val.innerHTML = html; lv = html; }
        if (status !== ls) { lab.lastChild.innerHTML = K.flag(status); ls = status; }
        if (subText != null && subText !== lsub) { sub.textContent = subText; lsub = subText; }
      },
    };
  };

  K.meter = function (parent) {
    const i = K.el('i');
    const el = K.el('div', { class: 'meter' }, i);
    parent.append(el);
    return { el, set(f, s) { i.style.width = K.clamp(f, 0, 1) * 100 + '%'; el.className = 'meter ' + (s || ''); } };
  };

  /* ---------------- 색 ---------------- */
  const TOK = {
    ink: 'ink', ink2: 'ink-2', muted: 'muted', line: 'line', grid: 'grid', surface: 'surface', paper: 'paper', bg: 'bg', sunk: 'sunk',
    accent: 'accent', accentSoft: 'accent-soft', good: 'good', warn: 'warn', serious: 'serious', bad: 'bad',
    goodInk: 'good-ink', warnInk: 'warn-ink', badInk: 'bad-ink',
    s1: 's1', s2: 's2', s3: 's3', s4: 's4', s5: 's5', s6: 's6', s7: 's7', s8: 's8',
  };
  K.C = {};
  const themeCbs = [];
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    for (const k in TOK) K.C[k] = cs.getPropertyValue('--' + TOK[k]).trim() || '#888';
  }
  readColors();
  function themeChanged() { readColors(); themeCbs.forEach(f => { try { f(); } catch (e) { console.error(e); } }); }
  K.onTheme = fn => { themeCbs.push(fn); };
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeChanged); } catch (e) { /* 구형 브라우저 */ }
  new MutationObserver(themeChanged).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(themeChanged);

  K.alpha = function (c, a) {
    if (!c) return `rgba(128,128,128,${a})`;
    if (c.startsWith('#')) {
      let h = c.slice(1);
      if (h.length === 3) h = h.split('').map(x => x + x).join('');
      const n = parseInt(h, 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    }
    if (c.startsWith('rgb(')) return c.replace('rgb(', 'rgba(').replace(')', `,${a})`);
    return c;
  };

  /* ---------------- 캔버스 ---------------- */
  K.canvas = function (parent, o = {}) {
    const wrap = K.el('div', { class: 'cv-wrap' });
    let cap = null;
    if (o.caption || o.right) {
      cap = K.el('div', { class: 'cv-cap' }, K.el('b', { html: o.caption || '' }), K.el('span', { html: o.right || '' }));
      parent.append(cap);
    }
    const cv = K.el('canvas', { role: 'img', 'aria-label': o.label || (o.caption || '').replace(/<[^>]+>/g, '') });
    wrap.append(cv);
    parent.append(wrap);
    const obj = { cv, ctx: cv.getContext('2d'), w: 300, h: 150, wrap, cap, dpr: 1, _cb: [] };
    obj.onResize = f => { obj._cb.push(f); };
    obj.setCaption = (l, r) => { if (!cap) return; if (l != null) cap.firstChild.innerHTML = l; if (r != null) cap.lastChild.innerHTML = r; };
    let lw = -1, lh = -1;
    function fit() {
      const w = Math.max(10, Math.round(wrap.clientWidth || parent.clientWidth || 300));
      const h = Math.round(typeof o.height === 'function' ? o.height(w) : (o.height || 220));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (w === lw && h === lh && dpr === obj.dpr) return;
      lw = w; lh = h;
      obj.w = w; obj.h = h; obj.dpr = dpr;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.height = h + 'px';
      obj.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      obj._cb.forEach(f => f());
      kick(wrap);
    }
    obj.fit = fit;
    if (window.ResizeObserver) new ResizeObserver(fit).observe(wrap);
    else window.addEventListener('resize', fit);
    fit();
    return obj;
  };

  // 멈춰 있는 루프도 캔버스 크기가 바뀌면 한 프레임 다시 그린다 (크기 변경은 캔버스를 지운다)
  const loops = [];
  let kickPending = new Set(), kickRaf = 0;
  function kick(el) {
    kickPending.add(el);
    if (kickRaf) return;
    kickRaf = requestAnimationFrame(t => {
      kickRaf = 0;
      const els = Array.from(kickPending); kickPending = new Set();
      loops.forEach(l => {
        if (l.isRunning() || !els.some(e => l.root.contains(e))) return;
        try { l.fn(16, t); } catch (e) { console.error(e); }
      });
    });
  }

  K.loop = function (root, fn) {
    let visible = false, running = false, raf = 0, last = 0;
    loops.push({ root, fn, isRunning: () => running });
    function tick(now) {
      if (!running) return;
      let dt = now - last; last = now;
      if (dt > 100) dt = 100;
      if (dt < 0) dt = 0;
      try { fn(dt, now); } catch (e) { console.error(e); running = false; return; }
      raf = requestAnimationFrame(tick);
    }
    function update() {
      const want = visible && !document.hidden;
      if (want && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); }
      else if (!want && running) { running = false; cancelAnimationFrame(raf); }
    }
    if (window.IntersectionObserver) {
      new IntersectionObserver(es => { visible = es[es.length - 1].isIntersecting; update(); }, { rootMargin: '120px' }).observe(root);
    } else { visible = true; update(); }
    document.addEventListener('visibilitychange', update);
    // 첫 화면은 보이지 않아도 한 번 그린다 (썸네일·빠른 스크롤 대비)
    requestAnimationFrame(t => { try { fn(16, t); } catch (e) { console.error(e); } });
    return { get running() { return running; } };
  };

  K.hover = function (co, fn) {
    const tip = K.el('div', { class: 'tip', hidden: true });
    co.wrap.append(tip);
    function show(e) {
      const r = co.cv.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      const x = p.clientX - r.left, y = p.clientY - r.top;
      const html = fn(x, y);
      if (!html) { tip.hidden = true; return; }
      tip.innerHTML = html; tip.hidden = false;
      const tw = tip.offsetWidth;
      const left = K.clamp(x, tw / 2 + 4, co.w - tw / 2 - 4);
      tip.style.left = left + 'px';
      tip.style.top = Math.max(y, tip.offsetHeight + 14) + 'px';
    }
    co.cv.addEventListener('pointermove', show);
    co.cv.addEventListener('pointerdown', show);
    co.cv.addEventListener('pointerleave', () => { tip.hidden = true; });
    return tip;
  };

  /* ---------------- 그리기 ---------------- */
  // 캔버스 글꼴: 한국어판은 한글 글꼴, 번역판은 그 언어의 본문 글꼴(style.css의 :lang 값)
  let sans = null;
  const sansFont = () => sans || (sans = K.locale === 'ko-KR' ? '"IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif'
    : (getComputedStyle(document.documentElement).getPropertyValue('--font-body').trim() || 'system-ui, sans-serif'));
  K.font = (size = 12, weight = 400, mono = false) =>
    `${weight} ${size}px ${mono ? '"IBM Plex Mono", ui-monospace, Menlo, monospace' : sansFont()}`;
  K.text = function (ctx, str, x, y, o = {}) {
    ctx.font = K.font(o.size || 11, o.weight || 400, o.mono);
    ctx.fillStyle = o.color || K.C.ink2;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'middle';
    ctx.fillText(str, x, y);
  };
  K.rr = function (ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  K.plot = function (ctx, box, o) {
    const { x0, x1, y0, y1 } = o;
    const sc = {
      box,
      x: v => box.x + ((v - x0) / (x1 - x0 || 1)) * box.w,
      y: v => box.y + box.h - ((v - y0) / (y1 - y0 || 1)) * box.h,
    };
    ctx.save();
    ctx.lineWidth = 1;
    if (o.grid !== false && o.yTicks) {
      ctx.strokeStyle = K.C.grid;
      for (const t of o.yTicks) {
        const yy = Math.round(sc.y(t)) + 0.5;
        ctx.beginPath(); ctx.moveTo(box.x, yy); ctx.lineTo(box.x + box.w, yy); ctx.stroke();
      }
    }
    if (o.yTicks) {
      for (const t of o.yTicks) K.text(ctx, o.yFmt ? o.yFmt(t) : String(t), box.x - 6, sc.y(t), { align: 'right', size: 10.5, mono: true, color: K.C.muted });
    }
    if (o.xTicks) {
      // 글자가 캔버스 밖으로 나가면 안쪽으로 당기고, 앞 눈금 글자와 겹치면 건너뛴다(번역판의 긴 단위)
      const W = ctx.canvas.width / (ctx.getTransform().a || 1);
      ctx.font = K.font(10.5, 400, true);
      let edge = -Infinity;
      for (const t of o.xTicks) {
        const str = o.xFmt ? o.xFmt(t) : String(t), half = ctx.measureText(str).width / 2;
        const xx = Math.max(half + 1, Math.min(sc.x(t), W - half - 1));
        if (xx - half < edge + 4) continue;
        K.text(ctx, str, xx, box.y + box.h + 12, { align: 'center', size: 10.5, mono: true, color: K.C.muted });
        edge = xx + half;
      }
    }
    ctx.strokeStyle = K.C.line;
    ctx.beginPath(); ctx.moveTo(box.x, Math.round(box.y + box.h) + 0.5); ctx.lineTo(box.x + box.w, Math.round(box.y + box.h) + 0.5); ctx.stroke();
    if (o.yTitle) K.text(ctx, o.yTitle, box.x, box.y - 10, { size: 11, color: K.C.muted });
    if (o.xTitle) K.text(ctx, o.xTitle, box.x + box.w, box.y + box.h + 26, { size: 11, color: K.C.muted, align: 'right' });
    ctx.restore();
    return sc;
  };
  K.line = function (ctx, sc, pts, color, width = 2) {
    if (!pts.length) return;
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => { const X = sc.x(p[0]), Y = sc.y(p[1]); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.stroke();
    ctx.restore();
  };
  K.area = function (ctx, sc, pts, color, alpha = 0.12, base) {
    if (pts.length < 2) return;
    const b = sc.y(base == null ? 0 : base);
    ctx.save();
    ctx.fillStyle = K.alpha(color, alpha);
    ctx.beginPath();
    ctx.moveTo(sc.x(pts[0][0]), b);
    pts.forEach(p => ctx.lineTo(sc.x(p[0]), sc.y(p[1])));
    ctx.lineTo(sc.x(pts[pts.length - 1][0]), b);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  K.hline = function (ctx, sc, yv, o = {}) {
    const y = Math.round(sc.y(yv)) + 0.5;
    ctx.save();
    ctx.strokeStyle = o.color || K.C.ink2; ctx.lineWidth = o.width || 1;
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath(); ctx.moveTo(sc.box.x, y); ctx.lineTo(sc.box.x + sc.box.w, y); ctx.stroke();
    ctx.restore();
    if (o.label) K.text(ctx, o.label, sc.box.x + sc.box.w - 4, y - 8, { align: 'right', size: 10.5, color: o.textColor || K.C.ink2, weight: 600 });
  };
  K.dot = function (ctx, x, y, r, fill, ring = K.C.surface) {
    ctx.beginPath(); ctx.arc(x, y, r + 2, 0, Math.PI * 2); ctx.fillStyle = ring; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  };


  /* ---------------- 이벤트 (장 사이 연결: 증상 카드 → 실험실 등) ---------------- */
  const bus = {};
  K.on = (name, fn) => { (bus[name] = bus[name] || []).push(fn); };
  K.emit = (name, detail) => { (bus[name] || []).forEach(f => { try { f(detail); } catch (e) { console.error(e); } }); };

  /* ---------------- 증상 그림 (움직임 궤적의 모양) ----------------
     점 간격 = 화면 속 속도. 촘촘하면 느림, 겹치면 멈춤, 벌어지면 순간이동. 30×12 viewBox, currentColor */
  const dots = (xs, r = 1.5, y = 6) => xs.map(x => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
  const GLYPH = {
    normal: dots([3, 9, 15, 21, 27]),
    stutter: dots([2.5, 4, 11, 12.5, 19.5, 21, 27.5]),
    teleport: dots([2.5, 6.5, 10.5]) + '<path d="M13 6h9" stroke="currentColor" stroke-width="1" stroke-dasharray="1 2" fill="none"/>' + dots([24, 28]),
    rubber: dots([3, 8, 13, 18]) + '<path d="M22 4.2c3.5 0 4.5 1.8 2.2 3.6-1.8 1.4-6 1.1-8.6 1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M16.8 7.3l-1.6 1.6 1.8 1.2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>',
    burst: dots([2.5, 3.4, 4.3, 5.2]) + dots([12, 20, 28], 1.5) + '<path d="M8 3.5h3M16 3.5h2.5M24 3.5h2" stroke="currentColor" stroke-width=".9" stroke-linecap="round"/>',
    slowmo: dots([2, 4.6, 7.2, 9.8, 12.4, 15, 17.6, 20.2, 22.8, 25.4, 28], 1.05),
    delay: '<circle cx="3.5" cy="6" r="2.4" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M7.5 6h10" stroke="currentColor" stroke-width="1" stroke-dasharray="1.2 1.8" fill="none"/>' + dots([21, 25.5, 29]),
    freeze: dots([2.5, 7, 11.5]) + '<rect x="15" y="2.5" width="1.8" height="7" rx=".6"/><rect x="18.4" y="2.5" width="1.8" height="7" rx=".6"/>' + dots([24, 28.5]),
    dropped: dots([3, 8]) + '<circle cx="16" cy="6" r="3.3" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M13.7 3.7l4.6 4.6M18.3 3.7l-4.6 4.6" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>' + '<path d="M28 6h-6m0 0 2-2m-2 2 2 2" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>',
    disconnect: '<path d="M1.5 6h9.5M19 6h9.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M13 3l1.6 6M15.8 3l1.6 6" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>',
    noconnect: '<path d="M15 1.8a4.2 4.2 0 1 1-4.2 4.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' + dots([3, 27], 1.2),
    invisible: dots([3, 8]) + '<circle cx="17" cy="6" r="3.6" fill="none" stroke="currentColor" stroke-width="1.1" stroke-dasharray="1.7 1.5"/>' + dots([26]),
  };
  K.glyph = (id, cls = '') => `<svg class="glyph ${cls}" viewBox="0 0 30 12" fill="currentColor" aria-hidden="true">${GLYPH[id] || GLYPH.normal}</svg>`;

  /* 네 가지 원요인: 지연 · 지터 · 손실 · 정체 (14×14) */
  const FX = {
    lat: '<circle cx="7" cy="7" r="5.6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M7 3.8V7l2.3 1.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
    jit: '<path d="M1 8.5l2.4-4 2.2 6 2.4-8 2.3 7 2.7-3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
    loss: '<path d="M1 7h3.5M9.5 7H13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M5.6 4.6l2.8 4.8M8.4 4.6 5.6 9.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
    stall: '<rect x="3" y="2.5" width="2.8" height="9" rx=".8"/><rect x="8.2" y="2.5" width="2.8" height="9" rx=".8"/>',
  };
  K.fxIcon = id => `<svg viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">${FX[id] || ''}</svg>`;

  // 시뮬레이션 전용 CSS 가 필요하면 파일 안에서 한 번만 주입한다 (공용 style.css 는 건드리지 않는다)
  K.addStyle = function (id, css) {
    if (document.getElementById('st-' + id)) return;
    document.head.append(K.el('style', { id: 'st-' + id, text: css }));
  };

  K.reducedMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------------- 시뮬레이션 올리기 ---------------- */
  K.mountAll = function (scope = document) {
    scope.querySelectorAll('[data-sim]').forEach(el => {
      if (el.dataset.mounted) return;
      const id = el.dataset.sim;
      const fn = K.SIMS[id];
      el.dataset.mounted = '1';
      if (!fn) { el.innerHTML = TR`<p class="sim-error">시뮬레이션 “${id}”를 찾지 못했습니다.</p>`; return; }
      try { fn(el, el.dataset); }
      catch (e) { console.error('[sim ' + id + ']', e); el.innerHTML = TR`<p class="sim-error">시뮬레이션 “${id}”를 불러오다 오류가 났습니다: ${e.message}</p>`; }
    });
  };
})();
