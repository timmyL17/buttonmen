import {
  ATTACK_NAMES,
  BUTTONS,
  BUTTON_SETS,
  SKILL_INFO,
  SWING_RANGES,
  applyAction,
  attackTypesFor,
  capturedValue,
  dieValue,
  findButton,
  keptValue,
  legalAttacks,
  newGame,
  optionIndices,
  parseRecipe,
  playerScore,
  swingLetters,
  validateAttack,
} from '../engine';
import type { Action, AttackType, ButtonDef, Die, GameState, PlayerId, PlayerState, Skill, SwingLetter } from '../engine';
import { LEVEL_NAMES } from '../ai/levels';
import type { Level } from '../ai/levels';
import { requestAiAction } from '../ai/client';
import { dieView, specChip } from './dieView';

type Screen = 'home' | 'new' | 'pick' | 'game' | 'rules';

/** Who plays a seat: a person, or the computer at some level. */
type Controller = 'human' | Level;
const CONTROLLERS: Controller[] = ['human', 'easy', 'medium', 'hard'];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface SetupDraft {
  swing: Partial<Record<SwingLetter, number>>;
  options: Record<number, number>;
}

interface UIState {
  screen: Screen;
  back: Screen;
  game: GameState | null;
  attackers: string[];
  targets: string[];
  hint: number;
  logOpen: boolean;
  /** True for the one render right after an action, so roll animations play once. */
  fresh: boolean;
  names: [string, string];
  picks: [string | null, string | null];
  picking: PlayerId;
  pickSet: string;
  drafts: [SetupDraft | null, SetupDraft | null];
  toast: string | null;
  /** Seats for the next match (edited on the New match screen). */
  controllers: [Controller, Controller];
  /** Seats for the match in progress. */
  gameControllers: [Controller, Controller];
  /** The computer is working out its move. */
  thinking: boolean;
  /** Shown in the action bar while the computer's chosen move is previewed. */
  aiBanner: string | null;
}

const SAVE_KEY = 'buttonmen.v1';
const COMMON_SIZES = [1, 2, 4, 6, 8, 10, 12, 16, 20, 30];

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

function load(): Partial<UIState> {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export class App {
  private ui: UIState;
  private toastTimer = 0;
  /** Increments for each computer move so a stale one can tell it was superseded. */
  private aiRun = 0;

  constructor(private root: HTMLElement) {
    const saved = load();
    this.ui = {
      screen: 'home',
      back: 'home',
      game: saved.game?.version === 1 ? saved.game : null,
      attackers: [],
      targets: [],
      hint: 0,
      logOpen: false,
      fresh: false,
      names: saved.names ?? ['Player 1', 'Player 2'],
      picks: saved.picks ?? [null, null],
      picking: 0,
      pickSet: 'All',
      drafts: [null, null],
      toast: null,
      controllers: saved.controllers ?? ['human', 'medium'],
      gameControllers: saved.gameControllers ?? ['human', 'human'],
      thinking: false,
      aiBanner: null,
    };
    root.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('input', (e) => this.onInput(e));
    this.render();
  }

  private save() {
    try {
      const { game, names, picks, controllers, gameControllers } = this.ui;
      localStorage.setItem(SAVE_KEY, JSON.stringify({ game, names, picks, controllers, gameControllers }));
    } catch {
      // Storage unavailable (private mode): the game still works, it just won't persist.
    }
  }

  private flash(msg: string) {
    this.ui.toast = msg;
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.ui.toast = null;
      this.render();
    }, 2600);
  }

  private dispatch(action: Action) {
    if (!this.ui.game) return;
    try {
      this.ui.game = applyAction(this.ui.game, action);
    } catch (err) {
      this.flash((err as Error).message);
      this.render();
      return;
    }
    this.ui.attackers = [];
    this.ui.targets = [];
    this.ui.hint = 0;
    this.ui.fresh = true;
    if (this.ui.game.phase === 'setup') this.ui.drafts = [null, null];
    this.save();
    this.update();
  }

  /** Re-render, then let the computer move if it is its turn. */
  private update() {
    this.render();
    this.runComputer();
  }

  private isComputer(p: PlayerId) {
    return this.ui.gameControllers[p] !== 'human';
  }

  /** The computer seat that should act now, if any. */
  private computerToAct(g: GameState): PlayerId | null {
    if (g.phase === 'setup') return ([0, 1] as PlayerId[]).find((p) => g.awaitingSetup[p] && this.isComputer(p)) ?? null;
    if (g.phase === 'play' && this.isComputer(g.turn)) return g.turn;
    return null;
  }

  private async runComputer() {
    const ui = this.ui;
    const g = ui.game;
    if (!g || ui.screen !== 'game' || ui.thinking) return;
    const p = this.computerToAct(g);
    if (p === null) return;
    const run = ++this.aiRun;
    ui.thinking = true;
    ui.attackers = [];
    ui.targets = [];
    this.render();
    // Anything that replaces the game (a move, a new match) makes this result stale.
    const stillCurrent = () => ui.game === g && ui.screen === 'game';
    try {
      const started = performance.now();
      const action = await requestAiAction(g, p, ui.gameControllers[p] as Level);
      // A short pause so the computer's moves don't land instantly.
      await sleep(Math.max(0, 450 - (performance.now() - started)));
      if (!stillCurrent()) return;
      // The board was just redrawn for "thinking", so roll animations have already played.
      ui.fresh = false;
      if (action?.type === 'attack') {
        ui.attackers = [...action.attack.attackers];
        ui.targets = [...action.attack.targets];
        ui.aiBanner = `${ATTACK_NAMES[action.attack.type]} attack`;
        this.render();
        await sleep(900);
      } else if (action?.type === 'pass') {
        ui.aiBanner = 'No attacks, passing';
        this.render();
        await sleep(900);
      }
      if (!stillCurrent()) return;
      ui.thinking = false;
      ui.aiBanner = null;
      if (action) this.dispatch(action);
    } catch (err) {
      this.flash(`Computer error: ${(err as Error).message}`);
    } finally {
      if (run === this.aiRun && ui.thinking) {
        ui.thinking = false;
        ui.aiBanner = null;
        this.update();
      }
    }
  }

  private startMatch(buttons: [ButtonDef, ButtonDef]) {
    this.ui.game = newGame(buttons, this.ui.names);
    this.ui.gameControllers = [...this.ui.controllers];
    this.aiRun++;
    this.ui.thinking = false;
    this.ui.aiBanner = null;
    this.ui.drafts = [null, null];
    this.ui.attackers = [];
    this.ui.targets = [];
    this.ui.fresh = true;
    this.ui.screen = 'game';
    this.save();
  }

  // ---------------------------------------------------------------- events

  private onInput(e: Event) {
    const el = e.target as HTMLInputElement;
    if (el.dataset.act === 'name') {
      const i = Number(el.dataset.arg) as PlayerId;
      this.ui.names[i] = el.value.slice(0, 20);
      this.save();
    }
  }

  private onClick(e: Event) {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || (el as HTMLButtonElement).disabled) return;
    const arg = el.dataset.arg ?? '';
    const ui = this.ui;
    const g = ui.game;
    switch (el.dataset.act) {
      case 'goto':
        ui.back = ui.screen;
        ui.screen = arg as Screen;
        break;
      case 'back':
        ui.screen = ui.screen === 'pick' ? 'new' : ui.screen === 'rules' ? ui.back : 'home';
        break;
      case 'continue':
        ui.screen = 'game';
        ui.fresh = false;
        break;
      case 'choose':
        ui.picking = Number(arg) as PlayerId;
        ui.screen = 'pick';
        break;
      case 'random': {
        const i = Number(arg);
        ui.picks[i] = BUTTONS[Math.floor(Math.random() * BUTTONS.length)].name;
        this.save();
        break;
      }
      case 'set':
        ui.pickSet = arg;
        break;
      case 'controller': {
        const [i, c] = arg.split(':') as [string, Controller];
        const p = Number(i) as PlayerId;
        const defaultName = `Player ${p + 1}`;
        if (c !== 'human' && ui.names[p] === defaultName) ui.names[p] = 'Computer';
        if (c === 'human' && ui.names[p] === 'Computer') ui.names[p] = defaultName;
        ui.controllers[p] = c;
        this.save();
        break;
      }
      case 'pickButton':
        ui.picks[ui.picking] = arg;
        ui.screen = 'new';
        this.save();
        break;
      case 'start': {
        const [a, b] = ui.picks.map((n) => (n ? findButton(n) : undefined));
        if (a && b) this.startMatch([a, b]);
        break;
      }
      case 'rematch':
        if (g) {
          ui.names = [g.players[0].name, g.players[1].name];
          ui.controllers = [...ui.gameControllers];
          this.startMatch([g.players[0].button, g.players[1].button]);
        }
        break;
      case 'die':
        this.toggleDie(arg || el.dataset.id!);
        break;
      case 'clear':
        ui.attackers = [];
        ui.targets = [];
        break;
      case 'hint':
        if (g) {
          const moves = legalAttacks(g);
          if (moves.length) {
            const m = moves[ui.hint % moves.length];
            ui.hint++;
            ui.attackers = [...m.attackers];
            ui.targets = [...m.targets];
          }
        }
        break;
      case 'attack':
        this.dispatch({
          type: 'attack',
          attack: { type: arg as AttackType, attackers: ui.attackers, targets: ui.targets },
        });
        return;
      case 'pass':
        this.dispatch({ type: 'pass' });
        return;
      case 'nextRound':
        this.dispatch({ type: 'nextRound' });
        return;
      case 'log':
        ui.logOpen = !ui.logOpen;
        break;
      case 'swing': {
        const [p, letter, val] = arg.split(':');
        this.draft(Number(p) as PlayerId).swing[letter as SwingLetter] = Number(val);
        break;
      }
      case 'option': {
        const [p, idx, val] = arg.split(':').map(Number);
        this.draft(p as PlayerId).options[idx] = val;
        break;
      }
      case 'ready': {
        const p = Number(arg) as PlayerId;
        const d = this.draft(p);
        this.dispatch({ type: 'setup', player: p, swing: d.swing, options: d.options });
        return;
      }
      case 'abandon':
        if (confirm('Abandon this match?')) {
          this.aiRun++;
          ui.thinking = false;
          ui.game = null;
          ui.screen = 'home';
          this.save();
        }
        break;
    }
    ui.fresh = false;
    this.update();
  }

  private toggleDie(id: string) {
    const g = this.ui.game;
    if (!g || g.phase !== 'play' || this.ui.thinking || this.isComputer(g.turn)) return;
    const owner = Number(id.split('-')[0]);
    const list = owner === g.turn ? this.ui.attackers : this.ui.targets;
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else list.push(id);
  }

  /** Swing/option choices being edited for a player, seeded from last round or sensible defaults. */
  private draft(p: PlayerId): SetupDraft {
    const existing = this.ui.drafts[p];
    if (existing) return existing;
    const pl = this.ui.game!.players[p];
    const swing: SetupDraft['swing'] = {};
    for (const l of swingLetters(pl.specs)) {
      const [lo, hi] = SWING_RANGES[l];
      const mid = (lo + hi) / 2;
      const fallback = COMMON_SIZES.filter((s) => s >= lo && s <= hi).reduce((a, b) =>
        Math.abs(b - mid) < Math.abs(a - mid) ? b : a,
      );
      swing[l] = pl.swing[l] ?? fallback;
    }
    const options: Record<number, number> = {};
    for (const i of optionIndices(pl.specs)) options[i] = pl.options[i] ?? pl.specs[i].options![1];
    return (this.ui.drafts[p] = { swing, options });
  }

  // ---------------------------------------------------------------- views

  render() {
    const ui = this.ui;
    let html: string;
    switch (ui.screen) {
      case 'home':
        html = this.homeView();
        break;
      case 'new':
        html = this.newView();
        break;
      case 'pick':
        html = this.pickView();
        break;
      case 'rules':
        html = this.rulesView();
        break;
      case 'game':
        html = !ui.game ? this.homeView() : ui.game.phase === 'setup' ? this.setupView(ui.game) : this.boardView(ui.game);
        break;
    }
    if (ui.toast) html += `<div class="toast" role="status">${esc(ui.toast)}</div>`;
    this.root.innerHTML = html;
  }

  private topbar(title: string, right = '') {
    return `<header class="topbar">
      <button class="icon-btn" data-act="back" aria-label="Back">‹</button>
      <h2>${title}</h2>
      <div class="topbar-right">${right}</div>
    </header>`;
  }

  private homeView() {
    const g = this.ui.game;
    const inProgress = g && g.phase !== 'matchOver';
    return `<div class="screen home">
      <div class="hero">
        <div class="hero-dice">
          <span class="hd hd1">4</span><span class="hd hd2">12</span><span class="hd hd3">7</span>
        </div>
        <h1>Button Men</h1>
        <p class="tagline">The dice-rolling fighting game</p>
      </div>
      <div class="home-actions">
        ${
          inProgress
            ? `<button class="btn primary" data-act="continue">Continue match
                <small>${esc(g.players[0].button.name)} vs ${esc(g.players[1].button.name)} · round ${g.round}</small></button>`
            : ''
        }
        <button class="btn ${inProgress ? '' : 'primary'}" data-act="goto" data-arg="new">New match</button>
        <button class="btn ghost" data-act="goto" data-arg="rules">How to play</button>
      </div>
    </div>`;
  }

  private newView() {
    const ui = this.ui;
    const slot = (i: PlayerId) => {
      const b = ui.picks[i] ? findButton(ui.picks[i]!) : undefined;
      return `<div class="card slot p${i}">
        <input class="name-input" data-act="name" data-arg="${i}" value="${esc(ui.names[i])}" aria-label="Player ${i + 1} name" maxlength="20">
        <div class="seg" role="group" aria-label="Played by">${CONTROLLERS.map(
          (c) =>
            `<button class="seg-btn ${ui.controllers[i] === c ? 'on' : ''}" data-act="controller" data-arg="${i}:${c}">${
              c === 'human' ? 'Human' : LEVEL_NAMES[c]
            }</button>`,
        ).join('')}</div>
        ${
          b
            ? `<div class="slot-button"><strong>${esc(b.name)}</strong> <span class="muted">${esc(b.set)}</span></div>
               <div class="chips">${parseRecipe(b.recipe).map(specChip).join('')}</div>`
            : '<div class="slot-button muted">No fighter chosen</div>'
        }
        <div class="row">
          <button class="btn small" data-act="choose" data-arg="${i}">Choose…</button>
          <button class="btn small ghost" data-act="random" data-arg="${i}">Random</button>
        </div>
      </div>`;
    };
    const ready = ui.picks[0] && ui.picks[1];
    return `<div class="screen">
      ${this.topbar('New match')}
      <main class="scroll pad">
        ${slot(1)}
        <div class="vs">vs</div>
        ${slot(0)}
        <p class="muted center">${
          ui.controllers.every((c) => c === 'human')
            ? 'Player 1 sits at the bottom of the board. You control both sides.'
            : 'Choose Easy, Medium or Hard to have the computer play that side.'
        }</p>
      </main>
      <footer class="actionbar"><button class="btn primary wide" data-act="start" ${ready ? '' : 'disabled'}>Start match</button></footer>
    </div>`;
  }

  private pickView() {
    const ui = this.ui;
    const sets = ['All', ...BUTTON_SETS];
    const list = BUTTONS.filter((b) => ui.pickSet === 'All' || b.set === ui.pickSet);
    return `<div class="screen">
      ${this.topbar(`Fighter for ${esc(ui.names[ui.picking])}`)}
      <nav class="setbar">${sets
        .map((s) => `<button class="pill ${s === ui.pickSet ? 'on' : ''}" data-act="set" data-arg="${esc(s)}">${esc(s)}</button>`)
        .join('')}</nav>
      <main class="scroll">
        ${list
          .map(
            (b) => `<button class="pick-row ${ui.picks[ui.picking] === b.name ? 'on' : ''}" data-act="pickButton" data-arg="${esc(b.name)}">
              <span class="pick-name">${esc(b.name)} <span class="muted">${esc(b.set)}</span></span>
              <span class="chips">${parseRecipe(b.recipe).map(specChip).join('')}</span>
            </button>`,
          )
          .join('')}
      </main>
    </div>`;
  }

  private setupView(g: GameState) {
    const card = (p: PlayerId) => {
      const pl = g.players[p];
      const letters = swingLetters(pl.specs);
      const opts = optionIndices(pl.specs);
      const head = `<h3>${esc(pl.name)} <span class="muted">· ${esc(pl.button.name)}</span></h3>`;
      if (!g.awaitingSetup[p]) {
        const sizes = [
          ...letters.map((l) => `${l}=${pl.swing[l]}`),
          ...opts.map((i) => `${pl.specs[i].recipe}→${pl.options[i]}`),
        ];
        const last = g.results[g.results.length - 1];
        const choseThisRound = !last || last.winner !== p;
        let text: string;
        if (!sizes.length) text = 'No dice to choose. Ready.';
        else if (!choseThisRound) text = `Keeps ${sizes.join(', ')} (won last round). Ready.`;
        // Like the real game, a fresh choice stays secret until both players are ready.
        else if (this.isComputer(p)) text = 'Ready. Its choice is revealed when the round starts.';
        else text = `Chose ${sizes.join(', ')}. Ready.`;
        return `<div class="card setup p${p} done">${head}<p class="muted">${text}</p></div>`;
      }
      if (this.isComputer(p)) {
        return `<div class="card setup p${p} done">${head}<p class="muted thinking">Choosing dice</p></div>`;
      }
      const d = this.draft(p);
      const swingRows = letters.map((l) => {
        const [lo, hi] = SWING_RANGES[l];
        const v = d.swing[l]!;
        const quick = COMMON_SIZES.filter((s) => s >= lo && s <= hi);
        return `<div class="swing-row">
          <div class="swing-head"><strong>${l}</strong> <span class="muted">swing ${lo}–${hi}</span></div>
          <div class="stepper">
            <button class="icon-btn" data-act="swing" data-arg="${p}:${l}:${Math.max(lo, v - 1)}" aria-label="Smaller">−</button>
            <span class="stepper-val">${v}</span>
            <button class="icon-btn" data-act="swing" data-arg="${p}:${l}:${Math.min(hi, v + 1)}" aria-label="Larger">+</button>
          </div>
          <div class="chips">${quick
            .map((s) => `<button class="pill ${s === v ? 'on' : ''}" data-act="swing" data-arg="${p}:${l}:${s}">${s}</button>`)
            .join('')}</div>
        </div>`;
      });
      const optRows = opts.map((i) => {
        const spec = pl.specs[i];
        return `<div class="swing-row">
          <div class="swing-head"><strong>${esc(spec.recipe)}</strong> <span class="muted">option die</span></div>
          <div class="chips">${spec
            .options!.map(
              (s) => `<button class="pill ${d.options[i] === s ? 'on' : ''}" data-act="option" data-arg="${p}:${i}:${s}">d${s}</button>`,
            )
            .join('')}</div>
        </div>`;
      });
      return `<div class="card setup p${p}">
        <h3>${esc(pl.name)} <span class="muted">· ${esc(pl.button.name)}</span></h3>
        <div class="chips">${pl.specs.map(specChip).join('')}</div>
        ${swingRows.join('')}${optRows.join('')}
        <button class="btn primary wide" data-act="ready" data-arg="${p}">Ready</button>
      </div>`;
    };
    const last = g.results[g.results.length - 1];
    return `<div class="screen">
      ${this.topbar(`Round ${g.round} · choose dice`)}
      <main class="scroll pad">
        ${last ? `<p class="muted center">${last.winner === null ? 'Last round was a draw — both players may change.' : `The loser of round ${last.round} may change their dice.`}</p>` : '<p class="muted center">Pick sizes for swing and option dice. Bigger dice score more but roll high — and low dice win initiative.</p>'}
        ${card(1)}${card(0)}
      </main>
    </div>`;
  }

  private sideView(g: GameState, p: PlayerId) {
    const ui = this.ui;
    const pl = g.players[p];
    const active = g.phase === 'play' && g.turn === p;
    const rolled = new Set(ui.fresh ? (g.lastAction?.rolled ?? []) : []);
    const pips = Array.from({ length: g.winsNeeded }, (_, i) => `<span class="pip ${i < pl.roundsWon ? 'on' : ''}"></span>`).join('');
    const dice = pl.dice
      .map((d) =>
        dieView(d, {
          selected: ui.attackers.includes(d.id) ? 'attacker' : ui.targets.includes(d.id) ? 'target' : undefined,
          rolled: rolled.has(d.id),
          disabled: g.phase !== 'play' || this.isComputer(g.turn),
        }),
      )
      .join('');
    const captured = pl.captured.length
      ? `<div class="captured" aria-label="Captured dice"><span class="muted">Captured</span>${pl.captured
          .map((d) => dieView(d, { small: true }))
          .join('')}</div>`
      : '';
    const info = `<div class="pinfo">
      <div class="pname"><strong>${esc(pl.name)}</strong> <span class="muted">${esc(pl.button.name)}</span>${
        this.isComputer(p) ? ` <span class="tag">CPU ${LEVEL_NAMES[ui.gameControllers[p] as Level]}</span>` : ''
      }</div>
      <div class="pips" aria-label="${pl.roundsWon} rounds won">${pips}</div>
      <div class="pscore" title="Current score">${fmt(playerScore(pl))}</div>
    </div>`;
    const diceRow = `<div class="dice-row">${dice || '<span class="muted">No dice left</span>'}</div>`;
    const body = p === 1 ? info + captured + diceRow : diceRow + captured + info;
    return `<section class="side p${p} ${active ? 'active' : ''}">${body}</section>`;
  }

  private selectionSummary(g: GameState) {
    const me = g.players[g.turn];
    const opp = g.players[1 - g.turn];
    const vals = (ids: string[], dice: Die[]) => ids.map((id) => dieValue(dice.find((d) => d.id === id)!));
    const a = vals(this.ui.attackers, me.dice);
    const t = vals(this.ui.targets, opp.dice);
    const side = (v: number[]) => (v.length > 1 ? `${v.join('+')}=${v.reduce((x, y) => x + y, 0)}` : `${v[0] ?? '—'}`);
    return `<span class="sel-a">${side(a)}</span> → <span class="sel-t">${side(t)}</span>`;
  }

  private actionBar(g: GameState) {
    const ui = this.ui;
    if (g.phase !== 'play') return '';
    if (this.isComputer(g.turn)) {
      const name = esc(g.players[g.turn].name);
      const msg = ui.aiBanner
        ? `<strong>${name}:</strong> ${esc(ui.aiBanner)}${ui.attackers.length ? ` · ${this.selectionSummary(g)}` : ''}`
        : `<span class="thinking">${name} is thinking</span>`;
      // Same shape as the human bar so the board doesn't jump between turns.
      return `<footer class="actionbar">
        <div class="bar-msg">${msg}</div>
        <div class="row">
          <button class="btn small ghost" disabled>Hint</button>
          <button class="btn small ghost" disabled>Clear</button>
          <button class="btn small ghost" disabled>Pass</button>
        </div>
      </footer>`;
    }
    const legal = legalAttacks(g);
    if (legal.length === 0) {
      return `<footer class="actionbar">
        <div class="bar-msg">No legal attacks for ${esc(g.players[g.turn].name)}.</div>
        <button class="btn primary wide" data-act="pass">Pass</button>
      </footer>`;
    }
    const hasSel = ui.attackers.length + ui.targets.length > 0;
    const types = attackTypesFor(g, ui.attackers, ui.targets);
    let main: string;
    if (!hasSel) {
      main = `<div class="bar-msg">Tap your dice to attack with, then the die to capture.</div>`;
    } else if (types.length) {
      main = `<div class="bar-msg">${this.selectionSummary(g)}</div>
        <div class="row">${types
          .map((t) => `<button class="btn primary" data-act="attack" data-arg="${t}">${ATTACK_NAMES[t]} attack</button>`)
          .join('')}</div>`;
    } else {
      const reason =
        ui.attackers.length && ui.targets.length
          ? validateAttack(g, { type: ui.attackers.length > 1 ? 'skill' : 'power', attackers: ui.attackers, targets: ui.targets })
          : ui.attackers.length
            ? 'Now tap a die to capture'
            : 'Now tap your attacking dice';
      main = `<div class="bar-msg">${this.selectionSummary(g)} <span class="muted">· ${esc(reason ?? 'Not a valid attack')}</span></div>`;
    }
    return `<footer class="actionbar">
      ${main}
      <div class="row">
        <button class="btn small ghost" data-act="hint">Hint</button>
        <button class="btn small ghost" data-act="clear" ${hasSel ? '' : 'disabled'}>Clear</button>
        <button class="btn small ghost" disabled title="You must attack when you can">Pass</button>
      </div>
    </footer>`;
  }

  private boardView(g: GameState) {
    const ui = this.ui;
    const turnName = esc(g.players[g.turn].name);
    const lastLog = g.log[g.log.length - 1];
    const status =
      g.phase === 'play'
        ? `<div class="turn p${g.turn}">${turnName}’s turn</div>`
        : `<div class="turn">Round ${g.round} over</div>`;
    const logPanel = ui.logOpen
      ? `<div class="sheet" role="dialog" aria-label="Game log">
          <div class="sheet-head"><strong>Game log</strong><button class="icon-btn" data-act="log" aria-label="Close">×</button></div>
          <ol class="log">${[...g.log]
            .reverse()
            .map((l) => `<li class="${l.player !== undefined ? `p${l.player}` : 'sys'}">${l.player !== undefined ? `<strong>${esc(g.players[l.player].name)}:</strong> ` : ''}${esc(l.text)}</li>`)
            .join('')}</ol>
        </div>`
      : '';
    return `<div class="screen game">
      <header class="topbar">
        <button class="icon-btn" data-act="back" aria-label="Home">‹</button>
        <h2>Round ${g.round} <span class="muted">· first to ${g.winsNeeded}</span></h2>
        <div class="topbar-right">
          <button class="icon-btn" data-act="log" aria-label="Log">☰</button>
          <button class="icon-btn" data-act="goto" data-arg="rules" aria-label="Rules">?</button>
        </div>
      </header>
      <main class="board">
        ${this.sideView(g, 1)}
        <div class="status">${status}<div class="last muted">${lastLog ? esc(lastLog.text) : ''}</div></div>
        ${this.sideView(g, 0)}
      </main>
      ${this.actionBar(g)}
      ${g.phase === 'roundOver' || g.phase === 'matchOver' ? this.roundOverView(g) : ''}
      ${logPanel}
    </div>`;
  }

  private breakdown(pl: PlayerState) {
    const kept = pl.dice.reduce((a, d) => a + keptValue(d), 0);
    const cap = pl.captured.reduce((a, d) => a + capturedValue(d), 0);
    return `captured ${fmt(cap)} + kept ${fmt(kept)}`;
  }

  private roundOverView(g: GameState) {
    const last = g.results[g.results.length - 1];
    const over = g.phase === 'matchOver';
    const title = over
      ? `${esc(g.players[g.winner!].name)} wins the match!`
      : last.winner === null
        ? `Round ${last.round} is a draw`
        : `${esc(g.players[last.winner].name)} wins round ${last.round}`;
    const row = (p: PlayerId) => `<div class="result-row p${p} ${last.winner === p ? 'win' : ''}">
      <div><strong>${esc(g.players[p].name)}</strong><div class="muted small">${this.breakdown(g.players[p])}</div></div>
      <div class="big">${fmt(last.scores[p])}</div>
    </div>`;
    const history = g.results
      .map((r) => `<li>R${r.round}: ${fmt(r.scores[0])}–${fmt(r.scores[1])} ${r.winner === null ? 'draw' : `· ${esc(g.players[r.winner].name)}`}</li>`)
      .join('');
    return `<div class="overlay"><div class="modal">
      <h2>${title}</h2>
      ${row(0)}${row(1)}
      <div class="match-score">Rounds: ${g.players[0].roundsWon} – ${g.players[1].roundsWon}</div>
      <ul class="history muted">${history}</ul>
      ${
        over
          ? `<button class="btn primary wide" data-act="rematch">Rematch</button>
             <button class="btn wide" data-act="goto" data-arg="new">New match</button>`
          : `<button class="btn primary wide" data-act="nextRound">Next round</button>`
      }
      <button class="btn ghost wide" data-act="log">View log</button>
    </div></div>`;
  }

  private rulesView() {
    const skill = (s: Skill) =>
      `<li><span class="badge sk-${s}">${s}</span> <strong>${SKILL_INFO[s].name}.</strong> ${esc(SKILL_INFO[s].short)}</li>`;
    const swing = Object.entries(SWING_RANGES)
      .map(([l, [lo, hi]]) => `${l} ${lo}–${hi}`)
      .join(' · ');
    return `<div class="screen">
      ${this.topbar('How to play')}
      <main class="scroll pad rules">
        <h3>Goal</h3>
        <p>Each fighter (“button”) has a set of dice. Capture your opponent’s dice and win 3 rounds.</p>
        <h3>Start of a round</h3>
        <p>Choose sizes for any swing dice (letters) and option dice (like <em>6/12</em>). Everyone rolls; whoever has the <strong>lowest</strong> single die goes first (ties compare the next lowest).</p>
        <h3>Your turn</h3>
        <p>You <strong>must</strong> attack if you can, otherwise you pass. Only the number showing matters, not the die’s size.</p>
        <ul>
          <li><strong>Power:</strong> one of your dice captures one die showing the same or less.</li>
          <li><strong>Skill:</strong> several of your dice that add up <em>exactly</em> to one opposing die capture it.</li>
        </ul>
        <p>Dice that attack are rerolled. Captured dice are set aside.</p>
        <h3>End of the round</h3>
        <p>The round ends when both players pass in a row, or someone runs out of dice. Score the <strong>full size</strong> of each die you captured plus <strong>half the size</strong> of each die you still have. Highest score wins the round.</p>
        <p>After a round, only the loser may change their swing and option dice.</p>
        <h3>Swing dice</h3>
        <p class="muted">${swing}</p>
        <h3>Special dice</h3>
        <ul class="skills">${(Object.keys(SKILL_INFO) as Skill[]).map(skill).join('')}
          <li><span class="badge sk-mood">?</span> <strong>Mood swing.</strong> Changes to a random size in its range each time it attacks.</li>
          <li><strong>Twin dice</strong> like (4,4) roll two dice and count as one die showing the total.</li>
        </ul>
        <h3>Using this app</h3>
        <p>Tap the dice of the player whose turn it is to select attackers (blue), then tap opposing dice to target (red). Valid attacks appear at the bottom. <em>Hint</em> cycles through every legal attack.</p>
        ${this.ui.game ? '<button class="btn ghost wide" data-act="abandon">Abandon current match</button>' : ''}
        <h3>Credits</h3>
        <p class="muted small">Button Men is a game by James Ernest, published by Cheapass Games. This is an unofficial fan project, not affiliated with or endorsed by Cheapass Games. Button recipes are from the ButtonWeavers database, © 2012–2026 The ButtonWeavers Team, used under a BSD license. <a href="./THIRD_PARTY_NOTICES.txt" target="_blank" rel="noopener">Full notices</a>.</p>
      </main>
    </div>`;
  }
}
