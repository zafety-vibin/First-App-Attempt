/**
 * E2E Test: Planning Workflow
 * Task: T073
 * References:
 * - specs/005-create-the-ai/plan.md
 * - specs/005-create-the-ai/research.md
 *
 * Test the complete planning workflow with immediate graph updates
 */

import { test, expect } from '@playwright/test';

test.describe('Planning AI Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to a campaign
    await page.goto('http://localhost:3000');

    // Mock authentication
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
      }));
    });

    // Navigate to campaign page
    await page.goto('http://localhost:3000/campaigns/test-campaign-123');
    await page.waitForLoadState('networkidle');
  });

  test('complete planning workflow with immediate graph updates', async ({ page }) => {
    // Step 1: Open Planning AI tab
    await page.click('button:has-text("Planning AI")');
    await expect(page.locator('[data-testid="planning-tab"]')).toBeVisible();

    // Step 2: Verify knowledge graphs are loaded
    await expect(page.locator('text=Knowledge Graphs')).toBeVisible();
    await expect(page.locator('text=Geographical')).toBeVisible();
    await expect(page.locator('text=Political Web')).toBeVisible();
    await expect(page.locator('text=World Foundations')).toBeVisible();
    await expect(page.locator('text=Campaign Story')).toBeVisible();

    // Step 3: Start planning session
    await page.click('button:has-text("Start Planning Session")');
    await expect(page.locator('text=Planning session created')).toBeVisible();

    // Step 4: Send a message that triggers graph update
    const chatInput = page.locator('input[placeholder*="Ask about your campaign plans"]');
    await chatInput.fill('Add a new city called Riverdale to the north of the capital');
    await page.keyboard.press('Enter');

    // Wait for streaming response
    await expect(page.locator('[data-testid="streaming-indicator"]')).toBeVisible();

    // Step 5: Verify immediate graph update notification
    await expect(page.locator('text=Graph updated: Geographical')).toBeVisible({ timeout: 10000 });

    // Step 6: Check that node count increased
    const geoNodeCount = page.locator('[data-testid="geo-node-count"]');
    const initialCount = await geoNodeCount.textContent();
    await expect(geoNodeCount).not.toHaveText(initialCount!);

    // Step 7: View the updated graph
    await page.click('[data-testid="view-geo-graph"]');
    await expect(page.locator('[data-testid="graph-viewer"]')).toBeVisible();
    await expect(page.locator('text=Riverdale')).toBeVisible();
  });

  test('graph toggle functionality', async ({ page }) => {
    await page.click('button:has-text("Planning AI")');
    await expect(page.locator('[data-testid="planning-tab"]')).toBeVisible();

    // Check initial toggle states
    const geoToggle = page.locator('[data-testid="toggle-geographical"]');
    await expect(geoToggle).toHaveAttribute('aria-checked', 'true');

    // Toggle off
    await geoToggle.click();
    await expect(geoToggle).toHaveAttribute('aria-checked', 'false');

    // Start session and send message
    await page.click('button:has-text("Start Planning Session")');
    const chatInput = page.locator('input[placeholder*="Ask about your campaign plans"]');
    await chatInput.fill('Tell me about the geography');
    await page.keyboard.press('Enter');

    // Response should indicate graph is disabled
    await expect(page.locator('text=Geographical graph is currently disabled')).toBeVisible({ timeout: 10000 });

    // Toggle back on
    await geoToggle.click();
    await expect(geoToggle).toHaveAttribute('aria-checked', 'true');

    // Now it should work
    await chatInput.fill('Tell me about the geography again');
    await page.keyboard.press('Enter');
    await expect(page.locator('text=Geographical graph is currently disabled')).not.toBeVisible();
  });

  test('active filtering for political-web and campaign-story', async ({ page }) => {
    await page.click('button:has-text("Planning AI")');

    // Active filter should be available for political-web
    const activeFilterCheckbox = page.locator('[data-testid="active-filter-political"]');
    await expect(activeFilterCheckbox).toBeVisible();

    // Toggle active filter on
    await activeFilterCheckbox.check();

    // Start session
    await page.click('button:has-text("Start Planning Session")');

    // Send message about politics
    const chatInput = page.locator('input[placeholder*="Ask about your campaign plans"]');
    await chatInput.fill('What are the active political factions?');
    await page.keyboard.press('Enter');

    // Response should mention filtering
    await expect(page.locator('text=active')).toBeVisible({ timeout: 10000 });
  });

  test('graph node exploration and editing', async ({ page }) => {
    await page.click('button:has-text("Planning AI")');

    // Expand geographical graph nodes
    await page.click('[data-testid="expand-geo-nodes"]');
    await expect(page.locator('[data-testid="geo-nodes-list"]')).toBeVisible();

    // Click on a node
    await page.click('text=Capital City');

    // Node editor should open
    await expect(page.locator('[data-testid="node-editor"]')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toHaveValue('Capital City');

    // Edit the node
    const populationInput = page.locator('input[name="population"]');
    await populationInput.clear();
    await populationInput.fill('150000');

    // Save changes
    await page.click('button:has-text("Save Node")');
    await expect(page.locator('text=Node updated successfully')).toBeVisible();
  });

  test('keyboard shortcuts', async ({ page }) => {
    // Test Ctrl+P to open Planning AI
    await page.keyboard.press('Control+p');
    await expect(page.locator('[data-testid="planning-tab"]')).toBeVisible();

    // Test ESC to close
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="planning-tab"]')).not.toBeVisible();
  });

  test('session persistence across tab switches', async ({ page }) => {
    // Start planning session
    await page.click('button:has-text("Planning AI")');
    await page.click('button:has-text("Start Planning Session")');

    // Add some messages
    const chatInput = page.locator('input[placeholder*="Ask about your campaign plans"]');
    await chatInput.fill('What should happen in the next session?');
    await page.keyboard.press('Enter');

    await expect(page.locator('text=What should happen in the next session?')).toBeVisible();

    // Switch to Import AI
    await page.click('[data-testid="tab-import"]');
    await expect(page.locator('[data-testid="import-tab"]')).toBeVisible();

    // Switch back to Planning AI
    await page.click('[data-testid="tab-planning"]');

    // Messages should still be there
    await expect(page.locator('text=What should happen in the next session?')).toBeVisible();
  });

  test('real-time graph statistics update', async ({ page }) => {
    await page.click('button:has-text("Planning AI")');
    await page.click('button:has-text("Start Planning Session")');

    // Get initial node counts
    const geoNodes = page.locator('[data-testid="geo-node-count"]');
    const initialNodeCount = await geoNodes.textContent();

    // Add multiple nodes in one message
    const chatInput = page.locator('input[placeholder*="Ask about your campaign plans"]');
    await chatInput.fill('Add three new locations: Westport, Eastdale, and Northern Keep');
    await page.keyboard.press('Enter');

    // Wait for updates
    await expect(page.locator('text=Graph updated: Geographical')).toBeVisible({ timeout: 10000 });

    // Node count should increase by 3
    await expect(geoNodes).not.toHaveText(initialNodeCount!);
    const newCount = await geoNodes.textContent();
    expect(parseInt(newCount!)).toBeGreaterThan(parseInt(initialNodeCount!));
  });

  test('cross-graph relationships', async ({ page }) => {
    await page.click('button:has-text("Planning AI")');
    await page.click('button:has-text("Start Planning Session")');

    // Create a relationship between geographical and political entities
    const chatInput = page.locator('input[placeholder*="Ask about your campaign plans"]');
    await chatInput.fill('The Merchants Guild controls the port city of Westport');
    await page.keyboard.press('Enter');

    // Should update both graphs
    await expect(page.locator('text=Graph updated: Geographical')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Graph updated: Political Web')).toBeVisible({ timeout: 10000 });

    // View political web graph
    await page.click('[data-testid="view-political-graph"]');
    await expect(page.locator('text=Westport')).toBeVisible();
    await expect(page.locator('text=controls')).toBeVisible();
  });

  test('error recovery during graph updates', async ({ page }) => {
    await page.click('button:has-text("Planning AI")');
    await page.click('button:has-text("Start Planning Session")');

    // Simulate network interruption
    await page.context().setOffline(true);

    const chatInput = page.locator('input[placeholder*="Ask about your campaign plans"]');
    await chatInput.fill('Add a new character');
    await page.keyboard.press('Enter');

    // Should show error
    await expect(page.locator('text=Failed to send message')).toBeVisible();

    // Go back online
    await page.context().setOffline(false);

    // Retry should work
    await chatInput.fill('Add a new character named Elena');
    await page.keyboard.press('Enter');

    await expect(page.locator('text=Graph updated')).toBeVisible({ timeout: 10000 });
  });

  test('timeline consistency validation', async ({ page }) => {
    await page.click('button:has-text("Planning AI")');
    await page.click('button:has-text("Start Planning Session")');

    // Try to add an event that conflicts with existing timeline
    const chatInput = page.locator('input[placeholder*="Ask about your campaign plans"]');
    await chatInput.fill('The Great War ended in year 1100'); // Assuming it conflicts with existing data
    await page.keyboard.press('Enter');

    // Should show timeline validation warning
    await expect(page.locator('text=Timeline conflict detected')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=existing session recap')).toBeVisible();
  });
});