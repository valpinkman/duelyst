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
const ModifierSummonWatchByEntityBuffSelf = require('@duelyst/sdk/modifiers/modifierSummonWatchByEntityBuffSelf');
const i18next = require('i18next');

// http://forums.duelyst.com/t/gifts-ungiven-basic-otk-gate-2-slot-3/12429

class BeginnerAbyssianChallenge5 extends Challenge {
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

  static type = 'BeginnerAbyssianChallenge5';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction4.General },
      { id: Cards.Spell.SoulshatterPact },
      { id: Cards.Neutral.Crossbones },
      { id: Cards.Neutral.SaberspineTiger },
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
    general1.setPosition({ x: 3, y: 2 });
    general1.maxHP = 25;
    general1.setDamage(25 - 5);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 6, y: 2 });
    general2.maxHP = 25;
    general2.setDamage(25 - 7);

    this.applyCardToBoard({ id: Cards.Neutral.VoidHunter }, 2, 3, myPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.VoidHunter }, 2, 1, myPlayerId);

    this.applyCardToBoard({ id: Cards.Faction2.HamonBlademaster }, 4, 2, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Faction2.Widowmaker }, 5, 2, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.beginner_abyss_5_taunt'),
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
BeginnerAbyssianChallenge5.prototype.type = 'BeginnerAbyssianChallenge5';
BeginnerAbyssianChallenge5.prototype.categoryType = ChallengeCategory.beginner.type;
BeginnerAbyssianChallenge5.prototype.name = i18next.t('challenges.beginner_abyss_5_title');
BeginnerAbyssianChallenge5.prototype.description = i18next.t(
  'challenges.beginner_abyss_5_description',
);
BeginnerAbyssianChallenge5.prototype.iconUrl = RSX.speech_portrait_abyssian.img;
BeginnerAbyssianChallenge5.prototype._musicOverride = RSX.music_battlemap_abyssian.audio;
BeginnerAbyssianChallenge5.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.beginner_abyss_5_start',
);
BeginnerAbyssianChallenge5.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_abyss_5_fail'),
];
BeginnerAbyssianChallenge5.prototype.battleMapTemplateIndex = 0;
BeginnerAbyssianChallenge5.prototype.snapShotOnPlayerTurn = 0;
BeginnerAbyssianChallenge5.prototype.startingManaPlayer = 9;
BeginnerAbyssianChallenge5.prototype.startingHandSizePlayer = 1;

module.exports = BeginnerAbyssianChallenge5;
