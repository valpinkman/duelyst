/*
 * <duelyst-rift-runs>: the Rift deck select, a carousel of the player's rift
 * runs with the buttons that start a new one (issue #77,
 * docs/BACKBONE_REMOVAL_PLAN.md §3.4). Mounted by
 * apps/client/ui/shells/rift_shell.ts.
 *
 * Properties in, events out: the shell fetches the runs, reads the wallet,
 * the tickets and the profile, and sets `runs`, `startMode`, `goldDisabled`,
 * `storedUpgradeCount` and then `ready`; this element never imports a
 * manager. It renders the list and turns clicks into bubbling events:
 *
 *   rift-runs-select  detail { id }      a run was clicked
 *   rift-runs-start   detail { with }    a start button: 'gold', 'currency'
 *                                        or 'existing' (a ticket or the free run)
 *
 * The carousel is <duelyst-sliding-panel-select>, whose panel-hover events
 * bubble through for the shell's hover sound. Each panel is the markup of
 * views2/rift/rift_run_deck.hbs, which stays for the play screen's deck
 * select until `play` moves.
 */
import { LitElement, html, nothing } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import i18next from 'i18next';
// CommonJS module.exports: tsc sees no default export, the bundler and vitest
// both hand a default import its module.exports (§3.4)
// @ts-expect-error -- CommonJS module.exports, see above
import CONFIG from '@duelyst/common/config';
import RSX from '@duelyst/data/resources';
import '../carousel/sliding-panel-select';
import type { PanelItem } from '../carousel/sliding-panel-select';

export const TAG = 'duelyst-rift-runs';

/** One run in the carousel, as views2/rift/rift_run_deck serialized it. */
export interface RiftRunPanel extends PanelItem {
  id: string;
  name: string;
  faction_id?: number | null;
  /** the general's hex portrait, unscaled; none when the general is unknown */
  portrait?: string | null;
  rift_level: number;
  rift_rating: number;
  rift_points_so_far: number;
  level_up_points_required: number;
  progress_percent: number;
}

/** Which start buttons show: a ticket or the free run, or the two purchases. */
export type StartMode = 'existing' | 'buy' | null;

export type StartWith = 'gold' | 'currency' | 'existing';

// CONFIG.RIFT_TICKET_GOLD_PRICE and the premium price, as the template had them
const GOLD_PRICE = 150;
const PREMIUM_PRICE = 199;

function imageForScale(path: string | null | undefined) {
  return typeof path === 'string' ? RSX.getResourcePathForScale(path, CONFIG.resourceScaleCSS) : '';
}

export class RiftRuns extends LitElement {
  static properties = {
    runs: { attribute: false },
    ready: { attribute: false },
    startMode: { attribute: false },
    goldDisabled: { attribute: false },
    storedUpgradeCount: { attribute: false },
  };

  declare runs: RiftRunPanel[];
  /** the runs are in: show the carousel */
  declare ready: boolean;
  declare startMode: StartMode;
  /** the wallet holds less gold than a ticket costs */
  declare goldDisabled: boolean;
  declare storedUpgradeCount: number;

  constructor() {
    super();
    this.runs = [];
    this.ready = false;
    this.startMode = null;
    this.goldDisabled = false;
    this.storedUpgradeCount = 0;
  }

  // light DOM (§3.1): the Bootstrap-importing SCSS keeps applying
  createRenderRoot() {
    return this;
  }

  /* region ACTIONS */

  #emit(name: string, detail: object) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
  }

  #onPanelSelect(e: CustomEvent) {
    // the carousel's own event stops here: the shell hears rift-runs-select
    e.stopPropagation();
    this.#emit('rift-runs-select', { id: e.detail.item.id });
  }

  #start(withWhat: StartWith) {
    this.#emit('rift-runs-start', { with: withWhat });
  }

  /* endregion ACTIONS */

  /* region RENDER */

  render() {
    if (!this.ready) return nothing;
    return html`<duelyst-sliding-panel-select
      class="rift-runs"
      .slidingPanelsStack=${false}
      .listClass=${'rift-runs-list'}
      .items=${this.runs}
      .isEnabled=${() => true}
      .panelClass=${(item: PanelItem) => `deck-preview rift-run-deck f${item.faction_id}`}
      .renderHeader=${() => html`<h1>${i18next.t('rift.rift_title')}</h1>`}
      .renderPanel=${(item: PanelItem) => this.#renderRun(item as RiftRunPanel)}
      .renderEmpty=${() => this.#renderEmpty()}
      .renderFooter=${() => this.#renderFooter()}
      @panel-select=${this.#onPanelSelect}
    ></duelyst-sliding-panel-select>`;
  }

  #renderRun(run: RiftRunPanel) {
    return html`<div class="background"></div>
      <div class="sliding-panel-content run-content">
        ${
          run.faction_id
            ? html`<div class="faction-crest"></div>
                <div class="faction-crest-bubble faction-crest-bubble-hover"></div>
                <div class="faction-crest-bubble faction-crest-bubble-player2"></div>
                <div class="faction-crest-bubble faction-crest-bubble-player1"></div>
                <div
                  class="faction-portrait"
                  style="background-image: url(${imageForScale(run.portrait)})"
                ></div>`
            : nothing
        }
        <div class="deck-caption">
          <h4 class="deck-name">${run.name}</h4>
          <div class="level">${i18next.t('rift.rift_level_label', { level: run.rift_level })}</div>
          <div class="rating">
            ${i18next.t('rift.rift_rating_label', { rating: run.rift_rating })}
          </div>
          <p class="progress-data">
            ${i18next.t('rift.progress_over_required_xp_message', {
              current: run.rift_points_so_far,
              required: run.level_up_points_required,
            })}
          </p>
          <div class="progress">
            <div class="complete" style="width:${run.progress_percent}%"></div>
          </div>
        </div>
      </div>`;
  }

  #renderEmpty() {
    return html`<li>
      <div class="rift-runs-empty-view">
        <h1>${i18next.t('rift.empty_rift_instruction_header')}</h1>
        <p>${i18next.t('rift.empty_rift_instruction_p1')}</p>
        <p>${i18next.t('rift.empty_rift_instruction_p2')}</p>
        <p>${i18next.t('rift.empty_rift_instruction_p3')}</p>
        <p>${i18next.t('rift.empty_rift_instruction_p4')}</p>
      </div>
    </li>`;
  }

  #renderFooter() {
    const buy = this.startMode === 'buy';
    const existing = this.startMode === 'existing';
    return html`<div class="sliding-panel-select-footer">
      <ul id="start_new_run_container_buy" class=${buy ? 'btn-group' : 'btn-group hide'}>
        <li>
          <span class="cost-label">${i18next.t('rift.purchase_rift_ticket_message')}</span>
        </li>
        <li>
          <button
            id="start_new_run_button_with_gold"
            data-gold=${GOLD_PRICE}
            type="button"
            class="btn btn-clean btn-clean-secondary btn-buy product-for-gold${
              buy && this.goldDisabled ? ' disabled' : ''
            }"
            @click=${() => this.#start('gold')}
          >
            <span class="icon-gold">${GOLD_PRICE}</span> ${i18next.t('common.currency_gold')}
          </button>
        </li>
        <li>
          <button
            id="start_new_run_button_with_currency"
            data-price=${PREMIUM_PRICE}
            type="button"
            class="btn btn-clean btn-clean-secondary btn-buy"
            @click=${() => this.#start('currency')}
          >
            ${unsafeHTML(
              // formatPremiumCurrency: our own locale string
              `<strong>${PREMIUM_PRICE}</strong> ${i18next.t('common.currency_premium_plural')}`,
            )}
          </button>
        </li>
      </ul>

      <div id="start_new_run_container_existing" class=${existing ? '' : 'hide'}>
        <button
          id="start_new_run_button_with_existing"
          class="btn btn-clean btn-clean-primary"
          @click=${() => this.#start('existing')}
        >
          ${i18next.t('rift.start_run_button_label')}
        </button>
      </div>
      ${
        this.storedUpgradeCount
          ? html`<span class="stored-upgrades-label"
              >${i18next.t('rift.stored_upgrade_count_label', {
                storedUpgradeCount: this.storedUpgradeCount,
              })}</span
            >`
          : nothing
      }
    </div>`;
  }

  /* endregion RENDER */
}

// guarded so a watch rebuild or a second import in a test does not throw
if (!customElements.get(TAG)) customElements.define(TAG, RiftRuns);
