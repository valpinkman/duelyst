// pragma PKGS: alwaysloaded

'use strict';

var RSX = require('@duelyst/data/resources');
var GAME_TIPS = require('@duelyst/data/game_tips');
var Animations = require('../animations');
var LoadingDialogViewTempl = require('../../templates/item/loading_dialog.hbs');
var NavigationManager = require('../../managers/navigation_manager');

var LoadingDialogItemView = Backbone.Marionette.ItemView.extend({
  id: 'app-loading-dialog',
  className: 'dialog',

  template: LoadingDialogViewTempl,

  animateIn: Animations.fadeIn,
  animateOut: Animations.fadeOut,

  initialize: function () {
    this.model = new Backbone.Model({
      tip: this.options.tip || GAME_TIPS.random_tip(),
      background: this.options.background,
    });
  },
});

// Expose the class either via CommonJS or the global object
module.exports = LoadingDialogItemView;
