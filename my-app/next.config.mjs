/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.jsdelivr.net' },
    ],
  },
  async rewrites() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/gacha/:path*',
          destination:
            'https://cdn.jsdelivr.net/gh/Gracelu128/pjsk-sim@main/my-app/public/gacha/:path*',
        },
      ];
    }
    return [];
  },
};
export default nextConfig;
