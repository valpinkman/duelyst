/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RemoveAction = require('@duelyst/sdk/actions/removeAction');

const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierWall extends Modifier {
  declare type: any;
  declare maxStacks: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierWall';
  static isKeyworded = true;
  static description = null;

  onActivate() {
    // apply "cannot move" speed modifier as a submodifier of this
    // applying as a submodifier so speed modifier can be removed without seperately from the "wall" modifier itself
    // (ex spell - your Walls can now move)
    const speedBuffContextObject = Modifier.createContextObjectOnBoard();
    speedBuffContextObject.attributeBuffs = { speed: 0 };
    speedBuffContextObject.attributeBuffsAbsolute = ['speed'];
    speedBuffContextObject.attributeBuffsFixed = ['speed'];
    speedBuffContextObject.isHiddenToUI = true;
    speedBuffContextObject.isCloneable = false;
    this.getGameSession().applyModifierContextObject(speedBuffContextObject, this.getCard(), this);
    return super.onActivate();
  }

  onRemoveFromCard() {
    // if modifier removed for reason other than entity dying (dispelled for example)
    if (this.getGameSession().getCanCardBeScheduledForRemoval(this.getCard())) {
      // then remove entity from the board (just remove, don't die)
      const removeAction = this.getGameSession().createActionForType(RemoveAction.type);
      removeAction.setOwnerId(this.getCard().getOwnerId());
      removeAction.setSource(this.getCard());
      removeAction.setTarget(this.getCard());
      this.getGameSession().executeAction(removeAction);
    }

    return super.onRemoveFromCard();
  }

  // if we ever want to allow this Wall to move, remove the cannot move hidden submodifier
  allowMove() {
    return Array.from<any>(this.getSubModifiers()).map((subMod) =>
      this.getGameSession().removeModifier(subMod),
    );
  }
}
ModifierWall.prototype.type = 'ModifierWall';
ModifierWall.keywordDefinition = i18next.t('modifiers.wall_def');
ModifierWall.modifierName = i18next.t('modifiers.wall_name');
ModifierWall.prototype.maxStacks = 1;
ModifierWall.prototype.fxResource = ['FX.Modifiers.ModifierWall'];

module.exports = ModifierWall;
