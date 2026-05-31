import { expect, test, type Page } from '@playwright/test';

test('모바일과 PC에서 한 화면으로 로드되고 초반 전투가 진행된다', async ({ page }) => {
  await page.goto('/?debug=1&timeScale=20&seed=21');
  await expect(page.getByTestId('game-frame')).toBeVisible();
  await expect(page.getByTestId('hud')).toContainText('침공 1차');

  const scroll = await page.evaluate(() => ({
    inner: window.innerHeight,
    body: document.body.scrollHeight,
    doc: document.documentElement.scrollHeight,
  }));
  expect(Math.max(scroll.body, scroll.doc)).toBeLessThanOrEqual(scroll.inner + 1);

  await expect.poll(() => readDebug(page).then((state) => state.enemies), { timeout: 5_000 }).toBeGreaterThan(0);
  await expect.poll(() => readDebug(page).then((state) => state.kills), { timeout: 6_000 }).toBeGreaterThan(0);
  await expect.poll(() => readDebug(page).then((state) => state.score), { timeout: 6_000 }).toBeGreaterThan(0);
});

test('선택 모달은 중앙에 뜨고 방치 시 자동 선택되며 전투가 느려진다', async ({ page }) => {
  await page.goto('/?debug=1&timeScale=3&choiceSoon=1&seed=31');
  const modal = page.getByTestId('choice-modal');
  await expect(modal).toBeVisible();

  const box = await modal.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (box && viewport) {
    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(18);
    expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(60);
  }

  const slowState = await readDebug(page);
  expect(slowState.choiceActive).toBe(true);
  expect(slowState.effectiveBattleScale).toBeLessThan(1);

  await expect.poll(() => readDebug(page).then((state) => state.choiceHistory), { timeout: 6_000 }).toBeGreaterThan(0);
  const picked = await readDebug(page);
  expect(picked.lastChoiceAuto).toBe(true);
});

test('2배속과 3배속 버튼 상태가 바뀐다', async ({ page }) => {
  await page.goto('/?debug=1&seed=41');
  await page.getByTestId('speed-2').click();
  await expect(page.getByTestId('speed-2')).toContainText('ON');
  await page.getByTestId('speed-3').click();
  await expect(page.getByTestId('speed-3')).toContainText('ON');
});

test('120초 이후에도 결과가 뜨지 않고 다음 침공으로 이어진다', async ({ page }) => {
  await page.goto('/?debug=1&timeScale=60&seed=51');
  await expect.poll(() => readDebug(page).then((state) => state.invasion), { timeout: 6_000 }).toBeGreaterThanOrEqual(2);
  const state = await readDebug(page);
  expect(state.result).toBe(false);
});

test('스킬은 충전 후 사용할 수 있고 사용 시 게이지가 초기화된다', async ({ page }) => {
  await page.goto('/?debug=1&skillCharge=100&seed=61');
  await expect(page.getByTestId('skill-gauge')).toContainText('100%');
  await page.getByTestId('skill-grasp').click();
  await expect.poll(() => readDebug(page).then((state) => state.skillCharge), { timeout: 4_000 }).toBeLessThan(25);
});

test('코어 HP 0에서 결과 화면이 뜨고 다시 도전으로 초기화된다', async ({ page }) => {
  await page.goto('/?debug=1&timeScale=80&coreHp=3&danger=40&seed=71');
  await expect(page.getByTestId('result-screen')).toBeVisible({ timeout: 8_000 });
  await expect(page.getByTestId('result-screen')).toContainText('마왕성 붕괴');
  await page.getByTestId('restart').click();
  await expect(page.getByTestId('result-screen')).toBeHidden({ timeout: 4_000 });
  const state = await readDebug(page);
  expect(state.coreHp).toBeGreaterThan(0);
});

async function readDebug(page: Page) {
  const text = await page.getByTestId('debug-state').textContent();
  if (!text) throw new Error('debug state missing');
  return JSON.parse(text) as {
    elapsed: number;
    invasion: number;
    phaseIndex: number;
    score: number;
    kills: number;
    enemies: number;
    choiceActive: boolean;
    choiceHistory: number;
    lastChoiceAuto: boolean;
    effectiveBattleScale: number;
    skillCharge: number;
    coreHp: number;
    result: boolean;
  };
}
