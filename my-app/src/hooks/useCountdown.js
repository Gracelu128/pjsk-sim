"use client";

import { useEffect, useState } from "react";

/**
 * Cycles an index from 0..length-1 every `interval` ms.
 * If length <= 1, it stays at 0 and no timer runs.
 */
export default function useCountdown(length, interval = 4000) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!length || length <= 1) {
      setIndex(0);
      return;
    }
    const t = setInterval(() => {
      setIndex(i => (i + 1) % length);
    }, interval);
    return () => clearInterval(t);
  }, [length, interval]);

  return index;
}
