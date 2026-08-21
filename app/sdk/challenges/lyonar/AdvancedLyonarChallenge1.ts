/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
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
const ModifierOpeningGambitApplyPlayerModifiers = require('app/sdk/modifiers/modifierOpeningGambitApplyPlayerModifiers');
const UtilsGameSession = require('app/sdk/utils/utils_game_session');
const i18next = require('i18next');

// http://forums.duelyst.com/t/desperation-otk-1/11400

class AdvancedLyonarChallenge1 extends Challenge {
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

  static type = 'AdvancedLyonarChallenge1';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction1.General },
      { id: Cards.Spell.Magnetize },
      { id: Cards.Neutral.AlcuinLoremaster },
      { id: Cards.Spell.DivineBond },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [{ id: Cards.Faction1.General }, { id: Cards.TutorialSpell.TutorialFireOrb }];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 4, y: 3 });
    general1.maxHP = 25;
    general1.setDamage(25 - 5);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 8, y: 0 });
    general2.maxHP = 25;
    general2.setDamage(25 - 10);

    this.applyCardToBoard({ id: Cards.Faction1.SuntideMaiden }, 6, 2, myPlayerId);
    this.applyCardToBoard({ id: Cards.Spell.WarSurge }, 4, 2, myPlayerId);
    this.applyCardToBoard({ id: Cards.Spell.WarSurge }, 4, 2, myPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.SkyrockGolem }, 4, 1, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction1.Lightchaser }, 4, 0, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction1.SunstoneTemplar }, 5, 3, myPlayerId);

    const ladyLocke = this.applyCardToBoard(
      { id: Cards.Neutral.LadyLocke },
      7,
      0,
      opponentPlayerId,
    );
    const windbladeAdept = this.applyCardToBoard(
      { id: Cards.Faction1.WindbladeAdept },
      7,
      2,
      opponentPlayerId,
    );
    this.applyCardToBoard({ id: Cards.Spell.WarSurge }, 4, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Spell.WarSurge }, 4, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction1.IroncliffeGuardian }, 6, 1, opponentPlayerId);
    // Apply lady lock buff to windblade adept
    const lockPlayerModifier = ladyLocke.getModifierByType(
      ModifierOpeningGambitApplyPlayerModifiers.type,
    );
    return Array.from<any>(
      lockPlayerModifier.modifiersContextObjects[0].modifiersContextObjects,
    ).map((modifierContextObject) =>
      gameSession.applyModifierContextObject(modifierContextObject, windbladeAdept),
    );
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.advanced_lyonar_1_taunt'),
          isSpeech: true,
          yPosition: 0.7,
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
AdvancedLyonarChallenge1.prototype.type = 'AdvancedLyonarChallenge1';
AdvancedLyonarChallenge1.prototype.categoryType = ChallengeCategory.contest1.type;
AdvancedLyonarChallenge1.prototype.name = i18next.t('challenges.advanced_lyonar_1_title');
AdvancedLyonarChallenge1.prototype.description = i18next.t(
  'challenges.advanced_lyonar_1_description',
);
AdvancedLyonarChallenge1.prototype.iconUrl = RSX.speech_portrait_lyonar_side.img;
AdvancedLyonarChallenge1.prototype._musicOverride = RSX.music_battlemap_songhai.audio;
AdvancedLyonarChallenge1.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.advanced_lyonar_1_start',
);
AdvancedLyonarChallenge1.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.advanced_lyonar_1_fail'),
];
AdvancedLyonarChallenge1.prototype.battleMapTemplateIndex = 1;
AdvancedLyonarChallenge1.prototype.snapShotOnPlayerTurn = 0;
AdvancedLyonarChallenge1.prototype.startingManaPlayer = CONFIG.MAX_MANA;
AdvancedLyonarChallenge1.prototype.startingHandSizePlayer = 5;

module.exports = AdvancedLyonarChallenge1;
