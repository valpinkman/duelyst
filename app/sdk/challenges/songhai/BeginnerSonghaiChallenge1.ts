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

// http://forums.duelyst.com/t/songhype-challenge/8451

class BeginnerSonghaiChallenge1 extends Challenge {
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

  static type = 'BeginnerSonghaiChallenge1';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction2.General },
      { id: Cards.Spell.PhoenixFire },
      { id: Cards.Spell.InnerFocus },
      { id: Cards.Spell.MistDragonSeal },
      { id: Cards.Spell.ManaVortex },
      { id: Cards.Spell.SaberspineSeal },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction5.General },
      { id: Cards.TutorialSpell.TutorialFrozenFinisher },
    ];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 2, y: 2 });
    general1.maxHP = 25;
    general1.setDamage(23);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 6, y: 2 });
    general2.maxHP = 25;

    this.applyCardToBoard({ id: Cards.Faction2.ChakriAvatar }, 3, 1, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction2.MageOfFourWinds }, 3, 3, myPlayerId);

    this.applyCardToBoard({ id: Cards.Faction5.Phalanxar }, 5, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction5.UnstableLeviathan }, 5, 2, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Faction5.VeteranSilithar }, 5, 1, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(0, AgentActions.createAgentSoftActionShowInstructionLabels([{
      label: i18next.t('challenges.beginner_songhai_1_taunt'),
      isSpeech: true,
      yPosition: 0.6,
      isPersistent: true,
      isOpponent: true,
    },
    ]));
    return this._opponentAgent.addActionForTurn(0, AgentActions.createAgentActionPlayCardFindPosition(0, () => [GameSession.getInstance().getGeneralForPlayer1().getPosition()]));
  }
}
BeginnerSonghaiChallenge1.prototype.type = 'BeginnerSonghaiChallenge1';
BeginnerSonghaiChallenge1.prototype.categoryType = ChallengeCategory.advanced.type;
BeginnerSonghaiChallenge1.prototype.name = i18next.t('challenges.beginner_songhai_1_title');
BeginnerSonghaiChallenge1.prototype.description = i18next.t('challenges.beginner_songhai_1_description');
BeginnerSonghaiChallenge1.prototype.iconUrl = RSX.speech_portrait_songhai.img;
BeginnerSonghaiChallenge1.prototype._musicOverride = RSX.music_battlemap_songhai.audio;
BeginnerSonghaiChallenge1.prototype.otkChallengeStartMessage = i18next.t('challenges.beginner_songhai_1_start');
BeginnerSonghaiChallenge1.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_songhai_1_fail'),
];
BeginnerSonghaiChallenge1.prototype.battleMapTemplateIndex = 2;
BeginnerSonghaiChallenge1.prototype.snapShotOnPlayerTurn = 0;
BeginnerSonghaiChallenge1.prototype.startingManaPlayer = 5;
BeginnerSonghaiChallenge1.prototype.startingHandSizePlayer = 6;

module.exports = BeginnerSonghaiChallenge1;
