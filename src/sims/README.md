# 시뮬레이션 작성 규칙

`src/sims/<id>.js` 한 파일이 시뮬레이션 하나다. 파일은 빌드 때 이름순으로 이어 붙여지고,
본문의 `<div class="sim" data-sim="<id>"></div>` 자리에 올라간다.

## 뼈대

```js
K.register('<id>', function (root) {
  const F = K.frame(root, {
    kicker: '레이어 · 집 네트워크',          // 어느 장/레이어 소속인지
    title: '보이는 현상을 한 문장으로',        // 주장형 제목
    lead: '비전문가가 읽는 2~3문장 설명',
    tries: ['<b>무엇</b>을 해 보세요. 그러면 …', ...],   // 3~5개
    layout: 'side',                             // 'side' = 오른쪽 조작 패널, 'stack' = 아래 격자
  });
  // 1) 상태·파라미터 객체 P
  // 2) 캔버스: K.canvas(F.stage, {height: w => ..., caption, right})
  // 3) 조작부: K.group(F.controls, '묶음 제목') 안에 K.slider / K.toggle / K.choice / K.button
  // 4) 프리셋: K.presets(F, [{label, apply(){ 슬라이더.set(값) ... }}])
  // 5) 수치 타일: K.stat(F.stats, {label, unit}) → .set(text, 'good'|'warn'|'bad')
  // 6) 마운트 직후 몇 초 미리 돌려 차트를 채운다 (첫 화면이 비어 있으면 안 된다)
  // 7) K.loop(root, (dt, now) => { step(dt); draw(); F.say(해설) })
});
```

API 전체는 `src/js/kit.js` 맨 위 주석에 있다. `src/sims/queue.js` 가 기준 예시다.

## 원칙

- **글**: 모든 보이는 글은 한국어. 서버 프로그래머가 아닌 기획·아트·QA·PM이 읽는다.
  전문 용어는 처음 나올 때 쉬운 말을 붙인다: `지터(도착 간격의 흔들림)`.
  짧고 능동적인 문장. 이모지 금지. 줄표(—)로 끼워 넣는 말투, “A가 아니라 B” 식 반전 문장은 피한다.
- **증상 이름**을 해설에서 일관되게 쓴다:
  뚝뚝 끊김 · 순간이동 · 고무줄 · 몰아치기 · 슬로우모션 · 입력 지연 · 멈춤 · 씹힘·롤백 · 접속 끊김 · 접속 불가·무한 로딩
- **해설(F.say)**: 지금 화면에서 벌어지는 일을 “원인 → 결과 → 플레이어가 보는 것” 순서로 매 프레임 갱신한다.
  앞에 `K.flag('good'|'warn'|'bad')` 를 붙인다. 숫자는 실제 값으로.
- **수치는 현실적으로**: 실제 서비스에서 흔한 값과 기본값(리눅스 RTO 최소 200ms, 윈도우 지연 ACK 200ms 등)을 쓴다.
- **색**: `K.C.*` 토큰만 쓴다(테마 전환 자동 반영). 계열 구분은 `s1…s8` 을 순서대로(건너뛰기·재배열 금지),
  상태는 `good/warn/bad` 만. 글자에는 계열 색을 쓰지 않는다(`ink/ink2/muted`). 색만으로 의미를 전하지 말고 모양·글자도 붙인다.
- **차트**: 선 2px, 격자 1px 실선, 막대 끝 4px 라운드, 점은 표면색 고리. 주요 차트에는 `K.hover` 로 정확한 값 툴팁.
  두 개의 y축 금지. 범례는 `caption` 오른쪽에 `<span class="legend">…</span>` 로.
- **반응형**: 360px 폭에서도 글자가 겹치거나 잘리지 않아야 한다. 캔버스 높이는 `height: w => ...` 로 폭에 맞춘다.
  좁을 때는 라벨을 줄이거나 생략한다. 페이지 가로 스크롤 금지.
- **성능**: 프레임당 수 ms 이내. 기록 배열은 길이를 제한한다. 난수는 `K.rng(seed)`.
- **공용 파일 수정 금지**: `kit.js`, `style.css`, `body.html` 은 고치지 않는다. 전용 CSS 가 필요하면 `K.addStyle('<id>', css)`.
- **다른 전역 금지**: 모든 코드는 `K.register` 콜백 안에 둔다.

## 시험

```bash
python3 build.py --only <id>
node tools/check.cjs build/sandbox-<id>.html build/<id>.png 1200
node tools/check.cjs build/sandbox-<id>.html build/<id>-m.png 390 --dark
```

`errors` 가 비어 있고 `horizontalOverflowPx` 가 0 이어야 한다. 스크린샷을 직접 열어 겹침·잘림을 확인한다.
