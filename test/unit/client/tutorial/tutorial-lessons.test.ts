import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import i18next from 'i18next';
import type {
  Lesson,
  TutorialLessons,
} from '../../../../apps/client/ui/components/tutorial/tutorial-lessons';

const require = createRequire(import.meta.url);

// initialise i18next before the component loads (§3.4)
let component: typeof import('../../../../apps/client/ui/components/tutorial/tutorial-lessons');
let TAG: string;

const LOCALES = '../../../../apps/client/localization/locales/en';

function lesson(type: string, isComplete = false): Lesson {
  return {
    type,
    name: `Lesson ${type}`,
    description: `About ${type}`,
    iconUrl: `resources/${type}.png`,
    isComplete,
  };
}

// Web Animations stub: each call is recorded so a test can finish the reveal
// by hand, the way a browser would after the delays
interface FakeAnimation {
  cancel: ReturnType<typeof vi.fn>;
  onfinish: null | (() => void);
}
let animations: FakeAnimation[];

async function mount(props: Partial<TutorialLessons> = {}) {
  const el = document.createElement(TAG) as TutorialLessons;
  Object.assign(el, {
    lessons: [lesson('a', true), lesson('b'), lesson('c')],
    ...props,
  });
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

const lessonEl = (el: Element, type: string) => el.querySelector(`.lesson#${type}`)!;
const classesOf = (el: Element) =>
  ['a', 'b', 'c'].map((t) => [...lessonEl(el, t).classList].filter((c) => c !== 'lesson'));

function captured(el: Element, name: string) {
  const seen: any[] = [];
  el.addEventListener(name, (e) => seen.push((e as CustomEvent).detail));
  return seen;
}

describe('<duelyst-tutorial-lessons>', () => {
  beforeAll(async () => {
    await i18next.init({
      lng: 'en',
      resources: {
        en: { translation: { tutorial: require(`${LOCALES}/tutorial.json`) } },
      },
    });
    component = await import('../../../../apps/client/ui/components/tutorial/tutorial-lessons');
    TAG = component.TAG;
  });

  beforeEach(() => {
    animations = [];
    vi.spyOn(HTMLElement.prototype, 'animate').mockImplementation(() => {
      const animation: FakeAnimation = { cancel: vi.fn(), onfinish: null };
      animations.push(animation);
      return animation as unknown as Animation;
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('registers once, under its tag', () => {
    expect(customElements.get(TAG)).toBe(component.TutorialLessons);
  });

  it('renders the header, one lesson per entry and the action bar, in light DOM', async () => {
    const el = await mount();
    expect(el.shadowRoot).toBeNull();
    expect(el.querySelector('.header > h1')!.textContent).toBe(i18next.t('tutorial.welcome_title'));
    expect(el.querySelectorAll('.lessons > .lesson')).toHaveLength(3);
    expect(el.querySelector('.lessons > .line')).not.toBeNull();
    const b = lessonEl(el, 'b');
    expect(b.querySelector('h2')!.textContent).toBe('Lesson b');
    expect(b.querySelector('p')!.textContent).toBe('About b');
    expect(b.querySelector('.image > img')!.getAttribute('src')).toContain('resources/b');
    expect(el.querySelector('#button_continue')).not.toBeNull();
    expect(el.querySelector('#button_skip')).not.toBeNull();
  });

  it('marks completed lessons and emphasises only the next one', async () => {
    const el = await mount();
    expect(classesOf(el)).toEqual([['complete'], ['has-emphasis'], []]);
  });

  it('reveals header, lessons, line and action bar in sequence', async () => {
    const el = await mount();
    // h1, hr, p, 3 lessons, line, action bar
    expect(animations).toHaveLength(8);
    const delays = vi
      .mocked(HTMLElement.prototype.animate)
      .mock.calls.map(([, opts]) => (opts as KeyframeAnimationOptions).delay);
    expect(delays).toEqual([400, 500, 600, 700, 800, 900, 1000, 1100]);
    expect((el.querySelector('.action-bar') as HTMLElement).style.opacity).toBe('0');
  });

  it('lands the last completed lesson after the reveal, then emphasises the next', async () => {
    vi.useFakeTimers();
    const el = await mount({
      lessons: [lesson('a', true), lesson('b', true), lesson('c')],
      lastCompletedType: 'b',
    });
    const completed = captured(el, 'lesson-completed');
    // while the reveal runs, the lesson just finished is the lit one
    expect(classesOf(el)).toEqual([['complete'], ['has-emphasis'], []]);

    animations[animations.length - 1].onfinish!();
    vi.advanceTimersByTime(199);
    expect(completed).toEqual([]);
    vi.advanceTimersByTime(1);
    await el.updateComplete;
    expect(completed).toEqual([{ type: 'b' }]);
    expect(classesOf(el)).toEqual([['complete'], ['complete'], ['has-emphasis']]);
  });

  it('ignores a last completed type that is not one of the lessons', async () => {
    const el = await mount({ lastCompletedType: 'zzz' });
    expect(classesOf(el)).toEqual([['complete'], ['has-emphasis'], []]);
  });

  it('asks for a lesson with an event when its image is clicked', async () => {
    const el = await mount();
    const selected = captured(document.body, 'lesson-select');
    (lessonEl(el, 'b').querySelector('.image') as HTMLElement).click();
    expect(selected).toEqual([{ type: 'b' }]);
  });

  it('sends hover events for the shell to play the sound', async () => {
    const el = await mount();
    const hovered = captured(el, 'lesson-hover');
    lessonEl(el, 'c').dispatchEvent(new MouseEvent('mouseenter'));
    expect(hovered).toEqual([{ type: 'c' }]);
  });

  it('continues with the next incomplete lesson, or null when all are done', async () => {
    const el = await mount();
    const continued = captured(el, 'tutorial-continue');
    (el.querySelector('#button_continue') as HTMLElement).click();
    el.lessons = [lesson('a', true), lesson('b', true)];
    await el.updateComplete;
    (el.querySelector('#button_continue') as HTMLElement).click();
    expect(continued).toEqual([{ type: 'b' }, { type: null }]);
  });

  it('asks to skip with an event', async () => {
    const el = await mount();
    const skipped = captured(el, 'tutorial-skip');
    (el.querySelector('#button_skip') as HTMLElement).click();
    expect(skipped).toEqual([{}]);
  });

  it('leaves no running animation and no timer behind when removed', async () => {
    vi.useFakeTimers();
    const el = await mount({
      lessons: [lesson('a', true), lesson('b')],
      lastCompletedType: 'a',
    });
    const completed = captured(el, 'lesson-completed');
    animations[animations.length - 1].onfinish!();
    expect(vi.getTimerCount()).toBe(1);

    el.remove();
    expect(vi.getTimerCount()).toBe(0);
    for (const animation of animations) expect(animation.cancel).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(completed).toEqual([]);
  });

  it('does not start the completed mark once removed mid-reveal', async () => {
    vi.useFakeTimers();
    const el = await mount({ lastCompletedType: 'a' });
    const last = animations[animations.length - 1];
    el.remove();
    last.onfinish!();
    expect(vi.getTimerCount()).toBe(0);
  });
});
