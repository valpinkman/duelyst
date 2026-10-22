import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import i18next from 'i18next';
import type { QuestLog } from '../../../../apps/client/ui/components/quests/quest-log';

const require = createRequire(import.meta.url);
const Backbone = require('backbone');

// The SDK's card factories replace i18next.t with the identity when they load
// before i18next is initialised (packages/sdk/cards/factory/**), and the
// component pulls them in through QuestFactory. So: initialise first, then
// load the component.
let component: typeof import('../../../../apps/client/ui/components/quests/quest-log');
let QuestFactory: any;
let TAG: string;

const LOCALES = '../../../../apps/client/localization/locales/en';

// faction challenger quests: plain, replaceable, no gift chests
const QUEST_TYPE = 101;
const OTHER_QUEST_TYPE = 102;

function quest(id: string, attrs: Record<string, any> = {}) {
  return {
    id,
    quest_type_id: QUEST_TYPE,
    gold: 15,
    progress: 1,
    params: { completionProgress: 2 },
    is_replaceable: true,
    ...attrs,
  };
}

function mount(props: Partial<QuestLog> = {}) {
  const el = document.createElement(TAG) as QuestLog;
  Object.assign(el, {
    quests: new Backbone.Collection([quest('0'), quest('1')]),
    gameCounter: new Backbone.Model({ last_daily_win_at: 0 }),
    ...props,
  });
  document.body.appendChild(el);
  return el;
}

const items = (el: Element) => [...el.querySelectorAll('.daily-quests-region li.quest')];
const listenerCount = (obj: any) => Object.keys(obj._events || {}).length;

describe('<duelyst-quest-log>', () => {
  beforeAll(async () => {
    await i18next.init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            quests: require(`${LOCALES}/quests.json`),
            common: require(`${LOCALES}/common.json`),
          },
        },
      },
    });
    component = await import('../../../../apps/client/ui/components/quests/quest-log');
    TAG = component.TAG;
    QuestFactory = require('@duelyst/sdk/quests/questFactory');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('utcDayPassedSince: true with no timestamp, false within a day, true after one', () => {
    const day = 24 * 60 * 60 * 1000;
    expect(component.utcDayPassedSince(null)).toBe(true);
    expect(component.utcDayPassedSince(Date.now() - day / 2)).toBe(false);
    expect(component.utcDayPassedSince(Date.now() - day)).toBe(true);
  });

  it('registers once, under its tag', () => {
    expect(customElements.get(TAG)).toBe(component.QuestLog);
  });

  it('renders one row per quest from the SDK quest type, in light DOM', async () => {
    const el = mount();
    await el.updateComplete;
    expect(el.shadowRoot).toBeNull();
    expect(el.querySelector('.modal-dialog')).not.toBeNull();

    const rows = items(el);
    expect(rows).toHaveLength(2);
    const sdkQuest = QuestFactory.questForIdentifier(QUEST_TYPE);
    expect(rows[0].querySelector('.title')!.textContent!.trim()).toBe(sdkQuest.getName());
    expect(rows[0].querySelector('.gold-reward')!.textContent).toBe('15');
    expect(rows[0].querySelector('.progress')!.textContent!.replace(/\s+/g, ' ').trim()).toBe(
      '1 / 2',
    );
    expect(rows[0].classList.contains('animateIn')).toBe(true);
    const replace = rows[0].querySelector('button.replace') as HTMLButtonElement;
    expect(replace.disabled).toBe(false);
    expect(replace.textContent!.trim()).toBe('Replace');
    expect(el.querySelector('.no-quests-remaining')).toBeNull();
  });

  it('keeps all three section containers, so the :first-child padding rules still apply', async () => {
    const el = mount({ quests: new Backbone.Collection([]) });
    await el.updateComplete;
    const sections = el.querySelector('.quest-sections-container')!.children;
    expect([...sections].map((s) => s.className)).toEqual([
      'free-card-of-the-day-region quest-log-list',
      'daily-challenge-region quest-log-list',
      'daily-quests-region',
    ]);
  });

  it('shows the empty state for an empty collection, and leaves it when a quest arrives', async () => {
    const quests = new Backbone.Collection([]);
    const el = mount({ quests });
    await el.updateComplete;
    expect(el.querySelector('.no-quests-remaining h2')!.textContent).toBe(
      'You have completed all of your quests. Check back tomorrow!',
    );
    expect(el.querySelector('.replace-instructions')).toBeNull();

    quests.add(quest('0'));
    await el.updateComplete;
    expect(el.querySelector('.no-quests-remaining')).toBeNull();
    expect(items(el)).toHaveLength(1);
  });

  it('re-renders only the changed row: repeat() keeps the other nodes', async () => {
    const quests = new Backbone.Collection([quest('0'), quest('1')]);
    const el = mount({ quests });
    await el.updateComplete;
    const [first, second] = items(el);

    quests.get('1').set('progress', 2);
    await el.updateComplete;
    const after = items(el);
    expect(after[0]).toBe(first);
    expect(after[1]).toBe(second);
    expect(after[1].querySelector('.progress')!.textContent!.replace(/\s+/g, ' ').trim()).toBe(
      '2 / 2',
    );

    quests.remove('0');
    await el.updateComplete;
    expect(items(el)).toEqual([second]);
  });

  it('updates the header and footer live (D7)', async () => {
    const quests = new Backbone.Collection([quest('0', { is_replaceable: true })]);
    const el = mount({ quests });
    await el.updateComplete;
    expect(el.querySelector('.replace-instructions')).not.toBeNull();
    expect(el.querySelector('.modal-title')).not.toBeNull();

    quests.get('0').set('is_replaceable', false);
    await el.updateComplete;
    expect(el.querySelector('.replace-instructions')).toBeNull();
    expect(el.querySelector('.modal-title')).toBeNull();
    expect(el.querySelector('.modal-content')!.classList.contains('starter-only')).toBe(true);
  });

  it('disables replace for a quest mulliganed today', async () => {
    const el = mount({
      quests: new Backbone.Collection([quest('0', { mulliganed_at: Date.now() })]),
    });
    await el.updateComplete;
    const replace = el.querySelector('button.replace') as HTMLButtonElement;
    expect(replace.disabled).toBe(true);
    expect(replace.textContent!.trim()).toBe('');
  });

  it('asks for a replace with an event, greys the quest, and restores it on change', async () => {
    const quests = new Backbone.Collection([quest('0'), quest('1')]);
    const el = mount({ quests });
    await el.updateComplete;
    const requests: any[] = [];
    el.addEventListener('quest-replace', (e: any) => requests.push(e.detail));

    (items(el)[1].querySelector('button.replace') as HTMLButtonElement).click();
    await el.updateComplete;
    expect(requests.map((r) => r.id)).toEqual(['1']);
    expect(items(el)[1].classList.contains('replacing')).toBe(true);
    expect(items(el)[1].classList.contains('animateIn')).toBe(false);

    // the replacement quest arrives as a change on the same id
    quests.get('1').set({ quest_type_id: OTHER_QUEST_TYPE, mulliganed_at: Date.now() });
    await el.updateComplete;
    expect(items(el)[1].classList.contains('replacing')).toBe(false);
    expect(items(el)[1].classList.contains('animateIn')).toBe(true);
  });

  it('restores the quest when the request settles with no change: 304 or error (D8)', async () => {
    const el = mount();
    await el.updateComplete;
    let request: any;
    el.addEventListener('quest-replace', (e: any) => (request = e.detail));

    (items(el)[0].querySelector('button.replace') as HTMLButtonElement).click();
    await el.updateComplete;
    expect(items(el)[0].classList.contains('replacing')).toBe(true);

    request.done();
    await el.updateComplete;
    expect(items(el)[0].classList.contains('replacing')).toBe(false);
  });

  it('shows the free card when allowed, and claims it once with an event', async () => {
    const el = mount({ canSeeFreeCard: true, freeCardAvailable: true });
    await el.updateComplete;
    const card = el.querySelector('.free-card-of-the-day-region li.free-card-of-the-day')!;
    expect(card.classList.contains('animateInShake')).toBe(true);
    expect(card.querySelector('.card-reward img')!.getAttribute('src')).toBe(
      'resources/free_card_of_the_day/random_core_gem.png',
    );
    let claims = 0;
    el.addEventListener('free-card-claim', () => (claims += 1));

    const button = card.querySelector('button.claim-card') as HTMLButtonElement;
    button.click();
    await el.updateComplete;
    expect(claims).toBe(1);
    expect(button.disabled).toBe(true);
  });

  it('counts down to the next free card when it is already claimed', async () => {
    const el = mount({ canSeeFreeCard: true, freeCardAvailable: false });
    await el.updateComplete;
    const card = el.querySelector('li.free-card-of-the-day')!;
    expect(card.classList.contains('animateIn')).toBe(true);
    expect((card.querySelector('button.claim-card') as HTMLButtonElement).disabled).toBe(true);
    expect(card.querySelector('.instructions')!.textContent!.trim()).toMatch(
      /^Available in: .*\d+s$/,
    );
  });

  it('hides the free card when the player cannot see it yet', async () => {
    const el = mount({ canSeeFreeCard: false });
    await el.updateComplete;
    expect(el.querySelector('li.free-card-of-the-day')).toBeNull();
  });

  it('switches the first win from countdown to active as the game counter changes', async () => {
    const gameCounter = new Backbone.Model({ last_daily_win_at: Date.now() });
    const el = mount({ canSeeFirstWin: true, gameCounter });
    await el.updateComplete;
    expect(el.querySelector('.first-win-of-the-day-countdown span')!.textContent).toMatch(
      /Hours? .*Seconds?/,
    );

    gameCounter.set('last_daily_win_at', 0);
    await el.updateComplete;
    expect(el.querySelector('.first-win-of-the-day-countdown')).toBeNull();
    expect(el.querySelector('.first-win-of-the-day-available')!.textContent!.trim()).toBe(
      'First Win of the Day (+20 Gold): ACTIVE',
    );
  });

  it('ticks its countdowns once a second', async () => {
    vi.useFakeTimers();
    const el = mount();
    await el.updateComplete;
    const rollover = () => el.querySelector('.rollover-countdown')!.textContent;
    const before = rollover();
    expect(before).toMatch(/^New Quests in: /);

    vi.advanceTimersByTime(1000);
    await el.updateComplete;
    expect(rollover()).not.toBe(before);
  });

  it('shows the confirm button only when asked to', async () => {
    const el = mount({ showConfirm: false });
    await el.updateComplete;
    const confirm = () => el.querySelector('.modal-footer .btn-user-cancel')!;
    expect(confirm().classList.contains('hide')).toBe(true);
    el.showConfirm = true;
    await el.updateComplete;
    expect(confirm().classList.contains('hide')).toBe(false);
  });

  it('follows a swapped collection', async () => {
    const first = new Backbone.Collection([quest('0')]);
    const second = new Backbone.Collection([quest('7'), quest('8'), quest('9')]);
    const el = mount({ quests: first });
    await el.updateComplete;

    el.quests = second;
    await el.updateComplete;
    expect(items(el)).toHaveLength(3);
    expect(listenerCount(first)).toBe(0);

    second.remove('9');
    await el.updateComplete;
    expect(items(el)).toHaveLength(2);
  });

  it('leaves no Backbone listener and no timer behind when removed', async () => {
    vi.useFakeTimers();
    const quests = new Backbone.Collection([quest('0')]);
    const gameCounter = new Backbone.Model({ last_daily_win_at: 0 });
    const el = mount({ quests, gameCounter });
    await el.updateComplete;
    // one callback per followed event: add remove reset change sort, and change
    expect(listenerCount(quests)).toBe(5);
    expect(listenerCount(gameCounter)).toBe(1);
    expect(vi.getTimerCount()).toBe(1);

    el.remove();
    expect(listenerCount(quests)).toBe(0);
    expect(listenerCount(gameCounter)).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
