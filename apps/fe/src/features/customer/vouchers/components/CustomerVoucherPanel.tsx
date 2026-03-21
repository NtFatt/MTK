import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Badge } from "../../../../shared/ui/badge";
import { Button } from "../../../../shared/ui/button";
import { Input } from "../../../../shared/ui/input";
import type { Cart } from "../../cart/types";
import type { CustomerVoucherPreview } from "../services/voucherApi";
import {
  useApplyCartVoucherMutation,
  useAvailableVouchersQuery,
  useRemoveCartVoucherMutation,
} from "../hooks/useCustomerVoucherQueries";

type CustomerVoucherPanelProps = {
  cart: Cart;
  sessionKey: string;
  compact?: boolean;
};

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatVoucherValue(voucher: {
  discountType: "PERCENT" | "FIXED_AMOUNT";
  discountValue: number;
  maxDiscountAmount?: number | null;
}) {
  if (voucher.discountType === "PERCENT") {
    return voucher.maxDiscountAmount != null
      ? `${voucher.discountValue}% • tối đa ${formatVnd(voucher.maxDiscountAmount)}`
      : `${voucher.discountValue}%`;
  }
  return formatVnd(voucher.discountValue);
}

export function CustomerVoucherPanel({
  cart,
  sessionKey,
  compact = false,
}: CustomerVoucherPanelProps) {
  const [code, setCode] = useState("");

  const cartKey = cart.cartKey;
  const availableQuery = useAvailableVouchersQuery(cartKey || null);
  const applyMutation = useApplyCartVoucherMutation({ cartKey, sessionKey });
  const removeMutation = useRemoveCartVoucherMutation({ cartKey, sessionKey });

  const appliedVoucher = cart.voucher ?? null;
  const inheritedBillVoucher = !appliedVoucher && cart.openBill?.voucherCode
    ? {
        code: cart.openBill.voucherCode,
        name: cart.openBill.voucherName ?? cart.openBill.voucherCode,
        discountAmount: cart.openBill.voucherDiscountAmount ?? cart.openBill.discount ?? 0,
      }
    : null;

  const featuredVouchers = useMemo(() => {
    const items = (availableQuery.data?.items ?? []) as CustomerVoucherPreview[];
    return items.slice(0, compact ? 2 : 4);
  }, [availableQuery.data, compact]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="customer-hotpot-kicker">Lộc quán</div>
        <div className="customer-mythmaker-title text-2xl text-[#4e2916]">
          Voucher & mã phiếu ưu đãi
        </div>
        <p className="text-sm text-[#7a5a43]">
          Nhập mã voucher hoặc chọn thẻ ưu đãi đang phù hợp với phiếu gọi món hiện tại.
        </p>
      </div>

      {appliedVoucher ? (
        <div className="rounded-[24px] border border-[#d7b88e] bg-[#fffaf1] px-4 py-4 shadow-[0_18px_30px_-28px_rgba(103,55,26,0.75)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={appliedVoucher.isValid ? "default" : "destructive"}>
                  {appliedVoucher.isValid ? "Đang áp dụng" : "Cần xử lý lại"}
                </Badge>
                <span className="font-mono text-sm font-semibold text-[#5a301a]">{appliedVoucher.code}</span>
              </div>

              <div className="text-lg font-semibold text-[#4e2916]">{appliedVoucher.name}</div>
              <div className="text-sm text-[#7a5a43]">
                {formatVoucherValue(appliedVoucher)} • tiết kiệm{" "}
                <span className="font-semibold text-[#c43c2d]">
                  {formatVnd(appliedVoucher.discountAmount)}
                </span>
              </div>

              {!appliedVoucher.isValid && appliedVoucher.invalidReasonMessage ? (
                <div className="text-sm text-[#a2382a]">{appliedVoucher.invalidReasonMessage}</div>
              ) : null}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]"
              disabled={removeMutation.isPending}
              onClick={() => removeMutation.mutate()}
            >
              {removeMutation.isPending ? "Đang bỏ..." : "Bỏ voucher"}
            </Button>
          </div>
        </div>
      ) : null}

      {!appliedVoucher && inheritedBillVoucher ? (
        <div className="rounded-[24px] border border-[#d7b88e] bg-[#fffaf1] px-4 py-4 text-sm text-[#7a5a43] shadow-[0_18px_30px_-28px_rgba(103,55,26,0.75)]">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Bill dang ap dung</Badge>
            <span className="font-mono text-sm font-semibold text-[#5a301a]">{inheritedBillVoucher.code}</span>
          </div>
          <div className="mt-2 text-[#4e2916]">
            Bill hien tai dang giu uu dai <span className="font-semibold">{inheritedBillVoucher.name}</span>.
          </div>
          <div className="mt-1 text-xs text-[#8a694f]">
            Neu muon thay uu dai cho ca bill, hay ap dung voucher moi truoc khi Gọi thêm món.
          </div>
        </div>
      ) : null}

      {(applyMutation.error || removeMutation.error) ? (
        <Alert variant="destructive" className="rounded-[20px] border-[#e4bfb4] bg-[#fff4ef]">
          <AlertDescription>
            {applyMutation.error?.message ?? removeMutation.error?.message}
          </AlertDescription>
        </Alert>
      ) : null}

      {availableQuery.error ? (
        <Alert className="rounded-[20px] border-[#e0c49d]/80 bg-[#fff8ec]">
          <AlertDescription className="text-[#7a5a43]">
            Không tải được danh sách voucher gợi ý lúc này. Bạn vẫn có thể nhập mã thủ công.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Nhập mã voucher, ví dụ: HOTPOT10"
          className="h-12 rounded-full border-[#d7b88e] bg-[#fffaf1] px-5"
        />
        <Button
          type="button"
          className="rounded-full border border-[#b83022] bg-[linear-gradient(180deg,#d34a34_0%,#a82e22_100%)] text-[#fff7f0] hover:brightness-110"
          disabled={applyMutation.isPending || !code.trim()}
          onClick={() =>
            applyMutation.mutate(code.trim(), {
              onSuccess: () => setCode(""),
            })
          }
        >
          {applyMutation.isPending ? "Đang áp dụng..." : "Áp dụng mã"}
        </Button>
      </div>

      {availableQuery.data?.items?.length ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-[#5a301a]">Gợi ý đang có</div>
            <div className="text-xs text-[#8a694f]">
              {availableQuery.data.items.length} ưu đãi theo chi nhánh
            </div>
          </div>

          <div className={`grid gap-3 ${compact ? "lg:grid-cols-2" : "lg:grid-cols-2"}`}>
            {featuredVouchers.map((voucher: CustomerVoucherPreview) => {
              const isApplied = appliedVoucher?.id === voucher.id;

              return (
                <div
                  key={voucher.id}
                  className="rounded-[22px] border border-[#e0c49d]/80 bg-[#fffdf8] px-4 py-4 shadow-[0_14px_26px_-28px_rgba(95,51,23,0.85)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[#8a3d2d]">{voucher.code}</span>
                        <Badge variant={voucher.isValid ? "outline" : "secondary"}>
                          {voucher.isValid ? "Dùng được" : "Chưa đủ điều kiện"}
                        </Badge>
                      </div>
                      <div className="text-base font-semibold text-[#4e2916]">{voucher.name}</div>
                      <div className="text-sm text-[#7a5a43]">{formatVoucherValue(voucher)}</div>
                      <div className="text-xs text-[#8a694f]">
                        Từ {formatVnd(voucher.minSubtotal)} • hết hạn{" "}
                        {new Date(voucher.endsAt).toLocaleString("vi-VN")}
                      </div>
                      {voucher.invalidReasonMessage ? (
                        <div className="text-xs text-[#a2382a]">{voucher.invalidReasonMessage}</div>
                      ) : null}
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant={isApplied ? "secondary" : "outline"}
                      className="rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]"
                      disabled={applyMutation.isPending || !voucher.isValid || isApplied}
                      onClick={() => applyMutation.mutate(voucher.code)}
                    >
                      {isApplied ? "Đã chọn" : "Dùng mã"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : availableQuery.isLoading ? (
        <div className="rounded-[22px] border border-dashed border-[#d9bd95]/80 px-4 py-6 text-sm text-[#8a694f]">
          Đang tải danh sách voucher theo chi nhánh...
        </div>
      ) : null}
    </div>
  );
}
