/*
 * SPIKE — issue #3. THROWAWAY PROOF, NOT PRODUCTION CODE.
 *
 * The CommonJS half of the proof. This file is written exactly like the 200 other
 * `require()`-only files in `apps/client/ui`: no `import`, no binding taken out of the ESM
 * module. The ONLY thing the require below does is run
 * `customElements.define('duelyst-spike-probe', ...)`; the boundary between the old
 * stack and the new one is the tag name in `MARKUP`, which is the whole argument for
 * decision 5 in docs/BACKBONE_REMOVAL_PLAN.md.
 *
 * Nothing is rendered at load. `mount()` exists so a browser can be pointed at the
 * production bundle and asked whether the element actually upgraded — see
 * tools/spike/verify-lit-interop.mjs.
 *
 * NOT WIRED INTO THE BUILD. Nothing requires this file, so it is unreachable from
 * `apps/client/index.ts` and costs the shipped bundle zero bytes — deliberately, so a
 * throwaway proof cannot outlive its usefulness by riding along in every download.
 * To re-run the proof, add this line at the top of `apps/client/index.ts`, rebuild, run the
 * verifier, and take it back out:
 *
 *     require('./ui/components/spike/spike-host');
 *
 * Delete this directory when the spike is retired.
 */
'use strict';

// side-effect require: registers <duelyst-spike-probe>, returns nothing we use
require('./spike-probe');

var MARKUP = '<duelyst-spike-probe label="cjs-require"></duelyst-spike-probe>';

/**
 * Drop the tag into the DOM the way a Handlebars template would, and let the
 * custom element registry do the rest.
 */
function mount(parent) {
  var container = document.createElement('div');
  container.id = 'duelyst-lit-spike';
  container.innerHTML = MARKUP;
  (parent || document.body).appendChild(container);
  return container;
}

module.exports = {
  MARKUP: MARKUP,
  mount: mount,
};

// handle for the spike verifier; harmless, and removed with the spike
if (typeof window !== 'undefined') {
  (window as any).__duelystLitSpike = module.exports;
}
