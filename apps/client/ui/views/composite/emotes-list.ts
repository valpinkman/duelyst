'use strict';

var EmotesListTempl = require('apps/client/ui/templates/composite/emotes-list.hbs');
var EmoteItemView = require('apps/client/ui/views/item/emote');
var Animations = require('apps/client/ui/views/animations');

var EmotesListCompositeView = Backbone.Marionette.CompositeView.extend({
  className: 'emotes-list',

  template: EmotesListTempl,

  childView: EmoteItemView,

  // animateIn: Animations.fadeIn,
  // animateOut: Animations.fadeOut
});

// Expose the class either via CommonJS or the global object
module.exports = EmotesListCompositeView;
