const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const chai = require('chai');

const { expect } = chai;
const Promise = require('bluebird');
const _ = require('underscore');
const moment = require('moment');
const DuelystFirebase = require('../../../server/lib/duelyst_firebase_module');
const Errors = require('../../../server/lib/custom_errors');
const UsersModule = require('../../../server/lib/data_access/users');
const GamesModule = require('../../../server/lib/data_access/games');
const QuestsModule = require('../../../server/lib/data_access/quests');
const SyncModule = require('../../../server/lib/data_access/sync');
const InventoryModule = require('../../../server/lib/data_access/inventory');
const FirebasePromises = require('../../../server/lib/firebase_promises');
const generatePushId = require('../../../app/common/generate_push_id');
const config = require('../../../config/config');
const Logger = require('../../../app/common/logger');
const SDK = require('../../../app/sdk/index');
const knex = require('../../../server/lib/data_access/knex');
const NewPlayerProgressionStageEnum = require('../../../app/sdk/progression/newPlayerProgressionStageEnum');
const { onType } = require('../../../app/common/utils/utils_promise');

// disable the logger for cleaner test output
Logger.enabled = Logger.enabled && false;

describe('sync module', () => {
  const userId = null;

  // before cleanup to check if user already exists and delete
  beforeAll(() => {
    Logger.module('UNITTEST').log('creating user');
    const createOrInsertUser = function (userEmail, userName) {
      const _chainState = {};
      return UsersModule.createNewUser(userEmail, userName, 'hash', 'kumite14')
        .then((userIdCreated) => {
          _chainState.userId = userIdCreated;
          Logger.module('UNITTEST').log('created user ', userIdCreated);
        }).catch(onType(Errors.AlreadyExistsError, function (error) {
          const _chainState = {};
          Logger.module('UNITTEST').log('existing user', userName);
          return UsersModule.userIdForEmail(userEmail)
            .bind(this)
            .then((userIdExisting) => {
              _chainState.userId = userIdExisting;
              Logger.module('UNITTEST').log('existing user retrieved', userIdExisting);
              return SyncModule.wipeUserData(userIdExisting);
            }).then(() => {
              Logger.module('UNITTEST').log('existing user data wiped', _chainState.userId);
            });
        }))
        .then(() => Promise.resolve(_chainState.userId));
    };

    return Promise.all([
      createOrInsertUser('unit-test-1@duelyst.local', 'player 1', 0),
      createOrInsertUser('unit-test-2@duelyst.local', 'player 2', 0),
    ]).then(([player1CreatedId, player2CreatedId]) => {
      const userId = player1CreatedId;
      const user2Id = player2CreatedId;
    });
  });

  describe('_syncUserFromSQLToFirebase()', () => {
    it('card-collection in firebase to be removed if user collection data empty in SQL', () => {
      const _chainState = {};
      const txPromise = knex.transaction((tx) => {
        InventoryModule.giveUserCards(txPromise, tx, userId, [20157, 10974, 20052, 10014, 10965])
          .then(() => {
            tx.commit();
          })
          .catch((e) => {
            Logger.module('UNITTEST').log(e);
            tx.rollback();
          });
      }).then(() => SyncModule._syncUserFromSQLToFirebase(userId)).then(() => DuelystFirebase.connect().getRootRef())
        .then((rootRef) => {
          _chainState.rootRef = rootRef;
          return Promise.all([
            knex.select().from('user_cards').where({ user_id: userId }),
            knex.first().from('user_card_collection').where({ user_id: userId }),
            FirebasePromises.once(_chainState.rootRef.child('user-inventory').child(userId).child('card-collection'), 'value'),
          ]);
        })
        .then(([cardCountRows, cardCollection, fbCardCollection]) => {
          expect(cardCountRows.length).to.equal(5);
          expect(_.keys(fbCardCollection.val()).length).to.equal(5);
        })
        .then(() => SyncModule.wipeUserData(userId))
        .then(() => SyncModule._syncUserFromSQLToFirebase(userId))
        .then(() => FirebasePromises.once(_chainState.rootRef.child('user-inventory').child(userId).child('card-collection'), 'value'))
        .then((fbCardCollection) => {
          expect(fbCardCollection.val()).to.equal(null);
        });

      return txPromise;
    });
  });
});
