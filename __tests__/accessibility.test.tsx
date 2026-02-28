import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { createRef } from 'react';
import ControlsBar from '@/components/shell/ControlsBar';
import SubtitleArea from '@/components/shell/SubtitleArea';
import ActionBar from '@/components/shell/ActionBar';
import SettingsPanel from '@/components/shell/SettingsPanel';
import SkipToContent from '@/components/shell/SkipToContent';
import WelcomeStep from '@/components/onboarding/WelcomeStep';
import MicPermissionStep from '@/components/onboarding/MicPermissionStep';
import PwaInstallStep from '@/components/onboarding/PwaInstallStep';
import { DEFAULT_SETTINGS } from '@/lib/settings/defaults';

expect.extend(toHaveNoViolations);

// jsdom doesn't implement HTMLDialogElement.showModal/close natively
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

describe('Accessibility — axe-core', () => {
  it('axe-core reports no violations on main view', async () => {
    const { container } = render(
      <div className="app-shell">
        <ControlsBar />
        <SubtitleArea />
        <ActionBar state="idle" />
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('axe-core reports no violations on settings panel open', async () => {
    const triggerRef = createRef<HTMLButtonElement>();
    const { container } = render(
      <>
        <button ref={triggerRef}>Settings</button>
        <SettingsPanel
          open={true}
          onClose={vi.fn()}
          settings={DEFAULT_SETTINGS}
          onUpdateSettings={vi.fn()}
          onResetDefaults={vi.fn()}
          triggerRef={triggerRef}
        />
      </>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('axe-core reports no violations on welcome step', async () => {
    const { container } = render(<WelcomeStep onNext={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('axe-core reports no violations on mic permission step', async () => {
    const { container } = render(<MicPermissionStep onNext={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('axe-core reports no violations on PWA install step', async () => {
    const { container } = render(<PwaInstallStep onNext={vi.fn()} onSkip={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('skip-to-content link renders with correct href', () => {
    render(<SkipToContent />);
    const link = screen.getByText('Skip to main content');
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('<main>, <nav>, <footer> landmarks are present', () => {
    const triggerRef = createRef<HTMLButtonElement>();
    render(
      <div className="app-shell">
        <ControlsBar
          onSettingsClick={vi.fn()}
          settingsButtonRef={triggerRef}
        />
        <SubtitleArea />
        <ActionBar state="idle" />
        <SettingsPanel
          open={true}
          onClose={vi.fn()}
          settings={DEFAULT_SETTINGS}
          onUpdateSettings={vi.fn()}
          onResetDefaults={vi.fn()}
          triggerRef={triggerRef}
        />
      </div>
    );

    // main landmark
    expect(screen.getByRole('main')).toBeTruthy();
    // nav landmark
    expect(screen.getByRole('navigation')).toBeTruthy();
    // footer via contentinfo role
    expect(screen.getByRole('contentinfo')).toBeTruthy();
    // dialog with aria-modal
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
