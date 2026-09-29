const { chromium } = require('../pw.cjs');
const idx = +process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 1800 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('file://' + process.cwd() + '/build/sandbox-retrans.html');
  await p.waitForTimeout(600);
  await p.evaluate(i => document.querySelectorAll('.sim-presets .btn')[i].click(), idx);
  for (let s = 3; s <= 24; s += 3) {
    await p.waitForTimeout(3000);
    const r = await p.evaluate(() => Array.from(document.querySelectorAll('.stat')).map(s => s.querySelector('.stat-label span').textContent.slice(0,6) + '=' + s.querySelector('.stat-val').innerText).join(' / ') + ' || ' + Array.from(document.querySelectorAll('.rt-bar b')).map(x => x.innerText).join(','));
    console.log(s + 's: ' + r);
  }
  await b.close();
})();
