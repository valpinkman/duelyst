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
const ModifierDeathWatchBuffSelf = require('app/sdk/modifiers/modifierDeathWatchBuffSelf');
const i18next = require('i18next');

// http://forums.duelyst.com/t/starter-challenge-vanar/7519

class BeginnerVetruvianChallenge3 extends Challenge {
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

  static type = 'BeginnerVetruvianChallenge3';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction3.General },
      { id: Cards.Neutral.EphemeralShroud },
      { id: Cards.Neutral.Maw },
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
    general1.setPosition({ x: 3, y: 2 });
    general1.maxHP = 25;
    general1.setDamage(25 - 3);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 6, y: 2 });
    general2.maxHP = 25;
    general2.setDamage(25 - 2);

    this.applyCardToBoard({ id: Cards.Tile.Shadow }, 4, 4, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Tile.Shadow }, 4, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Tile.Shadow }, 4, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Tile.Shadow }, 4, 0, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Tile.Shadow }, 5, 4, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Tile.Shadow }, 5, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Tile.Shadow }, 5, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Tile.Shadow }, 5, 0, opponentPlayerId);

    const shadowWatcher = this.applyCardToBoard(
      { id: Cards.Faction4.ShadowWatcher },
      5,
      2,
      opponentPlayerId,
    );
    const shadowWatcherModifier = shadowWatcher.getModifierByType(ModifierDeathWatchBuffSelf.type);
    return [0, 1, 2, 3].map((i) =>
      shadowWatcherModifier.applyManagedModifiersFromModifiersContextObjects(
        shadowWatcherModifier.modifiersContextObjects,
        shadowWatcher,
      ),
    );
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.beginner_vetruvian_3_taunt'),
          isSpeech: true,
          isPersistent: true,
          yPosition: 0.6,
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
BeginnerVetruvianChallenge3.prototype.type = 'BeginnerVetruvianChallenge3';
BeginnerVetruvianChallenge3.prototype.categoryType = ChallengeCategory.keywords.type;
BeginnerVetruvianChallenge3.prototype.name = i18next.t('challenges.beginner_vetruvian_3_title');
BeginnerVetruvianChallenge3.prototype.description = i18next.t(
  'challenges.beginner_vetruvian_3_description',
);
BeginnerVetruvianChallenge3.prototype.iconUrl = RSX.speech_portrait_vetruvian.img;
BeginnerVetruvianChallenge3.prototype._musicOverride = RSX.music_battlemap_vetruv.audio;
BeginnerVetruvianChallenge3.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.beginner_vetruvian_3_start',
);
BeginnerVetruvianChallenge3.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_vetruvian_3_fail'),
];
BeginnerVetruvianChallenge3.prototype.battleMapTemplateIndex = 0;
BeginnerVetruvianChallenge3.prototype.snapShotOnPlayerTurn = 0;
BeginnerVetruvianChallenge3.prototype.startingManaPlayer = 4;
BeginnerVetruvianChallenge3.prototype.startingHandSizePlayer = 4;

module.exports = BeginnerVetruvianChallenge3;
