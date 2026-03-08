import React, { useState } from 'react';
import { SWING_RANGES } from '../data/characters';
import { getSwingDice } from '../game/dice';
import './SwingDiceSetup.css';

export default function SwingDiceSetup({ gameState, onSwingChoicesComplete }) {
  const [player1Choices, setPlayer1Choices] = useState({});
  const [player2Choices, setPlayer2Choices] = useState({});

  const player1SwingDice = getSwingDice(gameState.player1.dice);
  const player2SwingDice = getSwingDice(gameState.player2.dice);

  // Get unique swing types
  const player1SwingTypes = [...new Set(player1SwingDice.map(d => d.swingType))];
  const player2SwingTypes = [...new Set(player2SwingDice.map(d => d.swingType))];

  const handlePlayer1Change = (swingType, value) => {
    setPlayer1Choices(prev => ({
      ...prev,
      [swingType]: parseInt(value)
    }));
  };

  const handlePlayer2Change = (swingType, value) => {
    setPlayer2Choices(prev => ({
      ...prev,
      [swingType]: parseInt(value)
    }));
  };

  const handleStart = () => {
    onSwingChoicesComplete(player1Choices, player2Choices);
  };

  const player1Complete = player1SwingTypes.every(type => player1Choices[type]);
  const player2Complete = player2SwingTypes.every(type => player2Choices[type]);
  const canStart = player1Complete && player2Complete;

  return (
    <div className="container">
      <div className="swing-setup">
        <h1 className="text-center mb-4">
          {gameState.roundNumber === 0 ? 'Choose Swing Dice' : `Round ${gameState.roundNumber + 1}`}
        </h1>

        <div className="swing-grid">
          <div className="player-swing">
            <h2>Player 1: {gameState.player1.character.name}</h2>
            {player1SwingTypes.map(swingType => {
              const range = SWING_RANGES[swingType];
              return (
                <div key={swingType} className="swing-control">
                  <label>
                    <span className="swing-label">{swingType} Swing Die:</span>
                    <select
                      value={player1Choices[swingType] || ''}
                      onChange={(e) => handlePlayer1Change(swingType, e.target.value)}
                      className="swing-select"
                    >
                      <option value="">Choose size...</option>
                      {Array.from(
                        { length: range.max - range.min + 1 },
                        (_, i) => range.min + i
                      ).map(size => (
                        <option key={size} value={size}>
                          d{size}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              );
            })}
          </div>

          <div className="player-swing">
            <h2>Player 2: {gameState.player2.character.name}</h2>
            {player2SwingTypes.map(swingType => {
              const range = SWING_RANGES[swingType];
              return (
                <div key={swingType} className="swing-control">
                  <label>
                    <span className="swing-label">{swingType} Swing Die:</span>
                    <select
                      value={player2Choices[swingType] || ''}
                      onChange={(e) => handlePlayer2Change(swingType, e.target.value)}
                      className="swing-select"
                    >
                      <option value="">Choose size...</option>
                      {Array.from(
                        { length: range.max - range.min + 1 },
                        (_, i) => range.min + i
                      ).map(size => (
                        <option key={size} value={size}>
                          d{size}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center mt-4">
          <button
            className="btn-primary"
            onClick={handleStart}
            disabled={!canStart}
          >
            Roll Dice
          </button>
        </div>
      </div>
    </div>
  );
}
