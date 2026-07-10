/* store.js — 永続化層：localStorageキー・状態・評価データの読み書き・バックアップ */
/* ==============================================================
   グローバル状態
   ============================================================== */
const BKEY='pig_eval_active_barn';
let activeBarn=localStorage.getItem(BKEY)||'farrow';
if(!BARNS.some(b=>b.key===activeBarn)){activeBarn='farrow';localStorage.setItem(BKEY,activeBarn);}
let SKEY,CKEY;
// 分娩舎は既存データを引き継ぐため従来キーを使用、他舎は舎別キー
function keysFor(key){
  return key==='farrow'
    ?{s:'pig_farm_evaluation_v1',c:'pig_farm_eval_items_v1'}
    :{s:'pig_eval_'+key+'_data_v1',c:'pig_eval_'+key+'_items_v1'};
}
function applyBarnKeys(){const k=keysFor(activeBarn);SKEY=k.s;CKEY=k.c}
applyBarnKeys();
let cfg=loadCfg();

/* 評価モード（barn=豚舎別 / work=作業）と作業選択の状態 */
const MKEY='pig_eval_mode',WSEL_KEY='pig_eval_work_sel';
const WORK_SKEY='pig_work_eval_data_v1';   // 作業評価の評価データ（全社共通・豚舎に依存しない）
let evalMode=localStorage.getItem(MKEY)==='work'?'work':'barn';
let workSelId=localStorage.getItem(WSEL_KEY)||'';
let workCatId='';
if(workSelId){const w=workById(workSelId);workCatId=w?w.category:'';if(!w)workSelId='';}

function loadCfg(){try{const r=localStorage.getItem(CKEY);return r?JSON.parse(r):defaultCfg()}catch{return defaultCfg()}}
/* 採点対象の項目・セクション（モードで切替） */
function getItems(){return evalMode==='work'?(workSelId?workItems(workSelId):[]):cfg.items}
function getSections(){
  if(evalMode==='work')return workSelId?[{id:'specific',name:t('secSpecific')},{id:'common',name:t('secCommon')}]:[];
  return cfg.sections;
}
/* 項目の評価基準を正規化して返す（barn=豚舎基準 / work=観点のlevels）。無ければnull */
function getCriteria(it){
  if(evalMode==='work')return it.levels?{kanten:it.kanten,levels:it.levels}:null;
  const cr=criteriaFor(it.id);
  return cr?{kanten:cr.kanten,levels:[cr.level1,cr.level2,cr.level3,cr.level4,cr.level5]}:null;
}
/* 現在モードの評価データ保存キー */
function curDataKey(){return evalMode==='work'?WORK_SKEY:SKEY}
/* 履歴レコードの作業から観点名を引く（採点表示・詳細用。基準文は不要） */
function itemsForRecord(rec){
  if(evalMode==='work'||rec&&rec.workId){return rec&&rec.workId?workItems(rec.workId):[]}
  return getItems();
}

/* ==============================================================
   データ
   ============================================================== */
function getAll(){try{const r=localStorage.getItem(curDataKey());return r?JSON.parse(r).evaluations||[]:[]}catch{return[]}}

/* ==============================================================
   評価項目の書き出し / 読み込み（別PC間で項目を共有）
   ============================================================== */
/* 現在の評価項目をJSONファイルとして書き出す */
function exportCfg(){
  const payload={_type:'pig_farm_eval_config',version:1,exportedAt:new Date().toISOString(),cfg:{sections:cfg.sections,items:cfg.items}};
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8;'}));
  a.download='hss_eval_items_'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'.json';
  a.click();URL.revokeObjectURL(a.href);
  toast(t('cfgExported'));
}
/* ファイルから評価項目を読み込んで上書きする */
function importCfg(input){
  const file=input.files&&input.files[0];if(!file)return;
  const rd=new FileReader();
  rd.onload=()=>{
    let data;
    try{data=JSON.parse(rd.result)}catch{toast(t('eImpCfg'),1);input.value='';return}
    // 書き出し形式（_type付き）と素のcfg形式の両方を受け付ける
    const c=data&&data._type==='pig_farm_eval_config'?data.cfg:data;
    if(!validCfg(c)){toast(t('eImpCfg'),1);input.value='';return}
    if(!confirm(t('cImpCfg'))){input.value='';return}
    cfg={sections:c.sections.map(s=>({id:sanitizeId(s.id),name:String(s.name||'')})),
         items:c.items.map(it=>({id:sanitizeId(it.id),secId:sanitizeId(it.secId),name:String(it.name||''),desc:String(it.desc||'')}))};
    localStorage.setItem(CKEY,JSON.stringify(cfg));
    buildCfgUI();buildCards();restoreSt();
    toast(t('cfgImported'));
    input.value='';
  };
  rd.onerror=()=>{toast(t('eImpCfg'),1);input.value=''};
  rd.readAsText(file,'utf-8');
}
/* 読み込みデータの最低限の妥当性チェック */
function validCfg(c){
  if(!c||!Array.isArray(c.sections)||!Array.isArray(c.items))return false;
  if(!c.sections.length||!c.items.length)return false;
  if(!c.sections.every(s=>s&&s.id!=null&&'name'in s))return false;
  if(!c.items.every(it=>it&&it.id!=null&&it.secId!=null&&'name'in it))return false;
  return true;
}

/* ==============================================================
   全データのバックアップ / 復元（全豚舎の評価＋項目を1ファイルに）
   ============================================================== */
function exportAll(){
  const payload={_type:'pig_farm_eval_backup',version:1,exportedAt:new Date().toISOString(),barns:{}};
  BARNS.forEach(b=>{
    const k=keysFor(b.key);
    let data=null,items=null;
    try{data=JSON.parse(localStorage.getItem(k.s))}catch{}
    try{items=JSON.parse(localStorage.getItem(k.c))}catch{}
    payload.barns[b.key]={data,items};
  });
  // 作業評価データ（全社共通・1テーブル）
  try{payload.workEval=JSON.parse(localStorage.getItem(WORK_SKEY))||{evaluations:[]}}catch{payload.workEval={evaluations:[]}}
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8;'}));
  a.download='hss_eval_backup_'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'.json';
  a.click();URL.revokeObjectURL(a.href);
  toast(t('tBackupExp'));
}
function validRec(r){return r&&typeof r==='object'&&typeof r.id==='string'&&typeof r.date==='string'&&r.scores&&typeof r.scores==='object'}
function importAll(input){
  const file=input.files&&input.files[0];if(!file)return;
  const rd=new FileReader();
  rd.onload=()=>{
    let data;
    try{data=JSON.parse(rd.result)}catch{toast(t('eImpCfg'),1);input.value='';return}
    if(!data||data._type!=='pig_farm_eval_backup'||!data.barns||typeof data.barns!=='object'){toast(t('eImpCfg'),1);input.value='';return}
    if(!confirm(t('cImpAll'))){input.value='';return}
    let added=0;
    BARNS.forEach(b=>{
      const src=data.barns[b.key];if(!src)return;
      const k=keysFor(b.key);
      // 評価データ：既存に無いIDだけ追加（マージ）
      const evs=src.data&&Array.isArray(src.data.evaluations)?src.data.evaluations.filter(validRec):[];
      if(evs.length){
        let cur=[];try{const r=localStorage.getItem(k.s);cur=r?JSON.parse(r).evaluations||[]:[]}catch{}
        const ids=new Set(cur.map(e=>e.id));
        evs.forEach(e=>{const id=sanitizeId(e.id);if(!ids.has(id)){cur.push({...e,id});added++}});
        localStorage.setItem(k.s,JSON.stringify({evaluations:cur}));
      }
      // 評価項目：ファイル側があれば上書き（IDはサニタイズ）
      if(src.items&&validCfg(src.items)){
        const c={sections:src.items.sections.map(s=>({id:sanitizeId(s.id),name:String(s.name||'')})),
                 items:src.items.items.map(it=>({id:sanitizeId(it.id),secId:sanitizeId(it.secId),name:String(it.name||''),desc:String(it.desc||'')}))};
        localStorage.setItem(k.c,JSON.stringify(c));
      }
    });
    // 作業評価データも同じマージ方式で復元
    const wevs=data.workEval&&Array.isArray(data.workEval.evaluations)?data.workEval.evaluations.filter(validRec):[];
    if(wevs.length){
      let cur=[];try{const r=localStorage.getItem(WORK_SKEY);cur=r?JSON.parse(r).evaluations||[]:[]}catch{}
      const ids=new Set(cur.map(e=>e.id));
      wevs.forEach(e=>{const id=sanitizeId(e.id);if(!ids.has(id)){cur.push({...e,id});added++}});
      localStorage.setItem(WORK_SKEY,JSON.stringify({evaluations:cur}));
    }
    cfg=loadCfg();
    buildCfgUI();buildCards();refreshSel();drawHist();
    toast(t('tBackupImp')+' (+'+added+')');
    input.value='';
  };
  rd.onerror=()=>{toast(t('eImpCfg'),1);input.value=''};
  rd.readAsText(file,'utf-8');
}
