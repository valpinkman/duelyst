// pragma PKGS: codex

/*
 * Marionette shell for <duelyst-codex> (docs/BACKBONE_REMOVAL_PLAN.md §3.3,
 * issue #68).
 *
 * The shell is what the navigation manager and transition.ts see: it carries
 * the screen's id, animateIn/animateOut, the codex resource request, and the
 * class identity App.showCodex tests. Its template is the tag alone.
 *
 * Properties in, events out: the shell reads the SDK chapters and which ones
 * InventoryManager has unlocked, and hands the component plain chapters. It
 * owns the state machine, because the navigation manager's minor routes call
 * back into it, and everything outside the DOM: the codex, chapter and world
 * map cocos layers, each chapter's resource package, music, sounds and
 * analytics. The activity dialog stays Marionette (#12, D4).
 */

'use strict';

// side-effect require: registers <duelyst-codex> (and its carousel)
require('../components/codex/codex');

var SDK = require('@duelyst/sdk');
var CONFIG = require('@duelyst/common/config');
var Analytics = require('@duelyst/common/analytics');
var PKGS = require('@duelyst/data/packages');
var RSX = require('@duelyst/data/resources');
var Scene = require('../../view/Scene');
var CodexLayer = require('../../view/layers/codex/CodexLayer');
var CodexChapterLayer = require('../../view/layers/codex/CodexChapterLayer');
var WorldMapLayer = require('../../view/layers/codex/WorldMapLayer');
var audio_engine = require('../../audio/audio_engine');
var PackageManager = require('../managers/package_manager');
var NavigationManager = require('../managers/navigation_manager');
var InventoryManager = require('../managers/inventory_manager');
var ProgressionManager = require('../managers/progression_manager');
var ActivityDialogItemView = require('../views/item/activity_dialog');
var Animations = require('../views/animations');

var STATE_CHAPTERS = 'chapters';
var STATE_CHAPTER = 'chapter';
var STATE_WORLD_MAP = 'world-map';

function chapterPreview(chapter) {
  var unlocked = InventoryManager.getInstance().hasUnlockedCodexChapter(chapter.id);
  var unlockMessage = null;
  if (chapter.enabled && !unlocked) {
    unlockMessage =
      'Play ' +
      (chapter.gamesRequiredToUnlock - ProgressionManager.getInstance().getGameCount()) +
      ' more games to unlock.';
  }
  return {
    id: chapter.id,
    name: chapter.name,
    description: chapter.description,
    img: chapter.img,
    enabled: !!chapter.enabled && unlocked,
    unlockMessage: unlockMessage,
  };
}

var CodexShell = Backbone.Marionette.ItemView.extend({
  id: 'app-codex',

  template: function () {
    return '<duelyst-codex></duelyst-codex>';
  },

  events: {
    'chapter-select': 'onChapterSelect',
    'world-map-show': 'onWorldMapShow',
    'world-map-hide': 'onWorldMapHide',
    'panel-hover': 'onPanelHover',
  },

  animateIn: Animations.fadeIn,
  animateOut: Animations.fadeOut,

  _state: null,
  _previousState: null,
  _chapterId: null,
  _loadedChapterPkgId: null,
  _chapterPromise: null,
  _unloadPromise: null,

  _codexEl: function () {
    return this.el.querySelector('duelyst-codex');
  },

  /* region MARIONETTE EVENTS */

  onShow: function () {
    // show codex content
    Scene.getInstance().showContentByClass(CodexLayer, true);

    this.whenRequiredResourcesReady().then(
      function (requestId) {
        if (!this.getAreResourcesValid(requestId)) return; // load invalidated or resources changed

        var codex = this._codexEl();
        codex.chapters = SDK.Codex.getAllChapters().map(chapterPreview);
        codex.ready = true;

        // set starting state to chapters
        this.setState(STATE_CHAPTERS);
      }.bind(this),
    );
  },

  getRequiredResources: function () {
    return Backbone.Marionette.ItemView.prototype.getRequiredResources
      .call(this)
      .concat(PKGS.getPkgForIdentifier('codex'));
  },

  onPrepareForDestroy: function () {
    this._codexEl().chapter = null;
    Promise.resolve(Scene.getInstance().destroyOverlayByClass(CodexChapterLayer)).then(
      function () {
        this._unloadCurrentChapterResources();
      }.bind(this),
    );
  },

  /* endregion MARIONETTE EVENTS */

  /* region COMPONENT EVENTS */

  onChapterSelect: function (e) {
    audio_engine
      .current()
      .play_effect_for_interaction(RSX.sfx_ui_confirm.audio, CONFIG.CONFIRM_SFX_PRIORITY);
    this.setState(STATE_CHAPTER, e.originalEvent.detail.id);
  },

  onWorldMapShow: function () {
    this.setState(STATE_WORLD_MAP);
  },

  onWorldMapHide: function () {
    NavigationManager.getInstance().showLastRoute();
  },

  onPanelHover: function () {
    audio_engine.current().play_effect(RSX.sfx_ui_menu_hover.audio);
  },

  /* endregion COMPONENT EVENTS */

  /* region STATES */

  /**
   * Sets the current codex state, and passes any other arguments to the show
   * state method. The minor routes call back into this.
   * @param {String} state
   * @params {*}
   */
  setState: function (state) {
    if (state === this._state) return;

    this._previousState = this._state;
    this._state = state;

    // hide old state
    if (this._previousState === STATE_WORLD_MAP) {
      this._stopShowingWorldMap();
    } else if (this._previousState === STATE_CHAPTER) {
      this._stopShowingChapter();
    }

    // show new state
    var stateArgs = Array.prototype.slice.call(arguments, 1);
    if (this._state === STATE_WORLD_MAP) {
      this._showWorldMap();
    } else if (this._state === STATE_CHAPTER) {
      this._showChapter.apply(this, stateArgs);
    } else if (this._state === STATE_CHAPTERS) {
      this._showChapters();
    }

    // the component fades between the states
    this._codexEl().state = this._state;
  },

  _showChapters: function () {
    NavigationManager.getInstance().resetMinorRoutes();
    NavigationManager.getInstance().addMinorRoute('chapters', this.setState, this, [
      STATE_CHAPTERS,
    ]);

    audio_engine.current().play_music(RSX.music_codex.audio);
  },

  _showChapterVisuals: function (chapterData) {
    var promise = null;
    var chapterLayer = Scene.getInstance().getOverlay();
    if (chapterLayer instanceof CodexChapterLayer) {
      chapterLayer.showChapter(chapterData.background);
      chapterLayer.fadeTo(CONFIG.VIEW_TRANSITION_DURATION, 255.0);
    } else {
      chapterLayer = new CodexChapterLayer();
      promise = Scene.getInstance().showOverlay(chapterLayer);
      chapterLayer.showChapter(chapterData.background);
    }
    return promise;
  },

  /**
   * Shows a chapter, loading its resource package the first time.
   * @param {String} chapterId
   * @returns {Promise}
   */
  _showChapter: function (chapterId) {
    if (chapterId == null) return this._chapterPromise;

    var chapterData = SDK.Codex.chapterForIdentifier(chapterId);

    NavigationManager.getInstance().addMinorRoute('chapter', this.setState, this, [
      STATE_CHAPTER,
      chapterId,
    ]);

    Analytics.track(
      'read codex chapter',
      {
        category: Analytics.EventCategory.Codex,
        chapter_id: chapterId,
      },
      {
        nonInteraction: 1,
      },
    );

    if (this._chapterId == null || this._chapterId !== chapterId) {
      this._chapterId = chapterId;

      NavigationManager.getInstance().showDialogView(new ActivityDialogItemView());

      // store loaded chapter package id
      var chapterPkgId = PKGS.getChapterPkgIdentifier(chapterId);
      var previousLoadedPackageId = this._loadedChapterPkgId;
      this._loadedChapterPkgId = chapterPkgId;

      this._chapterPromise = PackageManager.getInstance()
        .loadMinorPackage(chapterPkgId)
        .then(
          function () {
            NavigationManager.getInstance().destroyDialogView();

            var promises = [
              PackageManager.getInstance().unloadMajorMinorPackage(previousLoadedPackageId),
            ];

            // only if the player has not moved on to another chapter meanwhile
            if (this._loadedChapterPkgId === chapterPkgId && !this.isDestroyed) {
              this._codexEl().chapter = {
                id: chapterData.id,
                name: chapterData.name,
                description: chapterData.description,
                text: chapterData.text,
              };
              promises.push(this._showChapterVisuals(chapterData));
            }

            return Promise.all(promises);
          }.bind(this),
        );
    } else if (this._codexEl().chapter != null) {
      // the chapter is already loaded: show its visuals again
      this._showChapterVisuals(chapterData);
    }

    return this._chapterPromise;
  },

  _unloadCurrentChapterResources: function () {
    if (this._loadedChapterPkgId != null) {
      this._unloadPromise = PackageManager.getInstance().unloadMajorMinorPackage(
        this._loadedChapterPkgId,
      );
      this._loadedChapterPkgId = null;
    }

    return this._unloadPromise;
  },

  _stopShowingChapter: function () {
    var chapterLayer = Scene.getInstance().getOverlay();
    if (chapterLayer instanceof CodexChapterLayer) {
      chapterLayer.fadeToInvisible(CONFIG.VIEW_TRANSITION_DURATION);
    }
  },

  _showWorldMap: function () {
    NavigationManager.getInstance().addMinorRoute('world_map', this.setState, this, [
      STATE_WORLD_MAP,
    ]);

    audio_engine
      .current()
      .play_effect_for_interaction(RSX.sfx_ui_tab_in.audio, CONFIG.SHOW_SFX_PRIORITY);

    Scene.getInstance().showOverlayByClass(WorldMapLayer);
  },

  _stopShowingWorldMap: function () {
    audio_engine
      .current()
      .play_effect_for_interaction(RSX.sfx_ui_tab_out.audio, CONFIG.HIDE_SFX_PRIORITY);

    Scene.getInstance().destroyOverlayByClass(WorldMapLayer);
  },

  /* endregion STATES */
});

module.exports = CodexShell;
