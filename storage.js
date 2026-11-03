/* #101: password-encrypted snapshots. No password/key persistence. */
const MKStorage=(()=>{
 'use strict';
 const production=location.pathname.split('/').includes('money-keeper');
 const DB_NAME=production?'money-keeper-production-encrypted-v1':'money-keeper-local';
 const STORE='app_state',KEY='primary',FORMAT='money-keeper-encrypted',ITER=600000;
 const enc=new TextEncoder(),dec=new TextDecoder();
 let dbPromise,key=null,salt=null,revision=null,queue=Promise.resolve();
 const b64=b=>{let s='';for(const n of new Uint8Array(b))s+=String.fromCharCode(n);return btoa(s)};
 const bytes=s=>{if(typeof s!=='string'||s.length>30000000)throw Error('暗号化データの形式が正しくありません。');return Uint8Array.from(atob(s),c=>c.charCodeAt(0))};
 function open(){if(!crypto.subtle||!window.indexedDB)throw Error('この環境では暗号化保存を利用できません。HTTPSの通常ブラウザで開いてください。');
  return dbPromise||(dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('ほかのタブを閉じて再読み込みしてください。'))}));}
 async function raw(){const db=await open();return new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).get(KEY);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
 async function derive(password,s){const material=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:s,iterations:ITER,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
 function checkEnvelope(e){if(!e||e.format!==FORMAT||e.version!==1||e.iterations!==ITER||bytes(e.salt).length!==16||bytes(e.iv).length!==12||bytes(e.ciphertext).length<16)throw Error('対応する暗号化バックアップではありません。')}
 async function seal(data,k=key,s=salt){if(!k||!s)throw Error('ロックを解除してください。');const iv=crypto.getRandomValues(new Uint8Array(12));const payload={schemaVersion:MKMigrations.currentVersion,data};const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(FORMAT+'|1')},k,enc.encode(JSON.stringify(payload)));return {format:FORMAT,version:1,iterations:ITER,salt:b64(s),iv:b64(iv),ciphertext:b64(cipher),revision:crypto.randomUUID(),savedAt:new Date().toISOString()}}
 async function unseal(e,k){checkEnvelope(e);let payload;try{payload=JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(e.iv),additionalData:enc.encode(FORMAT+'|1')},k,bytes(e.ciphertext))))}catch{throw Error('パスワードが違うか、ファイルが破損しています。')}
  if(payload.data===null){if(payload.schemaVersion!==MKMigrations.currentVersion)throw Error('対応していないデータ形式です。');return null}return MKMigrations.upgrade(payload).data;}
 // Compare-and-swap prevents stale tabs from overwriting newer data/passwords.
 async function commit(e,expected){const db=await open();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),r=store.get(KEY);let conflict=false;r.onsuccess=()=>{const current=r.result;const token=current?.format===FORMAT?current.revision:JSON.stringify(current??null);if(token!==expected){conflict=true;tx.abort();return}store.put(e,KEY)};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(conflict?Error('別のタブでデータが更新されました。上書きを止めました。この画面のバックアップを保存してから再読み込みしてください。'):tx.error)});revision=e.revision;}
 function save(data){const snapshot=structuredClone(data);queue=queue.catch(()=>{}).then(async()=>{const e=await seal(snapshot);await commit(e,revision)});return queue;}
 async function load(){const e=await raw();if(e?.format===FORMAT){checkEnvelope(e);return MKSecurity.prompt('ロック解除',false,async password=>{const k=await derive(password,bytes(e.salt));const data=await unseal(e,k);key=k;salt=bytes(e.salt);revision=e.revision;return data})}
  if(production&&e)throw Error('本番用保存領域に未対応データがあります。');
  let data=e?MKMigrations.upgrade(e).data:null;
  if(data&&data.mkEventFixed===undefined){try{data.mkEventFixed=JSON.parse(localStorage.getItem('mk-event-fixed-59')||'{}')}catch{data.mkEventFixed={}};mkValidateStoredSettings(data)}
  return MKSecurity.prompt(data?'保存データを暗号化':'パスワード設定',true,async password=>{const s=crypto.getRandomValues(new Uint8Array(16)),k=await derive(password,s),encrypted=await seal(data,k,s);await unseal(encrypted,k);await commit(encrypted,JSON.stringify(e??null));key=k;salt=s;try{if(!production)localStorage.removeItem('mk-event-fixed-59')}catch{}return data});}
 async function decryptBackup(e,password){checkEnvelope(e);return unseal(e,await derive(password,bytes(e.salt)))}
 async function changePassword(data,password){const snapshot=structuredClone(data);queue=queue.catch(()=>{}).then(async()=>{const s=crypto.getRandomValues(new Uint8Array(16)),k=await derive(password,s),e=await seal(snapshot,k,s);await unseal(e,k);await commit(e,revision);key=k;salt=s});return queue;}
 async function recover(data,password){const current=await raw();const expected=current?.format===FORMAT?current.revision:JSON.stringify(current??null);const s=crypto.getRandomValues(new Uint8Array(16)),k=await derive(password,s),e=await seal(structuredClone(data),k,s);await unseal(e,k);await commit(e,expected);key=k;salt=s;}
 return {recover,available:async()=>{await open();return true},load,save,exportEncrypted:data=>seal(structuredClone(data)),decryptBackup,changePassword,flush:()=>queue,forget:()=>{key=null;salt=null},isUnlocked:()=>!!key,production};
})();

// The lock hides and disables the existing document, preserving unsubmitted forms
// in this tab's memory. Reload/close discards that memory and always requires unlock.
const MKSecurity=(()=>{
 let busy=false,hiddenAt=null,timer=null,locking=false,covered=false,active=false;
 const inertBefore=new Map();
 function shield(){
  const on=covered||active;
  document.documentElement.classList.toggle('mk-secure-covered',on);
  document.getElementById('mkPrivacyShield').hidden=!on;
  for(const el of document.body.children){if(['mkSecurityGate','mkPrivacyShield'].includes(el.id)||el.tagName==='SCRIPT')continue;
   if(on){if(!inertBefore.has(el))inertBefore.set(el,el.inert);el.inert=true}
   else if(inertBefore.has(el)){el.inert=inertBefore.get(el);inertBefore.delete(el)}
  }
 }
 function cover(on){covered=on;shield()}
 function prompt(title,create,action,cancel=false,noteText=''){
  const host=document.getElementById('mkSecurityGate');host.replaceChildren();host.hidden=false;active=true;shield();
  const form=document.createElement('form');form.className='card mk-security-form';
  const h=document.createElement('h2');h.textContent=title;form.append(h);
  const note=document.createElement('p');note.className='small';note.textContent=noteText||(create?'12文字以上のパスワードを設定してください。忘れると解除できません。変更前のバックアップには以前のパスワードが必要です。':'この端末の保存データを開くパスワードを入力してください。');form.append(note);
  const fields=[];for(const label of create?['パスワード','パスワード（確認）']:['パスワード']){const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');input.type='password';input.autocomplete=create?'new-password':'current-password';input.required=true;input.maxLength=256;input.setAttribute('aria-label',label);l.append(input);form.append(l);fields.push(input)}
  const error=document.createElement('p');error.className='small';error.setAttribute('role','alert');form.append(error);
  const submit=document.createElement('button');submit.type='submit';submit.className='btn';submit.textContent=create?'設定して保存':'解除';form.append(submit);
  return new Promise(resolve=>{
   function close(result){fields.forEach(i=>i.value='');host.hidden=true;host.replaceChildren();active=false;shield();resolve(result)}
   if(cancel){const back=document.createElement('button');back.type='button';back.className='outline';back.textContent='キャンセル';back.onclick=()=>{if(!busy)close(null)};form.append(back)}
   else{const restore=document.createElement('button');restore.type='button';restore.className='outline';restore.textContent='バックアップから復元';restore.onclick=()=>{if(!busy)window.mkRecoverBackup?.()};form.append(restore)}
   form.onsubmit=async e=>{e.preventDefault();if(busy)return;const password=fields[0].value;if(create&&(password.length<12||password!==fields[1].value)){error.textContent='12文字以上で、確認欄と同じパスワードを入力してください。';return}busy=true;submit.disabled=true;error.textContent='確認中…';try{const result=await action(password);close(result)}catch(err){error.textContent=err.message;fields.forEach(i=>i.value='');fields[0].focus()}finally{busy=false;submit.disabled=false}};
   host.append(form);fields[0].focus();
   form.onkeydown=e=>{if(e.key==='Tab'){const nodes=[...form.querySelectorAll('input,button')].filter(x=>!x.disabled);if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus()}}};
  });
 }
 function message(text){const el=document.getElementById('mkSaveStatus');if(el)el.textContent=text}
 async function flush(){clearTimeout(mkSaveTimer);mkSaveTimer=null;await MKStorage.flush();if(mkSetupMode)return;await MKStorage.save(mkState())}
 async function lock(){
  if(locking||!MKStorage.isUnlocked())return;
  if(busy||active||mkSettingsBusy||mkMemberBusy||(!mkStorageReady&&!mkSetupMode&&document.getElementById('mkSaveBar').hidden)){clearTimeout(timer);timer=setTimeout(lock,250);return}
  locking=true;cover(true);clearTimeout(timer);
  try{
   // Failed writes must remain recoverable; retry snapshots the current in-memory state.
   clearTimeout(mkSaveTimer);await MKStorage.flush().catch(()=>{});
   if(!mkSetupMode)await MKStorage.save(mkState());
  }catch(e){locking=false;hiddenAt=document.hidden?Date.now():null;cover(document.hidden);failed(e);return}
  const previous=JSON.stringify(mkState());mkStorageReady=false;MKStorage.forget();
  try{const data=await MKStorage.load();
   if(data&&JSON.stringify(data)!==previous){location.reload();return}
   mkStorageReady=!mkSetupMode;locking=false;hiddenAt=document.hidden?Date.now():null;cover(document.hidden);message('保存済み');
   if(document.hidden)timer=setTimeout(lock,300000);
  }catch(e){message('ロックを解除できません：'+e.message);location.reload()}
 }
 function failed(e){mkStorageReady=false;message('保存できていません。画面を閉じずに再試行するか、その他から暗号化バックアップを保存してください。 '+(e?.message||'保存エラー'));document.getElementById('mkSaveBar').hidden=false;document.getElementById('mkRetrySave').hidden=false}
 async function retry(){try{clearTimeout(mkSaveTimer);await MKStorage.flush().catch(()=>{});if(!mkSetupMode)await MKStorage.save(mkState());mkStorageReady=!mkSetupMode;message('保存済み');document.getElementById('mkSaveBar').hidden=true;document.getElementById('mkRetrySave').hidden=true}catch(e){failed(e)}}
 async function change(){if(locking||busy||active||!mkStorageReady||mkSettingsBusy||mkMemberBusy)return;clearTimeout(mkSaveTimer);try{await flush()}catch(e){failed(e);return}mkStorageReady=false;await prompt('パスワード変更',true,async password=>{await MKStorage.changePassword(mkState(),password);return true},true);mkStorageReady=true;message('保存済み')}
 function ready(){if(document.hidden){hiddenAt=Date.now();cover(true);timer=setTimeout(lock,300000)}}
 document.addEventListener('visibilitychange',()=>{
  if(!MKStorage.isUnlocked())return;
  if(document.hidden){if(hiddenAt===null)hiddenAt=Date.now();cover(true);clearTimeout(timer);timer=setTimeout(lock,300000);if(mkStorageReady&&!active&&!mkSettingsBusy&&!mkMemberBusy)flush().catch(failed)}
  else if(hiddenAt!==null){if(Date.now()-hiddenAt>=300000)lock();else{hiddenAt=null;clearTimeout(timer);cover(false)}}
 });
 window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
 window.addEventListener('beforeunload',e=>{if(!document.getElementById('mkSaveBar').hidden){e.preventDefault();e.returnValue=''}});
 return {prompt,lock,change,retry,failed,message,flush,ready};
})();
