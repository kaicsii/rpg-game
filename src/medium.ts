import { ALL_ZONES, type GameState, type Interactable, type ZoneId } from './data';
import { MEDIUM_CHAPTERS, MEDIUM_NOTES, MEDIUM_POINTS, MEDIUM_QUESTS, MEDIUM_ROUTE, MEDIUM_TALKS, MEDIUM_TEXT, type StoryStep } from './medium-content';

export const isMedium = (state: GameState) => state.flags.includes('medium-campaign');
export const mediumFlag = (step: StoryStep) => step.part ? `${step.scene}:${step.part}` : step.scene;
const done = (state: GameState, flag: string) => state.flags.includes(flag);
export const mediumChapter = (state: GameState) => MEDIUM_CHAPTERS.find(chapter => chapter.groups.some(group => group.some(step => !done(state, mediumFlag(step)))));

export function mediumSteps(state: GameState) {
  const chapter = mediumChapter(state);
  if (!chapter || chapter.zone !== state.zone) return [];
  return chapter.groups.find(group => group.some(step => !done(state, mediumFlag(step))))
    ?.filter(step => !done(state, mediumFlag(step))) ?? [];
}

export function finishMediumStep(state: GameState, step: StoryStep) {
  const flag = mediumFlag(step);
  if (done(state, flag)) return;
  state.flags.push(flag);
  if (!step.part) return;
  const chapter = MEDIUM_CHAPTERS.find(chapter => chapter.groups.some(group => group.includes(step)));
  const parts = chapter?.groups.flat().filter(item => item.scene === step.scene);
  if (parts?.every(part => done(state, mediumFlag(part)))) state.flags.push(step.scene);
}

export const mediumProgress = (state: GameState) =>
  new Set(MEDIUM_CHAPTERS.flatMap(chapter => chapter.groups.flat()).filter(step => done(state, step.scene)).map(step => step.scene)).size;
export const nextQuestStop = (state: GameState, quest: typeof MEDIUM_QUESTS[number]) =>
  quest.needs.every(flag => done(state, flag)) ? quest.stops.find(stop => !done(state, stop.point.id)) : undefined;

export function finishQuestStop(state: GameState, quest: typeof MEDIUM_QUESTS[number], id: string): boolean {
  if (nextQuestStop(state, quest)?.point.id !== id) return false;
  state.flags.push(id);
  if (quest.stops.at(-1)?.point.id !== id) return false;
  state.flags.push(quest.id);
  state.inventory.potion += 2;
  state.inventory.ether += 1;
  if (quest.id === 'SQ06') state.flags.push('workshop-upgrade');
  return true;
}

export const availableTalks = (state: GameState) => MEDIUM_TALKS.filter(([, zone, , , need]) => state.zone === zone && done(state, need));

export function mediumObjects(state: GameState): Interactable[] {
  const zone = state.zone;
  const objects = ALL_ZONES[zone].objects.map(object => object.id === 'tower-exit'
    ? { ...object, label: '鐘塔舊梯 · 通往灰港' }
    : object.id === 'tower-back' ? { ...object, label: '返回眠鐘迴廊' } : object);
  for (const point of MEDIUM_POINTS[zone] ?? []) {
    if (point.id === 'village-shuttle' && !done(state, 'C5-06')) continue;
    if (['village-neighbor','village-public','village-corridor'].includes(point.id) && !done(state, 'C5-06')) continue;
    objects.push(point);
  }
  for (const [id, region, x, z] of MEDIUM_NOTES) {
    if (region !== zone || id === 'L21' && !done(state, 'C6-02') || id === 'L17' && !done(state, 'C4-03')) continue;
    objects.push({ id, x, z, label: MEDIUM_TEXT[id].title, kind: 'lore' });
  }
  for (const quest of MEDIUM_QUESTS) {
    const stop = nextQuestStop(state, quest);
    if (stop?.zone === zone) objects.push(stop.point);
  }
  for (const [id, , x, z] of availableTalks(state)) {
    if (!done(state, id)) objects.push({ id, x, z, label: `談心 · ${MEDIUM_TEXT[id].title}`, kind: 'story' });
  }
  return objects;
}

const nextDestination: Record<string, ZoneId> = {
  'forest-exit': 'forest', 'waterway-exit': 'waterway', 'tower-exit': 'station', 'station-exit': 'highland',
  'highland-exit': 'archive', 'archive-exit': 'village', 'village-corridor': 'corridor', 'corridor-exit': 'tower',
};
const backDestination: Record<string, ZoneId> = {
  'forest-back': 'village', 'waterway-back': 'forest', 'station-back': 'waterway', 'highland-back': 'station',
  'archive-back': 'highland', 'village-shuttle': 'archive', 'corridor-back': 'village', 'tower-back': 'corridor',
};
const exitRequirement: Record<string, string> = {
  'forest-exit': 'P05', 'waterway-exit': 'C1-06', 'tower-exit': 'C2-06', 'station-exit': 'C3-06',
  'highland-exit': 'C4-06', 'archive-exit': 'C5-06', 'village-corridor': 'C6-06', 'corridor-exit': 'C7-06',
};
const regionRequirement: Partial<Record<ZoneId, string>> = {
  forest:'P05', waterway:'C1-06', station:'C2-06', highland:'C3-06', archive:'C4-06', corridor:'C6-06', tower:'C7-06',
};
export function unlockedRegions(state: GameState) {
  return MEDIUM_ROUTE.filter(zone => !regionRequirement[zone] || done(state, regionRequirement[zone]));
}

export function mediumDestination(state: GameState, id: string) {
  if (backDestination[id]) return backDestination[id];
  if (done(state, exitRequirement[id])) return nextDestination[id];
}

export function mediumObjective(state: GameState) {
  if (done(state, 'E06')) return { text: '黎明後可自由重訪各地，繼續未完成的約定。', targetIds: [] };
  if (done(state, 'C8-06')) return { text: '黎明已至。開始返鄉尾聲，看看各地的近況。', targetIds: [] };
  const steps = mediumSteps(state);
  if (steps.length) return { text: steps.map(step => step.prompt).join('／'), targetIds: steps.map(step => step.target) };
  const chapter = mediumChapter(state);
  if (!chapter) return { text: '前往北方星台。', targetIds: ['dawn'] };
  const direct = mediumObjects(state).find(object => mediumDestination(state, object.id) === chapter.zone);
  return { text: `前往${ALL_ZONES[chapter.zone].name}。也可在區域地圖選擇接駁。`, targetIds: direct ? [direct.id] : [] };
}

export function mediumLines(state: GameState, step: StoryStep): string[][] {
  let lines = MEDIUM_TEXT[step.scene].lines;
  if (step.lines) lines = lines.slice(...step.lines);
  if (step.scene === 'C5-02' && mediumSteps(state).length === 1) lines = [...lines, ...MEDIUM_TEXT[step.scene].lines.slice(3)];
  if (step.scene === 'C2-03' && !done(state, 'pendant-quest')) {
    lines = lines.map(([speaker, line]) => [speaker, line.replace('米菈的風鈴', '村口每天都有人回應的鈴')]);
  }
  if (step.scene === 'C2-04') return [...lines.slice(0, 3), ...lines.slice(5)];
  return lines;
}

export function finishMediumAction(state: GameState, step: StoryStep) {
  finishMediumStep(state, step);
  if (step.scene === 'P00' && !done(state, 'intro')) state.flags.push('intro');
  if (step.scene === 'P01' && !done(state, 'main-quest')) {
    state.flags.push('main-quest'); state.xp += 10; state.inventory.potion += 2;
  }
  if (step.scene === 'C2-03' && !done(state, 'loren-memory')) {
    state.flags.push('loren-memory'); state.xp += 20;
  }
  if (step.scene === 'C8-06' && !done(state, 'ending')) state.flags.push('ending');
}

export function epilogueLines(state: GameState, id: string): string[][] {
  const script = MEDIUM_TEXT[id].lines;
  if (id === 'E01') return [...script,
    ...(done(state, 'herb-reward') ? [['旁白','桌上多了孩子喝完藥的杯子。']] : []),
    ...(done(state, 'forest-song') ? [['旁白','莉恩終於把第三盞燈的歌唱完。']]
      : [['莉恩','回程聽見森林像在唱歌。'], ['守燈婆婆','改天我教妳唱。']]),
  ];
  const extras: Record<string, [string, string][]> = {
    E03: [['SQ03','公告上多了伊朵的修聲教學預告。'], ['SQ04','失物桌的舊票有了本人確認的註記。']],
    E04: [['SQ05','棚邊的標示讓人路避開巢聲。'], ['SQ06','工具架還留著給下一班的空位。']],
    E05: [['SQ07','桌上有已核對的本人副本。'], ['SQ08','小鈴旁放著「下次再談」的紙。']],
    E06: [['SQ09','婆婆的下午空班寫在桌上的輪值簿。'], ['SQ12','巡燈表仍有空白，留給之後願意接班的人。']],
  };
  if (id === 'E02') return [...(done(state, 'pendant-reward') ? script.slice(0, 3) : script.slice(3, 5)), ...script.slice(5)];
  return [...script, ...(extras[id] ?? []).filter(([flag]) => done(state, flag)).map(([, line]) => ['旁白', line])];
}
