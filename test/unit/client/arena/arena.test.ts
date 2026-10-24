import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import type { Arena, Done } from '../../../../apps/client/ui/components/arena/arena';

const require = createRequire(import.meta.url);
const Backbone = require('backbone');

// The real Scene and ArenaLayer are cocos (and the layer reaches managers), so
// both are replaced: the element's job is to drive them, which is what these
// tests watch. FactionFactory is replaced too: it would pull in every card.
const scene = vi.hoisted(() => {
  let content: unknown = null;
  return {
    showContent: vi.fn((layer: unknown) => {
      content = layer;
    }),
    getContent: vi.fn(() => content),
    reset() {
      content = null;
    },
  };
});

vi.mock('../../../../apps/client/view/Scene', () => ({
  default: { getInstance: () => scene },
}));

vi.mock('../../../../apps/client/view/layers/arena/ArenaLayer', () => {
  class FakeArenaLayer {
    delegate: unknown = null;
    dataSource: unknown = null;
    bindDeck = vi.fn();
    showStartArenaRunScreen = vi.fn();
    showArenaRewardsScreen = vi.fn();
    showArenaRunScreen = vi.fn();
    showCardSelectScreen = vi.fn();
  }
  return { default: FakeArenaLayer };
});

vi.mock('@duelyst/sdk/cards/factionFactory', () => ({
  default: {
    GeneralOrder: { Primary: 0 },
    factionForIdentifier: (id: number) => ({ generalIdsByOrder: [id * 100] }),
  },
}));

let component: typeof import('../../../../apps/client/ui/components/arena/arena');
let TAG: string;

const SCREENS = [
  'showStartArenaRunScreen',
  'showArenaRewardsScreen',
  'showArenaRunScreen',
  'showCardSelectScreen',
];

// a run with a full deck and no game finished yet: the run screen
const RUN = {
  ticket_id: 't1',
  created_at: '2026-10-24',
  ended_at: null,
  rewards_claimed_at: null,
  faction_id: 1,
  general_id: 7,
  is_complete: true,
  card_choices: null,
  general_choices: null,
  deck: [1, 2, 3],
};

async function mount(attrs: Record<string, unknown> = RUN, ready = true) {
  const el = document.createElement(TAG) as Arena;
  el.model = new Backbone.Model(attrs);
  document.body.appendChild(el);
  el.ready = ready;
  await el.updateComplete;
  return el;
}

function captured(el: Element, name: string) {
  const seen: any[] = [];
  el.addEventListener(name, (e) => seen.push((e as CustomEvent).detail));
  return seen;
}

function shown(layer: any) {
  return SCREENS.filter((name) => layer[name].mock.calls.length > 0);
}

describe('<duelyst-arena>', () => {
  beforeAll(async () => {
    component = await import('../../../../apps/client/ui/components/arena/arena');
    TAG = component.TAG;
  });

  beforeEach(() => {
    scene.reset();
    scene.showContent.mockClear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('registers once, under its tag', () => {
    expect(customElements.get(TAG)).toBe(component.Arena);
  });

  it('renders nothing, in light DOM (#12 D3)', async () => {
    const el = await mount();
    expect(el.shadowRoot).toBeNull();
    expect(el.children).toHaveLength(0);
    expect(el.textContent).toBe('');
  });

  it('waits for ready before touching cocos', async () => {
    const el = await mount(RUN, false);
    expect(scene.showContent).not.toHaveBeenCalled();
    expect(el.layer).toBeNull();

    el.ready = true;
    await el.updateComplete;
    expect(scene.showContent).toHaveBeenCalledTimes(1);
    expect(scene.showContent).toHaveBeenCalledWith(el.layer, true);
  });

  it('shows one ArenaLayer and is its delegate and data source', async () => {
    const el = await mount();
    const layer = el.layer;
    expect(layer.delegate).toBe(el);
    expect(layer.dataSource).toBe(el);

    el.requestUpdate();
    await el.updateComplete;
    expect(scene.showContent).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['no run yet: the start screen', { created_at: null }, 'showStartArenaRunScreen', []],
    ['claimed: the start screen', { rewards_claimed_at: 'x' }, 'showStartArenaRunScreen', []],
    ['ended: the rewards screen', { ended_at: 'x' }, 'showArenaRewardsScreen', []],
    ['a full deck: the run screen', {}, 'showArenaRunScreen', [1, 2, 3]],
    [
      'card choices: the card select screen',
      { is_complete: false, card_choices: [1] },
      'showCardSelectScreen',
      [1, 2, 3],
    ],
    [
      'general choices: the card select screen',
      { is_complete: false, general_choices: [1] },
      'showCardSelectScreen',
      [1, 2, 3],
    ],
  ])('picks the screen from the run: %s', async (_label, patch, screen, deck) => {
    const el = await mount({ ...RUN, ...patch });
    expect(shown(el.layer)).toEqual([screen]);
    // a run in progress binds its deck; a fresh or finished one an empty deck
    expect(el.layer.bindDeck.mock.calls).toEqual([[deck]]);
  });

  it('shows nothing for a run between choices', async () => {
    const el = await mount({ ...RUN, is_complete: false });
    expect(shown(el.layer)).toEqual([]);
  });

  it('passes wonLastGame to the run screen', async () => {
    const el = document.createElement(TAG) as Arena;
    el.model = new Backbone.Model(RUN);
    el.wonLastGame = true;
    document.body.appendChild(el);
    el.ready = true;
    await el.updateComplete;
    expect(el.layer.showArenaRunScreen).toHaveBeenCalledWith(el.model!.attributes, true);
  });

  describe('data source', () => {
    it('reads the ticket count the shell keeps', async () => {
      const el = await mount();
      el.ticketCount = 2;
      expect(el.getTicketCount()).toBe(2);
    });

    it('has no general until the deck is complete', async () => {
      const el = await mount({ ...RUN, is_complete: false });
      expect(el.getArenaRunGeneralId()).toBeNull();
    });

    it("returns the run's general, or the faction's primary for old runs", async () => {
      expect((await mount()).getArenaRunGeneralId()).toBe(7);
      scene.reset();
      expect((await mount({ ...RUN, general_id: null })).getArenaRunGeneralId()).toBe(100);
    });
  });

  it('sends a faction pick out and, once done, shows the screen the answer calls for', async () => {
    const el = await mount({ ...RUN, is_complete: false, faction_id: null });
    const seen = captured(el, 'arena-faction-select');

    const settled = el.selectFaction(3);
    expect(seen).toHaveLength(1);
    expect(seen[0].factionId).toBe(3);

    (seen[0].done as Done)({ run: { ...RUN, is_complete: false, general_choices: [1] } });
    await settled;
    expect(el.layer.showCardSelectScreen).toHaveBeenCalledTimes(1);
  });

  it('falls back to the model when done() brings no run', async () => {
    const el = await mount({ ...RUN, rewards_claimed_at: 'x' });
    const seen = captured(el, 'arena-rewards-seen');
    const settled = el.markArenaRewardsAsSeen();
    seen[0].done();
    await settled;
    expect(el.layer.showStartArenaRunScreen).toHaveBeenCalledTimes(2);
  });

  it('sends a card pick out with the cards passed over', async () => {
    const el = await mount({ ...RUN, is_complete: false, card_choices: [1] });
    const seen = captured(el, 'arena-card-select');
    const settled = el.selectCard({ id: 9 }, [{ id: 4 }, null]);
    expect(seen[0]).toMatchObject({ cardId: 9, unselectedCardIds: [4, null] });
    seen[0].done({ run: RUN });
    await settled;
    expect(el.layer.showArenaRunScreen).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['startNewArenaRun', 'arena-run-start'],
    ['resignArenaRun', 'arena-run-resign'],
  ])('%s sends %s out with done()', async (method, event) => {
    const el = await mount();
    const seen = captured(el, event);
    const settled = (el as any)[method]();
    expect(seen).toHaveLength(1);
    seen[0].done({ run: { ...RUN, ended_at: 'x' } });
    await settled;
    expect(el.layer.showArenaRewardsScreen).toHaveBeenCalledTimes(1);
  });

  it('rejects with the error and stays on screen when the request fails', async () => {
    const el = await mount({ ...RUN, created_at: null });
    const seen = captured(el, 'arena-run-start');
    const settled = el.startNewArenaRun();
    seen[0].done({ error: 'nope' });
    await expect(settled).rejects.toBe('nope');
    expect(el.layer.showStartArenaRunScreen).toHaveBeenCalledTimes(1);
  });

  it('rejects when the player backs out, so the layer resets its button', async () => {
    const el = await mount();
    const seen = captured(el, 'arena-run-resign');
    const settled = el.resignArenaRun();
    seen[0].done({ cancelled: true });
    await expect(settled).rejects.toBeUndefined();
    expect(shown(el.layer)).toEqual(['showArenaRunScreen']);
  });

  it('buying a ticket resolves once the shell is done, and shows nothing itself', async () => {
    const el = await mount({ ...RUN, created_at: null });
    const seen = captured(el, 'arena-ticket-purchase');
    const settled = el.purchaseTicket();
    seen[0].done();
    await expect(settled).resolves.toBeUndefined();
    expect(el.layer.showStartArenaRunScreen).toHaveBeenCalledTimes(1);
  });

  it('claiming rewards shows them from the answer, and a failure resolves', async () => {
    const el = await mount({ ...RUN, ended_at: 'x' });
    const seen = captured(el, 'arena-rewards-claim');
    const claimed = { ...RUN, ended_at: 'x', rewards_claimed_at: 'y' };
    const settled = el.claimArenaRewards();
    seen[0].done({ run: claimed });
    await settled;
    expect(el.layer.showArenaRewardsScreen).toHaveBeenLastCalledWith(claimed);

    const failed = el.claimArenaRewards();
    seen[1].done({ error: 'nope' });
    await expect(failed).resolves.toBeUndefined();
    expect(el.layer.showArenaRewardsScreen).toHaveBeenCalledTimes(2);
  });

  it('sends find game out, bubbling to the shell', async () => {
    const el = await mount();
    const seen = captured(document.body, 'arena-game-find');
    await el.startLookingForGame();
    expect(seen).toEqual([{}]);
  });

  describe('teardown', () => {
    it('never shows a layer once removed before ready', async () => {
      const el = await mount(RUN, false);
      el.remove();
      el.ready = true;
      await el.updateComplete;
      expect(scene.showContent).not.toHaveBeenCalled();
    });

    it('stops driving the layer once removed', async () => {
      const el = await mount();
      const seen = captured(el, 'arena-run-resign');
      const settled = el.resignArenaRun();
      el.remove();
      seen[0].done({ run: { ...RUN, ended_at: 'x' } });
      await settled;
      expect(el.layer.showArenaRewardsScreen).not.toHaveBeenCalled();
    });

    it('leaves a layer alone once another screen replaced it', async () => {
      const el = await mount({ ...RUN, ended_at: 'x' });
      const layer = el.layer;
      const seen = captured(el, 'arena-rewards-claim');
      const settled = el.claimArenaRewards();
      scene.showContent({});
      seen[0].done({ run: RUN });
      await settled;
      expect(layer.showArenaRewardsScreen).toHaveBeenCalledTimes(1);
    });
  });
});
