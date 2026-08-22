/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const SpellHeal = require('./spellHeal');
const CardType = require('@duelyst/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const DamageAction = require('@duelyst/sdk/actions/damageAction');

class SpellHealYourGeneral extends SpellHeal {
  declare targetType: any;
  declare spellFilterType: any;
  declare healModifier: any;

  _findApplyEffectPositions(position, sourceAction) {
    const applyEffectPositions = [];

    // can only target enemy general
    const general = this.getGameSession().getGeneralForPlayerId(this.getOwnerId());
    if (general != null) {
      applyEffectPositions.push(general.getPosition());
    }

    return applyEffectPositions;
  }
}
SpellHealYourGeneral.prototype.targetType = CardType.Unit;
SpellHealYourGeneral.prototype.spellFilterType = SpellFilterType.None;
SpellHealYourGeneral.prototype.healModifier = 0;

module.exports = SpellHealYourGeneral;
