/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const Modifier = require('./modifier');
const ModifierDyingWish = require('./modifierDyingWish');
const ModifierSilence = require('./modifierSilence');

class ModifierDyingWishDispelAllEnemyMinions extends ModifierDyingWish {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierDyingWishDispelAllEnemies';
  static description = 'Dispel all enemy minions';

  onDyingWish(action) {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      return (() => {
        const result = [];
        for (var enemyUnit of Array.from<any>(
          this.getGameSession().getBoard().getEnemyEntitiesForEntity(this.getCard(), CardType.Unit),
        )) {
          if (!enemyUnit.getIsGeneral()) {
            result.push(
              this.getGameSession().applyModifierContextObject(
                ModifierSilence.createContextObject(),
                enemyUnit,
              ),
            );
          } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }
  }
}
ModifierDyingWishDispelAllEnemyMinions.prototype.type = 'ModifierDyingWishDispelAllEnemies';
ModifierDyingWishDispelAllEnemyMinions.prototype.fxResource = [
  'FX.Modifiers.ModifierDyingWish',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierDyingWishDispelAllEnemyMinions;
