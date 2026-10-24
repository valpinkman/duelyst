import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { html } from 'lit';
import type {
  Box,
  PanelItem,
  SlidingPanelSelect,
} from '../../../../apps/client/ui/components/carousel/sliding-panel-select';

// the component's own module instances: a createRequire() copy would be a
// second EventBus nobody listens to
let EventBus: any;
let EVENTS: any;

let component: typeof import('../../../../apps/client/ui/components/carousel/sliding-panel-select');
let TAG: string;

// happy-dom does no layout, so the carousel's measure() is replaced: the list
// is LIST px wide, the body BODY px high, and every panel PANEL x PANEL_H with
// its margins
const LIST = 1000;
const BODY = 500;
const PANEL = 200;
const PANEL_H = 400;

function box(width: number, height: number): Box {
  return {
    width,
    height,
    innerWidth: width,
    innerHeight: height,
    outerWidth: width,
    outerHeight: height,
  };
}

function fakeMeasure(this: SlidingPanelSelect, el: Element | null): Box {
  if (el == null) return box(0, 0);
  if (el.matches('.sliding-panel-select-body')) return box(LIST, BODY);
  if (el.matches('.sliding-panel-select-choices, .choices')) return box(LIST, BODY);
  if (el.matches('li')) return box(PANEL, PANEL_H);
  return box(0, 0);
}

// Web Animations stub: each call is recorded with its target and frames
interface FakeAnimation {
  target: Element;
  keyframes: any;
  options: any;
  currentTime: number | null;
  onfinish: ((e?: any) => void) | null;
  cancel: ReturnType<typeof vi.fn>;
  finish: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
}
let animations: FakeAnimation[];

const items = (n: number, attrs: (i: number) => Partial<PanelItem> = () => ({})): PanelItem[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Panel ${i}`, ...attrs(i) }));

// a show animation that only records where each panel was played in
let shown: { el: HTMLElement; x: number; y: number; delay: number }[];
function recordShow(el: HTMLElement, _duration: number, delay: number, x: number, y: number) {
  shown.push({ el, x, y, delay });
  return el.animate([], { duration: 1 });
}

async function mount(props: Partial<SlidingPanelSelect> = {}) {
  const el = document.createElement(TAG) as SlidingPanelSelect;
  Object.assign(el, {
    heading: 'Pick one',
    renderPanel: (item: PanelItem) => html`<div class="name">${item.name}</div>`,
    slidingPanelShowAnimation: recordShow,
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

const panels = (el: Element) => [...el.querySelectorAll<HTMLElement>('ul.choices > li')];
const finishShow = () => {
  for (const a of animations.filter((a) => a.options.duration === 1)) a.onfinish?.();
};
const listenerCount = (name: string) => (EventBus.getInstance()._events[name] || []).length;

describe('<duelyst-sliding-panel-select>', () => {
  beforeAll(async () => {
    EventBus = (await import('@duelyst/common/eventbus')).default;
    EVENTS = (await import('@duelyst/common/event_types')).default;
    component = await import('../../../../apps/client/ui/components/carousel/sliding-panel-select');
    TAG = component.TAG;
  });

  beforeEach(() => {
    animations = [];
    shown = [];
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.spyOn(component.SlidingPanelSelect.prototype, 'measure').mockImplementation(fakeMeasure);
    vi.spyOn(HTMLElement.prototype, 'animate').mockImplementation(function (
      this: HTMLElement,
      keyframes: any,
      options: any,
    ) {
      const animation: FakeAnimation = {
        target: this,
        keyframes,
        options: typeof options === 'number' ? { duration: options } : options,
        currentTime: 0,
        onfinish: null,
        cancel: vi.fn(),
        finish: vi.fn(),
        pause: vi.fn(),
      };
      animations.push(animation);
      return animation as unknown as Animation;
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('registers once, under its tag', () => {
    expect(customElements.get(TAG)).toBe(component.SlidingPanelSelect);
  });

  it('renders the old composite markup in light DOM, one panel per item', async () => {
    const el = await mount({
      items: items(3, (i) => ({ enabled: i !== 1 })),
      panelClass: () => 'codex-chapter-preview',
    });
    expect(el.shadowRoot).toBeNull();
    expect(el.classList.contains('sliding-panel-select')).toBe(true);
    expect(el.querySelector('.sliding-panel-select-title')!.textContent).toBe('Pick one');
    expect(el.querySelector('.sliding-panel-select-choices > .previous-page')).not.toBeNull();
    expect(el.querySelector('.sliding-panel-select-choices > .next-page')).not.toBeNull();
    expect(panels(el).map((li) => li.className)).toEqual([
      'sliding-panel codex-chapter-preview',
      'sliding-panel codex-chapter-preview disabled',
      'sliding-panel codex-chapter-preview',
    ]);
    expect(panels(el).map((li) => li.querySelector('.name')!.textContent)).toEqual([
      'Panel 0',
      'Panel 1',
      'Panel 2',
    ]);
  });

  it('shrinks the list around panels that fit, and plays them in staggered', async () => {
    const el = await mount({ items: items(3), slidingPanelsStack: false });
    // 3 x 200 in a 1000 list: the list takes 600 and the body's flexbox
    // centres it
    expect(shown.map((s) => s.x)).toEqual([0, 200, 400]);
    expect(shown[0].delay).toBe(150);
    expect(shown[1].delay).toBeGreaterThanOrEqual(250);
    const container = el.querySelector<HTMLElement>('.sliding-panel-select-choices')!;
    expect(container.style.width).toBe('600px');
    // flex: none (happy-dom expands the shorthand)
    expect(container.style.flex).toMatch(/^(none|0 0 auto)$/);
    finishShow();
    expect(el.classList.contains('slides')).toBe(false);
    expect(el.slideState.range).toBe(0);
  });

  it('stacks panels in rows when they fit and stacking is on', async () => {
    // 6 panels, 5 per row, 1 row of 400 in a 500 body: 5 per row stays
    await mount({ items: items(6) });
    expect(shown.map((s) => s.x).slice(0, 2)).toEqual([0, 200]);
  });

  it('slides when the panels do not fit, and pages with the arrows', async () => {
    const el = await mount({ items: items(10), slidingPanelsStack: false });
    finishShow();
    // 10 x 200 in a 1000 list
    expect(el.slideState.range).toBe(1000);
    expect(el.slideState.pageWidth).toBe(1000);
    expect(el.classList.contains('slides')).toBe(true);
    expect(el.classList.contains('slide-start')).toBe(true);
    // the scrub animations: one paused per panel
    const scrubs = animations.filter(
      (a) => a.pause.mock.calls.length > 0 && a.cancel.mock.calls.length === 0,
    );
    expect(scrubs).toHaveLength(10);

    el.querySelector<HTMLElement>('.next-page')!.click();
    vi.setSystemTime(Date.now() + 10_000);
    // run one frame of the loop by hand
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(el.slideState.offsetX).toBe(-1000);
    expect(el.classList.contains('slide-end')).toBe(true);
    expect(scrubs[0].currentTime).toBe(1);
  });

  it('slides on the wheel, from the EventBus', async () => {
    const el = await mount({ items: items(10), slidingPanelsStack: false });
    finishShow();
    EventBus.getInstance().trigger(EVENTS.pointer_wheel, {
      getWheelDeltaX: () => 0,
      getWheelDeltaY: () => 120,
    });
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(el.slideState.offsetX).toBeLessThan(0);
  });

  it('selects an enabled panel on click, and says when the pointer enters one', async () => {
    const el = await mount({ items: items(3, (i) => ({ enabled: i !== 1 })) });
    const selected = captured(el, 'panel-select');
    const hovered = captured(el, 'panel-hover');
    panels(el)[1].click();
    panels(el)[2].click();
    panels(el)[0].dispatchEvent(new MouseEvent('mouseenter'));
    expect(selected.map((d) => d.item.id)).toEqual(['p2']);
    expect(hovered.map((d) => d.item.id)).toEqual(['p0']);
    // not sticky: nothing stays active
    await el.updateComplete;
    expect(el.querySelector('li.active')).toBeNull();
  });

  it('keeps a sticky selection until the same panel is clicked again', async () => {
    const el = await mount({ items: items(3), slidingPanelsStickySelection: true });
    const selected = captured(el, 'panel-select');
    const deselected = captured(el, 'panel-deselect');
    panels(el)[0].click();
    await el.updateComplete;
    expect(panels(el)[0].classList.contains('active')).toBe(true);
    expect(el.selectedItem!.id).toBe('p0');
    panels(el)[2].click();
    await el.updateComplete;
    expect(panels(el).map((li) => li.classList.contains('active'))).toEqual([false, false, true]);
    panels(el)[2].click();
    await el.updateComplete;
    expect(el.querySelector('li.active')).toBeNull();
    expect(selected.map((d) => d.item.id)).toEqual(['p0', 'p2']);
    expect(deselected.map((d) => d.item.id)).toEqual(['p2']);
  });

  it('snaps the selected panel to the left, and back on deselect', async () => {
    const el = await mount({ items: items(3), slidingPanelsSnap: true });
    finishShow();
    panels(el)[1].click();
    expect(el.classList.contains('snapped')).toBe(true);
    const snaps = animations.filter((a) => a.options.easing === 'ease-out');
    expect(snaps).toHaveLength(3);
    // p1 lands at 0: p0 one panel to its left
    expect(snaps.map((a) => a.keyframes[1].transform)).toEqual([
      'translate(-200px, 0px)',
      'translate(0px, 0px)',
      'translate(200px, 0px)',
    ]);
    panels(el)[1].click();
    expect(animations.filter((a) => a.options.easing === 'ease-out')).toHaveLength(6);
  });

  it('shows the empty view when there is nothing to pick', async () => {
    const el = await mount({
      items: [],
      renderEmpty: () => html`<li class="empty-view">Nothing yet</li>`,
    });
    expect(panels(el).map((li) => li.className)).toEqual(['empty-view']);
    expect(shown.map((s) => s.x)).toEqual([0]);
  });

  it('lays out and plays in again when the items change', async () => {
    const el = await mount({ items: items(2) });
    shown = [];
    el.items = items(3);
    await el.updateComplete;
    expect(panels(el)).toHaveLength(3);
    expect(shown).toHaveLength(3);
  });

  it('leaves no listener, frame or animation behind when removed', async () => {
    const wheel = listenerCount(EVENTS.pointer_wheel);
    const resize = listenerCount(EVENTS.resize);
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    const el = await mount({ items: items(10), slidingPanelsStack: false });
    finishShow();
    expect(listenerCount(EVENTS.pointer_wheel)).toBe(wheel + 1);
    expect(listenerCount(EVENTS.resize)).toBe(resize + 1);
    const live = animations.filter((a) => a.pause.mock.calls.length);
    el.remove();
    expect(listenerCount(EVENTS.pointer_wheel)).toBe(wheel);
    expect(listenerCount(EVENTS.resize)).toBe(resize);
    expect(cancel).toHaveBeenCalled();
    expect(live.every((a) => a.cancel.mock.calls.length > 0)).toBe(true);
  });
});
