import type { Action, GameState, PlayerId } from '../engine';
import type { Level } from './levels';

export interface AiRequest {
  id: number;
  state: GameState;
  player: PlayerId;
  level: Level;
}

export interface AiResponse {
  id: number;
  action: Action | null;
  error?: string;
}

let worker: Worker | null | undefined;
let nextId = 0;
const pending = new Map<number, { req: AiRequest; resolve: (r: AiResponse) => void }>();

async function onMainThread(req: AiRequest): Promise<AiResponse> {
  const { chooseAction } = await import('./ai');
  return { id: req.id, action: chooseAction(req.state, req.player, req.level) };
}

function getWorker(): Worker | null {
  if (worker === undefined) {
    try {
      worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<AiResponse>) => {
        pending.get(e.data.id)?.resolve(e.data);
        pending.delete(e.data.id);
      };
      // If the worker can't load (e.g. offline before it was ever cached), finish on the main thread.
      worker.onerror = () => {
        worker = null;
        for (const [id, p] of pending) {
          pending.delete(id);
          onMainThread(p.req).then(p.resolve);
        }
      };
    } catch {
      worker = null;
    }
  }
  return worker;
}

/** Starts the worker early so it is downloaded (and cached for offline use) up front. */
export function warmUpAi(): void {
  getWorker();
}

/** Asks the computer what to do. Uses a Web Worker, or the main thread if workers are unavailable. */
export async function requestAiAction(state: GameState, player: PlayerId, level: Level): Promise<Action | null> {
  const req: AiRequest = { id: nextId++, state, player, level };
  const w = getWorker();
  const res = w
    ? await new Promise<AiResponse>((resolve) => {
        pending.set(req.id, { req, resolve });
        w.postMessage(req);
      })
    : await onMainThread(req);
  if (res.error) throw new Error(res.error);
  return res.action;
}
