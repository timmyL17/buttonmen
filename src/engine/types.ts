// Core data types for the Button Men engine. Everything in GameState is plain
// JSON so it can be saved to localStorage and cloned cheaply (e.g. by an AI).

export type PlayerId = 0 | 1;

/** Die skills supported by the engine (Buttonweavers letter codes). */
export type Skill =
  | 'p' // Poison
  | 's' // Shadow
  | 'z' // Speed
  | 'B' // Berserk
  | 't' // Trip
  | 'n' // Null
  | 'q' // Queer
  | 'g'; // Stinger

export type SwingLetter = 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';

/** One sub-die of a recipe die: a fixed size or a swing letter. */
export type SidesSpec = number | SwingLetter;

/** A parsed die from a button recipe, e.g. "ps(10,10)" or "(X)?" or "(4/12)". */
export interface DieSpec {
  recipe: string;
  skills: Skill[];
  /** One entry for a normal die, two for a twin die. */
  sides: SidesSpec[];
  /** Option die: player picks one of these sizes. */
  options?: [number, number];
  /** Mood swing: changes size randomly whenever it attacks. */
  mood: boolean;
}

export interface ButtonDef {
  name: string;
  set: string;
  recipe: string;
}

/** A die in play. */
export interface Die {
  id: string;
  owner: PlayerId;
  /** Index into the owner's recipe. */
  spec: number;
  skills: Skill[];
  /** Current size of each sub-die. */
  sides: number[];
  /** Current rolled value of each sub-die. */
  values: number[];
  /** Swing letter if this is a (still) swing die. */
  swing?: SwingLetter;
  mood: boolean;
  /** Set on dice captured by a Null attack: worth nothing. */
  nulled?: boolean;
}

export type AttackType = 'power' | 'skill' | 'shadow' | 'speed' | 'berserk' | 'trip';

export interface Attack {
  type: AttackType;
  attackers: string[];
  targets: string[];
}

export interface PlayerState {
  name: string;
  button: ButtonDef;
  specs: DieSpec[];
  /** Chosen size per swing letter. */
  swing: Partial<Record<SwingLetter, number>>;
  /** Chosen size per option-die spec index. */
  options: Record<number, number>;
  dice: Die[];
  captured: Die[];
  roundsWon: number;
}

export type Phase = 'setup' | 'play' | 'roundOver' | 'matchOver';

export interface LogEntry {
  round: number;
  player?: PlayerId;
  text: string;
}

export interface RoundResult {
  round: number;
  scores: [number, number];
  winner: PlayerId | null;
}

export interface GameState {
  version: 1;
  phase: Phase;
  players: [PlayerState, PlayerState];
  round: number;
  winsNeeded: number;
  /** Player whose turn it is (during play). */
  turn: PlayerId;
  /** Consecutive passes; two ends the round. */
  passes: number;
  /** During setup: which players still need to choose swing/option sizes. */
  awaitingSetup: [boolean, boolean];
  results: RoundResult[];
  log: LogEntry[];
  /** Dice ids touched by the most recent action (for UI animation). */
  lastAction?: { rolled: string[]; captured: string[] };
  winner?: PlayerId;
}

export type Action =
  | {
      type: 'setup';
      player: PlayerId;
      swing: Partial<Record<SwingLetter, number>>;
      options: Record<number, number>;
    }
  | { type: 'attack'; attack: Attack }
  | { type: 'pass' }
  | { type: 'nextRound' };

export type Rng = () => number;
