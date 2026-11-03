// pragma PKGS: nongame

/*
 * Marionette shell for <duelyst-tutorial-lessons> (docs/BACKBONE_REMOVAL_PLAN.md
 * §3.3, issue #58).
 *
 * The shell is what the navigation manager sees: it carries the content view's
 * id and classes, the screen blur it holds while shown, and the class identity
 * application.ts tests with getIsShowingContentViewClass(). Its template is
 * the tag alone.
 *
 * Properties in, events out: the shell reads the SDK and ProgressionManager
 * and hands the component plain lessons, then turns the component's events
 * into challenge starts, manager calls and sounds. The confirm and activity
 * dialogs stay Marionette (#12, D4).
 */

'use strict';

// side-effect require: registers <duelyst-tutorial-lessons>
require('../components/tutorial/tutorial-lessons');

var EventBus = require('@duelyst/common/eventbus');
var EVENTS = require('@duelyst/common/event_types');
var CONFIG = require('@duelyst/common/config');
var UtilsJavascript = require('@duelyst/common/utils/utils_javascript');
var SDK = require('@duelyst/sdk');
var RSX = require('@duelyst/data/resources');
var i18next = require('i18next');
var Scene = require('../../view/Scene');
var audio_engine = require('../../audio/audio_engine');
var NavigationManager = require('../managers/navigation_manager');
var NewPlayerManager = require('../managers/new_player_manager');
var ProgressionManager = require('../managers/progression_manager');
var ActivityDialogItemView = require('../views/item/activity_dialog');

function tutorialChallenges() {
  return SDK.ChallengeFactory.getChallengesForCategoryType(SDK.ChallengeCategory.tutorial.type);
}

var TutorialLessonsShell = Backbone.Marionette.ItemView.extend({
  id: 'app-tutorial',
  className: 'modal duelyst-modal',

  template: function () {
    return '<duelyst-tutorial-lessons></duelyst-tutorial-lessons>';
  },

  events: {
    'lesson-select': 'onLessonSelect',
    'tutorial-continue': 'onContinue',
    'tutorial-skip': 'onSkip',
    'lesson-hover': 'onLessonHover',
    'lesson-completed': 'onLessonCompleted',
  },

  _screenBlurId: null,
  _previousBlurProgramKey: null,
  _lastCompletedChallenge: null,
  _lessons: null,

  initialize: function (options) {
    this._lastCompletedChallenge = options && options.lastCompletedChallenge;
    var progression = ProgressionManager.getInstance();
    this._lessons = _.map(tutorialChallenges(), function (c) {
      return {
        type: c.type,
        name: c.name,
        description: c.description,
        iconUrl: c.iconUrl,
        isComplete: progression.hasCompletedChallengeOfType(c.type),
      };
    });
  },

  onRender: function () {
    var lessons = this.el.querySelector('duelyst-tutorial-lessons');
    lessons.lessons = this._lessons;
    lessons.lastCompletedType = this._lastCompletedChallenge
      ? this._lastCompletedChallenge.type
      : null;
  },

  onShow: function () {
    var fx = Scene.getInstance().getFX();
    this._previousBlurProgramKey = fx.surfaceBlurShaderProgramKey;
    if (this._screenBlurId == null) {
      this._screenBlurId = UtilsJavascript.generateIncrementalId();
    }
    fx.screenBlurShaderProgramKey = 'BlurFullScreenMega';
    fx.requestBlurScreen(this._screenBlurId);
  },

  onPrepareForDestroy: function () {
    var fx = Scene.getInstance().getFX();
    fx.screenBlurShaderProgramKey = this._previousBlurProgramKey;
    fx.requestUnblurScreen(this._screenBlurId);
  },

  _startChallenge: function (type) {
    var challenge = SDK.ChallengeFactory.challengeForType(type);
    EventBus.getInstance().trigger(EVENTS.start_challenge, challenge);
  },

  onLessonSelect: function (e) {
    var type = e.originalEvent.detail.type;
    audio_engine
      .current()
      .play_effect_for_interaction(RSX.sfx_ui_click.audio, CONFIG.CLICK_SFX_PRIORITY);
    var lesson = _.findWhere(this._lessons, { type: type });
    if (lesson == null || lesson.isComplete) {
      return;
    }
    this._startChallenge(type);
  },

  onContinue: function (e) {
    var type = e.originalEvent.detail.type;
    if (type != null) {
      this._startChallenge(type);
      return;
    }

    // every lesson is done
    NewPlayerManager.getInstance().updateCoreState();
    NavigationManager.getInstance().requestUserTriggeredExit();
  },

  onSkip: function () {
    NavigationManager.getInstance()
      .showDialogForConfirmation(i18next.t('tutorial.confirm_skip_message'))
      .then(function () {
        NavigationManager.getInstance().showDialogView(new ActivityDialogItemView());

        var progression = ProgressionManager.getInstance();
        var challengeCompletionPromises = _.map(tutorialChallenges(), function (lesson) {
          if (lesson == null || lesson.type == null) {
            console.error('Error in FTUE Tutorial Challenge data');
            return Promise.reject('Error in FTUE Tutorial Challenge data');
          }
          if (progression.hasCompletedChallengeOfType(lesson.type)) {
            return Promise.resolve();
          }
          return progression.completeChallengeWithType(lesson.type);
        });

        return Promise.all(challengeCompletionPromises)
          .then(function () {
            return NewPlayerManager.getInstance().updateCoreState();
          })
          .then(function () {
            NavigationManager.getInstance().destroyDialogView();
            NavigationManager.getInstance().requestUserTriggeredExit();
          });
      });
  },

  onLessonHover: function () {
    audio_engine.current().play_effect(RSX.sfx_ui_menu_hover.audio);
  },

  onLessonCompleted: function () {
    audio_engine.current().play_effect(RSX.sfx_ui_confirm.audio);
  },
});

module.exports = TutorialLessonsShell;
