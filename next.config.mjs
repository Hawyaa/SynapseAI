import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    maximumFileSizeToCacheInBytes: 25 * 1024 * 1024, // 25MB, to cover large JS/wasm bundles
    // Cache-first for the model shards / wasm runtime WebLLM downloads,
    // so a refresh never has to re-fetch them.
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.(wasm|bin|json)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "webllm-model-cache",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /^https?.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "offline-fallback-cache",
          networkTimeoutSeconds: 5,
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: "javascript/auto",
    });
    return config;
  },
};

export default withPWA(nextConfig);