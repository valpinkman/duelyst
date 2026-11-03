// pragma PKGS: alwaysloaded

/*
 * Marionette shell for <duelyst-buddies> (docs/BACKBONE_REMOVAL_PLAN.md §3.3,
 * issue #86).
 *
 * The shell is what the navigation manager and transition.ts see: it carries
 * the modal's id and classes, animateIn/animateOut, and the class identity the
 * utility menu and the message notifications pass to toggleModalViewByClass().
 * Its template is the tag alone; the tag is `display: contents`
 * (styles/layouts/buddies.scss), so .duelyst-modal lays out .modal-dialog as
 * it did.
 *
 * Properties in, events out: the shell owns which buddy is selected (the
 * presence models' `_active` / `_unread`, as the old list kept them), works
 * out the last opponent, and turns the element's events into manager calls
 * and dialogs. The selected buddy shows in a Marionette region on the
 * element's `.buddy-selection-host` as BuddySelectionShell (#83). The dialogs
 * stay Marionette (#12, D4).
 */

'use strict';

// side-effect require: registers <duelyst-buddies>
require('../components/buddies/buddies');

var CONFIG = require('@duelyst/common/config');
var EventBus = require('@duelyst/common/eventbus');
var EVENTS = require('@duelyst/common/event_types');
var SDK = require('@duelyst/sdk');
var RSX = require('@duelyst/data/resources');
var audio_engine = require('../../audio/audio_engine');
var Animations = require('../views/animations');
var ChatManager = require('../managers/chat_manager');
var GamesManager = require('../managers/games_manager');
var NavigationManager = require('../managers/navigation_manager');
var ProfileManager = require('../managers/profile_manager');
var ProgressionManager = require('../managers/progression_manager');
var DuelystBackbone = require('../extensions/duelyst_backbone');
var ReferralDialogView = require('../views2/referrals/referral_dialog');
var RedeemGiftCodeModalView = require('../views/item/redeem_gift_code_modal');
var BuddySelectionShell = require('./buddy_selection_shell');

var ART = {
  profileIcon: function (portraitId) {
    var icon = SDK.CosmeticsFactory.profileIconForIdentifier(portraitId);
    return icon && icon.img;
  },
  divisionClass: function (rank) {
    return SDK.RankFactory.rankedDivisionAssetNameForRank(rank);
  },
};

function presenceCollection() {
  return ChatManager.getInstance().getBuddiesCollection().getPresenceCollection();
}

var BuddiesShell = Backbone.Marionette.ItemView.extend({
  id: 'app-buddies',
  className: 'modal duelyst-modal',

  template: function () {
    return '<duelyst-buddies></duelyst-buddies>';
  },

  events: {
    'buddy-select': 'onBuddySelect',
    'buddy-add': 'onBuddyAdd',
    'last-opponent-add': 'onAddLastOpponent',
    'do-not-disturb': 'onDoNotDisturb',
    'referral-open': 'onOpenReferralProgram',
    'referral-redeem': 'onClaimReferralCode',
  },

  animateIn: Animations.fadeIn,
  animateOut: Animations.fadeOut,

  // the buddy the list marks active
  _selected: null,
  // the buddy whose shell the selection region shows
  _shown: null,
  _selectionRegion: null,

  initialize: function () {
    // a buddy picked the last time the list was open is picked again
    this._selected = presenceCollection().find(function (model) {
      return model.get('_active');
    });
  },

  _buddiesEl: function () {
    return this.el.querySelector('duelyst-buddies');
  },

  /* region STATE */

  // the last multiplayer opponent, offered for adding while not a buddy
  _syncLastOpponent: function () {
    var el = this._buddiesEl();
    if (el == null) return;
    var lastOpponentName = null;
    var lastOpponentBuddy = null;
    var lastGame = GamesManager.getInstance().playerGames.last();
    if (lastGame != null && SDK.GameType.isMultiplayerGameType(lastGame.get('game_type'))) {
      lastOpponentName = lastGame.get('opponent_username');
      var lastOpponentId = lastGame.get('opponent_id');
      lastOpponentBuddy = ChatManager.getInstance()
        .getBuddiesCollection()
        .find(function (buddy) {
          return buddy.get('id') == lastOpponentId;
        });
    }
    var show = lastOpponentName != null && lastOpponentBuddy == null;
    if (!show || el.lastOpponentName !== lastOpponentName) el.lastOpponentInviteSent = false;
    el.lastOpponentName = lastOpponentName;
    el.showLastOpponent = show;
  },

  _syncDoNotDisturb: function () {
    var el = this._buddiesEl();
    if (el != null) el.doNotDisturb = !!ProfileManager.getInstance().profile.get('doNotDisturb');
  },

  getCanRedeemReferralCode: function () {
    return (
      ProfileManager.getInstance().get('referred_by_user_id') == null &&
      ProgressionManager.getInstance().getGameCount() <= 0
    );
  },

  /* endregion STATE */

  /* region LIFECYCLE */

  onRender: function () {
    var el = this._buddiesEl();
    el.art = ART;
    el.presence = presenceCollection();
    el.canRedeemReferral = this.getCanRedeemReferralCode();
    this._syncDoNotDisturb();
    this._syncLastOpponent();
  },

  onShow: function () {
    var conversations = ChatManager.getInstance().conversations;
    this.listenTo(conversations, 'change:unread', this.onUpdateUnreadMessages);
    conversations.each(this.onUpdateUnreadMessages.bind(this));

    var presence = presenceCollection();
    this.listenTo(presence, 'add remove', this.onPresenceAddedOrRemoved);
    this.listenTo(presence, 'remove', this.onRemoveBuddy);
    this.listenTo(EventBus.getInstance(), EVENTS.resize, this.onResize);

    if (this._selected) this._select(this._selected, true);

    audio_engine
      .current()
      .play_effect_for_interaction(RSX.sfx_ui_tab_in.audio, CONFIG.SHOW_SFX_PRIORITY);
  },

  onResize: function () {
    var el = this._buddiesEl();
    if (el != null) el.measure();
  },

  onDestroy: function () {
    if (this._selectionRegion != null) {
      this._selectionRegion.empty();
      this._selectionRegion = null;
    }
    presenceCollection().each(function (model) {
      if (!model.get('_unread')) model.unset('_lastUnreadMessageAt');
    });
  },

  /* endregion LIFECYCLE */

  /* region SELECTION */

  /**
   * Picks the buddy with this user id, as the message notifications and the
   * screen tour do.
   * @param {String} buddyId
   */
  selectBuddy: function (buddyId) {
    var model = presenceCollection().find(function (model) {
      return model.userId == buddyId;
    });
    if (model) this._select(model, true);
  },

  onBuddySelect: function (e) {
    var userId = e.originalEvent.detail.userId;
    var model = presenceCollection().find(function (model) {
      return model.userId == userId;
    });
    // a click does not scroll the list
    if (model) this._select(model, false);
  },

  _select: function (model, scroll) {
    if (this._selected && this._selected !== model) this._selected.set('_active', false);
    model.set({ _active: true, _unread: false });
    ChatManager.getInstance().setConversationAsRead(model.userId);
    this._selected = model;

    var el = this._buddiesEl();
    el.updateComplete.then(
      function () {
        if (this.isDestroyed) return;
        if (scroll) el.scrollToIndex(el.visibleBuddies.indexOf(model));
        this._showSelection(model);
      }.bind(this),
    );
  },

  _showSelection: function (model) {
    if (this._shown === model) return;
    this._shown = model;
    var el = this._buddiesEl();
    if (model) {
      el.controlsDimmed = true;
      el.showCallout = false;
      if (this._selectionRegion == null) {
        this._selectionRegion = new Backbone.Marionette.Region({
          el: el.querySelector('.buddy-selection-host'),
        });
      }
      this._selectionRegion.show(new BuddySelectionShell({ model: model }));
    } else {
      // the old layout emptied the region: the referral callout does not return
      el.controlsDimmed = false;
      el.showCallout = false;
      if (this._selectionRegion != null) this._selectionRegion.empty();
    }
  },

  onRemoveBuddy: function () {
    this._showSelection(null);
  },

  onPresenceAddedOrRemoved: function (model) {
    var el = this._buddiesEl();
    if (
      el != null &&
      el.lastOpponentName != null &&
      model.get('username') === el.lastOpponentName
    ) {
      this._syncLastOpponent();
    }
  },

  onUpdateUnreadMessages: function (conversationModel) {
    if (!conversationModel.get('unread')) return;
    var unreadBuddyModel = presenceCollection().find(function (presence) {
      return conversationModel.get('id').indexOf(presence.userId) >= 0;
    });
    if (unreadBuddyModel == null) return;
    if (unreadBuddyModel !== this._selected) {
      if (!unreadBuddyModel.get('_unread')) unreadBuddyModel.set('_unread', true);
    } else {
      ChatManager.getInstance().setConversationAsRead(unreadBuddyModel.userId);
    }
  },

  /* endregion SELECTION */

  /* region ACTIONS */

  onBuddyAdd: function (e) {
    var el = this._buddiesEl();
    Promise.resolve(ChatManager.getInstance().inviteBuddy(e.originalEvent.detail.username)).then(
      function () {
        el.addBuddyDone();
      },
      function (error) {
        el.addBuddyFailed(error && error.message);
      },
    );
  },

  onAddLastOpponent: function () {
    var el = this._buddiesEl();
    if (el.lastOpponentName != null) {
      ChatManager.getInstance().inviteBuddy(el.lastOpponentName);
      el.lastOpponentInviteSent = true;
    }
  },

  onDoNotDisturb: function () {
    var profile = ProfileManager.getInstance().profile;
    profile.set('doNotDisturb', !profile.get('doNotDisturb'));
    this._syncDoNotDisturb();
  },

  onOpenReferralProgram: function () {
    var model = new DuelystBackbone.Model();
    model.url = process.env.API_URL + '/api/me/referrals/summary';
    model.fetch();
    NavigationManager.getInstance().showModalView(new ReferralDialogView({ model: model }));
  },

  onClaimReferralCode: function () {
    NavigationManager.getInstance().showModalView(new RedeemGiftCodeModalView());
  },

  /* endregion ACTIONS */
});

// Expose the class either via CommonJS or the global object
module.exports = BuddiesShell;
