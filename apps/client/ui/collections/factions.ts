'use strict';

var Logger = require('@duelyst/common/logger');
var SDK = require('@duelyst/sdk');
var FactionModel = require('apps/client/ui/models/faction');
var CONFIG = require('@duelyst/common/config');

var FactionsCollection = Backbone.Collection.extend({
  model: FactionModel,

  initialize: function () {
    Logger.module('UI').log('initialize a Factions collection');
  },

  /**
   * Adds all enabled factions to this collection.
   */
  addAllFactionsToCollection: function () {
    var factions = SDK.FactionFactory.getAllEnabledFactions();
    for (var i = 0, il = factions.length; i < il; i++) {
      var faction = factions[i];
      this.add(faction);
    }
  },

  comparator: function (a, b) {
    // sort by non-neutrality then id ascending
    return a.get('isNeutral') - b.get('isNeutral') || a.get('id') - b.get('id');
  },
});

// Expose the class either via CommonJS or the global object
module.exports = FactionsCollection;
