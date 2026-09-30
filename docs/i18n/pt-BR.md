# Brazilian Portuguese (pt-BR): terminology and style guide

Target: Brazil (`pt-BR`). Readers are Brazilian game developers, SRE/infra engineers and, just as much, non-programmers in studios (game design, art, QA, PM, community/support). Every string must read as if a Brazilian senior engineer wrote it for colleagues: natural Brazilian Portuguese, the words Brazilian studios and ops teams actually use, no machine-translation tone, no Korean word order. Read `docs/I18N_GUIDE.md` first; this file adds the Brazilian decisions. When this file and your instinct disagree, follow this file so that ten translators produce one voice.

The Korean source is the truth. Do not add or drop facts, numbers, conditions, commands, IDs or URLs.

**Brazilian Portuguese only.** Never use European Portuguese vocabulary, spelling or grammar (see section 8): no *ecrã, ficheiro, utilizador, rato, telemóvel, equipa, registo, controlo, facto, acção, receção, está a carregar*.

## 1. Site name and titles

| Korean | pt-BR (use exactly) | Notes |
|---|---|---|
| 게임 렉 백서 | **Guia do Lag em Jogos** | Fixed site name (proper noun, capitalized as a title: prepositions lowercase). Never “Guia de Lag em Jogos”, “Guia do Lag nos Jogos”, “White Paper do Lag”. |
| 이 백서 / 백서 (generic) | este guia / o guia | lowercase in running text |
| 게임 렉 백서: 온라인 게임 렉 원인과 해결 담당 (full title) | Guia do Lag em Jogos: o que causa lag em jogos online e quem resolve | main page `<title>`, `og:title` |
| … \| 게임 렉 백서 | … \| Guia do Lag em Jogos | suffix of every static page title |
| 시청각 백서 | guia interativo | |
| 텍스트 판 | versão em texto | |
| 원본 (the interactive site, as opposed to the text edition) | versão interativa | “Abrir o card interativo …” |
| 원문 (the Korean original; a case’s source article) | original (Korean original) / fonte original (source article) | |

Why this name: Brazilian players and developers say and search “lag em jogos”, “lag no jogo”, “causas do lag”. “Guia” is how a Brazilian engineer names a reference like this; “white paper” sounds like corporate marketing or crypto. The English alternate name “Game Lag White Paper” stays in structured data (the build adds it).

Headings, page titles, labels, buttons and legends use **sentence case** (“Buscar por sintoma”, “Onde olhar”). The only title-case string is the site name.

## 2. Register and voice

- **Audience**: game design, art, QA and producers first, engineers second. Write like a senior engineer explaining to a smart colleague from another area: plain, concrete, confident. Short sentences, one idea per sentence. No academic tone, no marketing tone, no exclamation marks, no jokes, no gamer slang in prose (slang is fine only in symptom aliases and SEO phrases).
- **Prose** (body text, cause `s`, `num`, `more`, symptom `what/looks/tell`, factor `desc/cope`, glossary definitions): the Korean is polite explanatory style (합니다체). Use neutral, friendly expository Brazilian Portuguese in the present tense.
- **Addressing the reader**: **você** (never *tu*, never *o senhor*). Korean first-person player view (내 화면, 내 캐릭터, 내 PC, 내 입력) → “sua tela”, “seu personagem”, “seu PC”, “seus comandos”. Where the Korean speaks as the operator (우리 인프라팀, 우리 계약) → “nossa equipe”, “nosso contrato”. Exception: answer options in the player’s voice stay first person (who `me` → “Só eu”; report item “só eu / a party também …”).
- **Instructions** (report guide, “try this”, sims): imperative with *você* forms: “Informe”, “Verifique”, “Arraste”, “Compare”.
- **`chk` fields** (how to confirm) are terse checklist lines, no subject, **no final period** (keep the Korean pattern: if the field has several sentences separated by “. ”, keep them separated by “. ” but do not add a period at the very end if the Korean has none).
  - `look`: noun phrase or infinitive, like a Brazilian runbook: “Tempo de tick (p99) e número de estouros por zona ou canal, no mesmo gráfico do número de jogadores. Sem métrica de tick, CPU por thread da thread do jogo com `pidstat -t 1`”.
  - `yes`: short statement in the present: “O tempo de tick passa do orçamento (50 ms a 20 ticks) quando lota, com a thread do jogo perto de 100% de CPU”.
  - `no`: “finding: conclusion”. Korean “~쪽” at the end → “aponta para …” or “mais provável: …”: “Ticks estouram com pouca CPU na thread do jogo: aponta para espera (pausa do GC, locks, chamadas bloqueantes)”.
- **`c` triple** [Por quê, Efeito, Na tela]: three short fragments, no final period: “Um tick (ex.: 50 ms) tem mais trabalho que o orçamento” → “O estado do jogo, que deveria atualizar 20 vezes por segundo, atualiza só 8” → “Câmera lenta na área inteira, skills demorando a responder”.
- **`act` fields** (team to-dos): comma-separated **infinitive** phrases, one final period, like the source: “Reduzir o trabalho pesado por tick, dividir o tick entre threads, distribuir os jogadores entre canais, registrar o tempo de tick como métrica.” `ext` items: “Orientar os jogadores a …”, “Pedir à operadora (ou ao provedor de nuvem) que …”.
- **`sig.g`** (which graph): short noun phrases, comma-separated: “Tempo de tick do servidor, tempo de pausa do GC”, “RTT (ping)”, “Taxa de retransmissão”, “Uso de CPU por núcleo”, “Conexões e desconexões”, “Latência das queries do BD”, “Tamanho da fila do disco”, “Frame time”.
- **Cause titles (`t`)**: noun phrase, sentence case, no final period, the standard incident name where one exists: “Pausa stop-the-world do GC no servidor”, “Contenção de lock em hot row”, “Noisy neighbor”, “Janela zero”. Titles that body text or sims link to by exact string must be translated identically everywhere (search the Korean title across your groups).
- **Cases (`cases.js`)**: the Korean is plain written style (했다체). Use neutral past-tense reporting (pretérito perfeito): “O servidor de login caiu às 21:52 UTC”. Company names, product names, dates and times stay exactly as facts.
- **UI labels and buttons**: short, no article, no final period: “Carregar cenário”, “Experimente”, “Escolher idioma”. Captions that are full sentences end with a period.
- **Analogy boxes** (`class="analogy"`): keep the analogy and translate it naturally. Outside those boxes never use analogies; use the terms in section 6.

## 3. Forbidden patterns (the two Korean house rules in Portuguese form)

1. **No dash asides.** Do not insert an explanation in the middle of a sentence with “—”, “–” or spaced hyphens. Use parentheses, a colon, a comma, a relative clause (“que …”) or a new sentence.
   - Bad: “O servidor — mais exatamente o game loop — para.”
   - Good: “O game loop do servidor para.” / “O servidor para (mais exatamente, o game loop).”
   - The en dash is allowed only in ranges without spaces (“1–5 m”, “0,2–0,5 s”). Arrows (→, ↔) stay as in the source.
2. **No “not A but B”.** Do not write “não é A, mas B”, “não é A, e sim B”, “não A, mas sim B”, “não se trata de A, mas de B”, “A não é o problema; o problema é B”, and do not use “em vez de A, B” / “ao invés de” as a rhetorical correction. State B directly; if ruling out A is itself a fact, give it its own plain sentence or a condition.
   - Bad: “Não é problema de conexão, e sim do servidor.”
   - Good: “A causa está no servidor. A conexão está normal.” / “Se a conexão está normal, suspeite do servidor.”
   - Plain descriptions of a method are fine: “descarta sem enfileirar”, “move o personagem sem esperar o servidor”.
   - “Mas” itself is allowed for real concessions (“A média é boa, mas alguns pacotes chegam tarde”).

## 4. Typography

- **Quotes**: Brazilian curly double quotes “…” (as in the source), nested ‘…’. Never «…» (European). Never ASCII `"` in attribute translations (`ctx` ending in `@aria-label`, `@title`, `@alt`, `@content`): the tool rejects `"`, `<`, `>`; “…” is fine. Straight quotes only inside `<code>`, commands and HTML syntax.
- **Apostrophe**: not used in Portuguese except in names; if needed, curly ’.
- **Ellipsis**: the single character “…”.
- **Parentheses**: space before the opening parenthesis: “jitter (variação no intervalo de chegada)”, “tempo de ida e volta (RTT)”. Korean writes 지터(…) without a space; Portuguese always has one.
- **Korean middle dot (·)**: in compact labels, slash without spaces for single words (“Wi-Fi/roteador”, “Ticks/threads”, “GC/vazamentos”); “ / ” with spaces only in the three composite symptom names (6.1). In prose turn “A·B” into “A e B”, “A ou B” or a comma list, whichever the meaning is.
- **Colon**: lowercase after a colon unless a proper noun, a quote or a symptom/label name follows (Brazilian rule). “Também chamado de: travadinhas, stuttering …”.
- **Lists in prose**: no Oxford comma (“latência, jitter e perda de pacotes”).
- **“예:”** → “ex.:” inside parentheses, “por exemplo” in running text. **“등”** → “como …”, “e outros”; “etc.” is acceptable in compact fields and parentheses.
- **Capitalization**: symptom names, factor names, layer names, who/when values and graph-shape names start with a capital letter when they stand alone (label, chip, heading, list item, table cell). Inside a sentence they are lowercase, except acronyms and English proper terms (“aparece como engasgos ou teleporte”, “a área inteira entra em câmera lenta”, “o input lag aumenta”).
- **Loanword genders** (use these): o lag, o ping, o tick, o jitter, o frame, o frame time, o snapshot, o buffer, o cliente, o servidor, o roteador, o switch, o load balancer, o firewall, a NIC (a placa de rede), o kernel, o socket, o pacote, o timeout, o heartbeat, a thread, o lock, o deadlock, o cache, o cache miss, o GC, o heap, o swap, o backlog, o deploy, o failover, o peering, o log, a métrica, a query, o rollback, o patch, o pico, o burst, o microburst, a hot row, o pool de conexões, o worker, a fila, o gateway, o circuit breaker, o autoscaling, o watchdog, o postmortem, o bufferbloat, o rubber banding, o input lag, o game loop, o netcode, o anti-cheat, o overlay, o card.
- **Keep verbatim** (never translate or re-case): cause IDs, `code`, commands and options (`ss -ti`, `-Xlog:gc*`), counters and metric names (`TcpExtTCPLostRetransmit`, `pg_stat_statements`), config keys, RFC numbers, product and tool names, URLs, `%SITE%`, everything inside `<code>`.

## 5. Numbers and units

The page formatter prints numbers with the `pt-BR` locale, so text must match it.

- **Decimal comma**: 16,7 ms; 0,25 s; 1,8 GB; 12,5%.
- **Thousands separator: period** for quantities of 4+ digits: 1.500 bytes, 1.460 bytes, 10.000, 65.535 portas, 1.000 vezes. Never group identifiers: years (2016), versions (JDK 26, Windows 10 1607), ports (443, 8080), RFC numbers (RFC 4787), error codes, model numbers.
- **Space between number and unit**: 50 ms, 1,5 s, 20 Hz, 60 FPS, 100 Mbps, 2 GB, 5 m, 1.500 bytes. **No space before %**: 1%, 0,1%, 80–90% (normal Brazilian usage). Unit symbols stay as in the source: ms, µs, ns, s, Mbps, Gbps, GB, MB, KB, IOPS, PPS.
- **Seconds, minutes, hours**: Korean “초” after a digit → “s” in compact places (tables, `chk`, `num`, labels, parentheses): “0,5 s”, “30 s”. In flowing prose “30 segundos” is also fine. Minutes, hours and days are written out: “10 minutos”, “2 horas”, “7 dias”. Without a digit, words: “alguns segundos”.
- **Ranges**: Korean `~` → en dash without spaces: 1–5 m, 0,2–0,5 s, 80–90%. In prose “de 2 a 5 segundos” or “entre 2 e 5 segundos” is also fine. Korean “~” never appears in Portuguese text.
- **Tick rates**: “20틱 서버” → “servidor de 20 ticks” (Brazilian players say “servidor de 128 ticks”). “20틱” alone → “20 ticks”. “60Hz” → “60 Hz”.
- **Multipliers**: “2배” → “o dobro”, “2 vezes”; “1,000배” → “1.000 vezes”. Keep digits where the Korean has digits (the checker compares numbers; a warning is fine when a Korean number word such as 만, 두, 세 becomes digits or words).
- **Korean number words**: 1만 → “10 mil” (prose) or “10.000”; 100만 → “1 milhão”. Vague quantities keep their vagueness, never invent numbers:

| Korean | pt-BR |
|---|---|
| 수 ms | alguns ms |
| 수~수십 ms | de alguns a dezenas de ms |
| 수십 ms | dezenas de ms |
| 수백 ms | centenas de ms |
| 수 초 | alguns segundos |
| 수~수십 초 | de alguns a dezenas de segundos |
| 몇 초~십여 초에 한 번 | a intervalos de alguns segundos a pouco mais de dez segundos |
| 수 GB | vários GB |
| 약 / 쯤 / 안팎 | cerca de, uns, por volta de |
| 이상 / 이하 / 미만 / 초과 | pelo menos, a partir de / no máximo, até / menos de, abaixo de / mais de, acima de |
| 한두 개 | um ou dois |

- **Dates**: “28 de outubro de 2021” (month lowercase). **Times**: 24-hour clock, keep the source’s time zone: “21:52 UTC”; Korean 오후 11:48 PDT → “23:48 PDT”.
- **Short strings with a number placeholder (plural agreement)**: a placeholder can be 1, and “1 causas” is wrong. When the count can be 1 (sources of one cause, matches, filter results, selected items), use a count-neutral label form: `출처 {0}건` → “Fontes ({0})”; `원인 {0}가지` in a filter result → “Causas: {0}”; `인용 {0}곳` → “Citado por: {0}”; `{0}개 선택` → “Selecionados: {0}”. Site-wide totals and per-symptom or per-layer counts (always well above 1: 228 causes, 14+ per symptom, 9+ per layer, hundreds of sources) may use the natural plural: “{0} causas”, “{0}: {1} causas e quem resolve”. Never write “causa(s)”. Watch gender agreement with placeholders too: when `{0}` is a team name, avoid articles that would have to agree (“O que fazer ({0})” works for “Equipe de desenvolvimento” and “Externo” alike).

## 6. Terminology

Identical Korean strings must get identical pt-BR strings in every group: the build uses one dictionary per language, and `node tools/i18n.cjs check pt-BR --conflicts` lists differences. Strings already translated in `data`, `glossary`, `site`, `meta` and `ui-kit` are the reference; copy them when the same Korean string appears in your group (layer names as chapter headings, owner descriptions in `body-owners`, glossary terms as cause titles). See section 10.

Keep established English terms where the Brazilian community uses English (lag, ping, tick, jitter, frame, buffer, snapshot, netcode, rollback, deploy, failover, cache, lock, thread, heap, swap, timeout, heartbeat, load balancer, firewall, peering, bufferbloat, circuit breaker, autoscaling, postmortem). Use the Portuguese term where Brazilian engineers use Portuguese (latência, perda de pacotes, fila, retransmissão, congestionamento, interpolação, extrapolação, predição, escalonamento, troca de contexto, vazamento de memória, índice, transação, réplica, falha em cascata, largura de banda, vazão). English loanwords are not italicized.

### 6.1 Symptom names (fixed; use exactly these everywhere)

| id | Korean | pt-BR name | pt-BR aliases (translation of `alias`) |
|---|---|---|---|
| stutter | 뚝뚝 끊김 | **Engasgos** | travadinhas, stuttering, parece queda de FPS |
| teleport | 순간이동 | **Teleporte** | warp, teleportando, trava e pula |
| rubber | 고무줄 | **Rubber banding** | puxado para trás, efeito elástico, rollback de posição |
| burst | 몰아치기 | **Avanço rápido** | tudo de uma vez, jogo acelerado, ações processadas juntas |
| slowmo | 슬로우모션 | **Câmera lenta** | mundo lento, tudo arrastado |
| delay | 입력 지연 | **Input lag** | delay nos comandos, resposta lenta, controle pesado |
| freeze | 멈춤 | **Travamento** | congelou, tela parada, não está respondendo |
| dropped | 씹힘·롤백 | **Ação perdida / rollback** | skill não saiu, item voltou, troca falhou |
| disconnect | 접속 끊김 | **Desconexão** | caí do jogo, DC, “A conexão com o servidor foi perdida” |
| noconnect | 접속 불가·무한 로딩 | **Não conecta / loading infinito** | não consigo logar, loading não termina |
| invisible | 안 보임·유령 개체 | **Invisível / entidade fantasma** | NPC sumido, personagem invisível, monstro morto ainda em pé |

Why: these are the words Brazilian players type and say. “Engasgos” (o jogo engasga) is the frame-level hitching; Brazilians also say “travadinhas”, but “travar/travamento” is kept for the freeze so the two symptoms never blur. “Rubber banding”, “input lag” and “loading infinito” are the forms Brazilian gamers actually search. “Avanço rápido” is the media-player term for fast-forward, which is exactly how the catch-up burst looks.

Rules for symptom names in prose:
- When the text refers to the symptom, use the name. Allowed inflections and verbs from the same stem: “engasgos”, “um engasgo”, “a imagem engasga”; “teleporte”, “o personagem teleporta”; “em câmera lenta”; “em avanço rápido”; “o travamento”, “a tela trava”; “desconexões”. Do not substitute synonyms in prose (no “stuttering”, “lag spike”, “freeze”, “DC” as the symptom name; those are aliases only).
- 멈칫 (one short hitch, not a symptom name) → “um engasgo”. 짧은 멈춤 → “uma pausa curta”.
- Korean uses 멈춤/멈추다 generically too (GC 멈춤, 서버가 멈춘다, 틱이 멈춘다). Only the on-screen symptom is “Travamento”. GC pause → “pausa do GC”; stop-the-world → “pausa stop-the-world”; a stopped server or tick → “o servidor para”, “o tick fica parado”, “paralisação” (the factor, 6.2). Do not write “o servidor travou” for a stall; that reads as the symptom or a crash. OS freezing an app (iOS freeze) → “congelamento”.
- Composite names in running text may split when grammar requires: “ações perdidas e rollbacks”, “não conecta ou fica em loading infinito”, “invisíveis ou entidades fantasma”. In lists, headings, chips and tables use the exact name.
- “Input lag” is the symptom; “latência” is the factor. “Travamento” is the symptom; “paralisação” is the factor. Do not mix them.
- “TCP 몰아치기” → “avanço rápido no TCP”.
- Symptom page title pattern: “{Nome} em jogos online: causas e quem resolve | Guia do Lag em Jogos”.

### 6.2 The four factors (`fx`)

| id | Korean | pt-BR name | `how` line |
|---|---|---|---|
| lat | 지연 | **Latência** | Os pacotes chegam atrasados |
| jit | 지터 | **Jitter** | Os pacotes chegam em intervalos irregulares |
| loss | 손실 | **Perda de pacotes** | Os pacotes nem chegam |
| stall | 정체 | **Paralisação** | Alguém parou de processar |

- 요인 → “fator”; 렉의 네 가지 요인 → “os quatro fatores do lag”. 게임의 대처 → “como os jogos lidam com isso”. 가리지 못하면 → “quando não dá para esconder”.
- 지연 in other senses: a generic delay → “atraso”; 입력 지연 → “Input lag” (symptom); 지연 보상 → “compensação de lag”; 지연 ACK → “ACK atrasado”; 복제 지연 → “atraso de replicação”; 꼬리 지연 → “latência de cauda”; 네트워크 지연 → “latência de rede”.
- Jitter: first mention per chapter where the Korean glosses it → “jitter (variação no intervalo de chegada dos pacotes)”.
- Loss: after the first mention in a paragraph “perda” alone is fine. The standalone key 손실 (factor name, sim labels) is always “Perda de pacotes”.
- Paralisação: “o servidor para”, “o tick fica parado”, “a thread para”. Gloss when helpful: “paralisação (o processamento para)”.

### 6.3 Layers and topics (`layers`, `extraLayers`)

층 → **camada** (“L3”, “camada 3 de 13”). 주제 (the 3 topics) → **tema**. 층·주제 → “camada/tema”. `L1`…`L13` stay.

| id | name | short (nav/badges) | side |
|---|---|---|---|
| client-game | Processo do jogo no cliente | Seu jogo | 내 쪽 → Do seu lado |
| client-os | SO e dispositivo do cliente | Seu PC/celular | Do seu lado |
| home | Rede doméstica | Wi-Fi/roteador | Do seu lado |
| isp | Conexão de internet | Operadora/exterior | 가는 길 → No caminho |
| dc-net | Equipamentos de rede do data center | Firewall/LB | 서버 쪽 → Do lado do servidor |
| nic | Placa de rede do servidor | NIC | Do lado do servidor |
| server-os | SO do servidor (kernel) | Kernel | Do lado do servidor |
| socket | Sockets e protocolos | TCP/UDP | 양쪽 끝 → Nas duas pontas |
| server-proc | Processo do jogo no servidor | Ticks/threads | Do lado do servidor |
| memory | Memória | GC/vazamentos | Do lado do servidor |
| disk | Disco | IOPS | Do lado do servidor |
| db | Banco de dados | BD | Do lado do servidor |
| infra | Arquitetura e operação de servidores | Arquitetura/operação | Do lado do servidor |
| sync (topic) | Design de sincronização | Design de sincronização | 설계 → Design |
| partial (topic) | Problemas que só afetam alguns | Só alguns | 범위 → Escopo |
| retrans (topic) | Causas-raiz da retransmissão TCP | Retransmissão TCP | 원인 → Causa |

Chapter titles (body `h2`/`h3`) for consistent cross-references. Headings that reuse a layer name must match the table above exactly.

| Korean | pt-BR |
|---|---|
| 렉은 네 가지 요인으로 만들어진다 | O lag nasce de quatro fatores |
| 패킷의 이동 경로: 내 손가락에서 서버의 DB까지 | O caminho do pacote: do seu dedo ao banco de dados do servidor |
| 렉 실험실 | Laboratório de lag |
| 증상 사전 | Catálogo de sintomas |
| 같은 핑, 다른 체감: 동기화 방식 | Mesmo ping, sensação diferente: modelos de sincronização |
| 한 명만 느릴 때, 한쪽만 이상할 때 | Quando só um jogador tem lag ou só um lado fica estranho |
| TCP 재전송: 왜 생기고, 왜 이렇게 느려지나 | Retransmissão TCP: por que acontece e por que atrasa tanto |
| 게임개발팀이 고칠 것, 인프라팀이 고칠 것 | O que a equipe de desenvolvimento corrige, o que a equipe de infraestrutura corrige |
| 클라이언트 OS와 기기 | SO e dispositivo do cliente |
| 집 네트워크: 와이파이·공유기·모바일망 | Rede doméstica: Wi-Fi, roteador e rede móvel |
| 인터넷 회선: 통신사망과 장거리 구간 | Conexão de internet: redes das operadoras e trechos de longa distância |
| 서버 네트워크 카드(NIC) | Placa de rede do servidor (NIC) |
| 소켓과 프로토콜: TCP, UDP, 소켓 옵션 | Sockets e protocolos: TCP, UDP e opções de socket |
| 서버 게임 프로세스: 틱과 스레드 | Processo do jogo no servidor: ticks e threads |
| 진단 도우미 | Assistente de diagnóstico |
| 관측으로 판정하기 | Diagnóstico pelo monitoramento |
| 판정 흐름 / 판정 신호표 / 판정 순서 | Fluxo de diagnóstico / Tabela de sinais / ordem de diagnóstico |
| 범위 → 시점 → 계층 | escopo → momento → camada |
| 그래프 모양으로 찾기 | Buscar pelo formato do gráfico |
| 숫자 읽는 법 | Como ler os números |
| 사례와 절차 | Casos e procedimentos |
| 상황별 절차 | Procedimentos por situação |
| 실제 장애 사례 | Incidentes reais |
| 패치 이후 렉 / 해외 국가 추가 | Lag depois de um patch / Lançamento em um novo país |
| 렉 제보 잘하는 법 | Como reportar lag do jeito certo |
| 용어 사전 | Glossário |
| 참고 문헌 / 장별 출처 | Referências / Fontes por capítulo |
| 목차 | Sumário |
| 증상별로 찾기 / 증상별 원인 | Buscar por sintoma / Causas por sintoma |
| 이 층에서 렉을 만드는 원인 | Causas de lag nesta camada |
| 시간 감각 | Noção de escala de tempo |
| 넘길 때 챙길 정보 | O que incluir ao repassar o caso |

동기화 → “sincronização” for the mechanism (“sincronização de estado”), “netcode” for the code and design area as players and devs say it. 동기화 방식 → “modelo de sincronização”.

### 6.4 Teams and owners

| Korean | pt-BR | Notes |
|---|---|---|
| 게임개발팀 (`game`) | **Equipe de desenvolvimento** | the studio team that owns client and server code; in prose “a equipe de desenvolvimento do jogo” is fine once for clarity |
| 인프라팀 (`infra`) | **Equipe de infraestrutura** | network, servers/OS, database hosts |
| 외부 (`ext`, team and owner) | **Externo** | players’ environment, ISPs, cloud providers |
| 클라이언트 개발 (`cli`) / short 클라이언트 | Desenvolvimento do cliente / Cliente | |
| 서버 개발 (`srv`) / short 서버 | Desenvolvimento do servidor / Servidor | |
| 네트워크 인프라 (`net`) / short 네트워크 | Infraestrutura de rede / Rede | |
| 서버 인프라 (`sys`) / short 서버 장비·OS | Infraestrutura de servidores / Servidores/SO | |
| DB 인프라 (`dba`) / short DB 장비 | Infraestrutura de banco de dados / Servidores de BD | |
| short 유저·통신사·클라우드 | Jogadores/operadoras/nuvem | |
| 담당 (label, column) | Responsável | 담당 팀 → equipe responsável; 해결 담당 → quem resolve |
| 주 담당 | Responsável principal | label |
| 함께 | Também envolvidos | label |
| {팀} 할 일 | O que fazer ({0}) | “O que fazer (Equipe de desenvolvimento)” |
| 담당 코드 | código de responsável | table header 코드 → Código |
| 누가 고치나 | Quem resolve | |
| 에스컬레이션 | escalonamento para outra equipe / acionar | avoid bare “escalonamento” (taken by CPU scheduling) |
| 안내 (to players) / 요청 (to providers) / 우회 | orientar os jogadores / solicitar ao provedor / contornar (workaround) | |
| team·owner joiner `{0}·{1}` | `{1} ({0})` | “Desenvolvimento do servidor (Equipe de desenvolvimento)” |
| sentence joiner `{0}. {1}` | `{0}. {1}` | |
| 인프라팀(시스템) | equipe de infraestrutura (servidores/SO) | |

### 6.5 Who / when (`who`, `when`)

| who | pt-BR | when | pt-BR |
|---|---|---|---|
| me 나만 | Só eu | always 항상 | Sempre |
| home 같은 집 | Mesma casa | peak 저녁 피크 시간 | Horário de pico à noite |
| region 특정 지역·통신사 | Região ou operadora específica | event 사람이 몰릴 때 | Quando junta muita gente |
| zone 특정 장소·채널 | Local ou canal específico | login 접속·점검 직후 | Logo após login ou manutenção |
| server 서버 전체 | Servidor inteiro | idle 가만히 있다가 | Depois de ficar parado |
| feature 특정 기능만 | Só um recurso específico | random 가끔 무작위로 | Aleatoriamente, de vez em quando |
| onechar 특정 캐릭터만 이상해 보임 | Só um personagem parece estranho | periodic 일정한 주기로 | Em intervalos regulares |
| oneclient 같은 PC의 한쪽 클라만 | Só um dos clientes no mesmo PC | uptime 오래 켜 둘수록 | Quanto mais tempo ligado |
| | | moving 이동 중·지역 전환 때 | Em movimento ou ao trocar de mapa |
| | | action 특정 행동을 할 때 | Ao fazer ações específicas |

Labels: 누가 겪나 → “Quem é afetado”, 누가 → “Quem”, 언제 → “Quando”, 모양 (symptom shape in triage/report) → “Como aparece”.

### 6.6 Graph shapes (`sigs`)

그래프 모양 → **formato do gráfico**. 그래프에서는 → “No gráfico”. {0} 모양의 그래프 → “Gráfico no formato “{0}””.

| id | Korean | pt-BR name |
|---|---|---|
| periodic | 일정 주기로 튐 | Picos em intervalos regulares |
| random | 가끔 무작위로 튐 | Picos aleatórios |
| step | 어느 순간부터 계단처럼 올라감 | Degrau a partir de um momento |
| ramp | 서서히 오름 | Subida lenta |
| sawtooth | 서서히 오르다 뚝 떨어짐 | Dente de serra |
| peak | 특정 시간대에만 높음 | Alto só em certos horários |
| load | 인원·부하를 따라 오름 | Sobe com a carga |
| ceiling | 한도에 닿아 평평해짐 | Achata ao bater no limite |
| high | 처음부터 늘 높음 | Sempre alto desde o início |
| outlier | 일부만 높음 | Alto só em alguns |
| gap | 끊겼다가 몰아서 | Lacuna e depois tudo junto |
| drop | 연결이 한꺼번에 끊김 | Queda de conexões em massa |
| surge | 접속·점검 직후 폭증 | Pico logo após abrir ou manutenção |

튀다 / 솟다 (graph) → “subir”, “disparar”, “dar pico”. 스파이크 → “pico” (“picos de ping”, “pico de latência”); “spike” only in aliases/SEO.

### 6.7 Card labels and check-by (`chkBy`)

| Korean | pt-BR |
|---|---|
| 원인 (label, table header, side) / 근본 원인 / 원인 ID | Causa / causa-raiz / ID da causa |
| 원인 카드 / 원인 항목 | card da causa / verbete da causa |
| 왜 → 그러면 → 화면에서는 | Por quê → Efeito → Na tela |
| 증상 / 요인 | Sintomas / Fatores |
| 누가 겪나 / 언제 | Quem é afetado / Quando |
| 수치 감각 | Números de referência |
| 확인 방법 | Como confirmar |
| 확인할 곳 / 이러면 맞음 / 이러면 아님 / 확인 수단 | Onde olhar / Confirma se / Descarta se / Como verificar |
| 더 알아보기 | Saiba mais |
| 실제 사례 / 실제 장애 사례 | Casos reais / Incidentes reais |
| 무슨 일 / 배울 점 / 관련 원인 / 원문 | O que aconteceu / Lições / Causas relacionadas / Fonte original |
| 출처 / 참고 문헌 / 장별 출처 | Fontes / Referências / Fontes por capítulo |
| 함께 보면 좋은 원인 | Veja também |
| 다른 말 | Também chamado de |
| 단서 | Pista |
| 링크 복사 / 복사됨 | Copiar link / Copiado |
| 관련 장 → | Capítulo relacionado → |
| 직접 해보기 / 이렇게 해보세요 / 상황 불러오기 | Experimente / Tente isto / Carregar cenário |
| 좋음 / 주의 / 나쁨 | Bom / Atenção / Ruim |
| 실험 (a sim) / 시뮬레이션 | simulação |
| 장 / 절 / 층 / 주제 | capítulo / seção / camada / tema |
| 준비 중입니다. | Em breve. |
| 먼저 부를 곳 | Quem acionar primeiro: |
| 확인 신호 | Sinais para verificar: |

| by | Korean (data) | pt-BR (data) | Short form (ui: 인프라 도구 / 게임 로그·지표 / 유저 쪽) |
|---|---|---|---|
| ops | 인프라 도구로 확인(게임 코드 불필요) | Ferramentas de infra (sem precisar do código do jogo) | Ferramentas de infra |
| code | 게임 서버·클라이언트의 로그·지표가 필요 | Exige logs e métricas do servidor ou do cliente do jogo | Logs/métricas do jogo |
| user | 유저 쪽 환경에서 확인 | Verificação no ambiente do jogador | Lado do jogador |

### 6.8 Game and netcode terms

| Korean | pt-BR | Note |
|---|---|---|
| 렉 | lag (o lag) | “estar com lag”, “dar lag”, “lag no servidor”; “pico de lag” for a momentary jump. Never “lagar/laggar” in prose |
| 핑 / 왕복 / 왕복 시간 | ping / ida e volta / tempo de ida e volta (RTT) | 핑이 높다 → ping alto; 핑이 튄다 → pico de ping; 핑이 들쭉날쭉 → ping oscilando; 게임 안 핑 → ping exibido no jogo; 게임 밖에서 잰 핑 → ping medido fora do jogo |
| 틱 / 틱레이트 / 틱 간격·주기 | tick / tick rate / intervalo entre ticks | 20틱 서버 → servidor de 20 ticks |
| 틱 예산 / 틱 예산 초과 | orçamento do tick / estouro do tick | “o tick estoura o orçamento” |
| 게임 루프 / 메인 스레드 | game loop / thread principal | 한 바퀴 → uma volta do loop, um frame |
| 프레임 / 프레임 타임 / 프레임 드랍 / FPS | frame (o frame) / frame time / queda de FPS / FPS | never “quadro” except in product names |
| 스냅샷 / 델타 압축 | snapshot / compressão delta | |
| 상태 업데이트 / 게임 상태 | atualização de estado / estado do jogo | 세계 (what the server simulates) → estado do jogo |
| 서버의 실제 상태 | o estado real no servidor | |
| 보간 / 보간 버퍼 | interpolação / buffer de interpolação | |
| 외삽 | extrapolação (dead reckoning) | |
| 예측 / 클라이언트 예측 | predição / predição no cliente | |
| 서버 보정 | reconciliação com o servidor | |
| 되감기 / 되감기(지연 보상) / 지연 보상 | voltar no tempo (rewind) / voltar no tempo (compensação de lag) / compensação de lag | |
| 권위 서버 / 서버 권위 / 클라이언트 권위 | servidor autoritativo / autoridade do servidor / autoridade do cliente | |
| 요청-응답 | requisição-resposta | |
| 상태 동기화+보간 / 명령 동기화 / 이벤트 예약 | sincronização de estado + interpolação / sincronização de comandos / eventos agendados | |
| 락스텝 | lockstep (lockstep determinístico) | |
| 롤백 넷코드 / 롤백 (DB) | netcode de rollback / rollback | |
| 넷코드 / 넷그래프 | netcode / net graph | |
| 선입력 / 선입력 허용 시간 | buffer de comandos / janela do buffer de comandos | distinct from the server-side input buffer |
| 서버 입력 버퍼 | buffer de input no servidor | |
| 선연출 | feedback no cliente | animations/effects played before the server confirms |
| 판정 (general) / 공격 판정 / 이동 검증 | decisão do servidor / registro de acerto (hitreg) / validação de movimento | |
| 판정 구간 / 허용 시간 / 패링 판정 | janela de tempo / tempo de tolerância / janela de parry | |
| 스킬 씹힘 | skill não saiu | |
| 시야 / 시야 계산 / AOI | campo de visão / cálculo de visibilidade (AOI) / área de interesse (AOI) | |
| 격자(그리드) / 셀 | grade (grid) / célula | |
| 브로드캐스트 | broadcast | |
| 개체 / 개체 ID / 등장·퇴장 알림 | entidade / ID da entidade / mensagens de spawn e despawn | |
| 제어 권한 (monster) | autoridade (ownership) | |
| 채널 / 존 / 필드 / 페이즈 | canal / zona / mapa / phasing | 지역 이동, 지역 전환, 존 이동 → troca de mapa (zona) |
| 월드 보스 / 공성전 / 레이드 / 던전 | world boss / guerra de castelo (siege) / raid / dungeon | |
| 파티 / 파티원 / 방장 | party / membros da party / host | |
| 몬스터 / 캐릭터 / 캐릭터 모델 / 이름표 | monstro (mob in aliases) / personagem / modelo do personagem / nome acima do personagem | |
| 스킬 / 스킬 시전 / 쿨다운 | skill / cast da skill / cooldown | |
| 데미지 / 이펙트 | dano / efeitos | |
| 아이템 / 인벤토리 / 거래 | item / inventário / troca | |
| 로딩 / 로딩바 / 입장 화면 | carregamento (loading) / barra de carregamento / tela de entrada | “loading infinito” only in the symptom name and aliases |
| 로그인 / 로그인 서버 / 로그인 대기열 / 대기 순번 | login / servidor de login / fila de login / posição na fila | |
| 재접속 / 자동 재접속 / 재연결 유예 시간 | reconexão / reconexão automática / tempo de tolerância para reconexão | |
| 점검 / 패치 / 배포 | manutenção / patch / deploy | 점검 직후 → logo após a manutenção |
| 이벤트 | evento | |
| 동시 접속 / 인원 | jogadores simultâneos (CCU) / número de jogadores | |
| 크래시 / 강제 종료 | crash / encerramento forçado | players: “o jogo fechou sozinho” |
| 치팅 / 게임 해킹 | trapaça / hacks (cheats) | |
| 격투 게임 / 경쟁 슈팅 게임 | jogos de luta / shooters competitivos | |
| 리슨 서버 | listen server | |
| 게임 가속기 | redutor de ping (VPN para jogos) | how Brazilian players call these tools |
| 안티치트 / 오버레이 | anti-cheat / overlay | |
| 셰이더 컴파일 / 셰이더 캐시 | compilação de shaders / cache de shaders | |
| 에셋 / 에셋 로딩 / 지연 로딩 | asset / carregamento de assets / lazy loading | |
| 비신뢰(unreliable) 채널 / 신뢰성 UDP | canal não confiável (unreliable) / UDP confiável | |
| 게임 시간 / 게임 속도 | tempo do jogo / velocidade do jogo | |
| 유저 | jogador | “usuário” only in the OS/software sense (espaço de usuário) |

### 6.9 Player side, home, ISP and network

| Korean | pt-BR | Note |
|---|---|---|
| 패킷 / 상태 업데이트 / 메시지 | pacote / atualização de estado / mensagem | |
| 회선 | conexão (player’s internet); link, circuito (data center, backbone) | 회선이 흔들린다 → a conexão está com jitter alto; 회선이 끊긴다 → a conexão cai |
| 통신사 / 통신사망 | operadora (provedor de internet) / rede da operadora | mobile: operadora de celular |
| 공유기 | roteador | never “router” |
| 와이파이 / 유선 / 무선 구간 | Wi-Fi / cabo (conexão cabeada) / trecho sem fio | |
| 무선 채널(주파수 대역) / 전파 간섭 | canal sem fio (faixa de frequência) / interferência | |
| 모바일망 / LTE·5G / 기지국 / 핸드오버 | rede móvel / LTE/5G / antena (estação rádio base) / handover | |
| 해외 / 해외 서버 | exterior / servidor no exterior | |
| 해저 케이블 / 광케이블 | cabo submarino / fibra óptica | |
| 경로 / 우회 경로 / 병목 구간 | rota / rota alternativa (desvio) / gargalo | ECMP: caminho |
| 피어링 / BGP | peering / BGP | Brazilian IXPs are “PTT” (IX.br); use only where the source mentions an exchange point |
| 대역폭 / 처리량 | largura de banda / vazão (throughput) | |
| 대기열 / 대기열에 쌓이다 / 대기열 넘침 | fila / acumular na fila / estouro de fila | NIC queues: fila (RX/TX) |
| 버퍼 | buffer | |
| 혼잡 | congestionamento | “conexão congestionada” |
| 버퍼블로트 / SQM / QoS | bufferbloat / SQM / QoS | |
| NAT / NAT 테이블 / CGNAT / SNAT / NAT 게이트웨이 | NAT / tabela NAT / CGNAT / SNAT / gateway NAT | |
| 공인 IP / 사설망 | IP público / rede privada | |
| 방화벽 / 세션 테이블 / conntrack 테이블 / 연결 추적 | firewall / tabela de sessões / tabela do conntrack / rastreamento de conexões (conntrack) | 연결을 추적한다 → rastreia a conexão; 추적 항목이 만료된다 → a entrada de rastreamento expira |
| 로드밸런서 / 헬스체크 | load balancer / health check | |
| 스위치 / 라우터 / LAG | switch / roteador / LAG | |
| DDoS 방어 / 스크러빙 센터 / 오탐 | proteção contra DDoS / centro de scrubbing / falso positivo | |
| 데이터센터, IDC | data center | |
| 마이크로버스트 / 버스트 / 송신 버스트 | microburst / burst / burst de envio | |
| 유휴 타임아웃 / 유휴 연결 / 장비별 유휴 타임아웃 | timeout de inatividade / conexão ociosa / timeouts de inatividade dos equipamentos | |
| 조용히 버림(silent drop) | descarte silencioso (silent drop) | |
| 보안 그룹 / 네트워크 ACL / VPC | grupo de segurança / ACL de rede / VPC | |
| 클라우드 사업자 / 인스턴스 / 호스트 점검 | provedor de nuvem / instância / manutenção do host | |
| 라이브 마이그레이션 | live migration | |
| 노이지 네이버 | noisy neighbor | |
| 링 버퍼 / 슬롯 | ring buffer / slot | |
| 인터럽트 / 인터럽트 병합 | interrupção / coalescência de interrupções (interrupt coalescing) | |
| 수신 큐 / 송신 대기열 | fila de recepção (RX) / fila de transmissão (TX) | |
| RSS / PPS / 클라우드 PPS 한도 | RSS / PPS / limite de PPS da nuvem | |
| 단편화 / 프래그먼트 | fragmentação / fragmento | |
| MTU / MSS / 최대 세그먼트 크기 / MTU 블랙홀 | MTU / MSS / tamanho máximo de segmento / black hole de MTU | |
| 불량 케이블 / 광모듈 | cabo com defeito / transceptor óptico | |
| ICMP 응답을 제한한다 | limita as respostas ICMP | |
| 합성 측정 | monitoramento sintético | |
| 저궤도 위성 인터넷 | internet via satélite de órbita baixa (LEO) | |
| 연결 마이그레이션 (QUIC) | migração de conexão | |

### 6.10 Sockets and TCP

| Korean | pt-BR | Note |
|---|---|---|
| 재전송 / 재전송 타이머 / RTO / 재전송률 | retransmissão (verb: retransmitir, reenviar) / timer de retransmissão / RTO / taxa de retransmissão | 손실로 판단해 재전송한다 → considera o pacote perdido e retransmite; RTO가 만료된다 → o RTO expira |
| 불필요한 재전송 | retransmissão espúria | |
| 빠른 재전송 / 재전송 백오프 | fast retransmit (retransmissão rápida) / backoff exponencial | |
| 순서 보장 / “보낸 순서대로만 넘겨줌” | entrega em ordem / “só entrega os dados na ordem em que foram enviados” | |
| 보장한다 | garante | |
| 시퀀스 번호 | número de sequência | |
| HOL 블로킹 | head-of-line blocking (HOL) | |
| thin stream | thin stream | |
| TLP / 마지막 패킷들의 손실(tail loss) | TLP (tail loss probe) / perda dos últimos pacotes (tail loss) | |
| 선택적 ACK(SACK) / 중간에 빠진 부분 | ACK seletivo (SACK) / trecho faltando | |
| ACK(수신 확인) / 지연 ACK | ACK (confirmação de recebimento) / ACK atrasado (delayed ACK) | |
| 아직 ACK를 받지 못한 패킷(in-flight) | pacotes ainda sem ACK (in flight) | |
| 혼잡 윈도우 / 수신 윈도우 / 윈도우 / 윈도우 크기·스케일 | janela de congestionamento (cwnd) / janela de recepção (rwnd) / janela / tamanho da janela, window scaling | |
| 제로 윈도우 / 제로 윈도우 프로브 | janela zero (zero window) / zero window probe | |
| 수신 윈도우를 줄여 송신을 멈추게 함 | reduz a janela de recepção para parar o envio | |
| 전송량 축소 | redução da taxa de envio | |
| Nagle 알고리즘 / TCP_NODELAY / keepalive / RST | algoritmo de Nagle / TCP_NODELAY / keepalive / RST | |
| 소켓 버퍼 / 송신·수신 버퍼 / 전송 대기 메모리 | buffer de socket / buffer de envio e de recepção / memória de envio pendente | |
| 폴리서 / 셰이퍼 / 페이싱 / ECN | policer / shaper / pacing / ECN | |
| 블로킹 I/O / 비동기 I/O | I/O bloqueante / I/O assíncrono | |
| 하트비트 / 하트비트(연결 유지 신호) | heartbeat / heartbeat (sinal para manter a conexão) | |
| 타임아웃 | timeout | |

### 6.11 Server, OS, memory, disk, database, operations

| Korean | pt-BR | Note |
|---|---|---|
| 서버 / 게임 서버 / 게임 코드 / 클라이언트 | servidor / servidor do jogo / código do jogo / cliente | |
| 워커 / 워커 스레드 / 스레드 풀 / 워커 스레드 풀 | worker / worker thread / pool de threads / pool de worker threads | |
| 락 / 잠금 / 잠금 경합 / 데드락 | lock / lock / contenção de lock / deadlock | 락을 잡다 → pegar (segurar) o lock |
| 점유한다 | ocupa, segura (a thread, a conexão, a porta, a CPU) | |
| 동기 호출 / 호출 체인 | chamada síncrona (bloqueante) / cadeia de chamadas | |
| starvation | starvation (inanição) | |
| 워치독 / 덤프 | watchdog / dump | |
| 무한 루프 / 길찾기 / 직렬화 | loop infinito / pathfinding / serialização | |
| 커널 / 운영체제 | kernel / sistema operacional (SO) | |
| 접속 대기열(backlog) | fila de conexões (backlog) | |
| 파일 디스크립터(fd) | descritor de arquivo (fd) | |
| 스케줄러 / 스케줄링 / 스케줄링 대기 / 런큐 | escalonador (scheduler) / escalonamento / esperando CPU / fila de execução (run queue) | CPU를 배정받지 못한다 → não recebe tempo de CPU |
| 타임 슬라이스 | fatia de tempo (time slice) | |
| 컨텍스트 스위칭 | troca de contexto | |
| CPU 스틸 / CPU 스로틀링 / 주기 / 할당량 | CPU steal / throttling de CPU / período (CFS period) / cota (quota) | |
| 발열 스로틀링 | thermal throttling | |
| 절전 상태 / 절전 해제(wake-up) | modo de economia de energia / despertar (wake-up) | |
| 일시 정지(suspend) / 동결(freeze) (OS on apps) | suspensão (suspend) / congelamento (freeze) | never “Travamento” here |
| 백그라운드 앱 / 백그라운드 창 / 최소화 | app em segundo plano / janela em segundo plano / minimizada | |
| 타이머 해상도 | resolução do timer | |
| 가변 주사율 / 주사율 / 화면 찢어짐 | taxa de atualização variável (VRR) / taxa de atualização / tearing | |
| 시간 동기화(NTP) / 시계 점프 / 벽시계 / 단조 시계 | sincronização de horário (NTP) / salto de relógio / wall clock / monotonic clock | |
| 임시 포트 고갈 | esgotamento de portas efêmeras | |
| 가상 머신 / 호스트 | máquina virtual (VM) / host | |
| 메모리 / 힙 / 할당 | memória (RAM) / heap / alocação | |
| 가비지 / GC / GC가 돈다 | lixo (garbage) / GC / o GC roda | 수집·회수 → coletar, recuperar |
| GC 멈춤 / 전체 멈춤 / Full GC / Young·Old 영역 | pausa do GC / pausa stop-the-world / Full GC / geração young/old | |
| 메모리 누수 / 단편화 | vazamento de memória / fragmentação | |
| 스왑 / OOM 킬러 | swap / OOM killer | |
| 캐시 미스 / 메모리 계층 | cache miss / hierarquia de memória | |
| 디스크, 스토리지 | disco, storage | |
| 동기 쓰기 / fsync(확실히 저장) | escrita síncrona / fsync (gravação garantida no disco) | |
| IOPS / 처리량 한도 / 버스트 크레딧 / 적립량 | IOPS / limite de vazão / créditos de burst / saldo | |
| 페이지 캐시 / 디스크에 기록한다 | page cache / gravar no disco | |
| 백업 / 스냅숏 | backup / snapshot | |
| 헤드·플래터 | cabeça de leitura e prato | |
| 데이터베이스 / 쿼리 | banco de dados (BD) / query | “o banco” is fine in prose after the first mention |
| 커넥션 풀 / 커넥션 풀 고갈 | pool de conexões / esgotamento do pool de conexões | |
| 인덱스 / 컬럼 / 행 / 테이블 | índice / coluna / linha / tabela | |
| 스키마 변경(DDL) | alteração de schema (DDL) | |
| 풀 스캔 / 실행 계획 | full scan / plano de execução | |
| 행 잠금 / 핫 로우 / 잠금 에스컬레이션 | lock de linha / hot row / lock escalation | first mention: “hot row (linha que todos tentam alterar ao mesmo tempo)” |
| 트랜잭션 / 롤백 / 언두 로그 / MVCC | transação / rollback / undo log / MVCC | |
| 복제 / 복제본 / 주 DB / 복제 지연 | replicação / réplica / BD primário / atraso de replicação | |
| 체크포인트 / 로그 플러시 | checkpoint / flush de log | |
| 장애 전환 | failover | |
| 캐시 / 캐시 서버 / 콜드 캐시 / 캐시 스탬피드 | cache / servidor de cache / cache frio / cache stampede | |
| 서버 구성 / 게이트웨이 / 부가 서버 | arquitetura de servidores / gateway / servidor auxiliar | |
| 연쇄 장애 / 서킷 브레이커 | falha em cascata / circuit breaker | |
| 재시도 폭풍 / 로그인 폭주 / 접속 폭주 | tempestade de retries (retry storm) / avalanche de logins / pico de conexões | |
| 확장 / 오토스케일링 | escala (scale-out) / autoscaling | 늘어나는 데 시간이 걸림 → subir novos servidores leva tempo |
| 서비스 디스커버리 / 외부 서비스 의존 | service discovery / dependência externa | |
| 장애 / 장애가 난다 / 장애 기록 | incidente, falha, queda / falha, cai / registro de incidente | |
| 사후 분석 | postmortem | |
| 크론 작업 | cron job | |
| 모니터링 / 경보 / 지표 / 로그 / 그래프 | monitoramento / alerta / métrica / log / gráfico | |
| 이용률 | utilização | |
| 평균 / 중앙값 / 백분위수 / p99 / 꼬리 지연 | média / mediana / percentil / p99 / latência de cauda | |
| 샘플링 / 집계 간격 | amostragem / intervalo de agregação | |
| 스파이크 / 패턴 | pico / padrão | |
| 무작위로 분산 | espalhar aleatoriamente | |
| 간주한다 / 오인한다 / 감지한다 | considera / toma por engano / detecta | |
| 인프라 도구 | ferramentas de infra | |
| 쏠림 경보 | alertas de desbalanceamento | |
| 거점 | ponto de presença (PoP) | |
| TLS 인증서 / GeoIP | certificado TLS / GeoIP | |

## 7. Korean constructions and how to render them

- **Nominal Korean endings** (…함, …봄, …임, …쪽) → short statement or infinitive (see `chk`). Never chains like “é possível observar que …”.
- **Topic-first sentences** (“서버 GC는, …”) → normal Portuguese order; put the subject or the condition first (“Quando o GC roda no servidor, …”).
- **Long attributive chains** (“…하는 …인 …의 X”) → a relative clause or two sentences. One “que” clause per sentence is plenty.
- **Conditions** “~하면” → “Se …, …” / “Quando …, …”. Vary them; do not start five sentences in a row with “Se”.
- **“~을 봅니다”** (look at X as a diagnostic step) → “Verifique X, Y e Z.” / “Suspeite de X e Y.” / “Os suspeitos são X e Y.”
- **“~때문에”** → “por causa de”, “por”, “porque”. Prefer a verb to a noun chain (“a fila cresce” over “o crescimento da fila”).
- **“A보다 B를 먼저”** (priority) → “verifique primeiro B; A vem depois”. Avoid the “not A but B” shape.
- **Parenthetical glosses** from TERMS.md (“지터(도착 간격의 흔들림)”) → keep as parentheses with a space before.
- **Hedging** 대개 / 흔히 / 종종 / 가끔 → em geral / com frequência / muitas vezes / de vez em quando.
- **Onomatopoeia** (멈칫 멈칫, 휙, 파파파팍) → plain description (“para, anda, para”, “de repente”, “tudo de uma vez”). No comic-style sounds.
- **Passive voice**: prefer active or the Brazilian “se” passive sparingly; avoid stacked “é feito/é realizado”.
- **Gerund**: Brazilian progressive with the gerund is correct and natural (“o servidor está processando”); never “está a processar”.
- **Korean facts stay Korean**: Korean ISP names, cities, KRW prices and institutions stay as facts (Seul, Tóquio, KT, SK Broadband, LG U+). Do not replace them with Brazilian examples (no Vivo/Claro substitutions).

## 8. Brazilian vs European Portuguese (never use the right-hand column)

| Brazil (use) | Portugal (never) |
|---|---|
| tela | ecrã |
| arquivo | ficheiro |
| usuário | utilizador |
| mouse | rato |
| celular | telemóvel |
| equipe (time in speech) | equipa |
| registro, registrar | registo, registar |
| controle | controlo |
| fato | facto |
| ação, direção, ótimo | acção, direcção, óptimo |
| recepção | receção |
| contato | contacto |
| banco de dados | base de dados |
| roteador | router |
| senha | palavra-passe |
| baixar, download | descarregar |
| conectar, ligar (power) | ligar (connect) |
| está carregando | está a carregar |
| você | tu (with verb in 2nd person) |
| trem, ônibus (if ever needed) | comboio, autocarro |

Also Brazilian accent marks: “econômico”, “eletrônico”, “gênero” (never “económico”, “electrónico”, “género”).

## 9. SEO notes (Brazil)

Phrases people in Brazil actually type when a game lags or when they investigate server-side lag:

1. o que causa lag em jogos online
2. por que meu jogo está com lag
3. lag mesmo com internet boa
4. ping alto
5. ping oscilando
6. perda de pacotes / como resolver perda de pacotes
7. packet loss
8. rubber banding
9. jogo travando / jogo engasgando
10. stuttering em jogos
11. input lag
12. lag no servidor
13. jogo desconectando sozinho / caindo do servidor
14. loading infinito
15. ping alto à noite
16. lag no Wi-Fi
17. jitter alto
18. tick rate / netcode
19. bufferbloat
20. lag em MMO

How they are used:
- Site name “Guia do Lag em Jogos” carries “lag em jogos”. Main title: “Guia do Lag em Jogos: o que causa lag em jogos online e quem resolve” matches (1) and states the unique angle (who fixes it).
- Meta description opens with the question players ask (“O que faz a imagem engasgar, os personagens teleportarem e a conexão cair em jogos online?”) and contains “causas do lag”, “camada por camada”, “MMO”.
- Symptom names are the words players search (Engasgos, Teleporte, Rubber banding, Input lag, Travamento, Desconexão, Não conecta / loading infinito); the aliases add travadinhas, stuttering, queda de FPS, DC, delay. Symptom pages: “{Nome} em jogos online: causas e quem resolve | Guia do Lag em Jogos”, so “Rubber banding em jogos online”, “Input lag em jogos online” line up with (8) and (11).
- Cause pages: “{causa} ({English name}): causa de lag | Guia do Lag em Jogos”.
- Keywords meta: causas de lag, lag em jogos, ping alto, engasgos, teleporte, rubber banding, input lag, desconexão, lag no servidor, netcode, retransmissão TCP, perda de pacotes, equipe de desenvolvimento, equipe de infraestrutura.
- Spelling for search consistency: “jogos online” (not “jogos on-line”), “Wi-Fi”, “ping alto”, “perda de pacotes”, “input lag”, “rubber banding” (two words).
- Never stack keywords; each phrase must read as part of a sentence or a natural title.

## 10. Shared keys (already fixed in phase 1; reuse exactly)

These Korean strings exist as whole entries both in the phase-1 groups and in other groups. The build keeps only one pt-BR string per Korean key, so use these verbatim wherever the whole entry is identical, even if the context feels slightly different.

| Korean key | pt-BR | Also appears in |
|---|---|---|
| 뚝뚝 끊김 / 순간이동 / 고무줄 / 몰아치기 / 슬로우모션 / 입력 지연 / 멈춤 / 씹힘·롤백 / 접속 끊김 / 접속 불가·무한 로딩 | the symptom names of 6.1 | sim-arch, sim-lab, sim-oneslow, sim-gc, sim-sndbuf, sim-nagle (the playback-speed option “멈춤” is also “Travamento”; the key is shared) |
| 지연 / 지터 / 손실 / 패킷 손실 | Latência / Jitter / Perda de pacotes / Perda de pacotes | sim-sndbuf, sim-bloat, sim-oneslow, sim-syncmodels, sim-distance, sim-lab |
| 클라이언트 / 서버 / 네트워크 | Cliente / Servidor / Rede | many sims |
| 좋음 / 주의 / 나쁨 | Bom / Atenção / Ruim | sim-bloat, sim-ladder, body-judge, body-retrans |
| " 초" (after a number) | " s" | sim-disk |
| 범위 | Escopo | ui-app (filter label), site (owners table) |
| 원인 | Causa | site (case field), data (topic side) |
| 담당 / 주 담당 / 팀 | Responsável / Responsável principal / Equipe | body-owners, ui-app |
| 요인 / 언제 | Fatores / Quando | ui-app |
| 확인할 곳 / 이러면 맞음 / 이러면 아님 / 확인 수단 | Onde olhar / Confirma se / Descarta se / Como verificar | ui-app |
| 수치 감각 / 더 알아보기 / 실제 사례 / 출처 | Números de referência / Saiba mais / Casos reais / Fontes | ui-app |
| 무슨 일 / 배울 점 | O que aconteceu / Lições | ui-app |
| 상황별 절차 / 실제 장애 사례 / 용어 사전 / 참고 문헌 / 목차 | Procedimentos por situação / Incidentes reais / Glossário / Referências / Sumário | body-cases, body-glossary, body-refs, body-shell |
| 관측으로 판정하기 | Diagnóstico pelo monitoramento | body-judge |
| TCP 재전송 | Retransmissão TCP | data (topic short), site (keywords) |
| 설계 | Design | sim-windows |
| 디스크 | Disco | sim-disk |
| layer names (클라이언트 게임 프로세스, 데이터센터 네트워크 장비, 서버 네트워크 카드, 서버 OS (커널), 메모리, 디스크, 데이터베이스, 서버 구성과 운영, 일부에게만 생기는 문제, TCP 재전송의 근본 원인) | see 6.3 | body-l-* headings, body-partial, body-retrans |
| the five owner descriptions (게임 클라이언트 코드: …, 게임 서버 코드: …, 회선과 IDC …, 서버 장비·클라우드 …, DB 서버·스토리지 …) | copy from `src/i18n/pt-BR/data.json` (`owners/*/desc`) | body-owners |
| 같은 데이터센터 서버끼리 왕복 | Ida e volta entre servidores do mesmo data center | sim-ladder |
| glossary terms used as cause titles (타이머 해상도, 복제 지연, 캐시 스탬피드, 연쇄 장애, 메모리 누수, 스왑, 캐시 미스, OOM 킬러, 데드락) | Resolução do timer, Atraso de replicação, Cache stampede, Falha em cascata, Vazamento de memória, Swap, Cache miss, OOM killer, Deadlock | causes-* |
| other glossary terms reused as sim labels (핑, 틱, 틱레이트, 보간, 보간 버퍼, 클라이언트 예측, 지연 보상, 락스텝, 선연출, 타임아웃, 방화벽, 로드밸런서, 게이트웨이, 캐시, 링 버퍼, 버스트 크레딧, 롤백, 이용률, 발열 스로틀링, 재전송률, 불필요한 재전송, 집계 간격) | as in `src/i18n/pt-BR/glossary.json` | sim-* |

## 11. Checklist before `fill`

- Placeholders `{0}` … all present; HTML tags identical in number and attributes; `href`, `id`, `class`, `data-*` untouched; `aria-label`, `title`, `alt` translated.
- Symptom names exactly as in 6.1; factor names as in 6.2; layer names as in 6.3; team names as in 6.4.
- Decimal comma, thousands period, space before units, no space before %, en dash in ranges.
- No “—”, no spaced “ – ”, no “não é A, mas/e sim B”.
- Curly quotes “…”; no ASCII `"` in attribute strings.
- No European Portuguese forms (section 8).
- Run `node tools/i18n.cjs check pt-BR --warn` and `--conflicts`; number warnings are fine only where a Korean number word became digits or words.

## Additional terms (added during translation)

Translators of later phases: add a row here when you fix a term that is not covered above, so the others reuse it.

| Korean | pt-BR | Note |
|---|---|---|
