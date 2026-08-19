/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Cards = require('app/sdk/cards/cardsLookupComplete');

const i18next = require('i18next');
const ModifierStartTurnWatchSpawnEntity = require('./modifierStartTurnWatchSpawnEntity');

class ModifierStartTurnWatchSummonDervish extends ModifierStartTurnWatchSpawnEntity {
  declare type: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierStartTurnWatchSummonDervish';
  static isKeyworded = true;
  static description = '';

  static createContextObject() {
    const contextObject = super.createContextObject({ id: Cards.Faction3.Dervish });
    return contextObject;
  }
}
ModifierStartTurnWatchSummonDervish.prototype.type = 'ModifierStartTurnWatchSummonDervish';
ModifierStartTurnWatchSummonDervish.keywordDefinition = i18next.t('modifiers.summon_dervish_def');
ModifierStartTurnWatchSummonDervish.modifierName = i18next.t('modifiers.summon_dervish_name');
ModifierStartTurnWatchSummonDervish.prototype.fxResource = ['FX.Modifiers.ModifierStartTurnWatch', 'FX.Modifiers.ModifierGenericSpawn'];

module.exports = ModifierStartTurnWatchSummonDervish;
