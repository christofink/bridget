import { render, screen, fireEvent } from '@testing-library/react';
import { createRef, useState } from 'react';
import SettingsPanel from '@/components/shell/SettingsPanel';
import ControlsBar from '@/components/shell/ControlsBar';
import { DEFAULT_SETTINGS } from '@/lib/settings/defaults';
import type { BridgetSettings } from '@/lib/settings/types';

function renderPanel(overrides: { open?: boolean; onClose?: () => void; settings?: BridgetSettings } = {}) {
  const triggerRef = createRef<HTMLButtonElement>();
  const props = {
    open: overrides.open ?? true,
    onClose: overrides.onClose ?? vi.fn(),
    settings: overrides.settings ?? DEFAULT_SETTINGS,
    onUpdateSettings: vi.fn(),
    onResetDefaults: vi.fn(),
    triggerRef,
  };

  // Render a trigger button so we can test focus return
  const result = render(
    <>
      <button ref={triggerRef}>Settings gear</button>
      <SettingsPanel {...props} />
    </>
  );

  return { ...result, props, triggerRef };
}

// jsdom doesn't implement HTMLDialogElement.showModal/close natively,
// so we polyfill the minimal behavior for testing
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
  }
});

function TestSettingsIntegration() {
  const [open, setOpen] = useState(false);
  const triggerRef = createRef<HTMLButtonElement>();
  return (
    <>
      <ControlsBar onSettingsClick={() => setOpen(true)} settingsButtonRef={triggerRef} />
      <SettingsPanel
        open={open}
        onClose={() => setOpen(false)}
        settings={DEFAULT_SETTINGS}
        onUpdateSettings={vi.fn()}
        onResetDefaults={vi.fn()}
        triggerRef={triggerRef}
      />
    </>
  );
}

describe('SettingsPanel', () => {
  it('clicking settings gear opens the panel', () => {
    render(<TestSettingsIntegration />);
    const gearBtn = screen.getByRole('button', { name: 'Settings' });
    fireEvent.click(gearBtn);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('open');
  });

  it('settings panel is not visible by default', () => {
    renderPanel({ open: false });
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog).not.toHaveAttribute('open');
  });

  it('panel is rendered as a <dialog> element', () => {
    renderPanel({ open: true });
    const dialog = screen.getByRole('dialog');
    expect(dialog.tagName).toBe('DIALOG');
  });

  it('panel has aria-modal="true" attribute', () => {
    renderPanel({ open: true });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('pressing Escape closes the panel', () => {
    const onClose = vi.fn();
    renderPanel({ open: true, onClose });
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('focus moves to panel when opened', () => {
    renderPanel({ open: true });
    const dialog = screen.getByRole('dialog');
    // The first focusable element or the dialog itself should have focus
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('focus returns to gear button when closed', () => {
    const onClose = vi.fn();
    const { rerender, props, triggerRef } = renderPanel({ open: true, onClose });

    // Focus the trigger first to set it up
    (triggerRef as React.RefObject<HTMLButtonElement>).current?.focus();

    // Rerender with open=false to simulate closing
    rerender(
      <>
        <button ref={triggerRef}>Settings gear</button>
        <SettingsPanel {...props} open={false} />
      </>
    );

    expect(document.activeElement).toBe((triggerRef as React.RefObject<HTMLButtonElement>).current);
  });

  it('tab key cycles within panel (focus trap)', () => {
    renderPanel({ open: true });
    const dialog = screen.getByRole('dialog');
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    expect(focusableElements.length).toBeGreaterThanOrEqual(2);

    const lastFocusable = focusableElements[focusableElements.length - 1];
    lastFocusable.focus();

    fireEvent.keyDown(dialog, { key: 'Tab' });

    // After tabbing from last element, focus should wrap to first focusable element
    expect(document.activeElement).toBe(focusableElements[0]);
  });
});
