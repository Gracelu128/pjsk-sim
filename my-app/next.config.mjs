/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow remote images from your CDN host(s)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.jsdelivr.net' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com' }, // if you prefer raw
    ],
  },

  async rewrites() {
    // In production (Vercel), rewrite /gacha/* to CDN; in dev, keep local files
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/gacha/:path*',
          destination: 'https://cdn.jsdelivr.net/gh/<USER>/<REPO>@<TAG_OR_COMMIT>/gacha/:path*',
        },
      ];
    }
    return [];
  },
};
export default nextConfig;
