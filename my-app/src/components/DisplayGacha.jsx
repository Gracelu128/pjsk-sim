"use client";

import { useMemo } from "react";
import NextImage from "next/image";
import useCountdown from "@/hooks/useCountdown";
import useWindowSize from "@/hooks/useWindowSize";
import useNaturalSize from "@/hooks/useNaturalSize";

const ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_BASE_URL || "";

function asset(path) {
  return ASSET_BASE ? `${ASSET_BASE}${path}` : path;
}

export default function DisplayGacha({ gachaId, manifest }) {
  const assets = manifest[gachaId] || {};
  const bgIndex = useCountdown(assets.bg?.length || 0, 4000);
  const imgIndex = useCountdown(assets.img?.length || 0, 4000);
  const { width: vw, height: vh } = useWindowSize();

  if (!assets.bg && !assets.img && !assets.logo && !assets.banner) {
    return <div style={{ padding: 16 }}>No assets found for this gacha.</div>;
  }

  const bgSrc =
    assets.bg?.length
      ? asset(`/gacha/gacha_${gachaId}/screen/texture/${assets.bg[bgIndex]}`)
      : null;

  const { w: natW, h: natH } = useNaturalSize(bgSrc);

  const { stageW, stageH } = useMemo(() => {
    if (!natW || !natH || !vw || !vh) return { stageW: 0, stageH: 0 };
    const scale = Math.min(vw / natW, vh / natH);
    return { stageW: Math.floor(natW * scale), stageH: Math.floor(natH * scale) };
  }, [natW, natH, vw, vh]);

  const ready = !!bgSrc && stageW > 0 && stageH > 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "black", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {ready && (
        <div style={{ position: "relative", width: stageW, height: stageH, overflow: "hidden" }}>
          {/* Background (give priority so it shows asap) */}
          {bgSrc && (
            <NextImage
              src={bgSrc}
              alt={`Gacha ${gachaId} Background`}
              fill
              priority
              style={{ objectFit: "contain" }}
              sizes={`${stageW}px`}
            />
          )}

          {/* Overlay (lazy) */}
          {assets.img?.length > 0 && (
            <NextImage
              src={asset(`/gacha/gacha_${gachaId}/screen/texture/${assets.img[imgIndex]}`)}
              alt={`Gacha ${gachaId} Overlay`}
              fill
              style={{ objectFit: "contain", pointerEvents: "none" }}
              sizes={`${stageW}px`}
            />
          )}

          {/* Logo (lazy, smaller target size) */}
          {assets.logo && (
            <div style={{ position: "absolute", right: "3%", bottom: "3%", width: Math.max(stageW * 0.12, 120), maxWidth: 240 }}>
              <NextImage
                src={asset(`/gacha/gacha_${gachaId}/${assets.logo}`)}
                alt={`Gacha ${gachaId} Logo`}
                width={800}
                height={400}
                style={{ width: "100%", height: "auto", display: "block" }}
                sizes="(max-width: 768px) 25vw, 240px"
              />
            </div>
          )}

          {/* Banner (lazy, capped width) */}
          {assets.banner?.length > 0 && (
            <div style={{ position: "absolute", top: "5%", right: "3%", width: Math.min(stageW * 0.4, 380), zIndex: 5 }}>
              <NextImage
                src={asset(`/gacha/gacha_${gachaId}/banner/${assets.banner[0]}`)}
                alt={`Gacha ${gachaId} Banner`}
                width={1000}
                height={500}
                style={{ width: "100%", height: "auto", display: "block" }}
                sizes="(max-width: 768px) 40vw, 380px"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
