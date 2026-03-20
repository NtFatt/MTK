import { cn } from "../../../../shared/utils/cn";

export function MenuEmpty() {
  return (
    <div
      className={cn(
        "customer-hotpot-receipt mx-auto max-w-xl rounded-[28px] px-6 py-10 text-center shadow-[0_24px_60px_-42px_rgba(78,42,16,0.52)]"
      )}
    >
      <div className="customer-mythmaker-script text-[2rem] text-[#bd5132]">Bếp đang nghỉ tay</div>
      <p className="mt-3 text-sm leading-6 text-[#7b5a42]">
        Chưa có món phù hợp cho bộ lọc hiện tại. Thử đổi quầy hoặc quay lại sau một chút khi bếp
        cập nhật thực đơn.
      </p>
    </div>
  );
}
