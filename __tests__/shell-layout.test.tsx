import { render, screen } from '@testing-library/react';
import ControlsBar from '@/components/shell/ControlsBar';
import SubtitleArea from '@/components/shell/SubtitleArea';
import ActionBar from '@/components/shell/ActionBar';

describe('Shell Layout', () => {
  it('page renders controls bar, subtitle area, and action bar', () => {
    const { container } = render(
      <>
        <ControlsBar />
        <SubtitleArea />
        <ActionBar state="idle" />
      </>
    );

    expect(container.querySelector('nav')).toBeTruthy();
    expect(container.querySelector('main')).toBeTruthy();
    expect(container.querySelector('footer')).toBeTruthy();
  });

  it('subtitle area has role="log" attribute', () => {
    render(<SubtitleArea />);
    expect(screen.getByRole('log')).toBeTruthy();
  });

  it('subtitle area has aria-live="polite" attribute', () => {
    render(<SubtitleArea />);
    const logEl = screen.getByRole('log');
    expect(logEl.getAttribute('aria-live')).toBe('polite');
  });

  it('settings gear icon is present and clickable', () => {
    const onClick = vi.fn();
    render(<ControlsBar onSettingsClick={onClick} />);
    const btn = screen.getByLabelText('Settings');
    expect(btn).toBeTruthy();
    expect(btn).not.toBeDisabled();
  });

  it('app title "Bridget" is displayed in controls bar', () => {
    render(<ControlsBar />);
    expect(screen.getByText('Bridget')).toBeTruthy();
  });
});
