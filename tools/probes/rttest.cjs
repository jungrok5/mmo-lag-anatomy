const { chromium } = require('../pw.cjs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 1800 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('file://' + process.cwd() + '/build/sandbox-retrans.html');
  await p.waitForTimeout(600);
  const n = await p.evaluate(() => document.querySelectorAll('.sim-presets .btn').length);
  for (let i = 0; i < n; i++) {
    const label = await p.evaluate(i => { const b = document.querySelectorAll('.sim-presets .btn')[i]; b.click(); return b.textContent; }, i);
    await p.waitForTimeout(6000);
    const r = await p.evaluate(() => ({ say: document.querySelector('.sim-say').innerText.slice(0, 230), stats: Array.from(document.querySelectorAll('.stat')).map(s => s.querySelector('.stat-label span').textContent + '=' + s.querySelector('.stat-val').innerText).join(' / '), bars: Array.from(document.querySelectorAll('.rt-bar')).map(x => x.innerText.replace(/\n/g, ' ')).join(' | ') }));
    console.log('=== ' + label + '\n' + r.stats + '\n' + r.bars + '\n' + r.say + '\n');
    if (i === 1 || i === 4) await p.screenshot({ path: 'build/rt-' + i + '.png', clip: { x: 0, y: 0, width: 1280, height: 1250 } });
  }
  await b.close();
})();
