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

export default function DisplayGacha({ gachaId, manifest, onNormalTenPull }) {
  // --------------------------------------------------------------------------
  // --------------------- setup/environment ----------------------------------
  const entry = manifest?.[gachaId] || {};
  // Rotators
  const imgLen = Array.isArray(entry.img) ? entry.img.length : 0;
  const imgIndex = useCountdown(imgLen, 4000);

  // Backgrounds (filtering early gachas to only card images)
  const allBg = Array.isArray(entry.bg) ? entry.bg : [];
  const isEarly = Number(gachaId) >= 1 && Number(gachaId) <= 376;
  const bgFiles = isEarly
    ? allBg.filter(
        (p) =>
          typeof p === "string" &&
          (p.startsWith("/cards/") || p.startsWith("cards/") || p.includes("/cards/"))
      )
    : allBg;
  const bgIndex = useCountdown(bgFiles.length || 0, 4000);

  const resolveBg = (file) => {
    if (!file) return null;
    if (file.startsWith("http://") || file.startsWith("https://") || file.startsWith("/"))
      return file;
    if (file.startsWith("cards/") || file.includes("/cards/")) return "/" + file;
    return `/gacha/gacha_${gachaId}/screen/texture/${file}`;
  };

  const bgSrc = resolveBg(bgFiles[bgIndex] || null);

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
    realDateBar: uiPath(UI_FILES.real_date_bar),
    fakeStickerBarNormal: uiPath(UI_FILES.fake_gacha_sticker_bar_normal),

    charDetails: uiPath(UI_FILES.character_details_button),
    gachaDetails: uiPath(UI_FILES.gacha_details_button),
  };

  const { width: vw, height: vh } = useWindowSize();
  const { w: natW, h: natH } = useNaturalSize(bgSrc || "");
  const { w: ovW, h: ovH } = useNaturalSize(overlaySrc || "");

  // Stage size that "contains" bg
  const { stageW, stageH } = useMemo(() => {
    if (bgSrc && natW && natH && vw && vh) {
      const scale = Math.min(vw / natW, vh / natH);
      return {
        stageW: Math.floor(natW * scale),
        stageH: Math.floor(natH * scale),
      };
    }
    return { stageW: Math.max(0, vw), stageH: Math.max(0, vh) };
  }, [bgSrc, natW, natH, vw, vh]);
  const ready = stageW > 0 && stageH > 0;

  if (!bgSrc && !overlaySrc && !logoSrc && !bannerSrc && !Object.values(ui).some(Boolean)) {
    return <div style={{ padding: 16, color: "#bbb" }}>No assets found for this gacha.</div>;
  }

  // Heuristic: does overlay cover full canvas?
  const overlayIsFull = (() => {
    if (!overlaySrc || !ovW || !ovH || !natW || !natH) return false;
    if ((ovW === 2520 && ovH === 1440) || (ovW === 2048 && ovH === 1170)) return true;
    const bgAR = natW / natH;
    const ovAR = ovW / ovH;
    const arDiff = Math.abs(ovAR - bgAR) / bgAR;
    const wRatio = ovW / natW;
    const hRatio = ovH / natH;
    const areaRatio = (ovW * ovH) / (natW * natH);
    return (arDiff <= 0.03 && wRatio >= 0.85 && hRatio >= 0.85) || areaRatio >= 0.7;
  })();

  const pxW = (p) => Math.round(stageW * p);
  const pxH = (p) => Math.round(stageH * p);

  // Navigator logos
  const navLogos = useMemo(
    () => buildLogoNav(manifest || {}, gachaId, (id, e) => logoPath(id, e), 6, 2),
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
            const boxH = Math.round(stageH * 0.28);
            const aspect = ovW / ovH || 2.7;
            const boxW = Math.round(boxH * aspect);
            return (
              <div
                style={{
                  position: "absolute",
                  right: "7%",
                  top: "63%",
                  transform: "translateY(-50%)",
                  width: boxW,
                  height: boxH,
                  // keep this container clickable; only the image ignores events
                }}
              >
                <FadeImage
                  src={overlaySrc}
                  alt={`Gacha ${gachaId} Overlay (sprite)`}
                  fill
                  sizes={`${boxW}px`}
                  style={{ objectFit: "contain", display: "block", pointerEvents: "none" }}
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
              <div style={{ position: "absolute", inset: 0 }}>
                <NextImage
                  src={ui.tabsPanel}
                  alt="Tabs panel"
                  fill
                  sizes={`${pxW(0.16)}px`}
                  style={{ objectFit: "contain", pointerEvents: "none", display: "block" }}
                />
              </div>

              <div
                style={{
                  position: "absolute",
                  inset: "2% 1% 3% 14%",
                  display: "grid",
                  gridTemplateRows: "repeat(6, 1fr)",
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

          {/* TOP-RIGHT BAR */}
          {(ui.tokenBarNormal || ui.exchangeBtn || ui.crystalBar || ui.settingsBtn) && (
            <div
              style={{
                position: "absolute",
                top: "4%",
                right: "4%",
                display: "flex",
                alignItems: "center",
                gap: pxW(0.01),
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

          {/* CENTER-LEFT: Logo + date/sticker bars + detail buttons */}
          {(logoSrc || ui.fakeDateBar || ui.fakeStickerBarNormal || ui.charDetails || ui.gachaDetails) && (
            <div
              style={{
                position: "absolute",
                left: "16%",
                bottom: "10%",
                width: "23%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
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

              {entry["end date"] ? (
                ui.realDateBar && (
                  <div
                    style={{
                      width: "85%",
                      marginBottom: pxH(0.01),
                      position: "relative",
                      textAlign: "center",
                      fontFamily: "Arial, sans-serif",
                      fontSize: "1.25em",
                      color: "#fff",
                    }}
                  >
                    <NextImage
                      src={ui.realDateBar}
                      alt="Date"
                      width={pxW(0.238)}
                      height={pxH(0.06)}
                      sizes={`${pxW(0.238)}px`}
                      style={{ width: "100%", height: "auto", display: "block" }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry["end date"]}
                    </span>
                  </div>
                )
              ) : (
                ui.fakeDateBar && (
                  <div style={{ width: "85%", marginBottom: pxH(0.01) }}>
                    <NextImage
                      src={ui.fakeDateBar}
                      alt="Date"
                      width={pxW(0.238)}
                      height={pxH(0.06)}
                      sizes={`${pxW(0.238)}px`}
                      style={{ width: "100%", height: "auto", display: "block" }}
                    />
                  </div>
                )
              )}

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

          {/* BOTTOM-RIGHT: Pull buttons and clickable overlays */}
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
              {/* Single pull (non-clickable for now) */}
              {ui.singlePull && (
                <div style={{ position: "relative", width: "22%" }}>
                  <NextImage
                    src={ui.singlePull}
                    alt="1 pull"
                    width={pxW(0.132)}
                    height={pxH(0.10)}
                    sizes={`${pxW(0.132)}px`}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              )}

              {/* Ten pull (CLICKABLE) */}
              {ui.tenPull && (
                <div style={{ position: "relative", width: "22%" }}>
                  <NextImage
                    src={ui.tenPull}
                    alt="10 pulls"
                    width={pxW(0.132)}
                    height={pxH(0.10)}
                    sizes={`${pxW(0.132)}px`}
                    style={{ width: "100%", height: "auto", display: "block", pointerEvents: "none" }}
                  />
                  {/* Transparent button overlay to catch clicks */}
                  <button
                    aria-label="Normal 10 Pull"
                    onClick={onNormalTenPull}
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  />
                </div>
              )}

              {/* Paid single (non-clickable placeholder) */}
              {ui.paidSingle && (
                <div style={{ position: "relative", width: "22%" }}>
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

              {/* Paid ten (non-clickable placeholder) */}
              {ui.paidTen && (
                <div style={{ position: "relative", width: "22%" }}>
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

          {/* (Optional) Banner
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
