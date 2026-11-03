// pragma PKGS: alwaysloaded

/*
 * Marionette shell for <duelyst-notifications> (docs/BACKBONE_REMOVAL_PLAN.md
 * §3.3, issue #88).
 *
 * The navigation manager shows this once, at boot, in the notifications
 * region, and it stays up for the life of the app. It carries the old
 * layout's id; its template is the tag alone, and the tag is
 * `display: contents` (styles/item/notifications.scss), so the three region
 * divs the element renders sit where the layout's did.
 *
 * Properties in, events out: the shell merges the main and buddy-invite
 * notifications into one collection (invites last), as the layout did, and
 * hands the element that and the message and quest collections. It owns what
 * the composites and item views did around the rows: the notification sounds
 * (throttled for messages), the auto-dismiss and fade of messages and quest
 * banners, the cap on how many messages show, and the manager calls for
 * dismiss, call-to-action, message select and replay.
 */

'use strict';

// side-effect require: registers <duelyst-notifications>
require('../components/notifications/notifications');

var CONFIG = require('@duelyst/common/config');
var EventBus = require('@duelyst/common/eventbus');
var EVENTS = require('@duelyst/common/event_types');
var SDK = require('@duelyst/sdk');
var audio_engine = require('../../audio/audio_engine');
var NotificationsManager = require('../managers/notifications_manager');
var NavigationManager = require('../managers/navigation_manager');
var ProfileManager = require('../managers/profile_manager');
var BuddiesShell = require('./buddies_shell');

var ART = {
  // what the generalPortraitHexImageForGeneralId helper resolved
  generalPortrait: function (generalId) {
    var generalCard = SDK.GameSession.getCardCaches().getCardById(generalId);
    if (generalCard != null) {
      var portraitHexResource = generalCard.getPortraitHexResource();
      return portraitHexResource && portraitHexResource.img;
    }
  },
  myUserId: function () {
    return ProfileManager.getInstance().get('id');
  },
};

function manager() {
  return NotificationsManager.getInstance();
}

// buddy invites sort after everything else; the sort is stable otherwise
function invitesLast(a, b) {
  var aInvite = a.get('type') === NotificationsManager.NOTIFICATION_BUDDY_INVITE;
  var bInvite = b.get('type') === NotificationsManager.NOTIFICATION_BUDDY_INVITE;
  if (aInvite === bInvite) return 0;
  return aInvite ? 1 : -1;
}

var NotificationsShell = Backbone.Marionette.ItemView.extend({
  id: 'app-notifications',

  template: function () {
    return '<duelyst-notifications></duelyst-notifications>';
  },

  events: {
    'notification-dismiss': 'onDismiss',
    'notification-cta': 'onAcceptCTA',
    'message-select': 'onMessageSelected',
    'replay-watch': 'onWatchReplay',
  },

  _merged: null,
  _timers: null,
  _throttledMessageSFXPlay: null,

  initialize: function () {
    this._merged = new Backbone.Collection();
    this._merged.comparator = invitesLast;
    this._timers = [];
  },

  _notificationsEl: function () {
    return this.el.querySelector('duelyst-notifications');
  },

  /* region LIFECYCLE */

  onRender: function () {
    var el = this._notificationsEl();
    el.art = ART;
    el.main = this._merged;
    el.messages = manager().getBuddyMessageNotifications();
    el.quests = manager().getQuestProgressNotifications();
  },

  onShow: function () {
    var main = manager().getMainNotifications();
    var invites = manager().getBuddyInviteNotifications();
    var messages = manager().getBuddyMessageNotifications();
    var quests = manager().getQuestProgressNotifications();

    // what each row's item view did on show, for the rows already there
    this._merged.add([].concat(main.models, invites.models));
    this._merged.each(this._onMainShown, this);
    messages.each(this._onMessageAdded, this);
    quests.each(this._onQuestAdded, this);

    this.listenTo(main, 'add', this._onMainOrInviteAdded);
    this.listenTo(main, 'remove', this._onMainOrInviteRemoved);
    this.listenTo(invites, 'add', this._onMainOrInviteAdded);
    this.listenTo(invites, 'remove', this._onMainOrInviteRemoved);
    this.listenTo(messages, 'add', this._onMessageAdded);
    this.listenTo(quests, 'add', this._onQuestAdded);
  },

  onDestroy: function () {
    this.stopListening(manager().getMainNotifications());
    this.stopListening(manager().getBuddyInviteNotifications());
    this.stopListening(manager().getBuddyMessageNotifications());
    this.stopListening(manager().getQuestProgressNotifications());
    for (var i = 0; i < this._timers.length; i++) clearTimeout(this._timers[i]);
    this._timers = [];
  },

  /* endregion LIFECYCLE */

  /* region ROWS */

  _onMainOrInviteAdded: function (model) {
    this._merged.add(model);
    this._onMainShown(model);
  },

  _onMainOrInviteRemoved: function (model) {
    this._merged.remove(model);
  },

  // the old NotificationItemView played the notification's sound on show
  _onMainShown: function (model) {
    this._playNotificationAudio(model);
  },

  _onMessageAdded: function (model) {
    var messages = manager().getBuddyMessageNotifications();
    // when showing too many messages, remove oldest immediately
    if (messages.length > CONFIG.MAX_BUDDY_MESSAGES_TO_PREVIEW) {
      manager().dismissNotification(messages.first());
    }

    this._dismissLater(model, messages, CONFIG.BUDDY_MESSAGES_PREVIEW_DURATION);

    // a sound for a new message, at most once per INCOMING_MESSAGE_SFX_DELAY
    if (this._throttledMessageSFXPlay == null) {
      this._throttledMessageSFXPlay = _.throttle(function (sfxAudio) {
        audio_engine.current().play_effect(sfxAudio, false);
      }, CONFIG.INCOMING_MESSAGE_SFX_DELAY * 1000.0);
    }
    if (model.get('audio')) this._throttledMessageSFXPlay(model.get('audio'));
  },

  _onQuestAdded: function (model) {
    this._dismissLater(
      model,
      manager().getQuestProgressNotifications(),
      CONFIG.QUEST_NOTIFICATION_DURATION,
    );
    this._playNotificationAudio(model);
  },

  _playNotificationAudio: function (model) {
    if (model.get('audio')) audio_engine.current().play_effect(model.get('audio'), false);
  },

  /**
   * After `seconds`, fade the row out over QUEST_NOTIFICATION_FADE_DURATION
   * and dismiss it, as the message and quest composites did.
   */
  _dismissLater: function (model, collection, seconds) {
    var timer = setTimeout(
      function () {
        this._timers = _.without(this._timers, timer);
        if (this.isDestroyed) return;
        var el = this._notificationsEl();
        var fade = el
          ? el.fadeOut(model, CONFIG.QUEST_NOTIFICATION_FADE_DURATION * 1000.0)
          : Promise.resolve();
        fade.then(function () {
          // already dismissed by hand, or pushed out by a newer message
          if (collection.get(model) == null) return;
          manager().dismissNotification(model);
        });
      }.bind(this),
      seconds * 1000.0,
    );
    this._timers.push(timer);
  },

  _modelFor: function (cid) {
    return (
      this._merged.get(cid) ||
      manager().getBuddyMessageNotifications().get(cid) ||
      manager().getQuestProgressNotifications().get(cid)
    );
  },

  /* endregion ROWS */

  /* region ACTIONS */

  onDismiss: function (e) {
    var model = this._modelFor(e.originalEvent.detail.cid);
    if (model) manager().dismissNotification(model);
  },

  onAcceptCTA: function (e) {
    var model = this._modelFor(e.originalEvent.detail.cid);
    if (model) manager().acceptCTAForNotification(model);
  },

  onMessageSelected: function (e) {
    var message = this._modelFor(e.originalEvent.detail.cid);
    if (message == null) return;
    NavigationManager.getInstance().toggleModalViewByClass(BuddiesShell, null);
    var buddiesShell = NavigationManager.getInstance().getModalView();
    buddiesShell.selectBuddy(message.get('fromId'));
  },

  onWatchReplay: function (e) {
    EventBus.getInstance().trigger(EVENTS.start_replay, {
      gameId: e.originalEvent.detail.gameId,
      userId: e.originalEvent.detail.userId,
    });
  },

  /* endregion ACTIONS */
});

// Expose the class either via CommonJS or the global object
module.exports = NotificationsShell;
