"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

function useCountdown(length, interval = 3000) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (length <= 1) return;
    const timer = setInterval(() => {
      setIndex(i => (i + 1) % length);
    }, interval);
    return () => clearInterval(timer);
  }, [length, interval]);
  return index;
}

function DisplayGacha({ gachaId, manifest }) {
  const assets = manifest[gachaId] || {};
  // Always call hooks, even if arrays are empty
  const bgIndex = useCountdown(assets.bg?.length || 0);
  const imgIndex = useCountdown(assets.img?.length || 0);

  // Early return if no assets
  if (!assets.bg && !assets.img && !assets.logo && !assets.banner) {
    return <div>No assets found for this gacha.</div>;
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      {/* Backgrounds */}
      {assets.bg && assets.bg.length > 0 && (
        <Image
          src={`/gacha/gacha_${gachaId}/screen/texture/${assets.bg[bgIndex]}`}
          alt={`Gacha ${gachaId} Background`}
          unoptimized
          width={0}
          height={0}
          sizes="100vw"
          style={{ width: "auto", height: "100%" }}
        />
      )}
      {/* Overlays */}
      {assets.img && assets.img.length > 0 && (
        <Image
          src={`/gacha/gacha_${gachaId}/screen/texture/${assets.img[imgIndex]}`}
          alt={`Gacha ${gachaId} Overlay`}
          unoptimized
          width={0}
          height={0}
          sizes="100vw"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "auto",
            height: "100%",
            pointerEvents: "none",
          }}
        />
      )}
      {/* Logo */}
      {assets.logo && (
        <div
          style={{
            position: "absolute",
            bottom: "20%",
            left: "13%",
            width: "10vw",
            minWidth: "400px",
            maxWidth: "500px",
          }}
        >
          <Image
            src={`/gacha/gacha_${gachaId}/${assets.logo}`}
            alt={`Gacha ${gachaId} Logo`}
            unoptimized
            width={0}
            height={0}
            sizes="10vw"
            style={{ width: "100%", height: "auto" }}
          />
        </div>
      )}
      {/* Banner (show first banner if exists) */}
      {assets.banner && assets.banner.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "5%",
            right: "2%",
            width: "40vw",
            minWidth: "100px",
            maxWidth: "200px",
            zIndex: 5,
          }}
        >
          <Image
            src={`/gacha/gacha_${gachaId}/banner/${assets.banner[0]}`}
            alt={`Gacha ${gachaId} Banner`}
            unoptimized
            width={0}
            height={0}
            sizes="40vw"
            style={{ width: "100%", height: "auto" }}
          />
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
        // Set default gachaId to first available
        const firstId = Object.keys(data)[0] || "";
        setGachaIdInput(firstId);
        setGachaId(firstId);
      });
  }, []);

  const gachaIds = Object.keys(manifest);

  return (
    <main className="mainBody">
      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 10 }}>
        <label htmlFor="gacha-select" style={{ marginRight: 8 }}>Select Gacha ID:</label>
        <select
          id="gacha-select"
          value={gachaIdInput}
          onChange={e => setGachaIdInput(e.target.value)}
        >
          {gachaIds.map(id => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
        <button
          style={{ marginLeft: 8, padding: "4px 12px" }}
          onClick={() => setGachaId(gachaIdInput)}
        >
          Load Gacha
        </button>
      </div>
      {gachaId && <DisplayGacha gachaId={gachaId} manifest={manifest} />}
    </main>
  );
}