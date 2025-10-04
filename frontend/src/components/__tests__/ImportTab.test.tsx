/**
 * Import Tab Component Tests
 * Task: T069
 * References:
 * - specs/005-create-the-ai/plan.md
 * - specs/005-create-the-ai/research.md
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ImportTab } from '../ImportTab';
import { AITabContext } from '../../contexts/AITabContext';
import * as importService from '../../services/importService';

// Mock the import service
vi.mock('../../services/importService');

// Mock Radix UI Dialog
vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children, open }: any) => open ? <div>{children}</div> : null,
  Portal: ({ children }: any) => children,
  Overlay: ({ children }: any) => <div data-testid="dialog-overlay">{children}</div>,
  Content: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  Title: ({ children }: any) => <h2>{children}</h2>,
  Close: ({ children }: any) => <button data-testid="close-button">{children}</button>,
}));

describe('ImportTab', () => {
  const mockCampaignId = 'test-campaign-123';
  const mockContextValue = {
    activeTab: 'import' as const,
    isOpen: true,
    setActiveTab: vi.fn(),
    setIsOpen: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders import tab with initial state', () => {
    render(
      <AITabContext.Provider value={mockContextValue}>
        <ImportTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    expect(screen.getByText('Import AI')).toBeInTheDocument();
    expect(screen.getByText('Start Import Session')).toBeInTheDocument();
  });

  it('creates a new import session when button is clicked', async () => {
    const mockSession = {
      id: 'session-123',
      campaign_id: mockCampaignId,
      status: 'active',
      created_at: Date.now(),
    };

    vi.mocked(importService.importService.createSession).mockResolvedValue(mockSession);

    render(
      <AITabContext.Provider value={mockContextValue}>
        <ImportTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    const startButton = screen.getByText('Start Import Session');
    await userEvent.click(startButton);

    await waitFor(() => {
      expect(importService.importService.createSession).toHaveBeenCalledWith(mockCampaignId);
      expect(screen.getByText(/Import session created/)).toBeInTheDocument();
    });
  });

  it('handles file upload', async () => {
    const mockSession = {
      id: 'session-123',
      campaign_id: mockCampaignId,
      status: 'active',
      created_at: Date.now(),
    };

    const mockUploadResponse = {
      message: 'File processed successfully',
      entities_extracted: 10,
    };

    vi.mocked(importService.importService.createSession).mockResolvedValue(mockSession);
    vi.mocked(importService.importService.uploadFile).mockResolvedValue(mockUploadResponse);

    render(
      <AITabContext.Provider value={mockContextValue}>
        <ImportTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    // Start session first
    const startButton = screen.getByText('Start Import Session');
    await userEvent.click(startButton);

    // Upload file
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/upload file/i);

    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(importService.importService.uploadFile).toHaveBeenCalledWith(
        mockCampaignId,
        'session-123',
        file
      );
      expect(screen.getByText(/File processed successfully/)).toBeInTheDocument();
    });
  });

  it('shows approval summary after entity extraction', async () => {
    const mockSession = {
      id: 'session-123',
      campaign_id: mockCampaignId,
      status: 'active',
      created_at: Date.now(),
    };

    const mockApprovalSummary = {
      entities: [
        {
          type: 'character',
          name: 'Test Character',
          description: 'A test character',
          confidence: 0.9,
          isDuplicate: false,
        },
      ],
      total: 1,
      duplicates: 0,
      new_entities: 1,
    };

    vi.mocked(importService.importService.createSession).mockResolvedValue(mockSession);
    vi.mocked(importService.importService.getApprovalSummary).mockResolvedValue(mockApprovalSummary);

    render(
      <AITabContext.Provider value={mockContextValue}>
        <ImportTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    // Start session
    const startButton = screen.getByText('Start Import Session');
    await userEvent.click(startButton);

    // Trigger getting approval summary (would happen after upload)
    vi.mocked(importService.importService.getApprovalSummary).mockResolvedValue(mockApprovalSummary);

    // Simulate file upload completing
    const mockUploadResponse = {
      message: 'File processed',
      entities_extracted: 1,
    };
    vi.mocked(importService.importService.uploadFile).mockResolvedValue(mockUploadResponse);

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/upload file/i);
    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('Test Character')).toBeInTheDocument();
      expect(screen.getByText('1 new entities')).toBeInTheDocument();
    });
  });

  it('handles approval and shows revert button', async () => {
    const mockSession = {
      id: 'session-123',
      campaign_id: mockCampaignId,
      status: 'active',
      created_at: Date.now(),
    };

    const mockBatch = {
      id: 'batch-123',
      session_id: 'session-123',
      cards_created: 5,
      nodes_added: 3,
      edges_added: 2,
      created_at: Date.now(),
    };

    vi.mocked(importService.importService.createSession).mockResolvedValue(mockSession);
    vi.mocked(importService.importService.approve).mockResolvedValue(mockBatch);

    render(
      <AITabContext.Provider value={mockContextValue}>
        <ImportTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    // Setup session and mock approval summary
    const startButton = screen.getByText('Start Import Session');
    await userEvent.click(startButton);

    // Mock approval summary being available
    const mockApprovalSummary = {
      entities: [{ type: 'character', name: 'Test', description: 'Test', confidence: 0.9, isDuplicate: false }],
      total: 1,
      duplicates: 0,
      new_entities: 1,
    };
    vi.mocked(importService.importService.getApprovalSummary).mockResolvedValue(mockApprovalSummary);

    // Simulate having approval data
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/upload file/i);
    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('Approve Import')).toBeInTheDocument();
    });

    // Click approve
    const approveButton = screen.getByText('Approve Import');
    await userEvent.click(approveButton);

    await waitFor(() => {
      expect(importService.importService.approve).toHaveBeenCalledWith(mockCampaignId, 'session-123');
      expect(screen.getByText(/Import approved!/)).toBeInTheDocument();
      expect(screen.getByText('Revert Import')).toBeInTheDocument();
    });
  });

  it('handles chat messages and streaming', async () => {
    const mockSession = {
      id: 'session-123',
      campaign_id: mockCampaignId,
      status: 'active',
      created_at: Date.now(),
    };

    vi.mocked(importService.importService.createSession).mockResolvedValue(mockSession);

    // Mock streaming response
    vi.mocked(importService.importService.sendMessage).mockImplementation(
      async (campaignId, sessionId, message, onChunk) => {
        // Simulate streaming chunks
        onChunk('This ');
        onChunk('is ');
        onChunk('streaming.');
      }
    );

    render(
      <AITabContext.Provider value={mockContextValue}>
        <ImportTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    // Start session
    const startButton = screen.getByText('Start Import Session');
    await userEvent.click(startButton);

    // Send a message
    const input = screen.getByPlaceholderText(/Ask about the imported content/i);
    await userEvent.type(input, 'What entities did you find?');

    const sendButton = screen.getByRole('button', { name: /send/i });
    await userEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('What entities did you find?')).toBeInTheDocument();
      expect(screen.getByText('This is streaming.')).toBeInTheDocument();
    });
  });

  it('closes tab when ESC is pressed', async () => {
    render(
      <AITabContext.Provider value={mockContextValue}>
        <ImportTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    // Press ESC
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockContextValue.setIsOpen).toHaveBeenCalledWith(false);
  });

  it('handles errors gracefully', async () => {
    vi.mocked(importService.importService.createSession).mockRejectedValue(
      new Error('Failed to create session')
    );

    render(
      <AITabContext.Provider value={mockContextValue}>
        <ImportTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    const startButton = screen.getByText('Start Import Session');
    await userEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to create import session/)).toBeInTheDocument();
    });
  });

  it('disables input during streaming', async () => {
    const mockSession = {
      id: 'session-123',
      campaign_id: mockCampaignId,
      status: 'active',
      created_at: Date.now(),
    };

    vi.mocked(importService.importService.createSession).mockResolvedValue(mockSession);

    // Mock slow streaming response
    vi.mocked(importService.importService.sendMessage).mockImplementation(
      async (campaignId, sessionId, message, onChunk) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        onChunk('Response');
      }
    );

    render(
      <AITabContext.Provider value={mockContextValue}>
        <ImportTab campaignId={mockCampaignId} />
      </AITabContext.Provider>
    );

    // Start session
    const startButton = screen.getByText('Start Import Session');
    await userEvent.click(startButton);

    // Send a message
    const input = screen.getByPlaceholderText(/Ask about the imported content/i);
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
});