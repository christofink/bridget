# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bridget is a Progressive Web App built for iPad that provides real-time subtitles for face-to-face conversations. It captures microphone audio, downsamples it to 16kHz PCM, and outputs chunks ready for transcription.

## Commands

```bash
npm run dev            # Dev server on localhost:3000 (Turbopack, service worker disabled)
npm run build          # Static export to out/ (--webpack flag required for Serwist SW compilation)
npm run lint           # ESLint (next/core-web-vitals + next/typescript)
npm test               # Vitest unit tests (single run)
npm run test:watch     # Vitest in watch mode
npm run test:e2e       # Playwright E2E tests (WebKit only, auto-starts dev on :3100)
npm run test:e2e:ui    # Playwright with interactive UI
```

Run a single test file:
```bash
npx vitest run __tests__/downsampler.test.ts
npx vitest run --testNamePattern "should downsample"  # by test name
```

## Architecture

### Stack

- **Next.js 16** with App Router, static export (`output: 'export'`), single client-side page (`app/page.tsx` is the only route)
- **React 19** with hooks-only state management (no Redux/Zustand)
- **TypeScript** in strict mode, path alias `@/*` maps to repo root
- **CSS Modules** (`.module.css`) + **CSS Custom Properties** for theming — no CSS framework
- **Serwist** (service worker toolkit) integrated via `@serwist/next` — requires Webpack for build (Turbopack doesn't support SW compilation)

### Key Directories

- `app/` — Next.js App Router: root layout, single page (`page.tsx` is `'use client'`), service worker source (`sw.ts`)
- `components/shell/` — App shell: ControlsBar, SubtitleArea, ActionBar, SettingsPanel, SWUpdatePrompt, SkipToContent, StatusAnnouncer
- `components/onboarding/` — Multi-step onboarding flow (Welcome → MicPermission → PwaInstall)
- `hooks/` — Custom hooks: `useAudioCapture`, `useSettings`, `useOnboarding`
- `lib/audio/` — Audio downsampler (48kHz→16kHz linear interpolation, Float32→Int16)
- `lib/settings/` — Settings types (`BridgetSettings` interface) and defaults
- `lib/pwa/` — PWA utilities (persistent storage request, standalone mode detection)
- `public/audio-processor.js` — AudioWorklet processor (accumulates 2048-sample buffers)
- `__tests__/` — Unit tests; `e2e/` — Playwright E2E tests (smoke, pwa, onboarding, audio-capture, settings)
- Tests can also be co-located: vitest includes `components/**/*.test.*`, `hooks/**/*.test.*`, `lib/**/*.test.*`

### Audio Pipeline

1. `useAudioCapture.start()` → `getUserMedia` (mono, echo cancellation, noise suppression, auto gain)
2. Creates `AudioContext` → loads `AudioWorkletNode` from `/audio-processor.js`
3. AudioWorklet accumulates 2048-sample buffers, posts via `port.postMessage`
4. Main thread receives buffer → `downsample()` (48kHz→16kHz) → `float32ToInt16()` → calls `onAudioChunk(Int16Array)`
5. Wake Lock acquired during capture; released on stop

### State Management

All state is hooks + localStorage — no external state library:
- **useSettings**: Persists to `localStorage("bridget_settings")`, syncs CSS custom properties to `:root`, toggles `.high-contrast` class and `data-reduced-motion` attribute on `<html>`
- **useOnboarding**: Boolean flag in localStorage, gates app until complete
- **useAudioCapture**: State machine (`idle` → `requesting-permission` → `listening`/`paused` → `error`), manages AudioContext/MediaStream/WorkletNode lifecycles

### PWA Configuration

- Manifest at `public/manifest.webmanifest`: standalone, landscape orientation, dark theme
- Service worker compiled from `app/sw.ts` → `public/sw.js` (disabled in dev via env check)
- iOS-specific: apple-mobile-web-app-capable, black-translucent status bar, 180x180 icon
- Graceful feature detection for Wake Lock, Persistent Storage, standalone mode

### Styling Conventions

- CSS custom properties defined in `app/globals.css` (e.g., `--bg-primary`, `--text-subtitle`, `--font-size-subtitle`)
- Settings hook dynamically updates CSS variables on `:root` for live theming
- Touch targets minimum 44px (`--touch-target-min`)
- High-contrast mode: `useSettings` adds `.high-contrast` class to `<html>`; the class overrides CSS variables (text, bg, border, accent) in `globals.css`
- Reduced motion: `useSettings` toggles `data-reduced-motion="true"` attribute on `<html>` (manual setting); `globals.css` also respects `@media (prefers-reduced-motion: reduce)` at the system level
- Focus rings: `button:focus-visible` and `a:focus-visible` both receive a 2px `--accent` outline

### Testing Patterns

- **Vitest** with jsdom, globals enabled, setup file imports `@testing-library/jest-dom`
- Tests use React Testing Library (`renderHook`, `render`, `screen`, `act`)
- Accessibility testing via `jest-axe` (automated axe-core checks in `__tests__/accessibility.test.tsx`)
- ARIA live region tests in `__tests__/live-regions.test.tsx`; touch target tests in `__tests__/touch-targets.test.tsx`
- jsdom doesn't implement `HTMLDialogElement.showModal`/`close` — patch them in `beforeAll` when testing components that use `<dialog>`
- E2E runs WebKit only (iPad target) via Playwright on port 3100
- Audio tests mock `AudioContext`, `getUserMedia`, `AudioWorkletNode`, `navigator.wakeLock`

### WebKit E2E Gotchas

- `context.grantPermissions(['microphone'])` is not supported in Playwright WebKit — mock `navigator.mediaDevices.getUserMedia` via `page.addInitScript()` or `page.evaluate()` instead
- Playwright `page.click()` on a button does **not** reliably trigger React event handlers in WebKit after a `page.evaluate()`-based mock — combine the mock setup and `btn.click()` inside a single `page.evaluate()` call
- `page.getByRole('button', { name: 'Settings' })` can match multiple buttons; use `{ exact: true }` to disambiguate
- `page.getByText('Bridget')` resolves to multiple elements (heading + paragraph); prefer role-based selectors or `.or()` for state-dependent content
