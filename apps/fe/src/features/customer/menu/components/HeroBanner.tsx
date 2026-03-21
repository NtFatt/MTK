import { Link } from "react-router-dom";
import { buttonVariants } from "../../../../shared/ui/button";
import { cn } from "../../../../shared/utils/cn";

type HeroFeaturedItem = {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
};

type HeroQuickFilter = "all" | "combo" | "available" | "lau" | null;

type HeroBannerProps = {
  cartItemCount: number;
  cartTotalLabel: string;
  cartSavingsLabel?: string | null;
  openBillCode?: string | null;
  activeQuickFilter: HeroQuickFilter;
  onQuickFilterSelect: (filterId: Exclude<HeroQuickFilter, null>) => void;
  onBrowseMenu: () => void;
  featuredItems: HeroFeaturedItem[];
};

function formatVnd(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

function filterButtonClass(active: boolean): string {
  return cn("customer-hotpot-bamboo-tag", active && "translate-y-[-2px] bg-[#c93d2d] text-[#fff9f0]");
}

export function HeroBanner({
  cartItemCount,
  cartTotalLabel,
  cartSavingsLabel,
  openBillCode,
  activeQuickFilter,
  onQuickFilterSelect,
  onBrowseMenu,
  featuredItems,
}: HeroBannerProps) {
  const hasCart = cartItemCount > 0;
  const hasOpenBill = typeof openBillCode === "string" && openBillCode.trim().length > 0;
  const quickFilters: Array<{
    id: Exclude<HeroQuickFilter, null>;
    title: string;
    subtitle: string;
  }> = [
    { id: "combo", title: "Combo hot", subtitle: "Lên món nhanh cho bàn đông" },
    { id: "available", title: "Còn hàng", subtitle: "Ưu tiên món đang bán tốt" },
    { id: "lau", title: "Nước lẩu", subtitle: "Chọn nồi trước để gọi mượt" },
    { id: "all", title: "Tất cả món", subtitle: "Mở toàn bộ quyển menu" },
  ];

  return (
    <section className="customer-mythmaker-panel-strong relative overflow-hidden rounded-[34px] px-6 py-8 md:px-10 md:py-10">
      <div className="pointer-events-none absolute inset-0 opacity-25 [background:repeating-linear-gradient(180deg,rgba(255,255,255,0.05)_0,rgba(255,255,255,0.05)_2px,transparent_2px,transparent_16px)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]" />
      <div className="pointer-events-none absolute right-[10%] top-[18%] h-32 w-32 rounded-full bg-[#ffcf6a]/12 blur-3xl" />
      <div className="pointer-events-none absolute left-[14%] top-[16%] h-24 w-24 rounded-full bg-[#fff0bf]/16 blur-2xl" />
      <span className="customer-hotpot-steam customer-hotpot-steam-delay-2 absolute left-[58%] top-[18%]" />
      <span className="customer-hotpot-steam absolute right-[12%] top-[26%]" />

      <div className="relative z-10 grid gap-7 xl:grid-cols-[1.24fr_0.76fr] xl:items-start">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f6dca8]/30 bg-[#fff6dc]/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[#ffe4af]">
            Nếp xưa phố cũ, lẩu dọn liền tay – Trạm dừng Hạnh Phúc.
          </div>

          <div className="mt-5 max-w-2xl">
            <div className="customer-mythmaker-script text-[2rem] text-[#ffd07a] md:text-[2.4rem]">
              Tiệm lẩu Đường Hạnh Phúc
            </div>
            <h1 className="customer-mythmaker-title mt-2 text-4xl font-semibold leading-[1.05] text-[#fff5df] md:text-6xl">
              Chọn món cho căn bếp luôn đỏ lửa
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hasCart ? (
              <Link
                to="/c/cart"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "rounded-full border border-[#f4ddb2]/70 bg-[#fff7e6] px-8 font-semibold text-[#6a2417] shadow-[0_18px_40px_-22px_rgba(41,17,7,0.65)] hover:bg-[#fff1d4]"
                )}
              >
                {hasOpenBill ? "Gọi thêm món" : "Xem giỏ hàng"}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onBrowseMenu}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "rounded-full border border-[#f4ddb2]/70 bg-[#fff7e6] px-8 font-semibold text-[#6a2417] shadow-[0_18px_40px_-22px_rgba(41,17,7,0.65)] hover:bg-[#fff1d4]"
                )}
              >
                Chọn món ngay
              </button>
            )}

            <div className="rounded-full border border-[#f6dba6]/20 bg-[#fff4d8]/10 px-4 py-2 text-sm text-[#fff4dc]">
              {hasCart
                ? hasOpenBill
                  ? `Bill ${openBillCode} • ${cartItemCount} món mới • ${cartTotalLabel}`
                  : `Giỏ hàng • ${cartItemCount} món • ${cartTotalLabel}`
                : hasOpenBill
                  ? `Bill ${openBillCode} Đang mở • Chọn món để thêm vào bill`
                  : "Món ngon đang chờ • Chọn món để thêm vào giỏ hàng"}
            </div>
            {hasCart && cartSavingsLabel ? (
              <div className="rounded-full border border-[#d3e3a7]/25 bg-[#d6f0aa]/10 px-4 py-2 text-sm text-[#e9ffd0]">
                Tiết kiệm {cartSavingsLabel}
              </div>
            ) : null}
          </div>

          <div className="customer-hotpot-receipt rounded-[30px] p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-[#9b7452]">
                  Kệ thẻ tre theo quầy
                </div>
                <div className="customer-mythmaker-title mt-2 text-2xl text-[#5a301a]">
                  Chọn nhanh mà không bị dồn cục
                </div>
              </div>

              <div className="rounded-full border border-[#e1c49f]/80 bg-[#fff8ed] px-3 py-1 text-xs uppercase tracking-[0.24em] text-[#8b643e]">
                Nhấn để mở đúng mạch món
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              {quickFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => onQuickFilterSelect(filter.id)}
                  data-active={activeQuickFilter === filter.id}
                  className={cn(
                    filterButtonClass(activeQuickFilter === filter.id),
                    "flex min-h-[90px] flex-col items-start justify-between rounded-[22px] px-4 py-4 text-left"
                  )}
                >
                  <span className="text-base font-semibold">{filter.title}</span>
                  <span
                    className={cn(
                      "text-xs leading-5",
                      activeQuickFilter === filter.id ? "text-[#fff7ef]/84" : "text-[#7a5636]"
                    )}
                  >
                    {filter.subtitle}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="customer-hotpot-receipt rounded-[28px] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-[#9b7452]">
                  BẢNG THÔNG BÁO CỦA QUÁN
                </div>
                <div className="customer-mythmaker-title mt-2 text-3xl text-[#5a301a]">
                  Bếp đang đỏ lửa
                </div>
              </div>
              <div className="customer-hotpot-neon rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]">
                MỞ CỬA
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[#734a2a]">
              <div className="rounded-2xl border border-[#dfc39a]/70 bg-[#fff7ea] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                Đặt món nhanh
              </div>
              <div className="rounded-2xl border border-[#dfc39a]/70 bg-[#fff7ea] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                Hiện rõ món còn
              </div>
            </div>
          </div>

          {featuredItems.slice(0, 2).map((item, index) => (
            <div key={item.id} className="customer-hotpot-receipt relative rounded-[26px] px-5 py-4">
              <span className="customer-hotpot-washi left-5 top-[-10px]">
                {index === 0 ? "Đặc trưng" : "Gợi ý hôm nay"}
              </span>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-[#9d7858]">Món quán hay lên cùng bàn</div>
                  <div className="customer-mythmaker-title mt-1 text-2xl font-semibold text-[#4b2715]">
                    {item.name}
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    item.isAvailable
                      ? "border-[#c2d9ae] bg-[#f0f8e8] text-[#54712a]"
                      : "border-[#e4c6bc] bg-[#fff0ed] text-[#a24d42]"
                  )}
                >
                  {item.isAvailable ? "Còn hàng" : "Hết hàng"}
                </span>
              </div>

              <div className="mt-3 text-lg font-semibold text-[#bd3b2d]">{formatVnd(item.price)}</div>
            </div>
          ))}

          {featuredItems.length === 0 ? (
            <div className="customer-hotpot-receipt rounded-[26px] p-5 text-sm text-[#7c5d46]">
              Bảng gợi ý đang được bếp cập nhật. Bạn vẫn có thể xem toàn bộ thực đơn bên dưới.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
