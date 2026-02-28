# Bridget

Real-time subtitles for face-to-face conversations. A Progressive Web App built for iPad.

## Status

PWA foundation complete: audio capture pipeline, three-zone layout, settings persistence, onboarding flow, WCAG 2.1 AA accessibility, E2E test suite, and Vercel deployment configuration. Speech-to-text integration is the next milestone.

## Development

```bash
npm run dev        # Start dev server
npm test           # Run unit tests (Vitest)
npm run test:e2e   # Run E2E tests (Playwright/WebKit)
npm run build      # Static export to out/
```

**Important:** Microphone access requires a secure context. Make sure to access the dev server at `http://localhost:3000` (not `127.0.0.1` or `0.0.0.0`), as Chrome only treats the literal `localhost` hostname as secure.

## Tech Stack

- Next.js (App Router, static export)
- TypeScript (strict mode)
- CSS custom properties (no framework)
- Serwist (service worker / PWA)
- Vitest + React Testing Library (unit tests)
- Playwright with WebKit (E2E tests)

## iPad Testing

### Option 1: Vercel Preview Deploys (Recommended)

1. Connect the GitHub repo to Vercel
2. Every push to a branch creates an HTTPS preview URL
3. Open the preview URL on iPad Safari
4. Test getUserMedia, standalone install, Wake Lock

### Option 2: Local Tunnel

```bash
npx cloudflared tunnel --url http://localhost:3000
```

Gets an HTTPS URL accessible from iPad on the same network. Useful for rapid iteration without pushing.

### Option 3: Local HTTPS (Advanced)

1. Generate a self-signed certificate
2. Trust on iPad via profile install
3. Access local dev server over LAN

**Note:** getUserMedia requires a secure context (HTTPS or localhost). Options 1 and 2 provide this automatically.
