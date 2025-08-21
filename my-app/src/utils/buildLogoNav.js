export default function buildLogoNav(manifest, currentId, logoPathFn, want = 6, currentIndex = 2) {
  const ids = Object.keys(manifest)
    .map(Number)
    .filter(n => !Number.isNaN(n))
    .sort((a, b) => a - b);

  const idx = ids.indexOf(Number(currentId));
  if (idx === -1) return [];

  // ideal window around current: 2 before, current, 3 after
  const base = [ids[idx - 2], ids[idx - 1], ids[idx], ids[idx + 1], ids[idx + 2], ids[idx + 3]]
    .filter(n => n != null)
    .map(String);

  let items = base
    .map(id => {
      const src = logoPathFn(id, manifest[id]);
      return src ? { id, src } : null;
    })
    .filter(Boolean);

  // backfill outward until we have `want` items
  let radius = 3;
  while (items.length < want && (idx - radius >= 0 || idx + radius < ids.length)) {
    // try one before and one after per radius
    for (const pos of [idx - radius, idx + radius]) {
      if (items.length >= want) break;
      if (pos < 0 || pos >= ids.length) continue;
      const id = String(ids[pos]);
      if (items.some(it => it.id === id)) continue;
      const src = logoPathFn(id, manifest[id]);
      if (!src) continue;
      if (ids[pos] < ids[idx]) items = [{ id, src }, ...items]; else items = [...items, { id, src }];
    }
    radius++;
  }

  // if too many, center so current lands at `currentIndex` (2)
  const curPos = items.findIndex(it => it.id === String(ids[idx]));
  if (items.length > want) {
    if (curPos !== -1) {
      let start = Math.max(0, curPos - currentIndex);
      if (start + want > items.length) start = Math.max(0, items.length - want);
      items = items.slice(start, start + want);
    } else {
      items = items.slice(0, want);
    }
  }

  return items;
}
