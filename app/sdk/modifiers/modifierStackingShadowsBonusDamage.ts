/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('./modifier');
const ModifierStackingShadows = require('./modifierStackingShadows');

class ModifierStackingShadowsBonusDamage extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierStackingShadowsBonusDamage';
  static modifierName = 'Shadow Creep Bonus Damage';
  static isHiddenToUI = true;

  static createContextObject(flatBonus, multiplierBonus) {
    if (flatBonus == null) { flatBonus = 0; }
    if (multiplierBonus == null) { multiplierBonus = 1; }
    const contextObject = super.createContextObject();
    contextObject.bonusDamageAmount = flatBonus;
    contextObject.multiplierBonusDamage = multiplierBonus;
    return contextObject;
  }

  getFlatBonusDamage() {
    return this.bonusDamageAmount;
  }

  getMultiplierBonusDamage() {
    return this.multiplierBonusDamage;
  }

  onActivate() {
    super.onActivate();

    // flush cached atk attribute for this card
    return this.getCard().flushCachedAttribute('atk');
  }

  onDeactivate() {
    super.onDeactivate();

    // flush cached atk attribute for this card
    return this.getCard().flushCachedAttribute('atk');
  }
}
ModifierStackingShadowsBonusDamage.prototype.type = 'ModifierStackingShadowsBonusDamage';
ModifierStackingShadowsBonusDamage.prototype.activeInHand = false;
ModifierStackingShadowsBonusDamage.prototype.activeInDeck = false;
ModifierStackingShadowsBonusDamage.prototype.activeInSignatureCards = false;
ModifierStackingShadowsBonusDamage.prototype.activeOnBoard = true;
ModifierStackingShadowsBonusDamage.prototype.fxResource = ['FX.Modifiers.ModifierShadowCreep'];

module.exports = ModifierStackingShadowsBonusDamage;
