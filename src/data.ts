export type ZoneId = 'village' | 'forest' | 'waterway' | 'tower';
export type Element = 'slash' | 'fire' | 'star';
export type CombatEffect = Element | 'resonance' | 'heal';
export type ItemId = 'potion' | 'ether' | 'revive';
export type Vec2 = { x: number; z: number };
export type HeroId = 'lien' | 'loren';
export interface Hero { id: HeroId; name: string; hp: number; mp: number; maxHp: number; maxMp: number; atk: number; def: number; speed: number; accessory: string | null }
export interface Settings { volume: number; quality: 'high' | 'low'; reducedMotion: boolean; autoStopLowHp: boolean }
export interface GameState {
  version: 1; leaderId: HeroId; discoveredObjectIds: string[]; zone: ZoneId; position: Vec2; party: Hero[]; xp: number; gold: number;
  inventory: Record<ItemId, number>; flags: string[]; defeated: string[];
  mechanisms: Record<string, number>; checkpoint: { zone: ZoneId; position: Vec2 };
  playSeconds: number; settings: Settings;
}
export interface Interactable extends Vec2 { id: string; label: string; kind: 'npc' | 'lamp' | 'mechanism' | 'chest' | 'herb' | 'memory' | 'exit' | 'back' | 'lore' | 'clue'; }
export interface Encounter extends Vec2 { id: string; enemies: string[]; required?: boolean; }
export interface Zone { id: ZoneId; name: string; subtitle: string; chapter: string; description: string; color: string; objects: Interactable[]; encounters: Encounter[]; }
export const ZONES: Record<ZoneId, Zone> = {
  village: {
    id: 'village', name: '霧鐘村', subtitle: 'THE VILLAGE OF MISTBELLS', chapter: '序章 · 長夜的微光', color: '#78a6a0',
    description: '山霧拂過屋簷，遠處的鐘聲，比記憶中更輕。',
    objects: [
      { id: 'elder', label: '守燈婆婆', kind: 'npc', x: -3, z: 2 },
      { id: 'merchant', label: '行腳商人', kind: 'npc', x: 7, z: 4 },
      { id: 'child', label: '米菈', kind: 'npc', x: -7, z: 7 },
      { id: 'village-lamp', label: '星燈 · 休息與記錄', kind: 'lamp', x: 1.8, z: 1 },
      { id: 'village-chest', label: '旅人的補給', kind: 'chest', x: 8, z: -3 },
      { id: 'bridge-lantern', label: '古橋的舊提燈', kind: 'clue', x: -4, z: 5 },
      { id: 'forest-exit', label: '前往螢光森林', kind: 'exit', x: 0, z: -10.2 },
    ], encounters: [],
  },
  forest: {
    id: 'forest', name: '螢光森林', subtitle: 'THE LUMINESCENT WOODS', chapter: '第一章 · 森林會記得', color: '#79bba2',
    description: '那些在黑暗裡飛舞的，是螢火，還是未曾說出口的願望？',
    objects: [
      { id: 'forest-back', label: '返回霧鐘村', kind: 'back', x: 0, z: 10.5 },
      { id: 'forest-lamp', label: '星燈 · 林間營地', kind: 'lamp', x: 3, z: 7 },
      { id: 'beacon-1', label: '點亮西側路燈', kind: 'mechanism', x: -7, z: 2 },
      { id: 'beacon-2', label: '點亮東側路燈', kind: 'mechanism', x: 7, z: -2 },
      { id: 'beacon-3', label: '點亮古橋路燈', kind: 'mechanism', x: -3, z: -6 },
      { id: 'herb-1', label: '採集月露草', kind: 'herb', x: -9, z: 5 },
      { id: 'herb-2', label: '採集月露草', kind: 'herb', x: 9, z: 1 },
      { id: 'herb-3', label: '採集月露草', kind: 'herb', x: -7, z: -6 },
      { id: 'forest-chest', label: '樹根下的木箱', kind: 'chest', x: 8, z: -6 },
      { id: 'waterway-exit', label: '穿過古橋 · 沉星水道', kind: 'exit', x: 0, z: -10.2 },
    ], encounters: [
      { id: 'f1', x: -2, z: 5, enemies: ['slime'] },
      { id: 'f2', x: -5, z: -1, enemies: ['moth', 'slime'] },
      { id: 'f3', x: 5, z: -4, enemies: ['root', 'moth'] },
      { id: 'forest-elite', x: 0, z: -8, enemies: ['guardian'], required: true },
    ],
  },
  waterway: {
    id: 'waterway', name: '沉星水道', subtitle: 'THE DROWNED AQUEDUCT', chapter: '第二章 · 水底的名字', color: '#88b9c7',
    description: '水流帶不走一切。有些名字，仍刻在石頭的心上。',
    objects: [
      { id: 'waterway-back', label: '返回螢光森林', kind: 'back', x: 0, z: 10.5 },
      { id: 'waterway-lamp', label: '星燈 · 守望平台', kind: 'lamp', x: -3, z: 7 },
      { id: 'valve-1', label: '開啟西側水閘', kind: 'mechanism', x: -7, z: 1 },
      { id: 'valve-2', label: '開啟東側水閘', kind: 'mechanism', x: 7, z: -4 },
      { id: 'loren-memory', label: '拾起騎士的記憶', kind: 'memory', x: -6, z: -5 },
      { id: 'pendant', label: '水邊的銀色墜飾', kind: 'memory', x: 8, z: 4 },
      { id: 'waterway-chest', label: '石室中的寶箱', kind: 'chest', x: -9, z: -1 },
      { id: 'tower-exit', label: '登上月蝕鐘塔', kind: 'exit', x: 0, z: -10.2 },
    ], encounters: [
      { id: 'w1', x: 2, z: 4, enemies: ['wisp', 'slime'] },
      { id: 'w2', x: -5, z: -2, enemies: ['sentinel', 'wisp'] },
      { id: 'w3', x: 5, z: -6, enemies: ['raven', 'sentinel'] },
      { id: 'water-elite', x: 0, z: -8, enemies: ['warden'], required: true },
    ],
  },
  tower: {
    id: 'tower', name: '月蝕鐘塔', subtitle: 'THE ECLIPSE SPIRE', chapter: '終章 · 黎明之前', color: '#c2b3d9',
    description: '當最後一聲鐘響落下，請記得，你從來不是獨自一人。',
    objects: [
      { id: 'tower-back', label: '返回沉星水道', kind: 'back', x: 0, z: 10.5 },
      { id: 'tower-lamp', label: '星燈 · 最後的歇息', kind: 'lamp', x: 3, z: 7 },
      { id: 'dial-1', label: '西星盤 · 碑文「二」', kind: 'mechanism', x: -7, z: 3 },
      { id: 'dial-2', label: '東星盤 · 碑文「一」', kind: 'mechanism', x: 7, z: 0 },
      { id: 'dial-3', label: '北星盤 · 碑文「三」', kind: 'mechanism', x: -3, z: -5 },
      { id: 'tower-chest', label: '守燈人的遺贈', kind: 'chest', x: 9, z: -5 },
      { id: 'dawn', label: '眺望重生的山城', kind: 'exit', x: 0, z: -10.2 },
    ], encounters: [
      { id: 't1', x: -3, z: 5, enemies: ['raven', 'moth'] },
      { id: 't2', x: -5, z: -1, enemies: ['sentinel', 'root', 'wisp'] },
      { id: 't3', x: 5, z: -4, enemies: ['raven', 'sentinel', 'wisp'] },
      { id: 'eclipse', x: 0, z: -8.3, enemies: ['eclipse'], required: true },
    ],
  },
};
export interface Skill { id: string; name: string; description: string; owner: HeroId; level: number; cost: number; power: number; element?: Element; target: 'enemy' | 'all' | 'ally' | 'self'; effect?: 'heal' | 'armor' | 'cover'; }
export const SKILLS: Skill[] = [
  { id: 'ember', name: '燈火', description: '以燈火灼燒一名敵人。火焰屬性。', owner: 'lien', level: 1, cost: 3, power: 1.5, element: 'fire', target: 'enemy' },
  { id: 'heal', name: '微光療癒', description: '恢復一名同伴生命，無法復甦。', owner: 'lien', level: 1, cost: 4, power: 2.5, target: 'ally', effect: 'heal' },
  { id: 'starlight', name: '落星', description: '一道星光穿透敵人。星光屬性。', owner: 'lien', level: 2, cost: 4, power: 1.8, element: 'star', target: 'enemy' },
  { id: 'meteor', name: '群星之雨', description: '星光灑落，攻擊所有敵人。', owner: 'lien', level: 4, cost: 8, power: 1.4, element: 'star', target: 'all' },
  { id: 'cleave', name: '弧月斬', description: '以月弧劍氣斬擊敵人。斬擊屬性。', owner: 'loren', level: 1, cost: 3, power: 1.6, element: 'slash', target: 'enemy' },
  { id: 'shatter', name: '碎甲', description: '斬擊敵人，降低其防禦兩次行動。', owner: 'loren', level: 2, cost: 4, power: 1.1, element: 'slash', target: 'enemy', effect: 'armor' },
  { id: 'cover', name: '守望誓約', description: '防禦並替同伴承受下一次攻擊。', owner: 'loren', level: 3, cost: 3, power: 0, target: 'self', effect: 'cover' },
  { id: 'heavy', name: '破曉重擊', description: '凝聚劍光的強力斬擊。', owner: 'loren', level: 4, cost: 7, power: 2.8, element: 'slash', target: 'enemy' },
];
export interface EnemyTemplate { name: string; hp: number; atk: number; def: number; speed: number; weakness: Element; xp: number; gold: number; color: string; shape: 'slime' | 'moth' | 'root' | 'wisp' | 'knight' | 'raven'; }
export const ENEMIES: Record<string, EnemyTemplate> = {
  slime: { name: '露珠軟泥', hp: 42, atk: 9, def: 2, speed: 4, weakness: 'fire', xp: 7, gold: 8, color: '#7bc8af', shape: 'slime' },
  moth: { name: '月塵蛾', hp: 38, atk: 10, def: 2, speed: 10, weakness: 'slash', xp: 8, gold: 10, color: '#d5c1e0', shape: 'moth' },
  root: { name: '迷途樹靈', hp: 65, atk: 12, def: 5, speed: 3, weakness: 'fire', xp: 10, gold: 12, color: '#a2b575', shape: 'root' },
  wisp: { name: '沉星幽火', hp: 58, atk: 13, def: 3, speed: 9, weakness: 'star', xp: 10, gold: 12, color: '#8dd9ef', shape: 'wisp' },
  sentinel: { name: '鏽甲守衛', hp: 85, atk: 15, def: 8, speed: 4, weakness: 'star', xp: 13, gold: 15, color: '#9da9b6', shape: 'knight' },
  raven: { name: '蝕影渡鴉', hp: 65, atk: 14, def: 4, speed: 12, weakness: 'slash', xp: 12, gold: 13, color: '#ac98c5', shape: 'raven' },
  guardian: { name: '古橋守木', hp: 230, atk: 16, def: 6, speed: 5, weakness: 'fire', xp: 30, gold: 35, color: '#d4c18b', shape: 'root' },
  warden: { name: '遺忘的守潮者', hp: 320, atk: 20, def: 9, speed: 6, weakness: 'star', xp: 40, gold: 45, color: '#83c8d6', shape: 'knight' },
  eclipse: { name: '無光的守鐘人', hp: 300, atk: 21, def: 10, speed: 7, weakness: 'star', xp: 50, gold: 80, color: '#d5a1d4', shape: 'knight' },
};
export const ITEMS: Record<ItemId, { name: string; description: string; price: number }> = {
  potion: { name: '月露藥', description: '恢復 60 點生命', price: 12 },
  ether: { name: '星泉水', description: '恢復 15 點魔力', price: 18 },
  revive: { name: '甦醒之羽', description: '復甦並恢復一半生命', price: 25 },
};
export const ELEMENT_NAMES: Record<Element, string> = { fire: '火焰', star: '星光', slash: '斬擊' };
export const ZONE_ORDER: ZoneId[] = ['village', 'forest', 'waterway', 'tower'];
export const BRIDGE_CLUES: Record<HeroId, { action: string; summary: string; lines: string[][] }> = {
  lien: { action: '讀取燈中記憶', summary: '莉恩聽見守橋人的約定：舊鈴一響，等候的人就能回家。暖火曾讓緊閉的樹皮鬆開。', lines: [
    ['莉恩', '讓我用提燈照一照……火苗裡有個人。他把一串不響的鈴掛在橋上，說要等最後一個人回來。'],
    ['記憶中的守橋人', '別怕，讓我把燈留給你。你看，連橋邊緊閉的樹皮，也向這點暖火鬆開了。'],
    ['莉恩', '原來它還在等人。我們把這段記憶帶給婆婆吧。'],
  ] },
  loren: { action: '辨認守衛暗號', summary: '洛恩認出提燈上的「兩短一長」是歸隊信號。舊刻痕標出守木根鬚的接縫。', lines: [
    ['洛恩', '兩道短痕，一道長痕……這是守橋人的歸隊暗號。看，提燈底部還刻了古橋。'],
    ['洛恩', '圖上把根鬚的接縫刻得很深。若枝根封住橋面，往接縫下劍，或許就能打開缺口。'],
    ['莉恩', '你竟然還記得這些。把你的發現告訴婆婆吧，她也許知道那串鈴等的是誰。'],
  ] },
};
export const GUARDIAN_INTRO = [
  ['旁白', '三盞路燈映進河裡。古橋的鈴無風自響，原本垂向水面的根鬚，正一根根抬起。'],
  ['洛恩', '它在護橋。你看樹皮底下的光——它聚起根鬚時，接縫就會露出來。'],
  ['莉恩', '那就先試出哪種攻擊能鬆開護盾。等它蓄力，再把根鬚打散！'],
];
export const OPENING = [
  ['序章', '月蝕之夜將至。霧鐘村的星燈，已經七日沒有亮起。'],
  ['莉恩', '婆婆說，只要還有人記得彼此，燈火就不會真正熄滅。可是……這一次，為什麼連鐘聲都變輕了？'],
  ['洛恩', '我不記得自己的來處。但看見那座鐘塔時，我的心裡……像有一盞燈。'],
  ['莉恩', '那就一起去吧！先去問問廣場上的守燈婆婆，她一定知道些什麼。'],
];
export const LOREN_MEMORY = [
  ['洛恩', '這塊石頭上……刻著我的名字。守鐘人，洛恩。'],
  ['記憶中的聲音', '你總說要獨自守住長夜。可一個人的記憶，怎麼承載整座城的光呢？'],
  ['洛恩', '我把所有人的悲傷都藏進了鐘裡，卻忘記了那些歡笑。無光的守鐘人……是我留下的影子。'],
  ['莉恩', '那我們就把歡笑也帶回去。婆婆的茶、米菈的風鈴，還有你剛才，努力講的那個笑話。'],
  ['洛恩', '……謝謝你，莉恩。這一次，我不會再一個人守燈了。'],
];
export const ENDING = [
  ['無光的守鐘人', '若不再替他們收藏悲傷……誰來記得那些失去的人？'],
  ['洛恩', '我們會記得。不是把自己鎖在長夜裡，而是帶著他們，走向明天。'],
  ['莉恩', '看啊。那不是一個人的星火，是每一扇窗、每一個願意等待的人。'],
  ['旁白', '山城的燈，一盞接著一盞亮起。久違的鐘聲越過森林，掠過水面，喚醒了山巒之後的第一道晨光。'],
  ['洛恩', '天亮了。回家吧。'],
];

export const LORE: Record<string, { title: string; lines: string[][] }> = {
  'village-letter': { title: '一封沒有寄出的信', lines: [
    ['泛黃的信紙', '給離家的孩子：今年的月露花又開了。我把你的窗戶擦得很亮，這樣你從山路上回來，一眼就能看見。'],
    ['泛黃的信紙', '鄰居們說，星燈不亮了，你也許不認得路。我告訴他們：沒關係。我每天都會在門口，留一盞小燈。'],
    ['莉恩', '信尾沒有署名。村子裡每一位等著家人的人，都可能是寫信的人。'],
    ['洛恩', '以前的我，或許只記得他們的擔憂。原來等待，也是一種溫柔的勇氣。'],
  ] },
  'village-bell': { title: '霧鐘村的約定', lines: [
    ['石碑上的字', '迷霧升起之時，請敲響門前的鈴。如果隔壁的鈴沒有回應，就替他添一盞燈。'],
    ['莉恩', '小時候我以為這只是節日的遊戲。每一家都把風鈴掛得高高的，怕自己的聲音太小。'],
    ['洛恩', '後來呢？'],
    ['莉恩', '後來我才知道，那年冬天特別冷。這些風鈴，是為了確定每個人都平安。'],
  ] },
  'forest-song': { title: '森林裡的搖籃曲', lines: [
    ['樹皮上的刻痕', '第一盞燈，照亮離家的人。第二盞燈，照亮等候的人。第三盞燈，照亮你以為早已遺忘的自己。'],
    ['莉恩', '這是婆婆以前唱的歌！最後一句總是唱得很輕，我一直聽不清。'],
    ['洛恩', '也許她希望你長大之後，自己找到最後一句。'],
    ['莉恩', '那等我們回去，我要把整首歌唱給她聽。連最後一句也要。'],
  ] },
  'forest-keeper': { title: '守橋人的午餐', lines: [
    ['舊木牌', '今日過橋費：一個故事，或半塊麵包。沒有也沒關係，記得說聲早安。——守橋人'],
    ['莉恩', '這座橋從前真的有人守著？'],
    ['洛恩', '我記得一個老人，總把過橋費分給樹下的鳥。他說，故事餵給心，麵包餵給肚子。'],
    ['莉恩', '你想起來了！'],
    ['洛恩', '只是很小的一件事。不過……我很高興，它回來了。'],
  ] },
  'waterway-names': { title: '水面下的名字', lines: [
    ['古老的銘文', '此水道由霧鐘村三十二戶人家共築。工程最後一日，沒有一個人同意把自己的名字刻在最前面。'],
    ['古老的銘文', '於是我們刻下所有人的名字，圍成一個圈。水從這裡經過時，誰都不會被落下。'],
    ['洛恩', '我一直以為，守護是一個頭銜。碑文卻說，它是每一個人曾經伸出的手。'],
    ['莉恩', '就像修水道。有的人搬石頭，有的人做午餐，一樣重要。'],
  ] },
  'waterway-boat': { title: '一艘小紙船', lines: [
    ['被石頭壓住的紙船', '等爸爸回來，我要讓他看見自己做的船。船長叫米菈，副船長是媽媽。爸爸可以負責划槳。'],
    ['莉恩', '水把字都暈開了，只有最後一行還很清楚。'],
    ['紙船上的小字', '如果迷路了，就往有風鈴的地方走。'],
    ['洛恩', '這艘船還能航行。等水閘打開，就讓它帶著這份願望回家吧。'],
  ] },
  'tower-oath': { title: '守鐘人的誓言', lines: [
    ['洛恩留下的手記', '今天又有一戶人家的燈熄滅了。我收下他們的記憶，像從前一樣，答應替他們保管悲傷。'],
    ['洛恩留下的手記', '可是鐘聲越來越重。我已經記不起最初接下這份工作時，大家為什麼笑得那樣開心。'],
    ['洛恩', '我把每一次告別都刻進心裡，卻把每一次相逢，都當成理所當然。'],
    ['莉恩', '那就從今天開始記。森林的午餐、水道的紙船，還有現在，站在你身邊的我。'],
    ['洛恩', '這一次，我會好好記住。'],
  ] },
  'tower-dawn': { title: '第一任守燈人的話', lines: [
    ['星盤底座的碑文', '西方記住第二次相逢，東方守候第一聲問候，北方迎接第三道晨光。讓所有星盤，指向我們的約定。'],
    ['星盤底座的碑文', '後來的守燈人啊，如果有一天你累了，就把提燈交給身邊的人。這從來不是一份必須獨自完成的工作。'],
    ['莉恩', '原來第一位守燈人，也會覺得累。'],
    ['洛恩', '或許正因如此，他才為後來的人，留下了這句話。'],
  ] },
};
const lorePositions: Record<ZoneId, { id: string; x: number; z: number }[]> = {
  village: [{ id: 'village-letter', x: -10, z: 4 }, { id: 'village-bell', x: 4, z: -6 }],
  forest: [{ id: 'forest-song', x: -10, z: -2 }, { id: 'forest-keeper', x: 10, z: 6 }],
  waterway: [{ id: 'waterway-names', x: -9, z: 6 }, { id: 'waterway-boat', x: 9, z: -1 }],
  tower: [{ id: 'tower-oath', x: -8, z: -5 }, { id: 'tower-dawn', x: 8, z: 5 }],
};
for (const id of ZONE_ORDER) ZONES[id].objects.push(...lorePositions[id].map(o => ({ ...o, label: LORE[o.id].title, kind: 'lore' as const })));
