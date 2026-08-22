'use strict';

var StatsFactionItemView = require('../item/stats_faction');
var StatsFactionsCompositeViewTempl = require('../../templates/composite/stats_factions.hbs');

var StatsFactionsCompositeView = Backbone.Marionette.CompositeView.extend({
  className: 'stats-factions',

  template: StatsFactionsCompositeViewTempl,

  childView: StatsFactionItemView,
  childViewContainer: '.factions',
});

// Expose the class either via CommonJS or the global object
module.exports = StatsFactionsCompositeView;
