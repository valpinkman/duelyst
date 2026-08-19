const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const { expect } = require('chai');
const loginHelpers = require('../../../server/lib/hash_helpers');

describe('login helpers', () => {
  const password = 'password';
  let returnedHash;
  const invalidHash = 'thisisainvalidhash';

  describe('node.js callback style', () => {
    describe('generate hash function', () => {
      it('expect a hash when given a password', () => new Promise((done) => {
        loginHelpers.generateHash(password, (err, hash) => {
          expect(err).to.be.equal(null);
          expect(hash).to.exist;
          // Save for next test
          returnedHash = hash;
          done();
        });
      }));
    });

    describe('compare password function', () => {
      it('expect true when comparing valid password and hash', () => new Promise((done) => {
        loginHelpers.comparePassword(password, returnedHash, (err, match) => {
          expect(err).to.be.equal(null);
          expect(match).to.be.true;
          done();
        });
      }));

      it('expect false when comparing bad password and hash', () => new Promise((done) => {
        loginHelpers.comparePassword(password, invalidHash, (err, match) => {
          expect(err).to.be.equal(null);
          expect(match).to.be.false;
          done();
        });
      }));
    });
  });

  describe('promises style', () => {
    describe('generate hash function', () => {
      it('expect a hash when given a password', () => loginHelpers.generateHash(password).then((hash) => {
        expect(hash).to.exist;
        // NOTE: this callback used to do `this.hash = hash` - under mocha's
        // sloppy mode that wrote to the global object and was never read
        // (the callback-style test above sets `returnedHash`, which is what
        // the later tests use). Dropped rather than preserved: in strict
        // mode it throws.
      }));
    });

    describe('compare password function', () => {
      it('expect true when comparing valid password and hash', () => loginHelpers.comparePassword(password, returnedHash).then((match) => {
        expect(match).to.be.true;
      }));

      it('expect false when comparing bad password and hash', () => loginHelpers.comparePassword(password, invalidHash).then((match) => {
        expect(match).to.be.false;
      }));
    });
  });
});
