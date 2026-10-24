/*
 * <duelyst-codex>: the lore screen, a carousel of chapters, the chapter being
 * read, and the switch to the world map (issue #68,
 * docs/BACKBONE_REMOVAL_PLAN.md §3.4). Mounted by
 * apps/client/ui/shells/codex_shell.ts.
 *
 * Properties in, events out: the shell owns the state machine (it is driven by
 * the navigation manager's minor routes), the cocos layers, resource loading
 * and sounds, and sets `chapters`, `ready`, `state` and `chapter`; this
 * element never imports a manager. It renders and fades between the states:
 *
 *   chapter-select   detail { id }  an unlocked chapter was clicked
 *   world-map-show   detail {}      the "world map" button
 *   world-map-hide   detail {}      the "lore" button
 *
 * The chapter carousel is <duelyst-sliding-panel-select>, whose panel-hover
 * events bubble through for the shell's hover sound. Chapter text and
 * descriptions are authored by the SDK and carry line breaks, so they are the
 * one `unsafeHTML` use here.
 */
import { LitElement, html, nothing } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
// CommonJS module.exports: tsc sees no default export, the bundler and vitest
// both hand a default import its module.exports (§3.4)
// @ts-expect-error -- CommonJS module.exports, see above
import CONFIG from '@duelyst/common/config';
import RSX from '@duelyst/data/resources';
import '../carousel/sliding-panel-select';
import type { PanelItem } from '../carousel/sliding-panel-select';

export const TAG = 'duelyst-codex';

export type CodexState = 'chapters' | 'chapter' | 'world-map' | null;

/** One chapter in the carousel. */
export interface ChapterPreview extends PanelItem {
  id: string | number;
  name: string;
  description: string;
  img: string;
  /** false when the chapter is disabled or not unlocked yet */
  enabled: boolean;
  /** shown on a locked panel, e.g. "Play 3 more games to unlock." */
  unlockMessage?: string | null;
}

/** The chapter being read. */
export interface Chapter {
  id: string | number;
  name: string;
  description: string;
  text: string;
}

function imageForScale(path: string) {
  return RSX.getResourcePathForScale(path, CONFIG.resourceScaleCSS);
}

function withBreaks(text: string | null | undefined) {
  return unsafeHTML((text || '').replace(/\n|\r/g, '<br/>'));
}

export class Codex extends LitElement {
  static properties = {
    chapters: { attribute: false },
    ready: { attribute: false },
    state: { attribute: false },
    chapter: { attribute: false },
  };

  declare chapters: ChapterPreview[];
  /** resources are in: show the carousel and the map switch */
  declare ready: boolean;
  declare state: CodexState;
  /** the loaded chapter, shown while `state` is 'chapter' */
  declare chapter: Chapter | null;

  #animations = new Map<Element, Animation>();

  constructor() {
    super();
    this.chapters = [];
    this.ready = false;
    this.state = null;
    this.chapter = null;
  }

  // light DOM (§3.1): the Bootstrap-importing SCSS keeps applying
  createRenderRoot() {
    return this;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    for (const animation of this.#animations.values()) animation.cancel();
    this.#animations.clear();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('state')) {
      this.#transition((changed.get('state') as CodexState) ?? null, this.state);
    }
  }

  /* region STATES */

  #transition(previous: CodexState, next: CodexState) {
    if (previous === next) return;

    // leave the old state
    if (previous === 'world-map') this.classList.remove('state-world-map');
    else if (previous === 'chapter') this.#fade(this.#region('chapter'), false);
    else if (previous === 'chapters') this.#fade(this.#region('chapters'), false);

    // the lore shows in every state but the world map
    const loreWasShown = previous != null && previous !== 'world-map';
    const loreShown = next != null && next !== 'world-map';
    if (loreShown && !loreWasShown) {
      this.classList.add('state-lore');
      this.#fade(this.querySelector('.lore'), true);
    } else if (!loreShown && loreWasShown) {
      this.classList.remove('state-lore');
      this.#fade(this.querySelector('.lore'), false);
    }

    // enter the new state
    if (next === 'world-map') this.classList.add('state-world-map');
    else if (next === 'chapter') this.#fade(this.#region('chapter'), true);
    else if (next === 'chapters') this.#fade(this.#region('chapters'), true);
  }

  #region(name: 'chapters' | 'chapter') {
    return this.querySelector<HTMLElement>(`.lore > .${name}-region`);
  }

  // Animations.fadeIn / fadeOut: a faded-out element is also made invisible,
  // so it stops taking clicks
  #fade(el: HTMLElement | null, show: boolean) {
    if (el == null || typeof el.animate !== 'function') return;
    const running = this.#animations.get(el);
    if (running) running.cancel();
    el.style.visibility = '';
    const animation = el.animate([{ opacity: show ? 0.0 : 1.0 }, { opacity: show ? 1.0 : 0.0 }], {
      duration: CONFIG.VIEW_TRANSITION_DURATION * 1000.0,
      fill: 'forwards',
    });
    this.#animations.set(el, animation);
    animation.onfinish = () => {
      if (this.#animations.get(el) === animation) this.#animations.delete(el);
      if (!show) el.style.visibility = 'hidden';
    };
  }

  /* endregion STATES */

  /* region ACTIONS */

  #emit(name: string, detail: object) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
  }

  #onPanelSelect(e: CustomEvent) {
    // the carousel's own event stops here: the shell hears chapter-select
    e.stopPropagation();
    this.#emit('chapter-select', { id: e.detail.item.id });
  }

  /* endregion ACTIONS */

  /* region RENDER */

  render() {
    const hide = this.ready ? '' : ' hide';
    return html`
      <button
        class="btn-borderless show-world-map${hide}"
        @click=${() => this.#emit('world-map-show', {})}
      >
        world map<i class="fa fa-map-marker"></i>
      </button>
      <button
        class="btn-borderless hide-world-map${hide}"
        @click=${() => this.#emit('world-map-hide', {})}
      >
        lore<i class="fa fa-book"></i>
      </button>
      <div class="lore">
        <div class="chapters-region">
          ${
            this.ready
              ? html`<duelyst-sliding-panel-select
                  class="codex-chapter-select"
                  .heading=${'Historia'}
                  .slidingPanelsStack=${false}
                  .items=${this.chapters}
                  .panelClass=${() => 'codex-chapter-preview'}
                  .renderPanel=${(item: PanelItem) => this.#renderPreview(item as ChapterPreview)}
                  @panel-select=${this.#onPanelSelect}
                ></duelyst-sliding-panel-select>`
              : nothing
          }
        </div>
        <div class="chapter-region">${this.#renderChapter()}</div>
      </div>
      ${
        // outside the faded regions: the old view's button stayed up in the
        // chapter and world-map states too
        this.ready
          ? html`<button
              type="button"
              class="btn btn-clean btn-user-cancel btn-cancel-primary btn-nav-back"
            ></button>`
          : nothing
      }
    `;
  }

  #renderPreview(chapter: ChapterPreview) {
    return html`<div
        class="background"
        style="background-image: url(${imageForScale(chapter.img)})"
      ></div>
      <div class="sliding-panel-content">
        <div class="name">${chapter.name}</div>
        <div class="description">${withBreaks(chapter.description)}</div>
      </div>
      ${
        chapter.unlockMessage
          ? html`<div class="locked-label">
              <i class="fa fa-lock"></i> ${chapter.unlockMessage}
            </div>`
          : nothing
      }`;
  }

  #renderChapter() {
    const chapter = this.chapter;
    if (chapter == null) return nothing;
    return html`<div class="codex-chapter" data-chapter-id=${chapter.id}>
      <div class="chapter-content">
        <h1 class="chapter-name">${chapter.name}</h1>
        <p class="chapter-description">${withBreaks(chapter.description)}</p>
        <hr class="shine" />
        <p class="chapter-text">
          <span class="chapter-text-inner">${withBreaks(chapter.text)}</span>
        </p>
      </div>
    </div>`;
  }

  /* endregion RENDER */
}

// guarded so a watch rebuild or a second import in a test does not throw
if (!customElements.get(TAG)) customElements.define(TAG, Codex);
