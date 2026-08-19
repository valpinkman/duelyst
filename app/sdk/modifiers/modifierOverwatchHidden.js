/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');

/*
  Generic modifier used to hide the true overwatch modifier from an opponent.
*/
class ModifierOverwatchHidden extends Modifier {
  static type = 'ModifierOverwatchHidden';
  static isKeyworded = true;
  static keywordDefinition = 'A hidden effect which only takes place when a specific event occurs.';
  static modifierName = 'Overwatch';
  static description = '%X';

  static createContextObject(manaCost, options) {
    if (manaCost == null) { manaCost = 0; }
    const contextObject = super.createContextObject(options);
    contextObject.manaCost = manaCost;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return i18next.t('modifiers.sentinel_watchful');
    }
    return this.description;
  }

  onCreatedToHide(source) {
    super.onCreatedToHide(source);

    // copy base mana cost of source modifier's source card
    return this.contextObject.manaCost = source.getSourceCard().getBaseManaCost();
  }
}
ModifierOverwatchHidden.prototype.type = 'ModifierOverwatchHidden';
ModifierOverwatchHidden.prototype.activeInHand = false;
ModifierOverwatchHidden.prototype.activeInDeck = false;
ModifierOverwatchHidden.prototype.activeInSignatureCards = false;
ModifierOverwatchHidden.prototype.activeOnBoard = true;
ModifierOverwatchHidden.prototype.fxResource = ['FX.Modifiers.ModifierOverwatch'];

module.exports = ModifierOverwatchHidden;
