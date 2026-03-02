import { test, expect } from '@playwright/test';

// End-to-end keyboard flow for POS
// Requires local server running at http://localhost:3000 with a user already logged in.

test.describe('POS keyboard workflow', () => {
  test.beforeEach(async ({ page }) => {
    // navigate to login and simulate authentication by setting token
    await page.goto('/login');
    // stub login: set token in localStorage if not logged in
    await page.evaluate(() => {
      localStorage.setItem('token', 'test-token');
    });
    await page.goto('/pos');
    await expect(page).toHaveURL('/pos');
  });

  test('add item, adjust qty, quick pay and finalize', async ({ page }) => {
    const search = page.locator('input[placeholder="Search product..."]');

    // test focus shortcut (f)
    await page.keyboard.press('f');
    await expect(search).toBeFocused();

    // type query and wait for results
    await page.keyboard.type('Sample');
    await page.waitForTimeout(500);
    // press enter to select first item
    await page.keyboard.press('Enter');

    // verify cart has one row
    const cartRows = page.locator('table tbody tr');
    await expect(cartRows).toHaveCount(1);

    // increase quantity then hit enter to blur
    await cartRows.locator('input[type=number]').fill('2');
    await page.keyboard.press('Enter');

    // quick payments using Ctrl+1..5
    await page.keyboard.press('Control+1');
    await expect(page.locator('div:has-text("Cash")')).toBeVisible();
    await page.keyboard.press('Control+2');
    await expect(page.locator('div:has-text("Card")')).toBeVisible();
    await page.keyboard.press('Control+3');
    await expect(page.locator('div:has-text("UPI")')).toBeVisible();
    await page.keyboard.press('Control+4');
    await expect(page.locator('div:has-text("Bank")')).toBeVisible();
    await page.keyboard.press('Control+5');
    await expect(page.locator('div:has-text("Advance")')).toBeVisible();

    // escape should clear invoice after confirmation
    page.on('dialog', (dialog) => {
      expect(dialog.type()).toBe('confirm');
      dialog.accept();
    });
    await page.keyboard.press('Escape');
    await expect(cartRows).toHaveCount(0);

    // re-add item to test finalize again
    await page.keyboard.press('f');
    await page.keyboard.type('Sample');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Control+1');

    // finalize via shortcut
    await page.keyboard.press('Control+P');
    await expect(page.locator('text=Download PDF')).toBeVisible();
  });

  test('escape does nothing when cart is empty', async ({ page }) => {
    // no items added yet; pressing escape should not open a dialog
    let sawDialog = false;
    page.on('dialog', () => {
      sawDialog = true;
    });
    await page.keyboard.press('Escape');
    expect(sawDialog).toBe(false);
  });
});
