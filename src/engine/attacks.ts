import { canPower, canSkill, dieMin, dieSize, dieValue, has, isShadowLike } from './dice';
import type { Attack, AttackType, Die, GameState } from './types';

export const ATTACK_TYPES: AttackType[] = ['power', 'skill', 'shadow', 'speed', 'berserk', 'trip'];

export const ATTACK_NAMES: Record<AttackType, string> = {
  power: 'Power',
  skill: 'Skill',
  shadow: 'Shadow',
  speed: 'Speed',
  berserk: 'Berserk',
  trip: 'Trip',
};

const sum = (dice: Die[]) => dice.reduce((a, d) => a + dieValue(d), 0);

/** Range of totals a group of dice can make in a Skill attack (Stingers flex down). */
function skillRange(dice: Die[]): [number, number] {
  let lo = 0;
  let hi = 0;
  for (const d of dice) {
    const v = dieValue(d);
    hi += v;
    lo += has(d, 'g') ? dieMin(d) : v;
  }
  return [lo, hi];
}

/** Rule check for a given attack type on already-resolved dice. Returns an error or null. */
export function checkAttackDice(type: AttackType, att: Die[], tgt: Die[]): string | null {
  if (att.length === 0) return 'Choose attacking dice';
  if (tgt.length === 0) return 'Choose a target';
  const a = att[0];
  const t = tgt[0];
  switch (type) {
    case 'power':
      if (att.length !== 1 || tgt.length !== 1) return 'Power attacks use one die against one die';
      if (!canPower(a)) return 'Shadow dice can’t make Power attacks';
      return dieValue(a) >= dieValue(t) ? null : 'Attacker must be at least the target’s value';
    case 'skill': {
      if (tgt.length !== 1) return 'Skill attacks capture one die';
      if (!att.every(canSkill)) return 'Berserk dice can’t make Skill attacks';
      const [lo, hi] = skillRange(att);
      const v = dieValue(t);
      return v >= lo && v <= hi ? null : 'Attackers must add up exactly to the target';
    }
    case 'shadow':
      if (att.length !== 1 || tgt.length !== 1) return 'Shadow attacks use one die against one die';
      if (!isShadowLike(a)) return 'Only Shadow dice can make Shadow attacks';
      return dieValue(t) >= dieValue(a) && dieValue(t) <= dieSize(a)
        ? null
        : 'Target must be between this die’s value and its size';
    case 'speed':
    case 'berserk':
      if (att.length !== 1) return `${type === 'speed' ? 'Speed' : 'Berserk'} attacks use one die`;
      if (!has(a, type === 'speed' ? 'z' : 'B')) return `Needs a ${type === 'speed' ? 'Speed' : 'Berserk'} die`;
      return sum(tgt) === dieValue(a) ? null : 'Targets must add up exactly to the attacker';
    case 'trip':
      if (att.length !== 1 || tgt.length !== 1) return 'Trip attacks use one die against one die';
      if (!has(a, 't')) return 'Needs a Trip die';
      return dieSize(a) >= dieMin(t) ? null : 'This Trip die can never beat that target';
  }
}

/** Full validation of an attack against the current game state. Returns an error or null. */
export function validateAttack(state: GameState, attack: Attack): string | null {
  if (state.phase !== 'play') return 'Not in play';
  const me = state.players[state.turn];
  const opp = state.players[1 - state.turn];
  const att = resolve(me.dice, attack.attackers);
  const tgt = resolve(opp.dice, attack.targets);
  if (!att || !tgt) return 'Unknown or duplicate dice';
  return checkAttackDice(attack.type, att, tgt);
}

function resolve(dice: Die[], ids: string[]): Die[] | null {
  if (new Set(ids).size !== ids.length) return null;
  const out: Die[] = [];
  for (const id of ids) {
    const d = dice.find((x) => x.id === id);
    if (!d) return null;
    out.push(d);
  }
  return out;
}

/** Attack types that are valid for exactly this selection of dice. */
export function attackTypesFor(state: GameState, attackers: string[], targets: string[]): AttackType[] {
  return ATTACK_TYPES.filter((type) => !validateAttack(state, { type, attackers, targets }));
}

function* subsets<T>(items: T[]): Generator<T[]> {
  const n = items.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const out: T[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) out.push(items[i]);
    yield out;
  }
}

/** Every legal attack for the player whose turn it is. */
export function legalAttacks(state: GameState): Attack[] {
  if (state.phase !== 'play') return [];
  const mine = state.players[state.turn].dice;
  const theirs = state.players[1 - state.turn].dice;
  const out: Attack[] = [];
  const ids = (ds: Die[]) => ds.map((d) => d.id);
  const add = (type: AttackType, att: Die[], tgt: Die[]) => {
    if (!checkAttackDice(type, att, tgt)) out.push({ type, attackers: ids(att), targets: ids(tgt) });
  };

  for (const a of mine) {
    for (const t of theirs) {
      add('power', [a], [t]);
      add('shadow', [a], [t]);
      add('trip', [a], [t]);
    }
    if (has(a, 'z') || has(a, 'B')) {
      for (const group of subsets(theirs)) {
        add('speed', [a], group);
        add('berserk', [a], group);
      }
    }
  }
  for (const group of subsets(mine.filter(canSkill))) {
    for (const t of theirs) add('skill', group, [t]);
  }
  return out;
}

export function hasLegalAttack(state: GameState): boolean {
  return legalAttacks(state).length > 0;
}
