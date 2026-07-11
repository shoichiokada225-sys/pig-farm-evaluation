/* util.js — 汎用ユーティリティ（DOM非依存の小道具） */
/* ==============================================================
   ユーティリティ
   ============================================================== */
function toast(msg,err){const el=document.getElementById('toast');el.textContent=msg;el.style.background=err?'#d32f2f':'#333';el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2500)}
function esc(s){if(!s)return'';return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function sanitizeId(s){return String(s).replace(/[^a-zA-Z0-9_\-]/g,'_');}
