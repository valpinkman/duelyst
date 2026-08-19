/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const Logger = require('app/common/logger');
const AttackAction = require('app/sdk/actions/attackAction');
const _ = require('underscore');

const i18next = require('i18next');
const ModifierProvoked = require('./modifierProvoked');
const Modifier = require('./modifier');

class ModifierProvoke extends Modifier {
  static type = 'ModifierProvoke';
  static isKeyworded = true;
  static description = null;
}
ModifierProvoke.prototype.type = 'ModifierProvoke';
ModifierProvoke.keywordDefinition = i18next.t('modifiers.provoke_def');
ModifierProvoke.prototype.maxStacks = 1;
ModifierProvoke.modifierName = i18next.t('modifiers.provoke_name');
ModifierProvoke.prototype.activeInHand = false;
ModifierProvoke.prototype.activeInDeck = false;
ModifierProvoke.prototype.activeInSignatureCards = false;
ModifierProvoke.prototype.activeOnBoard = true;
ModifierProvoke.prototype.isAura = true;
ModifierProvoke.prototype.auraRadius = 1;
ModifierProvoke.prototype.auraIncludeSelf = false;
ModifierProvoke.prototype.auraIncludeAlly = false;
ModifierProvoke.prototype.auraIncludeEnemy = true;
ModifierProvoke.prototype.modifiersContextObjects = [ModifierProvoked.createContextObject()];
ModifierProvoke.prototype.fxResource = ['FX.Modifiers.ModifierProvoke'];

module.exports = ModifierProvoke;
