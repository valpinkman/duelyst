// pragma PKGS: alwaysloaded

'use strict';

var EventBus = require('@duelyst/common/eventbus');
var EVENTS = require('@duelyst/common/event_types');
var CONFIG = require('@duelyst/common/config');
var Animations = require('apps/client/ui/views/animations');
var QuestsManager = require('apps/client/ui/managers/quests_manager');
var NavigationManager = require('apps/client/ui/managers/navigation_manager');
var NewPlayerManager = require('apps/client/ui/managers/new_player_manager');
var RSX = require('@duelyst/data/resources');
var Logger = require('@duelyst/common/logger');
var UtilsJavascript = require('@duelyst/common/utils/utils_javascript');
var audio_engine = require('apps/client/audio/audio_engine');
var moment = require('moment');
var DuelystFirebase = require('apps/client/ui/extensions/duelyst_firebase');

var QuestLogViewTempl = require('./templates/quest_log_composite.hbs');
var QuestItemView = require('./quest_item');
var QuestLogEmptyView = require('./quest_log_empty');

var QuestLogView = Backbone.Marionette.CompositeView.extend({
  tagName: 'ul',
  className: 'quest-log-list',

  template: QuestLogViewTempl,

  childView: QuestItemView,
  emptyView: QuestLogEmptyView,

  events: {
    'click .replace': 'onReplace',
  },

  ui: {
    $rollovercountdown: '.rollover-countdown',
    $firstWinCountdown: '.first-win-of-the-day-countdown',
  },

  animateIn: Animations.fadeIn,
  animateOut: Animations.fadeOut,

  rolloverUpdateInterval: null,
  showConfirm: false,

  initialize: function (opts) {
    this.showConfirm = opts.showConfirm;
  },

  onReplace: function (e) {
    var index = $(e.currentTarget).data('quest-index');
    var $quest = $(e.currentTarget).parents('li.quest');

    var model = this.collection.get(index);

    audio_engine
      .current()
      .play_effect_for_interaction(RSX.sfx_ui_confirm.audio, CONFIG.CONFIRM_SFX_PRIORITY);

    $quest.removeClass('animateIn').addClass('replacing');
    this.listenToOnce(model, 'change', function () {
      $quest.removeClass('replacing').addClass('animateIn');
      // mark daily quests as read
      QuestsManager.getInstance().markQuestsAsRead();
    });

    var request = QuestsManager.getInstance().requestQuestReplace(index);
    request.done(
      function (response) {
        // nada
      }.bind(this),
    );
  },
});

// Expose the class either via CommonJS or the global object
module.exports = QuestLogView;
