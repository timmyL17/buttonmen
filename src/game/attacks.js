// Attack logic

export function canPowerAttack(attackerDie, targetDie) {
  if (!attackerDie.value || !targetDie.value) return false;
  if (attackerDie.captured || targetDie.captured) return false;
  if (attackerDie.owner === targetDie.owner) return false;

  return attackerDie.value >= targetDie.value;
}

export function canSkillAttack(attackerDice, targetDie) {
  if (attackerDice.length === 0) return false;
  if (!targetDie.value) return false;
  if (targetDie.captured) return false;

  // All attackers must be from same owner
  const owner = attackerDice[0].owner;
  if (!attackerDice.every(d => d.owner === owner)) return false;

  // Target must be from different owner
  if (targetDie.owner === owner) return false;

  // All attackers must have values and not be captured
  if (!attackerDice.every(d => d.value && !d.captured)) return false;

  // Sum must equal target value exactly
  const sum = attackerDice.reduce((total, d) => total + d.value, 0);
  return sum === targetDie.value;
}

export function executePowerAttack(gameState, attackerDieId, targetDieId) {
  const attacker = findDieById(gameState, attackerDieId);
  const target = findDieById(gameState, targetDieId);

  if (!attacker || !target) {
    throw new Error('Die not found');
  }

  console.log('Execute power attack:', {
    attacker,
    target,
    canAttack: canPowerAttack(attacker, target)
  });

  if (!canPowerAttack(attacker, target)) {
    throw new Error('Invalid power attack');
  }

  // Capture target die
  target.captured = true;

  // Re-roll attacker
  attacker.value = Math.floor(Math.random() * attacker.size) + 1;

  return gameState;
}

export function executeSkillAttack(gameState, attackerDieIds, targetDieId) {
  const attackers = attackerDieIds.map(id => findDieById(gameState, id));
  const target = findDieById(gameState, targetDieId);

  if (!attackers.every(d => d) || !target) {
    throw new Error('Die not found');
  }

  if (!canSkillAttack(attackers, target)) {
    throw new Error('Invalid skill attack');
  }

  // Capture target die
  target.captured = true;

  // Re-roll all attackers
  attackers.forEach(attacker => {
    attacker.value = Math.floor(Math.random() * attacker.size) + 1;
  });

  return gameState;
}

export function findValidPowerAttacks(myDice, opponentDice) {
  const validAttacks = [];

  for (const attacker of myDice) {
    if (attacker.captured || !attacker.value) continue;

    for (const target of opponentDice) {
      if (target.captured || !target.value) continue;

      if (canPowerAttack(attacker, target)) {
        validAttacks.push({
          type: 'power',
          attackers: [attacker.id],
          target: target.id
        });
      }
    }
  }

  return validAttacks;
}

export function findValidSkillAttacks(myDice, opponentDice) {
  const validAttacks = [];
  const activeDice = myDice.filter(d => !d.captured && d.value);

  // Check all combinations of my dice
  for (let i = 1; i < Math.pow(2, activeDice.length); i++) {
    const combination = [];
    for (let j = 0; j < activeDice.length; j++) {
      if (i & (1 << j)) {
        combination.push(activeDice[j]);
      }
    }

    // Check if this combination can attack any opponent die
    for (const target of opponentDice) {
      if (target.captured || !target.value) continue;

      if (canSkillAttack(combination, target)) {
        validAttacks.push({
          type: 'skill',
          attackers: combination.map(d => d.id),
          target: target.id
        });
      }
    }
  }

  return validAttacks;
}

export function hasValidAttacks(myDice, opponentDice) {
  return findValidPowerAttacks(myDice, opponentDice).length > 0 ||
         findValidSkillAttacks(myDice, opponentDice).length > 0;
}

function findDieById(gameState, dieId) {
  const allDice = [...gameState.player1.dice, ...gameState.player2.dice];
  return allDice.find(d => d.id === dieId);
}
