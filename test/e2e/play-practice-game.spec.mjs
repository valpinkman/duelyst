import { test, expect } from '@playwright/test';

/*
 * The check this repo could not make automatically before: does the game
 * actually run?
 *
 * Every bug this migration produced that unit tests and a green build missed
 * was visible here within seconds — a bundler plugin that stopped matching
 * renamed files (shaders silently gone), an env value resolved under the wrong
 * NODE_ENV (client calling the wrong API host), a require whose extension went
 * stale (server dead on boot). So the assertions below deliberately include
 * "no console errors": that single line is the one that catches them.
 */

const CONSOLE_NOISE = [
  // dev-only, and unrelated to whether the game works
  /Failed to load resource: the server responded with a status of 404/,
];

/** Collect page errors so a test can assert the client booted cleanly. */
function watchConsole(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (CONSOLE_NOISE.some((re) => re.test(text))) return;
    errors.push(text);
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
}

/** The client boots cocos2d and streams assets; wait for the SDK to be live. */
async function waitForClientBoot(page) {
  await page.waitForFunction(() => typeof window.SDK !== 'undefined' && window.SDK.GameSession != null, null, { timeout: 120_000 });
}

/** Read game state straight from the SDK singleton the client exposes. */
function gameState(page) {
  return page.evaluate(() => {
    const gs = window.SDK.GameSession.getInstance();
    return {
      gameId: gs.gameId,
      status: gs.getStatus(),
      stepCount: gs.getStepCount(),
      isMyTurn: gs.getCurrentPlayerId() === gs.getMyPlayerId(),
      units: gs.getBoard().getUnits().map((u) => u.getName()),
    };
  });
}

test.describe('the game runs', () => {
  test('boots to the login screen without console errors', async ({ page }) => {
    const errors = watchConsole(page);

    await page.goto('/');
    await waitForClientBoot(page);
    await expect(page.getByRole('button', { name: /login/i }).first()).toBeVisible();

    // guards the whole class of "builds fine, broken at runtime" bugs
    expect(errors, `client logged console errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('registers an account, starts a practice game, and the AI takes its turn', async ({ page }) => {
    const errors = watchConsole(page);
    // unique per run: registration is part of what we are testing, and reusing
    // a name would fail on the second run
    const username = `e2e${Date.now().toString(36)}`.slice(0, 18);
    const password = 'e2e-duelyst-pw';

    await page.goto('/');
    await waitForClientBoot(page);

    // --- register ---------------------------------------------------------
    // the login and registration forms are both in the DOM, so scope to the
    // registration panel
    await page.getByRole('button', { name: /create account/i }).click();
    const register = page.locator('#app-registration');
    await register.getByRole('textbox', { name: 'Username' }).fill(username);
    await register.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
    await register.getByRole('textbox', { name: 'Confirm Password' }).fill(password);
    await register.getByRole('button', { name: /submit/i }).click();

    // the server creates the user, grants the starting collection through
    // Firebase, then the client logs in and runs new-player onboarding
    await expect(page.getByText(/welcome to duelyst/i)).toBeVisible({ timeout: 120_000 });

    // --- skip the tutorial, clear the reward dialogs -----------------------
    await page.locator('#button_skip').click();
    await page.getByRole('button', { name: /^ok$/i }).click();

    // achievements and daily-reward popups appear in sequence; click through
    // whatever shows up until the main menu is reachable
    // the menu renders uppercase via CSS; the accessible name is 'Play'
    const mainMenuPlay = page.getByRole('button', { name: 'Play', exact: true });
    await expect(async () => {
      if (await mainMenuPlay.isVisible().catch(() => false)) return;
      const gotIt = page.getByRole('button', { name: /got it/i });
      if (await gotIt.isVisible().catch(() => false)) {
        await gotIt.click();
      } else {
        await page.locator('body').click({ position: { x: 640, y: 400 } });
      }
      throw new Error('main menu not reached yet');
    }).toPass({ timeout: 120_000, intervals: [2000] });

    // --- start a practice game --------------------------------------------
    await mainMenuPlay.click();
    await page.getByText('Practice', { exact: true }).first().click();
    await page.locator('li.deck-preview.f1.starter').click();
    await page.locator('li.ai-opponent').first().click();
    await page.getByRole('button', { name: /play practice/i }).click();

    // the single-player server creates the game and assigns an id
    await page.waitForFunction(
      () => window.SDK.GameSession.getInstance().gameId !== 'N/A',
      null,
      { timeout: 120_000 },
    );

    // --- mulligan, then hand the turn to the AI ---------------------------
    // the starting-hand screen confirms itself if left alone, so only click it
    // when it is actually up
    // NOTE on selectors in this client: the UI uppercases labels with CSS and
    // several buttons carry a leading icon character, so match by ROLE with a
    // case-insensitive name rather than by exact text.
    // several hidden layouts also contain a Confirm button, so take the
    // visible one
    const confirmHand = page.getByRole('button', { name: /confirm/i }).locator('visible=true').first();
    await expect(page.getByText(/choose starting hand/i)).toBeVisible({ timeout: 60_000 });
    await confirmHand.click();
    await page.waitForFunction(
      () => window.SDK.GameSession.getInstance().getStatus() === 'active',
      null,
      { timeout: 60_000 },
    );

    // who moves first is not fixed, so wait for the turn rather than assume it
    await page.waitForFunction(() => {
      const gs = window.SDK.GameSession.getInstance();
      return gs.getCurrentPlayerId() === gs.getMyPlayerId();
    }, null, { timeout: 120_000 });

    const beforeEndTurn = await gameState(page);

    await page.evaluate(() => {
      const gs = window.SDK.GameSession.getInstance();
      gs.submitExplicitAction(gs.actionEndTurn());
    });

    // the AI plays: steps accumulate and the turn comes back. This exercises
    // the SDK, the AI, the socket transport and the SP server together.
    await page.waitForFunction(
      (steps) => {
        const gs = window.SDK.GameSession.getInstance();
        return gs.getStepCount() > steps && gs.getCurrentPlayerId() === gs.getMyPlayerId();
      },
      beforeEndTurn.stepCount,
      { timeout: 120_000 },
    );

    const afterAI = await gameState(page);
    // the AI acted (it may summon, move or attack - all produce steps) and
    // play came back to us; both generals are still on the board
    expect(afterAI.stepCount).toBeGreaterThan(beforeEndTurn.stepCount);
    expect(afterAI.isMyTurn).toBe(true);
    expect(afterAI.units.length).toBeGreaterThanOrEqual(2);
    expect(afterAI.status).toBe('active');

    expect(errors, `client logged console errors:\n${errors.join('\n')}`).toEqual([]);
  });
});
