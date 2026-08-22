/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const Logger = require('app/common/logger');
const Entity = require('./entity');
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierStrikeback = require('@duelyst/sdk/modifiers/modifierStrikeback');
const PlayerModifierBattlePetManager = require('@duelyst/sdk/playerModifiers/playerModifierBattlePetManager');

const _ = require('underscore');

class Unit extends Entity {
  declare type: any;
  declare name: any;
  declare isTargetable: any;
  declare isObstructing: any;
  declare hp: any;
  declare maxHP: any;
  declare speed: any;
  declare reach: any;
  declare static type: any;

  onApplyToBoard(board, x, y, sourceAction) {
    super.onApplyToBoard(board, x, y, sourceAction);

    // spawn units as exhausted
    return this.applyExhaustion();
  }

  onApplyModifiersForApplyToNewLocation() {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      // unit base modifiers should always be applied first
      // they should always react before any card specific modifiers

      // generals manage their battle pets
      let contextObject;
      if (this.getIsGeneral() && !this.hasModifierClass(PlayerModifierBattlePetManager)) {
        contextObject = PlayerModifierBattlePetManager.createContextObject();
        contextObject.isInherent = true;
        this.getGameSession().applyModifierContextObject(contextObject, this);
      }

      // all units strikeback
      if (!this.hasModifierClass(ModifierStrikeback)) {
        contextObject = ModifierStrikeback.createContextObject();
        contextObject.isInherent = true;
        this.getGameSession().applyModifierContextObject(contextObject, this);
      }
    }

    // apply card specific modifiers
    return super.onApplyModifiersForApplyToNewLocation();
  }
}
Unit.prototype.type = CardType.Unit;
Unit.type = CardType.Unit;
Unit.prototype.name = 'Unit';
Unit.prototype.isTargetable = true;
Unit.prototype.isObstructing = true;
Unit.prototype.hp = 1;
Unit.prototype.maxHP = 1;
Unit.prototype.speed = CONFIG.SPEED_BASE;
Unit.prototype.reach = CONFIG.REACH_MELEE;

module.exports = Unit;
