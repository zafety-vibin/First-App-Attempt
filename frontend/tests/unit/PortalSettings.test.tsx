/**
 * Component Test: PortalSettings
 * Feature 009: Player Question Portal
 * T051: Test enable toggle, password input, style selector
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PortalSettings } from '../../src/components/portal/PortalSettings';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('PortalSettings Component', () => {
  const mockCampaignId = 'test-campaign-123';

  const mockConfig = {
    id: 'config-1',
    campaignId: mockCampaignId,
    enabled: false,
    passwordHash: null,
    responseStyle: 'friendly-sage',
    customSystemPrompt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load and display portal configuration', async () => {
    mockedAxios.get.mockResolvedValue({ data: mockConfig });

    render(<PortalSettings campaignId={mockCampaignId} />);

    await waitFor(() => {
      expect(screen.getByText(/Portal Settings/i)).toBeInTheDocument();
    });

    expect(mockedAxios.get).toHaveBeenCalledWith(
      `/api/campaigns/${mockCampaignId}/portal/config`
    );
  });

  it('should toggle portal enable/disable', async () => {
    mockedAxios.get.mockResolvedValue({ data: mockConfig });
    mockedAxios.put.mockResolvedValue({ data: { success: true } });

    render(<PortalSettings campaignId={mockCampaignId} />);

    await waitFor(() => {
      expect(screen.getByText(/Portal Settings/i)).toBeInTheDocument();
    });

    // Find and click the enable toggle
    const enableButton = screen.getByText(/Enable Portal/i);
    fireEvent.click(enableButton);

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith(
        `/api/campaigns/${mockCampaignId}/portal/enable`,
        { enabled: true }
      );
    });
  });

  it('should handle password input and submission', async () => {
    mockedAxios.get.mockResolvedValue({ data: mockConfig });
    mockedAxios.put.mockResolvedValue({ data: { success: true } });

    render(<PortalSettings campaignId={mockCampaignId} />);

    await waitFor(() => {
      expect(screen.getByText(/Portal Settings/i)).toBeInTheDocument();
    });

    // Find password input
    const passwordInput = screen.getByPlaceholderText(/Enter password/i);
    fireEvent.change(passwordInput, { target: { value: 'test-password-123' } });

    // Submit password
    const setPasswordButton = screen.getByText(/Set Password/i);
    fireEvent.click(setPasswordButton);

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith(
        `/api/campaigns/${mockCampaignId}/portal/password`,
        { password: 'test-password-123' }
      );
    });
  });

  it('should handle response style selection', async () => {
    mockedAxios.get.mockResolvedValue({ data: mockConfig });
    mockedAxios.put.mockResolvedValue({ data: { success: true } });

    render(<PortalSettings campaignId={mockCampaignId} />);

    await waitFor(() => {
      expect(screen.getByText(/Portal Settings/i)).toBeInTheDocument();
    });

    // Find response style selector
    const styleSelector = screen.getByLabelText(/Response Style/i);
    fireEvent.change(styleSelector, { target: { value: 'scholarly-tome' } });

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith(
        `/api/campaigns/${mockCampaignId}/portal/response-style`,
        expect.objectContaining({
          responseStyle: 'scholarly-tome',
        })
      );
    });
  });

  it('should display loading state initially', () => {
    mockedAxios.get.mockReturnValue(new Promise(() => {})); // Never resolves

    render(<PortalSettings campaignId={mockCampaignId} />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('should display error when config fails to load', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'));

    render(<PortalSettings campaignId={mockCampaignId} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
    });
  });

  it('should allow removing password protection', async () => {
    const configWithPassword = {
      ...mockConfig,
      passwordHash: 'hashed-password-here',
    };

    mockedAxios.get.mockResolvedValue({ data: configWithPassword });
    mockedAxios.put.mockResolvedValue({ data: { success: true } });

    render(<PortalSettings campaignId={mockCampaignId} />);

    await waitFor(() => {
      expect(screen.getByText(/Portal Settings/i)).toBeInTheDocument();
    });

    // Find and click remove password button
    const removePasswordButton = screen.getByText(/Remove Password/i);
    fireEvent.click(removePasswordButton);

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith(
        `/api/campaigns/${mockCampaignId}/portal/password`,
        { password: null }
      );
    });
  });

  it('should display all 5 response style options', async () => {
    mockedAxios.get.mockResolvedValue({ data: mockConfig });

    render(<PortalSettings campaignId={mockCampaignId} />);

    await waitFor(() => {
      expect(screen.getByText(/Portal Settings/i)).toBeInTheDocument();
    });

    // Check that all 5 response styles are available
    const styleSelector = screen.getByLabelText(/Response Style/i);
    expect(styleSelector).toBeInTheDocument();

    // Verify options exist
    expect(screen.getByText(/friendly-sage/i)).toBeInTheDocument();
    expect(screen.getByText(/scholarly-tome/i)).toBeInTheDocument();
    expect(screen.getByText(/tavern-gossip/i)).toBeInTheDocument();
    expect(screen.getByText(/factual/i)).toBeInTheDocument();
    expect(screen.getByText(/custom/i)).toBeInTheDocument();
  });
});
