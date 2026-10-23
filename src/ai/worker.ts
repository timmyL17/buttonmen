// Runs the AI off the main thread so the board stays responsive while it thinks.
import { chooseAction } from './ai';
import type { AiRequest, AiResponse } from './client';

self.onmessage = (e: MessageEvent<AiRequest>) => {
  const { id, state, player, level } = e.data;
  let res: AiResponse;
  try {
    res = { id, action: chooseAction(state, player, level) };
  } catch (err) {
    res = { id, action: null, error: (err as Error).message };
  }
  self.postMessage(res);
};
