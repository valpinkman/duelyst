/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifierEmblem = require('./playerModifierEmblem');
const ModifierFrenzy = require('@duelyst/sdk/modifiers/modifierFrenzy');

class PlayerModifierEmblemSituationalVetQuestFrenzy extends PlayerModifierEmblem {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare maxStacks: any;
  declare numArtifactsRequired: any;

  static type = 'PlayerModifierEmblemSituationalVetQuestFrenzy';

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
    return this.applyManagedModifiersFromModifiersContextObjectsOnce(
      [ModifierFrenzy.createContextObject()],
      this.getCard(),
    );
  }

  updateCachedStateAfterActive() {
    this._private.cachedWasSituationActive = this._private.cachedIsSituationActive;
    this._private.cachedIsSituationActive =
      this._private.cachedIsActive && this.getIsSituationActiveForCache();

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
PlayerModifierEmblemSituationalVetQuestFrenzy.prototype.type =
  'PlayerModifierEmblemSituationalVetQuestFrenzy';
PlayerModifierEmblemSituationalVetQuestFrenzy.prototype.activeInHand = false;
PlayerModifierEmblemSituationalVetQuestFrenzy.prototype.activeInDeck = false;
PlayerModifierEmblemSituationalVetQuestFrenzy.prototype.activeInSignatureCards = false;
PlayerModifierEmblemSituationalVetQuestFrenzy.prototype.activeOnBoard = true;
PlayerModifierEmblemSituationalVetQuestFrenzy.prototype.maxStacks = 1;
PlayerModifierEmblemSituationalVetQuestFrenzy.prototype.numArtifactsRequired = 0;

module.exports = PlayerModifierEmblemSituationalVetQuestFrenzy;
