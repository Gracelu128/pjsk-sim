"use client";

import * as React from "react";
import Link from "next/link";
import DisplayGacha from "@/components/DisplayGacha";

export default function SettingsPage({ params }) {
  const { gachaId: raw } = React.use(params);
  const gachaId = raw.startsWith("gacha_") ? raw.slice(6) : raw;

  const [manifest, setManifest] = React.useState(null);
  React.useEffect(() => {
    fetch("/gacha/manifest.json").then(r => r.json()).then(setManifest);
  }, []);

  if (!manifest) return null;

  return (
    <>
      <DisplayGacha gachaId={gachaId} manifest={manifest} />
      {/* Overlay panel */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
        }}
      >
        <div
          style={{
            width: "min(720px, 92vw)",
            maxHeight: "80vh",
            overflow: "auto",
            background: "rgba(20,20,24,0.95)",
            border: "1px solid #333",
            borderRadius: 16,
            padding: 20,
            color: "white",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Settings</h2>
            <Link href={`/gacha_${gachaId}`} prefetch={false} style={{ color: "#ccc", textDecoration: "none" }}>
              Close
            </Link>
          </div>

          {/* TODO: put your settings UI here */}
          <p style={{ opacity: 0.9 }}>
            Settings for <code>gacha_{gachaId}</code>.
          </p>
        </div>
      </div>
    </>
  );
}
