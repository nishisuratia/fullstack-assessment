/**
 * E2E tests — full application flow
 * Run: npm run test:e2e (starts server automatically)
 */
import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('loads with products and correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/StackShop/);
    await expect(page.getByRole('heading', { name: /StackShop/ })).toBeVisible();
    // Wait for products to load (loading shell first)
    await expect(page.getByText(/Showing \d+–\d+ of \d+ products/)).toBeVisible({ timeout: 10000 });
  });

  test('shows product prices', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Showing \d+–\d+ of \d+ products/)).toBeVisible({ timeout: 10000 });
    // At least one price in $X.XX format
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible({ timeout: 5000 });
  });

  test('search for Presto does not crash (image hostname fix)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Showing \d+–\d+ of \d+ products/)).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder('Search products...').fill('Presto');
    await page.waitForTimeout(400); // debounce
    await expect(page.getByText(/Presto/)).toBeVisible({ timeout: 5000 });
    // Page should still be on StackShop (no crash)
    await expect(page).toHaveTitle(/StackShop/);
  });

  test('category filter dropdown opens with options', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Showing \d+–\d+ of \d+ products/)).toBeVisible({ timeout: 10000 });
    await page.getByRole('combobox').first().click();
    await expect(page.getByRole('option').first()).toBeVisible({ timeout: 5000 });
  });

  test('pagination works', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Showing 1–20 of 500 products/)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Next' }).first().click();
    await expect(page.getByText(/Showing 21–40 of 500 products/)).toBeVisible({ timeout: 5000 });
  });

  test('product link goes to SKU-based URL', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Showing \d+–\d+ of \d+ products/)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page).toHaveURL(/\/product\/[A-Z0-9]+/);
    expect(page.url()).not.toMatch(/product=%7B/); // No JSON in URL
  });
});

test.describe('Product detail page', () => {
  test('loads product with price and Add to Cart', async ({ page }) => {
    await page.goto('/product/E8ZVY2BP3');
    await expect(page.getByText(/\$149\.99/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Add to Cart' })).toBeVisible();
  });

  test('Back to Products link works', async ({ page }) => {
    await page.goto('/product/E8ZVY2BP3');
    await page.getByRole('link', { name: 'Back to Products' }).click();
    await expect(page).toHaveURL('/');
  });
});
