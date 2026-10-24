#!/usr/bin/env node
/*
 * Screenshot a list of screens from a running client, for the before/after
 * comparison every screen port carries (issue #71, docs/BACKBONE_REMOVAL_PLAN.md
 * §3.5). ./run.mjs drives it for two refs; it can also be run by hand:
 *
 *   node test/e2e/visual/capture.mjs --base-url http://localhost:3000 \
 *        --user vis1a2b3c --out /tmp/vis/before [--screens WatchShell,CodexLayout]
 *   node test/e2e/visual/capture.mjs --base-url ... --user vis1a2b3c --setup
 *
 * `--setup` registers the account, skips the tutorial and claims its free
 * rift run, so that every later capture logs in to the same state. Captures
 * then only log in: the before and after builds see the same account, the
 * same collection and the same rift run, on the same stack.
 *
 * The script lives in the checkout that runs it, not in the build under test:
 * only the client bundle served at --base-url changes between captures. So
 * navigation goes through what both sides of a port share - the dev-only
 * `window.__duelystE2E` seam's `App` and `Scene`, and the NavigationManager -
 * and never through a class that the port renamed.
 *
 * Every screen is written twice: `<NN>-<Screen>.png` is the whole frame, and
 * `<NN>-<Screen>.dom.png` hides the cocos canvas. The canvas animates (the
 * main-menu backdrop never stops), so the DOM image is where a Lit port's
 * markup and styling show; the full frame is where a port that owns a cocos
 * layer (the rift run, D3) shows. Capture the before build twice and pass the
 * second as `--noise` to compare.mjs to see how much of a diff is animation.
 *
 * Determinism: fixed 1280x720 viewport at DPR 1, every *_DURATION/_DELAY
 * CONFIG key zeroed (as the screen tour does), CSS animations and the caret
 * disabled by Playwright, fonts and images awaited, and the network idle for
 * SETTLE_MS before each shot. Audio is muted at the browser (--mute-audio,
 * headless) and in game (master volume 0).
 *
 * Use a development build on a stack pointed at .env.dev, never .env: the
 * account and rift run are written to whatever Firebase/Postgres it uses.
 */

import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from '@playwright/test';
import { register, skipTutorialToMainMenu, waitForClientBoot } from '../helpers/session.mjs';

export const VIEWPORT = { width: 1280, height: 720 };
const PASSWORD = 'e2e-duelyst-pw';
const TIMING_KEY = /_(DURATION|DELAY)$/;
// the network must be quiet this long before a shot
const SETTLE_MS = 1_500;
// and then this much longer, for the frame after the last asset decoded
const AFTER_IDLE_MS = 750;
/**
 * Painted over in every shot, on both sides of a comparison. Card art is a
 * sprite sheet stepped by script, not a CSS animation, so `animations:
 * 'disabled'` does not stop it, and two captures of one build catch each
 * card on a different frame (1.3 % of the collection on its own). Same for
 * the zodiac canvases on the main-menu buttons.
 */
const MASK = [
  '.card-sprite .sprite',
  '.signature-card-sprite .sprite',
  // the main-menu buttons each draw an animated constellation on a canvas
  '.zodiac-symbol-canvas',
];
const MASK_COLOR = '#ff00ff';

/** Run `fn` in the page with the seam as its first argument (see screen-tour.spec.mjs). */
function inApp(page, fn, arg) {
  return page.evaluate(
    ([source, value]) => {
      const run = new Function(`return (${source})`)();
      return run(window.__duelystE2E, value);
    },
    [fn.toString(), arg],
  );
}

const closeModal = (page) =>
  inApp(page, () => window.NavigationManager.getInstance().destroyModalView());

const mainMenu = async (page) => {
  await closeModal(page);
  await inApp(page, (seam) => seam.App._showMainMenu());
};

/** A modal the utility menu opens over the main menu, via its own toggle. */
const utilityModal = (method) => async (page) => {
  await mainMenu(page);
  await inApp(
    page,
    (_seam, toggle) => window.NavigationManager.getInstance().getUtilityView()[toggle](),
    method,
  );
};

const show =
  (method, ...args) =>
  async (page) => {
    await closeModal(page);
    await inApp(
      page,
      (seam, [m, a]) =>
        seam.App[m](...a.map((x) => (x && x.playMode ? window.SDK.PlayModes[x.playMode] : x))),
      [method, args],
    );
  };

/** The collection, freshly shown, then one of its modes via the layout's own handlers. */
const collectionMode = (mode) => async (page) => {
  // showCollection rejects while the collection is already up: leave it first
  await mainMenu(page);
  await show('showCollection')(page);
  await page.waitForFunction(() => {
    const view = window.NavigationManager.getInstance().getContentView();
    return view?.cardsCollectionCompositeView?.children?.length > 0;
  });
  if (!mode) return;
  await inApp(
    page,
    (_seam, which) => {
      const view = window.NavigationManager.getInstance().getContentView();
      if (which === 'selected-card') {
        view.onSelectCard(view.cardsCollectionCompositeView.children.first());
      } else if (which === 'crafting') {
        view.startCraftingMode();
      } else if (which === 'new-deck') {
        view.onNewDeck();
      } else if (which === 'card-back') {
        view.onNewDeck();
        view.startDeckCardBackSelectingMode(view._deck);
      }
    },
    mode,
  );
};

/** Back to browsing: discards the empty new deck the way the app does. */
const backToBrowsing = (page) =>
  inApp(page, () => window.NavigationManager.getInstance().getContentView()?.startBrowsingMode?.());

/** The rift layout inside the play layout, once its runs list has loaded. */
async function riftLayout(page) {
  await show('showPlay', { playMode: 'Rift' })(page);
  await page.waitForFunction(() => {
    const play = window.NavigationManager.getInstance().getContentView();
    const rift = play?.modeRegion?.currentView;
    return rift?.runsCollection != null && rift.contentRegion?.currentView != null;
  });
}

/**
 * The account's rift run: resumed from the runs list the way a click on it
 * does, or (in --setup only) claimed as the free first run. Works on builds
 * from before and after the rift run port (#65): both use the same layout.
 */
const riftRun = (claim) => async (page) => {
  await riftLayout(page);
  await inApp(
    page,
    (_seam, mayClaim) => {
      const rift = window.NavigationManager.getInstance().getContentView().modeRegion.currentView;
      const run = rift.runsCollection.first();
      if (run != null) {
        rift.contentRegion.currentView.trigger('select', run);
        return null;
      }
      if (!mayClaim) throw new Error('the account has no rift run: run capture.mjs --setup first');
      return rift.startNewRiftRunWithExisting();
    },
    claim,
  );
  // the run screen is a cocos layer: wait for the Scene to show something
  // other than what the runs list left there
  await page.waitForFunction(() => {
    const rift = window.NavigationManager.getInstance().getContentView().modeRegion.currentView;
    const current = rift.contentRegion.currentView;
    return current != null && current.collection == null;
  });
};

/**
 * The screens, in the screen tour's order, with names from its census
 * (test/e2e/screens.mjs). `go` brings the screen up from anywhere, so any
 * subset can be captured; `leave` undoes state the next screen must not see;
 * `mask` adds selectors to MASK for that screen only.
 * The game screens are not here: a practice game is random from its first
 * draw, so two runs never show the same board.
 */
export const SCREENS = [
  { name: 'TutorialLessonsShell', go: show('_showTutorialLessons') },
  // the new-player hint bubbles are placed by script against buttons that are
  // still revealing, and land a pixel or two apart from one capture to the next
  { name: 'MainMenuItemView', go: mainMenu, mask: ['.popover'] },
  { name: 'QuestLogShell', go: utilityModal('toggleQuestLog'), leave: closeModal },
  { name: 'ProfileLayout', go: utilityModal('toggleProfile'), leave: closeModal },
  { name: 'BuddiesLayout', go: utilityModal('toggleBuddyList'), leave: closeModal },
  { name: 'PlayLayout', go: show('showPlay', '') },
  { name: 'ArenaLayout', go: show('showPlay', { playMode: 'Gauntlet' }) },
  { name: 'RiftDeckSelectLayout', go: riftLayout },
  { name: 'RiftRunShell', go: riftRun(false) },
  { name: 'CollectionLayout', go: collectionMode(null) },
  { name: 'SelectedCardLayout', go: collectionMode('selected-card') },
  { name: 'CraftingCompositeView', go: collectionMode('crafting'), leave: backToBrowsing },
  { name: 'DeckLayout', go: collectionMode('new-deck'), leave: backToBrowsing },
  { name: 'DeckCardBackSelectView', go: collectionMode('card-back'), leave: backToBrowsing },
  { name: 'CodexLayout', go: show('showCodex') },
  { name: 'ShopLayout', go: show('showShop') },
  { name: 'WatchShell', go: show('showWatch') },
  { name: 'BoosterPackCollectionLayout', go: show('showBoosterPackUnlock') },
  {
    name: 'ShopSpiritOrbsModalView',
    go: async (page) => {
      // like showCollection, this rejects while its layout is already up
      await mainMenu(page);
      await show('showBoosterPackUnlock')(page);
      // the layout ignores the buy button while its reveal animation runs
      await page.waitForFunction(() => {
        const view = window.NavigationManager.getInstance().getContentView();
        return view != null && !view._locked;
      });
      await inApp(page, () =>
        window.NavigationManager.getInstance().getContentView().onClickBoosterBuy(),
      );
    },
    leave: closeModal,
  },
];

/**
 * Wait until no request has been in flight for SETTLE_MS, then until every
 * <img> has decoded and the fonts are in. Websockets are not requests, so the
 * Firebase and game-server connections do not keep this open.
 */
async function settle(page, inflight) {
  const deadline = Date.now() + 30_000;
  let quietSince = Date.now();
  while (Date.now() < deadline) {
    if (inflight.size > 0) quietSince = Date.now();
    else if (Date.now() - quietSince >= SETTLE_MS) break;
    await page.waitForTimeout(100);
  }
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].filter((i) => !i.complete).map((i) => i.decode().catch(() => {})),
    );
  });
  await page.waitForTimeout(AFTER_IDLE_MS);
}

/**
 * From the login screen to the main menu, clicking through whatever pops up.
 *
 * The client races here: now and then the session logs in and every manager
 * comes up, but App.main() still leaves the login screen in place (seen on
 * roughly half of headless logins). So once the managers are ready, a login
 * screen that is still showing gets App.main() run again, which is what the
 * login handler would have done.
 */
async function login(page, username) {
  const form = page.locator('#app-login');
  await form.locator('.login-username').fill(username);
  await form.locator('.login-password').fill(PASSWORD);
  await form.locator('button.login').click();
  await page.waitForFunction(() => window.__duelystE2E.App.getIsLoggedIn(), null, {
    timeout: 120_000,
  });
  await page.evaluate(() => window.__duelystE2E.App.managersReadyDeferred.promise);
  const play = page.getByRole('button', { name: 'Play', exact: true });
  const deadline = Date.now() + 120_000;
  let nudgeAt = Date.now() + 10_000;
  while (!(await play.isVisible().catch(() => false))) {
    if (Date.now() > deadline) throw new Error(`login as ${username} never reached the main menu`);
    const gotIt = page.getByRole('button', { name: /got it|^ok$/i }).locator('visible=true');
    if (await gotIt.count()) {
      await gotIt
        .first()
        .click()
        .catch(() => {});
    } else if (Date.now() > nudgeAt && (await form.isVisible().catch(() => false))) {
      console.log('logged in but still on the login screen: running App.main() again');
      await inApp(page, (seam) => (seam.App._mainPromise == null ? seam.App.main() : null));
      nudgeAt = Date.now() + 10_000;
    }
    await page.waitForTimeout(1_000);
  }
}

/** Boot the client: mute it, zero its timings, check it is a dev build. */
async function boot(page, baseUrl) {
  await page.addInitScript(() => {
    // in-game master volume 0, set the moment the bundle publishes CONFIG
    let config;
    Object.defineProperty(window, 'CONFIG', {
      configurable: true,
      get: () => config,
      set: (value) => {
        config = value;
        if (value && typeof value === 'object') value.DEFAULT_MASTER_VOLUME = 0;
      },
    });
  });
  await page.goto(baseUrl);
  await waitForClientBoot(page);
  const ok = await page.evaluate((pattern) => {
    if (window.__duelystE2E == null) return false;
    const re = new RegExp(pattern);
    for (const k of Object.keys(window.CONFIG)) {
      if (re.test(k) && typeof window.CONFIG[k] === 'number') window.CONFIG[k] = 0;
    }
    window.CONFIG.DEFAULT_MASTER_VOLUME = 0;
    return true;
  }, TIMING_KEY.source);
  if (!ok) throw new Error('window.__duelystE2E is missing: capture needs a development build');
}

/** Capture `screens` (names) into `out`. Returns [{ name, files }]. */
export async function capture({ baseUrl, user, out, screens, setup = false, headed = false }) {
  const browser = await chromium.launch({
    headless: !headed,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--mute-audio',
    ],
  });
  // the Desktop Chrome profile, as the e2e suite uses: its user agent does not
  // say "Headless", which the client rejects as an unsupported browser
  const context = await browser.newContext({
    ...devices['Desktop Chrome'],
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const inflight = new Set();
  page.on('request', (r) => inflight.add(r));
  page.on('requestfinished', (r) => inflight.delete(r));
  page.on('requestfailed', (r) => inflight.delete(r));
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  try {
    await boot(page, baseUrl);
    if (setup) {
      await register(page, user, PASSWORD);
      await skipTutorialToMainMenu(page);
      await riftRun(true)(page);
      await settle(page, inflight);
      console.log(`set up ${user}: registered, tutorial skipped, rift run claimed`);
      return [];
    }
    await login(page, user);

    fs.mkdirSync(out, { recursive: true });
    const wanted = screens?.length ? screens : SCREENS.map((s) => s.name);
    const unknown = wanted.filter((n) => !SCREENS.some((s) => s.name === n));
    if (unknown.length) throw new Error(`unknown screen(s): ${unknown.join(', ')}`);
    const written = [];
    for (const entry of SCREENS.filter((s) => wanted.includes(s.name))) {
      const index = String(SCREENS.indexOf(entry) + 1).padStart(2, '0');
      const base = path.join(out, `${index}-${entry.name}`);
      await entry.go(page);
      await settle(page, inflight);
      const shot = {
        animations: 'disabled',
        caret: 'hide',
        scale: 'css',
        mask: [...MASK, ...(entry.mask ?? [])].map((selector) => page.locator(selector)),
        maskColor: MASK_COLOR,
      };
      await page.screenshot({ ...shot, path: `${base}.png` });
      await page.screenshot({
        ...shot,
        path: `${base}.dom.png`,
        style: '#app-gamecanvas { visibility: hidden !important; }',
      });
      if (entry.leave) await entry.leave(page);
      written.push({ name: entry.name, files: [`${base}.png`, `${base}.dom.png`] });
      console.log(`captured ${entry.name}`);
    }
    if (pageErrors.length) console.warn(`page errors during capture:\n${pageErrors.join('\n')}`);
    return written;
  } finally {
    await browser.close();
  }
}

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    if (key === 'setup' || key === 'headed') flags[key] = true;
    else flags[key] = argv[++i];
  }
  return flags;
}

if (import.meta.url === new URL(`file://${path.resolve(process.argv[1] ?? '')}`).href) {
  const flags = parseArgs(process.argv.slice(2));
  if (!flags.user || (!flags.setup && !flags.out)) {
    console.error(
      'usage: capture.mjs --user <name> (--setup | --out <dir>) [--base-url URL] [--screens A,B]',
    );
    process.exit(2);
  }
  capture({
    baseUrl: flags['base-url'] ?? process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    user: flags.user,
    out: flags.out,
    screens: flags.screens ? flags.screens.split(',') : null,
    setup: !!flags.setup,
    headed: !!flags.headed,
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
