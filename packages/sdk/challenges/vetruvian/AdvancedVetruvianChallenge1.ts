/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
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
const ModifierDeathWatchBuffSelf = require('@duelyst/sdk/modifiers/modifierDeathWatchBuffSelf');
const i18next = require('i18next');

// http://forums.duelyst.com/t/patience-otk-1/11413

class AdvancedVetruvianChallenge1 extends Challenge {
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
  declare usesResetTurn: any;

  static type = 'AdvancedVetruvianChallenge1';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction3.General },
      { id: Cards.Neutral.PrimusFist },
      { id: Cards.Neutral.LadyLocke },
      { id: Cards.Spell.ScionsSecondWish },
      { id: Cards.Faction3.BrazierGoldenFlame },
      { id: Cards.Artifact.AnkhFireNova },
      { id: Cards.Artifact.StaffOfYKir },
      { id: Cards.Spell.Maelstrom },
      { id: Cards.Spell.ScionsThirdWish },
      { id: Cards.Neutral.Manaforger },
      { id: Cards.Spell.StarsFury },
      { id: Cards.Spell.Enslave },
      { id: Cards.Spell.Maelstrom },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [{ id: Cards.Faction4.General }, { id: Cards.TutorialSpell.TutorialFireOrb }];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 0, y: 4 });
    general1.maxHP = 25;
    general1.setDamage(25 - 2);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 5, y: 2 });
    general2.maxHP = 25;

    this.applyCardToBoard({ id: Cards.Faction3.Oserix }, 8, 0, myPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.Manaforger }, 5, 0, myPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.Manaforger }, 7, 2, myPlayerId);

    this.applyCardToBoard({ id: Cards.Faction4.SharianShadowdancer }, 1, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.Manaforger }, 2, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.NightsorrowAssassin }, 3, 4, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.SharianShadowdancer }, 5, 4, opponentPlayerId);

    // equip grimwar to lilith
    const grimwar = this.applyCardToBoard(
      { id: Cards.Artifact.SoulGrimwar },
      5,
      2,
      opponentPlayerId,
    );
    // buff lilithe from grimwar
    const grimwarModifier = general2.getModifierByType(ModifierDeathWatchBuffSelf.type);
    grimwarModifier.applyManagedModifiersFromModifiersContextObjects(
      grimwarModifier.modifiersContextObjects,
      general2,
    );
    return grimwarModifier.applyManagedModifiersFromModifiersContextObjects(
      grimwarModifier.modifiersContextObjects,
      general2,
    );
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    // Due to time maelstrom we don't know which turn the enemy general gets to finally act,
    // this will go away when we switch to resetting the otk on failure rather than ending turn and having a finisher
    return (() => {
      const result = [];
      for (let i = 0; i <= 5; i++) {
        this._opponentAgent.addActionForTurn(
          i,
          AgentActions.createAgentSoftActionShowInstructionLabels([
            {
              label: i18next.t('challenges.advanced_vetruvian_1_taunt'),
              isSpeech: true,
              yPosition: 0.7,
              isPersistent: true,
              isOpponent: true,
            },
          ]),
        );
        result.push(
          this._opponentAgent.addActionForTurn(
            i,
            AgentActions.createAgentActionPlayCardFindPosition(0, () => [
              GameSession.getInstance().getGeneralForPlayer1().getPosition(),
            ]),
          ),
        );
      }
      return result;
    })();
  }
}
AdvancedVetruvianChallenge1.prototype.type = 'AdvancedVetruvianChallenge1';
AdvancedVetruvianChallenge1.prototype.categoryType = ChallengeCategory.contest1.type;
AdvancedVetruvianChallenge1.prototype.name = i18next.t('challenges.advanced_vetruvian_1_title');
AdvancedVetruvianChallenge1.prototype.description = i18next.t(
  'challenges.advanced_vetruvian_1_description',
);
AdvancedVetruvianChallenge1.prototype.iconUrl = RSX.speech_portrait_vetruvian.img;
AdvancedVetruvianChallenge1.prototype._musicOverride = RSX.music_battlemap_vetruv.audio;
AdvancedVetruvianChallenge1.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.advanced_vetruvian_1_start',
);
AdvancedVetruvianChallenge1.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.advanced_vetruvian_1_fail'),
];
AdvancedVetruvianChallenge1.prototype.battleMapTemplateIndex = 6;
AdvancedVetruvianChallenge1.prototype.snapShotOnPlayerTurn = 0;
AdvancedVetruvianChallenge1.prototype.startingManaPlayer = 9;
AdvancedVetruvianChallenge1.prototype.startingHandSizePlayer = 4;
AdvancedVetruvianChallenge1.prototype.usesResetTurn = false;

module.exports = AdvancedVetruvianChallenge1;
