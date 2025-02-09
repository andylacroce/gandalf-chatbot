/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true, // Enable SWC minification
  experimental: {
    swcLoader: true, // Enable SWC loader
  },
};

module.exports = nextConfig;
