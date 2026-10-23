// On-device computer opponent. Three levels:
//   easy   - grabs the most points on offer right now, with some random moves
//   medium - one move of lookahead: samples the rerolls, subtracts the opponent's best reply
//   hard   - Monte Carlo: plays each promising attack out to the end of the round
//            hundreds of times and picks the one that wins most often
// Swing and option dice are chosen the same way, by simulating whole rounds.
import {
  SWING_RANGES,
  buildDice,
  capturedValue,
  has,
  initiativeWinner,
  keptValue,
  optionIndices,
  rollDie,
  swingLetters,
} from '../engine';
import type { Action, Attack, Die, GameState, PlayerId, PlayerState, Rng, SwingLetter } from '../engine';
import { cloneSim, simFromGame, simMargin, simMoves, simStep } from './sim';
import type { Sim } from './sim';
import type { Level } from './levels';

export { LEVEL_NAMES } from './levels';
export type { Level } from './levels';

/** Search limits. Whichever runs out first stops the search. */
export interface Budget {
  ms: number;
  playouts: number;
}

const DEFAULT_BUDGETS: Record<Level, { attack: Budget; setup: Budget }> = {
  easy: { attack: { ms: 0, playouts: 0 }, setup: { ms: 0, playouts: 0 } },
  medium: { attack: { ms: 300, playouts: Infinity }, setup: { ms: 300, playouts: 300 } },
  // In AI-vs-AI testing, Hard beat Medium 64% of matches at 4k playouts and 74% at 16k.
  hard: { attack: { ms: 1200, playouts: 20000 }, setup: { ms: 1500, playouts: 6000 } },
};

export interface AiOptions {
  rng?: Rng;
  attackBudget?: Budget;
  setupBudget?: Budget;
}

/** The action the computer takes for `player`, or null if it has nothing to do. */
export function chooseAction(state: GameState, player: PlayerId, level: Level, opts: AiOptions = {}): Action | null {
  const rng = opts.rng ?? Math.random;
  if (state.phase === 'setup' && state.awaitingSetup[player]) {
    const budget = opts.setupBudget ?? DEFAULT_BUDGETS[level].setup;
    return { type: 'setup', player, ...chooseSetup(state, player, level, rng, budget) };
  }
  if (state.phase === 'play' && state.turn === player) {
    const sim = simFromGame(state);
    const moves = simMoves(sim);
    if (moves.length === 0) return { type: 'pass' };
    const budget = opts.attackBudget ?? DEFAULT_BUDGETS[level].attack;
    return { type: 'attack', attack: chooseAttack(sim, moves, level, rng, budget) };
  }
  return null;
}

export function chooseAttack(sim: Sim, moves: Attack[], level: Level, rng: Rng, budget: Budget): Attack {
  if (moves.length === 1) return moves[0];
  if (level === 'easy') return rng() < 0.3 ? pick(moves, rng) : greedy(sim, moves, rng, 2);
  const ranked = lookahead(sim, moves, rng, level === 'medium' ? 16 : 6, level === 'medium' ? budget.ms : budget.ms / 4);
  if (level === 'medium') return ranked[0];
  return monteCarlo(sim, ranked.slice(0, 10), rng, budget);
}

// ---------------------------------------------------------------- heuristics

const pick = <T>(xs: T[], rng: Rng): T => xs[Math.floor(rng() * xs.length)];

const find = (dice: Die[], id: string) => dice.find((d) => d.id === id)!;

/** Probability distribution of a die's total (index = total). */
function distribution(sides: number[]): number[] {
  let dist = [1];
  for (const s of sides) {
    const next = new Array(dist.length + s).fill(0);
    for (let i = 0; i < dist.length; i++) {
      if (!dist[i]) continue;
      for (let v = 1; v <= s; v++) next[i + v] += dist[i] / s;
    }
    dist = next;
  }
  return dist;
}

/** Chance a trip attack succeeds: P(attacker's new roll >= target's new roll). */
export function tripChance(a: Die, t: Die): number {
  const da = distribution(a.sides);
  const dt = distribution(t.sides);
  let p = 0;
  let cumT = 0;
  for (let v = 0; v < da.length; v++) {
    cumT += dt[v] ?? 0;
    p += da[v] * cumT;
  }
  return p;
}

/**
 * Expected change in the mover's score lead from this attack, ignoring what
 * happens next. Capturing a die gains its captured value and also removes
 * what it was worth to the opponent (so capturing poison is a loss).
 */
export function attackGain(attack: Attack, mine: Die[], theirs: Die[]): number {
  const att = attack.attackers.map((id) => find(mine, id));
  const nulled = att.some((a) => has(a, 'n'));
  let gain = 0;
  for (const id of attack.targets) {
    const t = find(theirs, id);
    gain += (nulled ? 0 : capturedValue(t)) + keptValue(t);
  }
  if (attack.type === 'trip') gain *= tripChance(att[0], find(theirs, attack.targets[0]));
  if (attack.type === 'berserk') {
    const a = att[0];
    gain -= keptValue(a) - keptValue({ ...a, sides: a.sides.map((s) => Math.ceil(s / 2)) });
  }
  return gain;
}

/** Highest-gain attack, with random noise (in points) to vary play. */
function greedy(sim: Sim, moves: Attack[], rng: Rng, noise: number): Attack {
  const mine = sim.sides[sim.turn].dice;
  const theirs = sim.sides[1 - sim.turn].dice;
  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const score = attackGain(m, mine, theirs) + noise * rng();
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

/** Best immediate gain available to the player whose turn it is. */
function bestGain(sim: Sim): number {
  const mine = sim.sides[sim.turn].dice;
  const theirs = sim.sides[1 - sim.turn].dice;
  let best = 0;
  for (const m of simMoves(sim)) best = Math.max(best, attackGain(m, mine, theirs));
  return best;
}

/**
 * Ranks moves by: score lead after the move (averaged over sampled rerolls)
 * minus most of the opponent's best reply. Best first.
 */
function lookahead(sim: Sim, moves: Attack[], rng: Rng, samples: number, ms: number): Attack[] {
  const me = sim.turn;
  const deadline = performance.now() + ms;
  const scored = moves.map((m) => {
    let total = 0;
    let n = 0;
    // Always take a few samples; take the rest only while time allows.
    while (n < samples && (n < 3 || performance.now() < deadline)) {
      const c = cloneSim(sim);
      simStep(c, m, rng);
      total += simMargin(c, me) - (c.over ? 0 : 0.8 * bestGain(c));
      n++;
    }
    return { m, v: total / n };
  });
  return scored.sort((a, b) => b.v - a.v).map((s) => s.m);
}

// ---------------------------------------------------------------- Monte Carlo

/** Plays a round to the end with a quick, slightly random greedy policy. */
function rollout(sim: Sim, rng: Rng): void {
  for (let steps = 0; !sim.over && steps < 300; steps++) {
    const moves = simMoves(sim);
    if (moves.length === 0) simStep(sim, null, rng);
    else simStep(sim, rng() < 0.1 ? pick(moves, rng) : greedy(sim, moves, rng, 3), rng);
  }
}

/** 1 for a round win, 0 for a loss, nudged by the margin so bigger wins rank higher. */
function reward(sim: Sim, p: PlayerId): number {
  const m = simMargin(sim, p);
  const win = m > 0 ? 1 : m === 0 ? 0.5 : 0;
  return 0.8 * win + 0.2 * (0.5 + 0.5 * Math.tanh(m / 30));
}

/**
 * Upper-confidence bandit over a list of options: spends more playouts on the
 * options that look best. Returns the index with the best average reward.
 */
function bandit(count: number, playout: (i: number) => number, budget: Budget): number {
  const n = new Array(count).fill(0);
  const w = new Array(count).fill(0);
  const deadline = performance.now() + budget.ms;
  let total = 0;
  while (total < budget.playouts && (total < count * 4 || performance.now() < deadline)) {
    let i = total < count ? total : 0;
    if (total >= count) {
      let best = -Infinity;
      for (let j = 0; j < count; j++) {
        const ucb = w[j] / n[j] + 0.6 * Math.sqrt(Math.log(total) / n[j]);
        if (ucb > best) {
          best = ucb;
          i = j;
        }
      }
    }
    w[i] += playout(i);
    n[i]++;
    total++;
  }
  let best = 0;
  for (let j = 1; j < count; j++) if (w[j] / n[j] > w[best] / n[best]) best = j;
  return best;
}

function monteCarlo(sim: Sim, moves: Attack[], rng: Rng, budget: Budget): Attack {
  const me = sim.turn;
  const i = bandit(
    moves.length,
    (k) => {
      const c = cloneSim(sim);
      simStep(c, moves[k], rng);
      rollout(c, rng);
      return reward(c, me);
    },
    budget,
  );
  return moves[i];
}

// ---------------------------------------------------------------- swing / option dice

interface Choice {
  swing: Partial<Record<SwingLetter, number>>;
  options: Record<number, number>;
}

const CANDIDATE_SIZES = [1, 2, 4, 6, 8, 10, 12, 16, 20, 30];

function sizesFor(letter: SwingLetter): number[] {
  const [lo, hi] = SWING_RANGES[letter];
  return [...new Set([lo, ...CANDIDATE_SIZES.filter((s) => s > lo && s < hi), hi])];
}

function allChoices(p: PlayerState): Choice[] {
  let out: Choice[] = [{ swing: {}, options: {} }];
  for (const l of swingLetters(p.specs)) {
    out = out.flatMap((c) => sizesFor(l).map((s) => ({ swing: { ...c.swing, [l]: s }, options: c.options })));
  }
  for (const i of optionIndices(p.specs)) {
    out = out.flatMap((c) => p.specs[i].options!.map((s) => ({ swing: c.swing, options: { ...c.options, [i]: s } })));
  }
  return out;
}

/** Our guess at the opponent's sizes: what they used last round, else a middling size. */
function assumedOpponent(p: PlayerState): Choice {
  const swing: Choice['swing'] = {};
  for (const l of swingLetters(p.specs)) {
    const sizes = sizesFor(l);
    swing[l] = p.swing[l] ?? sizes[Math.floor(sizes.length / 2)];
  }
  const options: Choice['options'] = {};
  for (const i of optionIndices(p.specs)) options[i] = p.options[i] ?? p.specs[i].options![1];
  return { swing, options };
}

export function chooseSetup(state: GameState, player: PlayerId, level: Level, rng: Rng, budget: Budget): Choice {
  const me = state.players[player];
  let choices = allChoices(me);
  if (level === 'easy' || choices.length === 1) return pick(choices, rng);
  // Keep the search manageable for buttons with several swing letters.
  while (choices.length > 40) choices.splice(Math.floor(rng() * choices.length), 1);

  const oppPlayer = state.players[1 - player];
  const oppDice = buildDice({ specs: oppPlayer.specs, ...assumedOpponent(oppPlayer) }, (1 - player) as PlayerId);
  const myDice = choices.map((c) => buildDice({ specs: me.specs, ...c }, player));

  const i = bandit(
    choices.length,
    (k) => {
      const sides = [] as unknown as Sim['sides'];
      sides[player] = { dice: myDice[k].map((d) => ({ ...d, values: [] })), captured: [] };
      sides[1 - player] = { dice: oppDice.map((d) => ({ ...d, values: [] })), captured: [] };
      let first: PlayerId | null = null;
      for (let tries = 0; first === null && tries < 20; tries++) {
        for (const d of [...sides[0].dice, ...sides[1].dice]) rollDie(d, rng);
        first = initiativeWinner(sides[0].dice, sides[1].dice);
      }
      const sim: Sim = { sides, turn: first ?? 0, passes: 0, over: false };
      rollout(sim, rng);
      return reward(sim, player);
    },
    budget,
  );
  return choices[i];
}
