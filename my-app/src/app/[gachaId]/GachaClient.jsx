// my-app/src/app/[gachaId]/GachaClient.jsx
"use client";

import { useEffect, useState } from "react";
import DisplayGacha from "@/components/DisplayGacha";
import NormalTenPull from "@/components/NormalTenPull";

export default function GachaClient({ id }) {
  const [manifest, setManifest] = useState(null);
  const [gachaMeta, setGachaMeta] = useState(null);
  const [showResults, setShowResults] = useState(false); // <-- switcher

  useEffect(() => {
    fetch("/gacha/manifest.json")
      .then((r) => r.json())
      .then((data) => setManifest(sanitizeManifest(data)))
      .catch(() => setManifest({}));
  }, []);

  useEffect(() => {
    // Dynamically import the individual gacha metadata for this id
    import(`@/data/individual_gacha_metadata/gacha_${id}.json`)
      .then(module => setGachaMeta(module.default))
      .catch(() => setGachaMeta(null));
  }, [id]);

  if (!manifest) return null;
  if (!manifest[id]) return <main style={{ padding: 24 }}>Not found: {id}</main>;
  if (!gachaMeta) return <main style={{padding:24}}>Metadata not found for: {id}</main>;

  // When showResults is true, render the results screen instead of DisplayGacha
  if (showResults) {
    return (
      <NormalTenPull
        gachaId={id}
        autoRoll={true}                 // roll once on mount
        onOk={() => setShowResults(false)}  // OK returns to DisplayGacha
        onRollStart={() => {/* mp4/sfx hook */}}
        onRollComplete={() => {/* optional */}}
      />
    );
  }

  return (
    <DisplayGacha
      gachaId={id}
      manifest={manifest}
      onNormalTenPull={() => setShowResults(true)}  // <-- wire 10-pull button
    />
  );
}

function sanitizeManifest(m) {
  const out = {};
  for (const [id, e] of Object.entries(m || {})) {
    out[id] = {
      logo: typeof e.logo === "string" && /\.[a-z0-9]{2,5}$/i.test(e.logo) ? e.logo : null,
      bg: Array.isArray(e.bg) ? e.bg.filter((f) => /\.[a-z0-9]{2,5}$/i.test(f)) : [],
      img: Array.isArray(e.img) ? e.img.filter((f) => /\.[a-z0-9]{2,5}$/i.test(f)) : [],
      banner: Array.isArray(e.banner) ? e.banner.filter((f) => /\.[a-z0-9]{2,5}$/i.test(f)) : [],
      "end date": typeof e["end date"] === "string" ? e["end date"] : null,
    };
  }
  return out;
}