export interface Item {
  id: string;
  name: string;
  imageUrl?: string;
  color?: string;
}

export interface TierRow {
  id: string;
  label: string;
  color: string;
  items: Item[];
}

/** A tier list board saved locally in the browser (IndexedDB). */
export interface Project {
  id: string;
  title: string;
  tiers: TierRow[];
  unranked: Item[];
  /** Set when the board was started from a community template. */
  templateId?: string;
  /** Persisted identifier when this project has been published to cloud. */
  publishedShareId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Template {
  isStarter?: boolean;
  id: string;
  slug: string;
  title: string;
  description: string;
  category: 'gaming' | 'anime' | 'food' | 'movies' | 'music' | 'sports' | 'pop-culture';
  author: {
    username: string;
    avatarUrl?: string;
    verified?: boolean;
  };
  itemCount: number;
  remixCount: number;
  upvotes: number;
  createdAt: string;
  items: Item[];
  defaultTiers?: { label: string; color: string }[];
  featured?: boolean;
  previewRows?: { tier: string; color: string; items: string[] }[];
}

export interface UserRanking {
  id: string;
  templateId: string;
  templateTitle: string;
  title: string;
  author: {
    username: string;
    avatarUrl?: string;
  };
  upvotes: number;
  commentsCount: number;
  createdAt: string;
  tierSummary: {
    tier: string;
    items: string[];
  }[];
  totalItems: number;
  totalTiers: number;
  isDemo?: boolean;
}

export interface PublishedTierList {
  id: string;
  templateId?: string;
  title: string;
  authorName: string;
  tiers: TierRow[];
  unranked: Item[];
  upvotes: number;
  createdAt: number;
}

export interface Comment {
  id: string;
  tierListId: string;
  authorName: string;
  content: string;
  upvotes: number;
  createdAt: number;
}
