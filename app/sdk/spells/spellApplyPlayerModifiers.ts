/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SpellApplyModifiers = require('./spellApplyModifiers');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');

class SpellApplyPlayerModifiers extends SpellApplyModifiers {
  declare targetType: any;
  declare spellFilterType: any;
  declare applyToOwnGeneral: any;
  declare applyToOpponentGeneral: any;

  getPrivateDefaults(gameSession) {
    const p = super.getPrivateDefaults(gameSession);
    p.targetsSpace = true; // does not target any unit directly
    return p;
  }

  _findApplyEffectPositions(position, sourceAction) {
    const applyEffectPositions = [];

    if (
      this.targetModifiersContextObjects != null &&
      this.targetModifiersContextObjects.length > 0
    ) {
      const ownerId = this.getOwnerId();

      if (this.applyToOwnGeneral) {
        // target own General
        const ownGeneral = this.getGameSession().getGeneralForPlayerId(ownerId);
        applyEffectPositions.push(ownGeneral.getPosition());
      }

      if (this.applyToOpponentGeneral) {
        // target opponent's General
        const opponentGeneral = this.getGameSession().getGeneralForOpponentOfPlayerId(ownerId);
        applyEffectPositions.push(opponentGeneral.getPosition());
      }
    }

    return applyEffectPositions;
  }
}
SpellApplyPlayerModifiers.prototype.targetType = CardType.Unit;
SpellApplyPlayerModifiers.prototype.spellFilterType = SpellFilterType.NeutralDirect;
SpellApplyPlayerModifiers.prototype.applyToOwnGeneral = false;
SpellApplyPlayerModifiers.prototype.applyToOpponentGeneral = false;

module.exports = SpellApplyPlayerModifiers;
