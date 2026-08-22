/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierBanded = require('./modifierBanded');
const Modifier = require('./modifier');

class ModifierBandedDoubleAttack extends ModifierBanded {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierBandedDoubleAttack';
  static modifierName = "Zealed: Lion's Growth";
  static description = "Double this minion's Attack at the end of your turn";

  onEndTurn() {
    super.onEndTurn();

    if (this.getGameSession().getCurrentPlayer() === this.getCard().getOwner()) {
      let modifierContextObject;
      if (this.getCard().getATK() * 2 < 999) {
        // arbitrary limit at the moment, don't want to push crazy huge number to firebase. also messes up the UI if attack gets too big
        modifierContextObject = Modifier.createContextObjectWithAttributeBuffs(
          this.getCard().getATK(),
        );
      } else {
        modifierContextObject = Modifier.createContextObjectWithAttributeBuffs(
          999 - this.getCard().getATK(),
        );
      }
      modifierContextObject.appliedName = 'Radiance';
      return this.getCard()
        .getGameSession()
        .applyModifierContextObject(modifierContextObject, this.getCard());
    }
  }
}
ModifierBandedDoubleAttack.prototype.type = 'ModifierBandedDoubleAttack';
ModifierBandedDoubleAttack.prototype.fxResource = [
  'FX.Modifiers.ModifierZealed',
  'FX.Modifiers.ModifierZealedDoubleAttack',
];

module.exports = ModifierBandedDoubleAttack;
