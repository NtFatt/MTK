/**
 * opsMenuApi.ts
 *
 * Service layer for menu items used by Internal Ops (Tables page).
 * Endpoint: GET /api/v1/menu/items
 *
 * Contract reference:
 * - packages/contracts/src/route-manifest.ts  → menuItems
 * - packages/contracts/src/schemas/menu.ts     → zMenuItem
 * - packages/contracts/src/queryKeys.ts        → qk.menu.items
 *
 * NOTE: No /admin/ prefix — this is a public client endpoint that does NOT
 * require auth. Used here only to resolve item names for cart item previews.
 */

import { Schemas } from "@duong-hanh-phuc/contracts";
import { apiFetchAuthed } from "../../../../../shared/http/authedFetch";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MenuItemDto = {
  id: string;
  name: string;
};

type RawMenuItemRecord = {
  id?: string | number;
  itemId?: string | number;
  name?: string;
};

function asMenuItemDto(raw: unknown): MenuItemDto | null {
  const record = raw as RawMenuItemRecord | null;
  if (!record || typeof record !== "object") return null;

  const id =
    record.id != null
      ? String(record.id)
      : record.itemId != null
        ? String(record.itemId)
        : null;

  const name = typeof record.name === "string" && record.name.trim()
    ? record.name.trim()
    : null;

  if (!id || !name) return null;
  return { id, name };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export type FetchOpsMenuItemsParams = {
  branchId?: string | number;
  limit?: number;
};

export async function fetchOpsMenuItems(
  params: FetchOpsMenuItemsParams = {}
): Promise<MenuItemDto[]> {
  const search = new URLSearchParams();
  if (params.branchId != null) search.set("branchId", String(params.branchId));
  if (params.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  const path = `/menu/items${qs ? `?${qs}` : ""}`;

  const raw = await apiFetchAuthed<unknown>(path);

  // Primary: try direct array of menu items (common runtime shape)
  const directResult = Schemas.zMenuItem.array().safeParse(raw);
  if (directResult.success) {
    return (directResult.data as RawMenuItemRecord[])
      .map(asMenuItemDto)
      .filter((x): x is MenuItemDto => x !== null);
  }

  // Secondary: try envelope { items: [...] }
  const rawRecord = typeof raw === "object" && raw !== null
    ? (raw as Record<string, unknown>)
    : null;
  if (rawRecord && Array.isArray(rawRecord.items)) {
    const itemsResult = Schemas.zMenuItem.array().safeParse(rawRecord.items);
    if (itemsResult.success) {
      return (itemsResult.data as RawMenuItemRecord[])
        .map(asMenuItemDto)
        .filter((x): x is MenuItemDto => x !== null);
    }
  }

  // Fallback: raw array with permissive normalization
  if (Array.isArray(raw)) {
    return (raw as RawMenuItemRecord[])
      .map(asMenuItemDto)
      .filter((x): x is MenuItemDto => x !== null);
  }

  return [];
}
