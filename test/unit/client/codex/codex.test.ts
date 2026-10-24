import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChapterPreview, Codex } from '../../../../apps/client/ui/components/codex/codex';

let component: typeof import('../../../../apps/client/ui/components/codex/codex');
let TAG: string;

const CHAPTERS: ChapterPreview[] = [
  {
    id: 1,
    name: '1: The Age of Disjunction',
    description: '0 AE',
    img: 'resources/c1.jpg',
    enabled: true,
  },
  {
    id: 2,
    name: '2: The Great Dragons',
    description: 'line one\nline two',
    img: 'resources/c2.jpg',
    enabled: false,
    unlockMessage: 'Play 3 more games to unlock.',
  },
  { id: 3, name: '3: Disabled', description: '', img: 'resources/c3.jpg', enabled: false },
];

// Web Animations stub: each call is recorded with its target and frames
interface FakeAnimation {
  target: HTMLElement;
  keyframes: any;
  onfinish: (() => void) | null;
  cancel: ReturnType<typeof vi.fn>;
  finish: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
}
let animations: FakeAnimation[];

async function mount(props: Partial<Codex> = {}) {
  const el = document.createElement(TAG) as Codex;
  Object.assign(el, { chapters: CHAPTERS, ...props });
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function captured(el: Element, name: string) {
  const seen: any[] = [];
  el.addEventListener(name, (e) => seen.push((e as CustomEvent).detail));
  return seen;
}

const previews = (el: Element) => [...el.querySelectorAll<HTMLElement>('li.codex-chapter-preview')];
// the opacity each fade ends on, per region
const fades = (cls: string) =>
  animations.filter((a) => a.target.classList.contains(cls)).map((a) => a.keyframes[1].opacity);

describe('<duelyst-codex>', () => {
  beforeAll(async () => {
    component = await import('../../../../apps/client/ui/components/codex/codex');
    TAG = component.TAG;
  });

  beforeEach(() => {
    animations = [];
    vi.spyOn(HTMLElement.prototype, 'animate').mockImplementation(function (
      this: HTMLElement,
      keyframes: any,
    ) {
      const animation: FakeAnimation = {
        target: this,
        keyframes,
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
    vi.restoreAllMocks();
  });

  it('registers once, under its tag', () => {
    expect(customElements.get(TAG)).toBe(component.Codex);
  });

  it('hides the map switch and renders no carousel until the resources are in', async () => {
    const el = await mount();
    expect(el.shadowRoot).toBeNull();
    expect(el.querySelector('.show-world-map')!.classList.contains('hide')).toBe(true);
    expect(el.querySelector('.hide-world-map')!.classList.contains('hide')).toBe(true);
    expect(el.querySelector('.codex-chapter-select')).toBeNull();

    el.ready = true;
    await el.updateComplete;
    expect(el.querySelector('.show-world-map')!.classList.contains('hide')).toBe(false);
    expect(
      el.querySelector('.chapters-region > duelyst-sliding-panel-select.codex-chapter-select'),
    ).not.toBeNull();
    // the back button sits outside every faded region: it stays up in all states
    const back = el.querySelector('.btn-user-cancel.btn-nav-back')!;
    expect(back.parentElement).toBe(el);
    expect(back.closest('.lore')).toBeNull();
  });

  it('renders a panel per chapter, locked ones disabled with their unlock message', async () => {
    const el = await mount({ ready: true });
    const carousel = el.querySelector<any>('duelyst-sliding-panel-select')!;
    await carousel.updateComplete;
    expect(carousel.querySelector('.sliding-panel-select-title').textContent).toBe('Historia');
    expect(carousel.slidingPanelsStack).toBe(false);
    const [first, second, third] = previews(el);
    expect(previews(el)).toHaveLength(3);
    expect(first.querySelector('.name')!.textContent).toBe('1: The Age of Disjunction');
    expect(first.querySelector<HTMLElement>('.background')!.getAttribute('style')).toContain(
      'resources/c1',
    );
    expect(first.classList.contains('disabled')).toBe(false);
    expect(second.classList.contains('disabled')).toBe(true);
    expect(second.querySelector('.description')!.innerHTML).toContain('line one<br>line two');
    expect(second.querySelector('.locked-label')!.textContent).toContain('Play 3 more games');
    expect(third.classList.contains('disabled')).toBe(true);
    expect(third.querySelector('.locked-label')).toBeNull();
  });

  it('turns a click on an unlocked chapter into chapter-select, and keeps the carousel event in', async () => {
    const el = await mount({ ready: true });
    await el.querySelector<any>('duelyst-sliding-panel-select').updateComplete;
    const selected = captured(el, 'chapter-select');
    const leaked: any[] = [];
    document.body.addEventListener('panel-select', (e) => leaked.push(e));
    previews(el)[1].click();
    previews(el)[0].click();
    expect(selected).toEqual([{ id: 1 }]);
    expect(leaked).toEqual([]);
  });

  it('sends the map switch clicks out', async () => {
    const el = await mount({ ready: true });
    const show = captured(el, 'world-map-show');
    const hide = captured(el, 'world-map-hide');
    el.querySelector<HTMLElement>('.show-world-map')!.click();
    el.querySelector<HTMLElement>('.hide-world-map')!.click();
    expect(show).toHaveLength(1);
    expect(hide).toHaveLength(1);
  });

  it('fades between the chapters, a chapter and the world map', async () => {
    const el = await mount({ ready: true });

    el.state = 'chapters';
    await el.updateComplete;
    expect(el.classList.contains('state-lore')).toBe(true);
    expect(fades('lore')).toEqual([1]);
    expect(fades('chapters-region')).toEqual([1]);

    el.state = 'chapter';
    await el.updateComplete;
    expect(fades('chapters-region')).toEqual([1, 0]);
    expect(fades('chapter-region')).toEqual([1]);

    // a faded-out region stops taking clicks
    const chapters = el.querySelector<HTMLElement>('.chapters-region')!;
    animations.filter((a) => a.target === chapters).pop()!.onfinish!();
    expect(chapters.style.visibility).toBe('hidden');

    el.state = 'world-map';
    await el.updateComplete;
    expect(el.classList.contains('state-world-map')).toBe(true);
    expect(el.classList.contains('state-lore')).toBe(false);
    expect(fades('chapter-region')).toEqual([1, 0]);
    expect(fades('lore')).toEqual([1, 0]);

    el.state = 'chapter';
    await el.updateComplete;
    expect(el.classList.contains('state-world-map')).toBe(false);
    expect(el.classList.contains('state-lore')).toBe(true);
    expect(fades('lore')).toEqual([1, 0, 1]);
    expect(fades('chapter-region')).toEqual([1, 0, 1]);
  });

  it('renders the loaded chapter with its line breaks', async () => {
    const el = await mount({ ready: true });
    el.chapter = { id: 2, name: 'The Great Dragons', description: 'a\nb', text: 'one\ntwo\rthree' };
    await el.updateComplete;
    const chapter = el.querySelector('.chapter-region > .codex-chapter')!;
    expect(chapter.getAttribute('data-chapter-id')).toBe('2');
    expect(chapter.querySelector('.chapter-name')!.textContent).toBe('The Great Dragons');
    expect(chapter.querySelector('.chapter-description')!.innerHTML).toContain('a<br>b');
    expect(chapter.querySelector('.chapter-text > .chapter-text-inner')!.innerHTML).toContain(
      'one<br>two<br>three',
    );

    el.chapter = null;
    await el.updateComplete;
    expect(el.querySelector('.codex-chapter')).toBeNull();
  });

  it('cancels its fades when removed', async () => {
    const el = await mount({ ready: true, state: 'chapters' });
    const running = animations.filter((a) => a.target.closest('.lore'));
    expect(running.length).toBeGreaterThan(0);
    el.remove();
    expect(
      running
        .filter((a) => !a.target.closest('duelyst-sliding-panel-select'))
        .every((a) => a.cancel.mock.calls.length > 0),
    ).toBe(true);
  });
});
