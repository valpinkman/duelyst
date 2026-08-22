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

// http://forums.duelyst.com/t/songhai-controlled-chaos/10473

class BeginnerSonghaiChallenge3 extends Challenge {
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

  static type = 'BeginnerSonghaiChallenge3';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction2.General },
      { id: Cards.Spell.DeathstrikeSeal },
      { id: Cards.Spell.SpiralTechnique },
      { id: Cards.Spell.TwinStrike },
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
    general1.setPosition({ x: 3, y: 4 });
    general1.maxHP = 25;
    general1.setDamage(20);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 7, y: 2 });
    general2.maxHP = 25;
    general2.setDamage(25 - 13);

    this.applyCardToBoard({ id: Cards.Faction2.Heartseeker }, 1, 2, myPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.Manaforger }, 2, 2, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction2.ChakriAvatar }, 3, 0, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction2.JadeOgre }, 4, 2, myPlayerId);

    this.applyCardToBoard({ id: Cards.Neutral.ChaosElemental }, 5, 4, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.ChaosElemental }, 5, 0, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Neutral.WhistlingBlade }, 6, 2, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.beginner_songhai_3_taunt'),
          isSpeech: true,
          yPosition: 0.6,
          isPersistent: true,
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
BeginnerSonghaiChallenge3.prototype.type = 'BeginnerSonghaiChallenge3';
BeginnerSonghaiChallenge3.prototype.categoryType = ChallengeCategory.vault2.type;
BeginnerSonghaiChallenge3.prototype.name = i18next.t('challenges.beginner_songhai_3_title');
BeginnerSonghaiChallenge3.prototype.description = i18next.t(
  'challenges.beginner_songhai_3_description',
);
BeginnerSonghaiChallenge3.prototype.iconUrl = RSX.speech_portrait_songhai.img;
BeginnerSonghaiChallenge3.prototype._musicOverride = RSX.music_battlemap_songhai.audio;
BeginnerSonghaiChallenge3.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.beginner_songhai_3_start',
);
BeginnerSonghaiChallenge3.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_songhai_3_fail'),
];
BeginnerSonghaiChallenge3.prototype.battleMapTemplateIndex = 2;
BeginnerSonghaiChallenge3.prototype.snapShotOnPlayerTurn = 0;
BeginnerSonghaiChallenge3.prototype.startingManaPlayer = CONFIG.MAX_MANA;
BeginnerSonghaiChallenge3.prototype.startingHandSizePlayer = 6;

module.exports = BeginnerSonghaiChallenge3;
