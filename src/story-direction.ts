import type { HeroId, Vec2 } from './data';

export type StoryTone = 'night' | 'memory' | 'warm' | 'signal' | 'rupture' | 'shadow' | 'dawn';
export type StorySound = 'distant' | 'recall' | 'reply' | 'fracture' | 'hush' | 'sunrise';
type Cue = {
  focus?: 'speaker' | 'party' | 'landmark';
  wide?: boolean;
  tone?: StoryTone;
  effect?: 'echo' | 'wave' | 'burst' | 'dawn';
  ghost?: 'past-loren' | 'bridge-echo' | 'village-echo';
  gesture?: HeroId;
  sound?: StorySound;
};
export type StoryShot = Cue & { landmark?: Vec2; speaker?: string; actor?: string };

// Keys refer to the spoken page, so the player controls the timing of each reveal.
const cues: Record<string, Record<number, Cue>> = {
  P00: {
    0: { focus: 'landmark', wide: true, tone: 'night', sound: 'distant' },
    2: { tone: 'night' },
    3: { focus: 'party', tone: 'warm' },
  },
  'C1-05': {
    0: { focus: 'landmark', wide: true, tone: 'shadow', sound: 'distant' },
    3: { focus: 'party', tone: 'warm', gesture: 'lien' },
    4: { focus: 'landmark', tone: 'warm', effect: 'burst', sound: 'reply' },
  },
  'C2-03': {
    0: { focus: 'landmark', tone: 'memory', effect: 'echo', sound: 'recall' },
    1: { focus: 'landmark', tone: 'memory', effect: 'echo', ghost: 'past-loren' },
    2: { tone: 'shadow', sound: 'hush' },
    5: { focus: 'landmark', tone: 'memory', effect: 'echo', ghost: 'past-loren' },
  },
  'C4-05': {
    0: { focus: 'landmark', tone: 'signal', effect: 'wave', sound: 'reply' },
    1: { focus: 'party', tone: 'signal', effect: 'wave' },
    2: { tone: 'night', effect: 'wave', sound: 'hush' },
    3: { focus: 'landmark', wide: true, tone: 'rupture', effect: 'burst', sound: 'fracture' },
    4: { focus: 'landmark', wide: true, tone: 'rupture', effect: 'wave' },
  },
  'C4-06': {
    0: { tone: 'rupture', effect: 'echo', gesture: 'loren' },
    1: { focus: 'party', tone: 'rupture', effect: 'echo' },
    2: { tone: 'rupture', effect: 'echo' },
    3: { focus: 'landmark', tone: 'night', sound: 'hush' },
  },
  'C6-03': {
    0: { focus: 'landmark', wide: true, tone: 'night' },
    1: { tone: 'night' },
    5: { focus: 'landmark', wide: true, tone: 'warm', effect: 'wave', sound: 'reply' },
  },
  'C7-02': {
    0: { focus: 'landmark', tone: 'warm', effect: 'echo', ghost: 'bridge-echo', sound: 'recall' },
    1: { tone: 'warm', effect: 'echo', ghost: 'bridge-echo' },
    2: { focus: 'landmark', tone: 'shadow', effect: 'echo', ghost: 'bridge-echo', sound: 'hush' },
    3: { focus: 'party', tone: 'memory' },
    4: { tone: 'memory' },
  },
  'C7-03': {
    0: { focus: 'landmark', tone: 'warm', effect: 'echo', ghost: 'village-echo', sound: 'recall' },
    1: { tone: 'warm', effect: 'echo' },
    2: { focus: 'landmark', tone: 'shadow', effect: 'echo', sound: 'hush' },
    4: { focus: 'party', tone: 'memory' },
  },
  'C7-04': {
    0: { focus: 'landmark', tone: 'memory', effect: 'echo', ghost: 'past-loren', sound: 'recall' },
    1: { tone: 'night' },
  },
  'C8-03': {
    0: { focus: 'landmark', wide: true, tone: 'shadow', effect: 'wave', sound: 'distant' },
    2: { tone: 'shadow' },
    3: { focus: 'party', tone: 'warm' },
    4: { tone: 'shadow' },
    6: { tone: 'shadow' },
    7: { focus: 'party', tone: 'warm' },
  },
  'C8-04': {
    0: { focus: 'landmark', tone: 'rupture', effect: 'burst', sound: 'fracture' },
    3: { tone: 'shadow', effect: 'echo' },
    5: { tone: 'shadow', effect: 'echo', sound: 'hush' },
    6: { focus: 'party', tone: 'warm', gesture: 'lien' },
  },
  'C8-06': {
    0: { focus: 'party', tone: 'shadow', sound: 'hush' },
    1: { focus: 'party', tone: 'warm', gesture: 'loren' },
    2: { focus: 'landmark', tone: 'dawn', effect: 'dawn', gesture: 'lien', sound: 'sunrise' },
    3: { focus: 'landmark', wide: true, tone: 'dawn', effect: 'dawn' },
    4: { focus: 'party', wide: true, tone: 'dawn', effect: 'dawn' },
  },
  E06: {
    4: { focus: 'landmark', wide: true, tone: 'dawn', effect: 'wave', sound: 'distant' },
  },
};

export function storyShot(scene: string, page: number, speaker?: string, landmark?: Vec2, actor?: string): StoryShot {
  return {
    focus: 'speaker',
    tone: scene.startsWith('E') ? 'warm' : undefined,
    speaker, landmark, actor,
    ...cues[scene]?.[page],
  };
}
