// Declared behavior contracts, not implemented gameplay effects.
export const ENGINE_READY = false;
export const EFFECT_REGISTRY = Object.freeze({
  DAMAGE: Object.freeze({ target: 'ENEMY_CHARACTER', implemented: false }),
  HEAL: Object.freeze({ target: 'FRIENDLY_CHARACTER', implemented: false }),
  SHIELD: Object.freeze({ target: 'FRIENDLY_CHARACTER', implemented: false }),
});
export const KEYWORD_REGISTRY = Object.freeze({ GUARD: { implemented: false }, SHIELD: { implemented: false } });
export function assertDeclaredBehavior(card) {
  if (card.kind === 'SPELL' && EFFECT_REGISTRY[card.effect.key]?.target !== card.effect.target) throw new Error(`Undefined effect contract: ${card.id}`);
  if (card.kind === 'UNIT' && card.keywords.some((key) => !Object.hasOwn(KEYWORD_REGISTRY, key))) throw new Error(`Undefined keyword contract: ${card.id}`);
  return true;
}
