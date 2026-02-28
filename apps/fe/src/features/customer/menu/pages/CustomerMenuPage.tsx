import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCustomerSessionStore, selectBranchId, selectSessionKey } from "../../../../shared/customer/session/sessionStore";

import { CustomerNavbar } from "../components/CustomerNavbar";
import { HeroBanner } from "../components/HeroBanner";
import { CategoryTabs } from "../components/CategoryTabs";
import { MenuGrid } from "../components/MenuGrid";
import { MenuSkeleton } from "../components/MenuSkeleton";
import { MenuEmpty } from "../components/MenuEmpty";
import { CustomerFooter } from "../components/CustomerFooter";

import { CATEGORIES, ITEMS } from "../data/mockMenu";
import { useMenuQuery } from "../hooks/useMenuQuery";

import { cn } from "../../../../shared/utils/cn";
import { StickyCartBar } from "../components/StickyCartBar";
import { useCartQuery } from "../../cart/hooks/useCartQuery";
import type { MenuCategory, MenuItem } from "../types";

type PageState = "ready" | "skeleton" | "empty" | "mock";

function getStateFromSearchParams(searchParams: URLSearchParams): PageState {
  const state = searchParams.get("state");
  if (state === "skeleton" || state === "empty" || state === "ready" || state === "mock") {
    return state;
  }
  return "ready";
}

function buildCategoriesForUi(categories: { id: string; name: string }[]): MenuCategory[] {
  return [{ id: "all", name: "Tất cả" }, ...categories];
}

function buildItemsForUi(items: unknown): MenuItem[] {
  const arr = Array.isArray(items) ? items : [];
  return arr.map((i: any) => {
    // ✅ chịu nhiều tên field stock khác nhau
    const rawRemain =
      i.remainingQty ??
      i.remaining_qty ??
      i.remainQty ??
      i.stockQty ??
      i.stock?.remainingQty ??
      i.stock?.remaining_qty ??
      i.stock?.qty ??
      i.inventory?.remainingQty;

    const remainingQty = rawRemain == null ? undefined : Number(rawRemain);

    const rawAvail =
      i.isAvailable ??
      i.available ??
      i.is_available ??
      i.canOrder ??
      true;

    const outOfStockByRemain = remainingQty != null && remainingQty <= 0;

    return {
      id: String(i.id),
      name: String(i.name ?? ""),
      price: Number(i.price ?? 0),
      imageUrl: i.imageUrl ? String(i.imageUrl) : undefined,
      categoryId: i.categoryId ? String(i.categoryId) : "",
      tags: Array.isArray(i.tags) ? (i.tags as string[]) : undefined,

      remainingQty,
      isAvailable: Boolean(rawAvail) && !outOfStockByRemain,
    };
  });
}

export function CustomerMenuPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageState = getStateFromSearchParams(searchParams);
  const branchId = useCustomerSessionStore(selectBranchId);
  const sessionKey = useCustomerSessionStore(selectSessionKey);

  const menuQuery = useMenuQuery(branchId ? { branchId } : {});
  const cartQuery = useCartQuery(sessionKey);
  const cartSummary = useMemo(() => {
    const items = cartQuery.data?.items ?? [];
    const count = items.reduce((acc: number, it: any) => acc + Number(it.qty ?? it.quantity ?? 1), 0);

    const total =
      Number(cartQuery.data?.total ?? cartQuery.data?.subtotal ?? NaN) ||
      items.reduce((acc: number, it: any) => acc + Number(it.lineTotal ?? (it.price ?? 0) * (it.qty ?? it.quantity ?? 1)), 0);

    return { count, total };
  }, [cartQuery.data]);

  function formatVnd(price: number): string {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  }
  const { data: menuData, isLoading, isError, error, refetch } = menuQuery;

  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");

  const { categories, filteredItems, countByCategoryId, itemsUi } = useMemo(() => {
    // MOCK MODE
    if (pageState === "mock") {
      const map: Record<string, number> = {};
      for (const item of ITEMS) {
        map[item.categoryId] = (map[item.categoryId] ?? 0) + 1;
      }
      map["all"] = ITEMS.length;

      const filtered =
        activeCategoryId === "all"
          ? ITEMS
          : ITEMS.filter((item) => item.categoryId === activeCategoryId);

      return {
        categories: CATEGORIES,
        filteredItems: filtered,
        countByCategoryId: map,
        itemsUi: ITEMS,
      };
    }

    // API MODE (safe normalize)
    const apiCategories = Array.isArray(menuData?.categories) ? menuData!.categories : [];
    const categoriesUi = buildCategoriesForUi(apiCategories);

    const itemsUi = buildItemsForUi(menuData?.items);

    const map: Record<string, number> = {};
    for (const item of itemsUi) {
      if (item.categoryId) map[item.categoryId] = (map[item.categoryId] ?? 0) + 1;
    }
    map["all"] = itemsUi.length;

    const filtered =
      activeCategoryId === "all"
        ? itemsUi
        : itemsUi.filter((item) => item.categoryId === activeCategoryId);

    return {
      categories: categoriesUi,
      filteredItems: filtered,
      countByCategoryId: map,
      itemsUi,
    };
  }, [pageState, menuData, activeCategoryId]);

  const showLoading = pageState === "ready" && isLoading;
  const showError = pageState === "ready" && isError;

  // ✅ empty dựa trên itemsUi (đã normalize), không dựa menuData.items trực tiếp
  const showEmpty =
    pageState === "ready" && !isLoading && !isError && itemsUi.length === 0;

  const showReadyContent =
    (pageState === "ready" && !isLoading && !isError && itemsUi.length > 0) ||
    pageState === "mock";

  return (
    <div className={cn("flex min-h-screen flex-col bg-background")}>
      <CustomerNavbar />
      <main className={cn("mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24")}>        <div className="mt-8">
        {pageState === "skeleton" && <MenuSkeleton />}
        {pageState === "empty" && <MenuEmpty />}
        {showLoading && <MenuSkeleton />}

        {showError && (
          <div className={cn("rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive")}>
            <p className="font-medium">{error?.message ?? "Có lỗi xảy ra."}</p>
            {error?.correlationId && (
              <p className="mt-1 text-xs opacity-80">Mã: {error.correlationId}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => refetch()}
                className={cn("rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground")}
              >
                Thử lại
              </button>
              <button
                type="button"
                onClick={() => setSearchParams({ state: "mock" })}
                className={cn("text-sm underline underline-offset-2")}
              >
                Dùng dữ liệu mẫu
              </button>
            </div>
          </div>
        )}

        {showEmpty && <MenuEmpty />}

        {showReadyContent && (
          <>
            <CategoryTabs
              categories={categories}
              activeCategoryId={activeCategoryId}
              onChange={setActiveCategoryId}
              countByCategoryId={countByCategoryId}
            />
            <div className="mt-6">
              <MenuGrid items={filteredItems} />
            </div>
          </>
        )}
      </div>
      </main>
      <StickyCartBar />
      {sessionKey && cartSummary.count > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 pb-4">
          <div className="mx-auto w-full max-w-6xl px-4">
            <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
              <div className="min-w-0">
                <div className="text-sm font-semibold">Giỏ hàng • {cartSummary.count} món</div>
                <div className="truncate text-xs text-muted-foreground">Tạm tính: {formatVnd(cartSummary.total)}</div>
              </div>

              <Link
                to="/c/cart"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Xem giỏ
              </Link>
            </div>
          </div>
        </div>
      )}

      <CustomerFooter />
    </div>
  );
}
