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

  ok('ページエラーなし', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));

  await browser.close();
  console.log(`\n結果: ${pass} passed / ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
