import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import type { Notifications } from '../../../../apps/client/ui/components/notifications/notifications';

const require = createRequire(import.meta.url);
const Backbone = require('backbone');

let TAG: string;

const art = {
  generalPortrait: (id: any) => `resources/generals/${id}_hex.png`,
  myUserId: () => 'me',
};

function collection(list: Record<string, any>[] = []) {
  return new Backbone.Collection(list);
}

async function mount(props: Partial<Notifications> = {}) {
  const el = document.createElement(TAG) as Notifications;
  Object.assign(el, {
    art,
    main: collection([{ message: 'Hello' }, { message: 'Join me', ctaTitle: 'Accept' }]),
    messages: collection([
      { body: 'hi', fromId: 'buddy' },
      { body: 'look', fromId: 'me', gameId: 'g1', generalId: 1 },
    ]),
    quests: collection([
      {
        title: 'Win',
        quest_instructions: 'Win 2 games',
        progress: 1,
        params: { completionProgress: 2 },
      },
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

describe('<duelyst-notifications>', () => {
  beforeAll(async () => {
    ({ TAG } = await import('../../../../apps/client/ui/components/notifications/notifications'));
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the three regions with the composite roots the stylesheet selects on', async () => {
    const el = await mount({ main: collection(), messages: collection(), quests: collection() });
    for (const kind of ['main', 'message', 'quest']) {
      const region = el.querySelector(`#app-${kind}-notifications-region`)!;
      expect(region, kind).not.toBeNull();
      expect(
        region.querySelector(`:scope > #app-${kind}-notifications > .notifications`),
      ).not.toBeNull();
    }
    expect(el.querySelectorAll('.notification, .message')).toHaveLength(0);
  });

  it('renders main rows as the old item template did, with a CTA only when titled', async () => {
    const el = await mount();
    const rows = [...el.querySelectorAll('#app-main-notifications .notifications > .notification')];
    expect(rows).toHaveLength(2);
    expect(text(rows[0].querySelector('.clearfix > span.pull-left'))).toBe('Hello');
    expect(rows[0].querySelector('a.pull-right.dismiss > i.fa.fa-times')).not.toBeNull();
    expect(rows[0].querySelector('.cta-button')).toBeNull();
    expect(text(rows[1].querySelector('a.btn.pull-right.cta-button'))).toBe('Accept');
  });

  it('renders message bubbles, marks the player own and shows a shared replay', async () => {
    const el = await mount();
    const rows = [...el.querySelectorAll('#app-message-notifications .notifications > li.message')];
    expect(rows).toHaveLength(2);
    expect(rows[0].className).toBe('message');
    expect(rows[0].querySelector(':scope > .arrow')).not.toBeNull();
    expect(text(rows[0].querySelector('.message-content'))).toBe('hi');
    expect(rows[0].querySelector('.game-info')).toBeNull();
    expect(rows[1].classList.contains('from-me')).toBe(true);
    const general = rows[1].querySelector<HTMLElement>('.game-info .faction-general.general-1')!;
    expect(general.getAttribute('style')).toContain('resources/generals/1_hex');
    expect(text(rows[1].querySelector('.game-info button.btn-watch-replay'))).toBe('WATCH');
  });

  it('renders quest banners, with the default title', async () => {
    const quests = collection([
      {
        title: 'Win',
        quest_instructions: 'Win 2 games',
        progress: 1,
        params: { completionProgress: 2 },
      },
      { quest_instructions: 'Play', progress: 3, params: { completionProgress: 5 } },
    ]);
    const el = await mount({ quests });
    const rows = [
      ...el.querySelectorAll(
        '#app-quest-notifications .notifications > .notification.quest-notification',
      ),
    ];
    expect(rows).toHaveLength(2);
    expect(text(rows[0].querySelector('h2.title'))).toBe('Win');
    expect(text(rows[0].querySelector('p.instructions'))).toBe('Win 2 games');
    expect(text(rows[0].querySelector('.progress'))).toBe('1 / 2');
    expect(rows[0].querySelector('button.dismiss')).not.toBeNull();
    expect(text(rows[1].querySelector('h2.title'))).toBe('Daily Quest');
  });

  it('follows its collections and keeps the DOM node of a row that stays', async () => {
    const el = await mount();
    const main = el.main;
    const first = el.rowFor(main.first());
    main.add({ message: 'Third' });
    await el.updateComplete;
    expect(el.querySelectorAll('#app-main-notifications .notification')).toHaveLength(3);
    expect(el.rowFor(main.first())).toBe(first);
    main.remove(main.at(1));
    await el.updateComplete;
    expect(el.querySelectorAll('#app-main-notifications .notification')).toHaveLength(2);
    expect(el.rowFor(main.first())).toBe(first);
    el.quests.reset();
    await el.updateComplete;
    expect(el.querySelectorAll('.quest-notification')).toHaveLength(0);
  });

  it('emits dismiss, CTA, select and replay events with what the shell needs', async () => {
    const el = await mount();
    const dismissed = captured(el, 'notification-dismiss');
    const accepted = captured(el, 'notification-cta');
    const selected = captured(el, 'message-select');
    const watched = captured(el, 'replay-watch');

    el.rowFor(el.main.first())!.querySelector<HTMLElement>('.dismiss i')!.click();
    el.rowFor(el.main.at(1))!.querySelector<HTMLElement>('.cta-button')!.click();
    el.rowFor(el.quests.first())!.querySelector<HTMLElement>('.dismiss')!.click();
    el.rowFor(el.messages.first())!.querySelector<HTMLElement>('.message-content')!.click();
    el.rowFor(el.messages.at(1))!.querySelector<HTMLElement>('.btn-watch-replay')!.click();

    expect(dismissed).toEqual([{ cid: el.main.first().cid }, { cid: el.quests.first().cid }]);
    expect(accepted).toEqual([{ cid: el.main.at(1).cid }]);
    // WATCH does not also select the message
    expect(selected).toEqual([{ cid: el.messages.first().cid }]);
    expect(watched).toEqual([{ gameId: 'g1', userId: 'me' }]);
  });

  it('fades a row out and resolves, at once for a row it does not render', async () => {
    const el = await mount();
    const model = el.messages.first();
    await el.fadeOut(model, 0);
    expect(el.rowFor(model)!.style.display).toBe('none');
    await expect(el.fadeOut(new Backbone.Model(), 300)).resolves.toBeUndefined();
  });

  it('stops listening once removed', async () => {
    const el = await mount();
    const main = el.main;
    el.remove();
    let rendered = false;
    const original = el.requestUpdate.bind(el);
    el.requestUpdate = (...args: any[]) => {
      rendered = true;
      return original(...args);
    };
    main.add({ message: 'late' });
    expect(rendered).toBe(false);
  });
});
