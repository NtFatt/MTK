import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  useCustomerSessionStore,
  selectBranchId,
  selectSessionKey,
} from "../../../../shared/customer/session/sessionStore";
import {
  formatCustomerSessionRecoveryMessage,
  getCustomerSessionRecoveryReason,
} from "../../../../shared/customer/session/sessionRecovery";

import { CustomerNavbar } from "../components/CustomerNavbar";
import { CategoryTabs } from "../components/CategoryTabs";
import { MenuGrid } from "../components/MenuGrid";
import { MenuSkeleton } from "../components/MenuSkeleton";
import { MenuEmpty } from "../components/MenuEmpty";
import { CustomerFooter } from "../components/CustomerFooter";
import { HeroBanner } from "../components/HeroBanner";
import { CustomerMythmakerBackdrop } from "../components/CustomerMythmakerBackdrop";
import { MenuToolbar, type MenuSortMode } from "../components/MenuToolbar";

import { useMenuQuery } from "../hooks/useMenuQuery";

import { cn } from "../../../../shared/utils/cn";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { buttonVariants } from "../../../../shared/ui/button";
import { StickyCartBar } from "../components/StickyCartBar";
import { useCartQuery } from "../../cart/hooks/useCartQuery";
import type { MenuCategory, MenuItem } from "../types";
import { useRealtimeRoom } from "../../../../shared/realtime";

type PageState = "ready" | "skeleton" | "empty";
const MENU_PAGE_SIZE = 14;

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

function buildSearchableText(item: MenuItem): string {
  return [item.name, ...(item.tags ?? [])]
    .map((value) => value.toLowerCase())
    .join(" ");
}

function compareItems(left: MenuItem, right: MenuItem, sortMode: MenuSortMode): number {
  if (sortMode === "price-asc") return left.price - right.price;
  if (sortMode === "price-desc") return right.price - left.price;
  if (sortMode === "name-asc") return left.name.localeCompare(right.name, "vi");
  if (sortMode === "available-first") {
    if (left.isAvailable === right.isAvailable) {
      return left.name.localeCompare(right.name, "vi");
    }
    return left.isAvailable ? -1 : 1;
  }

  return 0;
}

export function CustomerMenuPage() {
  const [searchParams] = useSearchParams();
  const pageState = getStateFromSearchParams(searchParams);

  const branchId = useCustomerSessionStore(selectBranchId);
  const sessionKey = useCustomerSessionStore(selectSessionKey);
  const sessionRecoveryReason = getCustomerSessionRecoveryReason();
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
  const sessionRecoveryMessage = sessionRecoveryReason
    ? formatCustomerSessionRecoveryMessage(sessionRecoveryReason)
    : null;

  const { data: menuData, isLoading, isError, error, refetch } = menuQuery;

  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState<MenuSortMode>("featured");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageTurnDirection, setPageTurnDirection] = useState<"forward" | "backward" | "idle">(
    "idle"
  );

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
    const openBillCode =
      typeof cartQuery.data?.openBill?.orderCode === "string" && cartQuery.data.openBill.orderCode.trim()
        ? cartQuery.data.openBill.orderCode.trim()
        : null;

    return { count, total, discount, openBillCode };
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

    const normalizedSearch = deferredSearchTerm.trim().toLowerCase();
    if (normalizedSearch) {
      next = next.filter((item) => buildSearchableText(item).includes(normalizedSearch));
    }

    if (sortMode !== "featured") {
      next = [...next].sort((left, right) => compareItems(left, right, sortMode));
    }

    return next;
  }, [itemsUi, activeCategoryId, onlyAvailable, deferredSearchTerm, sortMode]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredItems.length / MENU_PAGE_SIZE)),
    [filteredItems.length]
  );

  const pagedItems = useMemo(() => {
    const safePageIndex = Math.min(pageIndex, Math.max(totalPages - 1, 0));
    const start = safePageIndex * MENU_PAGE_SIZE;
    return filteredItems.slice(start, start + MENU_PAGE_SIZE);
  }, [filteredItems, pageIndex, totalPages]);

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

  function resetMenuPagination() {
    setPageTurnDirection("idle");
    startTransition(() => setPageIndex(0));
  }

  function handlePrevPage() {
    if (pageIndex <= 0) return;
    setPageTurnDirection("backward");
    startTransition(() => setPageIndex((current) => Math.max(0, current - 1)));
    scrollToMenuGrid();
  }

  function handleNextPage() {
    if (pageIndex >= totalPages - 1) return;
    setPageTurnDirection("forward");
    startTransition(() => setPageIndex((current) => Math.min(totalPages - 1, current + 1)));
    scrollToMenuGrid();
  }

  useEffect(() => {
    if (pageIndex <= totalPages - 1) return;
    startTransition(() => setPageIndex(Math.max(totalPages - 1, 0)));
  }, [pageIndex, totalPages]);

  useEffect(() => {
    if (pageTurnDirection === "idle") return undefined;

    const timeoutId = window.setTimeout(() => {
      setPageTurnDirection("idle");
    }, 420);

    return () => window.clearTimeout(timeoutId);
  }, [pageTurnDirection]);

  function handleHeroQuickFilter(filterId: "all" | "combo" | "available" | "lau") {
    resetMenuPagination();
    setActiveQuickFilter(filterId);

    if (filterId === "all") {
      setOnlyAvailable(false);
      setActiveCategoryId("all");
      setSearchTerm("");
      scrollToMenuGrid();
      return;
    }

    if (filterId === "available") {
      setOnlyAvailable(true);
      setActiveCategoryId("all");
      setSearchTerm("");
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
      if (match) setSearchTerm("");
      if (!match) setSearchTerm("lau");
      scrollToMenuGrid();
      return;
    }

    if (filterId === "combo") {
      const match = categories.find(
        (c) => c.id !== "all" && c.name.toLowerCase().includes("combo")
      );
      setActiveCategoryId(match ? match.id : "all");
      if (match) setSearchTerm("");
      if (!match) setSearchTerm("combo");
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

      <main
        className={cn(
          "relative z-10 mx-auto w-full max-w-[88rem] flex-1 px-4 py-6 pb-28 md:px-6 md:py-8 xl:px-8"
        )}
      >
        {sessionRecoveryMessage ? (
          <Alert className="mb-5 rounded-[24px] border-[#e0c49d]/80 bg-[#fff8ec] shadow-[0_20px_50px_-36px_rgba(73,39,18,0.65)]">
            <AlertDescription className="flex flex-col gap-3 text-[#6c4528] sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-[#5a301a]">Thông báo từ bàn của bạn</div>
                <div className="text-sm leading-6">
                  {sessionRecoveryMessage}
                </div>
                {sessionRecoveryReason === "SESSION_CLOSED_AFTER_PAYMENT" ? (
                  <div className="text-xs text-[#8a694f]">
                    Bill cũ đã được chốt để tránh thêm món nhầm vào hóa đơn đã thanh toán.
                  </div>
                ) : null}
              </div>

              <Link
                to="/c/qr?next=%2Fc%2Fmenu"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "rounded-full border-[#d9bd95]/80 bg-[#fffdf7] text-[#6a3b20] hover:bg-[#fff2df]"
                )}
              >
                Mở lại bàn
              </Link>
            </AlertDescription>
          </Alert>
        ) : null}

        <HeroBanner
          cartItemCount={cartSummary.count}
          cartTotalLabel={formatVnd(cartSummary.total)}
          cartSavingsLabel={cartSummary.discount > 0 ? formatVnd(cartSummary.discount) : null}
          openBillCode={cartSummary.openBillCode}
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
                  Thẻ tre thực đơn
                </div>
              </div>

              <CategoryTabs
                categories={categories}
                activeCategoryId={activeCategoryId}
                onChange={(id) => {
                  resetMenuPagination();
                  setActiveQuickFilter(null);
                  setActiveCategoryId(id);
                }}
                countByCategoryId={countByCategoryId}
              />

              <MenuToolbar
                searchTerm={searchTerm}
                sortMode={sortMode}
                onlyAvailable={onlyAvailable}
                resultCount={filteredItems.length}
                totalCount={itemsUi.length}
                onSearchTermChange={(value) => {
                  resetMenuPagination();
                  setActiveQuickFilter(null);
                  setSearchTerm(value);
                }}
                onSortModeChange={(value) => {
                  resetMenuPagination();
                  setSortMode(value);
                }}
                onOnlyAvailableChange={(value) => {
                  resetMenuPagination();
                  setActiveQuickFilter(value ? "available" : null);
                  setOnlyAvailable(value);
                }}
                onClearFilters={() => {
                  resetMenuPagination();
                  setSearchTerm("");
                  setSortMode("featured");
                  setOnlyAvailable(false);
                  setActiveQuickFilter(null);
                }}
              />

              <div id="menu-grid" className="mt-6">
                {filteredItems.length > 0 ? (
                  <MenuGrid
                    items={pagedItems}
                    pageIndex={pageIndex}
                    totalPages={totalPages}
                    totalItems={filteredItems.length}
                    pageSize={MENU_PAGE_SIZE}
                    pageTurnDirection={pageTurnDirection}
                    onPrevPage={handlePrevPage}
                    onNextPage={handleNextPage}
                  />
                ) : (
                  <div className="customer-hotpot-receipt rounded-[24px] border border-[#e4c7a0]/75 px-5 py-6 text-center">
                    <div className="customer-mythmaker-title text-3xl text-[#4f2b18]">
                      Không tìm thấy món phù hợp
                    </div>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#7a5a43]">
                      Thử đổi từ khóa tìm kiếm, bớt lọc, hoặc quay về danh mục tất cả để xem lại toàn bộ món.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setSortMode("featured");
                        setOnlyAvailable(false);
                        setActiveQuickFilter(null);
                        setActiveCategoryId("all");
                      }}
                      className="mt-4 rounded-full border border-[#d9bd95]/80 bg-[#fff8ec] px-5 py-2.5 text-sm font-medium text-[#6a3b20] transition hover:bg-[#fff2df]"
                    >
                      Xem lại toàn bộ thực đơn
                    </button>
                  </div>
                )}
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
