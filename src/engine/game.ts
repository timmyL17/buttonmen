import { ATTACK_NAMES, hasLegalAttack, validateAttack } from './attacks';
import { countsForInitiative, describeDie, dieValue, playerScore, rollDie } from './dice';
import { SWING_RANGES, hasChoices, optionIndices, parseRecipe, swingLetters } from './recipe';
import { resolveAttack } from './resolve';
import type { Action, Attack, ButtonDef, Die, GameState, PlayerId, PlayerState, Rng, SwingLetter } from './types';

const other = (p: PlayerId): PlayerId => (p === 0 ? 1 : 0);

export function newGame(
  buttons: [ButtonDef, ButtonDef],
  names: [string, string] = ['Player 1', 'Player 2'],
  rng: Rng = Math.random,
  winsNeeded = 3,
): GameState {
  const players = buttons.map(
    (button, i): PlayerState => ({
      name: names[i],
      button,
      specs: parseRecipe(button.recipe),
      swing: {},
      options: {},
      dice: [],
      captured: [],
      roundsWon: 0,
    }),
  ) as [PlayerState, PlayerState];
  const state: GameState = {
    version: 1,
    phase: 'setup',
    players,
    round: 1,
    winsNeeded,
    turn: 0,
    passes: 0,
    awaitingSetup: [hasChoices(players[0].specs), hasChoices(players[1].specs)],
    results: [],
    log: [],
  };
  if (!state.awaitingSetup[0] && !state.awaitingSetup[1]) startRound(state, rng);
  return state;
}

/** Returns a new state with the action applied. Throws if the action is illegal. */
export function applyAction(prev: GameState, action: Action, rng: Rng = Math.random): GameState {
  const state = structuredClone(prev);
  state.lastAction = undefined;
  switch (action.type) {
    case 'setup':
      doSetup(state, action.player, action.swing, action.options, rng);
      break;
    case 'attack':
      doAttack(state, action.attack, rng);
      break;
    case 'pass':
      doPass(state);
      break;
    case 'nextRound':
      if (state.phase !== 'roundOver') throw new Error('Round is not over');
      state.round++;
      state.awaitingSetup = [0, 1].map((i) => {
        const last = state.results[state.results.length - 1];
        const lost = last.winner === null || last.winner !== i;
        return lost && hasChoices(state.players[i].specs);
      }) as [boolean, boolean];
      for (const p of state.players) {
        p.dice = [];
        p.captured = [];
      }
      if (state.awaitingSetup.some(Boolean)) state.phase = 'setup';
      else startRound(state, rng);
      break;
  }
  return state;
}

function doSetup(
  state: GameState,
  player: PlayerId,
  swing: Partial<Record<SwingLetter, number>>,
  options: Record<number, number>,
  rng: Rng,
) {
  if (state.phase !== 'setup' || !state.awaitingSetup[player]) throw new Error('Not choosing dice now');
  const p = state.players[player];
  for (const letter of swingLetters(p.specs)) {
    const v = swing[letter];
    const [lo, hi] = SWING_RANGES[letter];
    if (v === undefined || !Number.isInteger(v) || v < lo || v > hi) {
      throw new Error(`${letter} must be between ${lo} and ${hi}`);
    }
    p.swing[letter] = v;
  }
  for (const i of optionIndices(p.specs)) {
    const v = options[i];
    if (!p.specs[i].options!.includes(v)) throw new Error(`Pick a size for ${p.specs[i].recipe}`);
    p.options[i] = v;
  }
  state.awaitingSetup[player] = false;
  if (!state.awaitingSetup[0] && !state.awaitingSetup[1]) startRound(state, rng);
}

export function buildDice(p: Pick<PlayerState, 'specs' | 'swing' | 'options'>, owner: PlayerId): Die[] {
  return p.specs.map((spec, i) => {
    const swing = spec.sides.find((s): s is SwingLetter => typeof s === 'string');
    const sides = spec.options
      ? [p.options[i]]
      : spec.sides.map((s) => (typeof s === 'number' ? s : p.swing[s]!));
    return { id: `${owner}-${i}`, owner, spec: i, skills: [...spec.skills], sides, values: [], swing, mood: spec.mood };
  });
}

/** Who goes first: lowest die wins, ties go to the next lowest; null if fully tied. */
export function initiativeWinner(a: Die[], b: Die[]): PlayerId | null {
  const vals = (ds: Die[]) => ds.filter(countsForInitiative).map(dieValue).sort((x, y) => x - y);
  const va = vals(a);
  const vb = vals(b);
  for (let i = 0; i < Math.min(va.length, vb.length); i++) {
    if (va[i] < vb[i]) return 0;
    if (vb[i] < va[i]) return 1;
  }
  if (va.length !== vb.length) return va.length > vb.length ? 0 : 1;
  return null;
}

function startRound(state: GameState, rng: Rng) {
  const [p0, p1] = state.players;
  p0.dice = buildDice(p0, 0);
  p1.dice = buildDice(p1, 1);
  let first: PlayerId | null = null;
  for (let tries = 0; first === null; tries++) {
    for (const d of [...p0.dice, ...p1.dice]) rollDie(d, rng);
    first = initiativeWinner(p0.dice, p1.dice);
    if (first === null && tries > 50) first = rng() < 0.5 ? 0 : 1;
  }
  state.phase = 'play';
  state.turn = first;
  state.passes = 0;
  state.lastAction = { rolled: [...p0.dice, ...p1.dice].map((d) => d.id), captured: [] };
  state.log.push({ round: state.round, text: `Round ${state.round} begins. ${state.players[first].name} goes first.` });
}

function doAttack(state: GameState, attack: Attack, rng: Rng) {
  const err = validateAttack(state, attack);
  if (err) throw new Error(err);
  const me = state.players[state.turn];
  const opp = state.players[other(state.turn)];
  const att = attack.attackers.map((id) => me.dice.find((d) => d.id === id)!);
  const tgt = attack.targets.map((id) => opp.dice.find((d) => d.id === id)!);
  const before = `${att.map(describeDie).join(' + ')} vs ${tgt.map(describeDie).join(' + ')}`;

  const out = resolveAttack(me, opp, attack, rng);
  let text: string;
  if (attack.type === 'trip') {
    const [a, t] = out.rolled;
    text = `Trip attack: ${before}: rolled ${dieValue(a)} vs ${dieValue(t)}, ${out.captured.length ? 'captured!' : 'missed.'}`;
  } else {
    text = `${ATTACK_NAMES[attack.type]} attack: ${before}, captured. Rerolled to ${out.rolled.map(dieValue).join(', ')}.`;
  }
  state.lastAction = { rolled: out.rolled.map((d) => d.id), captured: out.captured.map((d) => d.id) };

  state.log.push({ round: state.round, player: state.turn, text });
  state.passes = 0;
  if (me.dice.length === 0 || opp.dice.length === 0) endRound(state);
  else state.turn = other(state.turn);
}

function doPass(state: GameState) {
  if (state.phase !== 'play') throw new Error('Not in play');
  if (hasLegalAttack(state)) throw new Error('You must attack if you can');
  state.log.push({ round: state.round, player: state.turn, text: 'Passes (no legal attacks).' });
  state.passes++;
  if (state.passes >= 2) endRound(state);
  else state.turn = other(state.turn);
}

function endRound(state: GameState) {
  const scores = state.players.map(playerScore) as [number, number];
  const winner: PlayerId | null = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1;
  state.results.push({ round: state.round, scores, winner });
  const fmt = (n: number) => n.toString();
  if (winner === null) {
    state.log.push({ round: state.round, text: `Round ${state.round} is a draw (${fmt(scores[0])}–${fmt(scores[1])}).` });
  } else {
    state.players[winner].roundsWon++;
    state.log.push({
      round: state.round,
      text: `${state.players[winner].name} wins round ${state.round} (${fmt(scores[winner])}–${fmt(scores[other(winner)])}).`,
    });
  }
  if (winner !== null && state.players[winner].roundsWon >= state.winsNeeded) {
    state.phase = 'matchOver';
    state.winner = winner;
    state.log.push({ round: state.round, text: `${state.players[winner].name} wins the match!` });
  } else {
    state.phase = 'roundOver';
  }
}
