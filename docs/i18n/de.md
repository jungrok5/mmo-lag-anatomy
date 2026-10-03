# German (de) localization: terminology and style

Target: Germany (`de-DE`). Readers are German-speaking game developers, SRE/infra engineers and, just as much, non-programmers in studios (game design, art, QA, PM, community/support). Every German string must read as if a German senior engineer wrote it for colleagues. Read `docs/I18N_GUIDE.md` first; this file adds the German decisions. When this file and your instinct disagree, follow this file so that ten translators produce one consistent text.

## 1. Site name

| Korean | German (use exactly) |
|---|---|
| 게임 렉 백서 | **Game-Lag-Whitepaper** |
| 이 백서 | dieses Whitepaper |
| 게임 렉 백서: 온라인 게임 렉 원인과 해결 담당 (full title) | Game-Lag-Whitepaper: Lag-Ursachen in Onlinespielen und wer sie behebt |

Why: German players and developers say "Lag", "laggt", "Lag-Ursachen"; "Whitepaper" is established German (das Whitepaper). Hyphenated per German compound rules. English alternate name "Game Lag White Paper" stays in structured data (the build adds it).

## 2. Register and voice

- **Prose** (body text, `s`, `num`, `more`, symptom `what/looks/tell`, glossary definitions, case texts): neutral, polite explanatory German in the present tense. Short sentences, one idea per sentence. Explain like to a smart colleague outside engineering. No marketing tone, no exclamation marks.
- **Addressing the reader**: formal **Sie** (capitalized: Sie, Ihnen, Ihr). Use it only where Korean addresses the reader (instructions, report guide, "try this"). Otherwise stay impersonal ("Der Server …", "Zu prüfen sind …", "Man sieht …").
- **Korean first-person player view** (내 화면, 내 캐릭터, 내 PC, 내 게임): write "der eigene Bildschirm", "der eigene Charakter", "der eigene PC". Exception: answer options in the voice of a player keep first person (who `me` → "Nur ich"; report item "nur ich / auch die Gruppe …").
- **`chk` fields** (how to confirm) are terse checklist fragments, no subject, no final period needed if the Korean has none (keep the Korean punctuation pattern: sentences separated by ". " inside the field stay separated by ". ").
  - `look`: infinitive style, like a German checklist: "GC-Log aktivieren und Pausen über den Graphen der Tick-Zeit legen", "`ss -ti` auf dem Server ausführen und `retrans` vergleichen".
  - `yes` / `no`: short statements, verbs allowed, no "Sie": "Tick-Spitzen und GC-Pausen fallen zeitlich zusammen, Pausendauer etwa gleich Spitzendauer". For `no`, use the pattern "Befund: Schluss": "Keine langen Pausen im GC-Log, Tick springt trotzdem: andere Ursache wie Locks oder synchrone Aufrufe".
- **`act` fields** (team to-dos): comma-separated infinitive phrases, final period: "GC mit kurzen Pausen per Startoption festlegen, Allokationen reduzieren, Heap-Größe anpassen."
- **`c` triple** [Warum, Folge, Auf dem Bildschirm]: three short fragments, no final period, like the Korean: "Heap voll, GC startet" → "Alle Game-Threads angehalten, dann wird aufgeräumt" → "Alle auf dem Server stehen gleichzeitig still, danach Zeitraffer".
- **`sig.g`** (graph names): short noun phrases, comma-separated: "Server-Tick-Zeit, GC-Pausenzeit", "RTT (Ping)", "Retransmission-Rate", "CPU-Auslastung pro Kern", "Verbindungen und Verbindungsabbrüche", "DB-Query-Latenz", "Länge der Disk-Warteschlange", "Frametime".
- **Cause titles (`t`)**: noun phrase, standard incident name where one exists, no final period: "Stop-the-World-GC-Pause auf dem Server", "Hot-Row-Lock-Contention", "Noisy Neighbor", "Zero Window". Cause titles that body text or simulations link to by exact string must be translated identically everywhere (search the Korean title in your groups).
- **UI labels and buttons**: short, no article, no final period: "Szenario laden", "Selbst ausprobieren", "Sprache wählen".
- **Analogy boxes** (`class="analogy"`): keep the analogy, translate it naturally. Outside those boxes never use analogies; use the terms below.

## 3. Forbidden patterns (the two Korean house rules in German form)

1. **No dash asides.** Do not insert explanations with a Gedankenstrich, neither "—" nor spaced " – ". Use parentheses, a colon, a relative clause or a new sentence.
   - Bad: "Der Server – genauer die Game-Loop – steht still."
   - Good: "Die Game-Loop des Servers steht still." / "Der Server steht still (genauer: die Game-Loop)."
   - The en dash is allowed only in ranges without spaces ("1–5 m", "0,2–0,5 s") and in fixed compounds. Arrows (→, ↔) stay as in the source.
2. **No "not A but B".** Do not write "nicht A, sondern B", "kein A, sondern B", "nicht A, vielmehr B", "A ist nicht das Problem, sondern B". State B directly; if A must be mentioned, give it its own sentence.
   - Bad: "Das ist kein Leitungsproblem, sondern ein Serverproblem."
   - Good: "Die Ursache liegt beim Server. Die Leitung ist in Ordnung."
   - Also avoid the disguised forms "statt A B" and "anstatt" when they serve the same rhetorical contrast. Plain descriptions ("ohne Warteschlange verwerfen", "ohne auf den Server zu warten") are fine.

## 4. Typography

- **Quotes**: German „…“ (U+201E, U+201C); nested ‚…‘. Replace Korean “…” with „…“. Never use ASCII `"` in attribute translations (`ctx` ending in `@aria-label`, `@title`, `@alt`, `@content`): the tool rejects `"`, `<`, `>`; „…“ is fine.
- **Ellipsis**: "…" as one character; space before it when whole words are omitted ("Ruckeln, Teleportieren …").
- **Slash**: Korean middle-dot pairs in compact labels become a slash without spaces for single words ("WLAN/Router", "Ticks/Threads", "PC/Smartphone"). In running prose turn "A·B" into "A und B", "A oder B" or a comma list, whichever the meaning is. The three composite symptom names use " / " with spaces (see 6.1) and are the only place where that spacing is used.
- **Colon after a label**: lower case continues unless a full sentence follows (German rule). "Auch genannt: Mikroruckler".
- **English compounds** (Duden rules, keep consistent):
  - noun + noun → hyphenated, both capitalized: Load-Balancer, Connection-Pool, Thread-Pool, Circuit-Breaker, Cache-Miss, Cache-Stampede, Idle-Timeout, Game-Loop, Lag-Compensation, Tail-Latency, Burst-Credits, Live-Migration, Retransmission-Timer, Retransmission-Rate, Zero-Window-Probe, Head-of-Line-Blocking.
  - adjective + noun → separate, both capitalized: Hot Row, Noisy Neighbor, Thin Stream, Zero Window, Delayed ACK, Full Table Scan, Spurious Retransmission, Selective ACK.
  - German + English or with abbreviations → hyphen: TCP-Retransmission, GC-Pause, DB-Server, NAT-Tabelle, Session-Tabelle, Socket-Puffer, Ping-Spikes, Tick-Budget, Tick-Intervall, OOM-Killer, Anti-Cheat.
  - Official product and feature names keep their own spelling: Frame Generation, Stop-the-World, RACK-TLP, G-Sync, FreeSync, RIPE Atlas.
- **Genders of loanwords** (use these): der Lag (die Lags), der Ping, der Tick, der Jitter, der Frame, die Frametime, der Snapshot, der Client, der Server, der Router, der Switch, der Load-Balancer, die Firewall, die NIC, der Kernel, der Socket, das Paket, das Timeout, der Heartbeat, der Thread, der Lock, der Deadlock, der Cache, der Cache-Miss, die GC (Garbage Collection), der Heap, der Swap, das Backlog, das Deployment, das Failover, das Peering, das Monitoring, das Log, die Metrik, die Retransmission, das Rollback, der Patch, der Spike, der Burst, der Microburst, die Hot Row, der Connection-Pool, der Thread-Pool, der Worker, die Queue, das Gateway, der Circuit-Breaker, das Autoscaling, der Watchdog, das Postmortem, das Bufferbloat, das Rubberbanding, der Input-Lag, der Freeze, der Zeitraffer, die Zeitlupe.
- **Capitalize** German nouns including nominalized verbs ("das Ruckeln", "beim Laden"); symptom names at sentence start follow normal rules.
- Keep verbatim (never translate or re-case): cause IDs, `code`, commands and options (`ss -ti`, `-Xlog:gc*`), counters and metric names (`TcpExtTCPLostRetransmit`, `pg_stat_statements`), config keys, RFC numbers, product and tool names, URLs, `%SITE%`, everything inside `<code>`.

## 5. Numbers and units

- **Decimal comma**: 16,7 ms; 0,25 s; 1,8 GB.
- **Thousands**: period for quantities of 4 digits and more, matching what the site's number formatter prints in `de-DE`: 1.500 Byte, 1.460 Byte, 10.000, 65.535 Ports, 1.000-mal. Never group identifiers: years (2016), versions (JDK 26, Windows 10 1607), ports (443, 8080), RFC numbers (RFC 4787), error codes, model numbers.
- **Space between number and unit**: 50 ms, 1,5 s, 20 Hz, 60 FPS, 100 Mbps, 1 %, 2 GB, 5 m. A normal space is fine (U+00A0 optional). Unit symbols stay as in the source: ms, µs, ns, s, Mbps, Gbps, GB, MB, KB, IOPS, PPS. Korean "초" after a digit → "s"; minutes, hours and days are written out after digits ("5 Minuten", "2 Stunden", "7 Tage"). Without a digit write words ("einige Sekunden").
- **Ranges**: en dash without spaces: 1–5 m, 0,2–0,5 s, 80–90 %. In running prose "zwischen 2 und 5 Sekunden" is also fine. Korean "~" never appears in German.
- **Tick rates**: "20틱 서버" → "Server mit 20 Ticks pro Sekunde" or "20-Tick-Server"; "60Hz" → "60 Hz".
- **Multipliers**: "2배" → "doppelt so …" or "das 2-Fache"; "1,000배" → "1.000-mal". Keep digits where the Korean has digits (the checker compares numbers; a warning is acceptable when a Korean number word such as 만 or 두 becomes digits or words).
- **Vague Korean quantities** (keep the vagueness, never invent numbers):

| Korean | German |
|---|---|
| 수 ms | einige ms / wenige Millisekunden |
| 수~수십 ms | im ein- bis zweistelligen Millisekundenbereich |
| 수십 ms | einige Dutzend ms / im zweistelligen Millisekundenbereich |
| 수백 ms | mehrere hundert ms / im dreistelligen Millisekundenbereich |
| 수 초 | einige Sekunden |
| 수~수십 초 | einige bis einige Dutzend Sekunden |
| 몇 초~십여 초에 한 번 | alle paar Sekunden bis etwa alle zehn Sekunden |
| 수 GB | mehrere GB |
| 약 / 쯤 / 안팎 | etwa (prose), ca. (compact fields), um die / rund |
| 이상 / 이하 / 미만 / 초과 | mindestens … / höchstens … / unter … / über … |
| 한두 개 | ein, zwei … / ein bis zwei … |

- **Counts in short fragments** (avoid "1 Ursachen"): when the placeholder can be 1 (sources per cause, cases, items in a filter result), use the label form "Quellen: {0}", "Treffer: {0}". When the count is a known large total (all causes, causes per layer or per symptom, glossary size) "{0} Ursachen" is fine. Never write "Ursache(n)".

## 6. Terminology

Identical Korean strings must get identical German strings in every group: the build uses one dictionary per language, and `node tools/i18n.cjs check de --conflicts` lists differences. Strings already translated in `data`, `glossary`, `site`, `meta`, `ui-kit` are the reference; copy them when the same Korean string appears in your group (for example layer names as chapter headings, owner descriptions in `body-owners`, glossary terms as cause titles).

### 6.1 Symptom names (fixed; use exactly these everywhere)

| id | Korean | German name | German aliases (translation of `alias`) |
|---|---|---|---|
| stutter | 뚝뚝 끊김 | **Ruckeln** | Stottern, Mikroruckler, gefühlte Framedrops |
| teleport | 순간이동 | **Teleportieren** | Warpen, Teleport, Stocken und Springen |
| rubber | 고무줄 | **Rubberbanding** | Zurückgeportet werden, Gummiband-Effekt, Positions-Rollback |
| burst | 몰아치기 | **Zeitraffer** | Schlag auf Schlag, Vorspulen, alles auf einmal |
| slowmo | 슬로우모션 | **Zeitlupe** | Die Welt läuft langsamer, alles wirkt zäh |
| delay | 입력 지연 | **Input-Lag** | Verzögerte Reaktion, träge, schwammige Steuerung |
| freeze | 멈춤 | **Freeze** | Einfrieren, Standbild, keine Reaktion |
| dropped | 씹힘·롤백 | **Verschluckte Aktion / Rollback** | Skill verschluckt, Item wieder weg, Handel fehlgeschlagen |
| disconnect | 접속 끊김 | **Verbindungsabbruch** | Rausfliegen, Disconnect, „Die Verbindung zum Server wurde getrennt“ |
| noconnect | 접속 불가·무한 로딩 | **Kein Login / Endlos-Laden** | Login klappt nicht, Ladebildschirm endet nicht |
| invisible | 안 보임·유령 개체 | **Unsichtbar / Geisterobjekte** | NPC fehlt, unsichtbarer Charakter, toter Mob steht noch da |

Rules for symptom names in prose:
- When the text refers to the symptom, use the name. Allowed inflections: "Freezes", "Verbindungsabbrüche", "im Zeitraffer", "in Zeitlupe", "wirkt wie Rubberbanding"; verbs from the same stem: "ruckelt", "ruckeln", "teleportiert". Do not substitute synonyms (no "Stottern", "Hänger", "Lags", "Disconnect" as the symptom name in prose; those are aliases only).
- Korean uses 멈춤/멈추다 also generically (GC 멈춤, 서버가 멈춘다). Only the symptom is "Freeze". GC pause → "GC-Pause"; server stall → "Stillstand", "steht still", "bleibt stehen", "hängt". The OS freezing apps (iOS freeze) → "Einfrieren", to avoid confusion with the symptom.
- Composite names in running text: "Verschluckte Aktionen und Rollbacks", "Kein Login oder Endlos-Laden", "unsichtbare Objekte und Geisterobjekte" are acceptable when grammar requires; in lists, headings, chips and tables use the exact name.
- Symptom page title pattern: "{Name} im Onlinespiel: Ursachen und Zuständigkeiten | Game-Lag-Whitepaper".

### 6.2 The four factors

| id | Korean | German | How (`how`) |
|---|---|---|---|
| lat | 지연 | **Latenz** | Pakete kommen spät an |
| jit | 지터 | **Jitter** | Pakete kommen unregelmäßig an |
| loss | 손실 | **Paketverlust** | Pakete kommen gar nicht an |
| stall | 정체 | **Stillstand** | Jemand hat aufgehört zu rechnen |

- "네 가지 요인" → "die vier Faktoren". "요인" → "Faktor".
- 지연 in other senses: generic delay → "Verzögerung"; 입력 지연 → "Input-Lag" (symptom); 지연 보상 → "Lag-Compensation"; 지연 ACK → "Delayed ACK"; 복제 지연 → "Replikationsverzögerung"; 꼬리 지연 → "Tail-Latency".
- First mention of Jitter in each chapter (where the Korean glosses it): "Jitter (Schwankung der Ankunftsabstände)".

### 6.3 Layers and topics (`layers`, `extraLayers`)

"층" / "레이어" → **Schicht** ("L3", "Schicht 3 von 13"). "층·주제" → "Schicht/Thema". "주제" (the 3 topics) → "Thema".

| id | Korean name → German `name` | Korean short → German `short` | side |
|---|---|---|---|
| client-game | 클라이언트 게임 프로세스 → Spielprozess auf dem Client | 내 게임 → Spielclient | 내 쪽 → Spielerseite |
| client-os | 클라이언트 OS·기기 → Client-OS und Gerät | 내 PC·폰 → PC/Smartphone | Spielerseite |
| home | 집 네트워크 → Heimnetz | 와이파이·공유기 → WLAN/Router | Spielerseite |
| isp | 인터넷 회선 → Internetleitung | 통신사·해외 → Provider/Ausland | 가는 길 → Unterwegs |
| dc-net | 데이터센터 네트워크 장비 → Netzwerkgeräte im Rechenzentrum | 방화벽·LB → Firewall/LB | 서버 쪽 → Serverseite |
| nic | 서버 네트워크 카드 → Netzwerkkarte des Servers | NIC | Serverseite |
| server-os | 서버 OS (커널) → Server-OS (Kernel) | 커널 → Kernel | Serverseite |
| socket | 소켓과 프로토콜 → Sockets und Protokolle | TCP·UDP → TCP/UDP | 양쪽 끝 → Beide Enden |
| server-proc | 서버 게임 프로세스 → Spielprozess auf dem Server | 틱·스레드 → Ticks/Threads | Serverseite |
| memory | 메모리 → Arbeitsspeicher | GC·누수 → GC/Leaks | Serverseite |
| disk | 디스크 → Datenträger | IOPS | Serverseite |
| db | 데이터베이스 → Datenbank | DB | Serverseite |
| infra | 서버 구성과 운영 → Serverarchitektur und Betrieb | 구성·운영 → Architektur/Betrieb | Serverseite |
| sync (topic) | 동기화 설계 → Synchronisationsdesign | Synchronisationsdesign | 설계 → Design |
| partial (topic) | 일부에게만 생기는 문제 → Probleme, die nur einige betreffen | 일부만 → Nur einige | 범위 → Umfang |
| retrans (topic) | TCP 재전송의 근본 원인 → Grundursachen von TCP-Retransmissions | TCP 재전송 → TCP-Retransmissions | 원인 → Ursache |

Chapter headings that reuse these names must match exactly. Other chapter titles (for consistency across groups):

| Korean | German |
|---|---|
| 렉을 만드는 네 가지 요인 | Die vier Faktoren, die Lag verursachen |
| 패킷의 이동 경로: 입력에서 서버 DB까지 | Der Weg eines Pakets: von der Eingabe bis zur Serverdatenbank |
| 렉 실험실 | Lag-Labor |
| 증상 사전 | Symptomkatalog |
| 동기화 방식과 체감 | Synchronisationsmodelle und Spielgefühl |
| 한 명만 느릴 때, 한쪽만 이상할 때 | Wenn nur einer laggt oder nur eine Seite betroffen ist |
| TCP 재전송: 생기는 원인과 지연이 커지는 이유 | TCP-Retransmissions: wie sie entstehen und warum die Verzögerung steigt |
| 게임개발팀과 인프라팀의 담당 | Zuständigkeiten von Entwicklungsteam und Infrastrukturteam |
| 진단 도우미 | Diagnosehilfe |
| 관측으로 판정하기 | Diagnose anhand von Messdaten |
| 범위 → 시점 → 계층 (judge flow, in sentences) | Betroffenenkreis → Zeitpunkt → Schicht |
| 범위 (standalone key: topic side, table header, filter label) | Umfang |
| 판정 신호표 | Signaltabelle |
| 사례와 절차 | Fallbeispiele und Playbooks |
| 상황별 절차 | Playbooks für typische Situationen |
| 실제 장애 사례 | Reale Störungsfälle |
| 렉 제보 가이드 | Leitfaden für Lag-Meldungen |
| 용어 사전 | Glossar |
| 참고 문헌 | Quellenverzeichnis |
| 목차 | Inhalt |

### 6.4 Teams and owners

| Korean | German | Notes |
|---|---|---|
| 게임개발팀 (`game`) | **Entwicklungsteam** | client and server code |
| 인프라팀 (`infra`) | **Infrastrukturteam** | |
| 외부 (`ext`, team and owner) | **Extern** | |
| 클라이언트 개발 (`cli`) / short 클라이언트 | Client-Entwicklung / Client | |
| 서버 개발 (`srv`) / short 서버 | Server-Entwicklung / Server | |
| 네트워크 인프라 (`net`) / short 네트워크 | Netzwerk-Infrastruktur / Netzwerk | |
| 서버 인프라 (`sys`) / short 서버 장비·OS | Server-Infrastruktur / Server/OS | |
| DB 인프라 (`dba`) / short DB 장비 | DB-Infrastruktur / DB-Systeme | |
| short 유저·통신사·클라우드 | Spieler/Provider/Cloud | |
| 담당, 해결 담당 | Zuständigkeit | |
| 주 담당 | Hauptzuständig | label, no colon |
| 함께 | Beteiligt | label, no colon |
| {팀} 할 일 | Aufgaben {Team} | e.g. "Aufgaben Entwicklungsteam" |
| 담당 코드 | Zuständigkeitskürzel | table header 코드 → Kürzel |
| 담당 구분 | Abgrenzung der Zuständigkeiten | |
| 에스컬레이션 | Eskalation | |
| 안내 (to users) / 요청 (to providers) / 우회 | Hinweis an Spieler / Anfrage an Anbieter / Workaround | |
| team·owner joiner `{0}·{1}` | `{1} ({0})` | "Server-Entwicklung (Entwicklungsteam)" |
| sentence joiner `{0}. {1}` | `{0}. {1}` | |

### 6.5 Who / when (`who`, `when`)

| who | German | when | German |
|---|---|---|---|
| me 나만 | Nur ich | always 항상 | Immer |
| home 같은 집 | Gleicher Haushalt | peak 저녁 피크 시간 | Abendliche Stoßzeit |
| region 특정 지역·통신사 | Bestimmte Region oder Provider | event 사람이 몰릴 때 | Bei großem Andrang |
| zone 특정 장소·채널 | Bestimmter Ort oder Kanal | login 접속·점검 직후 | Direkt nach Login oder Wartung |
| server 서버 전체 | Ganzer Server | idle 가만히 있다가 | Nach Inaktivität |
| feature 특정 기능만 | Nur eine bestimmte Funktion | random 가끔 무작위로 | Gelegentlich, zufällig |
| onechar 특정 캐릭터만 이상해 보임 | Nur ein bestimmter Charakter wirkt seltsam | periodic 일정한 주기로 | In festen Abständen |
| oneclient 같은 PC의 한쪽 클라만 | Nur ein Client auf demselben PC | uptime 오래 켜 둘수록 | Je länger es läuft |
| | | moving 이동 중·지역 전환 때 | Beim Bewegen oder Zonenwechsel |
| | | action 특정 행동을 할 때 | Bei bestimmten Aktionen |

Labels: 누가 겪나 → "Wer ist betroffen", 언제 → "Wann".

### 6.6 Graph shapes (`sigs`)

"그래프 모양" → **Graphmuster** (das). "그래프에서는" → "Im Graphen". "{0} 모양" → "Muster „{0}“".

| id | German name |
|---|---|
| periodic | Spitzen in festen Abständen |
| random | Vereinzelte Spitzen ohne Muster |
| step | Stufe ab einem bestimmten Zeitpunkt |
| ramp | Langsamer Anstieg |
| sawtooth | Steigt langsam, fällt abrupt |
| peak | Nur zu bestimmten Tageszeiten hoch |
| load | Steigt mit Spielerzahl und Last |
| ceiling | Plateau am Limit |
| high | Von Anfang an dauerhaft hoch |
| outlier | Nur einzelne Ausreißer |
| gap | Lücke, dann alles auf einmal |
| drop | Verbindungen brechen gleichzeitig ab |
| surge | Ansturm direkt nach Login oder Wartung |

"튀다 / 솟다" (graph) → "ausschlagen", "hochschießen", "Spitze" (general), "Spike" in gamer terms ("Ping-Spikes", "Lag-Spikes"). "스파이크" → "Spitze" in prose, "Spike" in compounds with Ping/Lag.

### 6.7 Card labels and check-by (`chkBy`)

| Korean | German |
|---|---|
| 왜 → 그러면 → 화면에서는 | Warum → Folge → Auf dem Bildschirm |
| 증상 / 요인 | Symptome / Faktoren |
| 수치 감각 | Größenordnungen |
| 확인 방법 | Prüfmethode |
| 확인할 곳 | Wo nachsehen |
| 이러면 맞음 | Spricht dafür |
| 이러면 아님 | Spricht dagegen |
| 확인 수단 | Prüfmittel |
| 더 알아보기 | Mehr dazu |
| 출처 | Quellen |
| 실제 사례 | Reale Fälle |
| 원인 / 근본 원인 / 원인 ID | Ursache / Grundursache / Ursachen-ID |
| 원인 카드 | Ursachenkarte |
| `ops` 인프라 도구로 확인(게임 코드 불필요) | Mit Infrastruktur-Tools prüfbar (ohne Spielcode) |
| `code` 게임 서버·클라이언트의 로그·지표가 필요 | Logs oder Metriken aus Spielserver bzw. Client nötig |
| `user` 유저 쪽 환경에서 확인 | Prüfung in der Umgebung des Spielers |
| 원본 (interactive main page) / 텍스트 판 | interaktive Fassung / Textfassung |
| 원문 (Korean original, source article) | Original / Originalquelle |
| 직접 해보기 / 실험 / 시뮬레이션 | Selbst ausprobieren / Experiment / Simulation |
| 상황 불러오기 | Szenario laden |
| 좋음 / 주의 / 나쁨 | Gut / Achtung / Schlecht |

### 6.8 Netcode and game terms

| Korean | German | Note |
|---|---|---|
| 렉 | Lag (der) | verb "laggen", "es laggt" |
| 핑 | Ping | |
| 왕복, 왕복 시간 | Round Trip, Umlaufzeit (RTT) | plain text: "hin und zurück" |
| 틱 / 틱레이트 / 틱 예산 / 틱 간격 | Tick / Tickrate / Tick-Budget / Tick-Intervall | |
| 게임 상태 | Spielzustand | |
| 서버의 실제 상태 | tatsächlicher Serverzustand | |
| 스냅샷 / 델타 압축 | Snapshot / Delta-Kompression | |
| 보간 / 보간 버퍼 | Interpolation / Interpolationspuffer | |
| 외삽 | Extrapolation | also "Dead Reckoning" |
| 예측, 클라이언트 예측 | Vorhersage, clientseitige Vorhersage | glossary term "Clientseitige Vorhersage" |
| 서버 보정 (reconciliation) | Serverabgleich | |
| 되감기(지연 보상), 지연 보상 | Zurückspulen (Lag-Compensation), Lag-Compensation | |
| 판정 (hit/combat) | Trefferabfrage | German gamer term |
| 판정 (general server decision) | Entscheidung des Servers | |
| 판정 구간, 허용 시간 | Zeitfenster, Toleranzzeit | e.g. Parier-Zeitfenster |
| 권위 서버 / 클라이언트 권위 | autoritativer Server / Client-Autorität | |
| 락스텝 | Lockstep (deterministischer Lockstep) | |
| 롤백 넷코드 / 롤백 (DB) | Rollback-Netcode / Rollback (das) | |
| 넷코드 | Netcode | |
| 동기화 / 동기화 방식 | Synchronisation / Synchronisationsmodell | |
| 요청-응답 / 상태 동기화 / 명령 동기화 / 이벤트 예약 | Request-Response / Zustandssynchronisation / Befehlssynchronisation / zeitgeplante Events | |
| 선입력 / 선입력 허용 시간 | Input-Buffering / Zeitfenster fürs Input-Buffering | |
| 서버 입력 버퍼 | serverseitiger Eingabepuffer | |
| 선연출 | clientseitiges Feedback | |
| 리슨 서버 / 방장 | Listen-Server / Host | |
| 페이즈 | Phasing | |
| 시야, 시야 계산 (AOI) | Sichtbereich, Sichtbereichsberechnung (AOI) | |
| 격자(그리드) / 셀 | Raster (Grid) / Zelle | |
| 브로드캐스트 | Broadcast | |
| 개체 / 개체 ID | Objekt / Objekt-ID | "Entity" acceptable in code context |
| 등장·퇴장 알림 | Spawn- und Despawn-Meldungen | |
| 제어 권한 | Autorität (Ownership) | |
| 게임 루프 / 메인 스레드 | Game-Loop / Main-Thread | |
| 프레임 / 프레임 타임 / 프레임 드랍 | Frame (der) / Frametime / Framedrops | |
| FPS / 주사율 / 화면 찢어짐 | FPS / Bildwiederholrate / Tearing | |
| 가변 주사율 | variable Bildwiederholrate (VRR) | |
| 셰이더 컴파일 / 셰이더 캐시 | Shader-Kompilierung / Shader-Cache | |
| 넷그래프 | Netgraph | |
| 안티치트 / 오버레이 | Anti-Cheat / Overlay | |
| 에셋 | Asset | |
| 게임 가속기 | Ping-Booster | |
| 유저 | Spieler | generic masculine, no gender star |
| 캐릭터 / 캐릭터 모델 / 이름표 | Charakter / Charaktermodell / Namensschild | |
| 몬스터 / NPC | Monster, Mob / NPC | |
| 파티 / 파티원 | Gruppe / Gruppenmitglieder | |
| 스킬 / 쿨다운 / 시전 | Skill / Cooldown / Cast | |
| 데미지 / 이펙트 | Schaden, Schadenszahlen / Effekte | |
| 아이템 / 인벤토리 / 거래 | Item / Inventar / Handel | |
| 존 / 채널 / 필드 / 월드 보스 / 던전 | Zone / Kanal / Gebiet / Weltboss / Dungeon | |
| 지역 이동, 지역 전환 | Gebietswechsel, Zonenwechsel | |
| 로딩 / 로딩바 / 입장 화면 | Laden / Ladebalken / Eintrittsbildschirm | |
| 로그인 / 로그인 서버 / 로그인 대기열 | Login / Login-Server / Login-Warteschlange | |
| 재접속 / 자동 재접속 | Reconnect / automatischer Reconnect | |
| 점검 / 패치 | Wartung / Patch | |
| 이벤트 | Event | |
| 크래시 / 강제 종료 | Absturz / erzwungenes Beenden | |
| 치팅 / 게임 해킹 | Cheating / Cheats | |
| 격투 게임 / 경쟁 슈팅 게임 | Fighting Games / kompetitive Shooter | |
| 비신뢰(unreliable) 채널 | Unreliable-Kanal | |
| 게임 시간 / 게임 속도 | Spielzeit / Spielgeschwindigkeit | |

### 6.9 Network and transport

| Korean | German | Note |
|---|---|---|
| 패킷 / 상태 업데이트 / 메시지 | Paket / Zustandsupdate / Nachricht | |
| 대역폭 | Bandbreite | |
| 처리량 | Durchsatz | |
| 대기열, 대기열에 쌓이다 | Warteschlange, sich in der Warteschlange stauen | NIC queues: Queue |
| 대기열 넘침 | Warteschlangenüberlauf | |
| 버퍼 | Puffer | |
| 혼잡 | Überlast (Congestion) | "überlastete Leitung" |
| 재전송 / 재전송률 / 재전송 타이머 | Retransmission / Retransmission-Rate / Retransmission-Timer | verb: "erneut senden" |
| 불필요한 재전송 | unnötige Retransmission (Spurious Retransmission) | |
| RTO | RTO (Retransmission Timeout) | |
| TLP / RACK-TLP | TLP (Tail Loss Probe) / RACK-TLP | |
| 마지막 패킷들의 손실(tail loss) | Verlust der letzten Pakete (Tail Loss) | |
| 아직 ACK를 받지 못한 패킷(in-flight) | noch unbestätigte Pakete (in flight) | |
| ACK(수신 확인) / 지연 ACK | ACK (Empfangsbestätigung) / Delayed ACK | |
| 선택적 ACK(SACK) / 중간에 빠진 부분 | Selective ACK (SACK) / fehlender Abschnitt | |
| HOL 블로킹 | Head-of-Line-Blocking (HOL-Blocking) | |
| thin stream | Thin Stream | |
| 혼잡 윈도우 / 수신 윈도우 / 윈도우 | Congestion Window / Receive Window / Window | keep English |
| 윈도우 크기·윈도우 스케일 | Window-Größe, Window Scaling | |
| 제로 윈도우 / 제로 윈도우 프로브 | Zero Window / Zero-Window-Probe | |
| 시퀀스 번호 | Sequenznummer | |
| “보낸 순서대로만 넘겨줌” | „gibt Daten nur in Sendereihenfolge weiter“ | |
| 순서 보장 | Reihenfolgegarantie | |
| 보장한다 | garantiert | |
| Nagle 알고리즘 | Nagle-Algorithmus | |
| 소켓 버퍼 / 송신·수신 버퍼 | Socket-Puffer / Sende- und Empfangspuffer | |
| 전송 대기 메모리 | Sendepuffer-Speicher | |
| keepalive / 하트비트 | Keepalive / Heartbeat | |
| 타임아웃 / 유휴 타임아웃 / 유휴 연결 | Timeout / Idle-Timeout / Idle-Verbindung | |
| 장비별 유휴 타임아웃 | Idle-Timeouts der Netzwerkgeräte | |
| 조용히 버림(silent drop) | stilles Verwerfen (Silent Drop) | |
| 단편화 / 프래그먼트 | Fragmentierung / Fragment | |
| MTU / MSS / 최대 세그먼트 크기 | MTU / MSS / maximale Segmentgröße | |
| MTU 블랙홀 | MTU-Blackhole | |
| 페이싱 / 폴리서 / 셰이퍼 | Pacing / Policer / Shaper | |
| 버퍼블로트 / SQM | Bufferbloat / SQM | |
| 마이크로버스트 / 버스트 / 송신 버스트 | Microburst / Burst / Sende-Burst | |
| 회선 | Leitung (Internetleitung) | "die Leitung ist in Ordnung" |
| 유선 / 와이파이 / 무선 구간 | LAN-Kabel / WLAN / Funkstrecke | never "WiFi" |
| 무선 채널(주파수 대역) / 전파 간섭 | Funkkanal (Frequenzband) / Funkstörung | |
| 공유기 | Router | |
| 모바일망 / 기지국 / 핸드오버 | Mobilfunknetz / Funkzelle / Handover | |
| 통신사 / 통신사망 | Provider / Providernetz | mobile: Mobilfunkanbieter |
| 해외 / 해외 서버 | Ausland / Auslandsserver | |
| 해저 케이블 / 광케이블 | Unterseekabel / Glasfaser | |
| 경로 / 우회 경로 / 병목 구간 | Route / Umweg-Route / Engpass | ECMP: Pfad |
| 피어링 / BGP | Peering / BGP | |
| NAT / NAT 테이블 / CGNAT / SNAT / NAT 게이트웨이 | NAT / NAT-Tabelle / CGNAT / SNAT / NAT-Gateway | |
| 공인 IP / 사설망 | öffentliche IP / privates Netz | |
| 세션 테이블 / conntrack 테이블 / 연결 추적 | Session-Tabelle / conntrack-Tabelle / Connection Tracking | |
| 연결을 추적한다 / 추적 항목이 만료된다 | verfolgt die Verbindung / der Tracking-Eintrag läuft ab | |
| 방화벽 / 로드밸런서 / 스위치 / 라우터 | Firewall / Load-Balancer / Switch / Router | |
| DDoS 방어 / 스크러빙 센터 | DDoS-Schutz / Scrubbing-Center | |
| 데이터센터, IDC | Rechenzentrum | |
| ICMP 응답을 제한한다 | begrenzt ICMP-Antworten | |
| 합성 측정 | synthetisches Monitoring | |
| 연결 마이그레이션 (QUIC) | Connection Migration | |
| 저궤도 위성 인터넷 | LEO-Satelliteninternet | |

### 6.10 Server, OS, memory, disk, database, operations

| Korean | German | Note |
|---|---|---|
| 서버 / 게임 서버 / 게임 코드 | Server / Spielserver / Spielcode | |
| 클라이언트 | Client | |
| 워커 / 워커 스레드 / 워커 스레드 풀 | Worker / Worker-Thread / Worker-Thread-Pool | |
| 스레드 / 스레드 풀 | Thread / Thread-Pool | |
| 락 / 데드락 / 잠금 경합 | Lock / Deadlock / Lock-Contention | |
| 동기 호출 / 비동기 I/O | synchroner Aufruf / asynchrone I/O | |
| 호출 체인 / 연쇄 장애 | Aufrufkette / kaskadierender Ausfall | |
| 스케줄링 / 스케줄러 / 타임 슬라이스 | Scheduling / Scheduler / Zeitscheibe | |
| CPU를 배정받지 못한다, 스케줄링 대기 | bekommt keine CPU-Zeit, wartet auf CPU-Zuteilung | |
| 컨텍스트 스위칭 | Kontextwechsel | |
| starvation | Starvation (Aushungern) | |
| 커널 / 운영체제 | Kernel / Betriebssystem (OS) | |
| 접속 대기열(backlog) | Verbindungswarteschlange (Backlog) | |
| 파일 디스크립터(fd) | Dateideskriptor (fd) | |
| 인터럽트 / 링 버퍼 / 슬롯 | Interrupt / Ringpuffer / Slot | |
| 수신 큐 / 송신 대기열 | Empfangs-Queue / Sende-Queue | |
| CPU 스틸 / CPU 스로틀링 | CPU-Steal / CPU-Throttling | |
| 주기(CFS period) / 할당량(quota) | Periode (CFS period) / Kontingent (Quota) | |
| 발열 스로틀링 | Thermal Throttling | |
| 절전 상태 / 절전 해제(wake-up) | Energiesparzustand / Aufwachen (Wake-up) | |
| 일시 정지(suspend) / 동결(freeze) (OS, apps) | Pausieren (Suspend) / Einfrieren | not "Freeze" |
| 백그라운드 앱 / 백그라운드 창 | Hintergrund-App / Hintergrundfenster | |
| 타이머 해상도 | Timer-Auflösung | |
| 시간 동기화(NTP) / 벽시계 / 단조 시계 | Zeitsynchronisation (NTP) / Wall Clock / Monotonic Clock | |
| 가상 머신 / 인스턴스 / 호스트 | virtuelle Maschine (VM) / Instanz / Host | |
| 노이지 네이버 | Noisy Neighbor | |
| 라이브 마이그레이션 | Live-Migration | |
| 보안 그룹 / 네트워크 ACL | Security Group / Netzwerk-ACL | |
| 클라우드 사업자 | Cloud-Anbieter | |
| 메모리 (RAM) / 힙 | Arbeitsspeicher, RAM / Heap | |
| 가비지 / GC / GC가 돈다 | Garbage / GC (die) / die GC läuft | |
| GC 멈춤, 전체 멈춤 | GC-Pause, Stop-the-World-Pause | |
| Full GC / Young·Old 영역 | Full GC / Young/Old Generation | |
| 메모리 누수 | Speicherleck | |
| 스왑 | Swap | "auslagern" as verb |
| OOM 킬러 | OOM-Killer | |
| 캐시 미스 / 콜드 캐시 / 캐시 스탬피드 | Cache-Miss / kalter Cache / Cache-Stampede | |
| 메모리 계층 | Speicherhierarchie | |
| 디스크, 스토리지 | Datenträger, Storage | compounds may use "Disk-": Disk-I/O, Disk-Latenz, Disk-Warteschlange |
| IOPS / 버스트 크레딧 / 적립량 | IOPS / Burst-Credits / Guthaben | |
| 동기 쓰기 / fsync(확실히 저장) | synchrones Schreiben / fsync (erzwungenes Schreiben auf den Datenträger) | |
| 헤드·플래터 | Schreib-/Lesekopf, Magnetscheibe | |
| 데이터베이스 / 쿼리 | Datenbank (DB) / Query | |
| 커넥션 풀 / 커넥션 | Connection-Pool / Verbindung | |
| 인덱스 / 컬럼 / 행 / 테이블 | Index (Indizes) / Spalte / Zeile / Tabelle | |
| 풀 스캔 / 실행 계획 | Full Table Scan / Ausführungsplan | |
| 트랜잭션 / 롤백 / 언두 로그 | Transaktion / Rollback / Undo-Log | |
| 행 잠금 / 잠금 에스컬레이션 | Zeilensperre / Lock-Eskalation | |
| 핫 로우 | Hot Row | first mention: "Hot Row (eine Zeile, die alle gleichzeitig ändern wollen)" |
| 스키마 변경(DDL) | Schemaänderung (DDL) | |
| 복제 / 복제본 / 주 DB / 복제 지연 | Replikation / Replikat / Primär-DB / Replikationsverzögerung | |
| 체크포인트 / MVCC | Checkpoint / MVCC | |
| 장애 전환 | Failover | |
| 캐시 서버 | Cache-Server | |
| 게이트웨이 / 서킷 브레이커 | Gateway / Circuit-Breaker | |
| 배포 / 확장 / 오토스케일링 | Deployment / Skalierung / Autoscaling | |
| 워치독 / 덤프 | Watchdog / Dump | |
| 이용률 | Auslastung | |
| 장애 / 장애 기록 | Störung, Ausfall / Störungsbericht | |
| 사후 분석 | Postmortem | |
| 모니터링 / 지표 / 로그 / 그래프 | Monitoring / Metrik / Log / Graph | |
| 샘플링 / 집계 간격 | Sampling / Aggregationsintervall | |
| 백분위수 / 중앙값 / p99 | Perzentil / Median / p99 | |
| 꼬리 지연 | Tail-Latency | |
| 패턴 | Muster | |
| 무작위로 분산 | zufällig streuen | |
| 간주한다 / 오인한다 / 감지한다 | wertet als / hält fälschlich für / erkennt | |
| 점유한다 | belegt, hält | |
| TLS 인증서 / GeoIP | TLS-Zertifikat / GeoIP | |

## 7. Korean constructions and how to render them

- **Nominal Korean endings** (…함, …봄, …임) → German infinitive or short statement (see `chk`). Never "…ist zu sehen, dass …" chains.
- **Korean topic-first sentences** ("서버 GC는, …") → German normal word order; put the subject or the condition first ("Läuft die GC auf dem Server, …").
- **Long Korean attributive chains** ("…하는 …인 …의 X") → split into a relative clause or two sentences. German readers tolerate one relative clause per sentence.
- **Conditions** "~하면" → "Wenn …, …" or verb-first conditional ("Ist der Ping unauffällig, …"). Vary them; do not start five sentences in a row with "Wenn".
- **"~을 봅니다" (look at X, as a diagnostic step)** → "Zu prüfen sind X, Y und Z." or "Verdächtig sind X und Y."
- **"~때문에"** → "wegen", "durch", "weil". Prefer a verb over a noun chain.
- **Parenthetical glosses** from TERMS.md (e.g. "지터(도착 간격의 흔들림)") → keep as parentheses in German.
- **Hedging** 대개 / 흔히 / 종종 / 가끔 → meist / häufig / oft / gelegentlich.
- **Onomatopoeia** (멈칫 멈칫, 휙, 파파파팍) → a plain German description ("Ruck für Ruck", "plötzlich zurück", "Schlag auf Schlag"); no comic-style sounds.
- **Korean facts stay Korean**: Korean ISP names, Korean cities, KRW prices and Korean institutions are translated or transliterated as facts (Seoul, KT, SK Broadband, LG U+). Do not replace them with German examples.

## 8. SEO notes (Germany)

Phrases people in Germany type when a game lags or when they investigate server lag:

1. lag ursachen
2. spiel laggt / warum laggt mein spiel
3. lag trotz guter leitung / lag trotz gutem ping
4. ping spikes
5. ping schwankt
6. hoher ping abends
7. paketverlust beheben
8. packet loss
9. rubberbanding
10. ruckeln online spiel / mikroruckler
11. input lag
12. verbindungsabbruch online spiel
13. server lag
14. wlan lag gaming
15. bufferbloat
16. netcode / tickrate
17. endloser ladebildschirm
18. jitter gaming

How they are used:
- Site title: "Game-Lag-Whitepaper: Lag-Ursachen in Onlinespielen und wer sie behebt" (lag ursachen, onlinespiel).
- Meta description opens with the three questions players type ("Warum ruckelt ein Onlinespiel, warum teleportieren Charaktere, warum bricht die Verbindung ab?") and names "Lag-Ursachen".
- Symptom names are the words players search (Ruckeln, Rubberbanding, Input-Lag, Verbindungsabbruch); the aliases add Mikroruckler, Framedrops, Disconnect, Gummiband-Effekt. Symptom pages: "{Name} im Onlinespiel: Ursachen und Zuständigkeiten | Game-Lag-Whitepaper".
- Cause pages: "{Ursache} ({English name}): Lag-Ursache | Game-Lag-Whitepaper".
- Keywords: Lag-Ursachen, Lag im Spiel, Ping, Ruckeln, Teleportieren, Rubberbanding, Input-Lag, Verbindungsabbruch, Server-Lag, Netcode, TCP-Retransmission, Entwicklungsteam, Infrastrukturteam.
- Spelling for search consistency: "Onlinespiel" (Duden-preferred), "Input-Lag", "Ping-Spikes", "Paketverlust", "WLAN", "Router".
- Do not stuff keywords. Use a search phrase only where the sentence needs that word anyway.

## 9. Shared keys (already fixed; reuse exactly)

These Korean strings exist as whole entries both in the phase-1 groups and in other groups. The build keeps only one German string per Korean key, so use these verbatim wherever the whole entry is identical, even if the context feels slightly different.

| Korean key | German | Also appears in |
|---|---|---|
| 뚝뚝 끊김 / 순간이동 / 고무줄 / 몰아치기 / 슬로우모션 / 입력 지연 / 멈춤 / 씹힘·롤백 / 접속 끊김 / 접속 불가·무한 로딩 | the symptom names of 6.1 | sim-arch, sim-lab, sim-oneslow, sim-gc, sim-nagle (the playback option "멈춤" is a playback speed, „Pause“; each sim has its own dictionary), sim-sndbuf |
| 지연 / 지터 / 손실 / 패킷 손실 | Latenz / Jitter / Paketverlust / Paketverlust | sim-bloat, sim-distance, sim-oneslow, sim-syncmodels, sim-sndbuf, sim-lab |
| 클라이언트 / 서버 / 네트워크 | Client / Server / Netzwerk | many sims |
| 좋음 / 주의 / 나쁨 | Gut / Achtung / Schlecht | sim-bloat, sim-ladder, body-judge, body-retrans |
| 범위 | Umfang | ui-app (filter label) |
| 담당 / 주 담당 / 팀 | Zuständigkeit / Hauptzuständig / Team | body-owners, ui-app |
| 요인 / 언제 | Faktoren / Wann | ui-app |
| 확인할 곳 / 이러면 맞음 / 이러면 아님 / 확인 수단 | Wo nachsehen / Spricht dafür / Spricht dagegen / Prüfmittel | ui-app |
| 수치 감각 / 더 알아보기 / 실제 사례 / 출처 | Größenordnungen / Mehr dazu / Reale Fälle / Quellen | ui-app |
| 무슨 일 / 배울 점 | Was geschah / Lehren daraus | ui-app |
| 상황별 절차 / 실제 장애 사례 / 용어 사전 / 참고 문헌 / 목차 | Playbooks für typische Situationen / Reale Störungsfälle / Glossar / Quellenverzeichnis / Inhalt | body-cases, body-glossary, body-refs, body-shell |
| 관측으로 판정하기 | Diagnose anhand von Messdaten | body-judge |
| layer names (클라이언트 게임 프로세스, 데이터센터 네트워크 장비, 서버 OS (커널), 메모리, 디스크, 데이터베이스, 서버 구성과 운영, 서버 네트워크 카드, 일부에게만 생기는 문제, TCP 재전송의 근본 원인) | see 6.3 | body-l-* headings, body-partial, body-retrans |
| the five owner descriptions (게임 클라이언트 코드: …, 게임 서버 코드: …, 회선과 IDC …, 서버 장비·클라우드 …, DB 서버·스토리지 …) | copy from `src/i18n/de/data.json` (`owners/*/desc`) | body-owners |
| glossary terms used as cause titles (타이머 해상도, 복제 지연, 캐시 스탬피드, 연쇄 장애, 메모리 누수, 스왑, 캐시 미스, OOM 킬러, 데드락) | Timer-Auflösung, Replikationsverzögerung, Cache-Stampede, Kaskadierender Ausfall, Speicherleck, Swap, Cache-Miss, OOM-Killer, Deadlock | causes-* |
| other glossary terms reused as sim labels (방화벽, 로드밸런서, 게이트웨이, 캐시, 선연출, 발열 스로틀링, 타임아웃, 버스트 크레딧, 틱레이트, 보간, 보간 버퍼, 클라이언트 예측, 틱, 핑, 데드락, 링 버퍼, 집계 간격, 이용률, 재전송률, 불필요한 재전송, 락스텝, 롤백, 지연 보상) | as in `src/i18n/de/glossary.json` | sim-* |
| 같은 데이터센터 서버끼리 왕복 | Server zu Server im selben Rechenzentrum, hin und zurück | sim-ladder |
| 설계 | Design | sim-windows |
| " 초" (after a number) | " s" | sim-disk |

## 10. Checklist before `fill`

- Placeholders `{0}` … all present; HTML tags identical in number and attributes; `href`, `id`, `class`, `data-*` untouched.
- Symptom names exactly as in 6.1; factor names as in 6.2; layer names as in 6.3.
- Decimal comma, thousands period, space before units and %, en dash in ranges.
- No "—", no spaced " – ", no "nicht …, sondern …".
- German quotes „…“; no ASCII `"` in attribute strings.
- Run `node tools/i18n.cjs check de --warn` and `--conflicts`; number warnings are fine only where a Korean number word became German words or digits.

## 11. Decisions added during review

Settled by the translators and reviewers after the first pass. They override any older variant still found in the files.

| Korean | German | Note |
|---|---|---|
| 트래픽 | Traffic | "Datenverkehr" is fine; never bare "Verkehr". Compounds: Traffic-Muster, Traffic-Profil, Backbone-Traffic, Internet-Traffic, Angriffstraffic |
| 게임 스레드 | Game-Thread | never "Spiel-Thread" (client and server); title sp-sync-call „Synchrone Aufrufe im Game-Thread“ |
| RTO | das RTO | neuter everywhere |
| 경로 MTU | Path-MTU | never "Pfad-MTU" |
| 경로 (network) | Route | Routenmessung, auf der Route; "Pfad" only for several parallel paths (ECMP) |
| 세션 | Session | Session-Token, Session-ID, Geister-Session; not "Sitzung" (product metric names stay as the product writes them) |
| 유예 시간, 재연결 유예 시간 | Karenzzeit, Reconnect-Karenzzeit | not "Kulanzzeit" |
| N초 (after a digit) | N s | also in quotes, labels and table cells ("alle 30–60 s", „in 1,5 s Bodenschlag“); minutes and hours stay written out |
| 락스텝 턴 | Zug | „im selben Zug“, „Warten auf den Zug“; not "Schritt" |
| 입력 지연 (setting in lockstep/rollback) | Input-Delay | the symptom stays Input-Lag; not "Eingabeverzögerung" |
| 1인칭 / 3인칭 / 전지적 시점 | Ego-Perspektive / Third-Person-Perspektive / Gottperspektive | |
| FPS (genre) | Ego-Shooter | |
| 플레이아웃 버퍼 / 지터 버퍼 | Playout-Puffer / Jitter-Puffer | |
| 신뢰성 UDP | zuverlässiges UDP | glossary term „Zuverlässiges UDP“ |
| kernel and config parameter values (somaxconn, tcp_rto_max_ms, LimitNOFILE, TCP_BASE_MSS, InitialRto) | digits without thousands separator: 4096, 1024, 120000, 3000 ms | quantities in prose keep the separator (1.500 Byte, 65.535 Ports) |
| rpm | U/min | „7.200 U/min“ |
| 숫자 감각 (latency ladder table) | Größenordnungen | same as the card label 수치 감각 |
| 따라잡기 폭주 | Aufholspirale | one word, no hyphen |
| 먼저 부를 곳 | Zuerst hinzuziehen / Wen zuerst hinzuziehen | not "rufen" |
| 06장 (nav / in-text link) | „TCP-Retransmissions im Detail“ / „Kapitel 06 zu TCP-Retransmissions“ | |
| 회고 | Rückblick | postmortem documents in cases |
| 카나리 / 대조군 | Canary / Kontrollgruppe | |
| 서버의 무응답 판정 시간 | Heartbeat-Timeout des Servers | |
| 예고 (boss attack) | Vorwarnung, Vorwarnzeit | |
| 스킬 큐 / 시전 시간 | Skill-Queue / Cast-Zeit | |
| 패킷 캡처 | Paketmitschnitt | |
| traceroute 구간 | Hop | |
| 광모듈 | Transceiver | |
| 중간 장비 | Zwischengerät | |
| 예비 DB / 주 서버 | Standby-DB / Primärserver | |
| 수십~수백 배 | um einen zwei- bis dreistelligen Faktor | |
| 고무줄처럼 끌려가다, 서버 위치로 당겨짐 | (an die Serverposition) zurückgesetzt | the symptom name stays Rubberbanding: „wird A zurückgesetzt (Rubberbanding)“ |
| meta description | „Lag-Ursachen in Onlinespielen: warum es ruckelt, …“ | main search phrase first, at most about 155 characters |
| 사냥터 | Farmgebiet | |
| 따라잡기 폭주 | Aufholspirale | |
| MTU 탐색 | MTU-Probing | |
| 국내 (Korean operator view) | in Korea | „im Inland“ reads as Germany |
