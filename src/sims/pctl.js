/* 평균과 백분위: 가끔 튀는 지연이 평균·집계 그래프에서는 얼마나 옅어지는지 보여 준다.
   1분 동안 1초에 20번 잰 지연(틱 시간이나 RTT로 생각)을 만들고, 평균·p50·p99·최댓값과 집계 간격별 평균선을 비교한다. */
K.register('pctl', function (root) {
  const F = K.frame(root, {
    kicker: '관측으로 판정하기 · 숫자 읽는 법',
    title: '평균은 괜찮은데 왜 렉이라고 할까',
    lead: '1초에 20번 잰 지연 값을 1분 동안 모았습니다. 서버 틱 시간이나 유저의 핑이라고 생각하면 됩니다. 가끔 튀는 값은 평균과 긴 간격의 평균 그래프에서는 거의 보이지 않지만, p99와 최댓값에는 그대로 드러납니다.',
    tries: [
      '<b>튀는 비율</b>을 1%에 두고 평균과 p99를 비교해 보세요. 평균은 평소와 비슷한데 p99는 튄 값 근처입니다.',
      '<b>집계 간격</b>을 60초로 바꿔 보세요. 굵은 평균선이 평평해져서 그래프만 보면 아무 일도 없어 보입니다.',
      '<b>튀는 비율</b>을 0으로 내리면 평균·p50·p99가 모두 가까워집니다. 튐이 없을 때만 평균이 믿을 만합니다.',
      '<b>튀는 비율</b>을 5%로 올려 보세요. 이제 평균도 오르지만, 여전히 튄 값보다 훨씬 낮게 보입니다.',
    ],
    layout: 'side',
  });

  const P = { base: 40, rate: 1, spike: 300, agg: 10 };
  const N = 1200, HZ = 20; // 60초 × 초당 20번
  let data = [], stats = {};

  const cv = K.canvas(F.stage, {
    height: w => K.clamp(w * 0.46, 210, 300),
    caption: '1분 동안 잰 지연',
    right: '<span class="legend"><span><i class="dot" style="background:var(--s1)"></i>잰 값</span><span><i class="dot" style="background:var(--s2)"></i>집계 간격 평균</span></span>',
  });

  const g1 = K.group(F.controls, '지연의 모양');
  K.slider(g1, { label: '평소 지연', min: 10, max: 120, step: 5, value: P.base, fmt: v => v + 'ms', onInput: v => { P.base = v; rebuild(); } });
  const sRate = K.slider(g1, { label: '튀는 비율', min: 0, max: 5, step: 0.5, value: P.rate, fmt: v => v + '%', hint: '잰 값 중 몇 %가 튀는지', onInput: v => { P.rate = v; rebuild(); } });
  const sSpike = K.slider(g1, { label: '튄 값의 크기', min: 100, max: 1000, step: 50, value: P.spike, fmt: v => v + 'ms', onInput: v => { P.spike = v; rebuild(); } });
  const g2 = K.group(F.controls, '그래프');
  const cAgg = K.choice(g2, { label: '집계 간격', options: [[1, '1초'], [10, '10초'], [60, '60초']], value: P.agg, onChange: v => { P.agg = +v; draw(); talk(); } });

  const stAvg = K.stat(F.stats, { label: '평균' });
  const stP50 = K.stat(F.stats, { label: 'p50(중앙값)' });
  const stP99 = K.stat(F.stats, { label: 'p99' });
  const stMax = K.stat(F.stats, { label: '최댓값' });

  K.presets(F, [
    { label: '1% 튐 (흔한 경우)', apply() { sRate.set(1, false); sSpike.set(300, false); cAgg.set(10, false); Object.assign(P, { rate: 1, spike: 300, agg: 10 }); rebuild(); } },
    { label: '튐 없음', apply() { sRate.set(0, false); Object.assign(P, { rate: 0 }); rebuild(); } },
    { label: '5% 튐', apply() { sRate.set(5, false); Object.assign(P, { rate: 5 }); rebuild(); } },
    { label: '1분 평균 그래프', apply() { cAgg.set(60, false); P.agg = 60; draw(); talk(); } },
  ]).buttons[0].setAttribute('aria-pressed', 'true');

  const pct = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  function rebuild() {
    const r = K.rng(7);
    data = Array.from({ length: N }, () => {
      const jitter = (r() + r() + r() - 1.5) * P.base * 0.12;       // 평소의 작은 흔들림
      const spike = r() < P.rate / 100 ? P.spike * (0.7 + 0.6 * r()) : 0;
      return Math.max(1, P.base + jitter + spike);
    });
    const s = data.slice().sort((a, b) => a - b);
    stats = { avg: data.reduce((a, b) => a + b, 0) / N, p50: pct(s, 0.5), p99: pct(s, 0.99), max: s[N - 1] };
    draw(); talk();
  }

  function agg() {
    const n = P.agg * HZ, out = [];
    for (let i = 0; i < N; i += n) {
      const part = data.slice(i, i + n);
      const m = part.reduce((a, b) => a + b, 0) / part.length;
      out.push([i / HZ, m], [(i + part.length) / HZ, m]);
    }
    return out;
  }

  function draw() {
    const { ctx, w, h } = cv;
    ctx.clearRect(0, 0, w, h);
    const C = K.C;
    const yMax = Math.max(P.base * 2, stats.max * 1.08);
    const box = { x: 48, y: 14, w: w - 60, h: h - 48 };
    const step = [25, 50, 100, 200, 250, 500].find(s => yMax / s <= 5) || 500;
    const yTicks = Array.from({ length: Math.floor(yMax / step) + 1 }, (_, i) => i * step);
    const sc = K.plot(ctx, box, { x0: 0, x1: 60, y0: 0, y1: yMax, xTicks: [0, 10, 20, 30, 40, 50, 60], xFmt: v => v + '초', yTicks, yFmt: v => v + 'ms' });
    K.line(ctx, sc, data.map((v, i) => [i / HZ, v]), K.alpha(C.s1, 0.75), 1);
    K.line(ctx, sc, agg(), C.s2, 3);
    const mark = (v, label, color) => {
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(box.x, sc.y(v)); ctx.lineTo(box.x + box.w, sc.y(v)); ctx.stroke(); ctx.restore();
      K.text(ctx, label, box.x + box.w - 4, sc.y(v) - 5, { size: 11, weight: 600, color: C.ink2, align: 'right' });
    };
    if (stats.p99 - stats.avg > yMax * 0.08) mark(stats.p99, 'p99 ' + K.ms(stats.p99), C.ink2);
    mark(stats.avg, '평균 ' + K.ms(stats.avg), C.ink2);
  }

  K.hover(cv, x => {
    const box = { x: 48, w: cv.w - 60 };
    const t = (x - box.x) / box.w * 60;
    if (t < 0 || t > 60) return null;
    const i = Math.min(N - 1, Math.round(t * HZ));
    const a = agg().find(([s], j, arr) => j % 2 === 0 && t >= s && t <= arr[j + 1][0]);
    return `${K.n(t, 1)}초: 잰 값 <b>${K.ms(data[i])}</b>${a ? `<br>${P.agg}초 평균 <b>${K.ms(a[1])}</b>` : ''}`;
  });

  function talk() {
    const { avg, p50, p99, max } = stats;
    stAvg.set(K.ms(avg), avg > P.base * 1.5 ? 'warn' : 'good');
    stP50.set(K.ms(p50), 'good');
    stP99.set(K.ms(p99), p99 > P.base * 3 ? 'bad' : p99 > P.base * 1.5 ? 'warn' : 'good');
    stMax.set(K.ms(max), max > P.base * 3 ? 'bad' : 'good');
    if (!P.rate) {
      F.say(`${K.flag('good')}튀는 값이 없어 평균 <b>${K.ms(avg)}</b>, p50 <b>${K.ms(p50)}</b>, p99 <b>${K.ms(p99)}</b>가 모두 비슷합니다. 이럴 때만 평균 하나로 판단해도 됩니다.`);
      return;
    }
    const every = 100 / (P.rate * HZ); // 초당 20번 중 rate%가 튀면 몇 초에 한 번인지
    const everyTxt = every >= 1 ? `약 ${K.n(every, Math.abs(every - Math.round(every)) < 0.05 ? 0 : 1)}초에 한 번` : `1초에 ${K.n(1 / every, 0)}번쯤`;
    F.say(`${K.flag(p99 > P.base * 3 ? 'bad' : 'warn')}평균은 <b>${K.ms(avg)}</b>로 평소(${P.base}ms)보다 조금 높을 뿐이지만, p99는 <b>${K.ms(p99)}</b>, 최댓값은 <b>${K.ms(max)}</b>입니다. 1초에 20번 재는 값 중 ${P.rate}%가 튀면 ${everyTxt} 멈칫하는 셈이고, 유저는 이 순간을 렉으로 기억합니다. ${P.agg}초 평균선(굵은 선)에서는 튄 값이 ${P.agg * HZ}개 값에 섞여 ${P.agg >= 10 ? '거의 보이지 않습니다' : '조금 드러납니다'}.`);
  }

  cv.onResize(draw);
  K.onTheme(draw);
  rebuild();
});
