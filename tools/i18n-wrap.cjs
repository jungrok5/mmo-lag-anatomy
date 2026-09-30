// 화면에 나오는 한국어 문자열을 TR`…` 태그로 감싼다(번역 사전의 열쇠가 된다. src/js/i18n.js).
//   node tools/i18n-wrap.cjs --check          감싸지 않은 한국어 문자열이 있으면 목록을 출력하고 종료 코드 1
//   node tools/i18n-wrap.cjs --write [파일…]   자동으로 감싼다(기본: 아래 FILES)
// 자바스크립트 구문 분석은 TypeScript 컴파일러를 쓴다(npm install 로 설치되는 devDependency, 없으면 전역 설치본).
// 주석과 정규식 안의 한국어는 건드리지 않는다. 객체의 한국어 열쇠는 [TR`…`] 계산된 열쇠로 바꾼다.
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const ts = (() => {
  for (const p of ['typescript', '/opt/node22/lib/node_modules/typescript', '/usr/local/lib/node_modules/typescript', '/usr/lib/node_modules/typescript']) { try { return require(p); } catch (e) { /* 다음 후보 */ } }
  throw new Error('typescript 패키지가 필요합니다: npm install');
})();
const HAN = /[가-힣]/;
// 화면 글자가 들어 있는 코드. 데이터 파일(data.js, causes-*.js 등)은 문자열 그대로 번역하므로 감싸지 않는다
const FILES = ['src/js/kit.js', 'src/js/app.js', 'src/js/sigs.js', 'src/js/sandbox.js',
  ...fs.readdirSync(path.join(ROOT, 'src/sims')).filter(f => f.endsWith('.js')).sort().map(f => 'src/sims/' + f),
  'tools/site.cjs', 'tools/export.cjs'];

const escTpl = s => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
const isTagged = n => n.parent && ts.isTaggedTemplateExpression(n.parent) && n.parent.template === n;
// 개발자용 메시지(오류·콘솔 출력)는 번역하지 않는다
const isDevMsg = n => {
  for (let p = n.parent; p && !ts.isStatement(p); p = p.parent) {
    if ((ts.isNewExpression(p) || ts.isCallExpression(p)) && /^(Error|TypeError|console\.\w+)$/.test(p.expression.getText())) return true;
  }
  return false;
};
const tplHasHan = n => ts.isNoSubstitutionTemplateLiteral(n) ? HAN.test(n.text) : HAN.test([n.head.text, ...n.templateSpans.map(s => s.literal.text)].join(''));

function scan(file) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const edits = [], loose = [];
  const visit = n => {
    if (isDevMsg(n)) { ts.forEachChild(n, visit); return; }
    if (ts.isStringLiteral(n) && HAN.test(n.text)) {
      const p = n.parent;
      const start = n.getStart(sf), end = n.getEnd();
      const line = sf.getLineAndCharacterOfPosition(start).line + 1;
      if (ts.isPropertyAssignment(p) && p.name === n) edits.push({ start, end, text: '[TR`' + escTpl(n.text) + '`]', line });
      else if (ts.isExpressionStatement(p)) { /* 지시문 등 */ }
      else edits.push({ start, end, text: 'TR`' + escTpl(n.text) + '`', line });
      loose.push({ line, text: n.text });
    } else if ((ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n)) && tplHasHan(n) && !isTagged(n)) {
      const start = n.getStart(sf);
      const line = sf.getLineAndCharacterOfPosition(start).line + 1;
      edits.push({ start, end: start, text: 'TR', line });
      loose.push({ line, text: n.getText(sf).slice(0, 80) });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { src, edits, loose };
}

const args = process.argv.slice(2);
const write = args.includes('--write');
const files = args.filter(a => !a.startsWith('--'));
let total = 0;
for (const f of (files.length ? files : FILES)) {
  const { src, edits, loose } = scan(f);
  total += loose.length;
  if (write && edits.length) {
    let out = src;
    for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
    fs.writeFileSync(path.join(ROOT, f), out);
    console.log(`${f}: ${edits.length}곳 감쌈`);
  } else if (loose.length) {
    console.log(`${f}: 감싸지 않은 한국어 ${loose.length}곳`);
    loose.slice(0, 5).forEach(x => console.log(`  ${x.line}: ${x.text.slice(0, 70)}`));
  }
}
if (!write) { console.log(total ? `감싸지 않은 한국어 문자열 ${total}곳` : '모두 TR로 감쌈'); process.exitCode = total ? 1 : 0; }
