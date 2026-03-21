import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../shared/ui/button";
import { cn } from "../../../../shared/utils/cn";
import type { MenuItem } from "../types";
import {
  buildItemCustomizationPayload,
  getCustomizationPreset,
  normalizeItemCustomization,
  type CustomerItemCustomizationDraft,
  type PreferenceCode,
  type SpiceLevelCode,
} from "../../shared/itemCustomization";

type CustomerMenuItemCustomizerProps = {
  item: MenuItem;
  open: boolean;
  pending?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    qty: number;
    itemOptions?: Record<string, unknown>;
  }) => void;
};

const SPICE_LEVEL_OPTIONS: Array<{ code: SpiceLevelCode; label: string }> = [
  { code: "MILD", label: "Ít cay" },
  { code: "MEDIUM", label: "Cay vừa" },
  { code: "HOT", label: "Cay nhiều" },
];

function formatVnd(price: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
}

export function CustomerMenuItemCustomizer({
  item,
  open,
  pending = false,
  onClose,
  onConfirm,
}: CustomerMenuItemCustomizerProps) {
  const preset = useMemo(() => getCustomizationPreset(item), [item]);
  const [qty, setQty] = useState(1);
  const [draft, setDraft] = useState<CustomerItemCustomizationDraft>({});

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  const normalized = normalizeItemCustomization(draft);
  const itemOptions = buildItemCustomizationPayload(normalized ?? {});

  const togglePreference = (code: PreferenceCode) => {
    setDraft((current) => {
      const currentValues = new Set(current.preferences ?? []);
      if (currentValues.has(code)) {
        currentValues.delete(code);
      } else {
        currentValues.add(code);
      }

      return {
        ...current,
        preferences: Array.from(currentValues),
      };
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#2f170b]/54 px-4 py-6 backdrop-blur-[6px] md:items-center">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />

      <section className="customer-hotpot-receipt relative z-[1] w-full max-w-2xl rounded-[32px] border border-[#e5caa3]/80 p-5 shadow-[0_32px_80px_-38px_rgba(39,18,6,0.92)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="customer-hotpot-kicker">Tùy chỉnh món</div>
            <h2 className="customer-mythmaker-title mt-2 text-3xl text-[#4f2b18]">{item.name}</h2>
            <p className="mt-2 text-sm leading-6 text-[#7a5a43]">{preset.helperText}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#dcc09a]/80 bg-[#fff8ed] px-3 py-2 text-xs uppercase tracking-[0.22em] text-[#7a5330] transition hover:bg-[#fff2df]"
          >
            Đóng
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            {preset.allowSpiceLevel ? (
              <div className="customer-hotpot-stat rounded-[24px] px-4 py-4">
                <div className="text-sm font-semibold text-[#5a301a]">Độ cay</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SPICE_LEVEL_OPTIONS.map((option) => {
                    const active = draft.spiceLevel === option.code;
                    return (
                      <button
                        key={option.code}
                        type="button"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            spiceLevel: current.spiceLevel === option.code ? null : option.code,
                          }))
                        }
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm font-medium transition",
                          active
                            ? "border-[#b83022] bg-[#c93d2d] text-[#fff8ef]"
                            : "border-[#dfc49f]/80 bg-[#fff9ef] text-[#6e4424] hover:bg-[#fff0dd]",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="customer-hotpot-stat rounded-[24px] px-4 py-4">
              <div className="text-sm font-semibold text-[#5a301a]">Ghi chú gửi bếp</div>
              <textarea
                value={draft.note ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    note: event.target.value.slice(0, 180),
                  }))
                }
                rows={4}
                maxLength={180}
                placeholder="Ví dụ: không hành, lên món sau, ưu tiên chấm riêng..."
                className="mt-3 min-h-[112px] w-full rounded-[20px] border border-[#dcc09a]/80 bg-[#fffaf2] px-4 py-3 text-sm text-[#623821] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition placeholder:text-[#a18772] focus:border-[#c6654c] focus:ring-2 focus:ring-[#e7b191]/45"
              />
            </div>

            <div className="customer-hotpot-stat rounded-[24px] px-4 py-4">
              <div className="text-sm font-semibold text-[#5a301a]">Phục vụ theo ý bạn</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {preset.preferenceOptions.map((option) => {
                  const active = draft.preferences?.includes(option.code) ?? false;
                  return (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => togglePreference(option.code)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium transition",
                        active
                          ? "border-[#5f7a35] bg-[#6f9342] text-[#f8ffe8]"
                          : "border-[#dfc49f]/80 bg-[#fff9ef] text-[#6e4424] hover:bg-[#fff0dd]",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="customer-hotpot-stat rounded-[28px] px-5 py-5">
            <div className="customer-hotpot-kicker">Tổng hợp</div>
            <div className="customer-mythmaker-title mt-2 text-3xl text-[#4d2715]">Thêm vào giỏ</div>

            <div className="mt-5 rounded-[22px] border border-[#e0c49d]/75 bg-[#fff8ed] px-4 py-4">
              <div className="text-sm text-[#7a5a43]">Đơn giá</div>
              <div className="mt-2 text-2xl font-semibold text-[#c43c2d]">{formatVnd(item.price)}</div>
            </div>

            <div className="mt-4 rounded-[22px] border border-[#e0c49d]/75 bg-[#fff8ed] px-4 py-4">
              <div className="text-sm text-[#7a5a43]">Số lượng</div>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full border-[#d9bd95]/80 bg-white text-[#6f4425] hover:bg-[#fff0d7]"
                  onClick={() => setQty((current) => Math.max(1, current - 1))}
                  disabled={pending || qty <= 1}
                >
                  -
                </Button>
                <span className="min-w-[2.4rem] text-center text-lg font-semibold text-[#5c3119]">{qty}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full border-[#d9bd95]/80 bg-white text-[#6f4425] hover:bg-[#fff0d7]"
                  onClick={() => setQty((current) => Math.min(20, current + 1))}
                  disabled={pending}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-[22px] border border-dashed border-[#e2c7a3] bg-[#fffbf4] px-4 py-4">
              <div className="text-sm font-medium text-[#6a4226]">Bếp sẽ nhận theo:</div>
              {itemOptions ? (
                <ul className="mt-3 space-y-2 text-sm text-[#7a5a43]">
                  {preset.allowSpiceLevel && normalized?.spiceLevel ? (
                    <li>Độ cay: {SPICE_LEVEL_OPTIONS.find((option) => option.code === normalized.spiceLevel)?.label}</li>
                  ) : null}
                  {(normalized?.preferences ?? []).map((code) => {
                    const label = preset.preferenceOptions.find((option) => option.code === code)?.label ?? code;
                    return <li key={code}>{label}</li>;
                  })}
                  {normalized?.note ? <li>Ghi chú: {normalized.note}</li> : null}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[#8a694f]">
                  Chưa có tùy chỉnh nào. Nếu bạn muốn, có thể gửi bếp một ghi chú ngắn gọn.
                </p>
              )}
            </div>

            <div className="mt-5 space-y-3">
              <Button
                type="button"
                size="lg"
                className="w-full rounded-full border border-[#b83022] bg-[linear-gradient(180deg,#d34a34_0%,#a82e22_100%)] text-[#fff7f0] shadow-[0_18px_40px_-24px_rgba(94,26,16,0.9)] hover:brightness-110"
                disabled={pending}
                onClick={() => onConfirm({ qty, itemOptions })}
              >
                {pending ? "Đang thêm..." : "Thêm món đã tùy chỉnh"}
              </Button>

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-full border border-[#d9bd95]/80 bg-[#fff8ec] px-4 py-3 text-sm font-medium text-[#6a3b20] transition hover:bg-[#fff2df]"
              >
                Quay lại
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
