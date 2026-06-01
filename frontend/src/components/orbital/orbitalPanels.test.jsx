import { render, screen } from '@testing-library/react';
import OrbitalOperationsPanel from './OrbitalOperationsPanel';
import OrbitalSignalFeedPanel from './OrbitalSignalFeedPanel';
import OrbitalEntitiesPanel from './OrbitalEntitiesPanel';

describe('ORBITAL panel states', () => {
  it('renders operations loading and empty states consistently', () => {
    const { rerender } = render(
      <OrbitalOperationsPanel operations={[]} loading error="" />,
    );

    expect(screen.getByText('Loading operations telemetry...')).toBeInTheDocument();

    rerender(<OrbitalOperationsPanel operations={[]} loading={false} error="" />);
    expect(screen.getByText(/No analyses available yet/i)).toBeInTheDocument();
  });

  it('renders signal feed and entities error states with shared panel-state style', () => {
    render(<OrbitalSignalFeedPanel feed={[]} loading={false} error="Audit feed unavailable" />);
    expect(screen.getByText('Audit feed unavailable')).toBeInTheDocument();

    render(<OrbitalEntitiesPanel entities={[]} loading={false} error="Projects unavailable" />);
    expect(screen.getByText('Projects unavailable')).toBeInTheDocument();
  });
});
