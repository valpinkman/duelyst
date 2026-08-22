/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierGrowOnBothTurns extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierGrowOnBothTurns';
}
ModifierGrowOnBothTurns.prototype.type = 'ModifierGrowOnBothTurns';
ModifierGrowOnBothTurns.modifierName = i18next.t('modifiers.grow_on_both_turns_name');
ModifierGrowOnBothTurns.description = i18next.t('modifiers.grow_on_both_turns_def');
ModifierGrowOnBothTurns.prototype.activeInHand = false;
ModifierGrowOnBothTurns.prototype.activeInDeck = false;
ModifierGrowOnBothTurns.prototype.activeInSignatureCards = false;
ModifierGrowOnBothTurns.prototype.activeOnBoard = true;
ModifierGrowOnBothTurns.prototype.fxResource = ['FX.Modifiers.ModifierGrowOnBothTurns'];

module.exports = ModifierGrowOnBothTurns;
