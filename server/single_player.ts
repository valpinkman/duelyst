/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
Game Server Pieces
*/
const fs = require('fs');
const os = require('os');
const util = require('util');
const _ = require('underscore');
const colors = require('colors'); // used for console message coloring
const jwt = require('jsonwebtoken');
let io = require('socket.io');
const ioJwt = require('@thream/socketio-jwt');
const moment = require('moment');
const request = require('superagent');

// Our modules
const shutdownLib = require('./shutdown');
const StarterAI = require('./ai/starter_ai');
const SDK = require('../app/sdk');
let Logger = require('../app/common/logger');
const EVENTS = require('../app/common/event_types');
const UtilsGameSession = require('../app/common/utils/utils_game_session');

// lib Modules
const Consul = require('./lib/consul');

// Configuration object
const config = require('../config/config.js');

const env = config.get('env');

// Boots up a basic HTTP server on port 8080
// Responds to /health endpoint with status 200
// Otherwise responds with status 404

Logger = require('../app/common/logger');
const CONFIG = require('../app/common/config');
const http = require('http');
const url = require('url');

// perform DNS health check
const dnsHealthCheck = function () {
  if (config.isDevelopment()) {
    return Promise.resolve({ healthy: true });
  }
  const nodename = `${config.get('env')}-${os.hostname().split('.')[0]}`;
  return Consul.kv.get(`nodes/${nodename}/dns_name`)
    .then((dnsName) => new Promise((resolve, reject) => request.get(`https://${dnsName}/health`)
      .end(function (err, res) {
        if (err) {
          return resolve({ dnsName, healthy: false });
        }
        if ((res != null) && (res.status === 200)) {
          return resolve({ dnsName, healthy: true });
        }
        return { dnsName, healthy: false };
      }))).catch((e) => ({
      healthy: false,
    }));
};

// create http server and respond to /health requests
const server = http.createServer(function (req, res) {
  const {
    pathname,
  } = url.parse(req.url);
  if (pathname === '/health') {
    // Logger.module("GAME SERVER").debug "HTTP Health Ping"
    res.statusCode = 200;
    res.write(JSON.stringify({ players: playerCount, games: gameCount }));
    return res.end();
  } else {
    res.statusCode = 404;
    return res.end();
  }
});

// io server setup, binds to http server
io = require('socket.io')().listen(server, {
  cors: {
    origin: '*',
  },
});

io.use(
  ioJwt.authorize({
    secret: config.get('firebase.legacyToken'),
    timeout: 15000,
  }),
);
module.exports = io;
let port = config.get('sp_port');
server.listen(port, () => Logger.module('AI SERVER').log(`SP server started on port ${port}`));

// redis
const { Redis, Jobs, GameManager } = require('./redis');
const PromiseUtils = require('../app/common/utils/utils_promise');

// server id for this game server
const serverId = os.hostname();

// the 'games' hash maps game IDs to References for those games
const games = {};

// save some basic stats about this server into redis
var playerCount = 0;
var gameCount = 0;

// turn times
const MAX_TURN_TIME = (CONFIG.TURN_DURATION + CONFIG.TURN_DURATION_LATENCY_BUFFER) * 1000.0;
const MAX_TURN_TIME_INACTIVE = (CONFIG.TURN_DURATION_INACTIVE + CONFIG.TURN_DURATION_LATENCY_BUFFER) * 1000.0;

const savePlayerCount = (playerCount) => Redis.hset(`servers:${serverId}`, 'players', playerCount);

const saveGameCount = (gameCount) => Redis.hset(`servers:${serverId}`, 'games', gameCount);

// health ping on socket namespace /health
const healthPing = io
  .of('/health')
  .on('connection', (socket) => socket.on('ping', function () {
    Logger.module('GAME SERVER').debug('socket.io Health Ping');
    return socket.emit('pong');
  }));

io.sockets.on('connection', function (socket) {
  // Socket is now authenticated, continue to bind other handlers
  Logger.module('IO').log(`DECODED TOKEN ID: ${socket.decodedToken.d.id.blue}`);
  Logger.module('IO').log(`TOKEN ID: ${socket.id.blue}`);

  savePlayerCount(++playerCount);

  // Send message to user that connection is succesful
  socket.emit('connected',
    { message: 'Successfully connected to server' });

  // Bind socket event handlers
  socket.on(EVENTS.join_game, onGamePlayerJoin);
  socket.on(EVENTS.spectate_game, onGameSpectatorJoin);
  socket.on(EVENTS.leave_game, onGameLeave);
  socket.on(EVENTS.network_game_event, onGameEvent);
  return socket.on('disconnect', onGameDisconnect);
});

const getConnectedSpectatorsDataForGamePlayer = function (gameId, playerId) {
  const spectators = [];
  __guard__(io.sockets.adapter.rooms.get(`spectate-${gameId}`), (x) => x.forEach(function (socketId) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket.playerId === playerId) {
      return spectators.push({
        id: socket.spectatorId,
        playerId: socket.playerId,
        username: (socket.spectateToken != null ? socket.spectateToken.u : undefined),
      });
    }
  }));
  return spectators;
};

/*
 * socket handler for players joining game
 * @public
 * @param  {Object}  requestData    Plain JS object with socket event data.
 */
var onGamePlayerJoin = function (requestData) {
  const _self = this;
  // request parameters
  const {
    gameId,
  } = requestData;
  const {
    playerId,
  } = requestData;

  Logger.module('IO').log(`[G:${gameId}]`, `join_game -> player:${requestData.playerId} is joining game:${requestData.gameId}`.cyan);

  // you must have a playerId
  if (!playerId) {
    Logger.module('IO').log(`[G:${gameId}]`, `join_game -> REFUSING JOIN: A player ${playerId.blue} is not valid`.red);
    this.emit('join_game_response',
      { error: 'Your player id seems to be blank (has your login expired?), so we can\'t join you to the game.' });
    return;
  }

  // must have a gameId
  if (!gameId) {
    Logger.module('IO').log(`[G:${gameId}]`, `join_game -> REFUSING JOIN: A gameId ${gameId.blue} is not valid`.red);
    this.emit('join_game_response',
      { error: 'Invalid Game ID.' });
    return;
  }

  // if someone is trying to join a game they don't belong to as a player they are not authenticated as
  if (this.decodedToken.d.id !== playerId) {
    Logger.module('IO').log(`[G:${gameId}]`, `join_game -> REFUSING JOIN: A player ${this.decodedToken.d.id.blue} is attempting to join a game as ${playerId.blue}`.red);
    this.emit('join_game_response',
      { error: 'Your player id does not match the one you requested to join a game with. Are you sure you\'re joining the right game?' });
    return;
  }

  // if a client is already in another game, leave it
  playerLeaveGameIfNeeded(this);

  // if this client already exists in this game, disconnect duplicate client
  __guard__(io.sockets.adapter.rooms.get(gameId), (x) => x.forEach(function (socketId) {
    const socket = io.sockets.sockets.get(socketId);
    if ((socket != null) && (socket.playerId === playerId)) {
      let silent;
      Logger.module('IO').log(`[G:${gameId}]`, `join_game -> detected duplicate connection to ${gameId} GameSession for ${playerId.blue}. Disconnecting duplicate...`.cyan);
      return playerLeaveGameIfNeeded(socket, (silent = true));
    }
  }));

  // initialize a server-side game session and join it
  return initGameSession(gameId)
    .then(function ([gameSession]) {
    // Logger.module("IO").debug "[G:#{gameId}]", "join_game -> players in data: ", gameSession.players

      // player
      const player = _.find(gameSession.players, (p) => p.playerId === playerId);

      // get the opponent based on the game session data
      const opponent = _.find(gameSession.players, (p) => p.playerId !== playerId);

      Logger.module('IO').log(`[G:${gameId}]`, `join_game -> Got ${gameId} GameSession data ${playerId.blue}.`.cyan);

      if (!player) { // oops looks like this player does not exist in the requested game
      // let the socket know we had an error
        _self.emit('join_game_response',
          { error: 'could not join game because your player id could not be found' });

        // destroy the game data loaded so far if the opponent can't be defined and no one else is connected
        Logger.module('IO').log(`[G:${gameId}]`, 'onGameJoin -> DESTROYING local game cache due to join error'.red);
        destroyGameSessionIfNoConnectionsLeft(gameId);

        // stop any further processing
      } else if ((opponent == null)) { // oops, looks like we can'f find an opponent in the game session?
        Logger.module('IO').log(`[G:${gameId}]`, `join_game -> game ${gameId} ERROR: could not find opponent for ${playerId.blue}.`.red);

        // let the socket know we had an error
        _self.emit('join_game_response',
          { error: 'could not join game because the opponent could not be found' });

        // destroy the game data loaded so far if the opponent can't be defined and no one else is connected
        Logger.module('IO').log(`[G:${gameId}]`, 'onGameJoin -> DESTROYING local game cache due to join error'.red);
        destroyGameSessionIfNoConnectionsLeft(gameId);

        // stop any further processing
      } else {
      // rollback if it is this player's followup
      // this can happen if a player reconnects without properly disconnecting
        let gameSessionData;
        if (gameSession.getIsFollowupActive() && (gameSession.getCurrentPlayerId() === playerId)) {
          gameSession.executeAction(gameSession.actionRollbackSnapshot());
        }

        // set some parameters for the socket
        _self.gameId = gameId;
        _self.playerId = playerId;

        // join game room
        _self.join(gameId);

        // update user count for game room
        games[gameId].connectedPlayers.push(playerId);

        Logger.module('IO').log(`[G:${gameId}]`, `join_game -> Game ${gameId} connected players so far: ${games[gameId].connectedPlayers.length}.`);

        // if only one player is in so far, start the disconnection timer
        if (games[gameId].connectedPlayers.length === 1) {
        // start disconnected player timeout for game
          startDisconnectedPlayerTimeout(gameId, opponent.playerId);
        } else if (games[gameId].connectedPlayers.length === 2) {
        // clear timeout when we get two players
          clearDisconnectedPlayerTimeout(gameId);
        }

        // prepare and scrub game session data for this player
        // if a followup is active and it isn't this player's followup, send them the rollback snapshot
        if (gameSession.getIsFollowupActive() && (gameSession.getCurrentPlayerId() !== playerId)) {
          gameSessionData = JSON.parse(gameSession.getRollbackSnapshotData());
        } else {
          gameSessionData = JSON.parse(gameSession.serializeToJSON(gameSession));
        }
        UtilsGameSession.scrubGameSessionData(gameSession, gameSessionData, playerId);

        // respond to client with success and a scrubbed copy of the game session
        _self.emit('join_game_response', {
          message: 'successfully joined game',
          gameSessionData,
          connectedPlayers: games[gameId].connectedPlayers,
          connectedSpectators: getConnectedSpectatorsDataForGamePlayer(gameId, playerId),
        },
        );

        // broadcast join to any other connected players
        _self.broadcast.to(gameId).emit('player_joined', playerId);

        // attempt to update ai turn on active game
        if (gameSession.isActive()) {
          return ai_updateTurn(gameId);
        }
      }
    }).catch(function (e) {
      Logger.module('IO').error(`[G:${gameId}]`, `join_game -> player:${playerId} failed to join game. ERROR: ${e.message}`.red);
      // if we didn't join a game, broadcast a failure
      return _self.emit('join_game_response',
        { error: 'Could not join game: ' + (e != null ? e.message : undefined) });
    });
};

/*
 * socket handler for spectators joining game
 * @public
 * @param  {Object}  requestData    Plain JS object with socket event data.
 */
var onGameSpectatorJoin = function (requestData) {
  const _self = this;
  // request parameters
  // TODO : Sanitize these parameters to prevent crash if gameId = null
  const {
    gameId,
  } = requestData;
  const {
    spectatorId,
  } = requestData;
  const {
    playerId,
  } = requestData;
  let spectateToken = null;

  // verify - synchronous
  try {
    spectateToken = jwt.verify(requestData.spectateToken, config.get('firebase.legacyToken'), { algorithms: ['HS256'] });
  } catch (error) {
    Logger.module('IO').error(`[G:${gameId}]`, `spectate_game -> ERROR decoding spectate token: ${(error != null ? error.message : undefined)}`.red);
  }

  if (!spectateToken || ((spectateToken.b != null ? spectateToken.b.length : undefined) === 0)) {
    Logger.module('IO').log(`[G:${gameId}]`, `spectate_game -> REFUSING JOIN: A specate token ${spectateToken} is not valid`.red);
    this.emit('spectate_game_response',
      { error: 'Your spectate token is invalid, so we can\'t join you to the game.' });
    return;
  }

  Logger.module('IO').log(`[G:${gameId}]`, 'spectate_game -> token contents: ', spectateToken.b);
  Logger.module('IO').log(`[G:${gameId}]`, 'spectate_game -> playerId: ', playerId);

  if (!_.contains(spectateToken.b, playerId)) {
    Logger.module('IO').log(`[G:${gameId}]`, 'spectate_game -> REFUSING JOIN: You do not have permission to specate this game'.red);
    this.emit('spectate_game_response',
      { error: 'You do not have permission to specate this game.' });
    return;
  }

  // must have a spectatorId
  if (!spectatorId) {
    Logger.module('IO').log(`[G:${gameId}]`, `spectate_game -> REFUSING JOIN: A spectator ${spectatorId.blue} is not valid`.red);
    this.emit('spectate_game_response',
      { error: 'Your login ID is blank (expired?), so we can\'t join you to the game.' });
    return;
  }

  // must have a playerId
  if (!playerId) {
    Logger.module('IO').log(`[G:${gameId}]`, `spectate_game -> REFUSING JOIN: A player ${playerId.blue} is not valid`.red);
    this.emit('spectate_game_response',
      { error: 'Invalid player ID.' });
    return;
  }

  // must have a gameId
  if (!gameId) {
    Logger.module('IO').log(`[G:${gameId}]`, `spectate_game -> REFUSING JOIN: A gameId ${gameId.blue} is not valid`.red);
    this.emit('spectate_game_response',
      { error: 'Invalid Game ID.' });
    return;
  }

  // if someone is trying to join a game they don't belong to as a player they are not authenticated as
  if (this.decodedToken.d.id !== spectatorId) {
    Logger.module('IO').log(`[G:${gameId}]`, `spectate_game -> REFUSING JOIN: A player ${this.decodedToken.d.id.blue} is attempting to join a game as ${playerId.blue}`.red);
    this.emit('spectate_game_response',
      { error: 'Your login ID does not match the one you requested to spectate the game with.' });
    return;
  }

  Logger.module('IO').log(`[G:${gameId}]`, `spectate_game -> spectator:${spectatorId} is joining game:${gameId}`.cyan);

  // if a client is already in another game, leave it
  spectatorLeaveGameIfNeeded(this);

  if ((games[gameId] != null ? games[gameId].connectedSpectators.length : undefined) >= 10) {
    // max out at 10 spectators
    this.emit('spectate_game_response',
      { error: 'Maximum number of spectators already watching.' });
    return;
  }

  // initialize a server-side game session and join it
  return initSpectatorGameSession(gameId)
    .then(function (spectatorGameSession) {
    // for spectators, use the delayed in-memory game session
      const gameSession = spectatorGameSession;

      Logger.module('IO').log(`[G:${gameId}]`, `spectate_game -> Got ${gameId} GameSession data.`.cyan);
      const player = _.find(gameSession.players, (p) => p.playerId === playerId);
      const opponent = _.find(gameSession.players, (p) => p.playerId !== playerId);

      if (!player) {
      // let the socket know we had an error
        _self.emit('spectate_game_response',
          { error: 'could not join game because the player id you requested could not be found' });

        // destroy the game data loaded so far if the opponent can't be defined and no one else is connected
        Logger.module('IO').log(`[G:${gameId}]`, 'onGameSpectatorJoin -> DESTROYING local game cache due to join error'.red);
        destroyGameSessionIfNoConnectionsLeft(gameId);

        // stop any further processing
      } else {
      // set some parameters for the socket
        let gameSessionData;
        _self.gameId = gameId;
        _self.spectatorId = spectatorId;
        _self.spectateToken = spectateToken;
        _self.playerId = playerId;

        // join game room
        _self.join(`spectate-${gameId}`);

        // update user count for game room
        games[gameId].connectedSpectators.push(spectatorId);

        // prepare and scrub game session data for this player
        // if a followup is active and it isn't this player's followup, send them the rollback snapshot
        if (gameSession.getIsFollowupActive() && (gameSession.getCurrentPlayerId() !== playerId)) {
          gameSessionData = JSON.parse(gameSession.getRollbackSnapshotData());
        } else {
          gameSessionData = JSON.parse(gameSession.serializeToJSON(gameSession));
        }
        UtilsGameSession.scrubGameSessionData(gameSession, gameSessionData, playerId, true);
        /*
      * if the spectator does not have the opponent in their buddy list
      if not _.contains(spectateToken.b,opponent.playerId)
        * scrub deck data and opponent hand data by passing in opponent ID
        scrubGameSessionDataForSpectators(gameSession, gameSessionData, opponent.playerId)
      else
        * otherwise just scrub deck data in a way you can see both decks
        * scrubGameSessionDataForSpectators(gameSession, gameSessionData)
        * NOTE: above line is disabled for now since it does some UI jankiness since when a cardId is present the tile layer updates when the spectated opponent starts to select cards
        * NOTE: besides, actions will be scrubbed so this idea of watching both players only sort of works right now
        scrubGameSessionDataForSpectators(gameSession, gameSessionData, opponent.playerId, true)
      */
        // respond to client with success and a scrubbed copy of the game session
        _self.emit('spectate_game_response', {
          message: 'successfully joined game',
          gameSessionData,
        },
        );

        // broadcast to the game room that a spectator has joined
        return _self.broadcast.to(gameId).emit('spectator_joined', {
          id: spectatorId,
          playerId,
          username: spectateToken.u,
        });
      }
    }).catch(function (e) {
    // if we didn't join a game, broadcast a failure
      return _self.emit('spectate_game_response',
        { error: `could not join game: ${e.message}` });
    });
};

/*
 * socket handler for leaving a game.
 * @public
 * @param  {Object}  requestData    Plain JS object with socket event data.
 */
var onGameLeave = function (requestData) {
  if (this.spectatorId) {
    Logger.module('IO').log(`[G:${this.gameId}]`, `leave_game -> spectator ${this.spectatorId} leaving ${this.gameId}`);
    return spectatorLeaveGameIfNeeded(this);
  } else {
    Logger.module('IO').log(`[G:${this.gameId}]`, `leave_game -> player ${this.playerId} leaving ${this.gameId}`);
    return playerLeaveGameIfNeeded(this);
  }
};

/**
 * This method is called every time a socket handler recieves a game event and is executed within the context of the socket (this == sending socket).
 * @public
 * @param  {Object}  eventData    Plain JS object with event data that contains one "event".
 */
var onGameEvent = function (eventData) {
  // if for some reason spectator sockets start broadcasting game events
  if (this.spectatorId) {
    Logger.module('IO').log(`[G:${this.gameId}]`, `onGameEvent :: ERROR: spectator sockets can't submit game events. (type: ${eventData.type})`.red);
    return;
  }

  // Logger.module("IO").log "onGameEvent -> #{JSON.stringify(eventData)}".blue

  if (!this.gameId || !games[this.gameId]) {
    this.emit(EVENTS.network_game_error, {
      code: 500,
      message: 'could not broadcast game event because you are not currently in a game',
    },
    );

    return;
  }

  //
  const gameSession = games[this.gameId].session;

  if (eventData.type === EVENTS.step) {
    // Logger.module("IO").log "[G:#{@.gameId}]", "game_step -> #{JSON.stringify(eventData.step)}".green
    // Logger.module("IO").log "[G:#{@.gameId}]", "game_step -> #{eventData.step?.playerId} #{eventData.step?.action?.type}".green

    const player = _.find(gameSession.players, (p) => p.playerId === (eventData.step != null ? eventData.step.playerId : undefined));
    if (player != null) {
      player.setLastActionTakenAt(Date.now());
    }

    try {
      const step = gameSession.deserializeStepFromFirebase(eventData.step);
      const {
        action,
      } = step;
      if (action != null) {
        // clear out any implicit actions sent over the network and re-execute this as a fresh explicit action on the server
        // the reason is that we want to re-generate and re-validate all the game logic that happens as a result of this FIRST explicit action in the step
        action.resetForAuthoritativeExecution();

        // execute the action
        return gameSession.executeAction(action);
      }
    } catch (error) {
      Logger.module('IO').log(`[G:${this.gameId}]`, `onGameStep:: error: ${JSON.stringify(error.message)}`.red);
      Logger.module('IO').log(`[G:${this.gameId}]`, `onGameStep:: error stack: ${error.stack}`.red);

      // delete but don't destroy game
      destroyGameSessionIfNoConnectionsLeft(this.gameId, true);

      // send error to client, forcing reconnect on client side
      io.to(this.gameId).emit(EVENTS.network_game_error, JSON.stringify(error.message));
    }
  } else {
    // transmit the non-step game events to players
    // step events are emitted automatically after executed on game session
    return emitGameEvent(this, this.gameId, eventData);
  }
};

/*
 * Socket Disconnect Event Handler. Handles rollback if in the middle of followup etc.
 * @public
 */
var onGameDisconnect = function () {
  if (this.spectatorId) {
    // make spectator leave game room
    return spectatorLeaveGameIfNeeded(this);
  } else {
    try {
      __guard__(io.sockets.adapter.rooms.get(this.gameId), (x) => x.forEach(function (socketId) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket.playerId === this.playerId) {
          Logger.module('IO').log(`onGameDisconnect:: looks like the player ${this.playerId} we are trying to disconnect is still in the game ${this.gameId} room. ABORTING`.red);
        }
      }));

      for (var clientId in io.sockets.sockets) {
        var socket = io.sockets.sockets[clientId];
        if ((socket.playerId === this.playerId) && !socket.spectatorId) {
          Logger.module('IO').log(`onGameDisconnect:: looks like the player ${this.playerId} that allegedly disconnected is still alive and well.`.red);
          return;
        }
      }
    } catch (error) {
      Logger.module('IO').log(`onGameDisconnect:: Error ${(error != null ? error.message : undefined)}.`.red);
    }

    // if we are in a buffering state
    // and the disconnecting player is in the middle of a followup
    const gs = games[this.gameId] != null ? games[this.gameId].session : undefined;
    if ((gs != null) && gs.getIsBufferingEvents() && (gs.getCurrentPlayerId() === this.playerId)) {
      // execute a rollback to reset server state
      // but do not send this action to the still connected player
      // because they do not care about rollbacks for the other player
      const rollBackAction = gs.actionRollbackSnapshot();
      gs.executeAction(rollBackAction);
    }

    savePlayerCount(--playerCount);
    Logger.module('IO').log(`[G:${this.gameId}]`, `disconnect -> ${this.playerId}`.red);

    // if a client is already in another game, leave it
    return playerLeaveGameIfNeeded(this);
  }
};

/**
 * Leaves a game for a player socket if the socket is connected to a game
 * @public
 * @param  {Socket} socket The socket which wants to leave a game.
 * @param {Boolean} [silent=false] whether to disconnect silently, as in the case of duplicate connections for same player
 */
var playerLeaveGameIfNeeded = function (socket, silent) {
  if (silent == null) { silent = false; }
  if (socket != null) {
    const {
      gameId,
    } = socket;
    const {
      playerId,
    } = socket;

    // if a player is in a game
    if ((gameId != null) && (playerId != null)) {
      Logger.module('...').log(`[G:${gameId}]`, `playerLeaveGame -> ${playerId} has left game ${gameId}`.red);

      if (!silent) {
        // broadcast that player left
        socket.broadcast.to(gameId).emit('player_left', playerId);
      }

      // leave that game room
      socket.leave(gameId);

      // update user count for game room
      const game = games[gameId];
      if (game != null) {
        const index = game.connectedPlayers.indexOf(playerId);
        game.connectedPlayers.splice(index, 1);

        if (!silent) {
          // start disconnected player timeout for game
          startDisconnectedPlayerTimeout(gameId, playerId);

          // destroy game if no one is connected anymore
          destroyGameSessionIfNoConnectionsLeft(gameId, true);
        }
      }

      // finally clear the existing gameId
      return socket.gameId = null;
    }
  }
};

/*
 * This function leaves a game for a spectator socket if the socket is connected to a game
 * @public
 * @param  {Socket}  socket    The socket which wants to leave a game.
 */
var spectatorLeaveGameIfNeeded = function (socket) {
  // if a client is already in another game
  if (socket.gameId) {
    Logger.module('...').debug(`[G:${socket.gameId}]`, `spectatorLeaveGameIfNeeded -> ${socket.spectatorId} leaving game ${socket.gameId}.`);

    // broadcast that you left
    socket.broadcast.to(socket.gameId).emit('spectator_left', {
      id: socket.spectatorId,
      playerId: socket.playerId,
      username: (socket.spectateToken != null ? socket.spectateToken.u : undefined),
    });

    // leave specator game room
    socket.leave(`spectate-${socket.gameId}`);

    Logger.module('...').debug(`[G:${socket.gameId}]`, `spectatorLeaveGameIfNeeded -> ${socket.spectatorId} left room for game ${socket.gameId}.`);

    // update spectator count for game room
    if (games[socket.gameId]) {
      games[socket.gameId].connectedSpectators = _.without(games[socket.gameId].connectedSpectators, socket.spectatorId);

      Logger.module('...').debug(`[G:${socket.gameId}]`, `spectatorLeaveGameIfNeeded -> ${socket.spectatorId} removed from list of spectators ${socket.gameId}.`);

      // if no spectators left, stop the delayed game interval and destroy spectator delayed game session
      tearDownSpectateSystemsIfNoSpectatorsLeft(socket.gameId);

      // destroy game if no one is connected anymore
      destroyGameSessionIfNoConnectionsLeft(socket.gameId, true);
    }

    const remainingSpectators = __guard__(games[socket.gameId] != null ? games[socket.gameId].connectedSpectators : undefined, (x) => x.length) || 0;
    Logger.module('...').log(`[G:${socket.gameId}]`, `spectatorLeaveGameIfNeeded -> ${socket.spectatorId} has left game ${socket.gameId}. remaining spectators ${remainingSpectators}`);

    // finally clear the existing gameId
    return socket.gameId = null;
  }
};

/*
 * This function destroys in-memory game session of there is no one left connected
 * @public
 * @param  {String}  gameId    The ID of the game to destroy.
 * @param  {Boolean}  persist    Do we need to save/archive this game?
 */
var destroyGameSessionIfNoConnectionsLeft = function (gameId, persist) {
  if (persist == null) { persist = false; }
  if ((games[gameId].connectedPlayers.length === 1) && (games[gameId].connectedSpectators.length === 0)) {
    clearDisconnectedPlayerTimeout(gameId);
    stopTurnTimer(gameId);
    tearDownSpectateSystemsIfNoSpectatorsLeft(gameId);
    Logger.module('...').log(`[G:${gameId}]`, 'destroyGameSessionIfNoConnectionsLeft() -> no players left DESTROYING local game cache'.red);
    unsubscribeFromGameSessionEvents(gameId);
    ai_terminate(gameId);

    // TEMP: a way to upload unfinished game data to AWS S3 Archive. For example: errored out games.
    if (persist && (__guard__(__guard__(games != null ? games[gameId] : undefined, (x1) => x1.session), (x) => x.status) !== SDK.GameStatus.over)) {
      const data = games[gameId].session.serializeToJSON(games[gameId].session);
      const mouseAndUIEventsData = JSON.stringify(games[gameId].mouseAndUIEvents);
      Promise.all([
        GameManager.saveGameSession(gameId, data),
        GameManager.saveGameMouseUIData(gameId, mouseAndUIEventsData),
      ])
        .then((results) => Logger.module('...').log(`[G:${gameId}]`, `destroyGameSessionIfNoConnectionsLeft -> unfinished Game Archived to S3: ${results[1]}`.green)).catch((error) => Logger.module('...').log(`[G:${gameId}]`, `destroyGameSessionIfNoConnectionsLeft -> ERROR: failed to archive unfinished game to S3 due to error ${error.message}`.red));
    }

    delete games[gameId];
    return saveGameCount(--gameCount);
  } else {
    return Logger.module('...').debug(`[G:${gameId}]`, `destroyGameSessionIfNoConnectionsLeft() -> players left: ${games[gameId].connectedPlayers.length} spectators left: ${games[gameId].connectedSpectators.length}`);
  }
};

/*
 * This function stops all spectate systems if 0 spectators left.
 * @public
 * @param  {String}  gameId    The ID of the game to tear down spectate systems.
 */
var tearDownSpectateSystemsIfNoSpectatorsLeft = function (gameId) {
  // if no spectators left, stop the delayed game interval and destroy spectator delayed game session
  if ((games[gameId] != null ? games[gameId].connectedSpectators.length : undefined) === 0) {
    Logger.module('IO').debug(`[G:${gameId}]`, 'tearDownSpectateSystemsIfNoSpectatorsLeft() -> no spectators left, stopping spectate systems');
    stopSpectatorDelayedGameInterval(gameId);
    games[gameId].spectatorDelayedGameSession = null;
    games[gameId].spectateIsRunning = false;
    games[gameId].spectatorOpponentEventDataBuffer.length = 0;
    return games[gameId].spectatorGameEventBuffer.length = 0;
  }
};

/*
 * Clears timeout for disconnected players
 * @public
 * @param  {String}  gameId      The ID of the game to clear disconnected timeout for.
 */
var clearDisconnectedPlayerTimeout = function (gameId) {
  Logger.module('IO').log(`[G:${gameId}]`, `clearDisconnectedPlayerTimeout:: for game: ${gameId}`.yellow);
  clearTimeout(games[gameId] != null ? games[gameId].disconnectedPlayerTimeout : undefined);
  return (games[gameId] != null ? games[gameId].disconnectedPlayerTimeout = null : undefined);
};

/*
 * Starts timeout for disconnected players
 * @public
 * @param  {String}  gameId      The ID of the game.
 * @param  {String}  playerId    The player ID for who to start the timeout.
 */
var startDisconnectedPlayerTimeout = function (gameId, playerId) {
  if ((games[gameId] != null ? games[gameId].disconnectedPlayerTimeout : undefined) != null) {
    clearDisconnectedPlayerTimeout(gameId);
  }
  Logger.module('IO').log(`[G:${gameId}]`, `startDisconnectedPlayerTimeout:: for ${playerId} in game: ${gameId}`.yellow);

  return games[gameId] != null ? games[gameId].disconnectedPlayerTimeout = setTimeout(() => onDisconnectedPlayerTimeout(gameId, playerId),
    60000) : undefined;
};

/*
 * Resigns game for disconnected player.
 * @public
 * @param  {String}  gameId      The ID of the game.
 * @param  {String}  playerId    The player ID who is resigning.
 */
var onDisconnectedPlayerTimeout = function (gameId, playerId) {
  Logger.module('IO').log(`[G:${gameId}]`, `onDisconnectedPlayerTimeout:: ${playerId} for game: ${gameId}`);

  __guard__(io.sockets.adapter.rooms.get(gameId), (x) => x.forEach(function (socketId) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket.playerId === playerId) {
      Logger.module('IO').log(`[G:${gameId}]`, `onDisconnectedPlayerTimeout:: looks like the player ${playerId} we are trying to dis-connect is still in the game ${gameId} room. ABORTING`.red);
    }
  }));

  for (var clientId in io.sockets.sockets) {
    var socket = io.sockets.sockets[clientId];
    if ((socket.playerId === playerId) && !socket.spectatorId) {
      Logger.module('IO').log(`[G:${gameId}]`, `onDisconnectedPlayerTimeout:: looks like the player ${playerId} we are trying to disconnect is still connected but not in the game ${gameId} room.`.red);
      return;
    }
  }

  // grab the relevant game session
  const gs = games[gameId] != null ? games[gameId].session : undefined;

  // looks like we timed out for a game that's since ended
  if (!gs || ((gs != null ? gs.status : undefined) === SDK.GameStatus.over)) {
    Logger.module('IO').log(`[G:${gameId}]`, `onDisconnectedPlayerTimeout:: ${playerId} timed out for FINISHED or NULL game: ${gameId}`.yellow);
  } else {
    Logger.module('IO').log(`[G:${gameId}]`, `onDisconnectedPlayerTimeout:: ${playerId} auto-resigning game: ${gameId}`.yellow);

    // resign the player
    const player = gs.getPlayerById(playerId);
    const resignAction = player.actionResign();
    return gs.executeAction(resignAction);
  }
};

/**
 * Start/Restart server side game timer for a game
 * @public
 * @param  {Object}    gameId      The game ID.
 */
const restartTurnTimer = function (gameId) {
  stopTurnTimer(gameId);

  const game = games[gameId];
  if (game.session != null) {
    game.turnTimerStartedAt = (game.turnTimeTickAt = Date.now());
    if (game.session.isBossBattle()) {
      // boss battles turns have infinite time
      // so we'll just tick once and wait
      return onGameTimeTick(gameId);
    } else {
      // set turn timer on a 1 second interval
      return game.turnTimer = setInterval((() => onGameTimeTick(gameId)), 1000);
    }
  }
};

/**
 * Stop server side game timer for a game
 * @public
 * @param  {Object}    gameId      The game ID.
 */
var stopTurnTimer = function (gameId) {
  const game = games[gameId];
  if ((game != null) && (game.turnTimer != null)) {
    clearInterval(game.turnTimer);
    return game.turnTimer = null;
  }
};

/**
 * Server side game timer. After 90 seconds it will end the turn for the current player.
 * @public
 * @param  {Object}    gameId      The game for which to iterate the time.
 */
var onGameTimeTick = function (gameId) {
  const game = games[gameId];
  const gameSession = game != null ? game.session : undefined;

  if (gameSession != null) {
    // allowed turn time is 90 seconds + 3 second buffer that clients don't see
    let allowed_turn_time = MAX_TURN_TIME;

    // grab the current player
    let player = gameSession.getCurrentPlayer();

    // if we're past the 2nd turn, we can start checking backwards to see how long the PREVIOUS turn for this player took
    if (player && (gameSession.getTurns().length > 2)) {
      // find the current player's previous turn
      const allTurns = gameSession.getTurns();
      let playersPreviousTurn = null;

      for (let i = allTurns.length - 1; i >= 0; i--) {
        if (allTurns[i].playerId === player.playerId) {
          playersPreviousTurn = allTurns[i]; // gameSession.getTurns()[gameSession.getTurns().length - 3]
          break;
        }
      }

      // Logger.module("IO").log "[G:#{gameId}]", "onGameTimeTick:: last action at #{player.getLastActionTakenAt()} / last turn delta #{playersPreviousTurn?.createdAt - player.getLastActionTakenAt()}".red

      // if this player's previous action was on a turn older than the last one
      if (playersPreviousTurn && ((playersPreviousTurn.createdAt - player.getLastActionTakenAt()) > 0)) {
        // you're only allowed 15 seconds + 3 second buffer that clients don't see
        allowed_turn_time = MAX_TURN_TIME_INACTIVE;
      }
    }

    const lastTurnTimeTickAt = game.turnTimeTickAt;
    game.turnTimeTickAt = Date.now();
    const delta_turn_time_tick = game.turnTimeTickAt - lastTurnTimeTickAt;
    const delta_since_timer_began = game.turnTimeTickAt - game.turnTimerStartedAt;
    game.turnTimeRemaining = Math.max(0.0, (allowed_turn_time - delta_since_timer_began) + game.turnTimeBonus);
    game.turnTimeBonus = Math.max(0.0, game.turnTimeBonus - delta_turn_time_tick);
    // Logger.module("IO").log "[G:#{gameId}]", "onGameTimeTick:: delta #{delta_turn_time_tick/1000}, #{game.turnTimeRemaining/1000} time remaining, #{game.turnTimeBonus/1000} bonus remaining"

    const turnTimeRemainingInSeconds = Math.ceil(game.turnTimeRemaining / 1000);
    gameSession.setTurnTimeRemaining(turnTimeRemainingInSeconds);

    if (game.turnTimeRemaining <= 0) {
      // turn time has expired
      stopTurnTimer(gameId);

      if (gameSession.status === SDK.GameStatus.new) {
        // force draw starting hand with current cards
        return (() => {
          const result = [];
          for (player of Array.from<any>(gameSession.players)) {
            if (!player.getHasStartingHand()) {
              Logger.module('IO').log(`[G:${gameId}]`, `onGameTimeTick:: mulligan timer up, submitting player ${player.playerId.blue} mulligan`.red);
              var drawStartingHandAction = player.actionDrawStartingHand([]);
              result.push(gameSession.executeAction(drawStartingHandAction));
            } else {
              result.push(undefined);
            }
          }
          return result;
        })();
      } else if (gameSession.status === SDK.GameStatus.active) {
        // force end turn
        Logger.module('IO').log(`[G:${gameId}]`, `onGameTimeTick:: turn timer up, submitting player ${gameSession.getCurrentPlayerId().blue} turn`.red);
        const endTurnAction = gameSession.actionEndTurn();
        return gameSession.executeAction(endTurnAction);
      }
    } else {
      // if the turn timer has not expired, just send the time tick over to all clients
      const totalStepCount = gameSession.getStepCount() - games[gameId].opponentEventDataBuffer.length;
      return emitGameEvent(null, gameId, {
        type: EVENTS.turn_time, time: turnTimeRemainingInSeconds, timestamp: Date.now(), stepCount: totalStepCount,
      });
    }
  }
};

/**
 * ...
 * @public
 * @param  {Object}    gameId      The game ID.
 */
const restartSpectatorDelayedGameInterval = function (gameId) {
  stopSpectatorDelayedGameInterval(gameId);
  Logger.module('IO').debug(`[G:${gameId}]`, 'restartSpectatorDelayedGameInterval');
  if (games[gameId].spectateIsDelayed) {
    return games[gameId].spectatorDelayTimer = setInterval((() => onSpectatorDelayedGameTick(gameId)), 500);
  }
};

/**
 * ...
 * @public
 * @param  {Object}    gameId      The game ID.
 */
var stopSpectatorDelayedGameInterval = function (gameId) {
  Logger.module('IO').debug(`[G:${gameId}]`, 'stopSpectatorDelayedGameInterval');
  return clearInterval(games[gameId].spectatorDelayTimer);
};

/**
 * Ticks the spectator delayed game and usually flushes the buffer by calling `flushSpectatorNetworkEventBuffer`.
 * @public
 * @param  {Object}    gameId      The game for which to iterate the time.
 */
var onSpectatorDelayedGameTick = function (gameId) {
  if (!games[gameId]) {
    Logger.module('Game').debug(`onSpectatorDelayedGameTick() -> game [G:${gameId}] seems to be destroyed. Stopping ticks.`);
    stopSpectatorDelayedGameInterval(gameId);
    return;
  }

  _logSpectatorTickInfo(gameId);

  // flush anything in the spectator buffer
  return flushSpectatorNetworkEventBuffer(gameId);
};

/**
 * Runs actions delayed in the spectator buffer.
 * @public
 * @param  {Object}    gameId      The game for which to iterate the time.
 */
var flushSpectatorNetworkEventBuffer = function (gameId) {
  // if there is anything in the buffer
  if (games[gameId].spectatorGameEventBuffer.length > 0) {
    // Logger.module("IO").debug "[G:#{gameId}]", "flushSpectatorNetworkEventBuffer()"

    // remove all the NULLED out actions
    games[gameId].spectatorGameEventBuffer = _.compact(games[gameId].spectatorGameEventBuffer);

    // loop through the actions in order
    for (let i = 0; i < games[gameId].spectatorGameEventBuffer.length; i++) {
      var eventData = games[gameId].spectatorGameEventBuffer[i];
      var timestamp = eventData.timestamp || (eventData.step != null ? eventData.step.timestamp : undefined);
      // if we are not delaying events or if the event time exceeds the delay show it to spectators
      if (!games[gameId].spectateIsDelayed || (timestamp && ((moment().utc().valueOf() - timestamp) > games[gameId].spectateDelay))) {
        // null out the event that is about to be broadcast so it can be compacted later
        games[gameId].spectatorGameEventBuffer[i] = null;
        if (eventData.step) {
          var step;
          Logger.module('IO').debug(`[G:${gameId}]`, `flushSpectatorNetworkEventBuffer() -> broadcasting spectator step ${eventData.type} - ${__guard__(eventData.step != null ? eventData.step.action : undefined, (x) => x.type)}`);

          if (games[gameId].spectateIsDelayed) {
            step = games[gameId].spectatorDelayedGameSession.deserializeStepFromFirebase(eventData.step);
            games[gameId].spectatorDelayedGameSession.executeAuthoritativeStep(step);
          }

          // send events over to spectators of current player
          __guard__(io.sockets.adapter.rooms.get(`spectate-${gameId}`), (x1) => x1.forEach(function (socketId) {
            Logger.module('IO').debug(`[G:${gameId}]`, `flushSpectatorNetworkEventBuffer() -> transmitting step ${__guard__(eventData.step != null ? eventData.step.index : undefined, (x2) => x2.toString().yellow)} with action ${(eventData.step.action != null ? eventData.step.action.name : undefined)} to player's spectators`);
            const socket = io.sockets.sockets.get(socketId);
            if ((socket != null) && (socket.playerId === eventData.step.playerId)) {
              // scrub the action data. this should not be skipped since some actions include entire deck that needs to be scrubbed because we don't want spectators deck sniping
              const eventDataCopy = JSON.parse(JSON.stringify(eventData));
              UtilsGameSession.scrubSensitiveActionData(games[gameId].session, eventDataCopy.step.action, socket.playerId, true);
              return socket.emit(EVENTS.network_game_event, eventDataCopy);
            }
          }));

          // skip processing anything for the opponent if this is a RollbackToSnapshotAction since only the sender cares about that one
          if (eventData.step.action.type === SDK.RollbackToSnapshotAction.type) {
            return;
          }

          // start buffering events until a followup is complete for the opponent since players can cancel out of a followup
          games[gameId].spectatorOpponentEventDataBuffer.push(eventData);

          // if we are delayed then check the delayed game session for if we are buffering, otherwise use the primary
          var isSpectatorGameSessionBufferingFollowups = (games[gameId].spectateIsDelayed && (games[gameId].spectatorDelayedGameSession != null ? games[gameId].spectatorDelayedGameSession.getIsBufferingEvents() : undefined)) || games[gameId].session.getIsBufferingEvents();

          Logger.module('IO').debug(`[G:${gameId}]`, `flushSpectatorNetworkEventBuffer() -> opponentEventDataBuffer at ${games[gameId].spectatorOpponentEventDataBuffer.length} ... buffering: ${isSpectatorGameSessionBufferingFollowups}`);

          // if we have anything in the buffer and we are currently not buffering, flush the buffer over to your opponent's spectators
          if ((games[gameId].spectatorOpponentEventDataBuffer.length > 0) && !isSpectatorGameSessionBufferingFollowups) {
            // copy buffer and reset
            var opponentEventDataBuffer = games[gameId].spectatorOpponentEventDataBuffer.slice(0);
            games[gameId].spectatorOpponentEventDataBuffer.length = 0;

            // broadcast whatever's in the buffer to the opponent
            _.each(opponentEventDataBuffer, function (eventData) {
              Logger.module('IO').debug(`[G:${gameId}]`, `flushSpectatorNetworkEventBuffer() -> transmitting step ${__guard__(eventData.step != null ? eventData.step.index : undefined, (x2) => x2.toString().yellow)} with action ${(eventData.step.action != null ? eventData.step.action.name : undefined)} to opponent's spectators`);
              return __guard__(io.sockets.adapter.rooms.get(`spectate-${gameId}`), (x3) => x3.forEach(function (socketId) {
                const socket = io.sockets.sockets.get(socketId);
                if ((socket != null) && (socket.playerId !== eventData.step.playerId)) {
                  const eventDataCopy = JSON.parse(JSON.stringify(eventData));
                  // always scrub steps for sensitive data from opponent's spectator perspective
                  UtilsGameSession.scrubSensitiveActionData(games[gameId].session, eventDataCopy.step.action, socket.playerId, true);
                  return socket.emit(EVENTS.network_game_event, eventDataCopy);
                }
              }));
            });
          }
        } else {
          io.to(`spectate-${gameId}`).emit(EVENTS.network_game_event, eventData);
        }
      }
    }
  }
};

var _logSpectatorTickInfo = _.debounce(function (gameId) {
  Logger.module('Game').debug(`onSpectatorDelayedGameTick() ... ${__guard__(games[gameId] != null ? games[gameId].spectatorGameEventBuffer : undefined, (x) => x.length)} buffered`);
  if (games[gameId] != null ? games[gameId].spectatorGameEventBuffer : undefined) {
    return Array.from<any>((games[gameId] != null ? games[gameId].spectatorGameEventBuffer : undefined)).map((eventData, i) =>
      Logger.module('Game').debug('onSpectatorDelayedGameTick() eventData: ', eventData));
  }
},
1000);

/**
 * Emit/Broadcast game event to appropriate destination.
 * @public
 * @param  {Socket}    event      Originating socket.
 * @param  {String}    gameId      The game id for which to broadcast.
 * @param  {Object}    eventData    Data to broadcast.
 */
var emitGameEvent = function (fromSocket, gameId, eventData) {
  if (games[gameId] != null) {
    if (eventData.type === EVENTS.step) {
      Logger.module('IO').log(`[G:${gameId}]`, `emitGameEvent -> step ${__guard__(eventData.step != null ? eventData.step.index : undefined, (x) => x.toString().yellow)} with timestamp ${(eventData.step != null ? eventData.step.timestamp : undefined)} and action ${__guard__(eventData.step != null ? eventData.step.action : undefined, (x1) => x1.type)}`);
      // only broadcast valid steps
      if ((eventData.step != null) && (eventData.step.timestamp != null) && (eventData.step.action != null)) {
        // send the step to the owner
        __guard__(io.sockets.adapter.rooms.get(gameId), (x2) => x2.forEach(function (socketId) {
          const socket = io.sockets.sockets.get(socketId);
          if ((socket != null) && (socket.playerId === eventData.step.playerId)) {
            const eventDataCopy = JSON.parse(JSON.stringify(eventData));
            // always scrub steps for sensitive data from player perspective
            UtilsGameSession.scrubSensitiveActionData(games[gameId].session, eventDataCopy.step.action, socket.playerId);
            Logger.module('IO').log(`[G:${gameId}]`, `emitGameEvent -> transmitting step ${__guard__(eventData.step != null ? eventData.step.index : undefined, (x3) => x3.toString().yellow)} with action ${(eventData.step.action != null ? eventData.step.action.type : undefined)} to origin`);
            return socket.emit(EVENTS.network_game_event, eventDataCopy);
          }
          // NOTE: don't BREAK here because there is a potential case that during reconnection 3 sockets are connected:
          // 2 for this current reconnecting player and 1 for the opponent
          // breaking here would essentially result in only the DEAD socket in process of disconnecting receiving the event
          // break
        }));

        // buffer actions for the opponent other than a rollback action since that should clear the buffer during followups and there's no need to be sent to the opponent
        // essentially: skip processing anything for the opponent if this is a RollbackToSnapshotAction since only the sender cares about that one
        if (eventData.step.action.type !== SDK.RollbackToSnapshotAction.type) {
          // start buffering events until a followup is complete for the opponent since players can cancel out of a followup
          games[gameId].opponentEventDataBuffer.push(eventData);

          // if we have anything in the buffer and we are currently not buffering, flush the buffer over to your opponent
          if ((games[gameId].opponentEventDataBuffer.length > 0) && !games[gameId].session.getIsBufferingEvents()) {
            // copy buffer and reset
            const opponentEventDataBuffer = games[gameId].opponentEventDataBuffer.slice(0);
            games[gameId].opponentEventDataBuffer.length = 0;

            // broadcast whatever's in the buffer to the opponent
            _.each(opponentEventDataBuffer, (eventData) => __guard__(io.sockets.adapter.rooms.get(gameId), (x3) => x3.forEach(function (socketId) {
              const socket = io.sockets.sockets.get(socketId);
              if ((socket != null) && (socket.playerId !== eventData.step.playerId)) {
                const eventDataCopy = JSON.parse(JSON.stringify(eventData));
                // always scrub steps for sensitive data from player perspective
                UtilsGameSession.scrubSensitiveActionData(games[gameId].session, eventDataCopy.step.action, socket.playerId);
                Logger.module('IO').log(`[G:${gameId}]`, `emitGameEvent -> transmitting step ${__guard__(eventData.step != null ? eventData.step.index : undefined, (x4) => x4.toString().yellow)} with action ${(eventData.step.action != null ? eventData.step.action.type : undefined)} to opponent`);
                return socket.emit(EVENTS.network_game_event, eventDataCopy);
              }
            })));
          }
        }
      }
    } else if (eventData.type === EVENTS.invalid_action) {
      // send the invalid action notification to the owner
      __guard__(io.sockets.adapter.rooms.get(gameId), (x3) => x3.forEach(function (socketId) {
        const socket = io.sockets.sockets.get(socketId);
        if ((socket != null) && (socket.playerId === eventData.playerId)) {
          const eventDataCopy = JSON.parse(JSON.stringify(eventData));
          return socket.emit(EVENTS.network_game_event, eventDataCopy);
        }
        // NOTE: don't BREAK here because there is a potential case that during reconnection 3 sockets are connected:
        // 2 for this current reconnecting player and 1 for the opponent
        // breaking here would essentially result in only the DEAD socket in process of disconnecting receiving the event
      }));
    } else {
      if ((eventData.type === EVENTS.network_game_hover) || (eventData.type === EVENTS.network_game_select) || (eventData.type === EVENTS.network_game_mouse_clear) || (eventData.type === EVENTS.show_emote)) {
        // save the player id of this event
        if (eventData.playerId == null) { eventData.playerId = fromSocket != null ? fromSocket.playerId : undefined; }
        eventData.timestamp = moment().utc().valueOf();

        // mouse events, emotes, etc should be saved and persisted to S3 for replays
        if (games[gameId].mouseAndUIEvents == null) { games[gameId].mouseAndUIEvents = []; }
        games[gameId].mouseAndUIEvents.push(eventData);
      }

      if (fromSocket != null) {
        // send it along to other connected sockets in the game room
        fromSocket.broadcast.to(gameId).emit(EVENTS.network_game_event, eventData);
      } else {
        // send to all sockets connected to the game room
        io.to(gameId).emit(EVENTS.network_game_event, eventData);
      }
    }

    // push a deep clone of the event data to the spectator buffer
    if (games[gameId] != null ? games[gameId].spectateIsRunning : undefined) {
      const spectatorEventDataCopy = JSON.parse(JSON.stringify(eventData));
      games[gameId].spectatorGameEventBuffer.push(spectatorEventDataCopy);

      // if we're not running a timed delay, just flush everything now
      if (!(games[gameId] != null ? games[gameId].spectateIsDelayed : undefined)) {
        return flushSpectatorNetworkEventBuffer(gameId);
      }
    }
  }
};

/*
 * start a game session if one doesn't exist and call a completion handler when done
 * @public
 * @param  {Object}    gameId      The game ID to load.
 * @param  {Function}    onComplete    Callback when done.
 */
var initGameSession = function (gameId, onComplete) {
  if (games[gameId] != null ? games[gameId].loadingPromise : undefined) {
    return games[gameId].loadingPromise;
  }

  // setup local cache reference if none already there
  if (!games[gameId]) {
    games[gameId] = {
      opponentEventDataBuffer: [],
      connectedPlayers: [],
      session: null,
      connectedSpectators: [],
      spectateIsRunning: false,
      spectateIsDelayed: false,
      spectateDelay: 30000,
      spectatorGameEventBuffer: [],
      spectatorOpponentEventDataBuffer: [],
      spectatorDelayedGameSession: null,
      turnTimerStartedAt: 0,
      turnTimeTickAt: 0,
      turnTimeRemaining: 0,
      turnTimeBonus: 0,
    };
  }

  // return game session from redis
  return games[gameId].loadingPromise = Promise.all([
    GameManager.loadGameSession(gameId),
    GameManager.loadGameMouseUIData(gameId),
  ])
    .then(([gameData, mouseData]) => [
      JSON.parse(gameData),
      JSON.parse(mouseData),
    ])
    .then(function ([gameDataIn, mouseData]) {
      Logger.module('IO').log(`[G:${gameId}]`, `initGameSession -> loaded game data for game:${gameId}`);

      // deserialize game session
      const gameSession = SDK.GameSession.create();
      gameSession.setIsRunningAsAuthoritative(true);
      gameSession.deserializeSessionFromFirebase(gameDataIn);

      if (gameSession.isOver()) {
        throw new Error('Game is already over!');
      }

      // store session
      games[gameId].session = gameSession;

      // store mouse and ui event data
      games[gameId].mouseAndUIEvents = mouseData;

      saveGameCount(++gameCount);

      // setup AI
      ai_setup(gameId);

      // in case the server restarted or loading data for first time, set the last action at timestamp for both players to now
      // this timestamp is used to shorten turn timer if player has not made any moves for a long time
      _.each(gameSession.players, (player) => player.setLastActionTakenAt(Date.now()));

      // this is ugly but a simple way to subscribe to turn change events to save the game session
      subscribeToGameSessionEvents(gameId);

      // start the turn timer
      restartTurnTimer(gameId);

      return Promise.resolve([
        games[gameId].session,
      ]);
    }).catch(function (error) {
      Logger.module('IO').log(`[G:${gameId}]`, `initGameSession:: error: ${JSON.stringify(error.message)}`.red);
      Logger.module('IO').log(`[G:${gameId}]`, `initGameSession:: error stack: ${error.stack}`.red);

      throw error;
    });
};

/*
 * start a spectator game session if one doesn't exist and call a completion handler when done
 * @public
 * @param  {Object}    gameId      The game ID to load.
 * @param  {Function}    onComplete    Callback when done.
 */
var initSpectatorGameSession = function (gameId) {
  if (!games[gameId]) {
    return Promise.reject(new Error('This game is no longer in progress'));
  }

  return Promise.resolve()
    .then(function () {
    // if we're not already running spectate systems
      if (!games[gameId].spectateIsRunning) {
      // mark that we are running spectate systems
        games[gameId].spectateIsRunning = true;
        // if we're in the middle of a followup and we have some buffered events, we need to copy them over to the spectate buffer
        if (games[gameId].session.getIsBufferingEvents() && (games[gameId].opponentEventDataBuffer.length > 0)) {
          games[gameId].spectatorOpponentEventDataBuffer.length = 0;
          for (var eventData of Array.from<any>(games[gameId].opponentEventDataBuffer)) {
            var eventDataCopy = JSON.parse(JSON.stringify(eventData));
            games[gameId].spectatorOpponentEventDataBuffer.push(eventDataCopy);
          }
        }
      }

      if (games[gameId].spectateIsDelayed && !games[gameId].spectatorDelayedGameSession) {
        Logger.module('...').log(`[G:${gameId}]`, 'initSpectatorDelayedGameSession() -> creating delayed game session');

        // create
        const delayedGameDataIn = games[gameId].session.serializeToJSON(games[gameId].session);
        const delayedGameSession = SDK.GameSession.create();
        delayedGameSession.setIsRunningAsAuthoritative(false);
        delayedGameSession.deserializeSessionFromFirebase(JSON.parse(delayedGameDataIn));
        delayedGameSession.gameId = `SPECTATE:${delayedGameSession.gameId}`;
        games[gameId].spectatorDelayedGameSession = delayedGameSession;
        // start timer to execute delayed / buffered spectator game events
        restartSpectatorDelayedGameInterval(gameId);

        return Promise.resolve(games[gameId].spectatorDelayedGameSession);
      } else {
        return Promise.resolve(games[gameId].session);
      }
    });
};

/**
 * Handler for before a game session rolls back to a snapshot.
 */
const onBeforeRollbackToSnapshot = function (event) {
  // clear the buffer just before rolling back
  const {
    gameSession,
  } = event;
  const {
    gameId,
  } = gameSession;
  const game = games[gameId];
  if (game != null) {
    game.opponentEventDataBuffer.length = 0;
    return game.spectatorOpponentEventDataBuffer.length = 0;
  }
};

/**
 * Handler for a game session step.
 */
const onStep = function (event) {
  const {
    gameSession,
  } = event;
  const {
    gameId,
  } = gameSession;
  const game = games[gameId];
  if (game != null) {
    const {
      step,
    } = event;
    if ((step != null) && (step.timestamp != null) && (step.action != null)) {
      // send out step events
      const stepEventData = { type: EVENTS.step, step: JSON.parse(game.session.serializeToJSON(step)) };
      emitGameEvent(null, gameId, stepEventData);

      // special action cases
      const {
        action,
      } = step;
      if (action instanceof SDK.EndTurnAction) {
        // save game on end turn
        // delay so that we don't block sending the step back to the players
        _.delay((function () {
          if ((games[gameId] != null) && (games[gameId].session != null)) {
            return GameManager.saveGameSession(gameId, games[gameId].session.serializeToJSON(games[gameId].session));
          }
        }), 500);
      } else if (action instanceof SDK.StartTurnAction) {
        // restart the turn timer whenever a turn starts
        restartTurnTimer(gameId);
      } else if (action instanceof SDK.DrawStartingHandAction) {
        // restart turn timer if both players have a starting hand and this step is for a DrawStartingHandAction
        const bothPlayersHaveStartingHand = _.reduce(game.session.players, ((memo, player) => memo && player.getHasStartingHand()), true);
        if (bothPlayersHaveStartingHand) {
          restartTurnTimer(gameId);
        }
      }

      if (action.getIsAutomatic() && !game.session.getIsFollowupActive()) {
        // add bonus to turn time for every automatic step
        // unless followup is active, to prevent rollbacks for infinite turn time
        // bonus as a separate parameter accounts for cases such as:
        // - battle pet automatic actions eating up your own time
        // - queuing up many actions and ending turn quickly to eat into opponent's time
        game.turnTimeBonus += 2000;
      }
    }

    // when game is over and we have the final step
    // we cannot archive game until final step event
    // because otherwise step won't be finished/signed correctly
    // so we must do this on step event and not on game_over event
    if (game.session.status === SDK.GameStatus.over) {
      // stop any turn timers
      stopTurnTimer(gameId);
      if ((game.isArchived == null)) {
        game.isArchived = true;
        return afterGameOver(gameId, game.session, game.mouseAndUIEvents);
      }
    }
  }
};

/**
 * Handler for an invalid action.
 */
const onInvalidAction = function (event) {
  // safety fallback: if player attempts to make an invalid explicit action, notify that player only
  const {
    gameSession,
  } = event;
  const {
    gameId,
  } = gameSession;
  const game = games[gameId];
  if (game != null) {
    const {
      action,
    } = event;
    if (!action.getIsImplicit()) {
      // Logger.module("...").log "[G:#{gameId}]", "onInvalidAction -> INVALID ACTION: #{action.getLogName()} / VALIDATED BY: #{action.getValidatorType()} / MESSAGE: #{action.getValidationMessage()}"
      const invalidActionEventData = {
        type: EVENTS.invalid_action,
        playerId: action.getOwnerId(),
        action: JSON.parse(game.session.serializeToJSON(action)),
        validatorType: event.validatorType,
        validationMessage: event.validationMessage,
        validationMessagePosition: event.validationMessagePosition,
        desync: gameSession.isActive()
          && (gameSession.getCurrentPlayerId() === action.getOwnerId())
          && (gameSession.getTurnTimeRemaining() > CONFIG.TURN_DURATION_LATENCY_BUFFER),
      };
      return emitGameEvent(null, gameId, invalidActionEventData);
    }
  }
};

/*
 * Subscribes to the gamesession's event bus.
 * Can be called multiple times in order to re-subscribe.
 * @public
 * @param  {Object}    gameId      The game ID to subscribe for.
 */
var subscribeToGameSessionEvents = function (gameId) {
  Logger.module('...').log(`[G:${gameId}]`, 'subscribeToGameSessionEvents -> subscribing to GameSession events');
  const game = games[gameId];
  if (game != null) {
    // unsubscribe from previous
    unsubscribeFromGameSessionEvents(gameId);

    // listen for game events
    game.session.getEventBus().on(EVENTS.before_rollback_to_snapshot, onBeforeRollbackToSnapshot);
    game.session.getEventBus().on(EVENTS.step, onStep);
    game.session.getEventBus().on(EVENTS.invalid_action, onInvalidAction);

    // subscribe AI to events
    return ai_subscribeToGameSessionEvents(gameId);
  }
};

/*
 * Unsubscribe from event listeners on the game session for this game ID.
 * @public
 * @param  {String}    gameId      The game ID that needs to be unsubscribed.
 */
var unsubscribeFromGameSessionEvents = function (gameId) {
  Logger.module('...').log(`[G:${gameId}]`, 'unsubscribeFromGameSessionEvents -> un-subscribing from GameSession events');
  const game = games[gameId];
  if (game != null) {
    game.session.getEventBus().off(EVENTS.before_rollback_to_snapshot, onBeforeRollbackToSnapshot);
    game.session.getEventBus().off(EVENTS.step, onStep);
    game.session.getEventBus().off(EVENTS.invalid_action, onInvalidAction);

    return ai_unsubscribeFromGameSessionEvents(gameId);
  }
};

/*
 * must be called after game is over
 * processes a game, saves to redis, and kicks-off post-game processing jobs
 * @public
 * @param  {String}    gameId        The game ID that is over.
 * @param  {Object}    gameSession      The game session data.
 * @param  {Array}      mouseAndUIEvents  The mouse and UI events for this game.
 */
var afterGameOver = function (gameId, gameSession, mouseAndUIEvents) {
  Logger.module('GAME-OVER').log(`[G:${gameId}]`, `---------- ======= GAME ${gameId} OVER ======= ---------`.green);

  // Update User Ranking, Progression, Quests, Stats
  const updateUser = function (userId, opponentId, gameId, factionId, generalId, isWinner, isDraw, ticketId) {
    Logger.module('GAME-OVER').log(`[G:${gameId}]`, `UPDATING user ${userId}. (winner:${isWinner})`);

    // check for isFriendly
    // check for isUnscored
    const isFriendly = gameSession.gameType === SDK.GameType.Friendly;
    let isUnscored = false;

    // Ranking and Progression only process in NON-FRIENDLY matches
    if (!isFriendly) {
      // calculate based on number of resign status and number of actions
      const lastStep = gameSession.getLastStep();
      // if the game didn't have a single turn, mark the game as unscored
      if (gameSession.getPlayerById(userId).hasResigned && (gameSession.getTurns().length === 0)) {
        Logger.module('GAME-OVER').log(`[G:${gameId}]`, `User: ${userId} CONCEDED a game with 0 turns. Marking as UNSCORED`.yellow);
        isUnscored = true;
      } else if (!isWinner && !isDraw) {
        // otherwise check how many actions the player took
        let playerActionCount = 0;
        let meaningfulActionCount = 0;
        let moveActionCount = 0;
        for (var a of Array.from<any>(gameSession.getActions())) {
          // explicit actions
          if ((a.getOwnerId() === userId) && (a.getIsImplicit() === false)) {
            playerActionCount++;

            // meaningful actions
            if (a instanceof SDK.AttackAction) {
              if (a.getTarget().getIsGeneral()) {
                meaningfulActionCount += 2;
              } else {
                meaningfulActionCount += 1;
              }
            }
            if (a instanceof SDK.PlayCardFromHandAction || a instanceof SDK.PlaySignatureCardAction) {
              meaningfulActionCount += 1;
            }
            if (a instanceof SDK.BonusManaAction) {
              meaningfulActionCount += 2;
            }

            // move actions
            if (a instanceof SDK.MoveAction) {
              moveActionCount += 1;
            }
          }

          // more than 9 explicit actions
          // more than 1 move action
          // more than 5 meaningful actions
          if ((playerActionCount > 9) && (moveActionCount > 1) && (meaningfulActionCount > 4)) {
            break;
          }
        }

        /*
        what we're looking for:
        * more than 9 explicit actions
        * more than 1 move action
        * more than 5 meaningful actions
        ... otherwise mark the game as unscored
        */
        // Logger.module("GAME-OVER").log "[G:#{gameId}]", "User: #{userId} #{playerActionCount}, #{moveActionCount}, #{meaningfulActionCount}".cyan
        if ((playerActionCount <= 9) || (moveActionCount <= 1) || (meaningfulActionCount <= 4)) {
          Logger.module('GAME-OVER').log(`[G:${gameId}]`, `User: ${userId} CONCEDED a game with too few meaningful actions. Marking as UNSCORED`.yellow);
          isUnscored = true;
        }
      }
    }

    // start the job to process the game for a user
    return Jobs.enqueue('update-user-post-game', {
      name: 'Update User Ranking',
      title: util.format('User %s :: Game %s', userId, gameId),
      userId,
      opponentId,
      gameId,
      gameType: gameSession.gameType,
      factionId,
      generalId,
      isWinner,
      isDraw,
      isUnscored,
      isBotGame: true,
      ticketId,
    }, { removeOnComplete: true });
  };

  // Save then archive game session
  const archiveGame = (gameId, gameSession, mouseAndUIEvents) => Promise.all([
    GameManager.saveGameMouseUIData(gameId, JSON.stringify(mouseAndUIEvents)),
    GameManager.saveGameSession(gameId, gameSession.serializeToJSON(gameSession)),
  ]).then(() => // Job: Archive Game
    Jobs.enqueue('archive-game', {
      name: 'Archive Game',
      title: util.format('Archiving Game %s', gameId),
      gameId,
      gameType: gameSession.gameType,
    }, { removeOnComplete: true }));

  // update promises
  const promises = [
    archiveGame(gameId, gameSession, mouseAndUIEvents),
  ];

  for (var player of Array.from<any>(gameSession.players)) {
    var playerId = player.getPlayerId();
    // don't update normal AI (non-bot user)
    if (playerId !== CONFIG.AI_PLAYER_ID) {
      // find player data
      var winnerId = gameSession.getWinnerId();
      var isWinner = (playerId === winnerId);
      var isDraw = (winnerId == null);
      var playerSetupData = gameSession.getPlayerSetupDataForPlayerId(playerId);
      var playerFactionId = playerSetupData.factionId;
      var {
        generalId,
      } = playerSetupData;
      var {
        ticketId,
      } = playerSetupData;
      promises.push(updateUser(playerId, CONFIG.AI_PLAYER_ID, gameId, playerFactionId, generalId, isWinner, isDraw, ticketId));
    }
  }

  // execute promises
  return Promise.all(promises)
    .then(() => Logger.module('GAME-OVER').log(`[G:${gameId}]`, 'afterGameOver done, game has been archived'.green)).catch((error) => Logger.module('GAME-OVER').error(`[G:${gameId}]`, `ERROR: afterGameOver failed ${error}`.red));
};

/* Shutdown Handler */
const shutdownHandler = function () {
  Logger.module('SERVER').log('Received shutdown signal; shutting down SP server.');
  Logger.module('SERVER').log(`Active Players: ${playerCount}.`);
  Logger.module('SERVER').log(`Active Games: ${gameCount}.`);

  if (!config.get('consul.enabled')) {
    process.exit(0);
  }

  return Consul.getReassignmentStatus()
    .then(function (reassign) {
      if (reassign === false) {
        Logger.module('SERVER').log('Reassignment disabled - exiting.');
        process.exit(0);
      }

      // Build an array of game IDs
      const ids = [];
      _.each(games, (game, id) => ids.push(id));

      // Map to save each game to Redis before shutdown
      return PromiseUtils.map(ids, function (id) {
        const serializedData = games[id].session.serializeToJSON(games[id].session);
        return GameManager.saveGameSession(id, serializedData);
      }).then(() => Consul.getHealthyServers()).then(function (servers) {
      // Filter 'yourself' from list of nodes
        const filtered = _.reject(servers, (server) => (server.Node != null ? server.Node.Node : undefined) === os.hostname());

        if (filtered.length === 0) {
          Logger.module('SERVER').log('No servers available - exiting without re-assignment.');
          process.exit(1);
        }

        const random_node = _.sample(filtered);
        const node_name = random_node.Node != null ? random_node.Node.Node : undefined;
        return Consul.kv.get(`nodes/${node_name}/public_ip`);
      }).then(function (newServerIp) {
      // Development override for testing, bounces between port 9000 & 9001
        if (config.isDevelopment()) {
          if (config.get('port') === 9000) { port = 9001; }
          if (config.get('port') === 9001) { port = 9000; }
          newServerIp = `127.0.0.1:${port}`;
        }
        const msg = 'Server is shutting down. You will be reconnected automatically.';
        io.emit('game_server_shutdown', { msg, ip: newServerIp });
        Logger.module('SERVER').log(`Players reconnecting to: ${newServerIp}`);
        Logger.module('SERVER').log('Re-assignment complete. Exiting.');
        return process.exit(0);
      })
        .catch(function (err) {
          Logger.module('SERVER').log(`Re-assignment failed: ${err.message}. Exiting.`);
          return process.exit(1);
        });
    });
};

process.on('SIGTERM', shutdownHandler);
process.on('SIGINT', shutdownHandler);
process.on('SIGHUP', shutdownHandler);
process.on('SIGQUIT', shutdownHandler);

// region AI

/**
 * Returns whether a session is valid for AI usage.
 * @param  {String}    gameId
*/
const ai_isValidSession = (gameId) => ((games[gameId] != null ? games[gameId].session : undefined) != null) && !games[gameId].session.isOver() && (games[gameId].ai != null);

/**
 * Returns whether a session and turn is valid for AI usage.
 * @param  {String}    gameId
*/
const ai_isValidTurn = (gameId) => ai_isValidSession(gameId) && games[gameId].session.isActive() && (games[gameId].session.getCurrentPlayerId() === games[gameId].ai.getMyPlayerId());

/**
 * Returns whether AI can start turn.
 * @param  {String}    gameId
*/
const ai_canStartTurn = (gameId) => ai_isValidTurn(gameId) && !ai_isExecutingTurn(gameId) && !games[gameId].session.hasStepsInQueue();

/**
 * Returns whether ai is currently executing turn.
 * @param  {String}    gameId
*/
var ai_isExecutingTurn = (gameId) => games[gameId].executingAITurn;

/**
 * Returns whether ai can progress turn.
 * @param  {String}    gameId
*/
const ai_canProgressTurn = (gameId) => ai_isValidTurn(gameId) && ai_isExecutingTurn(gameId) && (games[gameId].aiStartTurnTimeoutId == null);

/**
 * Returns whether ai can taunt.
 * @param  {String}    gameId
*/
const ai_canEmote = (gameId) => ai_isValidSession(gameId) && !ai_isBot(gameId) && !games[gameId].session.getIsBufferingEvents() && (Math.random() < 0.05);

/**
 * Returns whether ai is normal ai or bot.
 * @param  {String}    gameId
*/
var ai_isBot = (gameId) => ((games[gameId] != null ? games[gameId].session : undefined) != null) && (games[gameId].session.getAiPlayerId() !== CONFIG.AI_PLAYER_ID);

/**
 * Initializes AI for a game session.
 * @param  {String}    gameId
*/
var ai_setup = function (gameId) {
  if (((games[gameId] != null ? games[gameId].session : undefined) != null) && (games[gameId].ai == null)) {
    const aiPlayerId = games[gameId].session.getAiPlayerId();
    const aiDifficulty = games[gameId].session.getAiDifficulty();
    Logger.module('AI').debug(`[G:${gameId}]`, `Setup AI -> aiPlayerId ${aiPlayerId} - aiDifficulty ${aiDifficulty}`);
    games[gameId].ai = new StarterAI(games[gameId].session, aiPlayerId, aiDifficulty);

    // add AI as a connected player
    games[gameId].connectedPlayers.push(games[gameId].session.getAiPlayerId());

    // attempt to mulligan immediately on new game
    if (games[gameId].session.isNew()) {
      const nextAction = games[gameId].ai.nextAction();
      if (nextAction != null) {
        return games[gameId].session.executeAction(nextAction);
      }
    }
  }
};

/**
 * Terminates AI for a game session.
 * @param  {String}    gameId
*/
var ai_terminate = function (gameId) {
  ai_unsubscribeFromGameSessionEvents(gameId);
  ai_stopTurn(gameId);
  return ai_stopTimeouts(gameId);
};

const ai_onStep = function (event) {
  const {
    gameSession,
  } = event;
  const {
    gameId,
  } = gameSession;
  // emote after step
  ai_emoteForLastStep(gameId);

  // progress turn
  return ai_updateTurn(gameId);
};

const ai_onInvalidAction = function (event) {
  // safety fallback: if AI attempts to make an invalid explicit action, end AI turn immediately
  if (event != null) {
    const {
      gameSession,
    } = event;
    const {
      gameId,
    } = gameSession;
    const {
      action,
    } = event;
    if ((action != null) && !action.getIsImplicit() && ai_isExecutingTurn(gameId) && (action.getOwnerId() === games[gameId].ai.getMyPlayerId())) {
      return ai_endTurn(gameId);
    }
  }
};

var ai_subscribeToGameSessionEvents = function (gameId) {
  const game = games[gameId];
  if (game != null) {
    // if we're already subscribed, unsubscribe
    ai_unsubscribeFromGameSessionEvents(gameId);

    // listen for game events
    game.session.getEventBus().on(EVENTS.step, ai_onStep);
    return game.session.getEventBus().on(EVENTS.invalid_action, ai_onInvalidAction);
  }
};

var ai_unsubscribeFromGameSessionEvents = function (gameId) {
  const game = games[gameId];
  if (game != null) {
    game.session.getEventBus().off(EVENTS.step, ai_onStep);
    return game.session.getEventBus().off(EVENTS.invalid_action, ai_onInvalidAction);
  }
};

/**
 * Updates AI turn for a game session.
 * @param  {String}    gameId
*/
var ai_updateTurn = function (gameId) {
  Logger.module('AI').debug(`[G:${gameId}]`, 'ai_updateTurn');
  if (ai_canStartTurn(gameId)) {
    return ai_startTurn(gameId);
  } else if (ai_canProgressTurn(gameId)) {
    return ai_progressTurn(gameId);
  } else if (ai_isExecutingTurn(gameId)) {
    return ai_endTurn(gameId);
  }
};

/**
 * Progresses AI turn for a game session.
 * @param  {String}    gameId
*/
var ai_progressTurn = function (gameId) {
  let nextAction;
  if (ai_canProgressTurn(gameId)) {
    Logger.module('AI').debug(`[G:${gameId}]`, 'ai_progressTurn'.cyan);
    // request next action from AI
    try {
      nextAction = games[gameId].ai.nextAction();
    } catch (error) {
      Logger.module('IO').log(`[G:${gameId}]`, `ai.nextAction:: error: ${JSON.stringify(error.message)}`.red);
      Logger.module('IO').log(`[G:${gameId}]`, `ai.nextAction:: error stack: ${error.stack}`.red);

      // retain player id
      const playerId = games[gameId].ai.getOpponentPlayerId();

      // delete but don't destroy game
      destroyGameSessionIfNoConnectionsLeft(gameId, true);

      // send error to client, forcing reconnect on client side
      io.to(gameId).emit(EVENTS.network_game_error, JSON.stringify(error.message));
      return;
    }
  }

  // if we didn't have an error and somehow destroy the game data in the try/catch above
  if (games[gameId] != null) {
    if (nextAction != null) {
      // always delay AI actions slightly
      if ((games[gameId].aiExecuteActionTimeoutId == null)) {
        let actionDelayTime;
        if (ai_isBot(gameId)) {
          if (games[gameId].session.getIsFollowupActive()) {
            actionDelayTime = 1.0 + (Math.random() * 3.0);
          } else if (nextAction instanceof SDK.EndTurnAction) {
            actionDelayTime = 1.0 + (Math.random() * 2.0);
          } else {
            actionDelayTime = 1.0 + (Math.random() * 8.0);
          }
        } else {
          if (games[gameId].session.getIsFollowupActive()) {
            actionDelayTime = 0.0;
          } else {
            actionDelayTime = 5.0;
          }
        }

        // action delay time can never be more than a quarter of remaining turn time
        if (games[gameId].turnTimeRemaining != null) {
          actionDelayTime = Math.min((games[gameId].turnTimeRemaining * 0.25) / 1000.0, actionDelayTime);
        }

        // show UI as needed
        ai_showUIForAction(gameId, nextAction, actionDelayTime);

        // delay and then execute action
        // delay must be at least 1 ms to ensure current call stack completes
        return games[gameId].aiExecuteActionTimeoutId = setTimeout((function () {
          games[gameId].aiExecuteActionTimeoutId = null;
          ai_showClearUI(gameId);
          return ai_executeAction(gameId, nextAction);
        }), Math.max(1.0, actionDelayTime * 1000.0));
      }
    } else if (ai_isExecutingTurn(gameId)) {
      // end turn as needed
      return ai_endTurn(gameId);
    }
  }
};

/**
 * Starts AI turn for a game session.
 * @param  {String}    gameId
*/
var ai_startTurn = function (gameId) {
  if (ai_canStartTurn(gameId)) {
    Logger.module('AI').debug(`[G:${gameId}]`, 'ai_startTurn'.cyan);
    // set as executing AI turn
    games[gameId].executingAITurn = true;

    if ((games[gameId].aiStartTurnTimeoutId == null)) {
      // delay initial turn progress
      let delayTime;
      if (ai_isBot(gameId)) {
        delayTime = 2.0 + (Math.random() * 2.0);
      } else {
        delayTime = 2.0;
      }

      // choose random starting point for pointer
      games[gameId].aiPointer = {
        x: Math.floor(Math.random() * CONFIG.BOARDCOL),
        y: Math.floor(Math.random() * CONFIG.BOARDROW),
      };
      Logger.module('AI').debug(`[G:${gameId}]`, `ai_startTurn init aiPointer at ${games[gameId].aiPointer.x}, ${games[gameId].aiPointer.y}`.cyan);

      // delay must be at least 1 ms to ensure current call stack completes
      return games[gameId].aiStartTurnTimeoutId = setTimeout((function () {
        games[gameId].aiStartTurnTimeoutId = null;
        return ai_progressTurn(gameId);
      }), Math.max(1.0, delayTime * 1000.0));
    }
  }
};

/**
 * Stops AI turn for a game session, and ends it if necessary.
 * @param  {String}    gameId
*/
var ai_endTurn = function (gameId) {
  // stop turn
  ai_stopTurn(gameId);

  // force end turn if still AI's turn
  if (ai_isValidTurn(gameId)) {
    Logger.module('AI').debug(`[G:${gameId}]`, 'ai_endTurn'.cyan);
    return ai_executeAction(gameId, games[gameId].session.actionEndTurn());
  }
};

/**
 * Stops AI turn for a game session. Does not end AI turn.
 * @param  {String}    gameId
*/
var ai_stopTurn = function (gameId) {
  if (games[gameId].executingAITurn) {
    Logger.module('AI').debug(`[G:${gameId}]`, 'ai_stopTurn'.cyan);
    games[gameId].executingAITurn = false;

    return ai_stopTurnTimeouts(gameId);
  }
};

/**
 * Stops AI timeouts for a game session.
 * @param  {String}    gameId
*/
var ai_stopTimeouts = function (gameId) {
  ai_stopTurnTimeouts(gameId);
  ai_stopEmoteTimeouts(gameId);
  return ai_stopUITimeouts(gameId);
};

/**
 * Stops AI timeouts for turn actions.
 * @param  {String}    gameId
*/
var ai_stopTurnTimeouts = function (gameId) {
  if (games[gameId].aiStartTurnTimeoutId != null) {
    clearTimeout(games[gameId].aiStartTurnTimeoutId);
    games[gameId].aiStartTurnTimeoutId = null;
  }

  if (games[gameId].aiExecuteActionTimeoutId != null) {
    clearTimeout(games[gameId].aiExecuteActionTimeoutId);
    return games[gameId].aiExecuteActionTimeoutId = null;
  }
};

/**
 * Executes an AI action for a game session.
 * @param  {String}    gameId
 * @param  {Action}    action
*/
var ai_executeAction = function (gameId, action) {
  if (ai_canProgressTurn(gameId)) {
    Logger.module('AI').debug(`[G:${gameId}]`, `ai_executeAction -> ${action.getLogName()}`.cyan);
    // simulate AI sending step to server
    const step = new SDK.Step(games[gameId].session, action.getOwnerId());
    step.setAction(action);
    const opponentPlayerId = games[gameId].ai.getOpponentPlayerId();
    return __guard__(io.sockets.adapter.rooms.get(gameId), (x) => x.forEach(function (socketId) {
      const socket = io.sockets.sockets.get(socketId);
      if ((socket.playerId === opponentPlayerId) && !socket.spectatorId) {
        return onGameEvent.call(socket, {
          type: EVENTS.step,
          step: JSON.parse(games[gameId].session.serializeToJSON(step)),
        });
      }
    }));
  }
};

/**
* Returns whether an action is valid for showing UI.
* @param {String} gameId
* @param {Action} action
* @return {Boolean}
*/
const ai_isValidActionForUI = (gameId, action) => (games[gameId].session.getIsFollowupActive() && !(action instanceof SDK.EndFollowupAction))
  || action instanceof SDK.ReplaceCardFromHandAction
  || action instanceof SDK.PlayCardFromHandAction
  || action instanceof SDK.PlaySignatureCardAction
  || action instanceof SDK.MoveAction
  || action instanceof SDK.AttackAction;

/**
* Shows UI for an action that will be taken by AI.
* @param  {String}    gameId
* @param  {Action}    action
* @param  {Number}    actionDelayTime must be at least 0.25s or greater
*/
var ai_showUIForAction = function (gameId, action, actionDelayTime) {
  if (ai_isValidTurn(gameId) && ai_isValidActionForUI(gameId, action) && _.isNumber(actionDelayTime) && (actionDelayTime > 0.25)) {
    let card,
      cardIndex,
      handIndex,
      intent,
      isSignatureCard,
      moveToSelectDuration,
      moveToTargetDuration,
      pauseAtSelectDuration,
      pauseAtTargetDuration,
      selectPosition,
      targetPosition,
      uiAnimationDuration,
      uiDelayTime,
      unitToHover;
    const aiPlayerId = games[gameId].ai.getMyPlayerId();

    // stop any previous UI animations
    ai_stopUITimeouts(gameId);

    // get ui animation times
    if (ai_isBot(gameId)) {
      if (games[gameId].session.getIsFollowupActive()) {
        uiDelayTime = actionDelayTime * (0.7 + (Math.random() * 0.1));
        uiAnimationDuration = actionDelayTime - uiDelayTime;
        moveToSelectDuration = 0.0;
        pauseAtSelectDuration = 0.0;
        pauseAtTargetDuration = (0.1 + (Math.random() * 0.25)) * uiAnimationDuration;
        moveToTargetDuration = uiAnimationDuration - pauseAtTargetDuration;
      } else {
        uiDelayTime = actionDelayTime * (0.4 + (Math.random() * 0.4));
        uiAnimationDuration = actionDelayTime - uiDelayTime;
        pauseAtTargetDuration = Math.min(1.0, (0.1 + (Math.random() * 0.25)) * uiAnimationDuration);
        moveToSelectDuration = (0.2 + (Math.random() * 0.4)) * (uiAnimationDuration - pauseAtTargetDuration);
        moveToTargetDuration = (0.4 + (Math.random() * 0.5)) * (uiAnimationDuration - pauseAtTargetDuration - moveToSelectDuration);
        pauseAtSelectDuration = uiAnimationDuration - pauseAtTargetDuration - moveToSelectDuration - moveToTargetDuration;
      }
    } else {
      uiDelayTime = actionDelayTime * 0.7;
      uiAnimationDuration = actionDelayTime - uiDelayTime;
      moveToSelectDuration = 0.0;
      pauseAtSelectDuration = 0.0;
      moveToTargetDuration = 0.0;
      pauseAtTargetDuration = uiAnimationDuration;
    }

    // get action properties
    let selectEventData: Record<string, any> = {
      type: EVENTS.network_game_select,
      playerId: aiPlayerId,
    };
    if (action instanceof SDK.ReplaceCardFromHandAction) {
      intent = (selectEventData.intentType = SDK.IntentType.DeckIntent);
      handIndex = (selectEventData.handIndex = action.getIndexOfCardInHand());
      selectPosition = { x: Math.round((handIndex + 0.5) * (CONFIG.BOARDCOL / CONFIG.MAX_HAND_SIZE)), y: -1 };
    } else if (action instanceof SDK.ApplyCardToBoardAction) {
      if (action instanceof SDK.PlayCardFromHandAction) {
        intent = (selectEventData.intentType = SDK.IntentType.DeckIntent);
        handIndex = (selectEventData.handIndex = action.getIndexOfCardInHand());
        selectPosition = { x: Math.round((handIndex + 0.5) * (CONFIG.BOARDCOL / CONFIG.MAX_HAND_SIZE)), y: -1 };
        targetPosition = action.getTargetPosition();
      } else if (action instanceof SDK.PlaySignatureCardAction) {
        intent = (selectEventData.intentType = SDK.IntentType.DeckIntent);
        isSignatureCard = true;
        if (action.getCard().isOwnedByPlayer2()) {
          selectEventData.player2SignatureCard = true;
        } else {
          selectEventData.player1SignatureCard = true;
        }
        if (aiPlayerId === games[gameId].session.getPlayer2Id()) {
          selectPosition = { x: CONFIG.BOARDCOL, y: Math.floor((CONFIG.BOARDROW * 0.5) + (Math.random() * CONFIG.BOARDROW * 0.5)) };
        } else {
          selectPosition = { x: -1, y: Math.floor((CONFIG.BOARDROW * 0.5) + (Math.random() * CONFIG.BOARDROW * 0.5)) };
        }
        targetPosition = action.getTargetPosition();
      } else {
        // followup has no selection
        intent = (selectEventData.intentType = SDK.IntentType.DeckIntent);
        selectEventData = null;
        selectPosition = action.getSourcePosition();
        targetPosition = action.getTargetPosition();
      }
    } else if (action instanceof SDK.MoveAction) {
      intent = (selectEventData.intentType = SDK.IntentType.MoveIntent);
      cardIndex = (selectEventData.cardIndex = action.getSourceIndex());
      card = games[gameId].session.getCardByIndex(cardIndex);
      selectPosition = card.getPosition();
      targetPosition = action.getTargetPosition();
    } else if (action instanceof SDK.AttackAction) {
      intent = (selectEventData.intentType = SDK.IntentType.DamageIntent);
      cardIndex = (selectEventData.cardIndex = action.getSourceIndex());
      card = games[gameId].session.getCardByIndex(cardIndex);
      selectPosition = card.getPosition();
      targetPosition = action.getTargetPosition();
    }

    // failsafe in case action doesn't have a select position
    // (actions should always have a select position)
    if ((selectPosition == null)) {
      if (action instanceof SDK.ApplyCardToBoardAction) {
        Logger.module('AI').log(`[G:${gameId}]`, `ai_showUIForAction -> no sel pos ${action.getLogName()} w/ card ${__guard__(action.getCard(), (x) => x.getName())} w/ root ${__guard__(__guard__(action.getCard(), (x2) => x2.getRootCard()), (x1) => x1.getName())}`.cyan);
      } else {
        Logger.module('AI').log(`[G:${gameId}]`, `ai_showUIForAction -> no sel pos ${action.getLogName()}`.cyan);
      }
      return;
    }

    // setup sequence
    const actionPointerSequence = () => // move to select
      ai_animatePointer(
        gameId,
        moveToSelectDuration,
        selectPosition,
        SDK.IntentType.NeutralIntent,
        false,
        isSignatureCard,
        function () {
          if (selectEventData != null) {
            if (action instanceof SDK.MoveAction || action instanceof SDK.AttackAction) {
            // clear pointer before select
              emitGameEvent(null, gameId, {
                type: EVENTS.network_game_mouse_clear,
                playerId: aiPlayerId,
                intentType: SDK.IntentType.NeutralIntent,
              });
            }

            // show selection event
            emitGameEvent(null, gameId, selectEventData);
          }

          if (targetPosition != null) {
          // pause at select
            return ai_animatePointer(gameId, pauseAtSelectDuration, selectPosition, intent, isSignatureCard, false, () => // move to target
              ai_animatePointer(gameId, moveToTargetDuration, targetPosition, intent));
          }
        },
      );

    // random chance to hover enemy unit on the board
    if (ai_isBot(gameId) && (uiDelayTime >= 5.0) && (Math.random() < 0.05)) {
      const opponentGeneral = games[gameId].session.getGeneralForOpponentOfPlayerId(games[gameId].session.getAiPlayerId());
      const units = games[gameId].session.getBoard().getFriendlyEntitiesForEntity(opponentGeneral);
      if (units.length > 0) {
        unitToHover = units[Math.floor(Math.random() * units.length)];
      }
    }

    if (unitToHover != null) {
      // hover unit before showing action UI
      const unitPosition = unitToHover.getPosition();
      const moveToUnitDuration = Math.random() * 1.0;
      const pauseAtUnitDuration = 2.0 + (Math.random() * 2.0);
      uiDelayTime = uiDelayTime - moveToUnitDuration - pauseAtUnitDuration;

      // delay for remaining time
      return games[gameId].aiShowUITimeoutId = setTimeout(function () {
        games[gameId].aiShowUITimeoutId = null;
        // move to random unit
        return ai_animatePointer(gameId, moveToUnitDuration, unitPosition, SDK.IntentType.NeutralIntent, false, false, () => // pause at random unit and then show action pointer sequence
          games[gameId].aiShowUITimeoutId = setTimeout(function () {
            games[gameId].aiShowUITimeoutId = null;
            return actionPointerSequence();
          },
          pauseAtUnitDuration * 1000.0));
      },
      uiDelayTime * 1000.0);
    } else {
      // delay and then show action pointer sequence
      return games[gameId].aiShowUITimeoutId = setTimeout(function () {
        games[gameId].aiShowUITimeoutId = null;
        return actionPointerSequence();
      },
      uiDelayTime * 1000.0);
    }
  }
};

var ai_showClearUI = function (gameId) {
  if (ai_isValidTurn(gameId)) {
    ai_stopUITimeouts(gameId);
    return emitGameEvent(null, gameId, {
      type: EVENTS.network_game_mouse_clear,
      playerId: games[gameId].ai.getMyPlayerId(),
      intentType: SDK.IntentType.NeutralIntent,
    });
  }
};

/**
 * Clears out any timeouts for AI UI.
 * @param  {String}    gameId
 */
var ai_stopUITimeouts = function (gameId) {
  if (games[gameId] != null) {
    if (games[gameId].aiShowUITimeoutId != null) {
      clearTimeout(games[gameId].aiShowUITimeoutId);
      games[gameId].aiShowUITimeoutId = null;
    }

    return ai_stopAnimatingPointer(gameId);
  }
};

/**
 * Shows AI pointer hover at a board position if it is different from the current position.
* @param  {String}    gameId
* @param  {Number}    boardX
* @param  {Number}    boardY
* @param  {Number}    [intent]
* @param  {Number}    [isSignatureCard=false]
 */
const ai_showHover = function (gameId, boardX, boardY, intent, isSignatureCard) {
  if (intent == null) { intent = SDK.IntentType.NeutralIntent; }
  if (isSignatureCard == null) { isSignatureCard = false; }
  if (ai_isValidTurn(gameId)) {
    const pointer = games[gameId].aiPointer;
    if ((pointer.x !== boardX) || (pointer.y !== boardY)) {
      // set pointer to position
      pointer.x = boardX;
      pointer.y = boardY;

      // setup hover event data
      const hoverEventData: Record<string, any> = {
        type: EVENTS.network_game_hover,
        boardPosition: { x: boardX, y: boardY },
        playerId: games[gameId].ai.getMyPlayerId(),
        intentType: intent,
      };

      // check for hover target
      if (isSignatureCard) {
        if (games[gameId].ai.getMyPlayerId() === games[gameId].session.getPlayer2Id()) {
          hoverEventData.player2SignatureCard = true;
        } else {
          hoverEventData.player1SignatureCard = true;
        }
      } else {
        const target = games[gameId].session.getBoard().getUnitAtPosition(pointer);
        if (target != null) {
          hoverEventData.cardIndex = target.getIndex();
        }
      }

      // show hover
      return emitGameEvent(null, gameId, hoverEventData);
    }
  }
};

/**
* Animates AI pointer movement.
* @param  {String}    gameId
* @param  {Number}    duration in seconds
* @param  {Vec2}    [targetBoardPosition]
* @param  {Number}    [intent]
* @param  {Number}    [isSignatureCardAtSource]
* @param  {Number}    [isSignatureCardAtTarget]
* @param  {Function}    [callback]
*/
var ai_animatePointer = function (gameId, duration, targetBoardPosition, intent, isSignatureCardAtSource, isSignatureCardAtTarget, callback) {
  if (ai_isValidTurn(gameId)) {
    // stop current animation
    ai_stopAnimatingPointer(gameId);

    const pointer = games[gameId].aiPointer;
    const sx = pointer.x;
    const sy = pointer.y;
    const tx = targetBoardPosition.x;
    const ty = targetBoardPosition.y;
    const dx = tx - sx;
    const dy = ty - sy;

    if (duration > 0.0) {
      // show pointer at source
      ai_showHover(gameId, sx, sy, intent, isSignatureCardAtSource);

      // animate to target
      const dms = duration * 1000.0;
      const startTime = Date.now();
      return games[gameId].aiPointerIntervalId = setInterval(function () {
        // cubic ease out
        const currentTime = Date.now();
        const dt = currentTime - startTime;
        const val = Math.min(1.0, dt / dms);
        const e = val - 1;
        const ee = (e * e * e) + 1;
        const cx = (dx * ee) + sx;
        const cy = (dy * ee) + sy;
        ai_showHover(gameId, Math.round(cx), Math.round(cy), intent, isSignatureCardAtTarget);
        if (val === 1.0) {
          ai_stopAnimatingPointer(gameId);
          if (callback) { return callback(); }
        }
      },
      dms / 10);
    } else {
      // show pointer at target
      ai_showHover(gameId, tx, ty, intent, isSignatureCardAtTarget);

      // no animation needed
      if (callback) { return callback(); }
    }
  }
};

/**
 * Stops showing AI pointer movement.
 */
var ai_stopAnimatingPointer = function (gameId) {
  if ((games[gameId] != null) && (games[gameId].aiPointerIntervalId !== null)) {
    clearInterval(games[gameId].aiPointerIntervalId);
    return games[gameId].aiPointerIntervalId = null;
  }
};

/**
 * Prompts AI to emote to opponent based on last step.
 * @param {String} gameId
*/
var ai_emoteForLastStep = function (gameId) {
  if (ai_canEmote(gameId)) {
    const step = games[gameId].session.getLastStep();
    const action = step != null ? step.action : undefined;
    if ((action != null) && !(action instanceof SDK.EndTurnAction)) {
      let emoteId;
      const aiPlayerId = games[gameId].ai.getMyPlayerId();
      const isMyAction = action.getOwnerId() === aiPlayerId;

      // search action + sub actions for any played or removed units
      let actionsToSearch = [action];
      let numHappyActions = 0;
      let numTauntingActions = 0;
      let numAngryActions = 0;
      while (actionsToSearch.length > 0) {
        var searchAction = actionsToSearch.shift();
        if (searchAction instanceof SDK.RemoveAction) {
          if (!isMyAction && (__guard__(searchAction.getTarget(), (x) => x.getOwnerId()) === aiPlayerId)) {
            numAngryActions += 2;
          } else if (isMyAction && (__guard__(searchAction.getTarget(), (x1) => x1.getOwnerId()) !== aiPlayerId)) {
            numTauntingActions += 1;
          }
        } else if (searchAction instanceof SDK.HealAction) {
          if (isMyAction && (__guard__(searchAction.getTarget(), (x2) => x2.getOwnerId()) === aiPlayerId)) {
            numTauntingActions += 1;
          } else if (!isMyAction && (__guard__(searchAction.getTarget(), (x3) => x3.getOwnerId()) !== aiPlayerId)) {
            numAngryActions += 1;
          }
        } else if (searchAction instanceof SDK.PlayCardFromHandAction || searchAction instanceof SDK.PlaySignatureCardAction) {
          if (isMyAction && searchAction.getCard() instanceof SDK.Unit) {
            numHappyActions += 1;
          }
        }

        // add sub actions
        actionsToSearch = actionsToSearch.concat(searchAction.getSubActions());
      }

      const maxEmotion = Math.max(numHappyActions, numTauntingActions, numAngryActions);
      if (maxEmotion > 0) {
        let emoteData;
        const emoteIds = [];
        const myGeneral = games[gameId].ai.getMyGeneral();
        const myGeneralId = myGeneral.getId();
        const factionEmotesData = SDK.CosmeticsFactory.cosmeticsForTypeAndFaction(SDK.CosmeticsTypeLookup.Emote, myGeneral.getFactionId());

        // use ai faction emote that were most present in last step
        if (maxEmotion === numAngryActions) {
          for (emoteData of Array.from<any>(factionEmotesData)) {
            if (emoteData.enabled && ((emoteData.title === 'Angry') || (emoteData.title === 'Sad') || (emoteData.title === 'Frustrated')) && (emoteData.generalId === myGeneralId)) {
              emoteIds.push(emoteData.id);
            }
          }
        } else if (maxEmotion === numHappyActions) {
          for (emoteData of Array.from<any>(factionEmotesData)) {
            if (emoteData.enabled && (emoteData.title === 'Happy') && (emoteData.generalId === myGeneralId)) {
              emoteIds.push(emoteData.id);
            }
          }
        } else if (maxEmotion === numTauntingActions) {
          for (emoteData of Array.from<any>(factionEmotesData)) {
            if (emoteData.enabled && ((emoteData.title === 'Taunt') || (emoteData.title === 'Sunglasses') || (emoteData.title === 'Kiss')) && (emoteData.generalId === myGeneralId)) {
              emoteIds.push(emoteData.id);
            }
          }
        }

        // pick a random emote
        emoteId = emoteIds[Math.floor(Math.random() * emoteIds.length)];
      }
      // Logger.module("AI").debug "[G:#{gameId}]", "ai_emoteForLastStep -> #{emoteId} for #{games[gameId].session.getLastStep()?.action?.getLogName()}".cyan
      if (emoteId != null) {
        // clear any waiting emote timeout
        ai_stopEmoteTimeouts(gameId);

        // delay must be at least 1 ms to ensure current call stack completes
        return games[gameId].aiEmoteTimeoutId = setTimeout((function () {
          games[gameId].aiEmoteTimeoutId = null;
          // Logger.module("AI").debug "[G:#{gameId}]", "ai_showEmote -> #{emoteId}".cyan
          return emitGameEvent(null, gameId, {
            type: EVENTS.show_emote,
            id: emoteId,
            playerId: games[gameId].ai.getMyPlayerId(),
          });
        }), 4000.0);
      }
    }
  }
};

/**
 * Stops AI timeouts for emotes.
 * @param  {String}    gameId
*/
var ai_stopEmoteTimeouts = function (gameId) {
  if (games[gameId].aiEmoteTimeoutId != null) {
    clearTimeout(games[gameId].aiEmoteTimeoutId);
    return games[gameId].aiEmoteTimeoutId = null;
  }
};

// endregion AI

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
