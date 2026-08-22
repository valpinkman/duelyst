'use strict';

var EmotesListTempl = require('../../templates/composite/emotes-list.hbs');
var EmoteItemView = require('../item/emote');
var Animations = require('../animations');

var EmotesListCompositeView = Backbone.Marionette.CompositeView.extend({
  className: 'emotes-list',

  template: EmotesListTempl,

  childView: EmoteItemView,

  // animateIn: Animations.fadeIn,
  // animateOut: Animations.fadeOut
});

// Expose the class either via CommonJS or the global object
module.exports = EmotesListCompositeView;
