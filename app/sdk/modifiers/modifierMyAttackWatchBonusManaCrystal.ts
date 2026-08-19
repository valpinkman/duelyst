/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const BonusManaCoreAction = require('app/sdk/actions/bonusManaCoreAction');
const i18next = require('i18next');
const ModifierMyAttackWatch = require('./modifierMyAttackWatch');

class ModifierMyAttackWatchBonusManaCrystal extends ModifierMyAttackWatch {
  declare type: any;
  declare giveToOwner: any;
  declare static description: any;

  static type = 'ModifierMyAttackWatchBonusManaCrystal';

  static createContextObject(giveToOwner, options) {
    if (giveToOwner == null) { giveToOwner = true; }
    const contextObject = super.createContextObject(options);
    contextObject.giveToOwner = giveToOwner;
    return contextObject;
  }

  onMyAttackWatch(action) {
    const bonusManaCoreAction = new BonusManaCoreAction(this.getGameSession());
    bonusManaCoreAction.setSource(this.getCard());
    if (this.giveToOwner) {
      bonusManaCoreAction.setOwnerId(this.getCard().getOwnerId());
    } else {
      bonusManaCoreAction.setOwnerId(this.getGameSession().getOpponentPlayerIdOfPlayerId(this.getCard().getOwnerId()));
    }
    return this.getGameSession().executeAction(bonusManaCoreAction);
  }
}
ModifierMyAttackWatchBonusManaCrystal.prototype.type = 'ModifierMyAttackWatchBonusManaCrystal';
ModifierMyAttackWatchBonusManaCrystal.description = i18next.t('modifiers.faction_6_shivers_buff_desc');
ModifierMyAttackWatchBonusManaCrystal.prototype.giveToOwner = true;

module.exports = ModifierMyAttackWatchBonusManaCrystal;
