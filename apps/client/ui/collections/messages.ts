'use strict';

var Logger = require('@duelyst/common/logger');
var Message = require('apps/client/ui/models/message');
var DuelystFirebase = require('apps/client/ui/extensions/duelyst_firebase');

var Messages = DuelystFirebase.Collection.extend({
  model: Message,
  initialize: function () {
    Logger.module('UI').log('initialize a Messages collection');
  },
});

// Expose the class either via CommonJS or the global object
module.exports = Messages;
