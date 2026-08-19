/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Promise = require('bluebird');
const _ = require('underscore');
const r = require('../r-client');
const tk = require('../r-tokenmanager')(r);

/*
Simulates searching for a lock when given an array of player ids
Some players may be locked so it continues until it finds a lock
*/
const findLock = function (players) {
  if (players.length === 0) {
    console.log('No locks found...');
    return null;
  }

  // console.log "Players: " + players
  console.log(`Attempting to lock: ${players[0]}`);

  return tk.lock(players[0]).then((unlock) => {
    if (_.isFunction(unlock)) {
      console.log(`Lock acquired: ${players[0]}`);
      return { locked: players[0], unlock };
    }
    players = players.slice(1);
    return findLock(players);
  });
};

// List of a players
// Randomly lock two of them
const players = ['p6', 'p2', 'p3', 'p4', 'p5', 'p1', 'p7'];
const locked = _.sample(players, 2);
const randomlock1 = tk.lock(locked[0], 250).catch((err) => console.log(err));
const randomlock2 = tk.lock(locked[1], 250).catch((err) => console.log(err));

// Wait till locking is complete
Promise.join(randomlock1, randomlock2, () => {
  console.log(`Randomly locked players: ${locked}`);
  // Call find lock on array of players
  return findLock(players).then((lock) => console.log(`findLock() done: ${JSON.stringify(lock)}`));
});
