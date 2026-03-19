import type { MenuItem } from "../../../../domain/entities/MenuItem.js";
import type { IMenuItemRepository } from "../../../ports/repositories/IMenuItemRepository.js";

type AdminMenuItemRepository = IMenuItemRepository & {
    findById(itemId: string): Promise<MenuItem | null>;
    existsCategory(categoryId: string): Promise<boolean>;
    updateMenuItem(input: {
        itemId: string;
        categoryId?: string;
        name?: string;
        price?: number;
        description?: string | null;
        imageUrl?: string | null;
        isActive?: boolean;
    }): Promise<MenuItem | null>;
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
function normalizeOptionalText(value: unknown): string | undefined {
    if (value === undefined) return undefined;
    const text = String(value ?? "").trim();
    return text.length > 0 ? text : "";
}

function normalizeOptionalNullableText(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    const text = String(value ?? "").trim();
    return text.length > 0 ? text : null;
}

function normalizeOptionalUrl(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    const text = normalizeOptionalNullableText(value);
    if (text === null) return null;

    try {
        const url = new URL(String(text));
        if (url.protocol !== "http:" && url.protocol !== "https:") {
            throw new Error("INVALID_IMAGE_URL");
        }
        return url.toString();
    } catch {
        throw appError("INVALID_IMAGE_URL", 400, { imageUrl: value });
    }
}

export class UpdateMenuItem {
    constructor(private readonly repo: AdminMenuItemRepository) { }

    async execute(input: {
        itemId: string;
        categoryId?: string;
        name?: string;
        price?: number;
        description?: string | null;
        imageUrl?: string | null;
        isActive?: boolean;
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

        const patch: {
            itemId: string;
            categoryId?: string;
            name?: string;
            price?: number;
            description?: string | null;
            imageUrl?: string | null;
            isActive?: boolean;
        } = { itemId };

        const categoryId = normalizeOptionalText(input.categoryId);
        if (categoryId !== undefined) {
            if (!categoryId) {
                throw appError("CATEGORY_ID_REQUIRED", 400);
            }
            const categoryExists = await this.repo.existsCategory(categoryId);
            if (!categoryExists) {
                throw appError("CATEGORY_NOT_FOUND", 404, { categoryId });
            }
            patch.categoryId = categoryId;
        }

        const name = normalizeOptionalText(input.name);
        if (name !== undefined) {
            if (!name) {
                throw appError("ITEM_NAME_REQUIRED", 400);
            }
            if (name.length > 255) {
                throw appError("ITEM_NAME_TOO_LONG", 400);
            }
            patch.name = name;
        }

        if (input.price !== undefined) {
            const price = Number(input.price);
            if (!Number.isFinite(price) || price < 0) {
                throw appError("INVALID_PRICE", 400);
            }
            patch.price = price;
        }

        const description = normalizeOptionalNullableText(input.description);
        if (description !== undefined) {
            if (description && description.length > 2000) {
                throw appError("DESCRIPTION_TOO_LONG", 400);
            }
            patch.description = description;
        }

        const imageUrl = normalizeOptionalUrl(input.imageUrl);
        if (imageUrl !== undefined) {
            patch.imageUrl = imageUrl;
        }

        if (input.isActive !== undefined) {
            patch.isActive = Boolean(input.isActive);
        }

        if (
            patch.categoryId === undefined &&
            patch.name === undefined &&
            patch.price === undefined &&
            patch.description === undefined &&
            patch.imageUrl === undefined &&
            patch.isActive === undefined
        ) {
            throw appError("EMPTY_UPDATE_PAYLOAD", 400);
        }

        const updated = await this.repo.updateMenuItem(patch);
        if (!updated) {
            throw appError("MENU_ITEM_NOT_FOUND", 404, { itemId });
        }

        return updated;
    }
}