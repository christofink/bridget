import { render, screen, fireEvent } from '@testing-library/react';
import ActionBar from '@/components/shell/ActionBar';

describe('ActionBar', () => {
  it('start button is present and clickable when idle', () => {
    render(<ActionBar state="idle" />);
    const btn = screen.getByRole('button', { name: /start listening/i });
    expect(btn).toBeTruthy();
    expect(btn).not.toBeDisabled();
  });

  it('clicking Start triggers onStart callback', () => {
    const onStart = vi.fn();
    render(<ActionBar state="idle" onStart={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: /start listening/i }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('when state is listening, Pause and Stop buttons appear', () => {
    render(<ActionBar state="listening" />);
    expect(screen.getByRole('button', { name: /pause/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /stop/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /start listening/i })).toBeNull();
  });

  it('when state is paused, Resume and Stop buttons appear', () => {
    render(<ActionBar state="paused" />);
    expect(screen.getByRole('button', { name: /resume/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /stop/i })).toBeTruthy();
  });

  it('all buttons have minimum 44x44px touch target dimensions', () => {
    render(<ActionBar state="idle" />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      const styles = window.getComputedStyle(btn);
      const minWidth = parseInt(styles.minWidth, 10);
      const minHeight = parseInt(styles.minHeight, 10);
      expect(minWidth).toBeGreaterThanOrEqual(44);
      expect(minHeight).toBeGreaterThanOrEqual(44);
    });
  });
});
