/* Money Keeper Step2 DRAFT: local-only IndexedDB snapshot store. */
const MKStorage=(()=>{
  const DB_NAME='money-keeper-local', DB_VERSION=1, STORE='app_state', KEY='primary';
  let dbPromise;
  function open(){
    if(!('indexedDB' in window))return Promise.reject(new Error('IndexedDB unavailable'));
    if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
      request.onblocked=()=>reject(new Error('Database upgrade blocked'));
    });
    return dbPromise;
  }
  async function load(){const db=await open();return new Promise((resolve,reject)=>{
    const req=db.transaction(STORE,'readonly').objectStore(STORE).get(KEY);
    req.onsuccess=()=>resolve(req.result?MKMigrations.upgrade(req.result):null);
    req.onerror=()=>reject(req.error);
  })}
  let queue=Promise.resolve();
  function save(data){
    const payload={schemaVersion:MKMigrations.currentVersion,savedAt:new Date().toISOString(),data:structuredClone(data)};
    queue=queue.catch(()=>{}).then(async()=>{const db=await open();return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(payload,KEY);
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    })});
    return queue;
  }
  return {load:async()=>{const envelope=await load();return envelope?.data??null},save};
})();
