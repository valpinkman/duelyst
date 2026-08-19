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

class BeginnerVanarChallenge3 extends Challenge {
  static type = 'BeginnerVanarChallenge3';

  constructor() {
    super();
    this.hiddenUIElements = _.without(this.hiddenUIElements, 'SignatureCard');
  }

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction6.General },
      { id: Cards.Faction6.Razorback },
      { id: Cards.Faction6.HearthSister },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction4.General },
      { id: Cards.TutorialSpell.TutorialFireOrb },
    ];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 0, y: 2 });
    general1.maxHP = 25;
    general1.setDamage(25 - 3);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 2, y: 2 });
    general2.maxHP = 25;
    general2.setDamage(25 - 7);

    // set signature card to be always ready for this session
    gameSession.getPlayer1().setIsSignatureCardActive(true);

    this.applyCardToBoard({ id: Cards.Faction6.CrystalWisp }, 2, 4, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.CrystalWisp }, 2, 0, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.CrystalWisp }, 8, 2, myPlayerId);

    this.applyCardToBoard({ id: Cards.Artifact.SpectralBlade }, 2, 2, opponentPlayerId);

    return this.applyCardToBoard({ id: Cards.Tile.BonusMana }, 5, 2);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(0, AgentActions.createAgentSoftActionShowInstructionLabels([{
      label: i18next.t('challenges.beginner_vanar_3_taunt'),
      isSpeech: true,
      yPosition: 0.6,
      isPersistent: true,
      isOpponent: true,
    },
    ]));
    return this._opponentAgent.addActionForTurn(0, AgentActions.createAgentActionPlayCardFindPosition(0, () => [GameSession.getInstance().getGeneralForPlayer1().getPosition()]));
  }
}
BeginnerVanarChallenge3.prototype.type = 'BeginnerVanarChallenge3';
BeginnerVanarChallenge3.prototype.categoryType = ChallengeCategory.expert.type;
BeginnerVanarChallenge3.prototype.name = i18next.t('challenges.beginner_vanar_3_title');
BeginnerVanarChallenge3.prototype.description = i18next.t('challenges.beginner_vanar_3_description');
BeginnerVanarChallenge3.prototype.iconUrl = RSX.speech_portrait_vanar.img;
BeginnerVanarChallenge3.prototype._musicOverride = RSX.music_battlemap_vanar.audio;
BeginnerVanarChallenge3.prototype.otkChallengeStartMessage = i18next.t('challenges.beginner_vanar_3_start');
BeginnerVanarChallenge3.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_vanar_3_fail'),
];
BeginnerVanarChallenge3.prototype.battleMapTemplateIndex = 3;
BeginnerVanarChallenge3.prototype.snapShotOnPlayerTurn = 0;
BeginnerVanarChallenge3.prototype.startingManaPlayer = 6;
BeginnerVanarChallenge3.prototype.startingHandSizePlayer = 4;

module.exports = BeginnerVanarChallenge3;
