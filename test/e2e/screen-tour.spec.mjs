import { test, expect } from '@playwright/test';
import { takeErrors, watchConsole } from './helpers/console.mjs';
import {
  register,
  skipTutorialToMainMenu,
  uniqueUsername,
  waitForClientBoot,
} from './helpers/session.mjs';
import { SCREENS, screen } from './screens.mjs';

/*
 * The screen tour (issue #2): the regression net for the Marionette removal.
 *
 * One account, one login, then every screen in the census (./screens.mjs) in
 * turn. Per screen it asserts a stable DOM landmark and zero console errors,
 * and saves a named screenshot. The screenshots are artifacts for a human to
 * look at, NOT assertions: pixel diffs on this page are flaky (streamed
 * assets, fonts, WebGL). They land in test-results/ under this test's output
 * directory as screens/NN-<Screen>.png, and are attached to the report.
 *
 * Navigation goes the way the app's own code goes - App.showCollection(),
 * the utility menu's toggleProfile(), a layout's own startCraftingMode() -
 * through the dev-only seam `window.__duelystE2E` (apps/client/application.ts,
 * decision D1). The seam is eliminated from production and staging bundles,
 * so this spec only runs against a development build.
 *
 * Seeded state: the rift run (RiftRunShell, #65) needs a run in progress, so
 * the tour account claims its free first rift run through the deck-select
 * layout's own handler, on whatever Firebase/Postgres the stack points at
 * (.env.dev: duelyst-ci). Each run registers a fresh account, so the seed
 * never collides with an earlier one.
 *
 * Not toured (with its reason in ./screens.mjs):
 *   - BuddySelectionLayout: needs a second account and an accepted friend
 *     request (D3).
 * test/unit/misc/screen_census.js fails if a LayoutView appears that this
 * census does not account for.
 *
 * Errors are attributed per screen: the console buffer is drained at every
 * step, so an error is charged to the screen that was being shown.
 *
 * A missing asset is a failure here: 404s under resources/ are never
 * allowlisted (helpers/console.mjs).
 *
 * Runtime: the suite runs with `workers: 1` and a 420_000 ms default timeout
 * (playwright.config.mjs). Measured on a local stack (2026-10-15, af4419c): 24
 * screens in 87 s, 88.6 s for the whole test including boot and registration,
 * so it fits the suite default with room to spare.
 */

// every runtime CONFIG key that is a timing; ANIMATE_* alone reaches 3 keys and
// misses VIEW_TRANSITION_DURATION, which animations.ts reads for every view
const TIMING_KEY = /_(DURATION|DELAY)$/;

// errors that arrive just after a screen settles still belong to it
const SETTLE_MS = 1_500;

/**
 * Run `fn` in the page with the seam as its first argument. `fn` is serialised
 * into the page, so it can use only its arguments and page globals.
 */
function inApp(page, fn, arg) {
  return page.evaluate(
    ([source, value]) => {
      const run = new Function(`return (${source})`)();
      return run(window.__duelystE2E, value);
    },
    [fn.toString(), arg],
  );
}

/** Put the collection layout into one of its modes, the way its own handlers do. */
function collectionMode(page, mode) {
  return inApp(
    page,
    (seam, which) => {
      const view = window.NavigationManager.getInstance().getContentView();
      if (!(view instanceof seam.layouts.CollectionLayout)) {
        throw new Error('the collection is not the content view');
      }
      if (which === 'selected-card') {
        view.onSelectCard(view.cardsCollectionCompositeView.children.first());
      } else if (which === 'crafting') {
        view.startCraftingMode();
      } else if (which === 'new-deck') {
        view.onNewDeck();
      } else if (which === 'card-back') {
        view.startDeckCardBackSelectingMode(view._deck);
      } else if (which === 'browsing') {
        view.startBrowsingMode();
      } else {
        throw new Error(`unknown collection mode ${which}`);
      }
    },
    mode,
  );
}

test.describe('screen tour', () => {
  test('visits every screen in one logged-in session', async ({ page }, testInfo) => {
    const startedAt = Date.now();
    const errors = watchConsole(page);
    const visited = [];

    /**
     * Show one screen and check it. `navigate` brings it up (omit when the
     * flow already did); the landmark from the census proves it rendered.
     */
    async function visit(name, navigate) {
      await test.step(name, async () => {
        const entry = screen(name);
        if (navigate) await navigate();

        // soft, so one run reports every screen whose landmark is wrong; each
        // step navigates on its own, so a miss does not derail the next one
        const landmark = page.locator(entry.landmark).first();
        if (entry.attached || entry.visible) {
          await expect.soft(landmark, `${name} landmark`).toBeAttached();
        } else {
          await expect.soft(landmark, `${name} landmark`).toBeVisible();
        }
        if (entry.visible) {
          await expect
            .soft(landmark.locator(entry.visible).first(), `${name} ${entry.visible}`)
            .toBeVisible();
        }
        if (entry.registered) {
          // a component with no DOM (#12 D3): its registration is the proof
          const registered = await page.evaluate(
            (tag) => !!customElements.get(tag),
            entry.registered,
          );
          expect.soft(registered, `${name} <${entry.registered}> registered`).toBe(true);
        }

        await page.waitForTimeout(SETTLE_MS);
        const file = testInfo.outputPath(
          'screens',
          `${String(visited.length + 1).padStart(2, '0')}-${name}.png`,
        );
        await page.screenshot({ path: file });
        await testInfo.attach(name, { path: file, contentType: 'image/png' });

        const stepErrors = takeErrors(errors);
        expect
          .soft(stepErrors, `${name} logged console errors:\n${stepErrors.join('\n')}`)
          .toEqual([]);
        visited.push(name);
      });
    }

    const closeModal = () =>
      inApp(page, () => window.NavigationManager.getInstance().destroyModalView());

    /** A modal the utility menu opens, via its own toggle method. */
    const utilityModal = (method) => () =>
      inApp(
        page,
        async (_seam, toggle) => {
          const nav = window.NavigationManager.getInstance();
          await nav.destroyModalView();
          nav.getUtilityView()[toggle]();
        },
        method,
      );

    // --- boot -------------------------------------------------------------
    await test.step('boot', async () => {
      await page.goto('/');
      await waitForClientBoot(page);

      const hasSeam = await page.evaluate(() => window.__duelystE2E != null);
      expect(hasSeam, 'window.__duelystE2E is missing: is this a production build?').toBe(true);

      const zeroed = await page.evaluate((pattern) => {
        const re = new RegExp(pattern);
        const keys = Object.keys(window.CONFIG).filter(
          (k) => re.test(k) && typeof window.CONFIG[k] === 'number',
        );
        for (const k of keys) window.CONFIG[k] = 0;
        return keys;
      }, TIMING_KEY.source);
      testInfo.annotations.push({
        type: 'animation timings zeroed',
        description: `${zeroed.length} keys matching ${TIMING_KEY}`,
      });
      expect(zeroed).toContain('VIEW_TRANSITION_DURATION');
      expect(zeroed.filter((k) => !k.startsWith('ANIMATE_')).length).toBeGreaterThan(0);

      expect(takeErrors(errors), 'console errors during boot').toEqual([]);
    });

    // --- a fresh account's own path ---------------------------------------
    await test.step('register', () => register(page, uniqueUsername('tour'), 'e2e-duelyst-pw'));
    await visit('TutorialLessonsShell');
    await test.step('skip to the main menu', () => skipTutorialToMainMenu(page));
    await visit('MainMenuItemView');
    await visit('NotificationsLayout');

    // --- modals over the main menu ----------------------------------------
    await visit('QuestLogShell', utilityModal('toggleQuestLog'));
    await visit('ProfileLayout', utilityModal('toggleProfile'));
    await visit('BuddiesLayout', utilityModal('toggleBuddyList'));
    await closeModal();

    // --- play modes -------------------------------------------------------
    await visit('PlayLayout', () => inApp(page, (seam) => seam.App.showPlay('')));
    await visit('ArenaShell', async () => {
      await inApp(page, (seam) => seam.App.showPlay(window.SDK.PlayModes.Gauntlet));
      // the element draws nothing: wait for the cocos layer it puts on screen
      await page.waitForFunction(() => {
        const arena = document.querySelector('duelyst-arena');
        return (
          arena?.layer != null &&
          window.__duelystE2E.Scene.getInstance().getContent() === arena.layer
        );
      });
    });
    await visit('RiftDeckSelectLayout', () =>
      inApp(page, (seam) => seam.App.showPlay(window.SDK.PlayModes.Rift)),
    );
    await visit('RiftRunShell', async () => {
      // seed: claim the account's free first run, the way the runs list's
      // button does; the layout then shows the run in its content region
      await inApp(page, (seam) => {
        const play = window.NavigationManager.getInstance().getContentView();
        const rift = play?.modeRegion?.currentView;
        if (!(rift instanceof seam.layouts.RiftDeckSelectLayout)) {
          throw new Error('the rift deck-select layout is not showing');
        }
        return rift.startNewRiftRunWithExisting();
      });
      // the element draws nothing: wait for the cocos layer it puts on screen
      await page.waitForFunction(() => {
        const run = document.querySelector('duelyst-rift-run');
        return (
          run?.layer != null && window.__duelystE2E.Scene.getInstance().getContent() === run.layer
        );
      });
    });

    // --- the collection and its modes -------------------------------------
    await visit('CollectionLayout', () => inApp(page, (seam) => seam.App.showCollection()));
    await visit('SelectedCardLayout', async () => {
      await page.waitForFunction(() => {
        const view = window.NavigationManager.getInstance().getContentView();
        return view?.cardsCollectionCompositeView?.children?.length > 0;
      });
      await collectionMode(page, 'selected-card');
    });
    await visit('CraftingCompositeView', () => collectionMode(page, 'crafting'));
    await visit('DeckLayout', () => collectionMode(page, 'new-deck'));
    await visit('DeckCardBackSelectView', () => collectionMode(page, 'card-back'));
    // back to browsing: discards the empty new deck the way the app does
    await collectionMode(page, 'browsing');

    // --- the other main-menu destinations ---------------------------------
    await visit('CodexLayout', () => inApp(page, (seam) => seam.App.showCodex()));
    await visit('ShopLayout', () => inApp(page, (seam) => seam.App.showShop()));
    await visit('WatchShell', () => inApp(page, (seam) => seam.App.showWatch()));
    await visit('BoosterPackCollectionLayout', () =>
      inApp(page, (seam) => seam.App.showBoosterPackUnlock()),
    );
    await visit('ShopSpiritOrbsModalView', async () => {
      // the layout ignores the buy button while its reveal animation runs
      await page.waitForFunction(() => {
        const view = window.NavigationManager.getInstance().getContentView();
        return view != null && !view._locked;
      });
      await inApp(page, () =>
        window.NavigationManager.getInstance().getContentView().onClickBoosterBuy(),
      );
    });
    await closeModal();

    // --- a practice game --------------------------------------------------
    await test.step('start a practice game', async () => {
      await inApp(page, (seam) => seam.App.showPlay(window.SDK.PlayModes.Practice));
      await page.locator('li.deck-preview.f1.starter').click();
      await page.locator('li.ai-opponent').first().click();
      await page.getByRole('button', { name: /play practice/i }).click();
      await page.waitForFunction(
        () => window.SDK.GameSession.getInstance().gameId !== 'N/A',
        null,
        { timeout: 120_000 },
      );
      // several hidden layouts also contain a Confirm button: take the visible one
      await expect(page.getByText(/choose starting hand/i)).toBeVisible({ timeout: 60_000 });
      await page
        .getByRole('button', { name: /confirm/i })
        .locator('visible=true')
        .first()
        .click();
      await page.waitForFunction(
        () => window.SDK.GameSession.getInstance().getStatus() === 'active',
        null,
        { timeout: 60_000 },
      );
    });
    await visit('GameLayout');
    await visit('GamePlayer1Layout');
    await visit('GamePlayer2Layout');
    await visit('MyPlayerPopoverLayout');
    await visit('OpponentPlayerPopoverLayout');

    // --- coverage ---------------------------------------------------------
    const toured = SCREENS.filter((s) => s.status === 'toured').map((s) => s.name);
    expect([...visited].sort(), 'screens visited vs the census').toEqual([...toured].sort());
    testInfo.annotations.push({
      type: 'tour runtime',
      description: `${visited.length} screens in ${Math.round((Date.now() - startedAt) / 1000)} s`,
    });
  });
});
