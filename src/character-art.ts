type Traveler = {
  name: string;
  coat: string;
  trim: string;
  hair: string;
  skin: string;
  head: 'hood' | 'cap' | 'bun' | 'wrap' | 'loose' | 'braids' | 'goggles' | 'hat' | 'kerchief';
  dress: 'shawl' | 'apron' | 'uniform' | 'cape' | 'vest' | 'sling';
  prop: 'lantern' | 'pack' | 'book' | 'sword' | 'boat' | 'ticket' | 'reed' | 'staff' | 'flask' | 'letter' | 'bowl' | 'none';
};

export const NPC_ART = {
  elder: { name: '守燈婆婆', coat: '#76607c', trim: '#d6ae7a', hair: '#d8cdba', skin: '#e6b38d', head: 'bun', dress: 'shawl', prop: 'lantern' },
  merchant: { name: '行腳商人', coat: '#557f76', trim: '#be925e', hair: '#574137', skin: '#c68c68', head: 'hat', dress: 'vest', prop: 'pack' },
  child: { name: '米菈', coat: '#b9784d', trim: '#ede0b5', hair: '#805044', skin: '#efbe97', head: 'braids', dress: 'apron', prop: 'boat' },
  'station-mother': { name: '候車母親', coat: '#915d70', trim: '#e2bb9d', hair: '#684a49', skin: '#d5a27d', head: 'wrap', dress: 'shawl', prop: 'pack' },
  'station-chief': { name: '驛務長桑榆', coat: '#545c80', trim: '#e5ad70', hair: '#5a4d59', skin: '#e4b891', head: 'cap', dress: 'uniform', prop: 'ticket' },
  'highland-workshop': { name: '修聲匠伊朵', coat: '#a35b41', trim: '#eab780', hair: '#493845', skin: '#c78e71', head: 'goggles', dress: 'apron', prop: 'reed' },
  'highland-injured': { name: '巡燈員亞岑', coat: '#4c758f', trim: '#e1d4b5', hair: '#63524e', skin: '#deb295', head: 'loose', dress: 'sling', prop: 'staff' },
  'archive-host': { name: '保管員芙蕾', coat: '#c2b69b', trim: '#7e687e', hair: '#9c8b8a', skin: '#e5b595', head: 'bun', dress: 'uniform', prop: 'book' },
  'archive-reader-1': { name: '寄存者甲', coat: '#926b87', trim: '#cbb2c5', hair: '#63495b', skin: '#dbab92', head: 'hood', dress: 'cape', prop: 'letter' },
  'archive-reader-2': { name: '寄存者乙', coat: '#986d50', trim: '#e0c086', hair: '#554541', skin: '#bc8468', head: 'loose', dress: 'vest', prop: 'book' },
  'archive-reader-3': { name: '寄存者丙', coat: '#587d8c', trim: '#c3d5cd', hair: '#94796b', skin: '#e4bb95', head: 'wrap', dress: 'cape', prop: 'bowl' },
  'village-neighbor': { name: '村中鄰居', coat: '#6c8460', trim: '#d7bb73', hair: '#584b52', skin: '#d4a17d', head: 'kerchief', dress: 'apron', prop: 'flask' },
} satisfies Record<string, Traveler>;

export const DIALOGUE_ART = {
  'station-clerk': { name: '站務員', coat: '#4a6a75', trim: '#a4c4b4', hair: '#7e5c4c', skin: '#dfad87', head: 'cap', dress: 'uniform', prop: 'letter' },
  traveler: { name: '旅客', coat: '#846753', trim: '#d6ba8e', hair: '#625249', skin: '#d7a183', head: 'hat', dress: 'cape', prop: 'pack' },
  'ticket-owner': { name: '原持票人', coat: '#665773', trim: '#e2b27b', hair: '#a29384', skin: '#d2a181', head: 'loose', dress: 'vest', prop: 'ticket' },
  apprentice: { name: '修聲棚見習者', coat: '#50837a', trim: '#daa864', hair: '#735242', skin: '#e4b495', head: 'kerchief', dress: 'apron', prop: 'reed' },
  'archive-audit': { name: '核對紀錄的寄存者', coat: '#6d667e', trim: '#d5b89e', hair: '#413748', skin: '#e8b996', head: 'braids', dress: 'vest', prop: 'book' },
  'archive-pause': { name: '練習暫停的寄存者', coat: '#718d85', trim: '#c4dabf', hair: '#655056', skin: '#c38e76', head: 'hood', dress: 'shawl', prop: 'letter' },
  resident: { name: '公開會議的居民', coat: '#7e605d', trim: '#d1a58c', hair: '#aa9a8c', skin: '#d6a28a', head: 'wrap', dress: 'shawl', prop: 'none' },
  'resident-a': { name: '霧鐘村居民甲', coat: '#788555', trim: '#dac699', hair: '#6d5043', skin: '#e6b38e', head: 'braids', dress: 'vest', prop: 'letter' },
  'resident-b': { name: '霧鐘村居民乙', coat: '#5d6786', trim: '#a9b3ce', hair: '#473b49', skin: '#c8977a', head: 'hood', dress: 'cape', prop: 'none' },
  'resident-c': { name: '霧鐘村居民丙', coat: '#a17b56', trim: '#d9c5a0', hair: '#b2a095', skin: '#e7ba9b', head: 'kerchief', dress: 'apron', prop: 'bowl' },
  'bridge-echo': { name: '守橋人的回音', coat: '#4d777d', trim: '#ace0d5', hair: '#91beb8', skin: '#b2d8c8', head: 'hat', dress: 'cape', prop: 'bowl' },
  'village-echo': { name: '村人的回音', coat: '#656d94', trim: '#b6b8e2', hair: '#a0b1ce', skin: '#c5d7e6', head: 'hood', dress: 'shawl', prop: 'lantern' },
  'past-loren': { name: '過去的洛恩', coat: '#8d9eb7', trim: '#f3dbac', hair: '#d4c8c2', skin: '#ecc6aa', head: 'loose', dress: 'cape', prop: 'sword' },
} satisfies Record<string, Traveler>;

export const TRAVELER_ART: Record<string, Traveler> = { ...NPC_ART, ...DIALOGUE_ART };
export const ECLIPSE_FORM = 'eclipse-after';

export function enemyArtKey(template: string, phase: number) {
  return template === 'eclipse' && phase === 2 ? ECLIPSE_FORM : template;
}

const speakerArt = new Map([
  ['莉恩', 'lien'], ['洛恩', 'loren'], ['守燈婆婆', 'elder'], ['守燈婆婆的傳話', 'elder'],
  ['米菈', 'child'], ['行腳商人', 'merchant'], ['候車母親', 'station-mother'],
  ['桑榆', 'station-chief'], ['桑榆的回傳', 'station-chief'],
  ['伊朵', 'highland-workshop'], ['亞岑', 'highland-injured'], ['芙蕾', 'archive-host'],
  ['寄存者甲', 'archive-reader-1'], ['寄存者乙', 'archive-reader-2'], ['寄存者丙', 'archive-reader-3'],
  ['鄰居', 'village-neighbor'], ['站務員', 'station-clerk'], ['灰港站務員的聲音', 'station-clerk'],
  ['旅客', 'traveler'], ['原持票人', 'ticket-owner'], ['見習者', 'apprentice'],
  ['居民', 'resident'], ['居民甲', 'resident-a'], ['居民乙', 'resident-b'], ['居民丙', 'resident-c'],
  ['守橋人的回音', 'bridge-echo'], ['過去村民的回音', 'bridge-echo'], ['村人的回音', 'village-echo'],
  ['過去的洛恩', 'past-loren'],
]);

export function dialogueArtKey(speaker: string, scene?: string) {
  if (speaker === '無光的守鐘人') return enemyArtKey('eclipse', scene === 'C8-04' ? 2 : 1);
  if (speaker === '寄存者') return scene?.toLowerCase().startsWith('sq08') ? 'archive-pause' : 'archive-audit';
  if (speaker === '旅客' && scene === 'sq04-b') return 'ticket-owner';
  return speakerArt.get(speaker);
}
