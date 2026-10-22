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
