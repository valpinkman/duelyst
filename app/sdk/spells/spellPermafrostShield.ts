/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SpellApplyModifiers = require('./spellApplyModifiers');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const Races = require('app/sdk/cards/racesLookup');
const Modifier = require('app/sdk/modifiers/modifier');
const _ = require('underscore');

class SpellPermafrostShield extends SpellApplyModifiers {
  declare targetType: any;
  declare spellFilterType: any;
  declare attackBuff: any;
  declare healthBuff: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    const applyEffectPosition = { x, y };
    const entity = board.getCardAtPosition(applyEffectPosition, this.targetType);
    if (entity.getBelongsToTribe(Races.Vespyr)) {
      this.targetModifiersContextObjects = [
        Modifier.createContextObjectWithAttributeBuffs(this.attackBuff, this.healthBuff),
      ];
    } else {
      this.targetModifiersContextObjects = [
        Modifier.createContextObjectWithAttributeBuffs(this.attackBuff),
      ];
    }
    this.targetModifiersContextObjects[0].appliedName = 'Frozen Resolve';
    return super.onApplyEffectToBoardTile(board, x, y, sourceAction);
  }
}
SpellPermafrostShield.prototype.targetType = CardType.Unit;
SpellPermafrostShield.prototype.spellFilterType = SpellFilterType.AllyDirect;
SpellPermafrostShield.prototype.attackBuff = 0;
SpellPermafrostShield.prototype.healthBuff = 0;

module.exports = SpellPermafrostShield;
