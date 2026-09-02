import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import LandingPage from './LandingPage';

function renderLandingPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe('LandingPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The landing page used to sit behind a 6-7 second boot overlay. Content is
  // now rendered on the first paint, with no gate to wait out and no
  // reduced-motion branch that changes what is on the page.
  it('renders the product heading immediately, with no boot overlay', () => {
    renderLandingPage();

    expect(screen.queryByTestId('orbital-landing-boot')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Project TARA/i, level: 1 })).toBeVisible();
  });

  it('leads with the product name rather than the design-system name', () => {
    renderLandingPage();

    // "ORBITAL" is the internal name for the visual system. It must never
    // reach the screen: the previous hero rendered it larger than the product.
    expect(screen.queryByText(/orbital/i)).not.toBeInTheDocument();
  });

  it('names the six STRIDE categories', () => {
    renderLandingPage();

    ['Spoofing', 'Tampering', 'Repudiation', 'Information disclosure', 'Denial of service', 'Elevation of privilege']
      .forEach((category) => {
        expect(screen.getByText(category)).toBeVisible();
      });
  });

  it('offers sign-in from the hero', () => {
    renderLandingPage();

    expect(screen.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });
});
