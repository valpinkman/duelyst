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
const CONFIG = require('app/common/config');
const RSX = require('app/data/resources');
const ChallengeCategory = require('@duelyst/sdk/challenges/challengeCategory');
const i18next = require('i18next');

// http://forums.duelyst.com/t/starter-challenge-vanar/7519

class BeginnerVanarChallenge5 extends Challenge {
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

  static type = 'BeginnerVanarChallenge5';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction6.General },
      { id: Cards.Faction6.HearthSister },
      { id: Cards.Neutral.VineEntangler },
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
    general1.setPosition({ x: 0, y: 2 });
    general1.maxHP = 25;
    general1.setDamage(25 - 10);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 6, y: 2 });
    general2.maxHP = 25;
    general2.setDamage(25 - 14);

    this.applyCardToBoard({ id: Cards.Faction6.ArcticRhyno }, 1, 2, myPlayerId);

    return this.applyCardToBoard({ id: Cards.Neutral.HailstoneHowler }, 3, 2, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.beginner_vanar_5_taunt'),
          isSpeech: true,
          isPersistent: true,
          yPosition: 0.6,
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
BeginnerVanarChallenge5.prototype.type = 'BeginnerVanarChallenge5';
BeginnerVanarChallenge5.prototype.categoryType = ChallengeCategory.starter.type;
BeginnerVanarChallenge5.prototype.name = i18next.t('challenges.beginner_vanar_5_title');
BeginnerVanarChallenge5.prototype.description = i18next.t(
  'challenges.beginner_vanar_5_description',
);
BeginnerVanarChallenge5.prototype.iconUrl = RSX.speech_portrait_vanar.img;
BeginnerVanarChallenge5.prototype._musicOverride = RSX.music_battlemap_vanar.audio;
BeginnerVanarChallenge5.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.beginner_vanar_5_start',
);
BeginnerVanarChallenge5.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_vanar_5_fail'),
];
BeginnerVanarChallenge5.prototype.battleMapTemplateIndex = 0;
BeginnerVanarChallenge5.prototype.snapShotOnPlayerTurn = 0;
BeginnerVanarChallenge5.prototype.startingManaPlayer = 9;
BeginnerVanarChallenge5.prototype.startingHandSizePlayer = 6;

module.exports = BeginnerVanarChallenge5;
