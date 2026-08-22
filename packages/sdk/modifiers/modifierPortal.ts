/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierPortal extends Modifier {
  declare type: any;
  declare maxStacks: any;
  declare isRemovable: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierPortal';
  static isKeyworded = true;
  static isHiddenToUI = true;
  static description = null;

  onActivate() {
    super.onActivate();
    this.stopMove();
    return this.stopAttack();
  }

  // apply "cannot move" and "cannot attack" modifiers as submodifier of this
  // applying as a submodifier so these modifier can be removed seperately from the "structure" modifier itself
  // (ex spell - your Obelysks can now move and attack)
  stopMove() {
    const speedBuffContextObject = Modifier.createContextObjectOnBoard();
    speedBuffContextObject.attributeBuffs = { speed: 0 };
    speedBuffContextObject.attributeBuffsAbsolute = ['speed'];
    speedBuffContextObject.attributeBuffsFixed = ['speed'];
    speedBuffContextObject.isHiddenToUI = true;
    speedBuffContextObject.isCloneable = false;
    return this.getGameSession().applyModifierContextObject(
      speedBuffContextObject,
      this.getCard(),
      this,
    );
  }

  stopAttack() {
    const attackBuffContextObject = Modifier.createContextObjectOnBoard();
    attackBuffContextObject.attributeBuffs = { atk: 0 };
    attackBuffContextObject.attributeBuffsAbsolute = ['atk'];
    attackBuffContextObject.attributeBuffsFixed = ['atk'];
    attackBuffContextObject.isHiddenToUI = true;
    attackBuffContextObject.isCloneable = false;
    return this.getGameSession().applyModifierContextObject(
      attackBuffContextObject,
      this.getCard(),
      this,
    );
  }

  // if we ever want to allow this Structure to move, remove the cannot move hidden submodifier
  allowMove() {
    return (() => {
      const result = [];
      for (var subMod of Array.from<any>(this.getSubModifiers())) {
        if (subMod.getBuffsAttribute('speed')) {
          result.push(this.getGameSession().removeModifier(subMod));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }

  // if we ever want to allow this Structure to attack, remove the cannot attack hidden submodifier
  allowAttack() {
    return (() => {
      const result = [];
      for (var subMod of Array.from<any>(this.getSubModifiers())) {
        if (subMod.getBuffsAttribute('atk')) {
          result.push(this.getGameSession().removeModifier(subMod));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
ModifierPortal.prototype.type = 'ModifierPortal';
ModifierPortal.keywordDefinition = i18next.t('modifiers.structure_def');
ModifierPortal.modifierName = i18next.t('modifiers.structure_name');
ModifierPortal.prototype.maxStacks = 1;
ModifierPortal.prototype.isRemovable = false;
ModifierPortal.prototype.fxResource = ['FX.Modifiers.ModifierPortal'];

module.exports = ModifierPortal;
