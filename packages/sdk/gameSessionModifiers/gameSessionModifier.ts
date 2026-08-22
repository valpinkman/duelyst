/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifier = require('@duelyst/sdk/playerModifiers/playerModifier');

class GameSessionModifier extends PlayerModifier {
  declare type: any;

  static type = 'GameSessionModifier';
}
GameSessionModifier.prototype.type = 'GameSessionModifier';

// use this for modifiers that should be treated as if they belong to game session
// really a player modifier but need to be able to differentiate this from standard Player Modifiers

module.exports = GameSessionModifier;
