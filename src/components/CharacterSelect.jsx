import React, { useState, useRef } from 'react';
import { SOLDIERS } from '../data/characters';
import './CharacterSelect.css';

export default function CharacterSelect({ onCharactersSelected }) {
  const [player1Index, setPlayer1Index] = useState(0);
  const [player2Index, setPlayer2Index] = useState(1);

  const player1Ref = useRef(null);
  const player2Ref = useRef(null);

  const handlePlayer1Scroll = (e) => {
    const scrollTop = e.target.scrollTop;
    const itemHeight = 120;
    const index = Math.round(scrollTop / itemHeight);
    setPlayer1Index(index);
  };

  const handlePlayer2Scroll = (e) => {
    const scrollTop = e.target.scrollTop;
    const itemHeight = 120;
    const index = Math.round(scrollTop / itemHeight);
    setPlayer2Index(index);
  };

  const handleStart = () => {
    onCharactersSelected(SOLDIERS[player1Index], SOLDIERS[player2Index]);
  };

  return (
    <div className="container">
      <div className="character-select">
        <h1 className="text-center mb-3">Button Men</h1>

        <div className="pickers-container">
          <div className="picker-section">
            <h3>Player 1</h3>
            <div
              className="character-picker"
              ref={player1Ref}
              onScroll={handlePlayer1Scroll}
            >
              <div className="picker-padding"></div>
              {SOLDIERS.map((char, idx) => (
                <div
                  key={char.name}
                  className={`picker-item ${idx === player1Index ? 'selected' : ''}`}
                >
                  <div className="picker-name">{char.name}</div>
                  <div className="picker-dice">
                    {char.dice.map((die, dieIdx) => (
                      <span key={dieIdx} className="picker-die-badge">
                        {typeof die === 'string' ? die : `d${die}`}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <div className="picker-padding"></div>
            </div>
          </div>

          <div className="picker-section">
            <h3>Player 2</h3>
            <div
              className="character-picker"
              ref={player2Ref}
              onScroll={handlePlayer2Scroll}
            >
              <div className="picker-padding"></div>
              {SOLDIERS.map((char, idx) => (
                <div
                  key={char.name}
                  className={`picker-item ${idx === player2Index ? 'selected' : ''}`}
                >
                  <div className="picker-name">{char.name}</div>
                  <div className="picker-dice">
                    {char.dice.map((die, dieIdx) => (
                      <span key={dieIdx} className="picker-die-badge">
                        {typeof die === 'string' ? die : `d${die}`}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <div className="picker-padding"></div>
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
