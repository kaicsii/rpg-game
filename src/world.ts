import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ENEMIES, ZONES, type CombatEffect, type GameState, type ZoneId, type Vec2 } from './data';
import { type Battle, puzzleSolved } from './game';

export type Obstacle = { x: number; z: number; w: number; d: number };
const palette = { grass: 0x477366, dark: 0x254e49, stone: 0x6f827d, gold: 0xe7bd75, roof: 0x6f5254 };
function seeded(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
export function pixelTexture(kind: string, frame = 0, direction = 0): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 40;
  const c = canvas.getContext('2d')!; const rect = (x: number, y: number, w: number, h: number, color: string) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
  if (kind === 'lien' || kind === 'loren' || kind === 'elder' || kind === 'merchant' || kind === 'child') {
    const mage = kind === 'lien'; const elder = kind === 'elder'; const knight = kind === 'loren';
    const coat = mage ? '#427d89' : knight ? '#b4b7bc' : elder ? '#8b7399' : kind === 'child' ? '#d6a05d' : '#69837d';
    const trim = mage ? '#e9c28a' : knight ? '#718b99' : '#d9bb8a';
    const bob = frame % 2; const step = frame === 1 ? 2 : frame === 3 ? -2 : 0;
    rect(9, 31, 5, 7 - Math.max(0, step), '#393e43'); rect(18, 31, 5, 7 + Math.min(0, step), '#393e43');
    rect(8, 36 - Math.max(0, step), 7, 3, '#29333b'); rect(18, 36 + Math.min(0, step), 7, 3, '#29333b');
    rect(8, 17 + bob, 16, 17, coat); rect(6, 19 + bob, 4, 12, coat); rect(23, 19 + bob, 4, 12, coat);
    rect(9, 30 + bob, 14, 3, trim); rect(14, 18 + bob, 3, 14, trim);
    if (knight) { rect(6, 18 + bob, 7, 5, '#e1d9c1'); rect(21, 18 + bob, 6, 5, '#e1d9c1'); rect(25, 18, 2, 18, '#ccd0cd'); rect(23, 30, 6, 2, '#d7b16b'); }
    else { rect(5, 25 + bob, 3, 5, '#e7bb94'); rect(26, 16, 2, 20, '#715541'); rect(24, 13, 6, 6, '#e7c984'); rect(25, 14, 4, 4, '#fff0b1'); }
    rect(10, 6 + bob, 13, 13, '#e9c19c'); rect(8, 4 + bob, 16, 6, elder ? '#dad6c8' : mage ? '#705047' : '#a19b91');
    rect(8, 8 + bob, 3, 10, elder ? '#dad6c8' : mage ? '#705047' : '#a19b91');
    rect(21, 7 + bob, 3, 8, elder ? '#dad6c8' : mage ? '#705047' : '#a19b91');
    if (direction !== 2) { rect(direction === 1 ? 18 : 12, 11 + bob, 2, 2, '#35454b'); if (direction === 0) rect(19, 11 + bob, 2, 2, '#35454b'); rect(16, 15 + bob, 3, 1, '#bd806b'); }
    else rect(10, 7 + bob, 13, 10, mage ? '#705047' : '#a19b91');
    if (mage) { rect(7, 3 + bob, 18, 3, '#3f6876'); rect(10, 0 + bob, 11, 4, '#578694'); rect(18, 2 + bob, 3, 3, '#e8c585'); rect(11, 18 + bob, 10, 3, '#e3ad73'); }
    if (elder) { rect(8, 2 + bob, 15, 3, '#d6d6c7'); rect(12, 17 + bob, 8, 2, '#ebe2cb'); }
    if (frame === 4) {
      rect(21, 18, 8, 5, coat); rect(27, 18, 4, 4, '#e7bb94');
      if (knight) { rect(27, 10, 2, 15, '#e9e4d3'); rect(24, 21, 7, 2, '#e0bd79'); }
      else { rect(28, 9, 2, 18, '#715541'); rect(26, 6, 6, 6, '#fff0b1'); }
    }
  } else if (kind === 'guardian') {
    const bark = '#544336', moss = '#6e8161', gold = '#ffcf7d';
    rect(3, 8, 8, 3, bark); rect(5, 2, 3, 9, bark); rect(9, 5, 4, 8, moss);
    rect(21, 4, 7, 4, moss); rect(25, 0, 3, 10, bark); rect(20, 7, 9, 5, bark);
    rect(9, 10, 15, 23, bark); rect(11, 9, 11, 7, '#928365'); rect(11, 16, 3, 15, '#786044');
    rect(11, 17, 3, 2, gold); rect(19, 17, 3, 2, gold); rect(16, 21, 2, 7, '#d18a55');
    rect(15, 23, 5, 2, gold); rect(12, 31, 5, 6, bark); rect(18, 31, 5, 6, bark);
    rect(6, 36, 11, 3, moss); rect(19, 36, 11, 3, moss);
    const arm = frame === 2 ? 14 : frame === 4 ? 20 : 25;
    rect(4, arm, 6, 8, bark); rect(23, arm - 2, 6, 10, bark);
    rect(1, arm + 4, 6, 3, moss); rect(26, arm + 4, 6, 3, moss);
    if (frame === 2) { rect(5, 17, 2, 3, gold); rect(26, 16, 2, 3, gold); }
  } else {
    const e = ENEMIES[kind] ?? ENEMIES.slime; const color = e.color;
    if (e.shape === 'slime') { rect(6, 23, 21, 12, color); rect(9, 19, 15, 5, color); rect(3, 30, 26, 6, color); rect(9, 25, 4, 4, '#e1fff2'); rect(12, 29, 2, 3, '#304d58'); rect(21, 29, 2, 3, '#304d58'); }
    if (e.shape === 'moth' || e.shape === 'raven') { rect(3, 12 + frame % 2 * 3, 10, 15, color); rect(20, 12 + frame % 2 * 3, 10, 15, color); rect(13, 15, 7, 19, '#687082'); rect(14, 11, 5, 6, color); rect(15, 14, 2, 2, '#ffe6a4'); rect(5, 16, 4, 6, '#f4dec1'); rect(24, 16, 3, 6, '#f4dec1'); }
    if (e.shape === 'root') { rect(10, 10, 13, 25, '#6e6652'); rect(4, 21, 7, 6, '#6e6652'); rect(23, 18, 7, 6, '#6e6652'); rect(6, 4, 22, 13, color); rect(11, 0, 13, 6, color); rect(13, 20, 3, 3, '#ffe8a6'); rect(20, 20, 3, 3, '#ffe8a6'); rect(6, 33, 8, 5, '#6e6652'); rect(22, 32, 6, 6, '#6e6652'); }
    if (e.shape === 'wisp') { rect(11, 10, 13, 23, color); rect(6, 17, 23, 10, color); rect(16, 3, 5, 9, color); rect(13, 18, 9, 9, '#eaffff'); rect(13, 33, 5, 4, color); }
    if (e.shape === 'knight') { rect(8, 15, 17, 20, color); rect(9, 4, 15, 12, '#687782'); rect(12, 9, 12, 3, '#f7d49b'); rect(5, 17, 7, 10, '#c1b9a0'); rect(24, 14, 3, 22, '#e3dfca'); rect(21, 28, 9, 3, '#b49666'); rect(9, 33, 6, 6, '#4f5663'); rect(20, 33, 6, 6, '#4f5663'); rect(11, 0, 10, 4, '#b9b2aa'); }
  }
  const t = new THREE.CanvasTexture(canvas); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class World {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera: THREE.OrthographicCamera; composer: EffectComposer; bloom: UnrealBloomPass; bokeh: BokehPass;
  root = new THREE.Group(); actorRoot = new THREE.Group(); obstacles: Obstacle[] = []; mapRoads: Obstacle[] = []; mapWater: Obstacle[] = []; private highlightRing?: THREE.Mesh; sprites = new Map<string, THREE.Sprite>();
  player!: THREE.Sprite; companion!: THREE.Sprite; particles!: THREE.Points; water: THREE.Mesh[] = []; lamps = new Map<string, THREE.Group>();
  clock = new THREE.Clock(); private zone: ZoneId = 'village'; private battle = false; private tex = new Map<string, THREE.CanvasTexture>(); private materials = new Map<string, THREE.MeshStandardMaterial>();
  private combatFx: { sprite: THREE.Sprite; start: number; effect: CombatEffect; phase: 'cast' | 'impact'; from: THREE.Vector3; to: THREE.Vector3 }[] = [];
  private noise?: THREE.CanvasTexture; private effects: { sprite: THREE.Sprite; start: number; y: number }[] = [];
  private target = new THREE.Vector3(); private cameraFocus = new THREE.Vector3(); private quality: 'high' | 'low' = 'high'; private reduced = false;
  private viewport = new THREE.Vector2();
  private deviceRatio = 0;
  private resizeTimer?: ReturnType<typeof setTimeout>;
  private readonly picker = new THREE.Raycaster();
  private readonly ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private gate?: THREE.Group; private beams: { mesh: THREE.Mesh; id: string; value: number }[] = [];
  private lastTime = 0; private direction = 0; private sun: THREE.DirectionalLight; private moon!: THREE.Mesh;
  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.25;
    this.camera = new THREE.OrthographicCamera(-22, 22, 13, -13, 0.1, 250);
    this.scene.background = new THREE.Color('#263e45'); this.scene.fog = new THREE.FogExp2('#354f54', 0.013);
    this.scene.add(new THREE.HemisphereLight(0xb2d8e0, 0x263f36, 2.2));
    this.sun = new THREE.DirectionalLight(0xffd8a0, 3.3); this.sun.position.set(-18, 28, -12); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048); Object.assign(this.sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 80 }); this.sun.shadow.bias = -0.001; this.sun.shadow.normalBias = 0.06; this.scene.add(this.sun);
    const rim = new THREE.DirectionalLight(0x83bed1, 1.5); rim.position.set(15, 12, 15); this.scene.add(rim);
    this.scene.add(this.root, this.actorRoot);
    this.composer = new EffectComposer(this.renderer); this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bokeh = new BokehPass(this.scene, this.camera, { focus: 50, aperture: 0.00006, maxblur: 0.004 }); this.bokeh.enabled = false; this.composer.addPass(this.bokeh);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1280, 720), 0.24, 0.7, 1.2); this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass());
    this.resize(true);
  }
  private material(color: THREE.ColorRepresentation, emissive = false) {
    const key = `${color}:${emissive}`; let m = this.materials.get(key);
    if (!this.noise) {
      const tile = document.createElement('canvas'); tile.width = tile.height = 16; const ctx = tile.getContext('2d')!; const random = seeded(101);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const shade = 220 + Math.floor(random() * 35); ctx.fillStyle = `rgb(${shade},${shade},${shade})`; ctx.fillRect(x, y, 1, 1); }
      this.noise = new THREE.CanvasTexture(tile); this.noise.magFilter = this.noise.minFilter = THREE.NearestFilter; this.noise.colorSpace = THREE.SRGBColorSpace;
    }
    if (!m) { m = new THREE.MeshStandardMaterial({ color, map: emissive ? null : this.noise, roughness: 0.9, ...(emissive ? { emissive: color, emissiveIntensity: 2.5 } : {}) }); this.materials.set(key, m); } return m;
  }
  private box(x: number, y: number, z: number, w: number, h: number, d: number, color: THREE.ColorRepresentation, parent: THREE.Object3D = this.root, glow = false) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.material(color, glow)); m.position.set(x, y, z); m.castShadow = !glow; m.receiveShadow = true; parent.add(m); return m;
  }
  private cylinder(x: number, y: number, z: number, r: number, h: number, color: THREE.ColorRepresentation, segments = 8, parent: THREE.Object3D = this.root) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, h, segments), this.material(color)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  private texture(kind: string, frame = 0, direction = 0) { const key = `${kind}-${frame}-${direction}`; if (!this.tex.has(key)) this.tex.set(key, pixelTexture(kind, frame, direction)); return this.tex.get(key)!; }
  private sprite(kind: string, x: number, z: number, id: string, scale = 1) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texture(kind), depthWrite: false, alphaTest: 0.1 }));
    s.scale.set(1.5 * scale, 1.875 * scale, 1); s.position.set(x, 0.98 * scale, z); this.actorRoot.add(s); this.sprites.set(id, s);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.38 * scale, 12), new THREE.MeshBasicMaterial({ color: 0x132f32, transparent: true, opacity: 0.35, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.set(x, 0.055, z); this.actorRoot.add(shadow); s.userData.shadow = shadow; s.userData.kind = kind; s.userData.restPosition = s.position.clone(); return s;
  }
  private lamp(x: number, z: number, id: string, blue = false) {
    const g = new THREE.Group(); g.position.set(x, 0, z); this.root.add(g); this.lamps.set(id, g);
    this.cylinder(0, 0.12, 0, 0.48, 0.22, 0x87908a, 8, g); this.box(0, 1.1, 0, 0.16, 2, 0.16, 0x545d55, g);
    this.box(0, 2.05, 0, 0.52, 0.65, 0.52, blue ? 0x92e6e3 : 0xffd88f, g, true);
    for (const dx of [-0.3, 0.3]) for (const dz of [-0.3, 0.3]) this.box(dx, 2.05, dz, 0.07, 0.76, 0.07, 0x575b50, g);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.38, 4), this.material(0x63756d)); roof.rotation.y = Math.PI / 4; roof.position.y = 2.6; g.add(roof);
    const light = new THREE.PointLight(blue ? 0x88ddd7 : 0xffc879, 5, 7, 2); light.position.y = 2.1; g.add(light);
  }
  private tree(x: number, z: number, size: number, rng: () => number, pine = false) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(size); this.root.add(g);
    this.box(0, 1.1, 0, 0.4, 2.2, 0.43, 0x5b5945, g);
    if (pine) {
      for (let j = 0; j < 3; j++) { const m = new THREE.Mesh(new THREE.ConeGeometry(1.5 - j * 0.32, 2.4, 5), this.material([0x315e52, 0x3c7260, 0x558575][j])); m.position.y = 2 + j * 0.9; m.rotation.y = j; m.castShadow = true; g.add(m); }
    } else {
      for (let j = 0; j < 6; j++) { const a = j * 2.4; const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3 + rng() * 0.5, 0), this.material([0x4d7d62, 0x69916d, 0x406c58, 0x7c9a71][j % 4])); m.position.set(Math.cos(a) * 0.6, 2.7 + rng() * 0.8, Math.sin(a) * 0.6); m.scale.y = 0.85; m.castShadow = true; g.add(m); }
    }
    this.obstacles.push({ x, z, w: 0.8 * size, d: 0.8 * size });
  }
  private house(x: number, z: number, w: number, d: number, color: number, roofColor: number, tall = false) {
    const h = tall ? 4 : 2.8; const g = new THREE.Group(); g.position.set(x, 0, z); this.root.add(g);
    g.userData.building = '霧鐘村民宅';
    this.box(0, 0.22, 0, w + 0.4, 0.4, d + 0.4, 0x69756d, g); this.box(0, h / 2 + 0.3, 0, w, h, d, color, g);
    for (const dx of [-w / 2 + 0.12, w / 2 - 0.12]) { this.box(dx, h / 2 + 0.35, d / 2 + 0.04, 0.17, h, 0.16, 0x655c4c, g); this.box(dx, h / 2 + 0.35, -d / 2, 0.17, h, 0.16, 0x655c4c, g); }
    this.box(0, h - 0.2, d / 2 + 0.04, w, 0.16, 0.12, 0x655c4c, g);
    this.box(0, 1, d / 2 + 0.05, 0.85, 1.65, 0.1, 0x493f38, g); this.box(0.25, 1.1, d / 2 + 0.12, 0.06, 0.06, 0.06, 0xe0c481, g, true);
    for (const dx of [-w * 0.3, w * 0.3]) {
      this.box(dx, 1.75, d / 2 + 0.06, 0.77, 0.95, 0.1, 0x4e5146, g); this.box(dx, 1.75, d / 2 + 0.13, 0.58, 0.75, 0.1, 0xffcb7b, g, true);
      this.box(dx, 1.75, d / 2 + 0.2, 0.05, 0.8, 0.06, 0x70644e, g); this.box(dx, 1.75, d / 2 + 0.2, 0.65, 0.05, 0.06, 0x70644e, g);
      this.box(dx, 1.23, d / 2 + 0.3, 0.9, 0.14, 0.5, 0x73604b, g);
      for (let k = 0; k < 4; k++) this.box(dx - 0.3 + k * 0.2, 1.4, d / 2 + 0.33, 0.13, 0.18, 0.16, k % 2 ? 0xc999a5 : 0x749c71, g);
    }
    for (const side of [-1, 1]) {
      const roof = this.box(side * w * 0.25, h + 0.82, 0, w * 0.65, 0.2, d + 0.85, roofColor, g); roof.rotation.z = side * -0.51;
      for (let j = 0; j < 5; j++) { const stripe = this.box(side * (0.1 + j * w / 10), h + 1.48 - j * w / 10 * 0.56, 0, 0.07, 0.05, d + 0.87, 0x9b7870, g); stripe.rotation.z = side * -0.51; }
    }
    const face = new THREE.Shape(); face.moveTo(-w / 2, h + 0.1); face.lineTo(w / 2, h + 0.1); face.lineTo(0, h + 1.3); face.closePath();
    const attic = new THREE.Mesh(new THREE.ExtrudeGeometry(face, { depth: d, bevelEnabled: false }), this.material(color)); attic.position.z = -d / 2; attic.castShadow = true; g.add(attic);
    this.box(w * 0.3, h + 1.65, -d * 0.25, 0.5, 1.4, 0.5, 0x81867c, g);
    this.obstacles.push({ x, z, w: w + 0.4, d: d + 0.4 });
  }
  private bridge(x: number, z: number, w = 5, d = 2.4) {
    this.mapRoads.push({ x,z,w,d });
    this.box(x, 0.12, z, w, 0.22, d, 0x9b8a6b);
    for (let i = 0; i < w / 0.32; i++) this.box(x - w / 2 + i * 0.32, 0.26, z, 0.27, 0.06, d, i % 3 ? 0xa09273 : 0x897d64);
    for (const dz of [-d / 2, d / 2]) { this.box(x, 0.8, z + dz, w + 0.2, 0.13, 0.12, 0x766e58); for (let i = 0; i < 4; i++) this.box(x - w / 2 + i * w / 3, 0.55, z + dz, 0.13, 1.15, 0.13, 0x776e59); }
  }
  private river(x: number, z: number, w: number, d: number) {
    this.mapWater.push({ x,z,w,d });
    this.box(x, -0.26, z, w + 0.4, 0.4, d, 0x455f5c);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d, 1, 1), new THREE.MeshStandardMaterial({ color: 0x5f9fa3, metalness: 0.4, roughness: 0.26, transparent: true, opacity: 0.85 })); m.rotation.x = -Math.PI / 2; m.position.set(x, -0.02, z); this.root.add(m); this.water.push(m);
    for (let k = 0; k < 20; k++) this.box(x + Math.sin(k * 17) * w * 0.4, 0.005, z - d / 2 + k * d / 20, 0.3 + (k % 4) * 0.15, 0.012, 0.035, 0x9bc6bf);
  }
  private tower(x: number, z: number, height = 9) {
    const start = this.root.children.length;
    this.cylinder(x, 0.25, z, 2.5, 0.5, 0x83918a); this.box(x, height / 2, z, 3.1, height, 3.1, 0x969c87);
    for (let i = 1; i < height; i += 1.5) this.box(x, i, z, 3.25, 0.16, 3.25, 0x6b7e74);
    this.box(x, height - 1.5, z + 1.57, 1, 1.4, 0.05, 0x344f51); this.box(x, height - 1.5, z + 1.61, 0.7, 1.1, 0.03, 0xffdc8c, this.root, true);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 3.6, 4), this.material(0x4b7071)); roof.rotation.y = Math.PI / 4; roof.position.set(x, height + 1.5, z); roof.castShadow = true; this.root.add(roof);
    this.cylinder(x, height + 3.6, z, 0.07, 1.3, palette.gold); const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), this.material(0xffd795, true)); star.position.set(x, height + 4.3, z); this.root.add(star);
    this.obstacles.push({ x, z, w: 3.8, d: 3.8 });
    for (const part of this.root.children.slice(start)) {
      part.userData.building = '鐘塔';
    }
  }
  build(state: GameState) {
    this.disposeGroup(this.root); this.disposeGroup(this.actorRoot); this.sprites.clear(); this.effects.forEach(e => { e.sprite.material.map?.dispose(); e.sprite.material.dispose(); }); this.effects = []; this.combatFx = []; this.obstacles = []; this.mapRoads = [{x:0,z:0,w:2.8,d:22},{x:0,z:1.8,w:22,d:2.8}]; this.mapWater = []; this.water = []; this.lamps.clear(); this.zone = state.zone; this.battle = false; this.beams = []; this.gate = undefined;
    const rng = seeded(ZONE_ORDER_INDEX[state.zone] * 77 + 50); const zone = state.zone;
    const colors = { village: '#334f51', forest: '#203f40', waterway: '#2c4857', tower: '#343f57' };
    this.scene.background = new THREE.Color(colors[zone]); this.scene.fog = new THREE.FogExp2(colors[zone], 0.012);
    this.sun.color.set(zone === 'tower' ? 0xc3bcf0 : 0xffd8a0);
    this.box(0, -0.75, 0, 32, 1.4, 26, zone === 'tower' ? 0x646d70 : palette.dark);
    this.box(0, -0.12, 0, 32.1, 0.25, 26.1, zone === 'tower' ? 0x7a8381 : zone === 'waterway' ? 0x5a7872 : palette.grass);
    for (let i = 0; i < 45; i++) {
      const x = (rng() - 0.5) * 34; const z = (rng() - 0.5) * 28;
      if (Math.abs(x) < 13 && Math.abs(z) < 11) continue;
      const stone = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + rng() * 0.8, 0), this.material(0x59746a)); stone.position.set(x, -0.3, z); stone.scale.y = 0.75; this.root.add(stone);
    }
    // Raised stone road: individual irregular pavers preserve depth under directional light.
    for (let z = -11; z <= 11; z++) for (let x = -1; x <= 1; x++) this.box(x * 0.92 + (rng() - 0.5) * 0.09, 0.045, z * 0.95, 0.82 + rng() * 0.08, 0.09, 0.82 + rng() * 0.08, [0x9ca78c, 0x89977f, 0xa8ae95, 0x7f9381][Math.floor(rng() * 4)]);
    for (let x = -11; x <= 11; x++) for (let z = 1; z <= 3; z++) if (Math.abs(x) > 1) this.box(x * 0.94, 0.035, z * 0.92, 0.84, 0.07, 0.82, [0x95a18a, 0x83957e, 0xa5ab94][Math.floor(rng() * 3)]);
    if (zone === 'village') {
      this.house(-7.2, 0, 4.6, 3.8, 0xc5bba0, 0x7b5850); this.house(6.4, -2, 4, 3.4, 0xb2b89d, 0x596e70);
      this.house(-7, 8.8, 4.2, 3, 0xb9ae91, 0x805d50); this.house(7.5, 8.8, 3.8, 3, 0xbab69b, 0x6d7770);
      this.tower(-6, -7.2, 6); this.river(12, 0, 3.1, 26); this.bridge(12, 2.1, 4.5, 2.6);
      this.box(6.5, 1.6, 4.8, 2.8, 0.14, 1.8, 0x807d60); for (const x of [5.2, 7.8]) this.box(x, 0.8, 4.8, 0.1, 1.6, 0.1, 0x71624f);
      this.box(6.5, 1.75, 4.8, 2.9, 0.15, 1.9, 0xb59865); this.box(6.5, 0.55, 4.8, 2.6, 1, 1.2, 0x6f6752);
      for (let i = 0; i < 6; i++) this.box(5.5 + i * 0.38, 1.16, 4.8, 0.22, 0.18, 0.3, i % 2 ? 0xb98b58 : 0xb5aa75);
      this.cylinder(-1, 0.28, 0, 2, 0.5, 0x8a9581, 12); this.cylinder(-1, 0.56, 0, 1.6, 0.16, 0xb0b39a, 12);
      this.cylinder(-1, 0.8, 0, 1.2, 0.3, 0x577e75, 12); this.cylinder(-1, 1.1, 0, 0.3, 0.9, 0x9ca78d, 8);
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), this.material(0xffd494, true)); crystal.position.set(-1, 2, 0); this.root.add(crystal); this.obstacles.push({ x: -1, z: 0, w: 3.1, d: 3.1 });
      for (const [x, z] of [[-11, -6], [-12, 3], [4, -8], [10, -8], [-13, 9], [15, 8], [15, -8]]) this.tree(x, z, 1.1, rng);
      const oldLantern = ZONES.village.objects.find(o => o.id === 'bridge-lantern')!;
      this.lamp(oldLantern.x, oldLantern.z, oldLantern.id);
      for (const [x, z] of [[4, 5], [-3, -5], [3, -5], [-10, 4]]) this.lamp(x, z, `street-${x}-${z}`);
      this.sprite('elder', -3, 2, 'elder'); this.sprite('merchant', 7, 4, 'merchant'); this.sprite('child', -7, 7, 'child', 0.85);
      for (let j = 0; j < 5; j++) { this.box(-3.8, 0.4, -7 + j * 1.5, 0.13, 0.85, 0.13, 0x8c8f71); this.box(-3.8, 0.5, -6.4 + j * 1.5, 0.1, 0.1, 1.5, 0x9c9a7b); }
    } else if (zone === 'forest') {
      this.river(0, -9.2, 32, 2.6); this.bridge(0, -9.2, 3.2, 3.1);
      for (let i = 0; i < 47; i++) { const x = (rng() - 0.5) * 30; const z = (rng() - 0.5) * 24;
        if (Math.abs(x) < 3 || (z > 0 && z < 4) || ZONES[zone].objects.some(o => Math.hypot(o.x - x, o.z - z) < 2.2) || ZONES[zone].encounters.some(e => Math.hypot(e.x - x, e.z - z) < 1.5)) continue;
        this.tree(x, z, 0.85 + rng() * 0.55, rng, i % 3 === 0);
      }
      for (const [x, z] of [[-11, -7], [11, -8], [-12, 7]]) { this.cylinder(x, 0.7, z, 0.45, 1.4, 0x745d4a); const mush = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), this.material(0x87b1b3, true)); mush.position.set(x, 1.4, z); this.root.add(mush); }
    } else if (zone === 'waterway') {
      for (const x of [-4, 4]) { this.river(x, 0, 2.2, 26); for (const z of [-6, 0, 6]) this.bridge(x, z, 3.2, 2.6);
        for (const [start, end] of [[-13, -7.4], [-4.6, -1.4], [1.4, 4.6], [7.4, 13]]) this.obstacles.push({ x, z: (start + end) / 2, w: 2, d: end - start });
      }
      for (const x of [-12, 12]) for (const z of [-8, -2, 5]) { this.cylinder(x, 2, z, 0.55, 4, 0x91a59c); this.box(x, 4.1, z, 1.5, 0.4, 1.5, 0xa5b1a2); this.obstacles.push({ x, z, w: 1.2, d: 1.2 }); }
      for (const x of [-9, 9]) { this.box(x, 4.9, -8.5, 4.6, 0.65, 1, 0x9ca99a); this.box(x - 2, 2.6, -8.5, 0.8, 5, 1, 0x82998d); this.box(x + 2, 2.6, -8.5, 0.8, 5, 1, 0x82998d); }
    } else {
      for (const x of [-12, 12]) for (const z of [-8, 0, 8]) { this.cylinder(x, 2.2, z, 0.65, 4.4, 0x919b9b); this.cylinder(x, 4.5, z, 0.9, 0.3, 0xb6b7a4); this.lamp(x, z, `spire-${x}-${z}`, true); this.obstacles.push({ x, z, w: 1.5, d: 1.5 }); }
      this.tower(7, -9, 9); this.cylinder(0, 0.15, -7, 3.5, 0.3, 0x969c98, 12);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.035, 6, 48), this.material(0xe6ce91, true)); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.34, -7); this.root.add(ring);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; this.box(Math.cos(a) * 2.9, 0.35, -7 + Math.sin(a) * 2.9, 0.12, 0.05, 0.3, 0xe1ca94, this.root, true); }
    }
    // Distant floating ridgelines and the moon form a continuous backdrop beyond the diorama.
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; const r = 46 + rng() * 15; const mountain = new THREE.Mesh(new THREE.ConeGeometry(8 + rng() * 9, 10 + rng() * 18, 5), this.material(i % 2 ? 0x39585a : 0x426162)); mountain.position.set(Math.cos(a) * r, -10, Math.sin(a) * r); this.root.add(mountain); }
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(3.5, 24, 16), new THREE.MeshBasicMaterial({ color: zone === 'tower' ? 0xb7a8c0 : 0xeadfc0, fog: false })); this.moon.position.set(-24, 21, -37); this.root.add(this.moon);
    if (zone !== 'village') {
      this.gate = new THREE.Group(); this.root.add(this.gate);
      for (const x of [-2, 2]) this.box(x, 1.7, -9.8, 0.55, 3.4, 0.7, zone === 'forest' ? 0x685846 : 0x8c9d90);
      this.box(0, 3.5, -9.8, 4.7, 0.4, 0.9, zone === 'forest' ? 0x776244 : 0xa6b09a);
      if (zone === 'forest') {
        const arch = new THREE.Mesh(new THREE.TorusGeometry(2, 0.22, 6, 14, Math.PI), this.material(0x6d8a62));
        arch.position.set(0, 3.5, -9.8); arch.castShadow = true; this.root.add(arch);
        this.box(0, 3.1, -9.8, 0.08, 0.6, 0.08, 0x474037);
        this.cylinder(0, 2.73, -9.8, 0.35, 0.5, 0xba884d, 8);
        this.box(0, 2.42, -9.8, 0.14, 0.2, 0.14, 0xffca77, this.root, true);
        for (const x of [-2, 2]) {
          this.box(x, 1.1, -9.35, 0.38, 0.09, 0.06, 0xf5c684, this.root, true);
          this.box(x, 1.37, -9.35, 0.24, 0.09, 0.06, 0x89ceae, this.root, true);
        }
      }
      for (let i = -3; i <= 3; i++) this.box(i * 0.48, 1.7, -9.8, 0.06, 3, 0.06, 0x8fdbd4, this.gate, true);
    }
    this.addGrass(rng, zone);
    for (const o of ZONES[zone].objects) {
      const start = this.root.children.length;
      if (o.kind === 'lore') { this.box(o.x, 0.45, o.z, 0.72, 0.9, 0.32, 0x939b87); this.box(o.x, 0.96, o.z, 0.82, 0.12, 0.42, 0xbbbd9e); for (let line = 0; line < 3; line++) this.box(o.x, 0.7 - line * 0.14, o.z + 0.17, 0.4 - line * 0.08, 0.025, 0.015, 0xd9ca98, this.root, true); }
      if (o.kind === 'lamp') this.lamp(o.x, o.z, o.id, true);
      if (o.kind === 'mechanism') {
        if (o.id.startsWith('beacon')) this.lamp(o.x, o.z, o.id);
        else { this.cylinder(o.x, 0.3, o.z, 0.7, 0.6, 0x929f92); const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.1, 6, 12), this.material(0xd8bb7e)); wheel.rotation.x = -Math.PI / 2; wheel.position.set(o.x, 0.8, o.z); this.root.add(wheel); const g = new THREE.Group(); g.position.set(o.x, 0, o.z); this.root.add(g); this.lamps.set(o.id, g); this.box(0, 0.8, 0, 0.9, 0.1, 0.12, 0xaec5be, g); }
      }
      if (o.kind === 'chest') { const g = new THREE.Group(); g.position.set(o.x, 0, o.z); this.root.add(g); this.box(0, 0.35, 0, 0.85, 0.6, 0.65, 0x876344, g); this.box(0, 0.7, 0, 0.9, 0.18, 0.7, 0xb58f59, g); this.box(0, 0.5, 0.36, 0.15, 0.2, 0.03, 0xe2c182, g); this.lamps.set(o.id, g); }
      if (o.kind === 'herb' || o.kind === 'memory') { const gem = new THREE.Mesh(new THREE.OctahedronGeometry(o.kind === 'herb' ? 0.18 : 0.3), this.material(o.kind === 'herb' ? 0xa8e0b1 : 0xb6e5ef, true)); gem.position.set(o.x, 0.5, o.z); this.root.add(gem); const g = new THREE.Group(); this.root.add(g); g.add(gem); this.lamps.set(o.id, g); }
      if (o.kind === 'exit' || o.kind === 'back') { const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.8, 32), new THREE.MeshBasicMaterial({ color: 0xf1d89c, transparent: true, opacity: 0.65, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(o.x, 0.12, o.z); this.root.add(ring); }
      const targets = this.root.children.slice(start);
      if (o.kind === 'clue' && this.lamps.has(o.id)) targets.push(this.lamps.get(o.id)!);
      for (const target of targets) target.userData.interactable = o.id;
    }
    this.player = this.sprite(state.leaderId, state.position.x, state.position.z, state.leaderId); this.companion = this.sprite(state.leaderId === 'lien' ? 'loren' : 'lien', state.position.x + 0.9, state.position.z + 0.8, state.leaderId === 'lien' ? 'loren' : 'lien');
    for (const e of ZONES[zone].encounters) if (!state.defeated.includes(e.id)) this.sprite(e.enemies[0], e.x, e.z, e.id, e.required ? 1.5 : 1.05);
    if (zone === 'tower') {
      for (const [i, o] of ZONES.tower.objects.filter(o => o.id.startsWith('dial')).entries()) {
        const start = new THREE.Vector3(o.x, 0.9, o.z); const end = new THREE.Vector3(0, 0.9, -7); const dir = end.clone().sub(start);
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, dir.length(), 6), this.material(0x9ee7e1, true));
        beam.position.copy(start).add(end).multiplyScalar(0.5); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); this.root.add(beam); this.beams.push({ mesh: beam, id: o.id, value: [2, 1, 3][i] });
      }
    }
    this.highlightRing = new THREE.Mesh(new THREE.RingGeometry(0.62,0.72,32),new THREE.MeshBasicMaterial({color:0xffdd95,transparent:true,opacity:0.8,side:THREE.DoubleSide,depthWrite:false})); this.highlightRing.rotation.x=-Math.PI/2; this.highlightRing.visible=false; this.root.add(this.highlightRing);
    this.addParticles(rng); this.sync(state); this.cameraFocus.set(0, 0, 0);
  }
  private addGrass(rng: () => number, zone: ZoneId) {
    const count = zone === 'tower' ? 180 : 1300; const geo = new THREE.ConeGeometry(0.08, 0.35, 3); const mat = this.material(zone === 'waterway' ? 0x85a691 : 0x8caa77);
    const mesh = new THREE.InstancedMesh(geo, mat, count); const dummy = new THREE.Object3D(); let n = 0;
    for (let i = 0; i < count * 2 && n < count; i++) { const x = (rng() - 0.5) * 31; const z = (rng() - 0.5) * 25;
      if (Math.abs(x) < 1.8 || z > 0.5 && z < 3.6 || this.obstacles.some(o => Math.abs(x - o.x) < o.w / 2 + 0.2 && Math.abs(z - o.z) < o.d / 2 + 0.2) || zone === 'village' && x > 10) continue;
      dummy.position.set(x, 0.15, z); dummy.rotation.y = rng() * 6.28; dummy.scale.setScalar(0.5 + rng() * 1.2); dummy.updateMatrix(); mesh.setMatrixAt(n++, dummy.matrix);
    } mesh.count = n; this.root.add(mesh);
    for (let i = 0; i < 100; i++) { const x = (rng() - 0.5) * 29; const z = (rng() - 0.5) * 24; if (Math.abs(x) < 2 || z > 0 && z < 4) continue; this.box(x, 0.19, z, 0.08, 0.13, 0.08, i % 3 ? 0xe3c68c : 0xbbc8c2); }
  }
  private addParticles(rng: () => number) {
    const positions = new Float32Array(120 * 3); for (let i = 0; i < 120; i++) { positions[i * 3] = (rng() - 0.5) * 32; positions[i * 3 + 1] = rng() * 6 + 0.5; positions[i * 3 + 2] = (rng() - 0.5) * 26; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(positions, 3)); this.particles = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffe5a0, size: 0.055, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); this.root.add(this.particles);
  }
  sync(state: GameState) {
    if (state.flags.includes('ending')) { this.scene.background = new THREE.Color('#748f8c'); this.scene.fog = new THREE.FogExp2('#748f8c', 0.012); this.sun.color.set(0xffdc9b); }
    if (this.gate) this.gate.visible = !puzzleSolved(state);
    this.beams.forEach(b => { b.mesh.visible = state.mechanisms[b.id] === b.value; });
    if (state.zone === 'waterway') this.water.forEach((w, i) => { w.position.y = state.mechanisms[`valve-${i + 1}`] ? -0.18 : -0.02; });
    for (const [id, g] of this.lamps) {
      if (id.startsWith('beacon')) g.children.forEach(child => { if (child instanceof THREE.PointLight) child.intensity = state.mechanisms[id] ? 6 : 0; if (child instanceof THREE.Mesh && (child.material as THREE.MeshStandardMaterial).emissiveIntensity > 1) child.visible = !!state.mechanisms[id]; });
      if (id.startsWith('dial')) g.rotation.y = (state.mechanisms[id] ?? 0) * Math.PI / 2;
      if (id.startsWith('valve')) g.rotation.y = (state.mechanisms[id] ?? 0) * Math.PI / 2;
      if (id.includes('chest') || id.startsWith('herb') || id === 'pendant' || id === 'loren-memory') g.visible = !state.flags.includes(id);
    }
    for (const id of state.defeated) { const s = this.sprites.get(id); if (s) { s.visible = false; s.userData.shadow.visible = false; } }
    this.configure(state.settings.quality, state.settings.reducedMotion);
  }
  setLeader(state: GameState) {
    if (this.battle) return;
    const leader = this.sprites.get(state.leaderId)!;
    const follower = this.sprites.get(state.leaderId === 'lien' ? 'loren' : 'lien')!;
    if (leader === this.player) return;
    const position = this.player.position.clone(); const trail = this.companion.position.clone();
    this.player = leader; this.companion = follower; leader.position.copy(position); follower.position.copy(trail);
    leader.material.map = this.texture(state.leaderId,0,this.direction); follower.material.map = this.texture(follower.userData.kind,0,this.direction);
  }
  highlight(id: string | undefined) {
    if (!this.highlightRing) return;
    const object = ZONES[this.zone].objects.find(o => o.id === id); this.highlightRing.visible = !!object;
    if (object) this.highlightRing.position.set(object.x,0.14,object.z);
  }
  configure(quality: 'high' | 'low', reduced: boolean) {
    if (this.quality !== quality) { this.quality = quality; this.renderer.shadowMap.enabled = quality === 'high'; }
    this.reduced = reduced; if (this.particles) this.particles.visible = !reduced && quality === 'high';
  }
  canWalk(x: number, z: number) { return Math.abs(x) < 14 && Math.abs(z) < 11 && !this.obstacles.some(o => Math.abs(x - o.x) < o.w / 2 + 0.25 && Math.abs(z - o.z) < o.d / 2 + 0.25); }
  showBattle(b: Battle) {
    this.battle = true; this.disposeGroup(this.actorRoot); this.sprites.clear(); this.combatFx = []; this.effects.forEach(e => e.sprite.material.map?.dispose()); this.effects = [];
    this.sprite('lien', -3.5, 3.8, 'lien', 1.4); this.sprite('loren', -1, 5.5, 'loren', 1.4);
    b.enemies.forEach((e, i) => this.sprite(e.template, 2.4 + i * 2, -0.5 - i * 1.7, e.id, e.template === 'eclipse' ? 3 : b.encounter.required ? 2.5 : 1.8));
  }
  syncBattle(b: Battle) {
    for (const a of [...b.heroes, ...b.enemies]) {
      const s = this.sprites.get(a.id); if (!s) continue;
      s.material.opacity = a.hp > 0 ? 1 : 0.2; s.userData.shadow.visible = a.hp > 0;
      if ('template' in a && a.template === 'guardian') {
        s.userData.charging = a.charging && !a.broken;
        if (!s.userData.attack) s.material.map = this.texture('guardian', s.userData.charging ? 2 : 0);
      }
    }
  }
  numberEffect(id: string, amount: number, healing = false) {
    const target = this.sprites.get(id); if (!target) return;
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64; const c = canvas.getContext('2d')!;
    c.font = 'bold 40px monospace'; c.textAlign = 'center'; c.strokeStyle = '#15303b'; c.lineWidth = 6; c.strokeText(`${healing ? '+' : ''}${amount}`, 64, 46); c.fillStyle = healing ? '#b8e6be' : '#ffe4a4'; c.fillText(`${healing ? '+' : ''}${amount}`, 64, 46);
    const texture = new THREE.CanvasTexture(canvas); texture.magFilter = THREE.NearestFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })); sprite.scale.set(1.8, 0.9, 1); sprite.position.copy(target.position).add(new THREE.Vector3(0, 1.2, 0)); sprite.renderOrder = 100;
    this.actorRoot.add(sprite); this.effects.push({ sprite, start: this.clock.elapsedTime, y: sprite.position.y });
  }
  private combatTexture(effect: CombatEffect) {
    const key = `combat-${effect}`; if (this.tex.has(key)) return this.tex.get(key)!;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64; const c = canvas.getContext('2d')!;
    const colors: Record<CombatEffect, string> = { slash: '#fff0bd', fire: '#ff9a46', star: '#a8e6ff', resonance: '#ffe18d', heal: '#b5ffd0' };
    c.shadowColor = colors[effect]; c.shadowBlur = 7;
    if (effect === 'slash') {
      c.lineWidth = 5; c.strokeStyle = '#e2b971'; c.beginPath(); c.arc(32, 32, 24, -1.5, 1.4); c.stroke();
      c.lineWidth = 2; c.strokeStyle = '#fff7dc'; c.beginPath(); c.arc(31, 32, 21, -1.5, 1.4); c.stroke();
      c.fillStyle = '#fff8db'; c.fillRect(20, 28, 24, 3); c.fillRect(30, 19, 3, 22);
    } else if (effect === 'fire') {
      for (const [x,y,w,h,color] of [[25,8,9,14,'#ffad4d'],[18,20,28,27,'#f17c3e'],[25,25,18,23,'#ffd773'],[29,33,9,13,'#fff3bc']] as const) { c.fillStyle = color; c.fillRect(x,y,w,h); }
    } else {
      c.fillStyle = colors[effect]; c.beginPath(); c.moveTo(32,4); c.lineTo(38,25); c.lineTo(60,32); c.lineTo(38,39); c.lineTo(32,60); c.lineTo(25,39); c.lineTo(4,32); c.lineTo(25,25); c.closePath(); c.fill();
      c.strokeStyle = colors[effect]; c.lineWidth = 1; c.beginPath(); c.arc(32,32,22,0,Math.PI*2); c.stroke(); c.fillStyle='#ffffff'; c.fillRect(29,29,6,6);
    }
    const texture = new THREE.CanvasTexture(canvas); texture.magFilter = texture.minFilter = THREE.NearestFilter; texture.colorSpace = THREE.SRGBColorSpace; this.tex.set(key, texture); return texture;
  }
  private spawnCombatEffect(from: THREE.Vector3, to: THREE.Vector3, effect: CombatEffect, phase: 'cast' | 'impact') {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.combatTexture(effect), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    sprite.renderOrder = 20; sprite.position.copy(from); this.actorRoot.add(sprite);
    this.combatFx.push({ sprite, from: from.clone(), to: to.clone(), effect, phase, start: this.clock.elapsedTime });
  }
  attackEffect(source: string | undefined, target: string, effect: CombatEffect) {
    const attacker = source ? this.sprites.get(source) : undefined; const victim = this.sprites.get(target); if (!victim) return;
    const from = (attacker ?? victim).position.clone().add(new THREE.Vector3(0,0.4,0)); const to = victim.position.clone().add(new THREE.Vector3(0,0.3,0));
    if (!this.reduced && attacker) attacker.userData.attack = { start: this.clock.elapsedTime, origin: attacker.position.clone(), destination: victim.position.clone(), effect };
    if (!this.reduced) this.spawnCombatEffect(from, to, effect, 'cast');
  }
  hitEffect(id: string, effect: CombatEffect) {
    const victim = this.sprites.get(id); if (!victim) return;
    const center = victim.position.clone().add(new THREE.Vector3(0,0.25,0)); this.spawnCombatEffect(center, center, effect, 'impact');
    if (effect !== 'heal' && !this.reduced) { victim.userData.flashUntil = this.clock.elapsedTime + 0.18; victim.userData.hit = { start: this.clock.elapsedTime, origin: victim.position.clone() }; }
  }
  project(position: Vec2, height = 1.4): { x: number; y: number } { const v = new THREE.Vector3(position.x, height, position.z).project(this.camera); return { x: (v.x + 1) * 50, y: (-v.y + 1) * 50 }; }
  pick(clientX: number, clientY: number): { position: Vec2; id?: string; building?: string } | undefined {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height || clientX < rect.left || clientX >= rect.right || clientY < rect.top || clientY >= rect.bottom) return;
    this.picker.setFromCamera(new THREE.Vector2(
      2 * (clientX - rect.left) / rect.width - 1,
      1 - 2 * (clientY - rect.top) / rect.height,
    ), this.camera);
    const scenery = this.root.children.filter(object =>
      object !== this.highlightRing && !(object instanceof THREE.InstancedMesh) && !(object instanceof THREE.Points),
    );
    const ground = this.picker.ray.intersectPlane(this.ground, new THREE.Vector3());
    const groundDistance = ground ? this.picker.ray.origin.distanceTo(ground) : Infinity;
    for (const hit of this.picker.intersectObjects([...scenery, ...this.sprites.values()])) {
      if (hit.distance > groundDistance + 1e-6) break;
      let object: THREE.Object3D | null = hit.object;
      let visible = true;
      let id: string | undefined;
      let building: string | undefined;
      while (object) {
        visible &&= object.visible;
        id ??= object.userData.interactable;
        building ??= object.userData.building;
        object = object.parent;
      }
      if (!visible) continue;
      if (hit.object instanceof THREE.Sprite && hit.uv) {
        const texture = hit.object.material.map!;
        const pixels = texture.image as HTMLCanvasElement;
        const x = THREE.MathUtils.clamp(Math.floor(hit.uv.x * pixels.width), 0, pixels.width - 1);
        const y = THREE.MathUtils.clamp(Math.floor((1 - hit.uv.y) * pixels.height), 0, pixels.height - 1);
        if (pixels.getContext('2d')!.getImageData(x, y, 1, 1).data[3] < 26) continue;
        id = [...this.sprites].find(([, sprite]) => sprite === hit.object)?.[0];
      }
      if (id || building || !ground) return { position: { x: hit.point.x, z: hit.point.z }, id, building };
      return { position: { x: ground.x, z: ground.z } };
    }
    if (ground) return { position: { x: ground.x, z: ground.z } };
  }
  screenDirection(dx: number, dz: number) { const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0); const forward = new THREE.Vector3().subVectors(new THREE.Vector3(), this.camera.position); forward.y = 0; forward.normalize(); return { x: right.x * dx - forward.x * dz, z: right.z * dx - forward.z * dz }; }
  render(state: GameState, moving: boolean, mode: string, dx = 0, dz = 0, atBridge = false) {
    if (window.devicePixelRatio !== this.deviceRatio) this.resize();
    const aspect = this.viewport.x / this.viewport.y;
    if (mode !== 'explore' && this.highlightRing) this.highlightRing.visible = false;
    if (this.highlightRing) this.highlightRing.scale.setScalar(this.reduced ? 1 : 1 + Math.sin(this.clock.elapsedTime * 3)*0.06);
    const t = this.clock.getElapsedTime(); this.bokeh.enabled = ['title', 'ending'].includes(mode) && !this.reduced; const dt = Math.min(0.05, t - this.lastTime); this.lastTime = t;
    if (!this.battle && this.player) {
      this.player.position.set(state.position.x, 0.98 + (!this.reduced && moving ? Math.sin(t * 14) * 0.035 : 0), state.position.z);
      if (moving) { this.direction = Math.abs(dx) > Math.abs(dz) ? dx > 0 ? 1 : 3 : dz < 0 ? 2 : 0; }
      const frame = moving && !this.reduced ? Math.floor(t * 8) % 4 : 0;
      this.player.material.map = this.texture(state.leaderId, frame, this.direction);
      const desired = new THREE.Vector3(state.position.x + 0.8, 0.98, state.position.z + 0.9); this.companion.position.lerp(desired, 1 - Math.exp(-dt * 5));
      this.companion.material.map = this.texture(state.leaderId === 'lien' ? 'loren' : 'lien', frame, this.direction);
      for (const s of [this.player, this.companion]) s.userData.shadow.position.set(s.position.x, 0.07, s.position.z);
    }
    for (const [id, s] of this.sprites) {
      if (id === 'forest-elite') s.material.map = this.texture('guardian', atBridge ? 2 : 0);
      if (id !== 'lien' && id !== 'loren' && !['elder', 'merchant', 'child'].includes(id) && !this.reduced && !s.userData.attack && !s.userData.hit) s.position.y = s.userData.restPosition.y + Math.sin(t * 2 + s.position.x) * 0.035;
      const attack = s.userData.attack;
      if (attack) {
        const p = Math.min(1, (t - attack.start) / 0.58); const arc = Math.sin(p * Math.PI);
        s.position.copy(attack.origin);
        if (attack.effect === 'slash') { const direction = attack.destination.clone().sub(attack.origin); direction.y = 0; s.position.addScaledVector(direction.normalize(), arc * 0.9); s.material.rotation = arc * -0.14; }
        else s.position.y += arc * 0.18;
        s.material.map = this.texture(s.userData.kind, p < 0.8 ? 4 : 0, 1);
        if (p >= 1) { s.position.copy(attack.origin); s.material.rotation = 0; s.material.map = this.texture(s.userData.kind, s.userData.charging ? 2 : 0); delete s.userData.attack; }
      }
      const hit = s.userData.hit;
      if (hit) {
        const p = Math.min(1, (t - hit.start) / 0.35); s.position.copy(hit.origin); s.position.x += Math.sin(p * Math.PI * 3) * (1-p) * 0.2; s.material.rotation = Math.sin(p * Math.PI) * 0.12;
        if (p >= 1) { s.position.copy(hit.origin); s.material.rotation = 0; delete s.userData.hit; }
      }
      if (this.battle) s.userData.shadow.position.set(s.position.x, 0.07, s.position.z);
      s.material.color.set(s.userData.flashUntil > t ? 0xffa979 : 0xffffff);
    }
    this.combatFx = this.combatFx.filter(fx => {
      const duration = fx.phase === 'cast' ? 0.24 : this.reduced ? 0.06 : 0.38; const p = Math.min(1, (t - fx.start) / duration);
      if (p >= 1) { fx.sprite.removeFromParent(); fx.sprite.material.dispose(); return false; }
      fx.sprite.position.lerpVectors(fx.from, fx.to, fx.phase === 'cast' ? p : 1);
      const size = this.reduced ? 0.85 : fx.phase === 'cast' ? fx.effect === 'slash' ? 1.4 : 0.7 + p * 0.5 : (fx.effect === 'resonance' ? 3.6 : 2) * (0.5 + p);
      fx.sprite.scale.setScalar(size); fx.sprite.material.opacity = fx.phase === 'cast' ? Math.sin(p*Math.PI) : 1-p;
      if (!this.reduced) fx.sprite.material.rotation = fx.effect === 'slash' ? -0.7 + p*1.4 : p*0.6;
      return true;
    });
    this.effects = this.effects.filter(effect => {
      const age = t - effect.start; if (age > 0.9) { effect.sprite.removeFromParent(); effect.sprite.material.map?.dispose(); effect.sprite.material.dispose(); return false; }
      effect.sprite.position.y = effect.y + (this.reduced ? 0 : age * 1.6); effect.sprite.material.opacity = Math.min(1, (0.9 - age) * 3); return true;
    });
    if (this.particles && !this.reduced) this.particles.rotation.y = Math.sin(t * 0.04) * 0.08;
    this.water.forEach(w => { (w.material as THREE.MeshStandardMaterial).opacity = 0.8 + Math.sin(t * 0.8) * 0.05; });
    const follow = THREE.MathUtils.smoothstep(aspect, 0.75, 1.55);
    this.target.set(atBridge || this.battle ? 0 : mode === 'title' ? -3.5 * follow : state.position.x * (1 - 0.55 * follow), 0, atBridge ? -8.4 : this.battle ? 0 : mode === 'title' ? -1 : state.position.z * (1 - 0.65 * follow));
    this.cameraFocus.lerp(this.target, this.reduced ? 1 : 1 - Math.exp(-dt * (atBridge ? 3.8 : 2.8)));
    const height = atBridge ? Math.max(8.2, 4 / aspect) : this.battle ? Math.max(9.2, 8.5 / aspect) : mode === 'title' ? 13.6 : Math.max(11.8, 8 / aspect);
    const shift = this.battle ? height * 0.22 * (1 - follow) : 0;
    this.camera.left = -height * aspect; this.camera.right = height * aspect;
    this.camera.top = height - shift; this.camera.bottom = -height - shift;
    this.camera.updateProjectionMatrix();
    this.camera.position.copy(this.cameraFocus).add(new THREE.Vector3(atBridge ? 11 : 24, 28, 34)); this.camera.lookAt(this.cameraFocus); this.camera.updateMatrixWorld();
    if (this.quality === 'high') this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }
  resize(immediate = false) {
    const { width, height } = this.renderer.domElement.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = this.deviceRatio = window.devicePixelRatio;
    this.viewport.set(width, height);
    clearTimeout(this.resizeTimer);
    const resizeBuffers = () => {
      const pixelsWide = Math.floor(width * dpr);
      const pixelsHigh = Math.floor(height * dpr);
      const canvas = this.renderer.domElement;
      if (!immediate && canvas.width === pixelsWide && canvas.height === pixelsHigh && this.renderer.getPixelRatio() === dpr) return;
      this.renderer.setDrawingBufferSize(width, height, dpr);
      this.composer.setSize(pixelsWide, pixelsHigh);
    };
    if (immediate) resizeBuffers();
    else this.resizeTimer = setTimeout(resizeBuffers, 150);
  }
  private disposeGroup(g: THREE.Group) { g.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.Points) o.geometry.dispose(); if (o instanceof THREE.Sprite) o.material.dispose();
      if (o instanceof THREE.Mesh && !Array.isArray(o.material) && ![...this.materials.values()].includes(o.material as THREE.MeshStandardMaterial)) o.material.dispose(); if (o instanceof THREE.Points) (o.material as THREE.Material).dispose(); }); g.clear(); }
}
const ZONE_ORDER_INDEX: Record<ZoneId, number> = { village: 0, forest: 1, waterway: 2, tower: 3 };
