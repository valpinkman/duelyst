/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('./modifier');

class ModifierCostEqualGeneralHealth extends Modifier {
  declare type: any;
  declare activeInDeck: any;
  declare activeInHand: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare maxStacks: any;

  static type = 'ModifierCostEqualGeneralHealth';
  static modifierName = 'Raging Taura';
  static description = "This minion's cost is equal to your General's Health";

  constructor(gameSession) {
    super(gameSession);
    this.attributeBuffsAbsolute = ['manaCost'];
    this.attributeBuffsFixed = ['manaCost'];
  }

  getPrivateDefaults(gameSession) {
    const p = super.getPrivateDefaults(gameSession);

    p.cachedManaCost = 0;

    return p;
  }

  getBuffedAttribute(attributeValue, buffKey) {
    if (buffKey === 'manaCost') {
      return this._private.cachedManaCost;
    }
    return super.getBuffedAttribute(attributeValue, buffKey);
  }

  getBuffsAttributes() {
    return true;
  }

  getBuffsAttribute(buffKey) {
    return buffKey === 'manaCost' || super.getBuffsAttribute(buffKey);
  }

  updateCachedStateAfterActive() {
    super.updateCachedStateAfterActive();

    const card = this.getCard();
    const owner = card != null ? card.getOwner() : undefined;
    const general = this.getGameSession().getGeneralForPlayer(owner);
    let manaCost = 0;
    if (general != null) {
      manaCost = Math.max(0, general.getHP());
    } else {
      manaCost = 0;
    }

    if (this._private.cachedManaCost !== manaCost) {
      this._private.cachedManaCost = manaCost;
      return this.getCard().flushCachedAttribute('manaCost');
    }
  }
}
ModifierCostEqualGeneralHealth.prototype.type = 'ModifierCostEqualGeneralHealth';
ModifierCostEqualGeneralHealth.prototype.activeInDeck = false;
ModifierCostEqualGeneralHealth.prototype.activeInHand = true;
ModifierCostEqualGeneralHealth.prototype.activeInSignatureCards = false;
ModifierCostEqualGeneralHealth.prototype.activeOnBoard = true;
ModifierCostEqualGeneralHealth.prototype.maxStacks = 1;

module.exports = ModifierCostEqualGeneralHealth;
