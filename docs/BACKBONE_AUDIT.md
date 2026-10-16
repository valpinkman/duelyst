# Backbone in OpenDuelyst — audit and handoff

**Measured 2026-08-21 at `e4dd21a3`** (branch `modernization`). Every number below came from
grepping the tree, not from reading the 2016 docs; the commands are in
[§6](#6-how-to-re-verify) so you can re-derive them rather than trust them.

**Paths re-grounded 2026-10-15** onto the monorepo layout (`app/` became `apps/client/`,
`packages/sdk` and `packages/common`; see PR #26). The counts in §1–§5 are still the 2026-08-21
measurement; §7 was measured separately and is current.

Read [`../AGENTS.md`](../AGENTS.md) first for repo conventions — this document assumes them.

## TL;DR

Backbone is the **metagame shell only**: login, deck builder, collection, shop, quests, profile,
chat, matchmaking. The game engine (`packages/sdk`, 1,375 files) and the Cocos2d board (`apps/client/view`,
223 files) contain essentially none of it.

It is used as **an event-emitting data layer plus a template-rendering view layer**. The two
features that made Backbone distinctive in 2012 — the Router and REST `sync` — are **not used at
all**; both were replaced by hand-rolled equivalents.

The library itself is therefore the cheap part. **The lock-in is `backfire`** — an unmaintained
2015 Backbone↔Firebase binding, shipped as a minified blob with no source in the repo, which is
what makes those models live-sync instead of fetch. "Replace Backbone" and "leave Firebase 2.x
semantics" are the same project, not two.

## 1. Where it lives — the boundary is clean

| Layer                              | Files | Touching Backbone |
| ---------------------------------- | ----: | ----------------: |
| `packages/sdk` — game engine       | 1,375 |             **0** |
| `apps/client/view` — Cocos2d board |   223 |             **1** |
| `apps/client/ui` — menus, shell    |   204 |           **151** |

The single `apps/client/view` file is `apps/client/view/nodes/reward/LootCrateNode.ts`. That is the entire seam
between the Backbone world and the rendered game.

**Consequence for the folder reorg** (plan item 4, since done in PR #26): moving the SDK and
common code out of `app/` into `packages/` touched none of this. The two tracks were disjoint in
the file tree.

## 2. What it is _not_ used for

This is the load-bearing half of the audit — it narrows any replacement enormously.

- **No Router.** Zero `Backbone.Router`, zero `Backbone.history`, zero matches for `Router`
  anywhere in `apps/client/`. Navigation is a hand-rolled `apps/client/ui/managers/navigation_manager.ts`. The
  client has no URL routing whatsoever.
- **No REST sync.** Zero `urlRoot`, zero `url:` definitions, one `sync` override in 204 files.
  Backbone's headline feature — models persisting themselves to a REST API via `$.ajax` — is
  unused. Data arrives over Firebase instead (§4).
- **Barely any `Backbone.View`** — 3 uses. Marionette's view classes replaced it wholesale.

## 3. What it actually provides

**An observable data layer** — 139 `Backbone.Model`, 67 `Backbone.Collection`. The value is the
`change` event: a manager mutates a model, every view listening re-renders. This is the app's
state-propagation mechanism and there is no second one — `packages/common/eventbus.ts` is Backbone's
`Events` module extracted verbatim to avoid requiring Backbone and jQuery (see its header).

**Lifecycle glue** — the 20 UI managers all extend `Backbone.Marionette.Controller`
(`apps/client/ui/managers/manager.ts:10`), which is a `Backbone.Events` object with connect/disconnect
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

`Backbone.DuelystFirebase.Model` / `.Collection` — **53 grep hits across 30 files**, which is 48
live sync roots in 18 files once definitions, dead lines and unused requires are taken out
([§7.2](#72-every-call-site)) — is defined in
`apps/client/ui/extensions/duelyst_firebase.ts` on top of `apps/client/vendor/backfire/backfire.min.js`:

- **v0.4.0, ~8 KB minified, unmaintained since 2015, no source in the repo.** It was a workspace
  package once; that package is gone because its 23 unused devDependencies accounted for 60 of
  the repo's security advisories. See `apps/client/vendor/backfire/README.md`.
- It targets the **Firebase 2.x** API, but the client runs **firebase 12.18.0** through
  `firebase/compat/{app,auth,database}`. Two incompatibilities are patched in
  `duelyst_firebase.ts` rather than in the blob: `snap.key` became a property instead of a
  method (without the patch a synced **collection** silently stays empty, see
  [§7.0](#70-corrections-to-earlier-statements-in-this-document)), and `.ref` likewise.
  Both are commented in place — read that file before touching anything here.

The 30 coupled files are 13 managers, 11 views/layouts, 3 collections, 2 models, and
`apps/client/application.ts`. Full list: `grep -rl DuelystFirebase apps/client --include='*.ts'`.

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
for d in packages/sdk apps/client/view apps/client/ui; do echo "$d: $(grep -rl Backbone $d --include='*.ts' | wc -l)"; done
# what is used
grep -rhoE "Backbone\.(Model|Collection|View|Router|history|Events)\b" apps/client --include='*.ts' \
  | grep -v vendor | sort | uniq -c | sort -rn
grep -rhoE "Marionette\.[A-Za-z]+\b" apps/client --include='*.ts' | grep -v vendor | sort | uniq -c | sort -rn
# the coupling
grep -rl DuelystFirebase apps/client --include='*.ts'
```

## 7. What `backfire` actually guarantees

Measured at `f0ff2ce` on `marionette-removal` (analysed as `f0ff2ce`, the same tree before a
rebase) by reading the minified source and by executing it against `firebase@12.18.0` offline, not
from the 2015 README. Claims are marked **[probed]** (executed), **[read]** (source only) or
**[inferred]** (neither). Full analyses: issue #4.

**Re-checked at `92180bd` (2026-10-15):** blob unchanged (same md5). The only change to the
Firebase surface since is #22's type annotations, which add a type parameter to
`DuelystFirebase.Model`/`.Collection` and one doc-comment mention in
`apps/client/types/backbone_models.d.ts` (raw grep now 54). No call site was added or removed.
Line numbers below have been re-pointed at `92180bd`, and those in `duelyst_firebase.ts` at
the header-comment fix that lands with this section.

### 7.0 Corrections to earlier statements in this document

| Claimed                                                                                                      | Actually                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §4: "without the `_getKey` patch, every synced model comes back with `id === undefined`"                     | `Backbone.Firebase.Model` never calls `_getKey`; its id is a plain attribute, and a Model works fine with the patch reverted. **[probed]** `_getKey` is used only by `Collection._parseModels` / `_childAdded` / `_childChanged` / `_childRemoved` and the dead sync adapter. Reverted, it calls `snap.name()`, which does not exist, and **throws inside the SDK's event handler**: the caller sees no error and the collection is left **empty**. **[probed]** The patch is required; the symptom is not what was described. The same wrong sentence was in the header comment of `duelyst_firebase.ts`; corrected alongside this section. |
| §4: "53 usages across 30 files"                                                                              | 53 is the raw grep count and includes the **two definition lines** in `duelyst_firebase.ts:91,158`. Net: **51 call-site references**, 3 of them dead, **48 live roots** = 44 `new` + 4 `.extend()`. 30 client files mention the module; **18 construct a synced root**; 11 require it and never use it.                                                                                                                                                                                                                                                                                                                                      |
| The comment at `duelyst_firebase.ts` saying backfire's `.ref()` calls are to its own `Backbone.Firebase#ref` | Was wrong and **has been fixed in-source** by `60ab64c1`. All `.ref()` calls are on SDK refs. **12 textual `.ref()` occurrences across 9 methods.** **[probed]**                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| An earlier note on #4: `Profile` has "25 settings defaults"                                                  | **24.** Counted at `apps/client/ui/models/profile.ts:71` — `id`, `username`, `gameSpeed`, three quality keys, `bloom`, ten UI toggles, `filterCollectionCardSet` and four volume keys.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

### 7.1 What backfire is

|                         |                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File                    | `apps/client/vendor/backfire/backfire.min.js` — one file, **7,970 bytes, 10 lines**, minified, no source in the repo, `md5 d48fb42ba86d7f58833c34a5a66c19fe`                                                                                                                                                                                                                                                                                                   |
| Version                 | `BackFire 0.4.0`, banner points at `github.com/firebase/backfire` (dead; the successor `backbonefire` is also dead)                                                                                                                                                                                                                                                                                                                                            |
| Loaded                  | concatenated into `dist/src/vendor.js` at `tools/build/build-client.mjs:158`, **immediately after `backbone.js` and before `backbone.marionette.js`**. Verified by performing the concat and measuring byte offsets, not by reading the list. **[probed]**                                                                                                                                                                                                     |
| Modified from upstream? | **Could not determine.** `raw.githubusercontent.com` 404s on both `firebase/backfire` and `firebase/backbonefire` (repos deleted). npm `backfire@0.1.0` is an **unrelated library** (`ArrayList`/`Bindable`/`ClassRegistry`, no Firebase code). npm `backbonefire` has one version, `0.0.0`, which ships **no `dist/`** — only a manifest, which does corroborate provenance (`"dependencies": {"firebase": "2.0.x"}`). There is nothing left to diff against. |
| Consumed via            | globals only — `apps/client/ui/extensions/duelyst_firebase.ts` reads `Backbone.Firebase.*` off the window. Nothing imports it by name.                                                                                                                                                                                                                                                                                                                         |

It captures `window._` and `window.Backbone` at load time (`var a = window._, b = window.Backbone`),
so its position in `VENDOR_FILES` is load-bearing.

**Public surface — three exports, two used:**

| Export                                                                                 | Used?                                          |
| -------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `Backbone.Firebase.Model`                                                              | yes, via `Backbone.DuelystFirebase.Model`      |
| `Backbone.Firebase.Collection`                                                         | yes, via `Backbone.DuelystFirebase.Collection` |
| `Backbone.Firebase` (a `Backbone.sync` adapter) + a global `Backbone.sync` monkeypatch | **no** — dead weight, and see the hazard below |

The monkeypatch is a global side effect of loading the blob:

```js
((b.oldSync = b.sync),
  (b.sync = function (a, c, d, e) {
    var f = b.oldSync;
    return (
      (c.firebase || (c.collection && c.collection.firebase)) && (f = b.Firebase.sync),
      f.apply(this, [a, c, d, e])
    );
  }));
```

**Hazard:** this hijacks **any** Backbone model or collection carrying a `firebase` property — it does
not check that the object is a `Backbone.Firebase.*`. A plain
`Backbone.Model.extend({ firebase: 'x', url: '/api/…' })` calling `.fetch()` is routed into
`Backbone.Firebase.sync` and dies with `TypeError: Cannot read properties of undefined (reading 'apply')`.
**[probed]** No such model exists today, so this is a **latent trap** — one a replacement removes for
free. The adapter also branches on `Backbone.VERSION === '0.9.10'`; the repo runs Backbone **1.1.2**,
so that branch is dead. **[probed]**

### 7.2 Every call site

**51** call-site references to `DuelystFirebase.(Model|Collection)` across **30** client files
(53 raw grep hits, less the two definitions in `duelyst_firebase.ts:91,158`). Three are dead — two
commented out (`progression_manager.ts:125`, `quests_manager.ts:78`) and one a JSDoc `@return`
(`inventory_manager.ts:1280`) — leaving **48 live roots**: 44 `new DuelystFirebase.X(…)` + 4
`.extend()` subclasses.

The four subclasses and where they are instantiated:

| Subclass                | File                                       | Instantiated at             | Cardinality            |
| ----------------------- | ------------------------------------------ | --------------------------- | ---------------------- |
| `Profile` (Model)       | `apps/client/ui/models/profile.ts:27`      | `profile_manager.ts:31`     | 1 per session          |
| `PresenceModel` (Model) | `apps/client/ui/models/presence.ts:8`      | `collections/buddies.ts:23` | **1 per buddy**        |
| `Messages` (Collection) | `apps/client/ui/collections/messages.ts:7` | `models/conversation.ts:14` | **1 per conversation** |
| `BuddiesCollection`     | `apps/client/ui/collections/buddies.ts:9`  | `chat_manager.ts:104`       | 1 per session          |

Split: **21 Model roots, 27 Collection roots.**

**Eleven files require the module and never use it** — `views/composite/rank.ts`,
`views/composite/challenge_select.ts`, `managers/new_player_manager.ts`,
`views2/quests/quest_log_layout.ts`, `views2/quests/quest_log_composite.ts`,
`views2/rift/rift_run_layout.ts`, `views2/watch/watch_layout.ts`, `views2/profile/profile_layout.ts`,
`views2/tutorial/tutorial_lessons_layout.ts`, `collections/user_decks.ts`, and
`apps/client/application.ts:60` (the boot-order require, which is load-bearing). **The real coupled
surface is 18 files, not 30.**

**Classified by the guarantee actually relied on:**

| Class                                                                                                                  | Roots             | Where                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Read-only live sync.** Subscribe, render on `change`/`sync`, never write. Depends only on §7.3's read guarantees. | **39**            | all of `inventory_manager` (11), `progression_manager` (5), `views/layouts/game.ts` (4), `crate_manager` (2), `achievements_manager` (2 of 3), `news_manager` (2 of 3), `games_manager` (4 of 6), `quests_manager` (3), `shop_manager` (1 of 2), `server_status_manager`, `stream_manager`, `notifications_manager`, `twitch_manager` (read half), `views/layouts/arena.ts`, `collections/buddies` |
| **B. Model writes via `set()`.** Optimistic set + shallow delta `update()` + echo re-entrancy suppression.             | **5**             | `games_manager.ts:323` (`rankingModel.is_unread`), `games_manager.ts:675,910` (`lastSentInviteModel.status`), `twitch_manager.ts:225`, `achievements_manager.ts:149`, `Profile` (10 direct `profile.set()` — 8 in `views2/collection/collection.ts`, `views/item/buddy_list.ts:135`, `profile_manager.ts:68` — plus 4 more through `ProfileManager.set()`)                                         |
| **C. Collection writes.**                                                                                              | **3**             | `models/conversation.ts:22,43` (`messages.create`), `news_manager.ts:98` (`readNewsItemsCollection.add`), `games_manager.ts:704` (`receivedInvitesCollection.remove`)                                                                                                                                                                                                                              |
| **D. Deletes.**                                                                                                        | **1**             | `games_manager.ts:912` (`lastSentInviteModel.destroy({})`) — plus C's `remove()`, which is also a delete                                                                                                                                                                                                                                                                                           |
| **E. Depends on the `_`-namespace override.**                                                                          | **3 Models**      | `PresenceModel` (`_active`, `_unread`, `_lastUnreadMessageAt` — `views/layouts/buddies.ts:78`, `views/item/buddy_list.ts:284,294,317,331`, `models/conversation.ts:73`), `Profile` (`_resolutionsThatFit`/`_resolutionsThatDontFit`, `views/item/settings_menu.ts:142,144`), `shop_manager.productPurchaseCountsModel` (`set('_'+sku)`, `shop_manager.ts:258`)                                     |
| **F. Depends on `onSyncOrReady()` never rejecting.**                                                                   | **39 call sites** | every manager, mostly via `Manager::_markAsReadyWhenModelsAndCollectionsSynced`                                                                                                                                                                                                                                                                                                                    |

**The shape of that table is the finding.** 39 of 48 roots are pure read-only live sync. Of the 9 that
write, one (`shop_manager`) writes only into the local `_`-namespace and never reaches Firebase at
all. **The Collection write path — the most complex and most broken part of backfire — has exactly
three consumers, all trivial.**

### 7.3 The guarantees

#### Read path — Model

`this.firebase.on('value', _modelChanged)`. No `child_*` listeners. **[read]**

- **`sync` fires on every remote update, not once.** Two remote updates produced two `sync` events.
  **[probed]** `Profile` binds `this.on('sync', this.onSync)` (`models/profile.ts:31`) and so re-runs
  its volume-normalisation on every change to `/users/…`. `isSynced`/`ready` are `listenToOnce`, so
  they are unaffected.
- **When the initial value is already in the SDK's cache, `value` is delivered synchronously inside
  `on()`** — i.e. _before_ backfire's constructor finishes; `isSynced` is already `true` when the
  constructor returns. **[probed]** This works only because `duelyst_firebase.ts` registers its
  `listenToOnce(this,'sync')` **before** calling the parent constructor. That ordering is
  load-bearing and undocumented; a replacement that registers after will hang on every cached path.
- **Ordering of the initial `value` against later updates** is the SDK's, not backfire's: FIFO per
  connection.
- **`sync` never fires if the first `value` never arrives.** On a cold path with no connection,
  `isSynced` stays `false` indefinitely. **[probed]**
- **A remotely deleted node does not clear the model.** `_modelChanged` receives `val() === null`;
  the diff-unset branch is skipped and `this.set(null)` is a **Backbone no-op**. The model keeps
  every attribute it had, and still fires `sync`. **[probed]** Nothing currently reads a node that
  gets deleted under it — but this is the exact class of thing a rewrite "fixes" and thereby breaks.
- **A scalar node value yields `{}`** — `set('hello')` is Backbone's `set(key)` form. **[probed]**
  All current Model roots are object nodes.
- **A remotely removed key is unset locally**, except `_`-prefixed ones. **[probed]**

#### Read path — Collection

`child_added` / `child_moved` / `child_changed` / `child_removed`, plus `once('value')` for `sync`.
Four subscriptions in total. **[probed]**

- **Ordering is guaranteed: all initial `child_added` events precede `value`.** That is an SDK
  guarantee, and it is what makes `onSyncOrReady()` mean "the collection is populated". On a cached
  path the children arrive synchronously in the constructor while `value` is still deferred —
  `length === 1`, `isSynced === false`. **[probed]** So _unlike_ the Model, a Collection's `sync` is
  always asynchronous.
- **`sync` fires exactly once** for a Collection. **[read]**
- **Child id: a stored `id` field beats the Firebase key.** `d.id || (d.id = _getKey(snap))`.
  **This is the sharpest landmine in the whole blob.** Backfire indexes by the stored `id` but
  writes to `ref.child(model.id)`. Probing a child at key `key-x` carrying `{id:'other-id'}`, both
  `m.set('v',99)` and `c.remove(m)` addressed **`other-id`**; the real node at `key-x` was never
  touched and **survived the delete intact**. **[probed]** Whether any production node has this
  shape is §7.6's first experiment.
- **Scalar children lose their value entirely.** `_childAdded` replaces a non-object `val()` with
  `{}` and stamps the key on it: children `{a: 5, b: 'text'}` arrive as `[{id:'a'}, {id:'b'}]`.
  **[probed]** Relevant: several inventory collections could plausibly be `{key: count}` maps.
- **`_childChanged` throws when it cannot find the model** — `Error: Could not find model with ID …`
  — and **the throw is not catchable at the call site.** It is raised inside the SDK's event queue
  and escapes through `exceptionGuard`; the code that issued the write sees no error at all (in a
  browser it becomes a `window.onerror`). **[probed]** Reachable by removing a member locally
  without removing it in Firebase.
- **`.priority` / `child_moved` are half-implemented.** `_childMoved` only logs. `comparator` is
  `model.id`, so priority ordering is discarded on read even though two call sites write `.priority`.

#### Write path — Model

```js
_updateModel: function (b) { var c = b.changedAttributes(); … a.size(c) && this.firebase.ref().update(c, this._log) }
```

overridden in `duelyst_firebase.ts:119` to strip `_`-prefixed keys and route through `toRef()`.

- **Optimistic: yes, trivially.** `set()` mutates first; the network call follows. Nothing waits for
  or re-reads the server.
- **No coalescing.** One `change` event → one `update()`. `set({a:1,b:2})` is one write;
  `set('a',1); set('b',2)` is two. That is Backbone, not backfire — backfire adds no debounce, batch
  or dirty queue.
- **Shallow delta of whole attribute values.** `changedAttributes()` gives changed top-level keys
  with complete values, and `update()` merges at the top level. Two clients editing **different
  sub-keys of the same object-valued attribute clobber each other** — the loser's sub-key is gone,
  not merged.
- **Echo suppression is re-entrancy, not identity.** The write is echoed back and re-applied;
  `_modelChanged` wraps its `set` in `_listenLocalChange(false/true)` so the resulting `change` does
  not re-write. There is no dirty-tracking and no "is this my own write" test.
- **Deletes: `unset('b')` writes `{b: null}`; `set('a', undefined)` writes `{a: null}`. `id` is
  exempt** — a null `id` is dropped from the payload rather than written. **[probed]**
- **No failure path at all.** The completion callback is `_log`, which `console.log`s a non-null
  error and nothing else. No retry, no rollback, no `error` event, no way for a call site to learn a
  write failed.
- **Defaults are written back to the server on first sync.**
  `this.once('sync', function () { this.set(_.defaults(this.toJSON(), defaults)) })`, and that `set`
  runs after local-change listening is on. A model with `defaults: {theme:'dark', vol:5}` issued
  `update({"theme":"dark","vol":5})` on its first sync. **[probed]** For `Profile` that is **24
  settings defaults — including `id: 0` and `username: 'Duelyst'`** — persisted into `/users/…` the
  first time a client with no stored settings syncs. This is the one write the app performs that no
  call site asks for.
- **First local write on a cached path is issued TWICE.** When the initial `value` arrives
  synchronously inside `on()` (see the read path), backfire's `_modelChanged` runs its
  `_listenLocalChange(false→true)` pair _before_ the constructor reaches its own
  `_listenLocalChange(true)` — leaving **two** `change` handlers registered. The next `set()`
  therefore issues **two identical `update()` calls**; the first echo then collapses the handlers
  back to one, so only the first write doubles. **[probed: handler count 2, two `update()` calls with
  identical payloads for one `set()`]** The payloads are idempotent, so today this costs write ops
  rather than correctness — but it stops being harmless the moment a payload contains
  `ServerValue.TIMESTAMP` or an increment. Reachable wherever a second model is built on an
  already-cached path: `views/layouts/arena.ts:44` (new model on every `onShow`),
  `news_manager.ts:134` (one per call), and any child path already covered by a parent listener.
- **`save()` is a no-op** (`_log('Save called on a Firebase model, ignoring.')`) — 0 writes.
  **[probed]** No call site calls it; a replacement that makes `save()` work would change behaviour.
- **`destroy()` requires an options object** — `destroy()` with no argument throws
  `TypeError: Cannot read properties of undefined (reading 'success')`. **[probed]** The one call
  site passes `{}` (`games_manager.ts:912`).

#### Write path — Collection

`add`/`remove`/`create` write and wait for the echo; they never mutate the collection directly.
**[read]**

- **In practice the member appears synchronously**, because the SDK raises the local `child_added`
  optimistically. **[probed]** The true semantics are **optimistic with automatic rollback**: if the
  server rejects the write the SDK reverts and fires `child_removed`, so the member silently
  disappears — with no error surfaced anywhere, since `add()`'s completion callback defaults to a
  no-op. Materially worse than the Model path, where at least `_log` prints.
- **Id minting:** `_parseModels` mints `push().key` for a model with no id, then
  `ref.child(id).set(payload)`. Ids are client-generated push keys, written as an explicit child
  rather than via `push()` itself. **[probed]**
- **`add()` returns plain JSON objects, not models.** `create()` returns `add()[0]`, i.e. also JSON.
  **[probed]**
- **The diff in `_updateModel` uses loose `!=`, and drops type-only changes.** `d[b] != c[b]`
  against `_remoteAttributes`. A member changing from `1` to `'1'` produces **no write at all** —
  Backbone's `set` reports the change (it uses `_.isEqual`), backfire's `!=` says equal, and the
  write is silently skipped. **[probed]** The same applies to `0`↔`false` and `null`↔`undefined`.
  **The Model path does not have this filter** — it writes `{"n":"1"}` for the same change
  **[probed]** — so Model and Collection members disagree about what counts as a change.
- **The silent flag is inert.** `_childAdded` does
  `Backbone.Collection.prototype.add.apply(this, [d], {silent:true})` — `Function.prototype.apply`
  takes two arguments, so the options object is discarded. Probing `add([3 items], {silent:true})`
  produced **3 `add` events**. **[probed]** `_suppressEvent` is additionally single-shot, so
  `reset()` — built on silent `remove`-then-`add` — is doubly broken. **Nothing depends on this**,
  which is why it has never been noticed.

#### The `_`-namespace convention

`duelyst_firebase.ts` overrides two Model methods:

- `_updateModel` — strips `_`-prefixed keys from the outbound delta. **[probed: `set('_local')`
  produced no write; `set('real')` wrote `{"real":"y"}`]**
- `_modelChanged` — skips `_`-prefixed keys when unsetting server-removed keys. **[probed: a
  `_`-attribute survives a snapshot that lacks it]**

**Why both are needed.** `PresenceModel` binds `/users/<other>/presence` — **another user's node**
(`collections/buddies.ts:23`). `models/conversation.ts:73` sets `_lastUnreadMessageAt` on it for
every incoming chat message. Without the strip, the client would write its own unread bookkeeping
into a buddy's record — permission-denied on every message, or corruption of a buddy's node if the
rules allow it. Without the `_modelChanged` guard, every incoming presence `value` — i.e. every
buddy status change — would unset `_active`, `_unread` and `_lastUnreadMessageAt`, clearing buddy
selection and unread markers and re-sorting the buddy list (`collections/presence.ts:11` sorts on
`_lastUnreadMessageAt`). On the `Profile` side, `views/item/settings_menu.ts:142` would push the full
screen-resolution list into `/users/…` every time the settings screen opens.

The flip side worth naming: `shop_manager.markAttemptedPurchase` does `set('_'+sku, 1)` and therefore
**never reaches Firebase**. It reads as intentional — the getter is `getAttemptedPurchaseCount`,
distinct from the server-backed `getPurchaseCount` — but it is a silent drop, and a replacement that
"fixed" it would start writing into `user-purchase-counts`.

**The convention exists on the Model only.** `DuelystFirebase.Collection` adds nothing but
`constructor`/`onSyncOrReady`, so a member of a synced collection has its `_`-attributes written
straight to Firebase. **Confirmed by probe: after `member.set('_local','x')` the Firebase node read
back as `{"_local":"x","v":1}`.** **[probed]** No call site currently sets `_`-attributes on a
collection member — every `_`-setter targets a plain `Backbone.Model` (including
`twitch_manager.ts:192`'s `twitchRewardModel`), a REST-backed deck, or one of the three Models above
— so this is a **latent trap, not a live bug**. A replacement must apply the convention on both
sides or document that it applies to neither.

#### Errors, permission denials and offline

**backfire contains zero offline handling**: no `onDisconnect`, no `.info/connected`, no queue, no
retry, no backoff. All of it is the SDK's, which buffers writes in memory and replays them on
reconnect; that buffer is not persisted, so a write issued while offline is lost if the tab closes.
**[inferred — SDK behaviour; nothing in backfire touches it]**

The operationally important part is **the failure path, which does not exist**:

- **No listener is ever registered with a cancel callback.** Probed the arity of every `ref.on()`
  backfire makes: the Model registers **one** listener with **2** arguments, the Collection **four**,
  all with **2**. Never 3. **[probed]** A permission-denied read is therefore dropped on the floor —
  the SDK cancels the listener and `sync` never fires.
- `onSyncOrReady()` (`duelyst_firebase.ts:103,170`) builds a promise whose `reject` is **declared and
  never called**, with no timeout.
- `Manager::_markAsReadyWhenModelsAndCollectionsSynced` (`ui/managers/manager.ts:103`) does
  `Promise.all(allPromises).then(…)` at `:112` with **no `.catch`**.

**Consequence:** if any single ref fails to deliver its first `value` — a rules change, a path an
unauthenticated client cannot read, a wrong `FIREBASE_URL` — the manager never becomes ready and the
client hangs on the loading screen with nothing in the console. **This is the single most important
behavioural gap, and it is in our code (`onSyncOrReady`), not in the blob.**

**Listener cleanup is near-absent.** Only `profile_manager.ts:40` and `stream_manager.ts:56` call
`.firebase.off()`. `views/layouts/arena.ts:44` creates a new model per `onShow` and
`news_manager.ts:134` one per `getFirstUnreadAnnouncementContentAsync` — both leak a permanent
`value` listener (and, per the write path above, each new one on the now-cached path
double-registers its write handler).

### 7.4 What `test/unit/firebase/backfire_derived_ref.js` pins — and what it does not

Added by `60ab64c1`. 89 lines, 4 assertions, runs in `pnpm vitest --project firebase`, green at
`f0ff2ce`. It reaches the client tree by workspace name (`@duelyst/client/…`), so a replacement
module is importable from the suite with no path alias.

**What it pins:**

1. A derived ref genuinely lacks a callable `.ref` (`typeof derived.ref === 'object'`) — it asserts
   the _precondition_, so the test cannot silently pass because the SDK changed.
2. `destroy({})` on a Model built from `new Firebase(url).push()` does not throw — the
   `games_manager.cancelInvite` regression.
3. The same for `.child(...)`.
4. `ensureCallableRef(query)` yields `typeof query.ref === 'function'`,
   `typeof query.child === 'undefined'`, and `typeof query.ref().child === 'function'` — i.e. a
   Query's patched `ref()` resolves to the underlying **Reference**, which is what backfire's
   `.ref().child(…)` needs.

**What it deliberately does not pin:**

- **No collection coverage.** All four cases are Models. `models/conversation.ts` and
  `news_manager.ts:98` — the two live query-backed _collection_ writers — are not exercised.
  (Both shapes were probed directly at `f0ff2ce`: `create({…, '.priority': …})` on a
  `child('messages').startAt(Date.now())` query, and `add()` on a `child('read').limitToLast(20)`
  query. Neither throws. **[probed]** So they work; they are simply untested.)
- **No assertion about where the write lands.** `destroy()` "does not throw" says nothing about the
  path it wrote to.
- **Nothing about semantics.** Ordering, echo, deletes, defaults write-back, the `_`-namespace, error
  propagation — none of §7.3 is covered. It is a shape test for one `TypeError`, and it is honest
  about being that.
- **Nothing about the double-registration** — it constructs each model on a fresh path.
- **`_getKey`** — the other patch in the same file — is untested.
- It runs `goOffline()`, so it cannot see anything requiring a server: rules, rollback, reconnect.

**Assessment: it is the right test for the bug it was written for, and it is not a characterisation
suite.** Roughly 80% of §7.3 is currently unpinned, and #9 is a rewrite of exactly that surface. The
38-record probe behind this section is the shape the missing suite should take, and it runs offline
in well under a second.

### 7.5 Checklist for a modular-SDK adapter (#9)

Every item is something a call site depends on today. **[keep]** = reproduce exactly; **[decide]** =
a deliberate call, flagged because "obviously correct" differs from current behaviour; **[fix]** =
current behaviour is wrong and should not be ported.

**Model — read**

1. **[keep]** Subscribe with `onValue`; apply the whole snapshot to the model.
2. **[keep]** Unset local keys absent from the snapshot — **except** `_`-prefixed ones.
3. **[keep]** Fire `sync` on **every** value, not just the first (`Profile.onSync` depends on it).
4. **[keep]** Set `isSynced`/`ready` before any listener can fire — register the `sync` hook
   **before** subscribing, or the cached-path synchronous delivery is missed.
5. **[decide]** A remotely deleted node currently leaves attributes intact. Clearing them is the
   intuitive behaviour and is a **behaviour change**.
6. **[decide]** A scalar node currently yields `{}`. Same.

**Model — write**

7. **[keep]** Optimistic `set()`, then a shallow top-level `update()` of `changedAttributes()`.
8. **[keep]** Strip `_`-prefixed keys from the outbound delta.
9. **[keep]** Coerce `undefined`/`null` values to `null`; drop a null `id` instead of writing it.
10. **[keep]** Suppress re-entrant writes while applying a remote snapshot.
11. **[fix]** Register the local-change handler exactly once (kills the double write).
12. **[decide]** Defaults write-back on first sync — 24 keys into `/users/…` for `Profile`.
    **Recommendation: apply defaults locally only.** This changes what is stored server-side and
    needs a human call (§7.6).
13. **[keep]** `save()` stays a no-op, or is removed outright.
14. **[keep]** `destroy(options)` writes `null` at the ref and fires `destroy` — and should tolerate
    being called with no argument.

**Collection — read**

15. **[keep]** `onChildAdded`/`Changed`/`Removed`, plus a one-shot `onValue` for `sync`, relying on
    the SDK's children-before-value ordering.
16. **[keep]** Child id: stored `id` attribute wins, else the snapshot key.
17. **[fix]** …but **address by key, not by the stored id**, when writing or removing. Today a
    mismatch writes to a phantom sibling and leaves the real node untouched (§7.3). Keep the id
    semantics for `collection.get()`; do not keep them for path construction.
18. **[decide]** Scalar children currently lose their value. Preserving it (e.g. as `{id, value}`) is
    a behaviour change visible to any view that renders such a collection.
19. **[fix]** `_childChanged` must not throw when the model is absent — today the throw escapes the
    caller entirely and lands on `window.onerror`.
20. **[keep]** `comparator: model.id` — nothing reads Firebase priority ordering.

**Collection — write** (three call sites; see the recommendation below)

21. **[keep]** Optimistic local echo, with the SDK's rollback on rejection.
22. **[keep]** Mint an id from `push().key` when the payload has none.
23. **[fix]** Diff with `!==`/`isEqual`, not `!=` — the current filter silently drops type-only
    changes, and disagrees with the Model path.
24. **[fix]** Either make `{silent:true}` work or delete the option; today it is inert.
25. **[keep]** `.priority` must survive in the written payload (`models/conversation.ts`,
    `news_manager.ts`).

**Cross-cutting**

26. **[fix]** Pass a **cancel callback** to every subscription and propagate it.
27. **[fix]** Give `onSyncOrReady()` a **reject path and a timeout**, and add `.catch` in
    `Manager::_markAsReadyWhenModelsAndCollectionsSynced`. Turns the worst failure mode — a silent
    hang on the loading screen — into an error.
28. **[fix]** Surface write errors instead of `console.log`.
29. **[keep]** Apply the `_`-namespace convention on **both** Model and Collection, and write it down.
30. **[fix]** Do not reinstate the `Backbone.sync` monkeypatch. It hijacks any object with a
    `firebase` property and its `Backbone.VERSION === '0.9.10'` branch is dead.
31. **[keep]** Provide `.off()`-equivalent teardown; `profile_manager` and `stream_manager` call it.
    Modular's `onValue` returns an unsubscribe function, which is strictly better.

**Where the modular SDK differs from compat — checked, not assumed:**

- **Every primitive backfire needs exists in `firebase/database`** — `set`, `update`, `remove`,
  `push`, `setWithPriority`, `onValue`, `onChildAdded/Changed/Removed/Moved`, `query`,
  `orderByChild`, `startAt`, `limitToLast`, `child`, `ref`, `refFromURL`, `goOffline`,
  `onDisconnect`, `serverTimestamp`, `get`. **[probed: 21/21 present on `firebase@12.18.0`]** There
  is no missing capability.
- **`.ref()` vs `.ref`.** The whole `withCallableRef`/`ensureCallableRef` apparatus
  (`apps/client/firebase.ts:78`, `duelyst_firebase.ts:59`) exists only to keep v2's method spelling
  alive. It **deletes itself** against the modular API, where refs are passed as values to free
  functions. That is the single largest simplification available.
- **Free functions, not methods.** `ref.on('value', cb)` → `onValue(query, cb, cancelCb)`, returning
  an unsubscribe. `ref.update(d, cb)` → `update(ref, d)` returning a **Promise** — which is what
  makes checklist items 26–28 cheap rather than invasive.
- **`.priority` still works**, both as an inline `.priority` key in a `set()` payload and via
  `setWithPriority`. Deprecated but functional. Worth revisiting whether the two `.priority` writers
  need it at all, since nothing reads the ordering (item 20).
- **A Query is not a Reference in either SDK.** Modular makes this explicit: `query(ref, …)` returns
  a `Query` with a `.ref` property. The current code's Query→Reference resolution stays necessary,
  it just stops being a shim.
- **Auth and app init are already modular-ready** — `apps/client/firebase.ts` initialises through
  `compat/app` but everything it re-exposes has a modular equivalent.

### 7.6 What could not be determined, and the experiments that would settle it

Everything below needs either live credentials or production data. **An honest gap is more useful
than a guess.**

| #   | Question                                                                                              | Why it matters                                                                                                                                                        | Experiment                                                                                                                                                                                                                                                                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Does any synced collection contain children whose stored `id` differs from their Firebase key?**    | If yes, backfire is _already_ writing to phantom sibling nodes and failing to delete real ones (§7.3), and it is a live data-corruption bug rather than a latent one. | Against a real DB, for each of the 27 collection roots, dump one node and compare each child's key to its `id` field. A read-only script over `user-inventory/…`, `user-games/…`, `matchmaking/…/invites/to/…`, `news/index`, `user-news/…/read`, `boss-events`, `streamer-whitelist`, `user-ribbons/…` settles it in minutes. **Do this one first.**                   |
| 2   | **Does any synced collection contain scalar children?**                                               | They currently arrive as `{id}` with the value discarded (§7.3), so a view may be silently rendering nothing.                                                         | Same dump; check whether any child is a number/string/boolean rather than an object.                                                                                                                                                                                                                                                                                    |
| 3   | **What actually happens to an optimistic collection `add()` that the rules reject?**                  | Determines whether checklist item 21's "rollback" is real, and whether the member vanishes silently.                                                                  | With real credentials, `add()` into a path the rules forbid; watch for `child_removed` and whether anything is logged.                                                                                                                                                                                                                                                  |
| 4   | **Does a permission-denied read really strand the manager forever?**                                  | The predicted worst failure mode (§7.3), reasoned from `on()`'s 2-argument arity but never observed end to end.                                                       | Tighten a rule on one path a manager syncs, load the client, confirm it hangs on the loading screen with a silent console.                                                                                                                                                                                                                                              |
| 5   | **Is writing 24 `Profile` defaults into `/users/…` on first sync relied on by anything server-side?** | Gates checklist item 12.                                                                                                                                              | Grep `apps/server/lib/data_access/users.ts` and the rules for reads of `username`/`id` under `/users/`; confirm against a freshly-registered account.                                                                                                                                                                                                                   |
| 6   | **Is `shop_manager.markAttemptedPurchase`'s silent drop intended?**                                   | Gates whether a replacement starts writing to `user-purchase-counts`.                                                                                                 | Product decision — ask.                                                                                                                                                                                                                                                                                                                                                 |
| 7   | **Is `backfire.min.js` modified from upstream 0.4.0?**                                                | A modified blob means the README is wrong and a fork would need the diff.                                                                                             | **All known leads are exhausted** (§7.1): both GitHub repos are deleted, npm `backfire` is an unrelated package and npm `backbonefire` ships no code. Remaining options are a Software Heritage / Wayback archive of `cdn.firebase.com/libs/backfire/0.4.0/`, or a 2015-era `bower_components` tree in some other project. Low value given §7.7 recommends not forking. |
| 8   | **Does the double-write (§7.3) fire in production?**                                                  | Determines whether checklist item 11 is a correctness fix or a cost fix.                                                                                              | Open the Arena screen twice in one session with the network panel open, or count writes on `views/layouts/arena.ts`'s ref.                                                                                                                                                                                                                                              |

The probe behind §7.3 did **not** boot the client and did **not** talk to a live Firebase database.
Everything marked **[probed]** was executed against the real SDK offline, which covers local
read/write/echo semantics faithfully but cannot cover rules, rejection, reconnect or real latency.

### 7.7 Recommendation: replace the blob, do not port it

Of replace / fork-with-source / keep-the-compat-layer: **replace**, with the qualifier that **a
faithful port is the wrong deliverable** — §7.5 lists 11 `[fix]` items, i.e. things a faithful port
would carefully preserve as bugs.

**Not "keep the compat layer."** It is not stable: it has taken two patches, the second
(`60ab64c1`) fixing a class of `TypeError` that stranded both players on a game invite. Keeping it
also pins `firebase/compat` forever, which blocks the modular migration `apps/client/firebase.ts`
names as its own destination.

**Not "fork with source."** There is no upstream to track and no source in the repo — and per §7.1
we cannot even establish what it would be a fork _of_. A de-minified fork buys ~250 lines with no
consumers (the sync adapter, the `Backbone.sync` monkeypatch, `.priority` handling, `_childMoved`)
plus the `_getKey` and `.ref()` shims kept forever.

**Replace, in this shape:**

1. **`onSyncOrReady()` reject path + cancel callbacks + `Manager` `.catch`.** Independent of the
   blob, no happy-path behaviour change, and it converts the worst failure mode from a silent hang
   into an error. **Ship it first, on its own.**
2. **Rewrite the 3 collection-write call sites onto direct ref calls** (`push`/`set`/`remove`):
   `models/conversation.ts:22,43`, `news_manager.ts:98`, `games_manager.ts:704`. That deletes
   `_parseModels`, `_suppressEvent`, `_removeModel`, the `.priority`/`setWithPriority` branch and the
   `!=` diff from the surface a replacement must reproduce — and takes checklist items 21–25 with
   them.
3. **Replace the blob with an owned, tested `apps/client/ui/extensions/firebase_sync.ts`** providing
   the Model read path, the Model write path and the Collection read path — the three things §7.2
   shows are actually depended on. Write it against `firebase/compat` first so nothing else moves,
   then flip to modular. Delete `apps/client/vendor/backfire/`, its entry at
   `tools/build/build-client.mjs:158`, and the 11 dead requires.

### 7.8 Scope estimate, re-stated

**The plan's ~200 lines is a fair number for the wrong artefact.** A like-for-like port lands near
**170 lines**. The work as recommended is **~260 lines of module + call-site change, plus ~250 lines
of tests**:

| Piece                                                                         | Lines    | Port or new?     |
| ----------------------------------------------------------------------------- | -------- | ---------------- |
| Model read path                                                               | ~35      | port             |
| Model write path                                                              | ~45      | port + 1 `[fix]` |
| Collection read path                                                          | ~45      | port + 2 `[fix]` |
| `onSyncOrReady` with reject + timeout                                         | ~20      | **new**          |
| Cancel callbacks + write-error propagation                                    | ~25      | **new**          |
| `Manager` `.catch`                                                            | ~5       | **new**          |
| 3 collection-write call sites rewritten onto direct refs                      | ~15      | **new**          |
| Deleting 11 dead requires, `apps/client/vendor/backfire/`, the `.ref()` shims | ~-70     | deletion         |
| **Module + call-site total**                                                  | **~260** |                  |
| Characterisation tests (~20 behaviours × ~12 lines)                           | ~250     | **new**          |

Why the guess does not survive:

- **~60 of the 170 ported lines serve three trivial call sites.** Step 2 above removes them from the
  module and adds ~15 lines at the call sites.
- **~50 lines are new code the estimate never contained.** Error and cancel propagation and a
  reject/timeout on `onSyncOrReady` are not a port. Confirmed: backfire registers **five**
  subscriptions across Model and Collection and passes a cancel callback to **none** of them, and
  `ui/managers/manager.ts:112` is a bare `Promise.all(...).then(...)`.
- **The test half was not counted at all, and is the larger half.**
  `test/unit/firebase/backfire_derived_ref.js` is 89 lines pinning one `TypeError` (§7.4) and
  `test/integration/firebase/` is 146 lines about server-side tokens; **neither covers any semantics
  in §7.3**, and roughly 80% of that section is unpinned.
- **The risk is not the line count.** None of the 9 write paths is reachable by `pnpm test:e2e`
  (register + practice game), and a replacement that silently changes delta semantics **corrupts
  inventory rather than crashing**.

Split into the three PRs above, in that order, each independently revertable. Per plan §11.3, none
can rely on the screen tour until #2 lands, and steps 2 and 3 need the hand-test checklist in the PR
body — the tour will not reach buddy chat send, news read-marking, invite cancel or settings
persistence.

### 7.9 Decisions (Valentin, 2026-10-15)

1. **Replace the blob**, in the three-PR order of §7.7. Not a fork, not the compat layer.
2. **Ship §7.7 step 1 first, on its own:** `onSyncOrReady()` reject path and timeout, cancel
   callbacks on every subscription, and `.catch` in `Manager::_markAsReadyWhenModelsAndCollectionsSynced`.
3. **Profile defaults are applied locally only** (§7.5 item 12). The replacement stops writing the
   24 defaults into `/users/<id>` on first sync. Before that lands, confirm nothing server-side reads
   them (§7.6 #5).
4. **Run the read-only live-data check (§7.6 #1 and #2) before the replacement:** dump each synced
   collection root and compare every child's key to its stored `id`, and look for scalar children.
   A mismatch is live data corruption today, not a latent trap.

## 8. Constraints for whoever picks this up

- **Follow the working rules in `docs/BACKBONE_REMOVAL_PLAN.md` §11**: PRs target
  `marionette-removal`, one issue per PR, one commit per step, each leaving `pnpm build` and
  `pnpm test:unit` green. No big-bang rewrites.
- **The e2e is the real gate for anything in this area.** A wrong Backbone/Firebase version fails
  at _runtime_, not at build time — a green build proves nothing. Run `pnpm test:e2e` (it
  registers an account, plays a practice game, and asserts zero console errors) against the
  docker stack. A _playable_ build needs the whole `.env`, not just `FIREBASE_URL`:
  `set -a; . ./.env; set +a` first, or you get `auth/invalid-api-key` at runtime.
- **`pnpm check:undefined-names` after any codemod** — TS2304 is a CI gate and is currently zero.
- **Don't "fix" `apps/client/vendor/backfire/backfire.min.js`.** Corrections go in
  `duelyst_firebase.ts`, which is the established pattern and is commented as such.
- **Beware `const` shadowing from the decaffeination** — a suite-scope variable re-declared inside
  a callback leaves every later read seeing the initial `null`. It has cost real debugging time in
  exactly these Firebase-backed areas (`sync`, `inventory`, `rift`, `quests`), and lint cannot see
  it.
- 3 data_access tests are quarantined as unstable (`known-unstable.txt`); `known-failures.txt` is
  empty and may shrink, never grow.
