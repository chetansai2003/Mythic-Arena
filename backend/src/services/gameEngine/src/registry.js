import { damage } from './rules.js';

export const ENGINE_READY = true;
export const EFFECT_HANDLERS = Object.freeze({
  DAMAGE: (target, effect) => damage(target, effect.amount),
  HEAL: (target, effect) => {
    target.health = Math.min(target.maxHealth, target.health + effect.amount);
  },
  SHIELD: (target) => {
    target.shield = true;
  },
});
export const EFFECT_REGISTRY = Object.freeze({
  DAMAGE: Object.freeze({ target: 'ENEMY_CHARACTER', implemented: true }),
  HEAL: Object.freeze({ target: 'FRIENDLY_CHARACTER', implemented: true }),
  SHIELD: Object.freeze({ target: 'FRIENDLY_CHARACTER', implemented: true }),
});
export const KEYWORD_REGISTRY = Object.freeze({
  GUARD: Object.freeze({ implemented: true }),
  SHIELD: Object.freeze({ implemented: true }),
});
export function assertDeclaredBehavior(card) {
  if (
    card.kind === 'SPELL' &&
    EFFECT_REGISTRY[card.effect.key]?.target !== card.effect.target
  )
    throw new Error(`Undefined effect contract: ${card.id}`);
  if (
    card.kind === 'UNIT' &&
    card.keywords.some((key) => !Object.hasOwn(KEYWORD_REGISTRY, key))
  )
    throw new Error(`Undefined keyword contract: ${card.id}`);
  return true;
}
