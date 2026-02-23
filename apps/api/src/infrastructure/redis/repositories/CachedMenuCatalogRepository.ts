import type {
  IMenuCatalogRepository,
  MenuItemListQuery,
} from "../../../application/ports/repositories/IMenuCatalogRepository.js";
import { MenuCategory } from "../../../domain/entities/MenuCategory.js";
import { MenuItem } from "../../../domain/entities/MenuItem.js";
import { MeatProfile, type MeatKind } from "../../../domain/entities/MeatProfile.js";
import { ComboDetail, type ComboLine } from "../../../domain/entities/ComboDetail.js";
import type { RedisClient } from "../redisClient.js";

type CacheOpts = {
  ttlSeconds: number;
  versionKey?: string;
  prefix?: string;
};

function stableStringify(obj: unknown): string {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map((x) => stableStringify(x)).join(",")}]`;

  const o = obj as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`);
  return `{${parts.join(",")}}`;
}

function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  return Number(v) === 1;
}

function toMeatKind(v: unknown): MeatKind {
  const s = String(v ?? "OTHER").toUpperCase();
  if (s === "BEEF" || s === "PORK" || s === "LAMB" || s === "CHICKEN" || s === "SEAFOOD") return s;
  return "OTHER";
}

export class CachedMenuCatalogRepository implements IMenuCatalogRepository {
  private readonly ttlSeconds: number;
  private readonly versionKey: string;
  private readonly prefix: string;

  constructor(
    private readonly inner: IMenuCatalogRepository,
    private readonly redis: RedisClient,
    opts: CacheOpts,
  ) {
    this.ttlSeconds = Math.max(30, Math.floor(opts.ttlSeconds));
    this.versionKey = opts.versionKey ?? "menu:ver";
    this.prefix = opts.prefix ?? "menu";
  }

  private async getVersion(): Promise<string> {
    const v = await this.redis.get(this.versionKey);
    if (v && v.trim().length > 0) return v.trim();

    // Try to set initial version exactly once.
    try {
      await this.redis.set(this.versionKey, "1", { NX: true });
    } catch {
      // ignore
    }

    return (await this.redis.get(this.versionKey))?.trim() || "1";
  }

  private async getOrSetJson<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        // fallthrough (corrupt cache)
      }
    }

    const fresh = await loader();
    try {
      await this.redis.set(key, JSON.stringify(fresh), { EX: this.ttlSeconds });
    } catch {
      // ignore cache write errors
    }
    return fresh;
  }

  private async key(parts: string[]): Promise<string> {
    const ver = await this.getVersion();
    return `${this.prefix}:v${ver}:${parts.join(":")}`;
  }

  async listCategories(activeOnly: boolean = true): Promise<MenuCategory[]> {
    const k = await this.key(["categories", activeOnly ? "active" : "all"]);

    const raw = await this.getOrSetJson<any[]>(k, async () => {
      const cats = await this.inner.listCategories(activeOnly);
      return cats.map((c) => ({ id: c.id, name: c.name, sortOrder: c.sortOrder, isActive: c.isActive }));
    });

    return (raw ?? []).map(
      (r: any) => new MenuCategory(String(r.id), String(r.name), Number(r.sortOrder ?? 0), toBool(r.isActive)),
    );
  }

  async listItems(query: MenuItemListQuery): Promise<{ items: MenuItem[]; total: number }> {
    // Cache key includes the full query (including paging) to avoid mixing different result sets.
    const qKey = stableStringify({
      categoryId: query.categoryId ?? null,
      q: query.q ?? null,
      isActive: query.isActive ?? null,
      branchId: query.branchId ?? null,
      onlyInStock: query.onlyInStock ?? null,
      sort: query.sort ?? null,
      limit: query.limit ?? null,
      offset: query.offset ?? null,
    });

    const k = await this.key(["items", qKey]);

    const raw = await this.getOrSetJson<{ items: any[]; total: number }>(k, async () => {
      const { items, total } = await this.inner.listItems(query);
      return {
        total,
        items: items.map((it) => ({
          id: it.id,
          categoryId: it.categoryId,
          name: it.name,
          price: it.price,
          description: it.description ?? null,
          imageUrl: it.imageUrl ?? null,
          isActive: it.isActive,
          stockQty: it.stockQty ?? null,
          categoryName: it.categoryName ?? null,
          isCombo: it.isCombo ?? false,
          isMeat: it.isMeat ?? false,
        })),
      };
    });

    return {
      total: Number(raw?.total ?? 0),
      items: (raw?.items ?? []).map(
        (r: any) =>
          new MenuItem(
            String(r.id),
            String(r.categoryId),
            String(r.name),
            Number(r.price ?? 0),
            r.description === null ? null : String(r.description ?? ""),
            r.imageUrl === null ? null : String(r.imageUrl ?? ""),
            toBool(r.isActive),
            r.stockQty === null || r.stockQty === undefined ? null : Number(r.stockQty),
            r.categoryName === null ? null : String(r.categoryName ?? ""),
            toBool(r.isCombo),
            toBool(r.isMeat),
          ),
      ),
    };
  }

  async getItemById(itemId: string): Promise<MenuItem | null> {
    const k = await this.key(["item", String(itemId)]);

    const raw = await this.getOrSetJson<any | null>(k, async () => {
      const it = await this.inner.getItemById(itemId);
      if (!it) return null;
      return {
        id: it.id,
        categoryId: it.categoryId,
        name: it.name,
        price: it.price,
        description: it.description ?? null,
        imageUrl: it.imageUrl ?? null,
        isActive: it.isActive,
        stockQty: it.stockQty ?? null,
        categoryName: it.categoryName ?? null,
        isCombo: it.isCombo ?? false,
        isMeat: it.isMeat ?? false,
      };
    });

    if (!raw) return null;
    return new MenuItem(
      String(raw.id),
      String(raw.categoryId),
      String(raw.name),
      Number(raw.price ?? 0),
      raw.description === null ? null : String(raw.description ?? ""),
      raw.imageUrl === null ? null : String(raw.imageUrl ?? ""),
      toBool(raw.isActive),
      raw.stockQty === null || raw.stockQty === undefined ? null : Number(raw.stockQty),
      raw.categoryName === null ? null : String(raw.categoryName ?? ""),
      toBool(raw.isCombo),
      toBool(raw.isMeat),
    );
  }

  async getMeatProfile(itemId: string): Promise<MeatProfile | null> {
    const k = await this.key(["meat", String(itemId)]);

    const raw = await this.getOrSetJson<any | null>(k, async () => {
      const mp = await this.inner.getMeatProfile(itemId);
      if (!mp) return null;
      return {
        itemId: mp.itemId,
        meatKind: mp.meatKind,
        cut: mp.cut,
        origin: mp.origin ?? null,
        portionGrams: mp.portionGrams ?? null,
        marblingLevel: mp.marblingLevel ?? null,
      };
    });

    if (!raw) return null;
    return new MeatProfile(
      String(raw.itemId),
      toMeatKind(raw.meatKind),
      String(raw.cut),
      raw.origin === null ? null : String(raw.origin ?? ""),
      raw.portionGrams === null || raw.portionGrams === undefined ? null : Number(raw.portionGrams),
      raw.marblingLevel === null || raw.marblingLevel === undefined ? null : Number(raw.marblingLevel),
    );
  }

  async getComboDetailByItemId(itemId: string): Promise<ComboDetail | null> {
    const k = await this.key(["combo", String(itemId)]);

    const raw = await this.getOrSetJson<any | null>(k, async () => {
      const cd = await this.inner.getComboDetailByItemId(itemId);
      if (!cd) return null;
      return {
        comboId: cd.comboId,
        comboItemId: cd.comboItemId,
        serveFor: cd.serveFor,
        allowCustomization: cd.allowCustomization,
        lines: (cd.lines ?? []).map((l: ComboLine) => ({ ...l })),
      };
    });

    if (!raw) return null;
    const lines: ComboLine[] = Array.isArray(raw.lines)
      ? raw.lines.map((l: any) => ({
          itemId: String(l.itemId),
          itemName: String(l.itemName),
          price: Number(l.price ?? 0),
          quantity: Number(l.quantity ?? 1),
          groupName: l.groupName === null ? null : String(l.groupName ?? ""),
          isRequired: toBool(l.isRequired),
          sortOrder: Number(l.sortOrder ?? 0),
        }))
      : [];

    return new ComboDetail(
      String(raw.comboId),
      String(raw.comboItemId),
      Number(raw.serveFor ?? 1),
      toBool(raw.allowCustomization),
      lines,
    );
  }

  // Optional: external invalidation can simply bump the version.
  // Not wired by default (no menu-admin endpoints yet).
  async bumpVersion(): Promise<number> {
    const n = await this.redis.incr(this.versionKey);
    return Number(n);
  }
}
