import { Link } from "react-router-dom";
import { Separator } from "../../../../shared/ui/separator";
import { cn } from "../../../../shared/utils/cn";

export function CustomerFooter() {
  return (
    <footer className={cn("mt-auto border-t border-border bg-muted/30")}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">© Hadilao. Thực đơn khách hàng.</span>
          <nav className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/customer/menu" className="hover:text-foreground">
              Thực đơn
            </Link>
            <Link to="/customer/menu" className="hover:text-foreground">
              Liên hệ
            </Link>
          </nav>
        </div>
        <Separator className="my-4" />
        <p className="text-xs text-muted-foreground">
          Đây là giao diện mẫu. Dữ liệu đang dùng mock (PR-01).
        </p>
      </div>
    </footer>
  );
}
