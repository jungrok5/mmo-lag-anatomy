// 배포용 사이트 폴더 만들기: index.html과 함께 검색엔진·AI가 읽기 좋은 파일을 만든다.
//   python3 build.py && node tools/site.cjs [출력 폴더]   (기본 build/site)
// 만드는 것
//   index.html     빌드한 완성본을 복사
//   text.html      자바스크립트 없이 읽는 텍스트 판(원인·증상별 목록·담당·용어·출처). 자바스크립트를 실행하지 않는 수집기용
//   llms.txt       AI용 요약과 안내(llmstxt.org 형식)
//   llms-full.txt  전체 내용 마크다운 한 파일(tools/export.cjs와 같은 내용)
//   sitemap.xml    검색엔진용 주소 목록
//   favicon.svg, og.png  src/site/에서 복사
// 사이트 주소는 package.json의 homepage를 쓴다.
const fs = require('fs'), path = require('path');
const { D, knowledge, markdown } = require('./export.cjs');
const ROOT = path.resolve(__dirname, '..');
const SITE = require(path.join(ROOT, 'package.json')).homepage.replace(/\/?$/, '/');
const out = path.resolve(process.argv[2] || path.join(ROOT, 'build/site'));
fs.mkdirSync(out, { recursive: true });

const K = knowledge();
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const md2html = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const today = K.generated;

// ---------- text.html ----------
const byLayer = {};
K.causes.forEach(c => (byLayer[c.layer] = byLayer[c.layer] || []).push(c));
const layers = K.layers.filter(l => byLayer[l.id]);
const OWNER = Object.fromEntries(K.owners.map(o => [o.id, o]));
const refItem = r => `<li><a href="${esc(r.u)}">${esc(r.t)}</a> <span class="p">${esc(r.p)}</span>${r.n ? `<br><span class="n">${esc(r.n)}</span>` : ''}</li>`;

const causeHTML = c => `<article id="c-${c.id}">
<h4>${esc(c.name)} <span class="en">${esc(c.en)}</span></h4>
<p class="meta">ID <code>${c.id}</code> · 주 담당 ${esc(c.ownerName)}${c.alsoOwners.length ? ` · 함께 ${c.alsoOwners.map(o => esc(o.name)).join(', ')}` : ''} · <a href="${SITE}#c-${c.id}">원본 카드</a></p>
<p>${md2html(c.summary)}</p>
<p><b>왜</b> ${md2html(c.why)} → <b>그러면</b> ${md2html(c.then)} → <b>화면에서는</b> ${md2html(c.onScreen)}</p>
<dl>
<dt>증상</dt><dd>${c.symptoms.map(s => `<a href="#s-${s.id}">${esc(s.name)}</a>`).join(', ')}</dd>
<dt>요인</dt><dd>${c.factors.map(f => esc(f.name)).join(', ')}</dd>
<dt>누가·언제</dt><dd>${c.who.map(w => esc(w.name)).join(', ')} / ${c.when.map(w => esc(w.name)).join(', ')}</dd>
${Object.entries(c.actions).map(([t, v]) => `<dt>${esc(K.teams[t].name)} 할 일</dt><dd>${md2html(v)}</dd>`).join('\n')}
${c.numbers ? `<dt>수치 감각</dt><dd>${md2html(c.numbers)}</dd>` : ''}
${c.more ? `<dt>더 알아보기</dt><dd>${md2html(c.more)}</dd>` : ''}
${c.sources.length ? `<dt>출처</dt><dd><ul class="refs">${c.sources.map(refItem).join('')}</ul></dd>` : ''}
</dl>
</article>`;

const symHTML = s => {
  const list = K.causes.filter(c => c.symptoms.some(x => x.id === s.id));
  return `<section id="s-${s.id}"><h3>${esc(s.name)}</h3>
<p class="meta">다른 말: ${esc(s.alias)}</p>
<p>${md2html(s.what)} ${md2html(s.tell)}</p>
<details><summary>이 증상을 만드는 원인 ${list.length}가지</summary><ul>${list.map(c => `<li><a href="#c-${c.id}">${esc(c.name)}</a> <span class="n">${esc(K.layers.find(l => l.id === c.layer).name)} · 주 담당 ${esc(c.ownerName)}</span></li>`).join('')}</ul></details></section>`;
};

// 참고 문헌: 원인·장 출처를 주소로 묶어 발행처별로
const bib = new Map();
K.causes.forEach(c => c.sources.forEach(r => { if (!bib.has(r.u)) bib.set(r.u, r); }));
Object.values(K.chapterSources).forEach(l => l.forEach(r => { if (!bib.has(r.u)) bib.set(r.u, r); }));
const byPub = {};
[...bib.values()].forEach(r => (byPub[r.p] = byPub[r.p] || []).push(r));
const pubs = Object.entries(byPub).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

const description = `MMO 게임에서 화면이 끊기고, 순간이동하고, 접속이 끊기는 원인 ${K.causes.length}가지를 내 화면부터 서버 데이터베이스까지 층별로 정리한 텍스트 판. 원인마다 증상, 담당 팀(게임개발팀·인프라팀), 수치, 공신력 있는 출처.`;
const jsonld = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'TechArticle', '@id': SITE + 'text.html#article', url: SITE + 'text.html', headline: '렉 해부도감 텍스트 판', description, inLanguage: 'ko', dateModified: today, license: 'https://opensource.org/licenses/MIT', isPartOf: { '@id': SITE + '#website' }, image: SITE + 'og.png' },
    { '@type': 'DefinedTermSet', '@id': SITE + 'text.html#glossary', name: '렉 해부도감 용어 사전', inLanguage: 'ko',
      hasDefinedTerm: K.glossary.map(g => ({ '@type': 'DefinedTerm', name: g.term, alternateName: g.en, description: g.def })) },
  ],
};

const text = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>렉 해부도감 텍스트 판: MMO 게임 렉 원인 ${K.causes.length}가지</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}text.html">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta property="og:type" content="article">
<meta property="og:locale" content="ko_KR">
<meta property="og:site_name" content="렉 해부도감">
<meta property="og:title" content="렉 해부도감 텍스트 판">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}text.html">
<meta property="og:image" content="${SITE}og.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>
<style>
:root{--bg:#fff;--ink:#0f1822;--ink2:#445162;--line:#d7dde4;--accent:#2340c8;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#0b1016;--ink:#e5ebf1;--ink2:#a6b2bf;--line:#26313d;--accent:#8ea0ff}}
body{margin:0 auto;max-width:880px;padding:24px 16px 64px;background:var(--bg);color:var(--ink);font:16px/1.7 system-ui,"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif;word-break:keep-all;overflow-wrap:anywhere}
a{color:var(--accent)}h1{font-size:30px;line-height:1.3}h2{margin-top:48px;padding-top:12px;border-top:2px solid var(--line)}h3{margin-top:28px}
h4{margin:0;font-size:18px}.en{font-weight:400;color:var(--ink2);font-size:14px}
article{padding:18px 0;border-bottom:1px solid var(--line)}.meta,.n,.p{color:var(--ink2);font-size:14px}
dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px}dt{font-weight:700;color:var(--ink2);font-size:14px}dd{margin:0}
@media (max-width:560px){dl{grid-template-columns:1fr}dd{margin-bottom:6px}}
ul.refs{margin:0;padding-left:18px}code{font-size:.92em}table{border-collapse:collapse;width:100%}td,th{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
nav ul{columns:2;gap:24px}@media (max-width:560px){nav ul{columns:1}}
</style>
</head>
<body>
<header>
<h1>렉 해부도감 텍스트 판</h1>
<p>${esc(description)}</p>
<p>그림과 직접 조작하는 실험이 있는 원본은 <a href="${SITE}">렉 해부도감</a>입니다. 이 판은 같은 원인·용어·출처를 자바스크립트 없이 한 페이지에서 읽을 수 있게 모았습니다. 원인은 ID(예: <code>mem-gc</code>)로 가리키고, 원본 주소 뒤에 <code>#c-ID</code>를 붙이면 그 원인 카드로 갑니다. 마크다운 한 파일로는 <a href="llms-full.txt">llms-full.txt</a>에 있습니다. 갱신: ${today}.</p>
</header>
<nav aria-label="목차"><h2 id="toc">목차</h2><ul>
<li><a href="#symptoms">증상별로 찾기</a></li><li><a href="#owners">누가 고치나: 담당 코드</a></li>
${layers.map(l => `<li><a href="#${l.anchor}">${l.n ? `L${l.n} ` : ''}${esc(l.name)} (${byLayer[l.id].length})</a></li>`).join('\n')}
<li><a href="#glossary">용어 사전</a></li><li><a href="#refs">참고 문헌</a></li></ul></nav>
<main>
<h2 id="symptoms">증상별로 찾기</h2>
<p>유저가 제보하는 증상 이름에서 시작해, 그 증상을 만드는 원인으로 이어집니다. 렉은 크게 네 가지 요인에서 시작합니다: ${K.factors.map(f => `<b>${esc(f.name)}</b>(${md2html(f.desc)})`).join(' ')}</p>
${K.symptoms.map(symHTML).join('\n')}
<h2 id="owners">누가 고치나: 담당 코드</h2>
<p>원인마다 주 담당(근본 원인을 없애는 곳)과 함께 할 일이 있는 곳을 적었습니다.</p>
<table><thead><tr><th>코드</th><th>팀</th><th>담당</th><th>범위</th></tr></thead><tbody>
${K.owners.map(o => `<tr><td><code>${o.id}</code></td><td>${esc(K.teams[o.team].name)}</td><td>${esc(o.name)}</td><td>${md2html(o.desc)}</td></tr>`).join('\n')}
</tbody></table>
${layers.map(l => `<h2 id="${l.anchor}">${l.n ? `L${l.n} ` : ''}${esc(l.name)}</h2>
<p class="meta">원인 ${byLayer[l.id].length}가지 · <a href="${SITE}#${l.anchor}">원본 장</a></p>
${byLayer[l.id].map(causeHTML).join('\n')}`).join('\n')}
<h2 id="glossary">용어 사전</h2>
<dl>${K.glossary.map(g => `<dt id="g-${encodeURIComponent(g.term)}">${esc(g.term)}</dt><dd>${esc(g.en)}. ${md2html(g.def)}</dd>`).join('\n')}</dl>
<h2 id="refs">참고 문헌</h2>
<p>자료 ${bib.size}건, 발행처 ${pubs.length}곳. 표준 문서, 커널·OS·클라우드·엔진·DB 공식 문서, 논문, 원개발사 기술 글입니다.</p>
${pubs.map(([p, list]) => `<h3>${esc(p)} <span class="n">${list.length}</span></h3><ul class="refs">${list.sort((a, b) => a.t.localeCompare(b.t)).map(refItem).join('')}</ul>`).join('\n')}
</main>
<footer><p class="meta">MIT 라이선스. 수치는 일반적인 서비스 환경의 대표값이며 실제 값은 게임과 인프라마다 다릅니다. <a href="https://github.com/jungrok5/mmo-lag-anatomy">GitHub 저장소</a></p></footer>
</body>
</html>
`;
fs.writeFileSync(path.join(out, 'text.html'), text);

// ---------- llms.txt, llms-full.txt ----------
const llms = `# 렉 해부도감

> MMO 게임에서 렉(뚝뚝 끊김, 순간이동, 고무줄, 입력 지연, 멈춤, 접속 끊김 등)이 생기는 원인 ${K.causes.length}가지를 내 화면부터 서버 데이터베이스까지 13개 층과 3개 주제(동기화 설계, 일부에게만 생기는 문제, TCP 재전송)로 나눠 설명하는 한국어 백과입니다. 원인마다 왜 → 그러면 → 화면에서는의 세 단계, 관련 증상, 수치 감각, 해결 담당(게임개발팀·인프라팀·외부)과 팀별 할 일, 공신력 있는 출처를 담았습니다.

원인은 ID(예: mem-gc)로 가리킵니다. 사이트 주소 뒤에 #c-ID를 붙이면 그 원인 카드로 갑니다(예: ${SITE}#c-mem-gc). 수치는 일반적인 서비스 환경의 대표값이고, 기본값·버전은 각 원인의 출처에 근거가 있습니다.

## 문서

- [텍스트 판](${SITE}text.html): 원인·증상별 목록·담당·용어·출처 전체를 자바스크립트 없이 읽는 HTML
- [전체 내용(마크다운)](${SITE}llms-full.txt): 같은 내용을 마크다운 한 파일로
- [렉 해부도감](${SITE}): 그림과 직접 조작하는 실험이 있는 원본

## 층별 원인

${layers.map(l => `- [${l.n ? `L${l.n} ` : ''}${l.name}](${SITE}text.html#${l.anchor}): 원인 ${byLayer[l.id].length}가지. ${byLayer[l.id].slice(0, 4).map(c => c.name).join(', ')} 등`).join('\n')}

## 증상

${K.symptoms.map(s => `- [${s.name}](${SITE}text.html#s-${s.id}): ${s.what.replace(/\*\*/g, '')}`).join('\n')}

## Optional

- [GitHub 저장소](https://github.com/jungrok5/mmo-lag-anatomy): 소스, 데이터 형식, 기여 방법(MIT 라이선스)
`;
fs.writeFileSync(path.join(out, 'llms.txt'), llms);
fs.writeFileSync(path.join(out, 'llms-full.txt'), `원본: ${SITE}\n텍스트 판: ${SITE}text.html\n\n` + markdown(K).replace(/사이트 주소 뒤에 `#c-ID`를 붙이면/, `사이트 주소(${SITE}) 뒤에 \`#c-ID\`를 붙이면`));

// ---------- sitemap.xml ----------
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}</loc><lastmod>${today}</lastmod></url>
  <url><loc>${SITE}text.html</loc><lastmod>${today}</lastmod></url>
</urlset>
`);

// ---------- 복사 ----------
fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(out, 'index.html'));
for (const f of fs.readdirSync(path.join(ROOT, 'src/site'))) fs.copyFileSync(path.join(ROOT, 'src/site', f), path.join(out, f));
for (const f of fs.readdirSync(out).sort()) console.log(path.join(out, f), Math.round(fs.statSync(path.join(out, f)).size / 1024) + ' KB');
