/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishApplyModifiersToGenerals extends ModifierDyingWish {
  static type = 'ModifierDyingWishApplyModifiersToGenerals';

  static createContextObject(modifiersContextObjects, includeMyGeneral, includeOppGeneral, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    contextObject.includeMyGeneral = includeMyGeneral;
    contextObject.includeOppGeneral = includeOppGeneral;
    return contextObject;
  }

  onDyingWish() {
    const general = this.getCard().getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());
    const enemyGeneral = this.getCard().getGameSession().getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId());

    if (this.modifiersContextObjects != null) {
      return (() => {
        const result = [];
        for (var modifierContextObject of Array.from(this.modifiersContextObjects)) {
          if (modifierContextObject != null) {
            if (this.includeMyGeneral) {
              this.getGameSession().applyModifierContextObject(modifierContextObject, general);
            }
            if (this.includeOppGeneral) {
              result.push(this.getGameSession().applyModifierContextObject(modifierContextObject, enemyGeneral));
            } else {
              result.push(undefined);
            }
          } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }
  }
}
ModifierDyingWishApplyModifiersToGenerals.prototype.type = 'ModifierDyingWishApplyModifiersToGenerals';
ModifierDyingWishApplyModifiersToGenerals.prototype.fxResource = ['FX.Modifiers.ModifierDyingWish', 'FX.Modifiers.ModifierGenericBuff'];
ModifierDyingWishApplyModifiersToGenerals.prototype.modifiersContextObjects = null;
ModifierDyingWishApplyModifiersToGenerals.prototype.includeMyGeneral = true;
ModifierDyingWishApplyModifiersToGenerals.prototype.includeOppGeneral = true;

module.exports = ModifierDyingWishApplyModifiersToGenerals;
