const { expect } = require('chai');
const _ = require('underscore');
const moment = require('moment');
const Logger = require('@duelyst/common/logger');
const SDK = require('@duelyst/sdk/index');

// disable the logger for cleaner test output
Logger.enabled = false;

/*
 * GameSession.getCardCaches(systemTime) memoises the whole card set per month, because monthly
 * content is invisible until its month rolls over. The memo used to be keyed on month() alone,
 * which is 0-11 and ignores the year, so a cache built in October 2026 was handed back for a
 * request about October 2015 -- the November-2015 card then looked available in the past. That
 * made data_access's "before 1st November" test pass in every month except October.
 *
 * These tests pin both clocks explicitly so they do not depend on when the suite runs.
 */
describe('GameSession card caches follow the requested date', () => {
  let allCardsAvailable;

  const at = (date) => moment(`${date}+0000`, 'YYYY-MM-DD Z').utc();
  const hasCard = (systemTime, cardId) =>
    _.some(
      SDK.GameSession.getCardCaches(systemTime).getIsCollectible(true).getCards(),
      (card) => card.getId() === cardId,
    );

  beforeEach(() => {
    // ALL_CARDS_AVAILABLE short-circuits the monthly gating this suite is about
    allCardsAvailable = process.env.ALL_CARDS_AVAILABLE;
    process.env.ALL_CARDS_AVAILABLE = 'false';
    SDK.GameSession._cardsCachedAt = null;
  });

  afterEach(() => {
    if (allCardsAvailable === undefined) delete process.env.ALL_CARDS_AVAILABLE;
    else process.env.ALL_CARDS_AVAILABLE = allCardsAvailable;
    SDK.GameSession._cardsCachedAt = null;
  });

  it('hides a November-2015 card in October 2015 even if the cache was first built in October of a later year', () => {
    expect(hasCard(at('2026-10-14'), SDK.Cards.Neutral.Mogwai)).to.equal(true);
    expect(hasCard(at('2015-10-15'), SDK.Cards.Neutral.Mogwai)).to.equal(false);
  });

  it('hides a December-2015 card in November 2015 even if the cache was first built in November of a later year', () => {
    expect(hasCard(at('2026-11-14'), SDK.Cards.Neutral.Jaxi)).to.equal(true);
    expect(hasCard(at('2015-11-30'), SDK.Cards.Neutral.Jaxi)).to.equal(false);
  });

  it('shows the card again when asked about a later year with the same month number', () => {
    expect(hasCard(at('2015-10-15'), SDK.Cards.Neutral.Mogwai)).to.equal(false);
    expect(hasCard(at('2026-10-14'), SDK.Cards.Neutral.Mogwai)).to.equal(true);
  });

  it('still rebuilds when only the month differs', () => {
    expect(hasCard(at('2015-10-15'), SDK.Cards.Neutral.Mogwai)).to.equal(false);
    expect(hasCard(at('2015-11-30'), SDK.Cards.Neutral.Mogwai)).to.equal(true);
  });

  it('still reuses the cache for two requests in the same month of the same year', () => {
    const first = SDK.GameSession.getCardCaches(at('2020-11-01'));
    const second = SDK.GameSession.getCardCaches(at('2020-11-30'));
    expect(second).to.equal(first);
  });

  it('rebuilds for the same month a year apart', () => {
    const first = SDK.GameSession.getCardCaches(at('2020-11-01'));
    const second = SDK.GameSession.getCardCaches(at('2021-11-01'));
    expect(second).to.not.equal(first);
  });
});
