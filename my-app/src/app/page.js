"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NextImage from "next/image";

// Cycles through an array length at a fixed interval
function useCountdown(length, interval = 4000) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (length <= 1) return;
    const t = setInterval(() => setIndex(i => (i + 1) % length), interval);
    return () => clearInterval(t);
  }, [length, interval]);
  return index;
}

// Window size
function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const onResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

// Get a background image's natural size (w,h) when it first loads
function useNaturalSize(src) {
  const [nat, setNat] = useState({ w: 0, h: 0 });
  // We trigger a load via a hidden <img> tag to get natural size
  useEffect(() => {
    if (!src) return;
    if (typeof window === "undefined") return; // SSR guard
    const img = new window.Image();
    img.src = src;
    const onLoad = () => setNat({ w: img.naturalWidth, h: img.naturalHeight });
    img.addEventListener("load", onLoad);
    return () => img.removeEventListener("load", onLoad);
  }, [src]);
  return nat;
}

function DisplayGacha({ gachaId, manifest }) {
  const assets = manifest[gachaId] || {};
  const bgIndex = useCountdown(assets.bg?.length || 0);
  const imgIndex = useCountdown(assets.img?.length || 0);
  const { width: vw, height: vh } = useWindowSize();

  // Early return if nothing to show
  if (!assets.bg && !assets.img && !assets.logo && !assets.banner) {
    return <div style={{ padding: 16 }}>No assets found for this gacha.</div>;
  }

  // Pick the current bg src (required to size the stage)
  const bgSrc =
    assets.bg && assets.bg.length > 0
      ? `/gacha/gacha_${gachaId}/screen/texture/${assets.bg[bgIndex]}`
      : null;

  // Natural size of the background image
  const { w: natW, h: natH } = useNaturalSize(bgSrc);

  // Compute stage size that "contains" the bg in the viewport
  const { stageW, stageH } = useMemo(() => {
    if (!natW || !natH || !vw || !vh) return { stageW: 0, stageH: 0 };
    const scale = Math.min(vw / natW, vh / natH);
    return { stageW: Math.floor(natW * scale), stageH: Math.floor(natH * scale) };
  }, [natW, natH, vw, vh]);

  // Until we know sizes, avoid rendering to prevent flash
  const ready = !!bgSrc && stageW > 0 && stageH > 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "black", // letterbox bars
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {ready && (
        <div
          // THE STAGE: exact displayed bounds of the background image
          style={{
            position: "relative",
            width: stageW,
            height: stageH,
            overflow: "hidden", // clip children to bg bounds
            borderRadius: 8, // optional
          }}
        >
          {/* Background layer fills the stage */}
          {bgSrc && (
            <NextImage
              src={bgSrc}
              alt={`Gacha ${gachaId} Background`}
              fill
              unoptimized
              priority
              style={{ objectFit: "contain" }}
              sizes={`${stageW}px`}
            />
          )}

          {/* Overlay image layer (same bounds, sits on top of bg) */}
          {assets.img && assets.img.length > 0 && (
            <NextImage
              src={`/gacha/gacha_${gachaId}/screen/texture/${assets.img[imgIndex]}`}
              alt={`Gacha ${gachaId} Overlay`}
              fill
              unoptimized
              style={{
                objectFit: "contain",
                pointerEvents: "none",
              }}
              sizes={`${stageW}px`}
            />
          )}

          {/* Logo (anchored inside stage, clipped if necessary) */}
          {assets.logo && (
            <div
              style={{
                position: "absolute",
                right: "3%",
                bottom: "3%",
                width: Math.max(stageW * 0.12, 120), // 12% of stage width, min 120px
                maxWidth: 240,
              }}
            >
              <NextImage
                src={`/gacha/gacha_${gachaId}/${assets.logo}`}
                alt={`Gacha ${gachaId} Logo`}
                width={800}
                height={400}
                unoptimized
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          )}

          {/* Banner (first banner) */}
          {assets.banner && assets.banner.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "5%",
                right: "3%",
                width: Math.min(stageW * 0.4, 380), // up to 40% of stage width
                zIndex: 5,
              }}
            >
              <NextImage
                src={`/gacha/gacha_${gachaId}/banner/${assets.banner[0]}`}
                alt={`Gacha ${gachaId} Banner`}
                width={1000}
                height={500}
                unoptimized
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [manifest, setManifest] = useState({});
  const [gachaIdInput, setGachaIdInput] = useState("");
  const [gachaId, setGachaId] = useState("");

  useEffect(() => {
    fetch("/gacha/manifest.json")
      .then(res => res.json())
      .then(data => {
        setManifest(data);
        const firstId = Object.keys(data)[0] || "";
        setGachaIdInput(firstId);
        setGachaId(firstId);
      });
  }, []);

  const gachaIds = Object.keys(manifest);

  return (
    <main>
      {/* Simple control panel pinned to viewport */}
      <div
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 100,
          background: "rgba(0,0,0,0.6)",
          color: "white",
          padding: "8px 12px",
          borderRadius: 8,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <label htmlFor="gacha-select">Gacha ID:</label>
        <select
          id="gacha-select"
          value={gachaIdInput}
          onChange={e => setGachaIdInput(e.target.value)}
          style={{ color: "black" }}
        >
          {gachaIds.map(id => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <button
          onClick={() => setGachaId(gachaIdInput)}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #999",
            background: "white",
            color: "black",
            cursor: "pointer",
          }}
        >
          Load
        </button>
      </div>

      {gachaId && <DisplayGacha gachaId={gachaId} manifest={manifest} />}
    </main>
  );
}
