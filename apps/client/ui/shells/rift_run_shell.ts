// pragma PKGS: nongame

/*
 * Marionette shell for <duelyst-rift-run> (docs/BACKBONE_REMOVAL_PLAN.md
 * §3.3, issue #65).
 *
 * The shell is what RiftShell (#77) shows in its content area: it
 * carries the old view's id and is still built as `new X({ model })`. Its
 * template is the tag alone; the screen itself is cocos (#12 D3), driven by
 * the element.
 *
 * Properties in, events out: the shell hands the element the run model, and
 * sets `ready` once the rift package has loaded. It turns the element's events
 * into the rift API requests, matchmaking and manager calls, writes each
 * answer into the model, and calls the event's done(). The error, confirm and
 * activity dialogs stay Marionette (#12, D4).
 */

'use strict';

// side-effect require: registers <duelyst-rift-run>
require('../components/rift/rift-run');

var SDK = require('@duelyst/sdk');
var EventBus = require('@duelyst/common/eventbus');
var EVENTS = require('@duelyst/common/event_types');
var Analytics = require('@duelyst/common/analytics');
var i18next = require('i18next');
var { requestJson } = require('@duelyst/common/request');
var PackageManager = require('../managers/package_manager');
var NavigationManager = require('../managers/navigation_manager');
var GamesManager = require('../managers/games_manager');
var NewPlayerManager = require('../managers/new_player_manager');
var ErrorDialogItemView = require('../views/item/error_dialog');
var ActivityDialogItemView = require('../views/item/activity_dialog');

var CARD_ERROR = 'Oops... there was a problem selecting your card. Please try again.';

var RiftRunShell = Backbone.Marionette.ItemView.extend({
  id: 'app-rift',

  template: function () {
    return '<duelyst-rift-run></duelyst-rift-run>';
  },

  events: {
    'rift-general-select': 'onGeneralSelect',
    'rift-card-select': 'onCardSelect',
    'rift-card-to-upgrade-select': 'onCardToUpgradeSelect',
    'rift-upgrade-store': 'onUpgradeStore',
    'rift-upgrade-reroll': 'onUpgradeReroll',
    'rift-game-find': 'onGameFind',
    'rift-game-cancel': 'onGameCancel',
  },

  onRender: function () {
    this._element().model = this.model;
  },

  onShow: function () {
    // load rift resources, showing the activity dialog meanwhile
    Promise.all([
      NavigationManager.getInstance().showDialogView(new ActivityDialogItemView()),
      PackageManager.getInstance().loadMinorPackage('rift'),
    ]).then(
      function () {
        if (this.isDestroyed) return;

        NavigationManager.getInstance().destroyDialogView();
        this.listenTo(
          NavigationManager.getInstance(),
          EVENTS.user_triggered_cancel,
          this.onGameCancel,
        );
        this._element().ready = true;
      }.bind(this),
    );
  },

  onDestroy: function () {
    PackageManager.getInstance().unloadMajorMinorPackage('rift');
  },

  _element: function () {
    return this.el.querySelector('duelyst-rift-run');
  },

  /**
   * Sends one rift run request, writes the answer into the model and settles
   * the element's request. A failure raises the ajax error and the error
   * dialog, then hands the message back through done().
   * @returns {Promise} resolves with the server's answer, or rejects
   */
  _runRequest: function (done, type, path, errorMessage, body) {
    var request = requestJson({
      url: process.env.API_URL + '/api/me/rift/runs/' + this.model.get('ticket_id') + path,
      data: body != null ? JSON.stringify(body) : undefined,
      type: type,
      contentType: 'application/json',
      dataType: 'json',
    });

    return request.then(
      function (response) {
        this.model.set(response);
        done();
        return response;
      }.bind(this),
      function () {
        // Temporary error, should parse server response.
        EventBus.getInstance().trigger(EVENTS.ajax_error, errorMessage);
        NavigationManager.getInstance().showDialogViewByClass(ErrorDialogItemView, {
          title: errorMessage,
        });
        done({ error: errorMessage });
        throw errorMessage;
      },
    );
  },

  onGeneralSelect: function (e) {
    var detail = e.originalEvent.detail;
    this._runRequest(
      detail.done,
      'PUT',
      '/general_id',
      'Oops... there was a problem selecting your general. Please try again.',
      { general_id: detail.cardId },
    ).then(function () {
      Analytics.track('select rift general', {
        category: Analytics.EventCategory.Rift,
        card_id: detail.cardId,
      });
    }, _.noop);
  },

  onCardSelect: function (e) {
    var detail = e.originalEvent.detail;
    this._runRequest(detail.done, 'POST', '/upgrade', CARD_ERROR, { card_id: detail.cardId }).then(
      function () {
        NewPlayerManager.getInstance().setHasUsedRiftUpgrade(true);
      },
      _.noop,
    );
  },

  onCardToUpgradeSelect: function (e) {
    var detail = e.originalEvent.detail;
    var nav = NavigationManager.getInstance();

    if (this.model.get('card_id_to_upgrade')) {
      nav.showDialogView(
        new ErrorDialogItemView({ title: 'You already have a card replace in progress' }),
      );
      detail.done({ cancelled: true });
      return;
    }

    var upgradesAvailableCount = this.model.get('upgrades_available_count') || 0;
    var storedUpgrades = this.model.get('stored_upgrades');
    var storedUpgradesAvailableCount = storedUpgrades != null ? storedUpgrades.length : 0;
    if (upgradesAvailableCount == 0 && storedUpgradesAvailableCount == 0) {
      nav.showDialogView(
        new ErrorDialogItemView({ title: "You don't have any card upgrades available" }),
      );
      detail.done({ cancelled: true });
      return;
    }

    nav.showDialogForConfirmation(i18next.t('rift.confirm_replace_card_message')).then(
      function () {
        this._runRequest(detail.done, 'POST', '/card_id_to_upgrade', CARD_ERROR, {
          card_id: detail.cardId,
        }).catch(_.noop);
      }.bind(this),
      function () {
        detail.done({ cancelled: true });
      },
    );
  },

  onUpgradeStore: function (e) {
    this._runRequest(
      e.originalEvent.detail.done,
      'POST',
      '/store_upgrade',
      'Oops... there was a problem storing your upgrade. Please try again.',
    ).catch(_.noop);
  },

  onUpgradeReroll: function (e) {
    this._runRequest(
      e.originalEvent.detail.done,
      'POST',
      '/reroll_upgrade',
      'Oops... there was a problem rerolling your upgrade. Please try again.',
    ).catch(_.noop);
  },

  onGameFind: function () {
    // the rift deck lives on the server, so the search starts with an empty
    // deck flagged as a rift game
    GamesManager.getInstance().findNewGame(
      [],
      this.model.get('faction_id'),
      SDK.GameType.Rift,
      this.model.get('general_id'),
      null,
      null,
      this.model.get('ticket_id'),
    );
  },

  onGameCancel: function () {
    if (!NavigationManager.getInstance().getIsShowingModalView()) {
      GamesManager.getInstance().cancelMatchmaking();
    }
  },
});

module.exports = RiftRunShell;
