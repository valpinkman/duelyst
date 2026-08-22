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
const ModifierOpeningGambitBuffSelfByShadowTileCount = require('@duelyst/sdk/modifiers/modifierOpeningGambitBuffSelfByShadowTileCount');
const i18next = require('i18next');

// http://forums.duelyst.com/t/bad-to-the-bone-gate-2-slot-4/14483

class BeginnerVetruvianChallenge5 extends Challenge {
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

  static type = 'BeginnerVetruvianChallenge5';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction3.General },
      { id: Cards.Neutral.DancingBlades },
      { id: Cards.Neutral.EphemeralShroud },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [{ id: Cards.Faction6.General }, { id: Cards.TutorialSpell.TutorialFireOrb }];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 2, y: 2 });
    general1.maxHP = 25;
    general1.setDamage(25 - 15);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 5, y: 2 });
    general2.maxHP = 25;
    general2.setDamage(25 - 2);

    this.applyCardToBoard({ id: Cards.Faction6.FenrirWarmaster }, 4, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 5, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 5, 3, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 6, 2, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.beginner_vetruvian_5_taunt'),
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
BeginnerVetruvianChallenge5.prototype.type = 'BeginnerVetruvianChallenge5';
BeginnerVetruvianChallenge5.prototype.categoryType = ChallengeCategory.starter.type;
BeginnerVetruvianChallenge5.prototype.name = i18next.t('challenges.beginner_vetruvian_5_title');
BeginnerVetruvianChallenge5.prototype.description = i18next.t(
  'challenges.beginner_vetruvian_5_description',
);
BeginnerVetruvianChallenge5.prototype.iconUrl = RSX.speech_portrait_vetruvian.img;
BeginnerVetruvianChallenge5.prototype._musicOverride = RSX.music_battlemap_vetruv.audio;
BeginnerVetruvianChallenge5.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.beginner_vetruvian_5_start',
);
BeginnerVetruvianChallenge5.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_vetruvian_5_fail'),
];
BeginnerVetruvianChallenge5.prototype.battleMapTemplateIndex = 0;
BeginnerVetruvianChallenge5.prototype.snapShotOnPlayerTurn = 0;
BeginnerVetruvianChallenge5.prototype.startingManaPlayer = 9;
BeginnerVetruvianChallenge5.prototype.startingHandSizePlayer = 4;

module.exports = BeginnerVetruvianChallenge5;
