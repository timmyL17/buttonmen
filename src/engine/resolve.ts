import { dieValue, has, rollDie } from './dice';
import { MOOD_SIZES, SWING_RANGES } from './recipe';
import type { Attack, Die, Rng } from './types';

/** The parts of a player that an attack changes. */
export interface Side {
  dice: Die[];
  captured: Die[];
}

export interface AttackOutcome {
  /** Dice that were captured (empty if a trip attack missed). */
  captured: Die[];
  /** Dice that were rerolled. */
  rolled: Die[];
}

/**
 * Carries out an attack that is already known to be legal, mutating both sides:
 * captures targets, applies Berserk/Mood changes and rerolls the attackers.
 * Shared by the game and by AI simulations, so the rules live in one place.
 */
export function resolveAttack(me: Side, opp: Side, attack: Attack, rng: Rng): AttackOutcome {
  const att = attack.attackers.map((id) => me.dice.find((d) => d.id === id)!);
  const tgt = attack.targets.map((id) => opp.dice.find((d) => d.id === id)!);

  if (attack.type === 'trip') {
    const [a] = att;
    const [t] = tgt;
    rollDie(a, rng);
    rollDie(t, rng);
    const hit = dieValue(a) >= dieValue(t);
    if (hit) capture(me, opp, [t], att);
    return { captured: hit ? [t] : [], rolled: [a, t] };
  }

  capture(me, opp, tgt, att);
  for (const a of att) {
    if (attack.type === 'berserk') {
      a.skills = a.skills.filter((s) => s !== 'B');
      a.sides = a.sides.map((s) => Math.ceil(s / 2));
      a.swing = undefined;
    }
    if (a.mood && a.swing) {
      const [lo, hi] = SWING_RANGES[a.swing];
      const sizes = MOOD_SIZES.filter((s) => s >= lo && s <= hi);
      const size = sizes[Math.floor(rng() * sizes.length)];
      a.sides = a.sides.map(() => size);
    }
    rollDie(a, rng);
  }
  return { captured: tgt, rolled: att };
}

function capture(me: Side, opp: Side, targets: Die[], attackers: Die[]) {
  const nulled = attackers.some((a) => has(a, 'n'));
  const ids = new Set(targets.map((t) => t.id));
  opp.dice = opp.dice.filter((d) => !ids.has(d.id));
  for (const t of targets) me.captured.push(nulled ? { ...t, nulled: true } : t);
}
