// Job Producer
// Test Script
const jobs = require('../../server/redis/r-jobs');
const util = require('util');

// Dummy data to test
const gameId = 1;
const userId = 1;

// Job: Archive Game
jobs.enqueue('archive-game', {
  title: util.format('Archiving Game %s', gameId),
  gameId,
});

// Job: Update User Ranking
jobs.enqueue('update-user-ranking', {
  title: util.format('User %s :: Update Ranking', userId),
  userId,
  gameId,
  isWinner: true,
});

// Job: Update User Progression
jobs.enqueue('update-user-progression', {
  title: util.format('User %s :: Update Progression', userId),
  userId,
  gameId,
  isWinner: true,
});

// Job: Update User Quests
jobs.enqueue('update-user-quests', {
  title: util.format('User %s :: Update Quests', userId),
  userId,
  gameId,
});

// Job: Update User Stats
jobs.enqueue('update-user-stats', {
  title: util.format('User %s :: Update Stats', userId),
  userId,
  gameId,
});
