"use client";

import { useEffect, useState } from "react";
import DisplayGacha from "@/components/DisplayGacha";

export default function GachaClient({ id }) {
  const [manifest, setManifest] = useState(null);

  useEffect(() => {
    fetch("/gacha/manifest.json")
      .then(r => r.json())
      .then(data => setManifest(sanitizeManifest(data)))
      .catch(() => setManifest({}));
  }, []);

  if (!manifest) return null;
  if (!manifest[id]) return <main style={{padding:24}}>Not found: {id}</main>;

  return <DisplayGacha gachaId={id} manifest={manifest} />;
}

function sanitizeManifest(m) {
  const out = {};
  for (const [id, e] of Object.entries(m || {})) {
    out[id] = {
      logo: typeof e.logo === "string" && /\.[a-z0-9]{2,5}$/i.test(e.logo) ? e.logo : null,
      bg: Array.isArray(e.bg) ? e.bg.filter(f => /\.[a-z0-9]{2,5}$/i.test(f)) : [],
      img: Array.isArray(e.img) ? e.img.filter(f => /\.[a-z0-9]{2,5}$/i.test(f)) : [],
      banner: Array.isArray(e.banner) ? e.banner.filter(f => /\.[a-z0-9]{2,5}$/i.test(f)) : [],
    };
  }
  return out;
}
