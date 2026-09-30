# 출처 작성 규칙

백서의 수치·기본값·동작 설명마다 근거를 붙인다. 원인 카드는 각 항목의 `ref`, 장(본문·표·시뮬레이션)은 `src/js/refs-*.js`의 `DATA.secRefs`에 넣는다. 둘 다 사이트의 원인 카드 “출처”, 장 끝 “이 장의 출처”, 맨 뒤 “참고 문헌”에 자동으로 나온다.

## 형식

```js
// 원인 항목: 객체의 마지막 필드로
ref: [
  { t: 'RFC 6298: Computing TCP\'s Retransmission Timer', u: 'https://www.rfc-editor.org/rfc/rfc6298', p: 'IETF', n: 'RTO 계산식, 최소 1초 권고' },
],

// 장별 출처: src/js/refs-<영역>.js
Object.assign(DATA.secRefs, {
  'l-socket': [ { t: '…', u: 'https://…', p: '…', n: '…' } ],
});
```

- `t`: 자료의 원래 제목(원문 언어 그대로).
- `u`: `https://` 로 시작하는 정식 주소. 버전이 있는 문서는 가능하면 안정적인 주소(RFC는 `rfc-editor.org/rfc/rfcNNNN`, 커널 문서는 `docs.kernel.org`).
- `p`: 발행처. 아래 표기를 그대로 쓴다.
- `n`: 이 자료가 무엇의 근거인지 한국어로 짧게(예: “RTO 최소 200ms·최대 120초”).

## 공신력 있는 자료만

- **쓴다**
  - 표준: IETF RFC, IEEE
  - 공식 문서: 리눅스 커널 문서와 소스, man-pages, Microsoft Learn, Apple·Android 개발자 문서와 AOSP, AWS·Azure·Google Cloud 문서, Unity·Unreal 문서, OpenJDK JEP, .NET·Go 문서, MySQL·PostgreSQL·Redis·SQL Server 문서
  - 논문·학회: ACM, USENIX, IEEE, SIGCOMM
  - 원저자·원개발사의 발표와 기술 글: GDC Vault, Netdev, Valve Developer Community, Riot·Blizzard·Bungie 기술 글, Google의 BBR 자료, Cloudflare 기술 블로그
  - 측정 기관: RIPE NCC, APNIC, Bufferbloat 프로젝트
  - 예외: Gaffer On Games(Glenn Fiedler)는 개인 사이트지만 게임 네트워크 분야에서 표준처럼 인용되는 원저자 글이라 쓴다.
- **쓰지 않는다**: 개인 블로그, Medium, 요약·SEO 사이트, Q&A 사이트, 위키백과(1차 자료를 찾아 대신 쓴다).

## 확인

- 직접 열어서, 그 자료가 해당 문장을 실제로 뒷받침하는지 확인한 것만 넣는다.
- 공신력 있는 자료로 뒷받침할 수 없는 문장은 조건을 붙이거나 표현을 누그러뜨린다.
- 주소 점검: `npm run links` (= `python3 tools/linkcheck.py`, 실패한 주소만 출력). 사이트마다 막는 User-Agent가 달라 여러 값으로 차례로 열어 본다. 데이터 검사: `node tools/validate.cjs`.
- 자동 접근을 막는 곳은 같은 내용의 공식 사본을 쓴다.
  - ACM Digital Library: 학회·기관·저자가 공개한 논문 사본 주소, 발행처는 `ACM`.
  - github.com: `raw.githubusercontent.com` 주소.
  - 커널 소스: 태그를 고정한 `git.kernel.org/.../tree/...?h=v6.12` 주소. 문서는 `docs.kernel.org`.
  - 봇 차단이 걸린 곳(Valve Developer Community 등)은 우회하지 않고 다른 1차 자료를 찾는다.

## 발행처 표기

IETF · IEEE · ITU · Linux kernel · Linux man-pages · Microsoft · Apple · Android (Google) · AWS · Microsoft Azure · Google Cloud · Unity · Epic Games · Valve · Riot Games · Blizzard · Bungie · CCP Games · Square Enix · id Software · GDC · Game Developer · Gaffer On Games · OpenJDK · Oracle · MySQL · PostgreSQL · Redis · Microsoft SQL Server · Go · .NET · Kubernetes · Cloudflare · Google · Meta · Netflix · Bufferbloat.net · RIPE NCC · APNIC · ACM · USENIX · VLDB Endowment · Netdev · Wireshark · NVIDIA · AMD · Intel · Mellanox (NVIDIA) · MaxMind · 기타 원개발사는 그 회사 이름.

man7.org에 있어도 man-pages 프로젝트가 아닌 페이지는 그 페이지 COLOPHON에 적힌 프로젝트 이름을 쓴다(ethtool, iproute2, systemd, procps-ng, util-linux, netfilter 등).
