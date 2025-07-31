# Project Sekai Gacha Simulator (Unofficial)

Credits to data and image assets from [sekai.best](https://sekai.best) and [sekaipedia.org](https://sekaipedia.org).

------

## Directory Structure

```plaintext
src/
├── assets/                # Static assets used in the app
│   ├── cards/             # Card images (.webp), both trained and untrained
│   └── icons/             # Card icons (.webp), including thumbnails and full-size
├── components/            # Reusable UI components (React or JSX)
├── data/                  # Fetched static data files (JSON, CSV, etc.)
│   └── card_metadata.json # Maps card IDs to metadata and display info
├── logic/                 # Utility functions and business logic
├── style/                 # Global/shared stylesheets (.css)
└── pages/                 # Full page components (e.g., home, result, simulator)
