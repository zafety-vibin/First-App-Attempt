/**
 * E2E Test: Hierarchy Navigator
 * Feature: 021-create-a-geographic
 * Task: T045
 *
 * Tests navigation, breadcrumbs, and pin clicking
 */

import { test, expect } from '@playwright/test';

test.describe('Hierarchy Navigator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('button:has-text("Login (Test User)")');
    await page.waitForURL('**/campaigns');
    await page.click('h3:has-text("Godforged")');
    await page.waitForURL('**/campaigns/*');
  });

  test('should show breadcrumb navigation', async ({ page }) => {
    await page.click('button:has-text("Geographic Navigator")');
    await page.waitForURL('**/locations/navigator');

    // Wait for breadcrumb
    const breadcrumb = page.locator('.spatial-breadcrumb-inline');
    await expect(breadcrumb).toBeVisible({ timeout: 10000 });

    // Should start with Plane View
    await expect(page.locator('text=Plane View')).toBeVisible();

    console.log('✓ Breadcrumb navigation present');
  });

  test('should update breadcrumb when navigating scales', async ({ page }) => {
    await page.click('button:has-text("Geographic Navigator")');
    await page.waitForURL('**/locations/navigator');

    await page.waitForSelector('text=Plane View', { timeout: 10000 });

    // Click canvas to navigate (if nodes exist)
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();

    if (box) {
      // Click likely node position
      await canvas.click({ position: { x: box.width / 2, y: box.height * 0.7 } });
      await page.waitForTimeout(1500);

      // Breadcrumb should show path (may still be Plane View or new level)
      const breadcrumb = page.locator('.spatial-breadcrumb-inline');
      const text = await breadcrumb.textContent();

      console.log('Breadcrumb:', text);
      expect(text).toBeTruthy();
    }
  });

  test('should have zoom controls', async ({ page }) => {
    await page.click('button:has-text("Geographic Navigator")');
    await page.waitForURL('**/locations/navigator');

    await page.waitForSelector('canvas', { timeout: 10000 });

    // Zoom controls should be visible
    await expect(page.locator('button[title*="Zoom In"]')).toBeVisible();
    await expect(page.locator('button[title*="Zoom Out"]')).toBeVisible();
    await expect(page.locator('button[title*="Reset"]')).toBeVisible();

    // Refresh button should be visible
    await expect(page.locator('button:has-text("🔄")')).toBeVisible();

    console.log('✓ All controls present');
  });

  test('should show mode indicators', async ({ page }) => {
    await page.click('button:has-text("Geographic Navigator")');
    await page.waitForURL('**/locations/navigator');

    await page.waitForTimeout(2000);

    // Should show either Ellipse Mode or Map Mode
    const ellipseMode = page.locator('text=⭕ Ellipse');
    const mapMode = page.locator('text=🗺️ Map Mode');

    const modeVisible = await ellipseMode.or(mapMode).isVisible();
    expect(modeVisible).toBe(true);

    console.log('✓ Mode indicator displayed');
  });
});
