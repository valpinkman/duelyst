const { expect } = require('chai');

/*
 * The build's asset-package gate (scripts/build/build-client.mjs step 1) used
 * to lock only the package KEY SET. A UI file that loses its `// pragma PKGS:`
 * comment empties a package without adding or removing a single key, so the
 * build stayed green and the screen shipped with missing art
 * (docs/BACKBONE_REMOVAL_PLAN.md section 5).
 *
 * These tests are the mechanical half of that gate's negative test: they pin
 * that a package losing a resource, or having one repointed at a different
 * file, moves its signature - and that a pure reordering does not, because a
 * gate that fires on load order would be turned off within a week.
 */
let signatures;

const RESOURCE_A = { name: 'card_art', img: 'resources/cards/art.png' };
const RESOURCE_B = {
  name: 'tile_hover',
  frame: 'tile_hover.png',
  img: 'resources/tiles/tiles_board.png',
  plist: 'resources/tiles/tiles_board.plist',
};
const RESOURCE_C = { name: 'sfx_select', audio: 'resources/sfx/sfx_ui_select.m4a' };

function packages() {
  return {
    nongame: [RESOURCE_A, RESOURCE_B],
    game: [RESOURCE_C],
    getPkgForIdentifier() {},
  };
}

describe('PackagesSignature.UnitTests', () => {
  beforeAll(async () => {
    signatures = await import('../../../scripts/build/packages-signature.mjs');
  });

  describe('signPackages', () => {
    it('signs every package and ignores the helper functions', () => {
      const signed = signatures.signPackages(packages());
      expect(Object.keys(signed)).to.eql(['game', 'nongame']);
      expect(signed.nongame).to.match(/^2:[0-9a-f]{12}$/);
      expect(signed.game).to.match(/^1:[0-9a-f]{12}$/);
    });

    it('changes only the affected package when one loses a resource', () => {
      const before = signatures.signPackages(packages());
      const after = signatures.signPackages({ ...packages(), nongame: [RESOURCE_A] });
      expect(after.nongame).to.not.equal(before.nongame);
      expect(after.nongame).to.match(/^1:/);
      expect(after.game).to.equal(before.game);
    });

    it('changes the signature when a resource is repointed at another file', () => {
      const before = signatures.signPackages(packages());
      const repointed = { ...RESOURCE_A, img: 'resources/cards/other_art.png' };
      const after = signatures.signPackages({ ...packages(), nongame: [repointed, RESOURCE_B] });
      expect(after.nongame).to.not.equal(before.nongame);
      // same count: a count-only lock would have missed this
      expect(after.nongame).to.match(/^2:/);
    });

    it('is insensitive to package order', () => {
      const before = signatures.signPackages(packages());
      const after = signatures.signPackages({ ...packages(), nongame: [RESOURCE_B, RESOURCE_A] });
      expect(after.nongame).to.equal(before.nongame);
    });

    it('ignores the quoting generate_packages.js leaves behind', () => {
      const quoted = { name: '"card_art"', img: '"resources/cards/art.png"' };
      const signed = signatures.signPackages({ nongame: [quoted] });
      expect(signed.nongame).to.equal(signatures.signPackages({ nongame: [RESOURCE_A] }).nongame);
    });
  });

  describe('mergeSignatures', () => {
    it('collapses agreeing modes to one signature and keeps disagreeing ones apart', () => {
      const merged = signatures.mergeSignatures({
        default: { all: '8401:aaaaaaaaaaaa', game: '1:bbbbbbbbbbbb' },
        forceAllResources: { all: '8678:cccccccccccc', game: '1:bbbbbbbbbbbb' },
      });
      expect(merged.game).to.equal('1:bbbbbbbbbbbb');
      expect(merged.all).to.eql({
        default: '8401:aaaaaaaaaaaa',
        forceAllResources: '8678:cccccccccccc',
      });
    });
  });

  describe('diffSignatures / describeDrift', () => {
    const golden = {
      game: '1:bbbbbbbbbbbb',
      all: { default: '8401:aaaaaaaaaaaa', forceAllResources: '8678:cccccccccccc' },
    };

    it('reports no drift when the manifest holds for the generated mode', () => {
      const drift = signatures.diffSignatures(
        golden,
        { game: '1:bbbbbbbbbbbb', all: '8678:cccccccccccc' },
        'forceAllResources',
      );
      expect(drift).to.eql({ missing: [], added: [], changed: [] });
      expect(signatures.describeDrift(drift)).to.equal(null);
    });

    it('names the package and the delta when contents change', () => {
      const drift = signatures.diffSignatures(
        golden,
        { game: '0:dddddddddddd', all: '8401:aaaaaaaaaaaa' },
        'default',
      );
      expect(drift.changed).to.have.length(1);
      expect(drift.changed[0].key).to.equal('game');
      const message = signatures.describeDrift(drift);
      expect(message).to.contain('game: 1 -> 0 resources (-1)');
      expect(message).to.contain('pragma PKGS');
    });

    it('still catches key-set drift', () => {
      const drift = signatures.diffSignatures(
        golden,
        { all: '8401:aaaaaaaaaaaa', newpkg: '3:eeeeeeeeeeee' },
        'default',
      );
      expect(drift.missing).to.eql(['game']);
      expect(drift.added).to.eql(['newpkg']);
      expect(signatures.describeDrift(drift)).to.contain('asset package set changed');
    });

    it('refuses a manifest that has no signature for the generated mode', () => {
      expect(() =>
        signatures.diffSignatures(
          { all: { default: '8401:aaaaaaaaaaaa' } },
          { all: '1:ffff' },
          'forceAllResources',
        ),
      ).to.throw(/no "forceAllResources" signature/);
    });
  });
});
