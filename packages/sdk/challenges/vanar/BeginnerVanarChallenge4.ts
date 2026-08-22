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
const RSX = require('@duelyst/data/resources');
const ChallengeCategory = require('@duelyst/sdk/challenges/challengeCategory');
const i18next = require('i18next');

// http://forums.duelyst.com/t/starter-challenge-vanar/7519

class BeginnerVanarChallenge4 extends Challenge {
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

  static type = 'BeginnerVanarChallenge4';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction6.General },
      { id: Cards.Faction6.WyrBeast },
      { id: Cards.Spell.BonechillBarrier },
      { id: Cards.Neutral.SaberspineTiger },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [{ id: Cards.Faction5.General }, { id: Cards.TutorialSpell.TutorialFireOrb }];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 0, y: 0 });
    general1.maxHP = 25;
    general1.setDamage(25 - 1);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 8, y: 4 });
    general2.maxHP = 25;
    general2.setDamage(25 - 3);

    this.applyCardToBoard({ id: Cards.Neutral.Maw }, 2, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.Maw }, 2, 0, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.KomodoCharger }, 3, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.KomodoCharger }, 3, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction5.YoungSilithar }, 4, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction5.YoungSilithar }, 4, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction5.EarthWalker }, 5, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction5.EarthWalker }, 5, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction5.Grimrock }, 6, 4, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Faction5.Grimrock }, 6, 2, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.beginner_vanar_4_taunt'),
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
BeginnerVanarChallenge4.prototype.type = 'BeginnerVanarChallenge4';
BeginnerVanarChallenge4.prototype.categoryType = ChallengeCategory.beginner.type;
BeginnerVanarChallenge4.prototype.name = i18next.t('challenges.beginner_vanar_4_title');
BeginnerVanarChallenge4.prototype.description = i18next.t(
  'challenges.beginner_vanar_4_description',
);
BeginnerVanarChallenge4.prototype.iconUrl = RSX.speech_portrait_vanar.img;
BeginnerVanarChallenge4.prototype._musicOverride = RSX.music_battlemap_vanar.audio;
BeginnerVanarChallenge4.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.beginner_vanar_4_start',
);
BeginnerVanarChallenge4.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_vanar_4_fail'),
];
BeginnerVanarChallenge4.prototype.battleMapTemplateIndex = 0;
BeginnerVanarChallenge4.prototype.snapShotOnPlayerTurn = 0;
BeginnerVanarChallenge4.prototype.startingManaPlayer = 7;
BeginnerVanarChallenge4.prototype.startingHandSizePlayer = 4;

module.exports = BeginnerVanarChallenge4;
