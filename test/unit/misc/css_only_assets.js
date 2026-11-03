const fs = require('node:fs');
const path = require('node:path');
const { expect } = require('chai');
const RSX = require('@duelyst/data/resources');

/*
 * Assets referenced ONLY from SCSS reach the shipped build through
 * tools/generate_packages.js: it scans the compiled dist/src/duelyst.css for
 * `resources/...` paths and adds what it finds to the "all" package, which is
 * the list tools/build/build-client.mjs step 7 copies into dist/src.
 *
 * That scan has one failure mode, and it is silent. Every entry in the "all"
 * package is identified by its `name`, twice over:
 *
 *   - an aliased path (one an RSX entry already points at) is recorded as
 *     `RSX.<key>`, where the key comes back from RSX.getResourceKeyByResourceName()
 *     -- a name->key map built last-write-wins, so two entries sharing a `name`
 *     make one of them unreachable;
 *   - a non-aliased path is recorded as a synthesised entry named after the
 *     file, and the "all" package is finally deduplicated BY NAME, so a
 *     synthesised name that an RSX entry already claims is discarded.
 *
 * Either way the asset is dropped from the package, never copied, and 404s at
 * runtime while the build stays green. Both live misses were of this shape:
 * `resources/ui/button_back.png` (its RSX entry's name was also on
 * `button_back_corner`) and `resources/tutorial/vignette.png` (synthesised
 * `vignette`, already taken by `resources/ui/vignette.png`).
 *
 * This test is that gate, on the source rather than on a built tree: it walks
 * the SCSS, resolves each reference exactly as the generator does -- through
 * RSX's own reverse maps, not a copy of them -- and fails if the name the
 * asset would be filed under does not lead back to the asset.
 */

const ROOT = path.resolve(__dirname, '../../..');
const STYLES_ROOT = path.join(ROOT, 'apps/client/ui');

// the RSX fields that name a file on disk
const PATH_KEYS = ['img', 'audio', 'plist', 'font'];

// quoted "resources/<...>.<ext>" literals; SCSS interpolation (#{}, $) is
// excluded because those references are dynamic and resolved by partial match
const SCSS_RESOURCE_REF = /["'](resources\/[^"'#$]+\.\w+)["']/g;

function scssFiles(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...scssFiles(full));
    else if (entry.name.endsWith('.scss')) found.push(full);
  }
  return found;
}

function collectReferences() {
  const refs = new Map();
  for (const file of scssFiles(STYLES_ROOT)) {
    const content = fs.readFileSync(file, 'utf8');
    for (const match of content.matchAll(SCSS_RESOURCE_REF)) {
      if (!refs.has(match[1])) refs.set(match[1], path.relative(ROOT, file));
    }
  }
  return refs;
}

function resourceNamesInUse() {
  const names = new Set();
  for (const key of Object.keys(RSX)) {
    const resource = RSX[key];
    if (resource != null && typeof resource === 'object' && typeof resource.name === 'string') {
      names.add(resource.name);
    }
  }
  return names;
}

/** The reason `assetPath` would be dropped from the "all" package, or null. */
function packagingFault(assetPath, namesInUse) {
  const aliases = RSX.getResourcesByPath(assetPath);
  if (aliases.length === 0) {
    // generate_packages.js synthesises `{ name: <file name>, img: <path> }`
    const synthesised = path.basename(assetPath, path.extname(assetPath));
    return namesInUse.has(synthesised)
      ? `would be packaged as a synthesised resource named "${synthesised}", but an RSX entry already claims that name, and the "all" package is deduplicated by name`
      : null;
  }
  for (const alias of aliases) {
    const key = RSX.getResourceKeyByResourceName(alias.name);
    const resolved = RSX[key];
    if (resolved == null || !PATH_KEYS.some((pathKey) => resolved[pathKey] === assetPath)) {
      return `has an RSX entry named "${alias.name}", but that name maps back to key "${key}" (${resolved && resolved.img}) -- another entry shares the name, so this one is unreachable`;
    }
  }
  return null;
}

describe('CssOnlyAssets.UnitTests', () => {
  let references;
  let namesInUse;

  beforeAll(() => {
    references = collectReferences();
    namesInUse = resourceNamesInUse();
  });

  it('finds the SCSS asset references, including the two that used to 404', () => {
    // a scan that silently stops matching would make every assertion below
    // vacuous, so pin that it still sees the tree and the two known assets
    expect(references.size).to.be.above(150);
    expect([...references.keys()]).to.include('resources/tutorial/vignette.png');
    expect([...references.keys()]).to.include('resources/ui/button_back.png');
  });

  it('files every CSS-only asset under a name that leads back to it', () => {
    const faults = [];
    for (const [assetPath, source] of references) {
      const fault = packagingFault(assetPath, namesInUse);
      if (fault != null) faults.push(`${assetPath} (${source}) ${fault}`);
    }
    expect(
      faults,
      `these assets would be dropped from the "all" package:\n  ${faults.join('\n  ')}`,
    ).to.be.empty;
  });

  it('keeps the two assets carved out of issue #27 resolvable', () => {
    // the general assertion above would catch a regression here too; these
    // name the cases so the failure says which screen breaks
    expect(packagingFault('resources/tutorial/vignette.png', namesInUse)).to.equal(null);
    expect(packagingFault('resources/ui/button_back.png', namesInUse)).to.equal(null);
  });
});
