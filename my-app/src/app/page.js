"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";

export default function Home() {
  const [manifest, setManifest] = useState({});

  useEffect(() => {
    fetch("/gacha/manifest.json")
      .then(res => res.json())
      .then(setManifest);
  }, []);

  const gachaIds = Object.keys(manifest);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <h1 style={{ marginBottom: 16 }}>Card Gallery</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 16,
        }}
      >
        {gachaIds.map((id) => {
          const logoPath = `/gacha/gacha_${id}/${manifest[id]?.logo ?? "logo.png"}`;
          return (
            <Link
              key={id}
              href={`/gacha/gacha_${id}`} // URL will be /gacha/gacha_123
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
                  src={logoPath}
                  alt={`${id} logo`}
                  fill
                  unoptimized
                  sizes="160px"
                  style={{ objectFit: "contain" }}
                />
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  textAlign: "center",
                  opacity: 0.9,
                }}
              >
                {`gacha_${id}`}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
