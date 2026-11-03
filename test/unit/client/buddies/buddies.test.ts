import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import i18next from 'i18next';
import type { Buddies } from '../../../../apps/client/ui/components/buddies/buddies';

const require = createRequire(import.meta.url);
const Backbone = require('backbone');

// initialise i18next before the component loads (§3.4)
let component: typeof import('../../../../apps/client/ui/components/buddies/buddies');
let TAG: string;

const LOCALES = '../../../../apps/client/localization/locales/en';

const art = {
  profileIcon: (id: any) => `resources/profile_icons/${id}.png`,
  divisionClass: (rank: number) => (rank > 10 ? 'Bronze' : 'Gold'),
};

const Presence = Backbone.Model.extend({
  getStatus() {
    return this.get('status');
  },
});

function presence(list: Record<string, any>[]) {
  const collection = new Backbone.Collection([], { model: Presence });
  for (const attrs of list) {
    const model = new Presence({ status: 'online', portrait_id: 1, ...attrs });
    model.userId = attrs.username + '-id';
    collection.add(model);
  }
  return collection;
}

async function mount(props: Partial<Buddies> = {}) {
  const el = document.createElement(TAG) as Buddies;
  Object.assign(el, {
    art,
    presence: presence([
      { username: 'Alice', rank: 5 },
      { username: 'bob', status: 'offline' },
    ]),
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

const text = (el: Element | null) => (el ? el.textContent!.replace(/\s+/g, ' ').trim() : null);
const rows = (el: Element) => [...el.querySelectorAll('.buddy-list-items .buddy-preview')];

describe('<duelyst-buddies>', () => {
  beforeAll(async () => {
    await i18next.init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            buddy_list: require(`${LOCALES}/buddy_list.json`),
            common: require(`${LOCALES}/common.json`),
          },
        },
      },
    });
    component = await import('../../../../apps/client/ui/components/buddies/buddies');
    TAG = component.TAG;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('registers once, under its tag', () => {
    expect(customElements.get(TAG)).toBe(component.Buddies);
  });

  it('renders the old layout in light DOM: list, selection region and its host', async () => {
    const el = await mount();
    expect(el.shadowRoot).toBeNull();
    expect(el.querySelector('.modal-dialog .btn-user-cancel')).not.toBeNull();
    expect(el.querySelector('.buddy-list-region .buddy-list .buddy-controls')).not.toBeNull();
    expect(el.querySelector('.buddy-selection-region .buddy-selection-host')).not.toBeNull();
    expect(el.querySelector('.buddy-selection-host')!.childNodes).toHaveLength(0);
  });

  it('renders one row per buddy with status, division, rank and portrait', async () => {
    const el = await mount();
    const [alice, bob] = rows(el);
    expect([...alice.classList]).toEqual(['buddy', 'buddy-preview', 'online', 'gold']);
    expect([...bob.classList]).toEqual(['buddy', 'buddy-preview', 'offline']);
    expect(text(alice.querySelector('.username-block'))).toBe('Alice');
    expect(text(alice.querySelector('.status-label'))).toBe('online');
    expect(text(alice.querySelector('.rank'))).toBe('5');
    expect(text(bob.querySelector('.rank'))).toBe('?');
    expect(alice.querySelector('.portrait')!.getAttribute('src')).toContain('profile_icons/1');
    // the old pooled rows' absolute offsets, 65px apart
    expect((alice as HTMLElement).style.transform).toBe('translateY(0px)');
    expect((bob as HTMLElement).style.transform).toBe('translateY(65px)');
    expect((el.querySelector('.buddy-list-items') as HTMLElement).style.height).toBe('130px');
  });

  it('follows the collection: active, unread, sort and removal re-render', async () => {
    const el = await mount();
    const coll = el.presence;
    coll.at(1).set({ _active: true });
    coll.at(0).set({ _unread: true });
    await el.updateComplete;
    expect(rows(el)[0].classList.contains('unread')).toBe(true);
    expect(rows(el)[1].classList.contains('active')).toBe(true);
    coll.remove(coll.at(0));
    await el.updateComplete;
    expect(rows(el).map((r) => text(r.querySelector('.username-block')))).toEqual(['bob']);
  });

  it('filters on search: the lowercased name against the query as typed', async () => {
    const el = await mount();
    const search = el.querySelector<HTMLInputElement>("input[type='search']")!;
    search.value = 'ali';
    search.dispatchEvent(new KeyboardEvent('keyup'));
    await el.updateComplete;
    expect(rows(el).map((r) => text(r.querySelector('.username-block')))).toEqual(['Alice']);
    search.value = 'Ali';
    search.dispatchEvent(new KeyboardEvent('keyup'));
    await el.updateComplete;
    expect(rows(el)).toHaveLength(0);
  });

  it('emits buddy-select with the clicked buddy', async () => {
    const el = await mount();
    const seen = captured(el, 'buddy-select');
    (rows(el)[1] as HTMLElement).click();
    expect(seen).toEqual([{ userId: 'bob-id' }]);
  });

  it('shows do-not-disturb and the last opponent from its properties', async () => {
    const el = await mount({
      doNotDisturb: true,
      lastOpponentName: 'carol',
      showLastOpponent: true,
    });
    expect(el.querySelector('.do-not-disturb')!.classList.contains('active')).toBe(true);
    const lastPlayed = el.querySelector('.last-played')!;
    expect([...lastPlayed.classList]).toEqual(['last-played', 'active']);
    expect(text(lastPlayed.querySelector('.username'))).toBe('carol');
    const dnd = captured(el, 'do-not-disturb');
    const add = captured(el, 'last-opponent-add');
    (el.querySelector('.do-not-disturb') as HTMLElement).click();
    (el.querySelector('.btn-add-last-played') as HTMLElement).click();
    expect(dnd).toHaveLength(1);
    expect(add).toHaveLength(1);
    el.lastOpponentInviteSent = true;
    await el.updateComplete;
    expect(lastPlayed.classList.contains('invite-sent')).toBe(true);
  });

  it('adds a buddy through the prompt, shows the result, then resets', async () => {
    vi.useFakeTimers();
    const el = await mount();
    const prompt = el.querySelector<HTMLElement>('.add-buddy-prompt')!;
    expect(prompt.style.display).toBe('');
    (el.querySelector('.add-buddy') as HTMLElement).click();
    await el.updateComplete;
    expect(prompt.style.display).toBe('block');

    const seen = captured(el, 'buddy-add');
    const input = el.querySelector<HTMLInputElement>('.add-buddy-input')!;
    input.value = '  dave ';
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
    // a second submit while the first is out does nothing
    (el.querySelector('.add-buddy-submit') as HTMLElement).click();
    expect(seen).toEqual([{ username: 'dave' }]);

    el.addBuddyFailed('User not found!');
    await el.updateComplete;
    const submit = el.querySelector('.add-buddy-submit')!;
    expect(submit.classList.contains('fail')).toBe(true);
    expect(input.classList.contains('fail')).toBe(true);
    expect(text(submit)).toBe('User not found!');

    vi.advanceTimersByTime(1000);
    await el.updateComplete;
    expect(submit.classList.contains('fail')).toBe(false);
    expect(text(submit)).toBe(i18next.t('buddy_list.action_add_buddy'));
    // a failure keeps the name
    expect(input.value).toBe('  dave ');
    // then fades out and closes
    expect(prompt.style.display).toBe('block');
    vi.advanceTimersByTime(400);
    await el.updateComplete;
    expect(prompt.style.display).toBe('');
  });

  it('clears the name after a sent request', async () => {
    vi.useFakeTimers();
    const el = await mount();
    (el.querySelector('.add-buddy') as HTMLElement).click();
    await el.updateComplete;
    const input = el.querySelector<HTMLInputElement>('.add-buddy-input')!;
    input.value = 'dave';
    (el.querySelector('.add-buddy-submit') as HTMLElement).click();
    el.addBuddyDone();
    await el.updateComplete;
    expect(text(el.querySelector('.add-buddy-submit'))).toBe('Friend request sent!');
    vi.advanceTimersByTime(1000);
    await el.updateComplete;
    expect(input.value).toBe('');
  });

  it('dims the add-buddy controls until they take focus', async () => {
    const el = await mount({ controlsDimmed: true });
    const groups = [...el.querySelectorAll<HTMLElement>('.buddies-controls')];
    expect(groups.map((g) => g.style.opacity)).toEqual(['0.5', '0.5']);
    groups[0].querySelector('input')!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await el.updateComplete;
    expect(groups.map((g) => g.style.opacity)).toEqual(['', '']);
  });

  it('shows the referral callout until told not to, the redeem button only when allowed', async () => {
    const el = await mount();
    const redeem = el.querySelector('#claim_referral_code')!;
    expect(redeem.classList.contains('hide')).toBe(true);
    const open = captured(el, 'referral-open');
    const claim = captured(el, 'referral-redeem');
    (el.querySelector('#open_referral_program') as HTMLElement).click();
    (redeem as HTMLElement).click();
    expect(open).toHaveLength(1);
    expect(claim).toHaveLength(1);
    el.canRedeemReferral = true;
    await el.updateComplete;
    expect(el.querySelector('#claim_referral_code')!.classList.contains('hide')).toBe(false);
    el.showCallout = false;
    await el.updateComplete;
    expect(el.querySelector('.buddy-selection-empty')).toBeNull();
    expect(el.querySelector('.buddy-selection-host')).not.toBeNull();
  });

  it('leaves what the shell puts in the selection host alone across re-renders', async () => {
    const el = await mount();
    const child = document.createElement('div');
    child.className = 'buddy-selection-shell';
    el.querySelector('.buddy-selection-host')!.appendChild(child);
    el.showCallout = false;
    el.presence.at(0).set('status', 'game');
    await el.updateComplete;
    expect(el.querySelector('.buddy-selection-host .buddy-selection-shell')).toBe(child);
  });

  it('drops its collection listeners when removed', async () => {
    const el = await mount();
    const coll = el.presence;
    expect(Object.keys(coll._events || {}).length).toBeGreaterThan(0);
    el.remove();
    expect(
      Object.keys(coll._events || {}).filter((k) => k !== 'all' && coll._events[k].length),
    ).toEqual([]);
  });
});
