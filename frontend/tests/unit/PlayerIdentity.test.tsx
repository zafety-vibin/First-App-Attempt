/**
 * Component Test: PlayerIdentity
 * Feature 009: Player Question Portal
 * T052: Test unique name error display when UNIQUE constraint fails
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlayerIdentity } from '../../src/components/portal/PlayerIdentity';

describe('PlayerIdentity Component', () => {
  const mockOnIdentified = vi.fn();
  const mockCampaignId = 'test-campaign-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render character name input prompt', () => {
    render(
      <PlayerIdentity
        campaignId={mockCampaignId}
        onIdentified={mockOnIdentified}
      />
    );

    expect(screen.getByText(/Who are you in-game/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your character name/i)).toBeInTheDocument();
  });

  it('should display unique name error when character name already exists', async () => {
    // Mock axios to reject with duplicate name error
    const mockAxios = await import('axios');
    vi.spyOn(mockAxios.default, 'post').mockRejectedValue({
      response: {
        status: 409,
        data: {
          error: 'Character name already in use for this campaign. Please choose a different name.',
        },
      },
    });

    render(
      <PlayerIdentity
        campaignId={mockCampaignId}
        onIdentified={mockOnIdentified}
      />
    );

    // Enter character name
    const input = screen.getByPlaceholderText(/Enter your character name/i);
    fireEvent.change(input, { target: { value: 'Gandalf' } });

    // Submit
    const submitButton = screen.getByText(/Continue/i);
    fireEvent.click(submitButton);

    // Wait for error to appear
    await waitFor(() => {
      expect(
        screen.getByText(/Character name already in use/i)
      ).toBeInTheDocument();
    });

    // Verify onIdentified was NOT called
    expect(mockOnIdentified).not.toHaveBeenCalled();
  });

  it('should successfully identify player with unique name', async () => {
    const mockPlayer = {
      id: 'player-123',
      characterName: 'Gandalf',
    };

    const mockAxios = await import('axios');
    vi.spyOn(mockAxios.default, 'post').mockResolvedValue({
      data: { player: mockPlayer },
    });

    render(
      <PlayerIdentity
        campaignId={mockCampaignId}
        onIdentified={mockOnIdentified}
      />
    );

    // Enter character name
    const input = screen.getByPlaceholderText(/Enter your character name/i);
    fireEvent.change(input, { target: { value: 'Gandalf' } });

    // Submit
    const submitButton = screen.getByText(/Continue/i);
    fireEvent.click(submitButton);

    // Wait for success
    await waitFor(() => {
      expect(mockOnIdentified).toHaveBeenCalledWith(mockPlayer);
    });
  });

  it('should trim whitespace from character name', async () => {
    const mockPlayer = {
      id: 'player-123',
      characterName: 'Gandalf',
    };

    const mockAxios = await import('axios');
    const postSpy = vi.spyOn(mockAxios.default, 'post').mockResolvedValue({
      data: { player: mockPlayer },
    });

    render(
      <PlayerIdentity
        campaignId={mockCampaignId}
        onIdentified={mockOnIdentified}
      />
    );

    // Enter character name with whitespace
    const input = screen.getByPlaceholderText(/Enter your character name/i);
    fireEvent.change(input, { target: { value: '  Gandalf  ' } });

    // Submit
    const submitButton = screen.getByText(/Continue/i);
    fireEvent.click(submitButton);

    // Verify trimmed name was sent
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        expect.stringContaining('/identify'),
        expect.objectContaining({
          characterName: 'Gandalf',
        })
      );
    });
  });

  it('should prevent submission with empty character name', () => {
    render(
      <PlayerIdentity
        campaignId={mockCampaignId}
        onIdentified={mockOnIdentified}
      />
    );

    // Try to submit without entering name
    const submitButton = screen.getByText(/Continue/i);
    fireEvent.click(submitButton);

    // Verify button is disabled or form validation prevents submission
    expect(mockOnIdentified).not.toHaveBeenCalled();
  });

  it('should display loading state during identification', async () => {
    const mockAxios = await import('axios');
    vi.spyOn(mockAxios.default, 'post').mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <PlayerIdentity
        campaignId={mockCampaignId}
        onIdentified={mockOnIdentified}
      />
    );

    // Enter character name and submit
    const input = screen.getByPlaceholderText(/Enter your character name/i);
    fireEvent.change(input, { target: { value: 'Gandalf' } });

    const submitButton = screen.getByText(/Continue/i);
    fireEvent.click(submitButton);

    // Check for loading state (button disabled or loading indicator)
    await waitFor(() => {
      const button = screen.getByText(/Continue/i);
      expect(button).toBeDisabled();
    });
  });

  it('should display generic error for network failures', async () => {
    const mockAxios = await import('axios');
    vi.spyOn(mockAxios.default, 'post').mockRejectedValue(
      new Error('Network error')
    );

    render(
      <PlayerIdentity
        campaignId={mockCampaignId}
        onIdentified={mockOnIdentified}
      />
    );

    // Enter character name and submit
    const input = screen.getByPlaceholderText(/Enter your character name/i);
    fireEvent.change(input, { target: { value: 'Gandalf' } });

    const submitButton = screen.getByText(/Continue/i);
    fireEvent.click(submitButton);

    // Wait for error
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should clear error when user modifies character name', async () => {
    const mockAxios = await import('axios');
    vi.spyOn(mockAxios.default, 'post').mockRejectedValue({
      response: {
        status: 409,
        data: {
          error: 'Character name already in use for this campaign. Please choose a different name.',
        },
      },
    });

    render(
      <PlayerIdentity
        campaignId={mockCampaignId}
        onIdentified={mockOnIdentified}
      />
    );

    // Enter duplicate name and submit
    const input = screen.getByPlaceholderText(/Enter your character name/i);
    fireEvent.change(input, { target: { value: 'Gandalf' } });

    const submitButton = screen.getByText(/Continue/i);
    fireEvent.click(submitButton);

    // Wait for error
    await waitFor(() => {
      expect(screen.getByText(/Character name already in use/i)).toBeInTheDocument();
    });

    // Modify the input
    fireEvent.change(input, { target: { value: 'Gandalf2' } });

    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText(/Character name already in use/i)).not.toBeInTheDocument();
    });
  });
});
