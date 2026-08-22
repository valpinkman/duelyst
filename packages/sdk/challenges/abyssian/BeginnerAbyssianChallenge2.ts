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
const GameSession = require('@duelyst/sdk/gameSession');
const AgentActions = require('@duelyst/sdk/agents/agentActions');
const CONFIG = require('@duelyst/common/config');
const RSX = require('app/data/resources');
const ChallengeCategory = require('@duelyst/sdk/challenges/challengeCategory');
const _ = require('underscore');
const i18next = require('i18next');

// http://forums.duelyst.com/t/abyssian-dance-of-shadows/8288

class BeginnerAbyssianChallenge2 extends Challenge {
  declare type: any;
  declare categoryType: any;
  declare name: any;
  declare description: any;
  declare iconUrl: any;
  declare _musicOverride: any;
  declare otkChallengeStartMessage: any;
  declare otkChallengeFailureMessages: any;
  declare battleMapTemplateIndex: any;
  declare snapShotOnPlayerTurn: any;
  declare startingManaPlayer: any;
  declare startingHandSizePlayer: any;

  static type = 'BeginnerAbyssianChallenge2';

  constructor() {
    super();
    this.hiddenUIElements = _.without(this.hiddenUIElements, 'SignatureCard');
  }

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction4.General },
      { id: Cards.Neutral.SaberspineTiger },
      { id: Cards.Faction4.DeepfireDevourer },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [{ id: Cards.Faction2.General }, { id: Cards.TutorialSpell.TutorialFireOrb }];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 2, y: 2 });
    general1.maxHP = 25;
    general1.setDamage(25 - 4);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 7, y: 2 });
    general2.maxHP = 25;
    general2.setDamage(25 - 16);

    // set signature card to be always ready for this session
    gameSession.getPlayer1().setIsSignatureCardActive(true);

    this.applyCardToBoard({ id: Cards.Faction4.SharianShadowdancer }, 1, 2, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.BloodmoonPriestess }, 2, 0, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.BloodmoonPriestess }, 2, 4, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.GloomChaser }, 3, 2, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 1, 0, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 3, 0, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 1, 4, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 3, 4, myPlayerId);

    this.applyCardToBoard({ id: Cards.Faction2.LanternFox }, 5, 3, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Faction2.LanternFox }, 5, 1, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.beginner_abyss_2_taunt'),
          isSpeech: true,
          yPosition: 0.6,
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
BeginnerAbyssianChallenge2.prototype.type = 'BeginnerAbyssianChallenge2';
BeginnerAbyssianChallenge2.prototype.categoryType = ChallengeCategory.expert.type;
BeginnerAbyssianChallenge2.prototype.name = i18next.t('challenges.beginner_abyss_2_title');
BeginnerAbyssianChallenge2.prototype.description = i18next.t(
  'challenges.beginner_abyss_2_description',
);
BeginnerAbyssianChallenge2.prototype.iconUrl = RSX.speech_portrait_abyssian.img;
BeginnerAbyssianChallenge2.prototype._musicOverride = RSX.music_battlemap_abyssian.audio;
BeginnerAbyssianChallenge2.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.beginner_abyss_2_start',
);
BeginnerAbyssianChallenge2.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_abyss_2_fail'),
];
BeginnerAbyssianChallenge2.prototype.battleMapTemplateIndex = 5;
BeginnerAbyssianChallenge2.prototype.snapShotOnPlayerTurn = 0;
BeginnerAbyssianChallenge2.prototype.startingManaPlayer = CONFIG.MAX_MANA;
BeginnerAbyssianChallenge2.prototype.startingHandSizePlayer = 6;

module.exports = BeginnerAbyssianChallenge2;
