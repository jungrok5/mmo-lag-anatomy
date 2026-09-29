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
(async () => {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: SITE + keyFile, urlList }),
  });
  console.log(`IndexNow: 주소 ${urlList.length}개 → ${res.status} ${res.statusText}`);
  if (res.status >= 400) process.exit(1);
})();
