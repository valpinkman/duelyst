/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// Enum for the different types of Analytics Event Priority
// Lower numbers are lower priority, actual interger values are arbitrary

class AnalyticsEventPriority {
  static Critical = 5;
  static High = 4;
  static Medium = 3;
  static Low = 2;
  static Optional = 1;
}

module.exports = AnalyticsEventPriority;
