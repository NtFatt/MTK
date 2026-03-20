import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { CustomerMythmakerBackdrop } from "../components/CustomerMythmakerBackdrop";

import { useMenuQuery } from "../hooks/useMenuQuery";

import { cn } from "../../../../shared/utils/cn";
import { StickyCartBar } from "../components/StickyCartBar";
import { useCartQuery } from "../../cart/hooks/useCartQuery";
import type { MenuCategory, MenuItem } from "../types";
import { useRealtimeRoom } from "../../../../shared/realtime";

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
  const customerRealtimeCtx = sessionKey
    ? {
        kind: "customer" as const,
        userKey: sessionKey,
        sessionKey,
        branchId: branchId ?? undefined,
      }
    : undefined;

  useRealtimeRoom(
    sessionKey ? `sessionKey:${sessionKey}` : null,
    !!sessionKey,
    customerRealtimeCtx,
  );

  useRealtimeRoom(
    branchId && sessionKey ? `branch:${branchId}` : null,
    !!branchId && !!sessionKey,
    customerRealtimeCtx,
  );

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

    const discount = Number(cartQuery.data?.discount ?? cartQuery.data?.voucher?.discountAmount ?? 0);

    return { count, total, discount };
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
          (c.name.toLowerCase().includes("lẩu") || c.name.toLowerCase().includes("nước lẩu"))
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
    <div className={cn("customer-mythmaker-shell flex min-h-screen flex-col overflow-x-clip")}>
      <CustomerMythmakerBackdrop />
      <CustomerNavbar />

      <main className={cn("relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28 md:py-8")}>
        <HeroBanner
          cartItemCount={cartSummary.count}
          cartTotalLabel={formatVnd(cartSummary.total)}
          cartSavingsLabel={cartSummary.discount > 0 ? formatVnd(cartSummary.discount) : null}
          activeQuickFilter={activeQuickFilter}
          onQuickFilterSelect={handleHeroQuickFilter}
          onBrowseMenu={scrollToMenuGrid}
          featuredItems={featuredItems}
        />

        <div className="mt-8">
          {pageState === "skeleton" ? <MenuSkeleton /> : null}
          {pageState === "empty" ? <MenuEmpty /> : null}
          {showLoading ? <MenuSkeleton /> : null}

          {showError ? (
            <div className="customer-hotpot-receipt rounded-[28px] border border-[#e4bfb4] p-5 text-[#8e3028]">
              <p className="font-medium">{error?.message ?? "Có lỗi xảy ra."}</p>
              {error?.correlationId ? (
                <p className="mt-1 text-xs opacity-80">Mã: {error.correlationId}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => refetch()}
                  className={cn(
                    "rounded-full bg-[#c93d2d] px-4 py-2 text-sm font-medium text-[#fff6ef] shadow-[0_16px_30px_-22px_rgba(88,26,18,0.86)]"
                  )}
                >
                  Tải lại thực đơn
                </button>
              </div>
            </div>
          ) : null}

          {showEmpty ? <MenuEmpty /> : null}

          {showReadyContent ? (
            <section className="customer-mythmaker-panel rounded-[30px] p-4 sm:p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-[#8f6f5f]">
                    Danh mục treo bếp
                  </div>
                  <div className="customer-mythmaker-title mt-1 text-3xl font-semibold text-[#57121a]">
                    Chọn món theo quầy
                  </div>
                </div>

                <div className="hidden rounded-full border border-[#e4c89d]/80 bg-[#fff8ec] px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#8b643e] md:block">
                  The tre thuc don
                </div>
              </div>

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

              {onlyAvailable ? (
                <div className="customer-hotpot-receipt mt-4 flex items-center justify-between gap-3 rounded-[22px] px-4 py-3">
                  <div className="text-sm text-[#7a5a43]">
                    Đang lọc <span className="font-medium text-[#4d2a18]">món còn hàng</span>.
                  </div>

                  <button
                    type="button"
                    onClick={() => setOnlyAvailable(false)}
                    className="rounded-full border border-[#e0c49d]/80 bg-[#fff8ed] px-4 py-2 text-sm font-medium text-[#7f5a37] transition hover:bg-[#fff2df]"
                  >
                    Bỏ lọc
                  </button>
                </div>
              ) : null}

              <div id="menu-grid" className="mt-6">
                <MenuGrid items={filteredItems} />
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <StickyCartBar />
      <CustomerFooter />
    </div>
  );
}
