import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import i18next from 'i18next';
import type { BuddySelection } from '../../../../apps/client/ui/components/buddies/buddy-selection';

const require = createRequire(import.meta.url);
const Backbone = require('backbone');

// initialise i18next before the component loads (§3.4)
let component: typeof import('../../../../apps/client/ui/components/buddies/buddy-selection');
let TAG: string;

const LOCALES = '../../../../apps/client/localization/locales/en';

const art = { generalPortrait: (id: any) => `resources/generals/${id}_hex.png` };

const Presence = Backbone.Model.extend({
  getStatus() {
    return this.get('status');
  },
});

function presence(attrs: Record<string, any> = {}) {
  const model = new Presence({ username: 'bob', status: 'online', ...attrs });
  model.userId = 'bob-id';
  return model;
}

function conversation(messages: Record<string, any>[] = []) {
  const model = new Backbone.Model({ userId: 'bob-id' });
  model.messages = new Backbone.Collection(messages);
  return model;
}

async function mount(props: Partial<BuddySelection> = {}) {
  const el = document.createElement(TAG) as BuddySelection;
  Object.assign(el, { art, model: presence(), myUserId: 'me-id', ...props });
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
const shown = (el: Element | null) => (el as HTMLElement).style.display !== 'none';

describe('<duelyst-buddy-selection>', () => {
  beforeAll(async () => {
    await i18next.init({
      lng: 'en',
      resources: {
        en: { translation: { buddy_list: require(`${LOCALES}/buddy_list.json`) } },
      },
    });
    component = await import('../../../../apps/client/ui/components/buddies/buddy-selection');
    TAG = component.TAG;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('registers once, under its tag', () => {
    expect(customElements.get(TAG)).toBe(component.BuddySelection);
  });

  it('renders the buddy header in light DOM, the element carrying the old root classes', async () => {
    const el = await mount({ canInvite: true });
    expect(el.shadowRoot).toBeNull();
    expect([...el.classList]).toEqual(['buddy', 'buddy-selection', 'online']);
    expect(text(el.querySelector('.buddy-profile .username-block'))).toBe('bob');
    expect(text(el.querySelector('.status-label'))).toBe('online');
    const invite = el.querySelector('.invite-buddy-to-game')!;
    expect(shown(invite)).toBe(true);
    expect(invite.classList.contains('disabled')).toBe(false);
    expect(invite.querySelector('img')!.getAttribute('src')).toBe('resources/ui/icon_invite.png');
    expect(shown(el.querySelector('.spectate-game'))).toBe(false);
    // no conversation until the shell has one
    expect(el.querySelector('.conversation-region')!.children).toHaveLength(0);
  });

  it('follows the presence model: status class, label and a swapped model', async () => {
    const model = presence();
    const el = await mount({ model });
    model.set({ status: 'game', username: 'bobby' });
    await el.updateComplete;
    expect([...el.classList]).toEqual(['buddy', 'buddy-selection', 'game']);
    expect(text(el.querySelector('.username-block'))).toBe('bobby');
    expect(text(el.querySelector('.status-label'))).toBe('game');

    const other = presence({ username: 'carol', status: 'away' });
    el.model = other;
    await el.updateComplete;
    expect(el.classList.contains('away')).toBe(true);
    expect(listenerCount(model)).toBe(0);
    other.set('username', 'caroline');
    await el.updateComplete;
    expect(text(el.querySelector('.username-block'))).toBe('caroline');
  });

  it('shows spectate in place of invite, and the disabled states the shell passes', async () => {
    const el = await mount({ showSpectate: true, canSpectate: false, canInvite: false });
    expect(shown(el.querySelector('.spectate-game'))).toBe(true);
    expect(el.querySelector('.spectate-game')!.classList.contains('disabled')).toBe(true);
    expect(shown(el.querySelector('.invite-buddy-to-game'))).toBe(false);
    el.canSpectate = true;
    await el.updateComplete;
    expect(el.querySelector('.spectate-game')!.classList.contains('disabled')).toBe(false);
  });

  it('dispatches the header button events', async () => {
    const el = await mount();
    const seen = ['buddy-profile', 'buddy-spectate', 'buddy-invite', 'buddy-remove'].map((n) =>
      captured(el, n),
    );
    for (const selector of [
      '.user-profile',
      '.spectate-game',
      '.invite-buddy-to-game',
      '.remove-buddy',
    ]) {
      (el.querySelector(selector) as HTMLElement).click();
    }
    expect(seen.map((s) => s.length)).toEqual([1, 1, 1, 1]);
  });

  it('renders the conversation and follows its messages', async () => {
    const chat = conversation([
      { fromId: 'bob-id', body: 'hi <b>there</b>' },
      { fromId: 'me-id', body: 'hello' },
    ]);
    const el = await mount({ conversation: chat, chatEnabled: true });
    const items = [
      ...el.querySelectorAll(
        '.conversation-region > .conversation > ul.messages-list > li.message',
      ),
    ];
    expect(items.map((li) => li.classList.contains('from-me'))).toEqual([false, true]);
    // a player's text is never parsed as markup
    expect(text(items[0].querySelector('.message-content'))).toBe('hi <b>there</b>');
    expect(items[0].querySelector('b')).toBeNull();
    expect(el.querySelector('.current-message')!.classList.contains('disabled')).toBe(false);

    chat.messages.add({ fromId: 'bob-id', body: 'replay', gameId: 'g1', generalId: 101 });
    await el.updateComplete;
    const replay = el.querySelectorAll('li.message')[2];
    expect(
      replay.querySelector('.game-info .faction-general.general-101')!.getAttribute('style'),
    ).toBe('background-image: url(resources/generals/101_hex.png)');
    const watched = captured(el, 'replay-watch');
    (replay.querySelector('.btn-watch-replay') as HTMLElement).click();
    expect(watched).toEqual([{ gameId: 'g1', userId: 'bob-id' }]);

    el.chatEnabled = false;
    await el.updateComplete;
    expect(el.querySelector('.current-message')!.classList.contains('disabled')).toBe(true);
  });

  it('sends on Enter and on the send button, never an empty message, and shares a replay', async () => {
    const el = await mount({ conversation: conversation(), chatEnabled: true });
    const sent = captured(el, 'message-send');
    const shared = captured(el, 'replay-share');
    const input = el.querySelector('.chat-input') as HTMLInputElement;

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    input.value = 'gg';
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);
    expect(input.value).toBe('');
    input.value = 'wp';
    (el.querySelector('.btn.send') as HTMLElement).click();
    expect(sent).toEqual([{ message: 'gg' }, { message: 'wp' }]);

    input.value = 'look';
    (el.querySelector('#share_replay') as HTMLElement).click();
    expect(shared).toEqual([{ message: 'look' }]);
    expect(input.value).toBe('look');
  });

  it('tears down: no listener left on the model or the messages', async () => {
    const model = presence();
    const chat = conversation();
    const el = await mount({ model, conversation: chat });
    expect(listenerCount(model)).toBeGreaterThan(0);
    expect(listenerCount(chat.messages)).toBeGreaterThan(0);
    el.remove();
    expect(listenerCount(model)).toBe(0);
    expect(listenerCount(chat.messages)).toBe(0);
  });
});
