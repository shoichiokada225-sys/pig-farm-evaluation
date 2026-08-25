/* HSS評価システム 改修スモークテスト（playwright は farm-shift-app から借用） */
const { chromium } = require('C:/Users/so/farm-shift-app/node_modules/playwright');

const URL = 'file:///C:/Users/so/pig-farm-evaluation/index.html';
let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log('  OK ' + name); }
  else { fail++; console.log('  NG ' + name); }
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('dialog', d => d.accept('ooiri'));

  console.log('[1] 初期表示と基準アコーディオン');
  await page.goto(URL);
  ok('評価カード10枚', await page.locator('#cards .ec').count() === 10);
  ok('基準ボタン10個', await page.locator('.crit-tg').count() === 10);
  ok('進捗 0/10', (await page.locator('#progT').textContent()).includes('0/10'));
  ok('基準パネル閉', !(await page.locator('#crit-item1').first().isVisible()));
  await page.click('#critb-item1');
  ok('基準パネル開', await page.locator('#crit-item1').isVisible());
  ok('観点表示', (await page.locator('#crit-item1 .crit-k').textContent()).includes('評価の観点'));
  ok('レベル5行あり', await page.locator('#crit-item1 .crit-lv').count() === 5);

  console.log('[2] 基準タップで採点');
  await page.click('#crit-item1 .crit-lv[data-s="4"]');
  ok('スコアボタン4が選択', await page.locator('.sb[data-id="item1"][data-s="4"].sel').count() === 1);
  ok('基準行4がハイライト', await page.locator('#crit-item1 .crit-lv[data-s="4"].sel').count() === 1);
  ok('進捗 1/10', (await page.locator('#progT').textContent()).includes('1/10'));
  await page.click('.sb[data-id="item1"][data-s="2"]');
  ok('ボタン側の変更が基準行に同期', await page.locator('#crit-item1 .crit-lv[data-s="2"].sel').count() === 1
    && await page.locator('#crit-item1 .crit-lv[data-s="4"].sel').count() === 0);

  console.log('[3] 下書きの自動保存と復元');
  await page.fill('#fEv', '岡田');
  await page.fill('#fEe', 'テスト太郎');
  await page.waitForTimeout(500); // debounce 300ms
  await page.reload();
  await page.waitForTimeout(200);
  ok('氏名が復元', await page.inputValue('#fEe') === 'テスト太郎');
  ok('スコアが復元', await page.locator('.sb[data-id="item1"][data-s="2"].sel').count() === 1);
  ok('進捗が復元 1/10', (await page.locator('#progT').textContent()).includes('1/10'));

  console.log('[4] 全項目採点して保存 → 履歴');
  for (let i = 1; i <= 10; i++) await page.click(`.sb[data-id="item${i}"][data-s="3"]`);
  ok('進捗 10/10', (await page.locator('#progT').textContent()).includes('10/10'));
  await page.click('#btnSave');
  await page.waitForTimeout(300);
  await page.click('.tabs button[data-pg="pgHi"]');
  ok('履歴に1件', await page.locator('.hi').count() === 1);
  ok('平均3.0', (await page.locator('.hi .hia').textContent()) === '3.0');

  console.log('[5] 2件目保存 → レーダー前回比較');
  await page.click('.tabs button[data-pg="pgIn"]');
  await page.fill('#fEv', '岡田'); await page.fill('#fEe', 'テスト太郎');
  await page.fill('#fDate', '2026-07-11');
  for (let i = 1; i <= 10; i++) await page.click(`.sb[data-id="item${i}"][data-s="4"]`);
  await page.click('#btnSave');
  await page.waitForTimeout(300);
  await page.click('.tabs button[data-pg="pgCh"]');
  await page.selectOption('#chSel', 'テスト太郎');
  await page.waitForTimeout(500);
  const radar = await page.evaluate(() => {
    const c = Chart.getChart(document.getElementById('cvR'));
    return c ? { n: c.data.datasets.length, l2: c.data.datasets[1] && c.data.datasets[1].label } : null;
  });
  ok('レーダー2系列（今回＋前回）', radar && radar.n === 2);
  ok('前回ラベル', radar && /前回/.test(radar.l2));

  console.log('[6] 豚舎切替の分離と基準の舎対応');
  await page.click('.tabs button[data-pg="pgIn"]');
  await page.selectOption('#barnSel', 'stall');
  await page.waitForTimeout(300);
  ok('ストール舎の項目名', (await page.locator('#c-item1 .enm').textContent()).includes('発情発見'));
  await page.click('#critb-item1');
  ok('ストール舎の基準文', (await page.locator('#crit-item1').textContent()).includes('発情'));
  ok('切替後の進捗 0/10', (await page.locator('#progT').textContent()).includes('0/10'));
  await page.selectOption('#barnSel', 'farrow');
  await page.waitForTimeout(300);
  ok('分娩舎に戻ると履歴保持', await page.evaluate(() => JSON.parse(localStorage.getItem('pig_farm_evaluation_v1')).evaluations.length) === 2);

  console.log('[7] バックアップ書き出し／復元');
  await page.click('.tabs button[data-pg="pgCfg"]');
  await page.waitForTimeout(300);
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=全データをバックアップ'),
  ]);
  const path = require('path').join(require('os').tmpdir(), 'hss_backup_test.json');
  await dl.saveAs(path);
  const backup = JSON.parse(require('fs').readFileSync(path, 'utf8'));
  ok('バックアップ形式', backup._type === 'pig_farm_eval_backup');
  ok('分娩舎2件を含む', backup.barns.farrow.data.evaluations.length === 2);
  // 全消去→復元
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(200);
  await page.click('.tabs button[data-pg="pgCfg"]');
  await page.waitForTimeout(300);
  const [fc] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('text=バックアップから復元'),
  ]);
  await fc.setFiles(path);
  await page.waitForTimeout(500);
  ok('復元後 分娩舎2件', await page.evaluate(() => JSON.parse(localStorage.getItem('pig_farm_evaluation_v1')).evaluations.length) === 2);

  console.log('[8] カスタム項目には基準ボタンが出ない');
  await page.evaluate(() => addSection());
  await page.evaluate(() => addItem(cfg.sections[cfg.sections.length - 1].id));
  await page.evaluate(() => { cfg.items[cfg.items.length - 1].name = 'カスタム項目'; saveCfg(); });
  await page.click('.tabs button[data-pg="pgIn"]');
  await page.waitForTimeout(200);
  ok('カード11枚', await page.locator('#cards .ec').count() === 11);
  ok('基準ボタンは10個のまま', await page.locator('.crit-tg').count() === 10);

  console.log('[9] 作業評価モード：モード切替→カテゴリ→作業→採点');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(200);
  await page.click('#modeWork');
  await page.waitForTimeout(200);
  ok('作業バー表示', await page.locator('#workbar').isVisible());
  ok('豚舎バー非表示', !(await page.locator('#barnbar').isVisible()));
  ok('作業未選択プレースホルダ', await page.locator('#cards .pickwork').count() === 1);
  await page.selectOption('#workCatSel', 'hygiene');
  await page.waitForTimeout(150);
  // 衛生管理の作業数（データ由来）
  const hygieneCount = await page.evaluate(() => worksInCat('hygiene').length);
  ok('衛生カテゴリの作業がセレクトに入る', await page.locator('#workSel option').count() === hygieneCount + 1);
  await page.selectOption('#workSel', 'dung-removal');
  await page.waitForTimeout(200);
  // 除フン=固有観点2＋共通観点5＝7カード
  ok('除フンの観点7カード', await page.locator('#cards .ec').count() === 7);
  ok('固有観点セクションと共通観点セクション', await page.locator('#cards .stit').count() === 2);
  ok('基準ボタン7個', await page.locator('.crit-tg').count() === 7);
  // 基準タップ採点（固有観点1つ目）
  const firstId = await page.evaluate(() => workItems('dung-removal')[0].id);
  await page.click(`#critb-${firstId}`);
  ok('基準文に作業名の観点が出る', (await page.locator(`#crit-${firstId} .crit-lv`).count()) === 5);
  await page.click(`#crit-${firstId} .crit-lv[data-s="4"]`);
  ok('作業評価も進捗 1/7', (await page.locator('#progT').textContent()).includes('1/7'));
  // 共通観点も採点（作業名が基準文に埋め込まれているか）
  const commonBody = await page.evaluate(() => {
    const its = workItems('dung-removal');
    const care = its.find(i => i.id === 'care');
    return care.levels[0];
  });
  ok('共通観点の基準文に作業名が埋め込まれる', commonBody.includes('除フン'));

  console.log('[10] 作業評価：全観点採点→保存→履歴→別作業と分離');
  await page.fill('#fEv', '岡田'); await page.fill('#fEe', '作業太郎');
  const wIds = await page.evaluate(() => workItems('dung-removal').map(i => i.id));
  for (const id of wIds) await page.click(`.sb[data-id="${id}"][data-s="3"]`);
  ok('進捗 7/7', (await page.locator('#progT').textContent()).includes('7/7'));
  await page.click('#btnSave');
  await page.waitForTimeout(300);
  await page.click('.tabs button[data-pg="pgHi"]');
  await page.waitForTimeout(150);
  ok('作業評価の履歴1件', await page.locator('.hi').count() === 1);
  ok('履歴に作業名が出る', (await page.locator('.hi .hin').textContent()).includes('除フン'));
  // 別作業に切り替えると履歴データは同テーブルだが入力はリセット
  await page.click('.tabs button[data-pg="pgIn"]');
  await page.selectOption('#workCatSel', 'farrowing');
  await page.selectOption('#workSel', 'farrow-assist');
  await page.waitForTimeout(200);
  ok('分娩介助=固有3＋共通5＝8観点', await page.locator('#cards .ec').count() === 8);
  ok('切替後は未採点 0/8', (await page.locator('#progT').textContent()).includes('0/8'));
  // 豚舎モードへ戻すと作業評価データと混ざらない
  await page.click('#modeBarn');
  await page.waitForTimeout(200);
  ok('豚舎モードの評価データは0件', await page.evaluate(() => {
    const r = localStorage.getItem('pig_farm_evaluation_v1');
    return !r || JSON.parse(r).evaluations.length === 0;
  }));
  ok('作業評価データは1件で保持', await page.evaluate(() => JSON.parse(localStorage.getItem('pig_work_eval_data_v1')).evaluations.length === 1));

  console.log('[11] バックアップに作業評価が含まれ復元できる');
  page.removeAllListeners('dialog');
  page.on('dialog', d => d.accept('ooiri'));
  await page.click('.tabs button[data-pg="pgCfg"]');
  await page.waitForTimeout(300);
  const [dl2] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=全データをバックアップ'),
  ]);
  const path2 = require('path').join(require('os').tmpdir(), 'hss_backup_work.json');
  await dl2.saveAs(path2);
  const bk = JSON.parse(require('fs').readFileSync(path2, 'utf8'));
  ok('バックアップにworkEval', bk.workEval && bk.workEval.evaluations.length === 1);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(200);
  await page.click('.tabs button[data-pg="pgCfg"]');
  await page.waitForTimeout(300);
  const [fc2] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('text=バックアップから復元'),
  ]);
  await fc2.setFiles(path2);
  await page.waitForTimeout(500);
  ok('復元後 作業評価1件', await page.evaluate(() => JSON.parse(localStorage.getItem('pig_work_eval_data_v1')).evaluations.length === 1));

  console.log('[12] 作業選択状態でのリロード（起動順の回帰）');
  await page.evaluate(() => {
    localStorage.setItem('pig_eval_mode', 'work');
    localStorage.setItem('pig_eval_work_sel', 'dung-removal');
  });
  await page.reload();
  await page.waitForTimeout(300);
  ok('リロード後も観点カードが出る', await page.locator('#cards .ec').count() === 7);
  ok('カテゴリ・作業セレクタが復元', await page.evaluate(() =>
    document.getElementById('workCatSel').value === 'hygiene' && document.getElementById('workSel').value === 'dung-removal'));

  console.log('[13] esc() の属性値エスケープ（格納型XSS回帰）');
  ok('esc が5文字を全てエスケープ', await page.evaluate(() => esc('&<>"\'') === '&amp;&lt;&gt;&quot;&#39;'));
  ok('esc 出力で属性値から脱出不能', await page.evaluate(() => !/["'<>]/.test(esc('" onfocus="alert(1)" x=\''))));

  console.log('[14] CSV出力のエスケープ／数式インジェクション対策');
  ok('csvCell が " を二重化', await page.evaluate(() => csvCell('a"b') === '"a""b"'));
  ok('csvCell が = 始まりを無害化', await page.evaluate(() => csvCell('=HYPERLINK("x")') === `"'=HYPERLINK(""x"")"`));
  ok('csvCell が +,-,@ 始まりも無害化', await page.evaluate(() =>
    csvCell('+1').startsWith(`"'`) && csvCell('-1').startsWith(`"'`) && csvCell('@x').startsWith(`"'`)));
  ok('csvCell が日付・数値はそのまま', await page.evaluate(() => csvCell('2026-07-11') === '"2026-07-11"' && csvCell(3) === '"3"'));

  console.log('[15] CSV：氏名に " が入っても列が壊れない');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(200);
  const EVIL = 'テ"ス,ト';
  await page.fill('#fEv', '岡田'); await page.fill('#fEe', EVIL);
  for (let i = 1; i <= 10; i++) await page.click(`.sb[data-id="item${i}"][data-s="3"]`);
  await page.click('#btnSave');
  await page.waitForTimeout(300);
  await page.click('.tabs button[data-pg="pgHi"]');
  await page.waitForTimeout(150);
  const [dl3] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button[data-t="btnCSV"]'),
  ]);
  const path3 = require('path').join(require('os').tmpdir(), 'hss_csv_quote.csv');
  await dl3.saveAs(path3);
  const csvText = require('fs').readFileSync(path3, 'utf8').replace(/^﻿/, '');
  // 素朴なRFC4180パーサ（"" を " に戻す）
  const parseCsv = (txt) => {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < txt.length; i++) {
      const c = txt[i];
      if (q) {
        if (c === '"') { if (txt[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c !== '\r') cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  };
  const rows = parseCsv(csvText);
  ok('CSVヘッダとデータの列数が一致', rows.length >= 2 && rows[0].length === rows[1].length);
  ok('氏名の " と , が往復して復元される', rows[1] && rows[1][2] === EVIL);

  console.log('[16] バックアップ復元：同一IDの重複レコードは1件だけ取り込む');
  const dupPath = require('path').join(require('os').tmpdir(), 'hss_backup_dup.json');
  const mkRec = () => ({ id: 'dup-id-1', date: '2026-07-20', evaluator: '岡田', evaluatee: '重複太郎', scores: { item1: 3 }, comments: {} });
  require('fs').writeFileSync(dupPath, JSON.stringify({
    _type: 'pig_farm_eval_backup', version: 1,
    barns: { farrow: { data: { evaluations: [mkRec(), mkRec()] }, items: null } },
  }), 'utf8');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(200);
  await page.click('.tabs button[data-pg="pgCfg"]');
  await page.waitForTimeout(300);
  const [fc3] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('text=バックアップから復元'),
  ]);
  await fc3.setFiles(dupPath);
  await page.waitForTimeout(500);
  ok('重複IDは1件に集約', await page.evaluate(() =>
    JSON.parse(localStorage.getItem('pig_farm_evaluation_v1')).evaluations.length) === 1);

  console.log('[17] ディープリンクとナビのaria-current');
  await page.goto(URL + '#pgHi');
  await page.waitForTimeout(300);
  ok('#pgHi で履歴タブが開く', await page.evaluate(() =>
    document.getElementById('pgHi').classList.contains('on')));
  ok('aria-current=page が付与', await page.evaluate(() =>
    document.querySelector('.tabs button[data-pg="pgHi"]').getAttribute('aria-current') === 'page'));

  console.log('[18] トースト種別（エラーは.errクラス、インライン色なし）');
  await page.evaluate(() => { toast('err test', 1); });
  ok('エラートーストに.err', await page.evaluate(() =>
    document.getElementById('toast').classList.contains('err')));
  await page.evaluate(() => { toast('ok test'); });
  ok('通常トーストは.errなし・インラインstyle汚染なし', await page.evaluate(() => {
    const el = document.getElementById('toast');
    return !el.classList.contains('err') && !el.style.background;
  }));

  console.log('[19] 多言語ヘッダー：タイトルが言語ボタンに重ならない（回帰）');
  for (const lg of ['en', 'vi', 'id']) {
    await page.evaluate(l => setLang(l), lg);
    await page.waitForTimeout(150);
    ok(lg + ': h1と言語スイッチャーが非重複', await page.evaluate(() => {
      const h = document.querySelector('.hdr h1').getBoundingClientRect();
      const s = document.querySelector('.lsw').getBoundingClientRect();
      return h.right <= s.left + 1;
    }));
  }
  await page.evaluate(() => setLang('ja'));

  console.log('[20] バックアップ復元：不正スコア値の無害化とcomments欠落への耐性（回帰）');
  const evilPath = require('path').join(require('os').tmpdir(), 'hss_backup_evil.json');
  const XSS_SCORE = '1"><img src=x onerror="window.__pwned=1">';
  require('fs').writeFileSync(evilPath, JSON.stringify({
    _type: 'pig_farm_eval_backup', version: 1,
    barns: {
      farrow: {
        // comments キーごと欠落したレコード（旧版・手編集JSONを想定）
        data: { evaluations: [{ id: 'evil-1', date: '2026-08-01', evaluator: '岡田', evaluatee: '細工太郎', scores: { item1: XSS_SCORE, item2: 99, item3: 4 } }] },
        items: null,
      },
    },
  }), 'utf8');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(200);
  await page.click('.tabs button[data-pg="pgCfg"]');
  await page.waitForTimeout(300);
  const [fc4] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('text=バックアップから復元'),
  ]);
  await fc4.setFiles(evilPath);
  await page.waitForTimeout(500);
  const evilRec = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('pig_farm_evaluation_v1')).evaluations[0]);
  ok('文字列スコアはnullへ正規化', evilRec.scores.item1 === null);
  ok('範囲外スコア(99)はnullへ正規化', evilRec.scores.item2 === null);
  ok('正常スコア(4)はそのまま保持', evilRec.scores.item3 === 4);
  ok('欠落したcommentsがオブジェクトで補完される', !!evilRec.comments && typeof evilRec.comments === 'object');
  await page.click('.tabs button[data-pg="pgHi"]');
  await page.waitForTimeout(200);
  ok('履歴が描画される（平均計算が落ちない）', await page.locator('.hi').count() === 1);
  ok('平均は正常スコアのみで4.0', (await page.locator('.hi .hia').textContent()) === '4.0');
  await page.click('.hi');
  await page.waitForTimeout(200);
  ok('詳細モーダルが開く（comments欠落でも落ちない）', await page.locator('#modal.show').count() === 1);
  ok('スコア経由のXSSが発火しない', await page.evaluate(() => !window.__pwned));
  ok('注入されたimgタグがDOMに無い', await page.locator('#moBody img').count() === 0);
  await page.click('#moBody .mx');
  await page.waitForTimeout(150);

  console.log('[21] 編集対象が消えている場合、更新を成功扱いにしない（回帰）');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(200);
  await page.fill('#fEv', '岡田');
  await page.fill('#fEe', '消える太郎');
  for (let i = 1; i <= 10; i++) await page.click(`.sb[data-id="item${i}"][data-s="3"]`);
  await page.click('#btnSave');
  await page.waitForTimeout(300);
  await page.click('.tabs button[data-pg="pgHi"]');
  await page.waitForTimeout(150);
  await page.click('.hi');
  await page.waitForTimeout(200);
  await page.click('#moBody .b3');   // 編集
  await page.waitForTimeout(300);
  ok('編集モードに入る', await page.locator('#editBar.show').count() === 1);
  // 別タブ／別端末で当該レコードが削除された状況を再現
  await page.evaluate(() => localStorage.setItem('pig_farm_evaluation_v1', JSON.stringify({ evaluations: [] })));
  await page.fill('#fOv', '編集した所感');
  await page.waitForTimeout(500);   // debounce 300ms → 下書き保存
  await page.click('#btnSave');
  await page.waitForTimeout(300);
  const t21 = await page.locator('#toast').textContent();
  ok('「更新しました」と偽らない', !t21.includes('更新しました'));
  ok('記録が見つからない旨を通知', t21.includes('見つかりません'));
  ok('エラートーストとして表示', await page.locator('#toast.err').count() === 1);
  ok('編集モードは解除される', await page.locator('#editBar.show').count() === 0);
  ok('入力内容はフォームに残る', await page.inputValue('#fOv') === '編集した所感');
  ok('下書きも消されない', await page.evaluate(() => {
    const d = localStorage.getItem('pig_farm_evaluation_v1_draft');
    return !!d && JSON.parse(d).overall === '編集した所感';
  }));

  console.log('[22] 多言語：評価項目データのen/vi/id（キー欠落ゼロ・切替表示・{work}保持）');
  await page.reload();
  await page.waitForTimeout(300);
  // 埋め込みデータの言語キー欠落を機械検証
  const i18nGap = await page.evaluate(() => {
    const langs = ['en', 'vi', 'id'], gaps = [];
    const need = (o, f, at) => langs.forEach(lg => { if (o[f + '_' + lg] == null || o[f + '_' + lg] === '') gaps.push(at + '/' + f + '_' + lg); });
    CRITERIA.forEach(b => b.items.forEach((it, i) => {
      need(it, 'name', b.key + i); need(it, 'kanten', b.key + i);
      for (let n = 1; n <= 5; n++) need(it, 'level' + n, b.key + i);
    }));
    WORKDATA.works.forEach(w => {
      need(w, 'name', w.id); if (!w.gyomu) gaps.push(w.id + '/gyomu');
      w.aspects.forEach(a => { need(a, 'name', w.id + a.id); need(a, 'kanten', w.id + a.id);
        langs.forEach(lg => { const lv = a['levels_' + lg]; if (!Array.isArray(lv) || lv.length !== a.levels.length) gaps.push(w.id + a.id + '/levels_' + lg); }); });
    });
    WORKDATA.commonAspects.forEach(a => { need(a, 'name', a.id); need(a, 'kanten', a.id);
      langs.forEach(lg => { const lv = a['levels_' + lg]; if (!Array.isArray(lv) || lv.length !== a.levels.length) gaps.push(a.id + '/levels_' + lg); }); });
    return gaps;
  });
  ok('言語キー欠落ゼロ', i18nGap.length === 0);
  if (i18nGap.length) console.log('   gaps:', i18nGap.slice(0, 8).join(', '));
  // vi切替→基準文がベトナム語（ダイアクリティカル付き）になる
  const kantenJa = await page.evaluate(() => criteriaFor('item1').kanten);
  await page.click('.lsw button:has-text("VI")');
  await page.waitForTimeout(200);
  await page.click('#critb-item1');
  const kantenVi = await page.locator('#crit-item1 .crit-k').textContent();
  ok('vi基準文がjaと異なる', !kantenVi.includes(kantenJa));
  ok('viダイアクリティカルあり', /[ăâêôơưđạảấầẩẫậắằẳẵặẹẻẽếềểễệịỉĩọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(kantenVi));
  ok('vi豚舎名', !(await page.locator('#barnSel option').first().textContent()).includes('分娩舎'));
  // 作業評価: vi観点名＋{work}が訳文中でも置換される＋マニュアル深リンク
  await page.click('#modeWork');
  await page.waitForTimeout(200);
  await page.selectOption('#workCatSel', 'feeding');
  await page.waitForTimeout(150);
  await page.selectOption('#workSel', 'feeding-daily');
  await page.waitForTimeout(300);
  const manHref = await page.locator('.man-link').getAttribute('href');
  ok('マニュアル深リンク g_11', manHref === 'https://genba-manual.vercel.app/#g_11');
  const cardsTxt = await page.locator('#cards').textContent();
  ok('{work}が残っていない', !cardsTxt.includes('{work}'));
  ok('共通観点の{work}にvi作業名が入る', await page.evaluate(() => {
    const wn = workById('feeding-daily').name_vi;
    return !!wn && workItems('feeding-daily').some(it => it.secId === 'common' && it.kanten.includes(wn));
  }));
  // en切替→基準levels が英語
  await page.click('.lsw button:has-text("EN")');
  await page.waitForTimeout(200);
  const lvEn = await page.evaluate(() => getCriteria(workItems('feeding-daily')[0]).levels[0]);
  ok('en基準文', /[a-zA-Z]/.test(lvEn) && !/[ぁ-んァ-ヶ一-龠]/.test(lvEn));
  // ja へ戻す（後続・再実行の安定のため）
  await page.click('.lsw button:has-text("JP")');
  await page.click('#modeBarn');
  await page.waitForTimeout(200);

  ok('ページエラーなし', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));

  await browser.close();
  console.log(`\n結果: ${pass} passed / ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
