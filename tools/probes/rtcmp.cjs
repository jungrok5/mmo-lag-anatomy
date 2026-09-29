// usage: python3 build.py --only retrans && node tools/probes/rtcmp.cjs <presetIdx> <toggle substrings comma-separated or ->  <seconds>
const { chromium } = require('../pw.cjs');
const [idx, tg, secs] = [+process.argv[2], process.argv[3], +(process.argv[4] || 20)];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 1800 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('file://' + process.cwd() + '/build/sandbox-retrans.html');
  await p.waitForTimeout(600);
  await p.evaluate(([i, tg]) => {
    document.querySelectorAll('.sim-presets .btn')[i].click();
    if (tg !== '-') for (const s of tg.split(',')) {
      const l = Array.from(document.querySelectorAll('.ctl-toggle')).find(l => l.textContent.includes(s));
      l.querySelector('input').click();
    }
  }, [idx, tg]);
  await p.waitForTimeout(secs * 1000);
  const r = await p.evaluate(() => Array.from(document.querySelectorAll('.stat')).map(s => s.querySelector('.stat-label span').textContent.slice(0,6) + '=' + s.querySelector('.stat-val').innerText).join(' / ') + ' || ' + Array.from(document.querySelectorAll('.rt-bar b')).map(x => x.innerText).join(','));
  console.log(`[${idx} ${tg}] ` + r);
  await b.close();
})();
