/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

// Repo donde se publica en GitHub Pages. Cambia NEXT_PUBLIC_BASE_PATH en CI
// si tu repo tiene otro nombre.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || (isProd ? "/video-to-prompt" : "");

const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false };
    return config;
  },
};

module.exports = nextConfig;