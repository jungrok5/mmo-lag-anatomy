// 빌드된 HTML을 헤드리스 크로미움으로 열어 콘솔 오류를 모으고 스크린샷을 남긴다.
//   NODE_PATH=/opt/node22/lib/node_modules node tools/check.cjs build/sandbox-queue.html [out.png] [width] [--dark] [--full]
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const path = require('node:path');

(async () => {
const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const pos = args.filter(a => !a.startsWith('--'));
const file = path.resolve(pos[0] || 'index.html');
const shot = pos[1] || null;
const width = +(pos[2] || 1280);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const page = await browser.newPage({
  viewport: { width, height: 900 },
  colorScheme: flags.has('--dark') ? 'dark' : 'light',
});
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
await page.goto('file://' + file, { waitUntil: 'load' });
await page.waitForTimeout(2500);
// 스크롤하며 모든 시뮬레이션이 한 번씩 돌게 한다
const h = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < h; y += 700) { await page.evaluate(v => window.scrollTo({ top: v, behavior: 'instant' }), y); await page.waitForTimeout(120); }
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await page.waitForTimeout(400);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (shot) await page.screenshot({ path: shot, fullPage: flags.has('--full') });
console.log(JSON.stringify({ file, errors: errors.filter(e => !/fonts\.g|net::ERR|Failed to load resource/.test(e)), horizontalOverflowPx: overflow }, null, 2));
await browser.close();

})();
