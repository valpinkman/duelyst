const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const chai = require('chai');

const { expect } = chai;
const _ = require('underscore');
const moment = require('moment');
const DuelystFirebase = require('@duelyst/server/lib/duelyst_firebase_module');
const Errors = require('@duelyst/server/lib/custom_errors');
const UsersModule = require('@duelyst/server/lib/data_access/users');
const GamesModule = require('@duelyst/server/lib/data_access/games');
const QuestsModule = require('@duelyst/server/lib/data_access/quests');
const SyncModule = require('@duelyst/server/lib/data_access/sync');
const InventoryModule = require('@duelyst/server/lib/data_access/inventory');
const FirebasePromises = require('@duelyst/server/lib/firebase_promises');
const generatePushId = require('@duelyst/common/generate_push_id');
const config = require('../../../config/config');
const Logger = require('@duelyst/common/logger');
const SDK = require('@duelyst/sdk/index');
const knex = require('@duelyst/server/lib/data_access/knex');
const NewPlayerProgressionStageEnum = require('@duelyst/sdk/progression/newPlayerProgressionStageEnum');
const { onType } = require('@duelyst/common/utils/utils_promise');

// disable the logger for cleaner test output
Logger.enabled = Logger.enabled && false;

describe('sync module', () => {
  /*
   * Assigned by the beforeAll below. It was `const` here and `const` again
   * inside the beforeAll's callback, so the inner declaration shadowed rather
   * than assigned and every test saw null -- which surfaced as "Could not find
   * user" from data_access/sync rather than as anything about the test setup.
   */
  let userId = null;
  let user2Id = null;

  // before cleanup to check if user already exists and delete
  beforeAll(() => {
    Logger.module('UNITTEST').log('creating user');
    const createOrInsertUser = function (userEmail, userName) {
      const _chainState = {};
      return UsersModule.createNewUser(userName, 'hash', 'kumite14')
        .then((userIdCreated) => {
          _chainState.userId = userIdCreated;
          Logger.module('UNITTEST').log('created user ', userIdCreated);
        })
        .catch(
          onType(Errors.AlreadyExistsError, (error) => {
            Logger.module('UNITTEST').log('existing user', userName);
            return UsersModule.userIdForUsername(userName)
              .then((userIdExisting) => {
                _chainState.userId = userIdExisting;
                Logger.module('UNITTEST').log('existing user retrieved', userIdExisting);
                return SyncModule.wipeUserData(userIdExisting);
              })
              .then(() => {
                Logger.module('UNITTEST').log('existing user data wiped', _chainState.userId);
              });
          }),
        )
        .then(() => Promise.resolve(_chainState.userId));
    };

    return Promise.all([
      createOrInsertUser('unit-test-1@duelyst.local', 'player 1', 0),
      createOrInsertUser('unit-test-2@duelyst.local', 'player 2', 0),
    ]).then(([player1CreatedId, player2CreatedId]) => {
      userId = player1CreatedId;
      user2Id = player2CreatedId;
    });
  });

  describe('_syncUserFromSQLToFirebase()', () => {
    it('card-collection in firebase to be removed if user collection data empty in SQL', () => {
      const _chainState = {};
      const txPromise = knex
        .transaction((tx) => {
          InventoryModule.giveUserCards(txPromise, tx, userId, [20157, 10974, 20052, 10014, 10965])
            .then(() => {
              tx.commit();
            })
            .catch((e) => {
              Logger.module('UNITTEST').log(e);
              tx.rollback();
            });
        })
        .then(() => SyncModule._syncUserFromSQLToFirebase(userId))
        .then(() => DuelystFirebase.connect().getRootRef())
        .then((rootRef) => {
          _chainState.rootRef = rootRef;
          return Promise.all([
            knex.select().from('user_cards').where({ user_id: userId }),
            knex.first().from('user_card_collection').where({ user_id: userId }),
            FirebasePromises.once(
              _chainState.rootRef.child('user-inventory').child(userId).child('card-collection'),
              'value',
            ),
          ]);
        })
        .then(([cardCountRows, cardCollection, fbCardCollection]) => {
          expect(cardCountRows.length).to.equal(5);
          expect(_.keys(fbCardCollection.val()).length).to.equal(5);
        })
        .then(() => SyncModule.wipeUserData(userId))
        .then(() => SyncModule._syncUserFromSQLToFirebase(userId))
        .then(() =>
          FirebasePromises.once(
            _chainState.rootRef.child('user-inventory').child(userId).child('card-collection'),
            'value',
          ),
        )
        .then((fbCardCollection) => {
          expect(fbCardCollection.val()).to.equal(null);
        });

      return txPromise;
    });
  });
});
