/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EVENTS = require('app/common/event_types');
const AttackAction = require('app/sdk/actions/attackAction');
const CardType = require('app/sdk/cards/cardType');
const Factions = require('app/sdk/cards/factionsLookup');
const KillAction = require('app/sdk/actions/killAction');
const ModifierDealDamageWatch = require('./modifierDealDamageWatch');
const ModifierDealDamageWatchKillTarget = require('./modifierDealDamageWatchKillTarget');

class ModifierDealDamageWatchKillNeutralTarget extends ModifierDealDamageWatchKillTarget {
  declare type: any;
  declare maxStacks: any;
  declare fxResource: any;

  static type = 'ModifierDealDamageWatchKillNeutralTarget';
  static modifierName = 'Neutral Assassin';
  static description = 'Whenever this damages a neutral minion, destroy that minion';

  getIsActionRelevant(a) {
    // kill the target as long as it satisfies base requirements AND is Neutral
    return (
      super.getIsActionRelevant(a) &&
      __guard__(a.getTarget(), (x) => x.getFactionId()) === Factions.Neutral
    );
  }

  onDealDamage(action) {
    const target = action.getTarget();
    if (target.getFactionId() === Factions.Neutral) {
      return super.onDealDamage(action);
    }
  }
}
ModifierDealDamageWatchKillNeutralTarget.prototype.type =
  'ModifierDealDamageWatchKillNeutralTarget';
ModifierDealDamageWatchKillNeutralTarget.prototype.maxStacks = 1;
ModifierDealDamageWatchKillNeutralTarget.prototype.fxResource = [
  'FX.Modifiers.ModifierDealDamageWatch',
  'FX.Modifiers.ModifierGenericKill',
];

module.exports = ModifierDealDamageWatchKillNeutralTarget;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
