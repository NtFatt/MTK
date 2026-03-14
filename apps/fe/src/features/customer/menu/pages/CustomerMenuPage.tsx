import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  useCustomerSessionStore,
  selectBranchId,
  selectSessionKey,
} from "../../../../shared/customer/session/sessionStore";

import { CustomerNavbar } from "../components/CustomerNavbar";
import { CategoryTabs } from "../components/CategoryTabs";
import { MenuGrid } from "../components/MenuGrid";
import { MenuSkeleton } from "../components/MenuSkeleton";
import { MenuEmpty } from "../components/MenuEmpty";
import { CustomerFooter } from "../components/CustomerFooter";
import { HeroBanner } from "../components/HeroBanner";

import { useMenuQuery } from "../hooks/useMenuQuery";

import { cn } from "../../../../shared/utils/cn";
import { StickyCartBar } from "../components/StickyCartBar";
import { useCartQuery } from "../../cart/hooks/useCartQuery";
import type { MenuCategory, MenuItem } from "../types";

type PageState = "ready" | "skeleton" | "empty";

function getStateFromSearchParams(searchParams: URLSearchParams): PageState {
  const state = searchParams.get("state");
  if (state === "skeleton" || state === "empty" || state === "ready") {
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

function formatVnd(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

export function CustomerMenuPage() {
  const [searchParams] = useSearchParams();
  const pageState = getStateFromSearchParams(searchParams);

  const branchId = useCustomerSessionStore(selectBranchId);
  const sessionKey = useCustomerSessionStore(selectSessionKey);

  const menuQuery = useMenuQuery(branchId ? { branchId } : {});
  const cartQuery = useCartQuery(sessionKey);

  const { data: menuData, isLoading, isError, error, refetch } = menuQuery;

  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const [activeQuickFilter, setActiveQuickFilter] = useState<
    "all" | "combo" | "available" | "lau" | null
  >(null);

  const cartSummary = useMemo(() => {
    const items = cartQuery.data?.items ?? [];

    const count = items.reduce(
      (acc: number, it: any) => acc + Number(it.qty ?? it.quantity ?? 1),
      0
    );

    const total =
      Number(cartQuery.data?.total ?? cartQuery.data?.subtotal ?? NaN) ||
      items.reduce(
        (acc: number, it: any) =>
          acc + Number(it.lineTotal ?? (it.price ?? 0) * (it.qty ?? it.quantity ?? 1)),
        0
      );

    return { count, total };
  }, [cartQuery.data]);

  const { categories, itemsUi, countByCategoryId } = useMemo(() => {
    const apiCategories = Array.isArray(menuData?.categories) ? menuData.categories : [];
    const categoriesUi = buildCategoriesForUi(apiCategories);

    const normalizedItems = buildItemsForUi(menuData?.items);

    const map: Record<string, number> = {};
    for (const item of normalizedItems) {
      if (item.categoryId) {
        map[item.categoryId] = (map[item.categoryId] ?? 0) + 1;
      }
    }
    map["all"] = normalizedItems.length;

    return {
      categories: categoriesUi,
      itemsUi: normalizedItems,
      countByCategoryId: map,
    };
  }, [menuData]);

  const filteredItems = useMemo(() => {
    let next =
      activeCategoryId === "all"
        ? itemsUi
        : itemsUi.filter((item) => item.categoryId === activeCategoryId);

    if (onlyAvailable) {
      next = next.filter((item) => item.isAvailable);
    }

    return next;
  }, [itemsUi, activeCategoryId, onlyAvailable]);

  const featuredItems = useMemo(() => {
    const availableItems = itemsUi.filter((item) => item.isAvailable);

    const comboItems = availableItems.filter((item) =>
      item.tags?.some((tag) => tag.toLowerCase().includes("combo"))
    );

    const preferred = comboItems.length > 0 ? comboItems : availableItems;

    return preferred.slice(0, 2).map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      isAvailable: item.isAvailable,
    }));
  }, [itemsUi]);

  function scrollToMenuGrid() {
    const el = document.getElementById("menu-grid");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function handleHeroQuickFilter(filterId: "all" | "combo" | "available" | "lau") {
    setActiveQuickFilter(filterId);

    if (filterId === "all") {
      setOnlyAvailable(false);
      setActiveCategoryId("all");
      scrollToMenuGrid();
      return;
    }

    if (filterId === "available") {
      setOnlyAvailable(true);
      setActiveCategoryId("all");
      scrollToMenuGrid();
      return;
    }

    setOnlyAvailable(false);

    if (filterId === "lau") {
      const match = categories.find(
        (c) =>
          c.id !== "all" &&
          (c.name.toLowerCase().includes("lẩu") ||
            c.name.toLowerCase().includes("nước lẩu"))
      );
      setActiveCategoryId(match ? match.id : "all");
      scrollToMenuGrid();
      return;
    }

    if (filterId === "combo") {
      const match = categories.find(
        (c) => c.id !== "all" && c.name.toLowerCase().includes("combo")
      );
      setActiveCategoryId(match ? match.id : "all");
      scrollToMenuGrid();
      return;
    }

    setActiveCategoryId("all");
    scrollToMenuGrid();
  }

  const showLoading = pageState === "ready" && isLoading;
  const showError = pageState === "ready" && isError;
  const showEmpty = pageState === "ready" && !isLoading && !isError && itemsUi.length === 0;
  const showReadyContent = pageState === "ready" && !isLoading && !isError && itemsUi.length > 0;

  return (
    <div className={cn("flex min-h-screen flex-col bg-background")}>
      <CustomerNavbar />

      <main className={cn("mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24")}>
        <HeroBanner
          cartItemCount={cartSummary.count}
          cartTotalLabel={formatVnd(cartSummary.total)}
          activeQuickFilter={activeQuickFilter}
          onQuickFilterSelect={handleHeroQuickFilter}
          featuredItems={featuredItems}
        />

        <div className="mt-8">
          {pageState === "skeleton" && <MenuSkeleton />}
          {pageState === "empty" && <MenuEmpty />}
          {showLoading && <MenuSkeleton />}

          {showError && (
            <div
              className={cn(
                "rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive"
              )}
            >
              <p className="font-medium">{error?.message ?? "Có lỗi xảy ra."}</p>
              {error?.correlationId && (
                <p className="mt-1 text-xs opacity-80">Mã: {error.correlationId}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => refetch()}
                  className={cn(
                    "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                  )}
                >
                  Thử lại
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
                onChange={(id) => {
                  setActiveQuickFilter(null);
                  setOnlyAvailable(false);
                  setActiveCategoryId(id);
                }}
                countByCategoryId={countByCategoryId}
              />

              {onlyAvailable && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
                  <div className="text-sm text-muted-foreground">
                    Đang lọc <span className="font-medium text-foreground">món còn hàng</span>.
                  </div>

                  <button
                    type="button"
                    onClick={() => setOnlyAvailable(false)}
                    className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                  >
                    Bỏ lọc
                  </button>
                </div>
              )}

              <div id="menu-grid" className="mt-6">
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
                <div className="truncate text-xs text-muted-foreground">
                  Tạm tính: {formatVnd(cartSummary.total)}
                </div>
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