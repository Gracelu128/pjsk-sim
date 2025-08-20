/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.jsdelivr.net' }],
  },
  async rewrites() {
    if (process.env.NODE_ENV === 'production') {
      return [
        // manifest
        {
          source: '/gacha/manifest.json',
          destination:
            'https://cdn.jsdelivr.net/gh/Gracelu128/pjsk-sim@main/my-app/public/gacha/manifest.json',
        },
        // logos
        {
          source: '/gacha/:gid/logo/:file*',
          destination:
            'https://cdn.jsdelivr.net/gh/Gracelu128/pjsk-sim@main/my-app/public/gacha/:gid/logo/:file*',
        },
        // backgrounds & overlays
        {
          source: '/gacha/:gid/screen/texture/:file*',
          destination:
            'https://cdn.jsdelivr.net/gh/Gracelu128/pjsk-sim@main/my-app/public/gacha/:gid/screen/texture/:file*',
        },
        // banners
        {
          source: '/gacha/:gid/banner/:file*',
          destination:
            'https://cdn.jsdelivr.net/gh/Gracelu128/pjsk-sim@main/my-app/public/gacha/:gid/banner/:file*',
        },
      ];
    }
    return [];
  },
};
export default nextConfig;
