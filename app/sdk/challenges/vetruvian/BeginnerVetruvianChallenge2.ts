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
const _ = require('underscore');
const i18next = require('i18next');

// http://forums.duelyst.com/t/starter-challenge-vanar/7519

class BeginnerVetruvianChallenge2 extends Challenge {
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

  static type = 'BeginnerVetruvianChallenge2';

  constructor() {
    super();
    this.hiddenUIElements = _.without(this.hiddenUIElements, 'SignatureCard');
  }

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction3.AltGeneral },
      { id: Cards.Artifact.AnkhFireNova },
      { id: Cards.Neutral.ArtifactHunter },
      { id: Cards.Spell.AurorasTears },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction2.General },
      { id: Cards.TutorialSpell.TutorialFireOrb },
    ];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 2, y: 2 });
    general1.maxHP = 25;
    general1.setDamage(25 - 10);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 8, y: 2 });
    general2.maxHP = 25;
    general2.setDamage(25 - 10);

    // set signature card to be always ready for this session
    gameSession.getPlayer1().setIsSignatureCardActive(true);

    this.applyCardToBoard({ id: Cards.Faction3.WindShrike }, 1, 3, myPlayerId);
    this.applyCardToBoard({ id: Cards.Artifact.StaffOfYKir }, 2, 2, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction3.NightfallMechanyst }, 6, 2, myPlayerId);

    this.applyCardToBoard({ id: Cards.Faction2.ScarletViper }, 4, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.WhistlingBlade }, 7, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction2.CelestialPhantom }, 8, 4, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Faction2.Widowmaker }, 8, 0, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(0, AgentActions.createAgentSoftActionShowInstructionLabels([{
      label: i18next.t('challenges.beginner_vetruvian_2_taunt'),
      isSpeech: true,
      yPosition: 0.6,
      isPersistent: true,
      isOpponent: true,
    },
    ]));
    return this._opponentAgent.addActionForTurn(0, AgentActions.createAgentActionPlayCardFindPosition(0, () => [GameSession.getInstance().getGeneralForPlayer1().getPosition()]));
  }
}
BeginnerVetruvianChallenge2.prototype.type = 'BeginnerVetruvianChallenge2';
BeginnerVetruvianChallenge2.prototype.categoryType = ChallengeCategory.expert.type;
BeginnerVetruvianChallenge2.prototype.name = i18next.t('challenges.beginner_vetruvian_2_title');
BeginnerVetruvianChallenge2.prototype.description = i18next.t('challenges.beginner_vetruvian_2_description');
BeginnerVetruvianChallenge2.prototype.iconUrl = RSX.speech_portrait_vetruvian.img;
BeginnerVetruvianChallenge2.prototype._musicOverride = RSX.music_battlemap_vetruv.audio;
BeginnerVetruvianChallenge2.prototype.otkChallengeStartMessage = i18next.t('challenges.beginner_vetruvian_2_start');
BeginnerVetruvianChallenge2.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_vetruvian_2_fail'),
];
BeginnerVetruvianChallenge2.prototype.battleMapTemplateIndex = 6;
BeginnerVetruvianChallenge2.prototype.snapShotOnPlayerTurn = 0;
BeginnerVetruvianChallenge2.prototype.startingManaPlayer = 9;
BeginnerVetruvianChallenge2.prototype.startingHandSizePlayer = 1;

module.exports = BeginnerVetruvianChallenge2;
