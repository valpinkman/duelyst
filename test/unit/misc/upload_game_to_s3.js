/*
 * Covers worker/upload_game_to_s3.ts.
 *
 * Replay archiving is optional, and with no AWS credentials configured the
 * uploader must resolve null rather than reject. The archive-game job calls it
 * before GamesModule.saveGameMetadata(), so a rejection here does not just lose
 * a replay -- it loses the finished game's entire row in the `games` table
 * (winner, duration, generals, decks, ranks). That is what a self-hosted
 * deployment hit: no bucket of its own, an unconditional upload, and every
 * completed game silently missing from Postgres.
 */
const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const { expect } = require('chai');

const config = require('config/config.js');

describe('upload_game_to_s3', function () {
  it('has no aws credentials configured in this environment', function () {
    // the premise of the test below: if these ever gain defaults, the module
    // would build a real client and try to talk to S3 from the unit suite
    expect(config.get('aws.accessKey')).to.equal('');
    expect(config.get('aws.secretKey')).to.equal('');
  });

  it('resolves null instead of rejecting when archiving is disabled', async function () {
    const upload = require('worker/upload_game_to_s3');

    const url = await upload('game-1', JSON.stringify({ players: [] }), null);

    expect(url).to.equal(null);
  });

  it('does not reject when mouse/ui event data is also present', async function () {
    const upload = require('worker/upload_game_to_s3');

    const url = await upload('game-2', JSON.stringify({ players: [] }), JSON.stringify([]));

    expect(url).to.equal(null);
  });
});
