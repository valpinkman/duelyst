/*
 * <duelyst-notifications>: the always-mounted notifications overlay - the
 * main list top left (system notifications and buddy invites, with their
 * dismiss and call-to-action buttons), the buddy message bubbles bottom right
 * and the quest progress banners in the middle (issue #88,
 * docs/BACKBONE_REMOVAL_PLAN.md §3.4). Mounted by
 * apps/client/ui/shells/notifications_shell.ts.
 *
 * Properties in, events out: the shell hands over the three Backbone
 * collections (the main one already merged with the buddy invites) and owns
 * every timer, sound and manager call. The element binds the collections and
 * renders one row per model, keyed by the model, so a row's CSS entrance
 * animation runs once and is not restarted by a later add. User actions leave
 * as bubbling DOM events:
 *
 *   notification-dismiss  detail { cid }   (main and quest rows)
 *   notification-cta      detail { cid }   (main rows with a ctaTitle)
 *   message-select        detail { cid }   (a click on a message bubble)
 *   replay-watch          detail { gameId, userId }   (WATCH on a shared replay)
 *
 * The markup is what the Marionette layout, its three composite views and
 * their item views rendered, because styles/item/notifications.scss selects
 * on it: each region div holds the composite's root, which holds
 * `.notifications`, which holds the rows.
 */
import { LitElement, html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
// CommonJS module.exports: tsc sees no default export, the bundler and vitest
// both hand a default import its module.exports (§3.4)
// @ts-expect-error -- CommonJS module.exports, see above
import CONFIG from '@duelyst/common/config';
import RSX from '@duelyst/data/resources';
import { BackboneController } from '../backbone-controller';

export const TAG = 'duelyst-notifications';

/** what the message template's helpers resolved; set by the shell */
export interface NotificationsArt {
  generalPortrait(generalId: any): string | null | undefined;
  /** the player's own id: their messages are `.from-me` */
  myUserId(): any;
}

const EVENTS = 'add remove reset sort change';

// jQuery's `swing`, which the old fadeOut used: 0.5 - cos(p * PI) / 2
const SWING = 'cubic-bezier(0.37, 0, 0.63, 1)';

function imageForScale(path: string | null | undefined) {
  if (typeof path !== 'string') return '';
  return RSX.getResourcePathForScale(path, CONFIG.resourceScaleCSS);
}

export class Notifications extends LitElement {
  static properties = {
    main: { attribute: false },
    messages: { attribute: false },
    quests: { attribute: false },
    art: { attribute: false },
  };

  /** main notifications and buddy invites, invites last (Backbone collection) */
  declare main: any;
  /** buddy message notifications (Backbone collection) */
  declare messages: any;
  /** quest progress notifications (Backbone collection) */
  declare quests: any;
  declare art: NotificationsArt | null;

  constructor() {
    super();
    this.main = null;
    this.messages = null;
    this.quests = null;
    this.art = null;
    new BackboneController(this, () => this.main, EVENTS);
    new BackboneController(this, () => this.messages, EVENTS);
    new BackboneController(this, () => this.quests, EVENTS);
  }

  // light DOM (§3.1): the Bootstrap-importing SCSS keeps applying
  createRenderRoot() {
    return this;
  }

  /* region API */

  /** The row element rendered for a model, or null. */
  rowFor(model: any): HTMLElement | null {
    if (model == null) return null;
    return this.querySelector<HTMLElement>(`[data-cid="${model.cid}"]`);
  }

  /**
   * Fades a row out as the old composites' jQuery fadeOut did (opacity to 0
   * with `swing`, then hidden). Resolves when it is done, at once when the
   * row is not rendered.
   */
  fadeOut(model: any, ms: number): Promise<void> {
    const row = this.rowFor(model);
    if (row == null || ms <= 0 || typeof row.animate !== 'function') {
      if (row != null) row.style.display = 'none';
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const animation = row.animate([{ opacity: getComputedStyle(row).opacity }, { opacity: 0 }], {
        duration: ms,
        easing: SWING,
        fill: 'forwards',
      });
      const done = () => {
        row.style.display = 'none';
        resolve();
      };
      animation.onfinish = done;
      animation.oncancel = done;
    });
  }

  /* endregion API */

  /* region EVENTS */

  #emit(name: string, detail: any) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  #onWatch(message: any, e: Event) {
    // the old item view returned false: the click does not select the message
    e.preventDefault();
    e.stopPropagation();
    this.#emit('replay-watch', { gameId: message.get('gameId'), userId: message.get('fromId') });
  }

  /* endregion EVENTS */

  /* region RENDER */

  #models(collection: any): any[] {
    return collection ? collection.models : [];
  }

  #renderMain(model: any) {
    const ctaTitle = model.get('ctaTitle');
    const cid = model.cid;
    return html`<div class="notification" data-cid=${cid}>
      <div class="clearfix">
        <span class="pull-left"> ${model.get('message')} </span>
        <a class="pull-right dismiss" @click=${() => this.#emit('notification-dismiss', { cid })}
          ><i class="fa fa-times"></i
        ></a>
        ${
          ctaTitle
            ? html`<a
                class="btn pull-right cta-button"
                @click=${() => this.#emit('notification-cta', { cid })}
                >${ctaTitle}</a
              >`
            : nothing
        }
      </div>
    </div>`;
  }

  #renderMessage(message: any) {
    const myUserId = this.art ? this.art.myUserId() : null;
    const fromMe = myUserId != null && message.get('fromId') == myUserId;
    const gameId = message.get('gameId');
    const generalId = message.get('generalId');
    const portrait = gameId && this.art ? this.art.generalPortrait(generalId) : null;
    return html`<li
      class=${fromMe ? 'message from-me' : 'message'}
      data-cid=${message.cid}
      @click=${() => this.#emit('message-select', { cid: message.cid })}
    >
      <div class="arrow"></div>
      <div class="message-content">${message.get('body')}</div>
      ${
        gameId
          ? html`<div class="game-info">
              <div
                class="faction-general general-${generalId}"
                style="background-image: url(${imageForScale(portrait)})"
              ></div>
              <button
                class="btn-watch-replay"
                type="button"
                @click=${(e: Event) => this.#onWatch(message, e)}
              >
                WATCH
              </button>
            </div>`
          : nothing
      }
    </li>`;
  }

  #renderQuest(model: any) {
    const params = model.get('params');
    const cid = model.cid;
    return html`<div class="notification quest-notification" data-cid=${cid}>
      <h2 class="title">${model.get('title') || 'Daily Quest'}</h2>
      <p class="instructions">${model.get('quest_instructions')}</p>
      <div class="progress">
        ${model.get('progress')} / ${params ? params.completionProgress : ''}
      </div>
      <button class="dismiss" @click=${() => this.#emit('notification-dismiss', { cid })}></button>
    </div>`;
  }

  render() {
    return html`<div id="app-main-notifications-region">
        <div id="app-main-notifications">
          <div class="notifications">
            ${repeat(
              this.#models(this.main),
              (m: any) => m.cid,
              (m: any) => this.#renderMain(m),
            )}
          </div>
        </div>
      </div>
      <div id="app-message-notifications-region">
        <div id="app-message-notifications">
          <div class="notifications">
            ${repeat(
              this.#models(this.messages),
              (m: any) => m.cid,
              (m: any) => this.#renderMessage(m),
            )}
          </div>
        </div>
      </div>
      <div id="app-quest-notifications-region">
        <div id="app-quest-notifications">
          <div class="notifications">
            ${repeat(
              this.#models(this.quests),
              (m: any) => m.cid,
              (m: any) => this.#renderQuest(m),
            )}
          </div>
        </div>
      </div>`;
  }

  /* endregion RENDER */
}

if (!customElements.get(TAG)) customElements.define(TAG, Notifications);
