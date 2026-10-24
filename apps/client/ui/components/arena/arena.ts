/*
 * <duelyst-arena>: the Gauntlet (arena) screen, from buying a ticket through a
 * run to claiming its rewards (issue #67, docs/BACKBONE_REMOVAL_PLAN.md §3.4).
 * Mounted by apps/client/ui/shells/arena_shell.ts.
 *
 * The screen has no DOM (#12 D3): everything visible is cocos. So render() is
 * empty and the element owns the cocos side instead - it creates the
 * ArenaLayer, shows it in the Scene, and acts as the layer's delegate and data
 * source, choosing which Gauntlet screen to show from the run's state.
 *
 * Properties in, events out: the shell sets `model` (the current run, a synced
 * Backbone model), `ticketCount` and `wonLastGame`, and then `ready` once the
 * gauntlet package has loaded and the run has synced. This element never
 * imports a manager; every request the layer makes leaves as a bubbling DOM
 * event:
 *
 *   arena-run-start        detail { done }
 *   arena-ticket-purchase  detail { done }
 *   arena-faction-select   detail { factionId, done }
 *   arena-card-select      detail { cardId, unselectedCardIds, done }
 *   arena-run-resign       detail { done }
 *   arena-rewards-claim    detail { done }
 *   arena-rewards-seen     detail { done }
 *   arena-game-find        detail {}
 *
 * The shell calls done({ run }) with the server's answer, or done() to fall
 * back to the model, and the element moves to the screen that run calls for.
 * done({ error }) means the request failed (the shell has already shown the
 * error dialog); done({ cancelled: true }) means the player backed out of a
 * confirmation. Both reject, so the layer resets the button it disabled.
 * Claiming rewards is the exception, as under the Marionette view: it shows
 * the rewards screen from the answer, and a failure resolves.
 */
import { LitElement, nothing } from 'lit';
// CommonJS module.exports: tsc sees no default export, the bundler and vitest
// both hand a default import its module.exports (§3.4)
// @ts-expect-error -- CommonJS module.exports, see above
import Scene from '../../../view/Scene';
// @ts-expect-error -- CommonJS module.exports, see above
import ArenaLayer from '../../../view/layers/arena/ArenaLayer';
// @ts-expect-error -- CommonJS module.exports, see above
import FactionFactory from '@duelyst/sdk/cards/factionFactory';

export const TAG = 'duelyst-arena';

/** The fields of a Gauntlet run row this element reads. */
export interface ArenaRunData {
  created_at?: unknown;
  ended_at?: unknown;
  rewards_claimed_at?: unknown;
  faction_id?: number | null;
  general_id?: number | null;
  is_complete?: boolean;
  card_choices?: unknown[] | null;
  general_choices?: unknown[] | null;
  deck?: unknown[];
  [key: string]: unknown;
}

/** The slice of a Backbone model this element uses. */
export interface ArenaRunModel {
  attributes: ArenaRunData;
  get(key: string): any;
}

export interface RequestOutcome {
  run?: ArenaRunData | null;
  error?: string;
  cancelled?: boolean;
}

export type Done = (outcome?: RequestOutcome) => void;

/** A run not yet started, or finished and claimed: the start screen. */
function isFresh(run: ArenaRunData) {
  return run.created_at == null || !!run.rewards_claimed_at;
}

/** A run that has ended, or whose rewards were claimed: the rewards screen. */
function hasRewards(run: ArenaRunData) {
  return run.ended_at != null || run.rewards_claimed_at != null;
}

export class Arena extends LitElement {
  static properties = {
    model: { attribute: false },
    ticketCount: { attribute: false },
    wonLastGame: { attribute: false },
    ready: { attribute: false },
  };

  declare model: ArenaRunModel | null;
  /** Gauntlet tickets the player holds; the start screen reads it */
  declare ticketCount: number;
  /** whether the player's latest game is a recent Gauntlet win */
  declare wonLastGame: boolean;
  /** set by the shell once the gauntlet package has loaded and the run synced */
  declare ready: boolean;

  /** the ArenaLayer this element shows and drives, once ready */
  layer: any = null;

  constructor() {
    super();
    this.model = null;
    this.ticketCount = 0;
    this.wonLastGame = false;
    this.ready = false;
  }

  // light DOM (§3.1), though nothing renders into it
  createRenderRoot() {
    return this;
  }

  render() {
    return nothing;
  }

  updated() {
    if (this.ready && this.model != null && this.layer == null && this.isConnected) {
      this.#showLayer();
    }
  }

  #showLayer() {
    const layer = new ArenaLayer();
    Scene.getInstance().showContent(layer, true);
    layer.delegate = this;
    layer.dataSource = this;
    this.layer = layer;

    const run = this.model!.attributes;
    if (!isFresh(run) && !hasRewards(run)) {
      layer.bindDeck(run.deck);
    }
    this.#showScreenFor(run);
  }

  /** Shows the Gauntlet screen the run's state calls for, if our layer is still on screen. */
  #showScreenFor(run: ArenaRunData) {
    const layer = this.#liveLayer();
    if (layer == null) return;

    if (isFresh(run) || hasRewards(run)) {
      layer.bindDeck([]);
    }

    if (isFresh(run)) {
      layer.showStartArenaRunScreen();
    } else if (hasRewards(run)) {
      layer.showArenaRewardsScreen(run);
    } else if (run.is_complete) {
      layer.showArenaRunScreen(run, this.wonLastGame);
    } else if (run.card_choices != null || run.general_choices != null) {
      layer.showCardSelectScreen(run);
    }
  }

  /** Our layer, while it is still the Scene's content and we are attached. */
  #liveLayer() {
    const scene = Scene.getInstance();
    const layer = this.layer;
    if (layer == null || !this.isConnected || scene == null || scene.getContent() !== layer) {
      return null;
    }
    return layer;
  }

  /** Sends a request out as `type` and settles with the shell's done() outcome. */
  #send(type: string, detail: Record<string, unknown> = {}): Promise<RequestOutcome> {
    return new Promise<RequestOutcome | undefined>((resolve) => {
      this.dispatchEvent(
        new CustomEvent(type, { bubbles: true, detail: { ...detail, done: resolve as Done } }),
      );
    }).then((outcome) => {
      if (outcome?.error != null) throw outcome.error;
      if (outcome?.cancelled) throw undefined;
      return outcome ?? {};
    });
  }

  /** Sends a request and, once done, shows the screen its run (or the model) calls for. */
  #request(type: string, detail: Record<string, unknown> = {}): Promise<void> {
    return this.#send(type, detail).then((outcome) => {
      const run = outcome.run ?? this.model?.attributes;
      if (run != null) this.#showScreenFor(run);
    });
  }

  /* region ARENA LAYER DELEGATE */

  startNewArenaRun() {
    return this.#request('arena-run-start');
  }

  purchaseTicket() {
    return this.#send('arena-ticket-purchase').then(() => undefined);
  }

  selectFaction(factionId: number) {
    return this.#request('arena-faction-select', { factionId });
  }

  selectCard(selectedSdkCard: { id: number }, unselectedSdkCards?: Array<{ id: number } | null>) {
    return this.#request('arena-card-select', {
      cardId: selectedSdkCard.id,
      unselectedCardIds: (unselectedSdkCards || []).map((card) => (card ? card.id : null)),
    });
  }

  resignArenaRun() {
    return this.#request('arena-run-resign');
  }

  claimArenaRewards() {
    return this.#send('arena-rewards-claim').then(
      (outcome) => {
        const layer = this.#liveLayer();
        if (layer != null) layer.showArenaRewardsScreen(outcome.run);
      },
      () => {
        // the shell has shown the error dialog; the rewards screen stays
      },
    );
  }

  markArenaRewardsAsSeen() {
    return this.#request('arena-rewards-seen');
  }

  startLookingForGame() {
    this.dispatchEvent(new CustomEvent('arena-game-find', { bubbles: true, detail: {} }));
    return Promise.resolve();
  }

  /* endregion ARENA LAYER DELEGATE */

  /* region ARENA LAYER DATA SOURCE */

  getTicketCount() {
    return this.ticketCount;
  }

  /** The run's general, or null while the deck is incomplete. */
  getArenaRunGeneralId() {
    if (this.model == null || !this.model.get('is_complete')) return null;

    const generalId = this.model.get('general_id');
    if (generalId != null) return generalId;

    // https://github.com/88dots/cleancoco/pull/8372
    // runs created before then have a complete deck but no general_id, so
    // they fall back to the faction's primary general
    const sdkFaction = FactionFactory.factionForIdentifier(this.model.get('faction_id'));
    return sdkFaction.generalIdsByOrder[FactionFactory.GeneralOrder.Primary];
  }

  /* endregion ARENA LAYER DATA SOURCE */
}

if (!customElements.get(TAG)) customElements.define(TAG, Arena);
