'use strict';

var NavigationManager = require('apps/client/ui/managers/navigation_manager');
var Logger = require('@duelyst/common/logger');
var Templ = require('./templates/quest_log_empty.hbs');

var QuestLogEmptyView = Backbone.Marionette.ItemView.extend({
  template: Templ,

  initialize: function () {},
});

// Expose the class either via CommonJS or the global object
module.exports = QuestLogEmptyView;
