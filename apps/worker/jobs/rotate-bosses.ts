/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
Job - Rotate Boss Battles
*/
const DuelystFirebase = require('../../server/lib/duelyst_firebase_module');
const Logger = require('@duelyst/common/logger');
const SDK = require('@duelyst/sdk');
const Cards = require('@duelyst/sdk/cards/cardsLookup');
const moment = require('moment');

/*
 * Cards.Boss holds every boss-faction card, not just the bosses: minions,
 * tokens and transforms (Boss6Chassis, Boss31Treat1, FrostfireImp...) share
 * the namespace. Those have no speech portrait, and the main menu and boss
 * deck select read the event's boss art at login, so rotating onto one takes
 * login down for every account. Only a general with both portraits can
 * headline an event; the list is derived from the card data so a new boss
 * needs no edit here.
 */
let rotationBossIds = null;
const getRotationBossIds = function () {
  if (rotationBossIds == null) {
    rotationBossIds = Object.values<any>(Cards.Boss).filter(function (id) {
      const card = SDK.CardFactory.cardForIdentifier(id, SDK.GameSession.getInstance());
      return (
        card != null &&
        card.getIsGeneral?.() &&
        card.getSpeechResource()?.img != null &&
        card.getPortraitHexResource()?.img != null
      );
    });
  }
  return rotationBossIds;
};

const oneDay = 24 * 60 * 60 * 1000; // Milliseconds.

/**
 * Job - 'rotate-bosses'
 * @param  {Object} job    Kue job
 * @param  {Function} done   Callback when job is complete
 */
module.exports = function (job, done) {
  Logger.module('JOB').debug(`[J:${job.id}] rotate-bosses starting`);

  // Get boss events from Firebase.
  return DuelystFirebase.connect()
    .getRootRef()
    .then((rootRef) =>
      rootRef
        .child('boss-events')
        .once('value')
        .then(function (snapshot) {
          let event;
          const currentBossEvents = snapshot.val();
          const BossIds = getRotationBossIds();
          let nextBossId = BossIds[0];
          const now = moment().utc().valueOf();

          // Check for an active boss event.
          if (currentBossEvents != null && Object.keys(currentBossEvents).length > 0) {
            event = currentBossEvents[Object.keys(currentBossEvents)[0]];

            // If there is an active boss already, do nothing.
            if (now < event.event_end) {
              Logger.module('JOB').log('rotate-bosses: boss event is already active');
              return done();
            }

            // Determine the next boss ID. A boss_id that is not in the
            // rotation (an older, broken pick) has index -1 and restarts it.
            let nextBossIndex = BossIds.indexOf(event.boss_id) + 1;
            if (nextBossIndex >= BossIds.length) {
              nextBossIndex = nextBossIndex - BossIds.length;
            }
            nextBossId = BossIds[nextBossIndex];
          }

          // Create a new boss event.
          event = {
            'boss-battle': {
              event_id: 'boss-battle',
              boss_id: nextBossId,
              event_start: now,
              event_end: now + oneDay,
              valid_end: now + oneDay,
            },
          };
          return DuelystFirebase.connect()
            .getRootRef()
            .then((rootRef) =>
              rootRef.child('boss-events').set(event, function (error) {
                if (error != null) {
                  Logger.module('JOB').error(`rotate-bosses: error: ${error}`);
                  return done(error);
                }
                Logger.module('JOB').log(`rotate-bosses: started event for boss ${nextBossId}`);
                return done();
              }),
            );
        }),
    )
    .catch(function (error) {
      Logger.module('JOB').error(`rotate-bosses: error: ${error}`);
      return done(error);
    });
};

module.exports.getRotationBossIds = getRotationBossIds;
