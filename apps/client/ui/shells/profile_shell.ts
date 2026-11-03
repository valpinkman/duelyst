// pragma PKGS: nongame

/*
 * Marionette shell for <duelyst-profile> (docs/BACKBONE_REMOVAL_PLAN.md §3.3,
 * issue #80).
 *
 * The shell is what the navigation manager and transition.ts see: it carries
 * the screen's id and classes, animateIn/animateOut, the gradient colour map
 * it holds while shown, and the class identity the utility menu and the buddy
 * list pass to toggleModalViewByClass(). Its template is the tag alone.
 *
 * Properties in, events out: the shell owns which tab is selected, fetches
 * each tab's data from the API once, shapes it with the SDK (what the old tab
 * views did in serializeModel) and hands the component plain data. Replays,
 * sounds and the dialogs it opens stay here; the dialogs stay Marionette
 * (#12, D4).
 */

'use strict';

// side-effect require: registers <duelyst-profile>
require('../components/profile/profile');

var Logger = require('@duelyst/common/logger');
var CONFIG = require('@duelyst/common/config');
var EventBus = require('@duelyst/common/eventbus');
var EVENTS = require('@duelyst/common/event_types');
var generatePushID = require('@duelyst/common/generate_push_id');
var { requestJson } = require('@duelyst/common/request');
var SDK = require('@duelyst/sdk');
var RSX = require('@duelyst/data/resources');
var moment = require('moment');
var semver = require('semver');
var Scene = require('../../view/Scene');
var audio_engine = require('../../audio/audio_engine');
var Animations = require('../views/animations');
var NavigationManager = require('../managers/navigation_manager');
var GamesManager = require('../managers/games_manager');
var ChatManager = require('../managers/chat_manager');
var ProfileManager = require('../managers/profile_manager');
var DuelystBackbone = require('../extensions/duelyst_backbone');
var ChangePortraitItemView = require('../views/item/change_portrait');
var ChangeUsernameItemView = require('../views/item/change_username');
var ErrorDialogItemView = require('../views/item/error_dialog');
var CopyReplayDialogView = require('../views/item/copy_replay_dialog');

var BASE_TAB = 'summary';

var ART = {
  profileIcon: function (portraitId) {
    var icon = SDK.CosmeticsFactory.profileIconForIdentifier(portraitId);
    return icon && icon.img;
  },
  divisionClass: function (rank) {
    return SDK.RankFactory.rankedDivisionAssetNameForRank(rank);
  },
  divisionName: function (rank) {
    return SDK.RankFactory.rankedDivisionNameForRank(rank);
  },
};

// a model or collection fetched from the API, resolved once it has synced
function fetched(Type, url) {
  var item = new Type();
  item.url = url;
  item.fetch();
  return item;
}

// the tab views mutated what they rendered: shape a copy
function copy(data) {
  return JSON.parse(JSON.stringify(data));
}

/* region DATA */

function shapeSummary(data) {
  if (!_.isNumber(data.currentSeasonRank.rank)) {
    data.currentSeasonRank.rank = 30;
  }
  if (!_.isNumber(data.currentSeasonRank.win_streak)) {
    data.currentSeasonRank.win_streak = 0;
  }
  if (!_.isNumber(data.currentSeasonGameCounterModel.win_count)) {
    data.currentSeasonGameCounterModel.win_count = 0;
  }
  data.currentSeasonRank.rank_progress_percent = Math.ceil(
    (100 * (30 - data.currentSeasonRank.rank)) / 30,
  );
  data.currentSeasonRank.season_label = moment
    .utc(data.currentSeasonRank.starting_at)
    .format('MMMM YYYY');

  if (data.currentSeasonLadderPositionModel == null) {
    data.currentSeasonLadderPositionModel = {};
  }

  if (!_.isNumber(data.topRank.rank)) {
    data.topRank.rank = 30;
  }
  if (!_.isNumber(data.topRank.top_win_streak)) {
    data.topRank.top_win_streak = 0;
  }
  if (!_.isNumber(data.topRank.win_count)) {
    data.topRank.win_count = 0;
  }
  if (!_.isNumber(data.ranked.win_count)) {
    data.ranked.win_count = 0;
  }
  data.topRank.rank_progress_percent = Math.ceil((100 * (30 - data.topRank.top_rank)) / 30);
  data.topRank.season_label = moment.utc(data.topRank.top_rank_starting_at).format('MMMM YYYY');

  if (!_.isNumber(data.topRank.top_rank_ladder_position)) {
    data.topRank.top_rank_ladder_position = null;
  }

  if (!_.isNumber(data.run.win_count)) {
    data.run.win_count = 0;
  }
  data.run.gauntlet_progress_percent = Math.ceil((100 * data.run.win_count) / 12);
  data.run.blade_id = Math.max(1, Math.min(9, data.run.win_count));
  if (!_.isNumber(data.gauntlet.win_count)) {
    data.gauntlet.win_count = 0;
  }

  return data;
}

function nextRewardDescription(factionId, rewardData) {
  var description;
  if (rewardData.cards) {
    var isPrismaticReward = false;
    var isGeneralReward = false;
    var isNeutralReward = false;

    // TODO: this only accounts for first card reward
    for (var j = 0, jl = rewardData.cards.length; j < jl; j++) {
      var rewardCard = SDK.CardFactory.cardForIdentifier(
        rewardData.cards[j].id,
        SDK.GameSession.getInstance(),
      );
      if (rewardCard) {
        if (rewardCard instanceof SDK.Entity && rewardCard.getIsGeneral()) {
          isGeneralReward = true;
        }
        if (rewardCard.getFactionId() === SDK.Factions.Neutral) {
          isNeutralReward = true;
        }
        if (SDK.Cards.getIsPrismaticCardId(rewardCard.getId())) {
          isPrismaticReward = true;
        }
        break;
      }
    }

    if (isGeneralReward) {
      description =
        '1 x ' +
        (isNeutralReward ? 'Neutral' : 'Faction') +
        (isPrismaticReward ? ' Prismatic ' : ' Alternate ') +
        'General';
    } else {
      description =
        CONFIG.MAX_DECK_DUPLICATES +
        ' x ' +
        (isNeutralReward ? 'Neutral' : 'Faction') +
        (isPrismaticReward ? ' Prismatic ' : ' Basic ') +
        'Card';
    }
  }
  if (rewardData.booster_packs) {
    description = rewardData.booster_packs + ' Spirit Orb(s)';
  }
  if (rewardData.emotes) {
    description = 'Faction Emote';
  }
  return description;
}

function shapeFactionLevels(data) {
  // ensure all factions are present
  var playableFactions = SDK.FactionFactory.getAllPlayableFactions();
  if (Object.keys(data.factionProgression).length < playableFactions.length) {
    for (var i = 0, il = playableFactions.length; i < il; i++) {
      var factionId = playableFactions[i].id;
      if (data.factionProgression[factionId] == null) {
        data.factionProgression[factionId] = { faction_id: factionId };
      }
    }
  }

  _.each(data.factionProgression, function (v) {
    var faction = SDK.FactionFactory.factionForIdentifier(v.faction_id);
    v.faction_name = faction.name;
    v.faction_dev_name = faction.devName;

    if (v.level == null) {
      v.level = 0;
    }
    if (v.xp == null) {
      v.xp = 0;
    }

    // level number users should see is +1 from actual 0-indexed level
    v.level_for_user = v.level + 1;

    var levelXPProgress = v.xp - SDK.FactionProgression.totalXPForLevel(v.level);
    var nextLevel = Math.min(v.level + 1, SDK.FactionProgression.maxLevel);
    v.progress_percent = Math.ceil(
      (100 * levelXPProgress) / SDK.FactionProgression.deltaXPForLevel(nextLevel),
    );

    for (var level = nextLevel; level < SDK.FactionProgression.maxLevel; level++) {
      var rewardData = SDK.FactionProgression.rewardDataForLevel(v.faction_id, level);
      if (rewardData) {
        v.next_reward_description = nextRewardDescription(v.faction_id, rewardData);
        // level number users should see is +1 from actual 0-indexed level
        v.next_reward_level = level + 1;
        break;
      }
    }
  });
  return data;
}

function shapeRankHistory(data) {
  var pastTwelveSeasons = [];
  for (var i = 0; i < 12; i++) {
    var startingAt = moment.utc().subtract(i, 'months').startOf('month');
    var rank = null;
    if (startingAt.valueOf() == data.currentSeasonRankModel.starting_at) {
      rank = data.currentSeasonRankModel;
    } else {
      rank = _.find(data.rankHistory, function (row) {
        return row.starting_at === startingAt.valueOf();
      });
      // Default to displaying top_rank for past seasons
      if (rank != null && rank.top_rank != null) {
        rank.rank = rank.top_rank;
      }
    }
    var gameCounter = _.find(data.rankHistoryGameCounters, function (row) {
      return row.season_starting_at === startingAt.valueOf();
    });

    if (!gameCounter) gameCounter = { game_count: 0, win_count: 0, win_streak: 0 };
    if (!rank) rank = { rank: null, starting_at: startingAt.valueOf() };

    _.extend(rank, gameCounter);
    pastTwelveSeasons.unshift(rank);
  }
  data.rankHistory = pastTwelveSeasons;
  return data;
}

function shapeMatchHistory(data) {
  _.each(data.matchHistory, function (row) {
    if (row.game_type == SDK.GameType.SinglePlayer) {
      row.game_type = 'practice';
    } else if (row.game_type == SDK.GameType.BossBattle) {
      row.game_type = 'boss battle';
    } else if (row.game_type == SDK.GameType.Casual) {
      row.game_type = 'unranked';
    }
    var faction = SDK.FactionFactory.factionForIdentifier(row.faction_id);
    row.faction_name = faction.name;
    row.faction_dev_name = faction.devName;
    var diff = semver.diff(process.env.VERSION, row.game_version);
    row.replay_available = !diff || (diff != 'major' && diff != 'minor');
    row.replay_shareble = row.user_id === ProfileManager.getInstance().get('id');

    row.is_pending = row.is_winner == null && row.is_draw == null;
  });
  return data;
}

/* endregion DATA */

var ProfileShell = Backbone.Marionette.ItemView.extend({
  id: 'app-profile',
  className: 'modal duelyst-modal',

  template: function () {
    return '<duelyst-profile></duelyst-profile>';
  },

  events: {
    'profile-tab': 'onProfileTab',
    'portrait-change': 'onChangePortraitClick',
    'username-change': 'onChangeUsernameClicked',
    'replay-watch': 'onReplayWatch',
    'replay-share': 'onReplayShare',
    'match-history-next': 'onMatchHistoryPageNext',
  },

  animateIn: Animations.fadeIn,
  animateOut: Animations.fadeOut,

  _requestId: null,
  _apiEndpointUrl: null,
  // tab (or match_history_<page>) -> the shaped data the component renders
  _cache: null,
  _selectedTab: null,
  _gamesHistoryPage: 0,
  _content: null,

  initialize: function () {
    // generate unique id for requests
    this._requestId = generatePushID();
    this._cache = {};

    if (this.model.userId) {
      this._apiEndpointUrl = process.env.API_URL + '/api/users/' + this.model.userId;
    } else {
      this._apiEndpointUrl = process.env.API_URL + '/api/me';
    }
  },

  _profileEl: function () {
    return this.el.querySelector('duelyst-profile');
  },

  // push the shell's state into the component
  _sync: function () {
    var profile = this._profileEl();
    if (profile == null) return;
    profile.selectedTab = this._selectedTab;
    profile.content = this._content;
    profile.online = ChatManager.getInstance().getStatusOnline();
  },

  onRender: function () {
    var profile = this._profileEl();
    var buddy = this.model.userId != null;
    profile.art = ART;
    profile.buddy = buddy;
    profile.seasonCount = buddy
      ? null
      : Math.floor(
          moment.duration(moment().utc().valueOf() - this.model.get('created_at')).asMonths(),
        );
    profile.model = this.model;
    this._sync();
  },

  onShow: function () {
    // change gradient color mapping
    Scene.getInstance().getFX().showGradientColorMap(
      this._requestId,
      CONFIG.ANIMATE_FAST_DURATION,
      {
        r: 194,
        g: 203,
        b: 220,
        a: 255,
      },
      {
        r: 36,
        g: 51,
        b: 65,
        a: 255,
      },
    );

    // start at default tab
    this.setSelectedTab(BASE_TAB);
  },

  onPrepareForDestroy: function () {
    // reset gradient color mapping
    Scene.getInstance()
      .getFX()
      .clearGradientColorMap(this._requestId, CONFIG.ANIMATE_MEDIUM_DURATION);
  },

  /* region HEADER */

  onChangePortraitClick: function () {
    NavigationManager.getInstance().showDialogView(
      new ChangePortraitItemView({ model: new Backbone.Model() }),
    );
  },

  // the component re-reads the model on change; render again on success too,
  // as the old layout re-read the username then
  onChangeUsernameClicked: function () {
    var changeUsernameItemView = new ChangeUsernameItemView({
      model: ProfileManager.getInstance().profile,
    });
    changeUsernameItemView.listenTo(
      changeUsernameItemView,
      'success',
      function () {
        var profile = this._profileEl();
        if (profile != null) profile.requestUpdate();
      }.bind(this),
    );
    NavigationManager.getInstance().showDialogView(changeUsernameItemView);
  },

  /* endregion HEADER */

  /* region TABS */

  onProfileTab: function (e) {
    this.setSelectedTab(e.originalEvent.detail.tab);
  },

  setSelectedTab: function (tab) {
    if (tab === this._selectedTab) return;
    this._gamesHistoryPage = 0;
    this._selectedTab = tab;
    audio_engine
      .current()
      .play_effect_for_interaction(RSX.sfx_ui_tab_in.audio, CONFIG.SELECT_SFX_PRIORITY);
    this.showSelectedTab();
  },

  // the cache key a tab's data is stored and looked up under
  _cacheKey: function () {
    return this._selectedTab === 'match_history'
      ? 'match_history_' + this._gamesHistoryPage
      : this._selectedTab;
  },

  showSelectedTab: function () {
    var tab = this._selectedTab;
    var key = this._cacheKey();
    if (this._cache[key] != null) {
      this._content = { tab: tab, data: this._cache[key] };
      this._sync();
      return;
    }

    var load = this['_load_' + tab];
    if (load == null) return;
    this._content = { tab: tab, loading: true };
    this._sync();

    load
      .call(this)
      .then(
        function (data) {
          this._cache[key] = data;
          // the player may have left this tab (or page) meanwhile
          if (this.isDestroyed || this._cacheKey() !== key) return;
          this._content = { tab: tab, data: data };
          this._sync();
        }.bind(this),
      )
      .catch(
        function (error) {
          var errorMessage = error ? error.message : '';
          Logger.module('UI').error('Error loading profile ' + tab + ' data', errorMessage);
          if (this.isDestroyed || this._cacheKey() !== key) return;
          this._content = { tab: tab, error: errorMessage };
          this._sync();
        }.bind(this),
      );
  },

  _currentSeasonRank: function () {
    if (this.model.userId) {
      return fetched(DuelystBackbone.Model, this._apiEndpointUrl + '/rank/current');
    }
    return GamesManager.getInstance().rankingModel;
  },

  _load_summary: function () {
    var url = this._apiEndpointUrl;
    var ranked = fetched(DuelystBackbone.Model, url + '/stats/games/ranked');
    var gauntlet = fetched(DuelystBackbone.Model, url + '/stats/games/gauntlet');
    var run = fetched(DuelystBackbone.Model, url + '/stats/gauntlet_runs/top/win_count');
    var topRank = fetched(DuelystBackbone.Model, url + '/rank/top');
    var divisionStats = fetched(DuelystBackbone.Model, url + '/rank/division_stats');
    var factionProgression = fetched(DuelystBackbone.Model, url + '/faction_progression');
    var ribbons = fetched(DuelystBackbone.Collection, url + '/ribbons');
    var currentSeasonRank = this._currentSeasonRank();
    var ladderPosition = fetched(DuelystBackbone.Model, url + '/rank/current_ladder_position');
    var seasonGameCounter = fetched(
      DuelystBackbone.Model,
      url + '/rank/history/' + moment().utc().startOf('month').format('YYYY-MM') + '/game_counter',
    );

    return Promise.all([
      ranked.onSyncOrReady(),
      gauntlet.onSyncOrReady(),
      run.onSyncOrReady(),
      topRank.onSyncOrReady(),
      divisionStats.onSyncOrReady(),
      factionProgression.onSyncOrReady(),
      ribbons.onSyncOrReady(),
      currentSeasonRank.onSyncOrReady(),
      seasonGameCounter.onSyncOrReady(),
      ladderPosition.onSyncOrReady(),
    ]).then(function () {
      // every ribbon, with how many times this player earned it
      var earned = ribbons.toJSON();
      var allRibbons = _.map(SDK.RibbonFactory.ribbons, function (v) {
        var count = _.filter(earned, function (r) {
          return r.ribbon_id == v.id;
        }).length;
        return _.extend(_.clone(v), { count: count });
      });

      return shapeSummary(
        copy({
          ranked: ranked.attributes,
          gauntlet: gauntlet.attributes,
          run: run.attributes,
          currentSeasonRank: currentSeasonRank.attributes,
          currentSeasonGameCounterModel: seasonGameCounter.attributes,
          currentSeasonLadderPositionModel: ladderPosition.attributes,
          topRank: topRank.attributes,
          divisionStats: divisionStats.attributes,
          factionProgression: factionProgression.attributes,
          ribbons: allRibbons,
        }),
      );
    });
  },

  _load_rank_history: function () {
    var url = this._apiEndpointUrl;
    var currentSeasonRank = this._currentSeasonRank();
    var rankHistory = fetched(DuelystBackbone.Collection, url + '/rank/history');
    var gameCounters = fetched(DuelystBackbone.Collection, url + '/rank/history/game_counters');
    var topRank = fetched(DuelystBackbone.Model, url + '/rank/top');
    var divisionStats = fetched(DuelystBackbone.Model, url + '/rank/division_stats');

    return Promise.all([
      rankHistory.onSyncOrReady(),
      topRank.onSyncOrReady(),
      divisionStats.onSyncOrReady(),
      gameCounters.onSyncOrReady(),
    ]).then(function () {
      return shapeRankHistory(
        copy({
          currentSeasonRankModel: currentSeasonRank.toJSON(),
          rankHistory: rankHistory.toJSON(),
          topRank: topRank.attributes,
          divisionStats: divisionStats.attributes,
          rankHistoryGameCounters: gameCounters.toJSON(),
        }),
      );
    });
  },

  _load_match_history: function () {
    var games = fetched(
      DuelystBackbone.Collection,
      this._apiEndpointUrl + '/games?page=' + this._gamesHistoryPage,
    );
    return games.onSyncOrReady().then(function () {
      return shapeMatchHistory(copy({ matchHistory: games.toJSON() }));
    });
  },

  _load_faction_levels: function () {
    var factionProgression = fetched(
      DuelystBackbone.Model,
      this._apiEndpointUrl + '/faction_progression',
    );
    return factionProgression.onSyncOrReady().then(function () {
      return shapeFactionLevels(copy({ factionProgression: factionProgression.toJSON() }));
    });
  },

  onMatchHistoryPageNext: function () {
    this._gamesHistoryPage += 1;
    this.showSelectedTab();
  },

  /* endregion TABS */

  /* region REPLAYS */

  onReplayWatch: function (e) {
    var detail = e.originalEvent.detail;
    EventBus.getInstance().trigger(EVENTS.start_replay, {
      gameId: detail.gameId,
      userId: detail.userId,
    });
  },

  onReplayShare: function (e) {
    Promise.resolve(
      requestJson({
        url: process.env.API_URL + '/api/me/games/share_replay',
        type: 'POST',
        data: JSON.stringify({
          game_id: e.originalEvent.detail.gameId,
        }),
        contentType: 'application/json',
        dataType: 'json',
      }),
    )
      .then(function (responseData) {
        Logger.module('UI').log('shared replay', responseData);
        NavigationManager.getInstance().showDialogView(
          new CopyReplayDialogView({
            replayUrl: process.env.API_URL + '/replay?replayId=' + responseData.replay_id,
          }),
        );
      })
      .catch(function (response) {
        var message =
          response &&
          response.responseJSON &&
          (response.responseJSON.message || response.responseJSON.error);
        NavigationManager.getInstance().showDialogView(
          new ErrorDialogItemView({ title: 'Error sharing replay: ' + message }),
        );
      });
  },

  /* endregion REPLAYS */
});

module.exports = ProfileShell;
