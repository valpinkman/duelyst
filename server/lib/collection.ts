/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const _ = require('underscore');

const CONFIG = require('../../app/common/config');
const Logger = require('../../app/common/logger');
const SDK = require('../../app/sdk');
const InventoryModule = require('./data_access/inventory');
const knex = require('./data_access/knex');

// Helper function to grant a full card collection to users.
// This code is nearly identical to the /api/me/qa/inventory/fill_collection handler.
const grantFullCollection = function (userId) {
  // Inspect the user's collection to avoid granting copies beyond the max.
  var txPromise = knex.transaction((tx) => tx('user_card_collection').where('user_id', userId).first()
    .then(function (cardCollectionRow) {
      const missingCardIds = [];

      // Iterate each available card ID from the SDK.
      _.each(SDK.GameSession.getCardCaches()
        .getIsCollectible(true)
        .getIsPrismatic(false)
        .getIsSkinned(false)
        .getCardIds(), function (cardId) {
        let numMissing;
        if ((cardCollectionRow != null) && (cardCollectionRow.cards != null)) {
          const cardData = cardCollectionRow.cards[cardId];
          numMissing = 0;

          // Mythron-rarity cards are limited to 1 copy.
          if (SDK.CardFactory.cardForIdentifier(cardId).getRarityId() === SDK.Rarity.Mythron) {
            if (cardData != null) {
              numMissing = Math.max(0, 1 - cardData.count);
            } else {
              numMissing = 1;
            }

            // Other cards use the typical maximum.
          } else {
            if (cardData != null) {
              numMissing = Math.max(0, CONFIG.MAX_DECK_DUPLICATES - cardData.count);
            } else {
              numMissing = CONFIG.MAX_DECK_DUPLICATES;
            }
          }

          // If there is no user collection, grant the max number of copies.
        } else {
          if (SDK.CardFactory.cardForIdentifier(cardId).getRarityId() === SDK.Rarity.Mythron) {
            numMissing = 1;
          } else {
            numMissing = CONFIG.MAX_DECK_DUPLICATES;
          }
        }

        // If the user was missing copies of this card, add them to the list.
        if (numMissing > 0) {
          return __range__(0, numMissing, true).map((i) =>
            missingCardIds.push(cardId));
        }
      });

      // If the user was missing cards, add them to the collection.
      if (missingCardIds.length > 0) {
        return InventoryModule.giveUserCards(txPromise, tx, userId, missingCardIds, 'FullCollection', 'FullCollection', 'Full Collection');
      } else {
        return Promise.resolve();
      }
    }));

  // was `Logger.module('INVENTORY')(...)` -- calling the module object itself
  // rather than one of its methods, which throws. grantFullCollection is
  // invoked fire-and-forget on every user creation, so this surfaced only as an
  // unhandled rejection and never failed registration.
  return txPromise.then(() => Logger.module('INVENTORY').log(`Granted full collection to user ${userId}`));
};

module.exports = grantFullCollection;

function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}
