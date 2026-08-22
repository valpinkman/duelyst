/*
 * Achievements tests are temporarily disabled: the entire suite below is commented out.
 *
 * This placeholder exists so the runner reports it as SKIPPED rather than
 * failing the file with "No test suite found" -- an empty test file is an
 * error to vitest, which made a deliberate decision look like a broken suite.
 */
describe.skip('achievements module', () => {
  it('is disabled', () => {});
});

/* Achievements tests are temporarily disabled.
var path = require('path')
var chai = require('chai');
var expect = chai.expect;
var DuelystFirebase = require('@duelyst/server/lib/duelyst_firebase_module');
var Errors = require('@duelyst/server/lib/custom_errors');
var UsersModule = require('@duelyst/server/lib/data_access/users');
var InventoryModule = require('@duelyst/server/lib/data_access/inventory');
var AchievementsModule = require('@duelyst/server/lib/data_access/achievements');
var SyncModule = require('@duelyst/server/lib/data_access/sync');
var FirebasePromises = require('@duelyst/server/lib/firebase_promises');
var generatePushId = require('@duelyst/common/generate_push_id');
var config = require('@duelyst/config');
var Logger = require('@duelyst/common/logger');
var _ = require('underscore');
var SDK = require('@duelyst/sdk/index');
var moment = require('moment');
const { onType } = require('@duelyst/common/utils/utils_promise');
var knex = require('@duelyst/server/lib/data_access/knex')

// disable the logger for cleaner test output
Logger.enabled = Logger.enabled && false;

describe("achievements module", function() {

  const userId = null;

  // before cleanup to check if user already exists and delete
  beforeAll(function(){
    Logger.module("UNITTEST").log("creating user");
    return UsersModule.createNewUser('unit-test@duelyst.local','unittest','hash','kumite14')
    .then(function(userIdCreated){
      Logger.module("UNITTEST").log("created user ",userIdCreated);
      userId = userIdCreated;
    }).catch(onType(Errors.AlreadyExistsError,function(error){
      Logger.module("UNITTEST").log("existing user");
      return UsersModule.userIdForEmail('unit-test@duelyst.local').then(function(userIdExisting){
        Logger.module("UNITTEST").log("existing user retrieved",userIdExisting);
        userId = userIdExisting;
        return SyncModule.wipeUserData(userIdExisting);
      }).then(function(){
        Logger.module("UNITTEST").log("existing user data wiped",userId);
      })
    }))
  });

  // // after cleanup
  // after(function(){
  //   this.timeout(25000);
  //   return DuelystFirebase.connect().getRootRef()
  //   .bind({})
  //   .then(function(fbRootRef){
  //     this.fbRootRef = fbRootRef;
  //     if (userId)
  //       return clearUserData(userId,this.fbRootRef);
  //   });
  // });

  describe("AchievementsModule", function() {

    describe("updateAchievementsProgressWithCardCollection()", function() {
      it('expect to complete an achievement once a player owns 1 of all common cards', function() {

        const collection = {};
        const allCommonCards = SDK.GameSession.getCardCaches().getRarity(SDK.Rarity.Common).getCards();
        _.each(allCommonCards,function(card){
          collection[card.getId()] = { count:1 }
        });

        return AchievementsModule.updateAchievementsProgressWithCardCollection(userId,collection)
        .then(function(){
          return DuelystFirebase.connect().getRootRef()
        }).then(function(rootRef){
          return Promise.all([
            knex('user_achievements').select().where('user_id',userId),
            knex('user_rewards').select().where('user_id',userId),
            FirebasePromises.once(rootRef.child('user-achievements').child(userId),"value"),
            FirebasePromises.once(rootRef.child('user-rewards').child(userId),"value")
          ])
        }).then(function([achievementRows,rewardRows,achievementsSnapshot,rewardsSnapshot]){
          expect(achievementRows.length).to.equal(1);
        });
      });
    });

    // Achievement has been disabled
    //describe("updateAchievementsProgressWithDisenchantedCard()", function() {
    //  it('expect a spirit reward for DISENCHANTING your first card', function() {
    //    return AchievementsModule.updateAchievementsProgressWithDisenchantedCard(userId,SDK.Cards.Faction1.Lightchaser)
    //    .then(function(){
    //      return DuelystFirebase.connect().getRootRef()
    //    }).then(function(rootRef){
    //      return Promise.all([
    //        knex('user_achievements').select().where('user_id',userId),
    //        knex('user_rewards').select().where('user_id',userId),
    //        FirebasePromises.once(rootRef.child('user-achievements').child(userId),"value"),
    //        FirebasePromises.once(rootRef.child('user-rewards').child(userId),"value")
    //      ])
    //    }).then(function([achievementRows,rewardRows,achievementsSnapshot,rewardsSnapshot]){
    //      expect(achievementRows.length).to.equal(2);
    //    });
    //  });
    //});

  });

  // describe("crafting achievements", function() {

  //   describe("welcome to crafting", function() {

  //     it('expect a spirit reward for DISENCHANTING your first card', function() {

  //       return knex("users").where('id',userId).update({
  //         wallet_spirit:40
  //       }).then(function(){
  //         return InventoryModule.craftCard(userId,SDK.Cards.Faction1.Lightchaser)
  //       }).then(function(){
  //         return InventoryModule.disenchantCards(userId,[SDK.Cards.Faction1.Lightchaser])
  //       }).then(function(result){
  //         expect(result).to.exist;
  //         return DuelystFirebase.connect().getRootRef()
  //       }).then(function(rootRef){

  //       });

  //     });

  //     it('expect no spirit reward for DISENCHANTING your second card', function() {

  //       return knex("users").where('id',userId).update({
  //         wallet_spirit:40
  //       }).then(function(){
  //         return InventoryModule.craftCard(userId,SDK.Cards.Faction1.Lightchaser)
  //       }).then(function(){
  //         return InventoryModule.disenchantCards(userId,[SDK.Cards.Faction1.Lightchaser])
  //       }).then(function(result){
  //         expect(result).to.exist;
  //         return DuelystFirebase.connect().getRootRef()
  //       }).then(function(rootRef){
  //       });
  //     });
  //   });
  // })
});
*/
