import { expect } from '@playwright/test';

/** The client boots cocos2d and streams assets; wait for the SDK to be live. */
export async function waitForClientBoot(page) {
  await page.waitForFunction(
    () => typeof window.SDK !== 'undefined' && window.SDK.GameSession != null,
    null,
    { timeout: 120_000 },
  );
}

/** A username unique per run: registration is part of what is tested, and a reused name fails. */
export function uniqueUsername(prefix = 'e2e') {
  return `${prefix}${Date.now().toString(36)}`.slice(0, 18);
}

/**
 * Register a fresh account from the login screen and wait for new-player
 * onboarding, which lands on the tutorial lessons screen.
 */
export async function register(page, username, password) {
  // the login and registration forms are both in the DOM, so scope to the
  // registration panel
  await page.getByRole('button', { name: /create account/i }).click();
  const form = page.locator('#app-registration');
  await form.getByRole('textbox', { name: 'Username' }).fill(username);
  await form.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
  await form.getByRole('textbox', { name: 'Confirm Password' }).fill(password);
  await form.getByRole('button', { name: /submit/i }).click();

  // the server creates the user, grants the starting collection through
  // Firebase, then the client logs in and runs new-player onboarding
  await expect(page.getByText(/welcome to duelyst/i)).toBeVisible({ timeout: 120_000 });
}

/** Skip the tutorial, then click through reward dialogs until the main menu is up. */
export async function skipTutorialToMainMenu(page) {
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
  return mainMenuPlay;
}
