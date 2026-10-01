// 번역 도구. 원문은 한국어(src/)이고, 번역은 src/i18n/<언어>/<묶음>.json 에 둔다. 규칙: docs/I18N_GUIDE.md
//   node tools/i18n.cjs units                   원문 단위 수(묶음별)
//   node tools/i18n.cjs sync [언어…]            원문에 맞춰 번역 파일을 만들거나 고친다(새 항목은 t가 빈 채로, 원문이 바뀐 항목은 stale로)
//   node tools/i18n.cjs status [언어…]          언어·묶음별 번역률
//   node tools/i18n.cjs check [언어…]           자리표시·태그·링크·숫자 검사. 오류가 있으면 종료 코드 1 (--strict: 빈 항목도 오류)
//   node tools/i18n.cjs show <언어> <묶음> [--empty] [--from N] [--count M]   번역할 항목을 번호와 함께 보기
//   node tools/i18n.cjs fill <언어> <묶음> <파일.json>   {"번호": "번역", …} 또는 {"원문": "번역", …}을 t에 채운다
//   node tools/i18n.cjs pack <언어> <폴더>       빌드용: ui.json(화면 글자 사전), data.js(번역한 DATA), body.html, head.html, strings.json
//
// 번역 단위(원문 문자열)가 사전의 열쇠다. 원문이 바뀌면 열쇠가 바뀌어 그 항목은 빈 칸(또는 stale)이 되므로, 번역이 낡은 채 섞이지 않는다.
//   코드   TR`…${x}…` 태그(src/js/i18n.js). ${…} 자리는 {0}, {1} …
//   데이터 DATA 안의 한국어 문자열(출처의 제목·발행처·주소는 원문 그대로 둔다)
//   본문   src/body.html, src/head.html 의 글 덩어리(블록 안의 인라인 내용 한 묶음)와 aria-label·title·alt·placeholder·content 속성
//   빌드   build.py 의 tr("…")
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIR = path.join(SRC, 'i18n');
const LANGS = JSON.parse(fs.readFileSync(path.join(DIR, 'langs.json'), 'utf8'));
const HAN = /[가-힣]/;
// 코드의 TR 태그를 찾을 때만 TypeScript 구문 분석기가 필요하다(pack은 번역 파일만 읽으므로 없어도 된다)
let TS = null;
const tsLib = () => TS || (TS = (() => {
  for (const p of ['typescript', '/opt/node22/lib/node_modules/typescript', '/usr/local/lib/node_modules/typescript', '/usr/lib/node_modules/typescript']) { try { return require(p); } catch (e) { /* 다음 후보 */ } }
  throw new Error('typescript 패키지가 필요합니다: npm install');
})());

// ---------------------------------------------------------------- 원문 단위
const CODE_FILES = () => ['src/js/kit.js', 'src/js/sigs.js', 'src/js/sandbox.js', 'src/js/app.js',
  ...fs.readdirSync(path.join(SRC, 'sims')).filter(f => f.endsWith('.js')).sort().map(f => 'src/sims/' + f),
  'tools/site.cjs', 'tools/export.cjs', 'tools/og.cjs'];
const codeGroup = f => f.startsWith('src/sims/') ? 'sim-' + path.basename(f, '.js') : f === 'src/js/app.js' ? 'ui-app' : f.startsWith('tools/') ? 'site' : 'ui-kit';

function codeUnits(file) {
  const ts = tsLib();
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const out = [];
  const visit = n => {
    if (ts.isTaggedTemplateExpression(n) && n.tag.getText(sf) === 'TR') {
      const t = n.template;
      const ko = ts.isNoSubstitutionTemplateLiteral(t) ? t.text : t.head.text + t.templateSpans.map((s, i) => '{' + i + '}' + s.literal.text).join('');
      out.push({ ko, ctx: `${file}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`, code: true });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

function buildStrings() {
  const src = fs.readFileSync(path.join(ROOT, 'build.py'), 'utf8');
  const out = [];
  const re = /\btr\(\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(src))) out.push({ ko: JSON.parse('"' + m[1] + '"'), ctx: 'build.py:' + (src.slice(0, m.index).split('\n').length), code: true });
  return out;
}

const DATA_FILES = () => {
  const js = path.join(SRC, 'js');
  return ['data.js', ...fs.readdirSync(js).filter(f => /^causes-\d+\.js$/.test(f)).sort(), ...fs.readdirSync(js).filter(f => /^refs-.+\.js$/.test(f)).sort(),
    ...(fs.existsSync(path.join(js, 'cases.js')) ? ['cases.js'] : []), 'glossary.js'];
};
function loadData() {
  const ctx = { window: {} }; ctx.window = ctx; vm.createContext(ctx);
  for (const f of DATA_FILES()) vm.runInContext(fs.readFileSync(path.join(SRC, 'js', f), 'utf8'), ctx, { filename: f });
  return ctx.DATA;
}
const glossId = en => 'g-' + String(en).split(',')[0].toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// 출처의 제목(t)·발행처(p)·주소(u)는 원문 그대로 인용한다
const KEEP = /\/ref\/\d+\/[tpu]$|^secRefs\/[^/]+\/\d+\/[tpu]$/;
function dataUnits(D = loadData()) {
  const out = [];
  const walk = (v, p, group) => {
    if (typeof v === 'string') { if (HAN.test(v) && !KEEP.test(p)) out.push({ ko: v, ctx: p, group }); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${p}/${x && typeof x === 'object' && !Array.isArray(x) && x.id ? x.id : i}`, group)); return; }
    if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], `${p}/${k}`, group);
  };
  for (const k of Object.keys(D)) {
    if (k === 'causes') D.causes.forEach(c => walk(c, 'causes/' + c.id, 'causes-' + c.layer));
    else if (k === 'glossary') D.glossary.forEach(g => walk(g, 'glossary/' + glossId(g[1]), 'glossary'));
    else if (k === 'cases' || k === 'playbooks') walk(D[k], k, 'cases');
    else if (k === 'secRefs') walk(D[k], k, 'refs');
    else walk(D[k], k, 'data');
  }
  return out;
}

// ---------- HTML 조각 나누기: 블록 요소 안의 인라인 내용 한 묶음이 한 단위 ----------
const VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
const INLINE = new Set('a abbr b bdi bdo br cite code data dfn em i kbd mark q s samp small span strong sub sup time u var wbr'.split(' '));
const RAW = new Set(['script', 'style']);
const TATTR = new Set(['aria-label', 'title', 'alt', 'placeholder', 'content', 'aria-description']);
function parseAttrs(rest, offset) {
  const attrs = [];
  const re = /([^\s=/>]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = re.exec(rest))) {
    if (m[2] === undefined) { attrs.push({ name: m[1].toLowerCase() }); continue; }
    const q = m[2][0] === '"' || m[2][0] === "'";
    const value = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5];
    const vstart = offset + m.index + m[0].indexOf(m[2], m[1].length) + (q ? 1 : 0);
    attrs.push({ name: m[1].toLowerCase(), value, vstart, vend: vstart + value.length });
  }
  return attrs;
}
function parseHTML(src) {
  const root = { name: '#root', attrs: [], children: [], start: 0, end: src.length };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let last = 0, m;
  const top = () => stack[stack.length - 1];
  const text = (a, b) => { if (b > a) top().children.push({ text: true, start: a, end: b }); };
  while ((m = re.exec(src))) {
    text(last, m.index);
    last = re.lastIndex;
    if (m[0].startsWith('<!--')) { top().children.push({ comment: true, start: m.index, end: last }); continue; }
    const name = m[2].toLowerCase();
    if (m[1]) {
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].name === name) { stack[i].end = last; stack.length = i; break; }
      continue;
    }
    const el = { name, start: m.index, attrs: parseAttrs(m[3], m.index + 1 + m[2].length), children: [] };
    top().children.push(el);
    if (VOID.has(name) || /\/\s*$/.test(m[3])) { el.end = last; continue; }
    if (RAW.has(name)) { const close = src.indexOf('</' + name, last); const gt = src.indexOf('>', close) + 1; el.end = gt; re.lastIndex = last = gt; continue; }
    stack.push(el);
  }
  text(last, src.length);
  return root;
}
function segment(src) {
  const root = parseHTML(src);
  const units = [];
  const hanText = n => n.text ? HAN.test(src.slice(n.start, n.end)) : n.comment || RAW.has(n.name) ? false : n.children.some(hanText);
  const attr = (el, name) => (el.attrs.find(a => a.name === name) || {}).value;
  const noTr = el => attr(el, 'translate') === 'no';
  const attrUnits = (el, ctx, group) => el.attrs.forEach(a => { if (a.value && TATTR.has(a.name) && HAN.test(a.value)) units.push({ kind: 'attr', start: a.vstart, end: a.vend, ko: a.value, ctx: ctx + '@' + a.name, group }); });
  const deepAttrs = (n, ctx, group) => { if (n.text || n.comment || noTr(n)) return; attrUnits(n, ctx, group); n.children.forEach(c => deepAttrs(c, ctx, group)); };
  const visit = (el, ctx, group) => {
    if (el.name !== '#root' && noTr(el)) return;
    const id = attr(el, 'id');
    if (el.name === 'section' && id) group = 'body-' + id;
    const here = id ? '#' + id : ctx.split(' ')[0] + (el.name === '#root' ? '' : ' ' + el.name);
    attrUnits(el, here, group);
    if (RAW.has(el.name)) return;
    let run = [];
    const flush = () => {
      if (!run.length) return;
      if (run.some(hanText) && !run.some(n => !n.text && !n.comment && noTr(n))) {
        let s = run[0].start, e = run[run.length - 1].end;
        while (s < e && /\s/.test(src[s])) s++;
        while (e > s && /\s/.test(src[e - 1])) e--;
        units.push({ kind: 'run', start: s, end: e, ko: src.slice(s, e), ctx: here, group });
      } else run.forEach(n => deepAttrs(n, here, group));
      run = [];
    };
    for (const c of el.children) {
      if (c.text || c.comment || INLINE.has(c.name)) run.push(c);
      else { flush(); visit(c, here, group); }
    }
    flush();
  };
  visit(root, '', 'body-shell');
  return units;
}
const htmlUnits = () => [
  ...segment(fs.readFileSync(path.join(SRC, 'body.html'), 'utf8')),
  ...segment(fs.readFileSync(path.join(SRC, 'head.html'), 'utf8')).map(u => Object.assign(u, { group: 'meta' })),
];

// 모든 단위를 묶음별로(묶음 안에서는 원문이 같으면 하나로)
function allUnits() {
  const groups = new Map();
  const add = (group, u) => {
    if (!groups.has(group)) groups.set(group, new Map());
    const g = groups.get(group);
    if (g.has(u.ko)) { const x = g.get(u.ko); if (!x.ctx.includes(u.ctx) && x.ctx.length < 200) x.ctx += ', ' + u.ctx; } else g.set(u.ko, { ko: u.ko, ctx: u.ctx, code: !!u.code, html: !!u.html });
  };
  for (const f of CODE_FILES()) codeUnits(f).forEach(u => add(codeGroup(f), u));
  buildStrings().forEach(u => add('site', u));
  dataUnits().forEach(u => add(u.group, u));
  htmlUnits().forEach(u => add(u.group, Object.assign(u, { html: true })));
  return groups;
}

// ---------------------------------------------------------------- 번역 파일
const langOf = code => { const l = LANGS.find(x => x.code === code || x.dir === code); if (!l) throw new Error('모르는 언어: ' + code); return l; };
// 언어를 적지 않으면: sync는 모든 번역 언어, 나머지는 번역 파일이 있는 언어만
const targets = (args, all) => (args.length ? args.map(langOf) : LANGS.filter(l => l.code !== 'ko' && (all || fs.existsSync(path.join(DIR, l.code)))));
const fileOf = (lang, group) => path.join(DIR, lang.code, group + '.json');
function readGroup(lang, group) {
  const f = fileOf(lang, group);
  if (!fs.existsSync(f)) return { lang: lang.code, group, entries: [], stale: [] };
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  j.entries = j.entries || []; j.stale = j.stale || [];
  return j;
}
function groupsOf(lang) {
  const d = path.join(DIR, lang.code);
  return fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort() : [];
}
// 한 항목을 한 줄에: 사람이 읽기 쉽고 git diff가 작다
function writeGroup(lang, j) {
  const f = fileOf(lang, j.group);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const line = e => '    ' + JSON.stringify(e);
  const body = `{\n  "lang": ${JSON.stringify(j.lang)},\n  "group": ${JSON.stringify(j.group)},\n  "entries": [\n${j.entries.map(line).join(',\n')}\n  ]${j.stale.length ? `,\n  "stale": [\n${j.stale.map(line).join(',\n')}\n  ]` : ''}\n}\n`;
  const old = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  if (old !== body) fs.writeFileSync(f, body);
  return old !== body;
}
// 그 언어의 번역 전부: 원문 → 번역(빈 칸 제외)
function dictOf(lang) {
  const dict = {};
  for (const g of groupsOf(lang)) for (const e of readGroup(lang, g).entries) if (e.t && dict[e.ko] === undefined) dict[e.ko] = e.t;
  return dict;
}

// 코드(TR)용 사전. 한 묶음의 번역을 먼저 쓰고, 없는 열쇠는 다른 묶음에서 찾는다(Node 도구: site.cjs 등은 'site')
function codeDict(lang, group) {
  const d = dictOf(lang);
  for (const e of readGroup(lang, group).entries) if (e.t) d[e.ko] = e.t;
  return d;
}

function sync(lang, units = allUnits()) {
  const known = new Map();   // 원문 → 번역(다른 묶음·stale에 있던 것도)
  const old = {};
  for (const g of groupsOf(lang)) {
    old[g] = readGroup(lang, g);
    for (const e of [...old[g].stale, ...old[g].entries]) if (e.t) known.set(e.ko, e.t);
  }
  let changed = 0;
  for (const [group, map] of units) {
    const prev = old[group] || { lang: lang.code, group, entries: [], stale: [] };
    const same = new Map(prev.entries.map(e => [e.ko, e.t]));
    const entries = [...map.values()].map(u => ({ ctx: u.ctx, ko: u.ko, t: same.get(u.ko) || known.get(u.ko) || '' }));
    const now = new Set(entries.map(e => e.ko));
    // 원문이 바뀌거나 사라진 항목의 옛 번역은 stale에 남겨 고칠 때 참고한다
    const stale = [...prev.stale, ...prev.entries.filter(e => e.t && !now.has(e.ko))].filter((e, i, a) => !now.has(e.ko) && a.findIndex(x => x.ko === e.ko) === i);
    if (writeGroup(lang, { lang: lang.code, group, entries, stale })) changed++;
    delete old[group];
  }
  // 없어진 묶음: 번역은 다른 묶음으로 옮겨졌으므로 파일을 지운다
  for (const g of Object.keys(old)) { fs.rmSync(fileOf(lang, g)); changed++; }
  return changed;
}

function status(lang, units = allUnits()) {
  const rows = [];
  let all = 0, done = 0, stale = 0;
  for (const [group, map] of units) {
    const j = readGroup(lang, group);
    const t = new Map(j.entries.map(e => [e.ko, e.t]));
    const n = map.size, d = [...map.keys()].filter(k => t.get(k)).length;
    all += n; done += d; stale += j.stale.length;
    rows.push({ group, n, d, stale: j.stale.length });
  }
  return { lang: lang.code, all, done, stale, rows };
}

// ---------------------------------------------------------------- 검사
const tagsOf = s => (s.match(/<\/?[a-zA-Z][^>]*>/g) || []).map(t => {
  const name = (t.match(/^<\/?([a-zA-Z][\w:-]*)/) || [])[1].toLowerCase();
  // 번역하는 속성 말고는(주소·id·class 등) 그대로여야 한다
  const keep = [];
  const re = /([^\s=/<>]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(t))) if (!TATTR.has(m[1].toLowerCase())) keep.push(m[1].toLowerCase() + '=' + (m[3] !== undefined ? m[3] : m[4]));
  return (t[1] === '/' ? '/' : '') + name + (keep.length ? ' ' + keep.sort().join(' ') : '');
}).sort();
const nums = s => (s.replace(/<[^>]*>/g, ' ').match(/\d[\d.,   ]*\d|\d/g) || []).map(x => x.replace(/[.,   ]/g, '')).sort();
const phs = s => (s.match(/\{\d+\}/g) || []).sort();
function checkEntry(e, isAttr) {
  const errs = [], warns = [];
  if (!e.t) return { errs, warns };
  if (phs(e.ko).join() !== phs(e.t).join()) errs.push(`자리표시 ${phs(e.ko).join(' ')} ≠ ${phs(e.t).join(' ')}`);
  const a = tagsOf(e.ko).join('|'), b = tagsOf(e.t).join('|');
  if (a !== b) errs.push(`태그가 다름: ${a.slice(0, 160)} ≠ ${b.slice(0, 160)}`);
  for (const tok of ['%SITE%']) if (e.ko.split(tok).length !== e.t.split(tok).length) errs.push(tok + ' 빠짐');
  if (isAttr && /["<>]/.test(e.t)) errs.push('속성 번역에 " < > 를 쓸 수 없음');
  if (HAN.test(e.t)) warns.push('번역에 한글이 남음');
  const na = nums(e.ko).join(','), nb = nums(e.t).join(',');
  if (na !== nb) warns.push(`숫자가 다름: [${na}] ≠ [${nb}]`);
  if (e.ko.length > 40 && e.t.length < e.ko.length * 0.3) warns.push('번역이 원문보다 지나치게 짧음');
  return { errs, warns };
}
function check(lang, units, strict) {
  const attrKo = new Set(htmlUnits().filter(u => u.kind === 'attr').map(u => u.ko));
  const out = { lang: lang.code, errors: [], warnings: [], empty: 0, conflicts: [] };
  const seen = new Map();
  for (const [group, map] of units) {
    const j = readGroup(lang, group);
    const byKo = new Map(j.entries.map(e => [e.ko, e]));
    for (const ko of map.keys()) {
      const e = byKo.get(ko);
      if (!e || !e.t) { out.empty++; if (strict) out.errors.push(`${group}: 빈 항목: ${ko.slice(0, 60)}`); continue; }
      const r = checkEntry(e, attrKo.has(ko));
      r.errs.forEach(x => out.errors.push(`${group}: ${x} | ${ko.slice(0, 70)}`));
      r.warns.forEach(x => out.warnings.push(`${group}: ${x} | ${ko.slice(0, 70)}`));
      if (seen.has(ko) && seen.get(ko).t !== e.t) out.conflicts.push(`${group}·${seen.get(ko).group}: 같은 원문을 다르게 번역 | ${ko.slice(0, 60)}`);
      else seen.set(ko, { t: e.t, group });
    }
  }
  return out;
}

// ---------------------------------------------------------------- 빌드용 묶음
// byGroup(있으면): 묶음별 사전. 같은 글자라도 그 장(body-<장>)의 번역을 먼저 쓴다
function translateHTML(src, dict, byGroup = {}) {
  const units = segment(src).sort((a, b) => b.start - a.start);
  let out = src, miss = 0;
  for (const u of units) {
    const own = byGroup[u.group];
    const t = (own && own[u.ko]) || dict[u.ko];
    if (!t) { miss++; continue; }
    out = out.slice(0, u.start) + (u.kind === 'attr' ? t.replace(/"/g, '&quot;') : t) + out.slice(u.end);
  }
  return { html: out, miss };
}
// 번역한 DATA(출처의 제목·발행처는 원문 그대로)
function translatedData(lang, dict = dictOf(lang)) {
  const D = loadData();
  const g = { I18N: { lang: lang.code, dict } };
  vm.createContext(g);
  vm.runInContext(fs.readFileSync(path.join(SRC, 'js/i18n.js'), 'utf8'), g);
  const keep = [];
  const hold = list => (list || []).forEach(r => keep.push([r, r.t, r.p]));
  D.causes.forEach(c => hold(c.ref));
  Object.values(D.secRefs || {}).forEach(hold);
  (D.cases || []).forEach(c => hold(c.ref));
  (D.playbooks || []).forEach(c => hold(c.ref));
  g.I18N.applyData(D);
  keep.forEach(([r, t, p]) => { r.t = t; r.p = p; });
  return D;
}
function pack(lang, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const dict = dictOf(lang);
  // 화면 글자 사전: 코드 묶음(ui-*, sim-*, site)의 TR 열쇠만(데이터는 아래에서 미리 번역한다)
  // 실험(sim-*)과 app.js(ui-app)는 묶음마다 따로 둔다: 같은 한국어 낱말이 실험마다 다른 뜻일 수 있다(I18N.tr)
  const ui = {}, scopes = {};
  let uiMiss = 0;
  for (const g of groupsOf(lang)) if (/^(ui-|sim-|site$)/.test(g)) {
    const into = /^(sim-|ui-app$)/.test(g) ? (scopes[g] = {}) : ui;
    for (const e of readGroup(lang, g).entries) { if (e.t) into[e.ko] = e.t; else uiMiss++; }
  }
  // ui-kit(kit.js 등)이 전체 사전에서 이긴다
  for (const e of readGroup(lang, 'ui-kit').entries) if (e.t) ui[e.ko] = e.t;
  fs.writeFileSync(path.join(outDir, 'ui.json'), JSON.stringify({ dict: ui, scopes }));
  const strings = {};
  for (const u of buildStrings()) if (dict[u.ko]) strings[u.ko] = dict[u.ko];
  fs.writeFileSync(path.join(outDir, 'strings.json'), JSON.stringify(strings));
  // 데이터: 한국어 DATA를 불러와 번역을 덮어쓴 뒤 그대로 내보낸다
  const dataMiss = dataUnits().filter(u => !dict[u.ko]).length;
  const D = translatedData(lang, dict);
  fs.writeFileSync(path.join(outDir, 'data.js'), '/* 번역한 데이터: tools/i18n.cjs pack 이 만든다 */\nwindow.DATA = ' + JSON.stringify(D) + ';\n');
  let bodyMiss = 0;
  const byGroup = {};
  for (const g of groupsOf(lang)) if (g.startsWith('body-')) { byGroup[g] = {}; for (const e of readGroup(lang, g).entries) if (e.t) byGroup[g][e.ko] = e.t; }
  for (const f of ['body.html', 'head.html']) {
    const r = translateHTML(fs.readFileSync(path.join(SRC, f), 'utf8'), dict, byGroup);
    fs.writeFileSync(path.join(outDir, f), r.html);
    bodyMiss += r.miss;
  }
  return { ui: Object.keys(ui).length + Object.values(scopes).reduce((n, o) => n + Object.keys(o).length, 0), uiMiss, dataMiss, bodyMiss };
}

// ---------------------------------------------------------------- 명령
if (require.main === module) {
  const [cmd, ...args] = process.argv.slice(2);
  const flags = new Set(args.filter(a => a.startsWith('--')));
  const pos = args.filter(a => !a.startsWith('--'));
  const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  if (cmd === 'units') {
    let n = 0, c = 0;
    for (const [g, m] of allUnits()) { const chars = [...m.keys()].reduce((a, k) => a + k.length, 0); n += m.size; c += chars; console.log(`${g.padEnd(24)} ${String(m.size).padStart(5)}개 ${String(chars).padStart(7)}자`); }
    console.log(`합계 ${n}개 ${c}자`);
  } else if (cmd === 'sync') {
    const units = allUnits();
    for (const l of targets(pos, true)) console.log(`${l.code}: 파일 ${sync(l, units)}개 바뀜`);
  } else if (cmd === 'status') {
    const units = allUnits();
    for (const l of targets(pos)) {
      const s = status(l, units);
      console.log(`${s.lang}: ${s.done}/${s.all} (${(s.done / s.all * 100).toFixed(1)}%)${s.stale ? `, stale ${s.stale}` : ''}`);
      if (flags.has('--groups')) s.rows.filter(r => r.d < r.n || r.stale).forEach(r => console.log(`  ${r.group.padEnd(24)} ${r.d}/${r.n}${r.stale ? ` stale ${r.stale}` : ''}`));
    }
  } else if (cmd === 'check') {
    const units = allUnits();
    let bad = 0;
    for (const l of targets(pos)) {
      const r = check(l, units, flags.has('--strict'));
      console.log(`${r.lang}: 오류 ${r.errors.length}, 경고 ${r.warnings.length}, 빈 항목 ${r.empty}, 서로 다른 번역 ${r.conflicts.length}`);
      r.errors.slice(0, flags.has('--all') ? 1e9 : 20).forEach(x => console.log('  오류 ' + x));
      if (flags.has('--warn')) r.warnings.forEach(x => console.log('  경고 ' + x));
      if (flags.has('--conflicts')) r.conflicts.forEach(x => console.log('  ' + x));
      bad += r.errors.length;
    }
    process.exitCode = bad ? 1 : 0;
  } else if (cmd === 'show') {
    const [code, group] = pos;
    const j = readGroup(langOf(code), group);
    const from = +(opt('--from') || 0), count = +(opt('--count') || 1e9);
    j.entries.forEach((e, i) => { if (i < from || i >= from + count) return; if (flags.has('--empty') && e.t) return; console.log(JSON.stringify({ i, ctx: e.ctx, ko: e.ko, t: e.t })); });
  } else if (cmd === 'fill') {
    const [code, group, file] = pos;
    const lang = langOf(code);
    const j = readGroup(lang, group);
    const src = JSON.parse(fs.readFileSync(file, 'utf8'));
    let n = 0;
    for (const [k, v] of Object.entries(src)) {
      const e = /^\d+$/.test(k) ? j.entries[+k] : j.entries.find(x => x.ko === k);
      if (!e) { console.log('없는 항목: ' + k.slice(0, 60)); continue; }
      e.t = v; n++;
    }
    writeGroup(lang, j);
    const r = { errs: 0 };
    j.entries.forEach(e => { const c = checkEntry(e, false); if (c.errs.length) { r.errs++; console.log(`  확인 필요 [${j.entries.indexOf(e)}] ${c.errs.join('; ')}`); } });
    console.log(`${code}/${group}: ${n}개 채움, 빈 항목 ${j.entries.filter(e => !e.t).length}개 남음${r.errs ? `, 형식 오류 ${r.errs}개` : ''}`);
  } else if (cmd === 'pack') {
    const [code, outDir] = pos;
    const r = pack(langOf(code), path.resolve(outDir));
    console.log(`${code}: 화면 글자 ${r.ui}개, 빠진 번역 화면 ${r.uiMiss}·데이터 ${r.dataMiss}·본문 ${r.bodyMiss}`);
  } else {
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').filter(l => l.startsWith('//')).slice(0, 12).join('\n'));
  }
}

module.exports = { LANGS, langOf, allUnits, dictOf, codeDict, translatedData, segment, translateHTML, loadData, dataUnits, codeUnits, CODE_FILES, glossId, pack, status, check };
