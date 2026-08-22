/*
 * SPIKE — issue #3. THROWAWAY PROOF, NOT PRODUCTION CODE.
 *
 * The smallest Lit element that can prove the thing docs/BACKBONE_REMOVAL_PLAN.md
 * decision 5 depends on: that an ESM-only Lit module can be pulled into this
 * 100%-CommonJS graph by `require()` (see ./spike-host.ts) and still work in the
 * real `pnpm build` bundle.
 *
 * It follows the plan's conventions on purpose, so that what the spike proves is
 * what the migration will actually do:
 *   - light DOM (§3.1) — `createRenderRoot()` returns `this`, so the 12,508 lines
 *     of Bootstrap-importing SCSS keep applying
 *   - `static properties` rather than decorators (§3.1) — `tsconfig.json` has no
 *     `experimentalDecorators`
 *   - `declare` for the reactive property (AGENTS.md) — a real class field creates
 *     an own property that shadows Lit's prototype accessor
 *
 * Delete this directory when the spike is retired.
 */
import { LitElement, html } from 'lit';

export class SpikeProbe extends LitElement {
  static properties = {
    label: { type: String },
  };

  declare label: string;

  constructor() {
    super();
    this.label = 'unset';
  }

  // light DOM: no shadow root, existing stylesheets keep working
  createRenderRoot() {
    return this;
  }

  render() {
    return html`<span class="duelyst-spike-probe__text">lit ok: ${this.label}</span>`;
  }
}

customElements.define('duelyst-spike-probe', SpikeProbe);
