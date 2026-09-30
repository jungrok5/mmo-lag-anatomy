# English (en): terminology and style guide

Target: US English, read by the global English-speaking game industry. Every translator working on `src/i18n/en/` reads this first and follows it. The general rules (placeholders, HTML tags, what stays untranslated, review) are in `docs/I18N_GUIDE.md`; this file adds the English-specific decisions. When this file and your instinct disagree, follow this file so that ten translators produce one voice.

The Korean source is the truth. Do not add or drop facts, numbers, conditions, commands, IDs, or URLs. Rewrite freely for natural English word order; never follow Korean sentence structure.

## 1. Site name and titles

| Korean | English | Notes |
|---|---|---|
| 게임 렉 백서 | **Game Lag White Paper** | Fixed site name (proper noun, title case). Never “Game Lag Whitepaper”, never “the white paper on game lag” as a name. In running text: “this white paper” |
| 게임 렉 백서: 온라인 게임 렉 원인과 해결 담당 (full title) | Game Lag White Paper: what causes online game lag and who fixes it | Page `<title>` and `og:title` of the main page |
| … \| 게임 렉 백서 | … \| Game Lag White Paper | Suffix of every static page title |
| 백서 | white paper | Lowercase when generic |
| 시청각 백서 | interactive white paper | |
| 텍스트 판 | text edition | |
| 원본 (the interactive site, as opposed to the text edition) | interactive version / interactive site | “Open the interactive card …” |

Headings, page titles, labels, buttons and legends use **sentence case** (“Browse by symptom”, “Where to look”). The only title-case string is the site name.

## 2. Register and voice

- **Audience**: designers, artists, QA and producers first, engineers second. Write like a senior engineer explaining to a smart colleague from another discipline: plain, concrete, confident. Short sentences. No academic hedging, no marketing tone, no jokes.
- **Body prose, card summaries (`s`), `num`, `more`, symptom and factor descriptions, glossary definitions**: the Korean is polite explanatory style (합니다체). Use neutral, friendly expository English in the present tense. Contractions (it’s, don’t, can’t) are fine. Address the player as “you/your” where the Korean says 내/나 (“내 화면” → “your screen”, “내 PC” → “your PC”). Where the Korean speaks as the operator (우리 인프라팀, 우리 계약), use “we/our”.
- **`chk` fields (`look`, `yes`, `no`) and `sig.g`**: the Korean is terse bullet style ending in nouns or bare verb stems (…봄, …함, …쪽). Write terse fragments with no subject and **no final period**, the way an SRE writes a runbook line.
  - look: “Server tick time (p99) and tick-overrun count per zone/channel on one graph with player count. Without tick metrics, per-thread CPU of the game thread from pidstat -t 1”
  - yes: “Tick time goes over budget (50 ms at 20 ticks) when players crowd in, while the game thread sits near 100% CPU”
  - no: “Ticks overrun while game-thread CPU is low: points to waiting (GC pause, locks, blocking calls)”
  - Korean “~쪽” at the end of a `no` line (“… 쪽”) → “points to …” or “more likely …”.
- **`c` (Why → Effect → On screen)**: three fragments, no final period. “One tick (e.g., 50 ms) has more work than its budget” → “Game state meant to update 20 times a second updates only 8 times” → “Slow motion across the zone, sluggish skill response”.
- **`act` (team action items)**: comma-separated imperative phrases ending with one period, exactly like the source. “Cut expensive work per tick, split the tick across threads, spread players across channels, record tick time as a metric.” `ext` items read as “Tell players to …” / “Ask the ISP (or cloud provider) to …”.
- **Cases (`cases.js`)**: the Korean is plain written style (했다체). Use neutral past-tense reporting. Keep company names, product names, dates and times exactly as facts.
- **UI strings (sims, buttons, legends, status lines)**: short, sentence case, no period on labels and buttons; full sentences with periods in explanatory captions.

## 3. Mechanics

### Punctuation
- **No em-dash asides.** Do not insert explanations in the middle of a sentence with “—” (or “–”, or spaced hyphens). Use parentheses, a colon, a comma, or split the sentence. The Korean never uses them either.
- **No “not A but B” sentences.** Avoid “not A but B”, “A, not B”, “rather than A, B”, “It isn’t A. It’s B.” and “instead of A, B” used as a correction. State B directly. If ruling out A is itself a fact in the source, put it in its own plain statement (“The network is fine.”) or as a condition (“If X, suspect Y”).
- **Space before an opening parenthesis.** Korean writes 지터(도착 간격의 흔들림); English writes “jitter (variation in packet arrival times)”. Same for units and abbreviations: “round-trip time (RTT)”.
- **Oxford comma** in lists: “latency, jitter, and packet loss”.
- **Quotes and apostrophes**: curly double quotes “ ” as the source does, and always the curly apostrophe ’ (U+2019) in contractions and possessives: don’t, it’s, player’s, Nagle’s. Straight quotes only inside `<code>`, commands, and HTML attribute syntax (`href="…"`). Periods and commas go inside the closing quote in prose (US), except when the quoted text is an exact UI message, error string, formula, or code.
- **Korean middle dot (·)**: in short labels and names use a slash without spaces for single words (“Wi-Fi/router”, “GC/leaks”) and “ / ” with spaces when either side has several words (“Dropped action / rollback”). In prose, use commas, “and”, or “or”.
- **Arrows** (→, ↔) stay as in the source.
- **Ellipsis**: the single character “…”.
- **“예:”** → “e.g.,” inside parentheses, “for example” in running text. **“등”** → “and so on” or “such as …”; avoid “etc.” in prose.

### Numbers and units
- Values never change. Thousands separator comma, decimal point: `1,500 bytes`, `0.25 s`, `16.7 ms`, `10,000`.
- **Space between number and unit**: `50 ms`, `200 µs`, `1.5 GB`, `6.4 Gbps`, `60 Hz`, `60 FPS`, `1,460 bytes`. No space before `%`: `0.1%`. Keep unit symbols as they are (`ms`, `µs`, `ns`, `Gbps`, `MB`, `IOPS`, `PPS`).
- Seconds: `s` after a digit in compact places (tables, `chk`, `num`, labels, parentheses): `0.5 s`, `30 s`. In flowing prose “30 seconds” is also fine. Minutes, hours and days are spelled out: `10 minutes`, `2 hours`.
- Ranges: Korean `~` → en dash, no spaces: `1–5 m`, `0.2–0.5 s`, `80–90%`. With words: “a few to tens of milliseconds”.
- Korean number words: 1만 → `10,000`, 100만 → `1 million`, 수백 → “hundreds of”, 수십 → “tens of” (or “dozens of”), 십여 초 → “ten-odd seconds”, N배 → “N times” (or `N×` in tables). The check tool may then warn “숫자가 다름”; that is expected.
- Adjectival use: “a 20-tick server”, “a 128-tick server”, “a 50 ms tick”, “a 1% loss rate”. `20틱` alone → “20 ticks” or “20-tick”; `20틱 서버` → “20-tick server”.
- Dates: “October 28, 2021”. Times: keep the source’s clock. 24-hour UTC stays 24-hour (“21:52 UTC”); 오전/오후 with a US time zone becomes 12-hour (“11:48 PM PDT”).
- Place and company names: official English forms (Seoul, Tokyo, US West Coast, KT, SK Broadband, LG U+). Keep Korean-specific facts; never swap in US examples.

### Short strings with a number placeholder (plural agreement)
A placeholder like `{0}` can be 1. “{0} causes” then reads “1 causes”. Rules:
- Per-item counts that can be 1 (sources of one cause, matches, selected items): use a count-neutral form. `원인 {0}가지` → `Causes: {0}`; `출처 {0}건` → `Sources ({0})`; `인용 {0}곳` → `Cited by: {0}`; `{0}가지` → `{0}` or `Count: {0}`.
- Site-wide totals and per-symptom or per-layer counts (always well above 1: 228 causes, 14+ per symptom, 9+ per layer, hundreds of sources) may use the natural plural in titles and headings: `{0}: {1} causes and who fixes them`.
- Never write “cause(s)”.

### Capitalization of fixed names
Symptom names, factor names, layer names, who/when values and graph-shape names start with a capital letter when they stand alone as a label, chip, heading, list item, or table cell. Inside a sentence they are lowercase, except proper nouns and acronyms (“slow motion across the zone”, “shows up as stutter or teleporting”). Articles and plurals may inflect in prose (“a freeze”, “frequent disconnects”), but the words stay the same.

## 4. The 11 symptom names (fixed)

Use exactly these words everywhere: data, cards, body, sims, cases, site pages. Aliases are what players type and are listed after the name in the symptom guide (lowercase, comma-separated).

| id | Korean | English name | Aliases (Korean → English) |
|---|---|---|---|
| stutter | 뚝뚝 끊김 | **Stutter** | 버벅임, 끊김, 프레임 드랍 느낌 → choppy, hitching, feels like frame drops |
| teleport | 순간이동 | **Teleporting** | 워프, 텔레포트, 뚝 끊기고 튐 → warping, skipping, freeze then jump |
| rubber | 고무줄 | **Rubber-banding** | 뒤로 당겨짐, 러버밴딩, 위치 롤백 → snapping back, getting pulled back, position rollback |
| burst | 몰아치기 | **Fast-forward** | 파파파팍, 빨리감기, 한꺼번에 처리 → everything at once, speed-up, catch-up |
| slowmo | 슬로우모션 | **Slow motion** | 세계가 느려짐, 전체적으로 굼뜸 → world slows down, everything sluggish |
| delay | 입력 지연 | **Input lag** | 반응이 늦음, 굼뜸, 손맛이 없음 → delayed response, sluggish, mushy controls |
| freeze | 멈춤 | **Freeze** | 얼어붙음, 정지, 응답 없음 → frozen, hang, not responding |
| dropped | 씹힘·롤백 | **Dropped action / rollback** | 스킬 씹힘, 아이템 되돌아감, 거래 실패 → skill didn’t go off, item reverted, failed trade |
| disconnect | 접속 끊김 | **Disconnect** | 튕김, 연결 끊김, 서버와의 연결이 끊어졌습니다 → kicked out, connection lost, “Disconnected from server” |
| noconnect | 접속 불가·무한 로딩 | **Can’t connect / infinite loading** | 로그인 안 됨, 로딩이 끝나지 않음 → can’t log in, stuck on the loading screen |
| invisible | 안 보임·유령 개체 | **Invisible / ghost entities** | NPC가 안 보임, 투명 캐릭터, 이미 죽은 몬스터가 서 있음 → missing NPCs, invisible characters, dead monsters still standing |

Notes:
- “Fast-forward” is the backlog replaying at high speed after a stall (players say “the game fast-forwarded”). Engineers may call the mechanism a catch-up burst; the symptom name stays Fast-forward. “TCP 몰아치기” → “fast-forward on TCP”.
- “Input lag” is the symptom. “Latency” is the factor. Do not mix them.
- “Freeze” is the symptom; “stall” is the factor (정체) and the engineering word for a stopped tick or thread.
- 멈칫 (a single short hitch, not a symptom name) → “hitch”. 짧은 멈춤 → “brief pause”.
- In sentences: “shows up as stutter or teleporting”, “the zone goes into slow motion”, “players rubber-band” (verb form allowed in prose).

## 5. The four factors (fx)

| Korean | English name | `how` line | Notes |
|---|---|---|---|
| 지연 | **Latency** | Packets arrive late | Also the glossary term. Generic 지연 = “latency” (a measure) or “delay” (a specific wait) |
| 지터 | **Jitter** | Packets arrive unevenly | First mention per chapter: “jitter (variation in packet arrival times)” |
| 손실 | **Packet loss** | Packets never arrive | After the first mention in a paragraph, “loss” alone is fine |
| 정체 | **Stall** | Something stopped processing | “the server stalls”, “a stalled tick”. Gloss if needed: “stall (processing stops)” |

요인 → “factor”; 렉의 네 가지 요인 → “the four factors of lag”. 게임의 대처 → “how games cope”. 가리지 못하면 → “when it can’t be hidden”.

## 6. Layers and topics

13 layers (층 → “layer”) and 3 topics (주제 → “topic”). `L1`…`L13` stay.

| id | name | short (nav/badges) | side |
|---|---|---|---|
| client-game | Client game process | Your game | Your side |
| client-os | Client OS and device | Your PC/phone | Your side |
| home | Home network | Wi-Fi/router | Your side |
| isp | Internet path | ISP/overseas | In transit |
| dc-net | Data center network equipment | Firewall/LB | Server side |
| nic | Server network card | NIC | Server side |
| server-os | Server OS (kernel) | Kernel | Server side |
| socket | Sockets and protocols | TCP·UDP (unchanged) | Both ends |
| server-proc | Server game process | Ticks/threads | Server side |
| memory | Memory | GC/leaks | Server side |
| disk | Disk | IOPS | Server side |
| db | Database | DB | Server side |
| infra | Server architecture and operations | Architecture/ops | Server side |
| sync (topic) | Netcode design | Netcode design | Design |
| partial (topic) | Problems only some players hit | Some players only | Scope |
| retrans (topic) | Root causes of TCP retransmission | TCP retransmission | Cause |

동기화 → “netcode” for the design area and “sync”/“synchronization” for the mechanism (“state sync”, “command sync”). 동기화 방식 → “netcode model”.

## 7. Teams and owners

| Korean | English | Notes |
|---|---|---|
| 게임개발팀 | **Game team** | The studio team that owns client and server code. Never “development team” alone |
| 인프라팀 | **Infra team** | Network, servers/OS, database hosts. “infrastructure team” in formal prose is fine |
| 외부 | **External** | Players’ environment, ISPs, cloud providers |
| 클라이언트 개발 (cli) / 클라이언트 | Client development / Client | |
| 서버 개발 (srv) / 서버 | Server development / Server | |
| 네트워크 인프라 (net) / 네트워크 | Network infrastructure / Network | |
| 서버 인프라 (sys) / 서버 장비·OS | Server infrastructure / Servers/OS | |
| DB 인프라 (dba) / DB 장비 | DB infrastructure / DB hosts | |
| 외부 (ext) / 유저·통신사·클라우드 | External / Players/ISPs/cloud | |
| 담당 | owner | 담당 팀 → owning team; 담당 코드 → owner code |
| 주 담당 | primary owner | Label: “Primary owner” |
| 함께 (also involved) | also | Label: “Also” |
| {팀} 할 일 | {team} action items | “Game team action items”, “Infra team action items” |
| 게임개발팀이 할 일 / 인프라팀이 할 일 | Game team action items / Infra team action items | |
| 유저 안내·외부 요청 | Player guidance and external requests | |
| 팀별 대응 / 대응 | Actions by team / Actions | |
| 누가 고치나 | Who fixes it | |
| 넘길 때 챙길 정보 | What to include in a handoff | |

## 8. Who / when values (triage filters)

| key | Korean | English |
|---|---|---|
| who.me | 나만 | Just me |
| who.home | 같은 집 | Same household |
| who.region | 특정 지역·통신사 | Specific region/ISP |
| who.zone | 특정 장소·채널 | Specific zone/channel |
| who.server | 서버 전체 | Whole server |
| who.feature | 특정 기능만 | One feature only |
| who.onechar | 특정 캐릭터만 이상해 보임 | One character looks off |
| who.oneclient | 같은 PC의 한쪽 클라만 | One client on the same PC |
| when.always | 항상 | Always |
| when.peak | 저녁 피크 시간 | Evening peak hours |
| when.event | 사람이 몰릴 때 | When crowds gather |
| when.login | 접속·점검 직후 | Right after login or maintenance |
| when.idle | 가만히 있다가 | After sitting idle |
| when.random | 가끔 무작위로 | Randomly |
| when.periodic | 일정한 주기로 | At regular intervals |
| when.uptime | 오래 켜 둘수록 | The longer it runs |
| when.moving | 이동 중·지역 전환 때 | While moving or changing zones |
| when.action | 특정 행동을 할 때 | During specific actions |

Labels: 누가 겪나 → “Who’s affected”, 누가 → “Who”, 언제 → “When”, 모양 (symptom shape in triage) → “What it looks like”.

## 9. Graph shapes (sigs) and check-by (chkBy)

| id | Korean | English |
|---|---|---|
| periodic | 일정 주기로 튐 | Periodic spikes |
| random | 가끔 무작위로 튐 | Random spikes |
| step | 어느 순간부터 계단처럼 올라감 | Step change |
| ramp | 서서히 오름 | Slow climb |
| sawtooth | 서서히 오르다 뚝 떨어짐 | Sawtooth |
| peak | 특정 시간대에만 높음 | High at certain hours |
| load | 인원·부하를 따라 오름 | Rises with load |
| ceiling | 한도에 닿아 평평해짐 | Hits a ceiling |
| high | 처음부터 늘 높음 | Always high |
| outlier | 일부만 높음 | Outliers only |
| gap | 끊겼다가 몰아서 | Gap then burst |
| drop | 연결이 한꺼번에 끊김 | Mass disconnect |
| surge | 접속·점검 직후 폭증 | Surge after opening |

| by | Korean (data) | English (data) | Short form (ui: 인프라 도구 / 게임 로그·지표 / 유저 쪽) |
|---|---|---|---|
| ops | 인프라 도구로 확인(게임 코드 불필요) | Infra tools (no game code needed) | Infra tools |
| code | 게임 서버·클라이언트의 로그·지표가 필요 | Game server or client logs and metrics | Game logs/metrics |
| user | 유저 쪽 환경에서 확인 | The player’s own environment | Player side |

그래프 모양 → “graph shape”; {0} 모양의 그래프 → “Graph shape: {0}”; 그래프에서는 → “On the graph”; 확인 방법 → “How to confirm”; 확인 수단 → “Check with”.

## 10. Card, page and chapter labels

| Korean | English |
|---|---|
| 원인 (label, table header, side) | Cause |
| 원인 ID | Cause ID |
| 원인 카드 / 원인 항목 | cause card / cause entry |
| 왜 → 그러면 → 화면에서는 | Why → Effect → On screen |
| 증상 / 요인 | Symptoms / Factors |
| 수치 감각 | Ballpark numbers |
| 확인할 곳 / 이러면 맞음 / 이러면 아님 | Where to look / Confirmed if / Ruled out if |
| 더 알아보기 | Learn more |
| 실제 사례 / 실제 장애 사례 | Real incidents / Real-world incidents |
| 무슨 일 / 배울 점 / 관련 원인 / 원문 | What happened / Lessons / Related causes / Original post |
| 출처 / 참고 문헌 / 장별 출처 | Sources / References / Sources by chapter |
| 함께 보면 좋은 원인 | See also |
| 다른 말 | Also called |
| 단서 | Clue |
| 링크 복사 / 복사됨 | Copy link / Copied |
| 관련 장 → | Related chapter → |
| 직접 해보기 / 이렇게 해보세요 / 상황 불러오기 | Try it yourself / Things to try / Load a scenario |
| 좋음 / 주의 / 나쁨 | Good / Caution / Bad |
| 실험 (a sim) / 렉 실험실 | simulation / Lag lab |
| 장 / 절 / 층 / 주제 | chapter / section / layer / topic |
| 목차 | Contents |
| 준비 중입니다. | Coming soon. |

Chapter titles (body `h2`), for consistent cross-references:

| Korean | English |
|---|---|
| 렉은 네 가지 요인으로 만들어진다 | Lag comes from four factors |
| 패킷의 이동 경로: 내 손가락에서 서버의 DB까지 | The packet’s path: from your finger to the server’s database |
| 렉 실험실 | Lag lab |
| 증상 사전 | Symptom guide |
| 같은 핑, 다른 체감: 동기화 방식 | Same ping, different feel: netcode models |
| 한 명만 느릴 때, 한쪽만 이상할 때 | When only one player or one client is affected |
| TCP 재전송: 왜 생기고, 왜 이렇게 느려지나 | TCP retransmission: why it happens and why it hurts so much |
| 게임개발팀이 고칠 것, 인프라팀이 고칠 것 | What the game team fixes, what the infra team fixes |
| 인터넷 회선: 통신사망과 장거리 구간 | Internet path: ISP networks and long-haul links |
| 진단 도우미 | Triage helper |
| 관측으로 판정하기 | Diagnosing from monitoring data |
| 판정 흐름 / 판정 신호표 / 범위 → 시점 → 계층 | Decision flow / Signal table / scope → timing → layer |
| 그래프 모양으로 찾기 | Find causes by graph shape |
| 숫자 읽는 법 | Reading the numbers |
| 사례와 절차 / 상황별 절차 | Incidents and playbooks / Playbooks |
| 패치 이후 렉 / 해외 국가 추가 | Lag after a patch / Launching in a new country |
| 렉 제보 잘하는 법 | How to write a good lag report |
| 용어 사전 | Glossary |
| 증상별로 찾기 / 증상별 원인 | Browse by symptom / Causes by symptom |
| 이 층에서 렉을 만드는 원인 | Causes of lag at this layer |
| 시간 감각 / 숫자 감각 (sim) | Getting a feel for time scales / Latency numbers |

Cause card titles (`t`): translate each Korean title into a natural English incident name in sentence case. The source `en` field (already English) is a good starting point, but the English `t` must carry the meaning of the Korean title, so the card shows two complementary names. When body, sim or case text refers to a card by name, reuse that card’s English `t` from `src/i18n/en/causes-*.json` if it exists; otherwise translate it with this table, and the final consistency pass aligns it.

## 11. Core terminology (Korean → English)

Keep established English terms; gloss once for non-experts where the Korean glosses. `TERMS.md` rows are covered here.

### Game and netcode
| Korean | English | Note |
|---|---|---|
| 렉 | lag | “lag spike” for a momentary jump |
| 핑 / 왕복 시간 | ping / round-trip time (RTT) | 핑이 높다 → high ping; 핑 튐 → ping spike; 게임 안 핑 → in-game ping; 게임 밖에서 잰 핑 → ping measured outside the game |
| 틱 / 틱레이트 / 틱 간격·주기 | tick / tick rate / tick interval | 20틱 서버 → 20-tick server |
| 틱 예산 / 틱 예산 초과 | tick budget / tick overrun | |
| 게임 루프 / 메인 스레드 | game loop / main thread (game thread) | |
| 프레임 / 프레임 타임 / 프레임 드랍 / 프레임 스파이크 | frame / frame time / frame drop / frame spike (hitch) | 한 바퀴 (game loop) → one loop iteration, one frame |
| 스냅샷 / 델타 압축 | snapshot / delta compression | |
| 상태 업데이트 / 게임 상태 | state update / game state | 세계 (what the server simulates) → game state |
| 서버의 실제 상태 | the server’s actual state | |
| 보간 / 보간 버퍼 | interpolation / interpolation buffer | |
| 외삽 | extrapolation (dead reckoning) | |
| 예측 / 클라이언트 예측 | prediction / client-side prediction | |
| 서버 보정 | server reconciliation | |
| 되감기 / 지연 보상 | rewind / lag compensation | |
| 권위 서버 / 서버 권위 / 클라이언트 권위 | authoritative server / server-authoritative / client-authoritative | |
| 요청-응답 | request-response | |
| 상태 동기화+보간 | state sync + interpolation | |
| 명령 동기화 | command sync | |
| 이벤트 예약 | scheduled events | |
| 락스텝 | lockstep (deterministic lockstep) | |
| 롤백 넷코드 | rollback netcode | DB 롤백 → rollback (transaction) |
| 선입력 | input buffering | Distinct from the server-side input buffer |
| 서버 입력 버퍼 | server-side input buffer | |
| 선연출 | client-side feedback | Playing animations/effects before the server confirms |
| 판정 | the server’s call / hit registration / validation | 공격 판정 → hit registration; 이동 검증 → movement validation |
| 판정 구간 / 선입력 허용 시간 / 패링 판정 | timing window / input buffer window / parry window | |
| 스킬 씹힘 | skill didn’t go off | |
| 시야 / 시야 계산 / AOI | view range / AOI (visibility) calculation / area of interest | 셀 / 격자(그리드) → cell / grid |
| 브로드캐스트 | broadcast (fan-out) | |
| 개체 / 개체 ID / 등장·퇴장 알림 | entity / entity ID / spawn and despawn messages | |
| 채널 / 존 / 필드 / 페이즈 | channel / zone / field / phasing | 존 이동 → zone transfer |
| 월드 보스 / 공성전 / 레이드 | world boss / siege / raid | |
| 파티원 / 방장 (host) | party members / host | |
| 몬스터 / 캐릭터 모델 / 이름표 | monster / character model / name tag | |
| 스킬 시전 / 쿨다운 / 데미지 / 이펙트 | skill cast / cooldown / damage / effects | |
| 리슨 서버 | listen server | |
| 넷코드 / 넷그래프 | netcode / net graph | |
| 동시 접속 / 인원 | concurrent users (CCU) / player count | |
| 로그인 대기열 / 대기 순번 | login queue / queue position | |
| 점검 | maintenance | 점검 직후 → right after maintenance |
| 패치 / 배포 | patch / deploy (deployment) | |
| 게임 가속기 | game booster (gaming VPN) | |
| 안티치트 / 오버레이 | anti-cheat / overlay | |
| 셰이더 컴파일 / 셰이더 캐시 | shader compilation / shader cache | |
| 에셋 로딩 / 지연 로딩 | asset loading / lazy loading | |

### Player side, home and ISP
| Korean | English | Note |
|---|---|---|
| 유저 | player | “user” only in the OS/software sense (user space, end user) |
| 회선 | connection (player’s internet), link or circuit (DC, backbone) | 회선이 흔들린다 → high jitter on the connection |
| 통신사 | ISP; mobile carrier for cellular | 통신사망 → ISP network |
| 공유기 | router | |
| 와이파이 / 유선 / 모바일망 / LTE·5G | Wi-Fi / wired (Ethernet) / mobile network / LTE or 5G | |
| 무선 채널 | wireless channel | |
| 핸드오버 | handover | |
| 버퍼블로트 / SQM / QoS | bufferbloat / SQM / QoS | |
| NAT / NAT 테이블 / CGNAT | NAT / NAT table / CGNAT (carrier-grade NAT) | |
| 피어링 / 경로 / 우회 경로 / 병목 구간 | peering / route (path) / detour route / bottleneck | |
| 해저 케이블 / 장거리 구간 | submarine cable / long-haul link | |
| 피크 시간 | peak hours (evening peak) | |
| 저궤도 위성 인터넷 | LEO satellite internet | |
| 절전 상태 / 절전 해제 | power-saving state / wake-up | |
| 일시 정지 / 동결 (OS on apps) | suspend / freeze | |
| 백그라운드 창 / 최소화 | background window / minimized | |
| 발열 스로틀링 | thermal throttling | |
| 타이머 해상도 | timer resolution | |
| 가변 주사율 / 주사율 | variable refresh rate (VRR) / refresh rate | |
| 프레임 생성 | frame generation | |

### Data center, network and NIC
| Korean | English | Note |
|---|---|---|
| 데이터센터 / IDC | data center | |
| 방화벽 / 세션 테이블 / 연결 추적 | firewall / session table / connection tracking (conntrack) | 연결을 추적한다 / 추적 항목이 만료된다 → tracks the connection / the tracking entry expires |
| 로드밸런서 / 헬스체크 | load balancer / health check | |
| DDoS 방어 / 스크러빙 센터 / 오탐 | DDoS protection (mitigation) / scrubbing center / false positive | |
| 스위치 / 라우터 / LAG | switch / router / LAG | |
| 마이크로버스트 / 버스트 | microburst / burst | |
| 유휴 타임아웃 / 유휴 연결 | idle timeout / idle connection | |
| 조용히 버림 | silent drop | |
| 보안 그룹 / 네트워크 ACL / VPC | security group / network ACL / VPC | |
| NAT 게이트웨이 / SNAT | NAT gateway / SNAT | |
| 클라우드 사업자 / 인스턴스 / 호스트 점검 | cloud provider / instance / host maintenance | |
| 라이브 마이그레이션 | live migration | |
| 노이지 네이버 | noisy neighbor | |
| 링 버퍼 / 슬롯 | ring buffer / slot | |
| 인터럽트 / 인터럽트 병합 | interrupt / interrupt coalescing | |
| 수신 큐 / 송신 대기열 | receive queue (RX queue) / transmit queue | |
| RSS / PPS / 클라우드 PPS 한도 | RSS / PPS / cloud PPS limit | |
| 단편화 / 프래그먼트 | fragmentation / fragment | |
| MTU / MSS / MTU 블랙홀 | MTU / MSS / MTU black hole | |
| 불량 케이블 / 광모듈 | bad cable / optics (transceiver) | |

### Server OS, sockets and TCP
| Korean | English | Note |
|---|---|---|
| 커널 | kernel | |
| 접속 대기열(backlog) | connection queue (listen backlog) | |
| 파일 디스크립터(fd) | file descriptor (fd) | |
| 스케줄러 / 스케줄링 대기 / 런큐 | scheduler / waiting for CPU / run queue | |
| 타임 슬라이스 | time slice | |
| 컨텍스트 스위칭 | context switching | |
| CPU 스틸 | CPU steal (steal time) | |
| CPU 스로틀링 / 주기 / 할당량 | CPU throttling (CFS throttling) / period (CFS period) / quota | |
| 스왑 / OOM 킬러 | swap / OOM killer | |
| 시간 동기화 / 시계 점프 | time sync (NTP) / clock jump (NTP step) | wall clock / monotonic clock |
| 임시 포트 고갈 | ephemeral port exhaustion | |
| 소켓 버퍼 / 수신 버퍼 넘침 | socket buffer / receive buffer overflow | |
| 재전송 / 재전송 타이머 / RTO / 재전송률 | retransmission (verb: retransmit, resend) / retransmission timer / RTO / retransmission rate | 손실로 판단해 재전송한다 → treats it as lost and retransmits; RTO가 만료된다 → the RTO expires |
| 불필요한 재전송 | spurious retransmission | |
| 빠른 재전송 | fast retransmit | |
| 재전송 백오프 | retransmission backoff (exponential backoff) | |
| 순서 보장 / 보낸 순서대로만 넘겨줌 | in-order delivery / delivers data only in the order it was sent | |
| 시퀀스 번호 | sequence number | |
| HOL 블로킹 | head-of-line (HOL) blocking | |
| thin stream | thin stream | |
| TLP / 마지막 패킷들의 손실 | TLP (tail loss probe) / tail loss | |
| 선택적 ACK / 중간에 빠진 부분 | selective ACK (SACK) / gap (missing range) | |
| ACK(수신 확인) / 지연 ACK | ACK (acknowledgment) / delayed ACK | |
| 아직 ACK를 받지 못한 패킷 | in-flight packets | |
| 혼잡 / 혼잡 윈도우 / 수신 윈도우 / 윈도우 스케일 | congestion / congestion window (cwnd) / receive window (rwnd) / window scaling | |
| 제로 윈도우 / 제로 윈도우 프로브 | zero window / zero window probe | |
| 전송량 축소 | cutting the sending rate | |
| Nagle / TCP_NODELAY / keepalive / RST | Nagle / TCP_NODELAY / keepalive / RST | Keep as is |
| 비신뢰(unreliable) 채널 / 신뢰성 UDP | unreliable channel / reliable UDP | |
| 폴리서 / 셰이퍼 / 페이싱 / ECN | policer / shaper / pacing / ECN | |
| 블로킹 I/O / 비동기 I/O | blocking I/O / asynchronous I/O | |
| 하트비트 | heartbeat | 연결 유지 신호 → keepalive signal |
| 타임아웃 | timeout | |

### Server process, memory, disk and database
| Korean | English | Note |
|---|---|---|
| 워커 / 워커 스레드 / 스레드 풀 | worker / worker thread / thread pool | |
| 락 / 잠금 / 잠금 경합 / 데드락 | lock / lock / lock contention / deadlock | 락을 잡다 → acquire (hold) a lock |
| 점유한다 | holds (a thread, connection, port, CPU) | |
| 동기 호출 | blocking call (synchronous call) | |
| 호출 체인 | call chain | |
| starvation | starvation | |
| 워치독 | watchdog | |
| 무한 루프 / 길찾기 | infinite loop / pathfinding | |
| 직렬화 | serialization | |
| GC / GC 멈춤 / 전체 멈춤 / Full GC | GC / GC pause / stop-the-world pause / full GC | “GC가 돈다” → “GC runs”; Young/Old 영역 → young/old generation |
| 가비지 / 수집·회수 | garbage / collect, reclaim | |
| 힙 / 할당 | heap / allocation | |
| 메모리 누수 / 단편화 | memory leak / fragmentation | |
| 캐시 미스 / 메모리 계층 | cache miss / memory hierarchy | |
| 동기 쓰기 / fsync | synchronous write / fsync | |
| IOPS / 처리량 한도 / 대역폭 | IOPS / throughput limit / bandwidth | |
| 버스트 크레딧 | burst credits | 적립량 → credit balance |
| 페이지 캐시 / 디스크에 기록 | page cache / flush (write) to disk | |
| 백업 / 스냅숏 | backup / snapshot | |
| 커넥션 풀 / 커넥션 풀 고갈 | connection pool / connection pool exhaustion | |
| 인덱스 / 컬럼 / 스키마 변경(DDL) | index / column / schema change (DDL) | |
| 풀 스캔 / 실행 계획 | full table scan / query plan | |
| 행 잠금 / 핫 로우 / 잠금 에스컬레이션 | row lock / hot row / lock escalation | |
| 트랜잭션 / 롤백 / 언두 로그 / MVCC | transaction / rollback / undo log / MVCC | |
| 복제 / 복제본 / 주 DB / 복제 지연 | replication / replica / primary / replication lag | |
| 체크포인트 / 로그 플러시 | checkpoint / log flush | |
| 장애 전환 | failover | |
| 캐시 / 캐시 서버 / 콜드 캐시 / 캐시 스탬피드 | cache / cache server / cold cache / cache stampede | |

### Architecture, operations and observability
| Korean | English | Note |
|---|---|---|
| 서버 구성 | server architecture | |
| 게이트웨이 / 부가 서버 | gateway / auxiliary server (secondary service) | |
| 연쇄 장애 / 서킷 브레이커 | cascading failure / circuit breaker | |
| 재시도 폭풍 / 로그인 폭주 / 접속 폭주 | retry storm / login storm / connection surge | |
| 오토스케일링 | autoscaling | 늘어나는 데 시간이 걸림 → scale-out takes time |
| 서비스 디스커버리 / 외부 서비스 의존 | service discovery / external dependency | |
| 장애 | outage (incident, failure) | 장애가 난다 → fails, goes down |
| 사후 분석 | postmortem | |
| 크론 작업 | cron job | |
| 모니터링 / 경보 / 지표 / 로그 | monitoring / alert / metric / log | |
| 이용률 / 대기열 | utilization / queue | 대기열에 쌓인다 → queue up, build up in a queue |
| 평균 / 중앙값 / 백분위수 / p99 / 꼬리 지연 | average (mean) / median / percentile / p99 / tail latency | |
| 합성 측정 / 집계 간격 | synthetic monitoring / aggregation interval | |
| 스파이크 | spike | |
| 인프라 도구 | infra tools | |

## 12. Words to watch

- 렉이 생기다/걸리다 → “lag”, “lag spikes”, “the game lags”. Never “rag”.
- 튕기다 → “get kicked”, “disconnect”. 버벅이다 → “stutter”, “be choppy”.
- 굼뜨다 → “sluggish”. 손맛 → “feel” (“controls feel mushy”).
- 서버가 죽는다 → “the server crashes/goes down”. 서버가 굳는다 → “the server stops responding”.
- 공인 → “official”. 공신력 있는 출처 → “authoritative sources”.
- 원개발사 → “the original developer”. 운영사 → “operator”.
- Avoid calques: 확인형 행동 → “actions that wait for confirmation”; 체감 → “how it feels” or “perceived”; 쾌적하다 → “feels smooth/responsive”; 대표값 → “typical value”.
- No analogies outside the source’s analogy boxes (`class="analogy"`); use the industry term.

## 13. SEO notes

Phrases English speakers actually search when a game lags or when they investigate server-side lag:

1. what causes lag in online games
2. game lag causes
3. why is my game lagging
4. ping spikes / lag spikes
5. high ping
6. packet loss fix
7. rubber banding lag
8. game stuttering fix
9. input lag
10. server lag
11. jitter in games
12. game keeps disconnecting
13. stuck on loading screen
14. netcode
15. tick rate
16. lag compensation
17. TCP retransmission
18. bufferbloat
19. MMO lag
20. game server troubleshooting / game server performance

How they are used:
- Main title: “Game Lag White Paper: what causes online game lag and who fixes it” matches (1) and (2) and states the unique angle (ownership).
- Meta description opens with the question “What causes lag in online games?” and names stutter, teleporting, rubber-banding and disconnects, the terms players type, plus “MMO”.
- Symptom pages: “{symptom} in online games: causes and who fixes them”, so “Rubber-banding in online games”, “Stutter in online games”, “Input lag in online games” line up with (7), (8), (9).
- Cause pages: “{name} ({English name}): game lag cause | Game Lag White Paper”.
- Keywords meta: game lag causes, online game lag, high ping, lag spikes, stutter, teleporting, rubber-banding, input lag, disconnects, server lag, netcode, TCP retransmission, packet loss, game server troubleshooting.
- Never stack keywords; each phrase must read as part of a sentence or a natural title.

## Additional terms (added during translation)

| Korean | English | Note |
|---|---|---|
| 먼저 부를 곳 | Who to call first: | playbooks, body (judge, owners) |
| 확인 신호 | Signals to check: | cases |
| 인프라팀(시스템) | infra team (servers/OS) | |
| 거점 | location (PoP) | CDN/cloud sites |
| 재연결 유예 시간 | reconnect grace period | |
| 쏠림 경보 | skew alerts | |
| 판정 순서 | decision order (scope → timing → layer) | |
