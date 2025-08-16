"use client";

import { useState } from "react";
import Image from "next/image";
import cardData from "@/data/card_metadata.json";

function display_gacha(gachaId) {
  const bgSrc = `/gacha/gacha_${gachaId}/screen/texture/bg_gacha${gachaId}.webp`;
  const logoSrc = `/gacha/gacha_${gachaId}/logo/logo.webp`;

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <Image
        src={bgSrc}
        alt={`Gacha ${gachaId} Background`}
        unoptimized
        width={0}
        height={0}
        sizes="100vw"
        style={{ width: "100%", height: "auto" }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "3%",
          right: "3%",
          width: "10vw",
          minWidth: "120px",
          maxWidth: "200px",
        }}
      >
        <Image
          src={logoSrc}
          alt={`Gacha ${gachaId} Logo`}
          unoptimized
          width={0}
          height={0}
          sizes="10vw"
          style={{ width: "100%", height: "auto" }}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const [gachaIdInput, setGachaIdInput] = useState(377);
  const [gachaId, setGachaId] = useState(377);

  const gachaIds = [377, 378, 379, 380, 381, 382]; // Add more as needed

  return (
    <main className="mainBody">
      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 10 }}>
        <label htmlFor="gacha-select" style={{ marginRight: 8 }}>Select Gacha ID:</label>
        <select
          id="gacha-select"
          value={gachaIdInput}
          onChange={e => setGachaIdInput(Number(e.target.value))}
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
      {display_gacha(gachaId)}
    </main>
  );
}