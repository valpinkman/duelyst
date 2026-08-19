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

// http://forums.duelyst.com/t/magmar-rampage/8452

class MediumMagmarChallenge1 extends Challenge {
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

  static type = 'MediumMagmarChallenge1';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction5.General },
      { id: Cards.Spell.FlashReincarnation },
      { id: Cards.Spell.Amplification },
      { id: Cards.Spell.FractalReplication },
      { id: Cards.Faction5.Elucidator },
      { id: Cards.Spell.DiretideFrenzy },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction6.General },
      { id: Cards.TutorialSpell.TutorialFrozenFinisher },
    ];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 2, y: 2 });
    general1.maxHP = 10;
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 6, y: 2 });
    general2.maxHP = 9;

    this.applyCardToBoard({ id: Cards.Faction5.Kujata }, 1, 2, myPlayerId);

    this.applyCardToBoard({ id: Cards.Faction6.ArcticRhyno }, 3, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.ArcticRhyno }, 3, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.FenrirWarmaster }, 4, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.FenrirWarmaster }, 4, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.ArcticDisplacer }, 5, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.PrismaticGiant }, 5, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.ArcticDisplacer }, 5, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BlazingSpines }, 5, 4, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BlazingSpines }, 5, 0, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BlazingSpines }, 6, 3, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Faction6.BlazingSpines }, 6, 1, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(0, AgentActions.createAgentSoftActionShowInstructionLabels([{
      label: i18next.t('challenges.medium_magmar_1_taunt'),
      isSpeech: true,
      yPosition: 0.6,
      isPersistent: true,
      isOpponent: true,
    },
    ]));
    return this._opponentAgent.addActionForTurn(0, AgentActions.createAgentActionPlayCardFindPosition(0, () => [GameSession.getInstance().getGeneralForPlayer1().getPosition()]));
  }
}
MediumMagmarChallenge1.prototype.type = 'MediumMagmarChallenge1';
MediumMagmarChallenge1.prototype.categoryType = ChallengeCategory.vault1.type;
MediumMagmarChallenge1.prototype.name = i18next.t('challenges.medium_magmar_1_title');
MediumMagmarChallenge1.prototype.description = i18next.t('challenges.medium_magmar_1_description');
MediumMagmarChallenge1.prototype.iconUrl = RSX.speech_portrait_magmar.img;
MediumMagmarChallenge1.prototype._musicOverride = RSX.music_training.audio;
MediumMagmarChallenge1.prototype.otkChallengeStartMessage = i18next.t('challenges.medium_magmar_1_start');
MediumMagmarChallenge1.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.medium_magmar_1_fail'),
];
MediumMagmarChallenge1.prototype.battleMapTemplateIndex = 6;
MediumMagmarChallenge1.prototype.snapShotOnPlayerTurn = 0;
MediumMagmarChallenge1.prototype.startingManaPlayer = CONFIG.MAX_MANA;
MediumMagmarChallenge1.prototype.startingHandSizePlayer = 6;

module.exports = MediumMagmarChallenge1;
