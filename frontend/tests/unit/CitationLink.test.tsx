/**
 * Component Test: CitationLink
 * Feature 009: Player Question Portal
 * T053: Test onClick navigates to /cards/{cardId}
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CitationLink } from '../../src/components/portal/CitationLink';
import { BrowserRouter } from 'react-router-dom';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('CitationLink Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should render citation button with number and title', () => {
    const citation = {
      number: 1,
      cardId: 'card-123',
      cardTitle: 'The Battle of Helms Deep',
      url: '/cards/card-123',
    };

    render(
      <BrowserRouter>
        <CitationLink citation={citation} />
      </BrowserRouter>
    );

    // Check button contains citation number
    expect(screen.getByText(/\[1\]/)).toBeInTheDocument();

    // Check button contains card title
    expect(screen.getByText(/The Battle of Helms Deep/)).toBeInTheDocument();
  });

  it('should navigate to card detail page on click', () => {
    const citation = {
      number: 1,
      cardId: 'card-123',
      cardTitle: 'The Battle of Helms Deep',
      url: '/cards/card-123',
    };

    render(
      <BrowserRouter>
        <CitationLink citation={citation} />
      </BrowserRouter>
    );

    // Click the citation button
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Verify navigate was called with correct URL
    expect(mockNavigate).toHaveBeenCalledWith('/cards/card-123');
  });

  it('should display card title in button tooltip', () => {
    const citation = {
      number: 2,
      cardId: 'card-456',
      cardTitle: 'Gandalf the Grey',
      url: '/cards/card-456',
    };

    render(
      <BrowserRouter>
        <CitationLink citation={citation} />
      </BrowserRouter>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Gandalf the Grey');
  });

  it('should render multiple citations with different numbers', () => {
    const citations = [
      {
        number: 1,
        cardId: 'card-1',
        cardTitle: 'First Card',
        url: '/cards/card-1',
      },
      {
        number: 2,
        cardId: 'card-2',
        cardTitle: 'Second Card',
        url: '/cards/card-2',
      },
      {
        number: 3,
        cardId: 'card-3',
        cardTitle: 'Third Card',
        url: '/cards/card-3',
      },
    ];

    const { rerender } = render(
      <BrowserRouter>
        <CitationLink citation={citations[0]} />
      </BrowserRouter>
    );

    expect(screen.getByText(/\[1\]/)).toBeInTheDocument();
    expect(screen.getByText(/First Card/)).toBeInTheDocument();

    rerender(
      <BrowserRouter>
        <CitationLink citation={citations[1]} />
      </BrowserRouter>
    );

    expect(screen.getByText(/\[2\]/)).toBeInTheDocument();
    expect(screen.getByText(/Second Card/)).toBeInTheDocument();

    rerender(
      <BrowserRouter>
        <CitationLink citation={citations[2]} />
      </BrowserRouter>
    );

    expect(screen.getByText(/\[3\]/)).toBeInTheDocument();
    expect(screen.getByText(/Third Card/)).toBeInTheDocument();
  });

  it('should handle citations with long card titles', () => {
    const citation = {
      number: 5,
      cardId: 'card-long',
      cardTitle: 'The Complete and Comprehensive History of the War of the Ring Including All Major Battles',
      url: '/cards/card-long',
    };

    render(
      <BrowserRouter>
        <CitationLink citation={citation} />
      </BrowserRouter>
    );

    expect(screen.getByText(/\[5\]/)).toBeInTheDocument();
    expect(
      screen.getByText(/The Complete and Comprehensive History/)
    ).toBeInTheDocument();
  });

  it('should navigate to correct URL for different card IDs', () => {
    const citations = [
      {
        number: 1,
        cardId: 'npc-gandalf',
        cardTitle: 'Gandalf',
        url: '/cards/npc-gandalf',
      },
      {
        number: 2,
        cardId: 'location-rivendell',
        cardTitle: 'Rivendell',
        url: '/cards/location-rivendell',
      },
      {
        number: 3,
        cardId: 'faction-fellowship',
        cardTitle: 'The Fellowship',
        url: '/cards/faction-fellowship',
      },
    ];

    const { rerender } = render(
      <BrowserRouter>
        <CitationLink citation={citations[0]} />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/cards/npc-gandalf');

    mockNavigate.mockClear();
    rerender(
      <BrowserRouter>
        <CitationLink citation={citations[1]} />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/cards/location-rivendell');

    mockNavigate.mockClear();
    rerender(
      <BrowserRouter>
        <CitationLink citation={citations[2]} />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/cards/faction-fellowship');
  });

  it('should be clickable and accessible', () => {
    const citation = {
      number: 1,
      cardId: 'card-123',
      cardTitle: 'Test Card',
      url: '/cards/card-123',
    };

    render(
      <BrowserRouter>
        <CitationLink citation={citation} />
      </BrowserRouter>
    );

    const button = screen.getByRole('button');

    // Verify button properties
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');

    // Verify button is not disabled
    expect(button).not.toBeDisabled();
  });

  it('should handle rapid successive clicks', () => {
    const citation = {
      number: 1,
      cardId: 'card-123',
      cardTitle: 'Test Card',
      url: '/cards/card-123',
    };

    render(
      <BrowserRouter>
        <CitationLink citation={citation} />
      </BrowserRouter>
    );

    const button = screen.getByRole('button');

    // Click multiple times rapidly
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // All clicks should trigger navigation
    expect(mockNavigate).toHaveBeenCalledTimes(3);
    expect(mockNavigate).toHaveBeenCalledWith('/cards/card-123');
  });
});
