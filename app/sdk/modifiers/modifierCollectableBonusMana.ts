/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const BonusManaAction = require('app/sdk/actions/bonusManaAction');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const CardType = require('app/sdk/cards/cardType');
const CONFIG = require('app/common/config');
let i18next = require('i18next');
const ModifierCollectable = require('./modifierCollectable');

i18next = require('i18next');

class ModifierCollectableBonusMana extends ModifierCollectable {
  declare type: any;
  declare bonusMana: any;
  declare bonusDuration: any;
  declare fxResource: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierCollectableBonusMana';

  onCollect(entity) {
    super.onCollect(entity);

    const action = this.getGameSession().createActionForType(BonusManaAction.type);
    action.setSource(this.getCard());
    action.setTarget(entity);
    action.bonusMana = this.bonusMana;
    action.bonusDuration = this.bonusDuration;
    return this.getGameSession().executeAction(action);
  }
}
ModifierCollectableBonusMana.prototype.type = 'ModifierCollectableBonusMana';
ModifierCollectableBonusMana.modifierName = i18next.t('modifiers.bonus_mana_name');
ModifierCollectableBonusMana.description = i18next.t('modifiers.bonus_mana_def');
ModifierCollectableBonusMana.prototype.bonusMana = 1;
ModifierCollectableBonusMana.prototype.bonusDuration = 1;
ModifierCollectableBonusMana.prototype.fxResource = ['FX.Modifiers.ModifierCollectibleBonusMana'];

module.exports = ModifierCollectableBonusMana;
