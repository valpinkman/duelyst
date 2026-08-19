/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const MoveAction = require('app/sdk/actions/moveAction');
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierRangedProvoked extends Modifier {
  static type = 'ModifierRangedProvoked';
}
ModifierRangedProvoked.prototype.type = 'ModifierRangedProvoked';
ModifierRangedProvoked.modifierName = i18next.t('modifiers.ranged_provoked_name');
ModifierRangedProvoked.description = i18next.t('modifiers.ranged_provoked_def');
ModifierRangedProvoked.prototype.activeInHand = false;
ModifierRangedProvoked.prototype.activeInDeck = false;
ModifierRangedProvoked.prototype.activeInSignatureCards = false;
ModifierRangedProvoked.prototype.activeOnBoard = true;
ModifierRangedProvoked.prototype.fxResource = ['FX.Modifiers.ModifierProvoked'];

module.exports = ModifierRangedProvoked;
