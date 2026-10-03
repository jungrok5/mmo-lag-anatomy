// 링크 미리보기 이미지(Open Graph, 1200×630) 만들기: src/site/og.png (한국어), src/site/og-<dir>.png (번역판)
//   node tools/og.cjs [언어…]   (기본: 한국어와 번역 파일이 있는 모든 언어)
// 원인 수는 데이터에서 읽는다. 한국어는 src/fonts/의 글꼴, 번역판은 그 언어의 Noto 글꼴(Google Fonts, 만들 때만 인터넷 필요)을 쓴다.
const fs = require('fs'), path = require('path');
const { chromium } = require('./pw.cjs');
const I = require('./i18n.cjs');
const ROOT = path.resolve(__dirname, '..');
globalThis.I18N = { lang: 'ko', dict: {} };
require('../src/js/i18n.js');
const want = process.argv.slice(2);
const LANGS = I.LANGS.filter(l => (l.code === 'ko' || fs.existsSync(path.join(ROOT, 'src/i18n', l.code))) && (want.length ? want.includes(l.code) || want.includes(l.dir) : !l.draft));
const n = I.loadData().causes.length;
const font = (name, file, w) => `@font-face{font-family:"${name}";font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'src/fonts', file)).toString('base64')}) format("woff2")}`;
// 번역판 글꼴: 라틴·키릴·베트남 문자는 Noto Sans, 나머지는 그 문자의 Noto
const NOTO = { ja: 'Noto+Sans+JP', 'zh-CN': 'Noto+Sans+SC', 'zh-TW': 'Noto+Sans+TC', th: 'Noto+Sans+Thai' };
const fontHead = L => L.code === 'ko'
  ? `<style>${font('Black Han Sans', 'BlackHanSans-Regular.woff2', 400)}${font('IBM Plex Sans KR', 'IBMPlexSansKR-Medium.woff2', 500)}${font('IBM Plex Sans KR', 'IBMPlexSansKR-Bold.woff2', 700)}</style>`
  : `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@500;700;900${NOTO[L.code] ? `&family=${NOTO[L.code]}:wght@500;700;900` : ''}&display=block">`;
const family = L => (L.code === 'ko' ? '"IBM Plex Sans KR"' : `${NOTO[L.code] ? `"${NOTO[L.code].replace(/\+/g, ' ')}",` : ''}"Noto Sans"`) + ',sans-serif';

function page(L) {
  const display = L.code === 'ko' ? 'font-family:"Black Han Sans";font-weight:400' : `font-family:${family(L)};font-weight:900`;
  return `<!doctype html><html lang="${L.code}"><head><meta charset="utf-8">${fontHead(L)}<style>
*{margin:0;box-sizing:border-box}
body{${L.code === 'ko' ? 'word-break:keep-all;' : ''}width:1200px;height:630px;overflow:hidden;background:#eceff3;color:#0f1822;font-family:${family(L)};padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between}
.kick{font-size:26px;font-weight:700;color:#445162;letter-spacing:.02em;max-width:720px}
h1{${display};font-size:150px;line-height:1.02;margin-top:18px;max-width:760px}
h1 span{color:#2340c8}
p{font-size:33px;font-weight:500;color:#1f2b38;line-height:1.45;max-width:1000px}
.row{display:flex;gap:14px;flex-wrap:wrap}
.pill{font-size:23px;font-weight:700;background:#fff;border:2px solid #d3d9e1;border-radius:999px;padding:8px 20px}
svg{position:absolute;right:80px;top:96px}
</style></head><body>
<svg width="300" height="120" viewBox="0 0 300 120"><polyline points="0,90 70,90 95,80 120,10 145,110 170,78 300,78" fill="none" stroke="#2340c8" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>
<div><div class="kick">${TR`온라인 게임 렉 원인 백과 · MMO 사례 중심`}</div><h1>${TR`게임 렉 <span>백서</span>`}</h1></div>
<p>${TR`화면이 끊기고, 순간이동하고, 접속이 끊기는 이유. 내 화면부터 서버 데이터베이스까지 원인 ${n}가지를 층별로 해부합니다.`}</p>
<div class="row"><span class="pill">${TR`지연·지터·손실·정체`}</span><span class="pill">${TR`팀별 담당 구분`}</span><span class="pill">${TR`직접 조작하는 실험`}</span><span class="pill">${TR`공신력 있는 출처`}</span></div>
</body></html>`;
}

(async () => {
  const b = await chromium.launch();
  for (const L of LANGS) {
    globalThis.I18N.lang = L.code;
    globalThis.I18N.dict = L.code === 'ko' ? {} : I.codeDict(L, 'site');
    const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
    await p.setContent(page(L), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    // 긴 제목(번역판)은 한 화면에 들어갈 때까지 글자를 줄인다
    await p.evaluate(() => {
      const h1 = document.querySelector('h1'), para = document.querySelector('p');
      let size = 150, ps = 33;
      while (document.body.scrollHeight > 630 && size > 64) { size -= 6; h1.style.fontSize = size + 'px'; if (size < 110 && ps > 26) { ps -= 1; para.style.fontSize = ps + 'px'; } }
    });
    const out = path.join(ROOT, 'src/site', L.code === 'ko' ? 'og.png' : `og-${L.dir}.png`);
    await p.screenshot({ path: out });
    await p.close();
    console.log(out, Math.round(fs.statSync(out).size / 1024) + ' KB');
  }
  await b.close();
})();
