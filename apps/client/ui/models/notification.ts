'use strict';

var RSX = require('@duelyst/data/resources');
var { onValue } = require('../../firebase');

var NotificationModel = Backbone.Model.extend({
  initialize: function () {
    // if the underlying firebase reference this notification is based on is removed, then destroy this notification
    // TODO: @eanticev: this gets called once to load data even though the data is already loaded and passed here... I may need to refactor this.
    if (this.get('firebaseRef')) {
      this._stopFirebaseListener = onValue(
        this.get('firebaseRef'),
        this.firebaseValueChanged.bind(this),
      );
      // a node already gone is reported from the cache inside onValue()
      if (this._firebaseRemoved) this._stopFirebaseListener();
    }
  },

  firebaseValueChanged: function (snapshot) {
    if (snapshot.val() == null) {
      this._firebaseRemoved = true;
      if (this._stopFirebaseListener) this._stopFirebaseListener();
      this.destroy();
    }
  },

  defaults: {
    message: 'Notification',
    audio: RSX.sfx_ui_notification.audio,
  },
});

// Expose the class either via CommonJS or the global object
module.exports = NotificationModel;
