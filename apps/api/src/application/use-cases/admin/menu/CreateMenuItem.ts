import type { MenuItem } from "../../../../domain/entities/MenuItem.js";
import type { IMenuItemRepository } from "../../../ports/repositories/IMenuItemRepository.js";

type AdminMenuItemRepository = IMenuItemRepository & {
    existsCategory(categoryId: string): Promise<boolean>;
    createMenuItem(input: {
        categoryId: string;
        name: string;
        price: number;
        description?: string | null;
        imageUrl?: string | null;
        isActive: boolean;
    }): Promise<MenuItem>;
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

function normalizeNullableText(value: unknown): string | null {
    const text = String(value ?? "").trim();
    return text.length > 0 ? text : null;
}

function normalizeUrl(value: unknown): string | null {
    const text = normalizeNullableText(value);
    if (!text) return null;

    try {
        const url = new URL(text);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
            throw new Error("INVALID_IMAGE_URL");
        }
        return url.toString();
    } catch {
        throw appError("INVALID_IMAGE_URL", 400, { imageUrl: value });
    }
}

export class CreateMenuItem {
    constructor(private readonly repo: AdminMenuItemRepository) { }

    async execute(input: {
        categoryId: string;
        name: string;
        price: number;
        description?: string | null;
        imageUrl?: string | null;
        isActive?: boolean;
        actor?: { role?: string | null; branchId?: string | null };
    }) {
        const categoryId = String(input.categoryId ?? "").trim();
        const name = String(input.name ?? "").trim();
        const price = Number(input.price);
        const description = normalizeNullableText(input.description);
        const imageUrl = normalizeUrl(input.imageUrl);
        const isActive = input.isActive ?? true;

        if (!categoryId) {
            throw appError("CATEGORY_ID_REQUIRED", 400);
        }

        if (!name) {
            throw appError("ITEM_NAME_REQUIRED", 400);
        }

        if (name.length > 255) {
            throw appError("ITEM_NAME_TOO_LONG", 400);
        }

        if (!Number.isFinite(price) || price < 0) {
            throw appError("INVALID_PRICE", 400);
        }

        if (description && description.length > 2000) {
            throw appError("DESCRIPTION_TOO_LONG", 400);
        }

        const categoryExists = await this.repo.existsCategory(categoryId);
        if (!categoryExists) {
            throw appError("CATEGORY_NOT_FOUND", 404, { categoryId });
        }

        return this.repo.createMenuItem({
            categoryId,
            name,
            price,
            description,
            imageUrl,
            isActive: Boolean(isActive),
        });
    }
}