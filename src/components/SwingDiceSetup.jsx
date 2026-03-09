import React, { useState, useEffect } from 'react';
import Picker from 'react-mobile-picker';
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
    const mid = Math.floor((range.max + range.min) / 2);
    return mid;
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

  // Enable mouse wheel scrolling on desktop
  useEffect(() => {
    const handleWheel = (e) => {
      const target = e.target.closest('.swing-picker-wrapper');
      if (target) {
        const pickerColumn = target.querySelector('.picker-column');
        if (pickerColumn) {
          e.preventDefault();
          pickerColumn.scrollTop += e.deltaY;
        }
      }
    };

    const container = document.querySelector('.swing-setup');
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, []);

  const renderSwingPicker = (swingType, value, onChange, player) => {
    const range = SWING_RANGES[swingType];
    const values = Array.from(
      { length: range.max - range.min + 1 },
      (_, i) => range.min + i
    );

    const options = values.reduce((acc, val) => {
      acc[val] = `d${val}`;
      return acc;
    }, {});

    return (
      <div className="swing-picker-wrapper" key={swingType}>
        <div className="swing-picker-label">{swingType} Swing Die</div>
        <Picker
          value={{ size: value }}
          onChange={(val) => onChange(swingType, val.size)}
          height={150}
          itemHeight={45}
          wheelMode="natural"
        >
          <Picker.Column name="size">
            {values.map(val => (
              <Picker.Item key={val} value={val}>
                <div className="swing-value">d{val}</div>
              </Picker.Item>
            ))}
          </Picker.Column>
        </Picker>
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
              renderSwingPicker(type, player1Selections[type], handlePlayer1Change, 'player1')
            )}
          </div>

          <div className="player-swing">
            <h3>Player 2: {gameState.player2.character.name}</h3>
            {player2SwingTypes.map(type =>
              renderSwingPicker(type, player2Selections[type], handlePlayer2Change, 'player2')
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
