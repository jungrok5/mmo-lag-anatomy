// 배포 뒤 검색엔진에 바뀐 주소를 알린다(IndexNow: Bing, Naver, Yandex, Seznam 등이 함께 받음).
//   node tools/indexnow.cjs [사이트 폴더]   (기본 build/site. 그 폴더의 sitemap.xml 주소를 보낸다)
// 키는 src/site/<32자리 16진수>.txt에 있고, 사이트에 함께 배포되어 이 사이트의 주인임을 증명한다.
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SITE = require(path.join(ROOT, 'package.json')).homepage.replace(/\/?$/, '/');
const keyFile = fs.readdirSync(path.join(ROOT, 'src/site')).find(f => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) { console.error('IndexNow 키 파일이 없습니다(src/site/<키>.txt)'); process.exit(1); }
const key = keyFile.slice(0, -4);
const sitemap = fs.readFileSync(path.join(path.resolve(process.argv[2] || path.join(ROOT, 'build/site')), 'sitemap.xml'), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  // 배포 직후에는 키 파일이 아직 공개 주소에 안 보일 수 있다. 보일 때까지 기다린다(최대 약 3분)
  for (let i = 0; i < 18; i++) {
    try { const r = await fetch(SITE + keyFile, { cache: 'no-store' }); if (r.ok && (await r.text()).trim() === key) break; } catch (e) { /* 다시 시도 */ }
    await sleep(10000);
  }
  // 검색엔진 쪽이 키를 아직 못 읽으면 403이 온다. 잠시 뒤 두 번 더 시도한다
  let res;
  for (let i = 0; i < 3; i++) {
    res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: SITE + keyFile, urlList }),
    });
    console.log(`IndexNow: 주소 ${urlList.length}개 → ${res.status} ${res.statusText}`);
    if (res.status !== 403) break;
    await sleep(30000);
  }
  if (res.status >= 400) process.exit(1);
})();
