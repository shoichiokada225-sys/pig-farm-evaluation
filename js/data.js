/* data.js — 静的データ層：豚舎/評価基準/作業カタログ（埋め込みJSONの読込とアクセサ） */
/* ==============================================================
   デフォルト評価項目
   ============================================================== */
const BARNS=[
 {key:'farrow',name:'分娩舎',secA:'分娩舎業務',items:[
   ['母豚の健康観察','食欲・行動・乳房状態の確認、異常の有無'],
   ['分娩介助の対応','介助タイミング、難産時の処置、分娩記録の正確性'],
   ['子豚のケア','初乳給与、去勢・歯切り・断尾・体重測定などの処置'],
   ['哺乳・離乳管理','人工哺乳、里子調整、離乳作業の段取り'],
   ['衛生管理・消毒','豚房清掃、器具消毒、防疫意識'],
   ['環境管理','温度・湿度・換気・保温灯の調整'],
   ['異常の早期発見と報告','疾病・事故・死亡の早期察知と報連相']]},
 {key:'stall',name:'ストール舎',secA:'ストール舎業務',items:[
   ['発情発見・種付けのタイミング','発情観察、人工授精・交配の的確さとタイミング'],
   ['妊娠鑑定・再発チェック','不受胎・流産の早期発見、再種付けの管理'],
   ['母豚の体況管理','ボディコンディション、給餌量の調整、削痩・過肥の防止'],
   ['給餌・給水管理','飼料の種類・量の管理、給水器の点検'],
   ['母豚の健康観察','肢蹄・乳房・外陰部の異常、跛行の確認'],
   ['衛生管理・消毒','ストール清掃、器具消毒、防疫意識'],
   ['異常の早期発見と報告','疾病・事故・発情戻りの早期察知と報連相']]},
 {key:'finish',name:'肥育舎',secA:'肥育舎業務',items:[
   ['飼料・給餌管理','飼料切替の段取り、給餌器の調整、残飼・こぼれの管理'],
   ['飲水・給水設備の管理','ニップルの点検、水量・水質の確認'],
   ['増体・発育の観察','成長のばらつき、発育不良豚の選別と対応'],
   ['健康観察・疾病対応','呼吸器・消化器症状、尾かじり等の早期発見と対応'],
   ['出荷管理','出荷適期の判断、体重測定、選別・積込の段取り'],
   ['衛生管理・消毒','豚房清掃、オールイン・オールアウト、防疫意識'],
   ['環境管理','温度・湿度・換気・飼養密度の調整']]},
 {key:'nursery',name:'子豚舎（離乳舎）',secA:'子豚舎（離乳舎）業務',items:[
   ['離乳豚の導入・馴致','移動時のストレス軽減、給餌・給水への誘導'],
   ['飼料・給餌管理','離乳食の切替、少量多回給与、食い込みの確認'],
   ['飲水管理','給水器の高さ・水量、脱水の防止'],
   ['子豚の健康観察','下痢・呼吸器症状・削痩の早期発見'],
   ['発育不良豚のケア','はじかれ豚の管理、群分け・別飼いの対応'],
   ['環境管理','保温、温度ムラ・すきま風の防止、換気'],
   ['衛生管理・消毒','豚房清掃、オールイン・オールアウト、防疫意識']]}
];
const COMMON_B=[
 ['item8','時間厳守・出勤態度','始業前準備、遅刻欠勤、身だしなみ'],
 ['item9','報連相とチームワーク','情報共有、協力姿勢、引き継ぎの正確さ'],
 ['item10','改善意識・学習姿勢','提案、振り返り、新しい知識の習得意欲']
];
function barnDef(key){return BARNS.find(b=>b.key===key)||BARNS[0]}
function defaultCfg(){
  const b=barnDef(activeBarn);
  return{sections:[{id:'A',name:b.secA},{id:'B',name:'仕事への姿勢'}],
    items:[...b.items.map((it,i)=>({id:'item'+(i+1),secId:'A',name:it[0],desc:it[1]})),
           ...COMMON_B.map(c=>({id:c[0],secId:'B',name:c[1],desc:c[2]}))]};
}

/* ==============================================================
   評価基準（criteria-data.json を build_html.py で埋め込み）
   デフォルト項目ID（item1〜7=舎別業務、item8〜10=仕事への姿勢）に対応。
   利用者が追加したカスタム項目には基準がないためボタン非表示。
   ============================================================== */
let CRITERIA=[];
try{CRITERIA=JSON.parse(document.getElementById('criteriaData').textContent)||[]}catch{CRITERIA=[]}
function criteriaFor(itemId){
  const m=/^item(\d+)$/.exec(itemId);if(!m)return null;
  const n=+m[1];
  if(n>=1&&n<=7){const b=CRITERIA.find(x=>x.key===activeBarn);return b&&b.items[n-1]||null}
  if(n>=8&&n<=10){const a=CRITERIA.find(x=>x.key==='attitude');return a&&a.items[n-8]||null}
  return null;
}

/* ==============================================================
   作業評価データ（work-criteria.json + works-data.json を build_html.py で埋め込み）
   大項目=作業（カテゴリ7分類）、小項目=固有観点＋共通観点、各観点にレベル1〜5基準
   ============================================================== */
let WORKDATA={};
try{WORKDATA=JSON.parse(document.getElementById('workCriteriaData').textContent)||{}}catch{WORKDATA={}}
WORKDATA.works=WORKDATA.works||[];
WORKDATA.commonAspects=WORKDATA.commonAspects||[];
WORKDATA.categories=WORKDATA.categories||[];
function fillWork(s,work){return String(s).replace(/\{work\}/g,work)}
function workById(id){return WORKDATA.works.find(w=>w.id===id)}
function worksInCat(catId){return WORKDATA.works.filter(w=>w.category===catId)}
/* カテゴリ名を現在の言語で（catId→翻訳キー。無ければデータのnameを使う） */
function catLabel(catId){
  const k='cat'+catId.charAt(0).toUpperCase()+catId.slice(1);
  const tx=(TX[lang]||TX.ja)[k];
  if(tx)return tx;
  const c=WORKDATA.categories.find(c=>c.id===catId);return c?c.name:catId;
}
/* 選択作業の採点対象観点リスト（固有観点＋共通観点）。共通観点は{work}を作業名へ置換 */
function workItems(workId){
  const w=workById(workId);if(!w)return[];
  const spec=w.aspects.map(a=>({id:a.id,secId:'specific',name:a.name,desc:'',kanten:a.kanten,levels:a.levels}));
  const comm=WORKDATA.commonAspects.map(a=>({id:a.id,secId:'common',name:a.name,desc:'',
    kanten:fillWork(a.kanten,w.name),levels:a.levels.map(l=>fillWork(l,w.name))}));
  return spec.concat(comm);
}
