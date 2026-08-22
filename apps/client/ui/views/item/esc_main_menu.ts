'use strict';

var CONFIG = require('@duelyst/common/config');
var Session = require('apps/client/session2');
var SDK = require('@duelyst/sdk');
var RSX = require('@duelyst/data/resources');
var audio_engine = require('apps/client/audio/audio_engine');
var NavigationManager = require('apps/client/ui/managers/navigation_manager');
var EscMainMenuTmpl = require('apps/client/ui/templates/item/esc_main_menu.hbs');
var UtilityMenuItemView = require('./utility_menu');
var ConfirmDialogItemView = require('./confirm_dialog');

var EscMainMenuItemView = UtilityMenuItemView.extend({
  template: EscMainMenuTmpl,

  id: 'app-esc-main-menu',
  className: 'modal duelyst-modal',

  onRender: function () {
    UtilityMenuItemView.prototype.onRender.apply(this, arguments);

    if (window.isDesktop) {
      this.$el.find('.desktop-quit').on('click', this.onDesktopQuitClicked.bind(this));
    } else {
      this.$el.find('.desktop-quit').remove();
    }
  },

  onShow: function () {
    UtilityMenuItemView.prototype.onShow.apply(this, arguments);

    // show ZENDSEK widget
    window.zE && window.zE.show && window.zE.show();

    audio_engine
      .current()
      .play_effect_for_interaction(RSX.sfx_ui_tab_in.audio, CONFIG.SHOW_SFX_PRIORITY);
  },

  onDestroy: function () {
    // hide ZENDSEK widget
    window.zE && window.zE.hide && window.zE.hide();
  },

  animateReveal: function () {
    // don't animate reveal esc menu
  },

  onLoggedInRender: function () {
    UtilityMenuItemView.prototype.onLoggedInRender.apply(this, arguments);
    this.$el.find('.logout').on('click', this.onLogoutClicked.bind(this));
  },

  onLoggedOutRender: function () {
    UtilityMenuItemView.prototype.onLoggedOutRender.apply(this, arguments);
    this.$el.find('.logout').addClass('disabled');
  },

  onLogoutClicked: function () {
    var confirmDialogItemView = new ConfirmDialogItemView({
      title: 'Are you sure you want to logout?',
    });
    this.listenToOnce(
      confirmDialogItemView,
      'confirm',
      function () {
        Session.logout();
      }.bind(this),
    );
    this.listenToOnce(
      confirmDialogItemView,
      'cancel',
      function () {
        this.stopListening(confirmDialogItemView);
      }.bind(this),
    );
    NavigationManager.getInstance().showDialogView(confirmDialogItemView);
  },

  onDesktopQuitClicked: function () {
    if (window.isDesktop) {
      var confirmDialogItemView = new ConfirmDialogItemView({
        title: 'Are you sure you want to quit?',
      });
      this.listenToOnce(
        confirmDialogItemView,
        'confirm',
        function () {
          window.quitDesktop();
        }.bind(this),
      );
      this.listenToOnce(
        confirmDialogItemView,
        'cancel',
        function () {
          this.stopListening(confirmDialogItemView);
        }.bind(this),
      );
      NavigationManager.getInstance().showDialogView(confirmDialogItemView);
    }
  },
});

// Expose the class either via CommonJS or the global object
module.exports = EscMainMenuItemView;
