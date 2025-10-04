/**
 * E2E Test: Knowledge Graphs
 * Task: T074
 * References:
 * - specs/005-create-the-ai/plan.md
 * - specs/005-create-the-ai/research.md
 *
 * Test knowledge graph management, visualization, and filtering
 */

import { test, expect } from '@playwright/test';

test.describe('Knowledge Graph Management', () => {
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

  test('view and navigate all four knowledge graph types', async ({ page }) => {
    // Open Planning AI to access graphs
    await page.click('button:has-text("Planning AI")');
    await expect(page.locator('[data-testid="planning-tab"]')).toBeVisible();

    // Verify all four graph types are present
    const graphTypes = ['Geographical', 'Political Web', 'World Foundations', 'Campaign Story'];

    for (const graphType of graphTypes) {
      await expect(page.locator(`text=${graphType}`)).toBeVisible();
    }

    // Test viewing each graph
    for (const graphType of graphTypes) {
      const viewButton = page.locator(`[data-testid="view-${graphType.toLowerCase().replace(' ', '-')}-graph"]`);
      await viewButton.click();

      // Graph viewer should open
      await expect(page.locator('[data-testid="graph-viewer"]')).toBeVisible();
      await expect(page.locator(`h3:has-text("${graphType}")`)).toBeVisible();

      // Close viewer
      await page.keyboard.press('Escape');
    }
  });

  test('manual node CRUD operations', async ({ page }) => {
    await page.click('button:has-text("Planning AI")');

    // View Geographical graph
    await page.click('[data-testid="view-geographical-graph"]');

    // Add a new node
    await page.click('button:has-text("Add Node")');

    // Fill in node details
    await page.fill('input[name="node-name"]', 'Mountain Pass');
    await page.selectOption('select[name="node-type"]', 'location');
    await page.fill('textarea[name="node-description"]', 'A treacherous mountain pass');

    // Add custom attribute
    await page.click('button:has-text("Add Attribute")');
    await page.fill('input[name="attr-key-0"]', 'difficulty');
    await page.fill('input[name="attr-value-0"]', 'extreme');

    // Save node
    await page.click('button:has-text("Save Node")');
    await expect(page.locator('text=Node created successfully')).toBeVisible();

    // Verify node appears in graph
    await expect(page.locator('text=Mountain Pass')).toBeVisible();

    // Edit the node
    await page.click('text=Mountain Pass');
    await expect(page.locator('[data-testid="node-editor"]')).toBeVisible();

    await page.fill('textarea[name="node-description"]', 'A treacherous mountain pass, now with a bridge');
    await page.click('button:has-text("Update Node")');

    await expect(page.locator('text=Node updated successfully')).toBeVisible();

    // Delete the node
    await page.click('text=Mountain Pass');
    await page.click('button:has-text("Delete Node")');

    // Confirm deletion
    await page.click('button:has-text("Yes, Delete")');
    await expect(page.locator('text=Node deleted successfully')).toBeVisible();

    // Node should no longer be visible
    await expect(page.locator('text=Mountain Pass')).not.toBeVisible();
  });

  test('manual edge CRUD operations', async ({ page }) => {
    await page.click('button:has-text("Planning AI")');
    await page.click('[data-testid="view-geographical-graph"]');

    // Assuming we have at least two nodes
    // Add an edge
    await page.click('button:has-text("Add Edge")');

    // Select source and target nodes
    await page.selectOption('select[name="edge-source"]', { index: 0 });
    await page.selectOption('select[name="edge-target"]', { index: 1 });
    await page.selectOption('select[name="edge-type"]', 'road');
    await page.fill('input[name="edge-weight"]', '10');

    await page.click('button:has-text("Create Edge")');
    await expect(page.locator('text=Edge created successfully')).toBeVisible();

    // Verify edge appears (would show as connection line in graph)
    await expect(page.locator('[data-testid="edge-road"]')).toBeVisible();

    // Delete edge
    await page.click('[data-testid="edge-road"]');
    await page.click('button:has-text("Delete Edge")');
    await page.click('button:has-text("Yes, Delete")');

    await expect(page.locator('text=Edge deleted successfully')).toBeVisible();
  });

  test('active filtering for Political Web graph', async ({ page }) => {
    await page.click('button:has-text("Planning AI")');

    // Find Political Web section
    const politicalSection = page.locator('[data-testid="graph-political-web"]');

    // Enable active filter
    const activeFilterToggle = politicalSection.locator('[data-testid="active-filter-toggle"]');
    await activeFilterToggle.check();

    // View the filtered graph
    await page.click('[data-testid="view-political-web-graph"]');

    // Should show filtered indicator
    await expect(page.locator('text=Active Filter Enabled')).toBeVisible();

    // Node count should be reduced (only showing active nodes)
    const nodeCount = await page.locator('[data-testid="node-count"]').textContent();

    // Disable filter
    await page.keyboard.press('Escape'); // Close viewer
    await activeFilterToggle.uncheck();

    // View again without filter
    await page.click('[data-testid="view-political-web-graph"]');

    // Node count should be different
    const unfilteredNodeCount = await page.locator('[data-testid="node-count"]').textContent();
    expect(unfilteredNodeCount).not.toBe(nodeCount);
  });

  test('active filtering for Campaign Story graph', async ({ page }) => {
    await page.click('button:has-text("Planning AI")');

    // Find Campaign Story section
    const campaignSection = page.locator('[data-testid="graph-campaign-story"]');

    // Enable active filter
    const activeFilterToggle = campaignSection.locator('[data-testid="active-filter-toggle"]');
    await activeFilterToggle.check();

    // Start a planning session to test filtering
    await page.click('button:has-text("Start Planning Session")');

    const chatInput = page.locator('input[placeholder*="Ask about your campaign plans"]');
    await chatInput.fill('What story elements are currently active?');
    await page.keyboard.press('Enter');

    // Response should mention active filtering
    await expect(page.locator('text=active story elements')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=last 5 sessions')).toBeVisible();
  });

  test('graph search functionality', async ({ page }) => {
    await page.click('button:has-text("Planning AI")');
    await page.click('[data-testid="view-geographical-graph"]');

    // Use search box
    const searchInput = page.locator('input[placeholder="Search nodes..."]');
    await searchInput.fill('City');

    // Should filter to nodes containing "City"
    await expect(page.locator('text=Capital City')).toBeVisible();
    await expect(page.locator('text=Port City')).toBeVisible();

    // Non-matching nodes should be hidden/dimmed
    const nonMatchingNode = page.locator('text=Forest Camp');
    if (await nonMatchingNode.isVisible()) {
      // Check if it's dimmed
      await expect(nonMatchingNode).toHaveCSS('opacity', '0.3');
    }

    // Clear search
    await searchInput.clear();

    // All nodes should be visible again
    await expect(page.locator('text=Forest Camp')).toBeVisible();
    await expect(page.locator('text=Forest Camp')).not.toHaveCSS('opacity', '0.3');
  });

  test('graph export and import', async ({ page }) => {
    await page.click('button:has-text("Planning AI")');
    await page.click('[data-testid="view-geographical-graph"]');

    // Export graph
    await page.click('button:has-text("Export Graph")');

    // Wait for download
    const download = await page.waitForEvent('download');
    expect(download.suggestedFilename()).toContain('geographical');
    expect(download.suggestedFilename()).toContain('.json');

    // Import graph (to another campaign or as backup)
    await page.click('button:has-text("Import Graph")');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(await download.path());

    await expect(page.locator('text=Graph imported successfully')).toBeVisible();
  });

  test('graph statistics and metadata', async ({ page }) => {
    await page.click('button:has-text("Planning AI")');

    // Check statistics for each graph
    const graphStats = [
      { type: 'geographical', minNodes: 5 },
      { type: 'political-web', minNodes: 3 },
      { type: 'world-foundations', minNodes: 2 },
      { type: 'campaign-story', minNodes: 4 }
    ];

    for (const stat of graphStats) {
      const section = page.locator(`[data-testid="graph-${stat.type}"]`);

      // Check node count
      const nodeCount = section.locator('[data-testid="node-count"]');
      const count = await nodeCount.textContent();
      expect(parseInt(count!)).toBeGreaterThanOrEqual(stat.minNodes);

      // Check last updated time
      const lastUpdated = section.locator('[data-testid="last-updated"]');
      await expect(lastUpdated).toContainText(/ago|just now/);

      // Check toggle state
      const toggleState = section.locator('[data-testid="toggle-state"]');
      await expect(toggleState).toHaveAttribute('aria-checked', /(true|false)/);
    }
  });

  test('graph relationship visualization', async ({ page }) => {
    await page.click('button:has-text("Planning AI")');
    await page.click('[data-testid="view-political-web-graph"]');

    // Switch to relationship view
    await page.click('button:has-text("Show Relationships")');

    // Edges should be highlighted
    await expect(page.locator('[data-testid="relationship-lines"]')).toBeVisible();

    // Hover over an edge to see details
    const edge = page.locator('[data-testid="edge-controls"]').first();
    await edge.hover();

    // Tooltip should show relationship details
    await expect(page.locator('[data-testid="edge-tooltip"]')).toBeVisible();
    await expect(page.locator('[data-testid="edge-tooltip"]')).toContainText(/Type:|Weight:/);
  });

  test('batch node operations', async ({ page }) => {
    await page.click('button:has-text("Planning AI")');
    await page.click('[data-testid="view-geographical-graph"]');

    // Enable multi-select mode
    await page.click('button:has-text("Multi-Select")');

    // Select multiple nodes
    await page.click('[data-testid="node-1"]', { modifiers: ['Control'] });
    await page.click('[data-testid="node-2"]', { modifiers: ['Control'] });
    await page.click('[data-testid="node-3"]', { modifiers: ['Control'] });

    // Should show batch actions
    await expect(page.locator('text=3 nodes selected')).toBeVisible();

    // Batch delete
    await page.click('button:has-text("Delete Selected")');
    await page.click('button:has-text("Yes, Delete All")');

    await expect(page.locator('text=3 nodes deleted')).toBeVisible();
  });

  test('graph version history', async ({ page }) => {
    await page.click('button:has-text("Planning AI")');
    await page.click('[data-testid="view-world-foundations-graph"]');

    // View version history
    await page.click('button:has-text("Version History")');

    // Should show at least current version
    await expect(page.locator('[data-testid="version-list"]')).toBeVisible();
    await expect(page.locator('text=Current Version')).toBeVisible();

    // If there's a backup version
    const backupVersion = page.locator('text=Backup Version');
    if (await backupVersion.isVisible()) {
      // Can restore from backup
      await backupVersion.click();
      await page.click('button:has-text("Restore This Version")');
      await page.click('button:has-text("Yes, Restore")');

      await expect(page.locator('text=Version restored successfully')).toBeVisible();
    }
  });
});