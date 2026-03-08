// Game state management

import { createDie, rollDice, getSwingDice, setSwingSize } from './dice.js';
import { determineInitiative } from './initiative.js';
import { calculateRoundScores, updateMatchScore, getMatchWinner } from './scoring.js';
import {
  executePowerAttack,
  executeSkillAttack,
  hasValidAttacks
} from './attacks.js';

export const GAME_PHASES = {
  CHARACTER_SELECT: 'character_select',
  SWING_SETUP: 'swing_setup',
  PLAYING: 'playing',
  ROUND_END: 'round_end',
  MATCH_END: 'match_end'
};

export function createInitialState() {
  return {
    phase: GAME_PHASES.CHARACTER_SELECT,
    player1: {
      name: 'Player 1',
      character: null,
      dice: [],
      swingChoices: {}
    },
    player2: {
      name: 'Player 2',
      character: null,
      dice: [],
      swingChoices: {}
    },
    currentPlayer: null,
    matchScore: {
      player1: 0,
      player2: 0
    },
    roundNumber: 0,
    passCount: 0,
    roundScores: null,
    matchWinner: null
  };
}

export function selectCharacter(state, player, character) {
  const playerState = state[player];

  // Create dice from character template
  const dice = character.dice.map(dieSpec => {
    if (dieSpec === 'X' || typeof dieSpec === 'string') {
      return createDie(null, 'swing', player, dieSpec);
    } else {
      return createDie(dieSpec, 'normal', player);
    }
  });

  return {
    ...state,
    [player]: {
      ...playerState,
      character,
      dice
    }
  };
}

export function setSwingDice(state, player, swingChoices) {
  const playerState = state[player];

  // Update dice with chosen swing sizes
  const updatedDice = playerState.dice.map(die => {
    if (die.type === 'swing' && swingChoices[die.swingType]) {
      return setSwingSize(die, swingChoices[die.swingType]);
    }
    return die;
  });

  return {
    ...state,
    [player]: {
      ...playerState,
      dice: updatedDice,
      swingChoices
    }
  };
}

export function startRound(state) {
  // Roll all dice
  const player1Dice = rollDice(state.player1.dice.map(d => ({ ...d, captured: false })));
  const player2Dice = rollDice(state.player2.dice.map(d => ({ ...d, captured: false })));

  // Determine who goes first
  const firstPlayer = determineInitiative(player1Dice, player2Dice);

  return {
    ...state,
    phase: GAME_PHASES.PLAYING,
    roundNumber: state.roundNumber + 1,
    player1: { ...state.player1, dice: player1Dice },
    player2: { ...state.player2, dice: player2Dice },
    currentPlayer: firstPlayer === 'draw' ? null : firstPlayer,
    passCount: 0,
    roundScores: null
  };
}

export function executeAttack(state, attackType, attackerIds, targetId) {
  let newState = { ...state };

  if (attackType === 'power') {
    newState = executePowerAttack(newState, attackerIds[0], targetId);
  } else if (attackType === 'skill') {
    newState = executeSkillAttack(newState, attackerIds, targetId);
  }

  // Reset pass count
  newState.passCount = 0;

  // Switch to next player
  newState.currentPlayer = newState.currentPlayer === 'player1' ? 'player2' : 'player1';

  return newState;
}

export function pass(state) {
  const newPassCount = state.passCount + 1;

  // If both players passed, end the round
  if (newPassCount >= 2) {
    return endRound(state);
  }

  // Check if next player can attack
  const nextPlayer = state.currentPlayer === 'player1' ? 'player2' : 'player1';
  const currentPlayerDice = state[nextPlayer].dice;
  const opponentPlayerName = nextPlayer === 'player1' ? 'player2' : 'player1';
  const opponentDice = state[opponentPlayerName].dice;

  const canAttack = hasValidAttacks(currentPlayerDice, opponentDice);

  if (!canAttack) {
    // Forced pass - check if this ends the round
    if (newPassCount + 1 >= 2) {
      return endRound(state);
    }
    return {
      ...state,
      passCount: newPassCount + 1,
      currentPlayer: state.currentPlayer // Stay with current player
    };
  }

  return {
    ...state,
    passCount: newPassCount,
    currentPlayer: nextPlayer
  };
}

export function endRound(state) {
  const roundScores = calculateRoundScores(state);
  const newMatchScore = updateMatchScore(state.matchScore, roundScores.winner);
  const matchWinner = getMatchWinner(newMatchScore);

  return {
    ...state,
    phase: matchWinner ? GAME_PHASES.MATCH_END : GAME_PHASES.ROUND_END,
    roundScores,
    matchScore: newMatchScore,
    matchWinner
  };
}

export function nextRound(state) {
  return {
    ...state,
    phase: GAME_PHASES.SWING_SETUP,
    roundScores: null
  };
}

export function rematch(state) {
  return {
    ...createInitialState(),
    player1: {
      ...state.player1,
      dice: state.player1.character.dice.map(dieSpec => {
        if (dieSpec === 'X' || typeof dieSpec === 'string') {
          return createDie(null, 'swing', 'player1', dieSpec);
        } else {
          return createDie(dieSpec, 'normal', 'player1');
        }
      })
    },
    player2: {
      ...state.player2,
      dice: state.player2.character.dice.map(dieSpec => {
        if (dieSpec === 'X' || typeof dieSpec === 'string') {
          return createDie(null, 'swing', 'player2', dieSpec);
        } else {
          return createDie(dieSpec, 'normal', 'player2');
        }
      })
    },
    phase: GAME_PHASES.SWING_SETUP
  };
}
