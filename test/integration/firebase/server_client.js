const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const { expect } = require('chai');
const _ = require('underscore');

const config = require('../../../config/config');
const DuelystFirebase = require('@duelyst/server/lib/duelyst_firebase_module');

const firebaseUrl = config.get('firebase.url');
const testRef = '/test-ref-server';
const testObject = { message: 'hello from firebase unit tests', timestamp: Date.now() };

describe('Firebase.ServerClient.IntegrationTests', () => {
  it('should reject on invalid firebase.url', () =>
    DuelystFirebase.connect('invalidurl')
      .getRootRef()
      .then((rootRef) => {
        expect(rootRef).to.not.exist;
      })
      .catch((e) => {
        expect(e).to.exist;
        expect(e).to.be.instanceOf(Error);
        expect(DuelystFirebase.getNumConnections()).to.be.equal(0);
      }));

  it('should resolve on success', () =>
    DuelystFirebase.connect(firebaseUrl)
      .getRootRef()
      .then((rootRef) => {
        expect(rootRef).to.exist;
        expect(rootRef.toString()).to.be.equal(firebaseUrl);
        expect(DuelystFirebase.getNumConnections()).to.be.equal(1);
        DuelystFirebase.disconnect(firebaseUrl);
      }));

  it('should avoid recreating existing connections', () => {
    const firstRef = DuelystFirebase.connect(firebaseUrl).getRootRef();

    return DuelystFirebase.connect(firebaseUrl)
      .getRootRef()
      .then((rootRef) => {
        expect(rootRef).to.exist;
        expect(rootRef.toString()).to.be.equal(firebaseUrl);
        expect(DuelystFirebase.getNumConnections()).to.be.equal(1);
        DuelystFirebase.disconnect(firebaseUrl);
      });
  });

  it('should create new connections for new URLs', () => {
    const anotherUrl = 'https://another-duelyst-project.firebaseio.local/';
    const firstRef = DuelystFirebase.connect(firebaseUrl).getRootRef();

    return DuelystFirebase.connect(anotherUrl)
      .getRootRef()
      .then((rootRef) => {
        expect(rootRef).to.exist;
        expect(DuelystFirebase.getNumConnections()).to.be.equal(2);
        DuelystFirebase.disconnect(firebaseUrl);
        DuelystFirebase.disconnect(anotherUrl);
      });
  });

  /*
   * Both of these used to drop the inner promise instead of returning it, so
   * the assertions ran after the test had already resolved - they could not
   * fail the run, only surface as an unhandled rejection. The read-back
   * assertion was also written `expect(snapshot.val().to.be.equal(x))`, with
   * the paren in the wrong place, so it read `.to` off the VALUE and threw
   * TypeError instead of ever comparing anything (upstream 4ab9ccdd).
   * Returning the chains makes both tests real; `eql` because snapshot.val()
   * is a fresh object, so reference equality could never hold.
   */
  it('should write test data', () =>
    DuelystFirebase.connect(firebaseUrl)
      .getRootRef()
      .then((rootRef) => rootRef.child(testRef).set(testObject))
      .then(() => DuelystFirebase.disconnect(firebaseUrl)));

  it('should read back test data', () =>
    DuelystFirebase.connect(firebaseUrl)
      .getRootRef()
      .then((rootRef) => rootRef.child(testRef).once('value'))
      .then((snapshot) => {
        expect(snapshot.val()).to.eql(testObject);
        return DuelystFirebase.disconnect(firebaseUrl);
      }));
});
