import React, { useState } from 'react';
import { SWING_RANGES } from '../data/characters';
import { getSwingDice } from '../game/dice';
import './SwingDiceSetup.css';

export default function SwingDiceSetup({ gameState, onSwingChoicesComplete }) {
  const player1SwingDice = getSwingDice(gameState.player1.dice);
  const player2SwingDice = getSwingDice(gameState.player2.dice);

  // Get unique swing types
  const player1SwingTypes = [...new Set(player1SwingDice.map(d => d.swingType))];
  const player2SwingTypes = [...new Set(player2SwingDice.map(d => d.swingType))];

  // Initialize with middle value
  const getInitialValue = (swingType) => {
    const range = SWING_RANGES[swingType];
    return Math.floor((range.max + range.min) / 2);
  };

  const [player1Selections, setPlayer1Selections] = useState(
    Object.fromEntries(player1SwingTypes.map(type => [type, getInitialValue(type)]))
  );
  const [player2Selections, setPlayer2Selections] = useState(
    Object.fromEntries(player2SwingTypes.map(type => [type, getInitialValue(type)]))
  );

  const handlePlayer1Change = (swingType, value) => {
    setPlayer1Selections(prev => ({ ...prev, [swingType]: parseInt(value) }));
  };

  const handlePlayer2Change = (swingType, value) => {
    setPlayer2Selections(prev => ({ ...prev, [swingType]: parseInt(value) }));
  };

  const handleStart = () => {
    onSwingChoicesComplete(player1Selections, player2Selections);
  };

  const renderSwingSelect = (swingType, value, onChange) => {
    const range = SWING_RANGES[swingType];
    const values = Array.from(
      { length: range.max - range.min + 1 },
      (_, i) => range.min + i
    );

    return (
      <div className="swing-select-wrapper" key={swingType}>
        <label className="swing-select-label">
          {swingType} Swing Die:
          <select
            className="swing-select"
            value={value}
            onChange={(e) => onChange(swingType, e.target.value)}
          >
            {values.map(val => (
              <option key={val} value={val}>
                d{val}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  };

  return (
    <div className="container">
      <div className="swing-setup">
        <h1 className="text-center mb-3">
          {gameState.roundNumber === 0 ? 'Choose Swing Dice' : `Round ${gameState.roundNumber + 1}`}
        </h1>

        <div className="swing-grid">
          <div className="player-swing">
            <h3>Player 1: {gameState.player1.character.name}</h3>
            {player1SwingTypes.map(type =>
              renderSwingSelect(type, player1Selections[type], handlePlayer1Change)
            )}
          </div>

          <div className="player-swing">
            <h3>Player 2: {gameState.player2.character.name}</h3>
            {player2SwingTypes.map(type =>
              renderSwingSelect(type, player2Selections[type], handlePlayer2Change)
            )}
          </div>
        </div>

        <div className="text-center mt-3">
          <button
            className="btn-primary"
            onClick={handleStart}
          >
            Roll Dice
          </button>
        </div>
      </div>
    </div>
  );
}
