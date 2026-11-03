// throwaway (PR #87 real-stack check): add-buddy prompt open, and a non-matching search
import { capture, SCREENS } from './capture.mjs';
const [, , baseUrl, user, out] = process.argv;
const openList = async (page) => {
  await page.evaluate(async () => {
    const nav = window.NavigationManager.getInstance();
    await nav.destroyModalView();
    nav.getUtilityView().toggleBuddyList();
  });
  await page.locator('#app-buddies .buddy-controls').waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
};
const closeModal = (page) => page.evaluate(() => window.NavigationManager.getInstance().destroyModalView());
SCREENS.push(
  {
    name: 'BuddiesShell-add-prompt',
    go: async (page) => {
      await openList(page);
      await page.locator('#app-buddies .add-buddy').click();
      await page.locator('#app-buddies .add-buddy-prompt').waitFor({ state: 'visible' });
      await page.waitForTimeout(1000);
    },
    leave: closeModal,
  },
  {
    name: 'BuddiesShell-search-nomatch',
    go: async (page) => {
      await openList(page);
      await page.locator("#app-buddies input[type='search']").click();
      await page.locator("#app-buddies input[type='search']").pressSequentially('zzqqnomatch');
      await page.waitForTimeout(1000);
    },
    leave: closeModal,
  },
);
await capture({ baseUrl, user, out, screens: ['BuddiesShell-add-prompt', 'BuddiesShell-search-nomatch'] });
