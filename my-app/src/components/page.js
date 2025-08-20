"use client";

import { useEffect, useState } from "react";
import DisplayGacha from "@/components/DisplayGacha";

export default function GachaPage({ params }) {
  // params.gachaId will be like "gacha_123"
  const { gachaId } = params;
  const id = gachaId.replace(/^gacha_/, ""); // strip prefix for manifest lookup if needed

  const [manifest, setManifest] = useState({});

  useEffect(() => {
    fetch("/gacha/manifest.json")
      .then(res => res.json())
      .then(setManifest);
  }, []);

  if (!gachaId) return null;

  return <DisplayGacha gachaId={id} manifest={manifest} />;
}
