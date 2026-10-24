// pragma PKGS: nongame

/*
 * Marionette shell for <duelyst-rift-runs> (docs/BACKBONE_REMOVAL_PLAN.md
 * §3.3, issue #77).
 *
 * The shell is what the play layout shows in its mode region for the Rift: it
 * carries the old deck-select layout's id, and the class identity the screen
 * tour's seed looks for. Its template is a content area holding the tag.
 *
 * Properties in, events out: the shell fetches the player's runs and reads
 * the wallet, the tickets and the profile, and hands the component plain
 * panels. It owns everything outside the DOM: the RiftDeckSelectLayer and the
 * red gradient, the ticket purchases and run-start requests, analytics and
 * the hover sound.
 *
 * Picking or starting a run shows RiftRunShell (#65) in the content area,
 * where the old layout's content region showed it. That child is still a
 * Marionette view, so the content area is a plain Marionette Region the shell
 * owns, emptied and destroyed with it.
 */

'use strict';

// side-effect require: registers <duelyst-rift-runs> (and its carousel)
require('../components/rift/rift-runs');

var SDK = require('@duelyst/sdk');
var CONFIG = require('@duelyst/common/config');
var EventBus = require('@duelyst/common/eventbus');
var EVENTS = require('@duelyst/common/event_types');
var Analytics = require('@duelyst/common/analytics');
var generatePushID = require('@duelyst/common/generate_push_id');
var RSX = require('@duelyst/data/resources');
var ShopData = require('@duelyst/data/shop.json');
var RiftHelper = require('@duelyst/sdk/rift/riftHelper');
var { requestJson } = require('@duelyst/common/request');
var Scene = require('../../view/Scene');
var RiftDeckSelectLayer = require('../../view/layers/rift/RiftDeckSelectLayer');
var audio_engine = require('../../audio/audio_engine');
var NavigationManager = require('../managers/navigation_manager');
var InventoryManager = require('../managers/inventory_manager');
var ProfileManager = require('../managers/profile_manager');
var DuelystBackbone = require('../extensions/duelyst_backbone');
var RiftRunShell = require('./rift_run_shell');

/**
 * One run as the carousel panel shows it (views2/rift/rift_run_deck's
 * serializeModel, plus the general's portrait the template looked up).
 */
function runPanel(model) {
  var data = model.toJSON();

  var levelUpRequirement = RiftHelper.pointsRequiredForLevel(data.rift_level + 1);
  var pointsSoFar = data.rift_points - RiftHelper.totalPointsForLevel(data.rift_level);

  var portrait = null;
  var generalCard = SDK.GameSession.getCardCaches().getCardById(data.general_id);
  if (generalCard != null) {
    var portraitHexResource = generalCard.getPortraitHexResource();
    portrait = portraitHexResource && portraitHexResource.img;
  }

  return {
    id: model.cid,
    name: data.name,
    faction_id: data.faction_id,
    portrait: portrait,
    rift_level: data.rift_level,
    rift_rating: data.rift_rating == null ? 400 : data.rift_rating,
    rift_points_so_far: pointsSoFar,
    level_up_points_required: levelUpRequirement,
    progress_percent: 100 * (pointsSoFar / levelUpRequirement),
  };
}

var RiftShell = Backbone.Marionette.ItemView.extend({
  id: 'app-rift',

  template: function () {
    return '<div class="content-region"><duelyst-rift-runs></duelyst-rift-runs></div>';
  },

  events: {
    'rift-runs-select': 'onRunSelect',
    'rift-runs-start': 'onRunStart',
    'panel-hover': 'onPanelHover',
  },

  runsCollection: null,
  _activeRiftRequest: null,
  _contentRegion: null,
  _gradientId: null,
  _runSelected: false,

  initialize: function () {
    this._gradientId = generatePushID();
    this.runsCollection = new DuelystBackbone.Collection();
    this.runsCollection.url = process.env.API_URL + '/api/me/rift/runs';
    this.runsCollection.fetch();
  },

  _element: function () {
    return this.el.querySelector('duelyst-rift-runs');
  },

  /* region MARIONETTE EVENTS */

  onShow: function () {
    this.runsCollection.onSyncOrReady().then(
      function () {
        if (this.isDestroyed || this._element() == null) return;
        this._showRuns();
      }.bind(this),
    );
  },

  onPrepareForDestroy: function () {
    this._clearGradient();
    if (this._contentRegion != null) this._contentRegion.prepareForDestroy();
  },

  onDestroy: function () {
    if (this._contentRegion != null) {
      this._contentRegion.empty();
      this._contentRegion = null;
    }
  },

  /* endregion MARIONETTE EVENTS */

  /* region RUNS */

  _showRuns: function () {
    var inventory = InventoryManager.getInstance();
    var canClaimFreeTicket = !inventory.hasUnusedRiftTicket() && this.runsCollection.length == 0;
    var storedUpgradeCount = ProfileManager.getInstance().profile.get('rift_stored_upgrade_count');

    var el = this._element();
    el.runs = this.runsCollection.map(runPanel);
    el.storedUpgradeCount = storedUpgradeCount || 0;
    if (inventory.hasUnusedRiftTicket() || canClaimFreeTicket) {
      el.startMode = 'existing';
    } else {
      el.startMode = 'buy';
      el.goldDisabled = inventory.getWalletModelGoldAmount() < CONFIG.RIFT_TICKET_GOLD_PRICE;
    }
    el.ready = true;

    // show play layer
    Scene.getInstance().showContentByClass(RiftDeckSelectLayer, true);

    // change fx
    Scene.getInstance().getFX().showGradientColorMap(
      this._gradientId,
      CONFIG.ANIMATE_FAST_DURATION,
      {
        r: 255,
        g: 0,
        b: 0,
        a: 255,
      },
      {
        r: 0,
        g: 0,
        b: 0,
        a: 255,
      },
    );
  },

  _clearGradient: function () {
    if (this._gradientId == null) return;
    Scene.getInstance()
      .getFX()
      .clearGradientColorMap(this._gradientId, CONFIG.ANIMATE_MEDIUM_DURATION);
    this._gradientId = null;
  },

  /**
   * Shows a run in the content area, in place of the runs list.
   * @param {Backbone.Model} model
   */
  _showRun: function (model) {
    if (this.isDestroyed) return;
    // the runs list leaves, as the old composite did when the region swapped it
    this._clearGradient();
    if (this._contentRegion == null) {
      this._contentRegion = new Backbone.Marionette.Region({
        el: this.el.querySelector('.content-region'),
      });
    }
    this._contentRegion.show(new RiftRunShell({ model: model }));
  },

  /* endregion RUNS */

  /* region COMPONENT EVENTS */

  onRunSelect: function (e) {
    // only the first pick counts, as the old listenToOnce had it
    if (this._runSelected) return;
    this._runSelected = true;
    var model = this.runsCollection.get(e.originalEvent.detail.id);
    if (model != null) {
      this._showRun(model);
    }
  },

  onRunStart: function (e) {
    var withWhat = e.originalEvent.detail.with;
    if (withWhat === 'gold') {
      this.startNewRiftRunWithGold();
    } else if (withWhat === 'currency') {
      this.startNewRiftRunWithCurrency();
    } else if (withWhat === 'existing') {
      this.startNewRiftRunWithExisting();
    }
  },

  onPanelHover: function () {
    audio_engine.current().play_effect(RSX.sfx_ui_menu_hover.audio);
  },

  /* endregion COMPONENT EVENTS */

  /* region START A RUN */

  startNewRiftRunWithGold: function () {
    // make request
    if (this._activeRiftRequest == null) {
      this._activeRiftRequest = this._purchaseRiftRunTicketWithGold()
        .then(
          function (ticketData) {
            return this._startRiftRunWithTicketId(ticketData.id);
          }.bind(this),
        )
        .then(
          function (runData) {
            this._showRun(new DuelystBackbone.Model(runData));
          }.bind(this),
        )
        .catch(
          function () {
            this._activeRiftRequest = null;
          }.bind(this),
        );
    }
  },

  startNewRiftRunWithCurrency: function () {
    // make request
    if (this._activeRiftRequest == null) {
      this._activeRiftRequest = this._purchaseRiftRunTicketWithCurrency()
        .then(
          function (ticketData) {
            return this._startRiftRunWithTicketId(ticketData.id);
          }.bind(this),
        )
        .then(
          function (runData) {
            this._activeRiftRequest = null;
            this._showRun(new DuelystBackbone.Model(runData));
          }.bind(this),
        )
        .catch(
          function () {
            // do nothing on cancel
            this._activeRiftRequest = null;
          }.bind(this),
        );
    }
  },

  startNewRiftRunWithExisting: function () {
    var hasUnusedRiftTickets = InventoryManager.getInstance().hasUnusedRiftTicket();

    // a player can claim a free rift ticket when they have no rift runs and no rift tickets
    var canClaimFreeTicket = !hasUnusedRiftTickets && this.runsCollection.length == 0;
    var unusedRiftTickets = InventoryManager.getInstance().getUnusedRiftTicketModels();

    if (this._activeRiftRequest == null) {
      if (canClaimFreeTicket) {
        this._activeRiftRequest = this._startFirstFreeRiftRun();
      } else if (hasUnusedRiftTickets) {
        var unusedTicketId = unusedRiftTickets[0].get('id');
        this._activeRiftRequest = this._startRiftRunWithTicketId(unusedTicketId);
      } else {
        return Promise.reject('No existing or free ticket available');
      }

      this._activeRiftRequest
        .then(
          function (runData) {
            this._activeRiftRequest = null;
            this._showRun(new DuelystBackbone.Model(runData));
          }.bind(this),
        )
        .catch(
          function () {
            this._activeRiftRequest = null;
          }.bind(this),
        );
    }

    return this._activeRiftRequest;
  },

  _purchaseRiftRunTicketWithGold: function () {
    return new Promise(function (resolve, reject) {
      // attempt to buy a new ticket
      if (InventoryManager.getInstance().walletModel.get('gold_amount') < 150) {
        reject('You do not have sufficient gold to start the Gauntlet run.');
      } else {
        // buy an rift ticket
        var request = requestJson({
          url: process.env.API_URL + '/api/me/inventory/rift_tickets',
          type: 'POST',
          contentType: 'application/json',
          dataType: 'json',
        });

        request.then(
          function (response) {
            Analytics.track('buy rift ticket with gold', {
              category: Analytics.EventCategory.Rift,
            });
            resolve(response);
          },
          function () {
            // Temporary error, should parse server response.
            var errorMessage =
              'Oops... there was a problem purchasing your ticket. Please try again.';
            EventBus.getInstance().trigger(EVENTS.ajax_error, errorMessage);
            reject(errorMessage);
          },
        );
      }
    });
  },

  _purchaseRiftRunTicketWithCurrency: function () {
    const _self = this;
    var productData = ShopData.rift.RIFT_TICKET;
    return NavigationManager.getInstance()
      .showDialogForConfirmPurchase(productData)
      .then(function () {
        Analytics.track('buy rift ticket with currency', {
          category: Analytics.EventCategory.Rift,
        });
        if (InventoryManager.getInstance().riftTicketsCollection.length == 0) {
          // wait until has a rift ticket
          return new Promise(
            function () {
              this.listenToOnce(
                InventoryManager.getInstance().riftTicketsCollection,
                'add',
                function () {
                  NavigationManager.getInstance().destroyDialogView();
                  return Promise.resolve();
                },
              );
            }.bind(_self),
          );
        } else {
          // Ticket arrived in inventory before we got here
          return Promise.resolve();
        }
      })
      .catch(function () {
        // do nothing on cancel
      });
  },

  _startRiftRunWithTicketId: function (ticketId) {
    return new Promise(function (resolve, reject) {
      var request = requestJson({
        url: process.env.API_URL + '/api/me/rift/runs',
        data: JSON.stringify({ ticket_id: ticketId }),
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
      });

      request.then(
        function (response) {
          Analytics.track('start rift run with ticket', {
            category: Analytics.EventCategory.Rift,
          });
          resolve(response);
        },
        function () {
          // Temporary error, should parse server response.
          var errorMessage = 'Oops... there was a problem starting your run. Please try again.';
          EventBus.getInstance().trigger(EVENTS.ajax_error, errorMessage);
          reject(errorMessage);
        },
      );
    });
  },

  _startFirstFreeRiftRun: function () {
    return new Promise(function (resolve, reject) {
      var request = requestJson({
        url: process.env.API_URL + '/api/me/rift/runs/free',
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
      });

      request.then(
        function (response) {
          Analytics.track('claim free rift run', {
            category: Analytics.EventCategory.Rift,
          });
          resolve(response);
        },
        function () {
          // Temporary error, should parse server response.
          var errorMessage =
            'Oops... there was a problem starting your free run. Please try again.';
          EventBus.getInstance().trigger(EVENTS.ajax_error, errorMessage);
          reject(errorMessage);
        },
      );
    });
  },

  /* endregion START A RUN */
});

module.exports = RiftShell;
