/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
Job - Update User Ranking
*/
const config = require('../../config/config.js');
const AchievementsModule = require('../../server/lib/data_access/achievements');
const DuelystFirebase = require('../../server/lib/duelyst_firebase_module');
const Logger = require('../../app/common/logger');
const { GameManager } = require('../../server/redis');
const FirebasePromises = require('../../server/lib/firebase_promises');
const Promise = require('bluebird');

/**
 * Job - 'update-user-achievements'
 * @param  {Object} job    Kue job
 * @param  {Function} done   Callback when job is complete
 */
module.exports = function (job, done) {
  const _chainState = {};
  const userId = job.data.userId || null;

  if (!userId) {
    return done(new Error('update-user-achievements: User ID is not defined.'));
  }

  Logger.module('JOB').debug(`[J:${job.id}] Update User (${userId}) Achievements starting`);
  Logger.module('JOB').time(`[J:${job.id}] Update User (${userId}) Achievements`);

  // determine achievement type by job data

  // # Game Achievement
  const gameId = job.data.gameId || null;
  if (gameId != null) {
    const {
      isUnscored,
    } = job.data;
    const {
      isDraw,
    } = job.data;
    return GameManager.loadGameSession(gameId)
      .then(JSON.parse)
      .then(function (gameSessionData) {
        if (!gameSessionData) {
          throw new Error('Game data is null. Game may have already been archived.');
        } else {
          return AchievementsModule.updateAchievementsProgressWithGame(userId, gameId, gameSessionData, isUnscored, isDraw);
        }
      }).then(function () {
        Logger.module('JOB').timeEnd(`[J:${job.id}] Update User (${userId}) Achievements`);
        return done();
      })
      .catch((error) => done(error));
  }

  // # Crafting Achievement
  const craftedCardId = job.data.craftedCardId || null;
  if (craftedCardId != null) {
    return AchievementsModule.updateAchievementsProgressWithCraftedCard(userId, craftedCardId)
      .then(function () {
        Logger.module('JOB').timeEnd(`[J:${job.id}] Update User (${userId}) Achievements`);
        return done();
      }).catch((error) => done(error));
  }

  // # Disenchanting Achievement
  const disenchantedCardIdList = job.data.disenchantedCardIdList || null;
  if (disenchantedCardIdList != null) {
    const disenchantProgressPromises = [];
    for (var disenchantedCardId of Array.from<any>(disenchantedCardIdList)) {
      disenchantProgressPromises.push(AchievementsModule.updateAchievementsProgressWithDisenchantedCard(userId, disenchantedCardId));
    }
    return Promise.all(disenchantProgressPromises)
      .then(function () {
        Logger.module('JOB').timeEnd(`[J:${job.id}] Update User (${userId}) Achievements`);
        return done();
      }).catch((error) => done(error));
  }

  // # Armory Achievement
  const armoryPurchaseSku = job.data.armoryPurchaseSku || null;
  if (armoryPurchaseSku != null) {
    return AchievementsModule.updateAchievementsProgressWithArmoryPurchase(userId, armoryPurchaseSku)
      .then(function () {
        Logger.module('JOB').timeEnd(`[J:${job.id}] Update User (${userId}) Achievements`);
        return done();
      }).catch((error) => done(error));
  }

  // # Referral Achievement
  const referralEventType = job.data.referralEventType || null;
  if (referralEventType != null) {
    return AchievementsModule.updateAchievementsProgressWithReferralEvent(userId, referralEventType)
      .then(function () {
        Logger.module('JOB').timeEnd(`[J:${job.id}] Update User (${userId}) Achievements`);
        return done();
      }).catch((error) => done(error));
  }

  // # Faction Achievement
  const factionProgressed = job.data.factionProgressed || null;
  if (factionProgressed) {
    return DuelystFirebase.connect().getRootRef()
      .then(function (fbRootRef) {
        _chainState.fbRootRef = fbRootRef;
        const factionProgressionRootRef = _chainState.fbRootRef.child('user-faction-progression').child(userId);
        return FirebasePromises.once(factionProgressionRootRef, 'value');
      })
      .then(function (factionProgressionSnapshot) {
        const factionProgressionData = factionProgressionSnapshot.val();
        return AchievementsModule.updateAchievementsProgressWithFactionProgression(userId, factionProgressionData);
      })
      .then(function () {
        Logger.module('JOB').timeEnd(`[J:${job.id}] Update User (${userId}) Achievements`);
        return done();
      })
      .catch((error) => done(error));
  }

  // # Inventory Achievement
  const inventoryChanged = job.data.inventoryChanged || null;
  if (inventoryChanged) {
    return DuelystFirebase.connect().getRootRef()
      .then(function (fbRootRef) {
        _chainState.fbRootRef = fbRootRef;
        const cardCollectionRootRef = _chainState.fbRootRef.child('user-inventory').child(userId).child('card-collection');
        return FirebasePromises.once(cardCollectionRootRef, 'value');
      })
      .then(function (cardCollectionSnapshot) {
        const cardCollectionData = cardCollectionSnapshot.val();
        return AchievementsModule.updateAchievementsProgressWithCardCollection(userId, cardCollectionData);
      })
      .then(function () {
        Logger.module('JOB').timeEnd(`[J:${job.id}] Update User (${userId}) Achievements`);
        return done();
      })
      .catch((error) => done(error));
  }

  // # Loot Crate Achievement
  const receivedCosmeticChestType = job.data.receivedCosmeticChestType || null;
  if (receivedCosmeticChestType != null) {
    return AchievementsModule.updateAchievementsProgressWithReceivedCosmeticChest(userId, receivedCosmeticChestType)
      .then(function () {
        Logger.module('JOB').timeEnd(`[J:${job.id}] Update User (${userId}) Achievements`);
        return done();
      }).catch((error) => done(error));
  }

  // # Quest Achievement
  const completedQuestId = job.data.completedQuestId || null;
  if (completedQuestId != null) {
    return AchievementsModule.updateAchievementsProgressWithCompletedQuest(userId, completedQuestId)
      .then(function () {
        Logger.module('JOB').timeEnd(`[J:${job.id}] Update User (${userId}) Achievements`);
        return done();
      }).catch((error) => done(error));
  }

  // # Rank Achievement
  let achievedRank = job.data.achievedRank || null;
  if (job.data.achievedRank === 0) {
    achievedRank = 0;
  }
  if (achievedRank != null) {
    return AchievementsModule.updateAchievementsProgressWithEarnedRank(userId, achievedRank)
      .then(function () {
        Logger.module('JOB').timeEnd(`[J:${job.id}] Update User (${userId}) Achievements`);
        return done();
      }).catch((error) => done(error));
  }

  // # Login Achievement
  const lastLoginAt = job.data.lastLoginAt || null;
  const currentLoginAt = job.data.currentLoginAt || null;
  const lastLoginVersion = job.data.lastLoginVersion || null;
  const currentLoginVersion = job.data.currentLoginVersion || null;
  if (currentLoginAt != null) {
    let lastLoginMoment = null;
    let currentLoginMoment = null;
    if (lastLoginAt != null) {
      lastLoginMoment = moment.utc(lastLoginAt);
    }
    if (currentLoginAt != null) {
      currentLoginMoment = moment.utc(currentLoginAt);
    }
    return AchievementsModule.updateAchievementsProgressWithLogin(userId, lastLoginMoment, currentLoginMoment, lastLoginVersion, currentLoginVersion)
      .then(function () {
        Logger.module('JOB').timeEnd(`[J:${job.id}] Update User (${userId}) Achievements`);
        return done();
      }).catch((error) => done(error));
  }

  // # Opened Spirit Orb Achievement
  const spiritOrbOpenedFromSet = job.data.spiritOrbOpenedFromSet || null;
  if (spiritOrbOpenedFromSet != null) {
    return AchievementsModule.updateAchievementsProgressWithSpiritOrbOpening(userId, spiritOrbOpenedFromSet)
      .then(function () {
        Logger.module('JOB').timeEnd(`[J:${job.id}] Update User (${userId}) Achievements`);
        return done();
      }).catch((error) => done(error));
  }

  // # All done with quests, shouldn't reach here
  return done(new Error('Missing data in achievement job'));
};
