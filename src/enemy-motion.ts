import { ECLIPSE_FORM } from './character-art';

export type EnemyMove = 'strike' | 'heavy' | 'sweep';
export const enemyPose = { rest: 0, idle: 1, ready: 2, follow: 3, strike: 4, hit: 5, broken: 6 } as const;
export const enemyAttackTiming = { impact: 220, duration: 580 };

type Pose = { advance?: number; lift?: number; tilt?: number; squash?: number };
type EnemyMotion = {
  idle: { period: number; lift?: number; tilt?: number; squash?: number };
  ready: Pose;
  strike: Pose;
  follow: Pose;
  recoil: number;
};

// Advance is along the line to the target. Squash is relative to the standing pose.
export const enemyMotions: Record<string, EnemyMotion> = {
  slime: {
    idle: { period: 1.3, squash: .12 }, ready: { advance: -.16, squash: -.26 },
    strike: { advance: 1.02, lift: .37, squash: .22 }, follow: { advance: .39, squash: -.32 }, recoil: .42,
  },
  moth: {
    idle: { period: .42, lift: .16 }, ready: { advance: -.10, lift: .21, tilt: -.08 },
    strike: { advance: .22, lift: .48, tilt: .11 }, follow: { advance: -.17, lift: .24 }, recoil: .56,
  },
  root: {
    idle: { period: 1.7, tilt: .065 }, ready: { advance: -.17, tilt: -.16 },
    strike: { advance: .68, tilt: .25 }, follow: { advance: .39, tilt: .16, squash: -.05 }, recoil: .23,
  },
  wisp: {
    idle: { period: 1.42, lift: .19, squash: .09 }, ready: { advance: -.20, lift: .12, squash: -.16 },
    strike: { advance: .62, lift: .48, squash: .27 }, follow: { lift: .15, squash: -.09 }, recoil: .47,
  },
  sentinel: {
    idle: { period: 2.3, tilt: .026 }, ready: { advance: -.11, tilt: -.14 },
    strike: { advance: .87, lift: .03, tilt: .19 }, follow: { advance: .52, tilt: .10 }, recoil: .16,
  },
  raven: {
    idle: { period: .63, lift: .22, tilt: .05 }, ready: { advance: -.27, lift: .48, tilt: -.16 },
    strike: { advance: 1.15, lift: -.14, tilt: .25 }, follow: { advance: .47, lift: .47, tilt: -.13 }, recoil: .53,
  },
  guardian: {
    idle: { period: 2.4, tilt: .027 }, ready: { advance: -.07, squash: .05, tilt: -.13 },
    strike: { advance: .34, squash: -.08, tilt: .19 }, follow: { advance: .11, tilt: .12 }, recoil: .13,
  },
  warden: {
    idle: { period: 2.2, tilt: .028 }, ready: { advance: -.21, tilt: -.10 },
    strike: { advance: .91, tilt: .11 }, follow: { advance: .63, squash: -.07 }, recoil: .19,
  },
  railkeeper: {
    idle: { period: 1.1, squash: .025 }, ready: { advance: -.37, squash: -.08 },
    strike: { advance: 1.36, tilt: .09 }, follow: { advance: .98, squash: -.12, tilt: -.04 }, recoil: .12,
  },
  'echo-rook': {
    idle: { period: .90, lift: .22, tilt: .045 }, ready: { advance: -.16, lift: .63, tilt: -.15 },
    strike: { advance: 1.29, lift: -.24, tilt: .28 }, follow: { advance: .5, lift: .5, tilt: -.10 }, recoil: .42,
  },
  pagekeeper: {
    idle: { period: 1.83, tilt: .042 }, ready: { advance: -.13, lift: .10, squash: -.11 },
    strike: { advance: .32, lift: .29, tilt: .14, squash: .10 }, follow: { advance: .2, tilt: -.06 }, recoil: .28,
  },
  'oath-echo': {
    idle: { period: 1.45, lift: .23, tilt: .05 }, ready: { advance: -.31, lift: .21, tilt: -.15 },
    strike: { advance: 1.18, lift: .13, tilt: .31 }, follow: { advance: .57, lift: .26, tilt: .05 }, recoil: .38,
  },
  eclipse: {
    idle: { period: 2.2, lift: .071, tilt: .018 }, ready: { advance: -.12, lift: .18, tilt: -.18 },
    strike: { advance: .8, lift: .05, tilt: .17 }, follow: { advance: .38, tilt: .09 }, recoil: .17,
  },
  [ECLIPSE_FORM]: {
    idle: { period: 1.1, lift: .15, tilt: .032 }, ready: { advance: -.23, lift: .37, tilt: -.12 },
    strike: { advance: 1.06, lift: .16, tilt: .22 }, follow: { advance: .44, lift: .3, tilt: -.09 }, recoil: .21,
  },
};

const peak = enemyAttackTiming.impact / enemyAttackTiming.duration;
const followThrough = .67;

export function enemyAttackPose(motion: EnemyMotion, progress: number, move: EnemyMove) {
  const keyframes: [number, Pose, number][] = [
    [0, {}, enemyPose.ready], [.24, motion.ready, enemyPose.strike], [peak, motion.strike, enemyPose.follow],
    [followThrough, motion.follow, enemyPose.follow], [1, {}, enemyPose.rest],
  ];
  const index = progress < .24 ? 0 : progress < peak ? 1 : progress < followThrough ? 2 : 3;
  const [start, from, pose] = keyframes[index];
  const [end, to] = keyframes[index + 1];
  const frame = progress >= 1 ? enemyPose.rest : progress >= peak && progress < .48 ? enemyPose.strike : pose;
  const t = Math.max(0, Math.min(1, (progress - start) / (end - start)));
  const ease = progress < peak && progress >= .24 ? t * t : t * (2 - t);
  const value = (axis: keyof Pose) => (from[axis] ?? 0) * (1 - ease) + (to[axis] ?? 0) * ease;
  const force = move === 'heavy' ? 1.24 : move === 'sweep' ? 1.12 : 1;
  return { frame: frame, advance: value('advance') * force, lift: value('lift') * force,
    tilt: value('tilt') * force, squash: value('squash') * force };
}
