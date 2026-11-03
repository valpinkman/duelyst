import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import type { Done, RiftRun } from '../../../../apps/client/ui/components/rift/rift-run';

const require = createRequire(import.meta.url);
const Backbone = require('backbone');

// The real Scene and RiftLayer are cocos (and the layer reaches managers), so
// both are replaced: the element's job is to drive them, which is what these
// tests watch.
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

vi.mock('../../../../apps/client/view/layers/rift/RiftLayer', () => {
  class FakeRiftLayer {
    delegate: unknown = null;
    dataSource: unknown = null;
    bindDeck = vi.fn();
    showCardSelectScreen = vi.fn();
    showCardUpgradeScreen = vi.fn();
    showSelectCardToUpgradeScreen = vi.fn();
    showRiftRunScreen = vi.fn();
  }
  return { default: FakeRiftLayer };
});

let component: typeof import('../../../../apps/client/ui/components/rift/rift-run');
let TAG: string;

// a run that has a general and no upgrade pending: the run screen
const RUN = {
  ticket_id: 't1',
  created_at: '2026-10-24',
  rewards_claimed_at: null,
  faction_id: 1,
  general_id: 1,
  card_id_to_upgrade: null,
  stored_upgrades: [],
  deck: [1, 2, 3],
};

async function mount(attrs: Record<string, unknown> = RUN, ready = true) {
  const el = document.createElement(TAG) as RiftRun;
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

describe('<duelyst-rift-run>', () => {
  beforeAll(async () => {
    component = await import('../../../../apps/client/ui/components/rift/rift-run');
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
    expect(customElements.get(TAG)).toBe(component.RiftRun);
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

  it('shows one RiftLayer and is its delegate and data source', async () => {
    const el = await mount();
    const layer = el.layer;
    expect(layer.delegate).toBe(el);
    expect(layer.dataSource).toBe(el);
    // RiftLayer.selectCard reads dataSource.model
    expect(layer.dataSource.model).toBe(el.model);
    expect(el.getRiftRunGeneralId()).toBe(1);

    el.ready = true;
    el.requestUpdate();
    await el.updateComplete;
    expect(scene.showContent).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['no general yet: the card select screen', { general_id: null }, 'showCardSelectScreen'],
    ['a card to replace: the upgrade screen', { card_id_to_upgrade: 7 }, 'showCardUpgradeScreen'],
    [
      'stored upgrades: pick a card to replace',
      { stored_upgrades: [{}] },
      'showSelectCardToUpgradeScreen',
    ],
    ['otherwise: the run screen', {}, 'showRiftRunScreen'],
  ])('picks the screen from the run: %s', async (_label, patch, screen) => {
    const el = await mount({ ...RUN, ...patch });
    const layer = el.layer;
    for (const name of [
      'showCardSelectScreen',
      'showCardUpgradeScreen',
      'showSelectCardToUpgradeScreen',
      'showRiftRunScreen',
    ]) {
      expect(layer[name], name).toHaveBeenCalledTimes(name === screen ? 1 : 0);
    }
  });

  it('binds the run deck, or an empty one for a fresh run', async () => {
    const started = (await mount()).layer;
    expect(started.bindDeck.mock.calls).toEqual([[[1, 2, 3]]]);

    scene.reset();
    const fresh = (await mount({ ...RUN, created_at: null, general_id: null })).layer;
    expect(fresh.bindDeck.mock.calls).toEqual([[[]]]);
  });

  it('sends a general pick out and, once done, shows the screen the updated model calls for', async () => {
    const el = await mount({ ...RUN, general_id: null });
    const layer = el.layer;
    const seen = captured(el, 'rift-general-select');

    const settled = el.selectGeneral({ id: 42 });
    expect(seen).toHaveLength(1);
    expect(seen[0].cardId).toBe(42);

    // the shell writes the server's answer into the model, then calls done()
    el.model!.attributes.general_id = 42;
    (seen[0].done as Done)();
    await settled;
    expect(layer.showCardSelectScreen).toHaveBeenCalledTimes(1);
    expect(layer.showRiftRunScreen).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['selectCard', 'rift-card-select', { cardId: 9 }],
    ['selectCardToUpgrade', 'rift-card-to-upgrade-select', { cardId: 9 }],
    ['storeCurrentUpgradePack', 'rift-upgrade-store', {}],
    ['rerollCurrentUpgradePack', 'rift-upgrade-reroll', {}],
  ])('%s sends %s out with done()', async (method, event, expected) => {
    const el = await mount();
    const seen = captured(el, event);
    const arg = method === 'selectCard' ? { id: 9 } : 9;
    const settled = (el as any)[method](arg);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject(expected);
    seen[0].done();
    await settled;
    expect(el.layer.showRiftRunScreen).toHaveBeenCalledTimes(2);
  });

  it('rejects with the error and stays on screen when the request fails', async () => {
    const el = await mount();
    const seen = captured(el, 'rift-upgrade-store');
    const settled = el.storeCurrentUpgradePack();
    seen[0].done({ error: 'nope' });
    await expect(settled).rejects.toBe('nope');
    expect(el.layer.showRiftRunScreen).toHaveBeenCalledTimes(1);
  });

  it('resolves and stays on screen when the shell sent nothing', async () => {
    const el = await mount();
    const seen = captured(el, 'rift-card-to-upgrade-select');
    const settled = el.selectCardToUpgrade(3);
    seen[0].done({ cancelled: true });
    await expect(settled).resolves.toBeUndefined();
    expect(el.layer.showRiftRunScreen).toHaveBeenCalledTimes(1);
  });

  it('sends find and cancel game out', async () => {
    const el = await mount();
    const find = captured(el, 'rift-game-find');
    const cancel = captured(el, 'rift-game-cancel');
    await el.startLookingForGame();
    await el.cancelLookingForGame();
    expect(find).toEqual([{}]);
    expect(cancel).toEqual([{}]);
  });

  it('events bubble to the shell', async () => {
    const el = await mount();
    const seen = captured(document.body, 'rift-game-find');
    await el.startLookingForGame();
    expect(seen).toHaveLength(1);
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
      const seen = captured(el, 'rift-upgrade-store');
      const settled = el.storeCurrentUpgradePack();
      el.remove();
      seen[0].done();
      await settled;
      expect(el.layer.showRiftRunScreen).toHaveBeenCalledTimes(1);
    });

    it('leaves a layer alone once another screen replaced it', async () => {
      const el = await mount();
      const layer = el.layer;
      const seen = captured(el, 'rift-upgrade-reroll');
      const settled = el.rerollCurrentUpgradePack();
      scene.showContent({});
      seen[0].done();
      await settled;
      expect(layer.showRiftRunScreen).toHaveBeenCalledTimes(1);
    });
  });
});
