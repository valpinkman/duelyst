/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierSilence = require('app/sdk/modifiers/modifierSilence');
const KillAction = require('app/sdk/actions/killAction');
const DieAction = require('app/sdk/actions/dieAction');
const SwapGeneralAction = require('app/sdk/actions/swapGeneralAction');
const Modifier = require('./modifier');

class ModifierOnSpawnKillMyGeneral extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierOnSpawnKillMyGeneral';
  static modifierName = 'ModifierOnSpawnKillMyGeneral';
  static description = 'Kill your General';
  static isHiddenToUI = true;

  static createContextObject(options) {
    const contextObject = super.createContextObject(options);
    return contextObject;
  }

  onActivate() {
    super.onActivate();

    const general = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());
    const myCard = this.getCard();

    // make sure to remove self to prevent triggering this modifier again
    this.getGameSession().removeModifier(this);

    // turn the new unit into your general
    if (general != null) {
      const swapGeneralAction = new SwapGeneralAction(this.getGameSession());
      swapGeneralAction.setIsDepthFirst(false);
      swapGeneralAction.setSource(general);
      swapGeneralAction.setTarget(myCard);
      this.getGameSession().executeAction(swapGeneralAction);
    }

    // kill the old general
    const dieAction = new DieAction(this.getGameSession());
    dieAction.setOwnerId(myCard.getOwnerId());
    dieAction.setTarget(general);
    return this.getGameSession().executeAction(dieAction);
  }
}
ModifierOnSpawnKillMyGeneral.prototype.type = 'ModifierOnSpawnKillMyGeneral';
ModifierOnSpawnKillMyGeneral.prototype.activeInHand = false;
ModifierOnSpawnKillMyGeneral.prototype.activeInDeck = false;
ModifierOnSpawnKillMyGeneral.prototype.activeInSignatureCards = false;
ModifierOnSpawnKillMyGeneral.prototype.activeOnBoard = true;
ModifierOnSpawnKillMyGeneral.prototype.fxResource = ['FX.Modifiers.ModifierOpeningGambit', 'FX.Modifiers.ModifierGenericSpawn'];

module.exports = ModifierOnSpawnKillMyGeneral;
