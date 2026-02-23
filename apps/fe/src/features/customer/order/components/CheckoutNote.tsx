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
  placeholder = "Ghi chú cho đơn hàng (tùy chọn)",
  className,
}: CheckoutNoteProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="checkout-note">Ghi chú</Label>
      <textarea
        id="checkout-note"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
