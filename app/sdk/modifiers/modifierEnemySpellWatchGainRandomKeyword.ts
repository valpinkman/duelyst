/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const UtilsGameSession = require('app/sdk/utils/utils_game_session');
const Modifier = require('./modifier');
const ModifierEnemySpellWatch = require('./modifierEnemySpellWatch');
const ModifierFrenzy = require('./modifierFrenzy');
const ModifierFlying = require('./modifierFlying');
const ModifierTranscendance = require('./modifierTranscendance');
const ModifierProvoke = require('./modifierProvoke');
const ModifierRanged = require('./modifierRanged');
const ModifierForcefield = require('./modifierForcefield');
const ModifierBlastAttack = require('./modifierBlastAttack');
const ModifierGrow = require('./modifierGrow');
const ModifierFirstBlood = require('./modifierFirstBlood');
const ModifierBackstab = require('./modifierBackstab');

class ModifierSpellWatchGainRandomKeyword extends ModifierEnemySpellWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierSpellWatchGainRandomKeyword';
  static description = 'Whenever you cast a spell, this gains a random keyword ability';

  static createContextObject() {
    const contextObject = super.createContextObject();
    contextObject.allModifierContextObjects = [
      ModifierFrenzy.createContextObject(),
      ModifierFlying.createContextObject(),
      ModifierTranscendance.createContextObject(),
      ModifierProvoke.createContextObject(),
      ModifierRanged.createContextObject(),
      ModifierBlastAttack.createContextObject(),
      ModifierForcefield.createContextObject(),
      ModifierGrow.createContextObject(2),
      ModifierFirstBlood.createContextObject(),
      ModifierBackstab.createContextObject(2),
    ];
    return contextObject;
  }

  onEnemySpellWatch(action) {
    super.onEnemySpellWatch(action);

    if (
      this.getGameSession().getIsRunningAsAuthoritative() &&
      this.allModifierContextObjects.length > 0
    ) {
      // pick one modifier from the remaining list and splice it out of the set of choices
      const modifierContextObject = this.allModifierContextObjects.splice(
        this.getGameSession().getRandomIntegerForExecution(this.allModifierContextObjects.length),
        1,
      )[0];
      return this.getGameSession().applyModifierContextObject(
        modifierContextObject,
        this.getCard(),
      );
    }
  }
}
ModifierSpellWatchGainRandomKeyword.prototype.type = 'ModifierSpellWatchGainRandomKeyword';
ModifierSpellWatchGainRandomKeyword.prototype.fxResource = ['FX.Modifiers.ModifierGenericBuff'];

module.exports = ModifierSpellWatchGainRandomKeyword;
