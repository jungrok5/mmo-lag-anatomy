const { chromium } = require('../pw.cjs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/font|net::/.test(m.text())) errs.push(m.text()); });
  await p.goto('file://' + process.cwd() + '/index.html');
  await p.evaluate(() => document.querySelector('#owners').scrollIntoView());
  await p.waitForTimeout(800);
  const stats = await p.evaluate(() => [...document.querySelectorAll('#sim-owners .stat')].map(s => s.innerText.replace(/\n/g, ' ')).join(' | '));
  console.log('STATS', stats);
  console.log('HEAD1', await p.evaluate(() => document.querySelector('#sim-owners .own-list-head').innerText));
  // infra team, include shared
  await p.evaluate(() => { const l = [...document.querySelectorAll('#sim-owners .seg label')].find(x => x.textContent === '인프라팀'); l.click(); });
  await p.evaluate(() => { const l = [...document.querySelectorAll('#sim-owners .seg label')].find(x => x.textContent === '함께 대응 포함'); l.click(); });
  console.log('HEAD2', await p.evaluate(() => document.querySelector('#sim-owners .own-list-head').innerText));
  // click the DB x DB장비 cell
  await p.evaluate(() => document.querySelector('#sim-owners button[data-l="db"][data-o="dba"]').click());
  console.log('HEAD3', await p.evaluate(() => document.querySelector('#sim-owners .own-list-head').innerText));
  console.log('ITEM', await p.evaluate(() => document.querySelector('#sim-owners .own-list li').innerText.slice(0, 200)));
  await p.evaluate(() => document.querySelector('#sim-owners [data-clear]').click());
  // triage route line
  await p.evaluate(() => document.querySelector('#triage').scrollIntoView());
  await p.waitForTimeout(300);
  console.log('ROUTE', await p.evaluate(() => (document.querySelector('.tri-route') || {}).innerText));
  console.log('KICK', await p.evaluate(() => document.querySelector('#l-home .own-sum').innerText));
  console.log('SYMSPLIT', await p.evaluate(() => document.querySelector('#s-stutter .team-split').innerText));
  const card = await p.$('#c-db-pool'); await p.evaluate(() => { const d = document.querySelector('#c-db-pool details'); d.open = true; document.querySelector('#c-db-pool').scrollIntoView(); });
  await p.waitForTimeout(300); await card.screenshot({ path: 'build/card-dbpool.png' });
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
