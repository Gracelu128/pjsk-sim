# Project Sekai Gacha Simulator (Unofficial)

Credits to data and image assets from [sekai.best](https://sekai.best) and [sekaipedia.org](https://sekaipedia.org).

------

## Directory Structure

```plaintext
my-app/
├── public/
│   ├── cards/      # put card images here
│   ├── icons/      # put icons here
├── src/
│   ├── data/
│   │   └── card_metadata.json
│   └── app/page.js  # (default Next.js page)
asset_scraper.py

In Next.js, any file in /public/ is automatically served as a static asset.
So an image at public/cards/001.webp is available at:

http://localhost:3000/cards/001.webp