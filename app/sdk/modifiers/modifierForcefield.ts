/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const i18next = require('i18next');
const Modifier = require('./modifier');
const ModifierForcefieldAbsorb = require('./modifierForcefieldAbsorb');

class ModifierForcefield extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare maxStacks: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierForcefield';
  static isKeyworded = true;
  static description = null;

  onActivate() {
    // apply one-time absorb effect as soon when this modifier becomes active
    this.getGameSession().applyModifierContextObject(
      ModifierForcefieldAbsorb.createContextObject(),
      this.getCard(),
      this,
    );
    return super.onActivate();
  }

  onStartTurn(actionEvent) {
    const subMods = this.getSubModifiers();
    if (!subMods || (subMods != null ? subMods.length : undefined) === 0) {
      // re-apply forcefield one-time absorb effect if this modifier has no sub modifiers
      this.getGameSession().applyModifierContextObject(
        ModifierForcefieldAbsorb.createContextObject(),
        this.getCard(),
        this,
      );
    }
    return super.onStartTurn(actionEvent);
  }
}
ModifierForcefield.prototype.type = 'ModifierForcefield';
ModifierForcefield.keywordDefinition = i18next.t('modifiers.forcefield_def');
ModifierForcefield.modifierName = i18next.t('modifiers.forcefield_name');
ModifierForcefield.prototype.activeInHand = false;
ModifierForcefield.prototype.activeInDeck = false;
ModifierForcefield.prototype.activeInSignatureCards = false;
ModifierForcefield.prototype.activeOnBoard = true;
ModifierForcefield.prototype.maxStacks = 1;
ModifierForcefield.prototype.fxResource = ['FX.Modifiers.ModifierForcefield'];

module.exports = ModifierForcefield;
