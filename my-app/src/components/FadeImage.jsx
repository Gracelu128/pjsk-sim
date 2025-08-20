"use client";

import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";

/** Cross-fade between image sources when `src` changes. */
export default function FadeImage({
  src,
  alt,
  fill = false,      // if true, wrapper is absolute/inset:0; else wrapper is relative
  width,
  height,
  sizes,
  style,
  className,
  duration = 300,
  easing = "ease",
  priority,
  unoptimized,
}) {
  const [aSrc, setASrc] = useState(src);
  const [bSrc, setBSrc] = useState(null);
  const [showA, setShowA] = useState(true);
  const pending = useRef(null);

  useEffect(() => {
    if (!src || src === (showA ? aSrc : bSrc)) return;
    if (showA) setBSrc(src);
    else setASrc(src);
    pending.current = src;
  }, [src, showA, aSrc, bSrc]);

  const onLoaded = (loadedSrc) => {
    if (pending.current !== loadedSrc) return;
    pending.current = null;
    setShowA((v) => !v);
  };

  // wrapper defines the box; layers are always absolutely stacked
  const wrapperStyle = {
    position: fill ? "absolute" : "relative",
    ...(fill ? { inset: 0 } : null),
  };

  const layerStyle = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    transition: `opacity ${duration}ms ${easing}`,
    willChange: "opacity",
    objectFit: style?.objectFit,
    pointerEvents: style?.pointerEvents,
    display: style?.display,
  };

  return (
    <div style={wrapperStyle} className={className}>
      {aSrc && (
        <NextImage
          key={`A-${aSrc}`}
          src={aSrc}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={unoptimized}
          onLoadingComplete={() => onLoaded(aSrc)}
          style={{ ...layerStyle, opacity: showA ? 1 : 0 }}
          // width/height props aren't needed when we use fill+absolute layers
        />
      )}
      {bSrc && (
        <NextImage
          key={`B-${bSrc}`}
          src={bSrc}
          alt={alt}
          fill
          sizes={sizes}
          unoptimized={unoptimized}
          onLoadingComplete={() => onLoaded(bSrc)}
          style={{ ...layerStyle, opacity: showA ? 0 : 1 }}
        />
      )}
    </div>
  );
}
