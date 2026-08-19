/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierBond extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;
  declare static modifierName: any;
  declare static keywordDefinition: any;

  static type = 'ModifierBond';
  static isKeyworded = true;
  static description = null;

  onActivate() {
    super.onActivate();

    // make sure this card has a tribe
    const thisCardTribe = this.getCard().getRaceId();
    if (thisCardTribe != null) {
      // check for any friendly minion on the board that has same tribe as this card
      return (() => {
        const result = [];
        for (var friendlyMinion of Array.from<any>(this.getGameSession().getBoard().getFriendlyEntitiesForEntity(this.getCard()))) {
          if (friendlyMinion.getBelongsToTribe(thisCardTribe)) {
            // if we find a friendly minion with same tribe, activate bond effect once
            this.onBond();
            break;
          } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }
  }

  onBond() {}
}
ModifierBond.prototype.type = 'ModifierBond';
ModifierBond.modifierName = i18next.t('modifiers.bond_name');
ModifierBond.keywordDefinition = i18next.t('modifiers.bond_def');
ModifierBond.prototype.activeInHand = false;
ModifierBond.prototype.activeInDeck = false;
ModifierBond.prototype.activeInSignatureCards = false;
ModifierBond.prototype.activeOnBoard = true;
ModifierBond.prototype.fxResource = ['FX.Modifiers.ModifierBond'];
// override me in sub classes to implement special behavior

module.exports = ModifierBond;
