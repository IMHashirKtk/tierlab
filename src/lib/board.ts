/**
 * Pure helpers for creating boards and moving items between containers.
 * A "container" is either a tier row (identified by its tier id) or the unranked tray.
 */
import type { Item, Project, Template, TierRow } from "@/types";

export const UNRANKED = "unranked";

export interface Board {
  tiers: TierRow[];
  unranked: Item[];
}

export const DEFAULT_TIERS: Omit<TierRow, "items">[] = [
  { id: "tier-s", label: "S", color: "from-rose-500 to-red-600" },
  { id: "tier-a", label: "A", color: "from-amber-500 to-orange-500" },
  { id: "tier-b", label: "B", color: "from-emerald-500 to-teal-600" },
  { id: "tier-c", label: "C", color: "from-sky-500 to-blue-600" },
  { id: "tier-d", label: "D", color: "from-purple-500 to-indigo-600" },
];

export function createId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function emptyTiers(): TierRow[] {
  return DEFAULT_TIERS.map((tier) => ({ ...tier, items: [] }));
}

/**
 * Validates and normalizes raw tier configurations, filtering out malformed entries
 * and returning undefined when empty so callers safely fall back to standard S-D tiers.
 */
export function normalizeDefaultTiers(raw: unknown): { label: string; color: string }[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const filtered = raw.filter(
    (entry): entry is { label: string; color: string } =>
      Boolean(
        entry &&
          typeof entry === "object" &&
          typeof (entry as any).label === "string" &&
          (entry as any).label.trim().length > 0 &&
          typeof (entry as any).color === "string" &&
          (entry as any).color.trim().length > 0
      )
  );
  return filtered.length > 0 ? filtered : undefined;
}

export function newBlankProject(id: string): Project {
  const now = Date.now();
  return {
    id,
    title: "Untitled Tier List",
    tiers: emptyTiers(),
    unranked: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Starts a fresh board from a template: every item begins in the unranked tray. */
export function projectFromTemplate(template: Template, id: string): Project {
  const now = Date.now();
  const validTiers = normalizeDefaultTiers(template.defaultTiers);
  const tiers: TierRow[] = validTiers
    ? validTiers.map((tier, index) => ({
        id: `tier-${index}`,
        label: tier.label,
        color: tier.color,
        items: [],
      }))
    : emptyTiers();

  return {
    id,
    title: template.title,
    tiers,
    unranked: template.items ? template.items.map((item) => ({ ...item })) : [],
    templateId: template.id,
    createdAt: now,
    updatedAt: now,
  };
}

export function getItems(board: Board, containerId: string): Item[] {
  if (containerId === UNRANKED) return board.unranked;
  return board.tiers.find((tier) => tier.id === containerId)?.items ?? [];
}

export function setItems(board: Board, containerId: string, items: Item[]): Board {
  if (containerId === UNRANKED) return { ...board, unranked: items };
  return {
    ...board,
    tiers: board.tiers.map((tier) => (tier.id === containerId ? { ...tier, items } : tier)),
  };
}

/** Returns the container id for either a container id or an item id. */
export function findContainer(board: Board, id: string | null | undefined): string | undefined {
  if (!id) return undefined;
  if (id === UNRANKED || board.tiers.some((tier) => tier.id === id)) return id;
  if (board.unranked.some((item) => item.id === id)) return UNRANKED;
  return board.tiers.find((tier) => tier.items.some((item) => item.id === id))?.id;
}

export function countRanked(board: Board): number {
  return board.tiers.reduce((sum, tier) => sum + tier.items.length, 0);
}
