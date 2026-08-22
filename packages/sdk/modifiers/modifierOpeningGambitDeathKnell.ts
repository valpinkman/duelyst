/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('@duelyst/common/config');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const CardType = require('@duelyst/sdk/cards/cardType');
const PlayCardSilentlyAction = require('@duelyst/sdk/actions/playCardSilentlyAction');
const Races = require('@duelyst/sdk/cards/racesLookup');
const _ = require('underscore');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitDeathKnell extends ModifierOpeningGambit {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitDeathKnell';
  static description = 'Resummon all friendly Arcanysts destroyed this game nearby';

  getPrivateDefaults(gameSession) {
    const p = super.getPrivateDefaults(gameSession);

    p.deadUnits = null;

    return p;
  }

  getDeadUnits() {
    if (this._private.deadUnits == null) {
      this._private.deadUnits = this.getGameSession().getDeadUnits(this.getOwnerId());
    }
    return this._private.deadUnits;
  }

  onOpeningGambit() {
    super.onOpeningGambit();

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const deadArcanystIds = [];
      for (var unit of Array.from<any>(this.getDeadUnits())) {
        if (unit.getBelongsToTribe(Races.Arcanyst)) {
          deadArcanystIds.push(unit.getId());
        }
      }

      if (deadArcanystIds.length > 0) {
        let i;
        let asc;
        let end;
        const card = this.getGameSession().getExistingCardFromIndexOrCachedCardFromData({
          id: this.getCard().getId(),
        });
        const spawnLocations = [];
        _.shuffle(deadArcanystIds);
        const validSpawnLocations = UtilsGameSession.getSmartSpawnPositionsFromPattern(
          this.getGameSession(),
          this.getCard().getPosition(),
          CONFIG.PATTERN_3x3,
          this.getCard(),
        );
        for (
          i = 0, end = deadArcanystIds.length, asc = end >= 0;
          asc ? i < end : i > end;
          asc ? i++ : i--
        ) {
          if (validSpawnLocations.length > 0) {
            spawnLocations.push(
              validSpawnLocations.splice(
                this.getGameSession().getRandomIntegerForExecution(validSpawnLocations.length),
                1,
              )[0],
            );
          } else {
            break;
          }
        }

        return (() => {
          const result = [];
          for (i = 0; i < spawnLocations.length; i++) {
            var position = spawnLocations[i];
            var playCardAction = new PlayCardSilentlyAction(
              this.getGameSession(),
              this.getCard().getOwnerId(),
              position.x,
              position.y,
              { id: deadArcanystIds[i] },
            );
            playCardAction.setSource(this.getCard());
            result.push(this.getGameSession().executeAction(playCardAction));
          }
          return result;
        })();
      }
    }
  }
}
ModifierOpeningGambitDeathKnell.prototype.type = 'ModifierOpeningGambitDeathKnell';
ModifierOpeningGambitDeathKnell.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambitDeathKnell',
];

module.exports = ModifierOpeningGambitDeathKnell;
