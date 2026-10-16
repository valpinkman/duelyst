import { test, expect } from '@playwright/test';
import { watchConsole } from './helpers/console.mjs';
import {
  register,
  skipTutorialToMainMenu,
  uniqueUsername,
  waitForClientBoot,
} from './helpers/session.mjs';

/*
 * The check this repo could not make automatically before: does the game
 * actually run?
 *
 * Every bug this migration produced that unit tests and a green build missed
 * was visible here within seconds — a bundler plugin that stopped matching
 * renamed files (shaders silently gone), an env value resolved under the wrong
 * NODE_ENV (client calling the wrong API host), a require whose extension went
 * stale (server dead on boot). So the assertions below deliberately include
 * "no console errors": that single line is the one that catches them. What
 * counts as noise - and why a 404 under resources/ never does - is in
 * helpers/console.mjs, shared with screen-tour.spec.mjs.
 */

/** Read game state straight from the SDK singleton the client exposes. */
function gameState(page) {
  return page.evaluate(() => {
    const gs = window.SDK.GameSession.getInstance();
    return {
      gameId: gs.gameId,
      status: gs.getStatus(),
      stepCount: gs.getStepCount(),
      isMyTurn: gs.getCurrentPlayerId() === gs.getMyPlayerId(),
      units: gs
        .getBoard()
        .getUnits()
        .map((u) => u.getName()),
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

  test('registers an account, starts a practice game, and the AI takes its turn', async ({
    page,
  }) => {
    const errors = watchConsole(page);
    const username = uniqueUsername();
    const password = 'e2e-duelyst-pw';

    await page.goto('/');
    await waitForClientBoot(page);

    // --- register, skip the tutorial, clear the reward dialogs -------------
    await register(page, username, password);
    const mainMenuPlay = await skipTutorialToMainMenu(page);

    // --- start a practice game --------------------------------------------
    await mainMenuPlay.click();
    await page.getByText('Practice', { exact: true }).first().click();
    await page.locator('li.deck-preview.f1.starter').click();
    await page.locator('li.ai-opponent').first().click();
    await page.getByRole('button', { name: /play practice/i }).click();

    // the single-player server creates the game and assigns an id
    await page.waitForFunction(() => window.SDK.GameSession.getInstance().gameId !== 'N/A', null, {
      timeout: 120_000,
    });

    // --- mulligan, then hand the turn to the AI ---------------------------
    // the starting-hand screen confirms itself if left alone, so only click it
    // when it is actually up
    // NOTE on selectors in this client: the UI uppercases labels with CSS and
    // several buttons carry a leading icon character, so match by ROLE with a
    // case-insensitive name rather than by exact text.
    // several hidden layouts also contain a Confirm button, so take the
    // visible one
    const confirmHand = page
      .getByRole('button', { name: /confirm/i })
      .locator('visible=true')
      .first();
    await expect(page.getByText(/choose starting hand/i)).toBeVisible({ timeout: 60_000 });
    await confirmHand.click();
    await page.waitForFunction(
      () => window.SDK.GameSession.getInstance().getStatus() === 'active',
      null,
      { timeout: 60_000 },
    );

    // who moves first is not fixed, so wait for the turn rather than assume it
    await page.waitForFunction(
      () => {
        const gs = window.SDK.GameSession.getInstance();
        return gs.getCurrentPlayerId() === gs.getMyPlayerId();
      },
      null,
      { timeout: 120_000 },
    );

    const beforeEndTurn = await gameState(page);

    await page.evaluate(() => {
      const gs = window.SDK.GameSession.getInstance();
      gs.submitExplicitAction(gs.actionEndTurn());
    });

    // The AI plays: steps accumulate and the turn comes back. This exercises
    // the SDK, the AI, the socket transport and the SP server together.
    //
    // The snapshot is taken INSIDE the polled function, not by a second
    // round-trip afterwards. Waiting for the condition and then re-reading the
    // state are two separate trips into the page, and the game keeps moving
    // between them - the AI can take another turn, flipping isMyTurn back to
    // false and failing the assertion below on a run where nothing was
    // actually wrong. That intermittent failure was observed twice.
    const afterAIHandle = await page.waitForFunction(
      (steps) => {
        const gs = window.SDK.GameSession.getInstance();
        if (!(gs.getStepCount() > steps && gs.getCurrentPlayerId() === gs.getMyPlayerId())) {
          return null; // keep polling
        }
        return {
          gameId: gs.gameId,
          status: gs.getStatus(),
          stepCount: gs.getStepCount(),
          isMyTurn: true, // true by construction: the guard above just checked it
          units: gs
            .getBoard()
            .getUnits()
            .map((u) => u.getName()),
        };
      },
      beforeEndTurn.stepCount,
      { timeout: 120_000 },
    );
    const afterAI = await afterAIHandle.jsonValue();
    // the AI acted (it may summon, move or attack - all produce steps) and
    // play came back to us; both generals are still on the board
    expect(afterAI.stepCount).toBeGreaterThan(beforeEndTurn.stepCount);
    expect(afterAI.isMyTurn).toBe(true);
    expect(afterAI.units.length).toBeGreaterThanOrEqual(2);
    expect(afterAI.status).toBe('active');

    expect(errors, `client logged console errors:\n${errors.join('\n')}`).toEqual([]);
  });
});
