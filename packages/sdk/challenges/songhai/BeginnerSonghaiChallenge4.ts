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

// http://forums.duelyst.com/t/songhype-challenge/8451

class BeginnerSonghaiChallenge4 extends Challenge {
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

  static type = 'BeginnerSonghaiChallenge4';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction2.General },
      { id: Cards.Neutral.PlanarScout },
      { id: Cards.Spell.InnerFocus },
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
    general1.setPosition({ x: 2, y: 2 });
    general1.maxHP = 25;
    general1.setDamage(24);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 6, y: 2 });
    general2.maxHP = 25;
    general2.setDamage(25 - 2);

    this.applyCardToBoard({ id: Cards.Faction1.SilverguardKnight }, 5, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction1.WindbladeAdept }, 5, 2, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Faction1.SilverguardKnight }, 5, 1, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.beginner_songhai_4_taunt'),
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
BeginnerSonghaiChallenge4.prototype.type = 'BeginnerSonghaiChallenge4';
BeginnerSonghaiChallenge4.prototype.categoryType = ChallengeCategory.keywords.type;
BeginnerSonghaiChallenge4.prototype.name = i18next.t('challenges.beginner_songhai_4_title');
BeginnerSonghaiChallenge4.prototype.description = i18next.t(
  'challenges.beginner_songhai_4_description',
);
BeginnerSonghaiChallenge4.prototype.iconUrl = RSX.speech_portrait_songhai.img;
BeginnerSonghaiChallenge4.prototype._musicOverride = RSX.music_battlemap_songhai.audio;
BeginnerSonghaiChallenge4.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.beginner_songhai_4_start',
);
BeginnerSonghaiChallenge4.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_songhai_4_fail'),
];
BeginnerSonghaiChallenge4.prototype.battleMapTemplateIndex = 0;
BeginnerSonghaiChallenge4.prototype.snapShotOnPlayerTurn = 0;
BeginnerSonghaiChallenge4.prototype.startingManaPlayer = 6;
BeginnerSonghaiChallenge4.prototype.startingHandSizePlayer = 6;

module.exports = BeginnerSonghaiChallenge4;
