# Project Sekai Gacha Simulator (Unofficial)

Credits to data and image assets from [sekai.best](https://sekai.best) and [sekaipedia.org](https://sekaipedia.org).

------

## Directory Structure

```plaintext
pjsk-sim/
├── asset_scraper.py              # Script for scraping/downloading assets
├── Icon/                         # App icons / branding assets
├── my-app/
│   ├── public/                   # Static assets served directly
│   │   ├── card_audio/           # Card voice/audio files
│   │   ├── cards/                # Card images
│   │   ├── costumes/             # Costume images
│   │   ├── gacha/                # Gacha images & manifest
│   │   └── icons/                # Character icons
│   │
│   ├── src/                      # Source code (main project logic)
│   │   ├── app/                  # Next.js app router pages
│   │   │   ├── gacha/gachaId/
│   │   │   │       ├── page.js
│   │   │   │       └── GachaClient.jsx
│   │   │   ├── layout.js
│   │   │   ├── page.js
│   │   │   └── style.css
│   │   ├── components/           # React components (UI building blocks)
│   │   │   ├── page.js
│   │   │   └── DisplayGacha.jsx
│   │   ├── data/                 # Game metadata (JSON files)
│   │   ├── hooks/                # Custom React hooks
│   │   └── utils/                # Helper utilities (e.g. assetPaths)
│   │
│   ├── package.json              # Dependencies
│   ├── next.config.mjs           # Next.js configuration
│   └── README.md                 # Project readme


In Next.js, any file in /public/ is automatically served as a static asset.
So an image at public/cards/001.webp is available at:

http://localhost:3000/cards/001.webp
