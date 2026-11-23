import type { ZoneId } from './data';

export const lantern = {
  brass: 0xc69a60,
  bright: 0xffce83,
  starlight: 0x93dfdc,
  ink: 0x1b2635,
};

export const areaArt = {
  village:  { mist: 0x253845, ground: 0x547367, paving: 0xa8a08a, detail: 0x9ca772, sky: 0xb4ccda, grass: true },
  forest:   { mist: 0x142e37, ground: 0x3e6558, paving: 0x858a73, detail: 0x80a178, sky: 0x95c7cc, grass: true },
  waterway: { mist: 0x23364c, ground: 0x536c76, paving: 0x969c95, detail: 0x7fabb0, sky: 0xa2c7e0, grass: false },
  station:  { mist: 0x322b3e, ground: 0x74666a, paving: 0x9d8b7c, detail: 0xc29473, sky: 0xbcc0d7, grass: false },
  highland: { mist: 0x293752, ground: 0x64768a, paving: 0xa0a3a3, detail: 0xc0b895, sky: 0xb6cce6, grass: true },
  archive:  { mist: 0x2d2e46, ground: 0x756b80, paving: 0xb2a7a1, detail: 0xbea98f, sky: 0xc0cce2, grass: false },
  corridor: { mist: 0x262340, ground: 0x514b6a, paving: 0x817494, detail: 0xb6a2d4, sky: 0xbdafe4, grass: false },
  tower:    { mist: 0x22283e, ground: 0x5c6177, paving: 0x9494a5, detail: 0xb8b2d6, sky: 0xb6bce5, grass: false },
} satisfies Record<ZoneId, { mist: number; ground: number; paving: number; detail: number; sky: number; grass: boolean }>;
