'use strict';

var RankStarTmpl = require('apps/client/ui/templates/item/rank_star.hbs');

var RankStarView = Backbone.Marionette.ItemView.extend({
  tagName: 'li',
  className: 'star',
  template: RankStarTmpl,
});

// Expose the class either via CommonJS or the global object
module.exports = RankStarView;
