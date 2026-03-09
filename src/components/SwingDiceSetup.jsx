import React, { useState, useEffect, useRef } from 'react';
import { SWING_RANGES } from '../data/characters';
import { getSwingDice } from '../game/dice';
import './SwingDiceSetup.css';

export default function SwingDiceSetup({ gameState, onSwingChoicesComplete }) {
  const player1SwingDice = getSwingDice(gameState.player1.dice);
  const player2SwingDice = getSwingDice(gameState.player2.dice);

  // Get unique swing types
  const player1SwingTypes = [...new Set(player1SwingDice.map(d => d.swingType))];
  const player2SwingTypes = [...new Set(player2SwingDice.map(d => d.swingType))];

  // Initialize with middle index
  const getInitialIndex = (swingType) => {
    const range = SWING_RANGES[swingType];
    return Math.floor((range.max - range.min) / 2);
  };

  const [player1Indices, setPlayer1Indices] = useState(
    Object.fromEntries(player1SwingTypes.map(type => [type, getInitialIndex(type)]))
  );
  const [player2Indices, setPlayer2Indices] = useState(
    Object.fromEntries(player2SwingTypes.map(type => [type, getInitialIndex(type)]))
  );

  const pickerRefs = useRef({});

  const updateSelection = (swingType, player) => {
    const ref = pickerRefs.current[`${player}-${swingType}`];
    if (!ref) return;

    const scrollTop = ref.scrollTop;
    const itemHeight = 45;
    const index = Math.round(scrollTop / itemHeight);

    const range = SWING_RANGES[swingType];
    const maxIndex = range.max - range.min;
    const clampedIndex = Math.max(0, Math.min(maxIndex, index));

    if (player === 'player1') {
      setPlayer1Indices(prev => ({ ...prev, [swingType]: clampedIndex }));
    } else {
      setPlayer2Indices(prev => ({ ...prev, [swingType]: clampedIndex }));
    }
  };

  useEffect(() => {
    const listeners = [];

    Object.keys(pickerRefs.current).forEach(key => {
      const ref = pickerRefs.current[key];
      const [player, swingType] = key.split('-');

      if (ref) {
        const handler = () => updateSelection(swingType, player);
        ref.addEventListener('scroll', handler, { passive: true });
        listeners.push({ ref, handler });
      }
    });

    return () => {
      listeners.forEach(({ ref, handler }) => {
        ref.removeEventListener('scroll', handler);
      });
    };
  }, []);

  const handleStart = () => {
    const player1Selections = {};
    const player2Selections = {};

    player1SwingTypes.forEach(type => {
      const range = SWING_RANGES[type];
      player1Selections[type] = range.min + player1Indices[type];
    });

    player2SwingTypes.forEach(type => {
      const range = SWING_RANGES[type];
      player2Selections[type] = range.min + player2Indices[type];
    });

    onSwingChoicesComplete(player1Selections, player2Selections);
  };

  const renderSwingPicker = (swingType, index, player) => {
    const range = SWING_RANGES[swingType];
    const values = Array.from(
      { length: range.max - range.min + 1 },
      (_, i) => range.min + i
    );

    return (
      <div className="swing-picker-wrapper" key={swingType}>
        <div className="swing-picker-label">{swingType} Swing Die</div>
        <div
          className="custom-swing-picker"
          ref={el => pickerRefs.current[`${player}-${swingType}`] = el}
        >
          <div className="swing-picker-spacer"></div>
          {values.map((val, idx) => (
            <div
              key={val}
              className={`custom-swing-item ${idx === index ? 'selected' : ''}`}
            >
              d{val}
            </div>
          ))}
          <div className="swing-picker-spacer"></div>
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
              renderSwingPicker(type, player1Indices[type], 'player1')
            )}
          </div>

          <div className="player-swing">
            <h3>Player 2: {gameState.player2.character.name}</h3>
            {player2SwingTypes.map(type =>
              renderSwingPicker(type, player2Indices[type], 'player2')
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
