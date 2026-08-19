/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
class GameFormat {
  static Standard = 0;
  static Legacy = 1;

  static isLegacyFormat(type) {
    return type === GameFormat.Legacy;
  }
}

module.exports = GameFormat;
