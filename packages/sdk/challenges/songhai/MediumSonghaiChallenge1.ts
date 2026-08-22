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

// http://forums.duelyst.com/t/songhai-shuffle/9543

class MediumSonghaiChallenge1 extends Challenge {
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

  static type = 'MediumSonghaiChallenge1';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction2.General },
      { id: Cards.Spell.InnerFocus },
      { id: Cards.Spell.Juxtaposition },
      { id: Cards.Spell.Juxtaposition },
      { id: Cards.Spell.GhostLightning },
      { id: Cards.Spell.InnerFocus },
      { id: Cards.Spell.GhostLightning },
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
    general1.setPosition({ x: 2, y: 2 });
    general1.maxHP = 25;
    general1.setDamage(25 - 10);
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 5, y: 2 });
    general2.maxHP = 25;
    general2.setDamage(25 - 5);

    this.applyCardToBoard({ id: Cards.Faction2.KaidoAssassin }, 1, 2, myPlayerId);

    this.applyCardToBoard({ id: Cards.Faction1.SilverguardKnight }, 5, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction1.SilverguardKnight }, 5, 1, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction1.Lightchaser }, 6, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Faction1.SilverguardKnight }, 6, 2, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Faction1.Lightchaser }, 6, 1, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: i18next.t('challenges.medium_songhai_1_taunt'),
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
MediumSonghaiChallenge1.prototype.type = 'MediumSonghaiChallenge1';
MediumSonghaiChallenge1.prototype.categoryType = ChallengeCategory.vault1.type;
MediumSonghaiChallenge1.prototype.name = i18next.t('challenges.medium_songhai_1_title');
MediumSonghaiChallenge1.prototype.description = i18next.t(
  'challenges.medium_songhai_1_description',
);
MediumSonghaiChallenge1.prototype.iconUrl = RSX.speech_portrait_songhai.img;
MediumSonghaiChallenge1.prototype._musicOverride = RSX.music_battlemap_songhai.audio;
MediumSonghaiChallenge1.prototype.otkChallengeStartMessage = i18next.t(
  'challenges.medium_songhai_1_start',
);
MediumSonghaiChallenge1.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.medium_songhai_1_fail'),
];
MediumSonghaiChallenge1.prototype.battleMapTemplateIndex = 2;
MediumSonghaiChallenge1.prototype.snapShotOnPlayerTurn = 0;
MediumSonghaiChallenge1.prototype.startingManaPlayer = CONFIG.MAX_MANA;
MediumSonghaiChallenge1.prototype.startingHandSizePlayer = 6;

module.exports = MediumSonghaiChallenge1;
