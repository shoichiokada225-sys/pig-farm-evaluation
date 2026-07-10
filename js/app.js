/* app.js — アプリ層：初期化・モード/豚舎/作業切替・入力/保存/編集フロー */
/* ==============================================================
   言語
   ============================================================== */
function setLang(l){
  lang=l;localStorage.setItem(LKEY,l);document.documentElement.lang=l;
  document.querySelectorAll('.lsw button').forEach(b=>b.classList.toggle('on',b.textContent.trim()==={ja:'JP',en:'EN',vi:'VI',id:'ID'}[l]));
  applyT();buildCards();restoreSt();buildCfgUI();
  if(evalMode==='work'){populateWorkCat();populateWorkSel();}
}
function applyT(){
  document.querySelectorAll('[data-t]').forEach(el=>{el.textContent=t(el.dataset.t)});
  document.querySelectorAll('[data-ph]').forEach(el=>{el.placeholder=t(el.dataset.ph)});
  document.getElementById('btnSave').textContent=editId?t('btnUpdate'):t('btnSave');
}

/* ==============================================================
   初期化
   ============================================================== */
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('fDate').value=new Date().toISOString().split('T')[0];
  populateBarnSel();
  applyModeUI();
  if(evalMode==='work'){populateWorkCat();populateWorkSel();}
  setLang(lang);
  restoreDraft();
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
  refreshSel();
  // 進捗バーをヘッダー直下に固定
  const fixProg=()=>{const p=document.querySelector('.prog');if(p)p.style.top=document.querySelector('.hdr').offsetHeight+'px'};
  fixProg();window.addEventListener('resize',fixProg);
  // PWA（GitHub Pages等のhttps配信時のみ）
  if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
});

/* ==============================================================
   入力変更
   ============================================================== */
function onCh(){dirty=true;clearTimeout(autoT);autoT=setTimeout(saveDraft,300)}
['fDate','fEv','fEe','fOv'].forEach(id=>document.getElementById(id).addEventListener('input',onCh));
/* 下書き保存キー（作業評価は作業ごとに分ける） */
function draftKey(){return curDataKey()+'_draft'+(evalMode==='work'?('_'+workSelId):'')}
function saveDraft(){if(evalMode==='work'&&!workSelId)return;const d=collectForm();d._editId=editId;localStorage.setItem(draftKey(),JSON.stringify(d))}
function collectForm(){
  const sc={},cm={};
  getItems().forEach(it=>{
    const b=document.querySelector('.sb[data-id="'+it.id+'"].sel');sc[it.id]=b?+b.dataset.s:null;
    const ta=document.querySelector('textarea[data-cid="'+it.id+'"]');cm[it.id]=ta?ta.value:'';
  });
  return{date:document.getElementById('fDate').value,evaluator:document.getElementById('fEv').value,evaluatee:document.getElementById('fEe').value,scores:sc,comments:cm,overall:document.getElementById('fOv').value};
}

/* ==============================================================
   保存
   ============================================================== */
function doSave(){
  const d=collectForm();
  if(!d.evaluator.trim()||!d.evaluatee.trim()){toast(t('eNm'),1);return}
  if(!d.date){toast(t('eDt'),1);return}
  const miss=getItems().filter(it=>d.scores[it.id]===null);
  if(miss.length){miss.forEach(it=>{const c=document.getElementById('c-'+it.id);c.classList.add('warn');setTimeout(()=>c.classList.remove('warn'),1000)});
    toast(t('eSc')+'('+miss.length+')',1);document.getElementById('c-'+miss[0].id).scrollIntoView({behavior:'smooth',block:'center'});return}
  // 作業評価は評価対象の作業情報を付与
  let wf={};
  if(evalMode==='work'){const w=workById(workSelId);if(!w){toast(t('selWork'),1);return}wf={workId:w.id,workName:w.name,category:w.category};}
  const key=curDataKey(),all=getAll();
  if(editId){
    const idx=all.findIndex(e=>e.id===editId);
    if(idx!==-1)all[idx]={...all[idx],...wf,date:d.date,evaluator:d.evaluator.trim(),evaluatee:d.evaluatee.trim(),scores:d.scores,comments:d.comments,overall:d.overall,updatedAt:new Date().toISOString()};
    localStorage.setItem(key,JSON.stringify({evaluations:all}));toast(t('tUpdated'));exitEdit();
  }else{
    all.push({id:crypto.randomUUID(),...wf,date:d.date,evaluator:d.evaluator.trim(),evaluatee:d.evaluatee.trim(),scores:d.scores,comments:d.comments,overall:d.overall,createdAt:new Date().toISOString()});
    localStorage.setItem(key,JSON.stringify({evaluations:all}));toast(t('tSaved'));
  }
  localStorage.removeItem(draftKey());dirty=false;refreshSel();
}

/* ==============================================================
   編集モード
   ============================================================== */
function startEdit(id){
  const rec=getAll().find(e=>e.id===id);if(!rec)return;
  editId=id;closeMo();
  // 作業評価のレコードは、そのレコードの作業に切り替えてから復元
  if(evalMode==='work'&&rec.workId&&rec.workId!==workSelId){
    const w=workById(rec.workId);if(!w){toast(t('eImpCfg'),1);exitEdit();return}
    workSelId=w.id;workCatId=w.category;localStorage.setItem(WSEL_KEY,w.id);
    populateWorkCat();populateWorkSel();buildCards();
  }
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('on'));
  document.querySelector('[data-pg="pgIn"]').classList.add('on');
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));
  document.getElementById('pgIn').classList.add('on');
  document.getElementById('fDate').value=rec.date;
  document.getElementById('fEv').value=rec.evaluator;
  document.getElementById('fEe').value=rec.evaluatee;
  document.getElementById('fOv').value=rec.overall||'';
  document.querySelectorAll('.sb.sel,.crit-lv.sel').forEach(b=>b.classList.remove('sel'));
  document.querySelectorAll('.ec.scored').forEach(c=>c.classList.remove('scored'));
  getItems().forEach(it=>{
    const sc=rec.scores[it.id];if(sc)setScoreUI(it.id,sc);
    const ta=document.querySelector('textarea[data-cid="'+it.id+'"]');if(ta)ta.value=rec.comments[it.id]||'';
  });
  document.getElementById('editBar').classList.add('show');
  document.getElementById('btnSave').textContent=t('btnUpdate');
  window.scrollTo({top:0,behavior:'smooth'});dirty=false;updProg();
}
function cancelEdit(){if(dirty&&!confirm(t('cCEdit')))return;exitEdit();clearForm()}
function exitEdit(){editId=null;document.getElementById('editBar').classList.remove('show');document.getElementById('btnSave').textContent=t('btnSave')}
function doReset(){if(!confirm(t('cReset')))return;clearForm();if(editId)exitEdit();toast(t('tReset'))}
function clearForm(keepDraft){
  document.getElementById('fDate').value=new Date().toISOString().split('T')[0];
  ['fEv','fEe','fOv'].forEach(id=>document.getElementById(id).value='');
  document.querySelectorAll('.sb.sel,.crit-lv.sel').forEach(b=>b.classList.remove('sel'));
  document.querySelectorAll('.ec.scored').forEach(c=>c.classList.remove('scored'));
  document.querySelectorAll('.ec textarea').forEach(ta=>ta.value='');
  if(!keepDraft)localStorage.removeItem(draftKey());
  dirty=false;updProg();
}
/* 下書きの復元（リロード・豚舎切替後に入力途中の内容を戻す） */
function restoreDraft(){
  if(evalMode==='work'&&!workSelId)return;
  let d=null;try{d=JSON.parse(localStorage.getItem(draftKey()))}catch{}
  if(!d)return;
  const hasContent=(d.evaluator||'').trim()||(d.evaluatee||'').trim()||(d.overall||'').trim()
    ||Object.values(d.scores||{}).some(v=>v!=null)
    ||Object.values(d.comments||{}).some(v=>(v||'').trim());
  if(!hasContent)return;
  if(d.date)document.getElementById('fDate').value=d.date;
  document.getElementById('fEv').value=d.evaluator||'';
  document.getElementById('fEe').value=d.evaluatee||'';
  document.getElementById('fOv').value=d.overall||'';
  getItems().forEach(it=>{
    const sc=d.scores&&d.scores[it.id];if(sc)setScoreUI(it.id,sc);
    const ta=document.querySelector('textarea[data-cid="'+it.id+'"]');if(ta)ta.value=(d.comments&&d.comments[it.id])||'';
  });
  if(d._editId&&getAll().some(e=>e.id===d._editId)){
    editId=d._editId;
    document.getElementById('editBar').classList.add('show');
    document.getElementById('btnSave').textContent=t('btnUpdate');
  }
  updProg();toast(t('tDraft'));
}

/* ==============================================================
   タブ
   ============================================================== */
let cfgUnlocked=false;
function swTab(btn){
  // 設定タブはパスワード認証が必要
  if(btn.dataset.pg==='pgCfg'&&!cfgUnlocked){
    const pw=prompt(lang==='ja'?'設定画面のパスワードを入力してください':'Enter password for settings:');
    if(!pw||pw.toUpperCase()!=='OOIRI'){toast(lang==='ja'?'パスワードが違います':'Wrong password',1);return}
    cfgUnlocked=true;
  }
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));
  document.getElementById(btn.dataset.pg).classList.add('on');
  if(btn.dataset.pg==='pgHi'){refreshSel();drawHist()}
  if(btn.dataset.pg==='pgCh'){refreshSel();drawCharts()}
  if(btn.dataset.pg==='pgCfg')buildCfgUI();
}
function refreshSel(){
  const ns=[...new Set(getAll().map(e=>e.evaluatee))].sort();
  const hf=document.getElementById('hFil'),hv=hf.value;
  hf.innerHTML=`<option value="">${t('filterAll')}</option>`+ns.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');hf.value=hv;
  const cs=document.getElementById('chSel'),cv=cs.value;
  cs.innerHTML=`<option value="">${t('selPh')}</option>`+ns.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');cs.value=cv;
}

/* ==============================================================
   豚舎の切り替え（統合アプリ・舎ごとにデータ分離）
   ============================================================== */
function populateBarnSel(){
  const sel=document.getElementById('barnSel');if(!sel)return;
  sel.innerHTML=BARNS.map(b=>`<option value="${b.key}">${esc(b.name)}</option>`).join('');
  sel.value=activeBarn;
}
function setBarn(key){
  if(key===activeBarn)return;
  if(dirty&&!confirm(t('cCEdit'))){document.getElementById('barnSel').value=activeBarn;return}
  if(editId)exitEdit();
  activeBarn=key;localStorage.setItem(BKEY,key);
  applyBarnKeys();
  cfg=loadCfg();
  clearForm(true);
  applyT();buildCards();refreshSel();
  restoreDraft();
  const cur=document.querySelector('.tabs button.on');
  if(cur&&cur.dataset.pg==='pgCfg')buildCfgUI();
  if(cur&&cur.dataset.pg==='pgHi')drawHist();
  if(cur&&cur.dataset.pg==='pgCh')drawCharts();
  toast(barnDef(key).name);
}

/* ==============================================================
   評価モード（豚舎別 / 作業）の切替と作業選択
   ============================================================== */
function applyModeUI(){
  document.getElementById('modeBarn').classList.toggle('on',evalMode==='barn');
  document.getElementById('modeWork').classList.toggle('on',evalMode==='work');
  document.getElementById('barnbar').style.display=evalMode==='barn'?'':'none';
  document.getElementById('workbar').style.display=evalMode==='work'?'flex':'none';
}
function setMode(m){
  if(m===evalMode)return;
  if(dirty&&!confirm(t('cCEdit')))return;
  if(editId)exitEdit();
  evalMode=m;localStorage.setItem(MKEY,m);
  applyModeUI();
  if(m==='work'){populateWorkCat();populateWorkSel();}
  clearForm(true);
  buildCards();refreshSel();restoreDraft();
  const cur=document.querySelector('.tabs button.on');
  if(cur&&cur.dataset.pg==='pgHi')drawHist();
  if(cur&&cur.dataset.pg==='pgCh')drawCharts();
}
function populateWorkCat(){
  const sel=document.getElementById('workCatSel');if(!sel)return;
  sel.innerHTML=`<option value="">${t('selCat')}</option>`+
    WORKDATA.categories.map(c=>`<option value="${esc(c.id)}">${esc(catLabel(c.id))}</option>`).join('');
  sel.value=workCatId;
}
function setWorkCat(catId){
  if(dirty&&!confirm(t('cCEdit'))){document.getElementById('workCatSel').value=workCatId;return}
  if(editId)exitEdit();
  workCatId=catId;workSelId='';localStorage.setItem(WSEL_KEY,'');
  populateWorkSel();clearForm(true);buildCards();
}
function populateWorkSel(){
  const sel=document.getElementById('workSel');if(!sel)return;
  const ws=workCatId?worksInCat(workCatId):[];
  sel.innerHTML=`<option value="">${t('selWork')}</option>`+
    ws.map(w=>`<option value="${esc(w.id)}">${esc(w.name)}</option>`).join('');
  sel.value=workSelId;
}
function setWork(workId){
  if(workId===workSelId)return;
  if(dirty&&!confirm(t('cCEdit'))){document.getElementById('workSel').value=workSelId;return}
  if(editId)exitEdit();
  workSelId=workId;localStorage.setItem(WSEL_KEY,workId);
  clearForm(true);buildCards();refreshSel();restoreDraft();
}

let dirty=false,editId=null,autoT=null;
