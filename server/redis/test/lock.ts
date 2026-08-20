/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const { promisify } = require('util');
const _ = require('underscore');
const r = require('../r-client');
const tk = require('../r-tokenmanager')(r);

const playerId1 = 'tonyfoo';
const playerId2 = 'tonytwo';
const lock1 = tk.lock(playerId1).catch((err) => console.log(err));
const lock2 = tk.lock(playerId2).catch((err) => console.log(err));
let unlock1 = null;
let unlock2 = null;

const checklocks = function () {
  const isLocked1 = tk.isLocked(playerId1);
  const isLocked2 = tk.isLocked(playerId2);
  return Promise.all([isLocked1, isLocked2]).then(([locked1, locked2]) => {
    console.log(`lock1 is ${locked1}`);
    return console.log(`lock2 is ${locked2}`);
  });
};

const locks = Promise.all([lock1, lock2]).then(([unlockFn1, unlockFn2]) => {
  console.log(`lock1 acquired: ${_.isFunction(unlockFn1)}`);
  console.log(`lock2 acquired: ${_.isFunction(unlockFn2)}`);
  unlock1 = promisify(unlockFn1);
  return unlock2 = promisify(unlockFn2);
}).then(() => {
  console.log('locking done...');
  checklocks();
  return Promise.all([unlock1(), unlock2()]).then(([result1, result2]) => {
    console.log(`unlock1 success: ${Boolean(result1)}`);
    return console.log(`unlock2 success: ${Boolean(result1)}`);
  }).then(() => {
    console.log('unlocking done...');
    return checklocks();
  });
});
