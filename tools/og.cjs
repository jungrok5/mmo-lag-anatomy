// 링크 미리보기 이미지(Open Graph, 1200×630) 만들기: src/site/og.png
//   node tools/og.cjs
// 원인 수는 데이터에서 읽는다. 글꼴은 src/fonts/의 것을 쓴다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const { chromium } = require('./pw.cjs');
const ROOT = path.resolve(__dirname, '..'), JS = path.join(ROOT, 'src/js');
const ctx = { window: {} }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['data.js', ...fs.readdirSync(JS).filter(f => /^causes-\d+\.js$/.test(f)).sort()]) vm.runInContext(fs.readFileSync(path.join(JS, f), 'utf8'), ctx);
const D = ctx.DATA;
const font = (name, file, w) => `@font-face{font-family:"${name}";font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'src/fonts', file)).toString('base64')}) format("woff2")}`;
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
${font('Black Han Sans', 'BlackHanSans-Regular.woff2', 400)}
${font('IBM Plex Sans KR', 'IBMPlexSansKR-Medium.woff2', 500)}
${font('IBM Plex Sans KR', 'IBMPlexSansKR-Bold.woff2', 700)}
*{margin:0;box-sizing:border-box}
body{word-break:keep-all;width:1200px;height:630px;background:#eceff3;color:#0f1822;font-family:"IBM Plex Sans KR",sans-serif;padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between}
.kick{font-size:26px;font-weight:700;color:#445162;letter-spacing:.02em}
h1{font-family:"Black Han Sans";font-weight:400;font-size:150px;line-height:1.02;margin-top:18px}
h1 span{color:#2340c8}
p{font-size:33px;font-weight:500;color:#1f2b38;line-height:1.45;max-width:1000px}
.row{display:flex;gap:14px;flex-wrap:wrap}
.pill{font-size:23px;font-weight:700;background:#fff;border:2px solid #d3d9e1;border-radius:999px;padding:8px 20px}
svg{position:absolute;right:80px;top:96px}
</style></head><body>
<svg width="300" height="120" viewBox="0 0 300 120"><polyline points="0,90 70,90 95,80 120,10 145,110 170,78 300,78" fill="none" stroke="#2340c8" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>
<div><div class="kick">MMO 게임 렉 원인 백과</div><h1>렉 해부<span>도감</span></h1></div>
<p>화면이 끊기고, 순간이동하고, 접속이 끊기는 이유. 내 화면부터 서버 데이터베이스까지 원인 ${D.causes.length}가지를 층별로 해부합니다.</p>
<div class="row"><span class="pill">지연·지터·손실·정체</span><span class="pill">팀별 담당 구분</span><span class="pill">직접 조작하는 실험</span><span class="pill">공신력 있는 출처</span></div>
</body></html>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(html); await p.evaluate(() => document.fonts.ready);
  const out = path.join(ROOT, 'src/site/og.png');
  await p.screenshot({ path: out });
  await b.close();
  console.log(out, Math.round(fs.statSync(out).size / 1024) + ' KB');
})();
