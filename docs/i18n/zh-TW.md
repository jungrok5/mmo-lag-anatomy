# 繁體中文 (zh-TW): terminology and style guide

Target reader: game developers, QA, PMs, artists and infra/SRE engineers in Taiwan. Write the way a senior Taiwanese game-server or infra engineer writes a technical document: Taiwan vocabulary (伺服器, 封包, 記憶體, 執行緒, 網路, 資料, 程式碼, 預設值), never Simplified Chinese converted character by character. Read `docs/I18N_GUIDE.md` first; this file adds the zh-TW decisions. Every term in the tables below is fixed: use it the same way in every group (causes, body, sims, cases, refs, UI).

The same Korean string is one dictionary key for the whole language. If a Korean string already has a translation in another group (for example `지연`, `원인`, `범위`, `커널`), use exactly the same Chinese, or `node tools/i18n.cjs check zh-TW --conflicts` will flag it.

## 1. Site name and titles

| Korean | zh-TW | Note |
|---|---|---|
| 게임 렉 백서 | **遊戲 Lag 白皮書** | Site name. Mirrors "Game Lag White Paper" and contains 遊戲 lag, the phrase Taiwanese players and developers actually type. 延遲 is kept for the latency factor (지연), so it is not the site name. |
| 게임 렉 백서: 온라인 게임 렉 원인과 해결 담당 | 遊戲 Lag 白皮書：線上遊戲 lag、延遲的原因與負責團隊 | Full title (`build.py`). |
| 렉 | lag | In running text always lowercase `lag` (遊戲 lag、伺服器 lag、出現 lag、覺得很 lag). Capitalize only in the site name and when `Lag` starts a heading or sentence. |
| 백서 / 이 백서 | 白皮書 / 本白皮書 | |
| 원본 (the interactive page) | 完整版; long form 含圖解與互動實驗的完整版 | 원본 카드 → 完整版卡片, 원본 장 → 完整版章節. |
| 원문 (source language, original article) | 原文 | 원문은 한국어 → 原文為韓文. A case's 원문 link → 原文. |
| 텍스트 판 | 純文字版 | |

In page titles keep the ASCII separator ` | ` exactly as in the source (do not change it to ｜). Use the full-width colon ： between a title and its subtitle.

## 2. Register and voice

- **Prose** (summaries, `c`, `num`, `more`, `act`, body text, symptom `what`/`looks`/`tell`, glossary definitions): neutral written Chinese (書面語) in full sentences ending with 。. The Korean polite 합니다체 has no verb form in Chinese; keep the politeness through a calm, complete, non-slangy tone. No sentence-final particles (啦、喔、囉、吧), no internet slang in prose.
- **Pronouns.** Avoid pronouns where the sentence works without one. When you must address the reader, use 你 (Taiwan developer-doc tone), never 您 mixed with 你. Instructions may start with 請 (請附上、請先確認).
- **The Korean `내` / `나` (the player's own side).** In short labels and in the player's own voice (who values, report checklist, quoted complaints) use 我: 只有我、我的電腦／手機、我這端. In explanatory prose use 自己(的): 自己的畫面、自己的角色、自己的輸入、自己的電腦. Do not write 我的 in explanatory sentences.
- **`chk` fields (`look`, `yes`, `no`) and table cells**: terse bullet style, the Chinese equivalent of the Korean noun endings (~함, ~봄, ~음). Drop the subject, no 了/的 at the end, no final 。 (the source has none). Separate two statements with 。 or ；inside the field.
  - look: `GC log 的暫停時間與伺服器 tick 時間圖表`
  - yes: `tick 飆高的時間點與 GC 暫停重疊，暫停長度與飆高長度相近`
  - no: `GC log 沒有長暫停、tick 仍飆高時，是鎖、同步呼叫等其他原因`
- **Short labels** (layer `short`, who/when, sig names, buttons): no punctuation at the end, 2–10 characters where possible.
- **Plain words for non-experts.** The reader is often a planner, artist, QA or PM. Explain a term in parentheses the first time it appears in a chapter, using the industry term, never a metaphor: 抖動（jitter，封包抵達間隔忽長忽短）.
- **No em-dash asides.** Do not insert explanations with —— or – in the middle of a sentence. Use full-width parentheses （…） or a separate sentence.
- **No "not A but B".** Do not write 不是 A 而是 B、並非 A，而是 B、而非、與其說 A 不如說 B、A 其實不是…是…. State B directly. If A must be mentioned, give it its own sentence: `線路本身正常。問題出在接收端程式沒有及時讀取。` The Korean `A보다 B` (B rather than A) may become 比起 A，更…
- **Symptom names are only for symptoms.** When Korean uses 멈춤 for a GC or process pause, write 暫停／停住, not the symptom name 定格. The same for 끊김 (connection cut → 中斷／斷線) versus 뚝뚝 끊김 (卡頓).
- Keep Korean facts as facts: Korean carriers (KT、SK Broadband、LG U+), Korean agencies, 首爾 ↔ 東京 examples stay. Do not swap in Taiwanese examples such as 中華電信.

## 3. Mechanics

### Punctuation

| Korean source | zh-TW |
|---|---|
| `. , ? ! : ;` in Chinese text | full-width 。，？！：； |
| “…” / ‘…’ | 「…」 / 『…』 (nested) |
| ( … ) around Chinese or around an English gloss | full-width （…）: 封包遺失（packet loss）、檔案描述子（fd） |
| `A·B` list inside a sentence | 頓號 `、`: 用戶端、伺服器程式碼 |
| `A·B` in a short label meaning "A or B" | full-width slash `／`: 我的電腦／手機、Wi-Fi／分享器 |
| ` / ` in the source (choices) | `／` without spaces: 只有我／隊友也有 |
| `~` in ranges (1~5m, 0.2~0.5초) | full-width tilde `～`: 1～5m、0.2～0.5 秒 |
| `…` | `……` (two ellipsis characters) |
| `→` | keep `→` with spaces around |

Keep ASCII punctuation inside `<code>`, commands, file paths, URLs, option names, Markdown syntax and placeholders. **Keep ASCII parentheses in any string that becomes an ID**: the glossary English-name column is turned into the anchor `#g-…` by stripping `( … )`, so `Cache (Redis 等)` must use ASCII `( )`, or the anchor changes.

The middle dot ` · ` that the code inserts between UI items is outside our strings; do not add `·` or `・` in Chinese sentences yourself.

### Spacing (盤古之白)

- One half-width space between Han characters and Latin letters or digits: `伺服器 GC 暫停`、`每秒 20 次`、`20 tick 伺服器`、`Linux kernel 參數`、`約 1 萬次`.
- No space between Han characters and full-width punctuation, and none inside a number+unit symbol: `200ms`、`1.5GB`、`60FPS`、`1%`、`12ms`. Keep the unit symbols from the source unchanged (`ms`, `µs`, `Gbps`, `Mbps`, `GB`, `Hz`, `m`, `km`).
- Chinese unit words take a space after the digit: `0.5 秒`、`2 小時`、`10 分鐘`、`60 秒`、`1,500 位元組`.
- Placeholders: if `{0}` is a number or Latin text, surround it with spaces like a number (`{0} 個原因`、`出處 {0} 筆`). If it is a Chinese name (symptom, layer, team), no spaces (`遊戲{0}的原因`、`{0}要做的事`).

### Numbers

- Thousands separator `,` and decimal point `.` as in the source: `1,500`、`16.7ms`.
- Korean number words: 만 → 萬, 억 → 億 (`1만 번` → `約 1 萬次`, `10만 명` → `10 萬人`). Keep the value; do not convert 1만 into 10,000 (it also trips the number check).
- 수/몇 (a few): 수 초 → 數秒, 수십 ms → 數十 ms, 수백 ms → 數百 ms, 몇 초 → 幾秒, 수~수십 ms → 數～數十 ms.
- 약 → 約, 안팎 → 左右, 이상 → 以上, 이하 → 以下, 미만 → 未滿／不到, 초과 → 超過, 배 → 倍 (2배 → 2 倍).
- Dates: `2021년 10월` → `2021 年 10 月`.
- Korean abbreviations `20틱` → `20 tick`, `60Hz` unchanged.

### Short strings with a number placeholder

Chinese has no plural, so there is no agreement problem, but a measure word is required. Put the number before noun + measure word:

| Korean | zh-TW |
|---|---|
| 원인 {0}가지 | {0} 個原因 |
| 원인 {0}개, 용어 {1}개 | 原因 {0} 個，術語 {1} 個 |
| 출처 {0}건 / 자료 {0}건 | 出處 {0} 筆 / 資料 {0} 筆 |
| 발행처 {0}곳 | 發行者 {0} 家 |
| 사례 {0}건 (incidents) | {0} 起事故 |
| {0}번, {0}회 | {0} 次 |
| 서버 {0}대 | {0} 台伺服器 |
| {0}명 | {0} 人 |
| 인용 {0}곳 | 引用 {0} 處 |

Never add 們 after a number (`3 個玩家們` is wrong).

### Korean constructions

| Korean | zh-TW |
|---|---|
| ~을 봅니다 (in diagnosis: check X) | 要查 X／先看 X |
| ~ㄹ 수 있습니다 | 可能會… |
| ~기도 합니다 | 有時會…／也可能… |
| ~면 ~ | …時，…／…的話，… |
| ~직후 | 剛…時／…剛結束 |
| 우리 (our side, our contract) | 我方 |
| 유저 | 玩家 (in cloud/OS context: 使用者) |
| 클라 (short for client) | 用戶端 |
| onomatopoeia 멈칫 / 휙 / 뚝 / 파파파팍 | 頓一下 / 一下子 / 突然 / 唰唰唰 |

## 4. The 11 symptom names (fixed)

Use these names everywhere a symptom is meant, character for character. The alias column is the translation of `alias` in `data.js` (player words, separated by 、).

| id | Korean | zh-TW name | alias (zh-TW) |
|---|---|---|---|
| stutter | 뚝뚝 끊김 | **卡頓** | 卡卡的、一頓一頓、像在掉幀 |
| teleport | 순간이동 | **瞬移** | 瞬間移動、角色亂跳、停一下又突然跳走 |
| rubber | 고무줄 | **拉回** | 被拉回原位、橡皮筋效應（rubber banding）、位置回溯 |
| burst | 몰아치기 | **快轉** | 唰唰唰、像按了快轉、一口氣全部處理完 |
| slowmo | 슬로우모션 | **慢動作** | 整個世界變慢、整體遲鈍 |
| delay | 입력 지연 | **輸入延遲** | 反應慢半拍、操作遲鈍、沒有手感 |
| freeze | 멈춤 | **定格** | 畫面凍結、完全不動、沒有回應 |
| dropped | 씹힘·롤백 | **吃指令／回檔** | 技能被吃、道具被收回、交易失敗 |
| disconnect | 접속 끊김 | **斷線** | 被踢出遊戲、連線中斷、與伺服器的連線已中斷 |
| noconnect | 접속 불가·무한 로딩 | **連不上／無限讀取** | 登不進去、讀取跑不完 |
| invisible | 안 보임·유령 개체 | **看不見／幽靈物件** | NPC 不見了、隱形角色、早就死掉的怪還站著 |

Notes: 卡頓 is stutter only; a full stop of everything is 定格 (distinct from 卡住 in casual speech, which we do not use as a name). 回檔 is the player-visible rollback of saved progress; the DB operation is 回滾 (see §11). In a sentence write the name without quotes (`畫面出現卡頓`、`以瞬移或快轉的方式補上`).

## 5. The four factors (fx)

| id | Korean | zh-TW | `how` |
|---|---|---|---|
| lat | 지연 | 延遲 | 封包晚到 |
| jit | 지터 | 抖動 | 封包忽快忽慢 |
| loss | 손실 | 遺失 | 封包根本沒到 |
| stall | 정체 | 停滯 | 有人停止了計算 |

In running text: 延遲、抖動、封包遺失、停滯. First mention of jitter in a chapter: 抖動（jitter，封包抵達間隔忽長忽短）. Players say 跳 ping for ping spikes and 掉封包 for loss; use those only in quoted player speech, SEO text and aliases. Do not use 丟包 (Mainland slang).

## 6. Layers and topics

| id | name (Korean → zh-TW) | short | side |
|---|---|---|---|
| client-game | 클라이언트 게임 프로세스 → 用戶端遊戲程式 | 我的遊戲 | 我這端 |
| client-os | 클라이언트 OS·기기 → 用戶端 OS 與裝置 | 我的電腦／手機 | 我這端 |
| home | 집 네트워크 → 家用網路 | Wi-Fi／分享器 | 我這端 |
| isp | 인터넷 회선 → 網際網路線路 | 電信業者／海外 | 傳輸途中 |
| dc-net | 데이터센터 네트워크 장비 → 資料中心網路設備 | 防火牆／LB | 伺服器端 |
| nic | 서버 네트워크 카드 → 伺服器網路卡 | NIC | 伺服器端 |
| server-os | 서버 OS (커널) → 伺服器 OS（kernel） | Kernel | 伺服器端 |
| socket | 소켓과 프로토콜 → Socket 與協定 | TCP·UDP (unchanged, no Hangul) | 兩端 |
| server-proc | 서버 게임 프로세스 → 伺服器遊戲程式 | tick／執行緒 | 伺服器端 |
| memory | 메모리 → 記憶體 | GC／洩漏 | 伺服器端 |
| disk | 디스크 → 磁碟 | IOPS | 伺服器端 |
| db | 데이터베이스 → 資料庫 | DB | 伺服器端 |
| infra | 서버 구성과 운영 → 伺服器架構與維運 | 架構／維運 | 伺服器端 |
| sync | 동기화 설계 → 同步設計 | 同步設計 | 設計 |
| partial | 일부에게만 생기는 문제 → 只有部分人遇到的問題 | 僅部分 | 範圍 |
| retrans | TCP 재전송의 근본 원인 → TCP 重傳的根本原因 | TCP 重傳 | 原因 |

층 → 層 (13개 층 → 13 層, 레이어 3 → 第 3 層); 주제 → 主題; 층·주제 → 層／主題. Chapter headings that add a subtitle keep the layer name first, for example 소켓과 프로토콜: TCP, UDP, 소켓 옵션 → Socket 與協定：TCP、UDP、socket 選項.

## 7. Teams and owners

| Korean | zh-TW | Note |
|---|---|---|
| 게임개발팀 | 遊戲開發團隊 | team `game` |
| 인프라팀 | 基礎設施團隊 | team `infra`. Colloquially Infra 團隊; do not use it in text |
| 외부 | 外部 | team and owner `ext` |
| 클라이언트 개발 / 클라이언트 | 用戶端開發 / 用戶端 | `cli` |
| 서버 개발 / 서버 | 伺服器開發 / 伺服器 | `srv` |
| 네트워크 인프라 / 네트워크 | 網路基礎設施 / 網路 | `net` |
| 서버 인프라 / 서버 장비·OS | 伺服器基礎設施 / 伺服器設備／OS | `sys` |
| DB 인프라 / DB 장비 | DB 基礎設施 / DB 設備 | `dba` |
| 유저·통신사·클라우드 | 玩家／電信業者／雲端 | `ext` short |
| 주 담당 / 함께 | 主要負責 / 協同 | |
| 담당 (column, field) | 負責單位 | 담당 팀 → 負責團隊, 해결 담당 → 負責解決的團隊 |
| 팀별 할 일 / {팀} 할 일 | 各團隊要做的事 / {團隊}要做的事 | |
| 담당 코드 | 負責代碼 | the codes cli, srv, net, sys, dba, ext stay as is |

## 8. Who / when values

| key | Korean | zh-TW |
|---|---|---|
| who.me | 나만 | 只有我 |
| who.home | 같은 집 | 同一個家 |
| who.region | 특정 지역·통신사 | 特定地區／電信業者 |
| who.zone | 특정 장소·채널 | 特定地點／頻道 |
| who.server | 서버 전체 | 整個伺服器 |
| who.feature | 특정 기능만 | 只有特定功能 |
| who.onechar | 특정 캐릭터만 이상해 보임 | 只有特定角色看起來怪怪的 |
| who.oneclient | 같은 PC의 한쪽 클라만 | 同一台電腦只有其中一個用戶端 |
| when.always | 항상 | 一直都有 |
| when.peak | 저녁 피크 시간 | 晚間尖峰時段 |
| when.event | 사람이 몰릴 때 | 人潮湧入時 |
| when.login | 접속·점검 직후 | 剛登入／維護剛結束 |
| when.idle | 가만히 있다가 | 閒置一段時間後 |
| when.random | 가끔 무작위로 | 偶爾隨機發生 |
| when.periodic | 일정한 주기로 | 固定週期 |
| when.uptime | 오래 켜 둘수록 | 開越久越嚴重 |
| when.moving | 이동 중·지역 전환 때 | 移動中／切換地圖時 |
| when.action | 특정 행동을 할 때 | 做特定動作時 |

Headers: 누가 겪나 → 誰會遇到, 언제 → 何時.

## 9. Graph shapes (sigs) and check-by (chkBy)

| sig id | Korean | zh-TW |
|---|---|---|
| periodic | 일정 주기로 튐 | 固定週期飆高 |
| random | 가끔 무작위로 튐 | 偶爾隨機飆高 |
| step | 어느 순간부터 계단처럼 올라감 | 從某個時間點起階梯式上升 |
| ramp | 서서히 오름 | 緩慢爬升 |
| sawtooth | 서서히 오르다 뚝 떨어짐 | 緩慢爬升後驟降 |
| peak | 특정 시간대에만 높음 | 只在特定時段偏高 |
| load | 인원·부하를 따라 오름 | 隨人數／負載上升 |
| ceiling | 한도에 닿아 평평해짐 | 碰到上限後持平 |
| high | 처음부터 늘 높음 | 一開始就一直偏高 |
| outlier | 일부만 높음 | 只有部分偏高 |
| gap | 끊겼다가 몰아서 | 中斷後一次湧入 |
| drop | 연결이 한꺼번에 끊김 | 連線同時大量中斷 |
| surge | 접속·점검 직후 폭증 | 剛開服或維護結束後暴增 |

튀다 (a value spikes) → 飆高; 솟다 → 往上衝; 스파이크 → 尖峰（spike）. For ping only, players' 跳 ping is fine in quotes.

| chkBy | Korean | zh-TW |
|---|---|---|
| ops | 인프라 도구로 확인(게임 코드 불필요) | 用基礎設施工具確認（不需要遊戲程式碼） |
| code | 게임 서버·클라이언트의 로그·지표가 필요 | 需要遊戲伺服器／用戶端的 log 與指標 |
| user | 유저 쪽 환경에서 확인 | 在玩家端環境確認 |

## 10. Card, page and chapter labels

| Korean | zh-TW |
|---|---|
| 왜 → 그러면 → 화면에서는 | 為什麼 → 於是 → 畫面上 |
| 증상 / 요인 | 症狀 / 因素 |
| 수치 감각 | 數值參考 |
| 그래프에서는 / 그래프 모양 | 圖表上 / 圖表形狀 |
| 확인 방법 | 確認方法 |
| 확인할 곳 / 이러면 맞음 / 이러면 아님 / 확인 수단 | 查看位置 / 符合的跡象 / 不符合的跡象 / 確認方式 |
| 더 알아보기 | 深入了解 |
| 출처 / 참고 문헌 | 出處 / 參考文獻 |
| 실제 사례 / 실제 장애 사례 | 實際案例 / 實際事故案例 |
| 사례와 절차 / 상황별 절차 | 案例與處理流程 / 各情境處理流程 |
| 링크 복사 | 複製連結 |
| 직접 해보기 / 이렇게 해보세요 / 상황 불러오기 | 親手試試 / 試試這樣做 / 載入情境 |
| 좋음 / 주의 / 나쁨 | 良好 / 注意 / 不佳 |

Chapter names (use them when the text refers to a chapter as 「…」一章 or 見「…」):

| Korean | zh-TW |
|---|---|
| 렉의 네 가지 요인 / 렉은 네 가지 요인으로 만들어진다 | lag 的四個因素 / Lag 由四個因素構成 |
| 패킷의 이동 경로 | 封包的傳輸路徑 |
| 렉 실험실 | Lag 實驗室 |
| 증상 사전 | 症狀辭典 |
| 동기화 방식 / 같은 핑, 다른 체감: 동기화 방식 | 同步方式 / 同樣的 ping，不同的體感：同步方式 |
| 한 명만 느릴 때, 한쪽만 이상할 때 | 只有一個人慢、只有一邊怪的時候 |
| TCP 재전송 | TCP 重傳 |
| 게임개발팀·인프라팀 담당 구분 | 遊戲開發團隊與基礎設施團隊的權責劃分 |
| 진단 도우미 | 診斷小幫手 |
| 관측으로 판정하기 | 用觀測資料判定 |
| 범위 → 시점 → 계층 | 範圍 → 時間點 → 層級 |
| 판정 신호표 | 判定訊號表 |
| 렉 제보 잘하는 법 | 如何有效回報 lag |
| 용어 사전 | 名詞解釋 |
| 이 층에서 렉을 만드는 원인 | 這一層造成 lag 的原因 |
| 패치 이후 렉 / 해외 국가 추가 | 更新後 lag / 新增海外國家 |

## 11. Core terminology (Korean → zh-TW)

Where Taiwan engineers normally use the English word, the English word is the term (written as shown, lowercase in running text unless it is an acronym or proper noun). A Chinese gloss in parentheses may be added at first mention in a chapter.

### Game and netcode

| Korean | zh-TW | Note |
|---|---|---|
| 핑 | ping; standalone label `Ping` | ping 值 when you mean the number. 핑 150ms → ping 150ms |
| 틱 / 틱레이트 / 틱 예산 / 틱 간격 | tick / tick rate / tick 預算 / tick 間隔 | standalone label `Tick`. 20틱 서버 → 20 tick 伺服器 |
| 프레임 / 프레임 타임 / FPS | 畫格 / 畫格時間（frame time） / FPS | 幀 only in player speech (掉幀) |
| 게임 루프 / 메인 스레드 | 遊戲迴圈 / 主執行緒 | |
| 스냅샷 / 델타 압축 | 快照 / 差異壓縮（delta compression） | |
| 상태 업데이트 | 狀態更新 | |
| 보간 / 보간 버퍼 | 內插 / 內插緩衝 | |
| 외삽 | 外插（dead reckoning） | |
| 예측 / 클라이언트 예측 | 預測 / 用戶端預測 | |
| 서버 보정 | 伺服器校正（reconciliation） | |
| 지연 보상 / 되감기 | 延遲補償（lag compensation） / 回溯 | 되감기(지연 보상) → 回溯（延遲補償） |
| 권위 서버 / 클라이언트 권위 | 權威伺服器 / 用戶端權威 | |
| 요청-응답 | 請求-回應 | |
| 상태 동기화 / 명령 동기화 / 이벤트 예약 | 狀態同步 / 指令同步 / 事件排程 | |
| 락스텝 | lockstep | glossary term `Lockstep` |
| 롤백 넷코드 | rollback netcode | glossary term `Rollback netcode` |
| 넷코드 | netcode（網路同步） | |
| 선입력 | 預輸入 | spell queue → 技能佇列 |
| 선연출 | 先行演出 | client-side feedback |
| 판정 / 판정 구간 | 判定 / 判定區間 | |
| 서버 입력 버퍼 | 伺服器輸入緩衝 | |
| 리슨 서버 / 방장 | listen server / 房主 | |
| 페이즈 | 相位（phasing） | as in WoW 繁中 |
| AOI / 시야 / 시야 계산 | AOI / 視野 / 視野計算 | |
| 격자(그리드) / 셀 | 格狀（grid） / 格子 | |
| 브로드캐스트 | 廣播 | |
| 개체 / 개체 ID | 物件 / 物件 ID | game entity (NPC, monster, player) |
| 객체 (programming object, GC) | 物件 | |
| 넷그래프 | net graph | glossary term `Net graph` |
| 안티치트 / 핵 | 反作弊 / 外掛 | |
| 스킬 / 쿨다운 / 연계 | 技能 / 冷卻 / 連段 | |
| 캐릭터 / 몬스터 / 데미지 / 이펙트 / 체력 | 角色 / 怪物 / 傷害 / 特效 / 血量 | |
| 캐릭터 모델 / 이름표 | 角色模型 / 名字 | |
| 채널 / 존 / 필드 / 던전 / 월드 보스 | 頻道 / zone / 野外 / 副本 / 世界王 | 존 stays `zone`; first mention zone（地圖區域） |
| 지역 이동, 지역 전환 (in game) | 切換地圖 | real-world 지역 → 地區 |
| 파티 / 파티원 / 길드 / 인벤토리 / 거래 | 隊伍 / 隊友 / 公會 / 背包 / 交易 | 거래 is the in-game trade; see transaction below |
| 로딩 / 로딩 화면 / 로딩바 | 載入 / 讀取畫面 / 讀取條 | |
| 에셋 / 텍스처 / 셰이더 / 셰이더 캐시 | 資源 / 貼圖 / 著色器 / 著色器快取 | |
| 셰이더 컴파일 | 著色器編譯 | |
| 렌더링 / 그리기 | 渲染 / 繪製 | |
| V-Sync / 가변 주사율 / 주사율 | 垂直同步（V-Sync） / 可變更新率（VRR） / 更新率 | |
| 프레임 생성 | 畫格生成 | NVIDIA 台灣 wording |
| 오버레이 | overlay | glossary term `Overlay` |
| 점검 / 패치 / 배포 / 서버 오픈 | 維護 / 更新 / 部署 / 開服 | 패치 이후 → 更新後 |
| 로그인 서버 / 로그인 대기열 / 대기 순번 | 登入伺服器 / 登入排隊 / 排隊順位 | |
| 재접속 / 접속 | 重新連線 / 連線（login context: 登入） | |
| 동시 접속(자) | 同時上線人數 | |
| 크래시 (server / client) | 當機 / 閃退 | |
| 게임 가속기 | 遊戲加速器 | |

### Player side, home and ISP

| Korean | zh-TW | Note |
|---|---|---|
| 클라이언트 | 用戶端 | not 客戶端 |
| 기기 / PC / 폰 | 裝置 / 電腦 / 手機 | |
| 공유기 | 分享器 | home router (IP 分享器). ISP/DC router → 路由器 |
| 와이파이 / 유선 / 모바일망 / LTE·5G | Wi-Fi / 有線 / 行動網路 / LTE／5G | 모바일 → 行動 (never 移動) |
| 무선 채널 / 대역 / 간섭 | 無線頻道 / 頻段 / 干擾 | |
| 기지국 / 핸드오버 | 基地台 / 換手（handover） | |
| 대역폭 | 頻寬 | |
| 버퍼블로트 | bufferbloat | glossary term `Bufferbloat` |
| SQM / QoS | SQM / QoS | |
| NAT / NAT 테이블 / CGNAT | NAT / NAT 表 / CGNAT（電信級 NAT） | |
| 공인 IP / 사설망 | 公用 IP / 私有網路 | |
| 통신사 | 電信業者 | short label 電信業者. Not 運營商 |
| 통신사 간 연결 / 피어링 | 電信業者之間的互連 / peering | glossary term `Peering` |
| 경로 / 우회 경로 / 라우팅 | 路徑 (or 路由) / 繞遠路的路由 / 路由 | |
| BGP | BGP | |
| 해저 케이블 / 광케이블 / 빛의 속도 | 海底電纜 / 光纖 / 光速 | |
| 백그라운드 (앱·창) | 背景 | 백그라운드 창 → 背景視窗 |
| 일시 정지 / 동결 (OS on apps) | 暫停（suspend） / 凍結（freeze） | |
| 절전 / 절전 해제 | 省電 / 喚醒（wake-up） | |
| 발열 스로틀링 | 過熱降頻 | |
| 타이머 해상도 | 計時器解析度 | |
| VRAM / 그래픽카드 / 그래픽 드라이버 | VRAM / 顯示卡 / 顯示卡驅動程式 | |
| 저궤도 위성 인터넷 | 低軌衛星網路 | |
| 영상 통화 / 영상 / 녹화 / 스크린샷 | 視訊通話 / 影片 / 錄影 / 截圖 | |

### Data center, network and NIC

| Korean | zh-TW | Note |
|---|---|---|
| 데이터센터 / IDC | 資料中心 / IDC 機房 | |
| 장비 | 設備 | |
| 방화벽 / 로드밸런서 / 스위치 / 라우터 | 防火牆 / 負載平衡器 / 交換器 / 路由器 | |
| DDoS 방어 / 스크러빙 센터 | DDoS 防護 / 清洗中心（scrubbing center） | |
| 세션 테이블 / conntrack 테이블 / 연결 추적 | session 表 / conntrack 表 / 連線追蹤 | glossary term `Session 表` |
| 유휴 연결 / 유휴 타임아웃 | 閒置連線 / 閒置逾時 | |
| 조용히 버림 (silent drop) | 默默丟棄（silent drop） | |
| 마이크로버스트 / 버스트 | microburst（微突發） / 突發流量（burst） | glossary term `Microburst` |
| ECMP / LAG | ECMP / LAG（鏈路聚合） | always write LAG in caps; lowercase lag is 렉 |
| 링크 / 링크 묶음 | 鏈路 / LAG | |
| MTU / MSS / 단편화 / 프래그먼트 | MTU / MSS / 分段（fragmentation） / 分段 | memory 단편화 → 記憶體碎片化 |
| 터널 | 通道 | VPN 通道 |
| 보안 그룹 / 네트워크 ACL / VPC | 安全群組 / 網路 ACL / VPC | AWS 台灣 wording |
| NAT 게이트웨이 / SNAT | NAT 閘道 / SNAT | |
| 포트 | port | 連接埠 only if a gloss is needed |
| 주소 (IP) / 주소 (URL) | 位址 / 網址 | |
| 홉 | 躍點（hop） | |
| NIC / 네트워크 카드 | 網路卡（NIC） | |
| 링 버퍼 / 슬롯 | ring buffer / slot | 256칸 → 256 個 |
| 인터럽트 | 中斷（interrupt） | do not confuse with 斷線 |
| RSS / 수신 큐 / 송신 대기열 | RSS / 接收佇列 / 傳送佇列 | |
| PPS | PPS | |
| 클라우드 / 클라우드 사업자 / 인스턴스 | 雲端 / 雲端供應商 / 執行個體 | |
| 리전 / 가용 영역 | 區域（region） / 可用區域 | |
| 라이브 마이그레이션 | 即時遷移（live migration） | |
| 노이지 네이버 | noisy neighbor（吵鬧鄰居） | |

### Server OS, sockets and TCP

| Korean | zh-TW | Note |
|---|---|---|
| 커널 | kernel; standalone label `Kernel` | 核心 means CPU core in Taiwan, so kernel stays English |
| 운영체제 / OS | 作業系統 / OS | |
| CPU 코어 | CPU 核心 | |
| 프로세스 | 處理程序 | layer names use 遊戲程式 |
| 스레드 / 워커 / 워커 스레드 / 스레드 풀 | 執行緒 / worker / 工作執行緒 / 執行緒池 | |
| 스케줄러 / 스케줄링 / 타임 슬라이스 | 排程器 / 排程 / 時間片段（time slice） | |
| 컨텍스트 스위칭 | context switch | glossary term `Context switch` |
| CPU 스틸 | CPU steal | |
| CPU 스로틀링 (CFS) / 주기 / 할당량 | CPU 節流（throttling） / 週期（CFS period） / 配額（quota） | thermal → 過熱降頻 |
| 컨테이너 | 容器 | |
| C-state | C-state | |
| backlog / 접속 대기열 | backlog / 連線等待佇列（backlog） | |
| 대기열 / 큐 | 佇列 | login queue → 排隊 |
| 파일 디스크립터 | 檔案描述子（fd） | |
| 스왑 / OOM 킬러 | swap / OOM killer | glossary terms `Swap`, `OOM killer` |
| 페이지 캐시 / 페이지 폴트 | 頁面快取 / 分頁錯誤 | |
| 시간 동기화 / 시계 점프 / wall clock / monotonic clock | 時間同步（NTP） / 時鐘跳動 / wall clock / monotonic clock | |
| 소켓 / 소켓 옵션 / 소켓 버퍼 | socket / socket 選項 / socket 緩衝區 | glossary term `Socket 緩衝區` |
| 버퍼 | 緩衝區 | 보간 버퍼 → 內插緩衝 |
| 프로토콜 | 協定 | |
| 재전송 / 재전송률 / 재전송 타이머 | 重傳 / 重傳率 / 重傳計時器 | |
| 불필요한 재전송 | 不必要的重傳（spurious retransmission） | |
| 빠른 재전송 | 快速重傳 | |
| RTO | RTO（重傳逾時） | |
| 타임아웃 | 逾時（timeout） | glossary term `逾時` |
| 백오프 | 退避（backoff） | |
| HOL 블로킹 | HOL 阻塞（head-of-line blocking） | |
| 순서 보장 / 보낸 순서대로만 넘겨줌 | 順序保證 / 只依送出順序交付 | |
| 시퀀스 번호 | 序號 | |
| ACK / 지연 ACK / SACK / TLP / RACK-TLP | ACK（確認） / 延遲 ACK / SACK / TLP / RACK-TLP | |
| 마지막 패킷들의 손실 (tail loss) | 尾端遺失（tail loss） | |
| 아직 ACK를 받지 못한 패킷 (in-flight) | 尚未收到 ACK 的封包（in-flight） | |
| 혼잡 / 혼잡 윈도우 / 수신 윈도우 / 윈도우 | 壅塞 / 壅塞視窗（cwnd） / 接收視窗（rwnd） / 視窗 | never 擁塞 |
| 제로 윈도우 / 제로 윈도우 프로브 / 윈도우 스케일 | zero window / zero window probe / 視窗縮放（window scale） | |
| thin stream | thin stream | |
| Nagle 알고리즘 / TCP_NODELAY / keepalive / RST / TIME_WAIT | Nagle 演算法 / TCP_NODELAY / keepalive / RST / TIME_WAIT | |
| 하트비트 | 心跳封包 | glossary term. 하트비트 응답 → 心跳回應 |
| 신뢰성 UDP / 비신뢰(unreliable) 채널 | 可靠 UDP / 不可靠（unreliable）通道 | |
| 폴리서 / 셰이퍼 / 페이싱 | policer（流量管制） / shaper（流量整形） / pacing | |
| ECN | ECN | |
| 비동기 I/O / 동기 호출 / 호출 / 호출 체인 | 非同步 I/O / 同步呼叫 / 呼叫 / 呼叫鏈 | |
| 락 / 잠금 / 데드락 / 락 경합 / starvation | 鎖 / 鎖定 / 死結 / 鎖競爭 / 飢餓（starvation） | |
| 워치독 | 看門狗（watchdog） | |
| 덤프 | dump | |

### Server process, memory, disk and database

| Korean | zh-TW | Note |
|---|---|---|
| GC / 가비지 / Full GC / Minor GC | GC（垃圾回收） / 垃圾 / Full GC / Minor GC | |
| GC 멈춤 / 전체 멈춤 (stop-the-world) | GC 暫停 / 全面暫停（stop-the-world） | |
| Young / Old 영역 | Young／Old 區 | |
| 힙 | heap | glossary term `Heap` |
| 메모리 누수 | 記憶體洩漏 | never 泄漏 |
| 캐시 / 캐시 미스 / 콜드 캐시 / 캐시 스탬피드 | 快取 / 快取未命中（cache miss） / 冷快取 / cache stampede | |
| 디스크 / 스토리지 | 磁碟 / 儲存裝置 | |
| 동기 쓰기 / fsync | 同步寫入 / fsync | |
| IOPS / 처리량 한도 | IOPS / 處理量上限 | |
| 버스트 크레딧 | burst credit（突發額度） | glossary term `Burst credit` |
| 백업 / 스냅숏 | 備份 / 快照 | |
| 헤드·플래터 | 讀寫頭、碟片 | |
| 데이터베이스 / 쿼리 / 슬로우 쿼리 | 資料庫 / 查詢 / 慢查詢 | |
| 테이블 / 행 / 컬럼 | 資料表 / 資料列 / 欄位 | Taiwan row = 列, column = 欄 |
| 인덱스 / 풀 스캔 / 실행 계획 | 索引 / 全表掃描 / 執行計畫 | |
| 트랜잭션 | transaction | 交易 is reserved for the in-game trade (거래) |
| 커넥션 풀 | 連線池 | |
| 핫 로우 | 熱點資料列（hot row） | |
| 행 잠금 / 잠금 에스컬레이션 | 資料列鎖定 / 鎖定擴大（lock escalation） | |
| 복제 / 복제본 / 복제 지연 / 주 DB | 複寫 / 複本 / 複寫延遲 / 主 DB | |
| 롤백 (DB) | 回滾（rollback） | player-visible symptom → 回檔 |
| 체크포인트 / 언두 로그 / MVCC | 檢查點 / undo log / MVCC | |
| 장애 전환 / 페일오버 | 容錯移轉（failover） | |
| 스키마 변경 (DDL) | schema 變更（DDL） | |
| 캐시 서버 (Redis 등) | 快取伺服器（Redis 等） | |

### Architecture, operations and observability

| Korean | zh-TW | Note |
|---|---|---|
| 서버 구성 / 운영 / 운영사 | 伺服器架構 / 維運 / 營運商 | |
| 게이트웨이 | 閘道 | |
| 서킷 브레이커 | 斷路器（circuit breaker） | |
| 연쇄 장애 | 連鎖故障 | |
| 장애 | 故障 (a component fails) / 事故 (an incident) | 장애 사례 → 事故案例 |
| 사후 분석 | 事後檢討（postmortem） | |
| 오토스케일링 | 自動擴展（autoscaling） | |
| 배포 / 롤백 배포 | 部署 / 回復部署 | |
| 설정 / 기본값 / 옵션 | 設定 / 預設值 / 選項 | never 設置 / 默認 |
| 로그 / 지표 / 카운터 / 대시보드 / 알림 | log / 指標 / 計數器 / 儀表板 / 警示 | |
| 모니터링 / 관측 | 監控 / 觀測 | |
| 샘플링 / 집계 간격 | 取樣 / 彙總間隔 | |
| 평균 / 중앙값 / 백분위수 / p99 / 꼬리 지연 | 平均值 / 中位數 / 百分位數 / p99 / 尾端延遲 | |
| 이용률 | 使用率 | |
| 합성 측정 | 合成監控（synthetic monitoring） | |
| 과부하 / 병목 / 처리량 | 過載 / 瓶頸 / 處理量 | |
| 제보 / 재현 | 回報 / 重現 | |
| 시뮬레이션 / 실험 / 프리셋 | 模擬 / 實驗 / 預設情境 | |
| GeoIP / TLS 인증서 | GeoIP / TLS 憑證 | |

## 12. Words to watch (Taiwan vs Mainland)

Use the left column. The right column is Mainland usage and must not appear.

資料 (數據) · 程式／程式碼 (程序／代碼) · 預設值 (默認值) · 設定 (設置) · 檔案 (文件, when meaning a file) · 網路 (網絡) · 記憶體 (內存) · 執行緒 (線程) · 伺服器 (服務器) · 封包 (數據包) · 頻寬 (帶寬) · 佇列 (隊列) · 快取 (緩存) · 磁碟 (磁盤) · 協定 (協議) · 演算法 (算法) · 呼叫 (調用) · 非同步 (異步) · 死結 (死鎖) · 排程 (調度) · 逾時 (超時) · 壅塞 (擁塞) · 閘道 (網關) · 交換器 (交換機) · 負載平衡 (負載均衡) · 資料列／欄位 (行／列) · 複寫 (複制) · 憑證 (證書) · 行動網路 (移動網絡) · 影片 (視頻) · 訊息 (消息) · 品質 (質量) · 支援 (支持) · 介面 (界面／接口) · 連結 (鏈接) · 位址 (地址, for IP) · 位元組 (字節) · 除錯 (調試) · 取樣 (採樣) · 儲存 (存儲) · 基地台 (基站) · 當機 (宕機) · 回報 (反饋) · 用戶端 (客戶端).

## 13. SEO notes

Phrases people in Taiwan actually type when a game lags or when they investigate server lag:

1. 遊戲 lag 原因
2. 遊戲 lag 怎麼辦
3. 線上遊戲 lag
4. 遊戲延遲很高
5. 網路延遲 原因
6. ping 很高／ping 值過高
7. 跳 ping
8. 掉封包／封包遺失 怎麼解決
9. 遊戲卡頓
10. 角色瞬移
11. 一直被拉回
12. 伺服器 lag
13. 遊戲一直斷線
14. 連不上伺服器／無限讀取
15. 輸入延遲
16. 分享器 延遲／bufferbloat
17. tick rate
18. netcode 網路同步
19. TCP 重傳
20. 延遲補償

How they are used:

- **Site name** 遊戲 Lag 白皮書 contains 遊戲 lag. **Full title** 遊戲 Lag 白皮書：線上遊戲 lag、延遲的原因與負責團隊 adds 線上遊戲 lag, 延遲 and 原因 in one natural phrase.
- **Meta description** opens with 逐層拆解線上遊戲 lag 的原因 and names three symptoms in player words (畫面卡頓、角色瞬移、斷線), then the layered path (from the player's screen to the server database), the hands-on experiments, the MMO focus, the owning teams and trustworthy sources.
- **Cause pages**: `{原因名稱}（{English name}）：遊戲 lag 原因 | 遊戲 Lag 白皮書`.
- **Symptom pages**: `遊戲{症狀}的原因：lag 症狀成因與負責團隊 | 遊戲 Lag 白皮書`, which yields real queries such as 遊戲卡頓的原因、遊戲斷線的原因、遊戲瞬移的原因、遊戲輸入延遲的原因.
- **Keywords** (`build.py`): 遊戲 lag, lag 原因, 遊戲延遲, ping 過高, 跳 ping, 封包遺失, 掉封包, 卡頓, 瞬移, 拉回, 輸入延遲, 斷線, 伺服器 lag, netcode, TCP 重傳, 遊戲開發團隊, 基礎設施團隊.
- Do not stuff keywords into body text. Player slang (跳 ping、掉封包、很 lag) belongs in aliases, report guidance and SEO strings; explanatory prose uses the terms in §11.

## Decisions added during review

Settled by the reviewers and translators after the first pass. Where a row differs from an earlier section, this row wins.

| Korean | zh-TW (Taiwan) | Note |
|---|---|---|
| 왕복 / 왕복 시간 | 往返 / 往返時間（RTT） | Everywhere, titles and sims included. 來回 only for "back and forth" (在 60 與 30 之間來回切換). |
| NAT 매핑 / 매핑 | NAT mapping / mapping | Not NAT 對應. First mention in a chapter may add （位址與 port 的對應紀錄）. Cause hn-nat = NAT mapping 過期. |
| 원인의 `c` (왜 → 그러면 → 화면에서는) | no final 。 | Fragment chain like `chk`; two statements inside one field are separated by 。 or ；. Replaces the `c` item in §2 Prose. |
| 숫자 감각 (표·실험 이름) | 數值參考 | Same as 수치 감각. Not 數字感. |
| 멈춤 / 멈추다 | 定格 / 停住 | 定格 only as the symptom name. A server, tick, thread or screen that simply stops → 停住; GC or OS pause → 暫停. |
| 로딩 중 | 載入中 | 로딩 화면 / 로딩바 stay 讀取畫面 / 讀取條; symptom 無限讀取 unchanged. |
| 06 TCP 재전송 해부 | 06 TCP 重傳剖析 | Chapter name in the nav and in every cross-reference. |
| 패링 / 가드 | 格擋（parry） / 防禦 | Not 彈反. |
| 보스 / 월드 보스 / 레이드 보스 | 王 / 世界王 / 團隊副本王 | Not Boss / 頭目. |
| 버스트형 인스턴스 | 突發型（burstable）執行個體 | Later mentions 突發型執行個體. 버스트 크레딧 stays burst credit（突發額度）. |
| 인스턴스 (게임의 채널·인스턴스) | 實例（instance） | Cloud 인스턴스 stays 執行個體; dungeon copy 副本實例. |
| 끊김 수 | 斷線次數 | Not 斷線數. |
| 먼저 부를 곳 | 優先聯絡 | Playbook steps, owner flow, signal table header. The chip label 먼저 stays 先找. |
| 먼저 확인할 곳 (진단 도우미) | 優先確認 | |
| 빌드 (클라이언트 빌드) | 版本 | In playbooks and triage text. 디버그·릴리스 빌드 → debug／release 建置. |
| (경로) MTU 탐색 | （路徑）MTU 探索 | Also the tcp_mtu_probing toggle. |
| 텔레포트 (게임 내 이동) | 傳送 | 瞬移 is only the symptom. |
| 복제 (Unreal) / 복제 (DB) | 複製（replicate） / 複寫 | |
| HDD 탐색 | 尋軌 | |
| 전지적 시점 | 上帝視角 | |
| 앱 | App | |
| 비유 / 핵심 (태그) | 比喻 / 重點 | |
| 에스컬레이션 / 티켓 | 升級處理（escalation） / 工單 | |
| 사후 분석 보고서 | 事後檢討報告 | 사후 분석 stays 事後檢討（postmortem）. |
| 카나리 배포 / 대조군 / 기능 플래그 | 金絲雀（canary）部署 / 對照組 / 功能開關 | |
| 트래픽 지문 | 流量特徵 | |
| 서비스 디스커버리 / 헬스체크 | 服務探索 / 健康檢查 | |
| 샤드(서버군) / 엣지 | shard（伺服器群） / 邊緣（edge） | |
| 대역 외 (out-of-band) / BGP 광고 / IP 대역 | 頻外（out-of-band） / BGP 宣告 / IP 網段 | |
| 경쟁 상태 / 리졸버 / 공용 DNS | 競爭條件 / 解析器（resolver） / 公用 DNS | |
| 결제사 / 파티장 / 확장팩 | 金流業者 / 隊長 / 資料片 | |
| 국내 (한국) | 韓國 | When the Korean means Korea, name it. |
| 팀·담당 joiner (`export.cjs`) | {0}（{1}） | 遊戲開發團隊（伺服器開發）. |
| 저스트 회피 | 完美閃避 | |
| 탭 타겟 / 논타겟 | Tab 鎖定 / 非鎖定 | |
| 방치형 / 컷신 / 정각 이벤트 | 放置型 / 過場動畫 / 整點活動 | |
| 멀티 클라이언트 제한 / 등장·퇴장 알림 / 기준 스냅샷 | 多開限制 / 出現通知／消失通知 / 基準快照 | |
| PC방 | 網咖 | |
| 이미 접속 중 | 「帳號已登入」 | |
