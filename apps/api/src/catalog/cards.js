import { cardDefinitionSchema, RULES_VERSION } from '@mythic/shared';
import { assertDeclaredBehavior } from '@mythic/game-engine';

const unit = (id, name, faction, cost, attack, health, keywords = []) => ({ id, name, faction, cost, attack, health, keywords, kind: 'UNIT', version: 1, rulesVersion: RULES_VERSION, rarity: keywords.length ? 'RARE' : 'COMMON', artRef: null });
const spell = (id, name, faction, cost, key, amount) => ({ id, name, faction, cost, kind: 'SPELL', version: 1, rulesVersion: RULES_VERSION, rarity: key === 'SHIELD' ? 'RARE' : 'COMMON', artRef: null, effect: key === 'SHIELD' ? { key, target: 'FRIENDLY_CHARACTER' } : { key, amount, target: key === 'DAMAGE' ? 'ENEMY_CHARACTER' : 'FRIENDLY_CHARACTER' } });
export const CATALOG = [
  unit('frostwatch_sentinel', 'Frostwatch Sentinel', 'NORSE', 2, 1, 4, ['GUARD']),
  unit('aurora_wolf', 'Aurora Wolf', 'NORSE', 1, 2, 1),
  spell('winter_spark', 'Winter Spark', 'NORSE', 2, 'DAMAGE', 3),
  spell('hearthsong', 'Hearthsong', 'NORSE', 2, 'HEAL', 4),
  unit('marble_warden', 'Marble Warden', 'GREEK', 3, 2, 5, ['GUARD']),
  unit('dawnwing_harrier', 'Dawnwing Harrier', 'GREEK', 2, 3, 2),
  spell('sunlance', 'Sunlance', 'GREEK', 3, 'DAMAGE', 4),
  spell('aegis_of_echoes', 'Aegis of Echoes', 'GREEK', 1, 'SHIELD'),
  unit('dune_keeper', 'Dune Keeper', 'EGYPTIAN', 2, 2, 3),
  unit('obsidian_scarab', 'Obsidian Scarab', 'EGYPTIAN', 3, 2, 3, ['SHIELD']),
  spell('sands_of_renewal', 'Sands of Renewal', 'EGYPTIAN', 1, 'HEAL', 2),
  spell('solar_ember', 'Solar Ember', 'EGYPTIAN', 1, 'DAMAGE', 2),
  unit('moonveil_fox', 'Moonveil Fox', 'JAPANESE', 2, 3, 2),
  unit('cedar_gatekeeper', 'Cedar Gatekeeper', 'JAPANESE', 4, 3, 6, ['GUARD']),
  spell('storm_petal', 'Storm Petal', 'JAPANESE', 2, 'DAMAGE', 3),
  spell('lantern_ward', 'Lantern Ward', 'JAPANESE', 1, 'SHIELD'),
  unit('briar_oathkeeper', 'Briar Oathkeeper', 'CELTIC', 3, 2, 5, ['GUARD']),
  unit('mistgrove_stag', 'Mistgrove Stag', 'CELTIC', 4, 5, 4),
  spell('wildroot_blessing', 'Wildroot Blessing', 'CELTIC', 3, 'HEAL', 6),
  spell('thornwake', 'Thornwake', 'CELTIC', 3, 'DAMAGE', 4),
].map((card) => { cardDefinitionSchema.parse(card); assertDeclaredBehavior(card); return Object.freeze(card); });
