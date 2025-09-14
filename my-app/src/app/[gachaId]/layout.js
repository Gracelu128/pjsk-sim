"use client";

import * as React from "react";
import DisplayGacha from "@/components/DisplayGacha";

export default function GachaLayout({ children, params }) {
  const { gachaId: raw } = React.use(params);
  const id = raw.startsWith("gacha_") ? raw.slice(6) : raw;

  const [manifest, setManifest] = React.useState(null);
  React.useEffect(() => {
    fetch("/gacha/manifest.json").then(r => r.json()).then(setManifest);
  }, []);

  // Render black background immediately to avoid white flash
  if (!manifest) return <div style={{position:'fixed', inset:0, background:'black'}} />;

  return (
    <>
      <DisplayGacha gachaId={id} manifest={manifest} />
      {/* Children (exchange/settings) render as overlays on top of the stage */}
      {children}
    </>
  );
}