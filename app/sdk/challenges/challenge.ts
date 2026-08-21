/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EventBus = require('app/common/eventbus');
const EVENTS = require('app/common/event_types');
const UtilsJavascript = require('app/common/utils/utils_javascript');
const GameSession = require('app/sdk/gameSession');
const GameStatus = require('app/sdk/gameStatus');
const GameType = require('app/sdk/gameType');
const GameSetup = require('app/sdk/gameSetup');
const Card = require('app/sdk/cards/card');
const StaticAgent = require('app/sdk/agents/staticAgent');
const DrawStartingHandAction = require('app/sdk/actions/drawStartingHandAction');
const BattleMapTemplate = require('app/sdk/battleMapTemplate');
const i18next = require('i18next');

class Challenge {
  declare _snapShotData: any;
  declare type: any;
  declare name: any;
  declare description: any;
  declare battleMapTemplateIndex: any;
  declare _currentInstruction: any;
  declare _currentPlayerTurn: any;
  declare _eventBus: any;
  declare hiddenUIElements: any;
  declare iconUrl: any;
  declare _instructions: any;
  declare _instructionQueueByTurnIndex: any;
  /*
   * What the code actually reads and writes. The prototype default above uses
   * a different name and is never touched -- that mismatch is in the 2016
   * source too, so it is left alone rather than renamed: these classes are
   * serialized structurally and the prototype/instance split is the wire format.
   */
  declare _instructionsByTurnIndex: any;
  declare isChallengeLost: any;
  declare _musicOverride: any;
  declare _nextInstructionIndex: any;
  declare _playerOwnedBoardTemplate: any;
  declare prerequisiteChallengeTypes: any;
  declare _opponentAgent: any;
  declare _opponentOwnedBoardTemplate: any;
  declare otkChallengeFailureCount: any;
  declare otkChallengeFailureMessages: any;
  declare otkChallengeStartMessage: any;
  declare requiredMulliganHandIndices: any;
  declare showCardInstructionalTextForTurns: any;
  declare customBoard: any;
  declare skipMulligan: any;
  declare snapShotOnPlayerTurn: any;
  declare startingHandSize: any;
  declare startingHandSizePlayer: any;
  declare startingHandSizeOpponent: any;
  declare startingMana: any;
  declare startingManaPlayer: any;
  declare startingManaOpponent: any;
  declare unmulliganableHandIndices: any;
  declare userIsPlayer1: any;
  declare usesResetTurn: any;

  static type = 'Challenge';

  /**
   * Challenge constructor.
   * @public
   */
  constructor() {
    this._eventBus = EventBus.create();
    this._instructions = [];
    this.hiddenUIElements = ['SignatureCard'];
    this._instructionsByTurnIndex = [];
    this._nextInstructionIndex = 0;
    this.unmulliganableHandIndices = [];
    this.requiredMulliganHandIndices = [];
    this.prerequisiteChallengeTypes = [];
    this.otkChallengeFailureCount = 0;
  }

  /**
   * SDK event handler. Do not call this method manually.
   */
  onEvent(event) {
    if (event.type === EVENTS.validate_game_over) {
      this._onValidateGameOver(event);
    } else if (event.type === EVENTS.start_turn) {
      this._onStartTurn(event);
    }

    if (this._currentInstruction != null) {
      return this._currentInstruction.onEvent(event);
    }
  }

  /**
   * Get the event bus for this challenge.
   * @public
   */
  getEventBus() {
    return this._eventBus;
  }

  getType() {
    return this.type;
  }

  getSkipMulligan() {
    return this.skipMulligan;
  }

  /**
   * Get an array of all the instructions for this challenge.
   * @public
   * @return  {Array}    Array of Instruction objects.
   */
  getInstructions() {
    return this._instructions;
  }

  /**
   * Get current instruction for this challenge.
   * @public
   * @return  {Instruction}    Current instruction.
   */
  getCurrentInstruction() {
    return this._currentInstruction;
  }

  /**
   * Get opponent agent for this challenge.
   * @public
   * @return  {BaseAgent}    Current instruction.
   */
  getOpponentAgent() {
    return this._opponentAgent;
  }

  /**
   * Returns deck data for my player.
   * @param {GameSession} gameSession
   * @returns {Array}
   */
  getMyPlayerDeckData(gameSession) {
    // override in subclass
    return [];
  }

  /**
   * Returns deck data for opponent player
   * @param {GameSession} gameSession
   * @returns {Array}
   */
  getOpponentPlayerDeckData(gameSession) {
    // override in subclass
    return [];
  }

  /**
   * Set up the GameSession for this challenge.
   * @public
   */
  setupSession(gameSession, player1Data, player2Data) {
    // set game session challenge
    let player1DeckData;
    let player1Id;
    let player1Name;
    let player1StartingHandSize;
    let player1StartingMana;
    let player2DeckData;
    let player2Id;
    let player2Name;
    let player2StartingHandSize;
    let player2StartingMana;
    gameSession.setChallenge(this);

    // set modes
    this.setupSessionModes(gameSession);

    // set battlemap template
    if (this.battleMapTemplateIndex != null) {
      gameSession.setBattleMapTemplate(
        new BattleMapTemplate(gameSession, this.battleMapTemplateIndex),
      );
    }

    // get ids and names
    if (this.userIsPlayer1) {
      player1Name = i18next.t('battle.your_name_default_label');
      player2Name = i18next.t('battle.opponent_name_default_label');
      player1Id = gameSession.getUserId();
      player2Id = 'CPU';
      player1StartingMana =
        this.startingManaPlayer != null
          ? this.startingManaPlayer
          : this.startingMana != null
            ? this.startingMana
            : null;
      player2StartingMana =
        this.startingManaOpponent != null
          ? this.startingManaOpponent
          : this.startingMana != null
            ? this.startingMana + 1
            : null;
      player1StartingHandSize =
        this.startingHandSizePlayer != null ? this.startingHandSizePlayer : this.startingHandSize;
      player2StartingHandSize =
        this.startingHandSizeOpponent != null
          ? this.startingHandSizeOpponent
          : this.startingHandSize;
      player1DeckData = this.getMyPlayerDeckData(gameSession);
      player2DeckData = this.getOpponentPlayerDeckData(gameSession);
    } else {
      player1Name = i18next.t('battle.opponent_name_default_label');
      player2Name = i18next.t('battle.your_name_default_label');
      player1Id = 'CPU';
      player2Id = gameSession.getUserId();
      player1StartingMana =
        this.startingManaOpponent != null
          ? this.startingManaOpponent
          : this.startingMana != null
            ? this.startingMana
            : null;
      player2StartingMana =
        this.startingManaPlayer != null
          ? this.startingManaPlayer
          : this.startingMana != null
            ? this.startingMana + 1
            : null;
      player1StartingHandSize =
        this.startingHandSizeOpponent != null
          ? this.startingHandSizeOpponent
          : this.startingHandSize;
      player2StartingHandSize =
        this.startingHandSizePlayer != null ? this.startingHandSizePlayer : this.startingHandSize;
      player1DeckData = this.getOpponentPlayerDeckData(gameSession);
      player2DeckData = this.getMyPlayerDeckData(gameSession);
    }

    // ensure basic player data
    player1Data = UtilsJavascript.fastExtend(
      {
        userId: player1Id,
        name: player1Name,
        deck: player1DeckData,
        startingHandSize: player1StartingHandSize,
        startingMana: player1StartingMana,
      },
      player1Data,
    );
    player2Data = UtilsJavascript.fastExtend(
      {
        userId: player2Id,
        name: player2Name,
        deck: player2DeckData,
        startingHandSize: player2StartingHandSize,
        startingMana: player2StartingMana,
      },
      player2Data,
    );

    // setup session
    GameSetup.setupNewSession(gameSession, player1Data, player2Data, this.customBoard);

    // skip mulligan as needed
    if (this.skipMulligan) {
      gameSession.setStatus(GameStatus.active);
      for (var player of Array.from<any>(gameSession.players)) {
        player.setHasStartingHand(true);
      }
    }

    // setup board
    this.setupBoard(gameSession);

    // setup agent
    this.setupOpponentAgent(gameSession);

    // force game session to sync state
    // in case any challenges set custom board state or stats
    gameSession.syncState();

    // snapshot complete session
    this._snapShotChallengeIfNeeded();

    return gameSession;
  }

  /**
   * Sets up the game session modes before creating any game elements.
   * @param {GameSession} gameSession
   */
  setupSessionModes(gameSession) {
    gameSession.setGameType(GameType.Challenge);
    return gameSession.setIsRunningAsAuthoritative(true);
  }

  /**
   * Sets up the board state.
   * @param {GameSession} gameSession
   */
  setupBoard(gameSession) {}
  // override in subclass

  /**
   * Creates the opponent agent.
   * @param {GameSession} gameSession
   */
  setupOpponentAgent(gameSession) {
    // get agent player id
    let cpuGeneral;
    let cpuPlayer;
    let cpuPlayerId;
    if (this.userIsPlayer1) {
      cpuPlayer = gameSession.getPlayer2();
      cpuPlayerId = cpuPlayer.getPlayerId();
      cpuGeneral = gameSession.getGeneralForPlayer2();
    } else {
      cpuPlayer = gameSession.getPlayer1();
      cpuPlayerId = cpuPlayer.getPlayerId();
      cpuGeneral = gameSession.getGeneralForPlayer1();
    }

    // create agent
    this._opponentAgent = new StaticAgent(cpuPlayerId);

    // skip agent mulligan
    cpuPlayer.setHasStartingHand(true);

    // tag general
    return this._opponentAgent.addUnitWithTag(cpuGeneral, 'general');
  }

  /**
   * Pushes an instruction onto the queue for a turn
   * @param  {Object}  event  event data with format {step:...}
   * @private
   */
  addInstructionToQueueForTurnIndex(turnIndex, instruction) {
    if (!this._instructionsByTurnIndex[turnIndex]) {
      this._instructionsByTurnIndex[turnIndex] = [];
    }

    return this._instructionsByTurnIndex[turnIndex].push(instruction);
  }

  // #*
  // Activates the next instruction if it's the players turn
  // TODO: Can check here for if the last instruction was completed to allow for instructions that span multiple steps
  // @private
  // #
  activateNextInstruction() {
    if (this._currentInstruction) {
      this._currentInstruction = null;
    }

    if (!GameSession.current().isMyTurn()) {
      return;
    }

    // Get the player turn index
    const currentTurnIndex = GameSession.current().getNumberOfTurns(); // current turn count calculation is ugly
    const playersTurnIndex = Math.floor(currentTurnIndex / 2); // represents the index of turn for this player

    // check for a new turn
    if (this._currentPlayerTurn == null || this._currentPlayerTurn !== playersTurnIndex) {
      this._currentPlayerTurn = playersTurnIndex;
      this._nextInstructionIndex = 0;
    }

    const nextInstruction =
      this._instructionsByTurnIndex[playersTurnIndex] != null
        ? this._instructionsByTurnIndex[playersTurnIndex][this._nextInstructionIndex]
        : undefined;

    if (nextInstruction) {
      this._currentInstruction = nextInstruction;
      this._eventBus.trigger(EVENTS.instruction_triggered, {
        type: EVENTS.instruction_triggered,
        instruction: nextInstruction,
      });
      return this._nextInstructionIndex++;
    }
  }

  hasInstructionForGameTurn(gameTurnIndex) {
    const playersTurnIndex = Math.floor(gameTurnIndex / 2); // represents the index of turn for this player
    return this._instructionsByTurnIndex[playersTurnIndex] != null;
  }

  _onStartTurn(e) {
    return this._snapShotChallengeIfNeeded();
  }

  _snapShotChallengeIfNeeded() {
    if (
      this.snapShotOnPlayerTurn != null &&
      GameSession.current().getCurrentPlayerId() === GameSession.current().getMyPlayerId()
    ) {
      // Get the player turn index
      const currentTurnIndex = GameSession.current().getNumberOfTurns(); // current turn count calculation is ugly
      const playersTurnIndex = Math.floor(currentTurnIndex / 2); // represents the index of turn for this player

      if (playersTurnIndex === this.snapShotOnPlayerTurn && !this._snapShotData) {
        const gameSession = GameSession.current();
        this._snapShotData = gameSession.serializeToJSON(gameSession);
        return this._eventBus.trigger(EVENTS.challenge_start, { type: EVENTS.challenge_start });
      }
    }
  }

  _onValidateGameOver(event?) {
    const gameSession = GameSession.current();
    const myGeneral = gameSession.getGeneralForPlayerId(gameSession.getMyPlayerId());

    if (this.snapShotOnPlayerTurn != null && myGeneral.getIsRemoved()) {
      // set general as not removed so that game does not end
      myGeneral.setIsRemoved(false);

      // trigger challenge loss
      return this.onChallengeLost();
    }
  }

  onChallengeLost() {
    // record loss
    this.otkChallengeFailureCount++;
    this.isChallengeLost = true;

    // trigger challenge lost event
    return this._eventBus.trigger(EVENTS.challenge_lost, {
      type: EVENTS.challenge_lost,
      needsRollback: true,
    });
  }

  challengeReset() {
    // trigger challenge loss
    this.onChallengeLost();

    // trigger challenge reset event
    return this._eventBus.trigger(EVENTS.challenge_reset, { type: EVENTS.challenge_reset });
  }

  challengeRollback() {
    const gameSession = GameSession.current();
    gameSession._rollbackToSnapshot(this._snapShotData);
    // Reset opponent agents action sequence
    this._opponentAgent.currentTurnIndex = undefined;
    this._opponentAgent.currentActionIndexInTurn = 0;
    return (this.isChallengeLost = false);
  }

  applyCardToBoard(cardOrCardData, boardX, boardY, ownerId) {
    const gameSession = GameSession.getInstance();

    // create card as needed
    if (!(cardOrCardData instanceof Card)) {
      cardOrCardData = gameSession.getExistingCardFromIndexOrCreateCardFromData(cardOrCardData);
    }

    // apply card
    if (cardOrCardData != null) {
      if (ownerId != null) {
        cardOrCardData.setOwnerId(ownerId);
      }

      gameSession.applyCardToBoard(cardOrCardData, boardX, boardY);

      if (cardOrCardData.refreshExhaustion) {
        cardOrCardData.refreshExhaustion();
      }

      return cardOrCardData;
    }
  }
}
Challenge.prototype.type = 'Challenge';
Challenge.prototype.name = 'Challenge';
Challenge.prototype.description = 'Learn how to play DUELYST.';
Challenge.prototype.battleMapTemplateIndex = 0;
Challenge.prototype._currentInstruction = null;
Challenge.prototype._currentPlayerTurn = null;
Challenge.prototype._eventBus = null;
Challenge.prototype.hiddenUIElements = null;
Challenge.prototype.iconUrl = null;
Challenge.prototype._instructions = null;
Challenge.prototype._instructionQueueByTurnIndex = null;
Challenge.prototype.isChallengeLost = false;
Challenge.prototype._musicOverride = undefined;
Challenge.prototype._nextInstructionIndex = 0;
Challenge.prototype._playerOwnedBoardTemplate = undefined;
Challenge.prototype.prerequisiteChallengeTypes = null;
Challenge.prototype._opponentAgent = null;
Challenge.prototype._opponentOwnedBoardTemplate = undefined;
Challenge.prototype.otkChallengeFailureCount = null;
Challenge.prototype.otkChallengeFailureMessages = null;
Challenge.prototype.otkChallengeStartMessage = null;
Challenge.prototype.requiredMulliganHandIndices = null;
Challenge.prototype.showCardInstructionalTextForTurns = 0;
Challenge.prototype.customBoard = true;
Challenge.prototype.skipMulligan = true;
Challenge.prototype.snapShotOnPlayerTurn = null;
Challenge.prototype.startingHandSize = null;
Challenge.prototype.startingHandSizePlayer = null;
Challenge.prototype.startingHandSizeOpponent = null;
Challenge.prototype.startingMana = null;
Challenge.prototype.startingManaPlayer = null;
Challenge.prototype.startingManaOpponent = null;
Challenge.prototype.unmulliganableHandIndices = null;
Challenge.prototype.userIsPlayer1 = true;
Challenge.prototype.usesResetTurn = true;

module.exports = Challenge;
