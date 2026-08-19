/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SwapUnitAllegianceAction = require('app/sdk/actions/swapUnitAllegianceAction');
const i18next = require('i18next');
const CardType = require('app/sdk/cards/cardType');
const Stringifiers = require('app/sdk/helpers/stringifiers');
const Modifier = require('./modifier');

class ModifierSwitchAllegiancesGainAttack extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierSwitchAllegiancesGainAttack';
  static modifierName = 'ModifierSwitchAllegiancesGainAttack';
  static description = 'ModifierSwitchAllegiancesGainAttack';

  static createContextObject(options) {
    const contextObject = super.createContextObject(options);
    return contextObject;
  }

  onActivate() {
    let allowUntargetable;
    super.onActivate();

    const allUnits = this.getGameSession().getBoard().getCards(CardType.Unit, (allowUntargetable = true));
    let friendlyUnitCounter = 0;

    for (var unit of Array.from<any>(allUnits)) {
      if (!unit.getIsGeneral() && (unit !== this.getCard())) {
        if (unit.getOwnerId() === this.getCard().getOwnerId()) {
          friendlyUnitCounter++;
        }
        var a = new SwapUnitAllegianceAction(this.getGameSession());
        a.setTarget(unit);
        this.getGameSession().executeAction(a);
      }
    }

    // apply the buff
    friendlyUnitCounter *= 3;
    const attackBuff = [Modifier.createContextObjectWithAttributeBuffs(friendlyUnitCounter, friendlyUnitCounter, {
      modifierName: 'Discordant Spirit',
      description: Stringifiers.stringifyAttackHealthBuff(friendlyUnitCounter, friendlyUnitCounter),
    })];
    return this.applyManagedModifiersFromModifiersContextObjects(attackBuff, this.getCard());
  }
}
ModifierSwitchAllegiancesGainAttack.prototype.type = 'ModifierSwitchAllegiancesGainAttack';
ModifierSwitchAllegiancesGainAttack.prototype.activeInHand = false;
ModifierSwitchAllegiancesGainAttack.prototype.activeInDeck = false;
ModifierSwitchAllegiancesGainAttack.prototype.activeInSignatureCards = false;
ModifierSwitchAllegiancesGainAttack.prototype.activeOnBoard = true;
ModifierSwitchAllegiancesGainAttack.prototype.fxResource = ['FX.Modifiers.ModifierBond'];

module.exports = ModifierSwitchAllegiancesGainAttack;
