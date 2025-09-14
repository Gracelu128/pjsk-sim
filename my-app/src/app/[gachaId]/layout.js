"use client";

import * as React from "react";
import DisplayGacha from "@/components/DisplayGacha";

export default function GachaLayout({ children, params }) {
  const { gachaId: raw } = React.use(params);
  const id = raw.startsWith("gacha_") ? raw.slice(6) : raw;

  const [manifest, setManifest] = React.useState(null);
  const [gachaMeta, setGachaMeta] = React.useState(null);
  React.useEffect(() => {
    fetch("/gacha/manifest.json").then(r => r.json()).then(setManifest);
  }, []);

  React.useEffect(() => {
    // Dynamically import the individual gacha metadata for this id
    import(`@/data/individual_gacha_metadata/gacha_${id}.json`)
      .then(module => setGachaMeta(module.default))
      .catch(() => setGachaMeta(null));
  }, [id]);

  // Render black background immediately to avoid white flash
  if (!manifest) return <div style={{position:'fixed', inset:0, background:'black'}} />;

  return (
    <>
      <DisplayGacha gachaId={id} manifest={manifest} gachaMeta={gachaMeta} />
      {/* Children (exchange/settings) render as overlays on top of the stage */}
      {children}
    </>
  );
}