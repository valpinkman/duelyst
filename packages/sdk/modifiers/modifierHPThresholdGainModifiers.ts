/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierRanged = require('@duelyst/sdk/modifiers/modifierRanged');
const ModifierForcefield = require('@duelyst/sdk/modifiers/modifierForcefield');
const ModifierFlying = require('@duelyst/sdk/modifiers/modifierFlying');
const ModifierTranscendance = require('@duelyst/sdk/modifiers/modifierTranscendance');
const ModifierHPChange = require('@duelyst/sdk/modifiers/modifierHPChange');

const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierHPThresholdGainModifiers extends ModifierHPChange {
  declare type: any;
  declare fxResource: any;
  declare static description: any;

  static type = 'ModifierHPThresholdGainModifiers';
  static modifierName = 'Modifier HP Threshold Gain Modifiers';

  static createContextObject(options) {
    const contextObject = super.createContextObject(options);

    const rangedModifier = ModifierRanged.createContextObject();
    rangedModifier.isRemovable = false;
    const forcefieldModifier = ModifierForcefield.createContextObject();
    forcefieldModifier.isRemovable = false;
    const celerityModifier = ModifierTranscendance.createContextObject();
    celerityModifier.isRemovable = false;
    const flyingModifier = ModifierFlying.createContextObject();
    flyingModifier.isRemovable = false;

    contextObject.listOfModifiersContextObjectsFor30HP = [];
    contextObject.listOfModifiersContextObjectsFor20HP = [rangedModifier];
    contextObject.listOfModifiersContextObjectsFor15HP = [forcefieldModifier];
    contextObject.listOfModifiersContextObjectsFor10HP = [celerityModifier];
    contextObject.listOfModifiersContextObjectsFor5HP = [flyingModifier];
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    return this.description;
  }

  onHPChange(e) {
    super.onHPChange(e);

    const card = this.getCard();
    const hp = card.getHP();
    let missingModifierContextObjects = [];
    let extraModifierContextObjects = [];
    if (hp <= 30) {
      missingModifierContextObjects = missingModifierContextObjects.concat(
        this.searchMissingModifiers(this.listOfModifiersContextObjectsFor30HP, card),
      );
    } else {
      extraModifierContextObjects = extraModifierContextObjects.concat(
        this.getExistingModifiersFromContextObjects(
          this.listOfModifiersContextObjectsFor30HP,
          card,
        ),
      );
    }
    if (hp <= 20) {
      missingModifierContextObjects = missingModifierContextObjects.concat(
        this.searchMissingModifiers(this.listOfModifiersContextObjectsFor20HP, card),
      );
    } else {
      extraModifierContextObjects = extraModifierContextObjects.concat(
        this.getExistingModifiersFromContextObjects(
          this.listOfModifiersContextObjectsFor20HP,
          card,
        ),
      );
    }
    if (hp <= 15) {
      missingModifierContextObjects = missingModifierContextObjects.concat(
        this.searchMissingModifiers(this.listOfModifiersContextObjectsFor15HP, card),
      );
    } else {
      extraModifierContextObjects = extraModifierContextObjects.concat(
        this.getExistingModifiersFromContextObjects(
          this.listOfModifiersContextObjectsFor15HP,
          card,
        ),
      );
    }
    if (hp <= 10) {
      missingModifierContextObjects = missingModifierContextObjects.concat(
        this.searchMissingModifiers(this.listOfModifiersContextObjectsFor10HP, card),
      );
    } else {
      extraModifierContextObjects = extraModifierContextObjects.concat(
        this.getExistingModifiersFromContextObjects(
          this.listOfModifiersContextObjectsFor10HP,
          card,
        ),
      );
    }
    if (hp <= 5) {
      missingModifierContextObjects = missingModifierContextObjects.concat(
        this.searchMissingModifiers(this.listOfModifiersContextObjectsFor5HP, card),
      );
    } else {
      extraModifierContextObjects = extraModifierContextObjects.concat(
        this.getExistingModifiersFromContextObjects(this.listOfModifiersContextObjectsFor5HP, card),
      );
    }

    // adding the missing modifiers
    if (missingModifierContextObjects.length > 0) {
      this.applyManagedModifiersFromModifiersContextObjects(missingModifierContextObjects, card);
    }

    // removing the extra modifiers we don't need
    if (extraModifierContextObjects.length > 0) {
      return Array.from<any>(extraModifierContextObjects).map((modifier) =>
        this.getGameSession().removeModifier(modifier),
      );
    }
  }

  searchMissingModifiers(modifierContextObjects, card) {
    const missingModifierContextObjects = [];
    const index = this.getIndex();
    for (var modifierContextObject of Array.from<any>(modifierContextObjects)) {
      var modifierType = modifierContextObject.type;
      var hasModifier = false;
      for (var existingModifier of Array.from<any>(card.getModifiers())) {
        if (
          existingModifier != null &&
          existingModifier.getType() === modifierType &&
          existingModifier.getParentModifierIndex() === index
        ) {
          hasModifier = true;
          break;
        }
      }
      if (!hasModifier) {
        missingModifierContextObjects.push(modifierContextObject);
      }
    }
    return missingModifierContextObjects;
  }

  getExistingModifiersFromContextObjects(modifierContextObjects, card) {
    const modifiers = [];
    const index = this.getIndex();
    for (var modifier of Array.from<any>(card.getModifiers())) {
      for (var modifierContextObject of Array.from<any>(modifierContextObjects)) {
        if (
          modifier.getType() === modifierContextObject.type &&
          modifier.getParentModifierIndex() === index
        ) {
          modifiers.push(modifier);
        }
      }
    }
    return modifiers;
  }
}
ModifierHPThresholdGainModifiers.prototype.type = 'ModifierHPThresholdGainModifiers';
ModifierHPThresholdGainModifiers.description = i18next.t(
  'modifiers.HP_threshold_gain_modifiers_def',
);
ModifierHPThresholdGainModifiers.prototype.fxResource = ['FX.Modifiers.ModifierBuffSelfOnReplace'];

module.exports = ModifierHPThresholdGainModifiers;
