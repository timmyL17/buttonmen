// Scoring logic

export function calculateScore(myDice, capturedDice) {
  // Captured dice: full points (die size)
  const capturedPoints = capturedDice.reduce((total, die) => total + die.size, 0);

  // Remaining own dice: half points (rounded down)
  const remainingPoints = myDice
    .filter(d => !d.captured)
    .reduce((total, die) => total + Math.floor(die.size / 2), 0);

  return capturedPoints + remainingPoints;
}

export function calculateRoundScores(gameState) {
  const player1Captured = gameState.player2.dice.filter(d => d.captured);
  const player2Captured = gameState.player1.dice.filter(d => d.captured);

  const player1Score = calculateScore(gameState.player1.dice, player1Captured);
  const player2Score = calculateScore(gameState.player2.dice, player2Captured);

  return {
    player1: player1Score,
    player2: player2Score,
    winner: player1Score > player2Score ? 'player1' :
            player2Score > player1Score ? 'player2' :
            'draw'
  };
}

export function updateMatchScore(matchScore, roundWinner) {
  if (roundWinner === 'draw') {
    return matchScore;
  }

  return {
    ...matchScore,
    [roundWinner]: matchScore[roundWinner] + 1
  };
}

export function getMatchWinner(matchScore) {
  if (matchScore.player1 >= 3) return 'player1';
  if (matchScore.player2 >= 3) return 'player2';
  return null;
}
