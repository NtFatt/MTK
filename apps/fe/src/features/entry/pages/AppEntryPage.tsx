import { Link } from "react-router-dom";

export function AppEntryPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Hadilao Online</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Chọn chế độ. Khách hàng thường quét QR tại bàn để vào menu.
        </p>

        <div className="mt-6 space-y-3">
          <Link
            to="/c/qr?next=%2Fc%2Fmenu"
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Khách hàng (quét QR / xác nhận bàn)
          </Link>

          <Link
            to="/i/login"
            className="inline-flex h-11 w-full items-center justify-center rounded-md border px-4 text-sm font-medium"
          >
            Nội bộ (đăng nhập)
          </Link>
        </div>
      </div>
    </div>
  );
}