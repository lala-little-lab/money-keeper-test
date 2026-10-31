const MK_MONEY_FIELDS=new Set(['amount','gross','mine','theirs','recAmount','newEventBudget','newEventCatAmount','wishPrice','loanExtraAmount','editExtraAmount','editGross','editMine','editOther','editAmount','moneyPromptValue','transferFee','editTransferFee','recordFee','editRecordFee']);
let moneyPromptSave=null,moneyPromptMin=0;
function moneyNum(value){if(typeof value==='number')return Number.isFinite(value)?value:0;const raw=String(value??'').replace(/[¥￥,，\s]/g,'').replace(/[^0-9.\-]/g,'');return Math.trunc(Number(raw))||0}
function moneyFormatted(value){const raw=String(value??'').replace(/[−－]/g,'-');let neg=raw.trim().startsWith('-')?'-':'';let digits=raw.split('.')[0].replace(/\D/g,'');if(!digits)return neg;return neg+Number(digits).toLocaleString('ja-JP')}
function formatMoneyElement(input,keepCaret=false){
 if(!input||input.dataset.moneyReady!=='1'||input.type==='number')return;
 const original=input.value;
 if(!original)return;
 const next=moneyFormatted(original);
 if(original===next)return;
 let before=0;
 try{before=original.slice(0,input.selectionStart??original.length).replace(/\D/g,'').length}catch(_){before=original.replace(/\D/g,'').length}
 input.value=next;
 if(keepCaret&&document.activeElement===input){let pos=0,count=0;while(pos<next.length&&count<before){if(/[0-9]/.test(next[pos]))count++;pos++}try{input.setSelectionRange(pos,pos)}catch(_){}}
}
function attachMoneyInput(input){
 if(input.dataset.moneyReady==='1')return;
 input.dataset.moneyReady='1';input.type='text';input.inputMode='numeric';input.autocomplete='off';
 let wrapper=input.parentElement;
 if(!wrapper.classList.contains('money-input')){
  wrapper=document.createElement('div');wrapper.className='money-input mk-money-input';
  input.parentNode.insertBefore(wrapper,input);wrapper.appendChild(input);
 }else wrapper.classList.add('mk-money-input');
 if(!wrapper.querySelector('.money-prefix')){let prefix=document.createElement('span');prefix.className='money-prefix';prefix.textContent='¥';wrapper.insertBefore(prefix,input)}
 input.addEventListener('input',()=>formatMoneyElement(input,true));
 input.addEventListener('blur',()=>formatMoneyElement(input));
}
function refreshMoneyInputs(){document.querySelectorAll('input[data-money-ready="1"]').forEach(input=>{if(document.activeElement!==input)formatMoneyElement(input)})}
function initMoneyInputs(){document.querySelectorAll('input').forEach(input=>{if(MK_MONEY_FIELDS.has(input.id)||input.id.startsWith('actual-')||input.id==='mkInlineBudgetAmount')attachMoneyInput(input)})}
let moneyPromptAllowBlank=false;
function openMoneyPrompt(title,current,cb,opt={}){
 moneyPromptSave=cb;moneyPromptMin=opt.min??0;moneyPromptAllowBlank=!!opt.allowBlankAsZero;
 $('moneyPromptTitle').textContent=title;$('moneyPromptValue').value=String(current??'');$('moneyPromptHint').textContent=opt.hint||'';$('moneyPromptError').textContent='';
 $('moneyPromptModal').classList.remove('hidden');initMoneyInputs();formatMoneyElement($('moneyPromptValue'));$('moneyPromptValue').focus({preventScroll:true});
}
function closeMoneyPrompt(){$('moneyPromptModal').classList.add('hidden');moneyPromptSave=null}
function saveMoneyPrompt(){let input=$('moneyPromptValue');const raw=input.value,n=raw.trim()?moneyNum(raw):(moneyPromptAllowBlank?0:NaN);if(!Number.isSafeInteger(n)||n<moneyPromptMin){$('moneyPromptError').textContent='金額を確認してね';return}const cb=moneyPromptSave;closeMoneyPrompt();if(cb)cb(n)}

const cats=['食材','コンビニ','カフェ・外食','美容','化粧品・ケア品','服・靴・小物','日用品','雑貨','医療','プロテイン・サプリ','トレーニング','交通・ガソリン','家族','推し活','宿泊','交際費','娯楽','手数料','その他'];
let pays=[];
let incomePays=[];
let balances={};
let rakutenPaySource='';
let recurring=[];
let eventsData=[];
let mkEventSelectedCats=[],mkEventRecordsOpen={},mkEventRecordFilters={};
let loanActivePerson='',loanExpandedPerson='',lastSavedLoanPerson='',loanArchiveView=false,loanOrganize=false,loanAddToGroupId='',loanArchivedPeople=[],loanFoldAfter={},loanFoldExpanded={},loanSelectedIds=new Set(),histMoreOpen=false;
let loanExtraPerson='',loanExtraDirection='lend';
let loanGroups=[],loanGroupSerial=0;
let mkTodos=[],mkTodoHidden={};
let txs=[],loans=[],cashbook=[],snapshots=[],wishes=[],billAdjustments={},billItemAdjustments={},deletedEventNames=[],mode='expense',loanKind='lend',loanSection='advance',category='',payment='',eventTag='',discount=0,installments=1,from='',to='',chargeTarget='',chargeSource='',histTab='spend',histType='all',histCat='',histPay='',histEvent='',histPeriod='',histStart='',histEnd='',histKeyword='',editingId='',openEventId='',newEventCat='',newEventCatBudgets={},recType='normal',recCategory='',recurringEditIndex=-1,monthlyBudget=190000,transferFeeSide='from',chargeDefaults={},categoryBudgets={},monthlyBudgetHistory={},categoryBudgetHistory={},analysisMonth=new Date().toLocaleDateString('sv-SE').slice(0,7);
const $=id=>document.getElementById(id),yen=n=>'¥'+Math.round(Number(n)||0).toLocaleString('ja-JP');$('date').value=new Date().toLocaleDateString('sv-SE');
// Browser history integration: a navigation is one history entry, not a reload.
let mkRestoringNavigation=false;
function mkNavigationButton(id){
 const main=['home','record','history','due','budget','other'];
 const index=main.includes(id)?main.indexOf(id):5;
 return document.querySelectorAll('.bottom .nav')[index]||null;
}
function mkDisplayPage(id,b){
 if(!$(id)||!$(id).classList.contains('page'))return;
 try{sessionStorage.setItem('mk-last-page',id)}catch(_){}
 document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
 $(id).classList.add('active');
 document.querySelectorAll('.bottom .nav').forEach(x=>x.classList.remove('active'));
 const button=b||mkNavigationButton(id);if(button)button.classList.add('active');
 if($('mkBackAnalysis'))$('mkBackAnalysis').classList.add('hidden');
 scrollTo(0,0);
}
function nav(id,b){
 if(!$(id)||!$(id).classList.contains('page'))return;
 const current=document.querySelector('.page.active')?.id;
 if(!mkRestoringNavigation&&current!==id){
  try{history.pushState({mkPage:id},'',location.href)}catch(_){}
 }
 mkDisplayPage(id,b);
}
window.addEventListener('popstate',function(event){
 if(mkSettingsHandlePop(event))return;
 if(event.state?.memo){mkMemoOrigin=event.state.memo.origin||'other';mkMemoHide();mkMemoView=event.state.memo.view||'words';mkMemoScope=event.state.memo.scope||'';if(mkMemoView==='groups'&&mkMemoScope&&!mkMemoData.groups.some(g=>g.id===mkMemoScope))mkMemoScope='';mkMemoRender();mkDisplayPage('memoManager',mkNavigationButton('memoManager'));if(event.state.memo.modal)mkMemoHistory(true);return;}
 if(document.querySelector('.page.active')?.id==='memoManager')mkMemoHide();
 const id=event.state&&event.state.mkPage;
 if(!id||!$(id)||!$(id).classList.contains('page'))return;
 // Do not silently discard a modal's draft on Back. Close it explicitly.
 const modalOpen=[...document.querySelectorAll('.modal')].some(el=>!el.classList.contains('hidden'));
 const todo=$('mkTodoModal');
 const trend=$('mkTrendOverlay');
 if(modalOpen||(todo&&!todo.hidden)||(trend&&!trend.classList.contains('hidden'))){
  try{history.forward()}catch(_){}
  return;
 }
 mkRestoringNavigation=true;
 try{mkDisplayPage(id,mkNavigationButton(id))}finally{mkRestoringNavigation=false}
});
function openOther(id){nav(id,document.querySelectorAll('.nav')[5])}function backOther(){nav('other',document.querySelectorAll('.nav')[5])}function openLoansFromOther(){loanExpandedPerson='';loanActivePerson='';loanArchiveView=false;loanOrganize=false;loanAddToGroupId='';loanSelectedIds.clear();openOther('loans');renderLoans()}
function total(){return Object.values(balances).reduce((s,x)=>s+x.v,0)}function renderBalances(){$('cashTotal').textContent=yen(total());$('prePay').textContent=yen(total());$('balanceList').innerHTML=Object.entries(balances).filter(([k])=>!mkHiddenBalance(k)).map(([k,x])=>`<div class="row item"><span>${safeHtml(x.name)}</span><strong>${yen(x.v)}</strong></div>`).join('')}
function openPicker(title,items,cb){$('pickerTitle').textContent=title;$('pickerList').innerHTML='';items.forEach(it=>{let b=document.createElement('button');b.className='pickitem';b.textContent=it.label;b.onclick=()=>{closePicker();cb(it.value,it.label)};$('pickerList').appendChild(b)});const picker=$('pickerModal');picker.style.zIndex=!$('mkRecurringModal').classList.contains('hidden')?'130':'';picker.classList.remove('hidden')}function closePicker(){$('pickerModal').classList.add('hidden');$('pickerModal').style.zIndex=''}
function adjustBalance(){openPicker('残高を合わせる口座',Object.entries(balances).map(([k,v])=>({label:v.name,value:k})),(k,l)=>{openMoneyPrompt(l+' の実際の残高',balances[k].v,(n)=>{let d=n-balances[k].v;balances[k].v=n;cashbook.unshift({date:$('date').value,text:'残高調整：'+l,delta:d});renderAll()},{min:-999999999})})}
function saveSnapshot(){snapshots.unshift({date:$('date').value,value:total()});$('snapshotList').innerHTML=snapshots.map(s=>`<div class="row item"><span>${s.date}</span><strong>${yen(s.value)}</strong></div>`).join('')}
let mkGroupKind='bill',mkGroupLoanView=false,mkGroupExpanded='';
function setMode(m,b){mode=m;document.querySelectorAll('.mode-choice').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('loanSections').classList.toggle('hidden',m!=='loan');$('loanGroups').classList.toggle('hidden',m!=='loan');mkGroupModePaint();updateForm()}function setLoanSection(sec,b){loanSection=sec;document.querySelectorAll('#loanSections .mini').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('loanAdvance').classList.toggle('hidden',sec!=='advance');$('loanSettle').classList.toggle('hidden',sec!=='settle');$('loanLendBorrow').classList.toggle('hidden',sec!=='lendborrow');loanKind=sec==='advance'?'lend':sec==='settle'?'repay':'loanLend';document.querySelectorAll('.loan-detail-row').forEach(r=>r.querySelectorAll('.mini').forEach((x,i)=>x.classList.toggle('active',i===0)));updateForm()}function setLoanKind(k,b){loanKind=k;b.parentElement.querySelectorAll('.mini').forEach(x=>x.classList.remove('active'));b.classList.add('active');updateForm()}
function updateForm(){mkRenderEventSuggestion();let lk=mode==='loan'?loanKind:'',isLoan=mode==='loan',isLend=isLoan&&lk==='lend';$('recordTopGrid').classList.toggle('loan-person-layout',isLoan);$('lendBox').classList.toggle('hidden',!isLend);$('lendPersonTop').classList.toggle('hidden',!isLend);$('personTop').classList.toggle('hidden',!(isLoan&&!isLend));$('normalAmount').classList.toggle('hidden',isLend);$('transferBox').classList.toggle('hidden',mode!=='transfer');$('transferFeeBox').classList.toggle('hidden',mode!=='transfer');$('recordFeeBox').classList.toggle('hidden',!(mode==='expense'||(mode==='loan'&&['repay','receive'].includes(lk))));$('chargeBox').classList.toggle('hidden',mode!=='charge');$('categoryField').classList.toggle('hidden',mode==='income'||mode==='transfer'||mode==='charge'||(mode==='loan'&&['repay','receive','loanBorrow','loanLend'].includes(lk)));$('paymentField').classList.toggle('hidden',mode==='transfer'||mode==='charge'||(mode==='loan'&&lk==='borrowed'));$('amountLabel').textContent=mode==='income'?'入金額':mode==='transfer'?'移動金額':mode==='charge'?'チャージ金額':mode==='loan'&&lk==='borrowed'?'自分の負担額':mode==='loan'&&lk==='repay'?'返した金額':mode==='loan'&&lk==='receive'?'返された金額':mode==='loan'&&lk==='loanBorrow'?'借りる金額':mode==='loan'&&lk==='loanLend'?'貸す金額':'金額';$('paymentLabel').textContent=mode==='income'?'入金先':mode==='loan'&&['receive','loanBorrow'].includes(lk)?'受取方法':'支払方法';renderPayBtns();renderPersonCandidates();mkRefreshRakPaySource();mkGroupFormPaint();mkSplitRefresh();mkCandidateRender()}
function calcLend(src){let g=moneyNum($('gross').value),m=moneyNum($('mine').value),t=moneyNum($('theirs').value);if(src==='g'){if($('mine').value!=='')$('theirs').value=Math.max(0,g-m);else if($('theirs').value!=='')$('mine').value=Math.max(0,g-t)}if(src==='m'&&$('gross').value!=='')$('theirs').value=Math.max(0,g-m);if(src==='t'&&$('gross').value!=='')$('mine').value=Math.max(0,g-t);refreshMoneyInputs()}
function payButton(k,label,extra=''){return `<button class="mini ${payment===k?'active':''}" ${extra||`onclick="pickPay('${k}',this)"`}>${safeHtml(label)}</button>`}
function renderPayBtns(){
 const rows=(list,cls,inc=false)=>list.map(row=>row.filter(k=>k==='__more'||!mkHiddenPay(k))).filter(row=>row.length).map((row,i)=>`<div class="${cls}"${inc&&i===2&&!mkSettings.ui?.customIncome?' style="max-width:25%"':''}>${row.map(k=>k==='__more'?`<button id="morePayBtn" class="more-pay" type="button" onclick="toggleOtherPays()">${$('otherPays').classList.contains('hidden')?'もっと見る':'閉じる'}</button>`:payButton(k,inc?(incomePays.find(x=>x[0]===k)?.[1]||payName(k)):mkSettings.labels[k])).join('')}</div>`).join('');
 if(mode==='group'&&mkGroupKind!=='bill'){$('otherPays').classList.add('hidden');const ids=mkSettings.accounts.filter(a=>!mkHiddenPay(a.id)).map(a=>a.id);$('payBtns').innerHTML=Array.from({length:Math.ceil(ids.length/4)},(_,i)=>'<div class="pay-row">'+ids.slice(i*4,i*4+4).map(k=>payButton(k,balances[k]?.name||k)).join('')+'</div>').join('');return}
 if(mode==='income'){$('otherPays').classList.add('hidden');$('payBtns').innerHTML=rows(mkSettings.layouts.income,'income-pay-row',true);return}
 $('payBtns').innerHTML=rows(mkSettings.layouts.payment,'pay-row');
 $('otherPays').innerHTML=rows(mkSettings.layouts.more,'pay-row');
}
function toggleOtherPays(){let box=$('otherPays');box.classList.toggle('hidden');let b=$('morePayBtn');if(b)b.textContent=box.classList.contains('hidden')?'もっと見る':'閉じる'}
function toggleOptional(){let box=$('optionalInner');box.classList.toggle('hidden');$('optionalMark').textContent=box.classList.contains('hidden')?'＋':'−'}
function mkChooseRakPaySource(k){rakutenPaySource=k;mkRefreshRakPaySource()}
function mkRefreshRakPaySource(){const box=$('mkRakPaySource');if(!box)return;box.classList.toggle('hidden',!((mode==='expense'||(mode==='loan'&&loanKind==='lend')||(mode==='group'&&mkGroupKind==='bill'))&&payment==='rakutenpay'));box.querySelectorAll('[data-source]').forEach(b=>b.classList.toggle('active',rakutenPaySource===b.dataset.source))}
function pickPay(k,b){payment=k;document.querySelectorAll('#payBtns .mini,#otherPays .mini').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('installmentField').classList.toggle('hidden',!mkSettings.installmentPays.includes(k));mkRefreshRakPaySource()}
function pickInstallment(n,b){installments=n;document.querySelectorAll('#installmentField .mini').forEach(x=>x.classList.remove('active'));b.classList.add('active')}
// #70: record-only category scrolling. Positions use the closed, compact form.
let mkCategoryOpen=false;
const mkCategoryScrollConfig={saveGap:24,topGap:8,listGap:8};
let mkCategoryDrag=null,mkCategoryIgnoreClickUntil=0;
let mkCategoryAutoUntil=0,mkCategoryAutoSpan=0;
let mkCategoryStopFrame=0,mkCategorySmoothTarget=null,mkCategoryReturning=false;
function mkCategoryIsBorrowed(){return mode==='loan'&&loanKind==='borrowed'}
function mkCategoryViewport(){
 const v=window.visualViewport;
 const top=v?v.offsetTop:0,bottom=top+(v?v.height:window.innerHeight);
 const nav=document.querySelector('.bottom');
 return {top,bottom:nav?Math.min(bottom,nav.getBoundingClientRect().top):bottom};
}
function mkCategoryMaxScroll(){
 return Math.max(0,window.scrollY+$('categoryBtn').getBoundingClientRect().top-mkCategoryViewport().top-mkCategoryScrollConfig.topGap);
}
function mkCategoryScrollSpace(y){
 const record=$('record');let space=$('mkCategoryScrollSpace');
 if(!record.getClientRects().length){if(space)space.remove();return}
 if(!space){space=document.createElement('div');space.id='mkCategoryScrollSpace';space.setAttribute('aria-hidden','true');record.appendChild(space)}
 const naturalHeight=document.documentElement.scrollHeight-space.getBoundingClientRect().height;
 const needed=Math.max(0,Math.ceil(y+window.innerHeight-naturalHeight));
 space.style.height=needed+'px';
}
function mkCategoryScrollTo(y,behavior='instant'){
 cancelAnimationFrame(mkCategoryStopFrame);
 const maxPage=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
 const top=Math.max(0,Math.min(y,mkCategoryMaxScroll(),maxPage));
 mkCategorySmoothTarget=behavior==='smooth'?top:null;
 window.scrollTo({top,behavior});
}
function mkCategoryAlignAutomatically(){
 const view=mkCategoryViewport();
 const target=Math.max(view.top+mkCategoryScrollConfig.topGap,view.bottom-mkCategoryScrollConfig.saveGap-mkCategoryAutoSpan);
 mkCategoryScrollTo(window.scrollY+$('categoryBtn').getBoundingClientRect().top-target,'smooth');
}
function mkCategoryViewportChanged(){
 // Finish the initial alignment if closing the keyboard/browser chrome resizes
 // the viewport. Manual interaction immediately ends this brief opening phase.
 if(mkCategoryOpen&&performance.now()<mkCategoryAutoUntil)mkCategoryAlignAutomatically();
 mkPositionCategoryDropdown();
}
function mkCategoryCompactSpan(){
 // An inert, invisible copy measures both conditions without changing real inputs.
 // Include the payment section even for "相手が立替" to share the same target.
 const source=$('record'),copy=source.cloneNode(true);
 copy.setAttribute('aria-hidden','true');copy.inert=true;
 copy.classList.add('active');
 Object.assign(copy.style,{position:'fixed',left:'-10000px',top:'0',width:source.getBoundingClientRect().width+'px',visibility:'hidden',pointerEvents:'none'});
 copy.querySelector('#paymentField').classList.remove('hidden');
 // The current event banner is expense-only. Use its same date-based footprint
 // for 私が立替 too. 相手が立替 always uses the normal-period target.
 const date=$('date').value,hits=mkCategoryIsBorrowed()?[]:eventsData.filter(e=>!e.archived&&e.start&&e.end&&date>=e.start&&date<=e.end);
 const eventBox=copy.querySelector('#mkEventSuggestion');
 eventBox.classList.toggle('hidden',!hits.length);
 eventBox.innerHTML=hits.map(e=>`<div class="mk-event-suggest-card"><div class="mk-event-suggest-top"><span>🌟特別費イベント期間中</span><button type="button" class="mk-event-fixed">ONで固定</button></div><div class="mk-event-name-row"><button type="button" class="mk-event-name-toggle"><span class="mk-event-state">OFF</span><span class="mk-event-name-text">${safeHtml(e.name)}</span></button></div></div>`).join('');
 ['optionalInner','otherPays','installmentField','mkRakPaySource','mkCategoryDropdown'].forEach(id=>copy.querySelector('#'+id).classList.add('hidden'));
 document.body.appendChild(copy);
 try{return copy.querySelector('.record-save').getBoundingClientRect().bottom-copy.querySelector('#categoryBtn').getBoundingClientRect().top}
 finally{copy.remove()}
}
// #72: stop native smooth motion at the current position on close or manual input.
function mkStopCategoryAutoScroll(){
 mkCategoryReturning=false;
 mkCategoryAutoUntil=0;
 cancelAnimationFrame(mkCategoryStopFrame);
 const y=window.scrollY;
 const moving=mkCategorySmoothTarget!==null&&Math.abs(y-mkCategorySmoothTarget)>1;
 mkCategorySmoothTarget=null;
 if(!moving)return;
 window.scrollTo({top:y,behavior:'instant'});
 // Cancel a compositor frame that may already be queued by native smooth scrolling.
 mkCategoryStopFrame=requestAnimationFrame(()=>window.scrollTo({top:y,behavior:'instant'}));
}
function mkCloseCategoryDropdown(returnToSave=false){
 const wasOpen=mkCategoryOpen;
 const d=$('mkCategoryDropdown');if(!d)return;
 if(mkCategoryOpen||mkCategoryReturning)mkStopCategoryAutoScroll();
 d.classList.add('hidden');mkCategoryOpen=false;mkCategoryDrag=null;mkCategoryAutoUntil=0;
 if($('mkCategoryScrollSpace'))mkCategoryScrollSpace(window.scrollY);
 const b=$('categoryBtn');b.setAttribute('aria-expanded','false');b.lastElementChild.textContent='›';
 // #74: every user dismissal returns 相手が立替 to its save-button position.
 if(wasOpen&&returnToSave)mkCategoryReturnToSave();
}
// 相手が立替 returns the save button near the tabs when the dropdown closes.
function mkCategoryReturnToSave(){
 if(!mkCategoryIsBorrowed())return;
 const save=document.querySelector('#record .record-save');
 const target=Math.max(0,Math.min(window.scrollY,window.scrollY+save.getBoundingClientRect().bottom-mkCategoryViewport().bottom+mkCategoryScrollConfig.saveGap));
 mkCategoryReturning=window.scrollY-target>1;
 mkCategoryScrollTo(target,'smooth');
}
function mkPositionCategoryDropdown(){
 if(!mkCategoryOpen){if(mkCategoryReturning&&Math.abs(window.scrollY-mkCategorySmoothTarget)<=1)mkCategoryReturning=false;if($('mkCategoryScrollSpace'))mkCategoryScrollSpace(window.scrollY);return}
 const b=$('categoryBtn'),d=$('mkCategoryDropdown');
 if(!b.getClientRects().length){mkCloseCategoryDropdown();return}
 mkCategoryScrollSpace(mkCategoryMaxScroll());
 const limit=mkCategoryMaxScroll();
 if(window.scrollY>limit+.5)mkCategoryScrollTo(limit);
 const r=b.getBoundingClientRect(),view=mkCategoryViewport(),top=r.bottom+2;
 d.style.left=r.left+'px';d.style.width=r.width+'px';d.style.top=top+'px';
 // Use the real navigation boundary, without a minimum that can cover the tabs.
 d.style.maxHeight=Math.max(0,view.bottom-top-mkCategoryScrollConfig.listGap)+'px';
}
function pickCategory(){
 if(performance.now()<mkCategoryIgnoreClickUntil)return;
 if(mkCategoryOpen){mkCloseCategoryDropdown(true);return}
 const b=$('categoryBtn'),d=$('mkCategoryDropdown');if(!b||!d)return;
 mkCategoryAutoSpan=mkCategoryCompactSpan();
 mkCategoryAutoUntil=performance.now()+600;
 if(document.activeElement&&document.activeElement.matches('input,textarea'))document.activeElement.blur();
 d.innerHTML='';
 cats.forEach(c=>{const item=document.createElement('button');item.type='button';item.className='mk-category-item'+(category===c?' is-selected':'');item.textContent=c;item.setAttribute('role','option');item.setAttribute('aria-selected',String(category===c));item.addEventListener('click',()=>{category=c;b.firstElementChild.textContent=c;mkCloseCategoryDropdown(true);mkCandidateRender()});d.appendChild(item)});
 mkCategoryOpen=true;b.setAttribute('aria-expanded','true');b.lastElementChild.textContent='⌃';
 mkCategoryScrollSpace(mkCategoryMaxScroll());
 mkCategoryAlignAutomatically();
 d.classList.remove('hidden');d.scrollTop=0;mkPositionCategoryDropdown();
}
document.addEventListener('pointerdown',e=>{if(mkCategoryReturning)mkStopCategoryAutoScroll();if(mkCategoryOpen){mkStopCategoryAutoScroll();if(!e.target.closest('#categoryField'))mkCloseCategoryDropdown(true)}});
window.addEventListener('wheel',()=>{if(mkCategoryOpen||mkCategoryReturning)mkStopCategoryAutoScroll()},{passive:true});
// Control touch dragging on the category button so momentum cannot hide it.
$('categoryBtn').addEventListener('pointerdown',e=>{
 if(!mkCategoryOpen||e.pointerType==='mouse'||!e.isPrimary)return;
 mkCategoryDrag={id:e.pointerId,lastY:e.clientY,startY:e.clientY,moved:false};
 e.currentTarget.setPointerCapture(e.pointerId);
});
$('categoryBtn').addEventListener('pointermove',e=>{
 const drag=mkCategoryDrag;if(!mkCategoryOpen||!drag||drag.id!==e.pointerId)return;
 if(Math.abs(e.clientY-drag.startY)>5)drag.moved=true;
 if(drag.moved){e.preventDefault();mkCategoryIgnoreClickUntil=performance.now()+500;mkCategoryScrollTo(window.scrollY+drag.lastY-e.clientY);mkPositionCategoryDropdown()}
 drag.lastY=e.clientY;
});
function mkEndCategoryDrag(e){
 if(!mkCategoryDrag||mkCategoryDrag.id!==e.pointerId)return;
 if(mkCategoryDrag.moved)mkCategoryIgnoreClickUntil=performance.now()+500;
 mkCategoryDrag=null;
}
$('categoryBtn').addEventListener('pointerup',mkEndCategoryDrag);
$('categoryBtn').addEventListener('pointercancel',mkEndCategoryDrag);
window.addEventListener('scroll',mkPositionCategoryDropdown,{passive:true});
window.addEventListener('resize',mkCategoryViewportChanged);
if(window.visualViewport){window.visualViewport.addEventListener('resize',mkCategoryViewportChanged);window.visualViewport.addEventListener('scroll',mkPositionCategoryDropdown);}



function pickEvent(){openPicker('特別費イベント',[{label:'なし',value:''},...eventsData.filter(e=>!e.archived).map(e=>({label:e.name,value:e.name}))],(v,l)=>{mkSetEventTag(v);$('fxBox').classList.toggle('hidden',true)})}
let mkEventFixed={};try{mkEventFixed=JSON.parse(localStorage.getItem('mk-event-fixed-59')||'{}')||{}}catch(_){}
// #76: memo-only event controls never assign eventTag or affect event totals.
const mkEventMemoParts=new Map();
let mkEventMemoPrevious='';
let mkEventMemoSelected='';
function mkEventMemoMode(){return mode==='loan'&&['repay','receive','loanLend','loanBorrow'].includes(loanKind)}
// #77: a separate memo picker, unaffected by the special-expense default.
function mkRefreshMemoEventPicker(){
 const field=$('mkEventMemoField');if(!field)return;
 const enabled=mkEventMemoMode();field.classList.toggle('hidden',!enabled);
 $('mkEventTagField').classList.toggle('hidden',enabled);
 if(!enabled)return;
 mkSyncEventMemoParts();
 const event=eventsData.find(e=>!e.archived&&e.id===mkEventMemoSelected);
 if(!event)mkEventMemoSelected='';
 $('mkEventMemoPicker').firstElementChild.textContent=event?event.name:'選んでください';
 const added=!!event&&mkEventMemoParts.has(event.id);
 const button=$('mkEventMemoAdd');button.innerHTML='<span class="mk-event-state">'+(added?'ON':'OFF')+'</span><span>メモ</span>';button.setAttribute('aria-pressed',String(added));
 button.classList.toggle('active',added);button.disabled=!event;
}
function mkPickMemoEvent(){
 if(!mkEventMemoMode())return;
 openPicker('特別費イベント（メモ用）',[{label:'選んでください',value:''},...eventsData.filter(e=>!e.archived).map(e=>({label:e.name,value:e.id}))],id=>{mkEventMemoSelected=id;mkRefreshMemoEventPicker()});
}
function mkAddSelectedMemoEvent(){
 if(!mkEventMemoMode())return;
 const event=eventsData.find(e=>!e.archived&&e.id===mkEventMemoSelected);if(!event)return;
 mkSyncEventMemoParts();
 mkToggleEventMemo(event.id,true);
}
function mkEventPeriodMatches(){const d=$('date').value;return d?eventsData.filter(e=>!e.archived&&e.start&&e.end&&d>=e.start&&d<=e.end):[]}
function mkSyncEventMemoParts(){
 const value=$('memo').value,old=mkEventMemoPrevious;
 if(value===old)return;
 let start=0;while(start<old.length&&start<value.length&&old[start]===value[start])start++;
 let oldEnd=old.length,newEnd=value.length;
 while(oldEnd>start&&newEnd>start&&old[oldEnd-1]===value[newEnd-1]){oldEnd--;newEnd--}
 const delta=value.length-old.length;
 for(const [id,part] of mkEventMemoParts){
  if(part.start<0)continue;
  if(oldEnd<=part.start){part.start+=delta;part.end+=delta}
  else if(start<part.end){mkEventMemoParts.delete(id)}
 }
 mkEventMemoPrevious=value;
}
function mkToggleEventMemo(id,fromPicker=false,fromCandidate=false){
 mkCandidateSync();
 if(!fromCandidate&&!mkEventMemoMode())return;
 mkMemoUndo=null;mkMemoClearPaint();
 const event=(fromPicker?eventsData.filter(e=>!e.archived):mkEventPeriodMatches()).find(e=>e.id===id);if(!event)return;
 mkSyncEventMemoParts();
 const memo=$('memo'),part=mkEventMemoParts.get(id);
 if(part){
  mkEventMemoParts.delete(id);
  if(part.start>=0&&memo.value.slice(part.start,part.end)===part.text){
   memo.value=memo.value.slice(0,part.start)+memo.value.slice(part.end);
   mkSyncEventMemoParts();
  }
 }else if(memo.value.includes(event.name)){
  // An existing user-written name is never owned or deleted by this control.
  mkEventMemoParts.set(id,{start:-1,end:-1,text:''});
 }else{
  const start=memo.value.length,text=(start?' ':'')+event.name;
  memo.value+=text;mkEventMemoPrevious=memo.value;
  mkEventMemoParts.set(id,{start,end:start+text.length,text});
 }
 mkEventMemoPrevious=memo.value;mkCandidateSync();mkCandidateCleanStart();mkCandidatePaint();mkRenderEventSuggestion();mkMemoClearPaint();if(!part)mkMemoShowEnd();
}
function mkRenderEventMemo(box){
 mkSyncEventMemoParts();
 const hits=mkEventPeriodMatches();box.classList.toggle('hidden',!hits.length);
 box.innerHTML=hits.map((e,i)=>{const on=mkEventMemoParts.has(e.id);return `<div class="mk-event-suggest-card mk-event-memo-card"><div class="mk-event-suggest-top"><span>🌟特別費イベント期間中</span></div><div class="mk-event-memo-note">この項目は特別費の記録・集計には入りません。</div><div class="mk-event-name-row"><button type="button" class="mk-event-name-toggle mk-event-memo-toggle ${on?'active':''}" data-memo-event="${i}" aria-pressed="${on}"><span class="mk-event-state">${on?'ON':'OFF'}</span><span class="mk-event-name-text">メモ：${safeHtml(e.name)}</span></button></div></div>`}).join('');
 box.querySelectorAll('[data-memo-event]').forEach(button=>button.addEventListener('click',()=>mkToggleEventMemo(hits[Number(button.dataset.memoEvent)].id)));
}
$('memo').addEventListener('input',()=>{mkSyncEventMemoParts();if(mkEventMemoMode())mkRenderEventSuggestion()});
function mkEventMatches(){const d=$('date').value;return (mode==='expense'||(mode==='loan'&&['lend','borrowed'].includes(loanKind))||(mode==='group'&&mkGroupKind==='bill'))&&d?eventsData.filter(e=>!e.archived&&e.start&&e.end&&d>=e.start&&d<=e.end):[]}
function mkSetEventTag(name){eventTag=name;$('eventBtn').firstElementChild.textContent=name||'なし';mkRenderEventSuggestion()}
function mkToggleSuggestedEvent(id){const e=eventsData.find(x=>x.id===id);if(e)mkSetEventTag(eventTag===e.name?'':e.name)}
function mkToggleEventFixed(id){mkEventFixed[id]=!mkEventFixed[id];try{localStorage.setItem('mk-event-fixed-59',JSON.stringify(mkEventFixed))}catch(_){}mkRenderEventSuggestion()}
function mkRenderEventSuggestion(){mkRefreshMemoEventPicker();const box=$('mkEventSuggestion');if(!box)return;if(mkEventMemoMode()){mkRenderEventMemo(box);return}const hits=mkEventMatches();if(!hits.length){box.classList.add('hidden');return}box.classList.remove('hidden');box.innerHTML=hits.map(e=>{const on=eventTag===e.name;return `<div class="mk-event-suggest-card"><div class="mk-event-suggest-top"><span>🌟特別費イベント期間中</span><button type="button" class="mk-event-fixed ${mkEventFixed[e.id]?'active':''}" onclick="mkToggleEventFixed('${e.id}')" aria-pressed="${!!mkEventFixed[e.id]}">ONで固定</button></div><div class="mk-event-name-row"><button type="button" class="mk-event-name-toggle ${on?'active':''}" onclick="mkToggleSuggestedEvent('${e.id}')" aria-pressed="${on}"><span class="mk-event-state">${on?'ON':'OFF'}</span><span class="mk-event-name-text">${safeHtml(e.name)}</span></button></div></div>`}).join('')}

function autoTagEvent(){const hits=mkEventMatches();if(eventTag&&!hits.some(e=>e.name===eventTag))mkSetEventTag('');else mkRenderEventSuggestion()}
function mkDefaultEventTag(){const fixed=mkEventMatches().find(e=>mkEventFixed[e.id]);mkSetEventTag(fixed?fixed.name:'')}

function pickAccount(w){openPicker(w==='from'?'移動元':'移動先',Object.entries(balances).filter(([k])=>!mkHiddenPay(k)).map(([k,v])=>({label:v.name,value:k})),(v,l)=>{if(w==='from'){from=v;$('fromBtn').firstElementChild.textContent=l}else{to=v;$('toBtn').firstElementChild.textContent=l}})}
function chargeSourceLabel(k){return mkSettings.labels[k]||k}
function chargeSourceButton(k,label){return `<button class="mini ${chargeSource===k?'active':''}" onclick="selectChargeSource('${k}',this)">${safeHtml(label)}</button>`}
function renderCharge(){let targets=mkSettings.chargeTargets.filter(([k])=>!mkHiddenPay(k));$('chargeTargets').innerHTML=targets.map(x=>`<button class="mini ${chargeTarget===x[0]?'active':''}" onclick="selectChargeTarget('${x[0]}',this)">${safeHtml(x[1])}</button>`).join('');$('chargeSources').className='';$('chargeSources').innerHTML=mkSettings.layouts.charge.map(row=>row.filter(k=>!mkHiddenPay(k))).filter(row=>row.length).map(row=>`<div class="charge-source-row">${row.map(k=>chargeSourceButton(k,chargeSourceLabel(k))).join('')}</div>`).join('');updateChargeHint()}
function selectChargeTarget(k,b){chargeTarget=k;chargeSource=!mkHiddenPay(chargeDefaults[k])?(chargeDefaults[k]||''):'';renderCharge()}
function selectChargeSource(k,b){chargeSource=k;renderCharge()}
function changeChargeDefault(){if(!chargeTarget)return;let opts=mkSettings.layouts.charge.flat().filter(k=>!mkHiddenPay(k)).map(k=>[k,chargeSourceLabel(k)]).map(x=>({value:x[0],label:x[1]}));openPicker('いつものチャージ元',opts,(v,l)=>{chargeDefaults[chargeTarget]=v;chargeSource=v;renderCharge();mkQueueSave()})}
function updateChargeHint(){if(!chargeTarget){$('chargeDefaultHint').textContent='チャージ先を選ぶと、いつものチャージ元を自動選択します。';return}let d=chargeDefaults[chargeTarget];$('chargeDefaultHint').innerHTML='いつものチャージ元：'+safeHtml(chargeSourceLabel(d))+(mkHiddenPay(d)?'（非表示：今回のチャージ元を選んでください）':'')+' <button type="button" class="inline-setting" onclick="changeChargeDefault()">設定変更</button>'}
function pickDiscount(v,b){discount=v;document.querySelectorAll('#discountBtns .mini').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('customDiscount').classList.toggle('hidden',v!=='custom')}function disc(){return discount==='custom'?Number($('customDiscount').value||0):Number(discount||0)}function acct(k,t){return Object.hasOwn(mkSettings.balanceRoutes,k)&&mkTracksAccount(t,k)?mkSettings.balanceRoutes[k]:null}function move(d,text,delta,k,refId=''){if(!k)return;balances[k].v+=delta;cashbook.unshift({date:d,text,delta,refId})}
function setTransferFeeSide(side,b){transferFeeSide=side;document.querySelectorAll('#transferFeePayer .mini').forEach(x=>x.classList.remove('active'));if(b)b.classList.add('active')}
function toggleTransferFeePayer(){let fee=moneyNum($('transferFee').value);$('transferFeePayer').classList.toggle('hidden',fee<=0)}
function mkValidRecordDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T00:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
function mkValidMoney(value,min=0){return Number.isSafeInteger(value)&&value>=min}
function mkValidPaymentDetails(points,gross,rate,count){return mkValidMoney(points)&&points<=gross&&Number.isFinite(rate)&&rate>=0&&rate<=100&&[1,2,3,6].includes(count)}
function mkTxPayAccount(t){return t.payment==='rakutenpay'?t.rakutenPaySource:t.payment}
function mkTxPaid(t){return Number(t.paid??(t.type==='lend'?t.gross:t.amount)??0)+Number(t.fee||0)}
function mkRakCashAvailable(old){
 return (balances.rakutencash?.v??0)+(old&&['expense','lend'].includes(old.type)&&mkTxPayAccount(old)==='rakutencash'?mkTxPaid(old):0);
}
// #95: category breakdowns retain the original transaction and payment totals.
let mkSplitDraft=[],mkEditSplitDraft=[];
function mkSplitEnabled(){return mode==='expense'||(mode==='loan'&&['lend','borrowed'].includes(loanKind))||(mode==='group'&&mkGroupKind==='bill')}
function mkSplitTarget(edit=false){return moneyNum($(edit?($('editMine')?'editMine':'editAmount'):(mode==='group'?'mkGroupMine':mode==='loan'&&loanKind==='lend'?'mine':'amount'))?.value||'')}
function mkSplitPoints(edit=false){return edit?Number($('editPoints')?.value||0):mode==='loan'&&loanKind==='borrowed'?0:Number($('points').value||0)}
function mkSplitResolve(rows,total){
 const out=rows.map(r=>({category:r.category,amount:r.manual===null?null:r.manual}));
 const blanks=out.filter(r=>r.amount===null),sum=out.reduce((s,r)=>s+(r.amount??0),0);
 if(blanks.length===1&&Number.isSafeInteger(total)&&Number.isSafeInteger(sum)&&sum<=total)blanks[0].amount=total-sum;
 return out;
}
function mkSplitError(rows,total){
 if(rows.length<2)return '内訳は2カテゴリ以上にしてください';
 if(rows.some(r=>!cats.includes(r.category)))return '内訳のカテゴリを選んでください';
 if(new Set(rows.map(r=>r.category)).size!==rows.length)return '同じカテゴリは1行にまとめてください';
 if(rows.some(r=>!Number.isSafeInteger(r.amount)||r.amount<0))return '内訳の金額を確認してください';
 const sum=rows.reduce((s,r)=>s+BigInt(r.amount),0n),delta=sum-BigInt(total);
 return delta===0n?'':delta>0n?'内訳が会計合計を'+delta.toLocaleString()+'円超えています':'内訳が会計合計より'+(-delta).toLocaleString()+'円不足しています';
}
function mkValidateSplits(t){
 if(t.categorySplits===undefined)return;
 if(!['expense','lend','borrowed'].includes(t.type)||!Number.isSafeInteger(t.amount)||t.amount<0||!Array.isArray(t.categorySplits))throw Error('カテゴリ内訳の形式が正しくありません。');
 const e=mkSplitError(t.categorySplits,t.amount);if(e||t.category!==t.categorySplits[0].category)throw Error(e||'カテゴリ内訳の先頭が一致しません。');
 if(t.points!==undefined&&(!Number.isSafeInteger(t.points)||t.points<0||t.points>t.amount))throw Error('内訳のポイントが正しくありません。');
}
function mkCategoryParts(t){
 const parts=(t.categorySplits||[{category:t.category||'その他',amount:Number(t.amount||0)}]).map(r=>({...r,points:0}));
 const total=Number(t.amount||0),pts=['expense','lend'].includes(t.type)&&!mkPointReview(t)?Number(t.points||0):0;
 if(parts.length===1){parts[0].points=pts;return parts}
 // Integer arithmetic avoids rounding drift even near the safe integer limit.
 if(total>0&&pts>0){const den=BigInt(total),p=BigInt(pts);const ranks=parts.map((r,i)=>{const n=BigInt(r.amount)*p;r.points=Number(n/den);return {i,rem:n%den}}).sort((a,b)=>a.rem===b.rem?a.i-b.i:a.rem>b.rem?-1:1);let left=pts-parts.reduce((s,r)=>s+r.points,0);for(let i=0;i<left;i++)parts[ranks[i].i].points++}
 return parts;
}
function mkHasCategory(t,c){return (t.categorySplits||[{category:t.category}]).some(r=>r.category===c)}
function mkCategoryNet(t,c){return mkCategoryParts(t).filter(r=>r.category===c).reduce((s,r)=>s+r.amount-r.points,0)}
function mkSplitSummary(t){return t.categorySplits?mkCategoryParts(t).map(r=>r.category+' '+yen(r.amount-r.points)).join('／'):''}
function mkSplitHost(edit=false){return $(edit?'mkEditSplits':'mkSplits')}
function mkSplitAdd(edit=false){
 let rows=edit?mkEditSplitDraft:mkSplitDraft;
 if(!rows.length){rows.push({category:edit?$('editCategory').value:category,manual:null});rows.push({category:'',manual:null})}
 else {
  // A displayed automatic amount becomes fixed when another row is added.
  const resolved=mkSplitResolve(rows,mkSplitTarget(edit));rows.forEach((r,i)=>{if(r.manual===null&&resolved[i].amount!==null)r.manual=resolved[i].amount});
  rows.push({category:'',manual:null});
 }
 mkSplitRender(edit);
}
function mkSplitRemove(i,edit=false){
 const rows=edit?mkEditSplitDraft:mkSplitDraft;rows.splice(i,1);
 if(rows.length===1){const c=rows[0].category;if(edit)$('editCategory').value=c;else{category=c;$('categoryBtn').firstElementChild.textContent=c||'選んでください'}rows.length=0}
 mkSplitRender(edit);if(!edit)mkCandidateRender();
}
function mkSplitRender(edit=false){
 const host=mkSplitHost(edit);if(!host)return;const rows=edit?mkEditSplitDraft:mkSplitDraft;
 host.replaceChildren();
 if(!edit){$('categoryBtn').classList.toggle('hidden',rows.length>0);if(rows.length)mkCloseCategoryDropdown();}
 else $('editCategory').classList.toggle('hidden',rows.length>0);
 rows.forEach((r,i)=>{
  const line=document.createElement('div');line.className='mk-split-row';
  const select=document.createElement('select');select.setAttribute('aria-label','内訳'+(i+1)+'のカテゴリ');
  const empty=document.createElement('option');empty.value='';empty.textContent='カテゴリを選択';select.append(empty);
  cats.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;select.append(o)});select.value=r.category;
  select.onchange=()=>{r.category=select.value;if(i===0){if(edit)$('editCategory').value=r.category;else category=r.category}mkSplitRefresh(edit);if(!edit)mkCandidateRender()};
  const box=document.createElement('div');box.className='mk-split-money';
  const input=document.createElement('input');input.type='text';input.inputMode='numeric';input.setAttribute('aria-label','内訳'+(i+1)+'の金額');input.dataset.splitAmount=String(i);input.placeholder='金額';
  input.oninput=()=>{const v=input.value.replace(/[,，]/g,'').trim();r.manual=v===''?null:/^\d+$/.test(v)?Number(v):NaN;mkSplitRefresh(edit)};
  const note=document.createElement('span');note.className='small';note.dataset.splitNote=String(i);box.append(input,note);
  const remove=document.createElement('button');remove.type='button';remove.className='ghost sm';remove.textContent='×';remove.setAttribute('aria-label','内訳'+(i+1)+'を削除');remove.onclick=()=>mkSplitRemove(i,edit);
  line.append(select,box,remove);host.append(line);
 });
 const add=document.createElement('button');add.type='button';add.className='ghost sm mk-split-add';add.textContent='＋ 内訳';add.onclick=()=>mkSplitAdd(edit);const label=edit?$('editCategory').closest('.field').querySelector('label'):$('categoryField').querySelector('label');label.classList.add('mk-category-heading');label.querySelector('.mk-split-add')?.remove();label.append(add);
 if(rows.length){const status=document.createElement('div');status.className='small';status.dataset.splitStatus='';status.setAttribute('aria-live','polite');host.append(status)}
 mkSplitRefresh(edit);
}
function mkSplitRefresh(edit=false){
 const host=mkSplitHost(edit),rows=edit?mkEditSplitDraft:mkSplitDraft;if(!host||!rows.length)return;
 const total=mkSplitTarget(edit),resolved=mkSplitResolve(rows,total),error=mkSplitError(resolved,total),points=mkSplitPoints(edit);
 let parts=[];if(!error&&Number.isSafeInteger(points)&&points>=0&&points<=total)parts=mkCategoryParts({type:'expense',amount:total,points,categorySplits:resolved});
 rows.forEach((r,i)=>{const input=host.querySelector('[data-split-amount="'+i+'"]'),note=host.querySelector('[data-split-note="'+i+'"]');
  if(document.activeElement!==input)input.value=r.manual===null?(resolved[i].amount??''):(Number.isFinite(r.manual)?r.manual:'');
  const auto=r.manual===null&&resolved[i].amount!==null;
  note.textContent=(auto?'自動':'')+(parts[i]&&points>0?(auto?'・':'')+'集計 '+yen(parts[i].amount-parts[i].points)+'（'+parts[i].points+'pt使用）':'');
 });
 const status=host.querySelector('[data-split-status]');status.textContent=error||(mode==='loan'&&!edit?'自分の負担分 ':'')+'内訳合計 '+yen(total);status.classList.toggle('mk-split-error',!!error);
}
function mkSplitCollect(edit=false){
 const rows=edit?mkEditSplitDraft:mkSplitDraft;if(!rows.length)return undefined;
 const total=mkSplitTarget(edit),result=mkSplitResolve(rows,total),error=mkSplitError(result,total);
 if(error)throw Error(error);return result;
}
function mkSplitSetupEdit(t){
 mkEditSplitDraft=(t.categorySplits||[]).map(r=>({category:r.category,manual:r.amount}));
 const select=$('editCategory');if(!select)return;
 const host=document.createElement('div');host.id='mkEditSplits';select.after(host);mkSplitRender(true);
 ['editAmount','editMine','editPoints'].forEach(id=>$(id)?.addEventListener('input',()=>mkSplitRefresh(true)));
}

function saveRecord(){if(mode==='group')return mkGroupSave();let d=$('date').value,a=moneyNum($('amount').value),memo=$('memo').value.trim(),pts=Number($('points').value||0),dc=disc(),txid='tx'+Date.now()+Math.random().toString(36).slice(2,7);$('recordError').textContent='';let splits;try{if(mkSplitEnabled())splits=mkSplitCollect()}catch(e){return err(e.message)}if(splits)category=splits[0].category;if((mode==='expense'||(mode==='loan'&&loanKind==='lend'))&&payment==='rakutenpay'&&!mkSettings.rakutenSources.some(([k])=>k===rakutenPaySource&&!mkHiddenPay(k)))return err('楽天Payの支払元を選んでください。候補がない場合は設定で表示に戻してください。');if(!mkValidRecordDate(d))return err('日付を確認してね');if(!(mode==='loan'&&loanKind==='lend')&&!mkValidMoney(a,1))return err('1円以上の金額を確認してね');if((mode==='expense'||(mode==='loan'&&loanKind==='lend'))&&!mkValidPaymentDetails(pts,mode==='expense'?a:moneyNum($('gross').value),dc,installments))return err('ポイント・割引率・分割回数を確認してね');if(mode==='charge'&&(!Number.isFinite(dc)||dc<0||dc>100))return err('割引率を確認してね');if(mode==='expense'){if(a<=0||!category||!payment)return err('金額・カテゴリ・支払方法を確認してね');let fee=moneyNum($('recordFee').value);if(!mkValidMoney(fee))return err('手数料は0円以上にしてね');let paid=Math.max(0,a-pts),billed=Math.round(paid*(1-dc/100))+fee;if(payment==='rakutenpay'&&rakutenPaySource==='rakutencash'&&(balances.rakutencash?.v??0)<paid+fee)return err('楽天Pay残高が不足しています。ホームの「残高を合わせる」で残高を確認してね');let t={id:txid,date:d,type:'expense',amount:a,paid,billed,fee,category,...(splits?{categorySplits:splits}:{}),payment,memo,points:pts,discount:dc,eventTag,installments, ...(payment==='rakutenpay'?{rakutenPaySource}: {})};txs.unshift(t);const payAccount=payment==='rakutenpay'?rakutenPaySource:payment;if(acct(payAccount))move(d,category+(memo?'・'+memo:''),-(paid+fee),payAccount,txid)}else if(mode==='income'){if(a<=0||!payment)return err('入金額と入金先を確認してね');let t={id:txid,date:d,type:'income',amount:a,payment,memo};txs.unshift(t);if(acct(payment))move(d,'入金'+(memo?'・'+memo:''),a,payment,txid)}else if(mode==='transfer'){let fee=moneyNum($('transferFee').value),feeSide=fee>0?transferFeeSide:'from';if(a<=0||!from||!to||from===to||!mkValidMoney(fee))return err('金額・移動元・移動先・手数料を確認してね');if(fee>0&&feeSide==='to'&&a<=fee)return err('移動先から手数料を引く場合は、移動金額より小さい手数料にしてね');let t={id:txid,date:d,type:'transfer',amount:a,fee,feeSide,from,to,memo};txs.unshift(t);if(feeSide==='to'){balances[from].v-=a;balances[to].v+=a-fee}else{balances[from].v-=a+fee;balances[to].v+=a}if(fee>0)cashbook.unshift({date:d,text:'振込手数料',delta:-fee,refId:txid})}else if(mode==='charge'){if(a<=0||!chargeTarget||!chargeSource)return err('金額・チャージ先・チャージ元を確認してね');let t={id:txid,date:d,type:'charge',amount:a,target:chargeTarget,source:chargeSource,billed:Math.round(a*(1-dc/100)),discount:dc,memo};txs.unshift(t);balances[chargeTarget].v+=a;if(acct(chargeSource)){balances[chargeSource].v-=a}else{cashbook.unshift({date:d,text:(pays.find(x=>x[0]===chargeSource)||['',chargeSource])[1]+'→'+balances[chargeTarget].name+'チャージ',delta:a,refId:txid})}}else if(mode==='loan'){if(loanKind==='lend'){let g=moneyNum($('gross').value),m=moneyNum($('mine').value),t=moneyNum($('theirs').value),p=$('lendPerson').value.trim();if(!mkValidMoney(g,1)||!mkValidMoney(m)||!mkValidMoney(t,1)||m+t!==g||!p||!category||!payment)return err('立替の入力を確認してね');if(pts>m)return err('立替のポイントは自分の分までにしてください');const paid=g-pts,billed=Math.round(paid*(1-dc/100));if(payment==='rakutenpay'&&rakutenPaySource==='rakutencash'&&(balances.rakutencash?.v??0)<paid)return err('楽天Pay残高が不足しています');lastSavedLoanPerson=p;let tx={id:txid,date:d,type:'lend',amount:m,gross:g,category,...(splits?{categorySplits:splits}:{}),payment,person:p,other:t,memo,eventTag,points:pts,discount:dc,installments,paid,billed,...(payment==='rakutenpay'?{rakutenPaySource}:{})};txs.unshift(tx);applyTxEffect(tx)}else{let p=$('person').value.trim();if(a<=0||!p)return err('金額と相手を確認してね');lastSavedLoanPerson=p;let fee=['repay','receive'].includes(loanKind)?moneyNum($('recordFee').value):0;if(!mkValidMoney(fee))return err('手数料は0円以上にしてね');if(loanKind==='borrowed'){if(!category)return err('カテゴリを選んでね');txs.unshift({id:txid,date:d,type:'borrowed',amount:a,category,...(splits?{categorySplits:splits}:{}),person:p,memo,eventTag})}else{if(!payment)return err('支払・受取方法を選んでね');let tx={id:txid,date:d,type:loanKind,amount:a,fee,person:p,payment,memo};txs.unshift(tx);if(acct(payment)){if(loanKind==='repay')move(d,p+'へ返済',-(a+fee),payment,txid);if(loanKind==='receive')move(d,p+'から返済',a-fee,payment,txid);if(loanKind==='loanBorrow')move(d,p+'から借入',a,payment,txid);if(loanKind==='loanLend')move(d,p+'へ貸付',-a,payment,txid)}}}}if(mode==='loan')reviveArchivedLoanPersonOnNewRecord(lastSavedLoanPerson);renderAll();$('goLoansBtn').classList.toggle('hidden',mode!=='loan');$('savedModal').classList.remove('hidden')}
function err(s){$('recordError').textContent=s}function continueRecord(){$('savedModal').classList.add('hidden');clearFields();scrollTo(0,0)}function goHistory(){$('savedModal').classList.add('hidden');clearFields();nav('history',document.querySelectorAll('.nav')[2])}function goLoans(){mkGroupLoanView=mode==='group';if(mkGroupLoanView)mkGroupExpanded=txs.find(t=>t.groupId)?.groupId||'';$('savedModal').classList.add('hidden');if(lastSavedLoanPerson){loanActivePerson=lastSavedLoanPerson;loanExpandedPerson=lastSavedLoanPerson}loanArchiveView=false;loanOrganize=false;loanAddToGroupId='';loanSelectedIds.clear();clearFields();openOther('loans');renderLoans()}function resetRecordForm(){mkCloseCategoryDropdown();clearFields(false);$('date').value=new Date().toLocaleDateString('sv-SE');from='';to='';chargeTarget='';chargeSource='';installments=1;discount=0;transferFeeSide='from';$('fromBtn').firstElementChild.textContent='選んでください';$('toBtn').firstElementChild.textContent='選んでください';document.querySelectorAll('#installmentField .mini').forEach((b,i)=>b.classList.toggle('active',i===0));document.querySelectorAll('#discountBtns .mini').forEach((b,i)=>b.classList.toggle('active',i===0));if($('customDiscount'))$('customDiscount').classList.add('hidden');if($('fxText'))$('fxText').textContent='';if($('transferFeePayer'))$('transferFeePayer').classList.add('hidden');updateForm();if(typeof renderCharge==='function')renderCharge();mkDefaultEventTag()}
function clearFields(keepPayment=true){mkGroupClear();mkSplitDraft=[];mkEventMemoSelected='';mkEventMemoParts.clear();mkEventMemoPrevious='';const previousPayment=payment;['amount','gross','mine','theirs','lendPerson','person','memo','points','customDiscount','nzd','transferFee','recordFee'].forEach(id=>{if($(id))$(id).value=''});category='';eventTag='';payment=keepPayment?previousPayment:'';rakutenPaySource=mkSettings.rakutenSources.find(([k])=>!mkHiddenPay(k))?.[0]||'';mkRefreshRakPaySource();$('categoryBtn').firstElementChild.textContent='選んでください';$('eventBtn').firstElementChild.textContent='なし';$('optionalInner').classList.add('hidden');if($('optionalMark'))$('optionalMark').textContent='＋';$('otherPays').classList.add('hidden');$('fxBox').classList.add('hidden');mkDefaultEventTag();renderPayBtns();$('installmentField').classList.toggle('hidden',!mkSettings.installmentPays.includes(payment));$('recordError').textContent='';mkSplitRender();mkCandidateReset()}
function isLoanExtra(t){return t.type==='loanExtraLend'||t.type==='loanExtraBorrow'}
function typeGroup(t){if(t.groupId)return 'group';return ['lend','borrowed','repay','receive','loanBorrow','loanLend','loanExtraLend','loanExtraBorrow','loanAdjustment'].includes(t.type)?'loan':t.type}
// Points reduce personal spending, never the other person's receivable.
function mkPointReview(t){return t.type==='lend'&&Number(t.points||0)>Number(t.amount||0)}
function mkNetSpend(t){return ['expense','lend'].includes(t.type)&&!mkPointReview(t)?Number(t.amount||0)-Number(t.points||0):Number(t.amount||0)}
function txAmount(t){return ['expense','lend'].includes(t.type)?Number((t.type==='lend'?t.gross:t.amount)||0)-Number(t.points||0):Number(t.amount||0)}
function mkPointMeta(t){if(t.groupId&&t.type==='lend')return '会計 '+yen(t.groupTotal)+'／自分の支払 '+yen(t.gross-t.points)+'／自分の負担 '+yen(mkNetSpend(t))+(t.points?'／'+t.points.toLocaleString()+'pt使用':'');
 if(!['expense','lend'].includes(t.type))return '';
 const pts=Number(t.points||0);
 if(t.type==='lend')return '会計 '+yen(t.gross)+'／自分 '+(mkPointReview(t)?'要確認':yen(mkNetSpend(t)))+'／'+(t.person||'相手')+' '+yen(t.other)+(pts?'／'+pts.toLocaleString()+'pt使用':'')+(mkPointReview(t)?'（ポイントが自分の分を超えています。集計は従来の自分の分を暫定使用）':'');
 return pts?'購入 '+yen(t.amount)+'／'+pts.toLocaleString()+'pt使用':'';
}
function mkPointReviewNotice(){
 const count=txs.filter(mkPointReview).length;
 let el=$('mkPointReviewNotice');if(!el){el=document.createElement('div');el.id='mkPointReviewNotice';el.className='small';$('analysisMonthLabel').parentElement.after(el)}
 el.hidden=!count;el.textContent=count?'要確認：過去の立替 '+count+'件でポイントが自分の分を超えています。その記録は従来の自分の分で暫定集計しています。履歴で確認してください。':'';
}
function reverseTxEffect(t){let a=Number(t.amount||0);if(t.type==='expense'&&acct(t.payment==='rakutenpay'?t.rakutenPaySource:t.payment,t))balances[t.payment==='rakutenpay'?t.rakutenPaySource:t.payment].v+=Number(t.paid??a)+Number(t.fee||0);else if(t.type==='income'&&acct(t.payment,t))balances[t.payment].v-=a;else if(t.type==='transfer'){let fee=Number(t.fee||0),side=t.feeSide||'from';if(side==='to'){if(balances[t.from]&&mkTracksAccount(t,t.from))balances[t.from].v+=a;if(balances[t.to]&&mkTracksAccount(t,t.to))balances[t.to].v-=a-fee}else{if(balances[t.from]&&mkTracksAccount(t,t.from))balances[t.from].v+=a+fee;if(balances[t.to]&&mkTracksAccount(t,t.to))balances[t.to].v-=a}}else if(t.type==='charge'){if(balances[t.target]&&mkTracksAccount(t,t.target))balances[t.target].v-=a;if(acct(t.source,t))balances[t.source].v+=a}else if(t.type==='lend'&&acct(mkTxPayAccount(t),t))balances[mkTxPayAccount(t)].v+=mkTxPaid(t);else if(t.type==='repay'&&acct(t.payment,t))balances[t.payment].v+=a+Number(t.fee||0);else if(t.type==='receive'&&acct(t.payment,t))balances[t.payment].v-=a-Number(t.fee||0);else if(t.type==='loanBorrow'&&acct(t.payment,t))balances[t.payment].v-=a;else if(t.type==='loanLend'&&acct(t.payment,t))balances[t.payment].v+=a;cashbook=cashbook.filter(x=>x.refId!==t.id)}
function applyTxEffect(t){let a=Number(t.amount||0);if(t.type==='expense'&&acct(t.payment==='rakutenpay'?t.rakutenPaySource:t.payment,t))move(t.date,t.category+(t.memo?'・'+t.memo:''),-(Number(t.paid??a)+Number(t.fee||0)),t.payment==='rakutenpay'?t.rakutenPaySource:t.payment,t.id);else if(t.type==='income'&&acct(t.payment,t))move(t.date,'入金'+(t.memo?'・'+t.memo:''),a,t.payment,t.id);else if(t.type==='transfer'){let fee=Number(t.fee||0),side=t.feeSide||'from';if(side==='to'){if(balances[t.from]&&mkTracksAccount(t,t.from))balances[t.from].v-=a;if(balances[t.to]&&mkTracksAccount(t,t.to))balances[t.to].v+=a-fee}else{if(balances[t.from]&&mkTracksAccount(t,t.from))balances[t.from].v-=a+fee;if(balances[t.to]&&mkTracksAccount(t,t.to))balances[t.to].v+=a}if(fee>0)cashbook.unshift({date:t.date,text:'振込手数料',delta:-fee,refId:t.id})}else if(t.type==='charge'){if(balances[t.target]&&mkTracksAccount(t,t.target))balances[t.target].v+=a;if(acct(t.source,t))balances[t.source].v-=a;else cashbook.unshift({date:t.date,text:(pays.find(x=>x[0]===t.source)||['',t.source])[1]+'→'+(balances[t.target]?.name||t.target)+'チャージ',delta:a,refId:t.id})}else if(t.type==='lend'&&acct(mkTxPayAccount(t),t))move(t.date,t.groupId?t.groupName+'（グループ支払）':t.category+'（'+t.person+'分を立替）',-mkTxPaid(t),mkTxPayAccount(t),t.id);else if(t.type==='repay'&&acct(t.payment,t))move(t.date,(t.groupId?t.groupName+'：':'')+t.person+'へ返済',-(a+Number(t.fee||0)),t.payment,t.id);else if(t.type==='receive'&&acct(t.payment,t))move(t.date,(t.groupId?t.groupName+'：':'')+t.person+'から返済',a-Number(t.fee||0),t.payment,t.id);else if(t.type==='loanBorrow'&&acct(t.payment,t))move(t.date,t.person+'から借入',a,t.payment,t.id);else if(t.type==='loanLend'&&acct(t.payment,t))move(t.date,t.person+'へ貸付',-a,t.payment,t.id)}
function deleteHistoryRecord(id){let t=txs.find(x=>x.id===id);if(!t)return;let group=loanGroupForTx(id);if(group?.adjustmentId){alert('清算済みグループの記録は、グループ解除で清算調整を取り消してから削除してね');return;}let label=typeGroup(t)==='loan'?'この貸し借り記録':'この記録';if(!confirm(isLoanExtra(t)?'この記録外の貸し借りを削除しますか？\n貸し借り残高だけ再計算します。':label+'を削除しますか？\n\n関連する残高・カード請求予定・貸し借り残高も連動して戻します。'))return;reverseTxEffect(t);txs=txs.filter(x=>x.id!==id);renderAll()}
function toggleHistMore(){histMoreOpen=!histMoreOpen;if($('histFilterExtra'))$('histFilterExtra').classList.toggle('hidden',!histMoreOpen);if($('histMoreBtn'))$('histMoreBtn').textContent=histMoreOpen?'閉じる':'もっと';renderHistFilterStatus()}function renderHistFilterStatus(){let n=[histPeriod,histCat,histPay,histEvent].filter(Boolean).length;let reset=$('mkHistReset');if(reset){let active=!!((histKeyword||'').trim()||histType!=='all'||histStart||histEnd||n);reset.disabled=!active;reset.classList.toggle('is-inactive',!active)}let el=$('histFilterStatus');if(!el)return;el.textContent=n?'絞り込み中 '+n+'件':'';el.classList.toggle('hidden',!n||histMoreOpen)}
function resetHistoryFilters(){
 histKeyword='';histType='all';histPeriod='';histCat='';histPay='';histEvent='';histStart='';histEnd='';
 if($('histKeyword'))$('histKeyword').value='';
 if($('histStart'))$('histStart').value='';
 if($('histEnd'))$('histEnd').value='';
 if($('histCustomDates'))$('histCustomDates').classList.add('hidden');
 [['histPeriodBtn','期間'],['histCatBtn','カテゴリ'],['histPayBtn','支払方法'],['histEventBtn','特別費']].forEach(([id,label])=>{if($(id))$(id).textContent=label+'：すべて'});
 document.querySelectorAll('#histTypeBtns .mini').forEach(b=>b.classList.toggle('active',b.textContent.trim()==='すべて'));
 renderHistory();
}
function setHistory(t){histTab=t;$('histSpendBtn').classList.toggle('active',t==='spend');$('histCashBtn').classList.toggle('active',t==='cash');$('historyFilters').classList.toggle('hidden',t!=='spend');$('spendHistory').classList.toggle('hidden',t!=='spend');$('cashHistory').classList.toggle('hidden',t!=='cash');if($('histFilterExtra'))$('histFilterExtra').classList.toggle('hidden',!histMoreOpen);renderHistFilterStatus();renderHistory()}
function setHistType(t,b){histType=t;document.querySelectorAll('#histTypeBtns .mini').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderHistory()}
function histEventNames(){return [...new Set([...eventsData.map(e=>e.name),...deletedEventNames,...txs.map(t=>t.eventTag).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,'ja'))}
function pickHistCat(){openPicker('カテゴリで絞り込み',[{label:'すべて',value:''},...cats.map(c=>({label:c,value:c}))],(v,l)=>{histCat=v;$('histCatBtn').textContent='カテゴリ：'+l;renderHistFilterStatus();renderHistory()})}
function pickHistPay(){openPicker('支払方法で絞り込み',[{label:'すべて',value:''},...pays.map(x=>({label:x[1],value:x[0]}))],(v,l)=>{histPay=v;$('histPayBtn').textContent='支払方法：'+l;renderHistFilterStatus();renderHistory()})}
function pickHistEvent(){openPicker('特別費で絞り込み',[{label:'すべて',value:''},{label:'特別費なし',value:'__none'},...histEventNames().map(n=>({label:n,value:n}))],(v,l)=>{histEvent=v;$('histEventBtn').textContent='特別費：'+l;renderHistFilterStatus();renderHistory()})}
function monthRange(offset=0){let n=new Date(),y=n.getFullYear(),m=n.getMonth()+offset;let a=new Date(y,m,1),b=new Date(y,m+1,0);return [dateISO(a.getFullYear(),a.getMonth()+1,1),dateISO(b.getFullYear(),b.getMonth()+1,b.getDate())]}
function pickHistPeriod(){openPicker('期間で絞り込み',[{label:'すべて',value:''},{label:'今月',value:'thisMonth'},{label:'先月',value:'lastMonth'},{label:'過去3ヶ月',value:'3months'},{label:'今年',value:'year'},{label:'期間指定',value:'custom'}],(v,l)=>{histPeriod=v;$('histPeriodBtn').textContent='期間：'+l;$('histCustomDates').classList.toggle('hidden',v!=='custom');renderHistFilterStatus();renderHistory()})}
function historyDateMatch(d){if(!histPeriod)return true;let today=new Date(),isoToday=dateISO(today.getFullYear(),today.getMonth()+1,today.getDate()),a='',b='';if(histPeriod==='thisMonth')[a,b]=monthRange(0);else if(histPeriod==='lastMonth')[a,b]=monthRange(-1);else if(histPeriod==='3months'){let x=new Date(today.getFullYear(),today.getMonth()-2,1);a=dateISO(x.getFullYear(),x.getMonth()+1,1);b=isoToday}else if(histPeriod==='year'){a=dateISO(today.getFullYear(),1,1);b=isoToday}else if(histPeriod==='custom'){a=histStart||'0000-01-01';b=histEnd||'9999-12-31'}return d>=a&&d<=b}
function canonicalPay(k){
 const val=String(k??'').trim();if(!val)return '';
 const hit=pays.find(([code,label])=>code===val||label===val);if(hit)return hit[0];
 const aliases=mkSettings.aliases;
 return aliases[val]||val;
}
function payName(k){const code=canonicalPay(k);return code==='bank'?'銀行':(pays.find(x=>x[0]===code)||['',k||''])[1]}
function recordTitle(t){if(t.groupId)return t.type==='lend'?'グループ会計':t.type==='receive'?'グループから受取':'グループへ支払';if(t.type==='expense')return t.categorySplits?t.categorySplits.map(r=>r.category).join('・'):t.category||'支出';if(t.type==='income')return '入金';if(t.type==='transfer')return '資金移動';if(t.type==='charge')return 'チャージ';let names={lend:'私が立替',borrowed:'相手が立替',repay:'返した',receive:'返された',loanBorrow:'借りる',loanLend:'貸す'};return names[t.type]||t.type}
function recordMeta(t){let a=[];if(t.groupId)a.push(t.groupName);const pointMeta=mkPointMeta(t);if(pointMeta)a.push(pointMeta);if(t.type==='expense'){if(t.payment)a.push(payName(t.payment)+(t.payment==='rakutenpay'?'（'+mkRakSourceName(t.rakutenPaySource)+'）':''));if(t.discount)a.push('引落時'+t.discount+'%OFF')}else if(t.type==='income'){if(t.payment)a.push(payName(t.payment))}else if(t.type==='transfer'){a.push((balances[t.from]?.name||t.from)+' → '+(balances[t.to]?.name||t.to));if(Number(t.fee||0)>0)a.push('手数料 '+yen(t.fee)+'（'+((t.feeSide||'from')==='to'?'移動先':'移動元')+'）')}else if(t.type==='charge'){a.push((balances[t.target]?.name||t.target)+' ← '+payName(t.source))}else{if(t.person&&t.type!=='lend')a.push(t.person);if(t.payment)a.push(payName(t.payment));if(t.type==='lend'){if(t.discount)a.push('引落時'+t.discount+'%OFF')}}if(Number(t.fee||0)>0&&t.type!=='transfer')a.push('手数料 '+yen(t.fee));if(t.eventTag)a.push(t.eventTag);if(t.memo)a.push(t.memo);if(t.categorySplits)a.push(mkSplitSummary(t));return a.join('・')}
function historyRecordMeta(t){let a=[];if(t.groupId)a.push(t.groupName);const pointMeta=mkPointMeta(t);if(pointMeta)a.push(pointMeta);if(t.type==='expense'){if(t.payment)a.push(payName(t.payment)+(t.payment==='rakutenpay'?'（'+mkRakSourceName(t.rakutenPaySource)+'）':''));if(t.discount)a.push('引落時'+t.discount+'%OFF')}else if(t.type==='income'){if(t.payment)a.push(payName(t.payment))}else if(t.type==='transfer'){a.push((balances[t.from]?.name||t.from)+' → '+(balances[t.to]?.name||t.to));if(Number(t.fee||0)>0)a.push('手数料 '+yen(t.fee)+'（'+((t.feeSide||'from')==='to'?'移動先':'移動元')+'）')}else if(t.type==='charge'){a.push((balances[t.target]?.name||t.target)+' ← '+payName(t.source))}else{if(t.person&&t.type!=='lend')a.push(t.person);if(t.payment)a.push(payName(t.payment));if(t.type==='lend'){if(t.discount)a.push('引落時'+t.discount+'%OFF')}}if(Number(t.fee||0)>0&&t.type!=='transfer')a.push('手数料 '+yen(t.fee));if(t.eventTag)a.push(t.eventTag);if(t.categorySplits)a.push(mkSplitSummary(t));return a.join('・')}
function renderHistory(){renderHistFilterStatus();if(histTab==='spend'){let q=(histKeyword||'').trim().toLowerCase();let terms=q.match(/(?:[¥￥]?[0-9][0-9,，]*円?|[^\s　]+)/g)||[];let arr=txs.filter(t=>!isLoanExtra(t)&&t.type!=='loanAdjustment').filter(t=>histType==='all'||typeGroup(t)===histType||(histType==='loan'&&!!t.groupId)).filter(t=>!histCat||mkHasCategory(t,histCat)||(histCat==='手数料'&&['expense','transfer','repay','receive'].includes(t.type)&&Number(t.fee||0)>0)).filter(t=>!histPay||[t.payment,t.source,t.from,t.to].some(v=>canonicalPay(v)===histPay)).filter(t=>!histEvent||(histEvent==='__none'?!t.eventTag:t.eventTag===histEvent)).filter(t=>historyDateMatch(t.date)).filter(t=>terms.every(term=>{const plain=term.replace(/[¥￥円,，]/g,'');const corpus=[t.memo,mkSplitSummary(t),t.category,t.eventTag,t.person,recordTitle(t),recordMeta(t)].filter(Boolean).join(' ').toLowerCase();return /^\d+$/.test(plain)?[txAmount(t),t.amount,t.gross,t.points].filter(v=>v!=null).some(v=>String(Math.abs(v)).includes(plain)):corpus.includes(term)}));$('spendHistory').innerHTML=arr.length?arr.map(t=>{let meta=[t.date,historyRecordMeta(t)].filter(Boolean).join('・');return `<div class="item"><div class="history-item-main"><div class="history-item-title">${safeHtml(recordTitle(t))}</div><div class="history-item-amt">${yen(txAmount(t))}</div></div><div class="history-item-sub"><div class="history-item-left"><div class="history-item-meta">${safeHtml(meta)}</div>${t.memo?`<div class="history-item-note">${safeHtml(t.memo)}</div>`:''}</div><div class="history-actions"><button class="ghost sm" onclick="editRecord('${t.id}')">編集</button><button class="ghost sm danger" onclick="deleteHistoryRecord('${t.id}')">削除</button></div></div></div>`}).join(''):'<div class="small" style="margin-top:12px">該当記録なし</div>'}else{let opening=0,rows=[...cashbook].reverse(),r=opening,calc=rows.map(x=>{r+=x.delta;return {...x,r}}).reverse();$('cashHistory').innerHTML=calc.length?`<table class="passbook"><thead><tr><th>日付</th><th>内容</th><th>出金</th><th>入金</th><th>残高</th></tr></thead><tbody>${calc.map(x=>`<tr><td>${x.date.slice(5).replace('-','/')}</td><td>${x.text}</td><td>${x.delta<0?yen(-x.delta):''}</td><td>${x.delta>0?yen(x.delta):''}</td><td>${yen(x.r)}</td></tr>`).join('')}</tbody></table>`:'<div class="small" style="margin-top:12px">まだ手元資金の動きはありません。</div>'}}
function selectOptions(items,val){return items.map(x=>`<option value="${safeHtml(x[0])}" ${x[0]===val?'selected':''}>${safeHtml(x[1])}</option>`).join('')}
function editRecord(id){let t=txs.find(x=>x.id===id);if(!t)return;if(t.groupId)return mkGroupEdit(t);let group=loanGroupForTx(id);if(group?.adjustmentId){alert('清算済みグループの記録は、グループ解除で清算調整を取り消してから編集してね');return;}editingId=id;const editKind=document.getElementById('editRecordKind');if(editKind)editKind.textContent='｜'+recordTitle(t);
 if(isLoanExtra(t)){
  $('editBody').innerHTML=`<div class="small" style="margin-bottom:9px">登録日：${safeHtml(t.date)}（変更なし）</div><div class="field"><label>貸し・借り</label><select id="editExtraType"><option value="loanExtraLend" ${t.type==='loanExtraLend'?'selected':''}>貸し</option><option value="loanExtraBorrow" ${t.type==='loanExtraBorrow'?'selected':''}>借り</option></select></div><div class="field"><label>金額</label><input id="editExtraAmount" type="text" inputmode="numeric" min="1" step="1" value="${Number(t.amount)}"></div><div class="field"><label>相手</label><input id="editExtraPerson" maxlength="60" value="${safeHtml(t.person)}"></div><div class="field"><label>メモ（任意）</label><input id="editExtraMemo" maxlength="300" value="${safeHtml(t.memo||'')}"></div>`;
  compactEditLayout(t);$('editError').textContent='';$('editModal').classList.remove('hidden');return;
 }
 let h=`<div class="field"><label>日付</label><input id="editDate" type="date" value="${t.date}"></div>`;if(t.type==='lend'){h+=`<div class="grid2"><div class="field"><label>会計総額</label><input id="editGross" type="text" value="${t.gross||0}"></div><div class="field"><label>自分の分</label><input id="editMine" type="text" value="${t.amount||0}"></div></div><div class="field"><label>相手の分</label><input id="editOther" type="text" value="${t.other||0}"></div>`}else h+=`<div class="field"><label>金額</label><input id="editAmount" type="text" value="${t.amount||0}"></div>`;if(['expense','lend','borrowed'].includes(t.type))h+=`<div class="field"><label>カテゴリ</label><select id="editCategory">${selectOptions(cats.map(c=>[c,c]),t.category||'')}</select></div>`;if(['expense','income','lend','repay','receive','loanBorrow','loanLend'].includes(t.type)){let ep=t.type==='income'?incomePays:pays;let el=t.type==='income'?'入金先':'支払・受取方法';h+=`<div class="field"><label>${el}</label><select id="editPayment">${selectOptions(ep,t.payment||'')}</select></div>`;}if(['expense','lend'].includes(t.type))h+=`<div class="field" id="editRakPaySourceField" style="${t.payment==='rakutenpay'?'':'display:none'}"><label>楽天Payの支払元</label><select id="editRakPaySource">${selectOptions(mkSettings.rakutenSources,t.rakutenPaySource||mkSettings.rakutenSources[0]?.[0]||'')}</select></div>`;if(['expense','repay','receive'].includes(t.type))h+=`<div class="field"><label>手数料（任意）</label><input id="editRecordFee" type="text" inputmode="numeric" value="${t.fee||0}"></div>`;if(['expense','lend'].includes(t.type))h+=`<div class="grid2"><div class="field"><label>ポイント使用</label><input id="editPoints" type="number" inputmode="numeric" min="0" step="1" value="${t.points||0}"></div><div class="field"><label>引落時割引（%）</label><input id="editDiscount" type="number" inputmode="decimal" min="0" max="100" step="0.1" value="${t.discount||0}"></div></div><div class="field"><label>分割回数</label><select id="editInstallments">${selectOptions([[1,'1回'],[2,'2回'],[3,'3回'],[6,'6回']],Number(t.installments||1))}</select></div>`;if(t.type==='transfer')h+=`<div class="grid2"><div class="field"><label>移動元</label><select id="editFrom">${selectOptions(Object.entries(balances).map(([k,v])=>[k,v.name]),t.from)}</select></div><div class="field"><label>移動先</label><select id="editTo">${selectOptions(Object.entries(balances).map(([k,v])=>[k,v.name]),t.to)}</select></div></div><div class="field"><label>手数料（任意）</label><input id="editTransferFee" type="text" inputmode="numeric" value="${t.fee||0}"></div><div class="field"><label>手数料の引落先</label><select id="editTransferFeeSide"><option value="from" ${(t.feeSide||'from')==='from'?'selected':''}>移動元</option><option value="to" ${(t.feeSide||'from')==='to'?'selected':''}>移動先</option></select></div>`;if(t.type==='charge')h+=`<div class="grid2"><div class="field"><label>チャージ先</label><select id="editTarget">${selectOptions(mkSettings.chargeTargets,t.target)}</select></div><div class="field"><label>チャージ元</label><select id="editSource">${selectOptions(pays,t.source)}</select></div></div>`;if(typeGroup(t)==='loan')h+=`<div class="field"><label>相手</label><input id="editPerson" value="${t.person||''}"></div>`;if(['expense','lend','borrowed'].includes(t.type))h+=`<div class="field"><label>特別費イベント</label><select id="editEvent"><option value="">なし</option>${eventsData.map(e=>`<option value="${e.name}" ${e.name===t.eventTag?'selected':''}>${e.name}</option>`).join('')}</select></div>`;if(!['transfer','charge'].includes(t.type))h+=`<div class="field"><label>店名・メモ</label><input id="editMemo" value="${(t.memo||'').replace(/"/g,'&quot;')}"></div>`;if(t.type!=='lend'){h=h.replace(/^(<div class="field"><label>日付<\/label>.*?<\/div>)(<div class="field"><label>金額<\/label>.*?<\/div>)/,'<div class="grid2">$1$2</div>')} $('editBody').innerHTML=h;compactEditLayout(t);mkSplitSetupEdit(t);if($('editPayment')&&$('editRakPaySourceField'))$('editPayment').addEventListener('change',()=>{$('editRakPaySourceField').style.display=$('editPayment').value==='rakutenpay'?'':'none'});$('editError').textContent='';$('editModal').classList.remove('hidden')}
function compactEditLayout(t){
 const root=$('editBody');if(!root)return;
 const original=[...root.querySelectorAll('.field')];
 const fields=new Map();for(const el of original){const control=el.querySelector('[id]');if(control)fields.set(control.id,el)}
 const used=new Set();
 const take=id=>{const el=fields.get(id);if(el&&!used.has(id)){used.add(id);el.remove();return el}return null};
 const row=(ids,parent=root)=>{const cells=ids.map(take).filter(Boolean);if(!cells.length)return;const wrap=document.createElement('div');wrap.className='mk-edit-pair';cells.forEach(c=>wrap.appendChild(c));parent.appendChild(wrap)};
 const single=(id,parent=root)=>{const el=take(id);if(el)parent.appendChild(el)};
 root.replaceChildren();
 if(t.type==='lend'){
  row(['editDate','editGross']);row(['editMine','editOther']);row(['editPerson','editCategory']);row(['editPayment','editMemo']);
 }else if(isLoanExtra(t)){
  row(['editExtraType','editExtraAmount']);row(['editExtraPerson','editExtraMemo']);
 }else if(t.type==='transfer'){
  row(['editDate','editAmount']);row(['editFrom','editTo']);row(['editTransferFee','editTransferFeeSide']);
 }else if(t.type==='charge'){
  row(['editDate','editAmount']);row(['editTarget','editSource']);
 }else if(t.type==='expense'){
  row(['editDate','editAmount']);row(['editCategory','editPayment']);row(['editMemo','editRakPaySource']);
 }else if(t.type==='income'){
  row(['editDate','editAmount']);row(['editPayment','editMemo']);
 }else{
  row(['editDate','editAmount']);row(['editPayment','editPerson']);row(['editMemo','editRecordFee']);
 }
 if(['expense','lend'].includes(t.type)){
  const details=document.createElement('details');details.className='mk-edit-details';
  const summary=document.createElement('summary');summary.textContent='詳細設定';details.appendChild(summary);
  const hint=document.createElement('div');hint.className='mk-edit-detail-hint';
  const vals=[];if(Number(t.points))vals.push(Number(t.points).toLocaleString()+'pt');if(Number(t.discount))vals.push('引落時'+t.discount+'%OFF');if(Number(t.installments||1)>1)vals.push(t.installments+'回払い');if(Number(t.fee))vals.push('手数料'+Number(t.fee).toLocaleString()+'円');if(t.eventTag)vals.push(t.eventTag);
  hint.textContent=vals.length?vals.join(' ・ '):'ポイント・割引・分割・手数料・特別費';details.appendChild(hint);
  row(['editPoints','editDiscount'],details);
  if(t.type==='lend')row(['editInstallments','editEvent'],details);
  else row(['editInstallments','editRecordFee'],details);
  if(t.type==='lend')single('editRecordFee',details);
  else single('editEvent',details);
  root.appendChild(details);
 }else{
  row(['editRecordFee','editEvent']);
 }
 for(const [id,el] of fields){if(!used.has(id)){el.remove();root.appendChild(el);used.add(id)}}
}
function deleteEditingRecord(){
 const id=editingId;if(!id)return;
 // Reuse the same deletion confirmation and balance recalculation as History.
 deleteHistoryRecord(id);
 if(!txs.some(t=>t.id===id))closeEditRecord();
}
function closeEditRecord(){editingId='';$('editModal').classList.add('hidden')}
function saveEditedRecord(){const original=txs.find(x=>x.id===editingId);if(!original)return;if(original.groupId)return mkGroupSaveEdit(original);let t={...original};
 if(isLoanExtra(t)){
  let amount=moneyNum($('editExtraAmount').value),person=$('editExtraPerson').value.trim();let group=loanGroupForTx(t.id);if(group&&group.person!==person){$('editError').textContent='グループ化された履歴は相手を変更できません。先にグループを解除してね';return;}
  if(!Number.isSafeInteger(amount)||amount<=0||!person){$('editError').textContent='相手と1円以上の金額を入力してね';return}
  t.type=$('editExtraType').value;t.amount=amount;t.person=person;t.memo=$('editExtraMemo').value.trim();
  loanArchiveView=false;loanActivePerson=person;loanExpandedPerson=person;
  Object.assign(original,t);closeEditRecord();renderAll();return;
 }
 let old={...t};let group=loanGroupForTx(t.id);if(group&&$('editPerson')&&$('editPerson').value.trim()!==group.person){$('editError').textContent='グループ化された履歴は相手を変更できません。先にグループを解除してね';return;}let d=$('editDate').value;if(!mkValidRecordDate(d)){$('editError').textContent='日付を確認してね';return}t.date=d;if(t.type==='lend'){let g=moneyNum($('editGross').value),m=moneyNum($('editMine').value),o=moneyNum($('editOther').value);if(!mkValidMoney(g,1)||!mkValidMoney(m)||!mkValidMoney(o)||m+o!==g){$('editError').textContent='会計総額＝自分の分＋相手の分になるようにしてね';return}t.gross=g;t.amount=m;t.other=o}else{let a=moneyNum($('editAmount').value);if(!mkValidMoney(a,1)){$('editError').textContent='金額を確認してね';return}t.amount=a}if($('editCategory'))t.category=$('editCategory').value;if($('editPayment'))t.payment=$('editPayment').value;if(['expense','lend'].includes(t.type))t.rakutenPaySource=t.payment==='rakutenpay'?$('editRakPaySource').value:undefined;if($('editRecordFee'))t.fee=moneyNum($('editRecordFee').value);if($('editFrom'))t.from=$('editFrom').value;if($('editTo'))t.to=$('editTo').value;if($('editTransferFee'))t.fee=moneyNum($('editTransferFee').value);if($('editTransferFeeSide'))t.feeSide=$('editTransferFeeSide').value;if($('editTarget'))t.target=$('editTarget').value;if($('editSource'))t.source=$('editSource').value;if($('editPerson'))t.person=$('editPerson').value.trim();if($('editEvent'))t.eventTag=$('editEvent').value;if($('editMemo'))t.memo=$('editMemo').value.trim();if(['expense','lend'].includes(t.type)){const points=Number($('editPoints').value),dc=Number($('editDiscount').value),n=Number($('editInstallments').value),gross=t.type==='lend'?Number(t.gross):Number(t.amount);if(!Number.isSafeInteger(points)||points<0||points>gross||!Number.isFinite(dc)||dc<0||dc>100||![1,2,3,6].includes(n)){$('editError').textContent='ポイント・割引率・分割回数を確認してね';return}if(t.type==='lend'&&points>t.amount){$('editError').textContent='立替のポイントは自分の分までにしてください';return}t.points=points;t.discount=dc;t.installments=n;t.paid=gross-points;t.billed=Math.round(t.paid*(1-dc/100))+Number(t.fee||0)}if(t.type==='charge')t.billed=Math.round(Number(t.amount)*(1-Number(t.discount||0)/100));if(!mkValidMoney(Number(t.fee||0))){$('editError').textContent='手数料は0円以上にしてね';return}if(['expense','lend'].includes(t.type)&&mkTxPayAccount(t)==='rakutencash'&&mkRakCashAvailable(old)<mkTxPaid(t)){$('editError').textContent='楽天Pay残高が不足しています';return}if(t.type==='transfer'&&t.from===t.to){$('editError').textContent='移動元と移動先は別にしてね';return}if(t.type==='transfer'&&Number(t.fee||0)>0&&(t.feeSide||'from')==='to'&&Number(t.amount||0)<=Number(t.fee||0)){$('editError').textContent='移動先から手数料を引く場合は、移動金額より小さい手数料にしてね';return}if(typeGroup(t)==='loan'&&!t.person){$('editError').textContent='相手を入力してね';return}try{const splits=mkSplitCollect(true);if(splits){t.categorySplits=splits;t.category=splits[0].category}else delete t.categorySplits;mkValidateSplits(t)}catch(e){$('editError').textContent=e.message;return}reverseTxEffect(old);delete original.categorySplits;Object.assign(original,t);applyTxEffect(original);closeEditRecord();renderAll()}
function renderPersonCandidates(){
 const names=[...new Set(txs.filter(t=>typeGroup(t)==='loan'&&!loanArchivedPeople.includes(t.person)).map(t=>t.person).filter(Boolean))];
 const html=names.map(n=>`<button type="button" class="person-candidate" data-name="${safeHtml(n)}" onclick="pickPerson(this.dataset.name)">${safeHtml(n)}</button>`).join('');
 if($('lendPersonCandidates')){$('lendPersonCandidates').innerHTML=html;$('lendPersonCandidates').classList.toggle('hidden',$('lendPersonTop').classList.contains('hidden'));}
 if($('personCandidates')){$('personCandidates').innerHTML=html;$('personCandidates').classList.toggle('hidden',$('personTop').classList.contains('hidden'));}
 updatePersonCandidateSelection();
}
function updatePersonCandidateSelection(){
 for(const [listId,inputId] of [['lendPersonCandidates','lendPerson'],['personCandidates','person']]){
  const list=$(listId),input=$(inputId);if(!list||!input)continue;
  list.querySelectorAll('.person-candidate').forEach(b=>b.classList.toggle('active',b.dataset.name===input.value.trim()));
 }
}
function pickPerson(name){
 if(loanKind==='lend'&&$('lendPerson'))$('lendPerson').value=name;
 else if($('person'))$('person').value=name;
 updatePersonCandidateSelection();
}
function safeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function loanExtraToday(){let n=new Date();return dateISO(n.getFullYear(),n.getMonth()+1,n.getDate())}
function openLoanExtraFromButton(btn){let card=btn.closest('.loan-person-card');if(!card)return;let p=card.dataset.loanPerson;if(!p||loanArchivedPeople.includes(p))return;
 loanExtraPerson=p;loanExtraDirection='lend';$('loanExtraPersonName').textContent='相手：'+p;
 $('loanExtraAmount').value='';$('loanExtraMemo').value='';$('loanExtraError').textContent='';setLoanExtraDirection('lend');$('loanExtraModal').classList.remove('hidden');}
function setLoanExtraDirection(d){loanExtraDirection=d;$('loanExtraLendBtn').classList.toggle('active',d==='lend');$('loanExtraBorrowBtn').classList.toggle('active',d==='borrow')}
function closeLoanExtra(){$('loanExtraModal').classList.add('hidden');loanExtraPerson=''}
function saveLoanExtra(){let amount=moneyNum($('loanExtraAmount').value),memo=$('loanExtraMemo').value.trim(),p=loanExtraPerson;
 if(!p||loanArchivedPeople.includes(p))return;
 if(!Number.isSafeInteger(amount)||amount<=0){$('loanExtraError').textContent='1円以上の整数で金額を入力してね';return}
 let tx={id:'loanExtra'+Date.now()+Math.random().toString(36).slice(2,7),type:loanExtraDirection==='lend'?'loanExtraLend':'loanExtraBorrow',date:loanExtraToday(),person:p,amount,memo};
 txs.unshift(tx);loanActivePerson=p;loanExpandedPerson=p;loanArchiveView=false;loanOrganize=false;loanSelectedIds.clear();
 closeLoanExtra();renderAll();}
function loanImpact(t){if(t.groupId)return 0;if(t.type==='loanAdjustment')return Number(t.delta||0);if(t.type==='lend')return Number(t.other||0);if(t.type==='loanLend'||t.type==='loanExtraLend')return Number(t.amount||0);if(t.type==='loanExtraBorrow')return -Number(t.amount||0);if(['borrowed','loanBorrow','receive'].includes(t.type))return-Number(t.amount||0);if(t.type==='repay')return Number(t.amount||0);return 0}
function loanPeopleAll(){return [...new Set(txs.filter(t=>typeGroup(t)==='loan').map(t=>t.person).filter(Boolean))]}
function loanPersonLastDate(p){let arr=txs.filter(t=>typeGroup(t)==='loan'&&t.person===p);return arr.length?arr[0].date:''}
function recentLoanPerson(){let people=loanPeopleAll().filter(p=>!loanArchivedPeople.includes(p));return people.sort((a,b)=>loanPersonLastDate(b).localeCompare(loanPersonLastDate(a)))[0]||''}
function loanPeopleAll(){return [...new Set(txs.filter(t=>typeGroup(t)==='loan').map(t=>t.person).filter(Boolean))]}
function selectLoanPerson(p){loanActivePerson=p;loanExpandedPerson=p;loanArchiveView=false;loanOrganize=false;loanAddToGroupId='';loanSelectedIds.clear();renderLoans();setTimeout(()=>{let el=document.querySelector(`[data-loan-person="${CSS.escape(p)}"]`);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})},0)}
function toggleLoanCard(p){loanExpandedPerson=loanExpandedPerson===p?'':p;loanActivePerson=p;loanOrganize=false;loanAddToGroupId='';loanSelectedIds.clear();renderLoans()}
function showLoanArchive(){loanArchiveView=true;loanExpandedPerson='';loanOrganize=false;loanAddToGroupId='';loanSelectedIds.clear();renderLoans()}
function toggleLoanOrganize(p){if(loanExpandedPerson!==p)loanExpandedPerson=p;loanActivePerson=p;loanAddToGroupId='';loanOrganize=!loanOrganize;if(!loanOrganize)loanSelectedIds.clear();renderLoans()}
function toggleLoanSelect(id){if(loanSelectedIds.has(id))loanSelectedIds.delete(id);else loanSelectedIds.add(id);renderLoans()}
function reviveArchivedLoanPersonOnNewRecord(p){
 if(!p||!loanArchivedPeople.includes(p))return false;
 // カードの非表示状態のみ解除。グループ、個別アーカイブ、清算調整、折りたたみ状態は触れない。
 loanArchivedPeople=loanArchivedPeople.filter(name=>name!==p);
 loanActivePerson=p;loanExpandedPerson=p;loanArchiveView=false;
 return true;
}
function archiveLoanPerson(p){if(!confirm(p+'をアーカイブしますか？\n\nカードだけを一覧から隠します。履歴・グループ・個別アーカイブはそのまま残ります。'))return;if(!loanArchivedPeople.includes(p))loanArchivedPeople.push(p);if(loanExpandedPerson===p)loanExpandedPerson='';loanActivePerson='';loanOrganize=false;loanSelectedIds.clear();renderLoans();renderPersonCandidates()}
function restoreLoanPerson(p){loanArchivedPeople=loanArchivedPeople.filter(x=>x!==p);loanActivePerson=p;loanExpandedPerson=p;loanArchiveView=false;renderLoans();renderPersonCandidates()}
function toggleLoanFold(p){loanFoldExpanded[p]=!loanFoldExpanded[p];renderLoans()}
function loanStateText(p,es){let bal=es.reduce((sum,e)=>sum+loanImpact(e),0);return bal>0?'返してもらう '+yen(bal):bal<0?'返す '+yen(-bal):'清算済み'}
function loanPayName(k){return k==='bank'?'銀行':payName(k)}
// Step7: グループ化のデータは表示上のまとまり。元取引と残高を二重計算しない。
function loanGroupTx(g){return g.txIds.map(id=>txs.find(t=>t.id===id)).filter(Boolean)}
function loanGroupTotal(g){return loanGroupTx(g).reduce((a,t)=>a+loanImpact(t),0)+ (g.adjustmentId ? loanImpact(txs.find(t=>t.id===g.adjustmentId)||{}) : 0)}
function loanGroupForTx(id){return loanGroups.find(g=>g.txIds.includes(id)||(g.adjustmentId===id))}
function loanCleanGroups(){loanGroups.forEach(g=>{g.txIds=g.txIds.filter(id=>txs.some(t=>t.id===id));if(g.adjustmentId&&!txs.some(t=>t.id===g.adjustmentId))g.adjustmentId=''});loanGroups=loanGroups.filter(g=>g.txIds.length>0)}
function loanAdjustmentLabel(t){let delta=Number(t.delta||0);return '調整額 '+yen(Math.abs(delta))+' ('+(delta>0?'+':'-')+')'}
function loanMakeAdjustment(p,delta,groupId=''){
 const t={id:'adj'+Date.now()+Math.random().toString(36).slice(2,7),type:'loanAdjustment',person:p,date:loanExtraToday(),delta,amount:Math.abs(delta),groupId};
 txs.unshift(t);return t;
}
function makeLoanGroup(p){
 let chosen=txs.filter(t=>t.person===p&&loanSelectedIds.has(t.id)&&typeGroup(t)==='loan'&&t.type!=='loanAdjustment'&&!loanGroupForTx(t.id));
 if(chosen.length<2){alert('グループ化する記録を2件以上選んでね');return}
 loanGroups.push({id:'grp'+(++loanGroupSerial)+'_'+Date.now(),person:p,txIds:chosen.map(t=>t.id),adjustmentId:'',expanded:false,archived:false});
 loanSelectedIds.clear();loanOrganize=false;renderLoans();
}
function startAddToLoanGroup(id){
 let g=loanGroups.find(x=>x.id===id);if(!g)return;
 if(g.adjustmentId){alert('先にチャラ取り消しをしてね');return}
 loanAddToGroupId=id;loanOrganize=false;loanSelectedIds.clear();g.expanded=true;loanExpandedPerson=g.person;renderLoans();
}
function cancelAddToLoanGroup(){loanAddToGroupId='';loanSelectedIds.clear();renderLoans()}
function saveAddToLoanGroup(id){
 let g=loanGroups.find(x=>x.id===id);if(!g||g.adjustmentId)return;
 let chosen=txs.filter(t=>t.person===g.person&&loanSelectedIds.has(t.id)&&typeGroup(t)==='loan'&&t.type!=='loanAdjustment'&&!loanGroupForTx(t.id));
 if(!chosen.length){alert('追加する履歴を選んでね');return}
 g.txIds.push(...chosen.map(t=>t.id));g.expanded=true;loanAddToGroupId='';loanSelectedIds.clear();renderLoans();
}
function cancelLoanGroupSettlement(id){
 let g=loanGroups.find(x=>x.id===id);if(!g||!g.adjustmentId)return;
 if(!confirm('このグループのチャラを取り消しますか？\n\n清算調整だけを取り消し、元の差額に戻します。'))return;
 txs=txs.filter(t=>t.id!==g.adjustmentId);g.adjustmentId='';g.expanded=true;loanAddToGroupId='';loanSelectedIds.clear();renderAll();
}
function toggleLoanGroup(id){let g=loanGroups.find(x=>x.id===id);if(g){g.expanded=!g.expanded;renderLoans()}}
function settleLoanGroup(id){
 let g=loanGroups.find(x=>x.id===id);if(!g||g.adjustmentId)return;
 let total=loanGroupTotal(g);
 if(total===0){alert('このグループはすでに差額0円です');return}
 if(!confirm('このグループの差額 '+yen(Math.abs(total))+' をチャラにしますか？\n\n実際のお金は動かず、清算調整を履歴に残します。'))return;
 let t=loanMakeAdjustment(g.person,-total,g.id);g.adjustmentId=t.id;g.expanded=true;loanOrganize=false;loanSelectedIds.clear();renderAll();
}
function settleLoanPerson(p){
 const total=txs.filter(t=>typeGroup(t)==='loan'&&t.person===p).reduce((a,t)=>a+loanImpact(t),0);
 if(total===0){alert('現在の貸し借り残高は0円です');return}
 if(!confirm(p+'との未清算残高 '+yen(Math.abs(total))+' をここまでチャラにしますか？\n\n清算調整を残し、次のやりとりから新たに計算を続けます。現金・口座・予算は動きません。'))return;
 loanMakeAdjustment(p,-total);loanOrganize=false;loanSelectedIds.clear();loanExpandedPerson=p;renderAll();
}
function releaseLoanGroup(id){
 let g=loanGroups.find(x=>x.id===id);if(!g)return;
 if(g.adjustmentId){
 if(!confirm('このグループを解除しますか？\n\nグループ内の清算調整も取り消し、元の未清算額に戻します。'))return;
 txs=txs.filter(t=>t.id!==g.adjustmentId);
 } else if(!confirm('このグループ化を解除しますか？\n元の記録は残ります。'))return;
 loanGroups=loanGroups.filter(x=>x.id!==id);renderAll();
}
function archiveLoanGroup(id){let g=loanGroups.find(x=>x.id===id);if(!g)return;if(!g.adjustmentId&&loanGroupTotal(g)!==0){alert('未清算のグループはアーカイブできません');return}if(!confirm('この清算済みグループをアーカイブしますか？\n\n記録は削除されず元に戻せます。'))return;g.archived=true;g.expanded=false;renderLoans()}
function restoreLoanGroup(id){let g=loanGroups.find(x=>x.id===id);if(g){g.archived=false;g.expanded=true;renderLoans()}}
function cancelLoanAdjustment(id){
 const t=txs.find(x=>x.id===id&&x.type==='loanAdjustment'&&!x.groupId);if(!t)return;
 if(!confirm('この清算調整を取り消しますか？\n貸し借り残高は調整前の状態に戻ります。'))return;
 txs=txs.filter(x=>x.id!==id);renderAll();
}
function loanTxHtml(e,readOnly=false,inGroup=false){
 let names={lend:'私が立替',borrowed:'相手が立替',repay:'返した',receive:'返された',loanBorrow:'借りる',loanLend:'貸す',loanExtraLend:'貸し（記録外の追加）',loanExtraBorrow:'借り（記録外の追加）'};
 if(e.type==='loanAdjustment')return `<div class="loan-record loan-adjustment"><div class="loan-record-top"><span class="loan-record-kind">清算調整</span><span class="loan-record-amt">${loanAdjustmentLabel(e)}</span></div><div class="loan-record-sub"><span class="loan-record-meta">${safeHtml(e.date)}</span>${!readOnly&&!e.groupId?`<span class="loan-record-actions"><button class="ghost sm" onclick="cancelLoanAdjustment('${e.id}')">取り消す</button></span>`:''}</div></div>`;
 let groupSettled=!!(inGroup&&loanGroupForTx(e.id)?.adjustmentId);let amt=e.type==='lend'?e.other:e.amount,impact=loanImpact(e),amtClass=impact>0?'loan-amt-positive':impact<0?'loan-amt-negative':'',sel=loanSelectedIds.has(e.id),meta=isLoanExtra(e)?e.date+' 登録':[e.date,loanPayName(e.payment||e.source||''),mkPointMeta(e)].filter(Boolean).join('・'),selectable=(loanOrganize||!!loanAddToGroupId)&&!readOnly&&!inGroup&&!loanGroupForTx(e.id);
 return `<div class="loan-record ${selectable?'organize':''} ${sel&&selectable?'selected':''}" data-loan-id="${safeHtml(e.id)}" ${selectable?`onclick="if(!event.target.closest('button'))toggleLoanSelect('${e.id}')"`:''}><div class="loan-record-main">${selectable?`<input class="loan-select" type="checkbox" ${sel?'checked':''} aria-label="この記録を選択" >`:''}<div class="loan-record-body"><div class="loan-record-top"><span class="loan-record-kind">${safeHtml(names[e.type]||recordTitle(e))}</span><span class="loan-record-amt ${amtClass}">${yen(amt)}</span></div><div class="loan-record-sub"><span class="loan-record-meta">${safeHtml(meta)}</span>${readOnly||groupSettled?'':`<span class="loan-record-actions"><button class="ghost sm" onclick="editRecord('${e.id}')">編集</button><button class="ghost sm danger" onclick="deleteHistoryRecord('${e.id}')">削除</button></span>`}</div>${e.memo?`<div class="loan-record-note">${safeHtml(e.memo)}</div>`:''}</div></div></div>`;
}
function loanGroupHtml(g,readOnly=false){
 let list=loanGroupTx(g).sort((a,b)=>txs.indexOf(a)-txs.indexOf(b));
 if(g.adjustmentId){let adj=txs.find(t=>t.id===g.adjustmentId);if(adj)list=[adj,...list]}
 let total=loanGroupTotal(g),state=total>0?'返してもらう '+yen(total):total<0?'返す '+yen(-total):'清算済み';
 let adding=loanAddToGroupId===g.id;
 let actions=readOnly?'':g.adjustmentId?`<div class="loan-group-actions"><button class="ghost" onclick="cancelLoanGroupSettlement('${g.id}')">チャラ取り消し</button><button class="ghost" onclick="releaseLoanGroup('${g.id}')">グループ解除</button>${g.archived?'':`<button class="ghost" onclick="archiveLoanGroup('${g.id}')">アーカイブ</button>`}</div>`:total===0?`<div class="loan-group-actions"><button class="ghost" onclick="startAddToLoanGroup('${g.id}')">履歴を追加</button><button class="ghost" onclick="releaseLoanGroup('${g.id}')">グループ解除</button>${g.archived?'':`<button class="ghost" onclick="archiveLoanGroup('${g.id}')">アーカイブ</button>`}</div>`:`<div class="loan-group-actions"><button class="ghost" onclick="settleLoanGroup('${g.id}')">チャラ</button><button class="ghost" onclick="startAddToLoanGroup('${g.id}')">履歴を追加</button><button class="ghost" onclick="releaseLoanGroup('${g.id}')">グループ解除</button></div>`;
 return `<div class="loan-group"><button type="button" class="loan-group-summary" aria-expanded="${g.expanded}" onclick="toggleLoanGroup('${g.id}')"><span><span class="loan-group-summary-title">グループ（${g.txIds.length}件）</span><span class="loan-group-summary-sub">差額：${state}</span></span><span class="loan-group-summary-arrow">${g.expanded?'▲':'▼'}</span></button>${g.expanded?`<div class="loan-group-detail">${list.map(t=>loanTxHtml(t,readOnly,true)).join('')}${adding?`<div class="loan-group-add-note">下の未グループ履歴から追加するものを選んでください。</div>`:''}${actions}${g.adjustmentId?`<div class="loan-group-lock-note">チャラを変更する場合は「チャラ取り消し」を使ってください</div>`:''}</div>`:''}${g.archived&&!readOnly?`<div class="loan-group-restore"><button class="ghost" onclick="restoreLoanGroup('${g.id}')">元に戻す</button></div>`:''}</div>`;
}
function loanRowsForPerson(p,es,readOnly=false){
 loanCleanGroups();
 let chronological=[...es].reverse(),running=0,display=[];
 chronological.forEach(e=>{let before=running;running+=loanImpact(e);display.push({kind:'tx',tx:e});if(before!==0&&running===0)display.push({kind:'settled',date:e.date})});display.reverse();
 const groups=loanGroups.filter(g=>g.person===p),groupByTx={};groups.forEach(g=>{g.txIds.forEach(id=>groupByTx[id]=g);if(g.adjustmentId)groupByTx[g.adjustmentId]=g});
 let used=new Set(),collapsed=[];
 display.forEach(r=>{
 if(r.kind==='settled'){collapsed.push(r);return}
 let g=groupByTx[r.tx.id];if(g){if(!used.has(g.id)){used.add(g.id);if(!g.archived)collapsed.push({kind:'group',group:g})}}else collapsed.push(r);
 });
 const RECENT_TX_COUNT=6;let expanded=!!loanFoldExpanded[p],txSeen=0,cut=collapsed.length;
 for(let i=0;i<collapsed.length;i++){if(collapsed[i].kind!=='settled'){txSeen++;if(txSeen===RECENT_TX_COUNT){cut=i+1;while(cut<collapsed.length&&collapsed[cut].kind==='settled')cut++;break}}}
 let hiddenPart=cut<collapsed.length?collapsed.slice(cut):[],hiddenCount=hiddenPart.filter(x=>x.kind!=='settled').length,visible=expanded?collapsed:collapsed.slice(0,cut);
 let rows=visible.map(r=>r.kind==='settled'?`<div class="settlement-row"><span class="date">${r.date}</span><span>清算済み</span></div>`:r.kind==='group'?loanGroupHtml(r.group,readOnly):loanTxHtml(r.tx,readOnly)).join('');
 let foldControl=hiddenCount?(expanded?`<button class="loan-fold-toggle" onclick="toggleLoanFold('${p.replace(/'/g,"\\'")}')">▲ 過去の履歴を閉じる</button>`:`<button class="loan-fold-toggle" onclick="toggleLoanFold('${p.replace(/'/g,"\\'")}')">▼ 過去の履歴 ${hiddenCount}件</button>`):'';
 let archived=groups.filter(g=>g.archived),archiveHtml=archived.length?`<div class="loan-archive-groups"><div class="loan-archive-groups-title">アーカイブ済みグループ（${archived.length}）</div>${archived.map(g=>loanGroupHtml(g,readOnly)).join('')}</div>`:'';
 return {rows,foldControl,archiveHtml};
}
function renderLoans(){mkGroupLoanPaint();if(mkGroupLoanView)return;
 loanCleanGroups();
 let esAll=txs.filter(t=>typeGroup(t)==='loan'),allPeople=loanPeopleAll(),activePeople=allPeople.filter(p=>!loanArchivedPeople.includes(p)).sort((a,b)=>loanPersonLastDate(b).localeCompare(loanPersonLastDate(a))),archived=allPeople.filter(p=>loanArchivedPeople.includes(p));
 let tabs=activePeople.map(p=>`<button class="loan-person-tab ${!loanArchiveView&&loanExpandedPerson===p?'active':''}" onclick="selectLoanPerson('${p.replace(/'/g,"\\'")}')">${safeHtml(p)}</button>`).join('');
 if(archived.length)tabs+=`<button class="loan-person-tab archive ${loanArchiveView?'active':''}" aria-pressed="${loanArchiveView}" onclick="showLoanArchive()">アーカイブ</button>`;
 $('loanPersonTabs').innerHTML=tabs;
 if(loanArchiveView){$('loanSummary').innerHTML=archived.length?archived.map(p=>{let es=esAll.filter(x=>x.person===p),state=loanStateText(p,es),open=loanExpandedPerson===p,parts=loanRowsForPerson(p,es,true);return `<div class="loan-person-card is-archived ${open?'':'collapsed'}" data-loan-person="${safeHtml(p)}"><div class="loan-summary-row"><button class="loan-summary-head" type="button" aria-expanded="${open}" onclick="toggleLoanCard('${p.replace(/'/g,"\\'")}')"><span class="loan-summary-left"><span class="loan-summary-name">${safeHtml(p)}</span><span class="loan-current-state">${state}</span></span><span class="loan-summary-arrow">${open?'▲':'▼'}</span></button><button class="loan-restore" type="button" onclick="restoreLoanPerson('${p.replace(/'/g,"\\'")}')">元に戻す</button></div><div class="loan-person-inner"><div class="loan-history-head"><div class="loan-history-title">やりとり履歴（閲覧のみ）</div></div>${parts.rows}${parts.foldControl}${parts.archiveHtml}</div></div>`}).join(''):'<div class="loan-empty">アーカイブ済みの相手はいません。</div>';return}
 if(!activePeople.length){$('loanSummary').innerHTML='<div class="loan-empty">まだ記録はありません。</div>';return}
 let ordered=[...activePeople];if(loanExpandedPerson&&ordered.includes(loanExpandedPerson))ordered=[loanExpandedPerson,...ordered.filter(x=>x!==loanExpandedPerson)];
 $('loanSummary').innerHTML=ordered.map(p=>{let es=esAll.filter(x=>x.person===p),state=loanStateText(p,es),open=loanExpandedPerson===p,parts=loanRowsForPerson(p,es),organizing=loanOrganize&&open;return `<div class="loan-person-card ${open?'':'collapsed'}" data-loan-person="${safeHtml(p)}"><div class="loan-summary-row"><button class="loan-summary-head" type="button" aria-expanded="${open}" onclick="toggleLoanCard('${p.replace(/'/g,"\\'")}')"><span class="loan-summary-left"><span class="loan-summary-name">${safeHtml(p)}</span><span class="loan-current-state">${state}</span></span></button><div class="mk-loan-summary-actions"><button class="mk-loan-todo-btn ${mkTodos.some(t=>t.person===p&&!t.done&&!t.hidden)?'mk-loan-todo-active':''}" type="button" onclick="mkLoanTodoFromButton(this)">${mkTodos.some(t=>t.person===p&&!t.done&&!t.hidden)?'－ やること':'＋ やること'}</button><button class="loan-card-archive" type="button" onclick="archiveLoanPerson('${p.replace(/'/g,"\\'")}')">アーカイブ</button></div><div class="loan-summary-side"><button class="loan-card-arrow" type="button" aria-label="カードを${open?'閉じる':'開く'}" onclick="toggleLoanCard('${p.replace(/'/g,"\\'")}')">${open?'▲':'▼'}</button></div></div><div class="loan-person-inner"><div class="loan-history-head"><div class="loan-history-title">やりとり履歴</div><div class="loan-card-actions"><button class="ghost loan-action-primary" onclick="toggleLoanOrganize('${p.replace(/'/g,"\\'")}')">${organizing?'完了':'整理'}</button><button class="ghost loan-action-primary" onclick="openLoanExtraFromButton(this)">追加</button></div></div>${organizing?`<div class="loan-organize-actions"><div class="loan-organize-note">${loanSelectedIds.size?loanSelectedIds.size+'件選択中':'記録を選択できます'}</div><button class="ghost" onclick="makeLoanGroup('${p.replace(/'/g,"\\'")}')" ${loanSelectedIds.size<2?'disabled':''}>グループ化</button><button class="ghost" onclick="settleLoanPerson('${p.replace(/'/g,"\\'")}')">ここまでチャラ</button></div>`:''}${loanAddToGroupId&&loanGroups.find(g=>g.id===loanAddToGroupId)?.person===p?`<div class="loan-group-add-actions"><div class="loan-organize-note">${loanSelectedIds.size?loanSelectedIds.size+'件選択中':'追加する履歴を選択'}</div><button class="ghost" onclick="cancelAddToLoanGroup()">キャンセル</button><button class="ghost" onclick="saveAddToLoanGroup('${loanAddToGroupId}')" ${loanSelectedIds.size<1?'disabled':''}>追加する</button></div>`:''}${parts.rows}${parts.foldControl}${parts.archiveHtml}</div></div>`}).join('');
}
function finalCardForPayment(p,source){return mkSettings.cardRoutes[p==='rakutenpay'?source:p]||''}
let cardDefs={};
let mkSettings=null;
// Validate the saved configuration itself; no personal template is bundled.
function mkValidateSettings(c){
 const fail=()=>{throw Error('口座・支払方法の設定が正しくありません。設定入りバックアップを確認してください。')};
 const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const key=x=>typeof x==='string'&&/^[a-z][a-z0-9_-]{0,79}$/.test(x)&&!['__proto__','constructor','prototype'].includes(x);
 const label=(x,empty=false)=>typeof x==='string'&&(empty||x.trim().length>0)&&x.length<=200&&!/[<>\u0000-\u001f]/.test(x);
 const list=(x,min=0)=>Array.isArray(x)&&x.length>=min&&x.length<=200;
 const unique=x=>new Set(x).size===x.length;
 const fields=['version','accounts','pays','incomePays','labels','cards','balanceRoutes','routeTokens','cardRoutes','aliases','layouts','chargeTargets','rakutenSources','installmentPays','chargeDefaults','recurringSources'];
 if(!obj(c)||c.version!==1||Object.keys(c).filter(k=>k!=='ui').sort().join('|')!==fields.sort().join('|'))fail();
 if(!list(c.accounts,1)||!c.accounts.every(x=>obj(x)&&key(x.id)&&label(x.name))||!unique(c.accounts.map(x=>x.id)))fail();
 for(const a of c.accounts){
  if(a.kind!==undefined&&!['bank','prepaid'].includes(a.kind))fail();
  if(a.untrackedTxIds!==undefined&&(!Array.isArray(a.untrackedTxIds)||a.untrackedTxIds.length>100000||!unique(a.untrackedTxIds)||!a.untrackedTxIds.every(x=>typeof x==='string'&&x.length>0&&x.length<=200)))fail();
 }
 const accounts=new Set(c.accounts.map(x=>x.id));
 function pairs(x,allowEmpty=false){if(!list(x)||!x.every(y=>Array.isArray(y)&&y.length===2&&(allowEmpty?label(y[0],true):key(y[0]))&&label(y[1]))||!unique(x.map(y=>y[0])))fail()}
 pairs(c.pays);pairs(c.incomePays);pairs(c.chargeTargets);pairs(c.rakutenSources);pairs(c.recurringSources,true);
 if(!c.pays.length)fail();const pays=new Set(c.pays.map(x=>x[0]));
 if(!c.incomePays.every(x=>pays.has(x[0])))fail();
 if(!obj(c.labels)||Object.keys(c.labels).length!==pays.size||!Object.entries(c.labels).every(([k,v])=>pays.has(k)&&label(v)))fail();
 if(!list(c.cards)||!c.cards.every(x=>obj(x)&&key(x.id)&&pays.has(x.id)&&label(x.name)&&label(x.account)&&accounts.has(x.accountId)&&!accounts.has(x.id)&&Number.isInteger(x.closeDay)&&x.closeDay>=1&&x.closeDay<=31&&Number.isInteger(x.dueDay)&&x.dueDay>=1&&x.dueDay<=31&&typeof x.monthEnd==='boolean'&&obj(x.known)&&Object.entries(x.known).every(([d,n])=>mkValidRecordDate(d)&&Number.isSafeInteger(n)&&n>=0))||!unique(c.cards.map(x=>x.id)))fail();
 for(const card of c.cards){
  if(card.schedules!==undefined){if(!list(card.schedules)||!card.schedules.every((x,i)=>obj(x)&&/^\d{4}-(0[1-9]|1[0-2])$/.test(x.from)&&x.from>='2000-01'&&x.from<='2199-12'&&(!i||card.schedules[i-1].from<x.from)&&Number.isInteger(x.closeDay)&&x.closeDay>=1&&x.closeDay<=31&&typeof x.monthEnd==='boolean'&&Number.isInteger(x.dueDay)&&x.dueDay>=1&&x.dueDay<=31&&accounts.has(x.accountId)))fail();}
 }
 const cards=new Set(c.cards.map(x=>x.id));
 if(!obj(c.balanceRoutes)||Object.keys(c.balanceRoutes).length!==accounts.size||!Object.entries(c.balanceRoutes).every(([k,v])=>accounts.has(k)&&v===k))fail();
 // Identity balance routes match this release's accounting engine. Remapping
 // historical payments needs a separate feature; do not silently accept it.
 if(!obj(c.cardRoutes)||!Object.entries(c.cardRoutes).every(([k,v])=>pays.has(k)&&cards.has(v)&&!accounts.has(k))||![...cards].every(k=>c.cardRoutes[k]===k))fail();
 if(!list(c.routeTokens)||!c.routeTokens.every(x=>Array.isArray(x)&&x.length===2&&label(x[0])&&(accounts.has(x[1])||cards.has(x[1]))))fail();
 if(!obj(c.aliases)||!Object.entries(c.aliases).every(([k,v])=>label(k)&&!['__proto__','constructor','prototype'].includes(k)&&(pays.has(v)||v==='bank')))fail();
 if(!obj(c.layouts)||Object.keys(c.layouts).sort().join('|')!=='charge|income|more|payment')fail();
 for(const [name,rows] of Object.entries(c.layouts)){
  if(!list(rows)||!rows.every(row=>Array.isArray(row)&&row.length>=1&&row.length<=4&&row.every(k=>pays.has(k)||(name==='payment'&&k==='__more'))))fail();
  if(!unique(rows.flat()))fail();
 }
 const shown=[...c.layouts.payment.flat(),...c.layouts.more.flat()];
 if(!unique(shown)||shown.filter(x=>x==='__more').length!==1||shown.length!==pays.size+1||![...pays].every(k=>shown.includes(k)))fail();
 if(c.layouts.income.flat().length!==c.incomePays.length||!c.incomePays.every(x=>c.layouts.income.flat().includes(x[0])))fail();
 if(!c.chargeTargets.every(x=>accounts.has(x[0]))||!c.layouts.charge.flat().every(k=>accounts.has(k)||Object.hasOwn(c.cardRoutes,k)))fail();
 if(!obj(c.chargeDefaults)||Object.keys(c.chargeDefaults).length!==c.chargeTargets.length||!Object.entries(c.chargeDefaults).every(([k,v])=>c.chargeTargets.some(x=>x[0]===k)&&c.layouts.charge.flat().includes(v)))fail();
 if(!list(c.installmentPays)||!unique(c.installmentPays)||!c.installmentPays.every(k=>cards.has(k)))fail();
 if(!c.rakutenSources.every(x=>accounts.has(x[0])||cards.has(x[0]))||(pays.has('rakutenpay')&&!c.rakutenSources.length))fail();
 if(c.ui!==undefined){
  const u=c.ui;
  if(!obj(u)||Object.keys(u).sort().join('|')!=='customIncome|hiddenBalances|hiddenPays|payOrder')fail();
  for(const [name,allowed] of [['hiddenBalances',accounts],['hiddenPays',new Set([...accounts,...pays])],['payOrder',pays]])if(!list(u[name])||!unique(u[name])||!u[name].every(k=>allowed.has(k)))fail();
  if(u.payOrder.length!==pays.size||typeof u.customIncome!=='boolean')fail();
 }
 return c;
}
function mkValidateStoredSettings(state){
 if(Array.isArray(state.txs))state.txs.forEach(t=>{mkValidateSplits(t);mkGroupValidate(t,state.mkSettings)});
 mkValidateSettings(state.mkSettings);
 if(!state.balances||typeof state.balances!=='object'||Array.isArray(state.balances))throw Error('残高データが正しくありません。');
 const ids=state.mkSettings.accounts.map(x=>x.id);
 if(Object.keys(state.balances).length!==ids.length||!ids.every(k=>Object.hasOwn(state.balances,k)))throw Error('口座と残高の対応が正しくありません。');
 for(const [k,v] of Object.entries(state.balances))if(!ids.includes(k)||!Number.isFinite(v))throw Error('残高データが正しくありません。');
 if(state.chargeDefaults!==undefined){
  if(!state.chargeDefaults||typeof state.chargeDefaults!=='object'||Array.isArray(state.chargeDefaults))throw Error('チャージ設定が正しくありません。');
  for(const [k,v] of Object.entries(state.chargeDefaults))if(!state.mkSettings.chargeTargets.some(x=>x[0]===k)||!state.mkSettings.layouts.charge.flat().includes(v))throw Error('チャージ元が正しくありません。');
 }
 for(const k of ['txs','loans','cashbook','snapshots','wishes','recurring','eventsData','deletedEventNames','loanArchivedPeople','loanGroups','mkTodos'])if(state[k]!==undefined&&!Array.isArray(state[k]))throw Error('Invalid '+k);
 const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 for(const k of ['billAdjustments','billItemAdjustments','mkPaidBills','categoryBudgets','monthlyBudgetHistory','categoryBudgetHistory','mkTodoHidden'])if(state[k]!==undefined&&!object(state[k]))throw Error('Invalid '+k);
 const cards=new Set(state.mkSettings.cards.map(x=>x.id));
 for(const k of Object.keys(state.billAdjustments||{}))if(!cards.has(k.split('|')[0]))throw Error('請求先のカード設定がありません。');
 for(const [k,v] of Object.entries(state.mkPaidBills||{}))if(!cards.has(k.split('|')[0])||!object(v)||!ids.includes(v.account)||!Number.isSafeInteger(v.amount)||v.amount<0)throw Error('引落済み情報と口座の対応が正しくありません。');
 if(state.mkMemoData!==undefined)mkMemoValidate(state.mkMemoData);
 return state;
}
function mkApplySettings(c){
 mkSettings=structuredClone(mkValidateSettings(c));
 chargeDefaults=structuredClone(mkSettings.chargeDefaults);
 rakutenPaySource=mkSettings.rakutenSources.find(([k])=>!mkHiddenPay(k))?.[0]||'';
 pays=mkSettings.pays;incomePays=mkSettings.incomePays;
 balances=Object.fromEntries(mkSettings.accounts.map(x=>[x.id,{name:x.name,v:balances[x.id]?.v||0}]));
 cardDefs=Object.fromEntries(mkSettings.cards.map(x=>[x.id,{...x,account:balances[x.accountId].name}]));
 $('recFinalSource').innerHTML=selectOptions(mkSettings.recurringSources,'');
 const ids=['mkRakPayCard','mkRakPayBank','mkRakPayCash'];
 const row=$('mkRakPaySource').querySelector('.choice-row');row.replaceChildren();
 mkSettings.rakutenSources.forEach(([k,name],i)=>{const b=document.createElement('button');b.type='button';b.className='mini';b.id=ids[i]||'mkRakPaySource'+i;b.dataset.source=k;b.hidden=mkHiddenPay(k);b.textContent=name;b.onclick=()=>mkChooseRakPaySource(k);row.appendChild(b)});
 const cardNames=mkSettings.rakutenSources.filter(x=>cardDefs[x[0]]).map(x=>x[1]);
 const accountNames=mkSettings.rakutenSources.filter(x=>balances[x[0]]).map(x=>x[1]);
 $('mkRakPaySource').lastElementChild.textContent=(cardNames.length?cardNames.join('・')+'はカード請求へ':'')+(cardNames.length&&accountNames.length?'、':'')+(accountNames.length?accountNames.join('・')+'はそれぞれの残高から差し引きます。':'');
}
function mkRakSourceName(k){return mkSettings.rakutenSources.find(x=>x[0]===k)?.[1]||mkSettings.rakutenSources[0]?.[1]||k||''}

function pad2(n){return String(n).padStart(2,'0')}
function dateISO(y,m,d){return `${y}-${pad2(m)}-${pad2(d)}`}
function addMonthsYM(y,m,add){let z=(y*12+(m-1))+add;return [Math.floor(z/12),z%12+1]}
// #94: schedules are selected by withdrawal month, never by the screen's current date.
function mkCardRule(card,month){const base=cardDefs[card];if(!base)return null;let rule=base;for(const x of base.schedules||[])if(x.from<=month.slice(0,7))rule={...base,...x};return {...rule,account:balances[rule.accountId]?.name||rule.account}}
function mkDueDate(y,m,day){return dateISO(y,m,Math.min(day,new Date(y,m,0).getDate()))}
function mkRulePurchase(c,date){const [y,m,d]=date.split('-').map(Number),add=c.monthEnd||d<=c.closeDay?1:2,[yy,mm]=addMonthsYM(y,m,add);return mkDueDate(yy,mm,c.dueDay)}
function dueForPurchase(card,date){const c=cardDefs[card];if(!c)return '';let due=mkRulePurchase(c,date);for(const rule of c.schedules||[]){if(due.slice(0,7)<rule.from)break;due=mkRulePurchase(rule,date);if(due.slice(0,7)<rule.from){const [y,m]=rule.from.split('-').map(Number);due=mkDueDate(y,m,rule.dueDay)}}return due}
function nextMonthlyDue(card,due){const [y,m]=due.split('-').map(Number),[yy,mm]=addMonthsYM(y,m,1);return mkDueDate(yy,mm,mkCardRule(card,dateISO(yy,mm,1)).dueDay)}
function fmtMD(iso){let p=iso.split('-');return Number(p[1])+'/'+Number(p[2])}
function statusForBill(card,due){let adj=billAdjustments[card+'|'+due];if(adj&&adj.status==='confirmed')return'confirmed';if(adj&&adj.status==='cancelled')return billUnconfirmedStatus(card,due);if(cardDefs[card].known[due]!=null)return'confirmed';let c=mkCardRule(card,due), [y,m]=due.split('-').map(Number);let [cy,cm]=addMonthsYM(y,m,-1);let close=dateISO(cy,cm,Math.min(c.closeDay,new Date(cy,cm,0).getDate()));let today=new Date().toISOString().slice(0,10);return today>close?'candidate':'planned'}
function billUnconfirmedStatus(card,due){let c=mkCardRule(card,due),[y,m]=due.split('-').map(Number),[cy,cm]=addMonthsYM(y,m,-1),close=dateISO(cy,cm,Math.min(c.closeDay,new Date(cy,cm,0).getDate()));return new Date().toLocaleDateString('sv-SE')>close?'candidate':'planned'}
function statusText(s){return s==='confirmed'?'確定':s==='candidate'?'確定候補':'予定'}
function allocRecorded(card){let out=[];txs.forEach((t,idx)=>{if(t.type==='expense'){let c=finalCardForPayment(t.payment,t.rakutenPaySource);if(c!==card)return;let baseDue=t.billOverride||dueForPurchase(card,t.date),n=Math.max(1,Number(t.installments||1)),total=Number(t.billed??t.paid??(Number(t.amount||0)-Number(t.points||0))),base=Math.floor(total/n),rem=total-base*n;for(let i=0;i<n;i++){let due=i?nextMonthlyDue(card,baseDue):baseDue;for(let j=1;j<i;j++)due=nextMonthlyDue(card,due);out.push({kind:'tx',idx,date:t.date,label:(t.memo||t.category)+(n>1?`（${i+1}/${n}回）`:''),amount:base+(i<rem?1:0),due})}}else if(t.type==='lend'){let c=finalCardForPayment(t.payment,t.rakutenPaySource);if(c!==card)return;let baseDue=t.billOverride||dueForPurchase(card,t.date),n=Math.max(1,Number(t.installments||1)),total=Number(t.billed??t.gross??0),base=Math.floor(total/n),rem=total-base*n;for(let i=0;i<n;i++){let due=baseDue;for(let j=0;j<i;j++)due=nextMonthlyDue(card,due);out.push({kind:'tx',idx,date:t.date,label:(t.memo||t.category||'立替')+(t.groupId?'（グループ・'+t.groupName+'）':'（立替・'+(t.person||'相手')+'）')+(n>1?`（${i+1}/${n}回）`:''),amount:base+(i<rem?1:0),due})}}else if(t.type==='charge'){let c=finalCardForPayment(t.source);if(c!==card)return;let due=t.billOverride||dueForPurchase(card,t.date);out.push({kind:'charge',idx,date:t.date,label:(balances[t.target]?.name||t.target)+'チャージ',amount:Number(t.billed??t.amount??0),due})}});return out}
function timingDay(r){let m=String(r.timing).match(/(^|[^0-9])(\d{1,2})日/);return m?Number(m[2]):null}
function recurringForDue(card,due){let c=mkCardRule(card,due),[y,m]=due.split('-').map(Number),[py,pm]=addMonthsYM(y,m,-1),items=[];recurring.forEach((r,i)=>{if(r.paused||r.target!==card)return;if(r.timing.includes('ヶ月')){let nx=(r.timing.match(/次回(\d{1,2})\/(\d{1,2})/)||[]);if(!nx.length)return;let d=dateISO(y,Number(nx[1]),Number(nx[2]));if(dueForPurchase(card,d)!==due)return;items.push({kind:'rec',idx:i,date:d,label:r.name,amount:r.amount,due});return}let day=timingDay(r);if(!day)return;let days=new Date(py,pm,0).getDate(),d=dateISO(py,pm,Math.min(day,days));if(dueForPurchase(card,d)===due)items.push({kind:'rec',idx:i,date:d,label:r.name,amount:r.amount,due})});return items}
function billItemKey(x,due){return x.kind+'|'+x.idx+'|'+due}
function itemsForBill(card,due){return [...allocRecorded(card).filter(x=>x.due===due),...recurringForDue(card,due)].map(x=>{let a=billItemAdjustments[billItemKey(x,due)];return a!=null?{...x,originalAmount:x.amount,amount:a}:x})}
function predictedAmount(card,due){return itemsForBill(card,due).reduce((s,x)=>s+x.amount,0)}
function amountForBill(card,due){let a=billAdjustments[card+'|'+due];if(a&&a.status==='cancelled')return predictedAmount(card,due);if(a&&a.amount!=null)return a.amount;if(cardDefs[card].known[due]!=null)return cardDefs[card].known[due];return predictedAmount(card,due)}
let mkBillOffset={};
let mkPaidBills={};

function mkIsPaid(card,due){return !!mkPaidBills[card+'|'+due]}
function mkConfirmWithdrawal(card,due){
 const key=card+'|'+due,c=mkCardRule(card,due),amount=amountForBill(card,due),account=c.accountId;
 if(mkIsPaid(card,due)){alert('この引落はすでに反映済みです。');return}
 if(statusForBill(card,due)!=='confirmed'){alert('先に請求額を確定してください。');return}
 if(due>new Date().toLocaleDateString('sv-SE')){alert('引落日以降に確認してください。');return}
 if(!account||!balances[account]||!Number.isSafeInteger(amount)||amount<=0){alert('引落口座または金額を確認してください。');return}
 if(!confirm(c.name+'の'+fmtMD(due)+'引落を確認しましたか？\n'+c.account+'から'+yen(amount)+'を差し引きます。\n※月の支出には再計上しません。'))return;
 balances[account].v-=amount;cashbook.unshift({date:due,text:c.name+' 引落（確認済み）',delta:-amount,mkBillKey:key});
 mkPaidBills[key]={date:due,amount,account,confirmedAt:new Date().toISOString()};
 renderAll();openBillDetail(card);
}

function visibleBills(card){const known=Object.keys(cardDefs[card].known).sort(),today=mkToday();let current=known.find(d=>d>=today)||'';if(!current){const [y,m]=today.split('-').map(Number);current=mkDueDate(y,m,mkCardRule(card,today).dueDay);if(current<today)current=nextMonthlyDue(card,current)}const offset=mkBillOffset[card]||0;for(let j=0;j<Math.abs(offset);j++){if(offset>0)current=nextMonthlyDue(card,current);else{const [y,m]=current.split('-').map(Number),[yy,mm]=addMonthsYM(y,m,-1);current=mkDueDate(yy,mm,mkCardRule(card,dateISO(yy,mm,1)).dueDay)}}return [current,nextMonthlyDue(card,current)]}
function mkShiftBill(card,step){mkBillOffset[card]=(mkBillOffset[card]||0)+step;renderAll();openBillDetail(card)}
function renderBillItems(card,due){let items=itemsForBill(card,due);if(!items.length)return '<div class="small" style="margin-top:7px">この引落分に紐づく記録はまだありません。</div>';return items.map(x=>`<div class="billline"><span>${fmtMD(x.date)}</span><span>${x.label}${x.originalAmount!=null?'<div class="item-meta">記録上 '+yen(x.originalAmount)+' → 請求 '+yen(x.amount)+'</div>':''}</span><span class="amt">${yen(x.amount)}</span>${x.kind==='tx'||x.kind==='charge'?`<span></span><span class="bill-actions"><button class="ghost bill-edit" onclick="editBillItemAmount('${x.kind}',${x.idx},'${card}','${due}')">請求額だけ修正</button><button class="ghost" onclick="editRecord(txs[${x.idx}].id);closeBillDetail()">記録を編集</button><button class="ghost" onclick="moveBillItem('${x.kind}',${x.idx},'${card}','${due}')">翌月へ</button><button class="ghost" onclick="moveBillItem('${x.kind}',${x.idx},'${card}','${due}',-1)">前月へ</button></span><span></span>`:''}</div>`).join('')}
function editBillItemAmount(kind,idx,card,due){if(mkIsPaid(card,due)){alert('引落済みの請求額は変更できません。');return}let item=itemsForBill(card,due).find(x=>x.kind===kind&&x.idx===idx);if(!item)return;openMoneyPrompt('請求額だけ修正',item.amount,(v)=>{billItemAdjustments[billItemKey(item,due)]=v;renderAll();openBillDetail(card)},{min:0,hint:'元の支出記録の購入金額は変わりません。'})}
function moveBillItem(kind,idx,card,due,direction=1){if(mkIsPaid(card,due)){alert('引落済みの請求は移動できません。');return}let next=nextMonthlyDue(card,due);if(direction<0){let [y,m]=due.split('-').map(Number);[y,m]=addMonthsYM(y,m,-1);next=mkDueDate(y,m,mkCardRule(card,dateISO(y,m,1)).dueDay)}if(kind==='tx')txs[idx].billOverride=next;else if(kind==='charge')txs[idx].billOverride=next;renderAll();openBillDetail(card)}
function reconcileBox(card,due){let st=statusForBill(card,due),pred=predictedAmount(card,due),actual=amountForBill(card,due);return `<div class="reconcile"><div class="subhead">カード会社の確定額と照合</div><div class="small">アプリ予測 ${yen(pred)}。通知・明細の確定額を入力して照合できます。</div><div class="field"><label>実際の請求確定額</label><input id="actual-${card}-${due}" type="text" inputmode="numeric" value="${st==='confirmed'&&actual?actual:''}" placeholder="金額"></div><div class="grid2"><button class="outline" onclick="checkBillAmount('${card}','${due}')">差額を見る</button><button class="btn" onclick="confirmBillAmount('${card}','${due}')">この金額で確定</button></div><div id="diff-${card}-${due}" class="small" style="margin-top:7px"></div></div>`}
function checkBillAmount(card,due){let el=$('actual-'+card+'-'+due),n=moneyNum(el.value),pred=predictedAmount(card,due),d=n-pred,out=$('diff-'+card+'-'+due);if(n<0||!el.value){out.textContent='確定額を入力してね';return}out.innerHTML=d===0?'✓ アプリ予測と一致しています。':`差額 ${d>0?'+':''}${yen(d)}。内訳を見て翌月へ移す記録がないか確認するか、実額で確定できます。`}
function confirmBillAmount(card,due){if(mkIsPaid(card,due)){alert('引落済みの請求額は変更できません。');return}let el=$('actual-'+card+'-'+due);if(!el.value)return checkBillAmount(card,due);let n=moneyNum(el.value);billAdjustments[card+'|'+due]={amount:n,status:'confirmed'};delete mkTodoHidden['check|'+card+'|'+due];renderAll();openBillDetail(card)}
function mkCancelBillConfirmation(card,due){
 const key=card+'|'+due;
 if(mkIsPaid(card,due)){alert('引落反映済みの請求は、先に引落反映を取り消してください。');return}
 if(statusForBill(card,due)!=='confirmed')return;
 if(!confirm(cardDefs[card].name+' '+fmtMD(due)+'の請求額の確定を取り消しますか？\n請求額は記録・定期支払いからの予測額に戻ります。元の記録や内訳は削除されません。'))return;
 billAdjustments[key]={status:'cancelled'};
 delete mkTodoHidden['check|'+card+'|'+due];
 renderAll();openBillDetail(card);
}
function mkBillDatePassed(due){return due<=new Date().toLocaleDateString('sv-SE')}
function mkUndoWithdrawal(card,due){
 const key=card+'|'+due,entry=mkPaidBills[key];if(!entry)return;
 if(!confirm(cardDefs[card].name+' '+fmtMD(due)+'の引落反映を取り消しますか？\n口座残高を'+yen(entry.amount)+'戻します。'))return;
 if(!balances[entry.account]){alert('引落口座が見つかりません。');return}
 balances[entry.account].v+=entry.amount;
 const index=cashbook.findIndex(x=>x.mkBillKey===key);
 if(index>=0)cashbook.splice(index,1);
 else cashbook.unshift({date:new Date().toLocaleDateString('sv-SE'),text:cardDefs[card].name+' 引落取消（調整）',delta:entry.amount});
 delete mkPaidBills[key];renderAll();openBillDetail(card);
}
function mkBillDetailsBlock(card,due){const items=itemsForBill(card,due);return `<details class="mk-bill-items"><summary>記録一覧 <span class="mk-bill-count">（${items.length}件）</span><span class="mk-bill-expand" aria-hidden="true"></span></summary><div class="mk-bill-items-content">${renderBillItems(card,due)}</div></details>`}
function openBillDetail(card){
 const c=cardDefs[card],[a,b]=visibleBills(card);
 $('billTitle').textContent=c.name+' 請求内訳';
 const nav=`<div class="mk-bill-nav"><button class="outline" onclick="mkShiftBill('${card}',-1)">‹ 前の月</button><button class="outline" onclick="mkShiftBill('${card}',1)">次の月 ›</button></div>`;
 const blocks=[a,b].map((due,i)=>{
  const st=statusForBill(card,due),paid=mkIsPaid(card,due),amt=amountForBill(card,due),pred=predictedAmount(card,due),late=st==='confirmed'&&pred!==amt;
  const head=`<div class="billhead"><div><strong>${fmtMD(due)} 引落し${i===0?'':'予定'}</strong><div class="item-meta">記録＋定期支払いから集計</div></div><div><div style="text-align:right;font-weight:800">${yen(amt)}</div><span class="billstatus ${st}">${paid?'引落済み':statusText(st)}</span></div></div>`;
  if(i===1)return `<div class="billbox mk-bill-preview">${head}<div class="small" style="margin-top:8px">詳しい内訳・操作は「次の月」で確認できます。</div></div>`;
  const warning=late?`<div class="warnbox">確定済み総額は ${yen(amt)} のままです。現在の内訳合計は ${yen(pred)}。追加した記録や未調整の請求額がないか確認できます。</div>`:'';
  const reconciliation=paid?'<div class="small mk-bill-note">請求額確定済み・引落反映済み</div>':st==='confirmed'?`<div class="reconcile"><div class="subhead">カード会社の確定額と照合</div><div class="small">確定額 ${yen(amt)} ／ アプリ内訳 ${yen(pred)}</div><button class="outline mk-bill-small" onclick="mkShowBillReconcile('${card}','${due}')">確定額を修正・再照合</button><div id="mk-reconcile-${card}-${due}" class="hidden">${reconcileBox(card,due)}<div class="mk-bill-cancel-confirm"><button type="button" class="outline mk-bill-small" onclick="mkCancelBillConfirmation('${card}','${due}')">確定を取り消す</button></div></div></div>`:reconcileBox(card,due);
  let withdrawal='';
  if(paid)withdrawal=`<div class="mk-bill-withdraw"><span class="small">✓ 引落済み（口座残高に反映済み）</span><button class="outline mk-bill-small" onclick="mkUndoWithdrawal('${card}','${due}')">反映を取り消す</button></div>`;
  else if(st==='confirmed'&&amt>0)withdrawal=`<div class="mk-bill-withdraw"><button class="outline mk-bill-small" onclick="mkConfirmWithdrawal('${card}','${due}')" ${!mkBillDatePassed(due)?'disabled':''}>引落済みにする</button>${!mkBillDatePassed(due)?'<span class="small">引落日以降に確認できます</span>':''}</div>`;
  return `<div class="billbox">${head}${warning}${reconciliation}${withdrawal}${mkBillDetailsBlock(card,due)}</div>`;
 });
 $('billDetail').innerHTML=nav+blocks.join('');$('billModal').classList.remove('hidden');initMoneyInputs();
}
function mkShowBillReconcile(card,due){$('mk-reconcile-'+card+'-'+due)?.classList.toggle('hidden')}
function closeBillDetail(){$('billModal').classList.add('hidden')}
function cardRow(card){let [a,b]=visibleBills(card),c=mkCardRule(card,a),sa=statusForBill(card,a),sb=statusForBill(card,b);return `<div class="item"><div class="mk-card-heading"><div class="item-title">${safeHtml(c.name)}</div><button type="button" class="mk-bill-check" onclick="openBillDetail('${card}')">請求額を確認 ›</button></div><div class="item-meta">締め日：${c.monthEnd?'月末':c.closeDay+'日'} ／ 引落日：翌月${c.dueDay}日<br>引落口座：${safeHtml(c.account)}</div><div class="row"><span>次回引落</span><strong>${fmtMD(a)} ${yen(amountForBill(card,a))}（${statusText(sa)}）</strong></div><div class="row"><span class="small">その次</span><span class="small">${fmtMD(b)} ${yen(amountForBill(card,b))}（${statusText(sb)}）</span></div></div>`}
function renderDue(){
 $('prep').innerHTML='<div class="small">初期データは未登録です。引落口座の準備情報は今後の本番化で設定します。</div>';
 $('cards').innerHTML=mkSettings.cards.map(c=>c.id).map(cardRow).join('');
}
function recurringMeta(r){let cat=r.category?`<span class="cat-mini">${r.category}</span>`:`<span class="cat-mini">支出集計対象外</span>`;if(r.name==='Pairs'||r.name==='Google One')return `${recCycleText(r)}<br>${r.route||''}${cat}`;return `${recCycleText(r)}　${r.route||''}${r.finalSource?' → '+r.finalSource:''}${cat}`}
function renderRecurring(){$('recurringList').innerHTML=recurring.map((r,i)=>`<div class="item"><div class="rec-wrap"><div class="rec-main"><div class="item-title">${r.name}${r.limited?' <span class="pill">期間限定</span>':''}${r.paused?' <span class="pill">停止中</span>':''}</div><div class="item-meta">${recurringMeta(r)}</div></div><div class="rec-side"><strong>${yen(r.amount)}</strong><div class="rec-actions"><button class="ghost sm" onclick="editRecurring(${i})">編集</button><button class="ghost sm mk-recurring-pause" onclick="toggleRecurringPause(${i})">${r.paused?'再開':'停止'}</button></div></div></div></div>`).join('')}
function toggleRecurringForm(force){if(force!==true&& !$('mkRecurringModal').classList.contains('hidden')){cancelRecurringEdit();return}recurringEditIndex=-1;$('mkRecurringDelete').classList.add('hidden');$('mkRecurringModal').classList.remove('hidden')}
function setRecType(t,b){recType=t;document.querySelectorAll('#recTypeBtns .mini').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('limitedFields').classList.toggle('hidden',t!=='limited')}
function pickRecCat(){openPicker('支出カテゴリ',[{label:'支出集計対象外',value:''},...cats.map(c=>({label:c,value:c}))],(v,l)=>{recCategory=v;$('recCatBtn').firstElementChild.textContent=l})}
function routeTarget(route){return mkSettings.routeTokens.find(([label])=>route.includes(label))?.[1]||''}
function updateRecCycleFields(){let c=$('recCycle').value;$('recIntervalWrap').classList.toggle('hidden',!['days','weeks','months'].includes(c))}
function recCycleText(r){let names={monthly:'毎月',weekly:'毎週',biweekly:'2週間ごと',months2:'2ヶ月ごと',months3:'3ヶ月ごと',months6:'6ヶ月ごと',yearly:'毎年',days:'指定日数ごと',weeks:'指定週数ごと',months:'指定月数ごと',custom:'その他・不定期'};return (names[r.cycle]||r.timing||'周期未設定')+(r.interval?'（'+r.interval+'）':'')+(r.payRule?'・'+r.payRule:'')}
function saveRecurring(){let name=$('recName').value.trim(),amount=moneyNum($('recAmount').value),cycle=$('recCycle').value,route=$('recRoute').value.trim(),count=Number($('recCount').value||0),interval=Number($('recInterval').value||0),start=$('recStart').value,payRule=$('recPayRule').value.trim(),next=$('recNext').value,endDate=$('recEnd').value,finalSource=$('recFinalSource').value,memo=$('recMemo').value.trim();$('recError').textContent='';if(!name||amount<=0){$('recError').textContent='名前と金額を確認してね';return}if(['days','weeks','months'].includes(cycle)&&interval<=0){$('recError').textContent='指定周期の間隔を入力してね';return}if(start&&endDate&&endDate<start){$('recError').textContent='終了日は開始日以降にしてね';return}let old=recurringEditIndex>=0?recurring[recurringEditIndex]:null;let timing=recCycleText({cycle,interval,payRule});let obj={name,amount,timing,cycle,interval,start,payRule,next,endDate,route,finalSource,memo,target:old?.target||'',category:recCategory,limited:recType==='limited',count:recType==='limited'?count:0,paused:old?!!old.paused:false,event:old?.event||''};if(recType==='limited'&&count<=0&&!endDate){$('recError').textContent='期間限定は回数または終了日を入れてね';return}if(recType==='limited'&&$('recMakeEvent').checked&&count>0){let eventName=old&&old.event?old.event:name;let existing=eventsData.find(e=>e.name===eventName);if(!existing)eventsData.unshift({id:'ev'+Date.now(),name:eventName,start:'',end:'',budget:amount*count,catBudgets:{},archived:false,baseSpent:0});obj.event=eventName}if(recurringEditIndex>=0)recurring[recurringEditIndex]={...recurring[recurringEditIndex],...obj};else recurring.push(obj);cancelRecurringEdit();renderAll()}
function editRecurring(i){let r=recurring[i];recurringEditIndex=i;$('mkRecurringModal').classList.remove('hidden');$('mkRecurringDelete').classList.remove('hidden');$('recName').value=r.name;$('recAmount').value=r.amount;$('recCycle').value=r.cycle||'custom';$('recStart').value=r.start||'';$('recPayRule').value=r.payRule||(!r.cycle?r.timing||'':'');$('recInterval').value=r.interval||'';$('recNext').value=r.next||'';$('recEnd').value=r.endDate||'';$('recRoute').value=r.route||'';$('recFinalSource').value=r.finalSource||'';$('recMemo').value=r.memo||'';updateRecCycleFields();recCategory=r.category||'';$('recCatBtn').firstElementChild.textContent=r.category||'支出集計対象外';recType=r.limited?'limited':'normal';document.querySelectorAll('#recTypeBtns .mini').forEach((b,j)=>b.classList.toggle('active',(j===1)===!!r.limited));$('limitedFields').classList.toggle('hidden',!r.limited);$('recCount').value=r.count||'';$('recMakeEvent').checked=!!r.event;refreshMoneyInputs();scrollTo(0,$('recurringForm').offsetTop-80)}
function cancelRecurringEdit(){recurringEditIndex=-1;recType='normal';recCategory='';['recName','recAmount','recRoute','recCount','recStart','recPayRule','recInterval','recNext','recEnd','recMemo'].forEach(id=>$(id).value='');$('recCycle').value='monthly';$('recFinalSource').value='';updateRecCycleFields();$('recCatBtn').firstElementChild.textContent='選んでください';$('recMakeEvent').checked=false;$('recError').textContent='';$('limitedFields').classList.add('hidden');document.querySelectorAll('#recTypeBtns .mini').forEach((b,j)=>b.classList.toggle('active',j===0));$('mkRecurringModal').classList.add('hidden');$('mkRecurringDelete').classList.add('hidden')}
function mkDeleteRecurring(){if(recurringEditIndex<0)return;if(!confirm('この定期支払いを削除しますか？'))return;recurring.splice(recurringEditIndex,1);cancelRecurringEdit();renderAll()}
function toggleRecurringPause(i){recurring[i].paused=!recurring[i].paused;renderAll()}

function analysisMonthMove(n){const [y,m]=analysisMonth.split('-').map(Number);const d=new Date(y,m-1+n,1);analysisMonth=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');renderBudget()}
function analysisSpend(t){return (['expense','lend','borrowed'].includes(t.type)?mkNetSpend(t):0)+(['expense','repay','receive','transfer'].includes(t.type)?Number(t.fee||0):0)}
function mkFeeOther(t){return ['expense','repay','receive','transfer'].includes(t.type)?Number(t.fee||0):0}
function mkCategorySpend(t,c){return (['expense','lend','borrowed'].includes(t.type)?mkCategoryNet(t,c):0)+(c==='手数料'?mkFeeOther(t):0)}
function analysisRows(month){return txs.filter(t=>typeof t.date==='string'&&t.date.slice(0,7)===month)}
function analysisTotals(month){const a=analysisRows(month);return {expense:a.reduce((s,t)=>s+analysisSpend(t),0),income:a.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount||0),0)}}
function analysisCat(t){return t.type==='transfer'?'その他':t.category||'その他'}
function analysisFixed(t){if(t.costType==='fixed'||t.costType==='variable')return t.costType==='fixed';return /家賃|通信|携帯|保険|サブスク|定期|ジム|医療|病院|薬|Netflix|U-NEXT|Microsoft/i.test(analysisCat(t))}
function analysisBar(label,value,max){return `<div class="analysis-bar-row"><span>${safeHtml(label)}</span><div class="analysis-bar-track"><i style="width:${max?Math.max(0,Math.min(100,value/max*100)):0}%"></i></div><strong>${yen(value)}</strong></div>`}
function mkTrendMonthOffset(month,offset){const [y,m]=month.split('-').map(Number);const d=new Date(y,m-1+offset,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
function mkTrendValue(kind,month,category){const rows=analysisRows(month);return rows.reduce((sum,t)=>{const v=analysisSpend(t);return sum+(kind==='expense'?v:mkCategorySpend(t,category))},0)}
let mkInlineBudgetCategory=null;
function mkBudgetAt(month,category){
  if(category===undefined)return Object.prototype.hasOwnProperty.call(monthlyBudgetHistory,month)?monthlyBudgetHistory[month]:null;
  const record=categoryBudgetHistory[month];
  return record&&Object.prototype.hasOwnProperty.call(record,category)?record[category]:null;
}
function mkBudgetLabel(month,category){
  const budget=mkBudgetAt(month,category);
  return budget===null||budget===undefined?'予算未設定':'予算 '+yen(budget);
}
function mkTrendAmount(n){return n>=10000?'¥'+(n/10000).toFixed(n%10000===0?0:1)+'万':yen(n)}
function openAnalysisTrend(kind,category){const overlay=$('mkTrendOverlay');if(!overlay)return;const anchor=analysisMonth;const title=kind==='expense'?'支出総額':category+' の支出';$('mkTrendTitle').textContent=title+'の推移';const months=Array.from({length:36},(_,i)=>mkTrendMonthOffset(anchor,i-35));const values=months.map(m=>mkTrendValue(kind,m,category));const max=Math.max(1,...values);$('mkTrendChart').innerHTML='<div class="mk-trend-plot">'+months.map((m,i)=>`<button type="button" class="mk-trend-column" title="${m} ${yen(values[i])}" onclick="mkTrendHighlight(this)"><span class="mk-trend-amount">${mkTrendAmount(values[i])}</span><span class="mk-trend-bar" style="height:${Math.max(2,values[i]/max*175)}px"></span><span class="mk-trend-month">${m.slice(2,4)}/${m.slice(5)}</span></button>`).join('')+'</div>';
const dates=txs.map(t=>typeof t.date==='string'&&/^\d{4}-\d{2}/.test(t.date)?t.date.slice(0,7):'').filter(Boolean);const earliest=dates.length?dates.sort()[0]:anchor;let all=[];for(let i=0;i<1200;i++){const m=mkTrendMonthOffset(anchor,-i);if(m<earliest)break;all.push(m)}$('mkTrendHistory').innerHTML=all.map(m=>`<div class="row mk-trend-history-row"><span class="mk-trend-history-meta"><span>${m.replace('-','年')}月</span><small>${mkBudgetLabel(m,kind==='expense'?undefined:category)}</small></span><strong>${yen(mkTrendValue(kind,m,category))}</strong></div>`).join('')||'<div class="small">記録はありません。</div>';overlay.classList.remove('hidden');$('mkTrendChart').scrollLeft=$('mkTrendChart').scrollWidth;}
function mkTrendHighlight(el){el.parentElement.querySelectorAll('.mk-trend-column').forEach(x=>x.classList.remove('selected'));el.classList.add('selected')}
function closeAnalysisTrend(){$('mkTrendOverlay').classList.add('hidden')}
function renderBudget(){
mkPointReviewNotice();
const month=analysisMonth,rows=analysisRows(month),tot=analysisTotals(month);
$('analysisMonthLabel').textContent=month.replace('-','年')+'月';
const b=mkBudgetAt(month);
$('monthBudgetValue').textContent=b===null?'予算未設定':yen(b);
$('monthBudgetValue').classList.toggle('mk-unset',b===null);
$('monthSpend').textContent=yen(tot.expense);
$('monthSpendBudget').textContent=yen(tot.expense);
$('monthRemain').textContent=b===null?'予算未設定':yen(b-tot.expense);
$('monthRemain').classList.toggle('mk-unset',b===null);
$('analysisIncome').textContent=yen(tot.income);
$('analysisNet').textContent=yen(tot.income-tot.expense);
$('analysisNet').classList.toggle('mk-negative',tot.income-tot.expense<0);
$('monthRemain').classList.toggle('mk-negative',b!==null&&b-tot.expense<0);
$('monthBudgetProgress').style.setProperty('width',(b>0?Math.min(100,tot.expense/b*100):0)+'%','important');
const map={};rows.forEach(t=>{if(['expense','lend','borrowed'].includes(t.type))mkCategoryParts(t).forEach(r=>{const v=r.amount-r.points;if(v>0)map[r.category]=(map[r.category]||0)+v});const fee=mkFeeOther(t);if(fee>0)map['手数料']=(map['手数料']||0)+fee});
const names=[...new Set([...cats,...Object.keys(categoryBudgets),...Object.keys(categoryBudgetHistory[month]||{}),...Object.keys(map)])];
$('budgetRows').innerHTML=names.map(c=>{
 const v=map[c]||0,b=mkBudgetAt(month,c),encoded=encodeURIComponent(c);
 const expanded=mkInlineBudgetCategory===c;
 const edit=`<button class="ghost sm mk-category-action" aria-expanded="${expanded}" onclick="editCategoryBudgetDirect(decodeURIComponent('${encoded}'))">${expanded?'閉じる ▲':'編集'}</button>`;
 const trend=`<button class="ghost sm mk-category-action" onclick="openAnalysisTrend('category',decodeURIComponent('${encoded}'))">推移 ›</button>`;
 const bar=b>0?`<div class="progress mk-category-progress"><div style="width:${Math.min(100,v/b*100)}%"></div></div>`:'';
 const budgetText=b===null||b===undefined?'予算未設定':'予算 '+yen(b);
 const remain=b>0?`<span class="${v>b?'mk-over-budget':''}">${v>b?'超過 '+yen(v-b):'残り '+yen(b-v)}</span>`:'';
 return `<div class="mk-category-row"><div class="row mk-category-top"><strong>${safeHtml(c)}</strong><span class="mk-category-spend"><span class="mk-category-muted">支出</span><button type="button" class="mk-category-link" onclick="mkOpenCategoryHistory(decodeURIComponent('${encoded}'))" title="この月の履歴を見る">${yen(v)} ›</button>${trend}</span></div>${bar}<div class="row mk-category-bottom"><span class="mk-category-budget"><span>${budgetText}</span>${edit}</span>${remain}</div>${expanded?`<form class="mk-inline-budget" onsubmit="saveInlineCategoryBudget(event)"><label for="mkInlineBudgetAmount">選択月の予算</label><div class="mk-inline-budget-entry"><div class="mk-inline-budget-field"><span>¥</span><input id="mkInlineBudgetAmount" type="text" inputmode="numeric" autocomplete="off" value="${b===null||b===undefined?'':b}" placeholder="金額を入力"></div><button type="submit" class="primary mk-inline-budget-confirm">決定</button></div><div class="small">0円で未設定に戻します。</div></form>`:''}</div>`;
}).join('')||'<div class="small">カテゴリはまだありません。</div>';
const sum=names.reduce((total,c)=>{const amount=mkBudgetAt(month,c);return total+(Number.isFinite(Number(amount))&&Number(amount)>0?Number(amount):0)},0);
$('mkCategoryBudgetSum').innerHTML=`<span>設定済みカテゴリ予算の合計</span><strong>${yen(sum)}</strong>`;
}
function mkOpenCategoryHistory(c){
 histTab='spend';histType='all';histCat=c;histPay='';histEvent='';histKeyword='';
 histPeriod='custom';histStart=analysisMonth+'-01';
 const end=new Date(Number(analysisMonth.slice(0,4)),Number(analysisMonth.slice(5,7)),0).getDate();
 histEnd=analysisMonth+'-'+String(end).padStart(2,'0');
 if($('histKeyword'))$('histKeyword').value='';
 if($('histStart'))$('histStart').value=histStart;
 if($('histEnd'))$('histEnd').value=histEnd;
 if($('histPeriodBtn'))$('histPeriodBtn').textContent='期間：'+analysisMonth.replace('-','年')+'月';
 if($('histCatBtn'))$('histCatBtn').textContent='カテゴリ：'+c;
 if($('histPayBtn'))$('histPayBtn').textContent='支払方法：すべて';
 if($('histEventBtn'))$('histEventBtn').textContent='特別費：すべて';
 if($('histCustomDates'))$('histCustomDates').classList.remove('hidden');
 histMoreOpen=true;setHistory('spend');
 nav('history',document.querySelectorAll('.nav')[2]);
}
function mkReturnToAnalysis(){if($('mkBackAnalysis'))$('mkBackAnalysis').classList.add('hidden');nav('budget',document.querySelectorAll('.nav')[4]);}
function editCategoryBudgetDirect(c){
 mkInlineBudgetCategory=mkInlineBudgetCategory===c?null:c;
 renderBudget();
 if(mkInlineBudgetCategory){
  const input=$('mkInlineBudgetAmount');
  if(input){initMoneyInputs();formatMoneyElement(input);input.focus({preventScroll:true});requestAnimationFrame(()=>input.scrollIntoView({block:'center',behavior:'instant'}))}
 }
}
function cancelInlineCategoryBudget(){mkInlineBudgetCategory=null;renderBudget()}
function saveInlineCategoryBudget(e){
 e.preventDefault();
 const input=$('mkInlineBudgetAmount');
 const raw=input?input.value.trim():'';
 const normalized=raw.replace(/[¥￥,，\s]/g,'');
 const n=normalized===''?0:Number(normalized);
 if(!/^[0-9]*$/.test(normalized)||!Number.isSafeInteger(n)||n<0){if(input)input.setCustomValidity('0以上の整数を入力してね');if(input)input.reportValidity();return}
 if(!categoryBudgetHistory[analysisMonth])categoryBudgetHistory[analysisMonth]={};
 categoryBudgetHistory[analysisMonth][mkInlineBudgetCategory]=n||null;
 mkInlineBudgetCategory=null;
 if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
 renderAll();
}
function editMonthlyBudget(){const existing=mkBudgetAt(analysisMonth);openMoneyPrompt('選択月の予算',existing===null?monthlyBudget:existing,(n)=>{monthlyBudgetHistory[analysisMonth]=n||null;monthlyBudget=n;renderAll()},{min:0,hint:'選択月だけに保存。0円で未設定に戻します。'})}
function editCategoryBudget(){openPicker('予算を編集するカテゴリ',cats.map(c=>({label:c+(mkBudgetAt(analysisMonth,c)!==null?'（'+yen(mkBudgetAt(analysisMonth,c))+'）':'（未設定）'),value:c})),(c)=>{openMoneyPrompt(c+' の選択月の予算',mkBudgetAt(analysisMonth,c),(n)=>{if(!categoryBudgetHistory[analysisMonth])categoryBudgetHistory[analysisMonth]={};categoryBudgetHistory[analysisMonth][c]=n||null;renderAll()},{min:0,allowBlankAsZero:true,hint:'選択月だけに保存。0円で未設定に戻します。'})})}
function eventUsed(e){return Number(e.baseSpent||0)+txs.filter(t=>t.eventTag===e.name).reduce((s,t)=>s+mkNetSpend(t),0)}
function eventDateText(e){if(e.start&&e.end)return e.start.slice(5).replace('-','/')+'〜'+e.end.slice(5).replace('-','/');if(e.start)return e.start.slice(5).replace('-','/')+'〜';return '期間未設定'}
function mkEventCats(e,records){return [...new Set([...(e.selectedCats||Object.keys(e.catBudgets||{})),...Object.keys(e.catBudgets||{}),...records.flatMap(t=>(t.categorySplits||[{category:t.category}]).map(r=>r.category)).filter(Boolean)])]}
function mkEventRecordsToggle(id){mkEventRecordsOpen[id]=!mkEventRecordsOpen[id];renderEvents()}
function mkEventFilter(id,value){mkEventRecordFilters[id]=value;mkEventRecordsOpen[id]=true;renderEvents()}
function eventCard(e){
 const used=eventUsed(e),remain=e.budget?e.budget-used:null,open=openEventId===e.id,records=txs.filter(t=>t.eventTag===e.name),categories=mkEventCats(e,records),listOpen=!!mkEventRecordsOpen[e.id];
 const available=[...new Set(records.flatMap(t=>(t.categorySplits||[{category:t.category}]).map(r=>r.category)).filter(Boolean))];let filter=mkEventRecordFilters[e.id]||'';if(filter&&!available.includes(filter)){filter='';mkEventRecordFilters[e.id]=''}
 const filtered=filter?records.filter(t=>mkHasCategory(t,filter)):records;
 return `<div class="card ${open?'eventcard':''}" data-event-card="${e.id}"><div class="mk-event-topline"><button class="event-head" onclick="toggleEvent('${e.id}')"><div class="event-summary"><div><div class="item-title">${safeHtml(e.name)}</div><div class="item-meta">${eventDateText(e)}${e.budget?'　使用 '+yen(used)+' / 予算 '+yen(e.budget):'　使用 '+yen(used)}</div></div><span>${open?'▲':'▼'}</span></div></button><button class="outline mk-event-small-action" onclick="editEvent('${e.id}')">編集</button></div>${records.some(mkPointReview)?'<div class="small">要確認の立替があります。該当分は従来の自分の分で暫定集計しています。</div>':''}${open?`<div class="event-detail">${e.budget?`<div class="row"><span>総予算</span><strong>${yen(e.budget)}</strong></div><div class="row"><span>使用済み</span><strong>${yen(used)}</strong></div><div class="progress"><div style="width:${Math.max(0,Math.min(100,used/e.budget*100))}%"></div></div><div class="mk-event-total-remaining ${remain<0?'mk-event-total-over':''}">${remain<0?'超過 '+yen(-remain):'残り '+yen(remain)}</div>`:`<div class="row"><span>使用済み</span><strong>${yen(used)}</strong></div>`}<div class="subhead">カテゴリ別</div>${categories.length?categories.map(c=>{let u=records.reduce((sum,t)=>sum+mkCategoryNet(t,c),0),b=e.catBudgets?.[c],hasBudget=b!==undefined&&b!==null&&b!=='';return `<div class="item"><div class="mk-event-category-summary"><strong class="mk-event-category-name">${safeHtml(c)}</strong><strong class="mk-event-category-spent">${yen(u)}</strong></div><div class="mk-event-category-secondary"><span>${hasBudget?'予算 '+yen(b):'予算未設定'}</span>${hasBudget?(u>Number(b)?`<span class="mk-event-over">超過 ${yen(u-Number(b))}</span>`:`<span>残り ${yen(Number(b)-u)}</span>`):''}</div></div>`}).join(''):'<div class="small">カテゴリ別の記録はまだありません。</div>'}<div class="mk-event-record-head"><button class="mk-event-record-toggle" onclick="mkEventRecordsToggle('${e.id}')">記録一覧（${records.length}件） ${listOpen?'▲':'▼'}</button>${`<select class="mk-event-record-filter" aria-label="カテゴリで絞り込み" onchange="mkEventFilter('${e.id}',this.value)"><option value="">すべて</option>${available.map(c=>`<option value="${safeHtml(c)}" ${filter===c?'selected':''}>${safeHtml(c)}</option>`).join('')}</select>`}</div>${listOpen?(filtered.length?filtered.map(t=>`<div class="item"><div class="history-item-main"><div class="history-item-title">${safeHtml(recordTitle(t))}</div><div class="history-item-amt">${yen(txAmount(t))}</div></div><div class="history-item-sub"><div class="history-item-left"><div class="history-item-meta">${safeHtml([t.date,historyRecordMeta(t)].filter(Boolean).join('・'))}</div>${t.memo?`<div class="history-item-note">${safeHtml(t.memo)}</div>`:''}</div><div class="history-actions"><button class="ghost sm" onclick="editRecord('${t.id}')">編集</button><button class="ghost sm danger" onclick="deleteHistoryRecord('${t.id}')">削除</button></div></div></div>`).join(''):'<div class="small">該当する記録はありません。</div>'):''}<div class="mk-event-bottom-actions"><button class="outline mk-event-small-action" onclick="archiveEvent('${e.id}')">${e.archived?'元に戻す':'アーカイブ'}</button></div>${e.archived?`<button class="outline danger" style="width:100%;margin-top:7px" onclick="deleteEvent('${e.id}')">このイベントを削除</button>`:''}</div>`:''}</div>`
}
function renderEvents(){const ef=$('eventForm');if(ef&&ef.dataset.editId&&!ef.classList.contains('hidden'))$('activeEvents').before(ef);$('activeEvents').innerHTML=eventsData.filter(e=>!e.archived).map(eventCard).join('')||'<div class="small">開催中・予定のイベントはありません。</div>';$('archivedEvents').innerHTML=eventsData.filter(e=>e.archived).map(eventCard).join('')||'<div class="small">まだありません。</div>';renderPastEventNames();mkMountEditingEventForm()}
function toggleEvent(id){openEventId=openEventId===id?'':id;renderEvents()}
function pastEventNameList(){let active=new Set(eventsData.map(e=>e.name));return [...new Set(txs.map(t=>t.eventTag).filter(Boolean))].filter(n=>!active.has(n)).sort((a,b)=>a.localeCompare(b,'ja'))}
function renderPastEventNames(){
 const box=$('pastEventNames');if(!box)return;const q=($('newEventName')?.value||'').trim(),filtered=pastEventNameList().filter(n=>!q||n.includes(q)).slice(0,8);box.replaceChildren();if(!filtered.length)return;
 const label=document.createElement('div');label.className='small';label.style.marginTop='6px';label.textContent='過去に使った特別費名';const list=document.createElement('div');list.className='pastnames';
 for(const name of filtered){const button=document.createElement('button');button.type='button';button.className='pastname';button.textContent=name;button.onclick=()=>usePastEventName(name);list.append(button)}box.append(label,list);
}
function usePastEventName(n){$('newEventName').value=n;renderPastEventNames()}
function mkMountEditingEventForm(){
 const f=$('eventForm');if(!f||f.classList.contains('hidden')||!f.dataset.editId)return;
 const card=document.querySelector(`[data-event-card="${f.dataset.editId}"]`);
 if(card){card.before(f);card.classList.add('hidden')}
}
function toggleEventForm(force){let f=$('eventForm');if(force===false)f.classList.add('hidden');else f.classList.toggle('hidden');if(f.classList.contains('hidden')){resetEventForm();$('activeEvents').before(f);renderEvents()}else renderPastEventNames()}
function mkEventSelectCats(){const box=$('mkEventCatPicker');box.classList.toggle('hidden');renderNewEventCatRows()}
function mkEventCheckCat(cat,checked){if(checked&&!mkEventSelectedCats.includes(cat))mkEventSelectedCats.push(cat);if(!checked){mkEventSelectedCats=mkEventSelectedCats.filter(c=>c!==cat);delete newEventCatBudgets[cat]}renderNewEventCatRows()}
function mkEventSetAmount(cat,value){newEventCatBudgets[cat]=value.trim()===''?null:moneyNum(value)}
function mkEventClear(cat){newEventCatBudgets[cat]=null;let el=document.querySelector(`[data-event-budget="${CSS.escape(cat)}"]`);if(el)el.value=''}
function renderNewEventCatRows(){
 $('mkEventCatPicker').innerHTML=cats.map(c=>`<label class="mk-event-check"><input type="checkbox" ${mkEventSelectedCats.includes(c)?'checked':''} onchange="mkEventCheckCat('${c.replace(/'/g,"\\'")}',this.checked)"><span>${safeHtml(c)}</span></label>`).join('');
 $('newEventCatRows').innerHTML=mkEventSelectedCats.map(c=>`<div class="mk-event-budget-row"><span class="mk-event-budget-label">${safeHtml(c)}</span><div class="mk-event-money-field"><input data-event-budget="${safeHtml(c)}" type="text" inputmode="numeric" placeholder="未設定" value="${newEventCatBudgets[c]===null||newEventCatBudgets[c]===undefined?'':'¥'+moneyFormatted(newEventCatBudgets[c])}" oninput="mkEventSetAmount('${c.replace(/'/g,"\'")}',this.value)"></div><button class="ghost sm" type="button" onclick="mkEventClear('${c.replace(/'/g,"\\'")}')">クリア</button></div>`).join('');
 document.querySelectorAll('#newEventCatRows input').forEach(input=>{input.addEventListener('input',()=>{if(input.value){const digits=moneyFormatted(input.value);input.value=digits?'¥'+digits:''}})});
 $('mkEventCatCount').querySelector('span').textContent=`カテゴリ選択（${mkEventSelectedCats.length}件）`; $('mkEventCatCount').querySelector('span:last-child').textContent=$('mkEventCatPicker').classList.contains('hidden')?'▼':'▲';
}
function saveEvent(){
 let name=$('newEventName').value.trim(),budget=moneyNum($('newEventBudget').value);$('eventError').textContent='';if(!name){$('eventError').textContent='イベント名を入れてね';return}
 if(eventsData.some(e=>e.name===name&&e.id!==$('eventForm').dataset.editId)){$('eventError').textContent='同じ名前のイベントがあります';return}
 const catBudgets={};for(const c of mkEventSelectedCats){let val=newEventCatBudgets[c];if(val!==null&&val!==undefined&&val!=='')catBudgets[c]=Number(val)}
 let id=$('eventForm').dataset.editId;
 if(id){let e=eventsData.find(x=>x.id===id),oldName=e.name;Object.assign(e,{name,start:$('newEventStart').value,end:$('newEventEnd').value,budget,catBudgets,selectedCats:[...mkEventSelectedCats]});if(oldName!==name&&confirm('このイベント名に紐づいている支出記録も「'+name+'」へ変更しますか？'))txs.forEach(t=>{if(t.eventTag===oldName)t.eventTag=name})}
 else{let pastCount=txs.filter(t=>t.eventTag===name).length;if(pastCount&&!confirm('「'+name+'」に紐づく過去の支出が '+pastCount+'件あります。\n新しいイベントに再び表示しますか？')){let newName=prompt('過去記録とは分けるため、別のイベント名を入力してください。',name+' 2');if(!newName)return;name=newName.trim();if(!name)return}eventsData.unshift({id:'ev'+Date.now(),name,start:$('newEventStart').value,end:$('newEventEnd').value,budget,catBudgets,selectedCats:[...mkEventSelectedCats],archived:false,baseSpent:0});deletedEventNames=deletedEventNames.filter(n=>n!==name);openEventId=eventsData[0].id}
 toggleEventForm(false);renderAll()
}
function editEvent(id){let e=eventsData.find(x=>x.id===id);$('eventForm').dataset.editId=id;$('eventFormTitle').textContent='特別費イベントを編集';$('mkEventSaveBtn').textContent='変更を保存';$('newEventName').value=e.name;$('newEventStart').value=e.start||'';$('newEventEnd').value=e.end||'';$('newEventBudget').value=e.budget||'';newEventCatBudgets={...(e.catBudgets||{})};mkEventSelectedCats=[...new Set([...(e.selectedCats||[]),...Object.keys(e.catBudgets||{})])];$('mkEventCatPicker').classList.add('hidden');renderNewEventCatRows();$('eventForm').classList.remove('hidden');mkMountEditingEventForm();refreshMoneyInputs();renderPastEventNames();requestAnimationFrame(()=>window.scrollTo({top:Math.max(0,$('eventForm').getBoundingClientRect().top+window.scrollY-80),behavior:'smooth'}))}
function resetEventForm(){$('eventForm').dataset.editId='';$('eventFormTitle').textContent='特別費イベントを追加';$('mkEventSaveBtn').textContent='作成';['newEventName','newEventStart','newEventEnd','newEventBudget'].forEach(id=>$(id).value='');newEventCatBudgets={};mkEventSelectedCats=[];$('mkEventCatPicker').classList.add('hidden');renderNewEventCatRows();$('eventError').textContent='';renderPastEventNames()}
function archiveEvent(id){let e=eventsData.find(x=>x.id===id);e.archived=!e.archived;if(e.archived&&openEventId===id)openEventId='';renderAll()}
function deleteEvent(id){let e=eventsData.find(x=>x.id===id);if(!e||!e.archived)return;let linked=txs.filter(t=>t.eventTag===e.name).length;if(!confirm('「'+e.name+'」を削除しますか？\n\nイベントの予算・期間などの設定は消えます。'+(linked?'\n紐づく支出記録 '+linked+'件は削除せず、特別費名を記録側に残します。':'')+'\n必要なら同じ名前でイベントを作り直して復活できます。'))return;if(linked){if(!deletedEventNames.includes(e.name))deletedEventNames.push(e.name)}else{deletedEventNames=deletedEventNames.filter(n=>n!==e.name)}delete mkEventFixed[id];try{localStorage.setItem('mk-event-fixed-59',JSON.stringify(mkEventFixed))}catch(_){}eventsData=eventsData.filter(x=>x.id!==id);recurring.forEach(r=>{if(r.event===e.name)r.event=''});if(openEventId===id)openEventId='';renderAll()}
let editingWishIndex=-1;
function openWishModal(){
 $('wishModal').classList.remove('hidden');
 initMoneyInputs();
 refreshMoneyInputs();
}
function toggleWishForm(){
 editingWishIndex=-1;
 $('wishName').value='';$('wishPrice').value='';$('wishMemo').value='';
 $('wishFormTitle').textContent='ほしいものを追加';
 $('wishSaveButton').textContent='リストに追加';
 $('wishDeleteButton').classList.add('hidden');
 openWishModal();
}
function cancelWishEdit(){
 $('wishModal').classList.add('hidden');
 editingWishIndex=-1;
 $('wishName').value='';$('wishPrice').value='';$('wishMemo').value='';
}
function addWish(){
 const n=$('wishName').value.trim(),p=moneyNum($('wishPrice').value),memo=$('wishMemo').value.trim();
 if(!n||p<=0){alert('名前と価格を入力してね');return}
 const wish={name:n,price:p,memo};
 if(editingWishIndex>=0&&editingWishIndex<wishes.length)wishes[editingWishIndex]=wish;
 else wishes.unshift(wish);
 cancelWishEdit();renderAll();
}
function editWish(i){
 const w=wishes[i];if(!w)return;
 editingWishIndex=i;
 $('wishName').value=w.name||'';
 $('wishPrice').value=String(w.price||'');
 $('wishMemo').value=w.memo||'';
 $('wishFormTitle').textContent='ほしいものを編集';
 $('wishSaveButton').textContent='保存';
 $('wishDeleteButton').classList.remove('hidden');
 openWishModal();
 formatMoneyElement($('wishPrice'));
}
function deleteEditingWish(){if(editingWishIndex>=0)deleteWish(editingWishIndex)}
function deleteWish(i){
 if(!wishes[i]||!confirm('このほしいものを削除しますか？'))return;
 wishes.splice(i,1);cancelWishEdit();renderAll();
}
function renderWish(){
 if(!$('wishShortcut')||!$('wishList'))return;
 $('wishShortcut').textContent='リストに'+wishes.length+'件登録中';
 $('wishList').innerHTML=wishes.length?wishes.map((w,i)=>`<button type="button" class="mk-wish-row" onclick="editWish(${i})" aria-label="${safeHtml(w.name||'')}を編集"><span class="mk-wish-info"><span class="mk-wish-name">${safeHtml(w.name||'')}</span>${w.memo?`<span class="mk-wish-memo">${safeHtml(w.memo)}</span>`:''}</span><span class="mk-wish-price">${yen(Number(w.price)||0)}</span><span class="mk-wish-chevron" aria-hidden="true">›</span></button>`).join(''):'<div class="small mk-wish-empty">まだ登録されていません。「＋追加」から登録できます。</div>';
}

function renderRecent(){
 let items=txs.filter(t=>!isLoanExtra(t)&&t.type!=='loanAdjustment');
 $('recent').innerHTML=items.length?items.slice(0,6).map(t=>`<div class="item mk-recent-item"><div class="mk-recent-heading"><div class="item-title">${safeHtml(recordTitle(t))}</div><strong>${yen(txAmount(t))}</strong></div><div class="mk-recent-detail"><button class="ghost sm mk-recent-edit" onclick="editRecord('${t.id}')">編集</button><div class="item-meta">${safeHtml(t.date)}${recordMeta(t)?'・'+safeHtml(recordMeta(t)):''}</div></div></div>`).join(''):'<div class="small">まだ記録はありません。</div>';
}
function renderAll(){mkRenderEventSuggestion();renderTodos();renderBalances();renderRecent();renderHistory();renderLoans();renderPersonCandidates();renderDue();renderRecurring();renderBudget();renderEvents();renderWish();initMoneyInputs();refreshMoneyInputs();mkQueueSave()}

// Only persisted business data; temporary form/navigation state stays ephemeral.
// #79 Memo vocabulary management. No record-entry integration in this version.
let mkMemoData={groups:[],words:[]};
let mkMemoView='words',mkMemoScope='',mkMemoEdit=null,mkMemoDuplicate='',mkMemoDrag=null;
function mkMemoValidate(data){
 if(!data||!Array.isArray(data.groups)||!Array.isArray(data.words))throw Error('メモリストの形式が正しくありません。');
 const ids=new Set(),names=new Set();
 for(const g of data.groups){if(!g||typeof g.id!=='string'||!g.id||ids.has(g.id)||typeof g.name!=='string'||!g.name.trim()||names.has(g.name.trim()))throw Error('メモの分類が正しくありません。');ids.add(g.id);names.add(g.name.trim())}
 const wid=new Set(),wn=new Set();
 for(const w of data.words){if(!w||typeof w.id!=='string'||!w.id||wid.has(w.id)||typeof w.text!=='string'||!w.text.trim()||wn.has(w.text.trim())||!ids.has(w.group)||!Array.isArray(w.cats)||w.cats.some(c=>typeof c!=='string'))throw Error('メモの言葉が正しくありません。');wid.add(w.id);wn.add(w.text.trim())}
 return data;
}
function mkMemoId(){return 'memo-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)}
let mkMemoOrigin='other';
function mkMemoHistory(replace=false){const state={mkPage:'memoManager',memo:{view:mkMemoView,scope:mkMemoScope,modal:!!mkMemoEdit,origin:mkMemoOrigin}};history[replace?'replaceState':'pushState'](state,'',location.href)}
function mkMemoOpen(origin='other'){mkMemoOrigin=origin;mkMemoScope='';mkMemoView='words';mkMemoRender();openOther('memoManager');mkMemoHistory(true)}
function mkMemoTab(view){if(view===mkMemoView&&!mkMemoScope)return;if(view==='words'){if(mkMemoView!=='words')history.go(mkMemoScope?-2:-1);return}const replace=mkMemoView!=='words'&&!mkMemoScope;mkMemoView=view;mkMemoScope='';mkMemoRender();mkMemoHistory(replace)}
function mkMemoEnter(index){mkMemoScope=mkMemoView==='groups'?mkMemoData.groups[index].id:cats[index];mkMemoRender();mkMemoHistory()}
function mkMemoRows(){return mkMemoScope?mkMemoData.words.filter(w=>mkMemoView==='groups'?w.group===mkMemoScope:w.cats.includes(mkMemoScope)):mkMemoView==='words'?[...mkMemoData.words]:[...mkMemoData.groups]}
function mkMemoPersist(){mkQueueSave();mkMemoRender();mkCandidateRender()}
function mkMemoScrollStrip(texts,className){
 const strip=document.createElement('div');strip.className='mk-memo-strip '+className;
 strip.setAttribute('aria-label',className==='mk-memo-category-strip'?'関連カテゴリ':'登録済みの言葉');strip.tabIndex=0;
 texts.forEach(text=>{const tag=document.createElement('span');tag.className='mk-memo-tag';tag.textContent=text;strip.append(tag)});
 const update=()=>{strip.classList.toggle('has-more',strip.scrollWidth-strip.clientWidth-strip.scrollLeft>2);strip.classList.toggle('has-before',strip.scrollLeft>2)};
 strip.addEventListener('scroll',update,{passive:true});requestAnimationFrame(update);return strip;
}
window.addEventListener('resize',()=>document.querySelectorAll('#mkMemoRows .mk-memo-strip').forEach(s=>s.dispatchEvent(new Event('scroll'))));
function mkMemoRender(){
 if(!$('mkMemoRows'))return;
 const scoped=!!mkMemoScope,wordRows=scoped||mkMemoView==='words',group=mkMemoData.groups.find(g=>g.id===mkMemoScope),allWords=!scoped&&mkMemoView==='words';
 $('mkMemoHeading').textContent=scoped?(mkMemoView==='groups'?'分類：'+(group?.name||''):'カテゴリ：'+mkMemoScope):'🎀 メモ';
 $('mkMemoTabs').hidden=scoped;
 $('mkMemoBack').textContent=scoped?'← 一覧へ':mkMemoView==='words'?(mkMemoOrigin==='record'?'← 記録へ':'← その他へ'):'← 言葉一覧へ';
 $('mkMemoAdd').hidden=!scoped&&mkMemoView==='cats';$('mkMemoAdd').textContent='＋追加';
 $('mkMemoListLabel').textContent=wordRows?'言葉':mkMemoView==='groups'?'分類':'カテゴリ';
 document.querySelectorAll('#mkMemoTabs button').forEach(b=>b.classList.toggle('active',b.dataset.view===mkMemoView));
 const rows=$('mkMemoRows');rows.innerHTML='';
 const list=!scoped&&mkMemoView==='cats'?cats:mkMemoRows();
 const appendRow=(item,i)=>{
  const catRow=!scoped&&mkMemoView==='cats',row=document.createElement('div');row.className='mk-memo-row'+(catRow?' mk-memo-category-row':'')+(wordRows?' mk-memo-word-row':'');row.dataset.id=catRow?String(i):item.id;
  const main=document.createElement(wordRows?'div':'button');main.className='mk-memo-name';
  const title=document.createElement('span');title.className='mk-memo-word';title.textContent=catRow?item:wordRows?item.text:item.name;main.append(title);
  if(!wordRows){main.type='button';main.onclick=()=>mkMemoEnter(i);const arrow=document.createElement('span');arrow.textContent='›';arrow.className='mk-memo-arrow';main.append(arrow)}else{
   const groupName=mkMemoData.groups.find(g=>g.id===item.group)?.name||'';
   if(mkMemoView==='cats'){const meta=document.createElement('span');meta.className='mk-memo-meta';meta.textContent=groupName;main.append(meta)}
   else if(item.cats.length)main.append(mkMemoScrollStrip(item.cats,'mk-memo-category-strip'));
   main.title=[item.text,groupName,...item.cats].join(' / ');
  }
  row.append(main);
  if(catRow){const words=mkMemoData.groups.flatMap(g=>mkMemoData.words.filter(w=>w.group===g.id&&w.cats.includes(item))).map(w=>w.text);if(words.length)row.append(mkMemoScrollStrip(words,'mk-memo-preview'));else{const empty=document.createElement('span');empty.className='mk-memo-preview-empty';empty.textContent='登録なし';row.append(empty)}}
  else{const actions=document.createElement('div');actions.className='history-actions';for(const [label,del] of(wordRows?[['編集',false]]:[['編集',false],['削除',true]])){const b=document.createElement('button');b.type='button';b.className='ghost sm'+(del?' danger':'');b.textContent=label;b.onclick=()=>del?mkMemoDelete('group',item.id):mkMemoForm(wordRows?'word':'group',item.id);actions.append(b)}row.append(actions)}
  if(!catRow&&!allWords){const handle=document.createElement('button');handle.type='button';handle.className='mk-memo-grip';handle.textContent='⠿';handle.setAttribute('aria-label','長押しで並べ替え。上下キーでも移動');handle.addEventListener('pointerdown',e=>mkMemoDragStart(e,row));handle.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();mkMemoReorder(i,i+(e.key==='ArrowUp'?-1:1))}});row.append(handle)}
  rows.append(row);
 };
 if(allWords){mkMemoData.groups.forEach(g=>{const words=list.filter(w=>w.group===g.id);if(!words.length)return;const heading=document.createElement('div');heading.className='mk-memo-section-title';heading.textContent=g.name;rows.append(heading);words.forEach(appendRow)})}else list.forEach(appendRow);
 if(!list.length)rows.innerHTML='<div class="small mk-memo-empty">'+(wordRows?'言葉はまだありません。〔＋追加〕から登録できます。':'分類はまだありません。〔＋追加〕から登録してください。')+'</div>';
 $('mkMemoHint').textContent=list.length&&!allWords&&!(mkMemoView==='cats'&&!scoped)?'右のつまみを長押しして並べ替え':'';
}

function mkMemoBack(){history.back()}
function mkMemoForm(kind,id='',defaults=null){
 const item=(kind==='group'?mkMemoData.groups:mkMemoData.words).find(x=>x.id===id);
 const alreadyOpen=!!mkMemoEdit;mkMemoEdit={kind,id};mkMemoDuplicate='';
 $('mkMemoModal').classList.toggle('mk-memo-group-form',kind==='group');$('mkMemoDeleteWord').hidden=kind!=='word'||!id;
 $('mkMemoCategories').closest('details').open=false;
 $('mkMemoFormTitle').textContent=(kind==='group'?'分類':'言葉')+'を'+(id?'編集':'追加');
 $('mkMemoTextLabel').textContent=kind==='group'?'分類名':'言葉';
 $('mkMemoText').value=item?(kind==='group'?item.name:item.text):'';
 $('mkMemoWordFields').hidden=kind==='group';$('mkMemoNext').hidden=kind==='group'||!!id;
 $('mkMemoFeedback').textContent='';$('mkMemoDuplicateActions').hidden=true;
 const chosen=item?.group||defaults?.group||(mkMemoView==='groups'&&mkMemoScope?mkMemoScope:'');
 $('mkMemoGroup').innerHTML='<option value="">分類を選択</option>'+mkMemoData.groups.map(g=>`<option value="${safeHtml(g.id)}">${safeHtml(g.name)}</option>`).join('');$('mkMemoGroup').value=chosen;
 const selected=item?.cats||defaults?.cats||(mkMemoView==='cats'&&mkMemoScope?[mkMemoScope]:[]);
 $('mkMemoCategories').innerHTML=cats.map((c,i)=>`<label class="mk-memo-cat"><input type="checkbox" value="${i}" ${selected.includes(c)?'checked':''}><span>${safeHtml(c)}</span></label>`).join('');
 $('mkMemoInlineGroup').value='';mkMemoToggleInlineGroup(false);
 $('mkMemoModal').classList.remove('hidden');document.body.classList.add('mk-memo-modal-open');mkMemoViewport();if(!alreadyOpen)mkMemoHistory();
}
function mkMemoClose(){mkMemoHide();if(history.state?.memo?.modal)history.back()}
function mkMemoHide(){$('mkMemoModal').classList.add('hidden');document.body.classList.remove('mk-memo-modal-open');mkMemoEdit=null;document.activeElement?.blur()}
function mkMemoDeleteEditing(){if(!mkMemoEdit?.id)return;const id=mkMemoEdit.id;mkMemoDelete('word',id);if(!mkMemoData.words.some(w=>w.id===id))mkMemoClose()}
function mkMemoViewport(){const m=$('mkMemoModal');if(!m||m.classList.contains('hidden'))return;const v=window.visualViewport;m.style.top=(v?.offsetTop||0)+'px';m.style.height=(v?.height||innerHeight)+'px'}
window.visualViewport?.addEventListener('resize',mkMemoViewport);window.visualViewport?.addEventListener('scroll',mkMemoViewport);window.addEventListener('resize',mkMemoViewport);
function mkMemoToggleInlineGroup(open){const box=$('mkMemoInlineGroupBox'),button=$('mkMemoInlineGroupToggle');const show=typeof open==='boolean'?open:box.hidden;box.hidden=!show;button.textContent=show?'閉じる':'＋追加';button.setAttribute('aria-expanded',String(show));if(show)$('mkMemoInlineGroup').focus()}
function mkMemoNewGroupInline(){const name=$('mkMemoInlineGroup').value.trim();if(!name){$('mkMemoFeedback').textContent='分類名を入力してください。';return}let g=mkMemoData.groups.find(x=>x.name.trim()===name);if(!g){g={id:mkMemoId(),name};mkMemoData.groups.push(g);mkMemoPersist()}const opt=document.createElement('option');opt.value=g.id;opt.textContent=g.name;if(![...$('mkMemoGroup').options].some(o=>o.value===g.id))$('mkMemoGroup').append(opt);$('mkMemoGroup').value=g.id;mkMemoToggleInlineGroup(false);$('mkMemoInlineGroup').value='';$('mkMemoInlineGroupToggle').focus();$('mkMemoFeedback').textContent=''}
function mkMemoSave(next=false){
 if(!mkMemoEdit)return;const text=$('mkMemoText').value.trim(),{kind,id}=mkMemoEdit;
 $('mkMemoFeedback').textContent='';$('mkMemoDuplicateActions').hidden=true;mkMemoDuplicate='';
 if(!text){$('mkMemoFeedback').textContent=(kind==='group'?'分類名':'言葉')+'を入力してください。';return}
 const list=kind==='group'?mkMemoData.groups:mkMemoData.words,dupe=list.find(x=>x.id!==id&&(kind==='group'?x.name:x.text).trim()===text);
 if(dupe){$('mkMemoFeedback').textContent='「'+text+'」は登録済みです。'+(kind==='word'?' 分類：'+mkMemoData.groups.find(g=>g.id===dupe.group)?.name:'');if(kind==='word'){mkMemoDuplicate=dupe.id;$('mkMemoDuplicateActions').hidden=false;const cat=mkMemoView==='cats'?mkMemoScope:'';$('mkMemoLinkDuplicate').hidden=!cat;$('mkMemoLinkDuplicate').disabled=dupe.cats.includes(cat);$('mkMemoLinkDuplicate').textContent=dupe.cats.includes(cat)?'このカテゴリには関連づけ済みです':'このカテゴリを関連づける'}return}
 const group=$('mkMemoGroup').value,links=[...document.querySelectorAll('#mkMemoCategories input:checked')].map(x=>cats[Number(x.value)]);
 if(kind==='word'&&!mkMemoData.groups.some(g=>g.id===group)){$('mkMemoFeedback').textContent='分類を選択または追加してください。';return}
 const value=kind==='group'?{id:id||mkMemoId(),name:text}:{id:id||mkMemoId(),text,group,cats:links};const index=list.findIndex(x=>x.id===id);if(index<0)list.push(value);else list[index]=value;
 mkMemoPersist();if(next){mkMemoForm('word','',{group,cats:links});$('mkMemoFeedback').textContent='保存しました。続けて登録できます。';$('mkMemoText').focus()}else mkMemoClose();
}
function mkMemoEditDuplicate(){if(mkMemoDuplicate)mkMemoForm('word',mkMemoDuplicate)}
function mkMemoLinkDuplicate(){const w=mkMemoData.words.find(x=>x.id===mkMemoDuplicate);if(!w||mkMemoView!=='cats'||!mkMemoScope)return;if(!w.cats.includes(mkMemoScope))w.cats.push(mkMemoScope);mkMemoPersist();mkMemoClose()}
function mkMemoDelete(kind,id){const list=kind==='group'?mkMemoData.groups:mkMemoData.words,item=list.find(x=>x.id===id);if(!item)return;const count=mkMemoData.words.filter(w=>w.group===id).length;if(!confirm(kind==='group'?'分類「'+item.name+'」を削除しますか？'+(count?'\n中の言葉 '+count+'件も削除されます。':''):'「'+item.text+'」をリストから削除しますか？'))return;
 if(kind==='group'){mkMemoData.groups=mkMemoData.groups.filter(g=>g.id!==id);mkMemoData.words=mkMemoData.words.filter(w=>w.group!==id)}else mkMemoData.words=mkMemoData.words.filter(w=>w.id!==id);mkMemoPersist()
}
// Reorder only the visible subset, retaining positions of words in other groups.
function mkMemoReorder(from,to){if(!mkMemoScope&&mkMemoView==='words')return;const visible=mkMemoRows();if(to<0||to>=visible.length||from===to)return;const ids=new Set(visible.map(x=>x.id));visible.splice(to,0,visible.splice(from,1)[0]);if(!mkMemoScope&&mkMemoView==='groups')mkMemoData.groups=visible;else {let i=0;mkMemoData.words=mkMemoData.words.map(w=>ids.has(w.id)?visible[i++]:w)}mkMemoPersist()}
function mkMemoDragStart(e,row){
 if(e.button!==0||mkMemoDrag)return;e.preventDefault();
 const grip=$('mkMemoRows');grip.setPointerCapture(e.pointerId);
 const d={row,grip,id:e.pointerId,x:e.clientX,y:e.clientY,lastY:e.clientY,active:false,ghost:null,raf:0};mkMemoDrag=d;
 d.timer=setTimeout(()=>{d.active=true;const r=row.getBoundingClientRect();d.offset=d.y-r.top;d.ghost=row.cloneNode(true);d.ghost.classList.add('mk-memo-floating');Object.assign(d.ghost.style,{width:r.width+'px',left:r.left+'px',top:r.top+'px'});document.body.append(d.ghost);row.classList.add('mk-memo-placeholder');d.raf=requestAnimationFrame(mkMemoDragFrame)},330);
 grip.addEventListener('pointermove',mkMemoDragMove);grip.addEventListener('pointerup',mkMemoDragEnd);grip.addEventListener('pointercancel',mkMemoDragCancel);grip.addEventListener('lostpointercapture',mkMemoDragCancel);
}
function mkMemoDragMove(e){const d=mkMemoDrag;if(!d)return;d.lastY=e.clientY;if(!d.active&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>10)mkMemoDragCancel()}
function mkMemoDragFrame(){const d=mkMemoDrag;if(!d?.active)return;d.ghost.style.top=(d.lastY-d.offset)+'px';const bottom=document.querySelector('.bottom').getBoundingClientRect().top;if(d.lastY<95)window.scrollBy(0,-7);else if(d.lastY>bottom-45)window.scrollBy(0,7);
 const siblings=[...$('mkMemoRows').children],before=new Map(siblings.map(x=>[x,x.getBoundingClientRect().top]));
 const target=siblings.find(x=>x!==d.row&&d.lastY<x.getBoundingClientRect().top+x.offsetHeight/2);
 if(target)$('mkMemoRows').insertBefore(d.row,target);else $('mkMemoRows').append(d.row);
 for(const el of siblings){if(el===d.row)continue;const delta=before.get(el)-el.getBoundingClientRect().top;if(delta)el.animate([{transform:`translateY(${delta}px)`},{transform:'translateY(0)'}],{duration:160,easing:'ease-out'})}
 d.raf=requestAnimationFrame(mkMemoDragFrame);
}
function mkMemoDragEnd(){mkMemoDragFinish(true)}function mkMemoDragCancel(){mkMemoDragFinish(false)}
function mkMemoDragFinish(save){const d=mkMemoDrag;if(!d)return;mkMemoDrag=null;clearTimeout(d.timer);cancelAnimationFrame(d.raf);d.grip.removeEventListener('pointermove',mkMemoDragMove);d.grip.removeEventListener('pointerup',mkMemoDragEnd);d.grip.removeEventListener('pointercancel',mkMemoDragCancel);d.grip.removeEventListener('lostpointercapture',mkMemoDragCancel);d.ghost?.remove();d.row.classList.remove('mk-memo-placeholder');if(d.grip.hasPointerCapture(d.id))d.grip.releasePointerCapture(d.id);
 if(d.active&&save){const visible=mkMemoRows(),from=visible.findIndex(x=>x.id===d.row.dataset.id),to=[...$('mkMemoRows').children].indexOf(d.row);mkMemoReorder(from,to)}mkMemoRender();
}

// #85 Clear only the memo draft, with a one-step undo.
let mkMemoUndo=null;
function mkMemoClearPaint(){const b=$('mkMemoClear');b.textContent=mkMemoUndo?'元に戻す':'クリア';b.disabled=!mkMemoUndo&&!$('memo').value}
function mkMemoShowEnd(){requestAnimationFrame(()=>{$('memo').scrollLeft=$('memo').scrollWidth})}
function mkMemoClear(){
 const memo=$('memo');mkCandidateSync();mkSyncEventMemoParts();
 if(mkMemoUndo){
  const saved=mkMemoUndo;mkMemoUndo=null;memo.value=saved.value;
  mkCandidateParts.clear();saved.words.forEach(([id,p])=>mkCandidateParts.set(id,{...p}));
  mkEventMemoParts.clear();saved.events.forEach(([id,p])=>mkEventMemoParts.set(id,{...p}));
  mkCandidatePrevious=memo.value;mkEventMemoPrevious=memo.value;
  requestAnimationFrame(()=>{memo.scrollLeft=saved.scroll});
 }else if(memo.value){
  mkMemoUndo={value:memo.value,scroll:memo.scrollLeft,words:[...mkCandidateParts].map(([id,p])=>[id,{...p}]),events:[...mkEventMemoParts].map(([id,p])=>[id,{...p}])};
  memo.value='';mkCandidateParts.clear();mkEventMemoParts.clear();mkCandidatePrevious='';mkEventMemoPrevious='';
 }
 mkCandidateBefore=null;mkCandidatePaint();mkRenderEventSuggestion();mkMemoClearPaint();
}

// #83 Inline memo vocabulary picker. Ownership is local to the current draft.
let mkCandidateOpen=false,mkCandidateTab='',mkCandidateCategory='',mkCandidatePrevious='',mkCandidateBefore=null,mkCandidateGesture=null,mkCandidateIgnoreClick=0;
const mkCandidateParts=new Map();
function mkCandidateCurrentCategory(){return mode==='expense'||(mode==='loan'&&['lend','borrowed'].includes(loanKind))||(mode==='group'&&mkGroupKind==='bill')?category:''}
function mkCandidateCategories(){return mkSplitEnabled()&&mkSplitDraft.length?mkSplitDraft.map(r=>r.category).filter(Boolean):[mkCandidateCurrentCategory()].filter(Boolean)}
function mkCandidateTabs(){const cs=mkCandidateCategories(),related=mkMemoData.words.some(w=>cs.some(c=>w.cats.includes(c)));return [...(related?[{id:'__related',name:'関連'}]:[]),...mkMemoData.groups,{id:'__events',name:'特別費'}]}
function mkCandidateWords(){if(mkCandidateTab==='__events')return eventsData.filter(e=>!e.archived).map(e=>({id:e.id,text:e.name,event:true}));if(mkCandidateTab==='__related'){const cs=mkCandidateCategories();return mkMemoData.groups.flatMap(g=>mkMemoData.words.filter(w=>w.group===g.id&&cs.some(c=>w.cats.includes(c))))}return mkMemoData.words.filter(w=>w.group===mkCandidateTab)}
function mkCandidateToggle(){mkCandidateOpen=!mkCandidateOpen;if(mkCandidateOpen){$('memo').blur();mkCandidateTab='';mkCandidateSync()}mkCandidateRender()}
function mkCandidateRender(){
 const toggle=$('mkCandidateToggle');if(!toggle)return;$('mkCandidateManage').hidden=!mkCandidateOpen;
 toggle.textContent=mkCandidateOpen?'候補を閉じる −':'候補から選ぶ ＋';toggle.setAttribute('aria-expanded',String(mkCandidateOpen));$('mkCandidatePanel').hidden=!mkCandidateOpen;
 if(!mkCandidateOpen)return;
 const tabs=mkCandidateTabs(),c=mkCandidateCategories().join('|');if(c!==mkCandidateCategory||!tabs.some(t=>t.id===mkCandidateTab)){mkCandidateTab=tabs[0]?.id||'';mkCandidateCategory=c}
 const tabBox=$('mkCandidateTabs');tabBox.innerHTML='';
 tabs.forEach((t,i)=>{const b=document.createElement('button');b.type='button';b.className='mk-candidate-tab';b.id='mkCandidateTab'+i;b.textContent=t.name;b.dataset.tab=t.id;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(t.id===mkCandidateTab));b.setAttribute('aria-controls','mkCandidateWords');b.tabIndex=t.id===mkCandidateTab?0:-1;b.onclick=()=>mkCandidateChooseTab(t.id);b.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();let n=e.key==='Home'?0:e.key==='End'?tabs.length-1:Math.max(0,Math.min(tabs.length-1,i+(e.key==='ArrowRight'?1:-1)));mkCandidateChooseTab(tabs[n].id);$('mkCandidateTabs').children[n].focus({preventScroll:true})}};tabBox.append(b)});
 const list=$('mkCandidateWords');list.innerHTML='';const activeIndex=tabs.findIndex(t=>t.id===mkCandidateTab);if(activeIndex>=0)list.setAttribute('aria-labelledby','mkCandidateTab'+activeIndex);else list.removeAttribute('aria-labelledby');
 const words=mkCandidateWords();words.forEach(w=>{const b=document.createElement('button');b.type='button';b.className='mk-candidate-word';b.textContent=w.text;b.dataset.word=w.id;if(w.event)b.dataset.event='true';b.setAttribute('aria-pressed',String((w.event?mkEventMemoParts:mkCandidateParts).has(w.id)));b.onclick=()=>{if(performance.now()>=mkCandidateIgnoreClick){if(w.event)mkToggleEventMemo(w.id,true,true);else mkCandidateToggleWord(w.id)}};list.append(b)});
 if(!words.length){const empty=document.createElement('div');empty.className='mk-candidate-empty';empty.textContent=mkCandidateTab==='__events'?'表示できる特別費イベントがありません。':mkMemoData.words.length?'この分類には言葉がありません。':'「その他 → メモ」で言葉を登録できます。';list.append(empty)}
 requestAnimationFrame(()=>{const b=tabBox.querySelector('[aria-selected="true"]');if(b){const left=b.offsetLeft-tabBox.offsetLeft;if(left<tabBox.scrollLeft)tabBox.scrollLeft=left;else if(left+b.offsetWidth>tabBox.scrollLeft+tabBox.clientWidth)tabBox.scrollLeft=left+b.offsetWidth-tabBox.clientWidth}});
}
function mkCandidateChooseTab(id){if(id===mkCandidateTab)return;mkCandidateTab=id;mkCandidateRender();$('mkCandidateWords').scrollTop=0}
function mkCandidatePaint(){document.querySelectorAll('#mkCandidateWords [data-word]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.event?mkEventMemoParts:mkCandidateParts).has(b.dataset.word))))}
function mkCandidateMoveParts(parts,start,end,replacement,value){
 const delta=replacement.length-(end-start);
 for(const [id,p] of parts){if(p.start<0)continue;if(p.end<=start)continue;if(p.start>=end){p.start+=delta;p.end+=delta;continue}
  // Preserve an event marker if only its generated leading space was removed.
  if(!replacement&&p.text.startsWith(' ')&&start<=p.start&&end===p.start+1){p.start=start;p.end+=delta;p.text=p.text.slice(1);continue}
  parts.delete(id);
 }
 for(const [id,p] of parts)if(p.start>=0&&value.slice(p.start,p.end)!==p.text)parts.delete(id);
}
function mkCandidateSync(){
 const value=$('memo').value,old=mkCandidatePrevious;if(value===old){mkCandidateBefore=null;return}
 let start=0;while(start<old.length&&start<value.length&&old[start]===value[start])start++;
 let end=old.length,newEnd=value.length;while(end>start&&newEnd>start&&old[end-1]===value[newEnd-1]){end--;newEnd--}
 const before=mkCandidateBefore;mkCandidateBefore=null;
 if(before?.value===old&&before.end>before.start){const length=value.length-(old.length-(before.end-before.start));if(length>=0&&value.slice(0,before.start)===old.slice(0,before.start)&&value.slice(before.start+length)===old.slice(before.end)){start=before.start;end=before.end;newEnd=start+length}}
 mkCandidateMoveParts(mkCandidateParts,start,end,value.slice(start,newEnd),value);mkCandidatePrevious=value;
}
function mkCandidateReplace(start,end,text){
 mkSyncEventMemoParts();const memo=$('memo'),value=memo.value.slice(0,start)+text+memo.value.slice(end);
 mkCandidateMoveParts(mkCandidateParts,start,end,text,value);mkCandidateMoveParts(mkEventMemoParts,start,end,text,value);
 memo.value=value;mkCandidatePrevious=value;mkEventMemoPrevious=value;mkCandidateBefore=null;
}
function mkCandidateCleanStart(){const memo=$('memo');if(!memo.value.startsWith(' '))return;const next=[...mkCandidateParts.values()].find(p=>p.owned&&p.prefix&&p.start===1);if(next){mkCandidateReplace(0,1,'');next.prefix=false}}
function mkCandidateToggleWord(id){
 mkMemoUndo=null;mkCandidateSync();const w=mkMemoData.words.find(w=>w.id===id);if(!w)return;const memo=$('memo'),part=mkCandidateParts.get(id);
 if(part){mkCandidateParts.delete(id);if(part.owned&&memo.value.slice(part.start,part.end)===part.text){const start=part.prefix&&memo.value[part.start-1]===' '?part.start-1:part.start;mkCandidateReplace(start,part.end,'');mkCandidateCleanStart()}}
 else{
  // Reuse an exact, standalone manually entered word without claiming its text.
  let at=memo.value.indexOf(w.text);while(at>=0&&((at>0&&!/\s/.test(memo.value[at-1]))||(at+w.text.length<memo.value.length&&!/\s/.test(memo.value[at+w.text.length]))))at=memo.value.indexOf(w.text,at+1);
  if(at>=0)mkCandidateParts.set(id,{start:at,end:at+w.text.length,text:w.text,owned:false,prefix:false});
  else{const prefix=!!memo.value&&!/\s$/.test(memo.value),start=memo.value.length+(prefix?1:0);mkCandidateReplace(memo.value.length,memo.value.length,(prefix?' ':'')+w.text);mkCandidateParts.set(id,{start,end:start+w.text.length,text:w.text,owned:true,prefix})}
 }
 mkCandidatePaint();mkRenderEventSuggestion();mkMemoClearPaint();if(!part)mkMemoShowEnd();
}
function mkCandidateReset(){mkMemoUndo=null;mkMemoClearPaint();mkCandidateParts.clear();mkCandidatePrevious=$('memo').value;mkCandidateBefore=null;mkCandidateOpen=false;mkCandidateTab='';mkCandidateCategory='';mkCandidateGesture=null;mkCandidateIgnoreClick=0;mkCandidateRender()}
$('memo').addEventListener('beforeinput',()=>{mkCandidateBefore={value:$('memo').value,start:$('memo').selectionStart,end:$('memo').selectionEnd}});
$('memo').addEventListener('input',()=>{mkMemoUndo=null;mkCandidateSync();mkCandidatePaint();mkMemoClearPaint()});
const mkCandidateArea=$('mkCandidateWords');
mkCandidateArea.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;mkCandidateGesture={id:e.pointerId,x:e.clientX,y:e.clientY,axis:'',dx:0,moved:false};});
mkCandidateArea.addEventListener('pointermove',e=>{const g=mkCandidateGesture;if(!g||g.id!==e.pointerId)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;g.dx=dx;if(Math.hypot(dx,dy)>9)g.moved=true;if(!g.axis&&Math.max(Math.abs(dx),Math.abs(dy))>12)g.axis=Math.abs(dx)>Math.abs(dy)*1.3?'x':'y';if(g.axis==='x'){e.preventDefault();if(!mkCandidateArea.hasPointerCapture(e.pointerId))mkCandidateArea.setPointerCapture(e.pointerId)}});
function mkCandidateEndGesture(e,cancel=false){const g=mkCandidateGesture;if(!g||g.id!==e.pointerId)return;mkCandidateGesture=null;if(g.moved||cancel)mkCandidateIgnoreClick=performance.now()+400;if(!cancel&&g.axis==='x'&&Math.abs(g.dx)>=40){const tabs=mkCandidateTabs(),i=tabs.findIndex(t=>t.id===mkCandidateTab),next=i+(g.dx<0?1:-1);if(next>=0&&next<tabs.length)mkCandidateChooseTab(tabs[next].id)}if(mkCandidateArea.hasPointerCapture(e.pointerId))mkCandidateArea.releasePointerCapture(e.pointerId)}
mkCandidateArea.addEventListener('pointerup',e=>mkCandidateEndGesture(e));mkCandidateArea.addEventListener('pointercancel',e=>mkCandidateEndGesture(e,true));mkCandidateArea.addEventListener('lostpointercapture',e=>mkCandidateEndGesture(e,true));
mkCandidateArea.addEventListener('click',e=>{if(performance.now()<mkCandidateIgnoreClick){e.preventDefault();e.stopImmediatePropagation()}},true);

let mkStorageReady=false, mkSaveTimer=null, mkCanRestore=false, mkSetupMode=false;

// TODO: derived reminders are computed from app data; manual items are persisted.
function mkToday(){const d=new Date();return dateISO(d.getFullYear(),d.getMonth()+1,d.getDate())}
function mkTodoItems(){
 const today=mkToday(),list=[];for(const g of mkGroupList()){if(g.net)list.push({key:'group|'+g.id,title:'✓ '+g.name+'：'+mkGroupBalanceText(g.net),kind:'group',groupId:g.id,auto:true,emphasis:true});}
 for(const card of Object.keys(cardDefs)){
  const due=visibleBills(card)[0],amount=amountForBill(card,due),status=statusForBill(card,due);
  if(amount<=0||due<today)continue;
  const key='check|'+card+'|'+due;
  if(status==='candidate'&&!mkTodoHidden[key])list.push({key,title:cardDefs[card].name+'の請求額を確認',due,kind:'check',card,auto:true});
 }
 for(const card of Object.keys(cardDefs)){
   const dates=new Set([...Object.keys(billAdjustments).filter(k=>k.startsWith(card+'|')).map(k=>k.slice(card.length+1)),...visibleBills(card),...Object.keys(cardDefs[card].known)]);
   for(const due of dates){const key='withdraw|'+card+'|'+due;
     if(due>today||mkIsPaid(card,due)||statusForBill(card,due)!=='confirmed'||amountForBill(card,due)<=0)continue;
     list.push({key,title:cardDefs[card].name+'の引落確認',due,kind:'withdraw',card,auto:true,emphasis:true});
   }
 }
 
 const grouped={};
 for(const card of Object.keys(cardDefs)){
  const due=visibleBills(card)[0],amount=amountForBill(card,due),status=statusForBill(card,due);
  if(amount<=0||due<today||status==='planned')continue;
  const account=mkCardRule(card,due).accountId;if(!account)continue;
  const k=account+'|'+due;
  if(!grouped[k])grouped[k]={account,due,amount:0,cards:[]};
  grouped[k].amount+=amount;grouped[k].cards.push(card);
 }
 for(const g of Object.values(grouped)){
  const shortage=Math.max(0,g.amount-balances[g.account].v),key='fund|'+g.account+'|'+g.due;
  if(shortage>0&&!mkTodoHidden[key])list.push({key,title:balances[g.account].name+'へ '+yen(shortage)+' 入金',due:g.due,kind:'fund',auto:true,shortage,card:g.cards[0],estimated:g.cards.some(c=>statusForBill(c,g.due)!=='confirmed')});
 }
 for(const t of mkTodos){
  if(t.done||t.hidden)continue;
  if(t.person){const net=txs.filter(x=>x.person===t.person&&typeGroup(x)==='loan').reduce((s,x)=>s+loanImpact(x),0);if(!net||Math.sign(net)!==t.direction)continue;
   list.push({...t,title:t.person+(net<0?'に '+yen(-net)+' 返す':'から '+yen(net)+' 返してもらう'),kind:'loan'});
  }else list.push({...t,kind:'manual'});
 }
 return list.sort((a,b)=>(a.due||'9999-99-99').localeCompare(b.due||'9999-99-99')||Number(b.kind==='fund'||b.emphasis)-Number(a.kind==='fund'||a.emphasis)||Number(b.auto)-Number(a.auto));
}
let mkTodoExpanded=false,mkTodoEditingId=null,mkTodoEditingPerson=null;
function mkTodoEscId(t){return JSON.stringify(t.key||t.id).replace(/"/g,'&quot;')}
function renderTodos(){
 const el=$('mkTodoRows');if(!el)return;const items=mkTodoItems();
 $('todoCount').textContent=items.length+'件';
 el.innerHTML=(mkTodoExpanded?items:items.slice(0,5)).map(t=>{
 const id=mkTodoEscId(t),important=t.kind==='fund'||!!t.emphasis;
 return `<div class="mk-todo-row ${important?'mk-todo-important':''}"><input class="mk-todo-check" type="checkbox" aria-label="${safeHtml(t.title)}を完了" ${t.auto?'disabled title="詳細画面で操作すると自動完了します"':''} onchange="mkTodoComplete(${id},this.checked)"><button class="mk-todo-link" type="button" onclick="mkTodoEditById(${id})"><span class="mk-todo-title">${safeHtml(t.title)}</span>${t.due?`<span class="mk-todo-date">${fmtMD(t.due)}</span>`:''}</button>${t.kind!=='manual'?`<button class="mk-todo-detail" type="button" onclick="mkTodoOpen(${id})">詳細 ›</button>`:''}</div>`
 }).join('')||'<div class="small mk-todo-empty">やることはありません ♡</div>';
 const more=$('mkTodoMore');more.hidden=items.length<=5;more.textContent=mkTodoExpanded?'閉じる ▲':'もっと見る ▼';mkTodoSections();
}
function mkTodoGet(id){return mkTodoItems().find(x=>(x.key||x.id)===id)}
function mkTodoOpen(id){const t=mkTodoGet(id);if(!t)return;if(t.kind==='group'){mkGroupLoanView=true;mkGroupExpanded=t.groupId;openOther('loans');renderLoans();return;}if(t.kind==='withdraw'){nav('due',document.querySelectorAll('.nav')[3]);mkBillOffset[t.card]=0;const base=visibleBills(t.card)[0];let [y,m]=base.split('-').map(Number),[ty,tm]=t.due.split('-').map(Number);mkBillOffset[t.card]=(ty-y)*12+(tm-m);openBillDetail(t.card)}else if(t.kind==='check'){nav('due',document.querySelectorAll('.nav')[3]);openBillDetail(t.card)}else if(t.kind==='fund'){nav('due',document.querySelectorAll('.nav')[3])}else if(t.kind==='loan'){loanActivePerson=t.person;loanExpandedPerson=t.person;loanArchiveView=false;openOther('loans');renderLoans()}else mkTodoEdit(t)}
function mkTodoAdd(){mkTodoShow(null,null)}
function mkTodoEditById(id){if(mkTodoGet(id)?.kind==='group')return mkTodoOpen(id);const t=mkTodoGet(id);if(t)mkTodoEdit(t)}
function mkTodoEdit(t){mkTodoShow(t,null)}
function mkTodoShow(t,person){
 mkTodoEditingId=t?(t.key||t.id):null;mkTodoEditingPerson=person||null;
 $('mkTodoModalTitle').textContent=t?'やることを編集':'やることを追加';
 $('mkTodoTitleInput').value=t?t.title:(person?person+'の清算':'');
 $('mkTodoTitleInput').readOnly=!!person||!!(t&&t.kind!=='manual');
 $('mkTodoEmphasis').checked=!!(t&&t.emphasis);
 const due=t?.due||mkToday();$('mkTodoDateInput').value=due;
 document.querySelector('input[name="mkTodoDueMode"][value="'+(t?.due?'date':'none')+'"]').checked=true;
 $('mkTodoDelete').hidden=!(t||person)||!!t?.auto; $('mkTodoHide').hidden=!(t||person); $('mkTodoHide').textContent=t?.auto?'表示しない':'表示しない';
 $('mkTodoModal').hidden=false;mkTodoValidate();
}
function mkTodoClose(){$('mkTodoModal').hidden=true;mkTodoEditingId=null;mkTodoEditingPerson=null}
function mkTodoValidate(){$('mkTodoSave').disabled=!$('mkTodoTitleInput').value.trim()}
function mkTodoDateMode(){}
function mkTodoChooseDate(){document.querySelector('input[name="mkTodoDueMode"][value="date"]').checked=true}
function mkTodoSave(){
 const title=$('mkTodoTitleInput').value.trim();if(!title)return;
 const due=document.querySelector('input[name="mkTodoDueMode"]:checked').value==='date'?$('mkTodoDateInput').value:'';
 if(document.querySelector('input[name="mkTodoDueMode"]:checked').value==='date'&&!due)return;
 const emphasis=$('mkTodoEmphasis').checked,t=mkTodoEditingId?mkTodoGet(mkTodoEditingId):null;
 if(t){if(t.auto){mkTodoClose();return}else{const item=mkTodos.find(x=>x.id===t.id);if(item){if(!item.person)item.title=title;item.due=due;item.emphasis=emphasis}}}
 else if(mkTodoEditingPerson){const p=mkTodoEditingPerson,net=txs.filter(x=>x.person===p&&typeGroup(x)==='loan').reduce((v,x)=>v+loanImpact(x),0);if(net)mkTodos.push({id:'todo'+Date.now(),person:p,direction:Math.sign(net),due,emphasis,done:false})}
 else mkTodos.push({id:'todo'+Date.now(),title,due,emphasis,done:false});
 mkTodoClose();renderAll();
}
function mkTodoDelete(){
 if(!mkTodoEditingId)return;
 const t=mkTodoGet(mkTodoEditingId);if(!t||t.auto)return;
 if(!confirm('このやることを削除しますか？'))return;
 mkTodos=mkTodos.filter(x=>x.id!==t.id);
 mkTodoClose();renderAll();
}
function mkTodoHide(){
 const t=mkTodoEditingId?mkTodoGet(mkTodoEditingId):null;if(!t)return;
 if(!confirm('このやることを表示しないようにしますか？\nあとから再表示できます。'))return;
 if(t.auto)mkTodoHidden[t.key]=true;
 else {const item=mkTodos.find(x=>x.id===t.id);if(item)item.hidden=true}
 mkTodoClose();renderAll();
}
function mkTodoRestore(id){
 if(id.startsWith('auto:'))delete mkTodoHidden[id.slice(5)];
 else {const t=mkTodos.find(x=>x.id===id);if(t){t.hidden=false;t.done=false}}
 renderAll();
}
function mkTodoDeleteCompleted(id){
 const item=mkTodos.find(t=>t.id===id&&t.done);
 if(!item)return;
 if(!confirm('この完了済みのやることを削除しますか？\n貸し借りなどの記録は削除されません。'))return;
 mkTodos=mkTodos.filter(t=>t.id!==id);
 renderAll();
}
function mkTodoUndo(id){const t=mkTodos.find(x=>x.id===id);if(!t)return;t.done=false;renderAll()}
let mkTodoCompletedOpen=false,mkTodoHiddenOpen=false;
function mkTodoToggleSection(which){if(which==='done')mkTodoCompletedOpen=!mkTodoCompletedOpen;else mkTodoHiddenOpen=!mkTodoHiddenOpen;renderTodos()}
function mkTodoSections(){
 const done=mkTodos.filter(t=>t.done),hidden=mkTodos.filter(t=>t.hidden&&!t.done);
 const autoHidden=Object.keys(mkTodoHidden).filter(k=>mkTodoHidden[k]);
 const completed=$('mkTodoCompleted'),concealed=$('mkTodoConcealed');
 if(completed){completed.innerHTML=done.length?`<button class="mk-todo-section-toggle" onclick="mkTodoToggleSection('done')">完了済み ${done.length}件 ${mkTodoCompletedOpen?'▲':'▼'}</button>${mkTodoCompletedOpen?done.map(t=>`<div class="mk-todo-archive-row"><label><input type="checkbox" checked onchange="mkTodoUndo(${JSON.stringify(t.id).replace(/"/g,'&quot;')})"> <s>${safeHtml(t.title||t.person+'の清算')}</s></label><button type="button" class="outline mk-todo-completed-delete" onclick="mkTodoDeleteCompleted(${JSON.stringify(t.id).replace(/"/g,'&quot;')})">削除</button></div>`).join(''):''}`:''}
 if(concealed){const n=hidden.length+autoHidden.length;concealed.innerHTML=n?`<button class="mk-todo-section-toggle" onclick="mkTodoToggleSection('hidden')">非表示の項目 ${n}件 ${mkTodoHiddenOpen?'▲':'▼'}</button>${mkTodoHiddenOpen?[...hidden.map(t=>({id:t.id,title:t.title||t.person+'の清算'})),...autoHidden.map(k=>({id:'auto:'+k,title:'自動リマインダー（'+k.split('|').slice(1).join(' / ')+'）'}))].map(t=>`<div class="mk-todo-archive-row"><span>${safeHtml(t.title)}</span><button class="outline" onclick="mkTodoRestore(${JSON.stringify(t.id).replace(/"/g,'&quot;')})">再表示</button></div>`).join(''):''}`:''}
}
function mkTodoComplete(id,checked){if(!checked)return;const t=mkTodoGet(id);if(!t)return;
 if(t.auto){renderTodos();return}
 else{const item=mkTodos.find(x=>x.id===id);if(item)item.done=true}
 renderAll();
}
function mkTodoManage(id){mkTodoEditById(id)}
function mkTodoList(){mkTodoExpanded=!mkTodoExpanded;renderTodos()}
function mkLoanTodoFromButton(btn){
 const p=btn.closest('.loan-person-card')?.dataset.loanPerson;if(!p)return;
 const net=txs.filter(x=>x.person===p&&typeGroup(x)==='loan').reduce((v,x)=>v+loanImpact(x),0);if(!net)return;
 const existing=mkTodos.find(t=>t.person===p&&!t.done&&!t.hidden);
 if(existing){
  if(!confirm('「'+p+'」のやること表示を解除しますか？\n貸し借りの記録は削除されません。'))return;
  existing.hidden=true;
 }else{
  // 再登録時は重複させず、非表示の項目を復帰させる。
  const previous=mkTodos.find(t=>t.person===p&&!t.done&&t.hidden);
  if(previous){previous.hidden=false;previous.direction=Math.sign(net);previous.due='';previous.emphasis=false}
  else mkTodos.push({id:'todo'+Date.now(),person:p,direction:Math.sign(net),due:'',emphasis:false,done:false,hidden:false});
 }
 renderAll();
}

function mkState(){return {
  mkSettings,
  txs,loans,cashbook,snapshots,wishes,recurring,eventsData,mkTodos,mkTodoHidden,mkMemoData,
  billAdjustments,billItemAdjustments,mkPaidBills,deletedEventNames,
  loanArchivedPeople,loanGroups,loanGroupSerial,
  monthlyBudget,categoryBudgets,monthlyBudgetHistory,categoryBudgetHistory,chargeDefaults,
  balances:Object.fromEntries(Object.entries(balances).map(([key,val])=>[key,val.v]))
}}
function mkRestoreState(state){
  if(!state||typeof state!=='object')throw new Error('Invalid data');
  state=MKMigrations.renameCategories(mkValidateStoredSettings(state));
  mkApplySettings(state.mkSettings);
  mkMemoData=state.mkMemoData===undefined?{groups:[],words:[]}:mkMemoValidate(state.mkMemoData);
  const arrayKeys=['txs','loans','cashbook','snapshots','wishes','recurring','eventsData','deletedEventNames','loanArchivedPeople','loanGroups'];
  for(const key of arrayKeys)if(state[key]!==undefined&&!Array.isArray(state[key]))throw new Error('Invalid '+key);
  for(const key of arrayKeys)if(state[key]!==undefined){switch(key){
    case 'txs':txs=state[key];break;case 'loans':loans=state[key];break;
    case 'cashbook':cashbook=state[key];break;case 'snapshots':snapshots=state[key];break;
    case 'wishes':wishes=state[key];break;case 'recurring':recurring=state[key];break;
    case 'eventsData':eventsData=state[key];break;case 'deletedEventNames':deletedEventNames=state[key];break;
    case 'loanArchivedPeople':loanArchivedPeople=state[key];break;case 'loanGroups':loanGroups=state[key];break;
  }}
  if(state.balances&&typeof state.balances==='object')for(const [key,val] of Object.entries(state.balances)){
    if(balances[key]&&Number.isFinite(val))balances[key].v=val;
  }
  if(Array.isArray(state.mkTodos))mkTodos=state.mkTodos;
  if(state.mkTodoHidden&&typeof state.mkTodoHidden==='object')mkTodoHidden=state.mkTodoHidden;
  if(state.billAdjustments&&typeof state.billAdjustments==='object')billAdjustments=state.billAdjustments;
  if(state.mkPaidBills&&typeof state.mkPaidBills==='object'&&!Array.isArray(state.mkPaidBills))mkPaidBills=state.mkPaidBills;
  if(state.billItemAdjustments&&typeof state.billItemAdjustments==='object')billItemAdjustments=state.billItemAdjustments;
  if(state.categoryBudgets&&typeof state.categoryBudgets==='object')categoryBudgets=state.categoryBudgets;
  if(state.monthlyBudgetHistory&&typeof state.monthlyBudgetHistory==='object')monthlyBudgetHistory=state.monthlyBudgetHistory;
  if(state.categoryBudgetHistory&&typeof state.categoryBudgetHistory==='object')categoryBudgetHistory=state.categoryBudgetHistory;
  if(state.chargeDefaults&&typeof state.chargeDefaults==='object')chargeDefaults=state.chargeDefaults;
  if(Number.isFinite(state.monthlyBudget))monthlyBudget=state.monthlyBudget;
  if(Number.isSafeInteger(state.loanGroupSerial))loanGroupSerial=state.loanGroupSerial;
}
function mkQueueSave(){
  if(!mkStorageReady)return;
  clearTimeout(mkSaveTimer);
  mkSaveTimer=setTimeout(()=>{
    MKStorage.save(mkState()).catch(e=>{
      mkStorageReady=false;
      console.error('Money Keeper: 保存失敗',e);
      alert('保存に失敗しました。これ以上の入力はせず、画面を閉じずにバックアップ方法を確認してください。');
    });
  },200);
}
// Some edit actions re-render only their own component; persist those as well.
function mkWrapSave(name){const fn=globalThis[name];if(typeof fn!=='function')return;
  globalThis[name]=function(...args){const result=fn.apply(this,args);mkQueueSave();return result};
}
['saveSnapshot','addWish','editMonthlyBudget','editCategoryBudget'].forEach(mkWrapSave);
// Step2 draft: restore persisted data before the first render.
function mkShowSetup(message){
 mkStorageReady=false;mkSetupMode=true;clearTimeout(mkSaveTimer);mkSaveTimer=null;
 document.documentElement.classList.add('mk-settings-pending');
 $('mkSetupTitle').textContent='バックアップから復元';
 $('mkSetupMessage').textContent=message;
 window.mkMountBackup?.();
}
async function mkBoot(){
 try{
  await MKStorage.available();mkCanRestore=true;
  const saved=await MKStorage.load();
  if(!saved){mkShowSetup('このブラウザには設定がありません。#89以降で保存した、設定入りバックアップを選んでください。');return}
  mkRestoreState(saved);
 }catch(e){
  console.error('Money Keeper: 保存データの読み込みに失敗',e);
  mkShowSetup(mkCanRestore?'保存データを読み込めませんでした。元の保存データは変更していません。いつものブラウザか確認し、再読み込みするか、#89以降の設定入りバックアップから復元してください。':'ブラウザ保存を利用できません。ブラウザの設定を確認してから再読み込みしてください。');return;
 }
 try{
  mkDefaultEventTag();
  renderPayBtns();renderCharge();renderAll();updateForm();initMoneyInputs();mkMemoRender();
  try{const last=sessionStorage.getItem('mk-last-page');if(last&&$(last)?.classList.contains('page')){const navBtn=document.querySelector(`.nav[onclick*="'${last}'"]`);nav(last,navBtn||null);if(['loans','events','wish'].includes(last)){const otherNav=document.querySelectorAll('.nav')[5];if(otherNav)otherNav.classList.add('active')}}}catch(_){}
  if(document.querySelector('.page.active')?.id==='memoManager'){history.replaceState({mkPage:'other'},'',location.href);mkMemoView='words';mkMemoScope='';mkMemoRender();mkMemoHistory()}
  new MutationObserver(()=>initMoneyInputs()).observe(document.body,{childList:true,subtree:true});
  document.documentElement.classList.remove('mk-settings-pending');
  mkStorageReady=true;window.mkMountBackup?.();mkQueueSave();
 }catch(e){console.error('Money Keeper: 画面の準備に失敗',e);mkShowSetup('画面を準備できませんでした。保存を停止しています。再読み込みして確認してください。')}
}
mkBoot();

/* Budget modal uses the visual viewport itself rather than scrolling the page.
   Keep the background stationary; backdrop taps still dismiss the modal. */
(function mkBudgetViewportModal(){
 const modal=document.getElementById('moneyPromptModal');
 if(!modal)return;
 const vv=window.visualViewport;
 let raf=0,locked=false,oldBodyOverflow='',oldHtmlOverflow='';
 function update(){
  raf=0;
  const open=!modal.classList.contains('hidden');
  if(!open){
   modal.style.removeProperty('top');
   modal.style.removeProperty('height');
   modal.style.removeProperty('bottom');
   if(locked){document.body.style.overflow=oldBodyOverflow;document.documentElement.style.overflow=oldHtmlOverflow;locked=false;}
   return;
  }
  if(!locked){oldBodyOverflow=document.body.style.overflow;oldHtmlOverflow=document.documentElement.style.overflow;document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';locked=true;}
  // On Android the keyboard reduces visualViewport.height. Position the entire
  // sheet in that visible region; do not use scrollIntoView or page scroll.
  const top=vv?vv.offsetTop:0;
  const height=vv?vv.height:window.innerHeight;
  modal.style.top=top+'px';
  modal.style.height=height+'px';
  modal.style.bottom='auto';
 }
 function queue(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(update)}
 new MutationObserver(()=>{queue();setTimeout(queue,90);setTimeout(queue,280);setTimeout(queue,550)}).observe(modal,{attributes:true,attributeFilter:['class']});
 if(vv){vv.addEventListener('resize',queue);vv.addEventListener('scroll',queue)}
 window.addEventListener('resize',queue);
 document.addEventListener('focusin',e=>{if(modal.contains(e.target)){queue();setTimeout(queue,130);setTimeout(queue,400)}});
 // Do not allow touch gestures on the dim backdrop to scroll the page.
 modal.addEventListener('touchmove',e=>{if(e.target===modal)e.preventDefault()},{passive:false});
 queue();
})();

// Give the current app screen a browser-history identity after initialization.
setTimeout(()=>{try{const active=document.querySelector('.page.active')?.id||'home';if(!history.state?.mkPage)history.replaceState({mkPage:active},'',location.href)}catch(_){}},0);



// #92 Settings drafts never mutate accounting state before a successful save.
let mkSettingsDraft=null,mkSettingsView='',mkSettingsBusy=false,mkSettingsEdit=null;
function mkSettingsUI(c=mkSettings){return c?.ui||{hiddenBalances:[],hiddenPays:[],payOrder:c?.pays.map(x=>x[0])||[],customIncome:false}}
function mkHiddenBalance(k){return mkSettingsUI().hiddenBalances.includes(k)}
function mkHiddenPay(k){return mkSettingsUI().hiddenPays.includes(k)}
function mkSettingsOpen(){
 if(!mkStorageReady||mkSettingsBusy||mkSettingsDraft)return;
 mkSettingsDraft=structuredClone(mkSettings);mkSettingsDraft.ui=structuredClone(mkSettingsUI());mkSettingsView='';mkSettingsEdit=null;
 mkSettingsLayoutTab='payment';mkCardBuffers={};mkSettingsInitial=JSON.stringify(mkSettingsDraft);mkSettingsNewBalances={};mkSettingsBuffers={};mkSettingsAddDraft=null;mkSettingsSession='s'+Date.now()+Math.random();mkSettingsDepth=0;mkSettingsLeaving=false;
 const page=document.querySelector('.page.active')?.id||'home';history.replaceState({...history.state,mkPage:page},'',location.href);history.pushState({mkPage:page,mkSetting:mkSettingsSession,depth:0,view:'',edit:null},'',location.href);
 $('mkSettingsError').textContent='';$('mkSettingsModal').classList.remove('hidden');document.body.classList.add('mk-memo-modal-open');mkSettingsRender();$('mkSettingsModal').firstElementChild.scrollTop=0;
}
function mkSettingsCancel(saved=false){
 if(mkSettingsBusy||!mkSettingsDraft)return;
 if(!saved&&mkSettingsDirty()&&!confirm('保存していない変更を破棄して、設定を閉じますか？'))return;
 mkSettingsLeaving=true;history.go(-(mkSettingsDepth+1));
}
function mkSettingsGo(view){mkSettingsNavigate(view,null,1)}
function mkSettingsButton(text,fn,cls='ghost'){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.onclick=fn;return b}
function mkSettingsText(text,cls='small'){const e=document.createElement('p');e.className=cls;e.textContent=text;return e}
function mkSettingsName(k){if(k==='__more')return 'もっと見る';return mkSettingsDraft.labels[k]||mkSettingsDraft.accounts.find(x=>x.id===k)?.name||k}
function mkSettingsRender(){
 if(!mkSettingsDraft)return;const c=mkSettingsDraft,body=$('mkSettingsBody');body.replaceChildren();const noSave=!!mkSettingsEdit;$('mkSettingsSave').hidden=noSave;$('mkSettingsSave').parentElement.hidden=noSave;
 $('mkSettingsTitle').textContent=mkSettingsEdit?(mkSettingsEdit.kind==='card'?(mkSettingsEdit.key?'カードを編集':'カードを追加'):mkSettingsEdit.kind==='add'?'口座・残高を追加':mkSettingsEdit.kind==='account'?'口座・残高を編集':'支払方法を編集'):({accounts:'口座・残高',pays:'支払方法',cards:'カード・引落',layouts:'ボタン配置'}[mkSettingsView]||'口座・支払方法の設定');
 if(mkSettingsEdit){if(mkSettingsEdit.kind==='card'){mkRenderCardEditor(body);return}if(mkSettingsEdit.kind==='add')mkSettingsRenderAdd(body);else mkSettingsRenderEdit(body);return}
 if(!mkSettingsView){
  const grid=document.createElement('div');grid.className='mk-settings-menu';
  for(const [id,label,sub] of [['accounts','口座・残高','名前・表示・順番'],['pays','支払方法','名前・候補の表示'],['cards','カード・引落','追加・締め日・引落口座'],['layouts','ボタン配置','順番・行ごとの個数']]){const b=mkSettingsButton(label,()=>mkSettingsGo(id));const sm=document.createElement('small');sm.textContent=sub;b.append(sm);grid.append(b)}body.append(grid);return;
 }
 if(mkSettingsView==='layouts'){mkSettingsRenderLayouts(body);return}
 if(mkSettingsView==='cards'){mkRenderCards(body);return}
 const account=mkSettingsView==='accounts';
 if(account){const head=document.createElement('div');head.className='mk-settings-add-head';head.append(mkSettingsButton('＋追加',()=>{mkSettingsNavigate('accounts',{kind:'add'},2)},'outline'));body.append(head)}
 const ids=account?c.accounts.map(x=>x.id):c.ui.payOrder;
 const hidden=account?c.ui.hiddenBalances:c.ui.hiddenPays;
 const list=document.createElement('div');body.append(list);
 const details=document.createElement('details'),summary=document.createElement('summary'),hiddenList=document.createElement('div');summary.textContent='非表示の項目（'+ids.filter(k=>hidden.includes(k)).length+'）';details.append(summary,hiddenList);body.append(details);
 function move(a,b){const order=ids.slice(),ia=order.indexOf(a),ib=order.indexOf(b);if(ia<0||ib<0)return;order.splice(ib,0,order.splice(ia,1)[0]);if(account)c.accounts=order.map(k=>c.accounts.find(x=>x.id===k));else{c.ui.payOrder=order;let n=0;for(const zone of ['payment','more'])c.layouts[zone]=c.layouts[zone].map(row=>row.map(k=>k==='__more'?k:order[n++]));}mkSettingsRender()}
 for(const k of ids){const row=document.createElement('div');row.className='mk-settings-row';row.dataset.key=k;const name=document.createElement('span');name.textContent=account?c.accounts.find(x=>x.id===k).name:mkSettingsName(k);row.append(name,mkSettingsButton('編集',()=>{mkSettingsNavigate(mkSettingsView,{kind:account?'account':'pay',key:k},2)}));mkSettingsGrip(row,k,move);(hidden.includes(k)?hiddenList:list).append(row)}
}
function mkSettingsRenderEdit(body){
 const {kind,key}=mkSettingsEdit,c=mkSettingsDraft,isAccount=kind==='account',slot=kind+':'+key;
 const initial={kind,key,name:isAccount?c.accounts.find(x=>x.id===key).name:c.labels[key],home:!c.ui.hiddenBalances.includes(key),pay:!c.ui.hiddenPays.includes(key)};
 const value=mkSettingsBuffers[slot]?.value||initial;
 function remember(){mkSettingsBuffers[slot]={initial:mkSettingsBuffers[slot]?.initial||initial,value:{kind,key,name:input.value,home:home?.checked??value.home,pay:pay.checked}}}
 const label=document.createElement('label');label.textContent=isAccount?'口座・残高の名前':'支払方法の名前';const input=document.createElement('input');input.type='text';input.id='mkSettingsName';input.maxLength=60;input.value=value.name;input.oninput=remember;label.append(input);body.append(label);
 function check(text,checked,id){const label=document.createElement('label');label.className='mk-settings-check';const cb=document.createElement('input');cb.type='checkbox';cb.checked=checked;cb.id=id;cb.onchange=remember;label.append(cb,document.createTextNode(text));body.append(label);return cb}
 let home=null;if(isAccount){home=check('ホームの残高に表示する',value.home,'mkSettingsBalanceVisible');body.append(mkSettingsText('非表示でも合計・引落に含まれます。','small mk-settings-note'))}
 const pay=check('新しい記録の候補に表示する',value.pay,'mkSettingsPayVisible');body.append(mkSettingsText('非表示でも過去の記録・請求は残ります。','small mk-settings-note'));
 body.append(mkSettingsButton('編集を戻す',()=>{delete mkSettingsBuffers[slot];history.back()}),mkSettingsButton('設定に反映',()=>{remember();if(mkSettingsCommitBuffer(slot))history.back()},'outline'));
}
function mkSettingsGrip(row,key,move){
 const grip=mkSettingsButton('⠿',()=>{},'mk-settings-grip');grip.setAttribute('aria-label','長押しで並べ替え。上下キーでも移動');row.append(grip);
 grip.onkeydown=e=>{if(!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const rows=[...row.parentElement.children],i=rows.indexOf(row),target=rows[i+(e.key==='ArrowUp'?-1:1)];if(target){move(key,target.dataset.key);[...$('mkSettingsBody').querySelectorAll('.mk-settings-row')].find(r=>r.dataset.key===key)?.querySelector('.mk-settings-grip')?.focus()}};
 grip.onpointerdown=e=>{
  if(e.button!==0)return;e.preventDefault();const startX=e.clientX,startY=e.clientY;let active=false,lastY=startY,targetKey=null,raf;
  grip.setPointerCapture(e.pointerId);const timer=setTimeout(()=>{active=true;row.classList.add('mk-settings-dragging');raf=requestAnimationFrame(frame)},330);
  function frame(){if(!active)return;const sheet=$('mkSettingsModal').firstElementChild,r=sheet.getBoundingClientRect();if(lastY<r.top+65)sheet.scrollTop-=7;else if(lastY>r.bottom-85)sheet.scrollTop+=7;raf=requestAnimationFrame(frame)}
  function motion(ev){lastY=ev.clientY;if(!active&&Math.hypot(ev.clientX-startX,ev.clientY-startY)>10){finish(false);return}if(!active)return;const siblings=[...row.parentElement.children];const target=siblings.find(x=>x!==row&&lastY>=x.getBoundingClientRect().top&&lastY<=x.getBoundingClientRect().bottom);if(target){targetKey=target.dataset.key;for(const r of siblings)r.style.outline=r===target?'1px solid #b86b86':''}}
  function finish(save){clearTimeout(timer);cancelAnimationFrame(raf);active=false;row.classList.remove('mk-settings-dragging');for(const r of row.parentElement.children)r.style.outline='';grip.removeEventListener('pointermove',motion);grip.removeEventListener('pointerup',up);grip.removeEventListener('pointercancel',cancel);grip.removeEventListener('lostpointercapture',cancel);if(grip.hasPointerCapture(e.pointerId))grip.releasePointerCapture(e.pointerId);if(save&&targetKey)move(key,targetKey)}
  const up=()=>finish(true),cancel=()=>finish(false);grip.addEventListener('pointermove',motion);grip.addEventListener('pointerup',up);grip.addEventListener('pointercancel',cancel);grip.addEventListener('lostpointercapture',cancel);
 };
}
function mkSettingsRenderLayouts(body){
 const c=mkSettingsDraft;
 const tabs=document.createElement('div');tabs.className='mk-layout-tabs';tabs.setAttribute('role','tablist');
 for(const [key,label] of [['payment','支払方法'],['income','入金先'],['charge','チャージ元']]){const b=mkSettingsButton(label,()=>{mkSettingsLayoutTab=key;mkSettingsRender();$('mkSettingsModal').firstElementChild.scrollTop=0},'mini');b.classList.toggle('active',key===mkSettingsLayoutTab);b.setAttribute('role','tab');b.setAttribute('aria-selected',String(key===mkSettingsLayoutTab));tabs.append(b)}body.append(tabs);
 for(const [zone,title] of [['payment','支払方法：いつも表示'],['more','支払方法：もっと見る'],['income','入金先'],['charge','チャージ元']]){
  if(mkSettingsLayoutTab==='payment'?!['payment','more'].includes(zone):zone!==mkSettingsLayoutTab)continue;
  const heading=document.createElement('h3');heading.textContent=title;body.append(heading);
  const preview=document.createElement('div');preview.className='mk-settings-preview';
  for(const [i,row] of c.layouts[zone].entries()){const r=document.createElement('div');r.className='mk-settings-preview-row';if(zone==='income'&&i===2&&!c.ui.customIncome)r.style.maxWidth='25%';for(const k of row.filter(k=>!c.ui.hiddenPays.includes(k))){const span=document.createElement('span');span.textContent=mkSettingsName(k);r.append(span)}if(r.children.length)preview.append(r)}body.append(preview);
  const flat=c.layouts[zone].flat();
  for(let i=0;i<c.layouts[zone].length;i++){
   const line=document.createElement('div');line.className='mk-settings-layout-row';line.append(document.createTextNode((i+1)+'行目'));
   const sel=document.createElement('select');sel.setAttribute('aria-label',title+' '+(i+1)+'行目の個数');for(let n=1;n<=4;n++){const o=new Option(n+'個',n);sel.add(o)}sel.value=c.layouts[zone][i].length;sel.onchange=()=>{const caps=c.layouts[zone].map(x=>x.length);caps[i]=Number(sel.value);mkSettingsPack(zone,flat,caps);if(zone==='income')c.ui.customIncome=true;mkSettingsRender()};line.append(sel);body.append(line);
  }
  const list=document.createElement('div');body.append(list);
  for(const k of flat){const row=document.createElement('div');row.className='mk-settings-row mk-settings-layout-item';row.dataset.key=k;const name=document.createElement('span');name.textContent=mkSettingsName(k)+(c.ui.hiddenPays.includes(k)?'（非表示）':'');row.append(name);
   if(['payment','more'].includes(zone)&&k!=='__more')row.append(mkSettingsButton(zone==='payment'?'もっと見るへ':'いつも表示へ',()=>{const dest=zone==='payment'?'more':'payment',src=flat.filter(x=>x!==k),next=[...c.layouts[dest].flat(),k];mkSettingsPack(zone,src);mkSettingsPack(dest,next);mkSettingsSyncPayOrder();mkSettingsRender()}));
   mkSettingsGrip(row,k,(a,b)=>{const arr=flat.slice(),ai=arr.indexOf(a),bi=arr.indexOf(b);arr.splice(bi,0,arr.splice(ai,1)[0]);mkSettingsPack(zone,arr);if(zone==='income')c.ui.customIncome=true;mkSettingsSyncPayOrder();mkSettingsRender()});list.append(row);
  }
 }
}
function mkSettingsPack(zone,flat,caps=mkSettingsDraft.layouts[zone].map(x=>x.length)){
 const rows=[];let offset=0;for(const n of caps){if(offset>=flat.length)break;rows.push(flat.slice(offset,offset+n));offset+=n}while(offset<flat.length){rows.push(flat.slice(offset,offset+4));offset+=4}mkSettingsDraft.layouts[zone]=rows;
}
function mkSettingsSyncPayOrder(){mkSettingsDraft.ui.payOrder=[...mkSettingsDraft.layouts.payment.flat(),...mkSettingsDraft.layouts.more.flat()].filter(k=>k!=='__more')}
async function mkSettingsSave(){
 if(!mkSettingsDraft||mkSettingsBusy||!mkStorageReady)return;
 for(const key of Object.keys(mkCardBuffers))if(!mkCommitCard(key,false))return;
 for(const slot of Object.keys(mkSettingsBuffers))if(!mkSettingsCommitBuffer(slot))return;
 if(mkSettingsAddDraft&&mkSettingsAddDirty()&&!mkSettingsAddToDraft(false))return;
 const candidate=structuredClone(mkState());candidate.mkSettings=structuredClone(mkSettingsDraft);Object.assign(candidate.balances,mkSettingsNewBalances);candidate.chargeDefaults={...candidate.mkSettings.chargeDefaults,...candidate.chargeDefaults};
 try{mkValidateStoredSettings(candidate)}catch(e){$('mkSettingsError').textContent='設定を保存できません。名前や配置を確認してください。';return}
 mkSettingsBusy=true;clearTimeout(mkSaveTimer);mkStorageReady=false;$('mkSettingsSave').disabled=true;$('mkSettingsSave').textContent='保存中…';$('mkSettingsBody').inert=true;document.querySelector('.app').inert=true;document.querySelector('.bottom').inert=true;
 let committed=false;
 try{
  await MKStorage.save(candidate);committed=true;
  const oldRakuten=rakutenPaySource;
  mkApplySettings(candidate.mkSettings);chargeDefaults=candidate.chargeDefaults;for(const [k,v] of Object.entries(candidate.balances))balances[k].v=v;rakutenPaySource=oldRakuten;
  // A hidden choice cannot stay invisibly selected for the next new record.
  if(mkHiddenPay(payment))payment='';if(mkHiddenPay(chargeTarget))chargeTarget='';if(mkHiddenPay(chargeSource))chargeSource='';
  if(mkHiddenPay(from)){from='';$('fromBtn').firstElementChild.textContent='選んでください'}if(mkHiddenPay(to)){to='';$('toBtn').firstElementChild.textContent='選んでください'}
  if(from)$('fromBtn').firstElementChild.textContent=balances[from]?.name||from;if(to)$('toBtn').firstElementChild.textContent=balances[to]?.name||to;
  if(mkHiddenPay(rakutenPaySource))rakutenPaySource=mkSettings.rakutenSources.find(([k])=>!mkHiddenPay(k))?.[0]||'';
  renderAll();renderPayBtns();renderCharge();mkRefreshRakPaySource();mkStorageReady=true;mkSettingsBusy=false;mkSettingsCancel(true);
 }catch(e){console.error('設定の保存失敗',e);mkStorageReady=!committed;$('mkSettingsError').textContent=committed?'設定は保存しましたが、画面を更新できませんでした。再読み込みしてください。':'保存できませんでした。画面を閉じず、もう一度保存してください。';}
 finally{mkSettingsBusy=false;$('mkSettingsSave').disabled=false;$('mkSettingsSave').textContent='保存';$('mkSettingsBody').inert=false;document.querySelector('.app').inert=false;document.querySelector('.bottom').inert=false;}
}

// #93: browser Back follows settings hierarchy; only closing discards drafts.
let mkSettingsSession='',mkSettingsDepth=0,mkSettingsLeaving=false,mkSettingsInitial='',mkSettingsNewBalances={},mkSettingsBuffers={},mkSettingsAddDraft=null;
function mkSettingsNavigate(view,edit,depth){
 if(!mkSettingsDraft||mkSettingsBusy)return;
 if(depth===2&&mkSettingsDepth===0){history.pushState({mkPage:document.querySelector('.page.active')?.id||'home',mkSetting:mkSettingsSession,depth:1,view,edit:null},'',location.href);mkSettingsDepth=1;}
 const state={mkPage:document.querySelector('.page.active')?.id||'home',mkSetting:mkSettingsSession,depth,view,edit};
 if(depth>mkSettingsDepth)history.pushState(state,'',location.href);else history.replaceState(state,'',location.href);
 mkSettingsDepth=depth;mkSettingsView=view;mkSettingsEdit=edit;$('mkSettingsError').textContent='';mkSettingsRender();$('mkSettingsModal').firstElementChild.scrollTop=0;
}
function mkSettingsCloseNow(){
 mkSettingsDraft=null;mkCardBuffers={};mkSettingsEdit=null;mkSettingsBuffers={};mkSettingsAddDraft=null;mkSettingsNewBalances={};mkSettingsLeaving=false;
 $('mkSettingsModal').classList.add('hidden');document.body.classList.remove('mk-memo-modal-open');$('mkSettingsError').textContent='';
}
function mkSettingsDirty(){return !!mkSettingsDraft&&(JSON.stringify(mkSettingsDraft)!==mkSettingsInitial||Object.keys(mkSettingsNewBalances).length>0||Object.values(mkSettingsBuffers).some(x=>JSON.stringify(x.value)!==JSON.stringify(x.initial))||Object.values(mkCardBuffers).some(b=>JSON.stringify(b.initial)!==JSON.stringify(b.value))||mkSettingsAddDirty())}
function mkSettingsHandlePop(event){
 const st=event.state;
 if(!mkSettingsDraft){if(st?.mkSetting){history.replaceState({mkPage:st.mkPage||'home'},'',location.href);mkDisplayPage(st.mkPage||'home');return true}return false}
 if(mkSettingsBusy){history.forward();return true}
 if(st?.mkSetting===mkSettingsSession&&!mkSettingsLeaving){mkSettingsDepth=st.depth;mkSettingsView=st.view;mkSettingsEdit=st.edit;$('mkSettingsError').textContent='';mkSettingsRender();$('mkSettingsModal').firstElementChild.scrollTop=0;return true}
 if(!mkSettingsLeaving&&mkSettingsDirty()&&!confirm('保存していない変更を破棄して、設定を閉じますか？')){history.forward();return true}
 mkSettingsCloseNow();return false;
}
function mkSettingsCommitBuffer(slot){
 const buffer=mkSettingsBuffers[slot];if(!buffer)return true;
 const c=mkSettingsDraft,{kind,key,home,pay}=buffer.value,isAccount=kind==='account',value=buffer.value.name.trim();
 function fail(message){mkSettingsNavigate(isAccount?'accounts':'pays',{kind,key},2);$('mkSettingsError').textContent=message;return false}
 if(!value||value.length>60||/[<>\u0000-\u001f]/.test(value))return fail('名前を1〜60文字で入力してください（< > は使えません）。');
 const existing=isAccount?c.accounts.map(x=>[x.id,x.name]):c.pays;if(existing.some(([k,n])=>k!==key&&n===value))return fail('同じ名前が登録されています。');
 if(isAccount){c.accounts.find(x=>x.id===key).name=value;for(const card of c.cards)if(card.accountId===key)card.account=value;}
 else if(c.labels[key]!==value){const oldNames=[c.labels[key],c.pays.find(x=>x[0]===key)?.[1]];for(const old of oldNames)if(old&&!Object.hasOwn(c.aliases,old)&&!['__proto__','constructor','prototype'].includes(old))c.aliases[old]=key;c.labels[key]=value;for(const list of [c.pays,c.incomePays,c.chargeTargets,c.rakutenSources])for(const pair of list)if(pair[0]===key)pair[1]=value;const card=c.cards.find(x=>x.id===key);if(card)card.name=value;}
 for(const [field,shown] of [...(isAccount?[['hiddenBalances',home]]:[]),['hiddenPays',pay]])c.ui[field]=shown?c.ui[field].filter(x=>x!==key):[...new Set([...c.ui[field],key])];
 delete mkSettingsBuffers[slot];$('mkSettingsError').textContent='';return true;
}
function mkTracksAccount(t,k){return !t||!mkSettings.accounts.find(a=>a.id===k)?.untrackedTxIds?.includes(t.id)}
function mkSettingsEmptyAdd(){return {kind:'bank',existing:'',name:'',label:'',balance:'0',source:''}}
function mkSettingsAddDirty(){return !!mkSettingsAddDraft&&JSON.stringify(mkSettingsAddDraft)!==JSON.stringify(mkSettingsEmptyAdd())}
function mkSettingsEdyAvailable(){return mkSettingsDraft.pays.some(([k])=>k==='edy')&&!mkSettingsDraft.accounts.some(x=>x.id==='edy')&&!mkSettingsDraft.cardRoutes.edy}
function mkSettingsRenderAdd(body){
 const c=mkSettingsDraft,v=mkSettingsAddDraft||(mkSettingsAddDraft=mkSettingsEmptyAdd());
 function field(label,id,control){const el=document.createElement('label');el.className='mk-settings-form-field';el.textContent=label;control.id=id;el.append(control);body.append(el);return control}
 function select(label,id,options,value,change){const sel=document.createElement('select');for(const [k,n] of options)sel.add(new Option(n,k));sel.value=value;sel.onchange=()=>change(sel.value);return field(label,id,sel)}
 select('種類','mkAccountKind',[['bank','銀行口座'],['prepaid','チャージ式電子マネー']],v.kind,x=>{v.kind=x;if(x==='bank'&&v.existing){v.existing='';v.name='';v.label=''}mkSettingsRender()});
 if(v.kind==='prepaid'&&mkSettingsEdyAvailable())select('追加する項目','mkAccountExisting',[['','新しい電子マネー'],['edy',(c.pays.find(x=>x[0]==='edy')?.[1]||'楽天Edy')+'に残高を追加']],v.existing,x=>{v.existing=x;if(x==='edy'){v.name=c.pays.find(x=>x[0]==='edy')[1];v.label=c.labels.edy}else{v.name='';v.label=''}mkSettingsRender()});
 function input(label,id,key,type='text'){const el=document.createElement('input');el.type='text';if(type==='money')el.inputMode=v.kind==='bank'?'decimal':'numeric';else el.maxLength=60;el.value=v[key];el.oninput=()=>v[key]=el.value;return field(label,id,el)}
 input('名前','mkAccountName','name');input('ボタンの表示名（空欄なら名前と同じ）','mkAccountLabel','label');input('現在の残高（円）','mkAccountBalance','balance','money');
 body.append(mkSettingsText('開始残高です。支出・収入には集計しません。','small mk-settings-note'));
 if(v.kind==='prepaid')select('いつものチャージ元','mkAccountSource',[['','選んでください'],...c.layouts.charge.flat().filter(k=>!c.ui.hiddenPays.includes(k)).map(k=>[k,c.labels[k]||k])],v.source,x=>v.source=x);
 if(v.existing)body.append(mkSettingsText('過去の記録はそのままに、ここから残高管理を始めます。','small mk-settings-note'));
 body.append(mkSettingsButton('設定に追加',()=>mkSettingsAddToDraft(true),'outline'));
}
function mkSettingsAddToDraft(goBack){
 const v=mkSettingsAddDraft;if(!v)return true;
 const c=mkSettingsDraft,name=v.name.trim(),label=v.label.trim()||name,raw=v.balance.replace(/,/g,'').trim(),balance=Number(raw);
 function fail(msg){if(mkSettingsEdit?.kind!=='add')mkSettingsNavigate('accounts',{kind:'add'},2);$('mkSettingsError').textContent=msg;return false}
 if(!['bank','prepaid'].includes(v.kind))return fail('種類を選んでください。');
 if(![name,label].every(x=>x.length>=1&&x.length<=60&&!/[<>\u0000-\u001f]/.test(x)))return fail('名前・表示名を1〜60文字で入力してください（< > は使えません）。');
 if(!/^-?\d+$/.test(raw)||!Number.isSafeInteger(balance)||Math.abs(balance)>999999999||(v.kind==='prepaid'&&balance<0))return fail(v.kind==='prepaid'?'残高は0〜999,999,999円の整数で入力してください。':'残高は-999,999,999〜999,999,999円の整数で入力してください。');
 let existing=v.existing;
 const norm=x=>x.normalize('NFKC').replace(/\s/g,'').toLowerCase();
 if(v.kind==='prepaid'&&mkSettingsEdyAvailable()&&[c.labels.edy,c.pays.find(x=>x[0]==='edy')[1],'楽天Edy'].some(n=>[name,label].some(x=>norm(x)===norm(n))))existing='edy';
 if(existing&&(v.kind!=='prepaid'||existing!=='edy'||!mkSettingsEdyAvailable()))return fail('この支払方法にはすでに残高があるか、追加できません。');
 if(c.accounts.some(x=>norm(x.name)===norm(name))||c.pays.some(([k,n])=>k!==existing&&[n,c.labels[k]].some(n=>[name,label].some(x=>norm(x)===norm(n)))))return fail('同じ名前の項目が登録されています。別の名前を入力してください。');
 if(v.kind==='prepaid'&&(!c.layouts.charge.flat().includes(v.source)||c.ui.hiddenPays.includes(v.source)))return fail('いつものチャージ元を選んでください。');
 if(c.accounts.length>=200||(!existing&&c.pays.length>=200))return fail('登録できる項目数の上限です。');
 let key=existing;if(!key){do{key='acct_'+crypto.randomUUID().replace(/-/g,'')}while(c.pays.some(x=>x[0]===key)||c.accounts.some(x=>x.id===key))}
 const oldTransactions=existing?txs.filter(t=>[t.payment,t.rakutenPaySource,t.source,t.target,t.from,t.to].some(k=>k&&canonicalPay(k)===existing)):[];
 if(oldTransactions.some(t=>typeof t.id!=='string'||!t.id))return fail('過去の記録を識別できません。追加せず、バックアップを保管してご相談ください。');
 const next=structuredClone(c);next.accounts.push({id:key,name,kind:v.kind,...(existing?{untrackedTxIds:[...new Set(oldTransactions.map(t=>t.id))]}:{})});next.balanceRoutes[key]=key;
 function append(zone){if(!next.layouts[zone].flat().includes(key))next.layouts[zone].push([key])}
 if(!existing){next.pays.push([key,label]);next.labels[key]=label;append('more');next.ui.payOrder.push(key)}else{
  for(const old of [next.labels[key],next.pays.find(x=>x[0]===key)[1]])if(!Object.hasOwn(next.aliases,old)&&!['__proto__','constructor','prototype'].includes(old))next.aliases[old]=key;
  next.pays.find(x=>x[0]===key)[1]=label;next.labels[key]=label;
 }
 if(v.kind==='bank'){next.incomePays.push([key,label]);append('income');append('charge');}
 else{next.chargeTargets.push([key,label]);next.chargeDefaults[key]=v.source;}
 next.ui.hiddenPays=next.ui.hiddenPays.filter(k=>k!==key);
 try{mkValidateSettings(next)}catch(e){return fail('追加内容を確認してください。設定を保存できません。')}
 mkSettingsDraft=next;mkSettingsNewBalances[key]=balance;mkSettingsAddDraft=null;$('mkSettingsError').textContent='';if(goBack)history.back();return true;
}

// #94 Card editing uses the same staged save as the other settings.
let mkSettingsLayoutTab='payment',mkCardBuffers={};
function mkCardMonthNext(month){const [y,m]=month.split('-').map(Number);return addMonthsYM(y,m,1).map((n,i)=>i?pad2(n):n).join('-')}
function mkCardMinMonth(card){
 let min=mkToday().slice(0,7);
 const dates=[...Object.keys(card.known||{}),...Object.keys(billAdjustments).filter(k=>k.startsWith(card.id+'|')).map(k=>k.split('|')[1]),...Object.keys(mkPaidBills).filter(k=>k.startsWith(card.id+'|')).map(k=>k.split('|')[1])];
 // Explicit bill corrections/overrides must not be orphaned by changing dates.
 for(const t of txs)if(t.billOverride&&finalCardForPayment(t.type==='charge'?t.source:t.payment,t.rakutenPaySource)===card.id)dates.push(t.billOverride);
 for(const item of allocRecorded(card.id)){if(billItemAdjustments[billItemKey(item,item.due)]!=null)dates.push(item.due)}
 for(const date of dates)if(date?.slice(0,7)>=min)min=mkCardMonthNext(date.slice(0,7));
 const last=card.schedules?.at(-1);if(last&&last.from>=min)min=mkCardMonthNext(last.from);
 return min;
}
function mkCardForm(key){
 const c=mkSettingsDraft.cards.find(x=>x.id===key),rule=c?{...c,...c.schedules?.at(-1)}:null;
 return {name:c?.name||'',close:rule?(rule.monthEnd?'end':String(rule.closeDay)):'end',due:String(rule?.dueDay||27),account:rule?.accountId||'',from:c?mkCardMinMonth(c):''};
}
function mkRenderCards(body){
 const head=document.createElement('div');head.className='mk-settings-add-head';head.append(mkSettingsButton('＋追加',()=>mkSettingsNavigate('cards',{kind:'card',key:''},2),'outline'));body.append(head);
 for(const card of mkSettingsDraft.cards){const row=document.createElement('div');row.className='item';const top=document.createElement('div');top.className='row';const title=document.createElement('strong');title.textContent=card.name;top.append(title,mkSettingsButton('編集',()=>mkSettingsNavigate('cards',{kind:'card',key:card.id},2)));row.append(top);
 const text=r=>'締め日：'+(r.monthEnd?'月末':r.closeDay+'日')+' ／ 引落日：翌月'+r.dueDay+'日';row.append(mkSettingsText(text(card)),mkSettingsText('引落口座：'+mkSettingsDraft.accounts.find(x=>x.id===card.accountId)?.name));
 for(const r of card.schedules||[])row.append(mkSettingsText(r.from.replace('-','年')+'月の引落から：'+text(r)+' ／ '+mkSettingsDraft.accounts.find(x=>x.id===r.accountId)?.name));body.append(row);
 }
}
function mkRenderCardEditor(body){
 const key=mkSettingsEdit.key||'',slot=key||'new';if(!mkCardBuffers[slot]){const initial=mkCardForm(key);mkCardBuffers[slot]={initial,value:structuredClone(initial)}}
 const buffer=mkCardBuffers[slot],v=buffer.value;
 const field=(title,el)=>{const label=document.createElement('label');label.className='mk-settings-form-field';label.textContent=title;label.append(el);body.append(label);return el};
 const name=document.createElement('input');name.id='mkCardName';name.maxLength=60;name.value=v.name;name.oninput=()=>v.name=name.value;field('カード名',name);
 function select(title,id,prop,options){const el=document.createElement('select');el.id=id;for(const [k,n] of options)el.add(new Option(n,k));el.value=v[prop];el.onchange=()=>{v[prop]=el.value;updateMonth()};return field(title,el)}
 select('締め日','mkCardClose','close',[['end','月末'],...Array.from({length:31},(_,i)=>[String(i+1),(i+1)+'日'])]);
 select('引落日（翌月）','mkCardDue','due',Array.from({length:31},(_,i)=>[String(i+1),(i+1)+'日']));
 const accounts=mkSettingsDraft.accounts.filter(a=>a.kind==='bank'||(!a.kind&&a.id!=='cash'&&!mkSettingsDraft.chargeTargets.some(x=>x[0]===a.id)));
 select('引落口座','mkCardAccount','account',[['','選んでください'],...accounts.map(a=>[a.id,a.name])]);
 const month=document.createElement('input');month.type='month';month.id='mkCardFrom';month.value=v.from;if(key)month.min=mkCardMinMonth(mkSettingsDraft.cards.find(c=>c.id===key));month.oninput=()=>v.from=month.value;
 const wrap=field('変更を適用する引落月',month);const note=mkSettingsText('確定・調整済みの請求より後の月から変更できます。','small mk-settings-note');body.append(note);
 function updateMonth(){if(typeof wrap==='undefined')return;const changed=!!key&&['close','due','account'].some(k=>v[k]!==buffer.initial[k]);wrap.hidden=!changed;note.hidden=!changed}
 updateMonth();
 const actions=document.createElement('div');actions.className='mk-card-editor-actions';actions.append(mkSettingsButton('編集を戻す',()=>{delete mkCardBuffers[slot];history.back()}),mkSettingsButton(key?'設定に反映':'設定に追加',()=>mkCommitCard(slot,true),'outline'));body.append(actions);
}
function mkCommitCard(slot,back){
 const buffer=mkCardBuffers[slot];if(!buffer)return true;
 if(!back&&JSON.stringify(buffer.initial)===JSON.stringify(buffer.value)){delete mkCardBuffers[slot];return true}
 const v=buffer.value,name=v.name.trim(),key=slot==='new'?'':slot,c=mkSettingsDraft;
 const fail=message=>{mkSettingsNavigate('cards',{kind:'card',key},2);$('mkSettingsError').textContent=message;return false};
 if(!name||name.length>60||/[<>\u0000-\u001f]/.test(name))return fail('カード名を1〜60文字で入力してください（< > は使えません）。');
 const norm=s=>s.normalize('NFKC').replace(/\s/g,'').toLowerCase();
 if(c.pays.some(([k,n])=>k!==key&&(norm(n)===norm(name)||norm(c.labels[k])===norm(name))))return fail('同じ名前の支払方法が登録されています。');
 const bank=c.accounts.find(a=>a.id===v.account&&(a.kind==='bank'||(!a.kind&&a.id!=='cash'&&!c.chargeTargets.some(x=>x[0]===a.id))));if(!bank)return fail('引落口座を選んでください。');
 const rule={closeDay:v.close==='end'?31:Number(v.close),monthEnd:v.close==='end',dueDay:Number(v.due),accountId:bank.id};
 if(!Number.isInteger(rule.closeDay)||rule.closeDay<1||rule.closeDay>31||!Number.isInteger(rule.dueDay)||rule.dueDay<1||rule.dueDay>31)return fail('締め日・引落日を確認してください。');
 const next=structuredClone(c);
 if(key){const card=next.cards.find(x=>x.id===key);if(!card)return fail('カードが見つかりません。');
 const prev={...card,...card.schedules?.at(-1)},changed=['closeDay','monthEnd','dueDay','accountId'].some(k=>prev[k]!==rule[k]);
 if(changed){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(v.from)||v.from<mkCardMinMonth(card)||v.from>'2199-12')return fail('適用月は '+mkCardMinMonth(card)+' 以降を選んでください。');card.schedules=[...(card.schedules||[]),{from:v.from,...rule}]}
 for(const old of [card.name,next.labels[key]])if(old&&old!==name&&!Object.hasOwn(next.aliases,old))next.aliases[old]=key;
 card.name=name;next.labels[key]=name;for(const pairs of [next.pays,next.rakutenSources,next.recurringSources])for(const pair of pairs)if(pair[0]===key)pair[1]=name;
 }else{
 if(next.cards.length>=200||next.pays.length>=200)return fail('登録できる件数の上限に達しています。');
 let id;do{id='card_'+crypto.randomUUID().replace(/-/g,'')}while(next.pays.some(x=>x[0]===id));
 next.cards.push({id,name,account:bank.name,...rule,known:{}});next.pays.push([id,name]);next.labels[id]=name;next.cardRoutes[id]=id;next.layouts.more.push([id]);next.ui.payOrder.push(id);next.installmentPays.push(id);
 }
 try{mkValidateSettings(next)}catch(e){return fail('設定を確認してください。保存できません。')}
 mkSettingsDraft=next;delete mkCardBuffers[slot];$('mkSettingsError').textContent='';if(back)history.back();return true;
}

// Category split input listeners run after the existing amount/autocalculation handlers.
$('categoryField').insertAdjacentHTML('beforeend','<div id="mkSplits"></div>');mkSplitRender();
['amount','mine','theirs','gross','points'].forEach(id=>$(id).addEventListener('input',()=>mkSplitRefresh()));

// Group accounting is separate from individual loan history grouping (loanGroups).
function mkGroupModePaint(){
 const active=mode==='group'||mode==='loan';
 $('interactionModeBtn').classList.toggle('hidden',mode==='group');
 $('mkGroupModeBtn').classList.toggle('hidden',mode==='loan');
 $('mkGroupTabs').classList.toggle('hidden',mode!=='group');
 $('mkGroupSwitchRow').classList.toggle('hidden',!active);
 $('mkGroupSwitchRow').querySelector('button').textContent=mode==='group'?'個人へ':'グループへ';
 $('loanGroups').classList.toggle('hidden',mode!=='loan');
 $('loanSections').classList.toggle('hidden',mode!=='loan');
}
function mkGroupSwitch(){const m=mode==='group'?'loan':'group';setMode(m,$(m==='loan'?'interactionModeBtn':'mkGroupModeBtn'))}
function mkGroupChooseKind(k){mkGroupKind=k;mkSplitDraft=[];mkSplitRender();updateForm()}
function mkGroupFormPaint(){
 const root=$('mkGroupForm');if(!root)return;
 root.classList.toggle('hidden',mode!=='group');mkGroupModePaint();
 if(mode!=='group'){$('points').closest('.field').classList.remove('hidden');$('discountBtns').closest('.field').classList.remove('hidden');return}
 const bill=mkGroupKind==='bill',mine=moneyNum($('mkGroupMine').value),paid=moneyNum($('mkGroupPaid').value);
 $('normalAmount').classList.add('hidden');$('lendBox').classList.add('hidden');
 $('mkGroupBillFields').classList.toggle('hidden',!bill);$('mkGroupSettlementFields').classList.toggle('hidden',bill);
 $('mkGroupTabs').querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('active',['bill','receive','pay'][i]===mkGroupKind);b.setAttribute('aria-pressed',String(['bill','receive','pay'][i]===mkGroupKind))});
 $('categoryField').classList.toggle('hidden',!bill||mine===0);
 $('paymentField').classList.toggle('hidden',bill&&paid===0);
 $('paymentLabel').textContent=mkGroupKind==='receive'?'受取先':'支払方法';
 $('mkGroupNames').replaceChildren(...mkGroupList().map(g=>{const o=document.createElement('option');o.value=g.name;return o}));
 mkRefreshRakPaySource();
 if(!bill){$('mkRakPaySource')?.classList.add('hidden');$('mkEventTagField').classList.add('hidden');$('mkEventSuggestion').classList.add('hidden')}
 $('points').closest('.field').classList.toggle('hidden',!bill);$('discountBtns').closest('.field').classList.toggle('hidden',!bill);
}
function mkGroupClear(){
 for(const id of ['mkGroupName','mkGroupTotal','mkGroupPaid','mkGroupMine','mkGroupSettlementAmount','mkGroupPerson'])if($(id))$(id).value='';
 $('mkGroupParticipants')?.replaceChildren();
}
function mkGroupAddParticipant(row={},edit=false){
 const host=$(edit?'mkEditGroupParticipants':'mkGroupParticipants'),line=document.createElement('div');line.className='mk-group-person-row';
 for(const [key,label] of [['name','名前'],['paid','支払額'],['share','負担額']]){const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.dataset.groupProp=key;input.setAttribute('aria-label','参加者の'+label);input.value=row[key]??'';if(key==='name')input.maxLength=60;else input.inputMode='numeric';wrap.append(input);line.append(wrap)}
 const remove=document.createElement('button');remove.type='button';remove.className='ghost sm';remove.textContent='×';remove.setAttribute('aria-label','参加者を削除');remove.onclick=()=>line.remove();line.append(remove);host.append(line);
}
function mkGroupParticipants(edit=false){return [...$(edit?'mkEditGroupParticipants':'mkGroupParticipants').children].map(line=>{const get=k=>line.querySelector('[data-group-prop="'+k+'"]').value.trim();return {name:get('name'),paid:mkGroupMoney(get('paid')),share:mkGroupMoney(get('share'))}})}
function mkGroupMoney(v){const text=String(v).replace(/[,，]/g,'').trim();if(!/^\d+$/.test(text))throw Error('金額は0円以上の整数で入力してください。');const n=Number(text);if(!Number.isSafeInteger(n))throw Error('金額が大きすぎます。');return n}
function mkGroupValidate(t,c=mkSettings){
 if(t.groupId===undefined)return;
 const str=x=>typeof x==='string'&&x.trim().length>0&&x.length<=60;
 if(!str(t.groupId)||!str(t.groupName)||!['lend','receive','repay'].includes(t.type)||!mkValidRecordDate(t.date))throw Error('グループ記録の形式が正しくありません。');
 if(!Number.isSafeInteger(t.amount)||t.amount<0)throw Error('金額を確認してください。');
 const hasPay=k=>c.pays.some(x=>x[0]===k);
 if(t.type==='lend'){
  for(const n of [t.groupTotal,t.gross,t.points,t.paid,t.billed])if(!Number.isSafeInteger(n)||n<0)throw Error('会計の金額を確認してください。');
  if(t.groupTotal<1||t.gross>t.groupTotal||t.amount>t.groupTotal||t.points>Math.min(t.gross,t.amount)||t.paid!==t.gross-t.points||!mkValidPaymentDetails(t.points,t.gross,t.discount,t.installments)||t.billed!==Math.round(t.paid*(1-t.discount/100)))throw Error('会計総額・自分の支払・負担・ポイントを確認してください。');
  if(t.amount>0&&!cats.includes(t.category))throw Error('自分の負担分のカテゴリを選んでください。');
  if(t.gross>0&&!hasPay(t.payment))throw Error('支払方法を選んでください。');
  if(t.payment==='rakutenpay'&&!c.rakutenSources.some(x=>x[0]===t.rakutenPaySource))throw Error('楽天Payの支払元を選んでください。');
  if(!Array.isArray(t.groupParticipants)||t.groupParticipants.length>100)throw Error('参加者の内訳を確認してください。');
  const names=new Set();let paid=BigInt(t.gross),share=BigInt(t.amount);
  for(const r of t.groupParticipants){if(!str(r.name)||names.has(r.name)||!Number.isSafeInteger(r.paid)||r.paid<0||!Number.isSafeInteger(r.share)||r.share<0)throw Error('参加者名の重複や金額を確認してください。');names.add(r.name);paid+=BigInt(r.paid);share+=BigInt(r.share)}
  if(t.groupParticipants.length&&(paid!==BigInt(t.groupTotal)||share!==BigInt(t.groupTotal)))throw Error('参加者の内訳は、自分を含めた支払額・負担額をそれぞれ会計総額に合わせてください。');
 }else if(t.amount<1||!str(t.person)||!c.accounts.some(x=>x.id===t.payment))throw Error('相手・金額・実際にお金が動く口座や残高を選んでください。');
 mkValidateSplits(t);
}
function mkGroupCollect(edit=false,original=null){
 const get=id=>$(edit?'edit'+id[0].toUpperCase()+id.slice(1):'mkGroup'+id).value;
 const bill=original?original.type==='lend':mkGroupKind==='bill';
 const name=get('Name').trim(),prior=mkGroupList().find(g=>g.name===name);
 const t={id:original?.id||'tx'+crypto.randomUUID(),date:edit?$('editDate').value:$('date').value,type:bill?'lend':original?.type||(mkGroupKind==='receive'?'receive':'repay'),groupId:prior?.id||'grp'+crypto.randomUUID(),groupName:name,memo:edit?$('editMemo').value.trim():$('memo').value.trim(),payment:edit?$('editPayment').value:payment,person:bill?'':get('Person').trim(),amount:bill?mkGroupMoney(get('Mine')):mkGroupMoney(get('SettlementAmount'))};
 if(original)t.groupId=prior?.id||(name===original.groupName?original.groupId:t.groupId);
 if(bill){t.groupTotal=mkGroupMoney(get('Total'));t.gross=mkGroupMoney(get('Paid'));t.points=Number($(edit?'editPoints':'points').value||0);t.discount=edit?Number($('editDiscount').value):disc();t.installments=edit?Number($('editInstallments').value):installments;t.paid=t.gross-t.points;t.billed=Math.round(t.paid*(1-t.discount/100));t.other=0;t.category=t.amount>0?(edit?$('editCategory').value:category):'';t.eventTag=edit?$('editEvent').value:eventTag;t.rakutenPaySource=t.payment==='rakutenpay'?(edit?$('editRakPaySource').value:rakutenPaySource):undefined;t.groupParticipants=mkGroupParticipants(edit);
  if(t.gross===0){t.payment='';delete t.rakutenPaySource}
  if(t.amount>0){const rows=mkSplitCollect(edit);if(rows){t.categorySplits=rows;t.category=rows[0].category}}
 }
 mkGroupValidate(t);return t;
}
function mkGroupSave(){
 let t;try{t=mkGroupCollect();if(t.type==='lend'&&mkTxPayAccount(t)==='rakutencash'&&mkRakCashAvailable()<mkTxPaid(t))throw Error('楽天Pay残高が不足しています。');}catch(e){return err(e.message)}
 txs.unshift(t);applyTxEffect(t);renderAll();$('goLoansBtn').classList.remove('hidden');$('savedModal').classList.remove('hidden');
}
function mkGroupEdit(t){
 editingId=t.id;const bill=t.type==='lend';$('editRecordKind').textContent='｜'+recordTitle(t);
 const field=(label,id,value,type='text')=>`<div class="field"><label>${label}</label><input id="${id}" type="${type}" value="${safeHtml(String(value??''))}" ${type==='text'?'inputmode="'+(id==='editName'||id==='editPerson'?'text':'numeric')+'"':''}></div>`;
 let h=field('日付','editDate',t.date,'date')+field('グループ名','editName',t.groupName);
 if(bill){h+=field('会計総額（ポイント利用前）','editTotal',t.groupTotal)+`<div class="grid2">${field('自分の支払（ポイント利用前）','editPaid',t.gross)}${field('自分の負担（ポイント利用前）','editMine',t.amount)}</div><div class="field"><label>カテゴリ</label><select id="editCategory"><option value="">選んでください</option>${selectOptions(cats.map(c=>[c,c]),t.category)}</select></div>`}
 else h+=`<div class="grid2">${field('金額','editSettlementAmount',t.amount)}${field('相手','editPerson',t.person)}</div>`;
 const options=bill?pays:mkSettings.accounts.map(x=>[x.id,x.name]);
 h+=`<div class="field"><label>${t.type==='receive'?'受取先':'支払方法'}</label><select id="editPayment"><option value="">選んでください</option>${selectOptions(options,t.payment)}</select></div>`;
 if(bill)h+=`<details class="mk-edit-details"><summary>詳細設定</summary><div class="grid2">${field('ポイント使用','editPoints',t.points,'number')}${field('引落時割引（%）','editDiscount',t.discount,'number')}</div><div class="field"><label>分割回数</label><select id="editInstallments">${selectOptions([[1,'1回'],[2,'2回'],[3,'3回'],[6,'6回']],t.installments)}</select></div><div class="field"><label>楽天Payの支払元</label><select id="editRakPaySource">${selectOptions(mkSettings.rakutenSources,t.rakutenPaySource||'')}</select></div><div class="field"><label>特別費イベント</label><select id="editEvent"><option value="">なし</option>${selectOptions([...new Set([...eventsData.map(e=>e.name),t.eventTag].filter(Boolean))].map(n=>[n,n]),t.eventTag)}</select></div><div id="mkEditGroupParticipants"></div><button type="button" class="outline sm" onclick="mkGroupAddParticipant({},true)">＋ 参加者</button></details>`;
 h+=`<div class="field"><label>店名・メモ</label><input id="editMemo" value="${safeHtml(t.memo||'')}"></div>`;
 $('editBody').innerHTML=h;if(bill){t.groupParticipants.forEach(r=>mkGroupAddParticipant(r,true));mkSplitSetupEdit(t)}
 $('editError').textContent='';$('editModal').classList.remove('hidden');
}
function mkGroupSaveEdit(original){
 let t;try{t=mkGroupCollect(true,original);if(t.type==='lend'&&mkTxPayAccount(t)==='rakutencash'&&mkRakCashAvailable(original)<mkTxPaid(t))throw Error('楽天Pay残高が不足しています。');}catch(e){$('editError').textContent=e.message;return}
 // Validate before reversing any effects. Preserve bill overrides/tracking metadata.
 const next={...original,...t};delete next.categorySplits;if(t.categorySplits)next.categorySplits=t.categorySplits;
 reverseTxEffect(original);for(const k of Object.keys(original))delete original[k];Object.assign(original,next);applyTxEffect(original);closeEditRecord();renderAll();
}
function mkGroupList(){
 const map=new Map();for(const t of [...txs].reverse()){if(!t.groupId)continue;if(!map.has(t.groupId))map.set(t.groupId,{id:t.groupId,name:t.groupName,net:0,rows:[]});const g=map.get(t.groupId);g.name=t.groupName;g.rows.unshift(t);g.net+=t.type==='lend'?t.gross-t.amount:t.type==='receive'?-t.amount:t.amount}
 return [...map.values()];
}
function mkGroupBalanceText(net){return net>0?'受取残額 '+yen(net):net<0?'支払残額 '+yen(-net):'清算済み'}
function mkGroupShowLoans(on){mkGroupLoanView=on;renderLoans()}
function mkGroupLoanPaint(){
 $('mkGroupLoanTabs').querySelectorAll('button').forEach((b,i)=>b.classList.toggle('active',!!i===mkGroupLoanView));
 $('loanPersonTabs').classList.toggle('hidden',mkGroupLoanView);if(!mkGroupLoanView)return;
 const groups=mkGroupList();$('loanSummary').innerHTML='';
 if(!groups.length){$('loanSummary').textContent='まだグループの記録はありません。';return}
 for(const g of groups){const card=document.createElement('div');card.className='card';const head=document.createElement('button');head.type='button';head.className='mk-group-card-head';head.setAttribute('aria-expanded',String(mkGroupExpanded===g.id));head.textContent=g.name+'　'+mkGroupBalanceText(g.net)+'　'+(mkGroupExpanded===g.id?'▲':'▼');head.onclick=()=>{mkGroupExpanded=mkGroupExpanded===g.id?'':g.id;renderLoans()};card.append(head);
 if(mkGroupExpanded===g.id){const actions=document.createElement('div');actions.className='choice-row';for(const [kind,title] of [['bill','会計を記録'],['receive','受け取った'],['pay','支払った']]){const b=document.createElement('button');b.type='button';b.className='outline sm';b.textContent=title;b.onclick=()=>{nav('record',null);setMode('group',$('mkGroupModeBtn'));mkGroupChooseKind(kind);$('mkGroupName').value=g.name};actions.append(b)}card.append(actions);
 for(const t of g.rows){const row=document.createElement('div');row.className='item';const text=document.createElement('div');text.textContent=t.date+'・'+recordTitle(t)+' '+yen(txAmount(t));const meta=document.createElement('div');meta.className='small';meta.textContent=recordMeta(t);row.append(text,meta);
 if(t.groupParticipants?.length){const names=document.createElement('div');names.className='small';names.textContent=t.groupParticipants.map(r=>r.name+'：支払 '+yen(r.paid)+'／負担 '+yen(r.share)).join('・');row.append(names)}
 const edit=document.createElement('button');edit.type='button';edit.className='ghost sm';edit.textContent='編集';edit.onclick=()=>editRecord(t.id);const del=document.createElement('button');del.type='button';del.className='ghost sm danger';del.textContent='削除';del.onclick=()=>deleteHistoryRecord(t.id);row.append(edit,del);card.append(row)}}$('loanSummary').append(card)}
}
// New numeric fields update visibility and split calculations without erasing input.
for(const id of ['mkGroupMine','mkGroupPaid'])$(id).addEventListener('input',()=>{mkGroupFormPaint();mkSplitRefresh();mkCandidateRender()});
mkGroupFormPaint();
