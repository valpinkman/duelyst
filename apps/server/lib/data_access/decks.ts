/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const _ = require('underscore');
const util = require('util');
const Logger = require('@duelyst/common/logger');
const colors = require('colors');
const moment = require('moment');
const knex = require('./knex');
const InventoryModule = require('./inventory');
const config = require('config/config.js');
const generatePushId = require('@duelyst/common/generate_push_id');
const crypto = require('crypto');

// SDK imports
const SDK = require('@duelyst/sdk');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');

class DecksModule {
  /**
   * Retrieve all user decks
   * @public
   * @param  {String}    userId      User ID.
   * @return  {Promise}
   */
  static decksForUser(userId) {
    return knex('user_decks').where('user_id', userId).select();
  }

  /**
   * Add a new deck for a user
   * @public
   * @param  {String}    userId      User ID.
   * @param  {String}    deckId      Deck ID.
   * @param  {String}    name      Name for deck.
   * @param  {Array}      cards      Array of Card IDs to update deck with
   * @param  {Number}      spellCount      number of spells
   * @param  {Number}      minionCount      number of minions
   * @param  {Number}      artifactCount    number of artifacts
   * @param  {Number}      colorCode    color code
   * @param  {Number}      cardBackId    card back id
   * @return  {Promise}
   */
  static addDeck(
    userId,
    factionId,
    name,
    cards,
    spellCount,
    minionCount,
    artifactCount,
    colorCode,
    cardBackId,
  ) {
    let isAllowedToUseCardBackPromise;
    const MOMENT_NOW_UTC = moment().utc();

    const newDeckData = {
      id: generatePushId(),
      user_id: userId,
      name,
      faction_id: factionId,
      cards,
      spell_count: spellCount,
      minion_count: minionCount,
      artifact_count: artifactCount,
      color_code: colorCode,
      card_back_id: cardBackId,
      created_at: MOMENT_NOW_UTC.toDate(),
    };

    if (cardBackId != null) {
      isAllowedToUseCardBackPromise = InventoryModule.isAllowedToUseCosmetic(
        Promise.resolve(),
        knex,
        userId,
        cardBackId,
      );
    } else {
      isAllowedToUseCardBackPromise = Promise.resolve();
    }

    return isAllowedToUseCardBackPromise
      .then(() => knex('user_decks').insert(newDeckData))
      .then(() => newDeckData);
  }

  /**
   * Update a user's deck
   * @public
   * @param  {String}    userId      User ID.
   * @param  {String}    deckId      Deck ID.
   * @param  {String}    name      Name for deck.
   * @param  {Array}      cards      Array of Card IDs to update deck with
   * @param  {Number}      spellCount      number of spells
   * @param  {Number}      minionCount      number of minions
   * @param  {Number}      artifactCount    number of artifacts
   * @param  {Number}      colorCode    color code
   * @param  {Number}      cardBackId    card back id
   * @return  {Promise}
   */
  static updateDeck(
    userId,
    deckId,
    factionId,
    name,
    cards,
    spellCount,
    minionCount,
    artifactCount,
    colorCode,
    cardBackId,
  ) {
    let isAllowedToUseCardBackPromise;
    const MOMENT_NOW_UTC = moment().utc();

    const newDeckData = {
      name,
      faction_id: factionId,
      cards,
      spell_count: spellCount,
      minion_count: minionCount,
      artifact_count: artifactCount,
      color_code: colorCode,
      card_back_id: cardBackId,
      updated_at: MOMENT_NOW_UTC.toDate(),
    };

    if (cardBackId != null) {
      isAllowedToUseCardBackPromise = InventoryModule.isAllowedToUseCosmetic(
        Promise.resolve(),
        knex,
        userId,
        cardBackId,
      );
    } else {
      isAllowedToUseCardBackPromise = Promise.resolve();
    }

    return isAllowedToUseCardBackPromise
      .then(() => knex('user_decks').where({ user_id: userId, id: deckId }).update(newDeckData))
      .then(() => newDeckData);
  }

  /**
   * Generate a short digest for a list of card IDs.
   * Method is to generate a string message M and grab first 16 bits of AES-CTR(SHA256(M)) and output as hex.
   * @public
   * @param  {Array}      cards      Array of Integer Card IDs to update deck with
   * @param  {String}    salt      User based salt
   * @return  {String}
   */
  static hashForDeck(cards, salt) {
    if (!cards) {
      return null;
    }

    const baseCardIds = _.map(cards, (card) => SDK.Cards.getBaseCardId(card));
    const sortedCardIds = baseCardIds.sort();
    Logger.module('DecksModule').debug(`hashCodeForDeck() -> generating hash for ${sortedCardIds}`);

    const hash = crypto.createHash('sha256');
    const val = sortedCardIds.join(',') + salt;
    hash.update(val);
    const digest = hash.digest('hex');
    Logger.module('DecksModule').debug(`hashCodeForDeck() -> digest: ${digest}`);

    /*
     * crypto.createCipher was deprecated for exactly the reason the old FIXME
     * here noted, and REMOVED in node 22; we run node 24, so this threw
     * "crypto.createCipher is not a function" for anyone who called it.
     *
     * createCipheriv needs an explicit key and IV where createCipher derived
     * them from the password. They are derived deterministically below, so the
     * function stays pure: the same deck and salt give the same code. The codes
     * this produces DIFFER from the pre-node-22 ones, which is safe here --
     * nothing persists a deck hash (there is no such column) and the only two
     * call sites are commented out, so there is nothing to stay compatible with.
     */
    const CIPHER_PASSWORD = 'dcDnVgALT39spZb';
    const key = crypto.createHash('sha256').update(CIPHER_PASSWORD).digest();
    const iv = crypto.createHash('md5').update(CIPHER_PASSWORD).digest();
    const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
    let crypted = cipher.update(digest, 'utf8', 'hex');
    crypted += cipher.final('hex');
    Logger.module('DecksModule').debug(`hashCodeForDeck() -> crypted: ${crypted}`);

    const final = crypted.slice(0, 18);
    Logger.module('DecksModule').debug(`hashCodeForDeck() -> final: ${final}`);

    return final;
  }
}

module.exports = DecksModule;
