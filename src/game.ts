import { ENEMIES, SKILLS, ALL_ZONES as ZONES, ZONE_ORDER, type GameState, type CombatEffect, type Hero, type ItemId, type Encounter, type Element, type HeroId, type ZoneId } from './data';
import { MEDIUM_NOTES } from './medium-content';
import { isMedium, mediumObjects, mediumObjective } from './medium';
const shortRoute: readonly ZoneId[] = ZONE_ORDER;
export const levelFor = (xp: number, medium = false) => (medium ? [0, 20, 55, 100, 160, 225, 300, 380, 470] : [0, 20, 55, 100, 160]).filter(n => xp >= n).length;
export const partyLevel = (state: GameState) => levelFor(state.xp, isMedium(state));
export const areaObjects = (state: GameState) => isMedium(state) ? mediumObjects(state) : ZONES[state.zone].objects;
export function heroStats(id: HeroId, level: number, accessory: string | null = null, weapon = false): Hero {
  const mage = id === 'lien';
  const maxHp = (mage ? 92 : 125) + (level - 1) * 18 + (accessory === 'moon-charm' ? 25 : 0);
  const maxMp = (mage ? 28 : 20) + (level - 1) * 5 + (accessory === 'memory-charm' ? 10 : 0);
  return { id, name: mage ? '莉恩' : '洛恩', hp: maxHp, mp: maxMp, maxHp, maxMp, atk: (mage ? 15 : 19) + (level - 1) * 4 + (weapon ? 5 : 0), def: (mage ? 5 : 8) + (level - 1) * 2, speed: mage ? 11 : 8, accessory };
}
export function newGame(): GameState {
  return { version: 1, leaderId: 'lien', discoveredObjectIds: [], zone: 'village', position: { x: 0, z: 6 }, party: [heroStats('lien', 1), heroStats('loren', 1)], xp: 0, gold: 40, inventory: { potion: 5, ether: 3, revive: 2 }, flags: [], defeated: [], mechanisms: {}, checkpoint: { zone: 'village', position: { x: 0, z: 5 } }, playSeconds: 0, settings: { volume: 0.35, quality: 'high', reducedMotion: false, autoStopLowHp: true } };
}
export const has = (state: GameState, flag: string) => state.flags.includes(flag);
export const bridgeClueFlag = (hero: HeroId) => `bridge-clue-${hero}`;
export function completeBridgeQuest(state: GameState): GameState {
  if (!has(state, 'main-quest') || !(['lien', 'loren'] as const).some(hero => has(state, bridgeClueFlag(hero)))) return state;
  return grantFlag(state, 'bridge-reward', draft => { draft.inventory.ether++; draft.inventory.potion += 2; });
}
export function grantFlag(state: GameState, flag: string, reward?: (draft: GameState) => void): GameState {
  if (has(state, flag)) return state;
  const next = structuredClone(state); next.flags.push(flag); reward?.(next); return next;
}
export function refreshStats(state: GameState): void {
  state.party = state.party.map(h => {
    const next = heroStats(h.id, partyLevel(state), h.accessory, has(state, 'weapon-upgrade'));
    if (h.id === 'loren' && has(state, 'workshop-upgrade')) next.atk += 3;
    next.hp = h.hp <= 0 ? 0 : Math.min(next.maxHp, h.hp + Math.max(0, next.maxHp - h.maxHp));
    next.mp = Math.min(next.maxMp, h.mp + Math.max(0, next.maxMp - h.maxMp));
    return next;
  });
}
export function healParty(state: GameState): void { state.party.forEach(h => { h.hp = h.maxHp; h.mp = h.maxMp; }); }
export function applyItem(hero: Hero, item: ItemId): boolean {
  if (item === 'revive') { if (hero.hp > 0) return false; hero.hp = Math.ceil(hero.maxHp / 2); return true; }
  if (hero.hp <= 0) return false;
  if (item === 'potion') { if (hero.hp === hero.maxHp) return false; hero.hp = Math.min(hero.maxHp, hero.hp + 60); }
  else { if (hero.mp === hero.maxMp) return false; hero.mp = Math.min(hero.maxMp, hero.mp + 15); }
  return true;
}
export function puzzleSolved(state: GameState, zone: ZoneId = state.zone): boolean {
  if (zone === 'forest') return [1, 2, 3].every(n => state.mechanisms[`beacon-${n}`] === 1);
  if (zone === 'waterway') return [1, 2].every(n => state.mechanisms[`valve-${n}`] === 1) && has(state, 'loren-memory');
  if (zone === 'tower') return [2, 1, 3].every((v, i) => state.mechanisms[`dial-${i + 1}`] === v);
  return has(state, 'main-quest');
}
export function getObjective(state: GameState): { text: string; targetIds: string[] } {
  if (isMedium(state)) return mediumObjective(state);
  const result = (text: string, ...targetIds: string[]) => ({ text, targetIds });
  const exit = () => ZONES[state.zone].objects.find(o => o.kind === 'exit')!.id;
  const back = () => ZONES[state.zone].objects.find(o => o.kind === 'back')!.id;
  if (has(state, 'ending')) return result('黎明已至。回到村莊，與大家分享這段旅程。', ...(state.zone === 'village' ? [] : [back()]));
  if (!has(state, 'main-quest')) return result('與廣場上的守燈婆婆交談', state.zone === 'village' ? 'elder' : back());
  const destination = !state.defeated.includes('forest-elite') ? 'forest' : !state.defeated.includes('water-elite') ? 'waterway' : 'tower';
  if (state.zone !== destination) return result(`前往${ZONES[destination].name}，繼續尋回星火`, shortRoute.indexOf(state.zone) < shortRoute.indexOf(destination) ? exit() : back());
  if (state.zone === 'forest') {
    if (!puzzleSolved(state)) return result(`點亮林間路燈（${[1,2,3].filter(n => state.mechanisms[`beacon-${n}`]).length} / 3）`, ...[1,2,3].filter(n => !state.mechanisms[`beacon-${n}`]).map(n => `beacon-${n}`));
    return result('擊敗古橋守木，取得第一縷星火', 'forest-elite');
  }
  if (state.zone === 'waterway') {
    if (!has(state, 'loren-memory')) return result('找回水道西北方的騎士記憶', 'loren-memory');
    if (!puzzleSolved(state)) return result('開啟東、西兩道水閘', ...[1,2].filter(n => !state.mechanisms[`valve-${n}`]).map(n => `valve-${n}`));
    return result('擊敗守潮者，打開鐘塔的道路', 'water-elite');
  }
  if (!puzzleSolved(state)) return result('依碑文調整星盤：西二、東一、北三', ...[2,1,3].flatMap((v,i) => state.mechanisms[`dial-${i+1}`] === v ? [] : [`dial-${i+1}`]));
  return state.defeated.includes('eclipse') ? result('走向北方星台，重燃星燈', 'dawn') : result('面對無光的守鐘人', 'eclipse');
}
export const objective = (state: GameState) => getObjective(state).text;
export function discoverNearby(state: GameState): boolean {
  const added = areaObjects(state).filter(o => ['chest','herb','memory','lore','clue'].includes(o.kind) && !state.discoveredObjectIds.includes(o.id) && Math.hypot(o.x-state.position.x,o.z-state.position.z) <= 4).map(o => o.id);
  state.discoveredObjectIds.push(...added); return added.length > 0;
}
export function visibleMapObjects(state: GameState) {
  const targets = getObjective(state).targetIds;
  return availableObjects(state).filter(o => ['exit','back','lamp','npc'].includes(o.kind) || o.id.startsWith('sq') || o.id.startsWith('H') || targets.includes(o.id) || state.discoveredObjectIds.includes(o.id));
}
function availableObjects(state: GameState) {
  return areaObjects(state).filter(o => !(['chest','herb','memory'].includes(o.kind) && has(state,o.id)));
}
function objectsByDistance(state: GameState) {
  return availableObjects(state).map(object => ({ object, distance: Math.hypot(object.x - state.position.x, object.z - state.position.z) })).sort((a, b) => a.distance - b.distance);
}
export function explorationMarkers(state: GameState, nearest: ReturnType<typeof closestObject>) {
  const mainTargets = getObjective(state).targetIds;
  return objectsByDistance(state)
    .map(({ object, distance }) => ({ object, distance, active: object.id === nearest?.id, main: mainTargets.includes(object.id) }))
    .filter(({ object, distance, active, main }) => active || main || (distance <= 8 && (['npc', 'lamp'].includes(object.kind) || object.id.startsWith('sq') || object.id.startsWith('H') || state.discoveredObjectIds.includes(object.id))))
    .sort((a, b) => Number(b.active) - Number(a.active) || Number(b.main) - Number(a.main));
}
export const isHeavyRound = (round: number) => round % 3 === 0;
export const shouldStopAutoAttack = (heroes: Hero[], enabled: boolean) => enabled && heroes.some(h => h.hp * 10 <= h.maxHp * 3);
const guardian = (enemy: Enemy) => enemy.template === 'guardian';
export function revealedWeaknesses(enemy: Enemy): Element[] {
  if (!guardian(enemy)) return [enemy.weakness];
  return enemy.revealed.filter(element => element === enemy.weakness || (enemy.charging && element === 'slash'));
}
export function enemyThreat(battle: Battle, enemy: Enemy): boolean {
  return enemy.hp > 0 && !enemy.broken && battle.order.slice(battle.cursor).includes(enemy.id)
    && (guardian(enemy) ? enemy.charging : isHeavyRound(battle.round));
}
export function enemyIntent(battle: Battle, enemy: Enemy): string {
  if (enemy.hp <= 0) return '';
  if (enemy.broken) return enemy.recovering ? '破盾：趁恢復前追擊' : enemy.charging ? '破盾：橫掃已打斷' : '破盾：下次行動取消';
  if (guardian(enemy)) {
    if (enemy.charging) return enemyThreat(battle, enemy) ? '本回合根鬚橫掃！破盾可打斷' : '蓄力：下回合橫掃全隊';
    return battle.round % 3 === 2 && battle.order.slice(battle.cursor).includes(enemy.id) ? '本回合蓄力，將露出根鬚接縫' : '根鬚收攏：留意下一次蓄力';
  }
  if (!battle.order.slice(battle.cursor).includes(enemy.id)) return `第 ${Math.ceil((battle.round+1)/3)*3} 回合重擊`;
  return isHeavyRound(battle.round) ? '本回合重擊！' : `第 ${Math.ceil(battle.round/3)*3} 回合重擊`;
}
export function combatStatuses(battle: Battle, id: string): string[] {
  const enemy = battle.enemies.find(e => e.id === id);
  if (enemy) return enemy.hp <= 0 ? [] : [...(enemy.broken ? [enemy.recovering ? '破盾：在敵人下次行動前，受到傷害增加' : '破盾：跳過下次行動、受到傷害增加'] : []), ...(enemy.armor > 0 ? [`碎甲：防禦降低，剩 ${enemy.armor} 次敵方行動`] : [])];
  return [...(battle.guarding.includes(id) ? ['防禦：減少傷害，直到下次出手'] : []), ...(battle.cover === id ? ['護衛：承受同伴下一次攻擊'] : [])];
}
export function canLeave(state: GameState): string | null {
  if (!puzzleSolved(state)) return state.zone === 'village' ? '先和守燈婆婆談談，再出發吧。' : '還有未完成的機關。任務日誌裡有線索。';
  const gates: Partial<Record<ZoneId, string>> = { forest: 'forest-elite', waterway: 'water-elite', tower: 'eclipse' };
  const gate = gates[state.zone];
  return gate && !state.defeated.includes(gate) ? '前方的守衛仍在等待。先面對它吧。' : null;
}
export function travel(state: GameState, direction: 1 | -1): GameState {
  const next = structuredClone(state); const index = shortRoute.indexOf(state.zone) + direction;
  if (index < 0 || index >= ZONE_ORDER.length) return next;
  next.zone = ZONE_ORDER[index]; next.position = { x: 0, z: direction === 1 ? 8.5 : -9 };
  next.checkpoint = { zone: next.zone, position: { x: 0, z: direction === 1 ? 8.5 : -9 } };
  return next;
}
export interface Enemy { id: string; template: string; name: string; hp: number; maxHp: number; atk: number; def: number; speed: number; weakness: Element; shield: number; maxShield: number; revealed: Element[]; charging: boolean; broken: boolean; recovering?: boolean; armor: number; phase: number; }
export interface Battle {
  encounter: Encounter; heroes: Hero[]; enemies: Enemy[]; inventory: Record<ItemId, number>;
  order: string[]; cursor: number; round: number; resonance: number; guarding: string[]; cover: string | null;
  status: 'active' | 'victory' | 'defeat' | 'escaped'; log: string[];
}
export type Action = { kind: 'attack' | 'guard' | 'skill' | 'item' | 'resonance' | 'escape'; id?: string; target?: string };
export interface BattleEvent { source?: string; effect?: CombatEffect; text: string; target?: string; amount?: number; type: 'damage' | 'heal' | 'info' | 'break' }
export const currentActor = (b: Battle) => b.order[b.cursor];
export function startBattle(state: GameState, encounter: Encounter): Battle {
  const b: Battle = { encounter: structuredClone(encounter), heroes: structuredClone(state.party), inventory: { ...state.inventory }, enemies: encounter.enemies.map((key, i) => {
    const e = ENEMIES[key]; const maxShield = key === 'guardian' ? 3 : 2;
    return { id: `enemy-${i}`, template: key, name: e.name, hp: e.hp, maxHp: e.hp, atk: e.atk, def: e.def, speed: e.speed, weakness: e.weakness, shield: maxShield, maxShield, revealed: [], charging: false, broken: false, armor: 0, phase: 1 };
  }), order: [], cursor: 0, round: 1, resonance: 0, guarding: [], cover: null, status: 'active', log: ['星燈與你同在。'] };
  b.order = turnOrder(b); return b;
}
export function turnOrder(b: Battle): string[] {
  return [...b.heroes, ...b.enemies].filter(a => a.hp > 0).sort((a, c) => c.speed - a.speed).map(a => a.id);
}
export function damage(atk: number, def: number, power = 1, vulnerable = false): number { return Math.max(1, Math.round((atk * power - def * 0.65) * (vulnerable ? 1.6 : 1))); }
function settle(b: Battle, events: BattleEvent[]): void {
  const boss = b.enemies.find(e => e.template === 'eclipse' && e.phase === 1 && e.hp <= 0);
  if (boss) { boss.phase = 2; boss.name = '守鐘人的最後長夜'; boss.hp = boss.maxHp = 380; boss.atk = 26; boss.weakness = 'fire'; boss.shield = 2; boss.broken = false; events.push({ type: 'info', text: '長夜尚未結束——守鐘人進入第二階段，弱點轉為火焰，護盾已恢復！' }); }
  if (b.enemies.every(e => e.hp <= 0)) b.status = 'victory';
  else if (b.heroes.every(h => h.hp <= 0)) b.status = 'defeat';
}
function nextTurn(b: Battle): void { b.cursor++; if (b.cursor >= b.order.length) { b.round++; b.order = turnOrder(b); b.cursor = 0; } }
function record(b: Battle, events: BattleEvent[]): void { b.log = [...b.log, ...events.map(e => e.text)].slice(-30); }
export function resolveAction(input: Battle, action: Action, level: number): { battle: Battle; events: BattleEvent[]; error?: string } {
  const b = structuredClone(input); const events: BattleEvent[] = []; const hero = b.heroes.find(h => h.id === currentActor(b));
  const fail = (error: string) => ({ battle: input, events: [], error });
  if (b.status !== 'active' || !hero || hero.hp <= 0) return fail('尚未輪到你行動。');
  const target = b.enemies.find(e => e.id === action.target && e.hp > 0) ?? b.enemies.find(e => e.hp > 0);
  const ally = b.heroes.find(h => h.id === action.target) ?? hero;
  let targets: Enemy[] = []; let power = 1; let element: Element | undefined; let armor = false;
  if (action.kind === 'escape') { if (b.encounter.required) return fail('這場戰鬥無法逃跑。'); b.status = 'escaped'; events.push({ type: 'info', text: '你們退回了安全的地方。' }); record(b, events); return { battle: b, events }; }
  b.guarding = b.guarding.filter(id => id !== hero.id); if (b.cover === hero.id) b.cover = null;
  if (action.kind === 'attack') { if (target) targets = [target]; element = hero.id === 'loren' ? 'slash' : 'star'; }
  if (action.kind === 'guard') { b.guarding.push(hero.id); hero.mp = Math.min(hero.maxMp, hero.mp + 4); events.push({ type: 'info', text: `${hero.name}守住陣線，恢復 4 點魔力。` }); }
  if (action.kind === 'skill') {
    const skill = SKILLS.find(s => s.id === action.id && s.owner === hero.id && s.level <= level);
    if (!skill) return fail('尚未學會這個技能。'); if (hero.mp < skill.cost) return fail('魔力不足，防禦可恢復魔力。');
    if (skill.effect === 'heal' && ally.hp <= 0) return fail('請使用甦醒之羽復甦同伴。');
    hero.mp -= skill.cost; power = skill.power; element = skill.element; armor = skill.effect === 'armor';
    if (skill.effect === 'heal') { const amount = Math.min(ally.maxHp - ally.hp, Math.round(hero.atk * power)); ally.hp += amount; events.push({ type: 'heal', source: hero.id, effect: 'heal', target: ally.id, amount, text: `${hero.name}的微光療癒，為${ally.name}恢復 ${amount} 點生命。` }); }
    else if (skill.effect === 'cover') { b.cover = hero.id; b.guarding.push(hero.id); events.push({ type: 'info', text: `${hero.name}立下守望誓約，保護同伴。` }); }
    else { targets = skill.target === 'all' ? b.enemies.filter(e => e.hp > 0) : target ? [target] : []; events.push({ type: 'info', text: `${hero.name}施放「${skill.name}」。` }); }
  }
  if (action.kind === 'item') {
    if (!['potion', 'ether', 'revive'].includes(action.id ?? '')) return fail('未知道具。');
    const item = action.id as ItemId; if (b.inventory[item] <= 0) return fail('道具不足。');
    if (!applyItem(ally, item)) return fail('目前無法對這名角色使用此道具。');
    b.inventory[item]--; events.push({ type: 'heal', source: hero.id, effect: 'heal', target: ally.id, text: `${hero.name}為${ally.name}使用了補給。` });
  }
  if (action.kind === 'resonance') {
    if (b.resonance < 100 || b.heroes.some(h => h.hp <= 0)) return fail('需要共鳴全滿，且兩名角色都能行動。');
    b.resonance = 0; power = 3.8; targets = b.enemies.filter(e => e.hp > 0); events.push({ type: 'info', text: '「一起，迎向黎明！」——聯手技・星燈破曉！' });
  }
  for (const e of targets) {
    const amount = damage(hero.atk, e.armor > 0 ? e.def / 2 : e.def, power, e.broken);
    e.hp = Math.max(0, e.hp - amount); if (armor) e.armor = 2;
    events.push({ type: 'damage', source: hero.id, effect: action.kind === 'resonance' ? 'resonance' : element, target: e.id, amount, text: `${e.name}受到 ${amount} 點傷害。` });
    if (element && (element === e.weakness || (guardian(e) && e.charging && element === 'slash')) && !e.broken && e.hp > 0) {
      if (guardian(e) && !e.revealed.includes(element)) {
        e.revealed.push(element); events.push({ type: 'info', text: `發現古橋守木的弱點：${element === 'slash' ? '斬擊（蓄力時）' : '火焰'}。` });
      }
      e.shield--; b.resonance = Math.min(100, b.resonance + 8);
      if (e.shield <= 0) { e.broken = true; events.push({ type: 'break', target: e.id, text: `${e.name}破盾！${e.charging ? '根鬚橫掃已打斷。' : '將失去下一次行動。'}` }); }
    }
  }
  if (action.kind !== 'resonance') b.resonance = Math.min(100, b.resonance + 14);
  settle(b, events); if (b.status === 'active') nextTurn(b); record(b, events); return { battle: b, events };
}
export function advanceEnemies(input: Battle): { battle: Battle; events: BattleEvent[] } {
  const b = structuredClone(input); const events: BattleEvent[] = [];
  for (let safety = 0; safety < 30 && b.status === 'active'; safety++) {
    const id = currentActor(b); const hero = b.heroes.find(h => h.id === id);
    if (hero && hero.hp > 0) break;
    const e = b.enemies.find(e => e.id === id);
    if (e && e.hp > 0) {
      if (e.recovering) {
        e.broken = false; e.recovering = false; e.shield = e.maxShield;
        events.push({ type: 'info', text: '古橋守木的根鬚重新合攏，護盾恢復。' });
      }
      if (e.broken) {
        e.charging = false;
        if (guardian(e)) e.recovering = true;
        else { e.broken = false; e.shield = e.maxShield; }
        events.push({ type: 'info', text: `${e.name}踉蹌著重整姿態，跳過行動。` });
      } else if (guardian(e) && e.charging) {
        e.charging = false; e.shield = e.maxShield;
        const living = b.heroes.filter(h => h.hp > 0);
        const protector = living.find(h => h.id === b.cover);
        for (const ally of living) {
          const target = protector && protector.hp > 0 && ally.id !== protector.id ? protector : ally;
          const amount = Math.max(1, Math.round(damage(e.atk, target.def, 1.65) * (b.guarding.includes(target.id) ? 0.45 : 1)));
          target.hp = Math.max(0, target.hp - amount);
          events.push({ type: 'damage', source: e.id, effect: 'slash', target: target.id, amount, text: `${e.name}以根鬚橫掃${target.name}，造成 ${amount} 點傷害。` });
        }
        b.cover = null;
      } else if (guardian(e) && b.round % 3 === 2) {
        e.charging = true; e.shield = Math.min(e.shield, 2);
        events.push({ type: 'info', text: '古橋守木正在蓄力，根鬚接縫露出；下次行動將橫掃全隊。' });
      }
      else {
        const living = b.heroes.filter(h => h.hp > 0); let target = living[(b.round + b.cursor) % living.length];
        if (b.cover && target.id !== b.cover) { target = b.heroes.find(h => h.id === b.cover && h.hp > 0) ?? target; b.cover = null; }
        const strong = !guardian(e) && isHeavyRound(b.round); const amount = Math.max(1, Math.round(damage(e.atk, target.def, strong ? 1.6 : 1) * (b.guarding.includes(target.id) ? 0.45 : 1)));
        target.hp = Math.max(0, target.hp - amount);
        events.push({ type: 'damage', source: e.id, effect: ['wisp', 'moth'].includes(e.template) ? 'star' : 'slash', target: target.id, amount, text: `${e.name}${strong ? '蓄力重擊' : '攻擊'}${target.name}，造成 ${amount} 點傷害。` });
      }
      if (e.armor > 0) e.armor--;
    }
    settle(b, events); if (b.status === 'active') nextTurn(b);
  }
  record(b, events); return { battle: b, events };
}
export function finishBattle(state: GameState, battle: Battle): GameState {
  const next = structuredClone(state); next.party = structuredClone(battle.heroes); next.inventory = { ...battle.inventory };
  if (battle.status !== 'victory' || next.defeated.includes(battle.encounter.id)) return next;
  next.defeated.push(battle.encounter.id);
  for (const key of battle.encounter.enemies) { next.xp += ENEMIES[key].xp; next.gold += ENEMIES[key].gold; }
  if (battle.encounter.required) {
    next.inventory.potion += 2; next.inventory.ether += 2; next.inventory.revive++;
    if (battle.encounter.id === 'forest-elite') next.flags.push('weapon-upgrade');
  }
  refreshStats(next);
  // shortcut: small post-battle recovery supports a short, fixed campaign; rebalance for longer campaigns.
  next.party.forEach(h => { h.hp = Math.min(h.maxHp, Math.max(1, h.hp) + Math.ceil(h.maxHp * 0.2)); h.mp = Math.min(h.maxMp, h.mp + 3); });
  return next;
}
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
const finite = (n: unknown, min = 0, max = 1e7): n is number => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
export function validSave(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const s = value as GameState;
  if (![s.flags, s.defeated].every(a => Array.isArray(a) && a.every(v => typeof v === 'string'))) return false;
  const zones = isMedium(s) ? Object.keys(ZONES) : shortRoute;
  if (!['lien','loren'].includes(s.leaderId) || !Array.isArray(s.discoveredObjectIds) || !s.discoveredObjectIds.every(id => Object.values(ZONES).some(z => z.objects.some(o => o.id === id)) || isMedium(s) && MEDIUM_NOTES.some(([note]) => note === id))) return false;
  if (s.version !== 1 || !zones.includes(s.zone) || !finite(s.position?.x, -14, 14) || !finite(s.position?.z, -11, 11)) return false;
  if (!Array.isArray(s.party) || s.party.length !== 2 || s.party[0]?.id !== 'lien' || s.party[1]?.id !== 'loren') return false;
  if (!s.party.every(h => h.name === (h.id === 'lien' ? '莉恩' : '洛恩') && [h.hp, h.mp, h.maxHp, h.maxMp, h.atk, h.def, h.speed].every(n => finite(n, 0, 10000)) && h.maxHp > 0 && h.hp <= h.maxHp && h.mp <= h.maxMp && [null, 'moon-charm', 'memory-charm'].includes(h.accessory))) return false;
  if (!finite(s.xp) || !finite(s.gold) || !finite(s.playSeconds) || !s.inventory || !['potion', 'ether', 'revive'].every(k => Number.isInteger(s.inventory[k as ItemId]) && finite(s.inventory[k as ItemId]))) return false;
  if (!s.mechanisms || typeof s.mechanisms !== 'object' || !Object.values(s.mechanisms).every(n => Number.isInteger(n) && finite(n, 0, 3))) return false;
  if (!s.checkpoint || !zones.includes(s.checkpoint.zone) || !finite(s.checkpoint.position?.x, -14, 14) || !finite(s.checkpoint.position?.z, -11, 11)) return false;
  return !!s.settings && finite(s.settings.volume, 0, 1) && ['low', 'high'].includes(s.settings.quality) && typeof s.settings.reducedMotion === 'boolean' && typeof s.settings.autoStopLowHp === 'boolean';
}
export function migrateSave(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const s = value as Record<string, unknown>;
  const settings = s.settings;
  return { ...s, ...(!Object.hasOwn(s,'leaderId') ? { leaderId: 'lien' } : {}), ...(!Object.hasOwn(s,'discoveredObjectIds') ? { discoveredObjectIds: [] } : {}),
    settings: settings && typeof settings === 'object' && !Array.isArray(settings) ? { ...settings, ...(!Object.hasOwn(settings,'autoStopLowHp') ? { autoStopLowHp: true } : {}) } : settings };
}
export function saveGame(storage: StorageLike, slot: 'auto' | 'manual', state: GameState): string | null {
  try { storage.setItem(`starlight:${slot}`, JSON.stringify(state)); return null; } catch { return '瀏覽器無法儲存進度。你仍可繼續遊玩，請勿關閉此頁。'; }
}
export function loadGame(storage: StorageLike, slot: 'auto' | 'manual'): { state?: GameState; error?: string } {
  try { const raw = storage.getItem(`starlight:${slot}`); if (!raw) return { error: '此欄位尚無存檔。' }; const value: unknown = migrateSave(JSON.parse(raw)); return validSave(value) ? { state: value } : { error: '存檔格式無效或版本不相容。可嘗試另一個存檔。' }; }
  catch { return { error: '無法讀取存檔。可嘗試另一個存檔，或開始新旅程。' }; }
}
export function closestObject(state: GameState, targetId?: string) {
  return objectsByDistance(state).find(({ object, distance }) => distance < 2.2 && (!targetId || object.id === targetId))?.object;
}
