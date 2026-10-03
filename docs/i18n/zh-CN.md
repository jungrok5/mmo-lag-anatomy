# 简体中文 (zh-CN): terminology and style guide

Target reader: game developers, planners (策划), artists (美术), QA, PMs and SRE/ops engineers in mainland China. Write the way a senior mainland game-server or ops engineer writes an internal technical document: mainland vocabulary (服务器, 数据包, 内存, 线程, 网络, 默认, 数据库), plain and precise, no machine-translation tone, no Korean word order. Read `docs/I18N_GUIDE.md` first; this file adds the zh-CN decisions. Every term in the tables below is fixed: use it the same way in every group (causes, body, sims, cases, refs, UI).

**One dictionary per language.** The same Korean string is a single key for the whole language, whatever group it sits in. Many short strings already have a zh-CN translation in `data`, `glossary`, `site` or `ui-kit` (for example `서버`, `지연`, `손실`, `멈춤`, `원인`, `범위`, `확인할 곳`, `나쁨`, `주의`). When you meet the same Korean string in your group, copy the existing Chinese exactly. `node tools/i18n.cjs check zh-CN --conflicts` lists every Korean string that got two different translations; the count must stay 0.

---

## 1. Site name and titles

| Korean | zh-CN | Note |
|---|---|---|
| 게임 렉 백서 | **游戏卡顿白皮书** | Site name. 卡顿 is the word mainland players and developers use for "lag" in general (游戏卡顿、服务器卡顿、卡顿原因) and the phrase they search for. 延迟 is taken by the latency factor (지연), so it is not the site name. |
| 게임 렉 백서: 온라인 게임 렉 원인과 해결 담당 | 游戏卡顿白皮书：网络游戏卡顿、延迟的原因与负责团队 | Full title (`build.py`). |
| 게임 렉 \<span\>백서\</span\> (OG image) | 游戏卡顿\<span\>白皮书\</span\> | |
| 렉 (generic "lag") | 卡顿 | 게임 렉 → 游戏卡顿, 서버 렉 → 服务器卡顿, 렉 원인 → 卡顿原因, 렉 제보 → 卡顿反馈, 렉을 느낀다 → 感到卡顿 / 觉得卡. Where the Korean clearly means network latency only, 延迟 is fine (핑이 높아 렉 → ping 高、延迟大). Do not write "lag" in running text. |
| 온라인 게임 | 网络游戏 | Mainland usage (网游). Not 在线游戏. |
| 백서 / 이 백서 | 白皮书 / 本白皮书 | |
| 원본 (the interactive page with figures and sims) | 完整版; long form 含图示和实验的完整版 | 원본 카드 → 原卡片 / 完整版中的卡片, 원본 장 → 完整版章节. |
| 원문 (source language; original article of a case) | 原文 | 원문은 한국어 → 原文为韩语. |
| 텍스트 판 | 纯文本版 | 전체 텍스트 판 → 完整纯文本版. |
| 용어 사전 | 术语表 | |
| 증상 사전 | 症状词典 | |
| 참고 문헌 | 参考文献 | |
| 출처 | 出处 | 출처 {0}건 → 出处 {0} 条. Publisher (발행처) → 发布方. |

Page titles keep the ASCII separator ` | ` exactly (`… | 游戏卡顿白皮书`). Between a title and its subtitle use the full-width colon `：`.

---

## 2. Register and voice

- **Prose** (cause `s`, `c`, `num`, `more`, `act`, body text, symptom `what`/`looks`/`tell`, glossary definitions, cases): neutral written Chinese (书面语) in full sentences ending with `。`. Korean 합니다체 politeness has no verb form in Chinese; carry it with a calm, complete, non-slangy tone. No sentence-final particles (啦、哦、呢、吧), no internet slang in prose. Player slang is allowed only inside quoted player words and in the fixed symptom names and aliases.
- **Pronouns.** Prefer sentences without a pronoun. When you must address the reader use 你, never 您, never a 你/您 mix. Avoid 我们 unless the source says 우리 (우리 계약 → 我方合同).
- **The Korean 나 / 내 (the player's own side).** In short labels and in the player's own voice (who values, report checklist, quoted complaints) use 我: 只有我、我的角色. In explanatory prose use 自己(的): 自己的画面、自己的角色、自己的输入、自己的电脑. Do not scatter 我的 through explanatory sentences.
- **`chk` fields (`look`, `yes`, `no`) and table cells**: terse bullet style, the Chinese counterpart of the Korean noun endings (~함, ~봄, ~임). No subject, no 了/的/呢 at the end, no final `。` when the source has none. Separate statements inside one field with `。` or `；`. Examples:
  - look: `GC 日志的停顿时长，与服务器 tick 耗时曲线对照`
  - yes: `tick 耗时冲高的时刻与 GC 停顿重合，冲高持续时间与停顿时长相近`
  - no: `GC 日志里没有长停顿而 tick 仍冲高，则是锁、同步调用等其他原因`
- **Short labels** (layer `short`, who/when values, graph-shape names, buttons, stat labels): no final punctuation, 2 to 10 characters where possible.
- **Plain words for non-experts.** Many readers are planners, artists, QA or PMs. The first time a term appears in a chapter, explain it once in parentheses with the industry term, never a metaphor: 抖动（到达间隔的波动）、队头阻塞（HOL blocking，前面一个包没到，后面的都得等）.
- **No em-dash asides.** Never insert an explanation in the middle of a sentence with `——`, `—` or `–`. Use full-width parentheses `（…）`, a colon, or a separate sentence.
- **No "not A but B".** Do not write 不是 A，而是 B / 并非 A，而是 B / 而非 / 与其说 A，不如说 B / 不在于 A，而在于 B. State B directly. If A must be mentioned, give it its own sentence or say it after B: `线路本身正常，是接收方程序没能及时读取。` Korean `A보다 B` (B rather than A) may become 比起 A，B 更…, or 和 A 关系不大.
- **Symptom names are only for symptoms** (see §4.1). When Korean uses 멈춘다 for a server, thread, GC or process, write 停住 / 停顿 / 阻塞, never the symptom name 卡住. The same for 끊긴다: a line or connection being cut is 中断 / 断开; the symptom 접속 끊김 is 掉线; 뚝뚝 끊김 is 一卡一卡. Also avoid 快进、拉回、瞬移 as ordinary verbs.
- **Machine-translation tells to avoid**: 进行 + verb (进行检查 → 检查), 对……进行……, 通过……来……, 被 passives where an active works, 的 chains (三个以上的), 一个 before every noun, 关于……, ……的话 in conditionals (写 如果……就…… or just the clause), 使得, 从而 in every sentence, 该 used as a pronoun everywhere, calqued Korean topic structure (对于 X 来说 at the start of every sentence). Split long Korean sentences; Chinese prefers shorter clauses joined by `，`.
- **Keep Korean facts as facts.** Korean carriers (SKT、KT、LG U+), Korean agencies and examples (首尔 ↔ 东京) stay. Do not swap in Chinese examples such as 电信、联通、移动.
- **Mainland vocabulary, never Taiwan forms**: 服务器 (伺服器), 数据包 (封包), 内存 (记忆体), 线程 (执行绪), 进程 (行程), 程序 (程式), 代码 (程式码), 网络 (网路), 默认 (预设), 数据 (资料), 信息 (资讯), 质量 (品质), 视频 (影片), 屏幕 (萤幕), 界面 (介面), 接口 (介面), 文件 (档案), 字节 (位元组), 缓存 (快取), 队列 (伫列), 登录 (登入), 链接 (连结), 支持 (支援), 调试 (除错), 实时 (即时), 优化 (最佳化), 硬盘 (硬碟), 带宽 (频宽), 鼠标 (滑鼠), 运营商 (电信商).

---

## 3. Mechanics

### Punctuation

- Chinese text uses full-width punctuation: `，。：；？！、（）“”‘’……`.
- Quotes: `“ ”` (outer) and `‘ ’` (inner). Never 「」 or 『』 (Taiwan/Japan style). Straight `"` only inside code.
- Parentheses: full-width `（ ）` in Chinese sentences, including around English or numbers: `队头阻塞（HOL blocking）`, `显示器一帧（60 Hz）`. Half-width `( )` only inside code, commands, Markdown link syntax, or when the whole parenthetical sits in an all-Latin context such as an English name column.
- Korean `·` between parallel items becomes `、` in prose (지연·지터·손실 → 延迟、抖动、丢包). In short labels and fixed names use `/` without spaces (와이파이·공유기 → Wi-Fi/路由器, 씹힘·롤백 → 吞操作/回档). Never keep `·` as a list separator (in Chinese `·` is the name separator for foreign names). The ` · ` used as a UI separator between metadata items (site footers, crumbs) stays as it is in the source.
- Korean `…` → `……`. Arrows `→`, `↔` stay.
- Ranges: half-width `~` with no spaces between numbers: `0.2~0.5 秒`, `1~5 m`, `80~90%`. In words: 수~수십 ms → 几到几十 ms, 몇 초~몇 분 → 几秒到几分钟.
- Slash lists in the source (`나만 / 파티원도 / …`) keep ` / ` with spaces.

### Spacing (mixed Chinese, Latin and digits)

Follow the convention of mainland cloud and developer docs (Tencent Cloud, Alibaba Cloud, Microsoft Learn zh-cn):

- Put one half-width space between Chinese characters and Latin letters or Arabic digits: `TCP 重传`, `228 个原因`, `ping 值 150 ms`, `Linux 默认`.
- No space between Chinese characters and full-width punctuation, and no space on either side of full-width punctuation: `延迟（latency）`, `丢包、抖动`.
- Space between a number and its unit, Latin or Chinese: `150 ms`, `1 Gbps`, `1,500 字节`, `20 tick`, `60 FPS`, `60 Hz`, `5 秒`, `2 倍`, `10 分钟`. No space before `%` and `°`: `1%`, `0.1%`.
- Placeholders: treat `{0}` like the thing it stands for. A number or a Latin word gets spaces (`{0} 个原因`, `更新于 {0}`); a Chinese name does not (`游戏中出现{0}（{1}）`, `{0}的原因`).

### Numbers

- Values never change. Decimal point `.`; keep the source's thousands comma (`1,500`, `1,000 倍`).
- Korean 만 / 억 → 万 / 亿 with the same digits: 1만 → 1 万, 수천 → 数千, 수만 → 数万.
- Spelled-out Korean counts become Chinese numerals or digits as reads naturally (두세 번 → 两三次). The `check` number warning is expected when Korean 1초에 becomes 每秒 (`1초에 20번` → 每秒 20 次); review such warnings, do not force a `1`.
- LTE → 4G (mainland users call LTE 4G); 5G stays.

### Measure words (the Chinese answer to the plural rule)

Chinese nouns do not inflect, so short fragments with a number never have agreement problems. Always put the right measure word between the number and the noun, and use the same one every time:

| Thing | Measure word | Example |
|---|---|---|
| causes, terms, symptoms, factors, players | 个 | `{0} 个原因`, `{1} 个术语`, `四个因素` |
| sources, references, entries, rules, log lines | 条 | `出处 {0} 条`, `共 {0} 条资料` |
| publishers, companies | 家 | `来自 {1} 家发布方` |
| layers | 层 | `13 层` |
| chapters | 章 | `见“同步方式”一章` |
| times (occurrences) | 次 | `每秒 20 次` |
| machines, servers, PCs | 台 | `两台服务器` |
| topics | 个 | `3 个专题` |

### English words kept in English

- Acronyms stay upper case: TCP, UDP, NAT, CGNAT, MTU, MSS, RTO, SACK, TLP, RACK-TLP, ECN, BGP, QoS, SQM, DDoS, LB, NIC, RSS, PPS, IOPS, GC, OOM, DB, MVCC, AOI, FPS, VRAM, VRR, NPC, BOSS, MMO, RTT, p50/p95/p99.
- Common nouns that mainland engineers say in English are written in lower case in running text: `tick`, `socket`, `ping`, `worker`, `backlog`, `keepalive`, `swap`, `thin stream`, `pacing`, `bug`, `dump`, `undo log`. Capitalize the first letter only when the word starts a heading, card title or short label (`Socket 与协议`, `Tick/线程`).
- Product, tool, OS and company names stay in their original form: Linux, Windows, Android, iOS, Source 引擎 (Valve's Source engine), Unreal Engine, Unity, Redis, MySQL, PostgreSQL, AWS, Azure, Google Cloud, RIPE Atlas, Roblox. Commands, options, counters, metric and config names stay exactly (`ss -ti`, `TcpExtTCPLostRetransmit`, `net.core.somaxconn`, `pg_stat_statements`, `TCP_NODELAY`, `SO_KEEPALIVE`).
- Place names use standard mainland forms: 首尔、东京、香港、新加坡、法兰克福、美国西海岸.

### Format rules (repeat of the guide, still the most common errors)

- Keep every `{0}`, `{1}` …; reorder freely.
- Keep every HTML tag with the same count; translate only text, `aria-label`, `title`, `alt`. Attribute translations (ctx ending in `@aria-label` etc.) must not contain `"` `<` `>`; curly quotes `“”` are fine there.
- Never translate cause IDs, chapter/section IDs, case/playbook IDs, URLs, `%SITE%`, code inside `<code>`.

---

## 4. Terminology

### 4.1 Symptom names (fixed, identical everywhere)

These 11 names are what mainland players say and search for. Use them exactly, in every group, including sims and body tables. Keep the `/` inside the three two-part names. If a name reads like a verb in a sentence, add 现象 or restructure (`出现快进现象`, `表现为拉回`); do not change the name or wrap it in quotes inconsistently.

| id | Korean | **zh-CN name** | Aliases (`alias`) | Note |
|---|---|---|---|---|
| stutter | 뚝뚝 끊김 | **一卡一卡** | 卡顿、不流畅、像掉帧 | Players describe it as 画面一卡一卡的. 卡顿 alone is the generic "lag" word, so it is only an alias here. |
| teleport | 순간이동 | **瞬移** | 闪现、跳位、顿一下就跳走 | 人物瞬移. |
| rubber | 고무줄 | **拉回** | 被拉回去、回弹（rubber banding）、位置回退 | 走路被拉回 is the standard player phrase. |
| burst | 몰아치기 | **快进** | 唰唰唰、倍速播放、一下子全结算 | 卡完之后像快进一样. |
| slowmo | 슬로우모션 | **慢动作** | 整个世界变慢、什么都慢吞吞 | |
| delay | 입력 지연 | **操作延迟** | 反应慢、迟钝、没手感 | Also used where Korean says 입력 지연 for V-Sync, frame generation etc. Keep 输入 for input data (내 입력 → 自己的输入, 입력 중복 전송 → 输入重复发送). |
| freeze | 멈춤 | **卡住** | 画面冻结、定住不动、无响应 | Symptom only. A stopped server/thread/GC is 停住 / 停顿 / 阻塞. |
| dropped | 씹힘·롤백 | **吞操作/回档** | 吞技能、物品回退、交易失败 | 스킬 씹힘 → 吞技能. 回档 is the player word for losing progress; the DB operation stays 回滚. |
| disconnect | 접속 끊김 | **掉线** | 被踢下线、断线、与服务器的连接已断开 | A client crash without a message is 闪退. |
| noconnect | 접속 불가·무한 로딩 | **连不上/无限加载** | 登录不上、一直在加载 | 로딩바 → 进度条. |
| invisible | 안 보임·유령 개체 | **隐身/幽灵实体** | NPC 不见了、透明人、死掉的怪还站着 | 卡隐身 is the MMO player phrase. 개체 is always 实体. |

Non-symptom look-alikes: 멈칫 (a brief hitch, not the symptom) → 顿一下 / 短暂停顿; 짧은 멈춤 → 短暂停顿; 끊김 (a cut) → 中断; 튄다 (a value spikes) → 跳变 / 冲高 / 飙升; 핑이 튄다 → 跳 ping / ping 飙升; 핑이 들쭉날쭉 → ping 忽高忽低.

### 4.2 The four factors

| id | Korean | zh-CN | `how` | Note |
|---|---|---|---|---|
| lat | 지연 | **延迟** | 数据包来得晚 | Latency in general. 왕복 시간 → 往返时间. |
| jit | 지터 | **抖动** | 数据包时快时慢 | First mention per chapter: 抖动（到达间隔的波动）. Chapters #sync and #partial already explain it in body text, so cause cards rendered there use 抖动 alone. |
| loss | 손실 | **丢包** | 数据包根本没到 | 패킷 손실 → 丢包, 손실률 → 丢包率, 진짜 손실 → 真实丢包, 연속 손실 → 连续丢包. |
| stall | 정체 | **停顿** | 某一方停止了计算 | Same word as GC 停顿. 요인 → 因素 (네 가지 요인 → 四个因素). |

### 4.3 Layers and topics (`data.js` layers / extraLayers)

| id | name | short | side |
|---|---|---|---|
| client-game | 客户端游戏进程 | 游戏客户端 | 玩家端 |
| client-os | 客户端操作系统与设备 | 电脑/手机 | 玩家端 |
| home | 家庭网络 | Wi-Fi/路由器 | 玩家端 |
| isp | 公网链路 | 运营商/海外 | 中间链路 |
| dc-net | 数据中心网络设备 | 防火墙/LB | 服务器端 |
| nic | 服务器网卡 | NIC | 服务器端 |
| server-os | 服务器操作系统（内核） | 内核 | 服务器端 |
| socket | Socket 与协议 | TCP/UDP | 两端 |
| server-proc | 服务器游戏进程 | Tick/线程 | 服务器端 |
| memory | 内存 | GC/泄漏 | 服务器端 |
| disk | 磁盘 | IOPS | 服务器端 |
| db | 数据库 | DB | 服务器端 |
| infra | 服务器架构与运维 | 架构/运维 | 服务器端 |
| sync (topic) | 同步设计 | 同步设计 | 设计 |
| partial (topic) | 只有部分人遇到的问题 | 仅部分人 | 范围 |
| retrans (topic) | TCP 重传的根本原因 | TCP 重传 | 原因 |

층 → 层 (13개 층 → 13 层), 주제 → 专题 (3개 주제 → 3 个专题). L1…L13 stay as written. 근본 원인 → 根本原因 in prose, 根因 allowed in tight labels.

### 4.4 Teams, owners and responsibility words

| Korean | zh-CN | Note |
|---|---|---|
| 게임개발팀 | **研发团队** | The game studio's programmers (client + server). |
| 인프라팀 | **运维团队** | Network, systems and DB operations, as in mainland game companies. |
| 외부 | **外部** | |
| 클라이언트 개발 (cli) / short | 客户端开发 / 客户端 | |
| 서버 개발 (srv) / short | 服务器开发 / 服务器 | 游戏服务器开发 is the usual job title. Short `서버` is a shared key used in many sims for "the server", so it must stay 服务器. |
| 네트워크 인프라 (net) / short | 网络运维 / 网络 | |
| 서버 인프라 (sys) / short | 系统运维 / 服务器/OS | |
| DB 인프라 (dba) / short | 数据库运维 / DB 服务器 | |
| 외부 (ext) short | 玩家/运营商/云厂商 | |
| 담당 | 负责方 | 담당 팀 → 负责团队. |
| 주 담당 | **主责** | "The side that removes the root cause." |
| 함께 | **配合** | "The side that also has work to do." |
| {팀} 할 일 | {团队}要做的事 | `研发团队要做的事`. |
| 담당 코드 | 负责方代号 | The owner IDs `cli`, `srv`, `net`, `sys`, `dba`, `ext` stay in Latin. |
| `{0}·{1}` (team·owner join in exports) | `{0}·{1}` | Renders 研发团队·服务器开发. Here `·` is a hierarchy mark, the one place it stays. |
| 담당 구분 | 分工 | |
| 경계가 애매할 때 | 边界不清时 | |
| 넘길 때 챙길 정보 | 转交时要附上的信息 | |
| 완화 / 우회 | 缓解 / 绕行 | |
| 클라우드 사업자 | 云厂商 | |
| 통신사 | 运营商 | 통신사망 → 运营商网络, 통신사 간 연결 → 运营商互联. |
| 유저 | 玩家 | 유저 쪽 → 玩家侧. |

### 4.5 who / when values

| who id | zh-CN | when id | zh-CN |
|---|---|---|---|
| me | 只有我 | always | 一直 |
| home | 同一家庭 | peak | 晚高峰 |
| region | 特定地区/运营商 | event | 人多的时候 |
| zone | 特定地点/分线 | login | 刚登录/维护结束后 |
| server | 全服 | idle | 挂机一段时间后 |
| feature | 仅特定功能 | random | 偶尔随机 |
| onechar | 只有某个角色看起来异常 | periodic | 固定周期 |
| oneclient | 双开时只有一个客户端 | uptime | 开得越久越严重 |
| | | moving | 移动中/切换地图时 |
| | | action | 做特定操作时 |

Card labels: 누가 겪나 → 谁会遇到, 언제 → 何时出现.

### 4.6 Graph shapes (`sigs`) and check-by (`chkBy`)

| sig id | Korean | zh-CN |
|---|---|---|
| periodic | 일정 주기로 튐 | 周期性尖峰 |
| random | 가끔 무작위로 튐 | 偶发随机尖峰 |
| step | 어느 순간부터 계단처럼 올라감 | 某一时刻起台阶式上升 |
| ramp | 서서히 오름 | 缓慢爬升 |
| sawtooth | 서서히 오르다 뚝 떨어짐 | 缓慢上升后骤降 |
| peak | 특정 시간대에만 높음 | 特定时段偏高 |
| load | 인원·부하를 따라 오름 | 随人数/负载上升 |
| ceiling | 한도에 닿아 평평해짐 | 触顶后走平 |
| high | 처음부터 늘 높음 | 一直偏高 |
| outlier | 일부만 높음 | 仅部分偏高 |
| gap | 끊겼다가 몰아서 | 断流后集中到达 |
| drop | 연결이 한꺼번에 끊김 | 连接成批断开 |
| surge | 접속·점검 직후 폭증 | 开服/维护后激增 |

그래프 모양 → 监控图形态 (그래프 모양 13가지 → 13 种监控图形态); 그래프 (monitoring) → 监控图 / 曲线; 스파이크 → 尖峰.

| chkBy | zh-CN (full) | Short mention in prose |
|---|---|---|
| ops | 运维工具即可确认（无需游戏代码） | 运维工具 |
| code | 需要游戏服务器/客户端的日志和指标 | 游戏日志与指标 |
| user | 需在玩家侧环境确认 | 玩家侧 |

### 4.7 Fixed card and page labels (shared keys: `site`, `ui-app`, body)

| Korean | zh-CN |
|---|---|
| 왜 / 그러면 / 화면에서는 | 起因 / 结果 / 画面表现 |
| 증상 / 요인 | 症状 / 因素 |
| 수치 감각 | 数值参考 |
| 그래프에서는 | 监控图上 |
| 확인할 곳 / 이러면 맞음 / 이러면 아님 / 확인 수단 | 查看位置 / 确认依据 / 排除依据 / 确认手段 |
| 더 알아보기 | 深入了解 |
| 실제 사례 / 실제 장애 사례 | 真实案例 / 真实故障案例 |
| 무슨 일 / 원인 / 배울 점 / 관련 원인 / 원문 | 经过 / 原因 / 经验教训 / 相关原因 / 原文 |
| 원인 ID | 原因 ID |
| 팀 / 범위 / 코드 | 团队 / 范围 / 代号 |
| 목차 | 目录 |
| 상황별 절차 | 分场景排查流程 |
| 증상별로 찾기 | 按症状查找 |
| 좋음 / 주의 / 나쁨 | 良好 / 注意 / 差 |
| 직접 해보기 / 이렇게 해보세요 / 상황 불러오기 | 动手试试 / 可以这样试 / 载入场景 |
| 실험 / 시뮬레이션 | 实验 / 模拟 |
| 링크 복사 | 复制链接 |
| 다른 말 | 又称 |
| 준비 중입니다. | 准备中。 |

### 4.8 Chapter titles (recommended for body translators)

| Korean | zh-CN |
|---|---|
| 렉을 만드는 네 가지 요인 | 造成卡顿的四个因素 |
| 패킷의 이동 경로: 입력에서 서버 DB까지 | 数据包的传输路径：从输入到服务器数据库 |
| 렉 실험실 | 卡顿实验室 |
| 증상 사전 | 症状词典 |
| 동기화 방식과 체감 | 同步方式与体感 |
| 한 명만 느릴 때, 한쪽만 이상할 때 | 只有一个人卡、只有一边异常时 |
| TCP 재전송: 생기는 원인과 지연이 커지는 이유 | TCP 重传：成因与延迟变大的原因 |
| 게임개발팀과 인프라팀의 담당 | 研发团队与运维团队的职责 |
| 집 네트워크: 와이파이·공유기·모바일망 | 家庭网络：Wi-Fi、路由器、移动网络 |
| 인터넷 회선: 통신사망과 장거리 구간 | 公网链路：运营商网络与长途链路 |
| 서버 네트워크 카드(NIC) | 服务器网卡（NIC） |
| 소켓과 프로토콜: TCP, UDP, 소켓 옵션 | Socket 与协议：TCP、UDP、socket 选项 |
| 서버 게임 프로세스: 틱과 스레드 | 服务器游戏进程：tick 与线程 |
| 이 층에서 렉을 만드는 원인 | 这一层导致卡顿的原因 |
| 진단 도우미 | 诊断助手 |
| 관측으로 판정하기 | 用观测数据判定 |
| 판정 흐름 / 판정 신호표 / 그래프 모양으로 찾기 | 判定流程 / 判定信号表 / 按监控图形态查找 |
| 범위 → 시점 → 계층 | 范围 → 时间点 → 层级 |
| 숫자 읽는 법 | 数字怎么看 |
| 사례와 절차 | 案例与流程 |
| 패치 이후 렉 / 해외 국가 추가 | 版本更新后卡顿 / 新增海外国家/地区 |
| 렉 제보 가이드 | 卡顿反馈指南 |

### 4.9 Sync methods (동기화 방식)

| Korean | zh-CN |
|---|---|
| 동기화 방식 / 동기화 설계 / 넷코드 | 同步方式 / 同步设计 / 网络同步 |
| 요청-응답 | 请求-响应 |
| 상태 동기화 + 보간 | 状态同步 + 插值 |
| 클라 예측 + 서버 보정 | 客户端预测 + 服务器校正 |
| 지연 보상 | 延迟补偿 |
| 명령·목적지 동기화 | 指令/目的地同步 |
| 이벤트 예약 | 定时事件 |
| (결정론적) 락스텝 | （确定性）帧同步 |
| 롤백 (sync method) / 롤백 넷코드 | 回滚 / 回滚网络代码 |
| 클라이언트 권위 / 권위 서버 | 客户端权威 / 权威服务器 |
| 선입력 / 선입력 허용 시간 | 预输入 / 预输入时间窗 |
| 선연출 | 预表现 |
| 되감기 (lag compensation) | 回溯 |
| 판정 / 판정 구간 | 判定 / 判定窗口 |
| 패링 판정 | 弹反判定 |
| 스킬 큐 / 연속 행동 | 技能队列 / 连续操作 |
| 따라잡기 | 追赶（lockstep/rollback 语境可用 追帧） |

### 4.10 Glossary and TERMS.md terms

Glossary headwords (`glossary.js`) are fixed as below; use the same words in all prose. The English name column is not translated.

| Korean | zh-CN | Note |
|---|---|---|
| 핑 | ping 值 / ping | ping 值 as a quantity; ping in compounds (跳 ping, ping 高). The command stays `ping`. |
| 지연 / 왕복 | 延迟 / 往返 | |
| 지터 | 抖动 | |
| 패킷 | 数据包 | 包 in tight compounds (包间隔, 发包频率). |
| 패킷 손실 | 丢包 | |
| 대역폭 | 带宽 | |
| 틱 / 틱레이트 / 틱 예산 / 틱 간격 | tick / tick 率 / tick 预算 / tick 间隔 | 20틱 서버 → 20 tick 服务器. 틱 예산 초과 → tick 超出预算. |
| 프레임 / 프레임 타임 / FPS | 帧 / 帧耗时 / FPS | 프레임 드랍 → 掉帧. |
| 스냅샷 / 델타 압축 | 快照 / 增量压缩 | |
| 보간 / 보간 버퍼 | 插值 / 插值缓冲 | |
| 외삽 | 外推 | Dead reckoning → 航位推测 if the source names it. |
| 클라이언트 예측 | 客户端预测 | |
| 서버 보정 | 服务器校正 | Reconciliation. |
| 지연 보상 | 延迟补偿 | |
| 권위 서버 | 权威服务器 | |
| 락스텝 | 帧同步 | Deterministic lockstep → 确定性帧同步. |
| 서버 입력 버퍼 | 服务器输入缓冲 | |
| 리슨 서버 | Listen Server | 방장 → 房主. |
| 페이즈 | 位面 | Phasing (WoW usage). |
| 롤백 넷코드 | 回滚网络代码 | |
| 롤백 (DB) | 回滚 | Player-facing loss of progress is 回档. |
| 선입력 / 선연출 | 预输入 / 预表现 | |
| 신뢰성 UDP | 可靠 UDP | KCP, ENet stay. |
| HOL 블로킹 | 队头阻塞 | First mention: 队头阻塞（HOL blocking）. |
| RTO | RTO（重传超时） | 재전송 타이머 → 重传定时器. |
| 재전송 / 재전송률 | 重传 / 重传率 | 빠른 재전송 → 快速重传. |
| 불필요한 재전송 | 虚假重传 | Spurious retransmission. |
| TLP / RACK-TLP / SACK | TLP / RACK-TLP / SACK（选择性确认） | 선택적 ACK → 选择性确认. |
| thin stream | thin stream | Keep English. |
| 꼬리 손실 / tail loss | 尾部丢包 | |
| in-flight (아직 ACK를 받지 못한 패킷) | 已发出未确认的数据包（in-flight） | |
| Nagle 알고리즘 | Nagle 算法 | |
| 지연 ACK | 延迟 ACK | |
| ACK(수신 확인) | ACK（确认） | |
| 소켓 / 소켓 버퍼 / 소켓 옵션 | socket / socket 缓冲区 / socket 选项 | |
| keepalive / RST / TIME_WAIT | keepalive / RST / TIME_WAIT | |
| 하트비트 | 心跳 | |
| 타임아웃 / 유휴 타임아웃 | 超时 / 空闲超时 | 유휴 연결 → 空闲连接. |
| 혼잡 / 혼잡 윈도우 / 수신 윈도우 / 윈도우 | 拥塞 / 拥塞窗口 / 接收窗口 / 窗口 | 윈도우 크기·스케일 → 窗口大小、窗口缩放. |
| 제로 윈도우 / 제로 윈도우 프로브 | 零窗口 / 零窗口探测 | |
| 시퀀스 번호 | 序列号 | |
| 단편화 / 프래그먼트 (IP) | 分片 | Memory fragmentation → 内存碎片. |
| 최대 세그먼트 크기 | 最大报文段长度（MSS） | |
| MTU 블랙홀 | MTU 黑洞 | |
| NAT / NAT 테이블 | NAT / NAT 表 | |
| CGNAT | CGNAT（运营商级 NAT） | |
| SNAT / NAT 게이트웨이 | SNAT / NAT 网关 | |
| 세션 테이블 / conntrack 테이블 | 会话表 / conntrack 表 | 연결을 추적한다 → 跟踪连接; 추적 항목이 만료된다 → 跟踪条目过期. |
| 버퍼블로트 | 缓冲区膨胀 | |
| SQM / QoS | SQM / QoS | |
| 피어링 | 对等互联 | |
| BGP | BGP | 경로 → 路由 / 路径. |
| 우회 경로 / 병목 구간 | 绕行路径 / 瓶颈 | |
| DDoS 방어 / 스크러빙 센터 | DDoS 防护 / 清洗中心 | |
| 방화벽 | 防火墙 | |
| 로드밸런서 | 负载均衡器 | LB in labels. |
| 마이크로버스트 / 버스트 | 微突发 / 突发 | 송신 버스트 → 突发发送. |
| 폴리서 / 셰이퍼 | 流量监管 / 流量整形 | |
| 페이싱 | 平滑发送（pacing） | |
| ECN | ECN | |
| LAG (링크 묶음) | LAG（链路聚合） | |
| ECMP 경로 | ECMP 路径 | |
| 업로드 / 다운로드 (회선 방향) | 上行 / 下行 | |
| 무선 채널 | 无线信道 | 와이파이 → Wi-Fi; 모바일망 → 移动网络. |
| 핸드오버 | 基站切换 | |
| 저궤도 위성 인터넷 | 低轨卫星互联网 | |
| NIC / 링 버퍼 / 슬롯 | 网卡 / 环形缓冲区 / 槽位 | 256칸 → 256 个. |
| 인터럽트 / 수신 큐 / 송신 대기열 | 中断 / 接收队列 / 发送队列 | |
| RSS / PPS | RSS / PPS | |
| 커널 | 内核 | |
| backlog / 접속 대기열 | backlog / 连接队列（backlog） | Overflow of the accept queue → 全连接队列溢出 is acceptable where the text is about accept(). |
| 파일 디스크립터 | 文件描述符（fd） | |
| CPU 스틸 | CPU 窃取时间（steal） | |
| CPU 스로틀링 / 주기 / 할당량 | CPU 限流 / 周期（CFS period） / 配额（quota） | |
| 스케줄러 / 스케줄링 / 타임 슬라이스 | 调度器 / 调度 / 时间片 | 스케줄링 대기 → 调度等待. |
| 컨텍스트 스위칭 | 上下文切换 | |
| 스레드 / 메인 스레드 / 워커 스레드 / 스레드 풀 | 线程 / 主线程 / 工作线程 / 线程池 | 워커 스레드 풀 → 工作线程池. |
| 워커 (queueing theory) | worker | |
| 락 / 데드락 / 잠금 경합 | 锁 / 死锁 / 锁竞争 | 행 잠금 → 行锁; 잠금 에스컬레이션 → 锁升级. |
| 동기 호출 / 비동기 I/O | 同步调用 / 异步 I/O | |
| 호출 체인 | 调用链 | |
| AOI / 시야 / 시야 계산 | AOI / 视野 / 视野计算 | 격자(그리드) → 网格, 셀 → 格子. |
| 브로드캐스트 | 广播 | |
| 게임 루프 / 루프 한 번 | 游戏循环 / 一次循环 | |
| 게임 상태 / 서버의 실제 상태 | 游戏状态 / 服务器上的真实状态 | 상태 업데이트 → 状态更新. |
| GC / Full GC / Young·Old 영역 | GC / Full GC / 新生代、老年代 | GC 멈춤 → GC 停顿; GC 전체 멈춤 → GC 全局停顿; 가비지 → 垃圾对象; 수집·회수 → 回收. |
| 힙 | 堆 | |
| 메모리 누수 | 内存泄漏 | |
| 스왑 | swap | 스왑 아웃 → 换出. |
| OOM 킬러 | OOM Killer | |
| 캐시 미스 / 메모리 계층 | 缓存未命中 / 存储层次 | |
| 콜드 캐시 | 冷缓存 | |
| 노이지 네이버 | 邻居干扰（noisy neighbor） | |
| 가상 머신 / 호스트 | 虚拟机 / 宿主机 | |
| 라이브 마이그레이션 | 热迁移 | |
| C-state / 절전 상태 / 절전 해제 | C-state / 省电状态 / 唤醒 | |
| 일시 정지(suspend) / 동결(freeze) | 挂起 / 冻结 | Never the symptom name 卡住. |
| 발열 스로틀링 | 发热降频 | |
| 타이머 해상도 | 定时器精度 | |
| wall clock / monotonic clock | 墙上时钟（wall clock） / 单调时钟（monotonic clock） | |
| 시간 동기화(NTP) | 时间同步（NTP） | |
| IOPS / fsync | IOPS / fsync | fsync(확실히 저장) → fsync（确保落盘）. 디스크에 기록한다 → 写入磁盘 / 落盘. |
| 버스트 크레딧 | 突发积分 | |
| 헤드·플래터 | 磁头、盘片 | |
| 인덱스 / 풀 스캔 / 실행 계획 | 索引 / 全表扫描 / 执行计划 | 컬럼 → 列; 스키마 변경(DDL) → 表结构变更（DDL）. |
| 트랜잭션 / 언두 로그 | 事务 / undo log | |
| 커넥션 풀 | 连接池 | DB 커넥션 → DB 连接. |
| 핫 로우 | 热点行 | 핫 로우 잠금 경합 → 热点行锁竞争. |
| 복제 지연 | 复制延迟 | Everyday word: 主从延迟. 주 DB / 복제본 → 主库 / 从库. |
| 체크포인트 | 检查点 | |
| 장애 전환 | 故障切换 | 페일오버 → 故障切换. |
| MVCC | MVCC | |
| 캐시 | 缓存 | |
| 캐시 스탬피드 | 缓存雪崩 | The source covers mass expiry and cache restarts. When a sentence is specifically about one hot key expiring, 缓存击穿 may be added in parentheses. |
| 게이트웨이 | 网关 | |
| 서킷 브레이커 | 熔断器 | 서킷 브레이커가 열린다 → 熔断. |
| 연쇄 장애 | 级联故障 | |
| 오토스케일링 / 확장 | 弹性伸缩 / 扩容 | |
| 배포 / 롤백 배포 | 发布 / 回滚发布 | |
| 워치독 | 看门狗 | |
| 이용률 | 利用率 | |
| 대기열 / 대기열에 쌓이다 | 队列 / 在队列里堆积、排队 | |
| p99 / 백분위수 / 꼬리 지연 | p99 / 百分位数 / 长尾延迟 | 평균 → 平均值, 중앙값 → 中位数. |
| 합성 측정 | 拨测 | |
| 집계 간격 / 샘플링 | 聚合粒度 / 采样 | |
| 사후 분석 | 故障复盘 | |
| 장애 | 故障 | |
| V-Sync / 가변 주사율 / 프레임 생성 | 垂直同步（V-Sync） / 可变刷新率（VRR） / 帧生成 | |
| VRAM | 显存 | |
| 안티치트 | 反作弊 | 게임 해킹 → 外挂. |
| 오버레이 | 游戏内覆盖层 | |
| 셰이더 컴파일 / 셰이더 캐시 | Shader 编译 / Shader 缓存 | |
| 넷그래프 | 网络状态面板 | |
| GeoIP / TLS 인증서 | GeoIP / TLS 证书 | |
| 게임 가속기 | 游戏加速器 | |

### 4.11 Game and operations vocabulary

| Korean | zh-CN |
|---|---|
| 채널 (MMO instance of a map) | 分线; 2채널 → 2 线; 채널 이동 → 换线 |
| 채팅 채널 | 频道 |
| 서버 전체 | 全服 |
| 필드 / 던전 / 레이드 / 월드 보스 / 공성전 | 野外 / 副本 / 团本 / 世界 BOSS / 攻城战 |
| 파티 / 파티원 / 길드 | 队伍 / 队友 / 公会 |
| 캐릭터 / 몬스터 / 개체 / 캐릭터 모델 | 角色 / 怪物 / 实体 / 角色模型 |
| 스킬 / 시전 / 쿨다운 / 데미지 / 이펙트 / 타격감 / 손맛 | 技能 / 施放 / 冷却 / 伤害 / 特效 / 打击感 / 手感 |
| 인벤토리 / 거래 / 아이템 | 背包 / 交易 / 物品 |
| 로딩 / 로딩바 / 에셋 | 加载 / 进度条 / 资源 |
| 로그인 / 재접속 / 자동 재접속 / 로그인 대기열 | 登录 / 重连、重新登录 / 自动重连 / 登录排队 |
| 점검 / 점검 직후 / 서버 오픈 | 维护 / 维护结束后 / 开服 |
| 패치 / 업데이트 / 핫픽스 | 版本更新 / 更新 / 热修复 |
| 동시 접속 (동접) | 同时在线人数 |
| 저녁 피크 | 晚高峰 |
| 해외 / 국가 추가 | 海外 / 新增国家/地区 |
| 같은 PC에 클라 두 개 | 双开 |
| 가만히 있다 (idle player) | 挂机 |
| 기획·아트·QA·PM | 策划、美术、QA、PM |
| 공유기 / 라우터 | 路由器 |
| 회선 / 유선 | 线路 / 有线 |
| 데이터센터 / IDC | 数据中心 / IDC 机房 |
| 지표 / 로그 / 모니터링 / 대시보드 | 指标 / 日志 / 监控 / 看板 |
| 제보 | 反馈 |
| 영상 녹화 | 录屏 |

---

## 5. SEO notes

Phrases mainland users actually type (Baidu and Google) when a game lags or when engineers investigate server lag:

1. 游戏卡顿原因
2. 网络游戏卡顿怎么解决
3. 游戏延迟高怎么办
4. 游戏跳ping (ping spikes)
5. 游戏丢包怎么解决 / 丢包原因
6. 网络抖动
7. 游戏一卡一卡的
8. 人物瞬移
9. 走路被拉回 (rubber banding)
10. 游戏频繁掉线原因
11. 游戏进不去 / 无限加载
12. 吞技能 / 回档
13. 服务器卡顿排查
14. 游戏服务器延迟
15. 帧同步 状态同步
16. 延迟补偿
17. TCP 重传
18. 晚高峰卡顿

How they are used:

- **Site name** 游戏卡顿白皮书 carries 游戏卡顿 (1, 2).
- **Full title** 游戏卡顿白皮书：网络游戏卡顿、延迟的原因与负责团队 carries 网络游戏卡顿 + 原因 (1, 2) and 延迟 (3, 14).
- **Meta description** opens with a question in player words (网络游戏为什么会一卡一卡、瞬移、掉线？) that matches 7, 8, 10, then names 游戏卡顿、延迟高、丢包 (1, 3, 5) and the teams.
- **Cause pages** use `{原因名}（{English}）：游戏卡顿原因 | 游戏卡顿白皮书`.
- **Symptom pages** use `游戏{症状}的原因：按症状排查卡顿与负责方 | 游戏卡顿白皮书`, which produces 游戏掉线的原因, 游戏瞬移的原因, 游戏拉回的原因 and so on (8, 9, 10, 11, 12).
- **keywords** (`build.py`): 游戏卡顿原因, 游戏卡顿, 游戏延迟高, 跳ping, 丢包, 一卡一卡, 瞬移, 拉回, 操作延迟, 掉线, 服务器卡顿, 网络同步, TCP 重传, 研发团队, 运维团队. In this machine-read list 跳ping is written without a space because that is how people type it; in prose write 跳 ping.
- In body text, use these phrases where they are the natural wording (for example 晚高峰卡顿, 跳 ping, 帧同步、状态同步). Do not stack keywords.

---

## Decisions added during review

| Korean | Simplified Chinese | Note |
|---|---|---|
| 숫자 감각 (the times table, ladder sim name) | 延迟数量级 | One name in body, ui-app, sim-ladder and refs; not 数量级直觉 |
| TCP 재전송 (ch. 06 short name) | TCP 重传 | Nav and in-text links (`06 TCP 重传`); the h2 is TCP 重传：成因与延迟变大的原因 |
| 같은 PC의 두 클라이언트 | 同一台电脑上的两个客户端 | Body heading, ui-app, sim-npcmissing |
| 연결 방식 (report form, sims) | 连接方式 | Not 接入方式 |
| 존 (MMO zone) | 场景 | 존 이동 → 场景切换; 존별 → 各场景; 맵 stays 地图 |
| Pointing to another cause | 看“标题” | Title exactly as that cause's `t` (or without its trailing parenthetical when the Korean drops it). Prose: 请看“标题”. Chapters keep 见“…”一章 |
| 본인 인증 | 实名认证 | Kept after review |
| 저장 (game data) | 存盘 | 캐릭터 저장 / 저장 데이터 → 角色存盘数据 / 存盘数据; not 存档 |
| 턴 (lockstep) | 逻辑帧 | 回合 only for turn-based content (턴제 → 回合制) |
| 탭 타겟 / 논타겟 | Tab 锁定 / 无锁定 | |
| 관심 영역 (AOI) | AOI（兴趣区域） | |
| 튕김 | 闪退 / 掉线 | Client crash 闪退; kicked from server 掉线 |
| 서버 장비·OS (owner short) | 服务器/OS | |
| 입력 지연 (setting value: lockstep, rollback, input lag chain) | 输入延迟 | The symptom stays 操作延迟 |
| 기믹 / 파티 기믹 | 机制 / 需要全队配合的机制 | 보스 예고 → 预警 |
| 등장 / 퇴장 알림 | 出现通知 / 离开通知 | |
| 세션 토큰 / 재연결 유예 | 会话令牌 / 重连保留时间 | |
| 리전 | 区域（region） | 리전 엔드포인트 → 区域端点 |
| 백오프 / 지수 백오프 | 退避 / 指数退避 | |
| 순서 대기 (HOL) | 按序等待 | First mention 按序等待（队头阻塞，HOL blocking） |
| 크기 초과 알림 (ICMP) / 경로 MTU 탐색 | 包过大通知 / 路径 MTU 发现、MTU 探测 | |
| 출력 드롭 / 입력 오류 | 出方向丢弃 / 入方向错误 | |
| 임시 포트 / 인스턴스 종류·크기 | 临时端口 / 实例规格 | |
| 회고 (postmortem article) | 复盘文章 | Glossary headword stays 故障复盘 |
| 먼저 부를 곳 | 优先联系：(playbooks) / 先找 (tables) | |
| 카나리 / 대조군 / 기능 플래그 | 金丝雀发布 / 对照组 / 功能开关 | |
| 트래픽 지문 | 流量指纹 | |
| 경쟁 상태 / 리스 / 대역 외 접속 | 竞态条件 / 租约 / 带外访问 | |
| 확장팩 / 얼리 액세스 | 资料片 / 抢先体验 | Endwalker → 《晓月之终途》（Endwalker） |
| 빌드 | 构建版本 | Build number → 版本号 |
| 헬스체크 / 드레인 / 단일 장애점 | 健康检查 / 排空（drain） / 单点故障 | |
| 쓰래싱 | 颠簸 | GC 颠簸 |
| PC방 | 网吧 | |
| 에스컬레이션 (to a carrier) | 升级处理 | |
| 시스템 / 밝게 / 어둡게 (theme) | 跟随系统 / 浅色 / 深色 | |
| 비유 / 핵심 (box tags) | 打个比方 / 要点 | |
| 부조정실 | 导播间 | |
| 저스트 회피 / 방치형 | 完美闪避 / 放置类 | |
| 함께 대응할 곳 (prose) | 配合方 | The card label 함께 stays 配合 |
