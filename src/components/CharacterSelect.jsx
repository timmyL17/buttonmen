import React, { useState } from 'react';
import { SOLDIERS } from '../data/characters';
import './CharacterSelect.css';

export default function CharacterSelect({ onCharactersSelected }) {
  const [player1Index, setPlayer1Index] = useState(0);
  const [player2Index, setPlayer2Index] = useState(1);

  const handleStart = () => {
    onCharactersSelected(SOLDIERS[player1Index], SOLDIERS[player2Index]);
  };

  const selectedChar1 = SOLDIERS[player1Index];
  const selectedChar2 = SOLDIERS[player2Index];

  return (
    <div className="container">
      <div className="character-select">
        <h1 className="text-center mb-3">Button Men</h1>

        <div className="select-container">
          <div className="select-section">
            <h3>Player 1</h3>
            <select
              className="character-select-dropdown"
              value={player1Index}
              onChange={(e) => setPlayer1Index(parseInt(e.target.value))}
            >
              {SOLDIERS.map((char, idx) => (
                <option key={char.name} value={idx}>
                  {char.name} ({char.dice.map(d => typeof d === 'string' ? d : `d${d}`).join(' ')})
                </option>
              ))}
            </select>
            <div className="character-preview">
              <div className="preview-name">{selectedChar1.name}</div>
              <div className="preview-dice">
                {selectedChar1.dice.map((die, idx) => (
                  <span key={idx} className="preview-die-badge">
                    {typeof die === 'string' ? die : `d${die}`}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="select-section">
            <h3>Player 2</h3>
            <select
              className="character-select-dropdown"
              value={player2Index}
              onChange={(e) => setPlayer2Index(parseInt(e.target.value))}
            >
              {SOLDIERS.map((char, idx) => (
                <option key={char.name} value={idx}>
                  {char.name} ({char.dice.map(d => typeof d === 'string' ? d : `d${d}`).join(' ')})
                </option>
              ))}
            </select>
            <div className="character-preview">
              <div className="preview-name">{selectedChar2.name}</div>
              <div className="preview-dice">
                {selectedChar2.dice.map((die, idx) => (
                  <span key={idx} className="preview-die-badge">
                    {typeof die === 'string' ? die : `d${die}`}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-3">
          <button
            className="btn-primary"
            onClick={handleStart}
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
}
