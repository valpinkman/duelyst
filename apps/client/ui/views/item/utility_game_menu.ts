'use strict';

var Logger = require('@duelyst/common/logger');
var CONFIG = require('@duelyst/common/config');
var UtilityGameMenuTmpl = require('../../templates/item/utility_game_menu.hbs');
var NavigationManager = require('../../managers/navigation_manager');
var UtilsEngine = require('@duelyst/common/utils/utils_engine');
var UtilityMenuItemView = require('./utility_menu');
var GameMenuItemView = require('./esc_game_menu');

/**
 * In game utility menu that shows basic utilities plus buttons to exit/concede.
 */
var UtilityGameMenuItemView = UtilityMenuItemView.extend({
  id: 'app-utility-game-menu',

  template: UtilityGameMenuTmpl,

  events: {
    'click button.menu': 'toggleGameMenu',
  },

  /* region LAYOUT */

  onResize: function () {
    var endPosition = UtilsEngine.getCardsInHandEndPositionForCSS();
    this.$el.css(
      'transform',
      'translate(' +
        (endPosition.x - 40.0) / 10.0 +
        'rem, ' +
        (-endPosition.y + CONFIG.HAND_CARD_SIZE * 0.54) / 10.0 +
        'rem)',
    );
  },

  /* endregion LAYOUT */

  toggleGameMenu: function () {
    NavigationManager.getInstance().toggleModalViewByClass(GameMenuItemView);
  },

  /* region MARIONETTE EVENTS */

  /* endregion MARIONETTE EVENTS */
});

// Expose the class either via CommonJS or the global object
module.exports = UtilityGameMenuItemView;
