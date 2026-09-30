# Vietnamese (vi) terminology and style guide

This file is binding for everyone who translates the Game Lag White Paper into Vietnamese (`src/i18n/vi/*.json`). Read it together with `docs/I18N_GUIDE.md` (format rules) and `docs/TERMS.md` (Korean standard terms). If a Korean term is not listed here, pick the word a Vietnamese game server/client developer or SRE would say in a standup, and keep it consistent inside your group.

Target reader: a Vietnamese planner, artist, QA, PM, or junior developer. The text must read as if a senior Vietnamese game developer who also knows data centers and cloud wrote it. No machine-translation tone, no Korean word order, no calques.

## 1. Site name and titles

| Item | Vietnamese |
|---|---|
| Site name (`게임 렉 백서`) | **Sách trắng lag game** |
| Full title (build.py) | Sách trắng lag game: nguyên nhân lag game online và đội phụ trách khắc phục |
| `… \| 게임 렉 백서` in page titles | `… \| Sách trắng lag game` |
| Hero `<h1>` (body-shell) | `Sách trắng<br><span class="ping">lag game</span>` |
| Text edition (`텍스트 판`) | Phiên bản văn bản |
| Original (`원본`) | Bản gốc |
| Link-preview image `<h1>` (tools/og.cjs) | `Sách trắng <span>lag game</span>` |
| `온라인 게임 렉 원인 백과` (og kicker) | Bách khoa nguyên nhân lag game online |

Why: Vietnamese players and developers write "lag" (never a Vietnamese equivalent) and search "lag game", "game bị lag", "nguyên nhân lag game". "Sách trắng" is the established Vietnamese rendering of "white paper". Write the name in sentence case; do not add "về", do not translate "lag".

## 2. Register and style

- **Prose** (`s`, `c`, `more`, `num`, `act`, body text): neutral, polite written Vietnamese as in good technical documentation. Declarative sentences, no slang, no exclamation marks. Address the reader as **bạn** where the Korean says 내/나 from the player's point of view (`내 화면` → màn hình của bạn, `내 PC` → PC của bạn). Use **tôi** only where the Korean is a player's own words (the who value `나만` → Chỉ mình tôi, report examples).
- Korean often drops the subject. Vietnamese needs one: add the actor (server, client, game, người chơi, OS, router) when the sentence would otherwise be unclear.
- Split long Korean sentences with stacked pre-noun modifiers into two sentences or a main clause plus a relative clause (`… mà …`, `… , vốn …`). Do not keep Korean order `[long modifier] + noun`.
- Imperative advice ("~하세요", "~를 봅니다" meaning "check X") → `Hãy xem …`, `Kiểm tra …`, or plain `Xem …` in lists.
- **`chk` fields** (`look`, `yes`, `no`) and `act` items are Korean 개조식 (terse, noun endings like ~함, ~임, ~봄). Write terse fragments: no subject pronoun, no "bạn", no "Hãy", no polite particles. Examples:
  - `look`: `Log GC của server và thời điểm người chơi báo lag`
  - `yes`: `thời gian dừng trong log GC trùng với lúc lag, khoảng cách đều`
  - `no`: `log GC không có lần dừng nào vào lúc lag → xem “Tick budget bị vượt”`
  - Keep a final period only if the Korean has one.
  - These fragments follow the labels **Chỗ cần xem / Đúng nếu / Loại trừ nếu**, so `yes`/`no` must read naturally after "Đúng nếu:" and "Loại trừ nếu:" (start with a lowercase noun phrase or clause).
- When Korean text quotes another cause card by name in “…”, use that cause's Vietnamese `t` exactly (check `causes-*.json` of that layer; if not translated yet, translate it the way its own group will, and note it in your report).
- Keep facts, numbers, versions, commands, IDs, URLs, product names unchanged. Do not add or remove facts. Korean-specific facts (Korean ISPs, Seoul↔Tokyo, Korean agencies) stay as they are; do not replace them with Vietnamese examples.

## 3. Punctuation and typography

- Quotes: curly double quotes “…” as in the Korean. Nested: ‘…’. No 「」.
- A space before an opening parenthesis and after a closing one (Korean writes `지터(도착…)`; Vietnamese writes `jitter (độ dao động …)`). No space inside the parentheses. Exception: code, IDs, placeholders written together in the source such as `link(#c-ID)`.
- No space before `: ; ? ! ,` and `.`; one space after.
- Korean middle dot `·`:
  - In **prose**, render as `, `, `và`, or `hoặc` according to meaning (`클라이언트·서버 코드` → code client và server).
  - In **fixed short labels** (layer `short`, owner `short`, the three compound symptom names) keep `·` without spaces (`Wi-Fi·router`, `Nuốt thao tác·rollback`).
  - In `who`/`when` values never use a comma inside the value (these values are joined with ", "); use `hoặc`.
- Ranges: Korean `~` → en dash without spaces (`0,2–0,5 giây`, `1–5 m`) or `từ … đến …` in prose. For vague ranges (`수~수십 ms`) write `vài ms đến vài chục ms`.
- Ellipsis `…` stays `…`. Korean `등` at the end of a list → `…`, `v.v.`, or rephrase with `như …`.
- Arrows `→`, `↔` stay.
- Slash lists in report examples (`나만 / 파티원도 / …`) keep ` / ` with spaces.
- Capitalize the first letter of every label, heading, list item, and data `name`. In running text, write symptom names, team names and layer names in lowercase (`gây giật khựng`, `đội hạ tầng phụ trách`), except inside “…” quotes or when a placeholder inserts the capitalized data name (then wrap it in “…” if it sits mid-sentence).
- English terms kept as-is are written in lowercase in running text unless they are acronyms or proper names (`tick`, `snapshot`, `lock`, `heartbeat`; but `GC`, `TCP`, `Linux`, `Windows`).

## 4. Numbers and units

- Decimal separator: **comma** (`0,25 giây`, `16,7 ms`). Thousands separator: **dot** (`1.500 byte`, `10.000 lần`). This matches the site's number formatting for `vi-VN`, which the simulations use (`K.n`).
- Never change digits inside versions, IP addresses, RFC numbers, kernel versions, code and commands (`Windows 10 (1607)`, `Linux 4.4`, `RFC 8985`, `net.core.somaxconn`).
- Avoid lists of decimal numbers separated by commas (`0,1, 0,5`): use `và`, `hoặc`, or a semicolon.
- One space between a number and a unit or unit symbol: `50 ms`, `1,5 giây`, `100 Mbps`, `60 Hz`, `60 FPS`, `20 tick`, `1.500 byte`, `4 GB`, `90 km`. Exception: `%` is written without a space (`1%`, `80–90%`).
- Unit symbols `ms`, `µs`, `ns`, `Gbps`, `Mbps`, `GB`, `Hz` stay. `초` → `giây`, `분` → `phút`, `시간` → `giờ`, `일` → `ngày`, `바이트` → `byte`, `번` (times) → `lần`, `배` → `lần`/`gấp đôi`.
- Korean number words may become digits (`두 배` → `2 lần` or `gấp đôi`, `1만` → `10.000`). `i18n.cjs check` may then warn "숫자가 다름"; that warning is acceptable only for this reason.
- Keep "1" when the Korean has `1초`/`1ms` (`20 lần trong 1 giây`, not `20 lần mỗi giây`), so number checks stay clean.

## 5. Placeholders and plurals

- Keep every `{0}`, `{1}` …; move them to fit Vietnamese word order. The number comes before the noun: `원인 {0}가지` → `{0} nguyên nhân`, `출처 {0}건` → `{0} nguồn`, `{0}개` → `{0} …`.
- Vietnamese nouns do not inflect for number, so `{0} nguyên nhân` is correct for 1 and for 228. Do not add `các`/`những` before a number placeholder, and do not use `một số` for a placeholder.
- When a placeholder inserts a capitalized name (symptom, cause, layer) in the middle of a sentence, wrap it in “…” (`gây ra “{0}”`), or put it at the start of the string or after a colon.
- When the placeholder is filled with HTML (check the `ctx` file:line), keep surrounding spaces exactly as the Korean does.

## 6. Two banned sentence patterns, in Vietnamese form

1. **No em-dash asides.** Do not insert explanations with `—` or ` – ` in the middle of a sentence (`Server — vốn đang quá tải — bỏ gói`). Use parentheses, a comma clause, or a second sentence. (An en dash between numbers for a range is fine.)
2. **No "not A but B".** Avoid `không phải A mà là B`, `không phải do A mà do B`, `A chứ không phải B`, `không phải A, mà B`. State B directly. If A must be mentioned, put it in its own sentence: `Nguyên nhân nằm ở phía server. Đường truyền vẫn bình thường.` `thay vì` (instead of) and Korean `~지 않고` (`không … mà …` as "without doing X, do Y") are allowed when they describe a procedure, not a contrast of explanations.

## 7. Terminology: fixed names

### 7.1 The 11 symptom names (use exactly these everywhere)

Capitalize as a label; lowercase in running text (`hiện tượng giật khựng`). Never use these words for anything other than the symptom (for a CPU "burst" write `dùng CPU dồn dập`, for a general "freeze" write `dừng`, `đứng`).

| id | Korean | Vietnamese name | Aliases (`alias`, and words you may meet in player reports) | Note |
|---|---|---|---|---|
| stutter | 뚝뚝 끊김 | **Giật khựng** | giật, giật lag, khựng, cảm giác như tụt FPS | "giật" is what VN players say for stutter |
| teleport | 순간이동 | **Dịch chuyển tức thời** | warp, teleport, đứng im rồi nhảy sang chỗ khác | standard VN game word for teleport |
| rubber | 고무줄 | **Kéo ngược** | bị kéo lại, giật lùi, rubber banding, bị trả về vị trí cũ | in prose: `bị kéo ngược về chỗ cũ` |
| burst | 몰아치기 | **Tua nhanh** | dồn cục, như tua video, xử lý dồn một lúc | pair with Quay chậm (video metaphors, like the Korean) |
| slowmo | 슬로우모션 | **Quay chậm** | slow motion, cả thế giới chậm lại, mọi thứ ì ạch | |
| delay | 입력 지연 | **Trễ thao tác** | input lag, delay, phản hồi chậm, thiếu cảm giác tay | "input lag" is also fine in parentheses |
| freeze | 멈춤 | **Đứng hình** | đơ, treo, không phản hồi | |
| dropped | 씹힘·롤백 | **Nuốt thao tác·rollback** | nuốt skill, vật phẩm bị trả lại, giao dịch thất bại | `스킬 씹힘` → nuốt skill |
| disconnect | 접속 끊김 | **Mất kết nối** | văng game, rớt mạng, “Đã mất kết nối với máy chủ” | the quoted in-game message uses "máy chủ" as VN clients do |
| noconnect | 접속 불가·무한 로딩 | **Không vào được·kẹt loading** | không đăng nhập được, loading mãi không xong | |
| invisible | 안 보임·유령 개체 | **Không hiển thị·đối tượng ma** | không thấy NPC, nhân vật vô hình, quái đã chết vẫn đứng đó | avoid "tàng hình" (it is a stealth skill in games) |

Other symptom words: `멈칫` → khựng (short pause, not the name), `튐` (ping/value) → vọt lên / nhảy (`ping nhảy`), `파파파팍` → dồn cục.

### 7.2 The four factors (`fx`)

| Korean | Vietnamese | English |
|---|---|---|
| 지연 | **Độ trễ** | Latency |
| 지터 | **Jitter** (first mention per chapter: `jitter (độ dao động của khoảng cách giữa các lần gói tin đến)`) | Jitter |
| 손실 | **Mất gói** (in prose also `mất gói tin`; rate: `tỷ lệ mất gói`) | Packet loss |
| 정체 | **Ngưng trệ** (processing stall; do not confuse with the symptom Đứng hình) | Stall |
| 네 가지 요인 / 요인 | bốn yếu tố / yếu tố | |

### 7.3 Layers (13) and topics (3)

| id | name | short (nav, tables) |
|---|---|---|
| client-game | Tiến trình game phía client | Game của bạn |
| client-os | OS và thiết bị phía client | PC·điện thoại |
| home | Mạng gia đình | Wi-Fi·router |
| isp | Đường truyền Internet | Nhà mạng·quốc tế |
| dc-net | Thiết bị mạng trung tâm dữ liệu | Tường lửa·LB |
| nic | Card mạng server | NIC |
| server-os | OS server (kernel) | Kernel |
| socket | Socket và giao thức | TCP·UDP |
| server-proc | Tiến trình game phía server | Tick·thread |
| memory | Bộ nhớ | GC·rò rỉ |
| disk | Ổ đĩa | IOPS |
| db | Cơ sở dữ liệu | DB |
| infra | Kiến trúc và vận hành server | Kiến trúc·vận hành |
| sync (topic) | Thiết kế đồng bộ | Thiết kế đồng bộ |
| partial (topic) | Sự cố chỉ một số người gặp | Chỉ một số người |
| retrans (topic) | Nguyên nhân gốc của truyền lại TCP | Truyền lại TCP |

Sides: `내 쪽` Phía người chơi · `가는 길` Đường đi · `서버 쪽` Phía server · `양쪽 끝` Hai đầu · `설계` Thiết kế · `범위` Phạm vi · `원인` Nguyên nhân. `층` → tầng (`13개 층` → 13 tầng), `주제` → chủ đề.

### 7.4 Teams and owners

Team names are labels (capitalized); in running text lowercase: `đội phát triển game`, `đội hạ tầng`, `bên ngoài`.

| Korean | Vietnamese | Note |
|---|---|---|
| 게임개발팀 | **Đội phát triển game** | |
| 인프라팀 | **Đội hạ tầng** | |
| 외부 | **Bên ngoài** | users, ISPs, cloud providers |
| cli 클라이언트 개발 / 클라이언트 | Phát triển client / Client | |
| srv 서버 개발 / 서버 | Phát triển server / Server | |
| net 네트워크 인프라 / 네트워크 | Hạ tầng mạng / Mạng | |
| sys 서버 인프라 / 서버 장비·OS | Hạ tầng server / Thiết bị server·OS | |
| dba DB 인프라 / DB 장비 | Hạ tầng DB / Thiết bị DB | |
| ext 외부 / 유저·통신사·클라우드 | Bên ngoài / Người chơi·nhà mạng·cloud | |
| 주 담당 / 함께 / 담당 | Phụ trách chính / Phối hợp / Phụ trách | |
| 할 일, 팀별 할 일 | việc cần làm, việc của từng đội | `{0} 할 일` → `Việc cần làm ({0})` |
| 게임개발팀이 할 일 / 인프라팀이 할 일 / 유저 안내·외부 요청 | Việc của đội phát triển game / Việc của đội hạ tầng / Hướng dẫn người chơi, yêu cầu bên ngoài | |
| 담당 코드 | mã phụ trách | |
| 우리 계약 밖 | ngoài phạm vi hợp đồng của chúng ta | |
| 우회 (대응) | workaround, đi đường vòng | |

### 7.5 Who / when values

| key | who | | key | when |
|---|---|---|---|---|
| me | Chỉ mình tôi | | always | Luôn luôn |
| home | Cùng một nhà | | peak | Giờ cao điểm buổi tối |
| region | Một khu vực hoặc nhà mạng | | event | Khi đông người |
| zone | Một địa điểm hoặc kênh | | login | Ngay sau đăng nhập hoặc bảo trì |
| server | Cả server | | idle | Sau khi để yên một lúc |
| feature | Chỉ một tính năng | | random | Thỉnh thoảng bất chợt |
| onechar | Chỉ một nhân vật trông bất thường | | periodic | Theo chu kỳ đều |
| oneclient | Chỉ một client trên cùng PC | | uptime | Càng chạy lâu càng nặng |
| | | | moving | Khi di chuyển hoặc chuyển bản đồ |
| | | | action | Khi làm một thao tác nhất định |

Card labels: `누가 (겪나)` Ai gặp (phải) · `언제` Khi nào.

### 7.6 Graph shapes (`sigs`, 13)

| id | Vietnamese name |
|---|---|
| periodic | Vọt lên theo chu kỳ |
| random | Thỉnh thoảng vọt lên bất chợt |
| step | Tăng như bậc thang từ một thời điểm |
| ramp | Tăng dần |
| sawtooth | Tăng dần rồi rơi thẳng |
| peak | Chỉ cao vào một khung giờ |
| load | Tăng theo số người và tải |
| ceiling | Chạm giới hạn rồi đi ngang |
| high | Luôn cao ngay từ đầu |
| outlier | Chỉ một phần cao |
| gap | Đứt quãng rồi dồn về |
| drop | Rớt kết nối hàng loạt |
| surge | Tăng vọt ngay sau đăng nhập hoặc bảo trì |

`그래프 모양` → dạng đồ thị; `그래프에서는` → Trên đồ thị; `스파이크`/`튐` on a chart → vọt lên (spike).

### 7.7 Check-by (`chkBy`) and card labels

| Korean | Vietnamese |
|---|---|
| ops 인프라 도구로 확인(게임 코드 불필요) | Kiểm tra bằng công cụ hạ tầng (không cần code game) |
| code 게임 서버·클라이언트의 로그·지표가 필요 | Cần log và chỉ số của server, client game |
| user 유저 쪽 환경에서 확인 | Kiểm tra ở môi trường phía người chơi |
| short forms 인프라 도구 / 게임 로그·지표 / 유저 쪽 | Công cụ hạ tầng / Log, chỉ số game / Phía người chơi |
| 확인할 곳 / 이러면 맞음 / 이러면 아님 / 확인 수단 | Chỗ cần xem / Đúng nếu / Loại trừ nếu / Cách kiểm tra |
| 왜 / 그러면 / 화면에서는 | Vì sao / Dẫn đến / Trên màn hình |
| 증상 / 수치 감각 / 더 알아보기 / 출처 | Triệu chứng / Con số tham khảo / Tìm hiểu thêm / Nguồn |
| 실제 사례, 실제 장애 사례 | Sự cố thực tế |
| 무슨 일 / 배울 점 / 관련 원인 / 원문 | Chuyện gì xảy ra / Bài học / Nguyên nhân liên quan / Bài gốc |
| 링크 복사 / 관련 장 → | Sao chép liên kết / Chương liên quan → |
| 원인 ID | ID nguyên nhân |

### 7.8 Chapter titles (recommended, for body translators)

| Korean | Vietnamese |
|---|---|
| 렉은 네 가지 요인으로 만들어진다 | Lag sinh ra từ bốn yếu tố |
| 패킷의 이동 경로: 내 손가락에서 서버의 DB까지 | Hành trình của gói tin: từ ngón tay bạn đến DB của server |
| 렉 실험실 | Phòng thí nghiệm lag |
| 증상 사전 | Từ điển triệu chứng |
| 같은 핑, 다른 체감: 동기화 방식 | Cùng ping, khác cảm giác: cơ chế đồng bộ |
| 한 명만 느릴 때, 한쪽만 이상할 때 | Khi chỉ một người chậm, khi chỉ một bên bất thường |
| TCP 재전송: 왜 생기고, 왜 이렇게 느려지나 | Truyền lại TCP: vì sao xảy ra và vì sao chậm đến vậy |
| 게임개발팀이 고칠 것, 인프라팀이 고칠 것 | Việc của đội phát triển game, việc của đội hạ tầng |
| 진단 도우미 | Công cụ chẩn đoán |
| 관측으로 판정하기 | Chẩn đoán từ dữ liệu quan sát |
| 범위 → 시점 → 계층 | Phạm vi → Thời điểm → Tầng |
| 사례와 절차 / 상황별 절차 | Sự cố thực tế và quy trình / Quy trình theo tình huống |
| 패치 이후 렉 / 해외 국가 추가 | Lag sau bản cập nhật / Mở thêm quốc gia ở nước ngoài |
| 렉 제보 잘하는 법 | Cách báo lag hiệu quả |
| 용어 사전 / 참고 문헌 | Thuật ngữ / Tài liệu tham khảo |
| 직접 해보기 / 이렇게 해보세요 / 상황 불러오기 | Tự tay thử / Hãy thử như sau / Chọn tình huống |

`실험` (interactive experiment on the page) → thí nghiệm; `시뮬레이션` → mô phỏng; `백서` → sách trắng.

## 8. Terminology: general vocabulary

Rule of thumb: keep the English word where Vietnamese developers and SREs say it in English (tick, snapshot, lock, thread, heartbeat, timeout, cache, index, transaction, rollback, failover). Use the Vietnamese word where it is the normal textbook and industry word (độ trễ, gói tin, hàng đợi, băng thông, nội suy, truyền lại, bộ nhớ, ổ đĩa, tường lửa, bộ cân bằng tải). When the table gives "Vietnamese (English)", write the English in parentheses only at the first mention in a card or chapter.

### 8.1 Game side

| Korean | Vietnamese | Note |
|---|---|---|
| 렉 | lag | `bị lag`, `gây lag` |
| 핑 | ping | `ping cao`, `ping nhảy` (spiky ping) |
| 유저 | người chơi | "người dùng" only for non-game infra context |
| 클라이언트, 클라 | client | never "máy khách" |
| 서버 | server | never "máy chủ", except in quoted in-game messages |
| 캐릭터 / 몬스터 / NPC | nhân vật / quái / NPC | |
| 개체 | đối tượng (entity) | `개체 ID` → ID đối tượng |
| 스킬 / 쿨다운 / 시전 | skill / hồi chiêu / tung skill | |
| 데미지 / 이펙트 / 타격 | sát thương / hiệu ứng / đòn đánh | |
| 아이템 / 인벤토리 / 거래 | vật phẩm / túi đồ / giao dịch | **giao dịch = in-game trade only**; DB transaction is `transaction` |
| 파티, 파티원 | tổ đội, đồng đội trong tổ đội | |
| 채널 / 필드 / 던전 / 월드 보스 | kênh / bản đồ / phó bản / world boss | |
| 지역 이동, 지역 전환 | chuyển bản đồ | |
| 로딩 / 로딩 화면 | loading / màn hình loading | verb: tải |
| 접속 / 재접속 / 로그인 | kết nối, vào game / kết nối lại, vào lại game / đăng nhập | |
| 점검 | bảo trì | |
| 패치 | bản cập nhật (patch) | |
| 동접 | số người chơi đồng thời (CCU) | |
| 판정 (combat, hit) | phán định | `판정 구간` → khung phán định; `공격 판정` → phán định đòn đánh |
| 판정 (diagnosis verdict) | kết luận, chẩn đoán | |
| 동기화 / 동기화 방식 | đồng bộ / cơ chế đồng bộ | |
| 권위 서버 | server có thẩm quyền (authoritative server) | |
| 보간 / 보간 버퍼 | nội suy / bộ đệm nội suy | |
| 외삽 | ngoại suy (extrapolation, dead reckoning) | |
| 예측, 클라이언트 예측 | dự đoán, dự đoán phía client | |
| 서버 보정 | hiệu chỉnh theo server (reconciliation) | |
| 지연 보상, 되감기 | bù trễ (lag compensation), quay ngược (rewind) | |
| 선입력 | buffer input | `선입력 허용 시간` → thời gian nhận buffer input |
| 선연출 | hiển thị trước (client-side feedback) | |
| 락스텝 / 롤백 넷코드 / 넷코드 | lockstep / rollback netcode / netcode | |
| 리슨 서버 / 방장 | listen server / chủ phòng | |
| 페이즈 | phasing | |
| 시야, 시야 계산, AOI | tầm nhìn, tính toán tầm nhìn, AOI | |
| 셀, 격자(그리드) | ô (cell), lưới (grid) | |
| 스냅샷 / 델타 압축 | snapshot / nén delta | |
| 상태 업데이트 | bản cập nhật trạng thái | |
| 틱, 틱레이트, 틱 예산 | tick, tick rate, tick budget | `틱 간격` khoảng cách tick, `틱 주기` chu kỳ tick |
| 게임 상태 / 서버의 실제 상태 | trạng thái game / trạng thái thực trên server | |
| 게임 루프, 루프 한 번 | vòng lặp game, một vòng lặp | |
| 프레임, 프레임 타임, FPS | khung hình, frame time, FPS | |
| 메인 스레드 | main thread | |
| 셰이더 컴파일, 셰이더 캐시 | biên dịch shader, shader cache | |
| 넷그래프 | net graph | |
| 게임 가속기 | phần mềm tăng tốc game | |
| 안티치트 / 오버레이 | anti-cheat / overlay | |
| 캐릭터 모델, 이름표 | model nhân vật, bảng tên | |
| 에셋 | asset | |
| 손맛 | cảm giác tay | |

### 8.2 Network

| Korean | Vietnamese | Note |
|---|---|---|
| 패킷 | gói tin | "gói" alone is fine after context is set |
| 패킷 손실 | mất gói tin | glossary term |
| 지연 / 왕복 시간 / 꼬리 지연 | độ trễ / thời gian khứ hồi (RTT) / tail latency | |
| 대역폭 / 처리량 | băng thông / thông lượng | |
| 대기열, 대기열에 쌓이다 | hàng đợi, dồn vào hàng đợi | |
| 혼잡 / 혼잡 제어 | tắc nghẽn, nghẽn / kiểm soát tắc nghẽn | |
| 재전송, 재전송률, 재전송 타이머(RTO) | truyền lại, tỷ lệ truyền lại, timer truyền lại (RTO) | never "tái truyền" |
| 빠른 재전송 / 불필요한 재전송 | truyền lại nhanh (fast retransmit) / truyền lại không cần thiết (spurious) | |
| TLP, RACK-TLP, SACK | keep | `선택적 ACK(SACK)` → ACK chọn lọc (SACK) |
| 아직 ACK를 받지 못한 패킷(in-flight) | gói chưa nhận được ACK (in-flight) | |
| 마지막 패킷들의 손실(tail loss) | mất các gói cuối (tail loss) | |
| ACK(수신 확인) / 지연 ACK | ACK (xác nhận đã nhận) / delayed ACK | |
| 시퀀스 번호 | số thứ tự (sequence number) | |
| 혼잡 윈도우 / 수신 윈도우 / 윈도우 크기·스케일 | cửa sổ tắc nghẽn (cwnd) / cửa sổ nhận / kích thước cửa sổ, window scale | |
| 제로 윈도우, 제로 윈도우 프로브 | zero window, zero window probe | |
| HOL 블로킹 | HOL blocking | |
| thin stream / 페이싱 / 폴리서 / 셰이퍼 | thin stream / pacing / policer / shaper | |
| Nagle 알고리즘 | thuật toán Nagle | |
| 소켓, 소켓 옵션, 소켓 버퍼 | socket, tùy chọn socket, bộ đệm socket | |
| 버퍼 | bộ đệm | keep English in fixed names: ring buffer, bufferbloat |
| 신뢰성 UDP / 비신뢰(unreliable) 채널 | UDP tin cậy / kênh không tin cậy (unreliable) | |
| 보장한다 | bảo đảm | |
| 흐름 (flow) | luồng (flow) | "luồng" is reserved for flow; a thread is `thread` |
| 단편화, 프래그먼트 | phân mảnh, fragment | `최대 세그먼트 크기` → kích thước segment tối đa (MSS) |
| MTU 블랙홀 | MTU black hole | |
| 하트비트 / keepalive / 타임아웃 / 유휴 타임아웃 | heartbeat / keepalive / timeout / idle timeout | |
| 유휴 연결 / 조용히 버림 | kết nối nhàn rỗi (idle) / bỏ âm thầm (silent drop) | |
| RST | RST | |
| 공유기 / 와이파이 / 무선 채널 | router / Wi-Fi / kênh không dây (dải tần) | |
| 모바일망 / 기지국 / 핸드오버 | mạng di động / trạm phát sóng / handover | |
| 통신사, 통신사망 | nhà mạng, mạng nhà mạng | |
| 회선 | đường truyền | |
| 경로 / 우회 경로 / 병목 구간 | tuyến đường / đường vòng / điểm nghẽn | |
| 피어링 / BGP / ECMP / LAG | peering / BGP / ECMP / LAG | |
| 해저 케이블 | cáp quang biển | |
| 빛의 속도 | tốc độ ánh sáng | |
| NAT, NAT 테이블, CGNAT, SNAT, NAT 게이트웨이 | NAT, bảng NAT, CGNAT, SNAT, NAT gateway | |
| 공인 IP / 사설망 | IP công cộng / mạng riêng | |
| 방화벽 | tường lửa | |
| 세션 테이블 / conntrack 테이블 / 연결 추적 | bảng phiên / bảng conntrack / theo dõi kết nối | `추적 항목이 만료된다` → mục theo dõi hết hạn |
| 로드밸런서 | bộ cân bằng tải (LB) | |
| DDoS 방어 / 스크러빙 센터 | chống DDoS / trung tâm lọc DDoS (scrubbing center) | |
| 스위치 / 라우터 | switch / router | |
| 마이크로버스트 / 버스트 | microburst / burst | |
| 버퍼블로트 / SQM / QoS / ECN | bufferbloat / SQM / QoS / ECN | |
| ICMP 응답을 제한한다 | giới hạn tốc độ phản hồi ICMP | |
| 업로드 / 다운로드 | chiều tải lên (upload) / chiều tải xuống (download) | |
| 데이터센터, IDC | trung tâm dữ liệu, IDC | |
| 합성 측정 | giám sát giả lập (synthetic monitoring) | |

### 8.3 Server, OS, memory, disk

| Korean | Vietnamese | Note |
|---|---|---|
| 커널 / OS / 운영체제 | kernel / OS / hệ điều hành | |
| NIC / 링 버퍼 / 인터럽트 / RSS / 수신 큐 / 송신 대기열 | NIC / ring buffer / ngắt (interrupt) / RSS / hàng đợi nhận / hàng đợi gửi | |
| 슬롯 | slot | |
| PPS | PPS | |
| backlog, 접속 대기열 | backlog, hàng đợi kết nối | |
| 파일 디스크립터(fd) | file descriptor (fd) | |
| TIME_WAIT | TIME_WAIT | |
| 스케줄링 / 스케줄러 / 타임 슬라이스 / 스케줄링 대기 | lập lịch / bộ lập lịch (scheduler) / time slice / chờ được lập lịch | |
| 컨텍스트 스위칭 | context switch | |
| 스레드, 워커, 워커 스레드, 스레드 풀 | thread, worker, worker thread, thread pool | |
| 락, 데드락, 잠금 | lock, deadlock, khóa | |
| 락 경합, 잠금 경합 | tranh chấp lock / tranh chấp khóa (lock contention) | |
| starvation | starvation (bị bỏ đói tài nguyên) | |
| 동기 호출 / 비동기 I/O | gọi đồng bộ (blocking) / I/O bất đồng bộ | |
| 호출 체인 | chuỗi gọi | |
| 이용률 | mức sử dụng (utilization) | |
| CPU 스틸 / CPU 스로틀링 / 할당량 / 주기(CFS period) | CPU steal / CPU throttling / quota / chu kỳ (CFS period) | |
| 가상 머신 / 호스트 / 인스턴스 / 컨테이너 | máy ảo (VM) / host / instance / container | |
| 노이지 네이버 / 라이브 마이그레이션 | noisy neighbor / live migration | |
| 전원 관리 / 절전 상태 / 절전 해제 / C-state | quản lý nguồn điện / trạng thái tiết kiệm điện / đánh thức (wake-up) / C-state | |
| 일시 정지(suspend) / 동결(freeze) / 백그라운드 | tạm dừng (suspend) / đóng băng (freeze) / chạy nền | |
| 발열 스로틀링 | bóp xung do nhiệt (thermal throttling) | |
| 타이머 해상도 / 시간 동기화(NTP) / wall clock / monotonic clock | độ phân giải timer / đồng bộ thời gian (NTP) / wall clock / monotonic clock | |
| 메모리 / 힙 / 가비지 / GC | bộ nhớ / heap / rác / GC (thu gom rác) | |
| GC 멈춤, 전체 멈춤, Full GC, Young/Old 영역 | GC pause, dừng toàn bộ (stop-the-world), Full GC, vùng Young/Old | |
| 메모리 누수 | rò rỉ bộ nhớ | |
| 스왑 / OOM 킬러 / 페이지 캐시 / 큰 페이지 | swap / OOM killer / page cache / huge page | |
| 캐시 / 캐시 미스 / 콜드 캐시 / 캐시 스탬피드 / 메모리 계층 | cache / cache miss / cache lạnh (cold cache) / cache stampede / phân cấp bộ nhớ | |
| 디스크 / 스토리지 / 헤드·플래터 | ổ đĩa / storage / đầu đọc, đĩa từ | |
| IOPS / 동기 쓰기 / fsync / 버스트 크레딧 / 적립량 | IOPS / ghi đồng bộ / fsync / burst credit / lượng tích lũy | |
| 백업 / 스냅숏 | sao lưu / snapshot | |
| VRAM / 그래픽카드 / 드라이버 | VRAM / card đồ họa / driver | |
| 가변 주사율 / 주사율 / V-Sync / 프레임 생성 | tần số quét biến thiên (VRR) / tần số quét / V-Sync / tạo khung hình | |

### 8.4 Database and operations

| Korean | Vietnamese | Note |
|---|---|---|
| 데이터베이스 / DB | cơ sở dữ liệu / DB | |
| 커넥션, 커넥션 풀 | kết nối DB, connection pool | |
| 쿼리 / 인덱스 / 풀 스캔 / 실행 계획 | query / index / full scan / kế hoạch thực thi (execution plan) | |
| 테이블 / 행 / 컬럼 | bảng / dòng (row) / cột | |
| 트랜잭션 | transaction | never "giao dịch" (reserved for in-game trade) |
| 행 잠금 / 핫 로우 / 잠금 에스컬레이션 | khóa dòng (row lock) / hot row / lock escalation | |
| 데드락(교착 상태) | deadlock | |
| 언두 로그 / MVCC / 체크포인트 | undo log / MVCC / checkpoint | |
| 스키마 변경(DDL) | thay đổi schema (DDL) | |
| 복제, 복제본, 주 DB | replication, bản sao (replica), DB chính | |
| 복제 지연 | replication lag | |
| 장애 전환, 페일오버 | failover | |
| 롤백 | rollback | |
| 장애 / 연쇄 장애 / 장애 대응 | sự cố / sự cố dây chuyền / xử lý sự cố | |
| 사후 분석 | postmortem | |
| 게이트웨이 / 서킷 브레이커 / 워치독 | gateway / circuit breaker / watchdog | |
| 배포 / 확장 / 오토스케일링 | triển khai (deploy) / mở rộng / autoscaling | |
| 모니터링 / 지표 / 로그 / 대시보드 | giám sát / chỉ số (metric) / log / dashboard | |
| 샘플링 / 집계 간격 / 백분위수, p99 / 평균 | lấy mẫu / khoảng gộp dữ liệu / phân vị, p99 / trung bình | |
| 설정 / 기본값 / 한도 | cấu hình / giá trị mặc định / giới hạn | |
| 클라우드 / 클라우드 사업자 / 보안 그룹 / 네트워크 ACL | cloud / nhà cung cấp cloud / security group / network ACL | |
| GeoIP / TLS 인증서 | GeoIP / chứng chỉ TLS | |
| 원인 / 근본 원인 / 증상 / 진단 | nguyên nhân / nguyên nhân gốc / triệu chứng / chẩn đoán | |
| 출처 / 발행처 | nguồn / đơn vị phát hành | |

### 8.5 Verbs from TERMS.md

| Korean | Vietnamese |
|---|---|
| 점유한다 (port, CPU, connection) | chiếm giữ |
| 간주한다, 판단한다 / 오인한다 / 감지한다 | coi là, xác định / nhầm là / phát hiện |
| 손실로 판단해 재전송한다 / 만료된다 | xác định là mất rồi truyền lại / hết hạn |
| 우선순위를 높인다 | tăng mức ưu tiên |
| 한꺼번에 보낸다, 송신 버스트 | gửi dồn một lượt, burst gửi |
| 무작위로 분산 | rải ngẫu nhiên |
| 요청하고 응답을 받는다, 호출한다 | gửi yêu cầu và nhận phản hồi, gọi |
| 수집·회수 (GC) | thu gom, thu hồi |

## 9. SEO notes

Phrases people in Vietnam actually type when a game lags or when they investigate server lag:

1. `lag game`, `game bị lag`
2. `nguyên nhân lag game`, `nguyên nhân lag game online`
3. `cách khắc phục lag game`, `cách fix lag`
4. `ping cao khi chơi game`
5. `ping nhảy`, `ping không ổn định`
6. `giật lag`, `game bị giật`, `giật khựng`
7. `mất gói`, `packet loss là gì`, `cách fix packet loss`
8. `bị kéo lại khi chơi game`, `rubber banding là gì`
9. `văng game`, `mất kết nối với máy chủ`
10. `không vào được game`, `kẹt loading`
11. `lag server`, `server lag`
12. `jitter là gì`, `độ trễ mạng`
13. `wifi chơi game bị lag`
14. `đứt cáp quang biển chơi game lag`
15. `input lag`, `delay khi chơi game`
16. `tick rate là gì`, `netcode là gì`
17. `lag giờ cao điểm buổi tối`

How they are used:

- The site name **Sách trắng lag game** contains `lag game`. The full title adds `nguyên nhân lag game online` and `khắc phục`.
- The meta description opens with a question that contains the symptom names people search (`game online bị giật khựng, dịch chuyển tức thời hay mất kết nối`) and `nguyên nhân gây lag`.
- Cause pages: `{name} ({English}): nguyên nhân lag | Sách trắng lag game`.
- Symptom pages: `{symptom} khi chơi game: nguyên nhân lag và đội phụ trách | Sách trắng lag game` (for example `Mất kết nối khi chơi game: …`).
- The keyword list (build.py) uses: nguyên nhân lag, lag game, game bị lag, ping cao, giật lag, giật khựng, dịch chuyển tức thời, kéo ngược, trễ thao tác, mất kết nối, lag server, netcode, truyền lại TCP, đội phát triển game, đội hạ tầng.
- In body text, use the natural phrases where they fit the meaning (`ping nhảy`, `mất gói`, `cáp quang biển`, `giờ cao điểm buổi tối`). Do not stuff keywords.
