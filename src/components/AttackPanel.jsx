import React from 'react';
import { canPowerAttack, canSkillAttack } from '../game/attacks';
import './AttackPanel.css';

export default function AttackPanel({
  selectedAttackers,
  selectedTarget,
  currentPlayerDice,
  opponentDice,
  onExecuteAttack,
  onPass
}) {
  const attackers = selectedAttackers
    .map(id => currentPlayerDice.find(d => d.id === id))
    .filter(Boolean);

  const target = selectedTarget ?
    opponentDice.find(d => d.id === selectedTarget) :
    null;

  const canPower = attackers.length === 1 && target &&
    canPowerAttack(attackers[0], target);

  const canSkill = attackers.length > 0 && target &&
    canSkillAttack(attackers, target);

  const hasValidAttack = canPower || canSkill;

  return (
    <div className="attack-panel">
      <h3>Attack Controls</h3>

      <div className="attack-status">
        {selectedAttackers.length === 0 && !selectedTarget && (
          <p>Select your dice to attack with, then select an opponent die to target</p>
        )}
        {selectedAttackers.length > 0 && !selectedTarget && (
          <p>Now select an opponent die to target</p>
        )}
        {selectedAttackers.length > 0 && selectedTarget && !hasValidAttack && (
          <p className="invalid-attack">Invalid attack - check values</p>
        )}
        {canPower && (
          <p className="valid-attack">Power Attack: {attackers[0].value} &ge; {target.value}</p>
        )}
        {canSkill && (
          <p className="valid-attack">
            Skill Attack: {attackers.map(d => d.value).join(' + ')} = {target.value}
          </p>
        )}
      </div>

      <div className="attack-buttons">
        <button
          className="btn-primary"
          onClick={() => onExecuteAttack(canPower ? 'power' : 'skill')}
          disabled={!hasValidAttack}
        >
          Attack
        </button>
        <button
          className="btn-secondary"
          onClick={onPass}
        >
          Pass
        </button>
      </div>
    </div>
  );
}
