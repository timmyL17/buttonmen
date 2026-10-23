# Button Men

A mobile-first progressive web app of James Ernest's dice-rolling fighting game
*Button Men* (Cheapass Games). Each side can be played by a person or by the
on-device computer opponent (Easy, Medium or Hard).

## Commands

```bash
npm install
npm run dev      # dev server, also reachable from your phone on the LAN
npm test         # engine unit tests + random full-match simulations
npm run build    # typecheck + production build into dist/
npm run preview  # serve dist/ (service worker active here, not in dev)
```

## Layout

- `src/engine/`: pure, UI-free game logic. `GameState` is plain JSON.
  `applyAction(state, action, rng)` returns a new state; `legalAttacks(state)`
  lists every legal move (this is what an AI opponent will build on).
- `src/ai/`: the computer opponent, run in a Web Worker.
  - **Easy** takes the attack worth the most points right now, with some random moves.
  - **Medium** looks one move ahead: samples the rerolls and subtracts the opponent's best reply.
  - **Hard** plays each promising attack out to the end of the round thousands of
    times (Monte Carlo) and picks the one that wins most often.
  - Swing and option sizes are chosen by simulating whole rounds.
  - `ARENA=1 npx vitest run src/ai --silent=false` pits the levels against each
    other. In testing, Medium beat Easy in about 78% of matches and Hard beat
    Medium in 74%.
- `src/ui/`: vanilla TypeScript views rendered from state, with event delegation.
- `public/`: web manifest, service worker, icons.

## Rules implemented

Power and skill attacks, mandatory attacks, round end on two passes or no dice,
scoring (captured = full size, kept = half), first to 3 rounds, swing dice
(R–Z) where only the round loser may change sizes, option dice and twin dice.
Die skills: Poison, Shadow, Speed, Berserk, Trip, Null, Queer, Stinger, Mood
swing. Button recipes come from the open-source Buttonweavers database.

Not yet supported: Focus, Chance, Fire, Turbo and other skills that need
extra decisions mid-turn or before initiative.

## Credits

Button Men is a game by James Ernest, published by Cheapass Games. This is an
unofficial fan project, not affiliated with or endorsed by Cheapass Games.

Button recipes are from the ButtonWeavers database, Copyright (c) 2012-2026
The ButtonWeavers Team, used under a BSD license. See
[public/THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt) for the full
notice, which is also served with the app.
