"use client";

import { useEffect, useState } from "react";

/**
 * Loads an image (client-side) and reports its natural { w, h }.
 * Returns { w:0, h:0 } until loaded or if src is falsy.
 */
export default function useNaturalSize(src) {
  const [nat, setNat] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!src) {
      setNat({ w: 0, h: 0 });
      return;
    }
    if (typeof window === "undefined") return;

    let cancelled = false;
    const img = new window.Image();
    img.decoding = "async";
    img.src = src;

    const onLoad = () => {
      if (!cancelled) {
        setNat({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 });
      }
    };
    const onError = () => {
      if (!cancelled) setNat({ w: 0, h: 0 });
    };

    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);
    return () => {
      cancelled = true;
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };
  }, [src]);

  return nat;
}
