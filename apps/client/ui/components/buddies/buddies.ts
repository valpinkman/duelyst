/*
 * <duelyst-buddies>: the buddy list modal - the list of buddies with its
 * search, add-buddy prompt, do-not-disturb toggle and last-opponent row, and
 * the selection region beside it (issue #86, docs/BACKBONE_REMOVAL_PLAN.md
 * §3.4). Mounted by apps/client/ui/shells/buddies_shell.ts.
 *
 * Properties in, events out: the shell reads the managers, owns which buddy
 * is selected and shows the selected buddy's shell (BuddySelectionShell) in
 * `.buddy-selection-host`, which this element renders empty and never fills.
 * The element binds the presence collection and renders one row per buddy
 * that matches the search. User actions leave as bubbling DOM events:
 *
 *   buddy-select        detail { userId }
 *   buddy-add           detail { username }  (answer with addBuddyDone() / addBuddyFailed())
 *   last-opponent-add
 *   do-not-disturb
 *   referral-open
 *   referral-redeem
 *
 * The markup is what the Marionette layout, the buddy list, its row template
 * and the empty selection view rendered, because styles/layouts/buddies.scss
 * selects on it. The old list pooled its rows; this one renders every
 * matching row at the same absolute offsets, so the list looks the same.
 */
import { LitElement, html, nothing } from 'lit';
import i18next from 'i18next';
// CommonJS module.exports: tsc sees no default export, the bundler and vitest
// both hand a default import its module.exports (§3.4)
// @ts-expect-error -- CommonJS module.exports, see above
import CONFIG from '@duelyst/common/config';
import RSX from '@duelyst/data/resources';
import { BackboneController } from '../backbone-controller';

export const TAG = 'duelyst-buddies';

/** what the row template's helpers resolved; set by the shell */
export interface BuddiesArt {
  profileIcon(portraitId: any): string | null | undefined;
  divisionClass(rank: number): string | null | undefined;
}

// the old list's row height, in unscaled px (getRowHeightForCache)
const ROW_HEIGHT = 65;
// how far the last-opponent row pushes the list down (showLastOpponentUI)
const LAST_OPPONENT_INSET = 71;
// how long the add-buddy result shows before the prompt resets and fades
const ADD_RESULT_MS = 1000;
// jQuery's default fadeOut
const FADE_MS = 400;

function imageForScale(path: string | null | undefined) {
  if (typeof path !== 'string') return '';
  return RSX.getResourcePathForScale(path, CONFIG.resourceScaleCSS);
}

export class Buddies extends LitElement {
  static properties = {
    presence: { attribute: false },
    art: { attribute: false },
    doNotDisturb: { type: Boolean },
    lastOpponentName: { attribute: false },
    showLastOpponent: { type: Boolean },
    lastOpponentInviteSent: { type: Boolean },
    controlsDimmed: { type: Boolean },
    showCallout: { type: Boolean },
    canRedeemReferral: { type: Boolean },
    _query: { state: true },
    _addOpen: { state: true },
    _addResult: { state: true },
    _addMessage: { state: true },
  };

  /** the buddies' presence models (Backbone collection), sorted by the manager */
  declare presence: any;
  declare art: BuddiesArt | null;
  declare doNotDisturb: boolean;
  /** the last multiplayer opponent's username, or null */
  declare lastOpponentName: string | null;
  /** the last opponent is not a buddy yet: offer to add them */
  declare showLastOpponent: boolean;
  declare lastOpponentInviteSent: boolean;
  /** the add-buddy controls sit at half opacity (a buddy is selected, or they lost focus) */
  declare controlsDimmed: boolean;
  /** the referral callout fills the selection region (nothing selected yet) */
  declare showCallout: boolean;
  declare canRedeemReferral: boolean;

  declare _query: string;
  declare _addOpen: boolean;
  /** null, 'done' or 'fail' */
  declare _addResult: string | null;
  declare _addMessage: string;

  #addPending = false;
  #listHeight = 0;

  constructor() {
    super();
    this.presence = null;
    this.art = null;
    this.doNotDisturb = false;
    this.lastOpponentName = null;
    this.showLastOpponent = false;
    this.lastOpponentInviteSent = false;
    this.controlsDimmed = false;
    this.showCallout = true;
    this.canRedeemReferral = false;
    this._query = '';
    this._addOpen = false;
    this._addResult = null;
    this._addMessage = '';
    new BackboneController(this, () => this.presence, 'add remove reset sort change');
  }

  // light DOM (§3.1): the Bootstrap-importing SCSS keeps applying
  createRenderRoot() {
    return this;
  }

  /* region API */

  /** the buddies the search matches, in the collection's order */
  get visibleBuddies(): any[] {
    if (this.presence == null) return [];
    const query = this._query;
    if (!query) return this.presence.models.slice();
    // as the old list's filter: the name lowercased, the query as typed
    return this.presence.filter(
      (model: any) => String(model.get('username')).toLowerCase().indexOf(query) >= 0,
    );
  }

  /**
   * Sizes the list container to the space under the controls, as the old
   * list did on show and on every resize.
   */
  measure() {
    const list = this.querySelector<HTMLElement>('.buddy-list');
    const container = this.querySelector<HTMLElement>('.buddy-list-container');
    const controls = this.querySelector<HTMLElement>('.buddy-controls');
    if (!list || !container || !controls) return;
    container.style.height = '';
    const scale = CONFIG.globalScale || 1;
    this.#listHeight = ((list.offsetHeight - controls.offsetHeight) / scale) * scale;
    container.style.height = this.#listHeight + 'px';
  }

  /** Scrolls the list so the buddy at `index` (in visibleBuddies) is on top. */
  scrollToIndex(index: number) {
    const container = this.querySelector<HTMLElement>('.buddy-list-container');
    if (!container) return;
    const inset = this.showLastOpponent ? LAST_OPPONENT_INSET : 0;
    container.scrollTop = inset + index * this.#rowHeight();
  }

  /** The invite went out: the prompt says so, then clears and closes. */
  addBuddyDone() {
    this._addResult = 'done';
    this._addMessage = 'Friend request sent!';
    this.#resetAddLater(true);
  }

  /** The invite failed: the prompt shows why, then closes. */
  addBuddyFailed(message: string) {
    this._addResult = 'fail';
    this._addMessage = message || 'User not found!';
    this.#resetAddLater(false);
  }

  /* endregion API */

  /* region ACTIONS */

  #emit(name: string, detail?: any) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
  }

  #rowHeight() {
    return ROW_HEIGHT * (CONFIG.globalScale || 1);
  }

  #onSearch = (e: Event) => {
    const query = (e.target as HTMLInputElement).value;
    if (query === this._query) return;
    this._query = query;
    // a new filter starts the list from the top, as bindAndReset did
    const container = this.querySelector<HTMLElement>('.buddy-list-container');
    if (container) container.scrollTop = 0;
  };

  #openAddPrompt = () => {
    this._addOpen = true;
    this.updateComplete.then(() => this.#addInput()?.focus());
  };

  #cancelAddPrompt = () => {
    this._addOpen = false;
    this.querySelector<HTMLInputElement>("input[type='search']")?.focus();
  };

  #addInput() {
    return this.querySelector<HTMLInputElement>('.add-buddy-input');
  }

  #onAddKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.#submitAdd();
    }
  };

  #submitAdd = () => {
    if (this.#addPending) return;
    const input = this.#addInput();
    const username = input ? input.value.trim() : '';
    if (!username) return;
    this.#addPending = true;
    this.#emit('buddy-add', { username });
  };

  #resetAddLater(clearInput: boolean) {
    setTimeout(() => {
      const input = this.#addInput();
      if (clearInput && input) input.value = '';
      this._addResult = null;
      this._addMessage = '';
      this.#addPending = false;
      this.#fadeOutAddPrompt();
    }, ADD_RESULT_MS);
  }

  #fadeOutAddPrompt() {
    const prompt = this.querySelector<HTMLElement>('.add-buddy-prompt');
    if (!this._addOpen || !prompt) return;
    // jQuery's fadeOut: fade, then hide and drop the opacity
    const fade =
      typeof prompt.animate === 'function'
        ? prompt.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: FADE_MS,
            easing: 'ease-in-out',
            fill: 'forwards',
          })
        : null;
    // cancel() below rejects `finished`: nothing waits on it
    fade?.finished.catch(() => {});
    setTimeout(() => {
      this._addOpen = false;
      this.updateComplete.then(() => fade?.cancel());
    }, FADE_MS);
  }

  // the old layout's focus / blur handlers on .buddies-controls
  #onControlsFocus = () => {
    this.controlsDimmed = false;
  };

  #onControlsBlur = () => {
    this.controlsDimmed = true;
  };

  /* endregion ACTIONS */

  /* region LIFECYCLE */

  firstUpdated() {
    this.measure();
    this.querySelector<HTMLInputElement>("input[type='search']")?.focus();
  }

  /* endregion LIFECYCLE */

  /* region RENDER */

  #renderRow(model: any, index: number) {
    const status = model.getStatus();
    const rank = model.get('rank');
    const rankText = rank === undefined || rank === null ? '?' : rank;
    const classes = ['buddy', 'buddy-preview', status];
    if (typeof rank === 'number' && this.art) {
      const division = this.art.divisionClass(rank);
      if (division) classes.push(String(division).toLowerCase());
    }
    if (model.get('_active')) classes.push('active');
    if (model.get('_unread')) classes.push('unread');
    const portrait = this.art ? this.art.profileIcon(model.get('portrait_id')) : null;
    return html`<div
      class=${classes.filter(Boolean).join(' ')}
      data-index=${index}
      style="transform: translateY(${index * this.#rowHeight()}px);"
      @click=${() => this.#emit('buddy-select', { userId: model.userId })}
    >
      <div class="buddy-profile">
        <img class="portrait" src=${imageForScale(portrait)} />
        <div class="details">
          <div class="username-block">${model.get('username')}</div>
          <div class="status-block">
            <span class="status-label">${i18next.t('buddy_list.status_' + status)}</span>
          </div>
        </div>
        <div class="details-aside">
          <div class="unread-indicator">
            <i class="fa fa-comment"></i><i class="fa fa-exclamation"></i>
          </div>
          <div class="rank">${rankText}</div>
        </div>
      </div>
    </div>`;
  }

  #renderList() {
    const buddies = this.visibleBuddies;
    const lastPlayedClass = this.showLastOpponent
      ? this.lastOpponentInviteSent
        ? 'last-played active invite-sent'
        : 'last-played active'
      : 'last-played';
    const controlsStyle = this.controlsDimmed ? 'opacity: 0.5;' : '';
    const addResultClass = this._addResult ? ' ' + this._addResult : '';
    return html`<div class="buddy-list">
      <div class="buddy-controls">
        <div class="buddy-controls-header">
          <button class="btn-borderless add-buddy lowercase" @click=${this.#openAddPrompt}>
            <i class="fa fa-plus-circle"></i> ${i18next.t('buddy_list.action_add_buddy')}
          </button>
          <button
            class=${
              this.doNotDisturb
                ? 'btn-borderless do-not-disturb lowercase active'
                : 'btn-borderless do-not-disturb lowercase'
            }
            @click=${() => this.#emit('do-not-disturb')}
          >
            <i class="fa fa-bell"></i><i class="fa fa-bell-slash"></i>
            ${i18next.t('buddy_list.action_do_not_disturb')}
          </button>
        </div>
        <div class="search">
          <input
            type="search"
            class="form-control"
            placeholder=${i18next.t('common.search_input_label')}
            @keyup=${this.#onSearch}
          />
          <span class="fa fa-search"></span>
        </div>
      </div>
      <div class="buddy-list-container">
        <div class=${lastPlayedClass}>
          <span class="label lowercase">${i18next.t('buddy_list.last_opponent')}:</span>
          <span class="username">${this.lastOpponentName ?? ''}</span>
          <button class="btn btn-add-last-played" @click=${() => this.#emit('last-opponent-add')}>
            <i class="fa fa-plus-circle"></i>
          </button>
          <span class="sent"><i class="fa fa-check"></i></span>
        </div>
        <div class="buddy-list-items" style="height: ${buddies.length * this.#rowHeight()}px;">
          ${buddies.map((model, index) => this.#renderRow(model, index))}
        </div>
      </div>

      <div class="add-buddy-prompt" style=${this._addOpen ? 'display: block;' : ''}>
        <div>
          <div
            class="btn-group buddies-controls"
            style=${controlsStyle}
            @focusin=${this.#onControlsFocus}
            @focusout=${this.#onControlsBlur}
          >
            <input
              type="text"
              class=${'add-buddy-input' + addResultClass}
              placeholder=${i18next.t('buddy_list.add_buddy_instructions')}
              @keyup=${this.#onAddKeyUp}
            />
          </div>
          <div
            class="btn-group buddies-controls"
            style=${controlsStyle}
            @focusin=${this.#onControlsFocus}
            @focusout=${this.#onControlsBlur}
          >
            <button
              class="btn btn-clean btn-clean-cancel add-buddy-cancel uppercase"
              type="button"
              @click=${this.#cancelAddPrompt}
            >
              ${i18next.t('common.default_confirm_dialog_button_cancel_label')}
            </button>
            <button
              class=${'btn btn-clean btn-clean-secondary add-buddy-submit uppercase' + addResultClass}
              type="button"
              @click=${this.#submitAdd}
            >
              ${
                this._addResult
                  ? this._addMessage
                  : html`${i18next.t('buddy_list.action_add_buddy')}
                      <i class="fa fa-plus-circle"></i>`
              }
            </button>
          </div>
        </div>
      </div>
    </div>`;
  }

  #renderCallout() {
    return html`<div class="buddy-selection-empty">
      <h1>${i18next.t('buddy_list.referral_program_callout_title')}</h1>
      <p>${i18next.t('buddy_list.referral_program_callout_message')}</p>
      <button
        id="open_referral_program"
        class="btn btn-clean btn-clean-primary"
        @click=${() => this.#emit('referral-open')}
      >
        ${i18next.t('buddy_list.referral_program_button_label')}
      </button>
      <button
        id="claim_referral_code"
        class=${this.canRedeemReferral ? '' : 'hide'}
        @click=${() => this.#emit('referral-redeem')}
      >
        <i class="fa fa-gift"></i> ${i18next.t('buddy_list.referral_program_redeem_button_label')}
      </button>
    </div>`;
  }

  render() {
    return html`<div class="modal-dialog">
      <button type="button" class="btn btn-clean btn-user-cancel btn-cancel-primary"></button>
      <div class="modal-content">
        <div class="modal-body">
          <div class="buddy-list-region">${this.#renderList()}</div>
          <div class="buddy-selection-region">
            ${this.showCallout ? this.#renderCallout() : nothing}
            <div class="buddy-selection-host"></div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* endregion RENDER */
}

if (!customElements.get(TAG)) customElements.define(TAG, Buddies);
