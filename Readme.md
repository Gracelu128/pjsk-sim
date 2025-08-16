# Project Sekai Gacha Simulator (Unofficial)

Credits to data and image assets from [sekai.best](https://sekai.best) and [sekaipedia.org](https://sekaipedia.org).

------

## Directory Structure

```plaintext
my-app/
├── .next/
├── node_modules/
├── README.md
├── public/
│   ├── card_audio/
│   ├── cards/
│   ├── costumes/
│   ├── gacha/
│   ├── icons/
├── src/
│   ├── app/
│   │   ├── layout.js
│   │   ├── page.js
│   │   ├── style.css
│   ├── data/
│   │   ├── individual_card_metadata/
│   │   ├── individual_gacha_metadata/
│   │   ├── card_metadata.json
│   │   ├── gacha_metadata.json
│   │   ├── gacha_rates.json
asset_scraper.py

In Next.js, any file in /public/ is automatically served as a static asset.
So an image at public/cards/001.webp is available at:

http://localhost:3000/cards/001.webp
