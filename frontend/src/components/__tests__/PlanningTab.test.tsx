/**
 * Planning Tab Component Tests
 * Task: T070
 * References:
 * - specs/005-create-the-ai/plan.md
 * - specs/005-create-the-ai/research.md
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { PlanningTab } from '../PlanningTab';
import { AITabContext } from '../../contexts/AITabContext';
import * as planningService from '../../services/planningService';
import * as graphService from '../../services/graphService';

// Mock the services
vi.mock('../../services/planningService');
vi.mock('../../services/graphService');

// Mock Radix UI Dialog
vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children, open }: any) => open ? <div>{children}</div> : null,
  Portal: ({ children }: any) => children,
  Overlay: ({ children }: any) => <div data-testid="dialog-overlay">{children}</div>,
  Content: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  Title: ({ children }: any) => <h2>{children}</h2>,
  Close: ({ children }: any) => <button data-testid="close-button">{children}</button>,
}));

describe('PlanningTab', () => {
  const mockCampaignId = 'test-campaign-123';
  const mockContextValue = {
    activeTab: 'planning' as const,
    isOpen: true,
    setActiveTab: vi.fn(),
    setIsOpen: vi.fn(),
  };

  const mockGraphs = [
    {
      id: 'graph-1',
      campaign_id: mockCampaignId,
      type: 'geographical',
      name: 'Geographical',
      toggle_state: 'enabled',
      nodes: [
        { id: 'node-1', type: 'location', name: 'Test City', attributes: {} }
      ],
      edges: [
        { id: 'edge-1', source: 'node-1', target: 'node-2', type: 'near', weight: 1 }
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
      nodes: [],
      edges: [],
      created_at: Date.now(),
      updated_at: Date.now(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(graphService.graphService.listGraphs).mockResolvedValue(mockGraphs);
  });

  it('renders planning tab with initial state', async () => {
    render(
      <AITabContext.Provider value={mockContextValue}>
        <PlanningTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    expect(screen.getByText('Planning AI')).toBeInTheDocument();
    expect(screen.getByText('Start Planning Session')).toBeInTheDocument();

    // Should load and display graphs
    await waitFor(() => {
      expect(screen.getByText('Knowledge Graphs')).toBeInTheDocument();
      expect(screen.getByText('Geographical')).toBeInTheDocument();
      expect(screen.getByText('Political Web')).toBeInTheDocument();
    });
  });

  it('creates a new planning session when button is clicked', async () => {
    const mockSession = {
      id: 'session-123',
      campaign_id: mockCampaignId,
      status: 'active',
      created_at: Date.now(),
    };

    vi.mocked(planningService.planningService.createSession).mockResolvedValue(mockSession);

    render(
      <AITabContext.Provider value={mockContextValue}>
        <PlanningTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    const startButton = screen.getByText('Start Planning Session');
    await userEvent.click(startButton);

    await waitFor(() => {
      expect(planningService.planningService.createSession).toHaveBeenCalledWith(mockCampaignId);
      expect(screen.getByText(/Planning session created/)).toBeInTheDocument();
    });
  });

  it('handles chat messages with immediate graph updates', async () => {
    const mockSession = {
      id: 'session-123',
      campaign_id: mockCampaignId,
      status: 'active',
      created_at: Date.now(),
    };

    vi.mocked(planningService.planningService.createSession).mockResolvedValue(mockSession);

    // Mock streaming response with graph updates
    vi.mocked(planningService.planningService.sendMessage).mockImplementation(
      async (campaignId, sessionId, message, onChunk, onGraphUpdate) => {
        // Simulate streaming chunks
        onChunk('Let me update the graph with that information. ');

        // Simulate graph update
        if (onGraphUpdate) {
          onGraphUpdate({
            type: 'node_added',
            graph_id: 'graph-1',
            node: {
              id: 'new-node',
              type: 'character',
              name: 'New Character',
              attributes: {},
            },
          });
        }

        onChunk('I\'ve added the new character to the graph.');
      }
    );

    render(
      <AITabContext.Provider value={mockContextValue}>
        <PlanningTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    // Start session
    const startButton = screen.getByText('Start Planning Session');
    await userEvent.click(startButton);

    // Send a message
    const input = screen.getByPlaceholderText(/Ask about your campaign plans/i);
    await userEvent.type(input, 'Add a new character named Bob');

    const sendButton = screen.getByRole('button', { name: /send/i });
    await userEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Add a new character named Bob')).toBeInTheDocument();
      expect(screen.getByText(/Let me update the graph/)).toBeInTheDocument();
      expect(screen.getByText(/added the new character/)).toBeInTheDocument();
    });
  });

  it('toggles graph visibility', async () => {
    const toggledGraph = { ...mockGraphs[0], toggle_state: 'disabled' };
    vi.mocked(graphService.graphService.toggleGraph).mockResolvedValue(toggledGraph);

    render(
      <AITabContext.Provider value={mockContextValue}>
        <PlanningTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Geographical')).toBeInTheDocument();
    });

    // Find and click toggle button for first graph
    const toggleButtons = screen.getAllByRole('switch');
    await userEvent.click(toggleButtons[0]);

    await waitFor(() => {
      expect(graphService.graphService.toggleGraph).toHaveBeenCalledWith(
        mockCampaignId,
        'graph-1'
      );
    });
  });

  it('shows active filter toggle for political-web and campaign-story graphs', async () => {
    render(
      <AITabContext.Provider value={mockContextValue}>
        <PlanningTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Political Web')).toBeInTheDocument();
      // Active filter toggle should be shown for political-web
      expect(screen.getByLabelText(/Active Filter/i)).toBeInTheDocument();
    });
  });

  it('handles graph node selection and editing', async () => {
    render(
      <AITabContext.Provider value={mockContextValue}>
        <PlanningTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Geographical')).toBeInTheDocument();
    });

    // Click on a graph to view it
    const viewButton = screen.getAllByText(/View/i)[0];
    await userEvent.click(viewButton);

    // Should show graph viewer
    expect(screen.getByText('Test City')).toBeInTheDocument();
  });

  it('displays chat history when resuming session', async () => {
    const mockSession = {
      id: 'session-123',
      campaign_id: mockCampaignId,
      status: 'active',
      created_at: Date.now(),
    };

    const mockHistory = [
      {
        role: 'user' as const,
        content: 'Previous message',
        timestamp: Date.now() - 1000,
      },
      {
        role: 'assistant' as const,
        content: 'Previous response',
        timestamp: Date.now() - 500,
      },
    ];

    vi.mocked(planningService.planningService.createSession).mockResolvedValue(mockSession);
    vi.mocked(planningService.planningService.getChatHistory).mockResolvedValue(mockHistory);

    render(
      <AITabContext.Provider value={mockContextValue}>
        <PlanningTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    // Start session
    const startButton = screen.getByText('Start Planning Session');
    await userEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('Previous message')).toBeInTheDocument();
      expect(screen.getByText('Previous response')).toBeInTheDocument();
    });
  });

  it('handles errors gracefully', async () => {
    vi.mocked(planningService.planningService.createSession).mockRejectedValue(
      new Error('Failed to create session')
    );

    render(
      <AITabContext.Provider value={mockContextValue}>
        <PlanningTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    const startButton = screen.getByText('Start Planning Session');
    await userEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to create planning session/)).toBeInTheDocument();
    });
  });

  it('closes tab when ESC is pressed', async () => {
    render(
      <AITabContext.Provider value={mockContextValue}>
        <PlanningTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    // Press ESC
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockContextValue.setIsOpen).toHaveBeenCalledWith(false);
  });

  it('disables input during streaming', async () => {
    const mockSession = {
      id: 'session-123',
      campaign_id: mockCampaignId,
      status: 'active',
      created_at: Date.now(),
    };

    vi.mocked(planningService.planningService.createSession).mockResolvedValue(mockSession);

    // Mock slow streaming response
    vi.mocked(planningService.planningService.sendMessage).mockImplementation(
      async (campaignId, sessionId, message, onChunk) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        onChunk('Response');
      }
    );

    render(
      <AITabContext.Provider value={mockContextValue}>
        <PlanningTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    // Start session
    const startButton = screen.getByText('Start Planning Session');
    await userEvent.click(startButton);

    // Send a message
    const input = screen.getByPlaceholderText(/Ask about your campaign plans/i);
    await userEvent.type(input, 'Test message');

    const sendButton = screen.getByRole('button', { name: /send/i });
    await userEvent.click(sendButton);

    // Input should be disabled during streaming
    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();

    await waitFor(() => {
      expect(input).not.toBeDisabled();
      expect(sendButton).not.toBeDisabled();
    });
  });

  it('shows graph statistics correctly', async () => {
    render(
      <AITabContext.Provider value={mockContextValue}>
        <PlanningTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    await waitFor(() => {
      // Should show node and edge counts
      expect(screen.getByText(/1 nodes/)).toBeInTheDocument();
      expect(screen.getByText(/1 edges/)).toBeInTheDocument();
      expect(screen.getByText(/0 nodes/)).toBeInTheDocument();
      expect(screen.getByText(/0 edges/)).toBeInTheDocument();
    });
  });
});