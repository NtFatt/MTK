/**
 * Menu API — contract-first.
 * Endpoints from BE_SPEC + packages/contracts:
 * - GET /api/v1/menu/categories
 * - GET /api/v1/menu/items
 *
 * NOTE: Backend may wrap payloads (e.g. { items: [...] } or { data: [...] }).
 * This module normalizes to arrays to prevent UI crashes.
 */
import { apiFetch } from "../../../../lib/apiFetch";

export type MenuCategoryDto = {
  id: string;
  name: string;
  code?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type MenuItemDto = {
  id: string;
  name: string;
  price?: number;
  categoryId?: string;
  imageUrl?: string;
  description?: string;
  isAvailable?: boolean;
  tags?: string[];
};

export type MenuViewModel = {
  categories: MenuCategoryDto[];
  items: MenuItemDto[];
};

export type MenuApiParams = {
  branchId?: string | number;
};

/** Normalize unknown response shapes to array safely. */
function asArray<T>(x: unknown): T[] {
  if (Array.isArray(x)) return x as T[];

  // common wrappers
  const o = x as any;
  const candidates = [
    o?.items,
    o?.data?.items,
    o?.data,
    o?.result?.items,
    o?.result,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c as T[];
  }
  return [];
}

async function fetchCategories(params: MenuApiParams = {}): Promise<MenuCategoryDto[]> {
  const search = new URLSearchParams();
  if (params.branchId != null) search.set("branchId", String(params.branchId));
  const qs = search.toString();

  // apiFetch đã proxy /api/v1, nên chỉ cần path sau /api/v1
  const path = `/menu/categories${qs ? `?${qs}` : ""}`;
  const res = await apiFetch<unknown>(path);
  return asArray<MenuCategoryDto>(res);
}

async function fetchItems(params: MenuApiParams = {}): Promise<MenuItemDto[]> {
  const search = new URLSearchParams();
  if (params.branchId != null) search.set("branchId", String(params.branchId));
  const qs = search.toString();

  const path = `/menu/items${qs ? `?${qs}` : ""}`;
  const res = await apiFetch<unknown>(path);
  return asArray<MenuItemDto>(res);
}

export async function fetchMenu(params: MenuApiParams = {}): Promise<MenuViewModel> {
  const [categories, items] = await Promise.all([
    fetchCategories(params),
    fetchItems(params),
  ]);

  return { categories, items };
}
