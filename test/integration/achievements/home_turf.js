/* Test disabled: slow
var path = require('path')
require('app-module-path').addPath(path.join(__dirname, '../../../'))
var chai = require('chai');
var expect = chai.expect;
var DuelystFirebase = require('apps/server/lib/duelyst_firebase_module');
var Errors = require('apps/server/lib/custom_errors');
var UsersModule = require('apps/server/lib/data_access/users');
var InventoryModule = require('apps/server/lib/data_access/inventory');
var AchievementsModule = require('apps/server/lib/data_access/achievements');
var SyncModule = require('apps/server/lib/data_access/sync');
var FirebasePromises = require('apps/server/lib/firebase_promises');
var generatePushId = require('@duelyst/common/generate_push_id');
var config = require('../../../config/config');
var Logger = require('@duelyst/common/logger');
var _ = require('underscore');
var SDK = require('@duelyst/sdk/index');
var moment = require('moment');
const { onType } = require('@duelyst/common/utils/utils_promise');
const PromiseUtils = require('@duelyst/common/utils/utils_promise');
var knex = require('apps/server/lib/data_access/knex')

// disable the logger for cleaner test output
Logger.enabled = Logger.enabled && true;

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

  // describe("Home Turf Achievement", function() {
  //
  //   it('expect that winning 5 home games awards a random battle map', function() {
  //     this.timeout(100000);
  //     const gameData = {
  //       gameType: "ranked",
  //       players: [
  //         {
  //           playerId: userId,
  //           isWinner: true
  //         }
  //       ]
  //     }
  //     return Promise.all([
  //       AchievementsModule.updateAchievementsProgressWithGame(userId,generatePushId(),gameData,false,false),
  //       AchievementsModule.updateAchievementsProgressWithGame(userId,generatePushId(),gameData,false,false),
  //       AchievementsModule.updateAchievementsProgressWithGame(userId,generatePushId(),gameData,false,false),
  //       AchievementsModule.updateAchievementsProgressWithGame(userId,generatePushId(),gameData,false,false),
  //       AchievementsModule.updateAchievementsProgressWithGame(userId,generatePushId(),gameData,false,false)
  //     ]).then(function(){
  //       return PromiseUtils.delay(3000)
  //     }).then(function(){
  //       return Promise.all([
  //         knex('user_achievements').select().where('user_id',userId).andWhere('achievement_id','homeTurf'),
  //         knex('user_rewards').select().where('user_id',userId).andWhere('reward_type','homeTurf'),
  //         knex('user_cosmetic_inventory').select().where('user_id',userId)
  //       ])
  //     }).then(function([achievementRows,rewardRows,cosmeticsRows]){
  //       expect(achievementRows.length).to.equal(1)
  //       expect(rewardRows.length).to.equal(1)
  //       expect(rewardRows[0].cosmetics.length).to.equal(1)
  //       expect(cosmeticsRows.length).to.equal(1)
  //       const cosmetic = SDK.CosmeticsFactory.cosmeticForIdentifier(cosmeticsRows[0].cosmetic_id)
  //       expect(cosmetic.typeId).to.equal(SDK.CosmeticsTypeLookup.BattleMap)
  //     })
  //   })
  //
  // })
})
*/
