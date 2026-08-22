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

// http://forums.duelyst.com/t/vetruvia-test-of-knowledge/11390

class MediumVetruvianChallenge1 extends Challenge {
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

  static type = 'MediumVetruvianChallenge1';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction3.General },
      { id: Cards.Faction3.Dunecaster },
      { id: Cards.Spell.ScionsFirstWish },
      { id: Cards.Neutral.BloodtearAlchemist },
      { id: Cards.Neutral.Manaforger },
      { id: Cards.Spell.ScionsSecondWish },
      { id: Cards.Spell.StarsFury },
      { id: Cards.Spell.SiphonEnergy },
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
    general1.setPosition({ x: 2, y: 2 });
    general1.maxHP = 25;
    general1.setDamage(25 - 2);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 6, y: 2 });
    general2.maxHP = 25;

    this.applyCardToBoard({ id: Cards.Faction3.PortalGuardian }, 3, 3, myPlayerId);

    this.applyCardToBoard({ id: Cards.Faction4.ShadowWatcher }, 5, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 4, 4, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 4, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 5, 4, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 5, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 6, 4, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 6, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 7, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 8, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.Wraithling }, 8, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction4.SharianShadowdancer }, 8, 0, opponentPlayerId);

    // mana orbs
    this.applyCardToBoard({ id: Cards.Tile.BonusMana }, 4, 0);
    return this.applyCardToBoard({ id: Cards.Tile.BonusMana }, 5, 2);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.medium_vetruvian_1_taunt'),
          isSpeech: true,
          isPersistent: true,
          yPosition: 0.7,
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
MediumVetruvianChallenge1.prototype.type = 'MediumVetruvianChallenge1';
MediumVetruvianChallenge1.prototype.categoryType = ChallengeCategory.vault2.type;
MediumVetruvianChallenge1.prototype.name = i18next.t('challenges.medium_vetruvian_1_title');
MediumVetruvianChallenge1.prototype.description = i18next.t(
  'challenges.medium_vetruvian_1_description',
);
MediumVetruvianChallenge1.prototype.iconUrl = RSX.speech_portrait_vetruvian.img;
MediumVetruvianChallenge1.prototype._musicOverride = RSX.music_battlemap_vetruv.audio;
MediumVetruvianChallenge1.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.medium_vetruvian_1_start',
);
MediumVetruvianChallenge1.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.medium_vetruvian_1_fail'),
];
MediumVetruvianChallenge1.prototype.battleMapTemplateIndex = 6;
MediumVetruvianChallenge1.prototype.snapShotOnPlayerTurn = 0;
MediumVetruvianChallenge1.prototype.startingManaPlayer = 9;
MediumVetruvianChallenge1.prototype.startingHandSizePlayer = 4;

module.exports = MediumVetruvianChallenge1;
