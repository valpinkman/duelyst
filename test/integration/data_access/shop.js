/*
 * Shop unit tests are currently disabled: the entire suite below is commented out.
 *
 * This placeholder exists so the runner reports it as SKIPPED rather than
 * failing the file with "No test suite found" -- an empty test file is an
 * error to vitest, which made a deliberate decision look like a broken suite.
 */
describe.skip('shop module', () => {
  it('is disabled', () => {});
});

/* Shop unit tests are currently disabled.

var path = require('path')
var chai = require('chai');
chai.config.includeStack = true;
var expect = chai.expect;
var DuelystFirebase = require('@duelyst/server/lib/duelyst_firebase_module');
var Errors = require('@duelyst/server/lib/custom_errors');
var UsersModule = require('@duelyst/server/lib/data_access/users');
var SyncModule = require('@duelyst/server/lib/data_access/sync');
var InventoryModule = require('@duelyst/server/lib/data_access/inventory');
var ShopModule = require('@duelyst/server/lib/data_access/shop');
var FirebasePromises = require('@duelyst/server/lib/firebase_promises');
var generatePushId = require('@duelyst/common/generate_push_id');
var config = require('@duelyst/config');
var Logger = require('@duelyst/common/logger');
var _ = require('underscore');
var SDK = require('@duelyst/sdk/index');
var moment = require('moment');
var knex = require('@duelyst/server/lib/data_access/knex');
var ShopData = require('@duelyst/data/shop.json')

// disable the logger for cleaner test output
Logger.enabled = Logger.enabled && false;

describe("shop module", function() {
  const userId = null;

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

  describe("ShopModule - tokens and charges", function() {
    describe("productDataForSKU()", function() {
      it('expect to pull up correct data for an SKU', function() {
        const data = ShopModule.productDataForSKU("BOOSTER3")
        expect(data).to.exist
        expect(data.name).to.equal("2 Spirit Orbs")
      })
    })

    describe("chargeUserCardToken()", function() {
      it('expect not to be able to charge an invalid token', function() {
        return ShopModule.chargeUserCardToken(userId,"sku","fake-token-id",100,"bad charge attempt")
        .then(function(chargeData){
          expect(chargeData).to.not.exist;
        }).catch(function(error){
          expect(error).to.exist;
          expect(error).to.be.an.instanceof(Error);
        });
      });
    })

    describe("updateUserCreditCardToken()", function() {
      it('expect not to be able to update user data with an invalid token', function() {
        return ShopModule.updateUserCreditCardToken(userId,"bad-token",'0000')
        .then(function(response){
          expect(response).to.not.exist;
        }).catch(function(error){
          expect(error).to.exist;
          expect(error).to.be.an.instanceof(Error);
        });
      });
    });
  })
});
*/
