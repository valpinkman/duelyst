/*
 * <duelyst-tutorial-lessons>: the tutorial lesson picker a new player lands on
 * (issue #58, docs/BACKBONE_REMOVAL_PLAN.md §3.4). Mounted by
 * apps/client/ui/shells/tutorial_lessons_shell.ts.
 *
 * Properties in, events out: the shell reads the SDK and the progression
 * manager and sets `lessons` and `lastCompletedType`; this element never
 * imports a manager. Everything it needs from outside leaves as a bubbling
 * DOM event, sounds included:
 *
 *   lesson-select      detail { type }        a lesson's image was clicked
 *   tutorial-continue  detail { type | null } the next incomplete lesson, or
 *                                             null when every lesson is done
 *   tutorial-skip      detail {}
 *   lesson-hover       detail { type }
 *   lesson-completed   detail { type }        the completed-lesson mark of
 *                                             `lastCompletedType` was just shown
 *
 * Only the emphasised lesson takes pointer events (tutorial_lessons.scss), so
 * a click can only start the next lesson. The markup is the one the
 * Marionette view rendered, because the stylesheet selects on it.
 */
import { LitElement, html } from 'lit';
import i18next from 'i18next';
// CommonJS module.exports: tsc sees no default export, the bundler and vitest
// both hand a default import its module.exports (§3.4)
// @ts-expect-error -- CommonJS module.exports, see above
import CONFIG from '@duelyst/common/config';
import RSX from '@duelyst/data/resources';

export const TAG = 'duelyst-tutorial-lessons';

export interface Lesson {
  type: string;
  name: string;
  description: string;
  iconUrl: string;
  isComplete: boolean;
}

const EASING = 'cubic-bezier(0.39, 0.575, 0.565, 1)';
const RISE = [
  { opacity: 0.0, transform: 'translateY(1.0rem)' },
  { opacity: 1.0, transform: 'translateY(0)' },
];
const FADE = [{ opacity: 0.0 }, { opacity: 1.0 }];
// pause between the reveal ending and the completed mark landing
const COMPLETE_MARK_DELAY_MS = 200;

function imageForScale(path: string) {
  return RSX.getResourcePathForScale(path, CONFIG.resourceScaleCSS);
}

export class TutorialLessons extends LitElement {
  static properties = {
    lessons: { attribute: false },
    lastCompletedType: { attribute: false },
  };

  declare lessons: Lesson[];
  /** the lesson just finished, whose completed mark animates in after the reveal */
  declare lastCompletedType: string | null;

  // the type whose completed mark has not landed yet; set on first render
  #pendingComplete: string | null = null;
  #animations: Animation[] = [];
  #timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    this.lessons = [];
    this.lastCompletedType = null;
  }

  // light DOM (§3.1): the Bootstrap-importing SCSS keeps applying
  createRenderRoot() {
    return this;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    for (const animation of this.#animations) animation.cancel();
    this.#animations = [];
    if (this.#timer != null) clearTimeout(this.#timer);
    this.#timer = null;
  }

  willUpdate() {
    // read once, from the properties the shell set before the first render
    if (!this.hasUpdated) {
      const last = this.lastCompletedType;
      this.#pendingComplete = last && this.lessons.some((l) => l.type === last) ? last : null;
    }
  }

  firstUpdated() {
    this.#reveal();
  }

  /* region STATE */

  /** The lesson the player should take next, or null when all are done. */
  nextLessonType(): string | null {
    const next = this.lessons.find((l) => !l.isComplete);
    return next ? next.type : null;
  }

  #lessonClass(lesson: Lesson) {
    // while the last completed lesson waits for its mark, it alone is lit
    if (this.#pendingComplete != null) {
      if (lesson.type === this.#pendingComplete) return 'has-emphasis';
      return lesson.isComplete ? 'complete' : '';
    }
    if (lesson.isComplete) return 'complete';
    return lesson.type === this.nextLessonType() ? 'has-emphasis' : '';
  }

  /* endregion STATE */

  /* region ACTIONS */

  #emit(name: string, detail: object) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
  }

  #onSelect(lesson: Lesson) {
    this.#emit('lesson-select', { type: lesson.type });
  }

  #onContinue() {
    this.#emit('tutorial-continue', { type: this.nextLessonType() });
  }

  #onSkip() {
    this.#emit('tutorial-skip', {});
  }

  #onHover(lesson: Lesson) {
    this.#emit('lesson-hover', { type: lesson.type });
  }

  /* endregion ACTIONS */

  /* region REVEAL */

  #animate(el: Element | null, keyframes: Keyframe[], duration: number, delay: number) {
    if (el == null || typeof (el as HTMLElement).animate !== 'function') return null;
    (el as HTMLElement).style.opacity = '0';
    const animation = (el as HTMLElement).animate(keyframes, {
      duration,
      delay,
      easing: EASING,
      fill: 'forwards',
    });
    this.#animations.push(animation);
    return animation;
  }

  // title, rule, paragraph, each lesson, the line, then the action bar, each
  // rising in 100ms after the one before
  #reveal() {
    let delay = 400;
    this.#animate(this.querySelector('.header > h1'), RISE, 200, delay);
    delay += 100;
    this.#animate(this.querySelector('.header > hr'), FADE, 200, delay);
    delay += 100;
    this.#animate(this.querySelector('.header > p'), RISE, 200, delay);
    delay += 100;
    for (const lesson of this.querySelectorAll('.lessons > .lesson')) {
      this.#animate(lesson, RISE, 400, delay);
      delay += 100;
    }
    this.#animate(this.querySelector('.line'), FADE, 100, delay);
    delay += 100;
    const last = this.#animate(this.querySelector('.action-bar'), RISE, 200, delay);

    if (this.#pendingComplete == null) return;
    if (last == null) this.#landCompleteMark();
    else last.onfinish = () => this.#landCompleteMark();
  }

  #landCompleteMark() {
    if (!this.isConnected) return;
    this.#timer = setTimeout(() => {
      this.#timer = null;
      const type = this.#pendingComplete;
      this.#pendingComplete = null;
      this.requestUpdate();
      this.#emit('lesson-completed', { type });
    }, COMPLETE_MARK_DELAY_MS);
  }

  /* endregion REVEAL */

  /* region RENDER */

  render() {
    return html`
      <div class="header">
        <h1>${i18next.t('tutorial.welcome_title')}</h1>
        <hr />
        <p>${i18next.t('tutorial.welcome_instructions')}</p>
      </div>
      <div class="lessons">
        ${this.lessons.map((lesson) => this.#renderLesson(lesson))}
        <div class="line"></div>
      </div>
      <div class="action-bar footer">
        <button
          id="button_continue"
          class="btn btn-clean btn-clean-secondary"
          @click=${this.#onContinue}
        >
          ${i18next.t('tutorial.continue_button_label')}
        </button>
        <button id="button_skip" class="btn btn-clean btn-clean-round" @click=${this.#onSkip}>
          ${i18next.t('tutorial.skip_button_label')}
        </button>
      </div>
    `;
  }

  #renderLesson(lesson: Lesson) {
    return html`<div
      id=${lesson.type}
      class="lesson ${this.#lessonClass(lesson)}"
      @mouseenter=${() => this.#onHover(lesson)}
    >
      <div class="image" @click=${() => this.#onSelect(lesson)}>
        <img src=${imageForScale(lesson.iconUrl)} />
        <div class="glow"></div>
        <div class="slash"></div>
      </div>
      <h2>${lesson.name}</h2>
      <div class="time">${i18next.t('tutorial.lesson_default_duration')}</div>
      <p>${lesson.description}</p>
    </div>`;
  }

  /* endregion RENDER */
}

// guarded so a watch rebuild or a second import in a test does not throw
if (!customElements.get(TAG)) customElements.define(TAG, TutorialLessons);
