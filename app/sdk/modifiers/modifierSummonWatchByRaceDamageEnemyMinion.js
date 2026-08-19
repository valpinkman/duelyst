/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RandomDamageAction = require('app/sdk/actions/randomDamageAction');
const CardType = require('app/sdk/cards/cardType');
const CONFIG = require('app/common/config');
const Modifier = require('./modifier');
const ModifierSummonWatch = require('./modifierSummonWatch');

class ModifierSummonWatchByRaceDamageEnemyMinion extends ModifierSummonWatch {
  static initClass() {
    this.prototype.type = 'ModifierSummonWatchByRaceDamageEnemyMinion';
    this.type = 'ModifierSummonWatchByRaceDamageEnemyMinion';

    this.modifierName = 'Summon Watch (buff by race)';
    this.description = 'Whenever you summon %X, deal %Y damage to a random enemy minion';

    this.prototype.fxResource = ['FX.Modifiers.ModifierSummonWatch', 'FX.Modifiers.ModifierGenericDamageIce'];
  }

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

  onSummonWatch(action) {
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
ModifierSummonWatchByRaceDamageEnemyMinion.initClass();

module.exports = ModifierSummonWatchByRaceDamageEnemyMinion;
