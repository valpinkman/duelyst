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
const i18next = require('i18next');

// http://forums.duelyst.com/t/lyonar-owl-punch/9396

class BeginnerLyonarChallenge3 extends Challenge {
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

  static type = 'BeginnerLyonarChallenge3';

  getMyPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction1.General },
      { id: Cards.Spell.Tempest },
      { id: Cards.Spell.AurynNexus },
      { id: Cards.Spell.Magnetize },
      { id: Cards.Spell.LionheartBlessing },
      { id: Cards.Neutral.AlcuinLoremaster },
      { id: Cards.Spell.DivineBond },
    ];
  }

  getOpponentPlayerDeckData(gameSession) {
    return [
      { id: Cards.Faction5.General },
      { id: Cards.TutorialSpell.TutorialFireOrb },
    ];
  }

  setupBoard(gameSession) {
    super.setupBoard(gameSession);

    const myPlayerId = gameSession.getMyPlayerId();
    const opponentPlayerId = gameSession.getOpponentPlayerId();

    const general1 = gameSession.getGeneralForPlayerId(myPlayerId);
    general1.setPosition({ x: 3, y: 2 });
    general1.maxHP = 10;
    const general2 = gameSession.getGeneralForPlayerId(opponentPlayerId);
    general2.setPosition({ x: 6, y: 2 });
    general2.maxHP = 25;

    this.applyCardToBoard({ id: Cards.Neutral.Manaforger }, 2, 3, myPlayerId);
    this.applyCardToBoard({ id: Cards.Faction1.SilverguardSquire }, 2, 1, myPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.OwlbeastSage }, 2, 2, myPlayerId);

    this.applyCardToBoard({ id: Cards.Neutral.HailstoneGolem }, 4, 4, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.RockPulverizer }, 4, 2, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.BloodshardGolem }, 4, 0, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.GolemMetallurgist }, 5, 3, opponentPlayerId);
    this.applyCardToBoard({ id: Cards.Neutral.BrightmossGolem }, 5, 2, opponentPlayerId);
    return this.applyCardToBoard({ id: Cards.Neutral.SkyrockGolem }, 5, 1, opponentPlayerId);
  }

  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(0, AgentActions.createAgentSoftActionShowInstructionLabels([{
      label: i18next.t('challenges.beginner_lyonar_3_taunt'),
      isSpeech: true,
      yPosition: 0.7,
      isPersistent: true,
      isOpponent: true,
    },
    ]));
    return this._opponentAgent.addActionForTurn(0, AgentActions.createAgentActionPlayCardFindPosition(0, () => [GameSession.getInstance().getGeneralForPlayer1().getPosition()]));
  }
}
BeginnerLyonarChallenge3.prototype.type = 'BeginnerLyonarChallenge3';
BeginnerLyonarChallenge3.prototype.categoryType = ChallengeCategory.vault2.type;
BeginnerLyonarChallenge3.prototype.name = i18next.t('challenges.beginner_lyonar_3_title');
BeginnerLyonarChallenge3.prototype.description = i18next.t('challenges.beginner_lyonar_3_description');
BeginnerLyonarChallenge3.prototype.iconUrl = RSX.speech_portrait_lyonar_side.img;
BeginnerLyonarChallenge3.prototype._musicOverride = RSX.music_battlemap_songhai.audio;
BeginnerLyonarChallenge3.prototype.otkChallengeStartMessage = i18next.t('challenges.beginner_lyonar_3_start');
BeginnerLyonarChallenge3.prototype.otkChallengeFailureMessages = [
  i18next.t('challenges.beginner_lyonar_3_fail'),
];
BeginnerLyonarChallenge3.prototype.battleMapTemplateIndex = 1;
BeginnerLyonarChallenge3.prototype.snapShotOnPlayerTurn = 0;
BeginnerLyonarChallenge3.prototype.startingManaPlayer = 7;
BeginnerLyonarChallenge3.prototype.startingHandSizePlayer = 5;

module.exports = BeginnerLyonarChallenge3;
