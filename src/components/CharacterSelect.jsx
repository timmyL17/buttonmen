import React, { useState } from 'react';
import { SOLDIERS } from '../data/characters';
import './CharacterSelect.css';

export default function CharacterSelect({ onCharactersSelected }) {
  const [player1Character, setPlayer1Character] = useState(null);
  const [player2Character, setPlayer2Character] = useState(null);

  const handleStart = () => {
    if (player1Character && player2Character) {
      onCharactersSelected(player1Character, player2Character);
    }
  };

  const canStart = player1Character && player2Character;

  return (
    <div className="container">
      <div className="character-select">
        <h1 className="text-center mb-4">Button Men</h1>

        <div className="selection-grid">
          <div className="player-selection">
            <h2>Player 1</h2>
            <div className="character-grid">
              {SOLDIERS.map(char => (
                <button
                  key={char.name}
                  className={`character-card ${player1Character?.name === char.name ? 'selected' : ''}`}
                  onClick={() => setPlayer1Character(char)}
                >
                  <div className="character-name">{char.name}</div>
                  <div className="character-dice">
                    {char.dice.map((die, idx) => (
                      <span key={idx} className="die-badge">
                        {typeof die === 'string' ? die : `d${die}`}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="player-selection">
            <h2>Player 2</h2>
            <div className="character-grid">
              {SOLDIERS.map(char => (
                <button
                  key={char.name}
                  className={`character-card ${player2Character?.name === char.name ? 'selected' : ''}`}
                  onClick={() => setPlayer2Character(char)}
                >
                  <div className="character-name">{char.name}</div>
                  <div className="character-dice">
                    {char.dice.map((die, idx) => (
                      <span key={idx} className="die-badge">
                        {typeof die === 'string' ? die : `d${die}`}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-4">
          <button
            className="btn-primary"
            onClick={handleStart}
            disabled={!canStart}
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
}
