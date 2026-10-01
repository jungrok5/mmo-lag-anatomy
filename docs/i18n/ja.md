# Japanese (ja) terminology and style guide

Read this before translating any group into Japanese. It fixes the site name, the register, punctuation and number rules, and the terms every translator must use identically. The Korean original is the source of truth; `docs/I18N_GUIDE.md` (format rules) and `docs/TERMS.md` (Korean standard terms) still apply. When a Korean term is missing here, pick the word a Japanese game server/client programmer or SRE would say at work, then add it to this file.

Target reader: the same as the Korean original. Non-programmers at a Japanese game studio (プランナー, デザイナー, QA, PM) must understand it, and a senior server/infra engineer must find nothing wrong or unnatural in it.

## 1. Site name and titles

| Item | Japanese |
|---|---|
| Site name (`게임 렉 백서`) | **ゲームラグ白書** |
| Full title (`게임 렉 백서: 온라인 게임 렉 원인과 해결 담당`) | ゲームラグ白書：オンラインゲームのラグの原因と対策、担当チームまで |
| Title suffix (`… \| 게임 렉 백서`) | `… \| ゲームラグ白書` (half-width pipe with spaces, as on most Japanese sites) |
| Text edition | ゲームラグ白書 テキスト版 |
| Glossary | ゲームラグ白書 用語集 |

Why: 「ラグ」 is what Japanese players and developers call lag (「ラグい」「ラグが出る」). 「白書」 is the established Japanese word for a white paper and matches the Korean 백서 and English "White Paper". Keep it as one word, no space, no 「の」.

## 2. Register and sentence style

- **Prose** (`s`, `num`, `more`, symptom `what`/`looks`/`tell`, factor `desc`/`cope`, glossary definitions, body text): polite explanatory です・ます調. Plain, concrete, short sentences. Avoid stiff officialese (〜となっております, 〜させていただきます) and avoid chatty endings (〜だよね, 〜しよう).
- **Terse fields** (`c` [why, then, on screen], `chk.look`/`chk.yes`/`chk.no`, `act.*`, `sig.g`, `times` notes, table cells, list items the Korean writes in 개조식): 体言止め or plain dictionary form, no です・ます. Examples: 「GCログを有効にし、停止した時刻と長さをサーバーのティック時間グラフに重ねて確認」「ティックが跳ねた時刻とGC停止の時刻が重なる」「アロケーションの削減、ヒープサイズの調整。」. Keep the source's sentence-final period where the Korean has one and omit it where the Korean omits it.
- **Tool/export notes written in Korean 한다체** (e.g. `tools/export.cjs` notes): である調.
- **UI labels**: nouns or short noun phrases (確認箇所, 該当する場合, 主担当). Buttons may use a verb (リンクをコピー).
- Address the reader only where the Korean does (〜してください). Use 「自分」 for Korean 나/내 (自分の画面, 自分のPC, 自分だけ). Use 「自社」 for 우리 (自社の契約外).
- Korean 「X를 봅니다」 in a diagnosis sense means "check/suspect X". Write 「Xを確認します」 or 「Xを疑います」. Never 「Xを見ます」.
- Player perception of slowness: 「重い」 is the native word (サーバーが重い, 回線が重い, 操作が重い). Use 「遅い」/「遅延」 for measured time.
- Do not stack の (サーバーのゲームプロセスのティックの処理時間). Restructure: サーバーのゲームプロセスでのティック処理時間.
- Prefer 〜できます over 〜することができます, 〜です over 〜となります.

### The two sentence bans, in Japanese form

1. **No dash asides.** Never insert an explanation in the middle of a sentence with ——, ―, ─, — or –. Use full-width parentheses （…） or split into two sentences.
   - NG: サーバーのティック――ゲーム状態を計算する単位――が遅れると…
   - OK: サーバーのティック（ゲーム状態を計算する単位）が遅れると…
2. **No "not A but B".** Do not write 「AではなくB」「AではなくてB」「AじゃなくてB」「AではなくむしろB」. State B directly. If the contrast matters, put A in its own sentence or use a comparison (「AよりもB」「AというよりB」 are fine, the Korean uses 보다는).
   - NG: 原因は回線ではなくサーバーのGCです。
   - OK: 原因はサーバーのGCです。回線は正常です。

## 3. Punctuation, spacing and numbers

| Topic | Rule | Example |
|---|---|---|
| Sentence punctuation | 「、」「。」 (never ，．) | 遅延、ジッター、パケットロス。 |
| Korean `·` (list joiner) | katakana middle dot 「・」 | ゲーム開発チーム・インフラチーム |
| Parentheses in Japanese text | full-width （） even around ASCII | ファイルディスクリプタ（fd） |
| Parentheses that must stay half-width | inside `<code>`, commands, URLs, and the glossary English column (anchor IDs depend on it, see §8) | `-Xlog:gc*` |
| Quotes (Korean “…”) | 「…」, nested 『…』 | 「接続が切断されました」 |
| Colon after a Japanese label | full-width 「：」 | 別名：{0}　確認箇所：{0} |
| Title separator | ` \| ` half-width with spaces | ワープの原因と担当：… \| ゲームラグ白書 |
| Slash lists in the source (` / `) | keep ` / ` | 自分だけ / パーティメンバーも |
| Arrows | keep → ↔ | なぜ → すると → 画面では |
| Ellipsis | … (single) | カクつき、ワープ、引き戻し、早送り… |
| Space between Japanese and Latin/digits | none | TCP再送、200ms、Linuxカーネル、Ping値 |
| Digits | half-width Arabic numerals | 20ティック、60FPS |
| Thousands separator | comma, same as the source; no comma in years, ports, versions, build numbers | 1,500バイト、1,000倍、2016、1607 |
| Decimal | point | 0.25秒、16.7ms |
| Ranges (Korean `~`) | 〜 (U+301C WAVE DASH), no spaces | 0.2〜0.5秒、1〜5m、数〜数十ms |
| Units | no space between number and unit, for both symbols and Japanese units; keep symbols `ms`, `µs`, `ns`, `Mbps`, `Gbps`, `GB`, `Hz`, `%` as is | 200ms、1.5GB、60Hz、80%、約12ms |
| Large numbers | 万 like Korean 만 | 約1万回、数万人 |
| Approximations | 약→約、안팎→前後、수→数、십여→十数、몇→数 | 0.25秒前後、十数秒、数百ms |
| Idiomatic counts | kanji, not digits: 一度、一つ、一瞬、一気に、一斉に、一部、一か所、一往復 | 同じフレームがもう一度表示される |
| Korean number words for real quantities | digits are fine even if the Korean spells them (네 가지 → 4つ, 두 배 → 2倍); `check --warn` may then report a number mismatch, which is expected | ラグの4つの要因 |

Line breaks, HTML tags, placeholders: see `docs/I18N_GUIDE.md`. In attribute values (`aria-label`, `title`, `alt`) use 「」 for quotes, never `"` `<` `>`.

### Counters and short fragments with numbers

Japanese has no plural agreement, so `{0}` never changes the surrounding words. Put a counter right after the number, no space:

| Korean | Japanese |
|---|---|
| 원인 {0}가지 / {0}개 | 原因{0}件 |
| {0}가지 (alone, causes) | {0}件 |
| 출처 {0}건, 자료 {0}건 | 出典{0}件、資料{0}件 |
| 발행처 {0}곳 | 発行元{0}組織 |
| 인용 {0}곳 | 引用{0}か所 |
| 용어 {0}개 | 用語{0}件 |
| 그래프 모양 13가지, N종 | グラフの形13種類 |
| 네 가지 요인 | 4つの要因 |
| 13개 층과 3개 주제 | 13の層と3つのテーマ |
| {0}단계 | ステップ{0} |
| N틱 서버 | Nティックのサーバー (1秒にNティック) |
| {0}명 | {0}人 |
| 서버 {0}대 | サーバー{0}台 |

## 4. Korean-specific constructions

| Korean | Japanese | Note |
|---|---|---|
| 합니다체 prose | です・ます調 | |
| 개조식 endings (~함, ~음, ~봄, ~튐) | 体言止め or dictionary form | 「重ねて確認」「跳ねる」 |
| ~해 보세요 | 〜してみてください | |
| 예: … | 例：… | 「（例：2チャンネル…）」 |
| 등 | など | |
| ~쪽 (side) | 〜側 | サーバー側、ユーザー側 |
| 나, 내 | 自分、自分の | |
| 우리 | 自社 | |
| 유저 / 플레이어 | ユーザー / プレイヤー | keep whichever the Korean uses |
| 기획·아트·QA·PM | プランナー・デザイナー・QA・PM | Japanese studios call artists デザイナー |
| 서울, 도쿄, 미국 서부 | ソウル、東京、米国西海岸 | keep the Korean facts; never swap in Japanese examples |
| Korean ISPs and companies | official Latin name: KT, SK Broadband, LG U+, NCSOFT; Nexon → ネクソン | |
| “A가 아니라 B” | see §2 | |
| 렉이 생긴다 / 렉이 걸린다 | ラグが出る / ラグが発生する | 「ラグる」 only in player quotes |
| 핑이 튄다 | Pingが跳ねる | players really say this |
| 멀쩡하다 | 正常、問題ない | |
| 튄다 (graph, value) | 跳ねる、スパイクする | |
| 점검 직후 | メンテ明け | |

## 5. Symptom names (fixed, use identically everywhere)

These 11 names are used only for the symptoms. Wherever the Korean uses a fixed symptom name, use the Japanese name below, verbatim, including in running text (「カクつきやワープとして現れる」). Where the Korean uses an ordinary word that is not the symptom (e.g. a short stop inside a simulation), use an ordinary word (短い停止, 途切れ) and not the symptom name.

| id | Korean | **Japanese name** | Aliases (`alias` field, player/dev words) | Verb form for prose |
|---|---|---|---|---|
| stutter | 뚝뚝 끊김 | **カクつき** | カクカク、引っかかり、スタッター、フレーム落ちのような感じ | カクつく |
| teleport | 순간이동 | **ワープ** | 瞬間移動、テレポート、止まって飛ぶ | ワープする |
| rubber | 고무줄 | **引き戻し** | 巻き戻り、ラバーバンド、位置が戻される | 引き戻される |
| burst | 몰아치기 | **早送り** | 一気に動く、早回し、まとめて処理 | 早送りになる |
| slowmo | 슬로우모션 | **スローモーション** | 世界全体がスローになる、処理落ち、全体的にもっさり | スローモーションになる |
| delay | 입력 지연 | **入力遅延** | 反応が遅い、もっさり、操作が重い、手応えがない | 入力遅延が出る |
| freeze | 멈춤 | **フリーズ** | 固まる、止まる、応答なし | フリーズする |
| dropped | 씹힘·롤백 | **不発・ロールバック** | スキル不発、入力が食われる、アイテムが元に戻る、取引失敗 | スキルが不発になる、ロールバックされる |
| disconnect | 접속 끊김 | **切断** | 回線落ち、落ちる、サーバーとの接続が切断されました | 切断される |
| noconnect | 접속 불가·무한 로딩 | **接続不可・無限ロード** | ログインできない、ロードが終わらない | 接続できない、無限ロードになる |
| invisible | 안 보임·유령 개체 | **表示されない・ゴースト** | NPCが見えない、透明なキャラ、倒したはずのモンスターが立っている | 表示されない、ゴースト化する |

Related words kept apart from the symptom names:
- 스킬 씹힘 (game term) → スキル不発. 롤백 (DB) → ロールバック. 롤백 넷코드 → ロールバックネットコード.
- OS freezing a background app (TERMS: 동결) → 凍結（freeze）. Process hang → ハング. Generic stop → 停止、止まる. Screen "굳었다" → 固まった.
- Korean 멈칫 (not the symptom) → 一瞬止まる、カクッとなる.
- 되감기 (lag compensation rewind) → 巻き戻し (verb 巻き戻す). Do not use 巻き戻し for the rubber-band symptom.
- 빨리 감기 as a simile → 早送りのように (same concept as the symptom, fine).

## 6. The four factors

| id | Korean | Japanese | English (kept) | `how` |
|---|---|---|---|---|
| lat | 지연 | **遅延** | Latency | パケットが遅れて届く |
| jit | 지터 | **ジッター** | Jitter | パケットの届く間隔がばらつく |
| loss | 손실 | **パケットロス** | Packet loss | パケットがまったく届かない |
| stall | 정체 | **ストール** | Stall | どこかで処理が止まった |

- 손실 is always パケットロス (ロス alone in compounds: ロス率、連続ロス、ロスと判断する). Use 損失 only in quoted formal names.
- 지터 first mention per chapter, like the Korean: ジッター（到着間隔のばらつき）.
- 정체 (the factor) → ストール. First mention per chapter: ストール（処理の停止・滞り）. Korean 정체 meaning road-like congestion elsewhere → 混雑、詰まり.
- 요인 → 要因. 네 가지 요인 → 4つの要因. 게임의 대처 → ゲーム側の対処.

## 7. Layers, topics, sides

| id | Korean name / short | Japanese name | Japanese short |
|---|---|---|---|
| client-game | 클라이언트 게임 프로세스 / 내 게임 | クライアントのゲームプロセス | 自分のゲーム |
| client-os | 클라이언트 OS·기기 / 내 PC·폰 | クライアントのOS・端末 | 自分のPC・スマホ |
| home | 집 네트워크 / 와이파이·공유기 | 家庭内ネットワーク | Wi-Fi・ルーター |
| isp | 인터넷 회선 / 통신사·해외 | インターネット回線 | ISP・海外 |
| dc-net | 데이터센터 네트워크 장비 / 방화벽·LB | データセンターのネットワーク機器 | FW・LB |
| nic | 서버 네트워크 카드 / NIC | サーバーのネットワークカード | NIC |
| server-os | 서버 OS (커널) / 커널 | サーバーOS（カーネル） | カーネル |
| socket | 소켓과 프로토콜 / TCP·UDP | ソケットとプロトコル | TCP・UDP |
| server-proc | 서버 게임 프로세스 / 틱·스레드 | サーバーのゲームプロセス | ティック・スレッド |
| memory | 메모리 / GC·누수 | メモリ | GC・リーク |
| disk | 디스크 / IOPS | ディスク | IOPS |
| db | 데이터베이스 / DB | データベース | DB |
| infra | 서버 구성과 운영 / 구성·운영 | サーバー構成と運用 | 構成・運用 |
| sync (topic) | 동기화 설계 | 同期設計 | 同期設計 |
| partial (topic) | 일부에게만 생기는 문제 / 일부만 | 一部のユーザーだけに起きる問題 | 一部だけ |
| retrans (topic) | TCP 재전송의 근본 원인 / TCP 재전송 | TCP再送の根本原因 | TCP再送 |

Sides: 내 쪽 → 自分側, 가는 길 → 経路, 서버 쪽 → サーバー側, 양쪽 끝 → 両端, 설계 → 設計, 범위 → 範囲, 원인 → 原因.
층 → 層 (13の層, この層). 레이어 (where the Korean says it, e.g. chapter kicker) → レイヤー. 주제 → テーマ. 층·주제 → 層・テーマ.

## 8. Teams, owners, card labels

| Korean | Japanese |
|---|---|
| 게임개발팀 | ゲーム開発チーム |
| 인프라팀 | インフラチーム |
| 외부 | 外部 |
| cli 클라이언트 개발 / 클라이언트 | クライアント開発 / クライアント |
| srv 서버 개발 / 서버 | サーバー開発 / サーバー |
| net 네트워크 인프라 / 네트워크 | ネットワークインフラ / ネットワーク |
| sys 서버 인프라 / 서버 장비·OS | サーバーインフラ / サーバー機器・OS |
| dba DB 인프라 / DB 장비 | DBインフラ / DBサーバー |
| ext 외부 / 유저·통신사·클라우드 | 外部 / ユーザー・ISP・クラウド |
| 담당, 담당 코드 | 担当、担当コード |
| 주 담당 | 主担当 |
| 함께 (also-owners) | 副担当 |
| 할 일, 대응, {0} 할 일 | 対応、{0}の対応 (ゲーム開発チームの対応) |
| 팀별 대응 | チーム別の対応 |
| 유저 안내·외부 요청 | ユーザーへの案内・外部への依頼 |
| 두 팀 모두 할 일이 있음 | 両チームとも対応あり |
| 누가 고치나 | 誰が直すか |

Cause card labels (use in every group):

| Korean | Japanese |
|---|---|
| 왜 → 그러면 → 화면에서는 | なぜ → すると → 画面では |
| 증상 / 요인 | 症状 / 要因 |
| 누가 겪나, 누가 | 誰に起きるか、誰に |
| 언제 | いつ |
| 수치 감각 | 数値の目安 |
| 더 알아보기 | もっと詳しく |
| 그래프에서는 | グラフでは |
| 그래프 모양 | グラフの形 |
| 확인 방법 | 確認方法 |
| 확인할 곳 | 確認箇所 |
| 이러면 맞음 | 該当する場合 |
| 이러면 아님 | 該当しない場合 |
| 확인 수단 | 確認手段 |
| 실제 사례 | 実際の事例 |
| 출처 | 出典 |
| 원인 ID | 原因ID |
| 링크 복사 | リンクをコピー |
| 관련 실험, 실험 | 関連する実験、実験 |
| 직접 해보기 | 試してみる |
| 원문 (link to a source article) | 原文 |
| 무슨 일 / 배울 점 / 관련 원인 | 何が起きたか / 教訓 / 関連する原因 |
| 원본 (the interactive index page, vs. text edition) | メインページ (図と実験のあるメインページ) |

Glossary English column: it stays English and is not translated. The anchor `#g-…` is computed from it (text before the first comma, half-width `(...)` removed), so if a Korean word ever appears there, translate only that word and keep the half-width parentheses and commas exactly as they are.

## 9. who / when / graph shapes / check-by

| who id | Korean | Japanese |
|---|---|---|
| me | 나만 | 自分だけ |
| home | 같은 집 | 同じ家 |
| region | 특정 지역·통신사 | 特定の地域・ISP |
| zone | 특정 장소·채널 | 特定の場所・チャンネル |
| server | 서버 전체 | サーバー全体 |
| feature | 특정 기능만 | 特定の機能だけ |
| onechar | 특정 캐릭터만 이상해 보임 | 特定のキャラだけおかしく見える |
| oneclient | 같은 PC의 한쪽 클라만 | 同じPCの片方のクライアントだけ |

| when id | Korean | Japanese |
|---|---|---|
| always | 항상 | 常に |
| peak | 저녁 피크 시간 | 夜のピーク時間帯 |
| event | 사람이 몰릴 때 | 人が集中したとき |
| login | 접속·점검 직후 | 接続直後・メンテ明け |
| idle | 가만히 있다가 | しばらく放置した後 |
| random | 가끔 무작위로 | ときどきランダムに |
| periodic | 일정한 주기로 | 一定の周期で |
| uptime | 오래 켜 둘수록 | 長時間稼働するほど |
| moving | 이동 중·지역 전환 때 | 移動中・マップ切り替え時 |
| action | 특정 행동을 할 때 | 特定の操作をしたとき |

| sig id | Korean | Japanese |
|---|---|---|
| periodic | 일정 주기로 튐 | 周期的なスパイク |
| random | 가끔 무작위로 튐 | 不定期なスパイク |
| step | 어느 순간부터 계단처럼 올라감 | ある時点から階段状に上昇 |
| ramp | 서서히 오름 | 徐々に上昇 |
| sawtooth | 서서히 오르다 뚝 떨어짐 | 徐々に上昇して急落 |
| peak | 특정 시간대에만 높음 | 特定の時間帯だけ高い |
| load | 인원·부하를 따라 오름 | 人数・負荷に連動して上昇 |
| ceiling | 한도에 닿아 평평해짐 | 上限で頭打ち |
| high | 처음부터 늘 높음 | 最初から常に高い |
| outlier | 일부만 높음 | 一部だけ高い |
| gap | 끊겼다가 몰아서 | 途切れた後にまとめて到着 |
| drop | 연결이 한꺼번에 끊김 | 接続が一斉に切れる |
| surge | 접속·점검 직후 폭증 | 接続直後・メンテ明けに急増 |

| chkBy | Korean | Japanese | Short (ui-app) |
|---|---|---|---|
| ops | 인프라 도구로 확인(게임 코드 불필요) | インフラのツールで確認（ゲームコード不要） | インフラのツール |
| code | 게임 서버·클라이언트의 로그·지표가 필요 | ゲームサーバー・クライアントのログ・メトリクスが必要 | ゲームのログ・メトリクス |
| user | 유저 쪽 환경에서 확인 | ユーザー側の環境で確認 | ユーザー側 |

## 10. Chapter and section names

| Korean | Japanese |
|---|---|
| 렉의 네 가지 요인 / 렉은 네 가지 요인으로 만들어진다 | ラグの4つの要因 / ラグは4つの要因から生まれる |
| 패킷의 이동 경로 | パケットの経路 |
| 렉 실험실 | ラグ実験室 |
| 증상 사전 | 症状辞典 |
| 같은 핑, 다른 체감: 동기화 방식 | 同じPing、違う体感：同期方式 |
| 한 명만 느릴 때, 한쪽만 이상할 때 | 一人だけ重いとき、片方だけおかしいとき |
| TCP 재전송 해부 | TCP再送の解剖 |
| 게임개발팀이 고칠 것, 인프라팀이 고칠 것 | ゲーム開発チームが直すもの、インフラチームが直すもの |
| 이 층에서 렉을 만드는 원인 | この層でラグを生む原因 |
| 진단 도우미 | 診断ツール |
| 관측으로 판정하기 | 観測データで切り分ける |
| 판정 흐름 / 판정 신호표 | 切り分けの流れ / 切り分けシグナル表 |
| 범위 → 시점 → 계층 | 範囲 → 時点 → 階層 |
| 사례와 절차 / 상황별 절차 / 실제 장애 사례 | 事例と手順 / 状況別の手順 / 実際の障害事例 |
| 패치 이후 렉 (playbook) | アップデート後のラグ |
| 해외 국가 추가 (playbook) | 海外の国・地域の追加 |
| 렉 제보 잘하는 법 | 伝わるラグ報告の書き方 |
| 용어 사전 | 用語集 |
| 참고 문헌 | 参考文献 |
| 텍스트 판 | テキスト版 |

판정 as diagnosis (finding which cause) → 切り分け. 판정 as a game rule (hit judgment) → 判定. 판정 구간 → 判定の受付時間.

## 11. Terminology (Korean → Japanese)

Katakana long-vowel rule: words ending in -er/-or/-ar take ー (サーバー, ユーザー, ルーター, ロードバランサー, ワーカー, スケジューラー, タイマー, レイヤー, プレイヤー, プロバイダー, コントローラー). Established exceptions used by Japanese programmers: バッファ, メモリ, パラメータ, コンテナ, ディレクトリ, エントリ, ライブラリ, カテゴリ, テールレイテンシ. Keep English where the Japanese community writes English (TCP, UDP, GC, NIC, RSS, IOPS, backlog, keepalive, thin stream, OOM Killer, p99, V-Sync).

### Game and netcode

| Korean | Japanese | Note |
|---|---|---|
| 렉 | ラグ | |
| 핑 | Ping | capital P in prose (Ping値, Pingが高い); the command is `ping` |
| 틱 / 틱레이트 / 틱 예산 / 틱 간격 | ティック / ティックレート / ティックバジェット / ティック間隔 | |
| 프레임 / 프레임 타임 / FPS | フレーム / フレームタイム / FPS | |
| 스냅샷 / 델타 압축 | スナップショット / デルタ圧縮 | |
| 보간 / 보간 버퍼 | 補間 / 補間バッファ | |
| 외삽 | 外挿 | 外挿（デッドレコニング） on first mention |
| 예측, 클라이언트 예측 | 予測、クライアントサイド予測 | |
| 서버 보정 | サーバー補正 | reconciliation |
| 지연 보상, 되감기 | ラグコンペンセーション、巻き戻し | 「過去の時点に巻き戻して判定」 |
| 권위 서버 | サーバー権威型 | 클라이언트 권위 → クライアント権威型 |
| 락스텝 | ロックステップ | |
| 롤백 넷코드 | ロールバックネットコード | |
| 선입력 | 先行入力 | 선입력 허용 시간 → 先行入力の受付時間 |
| 선연출 | 先行演出 | |
| 스킬 씹힘 | スキル不発 | |
| 판정 구간, 허용 시간 | 判定の受付時間、猶予時間 | 패링 판정 → パリィの判定 |
| 쿨다운 | クールタイム | |
| 스킬 시전 | スキルの発動 | |
| 동기화 / 동기화 방식 | 同期 / 同期方式 | |
| 요청-응답, 상태 동기화, 명령 동기화, 이벤트 예약 | リクエスト・レスポンス、状態同期、コマンド同期、イベント予約 | |
| 서버 입력 버퍼 | サーバー側入力バッファ | |
| 리슨 서버, 방장 | リッスンサーバー、ホスト | |
| 페이즈 | フェーズ | |
| 넷코드 | ネットコード | |
| 넷그래프 | ネットグラフ | |
| 시야, 시야 계산, AOI | 視界、視界計算、AOI | |
| 셀, 격자(그리드) | セル、グリッド | |
| 브로드캐스트 | ブロードキャスト | |
| 존, 채널, 필드, 지역 이동 | ゾーン、チャンネル、フィールド、エリア移動 | |
| 월드 보스, 파티원 | ワールドボス、パーティメンバー | |
| 체력 | HP | |
| 개체 | オブジェクト | 개체 ID → オブジェクトID. 유령 개체 → ゴースト |
| 캐릭터 모델 | キャラクターモデル | |
| 제어 권한 | 制御権 | |
| 메인 스레드, 게임 루프 | メインスレッド、ゲームループ | 루프 한 번 → ループ1回 |
| 셰이더 컴파일 / 셰이더 캐시 | シェーダーコンパイル / シェーダーキャッシュ | |
| 안티치트, 게임 해킹 | アンチチート、チート | |
| 오버레이 | オーバーレイ | |
| V-Sync, 가변 주사율 | 垂直同期（V-Sync）、可変リフレッシュレート（VRR） | |
| 주사율, 화면 찢어짐 | リフレッシュレート、ティアリング | |
| 프레임 생성 | フレーム生成 | |
| 로딩, 무한 로딩, 로딩바 | ロード、無限ロード、ロードバー | |
| 점검 / 점검 직후 | メンテナンス（メンテ）/ メンテ明け | |
| 패치 | アップデート (game content); OS/kernel patch → パッチ | |
| 재접속 | 再接続 (再ログイン where it means logging in again) | |
| 렉 제보 | ラグ報告 | |
| 게임 가속기 | ラグ軽減ツール | |
| 게임사, 운영사, 원개발사 | ゲーム会社、運営会社、開発元 | |

### Network

| Korean | Japanese | Note |
|---|---|---|
| 패킷 | パケット | TERMS: 소식 → パケット／状態更新／メッセージ |
| 상태 업데이트 | 状態更新 | |
| 지연 | 遅延 | latency in general: 遅延; SRE context may say レイテンシ |
| 대역폭 | 帯域幅 | |
| 처리량 | スループット | |
| 회선 | 回線 | 회선 끊김 → 回線断; 잠깐 끊김 → 瞬断 |
| 통신사 | 通信事業者 (short labels: ISP; mobile context: キャリア) | |
| 통신사망 | 通信事業者網 | |
| 공유기 | ルーター | 家庭用ルーター |
| 와이파이 | Wi-Fi | |
| 모바일망 | モバイル回線 | |
| 업로드 / 다운로드 (회선 방향) | 上り / 下り | |
| 공인 IP / 사설망 | グローバルIP / プライベートネットワーク | |
| 경로, 우회 경로 | 経路、迂回経路 | 병목 구간 → ボトルネック区間 |
| 피어링 | ピアリング | |
| 해저 케이블 | 海底ケーブル | |
| 빛의 속도 | 光の速さ（光速） | |
| 재전송 / 재전송 타이머 | 再送 / 再送タイマー | never 再送信 |
| 불필요한 재전송 | 不要な再送 | spurious |
| 재전송률 | 再送率 | |
| 재전송 패킷 | 再送パケット | |
| RTO | RTO（再送タイムアウト） | |
| 빠른 재전송 | 高速再送 | fast retransmit |
| 순서 보장 | 順序保証 | |
| HOL 블로킹 | HOLブロッキング | |
| ACK(수신 확인), 지연 ACK | ACK（受信確認）、遅延ACK | |
| 선택적 ACK(SACK) | 選択的ACK（SACK） | 중간에 빠진 부분 → 途中の抜け |
| 아직 ACK를 받지 못한 패킷(in-flight) | ACK待ちのパケット（in-flight） | |
| 마지막 패킷들의 손실(tail loss) | 末尾パケットのロス（tail loss） | |
| TLP, RACK-TLP | TLP, RACK-TLP | |
| 혼잡, 혼잡 윈도우, 수신 윈도우, 윈도우 | 輻輳、輻輳ウィンドウ、受信ウィンドウ、ウィンドウ | network-engineer term 輻輳; 混雑 for plain "crowded" |
| 윈도우 크기·윈도우 스케일 | ウィンドウサイズ・ウィンドウスケール | |
| 제로 윈도우 / 제로 윈도우 프로브 | ゼロウィンドウ / ゼロウィンドウプローブ | |
| 전송량을 줄인다 (cwnd) | 送信量を絞る | |
| Nagle, TCP_NODELAY | Nagleアルゴリズム、TCP_NODELAY | |
| thin stream | thin stream | |
| 신뢰성 UDP / 비신뢰(unreliable) 채널 | 信頼性UDP / 非信頼（unreliable）チャネル | |
| keepalive, 하트비트 | keepalive、ハートビート | |
| 타임아웃, 유휴 타임아웃, 유휴 연결 | タイムアウト、アイドルタイムアウト、アイドル接続 | |
| 조용히 버림(silent drop) | 黙って破棄（サイレントドロップ） | |
| RST | RST | |
| NAT, NAT 테이블, CGNAT, SNAT, NAT 게이트웨이 | NAT、NATテーブル、CGNAT、SNAT、NATゲートウェイ | |
| 세션 테이블, 연결 추적, conntrack 테이블 | セッションテーブル、接続追跡、conntrackテーブル | 추적 항목이 만료된다 → 追跡エントリが期限切れになる |
| MTU, MSS, MTU 블랙홀 | MTU、MSS、MTUブラックホール | |
| 단편화 / 프래그먼트 | フラグメンテーション（断片化）/ フラグメント | 최대 세그먼트 크기 → 最大セグメントサイズ |
| 버퍼블로트, SQM, QoS | バッファブロート、SQM、QoS | |
| 폴리서 / 셰이퍼 / 페이싱 | ポリサー（ポリシング）/ シェーパー（シェーピング）/ ペーシング | |
| ECN | ECN | |
| 마이크로버스트, 버스트, 송신 버스트 | マイクロバースト、バースト、送信バースト | |
| BGP | BGP | |
| DDoS, DDoS 방어, 스크러빙 센터 | DDoS、DDoS対策、スクラビングセンター | |
| 방화벽 / 로드밸런서 / 스위치 / 라우터 | ファイアウォール / ロードバランサー / スイッチ / ルーター | |
| ECMP, LAG | ECMP、LAG（リンクアグリゲーション） | |
| 보안 그룹, 네트워크 ACL, VPC | セキュリティグループ、ネットワークACL、VPC | |
| 핸드오버, 기지국 | ハンドオーバー、基地局 | |
| 저궤도 위성 인터넷 | 低軌道衛星インターネット | |
| ICMP 응답을 제한한다 | ICMP応答をレート制限する | |
| QUIC 연결 마이그레이션 | コネクションマイグレーション | |
| TLS 인증서 | TLS証明書 | |

### Server, OS, hardware

| Korean | Japanese | Note |
|---|---|---|
| 커널 | カーネル | |
| NIC, 링 버퍼, 슬롯 | NIC、リングバッファ、スロット | 256칸 → 256個 |
| 인터럽트 | 割り込み | |
| 수신 큐 / 송신 대기열 | 受信キュー / 送信キュー | |
| RSS, PPS | RSS、PPS | |
| backlog, 접속 대기열 | backlog、接続待ちキュー | |
| 파일 디스크립터(fd) | ファイルディスクリプタ（fd） | |
| TIME_WAIT | TIME_WAIT | |
| 소켓 버퍼 | ソケットバッファ | |
| 스케줄러, 스케줄링, 타임 슬라이스 | スケジューラー、スケジューリング、タイムスライス | CPU를 배정한다 → CPUを割り当てる; 스케줄링 대기 → スケジューリング待ち |
| 스레드, 워커, 워커 스레드, 스레드 풀 | スレッド、ワーカー、ワーカースレッド、スレッドプール | |
| 컨텍스트 스위칭 | コンテキストスイッチ | |
| 락 / 잠금 / 데드락 / 잠금 경합 | ロック / ロック / デッドロック / ロック競合 | 락을 잡다·보유 → ロックを取る・保持する |
| starvation | スタベーション | |
| 동기 호출 / 비동기 I/O | 同期呼び出し / 非同期I/O | |
| 호출 체인 | 呼び出しチェーン | |
| 점유한다 | 占有する | |
| 대기열 | キュー (queueing theory: 待ち行列) | 대기열에 쌓이다 → キューにたまる |
| 이용률 | 利用率 | |
| 가상 머신, 호스트, 인스턴스, 컨테이너 | 仮想マシン（VM）、ホスト、インスタンス、コンテナ | |
| CPU 스틸 | CPUスチール（steal time） | |
| CPU 스로틀링, 주기(CFS period), 할당량(quota) | CPUスロットリング、周期（CFS period）、クォータ（quota） | |
| 노이지 네이버 | ノイジーネイバー | |
| 라이브 마이그레이션 | ライブマイグレーション | |
| C-state, 절전 상태, 절전 해제 | C-state、省電力状態、復帰（wake-up） | |
| 발열 스로틀링 | サーマルスロットリング | |
| 타이머 해상도 | タイマー分解能 | |
| 일시 정지(suspend) / 동결(freeze) | 一時停止（suspend）/ 凍結（freeze） | |
| 시간 동기화(NTP), 시계 점프 | 時刻同期（NTP）、時刻のジャンプ | |
| wall clock / monotonic clock | ウォールクロック（wall clock）/ モノトニッククロック（monotonic clock） | |
| 워치독 | ウォッチドッグ | |
| 덤프 | ダンプ | |
| 크래시, 강제 종료 | クラッシュ、強制終了 | |
| 장애, 장애가 난다 | 障害、障害が発生する | |
| 장애 전환 | フェイルオーバー | |
| 연쇄 장애 | カスケード障害 | |
| 서킷 브레이커 | サーキットブレーカー | |
| 게이트웨이 | ゲートウェイ | |
| 오토스케일링 | オートスケーリング | |
| 배포, 설정 변경 | デプロイ、設定変更 | |
| 모니터링, 지표 | 監視、メトリクス | |
| 샘플링, 집계 간격 | サンプリング、集計間隔 | |
| 합성 측정 | 外形監視 | |
| p50, p99, 백분위수, 꼬리 지연 | p50、p99、パーセンタイル、テールレイテンシ | |
| 사후 분석 | ポストモーテム | |
| 스파이크 | スパイク | |
| 클라우드 사업자 | クラウド事業者 | |
| 리전 | リージョン | |
| GeoIP | GeoIP | |

### Memory, disk, DB

| Korean | Japanese | Note |
|---|---|---|
| GC, 가비지, 수집·회수 | GC、ガベージ、回収 | 「GCが走る」 |
| GC 멈춤 / 전체 멈춤 | GC停止 / 全停止（Stop-the-World） | |
| Full GC, Young/Old 영역 | Full GC、Young領域／Old領域 | |
| 힙, 할당 | ヒープ、アロケーション（割り当て） | |
| 메모리 누수 | メモリリーク | |
| 스왑 | スワップ | |
| OOM, OOM 킬러 | OOM、OOM Killer | |
| 캐시 미스, 콜드 캐시, 메모리 계층 | キャッシュミス、コールドキャッシュ、メモリ階層 | |
| 큰 페이지 (THP) | ヒュージページ（THP） | |
| 디스크, 스토리지 | ディスク、ストレージ | |
| IOPS, 처리량 한도 | IOPS、スループット上限 | |
| 버스트 크레딧, 적립량, 기준 성능 | バーストクレジット、クレジット残高、ベースライン性能 | |
| 동기 쓰기, fsync(확실히 저장) | 同期書き込み、fsync（確実に書き込む） | |
| 페이지 캐시 → 디스크에 기록한다 | ディスクに書き出す | |
| 헤드·플래터 | ヘッド・プラッタ | |
| 백업, 스냅숏 | バックアップ、スナップショット | |
| 인덱스, 컬럼, 행, 테이블 | インデックス、カラム、行、テーブル | |
| 풀 스캔 | フルスキャン | |
| 실행 계획 | 実行計画 | |
| 쿼리, 트랜잭션 | クエリ、トランザクション | |
| 커넥션 풀 | コネクションプール | |
| 행 잠금, 잠금 에스컬레이션 | 行ロック、ロックエスカレーション | |
| 핫 로우 | ホットスポット | first mention: ホットスポット（更新が集中する行） |
| 복제, 복제 지연, 주 DB, 복제본 | レプリケーション、レプリケーション遅延、プライマリ、レプリカ | |
| 롤백 | ロールバック | |
| 체크포인트 | チェックポイント | |
| 언두 로그, MVCC | UNDOログ、MVCC | |
| 스키마 변경(DDL) | スキーマ変更（DDL） | |
| 캐시, 캐시 스탬피드 | キャッシュ、キャッシュスタンピード | |
| 원본 (cache origin) | オリジン | |

### Plain words that are easy to mistranslate

| Korean | Japanese |
|---|---|
| 유저 | ユーザー |
| 나만 | 自分だけ |
| 같은 집 | 同じ家 |
| 느리다 (perceived) | 重い |
| 버린다 (packets) | 破棄する |
| 넘친다 | あふれる |
| 쌓인다 | たまる |
| 튄다 | 跳ねる |
| 몰린다 | 集中する、殺到する |
| 간주한다·판단한다 / 오인한다 / 감지한다 | みなす・判断する / 誤認する / 検知する |
| 받아 준다 (new connections) | 受け付ける |
| 멈춰 기다린다 / 요청만 보내 둔다 | ブロックして待つ / リクエストだけ投げておく |
| 서버가 죽으면 / 전원이 꺼지면 | サーバーが落ちると / 電源が落ちると |
| 난리 (chat) | 大騒ぎ |
| 무작위로 분산 | ランダムに分散させる |
| 한꺼번에 | 一気に、一斉に |

## 12. SEO notes

Phrases people in Japan actually type when a game lags or when they investigate server lag, and where they appear:

| # | Search phrase | Used in |
|---|---|---|
| 1 | ラグ 原因 | full title, meta, cause page titles (「：ラグの原因」) |
| 2 | ゲーム ラグ 原因 / オンラインゲーム ラグ | full title (オンラインゲームのラグの原因), meta |
| 3 | ラグ 対策 | full title (原因と対策) |
| 4 | ラグい 原因 / ラグい 直し方 | keywords |
| 5 | Ping 高い 原因 / Ping値 | keywords, symptom text |
| 6 | Ping 跳ねる / Ping スパイク | graph-shape names (スパイク), prose |
| 7 | パケットロス 原因 / パケットロス 改善 | factor name, keywords |
| 8 | ゲーム カクつく 原因 | symptom name カクつき, meta (画面がカクつく) |
| 9 | ワープ ラグ / 敵がワープする | symptom name ワープ, meta |
| 10 | 引き戻される / 巻き戻る ラグ / ラバーバンド | symptom name + aliases |
| 11 | 回線落ち 原因 / 切断される | symptom 切断 alias, meta |
| 12 | 無限ロード 原因 / ログインできない | symptom name + alias |
| 13 | 入力遅延 原因 / 操作が重い | symptom name + alias |
| 14 | サーバー 重い 原因 / 処理落ち | slowmo alias, keywords (サーバーラグ) |
| 15 | 夜 ラグい / 夜だけ回線が遅い | when value 夜のピーク時間帯 |
| 16 | ネットコード / ロールバックネットコード | keywords, glossary |
| 17 | ティックレート | glossary |
| 18 | 障害 切り分け | chapter name 観測データで切り分ける (for engineers) |
| 19 | TCP 再送 遅延 | keywords, topic name TCP再送 |
| 20 | GC 停止時間 / Stop the World | cause names and glossary |

How they are used:
- Full title: 「ゲームラグ白書：オンラインゲームのラグの原因と対策、担当チームまで」 carries オンラインゲーム + ラグ + 原因 + 対策 in natural order.
- Meta description: describes symptoms with the verbs people type (画面がカクつく、キャラがワープする、接続が切れる) before 「ラグの原因」, then the scope (自分の画面からサーバーのデータベースまで) and what each entry holds.
- Symptom pages: `{症状}の原因と担当：症状別に見るゲームのラグ | ゲームラグ白書` so the query 「カクつき 原因」「無限ロード 原因」 matches the start of the title. The alias field feeds the description, so aliases hold the other words players type (カクカク、スタッター、瞬間移動、ラバーバンド、処理落ち、回線落ち…).
- Cause pages: `{原因名}（{英語名}）：ラグの原因 | ゲームラグ白書`.
- Do not stuff keywords into prose. Use each phrase where the sentence needs it.

## Decisions added during review

| Korean | Japanese | Note |
|---|---|---|
| 기본값 | デフォルト値 | never 既定値 |
| 재시도 | 再試行 | sim-rush labels リトライストーム / リトライ方式 stay |
| 느린 클라이언트 | 遅いクライアント | cause title; same in sims |
| IP 단편화 | フラグメント化 (noun IPフラグメンテーション) | memory fragmentation stays 断片化 |
| 등장 / 퇴장 알림 | 出現通知 / 消滅通知 | |
| 먼저 부를 곳 | 最初に呼ぶ担当 | playbook label |
| 로그인 대기열 (game) | ログイン待機列 | OS backlog is 接続待ちキュー |
| 혼잡 (network, ECN) | 輻輳 | |
| 가용 영역 | アベイラビリティーゾーン | AWS Japan spelling |
| 버스트형 인스턴스 | バースト可能インスタンス | |
| 가입자 | 契約者 | |
| 우편함 / 우편 | 郵便受け / 郵便 | in-game mail |
| 몰이 사냥 | まとめ狩り | |
| 회고 | ポストモーテム | |
