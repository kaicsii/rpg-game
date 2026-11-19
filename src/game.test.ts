import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ZONES, ALL_ZONES, SKILLS, type GameState, type Encounter } from './data';
import { newGame, levelFor, partyLevel, areaObjects, heroStats, damage, startBattle, resolveAction, advanceEnemies, currentActor, finishBattle, grantFlag, bridgeClueFlag, completeBridgeQuest, revealedWeaknesses, enemyThreat, saveGame, loadGame, validSave, refreshStats, healParty, puzzleSolved, canLeave, travel, applyItem, type Battle, type Action } from './game';
import { MEDIUM_CHAPTERS, MEDIUM_QUESTS } from './medium-content';
import { finishMediumAction, finishQuestStop, mediumDestination, mediumLines, mediumProgress, mediumSteps, unlockedRegions } from './medium';
import { boardSaved, boardValues, checkPuzzleBoard, choosePuzzleValue, nextForestBeacon, PUZZLE_BOARDS, turnValve, valveLevel, waterDrained } from './puzzles';
const fixture = (id: string): Encounter => Object.values(ZONES).flatMap(z => z.encounters).find(e => e.id === id)!;
const ready = (xp = 160) => { const s = newGame(); s.xp = xp; refreshStats(s); healParty(s); return s; };

test('中篇主線只靠必要戰鬥可通過全部區域，並保存新增的區域與記憶', () => {
  let s = newGame();
  s.flags.push('medium-campaign');
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
  assert.equal(mediumProgress(s), 54);
  assert.ok(s.flags.includes('ending'));
  s.discoveredObjectIds.push('L24');
  assert.equal(unlockedRegions(s).length, 8);
  s.zone = 'archive'; s.checkpoint.zone = 'archive';
  const saves = new Map<string, string>();
  const storage = { getItem: (key: string) => saves.get(key) ?? null, setItem: (key: string, data: string) => { saves.set(key, data); } };
  saveGame(storage, 'auto', s);
  assert.deepEqual(loadGame(storage, 'auto').state, s);
  assert.equal(validSave({ ...s, flags: [] }), false);
});

test('中篇跨區支線依序交付，獎勵只給一次', () => {
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
test('level caps at five, equipment increases maximum stats without reviving', () => {
  assert.equal(levelFor(9999), 5); const s = newGame(); s.party[0].hp = 0; s.party[0].accessory = 'moon-charm'; refreshStats(s);
  assert.equal(s.party[0].hp, 0); assert.equal(s.party[0].maxHp, 117);
});
test('puzzles and gate conditions persist, travel is reversible', () => {
  let s = newGame(); assert.ok(canLeave(s)); s.flags.push('main-quest'); assert.match(canLeave(s)!, /鐘譜/);
  s.flags.push('puzzle-bells'); assert.equal(canLeave(s), null); s = travel(s, 1); assert.equal(s.zone, 'forest');
  Object.assign(s.mechanisms, { 'beacon-1': 1, 'beacon-2': 1, 'beacon-3': 1 }); assert.equal(puzzleSolved(s), true); assert.ok(canLeave(s));
  s.defeated.push('forest-elite'); assert.equal(canLeave(s), null); s = travel(s, 1); assert.equal(s.zone, 'waterway'); s = travel(s, -1); assert.equal(s.zone, 'forest'); assert.equal(puzzleSolved(s), true);
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
  assert.equal(puzzleSolved(s), false);
  turnValve(s, 'valve-2');
  assert.equal(waterDrained(s), true);
  assert.equal(puzzleSolved(s), true);
  turnValve(s, 'valve-2');
  assert.equal(valveLevel(s, 'valve-2'), 2);
});
test('save roundtrip, version check, corrupt slot isolation, blocked storage', () => {
  const map = new Map<string, string>(); const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
  const s = ready(); assert.equal(saveGame(storage, 'manual', s), null); assert.deepEqual(loadGame(storage, 'manual').state, s);
  storage.setItem('starlight:auto', '{broken'); assert.ok(loadGame(storage, 'auto').error); assert.deepEqual(loadGame(storage, 'manual').state, s);
  assert.equal(validSave({ ...s, version: 2 }), false); assert.equal(validSave({ ...s, position: { x: null, z: 0 } }), false); assert.equal(validSave({ ...s, inventory: { potion: -1 } }), false);
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
test('complete campaign: all twelve encounters winnable with natural levels and lamp rests', () => {
  let s = newGame(); s.flags.push('main-quest'); s.xp += 10;
  for (const zone of Object.values(ZONES)) {
    s.zone = zone.id;
    if (zone.id === 'forest') s.xp += 12;
    if (zone.id === 'waterway') s.xp += 20;
    if (zone.id === 'tower') s.xp += 24;
    refreshStats(s);
    for (const e of zone.encounters) {
      healParty(s); const b = autoplay(s, e); assert.equal(b.status, 'victory', `encounter ${e.id}`); s = finishBattle(s, b);
    }
  }
  assert.equal(s.defeated.length, 12); assert.equal(levelFor(s.xp), 5); assert.ok(s.defeated.includes('eclipse'));
});
test('required path reaches level five without optional encounter grinding', () => {
  const s = newGame(); const xp = 10 + 12 + ENEMY_XP('forest-elite') + 20 + ENEMY_XP('water-elite') + 24 + ENEMY_XP('eclipse');
  assert.equal(levelFor(xp), 5); assert.equal(s.xp, 0);
});
function ENEMY_XP(id: string) { return ({ 'forest-elite': 30, 'water-elite': 40, eclipse: 50 } as Record<string, number>)[id]; }

test('mandatory-only campaign is winnable without optional encounters', () => {
  let s = newGame(); s.flags.push('main-quest'); s.xp = 10;
  for (const [id, questXp] of [['forest-elite', 12], ['water-elite', 20], ['eclipse', 24]] as const) {
    s.xp += questXp; refreshStats(s); healParty(s);
    const b = autoplay(s, fixture(id)); assert.equal(b.status, 'victory', `main path ${id}`); s = finishBattle(s, b);
  }
  assert.equal(levelFor(s.xp), 5);
});

test('combat events identify the attacker, target and visual/sound effect', () => {
  let b = startBattle(ready(), fixture('forest-elite'));
  const fire = resolveAction(b, { kind: 'skill', id: 'ember' }, 5);
  assert.deepEqual(fire.events.filter(e => e.type === 'damage').map(e => [e.source, e.target, e.effect]), [['lien', 'enemy-0', 'fire']]);
  b = fire.battle;
  const sword = resolveAction(b, { kind: 'attack' }, 5);
  assert.equal(sword.events.find(e => e.type === 'damage')?.effect, 'slash');
  const enemy = advanceEnemies(sword.battle).events.find(e => e.type === 'damage');
  assert.equal(enemy?.source, 'enemy-0'); assert.ok(['lien', 'loren'].includes(enemy?.target ?? ''));
  b = startBattle(ready(), fixture('forest-elite')); b.resonance = 100;
  assert.equal(resolveAction(b, { kind: 'resonance' }, 5).events.find(e => e.type === 'damage')?.effect, 'resonance');
  b.heroes[1].hp -= 20;
  assert.equal(resolveAction(b, { kind: 'skill', id: 'heal', target: 'loren' }, 5).events.find(e => e.type === 'heal')?.effect, 'heal');
});

test('legacy version one saves migrate without altering progress or accepting invalid explicit fields', async () => {
  const {migrateSave}=await import('./game');
  const old:any=newGame(); delete old.leaderId; delete old.discoveredObjectIds; delete old.settings.autoStopLowHp; old.gold=87;
  const migrated=migrateSave(old) as GameState;
  assert.equal(migrated.leaderId,'lien'); assert.deepEqual(migrated.discoveredObjectIds,[]); assert.equal(migrated.settings.autoStopLowHp,true); assert.equal(migrated.gold,87); assert.ok(validSave(migrated)); assert.equal(old.leaderId,undefined);
  assert.equal(validSave(migrateSave({...old,leaderId:'unknown'})),false);
  assert.equal(validSave(migrateSave({...old,discoveredObjectIds:['not-an-object']})),false);
  assert.equal(validSave(migrateSave({...old,settings:{...old.settings,autoStopLowHp:null}})),false);
  const saved=newGame();saved.leaderId='loren';saved.discoveredObjectIds=['herb-1'];saved.settings.autoStopLowHp=false;
  assert.deepEqual(migrateSave(saved),saved);
});
test('objective markers follow main progression, travel direction, mechanisms and ending', async()=>{
  const {getObjective}=await import('./game');const s=newGame();
  assert.deepEqual(getObjective(s).targetIds,['elder']);s.flags.push('main-quest');assert.deepEqual(getObjective(s).targetIds,['forest-exit']);
  s.zone='forest';assert.deepEqual(getObjective(s).targetIds,['forest-roots','beacon-1','beacon-2','beacon-3']);s.mechanisms={'beacon-1':1,'beacon-2':1,'beacon-3':1};assert.deepEqual(getObjective(s).targetIds,['forest-elite']);
  s.defeated.push('forest-elite');assert.deepEqual(getObjective(s).targetIds,['waterway-exit']);s.zone='waterway';assert.deepEqual(getObjective(s).targetIds,['loren-memory']);s.flags.push('loren-memory');assert.deepEqual(getObjective(s).targetIds,['water-gauge','valve-1','valve-2']);s.mechanisms['valve-1']=s.mechanisms['valve-2']=1;assert.deepEqual(getObjective(s).targetIds,['water-elite']);
  s.defeated.push('water-elite');s.zone='forest';assert.deepEqual(getObjective(s).targetIds,['waterway-exit']);s.zone='tower';assert.deepEqual(getObjective(s).targetIds,['tower-stele','dial-1','dial-2','dial-3']);Object.assign(s.mechanisms,{'dial-1':2,'dial-2':1,'dial-3':3});assert.deepEqual(getObjective(s).targetIds,['eclipse']);s.defeated.push('eclipse');assert.deepEqual(getObjective(s).targetIds,['dawn']);s.flags.push('ending');assert.deepEqual(getObjective(s).targetIds,['tower-back']);s.zone='village';assert.deepEqual(getObjective(s).targetIds,[]);
});
test('four-unit discovery boundary is persistent, idempotent and hides collected items',async()=>{
  const {discoverNearby,visibleMapObjects}=await import('./game');const s=newGame();s.zone='forest';s.position={x:-9,z:9};
  assert.ok(discoverNearby(s));assert.ok(s.discoveredObjectIds.includes('herb-1'));const length=s.discoveredObjectIds.length;discoverNearby(s);assert.equal(s.discoveredObjectIds.length,length);
  assert.ok(visibleMapObjects(s).some(o=>o.id==='herb-1'));s.flags.push('herb-1');assert.ok(!visibleMapObjects(s).some(o=>o.id==='herb-1'));
  s.position={x:9,z:5.01};assert.ok(!s.discoveredObjectIds.includes('herb-2'));discoverNearby(s);assert.ok(!s.discoveredObjectIds.includes('herb-2'));
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
      assert.deepEqual(hits.map(event => event.target), ['lien', 'loren']);
      assert.ok(hits[0].amount! < hits[1].amount!);
      assert.equal(battle.enemies[0].charging, false);
    }
  }
});
