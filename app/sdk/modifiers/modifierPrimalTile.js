/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');
const ModifierGrowPermanent = require('./modifierGrowPermanent');

class ModifierPrimalTile extends Modifier {
  static type = 'ModifierPrimalTile';

  static getDescription() {
    return this.description;
  }

  static createContextObject(options) {
    const contextObject = super.createContextObject(options);
    const modifiersContextObjects = [ModifierGrowPermanent.createContextObject(2)];
    modifiersContextObjects[0].description = this.description;
    modifiersContextObjects[0].modifierName = this.modifierName;
    contextObject.activeInHand = false;
    contextObject.activeInDeck = false;
    contextObject.activeInSignatureCards = false;
    contextObject.activeOnBoard = true;
    contextObject.modifiersContextObjects = modifiersContextObjects;
    contextObject.isAura = true;
    contextObject.auraIncludeSelf = false;
    contextObject.auraIncludeAlly = true;
    contextObject.auraIncludeEnemy = false;
    contextObject.auraIncludeGeneral = false;
    contextObject.auraRadius = 0;
    return contextObject;
  }
}
ModifierPrimalTile.prototype.type = 'ModifierPrimalTile';
ModifierPrimalTile.modifierName = i18next.t('modifiers.primal_flourish_name');
ModifierPrimalTile.keywordDefinition = i18next.t('modifiers.primal_flourish_def');
ModifierPrimalTile.description = i18next.t('modifiers.primal_flourish_def');
ModifierPrimalTile.prototype.activeInHand = false;
ModifierPrimalTile.prototype.activeInDeck = false;
ModifierPrimalTile.prototype.activeInSignatureCards = false;
ModifierPrimalTile.prototype.activeOnBoard = true;
ModifierPrimalTile.prototype.fxResource = ['FX.Modifiers.ModifierPrimalTile'];

module.exports = ModifierPrimalTile;
