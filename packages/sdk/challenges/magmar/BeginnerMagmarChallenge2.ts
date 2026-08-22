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
const CONFIG = require('app/common/config');
const RSX = require('app/data/resources');
const ChallengeCategory = require('@duelyst/sdk/challenges/challengeCategory');
const _ = require('underscore');
const i18next = require('i18next');

// http://forums.duelyst.com/t/magmar-claw-bomb/8285

class BeginnerMagmarChallenge2 extends Challenge {
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

  static type = 'BeginnerMagmarChallenge2';

  constructor() {
    super();
    this.hiddenUIElements = _.without(this.hiddenUIElements, 'SignatureCard');
  }

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction5.General },
      { id: Cards.Artifact.AdamantineClaws },
      { id: Cards.Spell.FlashReincarnation },
      { id: Cards.Neutral.SilhoutteTracer },
      { id: Cards.Neutral.EphemeralShroud },
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
    general2.setPosition({ x: 5, y: 1 });
    general2.maxHP = 25;
    general2.setDamage(25 - 7);

    // set signature card to be always ready for this session
    gameSession.getPlayer1().setIsSignatureCardActive(true);

    this.applyCardToBoard({ id: Cards.Neutral.WhistlingBlade }, 2, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 3, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 3, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 4, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.WhistlingBlade }, 4, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 4, 0, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 5, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 5, 0, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Tile.BonusMana }, 5, 2);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.beginner_magmar_2_taunt'),
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
BeginnerMagmarChallenge2.prototype.type = 'BeginnerMagmarChallenge2';
BeginnerMagmarChallenge2.prototype.categoryType = ChallengeCategory.expert.type;
BeginnerMagmarChallenge2.prototype.name = i18next.t('challenges.beginner_magmar_2_title');
BeginnerMagmarChallenge2.prototype.description = i18next.t(
  'challenges.beginner_magmar_2_description',
);
BeginnerMagmarChallenge2.prototype.iconUrl = RSX.speech_portrait_magmar.img;
BeginnerMagmarChallenge2.prototype._musicOverride = RSX.music_gauntlet.audio;
BeginnerMagmarChallenge2.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.beginner_magmar_2_start',
);
BeginnerMagmarChallenge2.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_magmar_2_fail'),
];
BeginnerMagmarChallenge2.prototype.battleMapTemplateIndex = 5;
BeginnerMagmarChallenge2.prototype.snapShotOnPlayerTurn = 0;
BeginnerMagmarChallenge2.prototype.startingManaPlayer = CONFIG.MAX_MANA;
BeginnerMagmarChallenge2.prototype.startingHandSizePlayer = 6;

module.exports = BeginnerMagmarChallenge2;
