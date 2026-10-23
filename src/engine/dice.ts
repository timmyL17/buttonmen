import type { Die, PlayerState, Rng, Skill } from './types';

export const has = (d: Die, s: Skill) => d.skills.includes(s);

export const dieValue = (d: Die) => d.values.reduce((a, b) => a + b, 0);

export const dieSize = (d: Die) => d.sides.reduce((a, b) => a + b, 0);

/** Lowest value the die can roll (2 for a twin die). */
export const dieMin = (d: Die) => d.sides.length;

/** Shadow dice, and Queer dice showing an odd number, follow Shadow rules. */
export const isShadowLike = (d: Die) => has(d, 's') || (has(d, 'q') && dieValue(d) % 2 === 1);

export const canPower = (d: Die) => !isShadowLike(d);

export const canSkill = (d: Die) => !has(d, 'B');

/** Trip and Stinger dice don't count when deciding who goes first. */
export const countsForInitiative = (d: Die) => !has(d, 't') && !has(d, 'g');

export function rollDie(d: Die, rng: Rng): void {
  d.values = d.sides.map((s) => 1 + Math.floor(rng() * s));
}

/** Points a die is worth to the player holding it in their active dice. */
export function keptValue(d: Die): number {
  if (has(d, 'n')) return 0;
  if (has(d, 'p')) return -dieSize(d);
  return dieSize(d) / 2;
}

/** Points a die is worth to the player who captured it. */
export function capturedValue(d: Die): number {
  if (d.nulled || has(d, 'n')) return 0;
  if (has(d, 'p')) return -dieSize(d) / 2;
  return dieSize(d);
}

export function playerScore(p: Pick<PlayerState, 'dice' | 'captured'>): number {
  let total = 0;
  for (const d of p.dice) total += keptValue(d);
  for (const d of p.captured) total += capturedValue(d);
  return total;
}

/** Size label, e.g. "d12", "X10", "(4,4)", "W(6,6)". */
export function sizeLabel(d: Die): string {
  const sides = d.sides.join(',');
  if (d.swing) return `${d.swing}${d.sides.length > 1 ? `(${sides})` : sides}`;
  return d.sides.length > 1 ? `(${sides})` : `d${sides}`;
}

/** Log label, e.g. "7 on ps d12" or "5 on X10". */
export function describeDie(d: Die): string {
  const skills = d.skills.length ? `${d.skills.join('')} ` : '';
  return `${dieValue(d)} on ${skills}${sizeLabel(d)}${d.mood ? '?' : ''}`;
}
