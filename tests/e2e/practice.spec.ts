import { test, expect } from '@playwright/test'

test.describe('practice', () => {
  test('unauthenticated user visiting /practice is redirected to login', async ({ page }) => {
    await page.goto('/practice')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('practice route is not a public route', async ({ page }) => {
    await page.goto('/practice?listId=00000000-0000-0000-0000-000000000000')
    await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible()
  })
})
