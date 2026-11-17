import './style.css';
import { mapView, mapPoints } from './map';
import { World, pixelTexture } from './world';
import { AudioDirector } from './audio';
import { ZONES, ZONE_ORDER, SKILLS, ITEMS, ENEMIES, ELEMENT_NAMES, LORE, OPENING, LOREN_MEMORY, ENDING, type GameState, type HeroId, type ItemId, type Interactable, type Encounter, type ZoneId } from './data';
import { newGame, has, grantFlag, refreshStats, healParty, levelFor, objective, getObjective, discoverNearby, shouldStopAutoAttack, enemyIntent, combatStatuses, canLeave, puzzleSolved, travel, closestObject, applyItem, saveGame, loadGame, startBattle, currentActor, resolveAction, advanceEnemies, finishBattle, type Battle, type Action, type BattleEvent } from './game';

type Mode = 'title' | 'explore' | 'dialogue' | 'battle' | 'pause' | 'ending';
type Tab = 'journal' | 'party' | 'items' | 'settings' | 'saves' | 'help' | 'shop' | 'map';
const ui = document.querySelector<HTMLDivElement>('#ui')!;
const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
const toastEl = document.querySelector<HTMLDivElement>('#toast')!;
let world: World;
try { world = new World(canvas); } catch (error) {
  ui.innerHTML = '<div class="fatal"><span>✧</span><h1>星燈尚未亮起</h1><p>無法啟動 WebGL。請開啟瀏覽器的硬體加速後重新載入。</p><button onclick="location.reload()">重新載入</button></div>'; throw error;
}
const audio = new AudioDirector();
const storage = { getItem: (key: string) => window.localStorage.getItem(key), setItem: (key: string, value: string) => window.localStorage.setItem(key, value) };
let state = newGame(); let mode: Mode = 'title'; let previousMode: Mode = 'explore'; let tab: Tab = 'journal'; let battle: Battle | null = null;
let battleStart: GameState | null = null; let battleMenu: 'main' | 'skills' | 'items' | 'target' = 'main'; let pendingAction: Action | null = null;
let autoAttack = false; let nextAutoAttack = 0;
let busy = false; let dialogue: { lines: string[][]; index: number; done?: () => void } | null = null;
let nearby = ''; let toastTimer: ReturnType<typeof setTimeout>; let encounterCooldown = 0; let areaTimer: ReturnType<typeof setTimeout>;
let mapTick = 0;
let lastTick = performance.now(); let timeAccumulator = 0; const keys = new Set<string>();
const esc = (s: string | number) => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
const icon = (name: string, cls = '') => {
  const paths: Record<string, string> = {
    star: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
    moon: '<path d="M20.5 14.2A9 9 0 0 1 9.8 3.5a9 9 0 1 0 10.7 10.7Z"/>',
    book: '<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15"/>',
    bag: '<path d="M8 7V5a4 4 0 0 1 8 0v2M5 7h14l2 14H3Z"/><path d="M9 12h6m-3-3v6"/>',
    people: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6m1 4a6 6 0 0 1 4 7"/>',
    gear: '<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
    pin: '<path d="M19 9c0 6-7 12-7 12S5 15 5 9a7 7 0 0 1 14 0Z"/><circle cx="12" cy="9" r="2"/>',
    sword: '<path d="M5 19 19 5l1-3-3 1L3 17m1-5 8 8M2 22l4-4"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    save: '<path d="M4 3h13l4 4v14H3V3Zm3 0v6h9V3M7 21v-8h10v8"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    sound: '<path d="M11 4 6 8H2v8h4l5 4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    leaf: '<path d="M20 3C8 1 1 9 7 17s16-2 13-14ZM5 21 16 9"/>',
    close: '<path d="m5 5 14 14M5 19 19 5"/>',
  };
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.star}</svg>`;
};
const portraits: Record<string, string> = {};
for (const kind of ['lien', 'loren', 'elder', 'merchant', 'child']) { const t = pixelTexture(kind); portraits[kind] = (t.image as HTMLCanvasElement).toDataURL(); t.dispose(); }
const portrait = (kind: string, cls = '') => `<img class="portrait ${cls}" src="${portraits[kind] ?? portraits.lien}" alt=""/>`;
const button = (label: string, action: string, cls = '', disabled = false) => `<button class="${cls}" data-action="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`;
function toast(message: string) { clearTimeout(toastTimer); toastEl.textContent = message; toastEl.classList.add('visible'); toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 4000); }
function store(slot: 'auto' | 'manual', silent = false) {
  const error = saveGame(storage, slot, state); if (error) toast(error); else if (!silent) toast(slot === 'manual' ? '旅途已記錄。願星燈照亮歸途。' : '進度已自動保存');
}
function autoSave() { store('auto', true); }
function settingsSync() { audio.setVolume(state.settings.volume); world.sync(state); }
function setMode(next: Mode) { if (next !== 'battle') autoAttack = false; mode = next; keys.clear(); nearby = ''; render(); }
function showArea() {
  const el = document.querySelector('#area-announcement'); if (!el) return; el.classList.add('visible'); clearTimeout(areaTimer); areaTimer = setTimeout(() => el.classList.remove('visible'), state.settings.reducedMotion ? 2000 : 3600);
}
function startNew() {
  const settings = { ...state.settings }; state = newGame(); state.settings = settings; previousMode = 'explore'; battle = null; audio.start(); audio.setVolume(state.settings.volume); world.build(state);
  talk(OPENING, () => { state = grantFlag(state, 'intro'); autoSave(); showArea(); });
}
function continueGame(slot: 'auto' | 'manual') {
  const result = loadGame(storage, slot); if (!result.state) { toast(result.error!); return; }
  state = result.state; battle = null; world.build(state); settingsSync(); audio.start(); encounterCooldown = 3;
  setMode('explore'); showArea(); toast('歡迎回來，守燈人。');
}
function talk(lines: string[][], done?: () => void) { dialogue = { lines, index: 0, done }; setMode('dialogue'); }
function nextLine(skip = false) {
  if (!dialogue) return;
  if (!skip && dialogue.index < dialogue.lines.length - 1) { dialogue.index++; audio.effect('confirm'); render(); }
  else { const done = dialogue.done; dialogue = null; setMode('explore'); done?.(); render(); }
}
function openMenu(next: Tab) { if (mode !== 'explore' && mode !== 'title') return; previousMode = mode === 'title' ? 'title' : 'explore'; tab = next; setMode('pause'); }
function closeMenu() { setMode(previousMode); }
function changeZone(direction: 1 | -1) {
  state = travel(state, direction); world.build(state); encounterCooldown = 3; autoSave(); setMode('explore'); showArea();
}
function interact(object = closestObject(state)) {
  if (mode !== 'explore' || !object) return; audio.start(); audio.effect('confirm'); const id = object.id;
  if (object.kind === 'lore') { talk(LORE[id].lines, () => { state = grantFlag(state, id); autoSave(); toast('記憶已收錄至旅途日誌。'); }); return; }
  if (object.kind === 'back') { changeZone(-1); return; }
  if (object.kind === 'exit') {
    const blocked = canLeave(state); if (blocked) { toast(blocked); return; }
    if (state.zone === 'tower') { showEnding(); return; }
    const lines = state.zone === 'village' ? [['莉恩', '北方的森林裡，還有三盞等著我們的燈。走吧，洛恩。'], ['洛恩', '你的燈很小。卻讓這條路看起來，不那麼黑了。']] : state.zone === 'forest' ? [['莉恩', '第一縷星火……它像在輕輕呼吸。'], ['洛恩', '橋下的水，流向鐘塔。那裡或許藏著我忘記的名字。']] : [['洛恩', '星火和記憶都找回來了。這次，我會親手打開那扇門。'], ['莉恩', '我們一起。還有整座村子的願望。']];
    talk(lines, () => changeZone(1)); return;
  }
  if (object.kind === 'lamp') {
    healParty(state); state.checkpoint = { zone: state.zone, position: { x: object.x + 0.8, z: object.z + 1 } }; state.position = { ...state.checkpoint.position };
    audio.effect('heal'); autoSave(); toast('在星燈旁稍作歇息。生命與魔力已恢復，進度已保存。'); render(); return;
  }
  if (object.kind === 'chest') {
    if (has(state, id)) { toast('箱子已經空了，旅途還有許多驚喜。'); return; }
    state = grantFlag(state, id, s => { s.gold += 20; s.inventory.potion += 2; s.inventory.ether++; });
    audio.effect('light'); toast('獲得 20 枚星幣、月露藥 ×2、星泉水 ×1'); world.sync(state); autoSave(); render(); return;
  }
  if (object.kind === 'herb') {
    if (has(state, id)) return; state = grantFlag(state, id); world.sync(state); autoSave(); toast(`採到月露草（${[1, 2, 3].filter(n => has(state, `herb-${n}`)).length} / 3）。帶回給守燈婆婆吧。`); render(); return;
  }
  if (object.kind === 'memory') {
    if (has(state, id)) { toast('這段記憶，已好好收藏在心裡。'); return; }
    state = grantFlag(state, id, s => { if (id === 'loren-memory') s.xp += 20; }); refreshStats(state); world.sync(state); autoSave(); audio.effect('light');
    if (id === 'loren-memory') talk(LOREN_MEMORY);
    else talk([['莉恩', '一枚刻著小風鈴的墜飾……米菈說過，那是她母親留下的東西。'], ['洛恩', '替她帶回去吧。有些失去，是可以找回來的。']]); return;
  }
  if (object.kind === 'mechanism') {
    if (id.startsWith('beacon')) {
      if (state.mechanisms[id]) { toast('路燈正溫柔地亮著。'); return; }
      state.mechanisms[id] = 1; state.xp += 4; audio.effect('light'); toast(puzzleSolved(state) ? '三盞路燈已亮起。古橋深處傳來樹木甦醒的聲音。' : '微小的燈火，讓森林多了一分暖意。');
    } else if (id.startsWith('valve')) {
      state.mechanisms[id] = state.mechanisms[id] ? 0 : 1; audio.effect('light'); toast(state.mechanisms[id] ? '水閘已開啟。水流找回了原本的方向。' : '水閘已關閉。再次互動可開啟。');
    } else {
      state.mechanisms[id] = ((state.mechanisms[id] ?? 0) + 1) % 4; audio.effect('light');
      if (puzzleSolved(state) && !has(state, 'star-aligned')) state = grantFlag(state, 'star-aligned', s => { s.xp += 24; });
      toast(puzzleSolved(state) ? '三道星光交會。通往守鐘人的封印解開了。' : `星盤指向「${['零', '一', '二', '三'][state.mechanisms[id]]}」。西二、東一、北三。`);
    }
    refreshStats(state); world.sync(state); autoSave(); render(); return;
  }
  if (id === 'merchant') { openMenu('shop'); return; }
  if (id === 'elder') {
    if (!has(state, 'main-quest')) {
      talk([['守燈婆婆', '莉恩，星燈不是靠一個人的力量點亮的。森林的燈、水道的記憶、鐘塔的星盤……它們曾是大家共同的約定。'], ['守燈婆婆', '先去點亮森林的三盞路燈吧。遇上迷途的生靈，找出它們的弱點。連續命中兩次，便能打破護盾。'], ['守燈婆婆', '這些補給帶著。累了就回到藍色星燈旁，村子會一直等你。'], ['莉恩', '我們一定會把黎明帶回來！']], () => { state = grantFlag(state, 'main-quest', s => { s.xp += 10; s.inventory.potion += 2; }); refreshStats(state); autoSave(); toast('主線已開啟：尋回散落的星火'); });
    } else if ([1, 2, 3].every(n => has(state, `herb-${n}`)) && !has(state, 'herb-reward')) {
      talk([['守燈婆婆', '這是……三株月露草？太好了，這下村裡的孩子都有藥喝了。'], ['守燈婆婆', '這枚月露護符送給你。別只照顧別人，也要照顧自己呀。']], () => { state = grantFlag(state, 'herb-reward', s => { s.party[0].accessory = 'moon-charm'; s.inventory.potion += 3; }); refreshStats(state); autoSave(); toast('支線完成：一捧月露。莉恩裝備月露護符，生命上限 +25。'); });
    } else {
      state = grantFlag(state, 'herb-quest'); autoSave(); talk([['守燈婆婆', has(state, 'ending') ? '你聽，鐘聲又和從前一樣了。不，是比從前還要溫柔呢。' : '森林裡有三株發光的月露草，若順路看見，替婆婆帶回來好嗎？'], ['守燈婆婆', '北邊是森林，穿過古橋就是水道。記住，防禦能恢復魔力，星燈能讓你重新出發。']]);
    }
    return;
  }
  if (id === 'child') {
    if (has(state, 'pendant') && !has(state, 'pendant-reward')) {
      talk([['米菈', '是媽媽的風鈴墜飾！我以為再也找不到了……謝謝你們。'], ['米菈', '這顆記憶石送給騎士哥哥。媽媽說，想念一個人的時候，星星也會聽見。']], () => { state = grantFlag(state, 'pendant-reward', s => { s.party[1].accessory = 'memory-charm'; s.inventory.ether += 3; s.inventory.revive++; }); refreshStats(state); autoSave(); toast('支線完成：水底的風鈴。洛恩裝備記憶石，魔力上限 +10。'); });
    } else {
      state = grantFlag(state, 'pendant-quest'); autoSave(); talk([['米菈', has(state, 'pendant-reward') ? '我把風鈴掛在窗邊了。你們回來的時候，它一定會響！' : '我把媽媽的墜飾弄丟在沉星水道了……它是銀色的，上面刻著小風鈴。'], ['莉恩', '交給我們吧。等天亮了，一起去看山上的花。']]);
    }
  }
}
function beginBattle(encounter: Encounter) {
  if (mode !== 'explore') return;
  if (encounter.required && !puzzleSolved(state)) { toast('先完成這個區域的機關，再挑戰守衛吧。'); encounterCooldown = 3; return; }
  autoAttack = false; battleStart = structuredClone(state); battle = startBattle(state, encounter); battleMenu = 'main'; pendingAction = null; audio.battle = true;
  world.showBattle(battle); world.syncBattle(battle); busy = true; setMode('battle'); void enemyTurns();
}
async function enemyTurns() {
  if (!battle) return;
  try {
    const result = advanceEnemies(battle); await feedback(result.events);
    battle = result.battle; world.syncBattle(battle);
    if (battle.status === 'victory') audio.effect('win');
  } finally { busy = false; nextAutoAttack = performance.now() + 350; if (battle?.status !== 'active') autoAttack = false; render(); }
}
async function battleAction(action: Action) {
  if (!battle || busy || battle.status !== 'active') return;
  const result = resolveAction(battle, action, levelFor(state.xp)); if (result.error) { toast(result.error); return; }
  battleMenu = 'main'; pendingAction = null; busy = true; render();
  try {
    await feedback(result.events); battle = result.battle; world.syncBattle(battle); render();
    await enemyTurns();
  } finally { busy = false; nextAutoAttack = performance.now() + 350; if (battle?.status !== 'active') autoAttack = false; render(); }
}
async function feedback(events: BattleEvent[]) {
  const pause = (ms: number) => new Promise<void>(done => setTimeout(done, ms));
  for (const event of events) {
    if (event.target && (event.type === 'damage' || event.type === 'heal')) {
      const effect = event.effect ?? (event.type === 'heal' ? 'heal' : 'slash');
      world.attackEffect(event.source, event.target, effect); audio.combat(effect, 'cast');
      await pause(state.settings.reducedMotion ? 0 : 220);
      world.hitEffect(event.target, effect); audio.combat(effect);
      if (event.amount !== undefined) world.numberEffect(event.target, event.amount, event.type === 'heal');
      await pause(state.settings.reducedMotion ? 60 : 400);
    } else if (event.text.includes('進入第二階段')) { toast(event.text); audio.effect('light');
    } else if (event.type === 'break' && event.target) {
      audio.combat('break'); world.hitEffect(event.target, 'resonance');
    }
  }
}
function setLeader(id: HeroId, focusCard = false) {
  if (mode !== 'explore' || !['lien','loren'].includes(id)) return;
  state.leaderId = id; keys.clear(); world.setLeader(state); autoSave(); render();
  if (focusCard) ui.querySelector<HTMLButtonElement>(`[data-action="leader:${id}"]`)?.focus({preventScroll:true});
}
function autoAttackBlocked() {
  if (!battle || !shouldStopAutoAttack(battle.heroes,state.settings.autoStopLowHp)) return false;
  autoAttack = false; toast('隊員生命低於或等於 30%，已停止自動攻擊。請治療或關閉低血量保護。'); render(); return true;
}
function toggleAutoAttack() {
  if (mode !== 'battle' || battle?.status !== 'active') return;
  if (!autoAttack && autoAttackBlocked()) return;
  autoAttack = !autoAttack; nextAutoAttack = performance.now() + 350; battleMenu = 'main'; pendingAction = null; render();
}
function prepareAction(action: Action) {
  if (busy) return;
  autoAttack = false; pendingAction = action;
  const skill = SKILLS.find(s => s.id === action.id);
  if (action.kind === 'guard' || action.kind === 'escape' || action.kind === 'resonance' || skill?.target === 'all' || skill?.target === 'self') battleAction(action);
  else { battleMenu = 'target'; render(); }
}
function endBattle() {
  if (!battle) return;
  if (battle.status === 'defeat') return;
  const won = battle.status === 'victory'; const id = battle.encounter.id;
  state = finishBattle(state, battle);
  if (!won) state.position.z = Math.min(10, state.position.z + 2.5);
  battle = null; battleStart = null; audio.battle = false; encounterCooldown = 4; world.build(state); setMode('explore');
  if (won) { autoSave(); if (id === 'forest-elite') talk([['莉恩', '樹靈不再悲傷了……它把星火交給了我們。'], ['洛恩', '劍上亮起了新的紋路。森林認可了我們。']], () => toast('獲得星火，兩人武器強化！生命與魔力略微恢復。')); else if (id === 'eclipse') talk([['洛恩', '影子終於安靜下來了。莉恩，帶上星火，去北方星台吧。'], ['莉恩', '讓我們一起，點亮最後一盞燈。']]); else toast('戰鬥勝利。生命與魔力略微恢復，進度已保存。'); }
}
function recoverBattle(retry: boolean) {
  if (!battleStart || !battle) return; autoAttack = false; const encounter = battle.encounter; const settings = { ...state.settings };
  if (retry) { state = structuredClone(battleStart); state.settings = settings; battle = startBattle(state, encounter); world.showBattle(battle); world.syncBattle(battle); battleMenu = 'main'; busy = true; render(); void enemyTurns(); }
  else { state = structuredClone(battleStart); state.settings = settings; state.zone = state.checkpoint.zone; state.position = { ...state.checkpoint.position }; healParty(state); battle = null; battleStart = null; audio.battle = false; world.build(state); encounterCooldown = 4; autoSave(); setMode('explore'); toast('星燈仍在等你。探索進度已保留。'); }
}
function showEnding() {
  if (has(state, 'ending')) { setMode('ending'); return; }
  talk(ENDING, () => { state = grantFlag(state, 'ending'); healParty(state); world.sync(state); autoSave(); audio.effect('win'); setMode('ending'); });
}
const progress = () => has(state, 'ending') ? 100 : state.zone === 'village' ? has(state, 'main-quest') ? 8 : 0 : state.zone === 'forest' ? 15 + [1, 2, 3].filter(n => state.mechanisms[`beacon-${n}`]).length * 6 + (state.defeated.includes('forest-elite') ? 10 : 0) : state.zone === 'waterway' ? 45 + (has(state, 'loren-memory') ? 8 : 0) + (state.mechanisms['valve-1'] ? 5 : 0) + (state.mechanisms['valve-2'] ? 5 : 0) + (state.defeated.includes('water-elite') ? 8 : 0) : 75 + (puzzleSolved(state) ? 10 : 0) + (state.defeated.includes('eclipse') ? 10 : 0);
const playTime = () => `${Math.floor(state.playSeconds / 3600).toString().padStart(2, '0')} : ${Math.floor(state.playSeconds / 60 % 60).toString().padStart(2, '0')}`;
function hud() {
  const z = ZONES[state.zone];
  return `<header class="hud-top"><div class="location"><span class="location-symbol">${icon('pin')}</span><div><span class="eyebrow">${z.chapter}</span><h1>${z.name}<span class="location-dot"></span></h1><span class="location-en">${z.subtitle}</span></div></div><div class="moon-phase">${icon(has(state, 'ending') ? 'sun' : 'moon')}<div><span>${has(state, 'ending') ? '黎明 · 新的約定' : '月蝕前夕'}</span><small>願微光，指引歸途</small></div></div><nav class="hud-nav" aria-label="遊戲選單">${navButton('book', '任務日誌', 'journal', 'J')}${navButton('people', '旅人隊伍', 'party', 'C')}${navButton('bag', '旅途行囊', 'items', 'I')}${navButton('gear', '設定與存檔', 'settings', 'Esc')}</nav></header>
  <div class="world-label" id="world-label"></div><div class="area-announcement" id="area-announcement"><span class="eyebrow">${z.chapter}</span><h2>${z.name}</h2><p>${z.description}</p></div>
  <aside class="quest-widget"><div class="quest-heading"><span class="eyebrow">${icon('star')} ${has(state, 'ending') ? '旅途餘韻' : '當前目標'}</span>${button('地圖','menu:map','map-open')}</div><h3>${has(state, 'ending') ? '星燈重燃之時' : '尋回散落的星火'}</h3><p>${objective(state)}</p><button data-action="menu:journal">開啟旅途日誌 <span>J</span> ${icon('arrow')}</button></aside>
  <aside class="minimap"><div><span class="eyebrow">${z.name} · 北向</span>${button('展開 M','menu:map','text-button')}</div><div data-map-view>${mapView(state,world)}</div><small>● 你　<span>● 主線</span>　● 星燈</small></aside>
  <footer class="hud-bottom"><div class="party-strip">${state.party.map(h => `<button class="hero-chip ${h.id === state.leaderId ? 'is-leader' : ''}" data-action="leader:${h.id}" aria-pressed="${h.id === state.leaderId}" aria-label="設${h.name}為帶隊角色">${portrait(h.id)}<div><div class="hero-name">${h.name}<small>${h.id === state.leaderId ? '帶隊 · ' : ''}Lv. ${levelFor(state.xp)}</small></div><div class="bar health"><i style="width:${h.hp / h.maxHp * 100}%"></i></div><div class="hero-numbers"><span>HP <b>${h.hp}</b><em>/ ${h.maxHp}</em></span><span>MP <b>${h.mp}</b></span></div></div></button>`).join('')}</div><div id="interaction" class="interaction"></div><div class="touch-controls" aria-label="觸控操作"><div class="direction-pad">${[['w','↑','向上移動'],['a','←','向左移動'],['s','↓','向下移動'],['d','→','向右移動']].map(([key,symbol,label])=>`<button data-move="${key}" aria-label="${label}">${symbol}</button>`).join('')}</div>${button('互動', 'interact', 'touch-interact')}</div><div class="key-guide"><span><kbd>W A S D</kbd> 移動</span><span><kbd>E</kbd> 互動</span><span><kbd>Esc</kbd> 選單</span></div></footer>`;
}
function navButton(name: string, label: string, next: Tab, shortcut: string) { return `<button class="nav-icon" data-action="menu:${next}" aria-label="${label}" title="${label} (${shortcut})">${icon(name)}<small>${shortcut}</small></button>`; }
function titleScreen() {
  const available = !!loadGame(storage, 'auto').state || !!loadGame(storage, 'manual').state;
  return `<div class="title-shade"></div><header class="title-header"><a class="wordmark" href="#" aria-label="星燈紀行首頁">${icon('star')}<span>STARLIGHT STUDIO</span></a><span class="edition">AN ORIGINAL HD–2D ADVENTURE <i></i> VOL. 01</span>${button(icon('gear'), 'menu:settings', 'nav-icon')}</header>
  <main class="title-content"><div class="title-kicker"><span></span> 在長夜盡頭，與光重逢</div><div class="title-seal">星を灯す旅</div><h1>星燈<span>紀行</span><i>✧</i></h1><p class="title-english">STARLIGHT CHRONICLE</p><div class="title-divider"><i></i>✦<i></i></div><p class="title-description">有些光，來自遙遠的星辰。<br>有些光，來自我們不曾遺忘的彼此。</p><div class="title-actions">${button(`${icon('star')}<span>啟程<span class="button-en">BEGIN YOUR JOURNEY</span></span>${icon('arrow')}`, 'new', 'primary-button')}${button(`繼續旅程 ${icon('arrow')}`, 'menu:saves', 'continue-button', !available)}</div><div class="title-meta"><span>單人冒險</span><i></i><span>回合制戰鬥</span><i></i><span>繁體中文</span></div></main>
  <div class="scene-caption"><span class="caption-line"></span><span>序章</span><h2>霧鐘村</h2><p>每一段偉大的旅程，都從一盞小小的燈開始。</p><small>01 / 04 — THE VILLAGE OF MISTBELLS</small></div><footer class="title-footer"><span>© 2026 STARLIGHT CHRONICLE</span><span>${icon('sound')} 建議配戴耳機，聆聽星光的聲音</span><button data-action="menu:help">操作指南 ${icon('arrow')}</button></footer>`;
}
function dialoguePanel() {
  if (!dialogue) return ''; const [speaker, text] = dialogue.lines[dialogue.index];
  const kind = ({ '莉恩': 'lien', '洛恩': 'loren', '守燈婆婆': 'elder', '米菈': 'child', '行腳商人': 'merchant' } as Record<string, string>)[speaker];
  return `<div class="dialogue-scrim"></div><section class="dialogue-panel" role="dialog" aria-label="${esc(speaker)}的對話" aria-modal="true"><div class="dialogue-art">${kind ? portrait(kind) : icon('star')}</div><div class="dialogue-body"><div class="dialogue-heading"><h2>${esc(speaker)}</h2><span>${dialogue.index + 1} / ${dialogue.lines.length}</span></div><p tabindex="0" aria-label="對話內容">${esc(text)}</p><div class="dialogue-footer">${button('略過對話 <kbd>Esc</kbd>', 'dialogue:skip', 'text-button')}${button(`${dialogue.index === dialogue.lines.length - 1 ? '繼續旅程' : '繼續'} <kbd>E</kbd> ${icon('arrow')}`, 'dialogue:next', 'dialogue-next')}</div></div></section>`;
}
function modalPanel() {
  const tabs: [Tab, string, string][] = [['map','區域地圖','pin'], ['journal', '旅途日誌', 'book'], ['party', '旅人隊伍', 'people'], ['items', '旅途行囊', 'bag'], ['saves', '星燈記錄', 'save'], ['settings', '旅途設定', 'gear'], ['help', '操作指南', 'star']];
  const title = tab === 'shop' ? '行腳商人的小鋪' : tabs.find(t => t[0] === tab)![1];
  return `<div class="modal-scrim"></div><section class="menu-panel" role="dialog" aria-modal="true" aria-label="${title}"><aside class="menu-sidebar"><div class="menu-brand">${icon('star')}<span>星燈紀行<small>TRAVELER'S COMPANION</small></span></div>${tabs.map(([key, label, symbol]) => button(`${icon(symbol)} ${label}`, `tab:${key}`, tab === key ? 'tab active' : 'tab', previousMode === 'title' && ['map', 'journal', 'party', 'items'].includes(key))).join('')}<div class="sidebar-bottom">${icon('moon')}<span>願微光，指引歸途</span></div></aside><div class="menu-main"><header class="menu-heading"><div><span class="eyebrow">THE JOURNEY WITHIN</span><h2>${title}</h2></div>${button(icon('close'), 'close', 'close-button')}</header><div class="menu-scroll">${menuContent()}</div><footer class="menu-footer"><span>${icon('star')} ${state.gold} 星幣</span><span>旅途時間 ${playTime()}</span><span><kbd>Esc</kbd> 返回</span></footer></div></section>`;
}
function menuContent(): string {
  if (tab === 'map') return `<p class="menu-intro">${objective(state)}</p><div data-map-view class="large-map">${mapView(state,world)}</div><div class="map-legend">● 白色：玩家　<span>● 金色：主線目標</span>　● 青色：星燈<br>北方朝上；道路與障礙完整顯示。收藏物接近四個單位後揭露。</div><ul class="map-points">${mapPoints(state).map(o=>`<li>${getObjective(state).targetIds.includes(o.id)?'★':'◇'} ${esc(o.label)}${has(state,o.id)?'（已讀）':''}</li>`).join('')}</ul>`;

  if (tab === 'journal') {
    return `<div class="chapter-card"><span class="eyebrow">主線 · ${progress()}% COMPLETE</span><h3>尋回散落的星火</h3><p>${objective(state)}</p><div class="progress-track"><i style="width:${progress()}%"></i></div></div><h3 class="section-label">旅途的足跡</h3><div class="chapter-list">${ZONE_ORDER.map((id, i) => `<div class="chapter-row ${id === state.zone ? 'current' : ''}"><span class="chapter-number">0${i + 1}</span><div><h4>${ZONES[id].name}</h4><p>${i === 0 ? '與婆婆交談，從北方小徑出發。' : i === 1 ? '點亮三盞路燈，挑戰守橋樹靈。' : i === 2 ? '開啟兩道水閘，拾回西北方的記憶。' : '調整星盤：西二、東一、北三。'}</p></div><span>${id === state.zone ? '旅途之中' : ZONE_ORDER.indexOf(state.zone) > i || has(state, 'ending') ? '已抵達' : '等待探訪'}</span></div>`).join('')}</div><h3 class="section-label">拾回的記憶 · ${Object.keys(LORE).filter(id => has(state, id)).length} / 8</h3><div class="lore-notes">${Object.entries(LORE).filter(([id]) => has(state, id)).map(([, note]) => `<details><summary>${note.title}</summary>${note.lines.map(([speaker, text]) => `<p><b>${speaker}</b>${text}</p>`).join('')}</details>`).join('') || '<p class="footnote">沿途的碑文、信紙與舊物，藏著山城曾經的故事。</p>'}</div><h3 class="section-label">沿途的約定</h3><div class="sidequest"><h4>${has(state, 'herb-reward') ? '✓' : '◇'} 一捧月露</h4><p>在森林採集三株月露草，帶回霧鐘村給守燈婆婆。${[1, 2, 3].filter(n => has(state, `herb-${n}`)).length} / 3</p><small>獎勵：月露護符（生命 +25）、月露藥 ×3</small></div><div class="sidequest"><h4>${has(state, 'pendant-reward') ? '✓' : '◇'} 水底的風鈴</h4><p>在沉星水道東南方尋找銀色墜飾，交給村裡的米菈。</p><small>獎勵：記憶石（魔力 +10）、星泉水 ×3、甦醒之羽 ×1</small></div>`;
  }
  if (tab === 'party') return `<div class="party-cards">${state.party.map(h => `<article class="party-card"><div class="character-art ${h.id}">${portrait(h.id)}<span>0${h.id === 'lien' ? '1' : '2'}</span></div><div class="character-info"><span class="eyebrow">${h.id === 'lien' ? 'THE LANTERN KEEPER' : 'THE FORGOTTEN KNIGHT'}</span><h3>${h.name}<small>${h.id === state.leaderId ? '帶隊 · ' : ''}Lv. ${levelFor(state.xp)}</small></h3><p>${h.id === 'lien' ? '「只要還有人記得，燈火就不會熄滅。」' : '「這一次，我不會再獨自守燈。」'}</p><div class="stat-grid"><span>生命 <b>${h.hp} / ${h.maxHp}</b></span><span>魔力 <b>${h.mp} / ${h.maxMp}</b></span><span>攻擊 <b>${h.atk}</b></span><span>防禦 <b>${h.def}</b></span><span>速度 <b>${h.speed}</b></span><span>經驗 <b>${state.xp}</b></span></div><div class="equipment"><span>${icon('sword')} ${has(state, 'weapon-upgrade') ? '星火強化 · ' : ''}${h.id === 'lien' ? '守燈人的提燈' : '刻名的古劍'}</span><span>${icon('star')} ${h.accessory === 'moon-charm' ? '月露護符 · HP +25' : h.accessory === 'memory-charm' ? '記憶石 · MP +10' : '尚未裝備飾品'}</span></div><h4 class="section-label">旅人技能</h4>${SKILLS.filter(s => s.owner === h.id).map(s => `<div class="skill-row ${s.level > levelFor(state.xp) ? 'locked' : ''}"><span>${s.name}<small>${s.description}</small></span><b>${s.level > levelFor(state.xp) ? `Lv.${s.level} 解鎖` : `${s.cost} MP`}</b></div>`).join('')}</div></article>`).join('')}</div>`;
  if (tab === 'items' || tab === 'shop') return `<p class="menu-intro">${tab === 'shop' ? '「東西不多，但每一件都能讓旅途安心些。星燈旁休息免費，別忘了！」' : '留給漫漫長夜的一點準備。選擇道具，再選擇使用的旅人。'}</p><div class="inventory-list">${(Object.keys(ITEMS) as ItemId[]).map(id => `<article class="inventory-item"><div class="item-icon ${id}">${icon(id === 'revive' ? 'leaf' : id === 'ether' ? 'star' : 'bag')}</div><div><h3>${ITEMS[id].name}<small>持有 ${state.inventory[id]}</small></h3><p>${ITEMS[id].description}</p></div><div class="item-actions">${tab === 'shop' ? button(`購買 · ${ITEMS[id].price} 星幣`, `buy:${id}`, 'outline-button', state.gold < ITEMS[id].price) : state.party.map(h => button(`給${h.name}`, `use:${id}:${h.id}`, 'outline-button', state.inventory[id] <= 0 || (id === 'revive' ? h.hp > 0 : h.hp <= 0 || (id === 'potion' ? h.hp === h.maxHp : h.mp === h.maxMp)))).join('')}</div></article>`).join('')}</div>${tab === 'shop' ? '<p class="footnote">旅途的小提醒：守橋菁英也會留下補給。藍色星燈可以完全恢復生命與魔力。</p>' : ''}`;
  if (tab === 'saves') return `<p class="menu-intro">把此刻的星光，好好收藏。每個欄位獨立保存；自動記錄不會覆蓋手動記錄。</p>${(['auto', 'manual'] as const).map(slot => {
    const loaded = loadGame(storage, slot); const s = loaded.state;
    return `<article class="save-slot">${icon('save')}<div><span class="eyebrow">${slot === 'auto' ? 'AUTO SAVE' : 'MANUAL SAVE'}</span><h3>${slot === 'auto' ? '沿途的星光' : '親手留下的記號'}</h3><p>${s ? `${ZONES[s.zone].name} · Lv.${levelFor(s.xp)} · ${Math.floor(s.playSeconds / 60)} 分鐘` : loaded.error}</p></div><div>${button('讀取記錄', `load:${slot}`, 'outline-button', !s)}${slot === 'manual' && previousMode !== 'title' ? button('寫下此刻', 'save', 'outline-button') : ''}</div></article>`;
  }).join('')}<p class="footnote">進度保存在此瀏覽器。清除網站資料將移除記錄；不同裝置不會同步。</p>`;
  if (tab === 'settings') return `<p class="menu-intro">用適合自己的步調，走完這段旅程。</p><div class="setting-row"><div><h3>${icon('sound')} 星光的聲音</h3><p>調整音樂與音效的音量</p></div><label class="volume-control"><input aria-label="音量" type="range" id="volume" min="0" max="100" value="${Math.round(state.settings.volume * 100)}"/><output>${Math.round(state.settings.volume * 100)}%</output></label></div><div class="setting-row"><div><h3>${icon('sun')} 光影品質</h3><p>高畫質開啟陰影、泛光與螢火粒子</p></div><div class="segmented">${button('輕盈', 'quality:low', state.settings.quality === 'low' ? 'selected' : '')}${button('細緻', 'quality:high', state.settings.quality === 'high' ? 'selected' : '')}</div></div><div class="setting-row"><div><h3>${icon('leaf')} 減少動態效果</h3><p>停用角色浮動與粒子，縮短戰鬥等待</p></div><button class="toggle ${state.settings.reducedMotion ? 'on' : ''}" role="switch" aria-label="減少動態效果" aria-checked="${state.settings.reducedMotion}" data-action="motion"><i></i></button></div>${previousMode !== 'title' ? `<div class="setting-row"><div><h3>${icon('save')} 手動記錄</h3><p>將目前的旅程寫入手動存檔</p></div>${button('保存進度', 'save', 'outline-button')}</div><div class="setting-row"><div><h3>回到標題畫面</h3><p>返回前會先自動保存目前進度</p></div>${button('返回標題', 'title', 'text-button')}</div>` : ''}<div class="setting-row"><div><h3>低血量時停止自動攻擊</h3><p>任一隊員 HP ≤30%（含倒地）時停止；不自動補血。</p></div><button class="toggle ${state.settings.autoStopLowHp ? 'on' : ''}" role="switch" aria-label="低血量時停止自動攻擊" aria-checked="${state.settings.autoStopLowHp}" data-action="lowhp"><i></i></button></div><div class="settings-note">${icon('moon')} <p>所有星燈都能完全恢復隊伍。這是一段可以安心探索、隨時歇息的旅程。</p></div>`;
  return `<div class="help-grid"><article><span class="eyebrow">01 / EXPLORE</span><h3>循著燈火，往前走</h3><p><kbd>W A S D</kbd> 或方向鍵：依畫面方向移動<br><kbd>E</kbd> 或 <kbd>Enter</kbd>：互動、推進對話<br><kbd>Tab</kbd> 切換帶隊（未聚焦按鈕時）<br><kbd>M</kbd> 地圖　<kbd>J</kbd> 任務　<kbd>C</kbd> 隊伍　<kbd>I</kbd> 行囊<br><kbd>Esc</kbd> 略過整段對話、暫停或返回選單</p></article><article><span class="eyebrow">02 / BATTLE</span><h3>讓弱點，成為轉機</h3><p>依速度輪流行動，點擊指令與目標。按 A 或戰鬥右上角按鈕切換自動普通攻擊；按 Esc 停止。命中弱點兩次可破盾，讓敵人跳過下一次行動，並受到更多傷害。</p></article><article><span class="eyebrow">03 / RESONANCE</span><h3>兩個人的光</h3><p>每次行動都會累積共鳴。共鳴滿 100 且兩人存活時，可以施放聯手技。防禦恢復 4 MP，也能減少傷害。</p></article><article><span class="eyebrow">04 / REST</span><h3>總有一盞燈，等你回來</h3><p>藍色星燈提供免費休息與自動記錄。一般戰鬥可以逃跑；失敗能重試，或保留探索進度回到星燈。</p></article></div><p class="footnote">桌面可使用鍵盤或滑鼠操作選單；窄螢幕與觸控裝置提供方向鍵及互動按鈕，按住方向鍵移動、放開停止。</p>`;
}
function statusBadges(b: Battle, id: string) {
  return `<div class="status-badges">${combatStatuses(b,id).map(text=>`<button data-action="status" data-description="${esc(text)}" title="${esc(text)}">${esc(text.split('：')[0])}${text.startsWith('碎甲') ? ` · ${b.enemies.find(e=>e.id===id)!.armor}` : ''}</button>`).join('')}</div>`;
}
function battlePanel() {
  if (!battle) return ''; const b = battle; const actor = b.heroes.find(h => h.id === currentActor(b));
  const title = b.encounter.id === 'eclipse' ? '最後的守望' : b.encounter.required ? '星火的試煉' : '林間的邂逅';
  let commands = '';
  if (b.status === 'victory') {
    const xp = b.encounter.enemies.reduce((sum, k) => sum + ENEMIES[k].xp, 0); const gold = b.encounter.enemies.reduce((sum, k) => sum + ENEMIES[k].gold, 0);
    commands = `<div class="battle-result"><span class="eyebrow">VICTORY</span><h2>星光，仍與你同在。</h2><p>經驗 +${xp}　星幣 +${gold}${b.encounter.required ? '　獲得旅途補給' : ''}</p>${button(`繼續旅程 ${icon('arrow')}`, 'battle:end', 'primary-button', busy)}</div>`;
  } else if (b.status === 'defeat') commands = `<div class="battle-result"><span class="eyebrow">A LIGHT STILL WAITS</span><h2>這段旅程，還沒有結束。</h2><p>站起來吧。星燈會記得你走過的路。</p><div class="inline-actions">${button('重新挑戰', 'battle:retry', 'outline-button')}${button('回到最近星燈', 'battle:checkpoint', 'outline-button')}</div></div>`;
  else if (b.status === 'escaped') commands = `<div class="battle-result"><h2>暫別，並非放棄。</h2>${button('返回探索', 'battle:end', 'outline-button')}</div>`;
  else if (busy) commands = `<div class="battle-thinking">${icon('star')} 星光交錯之時……</div>`;
  else if (battleMenu === 'main') commands = `<div class="turn-label">${portrait(actor?.id ?? 'lien')}<div><span class="eyebrow">YOUR TURN</span><h3>${actor?.name}的回合</h3></div></div><div class="command-grid">${button(`${icon('sword')} 攻擊 <small>不消耗魔力</small>`, 'act:attack', 'command')}${button(`${icon('star')} 技能 <small>運用星火之力</small>`, 'battle:skills', 'command')}${button(`${icon('moon')} 防禦 <small>減傷・恢復 4 MP</small>`, 'act:guard', 'command')}${button(`${icon('bag')} 道具 <small>旅途中的補給</small>`, 'battle:items', 'command')}${button(`${icon('sun')} 星燈破曉 <small>聯手技・共鳴 ${b.resonance}/100</small>`, 'act:resonance', 'command resonance-command', b.resonance < 100 || b.heroes.some(h => h.hp <= 0))}${button(`撤離戰場 ${icon('arrow')}`, 'act:escape', 'command escape-command', !!b.encounter.required)}</div>`;
  else if (battleMenu === 'skills') commands = `<div class="subcommand-heading"><h3>${actor?.name}的技能</h3>${button('返回', 'battle:back', 'text-button')}</div><div class="skill-commands">${SKILLS.filter(s => s.owner === actor?.id).map(s => button(`<span>${s.name}<small>${s.description}</small></span><b>${s.level > levelFor(state.xp) ? `Lv.${s.level}` : `${s.cost} MP`}</b>`, `skill:${s.id}`, 'skill-command', s.level > levelFor(state.xp) || (actor?.mp ?? 0) < s.cost)).join('')}</div>`;
  else if (battleMenu === 'items') commands = `<div class="subcommand-heading"><h3>旅途補給</h3>${button('返回', 'battle:back', 'text-button')}</div><div class="skill-commands">${(Object.keys(ITEMS) as ItemId[]).map(id => button(`<span>${ITEMS[id].name}<small>${ITEMS[id].description}</small></span><b>× ${b.inventory[id]}</b>`, `battle-item:${id}`, 'skill-command', b.inventory[id] <= 0)).join('')}</div>`;
  else {
    const ally = pendingAction?.kind === 'item' || SKILLS.find(s => s.id === pendingAction?.id)?.target === 'ally';
    commands = `<div class="subcommand-heading"><h3>選擇${ally ? '同伴' : '敵人'}</h3>${button('返回', 'battle:back', 'text-button')}</div><div class="target-commands">${(ally ? b.heroes : b.enemies.filter(e => e.hp > 0)).map(a => button(`<span>${a.name}</span><small>HP ${a.hp} / ${a.maxHp}</small>${icon('arrow')}`, `target:${a.id}`, 'target-command')).join('')}</div>`;
  }
  return `<div class="battle-shade"></div><header class="battle-header"><div><span class="eyebrow">${b.encounter.required ? 'STARBORN TRIAL' : 'ENCOUNTER'}</span><h1>${title}</h1></div><div class="turn-order"><span>ROUND ${b.round.toString().padStart(2, '0')}</span>${b.order.slice(b.cursor).map(id => { const h = b.heroes.find(h => h.id === id); const e = b.enemies.find(e => e.id === id); return `<span class="turn-token ${h ? 'ally' : 'enemy'} ${id === currentActor(b) ? 'current' : ''} ${e && enemyIntent(b,e) === '本回合重擊！' ? 'threat' : ''}" title="${h?.name ?? e?.name}${e ? ' · ' + enemyIntent(b,e) : ''}">${h ? h.name[0] : icon('sword')}${e && enemyIntent(b,e) === '本回合重擊！' ? '<sup>!</sup>' : ''}</span>`; }).join('')}</div><div class="battle-header-controls"><span class="battle-area">${ZONES[state.zone].name}</span><div class="battle-actions"><button class="auto-attack ${autoAttack ? 'enabled' : ''}" data-action="auto-attack" aria-pressed="${autoAttack}" ${b.status !== 'active' ? 'disabled' : ''}>${icon('sword')} ${autoAttack ? '停止自動攻擊' : '自動攻擊'} <kbd>A</kbd></button></div></div></header><div class="enemy-info">${b.enemies.map(e => `<article class="enemy-card ${e.hp <= 0 ? 'fallen' : ''}"><div><h3>${e.name}</h3><span class="weakness">弱點 · ${ELEMENT_NAMES[e.weakness]}</span></div><p class="enemy-intent ${enemyIntent(b,e) === '本回合重擊！' ? 'danger' : ''}">${enemyIntent(b,e)}</p>${e.template === 'eclipse' ? `<small class="boss-phase">階段 ${e.phase} / 2</small>` : ''}${statusBadges(b,e.id)}<div class="bar enemy-hp"><i style="width:${e.hp / e.maxHp * 100}%"></i></div><div class="enemy-meta"><span>${e.hp} / ${e.maxHp}</span><span class="shield ${e.broken ? 'broken' : ''}">${e.broken ? '✧ BREAK' : `${e.shield > 0 ? '◆' : '◇'} ${e.shield > 1 ? '◆' : '◇'}`}</span></div></article>`).join('')}</div><div class="battle-log" aria-live="polite">${b.log.slice(-3).map((l, i) => `<p style="opacity:${0.45 + i * 0.25}">${esc(l)}</p>`).join('')}</div><footer class="battle-bottom"><div class="battle-party">${b.heroes.map(h => `<article class="battle-hero ${h.id === currentActor(b) ? 'active' : ''} ${h.hp <= 0 ? 'fallen' : ''}">${portrait(h.id)}<div><h3>${h.name}<small>Lv.${levelFor(state.xp)}</small></h3><div class="bar health"><i style="width:${h.hp / h.maxHp * 100}%"></i></div><p>HP <b>${h.hp}</b> / ${h.maxHp}<span>MP <b>${h.mp}</b> / ${h.maxMp}</span></p>${statusBadges(b,h.id)}</div></article>`).join('')}<div class="resonance-meter"><span>✧ 共鳴 <b>${b.resonance}%</b></span><div class="bar"><i style="width:${b.resonance}%"></i></div></div></div><section class="battle-commands">${commands}${b.status === 'active' ? `<div class="auto-policy"><button data-action="lowhp" aria-pressed="${state.settings.autoStopLowHp}">低血量保護：${state.settings.autoStopLowHp ? '開（≤30%）' : '關'}</button></div>` : ''}</section></footer>`;
}
function endingPanel() { return `<div class="ending-scrim"></div><section class="ending-panel"><span class="ending-star">✧</span><span class="eyebrow">THE LIGHT WE CARRY</span><h1>長夜盡頭，<br>是我們的黎明。</h1><p>你找回了散落的星火，<br>也讓一座山城，重新記起了彼此。</p><div class="ending-stats"><span><b>${state.defeated.length}</b> 次並肩作戰</span><span><b>${['herb-reward', 'pendant-reward'].filter(f => has(state, f)).length}</b> 個完成的約定</span><span><b>${Math.floor(state.playSeconds / 60)}</b> 分鐘的旅程</span></div>${button(`回到星光下 ${icon('arrow')}`, 'ending:explore', 'primary-button')}<small>感謝你，成為這個故事的一部分。<br>通關進度已保存，可繼續探索與完成支線。</small></section>`; }
function render() {
  ui.innerHTML = mode === 'title' ? titleScreen() : mode === 'battle' ? battlePanel() : `${previousMode === 'title' && mode === 'pause' ? titleScreen() : hud()}${mode === 'dialogue' ? dialoguePanel() : mode === 'pause' ? modalPanel() : mode === 'ending' ? endingPanel() : ''}`;
  document.querySelector('#game')!.className = `mode-${mode}${state.settings.reducedMotion ? ' reduced-motion' : ''}`;
  ui.querySelectorAll<HTMLButtonElement>('button').forEach(b => { if (!b.hasAttribute('aria-label') && !b.textContent?.trim()) b.setAttribute('aria-label', b.dataset.action === 'close' ? '關閉選單' : '開啟設定'); });
  if (mode === 'pause' || mode === 'dialogue' || mode === 'ending') requestAnimationFrame(() => (ui.querySelector('.close-button, .dialogue-next, .ending-panel button') as HTMLElement | null)?.focus({ preventScroll: true }));
}
ui.addEventListener('click', event => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]'); if (!target || target.disabled) return;
  const [action, a, b] = target.dataset.action!.split(':');
  audio.start(); audio.effect('confirm');
  if (action === 'status') { toast(target.dataset.description!); }
  else if (action === 'leader') setLeader(a as HeroId,true);
  else if (action === 'lowhp') { state.settings.autoStopLowHp = !state.settings.autoStopLowHp; if (mode !== 'battle' && previousMode !== 'title') autoSave(); render(); }
  else if (action === 'auto-attack') toggleAutoAttack();
  else if (action === 'new') startNew();
  else if (action === 'menu') openMenu(a as Tab);
  else if (action === 'tab') { tab = a as Tab; render(); }
  else if (action === 'close') closeMenu();
  else if (action === 'dialogue') nextLine(a === 'skip');
  else if (action === 'interact') interact();
  else if (action === 'save') { store('manual'); if (tab === 'saves') render(); }
  else if (action === 'load') continueGame(a as 'auto' | 'manual');
  else if (action === 'quality') { state.settings.quality = a as 'low' | 'high'; settingsSync(); if (previousMode !== 'title') autoSave(); render(); }
  else if (action === 'motion') { state.settings.reducedMotion = !state.settings.reducedMotion; settingsSync(); if (previousMode !== 'title') autoSave(); render(); }
  else if (action === 'title') { autoSave(); world.build(state); setMode('title'); }
  else if (action === 'buy') { const id = a as ItemId; if (state.gold >= ITEMS[id].price) { state.gold -= ITEMS[id].price; state.inventory[id]++; autoSave(); render(); toast(`已購買${ITEMS[id].name}`); } }
  else if (action === 'use') { const h = state.party.find(h => h.id === b)!; const id = a as ItemId; if (state.inventory[id] > 0 && applyItem(h, id)) { state.inventory[id]--; audio.effect('heal'); autoSave(); render(); } else toast('目前不需要使用這個道具。'); }
  else if (action === 'act') prepareAction({ kind: a as Action['kind'] });
  else if (action === 'skill') prepareAction({ kind: 'skill', id: a });
  else if (action === 'battle-item') prepareAction({ kind: 'item', id: a });
  else if (action === 'target' && pendingAction) battleAction({ ...pendingAction, target: a });
  else if (action === 'battle') {
    if (busy) return;
    autoAttack = false;
    if (a === 'end') endBattle(); else if (a === 'retry') recoverBattle(true); else if (a === 'checkpoint') recoverBattle(false);
    else { battleMenu = a === 'back' ? 'main' : a as 'skills' | 'items'; render(); }
  }
  else if (action === 'ending') { setMode('explore'); showArea(); }
});
ui.addEventListener('input', event => { const t = event.target as HTMLInputElement; if (t.id === 'volume') { state.settings.volume = Number(t.value) / 100; audio.setVolume(state.settings.volume); t.nextElementSibling!.textContent = `${t.value}%`; if (previousMode !== 'title') autoSave(); } });
window.addEventListener('keydown', e => {
  if (e.repeat && !['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) return;
  const k = e.key.toLowerCase();
  if (mode === 'explore' && k === 'tab' && !(e.target as HTMLElement).closest('button,input,a,select,textarea,[tabindex]')) { e.preventDefault(); setLeader(state.leaderId === 'lien' ? 'loren' : 'lien'); return; }
  if (mode === 'explore' && k === 'm') { e.preventDefault(); openMenu('map'); return; }
  if (mode === 'dialogue' && ['e', 'enter', ' '].includes(k)) { e.preventDefault(); nextLine(); return; }
  if (mode === 'dialogue' && k === 'escape') { e.preventDefault(); nextLine(true); return; }
  if (mode === 'battle' && k === 'a') { e.preventDefault(); if (!e.repeat) toggleAutoAttack(); return; }
  if (mode === 'battle' && k === 'escape' && autoAttack) { e.preventDefault(); toggleAutoAttack(); return; }
  if (k === 'escape') { e.preventDefault(); if (mode === 'pause') closeMenu(); else if (mode === 'explore' || mode === 'title') openMenu('settings'); else if (mode === 'battle' && !busy && battle?.status === 'active') { battleMenu = 'main'; render(); } return; }
  if (mode !== 'explore') return;
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e', 'enter', 'j', 'c', 'i', 'm'].includes(k)) e.preventDefault();
  if (k === 'e' || k === 'enter') { interact(); return; }
  if (['j', 'c', 'i'].includes(k)) { openMenu(k === 'j' ? 'journal' : k === 'c' ? 'party' : 'items'); return; }
  keys.add(k);
});
ui.addEventListener('pointerdown', event => {
  const control = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-move]');
  if (!control || mode !== 'explore') return;
  event.preventDefault(); control.setPointerCapture(event.pointerId); keys.add(control.dataset.move!);
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) ui.addEventListener(name, event => {
  const control = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-move]');
  if (control) keys.delete(control.dataset.move!);
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase())); window.addEventListener('blur', () => keys.clear());
window.addEventListener('beforeunload', () => { if (mode !== 'title' && mode !== 'battle' && !(mode === 'pause' && previousMode === 'title')) autoSave(); });
ui.addEventListener('keydown', e => {
  if (!['pause', 'dialogue', 'ending'].includes(mode) || e.key !== 'Tab') return;
  const container = ui.querySelector('.menu-panel, .dialogue-panel, .ending-panel')!; const focusable = Array.from(container.querySelectorAll<HTMLElement>('button:not(:disabled), input, a[href], summary, [tabindex="0"]'));
  const first = focusable[0]; const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
function updatePrompt() {
  const obj = closestObject(state); const next = obj?.id ?? ''; world.highlight(obj?.id);
  if (next !== nearby) {
    nearby = next; const prompt = document.querySelector('#interaction'); const label = document.querySelector<HTMLElement>('#world-label');
    if (prompt) prompt.innerHTML = obj ? button(`<kbd>E</kbd> ${obj.label} ${icon('arrow')}`, 'interact', 'interact-button') : '';
    if (label) label.innerHTML = obj ? `<span>◇</span> ${obj.label}` : '';
  }
  const label = document.querySelector<HTMLElement>('#world-label'); if (label && obj) { const p = world.project(obj); label.style.left = `${p.x}%`; label.style.top = `${p.y - 5}%`; }
}
function frame(now: number) {
  requestAnimationFrame(frame); const dt = Math.min((now - lastTick) / 1000, 0.05); lastTick = now; let moving = false; let mx = 0; let mz = 0;
  if (!document.hidden && mode !== 'title' && !(mode === 'pause' && previousMode === 'title')) {
    timeAccumulator += dt; if (timeAccumulator >= 1) { state.playSeconds++; timeAccumulator -= 1; const el = document.querySelector('#play-time'); if (el) el.textContent = playTime(); }
  }
  if (mode === 'battle' && !document.hidden && autoAttack && !busy && battle?.status === 'active' && now >= nextAutoAttack) {
    nextAutoAttack = now + 350; if (!autoAttackBlocked()) void battleAction({ kind: 'attack' });
  }
  if (mode === 'explore' && !document.hidden) {
    encounterCooldown = Math.max(0, encounterCooldown - dt);
    const dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
    const dz = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
    if (dx || dz) { const dir = world.screenDirection(dx, dz); const length = Math.hypot(dir.x, dir.z); mx = dir.x / length * dt * 4.2; mz = dir.z / length * dt * 4.2;
      if (world.canWalk(state.position.x + mx, state.position.z)) { state.position.x += mx; moving = true; }
      if (world.canWalk(state.position.x, state.position.z + mz)) { state.position.z += mz; moving = true; }
    }
    if (now - mapTick >= 100) {
      mapTick = now;
      if (discoverNearby(state)) { autoSave(); document.querySelectorAll('[data-map-view]').forEach(el=>{el.innerHTML=mapView(state,world);}); }
      else document.querySelectorAll('[data-map-player]').forEach(el=>{el.setAttribute('cx',String(state.position.x));el.setAttribute('cy',String(state.position.z));});
    }
    updatePrompt();
    if (encounterCooldown <= 0) { const encounter = ZONES[state.zone].encounters.find(e => !state.defeated.includes(e.id) && Math.hypot(e.x - state.position.x, e.z - state.position.z) < (e.required ? 1.55 : 0.95)); if (encounter) beginBattle(encounter); }
  }
  world.render(state, moving, mode, mx, mz);
}
world.build(state); render(); requestAnimationFrame(frame);
// Development-only fixture access for reproducible browser QA; omitted from production builds.
if (import.meta.env.DEV) {
  Object.assign(window, { __starlight: {
    canWalk: (x: number, z: number) => world.canWalk(x, z),
    getState: () => structuredClone(state), getMode: () => mode, getBattle: () => structuredClone(battle),
    fixture: (zone: ZoneId, options: { ready?: boolean; strong?: boolean } = {}) => {
      state = newGame(); state.zone = zone; state.flags = ['intro', 'main-quest']; state.defeated = ZONE_ORDER.slice(1,ZONE_ORDER.indexOf(zone)).map(z=>z === 'forest' ? 'forest-elite' : 'water-elite');
      if (options.strong) { state.xp = 160; refreshStats(state); healParty(state); }
      if (options.ready) { Object.assign(state.mechanisms, { 'beacon-1': 1, 'beacon-2': 1, 'beacon-3': 1, 'valve-1': 1, 'valve-2': 1, 'dial-1': 2, 'dial-2': 1, 'dial-3': 3 }); state.flags.push('loren-memory'); }
      state.position = { x: 0, z: 7 }; state.checkpoint = { zone, position: { x: 0, z: 7 } }; battle = null; world.build(state); setMode('explore'); encounterCooldown = 2;
    },
    interact: (id: string) => { const obj = ZONES[state.zone].objects.find(o => o.id === id); if (obj) { state.position = { x: obj.x + 0.4, z: obj.z + 0.6 }; interact(obj); } },
    encounter: (id: string) => { const e = ZONES[state.zone].encounters.find(e => e.id === id); if (e) beginBattle(e); },
    action: battleAction, advanceDialogue: () => nextLine(true), moveTo: (x: number, z: number) => { if (world.canWalk(x, z)) state.position = { x, z }; },
  } });
}
