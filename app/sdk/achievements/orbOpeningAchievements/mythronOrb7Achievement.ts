/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const CardSet = require('app/sdk/cards/cardSetLookup');
const i18next = require('i18next');

class MythronOrb7Achievement extends Achievement {
  static id = 'mythron7';
  static title = 'Seventh Trial';
  static description = "You've opened 61 Mythron Orbs, here's a brand new Mythron card.";
  static progressRequired = 61;
  static rewards = { mythronCard: 1 };

  static progressForOpeningSpiritOrb(orbSet) {
    if (orbSet === CardSet.Coreshatter) {
      return 1;
    }
    return 0;
  }
}

module.exports = MythronOrb7Achievement;
