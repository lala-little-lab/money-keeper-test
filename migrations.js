/* Step2 DRAFT: versioned envelope; future migrations belong here. */
const MKMigrations={
  currentVersion:2,
  renameCategories(data){
    const aliases={'化粧品・ボディケア・ネイル':'化粧品・ケア品','化粧品・ボディケア品':'化粧品・ケア品','化粧品・ボディケア':'化粧品・ケア品','服・靴・バッグ・アクセサリー':'服・靴・小物'};
    const name=x=>aliases[x]||x;
    const keys=obj=>{if(!obj||typeof obj!=='object'||Array.isArray(obj))return;for(const old of Object.keys(obj)){const next=name(old);if(next!==old){if(!(next in obj))obj[next]=obj[old];delete obj[old]}}};
    for(const key of ['txs','recurring','loans','cashbook'])if(Array.isArray(data[key]))for(const row of data[key])if(row&&typeof row.category==='string')row.category=name(row.category);
    keys(data.categoryBudgets);
    if(data.categoryBudgetHistory)Object.values(data.categoryBudgetHistory).forEach(keys);
    if(Array.isArray(data.eventsData))for(const event of data.eventsData){keys(event.catBudgets);if(Array.isArray(event.selectedCats))event.selectedCats=[...new Set(event.selectedCats.map(name))]}
    if(Array.isArray(data.mkMemoData?.words))for(const word of data.mkMemoData.words)if(Array.isArray(word.cats))word.cats=[...new Set(word.cats.map(name))];
    return data;
  },
  upgrade(envelope){
    if(!envelope||typeof envelope!=='object'||!Number.isInteger(envelope.schemaVersion))throw new Error('Unversioned database');
    if(![1,this.currentVersion].includes(envelope.schemaVersion))throw new Error('Unsupported data version: '+envelope.schemaVersion);
    if(!envelope.data||typeof envelope.data!=='object')throw new Error('Invalid database payload');
    const result=structuredClone(envelope);
    if(result.schemaVersion===1){
      if(result.data.mkSettings!==undefined)throw Error('旧形式に未知の設定があります。');
      result.data.mkSettings=mkSeedSettings();result.schemaVersion=2;
    }
    mkValidateStoredSettings(result.data);
    return result;
  }
};
