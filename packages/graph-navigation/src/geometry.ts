// Deterministic geometry and seeding helpers shared by the layout pass
// (layout.ts) and the render pass (GraphNavigation.astro). Both passes derive
// node positions from the same seeded values for a given node id, so these
// must stay a single source of truth — duplicating them risks the two passes
// drifting and nodes landing in different spots between layout and paint.

export function hashText(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function seededUnit(id: string, salt: string) {
  return hashText(`${id}:${salt}`) / 0xffffffff;
}

export function seededSignedUnit(id: string, salt: string) {
  return seededUnit(id, salt) * 2 - 1;
}
