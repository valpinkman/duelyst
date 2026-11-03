import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import i18next from 'i18next';
import type { RiftRunPanel, RiftRuns } from '../../../../apps/client/ui/components/rift/rift-runs';

const require = createRequire(import.meta.url);

// initialise i18next before the component loads (§3.4)
let component: typeof import('../../../../apps/client/ui/components/rift/rift-runs');
let TAG: string;

const LOCALES = '../../../../apps/client/localization/locales/en';

function run(id: string, attrs: Partial<RiftRunPanel> = {}): RiftRunPanel {
  return {
    id,
    name: `Run ${id}`,
    faction_id: 2,
    portrait: 'resources/general_portrait_hex.png',
    rift_level: 3,
    rift_rating: 400,
    rift_points_so_far: 5,
    level_up_points_required: 20,
    progress_percent: 25,
    ...attrs,
  };
}

async function mount(props: Partial<RiftRuns> = {}) {
  const el = document.createElement(TAG) as RiftRuns;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  const carousel = el.querySelector<any>('duelyst-sliding-panel-select');
  if (carousel) await carousel.updateComplete;
  return el;
}

function captured(el: Element, name: string) {
  const seen: any[] = [];
  el.addEventListener(name, (e) => seen.push((e as CustomEvent).detail));
  return seen;
}

const panels = (el: Element) => [...el.querySelectorAll<HTMLElement>('li.rift-run-deck')];
const hidden = (el: Element, selector: string) =>
  el.querySelector(selector)!.classList.contains('hide');

describe('<duelyst-rift-runs>', () => {
  beforeAll(async () => {
    await i18next.init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            rift: require(`${LOCALES}/rift.json`),
            common: require(`${LOCALES}/common.json`),
          },
        },
      },
    });
    component = await import('../../../../apps/client/ui/components/rift/rift-runs');
    TAG = component.TAG;
  });

  beforeEach(() => {
    // happy-dom has no Web Animations: the carousel's show animations are stubbed
    vi.spyOn(HTMLElement.prototype, 'animate').mockImplementation(
      () =>
        ({
          cancel: vi.fn(),
          finish: vi.fn(),
          pause: vi.fn(),
          onfinish: null,
          currentTime: 0,
        }) as unknown as Animation,
    );
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('registers once, under its tag', () => {
    expect(customElements.get(TAG)).toBe(component.RiftRuns);
  });

  it('renders nothing until the runs are in, then the old composite markup', async () => {
    const el = await mount({ runs: [run('a')] });
    expect(el.shadowRoot).toBeNull();
    expect(el.childElementCount).toBe(0);

    el.ready = true;
    await el.updateComplete;
    const carousel = el.querySelector<any>('duelyst-sliding-panel-select.rift-runs')!;
    await carousel.updateComplete;
    expect(carousel.classList.contains('sliding-panel-select')).toBe(true);
    expect(carousel.slidingPanelsStack).toBe(false);
    expect(carousel.querySelector('.sliding-panel-select-header > h1').textContent).toBe(
      'The Rift',
    );
    expect(carousel.querySelector('ul.choices.rift-runs-list')).not.toBeNull();
  });

  it('renders a panel per run: faction, portrait, level, rating and XP bar', async () => {
    const el = await mount({
      ready: true,
      runs: [run('a'), run('b', { faction_id: null, rift_level: 7, progress_percent: 50 })],
    });
    const [first, second] = panels(el);
    expect(panels(el)).toHaveLength(2);
    expect(first.className).toBe('sliding-panel deck-preview rift-run-deck f2');
    // every run is selectable, as rift_run_deck's getIsEnabled had it
    expect(first.classList.contains('disabled')).toBe(false);
    expect(first.querySelector('.deck-name')!.textContent).toBe('Run a');
    expect(first.querySelector('.level')!.textContent).toBe('LEVEL: 3');
    expect(first.querySelector('.rating')!.textContent!.trim()).toBe('RATING: 400');
    expect(first.querySelector('.progress-data')!.textContent!.trim()).toBe('5 / 20');
    expect(first.querySelector('.complete')!.getAttribute('style')).toBe('width:25%');
    expect(first.querySelector('.faction-portrait')!.getAttribute('style')).toContain(
      'general_portrait_hex',
    );
    expect(first.querySelectorAll('.faction-crest-bubble')).toHaveLength(3);
    // no faction: no crest and no portrait
    expect(second.querySelector('.faction-crest')).toBeNull();
    expect(second.querySelector('.faction-portrait')).toBeNull();
    expect(second.querySelector('.level')!.textContent).toBe('LEVEL: 7');
  });

  it('shows the empty view when there is no run', async () => {
    const el = await mount({ ready: true, runs: [] });
    expect(panels(el)).toHaveLength(0);
    const empty = el.querySelector('ul.choices > li > .rift-runs-empty-view')!;
    expect(empty.querySelector('h1')!.textContent).toContain('In Rift Mode');
    expect(empty.querySelectorAll('p')).toHaveLength(4);
  });

  it('hides both start options until the shell picks one', async () => {
    const el = await mount({ ready: true });
    expect(hidden(el, '#start_new_run_container_buy')).toBe(true);
    expect(hidden(el, '#start_new_run_container_existing')).toBe(true);
    expect(el.querySelector('.stored-upgrades-label')).toBeNull();
  });

  it('shows the start button for a ticket or the free run', async () => {
    const el = await mount({ ready: true, startMode: 'existing' });
    expect(hidden(el, '#start_new_run_container_buy')).toBe(true);
    expect(hidden(el, '#start_new_run_container_existing')).toBe(false);
    expect(el.querySelector('#start_new_run_button_with_existing')!.textContent!.trim()).toBe(
      'Start Run',
    );
  });

  it('shows the purchases otherwise, gold disabled when the wallet is short', async () => {
    const el = await mount({ ready: true, startMode: 'buy', goldDisabled: true });
    expect(hidden(el, '#start_new_run_container_buy')).toBe(false);
    expect(hidden(el, '#start_new_run_container_existing')).toBe(true);
    const gold = el.querySelector('#start_new_run_button_with_gold')!;
    expect(gold.classList.contains('disabled')).toBe(true);
    expect(gold.textContent!.replace(/\s+/g, ' ').trim()).toBe('150 Gold');
    expect(el.querySelector('#start_new_run_button_with_currency')!.innerHTML).toContain(
      '<strong>199</strong> Diamonds',
    );

    el.goldDisabled = false;
    await el.updateComplete;
    await el.querySelector<any>('duelyst-sliding-panel-select').updateComplete;
    expect(gold.classList.contains('disabled')).toBe(false);
  });

  it('labels stored upgrades when the profile has some', async () => {
    const el = await mount({ ready: true, storedUpgradeCount: 4 });
    // the same call the template made: the key's placeholder is a different name
    expect(el.querySelector('.stored-upgrades-label')!.textContent).toBe(
      i18next.t('rift.stored_upgrade_count_label', { storedUpgradeCount: 4 }),
    );
  });

  it('turns a panel click into rift-runs-select, and keeps the carousel event in', async () => {
    const el = await mount({ ready: true, runs: [run('a'), run('b')] });
    const selected = captured(el, 'rift-runs-select');
    const leaked: any[] = [];
    document.body.addEventListener('panel-select', (e) => leaked.push(e));
    panels(el)[1].click();
    expect(selected).toEqual([{ id: 'b' }]);
    expect(leaked).toEqual([]);
  });

  it('lets panel-hover bubble for the shell', async () => {
    const el = await mount({ ready: true, runs: [run('a')] });
    const hovered = captured(el, 'panel-hover');
    panels(el)[0].dispatchEvent(new MouseEvent('mouseenter'));
    expect(hovered).toHaveLength(1);
  });

  it('turns each start button into rift-runs-start', async () => {
    const el = await mount({ ready: true, startMode: 'buy' });
    const started = captured(el, 'rift-runs-start');
    el.querySelector<HTMLElement>('#start_new_run_button_with_gold')!.click();
    el.querySelector<HTMLElement>('#start_new_run_button_with_currency')!.click();
    el.querySelector<HTMLElement>('#start_new_run_button_with_existing')!.click();
    expect(started).toEqual([{ with: 'gold' }, { with: 'currency' }, { with: 'existing' }]);
  });

  it('tears down with its carousel: no EventBus listener left', async () => {
    const EventBus = ((await import('@duelyst/common/eventbus')) as any).default;
    const EVENTS = ((await import('@duelyst/common/event_types')) as any).default;
    const count = () => (EventBus.getInstance()._events[EVENTS.pointer_wheel] || []).length;
    const before = count();
    const el = await mount({ ready: true, runs: [run('a')] });
    expect(count()).toBe(before + 1);
    el.remove();
    expect(count()).toBe(before);
  });
});
