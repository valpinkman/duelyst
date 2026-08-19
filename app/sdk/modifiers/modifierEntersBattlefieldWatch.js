/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('./modifier');

class ModifierEntersBattlefieldWatch extends Modifier {
  static type = 'ModifierEntersBattlefieldWatch';

  onActivate() {
    super.onActivate();
    return this.onEntersBattlefield();
  }

  onEntersBattlefield() {}
}
ModifierEntersBattlefieldWatch.prototype.type = 'ModifierEntersBattlefieldWatch';
ModifierEntersBattlefieldWatch.prototype.activeInHand = false;
ModifierEntersBattlefieldWatch.prototype.activeInDeck = false;
ModifierEntersBattlefieldWatch.prototype.activeInSignatureCards = false;
ModifierEntersBattlefieldWatch.prototype.activeOnBoard = true;
// override me in sub classes to implement special behavior

module.exports = ModifierEntersBattlefieldWatch;
