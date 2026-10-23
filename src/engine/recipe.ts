import type { DieSpec, Skill, SidesSpec, SwingLetter } from './types';

export const SWING_RANGES: Record<SwingLetter, [number, number]> = {
  R: [2, 16],
  S: [6, 20],
  T: [2, 12],
  U: [8, 30],
  V: [6, 12],
  W: [4, 12],
  X: [4, 20],
  Y: [1, 20],
  Z: [4, 30],
};

/** Sizes a Mood Swing die can randomly change to. */
export const MOOD_SIZES = [1, 2, 4, 6, 8, 10, 12, 16, 20, 30];

export const SKILL_INFO: Record<Skill, { name: string; short: string }> = {
  p: { name: 'Poison', short: 'Worth negative points: −full size if you keep it, −half size if you capture it.' },
  s: { name: 'Shadow', short: 'No Power attacks. Shadow attack: capture one die showing ≥ this value and ≤ this die’s size.' },
  z: { name: 'Speed', short: 'Speed attack: capture several dice whose values add up exactly to this value.' },
  B: { name: 'Berserk', short: 'No Skill attacks. Berserk attack: like Speed, then this die shrinks to half size.' },
  t: { name: 'Trip', short: 'Ignored for initiative. Trip attack: reroll both dice; capture if this one is ≥ target.' },
  n: { name: 'Null', short: 'Worth zero. Dice it captures are worth zero.' },
  q: { name: 'Queer', short: 'Acts as a Shadow die while showing an odd number.' },
  g: { name: 'Stinger', short: 'Ignored for initiative. In Skill attacks it may count as any value from its minimum up to what it shows.' },
};

const SKILL_LETTERS = new Set<string>(Object.keys(SKILL_INFO));
const DIE_RE = /^([A-Za-z]*)\(([^)]+)\)(\?)?$/;

function parseSides(s: string, recipe: string): SidesSpec {
  if (/^\d+$/.test(s)) return Number(s);
  if (s in SWING_RANGES) return s as SwingLetter;
  throw new Error(`Bad die size "${s}" in ${recipe}`);
}

export function parseDie(recipe: string): DieSpec {
  const m = DIE_RE.exec(recipe);
  if (!m) throw new Error(`Cannot parse die "${recipe}"`);
  const [, skillStr, body, moodMark] = m;
  const skills = [...skillStr].map((c) => {
    if (!SKILL_LETTERS.has(c)) throw new Error(`Unsupported skill "${c}" in ${recipe}`);
    return c as Skill;
  });
  const spec: DieSpec = { recipe, skills, sides: [], mood: moodMark === '?' };
  if (body.includes('/')) {
    const [a, b] = body.split('/').map(Number);
    spec.options = [a, b];
    spec.sides = [a];
  } else {
    spec.sides = body.split(',').map((s) => parseSides(s.trim(), recipe));
  }
  if (spec.mood && !spec.sides.every((s) => typeof s === 'string')) {
    throw new Error(`Mood swing must be a swing die: ${recipe}`);
  }
  return spec;
}

export function parseRecipe(recipe: string): DieSpec[] {
  return recipe.trim().split(/\s+/).map(parseDie);
}

/** Swing letters used by a recipe, in order of first appearance. */
export function swingLetters(specs: DieSpec[]): SwingLetter[] {
  const out: SwingLetter[] = [];
  for (const spec of specs) {
    for (const s of spec.sides) {
      if (typeof s === 'string' && !out.includes(s)) out.push(s);
    }
  }
  return out;
}

/** Indices of option dice in a recipe. */
export function optionIndices(specs: DieSpec[]): number[] {
  return specs.flatMap((s, i) => (s.options ? [i] : []));
}

export function hasChoices(specs: DieSpec[]): boolean {
  return swingLetters(specs).length > 0 || optionIndices(specs).length > 0;
}
