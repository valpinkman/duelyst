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

// http://forums.duelyst.com/t/starter-challenge-vanar/7519

class BeginnerAbyssianChallenge1 extends Challenge {
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

  static type = 'BeginnerAbyssianChallenge1';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction4.General },
      { id: Cards.Spell.CurseOfAgony },
      { id: Cards.Spell.RitualBanishing },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction1.General },
      { id: Cards.TutorialSpell.TutorialFireOrb },
    ];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 3, y: 2 });
    general1.maxHP = 10;
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 6, y: 2 });
    general2.maxHP = 11;

    this.applyCardToBoard({ id: Cards.Faction4.AbyssalCrawler }, 2, 2, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.ShadowWatcher }, 4, 2, myPlayerId);

    this.applyCardToBoard({ id: Cards.Faction1.WindbladeAdept }, 5, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction1.IroncliffeGuardian }, 5, 2, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Faction1.AzuriteLion }, 5, 1, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(0, AgentActions.createAgentSoftActionShowInstructionLabels([{
      label: i18next.t('challenges.beginner_abyss_1_taunt'),
      isSpeech: true,
      yPosition: 0.6,
      isPersistent: true,
      isOpponent: true,
    },
    ]));
    return this._opponentAgent.addActionForTurn(0, AgentActions.createAgentActionPlayCardFindPosition(0, () => [GameSession.getInstance().getGeneralForPlayer1().getPosition()]));
  }
}
BeginnerAbyssianChallenge1.prototype.type = 'BeginnerAbyssianChallenge1';
BeginnerAbyssianChallenge1.prototype.categoryType = ChallengeCategory.beginner2.type;
BeginnerAbyssianChallenge1.prototype.name = i18next.t('challenges.beginner_abyss_1_title');
BeginnerAbyssianChallenge1.prototype.description = i18next.t('challenges.beginner_abyss_1_description');
BeginnerAbyssianChallenge1.prototype.iconUrl = RSX.speech_portrait_abyssian.img;
BeginnerAbyssianChallenge1.prototype._musicOverride = RSX.music_battlemap_abyssian.audio;
BeginnerAbyssianChallenge1.prototype.otkChallengeStartMessage = i18next.t('challenges.beginner_abyss_1_start');
BeginnerAbyssianChallenge1.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_abyss_1_fail'),
];
BeginnerAbyssianChallenge1.prototype.battleMapTemplateIndex = 5;
BeginnerAbyssianChallenge1.prototype.snapShotOnPlayerTurn = 0;
BeginnerAbyssianChallenge1.prototype.startingManaPlayer = CONFIG.MAX_MANA;
BeginnerAbyssianChallenge1.prototype.startingHandSizePlayer = 6;

module.exports = BeginnerAbyssianChallenge1;
