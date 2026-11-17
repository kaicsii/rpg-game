import { ZONES, ENEMIES, type GameState } from './data';
import { getObjective, visibleMapObjects, has } from './game';
import type { World, Obstacle } from './world';
const cache = new WeakMap<World, Map<string,string>>();
const escape = (s: string) => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function mapPoints(state: GameState) {
  const targets = getObjective(state).targetIds;
  return [...visibleMapObjects(state), ...ZONES[state.zone].encounters.filter(e=>targets.includes(e.id)&&!state.defeated.includes(e.id)).map(e=>({...e,kind:'enemy',label:ENEMIES[e.enemies[0]].name}))];
}
export function mapView(state: GameState, world: World) {
  let zones = cache.get(world); if (!zones) { zones=new Map(); cache.set(world,zones); }
  let base=zones.get(state.zone);
  if (!base) {
    const rect=(r:Obstacle,color:string)=>`<rect x="${r.x-r.w/2}" y="${r.z-r.d/2}" width="${r.w}" height="${r.d}" fill="${color}"/>`;
    base='<rect x="-16" y="-13" width="32" height="26" rx="0.5" fill="#335b54"/>'+world.mapWater.map(r=>rect(r,'#416e83')).join('')+world.mapRoads.map(r=>rect(r,'#a19f77')).join('')+world.obstacles.map(r=>rect(r,'#193d3e')).join(''); zones.set(state.zone,base);
  }
  const targets=getObjective(state).targetIds;
  const markers=mapPoints(state).map(o=>{
    const color=targets.includes(o.id)?'#ffda83':o.kind==='lamp'?'#97e5e1':has(state,o.id)?'#82978f':'#e6e2c9';
    return `<g><title>${escape(o.label)}</title><circle cx="${o.x}" cy="${o.z}" r="${targets.includes(o.id)?0.52:0.3}" fill="${color}" stroke="#102d32" stroke-width="0.1"/></g>`;
  }).join('');
  return `<svg class="zone-map" viewBox="-16 -13 32 26" role="img" aria-label="${ZONES[state.zone].name}地圖，北方朝上">${base}${markers}<circle data-map-player cx="${state.position.x}" cy="${state.position.z}" r="0.5" fill="#fff" stroke="#246c92" stroke-width="0.23"/><text x="14" y="-10.5" font-size="1.5" text-anchor="middle" fill="#fff2c9">N</text></svg>`;
}
