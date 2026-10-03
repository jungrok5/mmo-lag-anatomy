#!/usr/bin/env node
// 한국어 원문 문체 검사: 번역투와 기계가 쓴 글에서 자주 보이는 표현을 찾는다.
// 규칙은 아래 공개 자료에서 기술 문서에 맞는 것만 골랐다(각 규칙의 src).
//   toss   토스 테크니컬 라이팅 가이드 https://github.com/toss/technical-writing (docs/sentence)
//   hk     humanize-korean https://github.com/nathankim0/humanize-korean (references/ai-tell-rulebook.md, translationese-rules.md)
//   ina    im-not-ai https://github.com/epoko77-ai/im-not-ai (skills/humanize-korean/references/quick-rules.md, 규칙 ID 표기)
//   kas    korean-anti-slop https://github.com/Panxoat/korean-anti-slop (korean-writing.md)
//   kwqa   korean-writing-qa https://github.com/kkhfiles/korean-writing-qa (finalize-korean-document/references/core-rules.md)
//   ours   이 저장소의 문장 규칙(CLAUDE.md)
// 사용법:
//   node tools/ko-style.cjs                 규칙별 건수
//   node tools/ko-style.cjs --show <규칙>   그 규칙에 걸린 문장(묶음·자리 포함)
//   node tools/ko-style.cjs --json          전체 결과를 JSON으로
//   node tools/ko-style.cjs --strict        level 'err' 규칙이 하나라도 걸리면 종료 코드 1
//   node tools/ko-style.cjs README.md docs/*.md   사이트 대신 마크다운 파일을 줄 단위로 검사(코드 블록 제외)
// level: err = 0건이어야 함, warn = 문맥을 보고 판단(정상 용례가 섞여 있음)
const { allUnits } = require('./i18n.cjs');

const RULES = [
  // 이 저장소의 규칙
  { id: 'dash', level: 'err', src: 'ours, ina J-3', re: /\S\s*—\s*\S/g, why: '문장 가운데 대시(—) 설명 끼워 넣기' },
  { id: 'not-but', level: 'err', src: 'ours, ina C-8', re: /(?:[이가]|것이|게|만이?) 아니라\s/g, why: '“A가 아니라 B” 꼴' },
  // 번역투
  { id: 'double-passive', level: 'err', src: 'hk A, ina A-8, kas', re: /되어지|되어져|되어진|되어집|여지게|해지게 되/g, why: '이중 피동' },
  { id: 'have', level: 'err', src: 'hk A, ina A-7, kas', re: /(?:을|를) (?:가지고|갖고) 있/g, why: '“가지고 있다”(have 직역)' },
  { id: 'have-adn', level: 'warn', src: 'hk A, ina A-7', re: /(?:을|를) 가진 /g, why: '“~을 가진 N”(소유가 아니면 “~이 있는·~이 설정된”)' },
  { id: 'eitseo', level: 'err', src: 'hk A, ina A-3, kas', re: /에 있어(?:서)?[ ,]/g, why: '“~에 있어(서)”' },
  { id: 'by-agent', level: 'err', src: 'hk A, ina A-9, kas', re: /에 의해(?:서)?\s|에 의한\s/g, why: '“~에 의해” 피동' },
  { id: 'related', level: 'err', src: 'hk A, ina A-5', re: /(?:와|과) 관련(?:하여|해|된|한|해서)\s/g, why: '“~와 관련하여/관련된”' },
  { id: 'based', level: 'err', src: 'hk A, ina A-6', re: /에 기반(?:하여|해|한|해서)\s|(?:을|를) 기반으로\s/g, why: '“~에 기반하여/기반으로”' },
  { id: 'double-josa', level: 'warn', src: 'hk A, ina A-19', re: /(?:에서의|으로의|[^으]로의|로부터의|에로의|에의)\s/g, why: '겹조사 “~에서의/~으로의”' },
  { id: 'through', level: 'warn', src: 'toss, hk A, kas', re: /(?:을|를) 통(?:해|한|하여|해서)\s/g, why: '“~을 통해”(실제 경로·매개가 아니면 “~로”)' },
  { id: 'about', level: 'warn', src: 'hk A, ina A-1, kwqa', re: /에 대(?:해|한|하여|해서)\s/g, why: '“~에 대해/대한”(목적격 조사로 줄일 수 있는지)' },
  { id: 'become', level: 'warn', src: 'hk A, kas', re: /게 됩니다|게 된다|게 되어|게 되고|게 되면|게 되는/g, why: '“~하게 된다”(become 직역)' },
  { id: 'lead-to', level: 'warn', src: 'hk 보강, ina D-9', re: /(?:으로|로) 이어(?:집니다|진다|지고|져)|에 직결/g, why: '“~로 이어진다” 결과 동사' },
  { id: 'generic-verb', level: 'warn', src: 'hk A, ina A-15', re: /(?:을|를) (?:제공(?:합니다|한다)|가져옵니다|가져온다|야기(?:합니다|한다|하는|해))|가능하게 (?:합니다|한다)/g, why: '추상 주어 + 만능 동사(제공한다·야기한다)' },
  { id: 'light-verb', level: 'err', src: 'toss, hk A, kwqa', re: /(?:을|를) (?:수행|실시)(?:합니다|한다|하고|하면|해|하는)|작업을 진행/g, why: '경동사 “~을 수행·실시한다”' },
  { id: 'for-purpose', level: 'warn', src: 'ina A-11', re: /하기 위해(?:서)?\s|(?:을|를) 위해(?:서)?\s/g, why: '“~을 위해” 목적절(“~하려고”, “~하도록”)' },
  { id: 'progressive', level: 'warn', src: 'ina A-20, E-2', re: /되고 있(?:습니다|다)|하고 있(?:습니다|다)/g, why: '“~하고 있다” 진행형 직역' },
  { id: 'pronoun', level: 'err', src: 'hk A, ina A-16', re: /그것[은이을를]|그들[은이을를의]|그녀/g, why: '직역 대명사 “그것·그들”' },
  // 상투어
  { id: 'cliche', level: 'err', src: 'hk D, ina D-1·D-2, kas, toss(메타 담화)', re: /결론적으로|요약하면|정리하자면|요컨대|주목할 만|시사하는 바|시사합니다|매우 중요|중요한 역할|핵심적인 역할|본질적으로|궁극적으로|혁신적|획기적|앞서 설명했듯이|아시다시피|살펴보겠습니다|알아보겠습니다/g, why: '상투어·메타 담화' },
  { id: 'cleft', level: 'err', src: 'hk K, ina D-8', re: /(?:중요한|필요한|핵심인|관건인) (?:것은|점은)|핵심은\s|관건은\s/g, why: '분열문 “중요한 것은 ~이다”' },
  { id: 'cleft-noun', level: 'warn', src: 'ina D-8', re: /(?:^|[.!?]\s+)(?:문제는|답은|이유는|차이는)\s/g, why: '“문제는 ~이다” 분열문 변형' },
  { id: 'not-only', level: 'err', src: 'hk K, kas', re: /뿐만 아니라|뿐 아니라/g, why: '“~뿐만 아니라”' },
  { id: 'list-intro', level: 'warn', src: 'ina D-3', re: /다음과 같(?:습니다|다|은)|크게 (?:두|세|네) 가지로 나눌 수/g, why: '열거 도입구' },
  { id: 'reason-end', level: 'warn', src: 'ina D-10', re: /하는 이유(?:입니다|다)\.|인 이유(?:입니다|다)\./g, why: '“~하는 이유다” 도치 결산' },
  { id: 'its-time', level: 'err', src: 'ina D-6', re: /이제 \S+ (?:때|시점|순간)입니다/g, why: '결말 공식 “~할 때입니다”' },
  { id: 'beyond', level: 'err', src: 'ina A-21, D-7', re: /단순한 \S+(?:을|를) 넘어|단순히 \S+(?:을|를) 넘어/g, why: '“단순한 X를 넘어 Y”' },
  { id: 'clear-pred', level: 'warn', src: 'ina A-22', re: /(?:은|는|이|가) (?:명확|분명)(?:합니다|하다)\./g, why: '“~은 명확하다” 평가 술어' },
  { id: 'no-longer', level: 'warn', src: 'ina A-24', re: /더 이상/g, why: '“더 이상 ~ 않다”' },
  // 형식명사·결말
  { id: 'jeom', level: 'warn', src: 'hk I, ina I-2', re: /(?:다는|라는|는|ㄴ|은|한|인) 점(?:이|은|을|에서|입니다|이다)/g, why: '“~라는 점” 형식명사' },
  { id: 'geosida', level: 'warn', src: 'hk I, ina I-3', re: /(?:는|ㄴ|은|한|인|된|난|진) 것(?:입니다|이다)\.|다는 (?:뜻|것)(?:입니다|이다)\.|라는 뜻(?:입니다|이다)\./g, why: '“~인 것이다/~다는 뜻이다” 결말' },
  // 완곡·수식
  { id: 'hedge-stack', level: 'err', src: 'hk G, ina G-2', re: /(?:ㄹ|을|할|일) 가능성이 있을 수|수 있을 수|보여질 수|것으로 보여/g, why: '완곡 겹침' },
  { id: 'seems', level: 'warn', src: 'hk G, ina G-1', re: /(?:것으로|로) 보입니다|(?:것으로|로) 보인다|로 판단됩니다|라고 여겨/g, why: '추측 종결 “~로 보인다”' },
  { id: 'vague-adj', level: 'warn', src: 'hk D·F, kas', re: /다양한|효과적(?:으로|인)|원활(?:한|하게)|적절(?:한|히)|필수적|매우\s/g, why: '뜻이 옅은 수식어(다양한·효과적·매우)' },
  { id: 'say-can', level: 'err', src: 'hk G, kas', re: /라고 할 수 있|라 할 수 있|다고 할 수 있/g, why: '“~라고 할 수 있다”' },
  { id: 'rhetoric', level: 'warn', src: 'hk C, kas', re: /[가-힣]까요\?|일까\?|는가\?/g, why: '수사 의문문' },
  { id: 'emphasis', level: 'warn', src: 'kwqa(장식보다 정보), kas', re: /정말로?\s|바로 이것|이것이 바로|한마디로|다시 말해|말하자면|셈입니다|셈이다/g, why: '강조·요약 상투어' },
  { id: 'quote-heavy', level: 'warn', src: 'ina J-2', re: /“[^”]{1,40}”(?:[^“]*“[^”]{1,40}”){3,}/g, why: '한 덩어리에 강조 따옴표 4개 이상' },
  // 접속사
  { id: 'lead-conj', level: 'warn', src: 'hk H, ina H-4', re: /(?:^|[.!?]\s+)(?:또한|따라서|즉|이는|이것은|게다가|더불어|아울러|나아가|그러므로|결국|그리고|그래서|하지만|그러나|반면)[ ,]/g, why: '문두 접속사(또한·따라서·즉·이는)' },
  { id: 'appositive', level: 'warn', src: 'ina H-4', re: /, 곧\s|, 즉\s/g, why: '“, 곧/즉 ~” 덧붙임' },
  { id: 'comma-ending', level: 'warn', src: 'ina C-11', re: /[가-힣](?:고|며|지만|면서|아서|어서|해서|는데|은데)\s?,\s/g, why: '연결어미 바로 뒤 쉼표' },
];

// 한 단위 안에서 해라체(~다.)와 합쇼체(~니다.)가 섞인 문장
const REGISTER = { id: 'register-mix', level: 'err', src: 'hk E, ina E-7', why: '한 덩어리 안에 “~다.”와 “~니다.”가 섞임' };
// “~다.”의 앞 글자가 받침 ㄴ(한다·간다·준다)이거나 있·없·었·았·였·겠·이·같이면 해라체로 본다
const jong = ch => (ch.charCodeAt(0) - 0xAC00) % 28;
const plainEnd = t => [...t.matchAll(/([가-힣])다\.(?=\s|$|<|\))/g)].some(m => m[1] !== '니' && (jong(m[1]) === 4 || '있없었았였겠이같'.includes(m[1])));
const politeEnd = t => /니다\.(?=\s|$|<|\))/.test(t);

const clean = s => s.replace(/<[^>]+>/g, ' ').replace(/\$\{[^}]*\}/g, 'X').replace(/@@[^\s`]*/g, '').replace(/[ \t]+/g, ' ');

// 마크다운 파일을 사이트 단위와 같은 꼴(묶음 → 원문 → 자리)로 바꾼다
function mdUnits(files) {
  const fs = require('fs');
  const groups = new Map();
  for (const f of files) {
    const m = new Map();
    let code = false;
    fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (line.startsWith('```')) { code = !code; return; }
      if (!code && line.trim()) m.set(line.replace(/`[^`]*`/g, 'X'), { ko: line.replace(/`[^`]*`/g, 'X'), ctx: `${f}:${i + 1}` });
    });
    groups.set(f, m);
  }
  return groups;
}

function run(files = []) {
  const hits = Object.fromEntries([...RULES, REGISTER].map(r => [r.id, []]));
  let units = 0, chars = 0;
  for (const [group, m] of (files.length ? mdUnits(files) : allUnits())) {
    for (const u of m.values()) {
      if (!/[가-힣]/.test(u.ko)) continue;
      units++; chars += u.ko.length;
      const text = clean(u.ko);
      for (const r of RULES) {
        const found = text.match(r.re);
        if (found) hits[r.id].push({ group, ctx: u.ctx.split(', ')[0], n: found.length, match: [...new Set(found.map(x => x.trim()))], ko: u.ko });
      }
      // 표 칸·목록 머리말처럼 “<b>제목</b>: 설명”으로 시작하는 단위도 문장 단위로 본다
      if (plainEnd(text) && politeEnd(text)) hits[REGISTER.id].push({ group, ctx: u.ctx.split(', ')[0], n: 1, match: [], ko: u.ko });
    }
  }
  return { units, chars, hits };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const files = args.filter(a => a.endsWith('.md'));
  const { units, chars, hits } = run(files);
  const all = [...RULES, REGISTER];
  if (args.includes('--json')) { process.stdout.write(JSON.stringify(hits, null, 1)); process.exit(0); }
  const show = args.indexOf('--show');
  if (show >= 0) {
    const id = args[show + 1];
    for (const h of hits[id] || []) console.log(`${h.group} | ${h.ctx} | ${h.match.join(', ')}\n  ${h.ko.replace(/\n/g, ' ')}\n`);
    process.exit(0);
  }
  console.log(`한국어 단위 ${units}개, ${chars.toLocaleString()}자`);
  let errs = 0;
  for (const r of all) {
    const n = hits[r.id].reduce((a, h) => a + h.n, 0);
    if (r.level === 'err') errs += n;
    console.log(`${r.level === 'err' ? '오류' : '주의'}  ${r.id.padEnd(15)} ${String(n).padStart(5)}  ${r.why}  [${r.src}]`);
  }
  if (args.includes('--strict') && errs) { console.log(`오류 ${errs}건`); process.exit(1); }
}

module.exports = { RULES, run };
