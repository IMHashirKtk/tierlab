import { cache } from "react";
import { fetchTemplateById, fetchSharedTierList, fetchUserProfile } from "@/lib/community";

// Request-scoped only: deduplicate metadata + page reads without keeping hidden
// content in a cross-request cache after a moderation change.
export const getPublicTemplate = cache(fetchTemplateById);
export const getPublicRanking = cache(fetchSharedTierList);
export const getPublicProfile = cache(fetchUserProfile);
