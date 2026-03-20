import { Link } from "react-router-dom";
import { Separator } from "../../../../shared/ui/separator";
import { cn } from "../../../../shared/utils/cn";

export function CustomerFooter() {
  return (
    <footer className={cn("relative z-10 mt-auto px-4 pb-6 pt-8")}>
      <div className="customer-mythmaker-panel mx-auto max-w-6xl rounded-[28px] px-6 py-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="customer-mythmaker-title text-3xl font-semibold text-[#5f2e15]">
              Hadilao
            </div>
            <span className="customer-mythmaker-script text-xl text-[#bd5132]">
              Tiệm lẩu Đường Hạnh Phúc
            </span>
          </div>
          <nav className="flex gap-6 text-sm text-[#7a573a]">
            <Link to="/c/menu" className="hover:text-[#5d2d17]">
              Thực đơn
            </Link>
            <Link to="/c/cart" className="hover:text-[#5d2d17]">
              Giỏ hàng
            </Link>
            <Link to="/c/qr" className="hover:text-[#5d2d17]">
              Mở bàn
            </Link>
          </nav>
        </div>
        <Separator className="my-4 bg-[#dcc29d]/70" />
        <p className="text-xs leading-6 text-[#7a6255]">
          Món ăn được hiển thị theo phiên tại bàn, tồn public và hold tạm thời. Giao diện customer
          được làm lại theo tinh thần quán lẩu phố cũ: ấm, nhộn nhịp, dễ gọi món và nhìn món nào
          cũng thấy muốn ăn ngay.
        </p>
      </div>
    </footer>
  );
}
