/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },

  /**
   * Proxy /api and Socket.IO to Express when both share the public domain.
   * Set API_INTERNAL_URL in Coolify (e.g. http://server:4000 or http://127.0.0.1:4000).
   * If unset, defaults to localhost:4000 (dev-friendly).
   */
  async rewrites() {
    const backend = (process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000').replace(
      /\/$/,
      ''
    );
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${backend}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
