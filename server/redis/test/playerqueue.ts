/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Promise = require('bluebird');
const _ = require('underscore');
const r = require('../r-client');
const queue = require('../r-playerqueue');
const PromiseUtils = require('../../../app/common/utils/utils_promise');

const q = new queue(r);
// console.log(q)

const playerId1 = 'tonyfoo';
const playerId2 = 'tonytwo';
const divisions = ['bronze', 'silver', 'gold', 'diamond', 'elite'];
const randomDurationMs = () => (Math.floor(Math.random() * 10) + 1) * 60000;

// queue player 1
// then count, search, grab
const player1 = q.add(playerId1, 25);
let count = player1.then(() => q.count());
let search = player1.then(() => q.search());
let grab = player1.then(() => q.grab());
// get results of all
const queueUp1 = Promise.all([count, search, grab]).then((results) => console.log(results));

// queue player 2
// then count, search, grab
const player2 = q.add(playerId2, 25);
count = player2.then(() => q.count());
search = player2.then(() => q.search());
grab = player2.then(() => q.grab());
// get results of all
const queueUp2 = Promise.all([count, search, grab]).then((results) => console.log(results));

// mark a bunch of matches as made
const markHits = Promise.all([queueUp1, queueUp2]).then(() => // mark 100 matches as 'hits' for random divisions
  __range__(1, 100, true).map((i) =>
    q.matchMade(_.sample(divisions), randomDurationMs())));

markHits.then(() => {
  console.log('marking hits done');
  return PromiseUtils.map(divisions, (division) => {
    console.log(`getting queue velocity for ${division}`);
    return q.velocity(division);
  }).then((results) => {
    // console.log results
    let minutes;
    return minutes = _.map(results, (value) => value / 60000);
  });
});
// console.log minutes

function __range__(left, right, inclusive) {
  const range = [];
  const ascending = left < right;
  const end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}
