import { capturedValue, dieSize, dieValue, isShadowLike, sizeLabel } from '../engine';
import type { Die, DieSpec, Skill } from '../engine';

// Outline polygons (in a 100x100 box) suggesting each polyhedral die.
const SHAPES: Record<number, string> = {
  4: '50,6 96,90 4,90',
  6: '10,10 90,10 90,90 10,90',
  8: '50,3 97,50 50,97 3,50',
  10: '50,3 95,40 50,97 5,40',
  12: '50,4 96,37 78,94 22,94 4,37',
  20: '50,3 93,27 93,73 50,97 7,73 7,27',
};

function shapeFor(size: number): string {
  const key = size > 0 ? [4, 6, 8, 10, 12, 20].find((k) => size <= k) : undefined;
  return key ? SHAPES[key] : '';
}

function outline(size: number): string {
  const pts = shapeFor(size);
  return pts
    ? `<polygon points="${pts}" class="die-shape"/>`
    : `<circle cx="50" cy="50" r="46" class="die-shape"/>`;
}

function badges(skills: Skill[], mood: boolean): string {
  const b = skills.map((s) => `<span class="badge sk-${s}">${s}</span>`);
  if (mood) b.push('<span class="badge sk-mood">?</span>');
  return b.length ? `<span class="badges">${b.join('')}</span>` : '';
}

export interface DieViewOpts {
  selected?: 'attacker' | 'target';
  rolled?: boolean;
  small?: boolean;
  disabled?: boolean;
}

/** A die in play: big rolled value, size label beneath, skill badges. */
export function dieView(d: Die, o: DieViewOpts = {}): string {
  const cls = [
    'die',
    `p${d.owner}`,
    o.selected ? `sel-${o.selected}` : '',
    o.rolled ? 'rolled' : '',
    o.small ? 'small' : '',
    d.nulled ? 'nulled' : '',
    isShadowLike(d) ? 'shadowy' : '',
    d.sides.length > 1 ? 'is-twin' : '',
  ].join(' ');
  // Twin dice get a round outline, which also leaves room for their longer label.
  const shapeSize = d.sides.length > 1 ? 0 : d.sides[0];
  const twin = d.values.length > 1 ? `<span class="twin">${d.values.join('+')}</span>` : '';
  if (o.small) {
    // Captured dice show their size, which is what they score.
    const pts = capturedValue(d);
    return `<span class="${cls}" title="${sizeLabel(d)}, worth ${pts}" aria-label="${sizeLabel(d)}, worth ${pts}">
      <svg viewBox="0 0 100 100" aria-hidden="true">${outline(shapeSize)}</svg>
      <span class="val">${dieSize(d)}</span>
    </span>`;
  }
  const attrs = `type="button" data-act="die" data-id="${d.id}"${o.disabled ? ' disabled' : ''}`;
  return `<button class="${cls}" ${attrs} aria-label="${sizeLabel(d)} showing ${dieValue(d)}">
    <svg viewBox="0 0 100 100" aria-hidden="true">${outline(shapeSize)}</svg>
    <span class="val">${dieValue(d)}</span>${twin}
    <span class="size">${sizeLabel(d)}</span>
    ${badges(d.skills, d.mood)}
  </button>`;
}

/** A recipe die (not rolled), as a compact chip. */
export function specChip(s: DieSpec): string {
  return `<span class="chip">${s.recipe}</span>`;
}
