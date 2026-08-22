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

// http://forums.duelyst.com/t/winds-of-change-gate-5-slot-4/12215

class MediumVetruvianChallenge2 extends Challenge {
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

  static type = 'MediumVetruvianChallenge2';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction3.General },
      { id: Cards.Spell.RashasCurse },
      { id: Cards.Faction3.BrazierGoldenFlame },
      { id: Cards.Neutral.PrimusFist },
      { id: Cards.Faction3.Dunecaster },
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
    general1.setPosition({ x: 1, y: 2 });
    general1.maxHP = 25;
    general1.setDamage(25 - 8);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 5, y: 2 });
    general2.maxHP = 25;
    general2.setDamage(25 - 14);

    this.applyCardToBoard({ id: Cards.Faction3.SandHowler }, 2, 2, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction3.OrbWeaver }, 3, 3, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction3.OrbWeaver }, 3, 1, myPlayerId);

    this.applyCardToBoard({ id: Cards.Neutral.HailstoneHowler }, 3, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction2.KaidoAssassin }, 4, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction2.MageOfFourWinds }, 4, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.FlameWing }, 5, 4, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.FlameWing }, 5, 0, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Neutral.HailstoneHowler }, 6, 2, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.medium_vetruvian_2_taunt'),
          isSpeech: true,
          isPersistent: true,
          yPosition: 0.7,
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
MediumVetruvianChallenge2.prototype.type = 'MediumVetruvianChallenge2';
MediumVetruvianChallenge2.prototype.categoryType = ChallengeCategory.advanced.type;
MediumVetruvianChallenge2.prototype.name = i18next.t('challenges.medium_vetruvian_2_title');
MediumVetruvianChallenge2.prototype.description = i18next.t(
  'challenges.medium_vetruvian_2_description',
);
MediumVetruvianChallenge2.prototype.iconUrl = RSX.speech_portrait_vetruvian.img;
MediumVetruvianChallenge2.prototype._musicOverride = RSX.music_battlemap_vetruv.audio;
MediumVetruvianChallenge2.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.medium_vetruvian_2_start',
);
MediumVetruvianChallenge2.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.medium_vetruvian_2_fail'),
];
MediumVetruvianChallenge2.prototype.battleMapTemplateIndex = 6;
MediumVetruvianChallenge2.prototype.snapShotOnPlayerTurn = 0;
MediumVetruvianChallenge2.prototype.startingManaPlayer = 9;
MediumVetruvianChallenge2.prototype.startingHandSizePlayer = 4;

module.exports = MediumVetruvianChallenge2;
