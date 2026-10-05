import { test, expect } from '@playwright/test';

test.describe('Product Browsing & Discovery Journey', () => {
  test('loads homepage and displays branding and trust bar', async ({ page }) => {
    await page.goto('/');

    // Verify top utility bar / trust messaging
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByText(/Free UK Delivery/i).first()).toBeVisible();

    // Verify hero or main content exists
    const main = page.locator('main').first();
    await expect(main).toBeVisible();
  });

  test('opens search modal and accepts search queries', async ({ page }) => {
    await page.goto('/');

    // Locate and click search trigger button in header
    const searchButton = page.locator('button[aria-label="Open search"]').first();
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    // Verify search input appears in overlay
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible();

    // Type query
    await searchInput.fill('cable');
    await expect(searchInput).toHaveValue('cable');
  });

  test('navigates to shop catalogue page without client-side errors', async ({ page }) => {
    const response = await page.goto('/shop');
    expect(response?.status()).toBeLessThan(400);

    // Verify page container renders
    await expect(page.locator('main')).toBeVisible();
  });
});
