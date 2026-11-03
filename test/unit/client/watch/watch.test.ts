import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import i18next from 'i18next';
import type { Watch } from '../../../../apps/client/ui/components/watch/watch';

const require = createRequire(import.meta.url);
const Backbone = require('backbone');

// initialise i18next before the component loads (§3.4)
let component: typeof import('../../../../apps/client/ui/components/watch/watch');
let TAG: string;

const LOCALES = '../../../../apps/client/localization/locales/en';

function game(id: string, attrs: Record<string, any> = {}) {
  return {
    id,
    division: 'gold',
    winner_id: 'p1',
    player_1_id: 'p1',
    player_2_id: 'p2',
    player_1_username: 'alice',
    player_2_username: 'bob',
    player_1_profile_picture_id: 1,
    player_2_profile_picture_id: 2,
    player_1_general_id: 10,
    player_2_general_id: 20,
    player_1_key_cards: [101, 102],
    player_2_key_cards: [201],
    ...attrs,
  };
}

function stream(name: string, live = true) {
  return {
    name,
    url: `https://twitch.tv/${name}`,
    avatar_image_url: `https://img/${name}.png`,
    description: `${name} plays`,
    streamData: live ? { stream: { viewers: 42, preview: { large: `https://prev/${name}` } } } : {},
  };
}

const art = {
  profileIcon: (id: any) => `resources/profile_${id}.png`,
  generalPortrait: (id: any) => `resources/general_${id}.png`,
};

// Web Animations stub: each call is recorded with its target and options
interface FakeAnimation {
  target: Element;
  options: any;
  cancel: ReturnType<typeof vi.fn>;
}
let animations: FakeAnimation[];

async function mount(props: Partial<Watch> = {}) {
  const el = document.createElement(TAG) as Watch;
  Object.assign(el, {
    art,
    streams: new Backbone.Collection([]),
    selectedType: 'replays',
    selectedDivision: 'bronze',
    games: new Backbone.Collection([game('g1'), game('g2')]),
    ...props,
  });
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function captured(el: Element, name: string) {
  const seen: any[] = [];
  el.addEventListener(name, (e) => seen.push((e as CustomEvent).detail));
  return seen;
}

const rows = (el: Element) => [...el.querySelectorAll<HTMLElement>('.watch-game-item')];
const activeTabs = (el: Element) =>
  [...el.querySelectorAll('.nav-tabs li.active')].map((li) => li.getAttribute('data-value'));
const listenerCount = (obj: any) => Object.keys(obj._events || {}).length;

describe('<duelyst-watch>', () => {
  beforeAll(async () => {
    await i18next.init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            watch: require(`${LOCALES}/watch.json`),
            rank: require(`${LOCALES}/rank.json`),
          },
        },
      },
    });
    component = await import('../../../../apps/client/ui/components/watch/watch');
    TAG = component.TAG;
  });

  beforeEach(() => {
    animations = [];
    vi.spyOn(HTMLElement.prototype, 'animate').mockImplementation(function (
      this: HTMLElement,
      _keyframes: any,
      options: any,
    ) {
      const animation: FakeAnimation = { target: this, options, cancel: vi.fn() };
      animations.push(animation);
      return animation as unknown as Animation;
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('registers once, under its tag', () => {
    expect(customElements.get(TAG)).toBe(component.Watch);
  });

  it('renders the tabs in light DOM, with the selected type and division active', async () => {
    const el = await mount({ selectedDivision: 'gold' });
    expect(el.shadowRoot).toBeNull();
    expect(el.querySelector('#watch_tabs_type')).not.toBeNull();
    const divisions = [...el.querySelectorAll('#watch_tabs_division li')];
    expect(divisions.map((li) => li.textContent!.trim())).toEqual([
      'Bronze',
      'Silver',
      'Gold',
      'Diamond',
      'S-Rank',
    ]);
    expect(activeTabs(el)).toEqual(['replays', 'gold']);

    el.selectedType = 'live';
    el.selectedDivision = null;
    await el.updateComplete;
    expect(activeTabs(el)).toEqual(['live']);
  });

  it('lights the live tab marker only when a stream was live', async () => {
    const el = await mount();
    const liveTab = () => el.querySelector('#live_streams_tab_item')!;
    expect(liveTab().classList.contains('any-live')).toBe(false);
    el.liveAvailable = true;
    await el.updateComplete;
    expect(liveTab().classList.contains('any-live')).toBe(true);
  });

  it('shows the loading view in place of the list', async () => {
    const el = await mount({ loading: true });
    expect(el.querySelector('.content-region .watch-games-loading')).not.toBeNull();
    expect(rows(el)).toHaveLength(0);
  });

  it('renders a replay row per game with its players, art and key units', async () => {
    const el = await mount({ readGameIds: ['g2'] });
    const [first, second] = rows(el);
    expect(rows(el)).toHaveLength(2);
    expect(first.closest('#watch_games_collection .watch-game-list')).not.toBeNull();
    expect(first.querySelector('.p1 .username')!.textContent).toBe('alice');
    expect(first.querySelector('.p2 .username')!.textContent).toBe('bob');
    expect(first.querySelector('.p1 .profile-icon')!.getAttribute('src')).toContain('profile_1');
    expect(
      first.querySelector<HTMLElement>('.p2 .general-portrait')!.getAttribute('style'),
    ).toContain('general_20');
    expect(
      [...first.querySelectorAll('.p1 ul.key-units li')].map((li) =>
        li.getAttribute('data-card-id'),
      ),
    ).toEqual(['101', '102']);
    expect(first.classList.contains('read')).toBe(false);
    expect(second.classList.contains('read')).toBe(true);
  });

  it('hands each new row to the shell and reveals it, staggered, only once done() is called', async () => {
    // listen before connecting: the rows are handed over on the first render
    const el = document.createElement(TAG) as Watch;
    const asked = captured(el, 'game-render');
    Object.assign(el, {
      art,
      selectedType: 'replays',
      selectedDivision: 'bronze',
      games: new Backbone.Collection([game('g1'), game('g2')]),
    });
    document.body.appendChild(el);
    await el.updateComplete;

    expect(asked.map((d) => d.id)).toEqual(['g1', 'g2']);
    expect(asked[0].units.map((u: any) => u.cardId)).toEqual([101, 102, 201]);
    expect(asked[0].units[0].el.classList.contains('sprite')).toBe(true);
    expect(rows(el).map((r) => r.style.opacity)).toEqual(['0', '0']);
    expect(animations).toHaveLength(0);

    asked[1].done();
    asked[0].done();
    asked[0].done(); // a second call does nothing
    expect(animations.map((a) => (a.target as HTMLElement).dataset.gameId)).toEqual(['g2', 'g1']);
    expect(animations.map((a) => a.options.delay)).toEqual([100, 0]);
  });

  it('follows the replay collection live, asking only for the new row', async () => {
    const el = document.createElement(TAG) as Watch;
    const asked = captured(el, 'game-render');
    const games = new Backbone.Collection([game('g1')]);
    Object.assign(el, { art, selectedType: 'replays', games });
    document.body.appendChild(el);
    await el.updateComplete;
    const firstRow = rows(el)[0];

    games.add(game('g2'));
    await el.updateComplete;
    expect(rows(el)).toHaveLength(2);
    expect(rows(el)[0]).toBe(firstRow); // keyed: the existing row is kept
    expect(asked.map((d) => d.id)).toEqual(['g1', 'g2']);
  });

  it('shows the empty message for an empty division, revealed', async () => {
    const el = await mount({ games: new Backbone.Collection([]) });
    const empty = el.querySelector('.watch-game-list .watch-games-empty h1')!;
    expect(empty.textContent!.trim()).toBe(
      'No games to watch in this division yet. Check back soon!',
    );
    expect(animations.map((a) => a.target)).toEqual([empty.parentElement]);
  });

  it('renders live streams, reveals them once, and follows the collection', async () => {
    const streams = new Backbone.Collection([stream('one'), stream('two', false)]);
    const el = await mount({ selectedType: 'live', selectedDivision: null, streams });
    const items = () => [...el.querySelectorAll('#watch_streams_collection .watch-stream-item')];
    expect(items()).toHaveLength(2);
    expect(items()[0].querySelector('.live-icon')).not.toBeNull();
    expect(items()[0].querySelector('.viewers')!.textContent!.trim()).toBe('42');
    expect(items()[1].querySelector('.stream-preview.offline .offline-icon')).not.toBeNull();
    expect(animations.map((a) => a.options.delay)).toEqual([0, 100]);

    streams.add(stream('three'));
    await el.updateComplete;
    expect(items()).toHaveLength(3);
    expect(animations).toHaveLength(2); // late arrivals are not revealed again
  });

  it('follows a swapped collection and lets go of the old one', async () => {
    const before = new Backbone.Collection([game('g1')]);
    const el = await mount({ games: before });
    const after = new Backbone.Collection([game('g3')]);
    el.games = after;
    await el.updateComplete;
    expect(rows(el).map((r) => r.dataset.gameId)).toEqual(['g3']);
    expect(listenerCount(before)).toBe(0);

    before.add(game('g9'));
    after.add(game('g4'));
    await el.updateComplete;
    expect(rows(el).map((r) => r.dataset.gameId)).toEqual(['g3', 'g4']);
  });

  it('asks for tab changes with events, and leaves the choice to the shell', async () => {
    const el = await mount();
    const selected = captured(el, 'watch-select');
    el.querySelector<HTMLElement>('#live_streams_tab_item')!.click();
    el.querySelector<HTMLElement>('#watch_tabs_type li[data-value="replays"]')!.click();
    el.querySelector<HTMLElement>('#watch_tabs_division li[data-value="diamond"]')!.click();
    expect(selected).toEqual([
      { type: 'live' },
      { type: 'replays' },
      { type: 'replays', division: 'diamond' },
    ]);
    // nothing changes until the shell sets the properties
    await el.updateComplete;
    expect(activeTabs(el)).toEqual(['replays', 'bronze']);
  });

  it('asks to watch a replay from either player', async () => {
    const el = await mount();
    const watched = captured(el, 'replay-watch');
    rows(el)[1].querySelector<HTMLElement>('button.watch.player-2')!.click();
    rows(el)[0].querySelector<HTMLElement>('button.watch.player-1')!.click();
    expect(watched).toEqual([
      { gameId: 'g2', playerId: 'p2' },
      { gameId: 'g1', playerId: 'p1' },
    ]);
  });

  it('asks to open a stream from its preview or its button, without navigating', async () => {
    const el = await mount({
      selectedType: 'live',
      streams: new Backbone.Collection([stream('one')]),
    });
    const opened = captured(el, 'stream-open');
    const link = el.querySelector<HTMLAnchorElement>('.watch-stream-item a')!;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    el.querySelector<HTMLElement>('.watch-stream-item button')!.click();
    expect(event.defaultPrevented).toBe(true);
    expect(opened).toEqual([
      { url: 'https://twitch.tv/one', name: 'one' },
      { url: 'https://twitch.tv/one', name: 'one' },
    ]);
  });

  it('leaves no Backbone listener and no running animation behind when removed', async () => {
    const streams = new Backbone.Collection([stream('one')]);
    const games = new Backbone.Collection([game('g1')]);
    const el = document.createElement(TAG) as Watch;
    const asked = captured(el, 'game-render');
    Object.assign(el, { art, selectedType: 'live', streams, games });
    document.body.appendChild(el);
    await el.updateComplete;
    expect(listenerCount(streams)).toBeGreaterThan(0);
    expect(listenerCount(games)).toBeGreaterThan(0);
    const started = [...animations];

    el.remove();
    expect(listenerCount(streams)).toBe(0);
    expect(listenerCount(games)).toBe(0);
    for (const animation of started) expect(animation.cancel).toHaveBeenCalled();
    // a shell answering after the screen closed reveals nothing
    for (const detail of asked) detail.done();
    expect(animations).toHaveLength(started.length);
  });
});
