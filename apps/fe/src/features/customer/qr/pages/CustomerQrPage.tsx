import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Button } from "../../../../shared/ui/button";
import { Input } from "../../../../shared/ui/input";
import { Label } from "../../../../shared/ui/label";
import { useOpenSessionMutation } from "../../../../shared/customer/session/useOpenSessionMutation";
import {
  formatCustomerSessionRecoveryMessage,
  getCustomerSessionRecoveryReason,
} from "../../../../shared/customer/session/sessionRecovery";
import { resolveTableIdByCode } from "../../../../shared/customer/tables/tableLookup";
import { CustomerHotpotShell } from "../../shared/components/CustomerHotpotShell";

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

function hasBarcodeDetector(): boolean {
  return typeof window !== "undefined" && typeof (window as any).BarcodeDetector === "function";
}

function parseScannedValue(raw: string): {
  url?: string;
  directionId?: string;
  tableId?: string;
  error?: string;
} {
  const v = raw.trim();
  if (!v) return { error: "QR rỗng." };

  try {
    const u = new URL(v, window.location.origin);
    if (u.origin !== window.location.origin) {
      return { error: "QR không thuộc hệ thống này. Hãy quét QR đúng của quán." };
    }
    return { url: u.toString() };
  } catch {
    // ignore
  }

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
  const [sessionRecoveryMessage] = useState<string | null>(() => {
    const reason = getCustomerSessionRecoveryReason();
    return reason ? formatCustomerSessionRecoveryMessage(reason) : null;
  });

  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const isQrParamMode = Boolean(qpTableId || qpDirectionId);

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
    if (qpTableId || qpDirectionId) return true;
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
      setScanError(
        "Thiết bị/trình duyệt không hỗ trợ quét QR trong app. Hãy dùng camera điện thoại để quét QR trên bàn.",
      );
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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

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
    <CustomerHotpotShell contentClassName="max-w-5xl">
      <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
        <section className="space-y-4">
          <div className="space-y-2">
            <div className="customer-hotpot-kicker">Mở bàn tại quán</div>
            <h1 className="customer-mythmaker-title customer-hotpot-page-title">Bắt đầu gọi món</h1>
            <p className="customer-hotpot-page-subtitle">
              Quét QR trên bàn hoặc nhập mã bàn để vào đúng phiên gọi món. Sau khi mở bàn, bạn sẽ
              đi thẳng vào thực đơn của quán.
            </p>
          </div>

          <div className="customer-mythmaker-panel-strong relative overflow-hidden rounded-[32px] px-6 py-6 text-[#fff2da] shadow-[0_30px_80px_-40px_rgba(56,29,10,0.86)]">
            <span className="customer-hotpot-steam absolute left-8 top-6 scale-75" />
            <span className="customer-hotpot-steam customer-hotpot-steam-delay-2 absolute left-16 top-2 scale-[0.65]" />
            <div className="pointer-events-none absolute inset-0 opacity-15 [background:repeating-linear-gradient(90deg,rgba(255,255,255,0.08)_0,rgba(255,255,255,0.08)_2px,transparent_2px,transparent_22px)]" />

            <div className="relative z-10">
              <div className="customer-mythmaker-script text-[2rem] text-[#ffd07a]">Mời vào quán</div>
              <div className="customer-mythmaker-title mt-2 text-4xl text-[#fff4df]">Đèn đã lên, bếp đã nóng</div>
              <p className="mt-4 text-sm leading-6 text-[#f4e5ca]/84">
                Nếu bạn đang ngồi tại bàn, cách nhanh nhất là quét QR trên bàn. Nếu không, nhập mã
                bàn thủ công để tiếp tục.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {["Quét QR", "Nhập mã bàn", "Gọi món tại bàn"].map((label) => (
                  <span key={label} className="customer-hotpot-chip px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="customer-hotpot-receipt rounded-[32px] p-5 sm:p-6">
          <div className="space-y-5">
            {(offline || scanError || localError || sessionRecoveryMessage || openSessionMutation.error) ? (
              <div className="space-y-3">
                {offline ? (
                  <Alert variant="destructive" className="rounded-[20px] border-[#e4bfb4] bg-[#fff4ef]">
                    <AlertDescription>Bạn đang offline. Kiểm tra mạng và thử lại.</AlertDescription>
                  </Alert>
                ) : null}

                {scanError ? (
                  <Alert variant="destructive" className="rounded-[20px] border-[#e4bfb4] bg-[#fff4ef]">
                    <AlertDescription>{scanError}</AlertDescription>
                  </Alert>
                ) : null}

                {localError ? (
                  <Alert variant="destructive" className="rounded-[20px] border-[#e4bfb4] bg-[#fff4ef]">
                    <AlertDescription>{localError}</AlertDescription>
                  </Alert>
                ) : null}

                {sessionRecoveryMessage ? (
                  <Alert className="rounded-[20px] border-[#e0c49d]/80 bg-[#fff8ec]">
                    <AlertDescription>{sessionRecoveryMessage}</AlertDescription>
                  </Alert>
                ) : null}

                {openSessionMutation.error ? (
                  <Alert variant="destructive" className="rounded-[20px] border-[#e4bfb4] bg-[#fff4ef]">
                    <AlertDescription>
                      {openSessionMutation.error.code === "NO_TABLE_AVAILABLE" ||
                      openSessionMutation.error.code === "TABLE_RESERVED_SOON"
                        ? "Không thể mở bàn lúc này (bàn không khả dụng hoặc sắp có đặt trước)."
                        : openSessionMutation.error.code === "TABLE_OUT_OF_SERVICE"
                          ? "Bàn đang tạm ngưng phục vụ."
                          : openSessionMutation.error.code === "TABLE_NOT_FOUND"
                            ? "Không tìm thấy bàn. Hãy kiểm tra lại mã bàn."
                            : openSessionMutation.error.code === "INVALID_DIRECTION_ID"
                              ? "Thiếu thông tin bàn. Hãy nhập mã bàn hoặc quét QR."
                              : openSessionMutation.error.message}
                      {openSessionMutation.error.correlationId ? (
                        <span className="mt-1 block text-xs">Mã: {openSessionMutation.error.correlationId}</span>
                      ) : null}
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="customer-hotpot-kicker">Quét mã QR</div>
              <Label className="text-[#6a4226]">Đưa QR vào khung này</Label>

              <div className="relative aspect-square w-full overflow-hidden rounded-[26px] border border-dashed border-[#d8bc93] bg-[linear-gradient(180deg,#f7ecda_0%,#efe1c6_100%)]">
                {!scanOpen ? (
                  <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                    <div className="customer-mythmaker-title text-5xl text-[#8a5c34]">▣</div>
                    <div className="mt-3 text-sm font-medium text-[#5f3a22]">Đưa QR vào khung này</div>
                    <div className="mt-1 text-xs text-[#8a694f]">
                      Bấm “Bật camera” để quét trực tiếp trong app nếu thiết bị hỗ trợ.
                    </div>
                  </div>
                ) : (
                  <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
                )}
              </div>

              <div className="flex gap-2">
                {!scanOpen ? (
                  <Button
                    type="button"
                    className="w-full rounded-full border border-[#b83022] bg-[linear-gradient(180deg,#d34a34_0%,#a82e22_100%)] text-[#fff7f0] shadow-[0_18px_40px_-24px_rgba(94,26,16,0.9)] hover:brightness-110"
                    onClick={startScan}
                    disabled={offline || openSessionMutation.isPending}
                  >
                    Bật camera
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-full border-[#d9bd95]/80 bg-[#fff8ec] text-[#6a3b20] hover:bg-[#fff2df]"
                    onClick={stopScan}
                  >
                    Tắt camera
                  </Button>
                )}
              </div>

              {isQrParamMode ? (
                <Alert className="rounded-[20px] border-[#e0c49d]/80 bg-[#fff8ec]">
                  <AlertDescription>
                    Đã nhận thông tin bàn từ QR.{" "}
                    {openSessionMutation.isPending ? "Đang xác nhận..." : "Nếu chưa tự chuyển trang, bấm nút dưới để thử lại."}
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 border-t border-[#e0c49d]/70 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="customer-hotpot-kicker">Nhập thủ công</div>
                  <Label className="text-[#6a4226]">Điền mã bàn nếu không quét QR</Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full px-3 text-xs text-[#7b5a42] hover:bg-[#fff0db]"
                  onClick={() => setShowAdvanced((v) => !v)}
                >
                  {showAdvanced ? "Ẩn nâng cao" : "Nâng cao"}
                </Button>
              </div>

              {showAdvanced ? (
                <div className="space-y-2">
                  <Label htmlFor="branchId" className="text-[#6a4226]">Mã chi nhánh</Label>
                  <Input
                    id="branchId"
                    type="text"
                    placeholder="VD: 1"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    disabled={offline}
                    className="customer-hotpot-input"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="tableCode" className="text-[#6a4226]">Mã bàn</Label>
                <Input
                  id="tableCode"
                  type="text"
                  placeholder="VD: A01"
                  value={tableCode}
                  onChange={(e) => setTableCode(e.target.value)}
                  disabled={offline}
                  className="customer-hotpot-input"
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  {["A01", "A02", "A03"].map((c) => (
                    <Button
                      key={c}
                      type="button"
                      variant="outline"
                      className="rounded-full border-[#d9bd95]/80 bg-[#fff8ec] px-3 text-xs text-[#6a3b20] hover:bg-[#fff2df]"
                      onClick={() => setTableCode(c)}
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full rounded-full border border-[#b83022] bg-[linear-gradient(180deg,#d34a34_0%,#a82e22_100%)] text-[#fff7f0] shadow-[0_18px_40px_-24px_rgba(94,26,16,0.9)] hover:brightness-110"
                disabled={!canSubmit}
              >
                {openSessionMutation.isPending ? "Đang xác nhận..." : "Xác nhận bàn"}
              </Button>
            </form>
          </div>
        </section>
      </div>
    </CustomerHotpotShell>
  );
}
