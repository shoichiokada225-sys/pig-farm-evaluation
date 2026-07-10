/* ui.js — 描画層：カード/基準/履歴/詳細/グラフ/CSV/設定画面 */
/* ==============================================================
   評価カード生成（cfgベース）
   ============================================================== */
function buildCards(){
  saveSt();
  const el=document.getElementById('cards');
  // 作業評価モードで作業未選択なら選択を促すプレースホルダ
  if(evalMode==='work'&&!workSelId){
    el.innerHTML=`<div class="pickwork"><span class="pw-ic">🐖</span><strong>${t('pickWorkTitle')}</strong><br>${t('pickWorkHint')}</div>`;
    updProg();return;
  }
  const secs=getSections(),items=getItems();
  let h='';
  secs.forEach((sec,si)=>{
    const secItems=items.filter(it=>it.secId===sec.id);
    if(!secItems.length)return;
    h+=`<div class="stit">${esc(sec.name)}</div>`;
    secItems.forEach((it,ii)=>{
      const cr=getCriteria(it);
      const badge=evalMode==='work'?(ii+1):(esc(sec.name.charAt(0))+'-'+(ii+1));
      h+=`<div class="cd ec" id="c-${it.id}">
        <div class="en">${badge}</div>
        <div class="enm">${esc(it.name)}</div>
        ${it.desc?`<div class="ed">${esc(it.desc)}</div>`:''}
        ${cr?`<button class="crit-tg" id="critb-${it.id}" onclick="toggleCrit('${it.id}')">▼ ${t('showCrit')}</button>
        <div class="crit" id="crit-${it.id}">
          <div class="crit-k"><b>${t('kantenLbl')}</b>${esc(cr.kanten)}</div>
          ${cr.levels.map((lv,li)=>`<div class="crit-lv" data-id="${it.id}" data-s="${li+1}" onclick="pick('${it.id}',${li+1})"><span class="crit-n sb${li+1}">${li+1}</span><div class="crit-t"><b>${t('s'+(li+1))}</b>${esc(lv)}</div></div>`).join('')}
        </div>`:''}
        <div class="sr">${[1,2,3,4,5].map(s=>`<button class="sb" data-id="${it.id}" data-s="${s}" onclick="pick('${it.id}',${s})">${s}<span class="sl">${t('s'+s)}</span></button>`).join('')}</div>
        <div class="clbl">${t('cmtLbl')}</div>
        <textarea data-cid="${it.id}" placeholder="${t('phCmt')}" oninput="onCh()"></textarea>
      </div>`;
    });
  });
  el.innerHTML=h;
  updProg();
}
/* スコア選択のUI反映（点数ボタン・基準リスト両方をハイライト） */
function setScoreUI(id,s){
  document.querySelectorAll('.sb[data-id="'+id+'"]').forEach(b=>b.classList.toggle('sel',+b.dataset.s===s));
  document.querySelectorAll('.crit-lv[data-id="'+id+'"]').forEach(r=>r.classList.toggle('sel',+r.dataset.s===s));
  const c=document.getElementById('c-'+id);if(c)c.classList.add('scored');
}
function pick(id,s){setScoreUI(id,s);onCh();updProg()}
/* 採点進捗バー */
function updProg(){
  const f=document.getElementById('progF'),tx=document.getElementById('progT');
  if(!f||!tx)return;
  const total=getItems().length;
  const done=document.querySelectorAll('#cards .ec.scored').length;
  f.style.width=(total?Math.round(done/total*100):0)+'%';
  f.classList.toggle('done',total>0&&done===total);
  tx.textContent=t('progDone')+' '+done+'/'+total;
}

/* ==============================================================
   履歴
   ============================================================== */
function drawHist(){
  const f=document.getElementById('hFil').value;let all=getAll();if(f)all=all.filter(e=>e.evaluatee===f);
  all.sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||'').localeCompare(a.createdAt||''));
  const c=document.getElementById('hList');
  if(!all.length){c.innerHTML=`<div class="nd">${t('noData')}</div>`;return}
  c.innerHTML=all.map(r=>`<div class="hi" onclick="showDet('${sanitizeId(r.id)}')"><div class="hii"><div class="hid">${esc(r.date)}　${t('evLbl')}: ${esc(r.evaluator)}</div><div class="hin">${esc(r.evaluatee)}${r.workName?`　<span style="font-size:.8rem;font-weight:600;color:var(--pri-d);background:var(--pri-l);border-radius:6px;padding:1px 8px">${esc(r.workName)}</span>`:''}</div></div><div class="hia">${avg(r.scores)}</div></div>`).join('');
}
function avg(sc){const v=Object.values(sc).filter(x=>x!=null);return v.length?(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1):'-'}

/* ==============================================================
   詳細モーダル
   ============================================================== */
function showDet(id){
  const r=getAll().find(e=>e.id===id);if(!r)return;
  const av=avg(r.scores);const items=itemsForRecord(r);
  let h=`<div class="mh"><h3>${esc(r.evaluatee)} - ${esc(r.date)}</h3><button class="mx" onclick="closeMo()">&times;</button></div>`;
  h+=`<div style="font-size:.85rem;color:var(--sub);margin-bottom:12px">${r.workName?`${t('workNameCol')}: ${esc(r.workName)}　／　`:''}${t('evLbl')}: ${esc(r.evaluator)}　／　${t('avgLbl')}: ${av}</div>`;
  items.forEach(it=>{
    const sc=r.scores[it.id],cm=r.comments[it.id];
    h+=`<div class="di"><div class="dih"><span class="din">${esc(it.name)}</span>${sc?`<span class="dis sb${sc}">${sc}</span>`:''}</div>${cm?`<div class="dic">${esc(cm)}</div>`:''}</div>`;
  });
  if(r.overall)h+=`<div class="dov"><strong>${t('ovLbl')}:</strong><br>${esc(r.overall)}</div>`;
  h+=`<div class="ma"><button class="b b4" style="flex:1" onclick="startEdit('${sanitizeId(r.id)}')">${t('btnEdit')}</button><button class="b b2" style="flex:1" onclick="doDel('${sanitizeId(r.id)}')">${t('btnDel')}</button><button class="b b3" style="flex:1" onclick="closeMo()">${t('btnClose')}</button></div>`;
  document.getElementById('moBody').innerHTML=h;
  document.getElementById('modal').classList.add('show');
}
function closeMo(){document.getElementById('modal').classList.remove('show')}
function doDel(id){if(!confirm(t('cDel')))return;let all=getAll().filter(e=>e.id!==id);localStorage.setItem(curDataKey(),JSON.stringify({evaluations:all}));closeMo();drawHist();refreshSel();toast(t('tDel'))}

/* ==============================================================
   CSV
   ============================================================== */
function doCSV(){
  const all=getAll();if(!all.length){toast(t('eCSV'),1);return}
  if(evalMode==='work'){
    // 作業評価: 作業ごとに観点が異なるため縦持ち（1行=1観点）で出力
    const whd=['評価日','評価者','被評価者','カテゴリ','作業','観点','スコア','コメント','平均点','全体所感','作成日時'];
    let wcsv='\uFEFF'+whd.map(h=>`"${h}"`).join(',')+'\n';
    all.forEach(r=>{
      itemsForRecord(r).forEach(it=>{
        const row=[r.date,r.evaluator,r.evaluatee,catLabel(r.category||''),r.workName||'',it.name,r.scores[it.id]||'',(r.comments[it.id]||'').replace(/"/g,'""'),avg(r.scores),(r.overall||'').replace(/"/g,'""'),r.createdAt||''];
        wcsv+=row.map(c=>`"${c}"`).join(',')+'\n';
      });
    });
    const wa=document.createElement('a');wa.href=URL.createObjectURL(new Blob([wcsv],{type:'text/csv;charset=utf-8;'}));
    wa.download='evaluation_work_'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'.csv';wa.click();toast(t('tCSV'));
    return;
  }
  const items=getItems();
  const hd=['評価日','評価者','被評価者',...items.map(it=>it.name+'(スコア)'),...items.map(it=>it.name+'(コメント)'),'平均点','全体所感','作成日時'];
  const rows=all.map(r=>[r.date,r.evaluator,r.evaluatee,...items.map(it=>r.scores[it.id]||''),...items.map(it=>(r.comments[it.id]||'').replace(/"/g,'""')),avg(r.scores),(r.overall||'').replace(/"/g,'""'),r.createdAt||'']);
  let csv='\uFEFF'+hd.map(h=>`"${h}"`).join(',')+'\n';
  rows.forEach(r=>{csv+=r.map(c=>`"${c}"`).join(',')+'\n'});
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  a.download='evaluation_'+activeBarn+'_'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'.csv';a.click();toast(t('tCSV'));
}

/* ==============================================================
   グラフ
   ============================================================== */
let cL=null,cR=null;
function drawCharts(){
  const who=document.getElementById('chSel').value,area=document.getElementById('chArea'),none=document.getElementById('chNone');
  if(!who){area.style.display='none';none.style.display='block';none.textContent=t('selEe');return}
  const all=getAll().filter(e=>e.evaluatee===who);
  if(!all.length){area.style.display='none';none.style.display='block';none.textContent=t('chNone');return}
  area.style.display='block';none.style.display='none';
  all.sort((a,b)=>a.date.localeCompare(b.date));
  if(cL)cL.destroy();
  cL=new Chart(document.getElementById('cvL'),{type:'line',data:{labels:all.map(e=>e.date),datasets:[{label:t('chAvg'),data:all.map(e=>parseFloat(avg(e.scores))),borderColor:'#2e7d6f',backgroundColor:'rgba(46,125,111,.1)',fill:true,tension:.3,pointRadius:5,pointBackgroundColor:'#2e7d6f'}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{min:1,max:5,ticks:{stepSize:1}}},plugins:{legend:{display:false}}}});
  const lat=all[all.length-1];
  // レーダーの項目はレコード基準（作業評価は最新レコードの作業の観点）。前回は同一作業の直前レコード
  const items=itemsForRecord(lat);
  const series=lat.workId?all.filter(e=>e.workId===lat.workId):all;
  const prev=series.length>1?series[series.length-2]:null;
  if(cR)cR.destroy();
  cR=new Chart(document.getElementById('cvR'),{type:'radar',data:{labels:items.map(it=>{const n=it.name;return n.length>6?n.slice(0,6)+'…':n}),datasets:[
    {label:lat.date,data:items.map(it=>lat.scores[it.id]||0),borderColor:'#2e7d6f',backgroundColor:'rgba(46,125,111,.2)',pointBackgroundColor:'#2e7d6f'},
    ...(prev?[{label:prev.date+'（'+t('prevLbl')+'）',data:items.map(it=>prev.scores[it.id]||0),borderColor:'#9e9e9e',backgroundColor:'rgba(158,158,158,.08)',pointBackgroundColor:'#9e9e9e',borderDash:[5,4],borderWidth:1.5}]:[])
  ]},options:{responsive:true,maintainAspectRatio:false,scales:{r:{min:0,max:5,ticks:{stepSize:1,font:{size:10}},pointLabels:{font:{size:11}}}},plugins:{legend:{display:true,position:'bottom'}}}});
}

/* ==============================================================
   設定画面（項目の追加・編集・削除・並べ替え）
   ============================================================== */
function buildCfgUI(){
  const area=document.getElementById('cfgArea');
  const secs=cfg.sections, items=cfg.items;
  let h='';
  secs.forEach((sec,si)=>{
    const secItems=items.filter(it=>it.secId===sec.id);
    h+=`<div class="cfg-sec" data-sec="${sec.id}">`;
    h+=`<div class="cfg-sec-hdr">
      <input type="text" value="${esc(sec.name)}" onchange="cfgSecName('${sec.id}',this.value)" placeholder="${t('secName')}">
      <div class="ci-btns">
        ${si>0?`<button onclick="moveSec('${sec.id}',-1)" title="上へ">&#9650;</button>`:'<button style="visibility:hidden">&#9650;</button>'}
        ${si<secs.length-1?`<button onclick="moveSec('${sec.id}',1)" title="下へ">&#9660;</button>`:'<button style="visibility:hidden">&#9660;</button>'}
        <button class="del" onclick="delSec('${sec.id}')" title="削除">&#10005;</button>
      </div>
    </div>`;
    secItems.forEach((it,ii)=>{
      h+=`<div class="cfg-item">
        <div class="ci-row">
          <input type="text" value="${esc(it.name)}" onchange="cfgItemName('${it.id}',this.value)" placeholder="${t('itemName')}">
          <div class="ci-btns">
            ${ii>0?`<button onclick="moveItem('${it.id}',-1)">&#9650;</button>`:'<button style="visibility:hidden">&#9650;</button>'}
            ${ii<secItems.length-1?`<button onclick="moveItem('${it.id}',1)">&#9660;</button>`:'<button style="visibility:hidden">&#9660;</button>'}
            <button class="del" onclick="delItem('${it.id}')">&#10005;</button>
          </div>
        </div>
        <textarea onchange="cfgItemDesc('${it.id}',this.value)" placeholder="${t('itemDesc')}">${esc(it.desc)}</textarea>
      </div>`;
    });
    h+=`<div class="cfg-add"><button onclick="addItem('${sec.id}')">${t('addItem')}</button></div>`;
    h+=`</div>`;
  });
  area.innerHTML=h;
}

/* セクション名変更 */
function cfgSecName(secId,val){const s=cfg.sections.find(s=>s.id===secId);if(s)s.name=val}
/* 項目名変更 */
function cfgItemName(itemId,val){const it=cfg.items.find(i=>i.id===itemId);if(it)it.name=val}
/* 項目説明変更 */
function cfgItemDesc(itemId,val){const it=cfg.items.find(i=>i.id===itemId);if(it)it.desc=val}

/* セクション追加 */
function addSection(){
  const id=sanitizeId('sec_'+Date.now());
  cfg.sections.push({id,name:t('secName')});
  buildCfgUI();
}
/* セクション内に項目追加 */
function addItem(secId){
  const id=sanitizeId('item_'+Date.now());
  // そのセクションの最後の項目の後ろに挿入
  const lastIdx=cfg.items.map((it,i)=>it.secId===secId?i:-1).filter(i=>i>=0);
  const insertAt=lastIdx.length?lastIdx[lastIdx.length-1]+1:cfg.items.length;
  cfg.items.splice(insertAt,0,{id,secId,name:'',desc:''});
  buildCfgUI();
  // 新しい項目の名前入力にフォーカス
  setTimeout(()=>{const inputs=document.querySelectorAll(`.cfg-item input[type="text"]`);if(inputs.length)inputs[inputs.length-1].focus()},50);
}
/* セクション削除（中の項目も削除） */
function delSec(secId){
  if(!confirm('このセクションと全項目を削除しますか？'))return;
  cfg.sections=cfg.sections.filter(s=>s.id!==secId);
  cfg.items=cfg.items.filter(it=>it.secId!==secId);
  buildCfgUI();
}
/* 項目削除 */
function delItem(itemId){
  cfg.items=cfg.items.filter(it=>it.id!==itemId);
  buildCfgUI();
}
/* セクション並べ替え */
function moveSec(secId,dir){
  const i=cfg.sections.findIndex(s=>s.id===secId);
  if(i<0)return;const j=i+dir;if(j<0||j>=cfg.sections.length)return;
  [cfg.sections[i],cfg.sections[j]]=[cfg.sections[j],cfg.sections[i]];
  buildCfgUI();
}
/* 項目並べ替え（同一セクション内） */
function moveItem(itemId,dir){
  const secId=cfg.items.find(it=>it.id===itemId)?.secId;if(!secId)return;
  // セクション内のアイテムのインデックスを取得
  const secItems=cfg.items.filter(it=>it.secId===secId);
  const localIdx=secItems.findIndex(it=>it.id===itemId);
  const swapIdx=localIdx+dir;
  if(swapIdx<0||swapIdx>=secItems.length)return;
  // グローバルインデックスで入れ替え
  const gi=cfg.items.indexOf(secItems[localIdx]);
  const gj=cfg.items.indexOf(secItems[swapIdx]);
  [cfg.items[gi],cfg.items[gj]]=[cfg.items[gj],cfg.items[gi]];
  buildCfgUI();
}

/* 設定保存 */
function saveCfg(){
  localStorage.setItem(CKEY,JSON.stringify(cfg));
  buildCards();restoreSt();
  toast(t('cfgSaved'));
}
/* 初期設定に戻す */
function resetCfg(){
  if(!confirm(t('cResetCfg')))return;
  cfg=defaultCfg();
  localStorage.setItem(CKEY,JSON.stringify(cfg));
  buildCfgUI();buildCards();
  toast(t('cfgReset'));
}

function toggleCrit(id){
  const el=document.getElementById('crit-'+id),btn=document.getElementById('critb-'+id);
  if(!el||!btn)return;
  const open=el.classList.toggle('open');
  btn.textContent=(open?'▲ ':'▼ ')+t(open?'hideCrit':'showCrit');
}

let _fs=null;
function saveSt(){_fs=collectForm()}
function restoreSt(){if(!_fs)return;const d=_fs;getItems().forEach(it=>{
  const sc=d.scores[it.id];if(sc)setScoreUI(it.id,sc);
  const cm=d.comments[it.id];if(cm){const ta=document.querySelector('textarea[data-cid="'+it.id+'"]');if(ta)ta.value=cm}
});_fs=null;updProg()}
