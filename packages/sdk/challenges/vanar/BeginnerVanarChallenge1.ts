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
const i18next = require('i18next');

// http://forums.duelyst.com/t/starter-challenge-vanar/7519

class BeginnerVanarChallenge1 extends Challenge {
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

  static type = 'BeginnerVanarChallenge1';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction6.General },
      { id: Cards.Faction6.BoreanBear },
      { id: Cards.Spell.RitualOfTheWind },
      { id: Cards.Spell.Cryogenesis },
      { id: Cards.Spell.IceCage },
      { id: Cards.Spell.AspectOfTheWolf },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [{ id: Cards.Faction3.General }, { id: Cards.TutorialSpell.TutorialFireOrb }];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 3, y: 3 });
    general1.maxHP = 10;
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 6, y: 2 });
    general2.maxHP = 8;

    this.applyCardToBoard({ id: Cards.Faction6.SnowElemental }, 2, 4, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 3, 4, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.CrystalCloaker }, 3, 2, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 4, 4, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 4, 3, myPlayerId);

    this.applyCardToBoard({ id: Cards.Faction3.StarfireScarab }, 4, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction3.Dervish }, 5, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction3.PortalGuardian }, 5, 2, opponentPlayerId);
    const dunecasterUnit = this.applyCardToBoard(
      { id: Cards.Faction3.Dunecaster },
      6,
      3,
      opponentPlayerId,
    );
    return this.applyCardToBoard(dunecasterUnit.getCurrentFollowupCard(), 5, 3, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.beginner_vanar_1_taunt'),
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
BeginnerVanarChallenge1.prototype.type = 'BeginnerVanarChallenge1';
BeginnerVanarChallenge1.prototype.categoryType = ChallengeCategory.vault1.type;
BeginnerVanarChallenge1.prototype.name = i18next.t('challenges.beginner_vanar_1_title');
BeginnerVanarChallenge1.prototype.description = i18next.t(
  'challenges.beginner_vanar_1_description',
);
BeginnerVanarChallenge1.prototype.iconUrl = RSX.speech_portrait_vanar.img;
BeginnerVanarChallenge1.prototype._musicOverride = RSX.music_battlemap_vanar.audio;
BeginnerVanarChallenge1.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.beginner_vanar_1_start',
);
BeginnerVanarChallenge1.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_vanar_1_fail'),
];
BeginnerVanarChallenge1.prototype.battleMapTemplateIndex = 3;
BeginnerVanarChallenge1.prototype.snapShotOnPlayerTurn = 0;
BeginnerVanarChallenge1.prototype.startingManaPlayer = CONFIG.MAX_MANA;
BeginnerVanarChallenge1.prototype.startingHandSizePlayer = 4;

module.exports = BeginnerVanarChallenge1;
