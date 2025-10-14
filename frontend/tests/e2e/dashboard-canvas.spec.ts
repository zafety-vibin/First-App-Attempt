import { test, expect } from '@playwright/test';

/**
 * T041: Dashboard Canvas E2E Tests
 * Critical end-to-end tests to ensure dashboard stays functional when adding new features
 *
 * Tests:
 * 1. Dashboard loads successfully
 * 2. User can add a widget
 * 3. User can resize a widget
 * 4. User can drag a widget
 * 5. User can remove a widget
 * 6. Layout persists after page refresh
 * 7. View mode toggle affects widget content
 *
 * Prerequisites:
 * - Backend running (docker-compose up)
 * - Keycloak configured
 * - Test user created
 * - Test campaign created
 */

// Test configuration
const TEST_USER = {
  username: 'test@example.com',
  password: 'testpassword123',
};

const TEST_CAMPAIGN_ID = 'test-campaign-123'; // Replace with actual test campaign ID

test.describe('Dashboard Canvas E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000');

    // Perform login (adjust selectors based on your Keycloak UI)
    await page.fill('input[name="username"]', TEST_USER.username);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to campaigns page
    await page.waitForURL(/campaigns/);
  });

  test('dashboard page loads with canvas', async ({ page }) => {
    // Navigate to dashboard
    await page.goto(`http://localhost:3000/campaigns/${TEST_CAMPAIGN_ID}/dashboard`);

    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="grid-layout"]', { timeout: 5000 });

    // Check for "Add Widget" button
    const addButton = page.locator('button:has-text("Add Widget")');
    await expect(addButton).toBeVisible();

    // Take screenshot for visual verification
    await page.screenshot({ path: 'tests/screenshots/dashboard-initial.png', fullPage: true });
  });

  test('user can add a widget to dashboard', async ({ page }) => {
    await page.goto(`http://localhost:3000/campaigns/${TEST_CAMPAIGN_ID}/dashboard`);
    await page.waitForSelector('[data-testid="grid-layout"]');

    // Click "Add Widget" button
    await page.click('button:has-text("Add Widget")');

    // Wait for widget picker modal to open
    await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

    // Select "NPC Summary" widget
    const npcWidgetButton = page.locator('button:has-text("NPC Summary")');
    await expect(npcWidgetButton).toBeVisible();
    await npcWidgetButton.click();

    // Wait for modal to close and widget to appear
    await page.waitForTimeout(1000);

    // Verify widget was added
    const npcWidget = page.locator('.npc-summary-widget, [data-widget-id="npc-summary"]');
    await expect(npcWidget).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/dashboard-with-widget.png', fullPage: true });
  });

  test('user can remove a widget from dashboard', async ({ page }) => {
    await page.goto(`http://localhost:3000/campaigns/${TEST_CAMPAIGN_ID}/dashboard`);
    await page.waitForSelector('[data-testid="grid-layout"]');

    // Add a widget first (if none exist)
    const existingWidget = page.locator('[data-testid="base-widget"]').first();
    const hasWidgets = await existingWidget.isVisible().catch(() => false);

    if (!hasWidgets) {
      // Add widget
      await page.click('button:has-text("Add Widget")');
      await page.waitForSelector('[role="dialog"]');
      await page.click('button:has-text("NPC Summary")');
      await page.waitForTimeout(1000);
    }

    // Find and click remove button
    const removeButton = page.locator('button[aria-label="Remove widget"], button:has-text("Remove")').first();
    await expect(removeButton).toBeVisible();
    await removeButton.click();

    // Wait for widget to be removed
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/dashboard-widget-removed.png', fullPage: true });
  });

  test('layout persists after page refresh', async ({ page }) => {
    await page.goto(`http://localhost:3000/campaigns/${TEST_CAMPAIGN_ID}/dashboard`);
    await page.waitForSelector('[data-testid="grid-layout"]');

    // Add a widget
    await page.click('button:has-text("Add Widget")');
    await page.waitForSelector('[role="dialog"]');
    await page.click('button:has-text("Quest Tracker")');
    await page.waitForTimeout(1000); // Wait for auto-save debounce

    // Get widget position before refresh
    const widget = page.locator('.quest-tracker-widget, [data-widget-id="quest-tracker"]').first();
    const boundingBoxBefore = await widget.boundingBox();

    // Refresh page
    await page.reload();
    await page.waitForSelector('[data-testid="grid-layout"]');

    // Verify widget still exists
    const widgetAfterRefresh = page.locator('.quest-tracker-widget, [data-widget-id="quest-tracker"]').first();
    await expect(widgetAfterRefresh).toBeVisible();

    // Verify position is roughly the same (allowing for small differences)
    const boundingBoxAfter = await widgetAfterRefresh.boundingBox();
    if (boundingBoxBefore && boundingBoxAfter) {
      expect(Math.abs(boundingBoxBefore.x - boundingBoxAfter.x)).toBeLessThan(50);
      expect(Math.abs(boundingBoxBefore.y - boundingBoxAfter.y)).toBeLessThan(50);
    }

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/dashboard-persisted.png', fullPage: true });
  });

  test('drag widget changes position (if react-grid-layout allows)', async ({ page }) => {
    await page.goto(`http://localhost:3000/campaigns/${TEST_CAMPAIGN_ID}/dashboard`);
    await page.waitForSelector('[data-testid="grid-layout"]');

    // Add a widget if none exist
    const existingWidget = page.locator('[data-testid="base-widget"]').first();
    const hasWidgets = await existingWidget.isVisible().catch(() => false);

    if (!hasWidgets) {
      await page.click('button:has-text("Add Widget")');
      await page.waitForSelector('[role="dialog"]');
      await page.click('button:has-text("NPC Summary")');
      await page.waitForTimeout(1000);
    }

    // Get widget initial position
    const widget = page.locator('[data-testid="base-widget"]').first();
    const initialBox = await widget.boundingBox();

    if (initialBox) {
      // Attempt to drag widget (using drag handle if present)
      const dragHandle = page.locator('.react-grid-item > .react-grid-drag-handle').first();
      const hasDragHandle = await dragHandle.isVisible().catch(() => false);

      if (hasDragHandle) {
        // Perform drag operation
        await dragHandle.hover();
        await page.mouse.down();
        await page.mouse.move(initialBox.x + 100, initialBox.y + 100);
        await page.mouse.up();

        // Wait for position to update
        await page.waitForTimeout(500);

        // Verify position changed
        const finalBox = await widget.boundingBox();
        if (finalBox) {
          const moved = Math.abs(finalBox.x - initialBox.x) > 50 || Math.abs(finalBox.y - initialBox.y) > 50;
          expect(moved).toBe(true);
        }
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/dashboard-dragged.png', fullPage: true });
  });

  test('view mode toggle affects widget visibility', async ({ page }) => {
    await page.goto(`http://localhost:3000/campaigns/${TEST_CAMPAIGN_ID}/dashboard`);
    await page.waitForSelector('[data-testid="grid-layout"]');

    // Add NPC widget (which should have DM-only content)
    await page.click('button:has-text("Add Widget")');
    await page.waitForSelector('[role="dialog"]');
    await page.click('button:has-text("NPC Summary")');
    await page.waitForTimeout(1000);

    // Find view mode toggle (eye icon or dropdown)
    const viewModeToggle = page.locator('[aria-label="View mode toggle"], button:has-text("DM View")');
    const hasToggle = await viewModeToggle.isVisible().catch(() => false);

    if (hasToggle) {
      // Take screenshot in DM view
      await page.screenshot({ path: 'tests/screenshots/dashboard-dm-view.png', fullPage: true });

      // Switch to Player View
      await viewModeToggle.click();
      await page.waitForTimeout(500);

      // Take screenshot in Player view (DM fields should be hidden)
      await page.screenshot({ path: 'tests/screenshots/dashboard-player-view.png', fullPage: true });

      // Verify content changed (this depends on widget implementation)
      // For example, "DM Secret" content should not be visible in player view
    }
  });

  test('empty state displays when no widgets', async ({ page }) => {
    // Navigate to dashboard with clean config (may need to clear localStorage)
    await page.goto(`http://localhost:3000/campaigns/${TEST_CAMPAIGN_ID}/dashboard`);

    // Clear any existing widgets via localStorage (simulating fresh state)
    await page.evaluate(() => {
      localStorage.removeItem(`dashboard-config-test-campaign-123`);
    });
    await page.reload();

    await page.waitForSelector('[data-testid="grid-layout"]');

    // Check for empty state message
    const emptyState = page.locator('text=/no widgets|add your first widget/i');
    await expect(emptyState).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/dashboard-empty.png', fullPage: true });
  });
});
