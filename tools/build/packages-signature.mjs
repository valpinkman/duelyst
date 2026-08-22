/*
 * Content signatures for the generated asset packages.
 *
 * `packages-manifest.json` used to lock only the package KEY SET. That misses
 * the failure mode this tree is most exposed to: `generate_packages.js`
 * TEXT-PARSES `// pragma PKGS:` comments, so a UI file that loses its pragma
 * keeps every package key alive while quietly emptying one of them - the build
 * stays green and the screen ships with missing art. Only 75 of 204 files in
 * `app/ui` carry a pragma, and every screen migration is a chance to drop one
 * (docs/BACKBONE_REMOVAL_PLAN.md section 5).
 *
 * A signature is `<resource count>:<sha256 prefix over the sorted resource
 * list>`. Resources are identified by name plus the sprite frame and every
 * asset path they point at, so a resource that is dropped, renamed or
 * repointed at a different file all move the hash.
 *
 * Package contents depend on the generator's mode: `-fa`
 * (`forceAllResources`, used for development builds) appends every known RSX
 * entry to the `all` package. The manifest therefore records a signature per
 * mode wherever the two disagree, and the build compares the mode it actually
 * generated. Today `all` is the only package that differs.
 */
import crypto from 'node:crypto';

export const MANIFEST_VERSION = 2;

export const MODE_DEFAULT = 'default';
export const MODE_FORCE_ALL = 'forceAllResources';

// the RSX fields that name a file on disk, same list the resource copy uses
const RSX_PATH_KEYS = [
  'img',
  'imgPosX',
  'imgNegX',
  'imgPosY',
  'imgNegY',
  'imgPosZ',
  'imgNegZ',
  'audio',
  'plist',
  'font',
];

// generate_packages.js strips quotes out of the emitted literals unevenly, so
// the same resource can reach us as `foo` or `"foo"` depending on where it was
// spliced in - normalise before hashing
function canonical(value) {
  return value == null ? '' : String(value).replace(/['"]/g, '');
}

export function signResource(resource) {
  return [canonical(resource.name), canonical(resource.frame)]
    .concat(RSX_PATH_KEYS.map((key) => canonical(resource[key])))
    .join('|');
}

/** `{ packageKey: '<count>:<hash>' }` for every non-function entry in packages.js. */
export function signPackages(pkgs) {
  const signatures = {};
  for (const key of Object.keys(pkgs).sort()) {
    const pkg = pkgs[key];
    if (typeof pkg === 'function') continue;
    if (!Array.isArray(pkg)) {
      throw new Error(`asset package "${key}" is not an array (got ${typeof pkg})`);
    }
    // sorted: package order is a load-order detail, membership is what we lock
    const resources = pkg.map(signResource).sort();
    const hash = crypto.createHash('sha256').update(resources.join('\n')).digest('hex');
    signatures[key] = `${resources.length}:${hash.slice(0, 12)}`;
  }
  return signatures;
}

/**
 * Fold per-mode signature maps into the manifest's `packages` value: a bare
 * string where the modes agree, `{ mode: signature }` where they do not.
 *
 * Refuses a key that only some modes generate. The manifest records what each
 * package CONTAINS per mode; it has no way to say a package EXISTS in one mode
 * and not another, and recording the one-sided half is worse than refusing:
 * the mode that lacks the key then reports it as a missing package, i.e. as
 * drift, and points the reader at a dropped `// pragma PKGS:` comment that
 * does not exist. Re-running `--update-packages-manifest` writes the same
 * half back, so the manifest is permanently unsatisfiable in that mode.
 *
 * Unreachable today: `-fa` only appends RSX entries to the existing `all`
 * package, so both modes generate the same key set. It is a hard stop rather
 * than a warning because whoever gets here has introduced a concept the format
 * cannot express — per-mode package existence — and that wants deciding
 * (absent package? empty one?) and teaching to `diffSignatures`, which
 * compares key sets without knowing the mode. This fold cannot invent the
 * answer, and it fails at the deliberate update run rather than leaving it for
 * a production build to trip over later.
 */
export function mergeSignatures(signaturesByMode) {
  const modes = Object.keys(signaturesByMode);
  const keys = new Set(modes.flatMap((mode) => Object.keys(signaturesByMode[mode])));
  const packages = {};
  for (const key of [...keys].sort()) {
    const present = modes.filter((mode) => signaturesByMode[mode][key] != null);
    if (present.length !== modes.length) {
      const absent = modes.filter((mode) => !present.includes(mode));
      throw new Error(
        `asset package "${key}" is generated in mode(s) ${present.join(', ')} but not in ${absent.join(', ')}. The manifest cannot record a package that exists in only some generator modes - see mergeSignatures in scripts/build/packages-signature.mjs.`,
      );
    }
    const values = new Set(present.map((mode) => signaturesByMode[mode][key]));
    if (values.size === 1) {
      packages[key] = [...values][0];
    } else {
      packages[key] = Object.fromEntries(
        present.map((mode) => [mode, signaturesByMode[mode][key]]),
      );
    }
  }
  return packages;
}

function expectedFor(entry, mode) {
  if (entry == null) return null;
  if (typeof entry === 'string') return entry;
  return entry[mode] ?? null;
}

function countOf(signature) {
  return Number.parseInt(signature.split(':')[0], 10);
}

/**
 * Compare a freshly generated signature map against the manifest.
 * `missing`/`added` are key-set drift, `changed` is contents drift.
 */
export function diffSignatures(golden, current, mode) {
  const goldenKeys = Object.keys(golden);
  const currentKeys = new Set(Object.keys(current));
  const missing = goldenKeys.filter((key) => !currentKeys.has(key));
  const added = [...currentKeys].filter((key) => golden[key] == null);
  const changed = [];
  for (const key of goldenKeys) {
    if (!currentKeys.has(key)) continue;
    const expected = expectedFor(golden[key], mode);
    if (expected == null) {
      throw new Error(
        `asset package manifest has no "${mode}" signature for package "${key}". Rerun the build with --update-packages-manifest and commit the manifest.`,
      );
    }
    if (expected !== current[key]) changed.push({ key, expected, actual: current[key] });
  }
  return { missing, added, changed };
}

function sample(values, describe) {
  const shown = values.slice(0, 5).map(describe).join(', ');
  return values.length > 5 ? `${shown}, ...` : shown;
}

/** Human-readable drift report, or null when the manifest holds. */
export function describeDrift({ missing, added, changed }) {
  if (missing.length === 0 && added.length === 0 && changed.length === 0) return null;
  const lines = [];
  if (missing.length > 0 || added.length > 0) {
    lines.push(
      `asset package set changed: ${missing.length} missing (${sample(missing, (k) => k)}), ${added.length} added (${sample(added, (k) => k)})`,
    );
  }
  if (changed.length > 0) {
    lines.push(`asset package contents changed in ${changed.length} package(s):`);
    for (const { key, expected, actual } of changed.slice(0, 20)) {
      const delta = countOf(actual) - countOf(expected);
      const sign = delta > 0 ? `+${delta}` : `${delta}`;
      lines.push(
        `  ${key}: ${countOf(expected)} -> ${countOf(actual)} resources (${delta === 0 ? 'same count, different resources' : sign}) [${expected} -> ${actual}]`,
      );
    }
    if (changed.length > 20) lines.push(`  ... and ${changed.length - 20} more`);
  }
  lines.push(
    'If intentional, rerun with --update-packages-manifest and commit the manifest. A package that lost resources without an intended change is usually a dropped "// pragma PKGS:" comment.',
  );
  return lines.join('\n');
}
