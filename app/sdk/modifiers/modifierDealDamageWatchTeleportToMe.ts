/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('app/sdk/actions/attackAction');
const CardType = require('app/sdk/cards/cardType');
const TeleportInFrontOfUnitAction = require('app/sdk/actions/teleportInFrontOfUnitAction');
const _ = require('underscore');
const ModifierDealDamageWatch = require('./modifierDealDamageWatch');
const Modifier = require('./modifier');

class ModifierDealDamageWatchTeleportToMe extends ModifierDealDamageWatch {
  declare type: any;
  declare maxStacks: any;

  static type = 'ModifierDealDamageWatchTeleportToMe';
  static modifierName = 'Deal Damage Watch Teleport To Me';
  static description = 'Minions damaged by Syvrel are pulled in front of him';

  onDealDamage(action) {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      // calculate results of teleport only on server, since results may change at execution time
      const target = action.getTarget();
      if (target && !target.getIsGeneral()) {
        // move target in front of this minion
        const teleAction = new TeleportInFrontOfUnitAction(
          this.getGameSession(),
          this.getCard(),
          target,
        );
        teleAction.setFXResource(_.union(teleAction.getFXResource(), this.getFXResource()));
        return this.getGameSession().executeAction(teleAction);
      }
    }
  }
}
ModifierDealDamageWatchTeleportToMe.prototype.type = 'ModifierDealDamageWatchTeleportToMe';
ModifierDealDamageWatchTeleportToMe.prototype.maxStacks = 1;

module.exports = ModifierDealDamageWatchTeleportToMe;
