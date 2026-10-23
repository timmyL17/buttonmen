import { describe, expect, it } from 'vitest';
import {
  BUTTONS,
  SWING_RANGES,
  applyAction,
  attackTypesFor,
  dieSize,
  findButton,
  initiativeWinner,
  legalAttacks,
  newGame,
  optionIndices,
  parseRecipe,
  playerScore,
  swingLetters,
} from './index';
import type { Die, GameState, PlayerId, Skill } from './types';

/** Deterministic RNG (mulberry32). */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let nextId = 0;
function die(owner: PlayerId, size: number | number[], value: number | number[], skills: string = ''): Die {
  const sides = Array.isArray(size) ? size : [size];
  const values = Array.isArray(value) ? value : [value];
  return { id: `${owner}-t${nextId++}`, owner, spec: 0, skills: [...skills] as Skill[], sides, values, mood: false };
}

/** A game in play with hand-placed dice; player 0 to move. */
function board(mine: Die[], theirs: Die[]): GameState {
  const g = newGame([findButton('Avis')!, findButton('Iago')!], ['A', 'B'], seeded(1));
  g.phase = 'play';
  g.turn = 0;
  g.players[0].dice = mine;
  g.players[1].dice = theirs;
  return g;
}

const types = (g: GameState, a: Die[], t: Die[]) =>
  attackTypesFor(
    g,
    a.map((d) => d.id),
    t.map((d) => d.id),
  );

describe('recipes', () => {
  it('parses every button', () => {
    for (const b of BUTTONS) expect(() => parseRecipe(b.recipe), b.name).not.toThrow();
  });

  it('parses twins, options, mood and skills', () => {
    const [twin, opt, mood, skilled] = parseRecipe('(4,4) (6/12) (X)? ps(10)');
    expect(twin.sides).toEqual([4, 4]);
    expect(opt.options).toEqual([6, 12]);
    expect(mood).toMatchObject({ sides: ['X'], mood: true });
    expect(skilled.skills).toEqual(['p', 's']);
  });
});

describe('attacks', () => {
  it('power: attacker value must be >= target', () => {
    const a = die(0, 12, 7);
    const t1 = die(1, 20, 7);
    const t2 = die(1, 20, 8);
    const g = board([a], [t1, t2]);
    expect(types(g, [a], [t1])).toContain('power');
    expect(types(g, [a], [t2])).not.toContain('power');
  });

  it('skill: sum must equal target exactly', () => {
    const a = die(0, 6, 3);
    const b = die(0, 8, 5);
    const g = board([a, b], [die(1, 20, 8), die(1, 20, 9)]);
    const [t8, t9] = g.players[1].dice;
    expect(types(g, [a, b], [t8])).toEqual(['skill']);
    expect(types(g, [a, b], [t9])).toEqual([]);
  });

  it('shadow: no power, captures values from own value up to own size', () => {
    const s = die(0, 10, 4, 's');
    const lo = die(1, 20, 3);
    const mid = die(1, 20, 10);
    const hi = die(1, 20, 11);
    const g = board([s], [lo, mid, hi]);
    expect(types(g, [s], [lo])).toEqual([]);
    expect(types(g, [s], [mid])).toEqual(['shadow']);
    expect(types(g, [s], [hi])).toEqual([]);
  });

  it('queer dice act as shadow only when odd', () => {
    const odd = die(0, 10, 5, 'q');
    const even = die(0, 10, 6, 'q');
    const t = die(1, 20, 5);
    const g = board([odd, even], [t]);
    expect(types(g, [odd], [t])).toEqual(['skill', 'shadow']);
    expect(types(g, [even], [t])).toEqual(['power']);
  });

  it('stinger dice can count as less in a skill attack', () => {
    const g1 = die(0, 8, 6, 'g');
    const n = die(0, 6, 4);
    const t = die(1, 20, 7);
    const g = board([g1, n], [t]);
    expect(types(g, [g1, n], [t])).toContain('skill'); // 3 + 4
  });

  it('speed captures several dice summing to its value', () => {
    const z = die(0, 12, 9, 'z');
    const t1 = die(1, 6, 4);
    const t2 = die(1, 8, 5);
    const g = board([z], [t1, t2]);
    expect(types(g, [z], [t1, t2])).toEqual(['speed']);
    const next = applyAction(g, { type: 'attack', attack: { type: 'speed', attackers: [z.id], targets: [t1.id, t2.id] } }, seeded(2));
    expect(next.players[0].captured.map((d) => d.id)).toEqual([t1.id, t2.id]);
  });

  it('berserk cannot skill, and halves after a berserk attack', () => {
    const b = die(0, 20, 9, 'B');
    const n = die(0, 4, 1);
    const t1 = die(1, 6, 4);
    const t2 = die(1, 8, 5);
    const t3 = die(1, 20, 10);
    const g = board([b, n], [t1, t2, t3]);
    expect(types(g, [b, n], [t3])).toEqual([]);
    const next = applyAction(g, { type: 'attack', attack: { type: 'berserk', attackers: [b.id], targets: [t1.id, t2.id] } }, seeded(3));
    const after = next.players[0].dice.find((d) => d.id === b.id)!;
    expect(after.skills).toEqual([]);
    expect(dieSize(after)).toBe(10);
  });

  it('trip is illegal if it can never win', () => {
    const t1 = die(0, 1, 1, 't');
    const twin = die(1, [4, 4], [1, 2]);
    const single = die(1, 4, 1);
    const g = board([t1], [twin, single]);
    expect(types(g, [t1], [twin])).not.toContain('trip');
    expect(types(g, [t1], [single])).toContain('trip');
  });

  it('enumerates legal attacks and blocks passing while one exists', () => {
    const g = board([die(0, 6, 2)], [die(1, 6, 5)]);
    expect(legalAttacks(g)).toEqual([]);
    const g2 = board([die(0, 6, 6)], [die(1, 6, 5)]);
    expect(legalAttacks(g2).length).toBeGreaterThan(0);
    expect(() => applyAction(g2, { type: 'pass' })).toThrow();
  });

  it('two consecutive passes end the round', () => {
    const g = board([die(0, 6, 2)], [die(1, 6, 5, 's')]);
    const g1 = applyAction(g, { type: 'pass' });
    expect(g1.phase).toBe('play');
    expect(g1.turn).toBe(1);
    const g2 = applyAction(g1, { type: 'pass' });
    expect(g2.phase).toBe('roundOver');
    expect(g2.results[0].scores).toEqual([3, 3]);
    expect(g2.results[0].winner).toBeNull();
  });
});

describe('scoring', () => {
  it('kept dice are half, captured dice full', () => {
    const g = board([die(0, 9, 1)], []);
    g.players[0].captured = [die(1, 12, 1)];
    expect(playerScore(g.players[0])).toBe(16.5);
  });

  it('poison is negative, null is zero', () => {
    const g = board([die(0, 10, 1, 'p'), die(0, 20, 1, 'n')], []);
    g.players[0].captured = [die(1, 8, 1, 'p'), { ...die(1, 12, 1), nulled: true }];
    expect(playerScore(g.players[0])).toBe(-10 - 4);
  });
});

describe('initiative', () => {
  it('lowest die goes first, ties compare next lowest, trip and stinger ignored', () => {
    expect(initiativeWinner([die(0, 6, 2), die(0, 6, 5)], [die(1, 6, 3)])).toBe(0);
    expect(initiativeWinner([die(0, 6, 2), die(0, 6, 5)], [die(1, 6, 2), die(1, 6, 4)])).toBe(1);
    expect(initiativeWinner([die(0, 6, 1, 't'), die(0, 6, 5)], [die(1, 6, 3)])).toBe(1);
    expect(initiativeWinner([die(0, 6, 3)], [die(1, 6, 3)])).toBeNull();
  });
});

describe('rounds', () => {
  it('only the loser re-chooses swing dice', () => {
    let g = newGame([findButton('Avis')!, findButton('Hammer')!], ['A', 'B'], seeded(4));
    expect(g.phase).toBe('setup');
    expect(() => applyAction(g, { type: 'setup', player: 0, swing: { X: 3 }, options: {} })).toThrow();
    g = applyAction(g, { type: 'setup', player: 0, swing: { X: 4 }, options: {} });
    g = applyAction(g, { type: 'setup', player: 1, swing: { X: 20 }, options: {} });
    expect(g.phase).toBe('play');
    g.players[0].dice = [];
    g.players[1].captured = [die(0, 4, 1)];
    g.phase = 'roundOver';
    g.results.push({ round: 1, scores: [0, 30], winner: 1 });
    g = applyAction(g, { type: 'nextRound' });
    expect(g.awaitingSetup).toEqual([true, false]);
    expect(g.players[1].swing.X).toBe(20);
  });
});

/** Plays random legal moves to the end of the match. */
function randomMatch(a: string, b: string, seed: number): GameState {
  const rng = seeded(seed);
  let g = newGame([findButton(a)!, findButton(b)!], ['A', 'B'], rng);
  for (let steps = 0; steps < 5000; steps++) {
    if (g.phase === 'matchOver') return g;
    if (g.phase === 'setup') {
      const p: PlayerId = g.awaitingSetup[0] ? 0 : 1;
      const specs = g.players[p].specs;
      const swing = Object.fromEntries(
        swingLetters(specs).map((l) => {
          const [lo, hi] = SWING_RANGES[l];
          return [l, lo + Math.floor(rng() * (hi - lo + 1))];
        }),
      );
      const options = Object.fromEntries(optionIndices(specs).map((i) => [i, specs[i].options![rng() < 0.5 ? 0 : 1]]));
      g = applyAction(g, { type: 'setup', player: p, swing, options }, rng);
    } else if (g.phase === 'roundOver') {
      g = applyAction(g, { type: 'nextRound' }, rng);
    } else {
      const moves = legalAttacks(g);
      g = moves.length
        ? applyAction(g, { type: 'attack', attack: moves[Math.floor(rng() * moves.length)] }, rng)
        : applyAction(g, { type: 'pass' }, rng);
    }
  }
  throw new Error(`Match ${a} vs ${b} did not finish`);
}

describe('simulation', () => {
  it('random matches between every set finish with a winner', () => {
    let seed = 100;
    for (const a of BUTTONS) {
      const b = BUTTONS[(seed * 7) % BUTTONS.length];
      const g = randomMatch(a.name, b.name, seed++);
      expect(g.winner).toBeDefined();
      expect(g.players[g.winner!].roundsWon).toBe(3);
    }
  });
});
