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
const ModifierOpeningGambitBuffSelfByShadowTileCount = require('@duelyst/sdk/modifiers/modifierOpeningGambitBuffSelfByShadowTileCount');
const i18next = require('i18next');

// http://forums.duelyst.com/t/bad-to-the-bone-gate-2-slot-4/14483

class BeginnerVetruvianChallenge4 extends Challenge {
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

  static type = 'BeginnerVetruvianChallenge4';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction3.General },
      { id: Cards.Spell.BoneSwarm },
      { id: Cards.Spell.AstralPhasing },
      { id: Cards.Neutral.FrostboneNaga },
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
    general1.setPosition({ x: 4, y: 2 });
    general1.maxHP = 25;
    general1.setDamage(25 - 6);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 8, y: 2 });
    general2.maxHP = 25;
    general2.setDamage(25 - 8);

    this.applyCardToBoard({ id: Cards.Neutral.BluetipScorpion }, 1, 2, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction3.OrbWeaver }, 5, 3, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction3.OrbWeaver }, 5, 1, myPlayerId);

    this.applyCardToBoard({ id: Cards.Neutral.PrimusShieldmaster }, 6, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.RockPulverizer }, 7, 3, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Neutral.RockPulverizer }, 7, 1, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.beginner_vetruvian_4_taunt'),
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
BeginnerVetruvianChallenge4.prototype.type = 'BeginnerVetruvianChallenge4';
BeginnerVetruvianChallenge4.prototype.categoryType = ChallengeCategory.beginner.type;
BeginnerVetruvianChallenge4.prototype.name = i18next.t('challenges.beginner_vetruvian_4_title');
BeginnerVetruvianChallenge4.prototype.description = i18next.t(
  'challenges.beginner_vetruvian_4_description',
);
BeginnerVetruvianChallenge4.prototype.iconUrl = RSX.speech_portrait_vetruvian.img;
BeginnerVetruvianChallenge4.prototype._musicOverride = RSX.music_battlemap_vetruv.audio;
BeginnerVetruvianChallenge4.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.beginner_vetruvian_4_start',
);
BeginnerVetruvianChallenge4.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_vetruvian_4_fail'),
];
BeginnerVetruvianChallenge4.prototype.battleMapTemplateIndex = 0;
BeginnerVetruvianChallenge4.prototype.snapShotOnPlayerTurn = 0;
BeginnerVetruvianChallenge4.prototype.startingManaPlayer = 9;
BeginnerVetruvianChallenge4.prototype.startingHandSizePlayer = 4;

module.exports = BeginnerVetruvianChallenge4;
