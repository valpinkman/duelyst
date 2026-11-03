/*
 * <duelyst-profile>: the player profile, own or a buddy's, with its summary,
 * faction levels, rank history and match history tabs (issue #80,
 * docs/BACKBONE_REMOVAL_PLAN.md §3.4). Mounted by
 * apps/client/ui/shells/profile_shell.ts.
 *
 * Properties in, events out: the shell fetches each tab's data, shapes it with
 * the SDK and caches it; this element never imports a manager. It binds the
 * viewed profile model, so a new username or portrait shows at once. User
 * actions leave as bubbling DOM events:
 *
 *   profile-tab         detail { tab }
 *   portrait-change     own profile only
 *   username-change     own profile only
 *   replay-watch        detail { gameId, userId }
 *   replay-share        detail { gameId }
 *   match-history-next
 *
 * The markup is what the Marionette layout and its tab views rendered,
 * collapsed into one template, because styles/layouts/profile.scss selects
 * on it.
 */
import { LitElement, html, nothing } from 'lit';
import i18next from 'i18next';
import moment from 'moment';
// CommonJS module.exports: tsc sees no default export, the bundler and vitest
// both hand a default import its module.exports (§3.4)
// @ts-expect-error -- CommonJS module.exports, see above
import CONFIG from '@duelyst/common/config';
import RSX from '@duelyst/data/resources';
import { BackboneController } from '../backbone-controller';

export const TAG = 'duelyst-profile';

export type ProfileTab = 'summary' | 'faction_levels' | 'rank_history' | 'match_history';

export const TABS: { value: ProfileTab; label: string }[] = [
  { value: 'summary', label: 'profile.category_summary_label' },
  { value: 'faction_levels', label: 'profile.category_faction_levels_label' },
  { value: 'rank_history', label: 'profile.category_rank_history_label' },
  { value: 'match_history', label: 'profile.category_match_history_label' },
];

/** What the selected tab's region shows: loading, an error, or the tab's data. */
export interface ProfileContent {
  tab: ProfileTab;
  loading?: boolean;
  error?: string | null;
  data?: any;
}

/** Resolves the ids and ranks the profile carries; set by the shell. */
export interface ProfileArt {
  profileIcon(portraitId: any): string | null | undefined;
  divisionClass(rank: any): string;
  divisionName(rank: any): string;
}

const DIVISIONS = ['Bronze', 'Silver', 'Gold', 'Diamond', 'Elite'];

function imageForScale(path: string | null | undefined) {
  if (typeof path !== 'string') return '';
  return RSX.getResourcePathForScale(path, CONFIG.resourceScaleCSS);
}

function statOrDash(value: any) {
  return value != null ? value : '-';
}

function localizedMonth(value: any) {
  return i18next.t('common.month_' + (value ? moment.utc(value) : moment.utc()).month());
}

function isNotNull(value: any) {
  return !(value === null || value === undefined || Number.isNaN(value));
}

export class Profile extends LitElement {
  static properties = {
    model: { attribute: false },
    buddy: { type: Boolean },
    seasonCount: { attribute: false },
    selectedTab: { attribute: false },
    content: { attribute: false },
    online: { type: Boolean },
    art: { attribute: false },
  };

  /** the viewed profile (Backbone): ProfileManager's own, or a buddy's */
  declare model: any;
  /** viewing a buddy: the header is read-only and has no season count */
  declare buddy: boolean;
  declare seasonCount: number | null;
  declare selectedTab: ProfileTab | null;
  declare content: ProfileContent | null;
  /** replays can be started: lights the replay buttons */
  declare online: boolean;
  declare art: ProfileArt | null;

  constructor() {
    super();
    this.model = null;
    this.buddy = false;
    this.seasonCount = null;
    this.selectedTab = null;
    this.content = null;
    this.online = false;
    this.art = null;
    new BackboneController(this, () => this.model, 'change');
  }

  // light DOM (§3.1): the Bootstrap-importing SCSS keeps applying
  createRenderRoot() {
    return this;
  }

  /* region ACTIONS */

  #emit(name: string, detail?: any) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
  }

  /* endregion ACTIONS */

  /* region RENDER */

  #divisionClass(rank: any) {
    return this.art ? this.art.divisionClass(rank) : '';
  }

  #divisionName(rank: any) {
    return this.art ? this.art.divisionName(rank) : '';
  }

  render() {
    return html`
      <div class="modal-dialog">
        <button type="button" class="btn btn-clean btn-user-cancel btn-cancel-primary"></button>
        <div class="modal-content">
          <div class="modal-header">
            <div class="container">
              <div class="row">
                <div class="col-md-12">
                  <div class="profile-header">${this.#renderHeader()}</div>
                  <ul id="profile_tabs" class="nav nav-tabs">
                    ${TABS.map(
                      (tab) =>
                        html`<li
                          role="select"
                          data-value=${tab.value}
                          class=${this.selectedTab === tab.value ? 'active' : ''}
                          @click=${() => this.#emit('profile-tab', { tab: tab.value })}
                        >
                          <a>${i18next.t(tab.label)}</a>
                        </li>`,
                    )}
                  </ul>
                </div>
              </div>
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

  #renderHeader() {
    const attrs = (this.model && this.model.attributes) || {};
    const rank = attrs.rank || (attrs.presence ? attrs.presence.rank : attrs.rank);
    const portraitId = this.buddy
      ? attrs.portrait_id
      : attrs.presence && attrs.presence.portrait_id;
    const portrait = imageForScale(this.art ? this.art.profileIcon(portraitId) : null);
    const division = this.#divisionClass(rank);
    if (this.buddy) {
      return html`
        <div class="btn-clean ${division} portrait">
          <img src=${portrait} />
        </div>
        <div class="user-info">
          <div class="btn-clean username">
            <h1 class="username-content">${attrs.username}</h1>
          </div>
        </div>
      `;
    }
    return html`
      <button
        class="btn-clean portrait ${division} change-portrait"
        @click=${() => this.#emit('portrait-change')}
      >
        <img src=${portrait} />
      </button>
      <div class="user-info">
        <button
          class="btn-clean username change-username"
          @click=${() => this.#emit('username-change')}
        >
          <h1 class="username-content">${attrs.username}</h1>
          <i class="fa fa-pencil"></i>
        </button>
        <div class="season-count">
          ${i18next.t('profile.season_played_label', {
            key: 'profile.season_played_label',
            season_count: this.seasonCount,
          })}
        </div>
      </div>
    `;
  }

  #renderContent() {
    const content = this.content;
    if (content == null || content.tab !== this.selectedTab) return nothing;
    if (content.error != null) {
      return html`<div class="loading-region">
        <div class="error">ERROR: ${content.error}</div>
      </div>`;
    }
    if (content.loading || content.data == null) {
      return html`<div class="loading-region"><div class="loading">Loading</div></div>`;
    }
    switch (content.tab) {
      case 'summary':
        return this.#renderSummary(content.data);
      case 'faction_levels':
        return this.#renderFactionLevels(content.data);
      case 'rank_history':
        return this.#renderRankHistory(content.data);
      case 'match_history':
        return this.#renderMatchHistory(content.data);
    }
    return nothing;
  }

  #renderProgress(percent: any) {
    return html`<div class="progress">
      <div class="progress-bar level-progress-bar" style="width: ${percent}%">
        <span class="sr-only"></span>
      </div>
    </div>`;
  }

  #renderMedal(src: string) {
    return html`<div class="division-medal-container">
      <div>
        <img src=${imageForScale(src)} class="division-medal" />
      </div>
    </div>`;
  }

  #renderSummary(data: any) {
    const current = data.currentSeasonRank;
    const top = data.topRank;
    const run = data.run;
    const ladderPosition = data.currentSeasonLadderPositionModel.ladder_position;
    return html`<div class="profile-summary">
      <div class="container">
        <div id="summary_stats" class="row">
          <div class="col-md-4">
            <div class="summary-box">
              <h1>${i18next.t('profile.summary_current_rank')}</h1>
              ${this.#renderMedal(
                `resources/season_rewards/season_rank_${this.#divisionClass(current.rank)}.png`,
              )}
              <h2 class="rank">
                ${i18next.t('rank.rank')} <strong>${statOrDash(current.rank)}</strong> -
                <span>${this.#divisionName(current.rank)}</span>${
                  ladderPosition
                    ? html`<div class="badge ladder-position">${ladderPosition}</div>`
                    : nothing
                }
              </h2>
              <h3 class="season">${current.season_label}</h3>
              ${this.#renderProgress(current.rank_progress_percent)}
              <div class="stats">
                <div class="stat">
                  ${i18next.t('profile.summary_current_win_streak')}
                  <span class="value">${current.win_streak}</span>
                </div>
                <div class="stat">
                  ${i18next.t('profile.summary_current_ranked_wins')}
                  <span class="value"
                    >${statOrDash(data.currentSeasonGameCounterModel.win_count)}</span
                  >
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="summary-box profile-ranked-stats">
              <h1>${i18next.t('profile.summary_top_rank')}</h1>
              ${this.#renderMedal(
                `resources/season_rewards/season_rank_${this.#divisionClass(top.top_rank)}.png`,
              )}
              <h2 class="rank">
                ${i18next.t('rank.rank')} <strong>${top.top_rank}</strong> -
                <span>${this.#divisionName(top.top_rank)}</span>
              </h2>
              <h3 class="season">${top.season_label}</h3>
              ${this.#renderProgress(top.rank_progress_percent)}
              <div class="stats">
                <div class="stat">
                  ${i18next.t('profile.summary_top_win_streak')}
                  <span class="value">${statOrDash(top.top_win_streak)}</span>
                </div>
                <div class="stat">
                  ${i18next.t('profile.summary_total_ranked_wins')}
                  <span class="value">${statOrDash(data.ranked.win_count)}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="summary-box profile-gauntlet-stats">
              <h1>${i18next.t('profile.summary_gauntlet')}</h1>
              <div class="gauntlet-run ${run.win_count ? '' : 'disabled'}">
                ${this.#renderMedal(`resources/arena/key_blades/${run.blade_id}.png`)}
                <h2>${i18next.t('common.key_blade')}</h2>
                <h3>
                  ${statOrDash(run.win_count)}
                  ${i18next.t('common.win', { key: 'common.win', count: 2 })}
                </h3>
                ${this.#renderProgress(run.gauntlet_progress_percent)}
              </div>
              <div class="stats">
                <div class="stat">
                  ${i18next.t('profile.summary_gauntlet')}
                  <span class="value">${statOrDash(run.win_count)}</span>
                </div>
                <div class="stat">
                  ${i18next.t('profile.summary_gauntlet_total_wins')}
                  <span class="value">${statOrDash(data.gauntlet.win_count)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="ribbons" class="row">
          <h1>${i18next.t('profile.summary_battle_ribbons_label')}</h1>
          <div class="ribbons-list">
            ${(data.ribbons || []).map(
              (ribbon: any) =>
                html`<img
                  src=${imageForScale(`resources/ribbons/${ribbon.id}.png`)}
                  class=${ribbon.count ? '' : 'disabled'}
                />`,
            )}
          </div>
        </div>
      </div>
    </div>`;
  }

  #renderFactionLevels(data: any) {
    const level = i18next.t('common.abbreviated_level_label');
    return html`<div class="profile-faction-levels">
      <div class="container">
        <div class="row">
          <div id="faction_levels" class="col-md-12">
            ${Object.values(data.factionProgression || {}).map(
              (faction: any) => html`<div class="faction-level">
                <div class="faction-image">
                  <img
                    class="faction-crest f${faction.faction_id}"
                    src=${imageForScale(`resources/crests/crest_f${faction.faction_id}.png`)}
                  />
                  <div class="general-portrait">
                    <div
                      class="general-portrait-image"
                      style="background-image:url(${imageForScale(
                        `resources/generals/general_portrait_image_f${faction.faction_id}.png`,
                      )})"
                    ></div>
                  </div>
                </div>
                ${this.#renderProgress(faction.progress_percent)}
                <h2 class="label">
                  <span class="level">${level} ${faction.level_for_user}</span>
                  <span class="faction-name">${faction.faction_name}</span>
                </h2>
                <p class="next-reward">
                  <strong
                    >${level} ${faction.next_reward_level} ${i18next.t('common.reward')}:</strong
                  >
                  ${faction.next_reward_description}.
                </p>
              </div>`,
            )}
          </div>
        </div>
      </div>
    </div>`;
  }

  #renderRankHistory(data: any) {
    const wins = i18next.t('common.win_plural', { key: 'common.win_plural', count: 2 });
    const stats = data.divisionStats || {};
    return html`<div class="profile-rank-history">
      <div class="container">
        <div id="rank_history_chart" class="row">
          <div class="col-md-12">
            ${data.rankHistory.map((season: any) => {
              const ranked = isNotNull(season.rank);
              const ticks = [];
              if (ranked) for (let i = season.rank; i < 31; i++) ticks.push(html`<li></li>`);
              return html`<div class="rank-history-column">
                <div class="rank-label">${season.rank}</div>
                <ul class="ticks">
                  ${ticks}
                </ul>
                <div class="month-label">${localizedMonth(season.starting_at)}</div>
                ${
                  ranked
                    ? html`<div class="medal-container">
                          <img
                            class="division-medal"
                            src=${imageForScale(
                              `resources/season_rewards/season_rank_${this.#divisionClass(season.rank)}.png`,
                            )}
                          />
                        </div>
                        <div class="win-count-label">
                          <strong>${season.win_count}</strong> ${wins}
                        </div>`
                    : html`<div class="medal-container">
                          <img
                            class="division-medal disabled"
                            src=${imageForScale('resources/season_rewards/season_rank_bronze.png')}
                          />
                        </div>
                        <div class="win-count-label disabled"><strong>-</strong> ${wins}</div>`
                }
              </div>`;
            })}
          </div>
        </div>
        <div id="division_stats" class="row">
          <div class="col-md-12">
            ${DIVISIONS.map((division) => {
              const count = stats[division] && stats[division].count;
              const lower = division.toLowerCase();
              return html`<div class="division-sum ${count ? '' : 'disabled'}">
                <div class="medal-container">
                  <div>
                    <img
                      src=${imageForScale(`resources/season_rewards/season_rank_${lower}.png`)}
                    />
                  </div>
                </div>
                <div class="value">${count}</div>
                <div class="label">${i18next.t(`rank.${lower}_division_name`)}</div>
              </div>`;
            })}
          </div>
        </div>
      </div>
    </div>`;
  }

  #renderResult(match: any) {
    if (match.is_pending) return html`<td class="pending"><i class="fa fa-spinner"></i></td>`;
    if (match.is_winner) return html`<td class="win"><i class="fa fa-trophy"></i></td>`;
    if (match.is_draw) return html`<td class="draw"><i class="fa fa-circle-o"></i></td>`;
    return html`<td class="loss"><i class="fa fa-times"></i></td>`;
  }

  #renderReplay(match: any) {
    if (match.is_pending) return html`...`;
    if (!match.replay_available) return html`N/A`;
    return html`
      <button
        class="btn replay-button ${this.online ? '' : 'disabled'}"
        data-game-id=${match.game_id}
        data-user-id=${match.user_id}
        @click=${() => this.#emit('replay-watch', { gameId: match.game_id, userId: match.user_id })}
      >
        ${i18next.t('profile.match_history_replay')}
      </button>
      <input type="hidden" value="copied?" />
      ${
        match.replay_shareble
          ? html`<button
              class="btn share-replay-button"
              data-game-id=${match.game_id}
              data-user-id=${match.user_id}
              @click=${() => this.#emit('replay-share', { gameId: match.game_id })}
            >
              share
            </button>`
          : nothing
      }
    `;
  }

  #renderMatchHistory(data: any) {
    const matches: any[] = data.matchHistory || [];
    return html`<div class="profile-match-history">
      <div class="container">
        <div class="row">
          <div class="col-md-12">
            <table id="match_history_list">
              <thead>
                <tr>
                  <th></th>
                  <th></th>
                  <th>${i18next.t('battle.opponent_name_default_label')}</th>
                  <th>${i18next.t('profile.match_history_game_type')}</th>
                  <th>${i18next.t('profile.match_history_win_loss')}</th>
                  <th>${i18next.t('profile.match_history_duration')}</th>
                  <th>${i18next.t('profile.match_history_replay')}</th>
                </tr>
              </thead>
              <tbody>
                ${matches.map(
                  (match) => html`<tr class="match">
                    <td class="icon ${match.faction_dev_name}">
                      <img
                        src=${imageForScale(`resources/crests/crest_f${match.faction_id}.png`)}
                      />
                    </td>
                    <td class="faction ${match.faction_dev_name}">${match.faction_name}</td>
                    <td class="opponent">${match.opponent_username}</td>
                    <td>
                      ${i18next.t(`common.game_type_${String(match.game_type).replace(' ', '_')}`)}
                    </td>
                    ${this.#renderResult(match)}
                    <td>${moment(match.created_at).fromNow()}</td>
                    <td class="replay">${this.#renderReplay(match)}</td>
                  </tr>`,
                )}
              </tbody>
            </table>
            <button
              id="button_next_page"
              class="btn btn-clean"
              style=${matches.length < 10 ? 'display: none;' : ''}
              @click=${() => this.#emit('match-history-next')}
            >
              ${i18next.t('profile.match_history_next_page')}
            </button>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* endregion RENDER */
}

// guarded so a watch rebuild or a second import in a test does not throw
if (!customElements.get(TAG)) customElements.define(TAG, Profile);
