import React from 'react';
import './ScoreDisplay.css';

export default function ScoreDisplay({ matchScore, roundNumber }) {
  return (
    <div className="score-display">
      <div className="round-info">Round {roundNumber}</div>
      <div className="match-score">
        <div className="score-item">
          <span className="player-label">Player 1</span>
          <span className="score-value">{matchScore.player1}</span>
        </div>
        <div className="score-divider">-</div>
        <div className="score-item">
          <span className="player-label">Player 2</span>
          <span className="score-value">{matchScore.player2}</span>
        </div>
      </div>
      <div className="score-subtitle">First to 3 wins</div>
    </div>
  );
}
