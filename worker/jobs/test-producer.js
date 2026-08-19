// Job Producer
// Test Script
const jobs = require('../../server/redis/r-jobs');
const util = require('util');

// Dummy data to test
const gameId = 1;
const userId = 1;

// Job: Archive Game
jobs.create('archive-game', {
  title: util.format('Archiving Game %s', gameId),
  gameId,
},
).save();

// Job: Update User Ranking
jobs.create('update-user-ranking', {
  title: util.format('User %s :: Update Ranking', userId),
  userId,
  gameId,
  isWinner: true,
},
).save();

// Job: Update User Progression
jobs.create('update-user-progression', {
  title: util.format('User %s :: Update Progression', userId),
  userId,
  gameId,
  isWinner: true,
},
).save();

// Job: Update User Quests
jobs.create('update-user-quests', {
  title: util.format('User %s :: Update Quests', userId),
  userId,
  gameId,
},
).save();

// Job: Update User Stats
jobs.create('update-user-stats', {
  title: util.format('User %s :: Update Stats', userId),
  userId,
  gameId,
},
).save();
