// pragma PKGS: nongame

/*
 * Marionette shell for <duelyst-watch> (docs/BACKBONE_REMOVAL_PLAN.md §3.3,
 * issue #63).
 *
 * The shell is what the navigation manager and transition.ts see: it carries
 * the screen's id and classes, animateIn/animateOut, the screen blur it holds
 * while shown, and the class identity App.showWatch tests. Its template is the
 * tag alone.
 *
 * Properties in, events out: the shell owns which tab is selected, loads the
 * live streams and each division's replays, and hands the component the
 * collections. It also owns the key-unit art: a Marionette view carries the
 * resource request machinery (package_manager.ts), so the shell loads each
 * replay row's cards and draws their cocos sprites when the component asks.
 * The error dialog stays Marionette (#12, D4).
 */

'use strict';

// side-effect require: registers <duelyst-watch>
require('../components/watch/watch');

var CONFIG = require('@duelyst/common/config');
var EventBus = require('@duelyst/common/eventbus');
var EVENTS = require('@duelyst/common/event_types');
var Analytics = require('@duelyst/common/analytics');
var Storage = require('@duelyst/common/storage');
var openUrl = require('@duelyst/common/openUrl');
var UtilsJavascript = require('@duelyst/common/utils/utils_javascript');
var SDK = require('@duelyst/sdk');
var RSX = require('@duelyst/data/resources');
var PKGS = require('@duelyst/data/packages');
var Scene = require('../../view/Scene');
var audio_engine = require('../../audio/audio_engine');
var Animations = require('../views/animations');
var NavigationManager = require('../managers/navigation_manager');
var StreamManager = require('../managers/stream_manager');
var GameDataManager = require('../managers/game_data_manager');
var UtilsUI = require('../utils_ui');
var DuelystBackbone = require('../extensions/duelyst_backbone');
var ErrorDialogItemView = require('../views/item/error_dialog');

var WATCHED_GAME_IDS = 'watched_game_ids';
var MAX_WATCHED_GAME_IDS = 100;

var ART = {
  profileIcon: function (portraitId) {
    var icon = SDK.CosmeticsFactory.profileIconForIdentifier(portraitId);
    return icon && icon.img;
  },
  generalPortrait: function (generalId) {
    var generalCard = SDK.GameSession.getCardCaches().getCardById(generalId);
    var portraitHexResource = generalCard && generalCard.getPortraitHexResource();
    return portraitHexResource && portraitHexResource.img;
  },
};

function gamesUrlForDivision(division) {
  return process.env.API_URL + '/api/me/games/watchable/' + division;
}

function requestIdForGame(gameId) {
  return 'watch_game_' + gameId;
}

var WatchShell = Backbone.Marionette.ItemView.extend({
  id: 'app_watch',
  className: 'modal duelyst-modal',

  template: function () {
    return '<duelyst-watch></duelyst-watch>';
  },

  events: {
    'watch-select': 'onWatchSelect',
    'replay-watch': 'onReplayWatch',
    'stream-open': 'onStreamOpen',
    'game-render': 'onGameRender',
  },

  animateIn: Animations.fadeIn,
  animateOut: Animations.fadeOut,

  _screenBlurId: null,
  _previousBlurProgramKey: null,
  _selectedType: null,
  _selectedDivision: null,
  _gamesCollection: null,
  _loading: false,
  // game id -> the sprite elements its row last rendered, redrawn on resize
  _unitsByGameId: null,

  initialize: function () {
    this._unitsByGameId = {};
  },

  _watchEl: function () {
    return this.el.querySelector('duelyst-watch');
  },

  // push the shell's state into the component
  _sync: function () {
    var watch = this._watchEl();
    if (watch == null) return;
    watch.selectedType = this._selectedType;
    watch.selectedDivision = this._selectedDivision;
    watch.loading = this._loading;
    watch.games = this._gamesCollection;
  },

  onRender: function () {
    var streams = StreamManager.getInstance().liveStreamCollection;
    var watch = this._watchEl();
    watch.art = ART;
    watch.streams = streams;
    watch.liveAvailable = streams.length > 0;
    watch.readGameIds = Storage.get(WATCHED_GAME_IDS) || [];

    if (streams.length > 0) {
      this.setSelectedWatchType('live');
    } else {
      // the replays tab and bronze are what the screen opens on: no tab sound
      this._selectedType = 'replays';
      this._selectedDivision = 'bronze';
      this.showSelectedDivision();
    }
  },

  onShow: function () {
    var fx = Scene.getInstance().getFX();
    this._previousBlurProgramKey = fx.surfaceBlurShaderProgramKey;
    if (this._screenBlurId == null) {
      this._screenBlurId = UtilsJavascript.generateIncrementalId();
    }
    fx.screenBlurShaderProgramKey = 'BlurFullScreenMega';
    fx.requestBlurScreen(this._screenBlurId);

    this.listenTo(EventBus.getInstance(), EVENTS.resize, this.onResize);
  },

  onPrepareForDestroy: function () {
    var fx = Scene.getInstance().getFX();
    fx.screenBlurShaderProgramKey = this._previousBlurProgramKey;
    fx.requestUnblurScreen(this._screenBlurId);
  },

  onDestroy: function () {
    if (this._gamesCollection != null) {
      this._gamesCollection.off();
      this._gamesCollection = null;
    }
    this._unitsByGameId = {};
  },

  // the sprites are sized from CONFIG.globalScale: draw them again
  onResize: function () {
    Object.keys(this._unitsByGameId).forEach(
      function (gameId) {
        if (this.getAreResourcesValid(requestIdForGame(gameId))) {
          this._drawUnits(this._unitsByGameId[gameId]);
        }
      }.bind(this),
    );
  },

  /* region TABS */

  _playTabSound: function () {
    audio_engine
      .current()
      .play_effect_for_interaction(RSX.sfx_ui_tab_in.audio, CONFIG.SELECT_SFX_PRIORITY);
  },

  onWatchSelect: function (e) {
    var detail = e.originalEvent.detail;
    if (detail.division != null) {
      this.setSelectedDivision(detail.division);
    } else {
      this.setSelectedWatchType(detail.type);
    }
  },

  setSelectedWatchType: function (type) {
    if (type === this._selectedType) return;
    this._selectedType = type;
    this._playTabSound();
    if (type === 'live') {
      this._selectedDivision = null;
      this._loading = true;
      this._sync();
      StreamManager.getInstance()
        .loadStreamStatusFromTwitch()
        .then(
          function () {
            if (this.isDestroyed || this._selectedType !== 'live') return;
            this._loading = false;
            this._sync();
          }.bind(this),
        );
    } else if (type === 'replays') {
      this.setSelectedDivision('bronze');
    }
  },

  setSelectedDivision: function (division) {
    if (division === this._selectedDivision) return;
    this._selectedDivision = division;
    this._selectedType = 'replays';
    this._playTabSound();
    this.showSelectedDivision();
  },

  showSelectedDivision: function () {
    var url = gamesUrlForDivision(this._selectedDivision || 'bronze');
    if (this._gamesCollection == null || this._gamesCollection.url !== url) {
      this._releaseGames();
      this._gamesCollection = new DuelystBackbone.Collection();
      this._gamesCollection.url = url;
      this._gamesCollection.fetch();
    }

    var games = this._gamesCollection;
    this._loading = !games.isSynced;
    this._sync();
    games
      .onSyncOrReady()
      .then(
        function () {
          // a later tab may have replaced this collection meanwhile
          if (this.isDestroyed || games !== this._gamesCollection) return;
          if (this._selectedType !== 'replays') return;
          this._loading = false;
          this._sync();
        }.bind(this),
      )
      .catch(function (error) {
        NavigationManager.getInstance().showDialogView(
          new ErrorDialogItemView({ title: error.message }),
        );
      });
  },

  /* endregion TABS */

  /* region REPLAYS */

  // drop the art of the replays leaving the screen
  _releaseGames: function () {
    if (this._gamesCollection == null) return;
    this._gamesCollection.each(
      function (model) {
        this.removeResourceRequestById(requestIdForGame(model.id));
        delete this._unitsByGameId[model.id];
      }.bind(this),
    );
    this._gamesCollection.off();
  },

  onGameRender: function (e) {
    var detail = e.originalEvent.detail;
    var model = this._gamesCollection && this._gamesCollection.get(detail.id);
    if (model == null) return;

    this._unitsByGameId[detail.id] = detail.units;

    var keyCardIds = [].concat(
      model.get('player_1_key_cards') || [],
      model.get('player_2_key_cards') || [],
    );
    var resources = [];
    for (var i = 0; i < keyCardIds.length; i++) {
      var cardPkgId = PKGS.getCardInspectPkgIdentifier(keyCardIds[i]);
      resources = resources.concat(PKGS.getPkgForIdentifier(cardPkgId));
    }
    if (resources.length === 0) {
      this._drawUnits(detail.units);
      detail.done();
      return;
    }

    var requestId = requestIdForGame(detail.id);
    this.addResourceRequest(requestId, null, resources);
    this.whenResourcesReady(requestId).then(
      function (loadedRequestId) {
        if (this.isDestroyed || !this.getAreResourcesValid(loadedRequestId)) return;
        this._drawUnits(detail.units);
        detail.done();
      }.bind(this),
    );
  },

  _drawUnits: function (units) {
    var gameDataManager = GameDataManager.getInstance();
    for (var i = 0; i < units.length; i++) {
      var cardModel = gameDataManager.getCardModelById(units[i].cardId);
      var card = cardModel && cardModel.get('card');
      var animResource = card && card.getAnimResource();
      if (animResource == null) continue;
      var spriteData = UtilsUI.getCocosSpriteData(
        card instanceof SDK.Unit ? animResource.breathing : animResource.idle,
      );
      UtilsUI.showCocosSprite($(units[i].el), null, spriteData, null, false, card, null, null, 1.0);
    }
  },

  onReplayWatch: function (e) {
    var detail = e.originalEvent.detail;
    var model = this._gamesCollection && this._gamesCollection.get(detail.gameId);
    if (model == null) return;

    var readIds = Storage.get(WATCHED_GAME_IDS) || [];
    if (readIds.indexOf(model.id) === -1) {
      readIds.push(model.id);
      Storage.set(WATCHED_GAME_IDS, readIds.slice(-MAX_WATCHED_GAME_IDS));
    }

    Analytics.track(
      'watched replay',
      {
        category: Analytics.EventCategory.Watch,
        division_id: model.get('division'),
        game_id: model.id,
      },
      {
        labelKey: 'division',
      },
    );

    EventBus.getInstance().trigger(EVENTS.start_replay, {
      gameId: model.id,
      userId: detail.playerId || model.get('winner_id'),
      promotedDivisionName: model.get('division'),
    });
  },

  /* endregion REPLAYS */

  onStreamOpen: function (e) {
    var detail = e.originalEvent.detail;
    openUrl(detail.url);
    Analytics.track(
      'watch stream',
      {
        category: Analytics.EventCategory.Watch,
        streamer_name: detail.name || '',
      },
      {
        labelKey: 'streamer_name',
      },
    );
  },
});

module.exports = WatchShell;
