/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('app/sdk/actions/healAction');
const DamageAction = require('app/sdk/actions/damageAction');
const Races = require('app/sdk/cards/racesLookup');
const ModifierBond = require('./modifierBond');

class ModifierBondNightshroud extends ModifierBond {
  declare type: any;

  static type = 'ModifierBondNightshroud';
  static description =
    'Your General steals 1 Health from the enemy General for each friendly minion';

  onBond() {
    let numFriendlyArcanysts = 0;
    for (var unit of Array.from<any>(
      this.getGameSession().getBoard().getFriendlyEntitiesForEntity(this.getCard()),
    )) {
      if (unit.getBelongsToTribe(Races.Arcanyst)) {
        numFriendlyArcanysts++;
      }
    }

    const general = this.getCard()
      .getGameSession()
      .getGeneralForPlayerId(this.getCard().getOwnerId());

    const healAction = new HealAction(this.getGameSession());
    healAction.setOwnerId(this.getCard().getOwnerId());
    healAction.setTarget(general);
    healAction.setHealAmount(numFriendlyArcanysts);
    this.getGameSession().executeAction(healAction);

    const enemyGeneral = this.getCard()
      .getGameSession()
      .getGeneralForPlayerId(
        this.getGameSession().getOpponentPlayerIdOfPlayerId(this.getCard().getOwnerId()),
      );

    const damageAction = new DamageAction(this.getGameSession());
    damageAction.setOwnerId(this.getOwnerId());
    damageAction.setTarget(enemyGeneral);
    damageAction.setDamageAmount(numFriendlyArcanysts);
    return this.getGameSession().executeAction(damageAction);
  }
}
ModifierBondNightshroud.prototype.type = 'ModifierBondNightshroud';

module.exports = ModifierBondNightshroud;
