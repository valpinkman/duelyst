/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Challenge = require('@duelyst/sdk/challenges/challenge');
const GameSession = require('@duelyst/sdk/gameSession');
const FactionFactory = require('@duelyst/sdk/cards/factionFactory');
const AgentActions = require('@duelyst/sdk/agents/agentActions');
const RSX = require('app/data/resources');
const BattleMapTemplate = require('@duelyst/sdk/battleMapTemplate');
const _ = require('underscore');
const fetch = require('isomorphic-fetch');
const i18next = require('i18next');
const PromiseUtils = require('app/common/utils/utils_promise');

class ChallengeRemote extends Challenge {
  declare type: any;
  declare categoryType: any;
  declare isDaily: any;
  declare name: any;
  declare description: any;
  declare iconUrl: any;
  declare _musicOverride: any;
  declare otkChallengeStartMessage: any;
  declare otkChallengeFailureMessages: any;
  declare snapShotOnPlayerTurn: any;
  declare _gameSessionData: any;

  static type = 'rando-1';

  static loadAndCreateFromModelData(modelAttributes) {
    return PromiseUtils.withTimeout(Promise.resolve(fetch(modelAttributes.url)), 10000)
      .catch(this._networkError.bind(this))
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        const err = new Error(res.statusText) as Error & { status?: number; innerMessage?: string };
        err.status = res.status;
        throw err;
      })
      .then((data) => this.createFromGameSessionData(modelAttributes, data));
  }

  static createFromGameSessionData(modelAttributes, data) {
    const challenge = new ChallengeRemote(data);
    challenge.type = modelAttributes.challenge_id;
    //    challenge.name = modelAttributes.title
    //    challenge.description = modelAttributes.description
    challenge.name = i18next.t('challenges.daily_challenge_label');
    let opponentFactionName = 'enemy';
    if (
      __guard__(
        __guard__(
          __guard__(data != null ? data.gameSetupData : undefined, (x2) => x2.players),
          (x1) => x1[1],
        ),
        (x) => x.factionId,
      ) != null
    ) {
      const opponentFullFactionName = FactionFactory.factionForIdentifier(
        data.gameSetupData.players[1].factionId,
      ).name;
      opponentFactionName = opponentFullFactionName.split(' ')[0];
    }
    challenge.goldReward = modelAttributes.gold;
    // challenge.description = "Defeat the #{opponentFactionName} General in ONE turn."
    challenge.description = i18next.t('challenges.daily_challenge_desc', {
      faction: this.opponentFactionName,
    });
    challenge.otkChallengeStartMessage = modelAttributes.instructions;
    //    challenge.otkChallengeFailureMessages = [modelAttributes.hint]
    challenge.otkChallengeFailureMessages = [];

    // This is only present when a challenge is loaded from QA tool by date, NOT INTENDED FOR OTHER USE
    challenge.dateKey = modelAttributes.dateKey;

    // Set up iconUrl
    if (
      __guard__(
        __guard__(
          __guard__(data != null ? data.gameSetupData : undefined, (x5) => x5.players),
          (x4) => x4[0],
        ),
        (x3) => x3.generalId,
      ) != null
    ) {
      const { generalId } = data.gameSetupData.players[0];
      const generalSdkCard = GameSession.getCardCaches().getCardById(generalId);
      const generalSpeechResource = generalSdkCard.getSpeechResource();
      if (generalSpeechResource != null) {
        challenge.iconUrl = generalSpeechResource.img;
      }
    }

    return Promise.resolve(challenge);
  }

  constructor(data) {
    super();

    this.hiddenUIElements = _.without(this.hiddenUIElements, 'SignatureCard');

    this._gameSessionData = data;
  }

  /**
   * Set up the GameSession for this challenge.
   * @public
   */
  setupSession(gameSession, player1Data, player2Data) {
    // overwrite players names
    this._gameSessionData.players[0].username = i18next.t('challenges.challenge_p1_label');
    this._gameSessionData.players[1].username = i18next.t('challenges.challenge_p2_label');

    gameSession.deserializeSessionFromFirebase(this._gameSessionData);

    gameSession.setUserId(gameSession.getPlayer1Id());

    // set game session challenge
    gameSession.setChallenge(this);

    // set modes
    this.setupSessionModes(gameSession);

    // Disable ability to replace
    const player1 = gameSession != null ? gameSession.getPlayer1() : undefined;
    const deck = player1 != null ? player1.getDeck() : undefined;
    if (deck != null) {
      deck.setNumCardsReplacedThisTurn(1);
    }

    // set battlemap template
    if (this.battleMapTemplateIndex != null) {
      gameSession.setBattleMapTemplate(
        new BattleMapTemplate(gameSession, this.battleMapTemplateIndex),
      );
    }

    // setup agent
    this.setupOpponentAgent(gameSession);

    // force game session to sync state
    // in case any challenges set custom board state or stats
    gameSession.syncState();

    const currentTurnIndex = GameSession.current().getNumberOfTurns(); // current turn count calculation is ugly
    const playersTurnIndex = Math.floor(currentTurnIndex / 2); // represents the index of turn for this player

    this.snapShotOnPlayerTurn = playersTurnIndex;

    // snapshot complete session
    this._snapShotChallengeIfNeeded();

    return gameSession;
  }

  /**
   * Set up the Oppponent Agent action for this challenge.
   * @public
   */
  setupOpponentAgent(gameSession) {
    super.setupOpponentAgent(gameSession);

    this._opponentAgent.addActionForTurn(
      0,
      AgentActions.createAgentSoftActionShowInstructionLabels([
        {
          label: 'Say your prayers.',
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
        gameSession.getGeneralForPlayer1().getPosition(),
      ]),
    );
  }
}
ChallengeRemote.prototype.type = 'rando-1';
ChallengeRemote.prototype.categoryType = null;
ChallengeRemote.prototype.isDaily = true;
ChallengeRemote.prototype.name = '<name>';
ChallengeRemote.prototype.description = '<description>';
ChallengeRemote.prototype.iconUrl = RSX.speech_portrait_vanar.img;
ChallengeRemote.prototype._musicOverride = RSX.music_battlemap_vanar.audio;
ChallengeRemote.prototype.otkChallengeStartMessage = '<instructions>';
ChallengeRemote.prototype.otkChallengeFailureMessages = ['Hint:...'];
ChallengeRemote.prototype.snapShotOnPlayerTurn = 0;
ChallengeRemote.prototype._gameSessionData = null;

module.exports = ChallengeRemote;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
