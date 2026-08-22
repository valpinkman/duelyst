import { test, expect } from '@playwright/test';

/*
 * Regression: destroying a bootstrap tooltip/popover while its fade is still
 * running threw
 *   Uncaught TypeError: Cannot read properties of null (reading 'trigger')
 * from the `complete` callback bootstrap's show() schedules.
 *
 * bootstrap 3's Tooltip#destroy nulls `$element`, and show()'s completion does
 *   that.$element.trigger('shown.bs.' + that.type)
 * with no guard -- while hide()'s completion DOES guard (`if (that.$element)`,
 * with an upstream TODO wondering whether it is necessary). It is.
 *
 * The client shows a popover and destroys it moments later in ~120 places,
 * deck_select.ts among them, which is where it was seen.
 *
 * This has to run in a real browser: the buggy path is only taken when
 * `$.support.transition` is truthy, and that is false under jsdom, so the
 * transition callback never gets scheduled and the race cannot happen.
 */

/** The fade is 150ms (Tooltip.TRANSITION_DURATION); leave room around it. */
const FADE_SETTLE_MS = 600;

test.describe('bootstrap popover teardown', () => {
  test('destroying a popover mid-fade does not throw', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error' && /reading 'trigger'/.test(msg.text())) errors.push(msg.text());
    });

    await page.goto('/');
    // vendor.js carries jQuery + bootstrap; no need to wait for the whole client
    await page.waitForFunction(() => window.$ != null && window.$.fn.popover != null, null, {
      timeout: 120_000,
    });

    const supportsTransition = await page.evaluate(() => {
      const $ = window.$;
      const $el = $('<div id="popover-teardown-probe">probe</div>')
        .css({ position: 'absolute', top: '20px', left: '20px' })
        .appendTo('body');

      // animation:true is what puts the 'fade' class on the tip
      $el.popover({ content: 'probe', trigger: 'manual', animation: true });
      $el.popover('show');

      /*
       * The chain the client actually uses (form_prompt_modal, login_menu,
       * confirm_purchase_dialog, ...): destroy, re-init, show.
       *
       * destroy() removes the 'bs.popover' data INSIDE its async completion, so
       * at this point the data is still there -- the re-init is a no-op and the
       * show() runs on the instance that is already being torn down. Its
       * teardown callback is bound first, nulls $element, and then show()'s
       * completion callback dereferences it.
       */
      $el.popover('destroy');
      $el.popover({ content: 'probe again', trigger: 'manual', animation: true });
      $el.popover('show');

      return Boolean($.support.transition);
    });

    // if this were false the test would pass vacuously - the race needs it
    expect(supportsTransition, 'browser must report CSS transition support').toBe(true);

    await page.waitForTimeout(FADE_SETTLE_MS);

    expect(errors, `popover teardown threw:\n${errors.join('\n')}`).toEqual([]);
  });
});
