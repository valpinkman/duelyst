const SDK = require('@duelyst/sdk');
const Entity = require('@duelyst/sdk/entities/entity');
const ModifierAirdrop = require('@duelyst/sdk/modifiers/modifierAirdrop');
const ModifierProvoked = require('@duelyst/sdk/modifiers/modifierProvoked');
const ModifierDyingWish = require('@duelyst/sdk/modifiers/modifierDyingWish');
const ModifierEphemeral = require('@duelyst/sdk/modifiers/modifierEphemeral');
const ModifierOpeningGambit = require('@duelyst/sdk/modifiers/modifierOpeningGambit');
const ModifierStunned = require('@duelyst/sdk/modifiers/modifierStunned');
const ModifierTransformed = require('@duelyst/sdk/modifiers/modifierTransformed');
const ModifierWall = require('@duelyst/sdk/modifiers/modifierWall');
const ModifierFirstBlood = require('@duelyst/sdk/modifiers/modifierFirstBlood');
const ModifierStrikeback = require('@duelyst/sdk/modifiers/modifierStrikeback');
const ModifierProvoke = require('@duelyst/sdk/modifiers/modifierProvoke');
const ModifierRanged = require('@duelyst/sdk/modifiers/modifierRanged');
const ModifierCelerity = require('@duelyst/sdk/modifiers/modifierTranscendance');
const ModifierBlastAttack = require('@duelyst/sdk/modifiers/modifierBlastAttack');
const ModifierDeathWatch = require('@duelyst/sdk/modifiers/modifierDeathWatch');
const ModifierDeathWatchSpawnEntity = require('@duelyst/sdk/modifiers/modifierDeathWatchSpawnEntity');
const ModifierSpellWatch = require('@duelyst/sdk/modifiers/modifierSpellWatch');
const ModifierGrow = require('@duelyst/sdk/modifiers/modifierGrow');
const ModifierFrenzy = require('@duelyst/sdk/modifiers/modifierFrenzy');
const ModifierBackstab = require('@duelyst/sdk/modifiers/modifierBackstab');
const ModifierHealWatchBuffSelf = require('@duelyst/sdk/modifiers/modifierHealWatchBuffSelf');
const ModifierHealWatch = require('@duelyst/sdk/modifiers/modifierHealWatch');
const ModifierRebirth = require('@duelyst/sdk/modifiers/modifierRebirth');
const ModifierFactory = require('@duelyst/sdk/modifiers/modifierFactory');
const ModifierFlying = require('@duelyst/sdk/modifiers/modifierFlying');
const ScoreForUnit = require('./unit');
const BOUNTY = require('../bounty');

/**
 * Returns the score for removing a unit.
 * @param {Card} card
 * @param {Card} targetCard
 * @param {Number} amount
 * @param {Boolean} [rebase=false]
 * @returns {Number}
 * @static
 * @public
 */
const ScoreForApplyModifiers = function (card, targetCard, amount, modifierTypes) {
  let score = 0;
  let modifierScore = 0;
  // var gameSession = SDK.GameSession.getInstance();

  for (let i = 0; i < modifierTypes.length; i++) {
    const modifierType = modifierTypes[i];
    const modifier = ModifierFactory.modifierForType(modifierType, SDK.GameSession.create());
    if (modifier instanceof ModifierAirdrop) {
      modifierScore += BOUNTY.MODIFIER_AIRDROP;
    } else if (modifier instanceof ModifierProvoke) {
      modifierScore += BOUNTY.MODIFIER_PROVOKE;
    } else if (modifier instanceof ModifierFirstBlood) {
      modifierScore += BOUNTY.MODIFIER_RUSH;
    } else if (modifier instanceof ModifierRanged) {
      modifierScore += BOUNTY.MODIFIER_RANGED;
    } else if (modifier instanceof ModifierCelerity) {
      modifierScore += BOUNTY.MODIFIER_CELERITY;
    } else if (modifier instanceof ModifierBlastAttack) {
      modifierScore += BOUNTY.MODIFIER_BLAST;
    } else if (modifier instanceof ModifierDeathWatch) {
      modifierScore += BOUNTY.MODIFIER_DEATHWATCH;
    } else if (modifier instanceof ModifierGrow) {
      modifierScore += BOUNTY.MODIFIER_GROW;
    } else if (modifier instanceof ModifierBackstab) {
      modifierScore += BOUNTY.MODIFIER_BACKSTAB;
    } else if (modifier instanceof ModifierRebirth) {
      modifierScore += BOUNTY.MODIFIER_REBIRTH;
    } else if (modifier instanceof ModifierFlying) {
      modifierScore += BOUNTY.MODIFIER_FLYING;
    } else {
      modifierScore += BOUNTY.MODIFIER_GENERIC;
    }
    // etc
  }

  if (targetCard instanceof Entity) {
    score += modifierScore * amount;
  }

  return score;
};

module.exports = ScoreForApplyModifiers;
