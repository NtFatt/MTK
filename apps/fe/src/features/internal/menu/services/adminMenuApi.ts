import { apiFetchAuthed } from "../../../../shared/http/authedFetch";

export type AdminMenuCategory = {
    id: string;
    name: string;
    code?: string;
    sortOrder?: number;
    isActive?: boolean;
    itemCount?: number;
    activeItemCount?: number;
};

export type AdminMenuItem = {
    id: string;
    categoryId: string;
    categoryName?: string;
    name: string;
    price: number;
    description?: string | null;
    imageUrl?: string | null;
    isActive: boolean;
    isCombo?: boolean;
    isMeat?: boolean;
    stockQty?: number | null;
};

export type AdminMenuItemsQuery = {
    branchId?: string | number | null;
    categoryId?: string | number | null;
    q?: string | null;
    isActive?: boolean | null;
    limit?: number | null;
    offset?: number | null;
};

export type AdminMenuItemsResult = {
    items: AdminMenuItem[];
    total: number;
};

export type CreateMenuItemInput = {
    categoryId: string;
    name: string;
    price: number;
    description?: string | null;
    imageUrl?: string | null;
    isActive?: boolean;
};

export type UpdateMenuItemInput = {
    itemId: string;
    categoryId?: string;
    name?: string;
    price?: number;
    description?: string | null;
    imageUrl?: string | null;
    isActive?: boolean;
};

export type SetMenuItemActiveInput = {
    itemId: string;
    isActive: boolean;
};

export type CreateMenuCategoryInput = {
    name: string;
    sortOrder?: number;
    isActive?: boolean;
};

export type UpdateMenuCategoryInput = {
    categoryId: string;
    name?: string;
    sortOrder?: number;
    isActive?: boolean;
};

export type DeleteMenuCategoryInput = {
    categoryId: string;
};

function asArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];

    const obj = value as Record<string, unknown> | null;
    const candidates = [
        obj?.items,
        (obj?.data as Record<string, unknown> | undefined)?.items,
        obj?.data,
        obj?.result,
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) return candidate as T[];
    }

    return [];
}

function normalizeCategory(row: any): AdminMenuCategory {
    return {
        id: String(row?.id ?? row?.categoryId ?? row?.category_id ?? ""),
        name: String(row?.name ?? row?.categoryName ?? row?.category_name ?? ""),
        code: row?.code != null ? String(row.code) : undefined,
        sortOrder:
            row?.sortOrder != null
                ? Number(row.sortOrder)
                : row?.sort_order != null
                    ? Number(row.sort_order)
                    : undefined,
        isActive:
            row?.isActive != null
                ? Boolean(row.isActive)
                : row?.is_active != null
                    ? Boolean(Number(row.is_active))
                    : undefined,
        itemCount:
            row?.itemCount != null
                ? Number(row.itemCount)
                : row?.item_count != null
                    ? Number(row.item_count)
                    : undefined,
        activeItemCount:
            row?.activeItemCount != null
                ? Number(row.activeItemCount)
                : row?.active_item_count != null
                    ? Number(row.active_item_count)
                    : undefined,
    };
}

function normalizeItem(row: any): AdminMenuItem {
    return {
        id: String(row?.id ?? row?.itemId ?? row?.item_id ?? ""),
        categoryId: String(row?.categoryId ?? row?.category_id ?? ""),
        categoryName:
            row?.categoryName != null
                ? String(row.categoryName)
                : row?.category_name != null
                    ? String(row.category_name)
                    : undefined,
        name: String(row?.name ?? row?.itemName ?? row?.item_name ?? ""),
        price: Number(row?.price ?? 0),
        description: row?.description == null ? null : String(row.description),
        imageUrl:
            row?.imageUrl != null
                ? String(row.imageUrl)
                : row?.image_url != null
                    ? String(row.image_url)
                    : null,
        isActive:
            row?.isActive != null
                ? Boolean(row.isActive)
                : Boolean(Number(row?.is_active ?? 0)),
        isCombo:
            row?.isCombo != null
                ? Boolean(row.isCombo)
                : row?.is_combo != null
                    ? Boolean(Number(row.is_combo))
                    : undefined,
        isMeat:
            row?.isMeat != null
                ? Boolean(row.isMeat)
                : row?.is_meat != null
                    ? Boolean(Number(row.is_meat))
                    : undefined,
        stockQty:
            row?.stockQty != null
                ? Number(row.stockQty)
                : row?.stock_qty != null
                    ? Number(row.stock_qty)
                    : null,
    };
}

export async function fetchAdminMenuCategories(
    params: { branchId?: string | number | null } = {},
) {
    const search = new URLSearchParams();

    if (params.branchId != null && String(params.branchId).trim()) {
        search.set("branchId", String(params.branchId).trim());
    }

    const qs = search.toString();
    const res = await apiFetchAuthed<unknown>(`/admin/menu/categories${qs ? `?${qs}` : ""}`);

    return asArray<unknown>(res).map(normalizeCategory);
}

export async function fetchAdminMenuItems(
    params: AdminMenuItemsQuery = {},
): Promise<AdminMenuItemsResult> {
    const search = new URLSearchParams();

    if (params.branchId != null && String(params.branchId).trim()) {
        search.set("branchId", String(params.branchId).trim());
    }

    if (params.categoryId != null && String(params.categoryId).trim()) {
        search.set("categoryId", String(params.categoryId).trim());
    }

    if (params.q != null && String(params.q).trim()) {
        search.set("q", String(params.q).trim());
    }

    if (params.isActive !== null && params.isActive !== undefined) {
        search.set("isActive", String(params.isActive));
    } else {
        search.set("includeInactive", "true");
    }

    if (params.limit != null && Number.isFinite(Number(params.limit))) {
        search.set("limit", String(params.limit));
    }

    if (params.offset != null && Number.isFinite(Number(params.offset))) {
        search.set("offset", String(params.offset));
    }

    search.set("sort", "newest");

    const qs = search.toString();
    const res = await apiFetchAuthed<unknown>(`/admin/menu/items${qs ? `?${qs}` : ""}`);

    const obj = res as Record<string, unknown> | null;
    const rows = asArray<unknown>(obj?.items ?? res).map(normalizeItem);
    const totalRaw = obj?.total;
    const total = Number.isFinite(Number(totalRaw)) ? Number(totalRaw) : rows.length;

    return {
        items: rows,
        total,
    };
}

export async function createMenuItem(input: CreateMenuItemInput): Promise<AdminMenuItem> {
    const res = await apiFetchAuthed<unknown>("/admin/menu/items", {
        method: "POST",
        body: JSON.stringify({
            categoryId: input.categoryId,
            name: input.name,
            price: input.price,
            description: input.description ?? null,
            imageUrl: input.imageUrl ?? null,
            isActive: input.isActive ?? true,
        }),
    });

    return normalizeItem(res);
}

export async function createMenuCategory(
    input: CreateMenuCategoryInput,
): Promise<AdminMenuCategory> {
    const res = await apiFetchAuthed<unknown>("/admin/menu/categories", {
        method: "POST",
        body: JSON.stringify({
            name: input.name,
            sortOrder: input.sortOrder ?? 0,
            isActive: input.isActive ?? true,
        }),
    });

    return normalizeCategory(res);
}

export async function updateMenuCategory(
    input: UpdateMenuCategoryInput,
): Promise<AdminMenuCategory> {
    const { categoryId, ...patch } = input;

    const res = await apiFetchAuthed<unknown>(
        `/admin/menu/categories/${encodeURIComponent(categoryId)}`,
        {
            method: "PUT",
            body: JSON.stringify(patch),
        },
    );

    return normalizeCategory(res);
}

export async function deleteMenuCategory(
    input: DeleteMenuCategoryInput,
): Promise<void> {
    await apiFetchAuthed<unknown>(
        `/admin/menu/categories/${encodeURIComponent(input.categoryId)}`,
        {
            method: "DELETE",
        },
    );
}

export async function updateMenuItem(input: UpdateMenuItemInput): Promise<AdminMenuItem> {
    const { itemId, ...patch } = input;

    const res = await apiFetchAuthed<unknown>(
        `/admin/menu/items/${encodeURIComponent(itemId)}`,
        {
            method: "PUT",
            body: JSON.stringify(patch),
        },
    );

    return normalizeItem(res);
}

export async function setMenuItemActive(
    input: SetMenuItemActiveInput,
): Promise<AdminMenuItem> {
    const res = await apiFetchAuthed<unknown>(
        `/admin/menu/items/${encodeURIComponent(input.itemId)}/active`,
        {
            method: "PATCH",
            body: JSON.stringify({ isActive: input.isActive }),
        },
    );

    return normalizeItem(res);
}
