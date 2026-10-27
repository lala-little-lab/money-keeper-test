# #86 特別費候補・入力検証・立替の整合性修正

- 作成日：2026-10-27。基準は本体 #85。Mini #11は関連処理の参考のみ。本体の7ファイル構成を維持。
- ユーザー承認：イベント候補と今後の削除処理の①②、および入力検証・立替ポイント・楽天Pay支払元・編集エラー時の4点。

## 変更仕様

- 過去の特別費名候補は、現在の記録のeventTagにある名前のみ。現存イベント（アーカイブ含む）の名前は除外。重複排除、日本語順、文字による絞り込み、最大8件を維持。名前だけの削除履歴は候補にしない。
- 候補名は文字として描画し、引用符やHTML風の名前も選択可能。
- イベント削除はアーカイブ後の確認操作を維持。紐づく記録がなければ削除済み名一覧にも残さず、既存の同名も除去。記録があれば記録と特別費名を保持する。
- 削除対象イベントの「ONで固定」設定を本体のlocalStorageから除去。他の設定を維持。
- ③の整理機能は追加しない。過去に保存された不要情報の一括削除・起動時自動整理はしない。
- 新規登録の日付、正の整数金額、ポイント範囲、割引率、分割回数、立替の内訳、手数料を確認し、不正入力は登録前に止める。
- 立替のポイント・割引・分割・楽天Pay支払元を保存。即時残高は実支払額、カード請求は割引後請求額で扱う。自分の分／相手の分は入力値を維持し、ポイントを自動配分しない。
- 編集は記録の複製で検証し、成功時だけ元の残高効果を戻して変更を反映。エラー時は元の記録・残高・手元資金履歴を変更しない。
- 立替の登録・編集・削除で実支払額と支払元を統一。全額ポイントの0円も扱い、楽天Pay残高不足を拒否する。
- 本体固有の資金移動・チャージのメモ保存、清算済みグループの制限、既存メモ候補操作を維持。

## 変更範囲と保存

- 変更ファイル：app.js、README.md。index.html、styles.css、storage.js、backup.js、migrations.jsは#85と同一。
- 本体の保存形式・バックアップ形式を維持。Miniの暗号化保存や画面構成は取り込まない。
- 保存済み記録の一括修正・残高補正・初期化は行わない。過去に発生した残高のずれを自動で直す変更ではない。
- 更新前に本体のバックアップを保存し、従来どおり7ファイルをGitHubへ反映する。

## 確認結果

- Chromium＋ダミーデータ：入力不正の拒否、立替1000円→200ポイントに編集→削除で現金10000円へ復帰、楽天銀行支払元、全額ポイント、残高不足拒否、分割カード請求、相手の分の維持を確認。
- 編集エラー前後で保存対象データが一致。支出・入金・チャージ・返済・受取・借入・貸付の残高処理と取り消し、資金移動の手数料とメモ維持を確認。
- 清算済みグループの削除禁止、グループ化された記録の相手変更禁止を確認。
- 未使用／使用済みイベントの削除、最後の参照消滅時の候補非表示、固定設定の削除・他イベント設定保持・再読み込み保持を確認。
- #85状態データの読込み一致、再読み込み後の保存対象データ一致、メモ候補・クリア復元・末尾スクロールの既存テストを確認。JS構文確認済み。
- スマホ実機およびユーザーの端末データでは未確認。全機能・全端末を網羅した検査ではない。

---
以下は#85以前の記録です。

# #85 メモ入力の補助操作

- メモ管理を1文字分右へ移動。
- 候補・特別費メモの追加時に入力欄の末尾を表示（ページ移動・キーボード表示なし）。
- メモ見出し右にクリア／元に戻す。文章と候補・イベントのメモ用選択を復元。展開状態・分類・候補スクロールは保持。
- クリア後に入力・候補操作をした場合や新しい記録では、直前のクリアの復元を終了。
- 最後の候補タブに特別費を固定。期間を問わず非アーカイブのイベントを表示。記録・集計の紐づけは変更しない。
- メモ管理画面には特別費分類を追加しない。候補のサイズ・間隔・任意項目内の配置を維持。
- Chromiumスマホサイズでクリア復元、分類・スクロール保持、末尾表示、イベント絞り込みと既存メモ用ボタンの連動を確認。

# #84 メモ管理への移動と並べ替えつまみ

- 候補の開閉表示を右寄せ。候補展開中だけ左側に「メモ管理」を表示。
- 記録から開いた管理画面の戻る表示は「記録へ」。分類・カテゴリ内の戻る階層は維持。
- 分類一覧・分類別／カテゴリ別の言葉一覧の並べ替えつまみを各行の右端へ移動。
- 候補のサイズ・間隔と既存の並べ替え方法は維持。

# #83 記録画面のメモ候補

- 店名・メモの直下に「候補から選ぶ」を追加。その場で開閉するコンパクトな候補パネル。
- 選択カテゴリに関連する言葉を最初に表示。分類タブの選択・候補欄の左右スワイプで切り替え。
- 候補欄は縦スクロール。言葉は選択順に半角スペースで追加し、再選択で解除。
- 手入力の内容や編集済みの言葉は保持。特別費イベントのメモ機能との併用に対応。
- 新規記録では候補の選択状態をリセット。資金移動・チャージもメモを保存。
- メモ管理画面と複数ワードのAND検索は維持。
- 検証：Chromiumのスマホサイズ・タッチ操作で分類切り替えと縦スクロール、追加解除、手入力保持、特別費メモ併用を確認。資金移動・チャージの残高計算とメモ保存、再読み込みでの保持を確認。実機キーボードの確認は未実施。

# #82 分類見出しと分類追加の調整

- 分類見出しと横線をくすみピンクに変更。余白・文字サイズ・線の太さは維持。
- 言葉登録・編集内の分類追加は「＋追加」で開き、「閉じる」で閉じる。入力欄横は「確定」。
- 確定すると分類を登録・自動選択し、追加欄を閉じる。言葉・関連カテゴリは維持。

# #81 メモ一覧の分類表示・カテゴリ横スクロール

- 言葉一覧を分類順と分類内の言葉順で表示。一覧のつまみは廃止。
- 関連カテゴリは薄いグレーのタグで全件表示し、長い場合はカテゴリ部分だけ横スクロール。言葉と編集は固定。
- メモ管理の追加ボタンを「＋追加」に統一。
- カテゴリ一覧に登録済みの言葉の横スクロールプレビューを追加。カテゴリ名で詳細へ。
- 記録入力画面へのメモ候補の組み込みは今回の対象外。

# Money Keeper テスト版 #80

#79ベース。メモ管理の言葉一覧、1行表示、編集内の言葉削除、追加ボタン統一、細字の切替タブを追加。
戻る順序：分類/カテゴリ内→各一覧→言葉一覧→その他。ポップアップは先に閉じます。
分類名入力の右に保存。言葉の保存は下部固定。可視画面の高さに追従します。
関連カテゴリ開閉部に淡いピンクの背景と枠。選択項目の配置は継続。
カテゴリ名を「化粧品・ケア品」「服・靴・小物」へ変更。既存保存・旧バックアップの記録、予算、特別費、メモ関連を移行。自由記入のメモ本文は変更しません。
記録入力へのメモ候補表示は次回。

---

# Money Keeper テスト版 #79 — メモリスト管理

#78をベースに追加。記録画面のメモ候補入力は次回対応です。

- その他：💗ほしいもの／🤝貸し借り、🌟特別費／🎀メモ。
- 分類・言葉の追加、編集、削除。分類削除時は中の言葉も確認後に削除。
- 左のつまみを長押しして移動。上下キーでも並べ替え可能。
- 分類別・カテゴリ別から共通の言葉リストへ登録。カテゴリの並びは既存順。
- 言葉に複数の関連カテゴリ。連続追加では分類・関連カテゴリを引き継ぐ。
- 前後の空白を除いた一致で重複防止。既存の言葉の編集・カテゴリ追加に誘導。
- 分類・言葉の順序は保存。カテゴリ別で言葉を並べ替える場合も共通の言葉順に反映。
- 更新後の保持、JSONバックアップ・復元対応。旧バックアップではメモリストは空で復元。
- メモリストの編集・削除は既存の記録のメモを変更しません。
- 実データ入力禁止。7ファイルを同じ階層にアップロードしてください。

---

# Money Keeper テスト版 #78（2026-10-22）

- #77を基準に、メモ追加ボタンを「OFF メモ／ON メモ」のスイッチへ変更。
- 白い角丸ボタン、ONはピンクのバッジ・枠線、OFFはグレーのバッジ。左選択・右ボタンの配置を維持。
- 再タップで自動追加したイベント名のみ取り消し。追記・既存の手入力は保護。期間中の外側スイッチと連動。
- 初期未選択は操作不可。固定設定・保存集計・スクロール・他画面は変更なし。
- メモ候補・メモ全削除は今回対象外。

# Money Keeper テスト版 #77（2026-10-22）

- #76が基準。清算・貸し借りの4種類のみ、任意項目内のイベント欄を「特別費イベント（メモ用）」に変更。
- 左に選択欄、右に引落時割引と同じminiスタイルの「追加する／追加済み」。期間外・期間未設定の未アーカイブイベントも選べます。
- ONで固定とは独立。新しい記録では「選んでください」から開始。選択だけではメモを変更せず、追加ボタンで末尾へ追加。
- 期間中の外側メモスイッチと追加状態を共有。二重追加を防ぎ、外側でOFFにすると自動追加部分のみ削除。手入力・追記は保護。
- 追加済みボタンの再タップでは削除しません。メモを手動で削除すると追加する表示へ戻ります。
- 記録保存・集計・スクロール・編集画面・他の記録種別は変更なし。メモ候補機能は今回対象外。
- スマホで表示・操作をご確認ください。

# Money Keeper テスト版 #76（2026-10-22）

- #75を基準に、ページ更新・再起動後、保存データ読み込み後にONで固定の設定を初期状態へ適用。
- 固定ボタン変更時は入力中のON/OFFを変更しない。今回だけOFF、次の記録は固定設定に従う従来仕様を維持。
- 清算・貸し借り4種類では、期間中に任意項目のすぐ上へメモ用イベント枠を表示。
- 「この項目は特別費の記録・集計には入りません。」と、ON/OFFバッジ付きの「メモ：イベント名」ボタン。ONで固定は付けない。
- ボタンは右寄せ・通常幅72%、長い名前は左へ拡張、最大100%。折り返さず、限界を超える場合は末尾を省略。メモには全文を追加。
- ONでその場でメモへイベント名を追加。既存メモは残し、空白で区切って末尾に追加。追加後も自由に編集可能。任意項目は自動展開しない。
- OFFではこのボタンが自動追加した部分だけ削除。手入力の前後の文章や、元から存在するイベント名は削除しない。自動追加部分そのものを編集した場合は手入力扱いとし、ボタンをOFFにして編集後の文章を保護。
- メモ用スイッチは次の記録でOFF。入力途中の画面・日付切替ではメモを保持。
- 検証：ブラウザで更新後の固定反映・今回だけOFF・次回初期化、4種類のメモ保存（イベント集計に入らない）、手入力保護、複数イベント、3画面幅の1行表示を確認。検証環境では日本語フォントがないため、実際の日本語表示はスマホで確認してください。
- 記録保存・集計・スクロール設定・編集画面は変更なし。スマホ実機で確認してください。

## #75の変更・確認記録

- #74を基準に、特別費イベント期間中の枠の対象へ「私が立替」「相手が立替」を追加。
- 配置は既存の共通枠を使用し、いずれも任意項目のすぐ上。
- 支出と同じON/OFF・ONで固定・任意項目内のイベント選択との連携処理を共用。固定設定も同じイベント単位の設定を使用。
- 清算・貸し借りの4種類には枠を追加しない。案内メッセージ・メモ追記は今回実装しない。
- 保存・集計・スクロール計算・HTML・CSSは#74から変更なし。相手が立替の期間中のスクロール高さ調整は次回相談。
- 確認：50通りの画面種別・日付条件と、ON/OFF・任意項目との連携・固定設定の処理を自動確認。スマホ実機の表示確認は未実施。
- 枠が表示されることでフォームの高さは増えます。スマホで表示・操作を確認してください。

## #74の変更・確認記録

- #73を基準に、③相手が立替で「選ばずに閉じた場合」も記録ボタンの位置へ滑らかに戻るよう変更。
- カテゴリを選択／カテゴリ枠を再タップ／枠の外側をタップ、いずれも閉じたら戻る。
- 開く高さはイベント期間に関係なく通常時。戻る位置は#73と同じ。
- ①②のスクロール、レイアウト、編集画面などは変更なし。
- ブラウザで3種類×イベント有無×3通りの閉じ方（18条件）を確認済み。スマホ実機で動きを確認してください。

## #73の変更・確認記録

- #72を基準に「相手が立替」のカテゴリスクロールだけを調整。
- 支出・私が立替：通常時／イベント期間中の高さと選択後の位置維持は#72と同じ。
- 相手が立替：イベント期間に関係なく、開くときは通常時の共通高さ。
- 相手が立替でカテゴリを選んだ後だけ、実際の記録ボタン下端がタブの24px上に来る位置へ滑らかに戻る（ページ先頭が限界の場合はそこで停止）。
- 選ばずに閉じた場合は戻さない。手動スクロール上限・リスト内スクロールは維持。
- 任意項目が開いている場合も、その状態の記録ボタン位置を基準に戻す。すでにボタンが低い場合は逆方向に動かさない。
- 戻りの途中でタップ／スワイプ／ホイール操作を始めた場合は自動移動を停止。
- ブラウザ確認：3画面サイズ×3種類×イベント有無の18条件、③の滑らかな戻り・選択なしでの位置維持・途中停止・任意項目展開を確認。①②の測定結果は#72と一致。
- 編集画面・ボタン配置・データ保存処理は変更なし。スマホ実機で確認してください。

## #72の変更・確認記録

- #70の到達位置・通常時とイベント期間中の計算を維持。
- 自動移動を#62と同じブラウザ標準のsmoothに変更（上下両方向）。
- 手動操作と上限処理は即時追従を維持。移動中に閉じる／操作する場合は、その位置で自動移動を停止。
- 編集画面・クリアボタン・他の機能は変更なし。実機で動きを確認してください。
- ブラウザ確認：3画面サイズ×3種類×イベント有無の18条件で到達位置・選択・位置保持を確認。各画面サイズで上下の滑らかな移動、移動途中の停止、手動スクロール上限も確認。
- #71はユーザー側で#62を再確認した際のGitHubアップロード番号のため欠番。

## #70の変更・確認記録

#70：記録画面のカテゴリ展開時に自動スクロール。通常／イベント枠あり（OFFでも表示時は対象）で位置を調整。任意項目・もっと見る・分割回数・楽天Pay追加欄を閉じた標準状態を基準に、記録ボタン下端と固定タブの間に24pxを確保。立替2種類も、同じ日付の支出画面と同じカテゴリ位置。現行ではイベント枠自体は支出のみ表示ですが、立替でも期間に応じた高さを使用します。開いている間の手動スクロールはカテゴリ枠上端8pxまで。閉じた後は現在位置を保持し制限を解除。追加欄の開閉状態や入力内容は変更しません。小さい画面ではカテゴリ枠を画面内に残すことを優先します。ブラウザで3画面サイズ×3種類×期間有無の位置・選択・スクロール保持と、タッチ操作による上限／戻しを確認済み。実機確認待ち。

## #69の変更

#68を基準に、記録画面のクリアボタンのアイコンだけをFluent UI System Icons「Arrow Counterclockwise Dashes」Regularに変更。位置・サイズ・枠・背景・色（既存ボタン色を継承）・動作は維持。外部通信なしで表示するSVGをHTML内に含めています。

# Money Keeper — Step2 IndexedDB test draft

This is a **local test build**, not production-ready. Do not enter real personal financial data.

- IndexedDB snapshot restore at startup; saves most state changes after render.
- Some rare actions may not be covered yet; verify all mutation paths before production.
- No JSON export/import backup, multi-device sync, or full migrations yet.
- Data is stored in the browser on the current device, not in GitHub.
- Use only fictional amounts and verify refresh persistence in Galaxy Chrome.
- Do not publish this draft over the production site before full regression tests.
- Never commit personal finance records or backups to public GitHub.

Budget modal viewport test: lock background scrolling while keeping backdrop tap to dismiss; size modal to visual viewport above keyboard.
Test deployment retry 2026-10-16

## 2026-10-17 楽天Pay＋ボタン配置 テスト版
- やること編集の最下段を「削除 / 表示しない / 決定」2:3:5 の横一列に修正。
- 支出で楽天Payを選ぶと「楽天カード / 楽天キャッシュ残高」の支払元を選択可能。
- 楽天カード払いはカード請求、楽天キャッシュ払いは保有残高に反映。編集・削除時の残高戻しにも対応。
- 楽天キャッシュ残高は「残高を合わせる」でテスト設定。チャージ専用画面の対応は未実装。
- 手数料の新仕様は今回対象外。架空データのみで試してください。

## 手数料追加テスト（架空データ専用）
- 通常支出と貸し借り清算（返した・返された）に任意手数料を追加。
- 手数料は「その他」支出として集計し、清算の元金から切り離します。
- 楽天Pay残高・口座支払いは手数料込みで増減し、カード払いは請求に加算。
- 編集・削除で手数料分も戻します。資金移動の従来の手数料は維持。
- ブラウザ上の実操作・複雑な組み合わせは未検証。実データ禁止。

## 2026-10-19 修正途中・動作検証用
- カード請求内訳：前後の月へ移動、記録の前月/翌月移動を追加。
- 履歴検索：金額表記と空白区切りのAND条件を追加。
- 定期支払い：編集ポップアップと削除操作を追加。
- カード引落：確定請求に対し引落日以降に確認操作。銀行残高・手元資金通帳へ反映し、再支出計上しない。二重操作を防止。引落確認のやることを強調表示。
- これは中間テスト版。給与サイクル・引落準備、貸し借り個別アーカイブ、一部調整、定期支払い周期の完全検証など未対応・未検証の項目が残る。実データ入力禁止。


## 2026-10-19 請求画面・定期支払い表示修正（追加テスト版）
- 定期支払い編集シートのスマホ横幅崩れ対策。
- 請求上段のみ詳細、下段は簡易表示。記録一覧は最下部で折りたたみ。
- 確定済みの再照合は必要な場合のみ展開。引落確認ボタンは確定済みかつ引落日以降のみ有効。
- 引落反映の取り消し（口座残高・通帳の復元）。旧バージョンで反映した通帳には識別子がないため、取消調整行を記録する場合があります。
- 日本の祝日・銀行休業日による引落日自動補正は未実装。実際の引落日がずれる場合は引落確認を急がないでください。
- 実機の総合テスト・実データ移行は未完了。実データ入力禁止。


## UI hotfix (2026-10-19)
- Bill item accordion: replace confusing open/close label with ▼ / ▲.
- Recurring editor: move modal to body and enforce viewport-wide overlay with 520px max sheet to fix narrow left-aligned popup.
- Test-only; mobile browser visual verification still needed.

## #55 correction — bill confirmation cancellation
- Add `確定を取り消す` inside expanded `確定額を修正・再照合`, with confirmation prompt.
- Restore unconfirmed status and calculated amount; do not delete transactions or bill items.
- Prevent cancellation after withdrawal is reflected; use existing withdrawal reversal first.
- No real personal data included. Bank-preparation and recurring debit integration remain out of scope.

## 特別費 UI 改善（2026-10-21 / テスト版）
- カテゴリを複数選択し、選択した行の予算を直接編集。金額空欄は「予算未設定」、0円は0円予算として区別。
- 金額欄の右の「クリア」で予算だけを未設定に戻す。カテゴリ選択は維持。
- 支出がある未選択カテゴリはイベント詳細に自動表示。支出がなくなれば非表示（手動選択したカテゴリは維持）。
- イベントの記録一覧は折りたたみ、全件表示、イベント内カテゴリで絞り込み。
- 編集フォームは「変更を保存」、新規フォームは「作成」。保存まではドラフト扱い。
- 実機の表示・操作テストは未実施。架空データで確認してください。

## #58 Special expenses display adjustments
- Widen transaction category filter, prioritize spending amount, add category picker chevron.
- Show currency prefix and thousands separators in event budget rows; reclaim label width.
- Test build only; verify mobile layout and data persistence before production.

## #59 Special Expenses UI (test)
- Record form: date-scoped optional event suggestion, independent ON/OFF and per-event fixed default (saved in localStorage); default OFF unless fixed.
- Special expense category budget compact left-aligned yen input; overbudget shown as 超過.
- Event transaction category filter remains visible while collapsed; selecting expands.
- Event editing replaces the original card inline, with compact edit and archive controls.
- Generic special expense icon changed to 🌟; individual event names are untouched.


#61: イベント名ボタンで特別費ON/OFF（右寄せ72%、ONピンク枠＋左バッジ、OFFグレー枠＋左バッジ）。支払方法の表示・内部状態を記録後も一致させて引き継ぎ、未選択の文字を細字化。記録画面にリセットアイコン追加（確認なし、タブ移動では入力保持、ONで固定の設定は維持）。

## Third-party icon notice

The Arrow Counterclockwise Dashes icon is from Microsoft Fluent UI System Icons (Regular, 24px), https://github.com/microsoft/fluentui-system-icons.

MIT License

Copyright (c) 2020 Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
