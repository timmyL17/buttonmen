// Initiative determination

export function determineInitiative(player1Dice, player2Dice) {
  // Get active dice with values
  const p1Active = player1Dice.filter(d => !d.captured && d.value).sort((a, b) => a.value - b.value);
  const p2Active = player2Dice.filter(d => !d.captured && d.value).sort((a, b) => a.value - b.value);

  // Compare lowest dice first
  const maxLength = Math.max(p1Active.length, p2Active.length);

  for (let i = 0; i < maxLength; i++) {
    const p1Val = p1Active[i]?.value || Infinity;
    const p2Val = p2Active[i]?.value || Infinity;

    if (p1Val < p2Val) return 'player1';
    if (p2Val < p1Val) return 'player2';
  }

  // All dice are equal - draw
  return 'draw';
}
