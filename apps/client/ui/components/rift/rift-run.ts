/*
 * <duelyst-rift-run>: one Gauntlet (rift) run in progress, the screen between
 * picking a run and playing its games (issue #65, docs/BACKBONE_REMOVAL_PLAN.md
 * §3.4). Mounted by apps/client/ui/shells/rift_run_shell.ts.
 *
 * The screen has no DOM (#12 D3): everything visible is cocos. So render() is
 * empty and the element owns the cocos side instead - it creates the
 * RiftLayer, shows it in the Scene, and acts as the layer's delegate and data
 * source, choosing which rift screen to show from the run's state.
 *
 * Properties in, events out: the shell sets `model` (the run, a Backbone
 * model) and then `ready` once the rift package has loaded. This element never
 * imports a manager; every request the layer makes leaves as a bubbling DOM
 * event:
 *
 *   rift-general-select          detail { cardId, done }
 *   rift-card-select             detail { cardId, done }
 *   rift-card-to-upgrade-select  detail { cardId, done }
 *   rift-upgrade-store           detail { done }
 *   rift-upgrade-reroll          detail { done }
 *   rift-game-find               detail {}
 *   rift-game-cancel             detail {}
 *
 * The shell calls done() once the run model holds the server's answer, and
 * the element moves to the screen that answer calls for. done({ error }) means
 * the request failed (the shell has already shown the error dialog);
 * done({ cancelled: true }) means nothing was sent and the screen stays.
 *
 * The RiftLayer reaches managers itself (RunLayer, UpgradeCardLayer), as it
 * did under the Marionette view; the element only talks to it.
 */
import { LitElement, nothing } from 'lit';
// CommonJS module.exports: tsc sees no default export, the bundler and vitest
// both hand a default import its module.exports (§3.4)
// @ts-expect-error -- CommonJS module.exports, see above
import Scene from '../../../view/Scene';
// @ts-expect-error -- CommonJS module.exports, see above
import RiftLayer from '../../../view/layers/rift/RiftLayer';

export const TAG = 'duelyst-rift-run';

/** The fields of a rift run row this element reads. */
export interface RiftRunData {
  created_at?: unknown;
  rewards_claimed_at?: unknown;
  faction_id?: number | null;
  general_id?: number | null;
  card_id_to_upgrade?: number | null;
  stored_upgrades?: unknown[] | null;
  deck?: unknown[];
  [key: string]: unknown;
}

/** The slice of a Backbone model this element uses; the RiftLayer reads `dataSource.model`. */
export interface RiftRunModel {
  attributes: RiftRunData;
  get(key: string): any;
}

export interface RequestOutcome {
  error?: string;
  cancelled?: boolean;
}

export type Done = (outcome?: RequestOutcome) => void;

/** A run not yet started, or finished and claimed: the layer starts from an empty deck. */
function isFresh(run: RiftRunData) {
  return run.created_at == null || !!run.rewards_claimed_at;
}

export class RiftRun extends LitElement {
  static properties = {
    model: { attribute: false },
    ready: { attribute: false },
  };

  declare model: RiftRunModel | null;
  /** set by the shell once the rift package has loaded */
  declare ready: boolean;

  /** the RiftLayer this element shows and drives, once ready */
  layer: any = null;

  constructor() {
    super();
    this.model = null;
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
    const layer = new RiftLayer();
    Scene.getInstance().showContent(layer, true);
    layer.delegate = this;
    layer.dataSource = this;
    this.layer = layer;

    const run = this.model!.attributes;
    if (!isFresh(run)) {
      layer.bindDeck(run.deck);
    }
    this.#showScreenFor(run);
  }

  /** Shows the rift screen the run's state calls for, if our layer is still on screen. */
  #showScreenFor(run: RiftRunData) {
    const scene = Scene.getInstance();
    const layer = this.layer;
    if (layer == null || !this.isConnected || scene == null || scene.getContent() !== layer) {
      return;
    }

    if (isFresh(run)) {
      layer.bindDeck([]);
    }

    if (run.general_id == null) {
      layer.showCardSelectScreen(run);
    } else if (run.card_id_to_upgrade) {
      layer.showCardUpgradeScreen(run);
    } else if (run.stored_upgrades && run.stored_upgrades.length > 0) {
      layer.bindDeck(this.model!.attributes.deck);
      layer.showSelectCardToUpgradeScreen(run);
    } else {
      layer.showRiftRunScreen(run, false);
    }
  }

  /**
   * Sends a request out as `type` and settles once the shell calls done():
   * on success the next screen is shown from the updated model.
   */
  #request(type: string, detail: Record<string, unknown> = {}): Promise<void> {
    return new Promise<RequestOutcome | undefined>((resolve) => {
      this.dispatchEvent(
        new CustomEvent(type, { bubbles: true, detail: { ...detail, done: resolve as Done } }),
      );
    }).then((outcome) => {
      if (outcome?.error != null) throw outcome.error;
      if (outcome?.cancelled || this.model == null) return;
      this.#showScreenFor(this.model.attributes);
    });
  }

  #notify(type: string) {
    this.dispatchEvent(new CustomEvent(type, { bubbles: true, detail: {} }));
  }

  /* region RIFT LAYER DELEGATE */

  selectGeneral(selectedSdkCard: { id: number }) {
    return this.#request('rift-general-select', { cardId: selectedSdkCard.id });
  }

  selectCard(selectedSdkCard: { id: number }) {
    return this.#request('rift-card-select', { cardId: selectedSdkCard.id });
  }

  selectCardToUpgrade(cardId: number) {
    return this.#request('rift-card-to-upgrade-select', { cardId });
  }

  storeCurrentUpgradePack() {
    return this.#request('rift-upgrade-store');
  }

  rerollCurrentUpgradePack() {
    return this.#request('rift-upgrade-reroll');
  }

  startLookingForGame() {
    this.#notify('rift-game-find');
    return Promise.resolve();
  }

  cancelLookingForGame() {
    this.#notify('rift-game-cancel');
    return Promise.resolve();
  }

  /* endregion RIFT LAYER DELEGATE */

  /* region RIFT LAYER DATA SOURCE */

  getRiftRunGeneralId() {
    return this.model ? this.model.get('general_id') : null;
  }

  /* endregion RIFT LAYER DATA SOURCE */
}

if (!customElements.get(TAG)) customElements.define(TAG, RiftRun);
