import { test, expect } from '@playwright/test'

test.describe('lists', () => {
  test('unauthenticated user visiting /lists is redirected to login', async ({ page }) => {
    await page.goto('/lists')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('unauthenticated user visiting a list detail page is redirected to login', async ({ page }) => {
    await page.goto('/lists/00000000-0000-0000-0000-000000000000')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('lists route is not a public route', async ({ page }) => {
    await page.goto('/lists')
    await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible()
  })
})
