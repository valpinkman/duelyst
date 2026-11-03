// pragma PKGS: nongame

/*
 * Marionette shell for <duelyst-arena> (docs/BACKBONE_REMOVAL_PLAN.md §3.3,
 * issue #67).
 *
 * The shell is what PlayLayout shows in its mode region for the Gauntlet: it
 * carries the old view's id and is still built as `new X()`. Its template is
 * the tag alone; the screen itself is cocos (#12 D3), driven by the element.
 *
 * Properties in, events out: the shell owns the current run's synced model
 * and hands it to the element, keeps the ticket count current, works out
 * whether the latest game was a recent Gauntlet win, and sets `ready` once the
 * gauntlet package has loaded and the run has synced. It turns the element's
 * events into the Gauntlet API requests, the ticket purchase, matchmaking and
 * analytics, and calls the event's done() with the server's answer. The
 * error, confirm, purchase and activity dialogs stay Marionette (#12, D4).
 */

'use strict';

// side-effect require: registers <duelyst-arena>
require('../components/arena/arena');

var SDK = require('@duelyst/sdk');
var _ = require('underscore');
var EventBus = require('@duelyst/common/eventbus');
var EVENTS = require('@duelyst/common/event_types');
var Analytics = require('@duelyst/common/analytics');
var i18next = require('i18next');
var moment = require('moment');
var ShopData = require('@duelyst/data/shop.json');
var { requestJson } = require('@duelyst/common/request');
var { dbRef } = require('../../firebase');
var DuelystFirebase = require('../extensions/duelyst_firebase');
var PackageManager = require('../managers/package_manager');
var NavigationManager = require('../managers/navigation_manager');
var GamesManager = require('../managers/games_manager');
var InventoryManager = require('../managers/inventory_manager');
var ProfileManager = require('../managers/profile_manager');
var ErrorDialogItemView = require('../views/item/error_dialog');
var ActivityDialogItemView = require('../views/item/activity_dialog');

var ArenaShell = Backbone.Marionette.ItemView.extend({
  id: 'app-arena',

  template: function () {
    return '<duelyst-arena></duelyst-arena>';
  },

  events: {
    'arena-run-start': 'onRunStart',
    'arena-ticket-purchase': 'onTicketPurchase',
    'arena-faction-select': 'onFactionSelect',
    'arena-card-select': 'onCardSelect',
    'arena-run-resign': 'onRunResign',
    'arena-rewards-claim': 'onRewardsClaim',
    'arena-rewards-seen': 'onRewardsSeen',
    'arena-game-find': 'onGameFind',
  },

  onShow: function () {
    // the current run, if there is one
    var arenaRef = dbRef('user-gauntlet-run', ProfileManager.getInstance().get('id'), 'current');
    this.model = new DuelystFirebase.Model(null, { firebase: arenaRef });

    var element = this._element();
    element.model = this.model;
    this._bindTicketCount();

    // load gauntlet resources and wait for the run to sync, showing the
    // activity dialog meanwhile
    Promise.all([
      NavigationManager.getInstance().showDialogView(new ActivityDialogItemView()),
      PackageManager.getInstance().loadMinorPackage('gauntlet'),
      this.model.onSyncOrReady(),
    ]).then(
      function () {
        if (this.isDestroyed) return;

        NavigationManager.getInstance().destroyDialogView();
        this.listenTo(
          NavigationManager.getInstance(),
          EVENTS.user_triggered_cancel,
          this.onGameCancel,
        );
        element.wonLastGame = this._wonLastGauntletGame();
        element.ready = true;
      }.bind(this),
    );
  },

  onDestroy: function () {
    PackageManager.getInstance().unloadMajorMinorPackage('gauntlet');
  },

  _element: function () {
    return this.el.querySelector('duelyst-arena');
  },

  _bindTicketCount: function () {
    var tickets = InventoryManager.getInstance().arenaTicketsCollection;
    var update = function () {
      this._element().ticketCount = tickets.length;
    }.bind(this);
    update();
    this.listenTo(tickets, 'add remove reset', update);
  },

  /** Whether the player's latest game is a Gauntlet win from the last hour. */
  _wonLastGauntletGame: function () {
    var lastGameModel = GamesManager.getInstance().playerGames.first();
    if (lastGameModel == null) return false;
    var isRecent = moment
      .utc(lastGameModel.get('created_at'))
      .isAfter(moment().utc().subtract(1, 'hour'));
    return (
      isRecent &&
      lastGameModel.get('game_type') == SDK.GameType.Gauntlet &&
      !!lastGameModel.get('is_winner')
    );
  },

  /**
   * Settles the element's request with a request's answer. A failure shows the
   * error dialog and hands the message back through done().
   */
  _settle: function (done, promise) {
    return promise.then(
      function (response) {
        done({ run: response });
        return response;
      },
      function (errorMessage) {
        NavigationManager.getInstance().showDialogViewByClass(ErrorDialogItemView, {
          title: errorMessage,
        });
        done({ error: errorMessage });
        throw errorMessage;
      },
    );
  },

  /**
   * Sends one Gauntlet request. A failure raises the ajax error and rejects
   * with errorMessage.
   * @returns {Promise} resolves with the server's answer
   */
  _request: function (type, path, errorMessage, body) {
    return requestJson({
      url: process.env.API_URL + path,
      data: body != null ? JSON.stringify(body) : undefined,
      type: type,
      contentType: 'application/json',
      dataType: 'json',
    }).then(null, function () {
      // Temporary error, should parse server response.
      EventBus.getInstance().trigger(EVENTS.ajax_error, errorMessage);
      throw errorMessage;
    });
  },

  /** The first ticket the player holds, or a new one if they hold none. */
  _retrieveArenaRunTicket: function () {
    var inventory = InventoryManager.getInstance();
    if (inventory.arenaTicketsCollection.length > 0) {
      return Promise.resolve(inventory.arenaTicketsCollection.at(0));
    }
    // reduced gold price from 150 to 0
    if (inventory.walletModel.get('gold_amount') < 0) {
      return Promise.reject(i18next.t('gauntlet.start_error_message_insufficient_gold'));
    }
    return this._request(
      'POST',
      '/api/me/inventory/gauntlet_tickets',
      i18next.t('gauntlet.start_error_message_generic'),
    ).then(function (response) {
      return { id: response };
    });
  },

  onRunStart: function (e) {
    var request = this._retrieveArenaRunTicket().then(
      function (ticketData) {
        return this._request(
          'POST',
          '/api/me/gauntlet/runs',
          i18next.t('gauntlet.start_error_message_generic'),
          { ticket_id: ticketData.id },
        );
      }.bind(this),
    );
    this._settle(e.originalEvent.detail.done, request).catch(_.noop);
  },

  onTicketPurchase: function (e) {
    var done = e.originalEvent.detail.done;
    NavigationManager.getInstance()
      .showDialogForConfirmPurchase(ShopData.gauntlet.GAUNTLET_TICKET)
      .then(
        function () {
          var tickets = InventoryManager.getInstance().arenaTicketsCollection;
          if (tickets.length == 0) {
            // wait until the ticket arrives
            this.listenToOnce(tickets, 'add', function () {
              NavigationManager.getInstance().destroyDialogView();
              EventBus.getInstance().trigger(EVENTS.show_play, SDK.PlayModes.Gauntlet);
            });
          } else {
            EventBus.getInstance().trigger(EVENTS.show_play, SDK.PlayModes.Gauntlet);
          }
        }.bind(this),
      )
      .catch(function () {
        // do nothing on cancel
      })
      .then(function () {
        done();
      });
  },

  onFactionSelect: function (e) {
    var detail = e.originalEvent.detail;
    var request = this._request(
      'PUT',
      '/api/me/gauntlet/runs/current/faction_id',
      i18next.t('common.start_error_message_generic_please_retry'),
      { faction_id: detail.factionId },
    ).then(
      function (response) {
        var unchosenFactionIds = _.without(this.model.get('faction_choices'), detail.factionId);
        Analytics.track('start gauntlet run', {
          category: Analytics.EventCategory.Gauntlet,
          ticket_id: this.model.get('ticket_id'),
          faction_id: detail.factionId,
          did_not_choose_faction_1: unchosenFactionIds[0] || null,
          did_not_choose_faction_2: unchosenFactionIds[1] || null,
        });
        return response;
      }.bind(this),
    );
    this._settle(detail.done, request).catch(_.noop);
  },

  onCardSelect: function (e) {
    var detail = e.originalEvent.detail;
    var request = this._request(
      'POST',
      '/api/me/gauntlet/runs/current/cards',
      i18next.t('common.start_error_message_generic_please_retry'),
      { card_id: detail.cardId },
    ).then(
      function (response) {
        Analytics.track(
          'gauntlet card choice',
          {
            category: Analytics.EventCategory.Gauntlet,
            ticket_id: this.model.get('ticket_id'),
            card_id: detail.cardId,
            did_not_choose_card_1_id: detail.unselectedCardIds[0] || null,
            did_not_choose_card_2_id: detail.unselectedCardIds[1] || null,
            card_choice_index: response && response.deck ? response.deck.length - 1 : 0,
          },
          {
            labelKey: 'card_id',
          },
        );
        return response;
      }.bind(this),
    );
    this._settle(detail.done, request).catch(_.noop);
  },

  onRunResign: function (e) {
    var done = e.originalEvent.detail.done;
    NavigationManager.getInstance()
      .showDialogForConfirmation(i18next.t('gauntlet.resign_confirmation_message'))
      .then(
        function () {
          var request = this._request(
            'DELETE',
            '/api/me/gauntlet/runs/current',
            i18next.t('common.start_error_message_generic_please_retry'),
          );
          this._settle(done, request).catch(_.noop);
        }.bind(this),
        function () {
          done({ cancelled: true });
        },
      );
  },

  onRewardsClaim: function (e) {
    var request = this._request(
      'PUT',
      '/api/me/gauntlet/runs/current/rewards_claimed_at',
      i18next.t('common.start_error_message_generic_please_retry'),
    ).then(
      function (response) {
        Analytics.track(
          'claim gauntlet rewards',
          {
            category: Analytics.EventCategory.Gauntlet,
            faction_id: this.model.get('faction_id'),
            ticket_id: this.model.get('ticket_id'),
            win_count: this.model.get('win_count') || 0,
            did_resign: this.model.get('is_resigned') ? 1 : 0,
            general_id: this._element().getArenaRunGeneralId(),
          },
          {
            labelKey: 'faction_id',
            valueKey: 'win_count',
          },
        );
        return response;
      }.bind(this),
    );
    this._settle(e.originalEvent.detail.done, request).catch(_.noop);
  },

  onRewardsSeen: function (e) {
    this.model.set('rewards_seen', true);
    e.originalEvent.detail.done();
  },

  onGameFind: function () {
    // the Gauntlet deck lives on the server, so the search starts with an
    // empty deck flagged as a Gauntlet game
    GamesManager.getInstance().findNewGame(
      [],
      this.model.get('faction_id'),
      SDK.GameType.Gauntlet,
      this._element().getArenaRunGeneralId(),
    );
  },

  onGameCancel: function () {
    if (!NavigationManager.getInstance().getIsShowingModalView()) {
      GamesManager.getInstance().cancelMatchmaking();
    }
  },
});

module.exports = ArenaShell;
