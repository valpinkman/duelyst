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

// http://forums.duelyst.com/t/crushing-reach-basic-otk/11712

class BeginnerMagmarChallenge3 extends Challenge {
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

  static type = 'BeginnerMagmarChallenge3';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction5.General },
      { id: Cards.Spell.BoundedLifeforce },
      { id: Cards.Spell.GreaterFortitude },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [{ id: Cards.Faction6.General }, { id: Cards.TutorialSpell.TutorialFrozenFinisher }];
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
    general2.setPosition({ x: 5, y: 2 });
    general2.maxHP = 25;
    general2.setDamage(25 - 8);

    this.applyCardToBoard({ id: Cards.Neutral.FireSpitter }, 0, 4, myPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.ValeHunter }, 0, 0, myPlayerId);

    this.applyCardToBoard({ id: Cards.Faction6.BlazingSpines }, 3, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.CrystalCloaker }, 3, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BlazingSpines }, 3, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BlazingSpines }, 4, 4, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BoreanBear }, 4, 2, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Faction6.BlazingSpines }, 4, 0, opponentPlayerId);
  }
  // @applyCardToBoard({id: Cards.Neutral.WindStopper},6,2,opponentPlayerId)

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.beginner_magmar_3_taunt'),
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
BeginnerMagmarChallenge3.prototype.type = 'BeginnerMagmarChallenge3';
BeginnerMagmarChallenge3.prototype.categoryType = ChallengeCategory.keywords.type;
BeginnerMagmarChallenge3.prototype.name = i18next.t('challenges.beginner_magmar_3_title');
BeginnerMagmarChallenge3.prototype.description = i18next.t(
  'challenges.beginner_magmar_3_description',
);
BeginnerMagmarChallenge3.prototype.iconUrl = RSX.speech_portrait_magmar.img;
BeginnerMagmarChallenge3.prototype._musicOverride = RSX.music_gauntlet.audio;
BeginnerMagmarChallenge3.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.beginner_magmar_3_start',
);
BeginnerMagmarChallenge3.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_magmar_3_fail'),
];
BeginnerMagmarChallenge3.prototype.battleMapTemplateIndex = 0;
BeginnerMagmarChallenge3.prototype.snapShotOnPlayerTurn = 0;
BeginnerMagmarChallenge3.prototype.startingManaPlayer = 8;
BeginnerMagmarChallenge3.prototype.startingHandSizePlayer = 6;

module.exports = BeginnerMagmarChallenge3;
