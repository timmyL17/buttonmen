# Button Men

A mobile-first progressive web app of James Ernest's dice-rolling fighting game
*Button Men* (Cheapass Games). Hot-seat for now: one person controls both
players.

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
