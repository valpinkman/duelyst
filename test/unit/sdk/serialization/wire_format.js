/*
 * Wire-format guard rails (MODERNIZATION_PLAN.md step 3.1).
 *
 * The SDK's serialization is STRUCTURAL: GameSession.serializeToJSON is a
 * plain JSON.stringify of instance state (with `_private` hidden behind a
 * non-enumerable property), and rehydration is fastExtend(this, data). The
 * own-enumerable property layout of these objects IS the wire format for
 * game state, replays and Firebase snapshots.
 *
 * These tests exist to fail loudly if a refactor (decaffeinate, TS
 * conversion, class-field migration) changes that layout:
 *
 * 1. round-trip: serialize -> deserialize -> serialize must be deep-equal.
 * 2. wire shape: the sorted own-key sets of every serialized object kind are
 *    locked in fixtures/wire_shape.json. If a change to this file's key sets
 *    is INTENTIONAL (a real, reviewed wire-format change), regenerate with:
 *      UPDATE_WIRE_SHAPE=1 pnpm test:unit -- test/unit/sdk/serialization
 *    and commit the fixture diff together with the change that caused it.
 * 3. factory dispatch: modifier/action classes carry the SAME `type` value
 *    twice on purpose - a static (`@type`, used by the factories to map
 *    serialized type -> class) and a prototype property (`type:`, carried by
 *    instances into the serialized data). A conversion that keeps only one
 *    of the two silently breaks either rehydration or serialization.
 */
const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
const { expect } = require('chai');
const fs = require('fs');
const CONFIG = require('app/common/config');
const Logger = require('app/common/logger');
const SDK = require('@duelyst/sdk');
const ModifierFactory = require('@duelyst/sdk/modifiers/modifierFactory');
const ActionFactory = require('@duelyst/sdk/actions/actionFactory');
const Modifier = require('@duelyst/sdk/modifiers/modifier');
const ModifierFlying = require('@duelyst/sdk/modifiers/modifierFlying');
const ModifierOpeningGambit = require('@duelyst/sdk/modifiers/modifierOpeningGambit');
const PlayerModifierManaModifier = require('@duelyst/sdk/playerModifiers/playerModifierManaModifier');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const AttackAction = require('@duelyst/sdk/actions/attackAction');
const EndTurnAction = require('@duelyst/sdk/actions/endTurnAction');
const UtilsSDK = require('test/utils/utils_sdk');

// disable the logger for cleaner test output
Logger.enabled = false;

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'wire_shape.json');

// deterministic scenario: must not change once the fixture is committed
function playScriptedGame() {
  const player1Deck = [
    { id: SDK.Cards.Faction1.General },
    { id: SDK.Cards.Faction1.SilverguardSquire },
    { id: SDK.Cards.Faction1.SilverguardKnight },
  ];
  const player2Deck = [
    { id: SDK.Cards.Faction2.General },
    { id: SDK.Cards.Faction2.KaidoAssassin },
  ];
  UtilsSDK.setupSession(player1Deck, player2Deck, true, true);
  const gameSession = SDK.GameSession.getInstance();
  UtilsSDK.applyCardToBoard(
    { id: SDK.Cards.Faction1.SilverguardSquire },
    2,
    2,
    gameSession.getPlayer1Id(),
  );
  UtilsSDK.applyCardToBoard(
    { id: SDK.Cards.Faction2.KaidoAssassin },
    3,
    2,
    gameSession.getPlayer2Id(),
  );
  gameSession.executeAction(gameSession.actionEndTurn());
  const kaido = gameSession.getBoard().getCardAtPosition({ x: 3, y: 2 });
  const squire = gameSession.getBoard().getCardAtPosition({ x: 2, y: 2 });
  const attackAction = kaido.actionAttack(squire);
  gameSession.executeAction(attackAction);
  gameSession.executeAction(gameSession.actionEndTurn());
  return gameSession;
}

function sortedKeys(obj) {
  return Object.keys(obj).sort();
}

// Collect the sorted own-key sets of every kind of serialized object.
function extractWireShape(snapshot) {
  const cards = Object.values(snapshot.cardsByIndex);
  const general = cards.find((c) => c.isGeneral);
  const unit = cards.find((c) => c.id === SDK.Cards.Faction1.SilverguardSquire);
  const allSteps = [];
  snapshot.turns.forEach((t) => t.steps && allSteps.push(...t.steps));
  if (snapshot.currentTurn.steps) allSteps.push(...snapshot.currentTurn.steps);
  const attackStep = allSteps.find((s) => s.action && s.action.type === AttackAction.type);
  const endTurnStep = allSteps.find((s) => s.action && s.action.type === EndTurnAction.type);
  const modifiers = Object.values(snapshot.modifiersByIndex);
  return {
    session: sortedKeys(snapshot),
    board: sortedKeys(snapshot.board),
    player: sortedKeys(snapshot.players[0]),
    deck: sortedKeys(snapshot.players[0].deck),
    general: sortedKeys(general),
    unit: sortedKeys(unit),
    turn: sortedKeys(snapshot.turns[0]),
    step: sortedKeys(attackStep),
    attackAction: sortedKeys(attackStep.action),
    endTurnAction: sortedKeys(endTurnStep.action),
    modifier: sortedKeys(modifiers[0]),
    battleMapTemplate: sortedKeys(snapshot.battleMapTemplate),
  };
}

describe('wire format guard rails', () => {
  afterEach(() => {
    SDK.GameSession.reset();
  });

  describe('serialization round-trip', () => {
    it('expect serialize -> deserialize -> serialize to be lossless (deep equal)', () => {
      const gameSession = playScriptedGame();
      const s1 = gameSession.generateGameSessionSnapshot();
      SDK.GameSession.reset();
      const fresh = SDK.GameSession.getInstance();
      fresh.deserializeSessionFromFirebase(JSON.parse(s1));
      const s2 = fresh.generateGameSessionSnapshot();
      expect(JSON.parse(s2)).to.eql(JSON.parse(s1));
    });

    it('expect a second deserialize of the round-tripped snapshot to reproduce game state', () => {
      const gameSession = playScriptedGame();
      const squireHP = gameSession.getBoard().getCardAtPosition({ x: 2, y: 2 }).getHP();
      const stepCount = gameSession.getStepCount();
      const s1 = gameSession.generateGameSessionSnapshot();
      SDK.GameSession.reset();
      const fresh = SDK.GameSession.getInstance();
      fresh.deserializeSessionFromFirebase(JSON.parse(s1));
      expect(fresh.getBoard().getCardAtPosition({ x: 2, y: 2 }).getHP()).to.equal(squireHP);
      expect(fresh.getStepCount()).to.equal(stepCount);
      expect(fresh.getCurrentPlayerId()).to.equal(gameSession.getPlayer1Id());
    });
  });

  describe('wire shape golden fixture', () => {
    it('expect the own-key sets of all serialized object kinds to match fixtures/wire_shape.json', () => {
      const gameSession = playScriptedGame();
      const shape = extractWireShape(JSON.parse(gameSession.generateGameSessionSnapshot()));
      if (process.env.UPDATE_WIRE_SHAPE) {
        fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
        fs.writeFileSync(FIXTURE_PATH, `${JSON.stringify(shape, null, 2)}\n`);
      }
      const golden = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
      expect(shape).to.eql(golden);
    });
  });

  describe('factory type dispatch (static @type vs prototype type:)', () => {
    const modifierClasses = [
      Modifier,
      ModifierFlying,
      ModifierOpeningGambit,
      PlayerModifierManaModifier,
    ];
    modifierClasses.forEach((ModifierClass) => {
      it(`expect ${ModifierClass.type} to keep its static and prototype type in sync and dispatch via ModifierFactory`, () => {
        expect(ModifierClass.type, 'static @type').to.be.a('string');
        expect(ModifierClass.prototype.type, 'prototype type:').to.be.a('string');
        expect(ModifierClass.prototype.type).to.equal(ModifierClass.type);
        expect(ModifierFactory.modifierClassForType(ModifierClass.type)).to.equal(ModifierClass);
      });
    });

    // Actions use a different dual-type pattern than modifiers: the static
    // @type drives factory dispatch, and the constructor assigns an OWN
    // instance `type` property (`@type ?= X.type`) which is what serializes.
    const actionClasses = [DamageAction, AttackAction, EndTurnAction];
    actionClasses.forEach((ActionClass) => {
      it(`expect ${ActionClass.type} to keep its static and instance type in sync and construct via ActionFactory`, () => {
        expect(ActionClass.type, 'static @type').to.be.a('string');
        const gameSession = SDK.GameSession.getInstance();
        const action = ActionFactory.actionForType(ActionClass.type, gameSession);
        expect(action).to.be.an.instanceOf(ActionClass);
        expect(action.getType()).to.equal(ActionClass.type);
        expect(
          Object.prototype.hasOwnProperty.call(action, 'type'),
          'instance own type property (serialized)',
        ).to.equal(true);
        expect(JSON.parse(JSON.stringify(action)).type).to.equal(ActionClass.type);
      });
    });

    it('expect a modifier created from serialized data to rehydrate through the factory', () => {
      const gameSession = SDK.GameSession.getInstance();
      const modifier = ModifierFactory.modifierForType(ModifierFlying.type, gameSession);
      expect(modifier).to.be.an.instanceOf(ModifierFlying);
      expect(modifier.getType()).to.equal(ModifierFlying.type);
    });
  });
});
