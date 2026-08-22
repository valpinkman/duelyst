/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
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
const ModifierOpeningGambitApplyPlayerModifiers = require('@duelyst/sdk/modifiers/modifierOpeningGambitApplyPlayerModifiers');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const i18next = require('i18next');

// http://forums.duelyst.com/t/starter-challenge-vanar/7519

class AdvancedVanarChallenge1 extends Challenge {
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

  static type = 'AdvancedVanarChallenge1';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction6.General },
      { id: Cards.Spell.AspectOfTheWolf },
      { id: Cards.Spell.IceCage },
      { id: Cards.Spell.RitualOfTheWind },
      { id: Cards.Spell.IceCage },
      { id: Cards.Spell.RitualOfTheWind },
      { id: Cards.Neutral.ZenRui },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [{ id: Cards.Faction2.General }, { id: Cards.TutorialSpell.TutorialFireOrb }];
  }

  setupBoard(gameSession) {
    let modifierContextObject;
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 7, y: 0 });
    general1.maxHP = 25;
    general1.setDamage(25 - 1);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 1, y: 4 });
    general2.maxHP = 25;
    general2.setDamage(25 - 7);

    this.applyCardToBoard({ id: Cards.Neutral.Manaforger }, 5, 1, myPlayerId);
    // buff mana forger
    this.applyCardToBoard({ id: Cards.Spell.PermafrostShield }, 5, 1, myPlayerId);

    this.applyCardToBoard({ id: Cards.Faction6.HearthSister }, 8, 3, myPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.Manaforger }, 8, 1, myPlayerId);
    // @applyCardToBoard({id: Cards.Neutral.Manaforger}, 8, 2, myPlayerId)
    this.applyCardToBoard({ id: Cards.Faction6.ArcticRhyno }, 8, 0, myPlayerId);

    const ladyLocke = this.applyCardToBoard(
      { id: Cards.Neutral.LadyLocke },
      2,
      4,
      opponentPlayerId,
    );
    const chakri1 = this.applyCardToBoard(
      { id: Cards.Faction2.ChakriAvatar },
      1,
      2,
      opponentPlayerId,
    );
    const manaForger = this.applyCardToBoard(
      { id: Cards.Neutral.Manaforger },
      2,
      3,
      opponentPlayerId,
    );
    const owlbeast = this.applyCardToBoard(
      { id: Cards.Neutral.OwlbeastSage },
      2,
      2,
      opponentPlayerId,
    );
    const chakri2 = this.applyCardToBoard(
      { id: Cards.Faction2.ChakriAvatar },
      3,
      2,
      opponentPlayerId,
    );
    this.applyCardToBoard({ id: Cards.Neutral.LadyLocke }, 2, 1, opponentPlayerId);

    // give lady lockes buffs to enemy manaforger, owlbeast, and both chakris
    const lockPlayerModifier = ladyLocke.getModifierByType(
      ModifierOpeningGambitApplyPlayerModifiers.type,
    );
    for (modifierContextObject of Array.from<any>(
      lockPlayerModifier.modifiersContextObjects[0].modifiersContextObjects,
    )) {
      gameSession.applyModifierContextObject(modifierContextObject, chakri1);
    }
    for (modifierContextObject of Array.from<any>(
      lockPlayerModifier.modifiersContextObjects[0].modifiersContextObjects,
    )) {
      gameSession.applyModifierContextObject(modifierContextObject, manaForger);
    }
    for (modifierContextObject of Array.from<any>(
      lockPlayerModifier.modifiersContextObjects[0].modifiersContextObjects,
    )) {
      gameSession.applyModifierContextObject(modifierContextObject, owlbeast);
    }
    for (modifierContextObject of Array.from<any>(
      lockPlayerModifier.modifiersContextObjects[0].modifiersContextObjects,
    )) {
      gameSession.applyModifierContextObject(modifierContextObject, chakri2);
    }

    // mana orbs
    return this.applyCardToBoard({ id: Cards.Tile.BonusMana }, 4, 0);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.advanced_vanar_1_taunt'),
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
AdvancedVanarChallenge1.prototype.type = 'AdvancedVanarChallenge1';
AdvancedVanarChallenge1.prototype.categoryType = ChallengeCategory.contest2.type;
AdvancedVanarChallenge1.prototype.name = i18next.t('challenges.advanced_vanar_1_title');
AdvancedVanarChallenge1.prototype.description = i18next.t(
  'challenges.advanced_vanar_1_description',
);
AdvancedVanarChallenge1.prototype.iconUrl = RSX.speech_portrait_vanar.img;
AdvancedVanarChallenge1.prototype._musicOverride = RSX.music_battlemap_vanar.audio;
AdvancedVanarChallenge1.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.advanced_vanar_1_start',
);
AdvancedVanarChallenge1.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.advanced_vanar_1_fail'),
];
AdvancedVanarChallenge1.prototype.battleMapTemplateIndex = 3;
AdvancedVanarChallenge1.prototype.snapShotOnPlayerTurn = 0;
AdvancedVanarChallenge1.prototype.startingManaPlayer = CONFIG.MAX_MANA;
AdvancedVanarChallenge1.prototype.startingHandSizePlayer = 6;

module.exports = AdvancedVanarChallenge1;
