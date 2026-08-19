/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Challenge = require('app/sdk/challenges/challenge');
const Instruction = require('app/sdk/challenges/instruction');
const MoveAction = require('app/sdk/actions/moveAction');
const AttackAction = require('app/sdk/actions/attackAction');
const PlayCardFromHandAction = require('app/sdk/actions/playCardFromHandAction');
const EndTurnAction = require('app/sdk/actions/endTurnAction');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const Deck = require('app/sdk/cards/deck');
const GameSession = require('app/sdk/gameSession');
const AgentActions = require('app/sdk/agents/agentActions');
const CONFIG = require('app/common/config');
const RSX = require('app/data/resources');
const ChallengeCategory = require('app/sdk/challenges/challengeCategory');
const i18next = require('i18next');

// http://forums.duelyst.com/t/starter-challenge-lyonar-a/7563

class BeginnerFlyingChallenge1 extends Challenge {
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

  static type = 'BeginnerFlyingChallenge1';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction1.General },
      { id: Cards.Spell.AurynNexus },
      { id: Cards.Spell.Tempest },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction4.General },
      { id: Cards.TutorialSpell.TutorialFireOrb },
    ];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 1, y: 3 });
    general1.maxHP = 5;
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 6, y: 2 });
    general2.maxHP = 4;

    this.applyCardToBoard({ id: Cards.Neutral.SpottedDragonlark }, 0, 2, myPlayerId);

    this.applyCardToBoard({ id: Cards.Faction4.AbyssalCrawler }, 5, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 5, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.AbyssalCrawler }, 5, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 6, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 6, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.AbyssalCrawler }, 7, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 7, 2, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Faction4.AbyssalCrawler }, 7, 1, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(0, AgentActions.createAgentSoftActionShowInstructionLabels([{
      label: i18next.t('challenges.beginner_flying_challenge_taunt'),
      isSpeech: true,
      isPersistent: true,
      yPosition: 0.7,
      isOpponent: true,
    },
    ]));
    return this._opponentAgent.addActionForTurn(0, AgentActions.createAgentActionPlayCardFindPosition(0, () => [GameSession.getInstance().getGeneralForPlayer1().getPosition()]));
  }
}
BeginnerFlyingChallenge1.prototype.type = 'BeginnerFlyingChallenge1';
BeginnerFlyingChallenge1.prototype.categoryType = ChallengeCategory.keywords.type;
BeginnerFlyingChallenge1.prototype.name = i18next.t('challenges.beginner_flying_challenge_title');
BeginnerFlyingChallenge1.prototype.description = i18next.t('challenges.beginner_flying_challenge_description');
BeginnerFlyingChallenge1.prototype.iconUrl = RSX.speech_portrait_lyonar_side.img;
BeginnerFlyingChallenge1.prototype._musicOverride = RSX.music_battlemap_vetruv.audio;
BeginnerFlyingChallenge1.prototype.otkChallengeStartMessage = i18next.t('challenges.beginner_flying_challenge_start');
BeginnerFlyingChallenge1.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_flying_challenge_fail'),
];
BeginnerFlyingChallenge1.prototype.battleMapTemplateIndex = 0;
BeginnerFlyingChallenge1.prototype.snapShotOnPlayerTurn = 0;
BeginnerFlyingChallenge1.prototype.startingManaPlayer = CONFIG.MAX_MANA;

module.exports = BeginnerFlyingChallenge1;
