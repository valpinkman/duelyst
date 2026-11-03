/*
 * <duelyst-buddy-selection>: the selected buddy in the buddy list - their name
 * and status, the invite / spectate / profile / remove buttons, and the chat
 * conversation with them (issue #83, docs/BACKBONE_REMOVAL_PLAN.md §3.4).
 * Mounted by apps/client/ui/shells/buddy_selection_shell.ts inside the buddy
 * list's selection region.
 *
 * Properties in, events out: the shell reads ChatManager for what the buttons
 * may do and starts the conversation; this element never imports a manager.
 * It binds the buddy's presence model (name, status) and the conversation's
 * messages collection. User actions leave as bubbling DOM events:
 *
 *   buddy-profile
 *   buddy-spectate
 *   buddy-invite
 *   buddy-remove
 *   message-send   detail { message }   (only with text; the input is cleared)
 *   replay-share   detail { message }   (the input's text, kept)
 *   replay-watch   detail { gameId, userId }
 *
 * The markup is what the Marionette layout, its conversation composite and the
 * message item views rendered, because styles/layouts/buddies.scss selects on
 * it. The element itself is the old layout root (`.buddy.buddy-selection` and
 * the status class); the shell's own root is `display: contents`.
 */
import { LitElement, html, nothing } from 'lit';
import i18next from 'i18next';
// CommonJS module.exports: tsc sees no default export, the bundler and vitest
// both hand a default import its module.exports (§3.4)
// @ts-expect-error -- CommonJS module.exports, see above
import CONFIG from '@duelyst/common/config';
import RSX from '@duelyst/data/resources';
import { BackboneController } from '../backbone-controller';

export const TAG = 'duelyst-buddy-selection';

const INVITE_ICON = 'resources/ui/icon_invite.png';

/** Resolves what a shared replay message names; set by the shell. */
export interface BuddySelectionArt {
  generalPortrait(generalId: any): string | null | undefined;
}

function imageForScale(path: string | null | undefined) {
  if (typeof path !== 'string') return '';
  return RSX.getResourcePathForScale(path, CONFIG.resourceScaleCSS);
}

export class BuddySelection extends LitElement {
  static properties = {
    model: { attribute: false },
    conversation: { attribute: false },
    myUserId: { attribute: false },
    showSpectate: { type: Boolean },
    canSpectate: { type: Boolean },
    canInvite: { type: Boolean },
    chatEnabled: { type: Boolean },
    art: { attribute: false },
  };

  /** the buddy's presence (Backbone): username, status, `userId` */
  declare model: any;
  /** the conversation with the buddy (Backbone), with its `messages`; null until chat connects */
  declare conversation: any;
  /** the player's own id: their messages are `.from-me` */
  declare myUserId: string | null;
  /** the buddy is in a game: spectate replaces invite */
  declare showSpectate: boolean;
  declare canSpectate: boolean;
  declare canInvite: boolean;
  /** chat is connected and the buddy is online */
  declare chatEnabled: boolean;
  declare art: BuddySelectionArt | null;

  #scrollPending = false;
  #messageCount = 0;

  constructor() {
    super();
    this.model = null;
    this.conversation = null;
    this.myUserId = null;
    this.showSpectate = false;
    this.canSpectate = false;
    this.canInvite = false;
    this.chatEnabled = false;
    this.art = null;
    new BackboneController(this, () => this.model, 'change');
    new BackboneController(
      this,
      () => (this.conversation ? this.conversation.messages : null),
      'add remove reset change',
    );
  }

  // light DOM (§3.1): the Bootstrap-importing SCSS keeps applying
  createRenderRoot() {
    return this;
  }

  /* region ACTIONS */

  #emit(name: string, detail?: any) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
  }

  #input(): HTMLInputElement | null {
    return this.querySelector('.chat-input');
  }

  #onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.#send();
    }
  };

  #send = () => {
    const input = this.#input();
    const message = input ? input.value : '';
    if (message) {
      input!.value = '';
      this.#emit('message-send', { message });
    }
  };

  #shareReplay = () => {
    const input = this.#input();
    this.#emit('replay-share', { message: input ? input.value : '' });
  };

  #watchReplay(message: any, e: Event) {
    e.preventDefault();
    this.#emit('replay-watch', { gameId: message.get('gameId'), userId: message.get('fromId') });
  }

  /* endregion ACTIONS */

  /* region LIFECYCLE */

  willUpdate(changed: Map<string, unknown>) {
    // a new conversation, or a message added to it, scrolls the list to the
    // bottom, as the composite's onShow and onAddChild did
    const count = this.conversation?.messages ? this.conversation.messages.length : 0;
    if (changed.has('conversation') || count > this.#messageCount) this.#scrollPending = true;
    this.#messageCount = count;
    // the element is the old layout root: its classes carry the status
    const status = this.model ? this.model.getStatus() : null;
    this.className = ['buddy', 'buddy-selection', status].filter(Boolean).join(' ');
  }

  updated() {
    if (!this.#scrollPending) return;
    this.#scrollPending = false;
    const list = this.querySelector('.messages-list');
    if (list) list.scrollTop = list.scrollHeight;
  }

  /* endregion LIFECYCLE */

  /* region RENDER */

  #renderMessage(message: any) {
    const fromMe = this.myUserId != null && message.get('fromId') == this.myUserId;
    const gameId = message.get('gameId');
    const generalId = message.get('generalId');
    const portrait = gameId && this.art ? this.art.generalPortrait(generalId) : null;
    return html`<li class=${fromMe ? 'message from-me' : 'message'}>
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
                @click=${(e: Event) => this.#watchReplay(message, e)}
              >
                WATCH
              </button>
            </div>`
          : nothing
      }
    </li>`;
  }

  #renderConversation() {
    const messages = this.conversation.messages;
    return html`<div class="conversation">
      <ul class="messages-list">
        ${messages ? messages.map((m: any) => this.#renderMessage(m)) : nothing}
      </ul>
      <div class=${this.chatEnabled ? 'current-message' : 'current-message disabled'}>
        <input
          type="text"
          class="form-control chat-input"
          placeholder=${i18next.t('buddy_list.message_input_instructions')}
          @keydown=${this.#onKeyDown}
        />
        <div class="btn-group dropup">
          <button class="btn btn-panel send" type="button" @click=${this.#send}>
            ${i18next.t('buddy_list.action_send_message')}
          </button>
          <button
            type="button"
            class="btn btn-panel dropdown-toggle"
            data-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
          >
            <span class="caret"></span>
            <span class="sr-only">Toggle Dropdown</span>
          </button>
          <ul class="dropdown-menu">
            <li>
              <a id="share_replay" href="javascript:void(0)" @click=${this.#shareReplay}
                >${i18next.t('buddy_list.action_share_replay')}</a
              >
            </li>
          </ul>
        </div>
      </div>
    </div>`;
  }

  render() {
    if (this.model == null) return nothing;
    const status = this.model.getStatus();
    return html`<div class="buddy-profile">
        <div class="status-icon"></div>

        <div class="details">
          <div class="username-block">${this.model.get('username')}</div>
          <div class="status-block">
            <span class="status-label">${i18next.t('buddy_list.status_' + status)}</span>
          </div>
        </div>

        <div class="btn-group action-menu">
          <button
            class="btn btn-clean btn-clean-icon user-profile"
            @click=${() => this.#emit('buddy-profile')}
          >
            <i class="fa fa-user"></i>
          </button>
          <button
            class=${
              this.canSpectate
                ? 'btn btn-clean btn-clean-primary spectate-game'
                : 'btn btn-clean btn-clean-primary spectate-game disabled'
            }
            style=${this.showSpectate ? '' : 'display: none;'}
            @click=${() => this.#emit('buddy-spectate')}
          >
            ${i18next.t('buddy_list.action_spectate')}
          </button>
          <button
            class=${
              this.canInvite
                ? 'btn btn-clean btn-clean-primary invite-buddy-to-game'
                : 'btn btn-clean btn-clean-primary invite-buddy-to-game disabled'
            }
            style=${this.showSpectate ? 'display: none;' : ''}
            @click=${() => this.#emit('buddy-invite')}
          >
            ${i18next.t('buddy_list.action_challenge')} <img src=${imageForScale(INVITE_ICON)} />
          </button>
          <button
            class="btn btn-clean btn-clean-icon remove-buddy"
            @click=${() => this.#emit('buddy-remove')}
          >
            <i class="fa fa-trash-o"></i>
          </button>
        </div>
      </div>

      <div class="conversation-region">
        ${this.conversation ? this.#renderConversation() : nothing}
      </div>`;
  }

  /* endregion RENDER */
}

if (!customElements.get(TAG)) customElements.define(TAG, BuddySelection);
