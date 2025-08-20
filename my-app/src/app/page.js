"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";

const ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_BASE_URL || "";

export default function Home() {
  const [manifest, setManifest] = useState({});
  const [visible, setVisible] = useState(40); // start with 40
  const loadMoreRef = useRef(null);

  useEffect(() => {
    fetch(`${ASSET_BASE}/gacha/manifest.json` || `/gacha/manifest.json`)
      .then(res => res.json())
      .then(setManifest);
  }, []);

  const gachaIds = useMemo(() => Object.keys(manifest), [manifest]);

  // Infinite scroll: bump visible count when sentinel enters view
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisible(v => Math.min(v + 40, gachaIds.length));
    });
    io.observe(loadMoreRef.current);
    return () => io.disconnect();
  }, [gachaIds.length]);

  return (
    <main style={{ minHeight: "100vh", padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>Card Gallery</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 16,
        }}
      >
        {gachaIds.slice(0, visible).map((id) => {
          const logoFile = manifest[id]?.logo ?? "logo.png";
          // Build remote (or local) path
          const logoPath = ASSET_BASE
            ? `${ASSET_BASE}/gacha/gacha_${id}/${logoFile}`
            : `/gacha/gacha_${id}/${logoFile}`;

          return (
            <Link
              key={id}
              href={`/gacha/gacha_${id}`}
              prefetch={false} // keep the network focused on what user sees
              style={{
                display: "block",
                border: "1px solid #e2e2e2",
                borderRadius: 12,
                padding: 12,
                background: "white",
                textDecoration: "none",
                color: "inherit",
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
                  // Explicit small intrinsic size → smaller downloads
                  width={160}
                  height={160}
                  sizes="(max-width: 768px) 33vw, (max-width: 1200px) 20vw, 160px"
                  // no priority → lazy by default
                />
              </div>
              <div style={{ marginTop: 8, fontSize: 14, textAlign: "center" }}>
                {`gacha_${id}`}
              </div>
            </Link>
          );
        })}
      </div>

      {/* sentinel to trigger more loading */}
      {visible < gachaIds.length && (
        <div ref={loadMoreRef} style={{ height: 48 }} />
      )}
    </main>
  );
}
