# Removing Marionette and jQuery from OpenDuelyst — plan and decisions

**Measured 2026-08-21 at `de33c72f`** (on what is now `main`; the branch was called
`modernization` then). Every number below was derived by
scanning the tree; the commands are in [§7](#7-how-to-re-verify). This document supersedes nothing
in [`BACKBONE_AUDIT.md`](BACKBONE_AUDIT.md) — that audit establishes _what Backbone does here_, and
this one decides _what to do about it_. Read the audit first, then [`../AGENTS.md`](../AGENTS.md)
for repo conventions.

Note that the audit's own recommendation was **"not recommended: replacing Backbone/Marionette."**
That recommendation was made against an undefined goal. With the goal narrowed (§1) and the endgame
bounded (§2), the answer changes — but the audit's reasoning is still correct for the maximalist
version of the project it was evaluating.

## TL;DR

**Done means: zero Marionette, zero jQuery, zero `backfire`, zero Handlebars — and Backbone kept
and upgraded.** Backbone is not the target. Marionette 2.2.2, jQuery 2.1.4, Bootstrap 3 and
`backfire` (2015, minified, no source) are abandoned; Backbone 1.6.1 is maintained, and replacing
it would cost **1,011 `.get('x')` call sites** for no supply-chain gain.

New UI is written as **Lit 3.3.3 custom elements in light DOM**, mounted inside a ~15-line
Marionette shell view. The two stacks coexist, screen by screen, with the shell count as a CI
ratchet. Backbone stays frozen as the state layer throughout — it is the one interface both worlds
share.

**The first commit is not a migration.** It is a Playwright screen tour, written against the
current Marionette build, because `apps/client/ui` is 44,292 lines with **zero tests**.

## 1. The goal, narrowed

Two goals, both primary:

- **(a) Delete unmaintained dependencies.** `backfire`, Marionette 2.2.2, jQuery 2.1.4, Bootstrap 3.
- **(b) Make `apps/client/ui` workable.** 44,292 lines of untyped ES5-in-`.ts` — `var _ = require(…)`,
  `.extend({…})` object literals, no classes, no types, no components.

Goal (a) has an uncomfortable consequence that is easier to accept now than to discover in month
four: **it collects almost nothing until the end.** `backfire` is the only dependency that dies
early. Marionette, jQuery, Bootstrap and Handlebars all leave in one final cluster, because
`Marionette → Backbone → jQuery` is a hard chain (§2). For most of this project's life
`package.json` will look unchanged.

## 2. What is and is not reachable

`backbone.marionette@2.2.2` declares:

```json
"backbone": "1.0.0 - 1.1.2",
"underscore": "1.4.4 - 1.6.0"
```

and `backbone@1.1.2:48` is `Backbone.$ = jQuery`, used by `Backbone.View` for `$el` and event
delegation. Marionette references `Backbone.Events` (12), `Backbone.View` (7), `Backbone.$` (7),
`Backbone.Model` (5), `Backbone.Collection` (4).

Three consequences, all forced:

1. **"Keep Marionette, drop Backbone" is not a legal move.** You would have to write a
   Backbone-shaped shim for Marionette to run on — reimplementing Backbone, not removing it.
2. **jQuery cannot leave `vendor.js` until the last Marionette view is gone.**
3. **Backbone cannot be upgraded past 1.1.2 until Marionette is gone.** The upgrade is the final
   commit, not an early win. (Underscore is already out of Marionette's declared range at 1.13.8
   and works fine, so these bounds are conservative — but they are the only signal available.)

**Decision: freeze the old stack.** No intermediate Marionette bump to 2.4.7. It is abandoned
either way, so the bump buys a version number, and it would land on `views/regions/transition.ts` —
the least-tested, highest-consequence file in `apps/client/ui` (§5). The old stack should be boring while
work happens on top of it: when a screen breaks, that must mean the migration broke it.

## 3. Decisions

| #   | Decision                                                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | Goals (a) + (b), per §1                                                                                                     |
| 2   | Coexistence **with intent to finish**; shell count is a CI ratchet                                                          |
| 3   | Safety net: one screen-tour Playwright spec **before** any migration; component tests as you go                             |
| 4   | **`backfire` first**, gated on a behaviour-characterisation session                                                         |
| 5   | **Lit 3.3.3, light DOM**, `static properties`, no `@lit-labs/signals`; CJS at the boundary — **confirmed by spike, §3.1.1** |
| 6   | Backbone **frozen** as the state layer; typed model attributes as an independent early win                                  |
| 7   | Seam = a **shell `Marionette.ItemView`** wrapping the custom element; `transition.ts` untouched                             |
| 8   | First screen: **`views2/quests/quest_log_layout.ts`**                                                                       |
| 9   | jQuery: velocity pass early; Bootstrap build-forward-only; jquery-ui deferred; `$el` left to decay                          |
| 10  | Content-level package drift check + narrowed 404 allowlist, in the tour commit                                              |
| 11  | New code in `apps/client/ui/components/`, kebab-case files matching tags, inline templates                                  |
| 12  | Done = 0 Marionette / jQuery / `backfire` / Handlebars; Backbone kept and upgraded                                          |
| 13  | ESM migration **deferred**, revisited after coexistence ends                                                                |

### 3.1 Why Lit, and why light DOM

Three properties of _this_ repo decide it, none of which is "web components are the standard":

- **The custom element registry is the coexistence mechanism, and it is free.** `apps/client/ui` is 100%
  CommonJS — 200 files with `require()`, zero with `import`, and `vite.config.client.mjs` says so
  ("the whole graph is CommonJS"). Every modern candidate is ESM-only. With custom elements you do
  not import at the call site: you `require()` the module once for its registration side effect and
  the boundary becomes the string `<duelyst-quest-log>` in a template. Preact needs
  `render(<X/>, el)` plus a ref-and-effect dance to host a Marionette view back inside it.
- **lit-html does not fight jQuery over the DOM.** `$el.addClass` (73), `removeClass` (59), `css`
  (26), plus velocity and jquery-ui mutate the very nodes these views render. lit-html updates only
  the _parts_ it created, so an unbound `class` or `style` is left alone; a VDOM diff reconciles the
  whole subtree and clobbers them. This is the argument that would favour Preact in a different
  codebase and rules it out in this one.
- **Light DOM is mandatory.** 12,508 lines of SCSS across 44 files `@import` all of Bootstrap 3.
  Shadow DOM would be a styling rewrite on top of a view rewrite. `createRenderRoot() { return this }`
  and the existing stylesheets keep working untouched.

Accept honestly that this **gives up Lit's headline feature**: no style encapsulation, no `<slot>`,
composition through template parts. At that point Lit is "lit-html plus a lifecycle base class" —
which is why `lit-html` alone was considered. It lost because it would force reinventing mounting
and teardown, which is exactly the machinery `transition.ts` already monkey-patches into Marionette.

**Not `@lit-labs/signals`.** It is `0.3.0`, wrapping a polyfill for a TC39 proposal still at
**Stage 1** — the API is explicitly not settled. Use Lit reactive properties plus the Backbone
bridge in §3.2.

**Not decorators.** `tsconfig.json` has no `experimentalDecorators` and targets `es2020`. Use
`static properties = {…}` and neither the compiler config nor the class-fields semantics this repo
is careful about (`declare x: any`) need to change.

### 3.1.1 The CJS→ESM boundary, verified — spike [#3](https://github.com/valpinkman/duelyst/issues/3)

**Decision 5 is confirmed. It was measured, not argued.** The whole of §3.1 rests on one unproven
assumption — that a CommonJS file can `require()` an ESM-only Lit module purely for its
`customElements.define` side effect and that this survives the _production_ bundle, not just dev.
It does.

The proof (`apps/client/ui/components/spike/`, `tools/spike/verify-lit-interop.mjs`, marked throwaway) is a
20-line Lit element in ESM, a `require()`-only CJS file that takes **no binding** out of it and puts
the tag in a markup string, and a headless-Chromium check run against `dist/src/duelyst.js` from a
real `pnpm build`. Six assertions, all passing: the CJS module executes, `customElements.define` runs,
the tag upgrades to the Lit class, it renders into **light DOM**, `render()` output is present, and
setting a reactive property re-renders it. That last one matters — the first five would also pass for
an element whose reactive machinery had been bundled away.

What the bundle actually does, and why it works:

- **`strictRequires: true` is doing the load-bearing work.** rolldown wraps the ESM module in a lazy
  `__esmMin` factory and emits `init_spike_probe();` as the **first statement inside** the requiring
  CJS module's `__commonJSMin` factory. So the registration side effect fires at _require time, in
  require order_ — it is not hoisted to the top of the bundle, and it is not dropped. That ordering
  guarantee is exactly what the export-before-require idiom needs, and it is what makes the
  side-effect-only require legal here.
- **`resolve.mainFields: ['browser', 'main']` does not apply to Lit, and must not.** The config
  comment says to prefer CJS builds and "never the ESM `module` entry"; Vite honours the `exports`
  map ahead of `mainFields`, so `lit` resolves to its ESM `index.js` regardless. That is the correct
  outcome — but do not read that comment as a rule that new ESM dependencies have to be fought.
- **`build.target: 'es2015'` down-levels Lit cleanly.** `?.` and `??` come out as explicit
  `=== null || === void 0` chains in the emitted bundle. No syntax reached the browser that the
  target forbids.
- **`static properties` survives as a static assignment** (`_SpikeProbe.properties = {…}`), which
  `finalize()` reads, and `declare label` + constructor assignment leaves Lit's prototype accessor
  unshadowed. The AGENTS.md class-fields warning applies to Lit components too; the spike shows the
  documented workaround is sufficient.

**Bundle cost when a Lit component actually ships: negligible, as predicted.** With the spike wired
into the entry, `dist/src/duelyst.js` goes 16,261,345 → 16,290,672 bytes, **+29,327 (+0.180%)**;
gzipped 2,298,925 → 2,306,956, **+8,031 (+0.349%)**. That is the entire Lit runtime —
`reactive-element`, `lit-html`, `lit-element` — against a 16 MB bundle. `pnpm build:client:watch` is
unaffected: initial build and incremental rebuild on touching the ESM module both emit the element.

**The spike itself ships nothing.** Nothing requires `apps/client/ui/components/spike/`, so it is unreachable
from `apps/client/index.ts` and costs the shipped bundle **zero bytes** — the figures above were measured with
the entry require temporarily in place. That is deliberate: a throwaway proof should not ride along in
every user's download, and "throwaway code behind a clear comment" has no expiry date. **To re-run the
proof**, add `require('./ui/components/spike/spike-host');` at the top of `apps/client/index.ts`, run
`pnpm build`, run `node tools/spike/verify-lit-interop.mjs`, then take the line back out. Run
against a stock bundle the verifier says exactly that rather than failing obscurely.

**What the spike deliberately does not prove**, and where the next surprise would come from:

- **No `.hbs` template was involved.** The tag went in as a plain markup string. Handlebars
  precompiles the tag as inert text, so the risk is low — but the first real shell (§3.3) is where
  that gets exercised, not here.
- **No Marionette shell.** The seam in §3.3 is [#10](https://github.com/valpinkman/duelyst/issues/10)'s
  job; this spike answers the bundler question only.
- **Only the `lit` root entry point was bundled.** `lit/directives/*` (`repeat()` is already named in
  §4 step 5) and `lit/decorators.js` are separate `exports` subpaths and were not exercised. Expect to
  re-check `repeat()` when the first screen lands; there is no reason for it to behave differently,
  but nothing here shows it.
  _Since #10:_ `lit/directives/repeat.js` and `lit/directives/unsafe-html.js` ship in the quest log
  and were checked in headless Chromium against the production bundle (keyed rows, injected
  description markup, a tag upgraded by `innerHTML` on a detached shell).
- **Nothing protects `strictRequires`, and everything depends on it.** It is an ordinary
  `commonjsOptions` setting in `vite.config.client.mjs` with no test standing behind it. Turn it off
  while tuning the bundle and every Lit component silently stops registering — the failure surfaces as
  an un-upgraded tag in the browser, **not** as a build error, which is the worst shape a regression
  can take here. A comment at the setting now points back at this section; the screen tour
  ([#2](https://github.com/valpinkman/duelyst/issues/2)) is what would actually catch it, which is
  another reason that net matters before [#10](https://github.com/valpinkman/duelyst/issues/10).

### 3.2 Why Backbone stays frozen as the state layer

**94 of 113 view files** reach into manager singletons — `NavigationManager` 182 sites,
`InventoryManager` 164, `ProfileManager` 80. The same Backbone collections feed the collection
screen, crafting, the deck builder and the shop.

So per-screen state conversion is impossible: a shared collection would need **two live
representations at once**, kept in sync, for as long as any consumer is un-migrated. Backbone stays,
the managers are the stable interface between old and new, and the bridge is ~40 lines:

```ts
// a Lit ReactiveController that re-renders the host on Backbone 'change'
class BackboneController {
  hostConnected() {
    this.model.on('change', this.#update);
  }
  hostDisconnected() {
    this.model.off('change', this.#update);
  }
  #update = () => this.host.requestUpdate();
}
```

All 1,011 `.get('x')` sites survive untouched, and there is exactly one source of truth throughout.

**Independent win, unblocked by anything: type the model attributes.** `@types/backbone` is not
installed and `Backbone.Model<T>` is generic. Declaring `interface WalletAttrs { gold: number }`
gives compile-time checking on `.get('gold')` across the existing Marionette views _and_ the new Lit
ones — no rewrite, no runtime change. This is the highest value-per-risk item in the program.

### 3.3 The seam

`TransitionRegion.show(view)` requires `render()`, `$el`, `isDestroyed`, `animateIn`/`animateOut`,
`triggerMethod`, `prepareForDestroy()`, `destroy()`, and Backbone events for `destroy`/`animatedIn`.

**Do not teach Lit components that protocol.** `transition.ts` already monkey-patches four
Marionette prototypes (`Region`, `RegionManager`, `CollectionView`, `LayoutView`); adding a fifth
participant to that dance couples every new component to the framework being deleted.

Instead, a ~15-line shell:

```js
var QuestLogShell = Backbone.Marionette.ItemView.extend({
  template: function () {
    return '<duelyst-quest-log></duelyst-quest-log>';
  },
  animateIn: Animations.fadeIn,
  animateOut: Animations.fadeOut,
});
```

`transition.ts` is untouched. `animateIn`/`animateOut` animate the shell's `$el` exactly as today.
`destroy()` removes the element and `disconnectedCallback` fires naturally.

**The shell count is the ratchet.** Shells are greppable and countable; they rise during migration
and hit zero when the last one is deleted. Gate it in CI in the same spirit as
`check:undefined-names` — `Marionette.` references only ever go down.

### 3.4 Conventions

- **`apps/client/ui/components/`, not `views3/`.** `views/` and `views2/` already exist; a third numbered
  folder reads as "another abandoned generation", which is the exact impression this plan cannot
  afford. `components/` also states something structurally true.
- **Kebab-case filenames matching the tag**: `components/quests/quest-log.ts` ↔
  `<duelyst-quest-log>`. This departs from the repo's snake_case deliberately — the most frequent
  navigation during migration is "I see this tag, where is it?" Neither oxfmt nor oxlint cares.
- **Templates inline.** Each `.hbs` dies in the same commit as the view it served. A hybrid keeps
  the precompile plugin in `vite.config.client.mjs` alive forever and gets neither library's
  ergonomics.
- **Do not port the helper mechanism.** `localize` → `t()` from i18next (already a dependency);
  `imageForResourceScale` → a plain function — and note that conversion changes which regex in
  `generate_packages.js` catches the art (§5). The remaining live helpers are 1–10 uses each.

Established by the first screen, [#10](https://github.com/valpinkman/duelyst/issues/10) (the quest
log). Every later screen follows these unless its own issue decides otherwise:

- **Shells live in `apps/client/ui/shells/<screen>_shell.ts`** (snake_case: they are Marionette
  code and die with it). A shell carries what the navigation manager and `transition.ts` need — the
  old view's `id`/`className`, `animateIn`/`animateOut`, and the class identity callers pass to
  `toggleModalViewByClass()` — and its template is the tag alone. It `require()`s the component
  once, for its registration side effect. The old view folder is deleted in the same commit.
- **Properties in, events out.** The shell reads the managers and sets properties on the element
  in `onRender`; the component dispatches bubbling `CustomEvent`s (`quest-replace`,
  `free-card-claim`) and the shell turns them into manager calls. **A component never imports a
  manager**: the managers sit in the views↔managers require cycle (§6), and a component that
  stays out of it can be tested with plain Backbone objects. When the shell has to tell the
  component that a request settled, the event carries a `done()` callback in its `detail`.
- **`BackboneController`** (`components/backbone-controller.ts`) takes a getter, not a target:
  `new BackboneController(this, () => this.quests, 'add remove reset change sort', onEvent?)`. It
  re-reads the target before every update, so a shell that swaps the collection moves the
  listener with it, and it listens only while the host is connected.
- **One element per screen**; rows and sub-parts are render methods (`#renderQuest()`), not
  child elements, until a second screen needs the same part.
- **Register with a guard**: `if (!customElements.get(TAG)) customElements.define(TAG, Cls)`, so a
  watch rebuild or a second import in a test does not throw. Export the class and `TAG`.
- **Keep the markup the stylesheets select on.** Light DOM means the old SCSS applies as is,
  provided the element structure does too — the quest log keeps three always-present section
  containers because `quests.scss` uses `:first-child`/`:last-child` on them. The custom element
  itself adds a box between the shell and the old root: give it `display: contents` when the
  shell's CSS lays out its child (`.duelyst-modal` centres `.modal-dialog`).
- **`unsafeHTML` only for content the SDK or our locales author**, never for anything a player
  typed. Quest descriptions carry `<br>`; that is the one use so far.
- **Importing CommonJS from a component.** `import X from '…'` of a module that assigns
  `module.exports` works in the bundle and in vitest (both hand over `module.exports`), but a
  `.ts` module of that shape has no default export as far as `tsc` can see: mark each such
  import with `// @ts-expect-error` and a reason. A JS module (`@duelyst/data/resources`) needs
  nothing. Initialise i18next before a test loads anything from the SDK: the card factories
  replace an uninitialised `i18next.t` with the identity at load.
- **Art.** A component that names `RSX.x` needs its own `// pragma PKGS:` line, and so does a
  shell that plays sounds. Expect the drift check to fire when art moves from a bare string to
  `RSX.x`; read which resource was added and re-record on purpose.
- **Census.** A shell is a `kind: 'Shell'` entry in `test/e2e/screens.mjs` whose `visible` child is
  rendered only by the component (declared in the component file): the shell's own root renders
  even when the element never registered, which is how a lost `strictRequires` would show up.
  `screen_census.js` requires one such entry for every file in `shells/`.
- **Tests.** Component tests are vitest project `client` (happy-dom), under
  `test/unit/client/`, covering render, the Backbone binding (keyed re-render, live update,
  target swap) and teardown (no listener, no timer).

### 3.5 Before/after screenshot comparison — required for every screen port

The screen tour proves a screen opens with no missing asset and no console error; it does not
prove the port _looks_ the same. So every screen port also runs
[`test/e2e/visual/run.mjs`](../test/e2e/visual/run.mjs) ([#71](https://github.com/valpinkman/duelyst/issues/71))
and puts its table and images in the PR:

```bash
# a stack on .env.dev (NEVER .env) started from <stack checkout>, the shell sourced with the
# same env, then from the port's own checkout:
node test/e2e/visual/run.mjs --before <commit before the port> --after HEAD \
     --dist <stack checkout>/dist/src --base-url http://localhost:<api port> \
     --screens <the ported screen and its neighbours> --noise --work <dir>
```

- It builds both refs in throwaway worktrees and swaps each bundle into the `dist/src` the api
  container serves, so **only the client changes**: same backend, same database, same account
  (registered once, tutorial skipped, rift run claimed), same 1280×720 viewport, timings zeroed,
  sound muted.
- Each screen is captured whole and with the cocos canvas hidden (`.dom.png`). A Lit port shows in
  the `.dom` row; a port that owns a cocos layer (D3) shows in the full row. `--noise` captures the
  before build twice; a screen fails above **max(0.5 %, 2 × its own noise)**, or if its size
  changed, or if it exists on one side only.
- **A failing screen is not automatically a bug**, and a passing one is not proof: read the
  `*.strip.png` (before | after | diff). Every difference is either fixed in the port or named in
  the PR as intended, with Valentin's OK.
- The script runs from the port's checkout against both builds, so it navigates only through what
  both sides share (`__duelystE2E.App`, `Scene`, the NavigationManager). The practice-game screens
  are out of scope: the board is random from the first draw.

## 4. The step sequence

One commit per step, each leaving `pnpm build`, `pnpm test:unit` and `pnpm typecheck` green, per
AGENTS.md.

Every step below is filed as an issue on `myrepo` under the **`marionette-removal`** label, with
`afk` / `hitl` marking whether it needs a human. The live tracker is the long-lived PR. Issue
numbers are given inline; the 22 remaining screen migrations are deliberately **not** pre-filed —
[#12](https://github.com/valpinkman/duelyst/issues/12) decides their order once the first screen has
taught us what one actually costs.

**Phase 0 — make the work verifiable**

1. **Screen tour** — [#2](https://github.com/valpinkman/duelyst/issues/2), with the drift check as
   [#1](https://github.com/valpinkman/duelyst/issues/1)
   (`test/e2e/screen-tour.spec.mjs`). One account, one login, then for each of the
   23 layouts drive `NavigationManager.showContentViewByClass(…)` from `page.evaluate`, assert a
   DOM landmark and zero console errors, capture a named screenshot. Zero
   `CONFIG.ANIMATE_*_DURATION` from the page. **Assert on landmarks and console errors; treat
   screenshots as artifacts for human review, not assertions** — pixel diffs here will be flaky.
   Same commit: narrow the 404 allowlist and add the content-level package drift check (§5).
   Written against the current Marionette build and passing **before anything else moves**.
2. **ESM-interop spike** — [#3](https://github.com/valpinkman/duelyst/issues/3). Prove a CJS view
   file can `require()` an ESM Lit component and survive
   `pnpm build`. `commonjsOptions.strictRequires` is set; CJS→ESM interop is the kind of thing that
   works in dev and breaks in the production bundle. Half a day, and it is the only thing that could
   invalidate decision 5. **Done — it passed; findings and caveats in §3.1.1.**

**Phase 1 — the real dependency**

3. **Characterise `backfire`** — [#4](https://github.com/valpinkman/duelyst/issues/4). Analysis
   only, no code. Answer the questions
   [`BACKBONE_AUDIT.md §7`](BACKBONE_AUDIT.md) asks and leaves open: what does
   `Backbone.Firebase.Model/Collection` guarantee on local write, conflict, delete, offline and
   ordering? Record it in the audit. **This is a gate on step 4, not part of it.**
4. **Replace `backfire`** — [#9](https://github.com/valpinkman/duelyst/issues/9). ~200 lines
   (**an estimate made before step 3; re-scope against what it finds**):
   `onChildAdded`/`onChildChanged`/`onChildRemoved`/`onValue`
   from the modular SDK feeding a real `Backbone.Collection`, exported under the existing
   `DuelystFirebase.Model`/`.Collection` names. All 53 call sites share one shape —
   `new DuelystFirebase.Collection(null, { firebase: <url> })` — so **zero call sites change**, no
   views change, Marionette is untouched. It touches every screen's data while changing no markup,
   which makes it the ideal first customer for the tour: a pass proves the net works.

**Phase 2 — prove the pattern**

5. **`quest_log_layout` → Lit** — [#10](https://github.com/valpinkman/duelyst/issues/10). Layout +
   `quest_log_composite` (CompositeView) + `quest_item` + `quest_log_empty`. Establishes
   `apps/client/ui/components/`, the `BackboneController`, the shell, the `repeat()` idiom, and the
   `{{localize}}` → `t()` conversion. **Expect this to take several times longer than its 1,156
   tree-lines suggest, and judge the approach on the second screen.**
6. **CI ratchet** — [#11](https://github.com/valpinkman/duelyst/issues/11). `Marionette.` references
   and `.hbs` count may only go down; shell count reported. Needs the first shell to exist.

**Phase 3 — grind, in risk order.** [#12](https://github.com/valpinkman/duelyst/issues/12) decides
the order and opens the 23-screen checklist; [#13](https://github.com/valpinkman/duelyst/issues/13)
(jquery-ui removal) is a hard prerequisite for anything under `views2/collection/`. See §6;
`collection.ts` and `play.ts` last.

**Phase 4 — collect**

7. [#14](https://github.com/valpinkman/duelyst/issues/14) — delete Marionette, `transition.ts`, all
   shells, all `.hbs`, Handlebars, `bootstrap.js` (the Bootstrap **SCSS stays**).
8. [#15](https://github.com/valpinkman/duelyst/issues/15) — `apps/client/application.ts`:
   `new Backbone.Marionette.Application()` → a plain object with `Backbone.Events`. Repo-wide there
   are **5 references to Marionette.Application's API and only `App.start()` runs** — the
   5,149-line boot file is a one-line change, not a blocker.
9. [#16](https://github.com/valpinkman/duelyst/issues/16) — convert `Backbone.sync` fetches to
   `fetch`, then delete jQuery.
10. [#17](https://github.com/valpinkman/duelyst/issues/17) — Backbone 1.1.2 → 1.6.1.

**Unblocked filler** — none of these gate anything; use them when a screen migration stalls:

- [#5](https://github.com/valpinkman/duelyst/issues/5) — delete the **16 of 38 Handlebars helpers
  that no template uses** (verify first: `imageForResourceName` reads as unused but is genuinely
  used nested).
- [#6](https://github.com/valpinkman/duelyst/issues/6) — **velocity pass**. Only 4 files call
  `.velocity()`, and `views/animations.ts` already uses `el.animate()`. Four files stand between
  here and deleting a `VENDOR_FILES` entry and a `package.json` dependency. With `backfire`, it is
  one of the only complete goal-(a) wins available during coexistence.
- [#7](https://github.com/valpinkman/duelyst/issues/7) — **typed model attributes** (§3.2).
- [#8](https://github.com/valpinkman/duelyst/issues/8) — `$.ajax` → `fetch` (~18 files). Good
  hygiene, but it does **not** remove jQuery — `Backbone.sync` still routes through `Backbone.ajax`.
  Do not let it compete with screen work.

## 5. Hazards found while planning

These are the things that will not announce themselves.

**Asset packaging fails silently, and it will recur 23 times.** `generate_packages.js` recursively
scans `apps/client/ui` and assigns each file's art to a package via a `// pragma PKGS:` comment — but only
**76 of 204 files** carry one. Neither protection you would assume exists actually does:

- `packages-manifest.json` locks the **package key set** (~1,400 keys), not the resource list inside
  each package. Migrating a UI file does not add or remove a key, so a component that loses its
  pragma **builds green and ships a screen with missing art**.
- The existing e2e **allowlists exactly this failure**: `/Failed to load resource: the server
responded with a status of 404/`, commented "dev-only, and unrelated to whether the game works".
  A missing image is a 404.

Both fixes belong in the tour commit: lock package _contents_ (a per-package resource count or hash),
and never ignore a 404 under `resources/`. Expect the first run to surface pre-existing
inconsistencies unrelated to this work.

**`disconnectedCallback` fires on re-parenting.** `views2/collection/deck_card.ts` uses
`draggableAppendTo: '#app-deck-cards-region'` — dragging physically moves the element. A Lit
component that is draggable is disconnected and reconnected mid-drag, tearing down controller
subscriptions each time. This is why the collection and deck-builder screens are **not** first, and
why jquery-ui removal is scheduled as a prerequisite immediately before them.

**`views/regions/transition.ts` is the most dangerous file in `apps/client/ui`.** 241 lines monkey-patching
`Marionette.Region`, `RegionManager`, `CollectionView` and `LayoutView` prototypes to thread
`prepareForDestroy` and async `animateOut` through teardown. Animated region transitions _are_ the
navigation model. Nothing in this plan touches it until phase 4 deletes it.

**`const` shadowing from the decaffeination** — already in AGENTS.md, repeated because the Firebase
work in phase 1 lands in exactly the areas it has already bitten (`sync`, `inventory`, `rift`,
`quests`). Lint cannot see it.

## 6. Measurements

### Scope

| Area                                   | Files | Lines      |
| -------------------------------------- | ----: | ---------- |
| `apps/client/ui` (all `.ts`)           |   204 | **44,292** |
| ├ `views/`                             |     — | 19,290     |
| ├ `views2/`                            |     — | 11,352     |
| └ `managers/`                          |     — | 10,343     |
| `apps/client/ui/**/*.hbs`              |   153 | 4,289      |
| `apps/client/ui/styles/**/*.scss`      |    44 | 12,508     |
| **Tests referencing `apps/client/ui`** | **0** | —          |
| `test/e2e/` (the only net)             |     1 | 224        |

The e2e covers login → register → main menu → play → practice → game. It never reaches collection,
deck builder, crafting, shop, quests, profile, codex, rift, arena, watch, buddy list or pack opening.

### API surface actually used

| Backbone / Marionette                                                                | Uses                          |
| ------------------------------------------------------------------------------------ | ----------------------------- |
| `.get('x')` in `apps/client/ui` (256 of them `this.model.get(`)                      | **1,011**                     |
| `listenTo` / `trigger` / `listenToOnce` / `stopListening` / `on` / `off`             | 239 / 182 / 74 / 63 / 68 / 36 |
| Collection: `.remove` / `.models` / `.add` / `.reset` / `.at` / `comparator`         | 64 / 43 / 41 / 16 / 13 / 5    |
| `Marionette.ItemView` / `LayoutView` / `CompositeView` / `Region` / `CollectionView` | 71 / 26 / 23 / 11 / 2         |

### Templates — the easy half

Across all 153 templates: `{{#if}}` 180, `{{#unless}}` 31, **`{{#each}}` 14**, `{{#compare}}` 10,
**zero partials**. Helper usage is extremely concentrated:

```
localize                478      compare              10      timeAgo, formatCurrency,
imageForResourceScale    99      statOrDash            9      rarityHexColorForId, ...  ~2 each
                                 downcase, fromTo      5      16 helpers                  0
```

List rendering barely appears in templates because `CompositeView` does it imperatively in
JavaScript. `repeat()` collapsing `quest_log_composite.ts` + `quest_log_empty.ts` into the parent
template is the case that justifies the project — if Lit is not a clear win there, it is not one
anywhere.

### jQuery — shallow, with three teeth

`$el.*`: `find` 93, `addClass` 73, `removeClass` 59, `css` 26. `this.ui.*`: `text` 31, `addClass` 31,
`removeClass` 21, `find` 15, `html` 14. All natively replaceable and all die with their views.

The teeth: **Bootstrap 3 JS in 26 files** (`modal`/`popover`/`tooltip`), **jquery-ui in 7**
(`draggable`/`droppable`, all in collection / deck-builder / booster-packs), **velocity in 4**,
`$.ajax` in ~18. Cocos2d does **not** use jQuery, and only two files outside `apps/client/ui` touch `$`
(`apps/client/view/Scene.ts`, `apps/client/application.ts`).

### Screens, ranked by migration risk

**Re-measured after the first screen ([#12](https://github.com/valpinkman/duelyst/issues/12),
at `49f8fe0`).** The table measured at `de33c72f` ranked screens by `treeLn`, the lines of every
view a screen transitively requires. That counted shared leaves and other screens, and overstated
the quest log 1.8× (1,156 against the 629 lines #10 deleted). It has been replaced by **exclusive
lines** (`excl`): the screen's own `.ts` + `.hbs` that nothing else imports, with traversal stopping
at another screen's root. That is the code a screen PR deletes, and it reproduces #10 exactly
(629 lines, 12 files).

**Calibration from #10 (PR #54).** 629 excl → 499 new lines in 2 files (component 395, shell 104),
plus one-off infrastructure (`BackboneController`, the happy-dom vitest project, census
`kind: 'Shell'`). 1 h 38 from decision to merge; real-stack run 17 min, hand check 8 min. Diff
+1,173 / −660 over 29 files. The forecast model (decision D7 of #12):

- **new lines ≈ 0.8 × excl**
- **wall-clock ≈ 45 min fixed + 9 min per 100 excl**, a line through one point. Re-fit it after the
  tutorial, and have every screen PR record its actual excl, new lines and time.

| #   | Screen                                             | excl        | new    | time        | Converts first (shared leaf)               |
| --- | -------------------------------------------------- | ----------- | ------ | ----------- | ------------------------------------------ |
| ✓   | `views2/quests/quest_log_layout` (#10)             | 629         | 499    | 1 h 38 real | `BackboneController`                       |
| 1   | `views2/tutorial/tutorial_lessons_layout`          | 307         | ~245   | ~1 h 15     | — (re-fit the forecast here)               |
| 2   | `views2/watch/watch_layout`                        | 643         | ~510   | ~1 h 45     | —                                          |
| 3   | `views2/shop/premium_purchase_dialog`              | 835 deleted | 0      | ~30 min     | dropped, not migrated (#57)                |
| 4   | `views2/rift/rift_run_layout`                      | 453         | ~360   | ~1 h 25     | — (no DOM)                                 |
| 5   | `views/layouts/arena`                              | 615         | ~490   | ~1 h 40     | — (no DOM)                                 |
| 6   | `views2/codex/codex_layout`                        | 808 + 1,033 | ~1,450 | ~3 h        | `sliding_panel_select` + `sliding_panel`   |
| 7   | `views2/rift/rift_layout`                          | 473         | ~380   | ~1 h 30     | `rift_run_deck`                            |
| 8   | `views2/profile/profile_layout`                    | 1,795       | ~1,435 | ~3 h 25     | —                                          |
| 9   | `views/layouts/buddy_selection`                    | 324         | ~260   | ~1 h 15     | `message`                                  |
| 10  | `views/layouts/buddies`                            | 760         | ~610   | ~1 h 55     | `redeem_gift_code_modal`                   |
| 11  | `views/layouts/notifications`                      | 323         | ~260   | ~1 h 15     | —                                          |
| 12  | `views/layouts/game_player_popover` (+ subclasses) | 769         | ~615   | ~1 h 55     | `emote` + `emotes-list`                    |
| 13  | `views/layouts/game_player` (+ player1/2)          | 664         | ~530   | ~1 h 45     | —                                          |
| 14  | `views/layouts/game`                               | 1,824       | ~1,460 | ~3 h 30     | —                                          |
| 15  | `views2/shop/shop_spirit_orbs_modal`               | 113 + 478   | ~470   | ~1 h 40     | `shop_spirit_orbs_collection_view`         |
| 16  | `views2/shop/shop_layout`                          | 940         | ~750   | ~2 h 10     | —                                          |
| —   | _#13 jquery-ui removal, prerequisite for 17–21_    |             |        |             |                                            |
| 17  | `views2/collection/deck_card_back_select`          | 233         | ~185   | ~1 h 05     | `deck_preview`                             |
| 18  | `views2/collection/selected_card`                  | 162 + 780   | ~750   | ~2 h 10     | `card` + `collection_card`                 |
| 19  | `views2/collection/deck`                           | 715         | ~570   | ~2 h        | `deck_card`, `deck_cards`, `deck_metadata` |
| 20  | `views/layouts/booster_pack_collection`            | 738         | ~590   | ~1 h 55     | —                                          |
| 21  | `views2/collection/collection`                     | 2,028       | ~1,620 | ~4 h        | —                                          |
| 22  | `views/layouts/play`                               | 3,683       | ~2,950 | ~6 h        | deletes the old carousel base              |

Totals for the 22: about 19,300 excl → ~15,500 new, ~45 h of agent wall-clock. Roughly 8,000 more
lines sit outside the table and must go before #14: crafting (700), the main menu (899), 33 views
no screen reaches (5,315) and the shared leaves. The order and its reasons are in [§9](#9-still-open);
the live checklist is [#60](https://github.com/valpinkman/duelyst/issues/60).

### Why ESM is deferred

`app/` is 1,793 files using `require()` and 1,835 with `module.exports`; only 3 use `exports.x =`
and there is exactly **one** non-literal `require()` argument. The codemod is dumb. The cycles are
not:

| Component |   Files | What                                                               |
| --------- | ------: | ------------------------------------------------------------------ |
| 1         | **112** | `apps/client/ui` (75) + `apps/client/view` (37) — views ↔ managers |
| 2         |  **57** | `packages/sdk` modifiers ↔ `modifierFactory` ↔ card factories      |
| 3–5       |       7 | small modifier pairs                                               |

CommonJS survives these via the export-before-require guard AGENTS.md warns about — which is why
**18 of the 25 files using that guard are UI managers**. ESM tolerates cycles unless a binding is
used at module-evaluation time, so that was measured separately: of the 176 files in cycles, **37
would actually throw** `Cannot access 'X' before initialization` (17 `apps/client/ui`, 12 `apps/client/view`, 8
`packages/sdk`) — all the same shape, a subclass whose superclass sits in its own cycle, resolved via
`X.extend({…})` or `class X extends Y`.

**Deferring is strictly cheaper**, because custom elements dissolve the views↔managers cycle
structurally: a manager that shows `<duelyst-quest-log>` imports nothing. Every migrated screen
deletes cycle edges for free. Doing ESM first means hand-untangling knots the Lit work removes.

The real unknown is not the 37 files — it is that `packages/sdk` is shared with the server, which runs
from `build/` through esbuild plus `app-module-path`, and Node ESM has no `app-module-path`
equivalent.

### Why Backbone is not the target

| Remaining after the last screen                                   | Cost to remove                                                                      |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `Marionette.Application` in `application.ts`                      | ~1 line (only `App.start()` runs)                                                   |
| Marionette, `transition.ts`, shells, `.hbs`, Bootstrap, jquery-ui | delete together — that _is_ the last screen                                         |
| jQuery                                                            | blocked only by `Backbone.sync` → convert, then delete                              |
| **Backbone as `Model`/`Collection`/`Events`**                     | **1,011 `.get('x')` sites, ~1,300 total**                                           |
| underscore                                                        | ~750 uses — **240 in `packages/sdk`, 210 in `apps/client/view`**, both out of scope |

Backbone 1.6.1 is maintained; `backbone.js` is 59 KB of a 3.4 MB `vendor.js` in a 19 MB client.
Removing it would be the largest mechanical diff in the program for the smallest remaining win, and
it would not remove underscore either. Combined with typed attributes (§3.2), `model.get('gold')` is
already checked and refactorable.

If zero-Backbone is ever wanted, the right time is after everything else, with typed models in hand
— at which point it is a codemod a compiler can verify, not a rewrite.

### Library state, checked 2026-08-21

`lit` **3.3.3** · `preact` 10.29.8 / `@preact/signals` 2.11.1 · `solid-js` 1.9.15 · `backbone`
**1.6.1** (repo runs 1.1.2) · `@lit-labs/signals` **0.3.0**, wrapping a polyfill for a TC39 proposal
at **Stage 1**.

## 7. How to re-verify

```bash
# scope
find apps/client/ui -name '*.ts' -print0 | xargs -0 wc -l | tail -1
find app -name '*.hbs' -print0 | xargs -0 wc -l | tail -1
grep -rl "apps/client/ui" test | wc -l                       # the safety net: 0

# what Backbone actually provides
grep -rhoE "\.get\('[a-zA-Z_]+'\)" apps/client/ui --include='*.ts' | wc -l
grep -rhoE 'Marionette\.[A-Za-z]+' app --include='*.ts' | sort | uniq -c | sort -rn

# the hard chain
grep -oE 'Backbone\.[A-Za-z$]+' node_modules/.pnpm/backbone.marionette@2.2.2/node_modules/\
backbone.marionette/lib/backbone.marionette.js | sort | uniq -c | sort -rn

# templates
grep -rhoE '\{\{#(if|unless|each)\b' app --include='*.hbs' | sort | uniq -c | sort -rn
grep -rn "{{>" app --include='*.hbs' | wc -l          # partials: 0

# jQuery teeth
grep -rlE '\.(modal|popover|tooltip)\(' apps/client/ui --include='*.ts' | wc -l   # 26
grep -rlE '\.(draggable|droppable)\(' apps/client/ui --include='*.ts' | wc -l     #  7
grep -rlE '\.velocity\(' apps/client/ui --include='*.ts' | wc -l                  #  4

# managers are the shared interface
grep -rhoE "[A-Za-z]+Manager\.getInstance\(\)" apps/client/ui/views apps/client/ui/views2 --include='*.ts' \
  | sort | uniq -c | sort -rn | head

# ESM blockers — cycles and evaluation-time bindings
# (scripts/ has no committed tooling for this; the analysis used throwaway Tarjan SCC
#  over the require graph. Re-derive before trusting the 176 / 37 split.)

# packaging hazard
grep -rc 'pragma PKGS:' apps/client/ui --include='*.ts' | grep -v ':0' | wc -l    # 76 of 204
```

## 8. Constraints for whoever picks this up

Everything in [`BACKBONE_AUDIT.md §8`](BACKBONE_AUDIT.md) still applies, plus:

- **The tour is the gate, and it must exist before anything moves.** A net authored after a rewrite
  tests the rewrite's bugs.
- **`pnpm typecheck` is a CI gate and sits at zero** (since 2026-08-21). This programme adds a lot
  of new code to the one area of the tree that was never typed, so it is the constraint most likely
  to bite. Run `pnpm check:undefined-names` after any codemod as well — TS2304 keeps its own faster
  gate because it is the class that becomes a ReferenceError.
- **Never bypass the package drift check as routine.** It will fire on every screen migration once
  it locks contents. A gate that is routinely overridden is not a gate — read what changed each
  time.
- **The old stack is frozen.** No Marionette or Backbone version changes until phase 4.
- **One commit per step**, `pnpm build` and `pnpm test:unit` green at each. Push to `myrepo`, never
  to `origin`.

## 9. Still open

- **Screen order: decided** in [#12](https://github.com/valpinkman/duelyst/issues/12)
  ([analysis](https://github.com/valpinkman/duelyst/issues/12#issuecomment-6352830403),
  [decisions](https://github.com/valpinkman/duelyst/issues/12#issuecomment-6353028222)) and tracked
  in [#60](https://github.com/valpinkman/duelyst/issues/60). The order is the §6 table. Its reasons,
  in priority order:
  1. **Children before parents.** Seven screens are mounted in another screen's region:
     `play` ⊃ `arena`, `rift_layout` ⊃ `rift_run_layout`; `buddies` ⊃ `buddy_selection`; `game` ⊃
     `game_player1/2` ⊃ the player popovers; `collection` ⊃ `deck`, `selected_card`, `crafting`,
     `deck_card_back_select`. A converted child is still a Marionette view (its shell), so an
     unconverted parent's region can show it; a Lit parent hosting a Marionette child is a seam
     §3.3 does not have, and #14 would delete it again.
  2. **The second screen is small and clean** (the tutorial), because step 5 judges the approach
     there. The forecast is re-fitted after it.
  3. **Screens that share a leaf sit together**, so the leaf converts once (§6, last column).
  4. **Everything blocked on #13 goes after it**: `views2/collection/` and
     `booster_pack_collection`, whose `droppable` / `draggable` are two of the seven jquery-ui files.
  5. **Shop screens go where Valentin can verify money flows** by hand.
  6. **`play` and `collection` last.**

  Decided with it: `arena` and `rift_run_layout` have 0-byte templates, so each becomes a Lit
  element with an empty `render()` that owns the cocos logic in its lifecycle callbacks. The shared
  dialogs (`error_dialog`, `activity_dialog`, `confirm_dialog`, `form_prompt_*`) stay Marionette,
  built by the shells, until one dialog-kit PR after the social group. The `sliding_panel_select`
  carousel (991 lines, five subclasses in three screens) is ported once, with codex. The two
  screens the tour skips get seeded state on `duelyst-ci` in their own PR. The dead premium dialog
  and six unused views were deleted rather than migrated (#57).

- **What the `backfire` characterisation actually finds** —
  [#4](https://github.com/valpinkman/duelyst/issues/4). It may reveal guarantees that make
  [#9](https://github.com/valpinkman/duelyst/issues/9) much larger than ~200 lines — write coalescing
  and offline behaviour are the likely surprises. **Re-scope #9 against that finding rather than
  against this document's estimate**, which was made before anyone read the blob.

## 10. Tracking

Work is tracked as issues on `myrepo` under the **`marionette-removal`** label, split `afk` (an
agent can land it unattended) and `hitl` (needs a human — an architectural call, a judgement call,
or a playable stack).

- **Board:** [Duelyst project #3](https://github.com/users/valpinkman/projects/3) — grouped by
  `Phase`, ordered by `Iteration`, prioritised `P0`/`P1`/`P2`. **This is the single source of truth
  for status.**
- **Long-lived PR:** [#18](https://github.com/valpinkman/duelyst/pull/18) — the narrative summary.
- **This document** is the reasoning, and changes only when a decision changes.

Iteration dates on the board are **structural filler**. GitHub's API requires `startDate` and
`duration` on every iteration; there is no dateless form. The ordering and the titles carry the
meaning — ignore the dates.

## 11. Working rules

**These rules exist so this milestone can be worked unattended. They are not style preferences —
an agent that breaks them produces work that cannot be reviewed or reverted cleanly.**

### 11.1 Branching and PR shape

| Rule                                                                                                               | Why                                                                             |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| **Every PR targets `marionette-removal`**, never `main`                                                            | The two view stacks must be runnable in isolation until the milestone is done   |
| **One issue → one PR.** An issue too large for one PR becomes **several PRs**, each closing nothing until the last | Reviewable units                                                                |
| **A PR must never close more than one issue.** Exactly one `Closes #N`, or none                                    | A PR closing two issues cannot be reverted without reopening work that was fine |
| Branch name: **`mr/<issue>-<slug>`** (e.g. `mr/6-velocity-to-web-animations`)                                      | The issue is recoverable from the branch name alone                             |
| **Squash-merge** into `marionette-removal`                                                                         | The long-lived branch is rebased continuously; merge commits make that painful  |
| **Never push to `origin`** (`open-duelyst/duelyst`). `myrepo` only                                                 | `origin` is upstream and read-only                                              |
| **Never merge PR #18.** It closes when the definition of done is met, by a human                                   | It is an integration branch, not a change                                       |

`marionette-removal` is **rebased onto `main` continuously**. Consequences an agent must handle:

- Rebase your feature branch onto `marionette-removal` before opening the PR, and again before
  merging if it has moved. Do not merge `marionette-removal` into your branch.
- Force-pushing your own `mr/*` branch after a rebase is expected. Force-pushing
  `marionette-removal` is a human action — do not do it unattended.
- A conflict in `docs/BACKBONE_REMOVAL_PLAN.md` means two agents edited the plan. Stop and ask;
  do not resolve it by picking a side.

### 11.2 What every PR must contain

- **One commit per logical step**, per AGENTS.md. Multiple commits are fine; one commit doing two
  unrelated things is not.
- The PR body states **which acceptance criteria from the issue are met**, and explicitly lists any
  that are not, with the reason. Do not silently narrow scope.
- **Green:** `pnpm build`, `pnpm test:unit`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`.
  `pnpm typecheck` is a CI gate at zero — this milestone adds a lot of new code to the one area of
  the tree that was never typed, so this is the gate most likely to bite.
- `pnpm check:undefined-names` **after any codemod**.
- If `config/config.js` was touched: `pnpm check:turbo-env`.

### 11.3 When a test is required, and which

"Tested when required" needs a decision procedure, not judgement. Use this table:

| The change…                              | Required evidence                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Analysis only, no runtime change (#4)    | The deliverable is a doc diff. No test. Say "no runtime change" in the PR body.                              |
| Build/tooling only (#1, #11)             | A **negative test**: demonstrate the check fails when it should. A gate that has never failed is not a gate. |
| Touches a screen's markup or behaviour   | **Screen tour green**, plus a component test for any new Lit component                                       |
| New Lit component                        | Component test (vitest + happy-dom) covering render, the Backbone binding, and teardown                      |
| Changes data flow but no markup (#9)     | Screen tour green **with no screen changing** — that is the assertion                                        |
| Deletes a dependency (#6, #13, #14, #16) | Screen tour green + the dependency absent from `VENDOR_FILES` and `package.json`                             |
| Anything the tour cannot reach           | A **hand-test checklist in the PR body**, ticked. See below.                                                 |

**The tour cannot reach**: drag-and-drop gestures, real-money shop flows, animation correctness,
booster-pack opening, and anything requiring seeded inventory. For these the PR body carries an
explicit checklist of what was exercised by hand. An agent that cannot hand-test must say so and
leave the PR as a draft for a human — **not** claim the criterion is met.

**Until #2 lands there is no screen tour.** Any PR before then that touches `apps/client/ui` must say
explicitly how it was verified instead. This is why #1–#3 are the first iteration.

### 11.4 Definition of ready vs done

- **Ready** on the board means _no unmet blockers_, not _next up_. Anything `Ready` can be started.
- Do not start an issue whose blockers are open. The blockers are listed in the issue body and are
  load-bearing — #9 before #4 means reimplementing write semantics without knowing what they are.
- An issue is **done** when its PR is merged into `marionette-removal` and its acceptance criteria
  are all ticked or explicitly waived in the PR body.
- **`Closes #N` will not close the issue — close it by hand.** GitHub only honours closing keywords
  for PRs merged into the **default** branch, and every PR here targets `marionette-removal`. The
  keyword still earns its place: it links the PR to the issue and is what §11.1's one-issue-per-PR
  rule is checked against. But whoever merges must also close the issue and move its board Status
  to `Done`, or the tracking drifts silently while the work lands. (Measured on #1: PR #19 merged,
  issue stayed `OPEN`.)
- **A green build proves nothing in this milestone.** A wrong Backbone/Firebase version fails at
  runtime, not at build time. The screen tour is the gate.
