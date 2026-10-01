# Indonesian (id): terminology and style guide

Target: Indonesia (`id-ID`). Readers are Indonesian game developers (client, server, netcode), SRE/infra engineers and, just as much, non-programmers in studios and publishers (game design, art, QA, PM, community/CS). Every Indonesian string must read as if an Indonesian senior engineer wrote it for colleagues: formal but plain Indonesian (bahasa baku, PUEBI/EYD spelling), the way good Indonesian tech documentation reads. Read `docs/I18N_GUIDE.md` first; this file adds the Indonesian decisions. When this file and your instinct disagree, follow this file so that ten translators produce one consistent text.

The Korean source is the truth. Do not add or drop facts, numbers, conditions, commands, IDs or URLs. Rewrite freely for natural Indonesian word order; never follow Korean sentence structure.

## 1. Site name and titles

| Korean | Indonesian (use exactly) | Notes |
|---|---|---|
| 게임 렉 백서 | **Buku Putih Lag Game** | Fixed site name, title case (proper noun). Never "Whitepaper Lag Game", never "Buku Putih tentang Lag". |
| 이 백서 | buku putih ini | Lowercase when generic |
| 백서 (generic) | buku putih | |
| 게임 렉 백서: 온라인 게임 렉 원인과 해결 담당 (full title) | Buku Putih Lag Game: penyebab lag game online dan siapa yang menanganinya | Main page `<title>` and `og:title` |
| … \| 게임 렉 백서 | … \| Buku Putih Lag Game | Suffix of every static page title |
| 게임 렉 <span>백서</span> (OG image) | Buku Putih <span>Lag Game</span> | |
| 텍스트 판 / 전체 텍스트 판 | versi teks / versi teks lengkap | |
| 원본 (the interactive site vs. the text edition) | versi interaktif | "Buka kartu interaktif …" |
| 원문 (Korean original of the site; source article of a case) | naskah asli (the site) / sumber asli (an article) | |

Why: Indonesian players and developers say "lag", "game lag", "penyebab lag game"; "buku putih" is the established Indonesian term for white paper (used by government, industry and crypto projects) and keeps the name short. "Lag Game" follows how people search ("penyebab lag game online"). The English alternate name "Game Lag White Paper" stays in structured data (the build adds it).

**Capitalization**: only the site name and the three team names (section 7.4) use title case. Everything else (headings, page titles after the colon, labels, buttons, legends, table headers) uses **sentence case**, as in Microsoft and Google Indonesian UI: "Cari berdasarkan gejala", "Yang diperiksa", "Pola grafik".

## 2. Register and voice

- **Audience**: game designers, artists, QA and producers first, engineers second. Write like a senior engineer explaining to a smart colleague from another discipline: plain, concrete, confident. Short sentences, one idea per sentence. No academic hedging, no marketing tone, no exclamation marks, no jokes.
- **Prose** (body text, card summary `s`, `num`, `more`, symptom `what/looks/tell`, factor `desc/cope`, glossary definitions, playbooks): the Korean is polite explanatory style (합니다체). Use neutral, formal-but-plain Indonesian in the present tense. Prefer active voice with a clear subject; use the di- passive where Indonesian naturally does ("Log GC diaktifkan …", "Paket dibuang"). Avoid stacked passives.
- **Addressing the reader**: **Anda** (always capitalized: Anda, Anda sendiri, layar Anda). Never "kamu", "lo", "kalian". Use "Anda" where the Korean addresses the reader (instructions, report guide, "try this") and where the Korean speaks from the player's first-person view:
  - 내 화면 / 내 캐릭터 / 내 PC / 내 입력 → "layar Anda", "karakter Anda", "PC Anda", "input Anda".
  - Exception: answer options spoken by a player keep first person: who `me` 나만 → "Hanya saya"; report items "hanya saya / anggota party juga …".
  - Otherwise stay impersonal ("Server …", "Periksa …", "Yang dicurigai …").
- **Operator voice** (우리 인프라팀, 우리 계약 밖): exclusive "kami" ("di luar kontrak kami"). Never inclusive "kita" for the operator.
- **`chk` fields** (how to confirm) are terse runbook lines, no subject, **no final period** (same as Korean). Separate several statements inside one field with ". " exactly as the Korean does.
  - `look`: imperative base verb, like an Indonesian runbook: "Aktifkan log GC, lalu tumpangkan waktu dan lama jeda di grafik waktu tick server", "Jalankan `ss -ti` di server dan bandingkan nilai `retrans`".
  - `yes`: short declarative fragment: "Lonjakan tick dan jeda GC terjadi di waktu yang sama, lama jeda kira-kira sama dengan lama lonjakan. Semua zona dan channel di server melonjak bersamaan".
  - `no`: pattern "observation: conclusion". Korean "… 쪽" / "다른 원인" at the end → "…: lebih mungkin X" or "…: mengarah ke X": "Tidak ada jeda panjang di log GC, tetapi tick tetap melonjak: lebih mungkin lock, pemanggilan sinkron, atau penulisan disk".
- **`c` triple** [Mengapa, Akibatnya, Di layar]: three short fragments, no final period: "Heap penuh, GC dimulai" → "Semua thread game dihentikan untuk pengumpulan garbage (makin banyak data hidup, makin lama)" → "Semua pemain di server berhenti bersamaan, lalu fast forward".
- **`act`** (team to-dos): comma-separated imperative phrases, one final period, exactly like the source: "Pilih GC dengan jeda singkat (ZGC, Shenandoah, G1 dengan target jeda lebih kecil) lewat opsi startup, kurangi alokasi, sesuaikan ukuran heap." `ext` items: "Imbau pemain untuk …", "Minta ISP (atau penyedia cloud) untuk …".
- **`sig.g`** (graph names): short noun phrases, comma-separated: "Waktu tick server, waktu jeda GC", "RTT (ping)", "Tingkat retransmisi", "Utilisasi CPU per core", "Jumlah koneksi dan disconnect", "Latensi query DB", "Panjang antrean disk", "Frame time".
- **Cause titles (`t`)**: noun phrase, standard incident name where one exists, sentence case, no final period: "Jeda GC stop-the-world di server", "Perebutan lock pada hot row", "Noisy neighbor", "Zero window". Titles that body text or simulations link to by exact string must be translated identically everywhere (search the Korean title in your groups).
- **Cases (`cases.js`)**: the Korean is plain written style (했다체). Use neutral past reporting ("Pada 28 Oktober 2021, …", "Layanan terhenti selama …"). Keep company names, product names, dates and times exactly as facts.
- **UI strings** (sims, buttons, legends, status lines): short, sentence case, no final period on labels and buttons; full sentences with periods in explanatory captions. Buttons use the base verb: "Muat skenario", "Salin tautan", "Coba sendiri", "Pilih bahasa".
- **Analogy boxes** (`class="analogy"`): keep the analogy, translate it naturally. Outside those boxes never use analogies; use the terms below.

## 3. Forbidden patterns (the two Korean house rules in Indonesian form)

1. **No dash asides.** PUEBI allows a tanda pisah (—) around an inserted explanation; this site does not. Never insert an explanation in the middle of a sentence with "—", "–" or spaced hyphens. Use parentheses, a comma, a colon, "yaitu", or split the sentence.
   - Bad: "Server — tepatnya game loop-nya — berhenti."
   - Good: "Game loop di server berhenti." / "Server berhenti (tepatnya game loop)."
   - The en dash is allowed only in ranges without spaces ("1–5 m", "0,2–0,5 detik"). Arrows (→, ↔) stay as in the source.
2. **No "not A but B".** Do not write "bukan A, melainkan B", "bukan A, tetapi B", "bukannya A, malah B", "alih-alih A, B", "yang bermasalah bukan A, melainkan B", "A bukan masalahnya; masalahnya B". State B directly; if ruling out A is itself a fact in the source, give it its own plain sentence.
   - Bad: "Ini bukan masalah koneksi, melainkan masalah server."
   - Good: "Penyebabnya ada di server. Koneksinya normal."
   - Korean "A보다는 B" (rather B than A) and "A 대신 B" (B instead of A) used as a correction follow the same rule. Plain descriptions are fine: "dibuang tanpa masuk antrean", "tanpa menunggu konfirmasi server", "sebagai pengganti pemain sungguhan".
   - Ordinary contrast with "tetapi", "namun", "sedangkan", "padahal" is allowed ("Rata-ratanya normal, tetapi ada paket yang terlambat").

## 4. Typography and spelling (PUEBI/EYD)

- **No italics available**: the site shows plain text. Write foreign terms plain, without quotes or any marking: "packet loss", "tick rate", "load balancer".
- **Quotes**: curly double quotes “ ” as in the source; single ‘ ’ for nested quotes. Straight quotes only inside `<code>`, commands and HTML attribute syntax. Never use ASCII `"` in attribute translations (`ctx` ending in `@aria-label`, `@title`, `@alt`, `@content`); the tool rejects `"`, `<`, `>`.
- **Punctuation**: sentence-final period and comma go outside the closing quote unless they belong to the quoted text. No space before `:`, `;`, `?`, `%`. One space after them.
- **Parentheses**: space before an opening parenthesis in Indonesian: "jitter (variasi selang waktu kedatangan paket)", "round-trip time (RTT)". Korean writes 지터(…) without a space; Indonesian does not.
- **Korean middle dot (·)**: in short labels use a slash without spaces for single words ("Wi-Fi/router", "Tick/thread", "GC/kebocoran", "Server/OS"). The three composite symptom names use " / " with spaces (section 7.1). In prose turn "A·B" into "A dan B", "A atau B", or a comma list, whichever fits the meaning; use "serta" for the last item of a long list.
- **Ellipsis**: the single character "…". With a list, prefer "dan sebagainya" or "dan lainnya" in prose.
- **"예:" / "예를 들어"** → "misalnya" (in parentheses "(misalnya …)"), "contoh:". **"등"** → "dan sebagainya", "dan lainnya", or "seperti …"; never "dll." in prose.
- **Affixes on English words** (PUEBI): join an Indonesian affix to a foreign word with a hyphen: "di-deploy", "di-restart", "di-rollback", "di-cache", "jitter-nya". Prefer avoiding the construction with an Indonesian verb or "melakukan": "dimulai ulang" (restart), "merilis patch", "melakukan rollback", "disimpan di cache". Indonesian words take affixes normally: "modenya", "diproses", "memuat".
- **Prefixes attached**: antar-, pasca-, pra-, non-, multi-, sub- are written together with Indonesian words ("antarserver", "antarkota", "nonaktif", "subbab"), and with a hyphen before a capital letter, abbreviation or number ("antar-ISP", "non-TCP", "pasca-2020").
- **Spelling traps** (use the left form): antrean (not antrian), analisis (analisa), aktivitas (aktifitas), praktik (praktek), risiko (resiko), standar (standard), sistem, kualitas, frekuensi, memengaruhi (mempengaruhi), mengubah (merubah), sekadar (sekedar), izin (ijin), objek (obyek), tepercaya (terpercaya), kedaluwarsa (kadaluarsa), detail, konfigurasi, cenderung, kerap, di mana (never "dimana"), "di" preposition separate ("di server"), "di-" prefix joined ("diproses").
- **"game", never "gim"**: industry and players use "game" (Asosiasi Game Indonesia). Likewise "game online" (never "daring" or "online game"), "server game", "klien game".
- **Keep verbatim** (never translate or re-case): cause IDs, `code`, commands and options (`ss -ti`, `-Xlog:gc*`), counters and metric names (`TcpExtTCPLostRetransmit`, `pg_stat_statements`), config keys, RFC numbers, product and tool names, URLs, `%SITE%`, everything inside `<code>`.

## 5. Numbers and units

- **Decimal comma, thousands period** (id-ID, matching the site's number formatter): 16,7 ms; 0,25 detik; 1,8 GB; 1.500 byte; 1.460 byte; 10.000; 65.535 port; 1.000 kali. Never group identifiers: years (2016), versions (JDK 26, Windows 10 1607), ports (443, 8080), RFC numbers (RFC 4787), error codes, model numbers.
- **Space between number and unit**: 50 ms, 1,5 GB, 60 Hz, 60 FPS, 100 Mbps, 5 m. **No space before %**: 0,1%, 80–90%. Unit symbols stay as in the source: ms, µs, ns, Mbps, Gbps, GB, MB, KB, IOPS, PPS.
- **Time words**: Korean 초 after a digit → "detik" ("0,5 detik", "30 detik"); 분 → "menit"; 시간 → "jam"; 일 → "hari". The code string `" 초"` (appended after a formatted number) → `" detik"`. `ms` stays `ms`.
- **Ranges**: Korean `~` → en dash without spaces: "1–5 m", "0,2–0,5 detik", "80–90%". With words: "beberapa hingga puluhan ms", "dari beberapa detik sampai puluhan detik".
- **Clock times and dates**: PUEBI uses a period in clock times: "pukul 21.52 UTC". Keep the source's time zone and 24-hour clock; 오전/오후 with a US zone becomes 24-hour with the zone kept ("pukul 23.48 PDT"). Dates: "28 Oktober 2021".
- **Tick rates**: "20틱 서버" → "server 20 tick" (as Indonesian players say "server 128 tick"); "20틱" alone → "20 tick"; "60Hz" → "60 Hz".
- **Multipliers**: "2배" → "2 kali lipat" (or "dua kali"), "1,000배" → "1.000 kali". Keep digits where the Korean has digits.
- **Vague Korean quantities** (keep the vagueness, never invent numbers):

| Korean | Indonesian |
|---|---|
| 수 ms | beberapa ms |
| 수~수십 ms | beberapa hingga puluhan ms |
| 수십 ms | puluhan ms |
| 수백 ms | ratusan ms |
| 수 초 | beberapa detik |
| 수~수십 초 | beberapa hingga puluhan detik |
| 십여 초 | belasan detik (about ten-odd seconds) |
| 몇 초~십여 초에 한 번 | setiap beberapa detik hingga belasan detik sekali |
| 수 GB | beberapa GB |
| 1만 / 100만 | 10.000 / 1 juta |
| 약 / 쯤 / 안팎 | sekitar, kira-kira |
| 이상 / 이하 / 미만 / 초과 | minimal … (atau lebih) / maksimal … / kurang dari … / lebih dari … |
| 한두 개 | satu atau dua |

  The check tool may then warn "숫자가 다름"; that is expected when a Korean number word becomes digits or words.

### Short strings with a number placeholder (no plural agreement problem)

Indonesian nouns do not change with number, so "{0} penyebab" reads correctly for 1 and for 228. Rules:
- Put the number before the noun without a classifier: `원인 {0}가지` → `{0} penyebab`; `출처 {0}건` → `{0} sumber`; `자료 {0}건, 발행처 {1}곳` → `{0} referensi dari {1} penerbit`.
- **Never reduplicate** after a numeral or quantifier: "3 paket", "beberapa server", "banyak pemain" (never "3 paket-paket", "banyak pemain-pemain").
- English loanwords never take an English plural -s: "20 tick", "4 thread", "2 core", "1.500 byte", "3 frame".
- Do not add "buah", "sebanyak", "(s)" or "(-an)" to counts.

## 6. Korean constructions and how to render them

- **Word order (DM rule)**: Indonesian puts the head noun first. "서버 틱 시간" → "waktu tick server"; "GC 로그" → "log GC"; "NAT 테이블" → "tabel NAT"; "게임 서버" → "server game"; "게임 클라이언트" → "klien game". Established English compounds stay as a unit and are never reversed inside: "packet loss", "load balancer", "connection pool", "thread pool", "game loop", "frame time", "tick rate", "tick budget", "tail latency", "cache miss", "input lag", "hot row".
- **Nominal Korean endings** (…함, …봄, …임) in `chk`, `c`, `sig.g` → Indonesian imperative (look) or short statement (yes/no). Never "dapat dilihat bahwa …" chains, never heavy peN-an nominalizations ("Pengaktifan log GC dan penumpangan …").
- **Topic-first sentences** ("서버 GC는, …") → normal Indonesian order with the subject or condition first ("Saat GC di server berjalan, …").
- **Long attributive chains** ("…하는 …인 …의 X") → one "yang" clause at most, or two sentences. Avoid "yang … yang … yang".
- **Conditions** "~하면" → "Jika …, …" (also "Kalau …", "Saat …", "Begitu …"). Vary them; do not start five sentences in a row with "Jika".
- **"~을 봅니다" (look at X, as a diagnostic step)** → "Periksa X, Y, dan Z." or "Yang perlu diperiksa: X dan Y."
- **"~때문에"** → "karena", "akibat", "gara-gara" (never in formal prose). Prefer a verb over a noun chain.
- **Parenthetical glosses** from TERMS.md (e.g. "지터(도착 간격의 흔들림)") → keep as parentheses: "jitter (variasi selang waktu kedatangan paket)".
- **Hedging** 대개 / 흔히 / 종종 / 가끔 → biasanya / umumnya / sering / sesekali.
- **Onomatopoeia** (멈칫 멈칫, 휙, 파파파팍) → plain Indonesian: "tersendat, tersendat", "tiba-tiba", "bertubi-tubi". No comic sounds.
- **Calques to avoid**: "di mana" as a relative pronoun ("server di mana …" → "server tempat …" or "server yang …"); "yang mana"; "daripada" outside comparisons; "merupakan" and "adalah" in every sentence; "melakukan" + noun when a verb exists ("melakukan pengecekan" → "memeriksa"); "sangat sekali"; "para" + reduplication.
- **Korean facts stay Korean**: Korean ISP names, Korean cities, KRW prices and Korean institutions are kept as facts (Seoul, Tokyo, KT, SK Broadband, LG U+). Do not swap in Indonesian examples.

## 7. Terminology

Identical Korean strings must get identical Indonesian strings in every group: the build keeps one dictionary per language, and `node tools/i18n.cjs check id --conflicts` lists differences. Strings already translated in `data`, `glossary`, `site`, `meta`, `ui-kit` are the reference; copy them when the same Korean string appears in your group (layer names as chapter headings, owner descriptions in `body-owners`, glossary terms as cause titles). Section 9 lists the shared keys.

### 7.1 Symptom names (fixed; use exactly these everywhere)

| id | Korean | Indonesian name | Aliases (translation of `alias`, lowercase, comma-separated) |
|---|---|---|---|
| stutter | 뚝뚝 끊김 | **Patah-patah** | tersendat-sendat, putus-putus, terasa seperti FPS drop |
| teleport | 순간이동 | **Teleport** | warp, teleportasi, berhenti lalu tiba-tiba melompat |
| rubber | 고무줄 | **Rubber banding** | tertarik ke belakang, ketarik balik, rollback posisi |
| burst | 몰아치기 | **Fast forward** | bertubi-tubi, seperti dipercepat, semua diproses sekaligus |
| slowmo | 슬로우모션 | **Slow motion** | dunia game melambat, semuanya terasa lamban |
| delay | 입력 지연 | **Input lag** | respons terlambat, lamban, kontrol terasa berat |
| freeze | 멈춤 | **Freeze** | membeku, hang, tidak merespons |
| dropped | 씹힘·롤백 | **Aksi hilang / rollback** | skill tidak keluar, item kembali seperti semula, trade gagal |
| disconnect | 접속 끊김 | **Disconnect** | DC, terlempar keluar, koneksi ke server terputus |
| noconnect | 접속 불가·무한 로딩 | **Tidak bisa masuk / loading tanpa henti** | tidak bisa login, loading tak kunjung selesai |
| invisible | 안 보임·유령 개체 | **Tidak terlihat / objek hantu** | NPC tidak muncul, karakter transparan, monster yang sudah mati masih berdiri |

Why these words: Indonesian players say "game patah-patah", "karakternya teleport", "rubber banding", "kayak di-fast forward", "jadi slow motion", "input lag", "game freeze", "sering disconnect/DC", "stuck loading". Aliases may keep the gamer register (ketarik balik, DC); the names and the prose stay formal.

Rules for symptom names:
- Capital first letter when the name stands alone (label, chip, heading, list item, table cell). Inside a sentence write it lowercase, except the first word of a sentence: "muncul sebagai patah-patah atau teleport", "zona itu menjadi slow motion".
- Use the name as a noun, and where natural as a verb or complement: "karakter teleport", "layar freeze beberapa detik", "game terasa patah-patah", "pemain disconnect", "terjadi fast forward", "mengalami rubber banding". Do not substitute synonyms in prose (no "stutter", "nge-lag", "DC", "ter-kick" as the symptom name; those are aliases only).
- Korean uses 멈춤/멈추다 also generically (GC 멈춤, 서버가 멈춘다). Only the symptom is "Freeze". GC pause → "jeda GC"; server stall → "server berhenti", "tick terhenti", "thread tertahan"; the OS freezing apps (iOS freeze) → "dibekukan". A single short hitch 멈칫 (not a symptom name) → "tersendat sesaat"; 짧은 멈춤 → "jeda singkat".
- Composite names in running text: "aksi hilang atau rollback", "tidak bisa masuk atau loading tanpa henti", "objek yang tidak terlihat atau objek hantu" are acceptable when grammar needs it; in lists, headings, chips and tables use the exact name with " / ".
- Generic 연결 끊김/끊기다 (not the symptom) → "koneksi terputus", "putus". "Disconnect" is reserved for the symptom and the disconnect count on graphs.
- Symptom page title pattern: "{Nama} di game online: penyebab dan penanggung jawabnya | Buku Putih Lag Game".

### 7.2 The four factors (`fx`)

| id | Korean | Indonesian name | `how` line |
|---|---|---|---|
| lat | 지연 | **Latensi** | Paket datang terlambat |
| jit | 지터 | **Jitter** | Paket datang tidak beraturan |
| loss | 손실 | **Packet loss** | Paket tidak sampai sama sekali |
| stall | 정체 | **Stall** | Ada yang berhenti memproses |

- 요인 → "faktor"; 렉의 네 가지 요인 → "empat faktor penyebab lag"; 게임의 대처 → "cara game mengatasinya"; 가리지 못하면 → "jika tidak bisa ditutupi".
- **Stall**: kept in English like Jitter and Packet loss; gloss once where the Korean explains it: "stall (pemrosesan terhenti)". In sentences: "server stall", "tick terhenti", "proses berhenti". Do not use "macet" for the factor (it reads as network congestion).
- 지연 in other senses: the measure → "latensi"; a specific wait → "jeda", "waktu tunggu", "keterlambatan"; 입력 지연 → "Input lag" (symptom); 지연 보상 → "lag compensation"; 지연 ACK → "delayed ACK"; 복제 지연 → "replication lag"; 꼬리 지연 → "tail latency"; 네트워크 지연 → "latensi jaringan".
- 패킷 손실 and 손실 → "packet loss" (never "kehilangan paket"). The verb: "paket hilang", "paket dibuang".
- First mention of jitter in each chapter (where the Korean glosses it): "jitter (variasi selang waktu kedatangan paket)".

### 7.3 Layers and topics (`layers`, `extraLayers`)

층 / 레이어 → **lapisan** ("L3", "Lapisan 3 dari 13"). 층·주제 → "Lapisan/topik". 주제 (the 3 topics) → "topik".

| id | name | short (nav/badges) | side |
|---|---|---|---|
| client-game | Proses game di klien | Game Anda | 내 쪽 → Sisi Anda |
| client-os | OS dan perangkat klien | PC/ponsel Anda | Sisi Anda |
| home | Jaringan rumah | Wi-Fi/router | Sisi Anda |
| isp | Jalur internet | ISP/luar negeri | 가는 길 → Di tengah jalur |
| dc-net | Perangkat jaringan data center | Firewall/LB | 서버 쪽 → Sisi server |
| nic | Kartu jaringan server | NIC | Sisi server |
| server-os | OS server (kernel) | Kernel | Sisi server |
| socket | Socket dan protokol | TCP/UDP | 양쪽 끝 → Kedua ujung |
| server-proc | Proses game di server | Tick/thread | Sisi server |
| memory | Memori | GC/kebocoran | Sisi server |
| disk | Disk | IOPS | Sisi server |
| db | Database | DB | Sisi server |
| infra | Arsitektur dan operasional server | Arsitektur/operasional | Sisi server |
| sync (topic) | Desain sinkronisasi | Desain sinkronisasi | 설계 → Desain |
| partial (topic) | Masalah yang hanya dialami sebagian pemain | Hanya sebagian | 범위 → Cakupan |
| retrans (topic) | Akar penyebab retransmisi TCP | Retransmisi TCP | 원인 → Penyebab |

동기화 → "sinkronisasi" (the mechanism and the design area); 동기화 방식 → "model sinkronisasi"; 넷코드 → "netcode".

Chapter titles (body `h2`); chapter headings that reuse layer names must match the table above:

| Korean | Indonesian |
|---|---|
| 렉은 네 가지 요인으로 만들어진다 | Lag berasal dari empat faktor |
| 패킷의 이동 경로: 내 손가락에서 서버의 DB까지 | Perjalanan paket: dari jari Anda sampai DB server |
| 렉 실험실 | Lab lag |
| 증상 사전 | Kamus gejala |
| 같은 핑, 다른 체감: 동기화 방식 | Ping sama, rasa berbeda: model sinkronisasi |
| 한 명만 느릴 때, 한쪽만 이상할 때 | Saat hanya satu pemain yang lag, saat hanya satu sisi yang aneh |
| TCP 재전송: 왜 생기고, 왜 이렇게 느려지나 | Retransmisi TCP: mengapa terjadi dan mengapa begitu lambat |
| 게임개발팀이 고칠 것, 인프라팀이 고칠 것 | Bagian Tim Pengembang Game, bagian Tim Infrastruktur |
| 클라이언트 OS와 기기 | OS dan perangkat klien |
| 집 네트워크: 와이파이·공유기·모바일망 | Jaringan rumah: Wi-Fi, router, jaringan seluler |
| 인터넷 회선: 통신사망과 장거리 구간 | Jalur internet: jaringan ISP dan jalur jarak jauh |
| 서버 네트워크 카드(NIC) | Kartu jaringan server (NIC) |
| 소켓과 프로토콜: TCP, UDP, 소켓 옵션 | Socket dan protokol: TCP, UDP, opsi socket |
| 서버 게임 프로세스: 틱과 스레드 | Proses game di server: tick dan thread |
| 진단 도우미 | Asisten diagnosis |
| 관측으로 판정하기 | Diagnosis dari data monitoring |
| 판정 흐름 / 판정 신호표 | Alur diagnosis / Tabel sinyal diagnosis |
| 범위 → 시점 → 계층 (judge flow) | cakupan → waktu → lapisan |
| 범위 (standalone key: topic side, table header, filter label) | Cakupan |
| 그래프 모양으로 찾기 | Mencari dari pola grafik |
| 숫자 읽는 법 | Cara membaca angka |
| 사례와 절차 / 상황별 절차 | Kasus dan prosedur / Prosedur per situasi |
| 실제 장애 사례 | Kasus insiden nyata |
| 패치 이후 렉 / 해외 국가 추가 | Lag setelah patch / Membuka layanan di negara baru |
| 렉 제보 잘하는 법 | Cara melaporkan lag dengan baik |
| 용어 사전 | Glosarium |
| 참고 문헌 | Daftar pustaka |
| 목차 | Daftar isi |
| 증상별로 찾기 / 증상별 원인 | Cari berdasarkan gejala / Penyebab per gejala |
| 이 층에서 렉을 만드는 원인 | Penyebab lag di lapisan ini |
| 시간 감각 / 숫자 감각 (sim) | Memahami skala waktu / Skala angka |

### 7.4 Teams and owners

The three team names are treated as unit names and written in **title case everywhere**, also mid-sentence ("hubungi Tim Infrastruktur", "Tugas Tim Pengembang Game").

| Korean | Indonesian | Notes |
|---|---|---|
| 게임개발팀 (`game`) | **Tim Pengembang Game** | owns client and server code. Never "tim developer", never "tim dev" |
| 인프라팀 (`infra`) | **Tim Infrastruktur** | network, servers/OS, DB hosts |
| 외부 (`ext`, team and owner) | **Pihak Eksternal** | players' environment, ISPs, cloud providers |
| 클라이언트 개발 (`cli`) / short 클라이언트 | Pengembangan klien / Klien | |
| 서버 개발 (`srv`) / short 서버 | Pengembangan server / Server | |
| 네트워크 인프라 (`net`) / short 네트워크 | Infrastruktur jaringan / Jaringan | |
| 서버 인프라 (`sys`) / short 서버 장비·OS | Infrastruktur server / Server/OS | |
| DB 인프라 (`dba`) / short DB 장비 | Infrastruktur DB / Server DB | |
| short 유저·통신사·클라우드 | Pemain/ISP/cloud | |
| 담당, 해결 담당 | penanggung jawab | 담당 팀 → tim penanggung jawab; 담당 코드 → kode penanggung jawab |
| 주 담당 | Penanggung jawab utama | label, no colon |
| 함께 (also involved) | Turut terlibat | label, no colon |
| {팀} 할 일 / 게임개발팀이 할 일 | Tugas {Tim} / Tugas Tim Pengembang Game | |
| 유저 안내·외부 요청 | Panduan pemain dan permintaan eksternal | |
| 팀별 대응 / 대응 | Penanganan per tim / Penanganan | |
| 누가 고치나 | Siapa yang memperbaiki | |
| 먼저 부를 곳 | Pihak yang dihubungi pertama | |
| 넘길 때 챙길 정보 | Informasi yang disertakan saat serah terima | |
| 에스컬레이션 | eskalasi | |
| 안내 (to players) / 요청 (to providers) / 우회 | panduan untuk pemain / permintaan ke penyedia / solusi sementara (workaround) | |
| team·owner joiner `{0}·{1}` | `{1} ({0})` | "Pengembangan server (Tim Pengembang Game)" |
| sentence joiner `{0}. {1}` | `{0}. {1}` | |

### 7.5 Who / when (`who`, `when`)

| who | Indonesian | when | Indonesian |
|---|---|---|---|
| me 나만 | Hanya saya | always 항상 | Selalu |
| home 같은 집 | Satu rumah | peak 저녁 피크 시간 | Jam sibuk malam hari |
| region 특정 지역·통신사 | Wilayah/ISP tertentu | event 사람이 몰릴 때 | Saat banyak pemain berkumpul |
| zone 특정 장소·채널 | Lokasi/channel tertentu | login 접속·점검 직후 | Tepat setelah login atau maintenance |
| server 서버 전체 | Seluruh server | idle 가만히 있다가 | Setelah lama diam |
| feature 특정 기능만 | Fitur tertentu saja | random 가끔 무작위로 | Sesekali secara acak |
| onechar 특정 캐릭터만 이상해 보임 | Hanya satu karakter yang terlihat aneh | periodic 일정한 주기로 | Secara berkala |
| oneclient 같은 PC의 한쪽 클라만 | Hanya satu klien di PC yang sama | uptime 오래 켜 둘수록 | Makin lama menyala |
| | | moving 이동 중·지역 전환 때 | Saat bergerak atau pindah area |
| | | action 특정 행동을 할 때 | Saat melakukan aksi tertentu |

Labels: 누가 겪나 → "Siapa yang mengalami", 누가 → "Siapa", 언제 → "Kapan", 모양 (symptom shape in triage and report) → "Bentuk gejala".

### 7.6 Graph shapes (`sigs`) and check-by (`chkBy`)

그래프 모양 → **pola grafik**; {0} 모양의 그래프 → "Pola grafik: {0}"; 그래프에서는 → "Di grafik"; 튀다 / 솟다 (graph) → "melonjak"; 스파이크 → "lonjakan" (in gamer compounds "ping spike", "lag spike" are fine).

| id | Korean | Indonesian name |
|---|---|---|
| periodic | 일정 주기로 튐 | Melonjak secara berkala |
| random | 가끔 무작위로 튐 | Melonjak acak sesekali |
| step | 어느 순간부터 계단처럼 올라감 | Naik seperti anak tangga |
| ramp | 서서히 오름 | Naik perlahan |
| sawtooth | 서서히 오르다 뚝 떨어짐 | Naik perlahan lalu anjlok |
| peak | 특정 시간대에만 높음 | Tinggi hanya di jam tertentu |
| load | 인원·부하를 따라 오름 | Naik mengikuti beban |
| ceiling | 한도에 닿아 평평해짐 | Mendatar di batas |
| high | 처음부터 늘 높음 | Selalu tinggi sejak awal |
| outlier | 일부만 높음 | Hanya sebagian yang tinggi |
| gap | 끊겼다가 몰아서 | Kosong lalu datang sekaligus |
| drop | 연결이 한꺼번에 끊김 | Koneksi putus serentak |
| surge | 접속·점검 직후 폭증 | Melonjak tepat setelah server dibuka |

| by | Korean (data) | Indonesian (data) | Short form (ui: 인프라 도구 / 게임 로그·지표 / 유저 쪽) |
|---|---|---|---|
| ops | 인프라 도구로 확인(게임 코드 불필요) | Tools infrastruktur (tanpa perlu kode game) | Tools infrastruktur |
| code | 게임 서버·클라이언트의 로그·지표가 필요 | Log dan metrik server atau klien game | Log/metrik game |
| user | 유저 쪽 환경에서 확인 | Lingkungan pemain sendiri | Sisi pemain |

확인 방법 → "Cara memastikan"; 확인 수단 → "Sarana pemeriksaan".

### 7.7 Card, page and UI labels

| Korean | Indonesian |
|---|---|
| 원인 (label, table header, side) / 근본 원인 | Penyebab / akar penyebab |
| 원인 ID / 원인 카드 / 원인 항목 | ID penyebab / kartu penyebab / entri penyebab |
| 왜 → 그러면 → 화면에서는 | Mengapa → Akibatnya → Di layar |
| 증상 / 요인 | Gejala / Faktor |
| 수치 감각 | Kisaran angka |
| 확인할 곳 / 이러면 맞음 / 이러면 아님 | Yang diperiksa / Cocok jika / Tidak cocok jika |
| 더 알아보기 | Pelajari lebih lanjut |
| 실제 사례 | Kasus nyata |
| 무슨 일 / 배울 점 / 관련 원인 / 원문 | Apa yang terjadi / Pelajaran / Penyebab terkait / Sumber asli |
| 출처 / 참고 문헌 / 장별 출처 / 이 장의 출처 | Sumber / Daftar pustaka / Sumber per bab / Sumber bab ini |
| 함께 보면 좋은 원인 | Lihat juga |
| 다른 말 | Disebut juga |
| 단서 | Petunjuk |
| 링크 복사 / 복사됨 | Salin tautan / Disalin |
| 관련 장 → | Bab terkait → |
| 직접 해보기 / 이렇게 해보세요 / 상황 불러오기 | Coba sendiri / Coba langkah berikut / Muat skenario |
| 좋음 / 주의 / 나쁨 | Baik / Waspada / Buruk |
| 실험 (a sim) / 시뮬레이션 | simulasi |
| 장 / 절 / 층 / 주제 | bab / subbab / lapisan / topik |
| 준비 중입니다. | Sedang disiapkan. |
| 언어 선택 | Pilih bahasa |
| 제보 / 렉 제보 | laporan / laporan lag |
| 진단 / 판정 (diagnosis) | diagnosis |
| 판정과 사례 | Diagnosis dan kasus |
| 원본 장 | Bab di versi interaktif |
| 그림과 실험이 있는 원본 / 그림과 직접 조작하는 실험이 있는 원본 | versi interaktif dengan gambar dan simulasi / … yang bisa Anda coba sendiri |
| 직접 조작하는 실험 | simulasi interaktif |
| 갱신 {0} / 다른 언어 / 문서 | Diperbarui {0} / Bahasa lain / Dokumen |
| 반드시 적어 주세요 / 있으면 조사가 훨씬 빨라집니다 (report guide) | Wajib dicantumkan / Jika ada, investigasi jauh lebih cepat |
| 자료 {0}건, 발행처 {1}곳 | {0} referensi dari {1} penerbit |
| 공신력 있는 출처 | sumber tepercaya |

### 7.8 Netcode and game terms

| Korean | Indonesian | Note |
|---|---|---|
| 렉 | lag | 렉이 생기다 → "terjadi lag", "game mengalami lag"; "ngelag" only in aliases and SEO notes |
| 핑 / 왕복 시간 | ping / round-trip time (RTT) | plain prose: "waktu pulang-pergi"; 핑이 높다 → ping tinggi; 핑 튐 → ping melonjak (ping spike); 게임 안 핑 → ping di dalam game; 게임 밖에서 잰 핑 → ping yang diukur di luar game |
| 틱 / 틱레이트 / 틱 간격·주기 | tick / tick rate / interval tick | |
| 틱 예산 / 틱 예산 초과 | tick budget / tick melewati budget (tick overrun) | gloss once: "tick budget (batas waktu per tick)" |
| 게임 루프 / 메인 스레드 | game loop / main thread | 루프 한 번 → satu putaran loop |
| 프레임 / 프레임 타임 / 프레임 드랍 | frame / frame time / FPS drop (frame drop) | |
| FPS / 주사율 / 가변 주사율 / 화면 찢어짐 | FPS / refresh rate / variable refresh rate (VRR) / screen tearing | |
| 스냅샷 / 델타 압축 | snapshot / kompresi delta | |
| 게임 상태 / 상태 업데이트 | state game / update state | 세계 (what the server simulates) → state game |
| 서버의 실제 상태 | state sebenarnya di server | |
| 보간 / 보간 버퍼 | interpolasi / buffer interpolasi | |
| 외삽 | ekstrapolasi (dead reckoning) | |
| 예측 / 클라이언트 예측 | prediksi / prediksi sisi klien | |
| 서버 보정 | rekonsiliasi server | |
| 되감기 / 지연 보상 | memutar mundur waktu (rewind) / lag compensation | |
| 권위 서버 / 서버 권위 / 클라이언트 권위 | server otoritatif / otoritas server / otoritas klien | |
| 요청-응답 / 상태 동기화+보간 / 명령 동기화 / 이벤트 예약 | request-response / sinkronisasi state + interpolasi / sinkronisasi perintah / event terjadwal | |
| 락스텝 | lockstep (deterministic lockstep) | |
| 롤백 넷코드 / 롤백 (DB) | rollback netcode / rollback | |
| 선입력 / 선입력 허용 시간 | input buffering / batas waktu input buffering | |
| 서버 입력 버퍼 | buffer input di server | |
| 선연출 | feedback sisi klien | animations/effects played before the server confirms |
| 판정 | keputusan server; 공격 판정 → hit registration; 이동 검증 → validasi gerakan | 판정 시점 → waktu penilaian |
| 판정 구간 / 허용 시간 / 패링 판정 | timing window / batas waktu / parry window | |
| 스킬 씹힘 | skill tidak keluar | |
| 시야 / 시야 계산 / AOI | jarak pandang / perhitungan jarak pandang / AOI (area of interest) | 셀 / 격자(그리드) → sel / grid |
| 브로드캐스트 | broadcast | |
| 개체 / 개체 ID / 등장·퇴장 알림 | objek / ID objek / pesan spawn/despawn | |
| 제어 권한 (몬스터) | otoritas kontrol | |
| 채널 / 존 / 필드 / 페이즈 | channel / zona / field / phasing | 존 이동 → pindah zona; 지역 이동·전환 → pindah area |
| 월드 보스 / 공성전 / 레이드 / 던전 | world boss / siege / raid / dungeon | |
| 파티 / 파티원 / 방장 | party / anggota party / host | |
| 몬스터 / NPC / 캐릭터 모델 / 이름표 | monster / NPC / model karakter / name tag | |
| 스킬 시전 / 쿨다운 / 데미지 / 이펙트 / 체력 | cast skill / cooldown / damage / efek / HP | |
| 아이템 / 인벤토리 / 거래 | item / inventory / trade (DB sense: transaksi) | |
| 리슨 서버 | listen server | |
| 넷코드 / 넷그래프 | netcode / net graph | |
| 동시 접속 / 인원 | pemain online bersamaan (CCU) / jumlah pemain | |
| 로그인 / 로그인 대기열 / 대기 순번 | login / antrean login / nomor antrean | |
| 재접속 / 자동 재접속 | reconnect / reconnect otomatis | 재접속하니 → setelah login ulang |
| 로딩 / 로딩바 / 입장 화면 | loading / loading bar / layar masuk | |
| 점검 | maintenance | never "pemeliharaan" in game context |
| 패치 / 배포 | patch / deploy | 배포 직후 → tepat setelah deploy |
| 이벤트 | event | |
| 크래시 / 강제 종료 | crash / tertutup paksa | |
| 게임 가속기 | game booster (VPN game) | |
| 안티치트 / 치팅 / 게임 해킹 | anti-cheat / cheating / cheat | |
| 오버레이 | overlay | |
| 셰이더 컴파일 / 셰이더 캐시 | kompilasi shader / cache shader | |
| 에셋 / 에셋 로딩 / 지연 로딩 | aset / pemuatan aset / lazy loading | |
| 격투 게임 / 경쟁 슈팅 게임 | game fighting / game shooter kompetitif | |
| 비신뢰(unreliable) 채널 / 신뢰성 UDP | channel unreliable / reliable UDP | |
| 게임 시간 / 게임 속도 | waktu game / kecepatan game | |
| 체감 | rasa bermain, yang dirasakan pemain | |

### 7.9 Player side, home and ISP

| Korean | Indonesian | Note |
|---|---|---|
| 유저 | pemain | "pengguna" only in the OS/software sense (user space, end user) |
| 회선 | koneksi (player's internet); jalur, sirkuit (DC, backbone) | 회선이 흔들린다 → jitter koneksi besar; 회선은 멀쩡하다 → koneksinya baik-baik saja |
| 통신사 / 통신사망 | ISP / jaringan ISP | mobile: operator seluler |
| 공유기 | router | |
| 와이파이 / 유선 / 무선 구간 | Wi-Fi / kabel (LAN) / jalur nirkabel | never "WiFi" or "wifi" |
| 무선 채널(주파수 대역) / 전파 간섭 | channel nirkabel (pita frekuensi) / interferensi sinyal | |
| 모바일망 / 기지국 / 핸드오버 | jaringan seluler / BTS / handover | |
| 폰 | ponsel | "HP" only in aliases |
| 버퍼블로트 / SQM / QoS | bufferbloat / SQM / QoS | |
| NAT / NAT 테이블 / CGNAT | NAT / tabel NAT / CGNAT | |
| 공인 IP / 사설망 | IP publik / jaringan privat | |
| 해외 / 해외 서버 | luar negeri / server luar negeri | |
| 해저 케이블 / 광케이블 | kabel bawah laut / kabel serat optik | |
| 경로 / 우회 경로 / 병목 구간 | rute / rute memutar / bottleneck | ECMP: jalur |
| 피어링 / BGP | peering / BGP | |
| 피크 시간 / 저녁 피크 | jam sibuk / jam sibuk malam | |
| 장거리 구간 | jalur jarak jauh | |
| 저궤도 위성 인터넷 | internet satelit orbit rendah (LEO) | |
| 절전 상태 / 절전 해제 | mode hemat daya / bangun (wake-up) | |
| 일시 정지(suspend) / 동결(freeze) (OS on apps) | ditangguhkan (suspend) / dibekukan (freeze) | never "Freeze" (symptom) |
| 백그라운드 앱 / 백그라운드 창 / 최소화 | aplikasi di latar belakang / jendela di latar belakang / diminimalkan | |
| 발열 스로틀링 | thermal throttling | |
| 타이머 해상도 | resolusi timer | |
| 프레임 생성 | frame generation | |

### 7.10 Data center, network, NIC and transport

| Korean | Indonesian | Note |
|---|---|---|
| 패킷 / 메시지 | paket / pesan | |
| 대역폭 / 처리량 | bandwidth / throughput | |
| 대기열, 대기열에 쌓이다 | antrean, menumpuk di antrean | |
| 대기열 넘침 / 넘치다 | antrean meluap / meluap (overflow) | |
| 버퍼 | buffer | |
| 혼잡 | kongesti (congestion); plain prose "jalur padat" | never "macet" in technical text |
| 데이터센터, IDC | data center | |
| 방화벽 / 로드밸런서 / 헬스체크 / 스위치 / 라우터 / LAG | firewall / load balancer / health check / switch / router / LAG | |
| 세션 테이블 / conntrack 테이블 / 연결 추적 | tabel sesi / tabel conntrack / connection tracking (pelacakan koneksi) | 연결을 추적한다 / 추적 항목이 만료된다 → melacak koneksi / entri pelacakannya kedaluwarsa |
| DDoS 방어 / 스크러빙 센터 / 오탐 | proteksi DDoS / scrubbing center / false positive | |
| 마이크로버스트 / 버스트 / 송신 버스트 | microburst / burst / burst pengiriman | |
| 유휴 타임아웃 / 유휴 연결 / 장비별 유휴 타임아웃 | idle timeout / koneksi idle / idle timeout per perangkat | |
| 조용히 버림(silent drop) | dibuang diam-diam (silent drop) | |
| 보안 그룹 / 네트워크 ACL / VPC | security group / network ACL / VPC | |
| NAT 게이트웨이 / SNAT | NAT gateway / SNAT | |
| 클라우드 사업자 / 인스턴스 / 호스트 / 호스트 점검 | penyedia cloud / instance / host / maintenance host | |
| 가상 머신 | virtual machine (VM) | |
| 라이브 마이그레이션 / 노이지 네이버 | live migration / noisy neighbor | |
| 링 버퍼 / 슬롯 | ring buffer / slot | |
| 인터럽트 / 인터럽트 병합 | interrupt / interrupt coalescing | |
| 수신 큐 / 송신 대기열 | antrean terima (RX queue) / antrean kirim (TX queue) | |
| RSS / PPS / 클라우드 PPS 한도 | RSS / PPS / batas PPS cloud | |
| 단편화 / 프래그먼트 / 단편화되다 | fragmentasi / fragmen / terfragmentasi | |
| MTU / MSS / 최대 세그먼트 크기 / MTU 블랙홀 | MTU / MSS / ukuran segmen maksimum / MTU black hole | |
| 불량 케이블 / 광모듈 | kabel rusak / modul optik (transceiver) | |
| ICMP 응답을 제한한다 | membatasi respons ICMP | |
| 재전송 / 재전송 타이머 / RTO / 재전송률 | retransmisi (verb: mengirim ulang) / timer retransmisi / RTO / tingkat retransmisi | 손실로 판단해 재전송한다 → menganggap paket hilang lalu mengirimnya ulang; RTO가 만료된다 → RTO habis |
| 재전송 패킷 | paket retransmisi | |
| 불필요한 재전송 | retransmisi yang tidak perlu (spurious retransmission) | |
| 빠른 재전송 / 재전송 백오프 | fast retransmit / backoff retransmisi (exponential backoff) | |
| 순서 보장 / “보낸 순서대로만 넘겨줌” | jaminan urutan / “hanya meneruskan data sesuai urutan pengiriman” | 보장한다 → menjamin |
| 시퀀스 번호 | nomor urut (sequence number) | |
| HOL 블로킹 | HOL blocking (head-of-line blocking) | |
| thin stream | thin stream | |
| TLP / RACK-TLP / 마지막 패킷들의 손실(tail loss) | TLP / RACK-TLP / hilangnya paket-paket terakhir (tail loss) | |
| 선택적 ACK(SACK) / 중간에 빠진 부분 | selective ACK (SACK) / bagian yang hilang di tengah | |
| ACK(수신 확인) / 지연 ACK | ACK (konfirmasi terima) / delayed ACK | |
| 아직 ACK를 받지 못한 패킷(in-flight) | paket yang belum mendapat ACK (in-flight) | |
| 혼잡 윈도우 / 수신 윈도우 / 윈도우 | congestion window (cwnd) / receive window (rwnd) / window | keep English |
| 윈도우 크기·윈도우 스케일 | ukuran window, window scaling | |
| 제로 윈도우 / 제로 윈도우 프로브 | zero window / zero window probe | |
| 전송량 축소 | penurunan laju kirim | |
| Nagle 알고리즘 / TCP_NODELAY / keepalive / RST | algoritma Nagle / TCP_NODELAY / keepalive / RST | |
| 소켓 / 소켓 버퍼 / 송신·수신 버퍼 / 수신 버퍼 넘침 | socket / buffer socket / buffer kirim dan buffer terima / buffer terima meluap | never "soket" |
| 전송 대기 메모리 | memori antrean kirim | |
| 하트비트 / 연결 유지 신호 | heartbeat / sinyal keep-alive | 워치독(감시 타이머) → watchdog (timer pemantau) |
| 타임아웃 | timeout | |
| 폴리서 / 셰이퍼 / 페이싱 / ECN | policer / shaper / pacing / ECN | |
| 연결 마이그레이션 (QUIC) | connection migration | |
| 합성 측정 | synthetic monitoring | |

### 7.11 Server OS, process, memory, disk and database

| Korean | Indonesian | Note |
|---|---|---|
| 서버 / 게임 서버 / 게임 코드 / 클라이언트 | server / server game / kode game / klien | |
| 커널 / 운영체제 | kernel / sistem operasi (OS) | |
| 접속 대기열(backlog) | antrean koneksi (backlog) | |
| 파일 디스크립터(fd) | file descriptor (fd) | |
| 스케줄러 / 스케줄링 / 스케줄링 대기 / 런큐 | scheduler / penjadwalan / menunggu jatah CPU / run queue | CPU를 배정받지 못한다 → tidak mendapat jatah CPU |
| 타임 슬라이스 / 컨텍스트 스위칭 | time slice / context switching | |
| CPU 스틸 / CPU 스로틀링 | CPU steal / CPU throttling | |
| 주기(CFS period) / 할당량(quota) | periode (CFS period) / kuota (quota) | |
| 스왑 / OOM 킬러 | swap / OOM killer | |
| 시간 동기화(NTP) / 시계 점프 | sinkronisasi waktu (NTP) / lompatan jam (NTP step) | wall clock / monotonic clock stay English |
| 임시 포트 고갈 | port ephemeral habis (ephemeral port exhaustion) | |
| 워커 / 워커 스레드 / 워커 스레드 풀 | worker / worker thread / worker thread pool | |
| 스레드 / 스레드 풀 | thread / thread pool | |
| 락 / 잠금 / 잠금 경합 / 데드락 | lock / lock / perebutan lock (lock contention) / deadlock | 락을 잡다 → memegang lock |
| 점유한다 | menahan, memakai (a thread, connection, port, CPU) | |
| 동기 호출 / 블로킹 I/O / 비동기 I/O | pemanggilan sinkron / I/O blocking / I/O asinkron | |
| 호출 체인 | rantai pemanggilan (call chain) | |
| starvation | starvation | |
| 워치독 / 덤프 | watchdog / dump | |
| 무한 루프 / 길찾기 / 직렬화 | infinite loop / pathfinding / serialisasi | |
| 메모리 (RAM) / 힙 / 할당 | memori, RAM / heap / alokasi | |
| 가비지 / GC / GC가 돈다 | garbage / GC (garbage collection) / GC berjalan | 수집·회수 → mengumpulkan, mengambil kembali memori |
| GC 멈춤 / 전체 멈춤 | jeda GC / stop-the-world | |
| Full GC / Young·Old 영역 | Full GC / young/old generation | |
| 메모리 누수 | kebocoran memori (memory leak) | |
| 캐시 미스 / 메모리 계층 | cache miss / hierarki memori | |
| 디스크, 스토리지 | disk, storage | |
| 동기 쓰기 / fsync(확실히 저장) | penulisan sinkron / fsync (memastikan data benar-benar tersimpan) | |
| IOPS / 처리량 한도 | IOPS / batas throughput | |
| 버스트 크레딧 / 적립량 | burst credit / saldo kredit | |
| 페이지 캐시 / 디스크에 기록 | page cache / ditulis ke disk | |
| 백업 / 스냅숏 | backup / snapshot | |
| 헤드·플래터 | head dan piringan (platter) | |
| 데이터베이스 / 쿼리 | database (DB) / query | never "basis data" or "kueri" |
| 커넥션 풀 / 커넥션 풀 고갈 | connection pool / connection pool habis | |
| 인덱스 / 컬럼 / 행 / 테이블 | indeks / kolom / baris / tabel | |
| 풀 스캔 / 실행 계획 | full table scan / query plan | |
| 트랜잭션 / 롤백 / 언두 로그 / MVCC | transaksi / rollback / undo log / MVCC | |
| 행 잠금 / 핫 로우 / 잠금 에스컬레이션 | row lock / hot row / lock escalation | first mention: "hot row (satu baris yang ingin diubah banyak permintaan sekaligus)" |
| 스키마 변경(DDL) | perubahan skema (DDL) | |
| 복제 / 복제본 / 주 DB / 복제 지연 | replikasi / replika / DB primer / replication lag | |
| 체크포인트 / 로그 플러시 | checkpoint / log flush | |
| 장애 전환 | failover | |
| 캐시 / 캐시 서버 / 콜드 캐시 / 캐시 스탬피드 | cache / server cache / cold cache / cache stampede | |

### 7.12 Architecture, operations and observability

| Korean | Indonesian | Note |
|---|---|---|
| 서버 구성 | arsitektur server | |
| 게이트웨이 / 부가 서버 | gateway / server pendukung | |
| 연쇄 장애 / 서킷 브레이커 | kegagalan berantai (cascading failure) / circuit breaker | |
| 재시도 폭풍 / 로그인 폭주 / 접속 폭주 | retry storm / lonjakan login / lonjakan koneksi | |
| 배포 / 확장 / 오토스케일링 | deploy / scaling / autoscaling | 늘어나는 데 시간이 걸림 → penambahan server butuh waktu |
| 서비스 디스커버리 / 외부 서비스 의존 | service discovery / ketergantungan pada layanan eksternal | |
| 장애 / 장애가 난다 / 장애 기록 | gangguan, insiden / mengalami gangguan, down / catatan insiden | |
| 사후 분석 | postmortem | |
| 크론 작업 | cron job | |
| 모니터링 / 경보 / 지표 / 로그 / 그래프 | monitoring / alert / metrik / log / grafik | |
| 이용률 / 대기열 | utilisasi / antrean | |
| 평균 / 중앙값 / 백분위수 / p99 / 꼬리 지연 | rata-rata / median / persentil / p99 / tail latency | |
| 샘플링 / 집계 간격 | sampling / interval agregasi | |
| 스파이크 / 패턴 | lonjakan / pola | |
| 무작위로 분산 | disebar secara acak | |
| 인프라 도구 | tools infrastruktur | |
| 간주한다 / 오인한다 / 감지한다 | menganggap / salah mengira / mendeteksi | |
| TLS 인증서 / GeoIP | sertifikat TLS / GeoIP | |

### 7.13 Glossary entries (`glossary`)

- The build prints the English name next to every term (`<dt>Term <span class="en">English name</span></dt>`), so never add the English name in parentheses to the Indonesian term, even when they differ ("Rekonsiliasi server", not "Rekonsiliasi server (reconciliation)").
- Term: sentence case, the same word as in the tables above, no final period. Where Indonesian developers use the English word, the term is the English word ("Tick rate", "Hot row"); it may then equal the English name, which is fine.
- Definition: like the Korean, the first sentence may be a verbless noun phrase ending with a period ("Kartu jaringan pada server."); the rest are full sentences. Do not start every definition with "Adalah …" or "Merupakan …".
- Glossary terms are shared keys: cause titles, sim labels and chapter text that use the same Korean word must use the glossary's Indonesian term (section 9).

### 7.14 Sense markers (`@@`)

Some Korean keys end with `@@…` (for example `멈춤@@서버 상태`). The marker only tells you which sense is meant; it never appears on screen. Translate the sense and leave the marker out of the Indonesian text (the check tool reports an error otherwise). Typical split: 멈춤 as the symptom → "Freeze"; 멈춤 as a server state → "berhenti" / "terhenti".

## 8. Words to watch

- 렉이 생기다/걸리다 → "terjadi lag", "game lag", "mengalami lag". Informal "ngelag" only in aliases and SEO notes.
- 튕기다 → "disconnect", "terlempar keluar". 버벅이다 → "tersendat-sendat" or the symptom "patah-patah".
- 굼뜨다 → "lamban". 손맛 → "rasa kontrol" ("kontrol terasa berat").
- 서버가 죽는다 → "server crash", "server down". 서버가 굳는다 → "server berhenti merespons".
- 멀쩡하다 → "normal", "baik-baik saja". 난리 (chat) → "ramai mengeluh".
- 공인 (official) → "resmi". 공신력 있는 출처 → "sumber tepercaya".
- 원개발사 → "pengembang aslinya". 운영사 → "operator game".
- 대표값 → "nilai tipikal". 쾌적하다 → "terasa lancar", "responsif". 확인형 행동 → "aksi yang menunggu konfirmasi server".
- tools, not "alat", for software tools ("tools infrastruktur", "tool publik"); "alat" stays for physical equipment.
- default → "default" ("nilai default"); avoid "-nya" on it ("nilai default-nya" → "dengan nilai default").
- No analogies outside the source's analogy boxes (`class="analogy"`); use the industry term.

## 9. Shared keys (already fixed; reuse exactly)

These Korean strings exist as whole entries both in the phase-1 groups and in other groups. The build keeps only one Indonesian string per Korean key, so use these verbatim wherever the whole entry is identical, even if the context feels slightly different.

| Korean key | Indonesian | Also appears in |
|---|---|---|
| 뚝뚝 끊김 / 순간이동 / 고무줄 / 몰아치기 / 슬로우모션 / 입력 지연 / 멈춤 / 씹힘·롤백 / 접속 끊김 / 접속 불가·무한 로딩 | the symptom names of 7.1 (the playback option 멈춤 in sim-nagle is also "Freeze") | sim-arch, sim-lab, sim-oneslow, sim-gc, sim-nagle, sim-sndbuf |
| 지연 / 지터 / 손실 / 패킷 손실 | Latensi / Jitter / Packet loss / Packet loss | sim-sndbuf, sim-bloat, sim-distance, sim-oneslow, sim-syncmodels, sim-lab |
| 클라이언트 / 서버 / 네트워크 | Klien / Server / Jaringan | many sims |
| 좋음 / 주의 / 나쁨 | Baik / Waspada / Buruk | sim-bloat, sim-ladder, body-judge, body-retrans |
| 범위 | Cakupan | ui-app (filter label) |
| 담당 / 주 담당 / 팀 | Penanggung jawab / Penanggung jawab utama / Tim | body-owners, ui-app |
| 요인 / 언제 | Faktor / Kapan | ui-app |
| 확인할 곳 / 이러면 맞음 / 이러면 아님 / 확인 수단 | Yang diperiksa / Cocok jika / Tidak cocok jika / Sarana pemeriksaan | ui-app |
| 수치 감각 / 더 알아보기 / 실제 사례 / 출처 | Kisaran angka / Pelajari lebih lanjut / Kasus nyata / Sumber | ui-app |
| 무슨 일 / 배울 점 | Apa yang terjadi / Pelajaran | ui-app |
| 상황별 절차 / 실제 장애 사례 / 용어 사전 / 참고 문헌 / 목차 | Prosedur per situasi / Kasus insiden nyata / Glosarium / Daftar pustaka / Daftar isi | body-cases, body-glossary, body-refs, body-shell |
| 관측으로 판정하기 | Diagnosis dari data monitoring | body-judge |
| layer names (클라이언트 게임 프로세스, 데이터센터 네트워크 장비, 서버 네트워크 카드, 서버 OS (커널), 메모리, 디스크, 데이터베이스, 서버 구성과 운영, 일부에게만 생기는 문제, TCP 재전송의 근본 원인) | see 7.3 | body-l-* headings, body-partial, body-retrans |
| the five owner descriptions (게임 클라이언트 코드: …, 게임 서버 코드: …, 회선과 IDC …, 서버 장비·클라우드 …, DB 서버·스토리지 …) | copy from `src/i18n/id/data.json` (`owners/*/desc`) | body-owners |
| glossary terms used as cause titles (타이머 해상도, 복제 지연, 캐시 스탬피드, 연쇄 장애, 메모리 누수, 스왑, 캐시 미스, OOM 킬러, 데드락) | Resolusi timer, Replication lag, Cache stampede, Kegagalan berantai, Kebocoran memori, Swap, Cache miss, OOM killer, Deadlock | causes-* |
| other glossary terms reused as sim labels (방화벽, 로드밸런서, 게이트웨이, 캐시, 선연출, 발열 스로틀링, 타임아웃, 버스트 크레딧, 틱레이트, 틱, 핑, 보간, 보간 버퍼, 클라이언트 예측, 데드락, 링 버퍼, 집계 간격, 이용률, 재전송률, 불필요한 재전송, 락스텝, 롤백, 지연 보상) | as in `src/i18n/id/glossary.json` | sim-* |
| 같은 데이터센터 서버끼리 왕복 | Pulang-pergi antarserver di data center yang sama | sim-ladder |
| 설계 | Desain | sim-windows |
| " 초" (after a number) | " detik" | sim-disk |

## 10. SEO notes (Indonesia)

Phrases people in Indonesia actually type when a game lags or when they investigate server lag:

1. penyebab lag game online
2. kenapa game lag / kenapa game ngelag
3. cara mengatasi lag saat main game
4. ping tinggi / cara menurunkan ping
5. ping naik turun / ping spike
6. packet loss / cara mengatasi packet loss
7. game patah-patah padahal FPS tinggi
8. lag padahal ping kecil / lag padahal internet kencang
9. rubber banding
10. input lag
11. game sering disconnect / sering DC
12. stuck loading / loading lama tidak masuk game
13. server lag / server game down
14. lag Wi-Fi saat main game
15. lag malam hari
16. jitter adalah
17. netcode / tick rate
18. bufferbloat
19. retransmisi TCP
20. troubleshooting server game

How they are used:
- Site title: "Buku Putih Lag Game: penyebab lag game online dan siapa yang menanganinya" contains (1) verbatim and states the unique angle (ownership).
- Meta description (`meta`): about 155 characters so Google does not cut it, key phrase first: "Penyebab lag game online (patah-patah, teleport, disconnect) dibedah lapis demi lapis secara interaktif, lengkap dengan tim penanggung jawab dan sumbernya." It carries (1) verbatim plus three symptom names people search. Longer descriptions (text edition, symptom pages, llms.txt) may open with the player's question ("Mengapa game online patah-patah, karakter teleport, atau tiba-tiba disconnect?").
- Symptom names are the words players search (Patah-patah, Teleport, Rubber banding, Input lag, Freeze, Disconnect); the aliases add tersendat-sendat, FPS drop, ketarik balik, DC, tidak bisa login. Symptom pages: "{Nama} di game online: penyebab dan penanggung jawabnya | Buku Putih Lag Game" lines up with (7), (9), (10), (11).
- Cause pages: "{Penyebab} ({English name}): penyebab lag game | Buku Putih Lag Game".
- Keywords meta: penyebab lag, lag game online, ping tinggi, game patah-patah, teleport, rubber banding, input lag, disconnect, server lag, netcode, retransmisi TCP, Tim Pengembang Game, Tim Infrastruktur.
- Spelling for search consistency: "game online", "server game", "packet loss", "ping tinggi", "Wi-Fi", "input lag", "rubber banding".
- Do not stuff keywords. Use a search phrase only where the sentence needs that word anyway.

## 11. Checklist before `fill`

- Placeholders `{0}` … all present; HTML tags identical in number and attributes; `href`, `id`, `class`, `data-*` untouched.
- Symptom names exactly as in 7.1; factor names as in 7.2; layer names as in 7.3; team names in title case (7.4).
- Decimal comma, thousands period, space before units (none before %), en dash in ranges, "detik" for seconds.
- No "—", no spaced " – ", no "bukan …, melainkan/tetapi …", no "alih-alih".
- Curly quotes “ ”; no ASCII `"` in attribute strings; no `@@…` sense marker in the Indonesian text.
- `meta` about 155 characters, key search phrase first.
- No reduplication after numbers; no English plural -s on loanwords.
- Run `node tools/i18n.cjs check id --warn` and `--conflicts`; number warnings are fine only where a Korean number word became Indonesian words or digits.
