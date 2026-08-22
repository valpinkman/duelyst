var _ = require('underscore');
const PromiseUtils = require('@duelyst/common/utils/utils_promise');

/*
 * `Backbone` is a vendor global typed `any` (app/types/globals.d.ts), so the
 * two constructors below are built untyped and the shape they are published
 * under is stated once, here. Consumers annotate their require:
 *
 *     var DuelystBackbone: DuelystBackboneStatic = require('...');
 *     var model = new DuelystBackbone.Model<WalletAttributes>();
 *
 * and `model.get('gold_amount')` is checked from that point on.
 * `DuelystBackboneStatic` and the attribute types live in
 * app/types/backbone_models.d.ts.
 */
Backbone.Duelyst = {};

Backbone.Duelyst.Model = Backbone.Model.extend({
  constructor: function () {
    this.isSynced = false;
    this.listenToOnce(
      this,
      'sync',
      function () {
        this.isSynced = true;
        this.stopListening(this, 'error', this.onReadyError);
        this.trigger('ready');
      }.bind(this),
    );
    this.listenToOnce(this, 'error', this.onReadyError);
    Backbone.Model.apply(this, arguments);
  },

  onReadyError: function (model, resp, options) {
    this.trigger('ready_error', resp);
  },

  onSyncOrReady: function (callback) {
    var p = new Promise(
      function (resolve, reject) {
        if (this.isSynced) {
          resolve(this);
        } else {
          this.listenToOnce(this, 'ready', function () {
            resolve(this);
          });
          this.listenToOnce(this, 'ready_error', function (resp) {
            if (resp && resp.responseJSON && resp.responseJSON.message) {
              reject(new Error(resp.responseJSON.message));
            } else {
              reject(new Error('error loading data'));
            }
          });
        }
      }.bind(this),
    );
    PromiseUtils.nodeify(p, callback);
    return p;
  },
});

Backbone.Duelyst.Collection = Backbone.Collection.extend({
  constructor: function () {
    this.isSynced = false;
    this.listenToOnce(
      this,
      'sync',
      function () {
        this.isSynced = true;
        this.stopListening(this, 'error', this.onReadyError);
        this.trigger('ready');
      }.bind(this),
    );
    this.listenToOnce(this, 'error', this.onReadyError);
    Backbone.Collection.apply(this, arguments);
  },

  onReadyError: function (model, resp, options) {
    this.trigger('ready_error', resp);
  },

  onSyncOrReady: function (callback) {
    var p = new Promise(
      function (resolve, reject) {
        if (this.isSynced) {
          resolve(this);
        } else {
          this.listenToOnce(this, 'ready', function () {
            resolve(this);
          });
          this.listenToOnce(this, 'ready_error', function (resp) {
            if (resp && resp.responseJSON && resp.responseJSON.message) {
              reject(new Error(resp.responseJSON.message));
            } else {
              reject(new Error('error loading data'));
            }
          });
        }
      }.bind(this),
    );
    PromiseUtils.nodeify(p, callback);
    return p;
  },
});

// Expose the class either via CommonJS or the global object
const DuelystBackbone: DuelystBackboneStatic = Backbone.Duelyst;
module.exports = DuelystBackbone;
