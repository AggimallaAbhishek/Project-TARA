import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import LandingPage from './LandingPage';

function mockMatchMedia(matches) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function renderLandingPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe('LandingPage boot behavior', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('skips the boot overlay when reduced motion is preferred', async () => {
    mockMatchMedia(true);
    renderLandingPage();

    expect(screen.queryByTestId('orbital-landing-boot')).not.toBeInTheDocument();
    const heading = await screen.findByRole('heading', { name: /Project TARA/i });
    await waitFor(() => {
      expect(heading).toBeVisible();
    });
  });

  it('shows the boot overlay when reduced motion is not preferred', () => {
    mockMatchMedia(false);
    renderLandingPage();

    expect(screen.getByTestId('orbital-landing-boot')).toBeInTheDocument();
  });
});
