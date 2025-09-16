import { useEffect, useMemo, useState } from "react";
import gachaMetadata from "@/data/gacha_metadata.json";
import gachaRates from "@/data/gacha_rates.json";
import cardMetadata from "@/data/card_metadata.json";

/**
 * TenPullSimulator
 *
 * Props:
 *  - gachaId: string | number (the current banner id)
 *  - onRollStart?: () => void   // hook for triggering animations/sfx externally
 *  - onRollComplete?: (cardIds: string[]) => void // callback with results
 *
 * Behavior:
 *  - Simulates a 10-pull using gacha_rates.json and the banner's featured rates
 *  - Slot 10 uses the banner's `guaranteed` rarity table (if present) to ensure >=3★ when applicable
 *  - Tracks a 4★ pity in sessionStorage (grants a guaranteed 4★ on the 100th pull)
 *  - Appends pulled card ids to a session-based `inventory` array
 *  - Renders results as two rows of five with simple responsive layout
 */
export default function NormalTenPull({ gachaId, onRollStart, onRollComplete, onOk, Hud, autoRoll = false }) {
  const [results, setResults] = useState([]); // array of cardId strings
  const [rolling, setRolling] = useState(false);

  // Next.js router for OK button navigation fallback
  let router;
  try {
    // Lazy import to avoid SSR complaints if used outside Next
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("next/navigation");
    router = mod.useRouter?.();
  } catch {}

  const gacha = useMemo(() => {
    const key = String(gachaId);
    return gachaMetadata[key];
  }, [gachaId]);

  const rateTable = useMemo(() => {
    if (!gacha) return null;
    const idx = Number(gacha["gacha_rate_index"] ?? 0);
    return gachaRates[idx];
  }, [gacha]);

  // --- Utility: session storage helpers ---
  const getSessionArray = (key) => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  const setSessionArray = (key, arr) => {
    sessionStorage.setItem(key, JSON.stringify(arr));
  };

  const getPity = () => {
    const pulls = Number(sessionStorage.getItem("pity4_total_pulls") || 0);
    return Math.max(0, pulls);
  };
  const bumpPity = (by = 1) => {
    sessionStorage.setItem("pity4_total_pulls", String(getPity() + by));
  };

  // Map gacha type -> permitted card statuses
  const allowedStatuses = useMemo(() => {
    const type = (gacha?.type || "permanent").toLowerCase();
    switch (type) {
      case "limited":
        return new Set(["Limited", "Permanent"]);
      case "bloomfes":
      case "bloomfes limited":
        return new Set(["Bloomfes Limited", "Permanent"]);
      case "birthday":
        return new Set(["Birthday"]);
      default:
        return new Set(["Permanent"]);
    }
  }, [gacha]);

  // Build rarity -> pool arrays, filtered by status and (optionally) by release date if available
  const poolsByRarity = useMemo(() => {
    const result = new Map();
    if (!rateTable) return result;

    const raritiesInNormal = Object.keys(rateTable.normal || {});

    const bannerRelease = gacha?.release_date ? new Date(gacha.release_date) : null;

    for (const rarityKey of raritiesInNormal) {
      if (!/^[0-9]+$/.test(rarityKey)) continue;
      const rarity = Number(rarityKey);
      const pool = [];
      for (const cardId in cardMetadata) {
        const card = cardMetadata[cardId];
        if (!card) continue;
        if (Number(card.rarity) !== rarity) continue;
        if (!allowedStatuses.has(card.status || "Permanent")) continue;

        const cardDateStr = card["release_date"] || card["jp release date"] || card["en release date"] || null;
        if (bannerRelease && cardDateStr) {
          const cd = new Date(cardDateStr);
          if (!(cd <= bannerRelease)) continue;
        }
        pool.push(cardId);
      }
      result.set(String(rarity), pool);
    }

    for (const key of Object.keys(rateTable.normal || {})) {
      if (/^[0-9]+$/.test(key)) continue;
      const specialPool = [];
      for (const cardId in cardMetadata) {
        const card = cardMetadata[cardId];
        if (!card) continue;
        if ((card.status || "").toLowerCase().includes(key.toLowerCase())) {
          specialPool.push(cardId);
        }
      }
      result.set(key, specialPool);
    }

    return result;
  }, [rateTable, allowedStatuses, gacha]);

  const featuredByBucket = useMemo(() => {
    const map = new Map();
    if (!gacha?.featured_cards) return map;

    for (const f of gacha.featured_cards) {
      const id = String(f.card_id);
      const card = cardMetadata[id];
      if (!card) continue;
      const rarityKey = String(card.rarity ?? "");
      const bucketKey = rarityKey;
      const entry = map.get(bucketKey) || [];
      entry.push({
        id,
        normal_rate: Number(f.normal_rate || 0),
        guaranteed_rate: Number(f.guaranteed_rate || f.normal_rate || 0),
      });
      map.set(bucketKey, entry);
    }
    return map;
  }, [gacha]);

  function weightedPick(items) {
    const total = items.reduce((s, x) => s + x.w, 0);
    if (total <= 0) return items[Math.floor(Math.random() * items.length)]?.id;
    let r = Math.random() * total;
    for (const it of items) {
      if ((r -= it.w) <= 0) return it.id;
    }
    return items[items.length - 1]?.id;
  }

  function chooseRarity({ guaranteed = false, forceFour = false }) {
    if (!rateTable) return "2";
    if (forceFour) return "4";

    const table = guaranteed ? (rateTable.guaranteed || {}) : (rateTable.normal || {});
    const buckets = Object.entries(table).map(([k, v]) => ({ id: k, w: Number(v) }));

    return weightedPick(buckets);
  }

  function chooseCardFromBucket(bucketKey, { guaranteed = false }) {
    const pool = poolsByRarity.get(bucketKey) || [];
    if (pool.length === 0) return null;

    const bucketRate = Number((guaranteed ? rateTable?.guaranteed?.[bucketKey] : rateTable?.normal?.[bucketKey]) || 0);

    const featured = (featuredByBucket.get(bucketKey) || []).map((f) => ({
      id: f.id,
      w: bucketRate > 0 ? (guaranteed ? f.guaranteed_rate : f.normal_rate) / bucketRate : 0,
    }));

    const featuredIds = new Set(featured.map((x) => x.id));
    const nonFeaturedIds = pool.filter((id) => !featuredIds.has(id));

    const featuredMass = featured.reduce((s, x) => s + x.w, 0);
    const remaining = Math.max(0, 1 - featuredMass);

    const items = [];
    items.push(...featured);

    if (nonFeaturedIds.length > 0) {
      const each = remaining / nonFeaturedIds.length;
      for (const id of nonFeaturedIds) items.push({ id, w: each });
    }

    return weightedPick(items);
  }

  function doTenPull() {
    if (!gacha || !rateTable) return;

    setRolling(true);
    onRollStart?.();

    const resultsLocal = [];
    let pityCounter = getPity();

    for (let slot = 1; slot <= 10; slot++) {
      const useGuaranteed = slot === 10 && rateTable.guaranteed && Object.keys(rateTable.guaranteed).length > 0;

      const forceFour = (pityCounter + 1) % 100 === 0;

      const bucketKey = chooseRarity({ guaranteed: useGuaranteed, forceFour });
      const pickedId = chooseCardFromBucket(bucketKey, { guaranteed: useGuaranteed }) ||
        chooseCardFromBucket(String(Object.keys(poolsByRarity)[0] || "4"), { guaranteed: false });

      resultsLocal.push(String(pickedId));

      pityCounter += 1; // always increment counter, no reset
    }

    sessionStorage.setItem("pity4_total_pulls", String(pityCounter));

    const inv = getSessionArray("inventory");
    setSessionArray("inventory", [...inv, ...resultsLocal]);

    setResults(resultsLocal);
    setRolling(false);
    onRollComplete?.(resultsLocal);
  }

  const getCardImg = (cardId) => `/cards/${cardId}/card_normal.webp`;

  useEffect(() => {
    if (sessionStorage.getItem("pity4_total_pulls") == null) sessionStorage.setItem("pity4_total_pulls", "0");
    if (sessionStorage.getItem("inventory") == null) sessionStorage.setItem("inventory", "[]");
  }, []);

  // Auto-roll once when the component first mounts (optional)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__normalTenPull_autoroll_once__) return; // guard if you navigate back/forward
    if (autoRoll) {
      window.__normalTenPull_autoroll_once__ = true;
      // slight delay so parent can finish mounting (and sfx hooks can attach)
      setTimeout(() => doTenPull(), 50);
    }
  }, [autoRoll]);

  if (!gacha || !rateTable) {
    return (
      <div className="p-4 text-sm text-red-600">Invalid gacha configuration.</div>
    );
  }

  const handleOk = () => {
    if (onOk) return onOk();
    if (router) {
      const to = `/gacha/${gachaId}`;
      try { router.push(to); } catch {}
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Background */}
      <img
        src="/gacha/bg/bg_gacha_result.webp"
        alt="Gacha Result Background"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        draggable={false}
      />

      {/* HUD (Return, Settings, Exchange, Sticker, Crystal) */}
      {Hud ? (
        <Hud gachaId={gachaId} />
      ) : (
        <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between text-white text-sm">
          <div className="flex gap-2">
            {/* Placeholder buttons; pass a Hud prop to render your real DisplayGacha HUD */}
            <button className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1">Return</button>
            <button className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1">Settings</button>
            <button className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1">Exchange</button>
          </div>
          <div className="flex gap-2">
            <div className="bg-white/10 rounded-lg px-3 py-1">Sticker</div>
            <div className="bg-white/10 rounded-lg px-3 py-1">Crystals</div>
          </div>
        </div>
      )}

      {/* Results Grid */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        {results.length > 0 ? (
          <div className="grid grid-cols-5 gap-3 max-w-6xl w-full">
            {results.map((id, idx) => (
              <div key={`${id}-${idx}`} className="aspect-[3/4] bg-white/90 rounded-xl shadow flex items-center justify-center overflow-hidden">
                <img
                  src={getCardImg(id)}
                  alt={cardMetadata[id]?.["english name"] || id}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder-card.webp";
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-white/80 text-sm">Press “Pull Again” to simulate or wire onRollStart to trigger your animation before calling doTenPull().</div>
        )}
      </div>

      {/* Bottom Buttons */}
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-8">
        <button
          className="active:scale-95 transition-transform"
          onClick={doTenPull}
          disabled={rolling}
          aria-label="Unpaid Pull Again"
        >
          <img
            src="/UI/unpaid_pull_again.png"
            alt="Pull Again"
            className="h-14 w-auto select-none"
            draggable={false}
          />
        </button>
        <button
          className="active:scale-95 transition-transform"
          onClick={handleOk}
          aria-label="OK"
        >
          <img
            src="/UI/OK.png"
            alt="OK"
            className="h-14 w-auto select-none"
            draggable={false}
          />
        </button>
      </div>

      {/* Dev debug (hide in prod) */}
      <div className="absolute right-3 bottom-3 text-xs text-white/80 bg-black/40 rounded-lg px-2 py-1">
        <div>Inventory: {getSessionArray("inventory").length}</div>
        <div>Pity 4★: {getPity() % 100} / 100</div>
      </div>
    </div>
  );
}
