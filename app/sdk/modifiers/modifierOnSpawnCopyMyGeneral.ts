/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierSilence = require('app/sdk/modifiers/modifierSilence');
const Modifier = require('./modifier');

class ModifierOnSpawnCopyMyGeneral extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierOnSpawnCopyMyGeneral';
  static modifierName = 'ModifierOnSpawnCopyMyGeneral';
  static description = 'Become a copy of your General';
  static isHiddenToUI = true;

  onApplyToCardBeforeSyncState() {
    super.onApplyToCardBeforeSyncState();

    const general = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());
    const myCard = this.getCard();

    // set the max hp of the clone to the current hp of the general
    // instead of using getHP (the current hp), we have to use the base max - damage taken
    // as we'll clone all modifiers from the general next, which could boost the clone's max hp
    myCard.maxHP = general.maxHP - general.getDamage();

    // flush cached maxHP attribute on clone
    // this is necessary as no modifier is changing the attribute value via the expected methods
    myCard.flushCachedAttribute('maxHP');

    // clone all modifiers from general
    return (() => {
      const result = [];
      for (var modifier of Array.from<any>(general.getModifiers())) {
        if (
          modifier != null &&
          !modifier.getIsAdditionalInherent() &&
          modifier.getIsCloneable() &&
          !(modifier instanceof ModifierSilence)
        ) {
          var contextObject = modifier.createContextObjectForClone();

          // convert artifact modifiers into "plain" modifiers
          if (contextObject.maxDurability > 0) {
            contextObject.durability = 0;
            contextObject.maxDurability = 0;
            contextObject.isRemovable = true;
          }

          // hide all modifiers applied to this copy (prevents weird names from showing up)
          contextObject.isHiddenToUI = true;
          result.push(
            this.getCard()
              .getGameSession()
              .applyModifierContextObject(contextObject, this.getCard()),
          );
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
ModifierOnSpawnCopyMyGeneral.prototype.type = 'ModifierOnSpawnCopyMyGeneral';
ModifierOnSpawnCopyMyGeneral.prototype.activeInHand = false;
ModifierOnSpawnCopyMyGeneral.prototype.activeInDeck = false;
ModifierOnSpawnCopyMyGeneral.prototype.activeInSignatureCards = false;
ModifierOnSpawnCopyMyGeneral.prototype.activeOnBoard = true;
ModifierOnSpawnCopyMyGeneral.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
  'FX.Modifiers.ModifierGenericSpawn',
];

module.exports = ModifierOnSpawnCopyMyGeneral;
