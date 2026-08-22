/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');
const util = require('util');
const knex = require('../../../lib/data_access/knex');
const CosmeticChestsModule = require('../../../lib/data_access/cosmetic_chests');
const Logger = require('@duelyst/common/logger');
const colors = require('colors');
const t = require('tcomb-validation');
const validators = require('../../../validators');
const DataAccessHelpers = require('../../../lib/data_access/helpers');
const GiftCrateModule = require('../../../lib/data_access/gift_crate');
const zlib = require('zlib');
const moment = require('moment');

const router = express.Router();

router.put('/cosmetic_chest/:chest_id/unlock', function (req, res, next) {
  const chestIdResult = t.validate(
    req.params.chest_id,
    t.subtype(t.Str, (s) => s.length === 20),
  );
  if (!chestIdResult.isValid()) {
    return res.status(400).json(chestIdResult.errors);
  }

  // keyIdResult = t.validate(req.body.key_id, t.subtype(t.Str, (s) -> s.length == 20))
  // if not keyIdResult.isValid()
  //  return res.status(400).json(keyIdResult.errors)

  const user_id = req.user.d.id;
  const chest_id = chestIdResult.value;
  // key_id = keyIdResult.value

  Logger.module('API').debug(`Opening Cosmetic Chest ${chest_id} for user ${user_id.blue}`.magenta);
  return CosmeticChestsModule.openChest(user_id, chest_id)
    .then(function (rewardData) {
      Logger.module('API').debug(`Opened Cosmetic Chest ${chest_id} for user ${user_id.blue}`.cyan);
      return res.status(200).json(rewardData);
    })
    .catch(function (error) {
      Logger.module('API').error(
        `ERROR Opening Cosmetic Chest ${chest_id} for user ${user_id.blue}`.red,
      );
      return next(error);
    });
});

router.get('/gift_crates', function (req, res, next) {
  const user_id = req.user.d.id;
  return knex('user_gift_crates')
    .where('user_id', user_id)
    .select()
    .then(function (giftCrateRows) {
      giftCrateRows = DataAccessHelpers.restifyData(giftCrateRows);
      return res.status(200).json(giftCrateRows);
    })
    .catch((error) => next(error));
});

router.put('/gift_crate/:crate_id/unlock', function (req, res, next) {
  const result = t.validate(
    req.params.crate_id,
    t.subtype(t.Str, (s) => s.length <= 36),
  );
  if (!result.isValid()) {
    return next();
  }

  const user_id = req.user.d.id;
  const crate_id = result.value;

  return GiftCrateModule.unlockGiftCrate(user_id, crate_id)
    .then(function (rewardData) {
      Logger.module('API').debug(`Gift crate ${crate_id} unlocked for user ${user_id.blue}`.cyan);
      return res.status(200).json(rewardData);
    })
    .catch(function (error) {
      Logger.module('API').error(
        `ERROR claiming gift crate ${crate_id} rewards for user ${user_id.blue}`.red,
        util.inspect(error),
      );
      return next(error);
    });
});

module.exports = router;
