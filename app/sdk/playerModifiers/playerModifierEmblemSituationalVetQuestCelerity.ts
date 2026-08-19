/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifierEmblem = require('./playerModifierEmblem');
const ModifierTranscendance = require('app/sdk/modifiers/modifierTranscendance');

class PlayerModifierEmblemSituationalVetQuestCelerity extends PlayerModifierEmblem {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare maxStacks: any;
  declare numArtifactsRequired: any;

  static type = 'PlayerModifierEmblemSituationalVetQuestCelerity';

  static createContextObject(numArtifactsRequired, options) {
    const contextObject = super.createContextObject(options);
    contextObject.numArtifactsRequired = numArtifactsRequired;
    return contextObject;
  }

  getPrivateDefaults(gameSession) {
    const p = super.getPrivateDefaults(gameSession);

    p.cachedIsSituationActive = false;
    p.cachedWasSituationActive = false;

    return p;
  }

  onApplyToCardBeforeSyncState() {
    super.onApplyToCardBeforeSyncState();

    // apply situational modifiers once and retain them on self
    // this way we can enable/disable based on whether the situation is active
    // rather than constantly adding and removing modifiers
    return this.applyManagedModifiersFromModifiersContextObjectsOnce([ModifierTranscendance.createContextObject()], this.getCard());
  }

  updateCachedStateAfterActive() {
    this._private.cachedWasSituationActive = this._private.cachedIsSituationActive;
    this._private.cachedIsSituationActive = this._private.cachedIsActive && this.getIsSituationActiveForCache();

    // call super after updating whether situation is active
    // because we need to know if situation is active to know whether sub modifiers are disabled
    return super.updateCachedStateAfterActive();
  }

  getAreSubModifiersActiveForCache() {
    return this._private.cachedIsSituationActive;
  }

  getIsAura() {
    // situational modifiers act as auras but do not use the default aura behavior
    return true;
  }

  getIsSituationActiveForCache() {
    const modifiersByArtifact = this.getCard().getArtifactModifiersGroupedByArtifactCard();
    if (modifiersByArtifact.length >= this.numArtifactsRequired) {
      return true;
    }
    return false;
  }
}
PlayerModifierEmblemSituationalVetQuestCelerity.prototype.type = 'PlayerModifierEmblemSituationalVetQuestCelerity';
PlayerModifierEmblemSituationalVetQuestCelerity.prototype.activeInHand = false;
PlayerModifierEmblemSituationalVetQuestCelerity.prototype.activeInDeck = false;
PlayerModifierEmblemSituationalVetQuestCelerity.prototype.activeInSignatureCards = false;
PlayerModifierEmblemSituationalVetQuestCelerity.prototype.activeOnBoard = true;
PlayerModifierEmblemSituationalVetQuestCelerity.prototype.maxStacks = 1;
PlayerModifierEmblemSituationalVetQuestCelerity.prototype.numArtifactsRequired = 0;

module.exports = PlayerModifierEmblemSituationalVetQuestCelerity;
