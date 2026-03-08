// Dice utilities

export function createDie(size, type = 'normal', owner = null, swingType = null) {
  return {
    id: Math.random().toString(36).substr(2, 9),
    size,
    type, // 'normal' or 'swing'
    swingType, // 'X', 'Y', etc. if type is 'swing'
    owner, // 'player1' or 'player2'
    value: null, // Current rolled value
    captured: false,
    selected: false
  };
}

export function rollDie(die) {
  if (!die.size) {
    throw new Error('Cannot roll die without size');
  }
  return {
    ...die,
    value: Math.floor(Math.random() * die.size) + 1
  };
}

export function rollDice(dice) {
  return dice.map(rollDie);
}

export function isSwingDie(die) {
  return die.type === 'swing';
}

export function getSwingDice(dice) {
  return dice.filter(isSwingDie);
}

export function setSwingSize(die, size) {
  if (!isSwingDie(die)) {
    throw new Error('Cannot set size on non-swing die');
  }
  return {
    ...die,
    size
  };
}

export function canAttack(die) {
  return die.value !== null && !die.captured;
}

export function getActiveDice(dice) {
  return dice.filter(d => !d.captured);
}

export function getCapturedDice(dice) {
  return dice.filter(d => d.captured);
}
