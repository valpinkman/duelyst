/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');
const util = require('util');
const knex = require('../../../lib/data_access/knex');
const InventoryModule = require('../../../lib/data_access/inventory');
const GauntletModule = require('../../../lib/data_access/gauntlet');
const RiftModule = require('../../../lib/data_access/rift');
const Logger = require('../../../../app/common/logger');
const config = require('../../../../config/config.js');
const Errors = require('../../../lib/custom_errors');
const colors = require('colors');
const t = require('tcomb-validation');
const validators = require('../../../validators');
const hashHelpers = require('../../../lib/hash_helpers.coffee');
const validatorTypes = require('../../../validators/types');
const zlib = require('zlib');
const Promise = require('bluebird');
const moment = require('moment');
// AWS = require "aws-sdk"

// promisify
Promise.promisifyAll(zlib);

const router = express.Router();

router.delete('/card_collection', function (req, res, next) {
  const result = t.validate(req.body.card_ids, t.list(t.Number));
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const user_id = req.user.d.id;
  const card_ids = result.value;

  Logger.module('API').debug(`Disenchanting cards ${util.inspect(card_ids)} for user ${user_id.blue}`.magenta);
  return InventoryModule.disenchantCards(user_id, card_ids)
    .then(function (rewardsData) {
      Logger.module('API').debug(`Disenchanted cards for user ${user_id.blue}`.cyan);
      return res.status(200).json(rewardsData);
    }).catch(function (error) {
      Logger.module('API').error(`ERROR Disenchanting cards for user ${user_id.blue}`.red, util.inspect(error));
      return next(error);
    });
});

router.delete('/card_collection/duplicates', function (req, res, next) {
  const user_id = req.user.d.id;

  Logger.module('API').debug(`Disenchanting duplicate cards for user ${user_id.blue}`.magenta);
  return InventoryModule.disenchantDuplicateCards(user_id)
    .then(function (rewardsData) {
      Logger.module('API').debug(`Disenchanted cards for user ${user_id.blue}`.cyan);
      return res.status(200).json(rewardsData);
    }).catch(function (error) {
      Logger.module('API').error(`ERROR Disenchanting cards for user ${user_id.blue}`.red, util.inspect(error));
      return next(error);
    });
});

router.post('/card_collection/:card_id', function (req, res, next) {
  const result = t.validate(parseInt(req.params.card_id, 10), t.Number);
  if (!result.isValid()) {
    return next();
  }

  const user_id = req.user.d.id;
  const card_id = result.value;

  Logger.module('API').debug(`Crafting card ${card_id} for user ${user_id.blue}`.magenta);
  return InventoryModule.craftCard(user_id, card_id)
    .then(function (data) {
      Logger.module('API').debug(`Crafted card ${card_id} for user ${user_id.blue}`.cyan);
      return res.status(200).json(data);
    }).catch(Errors.InsufficientFundsError, (error) => res.status(403).json({})).catch(function (error) {
      Logger.module('API').error(`ERROR crafting card for user ${user_id.blue}`.red, util.inspect(error));
      return next(error);
    });
});

router.put('/card_collection/:card_id/read_at', function (req, res, next) {
  const result = t.validate(parseInt(req.params.card_id, 10), t.Number);
  if (!result.isValid()) {
    return next();
  }

  const user_id = req.user.d.id;
  const card_id = result.value;

  // don't wait for completion
  InventoryModule.markCardAsReadInUserCollection(user_id, card_id);

  Logger.module('API').debug(`Marked card ${card_id} as read for user ${user_id.blue}`.cyan);
  return res.status(200).json({});
});

router.put('/card_collection/read_all', function (req, res, next) {
  const user_id = req.user.d.id;

  // don't wait for completion
  InventoryModule.markAllCardsAsReadInUserCollection(user_id);

  Logger.module('API').debug(`Marked all cards as read for user ${user_id.blue}`.cyan);
  return res.status(200).json({});
});

router.put('/card_lore_collection/:card_id/read_lore_at', function (req, res, next) {
  const result = t.validate(parseInt(req.params.card_id, 10), t.Number);
  if (!result.isValid()) {
    return next();
  }

  const user_id = req.user.d.id;
  const card_id = result.value;

  // don't wait for completion
  InventoryModule.markCardLoreAsReadInUserCollection(user_id, card_id);

  Logger.module('API').debug(`Marked card ${card_id} lore as read for user ${user_id.blue}`.cyan);
  return res.status(200).json({});
});

router.post('/spirit_orbs', function (req, res, next) {
  const user_id = req.user.d.id;
  const {
    sku,
  } = req.body;
  const {
    qty,
  } = req.body;
  const {
    card_set_id,
  } = req.body;
  const {
    currency_type,
  } = req.body;

  Logger.module('API').debug(`Buying ${qty} Booster Packs for user ${user_id.blue} from set ${card_set_id}`.magenta);

  if (currency_type === 'soft') {
    Logger.module('API').debug(`Buying Booster Packs for user ${user_id.blue} with GOLD`);
    return InventoryModule.buyBoosterPacksWithGold(user_id, qty, card_set_id, sku)
      .then(function (value) {
        Logger.module('API').debug(`COMPLETE Buying Booster Pack with GOLD for user ${user_id.blue}`.cyan);
        return res.status(200).json(value);
      }).catch(Errors.InsufficientFundsError, function (error) {
        Logger.module('API').error(`INSUFFICIENT FUNDS Buying Booster Pack with GOLD for user ${user_id.blue}`.red);
        return res.status(403).json({});
      }).catch(function (error) {
        Logger.module('API').error(`ERROR Buying Booster Pack with GOLD for user ${user_id.blue}`.red);
        return next(error);
      });
  } else if (currency_type === 'hard') {
    return res.status(400).json({ message: 'Hard purchases no longer supported.' });
  }
});

router.put('/spirit_orbs/opened/:booster_pack_id', function (req, res, next) {
  const result = t.validate(req.params.booster_pack_id, t.subtype(t.Str, (s) => s.length === 20));
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const user_id = req.user.d.id;
  const pack_id = result.value;

  Logger.module('API').debug(`Unlocking Booster Pack ${pack_id} for user ${user_id.blue}`.magenta);
  return InventoryModule.unlockBoosterPack(user_id, pack_id)
    .then(function (value) {
      Logger.module('API').debug(`UNLOCKED Booster Pack ${pack_id} for user ${user_id.blue}`.cyan);
      return res.status(200).json(value);
    }).catch(function (error) {
      Logger.module('API').error(`ERROR Unlocking Booster Pack for user ${user_id.blue}`.red);
      return next(error);
    });
});

router.post('/gauntlet_tickets', function (req, res, next) {
  const user_id = req.user.d.id;

  return GauntletModule.buyArenaTicketWithGold(user_id)
    .then(function (data) {
      Logger.module('API').debug(`Arena ticket PURCHASED for user ${user_id.blue}`.cyan);
      return res.status(200).json(data);
    }).catch(Errors.InsufficientFundsError, (error) => res.status(401).json({ message: 'Insufficient gold to buy a Gauntlet ticket.' })).catch(function (error) {
      Logger.module('API').error(`ERROR buying arena ticket for user ${user_id.blue}`.red, util.inspect(error));
      return next(error);
    });
});

router.post('/rift_tickets', function (req, res, next) {
  const user_id = req.user.d.id;

  return RiftModule.buyRiftTicketWithGold(user_id)
    .then(function (ticketId) {
      Logger.module('API').log(`Rift ticket ${ticketId} PURCHASED for user ${user_id.blue}`.cyan);
      return res.status(200).json({ id: ticketId });
    }).catch(Errors.InsufficientFundsError, (error) => res.status(401).json({ message: 'Insufficient gold to buy a Rift ticket.' })).catch(function (error) {
      Logger.module('API').error(`ERROR buying rift ticket for user ${user_id.blue}`.red, util.inspect(error));
      return next(error);
    });
});

router.post('/codex/missing', function (req, res, next) {
  const user_id = req.user.d.id;

  return InventoryModule.giveUserMissingCodexChapters(user_id)
    .then((acquiredCodexChapterIds) => res.status(200).json(acquiredCodexChapterIds)).catch((error) => next(error));
});

// "Soft Wipe" is a mechanism for replacing a user's inventory with unopened orbs.
// This was a temporary system which ended on 2016-04-20.
// See server/lib/data_access/inventory.coffee:softWipeUserCardInventory.
// Stub the handler so we can remove the AWS SDK dependency.
router.post('/card_collection/soft_wipe', (req, res, next) => res.status(403).json({
  status: 'error',
  code: 403,
  message: 'Inventory soft wipes are no longer available.',
}),
/*
  user_id = req.user.d.id
  password = req.body.password
  Logger.module("API").debug "#{user_id} requesting inventory soft wipe"

  passwordValidationResult = t.validate(password, validatorTypes.Password)
  if not passwordValidationResult.isValid()
    return res.status(400).json(passwordValidationResult.errors)

  knex("users").where('id',user_id).first('password')
  .bind {}
  .then (userRow)->
    return hashHelpers.comparePassword(password, userRow.password)
  .then (match) ->
    if (!match)
      throw new Errors.BadPasswordError()
    return Promise.all([
      knex("user_cards").where('user_id',user_id).select()
      knex("user_card_log").where('user_id',user_id).select()
      knex("user_card_collection").where('user_id',user_id).first()
      knex("user_spirit_orbs_opened").where('user_id',user_id).select()
    ])
  .spread (cardCountRows,cardLogRows,cardCollectionRow,spiritOrbOpenedRows)->
    backup =
      user_cards: cardCountRows
      user_card_log: cardLogRows
      user_card_collection: cardCollectionRow
      user_spirit_orbs_opened: spiritOrbOpenedRows
    return zlib.gzipAsync(JSON.stringify(backup))
  .then (backupDataZipped)->
    @.backupDataZipped = backupDataZipped
    return InventoryModule.softWipeUserCardInventory(user_id)
  .then () ->
    * Upload the backup data to S3.
    AWS.config.update
      accessKeyId: config.get("s3_user_backup_snapshots.key")
      secretAccessKey: config.get("s3_user_backup_snapshots.secret")
    s3 = new AWS.S3()
    Promise.promisifyAll(s3)

    bucket = config.get("s3_user_backup_snapshots.bucket")
    filename = "#{config.get("env")}/#{user_id}/#{moment().utc().format("YYYY-MM-DD")}.json"
    params =
      Bucket: bucket
      Key: filename
      Body: @.backupDataZipped
      * ACL: 'public-read'
      ContentEncoding: "gzip"
      ContentType: "text/json"

    * upload backup and catch any errors silently
    s3.putObjectAsync(params)
    .then ()->
      Logger.module("API").debug "Back up SUCCESS for #{user_id} inventory before wipe."
    .catch (e)->
      Logger.module("API").error "ERROR backing up #{user_id} before inventory soft wipe: #{e.message}"

    * respond and return
    res.status(200).json({})
    return Promise.resolve()
  .catch Errors.BadPasswordError, (e) ->
    return res.status(401).json({message:'invalid password'})
  .catch Errors.BadRequestError, (e) ->
    return res.status(400).json({message:e.message})
  .catch (error) -> next(error)
  */);

// Crafting a cosmetic
router.post('/cosmetics/:cosmetic_id', function (req, res, next) {
  const result = t.validate(parseInt(req.params.cosmetic_id, 10), t.Number);
  if (!result.isValid()) {
    return next();
  }

  const user_id = req.user.d.id;
  const cosmetic_id = result.value;

  Logger.module('API').debug(`Crafting cosmetic ${cosmetic_id} for user ${user_id.blue}`.magenta);
  return InventoryModule.craftCosmetic(user_id, cosmetic_id)
    .then(function (data) {
      Logger.module('API').debug(`Crafted cosmetic ${cosmetic_id} for user ${user_id.blue}`.cyan);
      return res.status(200).json(data);
    }).catch(Errors.InsufficientFundsError, (error) => res.status(403).json({ message: 'Insufficient Spirit' })).catch(function (error) {
      Logger.module('API').error(`ERROR crafting cosmetic for user ${user_id.blue}`.red, util.inspect(error));
      return next(error);
    });
});

router.post('/free_card_of_the_day', function (req, res, next) {
  const user_id = req.user.d.id;
  Logger.module('API').debug(`Claiming free card of the day for user ${user_id.blue}`.magenta);
  return InventoryModule.claimFreeCardOfTheDay(user_id)
    .then((cardId) => res.status(200).json({ card_id: cardId })).catch(function (error) {
      Logger.module('API').error(`ERROR claiming free card of the day for user ${user_id.blue}`.red, util.inspect(error));
      return next(error);
    });
});

module.exports = router;
