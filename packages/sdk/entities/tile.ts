/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const Entity = require('./entity');
const CardType = require('@duelyst/sdk/cards/cardType');
const _ = require('underscore');

class Tile extends Entity {
  declare type: any;
  declare name: any;
  declare hp: any;
  declare maxHP: any;
  declare manaCost: any;
  declare isTargetable: any;
  declare isObstructing: any;
  declare depleted: any;
  declare dieOnDepleted: any;
  declare obstructsOtherTiles: any;
  declare canBeDispelled: any;
  declare cleanse: any;
  declare dispel: any;
  declare static type: any;

  getPrivateDefaults(gameSession) {
    const p = super.getPrivateDefaults(gameSession);

    p.occupant = null; // current entity occupying tile
    p.occupantChangingAction = null; // action that caused current unit to occupy tile

    return p;
  }

  getCanBeAppliedAnywhere() {
    return true;
  }

  silence() {
    if (this.canBeDispelled) {
      // silence/cleanse/dispel kills tiles
      return this.getGameSession().executeAction(this.actionDie());
    }
  }

  // region OCCUPANT

  setOccupant(occupant) {
    if (this._private.occupant !== occupant) {
      this._private.occupant = occupant;
      return (this._private.occupantChangingAction = this.getGameSession().getExecutingAction());
    }
  }

  getOccupant() {
    return this._private.occupant;
  }

  getOccupantChangingAction() {
    return this._private.occupantChangingAction;
  }

  setDepleted(depleted) {
    this.depleted = depleted;
    if (this.depleted && this.getDieOnDepleted()) {
      return this.getGameSession().executeAction(this.actionDie());
    }
  }

  getDepleted() {
    return this.depleted;
  }

  getDieOnDepleted() {
    return this.dieOnDepleted;
  }

  // endregion OCCUPANT

  getObstructsOtherTiles() {
    return this.obstructsOtherTiles;
  }
}
Tile.prototype.type = CardType.Tile;
Tile.type = CardType.Tile;
Tile.prototype.name = 'Tile';
Tile.prototype.hp = 0;
Tile.prototype.maxHP = 0;
Tile.prototype.manaCost = 0;
Tile.prototype.isTargetable = false;
Tile.prototype.isObstructing = false;
Tile.prototype.depleted = false;
Tile.prototype.dieOnDepleted = true;
Tile.prototype.obstructsOtherTiles = false;
Tile.prototype.canBeDispelled = true;
Tile.prototype.cleanse = Tile.prototype.silence;
Tile.prototype.dispel = Tile.prototype.silence;

module.exports = Tile;
