import type { ButtonDef } from './types';

// Recipes from the Buttonweavers button database
// (github.com/buttonmen-dev/buttonmen, deploy/database/data.button.sql),
// limited to buttons whose dice use skills this engine supports.
// Copyright (c) 2012-2026 The ButtonWeavers Team, BSD license: see public/THIRD_PARTY_NOTICES.txt.
const SETS: Record<string, Record<string, string>> = {
  Soldiers: {
    Avis: '(4) (4) (10) (12) (X)',
    Hammer: '(6) (12) (20) (20) (X)',
    Bauer: '(8) (10) (12) (20) (X)',
    Stark: '(4) (6) (8) (X) (X)',
    Clare: '(6) (8) (8) (20) (X)',
    Kith: '(6) (8) (12) (12) (X)',
    Karl: '(4) (6) (6) (20) (X)',
    Iago: '(20) (20) (20) (X)',
    Niles: '(6) (10) (10) (12) (X)',
    Shore: '(4) (4) (20) (20) (X)',
    Hannah: '(8) (10) (10) (10) (X)',
    Kublai: '(4) (8) (12) (20) (X)',
  },
  Sanctum: {
    Dracha: '(4) (10) (20) (20) (X)',
    Ogi: '(2) (4) (10) (X) (X)',
    Fingle: '(6) (7) (8) (12) (X)',
    Ngozi: '(4) (6) (8) (10) (X)',
    Wumpus: '(4) (8) (8) (X) (X)',
  },
  'The Big Cheese': {
    Bunnies: '(1) (1) (1) (1) (X)',
    'Lab Rat': '(2) (2) (2) (2) (X)',
  },
  'Lunch Money': {
    Charity: 't(4) (4) (8) (12) (X)',
    Prudence: '(1) t(4) (6) (12) (X)',
    Hope: 't(1) (2) t(4) (6) (Y)',
    Chastity: 't(6) (6) (10) (10) (X)',
    Faith: 't(2) (6) (10) (12) (Y)',
    Temperance: 't(2) (8) (12) (20) (Y)',
    Patience: '(2) (2) (8) (12) (X)',
  },
  Vampyres: {
    Angel: 's(4) (6) s(12) (12) (X)',
    Buddy: 's(6) (10) s(20) (20) (X)',
    Dunkirk: '(6) (6) (10) (20) s(X)',
    Starchylde: 's(6) (8) s(10) (12) (X)',
    McGinty: '(4) s(10) (12) (12) (X)',
    Tiffany: '(4) s(8) (8) (10) s(X)',
  },
  BROM: {
    Coil: 'p(4) (12) p(20) (20) (V)',
    Bane: 'p(2) p(4) (12) (12) (V)',
    Lucky: '(6) (10) p(12) (20) (X)',
    Shepherd: '(8) (8) p(16) (20) (X)',
    Peace: 's(10) s(12) s(20) s(X) s(X)',
    Crusher: '(10) p(20) (20) (20) (X)',
    Grist: 'p(4) (8) (10) (12) (X)',
    Wastenott: 's(4) s(8) s(10) s(20) s(X)',
  },
  BRAWL: {
    Bennett: '(6) (8) z(20) z(20) (S)',
    Chris: 'z(6) z(8) (10) z(12) (S)',
    Darwin: '(4) (6) z(10) (20) (X)',
    Hale: 'z(8) (12) (20) (20) (S)',
    Morgan: 'z(10) z(12) z(12) z(X)',
    Pearl: '(6) (8) (12) (X) z(X)',
    Sydney: 'z(4) z(6) z(8) z(10) z(X)',
  },
  Bruno: {
    Bruno: 'B(8) B(8) B(20) B(20) B(X)',
    Pappy: '(4) (4) (10) B(20) (X)',
    Synthia: 'B(4) (12) (12) (T) B(T)',
    'The GM': '(4) (8) (12) (16) B(U)',
  },
  'Studio Foglio': {
    Phil: '(8) (8) (10,10) (20) (X)',
    Dixie: '(4) (6) (10) (12,12) (X)',
    Growf: '(4,4) (6) (8) (12) (X)',
    'Buck Godot': '(6,6) (10) (12) (20) (W,W)',
    Agatha: '(4) (6) (8,8) (20) (X)',
    Krosp: '(4) (6,6) (12) (12) (X)',
    Klaus: '(4) p(10,10) (20) (20) (W)',
    'Von Pinn': '(4) p(6,6) (10) (20) (W)',
  },
  Fantasy: {
    Luce: '(8) (10) (20) (4/20) (8/20)',
    Frasquito: '(4) (6) (8) (12) (2/20)',
    Lark: '(6) (20) (2/8) (4/12) (6/10)',
    Theophilus: '(8) (10) (12) (10/20) (20/30)',
    Mischa: '(10) (12) (12) (4/12) (6/12)',
    Chang: '(2/20) (2/20) (4/20) (8/20)',
    Aldric: '(8) (8) (4/12) (8/20) (12/20)',
    Elihu: '(4/6) (4/8) (6/10) (6/12) (8/20)',
  },
  Diceland: {
    Buck: 'g(8) g(10) (12) (20) (X)',
    Cass: '(4) g(4) g(6) (12) (X)',
    'Z-Don': 'g(6) g(8) p(16) (X) (X)',
    Crysis: 'g(8) (10) (10) (X) (X)',
    Golo: 'g(10) g(12) g(20) g(X)',
    Micro: 'g(4) g(4) (12) p(12) g(X)',
  },
  Wonderland: {
    'Mad Hatter': 'q(6) q(6) q(10) q(20) q(X)',
    'Queen Of Hearts': '(6) (8) p(16) (20) (X)',
    'The Jabberwock': '(20) (20) (30) ng(30) (U)',
    'Tweedledum+dee': '(2,2) (4,4) (6,6) (10,10) (T,T)',
    'White Rabbit': '(4) (6) (8) (12) (X)',
  },
  'Dork Victory': {
    Bill: '(20) (20) (20) (V,V)',
    Carson: '(4,4) (8) (10) (12) z(V)',
    Gilly: '(6) (8) z(8) (20) (X)?',
    Igor: '(3) (12) (20) (20) (X)?',
    Ken: '(8) (10) z(12) (20) (V)',
    Matt: 'z(8) (10) (10) z(10) (V)?',
  },
  Blademasters: {
    Michie: '(4) (8) (12) z(12) (X)',
    Danny: '(6) t(8) t(8) (20) (X)',
    Macky: '(4) (6) (10) (X) (Y)',
    Horace: '(8) (10) p(20) (20) (Z)',
    Kainar: '(4) (4) z(10) z(V) (V)',
    Spider: 't(4) p(6) s(8) z(10) (R)',
    Fuyuko: 'q(4) n(6) q(10) (20) (X)',
    Montgomery: '(6) n(8) n(12) (20) (X)',
  },
  Zodiac: {
    Aquarius: '(6) p(6) (8) s(12) (X)',
    Aries: '(6) s(8) z(10) (20) (X)',
    Cancer: 'p(6) g(8) (8) (12) (X)',
    Capricorn: '(4) s(6) (10) g(12) (X)',
    Gemini: '(4,4) (12) (12) z(X) s(X)',
    Leo: '(4) (6) p(10) z(20) (X)',
    Libra: '(4) g(4) z(8,8) (8,8) (V)',
    Pisces: '(4) p(8) z(12) (12) (X)',
  },
};

export const BUTTONS: ButtonDef[] = Object.entries(SETS).flatMap(([set, buttons]) =>
  Object.entries(buttons).map(([name, recipe]) => ({ name, set, recipe })),
);

export const BUTTON_SETS = Object.keys(SETS);

export function findButton(name: string): ButtonDef | undefined {
  return BUTTONS.find((b) => b.name === name);
}
