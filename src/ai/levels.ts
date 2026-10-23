// Kept apart from ai.ts so the UI can name the levels without bundling the AI itself.
export type Level = 'easy' | 'medium' | 'hard';

export const LEVEL_NAMES: Record<Level, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
