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
const ModifierSummonWatchByEntityBuffSelf = require('app/sdk/modifiers/modifierSummonWatchByEntityBuffSelf');
const i18next = require('i18next');

// http://forums.duelyst.com/t/gifts-ungiven-basic-otk-gate-2-slot-3/12429

class BeginnerAbyssianChallenge6 extends Challenge {
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

  static type = 'BeginnerAbyssianChallenge6';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction4.General },
      { id: Cards.Spell.CurseOfAgony },
      { id: Cards.Spell.DaemonicLure },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [{ id: Cards.Faction3.General }, { id: Cards.TutorialSpell.TutorialFireOrb }];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 1, y: 1 });
    general1.maxHP = 25;
    general1.setDamage(25 - 6);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 5, y: 2 });
    general2.maxHP = 25;
    general2.setDamage(25 - 3);

    this.applyCardToBoard({ id: Cards.Faction3.Pyromancer }, 3, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction3.SandHowler }, 4, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction3.SandHowler }, 4, 3, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Neutral.KomodoCharger }, 7, 3, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.beginner_abyss_6_taunt'),
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
BeginnerAbyssianChallenge6.prototype.type = 'BeginnerAbyssianChallenge6';
BeginnerAbyssianChallenge6.prototype.categoryType = ChallengeCategory.starter.type;
BeginnerAbyssianChallenge6.prototype.name = i18next.t('challenges.beginner_abyss_6_title');
BeginnerAbyssianChallenge6.prototype.description = i18next.t(
  'challenges.beginner_abyss_6_description',
);
BeginnerAbyssianChallenge6.prototype.iconUrl = RSX.speech_portrait_abyssian.img;
BeginnerAbyssianChallenge6.prototype._musicOverride = RSX.music_battlemap_abyssian.audio;
BeginnerAbyssianChallenge6.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.beginner_abyss_6_start',
);
BeginnerAbyssianChallenge6.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_abyss_6_fail'),
];
BeginnerAbyssianChallenge6.prototype.battleMapTemplateIndex = 2;
BeginnerAbyssianChallenge6.prototype.snapShotOnPlayerTurn = 0;
BeginnerAbyssianChallenge6.prototype.startingManaPlayer = 9;
BeginnerAbyssianChallenge6.prototype.startingHandSizePlayer = 6;

module.exports = BeginnerAbyssianChallenge6;
