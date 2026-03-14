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
  activeQuickFilter: HeroQuickFilter;
  onQuickFilterSelect: (filterId: Exclude<HeroQuickFilter, null>) => void;
  featuredItems: HeroFeaturedItem[];
};

function formatVnd(price: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

function getChipClass(active: boolean): string {
  return active
    ? "border-primary-foreground bg-primary-foreground text-primary shadow-sm"
    : "border-primary-foreground/20 bg-white/10 text-primary-foreground hover:bg-white/15";
}

export function HeroBanner({
  cartItemCount,
  cartTotalLabel,
  activeQuickFilter,
  onQuickFilterSelect,
  featuredItems,
}: HeroBannerProps) {
  const hasCart = cartItemCount > 0;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border">
      <div className="relative bg-primary px-6 py-8 md:px-10 md:py-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-black/10 to-black/30" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_45%,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_35%,rgba(0,0,0,0)_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_30%,rgba(0,0,0,0.32)_0%,rgba(0,0,0,0.18)_35%,rgba(0,0,0,0)_65%)]" />

        <div className="relative z-10 grid gap-6 md:grid-cols-[1.35fr_0.95fr] md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary-foreground md:text-4xl">
              Thực đơn Hadilao
            </h1>

            <p className="mt-3 max-w-2xl text-sm text-primary-foreground/85 md:text-base">
              Lẩu và đồ nhúng tươi ngon, chọn món trực tiếp tại bàn. Ưu tiên món còn sẵn và combo
              dễ chọn để đặt nhanh hơn.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={hasCart ? "/c/cart" : "#menu-grid"}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "rounded-full bg-primary-foreground px-8 font-semibold text-primary hover:bg-primary-foreground/90"
                )}
              >
                {hasCart ? "Xem giỏ hàng" : "Chọn món ngay"}
              </Link>

              {hasCart ? (
                <div className="inline-flex min-h-11 items-center rounded-full border border-primary-foreground/20 bg-white/10 px-4 text-sm text-primary-foreground">
                  Giỏ hàng • {cartItemCount} món • {cartTotalLabel}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onQuickFilterSelect("combo")}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                  getChipClass(activeQuickFilter === "combo")
                )}
              >
                Combo hot
              </button>

              <button
                type="button"
                onClick={() => onQuickFilterSelect("available")}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                  getChipClass(activeQuickFilter === "available")
                )}
              >
                Còn hàng
              </button>

              <button
                type="button"
                onClick={() => onQuickFilterSelect("lau")}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                  getChipClass(activeQuickFilter === "lau")
                )}
              >
                Nước lẩu
              </button>

              <button
                type="button"
                onClick={() => onQuickFilterSelect("all")}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                  getChipClass(activeQuickFilter === "all")
                )}
              >
                Tất cả món
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {featuredItems.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-primary-foreground/75">Gợi ý hôm nay</div>
                    <div className="mt-1 text-lg font-semibold text-primary-foreground">
                      {item.name}
                    </div>
                  </div>

                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium",
                      item.isAvailable
                        ? "bg-emerald-500/20 text-white"
                        : "bg-white/15 text-primary-foreground/80"
                    )}
                  >
                    {item.isAvailable ? "Còn hàng" : "Hết hàng"}
                  </span>
                </div>

                <div className="mt-3 text-base font-semibold text-primary-foreground">
                  {formatVnd(item.price)}
                </div>
              </div>
            ))}

            {featuredItems.length === 0 ? (
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-primary-foreground/80 backdrop-blur-sm">
                Chưa có gợi ý nổi bật lúc này.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}