import { ALL_ZONES as ZONES, ENEMIES, type GameState } from './data';
import { getObjective, visibleMapObjects, has } from './game';
import { isMedium } from './medium';
import type { World, Obstacle } from './world';
const cache = new WeakMap<World, Map<string,string>>();
const escape = (s: string) => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function mapSymbol(kind: string, id: string, main: boolean) {
  return main ? '★' : id === 'merchant' ? '■' : kind === 'npc' ? '◆' : kind === 'lamp' ? '●' : '◇';
}
export function mapPoints(state: GameState) {
  const targets = getObjective(state).targetIds;
  return [...visibleMapObjects(state), ...ZONES[state.zone].encounters.filter(e=>targets.includes(e.id)&&!state.defeated.includes(e.id)).map(e=>({...e,kind:'enemy',label:ENEMIES[e.enemies[0]].name}))];
}
export function mapView(state: GameState, world: World) {
  let zones = cache.get(world); if (!zones) { zones=new Map(); cache.set(world,zones); }
  const layout = `${state.zone}:${isMedium(state)}`;
  let base=zones.get(layout);
  if (!base) {
    const rect=(r:Obstacle,color:string)=>`<rect x="${r.x-r.w/2}" y="${r.z-r.d/2}" width="${r.w}" height="${r.d}" fill="${color}"/>`;
    base = '<rect x="-16" y="-13" width="32" height="26" rx="0.5" fill="#23434a"/>'
      + '<path d="M-12-13V13M-8-13V13M-4-13V13M0-13V13M4-13V13M8-13V13M12-13V13M-16-8H16M-16-4H16M-16 0H16M-16 4H16M-16 8H16" stroke="#bfd1bf" opacity=".16" stroke-width=".08"/>'
      + world.mapWater.map(r => rect(r, '#416a83')).join('')
      + world.mapRoads.map(r => rect(r, '#9c916c')).join('')
      + world.obstacles.map(r => rect(r, '#142d37')).join('');
    zones.set(layout, base);
  }
  const targets=getObjective(state).targetIds;
  const markers=mapPoints(state).map(o=>{
    const main = targets.includes(o.id);
    const color = main ? '#ffda83' : o.kind === 'lamp' ? '#97e5e1' : o.id === 'merchant' ? '#b9e5ad' : o.kind === 'npc' ? '#e8c7fc' : has(state,o.id) ? '#82978f' : '#e6e2c9';
    const shape = main ? '<path d="M0-.83 .23-.24 .83 0 .23.24 0 .83-.23.24-.83 0-.23-.24Z"/>' :
      o.id === 'merchant' ? '<rect x="-.53" y="-.53" width="1.06" height="1.06" rx=".08"/>' :
      o.kind === 'npc' ? '<path d="M0-.67 .63 0 0 .67-.63 0Z"/>' : `<circle r="${o.kind === 'lamp' ? 0.52 : 0.33}"/>`;
    return `<g transform="translate(${o.x} ${o.z})" fill="${color}" stroke="#102d32" stroke-width=".16"><title>${escape(o.label)}</title>${shape}</g>`;
  }).join('');
  return `<svg class="zone-map" viewBox="-16 -13 32 26" role="img" aria-label="${ZONES[state.zone].name}地圖，北方朝上">${base}${markers}
    <circle data-map-player cx="${state.position.x}" cy="${state.position.z}" r=".53" fill="#fff9e9" stroke="#15303e" stroke-width=".26"/>
    <path d="M13.8-12.2 12.9-10.25 13.8-10.64 14.7-10.25Z" fill="#ffdb95"/>
    <text x="13.8" y="-8.8" font-size="1.5" text-anchor="middle" fill="#fff2c9">N</text>
  </svg>`;
}
