// Playwright 불러오기: npm으로 설치했으면 그것을, 아니면 PW 환경 변수나 원격 개발 환경의 전역 경로를 쓴다.
module.exports = (() => {
  for (const p of ['playwright', process.env.PW, '/opt/node22/lib/node_modules/playwright'].filter(Boolean)) {
    try { return require(p); } catch (e) { /* 다음 후보 */ }
  }
  throw new Error('Playwright를 찾지 못했습니다. `npm install` 뒤 `npx playwright install chromium`을 실행하세요.');
})();
