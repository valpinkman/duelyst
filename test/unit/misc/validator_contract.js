/*
 * Pins the `validator` behaviours the server's input checks depend on.
 *
 * These guard invite codes, referral codes and gift codes, so a silent change
 * here is an authorization change, not a cosmetic one. The specific hazard on
 * the 3.43 -> 13 upgrade was `isLength`: v3 took a positional minimum
 * (`isLength(str, 4)`) and modern validator documents an options object
 * (`{ min: 4 }`). If the positional form were quietly ignored, every length
 * check in the codebase would start returning true for ANY input - including
 * the empty string - and nothing else in the suite would notice.
 *
 * It turns out v13 still honours the positional form, which is why the call
 * sites were left alone. This test is what makes that a decision rather than
 * an assumption: if a future validator drops that compatibility, this fails
 * instead of silently disabling the checks.
 */
const { expect } = require('chai');
const validator = require('validator');

describe('validator contract', () => {
  describe('isLength with a positional minimum (the v3 call form)', () => {
    it('expect strings shorter than the minimum to be rejected', () => {
      expect(validator.isLength('', 4)).to.equal(false);
      expect(validator.isLength('a', 4)).to.equal(false);
      expect(validator.isLength('abc', 4)).to.equal(false);
    });

    it('expect strings at or over the minimum to be accepted', () => {
      expect(validator.isLength('abcd', 4)).to.equal(true);
      expect(validator.isLength('kumite14', 4)).to.equal(true);
    });

    it('expect the options form to agree with the positional form', () => {
      ['', 'a', 'abc', 'abcd', 'kumite14'].forEach((s) => {
        expect(validator.isLength(s, 4)).to.equal(validator.isLength(s, { min: 4 }));
      });
    });
  });

  describe('the other checks the server relies on', () => {
    const uuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

    it('expect isUUID to take a positional version', () => {
      expect(validator.isUUID(uuid, 4)).to.equal(true);
      expect(validator.isUUID('kumite14', 4)).to.equal(false);
    });

    it('expect isAlphanumeric to reject punctuation', () => {
      expect(validator.isAlphanumeric('abc12')).to.equal(true);
      expect(validator.isAlphanumeric('a-b')).to.equal(false);
    });

    it('expect matches to take a RegExp', () => {
      const re = /^[0-9]{4}-[0-9]{2}/i;
      expect(validator.matches('2024-05', re)).to.equal(true);
      expect(validator.matches('nope', re)).to.equal(false);
    });

    it('expect equals to compare strings', () => {
      expect(validator.equals('a', 'a')).to.equal(true);
      expect(validator.equals('a', 'b')).to.equal(false);
    });
  });
});
