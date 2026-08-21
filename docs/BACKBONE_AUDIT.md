# Backbone in OpenDuelyst — audit and handoff

**Measured 2026-08-21 at `e4dd21a3`** (branch `modernization`). Every number below came from
grepping the tree, not from reading the 2016 docs; the commands are in
[§6](#6-how-to-re-verify) so you can re-derive them rather than trust them.

Read [`../AGENTS.md`](../AGENTS.md) first for repo conventions — this document assumes them.

## TL;DR

Backbone is the **metagame shell only**: login, deck builder, collection, shop, quests, profile,
chat, matchmaking. The game engine (`app/sdk`, 1,375 files) and the Cocos2d board (`app/view`,
223 files) contain essentially none of it.

It is used as **an event-emitting data layer plus a template-rendering view layer**. The two
features that made Backbone distinctive in 2012 — the Router and REST `sync` — are **not used at
all**; both were replaced by hand-rolled equivalents.

The library itself is therefore the cheap part. **The lock-in is `backfire`** — an unmaintained
2015 Backbone↔Firebase binding, shipped as a minified blob with no source in the repo, which is
what makes those models live-sync instead of fetch. "Replace Backbone" and "leave Firebase 2.x
semantics" are the same project, not two.

## 1. Where it lives — the boundary is clean

| Layer                      | Files | Touching Backbone |
| -------------------------- | ----: | ----------------: |
| `app/sdk` — game engine    | 1,375 |             **0** |
| `app/view` — Cocos2d board |   223 |             **1** |
| `app/ui` — menus, shell    |   204 |           **151** |

The single `app/view` file is `app/view/nodes/reward/LootCrateNode.ts`. That is the entire seam
between the Backbone world and the rendered game.

**Consequence for the folder reorg** (plan item 4): moving `app/sdk` and `app/common` out of
`app/` does not touch any of this. The two tracks are disjoint in the file tree.

## 2. What it is _not_ used for

This is the load-bearing half of the audit — it narrows any replacement enormously.

- **No Router.** Zero `Backbone.Router`, zero `Backbone.history`, zero matches for `Router`
  anywhere in `app/`. Navigation is a hand-rolled `app/ui/managers/navigation_manager.ts`. The
  client has no URL routing whatsoever.
- **No REST sync.** Zero `urlRoot`, zero `url:` definitions, one `sync` override in 204 files.
  Backbone's headline feature — models persisting themselves to a REST API via `$.ajax` — is
  unused. Data arrives over Firebase instead (§4).
- **Barely any `Backbone.View`** — 3 uses. Marionette's view classes replaced it wholesale.

## 3. What it actually provides

**An observable data layer** — 139 `Backbone.Model`, 67 `Backbone.Collection`. The value is the
`change` event: a manager mutates a model, every view listening re-renders. This is the app's
state-propagation mechanism and there is no second one — `app/common/eventbus.ts` is Backbone's
`Events` module extracted verbatim to avoid requiring Backbone and jQuery (see its header).

**Lifecycle glue** — the 20 UI managers all extend `Backbone.Marionette.Controller`
(`app/ui/managers/manager.ts:10`), which is a `Backbone.Events` object with connect/disconnect
hooks.

**The view layer** — 122 view classes, rendered through **153 Handlebars templates**
(precompiled against `handlebars/runtime` by `vite.config.client.mjs`):

| Class                       | Uses |
| --------------------------- | ---: |
| `Marionette.ItemView`       |   71 |
| `Marionette.LayoutView`     |   26 |
| `Marionette.CompositeView`  |   23 |
| `Marionette.Region`         |   11 |
| `Marionette.RegionManager`  |    5 |
| `Marionette.CollectionView` |    2 |

## 4. The real coupling: `backfire`

`Backbone.DuelystFirebase.Model` / `.Collection` — **53 usages across 30 files** — is defined in
`app/ui/extensions/duelyst_firebase.ts` on top of `app/vendor/backfire/backfire.min.js`:

- **v0.4.0, ~8 KB minified, unmaintained since 2015, no source in the repo.** It was a workspace
  package once; that package is gone because its 23 unused devDependencies accounted for 60 of
  the repo's security advisories. See `app/vendor/backfire/README.md`.
- It targets the **Firebase 2.x** API, but the client runs **firebase 12.18.0** through
  `firebase/compat/{app,auth,database}`. Two incompatibilities are patched in
  `duelyst_firebase.ts` rather than in the blob: `snap.key` became a property instead of a
  method (without the patch **every synced model gets `id === undefined`**), and `.ref` likewise.
  Both are commented in place — read that file before touching anything here.

The 30 coupled files are 13 managers, 11 views/layouts, 3 collections, 2 models, and
`app/application.ts`. Full list: `grep -rl DuelystFirebase app --include='*.ts'`.

## 5. Shipped weight

| File                      |   Size |
| ------------------------- | -----: |
| `jquery.js` (2.1.4)       | 241 KB |
| `backbone.marionette.js`  | 115 KB |
| `underscore.js`           |  67 KB |
| `backbone.js` (1.1.2)     |  59 KB |
| `backfire.min.js`         |   7 KB |
| **`dist/src/vendor.js`**  | 3.4 MB |
| **`dist/src/duelyst.js`** |  15 MB |

The whole Backbone stack is ~490 KB of a 19 MB client. **Bundle size is not a reason to touch
this.** Note that marionette 2.2.2 ships a prebuilt UMD with `backbone.babysitter` and
`backbone.wreqr` baked in — the npm packages of those names are never loaded (that is why the
`pnpm.overrides.backbone` change in `e4dd21a3` altered nothing shipped).

Versions: backbone 1.1.2 · marionette 2.2.2 · jquery 2.1.4 · underscore 1.13.8 · handlebars 4.7.9.

## 6. How to re-verify

```bash
# the boundary
for d in app/sdk app/view app/ui; do echo "$d: $(grep -rl Backbone $d --include='*.ts' | wc -l)"; done
# what is used
grep -rhoE "Backbone\.(Model|Collection|View|Router|history|Events)\b" app --include='*.ts' \
  | grep -v vendor | sort | uniq -c | sort -rn
grep -rhoE "Marionette\.[A-Za-z]+\b" app --include='*.ts' | grep -v vendor | sort | uniq -c | sort -rn
# the coupling
grep -rl DuelystFirebase app --include='*.ts'
```

## 7. What is delegable

**Recommended: a `backfire` / Firebase-modular migration audit — analysis only, no code.**
It is the genuine lock-in, it is well bounded (30 files, one extension module, one 8 KB blob),
and it is **disjoint from the folder reorg** happening on the main track, so the two cannot
collide. Deliverable: what `Backbone.Firebase.Model/Collection` actually guarantees (write
coalescing? ordering? offline?), which of the 53 call sites depend on those guarantees, and what
a modular-SDK replacement would have to reimplement — with a recommendation on whether to
replace the blob, fork it with source, or keep the compat layer.

**Not recommended: replacing Backbone/Marionette.** That is a UI rewrite of 151 files and 153
templates, it has been declined twice already (plan item 5), and §2 shows the framework is doing
less work than its reputation implies. Nothing is currently broken by it.

## 8. Constraints for whoever picks this up

- **Work on `modernization`, one commit per step**, each leaving `pnpm build` and
  `pnpm test:unit` green. No big-bang rewrites. Push to `myrepo`, never to `origin`.
- **The e2e is the real gate for anything in this area.** A wrong Backbone/Firebase version fails
  at _runtime_, not at build time — a green build proves nothing. Run `pnpm test:e2e` (it
  registers an account, plays a practice game, and asserts zero console errors) against the
  docker stack. A _playable_ build needs the whole `.env`, not just `FIREBASE_URL`:
  `set -a; . ./.env; set +a` first, or you get `auth/invalid-api-key` at runtime.
- **`pnpm check:undefined-names` after any codemod** — TS2304 is a CI gate and is currently zero.
- **Don't "fix" `app/vendor/backfire/backfire.min.js`.** Corrections go in
  `duelyst_firebase.ts`, which is the established pattern and is commented as such.
- **Beware `const` shadowing from the decaffeination** — a suite-scope variable re-declared inside
  a callback leaves every later read seeing the initial `null`. It has cost real debugging time in
  exactly these Firebase-backed areas (`sync`, `inventory`, `rift`, `quests`), and lint cannot see
  it.
- 3 data_access tests are quarantined as unstable (`known-unstable.txt`); `known-failures.txt` is
  empty and may shrink, never grow.
