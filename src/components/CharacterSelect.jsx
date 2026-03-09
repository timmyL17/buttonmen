import React, { useState } from 'react';
import Picker from 'react-mobile-picker';
import { SOLDIERS } from '../data/characters';
import './CharacterSelect.css';

export default function CharacterSelect({ onCharactersSelected }) {
  const [selections, setSelections] = useState({
    player1: SOLDIERS[0].name,
    player2: SOLDIERS[1].name
  });

  const characterOptions = SOLDIERS.reduce((acc, char) => {
    acc[char.name] = char.name;
    return acc;
  }, {});

  const optionGroups = {
    player1: characterOptions,
    player2: characterOptions
  };

  const handleChange = (name, value) => {
    setSelections(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStart = () => {
    const player1Char = SOLDIERS.find(c => c.name === selections.player1);
    const player2Char = SOLDIERS.find(c => c.name === selections.player2);
    onCharactersSelected(player1Char, player2Char);
  };

  const renderCharacterItem = (name, selected) => {
    const char = SOLDIERS.find(c => c.name === name);
    return (
      <div className="picker-character-item">
        <div className="picker-name">{char.name}</div>
        <div className="picker-dice">
          {char.dice.map((die, idx) => (
            <span key={idx} className="picker-die-badge">
              {typeof die === 'string' ? die : `d${die}`}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container">
      <div className="character-select">
        <h1 className="text-center mb-3">Button Men</h1>

        <div className="pickers-container">
          <div className="picker-section">
            <h3>Player 1</h3>
            <Picker
              value={{ character: selections.player1 }}
              onChange={(val) => handleChange('player1', val.character)}
              height={300}
              itemHeight={90}
              wheelMode="natural"
            >
              <Picker.Column name="character">
                {Object.keys(optionGroups.player1).map(name => (
                  <Picker.Item key={name} value={name}>
                    {renderCharacterItem(name, selections.player1 === name)}
                  </Picker.Item>
                ))}
              </Picker.Column>
            </Picker>
          </div>

          <div className="picker-section">
            <h3>Player 2</h3>
            <Picker
              value={{ character: selections.player2 }}
              onChange={(val) => handleChange('player2', val.character)}
              height={300}
              itemHeight={90}
              wheelMode="natural"
            >
              <Picker.Column name="character">
                {Object.keys(optionGroups.player2).map(name => (
                  <Picker.Item key={name} value={name}>
                    {renderCharacterItem(name, selections.player2 === name)}
                  </Picker.Item>
                ))}
              </Picker.Column>
            </Picker>
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
