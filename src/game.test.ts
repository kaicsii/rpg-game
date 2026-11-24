import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ZONES, ALL_ZONES, ENEMIES, SKILLS, type GameState, type Encounter } from './data';
import { newGame, levelFor, partyLevel, areaObjects, heroStats, damage, startBattle, resolveAction, advanceEnemies, currentActor, finishBattle, grantFlag, bridgeClueFlag, completeBridgeQuest, revealedWeaknesses, enemyThreat, saveGame, loadGame, validSave, refreshStats, healParty, getObjective, migrateSave, applyItem, type Battle, type Action } from './game';
import { MEDIUM_CHAPTERS, MEDIUM_POINTS, MEDIUM_QUESTS } from './medium-content';
import { finishMediumAction, finishQuestStop, finishMediumStep, mediumDestination, mediumLines, mediumProgress, mediumSteps, unlockedRegions } from './medium';
import { boardSaved, boardValues, checkPuzzleBoard, choosePuzzleValue, nextForestBeacon, PUZZLE_BOARDS, turnValve, valveLevel, waterDrained } from './puzzles';
import { dialogueArtKey, ECLIPSE_FORM, enemyArtKey, NPC_ART, TRAVELER_ART } from './character-art';
import { enemyAttackPose, enemyAttackTiming, enemyMotions, enemyPose } from './enemy-motion';
const fixture = (id: string): Encounter => Object.values(ZONES).flatMap(z => z.encounters).find(e => e.id === id)!;
const ready = (xp = 160) => { const s = newGame(); s.xp = xp; refreshStats(s); healParty(s); return s; };

test('正式主線只靠必要戰鬥可通過八區，並保存區域與記憶', () => {
  let s = newGame();
  assert.deepEqual(unlockedRegions(s), ['village']);
  const encounters = [];
  for (const [index, chapter] of MEDIUM_CHAPTERS.entries()) {
    assert.equal(s.zone, chapter.zone);
    for (const group of chapter.groups) for (const step of [...group].reverse()) {
      assert.ok(mediumSteps(s).includes(step), step.scene);
      assert.ok(mediumLines(s, step).length, step.scene);
      if (!step.battle && step.target !== 'opening') assert.ok(areaObjects(s).some(o => o.id === step.target), step.target);
      if (step.battle && !s.defeated.includes(step.target)) {
        const encounter = ALL_ZONES[s.zone].encounters.find(e => e.id === step.target);
        assert.ok(encounter, step.target);
        healParty(s);
        const battle = autoplay(s, encounter);
        assert.equal(battle.status, 'victory', encounter.id);
        encounters.push(encounter.id);
        s = finishBattle(s, battle);
      }
      if (step.target.startsWith('beacon')) s.xp += 4;
      if (step.scene === 'C8-01' && mediumSteps(s).length === 1) s.xp += 24;
      finishMediumAction(s, step);
      refreshStats(s);
    }
    const next = MEDIUM_CHAPTERS[index + 1];
    if (chapter.exit && next) {
      assert.equal(mediumDestination(s, chapter.exit), next.zone);
      assert.ok(unlockedRegions(s).includes(next.zone));
      s.zone = next.zone;
      s.checkpoint.zone = next.zone;
    }
  }
  assert.equal(encounters.length, 8);
  assert.equal(partyLevel(s), 9);
  assert.equal(mediumProgress(s), 54);
  assert.ok(s.flags.includes('ending'));
  s.discoveredObjectIds.push('L24');
  assert.equal(unlockedRegions(s).length, 8);
  s.zone = 'archive'; s.checkpoint.zone = 'archive';
  const saves = new Map<string, string>();
  const storage = { getItem: (key: string) => saves.get(key) ?? null, setItem: (key: string, data: string) => { saves.set(key, data); } };
  saveGame(storage, 'auto', s);
  assert.deepEqual(loadGame(storage, 'auto').state, s);
  assert.equal(validSave({ ...s, discoveredObjectIds: ['unknown'] }), false);
});

test('跨區支線依序交付，獎勵只給一次', () => {
  const s = newGame();
  const quest = MEDIUM_QUESTS[0];
  const [a, b, c] = quest.stops;
  const potions = s.inventory.potion;
  assert.equal(finishQuestStop(s, quest, a.point.id), false);
  s.flags.push(...quest.needs);
  assert.equal(finishQuestStop(s, quest, c.point.id), false);
  assert.equal(finishQuestStop(s, quest, a.point.id), false);
  assert.equal(finishQuestStop(s, quest, b.point.id), false);
  assert.equal(finishQuestStop(s, quest, c.point.id), true);
  assert.equal(finishQuestStop(s, quest, c.point.id), false);
  assert.equal(s.inventory.potion, potions + 2);
});

test('damage is deterministic, defense reduces it, broken enemies take extra damage', () => {
  assert.equal(damage(20, 10), 14); assert.equal(damage(20, 10, 1, true), 22); assert.equal(damage(1, 100), 1);
});
test('speed order, MP consumption, invalid actions preserve input', () => {
  const state = newGame(); const b = startBattle(state, fixture('f1')); const original = structuredClone(b);
  assert.equal(currentActor(b), 'lien'); const r = resolveAction(b, { kind: 'skill', id: 'ember', target: 'enemy-0' }, 1);
  assert.equal(r.battle.heroes[0].mp, b.heroes[0].mp - 3); assert.equal(r.battle.enemies[0].shield, 1); assert.deepEqual(b, original);
  const noMp = structuredClone(b); noMp.heroes[0].mp = 0;
  assert.ok(resolveAction(noMp, { kind: 'skill', id: 'ember' }, 1).error);
  assert.ok(resolveAction(b, { kind: 'skill', id: 'meteor' }, 1).error);
});
test('two weak hits break shield; next enemy turn skips and restores shield', () => {
  let b = startBattle(newGame(), fixture('f1')); b.enemies[0].hp = b.enemies[0].maxHp = 1000;
  b.enemies[0].shield = 1;
  let r = resolveAction(b, { kind: 'skill', id: 'ember' }, 1); b = r.battle;
  assert.equal(b.enemies[0].broken, true); const hp = b.heroes.map(h => h.hp);
  b = resolveAction(b, { kind: 'guard' }, 1).battle;
  const result = advanceEnemies(b); b = result.battle;
  assert.deepEqual(b.heroes.map(h => h.hp), hp); assert.equal(b.enemies[0].shield, 2); assert.equal(b.enemies[0].broken, false);
  assert.ok(result.events.some(e => e.text.includes('跳過')));
});
test('defend restores MP, item validates target, revival restores half health', () => {
  let b = startBattle(newGame(), fixture('f1')); b.heroes[0].mp = 0; b.heroes[1].hp = 0;
  assert.ok(resolveAction(b, { kind: 'item', id: 'potion', target: 'loren' }, 1).error);
  const r = resolveAction(b, { kind: 'item', id: 'revive', target: 'loren' }, 1);
  assert.equal(r.battle.heroes[1].hp, Math.ceil(b.heroes[1].maxHp / 2)); assert.equal(r.battle.inventory.revive, 1);
  b = resolveAction(b, { kind: 'guard' }, 1).battle; assert.equal(b.heroes[0].mp, 4);
  const h = heroStats('lien', 1); assert.equal(applyItem(h, 'revive'), false); assert.equal(applyItem(h, 'potion'), false);
});
test('guard reduces damage and cover redirects a hit', () => {
  const s = ready(); let b = startBattle(s, fixture('forest-elite')); b.cursor = b.order.indexOf('loren');
  b = resolveAction(b, { kind: 'skill', id: 'cover' }, 5).battle;
  const r = advanceEnemies(b); assert.equal(r.battle.heroes[0].hp, s.party[0].hp); assert.ok(r.battle.heroes[1].hp < s.party[1].hp);
});
test('resonance requires two living heroes and consumes meter', () => {
  let b = startBattle(ready(), fixture('forest-elite')); b.resonance = 100;
  const r = resolveAction(b, { kind: 'resonance' }, 5); assert.equal(r.battle.resonance, 0); assert.ok(r.events.some(e => e.type === 'damage'));
  b.heroes[1].hp = 0; assert.ok(resolveAction(b, { kind: 'resonance' }, 5).error);
});
test('normal encounters can escape, required encounters cannot', () => {
  assert.equal(resolveAction(startBattle(newGame(), fixture('f1')), { kind: 'escape' }, 1).battle.status, 'escaped');
  assert.ok(resolveAction(startBattle(newGame(), fixture('forest-elite')), { kind: 'escape' }, 1).error);
});
test('boss has two phases and changes weakness before victory', () => {
  let b = startBattle(ready(), fixture('eclipse')); b.enemies[0].hp = 1;
  b = resolveAction(b, { kind: 'attack' }, 5).battle; assert.equal(b.status, 'active'); assert.equal(b.enemies[0].phase, 2); assert.equal(b.enemies[0].weakness, 'fire');
  b.cursor = b.order.indexOf('lien'); b.enemies[0].hp = 1;
  b = resolveAction(b, { kind: 'attack' }, 5).battle; assert.equal(b.status, 'victory');
});
test('defeat is detected on enemy turn', () => {
  let b = startBattle(newGame(), fixture('forest-elite')); b.heroes[1].hp = 0; b.heroes[0].hp = 1; b.cursor = b.order.indexOf('enemy-0');
  b = advanceEnemies(b).battle; assert.equal(b.status, 'defeat');
});
test('battle and side quest rewards cannot be collected twice', () => {
  const s = newGame(); const b = startBattle(s, fixture('forest-elite')); b.status = 'victory'; b.enemies[0].hp = 0;
  const result = finishBattle(s, b); const twice = finishBattle(result, b); assert.equal(result.gold, twice.gold); assert.equal(result.xp, twice.xp); assert.equal(result.defeated.length, 1);
  const reward = (d: GameState) => { d.gold += 30; };
  const first = grantFlag(s, 'quest', reward); assert.equal(grantFlag(first, 'quest', reward).gold, first.gold);
});
test('level caps at nine, equipment increases maximum stats without reviving', () => {
  assert.equal(levelFor(9999), 9); const s = newGame(); s.party[0].hp = 0; s.party[0].accessory = 'moon-charm'; refreshStats(s);
  assert.equal(s.party[0].hp, 0); assert.equal(s.party[0].maxHp, 117);
});
test('北門等村民與鐘譜完成後才開放，開放後可往返回村', () => {
  const s = newGame();
  const chapters = MEDIUM_CHAPTERS[0].groups;
  assert.deepEqual(getObjective(s).targetIds, ['opening']);
  for (const step of chapters.slice(0, 2).flat()) finishMediumAction(s, step);
  assert.deepEqual(getObjective(s).targetIds, ['merchant', 'child']);
  finishMediumAction(s, chapters[2][1]);
  assert.deepEqual(getObjective(s).targetIds, ['merchant']);
  finishMediumAction(s, chapters[2][0]);
  finishMediumAction(s, chapters[3][0]);
  assert.equal(mediumDestination(s, 'forest-exit'), undefined);
  const bells = PUZZLE_BOARDS[0];
  bells.answer.forEach((value, index) => choosePuzzleValue(s, bells, index, value));
  assert.equal(checkPuzzleBoard(s, bells), undefined);
  finishMediumAction(s, chapters[4][0]);
  assert.equal(mediumDestination(s, 'forest-exit'), 'forest');
  assert.equal(mediumDestination(s, 'forest-back'), 'village');
});
test('所有解謎面板拒絕未完成或錯誤答案，只在提交正解後鎖定並可續讀', () => {
  const s = newGame();
  for (const board of PUZZLE_BOARDS) {
    assert.ok(checkPuzzleBoard(s, board), board.id);
    assert.equal(boardSaved(s, board), false);
    board.answer.forEach((value, i) => choosePuzzleValue(s, board, i, i === 0 ? (value === 1 ? 2 : 1) : value));
    assert.ok(checkPuzzleBoard(s, board), board.id);
    assert.equal(boardSaved(s, board), false);
    assert.ok(validSave(JSON.parse(JSON.stringify(s))));
    board.answer.forEach((value, i) => choosePuzzleValue(s, board, i, value));
    assert.equal(checkPuzzleBoard(s, board), undefined);
    assert.equal(boardSaved(s, board), true);
    choosePuzzleValue(s, board, 0, 1);
    assert.deepEqual(boardValues(s, board), board.answer);
  }
});
test('野外機關接受舊存檔，水閘需同時分流並能修正誤設', () => {
  const s = newGame();
  assert.equal(nextForestBeacon(s), 'beacon-1');
  s.mechanisms['beacon-2'] = 1;
  assert.equal(nextForestBeacon(s), 'beacon-1');
  s.mechanisms['beacon-1'] = 1;
  assert.equal(nextForestBeacon(s), 'beacon-3');
  s.zone = 'waterway'; s.flags.push('loren-memory');
  s.mechanisms['valve-1'] = 1;
  assert.equal(valveLevel(s, 'valve-1'), 1);
  turnValve(s, 'valve-2');
  assert.equal(valveLevel(s, 'valve-2'), 1);
  turnValve(s, 'valve-2');
  assert.equal(waterDrained(s), true);
  turnValve(s, 'valve-2');
  assert.equal(valveLevel(s, 'valve-2'), 2);
});
test('save roundtrip, version check, corrupt slot isolation, blocked storage', () => {
  const map = new Map<string, string>(); const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
  const s = ready(); assert.equal(saveGame(storage, 'manual', s), null); assert.deepEqual(loadGame(storage, 'manual').state, s);
  storage.setItem('starlight:auto', '{broken'); assert.ok(loadGame(storage, 'auto').error); assert.deepEqual(loadGame(storage, 'manual').state, s);
  assert.equal(validSave({ ...s, version: 3 }), false); assert.equal(validSave({ ...s, position: { x: null, z: 0 } }), false); assert.equal(validSave({ ...s, inventory: { potion: -1 } }), false);
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.ok(saveGame(blocked, 'auto', s)); assert.ok(loadGame(blocked, 'auto').error);
});
function autoplay(s: GameState, encounter: Encounter): Battle {
  let b = advanceEnemies(startBattle(s, encounter)).battle;
  for (let n = 0; n < 400 && b.status === 'active'; n++) {
    const hero = b.heroes.find(h => h.id === currentActor(b))!; assert.ok(hero);
    const dead = b.heroes.find(h => h.hp <= 0); const hurt = b.heroes.find(h => h.hp > 0 && h.hp < h.maxHp * 0.42);
    const e = b.enemies.find(e => e.hp > 0)!; let action: Action;
    if (dead && b.inventory.revive > 0) action = { kind: 'item', id: 'revive', target: dead.id };
    else if (hurt && b.inventory.potion > 0) action = { kind: 'item', id: 'potion', target: hurt.id };
    else if (hurt && hero.id === 'lien' && hero.mp >= 4) action = { kind: 'skill', id: 'heal', target: hurt.id };
    else if (b.resonance === 100 && !dead) action = { kind: 'resonance' };
    else {
      const skill = SKILLS.find(k => k.owner === hero.id && k.level <= partyLevel(s) && k.element === e.weakness && k.cost <= hero.mp && k.power > 0);
      action = skill ? { kind: 'skill', id: skill.id, target: e.id } : { kind: 'attack', target: e.id };
    }
    const r = resolveAction(b, action, partyLevel(s)); assert.equal(r.error, undefined); b = advanceEnemies(r.battle).battle;
  }
  return b;
}
test('combat events identify the attacker, target and visual/sound effect', () => {
  let b = startBattle(ready(), fixture('forest-elite'));
  const fire = resolveAction(b, { kind: 'skill', id: 'ember' }, 5);
  assert.deepEqual(fire.events.filter(e => e.type === 'damage').map(e => [e.source, e.target, e.effect]), [['lien', 'enemy-0', 'fire']]);
  b = fire.battle;
  const sword = resolveAction(b, { kind: 'attack' }, 5);
  assert.equal(sword.events.find(e => e.type === 'damage')?.effect, 'slash');
  const enemy = advanceEnemies(sword.battle).events.find(e => e.type === 'damage');
  assert.equal(enemy?.source, 'enemy-0'); assert.equal(enemy?.enemyMove, 'strike'); assert.ok(['lien', 'loren'].includes(enemy?.target ?? ''));
  b = startBattle(ready(), fixture('forest-elite')); b.resonance = 100;
  assert.equal(resolveAction(b, { kind: 'resonance' }, 5).events.find(e => e.type === 'damage')?.effect, 'resonance');
  b.heroes[1].hp -= 20;
  assert.equal(resolveAction(b, { kind: 'skill', id: 'heal', target: 'loren' }, 5).events.find(e => e.type === 'heal')?.effect, 'heal');
});

test('舊存檔預設值相容，已存在的欄位仍要驗證', () => {
  const old = { ...newGame(), version: 1, gold: 87 };
  const { leaderId, discoveredObjectIds, settings, ...withoutFields } = old;
  const { autoStopLowHp, ...oldSettings } = settings;
  const legacy = { ...withoutFields, settings: oldSettings };
  const migrated = migrateSave(legacy) as GameState;
  assert.equal(migrated.leaderId, 'lien');
  assert.deepEqual(migrated.discoveredObjectIds, []);
  assert.equal(migrated.settings.autoStopLowHp, true);
  assert.equal(migrated.gold, 87);
  assert.ok(validSave(migrated));
  assert.equal(validSave(migrateSave({ ...legacy, leaderId: 'unknown' })), false);
  assert.equal(validSave(migrateSave({ ...legacy, discoveredObjectIds: ['not-an-object'] })), false);
  assert.equal(validSave(migrateSave({ ...legacy, settings: { ...oldSettings, autoStopLowHp: null } })), false);
  const saved = newGame();
  saved.leaderId = 'loren';
  saved.discoveredObjectIds = ['herb-1'];
  saved.settings.autoStopLowHp = false;
  assert.deepEqual(migrateSave(saved), saved);
});
test('舊中篇保留劇情和狀態，舊短篇進度接上同一條主線', () => {
  const existing = newGame();
  existing.zone = existing.checkpoint.zone = 'archive';
  existing.flags = ['P00', 'C3-06', 'C5-01', 'sq07-a'];
  existing.discoveredObjectIds = ['L20'];
  assert.deepEqual(migrateSave({ ...existing, version: 1, flags: [...existing.flags, 'medium-campaign'] }), existing);

  const original = newGame();
  original.zone = original.checkpoint.zone = 'forest';
  original.flags = ['intro', 'main-quest', 'visited-forest', 'bridge-reward', 'herb-1'];
  original.defeated = ['f1'];
  original.mechanisms = { 'beacon-1': 1 };
  original.leaderId = 'loren';
  const inForest = migrateSave({ ...original, version: 1 }) as GameState;
  assert.equal(inForest.zone, 'forest');
  assert.equal(inForest.leaderId, 'loren');
  assert.equal(inForest.inventory.potion, original.inventory.potion);
  assert.deepEqual(boardValues(inForest, PUZZLE_BOARDS[0]), PUZZLE_BOARDS[0].answer);
  assert.deepEqual(mediumSteps(inForest).map(step => step.target), ['beacon-2', 'beacon-3']);
  assert.ok(inForest.flags.includes('bridge-reward'));
  assert.ok(!areaObjects(inForest).some(o => o.id === 'herb-1'));

  original.zone = original.checkpoint.zone = 'tower';
  original.flags.push('loren-memory', 'ending', 'star-aligned', 'weapon-upgrade');
  original.defeated.push('forest-elite', 'water-elite', 'eclipse');
  original.xp = 250;
  original.party[0].accessory = 'moon-charm';
  const beforeDawn = migrateSave({ ...original, version: 1 }) as GameState;
  assert.equal(beforeDawn.zone, 'waterway');
  assert.equal(beforeDawn.checkpoint.zone, 'waterway');
  assert.equal(mediumSteps(beforeDawn)[0]?.scene, 'C2-05');
  assert.ok(!beforeDawn.flags.includes('ending'));
  assert.equal(beforeDawn.party[0].accessory, 'moon-charm');
  assert.deepEqual(beforeDawn.inventory, original.inventory);
  assert.equal(beforeDawn.xp, original.xp);
  assert.equal(beforeDawn.gold, original.gold);
  assert.ok(!beforeDawn.defeated.includes('eclipse'));
  const battle = startBattle(beforeDawn, fixture('eclipse'));
  battle.status = 'victory';
  const won = finishBattle(beforeDawn, battle);
  assert.ok(won.defeated.includes('eclipse'));
  assert.deepEqual(won.inventory, original.inventory);
  assert.equal(won.xp, original.xp);
  assert.equal(won.gold, original.gold);
  assert.ok(original.flags.includes('ending'));
  assert.deepEqual(migrateSave(beforeDawn), beforeDawn);
});
test('主線與機關共用同一套地圖目標', () => {
  const s = newGame();
  for (const chapter of MEDIUM_CHAPTERS.slice(0, 2)) {
    s.zone = chapter.zone;
    for (const step of chapter.groups.flat()) finishMediumStep(s, step);
  }
  s.zone = 'waterway';
  assert.deepEqual(getObjective(s).targetIds, ['canal-intake']);
  finishMediumStep(s, mediumSteps(s)[0]);
  assert.deepEqual(getObjective(s).targetIds, ['water-gauge', 'valve-1', 'valve-2', 'loren-memory']);
  s.flags.push('C8-06');
  assert.deepEqual(getObjective(s).targetIds, []);
});
test('four-unit discovery boundary is persistent, idempotent and hides collected items',async()=>{
  const {discoverNearby,visibleMapObjects}=await import('./game');const s=newGame();s.zone='forest';s.position={x:-9,z:9};
  assert.ok(discoverNearby(s));assert.ok(s.discoveredObjectIds.includes('herb-1'));const length=s.discoveredObjectIds.length;discoverNearby(s);assert.equal(s.discoveredObjectIds.length,length);
  assert.ok(visibleMapObjects(s).some(o=>o.id==='herb-1'));s.flags.push('herb-1');assert.ok(!visibleMapObjects(s).some(o=>o.id==='herb-1'));
  s.position={x:9,z:5.01};assert.ok(!s.discoveredObjectIds.includes('herb-2'));discoverNearby(s);assert.ok(!s.discoveredObjectIds.includes('herb-2'));
});

test('拾取旗標在存讀檔後同時隱藏實體物件、地圖標記與互動提示', async () => {
  const { closestObject, discoverNearby, explorationMarkers, visibleMapObjects } = await import('./game');
  const records = new Map<string, string>();
  const storage = {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => { records.set(key, value); },
  };
  const s = newGame();
  for (const [zone, id] of [['village', 'village-chest'], ['forest', 'herb-1'], ['waterway', 'pendant'],
    ['village', 'village-letter'], ['corridor', 'L23']] as const) {
    s.zone = zone;
    const object = areaObjects(s).find(object => object.id === id)!;
    s.position = { x: object.x, z: object.z };
    assert.equal(closestObject(s, id)?.id, id);
    discoverNearby(s);
    assert.ok(visibleMapObjects(s).some(object => object.id === id));
    s.flags.push(id);
    saveGame(storage, 'auto', s);
    const loaded = loadGame(storage, 'auto').state!;
    assert.ok(!areaObjects(loaded).some(object => object.id === id));
    assert.ok(!visibleMapObjects(loaded).some(object => object.id === id));
    assert.equal(closestObject(loaded, id), undefined);
    assert.ok(!explorationMarkers(loaded, undefined).some(({ object }) => object.id === id));
  }
  s.zone = 'village';
  s.flags.push('village-bell');
  assert.ok(areaObjects(s).some(object => object.id === 'village-bell'));
});

test('exploration hints do not change interaction range or reveal secret loot early', async () => {
  const { closestObject, discoverNearby, explorationMarkers, visibleMapObjects } = await import('./game');
  const state = newGame();
  assert.equal(closestObject(state), undefined);
  assert.ok(explorationMarkers(state, closestObject(state)).some(({ object }) => object.id === 'child'));
  assert.ok(visibleMapObjects(state).some(object => object.id === 'merchant'));
  state.position = { x: 8, z: 2 };
  assert.ok(!explorationMarkers(state, closestObject(state)).some(({ object }) => object.id === 'village-chest'));
  state.position = { x: 8, z: 1 };
  discoverNearby(state);
  assert.ok(explorationMarkers(state, closestObject(state)).some(({ object, active }) => object.id === 'village-chest' && !active));
  state.flags.push('village-chest');
  assert.ok(!explorationMarkers(state, closestObject(state)).some(({ object }) => object.id === 'village-chest'));
  assert.ok(!visibleMapObjects(state).some(object => object.id === 'village-chest'));
});
test('heavy intents, status durations, spent actions and low-health protection share battle rules',async()=>{
  const {enemyIntent,combatStatuses,shouldStopAutoAttack,isHeavyRound}=await import('./game');const b=startBattle(ready(),fixture('water-elite'));const e=b.enemies[0];
  assert.equal(isHeavyRound(3),true);assert.equal(isHeavyRound(4),false);b.round=3;assert.equal(enemyIntent(b,e),'本回合重擊！');e.broken=true;assert.match(enemyIntent(b,e),/取消/);e.armor=2;assert.equal(combatStatuses(b,e.id).length,2);b.guarding=['loren'];b.cover='loren';assert.equal(combatStatuses(b,'loren').length,2);e.hp=0;assert.equal(enemyIntent(b,e),'');assert.deepEqual(combatStatuses(b,e.id),[]);
  const h=b.heroes[0];h.maxHp=100;h.hp=31;assert.equal(shouldStopAutoAttack(b.heroes,true),false);h.hp=30;assert.equal(shouldStopAutoAttack(b.heroes,true),true);assert.equal(shouldStopAutoAttack(b.heroes,false),false);h.hp=0;assert.equal(shouldStopAutoAttack(b.heroes,true),true);
});

test('either bridge clue can independently earn the reward once and survives a save roundtrip', () => {
  for (const hero of ['lien', 'loren'] as const) {
    const initial = grantFlag(newGame(), 'main-quest');
    assert.equal(completeBridgeQuest(initial), initial);
    const clue = grantFlag(initial, bridgeClueFlag(hero));
    const rewarded = completeBridgeQuest(clue);
    assert.equal(rewarded.inventory.potion, initial.inventory.potion + 2);
    assert.equal(rewarded.inventory.ether, initial.inventory.ether + 1);
    const both = grantFlag(rewarded, bridgeClueFlag(hero === 'lien' ? 'loren' : 'lien'));
    assert.equal(completeBridgeQuest(both), both);
    const saves = new Map<string, string>();
    const storage = { getItem: (key: string) => saves.get(key) ?? null, setItem: (key: string, data: string) => { saves.set(key, data); } };
    assert.equal(saveGame(storage, 'auto', both), null);
    assert.deepEqual(loadGame(storage, 'auto').state, both);
  }
});

test('interrupting the guardian reveals weaknesses, opens a resonance window, then restores the shield', () => {
  let battle = startBattle(ready(22), fixture('forest-elite'));
  const round = (lien: Action, loren: Action) => {
    battle = resolveAction(battle, lien, 2).battle;
    battle = resolveAction(battle, loren, 2).battle;
    battle = advanceEnemies(battle).battle;
  };
  const ember: Action = { kind: 'skill', id: 'ember' };
  assert.deepEqual(revealedWeaknesses(battle.enemies[0]), []);
  round({ kind: 'attack' }, { kind: 'attack' });
  assert.equal(battle.enemies[0].shield, 3);
  round(ember, { kind: 'guard' });
  assert.equal(battle.round, 3);
  assert.deepEqual(revealedWeaknesses(battle.enemies[0]), ['fire']);
  assert.equal(enemyThreat(battle, battle.enemies[0]), true);
  assert.equal(battle.enemies[0].shield, 2);
  battle = resolveAction(battle, ember, 2).battle;
  const result = resolveAction(battle, { kind: 'attack' }, 2);
  assert.deepEqual(revealedWeaknesses(result.battle.enemies[0]), ['fire', 'slash']);
  assert.ok(result.events.some(event => event.type === 'break' && event.text.includes('打斷')));
  assert.equal(enemyThreat(result.battle, result.battle.enemies[0]), false);
  const aftermath = advanceEnemies(result.battle);
  assert.ok(aftermath.events.every(event => event.type !== 'damage'));
  assert.equal(aftermath.battle.enemies[0].shield, 0);
  assert.deepEqual(revealedWeaknesses(aftermath.battle.enemies[0]), ['fire']);
  battle = aftermath.battle;
  assert.equal(battle.resonance, 100);
  const wounded = battle.enemies[0];
  const followup = resolveAction(battle, { kind: 'resonance' }, 2);
  assert.equal(followup.events.find(event => event.type === 'damage')?.amount, damage(battle.heroes[0].atk, wounded.def, 3.8, true));
  battle = followup.battle;
  battle = advanceEnemies(resolveAction(battle, { kind: 'guard' }, 2).battle).battle;
  assert.equal(battle.enemies[0].shield, 3);
  assert.equal(battle.enemies[0].broken, false);
});

test('an unbroken guardian attacks both heroes and respects their guard', () => {
  let battle = startBattle(ready(22), fixture('forest-elite'));
  for (let turn = 0; turn < 6; turn++) {
    const action = { kind: turn === 5 ? 'attack' : 'guard' } as const;
    const result = advanceEnemies(resolveAction(battle, action, 2).battle);
    battle = result.battle;
    if (turn === 5) {
      const hits = result.events.filter(event => event.type === 'damage');
      assert.deepEqual(hits.map(event => [event.target, event.enemyMove]), [['lien', 'sweep'], ['loren', 'sweep']]);
      assert.ok(hits[0].amount! < hits[1].amount!);
      assert.equal(battle.enemies[0].charging, false);
    }
  }
});

test('地圖居民與支線人物都有角色圖，守鐘人階段共用判斷', () => {
  const worldPoints = Object.values(ALL_ZONES).flatMap(zone => zone.objects).concat(Object.values(MEDIUM_POINTS).flat());
  const residents = worldPoints.filter(point => point.kind === 'npc').map(point => point.id);
  assert.deepEqual(Object.keys(NPC_ART).sort(), residents.sort());
  for (const quest of MEDIUM_QUESTS) {
    for (const stop of quest.stops) {
      for (const [speaker] of stop.lines) {
        if (speaker === '旁白') continue;
        const art = dialogueArtKey(speaker, stop.point.id);
        assert.ok(art && (art === 'lien' || art === 'loren' || Object.hasOwn(TRAVELER_ART, art)), speaker);
      }
    }
  }
  assert.equal(dialogueArtKey('旅客', 'sq04-b'), 'ticket-owner');
  assert.notEqual(dialogueArtKey('寄存者', 'sq07-a'), dialogueArtKey('寄存者', 'sq08-b'));
  assert.equal(dialogueArtKey('無光的守鐘人', 'C8-03'), enemyArtKey('eclipse', 1));
  assert.equal(dialogueArtKey('無光的守鐘人', 'C8-04'), ECLIPSE_FORM);
  assert.equal(enemyArtKey('eclipse', 2), ECLIPSE_FORM);
});

test('敵人與首領動作在命中時達到出手定格，並回到原位', () => {
  assert.deepEqual(Object.keys(enemyMotions).sort(), [...Object.keys(ENEMIES), ECLIPSE_FORM].sort());
  const impact = enemyAttackTiming.impact / enemyAttackTiming.duration;
  for (const motion of Object.values(enemyMotions)) {
    assert.ok(enemyAttackPose(motion, .24, 'strike').advance < 0);
    const strike = enemyAttackPose(motion, impact, 'strike');
    assert.equal(strike.frame, enemyPose.strike);
    assert.equal(strike.advance, motion.strike.advance);
    assert.ok(enemyAttackPose(motion, impact, 'heavy').advance > strike.advance);
    assert.deepEqual(enemyAttackPose(motion, 1, 'strike'), { frame: enemyPose.rest, advance: 0, lift: 0, tilt: 0, squash: 0 });
  }
  const b = startBattle(ready(), fixture('f1'));
  b.round = 3; b.cursor = b.order.indexOf('enemy-0');
  assert.equal(advanceEnemies(b).events.find(event => event.type === 'damage')?.enemyMove, 'heavy');
});
