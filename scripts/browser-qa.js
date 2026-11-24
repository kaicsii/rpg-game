async (page) => {
  const report = { checks: [], navigation: [], consoleErrors: [] };
  page.on('pageerror', error => report.consoleErrors.push(error.message));
  const check = (ok, message) => { if (!ok) throw new Error(message); report.checks.push(message); };
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: '啟程 BEGIN YOUR JOURNEY' }).click();
  await page.getByRole('button', { name: '略過對話' }).click();
  const before = await page.evaluate(() => window.__starlight.getState().position);
  await page.keyboard.down('w'); await page.waitForTimeout(600); await page.keyboard.up('w');
  const after = await page.evaluate(() => window.__starlight.getState().position);
  check(Math.hypot(before.x - after.x, before.z - after.z) > 1, 'Keyboard movement works');
  await page.keyboard.press('Escape');
  await page.getByRole('switch', { name: '減少動態效果' }).click();
  await page.getByRole('button', { name: '輕盈', exact: true }).click();
  await page.getByRole('button', { name: '保存進度', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.reload();
  await page.getByRole('button', { name: '繼續旅程', exact: true }).click();
  await page.locator('.save-slot').last().getByRole('button', { name: '讀取記錄' }).click();
  const restored = await page.evaluate(() => window.__starlight.getState());
  check(restored.settings.reducedMotion && restored.settings.quality === 'low', 'Manual save survives reload and restores settings');
  check(Math.hypot(restored.position.x - after.x, restored.position.z - after.z) < 0.3, 'Save restores player position');
  await page.evaluate(() => { window.__starlight.interact('elder'); window.__starlight.advanceDialogue(); });
  check(await page.evaluate(() => window.__starlight.getState().flags.includes('main-quest')), 'Main quest accepted');
  const depart = async id => {
    await page.evaluate(id => window.__starlight.interact(id), id);
    await page.keyboard.press('Escape');
  };
  for (const id of ['merchant', 'child', 'forest-exit']) await depart(id);
  await page.evaluate(() => window.__starlight.interact('forest-exit'));
  for (const [slot, value] of [2, 3, 1].entries()) await page.locator(`[data-action="puzzle:${slot}:${value}"]`).click();
  await page.getByRole('button', { name: '試敲鐘' }).click();
  await page.keyboard.press('Escape');
  check(await page.evaluate(() => window.__starlight.getState().zone === 'forest'), 'World travel works');
  // Check every interaction and encounter has a collision-free route from its area entrance.
  report.navigation = await page.evaluate(async () => {
    const { ALL_ZONES } = await import('/src/data.ts');
    const { areaObjects } = await import('/src/game.ts'); const g = window.__starlight; const results = [];
    for (const zone of Object.values(ALL_ZONES)) {
      g.fixture(zone.id, { ready: true });
      const seen = new Set(), queue = [[0, 8.5]], reachable = []; let cursor = 0;
      while (cursor < queue.length) {
        const [x, z] = queue[cursor++], key = `${x},${z}`; if (seen.has(key) || !g.canWalk(x,z)) continue; seen.add(key); reachable.push({x,z});
        for (const [dx,dz] of [[0.5,0],[-0.5,0],[0,0.5],[0,-0.5]]) { const nx=x+dx,nz=z+dz; if (Math.abs(nx)<14 && Math.abs(nz)<11 && !seen.has(`${nx},${nz}`)) queue.push([nx,nz]); }
      }
      const inaccessible = [...areaObjects(g.getState()), ...zone.encounters].filter(o => !reachable.some(p => Math.hypot(p.x-o.x,p.z-o.z) < (o.enemies ? 0.9 : 2))).map(o => o.id);
      results.push({zone:zone.id, reachable:seen.size, inaccessible});
    }
    return results;
  });
  check(report.navigation.every(r => r.inaccessible.length === 0), 'Every map interaction and encounter is reachable');
  check(report.consoleErrors.length === 0, 'No uncaught browser errors');
  await page.setViewportSize({width:1920,height:1080});
  await page.evaluate(() => window.__starlight.fixture('village'));
  await page.keyboard.press('c');
  await page.screenshot({path:'output/playwright/party-1080.png'});
  await page.keyboard.press('Escape');
  await page.screenshot({path:'output/playwright/village-1080.png'});
  return report;
}
