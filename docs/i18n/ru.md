# Russian (ru) terminology and style guide

Read this before translating anything into Russian. It fixes the site name, the register, typography, and every term that must be used the same way in all groups. It follows `docs/I18N_GUIDE.md` (read that first) and `docs/TERMS.md` (Korean standard terms). The audience is the Russian-speaking game industry: game designers, artists, QA, producers, plus game server/client programmers and SRE/infra engineers. Write as a Russian senior engineer would write for non-engineer colleagues: plain, precise, industry wording, no calques, no machine-translation tone, no Korean word order.

Already translated with these rules (use them as examples): `data`, `glossary`, `meta`, `ui-kit`, `site`.

**Identical Korean strings share one translation.** The build keeps one Russian string per Korean key, and `node tools/i18n.cjs check ru` reports "서로 다른 번역" (conflicts) when the same Korean text is translated differently in two groups. Before translating a short label, search the already filled files (`grep -F '"ko":"멈춤"' src/i18n/ru/*.json`) and reuse the existing `t`. The appendix at the end lists the shared short strings.

---

## 1. Site name

| | Russian |
|---|---|
| Site name (Korean 게임 렉 백서, English Game Lag White Paper) | **Анатомия игровых лагов** |
| Full title (`build.py` title) | Анатомия игровых лагов: причины лагов в онлайн-играх и кто их устраняет |
| Page title suffix (`… \| 게임 렉 백서`) | `… \| Анатомия игровых лагов` |
| English alternate name (JSON-LD, llms.txt) | stays `Game Lag White Paper` |

Why: Russian players and developers search for «лаги», «причины лагов», «почему лагает игра». «Белая книга» is an unfamiliar genre word outside crypto and government papers, and «вайтпейпер» is jargon. «Анатомия …» is a common title pattern in Russian technical writing, matches the Korean meta text («층별로 해부» = dissect layer by layer) and the repository slug `mmo-lag-anatomy`, and carries the keyword «игровых лагов».

Declension (the name is a noun phrase, inflect the first word, keep it in «ёлочки» when inflected in running text):

| Case | Form |
|---|---|
| Nominative | Анатомия игровых лагов |
| Genitive | «Анатомии игровых лагов» |
| Dative | «Анатомии игровых лагов» |
| Accusative | «Анатомию игровых лагов» |
| Prepositional | в «Анатомии игровых лагов» |

When the Korean says 이 백서 / 백서 as a generic word ("this white paper"), write **этот справочник / справочник**. Do not use «белая книга».

---

## 2. Register and voice

- **Prose** (Korean 합니다체: `s`, `num`, `more`, symptom `what/looks/tell`, glossary definitions, body text): neutral, polite explanatory Russian in the present tense. Short sentences. Address the reader as lowercase «вы» only where the Korean addresses the reader (report guide, "try this" hints); otherwise use impersonal or third-person sentences.
  - Korean 내 화면 / 내 PC / 내 캐릭터 (the player's own view) → «экран игрока», «ПК игрока», «персонаж игрока» in explanations; «ваш экран», «ваш персонаж» where the text speaks to the reader. The `who` value 나만 stays first-person («Только у меня»), because it is what a player would say.
  - Korean 우리 (the service team) → «мы», «наша сторона», sparingly.
- **Terse fields** (`chk.look`, `chk.yes`, `chk.no`, `act.*`, `c` [why, then, on screen], `sig.g`, `ref.n`, table cells): Korean 개조식 noun endings (~봄, ~함, ~늘어남). In Russian:
  - Instructions (`chk.look`, `act.*`): infinitives, runbook style. «Включить GC-лог и наложить паузы на график времени тика», «Выбрать сборщик с короткими паузами, сократить аллокации, подобрать размер кучи.»
  - Observations (`chk.yes`, `chk.no`, `c`): short present-tense clauses without a subject pronoun. «Всплески времени тика совпадают с паузами GC, длительность пауз близка к длительности всплесков».
  - Graph names (`sig.g`): noun phrases. «время тика сервера, длительность пауз GC».
  - Punctuation follows the source: if two sentences, a period only between them and none at the end (see `docs/CHECKS_GUIDE.md`); keep a final period only where the Korean has one.
- Avoid bureaucratic Russian (канцелярит): «является», «осуществляется», «производится», «данный», «в случае если» (→ «если»), «в связи с тем что» (→ «потому что»), chains of verbal nouns («проведение проверки наличия»). Prefer verbs.
- Avoid anglicisms where Russian industry uses a Russian word, and keep English where Russian engineers keep English (see the term tables). Never invent a Russian word for an English term that Russian SRE/gamedev people use in English.
- Sentence case everywhere (headings, labels, titles): only the first word and proper names are capitalized. «Диагностика по метрикам», not «Диагностика По Метрикам».
- Use «ё» consistently (ещё, всё, её, отчёт, счётчик, приём, объём, микробёрст). «Все» vs «всё» must be right.

---

## 3. Two forbidden patterns, in Russian form

**No dash asides.** Do not insert an explanation between dashes (or after a single dash) in the middle of a sentence.
- ✗ «Сервер — точнее, его главный поток — останавливается»
- ✓ «Останавливается главный поток сервера.» / «Сервер останавливается (точнее, его главный поток).»
- Also avoid the dramatic dash («Нажал — и ничего»), and the dash of consequence. Use a colon, a comma, parentheses or two sentences.
- The copular dash between two nouns («Пинг — это время …») is grammatical Russian, but rewrite to avoid it: glossary definitions start directly with the noun phrase («Время, за которое …»), and in prose use «называют», «означает», or a colon.
- Ranges use the en dash without spaces (0,2–0,5 с), which is not an aside.

**No "not A but B".** The Russian forms are «не A, а B», «A, а не B», «не столько A, сколько B», «дело не в A, а в B», «это не A, это B». Rewrite as a positive statement, or split into two sentences:
- ✗ «Пакет не потерялся, а пришёл поздно» → ✓ «Пакет пришёл с опозданием, хотя не терялся.»
- ✗ «Проблема не в сети, а в сервере» → ✓ «Проблема на стороне сервера. Сеть в порядке.»
- ✗ «ECN не отбрасывает пакеты, а помечает их» → ✓ «Оборудование, не отбрасывая пакеты, ставит на них отметку «перегрузка».»
- A plain contrast with «а» between two facts is fine («одни пакеты приходят быстро, а другие с опозданием»).

---

## 4. Typography and numbers

| Item | Rule | Example |
|---|---|---|
| Decimal separator | comma | 0,5 с; 16,7 ms; 15,6 ms |
| Thousands | no-break space U+00A0 for 4+ digits (same as `toLocaleString('ru-RU')` used by the simulations) | 1 500 байт; 10 000; 1 000 раз |
| Number and unit | no-break space (U+00A0) between them; Korean writes `50ms`, Russian writes `50 ms` | 50 ms; 1 Gbps; 60 Hz; 4 GB |
| Percent | no space | 1%; 0,1%; 80–90% |
| Ranges (Korean `~`) | en dash, no spaces; with words use «от … до …» | 0,2–0,5 с; 1–5 m; от 0,5 с до нескольких секунд |
| Korean 수 / 수십 / 수백 | «единицы / десятки / сотни», or «несколько» | от единиц до десятков ms; до сотен ms |
| Korean 약 | «около», «примерно» | около 12 ms |
| Korean ~배 | «в N раз» (agree: в 2 раза, в 5 раз) | в 1 000 раз медленнее |
| Korean N만 / N억 | convert to digits | 1만 → 10 000 |
| Times of day | 24-hour clock | 저녁 9시 → около 21:00 |
| Versions, IPs, setting names, commands | unchanged, dots stay | Windows 10 (1607), net.ipv4.tcp_rmem, RFC 6298 |
| Quotes | «ёлочки»; nested „лапки“. Korean “ ” and ‘ ’ become « » | «Соединение с сервером потеряно» |
| Korean `·` in lists | comma, or «и» before the last item; in tight labels a slash without spaces for two single words | «Wi-Fi и роутер», «Мой ПК/телефон» |
| Korean `/` alternatives | keep « / » with spaces between phrases | только у меня / у группы тоже |
| Arrows `→` `↔` | keep | Сеул ↔ Токио |
| Ellipsis | single character … | перемотка… |

**Units.** Per the I18N guide, Latin unit symbols that appear in the source stay Latin and unchanged: `ms`, `µs`, `ns`, `Hz`, `KB`, `MB`, `GB`, `Kbps`, `Mbps`, `Gbps`, `km`, `m`, `pps`, `IOPS`. The simulations print these symbols from code, so text and charts match. Korean unit **words** are translated into Russian abbreviations: 초 → **с**, 분 → **мин**, 시간 → **ч**, 일 → «дней»/«сутки» (spell out), 바이트 → **байт**, 틱 → «тик(ов)», 프레임 → «кадр(ов)», 번 → «раз». The simulations' seconds suffix is already « с» (`ui-kit`).

**Tick rates.** 20틱 서버 → «20-тиковый сервер»; 1초에 20번 → «20 раз в секунду».

---

## 5. Placeholders and plural agreement

Russian nouns change form with the number (1 причина, 2 причины, 5 причин, 21 причина). A `{0}` can be any number, so never put a noun after a placeholder number. Use one of these patterns:

| Korean | Russian pattern | Example |
|---|---|---|
| 원인 {0}가지 | «Причин: {0}» | Причин: 228 |
| 출처 {0}건 | «Источников: {0}» | Источников: 9 |
| 원인 {0}개, 용어 {1}개 | «Причин: {0}, терминов: {1}» | |
| 자료 {0}건, 발행처 {1}곳 | «Материалов: {0}, издателей: {1}» | |
| {0}: 원인 {1}가지와 담당 | «{0}: причины ({1}) и ответственные» | the count in parentheses |
| … 원인 {0}가지를 … | «Причины ({0}) разобраны …» or «(всего {0})» | |
| {0}가지 (a bare count) | «{0}» with the noun moved to a label, or «шт.» only in dense tables | |

For numbers that are fixed in the text (not placeholders) agree normally: «10 минут», «2 часа», «0,5 секунды» (fractions take genitive singular), or use the abbreviations (с, мин, ч) which never change.

Placeholders can move to fit Russian word order. A placeholder that receives a symptom or team name gets the nominative form with a capital letter, so build the sentence around a nominative slot: «{0}: задачи», «{0} в онлайн-играх: причины …», «Тот же слой: {0}».

---

## 6. Korean constructions: how to render them

| Korean pattern | Russian |
|---|---|
| Subject omitted (서버가 implied) | Name the subject, or use an impersonal/indefinite-personal sentence («смотрят», «проверяют») |
| Long noun chains (서버 틱 시간 그래프) | Max two genitives in a row; restructure: «график времени тика на сервере» |
| ~면 ~ conditionals | «Если …, …» |
| ~때문에 | «из-за …», «потому что …» |
| ~보다는 (rather than) | positive statement first, then the other point: «Со скоростью это обычно не связано: выпал пакет …» (never «не A, а B») |
| Parenthetical glosses 지터(도착 간격의 흔들림) | keep the parenthesis: «джиттер (неравномерность интервалов между пакетами)» |
| 해외 | «зарубежье», «за рубежом», «зарубежный сервер»; 해외 국가 추가 → «запуск в новой стране» |
| Korean facts (Korean ISPs, institutions, Seoul routes) | keep as facts, names in their usual Latin form (KT, SK Broadband, LG U+), cities in Russian (Сеул, Токио, Пусан) |
| 유저 | «игрок» (in games), «пользователь» only outside games |
| 렉 | «лаг», «лаги»; verb «лагает», «тормозит» in player speech |
| 장 / 절 / 층 / 주제 | «глава» / «раздел» / «слой» / «тема»; 레이어 N → «Слой N» |

---

## 7. Fixed terms

### 7.1 Symptom names (11), use exactly these words everywhere

Labels are capitalized; in running text use lowercase and inflect normally. Do not replace a symptom name with a synonym, and do not use these words for anything other than the symptom (see 7.10).

| id | Korean | Russian name | Aliases (translation of `alias`) | Notes and inflection |
|---|---|---|---|---|
| stutter | 뚝뚝 끊김 | **Микрофризы** | статтеры, картинка дёргается, будто проседает FPS | plural noun; микрофризов, микрофризам, с микрофризами; one hitch = «микрофриз» |
| teleport | 순간이동 | **Телепортация** | телепорты, варп, персонажа резко перебрасывает | телепортации, телепортацию; verb «телепортируется» is fine |
| rubber | 고무줄 | **Откидывание назад** | тянет назад, rubber banding, роллбэк позиции | verb form «персонажа откидывает назад» is fine; do not use «откат» (reads as cooldown, see 7.10) |
| burst | 몰아치기 | **Перемотка** | ускоренная перемотка, всё разом, урон прилетает пачкой | перемотки, перемотку, перемоткой; «ускоренная перемотка» allowed as the expanded form |
| slowmo | 슬로우모션 | **Слоумо** | мир замедлился, всё тормозит | indeclinable («уходит в слоумо») |
| delay | 입력 지연 | **Задержка ввода** | инпут-лаг, запоздалый отклик, ватное управление | задержки ввода, задержку ввода |
| freeze | 멈춤 | **Фриз** | всё замерло, стоп-кадр, «не отвечает» | фриза, фризом, фризы. In `sim-nagle` the same Korean string is a playback speed option, translated «Пауза» (each sim has its own dictionary). A GC stop is still «пауза GC» |
| dropped | 씹힘·롤백 | **Съеденные действия / роллбэк** | умение не прожалось, предмет вернулся назад, обмен сорвался | in prose split it: «действие „съело“», «съеденное умение», «роллбэк сохранения» |
| disconnect | 접속 끊김 | **Дисконнект** | выкидывает из игры, обрыв соединения, «Соединение с сервером потеряно» | дисконнекта, дисконнекты; players' verb «выкидывает из игры» |
| noconnect | 접속 불가·무한 로딩 | **Ошибка входа / бесконечная загрузка** | не заходит в игру, загрузка не заканчивается | inflect parts: «ошибки входа», «бесконечную загрузку» |
| invisible | 안 보임·유령 개체 | **Невидимки / фантомы** | не видно NPC, невидимый персонаж, убитый монстр продолжает стоять | невидимок, фантомов; «невидимый NPC», «фантомный монстр» fine in prose |

Korean `·` inside a symptom name → « / » (slash with spaces). Symptom lists joined by commas stay unambiguous because no name contains a comma.

### 7.2 The four factors (네 가지 요인)

| id | Korean | Russian | English | `how` |
|---|---|---|---|---|
| lat | 지연 | Задержка | Latency | Пакеты приходят поздно |
| jit | 지터 | Джиттер | Jitter | Пакеты приходят неравномерно |
| loss | 손실 | Потери | Packet loss | Пакеты не приходят совсем |
| stall | 정체 | Остановка | Stall | Кто-то перестал считать |

«요인» = «фактор», «네 가지 요인» = «четыре фактора». In prose «потери пакетов» is the full form of «потери». 지터 on first mention in a chapter: «джиттер (неравномерность интервалов между пакетами)».

### 7.3 Layers (층) and topics (주제)

«층» / «레이어» = **слой**; «13개 층과 3개 주제» = «13 слоёв и 3 темы».

| id | Korean name | Russian name | short | side |
|---|---|---|---|---|
| client-game | 클라이언트 게임 프로세스 | Процесс игрового клиента | Моя игра | Сторона игрока |
| client-os | 클라이언트 OS·기기 | ОС и устройство клиента | Мой ПК/телефон | Сторона игрока |
| home | 집 네트워크 | Домашняя сеть | Wi-Fi и роутер | Сторона игрока |
| isp | 인터넷 회선 | Интернет-маршрут | Провайдеры, зарубежье | В пути |
| dc-net | 데이터센터 네트워크 장비 | Сетевое оборудование ЦОД | Файрвол, LB | Сторона сервера |
| nic | 서버 네트워크 카드 | Сетевая карта сервера | NIC | Сторона сервера |
| server-os | 서버 OS (커널) | ОС сервера (ядро) | Ядро | Сторона сервера |
| socket | 소켓과 프로토콜 | Сокеты и протоколы | TCP·UDP (untranslated) | Оба конца |
| server-proc | 서버 게임 프로세스 | Процесс игрового сервера | Тики, потоки | Сторона сервера |
| memory | 메모리 | Память | GC, утечки | Сторона сервера |
| disk | 디스크 | Диск | IOPS | Сторона сервера |
| db | 데이터베이스 | База данных | DB (untranslated) | Сторона сервера |
| infra | 서버 구성과 운영 | Архитектура и эксплуатация серверов | Архитектура, эксплуатация | Сторона сервера |
| sync | 동기화 설계 | Архитектура синхронизации | (same) | Архитектура |
| partial | 일부에게만 생기는 문제 | Проблемы только у части игроков | У части игроков | Охват |
| retrans | TCP 재전송의 근본 원인 | Первопричины повторных передач TCP | Повторная передача TCP | Причина |

### 7.4 Chapter titles (for body translators)

| Korean | Russian |
|---|---|
| 렉은 네 가지 요인으로 만들어진다 | Из чего складываются лаги: четыре фактора |
| 패킷의 이동 경로: 내 손가락에서 서버의 DB까지 | Путь пакета: от пальца игрока до БД на сервере |
| 렉 실험실 | Лаборатория лагов |
| 증상 사전 | Каталог симптомов |
| 같은 핑, 다른 체감: 동기화 방식 | Один пинг, разные ощущения: модели синхронизации |
| 한 명만 느릴 때, 한쪽만 이상할 때 | Когда тормозит один игрок или сбоит одна сторона |
| TCP 재전송: 왜 생기고, 왜 이렇게 느려지나 | Повторная передача TCP: откуда берётся и почему так тормозит |
| 게임개발팀이 고칠 것, 인프라팀이 고칠 것 | Что исправляет команда разработки, что исправляет команда инфраструктуры |
| 클라이언트 OS와 기기 | ОС и устройство клиента |
| 집 네트워크: 와이파이·공유기·모바일망 | Домашняя сеть: Wi-Fi, роутер, мобильная сеть |
| 인터넷 회선: 통신사망과 장거리 구간 | Интернет-маршрут: сети провайдеров и дальние участки |
| 서버 네트워크 카드(NIC) | Сетевая карта сервера (NIC) |
| 소켓과 프로토콜: TCP, UDP, 소켓 옵션 | Сокеты и протоколы: TCP, UDP, опции сокетов |
| 서버 게임 프로세스: 틱과 스레드 | Процесс игрового сервера: тики и потоки |
| 진단 도우미 | Помощник диагностики |
| 관측으로 판정하기 | Диагностика по метрикам |
| 사례와 절차 | Инциденты и инструкции |
| 렉 제보 잘하는 법 | Как правильно сообщить о лагах |
| 용어 사전 | Словарь терминов |
| 참고 문헌 | Список литературы |

Other layer chapters use the layer name from 7.3. Site parts: 원인 카드 → «карточка причины», 증상 사전 → «каталог симптомов», 진단 도우미 → «помощник диагностики», 실험 → «эксперимент», 시뮬레이션 → «симуляция», 상황 불러오기/프리셋 → «готовые сценарии», 원본 (the main interactive page) → «основная версия».

### 7.5 Teams and owners (담당)

| Korean | Russian (label) | Notes |
|---|---|---|
| 게임개발팀 | **Команда разработки** | the game team: client and server code. Genitive «команды разработки», dative «команде разработки» |
| 인프라팀 | **Команда инфраструктуры** | network, servers/OS, DB hardware |
| 외부 | **Внешние стороны** | player environment, ISPs, cloud providers |
| cli 클라이언트 개발 / 클라이언트 | Разработка клиента / Клиент | |
| srv 서버 개발 / 서버 | Разработка сервера / Сервер | |
| net 네트워크 인프라 / 네트워크 | Сетевая инфраструктура / Сеть | |
| sys 서버 인프라 / 서버 장비·OS | Серверная инфраструктура / Серверы и ОС | |
| dba DB 인프라 / DB 장비 | Инфраструктура БД / Серверы БД | |
| ext 외부 / 유저·통신사·클라우드 | Внешние стороны / Игрок, провайдер, облако | |
| 담당 | Ответственные | column/row label |
| 주 담당 | Основной ответственный | removes the root cause |
| 함께 | Совместно | also has work to do |
| 담당 코드 | коды ответственных | |
| 할 일 | задачи | «{0}: задачи»; 게임개발팀이 할 일 → «Задачи команды разработки» |
| 두 팀 모두 | обе команды | |
| 해결 담당 | кто устраняет / ответственные | |

### 7.6 Who (누가 겪나 → «У кого») and when (언제 → «Когда»)

| who id | Russian | when id | Russian |
|---|---|---|---|
| me | Только у меня | always | Всегда |
| home | Все в одном доме | peak | Вечерний пик |
| region | Один регион или провайдер | event | При наплыве игроков |
| zone | Одна локация или канал | login | Сразу после входа или техработ |
| server | Весь сервер | idle | После бездействия |
| feature | Только одна функция | random | Изредка, случайно |
| onechar | Странно выглядит один персонаж | periodic | С постоянным периодом |
| oneclient | Один из клиентов на одном ПК | uptime | Чем дольше без перезапуска |
| | | moving | В движении и при смене локации |
| | | action | При определённом действии |

### 7.7 Graph shapes (그래프 모양 → «форма графика», sigs)

| id | Russian name |
|---|---|
| periodic | Всплески с постоянным периодом |
| random | Случайные всплески |
| step | Ступенька вверх с определённого момента |
| ramp | Плавный рост |
| sawtooth | Пила: плавный рост и резкий сброс |
| peak | Высоко только в определённые часы |
| load | Растёт вслед за онлайном и нагрузкой |
| ceiling | Упор в лимит (плато) |
| high | Высоко с самого начала |
| outlier | Высоко только у некоторых |
| gap | Провал, затем пачка |
| drop | Массовый обрыв соединений |
| surge | Всплеск сразу после входа или техработ |

Shape descriptions use «значение» or «график» as the subject.

### 7.8 How to check (확인 방법 → «способ проверки»), chkBy and card labels

| Korean | Russian |
|---|---|
| chkBy ops: 인프라 도구로 확인(게임 코드 불필요) | Инструменты инфраструктуры (игровой код не нужен) |
| chkBy code: 게임 서버·클라이언트의 로그·지표가 필요 | Нужны логи и метрики игрового сервера или клиента |
| chkBy user: 유저 쪽 환경에서 확인 | Проверка на стороне игрока |
| 확인할 곳 / 이러면 맞음 / 이러면 아님 / 확인 수단 | Где смотреть / Подтверждает / Опровергает / Чем проверить |
| 그래프에서는 | На графике |
| 왜 → 그러면 → 화면에서는 | Почему → Следствие → На экране |
| 증상 / 요인 / 누가 겪나 / 언제 | Симптомы / Факторы / У кого / Когда |
| 수치 감각 / 더 알아보기 / 실제 사례 / 출처 | Цифры для ориентира / Подробнее / Реальные инциденты / Источники |
| 범위 → 시점 → 계층 (판정 흐름) | охват → момент → слой (порядок диагностики) |
| 판정 신호표 | таблица признаков |
| 판정 (the three senses) | diagnosis of a cause → «диагностика», «вывод»; server decision → «решение сервера»; hit judgement → «проверка попадания»; 판정 구간 → «окно» (окно парирования, окно проверки) |

### 7.9 Technical terms (TERMS.md and glossary)

Russian first; «(English)» is how to gloss on first use when the Russian word is not obvious. Where the table says English, keep it in Latin letters.

**Network and protocols**

| Korean | Russian | Note |
|---|---|---|
| 핑 | пинг | |
| 지연 | задержка | latency; 네트워크 지연 = сетевая задержка |
| 왕복 (RTT) | путь туда и обратно, RTT | |
| 지터 | джиттер | |
| 패킷 | пакет | |
| 패킷 손실 / 손실 | потери пакетов / потери | colloquial «пакетлосс» only in player quotes |
| 대역폭 | пропускная способность | bandwidth; 처리량 (throughput) = «производительность» or «пропускная способность» by context |
| 회선 | линия связи; the player's line = подключение | do not use «канал» for 회선: «канал» is the in-game channel (채널) here |
| 회선 끊김 | обрыв связи | distinct from the symptom «дисконнект» |
| 통신사 | провайдер (ISP); mobile = оператор | 통신사 간 연결 = стыки между провайдерами |
| 피어링 | пиринг | |
| 경로, 우회 경로 | маршрут, обходной маршрут | |
| 해저 케이블 | подводный кабель | |
| 공유기 | роутер | |
| 와이파이 / 유선 / 모바일망 | Wi-Fi / кабель, проводное подключение / мобильная сеть | |
| 무선 채널 | радиоканал | |
| 버퍼블로트 | bufferbloat | first use: «bufferbloat (раздувание очередей в оборудовании)» |
| NAT, NAT 테이블, CGNAT, SNAT | NAT, таблица NAT, CGNAT, SNAT | |
| NAT 게이트웨이 | NAT-шлюз | |
| MTU, MSS, MTU 블랙홀 | MTU, MSS, чёрная дыра MTU | |
| 단편화 / 프래그먼트 | фрагментация / фрагмент | |
| BGP, QoS, SQM, ECN | same | |
| DDoS 방어 / 스크러빙 센터 | защита от DDoS / центр очистки трафика | |
| 방화벽 | файрвол | «межсетевой экран» only if quoting a standard |
| 로드밸런서 | балансировщик нагрузки | LB in tight labels |
| 스위치 / 라우터 | коммутатор / маршрутизатор | |
| 세션 테이블, 연결 추적 테이블 | таблица сессий, таблица conntrack | 연결 추적 = отслеживание соединений |
| 유휴 연결 / 유휴 타임아웃 | неактивное соединение / таймаут простоя | |
| 하트비트 | хартбит | |
| 타임아웃 | таймаут | |
| 마이크로버스트 / 버스트 | микробёрст / всплеск трафика (burst) | |
| 보안 그룹 / 네트워크 ACL | группа безопасности / сетевой ACL | |
| 합성 측정 | синтетический мониторинг | |
| 핸드오버 | хендовер | |
| 저궤도 위성 인터넷 | низкоорбитальный спутниковый интернет | |

**TCP/UDP and sockets**

| Korean | Russian | Note |
|---|---|---|
| 재전송 | повторная передача | primary term; «ретрансмит(ы)» accepted in metric talk («счётчик ретрансмитов») but prefer the primary term |
| 재전송률 | доля повторных передач | |
| 불필요한 재전송 | ложная повторная передача (spurious) | |
| RTO, 재전송 타이머 | RTO, таймер повторной передачи | |
| 백오프 | экспоненциальная задержка повтора (backoff) | |
| HOL 블로킹 | HOL-блокировка | |
| 순서 보장 | доставка по порядку | |
| 혼잡 / 혼잡 윈도우 / 수신 윈도우 | перегрузка / окно перегрузки (cwnd) / окно приёма | |
| 제로 윈도우 (프로브) | нулевое окно (zero window probe) | |
| thin stream | thin stream | first use: «thin stream (разреженный поток мелких пакетов)» |
| TLP, RACK-TLP, SACK | same | 선택적 ACK = выборочное подтверждение (SACK) |
| 지연 ACK | отложенный ACK | |
| Nagle 알고리즘 | алгоритм Нейгла | Nagle alone in labels |
| 소켓 버퍼 / 수신 버퍼 / 송신 버퍼 | буфер сокета / буфер приёма / буфер отправки | |
| keepalive, RST, TIME_WAIT, backlog | same | backlog = «очередь подключений (backlog)» |
| 신뢰성 UDP / 비신뢰 채널 | надёжный UDP / ненадёжный канал доставки (unreliable) | |
| 폴리서 / 셰이퍼 / 페이싱 | полисер / шейпер / пейсинг | |
| 연결 마이그레이션 (QUIC) | миграция соединения | |

**Server, OS, hardware**

| Korean | Russian | Note |
|---|---|---|
| 틱 / 틱레이트 / 틱 예산 / 틱 간격 | тик / тикрейт / бюджет тика / интервал тика | 20틱 서버 = 20-тиковый сервер |
| 스레드 / 메인 스레드 / 워커 스레드 / 스레드 풀 | поток / главный поток / рабочий поток / пул потоков | |
| 워커 (queueing) | воркер | |
| 락 / 잠금 | блокировка (lock) | 락 경합 = конкуренция за блокировки |
| 데드락 | дедлок | first use: «дедлок (взаимная блокировка)» |
| 동기 호출 / 비동기 I/O | синхронный вызов / асинхронный ввод-вывод | |
| 호출 체인 | цепочка вызовов | |
| 컨텍스트 스위칭 | переключение контекста | |
| 스케줄러 / 스케줄링 / 타임 슬라이스 | планировщик / планирование / квант времени | |
| CPU 스틸 | CPU steal | |
| CPU 스로틀링 / 발열 스로틀링 | троттлинг CPU / тепловой троттлинг | |
| 커널 | ядро | |
| 파일 디스크립터 | файловый дескриптор (fd) | |
| 인터럽트 / 링 버퍼 / 수신 큐 | прерывание / кольцевой буфер / очередь приёма | 슬롯 = слот |
| NIC, RSS, PPS | same | NIC = сетевая карта |
| 노이지 네이버 | шумный сосед (noisy neighbor) | |
| 라이브 마이그레이션 | живая миграция | |
| C-state | C-state | |
| 인스턴스 (cloud) | инстанс | |
| 가상 머신 | виртуальная машина | |
| 워치독 | watchdog | |
| 이용률 | утилизация | 80–90% утилизации |
| 시간 동기화 (NTP), 시스템 시계 점프 | синхронизация времени (NTP), скачок системных часов | wall clock / monotonic clock stay English |
| 타이머 해상도 | разрешение таймера | |

**Memory, disk, DB**

| Korean | Russian | Note |
|---|---|---|
| GC / 가비지 / GC 멈춤 | GC / мусор / пауза GC | «сборка мусора» in explanations; Full GC, Minor GC, Young/Old stay English |
| 힙 | куча | |
| 메모리 누수 | утечка памяти | |
| 스왑 | своп | first use: «своп (подкачка)» |
| OOM 킬러 | OOM killer | |
| 캐시 / 캐시 미스 / 콜드 캐시 / 캐시 스탬피드 | кэш / промах кэша / холодный кэш / cache stampede | spelling «кэш» |
| IOPS, fsync | same | |
| 버스트 크레딧 | burst-кредиты | |
| 동기 쓰기 | синхронная запись | |
| 체크포인트 | контрольная точка | |
| 인덱스 / 풀 스캔 / 실행 계획 | индекс / полное сканирование / план выполнения | |
| 트랜잭션 / 커넥션 풀 | транзакция / пул соединений | |
| 핫 로우 | горячая строка (hot row) | |
| 복제 지연 | отставание репликации | |
| 롤백 | роллбэк | DB, server and netcode rollback alike. A deploy rollback = «откат релиза» |
| 장애 전환 | переключение на резерв (failover) | |
| 데드락 (DB) | дедлок | |
| 언두 로그 / MVCC | undo-лог / MVCC | |
| 잠금 에스컬레이션 | эскалация блокировок | |

**Architecture and operations**

| Korean | Russian | Note |
|---|---|---|
| 게이트웨이 | шлюз | |
| 서킷 브레이커 | circuit breaker | first use: «circuit breaker (предохранитель для вызовов)» |
| 연쇄 장애 | каскадный отказ | |
| 오토스케일링 | автомасштабирование | |
| 배포 | деплой | 배포 롤백 = откат релиза |
| 패치 | патч | |
| 점검 | техработы | |
| 장애 | инцидент (event) / сбой / отказ (component) | |
| 크래시 | падение (server), краш (client) | |
| 재시작 | перезапуск | |
| 사후 분석 | постмортем | |
| 지표 / 로그 / 카운터 / 대시보드 / 알림 | метрика / лог / счётчик / дашборд / алерт | |
| 백분위수 / p99 / 꼬리 지연 / 평균 | перцентиль / p99 / хвостовая задержка / среднее | |
| 집계 간격 | интервал агрегации | |
| 스파이크, 튐 | всплеск | «пинг скачет», «время тика скачет» |
| GeoIP, TLS 인증서 | GeoIP, TLS-сертификат | |

**Client and game design**

| Korean | Russian | Note |
|---|---|---|
| 넷코드 | неткод | |
| 스냅샷 | снапшот | |
| 보간 / 보간 버퍼 | интерполяция / буфер интерполяции | |
| 외삽 | экстраполяция (dead reckoning) | |
| 예측 / 클라이언트 예측 | предсказание / клиентское предсказание | |
| 서버 보정 | серверная коррекция (reconciliation) | |
| 지연 보상 | компенсация задержки (lag compensation) | |
| 되감기 (지연 보상) | отмотка времени назад | never «перемотка» (symptom name) |
| 권위 서버 | авторитетный сервер | |
| 락스텝 | lockstep | |
| 롤백 넷코드 | роллбэк-неткод | |
| 서버 입력 버퍼 | серверный буфер ввода | |
| 선입력 | буферизация ввода | spell queue in MMO = «очередь умений» |
| 선연출 | опережающий фидбек | effects shown before server confirmation |
| 리슨 서버 | listen-сервер | 방장 = хост |
| 페이즈 | фазирование | |
| AOI, 시야 계산 | AOI, расчёт зоны видимости | 격자 = сетка, 셀 = ячейка |
| 브로드캐스트 | рассылка (broadcast) | |
| 동기화 방식 | модель синхронизации | |
| 요청-응답 / 상태 동기화 / 명령 동기화 / 이벤트 예약 / 클라이언트 권위 | запрос-ответ / синхронизация состояния / синхронизация команд / планирование событий / клиентский авторитет | |
| 프레임 / FPS / 프레임 타임 | кадр / FPS / время кадра (frametime) | |
| V-Sync / 가변 주사율 / 프레임 생성 | V-Sync / переменная частота обновления (VRR) / генерация кадров | |
| 셰이더 컴파일 / 셰이더 캐시 | компиляция шейдеров / кэш шейдеров | |
| VRAM | видеопамять (VRAM) | |
| 오버레이 / 안티치트 | оверлей / античит | |
| 넷그래프 | нетграф | |
| 게임 가속기 | игровой ускоритель | |

**MMO vocabulary**

| Korean | Russian |
|---|---|
| 채널 | канал |
| 존 / 필드 / 던전 / 인스턴스 | зона / открытая локация / данж / инстанс |
| 지역 (in-game) | локация |
| 월드 보스 / 레이드 / 공성전 | мировой босс / рейд / осада |
| 파티 / 길드 | группа / гильдия |
| 스킬 / 쿨다운 | умение / кулдаун |
| 몬스터 / NPC / 캐릭터 | монстр / NPC / персонаж |
| 데미지 / 이펙트 / 타격 | урон / эффект / удар |
| 거래 / 경매장 / 인벤토리 / 아이템 | обмен / аукцион / инвентарь / предмет |
| 로그인 / 로그인 서버 / 재접속 / 캐릭터 선택 | вход / сервер авторизации / переподключение, перезаход / выбор персонажа |
| 동접 | онлайн (CCU) |
| 이동 검증 | проверка перемещения |
| 치트 | чит |

### 7.10 Words reserved or avoided

| Word | Rule |
|---|---|
| микрофризы, телепортация, откидывание назад, перемотка, слоумо, фриз, дисконнект | only for the symptoms. A GC stop is «пауза GC», a line cut is «обрыв связи», a server rewind is «отмотка времени назад», an in-game teleport skill is «телепорт» |
| откат | do not use for rollback: Russian MMO players read «откат» as cooldown. Rollback = «роллбэк», cooldown = «кулдаун» (deploy rollback «откат релиза» is the one exception) |
| канал | only the in-game channel (채널). A network line is «линия связи» or «подключение» |
| справочник | the whole site. The symptom chapter is «каталог симптомов», the glossary is «словарь терминов» |
| белая книга, вайтпейпер | not used |
| Korean metaphors listed in TERMS.md | translate the standard term that replaced them, not the Korean image. Russian game terms that happen to be images are fine when they are the normal term («окно парирования» for 판정 구간) |

---

## 8. SEO notes

Phrases Russian-speaking players and developers type when a game lags or when they investigate server lag:

1. почему лагает игра
2. причины лагов в онлайн-играх
3. лаги в онлайн-играх
4. скачет пинг в игре
5. высокий пинг причины
6. потеря пакетов в игре как исправить
7. микрофризы в играх
8. фризы в игре
9. откидывает назад в игре
10. персонажи телепортируются
11. инпут лаг / задержка ввода
12. выкидывает из игры / дисконнект
13. бесконечная загрузка
14. серверные лаги / лагает сервер
15. неткод
16. rubber banding
17. джиттер что это
18. TCP ретрансмиты / повторная передача TCP
19. bufferbloat
20. компенсация задержки

How they are used:
- **Title**: «Анатомия игровых лагов: причины лагов в онлайн-играх и кто их устраняет» (phrases 2, 3).
- **Meta description** starts with the question form (1) and the three most-searched symptoms: «Почему в онлайн-играх бывают микрофризы, телепортация и дисконнекты…» (1, 7, 10, 12).
- **Symptom page titles**: «{symptom} в онлайн-играх: причины и кто их устраняет | Анатомия игровых лагов». The symptom names were chosen to be the search words themselves (микрофризы, фриз, телепортация, откидывание назад, задержка ввода, дисконнект, бесконечная загрузка). The aliases add инпут-лаг, rubber banding, выкидывает из игры, статтеры.
- **Cause page titles**: «{cause} ({English}): причина лагов | Анатомия игровых лагов».
- **Keywords** (`build.py`): причины лагов, лаги в играх, пинг, микрофризы, телепортация, откидывание назад, задержка ввода, дисконнект, серверные лаги, неткод, повторная передача TCP, команда разработки, команда инфраструктуры.
- `about` (JSON-LD): Лаги в играх, Сетевая задержка, Джиттер, Потери пакетов, Неткод, Повторная передача TCP, Производительность игровых серверов.
- Do not stuff keywords into body text. Use the natural words (лаги, пинг скачет, потери пакетов) where the Korean uses 렉, 핑이 튄다, 손실.

---

## 9. Appendix: shared short strings (already translated, reuse exactly)

Korean strings that appear both in the groups translated so far and in other groups. The build keeps one translation per Korean string.

| Korean | Russian | Also used in |
|---|---|---|
| 뚝뚝 끊김 | Микрофризы | sim-arch, sim-lab, sim-oneslow |
| 순간이동 | Телепортация | sim-arch, sim-lab, sim-oneslow |
| 고무줄 | Откидывание назад | sim-arch, sim-lab, sim-oneslow |
| 몰아치기 | Перемотка | sim-arch, sim-lab, sim-oneslow |
| 슬로우모션 | Слоумо | sim-arch, sim-lab |
| 입력 지연 | Задержка ввода | sim-arch, sim-lab |
| 멈춤 | Фриз (sim-nagle playback option: Пауза) | sim-arch, sim-gc, sim-lab, sim-nagle, sim-oneslow |
| 씹힘·롤백 | Съеденные действия / роллбэк | sim-arch |
| 접속 끊김 | Дисконнект | sim-arch, sim-lab, sim-sndbuf |
| 접속 불가·무한 로딩 | Ошибка входа / бесконечная загрузка | sim-arch |
| 지연 | Задержка | sim-sndbuf |
| 지터 | Джиттер | sim-bloat, sim-oneslow, sim-syncmodels |
| 손실 | Потери | sim-bloat, sim-distance, sim-oneslow |
| 패킷 손실 | Потери пакетов | sim-lab, sim-syncmodels |
| 핑 | Пинг | sim-npcmissing, sim-oneslow, sim-retrans, sim-syncmodels, sim-windows |
| 틱 | Тик | sim-ladder |
| 틱레이트 | Тикрейт | sim-journey, sim-lab |
| 보간 | Интерполяция | sim-lab |
| 보간 버퍼 | Буфер интерполяции | sim-journey, sim-lab, sim-windows |
| 클라이언트 예측 | Клиентское предсказание | sim-lab |
| 지연 보상 | Компенсация задержки | sim-windows |
| 락스텝 | Lockstep | sim-syncmodels |
| 롤백 | Роллбэк | sim-syncmodels, sim-windows |
| 선연출 | Опережающий фидбек | sim-chain |
| 설계 | Архитектура | sim-windows |
| 클라이언트 | Клиент | sim-arch, sim-journey, sim-nagle, sim-sndbuf, sim-timeouts |
| 서버 | Сервер | sim-hol, sim-journey, sim-lab, sim-nagle, sim-npcmissing, sim-retrans, sim-sndbuf |
| 네트워크 | Сеть | sim-cpu, sim-ladder |
| 디스크 | Диск | body-l-disk, sim-disk |
| 메모리 | Память | body-l-memory |
| 데이터베이스 | База данных | body-l-db |
| 캐시 | Кэш | sim-arch |
| 방화벽 | Файрвол | sim-arch |
| 로드밸런서 | Балансировщик нагрузки | sim-arch, sim-timeouts |
| 게이트웨이 | Шлюз | sim-arch |
| 복제 지연 | Отставание репликации | causes-db, sim-arch |
| 캐시 스탬피드 | Cache stampede | causes-db |
| 연쇄 장애 | Каскадный отказ | causes-infra |
| 메모리 누수 | Утечка памяти | causes-memory |
| 스왑 | Своп | causes-memory |
| 캐시 미스 | Промах кэша | causes-memory |
| OOM 킬러 | OOM killer | causes-server-os |
| 데드락 | Дедлок | causes-server-proc, sim-locks |
| 타이머 해상도 | Разрешение таймера | causes-client-os |
| 발열 스로틀링 | Тепловой троттлинг | sim-cpu |
| 타임아웃 | Таймаут | sim-dbpool |
| 버스트 크레딧 | Burst-кредиты | sim-disk |
| 링 버퍼 | Кольцевой буфер | sim-nic |
| 이용률 | Утилизация | sim-queue |
| 재전송률 | Доля повторных передач | sim-retrans |
| 불필요한 재전송 | Ложная повторная передача | sim-retrans |
| 집계 간격 | Интервал агрегации | sim-pctl |
| 같은 데이터센터 서버끼리 왕복 | Путь туда и обратно между серверами одного ЦОД | sim-ladder |
| (space)초 | (no-break space)с | sim-disk |
| 좋음 / 주의 / 나쁨 | Хорошо / Внимание / Плохо | sim-bloat, body-retrans, body-judge, sim-ladder |
| 클라이언트 게임 프로세스 | Процесс игрового клиента | body-l-client-game |
| 데이터센터 네트워크 장비 | Сетевое оборудование ЦОД | body-l-dc-net |
| 서버 네트워크 카드 | Сетевая карта сервера | body-retrans |
| 서버 OS (커널) | ОС сервера (ядро) | body-l-server-os |
| 서버 구성과 운영 | Архитектура и эксплуатация серверов | body-l-infra |
| 일부에게만 생기는 문제 | Проблемы только у части игроков | body-partial |
| TCP 재전송의 근본 원인 | Первопричины повторных передач TCP | body-retrans |
| 담당 | Ответственные | body-owners |
| 주 담당 | Основной ответственный | ui-app |
| 팀 | Команда | ui-app |
| 범위 | Охват | ui-app |
| 요인 / 언제 | Факторы / Когда | ui-app |
| 확인할 곳 / 이러면 맞음 / 이러면 아님 / 확인 수단 | Где смотреть / Подтверждает / Опровергает / Чем проверить | ui-app |
| 수치 감각 / 더 알아보기 / 실제 사례 / 출처 | Цифры для ориентира / Подробнее / Реальные инциденты / Источники | ui-app |
| 무슨 일 / 배울 점 | Что произошло / Выводы | ui-app |
| 목차 | Содержание | body-shell |
| 상황별 절차 | Инструкции по ситуациям | body-cases |
| 실제 장애 사례 | Реальные инциденты | body-cases |
| 관측으로 판정하기 | Диагностика по метрикам | body-judge |
| 용어 사전 | Словарь терминов | body-glossary |
| 참고 문헌 | Список литературы | body-refs |

The owner descriptions (`owners/*/desc`) are also reused verbatim in `body-owners`; copy them from `src/i18n/ru/data.json`.
