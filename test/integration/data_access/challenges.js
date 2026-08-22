const chai = require('chai');

const { expect } = chai;
const _ = require('underscore');
const moment = require('moment');
const DuelystFirebase = require('@duelyst/server/lib/duelyst_firebase_module');
const Errors = require('@duelyst/server/lib/custom_errors');
const UsersModule = require('@duelyst/server/lib/data_access/users');
const ChallengesModule = require('@duelyst/server/lib/data_access/challenges');
const GamesModule = require('@duelyst/server/lib/data_access/games');
const QuestsModule = require('@duelyst/server/lib/data_access/quests');
const SyncModule = require('@duelyst/server/lib/data_access/sync');
const InventoryModule = require('@duelyst/server/lib/data_access/inventory');
const FirebasePromises = require('@duelyst/server/lib/firebase_promises');
const generatePushId = require('@duelyst/common/generate_push_id');
const config = require('@duelyst/config');
const Logger = require('@duelyst/common/logger');
const SDK = require('@duelyst/sdk/index');
const knex = require('@duelyst/server/lib/data_access/knex');
const NewPlayerProgressionStageEnum = require('@duelyst/sdk/progression/newPlayerProgressionStageEnum');
const { onType } = require('@duelyst/common/utils/utils_promise');

// disable the logger for cleaner test output
Logger.enabled = Logger.enabled && true;

describe('challenges module', () => {
  let userId = null;

  // before cleanup to check if user already exists and delete
  beforeAll(() => {
    Logger.module('UNITTEST').log('creating user');
    return UsersModule.createNewUser('unittest', 'hash', 'kumite14')
      .then((userIdCreated) => {
        Logger.module('UNITTEST').log('created user ', userIdCreated);
        userId = userIdCreated;
      })
      .catch(
        onType(Errors.AlreadyExistsError, (error) => {
          Logger.module('UNITTEST').log('existing user');
          return UsersModule.userIdForUsername('unittest')
            .then((userIdExisting) => {
              Logger.module('UNITTEST').log('existing user retrieved', userIdExisting);
              userId = userIdExisting;
              return SyncModule.wipeUserData(userIdExisting);
            })
            .then(() => {
              Logger.module('UNITTEST').log('existing user data wiped', userId);
            });
        }),
      )
      .catch((error) => {
        Logger.module('UNITTEST').log('unexpected error: ', error);
        throw error;
      });
  });

  describe('markChallengeAsAttempted()', () => {
    let challengeType = null;
    const attemptedAt = null;

    beforeAll(() => {
      // Create a test challenge
      challengeType = 'UnitTestChallenge';

      // clear any existing data
      return DuelystFirebase.connect()
        .getRootRef()
        .then((rootRef) => SyncModule.wipeUserData(userId));
    });

    it('expect marking challenge as attempted to work', () =>
      ChallengesModule.markChallengeAsAttempted(userId, challengeType)
        .then(() => DuelystFirebase.connect().getRootRef())
        .then((rootRef) =>
          Promise.all([
            knex('user_challenges')
              .where({
                user_id: userId,
                challenge_id: challengeType,
              })
              .first(),
            FirebasePromises.once(
              rootRef.child('user-challenge-progression').child(userId).child(challengeType),
              'value',
            ),
          ]),
        )
        .then(([challengeRow, challengeDataSnapshot]) => {
          // Check that the challenge was marked as attempted
          expect(challengeRow.last_attempted_at).to.exist;
          expect(challengeDataSnapshot.val()).to.exist;
          expect(challengeDataSnapshot.val().last_attempted_at).to.exist;
        }));
  });

  describe('completeChallengeWithType()', () => {
    let challengeType = null;
    let completedAt = null;

    beforeAll(() => {
      // Create a test challenge
      challengeType = 'UnitTestChallenge';

      SDK.ChallengeFactory._buildChallengeRewards();
      SDK.ChallengeFactory._challengeCardRewards[challengeType] = [
        SDK.Cards.Spell.TrueStrike,
        SDK.Cards.Neutral.PlanarScout,
      ];
      SDK.ChallengeFactory._challengeGoldRewards[challengeType] = 127;
      SDK.ChallengeFactory._challengeSpiritRewards[challengeType] = 229;
      SDK.ChallengeFactory._challengeBoosterPackRewards[challengeType] = [{}, {}];

      // clear any existing data
      return DuelystFirebase.connect()
        .getRootRef()
        .then((rootRef) => SyncModule.wipeUserData(userId));
    });

    it('expect to receive rewards for first time completion of challenge and challenge to be marked as completed', () =>
      ChallengesModule.completeChallengeWithType(userId, challengeType)
        .then(() => DuelystFirebase.connect().getRootRef())
        .then((rootRef) =>
          Promise.all([
            knex('users').where('id', userId).first(),
            knex('user_card_collection').where('user_id', userId).first(),
            FirebasePromises.once(rootRef.child('user-inventory').child(userId), 'value'),
            FirebasePromises.once(
              rootRef.child('user-challenge-progression').child(userId).child(challengeType),
              'value',
            ),
          ]),
        )
        .then(([userRow, userCardCollectionRow, inventoryDataSnapshot, challengeDataSnapshot]) => {
          expect(userRow.wallet_gold).to.equal(
            SDK.ChallengeFactory.getGoldRewardedForChallengeType(challengeType),
          );
          expect(userRow.wallet_spirit).to.equal(
            SDK.ChallengeFactory.getSpiritRewardedForChallengeType(challengeType),
          );

          const challengeData = challengeDataSnapshot.val();
          const inventoryData = inventoryDataSnapshot.val();

          // Check that the challenge was marked as complete
          expect(challengeData).to.exist;
          expect(challengeData.completed_at).to.exist;
          expect(inventoryData).to.exist;
          expect(inventoryData.wallet).to.exist;

          completedAt = challengeData.completed_at;

          // Check gold amount
          expect(inventoryData.wallet.gold_amount).to.equal(
            SDK.ChallengeFactory.getGoldRewardedForChallengeType(challengeType),
          );
          // Check spirit amount
          expect(inventoryData.wallet.spirit_amount).to.equal(
            SDK.ChallengeFactory.getSpiritRewardedForChallengeType(challengeType),
          );

          expect(inventoryData['spirit-orbs']).to.exist;
          // Check number of booster packs
          expect(Object.keys(inventoryData['spirit-orbs']).length).to.equal(
            SDK.ChallengeFactory.getBoosterPacksRewardedForChallengeType(challengeType).length,
          );

          // Check cards were given in correct quantity
          expect(inventoryData['card-collection']).to.exist;
          const cardIdsRewards =
            SDK.ChallengeFactory.getCardIdsRewardedForChallengeType(challengeType);
          _.each(cardIdsRewards, (cardId) => {
            expect(inventoryData['card-collection'][cardId]).to.exist;
            expect(inventoryData['card-collection'][cardId].count).to.equal(1);
          });
        }));

    it('expect to not receive rewards for second completion of challenge', () =>
      ChallengesModule.completeChallengeWithType(userId, challengeType)
        .then(() => DuelystFirebase.connect().getRootRef())
        .then((rootRef) =>
          Promise.all([
            knex('users').where('id', userId).first(),
            knex('user_card_collection').where('user_id', userId).first(),
            FirebasePromises.once(rootRef.child('user-inventory').child(userId), 'value'),
            FirebasePromises.once(
              rootRef.child('user-challenge-progression').child(userId).child(challengeType),
              'value',
            ),
          ]),
        )
        .then(([userRow, userCardCollectionRow, inventoryDataSnapshot, challengeDataSnapshot]) => {
          expect(userRow.wallet_gold).to.equal(
            SDK.ChallengeFactory.getGoldRewardedForChallengeType(challengeType),
          );
          expect(userRow.wallet_spirit).to.equal(
            SDK.ChallengeFactory.getSpiritRewardedForChallengeType(challengeType),
          );

          const challengeData = challengeDataSnapshot.val();
          const inventoryData = inventoryDataSnapshot.val();

          // Check that the challenge was marked as complete
          expect(challengeData).to.exist;
          expect(challengeData.completed_at).to.exist;
          expect(challengeData.completed_at).to.equal(completedAt);
          expect(inventoryData).to.exist;
          expect(inventoryData.wallet).to.exist;

          // Check gold amount
          expect(inventoryData.wallet.gold_amount).to.equal(
            SDK.ChallengeFactory.getGoldRewardedForChallengeType(challengeType),
          );
          // Check spirit amount
          expect(inventoryData.wallet.spirit_amount).to.equal(
            SDK.ChallengeFactory.getSpiritRewardedForChallengeType(challengeType),
          );

          expect(inventoryData['spirit-orbs']).to.exist;
          // Check number of booster packs
          expect(Object.keys(inventoryData['spirit-orbs']).length).to.equal(
            SDK.ChallengeFactory.getBoosterPacksRewardedForChallengeType(challengeType).length,
          );

          // Check cards were given in correct quantity
          expect(inventoryData['card-collection']).to.exist;
          const cardIdsRewards =
            SDK.ChallengeFactory.getCardIdsRewardedForChallengeType(challengeType);
          _.each(cardIdsRewards, (cardId) => {
            expect(inventoryData['card-collection'][cardId]).to.exist;
            expect(inventoryData['card-collection'][cardId].count).to.equal(1);
          });
        }));

    describe('beginner challenge quests', () => {
      beforeAll(() =>
        SyncModule.wipeUserData(userId)
          .then(() =>
            UsersModule.setNewPlayerFeatureProgression(
              userId,
              SDK.NewPlayerProgressionModuleLookup.Core,
              SDK.NewPlayerProgressionStageEnum.FirstGameDone.key,
            ),
          )
          .then(() => QuestsModule.generateBeginnerQuests(userId)),
      );

      it('expect beginner challenge quests to progress with challenge completion', () => {
        const questChallenge1Type = 'UnitTestQuestChallenge1';
        return ChallengesModule.completeChallengeWithType(userId, questChallenge1Type, true)
          .then(() => DuelystFirebase.connect().getRootRef())
          .then((rootRef) =>
            Promise.all([
              knex('users').where('id', userId).first(),
              knex('user_challenges')
                .where('user_id', userId)
                .andWhere('challenge_id', questChallenge1Type)
                .first(),
              knex('user_quests').where('user_id', userId),
              FirebasePromises.once(
                rootRef
                  .child('user-challenge-progression')
                  .child(userId)
                  .child(questChallenge1Type),
                'value',
              ),
            ]),
          )
          .then(([userRow, challengeRow, questRows, challengeDataSnapshot]) => {
            expect(challengeRow.completed_at).to.exist;

            const challengeQuestRow = _.find(
              questRows,
              (questRow) => questRow.quest_type_id === 9904,
            );
            expect(challengeQuestRow).to.exist;
            expect(challengeQuestRow.progress).to.equal(1);
          });
      });

      it('expect that completing a challenge quest to give quest rewards as part of challenge completion', () => {
        const questChallenge1Type = 'UnitTestQuestChallenge1';
        const questChallenge2Type = 'UnitTestQuestChallenge2';
        const questChallenge3Type = 'UnitTestQuestChallenge3';

        return ChallengesModule.completeChallengeWithType(userId, questChallenge1Type, true)
          .then(() => ChallengesModule.completeChallengeWithType(userId, questChallenge2Type, true))
          .then(() => ChallengesModule.completeChallengeWithType(userId, questChallenge3Type, true))
          .then(() => DuelystFirebase.connect().getRootRef())
          .then((rootRef) =>
            Promise.all([
              knex('users').where('id', userId).first(),
              knex('user_challenges').where('user_id', userId).select(),
              knex('user_quests_complete').where('user_id', userId).select(),
            ]),
          )
          .then(([userRow, challengeRows, completeQuestRows]) => {
            expect(challengeRows.length).to.equal(3);
            expect(challengeRows[2].reward_ids.length).to.equal(1);
            expect(completeQuestRows.length).to.equal(1);
            expect(completeQuestRows[0].progress).to.equal(3);
            expect(completeQuestRows[0].completed_at).to.exist;
          });
      });
    });
  });

  describe('markDailyChallengeAsCompleted()', () => {
    const challengeId = 'unit-test-daily-challenge';
    const challengeDate = moment.utc('2016-05-01');

    beforeAll(() =>
      // clear any existing data
      DuelystFirebase.connect()
        .getRootRef()
        .then((rootRef) =>
          FirebasePromises.set(
            rootRef.child('daily-challenges').child(challengeDate.format('YYYY-MM-DD')),
            {
              challenge_id: challengeId,
              gold: 5,
            },
          ),
        )
        .then((rootRef) => SyncModule.wipeUserData(userId)),
    );

    it('expect marking invalid challenge ID as completed to ERROR out', () =>
      ChallengesModule.markDailyChallengeAsCompleted(
        userId,
        'invalid-challenge',
        null,
        challengeDate,
        challengeDate,
      )
        .then((result) => {
          expect(result).to.not.exist;
        })
        .catch((error) => {
          expect(error).to.exist;
          expect(error).to.be.an.instanceof(Errors.BadRequestError);
        }));

    it("expect marking challenge that can't be found to ERROR out", () =>
      ChallengesModule.markDailyChallengeAsCompleted(
        userId,
        challengeId,
        null,
        moment.utc('2016-05-03'),
        challengeDate,
      )
        .then((result) => {
          expect(result).to.not.exist;
        })
        .catch((error) => {
          expect(error).to.exist;
          expect(error).to.be.an.instanceof(Errors.NotFoundError);
        }));

    it('expect marking challenge valid as completed to SUCCEED and give REWARDS', () =>
      ChallengesModule.markDailyChallengeAsCompleted(
        userId,
        challengeId,
        null,
        challengeDate,
        challengeDate,
      )
        .then((result) => {
          expect(result).to.exist;
          return DuelystFirebase.connect().getRootRef();
        })
        .then((rootRef) =>
          Promise.all([
            knex('users').where('id', userId).first(),
            knex('user_daily_challenges_completed')
              .where('user_id', userId)
              .andWhere('challenge_id', challengeId)
              .first(),
            knex('user_rewards').where('user_id', userId).orderBy('created_at', 'desc').first(),
          ]),
        )
        .then(([userRow, challengeRow, rewardRow]) => {
          expect(userRow.daily_challenge_last_completed_at.valueOf()).to.equal(
            challengeDate.valueOf(),
          );
          expect(challengeRow).to.exist;
          expect(rewardRow.reward_type).to.equal(challengeId);
          expect(challengeRow.reward_ids).to.contain(rewardRow.id);
          expect(rewardRow.gold).to.equal(5);
          expect(userRow.wallet_gold).to.equal(5);
        }));

    it('expect marking same challenge as completed twice to ERROR out', () =>
      ChallengesModule.markDailyChallengeAsCompleted(
        userId,
        challengeId,
        null,
        challengeDate,
        challengeDate,
      )
        .then((result) => {
          expect(result).to.not.exist;
        })
        .catch((error) => {
          expect(error).to.exist;
          expect(error).to.be.an.instanceof(Errors.AlreadyExistsError);
        }));
  });
});
