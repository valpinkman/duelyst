/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const ModifierEnemyAttackWatch = require('./modifierEnemyAttackWatch');
const Modifier = require('./modifier');

class ModifierWildTahr extends ModifierEnemyAttackWatch {
  static type = 'ModifierWildTahr';
  static modifierName = 'ModifierWildTahr';

  onEnemyAttackWatch(action) {
    const statContextObject = Modifier.createContextObjectWithAttributeBuffs(3);
    statContextObject.appliedName = i18next.t('modifiers.wild_tahr_name');
    statContextObject.durationEndTurn = 2;
    return this.getGameSession().applyModifierContextObject(statContextObject, this.getCard());
  }
}
ModifierWildTahr.prototype.type = 'ModifierWildTahr';
ModifierWildTahr.description = i18next.t('modifiers.wild_tahr_def');

module.exports = ModifierWildTahr;
