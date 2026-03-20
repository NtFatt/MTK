import { Label } from "../../../../shared/ui/label";
import { cn } from "../../../../shared/utils/cn";

type CheckoutNoteProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function CheckoutNote({
  value,
  onChange,
  placeholder = "Ví dụ: ít cay, cho lên món rau sau, có trẻ nhỏ...",
  className,
}: CheckoutNoteProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="checkout-note" className="text-[#6a4226]">
        Ghi chú cho bếp
      </Label>
      <textarea
        id="checkout-note"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="customer-hotpot-textarea px-4 py-3 text-sm placeholder:text-[#a68569]"
      />
    </div>
  );
}
