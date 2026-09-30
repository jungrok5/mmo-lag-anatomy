const fs = require('fs'), vm = require('vm');
process.chdir(require('path').join(__dirname, '..'));   // 어느 폴더에서 실행해도 저장소 기준 경로로 읽는다
const ctx = { window: {} }; ctx.window = ctx; vm.createContext(ctx);
const files = ['src/js/data.js', ...fs.readdirSync('src/js').filter(f => /^causes-\d+\.js$/.test(f)).sort().map(f => 'src/js/' + f), ...fs.readdirSync('src/js').filter(f => /^refs-.+\.js$/.test(f)).sort().map(f => 'src/js/' + f), ...(fs.existsSync('src/js/cases.js') ? ['src/js/cases.js'] : []), 'src/js/glossary.js'];
for (const f of files) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
const D = ctx.DATA, body = fs.readFileSync('src/body.html', 'utf8');
const layers = new Set([...D.layers, ...(D.extraLayers || [])].map(l => l.id));
const syms = new Set(D.symptoms.map(s => s.id)), fx = new Set(D.fx.map(f => f.id));
const WHO = new Set(Object.keys(D.who));
const WHEN = new Set(Object.keys(D.when));
const sims = new Set(fs.readdirSync('src/sims').filter(f => f.endsWith('.js')).map(f => f.slice(0, -3)));
const probs = [], ids = new Set(), per = {}; let pending = 0, refMissing = 0, sigMissing = 0, chkMissing = 0;
const SIGS = new Set((D.sigs || []).map(s => s.id)), BY = new Set(Object.keys(D.chkBy || {}));
const checkRefs = (list, where) => {
  if (!Array.isArray(list)) { probs.push(where + ': ref must be an array'); return; }
  const seen = new Set();
  list.forEach((r, i) => {
    if (!r || typeof r !== 'object') { probs.push(where + ': ref[' + i + '] not an object'); return; }
    if (!r.t) probs.push(where + ': ref[' + i + '] missing t');
    if (!r.p) probs.push(where + ': ref[' + i + '] missing p');
    if (!/^https:\/\//.test(r.u || '')) probs.push(where + ': ref[' + i + '] url must start with https://');
    if (seen.has(r.u)) probs.push(where + ': duplicate ref ' + r.u); seen.add(r.u);
  });
};
for (const c of D.causes) {
  const p = m => probs.push(c.id + ': ' + m);
  if (ids.has(c.id)) p('duplicate id'); ids.add(c.id);
  per[c.layer] = (per[c.layer] || 0) + 1;
  if (!layers.has(c.layer)) p('layer ' + c.layer);
  for (const k of ['t', 'en', 's']) if (!c[k]) p('missing ' + k);
  const OWN = Object.fromEntries((D.owners || []).map(o => [o.id, o.team]));
  if (c.own) {
    if (!c.own.length) p('own empty');
    c.own.forEach(o => OWN[o] || p('own ' + o));
    if (new Set(c.own).size !== c.own.length) p('own dup');
    if (!c.act) p('act missing'); else {
      Object.keys(c.act).forEach(k => ['game', 'infra', 'ext'].includes(k) || p('act key ' + k));
      const teams = new Set(c.own.map(o => OWN[o]));
      teams.forEach(t => c.act[t] || p('act.' + t + ' missing for own'));
      Object.keys(c.act).forEach(k => teams.has(k) || p('act.' + k + ' without own'));
    }
    if (c.fix) p('fix left with own');
  } else { pending++; p('own missing'); }
  if (!Array.isArray(c.c) || c.c.length !== 3) p('c must have 3');
  (c.sym || []).forEach(s => syms.has(s) || p('sym ' + s)); if (!(c.sym || []).length) p('no sym');
  (c.fx || []).forEach(s => fx.has(s) || p('fx ' + s)); if (!(c.fx || []).length) p('no fx');
  (c.who || []).forEach(s => WHO.has(s) || p('who ' + s)); if (!(c.who || []).length) p('no who');
  (c.when || []).forEach(s => WHEN.has(s) || p('when ' + s)); if (!(c.when || []).length) p('no when');
  if (c.sim && !sims.has(c.sim)) p('sim ' + c.sim);
  if (c.ref) checkRefs(c.ref, c.id); else refMissing++;
  // 그래프 모양(sig)과 확인 방법(chk): docs/CHECKS_GUIDE.md
  if (c.sig) {
    if (!SIGS.has(c.sig.k)) p('sig.k ' + c.sig.k);
    if (!c.sig.g) p('sig.g missing');
  } else { sigMissing++; p('sig missing'); }
  if (c.chk) {
    for (const k of ['look', 'yes']) if (!c.chk[k]) p('chk.' + k + ' missing');
    if (!BY.has(c.chk.by)) p('chk.by ' + c.chk.by);
    // 화면에 HTML로 그대로 들어가므로 <b> 말고는 꺾쇠 열기를 쓰지 않는다
    for (const k of ['look', 'yes', 'no']) if (/<(?!\/?b>)/.test(c.chk[k] || '')) p('chk.' + k + ' has <');
  } else { chkMissing++; p('chk missing'); }
}
// 실제 장애 사례와 상황별 절차(src/js/cases.js)
(D.cases || []).forEach(x => {
  const p = m => probs.push('case ' + x.id + ': ' + m);
  for (const k of ['id', 't', 'org', 'year', 'what', 'why', 'lesson']) if (!x[k]) p('missing ' + k);
  if (!/^https:\/\//.test(x.u || '')) p('u must start with https://');
  (x.causes || []).forEach(id => ids.has(id) || p('unknown cause ' + id)); if (!(x.causes || []).length) p('no causes');
  if (x.ref) checkRefs(x.ref, 'case ' + x.id);
});
(D.playbooks || []).forEach(x => {
  const p = m => probs.push('playbook ' + x.id + ': ' + m);
  for (const k of ['id', 't', 'when']) if (!x[k]) p('missing ' + k);
  (x.steps || []).forEach((st, i) => { if (!st.t || !st.d) p('step ' + i + ' needs t, d'); (st.causes || []).forEach(id => ids.has(id) || p('step ' + i + ' unknown cause ' + id)); });
  if (!(x.steps || []).length) p('no steps');
  if (x.ref) checkRefs(x.ref, 'playbook ' + x.id);
});
const gl = new Set(); for (const g of D.glossary) { if (gl.has(g[0])) probs.push('glossary dup ' + g[0]); gl.add(g[0]); if (g[3] && !body.includes('id="' + g[3] + '"')) probs.push('glossary section ' + g[3]); }
Object.entries(D.secRefs || {}).forEach(([id, list]) => {
  if (!body.includes('id="' + id + '"')) probs.push('secRefs: no section ' + id);
  checkRefs(list, 'secRefs.' + id);
});
const urls = new Set(); D.causes.forEach(c => (c.ref || []).forEach(r => urls.add(r.u))); Object.values(D.secRefs || {}).forEach(l => l.forEach(r => urls.add(r.u)));
(D.cases || []).forEach(x => { urls.add(x.u); (x.ref || []).forEach(r => urls.add(r.u)); }); (D.playbooks || []).forEach(x => (x.ref || []).forEach(r => urls.add(r.u)));
console.log(JSON.stringify({ causes: D.causes.length, per, glossary: D.glossary.length, ownPending: pending, refMissing, sigMissing, chkMissing, cases: (D.cases || []).length, playbooks: (D.playbooks || []).length, refSections: Object.keys(D.secRefs || {}).length, refUrls: urls.size, probs }, null, 1));
process.exitCode = probs.length ? 1 : 0;
