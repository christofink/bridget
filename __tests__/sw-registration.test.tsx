import { render, screen, act } from '@testing-library/react';
import SWUpdatePrompt from '@/components/shell/SWUpdatePrompt';

describe('SWUpdatePrompt', () => {
  const originalServiceWorker = navigator.serviceWorker;

  afterEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: originalServiceWorker,
      configurable: true,
    });
  });

  it('does not throw when navigator.serviceWorker is undefined', () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
    });

    expect(() => render(<SWUpdatePrompt />)).not.toThrow();
  });

  it('shows refresh prompt when controllerchange fires on update (not initial)', () => {
    const listeners: Record<string, Function> = {};
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        // Simulate an existing controller (not first visit)
        controller: {},
        addEventListener: (event: string, cb: Function) => {
          listeners[event] = cb;
        },
        removeEventListener: () => {},
      },
      configurable: true,
    });

    render(<SWUpdatePrompt />);

    act(() => {
      listeners['controllerchange']?.();
    });

    expect(screen.getByText(/new version available/i)).toBeInTheDocument();
  });

  it('does not show prompt on first controller claim', () => {
    const listeners: Record<string, Function> = {};
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        // No controller yet (first visit)
        controller: null,
        addEventListener: (event: string, cb: Function) => {
          listeners[event] = cb;
        },
        removeEventListener: () => {},
      },
      configurable: true,
    });

    render(<SWUpdatePrompt />);

    act(() => {
      listeners['controllerchange']?.();
    });

    expect(screen.queryByText(/new version available/i)).not.toBeInTheDocument();
  });
});
