/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const i18next = require('i18next');
const Modifier = require('./modifier');
const ModifierEndTurnWatch = require('./modifierEndTurnWatch');
const ModifierBlastAttack = require('./modifierBlastAttack');
const ModifierBackstab = require('./modifierBackstab');
const ModifierInfiltrate = require('./modifierInfiltrate');
const ModifierGrow = require('./modifierGrow');
const ModifierBandingHealSelfAndGeneral = require('./modifierBandingHealSelfAndGeneral');
const ModifierDeathWatchDrawToXCards = require('./modifierDeathWatchDrawToXCards');

class ModifierRook extends ModifierEndTurnWatch {
  static type = 'ModifierRook';
  static description = 'At the end of your turn, this minion gains a random Faction ability';

  static createContextObject() {
    const contextObject = super.createContextObject();
    contextObject.allModifierContextObjects = [
      ModifierBlastAttack.createContextObject(),
      ModifierBackstab.createContextObject(5),
      ModifierInfiltrate.createContextObject([
        Modifier.createContextObjectWithAttributeBuffs(5, 0, { appliedName: i18next.t('modifiers.rook_infiltrate_name') }),
      ], i18next.t('modifiers.rook_infiltrate_def')),
      ModifierGrow.createContextObject(5),
      ModifierBandingHealSelfAndGeneral.createContextObject(5),
      ModifierDeathWatchDrawToXCards.createContextObject(5),
    ];
    return contextObject;
  }

  onTurnWatch(action) {
    super.onTurnWatch(action);

    if (this.getGameSession().getIsRunningAsAuthoritative() && (this.allModifierContextObjects.length > 0)) {
      // pick one modifier from the remaining list and splice it out of the set of choices
      const modifierContextObject = this.allModifierContextObjects.splice(this.getGameSession().getRandomIntegerForExecution(this.allModifierContextObjects.length), 1)[0];
      return this.getGameSession().applyModifierContextObject(modifierContextObject, this.getCard());
    }
  }
}
ModifierRook.prototype.type = 'ModifierRook';
ModifierRook.prototype.activeInHand = false;
ModifierRook.prototype.activeInDeck = false;
ModifierRook.prototype.activeInSignatureCards = false;
ModifierRook.prototype.activeOnBoard = true;
ModifierRook.prototype.fxResource = ['FX.Modifiers.ModifierGenericBuff'];

module.exports = ModifierRook;
