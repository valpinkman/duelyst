import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import i18next from 'i18next';
import type { Profile } from '../../../../apps/client/ui/components/profile/profile';

const require = createRequire(import.meta.url);
const Backbone = require('backbone');

// initialise i18next before the component loads (§3.4)
let component: typeof import('../../../../apps/client/ui/components/profile/profile');
let TAG: string;

const LOCALES = '../../../../apps/client/localization/locales/en';

const art = {
  profileIcon: (id: any) => `resources/profile_icons/${id}.png`,
  divisionClass: (rank: any) => (rank == null ? 'unknown' : rank > 20 ? 'bronze' : 'gold'),
  divisionName: (rank: any) => (rank > 20 ? 'Bronze' : 'Gold'),
};

function ownProfile(attrs: Record<string, any> = {}) {
  return new Backbone.Model({
    username: 'alice',
    presence: { rank: 25, portrait_id: 3 },
    ...attrs,
  });
}

function summary(attrs: Record<string, any> = {}) {
  return {
    ranked: { win_count: 12 },
    gauntlet: { win_count: 4 },
    run: { win_count: 0, blade_id: 1, gauntlet_progress_percent: 0 },
    currentSeasonRank: {
      rank: 25,
      win_streak: 2,
      rank_progress_percent: 17,
      season_label: 'October 2026',
    },
    currentSeasonGameCounterModel: { win_count: 5 },
    currentSeasonLadderPositionModel: {},
    topRank: { top_rank: 10, rank_progress_percent: 67, season_label: 'May 2026' },
    divisionStats: {},
    ribbons: [
      { id: 1, count: 0 },
      { id: 2, count: 3 },
    ],
    ...attrs,
  };
}

async function mount(props: Partial<Profile> = {}) {
  const el = document.createElement(TAG) as Profile;
  Object.assign(el, { art, model: ownProfile(), seasonCount: 4, ...props });
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function captured(el: Element, name: string) {
  const seen: any[] = [];
  el.addEventListener(name, (e) => seen.push((e as CustomEvent).detail));
  return seen;
}

const text = (el: Element | null) => (el ? el.textContent!.replace(/\s+/g, ' ').trim() : null);
const listenerCount = (obj: any) => Object.keys(obj._events || {}).length;

describe('<duelyst-profile>', () => {
  beforeAll(async () => {
    await i18next.init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            profile: require(`${LOCALES}/profile.json`),
            common: require(`${LOCALES}/common.json`),
            rank: require(`${LOCALES}/rank.json`),
            battle: require(`${LOCALES}/battle.json`),
          },
        },
      },
    });
    component = await import('../../../../apps/client/ui/components/profile/profile');
    TAG = component.TAG;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('registers once, under its tag', () => {
    expect(customElements.get(TAG)).toBe(component.Profile);
  });

  it('renders the own header in light DOM, with the tabs and no region before a tab', async () => {
    const el = await mount();
    expect(el.shadowRoot).toBeNull();
    expect(
      el.querySelector('button.portrait.change-portrait.bronze img')!.getAttribute('src'),
    ).toBe('resources/profile_icons/3.png');
    expect(text(el.querySelector('.username-content'))).toBe('alice');
    expect(text(el.querySelector('.season-count'))).toBe('Played for 4 seasons.');
    const tabs = [...el.querySelectorAll('#profile_tabs li')];
    expect(tabs.map((li) => li.getAttribute('data-value'))).toEqual([
      'summary',
      'faction_levels',
      'rank_history',
      'match_history',
    ]);
    expect(el.querySelector('#profile_tabs li.active')).toBeNull();
    expect(el.querySelector('.content-region')!.children).toHaveLength(0);
  });

  it("renders a buddy's header read-only, from the buddy's own portrait and rank", async () => {
    const buddy = new Backbone.Model({ username: 'bob', rank: 5, portrait_id: 9 });
    const el = await mount({ model: buddy, buddy: true, seasonCount: null });
    expect(el.querySelector('.change-portrait, .change-username, .season-count')).toBeNull();
    expect(el.querySelector('div.portrait.gold img')!.getAttribute('src')).toBe(
      'resources/profile_icons/9.png',
    );
    expect(text(el.querySelector('.username-content'))).toBe('bob');
  });

  it('dispatches tab and header events', async () => {
    const el = await mount();
    const tabs = captured(el, 'profile-tab');
    const portrait = captured(el, 'portrait-change');
    const username = captured(el, 'username-change');
    (el.querySelector('#profile_tabs li[data-value="rank_history"]') as HTMLElement).click();
    (el.querySelector('.change-portrait') as HTMLElement).click();
    (el.querySelector('.change-username') as HTMLElement).click();
    expect(tabs).toEqual([{ tab: 'rank_history' }]);
    expect(portrait).toHaveLength(1);
    expect(username).toHaveLength(1);
  });

  it('shows the loading and error views for the selected tab only', async () => {
    const el = await mount({ selectedTab: 'summary', content: { tab: 'summary', loading: true } });
    expect(el.querySelector('#profile_tabs li.active')!.getAttribute('data-value')).toBe('summary');
    expect(el.querySelector('.content-region > .loading-region > .loading')).not.toBeNull();

    el.content = { tab: 'summary', error: 'nope' };
    await el.updateComplete;
    expect(text(el.querySelector('.loading-region .error'))).toBe('ERROR: nope');

    // a late answer for a tab the player left renders nothing
    el.selectedTab = 'faction_levels';
    await el.updateComplete;
    expect(el.querySelector('.content-region')!.children).toHaveLength(0);
  });

  it('renders the summary boxes and ribbons', async () => {
    const el = await mount({
      selectedTab: 'summary',
      content: {
        tab: 'summary',
        data: summary({ currentSeasonLadderPositionModel: { ladder_position: 7 } }),
      },
    });
    const boxes = [...el.querySelectorAll('.profile-summary #summary_stats .summary-box')];
    expect(boxes).toHaveLength(3);
    expect(text(boxes[0].querySelector('h2.rank'))).toBe('Rank 25 - Bronze7');
    expect(boxes[0].querySelector('.badge.ladder-position')).not.toBeNull();
    expect(boxes[0].querySelector('img.division-medal')!.getAttribute('src')).toBe(
      'resources/season_rewards/season_rank_bronze.png',
    );
    expect(text(boxes[1].querySelector('h2.rank'))).toBe('Rank 10 - Gold');
    expect(boxes[2].querySelector('.gauntlet-run')!.classList.contains('disabled')).toBe(true);
    expect([...boxes[0].querySelectorAll('.stat .value')].map(text)).toEqual(['2', '5']);
    const ribbons = [...el.querySelectorAll('#ribbons .ribbons-list img')];
    expect(ribbons.map((img) => img.classList.contains('disabled'))).toEqual([true, false]);
  });

  it('renders faction levels, rank history and division stats', async () => {
    const el = await mount({
      selectedTab: 'faction_levels',
      content: {
        tab: 'faction_levels',
        data: {
          factionProgression: {
            1: {
              faction_id: 1,
              faction_name: 'Lyonar',
              level_for_user: 3,
              progress_percent: 40,
              next_reward_level: 4,
              next_reward_description: 'Faction Emote',
            },
          },
        },
      },
    });
    expect(text(el.querySelector('.faction-level h2.label'))).toBe('lvl 3 Lyonar');
    expect(text(el.querySelector('.faction-level .next-reward'))).toBe(
      'lvl 4 Reward: Faction Emote.',
    );
    expect((el.querySelector('.faction-level .progress-bar') as HTMLElement).style.width).toBe(
      '40%',
    );

    el.selectedTab = 'rank_history';
    el.content = {
      tab: 'rank_history',
      data: {
        rankHistory: [
          { rank: null, starting_at: Date.UTC(2026, 8, 1), win_count: 0 },
          { rank: 28, starting_at: Date.UTC(2026, 9, 1), win_count: 6 },
        ],
        divisionStats: { Gold: { count: 2 } },
      },
    };
    await el.updateComplete;
    const columns = [...el.querySelectorAll('#rank_history_chart .rank-history-column')];
    expect(columns.map((c) => text(c.querySelector('.month-label')))).toEqual([
      'September',
      'October',
    ]);
    expect(columns[0].querySelectorAll('ul.ticks li')).toHaveLength(0);
    expect(columns[1].querySelectorAll('ul.ticks li')).toHaveLength(3);
    expect(text(columns[1].querySelector('.win-count-label'))).toBe('6 Wins');
    const sums = [...el.querySelectorAll('#division_stats .division-sum')];
    expect(sums.map((s) => s.classList.contains('disabled'))).toEqual([
      true,
      true,
      false,
      true,
      true,
    ]);
  });

  it('renders match history rows and dispatches replay and paging events', async () => {
    const match = (id: string, attrs: Record<string, any> = {}) => ({
      game_id: id,
      user_id: 'u1',
      faction_id: 2,
      faction_name: 'Songhai',
      faction_dev_name: 'songhai',
      opponent_username: 'bob',
      game_type: 'boss battle',
      is_winner: true,
      created_at: Date.now(),
      replay_available: true,
      replay_shareble: true,
      ...attrs,
    });
    const el = await mount({
      selectedTab: 'match_history',
      content: {
        tab: 'match_history',
        data: {
          matchHistory: [match('g1'), match('g2', { is_winner: false, replay_shareble: false })],
        },
      },
    });
    const rows = [...el.querySelectorAll('#match_history_list tbody tr.match')];
    expect(rows).toHaveLength(2);
    expect(text(rows[0].children[3])).toBe('boss battle');
    expect(rows[0].querySelector('td.win')).not.toBeNull();
    expect(rows[1].querySelector('td.loss')).not.toBeNull();
    expect(rows[1].querySelector('.share-replay-button')).toBeNull();
    // offline: the replay buttons are dimmed
    expect(rows[0].querySelector('.replay-button')!.classList.contains('disabled')).toBe(true);
    // fewer than 10 rows: no next page
    expect((el.querySelector('#button_next_page') as HTMLElement).style.display).toBe('none');

    const watched = captured(el, 'replay-watch');
    const shared = captured(el, 'replay-share');
    const next = captured(el, 'match-history-next');
    (rows[0].querySelector('.replay-button') as HTMLElement).click();
    (rows[0].querySelector('.share-replay-button') as HTMLElement).click();
    (el.querySelector('#button_next_page') as HTMLElement).click();
    expect(watched).toEqual([{ gameId: 'g1', userId: 'u1' }]);
    expect(shared).toEqual([{ gameId: 'g1' }]);
    expect(next).toHaveLength(1);
  });

  it('re-renders the header when the profile model changes, and follows a swapped model', async () => {
    const first = ownProfile();
    const el = await mount({ model: first });
    first.set('username', 'alicia');
    first.set('presence', { rank: 5, portrait_id: 4 });
    await el.updateComplete;
    expect(text(el.querySelector('.username-content'))).toBe('alicia');
    expect(el.querySelector('.portrait.gold img')!.getAttribute('src')).toBe(
      'resources/profile_icons/4.png',
    );

    const second = ownProfile({ username: 'carol' });
    el.model = second;
    await el.updateComplete;
    expect(text(el.querySelector('.username-content'))).toBe('carol');
    first.set('username', 'ignored');
    await el.updateComplete;
    expect(text(el.querySelector('.username-content'))).toBe('carol');
  });

  it('stops listening to the model once removed', async () => {
    const model = ownProfile();
    const el = await mount({ model });
    expect(listenerCount(model)).toBeGreaterThan(0);
    el.remove();
    expect(listenerCount(model)).toBe(0);
  });
});
