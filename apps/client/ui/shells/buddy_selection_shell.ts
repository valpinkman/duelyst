// pragma PKGS: alwaysloaded

/*
 * Marionette shell for <duelyst-buddy-selection> (docs/BACKBONE_REMOVAL_PLAN.md
 * §3.3, issue #83).
 *
 * BuddiesLayout shows the shell in its selection region when a buddy is
 * picked. The shell's own root is `display: contents` (styles/layouts/
 * buddies.scss): the element is the old layout root, so the region lays it out
 * exactly as it did the Marionette layout. Its template is the tag alone.
 *
 * Properties in, events out: the shell reads ChatManager for what the buttons
 * may do, starts the conversation once chat is connected, and turns the
 * element's events into manager calls, sounds and dialogs. The dialogs stay
 * Marionette (#12, D4).
 */

'use strict';

// side-effect require: registers <duelyst-buddy-selection>
require('../components/buddies/buddy-selection');

var Analytics = require('@duelyst/common/analytics');
var CONFIG = require('@duelyst/common/config');
var EventBus = require('@duelyst/common/eventbus');
var EVENTS = require('@duelyst/common/event_types');
var SDK = require('@duelyst/sdk');
var RSX = require('@duelyst/data/resources');
var semver = require('semver');
var audio_engine = require('../../audio/audio_engine');
var ChatManager = require('../managers/chat_manager');
var GamesManager = require('../managers/games_manager');
var NavigationManager = require('../managers/navigation_manager');
var ProfileManager = require('../managers/profile_manager');
var ConfirmDialogItemView = require('../views/item/confirm_dialog');
var ErrorDialogItemView = require('../views/item/error_dialog');
var ProfileShell = require('./profile_shell');

var ART = {
  // what the generalPortraitHexImageForGeneralId helper resolved
  generalPortrait: function (generalId) {
    var generalCard = SDK.GameSession.getCardCaches().getCardById(generalId);
    if (generalCard != null) {
      var portraitHexResource = generalCard.getPortraitHexResource();
      return portraitHexResource && portraitHexResource.img;
    }
  },
};

var BuddySelectionShell = Backbone.Marionette.ItemView.extend({
  className: 'buddy-selection-shell',

  template: function () {
    return '<duelyst-buddy-selection></duelyst-buddy-selection>';
  },

  events: {
    'buddy-profile': 'onViewProfile',
    'buddy-spectate': 'onSpectateGame',
    'buddy-invite': 'onInviteBuddyToGame',
    'buddy-remove': 'onRemoveBuddy',
    'message-send': 'onSendMessage',
    'replay-share': 'onShareLastReplay',
    'replay-watch': 'onWatchReplay',
  },

  conversationModel: null,

  _selectionEl: function () {
    return this.el.querySelector('duelyst-buddy-selection');
  },

  // push what ChatManager allows into the component
  _sync: function () {
    var selection = this._selectionEl();
    if (selection == null) return;
    selection.showSpectate = this.getShowSpectateBuddyGame();
    selection.canSpectate = this.getCanSpectateBuddyGame();
    selection.canInvite = this.getCanSendBuddyGameInvite();
    selection.chatEnabled = this.getCanChat();
  },

  onRender: function () {
    var selection = this._selectionEl();
    selection.art = ART;
    selection.myUserId = ProfileManager.getInstance().get('id');
    selection.model = this.model;
    this._sync();
    this.listenTo(this.model, 'change', this._sync);
  },

  onShow: function () {
    ChatManager.getInstance().onConnect().then(this.onChatManagerConnected.bind(this));
  },

  onChatManagerConnected: function () {
    if (this.isDestroyed) return;
    // the conversation between me and my buddy
    this.conversationModel = ChatManager.getInstance().startConversation(this.model.userId);
    this._sync();
    var selection = this._selectionEl();
    if (selection != null) selection.conversation = this.conversationModel;
  },

  /* region ACTIONS */

  onSpectateGame: function () {
    if (this.model.get('status') === ChatManager.STATUS_GAME) {
      NavigationManager.getInstance()
        .showDialogForLoad()
        .then(
          function () {
            // analytics call
            Analytics.track('spectate game', {
              category: Analytics.EventCategory.Chat,
            });
            GamesManager.getInstance().spectateBuddyGame(this.model.userId);
          }.bind(this),
        );
    }
  },

  onViewProfile: function () {
    NavigationManager.getInstance().toggleModalViewByClass(ProfileShell, { model: this.model });
  },

  onInviteBuddyToGame: function () {
    if (this.getCanSendBuddyGameInvite()) {
      audio_engine
        .current()
        .play_effect_for_interaction(RSX.sfx_ui_confirm.audio, CONFIG.CONFIRM_SFX_PRIORITY);
      GamesManager.getInstance().invitePlayerToGame(this.model.userId, this.model.get('username'));
    } else {
      audio_engine
        .current()
        .play_effect_for_interaction(RSX.sfx_ui_error.audio, CONFIG.ERROR_SFX_PRIORITY);
    }
  },

  onRemoveBuddy: function () {
    var confirmDialogItemView = new ConfirmDialogItemView({
      title: 'Are you sure you want to remove ' + this.model.get('username') + '?',
    });
    this.listenToOnce(
      confirmDialogItemView,
      'confirm',
      function () {
        ChatManager.getInstance().removeBuddy(this.model);
      }.bind(this),
    );
    this.listenToOnce(
      confirmDialogItemView,
      'cancel',
      function () {
        this.stopListening(confirmDialogItemView);
      }.bind(this),
    );
    NavigationManager.getInstance().showDialogView(confirmDialogItemView);
  },

  onSendMessage: function (e) {
    if (this.conversationModel == null) return;
    this.conversationModel.sendMessage(e.originalEvent.detail.message);
  },

  onShareLastReplay: function (e) {
    if (this.conversationModel == null) return;
    var lastGame = GamesManager.getInstance().playerGames.last();
    if (lastGame && lastGame.get('game_id')) {
      var diff = semver.diff(process.env.VERSION, lastGame.get('game_version'));
      if (!diff || (diff != 'major' && diff != 'minor')) {
        this.conversationModel.sendReplay(
          lastGame.get('game_id'),
          lastGame.get('general_id'),
          e.originalEvent.detail.message,
        );
      } else {
        NavigationManager.getInstance().showDialogView(
          new ErrorDialogItemView({ title: 'This game is too old to share :(' }),
        );
      }
    }
  },

  onWatchReplay: function (e) {
    var detail = e.originalEvent.detail;
    EventBus.getInstance().trigger(EVENTS.start_replay, {
      gameId: detail.gameId,
      userId: detail.userId,
    });
  },

  /* endregion ACTIONS */

  /* region STATE */

  getCanSendBuddyGameInvite: function () {
    // only allow buddy game invites when both me and buddy have valid status
    return (
      ChatManager.getInstance().getIsMyStatusValidForBuddyGameInvite() &&
      ChatManager.getInstance().getIsStatusValidForBuddyGameInvite(this.model.getStatus())
    );
  },

  getShowSpectateBuddyGame: function () {
    return this.model.get('status') === ChatManager.STATUS_GAME;
  },

  getCanSpectateBuddyGame: function () {
    return (
      this.model.get('status') === ChatManager.STATUS_GAME &&
      ChatManager.getInstance().getIsMyStatusValidForBuddyGameInvite()
    );
  },

  // what the conversation composite checked when it rendered
  getCanChat: function () {
    return !!(
      ChatManager.getInstance().getConnected() &&
      ChatManager.getInstance().getBuddiesCollection().getIsBuddyOnlineById(this.model.userId)
    );
  },

  /* endregion STATE */
});

// Expose the class either via CommonJS or the global object
module.exports = BuddySelectionShell;
