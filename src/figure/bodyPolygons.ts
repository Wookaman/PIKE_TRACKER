import { MuscleId } from '../lib/types';

export interface FigurePoly {
  muscle: MuscleId | 'silhouette';
  points: string;
}

type Pt = [number, number];

const P = (pts: Pt[]): string => pts.map(([x, y]) => `${x},${y}`).join(' ');
const MIR = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [100 - x, y]);

/** Emit a right-side polygon and its mirrored left twin. */
function pair(muscle: MuscleId | 'silhouette', pts: Pt[]): FigurePoly[] {
  return [
    { muscle, points: P(pts) },
    { muscle, points: P(MIR(pts)) },
  ];
}

// ---- Shared silhouette (both views), 0..100 x 0..220 ----

const HEAD: Pt[] = [
  [50, 4], [61, 8], [64, 17], [61, 27], [50, 31], [39, 27], [36, 17], [39, 8],
];
const NECK: Pt[] = [
  [44, 29], [56, 29], [57, 42], [43, 42],
];
const TORSO: Pt[] = [
  [30, 42], [70, 42], [74, 60], [71, 85], [66, 102], [64, 116], [36, 116], [34, 102], [29, 85], [26, 60],
];
const UPPER_ARM_R: Pt[] = [
  [70, 43], [80, 50], [80, 76], [70, 72],
];
const FOREARM_R: Pt[] = [
  [79, 76], [86, 99], [82, 107], [73, 90], [71, 76],
];
const HAND_R: Pt[] = [
  [81, 105], [89, 112], [86, 122], [77, 114],
];
const LEG_R: Pt[] = [
  [51, 116], [66, 116], [68, 142], [64, 172], [64, 196], [61, 208], [68, 213], [66, 218], [51, 218], [53, 196], [51, 172], [50, 142],
];

const SILHOUETTE: FigurePoly[] = [
  { muscle: 'silhouette', points: P(HEAD) },
  { muscle: 'silhouette', points: P(NECK) },
  { muscle: 'silhouette', points: P(TORSO) },
  ...pair('silhouette', UPPER_ARM_R),
  ...pair('silhouette', FOREARM_R),
  ...pair('silhouette', HAND_R),
  ...pair('silhouette', LEG_R),
];

// ---- Front view muscles ----

const DELT_FRONT_R: Pt[] = [
  [64, 42], [76, 47], [78, 58], [67, 52],
];
const CHEST_R: Pt[] = [
  [51, 48], [67, 53], [68, 67], [59, 73], [51, 70],
];
const BICEPS_R: Pt[] = [
  [69, 56], [78, 61], [77, 75], [69, 71],
];
const FOREARM_FRONT_R: Pt[] = [
  [76, 77], [84, 98], [80, 104], [72, 88], [72, 78],
];
const OBLIQUE_R: Pt[] = [
  [57, 75], [64, 79], [62, 100], [56, 97],
];
// Faceted six-pack: two columns, three rows.
const ABS: Pt[][] = [
  [[44, 75], [50, 75], [50, 84], [44, 84]],
  [[50, 75], [56, 75], [56, 84], [50, 84]],
  [[44, 86], [50, 86], [50, 95], [44, 95]],
  [[50, 86], [56, 86], [56, 95], [50, 95]],
  [[45, 97], [50, 97], [50, 108], [46, 108]],
  [[50, 97], [55, 97], [54, 108], [50, 108]],
];
const QUAD_R: Pt[] = [
  [52, 118], [65, 118], [67, 142], [62, 166], [55, 162], [52, 140],
];

export const FRONT: FigurePoly[] = [
  ...SILHOUETTE,
  ...pair('shoulders', DELT_FRONT_R),
  ...pair('chest', CHEST_R),
  ...pair('biceps', BICEPS_R),
  ...pair('forearms', FOREARM_FRONT_R),
  ...pair('obliques', OBLIQUE_R),
  ...ABS.map((pts) => ({ muscle: 'abs' as const, points: P(pts) })),
  ...pair('quads', QUAD_R),
];

// ---- Back view muscles ----

const TRAPS: Pt[] = [
  [43, 40], [57, 40], [67, 47], [50, 62], [33, 47],
];
const DELT_BACK_R: Pt[] = [
  [66, 43], [77, 48], [78, 58], [68, 53],
];
const TRICEPS_R: Pt[] = [
  [69, 56], [78, 61], [77, 76], [69, 72],
];
const FOREARM_BACK_R: Pt[] = [
  [76, 77], [84, 98], [80, 104], [72, 88], [72, 78],
];
const LAT_R: Pt[] = [
  [51, 60], [66, 55], [70, 68], [63, 86], [52, 93],
];
const LOWER_BACK: Pt[] = [
  [44, 88], [56, 88], [54, 108], [46, 108],
];
const GLUTE_R: Pt[] = [
  [51, 110], [65, 114], [64, 131], [51, 128],
];
const HAMSTRING_R: Pt[] = [
  [52, 133], [64, 134], [62, 162], [54, 159],
];
const CALF_R: Pt[] = [
  [54, 170], [63, 172], [62, 194], [55, 192],
];

export const BACK: FigurePoly[] = [
  ...SILHOUETTE,
  { muscle: 'traps', points: P(TRAPS) },
  ...pair('shoulders', DELT_BACK_R),
  ...pair('triceps', TRICEPS_R),
  ...pair('forearms', FOREARM_BACK_R),
  ...pair('lats', LAT_R),
  { muscle: 'lower_back', points: P(LOWER_BACK) },
  ...pair('glutes', GLUTE_R),
  ...pair('hamstrings', HAMSTRING_R),
  ...pair('calves', CALF_R),
];
