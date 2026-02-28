import withSerwist from '@serwist/next';
import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
  output: 'export',
  turbopack: {},
  // In dev, onnxruntime-web does a runtime dynamic import() with
  // /* webpackIgnore: true */, so the browser resolves the .mjs file
  // relative to the Turbopack chunk URL (/_next/static/chunks/).
  // beforeFiles rewrites intercept these requests before Turbopack
  // returns 404, redirecting them to the copies in public/.
  // Rewrites aren't supported with output:'export' during build,
  // so we only add them in dev.
  ...(isDev
    ? {
        async rewrites() {
          return {
            beforeFiles: [
              {
                source: '/_next/static/chunks/:path(ort-wasm-simd-threaded\\..+)',
                destination: '/:path',
              },
            ],
            afterFiles: [],
            fallback: [],
          };
        },
      }
    : {}),
};

export default withSerwist({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV !== 'production',
})(nextConfig);
