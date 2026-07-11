const { chromium } = require('C:/Users/so/farm-shift-app/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  // 実技試験：作業評価→衛生管理→除フン→基準を開いてレベル4採点
  {
    const p = await browser.newPage({ viewport: { width: 400, height: 840 }, deviceScaleFactor: 2 });
    await p.goto('file:///C:/Users/so/pig-farm-evaluation/index.html');
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForTimeout(400);
    await p.click('#modeWork');
    await p.selectOption('#workCatSel', 'hygiene');
    await p.selectOption('#workSel', 'dung-removal');
    await p.waitForTimeout(300);
    await p.fill('#fEv', '岡田');
    await p.fill('#fEe', '山田');
    const firstId = await p.evaluate(() => workItems('dung-removal')[0].id);
    await p.click('#critb-' + firstId);
    await p.click('#crit-' + firstId + ' .crit-lv[data-s="4"]');
    await p.waitForTimeout(300);
    await p.screenshot({ path: 'app_practical.png', clip: { x: 0, y: 0, width: 400, height: 772 } });
    await p.close();
  }

  // 口頭試問：作業カタログから除フン追加→試問タブ（質問＋模範解答を開く）
  {
    const p = await browser.newPage({ viewport: { width: 400, height: 840 }, deviceScaleFactor: 2 });
    p.on('dialog', d => d.accept());
    await p.goto('file:///C:/Users/so/oral-exam-app/index.html');
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForTimeout(400);
    await p.click('.tabs button[data-pg="pgCfg"]');
    await p.click('#btnCatAdd');
    await p.selectOption('#catSel', 'hygiene');
    await p.selectOption('#workSel2', 'dung-removal');
    await p.waitForTimeout(200);
    await p.click('#btnCatConfirm');
    await p.waitForTimeout(3000); // トースト（3問を追加しました）が消えるのを待つ
    await p.click('.tabs button[data-pg="pgExam"]');
    await p.waitForTimeout(200);
    await p.fill('#fEr', '岡田');
    await p.fill('#fEe', '山田');
    // 追加した除フンの最初の質問カードの模範解答を開く
    const d = p.locator('#examCards details.ans').first();
    await d.click();
    await p.waitForTimeout(300);
    // その質問カードを画面上部（ヘッダー直下）へ。document基準の絶対Yで確実にスクロール
    const card = p.locator('#examCards .qc').filter({ has: p.locator('details.ans') }).first();
    await card.evaluate(el => {
      const y = el.getBoundingClientRect().top + window.scrollY - 96; // ヘッダー+進捗ぶん
      window.scrollTo(0, Math.max(0, y));
    });
    await p.waitForTimeout(300);
    await p.screenshot({ path: 'app_oral.png', clip: { x: 0, y: 0, width: 400, height: 760 } });
    await p.close();
  }

  await browser.close();
  console.log('done');
})();
