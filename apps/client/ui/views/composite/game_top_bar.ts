'use strict';

var GameTopBarTmpl = require('apps/client/ui/templates/composite/game_top_bar.hbs');
var ProfileManager = require('apps/client/ui/managers/profile_manager');

var GameTopBarCompositeView = Backbone.Marionette.CompositeView.extend({
  id: 'app-game-topbar',
  template: GameTopBarTmpl,

  onShow: function () {},
});

// Expose the class either via CommonJS or the global object
module.exports = GameTopBarCompositeView;
