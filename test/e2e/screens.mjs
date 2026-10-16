/*
 * The screen census for the screen tour (issue #2, decision D5).
 *
 * Every `Backbone.Marionette.LayoutView.extend` site under apps/client/ui
 * appears here exactly once, with what the tour does about it. Two screens
 * that are not LayoutViews (crafting, the main menu) are toured too, and the
 * two abstract bases name the concrete subclasses that are toured instead.
 *
 * test/unit/misc/screen_census.js holds this list against the source: a
 * LayoutView added later that nobody tours fails there, before anyone has to
 * notice the tour stayed green without looking at it. That test also checks
 * each landmark's id/className is still declared in the named file.
 *
 * status:
 *   toured   - visited by screen-tour.spec.mjs; `landmark` is what it asserts
 *   abstract - a base class that never renders as itself; `concrete` lists
 *              the toured subclasses
 *   skipped  - documented skip (decision D3); `reason` says why
 *   dropped  - dead code; `reason` says why
 *
 * `attached: true` marks a landmark asserted as present rather than visible:
 * the view is mounted but legitimately hidden or zero-sized until used.
 *
 * `visible` names a child that must be visible when the view's own root has
 * no box (zero-sized container, content sized or positioned elsewhere): the
 * root is then asserted present and the child visible. `visibleDeclaredIn`
 * is the template that declares the child.
 */

const UI = 'apps/client/ui';

export const SCREENS = [
  // --- reached on a fresh account's own path -------------------------------
  {
    name: 'TutorialLessonsLayout',
    file: `${UI}/views2/tutorial/tutorial_lessons_layout.ts`,
    status: 'toured',
    landmark: '#app-tutorial',
  },
  {
    name: 'MainMenuItemView',
    kind: 'ItemView',
    file: `${UI}/views/item/main_menu.ts`,
    status: 'toured',
    // the class declares no id/className; the root of its template does
    landmark: '.panel-menu.main-menu',
    declaredIn: `${UI}/templates/item/main_menu.hbs`,
  },
  {
    name: 'NotificationsLayout',
    file: `${UI}/views/layouts/notifications.ts`,
    status: 'toured',
    // always mounted by the navigation manager; empty until a notification
    landmark: '#app-notifications',
    attached: true,
  },

  // --- modals over the main menu -------------------------------------------
  {
    name: 'QuestLogLayout',
    file: `${UI}/views2/quests/quest_log_layout.ts`,
    status: 'toured',
    landmark: '#quest-log',
  },
  {
    name: 'ProfileLayout',
    file: `${UI}/views2/profile/profile_layout.ts`,
    status: 'toured',
    landmark: '#app-profile',
  },
  {
    name: 'BuddiesLayout',
    file: `${UI}/views/layouts/buddies.ts`,
    status: 'toured',
    landmark: '#app-buddies',
  },

  // --- play ----------------------------------------------------------------
  {
    name: 'PlayLayout',
    file: `${UI}/views/layouts/play.ts`,
    status: 'toured',
    landmark: '#app-play',
  },
  {
    name: 'ArenaLayout',
    file: `${UI}/views/layouts/arena.ts`,
    status: 'toured',
    landmark: '#app-arena',
    // its template (templates/layouts/arena.hbs) is 0 bytes: the Gauntlet
    // screen is drawn entirely by cocos, so the empty root is all the DOM has
    attached: true,
  },
  {
    name: 'RiftDeckSelectLayout',
    file: `${UI}/views2/rift/rift_layout.ts`,
    status: 'toured',
    // RiftLayout shares #app-rift; on a fresh account the deck-select layout
    // shows the runs list's empty state, which RiftLayout never renders
    landmark: '#app-rift .rift-runs .rift-runs-empty-view',
    landmarkDeclares: '#app-rift',
  },
  {
    name: 'RiftLayout',
    file: `${UI}/views2/rift/rift_run_layout.ts`,
    status: 'skipped',
    reason:
      'Needs a rift run in progress, which a fresh account does not have (D3: seeding is a ' +
      'follow-up). Under D6 it could not be asserted anyway: its template ' +
      '(views2/rift/templates/rift_run_layout.hbs) is 0 bytes, so #app-rift renders empty and ' +
      'everything visible is cocos.',
  },

  // --- collection and its modes --------------------------------------------
  {
    name: 'CollectionLayout',
    file: `${UI}/views2/collection/collection.ts`,
    status: 'toured',
    landmark: '#app-collection',
  },
  {
    name: 'SelectedCardLayout',
    file: `${UI}/views2/collection/selected_card.ts`,
    status: 'toured',
    landmark: '#app-selected-card',
  },
  {
    name: 'CraftingCompositeView',
    kind: 'CompositeView',
    file: `${UI}/views2/collection/crafting.ts`,
    status: 'toured',
    landmark: '#app-crafting',
  },
  {
    name: 'DeckLayout',
    file: `${UI}/views2/collection/deck.ts`,
    status: 'toured',
    landmark: '#app-deck',
  },
  {
    name: 'DeckCardBackSelectView',
    file: `${UI}/views2/collection/deck_card_back_select.ts`,
    status: 'toured',
    landmark: '#app-deck-card-back-select',
  },

  // --- the other main-menu destinations ------------------------------------
  {
    name: 'CodexLayout',
    file: `${UI}/views2/codex/codex_layout.ts`,
    status: 'toured',
    landmark: '#app-codex',
  },
  {
    name: 'ShopLayout',
    file: `${UI}/views2/shop/shop_layout.ts`,
    status: 'toured',
    landmark: '.shop-layout',
  },
  {
    name: 'WatchLayout',
    file: `${UI}/views2/watch/watch_layout.ts`,
    status: 'toured',
    landmark: '#app_watch',
  },
  {
    name: 'BoosterPackCollectionLayout',
    file: `${UI}/views/layouts/booster_pack_collection.ts`,
    status: 'toured',
    landmark: '#booster_pack_collection',
    // the root is zero-sized; its content is positioned absolutely
    visible: '.booster-buy',
    visibleDeclaredIn: `${UI}/templates/layouts/booster_pack_collection.hbs`,
  },
  {
    name: 'ShopSpiritOrbsModalView',
    file: `${UI}/views2/shop/shop_spirit_orbs_modal.ts`,
    status: 'toured',
    landmark: '.shop-spirit-orbs-modal',
    // shop.scss sizes only the dialog, so the root has no box of its own
    visible: '.modal-dialog',
    visibleDeclaredIn: `${UI}/views2/shop/templates/shop_spirit_orbs_modal.hbs`,
  },
  {
    name: 'PremiumPurchaseDialogView',
    file: `${UI}/views2/shop/premium_purchase_dialog.ts`,
    status: 'dropped',
    reason: 'Dead code: all three call sites are commented out.',
  },

  // --- in game -------------------------------------------------------------
  {
    name: 'GameLayout',
    file: `${UI}/views/layouts/game.ts`,
    status: 'toured',
    landmark: '#app-game',
  },
  {
    name: 'GamePlayerLayout',
    file: `${UI}/views/layouts/game_player.ts`,
    status: 'abstract',
    concrete: ['GamePlayer1Layout', 'GamePlayer2Layout'],
  },
  {
    name: 'GamePlayer1Layout',
    kind: 'subclass',
    file: `${UI}/views/layouts/game_player1.ts`,
    status: 'toured',
    landmark: '#app-game-player1',
  },
  {
    name: 'GamePlayer2Layout',
    kind: 'subclass',
    file: `${UI}/views/layouts/game_player2.ts`,
    status: 'toured',
    landmark: '#app-game-player2',
  },
  {
    name: 'PlayerPopoverLayout',
    file: `${UI}/views/layouts/game_player_popover.ts`,
    status: 'abstract',
    concrete: ['MyPlayerPopoverLayout', 'OpponentPlayerPopoverLayout'],
  },
  {
    name: 'MyPlayerPopoverLayout',
    kind: 'subclass',
    file: `${UI}/views/layouts/game_my_player_popover.ts`,
    status: 'toured',
    // .my-player is also toggled on the player panel itself (game_player.ts),
    // so scope to the popover region; popovers stay hidden until clicked
    landmark: '.popover-region > .player-popover.my-player',
    landmarkDeclares: '.player-popover.my-player',
    attached: true,
  },
  {
    name: 'OpponentPlayerPopoverLayout',
    kind: 'subclass',
    file: `${UI}/views/layouts/game_opponent_player_popover.ts`,
    status: 'toured',
    landmark: '.popover-region > .player-popover.opponent-player',
    landmarkDeclares: '.player-popover.opponent-player',
    attached: true,
  },
  {
    name: 'BuddySelectionLayout',
    file: `${UI}/views/layouts/buddy_selection.ts`,
    status: 'skipped',
    reason:
      'Shown by BuddiesLayout only when a buddy is selected (views/layouts/buddies.ts), so it ' +
      'needs a second account and an accepted friend request (D3: seeding is a follow-up). ' +
      'BuddiesLayout is toured with its empty friends list instead.',
  },
];

export const screen = (name) => {
  const entry = SCREENS.find((s) => s.name === name);
  if (!entry) throw new Error(`no screen named ${name} in test/e2e/screens.mjs`);
  return entry;
};
