/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Challenge = require('@duelyst/sdk/challenges/challenge');
const Instruction = require('@duelyst/sdk/challenges/instruction');
const MoveAction = require('@duelyst/sdk/actions/moveAction');
const AttackAction = require('@duelyst/sdk/actions/attackAction');
const PlayCardFromHandAction = require('@duelyst/sdk/actions/playCardFromHandAction');
const EndTurnAction = require('@duelyst/sdk/actions/endTurnAction');
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const Deck = require('@duelyst/sdk/cards/deck');
const AgentActions = require('@duelyst/sdk/agents/agentActions');
const GameSession = require('@duelyst/sdk/gameSession');
const CONFIG = require('app/common/config');
const RSX = require('app/data/resources');
const ChallengeCategory = require('@duelyst/sdk/challenges/challengeCategory');
const Modifier = require('@duelyst/sdk/modifiers/modifier');
const _ = require('underscore');
const i18next = require('i18next');

// http://forums.duelyst.com/t/malediction-otk-1/11423

class AdvancedAbyssianChallenge1 extends Challenge {
  declare type: any;
  declare categoryType: any;
  declare name: any;
  declare description: any;
  declare iconUrl: any;
  declare _musicOverride: any;
  declare otkChallengeStartMessage: any;
  declare otkChallengeFailureMessages: any;
  declare startingManaPlayer: any;
  declare startingHandSizePlayer: any;
  declare battleMapTemplateIndex: any;
  declare snapShotOnPlayerTurn: any;
  declare usesResetTurn: any;

  static type = 'AdvancedAbyssianChallenge1';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction4.General },
      { id: Cards.Spell.ConsumingRebirth },
      { id: Cards.Spell.DaemonicLure },
      { id: Cards.Faction4.AbyssalCrawler },
      { id: Cards.Spell.CurseOfAgony },
      { id: Cards.Neutral.RepulsionBeast },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [{ id: Cards.Faction1.General }, { id: Cards.TutorialSpell.TutorialFireOrb }];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 2, y: 3 });
    general1.maxHP = 25;
    general1.setDamage(25 - 5);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 8, y: 4 });
    general2.maxHP = 25;
    general2.setDamage(25 - 3);

    this.applyCardToBoard({ id: Cards.Faction4.NightsorrowAssassin }, 1, 0, myPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.SaberspineTiger }, 4, 0, myPlayerId);
    this.applyCardToBoard({ id: Cards.Tile.Shadow }, 4, 2, myPlayerId);

    const rockPulverizer1 = this.applyCardToBoard(
      { id: Cards.Neutral.RockPulverizer },
      4,
      3,
      opponentPlayerId,
    );
    const rockPulverizer2 = this.applyCardToBoard(
      { id: Cards.Neutral.RockPulverizer },
      5,
      2,
      opponentPlayerId,
    );
    const swampEntangler = this.applyCardToBoard(
      { id: Cards.Neutral.VineEntangler },
      7,
      3,
      opponentPlayerId,
    );
    const silverguardKnight = this.applyCardToBoard(
      { id: Cards.Faction1.SilverguardKnight },
      7,
      4,
      opponentPlayerId,
    );
    const primusShieldmaster1 = this.applyCardToBoard(
      { id: Cards.Neutral.PrimusShieldmaster },
      6,
      1,
      opponentPlayerId,
    );
    const primusShieldmaster2 = this.applyCardToBoard(
      { id: Cards.Neutral.PrimusShieldmaster },
      7,
      1,
      opponentPlayerId,
    );
    this.applyCardToBoard({ id: Cards.Spell.WarSurge }, 4, 2, opponentPlayerId);

    const hailStoneHowler = this.applyCardToBoard(
      { id: Cards.Neutral.HailstoneHowler },
      5,
      3,
      opponentPlayerId,
    );
    // Every enemy unit above here has 2 azure horn shaman buffs

    // ironcliffe only has one azure horn shaman buff
    const ironcliffeGuardian = this.applyCardToBoard(
      { id: Cards.Faction1.IroncliffeGuardian },
      8,
      3,
      opponentPlayerId,
    );

    // add first shaman buffs
    let unitsToReceiveBuff = [
      rockPulverizer1,
      rockPulverizer2,
      swampEntangler,
      silverguardKnight,
      hailStoneHowler,
      primusShieldmaster1,
      primusShieldmaster2,
      ironcliffeGuardian,
    ];
    _.each(unitsToReceiveBuff, (unit) => {
      const shamanContextObject = Modifier.createContextObjectWithAttributeBuffs(0, 4);
      shamanContextObject.appliedName = i18next.t('modifiers.neutral_azure_horn_shaman_modifier');
      return gameSession.applyModifierContextObject(shamanContextObject, unit);
    });
    // remove primus and do it again
    unitsToReceiveBuff = _.without(unitsToReceiveBuff, ironcliffeGuardian);
    _.each(unitsToReceiveBuff, (unit) => {
      const shamanContextObject = Modifier.createContextObjectWithAttributeBuffs(0, 4);
      shamanContextObject.appliedName = i18next.t('modifiers.neutral_azure_horn_shaman_modifier');
      return gameSession.applyModifierContextObject(shamanContextObject, unit);
    });

    return swampEntangler.setDamage(1);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.advanced_abyss_1_taunt'),
          isSpeech: true,
          yPosition: 0.7,
          isPersistent: true,
          isOpponent: true,
        },
      ]),
    );
    return this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentActionPlayCardFindPosition(0, () => [
        GameSession.getInstance().getGeneralForPlayer1().getPosition(),
      ]),
    );
  }
}
AdvancedAbyssianChallenge1.prototype.type = 'AdvancedAbyssianChallenge1';
AdvancedAbyssianChallenge1.prototype.categoryType = ChallengeCategory.contest2.type;
AdvancedAbyssianChallenge1.prototype.name = i18next.t('challenges.advanced_abyss_1_title');
AdvancedAbyssianChallenge1.prototype.description = i18next.t(
  'challenges.advanced_abyss_1_description',
);
AdvancedAbyssianChallenge1.prototype.iconUrl = RSX.speech_portrait_abyssian.img;
AdvancedAbyssianChallenge1.prototype._musicOverride = RSX.music_battlemap_abyssian.audio;
AdvancedAbyssianChallenge1.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.advanced_abyss_1_start',
);
AdvancedAbyssianChallenge1.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.advanced_abyss_1_fail'),
];
AdvancedAbyssianChallenge1.prototype.startingManaPlayer = CONFIG.MAX_MANA;
AdvancedAbyssianChallenge1.prototype.startingHandSizePlayer = 6;
AdvancedAbyssianChallenge1.prototype.battleMapTemplateIndex = 0;
AdvancedAbyssianChallenge1.prototype.snapShotOnPlayerTurn = 0;
AdvancedAbyssianChallenge1.prototype.usesResetTurn = false;

module.exports = AdvancedAbyssianChallenge1;
