// 섹션별 스크린샷: node tools/shots.cjs index.html out-prefix width [--dark] id1 id2 ...
const { chromium } = require('./pw.cjs');
const path = require('node:path');
(async () => {
  const a = process.argv.slice(2);
  const dark = a.includes('--dark');
  const [file, prefix, width, ...ids] = a.filter(x => x !== '--dark');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +width, height: 1000 }, colorScheme: dark ? 'dark' : 'light' });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|Failed to load/.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + path.resolve(file));
  await p.waitForTimeout(1200);
  for (const id of ids) {
    const el = await p.$('#' + id);
    if (!el) { console.log('missing', id); continue; }
    await p.evaluate(i => document.getElementById(i).scrollIntoView({ behavior: 'instant' }), id);
    await p.waitForTimeout(1500);
    await el.screenshot({ path: `${prefix}-${id}.png` });
  }
  console.log(JSON.stringify({ errs }));
  await b.close();
})();
