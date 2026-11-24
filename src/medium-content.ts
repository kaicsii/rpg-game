import type { EnemyTemplate, Interactable, Zone, ZoneId } from './data';
import text from './medium-text.json';

export const MEDIUM_TEXT: Record<string, { title: string; lines: string[][] }> = text;
export const MEDIUM_ROUTE: ZoneId[] = ['village', 'forest', 'waterway', 'station', 'highland', 'archive', 'corridor', 'tower'];

const section = (id: string, label: string, x: number, z: number, kind: Interactable['kind'] = 'story'): Interactable => ({ id, label, kind, x, z });

export const EXTRA_ZONES = {
  station: {
    id: 'station', name: '灰港驛站', chapter: '第三章 · 沒有出發的車票', subtitle: 'GREYHARBOR STATION', color: '#c8ac88',
    description: '月台上的燈還亮著，卻沒有一班車能出發。',
    objects: [section('station-back', '返回沉星水道', 0, 10.5, 'back'), section('station-exit', '前往風鳴高地', 0, -10.2, 'exit'), section('station-lamp', '星燈 · 候車長椅', 3, 7, 'lamp')],
    encounters: [{ id: 'station-watch', x: 0, z: -7.5, enemies: ['railkeeper'], required: true }, { id: 'station-track', x: 8, z: -2, enemies: ['sentinel', 'wisp'] }],
  },
  highland: {
    id: 'highland', name: '風鳴高地', chapter: '第四章 · 風把回答帶回來', subtitle: 'THE SINGING HEIGHTS', color: '#a9c3cc',
    description: '風掠過拆下的聲簧，仍把遠處的回答帶了回來。',
    objects: [section('highland-back', '返回灰港驛站', 0, 10.5, 'back'), section('highland-exit', '前往白頁檔案館', 0, -10.2, 'exit'), section('highland-lamp', '星燈 · 避風處', 3, 7, 'lamp')],
    encounters: [{ id: 'highland-rook', x: 0, z: -7.5, enemies: ['echo-rook'], required: true }, { id: 'highland-wind', x: 9, z: -3, enemies: ['raven', 'moth'] }],
  },
  archive: {
    id: 'archive', name: '白頁檔案館', chapter: '第五章 · 白頁之下', subtitle: 'THE WHITELEAF ARCHIVE', color: '#d4baaf',
    description: '寄存櫃安靜地關著，公開的紀錄就放在桌上。',
    objects: [section('archive-back', '返回風鳴高地', 0, 10.5, 'back'), section('archive-exit', '外環接駁 · 返回霧鐘村', 0, -10.2, 'exit'), section('archive-lamp', '星燈 · 公共休息桌', 3, 7, 'lamp')],
    encounters: [{ id: 'archive-keeper', x: 0, z: -7.5, enemies: ['pagekeeper'], required: true }],
  },
  corridor: {
    id: 'corridor', name: '眠鐘迴廊', chapter: '第七章 · 眠鐘迴廊', subtitle: 'THE HALL OF SLEEPING BELLS', color: '#b0a5cc',
    description: '鐘聲把往日折成迴廊，仍留著一條回到現實的路。',
    objects: [section('corridor-back', '現實的光 · 返回霧鐘村', 0, 10.5, 'back'), section('corridor-exit', '前往月蝕鐘塔上層', 0, -10.2, 'exit'), section('corridor-lamp', '星燈 · 現實的微光', 3, 7, 'lamp')],
    encounters: [{ id: 'corridor-oath', x: 0, z: -7.5, enemies: ['oath-echo'], required: true }, { id: 'corridor-residue', x: 8, z: -2, enemies: ['wisp', 'raven'] }],
  },
} satisfies Record<string, Zone>;

export const MEDIUM_FOES: Record<string, EnemyTemplate> = {
  railkeeper: { name: '末班巡軌者', hp: 320, atk: 24, def: 10, speed: 6, weakness: 'fire', xp: 55, gold: 45, color: '#b8a36c', shape: 'knight' },
  'echo-rook': { name: '離巢鳴鷲', hp: 340, atk: 28, def: 9, speed: 9, weakness: 'slash', xp: 65, gold: 55, color: '#c0afb9', shape: 'raven' },
  pagekeeper: { name: '白頁典守', hp: 410, atk: 32, def: 14, speed: 7, weakness: 'star', xp: 75, gold: 65, color: '#c6d5c8', shape: 'knight' },
  'oath-echo': { name: '誓約殘像', hp: 460, atk: 37, def: 14, speed: 8, weakness: 'slash', xp: 90, gold: 70, color: '#aca3d9', shape: 'knight' },
};

export type StoryStep = { scene: string; target: string; prompt: string; part?: number; lines?: [number, number]; battle?: boolean };
type Step = StoryStep;
const step = (scene: string, target: string, prompt: string, options?: Partial<Pick<Step, 'part' | 'lines' | 'battle'>>): Step => ({ scene, target, prompt, ...options });
const chapter = (zone: ZoneId, title: string, exit: string | null, result: string, ...groups: (Step | Step[])[]) =>
  ({ zone, title, exit, result, groups: groups.map(group => Array.isArray(group) ? group : [group]) });

export const MEDIUM_CHAPTERS = [
  chapter('village', '序章 · 長夜的微光', 'forest-exit', '莉恩接下婆婆的委託，與洛恩約定一同出發。',
    step('P00', 'opening', '與洛恩相遇'), step('P01', 'elder', '向守燈婆婆接下委託'),
    [step('P02', 'merchant', '到商攤向行腳商人打招呼'), step('P03', 'child', '到窗邊和米菈交談')],
    step('P04', 'forest-exit', '在北方小徑詢問洛恩是否同行'), step('P05', 'forest-exit', '解開北門鐘譜，從小徑出發')),
  chapter('forest', '第一章 · 森林會記得', 'waterway-exit', '三盞路燈重亮，古橋守木交出了第一縷星火。',
    step('C1-01', 'f1', '擊退入口的露珠軟泥，試用弱點攻擊', { battle: true }),
    [step('C1-02','beacon-1','點亮西燈：照亮離家的人',{ part: 1, lines: [0,2] }), step('C1-02','beacon-2','點亮東燈：照亮等候的人',{ part: 2, lines: [2,4] }), step('C1-02','beacon-3','點亮古橋燈：照亮遺忘的自己',{ part: 3, lines: [4,6] })],
    step('C1-03', 'bridge-sign', '查古橋前的半塊麵包'), step('C1-04', 'forest-lamp', '在林間星燈一起吃飯與休息'),
    step('C1-05', 'forest-elite', '平復古橋守木，取回第一縷星火', { battle: true }), step('C1-06', 'waterway-exit', '到古橋出口聽洛恩的笑話')),
  chapter('waterway', '第二章 · 水底的名字', 'tower-exit', '水流恢復，洛恩找回自己的名字。鐘塔舊梯失聯，兩人改走外環。',
    step('C2-01', 'canal-intake', '查看入口積水與水閘'),
    [step('C2-02','valve-1','打開西水閘',{ part: 1, lines: [0,3] }), step('C2-02','valve-2','打開東水閘',{ part: 2, lines: [3,5] }), step('C2-03','loren-memory','讀取西北刻名石')],
    step('C2-04', 'water-elite', '平復仍在守路的盔甲', { battle: true }),
    step('C2-05', 'tower-exit', '到北方舊梯確認鐘塔為何失聯'), step('C2-06', 'tower-exit', '在外環岔路和洛恩談他的名字')),
  chapter('station', '第三章 · 沒有出發的車票', 'station-exit', '桑榆在灰港接手人工值守，請兩人前往高地尋找亞岑。',
    step('C3-01', 'station-mother', '到候車區安置旅客'), step('C3-02', 'station-returns', '查公開退件紀錄'),
    step('C3-03', 'station-chief', '和桑榆調整岔道，讓空車試行'), step('C3-04', 'station-watch', '停止舊調度庭的末班巡軌者', { battle: true }),
    step('C3-05', 'station-desk', '建立灰港人工接收桌'), step('C3-06', 'station-exit', '向桑榆領取沒有日期的票')),
  chapter('highland', '第四章 · 風把回答帶回來', 'highland-exit', '伊朵停止回流測試並安置亞岑。兩人前往白頁檔案館調查。',
    step('C4-01', 'highland-workshop', '到修聲棚找伊朵'), step('C4-02', 'highland-injured', '到廢棄聲台安置亞岑'),
    step('C4-03', 'highland-rook', '平復鳴鷲，讓撤離路線安全', { battle: true }),
    step('C4-04', 'highland-workshop', '與伊朵確認低量測試與停送條件'),
    step('C4-05', 'highland-signal', '校準聲簧，送出確認訊號'), step('C4-06', 'highland-signal', '停止傳送，確認灰港與亞岑已安置')),
  chapter('archive', '第五章 · 白頁之下', 'archive-exit', '芙蕾保留私人寄存，建立由本人選擇是否接收的程序。',
    step('C5-01', 'archive-host', '與芙蕾確認回流與隔離'),
    [step('C5-02','archive-reader-1','聽一位需要暫放的居民',{ part: 1, lines: [0,1] }), step('C5-02','archive-reader-2','聽一位想取回的居民',{ part: 2, lines: [1,2] }), step('C5-02','archive-reader-3','聽一位選擇暫緩的居民',{ part: 3, lines: [2,3] })],
    step('C5-03', 'archive-records', '對照公開規程與隔離紀錄'), step('C5-04', 'archive-keeper', '停止封存控制室的白頁典守', { battle: true }),
    step('C5-05', 'archive-desk', '訂定本人可選、可停的回應方式'), step('C5-06', 'archive-exit', '接收霧鐘村的訊息，準備回村')),
  chapter('village', '第六章 · 把燈放到桌上', 'village-corridor', '霧鐘村接手輪班，各站同意在可中止的條件下回應。',
    step('C6-01', 'elder', '向婆婆說明回流，承認需要幫助'),
    [step('C6-02','merchant','安排願意探訪的添燈人',{ part: 1, lines: [0,2] }), step('C6-02','elder','請鄰居接下婆婆的班',{ part: 2, lines: [2,5] }), step('C6-02','village-neighbor','記下居民選擇暫緩的回覆',{ part: 3, lines: [5,8] })],
    step('C6-03', 'village-public', '到廣場作公開說明'), step('C6-04', 'village-public', '安排村中輪值，與各站接通'),
    step('C6-05', 'village-neighbor', '讓洛恩向居民說明返鄉意願'), step('C6-06', 'village-corridor', '確認輪班後，從外環進入鐘塔舊梯')),
  chapter('corridor', '第七章 · 眠鐘迴廊', 'corridor-exit', '莉恩與洛恩告別幻象，洛恩承認了當年封鐘的責任。',
    step('C7-01', 'corridor-door', '沿接收點的微光進入迴廊'), step('C7-02', 'corridor-meal', '面對古橋午餐的回音'),
    step('C7-03', 'corridor-lantern', '放下幻境中永不熄滅的提燈'), step('C7-04', 'corridor-record', '到工作桌辨認兩段真實的回音'),
    step('C7-05', 'corridor-oath', '平復誓約殘像再離開', { battle: true }), step('C7-06', 'corridor-exit', '在回到現實前聽同伴說話')),
  chapter('tower', '第八章 · 黎明之前', null, '兩人平復守鐘人的影子，讓星燈恢復各地的回應。',
    [step('C8-01','dial-1','點驗西星盤',{ part: 1 }), step('C8-01','dial-2','點驗東星盤',{ part: 2 }), step('C8-01','dial-3','點驗北星盤',{ part: 3 })],
    step('C8-02', 'tower-lamp', '在最後一盞星燈旁歇息'),
    step('C8-03', 'eclipse', '面對無光的守鐘人及最後長夜', { battle: true }), step('C8-04', 'eclipse', '打破最後長夜', { battle: true }),
    step('C8-05', 'tower-walk', '和洛恩走向星台'), step('C8-06', 'dawn', '在北方星台親手重燃星燈')),
];

export const MEDIUM_POINTS: Partial<Record<ZoneId, Interactable[]>> = {
  village: [section('village-neighbor', '村中鄰居', 5, 6, 'npc'), section('village-public', '公共接收桌', 5, 1), section('village-corridor', '鐘塔外環 · 眠鐘迴廊', 6, -8, 'exit'), section('village-shuttle', '外環接駁 · 白頁檔案館', -8, 5, 'back')],
  forest: [section('bridge-sign', '古橋前的木牌', -2, -6)],
  waterway: [section('canal-intake', '水道入口積水', 0, 6)],
  station: [section('station-mother', '候車母親', -4, 5, 'npc'), section('station-returns', '公開退件紀錄', 4, 4), section('station-chief', '驛務長桑榆', -4, 0, 'npc'), section('station-desk', '人工接收桌', 4, -4)],
  highland: [section('highland-workshop', '修聲匠伊朵', -4, 5, 'npc'), section('highland-injured', '受傷的亞岑', -5, -3, 'npc'), section('highland-signal', '回音台', 5, -5)],
  archive: [section('archive-host','保管員芙蕾',-4,5,'npc'), section('archive-reader-1','想暫放的居民',4,4,'npc'), section('archive-reader-2','想取回的居民',-4,1,'npc'), section('archive-reader-3','想等一等的居民',5,-1,'npc'), section('archive-records','公共程序檔案桌',-4,-4), section('archive-desk','可中止的接收桌',4,-5)],
  corridor: [section('corridor-door','鐘塔舊梯',-1,7), section('corridor-meal','古橋午餐的幻象',-5,3), section('corridor-lantern','眾人口中的答謝',5,1), section('corridor-record','封鐘當晚的工作桌',-4,-4)],
  tower: [section('tower-walk','星台前的最後一步',-2,-8)],
};

export const MEDIUM_NOTES = [
  ['L09','village',-4,3], ['L10','forest',-10,7], ['L11','waterway',-7,5],
  ['L12','station',-7,5], ['L13','station',7,3], ['L14','station',-8,-5],
  ['L15','highland',-7,5], ['L16','highland',7,3,true], ['L17','highland',-8,-6],
  ['L18','archive',-8,5], ['L19','archive',7,-3], ['L20','archive',8,5], ['L21','village',5,4],
  ['L22','corridor',-8,3], ['L23','corridor',7,-4,true], ['L24','tower',6,6],
] as const;

export const MEDIUM_TALKS = [
  ['H01','forest',4,8,'C1-04'], ['H02','waterway',-2,7,'C2-03'], ['H03','station',3,8.8,'C3-06'],
  ['H04','highland',3,8.8,'C4-06'], ['H05','archive',3,8.8,'C5-05'], ['H06','village',3,5,'C6-04'],
  ['H07','corridor',3,8.8,'C7-06'], ['H08','village',2.5,3,'C8-06'],
] as const;

export const EPILOGUE_ZONES: ZoneId[] = ['village','village','station','highland','archive','village'];

type QuestStop = { zone: ZoneId; point: Interactable; prompt: string; lines: string[][] };
const stop = (zone: ZoneId, id: string, label: string, x: number, z: number, prompt: string, ...lines: string[][]): QuestStop =>
  ({ zone, point: section(id, label, x, z), prompt, lines });
export const MEDIUM_QUESTS = [
  { id: 'SQ03', needs: ['C3-02'], stops: [
    stop('station','sq03-a','退件室的密封信',5,2,'在灰港退件室領取密封信', ['站務員','封口不用拆。我只需要知道伊朵收到，不需要知道他們寫了什麼。']),
    stop('highland','sq03-b','伊朵的收件處',-5,6,'將信交到高地修聲棚', ['伊朵','是以前的學徒。我以為他不想再碰這份工作了。給我一張紙就好。'], ['旁白','伊朵封好回信，將它交給你們。']),
    stop('station','sq03-c','站務交班簿',5,-2,'回灰港交付密封回信', ['站務員','回信我照原封送出。公開簿只記「已送達」。']),
  ] },
  { id: 'SQ04', needs: ['C3-05'], stops: [
    stop('station','sq04-a','月台失物桌',-5,3,'查灰港的失物登記', ['站務員','舊回程票的主人願意在月台等消息。票面只有他同意公開的名字。']),
    stop('station','sq04-b','舊票的主人',-6,-2,'詢問原持票人', ['旅客','不用留給我了。請寫「已結案」。我現在想買一張給自己的票。']),
    stop('station','sq04-c','結案登記',6,-4,'向失物桌轉達持票人的決定', ['站務員','我會照他的意思登記。這份補給給你們下次上路用。']),
  ] },
  { id: 'SQ05', needs: ['C4-03'], stops: [
    stop('highland','sq05-a','人路的回音',4,2,'觀察人路的風向', ['旁白','旗尖朝下。人路的風貼著地面折回。']),
    stop('highland','sq05-b','風口與舊巢痕',7,-1,'觀察有羽痕的高處', ['旁白','高處的旗尖朝上，石上留下舊羽痕。巢聲應往這一側引。']),
    stop('highland','sq05-c','引聲片的安全掛點',9,0,'在遠離人路的高處掛上引聲片', ['伊朵','掛在上揚的旗側。你看，牠沿高處回巢，人路安靜了。']),
  ] },
  { id: 'SQ06', needs: ['C4-03'], stops: [
    stop('highland','sq06-a','空著的工具架',-8,1,'問見習者需要什麼工具', ['見習者','能不能把每天用的工具放在看得見的地方？我只想知道借了要往哪裡還。']),
    stop('highland','sq06-b','工具借還簿',-8,4,'依伊朵同意的用途標記工具', ['伊朵','量尺與擦布可以自取，調簧鉗等有人陪同。留一格給下一班。'], ['洛恩','已寫在借還簿上。這份保養油正好可以護住我的劍鋒。']),
  ] },
  { id: 'SQ07', needs: ['C5-03'], stops: [
    stop('archive','sq07-a','願意核對的寄存者',7,2,'取得本人授權', ['寄存者','我只想查我提出過幾次，不想給你們看那段記憶。']),
    stop('archive','sq07-b','授權程序副本',-6,-2,'核對日期與回覆後交還副本', ['芙蕾','這裡有三次年表。這份是妳的副本，改約也不用交還。'], ['寄存者','這次我想先約個人陪我談。']),
  ] },
  { id: 'SQ08', needs: ['C5-05'], stops: [
    stop('archive','sq08-a','休息廳的小鈴',8,1,'陪寄存者演練暫停', ['莉恩','可以直接說停、按鈴，或留一張「下次再談」。']),
    stop('archive','sq08-b','留給下次的紙',8,-2,'尊重寄存者選擇的暫停方式', ['寄存者','今天先不要。妳能在這裡陪我坐一下嗎？'], ['莉恩','好，我們就坐一會。']),
  ] },
  { id: 'SQ09', needs: ['C6-02'], stops: [
    stop('village','sq09-a','輪值的鄰居',6,6,'確認願意幫忙的鄰居', ['鄰居','我添廣場的油。隔壁接熬藥，商人會送物資。']),
    stop('village','sq09-b','婆婆的茶桌',-3,4,'讓婆婆選擇保留與交接的工作', ['守燈婆婆','早上的燈我還想去看看。下午就拜託他們吧。今天這壺茶終於沒有喝冷。']),
  ] },
  { id: 'SQ10', needs: ['C3-01'], stops: [
    stop('forest','sq10-a','樹下的舊凳',-6,6,'在森林整理第二張凳子', ['莉恩','一張給等的人，一張給願意坐下的人。']),
    stop('station','sq10-b','公開旅人休息點',-6,2,'向桑榆登記林間休息點', ['桑榆','這段路可以停留。把今天有一班短程車重新出發的消息寫上去吧。']),
    stop('forest','sq10-c','新木牌',-6,6,'回森林寫下願意分享的故事', ['洛恩','「今天有人出發，也有人留下等下一班。」路過的人可以在這裡坐一會。']),
  ] },
  { id: 'SQ11', needs: ['C2-02','waterway-boat'], stops: [
    stop('village','sq11-a','米菈的紙船',-5,7,'問米菈想怎麼處理舊紙船', ['米菈','這艘留下。我再折一艘，讓爸爸知道船長現在做得更好了。']),
    stop('waterway','sq11-b','紙船放流處',8,1,'到恢復通水的河段放流新船', ['旁白','舊船留在窗臺。新船沿安全的水流往前，沒有誰需要在岸邊等答案。']),
  ] },
  { id: 'SQ12', needs: ['C8-02'], stops: [
    stop('tower','sq12-a','未署名的舊巡燈表',4,6,'在鐘塔休息層取得舊表', ['莉恩','每格都還有空白，讓願意的人自己填。']),
    stop('village','sq12-b','公開巡燈表',4,2,'回村確認自願輪班', ['行腳商人','我只經過西路，填西路就好。'], ['洛恩','我也只填能負擔的一段，留一天休息。']),
  ] },
] satisfies { id: string; needs: string[]; stops: QuestStop[] }[];
