import React from 'react';
import DieDisplay from './DieDisplay';
import './PlayerArea.css';

export default function PlayerArea({
  player,
  playerKey,
  isCurrentPlayer,
  onDieClick,
  selectableDice = []
}) {
  const activeDice = player.dice.filter(d => !d.captured);
  const capturedDice = player.dice.filter(d => d.captured);

  return (
    <div className={`player-area ${isCurrentPlayer ? 'player-active' : ''}`}>
      <div className="player-header">
        <h3>{player.name}</h3>
        {player.character && (
          <span className="character-name">{player.character.name}</span>
        )}
        {isCurrentPlayer && <span className="turn-indicator">TURN</span>}
      </div>

      <div className="dice-container">
        {activeDice.map(die => (
          <DieDisplay
            key={die.id}
            die={die}
            onClick={onDieClick}
            selectable={selectableDice.includes(die.id)}
          />
        ))}
      </div>

      {capturedDice.length > 0 && (
        <div className="captured-section">
          <div className="captured-label">Captured:</div>
          <div className="dice-container">
            {capturedDice.map(die => (
              <DieDisplay key={die.id} die={die} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
