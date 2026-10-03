# Spanish (es): terminology and style guide

Target: neutral international Spanish read by game developers, SRE/infra engineers and non-programmers (design, art, QA, PM, community) in Spain and all of Latin America. Page locale `es-419`. Every translator working on `src/i18n/es/` reads this first and follows it. The general rules (placeholders, HTML tags, what stays untranslated, review) are in `docs/I18N_GUIDE.md`; this file adds the Spanish decisions. When this file and your instinct disagree, follow this file so that ten translators produce one voice.

The Korean source is the truth. Do not add or drop facts, numbers, conditions, commands, IDs or URLs. Rewrite freely for natural Spanish word order; never follow Korean sentence structure. The text must read as if a senior engineer from Madrid, Ciudad de México, Buenos Aires, Bogotá or Santiago wrote it for colleagues, and nobody should be able to tell which of those cities.

## 1. Site name and titles

| Korean | Spanish (use exactly) | Notes |
|---|---|---|
| 게임 렉 백서 | **Libro blanco del lag en juegos** | Fixed site name. Spanish title capitalization: only the first word capitalized. Never “Libro Blanco del Lag”, “Whitepaper del lag”, “El libro blanco del lag”. In running text: “este libro blanco” |
| 게임 렉 백서: 온라인 게임 렉 원인과 해결 담당 (full title) | Libro blanco del lag en juegos: causas del lag en juegos online y quién lo soluciona | Main page `<title>` and `og:title` |
| … \| 게임 렉 백서 | … \| Libro blanco del lag en juegos | Suffix of every static page title |
| 게임 렉 <span>백서</span> (OG image) | `<span>Libro blanco</span> del lag en juegos` | The highlighted part is “white paper”, as in Korean |
| 백서 | libro blanco | Lowercase when generic |
| 텍스트 판 | versión de texto | |
| 원본 (the interactive site, as opposed to the text edition) | versión interactiva / versión original | “Abrir la ficha interactiva …” |

Why this name: “libro blanco” is the established Spanish term for a white paper in both Spain and Latin America (government, EU, industry reports), and “lag en juegos” is exactly what people type (“lag en juegos online”, “causas del lag en juegos”). It stays short enough for title suffixes. The English alternate name “Game Lag White Paper” is added to structured data by the build.

Capitalization: headings, page titles, labels, buttons and legends use sentence case (Spanish rule): “Buscar por síntoma”, “Dónde mirar”, “Casos reales”. Never English-style Title Case.

## 2. Register and voice

- **Audience**: non-programmers first, engineers second. Write like a senior engineer explaining to a smart colleague from another discipline: plain, concrete, confident. Short sentences, one idea per sentence. No academic tone, no marketing tone, no jokes, no exclamation marks.
- **Address**: informal singular **tú** (tu pantalla, tu PC, prueba, abre). This is the norm for technical web content in both Spain and Latin America. Never **vos** forms (probá, tenés), never **usted** forms, never **vosotros** (use **ustedes** for plural). Address the reader only where the Korean does (instructions, report guide, “try this”); otherwise write impersonally (“El servidor…”, “Hay que revisar…”, “Se ve…”).
- **Korean first-person player view** (내 화면, 내 캐릭터, 내 PC, 내 입력): “tu pantalla”, “tu personaje”, “tu PC”, “tus inputs”. Exception: answer options spoken by the player keep the first person (who `me` → “Solo yo”; report item “solo a mí / también al grupo …”).
- **Operator voice** (우리 인프라팀, 우리 계약): “nuestro equipo de infraestructura”, “nuestros contratos”.
- **Body prose, card summaries (`s`), `num`, `more`, symptom and factor descriptions, glossary definitions**: the Korean is polite explanatory style (합니다체). Use neutral expository Spanish in the present tense.
- **`chk` fields (`look`, `yes`, `no`) and `sig.g`**: the Korean is terse bullet style ending in nouns or bare verb stems (…봄, …함, …쪽). Write terse fragments, no subject, **no final period** (keep internal sentence breaks if the Korean has them).
  - look (noun phrase or infinitive): “Tiempo de tick (p99) y número de ticks excedidos por zona/canal, en el mismo gráfico que el número de jugadores. Sin métricas de tick, CPU por hilo del hilo del juego con pidstat -t 1”
  - yes: “El tiempo de tick supera el presupuesto (50 ms a 20 ticks) cuando se junta gente, con el hilo del juego cerca del 100% de CPU”
  - no: “Ticks excedidos con poca CPU en el hilo del juego: apunta a esperas (pausa del GC, locks, llamadas bloqueantes)”
  - Korean “~쪽” at the end of a `no` line → “apunta a …” or “más probable: …”.
- **`c` (Why → Effect → On screen)**: three fragments, no final period. “Un tick (p. ej., 50 ms) tiene más trabajo que su presupuesto” → “El estado del juego, que debería actualizarse 20 veces por segundo, se actualiza solo 8” → “Cámara lenta en toda la zona, habilidades que responden tarde”.
- **`act` (team action items)**: comma-separated infinitive phrases ending with one period, like a runbook. “Reducir el trabajo costoso por tick, repartir el tick entre hilos, distribuir a los jugadores entre canales, registrar el tiempo de tick como métrica.” `ext` items: “Indicar a los jugadores que …”, “Pedir al ISP (o al proveedor de nube) que …”.
- **Cause titles (`t`)**: noun phrase, the standard incident name where one exists, no final period: “Pausa stop-the-world del GC en el servidor”, “Contención de bloqueos en una fila caliente”, “Vecino ruidoso”, “Ventana cero”. Titles that body text or simulations link to by exact string must be translated identically everywhere (search the Korean title in your groups).
- **Cases (`cases.js`)**: the Korean is plain written style (했다체). Use neutral past tense with the pretérito perfecto simple (“ocurrió”, “cayó”, “publicó”), which reads naturally everywhere. Keep company names, product names, dates and times exactly.
- **UI strings (sims, buttons, legends, status lines)**: short, sentence case, no period on labels and buttons; full sentences with periods in explanatory captions. Buttons as infinitives or tú imperatives, consistently per sim: “Cargar un escenario”, “Prueba esto”.
- **Analogy boxes** (`class="analogy"`): keep the analogy and translate it naturally. Outside those boxes never use analogies; use the terms below.

## 3. Mechanics

### The two house rules in Spanish form

1. **No dash asides.** Do not insert explanations with a raya (—) or a spaced en dash ( – ), even though Spanish typography allows incisos with rayas. Use parentheses, commas, a colon or a new sentence.
   - Bad: “El servidor —en concreto el bucle del juego— se detiene.”
   - Good: “El bucle del juego del servidor se detiene.” / “El servidor se detiene (en concreto, el bucle del juego).”
   - The en dash is allowed only in ranges without spaces (“1–5 m”, “0.2–0.5 s”). Arrows (→, ↔) stay as in the source.
2. **No “not A but B”.** Do not write “no es A, sino B”, “no A sino B”, “más que A, B”, “en lugar de A, B” or “A no es el problema; el problema es B” as a correction. State B directly; if ruling out A is itself a fact in the source, give it its own plain sentence or a condition.
   - Bad: “No es un problema de la conexión, sino del servidor.”
   - Good: “La causa está en el servidor. La conexión está bien.”
   - Plain descriptions are fine: “sin esperar al servidor”, “sin encolarlos”, “primero hay que revisar X y después Y”.

### Punctuation and typography

- **Opening ¿ and ¡** always. Exclamations should not appear anyway.
- **Quotes**: curly double quotes “ ” as in the source (neutral for web in both regions; do not use « »). Nested: ‘ ’. Straight quotes only in `<code>`, commands and HTML attribute syntax. Attribute translations (`ctx` ending in `@aria-label`, `@title`, `@alt`, `@content`) must not contain `"`, `<` or `>`; “ ” is fine. Period goes **after** the closing quote (Spanish rule): …“Se perdió la conexión”.
- **Space before an opening parenthesis**: Korean 지터(도착 간격의 흔들림) → “jitter (variación en el tiempo de llegada de los paquetes)”.
- **Lists**: no serial comma before “y”/“o” (“latencia, jitter y pérdida de paquetes”). Use “e” before words starting with “i”/“hi” and “u” before “o”/“ho” (“u otro”), but not before acronyms read as letters (“cliente o SO”).
- **Korean middle dot (·)**: in short labels use a slash without spaces (“Wi-Fi/router”, “GC/fugas”, “Ticks/hilos”). The three composite symptom names use “ / ” with spaces (section 4), and only they do. In prose turn “A·B” into “A y B”, “A o B” or a comma list.
- **Colon**: lowercase after a colon unless a full independent sentence or a proper name follows, and except in labels where the Korean starts a new item (“Causas: 12”).
- **Ellipsis**: the single character “…”, no space before it when it closes a list (“tirones, teletransporte…”).
- **Abbreviations**: 예: → “p. ej.,” inside parentheses, “por ejemplo” in running text. 등 → “etc.” at the end of a list, or “entre otros”; never “etc.” after “como …”. EE. UU. with spaces.
- **Anglicisms**: established technical loans are written in roman (no italics, no quotes): lag, ping, tick, frame, input, buffer stays as “búfer” (section 11), log, timeout, heartbeat, pool, firewall, router, switch, netcode, rollback, snapshot, overlay. Plurals with -s (“ticks”, “frames”, “inputs”, “logs”, “timeouts”, “routers”, “firewalls”, “switches”, “assets”, “shaders”).
- **Genders to use**: el lag, el ping, el tick, el frame, el input, el log, el timeout, el heartbeat, el pool, el gateway, el firewall, el router, el switch, el búfer, el kernel, el GC, el SO, el ISP, el NAT, el RTO, el ACK, el RTT, el netcode, el rollback, el snapshot, el overlay, el hilo, el backlog, el failover, el postmortem; la caché, la CPU, la GPU, la RAM, la NIC, la BD, la VPC, la ACL, la MTU, la QoS, la VRAM, la latencia, la ventana.
- **Avoid gendered articles and adjectives with “PC”**: Spain says “el PC”, much of Latin America says “la PC”. Use “tu PC”, “en tu PC”, “desde su PC”, or restructure with a verb (“si tu PC se detiene”). Never “el PC”, “la PC”, “un PC”, “una PC”, “PC lento/lenta”. If an article is unavoidable, use “la computadora”.
- Same for Wi-Fi: prefer “el Wi-Fi” or “la red Wi-Fi”; never “la wifi”.

### Numbers and units (es-419)

- Values never change. Thousands separator comma, decimal point, exactly what the page locale `es-419` prints: `1,500 bytes`, `0.25 s`, `16.7 ms`, `10,000`. Never `1.500` or `0,25`.
- **Space between number and unit**: `50 ms`, `200 µs`, `1.5 GB`, `6.4 Gbps`, `60 Hz`, `60 FPS`, `1,460 bytes`. **No space before %**: `0.1%` (this is what `es-419` prints). Keep unit symbols as they are (`ms`, `µs`, `ns`, `Gbps`, `MB`, `IOPS`, `PPS`).
- Seconds: `s` after a digit in compact places (tables, `chk`, `num`, labels, parentheses): `0.5 s`, `30 s`. In prose “30 segundos” is also fine. Minutes, hours and days are written out (“10 minutos”, “2 horas”); “min” only in tables and charts.
- Ranges: Korean `~` → en dash, no spaces: `1–5 m`, `0.2–0.5 s`, `80–90%`. In prose “entre 0.2 y 0.5 s” or “de 0.5 s a varios segundos”. With words: “de unos pocos a decenas de milisegundos”.
- Korean number words: 1만 → `10,000`; 100만 → `1 millón`; 수백 → “cientos de”; 수십 → “decenas de”; 수 초 → “varios segundos”; 십여 초 → “unos diez segundos” or “diez y tantos segundos”; N배 → “N veces” (or `N×` in tables). The check tool may then warn “숫자가 다름”; that is expected.
- Adjectival use: “un servidor de 20 ticks”, “un tick de 50 ms”, “una pérdida del 1%”. `20틱` alone → “20 ticks”; `20틱 서버` → “servidor de 20 ticks”.
- Dates: “28 de octubre de 2021” (months lowercase). Times: keep the source’s clock. 24-hour UTC stays 24-hour (“21:52 UTC”); 오전/오후 with a US time zone becomes 12-hour with “a. m./p. m.” (“11:48 p. m. PDT”).
- Place and company names: use the Spanish exonym where one exists (Seúl, Tokio, costa oeste de EE. UU.) and keep Korean ISPs as they are (KT, SK Broadband, LG U+). Keep Korean-specific facts; never swap in Spanish or Latin American examples.

### Short strings with a number placeholder (plural agreement)

A placeholder like `{0}` can be 1, and “{0} causas” then reads “1 causas”. Rules:
- Per-item counts that can be 1 (sources of one cause, matches, selected items, sims): use a count-neutral form. `원인 {0}가지` → `Causas: {0}`; `출처 {0}건` → `Fuentes ({0})`; `인용 {0}곳` → `Citado en: {0}`; `{0}가지` → `{0}` or `Total: {0}`.
- Site-wide totals and per-symptom or per-layer counts (always well above 1: 228 causes, 14+ per symptom, 9+ per layer, hundreds of sources) may use the natural plural in titles and headings: `{0}: {1} causas y sus responsables`.
- Never write “causa(s)”.
- Placeholders that receive a name (team, layer, symptom, cause title) arrive capitalized and with unknown gender and number. Do not put an article or an agreeing adjective in front of them. Use a colon or parentheses: `{0} 할 일` → `Tareas ({0})`; `{0}의 원인` → `{0}: causas`; `같은 층: {0}` → `Misma capa: {0}`.

### Capitalization of fixed names

Symptom names, factor names, layer names, who/when values and graph-shape names start with a capital letter when they stand alone as a label, chip, heading, list item or table cell. Inside a sentence they are lowercase, except proper nouns and acronyms (“cámara lenta en toda la zona”, “aparece como tirones o teletransporte”, “el input lag sube”). Articles and plurals may inflect in prose (“varias desconexiones”, “un congelamiento de 2 s”), but the words stay the same.

## 4. Regional vocabulary (Spain vs Latin America)

Where Spain and Latin America use different words, use the left column. These choices are fixed for consistency.

| Concept | Use | Do not use | Note |
|---|---|---|---|
| computer | PC (without article), computadora if an article is needed | ordenador, el PC, la PC | See the PC rule in section 3 |
| phone | teléfono | móvil, celular (as nouns) | “red móvil”, “operador móvil”, “datos móviles” are fine as adjectives |
| video | video | vídeo | RAE accepts both; “video” is the majority form |
| to press (key, button) | presionar | pulsar, oprimir | “hacer clic” for mouse, “tocar” for touch |
| to check | revisar, verificar, comprobar | chequear | |
| request | solicitud | petición | Except fixed technical phrases (“request-response” → solicitud-respuesta) |
| failure | fallo | falla | “fallo en cascada”, “fallo de caché” |
| monitoring | monitoreo | monitorización | “monitoreo sintético” |
| cost | costo | coste | |
| reliable | confiable | fiable | “UDP confiable”, “canal no confiable” |
| file | archivo | fichero | |
| report (player bug/lag report) | reporte | informe (in this sense) | “reportar el lag” |
| peak hours | horas pico | hora punta | |
| upload / download (speed) | subida / bajada | carga / descarga (for speed) | “carga” is reserved for loading screens and load |
| satellite internet | internet satelital | | |
| online games | juegos online | juegos en línea | What people search in both regions |
| fighting games | juegos de lucha | | |
| device (hardware) | dispositivo; “equipos de red” only as that compound | “equipo” alone for hardware | “Equipo” is reserved for teams |

Never use: coger (vulgar in much of Latin America; use tomar, recoger, agarrar), pillar, vale, guay, currar, chévere, padre, bacán, laburo, platicar, or any other regional slang. No voseo, no vosotros.

## 5. The 11 symptom names (fixed)

Use exactly these words everywhere: data, cards, body, sims, cases, site pages. Aliases are what players type; they are listed after the name in the symptom guide (lowercase, comma-separated).

| id | Korean | Spanish name | Aliases (Korean → Spanish) |
|---|---|---|---|
| stutter | 뚝뚝 끊김 | **Tirones** | 버벅임, 끊김, 프레임 드랍 느낌 → stuttering, se traba, va a saltos, parecen caídas de FPS |
| teleport | 순간이동 | **Teletransporte** | 워프, 텔레포트, 뚝 끊기고 튐 → warp, teleport, se corta y salta a otro lugar |
| rubber | 고무줄 | **Rubber banding** | 뒤로 당겨짐, 러버밴딩, 위치 롤백 → me tira para atrás, efecto goma, vuelvo a la posición anterior |
| burst | 몰아치기 | **Cámara rápida** | 파파파팍, 빨리감기, 한꺼번에 처리 → todo pasa de golpe, avance rápido, se pone al día de una vez |
| slowmo | 슬로우모션 | **Cámara lenta** | 세계가 느려짐, 전체적으로 굼뜸 → el mundo se ralentiza, todo va lento, slow motion |
| delay | 입력 지연 | **Input lag** | 반응이 늦음, 굼뜸, 손맛이 없음 → responde tarde, va pesado, los controles no responden bien |
| freeze | 멈춤 | **Congelamiento** | 얼어붙음, 정지, 응답 없음 → se congela, se queda colgado, no responde, freeze |
| dropped | 씹힘·롤백 | **Acción perdida / rollback** | 스킬 씹힘, 아이템 되돌아감, 거래 실패 → la habilidad no salió, me devolvió el objeto, el intercambio falló |
| disconnect | 접속 끊김 | **Desconexión** | 튕김, 연결 끊김, 서버와의 연결이 끊어졌습니다 → me echa del juego, me saca del servidor, se cae la conexión, “Se perdió la conexión con el servidor” |
| noconnect | 접속 불가·무한 로딩 | **No conecta / carga infinita** | 로그인 안 됨, 로딩이 끝나지 않음 → no me deja entrar, no puedo iniciar sesión, se queda cargando |
| invisible | 안 보임·유령 개체 | **Entidades invisibles / fantasma** | NPC가 안 보임, 투명 캐릭터, 이미 죽은 몬스터가 서 있음 → no veo al NPC, personajes invisibles, monstruos muertos que siguen de pie |

Notes:
- “Tirones” is standard Spanish (“ir a tirones”: with interruptions) and the word hardware and gaming press uses in both regions; players also say “stuttering”, which is in the aliases. In prose: “el juego va a tirones”, “aparecen tirones”. A single brief hitch (멈칫) is “un tirón” (singular); the symptom is the repeated pattern. 짧은 멈춤 → “una pausa breve”.
- “Teletransporte”: in prose the verb is fine (“los personajes se teletransportan”), plural “teletransportes”.
- “Rubber banding” is what developers and players in both regions say; there is no Spanish term players use. Masculine: “el rubber banding”. Verb forms are not used; write “tu personaje hace rubber banding” or “hay rubber banding”.
- “Cámara rápida” and “Cámara lenta” are the everyday Spanish words for fast-forward and slow motion on screen. “Cámara rápida” is the backlog replayed at high speed after a stall; engineers may call the mechanism catch-up or burst, the symptom name stays. “TCP 몰아치기” → “cámara rápida en TCP”.
- “Input lag” is the symptom. “Latencia” is the factor. Do not mix them. Never “retraso de entrada”.
- “Congelamiento” is the symptom (what the player sees); “Detención” is the factor (processing stopped). The OS freezing an app (동결) is “congelación (freeze)”, see section 11.
- “Desconexión”: plural in prose (“desconexiones masivas”).
- In prose the composite names become “acciones perdidas o rollback”, “el juego no conecta o se queda en carga infinita”, “entidades invisibles o fantasma”.

## 6. The four factors (fx)

| Korean | Spanish name | `how` line | Notes |
|---|---|---|---|
| 지연 | **Latencia** | Los paquetes llegan tarde | Also the glossary term. Generic 지연 = “latencia” (a measure) or “retraso” (a specific wait) |
| 지터 | **Jitter** | Los paquetes llegan de forma irregular | First mention per chapter: “jitter (variación en el tiempo de llegada de los paquetes)”. Masculine: “el jitter” |
| 손실 | **Pérdida de paquetes** | Los paquetes no llegan nunca | After the first mention in a paragraph, “pérdida” alone is fine |
| 정체 | **Detención** | Algo dejó de procesar | Verb: “se detiene”, “el tick se detiene”, “un tick detenido”. Gloss if needed: “detención (el procesamiento se para)” |

요인 → “factor”; 렉의 네 가지 요인 → “los cuatro factores del lag”. 게임의 대처 → “cómo lo afronta el juego”. 가리지 못하면 → “cuando no se puede disimular”.

## 7. Layers and topics

13 layers (층 → “capa”) and 3 topics (주제 → “tema”). `L1`…`L13` stay. 레이어 → “capa”.

| id | name | short (nav/badges) | side |
|---|---|---|---|
| client-game | Proceso del juego en el cliente | Tu juego | Tu lado |
| client-os | SO y dispositivo del cliente | Tu PC/teléfono | Tu lado |
| home | Red doméstica | Wi-Fi/router | Tu lado |
| isp | Ruta por internet | ISP/internacional | En tránsito |
| dc-net | Equipos de red del centro de datos | Firewall/LB | Lado del servidor |
| nic | Tarjeta de red del servidor | NIC | Lado del servidor |
| server-os | SO del servidor (kernel) | Kernel | Lado del servidor |
| socket | Sockets y protocolos | TCP/UDP | Ambos extremos |
| server-proc | Proceso del juego en el servidor | Ticks/hilos | Lado del servidor |
| memory | Memoria | GC/fugas | Lado del servidor |
| disk | Disco | IOPS | Lado del servidor |
| db | Base de datos | BD | Lado del servidor |
| infra | Arquitectura y operación de servidores | Arquitectura/ops | Lado del servidor |
| sync (topic) | Diseño del netcode | (same) | Diseño |
| partial (topic) | Problemas que solo afectan a algunos | Solo algunos | Alcance |
| retrans (topic) | Causas raíz de la retransmisión TCP | Retransmisión TCP | Causa |

동기화 → “netcode” for the design area and “sincronización” for the mechanism (“sincronización de estado”, “sincronización de comandos”). 동기화 방식 → “modelo de netcode”. internet is written lowercase (RAE).

## 8. Teams and owners

| Korean | Spanish | Notes |
|---|---|---|
| 게임개발팀 | **Equipo de desarrollo** | The studio team that owns client and server code and netcode design. In prose: “el equipo de desarrollo” (lowercase) |
| 인프라팀 | **Equipo de infraestructura** | Network, servers/OS, database hosts. In prose: “el equipo de infraestructura”; “infra” is acceptable in compact labels only |
| 외부 | **Externo** | Players’ environment, ISPs, cloud providers. In prose: “partes externas”, “fuera de nuestro control” |
| 클라이언트 개발 (cli) / 클라이언트 | Desarrollo de cliente / Cliente | |
| 서버 개발 (srv) / 서버 | Desarrollo de servidor / Servidor | |
| 네트워크 인프라 (net) / 네트워크 | Infraestructura de red / Red | |
| 서버 인프라 (sys) / 서버 장비·OS | Infraestructura de servidores / Servidores/SO | |
| DB 인프라 (dba) / DB 장비 | Infraestructura de BD / Servidores de BD | |
| 외부 (ext) / 유저·통신사·클라우드 | Externo / Jugador/ISP/nube | |
| {팀}·{담당} (export template `{0}·{1}`) | `{1} ({0})` → “Desarrollo de servidor (Equipo de desarrollo)” | |
| 담당 | responsable | 담당 팀 → equipo responsable; 담당 코드 → código de responsable |
| 주 담당 | responsable principal | Label: “Responsable principal” |
| 함께 (also involved) | también | Label: “También” |
| {팀} 할 일 | Tareas ({team}) | “Tareas (Equipo de desarrollo)” |
| 게임개발팀이 할 일 / 인프라팀이 할 일 | Tareas del equipo de desarrollo / Tareas del equipo de infraestructura | Whole strings, so the article is safe |
| 유저 안내·외부 요청 | Indicaciones al jugador y solicitudes externas | |
| 팀별 대응 / 대응 | Acciones por equipo / Acciones | |
| 누가 고치나 | Quién lo arregla | |
| 넘길 때 챙길 정보 | Qué incluir al escalar | |
| 먼저 부를 곳 | A quién llamar primero: | |
| 인프라팀(시스템) | equipo de infraestructura (servidores/SO) | |

## 9. Who / when values (triage filters)

| key | Korean | Spanish |
|---|---|---|
| who.me | 나만 | Solo yo |
| who.home | 같은 집 | Misma casa |
| who.region | 특정 지역·통신사 | Una región o un ISP |
| who.zone | 특정 장소·채널 | Una zona o un canal |
| who.server | 서버 전체 | Todo el servidor |
| who.feature | 특정 기능만 | Solo una función |
| who.onechar | 특정 캐릭터만 이상해 보임 | Solo un personaje se ve raro |
| who.oneclient | 같은 PC의 한쪽 클라만 | Solo un cliente en tu PC |
| when.always | 항상 | Siempre |
| when.peak | 저녁 피크 시간 | Horas pico de la noche |
| when.event | 사람이 몰릴 때 | Cuando se junta mucha gente |
| when.login | 접속·점검 직후 | Al conectar o tras un mantenimiento |
| when.idle | 가만히 있다가 | Tras un rato inactivo |
| when.random | 가끔 무작위로 | De vez en cuando, al azar |
| when.periodic | 일정한 주기로 | A intervalos regulares |
| when.uptime | 오래 켜 둘수록 | Cuanto más tiempo lleva encendido |
| when.moving | 이동 중·지역 전환 때 | Al moverse o cambiar de zona |
| when.action | 특정 행동을 할 때 | Al hacer ciertas acciones |

Labels: 누가 겪나 → “A quién afecta”, 누가 → “A quién”, 언제 → “Cuándo”, 모양 (symptom shape in triage) → “Cómo se ve”.

## 10. Graph shapes (sigs) and check-by (chkBy)

| id | Korean | Spanish |
|---|---|---|
| periodic | 일정 주기로 튐 | Picos periódicos |
| random | 가끔 무작위로 튐 | Picos aleatorios |
| step | 어느 순간부터 계단처럼 올라감 | Salto en escalón |
| ramp | 서서히 오름 | Subida gradual |
| sawtooth | 서서히 오르다 뚝 떨어짐 | Diente de sierra |
| peak | 특정 시간대에만 높음 | Alto solo a ciertas horas |
| load | 인원·부하를 따라 오름 | Sube con la carga |
| ceiling | 한도에 닿아 평평해짐 | Topa con el límite |
| high | 처음부터 늘 높음 | Siempre alto |
| outlier | 일부만 높음 | Alto solo en algunos |
| gap | 끊겼다가 몰아서 | Hueco y luego ráfaga |
| drop | 연결이 한꺼번에 끊김 | Desconexión masiva |
| surge | 접속·점검 직후 폭증 | Avalancha tras la apertura |

| by | Korean (data) | Spanish (data) | Short form (ui: 인프라 도구 / 게임 로그·지표 / 유저 쪽) |
|---|---|---|---|
| ops | 인프라 도구로 확인(게임 코드 불필요) | Con herramientas de infraestructura (no hace falta código del juego) | Herramientas de infraestructura |
| code | 게임 서버·클라이언트의 로그·지표가 필요 | Requiere logs y métricas del servidor o el cliente del juego | Logs/métricas del juego |
| user | 유저 쪽 환경에서 확인 | En el entorno del jugador | Lado del jugador |

그래프 → “gráfico” (masculine); 그래프 모양 → “forma del gráfico”; {0} 모양의 그래프 → “Forma del gráfico: {0}”; 그래프에서는 → “En el gráfico”; 확인 방법 → “Cómo verificarlo”; 확인 수단 → “Se verifica con”.

## 11. Card, page and chapter labels

| Korean | Spanish |
|---|---|
| 원인 (label, table header, side) | Causa |
| 원인 ID | ID de la causa |
| 원인 카드 / 원인 항목 | ficha de la causa / entrada |
| 왜 → 그러면 → 화면에서는 | Por qué → Efecto → En pantalla |
| 증상 / 요인 | Síntomas / Factores |
| 수치 감각 | Cifras de referencia |
| 확인할 곳 / 이러면 맞음 / 이러면 아님 | Dónde mirar / Se confirma si / Se descarta si |
| 더 알아보기 | Para saber más |
| 실제 사례 / 실제 장애 사례 | Casos reales / Incidentes reales |
| 무슨 일 / 배울 점 / 관련 원인 / 원문 | Qué pasó / Lecciones / Causas relacionadas / Publicación original |
| 출처 / 참고 문헌 / 장별 출처 / 이 장의 출처 | Fuentes / Bibliografía / Fuentes por capítulo / Fuentes de este capítulo |
| 함께 보면 좋은 원인 | Ver también |
| 다른 말 | También se dice |
| 단서 | Pista |
| 링크 복사 / 복사됨 | Copiar enlace / Copiado |
| 관련 장 → | Capítulo relacionado → |
| 직접 해보기 / 이렇게 해보세요 / 상황 불러오기 | Pruébalo tú mismo / Prueba esto / Cargar un escenario |
| 좋음 / 주의 / 나쁨 (status flags) | Bueno / Atención / Malo |
| 실험 (a sim) / 렉 실험실 | simulación / Laboratorio de lag |
| 장 / 절 / 층 / 주제 | capítulo / sección / capa / tema |
| 목차 | Índice |
| 준비 중입니다. | Próximamente. |
| 기타 | Otros |

Chapter titles (body `h2`), for consistent cross-references:

| Korean | Spanish |
|---|---|
| 렉은 네 가지 요인으로 만들어진다 | El lag nace de cuatro factores |
| 패킷의 이동 경로: 내 손가락에서 서버의 DB까지 | El recorrido del paquete: de tu dedo a la base de datos del servidor |
| 렉 실험실 | Laboratorio de lag |
| 증상 사전 | Guía de síntomas |
| 같은 핑, 다른 체감: 동기화 방식 | Mismo ping, distinta sensación: modelos de netcode |
| 한 명만 느릴 때, 한쪽만 이상할 때 | Cuando solo va lento un jugador o falla un solo cliente |
| TCP 재전송: 왜 생기고, 왜 이렇게 느려지나 | Retransmisión TCP: por qué ocurre y por qué cuesta tanto |
| 게임개발팀이 고칠 것, 인프라팀이 고칠 것 | Qué arregla el equipo de desarrollo y qué arregla el de infraestructura |
| 클라이언트 OS와 기기 | SO y dispositivo del cliente |
| 집 네트워크: 와이파이·공유기·모바일망 | Red doméstica: Wi-Fi, router y red móvil |
| 인터넷 회선: 통신사망과 장거리 구간 | Ruta por internet: redes de los ISP y tramos de larga distancia |
| 서버 네트워크 카드(NIC) | Tarjeta de red del servidor (NIC) |
| 소켓과 프로토콜: TCP, UDP, 소켓 옵션 | Sockets y protocolos: TCP, UDP y opciones de socket |
| 서버 게임 프로세스: 틱과 스레드 | Proceso del juego en el servidor: ticks e hilos |
| other layer chapters | the layer name from section 7 |
| 진단 도우미 | Asistente de diagnóstico |
| 관측으로 판정하기 | Diagnosticar con datos de monitoreo |
| 판정 흐름 / 판정 신호표 / 범위 → 시점 → 계층 / 판정 순서 | Flujo de diagnóstico / Tabla de señales / alcance → momento → capa / orden de diagnóstico |
| 그래프 모양으로 찾기 | Buscar por forma del gráfico |
| 숫자 읽는 법 | Cómo leer las cifras |
| 사례와 절차 / 상황별 절차 | Casos y procedimientos / Procedimientos por situación |
| 패치 이후 렉 / 해외 국가 추가 | Lag tras un parche / Lanzamiento en un nuevo país |
| 렉 제보 잘하는 법 | Cómo reportar bien el lag |
| 용어 사전 | Glosario |
| 증상별로 찾기 / 증상별 원인 | Buscar por síntoma / Causas por síntoma |
| 이 층에서 렉을 만드는 원인 | Causas de lag en esta capa |
| 시간 감각 / 숫자 감각 (sim) | Escalas de tiempo / Cifras de latencia |

## 12. Core terminology (Korean → Spanish)

Keep the established term; gloss once for non-experts where the Korean glosses. Every `TERMS.md` row is covered here. Where Spanish-speaking studios and SRE teams normally use the English word, so do we.

### Game and netcode
| Korean | Spanish | Note |
|---|---|---|
| 렉 | lag | “pico de lag” for a momentary jump. “El juego tiene lag / va con lag”. Avoid the slang verb “laguear” in prose |
| 핑 / 왕복 시간 | ping / tiempo de ida y vuelta (RTT) | 핑이 높다 → ping alto; 핑 튐 → picos de ping; 게임 안 핑 → ping del juego; 게임 밖에서 잰 핑 → ping medido fuera del juego |
| 틱 / 틱레이트 / 틱 간격·주기 | tick / tick rate / intervalo de tick | 20틱 서버 → servidor de 20 ticks |
| 틱 예산 / 틱 예산 초과 | presupuesto del tick / tick que excede su presupuesto (tick excedido) | |
| 게임 루프 / 메인 스레드 | bucle del juego (game loop) / hilo principal | 루프 한 번 → una iteración del bucle |
| 프레임 / 프레임 타임 / 프레임 드랍 / 프레임 스파이크 | frame / tiempo de frame (frametime) / caída de FPS / pico de frametime | Never “fotograma” or “cuadro” |
| 스냅샷 / 델타 압축 | snapshot / compresión delta | Disk/DB snapshot → instantánea (snapshot) |
| 상태 업데이트 / 게임 상태 | actualización de estado / estado del juego | 세계 (what the server simulates) → estado del juego |
| 서버의 실제 상태 | estado real del servidor | |
| 보간 / 보간 버퍼 | interpolación / búfer de interpolación | |
| 외삽 | extrapolación (dead reckoning) | |
| 예측 / 클라이언트 예측 | predicción / predicción en el cliente | |
| 서버 보정 | reconciliación con el servidor | |
| 되감기 / 지연 보상 | rebobinado / compensación de lag | Verb: rebobinar |
| 권위 서버 / 서버 권위 / 클라이언트 권위 | servidor autoritativo / autoridad del servidor / autoridad del cliente | |
| 요청-응답 | solicitud-respuesta | |
| 상태 동기화+보간 | sincronización de estado + interpolación | |
| 명령 동기화 | sincronización de comandos | |
| 이벤트 예약 | eventos programados | |
| 락스텝 | lockstep (determinista) | |
| 롤백 넷코드 | netcode de rollback | DB 롤백 → rollback (de la transacción) |
| 입력 | input (the player’s key press or command) | “tus inputs”; in plain prose “lo que presionas” also works |
| 선입력 | búfer de inputs | Players’ term; gloss once: “guarda el siguiente input” |
| 서버 입력 버퍼 | búfer de inputs del servidor | |
| 선연출 | feedback anticipado | Animations/effects played before the server confirms |
| 판정 | validación del servidor / registro de impactos (hit registration) | 공격 판정 → registro de impactos; 이동 검증 → validación de movimiento; 판정한다 → resuelve, valida |
| 판정 구간 / 선입력 허용 시간 / 패링 판정 | ventana de tiempo / margen del búfer de inputs / ventana de parry | |
| 타이밍 | timing | |
| 스킬 씹힘 | la habilidad no salió | |
| 시야 / 시야 계산 / AOI | rango de visión / cálculo de visibilidad (AOI) / área de interés (AOI) | 셀 / 격자(그리드) → celda / cuadrícula |
| 브로드캐스트 | broadcast (difusión) | |
| 개체 / 개체 ID / 등장·퇴장 알림 | entidad / ID de entidad / mensajes de aparición y desaparición (spawn/despawn) | |
| 채널 / 존 / 필드 / 페이즈 | canal / zona / zona abierta / phasing | 존 이동 → cambio de zona |
| 월드 보스 / 공성전 / 레이드 | world boss / asedio / raid | |
| 파티원 / 방장 (host) | miembros del grupo / anfitrión (host) | 파티 → grupo |
| 몬스터 / 캐릭터 모델 / 이름표 | monstruo / modelo del personaje / nombre sobre el personaje | |
| 스킬 시전 / 쿨다운 / 데미지 / 이펙트 | lanzamiento de habilidades / cooldown / daño / efectos | 스킬 → habilidad |
| 아이템 / 거래 / 인벤토리 | objeto / intercambio / inventario | |
| 리슨 서버 | listen server | |
| 넷코드 / 넷그래프 | netcode / net graph | |
| 동시 접속 / 인원 | jugadores conectados a la vez (CCU) / número de jugadores | |
| 로그인 대기열 / 대기 순번 | cola de inicio de sesión / posición en la cola | |
| 로그인 / 로그인 서버 | inicio de sesión / servidor de login | |
| 점검 | mantenimiento | 점검 직후 → justo después del mantenimiento |
| 패치 / 배포 | parche / despliegue (deploy) | |
| 게임 가속기 | acelerador de juegos (VPN para juegos) | |
| 안티치트 / 오버레이 | anti-cheat / overlay | |
| 셰이더 컴파일 / 셰이더 캐시 | compilación de shaders / caché de shaders | |
| 에셋 로딩 / 지연 로딩 | carga de assets / carga diferida (lazy loading) | |
| 크래시 / 강제 종료 | crash / cierre forzado | 서버가 죽는다 → el servidor se cae |
| 멈칫 / 짧은 멈춤 | un tirón / una pausa breve | |

### Player side, home and ISP
| Korean | Spanish | Note |
|---|---|---|
| 유저 | jugador | “usuario” only in the OS or software sense (espacio de usuario) |
| 회선 | conexión (player’s internet); enlace (DC, backbone) | 회선이 흔들린다 → la conexión tiene mucho jitter |
| 통신사 | ISP (proveedor de internet); operador móvil for cellular | 통신사망 → red del ISP. Plural “los ISP” (invariable) |
| 공유기 | router | |
| 와이파이 / 유선 / 모바일망 / LTE·5G | Wi-Fi / cable (Ethernet) / red móvil / LTE o 5G | |
| 무선 채널 / 무선 구간 | canal inalámbrico / tramo inalámbrico | |
| 핸드오버 | handover (cambio de estación base) | |
| 버퍼블로트 / SQM / QoS | bufferbloat / SQM / QoS | |
| NAT / NAT 테이블 / CGNAT | NAT / tabla NAT / CGNAT (NAT del operador) | |
| 피어링 / 경로 / 우회 경로 / 병목 구간 | peering / ruta / ruta alternativa (desvío) / cuello de botella | 먼 경로로 우회한다 → da un rodeo por una ruta lejana |
| 해저 케이블 / 장거리 구간 | cable submarino / tramo de larga distancia | |
| 피크 시간 | horas pico | |
| 업로드 / 다운로드 | subida / bajada | |
| 저궤도 위성 인터넷 | internet satelital de órbita baja (LEO) | |
| 절전 상태 / 절전 해제 | estado de ahorro de energía / reactivación (wake-up) | |
| 일시 정지 / 동결 (OS on apps) | suspensión (suspend) / congelación (freeze) | |
| 우선순위를 높인다 | sube la prioridad | |
| 백그라운드 창 / 최소화 | ventana en segundo plano / minimizada | |
| 발열 스로틀링 | thermal throttling | Gloss once: “reducción de velocidad por temperatura” |
| 타이머 해상도 | resolución del temporizador | |
| 가변 주사율 / 주사율 | tasa de refresco variable (VRR) / tasa de refresco | |
| 프레임 생성 | generación de frames | |
| 그래픽 드라이버 | drivers gráficos | |
| 화면 찢어짐 | tearing | |

### Data center, network and NIC
| Korean | Spanish | Note |
|---|---|---|
| 데이터센터 / IDC | centro de datos | |
| 장비 | dispositivo; equipos de red | Never bare “equipo” for hardware |
| 방화벽 / 세션 테이블 / 연결 추적 | firewall / tabla de sesiones / seguimiento de conexiones (conntrack) | 연결을 추적한다 / 추적 항목이 만료된다 → hace seguimiento de la conexión / la entrada de seguimiento expira; conntrack 테이블 → tabla conntrack |
| 로드밸런서 / 헬스체크 | balanceador de carga / health check | |
| DDoS 방어 / 스크러빙 센터 / 오탐 | protección DDoS (mitigación) / centro de depuración (scrubbing) / falso positivo | |
| 스위치 / 라우터 / LAG | switch / router / LAG | |
| 마이크로버스트 / 버스트 | microrráfaga (microburst) / ráfaga | Note the double r |
| 유휴 타임아웃 / 유휴 연결 | timeout por inactividad / conexión inactiva | 장비별 유휴 타임아웃 → timeouts por inactividad de cada dispositivo |
| 조용히 버림 | descarte silencioso (silent drop) | 버린다 (packets) → descarta |
| 보안 그룹 / 네트워크 ACL / VPC | grupo de seguridad / ACL de red / VPC | |
| NAT 게이트웨이 / SNAT | gateway NAT / SNAT | |
| 클라우드 사업자 / 인스턴스 / 호스트 점검 | proveedor de nube / instancia / mantenimiento del host | |
| 라이브 마이그레이션 | migración en vivo | |
| 노이지 네이버 | vecino ruidoso (noisy neighbor) | |
| 링 버퍼 / 슬롯 | búfer circular (ring buffer) / slot | “256칸” → “256 slots” |
| 인터럽트 / 인터럽트 병합 | interrupción / coalescencia de interrupciones | |
| 수신 큐 / 송신 대기열 | cola de recepción (RX) / cola de transmisión (TX) | |
| RSS / PPS / 클라우드 PPS 한도 | RSS / PPS / límite de PPS de la nube | |
| 단편화 / 프래그먼트 | fragmentación / fragmento | 단편화되다 → se fragmenta |
| MTU / MSS / MTU 블랙홀 | MTU / MSS / agujero negro de MTU | 최대 세그먼트 크기 → tamaño máximo de segmento |
| 불량 케이블 / 광모듈 | cable defectuoso / transceptor óptico | |
| ICMP 응답을 제한한다 | limita las respuestas ICMP | |

### Server OS, sockets and TCP
| Korean | Spanish | Note |
|---|---|---|
| 커널 / 운영체제 / OS | kernel / sistema operativo / SO | |
| 접속 대기열(backlog) | cola de conexiones pendientes (backlog) | |
| 파일 디스크립터(fd) | descriptor de archivo (fd) | |
| 스케줄러 / 스케줄링 대기 / 런큐 | planificador (scheduler) / espera de CPU / cola de ejecución (run queue) | CPU를 배정받지 못한다 → no recibe CPU |
| 타임 슬라이스 | time slice (porción de tiempo) | |
| 컨텍스트 스위칭 | cambio de contexto | |
| CPU 스틸 | CPU steal (tiempo robado) | |
| CPU 스로틀링 / 주기 / 할당량 | throttling de CPU / periodo (CFS period) / cuota (quota) | |
| 스왑 / OOM 킬러 | swap / OOM killer | |
| 시간 동기화 / 시계 점프 | sincronización horaria (NTP) / salto de reloj | wall clock → reloj de pared (wall clock); monotonic clock → reloj monotónico |
| 임시 포트 고갈 | agotamiento de puertos efímeros | |
| 소켓 버퍼 / 수신 버퍼 넘침 | búfer de socket / desbordamiento del búfer de recepción | 버퍼 → búfer (plural búferes), except in “bufferbloat” and code names |
| 재전송 / 재전송 타이머 / RTO / 재전송률 | retransmisión (verb: retransmitir, reenviar) / temporizador de retransmisión / RTO / tasa de retransmisión | 손실로 판단해 재전송한다 → lo da por perdido y lo retransmite; RTO가 만료된다 → el RTO expira |
| 불필요한 재전송 | retransmisión espuria | |
| 빠른 재전송 | retransmisión rápida (fast retransmit) | |
| 재전송 백오프 | backoff exponencial de la retransmisión | |
| 순서 보장 / 보낸 순서대로만 넘겨줌 | entrega en orden / solo entrega los datos en el orden en que se enviaron | |
| 시퀀스 번호 | número de secuencia | |
| HOL 블로킹 | bloqueo HOL (bloqueo de cabeza de línea) | |
| thin stream | thin stream | Gloss once: “conexión que envía pocos paquetes pequeños” |
| TLP / 마지막 패킷들의 손실 | TLP (tail loss probe) / pérdida de los últimos paquetes (tail loss) | |
| 선택적 ACK / 중간에 빠진 부분 | ACK selectivo (SACK) / hueco (datos que faltan) | |
| ACK(수신 확인) / 지연 ACK | ACK (acuse de recibo) / ACK retardado | |
| 아직 ACK를 받지 못한 패킷 | paquetes en vuelo (in-flight) | |
| 혼잡 / 혼잡 윈도우 / 수신 윈도우 / 윈도우 스케일 | congestión / ventana de congestión (cwnd) / ventana de recepción (rwnd) / escalado de ventana | |
| 제로 윈도우 / 제로 윈도우 프로브 | ventana cero (zero window) / sonda de ventana cero | |
| 전송량 축소 | reducción del ritmo de envío | |
| Nagle / TCP_NODELAY / keepalive / RST | algoritmo de Nagle / TCP_NODELAY / keepalive / RST | Keep as is |
| 비신뢰(unreliable) 채널 / 신뢰성 UDP | canal no confiable (unreliable) / UDP confiable | |
| 폴리서 / 셰이퍼 / 페이싱 / ECN | policer / shaper / pacing / ECN | Gloss once: policer = limitador que descarta; shaper = limitador que encola |
| 블로킹 I/O / 비동기 I/O | E/S bloqueante / E/S asíncrona | “I/O” only inside code or product names |
| 하트비트 | heartbeat | 연결 유지 신호 → señal de keepalive |
| 타임아웃 | timeout | Masculine |
| 수신 호출 | llamada de recepción (recv) | |

### Server process, memory, disk and database
| Korean | Spanish | Note |
|---|---|---|
| 워커 / 워커 스레드 / 스레드 풀 | worker / hilo de trabajo (worker) / pool de hilos | Queueing theory 워커: “worker (núcleo de CPU, hilo o conexión de BD que atiende solicitudes)” |
| 스레드 | hilo | Never “subproceso”, never “hebra” |
| 락 / 잠금 / 잠금 경합 / 데드락 | lock (threads) / bloqueo (DB) / contención de locks o de bloqueos / deadlock (interbloqueo) | 락을 잡다 → adquirir (retener) un lock |
| 점유한다 | ocupa, retiene (un hilo, una conexión, un puerto, la CPU) | |
| 동기 호출 | llamada síncrona (bloqueante) | |
| 호출 체인 | cadena de llamadas | |
| starvation | inanición (starvation) | |
| 워치독 | watchdog | 감시 타이머 → temporizador de vigilancia |
| 무한 루프 / 길찾기 | bucle infinito / pathfinding (búsqueda de rutas) | |
| 직렬화 | serialización | |
| GC / GC 멈춤 / 전체 멈춤 / Full GC | GC (recolección de basura) / pausa del GC / pausa stop-the-world / Full GC | “GC가 돈다” → “se ejecuta el GC”; Young/Old 영역 → generación joven/vieja |
| 가비지 / 수집·회수 | basura / recolectar, liberar | |
| 힙 / 할당 | heap / asignación | |
| 메모리 누수 / 단편화 | fuga de memoria / fragmentación | |
| 캐시 미스 / 메모리 계층 | fallo de caché / jerarquía de memoria | |
| 동기 쓰기 / fsync | escritura síncrona / fsync | fsync(확실히 저장) → fsync (escritura garantizada en disco) |
| IOPS / 처리량 한도 / 대역폭 | IOPS / límite de throughput / ancho de banda | 처리량 → throughput |
| 버스트 크레딧 | créditos de ráfaga | 적립량 → saldo de créditos |
| 페이지 캐시 / 디스크에 기록 | caché de páginas / escribir en disco | |
| 백업 / 스냅숏 | copia de seguridad / instantánea (snapshot) | |
| 커넥션 풀 / 커넥션 풀 고갈 | pool de conexiones / agotamiento del pool de conexiones | |
| 인덱스 / 컬럼 / 스키마 변경(DDL) | índice / columna / cambio de esquema (DDL) | |
| 풀 스캔 / 실행 계획 | escaneo completo (full scan) / plan de ejecución | |
| 쿼리 | consulta | |
| 행 잠금 / 핫 로우 / 잠금 에스컬레이션 | bloqueo de fila / fila caliente (hot row) / escalado de bloqueos | |
| 트랜잭션 / 롤백 / 언두 로그 / MVCC | transacción / rollback / undo log / MVCC | |
| 복제 / 복제본 / 주 DB / 복제 지연 | replicación / réplica / BD principal / retraso de replicación | |
| 체크포인트 / 로그 플러시 | checkpoint / volcado del log (flush) | |
| 장애 전환 | failover | |
| 캐시 / 캐시 서버 / 콜드 캐시 / 캐시 스탬피드 | caché / servidor de caché / caché fría / estampida de caché | |
| DB | BD (base de datos) | Product and metric names keep their own spelling |
| HDD 헤드·플래터 | cabezal / plato | |

### Architecture, operations and observability
| Korean | Spanish | Note |
|---|---|---|
| 서버 구성 | arquitectura de servidores | |
| 게이트웨이 / 부가 서버 | gateway / servidor auxiliar | |
| 연쇄 장애 / 서킷 브레이커 | fallo en cascada / circuit breaker | |
| 재시도 폭풍 / 로그인 폭주 / 접속 폭주 | tormenta de reintentos / avalancha de inicios de sesión / avalancha de conexiones | |
| 오토스케일링 | autoescalado | 늘어나는 데 시간이 걸림 → añadir servidores lleva tiempo |
| 확장 | escalado | |
| 서비스 디스커버리 / 외부 서비스 의존 | descubrimiento de servicios / dependencia externa | |
| 장애 | incidente; caída (outage); fallo | 장애가 난다 → falla, se cae |
| 사후 분석 | postmortem | |
| 크론 작업 | tarea cron (cron job) | |
| 모니터링 / 경보 / 지표 / 로그 | monitoreo / alerta / métrica / log | |
| 이용률 / 대기열 | utilización / cola | 대기열에 쌓인다 → se acumula en la cola |
| 평균 / 중앙값 / 백분위수 / p99 / 꼬리 지연 | media (promedio) / mediana / percentil / p99 / latencia de cola (tail latency) | |
| 합성 측정 / 집계 간격 | monitoreo sintético / intervalo de agregación | |
| 샘플링 | muestreo | |
| 스파이크 | pico | |
| 패턴 | patrón | |
| 인프라 도구 | herramientas de infraestructura | |
| 거점 | punto de presencia (PoP) | |
| 재연결 유예 시간 | periodo de gracia para reconectar | |
| 쏠림 경보 | alertas de desbalance | |
| 확인 신호 | Señales que revisar: | cases |

## 13. Korean constructions and how to render them

- **Nominal endings** (…함, …봄, …임) → Spanish noun phrase or infinitive (see `chk`). Never chains like “se puede ver que se observa que…”.
- **Topic-first sentences** (“서버 GC는, …”) → normal Spanish order with the subject or the condition first (“Cuando se ejecuta el GC del servidor, …”).
- **Long attributive chains** (“…하는 …인 …의 X”) → a relative clause or two sentences. One “que” clause per sentence is plenty.
- **Conditions** “~하면” → “Si …, …”, “Cuando …”, “En cuanto …”. Vary them; do not start five sentences in a row with “Si”.
- **“~을 봅니다” (diagnostic step)** → “Hay que revisar X, Y y Z.” or “Conviene mirar X y Y.” (use “e” before i-/hi-).
- **“~때문에”** → “por”, “porque”, “ya que”. Prefer a verb over a chain of nouns.
- **Passive overuse**: prefer active voice or the reflexive “se” (“se descartan paquetes”) over “son descartados por”.
- **Parenthetical glosses** from TERMS.md (“지터(도착 간격의 흔들림)”) stay in parentheses.
- **Hedging** 대개 / 흔히 / 종종 / 가끔 → casi siempre, normalmente / a menudo, es habitual / con frecuencia / de vez en cuando, a veces.
- **Onomatopoeia** (멈칫 멈칫, 휙, 파파파팍) → plain Spanish: “a trompicones”, “de golpe”, “todo de una vez”. No comic sounds.
- **Gerund calques**: do not chain gerunds (“enviando paquetes, provocando…”); split the sentence.
- **Korean facts stay Korean**: Korean ISPs, cities, KRW prices and institutions are kept as facts (Seúl, KT, SK Broadband, LG U+).

## 14. Words to watch

- 렉이 생기다/걸리다 → “hay lag”, “el juego tiene lag”, “picos de lag”.
- 튕기다 → “te echa del juego”, “se cae la conexión”. 버벅이다 → “va a tirones”, “se traba”.
- 굼뜨다 → “va pesado”, “responde tarde”. 손맛 → “sensación de control”.
- 서버가 죽는다 → “el servidor se cae”. 서버가 굳는다 → “el servidor deja de responder”.
- 공인 → “oficial”. 공신력 있는 출처 → “fuentes confiables”.
- 원개발사 → “desarrollador original”. 운영사 → “operador” (the company running the live game).
- 제보 → “reporte”; 제보하다 → “reportar”.
- Avoid calques: 확인형 행동 → “acciones que esperan confirmación del servidor”; 체감 → “sensación” or “lo que se percibe”; 쾌적하다 → “va fluido”; 대표값 → “valor típico”; 해부하다 (in titles) → “analizar”.
- “Eventualmente” means “possibly” in Spanish, never “finally”; “actualmente” means “currently”; “librería” is acceptable for a code library, “biblioteca” is preferred.
- No analogies outside the source’s analogy boxes (`class="analogy"`); use the industry term.

## 15. SEO notes

Phrases people in Spain and Latin America actually type when a game lags or when they investigate server lag:

1. causas del lag en juegos / qué causa el lag
2. por qué tengo lag / por qué me da lag
3. lag en juegos online
4. picos de ping / picos de lag
5. ping alto
6. pérdida de paquetes (cómo solucionar la pérdida de paquetes)
7. rubber banding
8. tirones en juegos / stuttering en juegos
9. input lag
10. lag del servidor
11. jitter en juegos
12. el juego se desconecta / me desconecta del servidor
13. pantalla de carga infinita
14. netcode
15. tick rate
16. compensación de lag
17. retransmisión TCP
18. bufferbloat
19. lag en MMO
20. cómo reducir el ping

How they are used:
- Main title: “Libro blanco del lag en juegos: causas del lag en juegos online y quién lo soluciona” matches (1) and (3) and states the unique angle (who fixes it).
- Meta description opens with “Libro blanco sobre las causas del lag en juegos online” and names tirones, teletransportes and desconexiones, the words players type, plus “MMO”.
- Symptom names are search words (Tirones, Rubber banding, Input lag, Desconexión), and the aliases add stuttering, efecto goma, se traba, carga infinita. Symptom pages: “{síntoma} en juegos online: causas y responsables | Libro blanco del lag en juegos”, which lines up with (7), (8), (9).
- Cause pages: “{nombre} ({English name}): causa de lag | Libro blanco del lag en juegos”.
- Keywords meta: causas del lag, lag en juegos online, ping alto, picos de lag, tirones, teletransporte, rubber banding, input lag, desconexiones, lag del servidor, netcode, retransmisión TCP, pérdida de paquetes, equipo de desarrollo, equipo de infraestructura.
- Never stack keywords; each phrase must read as part of a sentence or a natural title.

## 16. Shared keys (already fixed; reuse exactly)

These Korean strings exist as whole entries both in the phase-1 groups (`data`, `glossary`, `meta`, `ui-kit`, `site`) and in other groups. The build keeps one Spanish string per Korean key (the first group alphabetically wins for data and build strings), so use these verbatim wherever the whole entry is identical, even if the context feels slightly different. `node tools/i18n.cjs check es --conflicts` lists mismatches.

| Korean key | Spanish | Also appears in |
|---|---|---|
| 뚝뚝 끊김 / 순간이동 / 고무줄 / 몰아치기 / 슬로우모션 / 입력 지연 / 멈춤 / 씹힘·롤백 / 접속 끊김 / 접속 불가·무한 로딩 | the symptom names of section 5 | sim-arch, sim-lab, sim-oneslow, sim-gc, sim-nagle (the playback option “멈춤” is a playback speed, “Pausa”; each sim has its own dictionary), sim-sndbuf |
| 지연 / 지터 / 손실 / 패킷 손실 | Latencia / Jitter / Pérdida de paquetes / Pérdida de paquetes | sim-bloat, sim-distance, sim-oneslow, sim-syncmodels, sim-sndbuf, sim-lab, site |
| 클라이언트 / 서버 / 네트워크 / 디스크 | Cliente / Servidor / Red / Disco | many sims, body-l-disk |
| 좋음 / 주의 / 나쁨 | Bueno / Atención / Malo | sim-bloat, sim-ladder, body-judge. Exception: in the `#retrans` table header, 주의 means “caveats” and may be “Precauciones” |
| 범위 | Alcance | ui-app (filter label), site |
| 원인 / 설계 / TCP 재전송 | Causa / Diseño / Retransmisión TCP | site, sim-windows |
| 담당 / 주 담당 / 팀 | Responsable / Responsable principal / Equipo | body-owners, ui-app |
| 요인 / 언제 | Factores / Cuándo | ui-app |
| 확인할 곳 / 이러면 맞음 / 이러면 아님 / 확인 수단 | Dónde mirar / Se confirma si / Se descarta si / Se verifica con | ui-app |
| 수치 감각 / 더 알아보기 / 실제 사례 / 출처 | Cifras de referencia / Para saber más / Casos reales / Fuentes | ui-app |
| 무슨 일 / 배울 점 | Qué pasó / Lecciones | ui-app |
| 상황별 절차 / 실제 장애 사례 / 용어 사전 / 참고 문헌 / 목차 | Procedimientos por situación / Incidentes reales / Glosario / Bibliografía / Índice | body-cases, body-glossary, body-refs, body-shell |
| 관측으로 판정하기 | Diagnosticar con datos de monitoreo | body-judge |
| layer names (클라이언트 게임 프로세스, 데이터센터 네트워크 장비, 서버 OS (커널), 메모리, 디스크, 데이터베이스, 서버 구성과 운영, 서버 네트워크 카드, 일부에게만 생기는 문제, TCP 재전송의 근본 원인) | see section 7 | body-l-* headings, body-partial, body-retrans |
| the five owner descriptions (게임 클라이언트 코드: …, 게임 서버 코드: …, 회선과 IDC …, 서버 장비·클라우드 …, DB 서버·스토리지 …) | copy from `src/i18n/es/data.json` (`owners/*/desc`) | body-owners |
| glossary terms used as cause titles (타이머 해상도, 복제 지연, 캐시 스탬피드, 연쇄 장애, 메모리 누수, 스왑, 캐시 미스, OOM 킬러, 데드락) | Resolución del temporizador, Retraso de replicación, Estampida de caché, Fallo en cascada, Fuga de memoria, Swap, Fallo de caché, OOM killer, Deadlock | causes-* |
| other glossary terms reused as sim labels (방화벽, 로드밸런서, 게이트웨이, 캐시, 선연출, 발열 스로틀링, 타임아웃, 버스트 크레딧, 틱레이트, 보간, 보간 버퍼, 클라이언트 예측, 틱, 핑, 데드락, 링 버퍼, 집계 간격, 이용률, 재전송률, 불필요한 재전송, 락스텝, 롤백, 지연 보상) | as in `src/i18n/es/glossary.json` | sim-* |
| 같은 데이터센터 서버끼리 왕복 | Ida y vuelta entre servidores del mismo centro de datos | sim-ladder |
| 커널 | Kernel | data, glossary |
| " 초" (after a number) | " s" | sim-disk |
| `<b>{0}</b>({1})` (site, factor name + description; appears after the next sync) | `<b>{0}</b> ({1})` | site |

## 17. Checklist before `fill`

- Placeholders `{0}` … all present; HTML tags identical in number and attributes; `href`, `id`, `class`, `data-*` untouched.
- Symptom names exactly as in section 5; factor names as in section 6; layer names as in section 7; team names as in section 8.
- es-419 numbers (1,500 / 12.5), space before units, no space before %, en dash in ranges.
- No “—”, no spaced “ – ”, no “no es A, sino B”.
- tú forms only; no vos, no usted, no vosotros; no regional slang; regional choices from section 4.
- No article or agreeing adjective in front of a placeholder that receives a name; no gendered article with “PC”.
- Run `node tools/i18n.cjs check es --warn` and `--conflicts`; number warnings are fine only where a Korean number word became digits or words.

## 18. Decisions added during review

Settled by the translators and the reviewers after the first pass. They extend sections 3 to 16; use them everywhere.

| Korean | Spanish | Note |
|---|---|---|
| PC (내 PC, 유저 PC) | PC without article: “tu PC”, “en tu PC”, “su PC” | Never “el PC”, “la PC”, “del PC”, “un/una PC”, “mismo PC”. If an article is unavoidable: “la computadora” (“en la misma computadora”) |
| 노트북 | computadora portátil | Feminine everywhere; “laptop” changes gender by country. Applies to sims too (sim-cpu) |
| 국내 | en Corea | “en Corea va bien, pero …”, “servidor en Corea”. Never “en el país”, “nacional” |
| 입력 지연 (lockstep/rollback setting) | retardo de input | “1–3 frames de retardo de input”. The symptom stays “Input lag” |
| 서버·GC·VM·NIC·TCP가 멈춤 (the system stops) | pausa / detención / corte; verbs “se detiene”, “se pausa” | “Congelamiento” only for what the player sees (symptom name, `c` on-screen fragment, bold 멈춤 in tables) |
| GC 전체 멈춤 | pausa stop-the-world del GC | As in the mem-gc title |
| 접속 대기열(backlog) | cola de conexiones pendientes (backlog) | The kernel accept queue. Never shortened to “cola de conexiones” |
| 로그인 대기열 / 접속 대기열 시스템 (queue numbers) | cola de inicio de sesión | The game’s waiting line with positions |
| 순간이동 (game feature: 텔레포트, warp) | teletransportación; verb “teletransportarse” | The symptom stays “Teletransporte” |
| 재전송 | retransmisión: transport protocols only (TCP; the retransmission rules of reliable UDP) | Wi-Fi/radio link retries (무선 구간 재전송, 재시도) → “reenvíos” / “reintentos”. Relay → “servidor intermedio (relay)”, never “retransmisión” |
| 음영 지역 | zona sin cobertura | |
| 간섭 (radio, software) | interferencias | Plural; “fuentes de interferencia” is fine |
| 가입자 | abonado | “varios abonados comparten una IP” |
| 페이즈 | phasing | Never “fase” for the feature |
| 백본 / 가입자망 | red troncal / red de acceso | |
| 스크러빙 센터 | centro de depuración (scrubbing) | |
| 우회 라우팅 | enrutamiento con rodeos | “ruta alternativa (desvío)” stays for 우회 경로 |
| 전파 지연 | retardo de propagación | |
| 주소 체계 (IPv4/IPv6) | familia de direcciones | |
| 인터넷 거점 | nodos de internet; PoP for a provider’s 거점 | |
| 리졸버 | resolver de DNS | |
| 기능 플래그 / 카나리 / 대조군 | feature flag / canario (despliegue canario) / grupo de control | |
| 트래픽 지문 | huella del tráfico | |
| 리스 (lease) | concesión (lease) | |
| 경쟁 상태 | condición de carrera (race condition) | |
| 대역 외 접속 | acceso fuera de banda (out-of-band) | |
| 성능 분석 도구 | herramientas de perfilado | |
| 로비 서버 / 월드 | servidores de lobby / mundos (Worlds) | |
| 태평양 표준시 / 서머타임 | hora estándar del Pacífico / hora de verano del Pacífico | 12-hour clock with “a. m./p. m.” |
| 확인 신호 / 먼저 부를 곳 (cases, playbooks) | Señales que revisar: / A quién llamar primero: | |
| 통신사 에스컬레이션 | escalado de incidencias al ISP | |
| 먼저 (owners table) | Primero | |
| 주의 (#retrans settings table header) | Precauciones | Exception to “Atención” |
| 시간 (time table header) | Tiempo | |
| 누구에게 번지나 (#partial label) | Hasta dónde se extiende | |
| 도구 (T1–T6 labels) | Herramientas | |
| 용어 검색 안내 | “Escribe en el buscador en español o en inglés” | |
| PC방 | cibercafé | |
| 경매장 / 거래소 / 길드 / 던전 / 제작 / 우편함 | casa de subastas / mercado / gremio / mazmorra / fabricación / buzón | |
| 보스 / 전멸 / 장비 (gear) / 소환물 | jefe (world boss stays) / wipe / equipamiento / invocaciones | |
| 자동 사냥 | combate automático | |
| 세션 키 버그 / 유령 접속 | sesión identificada por IP o dispositivo / sesión fantasma | |
| 그래픽카드 메모리 / PC 메모리 | VRAM / RAM del sistema | |
| 마우스 / TV / 패드 | mouse / televisor / controlador (driver = “driver”) | |
| 게이밍 모니터 | monitor gaming | |
| 개발 빌드 / 소크 테스트 / 프레임 페이싱 | build de desarrollo / soak tests / frame pacing | |
| 저메모리 킬러 | low memory killer | |
| 고정 타임스텝 따라잡기 폭주 | espiral de recuperación | |
| 슬로 스타트 / 리슨 소켓 | slow start / socket de escucha | |
| 스레드 덤프 / 코어 덤프 | volcado de hilos / core dump, crash dump | |
| 라이브니스 검사 / 레디니스 | sonda de liveness / readiness probe | |
| 포트 없음 (ICMP) | puerto inalcanzable | |
| 반이중 / 자동 협상 / 늦은 충돌 | semidúplex / autonegociación / colisiones tardías | full-duplex stays |
| MSS 조정 / TCP 정규화 / 경로 MTU 탐색 | ajuste de MSS (clamping) / normalización TCP / PMTUD, sondeo de MTU | |
| 할당기 / 버퍼 풀 / 배치 | asignador / buffer pool / procesos batch | |
| 성능 보장형 디스크 / 버스트하는 인스턴스 | IOPS aprovisionadas / instancias de rendimiento ampliable | |
| 서비스 메시 / 인증서 고정 | malla de servicios / fijación de certificados (pinning) | |
| 세대 번호 (entity ID) | número de generación | |
| 저사양 모드 | modo de bajos requisitos | |
| 아파트 단지 (analogy) | conjunto residencial | |
| 타임스탬프 (TCP option) | marcas de tiempo | |
