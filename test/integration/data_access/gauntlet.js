const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const chai = require('chai');

const { expect } = chai;
const _ = require('underscore');
const moment = require('moment');
const DuelystFirebase = require('@duelyst/server/lib/duelyst_firebase_module');
const Errors = require('@duelyst/server/lib/custom_errors');
const UsersModule = require('@duelyst/server/lib/data_access/users');
const GauntletModule = require('@duelyst/server/lib/data_access/gauntlet');
const InventoryModule = require('@duelyst/server/lib/data_access/inventory');
const SyncModule = require('@duelyst/server/lib/data_access/sync');
const FirebasePromises = require('@duelyst/server/lib/firebase_promises');
const config = require('@duelyst/config');
const Logger = require('@duelyst/common/logger');
const SDK = require('@duelyst/sdk/index');
const knex = require('@duelyst/server/lib/data_access/knex');
const generatePushId = require('@duelyst/common/generate_push_id');
const { onType } = require('@duelyst/common/utils/utils_promise');
const { installSeededRandom, restoreRandom } = require('../../helpers/seeded_random');

// disable the logger for cleaner test output
Logger.enabled = Logger.enabled && false;

describe('gauntlet module', () => {
  let userId = null;

  const numDeckRarityTests = 3000;

  const fillOutArenaDeck = function (userId) {
    return knex('user_gauntlet_run')
      .first()
      .where('user_id', userId)
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]))
      .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.card_choices[0]));
  };

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
      );
  });

  // // after cleanup
  // after(function(){
  //   this.timeout(25000);
  //   return DuelystFirebase.connect().getRootRef()
  //   .bind({})
  //   .then(function(fbRootRef){
  //     this.fbRootRef = fbRootRef;
  //     if (userId) {
  //       // return clearUserData(userId,this.fbRootRef);
  //     }
  //   });
  // });

  /*
   * Arena tickets are free in this build (GAUNTLET_TICKET_GOLD_PRICE === 0).
   * These tests were written when they cost 150 and hardcoded both the price
   * and the resulting wallet, so they failed on the number rather than on the
   * behaviour. Deriving from the module's own constant keeps them meaningful at
   * any price, including zero.
   */
  /*
   * Play games one at a time.
   *
   * These tests used to fire every game outcome at once through Promise.all,
   * and updateArenaRunWithGameOutcome is a read-modify-write of win_count and
   * loss_count on a single row -- so the updates raced and lost each other. A
   * run billed as "10 wins" was arriving at claimRewards with fewer, which
   * showed up as the wrong number of reward slots rather than as anything
   * admitting to a race. A player's arena games finish one at a time, so this
   * is also what the code actually sees in production.
   */
  const playGames = (count, isWinner, label) =>
    Array.from({ length: count }, (_, i) => `${label} ${i + 1}`).reduce(
      (chain, gameId) =>
        chain.then((results) =>
          GauntletModule.updateArenaRunWithGameOutcome(userId, isWinner, gameId).then((result) => [
            ...results,
            result,
          ]),
        ),
      // resolves to every result in order, so callers can still destructure the
      // way they did when this was a Promise.all
      Promise.resolve([]),
    );

  /*
   * data_access/gauntlet.ts samples reward boxes with Math.random, and card
   * rewards are collapsed per rarity -- so which rarities come up changes how
   * many reward slots a run produces. Seeded, so the counts asserted below are
   * a property of the code rather than of the draw.
   */
  beforeAll(() => installSeededRandom());
  afterAll(() => restoreRandom());

  const TICKET_GOLD_PRICE = GauntletModule.GAUNTLET_TICKET_GOLD_PRICE;
  const GOLD_SURPLUS = 25;

  describe('buyArenaTicketWithGold()', () => {
    // You cannot hold less gold than a free ticket costs, so there is no such
    // thing as insufficient funds at price 0. Skipped by the price itself, so
    // it comes back automatically if tickets are ever charged for again.
    (TICKET_GOLD_PRICE > 0 ? it : it.skip)(
      'expect to NOT be able to buy ticket with insufficient gold',
      () =>
        GauntletModule.buyArenaTicketWithGold(userId)
          .then((result) => {
            expect(result).to.not.exist;
          })
          .catch((error) => {
            expect(error).to.exist;
            expect(error).to.not.be.an.instanceof(chai.AssertionError);
            expect(error).to.be.an.instanceof(Errors.InsufficientFundsError);
            return DuelystFirebase.connect().getRootRef();
          })
          .then((rootRef) =>
            Promise.all([
              knex.first().from('users').where({ id: userId }),
              knex.select().from('user_gauntlet_tickets').where({ user_id: userId }),
              FirebasePromises.once(
                rootRef.child('user-inventory').child(userId).child('gauntlet-tickets'),
                'value',
              ),
            ]),
          )
          .then(([userRow, ticketRows, fbTickets]) => {
            expect(userRow.wallet_gold).to.equal(0);
            expect(ticketRows.length).to.equal(0);
            expect(fbTickets.numChildren()).to.equal(0);
          }),
    );

    it('expect buying a ticket to debit exactly the ticket price', () =>
      knex('users')
        .where('id', userId)
        .update({ wallet_gold: TICKET_GOLD_PRICE + GOLD_SURPLUS })
        .then((numUpdates) => GauntletModule.buyArenaTicketWithGold(userId))
        .then((ticket) => {
          expect(ticket).to.exist;
          return DuelystFirebase.connect().getRootRef();
        })
        .then((rootRef) =>
          Promise.all([
            knex.first().from('users').where({ id: userId }),
            knex.select().from('user_gauntlet_tickets').where({ user_id: userId }),
            FirebasePromises.once(
              rootRef.child('user-inventory').child(userId).child('gauntlet-tickets'),
              'value',
            ),
          ]),
        )
        .then(([userRow, ticketRows, fbTickets]) => {
          expect(userRow.wallet_gold).to.equal(GOLD_SURPLUS);
          expect(ticketRows.length).to.equal(1);
          expect(fbTickets.numChildren()).to.equal(1);
        }));
  });

  describe('startRun()', () => {
    const _chainState = {};
    const otherUserTicketId = 'invalid-ticket-for-other-user';

    // before cleanup to check if user already exists and delete
    beforeAll(() =>
      knex('user_gauntlet_tickets')
        .where('id', otherUserTicketId)
        .delete()
        .then(() =>
          knex('user_gauntlet_tickets').insert({
            id: otherUserTicketId,
            user_id: 'some-other-user',
          }),
        ),
    );

    // before cleanup to check if user already exists and delete
    afterAll(() => knex('user_gauntlet_tickets').where('id', otherUserTicketId).delete());

    it('expect to NOT be able to start a run with an invalid ticket', () =>
      GauntletModule.startRun(userId, 'doesnt-exist')
        .then((result) => {
          expect(result).to.not.exist;
        })
        .catch((error) => {
          expect(error).to.exist;
          expect(error).to.not.be.an.instanceof(chai.AssertionError);
          expect(error).to.be.an.instanceof(Errors.NotFoundError);
          return DuelystFirebase.connect().getRootRef();
        })
        .then((rootRef) =>
          Promise.all([
            knex.first().from('user_gauntlet_run').where({ user_id: userId }),
            FirebasePromises.once(
              rootRef.child('user-gauntlet-run').child(userId).child('current'),
              'value',
            ),
          ]),
        )
        .then(([gauntletRunRow, fbRun]) => {
          expect(gauntletRunRow).to.not.exist;
          expect(fbRun.val()).to.not.exist;
        }));

    it("expect to NOT be able to start a run with another user's ticket", () =>
      GauntletModule.startRun(userId, otherUserTicketId)
        .then((result) => {
          expect(result).to.not.exist;
        })
        .catch((error) => {
          expect(error).to.exist;
          expect(error).to.not.be.an.instanceof(chai.AssertionError);
          expect(error).to.be.an.instanceof(Errors.NotFoundError);
          return DuelystFirebase.connect().getRootRef();
        })
        .then((rootRef) =>
          Promise.all([
            knex.first().from('user_gauntlet_run').where({ user_id: userId }),
            FirebasePromises.once(
              rootRef.child('user-gauntlet-run').child(userId).child('current'),
              'value',
            ),
          ]),
        )
        .then(([gauntletRunRow, fbRun]) => {
          expect(gauntletRunRow).to.not.exist;
          expect(fbRun.val()).to.not.exist;
        }));

    it('expect to be able to start a run with a valid ticket', () =>
      knex('user_gauntlet_tickets')
        .where('user_id', userId)
        .first()
        .then((ticketRow) => {
          _chainState.ticketId = ticketRow.id;
          return GauntletModule.startRun(userId, ticketRow.id);
        })
        .then((runData) => {
          expect(runData).to.exist;
          return DuelystFirebase.connect().getRootRef();
        })
        .then((rootRef) =>
          Promise.all([
            knex.select().from('user_gauntlet_tickets').where({ user_id: userId }),
            knex.first().from('user_gauntlet_run').where({ user_id: userId }),
            FirebasePromises.once(
              rootRef.child('user-gauntlet-run').child(userId).child('current'),
              'value',
            ),
          ]),
        )
        .then(([ticketRows, gauntletRunRow, fbRun]) => {
          expect(ticketRows.length).to.equal(0);
          expect(gauntletRunRow).to.exist;
          expect(fbRun.val()).to.exist;
        }));

    it('expect to ERROR out attempting starting a run in the middle of another one and to NOT use up an arena ticket', () =>
      knex('users')
        .where('id', userId)
        .update({ wallet_gold: TICKET_GOLD_PRICE + GOLD_SURPLUS })
        .then((numUpdates) => GauntletModule.buyArenaTicketWithGold(userId))
        .then((ticketId) => {
          expect(ticketId).to.exist;
          return GauntletModule.startRun(userId, ticketId);
        })
        .then((runData) => {
          expect(runData).to.not.exist;
        })
        .catch((error) => {
          expect(error).to.exist;
          expect(error).to.not.be.an.instanceof(chai.AssertionError);
          return DuelystFirebase.connect().getRootRef();
        })
        .then((rootRef) =>
          Promise.all([
            knex.first().from('users').where({ id: userId }),
            knex.select().from('user_gauntlet_tickets').where({ user_id: userId }),
            FirebasePromises.once(
              rootRef.child('user-inventory').child(userId).child('gauntlet-tickets'),
              'value',
            ),
          ]),
        )
        .then(([userRow, ticketRows, fbTickets]) => {
          expect(userRow.wallet_gold).to.equal(GOLD_SURPLUS);
          expect(ticketRows.length).to.equal(1);
          expect(fbTickets.numChildren()).to.equal(1);
        }));
  });

  // describe("chooseFaction()", function() {
  //
  //  // before cleanup
  //  before(function(){
  //    return knex("user_gauntlet_run").where({user_id:userId}).delete()
  //  });
  //
  //  it('expect trying to choose a faction with no run in progress to ERROR', function() {
  //    return GauntletModule.chooseFaction(userId,1)
  //    .then(function(arenaData){
  //      expect(arenaData).to.not.exist;
  //    }).catch(function(error){
  //      expect(error).to.exist;
  //      expect(error).to.be.an.instanceof(Errors.NotFoundError);
  //    });
  //  });
  //
  //  it('expect choosing an INVALID faction to fail', function() {
  //
  //    return knex("users").where('id',userId).update({'wallet_gold':150})
  //    .bind({})
  //    .then(function(){
  //      return GauntletModule.buyArenaTicketWithGold(userId);
  //    }).then(function(ticketId){
  //      return GauntletModule.startRun(userId,ticketId);
  //    }).then(function(arenaData){
  //      return knex("user_gauntlet_run").where('user_id',userId).first()
  //    }).then(function(arenaData){
  //
  //      const invalidChoices = _.difference([
  //            SDK.Factions.Faction1,
  //            SDK.Factions.Faction2,
  //            SDK.Factions.Faction3,
  //            SDK.Factions.Faction4,
  //            SDK.Factions.Faction5,
  //            SDK.Factions.Faction6
  //          ],arenaData.faction_choices);
  //
  //      // Logger.module("UNITTEST").log("choices:",arenaData.faction_choices);
  //      // Logger.module("UNITTEST").log("invalid choices:",invalidChoices);
  //
  //      return GauntletModule.chooseFaction(userId,invalidChoices[0])
  //
  //    }).then(function(arenaData){
  //      expect(arenaData).to.not.exist;
  //    }).catch(function(error){
  //      expect(error).to.exist;
  //      expect(error).to.be.an.instanceof(Errors.InvalidRequestError);
  //    });
  //  });
  //
  //  //it('expect choosing a valid faction to work and set initial card choices', function() {
  //  //  return knex("user_gauntlet_run").where('user_id',userId).first()
  //  //  .bind({})
  //  //  .then(function(arenaData){
  //  //    this.factionId = arenaData.faction_choices[0];
  //  //    return GauntletModule.chooseFaction(userId,this.factionId);
  //  //  }).then(function(arenaData){
  //  //    expect(arenaData).to.exist;
  //  //    expect(arenaData.faction_id).to.exist;
  //  //    expect(arenaData.card_choices).to.exist;
  //  //    return DuelystFirebase.connect().getRootRef()
  //  //  }).then(function(rootRef){
  //  //    return Promise.all([
  //  //      knex.first().from("user_gauntlet_run").where({'user_id':userId}),
  //  //      FirebasePromises.once(rootRef.child("user-gauntlet-run").child(userId).child("current"),"value"),
  //  //    ])
  //  //  }).then(function([gauntletRow,fbRun]){
  //  //    expect(gauntletRow.faction_id).to.equal(this.factionId);
  //  //    expect(gauntletRow.card_choices).to.exist;
  //  //    expect(gauntletRow.card_choices.length).to.equal(3);
  //  //    expect(fbRun.val().faction_id).to.equal(this.factionId);
  //  //    expect(fbRun.val().card_choices).to.exist;
  //  //    expect(fbRun.val().card_choices.length).to.equal(3);
  //  //  });
  //  });
  //
  //  //it('expect to ERROR out attempting to choose a faction twice', function() {
  //  //  return knex("user_gauntlet_run").where('user_id',userId).first()
  //  //  .bind({})
  //  //  .then(function(arenaData){
  //  //    return GauntletModule.chooseFaction(userId,arenaData.faction_choices[0])
  //  //  }).then(function(arenaData){
  //  //    expect(arenaData).to.not.exist;
  //  //  }).catch(function(error){
  //  //    expect(error).to.exist;
  //  //    expect(error).to.be.an.instanceof(Errors.InvalidRequestError);
  //  //  });
  //  //});
  //
  // });
  //
  // describe("chooseCard()", function() {
  //
  //  // before cleanup
  //  before(function(){
  //    return knex("user_gauntlet_run").where({user_id:userId}).delete()
  //  });
  //
  //  it('expect trying to choose a card with no run to ERROR out', function() {
  //    return GauntletModule.chooseCard(userId,1)
  //    .then(function(arenaData){
  //      expect(arenaData).to.not.exist;
  //    }).catch(function(error){
  //      expect(error).to.exist;
  //      expect(error).to.be.an.instanceof(Errors.NotFoundError);
  //    });
  //  });
  //
  //  it('expect choosing a card to work and generate new card choices', function() {
  //
  //    return knex("users").where('id',userId).update({'wallet_gold':150})
  //    .bind({})
  //    .then(function(){
  //      return GauntletModule.buyArenaTicketWithGold(userId);
  //    }).then(function(ticketId){
  //      return GauntletModule.startRun(userId,ticketId);
  //    }).then(function(arenaData){
  //      return GauntletModule.chooseFaction(userId,arenaData.faction_choices[0])
  //    }).then(function(arenaData){
  //      expect(arenaData.card_choices).to.exist;
  //      this.previous_card_choices = arenaData.card_choices;
  //      return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){
  //      expect(arenaData).to.exist;
  //      expect(arenaData.card_choices).to.exist;
  //      expect(_.intersection(this.previous_card_choices,arenaData.card_choices)).to.not.equal(3);
  //      return DuelystFirebase.connect().getRootRef()
  //    }).then(function(rootRef){
  //      return Promise.all([
  //        knex.first().from("user_gauntlet_run").where({'user_id':userId}),
  //        FirebasePromises.once(rootRef.child("user-gauntlet-run").child(userId).child("current"),"value"),
  //      ])
  //    }).then(function([gauntletRow,fbRun]){
  //      expect(gauntletRow.deck.length).to.equal(1);
  //      expect(_.intersection(this.previous_card_choices,gauntletRow.card_choices)).to.not.equal(3);
  //      expect(fbRun.val().deck.length).to.equal(1);
  //      expect(_.intersection(this.previous_card_choices,fbRun.val().card_choices)).to.not.equal(3);
  //    });
  //  });
  //
  //  it('expect choosing an invalid card to fail', function() {
  //    return GauntletModule.chooseCard(userId,-100)
  //    .then(function(arenaData){
  //      expect(arenaData).to.not.exist;
  //    }).catch(function(error){
  //      expect(error).to.exist;
  //      expect(error).to.be.an.instanceof(Errors.InvalidRequestError);
  //    });
  //  });
  //
  //  it('expect to be able to choose 30 cards + general and the run to be marked as complete', function() {
  //    //this.timeout(15000);
  //    this.timeout(30000);
  //
  //    return knex.first().from("user_gauntlet_run").where({'user_id':userId})
  //    .bind({})
  //    .then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.card_choices[0])
  //    }).then(function(arenaData){ return GauntletModule.chooseCard(userId,arenaData.general_choices[0])
  //    }).then(function(arenaData){
  //      expect(arenaData.deck.length).to.equal(31);
  //      expect(arenaData.is_complete).to.equal(true);
  //      return DuelystFirebase.connect().getRootRef();
  //    }).then(function(rootRef){
  //      return Promise.all([
  //        knex.first().from("user_gauntlet_run").where({'user_id':userId}),
  //        FirebasePromises.once(rootRef.child("user-gauntlet-run").child(userId).child("current"),"value"),
  //      ])
  //    }).then(function([gauntletRow,fbRun]){
  //
  //      expect(gauntletRow.deck.length).to.equal(31);
  //      expect(gauntletRow.is_complete).to.equal(true);
  //      expect(gauntletRow.completed_at).to.exist;
  //      expect(gauntletRow.general_id).to.exist;
  //      expect(gauntletRow.deck[0]).to.equal(gauntletRow.general_id);
  //
  //      const gameSession = SDK.GameSession.current();
  //      const generalSDKCard = gameSession.getCardCaches().getCardById(gauntletRow.general_id);
  //      expect(generalSDKCard.getIsGeneral()).to.equal(true);
  //
  //      expect(fbRun.val().deck.length).to.equal(31);
  //      expect(fbRun.val().is_complete).to.equal(true);
  //      expect(fbRun.val().general_id).to.exist;
  //      expect(fbRun.val().deck[0]).to.equal(fbRun.val().general_id);
  //
  //      expect(fbRun.val().general_id).to.equal(gauntletRow.general_id);
  //
  //    });
  //  });
  //
  //  it('expect to NOT be able to choose a card after having a complete deck', function() {
  //    return GauntletModule.chooseCard(userId,1)
  //    .then(function(arenaData){
  //      expect(arenaData).to.not.exist;
  //    }).catch(function(error){
  //      expect(error).to.exist;
  //      expect(error).to.be.an.instanceof(Errors.InvalidRequestError);
  //      expect(error.message).to.equal("You can not choose additional cards");
  //    });
  //  });
  //
  //  it('expect general id after having a complete gauntlet deck', function() {
  //    return knex("user_gauntlet_run").where('user_id',userId).first()
  //    .bind({})
  //    .then(function(arenaData){
  //      expect(arenaData).to.exist;
  //      expect(arenaData.general_id).to.exist;
  //    });
  //  });
  //
  //  it('expect increased number of card choices to be from the Unity set', function() {
  //    this.timeout(10000);
  //
  //    const emphasizedSet = SDK.CardSet.Unity;
  //    const numRounds = 10000;
  //    const totalChoices = 0;
  //    const totalSetChoices = 0;
  //    const all = [];
  //    const allPlayableFactions = SDK.FactionFactory.getAllPlayableFactions();
  //    for (var i = 0; i < numRounds; i++) {
  //      const factionId = _.sample(allPlayableFactions).id;
  //      const cardChoicesPromise = GauntletModule._generateCardChoices(Promise.resolve(), knex, userId, factionId, i % 30)
  //      .then(function (cardChoices) {
  //        totalChoices += cardChoices.length;
  //        for (var j = 0, jl = cardChoices.length; j < jl; j++) {
  //          const cardId = cardChoices[j];
  //          const sdkCard = _.find(SDK.GameSession.getCardCaches().getCardSet(emphasizedSet).getCards(), function (card) { return card.getId() === cardId; });
  //          if (sdkCard != null) {
  //            totalSetChoices++;
  //          }
  //        }
  //      });
  //      all.push(cardChoicesPromise);
  //    }
  //
  //    return Promise.all(all)
  //    .then(function () {
  //      expect(totalChoices).to.equal(numRounds * 3);
  //      Logger.module("UNITTEST").log(totalSetChoices / totalChoices);
  //      expect(totalSetChoices / totalChoices).to.be.above(0.05);
  //      expect(totalSetChoices / totalChoices).to.be.below(0.1);
  //    });
  //  });
  //
  // });

  describe('getArenaDeck()', () => {
    it("expect to be able to retrive a user's active arena deck", () =>
      SyncModule.wipeUserData(userId)
        .then(() => knex('users').where('id', userId).update({ wallet_gold: 150 }))
        .then(() => GauntletModule.buyArenaTicketWithGold(userId))
        .then((ticketId) => GauntletModule.startRun(userId, ticketId))
        .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.general_choices[0]))
        .then(() => fillOutArenaDeck(userId))
        .then(() => GauntletModule.getArenaDeck(userId))
        .then((deck) => {
          expect(deck).to.exist;
          expect(deck.length).to.equal(31);
        }));

    it("expect the first card in a user's active arena deck to be the correct GENERAL", () => {
      let generalId;
      return GauntletModule.getArenaDeck(userId)
        .then((deck) => {
          expect(deck).to.exist;

          generalId = deck.shift();
          const generalCard = SDK.CardFactory.cardForIdentifier(
            generalId,
            SDK.GameSession.current(),
          );

          expect(generalCard.getIsGeneral()).to.equal(true);
        })
        .then(() => knex('user_gauntlet_run').first().where('user_id', userId))
        .then((runRow) => {
          expect(generalId).to.equal(runRow.general_id);
        });
    });
  });

  describe('getRunMatchmakingMetric()', () => {
    it("expect to be able to retrive a user's active arena matchmaking metric", () =>
      GauntletModule.getRunMatchmakingMetric(userId).then((metric) => {
        expect(metric).to.exist;
        expect(metric).to.within(0, 12);
      }));

    it('expect metric to equal MAX WINS - win count', () =>
      GauntletModule.updateArenaRunWithGameOutcome(userId, true, 'metric_game_1')
        .then(() => GauntletModule.getRunMatchmakingMetric(userId))
        .then((metric) => {
          expect(metric).to.exist;
          expect(metric).to.equal(11);
        }));

    it('TODO: expect metric request to fail on run with incomplete deck', () => {
      expect(true).to.exist;
    });

    it('TODO: expect metric request to fail on run that is finished', () => {
      expect(true).to.exist;
    });

    it("TODO: expect metric request to fail when there's no run", () => {
      expect(true).to.exist;
    });
  });

  describe('resignRun()', () => {
    let lastResignedAt = null;

    // before cleanup
    beforeAll(() => knex('user_gauntlet_run').where({ user_id: userId }).delete());

    it('expect to ERROR out an attempt to resign with no run', () =>
      GauntletModule.resignRun(userId)
        .then((data) => {
          expect(data).to.not.exist;
        })
        .catch((error) => {
          expect(error).to.exist;
          expect(error).to.be.an.instanceof(Errors.NotFoundError);
        }));

    it('expect to be able to resign an active arena run', () =>
      knex('users')
        .where('id', userId)
        .update({ wallet_gold: 150 })
        .then(() => GauntletModule.buyArenaTicketWithGold(userId))
        .then((ticketId) => GauntletModule.startRun(userId, ticketId))
        .then((arenaData) => GauntletModule.resignRun(userId))
        .then((arenaData) => {
          expect(arenaData.ended_at).to.exist;
          expect(arenaData.is_resigned).to.equal(true);
          return DuelystFirebase.connect().getRootRef();
        })
        .then((rootRef) =>
          Promise.all([
            knex.first().from('user_gauntlet_run').where({ user_id: userId }),
            FirebasePromises.once(
              rootRef.child('user-gauntlet-run').child(userId).child('current'),
              'value',
            ),
          ]),
        )
        .then(([gauntletRow, fbRun]) => {
          expect(gauntletRow.is_resigned).to.equal(true);
          expect(gauntletRow.ended_at).to.exist;

          expect(fbRun.val().is_resigned).to.equal(true);
          expect(fbRun.val().ended_at).to.exist;

          lastResignedAt = gauntletRow.ended_at;
        }));

    it('expect an attempt to resign an ended run to ERROR out and leave data untouched', () =>
      GauntletModule.resignRun(userId)
        .then((data) => {
          expect(data).to.not.exist;
        })
        .catch((error) => {
          expect(error).to.be.an.instanceof(Errors.InvalidRequestError);
          return DuelystFirebase.connect().getRootRef();
        })
        .then((rootRef) =>
          Promise.all([
            knex.first().from('user_gauntlet_run').where({ user_id: userId }),
            FirebasePromises.once(
              rootRef.child('user-gauntlet-run').child(userId).child('current'),
              'value',
            ),
          ]),
        )
        .then(([gauntletRow, fbRun]) => {
          expect(gauntletRow.is_resigned).to.equal(true);
          expect(gauntletRow.ended_at).to.exist;
          expect(gauntletRow.ended_at.valueOf()).to.equal(lastResignedAt.valueOf());

          expect(fbRun.val().is_resigned).to.equal(true);
          expect(fbRun.val().ended_at).to.exist;
        }));

    it('expect to ERROR out attempts to start a run before claiming rewards on a resigned run', () =>
      knex('users')
        .where('id', userId)
        .update({ wallet_gold: 150 })
        .then(() => GauntletModule.buyArenaTicketWithGold(userId))
        .then((ticketId) => GauntletModule.startRun(userId, ticketId))
        .then((response) => {
          expect(response).to.not.exist;
        })
        .catch((error) => {
          expect(error).to.exist;
          expect(error).to.be.an.instanceof(Errors.InvalidRequestError);
          expect(error.message).to.equal('Could not start run: rewards not yet claimed.');
        }));
  });

  describe('updateArenaRunWithGameOutcome()', () => {
    const _chainState = {};
    const tickets = [];

    beforeAll(() =>
      knex('users')
        .where('id', userId)
        .update({ wallet_gold: 2500 })
        .then((numUpdates) => knex('user_gauntlet_run').where({ user_id: userId }).delete())
        .then(() =>
          Promise.all([
            GauntletModule.buyArenaTicketWithGold(userId),
            GauntletModule.buyArenaTicketWithGold(userId),
            GauntletModule.buyArenaTicketWithGold(userId),
            GauntletModule.buyArenaTicketWithGold(userId),
            GauntletModule.buyArenaTicketWithGold(userId),
            GauntletModule.buyArenaTicketWithGold(userId),
            GauntletModule.buyArenaTicketWithGold(userId),
          ]),
        )
        .then((ticketData) => {
          _.each(ticketData, (t) => {
            if (t) tickets.push(t);
          });
        }),
    );

    afterAll(() => {});

    it('expect to FAIL to update arena run with a game if no arena run is active', () =>
      GauntletModule.updateArenaRunWithGameOutcome(userId, 'game 1', true)
        .then((arenaData) => {
          expect(arenaData).to.not.exist;
        })
        .catch((error) => {
          expect(error).to.exist;
          expect(error).to.be.an.instanceof(Error);
        }));

    it('expect to FAIL to update arena run with a game if an arena run is over', () =>
      GauntletModule.startRun(userId, tickets.pop())
        .then((arenaData) => GauntletModule.resignRun(userId))
        .then((arenaData) => GauntletModule.updateArenaRunWithGameOutcome(userId, 'game 1', true))
        .then((arenaData) => {
          expect(arenaData).to.not.exist;
        })
        .catch((error) => {
          expect(error).to.exist;
          expect(error).to.be.an.instanceof(Error);
        }));

    it('expect a won game to update the arena win counter', () => {
      const gameId = generatePushId();
      return knex('user_gauntlet_run')
        .where({ user_id: userId })
        .delete()
        .then(() => GauntletModule.startRun(userId, tickets.pop()))
        .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.general_choices[0]))
        .then((arenaData) => fillOutArenaDeck(userId))
        .then((arenaData) => GauntletModule.updateArenaRunWithGameOutcome(userId, true, gameId))
        .then((arenaData) => {
          expect(arenaData).to.exist;
          expect(arenaData.win_count).to.equal(1);
          expect(arenaData.loss_count).to.equal(0);
          return DuelystFirebase.connect().getRootRef();
        })
        .then((rootRef) =>
          Promise.all([
            knex.first().from('user_gauntlet_run').where({ user_id: userId }),
            FirebasePromises.once(
              rootRef.child('user-gauntlet-run').child(userId).child('current'),
              'value',
            ),
            FirebasePromises.once(
              rootRef.child('user-games').child(userId).child(gameId).child('job_status'),
              'value',
            ),
          ]),
        )
        .then(([gauntletRow, fbRun, firebaseGameJobStatusSnapshot]) => {
          expect(gauntletRow.win_count).to.equal(1);
          expect(gauntletRow.loss_count).to.equal(0);

          expect(fbRun.val().win_count).to.equal(1);
          expect(fbRun.val().loss_count).to.equal(0);

          expect(firebaseGameJobStatusSnapshot.val().gauntlet).to.equal(true);
        });
    });

    it('expect a lost game to update the arena loss counter', () =>
      GauntletModule.updateArenaRunWithGameOutcome(userId, false, 'game 2')
        .then((arenaData) => {
          expect(arenaData).to.exist;
          expect(arenaData.win_count).to.equal(1);
          expect(arenaData.loss_count).to.equal(1);
          return DuelystFirebase.connect().getRootRef();
        })
        .then((rootRef) =>
          Promise.all([
            knex.first().from('user_gauntlet_run').where({ user_id: userId }),
            FirebasePromises.once(
              rootRef.child('user-gauntlet-run').child(userId).child('current'),
              'value',
            ),
          ]),
        )
        .then(([gauntletRow, fbRun]) => {
          expect(gauntletRow.win_count).to.equal(1);
          expect(gauntletRow.loss_count).to.equal(1);

          expect(fbRun.val().win_count).to.equal(1);
          expect(fbRun.val().loss_count).to.equal(1);
        }));

    it('expect a draw to update the arena draw counter and not win/loss', () =>
      GauntletModule.updateArenaRunWithGameOutcome(userId, false, 'game 2', true)
        .then((arenaData) => {
          expect(arenaData).to.exist;
          expect(arenaData.win_count).to.equal(1);
          expect(arenaData.loss_count).to.equal(1);
          expect(arenaData.draw_count).to.equal(1);
          return DuelystFirebase.connect().getRootRef();
        })
        .then((rootRef) =>
          Promise.all([
            knex.first().from('user_gauntlet_run').where({ user_id: userId }),
            FirebasePromises.once(
              rootRef.child('user-gauntlet-run').child(userId).child('current'),
              'value',
            ),
          ]),
        )
        .then(([gauntletRow, fbRun]) => {
          expect(gauntletRow.win_count).to.equal(1);
          expect(gauntletRow.loss_count).to.equal(1);
          expect(gauntletRow.draw_count).to.equal(1);

          expect(fbRun.val().win_count).to.equal(1);
          expect(fbRun.val().loss_count).to.equal(1);
          expect(fbRun.val().draw_count).to.equal(1);
        }));

    it('expect 3 losses to end the run', () =>
      playGames(2, false, 'game')
        .then(([arenaDataNoFinal, arenaData]) => {
          expect(arenaDataNoFinal.ended_at).to.not.exist;

          expect(arenaData).to.exist;
          expect(arenaData.loss_count).to.equal(3);
          expect(arenaData.ended_at).to.exist;
          expect(arenaData.rewards).to.not.exist;
          return DuelystFirebase.connect().getRootRef();
        })
        .then((rootRef) =>
          Promise.all([
            knex.first().from('user_gauntlet_run').where({ user_id: userId }),
            FirebasePromises.once(
              rootRef.child('user-gauntlet-run').child(userId).child('current'),
              'value',
            ),
          ]),
        )
        .then(([gauntletRow, fbRun]) => {
          expect(gauntletRow.loss_count).to.equal(3);
          expect(gauntletRow.ended_at).to.exist;
          expect(gauntletRow.rewards).to.not.exist;

          expect(fbRun.val().loss_count).to.equal(3);
          expect(fbRun.val().ended_at).to.exist;
          expect(fbRun.val().rewards).to.not.exist;
        }));

    it('expect to be able to claim rewards for a complete run', () =>
      GauntletModule.claimRewards(userId)
        .then((arenaData) => {
          expect(arenaData).to.exist;
          expect(arenaData.rewards_claimed_at).to.exist;
          expect(arenaData.rewards).to.exist;
          return DuelystFirebase.connect().getRootRef();
        })
        .then((rootRef) =>
          Promise.all([
            knex.first().from('user_gauntlet_run').where({ user_id: userId }),
            knex.select().from('user_rewards').where({ user_id: userId }),
            FirebasePromises.once(
              rootRef.child('user-gauntlet-run').child(userId).child('current'),
              'value',
            ),
          ]),
        )
        .then(([gauntletRow, rewardRows, fbRun]) => {
          const arenaRewards = _.filter(
            rewardRows,
            (row) => row.source_id === gauntletRow.ticket_id,
          );

          expect(arenaRewards).to.exist;
          expect(arenaRewards.length).to.be.above(0);

          expect(gauntletRow.rewards_claimed_at).to.exist;
          expect(gauntletRow.reward_ids).to.exist;

          expect(fbRun.val().rewards_claimed_at).to.exist;
          expect(fbRun.val().rewards).to.exist;
        }));

    it('expect NOT to be able to claim rewards TWICE for a complete run', () =>
      knex
        .select()
        .from('user_rewards')
        .where({ user_id: userId })
        .then((rewardRows) => {
          _chainState.rewardCount = rewardRows.length;
          return GauntletModule.claimRewards(userId);
        })
        .then((arenaData) => {
          expect(arenaData).to.not.exist;
        })
        .catch((error) => {
          expect(error).to.exist;
          expect(error).to.be.an.instanceof(Errors.ArenaRewardsAlreadyClaimedError);
          return DuelystFirebase.connect().getRootRef();
        })
        .then((rootRef) =>
          Promise.all([
            knex.first().from('user_gauntlet_run').where({ user_id: userId }),
            knex.select().from('user_rewards').where({ user_id: userId }),
          ]),
        )
        .then(([gauntletRow, rewardRows]) => {
          const arenaRewards = _.filter(
            rewardRows,
            (row) => row.source_id === gauntletRow.ticket_id,
          );

          expect(arenaRewards).to.exist;
          expect(arenaRewards.length).to.be.equal(_chainState.rewardCount);
        }));

    it('expect an arena run with 3 wins to generate 4 reward slots', () =>
      GauntletModule.startRun(userId, tickets.pop())
        .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.general_choices[0]))
        .then((arenaData) => fillOutArenaDeck(userId))
        .then((arenaData) => playGames(3, true, 'game'))
        .then(() => playGames(3, false, 'game'))
        .then(() => GauntletModule.claimRewards(userId))
        .then((arenaData) => {
          expect(arenaData.loss_count).to.equal(3);
          expect(arenaData.ended_at).to.exist;
          expect(arenaData.rewards).to.exist;
          expect(arenaData.rewards.length).to.equal(4);
          return DuelystFirebase.connect().getRootRef();
        })
        .then((rootRef) =>
          Promise.all([
            knex.first().from('user_gauntlet_run').where({ user_id: userId }),
            knex.select().from('user_rewards').where({ user_id: userId }),
            FirebasePromises.once(
              rootRef.child('user-gauntlet-run').child(userId).child('current'),
              'value',
            ),
          ]),
        )
        .then(([gauntletRow, rewardRows, fbRun]) => {
          const arenaRewards = _.filter(
            rewardRows,
            (row) => row.source_id === gauntletRow.ticket_id,
          );

          expect(arenaRewards).to.exist;
          expect(arenaRewards.length).to.be.equal(4);

          expect(gauntletRow.rewards_claimed_at).to.exist;
          expect(gauntletRow.reward_ids).to.exist;

          expect(fbRun.val().rewards_claimed_at).to.exist;
          expect(fbRun.val().rewards).to.exist;
        }));

    /*
     * Reward slots are emergent from the win thresholds in
     * GauntletModule.claimRewards: a spirit-orb grant and a basic box at 1 win,
     * a gold box at 2, a good box at 3, a great box at 10, an awesome box and a
     * cosmetic key at 12. There is no constant to derive from, so the counts
     * are spelled out -- but the reason they moved is worth recording: the run
     * used to also award a free arena ticket above 6 wins, and that was
     * disabled when tickets themselves became free. Every count below is one
     * lower than when these tests were written, for that single reason.
     */
    it('expect an arena run with 7 wins to generate 4 reward slots', () =>
      GauntletModule.startRun(userId, tickets.pop())
        .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.general_choices[0]))
        .then((arenaData) => fillOutArenaDeck(userId))
        .then((arenaData) => playGames(7, true, 'game'))
        .then(() => playGames(3, false, 'game'))
        .then(() => GauntletModule.claimRewards(userId))
        .then((arenaData) => {
          expect(arenaData).to.exist;
          // the reward slots are driven by win_count, so pin it rather than infer it
          expect(arenaData.win_count).to.equal(7);
          expect(arenaData.loss_count).to.equal(3);
          expect(arenaData.ended_at).to.exist;
          expect(arenaData.rewards).to.exist;
          expect(arenaData.rewards.length).to.be.equal(4);
          return DuelystFirebase.connect().getRootRef();
        })
        .then((rootRef) =>
          Promise.all([
            knex.first().from('user_gauntlet_run').where({ user_id: userId }),
            knex.select().from('user_rewards').where({ user_id: userId }),
            FirebasePromises.once(
              rootRef.child('user-gauntlet-run').child(userId).child('current'),
              'value',
            ),
          ]),
        )
        .then(([gauntletRow, rewardRows, fbRun]) => {
          const arenaRewards = _.filter(
            rewardRows,
            (row) => row.source_id === gauntletRow.ticket_id,
          );

          expect(arenaRewards).to.exist;
          expect(arenaRewards.length).to.be.equal(4);

          expect(gauntletRow.rewards_claimed_at).to.exist;
          expect(gauntletRow.reward_ids).to.exist;

          expect(fbRun.val().rewards_claimed_at).to.exist;
          expect(fbRun.val().rewards).to.exist;
        }));

    it('expect an arena run with 10 wins to generate 5 reward slots', () =>
      GauntletModule.startRun(userId, tickets.pop())
        .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.general_choices[0]))
        .then((arenaData) => fillOutArenaDeck(userId))
        .then((arenaData) => playGames(10, true, 'game'))
        .then(() => playGames(3, false, 'game'))
        .then(() => GauntletModule.claimRewards(userId))
        .then((arenaData) => {
          expect(arenaData).to.exist;
          // the reward slots are driven by win_count, so pin it rather than infer it
          expect(arenaData.win_count).to.equal(10);
          expect(arenaData.loss_count).to.equal(3);
          expect(arenaData.ended_at).to.exist;
          expect(arenaData.rewards).to.exist;
          // One fewer than when this was written: the run used to also award a free
          // arena ticket above 6 wins, and that was disabled when tickets became
          // free. Card rewards collapse per rarity, so the exact count depends on
          // which rarities are drawn -- which is why this suite seeds Math.random.
          expect(arenaData.rewards.length).to.be.equal(5);

          return DuelystFirebase.connect().getRootRef();
        })
        .then((rootRef) =>
          Promise.all([
            knex.first().from('user_gauntlet_run').where({ user_id: userId }),
            knex.select().from('user_rewards').where({ user_id: userId }),
            FirebasePromises.once(
              rootRef.child('user-gauntlet-run').child(userId).child('current'),
              'value',
            ),
          ]),
        )
        .then(([gauntletRow, rewardRows, fbRun]) => {
          const arenaRewards = _.filter(
            rewardRows,
            (row) => row.source_id === gauntletRow.ticket_id,
          );

          expect(arenaRewards).to.exist;
          // one fewer row than before, for the same removed free-ticket reward
          expect(arenaRewards.length).to.be.equal(4);

          expect(gauntletRow.rewards_claimed_at).to.exist;
          expect(gauntletRow.reward_ids).to.exist;

          expect(fbRun.val().rewards_claimed_at).to.exist;
          expect(fbRun.val().rewards).to.exist;
        }));

    it('expect an arena run with 12 wins and 0 losses to end', () =>
      GauntletModule.startRun(userId, tickets.pop())
        .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.general_choices[0]))
        .then((arenaData) => fillOutArenaDeck(userId))
        .then((arenaData) => playGames(12, true, 'game'))
        .then(() => GauntletModule.claimRewards(userId))
        .then((arenaData) => {
          expect(arenaData).to.exist;
          expect(arenaData.loss_count).to.equal(0);
          expect(arenaData.ended_at).to.exist;
          return DuelystFirebase.connect().getRootRef();
        })
        .then((rootRef) =>
          Promise.all([
            knex.first().from('user_gauntlet_run').where({ user_id: userId }),
            FirebasePromises.once(
              rootRef.child('user-gauntlet-run').child(userId).child('current'),
              'value',
            ),
          ]),
        )
        .then(([gauntletRow, fbRun]) => {
          expect(gauntletRow.ended_at).to.exist;
          expect(fbRun.val().ended_at).to.exist;
        }));
  });

  describe('claimRewards()', () => {
    const _chainState = {};
    const tickets = [];

    beforeAll(() =>
      knex('users')
        .where('id', userId)
        .update({ wallet_gold: 2500 })
        .then((numUpdates) => knex('user_gauntlet_run').where({ user_id: userId }).delete())
        .then(() =>
          Promise.all([
            GauntletModule.buyArenaTicketWithGold(userId),
            GauntletModule.buyArenaTicketWithGold(userId),
            GauntletModule.buyArenaTicketWithGold(userId),
            GauntletModule.buyArenaTicketWithGold(userId),
            GauntletModule.buyArenaTicketWithGold(userId),
            GauntletModule.buyArenaTicketWithGold(userId),
            GauntletModule.buyArenaTicketWithGold(userId),
          ]),
        )
        .then((ticketData) => {
          _.each(ticketData, (t) => {
            if (t) tickets.push(t);
          });
        }),
    );

    afterAll(() => {});

    it('expect inventory and wallet to update after claiming rewards', () =>
      Promise.all([
        knex('users').first().where('id', userId),
        knex('user_card_collection').first().where('user_id', userId),
        knex('user_spirit_orbs').select().where('user_id', userId),
        knex('user_gauntlet_tickets').select().where('user_id', userId),
      ])
        .then(([userRow, collectionRow, boosterRows, ticketRows]) => {
          _chainState.userRow = userRow;
          _chainState.collectionRow = collectionRow;
          _chainState.boosterRows = boosterRows;
          _chainState.ticketRows = ticketRows;

          return GauntletModule.startRun(userId, tickets.pop());
        })
        .then((arenaData) => GauntletModule.chooseCard(userId, arenaData.general_choices[0]))
        .then((arenaData) => fillOutArenaDeck(userId))
        .then((arenaData) => playGames(7, true, 'game'))
        .then(() => playGames(3, false, 'game'))
        .then(() => GauntletModule.claimRewards(userId))
        .then((arenaData) => {
          expect(arenaData).to.exist;
          expect(arenaData.loss_count).to.equal(3);
          expect(arenaData.ended_at).to.exist;
          expect(arenaData.rewards).to.exist;
          expect(arenaData.rewards.length).to.be.above(3); // 4 or 5 reward slots because one could include 2 card rewards
          _chainState.rewards = arenaData.reward_ids;
          return DuelystFirebase.connect().getRootRef();
        })
        .then((rootRef) =>
          Promise.all([
            knex('user_rewards').select().whereIn('id', _chainState.rewards),
            knex('users').first().where('id', userId),
            knex('user_card_collection').first().where('user_id', userId),
            knex('user_spirit_orbs').select().where('user_id', userId),
            knex('user_gauntlet_tickets').select().where('user_id', userId),
            FirebasePromises.once(
              rootRef.child('user-inventory').child(userId).child('wallet'),
              'value',
            ),
            FirebasePromises.once(
              rootRef.child('user-inventory').child(userId).child('card-collection'),
              'value',
            ),
            FirebasePromises.once(
              rootRef.child('user-inventory').child(userId).child('spirit-orbs'),
              'value',
            ),
            FirebasePromises.once(
              rootRef.child('user-inventory').child(userId).child('gauntlet-tickets'),
              'value',
            ),
          ]),
        )
        .then(
          ([
            rewardRows,
            userRow,
            collectionRow,
            boosterRows,
            ticketRows,
            walletSnapshot,
            collectionSnapshot,
            boosterPacksSnapshot,
            ticketsSnapshot,
          ]) => {
            const newCollectionData = collectionSnapshot.val();
            let totalGoldEarned = 0;
            let totalSpiritEarned = 0;

            _.each(rewardRows, (reward) => {
              if (reward.cards) {
                const cardId = reward.cards[0];
                // Logger.module("UNITTEST").log("checking card "+cardId);
                const newCount = newCollectionData[cardId].count;
                let oldCount = 0;
                if (_chainState.collectionRow && _chainState.collectionRow.cards[cardId])
                  oldCount = _chainState.collectionRow.cards[cardId].count;

                expect(oldCount + 1).to.equal(newCount);
                expect(oldCount + 1).to.equal(collectionRow.cards[cardId].count);
              } else if (reward.gold) {
                totalGoldEarned += parseInt(reward.gold, 10);
              } else if (reward.spirit) {
                totalSpiritEarned += parseInt(reward.spirit, 10);
              }
            });

            // Logger.module("UNITTEST").log("wallet",walletSnapshot.val())

            // check gold
            const oldGold = _chainState.userRow.wallet_gold || 0;
            expect(userRow.wallet_gold).to.equal(oldGold + totalGoldEarned);
            expect(walletSnapshot.val().gold_amount || 0).to.equal(oldGold + totalGoldEarned);

            // check spirit
            const oldSpirit = _chainState.userRow.wallet_spirit || 0;
            expect(userRow.wallet_spirit).to.equal(oldSpirit + totalSpiritEarned);
            expect(walletSnapshot.val().spirit_amount || 0).to.equal(oldSpirit + totalSpiritEarned);

            // check boosters
            expect(boosterRows.length).to.equal(_chainState.boosterRows.length + 1);
            expect(boosterPacksSnapshot.numChildren()).to.equal(_chainState.boosterRows.length + 1);

            /*
             * One fewer than before: the run consumed a ticket and no longer earns
             * one back. The "got one" in the old comment was the free arena ticket
             * awarded above 6 wins, which was disabled when tickets became free --
             * so the count now simply drops by the one that was spent.
             */
            expect(ticketRows.length).to.equal(_chainState.ticketRows.length - 1);
            expect(ticketsSnapshot.numChildren()).to.equal(_chainState.ticketRows.length - 1);
          },
        ));

    it('expect not to be able to claim rewards twice', () =>
      GauntletModule.claimRewards(userId)
        .then((response) => {
          expect(response).to.not.exist;
        })
        .catch((error) => {
          expect(error).to.exist;
          expect(error).to.be.an.instanceof(Errors.ArenaRewardsAlreadyClaimedError);
        }));
  });

  /// /
  describe('generate card rarity output', () => {
    const tickets = [];

    beforeAll(() => {});

    afterAll(() => {});

    it('iterate over card choice rarities', () => {
      let numBasics = 0;
      let numCommon = 0;
      let numRare = 0;
      let numEpic = 0;
      let numLegendary = 0;
      const minRaritySum = Number.MAX_SAFE_INTEGER;
      const maxRaritySum = 0;

      let numFactionCards = 0;
      let numNeutralCards = 0;

      const generateDeck = function () {
        const deck = [];
        const factionId = _.random(1, 6);
        return GauntletModule._generateCardChoices(
          Promise.resolve(),
          knex,
          userId,
          factionId,
          1,
          null,
        )
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              2,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              3,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              4,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              5,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              6,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              7,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              8,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              9,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              10,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              11,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              12,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              13,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              14,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              15,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              16,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              17,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              18,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              19,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              20,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              21,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              22,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              23,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              24,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              25,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              26,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              27,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              28,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              29,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return GauntletModule._generateCardChoices(
              Promise.resolve(),
              knex,
              userId,
              factionId,
              30,
              deck[deck.length - 1],
            );
          })
          .then((cardIds) => {
            deck.push(cardIds[_.random(0, 2)]);
            return Promise.resolve(deck);
          });
      };

      const gatherDeckResults = function (iteration) {
        return generateDeck().then((deck) => {
          let deckRaritySum = 0;
          _.each(deck, (cardId) => {
            const sdkCard = SDK.GameSession.getCardCaches().getCardById(cardId);
            const cardRarity = sdkCard.getRarityId();
            const cardFactionId = sdkCard.getFactionId();

            deckRaritySum += cardRarity;

            if (cardRarity === SDK.Rarity.Fixed) {
              numBasics += 1;
            } else if (cardRarity === SDK.Rarity.Common) {
              numCommon += 1;
            } else if (cardRarity === SDK.Rarity.Rare) {
              numRare += 1;
            } else if (cardRarity === SDK.Rarity.Epic) {
              numEpic += 1;
            } else if (cardRarity === SDK.Rarity.Legendary) {
              numLegendary += 1;
            }

            if (cardFactionId !== SDK.Factions.Neutral) {
              numFactionCards += 1;
            } else {
              numNeutralCards += 1;
            }
          });
          return Promise.resolve();
        });
      };

      const deckPromises = [];
      for (let i = 0; i < numDeckRarityTests; i++) {
        deckPromises.push(gatherDeckResults(i));
      }

      return Promise.all(deckPromises).then(() => {
        const sumCards = numBasics + numCommon + numRare + numEpic + numLegendary;
        console.log('============');
        console.log(`${numDeckRarityTests} Iterations:`);
        console.log(`${((numBasics / sumCards) * 100).toFixed(1)}% basics`);
        console.log(`${((numCommon / sumCards) * 100).toFixed(1)}% common`);
        console.log(`${((numRare / sumCards) * 100).toFixed(1)}% rare`);
        console.log(`${((numEpic / sumCards) * 100).toFixed(1)}% epic`);
        console.log(`${((numLegendary / sumCards) * 100).toFixed(1)}% legendary`);
        console.log('============');
        console.log(`${((numFactionCards / sumCards) * 100).toFixed(1)}% Faction Cards`);
        console.log(`${((numNeutralCards / sumCards) * 100).toFixed(1)}% Neutral Cards`);
        console.log('============');
      });
    });
  });
});
