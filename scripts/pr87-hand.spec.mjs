import { test, expect, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { takeErrors, watchConsole } from './helpers/console.mjs';
import { register, skipTutorialToMainMenu, uniqueUsername, waitForClientBoot } from './helpers/session.mjs';

const OUT = process.env.HAND_OUT;
const results = [];
function check(item, ok, details) {
  results.push({ item, ok: !!ok, details });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${item} :: ${JSON.stringify(details)}`);
}

async function newUser(browser, baseURL, prefix) {
  const context = await browser.newContext({ ...devices['Desktop Chrome'], baseURL });
  const page = await context.newPage();
  const errors = watchConsole(page);
  await page.goto('/');
  await waitForClientBoot(page);
  const username = uniqueUsername(prefix);
  await register(page, username, 'e2e-duelyst-pw');
  await page.waitForFunction(() => window.ChatManager.getInstance().isReady === true, null, { timeout: 60_000 });
  const userId = await page.evaluate(() => window.ProfileManager.getInstance().get('id'));
  return { context, page, errors, username, userId };
}

test('pr87 hand check', async ({ page, browser }, testInfo) => {
  test.setTimeout(900_000);
  const baseURL = testInfo.project.use.baseURL;
  fs.mkdirSync(OUT, { recursive: true });
  const shot = (name) => page.screenshot({ path: path.join(OUT, name + '.png') });
  const errors = watchConsole(page);
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  await page.goto('/');
  await waitForClientBoot(page);
  const aName = uniqueUsername('handa');
  await register(page, aName, 'e2e-duelyst-pw');
  await skipTutorialToMainMenu(page);
  await page.waitForFunction(() => window.ChatManager.getInstance().isReady === true, null, { timeout: 60_000 });
  const aId = await page.evaluate(() => window.ProfileManager.getInstance().get('id'));

  const B = await newUser(browser, baseURL, 'handb');
  await B.page.waitForTimeout(2000);
  await page.evaluate((id) => window.ChatManager.getInstance().acceptBuddyInvite({ fromUserId: id }), B.userId);
  await page.waitForFunction((id) => window.ChatManager.getInstance().getBuddiesCollection().getPresenceCollection().some((p) => p.userId == id), B.userId, { timeout: 60_000 });
  await B.page.waitForFunction((id) => window.ChatManager.getInstance().getBuddiesCollection().getIsBuddyOnlineById(id), aId, { timeout: 60_000 });
  const C = await newUser(browser, baseURL, 'handc');
  await C.context.close();
  console.log('users', { aName, b: B.username, c: C.username });
  takeErrors(errors);

  const openList = () => page.evaluate(async () => {
    const nav = window.NavigationManager.getInstance();
    await nav.destroyModalView();
    nav.getUtilityView().toggleBuddyList();
  });
  const closeList = () => page.evaluate(() => window.NavigationManager.getInstance().destroyModalView());
  const el = 'duelyst-buddies';
  const bRow = page.locator(`${el} .buddy-list-items .buddy`).filter({ hasText: B.username });
  const sendFromB = (body) => B.page.evaluate(([id, body]) => window.ChatManager.getInstance().startConversation(id).sendMessage(body), [aId, body]);

  // 1. callout + referral
  await openList();
  await expect(page.locator(`${el} .buddy-controls`)).toBeVisible();
  await page.waitForTimeout(1500);
  const callout = page.locator(`${el} .buddy-selection-empty`);
  check('callout shows before any pick', await callout.isVisible(), { text: (await callout.innerText().catch(() => '')).slice(0, 120) });
  await shot('01-callout');
  await page.locator('#open_referral_program').click();
  await page.waitForTimeout(2000);
  const refVisible = await page.locator('.modal.prompt-modal #referral_code, .modal.prompt-modal').first().isVisible();
  const refText = await page.locator('.modal.prompt-modal').first().innerText().catch(() => '');
  check('Invite friends opens referral dialog', refVisible, { text: refText.slice(0, 160) });
  await shot('02-referral-dialog');
  await closeList();
  await page.waitForTimeout(1000);
  await openList();
  await expect(page.locator(`${el} .buddy-controls`)).toBeVisible();
  await page.waitForTimeout(1000);

  // 2. row content
  await expect(bRow).toBeVisible();
  const row = await bRow.evaluate((r) => ({
    cls: r.className,
    name: r.querySelector('.username-block')?.textContent.trim(),
    status: r.querySelector('.status-label')?.textContent.trim(),
    rank: r.querySelector('.rank')?.textContent.trim(),
    portrait: r.querySelector('img.portrait')?.getAttribute('src'),
    portraitLoaded: (r.querySelector('img.portrait')?.naturalWidth || 0) > 0,
  }));
  check('B row: name, status, rank, portrait', row.name === B.username && row.status && row.portraitLoaded, row);
  // B's presence carries rank 30 from a fresh account; drop it locally (no Firebase write), as for a buddy that never published a rank
  const savedRank = await page.evaluate((id) => { const m = window.ChatManager.getInstance().getBuddiesCollection().getPresenceCollection().find((p) => p.userId == id); const r = m.get('rank'); delete m.attributes.rank; m.trigger('change', m); return r; }, B.userId);
  await page.waitForTimeout(300);
  const unsetRank = await bRow.evaluate((r) => ({ rank: r.querySelector('.rank')?.textContent.trim(), cls: r.className }));
  check('rank unset renders "?"', unsetRank.rank === '?', { savedRank, ...unsetRank });
  await shot('03b-row-rank-unset');
  await page.evaluate(([id, r]) => { const m = window.ChatManager.getInstance().getBuddiesCollection().getPresenceCollection().find((p) => p.userId == id); m.attributes.rank = r; m.trigger('change', m); }, [B.userId, savedRank]);
  await shot('03-row');

  // 3. unread with no buddy selected
  await sendFromB('hello from B (unread test)');
  let unread = await bRow.evaluate((r) => new Promise((res) => {
    const t0 = Date.now();
    (function poll() { if (r.classList.contains('unread')) return res(true); if (Date.now() - t0 > 20000) return res(false); setTimeout(poll, 200); })();
  }));
  check('unread: B row gets .unread when not selected', unread, { cls: await bRow.getAttribute('class') });
  await shot('04-unread');

  // 4. select B
  await bRow.click();
  await expect(page.locator(`${el} duelyst-buddy-selection .buddy-profile`)).toBeVisible();
  await page.waitForTimeout(800);
  const sel = await page.evaluate(() => {
    const host = document.querySelector('duelyst-buddies');
    return {
      activeRows: [...host.querySelectorAll('.buddy.active .username-block')].map((n) => n.textContent.trim()),
      unreadRows: host.querySelectorAll('.buddy.unread').length,
      panelName: host.querySelector('duelyst-buddy-selection .username-block')?.textContent.trim(),
      calloutGone: !host.querySelector('.buddy-selection-empty'),
      controlsOpacity: [...host.querySelectorAll('.buddies-controls')].map((n) => getComputedStyle(n).opacity),
    };
  });
  check('click selects B (.active) and shows buddy panel', sel.activeRows.length === 1 && sel.activeRows[0] === B.username && sel.panelName === B.username && sel.calloutGone, sel);
  check('add-buddy controls dimmed after select', sel.controlsOpacity.every((o) => o === '0.5'), sel.controlsOpacity);
  check('selecting B clears .unread', sel.unreadRows === 0, sel);
  await shot('05-selected');

  // 5. search
  const search = page.locator(`${el} input[type='search']`);
  const part = B.username.toLowerCase().slice(2, 8);
  await search.click();
  await search.pressSequentially(part);
  await page.waitForTimeout(300);
  const names = () => page.locator(`${el} .buddy-list-items .buddy .username-block`).allTextContents();
  const n1 = await names();
  check('search: partial lowercased name filters to B', n1.length === 1 && n1[0] === B.username, { query: part, rows: n1 });
  await shot('06a-search-match');
  await search.fill('');
  await search.pressSequentially('zzqqnomatch');
  await page.waitForTimeout(300);
  const n2 = await names();
  check('search: non-matching query empties list', n2.length === 0, { rows: n2 });
  await shot('06b-search-nomatch');
  await search.fill('');
  await search.press('End');
  await page.waitForTimeout(300);
  const n3 = await names();
  check('search: clearing brings B back', n3.includes(B.username), { rows: n3 });
  await shot('06c-search-cleared');

  // 6. DND
  const dnd = page.locator(`${el} .do-not-disturb`);
  const dndState = async () => ({ cls: (await dnd.getAttribute('class')).includes('active'), profile: await page.evaluate(() => !!window.ProfileManager.getInstance().profile.get('doNotDisturb')) });
  const d0 = await dndState();
  await dnd.click(); await page.waitForTimeout(300);
  const d1 = await dndState();
  await shot('07a-dnd-on');
  await dnd.click(); await page.waitForTimeout(300);
  const d2 = await dndState();
  await shot('07b-dnd-off');
  check('DND toggles .active and profile doNotDisturb', !d0.cls && !d0.profile && d1.cls && d1.profile && !d2.cls && !d2.profile, { d0, d1, d2 });

  // 7. add buddy
  const prompt = page.locator(`${el} .add-buddy-prompt`);
  const input = page.locator(`${el} .add-buddy-input`);
  const submit = page.locator(`${el} .add-buddy-submit`);
  await page.locator(`${el} .add-buddy`).click();
  await page.waitForTimeout(300);
  const focused = await page.evaluate(() => document.activeElement?.classList.contains('add-buddy-input'));
  check('add-buddy prompt opens with input focused', (await prompt.isVisible()) && focused, { focused });
  await shot('08a-add-open');
  await input.pressSequentially('nosuchuserzz' + Date.now().toString(36).slice(-4));
  const tFail = Date.now();
  await input.press('Enter');
  await expect(submit).toHaveClass(/fail/, { timeout: 10_000 });
  const failInfo = { text: (await submit.textContent()).trim(), color: await submit.evaluate((n) => getComputedStyle(n).color), inputColor: await input.evaluate((n) => getComputedStyle(n).color), cls: await submit.getAttribute('class'), msAfterEnter: Date.now() - tFail };
  await shot('08b-add-not-found');
  const tShown = Date.now();
  await expect(prompt).toBeHidden({ timeout: 5_000 });
  const hiddenAfter = Date.now() - tShown;
  const resetText = (await submit.textContent()).replace(/\s+/g,' ').trim();
  check('nonexistent name: "User not found!" in red, then reset + fade', failInfo.text === 'User not found!' && /fail/.test(failInfo.cls) && !/fail/.test(await submit.getAttribute('class')), { ...failInfo, hiddenMsAfterResultSeen: hiddenAfter, resetText });
  await shot('08c-add-reset');
  await page.locator(`${el} .add-buddy`).click();
  await page.waitForTimeout(300);
  await input.fill('');
  await input.pressSequentially(C.username);
  await input.press('Enter');
  await expect(submit).toHaveClass(/done/, { timeout: 10_000 });
  const doneText = (await submit.textContent()).trim();
  await shot('08d-add-sent');
  await expect(prompt).toBeHidden({ timeout: 5_000 });
  const cleared = await input.inputValue();
  const invite = await page.evaluate(async ([cId, aId]) => {
    const { dbRef } = window; return null;
  }, [C.userId, aId]).catch(() => null);
  check('real account C: "Friend request sent!" and input clears', doneText === 'Friend request sent!' && cleared === '', { doneText, cleared });
  await shot('08e-add-after-sent');

  // 8. close + reopen keeps B selected
  await closeList(); await page.waitForTimeout(1000);
  await openList();
  await expect(page.locator(`${el} duelyst-buddy-selection .buddy-profile`)).toBeVisible({ timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(800);
  const re = await page.evaluate(() => ({
    active: [...document.querySelectorAll('duelyst-buddies .buddy.active .username-block')].map((n) => n.textContent.trim()),
    panel: document.querySelector('duelyst-buddies duelyst-buddy-selection .username-block')?.textContent.trim() ?? null,
  }));
  check('close + reopen: B selected again', re.active[0] === B.username && re.panel === B.username, re);
  await shot('09-reopen');

  // 9. message notification
  await closeList(); await page.waitForTimeout(1000);
  await sendFromB('hello from B (notification test)');
  const note = page.locator('#app-message-notifications li.message').last();
  await expect(note).toBeVisible({ timeout: 20_000 });
  await shot('10a-notification');
  await note.click();
  await expect(page.locator(`${el} duelyst-buddy-selection .buddy-profile`)).toBeVisible({ timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(800);
  const nt = await page.evaluate(() => ({
    open: !!document.querySelector('#app-buddies duelyst-buddies'),
    active: [...document.querySelectorAll('duelyst-buddies .buddy.active .username-block')].map((n) => n.textContent.trim()),
    panel: document.querySelector('duelyst-buddies duelyst-buddy-selection .username-block')?.textContent.trim() ?? null,
  }));
  check('notification click opens list with B selected', nt.open && nt.active[0] === B.username && nt.panel === B.username, nt);
  await shot('10b-notification-opened');

  // 10. remove through trash + confirm
  await page.locator(`${el} duelyst-buddy-selection .remove-buddy`).click();
  const dlg = page.locator('#app-confirm-dialog');
  await expect(dlg).toBeVisible({ timeout: 10_000 });
  const dlgTitle = (await dlg.locator('.modal-title').innerText()).trim();
  await shot('11a-remove-confirm');
  await dlg.locator('.confirm-dialog').click();
  await page.waitForTimeout(3000);
  const rm = await page.evaluate(() => ({
    hostChildren: document.querySelector('duelyst-buddies .buddy-selection-host')?.children.length ?? null,
    panel: !!document.querySelector('duelyst-buddies duelyst-buddy-selection .buddy-profile'),
    rows: [...document.querySelectorAll('duelyst-buddies .buddy-list-items .buddy .username-block')].map((n) => n.textContent.trim()),
    callout: !!document.querySelector('duelyst-buddies .buddy-selection-empty'),
  }));
  check('remove via trash + confirm empties the panel', !rm.panel && !rm.rows.includes(B.username), { dlgTitle, ...rm });
  await shot('11b-removed');

  const errs = takeErrors(errors);
  check('no console errors / page errors on A', errs.length === 0 && pageErrors.length === 0, { errs, pageErrors, bErrors: takeErrors(B.errors) });
  fs.writeFileSync(path.join(OUT, 'hand-check.json'), JSON.stringify({ users: { a: aName, b: B.username, c: C.username }, results }, null, 2));
  await B.context.close();
  expect(results.filter((r) => !r.ok)).toEqual([]);
});
