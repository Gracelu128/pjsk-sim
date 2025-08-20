/*
next.config.mjs
this file is used to configure the Next.js application.
right now, it is used to set up image optimization and URL rewrites 
for serving gacha assets from a CDN in production.
due to cdn limitations, we need to explicitly allowlist the domain for remote images.
meaning:
manifest.json, 
logos, 
textures (backgrounds and overlays)
and banners 
will be explicitly listed as served from the CDN.
if needed to serve more assets later, just add more rules here.
*/

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
        // shared UI assets
        {
          source: '/UI/:file*',
          destination: 'https://cdn.jsdelivr.net/gh/Gracelu128/pjsk-sim@main/my-app/public/UI/:file*',
        },
      ];
    }
    return [];
  },
};
export default nextConfig;
