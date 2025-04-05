/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ← esto le dice a Vercel que ignore ESLint en producción
  },
};

module.exports = nextConfig;
