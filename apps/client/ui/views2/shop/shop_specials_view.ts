// pragma PKGS: shop

'use strict';

var _ = require('underscore');
var moment = require('moment');
var CONFIG = require('@duelyst/common/config');
var RSX = require('@duelyst/data/resources');
var ShopData = require('@duelyst/data/shop.json');
var audio_engine = require('apps/client/audio/audio_engine');
var SDK = require('@duelyst/sdk');
var NavigationManager = require('apps/client/ui/managers/navigation_manager');
var ProfileManager = require('apps/client/ui/managers/profile_manager');
var ShopManager = require('apps/client/ui/managers/shop_manager');
var InventoryManager = require('apps/client/ui/managers/inventory_manager');
var NewPlayerManager = require('apps/client/ui/managers/new_player_manager');
var i18next = require('i18next');
var Template = require('./templates/shop_specials_view.hbs');

var ShopSpecialsView = Backbone.Marionette.ItemView.extend({
  className: 'shop-specials-container',
  selectedSubCategory: null,
  initialSubCategory: null,
  template: Template,
  tooltipElement: null,
  events: {
    'click button': 'onSelectProduct',
    'click .nav-tabs li': 'onSubCategoryChanged',
  },

  /* ui selector cache */
  ui: {
    tabs: '.nav-tabs',
    tabBody: '.tab-body',
  },

  serializeModel: function (model) {
    // var data =  model.toJSON.apply(model, _.rest(arguments))
    // var keys = _.keys(data)
    // var specials = []
    // _.each(keys,function(k){
    //   specials.push(data[k])
    // })

    return {
      specials: ShopManager.getInstance().availableSpecials.toJSON(),
    };
  },

  initialize: function (opts) {
    this.listenTo(
      ShopManager.getInstance().availableSpecials,
      'add remove',
      this.render.bind(this),
    );
  },

  onShow: function () {
    this.setSubCategory(this.initialSubCategory);
    ShopManager.getInstance().availableSpecials.each(function (m) {
      NewPlayerManager.getInstance().setModuleStage(m.id.toLowerCase(), 'read');
    });
  },

  onPrepareForDestroy: function () {},

  /* region PURCHASE */

  onSelectProduct: function (e) {
    const _self = this;
    var productSku = $(e.currentTarget).data('product-sku');
    var productData = ShopData.earned_specials[productSku];

    var packProductData = _.extend(
      {
        cover_image_url: 'resources/play/play_mode_rankedladder.jpg',
      },
      productData,
    );

    packProductData = _.extend(packProductData, {
      name: i18next.t('shop.' + productData.name),
      description: i18next.t('shop.' + productData.description),
    });

    return NavigationManager.getInstance()
      .showDialogForConfirmPurchase(packProductData)
      .then(function (purchaseData) {
        _self.onPurchaseComplete(purchaseData);
      })
      .catch(function () {
        // do nothing on cancel
      });
  },

  onPurchaseComplete: function (purchaseData) {},

  /* endregion PURCHASE */

  onSubCategoryChanged: function (e) {
    var button = $(e.currentTarget);
    var selectedValue = button.data('value');
    audio_engine
      .current()
      .play_effect_for_interaction(RSX.sfx_ui_tab_in.audio, CONFIG.SELECT_SFX_PRIORITY);
    this.setSubCategory(selectedValue);
  },

  setSubCategory: function (selectedValue) {
    if (selectedValue !== this.selectedSubCategory) {
      this.selectedSubCategory = selectedValue;
      $('li', this.ui.tabs).removeClass('active');
      this.ui.tabs.find("[data-value='" + selectedValue + "']").addClass('active');

      $('div.shop-spirit-orbs', this.ui.tabBody).addClass('hide');
      $('div.' + selectedValue, this.ui.tabBody).removeClass('hide');
    }
  },
});

module.exports = ShopSpecialsView;
