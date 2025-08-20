"use client";

import { useEffect, useState } from "react";
import DisplayGacha from "@/components/DisplayGacha";

export default function GachaClient({ id }) {
  const [manifest, setManifest] = useState(null);

  useEffect(() => {
    fetch("/gacha/manifest.json")
      .then(r => r.json())
      .then(setManifest)
      .catch(() => setManifest({}));
  }, []);

  if (!manifest) return null;
  if (!manifest[id]) return <main style={{padding:24}}>Not found: {id}</main>;

  return <DisplayGacha gachaId={id} manifest={manifest} />;
}
