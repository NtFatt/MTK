import type {
  IMenuCatalogRepository,
  MenuItemListQuery,
} from "../../../application/ports/repositories/IMenuCatalogRepository.js";
import { MenuItem } from "../../../domain/entities/MenuItem.js";
import type { MenuCategory } from "../../../domain/entities/MenuCategory.js";
import type { MeatProfile } from "../../../domain/entities/MeatProfile.js";
import type { ComboDetail } from "../../../domain/entities/ComboDetail.js";
import type { RedisClient } from "../redisClient.js";

function toNonNegativeInt(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor(parsed));
}

function withStockQty(item: MenuItem, stockQty: number | null | undefined): MenuItem {
  return new MenuItem(
    item.id,
    item.categoryId,
    item.name,
    item.price,
    item.description ?? null,
    item.imageUrl ?? null,
    item.isActive,
    stockQty ?? null,
    item.categoryName ?? null,
    item.isCombo ?? false,
    item.isMeat ?? false,
  );
}

export class RedisAvailableMenuCatalogRepository implements IMenuCatalogRepository {
  private readonly stockPrefix: string;

  constructor(
    private readonly inner: IMenuCatalogRepository,
    private readonly redis: RedisClient,
    opts?: { stockPrefix?: string },
  ) {
    this.stockPrefix = opts?.stockPrefix ?? "stock";
  }

  private stockKey(branchId: string, itemId: string): string {
    return `${this.stockPrefix}:${branchId}:${itemId}`;
  }

  async listCategories(activeOnly?: boolean): Promise<MenuCategory[]> {
    return this.inner.listCategories(activeOnly);
  }

  async listItems(query: MenuItemListQuery): Promise<{ items: MenuItem[]; total: number }> {
    const out = await this.inner.listItems(query);
    const branchId = query.branchId ? String(query.branchId) : null;

    if (!branchId || out.items.length === 0) {
      return out;
    }

    const keys = out.items.map((item) => this.stockKey(branchId, item.id));

    let availableValues: Array<string | null> | null = null;
    try {
      availableValues = await this.redis.mGet(keys);
    } catch {
      return out;
    }

    const items = out.items.map((item, index) => {
      const available = toNonNegativeInt(availableValues?.[index]);
      return withStockQty(item, available ?? item.stockQty ?? null);
    });

    return {
      total: out.total,
      items,
    };
  }

  async getItemById(itemId: string): Promise<MenuItem | null> {
    return this.inner.getItemById(itemId);
  }

  async getMeatProfile(itemId: string): Promise<MeatProfile | null> {
    return this.inner.getMeatProfile(itemId);
  }

  async getComboDetailByItemId(itemId: string): Promise<ComboDetail | null> {
    return this.inner.getComboDetailByItemId(itemId);
  }
}
