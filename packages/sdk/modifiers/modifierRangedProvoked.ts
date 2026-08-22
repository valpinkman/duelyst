/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('@duelyst/common/config');
const MoveAction = require('@duelyst/sdk/actions/moveAction');
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierRangedProvoked extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;
  declare static modifierName: any;
  declare static description: any;

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
