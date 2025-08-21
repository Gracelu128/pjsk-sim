// src/components/DisplayGacha.jsx
"use client";

import { useMemo } from "react";
import NextImage from "next/image";
import FadeImage from "@/components/FadeImage";
import Link from "next/link";
import useCountdown from "@/hooks/useCountdown";
import useWindowSize from "@/hooks/useWindowSize";
import useNaturalSize from "@/hooks/useNaturalSize";
import {
  bgPath,
  overlayPath,
  logoPath,
  bannerPath,
  uiPath,
  UI_FILES,
} from "@/utils/assetPaths";
import buildLogoNav from "@/utils/buildLogoNav";

export default function DisplayGacha({ gachaId, manifest }) {
  const entry = manifest?.[gachaId] || {};

  // Rotators
  const bgLen = Array.isArray(entry.bg) ? entry.bg.length : 0;
  const imgLen = Array.isArray(entry.img) ? entry.img.length : 0;
  const bgIndex = useCountdown(bgLen, 4000);
  const imgIndex = useCountdown(imgLen, 4000);
  // Per-gacha assets
  const bgSrc = bgPath(gachaId, entry, bgIndex);
  const overlaySrc = overlayPath(gachaId, entry, imgIndex);
  const logoSrc = logoPath(gachaId, entry);
  const bannerSrc = bannerPath(gachaId, entry, 0);
  // Shared UI assets (null if file missing)
  const ui = {
    singlePull: uiPath(UI_FILES.single_pull_button),
    tenPull: uiPath(UI_FILES.ten_pull_button),
    paidSingle: uiPath(UI_FILES.paid_single_pull_button),
    paidTen: uiPath(UI_FILES.paid_ten_pull_button),

    tabsPanel: uiPath(UI_FILES.tabs_panel),
    returnBtn: uiPath(UI_FILES.return_button),
    settingsBtn: uiPath(UI_FILES.settings_button),

    tokenBarNormal: uiPath(UI_FILES.token_bar_normal),
    exchangeBtn: uiPath(UI_FILES.exchange_button),
    crystalBar: uiPath(UI_FILES.crystal_bar_button),

    fakeDateBar: uiPath(UI_FILES.fake_date_bar),
    fakeStickerBarNormal: uiPath(UI_FILES.fake_gacha_sticker_bar_normal),

    charDetails: uiPath(UI_FILES.character_details_button), // (spelling as provided)
    gachaDetails: uiPath(UI_FILES.gacha_details_button),
  };
  const { width: vw, height: vh } = useWindowSize();
  const { w: natW, h: natH } = useNaturalSize(bgSrc || "");
  //for resizing overlay
  const { w: ovW, h: ovH } = useNaturalSize(overlaySrc || "");

  // Stage size that "contains" bg
  const { stageW, stageH, scaleFromBg } = useMemo(() => {
    if (bgSrc && natW && natH && vw && vh) {
      const scale = Math.min(vw / natW, vh / natH); // bg → stage scale
      return {
        stageW: Math.floor(natW * scale),
        stageH: Math.floor(natH * scale),
        scaleFromBg: scale,
      };
    }
    return { stageW: Math.max(0, vw), stageH: Math.max(0, vh), scaleFromBg: 0.3 };
  }, [bgSrc, natW, natH, vw, vh]);
  const ready = stageW > 0 && stageH > 0;

  // If literally nothing to show
  if (
    !bgSrc &&
    !overlaySrc &&
    !logoSrc &&
    !bannerSrc &&
    !Object.values(ui).some(Boolean)
  ) {
    return <div style={{ padding: 16, color: "#bbb" }}>No assets found for this gacha.</div>;
  }

  // Full overlays: allow known sizes + tolerant match vs background
  // adjust AR_TOL, MIN_SIDE, MIN_AREA if needed.
  // examples like gacha_407 has overlays sized 2048 × 1170
  // ones like gacha_446, on the other hand, have sprite-sized overlays
  // gacha_609 is an example of a full overlay sized 2520 × 1440 which is the same as bg
  const overlayIsFull = (() => {
    if (!overlaySrc || !ovW || !ovH || !natW || !natH) return false;
    // 1) Known full-canvas sizes
    if ((ovW === 2520 && ovH === 1440) || (ovW === 2048 && ovH === 1170)) return true;
    // 2) Tolerant heuristic vs bg
    const bgAR = natW / natH;
    const ovAR = ovW / ovH;
    const arDiff = Math.abs(ovAR - bgAR) / bgAR;         // relative AR delta
    const wRatio = ovW / natW;
    const hRatio = ovH / natH;
    const areaRatio = (ovW * ovH) / (natW * natH);
    const AR_TOL = 0.03;     // ≤3% AR difference
    const MIN_SIDE = 0.85;   // ≥85% of bg width & height
    const MIN_AREA = 0.70;   // ≥70% of bg area
    return (arDiff <= AR_TOL && wRatio >= MIN_SIDE && hRatio >= MIN_SIDE) || areaRatio >= MIN_AREA;
  })();

  // Helpers to size with stage-relative px
  const pxW = (p) => Math.round(stageW * p);
  const pxH = (p) => Math.round(stageH * p);

  //logos for tab panel
  const navLogos = useMemo(
    () => buildLogoNav(manifest || {}, gachaId, (id, entry) => logoPath(id, entry), 6, 2),
    [manifest, gachaId]
  );


  // -----------------------------------------------------------------------------------------
  // ---------------------------------------------ACTUAL UI-----------------------------------
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "black",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {ready && (
        <div style={{ position: "relative", width: stageW, height: stageH, overflow: "hidden" }}>
          {/* Background */}
          {bgSrc && (
            <FadeImage
              src={bgSrc}
              alt={`Gacha ${gachaId} Background`}
              fill
              priority
              sizes={`${stageW}px`}
              style={{ objectFit: "contain" }}
              duration={400}
            />
          )}

          {/* Overlay */}
          {overlaySrc && overlayIsFull && (
            <FadeImage
             src={overlaySrc}
             alt={`Gacha ${gachaId} Overlay`}
             fill
             sizes={`${stageW}px`}
             style={{ objectFit: "contain", pointerEvents: "none" }}
             duration={400}
           />
          )}

          {/* Sprite/strip overlays (non-full-screen) */}
          {overlaySrc && ovW > 0 && ovH > 0 && !overlayIsFull && (() => {
            // stable box: 28% of stage height, preserve aspect from the current sprite
            const boxH = Math.round(stageH * 0.28);
            const aspect = ovW / ovH || 2.7; // fallback if something is odd
            const boxW = Math.round(boxH * aspect);

            return (
              <div
                style={{
                  position: "absolute",
                  right: "7%",
                  top: "63%",
                  transform: "translateY(-50%)",   // keep it vertically centered
                  width: boxW,
                  height: boxH,
                  pointerEvents: "none",
                }}
              >
                <FadeImage
                  src={overlaySrc}
                  alt={`Gacha ${gachaId} Overlay (sprite)`}
                  fill
                  sizes={`${boxW}px`}
                  style={{ objectFit: "contain", display: "block" }}
                  duration={400}
                />
              </div>
            );
          })()}

          {/* LEFT: Tabs panel with 6-logo navigator inside */}
          {ui.tabsPanel && (
            <div
              style={{
                position: "absolute",
                left: "-3%",
                top: "50%",
                transform: "translateY(-50%)",
                width: "16%",
                height: pxH(0.69),
                zIndex: 6,
                pointerEvents: "auto",
              }}
            >
              {/* Panel art */}
              <div style={{ position: "absolute", inset: 0 }}>
                <NextImage
                  src={ui.tabsPanel}
                  alt="Tabs panel"
                  fill
                  sizes={`${pxW(0.16)}px`}
                  style={{ objectFit: "contain", pointerEvents: "none", display: "block" }}
                />
              </div>

              {/* 6 logos inside panel bounds */}
              <div
                style={{
                  position: "absolute",
                  inset: "2% 1% 3% 14%",                 // inner padding
                  display: "grid",
                  gridTemplateRows: "repeat(6, 1fr)",     // six rows
                  gap: "1%",
                }}
              >
                {navLogos.slice(0, 6).map((item) => {
                  const isCurrent = item.id === String(gachaId);
                  return (
                    <Link
                      key={item.id}
                      href={`/gacha_${item.id}`}
                      prefetch
                      scroll={false}
                      aria-label={`Open gacha_${item.id}`}
                      style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        borderRadius: 2,
                        overflow: "hidden",
                        // border: isCurrent ? "2px solid #fff" : "none", //"1px solid rgba(255,255,255,0.35)",
                        boxShadow: isCurrent ? "0 0 0 3px rgba(255,255,255,0.25)" : "none",
                        background: isCurrent ? "rgba(33, 255, 251, 0.93)" : "none",
                      }}
                    >
                      <NextImage
                        src={item.src}
                        alt={`gacha_${item.id} logo`}
                        fill
                        sizes="160px"
                        style={{ objectFit: "contain", display: "block", scale: "85%" }}
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* TOP-LEFT: Return button */} 
          {ui.returnBtn && (
            <Link 
              href="/" 
              prefetch={false} 
              aria-label="Back to home" 
              style={{ position: "absolute", top: "4%", left: "4%", width: "5%", display: "block" }} 
            > 
              <NextImage 
              src={ui.returnBtn} 
              alt="Return" 
              width={pxW(0.08)} 
              height={pxH(0.08)} 
              sizes={`${pxW(0.08)}px`} 
              style={{ width: "90%", height: "auto", display: "block", cursor: "pointer" }} 
              /> 
            </Link>
          )}

          {/* TOP-RIGHT BAR: tokenBarNormal, exchange, crystal, settings (right-aligned row) */}
          {(ui.tokenBarNormal || ui.exchangeBtn || ui.crystalBar || ui.settingsBtn) && (
            <div
              style={{
                position: "absolute",
                top: "4%",
                right: "4%",
                display: "flex",
                alignItems: "center",
                gap: pxW(0.01),
                // let items size themselves; we cap overall width to ~60% so it doesn't collide with center
                maxWidth: "45%",
              }}
            >
              {ui.tokenBarNormal && (
                <div style={{ width: pxW(0.13), marginTop: "0.5%" }}>
                  <NextImage
                    src={ui.tokenBarNormal}
                    alt="Token bar"
                    width={pxW(0.18)}
                    height={pxH(0.08)}
                    sizes={`${pxW(0.18)}px`}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              )}
              {ui.exchangeBtn && (
                <Link
                  href={`/gacha_${gachaId}/exchange`}
                  scroll={false} 
                  prefetch
                  aria-label="Open exchange"
                  style={{ width: pxW(0.10), display: "block" }}
                >
                  <NextImage
                    src={ui.exchangeBtn}
                    alt="Exchange"
                    width={pxW(0.10)}
                    height={pxH(0.08)}
                    sizes={`${pxW(0.10)}px`}
                    style={{ width: "100%", height: "auto", display: "block", cursor: "pointer" }}
                  />
                </Link>
              )}
              {ui.crystalBar && (
                <div style={{ width: pxW(0.14), marginTop: "-2%" }}>
                  <NextImage
                    src={ui.crystalBar}
                    alt="Crystals"
                    width={pxW(0.14)}
                    height={pxH(0.08)}
                    sizes={`${pxW(0.14)}px`}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              )}
              {ui.settingsBtn && (
                <Link
                  href={`/gacha_${gachaId}/settings`}
                  scroll={false} 
                  prefetch
                  aria-label="Open settings"
                  style={{ width: pxW(0.06), display: "block", marginRight: "-4%" }}
                >
                  <NextImage
                    src={ui.settingsBtn}
                    alt="Settings"
                    width={pxW(0.06)}
                    height={pxH(0.06)}
                    sizes={`${pxW(0.06)}px`}
                    style={{ width: "78%", height: "auto", display: "block", cursor: "pointer" }}
                  />
                </Link>
              )}
            </div>
          )}

          {/* CENTER-LEFT CLUSTER: Logo + date/sticker bars + detail buttons */}
          {(logoSrc || ui.fakeDateBar || ui.fakeStickerBarNormal || ui.charDetails || ui.gachaDetails) && (
            <div
              style={{
                position: "absolute",
                // a bit to the right of tabs panel
                left: "16%",
                bottom: "10%",
                width: "23%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {/* Logo */}
              {logoSrc && (
                <div style={{ width: "100%", marginBottom: pxH(0.015) }}>
                  <NextImage
                    src={logoSrc}
                    alt={`Gacha ${gachaId} Logo`}
                    width={pxW(0.28)}
                    height={pxH(0.16)}
                    sizes={`${pxW(0.28)}px`}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              )}

              {/* Fake date bar */}
              {ui.fakeDateBar && (
                <div style={{ width: "85%", marginBottom: pxH(0.01) }}>
                  <NextImage
                    src={ui.fakeDateBar}
                    alt="Date"
                    width={pxW(0.238)} // 85% of 28% ~ 23.8%
                    height={pxH(0.06)}
                    sizes={`${pxW(0.238)}px`}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              )}

              {/* Fake sticker bar (normal) */}
              {ui.fakeStickerBarNormal && (
                <div style={{ width: "85%", marginBottom: pxH(0.02) }}>
                  <NextImage
                    src={ui.fakeStickerBarNormal}
                    alt="Sticker progress"
                    width={pxW(0.238)}
                    height={pxH(0.06)}
                    sizes={`${pxW(0.238)}px`}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              )}

              {/* Details buttons row */}
              {(ui.charDetails || ui.gachaDetails) && (
                <div style={{ display: "flex", gap: pxW(0.01) }}>
                  {ui.charDetails && (
                    <div style={{ width: "48%" }}>
                      <NextImage
                        src={ui.charDetails}
                        alt="Character details"
                        width={pxW(0.134)}
                        height={pxH(0.07)}
                        sizes={`${pxW(0.134)}px`}
                        style={{ width: "100%", height: "auto", display: "block" }}
                      />
                    </div>
                  )}
                  {ui.gachaDetails && (
                    <div style={{ width: "48%" }}>
                      <NextImage
                        src={ui.gachaDetails}
                        alt="Gacha details"
                        width={pxW(0.134)}
                        height={pxH(0.07)}
                        sizes={`${pxW(0.134)}px`}
                        style={{ width: "100%", height: "auto", display: "block" }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* BOTTOM-RIGHT: Pull buttons horizontally, container ~60% stage width */}
          {(ui.singlePull || ui.tenPull || ui.paidSingle || ui.paidTen) && (
            <div
              style={{
                position: "absolute",
                right: "3%",
                bottom: "10%",
                width: "60%",
                display: "flex",
                justifyContent: "flex-end",
                gap: pxW(0.010),
                flexWrap: "wrap",
              }}
            >
              {ui.singlePull && (
                <div style={{ width: "22%" }}>
                  <NextImage
                    src={ui.singlePull}
                    alt="1 pull"
                    width={pxW(0.132)} // 22% of 60% ~ 13.2% of stageW
                    height={pxH(0.10)}
                    sizes={`${pxW(0.132)}px`}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              )}
              {ui.tenPull && (
                <div style={{ width: "22%" }}>
                  <NextImage
                    src={ui.tenPull}
                    alt="10 pulls"
                    width={pxW(0.132)}
                    height={pxH(0.10)}
                    sizes={`${pxW(0.132)}px`}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              )}
              {ui.paidSingle && (
                <div style={{ width: "22%" }}>
                  <NextImage
                    src={ui.paidSingle}
                    alt="Paid 1 pull"
                    width={pxW(0.132)}
                    height={pxH(0.10)}
                    sizes={`${pxW(0.132)}px`}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              )}
              {ui.paidTen && (
                <div style={{ width: "22%" }}>
                  <NextImage
                    src={ui.paidTen}
                    alt="Paid 10 pulls"
                    width={pxW(0.132)}
                    height={pxH(0.10)}
                    sizes={`${pxW(0.132)}px`}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              )}
            </div>
          )}

          {/* (Optional) Banner if you still want it, but mindful of top-right bar
          {bannerSrc && (
            <div style={{ position: "absolute", top: "12%", right: "3%", width: Math.min(stageW * 0.35, 360), zIndex: 4 }}>
              <NextImage
                src={bannerSrc}
                alt={`Gacha ${gachaId} Banner`}
                width={Math.min(stageW * 0.35, 360)}
                height={pxH(0.18)}
                sizes={`${Math.min(stageW * 0.35, 360)}px`}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          )} */}
        </div>
      )}
    </div>
  );
}
