import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader } from "../../../../shared/ui/card";
import { Button } from "../../../../shared/ui/button";
import { Input } from "../../../../shared/ui/input";
import { Label } from "../../../../shared/ui/label";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { useOpenSessionMutation } from "../../../../shared/customer/session/useOpenSessionMutation";
import { resolveTableIdByCode } from "../../../../shared/customer/tables/tableLookup";

// --- Minimal BarcodeDetector typing (avoid TS errors) ---
type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

function hasBarcodeDetector(): boolean {
  return typeof window !== "undefined" && typeof (window as any).BarcodeDetector === "function";
}

function parseScannedValue(raw: string): { url?: string; directionId?: string; tableId?: string; error?: string } {
  const v = raw.trim();
  if (!v) return { error: "QR rỗng." };

  // If it's a URL (most common in real restaurants)
  try {
    const u = new URL(v, window.location.origin);
    // Only allow same-origin navigation for safety
    if (u.origin !== window.location.origin) {
      return { error: "QR không thuộc hệ thống này. Hãy quét QR đúng của quán." };
    }
    return { url: u.toString() };
  } catch {
    // Not a URL; maybe a plain token like directionId=xxx or tableId=yyy
  }

  // Try key=value
  const m1 = v.match(/directionId\s*=\s*([A-Za-z0-9._-]+)/i);
  if (m1?.[1]) return { directionId: m1[1] };

  const m2 = v.match(/tableId\s*=\s*([A-Za-z0-9._-]+)/i);
  if (m2?.[1]) return { tableId: m2[1] };

  return { error: "Không đọc được QR. QR nên là link (URL) hoặc có directionId/tableId." };
}

export function CustomerQrPage() {
  const [branchId, setBranchId] = useState("");
  const [tableCode, setTableCode] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [searchParams] = useSearchParams();
  const next = searchParams.get("next");
  const qpTableId = searchParams.get("tableId")?.trim() || "";
  const qpDirectionId = searchParams.get("directionId")?.trim() || "";

  const openSessionMutation = useOpenSessionMutation({ next });
  const [localError, setLocalError] = useState<string | null>(null);

  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  // --- QR scan UI state ---
  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const isQrParamMode = Boolean(qpTableId || qpDirectionId);

  // Auto-open when arriving from QR params
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!isQrParamMode) return;
    if (offline) return;
    if (autoOpenedRef.current) return;
    if (openSessionMutation.isPending) return;

    autoOpenedRef.current = true;
    if (qpTableId) openSessionMutation.mutate({ tableId: qpTableId });
    else if (qpDirectionId) openSessionMutation.mutate({ directionId: qpDirectionId });
  }, [isQrParamMode, qpTableId, qpDirectionId, offline, openSessionMutation]);

  const canSubmit = useMemo(() => {
    if (offline) return false;
    if (openSessionMutation.isPending) return false;
    // QR params -> allow (auto open already happens, but keep safe)
    if (qpTableId || qpDirectionId) return true;
    // Manual mode: require table code
    return tableCode.trim() !== "";
  }, [offline, openSessionMutation.isPending, qpTableId, qpDirectionId, tableCode]);

  const stopScan = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanOpen(false);
  };

  const startScan = async () => {
    setScanError(null);
    setLocalError(null);

    if (offline) {
      setScanError("Bạn đang offline. Không thể mở camera.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanError("Trình duyệt không hỗ trợ camera.");
      return;
    }
    if (!hasBarcodeDetector()) {
      setScanError("Thiết bị/trình duyệt không hỗ trợ quét QR trong app. Hãy dùng camera điện thoại để quét QR trên bàn.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        setScanError("Không tìm thấy video element.");
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        return;
      }

      video.srcObject = stream;
      await video.play();
      setScanOpen(true);

      const Ctor = (window as any).BarcodeDetector as BarcodeDetectorCtor;
      const detector = new Ctor({ formats: ["qr_code"] });

      const tick = async () => {
        try {
          // detect QR
          const codes = await detector.detect(video);
          if (codes?.length) {
            const raw = codes[0]?.rawValue ?? "";
            const parsed = parseScannedValue(raw);

            if (parsed.error) {
              setScanError(parsed.error);
            } else if (parsed.url) {
              stopScan();
              window.location.assign(parsed.url);
              return;
            } else if (parsed.tableId) {
              stopScan();
              openSessionMutation.mutate({ tableId: parsed.tableId });
              return;
            } else if (parsed.directionId) {
              stopScan();
              openSessionMutation.mutate({ directionId: parsed.directionId });
              return;
            }
          }
        } catch (e: any) {
          // ignore transient errors, but show if persistent
          setScanError(String(e?.message ?? "Không thể quét QR."));
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (e: any) {
      setScanError(String(e?.message ?? "Không thể mở camera."));
      stopScan();
    }
  };

  useEffect(() => {
    return () => {
      stopScan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // If we already have QR params, just let auto-open handle it
    if (qpTableId) {
      openSessionMutation.mutate({ tableId: qpTableId });
      return;
    }
    if (qpDirectionId) {
      openSessionMutation.mutate({ directionId: qpDirectionId });
      return;
    }

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


        <CardContent>
          <div className="space-y-4">
            {offline && (
              <Alert variant="destructive">
                <AlertDescription>Bạn đang offline. Kiểm tra mạng và thử lại.</AlertDescription>
              </Alert>
            )}

            {scanError && (
              <Alert variant="destructive">
                <AlertDescription>{scanError}</AlertDescription>
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
                    <span className="mt-1 block text-xs">Mã: {openSessionMutation.error.correlationId}</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* ✅ QR scan frame */}
            <div className="space-y-2">
              <Label>Quét QR trên bàn</Label>

              <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-dashed bg-muted/30">
                {!scanOpen ? (
                  <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                    <div className="mb-3 text-3xl">▣</div>
                    <div className="text-sm font-medium">Đưa QR vào khung này</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Bấm “Bật camera” để quét trong app (nếu thiết bị hỗ trợ).
                    </div>
                  </div>
                ) : (
                  <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
                )}
              </div>

              <div className="flex gap-2">
                {!scanOpen ? (
                  <Button type="button" className="w-full" onClick={startScan} disabled={offline || openSessionMutation.isPending}>
                    Bật camera
                  </Button>
                ) : (
                  <Button type="button" variant="outline" className="w-full" onClick={stopScan}>
                    Tắt camera
                  </Button>
                )}
              </div>

              {isQrParamMode && (
                <Alert>
                  <AlertDescription>
                    Đã nhận thông tin bàn từ QR. {openSessionMutation.isPending ? "Đang xác nhận…" : "Nếu chưa tự chuyển trang, bấm nút dưới để thử lại."}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* ✅ Manual fallback */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Nhập thủ công (demo)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={() => setShowAdvanced((v) => !v)}
                >
                  {showAdvanced ? "Ẩn nâng cao" : "Nâng cao"}
                </Button>
              </div>

              {showAdvanced && (
                <div className="space-y-2">
                  <Label htmlFor="branchId">Mã chi nhánh (nâng cao)</Label>
                  <Input
                    id="branchId"
                    type="text"
                    placeholder="VD: 1"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    disabled={offline}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="tableCode">Mã bàn</Label>
                <Input
                  id="tableCode"
                  type="text"
                  placeholder="VD: A01"
                  value={tableCode}
                  onChange={(e) => setTableCode(e.target.value)}
                  disabled={offline}
                />
                <div className="flex gap-2 pt-1">
                  {["A01", "A02", "A03"].map((c) => (
                    <Button key={c} type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => setTableCode(c)}>
                      {c}
                    </Button>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={!canSubmit}>
                {openSessionMutation.isPending ? "Đang xác nhận…" : "Xác nhận bàn"}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}