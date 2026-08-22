/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
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
const CosmeticChestsModule = require('./cosmetic_chests');
const GamesModule = require('./games');
const CONFIG = require('../../../app/common/config');
const Errors = require('../custom_errors');
const knex = require('./knex');
const config = require('../../../config/config.js');
const generatePushId = require('../../../app/common/generate_push_id');

// SDK imports
const SDK = require('@duelyst/sdk');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const PromiseUtils = require('../../../app/common/utils/utils_promise');
const { onType } = require('../../../app/common/utils/utils_promise');

class GauntletModule {
  declare static rewardMap: any;
  declare static _GAUNTLET_SPIRIT_ORB_REWARD_SETS: any;

  static GAUNTLET_TICKET_GOLD_PRICE = 0;
  static GAUNTLET_MAX_WINS = 12;

  /**
   * Use soft currency (gold) to buy an arena ticket for a user.
   * @public
   * @param  {String}  userId    User ID for which to buy an arena ticket.
   * @return  {Promise}        Promise that will post ARENA TICKET ID on completion.
   */
  static buyArenaTicketWithGold(userId) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if (!userId) {
      Logger.module('GauntletModule').debug(
        `buyArenaTicketWithGold() -> invalid user ID - ${userId}.`.red,
      );
      return Promise.reject(
        new Error(`Can not buy arena ticket with gold : invalid user ID - ${userId}`),
      );
    }

    const NOW_UTC_MOMENT = moment.utc();

    var txPromise = knex
      .transaction(function (tx) {
        knex
          .first()
          .from('users')
          .where('id', userId)
          .transacting(tx)
          .forUpdate()
          .then(function (userRow) {
            // if the user has enough gold
            if (userRow.wallet_gold >= GauntletModule.GAUNTLET_TICKET_GOLD_PRICE) {
              // calculate final gold
              const final_wallet_gold = (_chainState.final_wallet_gold =
                userRow.wallet_gold - GauntletModule.GAUNTLET_TICKET_GOLD_PRICE);

              // setup what to update the user params with
              const userUpdateParams = {
                wallet_gold: final_wallet_gold,
                wallet_updated_at: NOW_UTC_MOMENT.toDate(),
              };

              return knex('users').where('id', userId).update(userUpdateParams).transacting(tx);
            } else {
              Logger.module('GauntletModule').debug(
                `buyArenaTicketWithGold() -> Cannot buy ticket because user ${userId.blue} has insufficient funds`
                  .red,
              );
              return Promise.reject(
                new Errors.InsufficientFundsError(
                  `Insufficient funds in wallet to buy gauntlet ticket for ${userId}`,
                ),
              );
            }
          })
          .then(() => InventoryModule.addArenaTicketToUser(txPromise, tx, userId, 'soft'))
          .then(function (ticketId) {
            _chainState.ticketId = ticketId;
            const userCurrencyLogItem = {
              id: generatePushId(),
              user_id: userId,
              gold: -GauntletModule.GAUNTLET_TICKET_GOLD_PRICE,
              memo: `gauntlet ticket ${ticketId}`,
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
              if (walletData == null) {
                walletData = {};
              }
              walletData.gold_amount = _chainState.final_wallet_gold;
              walletData.updated_at = NOW_UTC_MOMENT.valueOf();
              return walletData;
            };

            return FirebasePromises.safeTransaction(
              fbRootRef.child('user-inventory').child(userId).child('wallet'),
              updateWalletData,
            );
          })
          .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
          .then(tx.commit)
          .catch(tx.rollback);
      })

      .then(function () {
        Logger.module('GauntletModule').debug(
          `buyArenaTicketWithGold() -> User ${userId.blue}`.green +
            ` purchased ticket ${_chainState.ticketId}.`.green,
        );

        return Promise.resolve(_chainState.ticketId);
      });

    // return the transaction promise
    return txPromise;
  }

  //  ###*
  //  # Add a gauntlet ticket to a user's inventory for a specified transaction type.
  //  # @public
  //  # @param  {Promise}    trxPromise          Transaction promise that resolves if transaction succeeds.
  //  # @param  {Transaction}  trx              KNEX transaction to attach this operation to.
  //  # @param  {String}    userId            User ID for which to buy a booster pack.
  //  # @param  {String}    transactionType        'soft','hard','gauntlet', or 'xp'.
  //  # @param  {String}    transactionId        the identifier for the transaction that caused this ticket to be added.
  //  # @return  {Promise}    Promise that will post TICKET ID on completion.
  //  ###
  //  @addArenaTicketToUser: (trxPromise, trx, userId, transactionType, transactionId=null)->
  //
  //    # userId must be defined
  //    unless userId
  //      Logger.module("GauntletModule").debug "addArenaTicketToUser() -> invalid user ID - #{userId}.".red
  //      return Promise.reject(new Error("Can not add gauntlet ticket : invalid user ID - #{userId}"))
  //
  //    # userId must be defined
  //    unless trx
  //      Logger.module("GauntletModule").debug "addBoosterPackToUser() -> invalid trx - #{trx}.".red
  //      return Promise.reject(new Error("Can not add booster pack : invalid transaction parameter"))
  //
  //    ticketId = generatePushId()
  //
  //    NOW_UTC_MOMENT = moment.utc()
  //
  //    # # when the transaction is done, update Firebase
  //    # trxPromise.then ()->
  //    #   return DuelystFirebase.connect().getRootRef()
  //    # .then (fbRootRef) ->
  //    #   tickets = fbRootRef.child("user-inventory").child(userId).child("gauntlet-tickets")
  //    #   data =
  //    #     created_at:NOW_UTC_MOMENT.valueOf()
  //    #     transaction_type:transactionType
  //    #   return FirebasePromises.set(tickets.child(ticketId),data)
  //    # .then ()->
  //    #   return Promise.resolve(ticketId)
  //
  //    # return the insert statement and attach it to the transaction
  //    return knex.insert(
  //        id:          ticketId
  //        user_id:      userId
  //        transaction_type:  transactionType
  //        transaction_id:    transactionId
  //        created_at:      NOW_UTC_MOMENT.toDate()
  //      )
  //      .into("user_gauntlet_tickets")
  //      .transacting(trx)
  //    .then ()-> return DuelystFirebase.connect().getRootRef()
  //    .then (fbRootRef) ->
  //      tickets = fbRootRef.child("user-inventory").child(userId).child("gauntlet-tickets")
  //      data =
  //        created_at:NOW_UTC_MOMENT.valueOf()
  //        transaction_type:transactionType
  //      return FirebasePromises.set(tickets.child(ticketId),data)
  //    .then ()->
  //      Logger.module("GauntletModule").debug "addArenaTicketToUser() -> added #{ticketId} to user #{userId.blue}.".green
  //      return Promise.resolve(ticketId)

  /**
   * Start an arena run for a user.
   * @public
   * @param  {String}  userId    User ID
   * @param  {String}  ticketId  Arena ticket ID to use
   * @return  {Promise}        Promise that will return the arena data on completion.
   */
  static startRun(userId, ticketId, systemTime?) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if (!userId) {
      Logger.module('GauntletModule').debug(`startRun() -> ERROR: invalid user ID: ${userId}`.red);
      return Promise.reject(new Error(`invalid user ID: ${userId}`));
    }

    // ticketId must be defined
    if (!ticketId) {
      Logger.module('GauntletModule').debug(
        `startRun() -> ERROR: invalid ticket ID: ${ticketId}`.red,
      );
      return Promise.reject(new Error(`invalid ticket ID: ${ticketId}`));
    }

    const NOW_UTC_MOMENT = systemTime || moment.utc();

    var txPromise = knex
      .transaction(function (tx) {
        Promise.all([
          knex('user_gauntlet_run').first().where('user_id', userId).forUpdate().transacting(tx),
          knex('user_gauntlet_tickets').first().where('id', ticketId).forUpdate().transacting(tx),
        ])
          .then(function ([existingRun, ticketRow]) {
            if (existingRun != null) {
              if (!existingRun.ended_at) {
                return Promise.reject(
                  new Errors.InvalidRequestError(
                    'Could not start run: user already has an active run.',
                  ),
                );
              }
              if (!existingRun.rewards_claimed_at) {
                return Promise.reject(
                  new Errors.InvalidRequestError('Could not start run: rewards not yet claimed.'),
                );
              }
            }

            if (ticketRow && (ticketRow != null ? ticketRow.user_id : undefined) === userId) {
              ticketRow.used_at = NOW_UTC_MOMENT.toDate();

              //          # generate faction choices
              //          factionChoices = _.sample([
              //            SDK.Factions.Faction1,
              //            SDK.Factions.Faction2,
              //            SDK.Factions.Faction3,
              //            SDK.Factions.Faction4,
              //            SDK.Factions.Faction5,
              //            SDK.Factions.Faction6
              //          ],3)

              _chainState.runData = {
                user_id: userId,
                ticket_id: ticketId,
                //            faction_choices: factionChoices
                faction_choices: null,
                created_at: NOW_UTC_MOMENT.toDate(),
                win_count: 0,
                loss_count: 0,
                deck: [],
              };

              delete ticketRow.is_unread;

              const allPromises = [
                knex('user_gauntlet_tickets').delete().where('id', ticketId).transacting(tx),
                knex('user_gauntlet_tickets_used').insert(ticketRow).transacting(tx),
              ];

              if (existingRun != null) {
                existingRun.id = existingRun.ticket_id;
                delete existingRun.ticket_id;
                allPromises.push(
                  knex('user_gauntlet_run').where('user_id', userId).delete().transacting(tx),
                );
                allPromises.push(
                  knex('user_gauntlet_run_complete').insert(existingRun).transacting(tx),
                );
              }

              return Promise.all(allPromises);
            } else {
              return Promise.reject(
                new Errors.NotFoundError('Could not start run: gauntlet ticket not found.'),
              );
            }
          })
          .then(function () {
            return GauntletModule._generateGeneralChoices(txPromise, tx, userId);
          })
          .then(function (generalChoiceIds) {
            _chainState.runData.general_choices = generalChoiceIds;

            return knex('user_gauntlet_run').insert(_chainState.runData).transacting(tx);
          })
          .then(() => DuelystFirebase.connect().getRootRef())

          .then(function (fbRootRef) {
            if (_chainState.runData.started_at) {
              _chainState.runData.started_at = moment.utc(_chainState.runData.started_at).valueOf();
            }
            if (_chainState.runData.updated_at) {
              _chainState.runData.updated_at = moment.utc(_chainState.runData.updated_at).valueOf();
            }
            if (_chainState.runData.ended_at) {
              _chainState.runData.ended_at = moment.utc(_chainState.runData.ended_at).valueOf();
            }
            if (_chainState.runData.created_at) {
              _chainState.runData.created_at = moment.utc(_chainState.runData.created_at).valueOf();
            }
            if (_chainState.runData.completed_at) {
              _chainState.runData.completed_at = moment
                .utc(_chainState.runData.completed_at)
                .valueOf();
            }

            FirebasePromises.remove(
              fbRootRef
                .child('user-inventory')
                .child(userId)
                .child('gauntlet-tickets')
                .child(ticketId),
            );
            return FirebasePromises.set(
              fbRootRef.child('user-gauntlet-run').child(userId).child('current'),
              _chainState.runData,
            );
          })
          .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
          .then(tx.commit)
          .catch(tx.rollback);
      })
      .then(function () {
        Logger.module('GauntletModule').debug(
          `startRun() -> User ${userId.blue}`.green +
            ` started run ${_chainState.runData.ticket_id}.`.green,
        );

        return Promise.resolve(_chainState.runData);
      });

    return txPromise;
  }

  /**
   * Resign an arena run for a user.
   * @public
   * @param  {String}  userId    User ID
   * @return  {Promise}        Promise that will return the arena data on completion.
   */
  static resignRun(userId) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if (!userId) {
      Logger.module('GauntletModule').debug(`resignRun() -> ERROR: invalid user ID: ${userId}`.red);
      return Promise.reject(new Error(`invalid user ID: ${userId}`));
    }

    const NOW_UTC_MOMENT = moment.utc();

    return knex
      .transaction(function (tx) {
        knex('user_gauntlet_run')
          .first()
          .where('user_id', userId)
          .forUpdate()
          .transacting(tx)
          .then(function (existingRun) {
            if (existingRun != null) {
              if (existingRun.ended_at) {
                return Promise.reject(
                  new Errors.InvalidRequestError('Can not resign a finished gauntlet run.'),
                );
              }

              _chainState.runData = existingRun;
              _chainState.runData.ended_at = NOW_UTC_MOMENT.toDate();
              _chainState.runData.is_resigned = true;

              return knex('user_gauntlet_run')
                .where('user_id', userId)
                .update({
                  ended_at: _chainState.runData.ended_at,
                  is_resigned: _chainState.runData.is_resigned,
                })
                .transacting(tx);
            } else {
              return Promise.reject(new Errors.NotFoundError('No active gautnlet run found.'));
            }
          })
          .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
          .then(tx.commit)
          .catch(tx.rollback);
      })
      .then(() => DuelystFirebase.connect().getRootRef())
      .then(function (fbRootRef) {
        if (_chainState.runData.started_at) {
          _chainState.runData.started_at = moment.utc(_chainState.runData.started_at).valueOf();
        }
        if (_chainState.runData.updated_at) {
          _chainState.runData.updated_at = moment.utc(_chainState.runData.updated_at).valueOf();
        }
        if (_chainState.runData.ended_at) {
          _chainState.runData.ended_at = moment.utc(_chainState.runData.ended_at).valueOf();
        }
        if (_chainState.runData.created_at) {
          _chainState.runData.created_at = moment.utc(_chainState.runData.created_at).valueOf();
        }
        if (_chainState.runData.completed_at) {
          _chainState.runData.completed_at = moment.utc(_chainState.runData.completed_at).valueOf();
        }

        return FirebasePromises.set(
          fbRootRef.child('user-gauntlet-run').child(userId).child('current'),
          _chainState.runData,
        );
      })
      .then(function () {
        Logger.module('GauntletModule').debug(
          `resignRun() -> User ${userId.blue}`.green +
            ` resigned run ${_chainState.runData.ticket_id}.`.green,
        );

        return Promise.resolve(_chainState.runData);
      });
  }

  /**
   * Update a user's current arena run based on the outcome of a game
   * @public
   * @param  {String}  userId      User ID for which to update.
   * @param  {Boolean}  isWinner    Did the user win the game?
   * @param  {String}  gameId      Game unique ID
   * @param  {Boolean}  isDraw      Are we updating for a draw?
   * @return  {Promise}          Promise that will notify when complete.
   */
  static updateArenaRunWithGameOutcome(userId, isWinner, gameId, isDraw) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if (!userId) {
      Logger.module('GauntletModule').debug(
        `updateArenaRunWithGameOutcome() -> ERROR: invalid user ID: ${userId}`.red,
      );
      return Promise.reject(new Error(`invalid user ID: ${userId}`));
    }

    // factionId must be defined
    if (!gameId) {
      Logger.module('GauntletModule').debug(
        `updateArenaRunWithGameOutcome() -> ERROR: invalid game ID: ${gameId}`.red,
      );
      return Promise.reject(new Error(`invalid gameId ID: ${gameId}`));
    }

    const NOW_UTC_MOMENT = moment.utc();

    return knex
      .transaction((tx) =>
        PromiseUtils.withTimeout(
          Promise.resolve(
            tx('users').first('top_gauntlet_win_count').where('id', userId).forUpdate(),
          )
            .then((userRow) =>
              Promise.all([
                userRow,
                tx('user_gauntlet_run').first().where('user_id', userId).forUpdate(),
              ]),
            )
            .then(function ([userRow, existingRun]) {
              if (existingRun != null) {
                const allPromises = [];

                if (existingRun.ended_at) {
                  return Promise.reject(
                    new Error('Can not update progress for a finished gauntlet run.'),
                  );
                }

                if (!existingRun.is_complete) {
                  return Promise.reject(
                    new Error('Can not update progress for a gauntlet run still drafting.'),
                  );
                }

                if (!existingRun.started_at) {
                  existingRun.started_at = NOW_UTC_MOMENT.toDate();
                }

                _chainState.runData = existingRun;
                _chainState.runData.updated_at = NOW_UTC_MOMENT.toDate();
                if (_chainState.runData.games == null) {
                  _chainState.runData.games = [];
                }

                if (isDraw) {
                  _chainState.runData.draw_count += 1;
                } else if (isWinner) {
                  _chainState.runData.win_count += 1;
                } else {
                  _chainState.runData.loss_count += 1;
                }

                _chainState.runData.games.push(gameId);

                // end arena run at 3 losses
                if (_chainState.runData.loss_count === 3) {
                  _chainState.runData.ended_at = NOW_UTC_MOMENT.toDate();
                }

                // or end arena run at 9 wins
                if (_chainState.runData.win_count === GauntletModule.GAUNTLET_MAX_WINS) {
                  _chainState.runData.ended_at = NOW_UTC_MOMENT.toDate();
                }

                // if this is the user's top ever run, update the user record
                if (_chainState.runData.win_count > userRow.top_gauntlet_win_count) {
                  allPromises.push(
                    knex('users')
                      .where('id', userId)
                      .update({
                        top_gauntlet_win_count: _chainState.runData.win_count,
                      })
                      .transacting(tx),
                  );
                }

                allPromises.push(
                  knex('user_gauntlet_run')
                    .where('user_id', userId)
                    .update({
                      loss_count: _chainState.runData.loss_count,
                      win_count: _chainState.runData.win_count,
                      draw_count: _chainState.runData.draw_count,
                      games: _chainState.runData.games,
                      updated_at: _chainState.runData.updated_at,
                      ended_at: _chainState.runData.ended_at,
                    })
                    .transacting(tx),
                );

                return Promise.all(allPromises);
              } else {
                return Promise.reject(new Errors.NotFoundError('No active gauntlet run found.'));
              }
            })
            .then(() => DuelystFirebase.connect().getRootRef())
            .then(function (fbRootRef) {
              _chainState.fbRootRef = fbRootRef;

              const allPromises = [];

              if (_chainState.runData.started_at) {
                _chainState.runData.started_at = moment
                  .utc(_chainState.runData.started_at)
                  .valueOf();
              }
              if (_chainState.runData.updated_at) {
                _chainState.runData.updated_at = moment
                  .utc(_chainState.runData.updated_at)
                  .valueOf();
              }
              if (_chainState.runData.ended_at) {
                _chainState.runData.ended_at = moment.utc(_chainState.runData.ended_at).valueOf();
              }
              if (_chainState.runData.created_at) {
                _chainState.runData.created_at = moment
                  .utc(_chainState.runData.created_at)
                  .valueOf();
              }

              return allPromises.push(
                FirebasePromises.update(
                  fbRootRef.child('user-gauntlet-run').child(userId).child('current'),
                  {
                    loss_count: _chainState.runData.loss_count,
                    win_count: _chainState.runData.win_count,
                    draw_count: _chainState.runData.draw_count,
                    ended_at: _chainState.runData.ended_at,
                  },
                ),
              );
            })
            .then(() => SyncModule._bumpUserTransactionCounter(tx, userId)),
          10000,
        ).catch(
          onType(PromiseUtils.TimeoutError, function (e) {
            Logger.module('GauntletModule').error(
              `updateArenaRunWithGameOutcome() -> ERROR, operation timeout for u:${userId} g:${gameId}`,
            );
            throw e;
          }),
        ),
      )
      .then(function () {
        return Promise.resolve(_chainState.runData);
      })
      .finally(() => GamesModule.markClientGameJobStatusAsComplete(userId, gameId, 'gauntlet'));
  }

  /**
   * Generate and add rewards for the arena run to a user's inventory
   * @public
   * @param  {String}  userId      User ID for which to claim rewards.
   * @return  {Promise}          Promise that will notify when complete.
   */
  static claimRewards(userId) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if (!userId) {
      Logger.module('GauntletModule').debug(
        `claimRewards() -> ERROR: invalid user ID: ${userId}`.red,
      );
      return Promise.reject(new Error(`invalid user ID: ${userId}`));
    }

    const NOW_UTC_MOMENT = moment.utc();

    var txPromise = knex
      .transaction((tx) =>
        Promise.resolve(tx('users').first('id').where('id', userId).forUpdate())
          .then((userRow) =>
            Promise.all([
              userRow,
              tx('user_gauntlet_run').first().where('user_id', userId).forUpdate(),
            ]),
          )
          .then(function ([userRow, existingRun]) {
            if (existingRun != null) {
              let reward, rewardInsertData;
              if (!existingRun.ended_at) {
                return Promise.reject(
                  new Errors.InvalidRequestError(
                    'Can not claim rewards for an unfinished gauntlet run.',
                  ),
                );
              }

              if (existingRun.rewards_claimed_at) {
                return Promise.reject(
                  new Errors.ArenaRewardsAlreadyClaimedError(
                    'Rewards already claimed for this gauntlet run.',
                  ),
                );
              }

              _chainState.runData = existingRun;
              _chainState.runData.rewards_claimed_at = NOW_UTC_MOMENT.toDate();

              // rewards
              _chainState.runData.rewards = [];
              _chainState.runData.reward_ids = [];
              const rewards = [];
              const rewardsData = [];
              _chainState.rewardsRows = [];
              const rewardCardIds = [];
              const rewardMap = GauntletModule._getRewardMap();

              // At 1 win, get a random spirit orb and a  basic box
              if (_chainState.runData.win_count >= 1) {
                rewardsData.push({
                  spirit_orbs:
                    GauntletModule._GAUNTLET_SPIRIT_ORB_REWARD_SETS[
                      Math.floor(
                        Math.random() * GauntletModule._GAUNTLET_SPIRIT_ORB_REWARD_SETS.length,
                      )
                    ],
                });
                rewards.push(
                  _.sample(rewardMap.basic_box_wins[_chainState.runData.win_count], 1)[0],
                );
              }

              // At 2 wins, get a gold box
              if (_chainState.runData.win_count >= 2) {
                rewards.push(
                  _.sample(rewardMap.gold_box_wins[_chainState.runData.win_count], 1)[0],
                );
              }

              // At 3 wins, get a good box
              if (_chainState.runData.win_count >= 3) {
                rewards.push(
                  _.sample(rewardMap.good_box_wins[_chainState.runData.win_count], 1)[0],
                );
              }

              // Free gauntlet ticket after 6 wins (disabled; gauntlet is already free)
              // if @.runData.win_count > 6
              //  rewardsData.push({arena_tickets:1})

              // At 10 wins, get a great box
              if (_chainState.runData.win_count >= 10) {
                rewards.push(
                  _.sample(rewardMap.great_box_wins[_chainState.runData.win_count], 1)[0],
                );
              }

              // At 12 wins, get an awesome box and a gift crate
              if (_chainState.runData.win_count >= 12) {
                rewards.push(
                  _.sample(rewardMap.awesome_box_wins[_chainState.runData.win_count], 1)[0],
                );
                const keyRandom = Math.random();
                if (keyRandom < 0.85) {
                  rewardsData.push({ cosmetic_keys: [SDK.CosmeticsChestTypeLookup.Common] });
                } else if (keyRandom < 0.95) {
                  rewardsData.push({ cosmetic_keys: [SDK.CosmeticsChestTypeLookup.Rare] });
                } else {
                  rewardsData.push({ cosmetic_keys: [SDK.CosmeticsChestTypeLookup.Epic] });
                }
              }

              // set arena rewards in db
              for (reward of Array.from<any>(rewards)) {
                if (reward instanceof String || typeof reward === 'string') {
                  var parts = reward.split(' ');
                  if (parts[1] === 'G') {
                    rewardsData.push({ gold: parseInt(parts[0]) });
                  } else if (parts[1] === 'S') {
                    rewardsData.push({ spirit: parseInt(parts[0]) });
                  } else if (parts[1] === 'ORB') {
                    rewardsData.push({ spirit_orbs: parseInt(parts[0]) });
                  }
                } else if (reward instanceof Number || typeof reward === 'number') {
                  var prismaticChance;
                  var rarityId = reward;

                  // get all cards that match rarity reward
                  var cardsToSampleFrom = [];
                  for (var factionData of Array.from<any>(
                    SDK.FactionFactory.getAllEnabledFactions(),
                  )) {
                    var cardsForFaction = SDK.GameSession.getCardCaches()
                      .getCardSet(SDK.CardSet.Core)
                      .getFaction(factionData.id)
                      .getRarity(rarityId)
                      .getIsUnlockable(false)
                      .getIsCollectible(true)
                      .getIsPrismatic(false)
                      .getIsGeneral(false)
                      .getCards();
                    cardsForFaction = cardsForFaction.concat(
                      SDK.GameSession.getCardCaches()
                        .getCardSet(SDK.CardSet.Shimzar)
                        .getFaction(factionData.id)
                        .getRarity(rarityId)
                        .getIsUnlockable(false)
                        .getIsCollectible(true)
                        .getIsPrismatic(false)
                        .getIsGeneral(false)
                        .getCards(),
                    );
                    cardsForFaction = cardsForFaction.concat(
                      SDK.GameSession.getCardCaches()
                        .getCardSet(SDK.CardSet.FirstWatch)
                        .getFaction(factionData.id)
                        .getRarity(rarityId)
                        .getIsUnlockable(false)
                        .getIsCollectible(true)
                        .getIsPrismatic(false)
                        .getIsGeneral(false)
                        .getCards(),
                    );
                    cardsForFaction = cardsForFaction.concat(
                      SDK.GameSession.getCardCaches()
                        .getCardSet(SDK.CardSet.Wartech)
                        .getFaction(factionData.id)
                        .getRarity(rarityId)
                        .getIsUnlockable(false)
                        .getIsCollectible(true)
                        .getIsPrismatic(false)
                        .getIsGeneral(false)
                        .getCards(),
                    );
                    cardsForFaction = cardsForFaction.concat(
                      SDK.GameSession.getCardCaches()
                        .getCardSet(SDK.CardSet.CombinedUnlockables)
                        .getFaction(factionData.id)
                        .getRarity(rarityId)
                        .getIsUnlockable(false)
                        .getIsCollectible(true)
                        .getIsPrismatic(false)
                        .getIsGeneral(false)
                        .getCards(),
                    );
                    cardsForFaction = cardsForFaction.concat(
                      SDK.GameSession.getCardCaches()
                        .getCardSet(SDK.CardSet.Coreshatter)
                        .getFaction(factionData.id)
                        .getRarity(rarityId)
                        .getIsUnlockable(false)
                        .getIsCollectible(true)
                        .getIsPrismatic(false)
                        .getIsGeneral(false)
                        .getCards(),
                    );
                    cardsToSampleFrom = cardsToSampleFrom.concat(cardsForFaction);
                  }

                  // get a random card
                  var card =
                    cardsToSampleFrom[Math.floor(Math.random() * cardsToSampleFrom.length)];
                  var cardId = card.getId();

                  // small chance to reward a prismatic
                  if (card.getRarityId() === SDK.Rarity.Legendary) {
                    prismaticChance = 0.08;
                  } else if (card.getRarityId() === SDK.Rarity.Epic) {
                    prismaticChance = 0.07;
                  } else if (card.getRarityId() === SDK.Rarity.Rare) {
                    prismaticChance = 0.06;
                  } else if (card.getRarityId() === SDK.Rarity.Common) {
                    prismaticChance = 0.04;
                  } else {
                    prismaticChance = 0.0;
                  }
                  if (Math.random() < prismaticChance) {
                    cardId = SDK.Cards.getPrismaticCardId(cardId);
                  }

                  // push a reward to rewards data for processing
                  // NOTE: this is sort of ignored below for now, see the continue statement in the loop right below.
                  // NOTE: the rewardCardIds array is actually used to process cards, see next statement below
                  rewardsData.push({ card_id: cardId });
                  // add the card to the rewardCardIds array, which is currently used to add cards rewards
                  // this is sort of bad and could use a refactor
                  rewardCardIds.push(cardId);
                }
              }

              // for use later to set firebase data
              _chainState.runData.rewards = rewardsData;

              const allPromises = [];
              for (reward of Array.from<any>(rewardsData)) {
                // card data is done separately
                if (reward.card_id) {
                  continue;
                }

                rewardInsertData = {
                  id: generatePushId(),
                  user_id: userId,
                  reward_category: 'gauntlet',
                  source_id: _chainState.runData.ticket_id,
                  created_at: NOW_UTC_MOMENT.toDate(),
                  is_unread: true,
                };

                if (reward.gold) {
                  rewardInsertData.gold = reward.gold;
                  allPromises.push(
                    InventoryModule.giveUserGold(
                      txPromise,
                      tx,
                      userId,
                      reward.gold,
                      'gauntlet',
                      _chainState.runData.ticket_id,
                    ),
                  );
                }

                if (reward.spirit) {
                  rewardInsertData.spirit = reward.spirit;
                  allPromises.push(
                    InventoryModule.giveUserSpirit(
                      txPromise,
                      tx,
                      userId,
                      reward.spirit,
                      'gauntlet',
                      _chainState.runData.ticket_id,
                    ),
                  );
                }

                if (reward.arena_tickets) {
                  rewardInsertData.gauntlet_tickets = reward.arena_tickets;
                  allPromises.push(
                    InventoryModule.addArenaTicketToUser(
                      txPromise,
                      tx,
                      userId,
                      'gauntlet',
                      _chainState.runData.ticket_id,
                    ),
                  );
                }

                if (reward.cosmetic_keys) {
                  rewardInsertData.cosmetic_keys = reward.cosmetic_keys;
                  for (var key of Array.from<any>(reward.cosmetic_keys)) {
                    allPromises.push(
                      CosmeticChestsModule.giveUserChestKey(
                        txPromise,
                        tx,
                        userId,
                        key,
                        1,
                        'gauntlet',
                        _chainState.runData.ticket_id,
                        NOW_UTC_MOMENT,
                      ),
                    );
                  }
                }

                if (reward.spirit_orbs != null) {
                  rewardInsertData.spirit_orbs = reward.spirit_orbs;
                  if (_.isArray(reward.spirit_orbs)) {
                    for (var orbCardSet of Array.from<any>(reward.spirit_orbs)) {
                      allPromises.push(
                        InventoryModule.addBoosterPackToUser(
                          txPromise,
                          tx,
                          userId,
                          orbCardSet,
                          'gauntlet',
                          _chainState.runData.ticket_id,
                        ),
                      );
                    }
                  } else if (_.isNumber(reward.spirit_orbs)) {
                    allPromises.push(
                      InventoryModule.addBoosterPackToUser(
                        txPromise,
                        tx,
                        userId,
                        reward.spirit_orbs,
                        'gauntlet',
                        _chainState.runData.ticket_id,
                      ),
                    );
                  } else {
                    return Promise.reject(
                      new Error(
                        `invalid spirit orb reward data (${reward.spirit_orbs}) for user ID: ${userId}`,
                      ),
                    );
                  }
                }

                allPromises.push(knex('user_rewards').insert(rewardInsertData).transacting(tx));

                _chainState.rewardsRows.push(rewardInsertData);
                _chainState.runData.reward_ids.push(rewardInsertData.id);
              }

              // add all cards
              if (rewardCardIds) {
                rewardInsertData = {
                  id: generatePushId(),
                  user_id: userId,
                  reward_category: 'gauntlet',
                  source_id: _chainState.runData.ticket_id,
                  created_at: NOW_UTC_MOMENT.toDate(),
                  cards: rewardCardIds,
                  is_unread: true,
                };
                allPromises.push(
                  InventoryModule.giveUserCards(
                    txPromise,
                    tx,
                    userId,
                    rewardCardIds,
                    'gauntlet',
                    _chainState.runData.ticket_id,
                  ),
                );
                allPromises.push(knex('user_rewards').insert(rewardInsertData).transacting(tx));

                _chainState.rewardsRows.push(rewardInsertData);
                _chainState.runData.reward_ids.push(rewardInsertData.id);
              }

              // update gauntlet run with reward ids
              allPromises.push(
                knex('user_gauntlet_run')
                  .where('user_id', userId)
                  .update({
                    reward_ids: _chainState.runData.reward_ids,
                    rewards_claimed_at: _chainState.runData.rewards_claimed_at,
                  })
                  .transacting(tx),
              );

              return Promise.all(allPromises);
            } else {
              return Promise.reject(new Errors.NotFoundError('No active gauntlet run found.'));
            }
          })
          .then(() => DuelystFirebase.connect().getRootRef())
          .then(function (fbRootRef) {
            const allPromises = [];

            if (_chainState.runData.rewards_claimed_at) {
              _chainState.runData.rewards_claimed_at = moment
                .utc(_chainState.runData.rewards_claimed_at)
                .valueOf();
            }
            if (_chainState.runData.started_at) {
              _chainState.runData.started_at = moment.utc(_chainState.runData.started_at).valueOf();
            }
            if (_chainState.runData.updated_at) {
              _chainState.runData.updated_at = moment.utc(_chainState.runData.updated_at).valueOf();
            }
            if (_chainState.runData.ended_at) {
              _chainState.runData.ended_at = moment.utc(_chainState.runData.ended_at).valueOf();
            }
            if (_chainState.runData.created_at) {
              _chainState.runData.created_at = moment.utc(_chainState.runData.created_at).valueOf();
            }
            if (_chainState.runData.completed_at) {
              _chainState.runData.completed_at = moment
                .utc(_chainState.runData.completed_at)
                .valueOf();
            }

            allPromises.push(
              FirebasePromises.update(
                fbRootRef.child('user-gauntlet-run').child(userId).child('current'),
                {
                  rewards_claimed_at: _chainState.runData.rewards_claimed_at,
                  rewards: _chainState.runData.rewards,
                  reward_ids: _chainState.runData.reward_ids,
                },
              ),
            );

            // for rewardRow in @.rewardsRows
            //   reward_id = rewardRow.id
            //   delete rewardRow.id
            //   delete rewardRow.user_id
            //   rewardRow.created_at = moment.utc(rewardRow.created_at).valueOf()
            //   allPromises.push FirebasePromises.set(fbRootRef.child("user-rewards").child(userId).child(reward_id),rewardRow)

            return Promise.all(allPromises);
          })
          .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
          .then(tx.commit)
          .catch(tx.rollback),
      )
      .then(function () {
        return Promise.resolve(_chainState.runData);
      });

    return txPromise;
  }

  /**
   * Get the arena deck for a user.
   * @public
   * @param  {String}  userId    User ID
   * @return  {Promise}        Promise that will return the arena deck on completion or error out with a NoArenaDeckError.
   */
  static getArenaDeck(userId?) {
    // userId must be defined
    if (userId == null) {
      Logger.module('GauntletModule').debug(
        `getArenaDeck() -> ERROR: invalid user ID: ${userId}`.red,
      );
      return Promise.reject(new Error(`invalid user ID: ${userId}`));
    }

    return knex('user_gauntlet_run')
      .first()
      .where('user_id', userId)
      .then(function (run) {
        if (run && run.is_complete && (run.deck != null ? run.deck.length : undefined) > 0) {
          // copy deck
          const deck = run.deck.slice(0);

          // Legacy gauntlet runs would be broken after this change: https://github.com/88dots/cleancoco/pull/8372
          // If we don't detect decks that do not have a general card in slot 0, so check for a general card and add
          // the default general if one does not exist
          const deckGeneralCardId = deck[0];
          const deckGeneralSDKCard = SDK.CardFactory.cardForIdentifier(
            deckGeneralCardId,
            SDK.GameSession.current(),
          );
          if (!deckGeneralSDKCard.isGeneral) {
            // Card in slot 0 was not a general, unshift the default general
            const factionId = run.faction_id;
            const faction = SDK.FactionFactory.factionForIdentifier(factionId);
            const defaultGeneralId =
              faction.generalIdsByOrder[SDK.FactionFactory.GeneralOrder.Primary];
            deck.unshift(defaultGeneralId);
          }

          return Promise.resolve(deck);
        } else {
          return Promise.reject(
            new Errors.NoArenaDeckError(`Could not load user ${userId} arena deck.`),
          );
        }
      });
  }

  /**
   * Get a matchmaking metric for the user's arena run. (12-0) Where, 12 is worst, and 0 is best.
   * @public
   * @param  {String}  userId    User ID
   * @return  {Promise}        Promise that will resolve the integer metric (12-0) on completion.
   */
  static getRunMatchmakingMetric(userId) {
    // userId must be defined
    if (!userId) {
      Logger.module('GauntletModule').debug(
        `getRunMatchmakingMetric() -> ERROR: invalid user ID: ${userId}`.red,
      );
      return Promise.reject(new Error(`invalid user ID: ${userId}`));
    }

    return knex('user_gauntlet_run')
      .first()
      .where('user_id', userId)
      .then(function (run) {
        if (run == null || (run != null ? run.rewards_claimed_at : undefined)) {
          throw new Errors.NotFoundError('Gauntlet Run Not Found');
        } else if (run.is_complete && (run.deck != null ? run.deck.length : undefined) > 0) {
          // grab win count
          const winCount = run.win_count || 0;
          // the metric should be equal to MAX win count - winCount
          let metric = GauntletModule.GAUNTLET_MAX_WINS - winCount;
          // minimum is 0
          metric = Math.max(metric, 0);
          return Promise.resolve(metric);
        } else {
          return Promise.reject(new Errors.NoArenaDeckError('Gauntlet deck is incomplete.'));
        }
      });
  }

  //  ###*
  //  # Choose the faction for a user's arena run.
  //  # @public
  //  # @param  {String}  userId    User ID
  //  # @param  {String}  factionId  Faction ID
  //  # @return  {Promise}        Promise that will return the arena data on completion.
  //  ###
  //  @chooseFaction: (userId, factionId) ->
  //
  //    # userId must be defined
  //    if !userId
  //      Logger.module("GauntletModule").debug "chooseFaction() -> ERROR: invalid user ID: #{userId}".red
  //      return Promise.reject(new Error("invalid user ID: #{userId}"))
  //
  //    # factionId must be defined
  //    if !factionId
  //      Logger.module("GauntletModule").debug "chooseFaction() -> ERROR: invalid faction ID: #{factionId}".red
  //      return Promise.reject(new Error("invalid faction ID: #{factionId}"))
  //
  //    NOW_UTC_MOMENT = moment.utc()
  //
  //    this_obj = {}
  //
  //    txPromise = knex.transaction (tx)->
  //
  //      knex("user_gauntlet_run").first().where('user_id',userId).forUpdate().transacting(tx)
  //      .bind this_obj
  //      .then (existingRun)->
  //
  //        if existingRun?
  //
  //          if existingRun.faction_id
  //            return Promise.reject(new Errors.InvalidRequestError("You can not chose a faction twice."))
  //
  //          if existingRun.ended_at
  //            return Promise.reject(new Error("Can not choose faction for a finished gauntlet run."))
  //
  //          if not _.contains(existingRun.faction_choices,factionId)
  //            return Promise.reject(new Errors.InvalidRequestError("Invalid faction choice."))
  //
  //          @.runData = existingRun
  //          @.runData.faction_id = factionId
  //          @.runData.updated_at = NOW_UTC_MOMENT.toDate()
  //
  //          GauntletModule._generateCardChoices(txPromise, tx, userId, @.runData.faction_id, 0)
  //          .bind(@)
  //          .then (cardChoices) ->
  //            @.runData.card_choices = cardChoices
  //            return knex("user_gauntlet_run").where('user_id',userId).update(
  //              faction_id: @.runData.faction_id
  //              card_choices: @.runData.card_choices
  //              updated_at: @.runData.updated_at
  //            ).transacting(tx)
  //
  //        else
  //
  //          return Promise.reject(new Errors.NotFoundError("No active gauntlet run found."))
  //
  //      .then ()-> return DuelystFirebase.connect().getRootRef()
  //
  //      .then (fbRootRef) ->
  //
  //        if @.runData.started_at then @.runData.started_at = moment.utc(@.runData.started_at).valueOf()
  //        if @.runData.updated_at then @.runData.updated_at = moment.utc(@.runData.updated_at).valueOf()
  //        if @.runData.ended_at then @.runData.ended_at = moment.utc(@.runData.ended_at).valueOf()
  //        if @.runData.created_at then @.runData.created_at = moment.utc(@.runData.created_at).valueOf()
  //        if @.runData.completed_at then @.runData.completed_at = moment.utc(@.runData.completed_at).valueOf()
  //
  //        FirebasePromises.update(fbRootRef.child("user-gauntlet-run").child(userId).child("current"),{
  //          faction_id:@.runData.faction_id,
  //          card_choices:@.runData.card_choices
  //        })
  //      .then ()-> SyncModule._bumpUserTransactionCounter(tx,userId)
  //      .then tx.commit
  //      .catch tx.rollback
  //      return
  //
  //    .bind this_obj
  //
  //    .then ()->
  //
  //      Logger.module("GauntletModule").debug "chooseFaction() -> User #{userId.blue}".green + " chose faction #{factionId} for run #{@.runData.ticket_id}.".green
  //
  //      return Promise.resolve(@.runData)
  //
  //    return txPromise

  /**
   * Choose a card for a user's arena run.
   * @public
   * @param  {String}  userId    User ID
   * @param  {String}  cardId    Card ID
   * @return  {Promise}        Promise that will return the arena data on completion.
   */
  static chooseCard(userId, cardId) {
    const _chainState: Record<string, any> = {};
    // userId must be defined
    if (!userId) {
      Logger.module('GauntletModule').debug(
        `chooseCard() -> ERROR: invalid user ID: ${userId}`.red,
      );
      return Promise.reject(new Error(`invalid user ID: ${userId}`));
    }

    // cardId must be defined
    if (!cardId) {
      Logger.module('GauntletModule').debug(
        `chooseCard() -> ERROR: invalid faction ID: ${cardId}`.red,
      );
      return Promise.reject(new Error(`invalid card ID: ${cardId}`));
    }

    const NOW_UTC_MOMENT = moment.utc();

    var txPromise = knex
      .transaction(function (tx) {
        knex('user_gauntlet_run')
          .first()
          .where('user_id', userId)
          .forUpdate()
          .transacting(tx)
          .then(function (existingRun) {
            if (existingRun != null) {
              let cardChoicesPromise;
              if (existingRun.ended_at) {
                return Promise.reject(
                  new Error('Can not choose card for a finished gauntlet run.'),
                );
              }

              if (existingRun.is_complete) {
                throw new Errors.InvalidRequestError('You can not choose additional cards');
              }

              if (
                existingRun.card_choices != null &&
                !_.contains(existingRun.card_choices, cardId)
              ) {
                throw new Errors.InvalidRequestError('Invalid card choice');
              }

              if (
                existingRun.general_choices != null &&
                !_.contains(existingRun.general_choices, cardId)
              ) {
                throw new Errors.InvalidRequestError('Invalid general choice');
              }

              if (existingRun.card_choices == null && existingRun.general_choices == null) {
                throw new Errors.InvalidRequestError('No existing choices to be made');
              }

              _chainState.runData = existingRun;
              _chainState.runData.updated_at = NOW_UTC_MOMENT.toDate();

              if (_chainState.runData.deck == null) {
                _chainState.runData.deck = [];
              }
              _chainState.runData.deck.push(cardId);
              // The order users should hit the following conditions:
              // User will first be choosing cards, then user will have finished card choice and general choices will be generated,
              // - then deck will be considered complete
              if (_chainState.runData.general_choices != null) {
                // Player has just chosen their general
                _chainState.runData.general_choices = null;
                _chainState.runData.general_id = cardId;
                _chainState.runData.faction_id = SDK.FactionFactory.factionForGeneralId(cardId).id;

                // Begin choosing cards
                cardChoicesPromise = GauntletModule._generateCardChoices(
                  txPromise,
                  tx,
                  userId,
                  _chainState.runData.faction_id,
                  _chainState.runData.deck.length,
                  null,
                ).then(function (cardChoices) {
                  return (_chainState.runData.card_choices = cardChoices);
                });
                //          else if (@.runData.deck.length == CONFIG.MAX_DECK_SIZE_GAUNTLET - 1)
                //            # User has just selected their final non-general card, transition to selecting general
                //            @.runData.card_choices = null
                //            cardChoicesPromise = GauntletModule._generateGeneralChoices(txPromise, tx, userId, @.runData.faction_id)
                //            .bind(@)
                //            .then (generalCardChoices) ->
                //              @.runData.general_choices = generalCardChoices
              } else if (_chainState.runData.deck.length === CONFIG.MAX_DECK_SIZE_GAUNTLET) {
                // User has just selected their final card,
                _chainState.runData.card_choices = null;
                _chainState.runData.is_complete = true;
                _chainState.runData.completed_at = NOW_UTC_MOMENT.toDate();
                if (_chainState.runData.win_count == null) {
                  _chainState.runData.win_count = 0;
                }
                if (_chainState.runData.loss_count == null) {
                  _chainState.runData.loss_count = 0;
                }
                if (_chainState.runData.games == null) {
                  _chainState.runData.games = [];
                }

                cardChoicesPromise = Promise.resolve();
              } else {
                // User has selected a non final card, continue with selecting card choices
                cardChoicesPromise = GauntletModule._generateCardChoices(
                  txPromise,
                  tx,
                  userId,
                  _chainState.runData.faction_id,
                  _chainState.runData.deck.length,
                  _chainState.runData.deck[_chainState.runData.deck.length - 1],
                ).then(function (cardChoices) {
                  return (_chainState.runData.card_choices = cardChoices);
                });
              }

              return cardChoicesPromise.then(function () {
                return knex('user_gauntlet_run')
                  .where('user_id', userId)
                  .update({
                    faction_id: _chainState.runData.faction_id,
                    deck: _chainState.runData.deck,
                    card_choices: _chainState.runData.card_choices,
                    general_choices: _chainState.runData.general_choices,
                    general_id: _chainState.runData.general_id,
                    is_complete: _chainState.runData.is_complete,
                    completed_at: _chainState.runData.completed_at,
                    games: _chainState.runData.GameSession,
                  })
                  .transacting(tx);
              });
            } else {
              return Promise.reject(new Errors.NotFoundError('No active gauntlet run found.'));
            }
          })
          .then(() => DuelystFirebase.connect().getRootRef())
          .then(function (fbRootRef) {
            if (_chainState.runData.started_at) {
              _chainState.runData.started_at = moment.utc(_chainState.runData.started_at).valueOf();
            }
            if (_chainState.runData.updated_at) {
              _chainState.runData.updated_at = moment.utc(_chainState.runData.updated_at).valueOf();
            }
            if (_chainState.runData.ended_at) {
              _chainState.runData.ended_at = moment.utc(_chainState.runData.ended_at).valueOf();
            }
            if (_chainState.runData.created_at) {
              _chainState.runData.created_at = moment.utc(_chainState.runData.created_at).valueOf();
            }
            if (_chainState.runData.completed_at) {
              _chainState.runData.completed_at = moment
                .utc(_chainState.runData.completed_at)
                .valueOf();
            }

            const fbGauntletUpdateData: Record<string, any> = {
              faction_id: _chainState.runData.faction_id,
              deck: _chainState.runData.deck,
              card_choices: _chainState.runData.card_choices,
              is_complete: _chainState.runData.is_complete,
            };

            fbGauntletUpdateData.general_choices = _chainState.runData.general_choices || null;

            if (_chainState.runData.general_id != null) {
              fbGauntletUpdateData.general_id = _chainState.runData.general_id;
            }

            if (_chainState.runData.faction_id != null) {
              fbGauntletUpdateData.faction_id = _chainState.runData.faction_id;
            }

            return FirebasePromises.update(
              fbRootRef.child('user-gauntlet-run').child(userId).child('current'),
              fbGauntletUpdateData,
            );
          })
          .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
          .then(tx.commit)
          .catch(tx.rollback);
      })

      .then(function () {
        Logger.module('GauntletModule').debug(
          `chooseCard() -> User ${userId.blue}`.green +
            ` chose card ${cardId} at deck slot ${_chainState.runData.deck.length} for run ${_chainState.runData.ticket_id}.`
              .green,
        );

        return Promise.resolve(_chainState.runData);
      });

    return txPromise;
  }

  /**
   * Generate a 3 card set for a specific faction and round.
   * @private
   * @param  {Promise}  txPromise KNEX transaction promise
   * @param  {Transaction}  tx KNEX transaction to attach this operation to.
   * @param  {String}  userId    User ID for which to generate cards.
   * @param  {Integer}  factionId    Faction ID for which to generate cards.
   * @param  {Integer}  round      Which round of choice (0-29) this is for?
   * @return  {Promise}            Promise that resolves with an array of card IDs.
   */
  static _generateCardChoices(txPromise, tx, userId, factionId, round, lastCardPickedId) {
    // card ids to return
    const cardIds = [];

    const lastSdkCardPicked = SDK.GameSession.getCardCaches().getCardById(lastCardPickedId);
    let modifiedCardTypes = null;
    let modifiedFactionIds = null;
    let modifiedRarityIds = null;
    if (lastSdkCardPicked != null) {
      modifiedCardTypes = lastSdkCardPicked.getModifiedGauntletCardTypes(); // Not in use, functionality removed
      modifiedFactionIds = lastSdkCardPicked.getModifiedGauntletFactions();
      modifiedRarityIds = lastSdkCardPicked.getModifiedGauntletRarities();

      if (lastSdkCardPicked.getModifiedGauntletOwnFactionFilter()) {
        modifiedFactionIds = [factionId, factionId, factionId];
      }
    }

    // Gaurenteed legendary on 15th non general card choice
    if (round === 15) {
      modifiedRarityIds = [SDK.Rarity.Legendary, SDK.Rarity.Legendary, SDK.Rarity.Legendary];
    }

    const index = round + 1;
    let random = Math.random();
    let rarities = null;

    if (modifiedRarityIds != null) {
      rarities = modifiedRarityIds;
    } else if (index % 10 === 0 || index === 1) {
      // sample for legendary on 10,20,30
      if (random < 0.89) {
        rarities = [SDK.Rarity.Rare, SDK.Rarity.Rare, SDK.Rarity.Rare];
      } else if (random < 0.99) {
        rarities = [SDK.Rarity.Epic, SDK.Rarity.Epic, SDK.Rarity.Epic];
      } else {
        rarities = [SDK.Rarity.Legendary, SDK.Rarity.Legendary, SDK.Rarity.Legendary];
      }
    } else {
      // sample for basic
      if (random < 0.2) {
        rarities = [SDK.Rarity.Fixed, SDK.Rarity.Fixed, SDK.Rarity.Fixed];
      } else if (random < 0.4) {
        rarities = [SDK.Rarity.Fixed, SDK.Rarity.Fixed, SDK.Rarity.Common];
      } else if (random < 0.55) {
        rarities = [SDK.Rarity.Fixed, SDK.Rarity.Common, SDK.Rarity.Common];
      } else if (random < 0.75) {
        rarities = [SDK.Rarity.Common, SDK.Rarity.Common, SDK.Rarity.Common];
      } else if (random < 0.87) {
        rarities = [SDK.Rarity.Rare, SDK.Rarity.Rare, SDK.Rarity.Rare];
      } else if (random < 0.97) {
        rarities = [SDK.Rarity.Epic, SDK.Rarity.Epic, SDK.Rarity.Epic];
      } else {
        rarities = [SDK.Rarity.Legendary, SDK.Rarity.Legendary, SDK.Rarity.Legendary];
      }
    }

    // re-roll
    random = Math.random();
    let factionComposition = null;

    if (modifiedFactionIds != null) {
      factionComposition = modifiedFactionIds;
    } else if (rarities[0] === SDK.Rarity.Legendary) {
      if (random < 0.3) {
        factionComposition = [SDK.Factions.Neutral, SDK.Factions.Neutral, SDK.Factions.Neutral];
      } else if (random < 0.78) {
        factionComposition = [factionId, SDK.Factions.Neutral, SDK.Factions.Neutral];
      } else if (random < 0.9) {
        factionComposition = [factionId, factionId, SDK.Factions.Neutral];
      } else {
        factionComposition = [factionId, factionId, factionId];
      }
    } else if (rarities[0] === SDK.Rarity.Epic) {
      if (random < 0.3) {
        factionComposition = [SDK.Factions.Neutral, SDK.Factions.Neutral, SDK.Factions.Neutral];
      } else if (random < 0.68) {
        factionComposition = [factionId, SDK.Factions.Neutral, SDK.Factions.Neutral];
      } else if (random < 0.85) {
        factionComposition = [factionId, factionId, SDK.Factions.Neutral];
      } else {
        factionComposition = [factionId, factionId, factionId];
      }
    } else if (rarities[0] === SDK.Rarity.Rare) {
      if (random < 0.3) {
        factionComposition = [SDK.Factions.Neutral, SDK.Factions.Neutral, SDK.Factions.Neutral];
      } else if (random < 0.62) {
        factionComposition = [factionId, SDK.Factions.Neutral, SDK.Factions.Neutral];
      } else if (random < 0.82) {
        factionComposition = [factionId, factionId, SDK.Factions.Neutral];
      } else {
        factionComposition = [factionId, factionId, factionId];
      }
    } else {
      if (random < 0.3) {
        factionComposition = [SDK.Factions.Neutral, SDK.Factions.Neutral, SDK.Factions.Neutral];
      } else if (random < 0.57) {
        factionComposition = [factionId, SDK.Factions.Neutral, SDK.Factions.Neutral];
      } else if (random < 0.75) {
        factionComposition = [factionId, factionId, SDK.Factions.Neutral];
      } else {
        factionComposition = [factionId, factionId, factionId];
      }
    }

    factionComposition = _.shuffle(factionComposition);

    for (let i = 0; i < rarities.length; i++) {
      var rarityId = rarities[i];
      factionId = factionComposition[i];

      Logger.module('GauntletModule').debug(
        `_generateCardChoices() -> rarity ${rarityId} faction ${factionId}`,
      );

      // get all cards to pick from
      var cardsInCoreSet = SDK.GameSession.getCardCaches()
        .getCardSet(SDK.CardSet.Core)
        .getFaction(factionId)
        .getRarity(rarityId)
        .getIsPrismatic(false)
        .getIsGeneral(false)
        .getIsHiddenInCollection(false)
        .getIsSkinned(false)
        .getCards();
      var cardsInShimzarSet = SDK.GameSession.getCardCaches()
        .getCardSet(SDK.CardSet.Shimzar)
        .getFaction(factionId)
        .getRarity(rarityId)
        .getIsPrismatic(false)
        .getIsGeneral(false)
        .getIsHiddenInCollection(false)
        .getIsSkinned(false)
        .getCards();
      var cardsInCombinedSet = SDK.GameSession.getCardCaches()
        .getCardSet(SDK.CardSet.CombinedUnlockables)
        .getFaction(factionId)
        .getRarity(rarityId)
        .getIsPrismatic(false)
        .getIsGeneral(false)
        .getIsHiddenInCollection(false)
        .getIsSkinned(false)
        .getCards();
      var cardsInFirstWatchSet = SDK.GameSession.getCardCaches()
        .getCardSet(SDK.CardSet.FirstWatch)
        .getFaction(factionId)
        .getRarity(rarityId)
        .getIsPrismatic(false)
        .getIsGeneral(false)
        .getIsHiddenInCollection(false)
        .getIsSkinned(false)
        .getCards();
      var cardsInWartechSet = SDK.GameSession.getCardCaches()
        .getCardSet(SDK.CardSet.Wartech)
        .getFaction(factionId)
        .getRarity(rarityId)
        .getIsPrismatic(false)
        .getIsGeneral(false)
        .getIsHiddenInCollection(false)
        .getIsSkinned(false)
        .getCards();
      var cardsInCoreshatterSet = SDK.GameSession.getCardCaches()
        .getCardSet(SDK.CardSet.Coreshatter)
        .getFaction(factionId)
        .getRarity(rarityId)
        .getIsPrismatic(false)
        .getIsGeneral(false)
        .getIsHiddenInCollection(false)
        .getIsSkinned(false)
        .getCards();

      // Keep this code for next time we emphasize an 'incomplete' set
      //      if (rarityId == SDK.Rarity.Rare && factionId == SDK.Factions.Neutral)
      //        #No appearance rate change for neutral rares
      //        cardsInEmphasizedSet = []
      //        cardsInUnemphasizedSet = cardsInCoreShimzarAndBloodbornSet.concat(cardsInUnitySet)
      //      else
      //        cardsInEmphasizedSet = cardsInUnitySet
      //        cardsInUnemphasizedSet = cardsInCoreShimzarAndBloodbornSet

      // cardsInEmphasizedSet = cardsInCoreshatterSet
      var cardsInEmphasizedSet = [];
      var cardsInUnemphasizedSet = cardsInCoreSet
        .concat(cardsInShimzarSet)
        .concat(cardsInFirstWatchSet)
        .concat(cardsInCombinedSet)
        .concat(cardsInWartechSet)
        .concat(cardsInCoreshatterSet);

      // pick a card and attempt to avoid duplicates
      var cardId = null;
      var attemptsRemaining = 10;
      while (attemptsRemaining > 0 && (cardId === null || _.contains(cardIds, cardId))) {
        // choose set
        var cardsToChooseFrom;
        if (cardsInEmphasizedSet.length > 0 && Math.random() < 0.15) {
          cardsToChooseFrom = cardsInEmphasizedSet;
        } else {
          cardsToChooseFrom = cardsInUnemphasizedSet;
        }
        var card = cardsToChooseFrom[Math.floor(Math.random() * cardsToChooseFrom.length)];
        cardId = card.getId();
        attemptsRemaining--;
      }

      // Logger.module("GauntletModule").debug "_generateCardChoices() -> cardId: #{cardId}"
      cardIds.push(cardId);
    }

    // Give a chance for a rare to be swapped for a special gauntlet card
    if (round !== 14 && round !== 30) {
      // Do not offer gauntlet special card as last card or before guaranteed legendary
      if (rarities[0] === SDK.Rarity.Rare) {
        const chanceForSpecialGauntletCard = 0.3;
        random = Math.random();
        if (random < chanceForSpecialGauntletCard) {
          // replace a random card with a special gauntlet card
          const gauntletCardIds = SDK.GameSession.getCardCaches()
            .getCardSet(SDK.CardSet.GauntletSpecial)
            .getIsPrismatic(false)
            .getIsGeneral(false)
            .getIsSkinned(false)
            .getCardIds();
          cardIds[_.random(0, 2)] = _.sample(gauntletCardIds);
        }
      }
    }

    // Logger.module("GauntletModule").debug "_generateCardChoices() -> cardIds:",cardIds
    return GauntletModule._getSkinnedCardChoices(txPromise, tx, userId, cardIds).then(
      (skinnedCardIds) =>
        GauntletModule._getPrismaticCardChoices(txPromise, tx, userId, skinnedCardIds),
    );
  }

  /**
   * Generate a set of general choices, drawn from every playable faction --
   * a gauntlet run picks its general first, so this is deliberately not
   * faction-scoped. (The old doc claimed a factionId param the body never had.)
   * @private
   * @param  {Promise}  txPromise KNEX transaction promise
   * @param  {Transaction}  tx KNEX transaction to attach this operation to.
   * @param  {String}  userId    User ID for which to generate cards.
   * @return  {Promise}            Promise that resolves with an array of card IDs.
   */
  static _generateGeneralChoices(txPromise, tx, userId) {
    // get all general ids
    const allGeneralIds = [];
    const allFactions = SDK.FactionFactory.getAllPlayableFactions();
    for (var faction of Array.from<any>(allFactions)) {
      var generalIdsForFaction = SDK.FactionFactory.generalIdsForFaction(faction.id);
      for (var generalId of Array.from<any>(generalIdsForFaction)) {
        allGeneralIds.push(generalId);
      }
    }

    const generalChoiceIds = _.sample(allGeneralIds, 4);

    return GauntletModule._getSkinnedCardChoices(txPromise, tx, userId, generalChoiceIds).then(
      (skinnedGeneralIds) =>
        GauntletModule._getPrismaticCardChoices(txPromise, tx, userId, skinnedGeneralIds),
    );
  }

  /**
   * Get skinned versions of a list of card choices for gauntlet. Picks at random from the skins the user owns for each card.
   * @private
   * @param  {Promise}  txPromise KNEX transaction promise
   * @param  {Transaction}  tx KNEX transaction to attach this operation to.
   * @param  {String}  userId
   * @param {Array} cardIds
   * @return  {Promise} Promise that resolves with an array of skinned card IDs
   */
  static _getSkinnedCardChoices(txPromise, tx, userId, cardIds) {
    return new Promise(function (resolve, reject) {
      const cardIdsOut = [];

      return PromiseUtils.map(cardIds, (cardId) =>
        GauntletModule._getSkinnedCardChoice(txPromise, tx, userId, cardId).then((skinnedCardId) =>
          cardIdsOut.push(skinnedCardId),
        ),
      )
        .then(() => resolve(cardIdsOut))
        .catch((error) => reject(error));
    });
  }

  /**
   * Get a skinned version of a card choice for gauntlet. Picks at random from the skins the user owns for a card.
   * @private
   * @param  {Promise}  txPromise KNEX transaction promise
   * @param  {Transaction}  tx KNEX transaction to attach this operation to.
   * @param  {String}  userId
   * @param {Number} cardId
   * @return  {Promise} promise that resolves with a skinned card ID
   */
  static _getSkinnedCardChoice(txPromise, tx, userId, cardId) {
    const cardSkinIds = SDK.CosmeticsFactory.cardSkinIdsForCard(cardId);
    if (cardSkinIds.length === 0) {
      return Promise.resolve(cardId);
    } else {
      return InventoryModule.filterUsableCosmetics(
        txPromise,
        tx,
        userId,
        cardSkinIds,
        SDK.CosmeticsTypeLookup.CardSkin,
      ).then(function (usableSkinIds) {
        if (usableSkinIds.length <= 0) {
          return cardId;
        } else {
          return SDK.Cards.getCardIdForCardSkinId(
            usableSkinIds[Math.floor(Math.random() * usableSkinIds.length)],
          );
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

  /**
   * Get static reward map that corresponds the the arena reward table.
   * @private
   * @return  {Object}          Static reward map.
   */
  static _getRewardMap() {
    if (!this.rewardMap) {
      // ((\d+) ([A-Z]{1})(\w+))\s
      // "\2 \3",

      // (\w+) Card\s
      // SDK.Rarity.\1,

      // Great Box \((\d)\)\s+
      // great_box_wins[\1] = [

      const basic_box_wins = {}; // average quantity: ~52.245
      basic_box_wins[0] = ['5 S', '10 S', '15 S', '15 S', '20 S', '20 S', '5 G', '10 G'];
      basic_box_wins[1] = ['10 S', '15 S', '20 S', '20 S', '25 S', '30 S', '15 G', '20 G'];
      basic_box_wins[2] = ['15 S', '20 S', '25 S', '25 S', '30 S', '35 S', '20 G', '20 G', '25 G'];
      basic_box_wins[3] = ['25 S', '30 S', '35 S', '35 S', '40 S', '45 S', '10 G', '10 G', '15 G'];
      basic_box_wins[4] = ['35 S', '40 S', '45 S', '50 S', '55 S', '60 S', '15 G', '20 G', '20 G'];
      basic_box_wins[5] = ['40 S', '45 S', '50 S', '55 S', '60 S', '65 S', '20 G', '20 G', '25 G'];
      basic_box_wins[6] = ['45 S', '50 S', '55 S', '60 S', '65 S', '70 S', '25 G', '25 G', '30 G'];
      basic_box_wins[7] = ['50 S', '55 S', '60 S', '65 S', '70 S', '75 S', '30 G', '30 G', '35 G'];
      basic_box_wins[8] = ['60 S', '65 S', '70 S', '75 S', '80 S', '85 S', '35 G', '35 G', '40 G'];
      basic_box_wins[9] = ['70 S', '75 S', '80 S', '85 S', '90 S', '95 S', '40 G', '40 G', '45 G'];
      basic_box_wins[10] = [
        '80 S',
        '85 S',
        '90 S',
        '95 S',
        '100 S',
        '105 S',
        '45 G',
        '45 G',
        '45 G',
        '50 G',
      ];
      basic_box_wins[11] = [
        '100 S',
        '105 S',
        '110 S',
        '115 S',
        '120 S',
        '125 S',
        '50 G',
        '50 G',
        '55 G',
        '55 G',
      ];
      basic_box_wins[12] = [
        '120 S',
        '125 S',
        '130 S',
        '135 S',
        '140 S',
        '145 S',
        '60 G',
        '60 G',
        '65 G',
        '65 G',
      ];

      const gold_box_wins = {}; // average quantity: 62.5
      gold_box_wins[3] = ['15 G', '20 G'];
      gold_box_wins[4] = ['25 G', '30 G'];
      gold_box_wins[5] = ['35 G', '40 G'];
      gold_box_wins[6] = ['45 G', '50 G'];
      gold_box_wins[7] = ['55 G', '60 G'];
      gold_box_wins[8] = ['65 G', '70 G'];
      gold_box_wins[9] = ['75 G', '80 G'];
      gold_box_wins[10] = ['85 G', '90 G'];
      gold_box_wins[11] = ['95 G', '100 G'];
      gold_box_wins[12] = ['105 G', '110 G'];

      const good_box_wins = {};
      good_box_wins[3] = [
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Epic,
      ];
      good_box_wins[4] = [
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Epic,
      ];
      good_box_wins[5] = [
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Epic,
      ];
      good_box_wins[6] = [
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Epic,
      ];
      good_box_wins[7] = [
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Epic,
      ];
      good_box_wins[8] = [
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Epic,
      ];
      good_box_wins[9] = [
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Epic,
      ];
      good_box_wins[10] = [
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Epic,
      ];
      good_box_wins[11] = [
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Epic,
      ];
      good_box_wins[12] = [
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Common,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Epic,
      ];

      const great_box_wins = {};
      great_box_wins[10] = [
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Epic,
        SDK.Rarity.Epic,
        SDK.Rarity.Epic,
        SDK.Rarity.Epic,
        SDK.Rarity.Epic,
        SDK.Rarity.Legendary,
      ];
      great_box_wins[11] = [
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Epic,
        SDK.Rarity.Epic,
        SDK.Rarity.Epic,
        SDK.Rarity.Epic,
        SDK.Rarity.Epic,
        SDK.Rarity.Legendary,
      ];
      great_box_wins[12] = [
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Epic,
        SDK.Rarity.Epic,
        SDK.Rarity.Epic,
        SDK.Rarity.Epic,
        SDK.Rarity.Epic,
        SDK.Rarity.Legendary,
      ];

      const awesome_box_wins = {};
      awesome_box_wins[12] = [
        SDK.Rarity.Rare,
        SDK.Rarity.Rare,
        SDK.Rarity.Epic,
        SDK.Rarity.Epic,
        SDK.Rarity.Epic,
        SDK.Rarity.Epic,
        SDK.Rarity.Legendary,
        SDK.Rarity.Legendary,
        '1 ORB',
        '1 ORB',
      ];

      this.rewardMap = {
        basic_box_wins,
        gold_box_wins,
        good_box_wins,
        great_box_wins,
        awesome_box_wins,
      };
    }

    return this.rewardMap;
  }
}
GauntletModule._GAUNTLET_SPIRIT_ORB_REWARD_SETS = [
  SDK.CardSet.Core,
  SDK.CardSet.Shimzar,
  SDK.CardSet.FirstWatch,
  SDK.CardSet.Wartech,
  SDK.CardSet.CombinedUnlockables,
  SDK.CardSet.Coreshatter,
];

module.exports = GauntletModule;
