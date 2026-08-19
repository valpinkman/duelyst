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

// http://forums.duelyst.com/t/vanar-frozen-shadows/10463

class BeginnerVanarChallenge2 extends Challenge {
  static type = 'BeginnerVanarChallenge2';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction6.General },
      { id: Cards.Spell.PermafrostShield },
      { id: Cards.Artifact.Snowpiercer },
      { id: Cards.Spell.ElementalFury },
      { id: Cards.Spell.BonechillBarrier },
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
    general1.setPosition({ x: 2, y: 2 });
    general1.maxHP = 25;
    general1.setDamage(25 - 9);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 6, y: 2 });
    general2.maxHP = 25;
    general2.setDamage(25 - 9);

    this.applyCardToBoard({ id: Cards.Faction6.BoreanBear }, 3, 3, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.CrystalCloaker }, 3, 1, myPlayerId);

    this.applyCardToBoard({ id: Cards.Neutral.PrimusShieldmaster }, 5, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.PrimusShieldmaster }, 5, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Spell.ShadowReflection }, 5, 3, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Spell.ShadowReflection }, 5, 1, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(0, AgentActions.createAgentSoftActionShowInstructionLabels([{
      label: i18next.t('challenges.beginner_vanar_2_taunt'),
      isSpeech: true,
      yPosition: 0.6,
      isPersistent: true,
      isOpponent: true,
    },
    ]));
    return this._opponentAgent.addActionForTurn(0, AgentActions.createAgentActionPlayCardFindPosition(0, () => [GameSession.getInstance().getGeneralForPlayer1().getPosition()]));
  }
}
BeginnerVanarChallenge2.prototype.type = 'BeginnerVanarChallenge2';
BeginnerVanarChallenge2.prototype.categoryType = ChallengeCategory.advanced.type;
BeginnerVanarChallenge2.prototype.name = i18next.t('challenges.beginner_vanar_2_title');
BeginnerVanarChallenge2.prototype.description = i18next.t('challenges.beginner_vanar_2_description');
BeginnerVanarChallenge2.prototype.iconUrl = RSX.speech_portrait_vanar.img;
BeginnerVanarChallenge2.prototype._musicOverride = RSX.music_battlemap_vanar.audio;
BeginnerVanarChallenge2.prototype.otkChallengeStartMessage = i18next.t('challenges.beginner_vanar_2_start');
BeginnerVanarChallenge2.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_vanar_2_fail'),
];
BeginnerVanarChallenge2.prototype.battleMapTemplateIndex = 3;
BeginnerVanarChallenge2.prototype.snapShotOnPlayerTurn = 0;
BeginnerVanarChallenge2.prototype.startingManaPlayer = CONFIG.MAX_MANA;
BeginnerVanarChallenge2.prototype.startingHandSizePlayer = 4;

module.exports = BeginnerVanarChallenge2;
