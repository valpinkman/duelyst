/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const Logger = require('app/common/logger');
const RefreshExhaustionAction = require('app/sdk/actions/refreshExhaustionAction');
const ApplyExhaustionAction = require('app/sdk/actions/applyExhaustionAction');
const AttackAction = require('app/sdk/actions/attackAction');
const MoveAction = require('app/sdk/actions/moveAction');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const _ = require('underscore');

const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierStunned extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare maxStacks: any;
  declare durationEndTurn: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierStunned';
  static isKeyworded = true;
  static description = null;

  onApplyToCardBeforeSyncState() {
    super.onApplyToCardBeforeSyncState();

    // if your unit is stunned during your turn, they will remain stunned
    // until the end of your NEXT turn
    if (this.getCard().isOwnersTurn()) {
      return this.durationEndTurn = 3;
    }
  }

  onValidateAction(event) {
    const a = event.action;

    // stunned unit cannot explicitly attack (but it can do "auto" attacks like strikeback)
    if (a.getIsValid()) {
      if (a instanceof AttackAction) {
        if (!a.getIsImplicit() && (this.getCard() === a.getSource())) {
          return this.invalidateAction(a, this.getCard().getPosition(), 'Stunned, cannot attack.');
        }
      } else if (a instanceof MoveAction) {
        if (this.getCard() === a.getSource()) {
          return this.invalidateAction(a, this.getCard().getPosition(), 'Stunned, cannot move.');
        }
      }
    }
  }
}
ModifierStunned.prototype.type = 'ModifierStunned';
ModifierStunned.keywordDefinition = i18next.t('modifiers.stunned_def');
ModifierStunned.modifierName = i18next.t('modifiers.stunned_name');
ModifierStunned.prototype.activeInHand = false;
ModifierStunned.prototype.activeInDeck = false;
ModifierStunned.prototype.activeInSignatureCards = false;
ModifierStunned.prototype.activeOnBoard = true;
ModifierStunned.prototype.maxStacks = 1;
ModifierStunned.prototype.durationEndTurn = 2;
ModifierStunned.prototype.fxResource = ['FX.Modifiers.ModifierStunned'];

module.exports = ModifierStunned;
