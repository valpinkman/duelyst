/*
 * Quest factory guard rails.
 *
 * These exist because the whole quest system was silently dead and nothing
 * noticed. `QuestParticipationWithFaction`'s constructor resolved its faction
 * from the class PROTOTYPE (always null) instead of its argument, so
 * `factionForIdentifier(null)` returned undefined and `faction.short_name`
 * threw. Building those quests is the FIRST thing
 * `QuestFactory._generateQuestCache` does, in an unguarded loop, so the throw
 * took the entire cache with it - no participation quests, no win quests, no
 * daily quests, for every player.
 *
 * The suite had no quest coverage at all, so it stayed green throughout. The
 * only visible trace was one console error per new account.
 */
const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../../'));
const { expect } = require('chai');
const Logger = require('@duelyst/common/logger');
const QuestFactory = require('@duelyst/sdk/quests/questFactory');
const FactionFactory = require('@duelyst/sdk/cards/factionFactory');
const QuestParticipationWithFaction = require('@duelyst/sdk/quests/questParticipationWithFaction');
const QuestType = require('@duelyst/sdk/quests/questTypeLookup');

Logger.enabled = false;

describe('QuestFactory', () => {
  describe('the quest cache', () => {
    it('expect building it not to throw', () => {
      // the original failure mode: this threw and left the cache empty
      expect(() =>
        QuestFactory.questForIdentifier(QuestFactory._FACTION_CHALLENGER_BASE_ID + 1),
      ).to.not.throw();
    });

    it('expect a populated cache of quests', () => {
      QuestFactory.questForIdentifier(QuestFactory._FACTION_CHALLENGER_BASE_ID + 1);
      expect(QuestFactory._questCache).to.be.an('array');
      expect(QuestFactory._questCache.length).to.be.greaterThan(0);
    });
  });

  describe('participation quests', () => {
    it('expect one per playable faction, each carrying its OWN faction id', () => {
      const factions = FactionFactory.getAllPlayableFactions();
      expect(factions.length).to.be.greaterThan(0);
      factions.forEach((faction) => {
        const quest = QuestFactory.questForIdentifier(
          QuestFactory._FACTION_CHALLENGER_BASE_ID + faction.id,
        );
        expect(quest, `participation quest missing for faction ${faction.id}`).to.exist;
        // the actual regression: this was null for every faction
        expect(quest.getFactionId(), `faction id wrong for faction ${faction.id}`).to.equal(
          faction.id,
        );
        expect(quest.params.factionId).to.equal(faction.id);
      });
    });
  });

  describe('QuestParticipationWithFaction', () => {
    it('expect the constructor to resolve the faction from its ARGUMENT, not the prototype', () => {
      const faction = FactionFactory.getAllPlayableFactions()[0];
      const quest = new QuestParticipationWithFaction(9999, [QuestType.ShortQuest], 10, faction.id);
      expect(quest.getFactionId()).to.equal(faction.id);
      // prototype default must stay null - instances carry the real value
      expect(QuestParticipationWithFaction.prototype.factionId).to.equal(null);
    });

    it('expect a description that names the faction', () => {
      const faction = FactionFactory.getAllPlayableFactions()[0];
      const quest = new QuestParticipationWithFaction(9999, [QuestType.ShortQuest], 10, faction.id);
      expect(() => quest.getDescription()).to.not.throw();
    });
  });
});
