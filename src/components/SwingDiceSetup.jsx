import React, { useState, useRef } from 'react';
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
  const getInitialIndex = (swingType) => {
    const range = SWING_RANGES[swingType];
    const mid = Math.floor((range.max - range.min) / 2);
    return mid;
  };

  const [player1Indices, setPlayer1Indices] = useState(
    Object.fromEntries(player1SwingTypes.map(type => [type, getInitialIndex(type)]))
  );
  const [player2Indices, setPlayer2Indices] = useState(
    Object.fromEntries(player2SwingTypes.map(type => [type, getInitialIndex(type)]))
  );

  const handlePlayer1Scroll = (swingType, e) => {
    const scrollTop = e.target.scrollTop;
    const itemHeight = 60;
    const index = Math.round(scrollTop / itemHeight);
    setPlayer1Indices(prev => ({ ...prev, [swingType]: index }));
  };

  const handlePlayer2Scroll = (swingType, e) => {
    const scrollTop = e.target.scrollTop;
    const itemHeight = 60;
    const index = Math.round(scrollTop / itemHeight);
    setPlayer2Indices(prev => ({ ...prev, [swingType]: index }));
  };

  const handleStart = () => {
    const player1Choices = {};
    const player2Choices = {};

    player1SwingTypes.forEach(type => {
      const range = SWING_RANGES[type];
      player1Choices[type] = range.min + player1Indices[type];
    });

    player2SwingTypes.forEach(type => {
      const range = SWING_RANGES[type];
      player2Choices[type] = range.min + player2Indices[type];
    });

    onSwingChoicesComplete(player1Choices, player2Choices);
  };

  const renderSwingPicker = (swingType, index, onScroll) => {
    const range = SWING_RANGES[swingType];
    const values = Array.from(
      { length: range.max - range.min + 1 },
      (_, i) => range.min + i
    );

    return (
      <div className="swing-picker-wrapper" key={swingType}>
        <div className="swing-picker-label">{swingType} Swing Die</div>
        <div
          className="swing-picker"
          onScroll={(e) => onScroll(swingType, e)}
        >
          <div className="swing-picker-padding"></div>
          {values.map((value, idx) => (
            <div
              key={value}
              className={`swing-picker-item ${idx === index ? 'selected' : ''}`}
            >
              d{value}
            </div>
          ))}
          <div className="swing-picker-padding"></div>
        </div>
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
              renderSwingPicker(type, player1Indices[type], handlePlayer1Scroll)
            )}
          </div>

          <div className="player-swing">
            <h3>Player 2: {gameState.player2.character.name}</h3>
            {player2SwingTypes.map(type =>
              renderSwingPicker(type, player2Indices[type], handlePlayer2Scroll)
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
