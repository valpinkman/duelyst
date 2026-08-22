/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Sandbox = require('./sandbox');
const Deck = require('@duelyst/sdk/cards/deck');

class SandboxDeveloper extends Sandbox {
  declare type: any;
  declare skipMulligan: any;

  static type = 'SandboxDeveloper';

  setupSessionModes(gameSession) {
    super.setupSessionModes(gameSession);
    return gameSession.setIsDeveloperMode(true);
  }
}
SandboxDeveloper.prototype.type = 'SandboxDeveloper';
SandboxDeveloper.prototype.skipMulligan = true;

module.exports = SandboxDeveloper;
