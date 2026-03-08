import React, { useReducer } from 'react';
import CharacterSelect from './components/CharacterSelect';
import SwingDiceSetup from './components/SwingDiceSetup';
import GameBoard from './components/GameBoard';
import {
  createInitialState,
  selectCharacter,
  setSwingDice,
  startRound,
  executeAttack,
  pass,
  nextRound,
  rematch,
  GAME_PHASES
} from './game/gameState';

function gameReducer(state, action) {
  switch (action.type) {
    case 'SELECT_CHARACTERS':
      let newState = selectCharacter(state, 'player1', action.player1Character);
      newState = selectCharacter(newState, 'player2', action.player2Character);
      newState.phase = GAME_PHASES.SWING_SETUP;
      return newState;

    case 'SET_SWING_DICE':
      let withSwing = setSwingDice(state, 'player1', action.player1Choices);
      withSwing = setSwingDice(withSwing, 'player2', action.player2Choices);
      return startRound(withSwing);

    case 'EXECUTE_ATTACK':
      return executeAttack(state, action.attackType, action.attackerIds, action.targetId);

    case 'PASS':
      return pass(state);

    case 'NEXT_ROUND':
      return nextRound(state);

    case 'REMATCH':
      return rematch(state);

    default:
      return state;
  }
}

export default function App() {
  const [gameState, dispatch] = useReducer(gameReducer, null, createInitialState);

  const handleCharactersSelected = (player1Character, player2Character) => {
    dispatch({
      type: 'SELECT_CHARACTERS',
      player1Character,
      player2Character
    });
  };

  const handleSwingChoicesComplete = (player1Choices, player2Choices) => {
    dispatch({
      type: 'SET_SWING_DICE',
      player1Choices,
      player2Choices
    });
  };

  const handleExecuteAttack = (attackType, attackerIds, targetId) => {
    dispatch({
      type: 'EXECUTE_ATTACK',
      attackType,
      attackerIds,
      targetId
    });
  };

  const handlePass = () => {
    dispatch({ type: 'PASS' });
  };

  const handleNextRound = () => {
    dispatch({ type: 'NEXT_ROUND' });
  };

  const handleRematch = () => {
    dispatch({ type: 'REMATCH' });
  };

  return (
    <div className="app">
      {gameState.phase === GAME_PHASES.CHARACTER_SELECT && (
        <CharacterSelect onCharactersSelected={handleCharactersSelected} />
      )}

      {gameState.phase === GAME_PHASES.SWING_SETUP && (
        <SwingDiceSetup
          gameState={gameState}
          onSwingChoicesComplete={handleSwingChoicesComplete}
        />
      )}

      {(gameState.phase === GAME_PHASES.PLAYING ||
        gameState.phase === GAME_PHASES.ROUND_END ||
        gameState.phase === GAME_PHASES.MATCH_END) && (
        <GameBoard
          gameState={gameState}
          onExecuteAttack={handleExecuteAttack}
          onPass={handlePass}
          onNextRound={handleNextRound}
          onRematch={handleRematch}
        />
      )}
    </div>
  );
}
