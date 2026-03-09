import React, { useState, useEffect, useRef } from 'react';
import { SOLDIERS } from '../data/characters';
import './CharacterSelect.css';

export default function CharacterSelect({ onCharactersSelected }) {
  const [player1Index, setPlayer1Index] = useState(0);
  const [player2Index, setPlayer2Index] = useState(1);

  const player1Ref = useRef(null);
  const player2Ref = useRef(null);

  const updateSelection = (ref, setIndex) => {
    if (!ref.current) return;
    const container = ref.current;
    const scrollTop = container.scrollTop;
    const itemHeight = 90;
    const index = Math.round(scrollTop / itemHeight);
    setIndex(Math.max(0, Math.min(SOLDIERS.length - 1, index)));
  };

  useEffect(() => {
    const p1 = player1Ref.current;
    const p2 = player2Ref.current;

    const handlePlayer1Scroll = () => updateSelection(player1Ref, setPlayer1Index);
    const handlePlayer2Scroll = () => updateSelection(player2Ref, setPlayer2Index);

    if (p1) p1.addEventListener('scroll', handlePlayer1Scroll, { passive: true });
    if (p2) p2.addEventListener('scroll', handlePlayer2Scroll, { passive: true });

    return () => {
      if (p1) p1.removeEventListener('scroll', handlePlayer1Scroll);
      if (p2) p2.removeEventListener('scroll', handlePlayer2Scroll);
    };
  }, []);

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
            <div className="custom-picker" ref={player1Ref}>
              <div className="picker-spacer"></div>
              {SOLDIERS.map((char, idx) => (
                <div
                  key={char.name}
                  className={`custom-picker-item ${idx === player1Index ? 'selected' : ''}`}
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
              <div className="picker-spacer"></div>
            </div>
          </div>

          <div className="picker-section">
            <h3>Player 2</h3>
            <div className="custom-picker" ref={player2Ref}>
              <div className="picker-spacer"></div>
              {SOLDIERS.map((char, idx) => (
                <div
                  key={char.name}
                  className={`custom-picker-item ${idx === player2Index ? 'selected' : ''}`}
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
              <div className="picker-spacer"></div>
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
