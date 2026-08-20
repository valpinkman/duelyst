/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const util = require('util');
const FirebasePromises = require('../firebase_promises');
const DuelystFirebase = require('../duelyst_firebase_module');
const Logger = require('../../../app/common/logger');
const colors = require('colors');
const moment = require('moment');
const _ = require('underscore');
const SyncModule = require('./sync');
const InventoryModule = require('./inventory');
const GamesModule = require('./games');
const DataAccessHelpers = require('./helpers');
const CONFIG = require('../../../app/common/config');
const Errors = require('../custom_errors');
const knex = require('./knex');
const config = require('../../../config/config.js');
const generatePushId = require('../../../app/common/generate_push_id');

// redis
const { Redis, Jobs, RiftManager } = require('../../redis');

// SDK imports
const SDK = require('../../../app/sdk');
const UtilsGameSession = require('../../../app/common/utils/utils_game_session');
const RiftHelper = require('app/sdk/rift/riftHelper');
const PromiseUtils = require('../../../app/common/utils/utils_promise');
const { onType } = require('../../../app/common/utils/utils_promise');

class RiftModule {
  static RIFT_MAX_WINS_FOR_MATCHMAKING = 200;
  static RIFT_DEFAULT_RATING = 400;
  static RIFT_MAX_RATING_DELTA = 30;
  static RIFT_MIN_RATING_DELTA = 10;
  static RIFT_RATING_DIFFERENCE_FOR_MAX_RATING_GAIN = 100;
  static RIFT_RATING_DIFFERENCE_FOR_MIN_RATING_GAIN = 500;
  static RIFT_MAX_STORED_UPGRADES = 10;
  static RIFT_FIRST_RUN_FREE_UPGRADES = 5;

  /**
   * Use soft currency (gold) to buy an rift ticket for a user.
   * @public
   * @param  {String}  userId    User ID for which to buy an rift ticket.
   * @return  {Promise}        Promise that will post RIFT TICKET ID on completion.
   */
  static buyRiftTicketWithGold(userId) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if (!userId) {
      Logger.module('RiftModule').log(`buyRiftTicketWithGold() -> invalid user ID - ${userId}.`.red);
      return Promise.reject(new Error(`Can not buy rift ticket with gold : invalid user ID - ${userId}`));
    }

    const NOW_UTC_MOMENT = moment.utc();

    const this_obj: Record<string, any> = {};
    var txPromise = knex.transaction(function (tx) {
      tx.first()
        .from('users')
        .where('id', userId)
        .forUpdate()
        .then(function (userRow) {
        // if the user has enough gold
          if (userRow.wallet_gold >= CONFIG.RIFT_TICKET_GOLD_PRICE) {
          // calculate final gold
            const final_wallet_gold = (_chainState.final_wallet_gold = userRow.wallet_gold - CONFIG.RIFT_TICKET_GOLD_PRICE);

            // setup what to update the user params with
            const userUpdateParams = {
              wallet_gold: final_wallet_gold,
              wallet_updated_at: NOW_UTC_MOMENT.toDate(),
            };

            return tx('users').where('id', userId).update(userUpdateParams);
          } else {
            Logger.module('RiftModule').log(`buyRiftTicketWithGold() -> Cannot buy ticket because user ${userId.blue} has insufficient funds`.red);
            return Promise.reject(new Errors.InsufficientFundsError(`Insufficient funds in wallet to buy rift ticket for ${userId}`));
          }
        })
        .then(() => RiftModule.addRiftTicketToUser(txPromise, tx, userId, 'soft'))
        .then(function (ticketId) {
          _chainState.ticketId = ticketId;
          const userCurrencyLogItem = {
            id: generatePushId(),
            user_id: userId,
            gold: -CONFIG.RIFT_TICKET_GOLD_PRICE,
            memo: `rift ticket ${ticketId}`,
            created_at: NOW_UTC_MOMENT.toDate(),
          };
          // the item above was built and then never passed to insert(). knex 0.19
          // treated an argument-less insert as a silent no-op, so the currency log
          // entry for this purchase was simply never written; knex 3 rejects it with
          // "The query is empty", which turned a missing audit row into a broken
          // purchase. Upstream had the same bug.
          return knex.insert(userCurrencyLogItem).into('user_currency_log').transacting(tx);
        })
        .then(() => DuelystFirebase.connect().getRootRef())

        .then(function (fbRootRef) {
          const updateWalletData = (walletData?) => {
            if (walletData == null) { walletData = {}; }
            walletData.gold_amount = _chainState.final_wallet_gold;
            walletData.updated_at = NOW_UTC_MOMENT.valueOf();
            return walletData;
          };

          return FirebasePromises.safeTransaction(fbRootRef.child('user-inventory').child(userId).child('wallet'), updateWalletData);
        })
        .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
        .then(tx.commit)
        .catch(tx.rollback);
    })

      .then(function () {
        Logger.module('RiftModule').log(`buyRiftTicketWithGold() -> User ${userId.blue}`.green + ` purchased ticket ${_chainState.ticketId}.`.green);

        return Promise.resolve(_chainState.ticketId);
      });

    // return the transaction promise
    return txPromise;
  }

  /**
   * Claims a users first free rift ticket if they have no tickets or rift runs
   * @public
   * @param  {String}    userId            User ID for which to buy a rift ticket.
   * @return  {Promise}    Promise that will post TICKET ID on completion.
   */
  static claimFirstFreeRiftTicket(userId) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if (!userId) {
      Logger.module('RiftModule').log(`claimFirstFreeRiftTicket() -> invalid user ID - ${userId}.`.red);
      return Promise.reject(new Error(`Can not claim free rift ticket : invalid user ID - ${userId}`));
    }

    const NOW_UTC_MOMENT = moment.utc();

    const this_obj: Record<string, any> = {};

    var txPromise = knex.transaction(function (tx) {
      Promise.all([
        tx('users').first('id').where('id', userId).forUpdate(),
        tx('user_rift_tickets').first().where('user_id', userId).forUpdate(),
        tx('user_rift_tickets_used').first().where('user_id', userId).forUpdate(), // This is redundant with runs but used for future proofing
        tx('user_rift_runs').first().where('user_id', userId).forUpdate(),
      ])
        .then(function ([userRow, ticketRow, usedTicketRow, existingRun]) {
        // Can not already have a ticket
          if (ticketRow != null) {
            Logger.module('RiftModule').log(`claimFirstFreeRiftTicket() -> user ID - ${userId} already has a ticket.`.red);
            return Promise.reject(new Error(`Can not claim free rift ticket : user ID - ${userId} already has a ticket`));
          }

          // Can not already have a used ticket
          if (usedTicketRow != null) {
            Logger.module('RiftModule').log(`claimFirstFreeRiftTicket() -> user ID - ${userId} already has a ticket.`.red);
            return Promise.reject(new Error(`Can not claim free rift ticket : user ID - ${userId} already has a used ticket`));
          }

          // Can not already have an active run
          if (existingRun != null) {
            Logger.module('RiftModule').log(`claimFirstFreeRiftTicket() -> user ID - ${userId} already has an active run.`.red);
            return Promise.reject(new Error(`Can not claim free rift ticket : user ID - ${userId} already has an active rift run`));
          }

          // If user passes the above tests they can have a free rift ticket
          return RiftModule.addRiftTicketToUser(txPromise, tx, userId, 'free');
        }).then(function (ticketId) {
          _chainState.ticketId = ticketId;
          return SyncModule._bumpUserTransactionCounter(tx, userId);
        })
        .then(tx.commit)
        .catch(tx.rollback);
    })
      .then(function () {
        Logger.module('RiftModule').debug(`claimFirstFreeRiftTicket() -> User ${userId.blue}`.green + ` claimed free first rift ticket ${_chainState.ticketId}.`.green);

        return Promise.resolve(_chainState.ticketId);
      });

    return txPromise;
  }

  /**
   * Add a rift ticket to a user's inventory for a specified transaction type.
   * @public
   * @param  {Promise}    trxPromise          Transaction promise that resolves if transaction succeeds.
   * @param  {Transaction}  trx              KNEX transaction to attach this operation to.
   * @param  {String}    userId            User ID for which to buy a rift ticket.
   * @param  {String}    transactionType        'soft','hard','gauntlet', or 'xp'.
   * @param  {String}    transactionId        the identifier for the transaction that caused this ticket to be added.
   * @return  {Promise}    Promise that will post TICKET ID on completion.
   */
  static addRiftTicketToUser(trxPromise, trx, userId, transactionType, transactionId = null) {
    // userId must be defined
    if (!userId) {
      Logger.module('RiftModule').log(`addRiftTicketToUser() -> invalid user ID - ${userId}.`.red);
      return Promise.reject(new Error(`Can not add rift ticket : invalid user ID - ${userId}`));
    }

    // userId must be defined
    if (!trx) {
      Logger.module('RiftModule').log(`addRiftTicketToUser() -> invalid trx - ${trx}.`.red);
      return Promise.reject(new Error('Can not add rift ticket : invalid transaction parameter'));
    }

    const ticketId = generatePushId();

    const NOW_UTC_MOMENT = moment.utc();

    // # when the transaction is done, update Firebase
    // trxPromise.then ()->
    //   return DuelystFirebase.connect().getRootRef()
    // .then (fbRootRef) ->
    //   tickets = fbRootRef.child("user-inventory").child(userId).child("gauntlet-tickets")
    //   data =
    //     created_at:NOW_UTC_MOMENT.valueOf()
    //     transaction_type:transactionType
    //   return FirebasePromises.set(tickets.child(ticketId),data)
    // .then ()->
    //   return Promise.resolve(ticketId)

    // return the insert statement and attach it to the transaction
    return knex.insert({
      id: ticketId,
      user_id: userId,
      transaction_type: transactionType,
      transaction_id: transactionId,
      created_at: NOW_UTC_MOMENT.toDate(),
    })
      .into('user_rift_tickets')
      .transacting(trx)
      .then(() => DuelystFirebase.connect().getRootRef())
      .then(function (fbRootRef) {
        const tickets = fbRootRef.child('user-inventory').child(userId).child('rift-tickets');
        const data = {
          created_at: NOW_UTC_MOMENT.valueOf(),
          transaction_type: transactionType,
        };
        return FirebasePromises.set(tickets.child(ticketId), data);
      })
      .then(function () {
        Logger.module('RiftModule').log(`addRiftTicketToUser() -> added ${ticketId} to user ${userId.blue}.`.green);
        return Promise.resolve(ticketId);
      });
  }

  /**
   * Start an rift run for a user.
   * @public
   * @param  {String}  userId    User ID
   * @param  {String}  ticketId  Rift ticket ID to use
   * @return  {Promise}        Promise that will return the rift data on completion.
   */
  static startRun(userId, ticketId) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if (!userId) {
      Logger.module('RiftModule').log(`startRun() -> ERROR: invalid user ID: ${userId}`.red);
      return Promise.reject(new Error(`invalid user ID: ${userId}`));
    }

    // ticketId must be defined
    if (!ticketId) {
      Logger.module('RiftModule').log(`startRun() -> ERROR: invalid ticket ID: ${ticketId}`.red);
      return Promise.reject(new Error(`invalid ticket ID: ${ticketId}`));
    }

    const NOW_UTC_MOMENT = moment.utc();

    const this_obj: Record<string, any> = {};

    var txPromise = knex.transaction(function (tx) {
      Promise.all([
        tx('users').first('rift_stored_upgrade_count').where('id', userId).forUpdate(),
        tx('user_rift_tickets').first().where('id', ticketId).forUpdate(),
        tx('user_rift_runs').first().where('user_id', userId).forUpdate(),
        tx('user_rift_run_stored_upgrades').select('id').where('user_id', userId).andWhere('assigned_ticket_id', null)
          .forUpdate(),
      ])
        .then(function ([userRow, ticketRow, existingRun, storedUpgradeRows]) {
          _chainState.ticketRow = ticketRow;
          _chainState.isFirstRun = false;
          if ((existingRun == null)) {
            _chainState.isFirstRun = true;
          }

          _chainState.storedUpgradeRows = storedUpgradeRows;

          if (ticketRow && ((ticketRow != null ? ticketRow.user_id : undefined) === userId)) {
            _chainState.ticketRow.used_at = NOW_UTC_MOMENT.toDate();

            _chainState.runData = {
              user_id: userId,
              ticket_id: ticketId,
              created_at: NOW_UTC_MOMENT.toDate(),
              deck: [],
            };

            if (_chainState.isFirstRun) {
              _chainState.runData.upgrades_available_count = RiftModule.RIFT_FIRST_RUN_FREE_UPGRADES;
            }

            // TODO: must make sure fb and db are updated with user total stored upgrades to 0

            if (_chainState.storedUpgradeRows != null) {
              _chainState.runData.stored_upgrades = _.map(_chainState.storedUpgradeRows, (row) => row.id);
            }

            return RiftModule._generateGeneralChoices(txPromise, tx, userId);
          } else {
            return Promise.reject(new Errors.NotFoundError('Could not start run: rift ticket not found.'));
          }
        }).then(function (generalCardChoices) {
          _chainState.runData.general_choices = generalCardChoices;
          delete _chainState.ticketRow.is_unread;
          return Promise.all([
            tx('user_rift_tickets').delete().where('id', ticketId),
            tx('user_rift_tickets_used').insert(_chainState.ticketRow),
            tx('user_rift_runs').insert(_chainState.runData),
            tx('users').where('id', userId).update({
              rift_stored_upgrade_count: 0,
            }),
          ]);
        })
        .then(function () {
          const storedUpgradeUpdatePromises = [];
          for (var row of Array.from<any>(_chainState.storedUpgradeRows)) {
            storedUpgradeUpdatePromises.push(tx('user_rift_run_stored_upgrades').where('id', row.id).update({
              assigned_ticket_id: ticketId,
            }),
            );
          }
          return Promise.all(storedUpgradeUpdatePromises);
        })
        .then(() => DuelystFirebase.connect().getRootRef())
        .then(function (fbRootRef) {
          _chainState.runData = DataAccessHelpers.restifyData(_chainState.runData);

          const allfbPromises = [];
          allfbPromises.push(FirebasePromises.remove(fbRootRef.child('user-inventory').child(userId).child('rift-tickets').child(ticketId)));
          allfbPromises.push(FirebasePromises.set(fbRootRef.child('user-rift-runs').child(userId).child(ticketId), _chainState.runData));
          allfbPromises.push(FirebasePromises.set(fbRootRef.child('users').child(userId).child('rift_stored_upgrade_count'), 0));

          return Promise.all(allfbPromises);
        })
        .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
        .then(tx.commit)
        .catch(tx.rollback);
    })
      .then(function () {
        Logger.module('RiftModule').log(`startRun() -> User ${userId.blue}`.green + ` started run ${_chainState.runData.ticket_id}.`.green);

        return Promise.resolve(_chainState.runData);
      });

    return txPromise;
  }

  /**
   * Choose a card for a user's rift run.
   * @public
   * @param  {String}  userId    User ID
   * @param  {String}  generalId  General ID
   * @return  {Promise}        Promise that will return the arena data on completion.
   */
  static chooseGeneral(userId, ticketId, generalId) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if (!userId) {
      Logger.module('RiftModule').log(`chooseGeneral() -> ERROR: invalid user ID: ${userId}`.red);
      return Promise.reject(new Error(`invalid user ID: ${userId}`));
    }

    // generalId must be defined
    if (!generalId) {
      Logger.module('RiftModule').log(`chooseGeneral() -> ERROR: invalid general ID: ${generalId}`.red);
      return Promise.reject(new Error(`invalid general ID: ${generalId}`));
    }

    const NOW_UTC_MOMENT = moment.utc();

    const this_obj: Record<string, any> = {};

    const txPromise = knex.transaction(function (tx) {
      tx('user_rift_runs').first().where('user_id', userId).andWhere('ticket_id', ticketId)
        .forUpdate()
        .then(function (existingRun) {
          if (existingRun != null) {
            if ((existingRun.general_choices != null) && !_.contains(existingRun.general_choices, generalId)) {
              throw new Errors.InvalidRequestError('Invalid general choice');
            }

            if (existingRun.general_id != null) {
              throw new Errors.InvalidRequestError('Rift run general selection already exists');
            }

            _chainState.runData = existingRun;
            _chainState.runData.updated_at = NOW_UTC_MOMENT.toDate();
            _chainState.runData.general_id = generalId;
            _chainState.runData.faction_id = SDK.CardFactory.cardForIdentifier(generalId, SDK.GameSession.current()).getFactionId();
            _chainState.runData.deck = _.map(SDK.FactionFactory.starterDeckForFactionLevel(_chainState.runData.faction_id, 12), (c) => c.id);
            _chainState.runData.deck.shift();
            _chainState.runData.deck.unshift(generalId);

            return tx('user_rift_runs').where('user_id', userId).andWhere('ticket_id', ticketId).update({
              updated_at: _chainState.runData.updated_at,
              general_id: _chainState.runData.general_id,
              faction_id: _chainState.runData.faction_id,
              deck: _chainState.runData.deck,
            });
          } else {
            return Promise.reject(new Errors.NotFoundError('Rift run not found.'));
          }
        })
        .then(() => DuelystFirebase.connect().getRootRef())

        .then(function (fbRootRef) {
          if (_chainState.runData.updated_at) { _chainState.runData.updated_at = moment.utc(_chainState.runData.updated_at).valueOf(); }

          const fbRiftUpdateData = {
            general_id: _chainState.runData.general_id,
            faction_id: _chainState.runData.faction_id,
            deck: _chainState.runData.deck,
          };

          return FirebasePromises.update(fbRootRef.child('user-rift-runs').child(userId).child(ticketId), fbRiftUpdateData);
        })
        .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
        .then(tx.commit)
        .catch(tx.rollback);
    })

      .then(function () {
        Logger.module('RiftModule').log(`chooseGeneral() -> User ${userId.blue}`.green + ` chose general ${generalId} for run ${_chainState.runData.ticket_id}.`.green);

        return Promise.resolve(_chainState.runData);
      });

    return txPromise;
  }

  /**
   * Update a user's current arena run based on the outcome of a game
   * @public
   * @param  {String}  userId      User ID for which to update.
   * @param  {String}  ticketId    Run Ticket ID
   * @param  {Boolean}  isWinner    Did the user win the game?
   * @param  {String}  gameId      Game unique ID
   * @param  {Boolean}  isDraw      Are we updating for a draw?
   * @return  {Promise}          Promise that will notify when complete.
   */
  static updateRiftRunWithGameOutcome(userId, ticketId, isWinner, gameId, isDraw, damageDealt, gameSessionData) {
    const _chainState: Record<string, any> = {};
    if ((gameSessionData != null) && (gameSessionData.aiPlayerId != null) && (gameSessionData.aiPlayerId === userId)) {
      // This was a bot, return gracefully
      return Promise.resolve();
    }

    // userId must be defined
    if (!userId) {
      Logger.module('RiftModule').log(`updateRiftRunWithGameOutcome() -> ERROR: invalid user ID: ${userId}`.red);
      return Promise.reject(new Error(`invalid user ID: ${userId}`));
    }

    // ticketId must be defined
    if (!ticketId) {
      Logger.module('RiftModule').log(`updateRiftRunWithGameOutcome() -> ERROR: invalid ticket ID: ${ticketId}`.red);
      return Promise.reject(new Error(`invalid ticket ID: ${ticketId}`));
    }

    // gameId must be defined
    if (!gameId) {
      Logger.module('RiftModule').log(`updateRiftRunWithGameOutcome() -> ERROR: invalid game ID: ${gameId}`.red);
      return Promise.reject(new Error(`invalid gameId ID: ${gameId}`));
    }

    // gameSessionData must be defined and have set up data
    if ((gameSessionData == null) || (gameSessionData.gameSetupData == null)) {
      Logger.module('RiftModule').log(`updateRiftRunWithGameOutcome() -> ERROR: invalid game data: ${gameSessionData}`.red);
      return Promise.reject(new Error(`invalid game data: ${gameSessionData}`));
    }

    Logger.module('RiftModule').debug(`updateRiftRunWithGameOutcome() -> user ${userId} ticket ${ticketId}`);

    const NOW_UTC_MOMENT = moment.utc();

    const this_obj: Record<string, any> = {};

    return knex.transaction((tx) => PromiseUtils.withTimeout(Promise.resolve(tx('users').first('id').where('id', userId).forUpdate())
      .then((userRow) => Promise.all([
        userRow,
        tx('user_rift_runs').first().where('user_id', userId).andWhere('ticket_id', ticketId)
          .forUpdate(),
      ])).then(function ([userRow, existingRun]) {
        if (existingRun != null) {
          const allPromises = [];
          _chainState.runData = existingRun;

          if (!existingRun.started_at) {
            existingRun.started_at = NOW_UTC_MOMENT.toDate();
          }

          if (_chainState.runData.rift_level == null) { _chainState.runData.rift_level = 1; }

          damageDealt = damageDealt || 0;
          let riftPointsEarned = Math.min(damageDealt, 25) || 0;
          if (isWinner) {
            riftPointsEarned += 10;
          }
          let upgradesEarned = 0;
          const riftLevelBefore = RiftHelper.levelForPoints(existingRun.rift_points);
          const riftLevelAfter = RiftHelper.levelForPoints(existingRun.rift_points + riftPointsEarned);
          if (riftLevelBefore < riftLevelAfter) {
            upgradesEarned = riftLevelAfter - riftLevelBefore;
          }

          _chainState.riftPointsEarned = riftPointsEarned;

          _chainState.runData.updated_at = NOW_UTC_MOMENT.toDate();
          if (_chainState.runData.games == null) { _chainState.runData.games = []; }
          if (_chainState.runData.rift_points == null) { _chainState.runData.rift_points = 0; }
          _chainState.runData.rift_points += _chainState.riftPointsEarned;
          if (_chainState.runData.upgrades_available_count == null) { _chainState.runData.upgrades_available_count = 0; }
          _chainState.runData.upgrades_available_count += upgradesEarned;
          if (_chainState.runData.rift_level == null) { _chainState.runData.rift_level = 1; }
          _chainState.runData.rift_level += upgradesEarned;

          // Rift rating
          let riftRatingBefore = _chainState.runData.rift_rating;
          if ((riftRatingBefore == null)) {
            riftRatingBefore = RiftModule.RIFT_DEFAULT_RATING;
          }

          let riftRatingDelta = 0;
          if (!isDraw) {
            const winnerUserId = UtilsGameSession.getWinningPlayerId(gameSessionData);
            const winnerRiftRating = __guard__(UtilsGameSession.getPlayerSetupDataForPlayerId(gameSessionData, winnerUserId), (x) => x.riftRating);
            const loserRiftRating = __guard__(UtilsGameSession.getPlayerSetupDataForPlayerId(gameSessionData, UtilsGameSession.getOpponentIdToPlayerId(gameSessionData, winnerUserId)), (x1) => x1.riftRating);

            riftRatingDelta = RiftModule._getRiftRatingDeltaForGameRiftRatings(winnerRiftRating, loserRiftRating);
            if (!isWinner) {
              riftRatingDelta = -1 * riftRatingDelta;
            }

            // Make sure that even if the enemy player is zeroing out on rating, this player still at least gets the minimum rating
            if (isWinner) {
              riftRatingDelta = Math.max(riftRatingDelta, RiftModule.RIFT_MIN_RATING_DELTA);
            }
          }

          _chainState.riftRatingDelta = riftRatingDelta;
          const riftRatingAfter = riftRatingBefore + riftRatingDelta;

          _chainState.runData.rift_rating = riftRatingAfter;

          if (isDraw) {
            _chainState.runData.draw_count += 1;
          } else if (isWinner) {
            _chainState.runData.win_count += 1;
          } else {
            _chainState.runData.loss_count += 1;
          }

          _chainState.runData.games.push(gameId);

          Logger.module('RiftModule').debug(`updateRiftRunWithGameOutcome() -> rift level: ${_chainState.runData.rift_level} points: ${_chainState.runData.rift_points} points earned: ${_chainState.riftPointsEarned}`);

          allPromises.push(tx('user_rift_runs').where('user_id', userId).andWhere('ticket_id', ticketId).update({
            loss_count: _chainState.runData.loss_count,
            win_count: _chainState.runData.win_count,
            draw_count: _chainState.runData.draw_count,
            games: _chainState.runData.games,
            updated_at: _chainState.runData.updated_at,
            rift_points: _chainState.runData.rift_points,
            upgrades_available_count: _chainState.runData.upgrades_available_count,
            started_at: _chainState.runData.started_at,
            rift_level: _chainState.runData.rift_level,
            rift_rating: _chainState.runData.rift_rating,
          }),
          );

          allPromises.push(tx('user_games').where('user_id', userId).andWhere('game_id', gameId).update({
            rift_ticket_id: _chainState.runData.ticket_id,
            rift_points: _chainState.runData.rift_points,
            rift_points_earned: _chainState.riftPointsEarned,
            rift_rating_after: _chainState.runData.rift_rating,
            rift_rating_earned: _chainState.riftRatingDelta,
          }),
          );

          return Promise.all(allPromises);
        } else {
          return Promise.reject(new Errors.NotFoundError('Rift run not found.'));
        }
      })
      .then(function () {
      // Update redis
        return RiftManager.updateUserRunRiftRating(userId, ticketId, _chainState.runData.rift_rating, NOW_UTC_MOMENT);
      })
      .then(() => DuelystFirebase.connect().getRootRef())
      .then(function (fbRootRef) {
        const allFbPromises = [];

        allFbPromises.push(FirebasePromises.update(fbRootRef.child('user-rift-runs').child(userId).child(ticketId), {
          loss_count: _chainState.runData.loss_count,
          win_count: _chainState.runData.win_count,
          draw_count: _chainState.runData.draw_count,
          rift_points: _chainState.runData.rift_points,
          upgrades_available_count: _chainState.runData.upgrades_available_count,
          rift_level: _chainState.runData.rift_level,
          rift_rating: _chainState.runData.rift_rating,
        }),
        );

        // update game record
        allFbPromises.push(FirebasePromises.set(fbRootRef.child('user-games').child(userId).child(gameId).child('rift_points'), _chainState.runData.rift_points));
        allFbPromises.push(FirebasePromises.set(fbRootRef.child('user-games').child(userId).child(gameId).child('rift_points_earned'), _chainState.riftPointsEarned));
        allFbPromises.push(FirebasePromises.set(fbRootRef.child('user-games').child(userId).child(gameId).child('rift_rating_after'), _chainState.runData.rift_rating));
        allFbPromises.push(FirebasePromises.set(fbRootRef.child('user-games').child(userId).child(gameId).child('rift_rating_earned'), _chainState.riftRatingDelta));

        return Promise.all(allFbPromises);
      })
      .then(() => SyncModule._bumpUserTransactionCounter(tx, userId)), 10000)
      .catch(onType(PromiseUtils.TimeoutError, function (e) {
        Logger.module('RiftModule').error(`updateArenaRunWithGameOutcome() -> ERROR, operation timeout for u:${userId} g:${gameId}`);
        throw e;
      })))
      .then(function () { return Promise.resolve(_chainState.runData); })
      .finally(() => GamesModule.markClientGameJobStatusAsComplete(userId, gameId, 'rift'));
  }

  /**
   * Get the arena deck for a user.
   * @public
   * @param  {String}  userId    User ID
   * @param  {String}  ticketId  Run Ticket ID
   * @return  {Promise}        Promise that will return the arena deck on completion or error out with a NoArenaDeckError.
   */
  static getRiftRunDeck(userId, ticketId) {
    // userId must be defined
    if (!userId) {
      Logger.module('RiftModule').log(`getArenaDeck() -> ERROR: invalid user ID: ${userId}`.red);
      return Promise.reject(new Error(`invalid user ID: ${userId}`));
    }

    return knex('user_rift_runs').first().where('user_id', userId).andWhere('ticket_id', ticketId)
      .then(function (run) {
        Logger.module('RiftModule').debug(`getRiftRunDeck() -> found deck for ${userId}: `, run != null ? run.deck : undefined);
        if (__guard__(run != null ? run.deck : undefined, (x) => x.length) > 0) {
        // copy deck
          const deck = run.deck.slice(0);
          return Promise.resolve(deck);
        } else {
          return Promise.reject(new Errors.NoArenaDeckError(`Could not load user ${userId} rift ${ticketId} deck.`));
        }
      });
  }

  /**
   * Gets a users Rift rating for the run with provided ticket id
   * @public
   * @param  {String}  userId    User ID
   * @param  {String}  ticketId  Run Ticket ID
   * @return  {Promise}        Promise that will resolve to the integer rift rating on completion.
   */
  static getRunRating(userId, ticketId) {
    // userId must be defined
    if (!userId) {
      Logger.module('RiftModule').log(`getRunRating() -> ERROR: invalid user ID: ${userId}`.red);
      return Promise.reject(new Error(`invalid user ID: ${userId}`));
    }

    // ticketId must be defined
    if (!ticketId) {
      Logger.module('RiftModule').log(`getRunRating() -> ERROR: invalid ticket ID: ${ticketId}`.red);
      return Promise.reject(new Error(`invalid ticket ID: ${ticketId}`));
    }

    return knex('user_rift_runs').first('rift_rating').where('user_id', userId).andWhere('ticket_id', ticketId)
      .then(function (runRow) {
        if (runRow != null) {
          if (runRow.rift_rating != null) {
            return runRow.rift_rating;
          } else {
            return RiftModule.RIFT_DEFAULT_RATING;
          }
        } else {
          return Promise.reject(new Errors.NotFoundError('Rift run not found.'));
        }
      });
  }

  /**
   * Get a matchmaking metric for the user's rift run.
   * @public
   * @param  {String}  userId    User ID
   * @param  {String}  ticketId  Run Ticket ID
   * @return  {Promise}        Promise that will resolve the integer metric on completion.
   */
  static getRunMatchmakingMetric(userId, ticketId) {
    // userId must be defined
    if (!userId) {
      Logger.module('RiftModule').log(`getRunMatchmakingMetric() -> ERROR: invalid user ID: ${userId}`.red);
      return Promise.reject(new Error(`invalid user ID: ${userId}`));
    }

    // ticketId must be defined
    if (!ticketId) {
      Logger.module('RiftModule').log(`getRunMatchmakingMetric() -> ERROR: invalid ticket ID: ${ticketId}`.red);
      return Promise.reject(new Error(`invalid ticket ID: ${ticketId}`));
    }

    return knex('user_rift_runs').first().where('user_id', userId).andWhere('ticket_id', ticketId)
      .then(function (run) {
        if (run) {
          let rating = run.rift_rating;
          if ((rating == null)) {
            rating = RiftModule.RIFT_DEFAULT_RATING;
          }

          // Clamp rating between 0 to 4000 for metric and map to 0-100
          const clampedRating = Math.max(Math.min(4000, rating), 0);
          const metric = clampedRating / 4000;
          return Promise.resolve(metric);
        } else {
          return Promise.reject(new Errors.NotFoundError('Rift run not found.'));
        }
      });
  }

  /**
   * Choose a card for a user's rift run.
   * @public
   * @param  {String}  userId    User ID
   * @param  {String}  cardId    Card ID
   * @return  {Promise}        Promise that will return the arena data on completion.
   */
  static chooseCardToUpgrade(userId, ticketId, cardId) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if (!userId) {
      Logger.module('RiftModule').log(`chooseCardToUpgrade() -> ERROR: invalid user ID: ${userId}`.red);
      return Promise.reject(new Error(`invalid user ID: ${userId}`));
    }

    // cardId must be defined
    if (!cardId) {
      Logger.module('RiftModule').log(`chooseCardToUpgrade() -> ERROR: invalid faction ID: ${cardId}`.red);
      return Promise.reject(new Error(`invalid card ID: ${cardId}`));
    }

    if (SDK.FactionFactory.cardIdIsGeneral(cardId)) {
      return Promise.reject(new Error('Can not upgrade your general'));
    }

    const NOW_UTC_MOMENT = moment.utc();

    const this_obj: Record<string, any> = {};

    var txPromise = knex.transaction(function (tx) {
      tx('user_rift_runs').first().where('user_id', userId).andWhere('ticket_id', ticketId)
        .forUpdate()
        .then(function (existingRun) {
          if (existingRun != null) {
            const hasStoredUpgrades = (existingRun.stored_upgrades != null) && (existingRun.stored_upgrades.length > 0);
            if (existingRun.upgrades_available_count == null) { existingRun.upgrades_available_count = 0; }

            if ((!existingRun.upgrades_available_count > 0) && !hasStoredUpgrades) {
              return Promise.reject(new Errors.BadRequestError('Rift run not can not be upgraded.'));
            }

            _chainState.runData = existingRun;
            _chainState.runData.updated_at = NOW_UTC_MOMENT.toDate();
            _chainState.runData.card_id_to_upgrade = cardId;

            let cardChoicesPromise = null;
            if (hasStoredUpgrades) {
              _chainState.storedUpgradeUsedId = _chainState.runData.stored_upgrades.pop();
              _chainState.runData.disable_storing_upgrade = true;
              cardChoicesPromise = tx('user_rift_run_stored_upgrades').first().where('user_id', userId).andWhere('id', _chainState.storedUpgradeUsedId)
                .then(function (storedUpgradeRow) {
                  if ((storedUpgradeRow == null) || (storedUpgradeRow.card_choices == null)) {
                    return Promise.reject(new Errors.BadRequestError(`Rift run stored upgrade ${_chainState.storedUpgradeUsedId} does not exist or belong to user ${userId}.`));
                  }
                  return Promise.resolve(storedUpgradeRow.card_choices);
                });
            } else {
            // User has selected a non final card, continue with selecting card choices
              _chainState.runData.upgrades_available_count -= 1;
              cardChoicesPromise = RiftModule._generateCardUpgradeChoices(txPromise, tx, userId, ticketId, _chainState.runData.faction_id, cardId);
            }

            return cardChoicesPromise
              .then(function (cardChoices) {
                _chainState.runData.card_choices = cardChoices;
                const allCardChoicePromises = [];
                allCardChoicePromises.push(tx('user_rift_runs').where('user_id', userId).andWhere('ticket_id', ticketId).update({
                  card_id_to_upgrade: _chainState.runData.card_id_to_upgrade,
                  updated_at: _chainState.runData.updated_at,
                  upgrades_available_count: _chainState.runData.upgrades_available_count,
                  card_choices: _chainState.runData.card_choices,
                  stored_upgrades: _chainState.runData.stored_upgrades,
                  disable_storing_upgrade: _chainState.runData.disable_storing_upgrade,
                }),
                );

                if (_chainState.storedUpgradeUsedId != null) {
                  allCardChoicePromises.push(tx('user_rift_run_stored_upgrades').where('id', _chainState.storedUpgradeUsedId).delete());
                }

                return Promise.all(allCardChoicePromises);
              });
          } else {
            return Promise.reject(new Errors.NotFoundError('Rift run not found.'));
          }
        })
        .then(() => DuelystFirebase.connect().getRootRef())

        .then(function (fbRootRef) {
          if (_chainState.runData.updated_at) { _chainState.runData.updated_at = moment.utc(_chainState.runData.updated_at).valueOf(); }

          const fbRiftUpdateData = {
            card_choices: _chainState.runData.card_choices,
            card_id_to_upgrade: _chainState.runData.card_id_to_upgrade,
            upgrades_available_count: _chainState.runData.upgrades_available_count,
            stored_upgrades: _chainState.runData.stored_upgrades,
          };

          return FirebasePromises.update(fbRootRef.child('user-rift-runs').child(userId).child(ticketId), fbRiftUpdateData);
        })
        .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
        .then(tx.commit)
        .catch(tx.rollback);
    })

      .then(function () {
        Logger.module('RiftModule').log(`chooseCardToUpgrade() -> User ${userId.blue}`.green + ` chose card ${cardId} for upgrade in run ${_chainState.runData.ticket_id}.`.green);

        return Promise.resolve(_chainState.runData);
      });

    return txPromise;
  }

  /**
   * Returns the
   * @public
   * @param  {Integer}  winnerRiftRating    Rift rating of winner
   * @param  {Integer}  loserRiftRating      Rift rating of loser
   * @return  {Integer}  The delta for rift rating after match
   */
  static _getRiftRatingDeltaForGameRiftRatings(winnerRiftRating?, loserRiftRating?) {
    if ((winnerRiftRating == null)) {
      winnerRiftRating = RiftModule.RIFT_DEFAULT_RATING;
    }
    if ((loserRiftRating == null)) {
      loserRiftRating = RiftModule.RIFT_DEFAULT_RATING;
    }

    const ratingAlphaDivisor = RiftModule.RIFT_RATING_DIFFERENCE_FOR_MIN_RATING_GAIN - RiftModule.RIFT_RATING_DIFFERENCE_FOR_MAX_RATING_GAIN;
    let ratingAlphaQuotient = (winnerRiftRating - loserRiftRating);
    ratingAlphaQuotient = Math.max(ratingAlphaQuotient, RiftModule.RIFT_RATING_DIFFERENCE_FOR_MAX_RATING_GAIN);
    ratingAlphaQuotient = Math.min(ratingAlphaQuotient, RiftModule.RIFT_RATING_DIFFERENCE_FOR_MIN_RATING_GAIN);
    ratingAlphaQuotient -= RiftModule.RIFT_RATING_DIFFERENCE_FOR_MAX_RATING_GAIN;

    const ratingAlpha = 1.0 - (ratingAlphaQuotient / ratingAlphaDivisor);

    let ratingDelta = RiftModule.RIFT_MIN_RATING_DELTA + ((RiftModule.RIFT_MAX_RATING_DELTA - RiftModule.RIFT_MIN_RATING_DELTA) * ratingAlpha);
    ratingDelta = Math.floor(ratingDelta);

    // Prevent delta from ever taking loser below 0
    if ((loserRiftRating - ratingDelta) < 0) {
      ratingDelta = loserRiftRating;
    }

    return ratingDelta;
  }

  /**
   * Upgrade a card for a user's rift run.
   * @public
   * @param  {String}  userId    User ID
   * @param  {String}  cardId    Card ID to upgrade
   * @return  {Promise}        Promise that will return the arena data on completion.
   */
  static upgradeCard(userId, ticketId, cardId) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if (!userId) {
      Logger.module('RiftModule').log(`upgradeCard() -> ERROR: invalid user ID: ${userId}`.red);
      return Promise.reject(new Error(`invalid user ID: ${userId}`));
    }

    // cardId must be defined
    if (!cardId) {
      Logger.module('RiftModule').log(`upgradeCard() -> ERROR: invalid card ID: ${cardId}`.red);
      return Promise.reject(new Error(`invalid card ID: ${cardId}`));
    }

    const NOW_UTC_MOMENT = moment.utc();

    const this_obj: Record<string, any> = {};

    const txPromise = knex.transaction(function (tx) {
      tx('user_rift_runs').first().where('user_id', userId).andWhere('ticket_id', ticketId)
        .forUpdate()
        .then(function (existingRun) {
          if (existingRun != null) {
            if (!existingRun.card_choices) {
              throw new Errors.BadRequestError('Invalid card choices for current run'); // Where the error occurs
            }

            if (!existingRun.card_id_to_upgrade) {
              throw new Errors.BadRequestError('No card selected to upgrade'); // Where the error occurs
            }

            if ((existingRun.card_choices != null) && !_.contains(existingRun.card_choices, cardId)) {
              throw new Errors.BadRequestError('Invalid card choice');
            }

            const indexOfCardToUpgrade = existingRun.deck.indexOf(existingRun.card_id_to_upgrade);

            _chainState.runData = existingRun;
            _chainState.runData.updated_at = NOW_UTC_MOMENT.toDate();
            _chainState.runData.card_id_to_upgrade = null;
            _chainState.runData.card_choices = null;
            _chainState.runData.disable_storing_upgrade = null;
            _chainState.runData.deck.splice(indexOfCardToUpgrade, 1);
            _chainState.runData.deck.push(cardId);
            _chainState.runData.current_upgrade_reroll_count = 0;

            return tx('user_rift_runs').where('user_id', userId).andWhere('ticket_id', ticketId).update({
              deck: _chainState.runData.deck,
              card_id_to_upgrade: _chainState.runData.card_id_to_upgrade,
              card_choices: _chainState.runData.card_choices,
              disable_storing_upgrade: _chainState.runData.disable_storing_upgrade,
              updated_at: _chainState.runData.updated_at,
              current_upgrade_reroll_count: _chainState.runData.current_upgrade_reroll_count,
            });
          } else {
            return Promise.reject(new Errors.NotFoundError('Rift run not found.'));
          }
        })
        .then(() => DuelystFirebase.connect().getRootRef())

        .then(function (fbRootRef) {
          if (_chainState.runData.updated_at) { _chainState.runData.updated_at = moment.utc(_chainState.runData.updated_at).valueOf(); }

          const fbRiftUpdateData = {
            deck: _chainState.runData.deck,
            card_id_to_upgrade: null,
            card_choices: null,
            current_upgrade_reroll_count: _chainState.runData.current_upgrade_reroll_count,
          };

          return FirebasePromises.update(fbRootRef.child('user-rift-runs').child(userId).child(ticketId), fbRiftUpdateData);
        })
        .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
        .then(tx.commit)
        .catch(tx.rollback);
    })

      .then(function () {
        Logger.module('RiftModule').log(`upgradeCard() -> User ${userId.blue}`.green + ` chose card ${cardId} as upgrade for run ${_chainState.runData.ticket_id}.`.green);

        return Promise.resolve(_chainState.runData);
      });

    return txPromise;
  }

  /**
   * Generate a 3 card set for a specific faction and round.
   * @private
   * @param  {Promise}    txPromise     KNEX transaction promise
   * @param  {Transaction}  tx         KNEX transaction to attach this operation to.
   * @param  {String}    userId      User ID for which to generate cards.
   * @param  {Integer}    cardId      Card ID being upgraded
   * @param  {Integer}    riftLevel    Current rift level (number of upgrades so far)
   * @return  {Promise}            Promise that resolves with an array of card IDs.
   */
  static _generateCardUpgradeChoices(txPromise, tx, userId, ticketId, factionId, cardId, riftLevel) {
    Logger.module('RiftModule').debug(`_generateCardUpgradeChoices() -> User ${userId.blue} generating choices for ${factionId} for ticket ${ticketId}`);

    // card ids to return
    const cardIds = [];

    const random = Math.random();
    const rarities = null;

    // inline function for generating a random card from a specific set
    const randomCardFromCollectionWithoutDupes = function (cardsArray, notInCardsList, prismaticChance?, maxIterations?) {
      if (prismaticChance == null) { prismaticChance = 0.0; }
      if (maxIterations == null) { maxIterations = 50; }
      cardId = null;
      let failsafe_counter = 0;
      while ((cardId === null) || _.contains(notInCardsList, cardId)) {
        var randomIndex = Math.floor(Math.random() * (cardsArray.length));
        cardId = SDK.Cards.getBaseCardId(cardsArray[randomIndex]);
        failsafe_counter++;
        if (failsafe_counter > maxIterations) {
          break;
        }
      }
      Logger.module('RiftModule').debug(`_generateCardChoices() -> card: ${cardId}`);
      return cardId;
    };

    // inline function for picking a random card set
    const randomCardSet = function (rarityId, factionId, excludeNeutralBloodborn, excludeUnity) {
      if (excludeNeutralBloodborn == null) { excludeNeutralBloodborn = false; }
      if (excludeNeutralBloodborn == null) { excludeNeutralBloodborn = false; }
      const cardSetChoices = [
        SDK.CardSet.Core,
        SDK.CardSet.Core,
        SDK.CardSet.Core,
        SDK.CardSet.Core,
        SDK.CardSet.Shimzar,
        SDK.CardSet.Shimzar,
        SDK.CardSet.Shimzar,
      ];
      factionId === SDK.Factions.Neutral;
      const excludeBloodbornForEpicNeutralFlag = ((rarityId === SDK.Rarity.Epic) && (factionId === SDK.Factions.Neutral));
      const excludeNeutralBloodbornFlag = ((factionId === SDK.Factions.Neutral) && excludeNeutralBloodborn);
      if (!excludeBloodbornForEpicNeutralFlag && !excludeNeutralBloodbornFlag) {
        cardSetChoices.push(SDK.CardSet.Bloodborn);
        cardSetChoices.push(SDK.CardSet.Bloodborn);
      }

      let includeUnitySet = true;
      includeUnitySet = includeUnitySet && (!excludeUnity);
      includeUnitySet = includeUnitySet && !((rarityId === SDK.Rarity.Epic) && (factionId === SDK.Factions.Neutral));
      if (includeUnitySet) {
        cardSetChoices.push(SDK.CardSet.Unity);
        cardSetChoices.push(SDK.CardSet.Unity);
      }

      const cs = _.sample(cardSetChoices);
      Logger.module('RiftModule').debug(`_generateCardChoices() -> card set: ${cs}`);
      return cs;
    };

    const randomFaction = function () {
      const factions = _.map(SDK.FactionFactory.getAllEnabledFactions(), (f) => f.id);

      factions.push(factionId);
      factions.push(factionId);
      factions.push(factionId);
      factions.push(factionId);
      factions.push(factionId);

      factions.push(SDK.Factions.Neutral);
      factions.push(SDK.Factions.Neutral);
      factions.push(SDK.Factions.Neutral);
      factions.push(SDK.Factions.Neutral);
      factions.push(SDK.Factions.Neutral);

      const fId = _.sample(factions);
      Logger.module('RiftModule').debug(`_generateCardChoices() -> faction ${fId} of factions:`, factions);
      return fId;
    };

    // fill slot 1 to 2
    let randomFactionId = randomFaction();
    cardIds.push(randomCardFromCollectionWithoutDupes(SDK.GameSession.getCardCaches().getCardSet(randomCardSet(SDK.Rarity.Common, randomFactionId)).getFaction(randomFactionId).getRarity(SDK.Rarity.Common)
      .getIsPrismatic(false)
      .getIsGeneral(false)
      .getIsHiddenInCollection(false)
      .getCardIds(), cardIds, 0.04, 50));
    randomFactionId = randomFaction();
    cardIds.push(randomCardFromCollectionWithoutDupes(SDK.GameSession.getCardCaches().getCardSet(randomCardSet(SDK.Rarity.Common, randomFactionId, true, true)).getFaction(randomFactionId).getRarity(SDK.Rarity.Common)
      .getIsPrismatic(false)
      .getIsGeneral(false)
      .getIsHiddenInCollection(false)
      .getCardIds(), cardIds, 0.04, 50));
    randomFactionId = randomFaction();
    cardIds.push(randomCardFromCollectionWithoutDupes(SDK.GameSession.getCardCaches().getCardSet(randomCardSet(SDK.Rarity.Rare, randomFactionId)).getFaction(randomFactionId).getRarity(SDK.Rarity.Rare)
      .getIsPrismatic(false)
      .getIsGeneral(false)
      .getIsHiddenInCollection(false)
      .getCardIds(), cardIds, 0.04, 50));
    randomFactionId = randomFaction();
    cardIds.push(randomCardFromCollectionWithoutDupes(SDK.GameSession.getCardCaches().getCardSet(randomCardSet(SDK.Rarity.Rare, randomFactionId, true, true)).getFaction(randomFactionId).getRarity(SDK.Rarity.Rare)
      .getIsPrismatic(false)
      .getIsGeneral(false)
      .getIsHiddenInCollection(false)
      .getCardIds(), cardIds, 0.04, 50));
    randomFactionId = randomFaction();
    cardIds.push(randomCardFromCollectionWithoutDupes(SDK.GameSession.getCardCaches().getCardSet(randomCardSet(SDK.Rarity.Epic, randomFactionId)).getFaction(randomFactionId).getRarity(SDK.Rarity.Epic)
      .getIsPrismatic(false)
      .getIsGeneral(false)
      .getIsHiddenInCollection(false)
      .getCardIds(), cardIds, 0.04, 50));
    randomFactionId = randomFaction();
    cardIds.push(randomCardFromCollectionWithoutDupes(SDK.GameSession.getCardCaches().getCardSet(randomCardSet(SDK.Rarity.Legendary, randomFactionId)).getFaction(randomFactionId).getRarity(SDK.Rarity.Legendary)
      .getIsPrismatic(false)
      .getIsGeneral(false)
      .getIsHiddenInCollection(false)
      .getCardIds(), cardIds, 0.04, 50));

    Logger.module('RiftModule').debug('_generateCardChoices() -> cardIds:', cardIds);

    return RiftModule._getSkinnedCardChoices(txPromise, tx, userId, cardIds)
      .then((skinnedCardIds) => RiftModule._getPrismaticCardChoices(txPromise, tx, userId, skinnedCardIds));
  }

  /**
   * Checks if a run needs the card choices to be rerolled due to dupes, and
   * if there are dupes it will reroll the card choices
   * @public
   * @param  {Object}  riftRunRow    sql row of the run to be sanitized
   * @return  {Promise}        Promise that will resolve to the new (or same if not changed) rift run row data
   */
  static sanitizeRunCardChoicesIfNeeded(riftRunRow, systemTime?) {
    const _chainState: Record<string, any> = {};
    const NOW_UTC_MOMENT = systemTime || moment.utc();

    //    testRunsLastUpdateBeforeMoment = moment.utc("2017-04-29 12:00")

    if ((riftRunRow.card_choices == null)) {
      // No card choices, no need to sanitize
      return Promise.resolve(riftRunRow);
    }

    // TODO: This can be done for performance but it might open edge cases without much gain
    //    runUpdatedAtMoment = moment.utc(riftRunRow.updated_at)
    //    if testRunsLastUpdateBeforeMoment.isBefore(runUpdatedAtMoment)
    //      # Last
    //      return Promise.resolve(riftRunRow)

    if (riftRunRow.card_choices.length === _.unique(riftRunRow.card_choices).length) {
      // There are no dupes in card choices, no need to sanitize
      return Promise.resolve(riftRunRow);
    }

    _chainState.riftRunData = riftRunRow;
    _chainState.userId = riftRunRow.user_id;
    _chainState.ticketId = riftRunRow.ticket_id;
    _chainState.factionId = riftRunRow.faction_id;
    _chainState.cardIdToUpgrade = riftRunRow.card_id_to_upgrade;
    _chainState.riftLevel = riftRunRow.rift_level;

    var txPromise = knex.transaction((tx) => tx('users').first('id').where('id', _chainState.userId).forUpdate()
      .then(function () {
        return RiftModule._generateCardUpgradeChoices(txPromise, tx, _chainState.userId, _chainState.ticketId, _chainState.factionId, _chainState.cardIdToUpgrade, _chainState.riftLevel);
      })
      .then(function (cardChoices) {
        _chainState.riftRunData.card_choices = cardChoices;
        _chainState.riftRunData.updated_at = NOW_UTC_MOMENT.toDate();
        return tx('user_rift_runs').where('ticket_id', _chainState.ticketId).andWhere('user_id', _chainState.userId).update({
          card_choices: _chainState.riftRunData.card_choices,
          updated_at: _chainState.riftRunData.updated_at,
        });
      })
      .then(function () {
        return Promise.resolve(_chainState.riftRunData);
      }));
    return txPromise;
  }

  /**
   * Stores a user rift run's current upgrade for next rift run started
   * @public
   * @param  {String}  userId    User ID
   * @param  {String}  riftTicketId    Rift ticket id
   * @return  {Promise}        Promise that will return the arena data on completion.
   */
  static storeCurrentUpgrade(userId, riftTicketId) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if (!userId) {
      Logger.module('RiftModule').log(`storeCurrentUpgrade() -> ERROR: invalid user ID: ${userId}`.red);
      return Promise.reject(new Error(`invalid user ID: ${userId}`));
    }

    // cardId must be defined
    if (!riftTicketId) {
      Logger.module('RiftModule').log(`storeCurrentUpgrade() -> ERROR: invalid rift ID: ${riftTicketId}`.red);
      return Promise.reject(new Error(`invalid card ID: ${riftTicketId}`));
    }

    const NOW_UTC_MOMENT = moment.utc();

    const this_obj: Record<string, any> = {};

    const txPromise = knex.transaction((tx) => Promise.all([
      tx('users').first('rift_stored_upgrade_count').where('id', userId).forUpdate(),
      tx('user_rift_runs').first().where('user_id', userId).andWhere('ticket_id', riftTicketId)
        .forUpdate(),
    ])
      .then(function ([userRow, existingRun]) {
        if ((userRow == null)) {
          throw new Errors.BadRequestError(`User id not found: ${userId}`);
        }

        if ((userRow.rift_stored_upgrade_count != null) && (userRow.rift_stored_upgrade_count >= RiftModule.RIFT_MAX_STORED_UPGRADES)) {
          throw new Errors.MaxRiftUpgradesReachedError(`User ${userId} already has max rift upgrades stored`);
        }

        _chainState.userRow = userRow;

        // TODO: check this works as intended
        if (_chainState.userRow.rift_stored_upgrade_count == null) { _chainState.userRow.rift_stored_upgrade_count = 0; }

        if (existingRun != null) {
          const allPromises = [];

          if ((existingRun.card_choices == null)) {
            throw new Errors.BadRequestError('No card choices to store');
          }

          if (existingRun.disable_storing_upgrade === true) {
            throw new Errors.BadRequestError(`User ${userId} can not store current upgrade for rift run ${riftTicketId}`);
          }

          _chainState.storedCardChoices = existingRun.card_choices;

          _chainState.runData = existingRun;
          _chainState.runData.card_id_to_upgrade = null;
          _chainState.runData.card_choices = null;
          _chainState.runData.updated_at = NOW_UTC_MOMENT.toDate();

          allPromises.push(tx('user_rift_runs').where('user_id', userId).andWhere('ticket_id', riftTicketId).update({
            card_id_to_upgrade: _chainState.runData.card_id_to_upgrade,
            card_choices: _chainState.runData.card_choices,
            updated_at: _chainState.runData.updated_at,
          }),
          );

          allPromises.push(tx('users').where('id', userId).update({
            rift_stored_upgrade_count: _chainState.userRow.rift_stored_upgrade_count + 1,
          }),
          );

          allPromises.push(tx('user_rift_run_stored_upgrades').insert({
            id: generatePushId(),
            user_id: userId,
            source_ticket_id: riftTicketId,
            created_at: NOW_UTC_MOMENT.toDate(),
            updated_at: NOW_UTC_MOMENT.toDate(),
            card_choices: _chainState.storedCardChoices,
          }),
          );

          return Promise.all(allPromises);
        } else {
          return Promise.reject(new Errors.NotFoundError('Rift run not found.'));
        }
      }).then(() => DuelystFirebase.connect().getRootRef())

      .then(function (fbRootRef) {
        const allFbPromises = [];

        if (_chainState.runData.updated_at) { _chainState.runData.updated_at = moment.utc(_chainState.runData.updated_at).valueOf(); }

        const fbRiftUpdateData = {
          deck: _chainState.runData.deck,
          card_id_to_upgrade: null,
          card_choices: null,
        };

        const fbUserUpdateData = {
          rift_stored_upgrade_count: _chainState.userRow.rift_stored_upgrade_count + 1,
        };

        allFbPromises.push(FirebasePromises.update(fbRootRef.child('user-rift-runs').child(userId).child(riftTicketId), fbRiftUpdateData));
        allFbPromises.push(FirebasePromises.update(fbRootRef.child('users').child(userId), fbUserUpdateData));

        return Promise.all(allFbPromises);
      })
      .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
      .then(tx.commit)
      .catch(tx.rollback))

      .then(function () {
        Logger.module('RiftModule').log(`storeCurrentUpgrade() -> User ${userId.blue}`.green + ` store upgrade for run ${_chainState.runData.ticket_id}.`.green);

        return Promise.resolve(_chainState.runData);
      });

    return txPromise;
  }

  /**
   * Reroll's a user rift run's current upgrades for a spirit cost
   * @public
   * @param  {String}  userId    User ID
   * @param  {String}  riftTicketId    Rift ticket id
   * @return  {Promise}        Promise that will return the arena data on completion.
   */
  static rerollCurrentUpgrade(userId, riftTicketId) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if (!userId) {
      Logger.module('RiftModule').log(`rerollCurrentUpgrade() -> ERROR: invalid user ID: ${userId}`.red);
      return Promise.reject(new Error(`invalid user ID: ${userId}`));
    }

    // cardId must be defined
    if (!riftTicketId) {
      Logger.module('RiftModule').log(`rerollCurrentUpgrade() -> ERROR: invalid rift ID: ${riftTicketId}`.red);
      return Promise.reject(new Error(`invalid card ID: ${riftTicketId}`));
    }

    const NOW_UTC_MOMENT = moment.utc();

    const this_obj: Record<string, any> = {};

    var txPromise = knex.transaction((tx) => Promise.all([
      tx('users').first('wallet_spirit').where('id', userId).forUpdate(),
      tx('user_rift_runs').first().where('user_id', userId).andWhere('ticket_id', riftTicketId)
        .forUpdate(),
    ])
      .then(function ([userRow, existingRun]) {
        if ((userRow == null)) {
          throw new Errors.BadRequestError(`User id not found: ${userId}`);
        }

        _chainState.userRow = userRow;

        if (existingRun != null) {
          _chainState.runData = existingRun;

          // Defaults
          _chainState.currentRerollCount = _chainState.runData.current_upgrade_reroll_count || 0;
          _chainState.totalRerollCount = _chainState.runData.total_reroll_count || 0;
          _chainState.userSpirit = _chainState.userRow.wallet_spirit || 0;

          // Updated run data
          _chainState.runData.total_reroll_count = _chainState.totalRerollCount + 1;
          _chainState.runData.current_upgrade_reroll_count = _chainState.currentRerollCount + 1;
          _chainState.runData.updated_at = NOW_UTC_MOMENT.toDate();

          _chainState.rerollSpiritCost = RiftHelper.spiritCostForNextReroll(_chainState.currentRerollCount, _chainState.totalRerollCount);
          if (_chainState.userSpirit < _chainState.rerollSpiritCost) {
            Logger.module('RiftModule').log(`rerollCurrentUpgrade() -> Cannot reroll current upgrade because user ${userId.blue} has insufficient funds`.red);
            return Promise.reject(new Errors.InsufficientFundsError(`Insufficient funds in wallet to reroll current rift upgrade ${userId}`));
          }

          if ((existingRun.card_choices == null)) {
            throw new Errors.BadRequestError('No card choices to upgrade');
          }

          return RiftModule._generateCardUpgradeChoices(txPromise, tx, userId, riftTicketId, existingRun.faction_id, existingRun.card_id_to_upgrade, existingRun.rift_level);
        } else {
          return Promise.reject(new Errors.NotFoundError('Rift run not found.'));
        }
      }).then(function (cardChoices) {
        const allPromises = [];

        _chainState.newCardChoices = cardChoices;

        _chainState.runData.card_choices = _chainState.newCardChoices;

        allPromises.push(tx('user_rift_runs').where('user_id', userId).andWhere('ticket_id', riftTicketId).update({
          card_choices: _chainState.runData.card_choices,
          total_reroll_count: _chainState.runData.total_reroll_count,
          current_upgrade_reroll_count: _chainState.runData.current_upgrade_reroll_count,
          updated_at: _chainState.runData.updated_at,
        }),
        );

        allPromises.push(InventoryModule.debitSpiritFromUser(txPromise, tx, userId, -1 * _chainState.rerollSpiritCost, 'rift reroll', `${riftTicketId}:${_chainState.totalRerollCount}`));

        return Promise.all(allPromises);
      })
      .then(() => DuelystFirebase.connect().getRootRef())

      .then(function (fbRootRef) {
        const allFbPromises = [];

        if (_chainState.runData.updated_at) { _chainState.runData.updated_at = moment.utc(_chainState.runData.updated_at).valueOf(); }

        const fbRiftUpdateData = {
          card_choices: _chainState.runData.card_choices,
          total_reroll_count: _chainState.runData.total_reroll_count,
          current_upgrade_reroll_count: _chainState.runData.current_upgrade_reroll_count,
        };

        allFbPromises.push(FirebasePromises.update(fbRootRef.child('user-rift-runs').child(userId).child(riftTicketId), fbRiftUpdateData));

        return Promise.all(allFbPromises);
      })
      .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
      .then(tx.commit)
      .catch(tx.rollback))

      .then(function () {
        Logger.module('RiftModule').debug(`rerollCurrentUpgrade() -> User ${userId.blue}`.green + ` rerolled upgrade for run ${_chainState.runData.ticket_id}.`.green);

        return Promise.resolve(_chainState.runData);
      });

    return txPromise;
  }

  /**
   * Generate a general set for a specific faction .
   * @private
   * @param  {Promise}  txPromise KNEX transaction promise
   * @param  {Transaction}  tx KNEX transaction to attach this operation to.
   * @param  {String}  userId    User ID for which to generate cards.
   * @param  {Integer}  factionId    Faction ID for which to generate generals.
   * @return  {Promise}            Promise that resolves with an array of card IDs.
   */
  static _generateGeneralChoices(txPromise, tx, userId) {
    let generalIds = _.map(SDK.FactionFactory.getAllPlayableFactions(), (f) => (f.generalIds != null ? f.generalIds.slice(0) : undefined) || []);
    generalIds = _.flatten(generalIds);
    generalIds = _.sample(generalIds, 4);

    return RiftModule._getSkinnedCardChoices(txPromise, tx, userId, generalIds)
      .then((skinnedGeneralIds) => RiftModule._getPrismaticCardChoices(txPromise, tx, userId, skinnedGeneralIds));
  }

  /**
   * Get skinned versions of a list of card choices for gauntlet. Picks at random from the skins the user owns for each card.
   * @private
   * @param  {Promise}  txPromise KNEX transaction promise
   * @param  {Transaction}  tx KNEX transaction to attach this operation to.
   * @param  {String}  userId
   * @param   {Array} cardIds
   * @return  {Promise} Promise that resolves with an array of skinned card IDs
   */
  static _getSkinnedCardChoices(txPromise, tx, userId, cardIds) {
    return new Promise(function (resolve, reject) {
      const cardIdsOut = [];

      return PromiseUtils.map(cardIds, (cardId) => RiftModule._getSkinnedCardChoice(txPromise, tx, userId, cardId)
        .then((skinnedCardId) => cardIdsOut.push(skinnedCardId))).then(() => resolve(cardIdsOut)).catch((error) => reject(error));
    });
  }

  /**
   * Get a skinned version of a card choice for gauntlet. Picks at random from the skins the user owns for a card.
   * @private
   * @param  {Promise}  txPromise KNEX transaction promise
   * @param  {Transaction}  tx KNEX transaction to attach this operation to.
   * @param  {String}  userId
   * @param   {Number} cardId
   * @return  {Promise} promise that resolves with a skinned card ID
   */
  static _getSkinnedCardChoice(txPromise, tx, userId, cardId) {
    const cardSkinIds = SDK.CosmeticsFactory.cardSkinIdsForCard(cardId);
    if (cardSkinIds.length === 0) {
      return Promise.resolve(cardId);
    } else {
      return InventoryModule.filterUsableCosmetics(txPromise, tx, userId, cardSkinIds, SDK.CosmeticsTypeLookup.CardSkin)
        .then(function (usableSkinIds) {
          if (usableSkinIds.length <= 0) {
            return cardId;
          } else {
            return SDK.Cards.getCardIdForCardSkinId(usableSkinIds[Math.floor(Math.random() * usableSkinIds.length)]);
          }
        });
    }
  }

  /**
   * Get a prismatic versions of a list of card choices for gauntlet.
   * @private
   * @param  {Promise}  txPromise KNEX transaction promise
   * @param  {Transaction}  tx KNEX transaction to attach this operation to.
   * @param {String} userId
   * @param {Number} cardId
   * @return  {Promise} Promise that resolves with an array of prismatic card IDs
   */
  static _getPrismaticCardChoices(txPromise, tx, userId, cardIds) {
    return Promise.resolve(cardIds);

    // DISABLED: prismatics in gauntlet for server performance
    /*
    return new Promise (resolve, reject) ->
      cardIdsOut = cardIds.slice(0)

      * replace card id in the output with usable prismatic card ids
      * base the chance to get a prismatic on how many copies the user has
      Promise.map cardIds, (cardId) ->
        baseCardId = SDK.Cards.getBaseCardId(cardId)
        return tx("user_cards").where('user_id', userId).andWhere('card_id', SDK.Cards.getPrismaticCardId(baseCardId)).first()
        .then (cardRow) ->
          if cardRow?
            if SDK.FactionFactory.cardIdIsGeneral(baseCardId)
              prismaticChance = 1.0
            else
              prismaticChance = Math.min(1.0, cardRow.count / CONFIG.MAX_DECK_DUPLICATES)
            if Math.random() < prismaticChance
              prismaticCardId = SDK.Cards.getPrismaticCardId(cardId)
              for cardIdOut, index in cardIdsOut by -1
                if baseCardId == SDK.Cards.getBaseCardId(cardIdOut)
                  cardIdsOut.splice(index, 1, prismaticCardId)
      .then () ->
        resolve(cardIdsOut)
      .catch (error) ->
        reject(error)
    */
  }
}

module.exports = RiftModule;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
