// pragma PKGS: game

'use strict';

var CONFIG = require('@duelyst/common/config');
var Logger = require('@duelyst/common/logger');
var RSX = require('@duelyst/data/resources');
var audio_engine = require('../../../audio/audio_engine');
var DuelystFirebase = require('../../extensions/duelyst_firebase');
var RankTmpl = require('../../templates/composite/rank.hbs');
var RankStarItemView = require('../item/rank_star');
var SDK = require('@duelyst/sdk');

// cubic-bezier equivalents of the Penner easings velocity-animate used to take by name
var EASE_IN_SINE = 'cubic-bezier(0.47, 0, 0.745, 0.715)';
var EASE_OUT_SINE = 'cubic-bezier(0.39, 0.575, 0.565, 1)';
var EASE_IN_OUT_SINE = 'cubic-bezier(0.445, 0.05, 0.55, 0.95)';

/**
 * Runs a Web Animations animation on the first element of a `ui` entry.
 * `el.animate()` is a single element API, while velocity animated whole jQuery
 * collections and no-oped on an empty one; Marionette also leaves an unmatched
 * `ui` entry as its selector string. Unwrap defensively so neither throws.
 * @returns {Animation|null}
 */
function animateUIElement($el, keyframes, options) {
  var el = $el instanceof $ ? $el[0] : null;
  if (el == null) {
    return null;
  }
  return el.animate(keyframes, options);
}

function cancelAnimation(animation) {
  if (animation != null) {
    animation.cancel();
  }
}

/**
 * Stands in for velocity's `complete` option. Like velocity on an empty
 * collection, a missing element runs no callback at all.
 * @returns {Animation|null} the animation it was given
 */
function onAnimationFinished(animation, callback) {
  if (animation != null) {
    animation.onfinish = callback;
  }
  return animation;
}

var RankCompositeView = Backbone.Marionette.CompositeView.extend({
  initialize: function () {
    Logger.module('UI').log('initialize a RankCompositeView');
    this.collection = new Backbone.Collection();
    this.showCurrentRank();
    this.showCurrentStars();
  },

  template: RankTmpl,

  childView: RankStarItemView,
  childViewContainer: '.stars-list',

  ui: {
    $rankValue: '.rank-value',
    $symbolRankRingOuter: '.symbol-rank-ring-outer',
    $symbolRankRingInner: '.symbol-rank-ring-inner',
    $symbolRankCenter: '.symbol-rank-center',
    $symbolMedal: '.symbol-medal',
    $imgSymbolMedal: '#img_medal',
  },

  events: {},

  _rank: 0,
  _stars: 0,
  _starsRequired: 0,
  _medal: null,
  _rankValueAnimation: null,
  _rankCenterAnimation: null,
  _rankRingOuterAnimation: null,
  _medalAnimation: null,

  templateHelpers: {
    nextDivisionName: function () {
      var nextRank = _.find(
        this.divisions,
        function (division) {
          if (this.rank > division.rank) return true;
        }.bind(this),
      );

      if (nextRank) return nextRank.name;
      else return '';
    },
    nextDivisionRank: function () {
      var nextRank = _.find(
        this.divisions,
        function (division) {
          if (this.rank > division.rank) return true;
        }.bind(this),
      );

      if (nextRank) return nextRank.rank;
      else return 0;
    },
    progressUntilNextDivision: function () {
      var nextRank = _.find(
        this.divisions,
        function (division) {
          if (this.rank > division.rank) return true;
        }.bind(this),
      );

      if (nextRank) return nextRank.rank - this.rank;
      else return 0;
    },
    shouldShowWinStreakBonus: function () {
      return SDK.RankFactory.areWinStreaksEnabled(this.rank_before);
    },
  },

  /* region BACKBONE EVENTS */

  onRender: function () {
    this._showRank();
    this._showStars();

    // medal is generated from rank
    this._updateMedal(this._rank);
    this._showMedal();
  },

  onShow: function () {
    // velocity's loop:true played the tween back and forth forever
    this._rankCenterAnimation = animateUIElement(
      this.ui.$symbolRankCenter,
      [{ opacity: 0.5 }, { opacity: 1.0 }],
      {
        duration: CONFIG.PULSE_MEDIUM_DURATION * 1000.0,
        easing: EASE_IN_OUT_SINE,
        iterations: Infinity,
        direction: 'alternate',
      },
    );
  },

  onDestroy: function () {
    // cleanup animations
    cancelAnimation(this._rankValueAnimation);
    cancelAnimation(this._rankCenterAnimation);
    cancelAnimation(this._rankRingOuterAnimation);
    cancelAnimation(this._medalAnimation);
    this._rankValueAnimation =
      this._rankCenterAnimation =
      this._rankRingOuterAnimation =
      this._medalAnimation =
        null;
    if (this._rankChangeTimeout != null) {
      clearTimeout(this._rankChangeTimeout);
      this._rankChangeTimeout = null;
    }
  },

  /* endregion BACKBONE EVENTS */

  /* region MODEL to VIEW DATA */

  serializeModel: function (model) {
    var data = model.toJSON.apply(model, _.rest(arguments));

    data.divisions = [
      { name: SDK.RankFactory.rankedDivisionNameForRank(30), rank: 30 },
      { name: SDK.RankFactory.rankedDivisionNameForRank(20), rank: 20 },
      { name: SDK.RankFactory.rankedDivisionNameForRank(10), rank: 10 },
      { name: SDK.RankFactory.rankedDivisionNameForRank(5), rank: 5 },
      { name: SDK.RankFactory.rankedDivisionNameForRank(0), rank: 0 },
    ];

    data.rank = data.rank_before + data.rank_delta;

    for (let i = data.divisions.length - 1; i >= 0; i--) {
      var division = data.divisions[i];
      if (data.rank <= division.rank) {
        data.divisionName = division.name;
        break;
      }
    }

    return data;
  },

  /* endregion MODEL to VIEW DATA */

  /* region CHANGES */

  showStarsAndRankChange: function () {
    // get previous rank and stars
    var previousRank = this.model.get('rank_before');
    var previousStars = this.model.get('rank_stars_before');
    var previousStarsRequired = SDK.RankFactory.starsNeededToAdvanceRank(previousRank);

    // Win streak is already updated so subtract 1,
    // this will not be the correct previous win streak when game was lost, but that won't have a negative impact (currently)
    var previousWinStreak = Math.max(this.model.get('rank_win_streak') - 1, 0);

    // Calculate rank data after game outcome
    var rankDataAfter = SDK.RankFactory.updateRankDataWithGameOutcome(
      {
        rank: previousRank,
        stars: previousStars,
        win_streak: previousWinStreak,
      },
      this.model.get('is_winner'),
      this.model.get('is_draw'),
    );

    // get current rank and stars
    var rank = rankDataAfter.rank;
    var stars = rankDataAfter.stars;
    var starsRequired = SDK.RankFactory.starsNeededToAdvanceRank(rank);

    this._showRankChange(
      previousRank,
      rank,
      rank,
      previousStars,
      stars,
      previousStarsRequired,
      starsRequired,
    );
  },

  _showRankChange: function (
    fromRank,
    toRank,
    finalRank,
    fromStars,
    toStars,
    fromStarsRequired,
    toStarsRequired,
  ) {
    this._updateStarsRequired(fromStarsRequired);
    this._updateRank(fromRank);

    var delta = toRank - fromRank;
    // when fromRank is not yet at finalRank and ranks are different
    if (fromRank !== finalRank && delta !== 0) {
      var dir = delta / Math.abs(delta);

      if (delta < 0) {
        // gained rank, show stars filling up to max then reset to 0
        this._showStarsChange(
          fromStars,
          fromStarsRequired,
          0,
          function () {
            // rotate ring once to show gain in rank
            this._rankRingOuterAnimation = onAnimationFinished(
              animateUIElement(
                this.ui.$symbolRankRingOuter,
                [{ transform: 'rotateZ(0deg)' }, { transform: 'rotateZ(360deg)' }],
                { duration: 750.0, easing: EASE_IN_OUT_SINE, fill: 'forwards' },
              ),
              function () {
                // shift text to simulate counter
                this._rankValueAnimation = onAnimationFinished(
                  animateUIElement(
                    this.ui.$rankValue,
                    [
                      { transform: 'translateY(0px)', opacity: 1 },
                      { transform: 'translateY(-20px)', opacity: 0 },
                    ],
                    { duration: 250.0, easing: EASE_IN_SINE, fill: 'forwards' },
                  ),
                  function () {
                    // set stars to final
                    this._updateStars(0);

                    // play rank change
                    audio_engine.current().play_effect(RSX.sfx_unit_deploy_3.audio, false);

                    // show next rank
                    var nextRank = fromRank + dir;
                    var currentMedal = this._medal;
                    this._updateRank(nextRank);

                    // check if medal has changed
                    if (currentMedal != this._medal) {
                      this._updateMedal(fromRank);

                      // animate medal changing, after velocity's delay; velocity
                      // ran `begin` once the delay elapsed, not when it was queued
                      this._rankChangeTimeout = setTimeout(
                        function () {
                          this._rankChangeTimeout = null;
                          this._updateMedal(nextRank);
                          this._medalAnimation = onAnimationFinished(
                            animateUIElement(
                              this.ui.$symbolMedal,
                              [
                                { opacity: 0, transform: 'scale(5)' },
                                { opacity: 1, transform: 'scale(1)' },
                              ],
                              {
                                duration: 350.0,
                                easing: 'cubic-bezier(0.84, 0.11, 0.3, 1.68)',
                                fill: 'forwards',
                              },
                            ),
                            function () {
                              audio_engine
                                .current()
                                .play_effect(RSX.sfx_deploy_circle1.audio, false);
                              this._showRankChange(
                                nextRank,
                                fromRank + dir * 2,
                                finalRank,
                                0,
                                toStars,
                                toStarsRequired,
                                toStarsRequired,
                              );
                            }.bind(this),
                          );
                        }.bind(this),
                        250.0,
                      );
                    } else {
                      // show next change
                      this._showRankChange(
                        nextRank,
                        fromRank + dir * 2,
                        finalRank,
                        0,
                        toStars,
                        toStarsRequired,
                        toStarsRequired,
                      );
                    }

                    // velocity queued this behind the shift out, so chain it explicitly
                    this._rankValueAnimation = animateUIElement(
                      this.ui.$rankValue,
                      [
                        { transform: 'translateY(20px)', opacity: 0 },
                        { transform: 'translateY(0px)', opacity: 1 },
                      ],
                      { duration: 250.0, easing: EASE_OUT_SINE, fill: 'forwards' },
                    );
                  }.bind(this),
                );
              }.bind(this),
            );
          }.bind(this),
        );
      } else {
        // lost rank, shows stars emptying to 0 then set to current
        this._showStarsChange(
          fromStars,
          0,
          toStars,
          function () {
            // rotate ring once to show loss in rank
            this._rankRingOuterAnimation = onAnimationFinished(
              animateUIElement(
                this.ui.$symbolRankRingOuter,
                [{ transform: 'rotateZ(0deg)' }, { transform: 'rotateZ(-360deg)' }],
                { duration: 750.0, easing: EASE_IN_OUT_SINE, fill: 'forwards' },
              ),
              function () {
                // shift text to simulate counter
                this._rankValueAnimation = onAnimationFinished(
                  animateUIElement(
                    this.ui.$rankValue,
                    [
                      { transform: 'translateY(0px)', opacity: 1 },
                      { transform: 'translateY(20px)', opacity: 0 },
                    ],
                    { duration: 250.0, easing: EASE_IN_SINE, fill: 'forwards' },
                  ),
                  function () {
                    // set stars to final
                    this._updateStars(toStars);

                    // play rank change
                    audio_engine.current().play_effect(RSX.sfx_unit_deploy_1.audio, false);

                    // show next rank
                    this._showRankChange(
                      fromRank + dir,
                      fromRank + dir * 2,
                      finalRank,
                      toStarsRequired,
                      toStars,
                      toStarsRequired,
                      toStarsRequired,
                    );

                    // velocity queued this behind the shift out, so chain it explicitly
                    this._rankValueAnimation = animateUIElement(
                      this.ui.$rankValue,
                      [
                        { transform: 'translateY(-20px)', opacity: 0 },
                        { transform: 'translateY(0px)', opacity: 1 },
                      ],
                      { duration: 250.0, easing: EASE_OUT_SINE, fill: 'forwards' },
                    );
                  }.bind(this),
                );
              }.bind(this),
            );
          }.bind(this),
        );
      }
    } else {
      // only change stars
      this._showStarsChange(fromStars, toStars, toStars);
    }
  },

  _showStarsChange: function (fromStars, toStars, finalStars, callback) {
    this._updateStars(fromStars);

    if (fromStars !== toStars) {
      // step stars fromStars to toStars
      var delta = toStars - fromStars;
      if (delta > 0) {
        for (let i = fromStars + 1; i <= toStars; i++) {
          this._queueCallback(
            this._showStarsChangeGain.bind(this),
            i,
            CONFIG.STARS_SEQUENCE_DELAY * 1000.0,
          );
        }
      } else {
        for (let i = fromStars - 1; i >= toStars; i--) {
          this._queueCallback(
            this._showStarsChangeLoss.bind(this),
            i,
            CONFIG.STARS_SEQUENCE_DELAY * 1000.0,
          );
        }
      }

      // show
      this._queueCallback(
        function () {
          if (callback) {
            callback();
          }
        }.bind(this),
        null,
        CONFIG.STARS_SEQUENCE_DELAY * 1000.0,
      );
    } else if (callback) {
      callback();
    }
  },

  _showStarsChangeGain: function (stars) {
    audio_engine.current().play_effect(RSX.sfx_unit_onclick.audio, false);
    this._updateStars(stars);
  },

  _showStarsChangeLoss: function (stars) {
    audio_engine.current().play_effect(RSX.sfx_unit_onclick.audio, false);
    this._updateStars(stars);
  },

  _queueCallback: function (callback, args, delay) {
    if (!args) {
      args = [];
    } else if (!_.isArray(args)) {
      args = [args];
    }
    return this.$el.delay(delay).queue(function () {
      callback.apply(this, args);
      $(this).dequeue();
    });
  },

  /* endregion CHANGES */

  /* region RANK */

  showCurrentRank: function () {
    var rank = this.model.get('rank_before') + this.model.get('rank_delta');
    this._updateRank(rank);
    this._updateStarsRequired(SDK.RankFactory.starsNeededToAdvanceRank(rank));
  },

  showPreviousRank: function () {
    var prevRank = this.model.get('rank_before');
    this._updateRank(prevRank);
    this._updateStarsRequired(SDK.RankFactory.starsNeededToAdvanceRank(prevRank));
  },

  _updateRank: function (rank) {
    if (this._rank != rank) {
      this._rank = rank;
      this._showRank();
      this._updateMedal(this._rank);
    }
  },

  _showRank: function () {
    // set rank text
    if (this.ui.$rankValue instanceof $) {
      this.ui.$rankValue.text(this._rank);
    }
  },

  _updateMedal: function (rank) {
    var lastMedal = this._medal;

    this._medal = SDK.RankFactory.rankedDivisionAssetNameForRank(rank);

    if (lastMedal != this._medal && this.ui.$imgSymbolMedal instanceof $) {
      this.ui.$symbolMedal.removeClass(lastMedal);
      this._showMedal();
    }
  },

  _showMedal: function () {
    // update medal
    if (this.ui.$imgSymbolMedal instanceof $) {
      this.ui.$symbolMedal.addClass(this._medal);
      this.ui.$imgSymbolMedal.attr(
        'src',
        'resources/season_rewards/season_rank_' + this._medal + '.png',
      );
      this.ui.$imgSymbolMedal.attr(
        'src',
        'resources/season_rewards/season_rank_' + this._medal + '.png',
      );
    }
  },

  /* endregion RANK */

  /* region STARS */

  showCurrentStars: function () {
    this._updateStars(this.model.get('rank_stars_before') + this.model.get('rank_stars_delta'));
  },

  showPreviousStars: function () {
    this._updateStars(this.model.get('rank_stars_before'));
  },

  _updateStars: function (stars) {
    this._stars = stars;
    this._showStars();
  },

  _showStars: function () {
    this.children.each(
      function (childView, index) {
        if (index < this._stars) {
          childView.$el.addClass('active');
        } else {
          childView.$el.removeClass('active');
        }
      }.bind(this),
    );
  },

  _updateStarsRequired: function (starsRequired) {
    this._starsRequired = starsRequired;

    var starModels = [];
    for (let i = 0; i < starsRequired; i++) {
      starModels.push(new Backbone.Model());
    }
    this.collection.reset(starModels);
  },

  /* endregion STARS */
});

// Expose the class either via CommonJS or the global object
module.exports = RankCompositeView;
