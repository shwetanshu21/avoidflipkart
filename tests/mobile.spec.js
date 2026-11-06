import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createState, getCurrentCase, resolveChoice, advanceCase, getHRQuestion, answerHRQuestion } from '../game/engine.js';

const seed = 4242;
const gameURL = `/game/?mode=express&seed=${seed}`;

async function activate(locator) {
  if (test.info().project.use.hasTouch) await locator.tap();
  else await locator.click();
}

async function noHorizontalOverflow(page) {
  await expect.poll(() => page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await expect.poll(() => page.evaluate(() => document.documentElement.clientWidth)).toBe(page.viewportSize().width);
}

async function fitsViewport(page, locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height + 1);
}

async function touchTarget(locator) {
  if (!test.info().project.use.hasTouch) return;
  const box = await locator.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
}

async function screenshot(page, info, name) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, scale: 'css' });
  await info.attach(name, { path, contentType: 'image/png' });
}

async function ready(page, url) {
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
}

async function startExpress(page) {
  await ready(page, gameURL);
  await activate(page.locator('[data-action="start-express"]').first());
  await expect(page.locator('#case-title')).toBeVisible();
}

async function continueCase(page) {
  await activate(page.locator('[data-action="next"]'));
  const celebration = page.locator('#game-dialog[open] [data-action="continue-celebrations"]');
  if (await celebration.isVisible()) await activate(celebration);
}

test.beforeEach(async ({ page }) => {
  page.__runtimeErrors = [];
  page.on('pageerror', error => page.__runtimeErrors.push(error.message));
});

test.afterEach(async ({ page }) => {
  expect(page.__runtimeErrors, 'No uncaught browser errors').toEqual([]);
});

test('casebook fits the viewport and its navigation, filters and phrasebook work by touch', async ({ page }, info) => {
  await ready(page, '/');
  await expect(page.locator('#hero-heading')).toBeVisible();
  await noHorizontalOverflow(page);
  await screenshot(page, info, 'casebook-hero');

  const menu = page.locator('.mobile-nav');
  if (await menu.isVisible()) {
    await activate(menu.locator('summary'));
    await fitsViewport(page, menu.locator('nav'));
    await activate(menu.getByRole('link', { name: 'The receipts', exact: true }));
    await expect(menu).not.toHaveAttribute('open', '');
    await expect(page).toHaveURL(/#about$/);
  }

  for (const [filter, count] of [['waiting', 2], ['delivered', 3], ['all', 5]]) {
    const button = page.locator(`[data-filter="${filter}"]`);
    await touchTarget(button);
    await activate(button);
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('tr[data-status]:visible')).toHaveCount(count);
    await expect(page.locator('#filter-status')).toContainText(String(count));
    await noHorizontalOverflow(page);
  }
  await screenshot(page, info, 'arrival-board');

  const phrases = page.locator('.phrase-list details');
  await activate(phrases.nth(1).locator('summary'));
  await expect(phrases.nth(1)).toHaveAttribute('open', '');
  await expect(phrases.nth(1).locator('.translation')).toContainText('Your parcel was not on the itinerary.');
  await activate(page.locator('#next-translation'));
  await expect(phrases.nth(2)).toHaveAttribute('open', '');
  await noHorizontalOverflow(page);
  await page.locator('#verdict').evaluate(element => element.scrollIntoView({ block: 'start' }));
  const currentChapter = page.locator('.chapter-nav a[href="#verdict"]');
  await expect(currentChapter).toHaveAttribute('aria-current', 'location');
  await expect.poll(async () => {
    const link = await currentChapter.boundingBox();
    const strip = await page.locator('.chapter-nav').boundingBox();
    return link.x >= strip.x - 1 && link.x + link.width <= strip.x + strip.width + 1;
  }).toBe(true);
});

test('manual sharing remains readable and dismissible when copying is denied', async ({ page }, info) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: () => Promise.reject(new DOMException('Clipboard unavailable in test', 'NotAllowedError')) },
  }));
  await ready(page, '/');
  await activate(page.locator('[data-share-target]').first());
  const dialog = page.locator('#share-fallback');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('textarea')).toHaveValue(/https:\/\/avoidflipkart\.com\/#resolved-case/);
  await fitsViewport(page, dialog);
  await touchTarget(dialog.getByRole('button', { name: 'Close copy dialog' }));
  await screenshot(page, info, 'copy-dialog');
  await activate(dialog.getByRole('button', { name: 'Done', exact: true }));
  await expect(dialog).not.toBeVisible();
  await noHorizontalOverflow(page);
});

test('game controls, history, achievements, pause and separate career saves stay usable', async ({ page }, info) => {
  await ready(page, gameURL);
  await expect(page.getByRole('button', { name: /Play Express/ })).toBeVisible();
  await noHorizontalOverflow(page);
  await screenshot(page, info, 'game-welcome');
  await activate(page.locator('[data-action="start-express"]').first());
  await expect(page.locator('#case-title')).toBeVisible();
  await noHorizontalOverflow(page);
  await screenshot(page, info, 'game-desk');

  for (const action of ['history', 'ledger', 'career', 'handbook']) {
    const button = action === 'history' || action === 'ledger'
      ? page.locator(`.mail-folders [data-action="${action}"]`)
      : page.locator(`[aria-label="Game navigation"] [data-action="${action}"]`);
    await expect(button).toBeVisible();
    await touchTarget(button);
    await activate(button);
    const dialog = page.locator('#game-dialog');
    await expect(dialog).toBeVisible();
    await fitsViewport(page, dialog);
    await touchTarget(dialog.getByRole('button', { name: 'Close dialog', exact: true }));
    await activate(dialog.getByRole('button', { name: 'Close dialog', exact: true }));
    await expect(dialog).not.toBeVisible();
  }

  await activate(page.locator('#pause-button'));
  await expect(page.locator('.pause-overlay')).toBeVisible();
  await expect(page.locator('.pause-overlay [data-action="pause"]')).toBeInViewport({ ratio: 1 });
  await screenshot(page, info, 'pause-panel');
  await activate(page.locator('.pause-overlay [data-action="pause"]'));
  await expect(page.locator('.pause-overlay')).toHaveCount(0);
  await expect(page.locator('#case-title')).toBeFocused();

  await page.locator('.choices .choice').last().scrollIntoViewIfNeeded();
  await activate(page.locator('#pause-button'));
  await expect(page.locator('.pause-overlay [data-action="pause"]')).toBeInViewport({ ratio: 1 });
  await activate(page.locator('.pause-overlay [data-action="pause"]'));

  const initial = createState(seed, 'express');
  const choice = getCurrentCase(initial).choices.find(item => item.kind === 'risk');
  await activate(page.locator(`[data-choice="${choice.id}"]`));
  await expect(page.locator('#result-panel')).toBeVisible();
  await expect(page.locator('.sent-message')).toHaveText(choice.text);
  await activate(page.locator('.mail-folders [data-action="history"]'));
  await expect(page.locator('.ledger-list li')).toHaveCount(1);
  await activate(page.getByRole('button', { name: 'Close dialog', exact: true }));
  const saved = await page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('closed-career-v2:express')).game));
  if (info.project.use.hasTouch) {
    const portrait = page.viewportSize();
    await page.setViewportSize({ width: portrait.height, height: portrait.width });
    await noHorizontalOverflow(page);
    await expect(page.locator('.sent-message')).toHaveText(choice.text);
    await page.setViewportSize(portrait);
    await noHorizontalOverflow(page);
  }

  await page.reload();
  await activate(page.getByRole('button', { name: 'Resume Express', exact: false }));
  await expect(page.locator('.sent-message')).toHaveText(choice.text);
  expect(await page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('closed-career-v2:express')).game))).toEqual(saved);
  await continueCase(page);
  await expect(page.locator('#case-title')).toBeVisible();
  await noHorizontalOverflow(page);

  await activate(page.locator('.desk-home'));
  await activate(page.locator('[data-action="start-full"]'));
  await expect(page.locator('#case-title')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('closed-career-v2:full')).game).mode)).toBe('full');
  expect(await page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('closed-career-v2:express')).game).handled)).toBe(1);
});

test('all fourteen Express cases and promotion dialogs can be completed by touch', async ({ page }, info) => {
  test.setTimeout(90_000);
  await startExpress(page);
  let state = createState(seed, 'express');
  for (let index = 0; index < 14; index++) {
    const choice = getCurrentCase(state).choices.find(item => item.kind === 'risk');
    await activate(page.locator(`[data-choice="${choice.id}"]`));
    await expect(page.locator('#result-panel')).toBeVisible();
    state = resolveChoice(state, choice.id, 1000);
    await continueCase(page);
    state = advanceCase(state);
    await noHorizontalOverflow(page);
  }
  await expect(page.locator('#terminal-title')).toContainText('CEO.');
  await expect(page.locator('.terminal-stamp')).toHaveText('EXPRESS CAREER COMPLETE');
  await screenshot(page, info, 'express-complete');
  await activate(page.locator('.terminal-actions [data-action="new-run"]'));
  await expect(page.locator('#case-title')).toBeVisible();
});

test('game challenge copying and result-image download work on touch screens', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: () => Promise.reject(new DOMException('Clipboard unavailable in test', 'NotAllowedError')) },
  }));
  await startExpress(page);
  await activate(page.locator('.game-bottom [data-action="share"]'));
  await fitsViewport(page, page.locator('#game-dialog'));
  await activate(page.locator('[data-action="copy-share"]'));
  await expect(page.locator('#share-copy')).toHaveValue(/https:\/\/avoidflipkart\.com\/game\/\?mode=express&seed=4242/);
  await fitsViewport(page, page.locator('#game-dialog'));
  await activate(page.getByRole('button', { name: 'Done', exact: true }));
  await activate(page.locator('.game-bottom [data-action="share"]'));
  const downloaded = page.waitForEvent('download');
  await activate(page.locator('[data-action="download-card"]'));
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('closed-career-report.png');
  const bytes = await readFile(await download.path());
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.readUInt32BE(16)).toBe(1200);
  expect(bytes.readUInt32BE(20)).toBe(630);
});

test('HR questions scroll into view and firing remains playable on a short screen', async ({ page }, info) => {
  await startExpress(page);
  let state = createState(seed, 'express');
  for (let index = 0; index < 7 && state.phase !== 'review'; index++) {
    const choice = getCurrentCase(state).choices.find(item => item.kind === 'help');
    await activate(page.locator(`[data-choice="${choice.id}"]`));
    state = resolveChoice(state, choice.id, 1000);
    await continueCase(page);
    state = advanceCase(state);
  }
  expect(state.phase).toBe('review');
  for (let index = 0; index < 3; index++) {
    const question = getHRQuestion(state);
    await expect(page.locator('#hr-question')).toHaveText(question.prompt);
    if (index > 0) {
      await expect(page.locator('#hr-question')).toBeInViewport({ ratio: 1 });
      await expect.poll(() => page.evaluate(() => {
        const question = document.querySelector('#hr-question').getBoundingClientRect();
        const bar = document.querySelector('.topbar');
        const sticky = ['sticky', 'fixed'].includes(getComputedStyle(bar).position);
        return question.top >= (sticky ? bar.getBoundingClientRect().bottom : 0) - 1;
      })).toBe(true);
    }
    // One empathetic answer guarantees the firing branch. Using the bottom answer
    // thereafter exercises the next-question scroll from a genuinely lower tap.
    const choiceId = index === 0 ? 'hr-01-a' : question.choices.at(-1).id;
    await activate(page.locator(`[data-hr-choice="${choiceId}"]`));
    state = answerHRQuestion(state, choiceId);
    await noHorizontalOverflow(page);
  }
  await expect(page.locator('#terminal-title')).toContainText('Fired.');
  await expect(page.locator('.terminal-stamp')).toHaveText('GAME OVER');
  await expect(page.locator('#terminal-title')).toBeInViewport({ ratio: 0.5 });
  await screenshot(page, info, 'hr-game-over');
  await activate(page.locator('.terminal-actions [data-action="new-run"]'));
  await expect(page.locator('#case-title')).toBeVisible();
});

test.describe('readable without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('the complete casebook, links and native disclosures remain available', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#hero-heading')).toBeVisible();
    await expect(page.locator('tr[data-status]')).toHaveCount(5);
    await expect(page.locator('#casebook')).toContainText('Five orders.');
    await expect(page.locator('[data-filter]:visible')).toHaveCount(0);
    await activate(page.locator('.phrase-list details').nth(1).locator('summary'));
    await expect(page.locator('.phrase-list details').nth(1)).toHaveAttribute('open', '');
  });
});
