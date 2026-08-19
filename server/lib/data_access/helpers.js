/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const moment = require('moment');
const changeCase = require('change-case');

module.exports.updateCounterWithGameOutcome = function (counter, isWinner, isDraw, isUnscored) {
  counter = counter || {};
  if (counter.game_count == null) { counter.game_count = 0; }
  if (counter.win_count == null) { counter.win_count = 0; }
  if (counter.loss_count == null) { counter.loss_count = 0; }
  if (counter.draw_count == null) { counter.draw_count = 0; }
  if (counter.unscored_count == null) { counter.unscored_count = 0; }
  if (counter.win_streak == null) { counter.win_streak = 0; }
  if (counter.loss_streak == null) { counter.loss_streak = 0; }
  if (counter.top_win_streak == null) { counter.top_win_streak = 0; }
  if (counter.top_loss_streak == null) { counter.top_loss_streak = 0; }

  counter.game_count += 1;

  // update counts
  if (isDraw) {
    counter.draw_count += 1;
  } else if (isWinner) {
    counter.win_count += 1;
  } else {
    counter.loss_count += 1;
  }

  // update streaks unless draw
  if (!isDraw) {
    if (isWinner) {
      counter.loss_streak = 0;
      counter.win_streak += 1;
    } else {
      counter.win_streak = 0;
      counter.loss_streak += 1;
    }
  }

  if (isUnscored) {
    counter.unscored_count += 1;
  }

  if (counter.win_streak > counter.top_win_streak) {
    counter.top_win_streak = counter.win_streak;
  }

  if (counter.loss_streak > counter.top_loss_streak) {
    counter.top_loss_streak = counter.loss_streak;
  }

  return counter;
};

module.exports.restifyData = function (data) {
  if (data instanceof Array) {
    for (let i = 0; i < data.length; i++) {
      var item = data[i];
      data[i] = module.exports.restifyData(item);
    }
  } else {
    for (var key in data) {
      var val = data[key];
      if (val instanceof Date) {
        data[key] = moment.utc(val).valueOf();
      }
    }
  }

  return data;
};

module.exports.camelCaseData = function (data) {
  const newData = {};
  for (var key in data) {
    var val = data[key];
    newData[changeCase.camelCase(key)] = val;
  }

  return newData;
};

module.exports.snakeCaseData = function (data) {
  const newData = {};
  for (var key in data) {
    var val = data[key];
    newData[changeCase.snakeCase(key)] = val;
  }

  return newData;
};
