/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Promise = require('bluebird');
const _ = require('underscore');
const r = require('../r-client');
const ts = require('../r-timeseries');

const t = new ts(r);

const hits = [];
for (let i = 0; i <= 999; i++) {
  hits.push(t.hit());
}

Promise.all(hits).then(() => {
  console.log('1000 hits created.');

  t.query(2).then((scores) => {
    console.log('Scores:');
    return console.log(scores);
  });

  return t.countHits().then((count) => console.log(`Hits: ${count}`));
});
