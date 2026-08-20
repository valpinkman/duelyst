/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');
const _ = require('underscore');
const knex = require('../../../lib/data_access/knex');
const DecksModule = require('../../../lib/data_access/decks');
const DataAccessHelpers = require('../../../lib/data_access/helpers');
const Logger = require('../../../../app/common/logger');
const t = require('tcomb-validation');
const validators = require('../../../validators');

const router = express.Router();

router.get('/', function (req, res, next) {
  const user_id = req.user.d.id;

  return DecksModule.decksForUser(user_id)
    .then(function (decks) {
      // for each deck
      // map integer arrays to card objects for deck builder
      for (var deckData of Array.from<any>(decks)) {
        deckData.cards = _.map(deckData.cards, (cardId) => ({
          id: cardId,
        }));
      }
      return res.status(200).json(DataAccessHelpers.restifyData(decks));
    })
    .catch((error) => next(error));
});

router.get('/:deck_id', function (req, res, next) {
  const result = t.validate(
    req.params.deck_id,
    t.subtype(t.Str, (s) => s.length <= 36),
  );
  if (!result.isValid()) {
    return next();
  }

  const user_id = req.user.d.id;
  const deck_id = result.value;

  return knex('user_decks')
    .where({ user_id: user_id, id: deck_id })
    .first()
    .then(function (deckData) {
      // map integer arrays to card objects for deck builder
      deckData.cards = _.map(deckData.cards, (cardId) => ({
        id: cardId,
      }));
      return res.status(200).json(deckData);
    })
    .catch((error) => next(error));
});

router.post('/', function (req, res, next) {
  const deck_input = t.validate(req.body, validators.deckInput);
  if (!deck_input.isValid()) {
    return res.status(400).json(deck_input.errors);
  }

  const user_id = req.user.d.id;
  const { faction_id } = deck_input.value;
  const { name } = deck_input.value;
  let { cards } = deck_input.value;
  const { spell_count } = deck_input.value;
  const { minion_count } = deck_input.value;
  const { artifact_count } = deck_input.value;
  const { color_code } = deck_input.value;
  const { card_back_id } = deck_input.value;

  // map card objects to integer arrays for the database
  cards = _.map(cards, (cardData) => cardData.id);

  return DecksModule.addDeck(
    user_id,
    faction_id,
    name,
    cards,
    spell_count,
    minion_count,
    artifact_count,
    color_code,
    card_back_id,
  )
    .then(function (deckData) {
      // map integer arrays to card objects for deck builder
      deckData.cards = _.map(deckData.cards, (cardId) => ({
        id: cardId,
      }));
      return res.status(200).json(DataAccessHelpers.restifyData(deckData));
    })
    .catch((error) => next(error));
});

router.put('/:deck_id', function (req, res, next) {
  let deck_id = t.validate(
    req.params.deck_id,
    t.subtype(t.Str, (s) => s.length <= 36),
  );
  if (!deck_id.isValid()) {
    return next();
  }
  const deck_input = t.validate(req.body, validators.deckInput);
  if (!deck_input.isValid()) {
    return res.status(400).json(deck_input.errors);
  }

  const user_id = req.user.d.id;
  deck_id = deck_id.value;
  const { faction_id } = deck_input.value;
  const { name } = deck_input.value;
  let { cards } = deck_input.value;
  const { spell_count } = deck_input.value;
  const { minion_count } = deck_input.value;
  const { artifact_count } = deck_input.value;
  const { color_code } = deck_input.value;
  const { card_back_id } = deck_input.value;

  // map card objects to integer arrays for the database
  cards = _.map(cards, (cardData) => cardData.id);

  return DecksModule.updateDeck(
    user_id,
    deck_id,
    faction_id,
    name,
    cards,
    spell_count,
    minion_count,
    artifact_count,
    color_code,
    card_back_id,
  )
    .then(function (deckData) {
      // map integer arrays to card objects for deck builder
      deckData.cards = _.map(deckData.cards, (cardId) => ({
        id: cardId,
      }));
      return res.status(200).json(DataAccessHelpers.restifyData(deckData));
    })
    .catch((error) => next(error));
});

router.delete('/:deck_id', function (req, res, next) {
  const result = t.validate(
    req.params.deck_id,
    t.subtype(t.Str, (s) => s.length <= 36),
  );
  if (!result.isValid()) {
    return next();
  }

  const user_id = req.user.d.id;
  const deck_id = result.value;

  return knex('user_decks')
    .where({ user_id: user_id, id: deck_id })
    .delete()
    .then((deckData) => res.status(200).json({}))
    .catch((error) => next(error));
});

module.exports = router;
