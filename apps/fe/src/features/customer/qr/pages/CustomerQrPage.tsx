import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader } from "../../../../shared/ui/card";
import { Button } from "../../../../shared/ui/button";
import { Input } from "../../../../shared/ui/input";
import { Label } from "../../../../shared/ui/label";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { useOpenSessionMutation } from "../../../../shared/customer/session/useOpenSessionMutation";
import { resolveTableIdByCode } from "../../../../shared/customer/tables/tableLookup";

export function CustomerQrPage() {
  const [branchId, setBranchId] = useState("");
  const [tableCode, setTableCode] = useState("");
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next");
  const qpTableId = searchParams.get("tableId")?.trim() || "";
  const qpDirectionId = searchParams.get("directionId")?.trim() || "";

  const openSessionMutation = useOpenSessionMutation({ next });
  const [localError, setLocalError] = useState<string | null>(null);

  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  const canSubmit = useMemo(() => {
    if (offline) return false;
    if (openSessionMutation.isPending) return false;
    // QR mode: allow direct open with qp tableId/directionId
    if (qpTableId || qpDirectionId) return true;
    // Manual mode: require table code (branch optional)
    return tableCode.trim() !== "";
  }, [offline, openSessionMutation.isPending, qpTableId, qpDirectionId, tableCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // QR mode
    if (qpTableId) {
      openSessionMutation.mutate({ tableId: qpTableId });
      return;
    }
    if (qpDirectionId) {
      openSessionMutation.mutate({ directionId: qpDirectionId });
      return;
    }

    // Manual mode (branchId + tableCode) -> resolve to tableId via GET /tables
    const bid = branchId.trim();
    const tcode = tableCode.trim();
    if (!tcode) return;

    try {
      const { tableId } = await resolveTableIdByCode({
        tableCode: tcode,
        branchId: bid ? (Number.isNaN(Number(bid)) ? bid : Number(bid)) : null,
      });

      if (!tableId) {
        setLocalError("Không tìm thấy bàn theo mã đã nhập. Kiểm tra lại (VD: A01).");
        return;
      }
      openSessionMutation.mutate({ tableId });
    } catch (err: any) {
      setLocalError(String(err?.message ?? "Không thể tải danh sách bàn."));
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">Mở bàn</h1>
          <p className="text-sm text-muted-foreground">
            Nhập số bàn (VD: A01). Có thể kèm mã chi nhánh để tránh trùng. Nếu quét QR, hệ thống sẽ tự nhận bàn.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {offline && (
              <Alert variant="destructive">
                <AlertDescription>Bạn đang offline. Kiểm tra mạng và thử lại.</AlertDescription>
              </Alert>
            )}
            {localError && (
              <Alert variant="destructive">
                <AlertDescription>{localError}</AlertDescription>
              </Alert>
            )}
            {openSessionMutation.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {openSessionMutation.error.code === "NO_TABLE_AVAILABLE" ||
                  openSessionMutation.error.code === "TABLE_RESERVED_SOON"
                    ? "Không thể mở bàn lúc này (bàn không khả dụng / sắp có đặt trước)."
                    : openSessionMutation.error.code === "TABLE_OUT_OF_SERVICE"
                      ? "Bàn đang tạm ngưng phục vụ."
                      : openSessionMutation.error.code === "TABLE_NOT_FOUND"
                        ? "Không tìm thấy bàn. Hãy kiểm tra lại mã bàn."
                        : openSessionMutation.error.code === "INVALID_DIRECTION_ID"
                          ? "Thiếu thông tin bàn/zone. Hãy nhập mã bàn hoặc quét QR." 
                          : openSessionMutation.error.message}
                  {openSessionMutation.error.correlationId && (
                    <span className="mt-1 block text-xs">
                      Mã: {openSessionMutation.error.correlationId}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="branchId">Mã chi nhánh</Label>
              <Input
                id="branchId"
                type="text"
                placeholder="VD: 1"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={offline}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tableCode">Số bàn</Label>
              <Input
                id="tableCode"
                type="text"
                placeholder="VD: A01"
                value={tableCode}
                onChange={(e) => setTableCode(e.target.value)}
                disabled={offline}
              />
            </div>
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {openSessionMutation.isPending ? "Đang mở…" : "Mở bàn"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
