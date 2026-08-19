/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
class SpellFilterType {
  static None = 0;
  static EnemyDirect = 1;
  static EnemyIndirect = 2;
  static AllyDirect = 3;
  static AllyIndirect = 4;
  static NeutralDirect = 5;
  static NeutralIndirect = 6;
  static SpawnSource = 7;
}
// spell can be applied in any standard spawn location (near your General or other friendly units)

module.exports = SpellFilterType;
