// 마크업이 대부분인 큰 TR`…` 템플릿을 글 덩어리 단위로 나눈다(번역 단위가 HTML 뼈대째 커지지 않게).
//   node tools/i18n-split.cjs [--min 3] 파일…
// 구조 태그(div, p, li, span 등) 사이의 글 덩어리와 따옴표 속성값 가운데 한글이 있는 것만 ${TR`…`}로 감싸고,
// 바깥 템플릿의 TR은 뗀다. 굵게·링크·코드 같은 인라인 태그(b, i, em, strong, a, code …)는 문장 안에 남긴다.
// 구조 태그가 --min 개(기본 3) 이상인 템플릿만 나눈다.
const fs = require('fs'), path = require('path');
const ts = (() => {
  for (const p of ['typescript', '/opt/node22/lib/node_modules/typescript', '/usr/local/lib/node_modules/typescript']) { try { return require(p); } catch (e) { /* 다음 */ } }
  throw new Error('typescript 패키지가 필요합니다: npm install');
})();
const HAN = /[가-힣]/;
const INLINE = new Set('a abbr b br cite code em i kbd mark q s sub sup u var wbr strong'.split(' '));
const escTpl = s => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const args = process.argv.slice(2);
const mi = args.indexOf('--min');
const MIN = mi >= 0 ? +args[mi + 1] : 3;
const files = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--min');

function split(tpl, sf) {
  // 템플릿을 [글자 조각 | 식] 순서로
  const items = ts.isNoSubstitutionTemplateLiteral(tpl) ? [{ lit: tpl.rawText !== undefined ? tpl.rawText : tpl.getText(sf).slice(1, -1) }]
    : [{ lit: tpl.head.rawText }, ...tpl.templateSpans.flatMap(s => [{ expr: s.expression.getText(sf) }, { lit: s.literal.rawText }])];
  const out = [];
  let phrase = [];   // 지금 모으는 글 덩어리 [{lit}|{expr}]
  let structural = 0;
  const flush = () => {
    if (!phrase.length) return;
    const text = phrase.map(p => p.lit || '').join('');
    const src = phrase.map(p => (p.lit !== undefined ? p.lit : '${' + p.expr + '}')).join('');
    if (HAN.test(text)) {
      const lead = src.match(/^\s*/)[0], trail = src.match(/\s*$/)[0];
      const core = src.slice(lead.length, src.length - trail.length);
      out.push(lead + '${TR`' + core + '`}' + trail);
    } else out.push(src);
    phrase = [];
  };
  let state = 'text', quote = '', tagBuf = '', tagName = '';
  for (const it of items) {
    if (it.expr !== undefined) {
      if (state === 'text' || state === 'val' || state === 'itag') phrase.push(it);
      else tagBuf += '${' + it.expr + '}';
      continue;
    }
    const s = it.lit;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (state === 'text') {
        if (ch === '<' && /[a-zA-Z/!]/.test(s[i + 1] || '')) {
          const m = s.slice(i).match(/^<\/?([a-zA-Z][\w-]*)/);
          tagName = m ? m[1].toLowerCase() : '';
          if (INLINE.has(tagName)) { phrase.push({ lit: ch }); state = 'itag'; continue; }
          flush(); structural++; state = 'tag'; tagBuf = ch; continue;
        }
        phrase.push({ lit: ch });
      } else if (state === 'itag') {   // 인라인 태그: 문장의 일부로 그대로
        phrase.push({ lit: ch });
        if (ch === '>') state = 'text';
      } else if (state === 'tag') {
        tagBuf += ch;
        if (ch === '"' || ch === "'") { quote = ch; out.push(tagBuf); tagBuf = ''; state = 'val'; }
        else if (ch === '>') { out.push(tagBuf); tagBuf = ''; state = 'text'; }
      } else if (state === 'val') {
        if (ch === quote) { flush(); state = 'tag'; tagBuf = ch; }
        else phrase.push({ lit: ch });
      }
    }
  }
  flush();
  if (tagBuf) out.push(tagBuf);
  // 인접한 글자 조각을 합친다(phrase 안의 글자 하나하나를 모았으므로)
  return { src: '`' + out.join('') + '`', structural };
}

for (const f of files) {
  const file = path.resolve(f);
  let src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const edits = [];
  const visit = n => {
    if (ts.isTaggedTemplateExpression(n) && n.tag.getText(sf) === 'TR') {
      const r = split(n.template, sf);
      if (r.structural >= MIN) edits.push({ start: n.getStart(sf), end: n.getEnd(), text: r.src, line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1 });
      else ts.forEachChild(n, visit);
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  // 바깥 템플릿을 바꾸면 그 안의 템플릿도 새 글자에 들어 있으므로 겹치는 편집은 바깥 것만 쓴다
  const top = edits.filter(e => !edits.some(o => o !== e && o.start <= e.start && o.end >= e.end));
  for (const e of top.sort((a, b) => b.start - a.start)) src = src.slice(0, e.start) + e.text + src.slice(e.end);
  fs.writeFileSync(file, src);
  console.log(`${f}: ${top.length}개 나눔 (줄 ${top.map(e => e.line).join(', ')})`);
}
