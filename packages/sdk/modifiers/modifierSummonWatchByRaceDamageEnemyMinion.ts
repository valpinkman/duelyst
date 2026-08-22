/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RandomDamageAction = require('@duelyst/sdk/actions/randomDamageAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const CONFIG = require('@duelyst/common/config');
const Modifier = require('./modifier');
const ModifierSummonWatch = require('./modifierSummonWatch');

class ModifierSummonWatchByRaceDamageEnemyMinion extends ModifierSummonWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierSummonWatchByRaceDamageEnemyMinion';
  static modifierName = 'Summon Watch (buff by race)';
  static description = 'Whenever you summon %X, deal %Y damage to a random enemy minion';

  static createContextObject(damageAmount, targetRaceId, raceName, options) {
    const contextObject = super.createContextObject(options);
    contextObject.targetRaceId = targetRaceId;
    contextObject.raceName = raceName;
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      const replaceText = this.description.replace(/%Y/, modifierContextObject.damageAmount);
      return replaceText.replace(/%X/, modifierContextObject.raceName);
    }
    return this.description;
  }

  onSummonWatch(action?) {
    const radomDamageAction = new RandomDamageAction(this.getGameSession());
    radomDamageAction.setOwnerId(this.getCard().getOwnerId());
    radomDamageAction.setSource(this.getCard());
    radomDamageAction.setDamageAmount(this.damageAmount);
    return this.getGameSession().executeAction(radomDamageAction);
  }

  getIsCardRelevantToWatcher(card) {
    return card.getBelongsToTribe(this.targetRaceId);
  }
}
ModifierSummonWatchByRaceDamageEnemyMinion.prototype.type =
  'ModifierSummonWatchByRaceDamageEnemyMinion';
ModifierSummonWatchByRaceDamageEnemyMinion.prototype.fxResource = [
  'FX.Modifiers.ModifierSummonWatch',
  'FX.Modifiers.ModifierGenericDamageIce',
];

module.exports = ModifierSummonWatchByRaceDamageEnemyMinion;
