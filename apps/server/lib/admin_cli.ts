/*
 * Small administrative commands, run inside a deployed container.
 *
 * These exist because the QA routes (/api/me/qa/*) are mounted only when
 * config.isDevelopment(), and deliberately so -- they grant currency and set
 * rank, and a public deployment must not expose them. Operating on production
 * data therefore needs a path that is not an HTTP endpoint.
 *
 * Invoked as `node build/bin/admin <command> <args>`; on Coolify that is a
 * one-off scheduled task, whose cron can fire more than once before cleanup,
 * so every command here is idempotent.
 */
const Logger = require('@duelyst/common/logger');
const knex = require('apps/server/lib/data_access/knex');
const UsersModule = require('apps/server/lib/data_access/users');
const InventoryModule = require('apps/server/lib/data_access/inventory');
const generatePushId = require('@duelyst/common/generate_push_id');
const SDK = require('@duelyst/sdk');

const log = (msg) => Logger.module('ADMIN').log(msg);

/**
 * Give a user every cosmetic in the SDK: emotes, card backs, profile icons,
 * scenes, battle maps and card skins.
 *
 * Skips what the user already owns rather than relying on
 * giveUserCosmeticId's duplicate handling, which converts a re-grant into
 * spirit -- correct for opening a chest twice, wrong for running this twice.
 */
async function grantAllCosmetics(username) {
  const userId = await UsersModule.userIdForUsername(username);
  if (!userId) throw new Error(`no such user: ${username}`);

  /*
   * Two of the 449 are flagged disabled, and giveUserCosmeticId rejects those
   * outright rather than skipping them -- so filtering here is what keeps one
   * retired cosmetic from aborting the whole grant partway through.
   */
  const all = SDK.CosmeticsFactory.getAllCosmetics().filter((c) => c.enabled);
  const owned = await knex('user_cosmetic_inventory')
    .where('user_id', userId)
    .select('cosmetic_id');
  const ownedIds = new Set(owned.map((r) => r.cosmetic_id));
  const missing = all.filter((c) => !ownedIds.has(c.id));

  log(
    `${username} (${userId}) owns ${ownedIds.size} of ${all.length} enabled cosmetics; granting ${missing.length}`,
  );

  let granted = 0;
  for (const cosmetic of missing) {
    // one transaction per cosmetic: a failure on one should not roll back the rest
    let txPromise;
    await knex.transaction((tx) => {
      txPromise = InventoryModule.giveUserCosmeticId(
        txPromise,
        tx,
        userId,
        cosmetic.id,
        'admin',
        generatePushId(),
      )
        .then(tx.commit)
        .catch(tx.rollback);
      return txPromise;
    });
    granted += 1;
    if (granted % 50 === 0) log(`  ${granted}/${missing.length}`);
  }
  log(`done: granted ${granted}, already owned ${ownedIds.size}`);
}

/**
 * Delete users whose username starts with `prefix`. Intended for the throwaway
 * accounts the e2e suite registers.
 *
 * Guarded: the prefix must be at least four characters and match no more than
 * `MAX` accounts, so a typo cannot empty the users table. Deletion goes through
 * UsersModule.deleteNewUser, which clears the Firebase records too.
 */
async function deleteUsersByPrefix(prefix) {
  const MAX = 25;
  if (!prefix || prefix.length < 4) {
    throw new Error(`refusing to match on a prefix shorter than 4 characters: ${prefix}`);
  }

  const rows = await knex('users').where('username', 'like', `${prefix}%`).select('id', 'username');
  if (rows.length === 0) {
    log(`no users match ${prefix}* -- nothing to do`);
    return;
  }
  if (rows.length > MAX) {
    throw new Error(`${prefix}* matches ${rows.length} users, more than the ${MAX} guard allows`);
  }

  log(
    `deleting ${rows.length} user(s) matching ${prefix}*: ${rows.map((r) => r.username).join(', ')}`,
  );
  for (const row of rows) {
    await UsersModule.deleteNewUser(row.id);
    log(`  deleted ${row.username} (${row.id})`);
  }
  log('done');
}

const COMMANDS = {
  'grant-cosmetics': { run: grantAllCosmetics, usage: 'grant-cosmetics <username>' },
  'delete-users': { run: deleteUsersByPrefix, usage: 'delete-users <username-prefix>' },
};

async function main() {
  const [name, arg] = process.argv.slice(2);
  const command = COMMANDS[name];
  if (!command) {
    console.error('usage: node build/bin/admin <command>');
    for (const c of Object.values(COMMANDS)) console.error(`  ${c.usage}`);
    process.exit(2);
  }
  await command.run(arg);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    Logger.module('ADMIN').error(`failed: ${err && err.message ? err.message : err}`);
    process.exit(1);
  });
