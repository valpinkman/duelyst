/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const SpellDamage = require('./spellDamage');
const CardType = require('@duelyst/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const DamageAction = require('@duelyst/sdk/actions/damageAction');

class SpellDamageMinionAndGeneral extends SpellDamage {
  declare targetType: any;
  declare spellFilterType: any;
  declare damageAmount: any;

  _findApplyEffectPositions(position, sourceAction) {
    const applyEffectPositions = super._findApplyEffectPositions(position, sourceAction);

    // can only target enemy general
    const general = this.getGameSession().getGeneralForPlayerId(this.getOwnerId());
    if (general != null) {
      applyEffectPositions.push(general.getPosition());
    }

    return applyEffectPositions;
  }
}
SpellDamageMinionAndGeneral.prototype.targetType = CardType.Unit;
SpellDamageMinionAndGeneral.prototype.spellFilterType = SpellFilterType.NeutralDirect;
SpellDamageMinionAndGeneral.prototype.damageAmount = 0;

module.exports = SpellDamageMinionAndGeneral;
