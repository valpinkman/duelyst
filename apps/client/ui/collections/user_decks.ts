'use strict';

var Logger = require('@duelyst/common/logger');
var DeckModel = require('apps/client/ui/models/deck');
var DuelystFirebase = require('apps/client/ui/extensions/duelyst_firebase');
var DuelystBackbone = require('apps/client/ui/extensions/duelyst_backbone');

var UserDecksCollection = DuelystBackbone.Collection.extend({
  model: DeckModel,
  url: process.env.API_URL + '/api/me/decks',

  comparator: function (a, b) {
    // sort by most recently touched
    var lastTouchedTimestampA = Math.max(a.get('created_at') || 0, a.get('updated_at') || 0);
    var lastTouchedTimestampB = Math.max(b.get('created_at') || 0, b.get('updated_at') || 0);
    return lastTouchedTimestampB - lastTouchedTimestampA;
  },
});

// Expose the class either via CommonJS or the global object
module.exports = UserDecksCollection;
