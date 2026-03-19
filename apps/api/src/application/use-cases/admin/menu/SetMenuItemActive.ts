import type { MenuItem } from "../../../../domain/entities/MenuItem.js";
import type { IMenuItemRepository } from "../../../ports/repositories/IMenuItemRepository.js";

type AdminMenuItemRepository = IMenuItemRepository & {
  findById(itemId: string): Promise<MenuItem | null>;
  setMenuItemActive(input: { itemId: string; isActive: boolean }): Promise<MenuItem | null>;
};

function appError(code: string, status: number, details?: Record<string, unknown>) {
  const err = new Error(code) as Error & {
    status: number;
    code: string;
    details?: Record<string, unknown>;
  };

  err.status = status;
  err.code = code;

  if (details !== undefined) {
    err.details = details;
  }

  return err;
}

export class SetMenuItemActive {
  constructor(private readonly repo: AdminMenuItemRepository) {}

  async execute(input: {
    itemId: string;
    isActive: boolean;
    actor?: { role?: string | null; branchId?: string | null };
  }) {
    const itemId = String(input.itemId ?? "").trim();
    if (!itemId) {
      throw appError("ITEM_ID_REQUIRED", 400);
    }

    const existing = await this.repo.findById(itemId);
    if (!existing) {
      throw appError("MENU_ITEM_NOT_FOUND", 404, { itemId });
    }

    const nextActive = Boolean(input.isActive);
    if (existing.isActive === nextActive) {
      return existing;
    }

    const updated = await this.repo.setMenuItemActive({
      itemId,
      isActive: nextActive,
    });

    if (!updated) {
      throw appError("MENU_ITEM_NOT_FOUND", 404, { itemId });
    }

    return updated;
  }
}