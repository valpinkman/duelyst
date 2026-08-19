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

// http://forums.duelyst.com/t/abyss-super-creep-medium/8970

class BeginnerAbyssianChallenge4 extends Challenge {
  static type = 'BeginnerAbyssianChallenge4';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction4.General },
      { id: Cards.Spell.SoulshatterPact },
      { id: Cards.Spell.VoidPulse },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction3.General },
      { id: Cards.TutorialSpell.TutorialFireOrb },
    ];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 1, y: 2 });
    general1.maxHP = 25;
    general1.setDamage(25 - 10);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 6, y: 2 });
    general2.maxHP = 25;
    general2.setDamage(25 - 11);

    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 3, 3, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 3, 2, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 3, 1, myPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.PiercingMantis }, 2, 2, myPlayerId);

    this.applyCardToBoard({ id: Cards.Faction3.Pyromancer }, 5, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction3.Dervish }, 5, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction3.Pyromancer }, 5, 1, opponentPlayerId);
    const dunecasterUnit = this.applyCardToBoard({ id: Cards.Faction3.Dunecaster }, 7, 2, opponentPlayerId);
    return this.applyCardToBoard(dunecasterUnit.getCurrentFollowupCard(), 5, 2, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(0, AgentActions.createAgentSoftActionShowInstructionLabels([{
      label: i18next.t('challenges.beginner_abyss_4_taunt'),
      isSpeech: true,
      isPersistent: true,
      yPosition: 0.6,
      isOpponent: true,
    },
    ]));
    return this._opponentAgent.addActionForTurn(0, AgentActions.createAgentActionPlayCardFindPosition(0, () => [GameSession.getInstance().getGeneralForPlayer1().getPosition()]));
  }
}
BeginnerAbyssianChallenge4.prototype.type = 'BeginnerAbyssianChallenge4';
BeginnerAbyssianChallenge4.prototype.categoryType = ChallengeCategory.keywords.type;
BeginnerAbyssianChallenge4.prototype.name = i18next.t('challenges.beginner_abyss_4_title');
BeginnerAbyssianChallenge4.prototype.description = i18next.t('challenges.beginner_abyss_4_description');
BeginnerAbyssianChallenge4.prototype.iconUrl = RSX.speech_portrait_abyssian.img;
BeginnerAbyssianChallenge4.prototype._musicOverride = RSX.music_battlemap_abyssian.audio;
BeginnerAbyssianChallenge4.prototype.otkChallengeStartMessage = i18next.t('challenges.beginner_abyss_4_start');
BeginnerAbyssianChallenge4.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_abyss_4_fail'),
];
BeginnerAbyssianChallenge4.prototype.battleMapTemplateIndex = 0;
BeginnerAbyssianChallenge4.prototype.snapShotOnPlayerTurn = 0;
BeginnerAbyssianChallenge4.prototype.startingManaPlayer = 3;
BeginnerAbyssianChallenge4.prototype.startingHandSizePlayer = 6;

module.exports = BeginnerAbyssianChallenge4;
