// pragma PKGS: alwaysloaded

// See: https://coderwall.com/p/myzvmg for why managers are created this way

var _ChatManager: Record<string, any> = {};
_ChatManager.instance = null;
_ChatManager.getInstance = function () {
  if (this.instance == null) {
    this.instance = new ChatManager();
  }
  return this.instance;
};
_ChatManager.current = _ChatManager.getInstance;

// expose static status properties
_ChatManager.STATUS_LOADING = 'loading';
_ChatManager.STATUS_ONLINE = 'online';
_ChatManager.STATUS_AWAY = 'away';
_ChatManager.STATUS_QUEUE = 'queue';
_ChatManager.STATUS_GAME = 'game';
_ChatManager.STATUS_WATCHING = 'watching';
_ChatManager.STATUS_CHALLENGE = 'challenge';

module.exports = _ChatManager;

var CONFIG = require('@duelyst/common/config');
var {
  child,
  dbRef,
  off,
  onChildAdded,
  onDisconnect,
  onValue,
  remove,
  serverTimestamp,
  set,
} = require('../../firebase');
var Logger = require('@duelyst/common/logger');
var EventBus = require('@duelyst/common/eventbus');
var EVENTS = require('@duelyst/common/event_types');
var Analytics = require('@duelyst/common/analytics');
var UtilsFirebase = require('@duelyst/common/utils/utils_firebase');
var audio_engine = require('../../audio/audio_engine');
var Conversations = require('../collections/conversations');
var BuddiesCollection = require('../collections/buddies');
var Conversation = require('../models/conversation');
var NotificationModel = require('../models/notification');
var RSX = require('@duelyst/data/resources');
var NotificationsManager = require('./notifications_manager');
var GamesManager = require('./games_manager');
var ProfileManager = require('./profile_manager');
var Manager = require('./manager');

var ChatManager = Manager.extend({
  // firebase refs
  userConversationsIndexRef: null,
  conversations: null,
  invitesListRef: null,
  _connectionRef: null,
  _presenceRef: null,
  _stopConnectionListener: null,
  _stopInvitesListener: null,

  // backbone models / collections
  buddiesCollection: null,

  // state
  connected: false,
  _status: _ChatManager.STATUS_LOADING,

  initialize: function (options) {
    Manager.prototype.initialize.call(this);
  },

  /* region CONNECT */

  onBeforeConnect: function () {
    const _self = this;
    Manager.prototype.onBeforeConnect.call(this);

    ProfileManager.getInstance()
      .onReady()
      .then(function () {
        var userId = ProfileManager.getInstance().get('id');
        var username = ProfileManager.getInstance().get('username');
        // configure presence
        _self.conversations = new Conversations();
        _self._presenceRef = dbRef('users/' + userId + '/presence');
        _self._connectionRef = dbRef('.info/connected');
        _self._stopConnectionListener = onValue(
          _self._connectionRef,
          function (snapshot) {
            if (snapshot.val()) {
              // var sessionRef = this._presenceRef.push();
              set(child(this._presenceRef, 'status'), this._status);
              set(child(this._presenceRef, 'username'), username);

              onDisconnect(this._presenceRef).update({
                ended: serverTimestamp(),
                status: 'offline',
              });

              set(child(this._presenceRef, 'began'), serverTimestamp());
            }
          }.bind(_self),
        );
        _self.userConversationsIndexRef = dbRef('chat/users/' + userId + '/conversations');
        _self.invitesListRef = dbRef('chat/users/' + userId + '/buddy-invites');

        _self.buddiesCollection = new BuddiesCollection(null, {
          firebase: process.env.FIREBASE_URL + 'users/' + userId + '/buddies',
        });

        _self._stopInvitesListener = onChildAdded(
          _self.invitesListRef,
          _self._onBuddyInviteReceived.bind(_self),
        );

        _self.onReady().then(
          function () {
            Logger.module('UI').log('ChatManager::onReady');
            this.buddiesCollection.each(this._onBuddyAdded.bind(this));
            this.listenTo(this.buddiesCollection, 'add', this._onBuddyAdded);
            this.listenTo(this.buddiesCollection, 'remove', this._onBuddyRemoved);
            this.listenTo(this.conversations, 'message', this.onReceivedMessage);
            this.listenTo(EventBus.getInstance(), EVENTS.pointer_down, this.onResetAwayStatus);
            this.listenTo(EventBus.getInstance(), EVENTS.pointer_up, this.onResetAwayStatus);
            this.listenTo(EventBus.getInstance(), EVENTS.pointer_move, this.onResetAwayStatus);
          }.bind(_self),
        );

        _self._markAsReadyWhenModelsAndCollectionsSynced([_self.buddiesCollection]);

        /*
      this.userConversationsIndexRef.startAt(Date.now()).on("child_added",function(snapshot) { // startAt(Firebase.ServerValue.TIMESTAMP)
      Logger.module("UI").log("chat conversation started");
      this.onConversationStarted(snapshot.val());
      }.bind(this));

      this.userConversationsIndexRef.on("child_changed",function(snapshot) { // startAt(Firebase.ServerValue.TIMESTAMP)
      Logger.module("UI").log("chat conversation continued");
      this.onConversationStarted(snapshot.val());
      }.bind(this));
      */
      });
  },

  /*
   Usually called on logout, this function disconnects all firebase listeners
   */
  onBeforeDisconnect: function () {
    Manager.prototype.onBeforeDisconnect.call(this);
    this.conversations = null;
    if (this._stopInvitesListener) {
      this._stopInvitesListener();
      this._stopInvitesListener = null;
    }
    if (this._presenceRef) {
      // TODO: if a user account is destroyed while they are online, this will still write to FIREBASE
      set(child(this._presenceRef, 'ended'), serverTimestamp());
      set(child(this._presenceRef, 'status'), 'offline');
      off(this._presenceRef);
      onDisconnect(this._presenceRef).cancel(); // cancel any queued disconnection events from this reference
    }
    if (this._stopConnectionListener) {
      this._stopConnectionListener();
      this._stopConnectionListener = null;
    }
  },

  /* endregion CONNECT */

  /* region BUDDIES */

  inviteBuddy: function (buddyUsername) {
    var promise = new Promise(
      function (resolve, reject) {
        buddyUsername = buddyUsername.toLowerCase();
        onValue(
          dbRef('username-index/' + buddyUsername),
          function (snapshot) {
            // check if users exists in some global username based index by using "value" check
            var buddyId = snapshot.val();

            // null values mean no user exists for that username, so reject
            if (buddyId === null) {
              reject(new Error('User not found!'));
              return;
            }

            if (ProfileManager.getInstance().get('id') == buddyId) {
              reject(new Error("Can't add yourself!"));
              return;
            }

            if (this.buddiesCollection.get(buddyId)) {
              reject(new Error('Buddy already in list!'));
              return;
            }

            var inviteData = {
              fromUserId: ProfileManager.getInstance().get('id'),
              fromName: ProfileManager.getInstance().get('username'),
              sentAt: new Date(),
            };

            var buddyInvites = dbRef('chat/users/' + buddyId + '/buddy-invites');
            var inviteRef = child(buddyInvites, ProfileManager.getInstance().get('id'));
            set(inviteRef, inviteData);

            // analytics call
            Analytics.track('buddy invite sent', {
              category: Analytics.EventCategory.Chat,
            });

            // resolve successfully
            resolve();
          }.bind(this),
          { onlyOnce: true },
        );
      }.bind(this),
    );

    return promise;
  },

  removeBuddy: function (buddyModel) {
    var myBuddiesRef = dbRef('users/' + ProfileManager.getInstance().get('id') + '/buddies');
    remove(child(myBuddiesRef, buddyModel.userId));

    var theirBuddiesRef = dbRef('users/' + buddyModel.userId + '/buddies');
    remove(child(theirBuddiesRef, ProfileManager.getInstance().get('id')));
  },

  acceptBuddyInvite: function (inviteData) {
    // TODO: this needs to be secured
    var myBuddiesRef = dbRef('users/' + ProfileManager.getInstance().get('id') + '/buddies');
    set(child(myBuddiesRef, inviteData.fromUserId), {
      createdAt: serverTimestamp(),
    });

    // here
    var theirBuddiesRef = dbRef('users/' + inviteData.fromUserId + '/buddies');
    set(child(theirBuddiesRef, ProfileManager.getInstance().get('id')), {
      createdAt: serverTimestamp(),
    });

    // analytics call
    Analytics.track('buddy invite accepted', {
      category: Analytics.EventCategory.Chat,
    });
  },

  _onBuddyInviteReceived: function (snapshot) {
    if (ProfileManager.getInstance().profile.get('doNotDisturb')) {
      // defer rejection because this is a direct response to an event
      _.defer(function () {
        // v2's snapshot.ref() is a property from v3 on
        remove(snapshot.ref);
      });
    } else {
      // create a notification
      var notification = new NotificationModel({
        message: snapshot.val().fromName + ' wants to add you to their buddy list.',
        type: NotificationsManager.NOTIFICATION_BUDDY_INVITE,
        ctaTitle: 'Accept',
        data: snapshot.val(),
        firebaseRef: snapshot.ref,
      });

      // listen to changes to the notification, such as knowing that the CTA has been clicked or dismissed
      this.listenTo(
        notification,
        'cta_accept',
        function (model) {
          this.acceptBuddyInvite(model.get('data'));
          remove(notification.get('firebaseRef'));
          this.stopListening(notification);
        },
        this,
      );
      this.listenTo(
        notification,
        'dismiss',
        function (model) {
          remove(notification.get('firebaseRef'));
          this.stopListening(notification);
        },
        this,
      );

      // show the notification
      NotificationsManager.getInstance().showNotification(notification);

      // play notification sound
      audio_engine.current().play_effect(RSX.sfx_ui_notification.audio, false);
    }
  },

  _onBuddyAdded: function (model) {
    // start up the conversation now so it is ready
    this.startConversation(model.get('id'));
  },

  _onBuddyRemoved: function (model) {
    // stop the conversation between myself and removed buddy
    this.stopConversation(model.get('id'));
  },

  // Redefined below.
  /*
  getBuddiesCollection: function () {
    return this.buddies;
  },
  */

  /* endregion BUDDIES */

  /* region CONVERSATIONS */

  onReceivedMessage: function (messageModel) {
    // show latest message
    if (messageModel) {
      Logger.module('UI').log('ChatManager.onReceivedMessage', messageModel);
      var notification = new NotificationModel(
        _.extend(_.clone(messageModel.attributes), {
          type: NotificationsManager.NOTIFICATION_BUDDY_MESSAGE,
        }),
      );

      // show the notification
      NotificationsManager.getInstance().showNotification(notification);
    }
  },

  _onConversationStarted: function (conversationData) {
    var conversationModel = this.conversations.get(conversationData.id);

    if (!conversationModel) {
      // create conversation model
      conversationModel = new Conversation({
        id: conversationData.id,
        firebaseURL: process.env.FIREBASE_URL + '/chat/conversations/' + conversationData.id,
        userId: conversationData.userId,
      });
      this.conversations.add(conversationModel);
    }

    return conversationModel;
  },

  startConversation: function (userId) {
    var conversationId = this.getConversationId(userId, ProfileManager.getInstance().get('id'));
    return this._onConversationStarted({
      id: conversationId,
      userId: userId,
    });
  },

  stopConversation: function (userId) {
    var conversationId = this.getConversationId(userId, ProfileManager.getInstance().get('id'));
    var conversationModel = this.conversations.get(conversationId);
    if (conversationModel != null) {
      this.conversations.remove(conversationModel);
    }
  },

  setConversationAsRead: function (userId) {
    var conversationId = this.getConversationId(userId, ProfileManager.getInstance().get('id'));
    var conversationModel = this.conversations.get(conversationId);
    if (conversationModel) {
      // conversationModel._lastUnreadMessageAt = null;
      conversationModel.set('unread', false);
    }
  },

  getConversationId: function (userId1, userId2) {
    var id = userId1 < userId2 ? userId1 + ':' + userId2 : userId2 + ':' + userId1;
    return id;
  },

  /* endregion CONVERSATIONS */

  /* region STATUS */

  setStatus: function (status) {
    if (this._status !== status) {
      Logger.module('UI').log('ChatManager::setStatus -> ' + status);

      this._status = status;

      if (this._presenceRef) {
        set(child(this._presenceRef, 'status'), this._status);
      }

      this.trigger(EVENTS.status, this._status);
    }
  },

  getStatus: function () {
    return this._status;
  },

  getStatusLoading: function () {
    return this._status === _ChatManager.STATUS_LOADING;
  },

  getStatusOnline: function () {
    return this._status === _ChatManager.STATUS_ONLINE;
  },

  getStatusAway: function () {
    return this._status === _ChatManager.STATUS_AWAY;
  },

  getStatusQueue: function () {
    return this._status === _ChatManager.STATUS_QUEUE;
  },

  getStatusGame: function () {
    return this._status === _ChatManager.STATUS_GAME;
  },

  getStatusWatching: function () {
    return this._status === _ChatManager.STATUS_WATCHING;
  },

  getStatusChallenge: function () {
    return this._status === _ChatManager.STATUS_CHALLENGE;
  },

  getStatusIsInBattle: function () {
    return this.getStatusGame() || this.getStatusWatching() || this.getStatusChallenge();
  },

  getIsStatusValidForBuddyGameInvite: function (status) {
    return status === _ChatManager.STATUS_ONLINE || status === _ChatManager.STATUS_AWAY;
  },

  getIsMyStatusValidForBuddyGameInvite: function () {
    return this.getIsStatusValidForBuddyGameInvite(this._status);
  },

  getIsMyStatusValidForSpectatingBuddyGame: function () {
    return this._status === _ChatManager.STATUS_ONLINE || this._status === _ChatManager.STATUS_AWAY;
  },

  onResetAwayStatus: function () {
    if (this.getStatusAway()) {
      this.setStatus(_ChatManager.STATUS_ONLINE);
    } else {
      this.startAwayStatusCheck();
    }
  },

  startAwayStatusCheck: function () {
    if (!this._setAwayStatus) {
      this._setAwayStatus = _.debounce(
        function () {
          if (this.connected && this.getStatusOnline()) this.setStatus(_ChatManager.STATUS_AWAY);
          else this._setAwayStatus();
        }.bind(this),
        60000,
      );
    }
    this._setAwayStatus();
  },

  /* endregion STATUS */

  getBuddiesCollection: function () {
    return this.buddiesCollection;
  },

  getLastPlayedOpponentUsername: function () {
    var lastGame = GamesManager.getInstance().playerGames.last();
    if (lastGame) {
      return lastGame.get('opponent_username');
    }
  },

  setRankInStatus: function (rank) {
    if (this._presenceRef) set(child(this._presenceRef, 'rank'), rank);
  },
});
