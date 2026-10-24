/*
 * <duelyst-watch>: the watch screen, replays by division and live streams
 * (issue #63, docs/BACKBONE_REMOVAL_PLAN.md §3.4). Mounted by
 * apps/client/ui/shells/watch_shell.ts.
 *
 * Properties in, events out: the shell loads the collections and owns which
 * tab is selected; this element never imports a manager. User actions leave
 * as bubbling DOM events:
 *
 *   watch-select  detail { type: 'live' } | { type: 'replays', division? }
 *   replay-watch  detail { gameId, playerId }
 *   stream-open   detail { url, name }
 *   game-render   detail { id, units: [{ cardId, el }], done }
 *                 a replay row was rendered: the shell loads its key cards,
 *                 draws each sprite into `el`, then calls done() and the row
 *                 is revealed. A row stays hidden until then, as before.
 *
 * The markup is what the Marionette layout, its two composites and their
 * item, empty and loading views rendered, collapsed into one template,
 * because styles/layouts/watch.scss selects on it.
 */
import { LitElement, html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import i18next from 'i18next';
// CommonJS module.exports: tsc sees no default export, the bundler and vitest
// both hand a default import its module.exports (§3.4)
// @ts-expect-error -- CommonJS module.exports, see above
import CONFIG from '@duelyst/common/config';
import RSX from '@duelyst/data/resources';
import { BackboneController } from '../backbone-controller';

export const TAG = 'duelyst-watch';

export const DIVISIONS = ['bronze', 'silver', 'gold', 'diamond', 'elite'];

export type WatchType = 'live' | 'replays';

/** Resolves the ids a replay row carries to image paths; set by the shell. */
export interface WatchArt {
  profileIcon(portraitId: any): string | null | undefined;
  generalPortrait(generalId: any): string | null | undefined;
}

const EASING = 'cubic-bezier(0.39, 0.575, 0.565, 1)';
// Animations.fadeZoomUpIn(200, delay, 0, 0, 0.9), as the composites used it
const ZOOM_UP = [
  { opacity: 0.0, transform: 'translateX(0px) translateY(0px) scale(0.9)' },
  { opacity: 1.0, transform: 'translateX(0px) translateY(0px) scale(1.0)' },
];
const REVEAL_MS = 200;
const STAGGER_MS = 100;

function imageForScale(path: string | null | undefined) {
  if (typeof path !== 'string') return '';
  return RSX.getResourcePathForScale(path, CONFIG.resourceScaleCSS);
}

export class Watch extends LitElement {
  static properties = {
    selectedType: { attribute: false },
    selectedDivision: { attribute: false },
    loading: { type: Boolean },
    liveAvailable: { type: Boolean },
    streams: { attribute: false },
    games: { attribute: false },
    readGameIds: { attribute: false },
    art: { attribute: false },
  };

  declare selectedType: WatchType | null;
  declare selectedDivision: string | null;
  /** show the loading view in place of the list */
  declare loading: boolean;
  /** any stream was live when the screen opened: lights the live tab's marker */
  declare liveAvailable: boolean;
  /** the live stream collection (Backbone) */
  declare streams: any;
  /** the selected division's replay collection (Backbone), or null */
  declare games: any;
  declare readGameIds: string[];
  declare art: WatchArt | null;

  #animations: Animation[] = [];
  // rows already handed to the shell, and the list the reveal last ran for
  #rendered = new WeakSet<Element>();
  #revealed: unknown = null;

  constructor() {
    super();
    this.selectedType = null;
    this.selectedDivision = null;
    this.loading = false;
    this.liveAvailable = false;
    this.streams = null;
    this.games = null;
    this.readGameIds = [];
    this.art = null;
    new BackboneController(this, () => this.streams, 'add remove reset change sort');
    new BackboneController(this, () => this.games, 'add remove reset change sort');
  }

  // light DOM (§3.1): the Bootstrap-importing SCSS keeps applying
  createRenderRoot() {
    return this;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    for (const animation of this.#animations) animation.cancel();
    this.#animations = [];
    this.#revealed = null;
  }

  /** The list on screen: the stream or replay collection, or null while loading. */
  #shownList() {
    if (this.loading) return null;
    return this.selectedType === 'live' ? this.streams : this.games;
  }

  updated() {
    const list = this.#shownList();
    // the composites revealed their children once, when shown
    if (list != null && list !== this.#revealed) {
      this.#revealed = list;
      let delay = 0;
      for (const el of this.querySelectorAll('.watch-stream-item, .watch-games-empty')) {
        this.#animate(el as HTMLElement, delay);
        delay += STAGGER_MS;
      }
    } else if (list == null) {
      this.#revealed = null;
    }
    this.#prepareGameRows();
  }

  /* region ACTIONS */

  #animate(el: HTMLElement, delay: number) {
    const animation = el.animate(ZOOM_UP, {
      duration: REVEAL_MS,
      delay,
      easing: EASING,
      fill: 'both',
    });
    this.#animations.push(animation);
  }

  // every newly rendered replay row waits, hidden, for the shell to draw its
  // key units; the stagger follows the row's place in the list
  #prepareGameRows() {
    const rows = [...this.querySelectorAll<HTMLElement>('.watch-game-item')];
    rows.forEach((row, index) => {
      if (this.#rendered.has(row)) return;
      this.#rendered.add(row);
      row.style.opacity = '0';
      const units = [...row.querySelectorAll<HTMLElement>('ul.key-units li')].map((li) => ({
        cardId: Number(li.dataset.cardId),
        el: li.querySelector('.sprite') as HTMLElement,
      }));
      let settled = false;
      this.dispatchEvent(
        new CustomEvent('game-render', {
          bubbles: true,
          detail: {
            id: row.dataset.gameId,
            units,
            done: () => {
              if (settled || !row.isConnected) return;
              settled = true;
              this.#animate(row, index * STAGGER_MS);
            },
          },
        }),
      );
    });
  }

  #select(detail: { type: WatchType; division?: string }) {
    this.dispatchEvent(new CustomEvent('watch-select', { bubbles: true, detail }));
  }

  #onWatch(e: Event, gameId: string, playerId: string) {
    e.preventDefault();
    this.dispatchEvent(
      new CustomEvent('replay-watch', { bubbles: true, detail: { gameId, playerId } }),
    );
  }

  #onOpenStream(e: Event, url: string, name: string) {
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('stream-open', { bubbles: true, detail: { url, name } }));
  }

  /* endregion ACTIONS */

  /* region RENDER */

  render() {
    const live = this.selectedType === 'live';
    const replays = this.selectedType === 'replays';
    return html`
      <div class="modal-dialog">
        <button type="button" class="btn btn-clean btn-user-cancel btn-cancel-primary"></button>
        <div class="modal-content">
          <div class="modal-header">
            <ul id="watch_tabs_type" class="nav nav-tabs">
              <li
                id="live_streams_tab_item"
                role="select"
                data-value="live"
                class="${live ? 'active' : ''} ${this.liveAvailable ? 'any-live' : ''}"
                @click=${() => this.#select({ type: 'live' })}
              >
                <a><i class="fa fa-circle"></i> ${i18next.t('watch.live_streams_label')}</a>
              </li>
              <li
                role="select"
                data-value="replays"
                class=${replays ? 'active' : ''}
                @click=${() => this.#select({ type: 'replays' })}
              >
                <a>${i18next.t('watch.replays_label')}</a>
              </li>
            </ul>
            <div id="watch_tabs_division_container">
              <h2>${i18next.t('rank.division')}:</h2>
              <ul id="watch_tabs_division" class="nav nav-tabs">
                ${DIVISIONS.map(
                  (division) =>
                    html`<li
                      role="select"
                      data-value=${division}
                      class="${division} ${
                        replays && this.selectedDivision === division ? 'active' : ''
                      }"
                      @click=${() => this.#select({ type: 'replays', division })}
                    >
                      <a>${i18next.t(`rank.${division}_division_name`)}</a>
                    </li>`,
                )}
              </ul>
            </div>
          </div>
          <div class="modal-body clearfix">
            <div class="content-region">${this.#renderContent()}</div>
          </div>
          <div class="modal-footer"></div>
        </div>
      </div>
    `;
  }

  #renderContent() {
    if (this.loading) {
      return html`<div class="watch-games-loading">
        <div class="activity-animation"><div class="activity-animation-image"></div></div>
        <h1>Loading...</h1>
      </div>`;
    }
    if (this.selectedType === 'live') {
      if (this.streams == null) return nothing;
      return html`<div id="watch_streams_collection">
        <div class="watch-streams-list">
          ${
            this.streams.length
              ? repeat(
                  this.streams.models,
                  (model: any) => model.cid,
                  (model: any) => this.#renderStream(model.toJSON()),
                )
              : this.#renderEmpty()
          }
        </div>
      </div>`;
    }
    if (this.selectedType === 'replays' && this.games != null) {
      return html`<div id="watch_games_collection">
        <div class="watch-game-list">
          ${
            this.games.length
              ? repeat(
                  this.games.models,
                  (model: any) => model.id,
                  (model: any) => this.#renderGame(model.toJSON()),
                )
              : this.#renderEmpty()
          }
        </div>
      </div>`;
    }
    return nothing;
  }

  #renderEmpty() {
    return html`<div class="watch-games-empty">
      <h1>${i18next.t('watch.empty_division_replays_message')}</h1>
    </div>`;
  }

  #renderPlayer(game: any, n: 1 | 2) {
    const art = this.art;
    const profileIcon = art ? art.profileIcon(game[`player_${n}_profile_picture_id`]) : null;
    const general = art ? art.generalPortrait(game[`player_${n}_general_id`]) : null;
    const keyCards: any[] = game[`player_${n}_key_cards`] || [];
    return html`<div class="player p${n}">
      <div class="player-avatar">
        <img class="profile-icon" src=${imageForScale(profileIcon)} />
        <span class="username">${game[`player_${n}_username`]}</span>
        <span class="division ${game.division}"
          ><span class="colored">${game.division}</span> division</span
        >
      </div>
      <div class="general-portrait" style="background-image: url(${imageForScale(general)})"></div>
      <ul class="key-units">
        ${keyCards.map((cardId) => html`<li data-card-id=${cardId}><div class="sprite"></div></li>`)}
      </ul>
      <div class="deck-spirit-cost">Deck Spirit Value: 1023</div>
    </div>`;
  }

  #renderGame(game: any) {
    const read = this.readGameIds.includes(game.id);
    return html`<div class="watch-game-item ${read ? 'read' : ''}" data-game-id=${game.id}>
      <div class="matchup-details clearfix">
        ${this.#renderPlayer(game, 1)} ${this.#renderPlayer(game, 2)}
        <button
          type="button"
          class="btn btn-clean btn-clean-secondary watch player-1"
          @click=${(e: Event) => this.#onWatch(e, game.id, game.player_1_id)}
        >
          WATCH
        </button>
        <button
          type="button"
          class="btn btn-clean btn-clean-secondary watch player-2"
          @click=${(e: Event) => this.#onWatch(e, game.id, game.player_2_id)}
        >
          WATCH
        </button>
      </div>
      <div class="game-stats">
        <div class="duration">7:32</div>
      </div>
    </div>`;
  }

  #renderStream(stream: any) {
    const online = stream.streamData && stream.streamData.stream;
    const tooltip = i18next.t('watch.opens_in_browser_tooltip');
    const open = (e: Event) => this.#onOpenStream(e, stream.url, stream.name || '');
    return html`<div class="watch-stream-item">
      <div class="stream-preview ${online ? '' : 'offline'}">
        <div class="thumbnail-preview ${online ? 'online' : 'offline'}">
          <a href=${stream.url} title=${tooltip} @click=${open}>
            <img src=${online ? online.preview.large : ''} />
          </a>
          ${
            online
              ? html`<div class="live-icon">
                  <i class="fa fa-circle"></i> ${i18next.t('watch.stream_live_message')}
                </div>`
              : html`<div class="offline-icon">
                  <i class="fa fa-circle-o"></i> ${i18next.t('watch.stream_offline_message')}
                </div>`
          }
        </div>
        <div class="stream-details">
          <div class="name"><img src=${stream.avatar_image_url} width="40" /> ${stream.name}</div>
          <div class="description">${stream.description}</div>
          <button class="btn-clean btn-clean-primary" title=${tooltip} @click=${open}>
            ${i18next.t('watch.watch_on_twitch_message')}
          </button>
          ${
            online
              ? html`<div class="viewers"><i class="fa fa-group"></i> ${online.viewers}</div>`
              : nothing
          }
        </div>
      </div>
    </div>`;
  }

  /* endregion RENDER */
}

// guarded so a watch rebuild or a second import in a test does not throw
if (!customElements.get(TAG)) customElements.define(TAG, Watch);
