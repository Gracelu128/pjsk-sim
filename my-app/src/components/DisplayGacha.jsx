// src/components/DisplayGacha.jsx
"use client";

import { useMemo } from "react";
import NextImage from "next/image";
import useCountdown from "@/hooks/useCountdown";
import useWindowSize from "@/hooks/useWindowSize";
import useNaturalSize from "@/hooks/useNaturalSize";
import { bgPath, overlayPath, logoPath, bannerPath } from "@/utils/assetPaths";

export default function DisplayGacha({ gachaId, manifest }) {
  const entry = manifest?.[gachaId] || {};

  // Cycle indices (only matter if arrays have length)
  const bgLen = Array.isArray(entry.bg) ? entry.bg.length : 0;
  const imgLen = Array.isArray(entry.img) ? entry.img.length : 0;
  const bgIndex = useCountdown(bgLen, 4000);
  const imgIndex = useCountdown(imgLen, 4000);

  // Build safe URLs (null if not present / invalid)
  const bgSrc = bgPath(gachaId, entry, bgIndex);
  const overlaySrc = overlayPath(gachaId, entry, imgIndex);
  const logoSrc = logoPath(gachaId, entry);
  const bannerSrc = bannerPath(gachaId, entry, 0);

  const { width: vw, height: vh } = useWindowSize();

  // If we have a background, use its natural size to compute stage; else fall back to viewport
  const { w: natW, h: natH } = useNaturalSize(bgSrc || "");
  const { stageW, stageH } = useMemo(() => {
    if (bgSrc && natW && natH && vw && vh) {
      const scale = Math.min(vw / natW, vh / natH);
      return { stageW: Math.floor(natW * scale), stageH: Math.floor(natH * scale) };
    }
    // Fallback stage to viewport if no bg (or not yet measured)
    return { stageW: Math.max(0, vw), stageH: Math.max(0, vh) };
  }, [bgSrc, natW, natH, vw, vh]);

  const ready = stageW > 0 && stageH > 0;

  // If literally nothing to show, render a small note
  if (!bgSrc && !overlaySrc && !logoSrc && !bannerSrc) {
    return <div style={{ padding: 16, color: "#bbb" }}>No assets found for this gacha.</div>;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "black",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {ready && (
        <div
          // THE STAGE: everything inside is clipped to these bounds
          style={{
            position: "relative",
            width: stageW,
            height: stageH,
            overflow: "hidden",
          }}
        >
          {/* Background (only if present) */}
          {bgSrc && (
            <NextImage
              src={bgSrc}
              alt={`Gacha ${gachaId} Background`}
              fill
              priority
              sizes={`${stageW}px`}
              style={{ objectFit: "contain" }}
            />
          )}

          {/* Overlay (only if present) */}
          {overlaySrc && (
            <NextImage
              src={overlaySrc}
              alt={`Gacha ${gachaId} Overlay`}
              fill
              sizes={`${stageW}px`}
              style={{ objectFit: "contain", pointerEvents: "none" }}
            />
          )}

          {/* Logo (only if present) */}
          {logoSrc && (
            <div
              style={{
                position: "absolute",
                right: "3%",
                bottom: "3%",
                width: Math.max(stageW * 0.12, 120),
                maxWidth: 240,
              }}
            >
              <NextImage
                src={logoSrc}
                alt={`Gacha ${gachaId} Logo`}
                width={800}
                height={400}
                sizes="240px"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          )}

          {/* Banner (only if present) */}
          {bannerSrc && (
            <div
              style={{
                position: "absolute",
                top: "5%",
                right: "3%",
                width: Math.min(stageW * 0.4, 380),
                zIndex: 5,
              }}
            >
              <NextImage
                src={bannerSrc}
                alt={`Gacha ${gachaId} Banner`}
                width={1000}
                height={500}
                sizes="380px"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
