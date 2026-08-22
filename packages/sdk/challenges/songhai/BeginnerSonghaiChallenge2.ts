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

// http://forums.duelyst.com/t/songhype-challenge/8451

class BeginnerSonghaiChallenge2 extends Challenge {
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

  static type = 'BeginnerSonghaiChallenge2';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction2.General },
      { id: Cards.Faction2.GoreHorn },
      { id: Cards.Spell.SaberspineSeal },
      { id: Cards.Spell.MistDragonSeal },
      { id: Cards.Spell.InnerFocus },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [{ id: Cards.Faction6.General }, { id: Cards.TutorialSpell.TutorialFrozenFinisher }];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 1, y: 3 });
    general1.maxHP = 25;
    general1.setDamage(21);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 6, y: 2 });
    general2.maxHP = 25;
    general2.setDamage(16);

    this.applyCardToBoard({ id: Cards.Faction6.BlazingSpines }, 4, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BlazingSpines }, 5, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 5, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 5, 1, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 6, 3, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.beginner_songhai_2_taunt'),
          isSpeech: true,
          yPosition: 0.6,
          isOpponent: true,
          isPersistent: true,
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
BeginnerSonghaiChallenge2.prototype.type = 'BeginnerSonghaiChallenge2';
BeginnerSonghaiChallenge2.prototype.categoryType = ChallengeCategory.starter.type;
BeginnerSonghaiChallenge2.prototype.name = i18next.t('challenges.beginner_songhai_2_title');
BeginnerSonghaiChallenge2.prototype.description = i18next.t(
  'challenges.beginner_songhai_2_description',
);
BeginnerSonghaiChallenge2.prototype.iconUrl = RSX.speech_portrait_songhai.img;
BeginnerSonghaiChallenge2.prototype._musicOverride = RSX.music_battlemap_songhai.audio;
BeginnerSonghaiChallenge2.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.beginner_songhai_2_start',
);
BeginnerSonghaiChallenge2.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_songhai_2_fail'),
];
BeginnerSonghaiChallenge2.prototype.battleMapTemplateIndex = 2;
BeginnerSonghaiChallenge2.prototype.snapShotOnPlayerTurn = 0;
BeginnerSonghaiChallenge2.prototype.startingManaPlayer = CONFIG.MAX_MANA;
BeginnerSonghaiChallenge2.prototype.startingHandSizePlayer = 6;

module.exports = BeginnerSonghaiChallenge2;
