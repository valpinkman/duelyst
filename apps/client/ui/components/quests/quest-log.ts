// pragma PKGS: alwaysloaded

/*
 * <duelyst-quest-log>: the quest log modal's content, the first screen on the
 * Lit stack (issue #10, docs/BACKBONE_REMOVAL_PLAN.md §3.4). Mounted by
 * apps/client/ui/shells/quest_log_shell.ts.
 *
 * Properties in, events out: the shell reads the managers and sets the
 * properties below; this element never imports a manager. User actions leave
 * as bubbling DOM events the shell turns into manager calls:
 *
 *   quest-replace    detail { id, done }  call done() when the request settles
 *   free-card-claim  detail {}
 *
 * The markup keeps the structure the Marionette views rendered (layout,
 * composite, item, empty and free-card views, collapsed into one template),
 * because styles/common/quests.scss selects on it: `.quest-sections-container
 * > *:first-child` needs all three regions present even when empty.
 */
import { LitElement, html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import i18next from 'i18next';
import moment from 'moment';
// The three .ts modules below assign `module.exports` rather than exporting,
// so tsc sees no default export. The bundler and vitest both hand a default
// import of a CommonJS module its `module.exports`, which is what is used.
// @ts-expect-error -- CommonJS module.exports, see above
import CONFIG from '@duelyst/common/config';
// @ts-expect-error -- CommonJS module.exports, see above
import UtilsJavascript from '@duelyst/common/utils/utils_javascript';
import RSX from '@duelyst/data/resources';
// @ts-expect-error -- CommonJS module.exports, see above
import QuestFactory from '@duelyst/sdk/quests/questFactory';
import { BackboneController } from '../backbone-controller';

export const TAG = 'duelyst-quest-log';

// path literal kept verbatim: generate_packages.js finds it by its text
const FREE_CARD_IMAGE = 'resources/free_card_of_the_day/random_core_gem.png';

const FIRST_WIN_COOLDOWN_HOURS = 22;

function imageForScale(path: string) {
  return RSX.getResourcePathForScale(path, CONFIG.resourceScaleCSS);
}

/** True when a full UTC day has passed since `timestamp`, or there is none. */
export function utcDayPassedSince(timestamp: number | null | undefined) {
  if (!timestamp) return true;
  return (moment().utc().valueOf() - timestamp) / 1000 / 60 / 60 / 24 >= 1;
}

export class QuestLog extends LitElement {
  static properties = {
    quests: { attribute: false },
    gameCounter: { attribute: false },
    showConfirm: { type: Boolean },
    canSeeFirstWin: { type: Boolean },
    canSeeFreeCard: { type: Boolean },
    freeCardAvailable: { type: Boolean },
  };

  /** the daily quest collection (Backbone) */
  declare quests: any;
  /** the progression game counter model; carries `last_daily_win_at` */
  declare gameCounter: any;
  declare showConfirm: boolean;
  declare canSeeFirstWin: boolean;
  declare canSeeFreeCard: boolean;
  declare freeCardAvailable: boolean;

  // quest ids with a replace request in flight
  #replacing = new Set<string>();
  #claiming = false;
  #timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();
    this.quests = null;
    this.gameCounter = null;
    this.showConfirm = false;
    this.canSeeFirstWin = false;
    this.canSeeFreeCard = false;
    this.freeCardAvailable = false;
    new BackboneController(
      this,
      () => this.quests,
      'add remove reset change sort',
      (model) => {
        // a replaced quest arrives as a change on the same id
        if (model && this.#replacing.delete(model.id)) this.requestUpdate();
      },
    );
    new BackboneController(this, () => this.gameCounter, 'change');
  }

  // light DOM (§3.1): the Bootstrap-importing SCSS keeps applying
  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    // one clock for the three countdowns: quest rollover, first win, free card
    this.#timer = setInterval(() => this.requestUpdate(), 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.#timer != null) clearInterval(this.#timer);
    this.#timer = null;
  }

  /* region STATE */

  #questModels(): any[] {
    return this.quests ? this.quests.models : [];
  }

  #isReplaceInstructionVisible() {
    return this.#questModels().some((q) => q.get('is_replaceable'));
  }

  #firstWinAvailableAt() {
    const lastWinAt = (this.gameCounter && this.gameCounter.get('last_daily_win_at')) || 0;
    return moment(lastWinAt).utc().add(FIRST_WIN_COOLDOWN_HOURS, 'hours');
  }

  #isFirstWinAvailable() {
    return this.#firstWinAvailableAt().isBefore(moment().utc());
  }

  /* endregion STATE */

  /* region ACTIONS */

  #onReplace(model: any) {
    const id = model.id;
    if (this.#replacing.has(id)) return;
    this.#replacing.add(id);
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent('quest-replace', {
        bubbles: true,
        detail: {
          id,
          // a 304 or a failed request changes no model: without this the
          // quest would stay greyed out until the modal closed
          done: () => {
            if (this.#replacing.delete(id)) this.requestUpdate();
          },
        },
      }),
    );
  }

  #onClaim() {
    if (this.#claiming) return;
    this.#claiming = true;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('free-card-claim', { bubbles: true, detail: {} }));
  }

  /* endregion ACTIONS */

  /* region COUNTDOWNS */

  // time to the next UTC midnight, when quests roll over
  #rolloverText() {
    const currentDate = new Date();
    const hsmDate = new Date(0);
    hsmDate.setUTCHours(currentDate.getUTCHours());
    hsmDate.setUTCMinutes(currentDate.getUTCMinutes());
    hsmDate.setUTCSeconds(currentDate.getUTCSeconds());
    const midnightDate = new Date(0);
    midnightDate.setUTCDate(1);
    const tillMidnightDate = new Date(midnightDate.getTime() - hsmDate.getTime());
    return i18next.t('quests.quest_rollover_instructions', {
      time_until_quests: UtilsJavascript.stringifyHoursMinutesSeconds(
        tillMidnightDate.getUTCHours(),
        tillMidnightDate.getUTCMinutes(),
        tillMidnightDate.getUTCSeconds(),
      ),
    });
  }

  #firstWinCountdownText() {
    const duration = moment.duration(this.#firstWinAvailableAt().diff(moment().utc()));
    let text = '';
    if (duration.hours())
      text += `${duration.hours()} ${i18next.t('common.time_hour', { count: duration.hours() })} `;
    if (duration.minutes())
      text += `${duration.minutes()} ${i18next.t('common.time_minute', { count: duration.minutes() })} `;
    text += `${duration.seconds()} ${i18next.t('common.time_second', { count: duration.seconds() })} `;
    return text;
  }

  #freeCardCountdownText() {
    const tomorrow = moment().utc().startOf('day').add(24, 'hours');
    const duration = moment.duration(tomorrow.diff(moment().utc()));
    let text = '';
    if (duration.hours()) text += `${duration.hours()}hr `;
    if (duration.minutes()) text += `${duration.minutes()}min `;
    text += `${duration.seconds()}s`;
    return text;
  }

  /* endregion COUNTDOWNS */

  /* region RENDER */

  render() {
    const replaceVisible = this.#isReplaceInstructionVisible();
    const quests = this.#questModels();
    return html`
      <div class="modal-dialog">
        <button type="button" class="btn btn-clean btn-user-cancel btn-cancel-primary"></button>
        <div class="modal-content ${replaceVisible ? '' : 'starter-only'}">
          <div class="modal-header">
            ${
              replaceVisible
                ? html`<h4 class="header-dashed-text modal-title">
                    ${i18next.t('quests.quest_log_title')}
                  </h4>`
                : nothing
            }
          </div>
          <div class="modal-body quest-log">
            ${this.#renderFirstWin()}
            <div class="quest-sections-container">
              <ul class="free-card-of-the-day-region quest-log-list">
                ${this.canSeeFreeCard ? this.#renderFreeCard() : nothing}
              </ul>
              <ul class="daily-challenge-region quest-log-list"></ul>
              <div class="daily-quests-region">
                <ul class="quest-log-list">
                  ${
                    quests.length
                      ? repeat(
                          quests,
                          (quest) => quest.id,
                          (quest) => this.#renderQuest(quest),
                        )
                      : html`<div>
                          <div class="no-quests-remaining">
                            <h2>${i18next.t('quests.quest_log_empty')}</h2>
                          </div>
                        </div>`
                  }
                </ul>
              </div>
            </div>
            ${
              replaceVisible
                ? html`<p class="replace-instructions">
                      ${i18next.t('quests.replace_quest_instructions')}
                    </p>
                    <p class="rollover-countdown">${this.#rolloverText()}</p>`
                : nothing
            }
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-clean btn-clean-secondary btn-user-cancel ${
                this.showConfirm ? '' : 'hide'
              }"
            >
              ${i18next.t('common.acknowledge_dismiss_button_label')}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  #renderFirstWin() {
    if (!this.canSeeFirstWin) return nothing;
    if (this.#isFirstWinAvailable()) {
      return html`<p class="first-win-of-the-day-available">
        ${i18next.t('quests.first_win_of_the_day_active', {
          first_win_gold_amount: CONFIG.FIRST_WIN_OF_DAY_GOLD_REWARD,
        })}
      </p>`;
    }
    return html`<p class="first-win-of-the-day-countdown small">
      ${i18next.t('quests.first_win_of_the_day_available_in')}
      <span>${this.#firstWinCountdownText()}</span>
    </p>`;
  }

  #renderFreeCard() {
    const available = this.freeCardAvailable;
    return html`<li
      class="quest free-card-of-the-day ${available ? 'animateInShake' : 'animateIn'}"
    >
      <div class="quest-content">
        <div class="description">
          <h2 class="title">${i18next.t('quests.daily_free_card_label')}</h2>
          ${
            available
              ? html`<div class="card-reward"><img src=${imageForScale(FREE_CARD_IMAGE)} /></div>`
              : html`<div class="fa fa-check complete-icon"></div>`
          }
          <div class="instructions">
            ${
              available
                ? i18next.t('quests.claim_your_free_card_label')
                : html`${i18next.t('common.available_in_duration_label')}<br />${this.#freeCardCountdownText()}`
            }
          </div>
        </div>
        <button
          ?disabled=${!available || this.#claiming}
          class="btn btn-clean btn-clean-secondary claim-card"
          @click=${this.#onClaim}
        >
          ${i18next.t('common.claim_label')}
        </button>
      </div>
    </li>`;
  }

  #renderQuest(model: any) {
    const data = model.toJSON();
    const quest = QuestFactory.questForIdentifier(data.quest_type_id);
    let isReplaceable = data.is_replaceable;
    let name;
    let instructions;
    let isBeginner = false;
    let isCatchUp = false;
    let giftChests;
    let cosmeticKey;
    if (quest) {
      quest.params = data.params;
      name = quest.getName();
      // SDK-authored markup (e.g. <br>), never user input
      instructions = quest.getDescription();
      isReplaceable = data.is_replaceable != false;
      isBeginner = quest.isBeginner || false;
      isCatchUp = quest.isCatchUp || false;
      giftChests = quest.giftChests;
      // for now only one, change this to show a stack
      if (quest.cosmeticKeys != null && quest.cosmeticKeys.length != 0)
        cosmeticKey = quest.cosmeticKeys[0];
    }
    const dayPassed = utcDayPassedSince(data.mulliganed_at);
    let replaceLabel = '';
    if (isBeginner) replaceLabel = i18next.t('quests.replace_button_starter_label');
    else if (!isCatchUp && dayPassed) replaceLabel = i18next.t('quests.replace_button_label');

    return html`<li class="quest ${this.#replacing.has(model.id) ? 'replacing' : 'animateIn'}">
      <div class="quest-content">
        <div class="description">
          <h2 class="title">${data.title || name}</h2>
          ${data.gold ? html`<div class="gold-reward">${data.gold}</div>` : nothing}
          ${
            giftChests
              ? html`<div class="gift-chests-reward">
                  <img
                    style="width:10rem; margin-top:-2rem;"
                    src=${imageForScale(RSX.gift_loot_crate_sphere.img)}
                  />
                </div>`
              : nothing
          }
          ${
            data.spirit_orbs
              ? html`<div class="spirit-orbs-reward">${data.spirit_orbs}</div>`
              : nothing
          }
          ${cosmeticKey ? html`<div class="${cosmeticKey}-cosmetic-key-reward"></div>` : nothing}
          <div class="instructions">${unsafeHTML(instructions)}</div>
        </div>
        <div class="progress">
          ${data.progress} / ${data.params ? data.params.completionProgress : ''}
        </div>
        <button
          data-quest-index=${model.id}
          ?disabled=${!(isReplaceable && dayPassed)}
          class="btn btn-clean btn-clean-secondary replace uppercase"
          @click=${() => this.#onReplace(model)}
        >
          ${replaceLabel}
        </button>
      </div>
    </li>`;
  }

  /* endregion RENDER */
}

// guarded so a watch rebuild or a second import in a test does not throw
if (!customElements.get(TAG)) customElements.define(TAG, QuestLog);
