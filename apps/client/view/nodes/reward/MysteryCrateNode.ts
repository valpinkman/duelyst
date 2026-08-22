// pragma PKGS: mystery_crate_node

const CONFIG = require('@duelyst/common/config');
const EventBus = require('@duelyst/common/eventbus');
const EVENTS = require('@duelyst/common/event_types');
const RSX = require('@duelyst/data/resources');
const PKGS = require('@duelyst/data/packages');
const BaseSprite = require('apps/client/view/nodes/BaseSprite');
const GlowSprite = require('apps/client/view/nodes/GlowSprite');
const CrateManager = require('apps/client/ui/managers/crate_manager');
const PromiseUtils = require('@duelyst/common/utils/utils_promise');
const { onType } = require('@duelyst/common/utils/utils_promise');
const LootCrateNode = require('./LootCrateNode');

/** **************************************************************************
 MysteryCrateNode
 - abstract base class for mystery loot crates (do not use this class directly)
 *************************************************************************** */

const MysteryCrateNode = LootCrateNode.extend({
  _lootCrateKeySprite: null,
  _showKeyPromise: null,
  _stopShowingKeyPromise: null,

  /* region GETTERS / SETTERS */

  _getLootCrateKeySpriteIdentifier() {
    return null;
  },

  getCrateCount() {
    return CrateManager.getInstance().getCosmeticChestCountForType(this.getCrateType());
  },

  getCrateKeyCount() {
    return CrateManager.getInstance().getCosmeticChestKeyCountForType(this.getCrateType());
  },

  getCrateCountLabelBasePosition() {
    const position = this.getCrateTypeLabelBasePosition();
    position.x += -15.0;
    position.y += -40.0;
    return position;
  },

  getCrateMaxCountLabelBasePosition() {
    const position = this.getCrateCountLabelBasePosition();
    position.x += 31.0;
    return position;
  },

  getUsesKeys() {
    return false;
  },

  /* endregion GETTERS / SETTERS */

  /* region LABELS */

  showCrateMaxCountLabel() {
    LootCrateNode.prototype.showCrateMaxCountLabel.apply(this, arguments);
    this._crateMaxCountLabel.setString('/ 5');
  },

  /* endregion LABELS */

  /* region REWARDS */

  /**
   * Shows key for crate.
   * @param {Number} [duration=0.0]
   * @returns {Promise}
   */
  showKey(duration) {
    if (this._showKeyPromise == null) {
      // cancel hiding key
      if (this._stopShowingKeyPromise != null) {
        this._stopShowingKeyPromise.cancel();
        this._stopShowingKeyPromise = null;
      }

      // create/show key
      this._showKeyPromise = PromiseUtils.cancellable(
        this.whenRequiredResourcesReady().then((requestId) => {
          if (!this.getAreResourcesValid(requestId)) return; // load invalidated or resources changed

          return new Promise<void>((resolve) => {
            this._showKeyPromise = null;

            // key sprite
            if (this._lootCrateKeySprite == null) {
              this._lootCrateKeySprite = BaseSprite.create(this._getLootCrateKeySpriteIdentifier());
              this._lootCrateKeySprite.setVisible(false);
              this._lootCrateKeySprite.setRotation(90.0);
              this.addChild(this._lootCrateKeySprite, this._zOrderBehindCrate);
            }

            // animate key in
            const contentSize = this.getContentSize();
            const centerPosition = this.getCenterPosition();
            this._lootCrateKeySprite.setPosition(
              centerPosition.x,
              centerPosition.y -
                contentSize.height * 0.5 -
                this._lootCrateKeySprite.getContentSize().width * 0.5 -
                30.0,
            );
            this._lootCrateKeySprite.fadeTo(duration, 255.0, () => {
              resolve();
            });
          }).catch((error) => {
            EventBus.getInstance().trigger(EVENTS.error, error);
          });
        }),
      ).catch(
        onType(PromiseUtils.CancellationError, () => {
          Logger.module('APPLICATION').log('MysteryCrateNode -> key show promise chain cancelled');
        }),
      );
    }
    return this._showKeyPromise;
  },

  /**
   * Stops showing key.
   * @param {Number} [duration=0.0]
   * @returns {Promise}
   */
  stopShowingKey(duration) {
    // cancel showing key
    if (this._showKeyPromise != null) {
      this._showKeyPromise.cancel();
      this._showKeyPromise = null;
    }

    // hide key
    if (this._lootCrateKeySprite != null) {
      if (duration == null) {
        duration = 0.0;
      }
      this._stopShowingKeyPromise = PromiseUtils.cancellable(
        this.whenRequiredResourcesReady().then((requestId) => {
          if (!this.getAreResourcesValid(requestId)) return; // load invalidated or resources changed

          return new Promise<void>((resolve) => {
            this._stopShowingKeyPromise = null;
            this._lootCrateKeySprite.fadeToInvisible(duration, () => {
              resolve();
            });
          }).catch((error) => {
            EventBus.getInstance().trigger(EVENTS.error, error);
          });
        }),
      ).catch(
        onType(PromiseUtils.CancellationError, () => {
          Logger.module('APPLICATION').log('MysteryCrateNode -> key hide promise chain cancelled');
        }),
      );
    }

    return this._stopShowingKeyPromise;
  },

  showOpeningAndRewards() {
    return this.showKey(CONFIG.ANIMATE_MEDIUM_DURATION)
      .then(() =>
        // show unlock
        new Promise<void>((resolve) => {
          // show crate as static but preserve fx
          this.showStaticState(CONFIG.ANIMATE_FAST_DURATION, true);

          // animate key into box
          const contentSize = this.getContentSize();
          const centerPosition = this.getCenterPosition();
          this._lootCrateKeySprite.runAction(
            cc.sequence(
              cc.spawn(
                cc.rotateTo(CONFIG.ANIMATE_SLOW_DURATION, 0.0).easing(cc.easeCubicActionInOut()),
                cc
                  .moveBy(CONFIG.ANIMATE_SLOW_DURATION, 0.0, -60.0)
                  .easing(cc.easeCubicActionInOut()),
              ),
              cc
                .moveTo(
                  CONFIG.ANIMATE_MEDIUM_DURATION,
                  centerPosition.x,
                  centerPosition.y - contentSize.height * 0.5,
                )
                .easing(cc.easeBackIn()),
              cc.spawn(
                cc.sequence(cc.fadeOut(CONFIG.ANIMATE_FAST_DURATION), cc.hide()),
                cc.callFunc(() => {
                  resolve();
                }),
              ),
            ),
          );
        }).catch((error) => {
          EventBus.getInstance().trigger(EVENTS.error, error);
        }),
      )
      .then(() =>
        // show actual opening
        LootCrateNode.prototype.showOpeningAndRewards.call(this),
      );
  },

  /* endregion REWARDS */
});

MysteryCrateNode.create = function (node) {
  return LootCrateNode.create(node || new MysteryCrateNode());
};

module.exports = MysteryCrateNode;
