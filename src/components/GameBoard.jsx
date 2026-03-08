import React, { useState } from 'react';
import PlayerArea from './PlayerArea';
import AttackPanel from './AttackPanel';
import ScoreDisplay from './ScoreDisplay';
import RoundEndModal from './RoundEndModal';
import { hasValidAttacks } from '../game/attacks';
import './GameBoard.css';

export default function GameBoard({ gameState, onExecuteAttack, onPass, onNextRound, onRematch }) {
  const [selectedAttackers, setSelectedAttackers] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);

  const currentPlayerKey = gameState.currentPlayer;
  const opponentKey = currentPlayerKey === 'player1' ? 'player2' : 'player1';

  const currentPlayerDice = gameState[currentPlayerKey]?.dice || [];
  const opponentDice = gameState[opponentKey]?.dice || [];

  const activeCurrent = currentPlayerDice.filter(d => !d.captured);
  const activeOpponent = opponentDice.filter(d => !d.captured);

  const handleCurrentPlayerDieClick = (die) => {
    if (die.captured) return;

    setSelectedAttackers(prev => {
      if (prev.includes(die.id)) {
        return prev.filter(id => id !== die.id);
      } else {
        return [...prev, die.id];
      }
    });
  };

  const handleOpponentDieClick = (die) => {
    if (die.captured) return;

    setSelectedTarget(prev => prev === die.id ? null : die.id);
  };

  const handleExecuteAttack = (attackType) => {
    onExecuteAttack(attackType, selectedAttackers, selectedTarget);
    setSelectedAttackers([]);
    setSelectedTarget(null);
  };

  const handlePass = () => {
    onPass();
    setSelectedAttackers([]);
    setSelectedTarget(null);
  };

  const selectableCurrentDice = activeCurrent.map(d => d.id);
  const selectableOpponentDice = activeOpponent.map(d => d.id);

  // Mark selected dice
  const currentWithSelection = currentPlayerDice.map(d => ({
    ...d,
    selected: selectedAttackers.includes(d.id)
  }));

  const opponentWithSelection = opponentDice.map(d => ({
    ...d,
    selected: selectedTarget === d.id
  }));

  const showRoundEnd = gameState.phase === 'round_end' || gameState.phase === 'match_end';

  return (
    <div className="container">
      <div className="game-board">
        <ScoreDisplay
          matchScore={gameState.matchScore}
          roundNumber={gameState.roundNumber}
        />

        <PlayerArea
          player={{
            ...gameState.player2,
            dice: opponentWithSelection
          }}
          playerKey="player2"
          isCurrentPlayer={currentPlayerKey === 'player2'}
          onDieClick={handleOpponentDieClick}
          selectableDice={currentPlayerKey === 'player1' ? selectableOpponentDice : []}
        />

        {currentPlayerKey && (
          <AttackPanel
            selectedAttackers={selectedAttackers}
            selectedTarget={selectedTarget}
            currentPlayerDice={currentWithSelection}
            opponentDice={opponentWithSelection}
            onExecuteAttack={handleExecuteAttack}
            onPass={handlePass}
          />
        )}

        <PlayerArea
          player={{
            ...gameState.player1,
            dice: currentWithSelection
          }}
          playerKey="player1"
          isCurrentPlayer={currentPlayerKey === 'player1'}
          onDieClick={handleCurrentPlayerDieClick}
          selectableDice={currentPlayerKey === 'player1' ? selectableCurrentDice : []}
        />

        {showRoundEnd && gameState.roundScores && (
          <RoundEndModal
            roundScores={gameState.roundScores}
            matchScore={gameState.matchScore}
            onNextRound={onNextRound}
            isMatchEnd={gameState.phase === 'match_end'}
            onRematch={onRematch}
          />
        )}
      </div>
    </div>
  );
}
