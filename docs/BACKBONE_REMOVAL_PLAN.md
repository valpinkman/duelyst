# Removing Marionette and jQuery from OpenDuelyst — plan and decisions

**Measured 2026-08-21 at `de33c72f`** (branch `modernization`). Every number below was derived by
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
current Marionette build, because `app/ui` is 44,292 lines with **zero tests**.

## 1. The goal, narrowed

Two goals, both primary:

- **(a) Delete unmaintained dependencies.** `backfire`, Marionette 2.2.2, jQuery 2.1.4, Bootstrap 3.
- **(b) Make `app/ui` workable.** 44,292 lines of untyped ES5-in-`.ts` — `var _ = require(…)`,
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
the least-tested, highest-consequence file in `app/ui` (§5). The old stack should be boring while
work happens on top of it: when a screen breaks, that must mean the migration broke it.

## 3. Decisions

| #   | Decision                                                                                           |
| --- | -------------------------------------------------------------------------------------------------- |
| 1   | Goals (a) + (b), per §1                                                                            |
| 2   | Coexistence **with intent to finish**; shell count is a CI ratchet                                 |
| 3   | Safety net: one screen-tour Playwright spec **before** any migration; component tests as you go    |
| 4   | **`backfire` first**, gated on a behaviour-characterisation session                                |
| 5   | **Lit 3.3.3, light DOM**, `static properties`, no `@lit-labs/signals`; CJS at the boundary         |
| 6   | Backbone **frozen** as the state layer; typed model attributes as an independent early win         |
| 7   | Seam = a **shell `Marionette.ItemView`** wrapping the custom element; `transition.ts` untouched    |
| 8   | First screen: **`views2/quests/quest_log_layout.ts`**                                              |
| 9   | jQuery: velocity pass early; Bootstrap build-forward-only; jquery-ui deferred; `$el` left to decay |
| 10  | Content-level package drift check + narrowed 404 allowlist, in the tour commit                     |
| 11  | New code in `app/ui/components/`, kebab-case files matching tags, inline templates                 |
| 12  | Done = 0 Marionette / jQuery / `backfire` / Handlebars; Backbone kept and upgraded                 |
| 13  | ESM migration **deferred**, revisited after coexistence ends                                       |

### 3.1 Why Lit, and why light DOM

Three properties of _this_ repo decide it, none of which is "web components are the standard":

- **The custom element registry is the coexistence mechanism, and it is free.** `app/ui` is 100%
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

- **`app/ui/components/`, not `views3/`.** `views/` and `views2/` already exist; a third numbered
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

## 4. The step sequence

One commit per step, each leaving `pnpm build` and `pnpm test:unit` green, per AGENTS.md.

**Phase 0 — make the work verifiable**

1. **Screen tour** (`test/e2e/screen-tour.spec.mjs`). One account, one login, then for each of the
   23 layouts drive `NavigationManager.showContentViewByClass(…)` from `page.evaluate`, assert a
   DOM landmark and zero console errors, capture a named screenshot. Zero
   `CONFIG.ANIMATE_*_DURATION` from the page. **Assert on landmarks and console errors; treat
   screenshots as artifacts for human review, not assertions** — pixel diffs here will be flaky.
   Same commit: narrow the 404 allowlist and add the content-level package drift check (§5).
   Written against the current Marionette build and passing **before anything else moves**.
2. **ESM-interop spike.** Prove a CJS view file can `require()` an ESM Lit component and survive
   `pnpm build`. `commonjsOptions.strictRequires` is set; CJS→ESM interop is the kind of thing that
   works in dev and breaks in the production bundle. Half a day, and it is the only thing that could
   invalidate decision 5.

**Phase 1 — the real dependency**

3. **Characterise `backfire`.** Analysis only, no code. Answer the questions
   [`BACKBONE_AUDIT.md §7`](BACKBONE_AUDIT.md) asks and leaves open: what does
   `Backbone.Firebase.Model/Collection` guarantee on local write, conflict, delete, offline and
   ordering? Record it in the audit. **This is a gate on step 4, not part of it.**
4. **Replace `backfire`.** ~200 lines: `onChildAdded`/`onChildChanged`/`onChildRemoved`/`onValue`
   from the modular SDK feeding a real `Backbone.Collection`, exported under the existing
   `DuelystFirebase.Model`/`.Collection` names. All 53 call sites share one shape —
   `new DuelystFirebase.Collection(null, { firebase: <url> })` — so **zero call sites change**, no
   views change, Marionette is untouched. It touches every screen's data while changing no markup,
   which makes it the ideal first customer for the tour: a pass proves the net works.

**Phase 2 — prove the pattern**

5. **`quest_log_layout` → Lit.** Layout + `quest_log_composite` (CompositeView) + `quest_item` +
   `quest_log_empty`. Establishes `app/ui/components/`, the `BackboneController`, the shell, the
   `repeat()` idiom, and the `{{localize}}` → `t()` conversion. **Expect this to take several times
   longer than its 1,156 tree-lines suggest, and judge the approach on the second screen.**

**Phase 3 — grind, in risk order** (see the table in §6; `collection.ts` and `play.ts` last)

**Phase 4 — collect**

6. Delete Marionette, `transition.ts`, all shells, all `.hbs`, Handlebars, `bootstrap.js`,
   `jquery-ui`.
7. `app/application.ts`: `new Backbone.Marionette.Application()` → a plain object with
   `Backbone.Events`. Repo-wide there are **5 references to Marionette.Application's API and only
   `App.start()` runs** — the 5,149-line boot file is a one-line change, not a blocker.
8. Convert `Backbone.sync` fetches to `fetch`, then delete jQuery.
9. Backbone 1.1.2 → 1.6.1.

**Unblocked filler** — none of these gate anything; use them when a screen migration stalls:

- Delete the **16 of 38 Handlebars helpers that no template uses** (verify first: `imageForResourceName`
  reads as unused but is genuinely used nested).
- **Velocity pass** — only 4 files call `.velocity()`, and `views/animations.ts` already uses
  `el.animate()`. Four files stand between here and deleting a `VENDOR_FILES` entry and a
  `package.json` dependency. It is the only complete goal-(a) win available during coexistence.
- **Typed model attributes** (§3.2).
- `$.ajax` → `fetch` (~18 files). Good hygiene, but it does **not** remove jQuery —
  `Backbone.sync` still routes through `Backbone.ajax`. Do not let it compete with screen work.

## 5. Hazards found while planning

These are the things that will not announce themselves.

**Asset packaging fails silently, and it will recur 23 times.** `generate_packages.js` recursively
scans `app/ui` and assigns each file's art to a package via a `// pragma PKGS:` comment — but only
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

**`views/regions/transition.ts` is the most dangerous file in `app/ui`.** 241 lines monkey-patching
`Marionette.Region`, `RegionManager`, `CollectionView` and `LayoutView` prototypes to thread
`prepareForDestroy` and async `animateOut` through teardown. Animated region transitions _are_ the
navigation model. Nothing in this plan touches it until phase 4 deletes it.

**`const` shadowing from the decaffeination** — already in AGENTS.md, repeated because the Firebase
work in phase 1 lands in exactly the areas it has already bitten (`sync`, `inventory`, `rift`,
`quests`). Lint cannot see it.

## 6. Measurements

### Scope

| Area                           | Files | Lines      |
| ------------------------------ | ----: | ---------- |
| `app/ui` (all `.ts`)           |   204 | **44,292** |
| ├ `views/`                     |     — | 19,290     |
| ├ `views2/`                    |     — | 11,352     |
| └ `managers/`                  |     — | 10,343     |
| `app/ui/**/*.hbs`              |   153 | 4,289      |
| `app/ui/styles/**/*.scss`      |    44 | 12,508     |
| **Tests referencing `app/ui`** | **0** | —          |
| `test/e2e/` (the only net)     |     1 | 224        |

The e2e covers login → register → main menu → play → practice → game. It never reaches collection,
deck builder, crafting, shop, quests, profile, codex, rift, arena, watch, buddy list or pack opening.

### API surface actually used

| Backbone / Marionette                                                                | Uses                          |
| ------------------------------------------------------------------------------------ | ----------------------------- |
| `.get('x')` in `app/ui` (256 of them `this.model.get(`)                              | **1,011**                     |
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
`$.ajax` in ~18. Cocos2d does **not** use jQuery, and only two files outside `app/ui` touch `$`
(`app/view/Scene.ts`, `app/application.ts`).

### Screens, ranked by migration risk

`own` = the layout's own lines; `tree` = view files transitively required; `treeLn` = their total
lines.

```
screen                                   own   views  treeLn  drag   jq  helpers  velocity  managers
views2/tutorial/tutorial_lessons_layout  283      3     951     0    28      0        0         3
views2/quests/quest_log_layout           218      7    1156     0    29      0        0         4   <- first
views2/rift/rift_run_layout              457      4    1189     0    20      0        0         4
views2/watch/watch_layout                262      9    1241     0    36      0        0         3
views/layouts/arena                      614      4    1346     0    20      0        0         5
views2/collection/deck                   322      7    1928    52    64      2        0         5
views2/codex/codex_layout                427      8    2476     0    76      0       35         5
views2/profile/profile_layout            557     17    2514     0    74      1        0         6
views/layouts/game                      1081     17    4066     0   131      1        0         7
views/layouts/notifications              113     35    4339     0   148      2        0         8
views2/collection/collection            1004     20    5366    74   160      3        0         7   <- last
views/layouts/play                       185     30    6898     0   153      4       35         9   <- last
```

`quest_log_layout` is the only candidate clean on every hazard: 0 draggable/droppable (dodges the
re-parent trap), 0 `templateHelpers` (dodges porting the helper mechanism on the first attempt),
0 velocity, and 4 managers — enough to exercise the Backbone bridge for real. Ruled out early:
anything in `shop/` (it takes money, and the tour cannot safely assert against it).

### Why ESM is deferred

`app/` is 1,793 files using `require()` and 1,835 with `module.exports`; only 3 use `exports.x =`
and there is exactly **one** non-literal `require()` argument. The codemod is dumb. The cycles are
not:

| Component |   Files | What                                                     |
| --------- | ------: | -------------------------------------------------------- |
| 1         | **112** | `app/ui` (75) + `app/view` (37) — views ↔ managers       |
| 2         |  **57** | `app/sdk` modifiers ↔ `modifierFactory` ↔ card factories |
| 3–5       |       7 | small modifier pairs                                     |

CommonJS survives these via the export-before-require guard AGENTS.md warns about — which is why
**18 of the 25 files using that guard are UI managers**. ESM tolerates cycles unless a binding is
used at module-evaluation time, so that was measured separately: of the 176 files in cycles, **37
would actually throw** `Cannot access 'X' before initialization` (17 `app/ui`, 12 `app/view`, 8
`app/sdk`) — all the same shape, a subclass whose superclass sits in its own cycle, resolved via
`X.extend({…})` or `class X extends Y`.

**Deferring is strictly cheaper**, because custom elements dissolve the views↔managers cycle
structurally: a manager that shows `<duelyst-quest-log>` imports nothing. Every migrated screen
deletes cycle edges for free. Doing ESM first means hand-untangling knots the Lit work removes.

The real unknown is not the 37 files — it is that `app/sdk` is shared with the server, which runs
from `build/` through esbuild plus `app-module-path`, and Node ESM has no `app-module-path`
equivalent.

### Why Backbone is not the target

| Remaining after the last screen                                   | Cost to remove                                                         |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `Marionette.Application` in `application.ts`                      | ~1 line (only `App.start()` runs)                                      |
| Marionette, `transition.ts`, shells, `.hbs`, Bootstrap, jquery-ui | delete together — that _is_ the last screen                            |
| jQuery                                                            | blocked only by `Backbone.sync` → convert, then delete                 |
| **Backbone as `Model`/`Collection`/`Events`**                     | **1,011 `.get('x')` sites, ~1,300 total**                              |
| underscore                                                        | ~750 uses — **240 in `app/sdk`, 210 in `app/view`**, both out of scope |

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
find app/ui -name '*.ts' -print0 | xargs -0 wc -l | tail -1
find app -name '*.hbs' -print0 | xargs -0 wc -l | tail -1
grep -rl "app/ui" test | wc -l                       # the safety net: 0

# what Backbone actually provides
grep -rhoE "\.get\('[a-zA-Z_]+'\)" app/ui --include='*.ts' | wc -l
grep -rhoE 'Marionette\.[A-Za-z]+' app --include='*.ts' | sort | uniq -c | sort -rn

# the hard chain
grep -oE 'Backbone\.[A-Za-z$]+' node_modules/.pnpm/backbone.marionette@2.2.2/node_modules/\
backbone.marionette/lib/backbone.marionette.js | sort | uniq -c | sort -rn

# templates
grep -rhoE '\{\{#(if|unless|each)\b' app --include='*.hbs' | sort | uniq -c | sort -rn
grep -rn "{{>" app --include='*.hbs' | wc -l          # partials: 0

# jQuery teeth
grep -rlE '\.(modal|popover|tooltip)\(' app/ui --include='*.ts' | wc -l   # 26
grep -rlE '\.(draggable|droppable)\(' app/ui --include='*.ts' | wc -l     #  7
grep -rlE '\.velocity\(' app/ui --include='*.ts' | wc -l                  #  4

# managers are the shared interface
grep -rhoE "[A-Za-z]+Manager\.getInstance\(\)" app/ui/views app/ui/views2 --include='*.ts' \
  | sort | uniq -c | sort -rn | head

# ESM blockers — cycles and evaluation-time bindings
# (scripts/ has no committed tooling for this; the analysis used throwaway Tarjan SCC
#  over the require graph. Re-derive before trusting the 176 / 37 split.)

# packaging hazard
grep -rc 'pragma PKGS:' app/ui --include='*.ts' | grep -v ':0' | wc -l    # 76 of 204
```

## 8. Constraints for whoever picks this up

Everything in [`BACKBONE_AUDIT.md §8`](BACKBONE_AUDIT.md) still applies, plus:

- **The tour is the gate, and it must exist before anything moves.** A net authored after a rewrite
  tests the rewrite's bugs.
- **`pnpm check:undefined-names` after any codemod** — TS2304 is a CI gate and is currently zero.
- **Never bypass the package drift check as routine.** It will fire on every screen migration once
  it locks contents. A gate that is routinely overridden is not a gate — read what changed each
  time.
- **The old stack is frozen.** No Marionette or Backbone version changes until phase 4.
- **One commit per step**, `pnpm build` and `pnpm test:unit` green at each. Push to `myrepo`, never
  to `origin`.

## 9. Still open

- **The order of the remaining 22 screens** after `quest_log`. The §6 table gives the risk ranking;
  `collection.ts` and `play.ts` are clearly last, and jquery-ui removal is their prerequisite.
- **What the `backfire` characterisation actually finds.** Step 3 may reveal guarantees that make
  step 4 larger than ~200 lines — write coalescing and offline behaviour are the likely surprises.
  Re-scope step 4 against that finding rather than against this estimate.
