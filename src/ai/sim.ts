// A stripped-down copy of a round in progress (just dice, no log) that AI
// search can clone and play forward thousands of times per move.
import { legalAttacksFor, playerScore, resolveAttack } from '../engine';
import type { Attack, Die, GameState, PlayerId, Rng, Side } from '../engine';

export interface Sim {
  sides: [Side, Side];
  turn: PlayerId;
  passes: number;
  over: boolean;
}

export const cloneDie = (d: Die): Die => ({ ...d, skills: d.skills.slice(), sides: d.sides.slice(), values: d.values.slice() });

// Captured dice are never mutated, so the arrays can share them.
const cloneSide = (s: Side): Side => ({ dice: s.dice.map(cloneDie), captured: s.captured.slice() });

export function simFromGame(g: GameState): Sim {
  return {
    sides: [cloneSide(g.players[0]), cloneSide(g.players[1])],
    turn: g.turn,
    passes: g.passes,
    over: g.phase !== 'play',
  };
}

export const cloneSim = (s: Sim): Sim => ({
  sides: [cloneSide(s.sides[0]), cloneSide(s.sides[1])],
  turn: s.turn,
  passes: s.passes,
  over: s.over,
});

export const simMoves = (s: Sim): Attack[] => legalAttacksFor(s.sides[s.turn].dice, s.sides[1 - s.turn].dice);

/** Plays an attack (or a pass when null), following the same rules as the game. */
export function simStep(s: Sim, attack: Attack | null, rng: Rng): void {
  const me = s.sides[s.turn];
  const opp = s.sides[1 - s.turn];
  if (attack) {
    resolveAttack(me, opp, attack, rng);
    s.passes = 0;
    if (me.dice.length === 0 || opp.dice.length === 0) {
      s.over = true;
      return;
    }
  } else if (++s.passes >= 2) {
    s.over = true;
    return;
  }
  s.turn = s.turn === 0 ? 1 : 0;
}

/** Score lead for player p (negative when behind). */
export const simMargin = (s: Sim, p: PlayerId): number => playerScore(s.sides[p]) - playerScore(s.sides[1 - p]);
