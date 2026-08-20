/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifier = require('./playerModifier');
const PlayerModifierMechazorSummoned = require('./playerModifierMechazorSummoned');
const ModifierCounterMechazorBuildProgress = require('app/sdk/modifiers/modifierCounterMechazorBuildProgress');

const i18next = require('i18next');

class PlayerModifierMechazorBuildProgress extends PlayerModifier {
  declare type: any;
  declare progressContribution: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'PlayerModifierMechazorBuildProgress';
  static isKeyworded = true;
  static isHiddenToUI = true;

  static createContextObject(progressContribution, options) {
    if (progressContribution == null) {
      progressContribution = 1;
    }
    const contextObject = super.createContextObject(options);
    contextObject.progressContribution = progressContribution;
    return contextObject;
  }

  onApplyToCardBeforeSyncState() {
    // apply a mechaz0r counter to the General when first mechaz0r progress is added
    // once a counter is there, don't need to keep adding - original counter will update on further modifier additions
    if (!this.getCard().hasActiveModifierClass(ModifierCounterMechazorBuildProgress)) {
      return this.getGameSession().applyModifierContextObject(
        ModifierCounterMechazorBuildProgress.createContextObject(
          'PlayerModifierMechazorBuildProgress',
          'PlayerModifierMechazorSummoned',
        ),
        this.getCard(),
      );
    }
  }

  static followupConditionIsMechazorComplete(cardWithFollowup, followupCard) {
    // can we build him?

    // get how far progress is
    let mechazorProgress = 0;
    for (var modifier of Array.from<any>(
      cardWithFollowup.getOwner().getPlayerModifiersByClass(PlayerModifierMechazorBuildProgress),
    )) {
      mechazorProgress += modifier.getProgressContribution();
    }

    // check how many times mechaz0r has already been built
    const numMechazorsSummoned = cardWithFollowup
      .getOwner()
      .getPlayerModifiersByClass(PlayerModifierMechazorSummoned).length;

    return mechazorProgress - numMechazorsSummoned * 5 >= 5;
  }

  getProgressContribution() {
    return this.progressContribution;
  }

  getStackType() {
    // progress contributions should stack only with same contributions
    return `${super.getStackType()}_progress${this.getProgressContribution()}`;
  }
}
PlayerModifierMechazorBuildProgress.prototype.type = 'PlayerModifierMechazorBuildProgress';
PlayerModifierMechazorBuildProgress.keywordDefinition = i18next.t('modifiers.mechaz0r_def');
PlayerModifierMechazorBuildProgress.modifierName = i18next.t('modifiers.mechaz0r_name');
PlayerModifierMechazorBuildProgress.prototype.progressContribution = 0;

module.exports = PlayerModifierMechazorBuildProgress;
