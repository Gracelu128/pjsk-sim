"use client";

import { useEffect, useState } from "react";

/**
 * Returns { width, height } of the window.
 * Initializes to 0 on server, updates on mount/resize.
 */
export default function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function onResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    onResize(); // set initial size
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return size;
}
