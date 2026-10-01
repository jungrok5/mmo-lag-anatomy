# Thai (th): terminology and style guide

Target: Thai as written by a senior game developer (MMO server and client netcode) who also knows data-center and cloud infrastructure, working in Thailand. Readers are game designers, artists, QA and PMs first, engineers second. Every translator working on `src/i18n/th/` reads this file first and follows it. The general rules (placeholders, HTML tags, what stays untranslated, review) are in `docs/I18N_GUIDE.md`; this file adds the Thai-specific decisions. When this file and your instinct disagree, follow this file so that ten translators produce one voice.

The Korean source is the truth. Do not add or drop facts, numbers, conditions, commands, IDs or URLs. Rewrite freely into natural Thai word order; never follow Korean sentence structure.

The groups `data`, `glossary`, `meta`, `ui-kit` and `site` are already translated with these rules. Use them as the reference: when you need a symptom, layer, owner, who/when or graph-shape name, copy it from `src/i18n/th/data.json` exactly.

## 1. Site name and titles

| Korean | Thai | Notes |
|---|---|---|
| 게임 렉 백서 | **คู่มือเกมแลค** | Fixed site name. “เกมแลค” is what Thai players and developers type (“เกมแลค”, “เกมแลคเกิดจากอะไร”). “คู่มือ” (handbook) is how a Thai developer would name a reference like this; “สมุดปกขาว” sounds governmental and “ไวท์เปเปอร์” sounds like a crypto whitepaper. Never change it, never add “ฉบับ…” to the name |
| 게임 렉 백서: 온라인 게임 렉 원인과 해결 담당 (full title) | คู่มือเกมแลค: เกมออนไลน์แลคเกิดจากอะไร และใครต้องแก้ | Main page `<title>` and `og:title` |
| … \| 게임 렉 백서 | … \| คู่มือเกมแลค | Suffix of every static page title |
| 백서 (this work, in running text) | คู่มือนี้ | “이 백서의 증상 이름” → “ชื่ออาการในคู่มือนี้” |
| 시청각 백서 | คู่มือแบบอินเทอร์แอกทีฟ | |
| 텍스트 판 / 전체 텍스트 판 | ฉบับข้อความ / ฉบับข้อความทั้งหมด | |
| 원본 (the interactive site) | ฉบับหลัก (ที่มีภาพและการทดลอง) | “원본 카드” → “การ์ดในฉบับหลัก” |
| Cause page title | `{0} ({1}): สาเหตุเกมแลค \| คู่มือเกมแลค` | |
| Symptom page title | `อาการ{0}เกิดจากอะไร: สาเหตุเกมแลคแยกตามอาการและทีมที่ต้องแก้ \| คู่มือเกมแลค` | “…เกิดจากอะไร” is the most common Thai query pattern |

## 2. Register and voice

- **Register**: polite, neutral written Thai (ภาษาเขียนกึ่งทางการ), the tone of a good Thai tech blog or internal engineering wiki. Plain, concrete, confident. Short sentences.
- **Never** use sentence-final particles (ครับ, ค่ะ, นะ, จ้ะ, เลย as filler), “ท่าน”, or chatty slang in prose. No marketing tone, no jokes.
- **Who is “you”**: where the Korean says 내/나 (the player’s own side), write **เรา** (“내 화면” → “หน้าจอของเรา” / “จอเรา”, “내 PC” → “PC ของเรา”, “내 캐릭터” → “ตัวละครของเรา”). Avoid “คุณ” except in direct instructions where “เรา” would be confusing. Where the Korean speaks as the operator (우리 계약, 우리 서버), also write “เรา”; if both meanings meet in one sentence, write “ฝั่งผู้ให้บริการ” / “ทีมเรา” for the operator.
- **Body prose, card summaries (`s`), `num`, `more`, symptom and factor descriptions, glossary definitions**: the Korean is polite explanatory style (합니다체). Write neutral explanatory Thai. Present facts directly (“TCP จะไม่ส่งแพ็กเก็ตถัดไปให้เกม…”).
- **`chk` fields (`look`, `yes`, `no`) and `sig.g`**: the Korean is terse bullet style (…봄, …함, …쪽). Write terse fragments: no subject, no particles, **no final period**, the way an SRE writes a runbook line. Separate two fragments with a space (or “:” when the second explains the first).
  - look: “เวลาประมวลผลต่อทิก (p99) และจำนวนครั้งที่ทิกเกินงบที่เซิร์ฟเวอร์บันทึก วางบนกราฟเดียวกับจำนวนผู้เล่นแยกตามโซน/แชนแนล ถ้าไม่มีเมตริกทิก ให้ดู CPU ของเธรดเกมตัวเดียวด้วย pidstat -t 1”
  - yes: “ช่วงที่คนรวมตัวกัน เวลาต่อทิกเกินงบ (50 ms ที่ 20 ทิก) และระหว่างนั้น CPU ของเธรดเกมอยู่ใกล้ 100%”
  - no: “ทิกเกินงบแต่ CPU ของเธรดเกมต่ำ: น่าจะเป็นสาเหตุฝั่งการรอ (GC pause, ล็อก, synchronous call)”
  - Korean “…쪽” at the end of a `no` line → “น่าจะเป็น…” or “ให้ดู…”.
- **`c` (ทำไม → ผลคือ → บนหน้าจอ)**: three fragments, no final period. Example: “งานในหนึ่งทิก (เช่น 50 ms) เกินงบเวลา” → “สถานะเกมที่ควรคำนวณ 20 ครั้งใน 1 วินาที ถูกคำนวณแค่ 8 ครั้ง” → “ทั้งพื้นที่เป็นสโลว์โมชั่น (บางเกมเป็นอาการกระตุก), สกิลตอบสนองช้า”.
- **`act` (team action items)**: comma-separated imperative verb phrases, **no final period** (Thai does not end sentences with a period). Example: “ลดการคำนวณที่หนัก, แบ่งงานในทิกไปหลายเธรด, กระจายผู้เล่น (แชนแนล), เก็บเวลาประมวลผลต่อทิกเป็นเมตริก”. `ext` items read as “แนะนำให้ผู้เล่น…” / “แจ้งให้ ISP (หรือผู้ให้บริการคลาวด์)…”.
- **Cases (`cases.js`)**: the Korean is plain written reporting (했다체). Write neutral narrative Thai. Thai has no tense: use time words (เมื่อ, ในวันที่, หลังจากนั้น) and “แล้ว” where needed; do not stack “ได้…แล้ว” on every verb. Keep company names, product names, dates and times exactly.
- **UI strings (sims, buttons, legends, status lines)**: short, no period. Captions that explain use normal sentences (still no period).
- **Card titles (`t`)**: translate into a natural Thai incident name a Thai engineer would use, often with the English term inside (“ทิกเกินงบเวลา”, “GC ของเซิร์ฟเวอร์หยุดทั้งระบบ”, “แย่งล็อกบน hot row”). When body, sim or case text refers to a card by name, reuse that card’s Thai `t` from `src/i18n/th/causes-*.json` if it already exists.

## 3. Mechanics

### Thai script or Latin script
Thai engineers mix scripts. Use exactly one form per term, as listed in sections 4–11:
- **Thai script** for words that are everyday Thai IT vocabulary: เซิร์ฟเวอร์, ไคลเอนต์, แพ็กเก็ต, ปิง, แลค, ทิก, เฟรม, เธรด, เคอร์เนล, ไฟร์วอลล์, เราเตอร์, สวิตช์, ดิสก์, แคช, บัฟเฟอร์, คิว, ล็อก (lock), เดดล็อก, ไทม์เอาต์, สแนปช็อต, โหลดบาลานเซอร์, อินเทอร์รัปต์, ซ็อกเก็ต, โปรโตคอล, แบนด์วิดท์, คิวรี, ทรานแซกชัน, อินเด็กซ์, เกตเวย์, แพตช์, เมตริก, มอนิเตอร์.
- **Latin script** for terms Thai developers say and write in English: interpolation, extrapolation, prediction, reconciliation, lag compensation, lockstep, rollback netcode, netcode, broadcast, heartbeat, connection pool, hot row, replication lag, failover, autoscaling, cascading failure, circuit breaker, swap, cache miss, GC pause, ring buffer, file descriptor, backlog, bufferbloat, peering, microburst, thin stream, idle timeout, deploy, log, postmortem. Write them lowercase in running text unless they are acronyms or product names.
- **Acronyms, commands, counters, product names** stay as in the source (TCP, UDP, NIC, RSS, IOPS, DB, OS, `ss -ti`, `pg_stat_statements`).
- **Glossary headwords** (`glossary` group, already done) use a Thai-script form so the Thai column and the English column differ (อินเทอร์โพเลชัน / Interpolation). In prose use the prose form from the tables below, not the headword.
- “log” (บันทึก) stays Latin **log** so it never collides with ล็อก (lock). Login is ล็อกอิน.

### Spacing
- Thai has no spaces between words. A space marks the end of a sentence or a clause, or separates list items. Do not insert spaces inside a Thai phrase.
- Put **one space around every Latin word, acronym or number** embedded in Thai: “ใช้ GC ทุก 50 ms”, “เซิร์ฟเวอร์ 20 ทิก”. No space between a Thai word and a placeholder that holds Thai text when they form one word (“อาการ{0}”, “งานฝั่ง{0}”).
- **Parentheses**: a space before “(” and after “)” when they touch Thai text; no space inside: “ความหน่วง (latency) สูง”. No space before “)” + punctuation.
- **ๆ (mai yamok)**: write with a space before and after, per the Royal Institute: “ค่อย ๆ”, “สั้น ๆ”, “เฉย ๆ”.
- **ฯลฯ**: space before it; it closes the list, so no “และ” before the last item.

### Sentence ends and punctuation
- **No full stop at the end of a Thai sentence.** End a sentence with one space and start the next. This applies to every field: prose, `s`, `num`, `more`, `act`, captions, report items. A period appears only inside numbers, code, commands and file names. Thai abbreviations use ฯ where standard (สหรัฐฯ). Code templates that join two sentences follow the same rule: `{0}. {1}` → `{0} {1}` (already done in `ui-kit`); a label followed by a sentence (`${f.how}. …`) likewise becomes a space.
- **Lists**: separate three or more items with “, ” and join the last one with “และ” / “หรือ” (no comma before it): “ระยะทาง, คิว และเวลาประมวลผล”. In label-like lists (layer `what`, `chk`) commas alone are fine. Two items: “A และ B”, “A หรือ B”.
- **Quotes**: curly “ ” as in the source; ‘ ’ inside quotes. Straight quotes only in code and HTML attributes. Attribute translations (`@aria-label`, `@title`) must not contain `"`, `<`, `>`.
- **Colon**: no space before, one space after.
- **Korean middle dot (·)**: never keep it inside Thai words or prose. In short labels and names use “/” without spaces (“Wi-Fi/เราเตอร์”, “ทิก/เธรด”, “กดไม่ติด/โรลแบ็ค”). In prose use “และ”, “หรือ” or commas. It may stay only as a visual separator between independent chips or segments (“ความหน่วง · จิตเตอร์ · แพ็กเก็ตหาย · การหยุดชะงัก”).
- **Arrows** (→, ↔) and the ellipsis character “…” stay as in the source.
- **“예:”** → “เช่น”; **“등”** → “ฯลฯ” at the end of a list or “เป็นต้น”; prefer “เช่น A และ B” in prose.

### No dash asides, no “not A but B”
- **No dash asides.** Do not insert an explanation in the middle of a sentence with “—”, “–” or spaced hyphens (“ทิก — ซึ่งเป็น… — จะ…”). Use parentheses, a separate sentence, or “คือ”. The en dash is only for numeric ranges.
- **No “not A but B” sentences.** Avoid “ไม่ใช่ A แต่เป็น B”, “ไม่ได้ A แต่ B”, “A ไม่ใช่ B หรอก”, “แทนที่จะเป็น A กลับเป็น B” used as a correction, and “มากกว่าจะเป็น A” when the source does not compare. State B directly. If ruling out A is itself a fact in the source, write it as its own plain statement (“เน็ตไม่มีปัญหา”) or as a condition (“ถ้า X ให้สงสัย Y”). Describing a mechanism (“ติดเครื่องหมายแทนการทิ้งแพ็กเก็ต”) is fine.

### Numbers and units
- Values never change. Arabic digits only (never Thai digits ๑๒๓). Thousands separator comma, decimal point: `1,500 ไบต์`, `0.25 วินาที`, `16.7 ms`, `10,000`.
- **Space between number and unit**: `50 ms`, `200 µs`, `1.5 GB`, `6.4 Gbps`, `60 Hz`, `60 FPS`, `20 ทิก`, `1,460 ไบต์`, `5 วินาที`. No space before `%`: `0.1%`. Keep unit symbols (`ms`, `µs`, `ns`, `Gbps`, `MB`, `IOPS`, `PPS`).
- Time words: 초 → วินาที, 분 → นาที, 시간 → ชั่วโมง, 일 → วัน (always Thai words, also in tables and `chk`). Distance: เมตร, กิโลเมตร. Bytes: ไบต์ (KB/MB/GB stay symbols).
- **Ranges**: Korean `~` → en dash, no spaces: `1–5 เมตร`, `0.2–0.5 วินาที`, `80–90%`. With words: “หลักหน่วยถึงหลักสิบ ms”.
- **Korean number words**: where the Korean writes a small number as a word (네 가지, 한 번, 두세 번), write a Thai word (สี่อย่าง, หนึ่งครั้ง, สองสามรอบ); where it writes digits, write digits. This keeps `node tools/i18n.cjs check` quiet. 1만 → `1 หมื่น` or `10,000`; 수백 → หลายร้อย; 수십 → หลายสิบ; 수 초 → หลายวินาที (or ไม่กี่วินาที when the sense is “a few”); 수~수십 ms → หลักหน่วยถึงหลักสิบ ms; 십여 초 → สิบกว่าวินาที; N배 → N เท่า. The check tool may warn “숫자가 다름” for 1만 → 10,000; that is expected.
- `1초에 20번` → “20 ครั้งใน 1 วินาที” (keep the 1).
- **Dates**: keep the Gregorian year from the source (“28 ตุลาคม 2021”); never convert to พ.ศ. Month names in Thai. **Times**: keep the source’s clock and time zone with a colon (“21:52 UTC”); 오전/오후 → 24-hour.
- Place and company names: Thai names where one is standard (โซล, โตเกียว, สหรัฐฯ ฝั่งตะวันตก), otherwise as in the source (KT, SK Broadband, LG U+). Keep Korean-specific facts; never swap in Thai ISPs as examples.

### Short strings with a number placeholder
Thai has no plural inflection, so there is no agreement problem; the only choice is the classifier.
- A noun that works as its own classifier goes after the number: `원인 {0}가지` → `{0} สาเหตุ`, `{0} ขั้นตอน`, `{0} วิธี`.
- Other nouns: noun + number + classifier: `출처 {0}건` → `แหล่งอ้างอิง {0} รายการ`; `발행처 {1}곳` → `ผู้เผยแพร่ {1} ราย`; `용어 {1}개` → `คำศัพท์ {1} คำ`; `원인 {0}개` (list) → `สาเหตุ {0} ข้อ`; people → `{0} คน`; times → `{0} ครั้ง`; multiples → `{0} เท่า`.
- Never add “ต่าง ๆ”, “หลาย” or “ๆ” to a counted noun. `{0}` equal to 1 reads correctly with every form above.

## 4. The 11 symptom names (fixed)

Use exactly these words everywhere (data, cards, body, sims, cases, site pages). They are what Thai players actually say. The same words are **reserved**: do not use them for other meanings. For a generic stop use หยุด / หยุดชะงัก / หยุดแวบ; for a cut connection in a technical sense use ขาด / ถูกตัด; for data waiting in a buffer use รออยู่ / กองรอ (not ค้าง).

| id | Korean | Thai name | Aliases as written in `data.json` |
|---|---|---|---|
| stutter | 뚝뚝 끊김 | **กระตุก** | สะดุด, ไม่ลื่น, เหมือนเฟรมดรอป |
| teleport | 순간이동 | **วาร์ป** | เทเลพอร์ต, หายวับแล้วโผล่อีกที่, กระโดดข้ามตำแหน่ง |
| rubber | 고무줄 | **ดีดกลับ** | โดนดึงกลับ, rubber banding, ตำแหน่งย้อนกลับ |
| burst | 몰아치기 | **กรอเร็ว** | รัว ๆ, เหมือนกดกรอ, ทุกอย่างมาพร้อมกัน |
| slowmo | 슬로우모션 | **สโลว์โมชั่น** | ทั้งโลกในเกมช้าลง, อืดไปหมด |
| delay | 입력 지연 | **อินพุตดีเลย์** | ตอบสนองช้า, input lag, กดแล้วไม่ได้ฟีล |
| freeze | 멈춤 | **ค้าง** | ภาพนิ่ง, หยุดนิ่ง, ไม่ตอบสนอง |
| dropped | 씹힘·롤백 | **กดไม่ติด/โรลแบ็ค** | สกิลไม่ออก, ไอเทมย้อนกลับ, เทรดไม่สำเร็จ |
| disconnect | 접속 끊김 | **หลุด** | เกมเด้ง, เน็ตหลุด, ขาดการเชื่อมต่อกับเซิร์ฟเวอร์ |
| noconnect | 접속 불가·무한 로딩 | **เข้าเกมไม่ได้/โหลดไม่จบ** | ล็อกอินไม่ได้, โหลดวนไม่จบ |
| invisible | 안 보임·유령 개체 | **มองไม่เห็น/ตัวผี** | NPC ไม่ขึ้น, ตัวละครล่องหน, มอนที่ตายแล้วยังยืนอยู่ |

Notes:
- In sentences, put “อาการ” in front when the name is used as a noun: “อาการกระตุก”, “แสดงเป็นอาการกรอเร็วหรือวาร์ป”. As a verb or predicate the bare name is fine: “ภาพกระตุก”, “ตัวละครวาร์ป”, “โดนดีดกลับ”, “เกมค้าง”, “หลายคนหลุดพร้อมกัน”.
- **กรอเร็ว** is the backlog replaying at high speed after a stall (“เหมือนกดกรอวิดีโอ”). “TCP 몰아치기” → “อาการกรอเร็วของ TCP”.
- **อินพุตดีเลย์** is the symptom; **ความหน่วง** is the factor. Do not mix them.
- **ค้าง** is the symptom; **การหยุดชะงัก** is the factor (정체) and the engineering word for a stopped tick or thread (“ทิกหยุดชะงัก”).
- 멈칫 (one short hitch, not a symptom name) → “หยุดแวบ”. 짧은 멈춤 → “หยุดสั้น ๆ”.
- 스킬 씹힘 → “สกิลไม่ออก”; 튕김 → “เด้ง”; 버벅임 → “สะดุด”; 굼뜸 → “อืด” (whole game) or “ตอบสนองช้า” (input).

## 5. The four factors (fx)

| Korean | Thai name | `how` line | Notes |
|---|---|---|---|
| 지연 | **ความหน่วง** | แพ็กเก็ตมาช้า | Gloss once per chapter as “ความหน่วง (latency)”. A specific wait (“200 ms 지연”) → “ดีเลย์ 200 ms” or “รอ 200 ms” |
| 지터 | **จิตเตอร์** | แพ็กเก็ตมาไม่สม่ำเสมอ | First mention per chapter: “จิตเตอร์ (ช่วงเวลาที่แพ็กเก็ตมาถึงไม่สม่ำเสมอ)”. Players call it “ปิงแกว่ง” / “ปิงไม่นิ่ง”; use that only in player-facing text |
| 손실 | **แพ็กเก็ตหาย** | แพ็กเก็ตไม่มาเลย | “packet loss” may appear once in parentheses. 손실률 → อัตราแพ็กเก็ตหาย. 연속 손실 → แพ็กเก็ตหายต่อเนื่อง |
| 정체 | **การหยุดชะงัก** | มีบางจุดหยุดคำนวณ | “เซิร์ฟเวอร์หยุดชะงัก”, “ทิกหยุดชะงัก”. Gloss if needed: “การหยุดชะงัก (stall)” |

요인 → ปัจจัย; 렉의 네 가지 요인 → ปัจจัยสี่อย่างของแลค; 게임의 대처 → วิธีที่เกมรับมือ; 가리다 (hide lag) → กลบ.

## 6. Layers and topics

13 layers (층 → **ชั้น**) and 3 topics (주제 → **หัวข้อ**). `L1`…`L13` stay.

| id | name | short (nav, badges) | side |
|---|---|---|---|
| client-game | โปรเซสเกมฝั่งไคลเอนต์ | ตัวเกม | ฝั่งเรา |
| client-os | OS และอุปกรณ์ฝั่งไคลเอนต์ | PC/มือถือ | ฝั่งเรา |
| home | เครือข่ายในบ้าน | Wi-Fi/เราเตอร์ | ฝั่งเรา |
| isp | เส้นทางอินเทอร์เน็ต | ISP/ต่างประเทศ | ระหว่างทาง |
| dc-net | อุปกรณ์เครือข่ายในดาต้าเซ็นเตอร์ | ไฟร์วอลล์/LB | ฝั่งเซิร์ฟเวอร์ |
| nic | การ์ดเครือข่ายของเซิร์ฟเวอร์ | NIC | ฝั่งเซิร์ฟเวอร์ |
| server-os | OS ของเซิร์ฟเวอร์ (เคอร์เนล) | เคอร์เนล | ฝั่งเซิร์ฟเวอร์ |
| socket | ซ็อกเก็ตและโปรโตคอล | TCP·UDP (unchanged) | ปลายทั้งสองฝั่ง |
| server-proc | โปรเซสเกมฝั่งเซิร์ฟเวอร์ | ทิก/เธรด | ฝั่งเซิร์ฟเวอร์ |
| memory | หน่วยความจำ | GC/หน่วยความจำรั่ว | ฝั่งเซิร์ฟเวอร์ |
| disk | ดิสก์ | IOPS | ฝั่งเซิร์ฟเวอร์ |
| db | ฐานข้อมูล | DB | ฝั่งเซิร์ฟเวอร์ |
| infra | สถาปัตยกรรมเซิร์ฟเวอร์และการดูแลระบบ | สถาปัตยกรรม/ดูแลระบบ | ฝั่งเซิร์ฟเวอร์ |
| sync (topic) | การออกแบบการซิงก์ | การออกแบบการซิงก์ | การออกแบบ |
| partial (topic) | ปัญหาที่เกิดกับบางคนเท่านั้น | บางคน | ขอบเขต |
| retrans (topic) | ต้นเหตุของการส่งซ้ำใน TCP | การส่งซ้ำ TCP | สาเหตุ |

동기화 → **การซิงก์** (“ซิงก์สถานะ”, “ซิงก์คำสั่ง”); 동기화 방식 → รูปแบบการซิงก์. 동기 (synchronous, as in 동기 호출/동기 쓰기) is a different word: synchronous call, การเขียนแบบ synchronous.

Chapter titles (body `h2`), for consistent cross-references:

| Korean | Thai |
|---|---|
| 렉은 네 가지 요인으로 만들어진다 | แลคเกิดจากปัจจัยสี่อย่าง |
| 패킷의 이동 경로: 내 손가락에서 서버의 DB까지 | เส้นทางของแพ็กเก็ต: จากปลายนิ้วเราถึง DB ของเซิร์ฟเวอร์ |
| 렉 실험실 | ห้องทดลองแลค |
| 증상 사전 | พจนานุกรมอาการ |
| 같은 핑, 다른 체감: 동기화 방식 | ปิงเท่ากัน แต่รู้สึกต่างกัน: รูปแบบการซิงก์ |
| 한 명만 느릴 때, 한쪽만 이상할 때 | เมื่อช้าอยู่คนเดียว หรือผิดปกติอยู่ฝั่งเดียว |
| TCP 재전송: 왜 생기고, 왜 이렇게 느려지나 | การส่งซ้ำของ TCP: เกิดจากอะไร และทำไมถึงช้าขนาดนี้ |
| 게임개발팀이 고칠 것, 인프라팀이 고칠 것 | สิ่งที่ทีมพัฒนาเกมต้องแก้ และสิ่งที่ทีมอินฟราต้องแก้ |
| 클라이언트 OS와 기기 | OS และอุปกรณ์ฝั่งไคลเอนต์ |
| 집 네트워크: 와이파이·공유기·모바일망 | เครือข่ายในบ้าน: Wi-Fi, เราเตอร์ และเครือข่ายมือถือ |
| 인터넷 회선: 통신사망과 장거리 구간 | เส้นทางอินเทอร์เน็ต: เครือข่าย ISP และเส้นทางระยะไกล |
| 서버 네트워크 카드(NIC) | การ์ดเครือข่ายของเซิร์ฟเวอร์ (NIC) |
| 소켓과 프로토콜: TCP, UDP, 소켓 옵션 | ซ็อกเก็ตและโปรโตคอล: TCP, UDP และ socket option |
| 서버 게임 프로세스: 틱과 스레드 | โปรเซสเกมฝั่งเซิร์ฟเวอร์: ทิกและเธรด |
| 진단 도우미 | ตัวช่วยวิเคราะห์อาการ |
| 관측으로 판정하기 | ชี้สาเหตุจากข้อมูลที่วัดได้ |
| 판정 흐름 / 판정 신호표 / 범위 → 시점 → 계층 | ลำดับการชี้สาเหตุ / ตารางสัญญาณ / ขอบเขต → ช่วงเวลา → ชั้น |
| 그래프 모양으로 찾기 | หาสาเหตุจากรูปแบบกราฟ |
| 숫자 읽는 법 | วิธีอ่านตัวเลข |
| 사례와 절차 / 상황별 절차 | กรณีศึกษาและขั้นตอน / ขั้นตอนตามสถานการณ์ |
| 패치 이후 렉 / 해외 국가 추가 | แลคหลังลงแพตช์ / การขยายบริการไปประเทศใหม่ |
| 렉 제보 잘하는 법 | วิธีแจ้งปัญหาแลคให้ได้ผล |
| 용어 사전 / 참고 문헌 | อภิธานศัพท์ / เอกสารอ้างอิง |
| 증상별로 찾기 / 증상별 원인 | ค้นหาตามอาการ / สาเหตุแยกตามอาการ |
| 이 층에서 렉을 만드는 원인 | สาเหตุของแลคในชั้นนี้ |
| 시간 감각 / 숫자 감각 (sim) | สเกลเวลาที่ควรรู้ / ตัวเลขที่ควรรู้ |

## 7. Teams and owners

| Korean | Thai | Notes |
|---|---|---|
| 게임개발팀 | **ทีมพัฒนาเกม** | Owns client and server code |
| 인프라팀 | **ทีมอินฟรา** | “อินฟรา” is how Thai studios say it; “ทีมโครงสร้างพื้นฐาน” sounds bureaucratic |
| 외부 | **ภายนอก** | Players’ environment, ISPs, cloud providers |
| 클라이언트 개발 (cli) / 클라이언트 | พัฒนาไคลเอนต์ / ไคลเอนต์ | |
| 서버 개발 (srv) / 서버 | พัฒนาเซิร์ฟเวอร์ / เซิร์ฟเวอร์ | |
| 네트워크 인프라 (net) / 네트워크 | อินฟราเครือข่าย / เครือข่าย | |
| 서버 인프라 (sys) / 서버 장비·OS | อินฟราเซิร์ฟเวอร์ / เครื่องเซิร์ฟเวอร์/OS | |
| DB 인프라 (dba) / DB 장비 | อินฟรา DB / เครื่อง DB | |
| 외부 (ext) / 유저·통신사·클라우드 | ภายนอก / ผู้เล่น/ISP/คลาวด์ | |
| 팀·담당 joined (`{0}·{1}` in export) | `{1} ({0})` → “พัฒนาไคลเอนต์ (ทีมพัฒนาเกม)” | |
| 담당 | ผู้รับผิดชอบ | 담당 팀 → ทีมที่รับผิดชอบ / ทีมที่ต้องแก้; 담당 코드 → รหัสผู้รับผิดชอบ |
| 주 담당 / 함께 | ผู้รับผิดชอบหลัก / ร่วมกับ | |
| {팀} 할 일 | งานฝั่ง{ทีม} | “งานฝั่งทีมพัฒนาเกม”, “งานฝั่งทีมอินฟรา”, “งานฝั่งภายนอก” |
| 유저 안내·외부 요청 | การแนะนำผู้เล่นและการร้องขอไปยังภายนอก | |
| 팀별 대응 | สิ่งที่แต่ละทีมต้องทำ | |
| 누가 고치나 | ใครต้องแก้ | |
| 넘길 때 챙길 정보 | ข้อมูลที่ต้องแนบเมื่อส่งต่องาน | |

## 8. Who / when values (triage filters)

| key | Korean | Thai |
|---|---|---|
| who.me | 나만 | เราคนเดียว |
| who.home | 같은 집 | คนในบ้านเดียวกัน |
| who.region | 특정 지역·통신사 | บางพื้นที่/บาง ISP |
| who.zone | 특정 장소·채널 | บางจุด/บางแชนแนล |
| who.server | 서버 전체 | ทั้งเซิร์ฟเวอร์ |
| who.feature | 특정 기능만 | เฉพาะบางฟีเจอร์ |
| who.onechar | 특정 캐릭터만 이상해 보임 | เห็นตัวละครบางตัวผิดปกติ |
| who.oneclient | 같은 PC의 한쪽 클라만 | ไคลเอนต์เดียวในเครื่องที่เปิดหลายจอ |
| when.always | 항상 | ตลอดเวลา |
| when.peak | 저녁 피크 시간 | ช่วงพีคหัวค่ำ |
| when.event | 사람이 몰릴 때 | ตอนคนแห่มารวมกัน |
| when.login | 접속·점검 직후 | หลังล็อกอิน/หลังปิดปรับปรุง |
| when.idle | 가만히 있다가 | หลังอยู่เฉย ๆ สักพัก |
| when.random | 가끔 무작위로 | สุ่มเป็นครั้งคราว |
| when.periodic | 일정한 주기로 | เป็นรอบสม่ำเสมอ |
| when.uptime | 오래 켜 둘수록 | ยิ่งเปิดไว้นานยิ่งเป็น |
| when.moving | 이동 중·지역 전환 때 | ระหว่างเดินทาง/ย้ายแมพ |
| when.action | 특정 행동을 할 때 | ตอนทำแอ็กชันบางอย่าง |

Labels: 누가 겪나 → “ใครเจอ”, 누가 → “ใคร”, 언제 → “เกิดเมื่อไร”, 모양 (symptom shape in triage) → “ลักษณะอาการ”. “เปิดหลายจอ” is how Thai MMO players describe running several clients on one PC.

## 9. Graph shapes (sigs) and check-by (chkBy)

| id | Korean | Thai |
|---|---|---|
| periodic | 일정 주기로 튐 | พุ่งเป็นรอบ |
| random | 가끔 무작위로 튐 | พุ่งแบบสุ่มเป็นครั้งคราว |
| step | 어느 순간부터 계단처럼 올라감 | ขึ้นเป็นขั้นบันไดจากจุดหนึ่ง |
| ramp | 서서히 오름 | ค่อย ๆ สูงขึ้น |
| sawtooth | 서서히 오르다 뚝 떨어짐 | ค่อย ๆ ขึ้นแล้วดิ่งลง |
| peak | 특정 시간대에만 높음 | สูงเฉพาะบางช่วงเวลา |
| load | 인원·부하를 따라 오름 | สูงตามจำนวนคนและโหลด |
| ceiling | 한도에 닿아 평평해짐 | ชนเพดานแล้วแบนราบ |
| high | 처음부터 늘 높음 | สูงตลอดตั้งแต่แรก |
| outlier | 일부만 높음 | สูงเฉพาะบางกลุ่ม |
| gap | 끊겼다가 몰아서 | ขาดช่วงแล้วมารวดเดียว |
| drop | 연결이 한꺼번에 끊김 | การเชื่อมต่อหลุดพร้อมกัน |
| surge | 접속·점검 직후 폭증 | พุ่งทันทีหลังเปิดเซิร์ฟ/ปิดปรับปรุง |

| by | Korean (data) | Thai (data) | Short form (ui: 인프라 도구 / 게임 로그·지표 / 유저 쪽) |
|---|---|---|---|
| ops | 인프라 도구로 확인(게임 코드 불필요) | ใช้เครื่องมือฝั่งอินฟรา (ไม่ต้องใช้โค้ดเกม) | เครื่องมืออินฟรา |
| code | 게임 서버·클라이언트의 로그·지표가 필요 | ต้องมี log หรือเมตริกจากเซิร์ฟเวอร์/ไคลเอนต์เกม | log/เมตริกของเกม |
| user | 유저 쪽 환경에서 확인 | ตรวจที่สภาพแวดล้อมฝั่งผู้เล่น | ฝั่งผู้เล่น |

그래프 모양 → รูปแบบกราฟ; {0} 모양의 그래프 → กราฟแบบ “{0}”; 그래프에서는 → บนกราฟ; 확인 방법 → วิธียืนยัน; 확인 수단 → วิธีตรวจ; 튀다 (graph) → พุ่ง; 스파이크 → spike (“ค่าพุ่ง”).

## 10. Card, page and UI labels

| Korean | Thai |
|---|---|
| 원인 (label, table header, side) | สาเหตุ |
| 원인 ID | ID สาเหตุ |
| 원인 카드 / 원인 항목 | การ์ดสาเหตุ / รายการสาเหตุ |
| 왜 → 그러면 → 화면에서는 | ทำไม → ผลคือ → บนหน้าจอ |
| 증상 / 요인 | อาการ / ปัจจัย |
| 수치 감각 | ตัวเลขที่ควรรู้ |
| 확인할 곳 / 이러면 맞음 / 이러면 아님 | จุดที่ต้องดู / สัญญาณว่าใช่ / สัญญาณว่าไม่ใช่ |
| 더 알아보기 | รายละเอียดเพิ่มเติม |
| 실제 사례 / 실제 장애 사례 | กรณีจริง / กรณีเหตุขัดข้องจริง |
| 무슨 일 / 배울 점 / 관련 원인 / 원문 | เกิดอะไรขึ้น / บทเรียน / สาเหตุที่เกี่ยวข้อง / ต้นฉบับ |
| 출처 / 참고 문헌 / 장별 출처 | แหล่งอ้างอิง / เอกสารอ้างอิง / แหล่งอ้างอิงรายบท |
| 함께 보면 좋은 원인 | สาเหตุที่ควรดูประกอบ |
| 같은 층 | ชั้นเดียวกัน |
| 다른 말 | เรียกอีกอย่างว่า |
| 단서 | เบาะแส |
| 링크 복사 / 복사됨 | คัดลอกลิงก์ / คัดลอกแล้ว |
| 관련 장 → | บทที่เกี่ยวข้อง → |
| 직접 해보기 / 이렇게 해보세요 / 상황 불러오기 | ลองเอง / ลองทำแบบนี้ / เลือกสถานการณ์ |
| 좋음 / 주의 / 나쁨 | ดี / ระวัง / แย่ |
| 실험 (a sim) / 시뮬레이션 / 렉 실험실 | การทดลอง / การจำลอง / ห้องทดลองแลค |
| 장 / 절 / 층 / 주제 | บท / หัวข้อย่อย / ชั้น / หัวข้อ |
| 목차 | สารบัญ |
| 준비 중입니다. | อยู่ระหว่างจัดทำ |
| 기타 | อื่น ๆ |
| 제보 | การแจ้งปัญหา (แจ้งแลค) |

## 11. Core terminology (Korean → Thai)

Keep established English terms where Thai engineers use them; gloss once for non-experts where the Korean glosses (“คิวรอเชื่อมต่อ (backlog)”). `TERMS.md` rows are covered here. “Prose” is the form to use in all running text; “headword” is the glossary form (already done).

### Game and netcode
| Korean | Prose | Headword / note |
|---|---|---|
| 렉 | แลค | “เกมแลค”, “แลคหนัก”. Momentary jump → “แลคพุ่ง” / “ปิงพุ่ง” |
| 핑 / 왕복 시간 | ปิง / เวลาไปกลับ (RTT) | 핑이 높다 → ปิงสูง; 핑 튐 → ปิงพุ่ง; 핑이 들쭉날쭉 → ปิงขึ้นลงไม่นิ่ง; 게임 안 핑 → ปิงในเกม; 게임 밖에서 잰 핑 → ปิงที่วัดจากนอกเกม |
| 틱 / 틱레이트 / 틱 간격·주기 | ทิก / ทิกเรต / ช่วงห่างระหว่างทิก, รอบทิก | 20틱 서버 → เซิร์ฟเวอร์ 20 ทิก; 틱마다 → ทุกทิก |
| 틱 예산 / 틱 예산 초과 | งบเวลาต่อทิก / ทิกเกินงบ | |
| 게임 루프 / 메인 스레드 / 게임 스레드 | ลูปของเกม / เมนเธรด / เธรดเกม | 한 바퀴 (game loop) → ลูปหนึ่งรอบ, หนึ่งเฟรม |
| 프레임 / 프레임 타임 / 프레임 드랍 | เฟรม / เฟรมไทม์ / เฟรมดรอป | 프레임이 튄다 → เฟรมไทม์พุ่ง |
| 스냅샷 / 델타 압축 | สแนปช็อต / delta compression | |
| 상태 업데이트 / 게임 상태 | อัปเดตสถานะ / สถานะเกม | 세계 (what the server simulates) → สถานะเกม; 게임 세계 → โลกในเกม |
| 서버의 실제 상태 | สถานะจริงบนเซิร์ฟเวอร์ | |
| 보간 / 보간 버퍼 | interpolation / interpolation buffer | อินเทอร์โพเลชัน / บัฟเฟอร์อินเทอร์โพเลชัน |
| 외삽 | extrapolation (dead reckoning) | เอ็กซ์ทราโพเลชัน |
| 예측 / 클라이언트 예측 | prediction / client-side prediction | การคาดการณ์ฝั่งไคลเอนต์ |
| 서버 보정 | reconciliation | การแก้ตำแหน่งตามเซิร์ฟเวอร์ |
| 되감기 / 지연 보상 | การย้อนเวลา (rewind) / lag compensation | การชดเชยแลค |
| 권위 서버 / 서버 권위 / 클라이언트 권위 | authoritative server / server authoritative / client authoritative | เซิร์ฟเวอร์ผู้ตัดสิน. Gloss once: “เซิร์ฟเวอร์เป็นผู้ตัดสินผล (server authoritative)” |
| 요청-응답 / 상태 동기화+보간 / 명령 동기화 / 이벤트 예약 | request-response / ซิงก์สถานะ + interpolation / ซิงก์คำสั่ง / นัดเวลาอีเวนต์ล่วงหน้า | Sync model names |
| 락스텝 | lockstep | ล็อกสเต็ป |
| 롤백 넷코드 | rollback netcode | โรลแบ็คเน็ตโค้ด. DB 롤백 → โรลแบ็ค |
| 선입력 | การกดล่วงหน้า (input buffer) | Distinct from the server-side input buffer |
| 서버 입력 버퍼 | บัฟเฟอร์อินพุตฝั่งเซิร์ฟเวอร์ | |
| 선연출 | การแสดงผลล่วงหน้า | Playing animations/effects before the server confirms |
| 판정 / 공격 판정 / 이동 검증 | การตัดสินผล / การตัดสินการโจมตี (hit registration) / การตรวจการเคลื่อนที่ | |
| 판정 구간 / 선입력 허용 시간 / 패링 판정 | ช่วงเวลาตัดสิน / ช่วงเวลาที่รับการกดล่วงหน้า / ช่วงเวลาตัดสินการแพร์รี | |
| 스킬 씹힘 | สกิลไม่ออก | |
| 시야 / 시야 계산 / AOI / 셀 / 격자 | ระยะมองเห็น / การคำนวณระยะมองเห็น / AOI / เซลล์ / ตาราง (grid) | |
| 브로드캐스트 | broadcast | บรอดแคสต์ |
| 개체 / 개체 ID / 등장·퇴장 알림 | เอนทิตี / entity ID / ข้อความแจ้งการปรากฏตัว/ออกไป (spawn/despawn) | |
| 채널 / 존 / 필드 / 페이즈 | แชนแนล / โซน / ฟิลด์ / phasing | เฟสซิง. 존 이동 → ย้ายโซน; 지역 이동 → ย้ายแมพ |
| 월드 보스 / 공성전 / 레이드 | เวิลด์บอส / ศึกชิงปราสาท / เรด | |
| 파티원 / 방장 (host) | เพื่อนในปาร์ตี้ / หัวห้อง | |
| 몬스터 / 캐릭터 모델 / 이름표 | มอนสเตอร์ (colloquial มอน) / โมเดลตัวละคร / ป้ายชื่อ | |
| 스킬 시전 / 쿨다운 / 데미지 / 이펙트 / 체력 | การร่ายสกิล / คูลดาวน์ / ดาเมจ / เอฟเฟกต์ / HP | |
| 거래 / 인벤토리 / 아이템 / 보상 | เทรด / กระเป๋า / ไอเทม / ของรางวัล | |
| 리슨 서버 | listen server | ลิสเซินเซิร์ฟเวอร์ |
| 넷코드 / 넷그래프 | netcode / net graph | เน็ตกราฟ |
| 동시 접속 / 인원 | ผู้เล่นออนไลน์พร้อมกัน (CCU) / จำนวนผู้เล่น | |
| 로그인 대기열 / 대기 순번 | คิวล็อกอิน / ลำดับคิว | |
| 점검 | ปิดปรับปรุง | 점검 직후 → ทันทีหลังปิดปรับปรุง |
| 패치 / 배포 | แพตช์ (ลงแพตช์) / deploy (การ deploy) | |
| 게임 가속기 | โปรแกรมลดปิง | What Thai players call ExitLag-type tools |
| 안티치트 / 오버레이 | anti-cheat / โอเวอร์เลย์ | แอนตี้ชีต |
| 셰이더 컴파일 / 셰이더 캐시 | การคอมไพล์ shader / shader cache | การคอมไพล์เชเดอร์ |
| 에셋 로딩 / 지연 로딩 | การโหลดแอสเซ็ต / lazy loading | |
| 재접속 | เชื่อมต่อใหม่ (reconnect) | |

### Player side, home and ISP
| Korean | Prose | Note |
|---|---|---|
| 유저 | ผู้เล่น | “ผู้ใช้” only in the OS/software sense (user space) |
| 회선 | เน็ต (player’s connection), ลิงก์ / วงจร (DC, backbone) | 회선이 흔들린다 → จิตเตอร์สูง, เน็ตไม่นิ่ง; 집 회선 → เน็ตบ้าน |
| 통신사 | ISP; ค่ายเน็ต in player-facing text; ค่ายมือถือ for cellular | 통신사망 → เครือข่ายของ ISP. Keep Korean ISP names (KT, SK Broadband, LG U+) |
| 공유기 | เราเตอร์ | |
| 와이파이 / 유선 / 모바일망 / LTE·5G | Wi-Fi / สาย LAN / เครือข่ายมือถือ / LTE หรือ 5G | |
| 무선 채널 | ช่องสัญญาณไร้สาย | Never แชนแนล (that is the game channel) |
| 핸드오버 | handover | แฮนด์โอเวอร์ |
| 버퍼블로트 / SQM / QoS | bufferbloat / SQM / QoS | บัฟเฟอร์โบลต |
| NAT / NAT 테이블 / CGNAT | NAT / ตาราง NAT / CGNAT | |
| 피어링 / 경로 / 우회 경로 / 병목 구간 | peering / เส้นทาง / เส้นทางอ้อม / คอขวด | พีริง. 먼 경로로 우회한다 → อ้อมไปทางไกล |
| 해저 케이블 / 장거리 구간 | เคเบิลใต้น้ำ / เส้นทางระยะไกล | |
| 피크 시간 | ช่วงพีค (ช่วงพีคหัวค่ำ) | |
| 저궤도 위성 인터넷 | อินเทอร์เน็ตดาวเทียมวงโคจรต่ำ (LEO) | Geostationary → วงโคจรค้างฟ้า |
| 절전 상태 / 절전 해제 | โหมดประหยัดพลังงาน / การตื่นจากโหมดประหยัดพลังงาน (wake-up) | |
| 일시 정지 / 동결 (OS on apps) | พักการทำงาน (suspend) / แช่แข็ง (freeze) | Never ค้าง |
| 백그라운드 창 / 최소화 | หน้าต่างที่อยู่เบื้องหลัง / ย่อหน้าต่าง | |
| 발열 스로틀링 | thermal throttling (เครื่องร้อนจนลดความเร็ว) | การลดความเร็วเพราะความร้อน |
| 타이머 해상도 | timer resolution | ความละเอียดของตัวจับเวลา |
| 가변 주사율 / 주사율 | VRR (อัตรารีเฟรชแบบแปรผัน) / อัตรารีเฟรช | |
| 화면 찢어짐 | ภาพฉีก (screen tearing) | |
| 프레임 생성 | frame generation | การสร้างเฟรม |

### Data center, network and NIC
| Korean | Prose | Note |
|---|---|---|
| 데이터센터 / IDC | ดาต้าเซ็นเตอร์ / IDC | |
| 방화벽 / 세션 테이블 / 연결 추적 | ไฟร์วอลล์ / ตารางเซสชัน / connection tracking (conntrack) | 연결을 추적한다 → ติดตามการเชื่อมต่อ; 추적 항목이 만료된다 → รายการที่ติดตามหมดอายุ |
| 로드밸런서 / 헬스체크 | โหลดบาลานเซอร์ / health check | |
| DDoS 방어 / 스크러빙 센터 / 오탐 | ระบบป้องกัน DDoS / scrubbing center / false positive | สครับบิงเซ็นเตอร์ |
| 스위치 / 라우터 / LAG | สวิตช์ / เราเตอร์ / LAG | |
| 마이크로버스트 / 버스트 | microburst / burst | ไมโครเบิสต์ |
| 유휴 타임아웃 / 유휴 연결 | idle timeout / การเชื่อมต่อที่ idle | |
| 조용히 버림 | ทิ้งเงียบ ๆ (silent drop) | |
| 보안 그룹 / 네트워크 ACL / VPC | security group / network ACL / VPC | |
| NAT 게이트웨이 / SNAT | NAT gateway / SNAT | NAT เกตเวย์ |
| 공인 IP / 사설망 | public IP / เครือข่ายส่วนตัว (private network) | |
| 클라우드 사업자 / 인스턴스 / 호스트 점검 | ผู้ให้บริการคลาวด์ / อินสแตนซ์ / การซ่อมบำรุงโฮสต์ | 가상 머신 → VM |
| 라이브 마이그레이션 | live migration | ไลฟ์ไมเกรชัน |
| 노이지 네이버 | noisy neighbor | |
| 링 버퍼 / 슬롯 | ring buffer / สล็อต | ริงบัฟเฟอร์ |
| 인터럽트 / 인터럽트 병합 | อินเทอร์รัปต์ / interrupt coalescing | |
| 수신 큐 / 송신 대기열 | receive queue (RX queue) / transmit queue (TX queue) | |
| RSS / PPS / 클라우드 PPS 한도 | RSS / PPS / ขีดจำกัด PPS ของคลาวด์ | |
| 단편화 / 프래그먼트 | fragmentation / fragment | |
| MTU / MSS / MTU 블랙홀 | MTU / MSS / MTU black hole | |
| 불량 케이블 / 광모듈 | สายเสีย / โมดูลออปติก (transceiver) | |

### Server OS, sockets and TCP
| Korean | Prose | Note |
|---|---|---|
| 커널 | เคอร์เนล | |
| 접속 대기열(backlog) | คิวรอเชื่อมต่อ (backlog) | |
| 파일 디스크립터(fd) | file descriptor (fd) | ไฟล์ดิสคริปเตอร์ |
| 스케줄러 / 스케줄링 대기 / 런큐 | scheduler / รอคิว CPU / run queue | CPU를 배정받지 못한다 → ไม่ได้รับ CPU |
| 타임 슬라이스 | time slice | |
| 컨텍스트 스위칭 | context switch | การสลับคอนเท็กซ์ |
| CPU 스틸 | CPU steal | |
| CPU 스로틀링 / 주기 / 할당량 | CPU throttling / รอบ (CFS period) / โควตา (quota) | |
| 스왑 / OOM 킬러 | swap / OOM killer | สวอป |
| 시간 동기화 / 시계 점프 | การซิงก์เวลา (NTP) / นาฬิกากระโดด (NTP step) | wall clock / monotonic clock stay English |
| 임시 포트 고갈 | ephemeral port หมด | |
| 소켓 버퍼 / 수신 버퍼 / 송신 버퍼 / 넘침 | บัฟเฟอร์ซ็อกเก็ต / receive buffer / send buffer / ล้น | |
| 소켓 옵션 | socket option | |
| 재전송 / 재전송 타이머 / RTO / 재전송률 | การส่งซ้ำ (retransmission) / ตัวจับเวลาส่งซ้ำ / RTO / อัตราการส่งซ้ำ | 손실로 판단해 재전송한다 → ตัดสินว่าหายแล้วส่งซ้ำ; RTO가 만료된다 → RTO หมดเวลา |
| 불필요한 재전송 / 빠른 재전송 / 재전송 백오프 | การส่งซ้ำโดยไม่จำเป็น (spurious retransmission) / fast retransmit / retransmission backoff | |
| 순서 보장 / 보낸 순서대로만 넘겨줌 | การรับประกันลำดับ / ส่งต่อให้แอปตามลำดับที่ส่งมาเท่านั้น | |
| 시퀀스 번호 | sequence number | |
| HOL 블로킹 | HOL blocking (head-of-line blocking) | |
| thin stream / TLP / 마지막 패킷들의 손실 | thin stream / TLP / การหายของแพ็กเก็ตท้าย ๆ (tail loss) | |
| 선택적 ACK / 중간에 빠진 부분 | SACK (selective ACK) / ช่วงที่ขาดหาย | |
| ACK(수신 확인) / 지연 ACK | ACK (สัญญาณยืนยันการรับ) / delayed ACK | ACK แบบหน่วงเวลา |
| 아직 ACK를 받지 못한 패킷 | แพ็กเก็ตที่ยังไม่ได้รับ ACK (in-flight) | |
| 혼잡 / 혼잡 윈도우 / 수신 윈도우 / 윈도우 스케일 | ความแออัด (congestion) / congestion window (cwnd) / receive window (rwnd) / window scaling | |
| 제로 윈도우 / 제로 윈도우 프로브 | zero window / zero window probe | ซีโรวินโดว์ |
| 전송량 축소 | การลดอัตราการส่ง | |
| Nagle / TCP_NODELAY / keepalive / RST | Nagle / TCP_NODELAY / keepalive / RST | Keep as is. Nagle 알고리즘 → อัลกอริทึม Nagle |
| 비신뢰(unreliable) 채널 / 신뢰성 UDP | ช่องทางแบบ unreliable / reliable UDP | UDP แบบเชื่อถือได้ |
| 폴리서 / 셰이퍼 / 페이싱 / ECN | policer / shaper / pacing / ECN | |
| 블로킹 I/O / 비동기 I/O | blocking I/O / async I/O | I/O แบบอะซิงโครนัส |
| 하트비트 / 연결 유지 신호 | heartbeat / สัญญาณคงการเชื่อมต่อ | ฮาร์ตบีต |
| 타임아웃 | ไทม์เอาต์ | |

### Server process, memory, disk and database
| Korean | Prose | Note |
|---|---|---|
| 워커 / 워커 스레드 / 스레드 풀 | worker / worker thread / thread pool | เธรดพูล |
| 락 / 잠금 / 잠금 경합 / 데드락 | ล็อก / ล็อก / การแย่งล็อก (lock contention) / เดดล็อก | 락을 잡다 → ถือล็อก |
| 점유한다 (thread, connection, port, CPU) | ถือครอง | |
| 동기 호출 | synchronous call (blocking call) | |
| 호출 체인 | call chain | |
| starvation / 워치독 | starvation / watchdog | วอตช์ด็อก |
| 무한 루프 / 길찾기 / 직렬화 | ลูปไม่รู้จบ (infinite loop) / pathfinding / serialization | |
| GC / GC 멈춤 / 전체 멈춤 / Full GC | GC / GC pause / stop-the-world / Full GC | “GC가 돈다” → “GC ทำงาน”; Young/Old 영역 → Young/Old generation |
| 가비지 / 수집·회수 | garbage / เก็บคืน (collect) | |
| 힙 / 할당 | heap / การจัดสรร (allocation) | ฮีป |
| 메모리 누수 / 단편화 | หน่วยความจำรั่ว (memory leak) / fragmentation | |
| 캐시 미스 / 메모리 계층 | cache miss / ลำดับชั้นหน่วยความจำ | แคชมิส |
| 동기 쓰기 / fsync | การเขียนแบบ synchronous / fsync | |
| IOPS / 처리량 / 처리량 한도 / 대역폭 | IOPS / throughput / ขีดจำกัด throughput / แบนด์วิดท์ | |
| 버스트 크레딧 / 적립량 | burst credit / ยอดเครดิตสะสม | เบิสต์เครดิต |
| 페이지 캐시 / 디스크에 기록 | page cache / เขียนลงดิสก์ (flush) | |
| 백업 / 스냅숏 (disk) | การสำรองข้อมูล (backup) / สแนปช็อตดิสก์ | |
| 커넥션 풀 / 커넥션 풀 고갈 | connection pool / connection pool หมด | คอนเนกชันพูล |
| 쿼리 / 인덱스 / 컬럼 / 스키마 변경(DDL) | คิวรี / อินเด็กซ์ / คอลัมน์ / การเปลี่ยนสคีมา (DDL) | |
| 풀 스캔 / 실행 계획 | full table scan / query plan | ฟูลสแกน / แผนการรันคิวรี |
| 행 / 행 잠금 / 핫 로우 / 잠금 에스컬레이션 | แถว / row lock / hot row / lock escalation | ฮอตโรว์. First mention: “hot row (แถวที่ทุกคนพยายามแก้พร้อมกัน)” |
| 트랜잭션 / 롤백 / 언두 로그 / MVCC | ทรานแซกชัน / โรลแบ็ค / undo log / MVCC | |
| 복제 / 복제본 / 주 DB / 복제 지연 | replication / replica / DB หลัก (primary) / การทำสำเนาข้อมูลล่าช้า | replication lag only for the measured value (see §14) |
| 체크포인트 / 로그 플러시 | checkpoint / log flush | เช็กพอยต์ |
| 장애 전환 | failover | เฟลโอเวอร์ |
| 캐시 / 캐시 서버 / 콜드 캐시 / 캐시 스탬피드 | แคช / เซิร์ฟเวอร์แคช / cold cache / cache stampede | แคชสแตมปีด |

### Architecture, operations and observability
| Korean | Prose | Note |
|---|---|---|
| 서버 구성 | สถาปัตยกรรมเซิร์ฟเวอร์ | |
| 게이트웨이 / 부가 서버 | เกตเวย์ / เซิร์ฟเวอร์เสริม | |
| 연쇄 장애 / 서킷 브레이커 | cascading failure / circuit breaker | ความล้มเหลวแบบลูกโซ่ / เซอร์กิตเบรกเกอร์ |
| 재시도 폭풍 / 로그인 폭주 / 접속 폭주 | retry storm / คนแห่ล็อกอิน (login storm) / การเชื่อมต่อทะลัก | |
| 오토스케일링 | autoscaling | ออโตสเกลลิง. 늘어나는 데 시간이 걸림 → การเพิ่มเครื่องต้องใช้เวลา |
| 서비스 디스커버리 / 외부 서비스 의존 | service discovery / การพึ่งพาเซอร์วิสภายนอก | |
| 장애 | เหตุขัดข้อง (incident, outage) | 장애가 난다 → ล่ม / ขัดข้อง; 서버가 죽는다 → เซิร์ฟเวอร์ล่ม / แครช |
| 사후 분석 | postmortem | การวิเคราะห์หลังเกิดเหตุ |
| 크론 작업 | cron job | |
| 모니터링 / 경보 / 지표 / 로그 | มอนิเตอร์ / alert / เมตริก / log | |
| 이용률 / 대기열 | อัตราการใช้งาน (utilization) / คิว | 대기열에 쌓인다 → คิวสะสม, กองรอในคิว |
| 평균 / 중앙값 / 백분위수 / p99 / 꼬리 지연 | ค่าเฉลี่ย / ค่ามัธยฐาน / เปอร์เซ็นไทล์ / p99 / tail latency | ความหน่วงส่วนหาง |
| 합성 측정 / 집계 간격 | synthetic monitoring / ช่วงเวลารวมค่า | การวัดแบบสังเคราะห์ |
| 인프라 도구 | เครื่องมือฝั่งอินฟรา | |
| 설정 변경 | การเปลี่ยนคอนฟิก | |
| 원개발사 / 운영사 | ผู้พัฒนาต้นทาง / ผู้ให้บริการเกม | |

## 12. Korean constructions and words to watch

- **Word order**: Korean stacks long modifiers before the noun. Thai puts the noun first and follows with “ที่…”: “서버가 게임 상태를 한 번 계산하는 간격” → “ระยะห่างที่เซิร์ฟเวอร์คำนวณสถานะเกมหนึ่งครั้ง”. Split sentences longer than about two clauses.
- **Topic markers (은/는)**: usually drop them; for contrast use “ส่วน…” (“ส่วน TCP จะ…”).
- **Conditionals (~면)**: “ถ้า … ก็ …” / “ถ้า … จะ …”. **Cause (~때문에)**: “เพราะ…”, result “จึง…”. Do not open every sentence with “ดังนั้น”.
- **~기도 합니다** → “บางครั้ง…” / “อาจ…ได้”. **~는 편이다** → “ค่อนข้าง…”. **~중심으로** → “เน้น…”.
- **Passive**: Thai “ถูก/โดน” carries an adverse sense. Use it for things that happen to data or players (“แพ็กเก็ตถูกทิ้ง”, “โดนดึงกลับ”); otherwise prefer the active voice.
- **Padding**: no “ทำการ + verb”, no “ในส่วนของ”, no “มีการ…” when a plain verb works, no chains of “ซึ่ง…ซึ่ง…”.
- **Onomatopoeia**: 멈칫 → หยุดแวบ; 휙 → วืด / ทันที; 파파파팍 → รัว ๆ; 뚝 떨어짐 → ดิ่งลง.
- 렉이 생기다/걸리다 → แลค (“เกมแลค”). 튕기다 → เด้ง, หลุด. 버벅이다 → กระตุก, สะดุด. 굼뜨다 → อืด (world) / ตอบสนองช้า (input). 손맛 → ฟีล. 서버가 굳는다 → เซิร์ฟเวอร์หยุดตอบสนอง.
- 체감 → ความรู้สึกขณะเล่น / ฟีล; 확인형 행동 → การกระทำที่ต้องรอเซิร์ฟเวอร์ยืนยัน; 대표값 → ค่าตัวแทน; 공신력 있는 출처 → แหล่งอ้างอิงที่เชื่อถือได้; 공인 → เป็นทางการ.
- 기획·아트·QA·PM → ทีมเกมดีไซน์, อาร์ต, QA และ PM.
- “เซิร์ฟ” (short for เซิร์ฟเวอร์) only in fixed player phrases: เปิดเซิร์ฟ, ทั้งเซิร์ฟ, เซิร์ฟแลค. Everywhere else write เซิร์ฟเวอร์. Likewise “เน็ต” is fine for the player’s connection; write “เครือข่าย” for networks in general.
- 해 보세요 → “ลอง…ดู”. 적어 주세요 (report guide) → “โปรดระบุ…” or a plain imperative; no ครับ/ค่ะ.
- No analogies outside the source’s analogy boxes (`class="analogy"`); use the industry term.

## 13. SEO notes

Phrases people in Thailand actually type when a game lags or when they investigate server-side lag:

1. เกมแลค
2. เกมแลคเกิดจากอะไร / แลคเกิดจากอะไร
3. สาเหตุเกมแลค
4. ปิงสูง / ปิงสูงแก้ยังไง
5. ปิงแกว่ง / ปิงไม่นิ่ง
6. ปิงพุ่ง
7. packet loss คืออะไร / แก้ packet loss
8. เกมกระตุก
9. ตัวละครวาร์ป
10. ดีดกลับ / rubber banding
11. เกมหลุดบ่อย / เกมเด้ง
12. เข้าเกมไม่ได้ / โหลดไม่เข้า
13. เซิร์ฟแลค / เซิร์ฟเวอร์แลค
14. เน็ตดีแต่เกมแลค
15. input lag / อินพุตดีเลย์
16. jitter คืออะไร
17. tick rate คืออะไร
18. netcode
19. แลคเพราะเน็ตหรือเซิร์ฟ
20. เกมค้าง

How they are used:
- Site name “คู่มือเกมแลค” contains (1). Main title “คู่มือเกมแลค: เกมออนไลน์แลคเกิดจากอะไร และใครต้องแก้” matches (2) and (3) and states the unique angle (who fixes it).
- Meta description opens with the question players ask: “เกมออนไลน์แลค ภาพกระตุก ตัวละครวาร์ป หรือหลุดจากเกม เกิดจากอะไร”, covering (1), (8), (9), (11), then “MMO”, “ทีมพัฒนาเกม/ทีมอินฟรา”.
- Symptom pages: “อาการ{name}เกิดจากอะไร: สาเหตุเกมแลคแยกตามอาการและทีมที่ต้องแก้”, so “อาการกระตุกเกิดจากอะไร”, “อาการดีดกลับเกิดจากอะไร”, “อาการหลุดเกิดจากอะไร” line up with (8), (10), (11), (20).
- Cause pages: “{name} ({English name}): สาเหตุเกมแลค | คู่มือเกมแลค”.
- Keywords meta: สาเหตุเกมแลค, เกมแลค, ปิงสูง, ปิงแกว่ง, เกมกระตุก, วาร์ป, ดีดกลับ, อินพุตดีเลย์, เกมหลุด, เซิร์ฟแลค, netcode, TCP retransmission, ทีมพัฒนาเกม, ทีมอินฟรา.
- Structured-data topics (`about`): เกมแลค, ความหน่วงของเครือข่าย, จิตเตอร์, แพ็กเก็ตหาย, netcode, การส่งซ้ำ TCP, ประสิทธิภาพเซิร์ฟเวอร์เกม.
- Link-preview image (`tools/og.cjs`): “คู่มือ<span>เกมแลค</span>” highlights the search keyword.
- Never stack keywords; each phrase must read as part of a sentence or a natural title. Player slang (ปิงแกว่ง, เกมเด้ง, โปรแกรมลดปิง) belongs in player-facing text, aliases and SEO fields; engineering prose uses the terms in section 11.

## 14. Decisions added during review

Settled by the translators and reviewers after the first pass. They override any older variant still found in the files or in the sections above.

| Korean | Thai | Note |
|---|---|---|
| 서버 GC 전체 멈춤 (mem-gc title) | GC ของเซิร์ฟเวอร์หยุดทั้งระบบ | Replaces the §2 example “Full GC ของ…”; other cards quote this exact title. GC 전체 멈춤 as a general term: GC แบบหยุดทั้งระบบ (stop-the-world) |
| 멈춤 | ค้าง / หยุด, หยุดชะงัก | ค้าง for the on-screen symptom (`c` fields, symptom mentions, player-facing text); หยุด / หยุดชะงัก for a server-side stop in `s` and engineering prose. A paused video: หยุด |
| 순간이동 | วาร์ป (symptom) / เทเลพอร์ต (game feature) | |
| 입력 지연 (lockstep/rollback setting) | input delay | Latin, also local input delay; the symptom stays อินพุตดีเลย์ |
| 06장 (nav / cross-reference) | เจาะลึกการส่งซ้ำของ TCP / บท 06 เจาะลึกการส่งซ้ำของ TCP | Must match body-shell; the h2 stays as in §6 |
| 재시도 / TCP 재전송 | การลองใหม่ / การส่งซ้ำ | retry storm stays Latin |
| 중복 ACK / 지연 ACK | duplicate ACK / delayed ACK | Also in sims; not ACK ซ้ำ / ACK หน่วง. Glossary headword ACK แบบหน่วงเวลา unchanged |
| 복제 지연 | การทำสำเนาข้อมูลล่าช้า / replication lag | Thai name for the problem (db-replica-lag card, glossary headword, architecture-sim scenario, layer list); Latin only for the measured value (alerts, metric lists, graph axis) |
| 리전 | รีเจียน | ภูมิภาค only for 지역 as a geographic area (지역 서버 → เซิร์ฟเวอร์ประจำภูมิภาค) |
| 국내 (Korean operator’s view), 한국 | เกาหลี | “ในเกาหลีปกติดี…”; never เกาหลีใต้. A generic “server in your own country” in sim presets stays เซิร์ฟเวอร์ในประเทศ |
| 게임팀, 개발팀 | ทีมพัฒนาเกม | not ทีมเกม / ทีมพัฒนา |
| DB 조회 | ดึงข้อมูล / คิวรี | never ค้นหา |
| 경매장 | ตลาดประมูล | never โรงประมูล |
| 던전 | ดันเจี้ยน | not ดันเจียน |
| 퀘스트 / 빌드 | เควสต์ / บิลด์ | development build, debug build stay Latin |
| 연결별 | แยกตามการเชื่อมต่อ / ของแต่ละการเชื่อมต่อ | avoid รายการเชื่อมต่อ (reads as “connection list”) |
| 타임아웃 (standalone) | ไทม์เอาต์ | heartbeat ไทม์เอาต์; idle timeout stays Latin |
| 먼저 부를 곳 | เรียกใครก่อน | label in playbooks, owners table and signal table |
| 주의 (table column) | ข้อควรระวัง | the ui-kit badge stays ระวัง |
| 장애 채널 | ห้องแชต | |
| 회고 (published postmortem) | บทวิเคราะห์ย้อนหลัง | |
| 거점, PoP | จุดให้บริการ (PoP) | |
| 카나리 / 대조군 | canary / กลุ่มควบคุม | |
| 상태 페이지 | หน้าสถานะ | |
| 확장팩 / 기믹 / 파티장 | ภาคเสริม / กิมมิค / หัวปาร์ตี้ | |
| 트래픽 지문 | fingerprint ของทราฟฟิก | |
| 백본 | แบ็กโบน | |
| 우회 라우팅 / 중계 서버 | เส้นทางวิ่งอ้อม / เซิร์ฟเวอร์ตัวกลาง (relay) | |
| 가입자 / 가입자망 | ผู้ใช้บริการ / วิธีเชื่อมต่อ (label), ช่วงจากบ้านถึง ISP (prose) | |
| 광케이블 | ไฟเบอร์ออปติก | |
| 스토리지 | สตอเรจ | |
| 백신 | แอนตี้ไวรัส | |
| 외장 / 내장 그래픽 | การ์ดจอแยก / กราฟิกออนบอร์ด | |
| 전용 / 공유 GPU 메모리 | หน่วยความจำ GPU เฉพาะ / ที่ใช้ร่วมกัน | |
| 저지연 모드 / 클럭 | โหมด low latency / คล็อก | |
| 공통 쿨다운 / 강화 | คูลดาวน์รวม / ตีบวก | |
| 기지국 / 전화국 / 광랜 | เสาสัญญาณ / ชุมสาย / เน็ตไฟเบอร์ | |
| UPS | ระบบป้องกันไฟดับ | |
| 아이템 복사 | การก๊อปไอเทม (dupe) | |
| 우편 | จดหมาย, กล่องจดหมาย | |
| PC방 | ร้านเกม | |
| 유령 세션 / 무응답 타임아웃 | เซสชันผี / ไทม์เอาต์ไม่ตอบสนอง | |
| 예고 (boss attack) | สัญญาณเตือน | |
| 응답 시간 | เวลาตอบสนอง | |
| 서버 틱 시간 | เวลาต่อทิกของเซิร์ฟเวอร์ | |
| 패킷 캡처 | packet capture | |
| 하이퍼바이저 | ไฮเปอร์ไวเซอร์ | |
| 리스폰 / 소환 / 몰이 / 사냥터 | รีสปอน / ซัมมอน / ลากมอน / จุดฟาร์ม | |
| 저장 / 주기 저장 | เซฟ / เซฟตามรอบ | |
| 살아 있는 데이터 (GC) | ข้อมูลที่ยังใช้อยู่ | |
| 크레딧 잔량 / 포화 | เครดิตคงเหลือ / อิ่มตัว | |
| 전멸 | ตายยกปาร์ตี้ | |
| 재접속 유예 시간 | grace period ตอนเชื่อมต่อใหม่ | |
| 오탐 | false positive | |
| 구성도 실험 | การทดลองแผนผังสถาปัตยกรรม | |
| `chk` line with two conditions | second condition starts with “ถ้า” | |
