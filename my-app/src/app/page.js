"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { logoPath } from "@/utils/assetPaths";
import gachaMeta from "@/data/gacha_metadata.json"; // ✅ static import

function sanitizeManifest(m) {
  const out = {};
  for (const [id, e] of Object.entries(m || {})) {
    out[id] = {
      logo: typeof e.logo === "string" && /\.[a-z0-9]{2,5}$/i.test(e.logo) ? e.logo : null,
      bg: Array.isArray(e.bg) ? e.bg.filter(f => /\.[a-z0-9]{2,5}$/i.test(f)) : [],
      img: Array.isArray(e.img) ? e.img.filter(f => /\.[a-z0-9]{2,5}$/i.test(f)) : [],
      banner: Array.isArray(e.banner) ? e.banner.filter(f => /\.[a-z0-9]{2,5}$/i.test(f)) : [],
    };
  }
  return out;
}

export default function Home() {
  const [manifest, setManifest] = useState({});

  useEffect(() => {
    fetch("/gacha/manifest.json")
      .then(res => res.json())
      .then(data => setManifest(sanitizeManifest(data)));
  }, []);

  const gachaIds = Object.keys(manifest);

  return (
    <main style={{ minHeight: "100vh", padding: "24px", boxSizing: "border-box" }}>
      <h1 style={{ marginBottom: 16 }}>Card Gallery</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 16,
        }}
      >
        {gachaIds.map((id) => {
          const entry = manifest[id];
          const src = logoPath(id, entry);
          if (!src) return null;

          // title key has spaces/parentheses → bracket syntax
          const meta = gachaMeta?.[id];
          const titleJP = meta?.["title (japanese)"] || ""; // fallback below

          return (
            <Link
              key={id}
              href={`/gacha_${id}`}
              prefetch={false}
              style={{
                display: "block",
                border: "1px solid #e2e2e2",
                borderRadius: 12,
                padding: 12,
                textDecoration: "none",
                color: "inherit",
                background: "white",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "1 / 1",
                  overflow: "hidden",
                  borderRadius: 8,
                  background: "#f6f6f6",
                }}
              >
                <NextImage
                  src={src}
                  alt={`${id} logo`}
                  fill
                  sizes="160px"
                  style={{ objectFit: "contain" }}
                />
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  lineHeight: 1.2,
                  textAlign: "center",
                  opacity: 0.95,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,      // clamp long titles to 2 lines
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
                title={titleJP || `gacha_${id}`} // tooltip fallback
              >
                {titleJP || `gacha_${id}`}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}