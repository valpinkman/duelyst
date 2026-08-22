/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const TeleportBehindUnitAction = require('@duelyst/sdk/actions/teleportBehindUnitAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierSynergize = require('./modifierSynergize');

class ModifierSynergizeTeleportRandomEnemy extends ModifierSynergize {
  declare type: any;
  declare canTargetGenerals: any;
  declare fxResource: any;

  static type = 'ModifierSynergizeTeleportRandomEnemy';
  static description = 'Teleport a random enemy to the space behind your General';

  onSynergize(action) {
    super.onSynergize(action);

    // find target to teleport
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const entities = this.getGameSession()
        .getBoard()
        .getEnemyEntitiesAroundEntity(this.getCard(), CardType.Unit, CONFIG.WHOLE_BOARD_RADIUS);
      const validEntities = [];
      for (var entity of Array.from<any>(entities)) {
        if (!entity.getIsGeneral() || this.canTargetGenerals) {
          validEntities.push(entity);
        }
      }

      // pick a random enemy from all enemies found on the board
      if (validEntities.length > 0) {
        const unitToTeleport =
          validEntities[this.getGameSession().getRandomIntegerForExecution(validEntities.length)];
        const teleportBehindUnitAction = new TeleportBehindUnitAction(
          this.getGameSession(),
          this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId()),
          unitToTeleport,
        );
        // and teleport it
        return this.getGameSession().executeAction(teleportBehindUnitAction);
      }
    }
  }
}
ModifierSynergizeTeleportRandomEnemy.prototype.type = 'ModifierSynergizeTeleportRandomEnemy';
ModifierSynergizeTeleportRandomEnemy.prototype.canTargetGenerals = true;
ModifierSynergizeTeleportRandomEnemy.prototype.fxResource = ['FX.Modifiers.ModifierSpellWatch'];

module.exports = ModifierSynergizeTeleportRandomEnemy;
