'use strict';

var Logger = require('@duelyst/common/logger');
var Animations = require('../animations');
var QuestNotificationItemTmpl = require('../../templates/item/quest_notification.hbs');
var NotificationItemView = require('./notification');

var QuestNotificationItemView = NotificationItemView.extend({
  className: 'notification quest-notification',
  template: QuestNotificationItemTmpl,

  animateIn: Animations.fadeIn,
  animateOut: Animations.fadeOut,
});

// Expose the class either via CommonJS or the global object
module.exports = QuestNotificationItemView;
