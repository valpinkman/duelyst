/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Promise = require('bluebird');
const util = require('util');
const FirebasePromises = require('../firebase_promises');
const DuelystFirebase = require('../duelyst_firebase_module');
const Logger = require('../../../app/common/logger');
const colors = require('colors');
const moment = require('moment');
const _ = require('underscore');
const SyncModule = require('./sync');
const InventoryModule = require('./inventory');
const UsersModule = require('./users');
const CONFIG = require('../../../app/common/config');
const Errors = require('../custom_errors');
const knex = require('./knex');
const config = require('../../../config/config.js');
const generatePushId = require('../../../app/common/generate_push_id');
const DataAccessHelpers = require('./helpers');

// redis
const { Redis, Jobs, GameManager } = require('../../redis');

class ReferralsModule {
  /**
   * Marks a user as referred by a friend and creates the referral record.
   * @public
   * @param  {String}  userId      User's ID
   * @param  {String}  referrerId    Referrer's ID
   * @return  {Promise}
   */
  static markUserAsReferredByFriend(userId, referrerId) {
    const _chainState: Record<string, any> = {};
    const MOMENT_NOW_UTC = moment().utc();
    const this_obj = {};

    var trxPromise = knex.transaction(function (tx) {
      Promise.all([
        tx('users').where('id', userId).first('id', 'referred_by_user_id', 'created_at', 'purchase_count', 'top_rank').forUpdate(),
        tx('users').where('id', referrerId).first('id', 'referred_by_user_id').forUpdate(),
        tx('user_progression').where('user_id', userId).first('game_count'),
      ])
        .bind(this_obj)
        .spread(function (userRow, referrerRow, progressionRow) {
          _chainState.userRow = userRow;

          if (!userRow || !referrerRow) {
            throw new Errors.NotFoundError('Could not find user or referrer.');
          }

          if (userRow.referred_by_user_id) {
            throw new Errors.AlreadyExistsError('This user already has a referral record.');
          }

          if (referrerRow.referred_by_user_id === userId) {
            throw new Errors.BadRequestError('User can not be marked as referred by one of their referrals.');
          }

          if (userId === referrerId) {
            throw new Errors.BadRequestError('Can not be marked as referred by self.');
          }

          const diff = MOMENT_NOW_UTC.valueOf() - moment.utc(userRow.created_at).valueOf();
          const duration = moment.duration(diff);

          // Logger.module("ReferralsModule").debug "markUserAsReferredByFriend() -> #{userId} days since registration - #{duration.asDays()}."

          if (duration.asDays() > 30) {
            throw new Errors.BadRequestError('Can not set referral info on players registered over 30 days ago.');
          }

          if ((progressionRow != null ? progressionRow.game_count : undefined) >= 1) {
            throw new Errors.BadRequestError('Can not set referral info on players who have played ranked games.');
          }

          return Promise.all([
            InventoryModule.giveUserGold(trxPromise, tx, userId, 100, 'referral code'),
            tx('users').where('id', userId).update({
              referred_by_user_id: referrerId,
            }),
            tx('user_referrals').insert({
              user_id: referrerId,
              referred_user_id: userId,
            }),
          ]);
        }).then(() => DuelystFirebase.connect().getRootRef())
        .then(function (rootRef) {
          const allPromises = [];
          allPromises.push(FirebasePromises.update(rootRef.child('users').child(userId), {
            referred_by_user_id: referrerId,
          }),
          );
          //
          //
          // allPromises.push(FirebasePromises.set(rootRef.child('users').child(userId).child("buddies").child(referrerId),{
          //   createdAt:MOMENT_NOW_UTC.valueOf()
          // }))
          // allPromises.push(FirebasePromises.set(rootRef.child('users').child(referrerId).child("buddies").child(userId),{
          //   createdAt:MOMENT_NOW_UTC.valueOf()
          // }))
          //
          return Promise.all(allPromises);
        })
        .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
        .then(tx.commit)
        .catch(tx.rollback);
    }).bind(this_obj)
      .then(function () { // backfill any events a user has achieved
        const allPromises = [];

        Logger.module('ReferralsModule').debug(`markUserAsReferredByFriend() -> ${userId} backfilling`, _chainState.userRow);

        // if the user has made any purchases
        if (_chainState.userRow.purchase_count > 0) {
          allPromises.push(ReferralsModule.processReferralEventForUser(userId, referrerId, 'purchase'));
        }

        // if the user has achieved any rank so far
        if (_chainState.userRow.top_rank) {
          if (_chainState.userRow.top_rank <= 20) {
            allPromises.push(ReferralsModule.processReferralEventForUser(userId, referrerId, 'silver'));
          }
          if (_chainState.userRow.top_rank <= 10) {
            allPromises.push(ReferralsModule.processReferralEventForUser(userId, referrerId, 'gold'));
          }
        }

        return Promise.all(allPromises);
      }).then(function () {
        Logger.module('ReferralsModule').debug(`markUserAsReferredByFriend() -> marked ${userId} with as referred by ${referrerId}`);
        return Promise.resolve(true);
      })
      .catch(function (e) {
        Logger.module('ReferralsModule').error(`markUserAsReferredByFriend() -> error marking ${userId} with friend ${referrerId}`);
        throw e;
      });
    return trxPromise;
  }

  /**
   * Update relevant referral data for a user generated referral event
   * @public
   * @param  {String}  userId      User ID.
   * @param  {String}  referrerId    Referrer ID.
   * @return  {Promise}          Promise that will resolve when complete
   */
  static processReferralEventForUser(userId, referrerId, eventType) {
    const _chainState: Record<string, any> = {};
    const MOMENT_NOW_UTC = moment().utc();
    const this_obj = {};

    return knex.transaction(function (tx) {
      Promise.all([
        tx('users').where('id', userId).first('referred_by_user_id').forUpdate(),
        tx('user_referrals').where('referred_user_id', userId).first().forUpdate(),
      ])
        .bind(this_obj)
        .spread(function (userRow, referralRow) {
          _chainState.userRow = userRow;

          if (!userRow.referred_by_user_id || (userRow.referred_by_user_id !== referrerId)) {
            throw new Errors.NotFoundError('Invalid referral process event request: user has invalid referrer');
          }

          if ((referralRow == null)) {
            throw new Errors.NotFoundError('Referral row not found');
          }

          Logger.module('ReferralsModule').debug(`processReferralEventForUser() -> \"${eventType}\" by user ${userId}`);

          const allPromises = [];
          allPromises.push(tx('user_referral_events').insert({
            referrer_id: referralRow.user_id,
            referred_user_id: userId,
            event_type: eventType,
            created_at: MOMENT_NOW_UTC.toDate(),
          }),
          );

          let levelReached = 0;
          switch (eventType) {
          case 'silver': levelReached = 1; break;
          case 'gold': levelReached = 2; break;
          }

          if (referralRow.level_reached < levelReached) {
            _chainState.claimableReferralRewardsUpdated = true;

            allPromises.push(tx('user_referrals').where('referred_user_id', userId).update({
              level_reached: levelReached,
              updated_at: MOMENT_NOW_UTC.toDate(),
            }),
            );

            allPromises.push(tx('users').where('id', referralRow.user_id).update({
              referral_rewards_updated_at: MOMENT_NOW_UTC.toDate(),
            }),
            );

            Logger.module('ReferralsModule').debug(`processReferralEventForUser() -> notifiying ${referralRow.user_id} of reward via ${userId}`);

            // fire this off async
            UsersModule.inGameNotify(referralRow.user_id, 'you have a new referral reward', 'referral');
          }

          return Promise.all(allPromises);
        }).then(function () {
          if (eventType === 'purchase') {
          // kick off a job to process this referral event
            return Jobs.create('update-user-achievements', {
              name: 'Process User Referral Achievements',
              title: util.format('User %s :: Received Achievement Eligble Referral Event %s', _chainState.userRow.referred_by_user_id, 'purchase'),
              userId: _chainState.userRow.referred_by_user_id,
              referralEventType: 'purchase',
            },
            ).removeOnComplete(true).ttl(15000).save();
          }
        })
        .then(() => DuelystFirebase.connect().getRootRef())
        .then(function (rootRef) {
          if (_chainState.claimableReferralRewardsUpdated) {
            return FirebasePromises.update(rootRef.child('users').child(referrerId), { referral_rewards_updated_at: MOMENT_NOW_UTC.valueOf() });
          } else {
            return Promise.resolve(true);
          }
        })
        .then(tx.commit)
        .catch(tx.rollback);
    });
  }

  /**
   * Claim any un-claimed referral rewards
   * @public
   * @param  {String}  userId      User ID.
   * @return  {Promise}          Promise that will resolve when complete
   */
  static claimReferralRewards(userId) {
    const _chainState: Record<string, any> = {};
    const MOMENT_NOW_UTC = moment().utc();
    const this_obj = {};

    var trxPromise = knex.transaction(function (tx) {
      tx('users').where('id', userId).first('id', 'referral_rewards_claimed_at', 'referral_rewards_updated_at').forUpdate()
        .bind(this_obj)
        .then(function (userRow) {
        // Logger.module("ReferralsModule").debug "claimReferralRewards() -> user #{userId}", userRow

          if (!userRow.referral_rewards_updated_at || (userRow.referral_rewards_claimed_at > userRow.referral_rewards_updated_at)) {
            throw new Errors.BadRequestError('No new rewards available');
          }

          if (userRow.referral_rewards_claimed_at == null) { userRow.referral_rewards_claimed_at = moment.utc(0); }
          return tx('user_referral_events').where('referrer_id', userId).andWhere('created_at', '>', userRow.referral_rewards_claimed_at);
        })
        .then(function (referralEventRows) {
          const allPromises = [];

          const rewards = (_chainState.rewards = []);

          // for each referral event type, check for unclaimed rewards
          for (var referralEvent of Array.from<any>(referralEventRows)) {
            if (referralEvent.event_type === 'silver') {
              rewards.push({
                id: generatePushId(),
                user_id: userId,
                reward_category: 'referral',
                reward_type: referralEvent.event_type,
                source_id: referralEvent.referred_user_id,
                created_at: MOMENT_NOW_UTC.toDate(),
                spirit_orbs: 1,
                is_unread: true,
              });

              allPromises.push(InventoryModule.addBoosterPackToUser(trxPromise, tx, userId, 1, 'referral', `${referralEvent.referred_user_id}:${referralEvent.event_type}`));
            }

            if (referralEvent.event_type === 'gold') {
              rewards.push({
                id: generatePushId(),
                user_id: userId,
                reward_category: 'referral',
                reward_type: referralEvent.event_type,
                source_id: referralEvent.referred_user_id,
                created_at: MOMENT_NOW_UTC.toDate(),
                gold: 200,
                is_unread: true,
              });

              allPromises.push(InventoryModule.giveUserGold(trxPromise, tx, userId, 200, `referral ${referralEvent.event_type} reward`));
            }
          }

          // if referralEvent.event_type == "purchase"
          //
          //   rewards.push
          //     id:          generatePushId()
          //     user_id:       userId
          //     reward_category:   'referral'
          //     reward_type:     referralEvent.event_type
          //     source_id:       referralEvent.referred_user_id
          //     created_at:     MOMENT_NOW_UTC.toDate()
          //     gold:        10
          //     is_unread:      true
          //
          //   allPromises.push InventoryModule.giveUserGold(trxPromise,tx,userId,10,"referral #{referralEvent.event_type} reward")

          for (var reward of Array.from<any>(rewards)) {
            allPromises.push(tx('user_rewards').insert(reward));
          }

          // if we've recieved any rewards, mark our referral code as claimed
          if (allPromises.length > 0) {
            allPromises.push(tx('users').where('id', userId).update({
              referral_rewards_claimed_at: MOMENT_NOW_UTC.toDate(),
            }),
            );
          }

          return Promise.all(allPromises);
        })
        .then(() => DuelystFirebase.connect().getRootRef())
        .then((rootRef) => FirebasePromises.update(rootRef.child('users').child(userId), { referral_rewards_claimed_at: MOMENT_NOW_UTC.valueOf() }))
        .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
        .then(tx.commit)
        .catch(tx.rollback);
    }).bind(this_obj)
      .then(function () {
        Logger.module('ReferralsModule').debug(`claimReferralRewards() -> user ${userId} rewards`, _chainState.rewards);
        return _chainState.rewards;
      });

    return trxPromise;
  }
}

module.exports = ReferralsModule;
