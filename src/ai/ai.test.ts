import { describe, expect, it } from 'vitest';
import { BUTTONS, applyAction, findButton, newGame, validateAttack } from '../engine';
import type { Die, GameState, PlayerId, Rng, Skill } from '../engine';
import { attackGain, chooseAction, tripChance } from './ai';
import type { AiOptions, Level } from './ai';

declare const process: { env: Record<string, string | undefined> };

function seeded(seed: number): Rng {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let nextId = 0;
function die(owner: PlayerId, size: number | number[], value: number | number[], skills = ''): Die {
  const sides = Array.isArray(size) ? size : [size];
  const values = Array.isArray(value) ? value : [value];
  return { id: `${owner}-a${nextId++}`, owner, spec: 0, skills: [...skills] as Skill[], sides, values, mood: false };
}

describe('heuristics', () => {
  it('trip chance matches hand calculation', () => {
    // d4 vs d4: P(a >= t) = 10/16
    expect(tripChance(die(0, 4, 1, 't'), die(1, 4, 1))).toBeCloseTo(10 / 16);
    // d1 can never beat a twin
    expect(tripChance(die(0, 1, 1, 't'), die(1, [4, 4], [1, 1]))).toBe(0);
  });

  it('values captures by full swing in score, and dislikes capturing poison', () => {
    const a = die(0, 20, 20);
    const t = die(1, 12, 5);
    const p = die(1, 12, 5, 'p');
    expect(attackGain({ type: 'power', attackers: [a.id], targets: [t.id] }, [a], [t])).toBe(18);
    expect(attackGain({ type: 'power', attackers: [a.id], targets: [p.id] }, [a], [p])).toBe(-18);
  });
});

const FAST: AiOptions = { attackBudget: { ms: Infinity, playouts: 150 }, setupBudget: { ms: Infinity, playouts: 100 } };

/** Plays a match between two AI levels; returns the winner. */
function aiMatch(a: string, b: string, levels: [Level, Level], seed: number, opts: AiOptions = FAST): PlayerId {
  const rng = seeded(seed);
  let g: GameState = newGame([findButton(a)!, findButton(b)!], ['A', 'B'], rng);
  for (let steps = 0; steps < 3000 && g.phase !== 'matchOver'; steps++) {
    if (g.phase === 'roundOver') {
      g = applyAction(g, { type: 'nextRound' }, rng);
      continue;
    }
    const p: PlayerId = g.phase === 'setup' ? (g.awaitingSetup[0] ? 0 : 1) : g.turn;
    const action = chooseAction(g, p, levels[p], { ...opts, rng });
    expect(action).not.toBeNull();
    if (action!.type === 'attack') expect(validateAttack(g, action!.attack)).toBeNull();
    g = applyAction(g, action!, rng);
  }
  expect(g.phase).toBe('matchOver');
  return g.winner!;
}

describe('computer player', () => {
  it('plays only legal moves at every level, across many buttons', () => {
    const levels: Level[] = ['easy', 'medium', 'hard'];
    for (let i = 0; i < 12; i++) {
      const a = BUTTONS[(i * 13) % BUTTONS.length].name;
      const b = BUTTONS[(i * 29 + 5) % BUTTONS.length].name;
      aiMatch(a, b, [levels[i % 3], levels[(i + 1) % 3]], i);
    }
  });
});

// Strength check: ARENA=1 npx vitest run src/ai/ai.test.ts
describe.runIf(process.env.ARENA)('arena', () => {
  const pairings: [Level, Level][] = [
    ['medium', 'easy'],
    ['hard', 'medium'],
  ];
  for (const [strong, weak] of pairings) {
    it(`${strong} vs ${weak}`, () => {
      const matches = Number(process.env.ARENA_MATCHES ?? 40);
      const opts: AiOptions = {
        attackBudget: { ms: Infinity, playouts: Number(process.env.ARENA_PLAYOUTS ?? 600) },
        setupBudget: { ms: Infinity, playouts: 300 },
      };
      let wins = 0;
      for (let i = 0; i < matches; i++) {
        const a = BUTTONS[(i * 17 + 3) % BUTTONS.length].name;
        const b = BUTTONS[(i * 31 + 11) % BUTTONS.length].name;
        // Alternate seats so neither side always gets the same button.
        const strongSeat: PlayerId = i % 2 === 0 ? 0 : 1;
        const levels: [Level, Level] = strongSeat === 0 ? [strong, weak] : [weak, strong];
        if (aiMatch(a, b, levels, 1000 + i, opts) === strongSeat) wins++;
      }
      console.log(`${strong} beat ${weak} in ${wins}/${matches} matches`);
      expect(wins).toBeGreaterThan(matches / 2);
    }, 600_000);
  }
});
