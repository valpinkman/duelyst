'use strict';

var SDK = require('@duelyst/sdk');
var Animations = require('../animations');
var GameFollowupTemplate = require('../../templates/item/game_followup.hbs');

var GameFollowupItemView = Backbone.Marionette.ItemView.extend({
  id: 'app-followup',
  className: 'modal duelyst-modal',

  template: GameFollowupTemplate,

  animateOut: Animations.fadeOut,

  initialize: function (options) {
    var followupCard = options.followupCard;
    if (followupCard instanceof SDK.Card) {
      this.model.set('description', 'Choose a Target');
    }
  },

  onShow: function () {
    // Don't show skip or cancel in tutorial
    if (SDK.GameSession.getInstance().isTutorial()) {
      this.$el.find('button.btn-user-cancel').remove();
      this.$el.find('button.btn-user-skip').remove();
    }
  },
});

// Expose the class either via CommonJS or the global object
module.exports = GameFollowupItemView;
