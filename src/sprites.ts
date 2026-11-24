import * as THREE from 'three';
import { ENEMIES } from './data';
import { ECLIPSE_FORM, TRAVELER_ART } from './character-art';
import { enemyPose } from './enemy-motion';
import lienAtlas from './assets/lien-sprites.png';
import lorenAtlas from './assets/loren-sprites.png';

const heroAtlasUrls = { lien: lienAtlas, loren: lorenAtlas };
const heroAtlases: Partial<Record<keyof typeof heroAtlasUrls, HTMLImageElement>> = {};
const heroCell = { width: 52, height: 64, count: 4 };
export async function loadHeroAtlases() {
  await Promise.allSettled(Object.entries(heroAtlasUrls).map(async ([id, url]) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.naturalWidth === heroCell.width * heroCell.count && image.naturalHeight === heroCell.height * heroCell.count) {
      heroAtlases[id as keyof typeof heroAtlasUrls] = image;
    }
  }));
}

export function pixelTexture(kind: string, frame = 0, direction = 0, portrait = false): THREE.CanvasTexture {
  const atlas = heroAtlases[kind as keyof typeof heroAtlasUrls];
  if (atlas) {
    const canvas = document.createElement('canvas');
    const { width, height } = heroCell;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d')!;
    context.imageSmoothingEnabled = false;
    if (portrait) {
      context.drawImage(atlas, 8, 3, 36, 39, 2, 0, 48, 52);
    } else {
      const column = frame === 4 ? 3 : [0, 1, 0, 2][frame];
      context.drawImage(atlas, column * width, direction * height, width, height, 0, 0, width, height);
    }
    return nearestTexture(canvas);
  }
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 60;
  const context = canvas.getContext('2d')!;
  const npc = TRAVELER_ART[kind];
  if (npc || kind === 'lien' || kind === 'loren') {
    if (direction === 3) { context.translate(48, 0); context.scale(-1, 1); }
    drawTraveler(context, npc ?? (kind === 'lien' ? mage : knight), frame, direction);
  } else {
    if (direction === 3) { context.translate(48, 0); context.scale(-1, 1); }
    drawEnemy(context, kind, frame);
  }
  return nearestTexture(canvas);
}

function nearestTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const ink = '#1c2030';
const gold = '#d4a76b';
const cream = '#ffe1a0';
const copper = '#8a594a';

function mix(a: string, b: string, weight: number) {
  const source = parseInt(a.slice(1), 16), target = parseInt(b.slice(1), 16);
  const channels = [16, 8, 0].map(shift => {
    const from = (source >> shift) & 255, to = (target >> shift) & 255;
    return Math.round(from + (to - from) * weight).toString(16).padStart(2, '0');
  });
  return '#' + channels.join('');
}

function pixelBrush(context: CanvasRenderingContext2D) {
  const rect = (color: string, x: number, y: number, width: number, height: number) => {
    context.fillStyle = color;
    context.fillRect(x, y, width, height);
  };
  // Sample the center of each pixel to keep the silhouettes crisp at every zoom.
  const poly = (color: string, ...points: number[]) => {
    context.fillStyle = color;
    const ys = points.filter((_, index) => index % 2 === 1);
    for (let y = Math.min(...ys); y < Math.max(...ys); y++) {
      const row = y + 0.5;
      const edges: number[] = [];
      for (let i = 0, j = points.length - 2; i < points.length; j = i, i += 2) {
        const from = points[j + 1], to = points[i + 1];
        if ((from > row) !== (to > row)) edges.push(points[j] + (row - from) * (points[i] - points[j]) / (to - from));
      }
      edges.sort((a, b) => a - b);
      for (let i = 0; i < edges.length; i += 2) {
        const left = Math.ceil(edges[i] - 0.5);
        context.fillRect(left, y, Math.ceil(edges[i + 1] - 0.5) - left, 1);
      }
    }
  };
  return { rect, poly };
}

type Traveler = (typeof TRAVELER_ART)[string];
const mage: Traveler = { name: '莉恩', coat: '#4d8885', trim: gold, hair: '#795447', skin: '#edbc96', head: 'hat', dress: 'vest', prop: 'lantern' };
const knight: Traveler = { name: '洛恩', coat: '#7b8eaa', trim: gold, hair: '#c2b6ae', skin: '#edc1a3', head: 'loose', dress: 'cape', prop: 'sword' };

function drawTraveler(context: CanvasRenderingContext2D, art: Traveler, frame: number, direction: number) {
  const { rect, poly } = pixelBrush(context);
  const { coat, trim, hair, skin, head, dress, prop } = art;
  const shade = mix(coat, ink, .48), light = mix(coat, '#f8dcb1', .33);
  const hairShade = mix(hair, ink, .48);
  const rear = direction === 2, side = direction === 1 || direction === 3;
  const step = frame === 1 ? 2 : frame === 3 ? -2 : 0;

  poly(ink, 12,43, 33,43, 34,53-step, 36,55-step, 36,59-step, 25,59-step, 23,51, 21,59+step, 10,59+step, 10,55+step);
  rect('#574647', 12, 53 + step, 8, 3);
  rect('#796055', 25, 53 - step, 8, 3);
  poly(ink, 13,26, 29,24, 36,29, 39,41, 34,44, 36,50, 29,53, 14,53, 8,50, 11,42, 6,43, 5,39, 8,30);
  poly(shade, 12,28, 31,27, 35,31, 36,41, 32,41, 34,49, 27,51, 14,51, 10,49, 13,40, 8,41, 7,38);
  poly(coat, 12,29, 29,28, 30,39, 28,49, 12,49, 14,39, 10,37);
  poly(light, 12,30, 22,29, 19,34, 14,35, 11,40, 8,39);
  if (dress === 'shawl') {
    poly(ink, 10,27, 32,26, 37,31, 40,40, 34,42, 25,35, 18,37, 11,43, 5,41, 7,34);
    poly(trim, 11,28, 32,28, 36,32, 38,39, 34,40, 24,34, 17,36, 10,41, 7,39);
    poly(mix(trim, ink, .26), 20,29, 29,29, 34,32, 37,38, 34,39, 27,35, 22,34);
    rect(cream, 20, 33, 3, 2);
  } else if (dress === 'apron') {
    poly(shade, 14,31, 30,31, 30,43, 33,51, 12,52, 14,43);
    poly(trim, 16,32, 28,32, 26,41, 30,49, 14,49, 18,41);
    poly(mix(trim, ink, .35), 20,41, 28,41, 28,46, 21,47);
    rect(light, 15, 49, 13, 2);
  } else if (dress === 'uniform' || dress === 'vest') {
    poly(shade, 18,29, 24,32, 30,28, 31,39, 29,48, 14,48, 14,39);
    poly(trim, 14,29, 21,32, 21,43, 19,45, 19,35, 15,33);
    rect(trim, 24, 35, 2, 2);
    rect(trim, 24, 41, 2, 2);
    rect(light, 13, 46, 17, 1);
  } else if (dress === 'cape') {
    poly(ink, 8,31, 15,26, 29,26, 37,30, 39,51, 30,55, 25,47, 23,37, 19,49, 12,54, 6,51);
    poly(shade, 9,32, 16,28, 29,28, 35,31, 37,50, 30,53, 27,46, 23,34, 19,46, 12,52, 8,50);
    poly(coat, 13,30, 24,28, 22,36, 17,46, 10,50);
    poly(trim, 15,28, 22,33, 28,32, 33,28, 35,31, 27,36, 21,36, 13,31);
    rect(cream, 23, 34, 3, 3);
  } else {
    poly(ink, 13,29, 16,26, 30,41, 31,45, 19,46, 12,39);
    poly(trim, 14,30, 17,29, 29,41, 28,43, 20,44, 14,39);
    rect(mix(trim, ink, .24), 18, 39, 9, 2);
  }
  rect(skin, 8, 39, 4, 3);
  rect(skin, 33, 38, 3, 4);

  poly(ink, 11,11, 16,6, 28,5, 34,9, 37,17, 34,24, 29,29, 18,29, 12,25, 10,19);
  poly(hairShade, 12,12, 17,7, 28,7, 34,11, 35,21, 31,26, 17,27, 12,23);
  poly(skin, 16,15, 31,13, 34,18, 32,23, 27,27, 20,26, 16,23);
  poly(mix(skin, '#fff2d6', .33), 17,16, 29,15, 29,20, 25,24, 19,23, 17,21);
  poly(hair, 13,13, 17,8, 27,8, 34,12, 32,16, 27,16, 25,13, 21,17, 15,19);
  rect(mix(hair, '#f4d7ad', .35), 17, 10, 10, 2);
  rect(ink, side ? 27 : 18, 19, 2, 2);
  if (!side) rect(ink, 28, 19, 2, 2);
  rect(copper, 23, 24, 4, 1);

  if (rear) {
    poly(hair, 13,14, 33,13, 34,20, 30,26, 19,27, 14,23);
    rect(hairShade, 16, 23, 16, 2);
    rect(coat, 18, 32, 10, 12);
    rect(light, 20, 35, 2, 7);
  }
  if (head === 'bun') {
    poly(ink, 7,13, 7,7, 11,3, 18,3, 21,8, 17,15, 12,16);
    poly(hair, 9,8, 12,5, 17,5, 19,8, 15,13, 10,13);
    rect(trim, 13, 13, 5, 2);
    if (dress === 'uniform' && !rear) {
      rect(ink, 16, 18, 7, 4); rect(ink, 26, 18, 6, 4);
      rect(trim, 22, 19, 4, 1);
      rect('#f3e6cf', 17, 19, 4, 2); rect('#f3e6cf', 27, 19, 4, 2);
    }
  } else if (head === 'hood') {
    poly(ink, 7,27, 7,16, 10,8, 20,2, 30,3, 37,10, 39,20, 35,28, 28,29, 33,21, 31,14, 21,13, 15,18, 17,25, 20,28, 13,30);
    poly(coat, 9,26, 9,16, 12,9, 20,4, 29,5, 35,11, 37,20, 34,26, 30,27, 35,21, 32,12, 20,11, 13,17, 15,26, 18,28, 13,28);
    rect(light, 19, 5, 9, 2);
  } else if (head === 'cap' || head === 'hat') {
    const brim = head === 'hat' ? 5 : 0;
    poly(ink, 8-brim,15, 11,8, 16,5, 29,4, 34,8, 37+brim,14, 40+brim,16, 35,18, 9-brim,18);
    poly(shade, 10-brim,15, 13,9, 17,6, 29,6, 34,10, 36+brim,15, 39+brim,16, 11-brim,17);
    poly(coat, 13,13, 16,8, 28,7, 33,11, 30,14, 15,16);
    rect(light, 17, 8, 11, 2); rect(trim, 11, 14, 22, 2);
    if (!rear) rect(cream, 22, 11, 4, 3);
  } else if (head === 'wrap' || head === 'kerchief') {
    poly(ink, 8,21, 9,13, 14,6, 24,3, 34,7, 37,14, 36,18, 31,15, 15,16, 15,26, 10,29);
    poly(trim, 10,21, 11,13, 16,7, 24,5, 32,8, 35,14, 32,14, 26,11, 16,15, 14,26, 11,27);
    poly(mix(trim, coat, .55), 12,12, 18,7, 25,6, 32,9, 33,11, 26,9, 17,12);
    if (head === 'kerchief') rect(cream, 11, 21, 4, 3);
  } else {
    poly(hairShade, 13,16, 16,17, 16,25, 19,30, 12,29, 10,25);
    rect(hair, 12, 18, 2, 8);
    if (head === 'braids') {
      for (const x of [9, 32]) {
        poly(ink, x,18, x+5,20, x+5,27, x+7,31, x+4,34, x,31, x-2,26);
        rect(hair, x, 22, 4, 7); rect(trim, x, 29, 5, 2);
      }
    } else if (head === 'goggles') {
      rect(ink, 12, 10, 24, 7);
      for (const x of [13, 25]) {
        rect(gold, x, 10, 9, 6);
        rect('#527981', x + 1, 11, 7, 4);
        rect('#b4e4da', x + 2, 11, 3, 2);
      }
    }
  }

  if (prop === 'lantern') {
    const y = frame === 4 ? 33 : 44;
    rect(ink, 35, y - 7, 4, 10);
    poly(ink, 31,y+1, 35,y-2, 41,y-2, 44,y+1, 44,y+10, 41,y+12, 33,y+12, 31,y+9);
    rect(gold, 33, y + 1, 9, 8);
    rect(cream, 34, y + 2, 5, 5);
    rect(copper, 33, y + 9, 9, 2);
    rect(copper, 39, y + 1, 1, 8);
  } else if (prop === 'pack') {
    poly(ink, 31,36, 40,36, 46,41, 46,52, 41,56, 31,53, 28,46);
    poly('#755043', 31,38, 39,38, 44,42, 44,51, 40,54, 32,52, 30,46);
    rect(gold, 32, 41, 11, 2); rect(trim, 36, 39, 2, 12);
    rect(cream, 35, 43, 4, 3);
  } else if (prop === 'book' || prop === 'letter' || prop === 'ticket') {
    const y = prop === 'book' ? 38 : 40;
    poly(ink, 29,y, 40,y-2, 45,y, 44,y+10, 34,y+13, 28,y+9);
    poly(prop === 'book' ? '#655367' : '#e4ca9d', 30,y+1, 40,y-1, 43,y+1, 42,y+9, 34,y+11, 29,y+8);
    rect(prop === 'book' ? '#e7d8ba' : copper, 34, y+7, 8, 2);
    rect(prop === 'letter' ? '#aa6261' : gold, 35, y+3, 4, 3);
    rect(skin, 29, y, 4, 3);
  } else if (prop === 'boat') {
    poly(ink, 27,44, 32,46, 37,39, 43,46, 46,45, 43,53, 32,54);
    poly('#fff0d0', 29,46, 33,48, 37,42, 42,48, 44,47, 42,51, 33,52);
    rect('#cda986', 35, 49, 6, 2);
  } else if (prop === 'reed' || prop === 'staff') {
    const x = prop === 'staff' ? 39 : 36;
    rect(ink, x, 27, 5, 31); rect(copper, x+1, 29, 2, 29);
    rect(gold, x-2, 26, 8, 5);
    if (prop === 'reed') {
      rect(cream, x-2, 22, 2, 8); rect(gold, x+3, 20, 2, 10);
    } else rect('#a9d8d4', x, 27, 3, 3);
    rect(skin, x-2, 39, 5, 3);
  } else if (prop === 'flask' || prop === 'bowl') {
    poly(ink, 30,42, 43,40, 46,45, 43,52, 35,54, 30,50);
    poly(prop === 'flask' ? '#888260' : '#b58463', 31,43, 43,42, 44,45, 42,50, 36,52, 32,49);
    rect(prop === 'flask' ? gold : '#f1cc9f', 32, 44, 11, 2);
    if (prop === 'flask') rect(cream, 36, 39, 5, 4);
  } else if (prop === 'sword') {
    const x = frame === 4 ? 39 : 35;
    poly(ink, x,28, x+4,22, x+6,27, x+5,52, x+2,55, x,49);
    rect('#a7b6bf', x+2, 28, 2, 22); rect(gold, x-1, 44, 7, 3);
  }
}

function drawEnemy(context: CanvasRenderingContext2D, kind: string, frame: number) {
  const { rect, poly } = pixelBrush(context);
  const { color, shape } = ENEMIES[kind] ?? ENEMIES.slime;
  const shade = mix(color, ink, .58), light = mix(color, '#fff0ce', .58);
  const ready = frame === enemyPose.ready, strike = frame === enemyPose.strike, follow = frame === enemyPose.follow;
  const idle = frame === enemyPose.idle, hit = frame === enemyPose.hit, broken = frame === enemyPose.broken;
  const glow = broken ? '#ab8b69' : ready ? '#fff4bd' : cream;
  const wing = ready ? -7 : strike ? 9 : follow ? -4 : hit ? 11 : broken ? 13 : idle ? 4 : 0;
  if (drawBoss(context, kind, frame)) return;
  if (shape === 'slime') {
    poly(ink, 3,46, 8,38, 12,29, 19,24, 31,25, 38,31, 41,42, 46,48, 44,55, 37,58, 11,58, 4,55);
    poly(shade, 5,48, 12,39, 15,29, 22,26, 32,27, 39,34, 40,43, 44,49, 42,54, 35,56, 12,56, 6,53);
    poly(color, 9,48, 15,39, 16,31, 23,28, 31,29, 36,34, 38,46, 34,51, 18,53, 11,51);
    poly(light, 16,37, 19,31, 25,30, 27,32, 21,34, 19,39);
    const eye = ready || hit || broken ? 2 : 4;
    rect(ink, 22, 46 - eye, 3, eye);
    rect(ink, 32, 45 - eye, 3, eye);
    if (strike || follow) {
      rect(color, 4, strike ? 28 : 37, 3, 3);
      rect(light, 41, strike ? 34 : 43, 3, 2);
      rect(shade, 37, 52, 5, 2);
    }
    rect(light, 9, 47, 4, 2);
    rect(color, 35, 53, 5, 2);
    rect(light, 27, 48, 4, 1);
    rect('#e8f4d3', idle ? 20 : 23, 33, 2, 2);
    rect(shade, 32, 36, 2, 2); rect(light, 33, 35, 2, 1);
    rect('#a6e3c2', 6, 42, 2, 2);
  } else if (shape === 'moth' || shape === 'raven') {
    const moth = shape === 'moth';
    for (const flip of [false, true]) {
      context.save();
      if (flip) { context.translate(48, 0); context.scale(-1, 1); }
      context.translate(strike && !moth ? 4 : 0, moth ? Math.min(wing, 7) : wing);
      if (moth) {
        poly(ink, 2,13, 11,14, 17,20, 23,32, 21,44, 16,52, 9,51, 5,46, 7,36, 2,28);
        poly(shade, 4,15, 11,16, 18,24, 22,34, 19,44, 15,50, 10,49, 7,45, 10,36, 5,28);
        poly(color, 5,17, 12,19, 18,28, 20,34, 13,36, 7,28);
        poly(light, 7,20, 12,23, 15,29, 12,31, 9,28);
        poly(color, 11,38, 17,37, 18,43, 14,47, 9,45);
        rect(light, 13, 41, 3, 3);
        rect(cream, 9, 21, 2, 2);
        poly(shade, 12,25, 15,26, 16,29, 13,32, 11,29, 11,27);
        rect(light, 13, 27, 2, 2);
      } else {
        poly(ink, 1,12, 10,16, 20,26, 24,40, 17,43, 12,39, 7,40, 8,35, 4,34, 5,29, 2,25);
        poly(shade, 3,15, 10,18, 19,27, 22,38, 16,40, 13,36, 8,38, 10,33, 6,32, 8,28, 4,24);
        poly('#696788', 3,17, 11,21, 18,29, 20,35, 13,31, 12,28, 8,27);
        poly(light, 5,18, 10,21, 15,27, 9,24);
      }
      context.restore();
    }
    poly(ink, 15,17, 20,21, 27,20, 33,15, 30,26, 32,34, 28,47, 24,55, 20,49, 18,41, 17,28);
    poly(shade, 19,25, 25,22, 29,26, 30,35, 26,47, 24,51, 20,44, 19,35);
    poly(color, 20,29, 27,26, 28,34, 25,43, 22,43);
    rect(light, 20, 30, 3, 3);
    rect(glow, 26, 29, 3, 3);
    if (moth && (ready || strike || follow)) {
      for (const [x, y] of [[3, 23], [8, 46], [36, 44], [42, 30]]) rect(ready ? light : cream, x, Math.round(y - wing / 2), 2, 2);
    }
    if (!moth) {
      poly(ink, 20,44, 29,41, 32,53, 28,58, 24,53, 20,59, 16,55);
      poly(shade, 21,45, 28,44, 29,54, 25,50, 20,56, 18,54);
      poly('#ae8c69', 25,33, 35,31, 31,36, 27,38);
    }
  } else if (shape === 'wisp') {
    poly(ink, 28,5, 28,13, 35,19, 35,27, 42,24, 40,38, 34,44, 24,48, 16,56, 16,45, 9,40, 7,30, 12,22, 15,31, 16,22, 22,17, 24,10);
    poly(shade, 26,11, 28,16, 33,21, 33,29, 40,28, 37,38, 31,44, 22,47, 18,52, 18,44, 12,39, 9,30, 12,26, 16,35, 18,23);
    poly(color, 26,17, 31,23, 30,31, 36,31, 32,39, 25,44, 18,43, 13,37, 13,31, 18,37, 21,26);
    poly(light, 26,24, 29,29, 30,34, 26,40, 21,38, 20,34);
    poly(broken ? '#6b9da9' : '#efffed', 26,29, 30,34, 26,39, 21,34);
    rect('#97e6e1', 24, 34, strike ? 5 : 3, 2);
    const plume = strike ? -7 : ready ? 4 : follow ? -4 : hit || broken ? 5 : idle ? -2 : 0;
    rect(color, 9, 14 + plume, 3, 4);
    rect(light, 35, 14 + plume, strike ? 4 : 2, 2);
    rect(color, 33, 49 - plume, 2, 3);
    if (strike) rect('#efffed', 38, 20, 3, 3);
  } else if (shape === 'root') {
    const guardian = kind === 'guardian';
    const moss = guardian ? '#788862' : color;
    context.save();
    const arms = ready ? -7 : strike ? -4 : follow ? 3 : hit || broken ? 6 : idle ? -2 : 0;
    context.translate(0, arms);
    poly(ink, 7,23, 13,23, 16,30, 13,43, 7,46, 2,43, 3,33);
    poly('#634738', 8,25, 13,26, 12,41, 6,43, 4,41, 5,34);
    poly(ink, 34,23, 40,24, 44,32, 47,40, 43,45, 37,42, 33,34);
    poly('#795744', 35,25, 39,26, 42,33, 45,40, 42,43, 39,41, 36,33);
    rect(moss, 5, 35, 3, 4);
    rect(moss, 39, 36, 4, 3);
    context.restore();
    poly(ink, 10,29, 29,20, 37,26, 39,42, 35,47, 39,53, 37,58, 27,58, 24,52, 19,52, 15,58, 5,58, 6,53, 12,47);
    poly('#765544', 12,30, 29,23, 35,28, 36,41, 32,47, 36,54, 35,56, 28,56, 25,49, 18,50, 14,56, 8,56, 10,53, 14,47);
    poly('#aa7c55', 16,29, 28,26, 31,31, 28,36, 24,36, 23,44, 18,48, 19,40, 14,37);
    poly('#4c3534', 26,36, 31,33, 32,38, 28,46, 26,48);
    rect(glow, 16, 33, 5, 3);
    rect(glow, 27, 32, 5, 3);
    rect('#443237', 21, 39, 5, 2);
    rect(moss, 8, 54, 6, 2);
    rect(moss, 30, 54, 5, 2);
    if (guardian) {
      poly(ink, 8,5, 12,3, 15,13, 18,10, 21,20, 27,20, 31,7, 35,2, 40,2, 39,10, 45,6, 47,11, 40,16, 35,24, 13,27, 7,16, 2,13, 2,8, 8,11);
      poly('#916748', 10,6, 13,15, 17,15, 21,21, 29,21, 33,8, 38,4, 36,13, 44,9, 45,11, 38,15, 34,22, 22,25, 14,25, 9,16, 4,12, 4,10, 10,14);
      rect(moss, 11, 17, 7, 3);
      rect(moss, 24, 21, 9, 3);
      poly(ink, 23,21, 28,26, 26,31, 20,30, 18,25);
      poly(ready || strike ? '#fff4bd' : broken ? '#775e52' : '#c58d52', 23,23, 26,26, 24,29, 20,27);
      if (strike || follow) {
        poly('#ae8056', 0,43, 10,45, 16,49, 13,52, 7,49, 0,49);
        rect('#d9b275', 2, 45, 7, 2);
      }
      rect(glow, 22, 41, 3, 3);
      rect('#b6a475', 5, 16, 7, 2); rect('#b6a475', 34, 14, 7, 2);
      rect('#dcb478', 7, 17, 2, 4); rect('#dcb478', 36, 16, 2, 4);
    } else {
      poly(ink, 5,20, 8,14, 13,12, 17,5, 27,4, 31,10, 38,12, 43,20, 38,25, 30,27, 10,27);
      poly(moss, 7,20, 11,15, 16,15, 19,7, 26,6, 30,12, 37,14, 41,20, 36,23, 28,25, 13,25);
      poly(light, 9,19, 17,16, 20,9, 25,8, 27,12, 23,17, 18,20, 12,21);
      rect(shade, 31, 18, 7, 3);
      rect(light, 24, 21, 5, 2);
      rect('#718761', 14, 17, 4, 4); rect('#718761', 21, 11, 3, 4);
      rect('#e2d39d', 29, 18, 2, 2); rect('#e2d39d', 11, 21, 2, 2);
    }
  } else {
    const raised = ready ? -7 : strike ? -5 : follow ? 3 : broken ? 6 : hit ? 2 : idle ? -2 : 0;
    poly(ink, 14,18, 31,16, 39,24, 39,38, 35,44, 39,57, 27,59, 24,49, 20,50, 18,59, 8,58, 10,44, 6,36, 8,25);
    poly(shade, 13,23, 31,19, 37,26, 35,42, 32,45, 36,55, 28,56, 25,47, 18,47, 16,56, 11,56, 13,45, 9,36, 10,27);
    poly(color, 13,24, 29,22, 34,27, 30,38, 23,43, 15,39, 12,33);
    poly(light, 14,26, 24,25, 21,29, 16,31, 14,35, 12,33);
    poly(ink, 15,11, 18,6, 28,5, 34,9, 36,19, 31,24, 18,24, 13,20);
    poly(shade, 16,11, 20,7, 28,7, 33,11, 34,18, 30,22, 18,22, 15,19);
    poly(color, 17,11, 22,8, 29,9, 31,13, 17,16);
    rect(ink, 17, 15, 15, 4);
    rect(glow, 18, 16, 11, 1);
    rect(cream, 21, 39, 4, 3);
    rect(light, 13, 50, 4, 2);
    rect(color, 28, 49, 4, 2);
    rect('#9b6251', 25, 26, 7, 3);
    rect('#a46d54', 12, 33, 3, 4);
    rect('#c18b6f', 15, 11, 5, 3);
    poly(ink, 41,14+raised, 46,8+raised, 48,13+raised, 45,47+raised, 40,50+raised, 39,44+raised);
    poly(light, 43,16+raised, 46,11+raised, 46,21+raised, 43,39+raised, 41,41+raised);
    rect(copper, 35, 39 + raised, 12, 4);
    rect(gold, 37, 39 + raised, 8, 2);
    context.translate(0, ready ? -4 : hit || broken ? 4 : 0);
    poly(ink, 3,27, 16,26, 18,29, 17,42, 12,48, 4,46, 2,40);
    poly('#715d58', 4,28, 15,27, 16,30, 15,41, 11,46, 5,44, 3,39);
    poly(shade, 5,30, 14,30, 14,40, 10,44, 6,42);
    rect('#b18b72', 7, 33, 5, 2); rect('#b18b72', 8, 35, 2, 5);
  }
}

function drawBoss(context: CanvasRenderingContext2D, kind: string, frame: number) {
  const { rect, poly } = pixelBrush(context);
  const strike = frame === enemyPose.strike, ready = frame === enemyPose.ready;
  const follow = frame === enemyPose.follow, idle = frame === enemyPose.idle;
  const hit = frame === enemyPose.hit, broken = frame === enemyPose.broken;
  switch (kind) {
    case 'warden': {
      const patina = '#386977', pale = '#83c1c0', deep = '#25414e';
      poly(ink, 14,6, 30,4, 36,17, 43,23, 43,34, 38,42, 38,51, 44,56, 40,59, 28,57, 24,50, 17,58, 7,59, 4,54, 10,45, 9,32, 4,26, 8,19, 13,16);
      poly(patina, 14,19, 33,17, 40,24, 41,33, 34,43, 36,52, 40,55, 39,56, 30,55, 24,47, 16,55, 7,57, 7,54, 13,44, 13,33, 7,26, 10,22);
      poly(pale, 10,24, 15,20, 23,23, 20,30, 13,31);
      poly(deep, 22,25, 35,23, 38,30, 33,39, 26,42, 20,38);
      poly('#52888b', 17,8, 29,6, 34,13, 34,20, 23,24, 15,20, 14,14);
      poly(pale, 16,14, 18,9, 28,7, 30,11, 25,13, 19,16);
      rect(ink, 18, 16, 13, 4); rect('#c0ede1', 20, 17, 9, 1);
      for (let i = 0; i < 3; i++) rect(i === 0 && strike ? cream : '#75c4bb', 23 + i, 29 + i*4, 10 - i*2, 2);
      const y = ready ? 9 : strike ? 3 : follow ? 12 : broken ? 22 : hit ? 20 : idle ? 16 : 18;
      rect(ink, 40, y+7, 4, 32); rect('#739195', 41, y+9, 2, 28);
      poly(ink, 34,y+1, 38,y+4, 39,y+8, 40,y, 43,y-3, 45,y+7, 47,y+3, 47,y+12, 44,y+16, 39,y+16, 35,y+11);
      poly(pale, 36,y+5, 40,y+11, 42,y+1, 44,y+11, 46,y+8, 45,y+13, 40,y+14, 37,y+11);
      poly('#568778', 6,51, 12,46, 13,52, 9,55);
      return true;
    }
    case 'railkeeper': {
      const iron = '#354453', rust = '#9e624c';
      poly(ink, 10,16, 18,11, 17,4, 31,4, 30,11, 39,16, 40,34, 47,42, 44,52, 38,55, 39,59, 26,59, 23,53, 20,59, 7,59, 8,52, 1,48, 2,39, 9,34);
      poly(iron, 12,18, 19,13, 29,13, 37,18, 37,35, 43,42, 42,49, 35,52, 36,57, 28,57, 25,50, 20,50, 18,57, 10,57, 12,51, 4,47, 5,40, 12,35);
      rect(rust, 19, 6, 10, 5); rect(gold, 18, 5, 12, 2);
      poly('#66808b', 13,20, 18,16, 31,16, 36,21, 35,31, 14,32);
      rect(ink, 14, 23, 21, 6); rect('#bcddcd', 16, 24, 7, 2); rect('#bcddcd', 26, 24, 7, 2);
      poly(rust, 11,35, 17,31, 33,31, 39,36, 38,47, 32,50, 16,50, 10,47);
      poly('#744146', 10,41, 19,38, 36,39, 39,45, 34,48, 15,48, 9,46);
      rect(broken || hit ? '#8c674c' : strike ? '#ffe7a3' : ready ? '#ffc078' : '#edaf62', 21, 33, 8, 7);
      rect(broken ? '#aa895f' : cream, 23, 34, strike ? 5 : 4, 3);
      if (idle || ready || strike || follow) {
        const smoke = ready ? 1 : strike ? 5 : follow ? 9 : 3;
        rect('#657a82', 14 - smoke, 8, 7, 3);
        rect('#adbbb5', 11 - smoke, 4, 7, 3);
        if (strike || follow) rect('#a6a6a0', 4, 13, 6, 2);
      }
      for (const x of [13, 19, 25, 31, 37]) rect(gold, x, 43, 2, 6);
      rect(rust, 6, 41, 3, 5); rect(rust, 40, 41, 3, 5);
      return true;
    }
    case 'echo-rook': {
      const feather = '#768da6', ivory = '#e5d1b5';
      const rise = ready ? -6 : strike ? 9 : follow ? -3 : broken || hit ? 11 : idle ? 4 : 0;
      poly(ink, 1,18+rise, 12,23+rise, 19,29, 27,18, 37,14, 47,8+rise, 44,23, 39,33, 44,32, 40,40, 32,46, 31,52, 24,58, 19,55, 17,47, 12,44, 9,39, 6,37);
      poly('#455472', 3,20+rise, 15,26+rise, 21,32, 28,20, 38,16, 44,11+rise, 42,24, 36,35, 41,35, 38,39, 30,44, 29,51, 24,55, 21,53, 19,46, 14,44, 12,39, 8,37);
      poly(feather, 2,21+rise, 12,25+rise, 23,34, 20,38, 15,35, 17,41, 13,40, 10,35, 7,33);
      poly(feather, 25,28, 33,21, 43,13+rise, 41,21, 37,27, 32,29, 38,30, 35,35, 28,38);
      poly(ivory, 18,18, 23,13, 30,14, 33,20, 29,29, 24,33, 20,28);
      poly(ink, 19,18, 28,17, 29,20, 27,22, 20,21);
      rect(cream, 21, 18, 3, 2);
      poly(gold, 20,22, 26,22, 25,27, 21,29, 22,25, 18,25);
      rect(ivory, 13, 31, 4, 2); rect(ivory, 35, 22, 4, 2);
      rect(gold, 19, 46, 4, 3); rect(gold, 26, 47, 4, 3);
      rect('#aac9d2', 4, 10, 3, 2); rect('#aac9d2', 37, 7, 2, 3);
      return true;
    }
    case 'pagekeeper': {
      const cover = '#665873', paper = '#e6dbc2';
      poly(ink, 12,8, 37,8, 42,13, 43,22, 48,26, 45,39, 40,44, 38,55, 34,59, 24,57, 17,59, 10,56, 8,45, 3,43, 0,33, 4,22, 9,19);
      poly('#43545e', 13,10, 36,10, 40,14, 40,41, 36,54, 33,56, 25,54, 17,56, 12,54, 11,43, 6,42, 3,33, 6,24, 11,22);
      poly(cover, 9,15, 34,12, 39,16, 37,44, 11,43);
      poly(paper, 13,17, 24,16, 24,38, 13,39);
      poly('#b8afae', 26,16, 36,15, 35,38, 26,39);
      for (const y of [22, 27, 32]) { rect('#8c7881', 15, y, 6, 1); rect('#786a81', 28, y, 5, 1); }
      poly(ink, 20,22, 29,21, 31,28, 26,33, 20,30);
      rect(gold, 22, 24, 6, 5); rect(strike ? '#fff7ce' : '#b18357', 24, 26, 2, 2);
      poly(paper, 2,32, 7,24, 10,24, 10,39, 5,40);
      poly(paper, 39,22, 46,25, 44,34, 39,38);
      rect(cover, 15, 45, 7, 8); rect(cover, 28, 45, 7, 8);
      rect(gold, 9, 12, 4, 4); rect(gold, 34, 39, 4, 4);
      if (idle || ready || strike || follow) {
        const pageY = ready ? 18 : strike ? 7 : follow ? 3 : 23;
        poly(paper, 3,pageY, 9,pageY-2, 11,pageY+5, 5,pageY+7);
        poly('#b8afae', 41,pageY-2, 46,pageY, 44,pageY+8, 39,pageY+6);
      }
      if (broken) rect(cover, 21, 24, 8, 5);
      return true;
    }
    case 'oath-echo': {
      const echo = '#6e6f9e', pale = '#b9b6de', vapor = '#465072';
      poly(vapor, 18,20, 32,18, 42,29, 45,41, 40,49, 33,48, 28,57, 22,58, 26,51, 16,54, 8,52, 14,46, 6,46, 9,37);
      poly('#32364f', 15,11, 18,5, 28,4, 35,10, 34,20, 41,25, 39,38, 32,41, 27,36, 21,43, 17,38, 10,41, 9,32, 5,28, 12,22);
      poly(echo, 17,11, 20,7, 28,6, 33,11, 31,21, 38,26, 36,36, 32,37, 27,32, 21,40, 17,35, 12,38, 12,32, 8,28, 14,24);
      poly(pale, 17,11, 21,7, 28,7, 31,10, 26,13, 21,12, 17,15);
      rect(ink, 18, 16, 13, 4); rect('#e6dcff', 20, 17, 8, 1);
      poly(pale, 14,24, 22,24, 28,22, 25,31, 21,34, 18,29, 12,30);
      const y = ready ? 27 : strike ? 35 : follow ? 44 : broken ? 48 : idle ? 34 : 36;
      poly('#ccbde0', 3,y+3, 30,y-4, 44,y-9, 46,y-7, 30,y+1, 7,y+8);
      rect('#767eac', 29, y-4, 4, 9);
      rect(pale, 7, idle || strike ? 47 : 51, 4, 2);
      rect(echo, 34, ready ? 48 : 53, 5, 2);
      rect(vapor, strike || follow ? 14 : 20, 57, 3, 2);
      return true;
    }
    case 'eclipse':
    case ECLIPSE_FORM: {
      const awakened = kind === ECLIPSE_FORM;
      const armor = awakened ? '#927064' : '#56627e';
      const rim = awakened ? '#ec9860' : '#aca9c6';
      const inner = broken ? '#a38271' : awakened ? '#ffdb93' : '#bbcbe4';
      const robe = awakened ? '#594151' : '#3b3f5a';
      if (awakened) {
        poly('#503348', 3,46, 3,23, 8,11, 16,4, 32,4, 42,13, 46,24, 45,45, 39,49, 41,24, 36,13, 29,8, 18,8, 11,15, 7,26, 8,49);
        poly(rim, 5,24, 10,12, 17,5, 31,5, 40,13, 44,24, 43,32, 40,24, 36,15, 29,9, 18,9, 12,15, 8,26);
        rect(inner, idle ? 23 : 19, 5, 9, 2);
        rect(inner, 7, strike ? 25 : 20, 2, 6);
        rect(inner, 40, ready ? 18 : 21, 2, 6);
        if (ready || strike || follow) {
          rect(rim, 3, 17, 3, 3); rect(inner, 45, 17, 2, 3);
          rect(rim, 44, 39, 2, 4);
        }
      }
      poly(ink, 14,22, 15,13, 20,9, 28,9, 34,13, 35,22, 41,26, 39,38, 43,55, 33,59, 23,56, 13,59, 4,56, 9,38, 6,28);
      poly(robe, 9,30, 18,24, 32,23, 38,28, 36,40, 41,54, 33,57, 23,54, 13,57, 6,55, 12,40);
      poly(armor, 13,27, 23,23, 35,25, 38,31, 32,39, 26,42, 18,39, 13,34, 9,35, 9,30);
      poly(rim, 10,30, 15,26, 22,25, 20,30, 16,33, 11,33);
      poly(rim, 17,14, 21,11, 27,11, 33,15, 33,21, 28,26, 21,26, 16,21);
      poly('#292a3e', 17,18, 32,16, 32,21, 27,25, 21,25, 17,21);
      rect(inner, 20, 19, 9, 1);
      poly(ink, 24,29, 29,34, 24,39, 19,34);
      poly(inner, 24,31, 27,34, 24,37, 21,34);
      if (awakened) {
        for (const x of [12, 31]) {
          poly(rim, x,40, x+3,43, x+1,49, x+3,54, x,52, x-1,47);
          rect(inner, x, 45, 1, 3);
        }
        rect(inner, 1, 37, 2, 3); rect(rim, 45, 36, 2, 2); rect(inner, 36, 9, 2, 2);
      }
      const x = strike ? 39 : 40;
      const y = ready ? 15 : strike ? 22 : follow ? 33 : broken ? 36 : hit ? 34 : idle ? 28 : 30;
      poly(ink, x,y+3, x+4,y-8, x+7,y-4, x+5,y+20, x+1,y+23, x-1,y+19);
      poly(rim, x+1,y+4, x+5,y-5, x+5,y+2, x+3,y+18, x+1,y+20);
      rect(inner, x+1, y+2, 2, 12); rect(gold, x-4, y+17, 10, 2);
      return true;
    }
    default:
      return false;
  }
}
