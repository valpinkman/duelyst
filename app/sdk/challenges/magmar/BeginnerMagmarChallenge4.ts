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

// http://forums.duelyst.com/t/shattered-memories-basic-otk-gate-2-slot-5/12275

class BeginnerMagmarChallenge4 extends Challenge {
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

  static type = 'BeginnerMagmarChallenge4';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction5.General },
      { id: Cards.Spell.PlasmaStorm },
      { id: Cards.Neutral.CoiledCrawler },
      { id: Cards.Spell.NaturalSelection },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [{ id: Cards.Faction4.General }, { id: Cards.TutorialSpell.TutorialFrozenFinisher }];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 2, y: 2 });
    general1.maxHP = 25;
    general1.setDamage(25 - 3);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 5, y: 2 });
    general2.maxHP = 25;
    general2.setDamage(25 - 13);

    this.applyCardToBoard({ id: Cards.Faction5.Phalanxar }, 2, 3, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction5.Elucidator }, 2, 1, myPlayerId);

    this.applyCardToBoard({ id: Cards.Artifact.SpectralBlade }, 3, 2, opponentPlayerId);

    this.applyCardToBoard({ id: Cards.Faction4.BlackSolus }, 3, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 4, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.BloodmoonPriestess }, 4, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 4, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.NightsorrowAssassin }, 5, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.NightsorrowAssassin }, 5, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.GloomChaser }, 6, 3, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Faction4.GloomChaser }, 6, 1, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.beginner_magmar_4_taunt'),
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
BeginnerMagmarChallenge4.prototype.type = 'BeginnerMagmarChallenge4';
BeginnerMagmarChallenge4.prototype.categoryType = ChallengeCategory.beginner.type;
BeginnerMagmarChallenge4.prototype.name = i18next.t('challenges.beginner_magmar_4_title');
BeginnerMagmarChallenge4.prototype.description = i18next.t(
  'challenges.beginner_magmar_4_description',
);
BeginnerMagmarChallenge4.prototype.iconUrl = RSX.speech_portrait_magmar.img;
BeginnerMagmarChallenge4.prototype._musicOverride = RSX.music_gauntlet.audio;
BeginnerMagmarChallenge4.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.beginner_magmar_4_start',
);
BeginnerMagmarChallenge4.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_magmar_4_fail'),
];
BeginnerMagmarChallenge4.prototype.battleMapTemplateIndex = 0;
BeginnerMagmarChallenge4.prototype.snapShotOnPlayerTurn = 0;
BeginnerMagmarChallenge4.prototype.startingManaPlayer = 9;
BeginnerMagmarChallenge4.prototype.startingHandSizePlayer = 6;

module.exports = BeginnerMagmarChallenge4;
