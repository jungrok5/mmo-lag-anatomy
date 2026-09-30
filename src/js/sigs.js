/* =========================================================================
   sigs.js — 원인 카드의 “그래프에서는” 작은 그림(그래프 모양 13가지)
   모양의 뜻은 data.js의 sigs, 작성 규칙은 docs/CHECKS_GUIDE.md.
   브라우저(app.js)와 배포 도구(tools/site.cjs)가 함께 쓴다.
   ========================================================================= */
window.SIGDRAW = (function () {
  const W = 120, H = 36, P = 3;
  const X = x => (P + x * (W - 2 * P)).toFixed(1);
  const Y = y => (H - P - y * (H - 2 * P)).toFixed(1);
  const path = pts => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]) + ' ' + Y(p[1])).join('');
  const fn = (f, n = 60) => Array.from({ length: n + 1 }, (_, i) => [i / n, f(i / n)]);
  // 바닥선 위에 좁은 삼각형 뾰족점을 세운다: [[위치, 높이], …]
  const spikes = (xs, base = 0.22, w = 0.025) => fn(x => {
    let y = base;
    xs.forEach(([c, h]) => { const d = Math.abs(x - c); if (d < w) y = Math.max(y, base + (h - base) * (1 - d / w)); });
    return y;
  }, 240);
  const wob = (y, a, f) => x => y + a * Math.sin(x * f);
  // main: 주 지표(강조색), subs: 비교선(점선), ref: 평소 수준(옅은 점선)
  const S = {
    periodic: { main: spikes([[0.14, 0.92], [0.38, 0.92], [0.62, 0.92], [0.86, 0.92]]) },
    random: { main: spikes([[0.1, 0.7], [0.27, 0.95], [0.33, 0.5], [0.58, 0.85], [0.83, 0.6], [0.9, 0.95]]) },
    step: { main: [[0, 0.25], [0.46, 0.25], [0.5, 0.72], [1, 0.72]], ref: [[0, 0.25], [1, 0.25]] },
    ramp: { main: fn(x => 0.16 + 0.64 * x + 0.03 * Math.sin(x * 40)) },
    sawtooth: { main: [[0, 0.2], [0.3, 0.76], [0.31, 0.2], [0.63, 0.76], [0.64, 0.2], [0.96, 0.76], [0.97, 0.2], [1, 0.24]] },
    peak: { main: fn(x => 0.22 + 0.64 * Math.exp(-Math.pow((x - 0.68) / 0.12, 2))) },
    load: { main: fn(x => 0.14 + 0.82 * x * x), subs: [fn(x => 0.14 + 0.46 * x)] },
    ceiling: { main: fn(x => Math.min(0.72, 0.14 + 1.3 * x)), subs: [fn(x => (x < 0.45 ? 0.08 : 0.08 + 1.5 * (x - 0.45)))] },
    high: { main: fn(wob(0.74, 0.025, 23)), ref: [[0, 0.22], [1, 0.22]] },
    outlier: { main: fn(wob(0.8, 0.025, 13)), subs: [fn(wob(0.16, 0.012, 7)), fn(wob(0.27, 0.012, 9)), fn(wob(0.38, 0.012, 11))] },
    gap: { main: [[0, 0.5], [0.38, 0.5], [0.4, 0.04], [0.58, 0.04], [0.6, 0.98], [0.64, 0.5], [1, 0.5]] },
    drop: { main: [[0, 0.82], [0.5, 0.82], [0.52, 0.16], [0.75, 0.44], [1, 0.7]] },
    surge: { main: fn(x => (x < 0.3 ? 0.14 : 0.14 + 0.82 * Math.exp(-(x - 0.3) * 7)), 120) },
  };
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return function (k, label) {
    const s = S[k];
    if (!s) return '';
    const ref = s.ref ? `<path d="${path(s.ref)}" class="sg-ref"/>` : '';
    const subs = (s.subs || []).map(p => `<path d="${path(p)}" class="sg-sub"/>`).join('');
    return `<svg class="sg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}">${ref}${subs}<path d="${path(s.main)}" class="sg-main"/></svg>`;
  };
})();
