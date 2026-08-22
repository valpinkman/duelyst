// pragma PKGS: game

'use strict';

var SDK = require('@duelyst/sdk');
var UtilsJavascript = require('@duelyst/common/utils/utils_javascript');
var CONFIG = require('@duelyst/common/config');
var audio_engine = require('apps/client/audio/audio_engine');
var RSX = require('@duelyst/data/resources');
var NewPlayerManager = require('apps/client/ui/managers/new_player_manager');
var DeckSelectCompositeView = require('./deck_select');

var DeckSelectRankedCompositeView = DeckSelectCompositeView.extend({
  filterLegacy: false,

  _showNewPlayerUI: function () {
    DeckSelectCompositeView.prototype._showNewPlayerUI.call(this);

    if (NewPlayerManager.getInstance().getEmphasizeStarterDecksTab()) {
      var item = this.ui.$deckGroups.children('[data-value="starter"]');
      item.popover({
        content: 'Find your starter decks here.',
        container: this.$el,
        placement: 'bottom',
      });
      item.popover('show');
    }

    var newPlayerManager = NewPlayerManager.getInstance();

    // This currently shouldn't be reached and be disabled, but good safety
    if (!newPlayerManager.canPlayQuickMatch()) {
      this.ui.$deckSelectConfirmCasual.addClass('disabled');
    } else {
      this.ui.$deckSelectConfirmCasual.removeClass('disabled');
    }

    if (!newPlayerManager.canPlayRanked()) {
      // TODO: This needs to also grey out the button
      this.ui.$deckSelectConfirm.addClass('disabled');
    } else {
      this.ui.$deckSelectConfirm.removeClass('disabled');
    }
  },
});

// Expose the class either via CommonJS or the global object
module.exports = DeckSelectRankedCompositeView;
