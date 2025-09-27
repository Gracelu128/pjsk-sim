// src/components/DisplayGacha.jsx
"use client";

import { useMemo, useState } from "react";
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
  cardThumbPath
} from "@/utils/assetPaths";

import gachaRates from "@/data/gacha_rates.json";
import allCards from "@/data/card_metadata.json"; // needs: id, rarity, status, release_date (ISO or parseable)

import buildLogoNav from "@/utils/buildLogoNav";
import ResultDisplay from "@/components/ResultDisplay";


export default function DisplayGacha({ gachaId, manifest, gachaMeta }) {
  const entry = manifest?.[gachaId] || {};
  console.log("Debug Entry:", entry);
  console.log("Debug Gacha Metadata:", gachaMeta);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState([]);

  // Rotators
  //const bgLen = Array.isArray(entry.bg) ? entry.bg.length : 0;
  const imgLen = Array.isArray(entry.img) ? entry.img.length : 0;
  const imgIndex = useCountdown(imgLen, 4000);
  // Per-gacha assets
  //Below: fix for gachas 1-376
  // Build the list of bg candidates
  const allBg = Array.isArray(entry.bg) ? entry.bg : [];
  const isEarly = Number(gachaId) >= 1 && Number(gachaId) <= 376;

  // keep only card images for early gachas
  const bgFiles = isEarly
    ? allBg.filter(p => typeof p === "string" && (p.startsWith("/cards/") || p.startsWith("cards/") || p.includes("/cards/")))
    : allBg;

  // Use the filtered list length for rotation
  const bgIndex = useCountdown(bgFiles.length || 0, 4000);

  // Resolve the current bg URL
  const resolveBg = (file) => {
    if (!file) return null;
    // mirror the logic in normalizeBgFile
    if (file.startsWith("http://") || file.startsWith("https://") || file.startsWith("/")) return file;
    if (file.startsWith("cards/") || file.includes("/cards/")) return "/" + file;
    // texture filename
    return `/gacha/gacha_${gachaId}/screen/texture/${file}`;
  };

  const bgSrc = resolveBg(bgFiles[bgIndex] || null);
  //-
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

  // ---------------------------------------------------------------------
  // ----------------------- OH YES MORE HELPERS -------------------------
  // ------------------------ for 10-pull logic --------------------------

  const doTenPull = () => {
    const pulled = [];
    let pity = getPity4();

    for (let i = 0; i < 10; i++) {
      const isGuaranteedSlot = (i === 9); // slot #10 uses guaranteed table (e.g., at least 3★)
      const force4 = pity >= 99;          // 4★ pity on the next draw
      const slotKind = isGuaranteedSlot ? "guaranteed" : "normal";

      const choices = buildChoices(slotKind, force4 ? 4 : null);
      const pick = weightedPick(choices); // { type: "featured"|"other", rarity, id? }

      let chosen = null;
      if (pick.type === "featured") {
        chosen = allCards[pick.id] || null;
        // if metadata had a featured id that didn't pass gates, fallback to other pool
        if (!chosen) chosen = pickOneFromPool(pick.rarity, featuredByRarity[pick.rarity]);
      } else {
        // choose from non-featured pool of that rarity
        chosen = pickOneFromPool(pick.rarity, featuredByRarity[pick.rarity]);
      }

      // ultimate safety fallback: try any rarity high→low
      if (!chosen) {
        for (const rr of [4, 3, 2]) {
          const fb = pickOneFromPool(rr);
          if (fb) { chosen = fb; break; }
        }
      }

      // update pity
      if (Number(chosen?.rarity) === 4) pity = 0;
      else pity += 1;

      pulled.push(chosen);
    }

    setPity4(pity);
    pushInventory(pulled.map(c => c?.id ?? ""));

    setResults(pulled);
    setShowResults(true);
  };

  const bannerReleaseTS = useMemo(() => {
    const s = gachaMeta?.release_date || gachaMeta?.["release_date"];
    const t = s ? new Date(s).getTime() : Number.POSITIVE_INFINITY;
    return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
  }, [gachaMeta]);

  const bannerType = (gachaMeta?.type || "normal").toLowerCase();

  const normalizeStatus = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
  // allow/exclude card status by banner type
  const allowStatus = (status) => {
    const st = normalizeStatus(status);
    if (bannerType.includes("bloom")) {
      // Bloomfes banner → allow bloomfes limited + normal
      return st === "bloom festival limited" || st === "bloomfes limited" || st === "normal" || st === "";
    }
    if (bannerType.includes("birthday")) {
      return st === "birthday" || st === "normal" || st === "";
    }
    if (bannerType === "limited") {
      // “Limited” banner (non-bloom, non-bday) → allow limited + normal
      return st === "limited" || st === "normal" || st === "";
    }
    // default: normal only
    return st === "normal" || st === "";
  };

  // build rarity pools with release-date & status gates
  const poolByRarity = useMemo(() => {
    const pools = { 2: [], 3: [], 4: [] };
    for (const id in allCards) {
      const c = allCards[id];
      const r = Number(c?.rarity);
      if (!(r === 2 || r === 3 || r === 4)) continue;

      // release date gate (include only if card date <= banner release)
      const cs = c?.release_date || c?.["release_date"];
      const ct = cs ? new Date(cs).getTime() : null;
      if (ct && ct > bannerReleaseTS) continue;

      if (!allowStatus(c?.status)) continue;

      pools[r].push(c);
    }
    return pools;
  }, [allCards, bannerReleaseTS, bannerType]);

  // featured cards (absolute % weights live in metadata)
  const featuredList = Array.isArray(gachaMeta?.featured_cards) ? gachaMeta.featured_cards : [];
  const featuredById = useMemo(() => {
    const m = new Map();
    for (const f of featuredList) {
      if (!f?.card_id) continue;
      m.set(String(f.card_id), {
        normal_rate: Number(f.normal_rate) || 0,
        guaranteed_rate: Number(f.guaranteed_rate) || 0,
      });
    }
    return m;
  }, [featuredList]);

  const featuredByRarity = useMemo(() => {
    const sets = { 2: new Set(), 3: new Set(), 4: new Set() };
    for (const [id, _meta] of featuredById.entries()) {
      const r = Number(allCards[id]?.rarity);
      if (r === 2 || r === 3 || r === 4) sets[r].add(id);
    }
    return sets;
  }, [featuredById, allCards]);

  const featuredSums = useMemo(() => {
    const sums = { normal: { 2: 0, 3: 0, 4: 0 }, guaranteed: { 2: 0, 3: 0, 4: 0 } };
    for (const [id, fm] of featuredById.entries()) {
      const r = Number(allCards[id]?.rarity);
      if (r === 2 || r === 3 || r === 4) {
        sums.normal[r] += fm.normal_rate || 0;
        sums.guaranteed[r] += fm.guaranteed_rate || 0;
      }
    }
    return sums;
  }, [featuredById, allCards]);

  // RNG utils
  const rand = () => Math.random();
  const weightedPick = (items) => {
    // items: [{key, weight}]
    const total = items.reduce((a, b) => a + Math.max(0, b.weight), 0);
    if (total <= 0) return items[0]?.key;
    let x = rand() * total;
    for (const it of items) {
      const w = Math.max(0, it.weight);
      if ((x -= w) <= 0) return it.key;
    }
    return items[items.length - 1]?.key;
  };

  // compose choices for a slot ("normal" | "guaranteed"), respecting featured absolute rates
  const rateIndex = gachaMeta?.gacha_rate_index ?? 0;
  const buildChoices = (slotKind, forceRarity /*null|2|3|4*/) => {
    const table = gachaRates?.[rateIndex]?.[slotKind] || {};
    const rarities = forceRarity ? [String(forceRarity)] : Object.keys(table);
    const choices = [];

    for (const rKey of rarities) {
      const r = Number(rKey);
      if (!(r === 2 || r === 3 || r === 4)) continue;

      const baseRate = forceRarity ? 100 : Number(table[rKey] || 0);
      if (baseRate <= 0) continue;

      const featSum = (slotKind === "guaranteed" ? featuredSums.guaranteed[r] : featuredSums.normal[r]) || 0;
      const otherWeight = Math.max(0, baseRate - featSum);

      // featured entries as separate keys
      for (const fid of featuredByRarity[r]) {
        const fm = featuredById.get(fid);
        const w = slotKind === "guaranteed" ? (fm?.guaranteed_rate || 0) : (fm?.normal_rate || 0);
        if (w > 0) choices.push({ key: { type: "featured", rarity: r, id: fid }, weight: w });
      }

      // “other” bucket for this rarity
      if (otherWeight > 0) choices.push({ key: { type: "other", rarity: r }, weight: otherWeight });
    }

    // fallback (e.g., guaranteed table had no entries): pick any 3★ other
    if (!choices.length) choices.push({ key: { type: "other", rarity: forceRarity || 3 }, weight: 100 });

    return choices;
  };

  // pick a random card from a rarity pool, optionally excluding some ids (e.g., featured)
  const pickOneFromPool = (rarity, excludeSet) => {
    const pool = poolByRarity[rarity].filter(c => !excludeSet?.has?.(String(c.id)));
    if (!pool.length) return null;
    return pool[Math.floor(rand() * pool.length)];
  };

  // pity (4★ every 100)
  const getPity4 = () => {
    const v = Number(sessionStorage.getItem("pity4Counter") || "0");
    return Number.isFinite(v) ? v : 0;
  };
  const setPity4 = (v) => sessionStorage.setItem("pity4Counter", String(v));

  // inventory
  const pushInventory = (ids) => {
    let cur = [];
    try { cur = JSON.parse(sessionStorage.getItem("inventory") || "[]"); } catch {}
    sessionStorage.setItem("inventory", JSON.stringify([...cur, ...ids.map(String)]));
  };

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

              {/* Real date bar */}
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
                      width={pxW(0.238)} // 85% of 28% ~ 23.8%
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
                      width={pxW(0.238)} // 85% of 28% ~ 23.8%
                      height={pxH(0.06)}
                      sizes={`${pxW(0.238)}px`}
                      style={{ width: "100%", height: "auto", display: "block" }}
                    />
                  </div>
                )
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
              {ui?.tenPull && (
                <div style={{ width: "22%" }}>
                  <button
                    onClick={doTenPull}
                    style={{
                      border: "none", background: "transparent", padding: 0, margin: 0,
                      cursor: "pointer", width: "100%",
                    }}
                    aria-label="Unpaid Ten Pull"
                  >
                    <NextImage
                      src={ui.tenPull}
                      alt="10 pulls"
                      width={pxW(0.132)}
                      height={pxH(0.10)}
                      sizes={`${pxW(0.132)}px`}
                      style={{ width: "100%", height: "auto", display: "block" }}
                    />
                  </button>
                </div>
              )}
              {/* updated display for results */}
              <ResultDisplay open={showResults} onClose={() => setShowResults(false)}>
                {/* Two rows x five columns */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 12,
                    width: "min(720px, 90vw)",
                  }}
                >
                  {results.map((card, idx) => {
                    const id = String(card?.id ?? "");
                    return (
                      <div
                        key={idx}
                        style={{
                          background: "#fafafa",
                          border: "1px solid #e7e7e7",
                          borderRadius: 10,
                          padding: 8,
                          display: "grid",
                          placeItems: "center",
                          aspectRatio: "1 / 1.2",
                        }}
                        title={`${card?.["english name"] || ""} (${card?.rarity}★)`}
                      >
                        <div style={{ width: "100%", maxWidth: 120 }}>
                          <NextImage
                            src={cardThumbPath(id)}
                            alt={card?.["english name"] || `Card ${id}`}
                            width={240}
                            height={240}
                            style={{ width: "100%", height: "auto", display: "block" }}
                          />
                        </div>
                        <div style={{ fontSize: 12, marginTop: 6, opacity: 0.9, textAlign: "center" }}>
                          {card?.rarity}★ · {card?.character || ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ResultDisplay>

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
