/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const CardSet = require('app/sdk/cards/cardSetLookup');
const i18next = require('i18next');

class MythronOrb3Achievement extends Achievement {
  static id = 'mythron3';
  static title = 'Third Trial';
  static description =
    "You've opened 21 Mythron Orbs, here's a brand new Mythron card. You'll get another after opening 10 more orbs.";
  static progressRequired = 21;
  static rewards = { mythronCard: 1 };

  static progressForOpeningSpiritOrb(orbSet) {
    if (orbSet === CardSet.Coreshatter) {
      return 1;
    }
    return 0;
  }
}

module.exports = MythronOrb3Achievement;
