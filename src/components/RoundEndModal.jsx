import React from 'react';
import './RoundEndModal.css';

export default function RoundEndModal({
  roundScores,
  matchScore,
  onNextRound,
  isMatchEnd = false,
  onRematch
}) {
  const winner = roundScores.winner;

  return (
    <div className="modal-overlay">
      <div className="modal">
        {isMatchEnd ? (
          <>
            <h2>Match Complete!</h2>
            <div className="winner-announcement">
              {winner === 'player1' && 'Player 1 Wins the Match!'}
              {winner === 'player2' && 'Player 2 Wins the Match!'}
            </div>
            <div className="final-score">
              <div className="score-row">
                <span>Player 1:</span>
                <span>{matchScore.player1} rounds</span>
              </div>
              <div className="score-row">
                <span>Player 2:</span>
                <span>{matchScore.player2} rounds</span>
              </div>
            </div>
            <button className="btn-primary" onClick={onRematch}>
              Play Again
            </button>
          </>
        ) : (
          <>
            <h2>Round Complete</h2>
            <div className="round-result">
              {winner === 'draw' ? (
                <p className="draw-text">It's a draw! Re-playing round...</p>
              ) : (
                <p className="winner-text">
                  {winner === 'player1' ? 'Player 1' : 'Player 2'} wins this round!
                </p>
              )}
            </div>
            <div className="round-scores">
              <div className="score-row">
                <span>Player 1:</span>
                <span>{roundScores.player1} points</span>
              </div>
              <div className="score-row">
                <span>Player 2:</span>
                <span>{roundScores.player2} points</span>
              </div>
            </div>
            <div className="match-status">
              <h3>Match Score</h3>
              <div className="score-row">
                <span>Player 1:</span>
                <span>{matchScore.player1} rounds</span>
              </div>
              <div className="score-row">
                <span>Player 2:</span>
                <span>{matchScore.player2} rounds</span>
              </div>
            </div>
            <button className="btn-primary" onClick={onNextRound}>
              Next Round
            </button>
          </>
        )}
      </div>
    </div>
  );
}
