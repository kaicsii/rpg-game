import { ALL_ZONES as ZONES, ENEMIES, type GameState } from './data';
import { getObjective, visibleMapObjects, has } from './game';
import type { World, Obstacle } from './world';
import { areaArt } from './art';
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
  const layout = state.zone;
  let base=zones.get(layout);
  if (!base) {
    const rect=(r:Obstacle,color:string)=>`<rect x="${r.x-r.w/2}" y="${r.z-r.d/2}" width="${r.w}" height="${r.d}" fill="${color}"/>`;
    const { mist, ground, paving } = areaArt[state.zone];
    const hex = (color: number) => '#' + color.toString(16).padStart(6, '0');
    base = rect({ x: 0, z: 0, w: 32, d: 26 }, hex(ground))
      + '<path d="M-12-13V13M-8-13V13M-4-13V13M0-13V13M4-13V13M8-13V13M12-13V13M-16-8H16M-16-4H16M-16 0H16M-16 4H16M-16 8H16" stroke="var(--gold)" opacity=".24" stroke-width=".08"/>'
      + world.mapWater.map(r => rect(r, '#4c809b')).join('')
      + world.mapRoads.map(r => rect(r, hex(paving))).join('')
      + world.obstacles.map(r => rect(r, hex(mist))).join('')
      + '<rect x="-15.9" y="-12.9" width="31.8" height="25.8" fill="none" stroke="var(--gold)" opacity=".53" stroke-width=".18"/>';
    zones.set(layout, base);
  }
  const targets=getObjective(state).targetIds;
  const markers=mapPoints(state).map(o=>{
    const main = targets.includes(o.id);
    const color = main ? 'var(--gold)' : o.kind === 'lamp' ? 'var(--map-lamp)' : o.id === 'merchant' ? 'var(--map-shop)' : o.kind === 'npc' ? 'var(--map-npc)' : has(state,o.id) ? '#a2acb2' : '#e6e2d8';
    const shape = main ? '<path d="M0-.83 .23-.24 .83 0 .23.24 0 .83-.23.24-.83 0-.23-.24Z"/>' :
      o.id === 'merchant' ? '<rect x="-.53" y="-.53" width="1.06" height="1.06" rx=".08"/>' :
      o.kind === 'npc' ? '<path d="M0-.67 .63 0 0 .67-.63 0Z"/>' : `<circle r="${o.kind === 'lamp' ? 0.52 : 0.33}"/>`;
    return `<g transform="translate(${o.x} ${o.z})" fill="${color}" stroke="var(--ink)" stroke-width=".16"><title>${escape(o.label)}</title>${shape}</g>`;
  }).join('');
  return `<svg class="zone-map" viewBox="-16 -13 32 26" role="img" aria-label="${ZONES[state.zone].name}地圖，北方朝上">${base}${markers}
    <circle data-map-player cx="${state.position.x}" cy="${state.position.z}" r=".53" fill="#fff9e9" stroke="var(--ink)" stroke-width=".26"/>
    <path d="M13.7-12.1l1.55 1.85-1.55 1.85-1.55-1.85Z" fill="var(--ink)" stroke="var(--gold)" stroke-width=".12"/>
    <text x="13.7" y="-9.81" font-size="1.25" text-anchor="middle" fill="var(--gold)">N</text>
  </svg>`;
}
