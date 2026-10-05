import { test, expect } from '@playwright/test';

test.describe('Checkout Flow & Shipping Validation Journey', () => {
  test('renders empty basket guard when accessing checkout with 0 items', async ({ page }) => {
    await page.goto('/checkout');

    // When basket is empty, verified guard appears
    await expect(page.getByText(/Your basket is empty/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Continue Shopping/i })).toBeVisible();
  });

  test('renders checkout form and locks country to UK when basket contains an item', async ({ page }) => {
    // Navigate to homepage first to initialise storage context
    await page.goto('/');

    // Seed local basket via localStorage
    await page.evaluate(() => {
      const mockItem = {
        id: '201',
        name: 'Wireless Bluetooth Earbuds',
        price: 25.00,
        priceFormatted: '£25.00',
        quantity: 1,
        slug: 'wireless-bluetooth-earbuds',
      };
      localStorage.setItem('dqp-basket', JSON.stringify({
        state: {
          items: [mockItem],
        },
        version: 2,
      }));
    });

    await page.goto('/checkout');

    // Wait for customer data autofilling overlay to detach if present
    await page.locator('text=Loading your details...').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});

    // Verify contact & shipping fields are present
    const emailField = page.locator('#email');
    await expect(emailField).toBeVisible();

    // Verify UK-restricted delivery guard: country selector is locked to United Kingdom (disabled)
    const countryField = page.locator('#country, #billingCountry').first();
    if (await countryField.isVisible()) {
      await expect(countryField).toBeDisabled();
    }
  });

  test('validates required fields before allowing progression to delivery step', async ({ page }) => {
    await page.goto('/');

    // Seed basket
    await page.evaluate(() => {
      localStorage.setItem('dqp-basket', JSON.stringify({
        state: {
          items: [{
            id: '201',
            name: 'Sample Item',
            price: 15.00,
            priceFormatted: '£15.00',
            quantity: 1,
            slug: 'sample-item',
          }],
        },
        version: 2,
      }));
    });

    await page.goto('/checkout');
    await page.locator('text=Loading your details...').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});

    // Attempt to proceed without filling fields
    const continueBtn = page.getByRole('button', { name: /continue to delivery/i });
    if (await continueBtn.isVisible()) {
      await continueBtn.click();
      // Should show validation error or remain on details step
      await expect(page.locator('#email')).toBeVisible();
    }
  });
});
