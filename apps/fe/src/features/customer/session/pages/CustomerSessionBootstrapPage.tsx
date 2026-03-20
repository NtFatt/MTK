import { useEffect } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { customerSessionStore } from "../../../../shared/customer/session/sessionStore";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { buttonVariants } from "../../../../shared/ui/button";
import { applyPendingAction } from "../../../../shared/customer/session/pendingActions";
import { CustomerHotpotShell } from "../../shared/components/CustomerHotpotShell";
import { cn } from "../../../../shared/utils/cn";

export function CustomerSessionBootstrapPage() {
  const { sessionKey } = useParams<{ sessionKey: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next");

  const session = customerSessionStore((s) => s.session);

  useEffect(() => {
    if (!sessionKey) return;
    if (!session || session.sessionKey !== sessionKey) return;

    void (async () => {
      let target = next ? String(next) : "/c/menu";
      try {
        const res = await applyPendingAction(sessionKey, session.branchId);
        if (res.returnTo) target = res.returnTo;
      } finally {
        navigate(target, { replace: true });
      }
    })();
  }, [sessionKey, session, next, navigate]);

  if (!sessionKey) {
    return (
      <CustomerHotpotShell contentClassName="max-w-3xl">
        <div className="customer-hotpot-receipt rounded-[30px] px-6 py-10 text-center">
          <Alert variant="destructive" className="rounded-[20px] border-[#e4bfb4] bg-[#fff4ef] text-left">
            <AlertDescription>Thiếu session. Quay lại trang mở bàn.</AlertDescription>
          </Alert>
          <Link
            to="/c/qr"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "mt-5 inline-flex rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]",
            )}
          >
            Quay lại /c/qr
          </Link>
        </div>
      </CustomerHotpotShell>
    );
  }

  if (!session || session.sessionKey !== sessionKey) {
    const back = next ? `/c/qr?next=${encodeURIComponent(String(next))}` : "/c/qr";
    return (
      <CustomerHotpotShell contentClassName="max-w-3xl">
        <div className="customer-hotpot-receipt rounded-[30px] px-6 py-10 text-center">
          <Alert variant="destructive" className="rounded-[20px] border-[#e4bfb4] bg-[#fff4ef] text-left">
            <AlertDescription>
              Không tìm thấy phiên bàn trên thiết bị này. Vui lòng mở bàn lại hoặc quét QR.
            </AlertDescription>
          </Alert>
          <Link
            to={back}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "mt-5 inline-flex rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]",
            )}
          >
            Mở bàn
          </Link>
        </div>
      </CustomerHotpotShell>
    );
  }

  return (
    <CustomerHotpotShell contentClassName="max-w-3xl">
      <div className="customer-hotpot-receipt rounded-[30px] px-6 py-10 text-center" aria-busy="true">
        <div className="customer-mythmaker-script text-[2rem] text-[#bd5132]">Đang dọn bàn cho bạn</div>
        <div className="mx-auto mt-5 h-9 w-9 animate-spin rounded-full border-2 border-[#c43c2d] border-t-transparent" />
      </div>
    </CustomerHotpotShell>
  );
}
