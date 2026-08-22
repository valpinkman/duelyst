/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('@duelyst/sdk/achievements/achievement');
const CardSet = require('@duelyst/sdk/cards/cardSetLookup');
const i18next = require('i18next');

class MythronOrb1Achievement extends Achievement {
  static id = 'mythron1';
  static title = 'First Trial';
  static description =
    "You've opened 1 Mythron Orb, here's a brand new Mythron card. You'll get another after opening 10 more orbs.";
  static progressRequired = 1;
  static rewards = { mythronCard: 1 };

  static progressForOpeningSpiritOrb(orbSet) {
    if (orbSet === CardSet.Coreshatter) {
      return 1;
    }
    return 0;
  }
}

module.exports = MythronOrb1Achievement;
