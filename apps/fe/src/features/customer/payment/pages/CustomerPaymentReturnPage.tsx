import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { confirmVnpayReturn } from "../services/paymentApi";
import { getLastPaymentOrderCode } from "../storage";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { buttonVariants } from "../../../../shared/ui/button";
import { cn } from "../../../../shared/utils/cn";
import { CustomerHotpotShell } from "../../shared/components/CustomerHotpotShell";

type ViewState = "success" | "cancel" | "fail";

function mapResponseCode(code: string | null): ViewState {
  if (code === "00") return "success";
  if (code === "24") return "cancel";
  return "fail";
}

function getTone(state: ViewState): "positive" | "warn" | "danger" {
  if (state === "success") return "positive";
  if (state === "cancel") return "warn";
  return "danger";
}

export function CustomerPaymentReturnPage() {
  const location = useLocation();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const responseCode = params.get("vnp_ResponseCode");
  const viewState = mapResponseCode(responseCode);
  const orderCode = params.get("orderCode") ?? getLastPaymentOrderCode();

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    confirmVnpayReturn(location.search)
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : "Xác minh thanh toán thất bại.";
        setError(message);
      })
      .finally(() => setDone(true));
  }, [location.search]);

  if (!done) {
    return (
      <CustomerHotpotShell contentClassName="max-w-3xl">
        <div className="customer-hotpot-receipt rounded-[30px] px-6 py-10 text-center">
          <div className="customer-mythmaker-script text-[2rem] text-[#bd5132]">Đang đối soát thanh toán</div>
          <p className="mt-3 text-sm text-[#7b5a42]">Hệ thống đang xác minh kết quả từ cổng thanh toán.</p>
        </div>
      </CustomerHotpotShell>
    );
  }

  return (
    <CustomerHotpotShell contentClassName="max-w-3xl">
      <div className="space-y-6">
        <section className="space-y-2 text-center">
          <div className="customer-hotpot-kicker">Kết quả thanh toán</div>
          <h1 className="customer-mythmaker-title customer-hotpot-page-title">
            {viewState === "success"
              ? "Thanh toán thành công"
              : viewState === "cancel"
                ? "Bạn đã hủy thanh toán"
                : "Thanh toán chưa thành công"}
          </h1>
          <p className="customer-hotpot-page-subtitle mx-auto">
            {viewState === "success"
              ? "Khoản thanh toán đã được ghi nhận. Bạn có thể quay lại theo dõi tiến trình phục vụ."
              : viewState === "cancel"
                ? "Phiên thanh toán đã được dừng lại. Bạn vẫn có thể quay lại để thanh toán sau."
                : "Cổng thanh toán chưa xác nhận giao dịch thành công. Bạn có thể thử lại khi sẵn sàng."}
          </p>
        </section>

        <section className="customer-hotpot-receipt rounded-[30px] p-6 text-center">
          <span className="customer-hotpot-status-pill px-4 py-2 text-sm font-semibold" data-tone={getTone(viewState)}>
            {viewState === "success" ? "Đã xác nhận" : viewState === "cancel" ? "Đã dừng" : "Chưa hoàn tất"}
          </span>

          {error ? (
            <Alert variant="destructive" className="mt-5 rounded-[22px] border-[#e4bfb4] bg-[#fff4ef] text-left">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {orderCode ? (
              <>
                <Link
                  to={`/c/orders/${encodeURIComponent(orderCode)}`}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "rounded-full border border-[#b83022] bg-[linear-gradient(180deg,#d34a34_0%,#a82e22_100%)] text-[#fff7f0] shadow-[0_18px_40px_-24px_rgba(94,26,16,0.9)] hover:brightness-110",
                  )}
                >
                  Xem trạng thái đơn
                </Link>

                {viewState !== "success" ? (
                  <Link
                    to={`/c/payment/${encodeURIComponent(orderCode)}`}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]",
                    )}
                  >
                    Thử lại thanh toán
                  </Link>
                ) : null}
              </>
            ) : (
              <Link
                to="/c/menu"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]",
                )}
              >
                Về thực đơn
              </Link>
            )}
          </div>
        </section>
      </div>
    </CustomerHotpotShell>
  );
}
