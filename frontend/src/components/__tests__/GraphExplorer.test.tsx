/**
 * Graph Explorer Component Tests
 * Task: T071
 * References:
 * - specs/005-create-the-ai/plan.md
 * - specs/005-create-the-ai/research.md
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { GraphExplorer } from '../GraphExplorer';
import * as graphService from '../../services/graphService';

// Mock the graph service
vi.mock('../../services/graphService');

describe('GraphExplorer', () => {
  const mockCampaignId = 'test-campaign-123';
  const mockOnNodeSelect = vi.fn();
  const mockOnGraphToggle = vi.fn();

  const mockGraphs = [
    {
      id: 'graph-1',
      campaign_id: mockCampaignId,
      type: 'geographical',
      name: 'Geographical',
      toggle_state: 'enabled',
      nodes: [
        { id: 'node-1', type: 'location', name: 'Capital City', attributes: { population: 100000 } },
        { id: 'node-2', type: 'location', name: 'Port Town', attributes: { population: 25000 } },
      ],
      edges: [
        { id: 'edge-1', source: 'node-1', target: 'node-2', type: 'road', weight: 50 },
      ],
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    {
      id: 'graph-2',
      campaign_id: mockCampaignId,
      type: 'political-web',
      name: 'Political Web',
      toggle_state: 'enabled',
      nodes: [
        { id: 'node-3', type: 'faction', name: 'Merchants Guild', attributes: { influence: 'high' } },
        { id: 'node-4', type: 'character', name: 'Lord Mayor', attributes: { role: 'leader' } },
      ],
      edges: [
        { id: 'edge-2', source: 'node-3', target: 'node-4', type: 'controls', weight: 0.8 },
      ],
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    {
      id: 'graph-3',
      campaign_id: mockCampaignId,
      type: 'world-foundations',
      name: 'World Foundations',
      toggle_state: 'disabled',
      nodes: [
        { id: 'node-5', type: 'concept', name: 'Magic System', attributes: {} },
      ],
      edges: [],
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    {
      id: 'graph-4',
      campaign_id: mockCampaignId,
      type: 'campaign-story',
      name: 'Campaign Story',
      toggle_state: 'enabled',
      nodes: [
        { id: 'node-6', type: 'event', name: 'The Great War', attributes: { year: 1200 } },
      ],
      edges: [],
      created_at: Date.now(),
      updated_at: Date.now(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(graphService.graphService.listGraphs).mockResolvedValue(mockGraphs);
  });

  it('renders all knowledge graphs with their statistics', async () => {
    render(
      <GraphExplorer
        campaignId={mockCampaignId}
        onNodeSelect={mockOnNodeSelect}
        onGraphToggle={mockOnGraphToggle}
      />
    );

    await waitFor(() => {
      // All graph types should be displayed
      expect(screen.getByText('Geographical')).toBeInTheDocument();
      expect(screen.getByText('Political Web')).toBeInTheDocument();
      expect(screen.getByText('World Foundations')).toBeInTheDocument();
      expect(screen.getByText('Campaign Story')).toBeInTheDocument();

      // Statistics should be shown
      expect(screen.getByText('2 nodes, 1 edges')).toBeInTheDocument(); // Geographical
      expect(screen.getByText('1 nodes, 0 edges')).toBeInTheDocument(); // World Foundations or Campaign Story
    });
  });

  it('shows toggle state correctly', async () => {
    render(
      <GraphExplorer
        campaignId={mockCampaignId}
        onNodeSelect={mockOnNodeSelect}
        onGraphToggle={mockOnGraphToggle}
      />
    );

    await waitFor(() => {
      // Enabled graphs should have checked toggles
      const geographicalToggle = screen.getByRole('switch', { name: /Toggle Geographical/i });
      expect(geographicalToggle).toHaveAttribute('aria-checked', 'true');

      // Disabled graphs should have unchecked toggles
      const foundationsToggle = screen.getByRole('switch', { name: /Toggle World Foundations/i });
      expect(foundationsToggle).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('handles graph toggle', async () => {
    const toggledGraph = { ...mockGraphs[0], toggle_state: 'disabled' };
    vi.mocked(graphService.graphService.toggleGraph).mockResolvedValue(toggledGraph);

    render(
      <GraphExplorer
        campaignId={mockCampaignId}
        onNodeSelect={mockOnNodeSelect}
        onGraphToggle={mockOnGraphToggle}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Geographical')).toBeInTheDocument();
    });

    const toggle = screen.getByRole('switch', { name: /Toggle Geographical/i });
    await userEvent.click(toggle);

    await waitFor(() => {
      expect(graphService.graphService.toggleGraph).toHaveBeenCalledWith(mockCampaignId, 'graph-1');
      expect(mockOnGraphToggle).toHaveBeenCalledWith('graph-1', 'disabled');
    });
  });

  it('shows active filter option for political-web and campaign-story', async () => {
    render(
      <GraphExplorer
        campaignId={mockCampaignId}
        onNodeSelect={mockOnNodeSelect}
        onGraphToggle={mockOnGraphToggle}
        showActiveFilter
      />
    );

    await waitFor(() => {
      // Should show active filter checkboxes for appropriate graph types
      const politicalSection = screen.getByText('Political Web').closest('div');
      expect(politicalSection).toContainHTML('Active Filter');

      const campaignSection = screen.getByText('Campaign Story').closest('div');
      expect(campaignSection).toContainHTML('Active Filter');

      // Should NOT show for other types
      const geoSection = screen.getByText('Geographical').closest('div');
      expect(geoSection).not.toContainHTML('Active Filter');
    });
  });

  it('expands and collapses node lists', async () => {
    render(
      <GraphExplorer
        campaignId={mockCampaignId}
        onNodeSelect={mockOnNodeSelect}
        onGraphToggle={mockOnGraphToggle}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Geographical')).toBeInTheDocument();
    });

    // Initially collapsed, nodes shouldn't be visible
    expect(screen.queryByText('Capital City')).not.toBeInTheDocument();

    // Click to expand
    const expandButton = screen.getAllByRole('button', { name: /View Nodes/i })[0];
    await userEvent.click(expandButton);

    // Nodes should now be visible
    expect(screen.getByText('Capital City')).toBeInTheDocument();
    expect(screen.getByText('Port Town')).toBeInTheDocument();

    // Click to collapse
    await userEvent.click(expandButton);

    // Nodes should be hidden again
    expect(screen.queryByText('Capital City')).not.toBeInTheDocument();
  });

  it('handles node selection', async () => {
    render(
      <GraphExplorer
        campaignId={mockCampaignId}
        onNodeSelect={mockOnNodeSelect}
        onGraphToggle={mockOnGraphToggle}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Geographical')).toBeInTheDocument();
    });

    // Expand to show nodes
    const expandButton = screen.getAllByRole('button', { name: /View Nodes/i })[0];
    await userEvent.click(expandButton);

    // Click on a node
    const nodeButton = screen.getByText('Capital City');
    await userEvent.click(nodeButton);

    expect(mockOnNodeSelect).toHaveBeenCalledWith(
      'graph-1',
      expect.objectContaining({
        id: 'node-1',
        name: 'Capital City',
        type: 'location',
      })
    );
  });

  it('shows search/filter for graphs with many nodes', async () => {
    // Create a graph with many nodes
    const largeGraph = {
      ...mockGraphs[0],
      nodes: Array.from({ length: 20 }, (_, i) => ({
        id: `node-${i}`,
        type: 'location',
        name: `Location ${i}`,
        attributes: {},
      })),
    };

    vi.mocked(graphService.graphService.listGraphs).mockResolvedValue([largeGraph]);

    render(
      <GraphExplorer
        campaignId={mockCampaignId}
        onNodeSelect={mockOnNodeSelect}
        onGraphToggle={mockOnGraphToggle}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Geographical')).toBeInTheDocument();
    });

    // Expand nodes
    const expandButton = screen.getByRole('button', { name: /View Nodes/i });
    await userEvent.click(expandButton);

    // Search box should be visible for large node lists
    const searchInput = screen.getByPlaceholderText(/Search nodes/i);
    expect(searchInput).toBeInTheDocument();

    // Type in search
    await userEvent.type(searchInput, 'Location 1');

    // Should filter to matching nodes
    expect(screen.getByText('Location 1')).toBeInTheDocument();
    expect(screen.getByText('Location 10')).toBeInTheDocument();
    expect(screen.queryByText('Location 2')).not.toBeInTheDocument();
  });

  it('displays last updated time', async () => {
    render(
      <GraphExplorer
        campaignId={mockCampaignId}
        onNodeSelect={mockOnNodeSelect}
        onGraphToggle={mockOnGraphToggle}
      />
    );

    await waitFor(() => {
      // Should show "just now" for recent updates
      expect(screen.getAllByText(/just now/i).length).toBeGreaterThan(0);
    });
  });

  it('handles empty graphs gracefully', async () => {
    vi.mocked(graphService.graphService.listGraphs).mockResolvedValue([]);

    render(
      <GraphExplorer
        campaignId={mockCampaignId}
        onNodeSelect={mockOnNodeSelect}
        onGraphToggle={mockOnGraphToggle}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/No knowledge graphs found/i)).toBeInTheDocument();
    });
  });

  it('handles loading state', () => {
    // Don't resolve the promise immediately
    vi.mocked(graphService.graphService.listGraphs).mockReturnValue(new Promise(() => {}));

    render(
      <GraphExplorer
        campaignId={mockCampaignId}
        onNodeSelect={mockOnNodeSelect}
        onGraphToggle={mockOnGraphToggle}
      />
    );

    expect(screen.getByText(/Loading graphs/i)).toBeInTheDocument();
  });

  it('handles error state', async () => {
    vi.mocked(graphService.graphService.listGraphs).mockRejectedValue(
      new Error('Failed to load graphs')
    );

    render(
      <GraphExplorer
        campaignId={mockCampaignId}
        onNodeSelect={mockOnNodeSelect}
        onGraphToggle={mockOnGraphToggle}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load knowledge graphs/i)).toBeInTheDocument();
    });
  });

  it('refreshes graphs when refresh button is clicked', async () => {
    render(
      <GraphExplorer
        campaignId={mockCampaignId}
        onNodeSelect={mockOnNodeSelect}
        onGraphToggle={mockOnGraphToggle}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Geographical')).toBeInTheDocument();
    });

    // Clear mock calls
    vi.mocked(graphService.graphService.listGraphs).mockClear();

    // Click refresh button
    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    await userEvent.click(refreshButton);

    expect(graphService.graphService.listGraphs).toHaveBeenCalledWith(mockCampaignId);
  });
});