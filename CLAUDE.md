# CLAUDE.md

게임 렉 백서는 온라인 게임의 렉 원인을 13개 층과 3개 주제(동기화 설계, 일부에게만 생기는 문제, TCP 재전송)로 나눠 설명하는 백과다. MMO 사례를 중심으로 썼지만 대부분은 장르와 상관없이 해당한다. 유저 제보나 장애 기록을 보고 원인과 담당 팀(게임개발팀·인프라팀·외부)을 가려내는 데 쓴다. 결과물은 `index.html` 파일 하나다.

## 질문에 답할 때

- 이 저장소의 데이터를 근거로 답한다.
  - 원인: `src/js/causes-*.js` (228개)
  - 증상·네 가지 요인·담당 코드·누가/언제 값: `src/js/data.js`
  - 용어: `src/js/glossary.js`
  - 장 본문과 표: `src/body.html`
  - 장별 출처: `src/js/refs-*.js`
  - 공개 장애 사례와 상황별 절차(패치 이후 렉, 해외 국가 추가): `src/js/cases.js`
- 원인을 말할 때는 원인 ID와 이름을 함께 쓴다. 예: `mem-gc` 서버 GC 전체 멈춤. 링크를 줄 때는 공개 사이트(`package.json`의 `homepage`) 기준으로, 원인은 `c/<ID>.html`(원인별 페이지) 또는 `#c-<ID>`(원본 카드), 증상은 `s/<ID>.html`, 사례는 `#case-<ID>`, 절차는 `#pb-<ID>`를 쓴다. 전체 형식은 `README.md`의 “링크로 공유하기”에 있다.
- 증상으로 물으면 사이트의 진단 도우미(`src/js/app.js`의 `triage`)와 같은 방식으로 좁힌다.
  1. 증상 이름을 `data.js`의 `symptoms` id로 바꾼다.
  2. `sym`에 그 id가 있는 원인을 모은다.
  3. `who`(누가 겪나: 나만, 특정 지역·통신사, 서버 전체 …)와 `when`(언제: 저녁 피크, 접속 직후, 일정한 주기 …)으로 순위를 매긴다. “누가”가 가장 강한 단서다. 각 목록의 첫 값이 그 원인의 대표 특징이다.
- 담당을 물으면 `own[0]`이 주 담당(근본 원인을 없애는 곳)이고 나머지는 함께 할 일이 있는 곳이다. 팀별 할 일은 `act.game`·`act.infra`·`act.ext`에 있다. 경계가 애매하면 `docs/OWNERS_GUIDE.md`의 규칙을 따른다.
- 장애 기록·티켓과 대조할 때:
  1. 기록에서 다섯 가지를 뽑는다: 증상, 범위(한 명·지역·채널·서버 전체), 시간 패턴, 직전 변경(패치·배포·설정 변경·국가 추가), 이미 본 지표.
  2. 위 방식으로 후보 원인을 2~5개 고른다.
  3. 후보마다 원인 ID, 주 담당, 확인할 지표·로그, 그 지표가 어떻게 보이면 맞는지를 적는다. 원인의 `chk`(확인할 곳·맞음·아님·확인 수단)와 `sig`(그래프 모양)를 쓴다. 판정 순서(범위 → 시점 → 계층)와 신호표는 사이트의 “관측으로 판정하기” 장과 `docs/OBSERVABILITY_PLAN.md`를 따른다. 패치 뒤나 새 국가를 연 뒤의 기록이면 `cases.js`의 절차(`playbooks`)를 함께 본다.
  4. 기록에 없는 사실로 추정한 부분은 추정이라고 밝힌다.
- 수치·기본값·버전은 원인의 `num`·`more`와 출처(`ref`)에 있는 것을 쓴다. 백서에 없는 수치를 말할 때는 공신력 있는 출처를 대거나 일반적인 값이라고 밝힌다.
- 한국어로, `docs/TERMS.md`의 통용 용어로 답한다.

## 원인 항목 필드

| 필드 | 뜻 |
|---|---|
| `id` | 원인 ID. 장애 기록·티켓·문서의 링크가 이 값으로 원인을 가리키므로 한번 정하면 바꾸거나 지우지 않는다 |
| `layer` | 층 id (`data.js`의 `layers`·`extraLayers`) |
| `t` / `en` | 이름 / 영문 이름 |
| `s` | 한 줄 요약 |
| `c` | [왜, 그러면, 화면에서는] |
| `sym` | 증상 id 목록 (`data.js`의 `symptoms`) |
| `fx` | 네 가지 요인: `lat` 지연, `jit` 지터, `loss` 손실, `stall` 정체 |
| `who` / `when` | 누가 겪나 / 언제 생기나 (`data.js`의 `who`·`when`) |
| `num` | 수치 감각 |
| `more` | 더 알아보기 |
| `sim` | 관련 실험 id (`src/sims/<id>.js`) |
| `sig` | 그래프 모양 `{ k: 모양 id(data.js의 sigs), g: 그 모양이 보이는 그래프 }` |
| `chk` | 확인 방법 `{ look: 확인할 곳, yes: 이러면 맞음, no: 이러면 아님, by: 확인 수단 ops·code·user }` |
| `own` | 담당 코드. 첫 항목이 주 담당. 게임개발팀 `cli`·`srv`, 인프라팀 `net`·`sys`·`dba`, 외부 `ext` |
| `act` | 팀별 할 일 `{ game, infra, ext }`. `own`에 있는 팀만 |
| `ref` | 출처 `[{ t: 제목, u: 주소, p: 발행처, n: 무엇의 근거인지 }]` |

## 고칠 때

- 원인 추가·수정은 `src/js/causes-*.js`의 해당 층 목록에서 한다. `index.html`은 빌드 결과라 직접 고치지 않는다.
- 문장 규칙
  - 비전문가가 읽는다고 생각하고 쉬운 말로 쓴다.
  - 비유 대신 통용 용어를 쓴다(`docs/TERMS.md`).
  - 증상은 `data.js`의 증상 이름 그대로 쓴다(뚝뚝 끊김, 순간이동, 고무줄, 몰아치기, 슬로우모션, 입력 지연, 멈춤, 씹힘·롤백, 접속 끊김, 접속 불가·무한 로딩, 안 보임·유령 개체).
  - 문장 가운데에 대시(—)로 설명을 끼워 넣지 않는다.
  - “A가 아니라 B” 꼴의 문장을 쓰지 않는다.
  - 번역투(~에 있어, ~에 의해, ~을 가지고 있다 …), 분열문(“문제는 ~입니다”), 수사 의문·대구, 한 문자열 안의 “~다.”·“~니다.” 섞기, 연결어미 바로 뒤 쉼표를 피한다. 규칙과 근거는 `docs/KO_STYLE.md`, 검사는 `node tools/ko-style.cjs`(오류 0).
- 담당은 `docs/OWNERS_GUIDE.md`를 따른다.
- 그래프 모양·확인 방법은 `docs/CHECKS_GUIDE.md`를 따른다. 특정 조직의 지표·도구 이름은 쓰지 않는다.
- 출처는 `docs/SOURCES_GUIDE.md`를 따른다. 공신력 있는 자료만 쓰고 직접 열어 그 문장을 뒷받침하는지 확인한 것만 넣는다.
- 고친 뒤 확인
  - `npm test`: 빌드, 데이터 검사, 1280px·390px 다크 화면 점검. `node tools/validate.cjs`의 `probs`는 `[]`여야 한다.
  - 출처를 바꿨으면 `npm run links`로 주소를 점검한다.

## 번역

- 한국어가 원문이다. 번역은 `src/i18n/<언어>/*.json`에 있고 규칙은 `docs/I18N_GUIDE.md`, 언어별 용어는 `docs/i18n/<언어>.md`.
- 화면에 나오는 한국어 글자(코드 안)는 모두 TR`…`로 감싼다. `node tools/i18n-wrap.cjs --check`가 빠진 곳을 찾는다.
- 한국어 문장을 고치면 `node tools/i18n.cjs sync`를 돌린다. 바뀐 항목은 번역이 빈 칸이 되고(그동안 그 자리는 한국어로 보인다) 옛 번역은 `stale`에 남는다. 번역을 채운 뒤 `node tools/i18n.cjs check`.
- 뜻은 그대로 두고 문체만 다듬었으면 `node tools/i18n.cjs restore`로 옛 번역을 되살린다(같은 자리에서 원문이 가장 비슷한 stale). 뜻이 바뀐 항목은 새로 번역한다.
- 원인 ID·장·절 ID는 언어마다 같다. 번역판 주소는 `/<언어 폴더>/`(예: `/en/c/mem-gc.html`).

## 명령

```bash
npm test              # 빌드 + 데이터 검사 + 화면 점검
python3 build.py      # index.html 만들기 (글꼴까지 넣은 파일 하나)
npm run validate      # 원인 데이터 검사
node tools/ko-style.cjs   # 한국어 문체 검사(번역투·기계 문체, docs/KO_STYLE.md)
npm run links         # 출처 주소 점검 (실패한 주소만 출력)
npm run export        # build/lag-anatomy.md, build/lag-anatomy.json (Claude 프로젝트 업로드·다른 도구용)
npm run site          # 배포본을 build/site/에 만들기(언어마다 원인·증상별 페이지, 텍스트 판, llms.txt / sitemap.xml)
python3 build.py --lang en   # 번역판 한 언어(build/i18n/en/index.html)
npm run i18n          # 언어·묶음별 번역률
```

폴더 구조와 장 목록은 `README.md`에 있다.
