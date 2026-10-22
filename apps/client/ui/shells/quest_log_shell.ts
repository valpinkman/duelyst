// pragma PKGS: alwaysloaded

/*
 * Marionette shell for <duelyst-quest-log> (docs/BACKBONE_REMOVAL_PLAN.md §3.3).
 *
 * The shell is what the navigation manager and transition.ts see: it carries
 * the modal's id and classes, animateIn/animateOut, and the instanceof
 * identity toggleModalViewByClass() relies on. Its template is the tag alone.
 *
 * Properties in, events out (issue #10, D1): the shell reads the managers and
 * hands the component plain data, then turns the component's events into
 * manager calls. The component imports no manager.
 */

'use strict';

// side-effect require: registers <duelyst-quest-log>
require('../components/quests/quest-log');

var EventBus = require('@duelyst/common/eventbus');
var EVENTS = require('@duelyst/common/event_types');
var CONFIG = require('@duelyst/common/config');
var RSX = require('@duelyst/data/resources');
var Animations = require('../views/animations');
var QuestsManager = require('../managers/quests_manager');
var NewPlayerManager = require('../managers/new_player_manager');
var InventoryManager = require('../managers/inventory_manager');
var audio_engine = require('../../audio/audio_engine');

var QuestLogShell = Backbone.Marionette.ItemView.extend({
  className: 'modal duelyst-modal quest-modal',

  id: 'quest-log',

  template: function () {
    return '<duelyst-quest-log></duelyst-quest-log>';
  },

  events: {
    'quest-replace': 'onQuestReplace',
    'free-card-claim': 'onFreeCardClaim',
  },

  animateIn: Animations.fadeIn,
  animateOut: Animations.fadeOut,

  showConfirm: false,

  initialize: function (opts) {
    this.showConfirm = opts.showConfirm;
  },

  onRender: function () {
    var newPlayerManager = NewPlayerManager.getInstance();
    var questLog = this.el.querySelector('duelyst-quest-log');
    questLog.quests = this.collection;
    questLog.gameCounter = this.model;
    questLog.showConfirm = !!this.showConfirm;
    questLog.canSeeFirstWin = newPlayerManager.canSeeFirstWinOfTheDay();
    questLog.canSeeFreeCard = newPlayerManager.canSeeFreeCardOfTheDay();
    questLog.freeCardAvailable = InventoryManager.getInstance().isFreeCardOfTheDayAvailable();
  },

  onShow: function () {
    audio_engine
      .current()
      .play_effect_for_interaction(RSX.sfx_ui_tab_in.audio, CONFIG.SHOW_SFX_PRIORITY);
  },

  onQuestReplace: function (e) {
    var detail = e.originalEvent.detail;
    audio_engine
      .current()
      .play_effect_for_interaction(RSX.sfx_ui_confirm.audio, CONFIG.CONFIRM_SFX_PRIORITY);
    // never rejects: a 304 or a failure is reported by the manager itself
    QuestsManager.getInstance()
      .requestQuestReplace(detail.id)
      .then(function () {
        QuestsManager.getInstance().markQuestsAsRead();
        detail.done();
      });
  },

  onFreeCardClaim: function () {
    InventoryManager.getInstance()
      .claimFreeCardOfTheDay()
      .then(function (response) {
        EventBus.getInstance().trigger(EVENTS.show_free_card_of_the_day, {
          cardId: response.card_id,
        });
        Analytics.track('free card of the day claimed', {
          category: Analytics.EventCategory.Quest,
          cardId: response.card_id,
        });
      });
  },

  onDestroy: function () {
    QuestsManager.getInstance().markQuestsAsRead();
    QuestsManager.getInstance().markDailyChallengeAsRead();
  },
});

module.exports = QuestLogShell;
