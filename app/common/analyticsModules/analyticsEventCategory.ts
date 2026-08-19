/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// Enum for the different types of Analytics Event Priority
// Lower numbers are lower priority, actual interger values are arbitrary

class AnalyticsEventCategory {
  static Marketing = 'marketing';
  static FTUE = 'first time user experience';
  static Game = 'game';
  static Quest = 'quest';
  static Chat = 'chat';
  static Matchmaking = 'matchmaking';
  static SpiritOrbs = 'spirit orbs';
  static Challenges = 'challenges';
  static Shop = 'shop';
  static Gauntlet = 'gauntlet';
  static Watch = 'watch';
  static Codex = 'codex';
  static Crate = 'crate';
  static Boss = 'boss';
  static Rift = 'rift';
  static Inventory = 'inventory';
  static Debug = 'debug';
}

module.exports = AnalyticsEventCategory;
