/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
class Achievement {
  static id = null;
  static title = null;
  static description = null;
  static progressRequired = null;
  static enabled = true;

  constructor() {}
  // No need initialize this object

  // returns the amount of progress made by completing a given quest ID
  static progressForCompletingQuestId(questId) {}
  // Extend in subclass

  // returns how much progress is made for completing the passed in game data
  static progressForGameDataForPlayerId(gameData, playerId, isUnscored, isDraw) {}
  // Extend in subclass

  // returns how much progress is made by crafting the passed in cardId
  static progressForCrafting(cardId) {}
  // extend in subclass

  // returns how much progress is made by disenchanting the passed in cardId
  static progressForDisenchanting(cardId) {}
  // extend in subclass

  // returns how much progress is made by owning the passed in card collection
  static progressForCardCollection(cardCollection, allCards) {}
  // extend in subclass

  // returns progress made by achieving the passed in rank
  static progressForAchievingRank(rank) {}
  // extend in subclass

  // returns progress made by performing armory transaction
  static progressForArmoryTransaction(armoryTransactionSku) {}
  // extend in subclass

  // returns progress made by a referral program event
  static progressForReferralEvent(referralEventType) {}
  // extend in subclass

  // returns progress made by reaching a state of faction progression
  static progressForFactionProgression(factionProgressionData) {}
  // extend in subclass

  // returns progress made by receiving a loot crate
  static progressForReceivingCosmeticChest(cosmeticChestType) {}
  // extend in subclass

  // returns progress made by logging in at a time
  static progressForLoggingIn(currentLoginMoment) {}
  // extend in subclass

  // returns when a login achievement begins as a moment
  static getLoginAchievementStartsMoment() {
    // extend in subclass
    return null;
  }

  // returns a user facing string for how to unlock rewards
  static rewardUnlockMessage(progressMade) {
    // extend in subclass
    return '';
  }

  // returns progress made by opening spirit orb
  static progressForOpeningSpiritOrb(orbSet) {}
  // extend in subclass

  static getId() {
    return this.id;
  }

  static getTitle() {
    return this.title;
  }

  static getDescription() {
    return this.description;
  }

  static getRewards() {
    return this.rewards;
  }
}
Achievement.rewards = undefined;

module.exports = Achievement;
