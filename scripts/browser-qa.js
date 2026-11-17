async (page) => {
  const report = { checks: [], battles: [], navigation: [], consoleErrors: [] };
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
  await page.evaluate(() => { window.__starlight.interact('forest-exit'); window.__starlight.advanceDialogue(); });
  check(await page.evaluate(() => window.__starlight.getState().zone === 'forest'), 'World travel works');
  await page.evaluate(() => { for (const id of ['beacon-1', 'beacon-2', 'beacon-3', 'herb-1', 'herb-2', 'herb-3']) window.__starlight.interact(id); });
  async function fight(id, lamp) {
    await page.evaluate(({ id, lamp }) => { window.__starlight.interact(lamp); window.__starlight.encounter(id); }, { id, lamp });
    await page.waitForFunction(() => !document.querySelector('.battle-thinking'));
    let count = 0;
    while (count++ < 400) {
      const b = await page.evaluate(() => window.__starlight.getBattle());
      if (b.status !== 'active') { check(b.status === 'victory', `Won encounter ${id}`); report.battles.push({ id, turns: count - 1, rounds: b.round }); break; }
      await page.evaluate(async () => {
        const g = window.__starlight, b = g.getBattle(), state = g.getState();
        const { SKILLS } = await import('/src/data.ts');
        const { levelFor } = await import('/src/game.ts');
        const hero = b.heroes.find(h => h.id === b.order[b.cursor]);
        const dead = b.heroes.find(h => h.hp <= 0), hurt = b.heroes.find(h => h.hp > 0 && h.hp < h.maxHp * 0.45), enemy = b.enemies.find(e => e.hp > 0);
        let action;
        if (dead && b.inventory.revive) action = { kind: 'item', id: 'revive', target: dead.id };
        else if (hurt && b.inventory.potion) action = { kind: 'item', id: 'potion', target: hurt.id };
        else if (hurt && hero.id === 'lien' && hero.mp >= 4) action = { kind: 'skill', id: 'heal', target: hurt.id };
        else if (b.resonance === 100 && !dead) action = { kind: 'resonance' };
        else {
          const skill = SKILLS.find(s => s.owner === hero.id && s.level <= levelFor(state.xp) && s.element === enemy.weakness && s.cost <= hero.mp && s.power > 0);
          action = skill ? { kind: 'skill', id: skill.id, target: enemy.id } : { kind: 'attack', target: enemy.id };
        }
        g.action(action);
      });
      await page.waitForTimeout(70);
      await page.waitForFunction(() => !document.querySelector('.battle-thinking'));
    }
    check(count < 400, 'Battle terminates');
    await page.locator('[data-action="battle:end"]').click();
    if (await page.evaluate(() => window.__starlight.getMode() === 'dialogue')) await page.evaluate(() => window.__starlight.advanceDialogue());
  }
  for (const id of ['f1', 'f2', 'f3', 'forest-elite']) await fight(id, 'forest-lamp');
  await page.evaluate(() => { window.__starlight.interact('waterway-exit'); window.__starlight.advanceDialogue(); });
  await page.evaluate(() => { window.__starlight.interact('loren-memory'); window.__starlight.advanceDialogue(); window.__starlight.interact('pendant'); window.__starlight.advanceDialogue(); window.__starlight.interact('valve-1'); window.__starlight.interact('valve-2'); });
  for (const id of ['w1', 'w2', 'w3', 'water-elite']) await fight(id, 'waterway-lamp');
  await page.evaluate(() => { window.__starlight.interact('tower-exit'); window.__starlight.advanceDialogue(); for (const id of ['dial-1', 'dial-1', 'dial-2', 'dial-3', 'dial-3', 'dial-3']) window.__starlight.interact(id); });
  for (const id of ['t1', 't2', 't3', 'eclipse']) await fight(id, 'tower-lamp');
  await page.evaluate(() => { window.__starlight.interact('dawn'); window.__starlight.advanceDialogue(); });
  check(await page.evaluate(() => window.__starlight.getMode() === 'ending'), 'Ending reached through complete campaign');
  await page.screenshot({ path: 'output/playwright/ending-720.png' });
  await page.getByRole('button', { name: '回到星光下' }).click();
  await page.evaluate(() => { window.__starlight.interact('tower-back'); window.__starlight.interact('waterway-back'); window.__starlight.interact('forest-back'); window.__starlight.interact('elder'); window.__starlight.advanceDialogue(); window.__starlight.interact('child'); window.__starlight.advanceDialogue(); });
  const complete = await page.evaluate(() => window.__starlight.getState());
  check(complete.flags.includes('herb-reward') && complete.flags.includes('pendant-reward'), 'Both side quests complete after returning to village');
  check(complete.party[0].accessory === 'moon-charm' && complete.party[1].accessory === 'memory-charm', 'Quest accessories equipped');
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: '保存進度', exact: true }).click(); await page.keyboard.press('Escape');
  // Check every interaction and encounter has a collision-free route from its area entrance.
  report.navigation = await page.evaluate(async () => {
    const { ZONES } = await import('/src/data.ts'); const g = window.__starlight; const results = [];
    for (const zone of Object.values(ZONES)) {
      g.fixture(zone.id, { ready: true });
      const seen = new Set(), queue = [[0, 8.5]], reachable = []; let cursor = 0;
      while (cursor < queue.length) {
        const [x, z] = queue[cursor++], key = `${x},${z}`; if (seen.has(key) || !g.canWalk(x,z)) continue; seen.add(key); reachable.push({x,z});
        for (const [dx,dz] of [[0.5,0],[-0.5,0],[0,0.5],[0,-0.5]]) { const nx=x+dx,nz=z+dz; if (Math.abs(nx)<14 && Math.abs(nz)<11 && !seen.has(`${nx},${nz}`)) queue.push([nx,nz]); }
      }
      const inaccessible = [...zone.objects, ...zone.encounters].filter(o => !reachable.some(p => Math.hypot(p.x-o.x,p.z-o.z) < (o.enemies ? 0.9 : 2))).map(o => o.id);
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
