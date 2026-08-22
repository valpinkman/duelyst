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
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const i18next = require('i18next');

// http://forums.duelyst.com/t/starter-challenge-vanar/7519

class AdvancedVanarChallenge2 extends Challenge {
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

  static type = 'AdvancedVanarChallenge2';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction6.General },
      { id: Cards.Spell.RitualOfTheWind },
      { id: Cards.Neutral.PrimusFist },
      { id: Cards.Spell.RitualOfTheWind },
      { id: Cards.Neutral.FirstSwordofAkrane },
      { id: Cards.Spell.RitualOfTheWind },
      { id: Cards.Spell.AspectOfTheWolf },
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
    general1.setPosition({ x: 4, y: 0 });
    general1.maxHP = 25;
    general1.setDamage(25 - 13);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 4, y: 2 });
    general2.maxHP = 25;

    this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 3, 3, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BlazingSpines }, 3, 2, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 3, 1, myPlayerId);

    this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 4, 3, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 4, 1, myPlayerId);

    this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 5, 3, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction6.BlazingSpines }, 5, 2, myPlayerId);
    return this.applyCardToBoard({ id: Cards.Faction6.BonechillBarrier }, 5, 1, myPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.advanced_vanar_2_taunt'),
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
AdvancedVanarChallenge2.prototype.type = 'AdvancedVanarChallenge2';
AdvancedVanarChallenge2.prototype.categoryType = ChallengeCategory.vault2.type;
AdvancedVanarChallenge2.prototype.name = i18next.t('challenges.advanced_vanar_2_title');
AdvancedVanarChallenge2.prototype.description = i18next.t(
  'challenges.advanced_vanar_2_description',
);
AdvancedVanarChallenge2.prototype.iconUrl = RSX.speech_portrait_vanar.img;
AdvancedVanarChallenge2.prototype._musicOverride = RSX.music_battlemap_vanar.audio;
AdvancedVanarChallenge2.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.advanced_vanar_2_start',
);
AdvancedVanarChallenge2.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.advanced_vanar_2_fail'),
];
AdvancedVanarChallenge2.prototype.battleMapTemplateIndex = 3;
AdvancedVanarChallenge2.prototype.snapShotOnPlayerTurn = 0;
AdvancedVanarChallenge2.prototype.startingManaPlayer = CONFIG.MAX_MANA;
AdvancedVanarChallenge2.prototype.startingHandSizePlayer = 6;

module.exports = AdvancedVanarChallenge2;
