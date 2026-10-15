import { chromium } from 'playwright'
import { strict as assert } from 'node:assert'
import { mkdir } from 'node:fs/promises'

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173'
const browser = await chromium.launch({ headless: true })
const failures = []
const mark = async (name, check) => {
  try {
    await check()
    console.log('PASS', name)
  } catch (error) {
    failures.push({ name, error: String(error) })
    console.error('FAIL', name, error)
  }
}
try {
  await mkdir('screenshots', { recursive: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  await page.goto(base, { waitUntil: 'networkidle' })
  await mark('mobile landing and no horizontal page overflow', async () => {
    assert.match(await page.locator('h1').innerText(), /Un entrenamiento/)
    assert.equal(await page.locator('[data-action="select-day"]').count(), 3)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
    await page.screenshot({ path: 'screenshots/mobile-home.png', fullPage: true })
  })
  await mark('start session and autosave a completed set', async () => {
    await page.locator('[data-action="start"]').click()
    assert.match(await page.locator('.workout-head h2').innerText(), /Pecho/)
    assert.match(await page.locator('.exercise-card').first().innerText(), /Press de banca/)
    await page.locator('.exercise-card').first().locator('[data-field="kg"]').first().fill('72.5')
    await page.locator('.exercise-card').first().locator('[data-field="reps"]').first().fill('8')
    await page.locator('.exercise-card').first().locator('[data-field="done"]').first().check()
    await page.reload({ waitUntil: 'networkidle' })
    assert.equal(await page.locator('.exercise-card').first().locator('[data-field="kg"]').first().inputValue(), '72.5')
    assert.equal(await page.locator('.exercise-card').first().locator('[data-field="reps"]').first().inputValue(), '8')
    assert.equal(await page.locator('.exercise-card').first().locator('[data-field="done"]').first().isChecked(), true)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
    await page.screenshot({ path: 'screenshots/mobile-active.png', fullPage: true })
  })
  await mark('finish, history, and same-day previous values', async () => {
    await page.locator('[data-action="finish"]').click()
    assert.match(await page.locator('h1').innerText(), /esfuerzo/)
    assert.match(await page.locator('.history-card').first().innerText(), /72,5 kg/)
    await page.locator('[data-tab="today"]').click()
    await page.locator('[data-action="start"]').click()
    assert.equal(await page.locator('.exercise-card').first().locator('[data-field="kg"]').first().inputValue(), '72.5')
    assert.equal(await page.locator('.exercise-card').first().locator('[data-field="reps"]').first().inputValue(), '8')
    assert.equal(await page.locator('.exercise-card').first().locator('[data-field="done"]').first().isChecked(), false)
    assert.match(await page.locator('.exercise-card').first().locator('.prev-weight').first().innerText(), /72,5/)
  })
  await mark('different day does not inherit other day exercises', async () => {
    page.once('dialog', dialog => dialog.accept())
    await page.locator('[data-action="discard"]').click()
    await page.locator('[data-action="select-day"]').nth(1).click()
    await page.locator('[data-action="start"]').click()
    assert.match(await page.locator('.workout-head h2').innerText(), /Espalda/)
    assert.match(await page.locator('.exercise-card').first().innerText(), /Dominadas/)
    assert.equal(await page.locator('.exercise-card').first().locator('.prev-weight').first().innerText(), '—')
  })
  await mark('editable training days and exercises', async () => {
    page.once('dialog', dialog => dialog.accept())
    await page.locator('[data-action="discard"]').click()
    await page.locator('[data-tab="plan"]').click()
    await page.locator('[data-action="toggle-day"]').click()
    await page.locator('form[data-form="add-day"] input[name="name"]').fill('Hombros')
    await page.locator('form[data-form="add-day"] button[type="submit"]').click()
    assert.match(await page.locator('.plan-card').last().innerText(), /Hombros/)
    await page.locator('.plan-card').last().locator('[data-action="add-plan-exercise"]').click()
    await page.locator('form[data-form="add-exercise"] input[name="name"]').fill('Press militar')
    await page.locator('form[data-form="add-exercise"] button[type="submit"]').click()
    assert.match(await page.locator('.plan-card').last().innerText(), /Press militar/)
    await page.screenshot({ path: 'screenshots/mobile-plan.png', fullPage: true })
  })
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await desktop.goto(base, { waitUntil: 'networkidle' })
  await mark('desktop no horizontal overflow', async () => {
    assert.ok(await desktop.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
    await desktop.screenshot({ path: 'screenshots/desktop-home.png', fullPage: true })
  })
} finally {
  await browser.close()
}
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2))
  process.exitCode = 1
} else {
  console.log('Browser E2E: 6/6 passed')
}
