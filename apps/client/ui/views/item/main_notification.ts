'use strict';

var Logger = require('@duelyst/common/logger');
var NotificationItemView = require('./notification');

var MainNotificationItemView = NotificationItemView.extend({});

// Expose the class either via CommonJS or the global object
module.exports = MainNotificationItemView;
