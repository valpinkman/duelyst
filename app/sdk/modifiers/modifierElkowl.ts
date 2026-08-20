/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const Modifier = require('./modifier');
const ModifierOpeningGambit = require('./modifierOpeningGambit');
const ModifierFrenzy = require('./modifierFrenzy');
const ModifierFlying = require('./modifierFlying');
const ModifierTranscendance = require('./modifierTranscendance');
const ModifierProvoke = require('./modifierProvoke');
const ModifierRanged = require('./modifierRanged');
const ModifierFirstBlood = require('./modifierFirstBlood');
const ModifierRebirth = require('./modifierRebirth');
const ModifierBlastAttack = require('./modifierBlastAttack');

class ModifierElkowl extends ModifierOpeningGambit {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierElkowl';
  static description = 'Gain two random abilities';

  static createContextObject() {
    const contextObject = super.createContextObject();
    contextObject.allModifierContextObjects = [
      ModifierFrenzy.createContextObject(),
      ModifierFlying.createContextObject(),
      ModifierTranscendance.createContextObject(),
      ModifierProvoke.createContextObject(),
      ModifierRanged.createContextObject(),
      ModifierFirstBlood.createContextObject(),
      ModifierRebirth.createContextObject(),
      ModifierBlastAttack.createContextObject(),
    ];
    return contextObject;
  }

  onOpeningGambit(action) {
    super.onOpeningGambit(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      // pick two unique modifiers from the list
      const modifierContextObject = this.allModifierContextObjects.splice(
        this.getGameSession().getRandomIntegerForExecution(this.allModifierContextObjects.length),
        1,
      )[0];
      this.getGameSession().applyModifierContextObject(modifierContextObject, this.getCard());
      const modifierContextObject2 = this.allModifierContextObjects.splice(
        this.getGameSession().getRandomIntegerForExecution(this.allModifierContextObjects.length),
        1,
      )[0];
      return this.getGameSession().applyModifierContextObject(
        modifierContextObject2,
        this.getCard(),
      );
    }
  }
}
ModifierElkowl.prototype.type = 'ModifierElkowl';
ModifierElkowl.prototype.fxResource = ['FX.Modifiers.ModifierGenericBuff'];

module.exports = ModifierElkowl;
