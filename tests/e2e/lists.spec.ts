import { test, expect } from '@playwright/test'

test.describe('spellings', () => {
  test('unauthenticated user visiting /spellings is redirected to login', async ({ page }) => {
    await page.goto('/spellings')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('unauthenticated user visiting a spelling detail page is redirected to login', async ({ page }) => {
    await page.goto('/spellings/00000000-0000-0000-0000-000000000000')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('spellings route is not a public route', async ({ page }) => {
    await page.goto('/spellings')
    await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible()
  })
})
