async (page) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const read = () => page.evaluate(() => window.__starlight.getState());
  const mode = () => page.evaluate(() => window.__starlight.getMode());
  const tone = () => page.locator('#game').getAttribute('data-story-tone');
  const skip = async () => {
    if (await page.locator('.dialogue-panel').count()) await page.keyboard.press('Escape');
  };
  const approach = async (id, combat = false) => {
    const reached = await page.evaluate(async ({ id, combat }) => {
      const { areaObjects, closestObject } = await import('/src/game.ts');
      const { ALL_ZONES } = await import('/src/data.ts');
      const game = window.__starlight;
      const state = game.getState();
      const target = (combat ? ALL_ZONES[state.zone].encounters : areaObjects(state)).find(o => o.id === id);
      if (!target) return false;
      const queue = [[0, 8.5]];
      const seen = new Set();
      for (let i = 0; i < queue.length; i++) {
        const [x, z] = queue[i];
        const key = `${x},${z}`;
        if (seen.has(key) || !game.canWalk(x, z)) continue;
        seen.add(key);
        state.position = { x, z };
        if (combat ? Math.hypot(x - target.x, z - target.z) < .9 : closestObject(state)?.id === id) {
          game.moveTo(x, z);
          return true;
        }
        queue.push([x + .5, z], [x - .5, z], [x, z + .5], [x, z - .5]);
      }
      return false;
    }, { id, combat });
    check(reached, `No reachable position for ${id}`);
  };
  const interact = async (id, finish = true) => {
    await approach(id);
    await page.keyboard.press('e');
    await page.waitForFunction(() => document.querySelector('#game')?.getAttribute('aria-busy') !== 'true');
    if (finish) await skip();
  };
  const fight = async (id, lamp) => {
    await interact(lamp);
    await approach(id, true);
    await page.waitForSelector('.dialogue-panel');
    check(await mode() === 'dialogue', `No battle scene for ${id}`);
    await skip();
    await page.waitForFunction(() => !document.querySelector('.battle-thinking'));
    let phases = 0;
    for (let turns = 0; turns < 100; turns++) {
      const status = await page.evaluate(async () => {
        const game = window.__starlight;
        const battle = game.getBattle();
        if (battle.status !== 'active') return battle.status;
        const { SKILLS } = await import('/src/data.ts');
        const { partyLevel } = await import('/src/game.ts');
        const hero = battle.heroes.find(hero => hero.id === battle.order[battle.cursor]);
        const enemy = battle.enemies.find(enemy => enemy.hp > 0);
        const dead = battle.heroes.find(hero => hero.hp <= 0);
        const hurt = battle.heroes.find(hero => hero.hp > 0 && hero.hp < hero.maxHp * .44);
        const skill = SKILLS.find(skill => skill.owner === hero.id && skill.element === enemy.weakness &&
          skill.level <= partyLevel(game.getState()) && skill.cost <= hero.mp && skill.power > 0);
        const action = dead && battle.inventory.revive ? { kind: 'item', id: 'revive', target: dead.id }
          : hurt && battle.inventory.potion ? { kind: 'item', id: 'potion', target: hurt.id }
          : battle.resonance === 100 && !dead ? { kind: 'resonance' }
          : skill ? { kind: 'skill', id: skill.id, target: enemy.id } : { kind: 'attack', target: enemy.id };
        void game.action(action);
        return battle.status;
      });
      if (status === 'victory') {
        await page.locator('[data-action="battle:end"]').click();
        await skip();
        return { id, turns, phases };
      }
      check(status === 'active', `${id} ended with ${status}`);
      await page.waitForFunction(() => !document.querySelector('.battle-thinking'));
      if (await page.locator('.dialogue-panel').count()) {
        phases++;
        check(await tone() === 'rupture', 'Second phase starts with the rupture cue');
        await skip();
        await page.waitForSelector('.dialogue-panel', { state: 'hidden' });
        await page.waitForFunction(() => !document.querySelector('.battle-thinking'));
        check(await tone() === null, 'Skipping the phase cue restores battle presentation');
      }
    }
    throw new Error(`Battle failed to finish: ${id}`);
  };
  const go = async zone => {
    if ((await read()).zone === zone) return;
    await page.keyboard.press('m');
    await page.locator(`[data-action="travel:${zone}"]`).click();
    check((await read()).zone === zone, `Travel failed: ${zone}`);
  };
  const reload = async (slot = 'auto') => {
    await page.reload();
    await page.getByRole('button', { name: '繼續旅程', exact: true }).click();
    await page.locator(`[data-action="load:${slot}"]`).click();
  };
  const solveBoard = async (board, target) => {
    const panel = page.getByRole('dialog', { name: board.title });
    const submit = panel.getByRole('button', { name: board.checkLabel });
    const set = (slot, value) => panel.locator(`[data-action="puzzle:${slot}:${value}"]`).click();
    check(await panel.isVisible(), `Board is shown: ${board.id}`);
    await submit.click();
    check((await panel.getByRole('status').textContent()).includes('空著'), 'Incomplete solution gets feedback');
    for (const [slot, value] of board.answer.entries()) await set(slot, slot === 0 ? (value === 1 ? 2 : 1) : value);
    await submit.click();
    check(await panel.isVisible() && !(await read()).flags.includes(`puzzle-${board.id}`), `Wrong solution blocked: ${board.id}`);
    if (board.id === 'bells') {
      await page.keyboard.press('Escape');
      check(await mode() === 'explore', 'Esc closes the puzzle without solving it');
      await reload();
      await interact(target);
      check(await panel.locator('[data-action="puzzle:0:1"]').getAttribute('aria-pressed') === 'true', 'Incomplete slots persist after reload');
    }
    if (board.id === 'tracks') {
      await page.setViewportSize({ width: 390, height: 844 });
      await panel.getByText('再看一點提示').click();
      check(await panel.getByText(board.hint).isVisible(), 'Hint opens on a narrow viewport');
      await page.screenshot({ path: 'output/playwright/puzzle-station-390.png' });
      const choice = panel.locator('[data-action="puzzle:0:2"]');
      await choice.scrollIntoViewIfNeeded();
      const box = await choice.boundingBox();
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForFunction(() => document.querySelector('[data-action="puzzle:0:2"]')?.getAttribute('aria-pressed') === 'true');
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
      await cdp.detach();
    } else {
      await set(0, board.answer[0]);
    }
    await submit.click();
    if (board.id === 'pitch') {
      check(await tone() === 'signal', 'The successful relay begins with a signal cue');
      for (let i = 0; i < 3; i++) await page.keyboard.press('e');
      check(await tone() === 'rupture', 'The interruption changes the cue without advancing the quest');
      check(!(await read()).flags.includes('C4-05'), 'Staging does not finish the relay dialogue');
    }
    await skip();
    check((await read()).flags.includes(`puzzle-${board.id}`), `Puzzle solved: ${board.id}`);
    await page.setViewportSize({ width: 1280, height: 720 });
  };
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://localhost:5173');
  await page.keyboard.press('Escape');
  await page.getByRole('switch', { name: '減少動態效果' }).click();
  await page.getByRole('button', { name: '輕盈', exact: true }).click();
  await page.keyboard.press('Escape');
  check(await page.locator('.title-actions [data-action^="new"]').count() === 1, 'Title exposes a single new game');
  await page.getByRole('button', { name: '啟程 BEGIN YOUR JOURNEY' }).click();
  check(await tone() === 'night', 'Opening starts on the night cue');
  const stillFrame = await page.evaluate(() => window.__starlight.view().top);
  for (let i = 0; i < 3; i++) await page.keyboard.press('e');
  check(await tone() === 'warm', 'Opening moves from the village to the two travelers');
  check(await page.evaluate(() => window.__starlight.view().top) === stillFrame, 'Reduced motion holds the camera framing');
  await skip();
  check(await tone() === null, 'Skipping restores exploration presentation');
  check((await read()).flags.includes('P00'), 'Opening is saved');
  const chapters = await page.evaluate(async () => (await import('/src/medium-content.ts')).MEDIUM_CHAPTERS);
  const boards = await page.evaluate(async () => (await import('/src/puzzles.ts')).PUZZLE_BOARDS.map(({ failure, ...board }) => board));
  const battles = [];
  for (const chapter of chapters) {
    check((await read()).zone === chapter.zone, `Wrong region for ${chapter.title}`);
    if (chapter.zone === 'station') {
      await page.waitForSelector('#area-announcement.visible', { state: 'hidden' });
      await page.screenshot({ path: 'output/playwright/medium-station-720.png' });
    }
    for (const step of chapter.groups.flat()) {
      if (step.target === 'opening' || step.scene === 'C8-04') continue;
      const board = boards.find(board => board.scene === step.scene);
      if (step.battle) battles.push(await fight(step.target, `${chapter.zone}-lamp`));
      else if (board) {
        await interact(step.target); await solveBoard(board, step.target);
      } else if (step.scene === 'C1-02' && step.part === 1) {
        await interact('forest-roots', false);
        check((await page.locator('.dialogue-body > p').textContent()).includes('等候'), 'Forest inscription is readable');
        await skip();
        await interact('beacon-3');
        check(!(await read()).mechanisms['beacon-3'], 'Forest rejects an out-of-order lantern');
        await interact(step.target);
      } else if (step.scene === 'C2-02') {
        await interact(step.target);
        if (step.part === 1) {
          check(!(await read()).flags.includes('C2-02'), 'One sluice cannot finish the puzzle');
          continue;
        }
        check(!(await read()).flags.includes('C2-02'), 'Two open sluices are insufficient if levels are equal');
        await interact(step.target);
      } else if (step.scene === 'C8-01') {
        const turns = [2, 1, 3][step.part - 1];
        for (let i = 0; i < turns; i++) await interact(step.target);
        if (step.part < 3) {
          check(!(await read()).flags.includes('C8-01'), 'Correct individual dial cannot open the gate');
          continue;
        }
      } else if (step.scene === 'C7-02') {
        await interact(step.target, false);
        for (let i = 0; i < 4; i++) await page.keyboard.press('e');
        await page.getByRole('button', { name: '問回音還記得什麼' }).click();
        check((await page.locator('.dialogue-body > p').textContent()).includes('昨天'), 'Choice changes dialogue');
        await skip();
      } else if (step.scene === 'C8-06') {
        await interact(step.target, false);
        await page.keyboard.press('e');
        await page.keyboard.press('e');
        check(await tone() === 'dawn' && !(await read()).flags.includes('ending'), 'Dawn plays on the star platform before the ending flag');
        await skip();
        check(await tone() === null, 'The ending clears the cutscene');
      } else await interact(step.target);
      const flag = step.part ? `${step.scene}:${step.part}` : step.scene;
      check((await read()).flags.includes(flag), `Missing progression flag ${flag}`);
    }
    if (chapter.zone === 'highland') await interact(chapter.exit);
    if (chapter.zone === 'station') {
      await reload();
      check((await read()).flags.includes('C3-06'), 'New-region auto save survives reload');
    }
  }
  check(battles.length === 8 && battles.at(-1).phases === 1, 'Eight required encounters and the second-stage dialogue');
  check(await mode() === 'ending', 'Reached ending');
  for (let i = 1; i <= 6; i++) {
    await page.locator('[data-action="epilogue"]').click();
    await skip();
    check((await read()).flags.includes(`E0${i}`), `Missing epilogue scene ${i}`);
    if (i === 3) { await reload(); check(await mode() === 'ending', 'Resume in the epilogue'); }
  }
  await page.getByRole('button', { name: '回到星光下' }).click();
  const { quests, notes, talks } = await page.evaluate(async () => {
    const { MEDIUM_QUESTS, MEDIUM_NOTES, MEDIUM_TALKS } = await import('/src/medium-content.ts');
    const { ZONES } = await import('/src/data.ts');
    const oldNotes = Object.values(ZONES).flatMap(zone => zone.objects.filter(o => o.kind === 'lore').map(o => [o.id, zone.id]));
    return { quests: MEDIUM_QUESTS, notes: [...MEDIUM_NOTES, ...oldNotes], talks: MEDIUM_TALKS };
  });
  await go('waterway');
  await interact('waterway-boat');
  check(await page.evaluate(async () => {
    const { areaObjects } = await import('/src/game.ts');
    const state = window.__starlight.getState();
    return state.flags.includes('waterway-boat') && !areaObjects(state).some(object => object.id === 'waterway-boat');
  }), 'The picked-up paper boat is recorded and removed from the map');
  await interact('pendant');
  await go('forest');
  for (const id of ['herb-1', 'herb-2', 'herb-3']) await interact(id);
  await go('village');
  await interact('elder');
  await interact('child');
  check((await read()).flags.includes('herb-reward') && (await read()).flags.includes('pendant-reward'), 'The village side quests award both accessories');
  for (const quest of quests) {
    for (const stop of quest.stops) { await go(stop.zone); await interact(stop.point.id); }
    check((await read()).flags.includes(quest.id), `Quest not completed: ${quest.id}`);
  }
  for (const [id, zone] of [...notes, ...talks]) {
    if ((await read()).flags.includes(id)) continue;
    await go(zone); await interact(id);
    check((await read()).flags.includes(id), `Could not read ${id}`);
  }
  await page.keyboard.press('j');
  check((await page.locator('.chapter-card .eyebrow').textContent()).includes('54 / 54'), 'Journal shows all scenes');
  await page.setViewportSize({ width: 390, height: 844 });
  check(await page.getByRole('dialog', { name: '旅途日誌' }).isVisible(), 'Journal works in a narrow layout');
  await page.setViewportSize({ width: 1280, height: 720 });
  const completedState = await read();
  await page.evaluate(state => {
    localStorage.setItem('starlight:manual', JSON.stringify({
      ...state, version: 1, flags: [...state.flags, 'medium-campaign'],
    }));
  }, completedState);
  await reload('manual');
  check((await read()).flags.includes('E06'), 'Old expanded campaign preserves the completed epilogue');
  await page.evaluate(async () => {
    const { newGame } = await import('/src/game.ts');
    const preMerge = newGame();
    preMerge.zone = preMerge.checkpoint.zone = 'tower';
    preMerge.flags = ['intro', 'main-quest', 'loren-memory', 'weapon-upgrade', 'ending'];
    preMerge.defeated = ['forest-elite', 'water-elite', 'eclipse'];
    preMerge.party[0].accessory = 'moon-charm';
    preMerge.gold = 142;
    localStorage.setItem('starlight:manual', JSON.stringify({ ...preMerge, version: 1 }));
  });
  await reload('manual');
  const resumed = await read();
  check(resumed.zone === 'waterway' && resumed.gold === 142 && resumed.party[0].accessory === 'moon-charm',
    'Old short ending moves to the waterway and preserves equipment and gold');
  check(!resumed.flags.includes('ending') && resumed.flags.includes('legacy-eclipse-reward'), 'The unified finale remains ahead');
  await interact('tower-exit');
  await interact('tower-exit');
  check((await read()).zone === 'station', 'The old short ending can continue into the station');
  check(errors.length === 0, errors.join('; '));
  return { oldSaves: 2, battles, puzzles: boards.length + 3, scenes: 54, epilogue: 6, completedQuests: quests.length + 2, readNotes: notes.length, talks: talks.length };
}
