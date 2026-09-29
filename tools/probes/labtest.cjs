const { chromium } = require('../pw.cjs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 2400 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('file://' + process.cwd() + '/build/sandbox-lab.html');
  await p.waitForTimeout(800);
  for (const id of ['stutter','teleport','burst','rubber','slowmo','delay','freeze','disconnect']) {
    await p.evaluate(i => K.emit('lab:preset', i), id);
    await p.waitForTimeout(7000);
    const r = await p.evaluate(() => ({ say: document.querySelector('.sim-say').innerText, log: document.querySelector('.log').innerText.split('\n').slice(0, 12).join(' | '), stats: Array.from(document.querySelectorAll('.stat')).map(s => s.innerText.replace(/\n/g,' ')).join(' / ') }));
    console.log('=== ' + id + '\n' + r.say + '\nLOG: ' + r.log + '\nSTATS: ' + r.stats + '\n');
    await p.screenshot({ path: 'build/lab-' + id + '.png', clip: { x: 0, y: 0, width: 1280, height: 1150 } });
  }
  await b.close();
})();
