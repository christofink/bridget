import { render, screen } from '@testing-library/react';
import SubtitleArea from '@/components/shell/SubtitleArea';
import StatusAnnouncer from '@/components/shell/StatusAnnouncer';

describe('ARIA Live Regions', () => {
  it('subtitle container has correct ARIA attributes', () => {
    render(<SubtitleArea />);
    const log = screen.getByRole('log');

    expect(log).toHaveAttribute('aria-live', 'polite');
    expect(log).toHaveAttribute('aria-atomic', 'false');
    expect(log).toHaveAttribute('aria-relevant', 'additions text');
  });

  it('status element with role="status" exists', () => {
    render(<StatusAnnouncer state="idle" />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('status announcer updates text on state change', () => {
    const { rerender } = render(<StatusAnnouncer state="listening" />);
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('Listening');

    rerender(<StatusAnnouncer state="paused" />);
    expect(status.textContent).toBe('Paused');
  });
});
