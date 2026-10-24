const fs = require('node:fs');
const path = require('node:path');
const { expect } = require('chai');

/*
 * Holds the screen tour's census (test/e2e/screens.mjs) against the source.
 *
 * The tour can only fail for screens it visits. A LayoutView added later that
 * nobody adds to the tour is exactly the regression the tour exists to catch,
 * and it would report green - "a gate that reports OK is not a gate that
 * looked" (AGENTS.md). So this counts every `LayoutView.extend` site under
 * apps/client/ui and requires each to have exactly one census entry, and
 * checks each toured landmark is still declared where the census says it is.
 * It needs no browser and no stack, so it runs with the unit suite in CI even
 * though the tour itself does not.
 */

const ROOT = path.resolve(__dirname, '../../..');
const UI_ROOT = path.join(ROOT, 'apps/client/ui');
const SHELL_ROOT = path.join(UI_ROOT, 'shells');
const LAYOUT_SITE = /(?:var|let|const)\s+(\w+)\s*=\s*Backbone\.Marionette\.LayoutView\.extend\(/g;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.[jt]s$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Every `X = Backbone.Marionette.LayoutView.extend(` site, as {name, file}. */
function layoutSites() {
  const sites = [];
  for (const file of walk(UI_ROOT)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(LAYOUT_SITE)) {
      sites.push({ name: match[1], file: path.relative(ROOT, file).split(path.sep).join('/') });
    }
  }
  return sites.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Whether a selector's own id/classes are declared in a view file or template.
 * `#a.b.c` must appear as `id: 'a'` (or id="a") and every class as part of a
 * `className:` (or class="...") declaration.
 */
function declares(source, selector) {
  const ids = [...selector.matchAll(/#([\w-]+)/g)].map((m) => m[1]);
  const classes = [...selector.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
  const declaredIds = [...source.matchAll(/\bid(?::\s*|=)['"]([\w-]+)['"]/g)].map((m) => m[1]);
  const classLists = [...source.matchAll(/\bclass(?:Name:\s*|=)['"]([^'"]+)['"]/g)].map((m) =>
    m[1].split(/\s+/),
  );
  return (
    ids.every((id) => declaredIds.includes(id)) &&
    (classes.length === 0 || classLists.some((list) => classes.every((c) => list.includes(c))))
  );
}

describe('screen tour census', () => {
  let SCREENS;
  beforeAll(async () => {
    ({ SCREENS } = await import('../../e2e/screens.mjs'));
  });

  it('finds the LayoutView sites it is counting', () => {
    // 23 when issue #2 was written; 22 since the quest log became a shell
    // (#10); 21 since the dead premium purchase dialog was deleted (#57). If
    // this moves, the census below says which screen to add or remove -
    // update this number with it.
    expect(layoutSites()).to.have.length(21);
  });

  it('has exactly one census entry per LayoutView, in the file that declares it', () => {
    const census = SCREENS.filter((s) => !s.kind);
    const unaccounted = layoutSites().filter(
      (site) => !census.some((s) => s.name === site.name && s.file === site.file),
    );
    expect(unaccounted, 'LayoutViews the screen tour does not account for').to.deep.equal([]);

    const stale = census.filter(
      (s) => !layoutSites().some((site) => site.name === s.name && site.file === s.file),
    );
    expect(stale, 'census entries with no matching LayoutView').to.deep.equal([]);

    const names = SCREENS.map((s) => s.name);
    expect(
      names.filter((n, i) => names.indexOf(n) !== i),
      'duplicate entries',
    ).to.deep.equal([]);
  });

  it('gives every entry a status, and a reason for each one not toured', () => {
    for (const s of SCREENS) {
      expect(['toured', 'abstract', 'skipped', 'dropped'], s.name).to.include(s.status);
      if (s.status === 'toured') expect(s.landmark, `${s.name} landmark`).to.be.a('string');
      if (s.status === 'skipped' || s.status === 'dropped') {
        expect(s.reason, `${s.name} reason`).to.be.a('string').and.not.be.empty;
      }
      if (s.status === 'abstract') {
        for (const name of s.concrete) {
          const sub = SCREENS.find((c) => c.name === name);
          expect(sub, `${s.name} -> ${name}`).to.exist;
          expect(sub.status, `${name} status`).to.equal('toured');
        }
      }
    }
  });

  it('tours 24 screens: 17 LayoutViews, 4 concrete subclasses, 1 shell, crafting and the main menu', () => {
    const toured = SCREENS.filter((s) => s.status === 'toured');
    expect(toured.filter((s) => !s.kind)).to.have.length(17);
    expect(toured.filter((s) => s.kind === 'subclass')).to.have.length(4);
    expect(toured.filter((s) => s.kind === 'Shell')).to.have.length(1);
    expect(toured.map((s) => s.name)).to.include.members([
      'CraftingCompositeView',
      'MainMenuItemView',
    ]);
    expect(toured).to.have.length(24);
  });

  it('has exactly one toured census entry per shell, each checking its component rendered', () => {
    const shells = walk(SHELL_ROOT)
      .map((file) => path.relative(ROOT, file).split(path.sep).join('/'))
      .sort();
    const census = SCREENS.filter((s) => s.kind === 'Shell');
    expect(census.map((s) => s.file).sort(), 'shell files vs census').to.deep.equal(shells);
    for (const s of census) {
      expect(s.status, `${s.name} status`).to.equal('toured');
      // the shell's own root renders even if the component never registered
      expect(s.visible, `${s.name} visible`).to.be.a('string');
      expect(s.visibleDeclaredIn, `${s.name} visibleDeclaredIn`).to.match(
        /^apps\/client\/ui\/components\//,
      );
    }
  });

  it("finds each toured landmark declared in the screen's own source", () => {
    const missing = SCREENS.filter((s) => s.status === 'toured')
      .filter((s) => {
        const source = fs.readFileSync(path.join(ROOT, s.declaredIn || s.file), 'utf8');
        return !declares(source, s.landmarkDeclares || s.landmark);
      })
      .map((s) => `${s.name}: ${s.landmarkDeclares || s.landmark}`);
    expect(missing, 'landmarks no longer declared by their view').to.deep.equal([]);
  });

  it('finds each visible child declared in the template the census names', () => {
    const missing = SCREENS.filter((s) => s.visible)
      .filter((s) => {
        if (s.attached || !s.visibleDeclaredIn) return true;
        const source = fs.readFileSync(path.join(ROOT, s.visibleDeclaredIn), 'utf8');
        return !declares(source, s.visible);
      })
      .map((s) => `${s.name}: ${s.visible}`);
    expect(missing, 'visible children no longer declared').to.deep.equal([]);
  });
});
