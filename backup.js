/* Money Keeper Step3: TEST BUILD ONLY. Manual JSON backup and restore.
   Add <script src="backup.js"></script> AFTER app.js in index.html. */
(() => {
  'use strict';
  const FORMAT = 'money-keeper-backup';
  const MAX_BYTES = 10 * 1024 * 1024;
  const REQUIRED_ARRAYS = ['txs', 'cashbook', 'snapshots', 'wishes', 'recurring', 'eventsData', 'loanGroups'];
  const OPTIONAL_ARRAYS = ['loans', 'deletedEventNames', 'loanArchivedPeople'];
  const OPTIONAL_OBJECTS = ['billAdjustments', 'billItemAdjustments', 'categoryBudgets', 'chargeDefaults'];

  function status(text, isError = false) {
    const el = document.getElementById('mk-backup-status');
    if (el) {
      el.textContent = text;
      el.style.color = isError ? '#b94242' : '#486c57';
    }
  }

  function validate(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('データの形式が正しくありません。');
    for (const key of REQUIRED_ARRAYS) {
      if (!Array.isArray(data[key])) throw Error(key + ' が正しくありません。');
    }
    for (const key of OPTIONAL_ARRAYS) {
      if (data[key] !== undefined && !Array.isArray(data[key])) throw Error(key + ' が正しくありません。');
    }
    if (!data.balances || typeof data.balances !== 'object' || Array.isArray(data.balances)) throw Error('残高データが正しくありません。');
    for (const [key, value] of Object.entries(data.balances)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw Error('残高 ' + key + ' が正しくありません。');
    }
    for (const key of OPTIONAL_OBJECTS) {
      if (data[key] !== undefined && (!data[key] || typeof data[key] !== 'object' || Array.isArray(data[key]))) throw Error(key + ' が正しくありません。');
    }
    if (data.monthlyBudget !== undefined && (!Number.isSafeInteger(data.monthlyBudget) || data.monthlyBudget < 0)) throw Error('月予算が正しくありません。');
    if (data.loanGroupSerial !== undefined && !Number.isSafeInteger(data.loanGroupSerial)) throw Error('グループ番号が正しくありません。');
    for (const key of REQUIRED_ARRAYS) {
      for (const item of data[key]) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) throw Error(key + ' の内容が正しくありません。');
      }
    }
    if(data.mkMemoData!==undefined)mkMemoValidate(data.mkMemoData);
    mkValidateStoredSettings(data);
    return data;
  }

  function checkStorage() {
    if (typeof mkStorageReady === 'undefined' || !mkStorageReady) throw Error('ブラウザ保存が利用できません。');
    if (typeof mkState !== 'function' || typeof MKStorage === 'undefined' || typeof MKMigrations === 'undefined') throw Error('保存機能が見つかりません。');
  }

  async function exportBackup() {
    try {
      checkStorage();
      const data = structuredClone(mkState());
      validate(data);
      await MKStorage.save(data);
      const payload = {
        format: FORMAT,
        backupVersion: 1,
        schemaVersion: MKMigrations.currentVersion,
        exportedAt: new Date().toISOString(),
        data
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const d = new Date();
      const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      a.href = url;
      a.download = `money-keeper-test-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      status('バックアップのダウンロードを開始しました。Chromeのダウンロード一覧を確認してね。');
    } catch (e) {
      console.error('Money Keeper backup export failed:', e);
      status('バックアップ失敗：' + e.message, true);
    }
  }

  async function importBackup(file) {
    if (!file) return;
    try {
      checkStorage();
      if (file.size > MAX_BYTES) throw Error('ファイルが大きすぎます（10MBまで）。');
      const payload = JSON.parse(await file.text());
      if (payload?.format !== FORMAT || payload.backupVersion !== 1) throw Error('Money Keeperの対応バックアップではありません。');
      const data = MKMigrations.renameCategories(validate(MKMigrations.upgrade(payload).data));
      const answer = confirm(
        '【テスト版】現在のデータをバックアップ内容で全て置き換えます。\n\n' +
        'バックアップ日時：' + (payload.exportedAt || '不明') + '\n' +
        '記録：' + data.txs.length + '件\n\n' +
        '元に戻すことはできません。現在のデータは別にバックアップした？'
      );
      if (!answer) {
        status('復元をキャンセルしました。');
        return;
      }
      // Prevent a delayed save of the pre-restore state from overwriting imported data.
      if (typeof mkSaveTimer !== 'undefined') {
  clearTimeout(mkSaveTimer);
  mkSaveTimer = null;
}
      await MKStorage.save(structuredClone(data));
      status('復元データを保存しました。再読み込みします。');
      location.reload();
    } catch (e) {
      console.error('Money Keeper backup import failed:', e);
      status('復元できませんでした：' + e.message, true);
    }
  }

  function mount() {
    const other = document.querySelector('#other section');
    if (!other || document.getElementById('mk-backup-card')) return;
    const card = document.createElement('div');
    card.id = 'mk-backup-card';
    card.className = 'card';
    card.innerHTML = `
      <div class="mid">📦 バックアップ・復元（テスト）</div>
      <div class="small" style="margin:8px 0 12px">
        データをJSONファイルとしてスマホに保存できます。
        復元すると、今のブラウザ内データはバックアップの内容に置き換わります。
      </div>
      <button type="button" id="mk-export" class="outline" style="width:100%;margin-bottom:10px">バックアップを保存</button>
      <button type="button" id="mk-import" class="outline" style="width:100%">バックアップから復元</button>
      <input id="mk-import-file" type="file" accept=".json,application/json" style="display:none">
      <div id="mk-backup-status" class="small" role="status" aria-live="polite" style="margin-top:10px"></div>
      <div class="small" style="margin-top:8px">⚠️ 実データ入力禁止。JSONには記録内容がそのまま入るため、公開GitHubにはアップロードしないでね。</div>`;
    other.appendChild(card);
    card.querySelector('#mk-export').addEventListener('click', exportBackup);
    const fileInput = card.querySelector('#mk-import-file');
    card.querySelector('#mk-import').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      importBackup(file);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
