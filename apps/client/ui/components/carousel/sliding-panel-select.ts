/*
 * <duelyst-sliding-panel-select>: the sliding panel carousel shared by the
 * codex, the rift runs list, the play modes, the challenge categories and the
 * deck select (issue #68, #12 decision D5, docs/BACKBONE_REMOVAL_PLAN.md §3.4).
 * A port of views/composite/sliding_panel_select.ts, which stays for the
 * Marionette subclasses until their screens move.
 *
 * The host sets `items` (each with an `id`, or a `name`) and `renderPanel`,
 * which returns the content of one panel, and may replace the dashed header
 * (`renderHeader`) or add a footer under the list (`renderFooter`, #77). The
 * carousel lays the panels out, stacks them when they fit, slides them on
 * wheel and paging, and snaps or sticks a selection when asked to. It imports no manager. Everything it
 * needs from outside leaves as a bubbling DOM event:
 *
 *   panel-select    detail { item }  an enabled panel was clicked (selected)
 *   panel-deselect  detail { item }  a sticky/snapped selection was cleared
 *   panel-hover     detail { item }  the pointer entered a panel
 *
 * The wheel and resize still arrive through the EventBus, as before: the
 * application turns DOM wheel events into pointer events there.
 *
 * Light DOM, with the markup the old composite rendered, because
 * composite/sliding_panel_select.scss selects on it; the element itself takes
 * the `sliding-panel-select` class and the slides/sliding/snapped state
 * classes the stylesheet reads.
 */
import { LitElement, html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
// CommonJS module.exports: tsc sees no default export, the bundler and vitest
// both hand a default import its module.exports (§3.4)
// @ts-expect-error -- CommonJS module.exports, see above
import CONFIG from '@duelyst/common/config';
// @ts-expect-error -- CommonJS module.exports, see above
import EventBus from '@duelyst/common/eventbus';
// @ts-expect-error -- CommonJS module.exports, see above
import EVENTS from '@duelyst/common/event_types';

export const TAG = 'duelyst-sliding-panel-select';

export interface PanelItem {
  id?: string | number;
  name?: string;
  enabled?: boolean;
  [key: string]: any;
}

/** Plays a panel in at its final position; the old Animations presets, without jQuery. */
export type ShowAnimation = (
  el: HTMLElement,
  duration: number,
  delay: number,
  x: number,
  y: number,
) => Animation;

/** The layout sizes of an element, as jQuery's width()/innerWidth()/outerWidth(true) gave them. */
export interface Box {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  outerWidth: number;
  outerHeight: number;
}

interface PanelData {
  x: number;
  y: number;
  source_x: number;
  target_x: number;
  animation: Animation | null;
  animation_duration: number;
  width: number;
  height: number;
  outerWidth: number;
  outerHeight: number;
}

const translate = (x: number, y: number) => 'translate(' + x + 'px, ' + y + 'px)';

// both presets start hidden when delayed and set the panel's 3D context
function playIn(
  el: HTMLElement,
  duration: number,
  delay: number,
  keyframes: Keyframe[],
  easing: string,
) {
  if (delay > 0) el.style.opacity = '0';
  if (el.parentElement) el.parentElement.style.perspective = '1000px';
  return el.animate(keyframes, { duration, delay, easing, fill: 'forwards' });
}

/** Animations.fadeZoomRotateFlashUpIn: a random tilt and depth, flashed from black. */
export const fadeZoomRotateFlashUpIn: ShowAnimation = (el, duration, delay, x, y) => {
  el.style.transformOrigin = '50% 50%';
  const rotateY = (0.5 - Math.random()) * 90;
  const rotateZ = (0.5 - Math.random()) * 30;
  const translateZ = -(150 + Math.random() * 100);
  const scale = 0.6 + Math.random() * 0.2;
  const animation = playIn(
    el,
    duration,
    delay,
    [
      {
        opacity: 0.75,
        transform: `translateX(${x}px) translateY(${y}px) translateZ(${translateZ}px) scale(${scale}) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
        filter: 'brightness(0)',
      },
      {
        opacity: 1.0,
        transform: `translateX(${x}px) translateY(${y}px) translateZ(0px) scale(1.0) rotateY(0deg) rotateZ(0deg)`,
        filter: 'brightness(1)',
      },
    ],
    'cubic-bezier(0.56, 1.21, 0.56, 1)',
  );
  animation.onfinish = () => {
    el.style.opacity = '';
    el.style.transformOrigin = '';
  };
  return animation;
};

/** Animations.fadeZoomFlashUpIn: straight up out of the screen, flashed from black. */
export const fadeZoomFlashUpIn: ShowAnimation = (el, duration, delay, x, y) => {
  const animation = playIn(
    el,
    duration,
    delay,
    [
      {
        opacity: 0.0,
        transform: `translateX(${x}px) translateY(${y}px) translateZ(-50px)`,
        filter: 'brightness(0%)',
      },
      {
        opacity: 1.0,
        transform: `translateX(${x}px) translateY(${y}px) translateZ(0.0)`,
        filter: 'brightness(100%)',
      },
    ],
    'cubic-bezier(0.39, 0.575, 0.565, 1)',
  );
  if (delay > 0) animation.onfinish = () => (el.style.opacity = '');
  return animation;
};

export class SlidingPanelSelect extends LitElement {
  static properties = {
    items: { attribute: false },
    heading: { attribute: false },
    renderHeader: { attribute: false },
    renderFooter: { attribute: false },
    listClass: { attribute: false },
    renderPanel: { attribute: false },
    renderEmpty: { attribute: false },
    panelClass: { attribute: false },
    isEnabled: { attribute: false },
  };

  declare items: PanelItem[];
  /** the dashed header title */
  declare heading: string;
  /** the header's content; the dashed `heading` title when unset */
  declare renderHeader: (() => unknown) | null;
  /** a footer under the list (buttons, labels); none when unset */
  declare renderFooter: (() => unknown) | null;
  /** extra classes for the list itself */
  declare listClass: string;
  /** the content of one panel's <li> */
  declare renderPanel: (item: PanelItem) => unknown;
  /** what the list shows when `items` is empty; nothing when unset */
  declare renderEmpty: (() => unknown) | null;
  /** extra classes for one panel's <li> */
  declare panelClass: (item: PanelItem) => string;
  /** whether a panel can be selected; `item.enabled` by default */
  declare isEnabled: (item: PanelItem) => boolean;

  // options, as the Marionette subclasses set them on their prototype
  /** anchor point of the centre of the panel group when all fit on screen */
  slidingAnchorPoint = 0.5;
  /** decay of sliding velocity per frame */
  slidingVelocityDecay = 0.5;
  /** whether panels snap to the left when one is selected */
  slidingPanelsSnap = false;
  /** click selects and stays selected, click again deselects (always so when snapping) */
  slidingPanelsStickySelection = false;
  /** whether panels may stack in rows to fill the space */
  slidingPanelsStack = true;
  slidingPanelsSnapDuration = 250;
  slidingPanelShowAnimation: ShowAnimation = fadeZoomRotateFlashUpIn;
  slidingPanelsShowDuration = 600.0;
  slidingPanelsShowDelay = 150.0;
  slidingPanelsShowStagger = 100.0;
  slidingPanelsShowStaggerRandom = 20.0;

  #dataById: Record<string, PanelData> = {};
  #selectedId: string | null = null;

  #isEmptyView = false;
  #pageWidth = 0;
  #accelerationX = 0;
  #animating = false;
  #animationId = 0;
  #atStart = false;
  #atEnd = false;
  #choicesHorizontalPadding = 0;
  #containerWidth = 0;
  #containerHeight = 0;
  #containerCSSWidth: number | string = '';
  #containerCSSHeight: number | string = '';
  #containerCSSFlex = '';
  #deltaX = 0;
  #offsetX = 0;
  #lastOffsetX = 0;
  #locked = false;
  #range = 0;
  #targetDuration: number | null = null;
  #targetOffsetX: number | null = null;
  #targetStartedAt: number | null = null;
  #sourceOffsetX: number | null = null;
  #velocityX = 0;
  #totalViewsWidth = 0;
  #totalViewsHeight = 0;

  #frameId: number | null = null;
  #postSnapTimeoutId: ReturnType<typeof setTimeout> | null = null;
  #scrollingTimeoutId: ReturnType<typeof setTimeout> | null = null;
  #listening = false;

  constructor() {
    super();
    this.items = [];
    this.heading = '';
    this.renderHeader = null;
    this.renderFooter = null;
    this.listClass = '';
    this.renderPanel = () => nothing;
    this.renderEmpty = null;
    this.panelClass = () => '';
    this.isEnabled = (item) => item.enabled !== false;
  }

  // light DOM (§3.1): the Bootstrap-importing SCSS keeps applying
  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.classList.add('sliding-panel-select');
    const bus = EventBus.getInstance();
    bus.on(EVENTS.pointer_wheel, this.#onPointerWheel, this);
    bus.on(EVENTS.resize, this.#onResize, this);
    this.#listening = true;
    // a reconnect resumes the loop the disconnect stopped
    if (this.hasUpdated) this.#scheduleUpdate();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.#listening) {
      const bus = EventBus.getInstance();
      bus.off(EVENTS.pointer_wheel, this.#onPointerWheel, this);
      bus.off(EVENTS.resize, this.#onResize, this);
      this.#listening = false;
    }
    if (this.#frameId != null) cancelAnimationFrame(this.#frameId);
    this.#frameId = null;
    if (this.#postSnapTimeoutId != null) clearTimeout(this.#postSnapTimeoutId);
    if (this.#scrollingTimeoutId != null) clearTimeout(this.#scrollingTimeoutId);
    this.#postSnapTimeoutId = null;
    this.#scrollingTimeoutId = null;
    for (const data of Object.values(this.#dataById)) {
      if (data.animation != null) data.animation.cancel();
      data.animation = null;
    }
  }

  firstUpdated() {
    this.#onResize();
    this.#scheduleUpdate();
    this.#showSlidingPanels();
  }

  updated(changed: Map<string, unknown>) {
    // a new list lays out and plays in again, as a re-rendered composite did
    if (changed.has('items') && changed.get('items') !== undefined) {
      if (
        this.#selectedId != null &&
        !this.items.some((i) => this.#idFor(i) === this.#selectedId)
      ) {
        this.#selectedId = null;
      }
      this.#onResize();
      this.#showSlidingPanels();
    }
  }

  /* region MEASURE */

  /** Layout sizes ignore transforms, so a panel mid-slide measures like one at rest. */
  measure(el: Element | null): Box {
    if (el == null) {
      return { width: 0, height: 0, innerWidth: 0, innerHeight: 0, outerWidth: 0, outerHeight: 0 };
    }
    const he = el as HTMLElement;
    const style = getComputedStyle(he);
    const px = (v: string) => parseFloat(v) || 0;
    const innerWidth = he.clientWidth;
    const innerHeight = he.clientHeight;
    return {
      width: innerWidth - px(style.paddingLeft) - px(style.paddingRight),
      height: innerHeight - px(style.paddingTop) - px(style.paddingBottom),
      innerWidth,
      innerHeight,
      outerWidth: he.offsetWidth + px(style.marginLeft) + px(style.marginRight),
      outerHeight: he.offsetHeight + px(style.marginTop) + px(style.marginBottom),
    };
  }

  /* endregion MEASURE */

  /* region PANELS */

  #idFor(item: PanelItem): string {
    const id = item.id != null && item.id !== '' ? item.id : item.name;
    return String(id);
  }

  #body() {
    return this.querySelector<HTMLElement>(
      ':scope > .sliding-panel-select-content .sliding-panel-select-body',
    );
  }

  #choicesContainer() {
    return this.querySelector<HTMLElement>(
      ':scope > .sliding-panel-select-content .sliding-panel-select-choices',
    );
  }

  /** [id, element] for each child of the list, the empty view included */
  #panels(): [string, HTMLElement][] {
    const container = this.#choicesContainer();
    const choices = container && container.querySelector(':scope > .choices');
    if (choices == null) return [];
    const els = [...choices.children] as HTMLElement[];
    if (this.items.length === 0) return els.length > 0 ? [['__empty__', els[0]]] : [];
    return els.map((el) => [el.dataset.panelId!, el]);
  }

  #dataFor(id: string): PanelData {
    return (
      this.#dataById[id] ||
      (this.#dataById[id] = {
        x: 0,
        y: 0,
        source_x: 0,
        target_x: 0,
        animation: null,
        animation_duration: 1,
        width: 0,
        height: 0,
        outerWidth: 0,
        outerHeight: 0,
      })
    );
  }

  #centerY(data: PanelData) {
    return data.y + (this.#containerHeight - this.#totalViewsHeight) * 0.5;
  }

  /* endregion PANELS */

  /* region LAYOUT */

  #onResize() {
    const body = this.#body();
    const container = this.#choicesContainer();
    if (body == null || container == null) return;
    const choices = container.querySelector<HTMLElement>(':scope > .choices');

    // strip css
    container.style.width = '';
    container.style.height = '';
    container.style.flex = '';
    this.classList.remove('slides', 'slide-end', 'slide-start');
    this.#atStart = false;
    this.#atEnd = false;

    // store previous size
    const previousWidth = this.#containerWidth;

    // find current size
    const containerBox = this.measure(container);
    this.#containerWidth = this.measure(choices).width;
    this.#containerHeight = this.measure(body).height;
    this.#choicesHorizontalPadding = containerBox.innerWidth - this.#containerWidth;
    const containerHorizontalPadding = containerBox.innerWidth - containerBox.width;
    const containerVerticalPadding = containerBox.innerHeight - containerBox.height;

    // redo panels layout
    this.#layoutSlidingPanels();

    if (this.#getCanSlide()) {
      // container height matches the total views height
      this.#containerHeight = this.#totalViewsHeight;
      this.#containerCSSWidth = '';
      this.#containerCSSHeight = this.#containerHeight + containerVerticalPadding;
      this.#containerCSSFlex = '';

      // slide within window
      this.#range = this.#totalViewsWidth - this.#containerWidth;
      const scale = this.#containerWidth > 0 ? previousWidth / this.#containerWidth : 0.0;
      this.#offsetX = this.#lastOffsetX = this.#offsetX * scale;
      if (!this.#locked) this.#startSlidingPanelsForUpdate();
    } else {
      if (!this.#isEmptyView) {
        // container matches the total views size
        this.#containerWidth = this.#totalViewsWidth;
        this.#containerHeight = this.#totalViewsHeight;
      }
      this.#containerCSSWidth =
        this.#containerWidth + this.#choicesHorizontalPadding + containerHorizontalPadding;
      this.#containerCSSHeight = this.#containerHeight + containerVerticalPadding;
      this.#containerCSSFlex = 'none';

      // the window is big enough that there is no need to slide
      this.#range = 0.0;
      this.#offsetX = this.#lastOffsetX =
        (this.#containerWidth - this.#totalViewsWidth) * this.slidingAnchorPoint +
        containerHorizontalPadding * (0.5 - this.slidingAnchorPoint);
      this.#velocityX = 0.0;
      this.#deltaX = 0.0;
      for (const [id, el] of this.#panels()) {
        const data = this.#dataFor(id);
        const x = this.#isEmptyView ? 0.0 : data.x + this.#offsetX;
        if (data.animation != null) {
          data.animation.cancel();
          data.animation = null;
        }
        el.style.transform = translate(x, this.#centerY(data));
      }
    }

    // apply size to container
    const css = (v: number | string) => (typeof v === 'number' ? v + 'px' : v);
    container.style.width = css(this.#containerCSSWidth);
    container.style.height = css(this.#containerCSSHeight);
    container.style.flex = this.#containerCSSFlex;
  }

  #layoutSlidingPanels() {
    this.#totalViewsWidth = this.#pageWidth = 0;
    this.#totalViewsHeight = 0;
    const usableWidth = this.#containerWidth - this.#choicesHorizontalPadding;
    const panels = this.#panels();
    const numPanels = panels.length;
    this.#isEmptyView = this.items.length === 0 && numPanels === 1;
    let numPanelsPerRow: number | undefined;
    let numPanelsPerColumn = 1;
    let pageIndex = 0;
    let rowIndex = 0;
    let columnIndex = 0;
    let rowIndexMax = 0;
    let columnIndexMax = 0;

    for (const [id, el] of panels) {
      const data = this.#dataFor(id);
      const box = this.measure(el);
      data.width = box.width;
      data.height = box.height;
      data.outerWidth = box.outerWidth;
      data.outerHeight = box.outerHeight;

      if (this.slidingPanelsStack && numPanels > 3) {
        // stack by height and even distribution; assumes all panels share a height
        if (numPanelsPerRow == null) {
          numPanelsPerRow = Math.max(1, Math.floor(usableWidth / data.outerWidth) || 0);
          numPanelsPerColumn = Math.max(
            1,
            Math.floor(this.#containerHeight / data.outerHeight) || 0,
          );

          // distribute evenly when everything fits on screen
          while (
            (numPanelsPerRow - 1) * numPanelsPerColumn >= numPanels &&
            numPanelsPerRow - 1 >= numPanelsPerColumn
          ) {
            numPanelsPerRow--;
          }

          rowIndexMax = numPanelsPerColumn;
          columnIndexMax = numPanelsPerRow;
          this.#pageWidth = data.outerWidth * numPanelsPerRow;
        }

        data.x =
          columnIndex * data.outerWidth +
          pageIndex * this.#pageWidth +
          this.#choicesHorizontalPadding * 0.5;
        data.y = rowIndex * data.outerHeight;
        if (rowIndex === 0) this.#totalViewsWidth += data.outerWidth;
        if (pageIndex === 0 && columnIndex === 0) this.#totalViewsHeight += data.outerHeight;
        columnIndex++;
        if (columnIndex >= columnIndexMax) {
          columnIndex = 0;
          rowIndex++;
          if (rowIndex >= rowIndexMax) {
            rowIndex = 0;
            pageIndex++;
          }
        }
      } else {
        // tile horizontally
        data.x = this.#totalViewsWidth + this.#choicesHorizontalPadding * 0.5;
        data.y = 0;
        this.#totalViewsWidth += data.outerWidth;
        this.#totalViewsHeight = Math.max(this.#totalViewsHeight, data.outerHeight);
        this.#pageWidth =
          Math.max(1, Math.floor(usableWidth / data.outerWidth) || 0) * data.outerWidth;
      }
    }
  }

  /* endregion LAYOUT */

  /* region EVENTS */

  #emit(name: string, detail: object) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
  }

  #onPointerWheel(event: { getWheelDeltaX(): number; getWheelDeltaY(): number }) {
    if (this.#locked) return;
    // stop any in progress animations
    this.#stopSlidingPanelAnimations();

    const dx = event.getWheelDeltaX();
    const dy = event.getWheelDeltaY();
    const dxAbs = Math.abs(dx);
    const dyAbs = Math.abs(dy);
    let velocity;
    if (dyAbs * 0.5 > dxAbs) velocity = dy;
    else if (dxAbs > dyAbs) velocity = dx;
    else velocity = dx + dy;

    // a short grace period after the last wheel event
    if (this.#scrollingTimeoutId != null) clearTimeout(this.#scrollingTimeoutId);
    this.#scrollingTimeoutId = setTimeout(() => {
      this.#scrollingTimeoutId = null;
    }, 250);

    // reset sliding movement
    this.#velocityX = -velocity;
    this.#accelerationX = 0.0;
  }

  #currentOffset() {
    return -(this.#targetOffsetX != null ? this.#targetOffsetX : this.#offsetX);
  }

  #onPreviousPage() {
    if (this.#locked) return;
    // round the current offset to a page and go one page back
    const offset = this.#currentOffset();
    const pagePct =
      (this.#pageWidth * Math.ceil(offset / this.#pageWidth) - this.#pageWidth) / this.#range;
    this.#gotoSlidePct(pagePct, CONFIG.ANIMATE_MEDIUM_DURATION);
  }

  #onNextPage() {
    if (this.#locked) return;
    // round the current offset to a page and go one page on
    const offset = this.#currentOffset();
    const pagePct = (offset - (offset % this.#pageWidth) + this.#pageWidth) / this.#range;
    this.#gotoSlidePct(pagePct, CONFIG.ANIMATE_MEDIUM_DURATION);
  }

  #onPanelClick(item: PanelItem) {
    if (this.isEnabled(item)) this.select(item);
  }

  /* endregion EVENTS */

  /* region SELECT */

  /** The item of the sticky/snapped selection, if any. */
  get selectedItem(): PanelItem | null {
    if (this.#selectedId == null) return null;
    return this.items.find((i) => this.#idFor(i) === this.#selectedId) || null;
  }

  /**
   * Selects an item, as a click on its panel does. With sticky selection or
   * snapping, selecting the selected item again (or null) deselects it.
   */
  select(item: PanelItem | null) {
    if (!this.slidingPanelsStickySelection && !this.slidingPanelsSnap) {
      if (item) this.#emit('panel-select', { item });
      return;
    }

    let id = item != null ? this.#idFor(item) : null;
    if (id != null && this.#selectedId === id) id = null;
    if (this.#selectedId === id) return;

    // stop any in progress animations
    this.#stopSlidingPanelAnimations();

    const previous = this.selectedItem;
    if (previous != null && id == null) {
      // back to no selection: animate every panel back into place
      if (this.slidingPanelsSnap && this.items.length > 0) this.#unsnap();
      this.#emit('panel-deselect', { item: previous });
    }

    this.#selectedId = id;
    this.requestUpdate();

    if (id != null) {
      if (this.slidingPanelsSnap && this.items.length > 0) this.#snapTo(id);
      this.#emit('panel-select', { item: this.selectedItem });
    }
  }

  #animatePanel(data: PanelData, el: HTMLElement, y: number, targetX: number) {
    let timePct = 0.0;
    if (data.animation != null) {
      timePct = Number(data.animation.currentTime) / data.animation_duration || 0;
      data.animation.cancel();
    }
    data.source_x = data.source_x + (data.target_x - data.source_x) * timePct;
    data.target_x = targetX;
    data.animation_duration = this.slidingPanelsSnapDuration;
    data.animation = el.animate(
      [{ transform: translate(data.source_x, y) }, { transform: translate(data.target_x, y) }],
      { duration: this.slidingPanelsSnapDuration, fill: 'forwards', easing: 'ease-out' },
    );
    return data.animation;
  }

  #unsnap() {
    const panels = this.#panels();
    let finished = 0;
    const slidingVal = this.#range > 0 ? -this.#offsetX / this.#range : 0;
    for (const [id, el] of panels) {
      const data = this.#dataFor(id);
      const animation = this.#animatePanel(
        data,
        el,
        this.#centerY(data),
        data.x - this.#range * slidingVal,
      );
      animation.onfinish = () => {
        finished++;
        if (finished >= panels.length && this.#getCanSlide()) {
          // restart sliding
          this.#postSnapTimeoutId = setTimeout(() => {
            this.#postSnapTimeoutId = null;
            this.#startSlidingPanelsForUpdate();
          }, 250);
        }
      };
    }
  }

  #snapTo(selectedId: string) {
    // lock sliding
    this.#locked = true;
    if (this.#postSnapTimeoutId != null) {
      clearTimeout(this.#postSnapTimeoutId);
      this.#postSnapTimeoutId = null;
    }
    this.classList.remove('sliding');
    if (this.#range > 0) this.classList.remove('slides');
    this.classList.add('snapped');

    const panels = this.#panels();

    // position of the selected panel relative to the others
    let selectedX = -this.#choicesHorizontalPadding * 0.5;
    for (const [id] of panels) {
      if (id === selectedId) break;
      selectedX += this.#dataFor(id).outerWidth;
    }

    // animate all panels to the new offset
    let panelX = -selectedX;
    for (const [id, el] of panels) {
      const data = this.#dataFor(id);
      this.#animatePanel(data, el, this.#centerY(data), panelX);
      panelX += id === selectedId ? this.#selectedWidth(id, el) : data.outerWidth;
    }

    if (this.#range > 0) {
      this.#offsetX = Math.min(0.0, Math.max(-this.#range, -selectedX));
    }
  }

  #selectedWidth(id: string, el: HTMLElement) {
    const active = el.querySelector('.sliding-panel-active-content');
    return this.#dataFor(id).outerWidth + this.measure(active).outerWidth;
  }

  /* endregion SELECT */

  /* region SLIDING */

  #getCanSlide() {
    return this.#containerWidth < this.#totalViewsWidth && !this.#isEmptyView;
  }

  #stopSlidingPanelAnimations() {
    if (this.#animating) {
      for (const [id] of this.#panels()) {
        const data = this.#dataFor(id);
        if (data.animation != null) {
          data.animation.finish();
          data.animation = null;
        }
      }
      this.#animating = false;
    }
    this.#targetOffsetX = null;
    this.#sourceOffsetX = null;
    this.#targetDuration = null;
    this.#targetStartedAt = null;
  }

  #showSlidingPanels() {
    this.#stopSlidingPanelAnimations();

    this.#animating = true;
    this.#locked = true;
    const animationId = ++this.#animationId;
    if (this.#range > 0) this.classList.remove('slides');

    const panels = this.#panels();
    let delay = this.slidingPanelsShowDelay;
    let finished = 0;
    const onFinish = () => {
      if (!this.#animating || animationId !== this.#animationId) return;
      finished++;
      if (finished >= panels.length) {
        // every panel is in
        this.#animating = false;
        if (this.#getCanSlide() && (!this.slidingPanelsSnap || this.#selectedId == null)) {
          this.#startSlidingPanelsForUpdate();
        }
      }
    };

    for (const [id, el] of panels) {
      const data = this.#dataFor(id);
      const x = this.#isEmptyView ? 0.0 : data.x + this.#offsetX;
      const y = this.#centerY(data);
      if (data.animation != null) data.animation.cancel();

      // final position first, so a selection made during the show is right
      el.style.transform = 'translateX(' + x + 'px) translateY(' + y + 'px)';

      if (x >= -data.outerWidth && x <= this.#containerWidth + data.outerWidth) {
        const animation = this.slidingPanelShowAnimation(
          el,
          this.slidingPanelsShowDuration,
          delay,
          x,
          y,
        );
        data.animation = animation;
        const onfinish = animation.onfinish;
        animation.onfinish = (event) => {
          if (typeof onfinish === 'function') onfinish.call(animation, event);
          onFinish();
        };
        delay +=
          this.slidingPanelsShowStagger + Math.random() * this.slidingPanelsShowStaggerRandom;
      } else {
        // off screen: nothing to play
        onFinish();
      }
    }
    if (panels.length === 0) this.#animating = false;
  }

  /** Moves the panels to a fraction of the slide range, optionally over `duration` seconds. */
  #gotoSlidePct(pct: number, duration = 0.0) {
    if (!this.#getCanSlide()) return;
    pct = Math.max(0, Math.min(1, pct || 0));

    this.#stopSlidingPanelAnimations();
    this.#velocityX = 0.0;
    this.#accelerationX = 0.0;

    if (duration > 0.0) {
      this.#sourceOffsetX = this.#offsetX;
      this.#targetOffsetX = -this.#range * pct;
      this.#targetDuration = duration;
      this.#targetStartedAt = Date.now();
    } else {
      this.#offsetX = -this.#range * pct;
      this.#updateSlidingPanels();
    }
  }

  #startSlidingPanelsForUpdate() {
    if (this.#postSnapTimeoutId != null) {
      clearTimeout(this.#postSnapTimeoutId);
      this.#postSnapTimeoutId = null;
    }

    // one paused animation per panel, scrubbed by the slide value
    for (const [id, el] of this.#panels()) {
      const data = this.#dataFor(id);
      data.source_x = data.x;
      data.target_x = data.source_x - this.#range;
      data.animation_duration = 1.0;
      const y = this.#centerY(data);
      el.style.transform = '';
      if (data.animation != null) data.animation.cancel();
      data.animation = el.animate(
        [{ transform: translate(data.source_x, y) }, { transform: translate(data.target_x, y) }],
        { duration: data.animation_duration, fill: 'forwards' },
      );
      data.animation.pause();
    }

    this.#locked = false;
    if (this.#range > 0) this.classList.add('slides');
    this.#velocityX = 0.0;
    this.#accelerationX = 0.0;

    // one step to place the animations
    this.#stepSlidingPanels();
  }

  #scheduleUpdate() {
    if (this.#frameId != null) cancelAnimationFrame(this.#frameId);
    const frame = () => {
      this.#frameId = requestAnimationFrame(frame);
      this.#tick();
    };
    this.#frameId = requestAnimationFrame(frame);
  }

  #tick() {
    if (this.#targetOffsetX != null) {
      // animating the offset to a target: cubic in out
      const duration = this.#targetDuration! * 1000.0;
      const dt = Math.min(duration, Date.now() - this.#targetStartedAt!);
      const dx = this.#targetOffsetX - this.#sourceOffsetX!;
      let dte = dt / (duration * 0.5);
      if (dte < 1) {
        this.#offsetX = dx * 0.5 * (dte * dte * dte) + this.#sourceOffsetX!;
      } else {
        dte -= 2;
        this.#offsetX = dx * 0.5 * (dte * dte * dte + 2) + this.#sourceOffsetX!;
      }
      this.#updateSlidingPanels();
      if (dt === duration) this.#stopSlidingPanelAnimations();
    } else {
      this.#stepSlidingPanels();
    }
  }

  #stepSlidingPanels() {
    if (this.#locked || this.#range <= 0) return;
    this.#velocityX += this.#accelerationX;

    this.#lastOffsetX = this.#offsetX;
    this.#offsetX = Math.min(0.0, Math.max(-this.#range, this.#offsetX + this.#velocityX));
    this.#deltaX = this.#lastOffsetX - this.#offsetX;

    // sliding while accelerating and moving
    const isSliding = this.#accelerationX !== 0.0 && this.#deltaX !== 0.0;

    this.#velocityX *= this.slidingVelocityDecay;
    this.#updateSlidingPanels();
    this.classList.toggle('sliding', isSliding);
  }

  #updateSlidingPanels() {
    if (this.#range <= 0.0) return;
    const slidingVal = -this.#offsetX / this.#range;

    // start/end flags, with a little slop
    const slop = 0.025;
    if (slidingVal - slop <= 0.0) {
      this.#atStart = true;
      this.classList.add('slide-start');
    } else if (this.#atStart) {
      this.#atStart = false;
      this.classList.remove('slide-start');
    }
    if (slidingVal + slop >= 1.0) {
      this.#atEnd = true;
      this.classList.add('slide-end');
    } else if (this.#atEnd) {
      this.#atEnd = false;
      this.classList.remove('slide-end');
    }

    for (const [id] of this.#panels()) {
      const animation = this.#dataFor(id).animation;
      if (animation != null) animation.currentTime = slidingVal;
    }
  }

  /** Slide offset in px (≤ 0) and range; for tests and for subclasses' paging. */
  get slideState() {
    return { offsetX: this.#offsetX, range: this.#range, pageWidth: this.#pageWidth };
  }

  /* endregion SLIDING */

  /* region RENDER */

  render() {
    const empty = this.items.length === 0 && this.renderEmpty != null;
    return html`
      <div class="sliding-panel-select-content">
        <div class="sliding-panel-select-header">
          ${this.renderHeader != null ? this.renderHeader() : this.#renderTitle()}
        </div>
        <div class="sliding-panel-select-body">
          <div class="sliding-panel-select-choices">
            <ul class=${this.listClass ? `choices ${this.listClass}` : 'choices'}>
              ${
                empty
                  ? this.renderEmpty!()
                  : repeat(
                      this.items,
                      (item) => this.#idFor(item),
                      (item) => this.#renderPanel(item),
                    )
              }
            </ul>
            <div class="previous-page" @click=${this.#onPreviousPage}>
              <div class="btn btn-clean"></div>
            </div>
            <div class="next-page" @click=${this.#onNextPage}>
              <div class="btn btn-clean"></div>
            </div>
          </div>
        </div>
        ${this.renderFooter != null ? this.renderFooter() : nothing}
      </div>
    `;
  }

  #renderTitle() {
    return html`<div class="header-dashed-text sliding-panel-select-title">${this.heading}</div>`;
  }

  #renderPanel(item: PanelItem) {
    const id = this.#idFor(item);
    const classes = [
      'sliding-panel',
      this.panelClass(item),
      this.isEnabled(item) ? '' : 'disabled',
      id === this.#selectedId ? 'active' : '',
    ];
    return html`<li
      class=${classes.filter(Boolean).join(' ')}
      data-panel-id=${id}
      @mouseenter=${() => this.#emit('panel-hover', { item })}
      @click=${() => this.#onPanelClick(item)}
    >
      ${this.renderPanel(item)}
    </li>`;
  }

  /* endregion RENDER */
}

// guarded so a watch rebuild or a second import in a test does not throw
if (!customElements.get(TAG)) customElements.define(TAG, SlidingPanelSelect);
