// 배포용 사이트 폴더 만들기: 검색엔진과 AI(ChatGPT·Claude 등)가 읽고 인용하기 좋은 정적 파일을 함께 만든다.
//   python3 build.py && node tools/site.cjs [출력 폴더] [--langs ko,en]   (기본 build/site, 번역 파일이 있는 언어 모두, draft 언어는 --langs 로 이름을 줄 때만)
// AI 수집기 상당수는 자바스크립트를 실행하지 않으므로, 자바스크립트가 그리는 내용을 HTML에도 넣는다.
// 언어마다(한국어는 맨 위, 번역판은 <dir>/ 아래, src/i18n/langs.json):
//   index.html      빌드한 완성본 + 원인 카드·증상·용어의 정적 사본(자바스크립트가 돌면 원래 화면으로 바뀜)
//   c/<ID>.html     원인마다 한 페이지. 질문과 딱 맞는 페이지가 인용되기 쉽다
//   s/<ID>.html     증상마다 한 페이지: 그 증상을 만드는 원인 목록
//   text.html       전체를 한 페이지로 읽는 텍스트 판
//   llms.txt        AI용 안내(llmstxt.org 형식), llms-full.txt 전체 마크다운
// 맨 위에만:
//   sitemap.xml     검색엔진용 주소 목록(언어판끼리 hreflang으로 잇는다)
//   favicon.svg, og*.png, IndexNow 키 파일   src/site/에서 복사
// 사이트 주소는 package.json의 homepage를 쓴다. 번역판의 index.html은 python3 build.py --lang 으로 만든다.
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const PKG = require(path.join(ROOT, 'package.json'));
const SITE = PKG.homepage.replace(/\/?$/, '/');
const REPO = PKG.repository && PKG.repository.url ? PKG.repository.url.replace(/^git\+/, '').replace(/\.git$/, '') : '';
const args = process.argv.slice(2);
const li = args.indexOf('--langs');
const out = path.resolve(args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--langs')[0] || path.join(ROOT, 'build/site'));
const I = require('./i18n.cjs');
// 번역: TR 태그와 사전(src/js/i18n.js). 언어를 바꿀 때는 같은 I18N 객체의 dict를 바꾼다
globalThis.I18N = { lang: 'ko', dict: {} };
require('../src/js/i18n.js');
const want = li >= 0 ? args[li + 1].split(',') : null;
// 작업 중(draft) 언어는 이름을 직접 줄 때만 만든다
const named = l => want && (want.includes(l.code) || want.includes(l.dir));
const LANGS = I.LANGS.filter(l => (l.code === 'ko' || fs.existsSync(path.join(ROOT, 'src/i18n', l.code))) && (named(l) || (!want && !l.draft)));
const baseOf = l => SITE + (l.dir ? l.dir + '/' : '');
const XDEFAULT = LANGS.find(l => l.xdefault) || LANGS[0];
const today = new Date().toISOString().slice(0, 10);

const sctx = { window: {} }; sctx.window = sctx; vm.createContext(sctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/js/sigs.js'), 'utf8'), sctx);
const SIGDRAW = sctx.SIGDRAW;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const html = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const txt = s => String(s == null ? '' : s).replace(/\*\*/g, '');
const ld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const who = { '@type': 'Person', name: 'jungrok5', url: 'https://github.com/jungrok5' };
const crumbs = list => ({ '@type': 'BreadcrumbList', itemListElement: list.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })) });

// 언어별 본문 글꼴(style.css의 :lang과 같은 값). 한국어는 단어 중간에서 줄을 바꾸지 않게 keep-all
const FONT = {
  ko: 'system-ui,"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif',
  ja: '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic",Meiryo,"Noto Sans JP",sans-serif',
  'zh-CN': '"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif',
  'zh-TW': '"PingFang TC","Microsoft JhengHei","Noto Sans TC",sans-serif',
  th: '"Noto Sans Thai","Leelawadee UI",Thonburi,Tahoma,sans-serif',
};
const css = L => `:root{--bg:#fff;--ink:#0f1822;--ink2:#445162;--line:#d7dde4;--soft:#f3f5f8;--accent:#2340c8;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#0b1016;--ink:#e5ebf1;--ink2:#a6b2bf;--line:#26313d;--soft:#151e28;--accent:#8ea0ff}}
body{margin:0 auto;max-width:860px;padding:20px 16px 64px;background:var(--bg);color:var(--ink);font:16px/1.75 ${FONT[L.code] || 'system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans",sans-serif'};${L.code === 'ko' ? 'word-break:keep-all;' : ''}overflow-wrap:anywhere}
a{color:var(--accent)}h1{font-size:28px;line-height:1.35;margin:.4em 0}h2{margin-top:40px;padding-top:10px;border-top:2px solid var(--line);font-size:21px}h3{margin-top:26px;font-size:18px}
.en{font-weight:400;color:var(--ink2);font-size:.62em}.open{margin:.2em 0 1em;font-weight:600}.crumb,.meta,.n{color:var(--ink2);font-size:14px}
.langs{font-size:13px;color:var(--ink2);margin:0 0 8px}.langs a{margin-right:8px}.langs a[aria-current]{color:var(--ink);font-weight:700;text-decoration:none}
.chain{background:var(--soft);border-radius:8px;padding:12px 14px}
dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 14px}dt{font-weight:700;color:var(--ink2);font-size:14px;padding-top:2px}dd{margin:0}
@media (max-width:560px){dl{grid-template-columns:1fr}dd{margin-bottom:8px}}
ol.refs,ul.refs{padding-left:20px}ol.refs li,ul.refs li{margin-bottom:6px}code{font-size:.92em}
table{border-collapse:collapse;width:100%}td,th{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
article{padding:16px 0;border-bottom:1px solid var(--line)}article h3{margin:0}
nav.toc ul{columns:2;gap:24px}@media (max-width:560px){nav.toc ul{columns:1}}
footer{margin-top:48px;border-top:1px solid var(--line);padding-top:12px}
.sg{width:120px;height:36px;vertical-align:middle;margin-right:8px}.sg path{fill:none;stroke-linejoin:round;stroke-linecap:round}.sg-main{stroke:var(--accent);stroke-width:2}.sg-sub{stroke:var(--ink2);stroke-width:1.5;stroke-dasharray:3 3}.sg-solid{stroke-dasharray:none;stroke-width:1.2}.sg-ref{stroke:var(--line);stroke-width:1.5;stroke-dasharray:2 3}
ol.steps li{margin-bottom:10px}`;

// 같은 페이지의 언어판 주소: 검색엔진용 hreflang, 사람이 누르는 언어 링크
const alternates = rel => [
  ...LANGS.flatMap(l => [l.hreflang, ...(l.alsoHreflang || [])].map(h => [h, baseOf(l) + rel])),
  ['x-default', baseOf(XDEFAULT) + rel],
];
const ogImage = L => SITE + (L.code === 'ko' ? 'og.png' : `og-${L.dir}.png`);

// 출력 폴더는 통째로 지우고 다시 만든다. 저장소나 그 위 폴더를 잘못 넘기면 멈춘다
if (out === ROOT || ROOT.startsWith(out + path.sep) || fs.existsSync(path.join(out, 'src')) || fs.existsSync(path.join(out, '.git'))) throw new Error('출력 폴더로 쓸 수 없는 곳: ' + out);
fs.rmSync(out, { recursive: true, force: true });
const pages = new Map();   // 페이지 주소(언어 폴더 안 상대 경로) → 그 페이지가 있는 언어들
const counts = [];

function buildLang(L) {
  globalThis.I18N.lang = L.code;
  globalThis.I18N.dict = L.code === 'ko' ? {} : I.codeDict(L, 'site');
  const BASE = baseOf(L);
  const O = path.join(out, L.dir);
  fs.mkdirSync(path.join(O, 'c'), { recursive: true });
  fs.mkdirSync(path.join(O, 's'), { recursive: true });
  const seen = rel => { if (!pages.has(rel)) pages.set(rel, []); pages.get(rel).push(L); };

  // 데이터는 tools/export.cjs가 뽑은 JSON·마크다운을 그대로 쓴다(번역판은 번역한 것)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lag-anatomy-'));
  execFileSync(process.execPath, [path.join(__dirname, 'export.cjs'), tmp, '--lang', L.code], { stdio: 'ignore' });
  const K = JSON.parse(fs.readFileSync(path.join(tmp, 'lag-anatomy.json'), 'utf8'));
  const MD = fs.readFileSync(path.join(tmp, 'lag-anatomy.md'), 'utf8');
  fs.rmSync(tmp, { recursive: true, force: true });

  const CASE = Object.fromEntries((K.cases || []).map(x => [x.id, x]));
  // 층 번호: 앞의 13개가 층(l-…), 뒤는 주제 장
  K.layers.forEach((l, i) => { if (l.anchor.startsWith('l-')) l.n = i + 1; });
  const LAYER = Object.fromEntries(K.layers.map(l => [l.id, l]));
  const layerName = l => (l.n ? `L${l.n} ` : '') + l.name;
  const byLayer = {};
  K.causes.forEach(c => (byLayer[c.layer] = byLayer[c.layer] || []).push(c));
  const layers = K.layers.filter(l => byLayer[l.id]);
  const bySym = Object.fromEntries(K.symptoms.map(s => [s.id, K.causes.filter(c => c.symptoms.some(x => x.id === s.id))]));
  const SYM = Object.fromEntries(K.symptoms.map(s => [s.id, s]));
  const NAME = TR`게임 렉 백서`;
  const website = { '@type': 'WebSite', '@id': BASE + '#website', url: BASE, name: NAME, alternateName: 'Game Lag White Paper', inLanguage: L.code };
  // 번역판 문서는 한국어 원문의 번역임을 밝힌다
  const tx = rel => (L.code === 'ko' ? {} : { translationOfWork: { '@id': SITE + rel + '#article' } });
  const langLinks = rel => `<p class="langs" translate="no">${LANGS.map(l => `<a href="${baseOf(l)}${rel}" hreflang="${l.hreflang}" lang="${l.code}"${l === L ? ' aria-current="page"' : ''}>${esc(l.name)}</a>`).join('')}</p>`;

  function page({ rel, title, description, type = 'article', body, graph }) {
    const up = rel.includes('/') ? '../' : '';
    const url = BASE + rel;
    seen(rel);
    return `<!doctype html>
<html lang="${L.code}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<link rel="canonical" href="${url}">
${LANGS.length > 1 ? alternates(rel).map(([h, u]) => `<link rel="alternate" hreflang="${h}" href="${u}">`).join('\n') + '\n' : ''}<link rel="icon" href="${SITE}favicon.svg" type="image/svg+xml">
<meta property="og:type" content="${type}">
<meta property="og:locale" content="${L.og}">
${LANGS.filter(l => l !== L).map(l => `<meta property="og:locale:alternate" content="${l.og}">`).join('\n')}
<meta property="og:site_name" content="${esc(NAME)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImage(L)}">
<meta name="twitter:card" content="summary_large_image">
${ld({ '@context': 'https://schema.org', '@graph': [website, ...graph] })}
<style>${css(L)}</style>
</head>
<body>
${LANGS.length > 1 ? langLinks(rel) : ''}
${body}
<footer><p class="meta">${esc(NAME)} · ${TR`갱신 ${today}`} · ${TR`MIT 라이선스`} · <a href="${up}text.html">${TR`전체 텍스트 판`}</a> · <a href="${up || './'}">${TR`그림과 실험이 있는 원본`}</a>${REPO ? ` · <a href="${REPO}">GitHub</a>` : ''}<br>${TR`수치는 일반적인 서비스 환경의 대표값이며 실제 값은 게임과 인프라마다 다릅니다.`}</p></footer>
</body>
</html>
`;
  }

  const refLi = r => `<li><a href="${esc(r.u)}">${esc(r.t)}</a> <span class="n">${esc(r.p)}</span>${r.n ? `<br><span class="n">${esc(r.n)}</span>` : ''}</li>`;
  const ownerLine = c => `${TR`주 담당`} <b>${esc(c.ownerName)}</b>${c.alsoOwners.length ? ` · ${TR`함께`} ${c.alsoOwners.map(o => esc(o.name)).join(', ')}` : ''}`;
  const chain = c => `<p class="chain"><b>${TR`왜`}</b> ${html(c.why)} → <b>${TR`그러면`}</b> ${html(c.then)} → <b>${TR`화면에서는`}</b> ${html(c.onScreen)}</p>`;
  const row = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  const details = (c, up) => `<dl>
${row(TR`증상`, c.symptoms.map(s => `<a href="${up}s/${s.id}.html">${esc(s.name)}</a>`).join(', '))}
${row(TR`요인`, c.factors.map(f => esc(f.name)).join(', '))}
${row(TR`누가 겪나`, c.who.map(w => esc(w.name)).join(', '))}
${row(TR`언제`, c.when.map(w => esc(w.name)).join(', '))}
${row(TR`담당`, ownerLine(c))}
${Object.entries(c.actions).map(([t, v]) => row(TR`${esc(K.teams[t].name)} 할 일`, html(v))).join('\n')}
${c.numbers ? row(TR`수치 감각`, html(c.numbers)) : ''}
${c.graph ? row(TR`그래프에서는`, `${SIGDRAW(c.graph.shape, TR`${c.graph.shapeName} 모양의 그래프`)}${esc(c.graph.shapeName)} · ${html(c.graph.where)}`) : ''}
${c.check ? row(TR`확인할 곳`, html(c.check.look)) + row(TR`이러면 맞음`, html(c.check.yes)) + (c.check.no ? row(TR`이러면 아님`, html(c.check.no)) : '') + row(TR`확인 수단`, esc(c.check.byName)) : ''}
${c.more ? row(TR`더 알아보기`, html(c.more)) : ''}
${c.cases.length ? row(TR`실제 사례`, c.cases.filter(id => CASE[id]).map(id => `<a href="${up}text.html#case-${id}">${esc(CASE[id].org)} ${CASE[id].year}: ${esc(CASE[id].title)}</a>`).join('<br>')) : ''}
</dl>`;
  const causeName = id => esc((K.causes.find(c => c.id === id) || { name: id }).name);

  // ---------- 원인 페이지 ----------
  for (const c of K.causes) {
    const l = LAYER[c.layer];
    const rel = `c/${c.id}.html`;
    const same = byLayer[c.layer].filter(x => x.id !== c.id);
    const sym0 = c.symptoms[0] && c.symptoms[0].id;
    const related = sym0 ? bySym[sym0].filter(x => x.id !== c.id && x.layer !== c.layer).slice(0, 8) : [];
    // 문장을 잇는 띄어쓰기는 언어마다 달라(중국어·일본어는 띄우지 않음) 한 문장 틀로 번역한다
    const description = TR`${txt(c.summary)} 원인·증상·담당 팀·수치·출처를 정리한 게임 렉 백서 항목.`;
    const body = `<p class="crumb"><a href="../">${esc(NAME)}</a> › <a href="../text.html#${l.anchor}">${esc(layerName(l))}</a></p>
<h1>${esc(c.name)} <span class="en">${esc(c.en)}</span></h1>
<p class="meta">${TR`원인 ID`} <code>${c.id}</code> · ${ownerLine(c)}</p>
<p class="open"><a href="../#c-${c.id}">${TR`그림과 실험이 있는 원본 카드로 열기 →`}</a></p>
<p>${html(c.summary)}</p>
${chain(c)}
${details(c, '../')}
${c.sources.length ? `<h2>${TR`출처`}</h2><ol class="refs">${c.sources.map(refLi).join('')}</ol>` : ''}
<h2>${TR`함께 보면 좋은 원인`}</h2>
<h3>${TR`같은 층: ${esc(layerName(l))}`}</h3><ul>${same.map(x => `<li><a href="${x.id}.html">${esc(x.name)}</a></li>`).join('')}</ul>
${related.length ? `<h3>${TR`같은 증상(${esc(SYM[sym0].name)})의 다른 층 원인`}</h3><ul>${related.map(x => `<li><a href="${x.id}.html">${esc(x.name)}</a> <span class="n">${esc(layerName(LAYER[x.layer]))}</span></li>`).join('')}</ul>` : ''}
<p><a href="../#c-${c.id}">${TR`그림과 실험이 있는 원본 카드 보기`}</a></p>`;
    fs.writeFileSync(path.join(O, rel), page({
      rel, title: TR`${c.name} (${c.en}): 렉 원인 | 게임 렉 백서`, description, body,
      graph: [
        { '@type': 'TechArticle', '@id': BASE + rel + '#article', url: BASE + rel, headline: c.name, alternativeHeadline: c.en, description: txt(c.summary),
          inLanguage: L.code, dateModified: today, isPartOf: { '@id': BASE + '#website' }, author: who, license: 'https://opensource.org/licenses/MIT', image: ogImage(L),
          about: c.symptoms.map(s => s.name), keywords: [c.name, c.en, ...c.symptoms.map(s => s.name), TR`렉`, l.name].join(', '),
          citation: c.sources.map(r => ({ '@type': 'CreativeWork', name: r.t, url: r.u, publisher: { '@type': 'Organization', name: r.p } })), ...tx(rel) },
        crumbs([[NAME, BASE], [layerName(l), BASE + 'text.html#' + l.anchor], [c.name, BASE + rel]]),
      ],
    }));
  }

  // ---------- 증상 페이지 ----------
  for (const s of K.symptoms) {
    const rel = `s/${s.id}.html`;
    const list = bySym[s.id];
    const groups = layers.map(l => [l, list.filter(c => c.layer === l.id)]).filter(([, g]) => g.length);
    const description = TR`게임에서 ${s.name}(${s.alias}) 현상이 생기는 원인 ${list.length}가지와 담당 팀. ${txt(s.what)}`;
    const body = `<p class="crumb"><a href="../">${esc(NAME)}</a> › <a href="../text.html#symptoms">${TR`증상별로 찾기`}</a></p>
<h1>${TR`${esc(s.name)}: 원인 ${list.length}가지와 담당`}</h1>
<p class="meta">${TR`다른 말: ${esc(s.alias)}`}</p>
<p class="open"><a href="../#s-${s.id}">${TR`그림이 있는 원본 증상 사전으로 열기 →`}</a></p>
<p>${html(s.what)}</p>
<p>${html(s.looks)}</p>
<p>${html(s.tell)}</p>
<h2>${TR`이 증상을 만드는 원인`}</h2>
${groups.map(([l, g]) => `<h3>${esc(layerName(l))}</h3><ul>${g.map(c => `<li><a href="../c/${c.id}.html">${esc(c.name)}</a>: ${html(c.summary)} <span class="n">(${esc(c.ownerName)})</span></li>`).join('')}</ul>`).join('\n')}
<p><a href="../#s-${s.id}">${TR`그림이 있는 원본 증상 사전 보기`}</a></p>`;
    fs.writeFileSync(path.join(O, rel), page({
      rel, title: TR`${s.name} 원인: 게임 렉 증상별 원인과 담당 | 게임 렉 백서`, description, body,
      graph: [
        { '@type': 'TechArticle', '@id': BASE + rel + '#article', url: BASE + rel, headline: TR`${s.name}: 원인과 담당`, description: txt(s.what), inLanguage: L.code, dateModified: today, isPartOf: { '@id': BASE + '#website' }, author: who, license: 'https://opensource.org/licenses/MIT', image: ogImage(L), ...tx(rel) },
        { '@type': 'ItemList', name: TR`${s.name}의 원인`, itemListElement: list.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, url: BASE + `c/${c.id}.html` })) },
        crumbs([[NAME, BASE], [TR`증상별로 찾기`, BASE + 'text.html#symptoms'], [s.name, BASE + rel]]),
      ],
    }));
  }

  // ---------- text.html ----------
  const bib = new Map();
  K.causes.forEach(c => c.sources.forEach(r => { if (!bib.has(r.u)) bib.set(r.u, r); }));
  Object.values(K.chapterSources).forEach(l => l.forEach(r => { if (!bib.has(r.u)) bib.set(r.u, r); }));
  const byPub = {};
  [...bib.values()].forEach(r => (byPub[r.p] = byPub[r.p] || []).push(r));
  const pubs = Object.entries(byPub).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const textDesc = TR`온라인 게임에서 화면이 끊기거나 순간이동하거나 접속이 끊기는 원인 ${K.causes.length}가지를 내 화면부터 서버 데이터베이스까지 층별로 정리한 텍스트 판. 원인마다 증상, 담당 팀(게임개발팀·인프라팀), 수치, 공신력 있는 출처.`;
  const textBody = `<h1>${TR`게임 렉 백서 텍스트 판`}</h1>
<p>${esc(textDesc)}</p>
<p>${TR`그림과 직접 조작하는 실험이 있는 원본은 <a href="./">게임 렉 백서</a>입니다. 이 판은 같은 원인·용어·출처를 자바스크립트 없이 한 페이지에서 읽을 수 있게 모았습니다. 원인마다 따로 된 페이지(<code>c/ID.html</code>)도 있습니다. 마크다운 한 파일로는 <a href="llms-full.txt">llms-full.txt</a>에 있습니다.`}</p>
<nav class="toc" aria-label="${TR`목차`}"><h2>${TR`목차`}</h2><ul>
<li><a href="#symptoms">${TR`증상별로 찾기`}</a></li><li><a href="#owners">${TR`누가 고치나: 담당 코드`}</a></li>
${layers.map(l => `<li><a href="#${l.anchor}">${esc(layerName(l))} (${byLayer[l.id].length})</a></li>`).join('\n')}
<li><a href="#playbooks">${TR`상황별 절차`}</a></li><li><a href="#cases">${TR`실제 장애 사례`}</a></li>
<li><a href="#glossary">${TR`용어 사전`}</a></li><li><a href="#refs">${TR`참고 문헌`}</a></li></ul></nav>
<h2 id="symptoms">${TR`증상별로 찾기`}</h2>
<p>${TR`렉은 네 가지 요인에서 시작합니다:`} ${K.factors.map(f => TR`<b>${esc(f.name)}</b>(${html(f.desc)})`).join(' ')}</p>
<ul>${K.symptoms.map(s => `<li><a href="s/${s.id}.html">${esc(s.name)}</a> (${TR`원인 ${bySym[s.id].length}가지`}): ${html(s.what)}</li>`).join('')}</ul>
<h2 id="owners">${TR`누가 고치나: 담당 코드`}</h2>
<table><thead><tr><th>${TR`코드`}</th><th>${TR`팀`}</th><th>${TR`담당`}</th><th>${TR`범위`}</th></tr></thead><tbody>
${K.owners.map(o => `<tr><td><code>${o.id}</code></td><td>${esc(K.teams[o.team].name)}</td><td>${esc(o.name)}</td><td>${html(o.desc)}</td></tr>`).join('\n')}
</tbody></table>
${layers.map(l => `<h2 id="${l.anchor}">${esc(layerName(l))}</h2>
<p class="meta">${TR`원인 ${byLayer[l.id].length}가지`} · <a href="./#${l.anchor}">${TR`원본 장`}</a></p>
${byLayer[l.id].map(c => `<article id="c-${c.id}"><h3><a href="c/${c.id}.html">${esc(c.name)}</a> <span class="en">${esc(c.en)}</span></h3>
<p class="meta">ID <code>${c.id}</code> · ${ownerLine(c)}</p><p>${html(c.summary)}</p>${chain(c)}${details(c, '')}
${c.sources.length ? `<details><summary>${TR`출처 ${c.sources.length}건`}</summary><ul class="refs">${c.sources.map(refLi).join('')}</ul></details>` : ''}</article>`).join('\n')}`).join('\n')}
${(K.playbooks || []).length ? `<h2 id="playbooks">${TR`상황별 절차`}</h2>
${K.playbooks.map(pb => `<h3 id="pb-${pb.id}">${esc(pb.title)}</h3><p>${html(pb.when)}</p><ol class="steps">${pb.steps.map((st, i) => `<li id="pb-${pb.id}-${i + 1}"><b>${html(st.title)}</b>: ${html(st.detail)}${st.causes.length ? ` <span class="n">(${st.causes.map(id => `<a href="c/${id}.html">${causeName(id)}</a>`).join(', ')})</span>` : ''}</li>`).join('')}</ol>`).join('\n')}` : ''}
${(K.cases || []).length ? `<h2 id="cases">${TR`실제 장애 사례`}</h2>
<p>${TR`게임사와 인프라 회사가 스스로 공개한 사후 분석만 골랐습니다.`}</p>
${K.cases.map(x => `<article id="case-${x.id}"><h3>${esc(x.org)} ${x.year}: ${esc(x.title)}</h3><dl>${row(TR`무슨 일`, html(x.what))}${row(TR`원인`, html(x.why))}${row(TR`배울 점`, html(x.lesson))}${row(TR`관련 원인`, x.causes.map(id => `<a href="c/${id}.html">${causeName(id)}</a>`).join(', '))}${row(TR`원문`, `<a href="${esc(x.url)}">${esc(x.publisher || x.org)}</a>`)}</dl></article>`).join('\n')}` : ''}
<h2 id="glossary">${TR`용어 사전`}</h2>
<dl>${K.glossary.map(g => `<dt id="${I.glossId(g.en)}">${esc(g.term)}</dt><dd>${esc(g.en)}. ${html(g.def)}</dd>`).join('\n')}</dl>
<h2 id="refs">${TR`참고 문헌`}</h2>
<p>${TR`자료 ${bib.size}건, 발행처 ${pubs.length}곳. 표준 문서, 커널·OS·클라우드·엔진·DB 공식 문서, 논문, 원개발사 기술 글입니다.`}</p>
${pubs.map(([p, list]) => `<h3>${esc(p)} <span class="n">${list.length}</span></h3><ul class="refs">${list.sort((a, b) => a.t.localeCompare(b.t)).map(refLi).join('')}</ul>`).join('\n')}`;
  fs.writeFileSync(path.join(O, 'text.html'), page({
    rel: 'text.html', title: TR`게임 렉 백서 텍스트 판: 온라인 게임 렉 원인 ${K.causes.length}가지`, description: textDesc, body: textBody,
    graph: [
      { '@type': 'TechArticle', '@id': BASE + 'text.html#article', url: BASE + 'text.html', headline: TR`게임 렉 백서 텍스트 판`, alternativeHeadline: 'Game Lag White Paper: online game lag causes (text edition)', description: textDesc, inLanguage: L.code, dateModified: today, isPartOf: { '@id': BASE + '#website' }, author: who, license: 'https://opensource.org/licenses/MIT', image: ogImage(L), ...tx('text.html') },
      { '@type': 'DefinedTermSet', '@id': BASE + 'text.html#glossary', name: TR`게임 렉 백서 용어 사전`, inLanguage: L.code, hasDefinedTerm: K.glossary.map(g => ({ '@type': 'DefinedTerm', name: g.term, alternateName: g.en, description: txt(g.def) })) },
    ],
  }));

  // ---------- index.html: 자바스크립트가 그리는 곳에 정적 사본 ----------
  // 자바스크립트가 돌면 app.js가 이 칸들을 innerHTML로 통째로 바꾼다. .sf는 스크립트가 돌기 전 잠깐도 보이지 않게 숨긴다(head의 js 표시)
  const built = L.code === 'ko' ? path.join(ROOT, 'index.html') : path.join(ROOT, 'build/i18n', L.dir, 'index.html');
  if (L.code !== 'ko') execFileSync('python3', [path.join(ROOT, 'build.py'), '--lang', L.code, '--out', built], { stdio: 'ignore' });
  let index = fs.readFileSync(built, 'utf8');
  seen('');
  const fill = (re, inner) => {
    const before = index;
    index = index.replace(re, (m, open, close) => `${open}<div class="sf">${inner}</div>${close}`);
    if (index === before) throw new Error('정적 사본을 넣을 자리를 찾지 못함: ' + re);
  };
  for (const l of layers) {
    fill(new RegExp(`(<div class="causes" data-causes="${l.id}">)(</div>)`), byLayer[l.id].map(c => `<article><h4><a href="c/${c.id}.html">${esc(c.name)}</a> <span class="en">${esc(c.en)}</span></h4><p>${html(c.summary)}</p><p>${TR`왜`}: ${html(c.why)} → ${TR`그러면`}: ${html(c.then)} → ${TR`화면에서는`}: ${html(c.onScreen)}</p><p>${TR`증상`}: ${c.symptoms.map(s => esc(s.name)).join(', ')} · ${ownerLine(c)}</p></article>`).join(''));
  }
  fill(/(<div[^>]*id="sym-grid"[^>]*>)(<\/div>)/, K.symptoms.map(s => `<article><h3><a href="s/${s.id}.html">${esc(s.name)}</a></h3><p>${html(s.what)} ${html(s.tell)}</p></article>`).join(''));
  fill(/(<dl class="gloss" id="gloss">)(<\/dl>)/, K.glossary.map(g => `<dt>${esc(g.term)} <span class="en">${esc(g.en)}</span></dt><dd>${html(g.def)}</dd>`).join(''));
  fill(/(<div class="sig-legend" id="sig-legend">)(<\/div>)/, K.graphShapes.map(g => `<article><h4>${esc(g.name)}</h4><p>${html(g.desc)}</p><p>${K.causes.filter(c => c.graph && c.graph.shape === g.id).map(c => `<a href="c/${c.id}.html">${esc(c.name)}</a>`).join(', ')}</p></article>`).join(''));
  fill(/(<div id="playbooks">)(<\/div>)/, (K.playbooks || []).map(pb => `<article><h4>${esc(pb.title)}</h4><p>${html(pb.when)}</p><ol>${pb.steps.map(st => `<li><b>${html(st.title)}</b>: ${html(st.detail)}</li>`).join('')}</ol></article>`).join('') || `<p>${TR`준비 중입니다.`}</p>`);
  fill(/(<div class="case-list" id="case-list">)(<\/div>)/, (K.cases || []).map(x => `<article><h4>${esc(x.org)} ${x.year}: ${esc(x.title)}</h4><p>${html(x.what)} ${html(x.why)}</p><p>${html(x.lesson)} <a href="${esc(x.url)}">${TR`원문`}</a></p></article>`).join('') || `<p>${TR`준비 중입니다.`}</p>`);
  fill(/(<div id="ref-list">)(<\/div>)/, `<p>${TR`자료 ${bib.size}건, 발행처 ${pubs.length}곳. 목록은 <a href="text.html#refs">텍스트 판의 참고 문헌</a>에 있습니다.`}</p>`);
  fs.writeFileSync(path.join(O, 'index.html'), index);

  // ---------- llms.txt, llms-full.txt ----------
  const others = LANGS.filter(l => l !== L);
  const llms = `# ${NAME}${NAME === 'Game Lag White Paper' ? '' : ' (Game Lag White Paper)'}

> ${TR`온라인 게임에서 렉(뚝뚝 끊김, 순간이동, 고무줄, 몰아치기, 입력 지연, 멈춤, 접속 끊김 등)이 생기는 원인 ${K.causes.length}가지를 내 화면부터 서버 데이터베이스까지 13개 층과 3개 주제(동기화 설계, 일부에게만 생기는 문제, TCP 재전송)로 나눠 설명하는 백서입니다. MMO 사례를 중심으로 썼지만 대부분은 장르와 상관없이 온라인 게임 전반에 해당합니다. 원인마다 왜 → 그러면 → 화면에서는의 세 단계, 관련 증상, 수치 감각, 해결 담당(게임개발팀·인프라팀·외부)과 팀별 할 일, 그래프 모양과 확인 방법, 공신력 있는 출처(RFC, 커널·OS·클라우드·엔진·DB 공식 문서, 논문)를 담았습니다.`}

${TR`원인은 ID(예: mem-gc)로 가리키고 원인마다 페이지가 있습니다(예: ${BASE}c/mem-gc.html). 수치는 일반적인 서비스 환경의 대표값이고 기본값·버전은 각 원인 페이지의 출처에 근거가 있습니다. 인용할 때는 원인 페이지 주소를 쓰면 됩니다. MIT 라이선스.`}${L.code === 'ko' ? '' : TR` 원문은 한국어이고 이 판은 번역입니다: ${SITE}`}

## ${TR`문서`}

- [${TR`전체 내용(마크다운)`}](${BASE}llms-full.txt): ${TR`원인·증상·담당·용어·출처 전체를 한 파일로`}
- [${TR`텍스트 판`}](${BASE}text.html): ${TR`같은 내용을 자바스크립트 없이 한 페이지에서 읽는 HTML`}
- [${NAME}](${BASE}): ${TR`그림과 직접 조작하는 실험이 있는 원본`}

## ${TR`증상별 원인`}

${K.symptoms.map(s => `- [${s.name}](${BASE}s/${s.id}.html): ${TR`원인 ${bySym[s.id].length}가지. ${txt(s.what)}`}`).join('\n')}

${layers.map(l => `## ${layerName(l)}

${byLayer[l.id].map(c => `- [${c.name}](${BASE}c/${c.id}.html): ${txt(c.summary)}`).join('\n')}`).join('\n\n')}

## ${TR`판정과 사례`}

- [${TR`관측으로 판정하기`}](${BASE}#judge): ${TR`범위 → 시점 → 계층 판정 흐름, 판정 신호표, 그래프 모양 13가지, 숫자 읽는 법(평균과 p99)`}
- [${TR`상황별 절차`}](${BASE}text.html#playbooks): ${TR`패치 이후 렉, 해외 국가·지역 추가`}
- [${TR`실제 장애 사례`}](${BASE}text.html#cases): ${TR`원개발사·운영사가 공개한 사후 분석과 관련 원인`}
${others.length ? `
## ${TR`다른 언어`}

${others.map(l => `- [${l.name === l.en ? l.name : `${l.name} (${l.en})`}](${baseOf(l)}llms.txt)`).join('\n')}
` : ''}
## Optional

- [${TR`GitHub 저장소`}](${REPO || 'https://github.com/jungrok5/mmo-lag-anatomy'}): ${TR`소스, 데이터 형식, 기여 방법`}
`;
  fs.writeFileSync(path.join(O, 'llms.txt'), llms);
  fs.writeFileSync(path.join(O, 'llms-full.txt'), `${TR`원본: ${BASE}`}\n${TR`원인 페이지: ${BASE}c/[원인 ID].html`}\n\n` + MD);
  counts.push(`${L.code} ${fs.readdirSync(path.join(O, 'c')).length}/${fs.readdirSync(path.join(O, 's')).length}`);
}

for (const L of LANGS) buildLang(L);

// ---------- sitemap.xml: 한 페이지의 언어판끼리 hreflang으로 잇는다 ----------
const entries = [];
for (const [rel, ls] of pages) {
  const xd = ls.includes(XDEFAULT) ? XDEFAULT : ls[0];
  const alts = ls.length > 1 ? [...ls.flatMap(l => [l.hreflang, ...(l.alsoHreflang || [])].map(h => [h, baseOf(l) + rel])), ['x-default', baseOf(xd) + rel]] : [];
  for (const l of ls) entries.push(`  <url><loc>${baseOf(l) + rel}</loc><lastmod>${today}</lastmod>${alts.map(([h, u]) => `<xhtml:link rel="alternate" hreflang="${h}" href="${u}"/>`).join('')}</url>`);
}
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`);

// ---------- 복사 ----------
for (const f of fs.readdirSync(path.join(ROOT, 'src/site'))) fs.copyFileSync(path.join(ROOT, 'src/site', f), path.join(out, f));
console.log(`${out}: 언어 ${LANGS.length}개(원인/증상 페이지 ${counts.join(', ')}), 주소 ${entries.length}개`);
