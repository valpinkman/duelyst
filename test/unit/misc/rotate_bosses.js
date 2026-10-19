/*
 * Covers apps/worker/jobs/rotate-bosses.ts (issue #47).
 *
 * The job used to rotate through every value of Cards.Boss, which includes the
 * bosses' minions and tokens. Landing on one of those (200206, Boss6Chassis)
 * set a live boss event with no speech portrait, and the main menu threw on
 * `getSpeechResource().img` for every account at login.
 */
const { expect } = require('chai');

const SDK = require('@duelyst/sdk');
const Cards = require('@duelyst/sdk/cards/cardsLookup');
const { getRotationBossIds } = require('@duelyst/worker/jobs/rotate-bosses');

describe('rotate-bosses', function () {
  const ids = getRotationBossIds();

  it('rotates through the bosses and nothing else', function () {
    // 38 bosses, QABoss3, and the prismatic copy of each: printed so a
    // shrinking list shows up as a count, not a silent pass
    expect(ids).to.have.length(78);
    expect(ids).to.include(Cards.Boss.Boss1);
    expect(ids).to.include(Cards.Boss.Boss38);
  });

  it('resolves every id it can pick to a general with speech and portrait art', function () {
    for (const id of ids) {
      const card = SDK.CardFactory.cardForIdentifier(id, SDK.GameSession.getInstance());
      expect(card, `card ${id}`).to.exist;
      expect(card.getIsGeneral(), `card ${id} is a general`).to.equal(true);
      expect(card.getSpeechResource()?.img, `card ${id} speech art`).to.be.a('string');
      expect(card.getPortraitHexResource()?.img, `card ${id} portrait art`).to.be.a('string');
    }
  });

  it('never picks the boss minions that crashed login', function () {
    expect(ids).to.not.include(Cards.Boss.Boss6Wings); // 200106, the old hand-kept exclusion
    expect(ids).to.not.include(Cards.Boss.Boss6Chassis); // 200206, the 2026-10-19 incident
    expect(ids).to.not.include(Cards.Boss.Boss6Sword); // 200306, next in line
    expect(ids).to.not.include(Cards.Boss.FrostfireImp);
  });
});
