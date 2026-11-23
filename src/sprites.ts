import * as THREE from 'three';
import { ENEMIES } from './data';
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
  const npc = NPC_ART[kind];
  if (npc || kind === 'lien' || kind === 'loren') {
    if (direction === 3) { context.translate(48, 0); context.scale(-1, 1); }
    drawTraveler(context, npc ?? (kind === 'lien' ? mage : knight), frame, direction);
  } else {
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

type Traveler = {
  coat: string;
  hair: string;
  skin: string;
  head: 'hood' | 'cap' | 'bun' | 'wrap' | 'loose';
  prop: 'lantern' | 'pack' | 'book' | 'sword' | 'none';
};
const mage: Traveler = { coat: '#4d8885', hair: '#795447', skin: '#edbc96', head: 'hood', prop: 'lantern' };
const knight: Traveler = { coat: '#7b8eaa', hair: '#c2b6ae', skin: '#edc1a3', head: 'loose', prop: 'sword' };
export const NPC_ART: Record<string, Traveler> = {
  elder: { coat: '#7b687e', hair: '#d6ccb9', skin: '#e6b38d', head: 'bun', prop: 'lantern' },
  merchant: { coat: '#557f76', hair: '#574137', skin: '#c68c68', head: 'cap', prop: 'pack' },
  child: { coat: '#b9784d', hair: '#8a574c', skin: '#efbe97', head: 'bun', prop: 'none' },
  'station-mother': { coat: '#9d6b7a', hair: '#684a49', skin: '#d5a27d', head: 'wrap', prop: 'pack' },
  'station-chief': { coat: '#666c96', hair: '#5a4d59', skin: '#e4b891', head: 'cap', prop: 'book' },
  'highland-workshop': { coat: '#b36f4f', hair: '#493845', skin: '#c78e71', head: 'wrap', prop: 'pack' },
  'highland-injured': { coat: '#5d85a1', hair: '#63524e', skin: '#deb295', head: 'loose', prop: 'none' },
  'archive-host': { coat: '#a08f68', hair: '#a5998d', skin: '#e5b595', head: 'bun', prop: 'book' },
  'archive-reader-1': { coat: '#906c90', hair: '#63495b', skin: '#dbab92', head: 'hood', prop: 'none' },
  'archive-reader-2': { coat: '#997052', hair: '#554541', skin: '#bc8468', head: 'cap', prop: 'book' },
  'archive-reader-3': { coat: '#647c99', hair: '#94796b', skin: '#e4bb95', head: 'wrap', prop: 'none' },
  'village-neighbor': { coat: '#6c846b', hair: '#584b52', skin: '#d4a17d', head: 'loose', prop: 'pack' },
};

function drawTraveler(context: CanvasRenderingContext2D, art: Traveler, frame: number, direction: number) {
  const { rect, poly } = pixelBrush(context);
  const { coat, hair, skin, head, prop } = art;
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
  poly(gold, 16,29, 23,32, 28,29, 26,35, 20,36, 15,33);
  rect(cream, 20, 33, 3, 2);
  rect(copper, 13, 41, 16, 3);
  rect(gold, side ? 26 : 20, 41, 4, 3);
  rect(shade, 16, 46, 2, 4);
  rect(light, 12, 48, 8, 1);
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
    poly(ink, 8,13, 8,8, 11,5, 17,5, 19,10, 17,14, 12,16);
    poly(hair, 9,9, 12,6, 16,7, 17,10, 14,13, 10,13);
    rect(gold, 13, 13, 4, 2);
  } else if (head === 'cap' || head === 'hood' || head === 'wrap') {
    poly(ink, 8,15, 11,8, 16,5, 29,4, 34,8, 37,14, 40,16, 35,18, 9,18);
    poly(shade, 10,15, 13,9, 17,6, 29,6, 34,10, 36,15, 39,16, 11,17);
    poly(coat, 13,13, 16,8, 28,7, 33,11, 30,14, 15,16);
    rect(light, 17, 8, 11, 2);
    rect(gold, 11, 15, 22, 1);
    if (head === 'hood') {
      poly(shade, 12,16, 16,16, 16,23, 21,27, 17,29, 12,25);
      rect(gold, 15, 25, 2, 2);
    } else if (head === 'wrap') {
      rect(light, 12, 12, 22, 2);
    }
  } else {
    poly(hairShade, 13,16, 16,17, 16,25, 19,30, 12,29, 10,25);
    rect(hair, 12, 18, 2, 8);
  }

  if (prop === 'lantern') {
    const y = frame === 4 ? 33 : 44;
    rect(ink, 35, y - 7, 4, 10);
    poly(ink, 31,y+1, 35,y-2, 41,y-2, 44,y+1, 44,y+10, 41,y+12, 33,y+12, 31,y+9);
    rect(gold, 33, y + 1, 9, 8);
    rect(cream, 34, y + 2, 5, 5);
    rect(copper, 33, y + 9, 9, 2);
    rect(copper, 39, y + 1, 1, 8);
  } else if (prop === 'pack' || prop === 'book') {
    poly(ink, 30,37, 41,38, 43,42, 43,50, 39,53, 31,51, 29,46);
    poly(copper, 31,38, 39,39, 41,42, 41,50, 38,51, 31,49);
    rect(prop === 'book' ? '#e1caa1' : gold, 32, 42, 8, 3);
    rect(skin, 31, 38, 4, 3);
  } else if (prop === 'sword') {
    const x = frame === 4 ? 39 : 35;
    poly(ink, x,28, x+4,22, x+6,27, x+5,52, x+2,55, x,49);
    rect('#a7b6bf', x + 2, 28, 2, 22);
    rect(gold, x - 1, 44, 7, 3);
  }
}

function drawEnemy(context: CanvasRenderingContext2D, kind: string, frame: number) {
  const { rect, poly } = pixelBrush(context);
  const { color, shape } = ENEMIES[kind] ?? ENEMIES.slime;
  const shade = mix(color, ink, .58), light = mix(color, '#fff0ce', .58);
  const glow = kind === 'guardian' && frame === 2 ? '#fff4bd' : cream;
  const wing = frame % 2 ? 3 : 0;
  if (shape === 'slime') {
    poly(ink, 3,46, 8,38, 12,29, 19,24, 31,25, 38,31, 41,42, 46,48, 44,55, 37,58, 11,58, 4,55);
    poly(shade, 5,48, 12,39, 15,29, 22,26, 32,27, 39,34, 40,43, 44,49, 42,54, 35,56, 12,56, 6,53);
    poly(color, 9,48, 15,39, 16,31, 23,28, 31,29, 36,34, 38,46, 34,51, 18,53, 11,51);
    poly(light, 16,37, 19,31, 25,30, 27,32, 21,34, 19,39);
    rect(ink, 22, 42, 3, 4);
    rect(ink, 32, 41, 3, 4);
    rect(light, 9, 47, 4, 2);
    rect(color, 35, 53, 5, 2);
    rect(light, 27, 48, 4, 1);
  } else if (shape === 'moth' || shape === 'raven') {
    const moth = shape === 'moth';
    for (const flip of [false, true]) {
      context.save();
      if (flip) { context.translate(48, 0); context.scale(-1, 1); }
      context.translate(0, wing);
      if (moth) {
        poly(ink, 2,13, 11,14, 17,20, 23,32, 21,44, 16,52, 9,51, 5,46, 7,36, 2,28);
        poly(shade, 4,15, 11,16, 18,24, 22,34, 19,44, 15,50, 10,49, 7,45, 10,36, 5,28);
        poly(color, 5,17, 12,19, 18,28, 20,34, 13,36, 7,28);
        poly(light, 7,20, 12,23, 15,29, 12,31, 9,28);
        poly(color, 11,38, 17,37, 18,43, 14,47, 9,45);
        rect(light, 13, 41, 3, 3);
        rect(cream, 9, 21, 2, 2);
      } else {
        poly(ink, 1,12, 10,16, 20,26, 24,40, 17,43, 12,39, 7,40, 8,35, 4,34, 5,29, 2,25);
        poly(shade, 3,15, 10,18, 19,27, 22,38, 16,40, 13,36, 8,38, 10,33, 6,32, 8,28, 4,24);
        poly(color, 4,17, 11,21, 18,29, 20,35, 13,31, 12,28, 8,27);
        poly(light, 5,18, 10,21, 15,27, 9,24);
      }
      context.restore();
    }
    poly(ink, 15,17, 20,21, 27,20, 33,15, 30,26, 32,34, 28,47, 24,55, 20,49, 18,41, 17,28);
    poly(shade, 19,25, 25,22, 29,26, 30,35, 26,47, 24,51, 20,44, 19,35);
    poly(color, 20,29, 27,26, 28,34, 25,43, 22,43);
    rect(light, 20, 30, 3, 3);
    rect(cream, 26, 29, 3, 3);
    if (!moth) poly(gold, 25,34, 34,33, 30,38, 26,38);
  } else if (shape === 'wisp') {
    poly(ink, 28,5, 28,13, 35,19, 35,27, 42,24, 40,38, 34,44, 24,48, 16,56, 16,45, 9,40, 7,30, 12,22, 15,31, 16,22, 22,17, 24,10);
    poly(shade, 26,11, 28,16, 33,21, 33,29, 40,28, 37,38, 31,44, 22,47, 18,52, 18,44, 12,39, 9,30, 12,26, 16,35, 18,23);
    poly(color, 26,17, 31,23, 30,31, 36,31, 32,39, 25,44, 18,43, 13,37, 13,31, 18,37, 21,26);
    poly(light, 26,24, 29,29, 30,34, 26,40, 21,38, 20,34);
    rect('#f5fff5', 23, 32, 5, 3);
    rect(color, 9, 14, 3, 4);
    rect(light, 35, 14, 2, 2);
    rect(color, 33, 49, 2, 3);
  } else if (shape === 'root') {
    const guardian = kind === 'guardian';
    const moss = guardian ? '#788862' : color;
    context.save();
    if (frame === 4 || (guardian && frame === 2)) context.translate(0, -5);
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
      rect(glow, 22, 41, 3, 3);
    } else {
      poly(ink, 5,20, 8,14, 13,12, 17,5, 27,4, 31,10, 38,12, 43,20, 38,25, 30,27, 10,27);
      poly(moss, 7,20, 11,15, 16,15, 19,7, 26,6, 30,12, 37,14, 41,20, 36,23, 28,25, 13,25);
      poly(light, 9,19, 17,16, 20,9, 25,8, 27,12, 23,17, 18,20, 12,21);
      rect(shade, 31, 18, 7, 3);
      rect(light, 24, 21, 5, 2);
    }
  } else {
    const raised = frame === 4 ? -9 : 0;
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
    if (kind === 'eclipse' || kind === 'warden' || kind === 'oath-echo') {
      poly(ink, 11,2, 20,9, 29,8, 39,1, 38,12, 33,15, 30,13, 19,14, 14,14);
      poly(color, 13,4, 21,10, 29,10, 37,4, 36,11, 32,13, 29,12, 19,13, 15,12);
      rect(cream, 23, 10, 3, 3);
    } else if (kind === 'railkeeper' || kind === 'pagekeeper') {
      poly(ink, 12,10, 16,4, 29,3, 35,7, 38,13, 32,15, 14,14);
      poly(color, 14,10, 18,5, 28,5, 33,8, 35,12, 29,13, 15,12);
      rect(cream, 23, 7, 3, 3);
    }
    poly(ink, 41,14+raised, 46,8+raised, 48,13+raised, 45,47+raised, 40,50+raised, 39,44+raised);
    poly(light, 43,16+raised, 46,11+raised, 46,21+raised, 43,39+raised, 41,41+raised);
    rect(copper, 35, 39 + raised, 12, 4);
    rect(gold, 37, 39 + raised, 8, 2);
    poly(ink, 5,27, 14,26, 19,30, 17,40, 12,47, 6,42, 3,34);
    poly(shade, 6,29, 14,28, 17,31, 15,39, 12,44, 7,40, 5,34);
    poly(color, 7,30, 14,29, 15,32, 13,39, 10,41, 7,37);
    poly(light, 11,31, 13,34, 11,38, 9,34);
  }
}
