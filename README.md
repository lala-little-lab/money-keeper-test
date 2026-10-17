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
