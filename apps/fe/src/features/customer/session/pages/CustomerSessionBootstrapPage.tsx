import { useEffect } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { customerSessionStore } from "../../../../shared/customer/session/sessionStore";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { buttonVariants } from "../../../../shared/ui/button";
import { applyPendingAction } from "../../../../shared/customer/session/pendingActions";

export function CustomerSessionBootstrapPage() {
  const { sessionKey } = useParams<{ sessionKey: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next");

  const session = customerSessionStore((s) => s.session);

  useEffect(() => {
    if (!sessionKey) return;
    // In current BE, GET /sessions/:sessionKey may not exist. Bootstrap relies on the session already in store
    // (set by /sessions/open response). If user deep-links without opening, we show an actionable error.
    if (!session || session.sessionKey !== sessionKey) return;

    void (async () => {
      let target = next ? String(next) : "/c/menu";
      try {
        const res = await applyPendingAction(sessionKey, session.branchId); if (res.returnTo) target = res.returnTo;
      } finally {
        navigate(target, { replace: true });
      }
    })();
  }, [sessionKey, session, next, navigate]);

  if (!sessionKey) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-6">
        <Alert variant="destructive">
          <AlertDescription>Thiếu session. Quay lại trang mở bàn.</AlertDescription>
        </Alert>
        <Link to="/c/qr" className={buttonVariants({ variant: "outline" })}>
          Quay lại /c/qr
        </Link>
      </div>
    );
  }

  if (!session || session.sessionKey !== sessionKey) {
    const back = next ? `/c/qr?next=${encodeURIComponent(String(next))}` : "/c/qr";
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Không tìm thấy phiên bàn trên thiết bị này. Vui lòng mở bàn lại (hoặc quét QR).
          </AlertDescription>
        </Alert>
        <Link to={back} className={buttonVariants({ variant: "outline" })}>
          Mở bàn
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[200px] items-center justify-center p-6" aria-busy="true">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
