import type { GameState, Interactable, ZoneId } from './data';

type PuzzleSlot = { label: string; options: readonly string[] };
export type PuzzleBoard = {
  id: string;
  scene: string;
  title: string;
  instructions: string;
  clues: string[];
  hint: string;
  slots: PuzzleSlot[];
  answer: number[];
  checkLabel: string;
  failure: (values: number[]) => string;
  success: string;
};

const bells = ['石橋', '屋簷', '提燈'];
const responses = ['暫緩回覆', '請人陪同取回', '繼續保管'];
const villagers = ['旅人', '鄰居', '商人'];

export const PUZZLE_BOARDS: PuzzleBoard[] = [
  {
    id: 'bells', scene: 'P05', title: '北門鐘譜',
    instructions: '依北門的刻句排好三枚鈴牌，再試敲鐘。',
    clues: ['出發以前，先記得回家的屋簷。', '踏上橋前要有光。每個記號只敲一次。'],
    hint: '屋簷是起點，石橋是最後一道地標。',
    slots: ['第一響', '第二響', '第三響'].map(label => ({ label, options: bells })),
    answer: [2, 3, 1], checkLabel: '試敲鐘',
    failure: values => new Set(values).size < 3 ? '其中一枚鈴牌重複了。' : '鐘聲沒有傳過北門。再讀一次出發的刻句。',
    success: '三聲鐘響接成一段，北門回應了。',
  },
  {
    id: 'tracks', scene: 'C3-03', title: '灰港調度盤',
    instructions: '從停車線一路接往安全月台。試車會回報在哪一岔停下。',
    clues: ['入口圖上，外岔通往低橋，內岔通往石堤。低橋的水已漫過軌面。', '石堤的直軌接貨庫，折軌接外環。貨庫目前封閉維修。', '外環兩座月台以燈號區分。值守員提著兩盞燈，單燈處留給回場空車。'],
    hint: '先找乾燥的入口，再從石堤繞開貨庫。靠站前核對值守員的燈號。',
    slots: [
      { label: '入口岔道', options: ['外岔', '內岔'] },
      { label: '石堤岔道', options: ['折軌', '直軌'] },
      { label: '進站岔道', options: ['單燈月台', '雙燈月台'] },
    ],
    answer: [2, 1, 2], checkLabel: '讓空車試行',
    failure: ([departure, route]) => departure === 1 ? '空車到了低橋前。水已淹過軌面，無法通行。'
      : route === 2 ? '空車通過石堤，在維修中的貨庫前停下。' : '空車到了單燈月台，但這裡沒有人接車。',
    success: '空車安全靠站，桑榆可以公布通行路況。',
  },
  {
    id: 'pitch', scene: 'C4-05', title: '回音台校頻',
    instructions: '調整三根聲簧，在低量模式下試送。刻度的字與長度可直接讀取。',
    clues: ['灰港回訊的第二拍最高。', '第一拍與第三拍相等。', '三拍合計五格。'],
    hint: '先用相同的低檔測兩側，再算中間還需要幾格。',
    slots: ['第一拍', '第二拍', '第三拍'].map(label => ({ label, options: ['一格 ▂', '兩格 ▄', '三格 ▆'] })),
    answer: [1, 3, 1], checkLabel: '比對回訊',
    failure: ([a, b, c]) => a + b + c !== 5 ? `三拍共 ${a+b+c} 格，和灰港的五格回訊不同。`
      : '合計正確。試著對照第一拍、第三拍和最高的一拍。',
    success: '三段回音對齊。伊朵準備低量送出確認訊號。',
  },
  {
    id: 'consent', scene: 'C5-03', title: '白頁館公開比對桌',
    instructions: '對照三位寄存者的說法，替每份公開申請掛上合適的處理牌。',
    clues: ['甲說，現在放在這裡讓她有餘力照顧孩子。', '乙想取回，卻一再被推遲。', '丙還沒準備好，請先保留她的決定。'],
    hint: '「今天先不決定」要用暫緩牌。「我想繼續放著」用保管牌。',
    slots: ['寄存者甲', '寄存者乙', '寄存者丙'].map(label => ({ label, options: responses })),
    answer: [3, 2, 1], checkLabel: '核對申請',
    failure: values => new Set(values).size < 3 ? '三位寄存者提出了不同要求。請再對照紀錄。'
      : '至少有一份申請和本人的選擇不符。請重讀他的說法。',
    success: '三份申請吻合。公開規程與現行隔離辦法的差別可以查證了。',
  },
  {
    id: 'roster', scene: 'C6-04', title: '霧鐘村輪值桌',
    instructions: '替三個時段安排值守，每人只接一班。',
    clues: ['商人只有清晨在村口，送貨後要到晚上才回來。', '能到接收桌換手的人，必須排在旅人的前一班。', '旅人下午以前都在外頭巡燈。'],
    hint: '旅人接下午班。看誰清晨能留在村口，再安排前一班的交接。',
    slots: ['清晨 · 村口', '正午 · 接收桌', '下午 · 星燈'].map(label => ({ label, options: villagers })),
    answer: [3, 2, 1], checkLabel: '公布輪值',
    failure: values => new Set(values).size < 3 ? '有人被排了兩班。請讓三人各接一班。'
      : '有人在自己的班次還沒回到村裡，或兩班接不上。',
    success: '三班接得上。每位值守者都有時間休息。',
  },
  {
    id: 'echoes', scene: 'C7-04', title: '校對封鐘回音',
    instructions: '午餐與提燈各留下一段回音。把能和兩人的記憶對上的話留在工作桌上。',
    clues: ['洛恩在古橋見到擺滿的餐具，但記得席位並非每次都坐滿。', '莉恩在幻境裡聽見眾人反覆道謝。她記得在村裡有人接過她的班。'],
    hint: '找出兩人記得的普通細節：午餐有人缺席，拿燈的人可以輪休。',
    slots: [
      { label: '古橋午餐', options: ['每個人都回來了', '桌上曾有空位', '村民從不一起吃飯'] },
      { label: '村中提燈', options: ['只能一直拿著', '不需要任何人照看', '可以有人接手'] },
    ],
    answer: [2, 3], checkLabel: '確認兩段記憶',
    failure: ([meal]) => meal === 2 ? '午餐的回音吻合。再想想莉恩放下提燈時說了什麼。'
      : '這段午餐回音抹掉了洛恩記得的細節。',
    success: '空椅與交班的片刻留了下來。原來的工作桌浮出回音。',
  },
];

export const boardSaved = (state: GameState, board: PuzzleBoard) => state.flags.includes(`puzzle-${board.id}`);
const slotKey = (board: PuzzleBoard, index: number) => `puzzle-${board.id}-${index}`;
export const boardValues = (state: GameState, board: PuzzleBoard) =>
  board.slots.map((_, index) => state.mechanisms[slotKey(board, index)] ?? 0);

export function choosePuzzleValue(state: GameState, board: PuzzleBoard, index: number, value: number) {
  const slot = board.slots[index];
  if (!slot || !Number.isInteger(value) || value < 1 || value > slot.options.length || boardSaved(state, board)) return;
  state.mechanisms[slotKey(board, index)] = value;
}

export function checkPuzzleBoard(state: GameState, board: PuzzleBoard) {
  const values = boardValues(state, board);
  if (values.some(value => value === 0)) return '還有空著的欄位。請先填好再試。';
  if (!board.answer.every((value, index) => value === values[index])) return board.failure(values);
  if (!boardSaved(state, board)) state.flags.push(`puzzle-${board.id}`);
}

export const BEACONS = ['beacon-1', 'beacon-2', 'beacon-3'];
export const VALVES = ['valve-1', 'valve-2'];
export const DIALS = ['dial-1', 'dial-2', 'dial-3'];
export const DIAL_ALIGNMENT = [2, 1, 3];
const BALANCED_FLOW = [1, 2];
export const nextForestBeacon = (state: GameState) => BEACONS.find(id => state.mechanisms[id] !== 1);
export const waterDrained = (state: GameState) => VALVES.every(id => state.mechanisms[id] === 1);
export const skyAligned = (state: GameState) => DIALS.every((id, index) => state.mechanisms[id] === DIAL_ALIGNMENT[index]);
export const valveLevel = (state: GameState, id: string) =>
  state.mechanisms[`flow-${id}`] ?? (state.mechanisms[id] === 1 ? BALANCED_FLOW[VALVES.indexOf(id)] : 0);

export function turnValve(state: GameState, id: string) {
  if (!VALVES.includes(id) || waterDrained(state)) return;
  state.mechanisms[`flow-${id}`] = (valveLevel(state, id) + 1) % 4;
  if (!VALVES.every((id, index) => valveLevel(state, id) === BALANCED_FLOW[index])) return;
  for (const valve of VALVES) state.mechanisms[valve] = 1;
}

export const FIELD_CLUES: Partial<Record<ZoneId, {
  point: Interactable; clues: string[]; hint: string;
}>> = {
  forest: {
    point: { id: 'forest-roots', kind: 'story', label: '根紋碑 · 林燈順序', x: -1.5, z: 8 },
    clues: ['照出發的人，照等候的人，再照忘了自己名字的人。', '西燈刻著門，東燈刻著長凳，橋邊的燈沒有署名。'],
    hint: '門提醒出發，長凳留給等待，無名的那盞最後點。',
  },
  waterway: {
    point: { id: 'water-gauge', kind: 'story', label: '分流尺 · 水閘規程', x: 1.4, z: 7.9 },
    clues: ['兩閘共有三格的排水額度。', '東渠較寬，要比西渠多開一格。兩側都需通水。'],
    hint: '把三格拆成兩個正數，再把較大的數給東渠。',
  },
  tower: {
    point: { id: 'tower-stele', kind: 'story', label: '觀星碑 · 星盤刻度', x: -0.8, z: 5.5 },
    clues: ['三面星盤合計六格，且每面都必須用不同的非零刻度。', '北面的刻度高過西面，東面留給最小的刻度。'],
    hint: '只有一、二、三格可用。先分配最小和最大的刻度。',
  },
};

export function fieldObjective(state: GameState) {
  const clue = FIELD_CLUES[state.zone];
  if (!clue) return;
  if (state.zone === 'forest' && nextForestBeacon(state)) {
    const unlit = BEACONS.filter(id => state.mechanisms[id] !== 1);
    return { text: `讀根紋碑，依順序唱亮林燈（${3 - unlit.length} / 3）`, targetIds: [clue.point.id, ...unlit] };
  }
  if (state.zone === 'waterway' && !waterDrained(state)) return {
    text: `依分流尺調整水閘（西 ${valveLevel(state, VALVES[0])} · 東 ${valveLevel(state, VALVES[1])}）`,
    targetIds: [clue.point.id, ...VALVES],
  };
  if (state.zone === 'tower' && !skyAligned(state)) return {
    text: '讀觀星碑，讓三面星盤的光束在中央交會。', targetIds: [clue.point.id, ...DIALS],
  };
}
