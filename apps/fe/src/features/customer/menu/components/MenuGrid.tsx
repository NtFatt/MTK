import type { MenuItem } from "../types";
import { MenuCard } from "./MenuCard";
import { cn } from "../../../../shared/utils/cn";

type MenuGridProps = {
  items: MenuItem[];
  pageIndex: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageTurnDirection: "forward" | "backward" | "idle";
  onPrevPage: () => void;
  onNextPage: () => void;
};

export function MenuGrid({
  items,
  pageIndex,
  totalPages,
  totalItems,
  pageSize,
  pageTurnDirection,
  onPrevPage,
  onNextPage,
}: MenuGridProps) {
  const leftItems = items.slice(0, Math.ceil(pageSize / 2));
  const rightItems = items.slice(Math.ceil(pageSize / 2));
  const currentPageLabel = `${pageIndex + 1}/${totalPages}`;
  const currentStart = totalItems === 0 ? 0 : pageIndex * pageSize + 1;
  const currentEnd = totalItems === 0 ? 0 : Math.min(totalItems, currentStart + items.length - 1);

  return (
    <div className="space-y-5">
      <div className="customer-menu-book-shell rounded-[34px] p-4 sm:p-5 xl:p-6">
        <div className="flex flex-col gap-4 border-b border-[#d7b88c]/60 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-[#8f6f5f]">
              Quyển menu của quán
            </div>
            <div className="customer-mythmaker-title mt-2 text-3xl text-[#57121a]">
              Lật từng nhịp như đang xem menu giấy
            </div>
            <div className="mt-2 text-sm text-[#7a5a43]">
              Lần lật này hiển thị {currentStart}-{currentEnd} trong tổng {totalItems} món, để bạn xem thong thả hơn thay vì bị dồn vào một khối.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="customer-menu-book-counter rounded-full px-4 py-2 text-sm font-medium text-[#6a4529]">
              Trang {currentPageLabel}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPrevPage}
                disabled={pageIndex <= 0}
                className="customer-menu-page-button"
              >
                Trang trước
              </button>
              <button
                type="button"
                onClick={onNextPage}
                disabled={pageIndex >= totalPages - 1}
                className="customer-menu-page-button"
              >
                Trang sau
              </button>
            </div>
          </div>
        </div>

        <div
          data-turn={pageTurnDirection}
          className={cn("customer-menu-book-spread mt-5 grid gap-5 xl:grid-cols-2")}
        >
          <section className="customer-menu-book-page">
            <div className="customer-menu-book-page-header">
              <span className="customer-menu-book-page-label">Trang trái</span>
              <span className="customer-menu-book-page-number">{pageIndex * 2 + 1}</span>
            </div>

            <div className="grid gap-4">
              {leftItems.map((item) => (
                <div key={item.id}>
                  <MenuCard item={item} variant="book" />
                </div>
              ))}
            </div>
          </section>

          <section className="customer-menu-book-page">
            <div className="customer-menu-book-page-header">
              <span className="customer-menu-book-page-label">Trang phải</span>
              <span className="customer-menu-book-page-number">{pageIndex * 2 + 2}</span>
            </div>

            <div className="grid gap-4">
              {rightItems.length > 0 ? (
                rightItems.map((item) => (
                  <div key={item.id}>
                    <MenuCard item={item} variant="book" />
                  </div>
                ))
              ) : (
                <div className="customer-menu-book-empty rounded-[24px] px-5 py-8 text-sm text-[#87664d]">
                  Trang này đang để trống để quyển menu thở hơn một chút.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#debf96]/75 bg-[#fff8ed] px-4 py-3 text-sm text-[#71492b] shadow-[0_18px_40px_-34px_rgba(77,44,18,0.42)]">
          <div>
            Đang ở trang <span className="font-semibold">{currentPageLabel}</span> của quyển menu.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrevPage}
              disabled={pageIndex <= 0}
              className="customer-menu-page-button customer-menu-page-button--small"
            >
              Lui
            </button>
            <button
              type="button"
              onClick={onNextPage}
              disabled={pageIndex >= totalPages - 1}
              className="customer-menu-page-button customer-menu-page-button--small"
            >
              Lật tiếp
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
