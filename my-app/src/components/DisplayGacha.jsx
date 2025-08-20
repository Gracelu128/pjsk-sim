// src/components/DisplayGacha.jsx
"use client";

import { useMemo } from "react";
import NextImage from "next/image";
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

    charDetails: uiPath(UI_FILES.charatcer_details_button), // (spelling as provided)
    gachaDetails: uiPath(UI_FILES.gacha_details_button),
  };

  const { width: vw, height: vh } = useWindowSize();
  const { w: natW, h: natH } = useNaturalSize(bgSrc || "");

  // Stage size that "contains" bg
  const { stageW, stageH } = useMemo(() => {
    if (bgSrc && natW && natH && vw && vh) {
      const scale = Math.min(vw / natW, vh / natH);
      return { stageW: Math.floor(natW * scale), stageH: Math.floor(natH * scale) };
    }
    return { stageW: Math.max(0, vw), stageH: Math.max(0, vh) };
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

  // Helpers to size with stage-relative px
  const pxW = (p) => Math.round(stageW * p);
  const pxH = (p) => Math.round(stageH * p);

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
            <NextImage
              src={bgSrc}
              alt={`Gacha ${gachaId} Background`}
              fill
              priority
              sizes={`${stageW}px`}
              style={{ objectFit: "contain" }}
            />
          )}

          {/* Overlay */}
          {overlaySrc && (
            <NextImage
              src={overlaySrc}
              alt={`Gacha ${gachaId} Overlay`}
              fill
              sizes={`${stageW}px`}
              style={{ objectFit: "contain", pointerEvents: "none" }}
            />
          )}

          {/* LEFT: Tabs panel (centered vertically) */}
          {ui.tabsPanel && (
            <div
              style={{
                position: "absolute",
                left: "-3%",
                top: "50%",
                transform: "translateY(-50%)",
                width: "16%",
              }}
            >
              <NextImage
                src={ui.tabsPanel}
                alt="Tabs panel"
                width={pxW(0.16)}
                height={pxH(0.6)}
                sizes={`${pxW(0.16)}px`}
                style={{ width: "100%", height: "auto", display: "block", pointerEvents: "none" }}
              />
            </div>
          )}

          {/* TOP-LEFT: Return button */}
          {ui.returnBtn && (
            <div style={{ position: "absolute", top: "4%", left: "4%", width: "5%" }}>
              <NextImage
                src={ui.returnBtn}
                alt="Return"
                width={pxW(0.08)}
                height={pxH(0.08)}
                sizes={`${pxW(0.08)}px`}
                style={{ width: "90%", height: "auto", display: "block" }}
              />
            </div>
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
                <div style={{ width: pxW(0.10) }}>
                  <NextImage
                    src={ui.exchangeBtn}
                    alt="Exchange"
                    width={pxW(0.10)}
                    height={pxH(0.08)}
                    sizes={`${pxW(0.10)}px`}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
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
                <div style={{ width: pxW(0.06), marginRight: "-4%" }}>
                  <NextImage
                    src={ui.settingsBtn}
                    alt="Settings"
                    width={pxW(0.06)}
                    height={pxH(0.06)}
                    sizes={`${pxW(0.06)}px`}
                    style={{ width: "78%", height: "auto", display: "block" }}
                  />
                </div>
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
