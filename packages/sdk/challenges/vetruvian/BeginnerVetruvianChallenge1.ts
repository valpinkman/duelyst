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
const i18next = require('i18next');

// http://forums.duelyst.com/t/starter-challenge-3-vetruvian/7342

class BeginnerVetruvianChallenge1 extends Challenge {
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

  static type = 'BeginnerVetruvianChallenge1';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction3.General },
      { id: Cards.Artifact.AnkhFireNova },
      { id: Cards.Spell.StarsFury },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [{ id: Cards.Faction4.General }, { id: Cards.TutorialSpell.TutorialFireOrb }];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 2, y: 2 });
    general1.maxHP = 10;
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 6, y: 2 });
    general2.maxHP = 14;

    this.applyCardToBoard({ id: Cards.Faction3.PortalGuardian }, 3, 2, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.AbyssalCrawler }, 5, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.AbyssalCrawler }, 7, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.NightsorrowAssassin }, 6, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.NightsorrowAssassin }, 6, 1, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Faction4.BlackSolus }, 8, 2, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.beginner_vetruvian_1_taunt'),
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
BeginnerVetruvianChallenge1.prototype.type = 'BeginnerVetruvianChallenge1';
BeginnerVetruvianChallenge1.prototype.categoryType = ChallengeCategory.beginner2.type;
BeginnerVetruvianChallenge1.prototype.name = i18next.t('challenges.beginner_vetruvian_1_title');
BeginnerVetruvianChallenge1.prototype.description = i18next.t(
  'challenges.beginner_vetruvian_1_description',
);
BeginnerVetruvianChallenge1.prototype.iconUrl = RSX.speech_portrait_vetruvian.img;
BeginnerVetruvianChallenge1.prototype._musicOverride = RSX.music_battlemap_vetruv.audio;
BeginnerVetruvianChallenge1.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.beginner_vetruvian_1_start',
);
BeginnerVetruvianChallenge1.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_vetruvian_1_fail'),
];
BeginnerVetruvianChallenge1.prototype.battleMapTemplateIndex = 6;
BeginnerVetruvianChallenge1.prototype.snapShotOnPlayerTurn = 0;
BeginnerVetruvianChallenge1.prototype.startingManaPlayer = CONFIG.MAX_MANA;
BeginnerVetruvianChallenge1.prototype.startingHandSizePlayer = 6;

module.exports = BeginnerVetruvianChallenge1;
