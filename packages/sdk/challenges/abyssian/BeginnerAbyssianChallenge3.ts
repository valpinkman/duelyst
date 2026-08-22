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
const ModifierSummonWatchByEntityBuffSelf = require('@duelyst/sdk/modifiers/modifierSummonWatchByEntityBuffSelf');
const i18next = require('i18next');

// http://forums.duelyst.com/t/abyss-super-creep-medium/8970

class BeginnerAbyssianChallenge3 extends Challenge {
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

  static type = 'BeginnerAbyssianChallenge3';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction4.General },
      { id: Cards.Spell.WraithlingSwarm },
      { id: Cards.Spell.DaemonicLure },
      { id: Cards.Artifact.HornOfTheForsaken },
      { id: Cards.Spell.AbyssianStrength },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [{ id: Cards.Faction2.General }, { id: Cards.TutorialSpell.TutorialFireOrb }];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 1, y: 2 });
    general1.maxHP = 25;
    general1.setDamage(18);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 7, y: 2 });
    general2.maxHP = 25;
    general2.setDamage(25 - 14);

    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 2, 3, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.GloomChaser }, 2, 1, myPlayerId);
    const blackSolus = this.applyCardToBoard({ id: Cards.Faction4.BlackSolus }, 4, 2, myPlayerId);
    const buffSolusModifier = blackSolus.getModifierByType(
      ModifierSummonWatchByEntityBuffSelf.type,
    );
    buffSolusModifier.applyManagedModifiersFromModifiersContextObjects(
      buffSolusModifier.modifiersContextObjects,
      blackSolus,
    );

    const goreHorn = this.applyCardToBoard({ id: Cards.Faction2.GoreHorn }, 5, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Spell.MistDragonSeal }, 5, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction2.KaidoAssassin }, 6, 2, opponentPlayerId);
    return this.applyCardToBoard(goreHorn.getCurrentFollowupCard(), 5, 2, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.beginner_abyss_3_taunt'),
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
BeginnerAbyssianChallenge3.prototype.type = 'BeginnerAbyssianChallenge3';
BeginnerAbyssianChallenge3.prototype.categoryType = ChallengeCategory.advanced.type;
BeginnerAbyssianChallenge3.prototype.name = i18next.t('challenges.beginner_abyss_3_title');
BeginnerAbyssianChallenge3.prototype.description = i18next.t(
  'challenges.beginner_abyss_3_description',
);
BeginnerAbyssianChallenge3.prototype.iconUrl = RSX.speech_portrait_abyssian.img;
BeginnerAbyssianChallenge3.prototype._musicOverride = RSX.music_battlemap_abyssian.audio;
BeginnerAbyssianChallenge3.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.beginner_abyss_3_start',
);
BeginnerAbyssianChallenge3.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_abyss_3_fail'),
];
BeginnerAbyssianChallenge3.prototype.battleMapTemplateIndex = 0;
BeginnerAbyssianChallenge3.prototype.snapShotOnPlayerTurn = 0;
BeginnerAbyssianChallenge3.prototype.startingManaPlayer = CONFIG.MAX_MANA;
BeginnerAbyssianChallenge3.prototype.startingHandSizePlayer = 6;

module.exports = BeginnerAbyssianChallenge3;
