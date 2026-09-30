// 지식 데이터 내보내기: 원인·증상·담당·용어·출처를 마크다운과 JSON 파일 하나씩으로 뽑는다.
// Claude 프로젝트에 올리거나 다른 도구(장애 기록 대조 스크립트 등)에서 읽을 때 쓴다.
//   node tools/export.cjs [출력 폴더]   → <폴더>/lag-anatomy.md, <폴더>/lag-anatomy.json (기본 폴더 build/)
//   node tools/export.cjs [출력 폴더] --lang en   번역판(src/i18n/<언어>/, docs/I18N_GUIDE.md)
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const li = args.indexOf('--lang');
const I = require('./i18n.cjs');
const LANG = I.langOf(li >= 0 ? args[li + 1] : 'ko');
// 번역: TR 태그와 사전(src/js/i18n.js)
globalThis.I18N = { lang: LANG.code, dict: LANG.code === 'ko' ? {} : I.dictOf(LANG) };
require('../src/js/i18n.js');
const D = LANG.code === 'ko' ? I.loadData() : I.translatedData(LANG, globalThis.I18N.dict);

const plain = s => String(s == null ? '' : s).replace(/<b>(.*?)<\/b>/g, '**$1**').replace(/<[^>]+>/g, '');
const LAYERS = [...D.layers.map((l, i) => Object.assign({ n: i + 1, anchor: 'l-' + l.id }, l)), ...D.extraLayers];
const LAYER = Object.fromEntries(LAYERS.map(l => [l.id, l]));
const SYM = Object.fromEntries(D.symptoms.map(s => [s.id, s.name]));
const FX = Object.fromEntries(D.fx.map(f => [f.id, f.name]));
const OWN = Object.fromEntries(D.owners.map(o => [o.id, o]));
const ownName = id => `${D.teams[OWN[id].team].name}·${OWN[id].name}`;
const SIGN = Object.fromEntries((D.sigs || []).map(g => [g.id, g]));
const CASES_OF = {};
(D.cases || []).forEach(x => (x.causes || []).forEach(id => (CASES_OF[id] = CASES_OF[id] || []).push(x.id)));

// JSON: 코드값 옆에 화면 이름을 함께 넣어 사람이 읽어도, 스크립트로 대조해도 되게 한다
const causes = D.causes.map(c => ({
  id: c.id, link: '#c-' + c.id, layer: c.layer, layerName: LAYER[c.layer].name,
  name: c.t, en: c.en, summary: plain(c.s), why: plain(c.c[0]), then: plain(c.c[1]), onScreen: plain(c.c[2]),
  symptoms: c.sym.map(s => ({ id: s, name: SYM[s] })), factors: c.fx.map(f => ({ id: f, name: FX[f] })),
  who: c.who.map(w => ({ id: w, name: D.who[w] })), when: c.when.map(w => ({ id: w, name: D.when[w] })),
  owner: c.own[0], ownerName: ownName(c.own[0]), alsoOwners: c.own.slice(1).map(o => ({ id: o, name: ownName(o) })),
  actions: Object.fromEntries(Object.entries(c.act || {}).map(([t, v]) => [t, plain(v)])),
  numbers: plain(c.num), more: plain(c.more),
  graph: c.sig ? { shape: c.sig.k, shapeName: SIGN[c.sig.k] ? SIGN[c.sig.k].name : c.sig.k, where: plain(c.sig.g) } : null,
  check: c.chk ? { look: plain(c.chk.look), yes: plain(c.chk.yes), no: plain(c.chk.no), by: c.chk.by, byName: (D.chkBy || {})[c.chk.by] || '' } : null,
  cases: CASES_OF[c.id] || [], sources: c.ref || [],
}));
const json = {
  title: TR`게임 렉 백서`, lang: LANG.code, generated: new Date().toISOString().slice(0, 10),
  note: TR`원인 ID(id)로 가리킨다. 사이트 주소 뒤에 link(#c-ID)를 붙이면 그 원인 카드로 간다.`,
  teams: D.teams, owners: D.owners, symptoms: D.symptoms.map(s => ({ id: s.id, name: s.name, alias: s.alias, what: plain(s.what), looks: plain(s.looks), tell: plain(s.tell) })),
  factors: D.fx.map(f => ({ id: f.id, name: f.name, en: f.en, desc: plain(f.desc), cope: plain(f.cope) })),
  who: D.who, when: D.when, layers: LAYERS.map(l => ({ id: l.id, name: l.name, anchor: l.anchor })),
  graphShapes: (D.sigs || []).map(g => ({ id: g.id, name: g.name, desc: g.desc })), checkBy: D.chkBy || {},
  causes, chapterSources: D.secRefs,
  playbooks: (D.playbooks || []).map(pb => ({ id: pb.id, title: pb.t, when: plain(pb.when), steps: (pb.steps || []).map(st => ({ title: plain(st.t), detail: plain(st.d), causes: st.causes || [] })), sources: pb.ref || [] })),
  cases: (D.cases || []).map(x => ({ id: x.id, title: x.t, org: x.org, year: x.year, url: x.u, publisher: x.p, what: plain(x.what), why: plain(x.why), lesson: plain(x.lesson), causes: x.causes || [], sources: x.ref || [] })),
  glossary: D.glossary.map(([term, en, def, sec]) => ({ term, en, def: plain(def), section: sec })),
};

// 마크다운: 층 순서대로, 원인마다 카드의 모든 내용을 한 덩어리로
const md = [];
md.push(TR`# 게임 렉 백서 지식 데이터`, '',
  TR`자동 생성(${json.generated}, \`node tools/export.cjs\`). 손으로 고치지 말고 src/js/ 를 고친 뒤 다시 뽑는다.`, '',
  TR`원인 ${causes.length}개, 용어 ${json.glossary.length}개. 원인은 **ID**로 가리킨다. 사이트 주소 뒤에 \`#c-ID\`를 붙이면 그 원인 카드로 간다.`, '');
md.push(TR`## 담당 코드`, '', TR`| 코드 | 팀 | 담당 | 범위 |`, '|---|---|---|---|',
  ...D.owners.map(o => `| ${o.id} | ${D.teams[o.team].name} | ${o.name} | ${plain(o.desc)} |`), '',
  TR`각 원인의 “주 담당”은 근본 원인을 없애는 곳, “함께”는 실제로 할 일이 있는 곳이다.`, '');
md.push(TR`## 증상`, '', ...D.symptoms.map(s => TR`- **${s.name}** (\`${s.id}\`, 다른 말: ${s.alias}): ${plain(s.what)} ${plain(s.tell)}`), '');
md.push(TR`## 네 가지 요인`, '', ...D.fx.map(f => TR`- **${f.name}** (\`${f.id}\`, ${f.en}): ${plain(f.desc)} 게임의 대처: ${plain(f.cope)}`), '');
md.push(TR`## 원인`, '');
const refLine = r => `[${r.t}](${r.u}) · ${r.p}${r.n ? ` · ${r.n}` : ''}`;
for (const l of LAYERS) {
  const list = causes.filter(c => c.layer === l.id);
  if (!list.length) continue;
  md.push(TR`### ${l.n ? `L${l.n} ` : ''}${l.name} (원인 ${list.length}개)`, '');
  for (const c of list) {
    md.push(`#### ${c.id} · ${c.name} · ${c.en}`, '', c.summary, '',
      TR`- 왜 → 그러면 → 화면에서는: ${c.why} → ${c.then} → ${c.onScreen}`,
      TR`- 증상: ${c.symptoms.map(s => s.name).join(', ')} / 요인: ${c.factors.map(f => f.name).join(', ')}`,
      TR`- 누가: ${c.who.map(w => w.name).join(', ')} / 언제: ${c.when.map(w => w.name).join(', ')}`,
      TR`- 주 담당: ${c.ownerName}${c.alsoOwners.length ? TR` / 함께: ${c.alsoOwners.map(o => o.name).join(', ')}` : ''}`,
      ...Object.entries(c.actions).map(([t, v]) => TR`- ${D.teams[t].name} 할 일: ${v}`),
      c.numbers ? TR`- 수치 감각: ${c.numbers}` : null,
      c.graph ? TR`- 그래프에서는: ${c.graph.shapeName} (${c.graph.where})` : null,
      c.check ? TR`- 확인할 곳: ${c.check.look}` : null, c.check ? TR`- 이러면 맞음: ${c.check.yes}` : null,
      c.check && c.check.no ? TR`- 이러면 아님: ${c.check.no}` : null, c.check ? TR`- 확인 수단: ${c.check.byName}` : null,
      c.more ? TR`- 더 알아보기: ${c.more}` : null,
      c.cases.length ? TR`- 실제 사례: ${c.cases.join(', ')}` : null,
      ...(c.sources.length ? [TR`- 출처:`, ...c.sources.map(r => `  - ${refLine(r)}`)] : []), '');
  }
}
const chapterRefs = Object.entries(D.secRefs || {});
if (chapterRefs.length) {
  md.push(TR`## 장별 출처`, '');
  for (const [sec, list] of chapterRefs) md.push(`### #${sec}`, '', ...list.map(r => `- ${refLine(r)}`), '');
}
if (json.graphShapes.length) md.push(TR`## 그래프 모양`, '', ...json.graphShapes.map(g => `- **${g.name}** (\`${g.id}\`): ${g.desc}`), '');
if (json.playbooks.length) {
  md.push(TR`## 상황별 절차`, '');
  for (const pb of json.playbooks) md.push(`### ${pb.title}`, '', pb.when, '', ...pb.steps.map((st, i) => `${i + 1}. **${st.title}**: ${st.detail}${st.causes.length ? TR` (원인: ${st.causes.join(', ')})` : ''}`), '');
}
if (json.cases.length) {
  md.push(TR`## 실제 장애 사례`, '');
  for (const x of json.cases) md.push(`### ${x.id} · ${x.org} ${x.year}: ${x.title}`, '', TR`- 무슨 일: ${x.what}`, TR`- 원인: ${x.why}`, TR`- 배울 점: ${x.lesson}`, TR`- 관련 원인: ${x.causes.join(', ')}`, TR`- 원문: [${x.publisher || x.org}](${x.url})`, '');
}
md.push(TR`## 용어`, '', ...json.glossary.map(g => `- **${g.term}** (${g.en}): ${g.def}`), '');

const out = path.resolve(args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--lang')[0] || path.join(ROOT, 'build'));
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'lag-anatomy.md'), md.filter(x => x !== null).join('\n'));
fs.writeFileSync(path.join(out, 'lag-anatomy.json'), JSON.stringify(json, null, 1) + '\n');
for (const f of ['lag-anatomy.md', 'lag-anatomy.json']) console.log(path.join(out, f), Math.round(fs.statSync(path.join(out, f)).size / 1024) + ' KB');
