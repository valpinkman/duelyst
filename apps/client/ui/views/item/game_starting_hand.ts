'use strict';

var EVENTS = require('@duelyst/common/event_types');
var SDK = require('@duelyst/sdk');
const NetworkManager = require('apps/client/networkManager');
var Animations = require('apps/client/ui/views/animations');
var GameStartingHandTemplate = require('apps/client/ui/templates/item/game_starting_hand.hbs');

var GameStartingHandItemView = Backbone.Marionette.ItemView.extend({
  id: 'app-game-starting-hand',
  className: 'modal duelyst-modal',

  template: GameStartingHandTemplate,

  ui: {
    $opponentConnected: '.opponent-connected',
    $opponentConnecting: '.opponent-connecting',
  },

  animateIn: Animations.fadeIn,
  animateOut: Animations.fadeOut,

  onRender: function () {
    if (
      !SDK.GameType.isMultiplayerGameType(SDK.GameSession.getInstance().getGameType()) ||
      SDK.GameSession.getInstance().getIsSpectateMode()
    ) {
      // in non-multiplayer game, no need to show opponent connection status
      this.ui.$opponentConnecting.hide();
      this.ui.$opponentConnected.hide();
    }
    this._updateOpponentConnection();
  },

  onShow: function () {
    this.listenTo(
      NetworkManager.getInstance().getEventBus(),
      EVENTS.opponent_connection_status_changed,
      this._updateOpponentConnection,
    );
  },

  _updateOpponentConnection: function () {
    if (NetworkManager.getInstance().isOpponentConnected) {
      this.ui.$opponentConnecting.removeClass('active');
      this.ui.$opponentConnected.addClass('active');
    } else {
      this.ui.$opponentConnecting.addClass('active');
      this.ui.$opponentConnected.removeClass('active');
    }
  },
});

// Expose the class either via CommonJS or the global object
module.exports = GameStartingHandItemView;
