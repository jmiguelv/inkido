import { test, expect } from '@playwright/test'

test.describe('auth', () => {
  test('user can see the signup page', async ({ page }) => {
    await page.goto('/auth/signup')
    await expect(page.getByRole('heading', { name: /sign up/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible()
  })

  test('signup page has no password field', async ({ page }) => {
    await page.goto('/auth/signup')
    await expect(page.getByLabel(/password/i)).not.toBeVisible()
  })

  test('user can see the login page', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /magic link/i })).toBeVisible()
  })

  test('login page has no password field', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByLabel(/password/i)).not.toBeVisible()
  })

  test('user can see the confirm page', async ({ page }) => {
    await page.goto('/auth/confirm')
    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible()
  })

  test('login page links to signup', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible()
  })

  test('signup page links to login', async ({ page }) => {
    await page.goto('/auth/signup')
    await expect(page.getByRole('link', { name: /log in/i })).toBeVisible()
  })

  test('reset route redirects to login', async ({ page }) => {
    await page.goto('/auth/reset')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})
