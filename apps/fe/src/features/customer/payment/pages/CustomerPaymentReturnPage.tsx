import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { confirmVnpayReturn } from "../services/paymentApi";
import { getLastPaymentOrderCode } from "../storage";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { buttonVariants } from "../../../../shared/ui/button";

type ViewState = "success" | "cancel" | "fail";

function mapResponseCode(code: string | null): ViewState {
  if (code === "00") return "success";
  if (code === "24") return "cancel";
  return "fail";
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
    return <main className="p-6">Đang xác minh thanh toán…</main>;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {viewState === "success" && <h1 className="text-xl font-semibold">Thanh toán thành công</h1>}
      {viewState === "cancel" && <h1 className="text-xl font-semibold">Bạn đã hủy thanh toán</h1>}
      {viewState === "fail" && <h1 className="text-xl font-semibold">Thanh toán chưa thành công</h1>}

      {orderCode ? (
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/c/orders/${encodeURIComponent(orderCode)}`}
            className={buttonVariants({ variant: "default" })}
          >
            Xem trạng thái đơn
          </Link>

          {viewState !== "success" && (
            <Link
              to={`/c/payment/${encodeURIComponent(orderCode)}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Thử lại thanh toán
            </Link>
          )}
        </div>
      ) : (
        <Link to="/c/menu" className={buttonVariants({ variant: "outline" })}>
          Về thực đơn
        </Link>
      )}
    </main>
  );
}