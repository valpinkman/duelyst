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
const ModifierSpellWatchBuffAlliesByRace = require('@duelyst/sdk/modifiers/modifierSpellWatchBuffAlliesByRace');
const i18next = require('i18next');

// http://forums.duelyst.com/t/mind-game-otk-1/11425

class AdvancedMagmarChallenge1 extends Challenge {
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

  static type = 'AdvancedMagmarChallenge1';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction5.General },
      { id: Cards.Neutral.AlcuinLoremaster },
      { id: Cards.Neutral.AlcuinLoremaster },
      { id: Cards.Neutral.AlcuinLoremaster },
      { id: Cards.Spell.EggMorph },
      { id: Cards.Neutral.ZenRui },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [{ id: Cards.Faction2.General }, { id: Cards.TutorialSpell.TutorialFrozenFinisher }];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 4, y: 2 });
    general1.maxHP = 25;
    general1.setDamage(25 - 1);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 7, y: 1 });
    general2.maxHP = 25;
    general2.setDamage(25 - 14);

    this.applyCardToBoard({ id: Cards.Faction5.Kujata }, 0, 4, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction5.Kujata }, 0, 3, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction5.Kujata }, 0, 2, myPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.Manaforger }, 0, 1, myPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.Manaforger }, 0, 0, myPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.Manaforger }, 1, 0, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction2.MageOfFourWinds }, 2, 3, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction5.Vindicator }, 3, 1, myPlayerId);

    const songweaver1 = this.applyCardToBoard(
      { id: Cards.Neutral.Songweaver },
      5,
      2,
      opponentPlayerId,
    );
    this.applyCardToBoard({ id: Cards.Neutral.OwlbeastSage }, 6, 2, opponentPlayerId);
    const owlbeast = this.applyCardToBoard(
      { id: Cards.Neutral.OwlbeastSage },
      6,
      0,
      opponentPlayerId,
    );
    const songweaver2 = this.applyCardToBoard(
      { id: Cards.Neutral.Songweaver },
      7,
      2,
      opponentPlayerId,
    );
    this.applyCardToBoard({ id: Cards.Faction2.ScarletViper }, 4, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction2.Heartseeker }, 4, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction2.Heartseeker }, 5, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.HealingMystic }, 5, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.DragoneboneGolem }, 3, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.VenomToth }, 8, 4, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction2.TuskBoar }, 3, 0, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction2.StormKage }, 6, 3, opponentPlayerId);
    // apply Killing Edge buff to Storm Kage
    this.applyCardToBoard({ id: Cards.Spell.KillingEdge }, 6, 3, opponentPlayerId);
    // apply empty mana tile for Mana Burn to target
    const manaTile1 = this.applyCardToBoard({ id: Cards.Tile.BonusMana }, 4, 4);
    return manaTile1.getModifierByType('ModifierCollectableBonusMana').onDepleted();
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.advanced_magmar_1_taunt'),
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
AdvancedMagmarChallenge1.prototype.type = 'AdvancedMagmarChallenge1';
AdvancedMagmarChallenge1.prototype.categoryType = ChallengeCategory.contest2.type;
AdvancedMagmarChallenge1.prototype.name = i18next.t('challenges.advanced_magmar_1_title');
AdvancedMagmarChallenge1.prototype.description = i18next.t(
  'challenges.advanced_magmar_1_description',
);
AdvancedMagmarChallenge1.prototype.iconUrl = RSX.speech_portrait_magmar.img;
AdvancedMagmarChallenge1.prototype._musicOverride = RSX.music_training.audio;
AdvancedMagmarChallenge1.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.advanced_magmar_1_start',
);
AdvancedMagmarChallenge1.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.advanced_magmar_1_fail'),
];
AdvancedMagmarChallenge1.prototype.battleMapTemplateIndex = 6;
AdvancedMagmarChallenge1.prototype.snapShotOnPlayerTurn = 0;
AdvancedMagmarChallenge1.prototype.startingManaPlayer = 6;
AdvancedMagmarChallenge1.prototype.startingHandSizePlayer = 6;

module.exports = AdvancedMagmarChallenge1;
