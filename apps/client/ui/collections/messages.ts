'use strict';

var Logger = require('@duelyst/common/logger');
var Message = require('../models/message');
var DuelystFirebase = require('../extensions/duelyst_firebase');

var Messages = DuelystFirebase.Collection.extend({
  model: Message,
  initialize: function () {
    Logger.module('UI').log('initialize a Messages collection');
  },
});

// Expose the class either via CommonJS or the global object
module.exports = Messages;
