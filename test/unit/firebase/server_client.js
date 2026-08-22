const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const { expect } = require('chai');
const _ = require('underscore');

const config = require('@duelyst/config');
const DuelystFirebase = require('@duelyst/server/lib/duelyst_firebase_module');

describe('Firebase.ServerClient.UnitTests', () => {
  const firebaseUrl = 'https://duelyst-unit-tests.firebaseio.local/';

  describe('#connect()', () => {
    it('should reject on empty firebase.url', () =>
      DuelystFirebase.connect('')
        .getRootRef()
        .then((rootRef) => {
          expect(rootRef).to.not.exist;
        })
        /*
         * bluebird's `.error` caught only OPERATIONAL errors - explicit
         * rejections - and deliberately skipped programmer errors thrown from a
         * callback. Here the promise rejects explicitly, so the `.then` above
         * never runs and `.catch` sees exactly the same error. If that ever
         * changed, the message assertion below fails loudly rather than silently.
         */
        .catch((e) => {
          expect(e).to.exist;
          expect(e).to.be.instanceOf(Error);
          expect(e.message).to.eql('firebase.url must be set');
          expect(DuelystFirebase.getNumConnections()).to.be.equal(0);
        }));
  });
});
