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
let Promise = require('bluebird');
const kue = require('kue');
const moment = require('moment');
const request = require('superagent');

// Our modules
const shutdownLib = require('./shutdown');
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
Promise = require('bluebird');

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
let port = config.get('game_port');
server.listen(port, () => Logger.module('GAME SERVER').log(`Game server started on port ${port}`));

// redis
const { Redis, Jobs, GameManager } = require('./redis');

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

const savePlayerCount = (playerCount) => Redis.hsetAsync(`servers:${serverId}`, 'players', playerCount);

const saveGameCount = (gameCount) => Redis.hsetAsync(`servers:${serverId}`, 'games', gameCount);

// error 'domain' to deal with io.sockets uncaught errors
const d = require('domain').create();

d.on('error', shutdownLib.errorShutdown);
d.add(io.sockets);

// health ping on socket namespace /health
const healthPing = io
  .of('/health')
  .on('connection', (socket) => socket.on('ping', function () {
    Logger.module('GAME SERVER').debug('socket.io Health Ping');
    return socket.emit('pong');
  }));

// run main io.sockets inside of the domain
d.run(() => io.sockets.on('connection', function (socket) {
  // add the socket to the error domain
  d.add(socket);

  // Socket is now authenticated, continue to bind other handlers
  Logger.module('IO').debug(`DECODED TOKEN ID: ${socket.decodedToken.d.id.blue}`);

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
}));

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
  // request parameters
  const {
    gameId,
  } = requestData;
  const {
    playerId,
  } = requestData;

  Logger.module('IO').debug(`[G:${gameId}]`, `join_game -> player:${requestData.playerId} is joining game:${requestData.gameId}`.cyan);

  // you must have a playerId
  if (!playerId) {
    Logger.module('IO').error(`[G:${gameId}]`, `join_game -> REFUSING JOIN: A player ${playerId.blue} is not valid`.red);
    this.emit('join_game_response',
      { error: 'Your player id seems to be blank (has your login expired?), so we can\'t join you to the game.' });
    return;
  }

  // must have a gameId
  if (!gameId) {
    Logger.module('IO').error(`[G:${gameId}]`, `join_game -> REFUSING JOIN: A gameId ${gameId.blue} is not valid`.red);
    this.emit('join_game_response',
      { error: 'Invalid Game ID.' });
    return;
  }

  // if someone is trying to join a game they don't belong to as a player they are not authenticated as
  if (this.decodedToken.d.id !== playerId) {
    Logger.module('IO').error(`[G:${gameId}]`, `join_game -> REFUSING JOIN: A player ${this.decodedToken.d.id.blue} is attempting to join a game as ${playerId.blue}`.red);
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
      Logger.module('IO').error(`[G:${gameId}]`, `join_game -> detected duplicate connection to ${gameId} GameSession for ${playerId.blue}. Disconnecting duplicate...`.cyan);
      return playerLeaveGameIfNeeded(socket, (silent = true));
    }
  }));

  // initialize a server-side game session and join it
  return initGameSession(gameId)
    .bind(this)
    .spread(function (gameSession) {
    // Logger.module("IO").debug "[G:#{gameId}]", "join_game -> players in data: ", gameSession.players

      // player
      const player = _.find(gameSession.players, (p) => p.playerId === playerId);

      // get the opponent based on the game session data
      const opponent = _.find(gameSession.players, (p) => p.playerId !== playerId);

      Logger.module('IO').debug(`[G:${gameId}]`, `join_game -> Got ${gameId} GameSession data ${playerId.blue}.`.cyan);

      if (!player) { // oops looks like this player does not exist in the requested game
      // let the socket know we had an error
        this.emit('join_game_response',
          { error: 'could not join game because your player id could not be found' });

        // destroy the game data loaded so far if the opponent can't be defined and no one else is connected
        Logger.module('IO').error(`[G:${gameId}]`, 'onGameJoin -> DESTROYING local game cache due to join error'.red);
        destroyGameSessionIfNoConnectionsLeft(gameId);

        // stop any further processing
      } else if ((opponent == null)) { // oops, looks like we can'f find an opponent in the game session?
        Logger.module('IO').error(`[G:${gameId}]`, `join_game -> game ${gameId} ERROR: could not find opponent for ${playerId.blue}.`.red);

        // let the socket know we had an error
        this.emit('join_game_response',
          { error: 'could not join game because the opponent could not be found' });

        // destroy the game data loaded so far if the opponent can't be defined and no one else is connected
        Logger.module('IO').error(`[G:${gameId}]`, 'onGameJoin -> DESTROYING local game cache due to join error'.red);
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
        this.gameId = gameId;
        this.playerId = playerId;

        // join game room
        this.join(gameId);

        // update user count for game room
        games[gameId].connectedPlayers.push(playerId);

        Logger.module('IO').debug(`[G:${gameId}]`, `join_game -> Game ${gameId} connected players so far: ${games[gameId].connectedPlayers.length}.`);

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
        this.emit('join_game_response', {
          message: 'successfully joined game',
          gameSessionData,
          connectedPlayers: games[gameId].connectedPlayers,
          connectedSpectators: getConnectedSpectatorsDataForGamePlayer(gameId, playerId),
        },
        );

        // broadcast join to any other connected players
        return this.broadcast.to(gameId).emit('player_joined', playerId);
      }
    }).catch(function (e) {
      Logger.module('IO').error(`[G:${gameId}]`, `join_game -> player:${playerId} failed to join game, error: ${e.message}`.red);
      Logger.module('IO').error(`[G:${gameId}]`, `join_game -> player:${playerId} failed to join game, error stack: ${e.stack}`.red);
      // if we didn't join a game, broadcast a failure
      return this.emit('join_game_response',
        { error: 'Could not join game: ' + (e != null ? e.message : undefined) });
    });
};

/*
 * socket handler for spectators joining game
 * @public
 * @param  {Object}  requestData    Plain JS object with socket event data.
 */
var onGameSpectatorJoin = function (requestData) {
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
    Logger.module('IO').error(`[G:${gameId}]`, `spectate_game -> REFUSING JOIN: A specate token ${spectateToken} is not valid`.red);
    this.emit('spectate_game_response',
      { error: 'Your spectate token is invalid, so we can\'t join you to the game.' });
    return;
  }

  Logger.module('IO').debug(`[G:${gameId}]`, 'spectate_game -> token contents: ', spectateToken.b);
  Logger.module('IO').debug(`[G:${gameId}]`, 'spectate_game -> playerId: ', playerId);

  if (!_.contains(spectateToken.b, playerId)) {
    Logger.module('IO').error(`[G:${gameId}]`, 'spectate_game -> REFUSING JOIN: You do not have permission to specate this game'.red);
    this.emit('spectate_game_response',
      { error: 'You do not have permission to specate this game.' });
    return;
  }

  // must have a spectatorId
  if (!spectatorId) {
    Logger.module('IO').error(`[G:${gameId}]`, `spectate_game -> REFUSING JOIN: A spectator ${spectatorId.blue} is not valid`.red);
    this.emit('spectate_game_response',
      { error: 'Your login ID is blank (expired?), so we can\'t join you to the game.' });
    return;
  }

  // must have a playerId
  if (!playerId) {
    Logger.module('IO').error(`[G:${gameId}]`, `spectate_game -> REFUSING JOIN: A player ${playerId.blue} is not valid`.red);
    this.emit('spectate_game_response',
      { error: 'Invalid player ID.' });
    return;
  }

  // must have a gameId
  if (!gameId) {
    Logger.module('IO').error(`[G:${gameId}]`, `spectate_game -> REFUSING JOIN: A gameId ${gameId.blue} is not valid`.red);
    this.emit('spectate_game_response',
      { error: 'Invalid Game ID.' });
    return;
  }

  // if someone is trying to join a game they don't belong to as a player they are not authenticated as
  if (this.decodedToken.d.id !== spectatorId) {
    Logger.module('IO').error(`[G:${gameId}]`, `spectate_game -> REFUSING JOIN: A player ${this.decodedToken.d.id.blue} is attempting to join a game as ${playerId.blue}`.red);
    this.emit('spectate_game_response',
      { error: 'Your login ID does not match the one you requested to spectate the game with.' });
    return;
  }

  Logger.module('IO').debug(`[G:${gameId}]`, `spectate_game -> spectator:${spectatorId} is joining game:${gameId}`.cyan);

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
    .bind(this)
    .then(function (spectatorGameSession) {
    // for spectators, use the delayed in-memory game session
      const gameSession = spectatorGameSession;

      Logger.module('IO').debug(`[G:${gameId}]`, `spectate_game -> Got ${gameId} GameSession data.`.cyan);
      const player = _.find(gameSession.players, (p) => p.playerId === playerId);
      const opponent = _.find(gameSession.players, (p) => p.playerId !== playerId);

      if (!player) {
      // let the socket know we had an error
        this.emit('spectate_game_response',
          { error: 'could not join game because the player id you requested could not be found' });

        // destroy the game data loaded so far if the opponent can't be defined and no one else is connected
        Logger.module('IO').error(`[G:${gameId}]`, 'onGameSpectatorJoin -> DESTROYING local game cache due to join error'.red);
        destroyGameSessionIfNoConnectionsLeft(gameId);

        // stop any further processing
      } else {
      // set some parameters for the socket
        let gameSessionData;
        this.gameId = gameId;
        this.spectatorId = spectatorId;
        this.spectateToken = spectateToken;
        this.playerId = playerId;

        // join game room
        this.join(`spectate-${gameId}`);

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
        this.emit('spectate_game_response', {
          message: 'successfully joined game',
          gameSessionData,
        },
        );

        // broadcast to the game room that a spectator has joined
        return this.broadcast.to(gameId).emit('spectator_joined', {
          id: spectatorId,
          playerId,
          username: spectateToken.u,
        });
      }
    }).catch(function (e) {
    // if we didn't join a game, broadcast a failure
      return this.emit('spectate_game_response',
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
    Logger.module('IO').debug(`[G:${this.gameId}]`, `leave_game -> spectator ${this.spectatorId} leaving ${this.gameId}`);
    return spectatorLeaveGameIfNeeded(this);
  } else {
    Logger.module('IO').debug(`[G:${this.gameId}]`, `leave_game -> player ${this.playerId} leaving ${this.gameId}`);
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
    Logger.module('IO').error(`[G:${this.gameId}]`, `onGameEvent :: ERROR: spectator sockets can't submit game events. (type: ${eventData.type})`.red);
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
      Logger.module('IO').error(`[G:${this.gameId}]`, `onGameStep:: error: ${JSON.stringify(error.message)}`.red);
      Logger.module('IO').error(`[G:${this.gameId}]`, `onGameStep:: error stack: ${error.stack}`.red);

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
    spectatorLeaveGameIfNeeded(this);
    // remove the socket from the error domain, this = socket
    return d.remove(this);
  } else {
    try {
      __guard__(io.sockets.adapter.rooms.get(this.gameId), (x) => x.forEach(function (socketId) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket.playerId === this.playerId) {
          Logger.module('IO').error(`onGameDisconnect:: looks like the player ${this.playerId} we are trying to disconnect is still in the game ${this.gameId} room. ABORTING`.red);
        }
      }));

      for (var clientId in io.sockets.sockets) {
        var socket = io.sockets.sockets[clientId];
        if ((socket.playerId === this.playerId) && !socket.spectatorId) {
          Logger.module('IO').error(`onGameDisconnect:: looks like the player ${this.playerId} that allegedly disconnected is still alive and well.`.red);
          return;
        }
      }
    } catch (error) {
      Logger.module('IO').error(`onGameDisconnect:: Error ${(error != null ? error.message : undefined)}.`.red);
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

    // remove the socket from the error domain, this = socket
    d.remove(this);
    savePlayerCount(--playerCount);
    Logger.module('IO').debug(`[G:${this.gameId}]`, `disconnect -> ${this.playerId}`.red);

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
      Logger.module('...').debug(`[G:${gameId}]`, `playerLeaveGame -> ${playerId} has left game ${gameId}`.red);

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
    Logger.module('...').debug(`[G:${socket.gameId}]`, `spectatorLeaveGameIfNeeded -> ${socket.spectatorId} has left game ${socket.gameId}. remaining spectators ${remainingSpectators}`);

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
  if ((games[gameId].connectedPlayers.length === 0) && (games[gameId].connectedSpectators.length === 0)) {
    clearDisconnectedPlayerTimeout(gameId);
    stopTurnTimer(gameId);
    tearDownSpectateSystemsIfNoSpectatorsLeft(gameId);
    Logger.module('...').debug(`[G:${gameId}]`, 'destroyGameSessionIfNoConnectionsLeft() -> no players left DESTROYING local game cache'.red);
    unsubscribeFromGameSessionEvents(gameId);

    // TEMP: a way to upload unfinished game data to AWS S3 Archive. For example: errored out games.
    if (persist && (__guard__(__guard__(games != null ? games[gameId] : undefined, (x1) => x1.session), (x) => x.status) !== SDK.GameStatus.over)) {
      const data = games[gameId].session.serializeToJSON(games[gameId].session);
      const mouseAndUIEventsData = JSON.stringify(games[gameId].mouseAndUIEvents);
      Promise.all([
        GameManager.saveGameSession(gameId, data),
        GameManager.saveGameMouseUIData(gameId, mouseAndUIEventsData),
      ])
        .then((results) => Logger.module('...').debug(`[G:${gameId}]`, `destroyGameSessionIfNoConnectionsLeft -> unfinished Game Archived to S3: ${results[1]}`.green)).catch((error) => Logger.module('...').error(`[G:${gameId}]`, `destroyGameSessionIfNoConnectionsLeft -> ERROR: failed to archive unfinished game to S3 due to error ${error.message}`.red));
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
  Logger.module('IO').debug(`[G:${gameId}]`, `clearDisconnectedPlayerTimeout:: for game: ${gameId}`.yellow);
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
  Logger.module('IO').debug(`[G:${gameId}]`, `startDisconnectedPlayerTimeout:: for ${playerId} in game: ${gameId}`.yellow);

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
  Logger.module('IO').debug(`[G:${gameId}]`, `onDisconnectedPlayerTimeout:: ${playerId} for game: ${gameId}`);

  __guard__(io.sockets.adapter.rooms.get(gameId), (x) => x.forEach(function (socketId) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket.playerId === playerId) {
      Logger.module('IO').error(`[G:${gameId}]`, `onDisconnectedPlayerTimeout:: looks like the player ${playerId} we are trying to dis-connect is still in the game ${gameId} room. ABORTING`.red);
    }
  }));

  for (var clientId in io.sockets.sockets) {
    var socket = io.sockets.sockets[clientId];
    if ((socket.playerId === playerId) && !socket.spectatorId) {
      Logger.module('IO').error(`[G:${gameId}]`, `onDisconnectedPlayerTimeout:: looks like the player ${playerId} we are trying to disconnect is still connected but not in the game ${gameId} room.`.red);
      return;
    }
  }

  // grab the relevant game session
  const gs = games[gameId] != null ? games[gameId].session : undefined;

  // looks like we timed out for a game that's since ended
  if (!gs || ((gs != null ? gs.status : undefined) === SDK.GameStatus.over)) {
    Logger.module('IO').error(`[G:${gameId}]`, `onDisconnectedPlayerTimeout:: ${playerId} timed out for FINISHED or NULL game: ${gameId}`.yellow);
  } else {
    Logger.module('IO').debug(`[G:${gameId}]`, `onDisconnectedPlayerTimeout:: ${playerId} auto-resigning game: ${gameId}`.yellow);

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
    return game.turnTimer = setInterval((() => onGameTimeTick(gameId)), 1000);
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
    // allowed turn time is 90 seconds + slop buffer that clients don't see
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
          for (player of Array.from(gameSession.players)) {
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
          // NOTE: we should be OK to contiue to use the eventData here since indices of all actions are the same becuase the delayed game sessions is running as non-authoriative

          // send events over to spectators of current player
          __guard__(io.sockets.adapter.rooms.get(`spectate-${gameId}`), (x1) => x1.forEach(function (socketId) {
            Logger.module('IO').debug(`[G:${gameId}]`, `flushSpectatorNetworkEventBuffer() -> transmitting step ${__guard__(eventData.step != null ? eventData.step.index : undefined, (x2) => x2.toString().yellow)} with action ${(eventData.step.action != null ? eventData.step.action.name : undefined)} to player's spectators`);
            const socket = io.sockets.sockets.get(socketId);
            if ((socket != null) && (socket.playerId === eventData.step.playerId)) {
              // scrub the action data. this should not be skipped since some actions include entire deck that needs to be scrubbed because we don't want spectators deck sniping
              const eventDataCopy = JSON.parse(JSON.stringify(eventData));
              // TODO: we use session to scrub here but might need to use the delayed session
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
    return Array.from((games[gameId] != null ? games[gameId].spectatorGameEventBuffer : undefined)).map((eventData, i) =>
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
            Logger.module('IO').debug(`[G:${gameId}]`, `emitGameEvent -> transmitting step ${__guard__(eventData.step != null ? eventData.step.index : undefined, (x3) => x3.toString().yellow)} with action ${(eventData.step.action != null ? eventData.step.action.type : undefined)} to origin`);
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
    .spread((gameData, mouseData) => [
      JSON.parse(gameData),
      JSON.parse(mouseData),
    ])
    .spread(function (gameDataIn, mouseData) {
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
          for (var eventData of Array.from(games[gameId].opponentEventDataBuffer)) {
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
    // TODO: this will break delayed game session, needs a recode
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
  Logger.module('...').debug(`[G:${gameId}]`, 'subscribeToGameSessionEvents -> subscribing to GameSession events');
  const game = games[gameId];
  if (game != null) {
    // unsubscribe from previous
    unsubscribeFromGameSessionEvents(gameId);

    // listen for game events
    game.session.getEventBus().on(EVENTS.before_rollback_to_snapshot, onBeforeRollbackToSnapshot);
    game.session.getEventBus().on(EVENTS.step, onStep);
    return game.session.getEventBus().on(EVENTS.invalid_action, onInvalidAction);
  }
};

/*
 * Unsubscribe from event listeners on the game session for this game ID.
 * @public
 * @param  {String}    gameId      The game ID that needs to be unsubscribed.
 */
var unsubscribeFromGameSessionEvents = function (gameId) {
  Logger.module('...').debug(`[G:${gameId}]`, 'unsubscribeFromGameSessionEvents -> un-subscribing from GameSession events');
  const game = games[gameId];
  if (game != null) {
    game.session.getEventBus().off(EVENTS.before_rollback_to_snapshot, onBeforeRollbackToSnapshot);
    game.session.getEventBus().off(EVENTS.step, onStep);
    return game.session.getEventBus().off(EVENTS.invalid_action, onInvalidAction);
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
    const player = gameSession.getPlayerById(userId);
    const isFriendly = gameSession.isFriendly();

    // get game type for user
    let gameType = gameSession.getGameType();
    if ((gameType === SDK.GameType.Casual) && player.getIsRanked()) {
      // casual games should be processed as ranked for ranked players
      gameType = SDK.GameType.Ranked;
    }

    // check for isUnscored
    let isUnscored = false;
    // calculate based on number of resign status and number of actions
    // if the game didn't have a single turn, mark the game as unscored
    if (gameSession.getPlayerById(userId).hasResigned && (gameSession.getTurns().length === 0)) {
      Logger.module('GAME-OVER').debug(`[G:${gameId}]`, `User: ${userId} CONCEDED a game with 0 turns. Marking as UNSCORED`.yellow);
      isUnscored = true;
    } else if (!isWinner && !isDraw) {
      // otherwise check how many actions the player took
      let playerActionCount = 0;
      let meaningfulActionCount = 0;
      let moveActionCount = 0;
      for (var a of Array.from(gameSession.getActions())) {
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
        Logger.module('GAME-OVER').debug(`[G:${gameId}]`, `User: ${userId} CONCEDED a game with too few meaningful actions. Marking as UNSCORED`.yellow);
        isUnscored = true;
      }
    }

    // start the job to process the game for a user
    return Jobs.create('update-user-post-game', {
      name: 'Update User Ranking',
      title: util.format('User %s :: Game %s', userId, gameId),
      userId,
      opponentId,
      gameId,
      gameType,
      factionId,
      generalId,
      isWinner,
      isDraw,
      isUnscored,
      ticketId,
    },
    ).removeOnComplete(true); // wait to save job until ready to process
  };

  const updateUsersRatings = function (player1UserId, player2UserId, gameId, player1IsWinner, isDraw) {
    // Detect if one player is casual playing in a ranked game
    const player1IsRanked = gameSession.getPlayerById(player1UserId).getIsRanked();
    const player2IsRanked = gameSession.getPlayerById(player2UserId).getIsRanked();
    let gameType = gameSession.getGameType();
    if ((gameType === SDK.GameType.Casual) && (player1IsRanked || player2IsRanked)) {
      // casual games should be processed as ranked for ranked players
      gameType = SDK.GameType.Ranked;
    }
    const isRanked = gameType === SDK.GameType.Ranked;
    Logger.module('GAME-OVER').debug(`[G:${gameId}]`, `UPDATING users [${player1UserId},${player2UserId}] ratings.`);

    // Ratings only process in NON-FRIENDLY matches where at least 1 player is rank 0
    if (isRanked) {
      // start the job to process the ratings for the players
      return Jobs.create('update-users-ratings', {
        name: 'Update User Rating',
        title: util.format('Users [%s,%s] :: Game %s', player1UserId, player2UserId, gameId),
        player1UserId,
        player1IsRanked,
        player2UserId,
        player2IsRanked,
        gameId,
        player1IsWinner,
        isDraw,
      },
      ).removeOnComplete(true).save();
    } else {
      return Promise.resolve();
    }
  };

  // Save then archive game session
  const archiveGame = (gameId, gameSession, mouseAndUIEvents) => Promise.all([
    GameManager.saveGameMouseUIData(gameId, JSON.stringify(mouseAndUIEvents)),
    GameManager.saveGameSession(gameId, gameSession.serializeToJSON(gameSession)),
  ]).then(() => // Job: Archive Game
    Jobs.create('archive-game', {
      name: 'Archive Game',
      title: util.format('Archiving Game %s', gameId),
      gameId,
      gameType: gameSession.getGameType(),
    },
    ).removeOnComplete(true).save());

  // Builds a promise for executing the user update ratings job after player update jobs have completed
  const updateUserRatingsPromise = (
    updatePlayer1Job,
    updatePlayer2Job,
    player1Id,
    player2Id,
    gameId,
    player1IsWinner,
    isDraw,
  ) => // Wait until both players update jobs have completed before updating ratings
    Promise.all([
      new Promise(function (resolve, reject) { updatePlayer1Job.on('complete', resolve); return updatePlayer1Job.on('error', reject); },
        new Promise(function (resolve, reject) { updatePlayer2Job.on('complete', resolve); return updatePlayer2Job.on('error', reject); })),
    ]).then(() => updateUsersRatings(player1Id, player2Id, gameId, player1IsWinner, isDraw)).catch(
      (error) => Logger.module('GAME-OVER').error(`[G:${gameId}]`, `ERROR: afterGameOver update player job failed ${error}`.red),
    );

  // gamesession player data
  const player1Id = gameSession.getPlayer1Id();
  const player2Id = gameSession.getPlayer2Id();
  const player1FactionId = __guard__(gameSession.getPlayer1SetupData(), (x) => x.factionId);
  const player2FactionId = __guard__(gameSession.getPlayer2SetupData(), (x1) => x1.factionId);
  const player1GeneralId = __guard__(gameSession.getPlayer1SetupData(), (x2) => x2.generalId);
  const player2GeneralId = __guard__(gameSession.getPlayer2SetupData(), (x3) => x3.generalId);
  const player1TicketId = __guard__(gameSession.getPlayer1SetupData(), (x4) => x4.ticketId);
  const player2TicketId = __guard__(gameSession.getPlayer2SetupData(), (x5) => x5.ticketId);
  const winnerId = gameSession.getWinnerId();
  const loserId = gameSession.getWinnerId();
  const player1IsWinner = (player1Id === winnerId);
  const isDraw = (winnerId == null);

  // update promises
  const promises = [];

  // update users
  const updatePlayer1Job = updateUser(player1Id, player2Id, gameId, player1FactionId, player1GeneralId, (player1Id === winnerId), isDraw, player1TicketId);
  const updatePlayer2Job = updateUser(player2Id, player1Id, gameId, player2FactionId, player2GeneralId, (player2Id === winnerId), isDraw, player2TicketId);
  // wait until both players update jobs have completed before updating ratings
  promises.push(updateUserRatingsPromise(updatePlayer1Job, updatePlayer2Job, player1Id, player2Id, gameId, player1IsWinner, isDraw));
  updatePlayer1Job.save();
  updatePlayer2Job.save();

  // archive game
  promises.push(archiveGame(gameId, gameSession, mouseAndUIEvents));

  // execute promises
  return Promise.all(promises)
    .then(() => Logger.module('GAME-OVER').debug(`[G:${gameId}]`, 'afterGameOver done, game is being archived'.green)).catch((error) => Logger.module('GAME-OVER').error(`[G:${gameId}]`, `ERROR: afterGameOver failed ${error}`.red));
};

/* Shutdown Handler */
const shutdownHandler = function () {
  Logger.module('SERVER').log('Received shutdown signal; shutting down game server.');
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
      return Promise.map(ids, function (id) {
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

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
