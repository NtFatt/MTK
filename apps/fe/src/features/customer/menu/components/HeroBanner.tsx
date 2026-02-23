import { Link } from "react-router-dom";
import { buttonVariants } from "../../../../shared/ui/button";
import { cn } from "../../../../shared/utils/cn";

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border">
      <div className="relative bg-primary px-6 py-12 md:px-10 md:py-16">
        {/* overlay cho đúng kiểu ảnh (tối góc phải) */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-black/10 to-black/30" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_45%,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_35%,rgba(0,0,0,0)_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_30%,rgba(0,0,0,0.32)_0%,rgba(0,0,0,0.18)_35%,rgba(0,0,0,0)_65%)]" />

        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <h1 className="animate-fade-in-up text-3xl font-bold tracking-tight text-primary-foreground md:text-4xl">
            Thực đơn Hadilao
          </h1>
          <p className="animate-fade-in-up mt-3 text-primary-foreground/80 [animation-delay:0.1s] md:text-lg">
            Lẩu & đồ nướng tươi ngon, phục vụ tận bàn.
          </p>

          <div className="animate-fade-in-up mt-6 [animation-delay:0.2s]">
            <Link
              to="/c/menu?state=ready"
              className={cn(
                buttonVariants({ size: "lg" }),
                "rounded-full bg-primary-foreground px-8 font-semibold text-primary hover:bg-primary-foreground/90"
              )}
            >
              Xem thực đơn
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}