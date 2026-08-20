const _ = require('underscore');
const moment = require('moment');
const PromiseUtils = require('../../app/common/utils/utils_promise');

// var FirebasePromises = require('../lib/firebase_promises')
// var DuelystFirebase = require('../lib/duelyst_firebase_module')

exports.up = function (knex) {
  return Promise.all([
    knex.schema.createTable('user_ribbons', (table) => {
      table.string('user_id', 36).notNullable();
      table.string('ribbon_id', 36).notNullable();
      table.string('game_id', 36).notNullable();
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
      table.primary(['user_id', 'ribbon_id', 'created_at']);
    }),
    knex.schema.table('user_rewards', (table) => {
      table.specificType('ribbons', 'varchar[]');
    }),
    new Promise((resolve, reject) => {
      const _chainState = {};
      // add faction ribbons to existing users that have 100 wins with a faction or more
      knex('user_faction_progression').select('user_id', 'faction_id', 'win_count', 'last_game_id').where('win_count', '>', 99)
        .then((rows) => {
          _chainState.rows = rows;
        // return DuelystFirebase.connect().getRootRef()
        })
      // .then(function(rootRef){
        .then(() => PromiseUtils.map(_chainState.rows, (row) => {
          const allPromises = [];
          const ribbonCount = Math.floor(row.win_count / 100);
          const ribbonId = `f${row.faction_id}_champion`;
          _(ribbonCount).times((n) => {
            allPromises.push(knex('user_ribbons').insert({
              user_id: row.user_id,
              ribbon_id: ribbonId,
              game_id: row.last_game_id || 'n/a',
              created_at: moment().utc().add(n, 'milliseconds').toDate(),
            }));
          });
          /*
          // This code copies user ribbons from Postgres to Firebase.
          // TODO: Convert this into a script instead.
          allPromises.push(FirebasePromises.set(rootRef.child("user-ribbons").child(row["user_id"]).child(ribbonId),{
            ribbon_id: ribbonId,
            count: ribbonCount,
            updated_at: moment().utc().valueOf()
          }))
          */
          return Promise.all(allPromises);
        }, { concurrency: 20 }))
        .then(resolve)
        .catch(reject);
    }),
  ]);
};

exports.down = function (knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('user_ribbons'),
    knex.schema.table('user_rewards', (table) => {
      table.dropColumn('ribbons');
    }),
  ]);
};
