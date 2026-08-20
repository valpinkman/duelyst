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

// http://forums.duelyst.com/t/starter-challenge-magmar/7518

class BeginnerMagmarChallenge1 extends Challenge {
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

  static type = 'BeginnerMagmarChallenge1';

  getMyPlayerDeckData(gameSession) {
    return [{ id: Cards.Faction5.General }, { id: Cards.Spell.NaturalSelection }];
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
    general1.maxHP = 10;
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 6, y: 2 });
    general2.maxHP = 6;

    this.applyCardToBoard({ id: Cards.Faction5.MakantorWarbeast }, 4, 1, myPlayerId);

    this.applyCardToBoard({ id: Cards.Neutral.DragoneboneGolem }, 5, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction2.GoreHorn }, 5, 0, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction2.KaidoAssassin }, 6, 0, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Faction2.Widowmaker }, 7, 1, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.beginner_magmar_1_taunt'),
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
BeginnerMagmarChallenge1.prototype.type = 'BeginnerMagmarChallenge1';
BeginnerMagmarChallenge1.prototype.categoryType = ChallengeCategory.beginner2.type;
BeginnerMagmarChallenge1.prototype.name = i18next.t('challenges.beginner_magmar_1_title');
BeginnerMagmarChallenge1.prototype.description = i18next.t(
  'challenges.beginner_magmar_1_description',
);
BeginnerMagmarChallenge1.prototype.iconUrl = RSX.speech_portrait_magmar.img;
BeginnerMagmarChallenge1.prototype._musicOverride = RSX.music_collection.audio;
BeginnerMagmarChallenge1.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.beginner_magmar_1_start',
);
BeginnerMagmarChallenge1.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_magmar_1_fail'),
];
BeginnerMagmarChallenge1.prototype.battleMapTemplateIndex = 1;
BeginnerMagmarChallenge1.prototype.snapShotOnPlayerTurn = 0;
BeginnerMagmarChallenge1.prototype.startingManaPlayer = CONFIG.MAX_MANA;
BeginnerMagmarChallenge1.prototype.startingHandSizePlayer = 6;

module.exports = BeginnerMagmarChallenge1;
