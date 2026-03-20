import { Link } from "react-router-dom";
import { buttonVariants } from "../../../../shared/ui/button";
import { cn } from "../../../../shared/utils/cn";

export function CartEmpty() {
  return (
    <div className="customer-hotpot-receipt rounded-[28px] px-6 py-10 text-center">
      <div className="customer-mythmaker-script text-[2rem] text-[#bd5132]">Nồi chưa có gì</div>
      <p className="mt-3 text-sm leading-6 text-[#7b5a42]">
        Giỏ hàng của bạn đang trống. Quay lại thực đơn để gọi thêm món nóng cho bàn nhé.
      </p>
      <Link
        to="/c/menu"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mt-5 inline-flex rounded-full border-[#d8bc93] bg-[#fff8ec] px-5 text-[#6b3f20] hover:bg-[#fff2df]",
        )}
      >
        Xem thực đơn
      </Link>
    </div>
  );
}
