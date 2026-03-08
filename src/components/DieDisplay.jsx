import React from 'react';
import './DieDisplay.css';

export default function DieDisplay({ die, onClick, selectable = false }) {
  const handleClick = () => {
    if (selectable && onClick) {
      onClick(die);
    }
  };

  const className = [
    'die',
    die.captured && 'die-captured',
    selectable && 'die-selectable',
    die.selected && 'die-selected',
    die.owner === 'player1' && 'die-player1',
    die.owner === 'player2' && 'die-player2'
  ].filter(Boolean).join(' ');

  const label = die.type === 'swing' ?
    `${die.swingType}(${die.size || '?'})` :
    `d${die.size}`;

  return (
    <div className={className} onClick={handleClick}>
      <div className="die-label">{label}</div>
      <div className="die-value">
        {die.value !== null ? die.value : '-'}
      </div>
    </div>
  );
}
