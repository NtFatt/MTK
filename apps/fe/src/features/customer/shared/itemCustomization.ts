import type { MenuItem } from "../menu/types";

export type SpiceLevelCode = "MILD" | "MEDIUM" | "HOT";
export type PreferenceCode =
  | "NO_SCALLION"
  | "SEPARATE_DIP"
  | "EXTRA_BROTH"
  | "SERVE_LATER"
  | "SHARE_PORTION";

export type CustomerItemCustomizationDraft = {
  spiceLevel?: SpiceLevelCode | null;
  preferences?: PreferenceCode[];
  note?: string;
};

export type CustomizationPresetOption = {
  code: PreferenceCode;
  label: string;
};

export type CustomizationPreset = {
  allowSpiceLevel: boolean;
  preferenceOptions: CustomizationPresetOption[];
  helperText: string;
};

const SPICE_LABELS: Record<SpiceLevelCode, string> = {
  MILD: "Ít cay",
  MEDIUM: "Cay vừa",
  HOT: "Cay nhiều",
};

const PREFERENCE_LABELS: Record<PreferenceCode, string> = {
  NO_SCALLION: "Không hành",
  SEPARATE_DIP: "Chấm riêng",
  EXTRA_BROTH: "Thêm nước dùng",
  SERVE_LATER: "Ra món sau",
  SHARE_PORTION: "Tách phần",
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function includesKeyword(haystack: string, keywords: string[]): boolean {
  return keywords.some((keyword) => haystack.includes(keyword));
}

function searchableItemText(item: Pick<MenuItem, "name" | "tags" | "categoryId">): string {
  return [item.name, item.categoryId, ...(item.tags ?? [])]
    .map((part) => normalizeText(part).toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function uniquePreferenceOptions(options: PreferenceCode[]): CustomizationPresetOption[] {
  return Array.from(new Set(options)).map((code) => ({
    code,
    label: PREFERENCE_LABELS[code],
  }));
}

function stableNormalize(value: unknown): unknown {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return value.map(stableNormalize);
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      normalized[key] = stableNormalize(record[key]);
    }
    return normalized;
  }
  return value;
}

export function getCustomizationPreset(item: Pick<MenuItem, "name" | "tags" | "categoryId">): CustomizationPreset {
  const haystack = searchableItemText(item);
  const hotpotLike = includesKeyword(haystack, [
    "lau",
    "lẩu",
    "hotpot",
    "broth",
    "soup",
    "spicy",
    "cay",
    "kimchi",
    "tomyum",
  ]);
  const comboLike = includesKeyword(haystack, ["combo", "set", "sharing", "share"]);
  const proteinLike = includesKeyword(haystack, [
    "bo",
    "bò",
    "thit",
    "thịt",
    "beef",
    "pork",
    "chicken",
    "hai san",
    "seafood",
  ]);

  const preferenceCodes: PreferenceCode[] = ["NO_SCALLION", "SEPARATE_DIP"];
  if (hotpotLike) preferenceCodes.push("EXTRA_BROTH");
  if (comboLike) preferenceCodes.push("SHARE_PORTION");
  if (!comboLike && proteinLike) preferenceCodes.push("SERVE_LATER");

  return {
    allowSpiceLevel: hotpotLike,
    preferenceOptions: uniquePreferenceOptions(preferenceCodes),
    helperText: hotpotLike
      ? "Lựa chọn sẽ được lưu cùng món để bếp nhận đúng khẩu vị và cách phục vụ."
      : "Thêm ghi chú ngắn gọn để quán phục vụ đúng nhịp và khẩu vị của bạn.",
  };
}

export function normalizeItemCustomization(
  value: unknown,
): CustomerItemCustomizationDraft | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const spiceLevelRaw =
    normalizeText(record.spiceLevel) ||
    normalizeText((record.spiceLevel as Record<string, unknown> | undefined)?.code);
  const spiceLevel =
    spiceLevelRaw === "MILD" || spiceLevelRaw === "MEDIUM" || spiceLevelRaw === "HOT"
      ? spiceLevelRaw
      : null;

  const preferenceRaw = Array.isArray(record.preferences)
    ? record.preferences
    : Array.isArray(record.preferenceCodes)
      ? record.preferenceCodes
      : [];

  const preferences = Array.from(
    new Set(
      preferenceRaw
        .map((entry) => normalizeText(entry).toUpperCase())
        .filter((entry): entry is PreferenceCode => entry in PREFERENCE_LABELS),
    ),
  ).sort();

  const note = normalizeText(record.note);

  if (!spiceLevel && preferences.length === 0 && !note) {
    return null;
  }

  return {
    spiceLevel,
    preferences,
    note,
  };
}

export function buildItemCustomizationPayload(
  draft: CustomerItemCustomizationDraft,
): Record<string, unknown> | undefined {
  const note = normalizeText(draft.note);
  const preferences = Array.from(new Set(draft.preferences ?? [])).sort();
  const spiceLevel = draft.spiceLevel ?? null;

  const payload: Record<string, unknown> = {};

  if (spiceLevel) {
    payload.spiceLevel = {
      code: spiceLevel,
      label: SPICE_LABELS[spiceLevel],
    };
  }

  if (preferences.length > 0) {
    payload.preferences = preferences;
  }

  if (note) {
    payload.note = note;
  }

  return Object.keys(payload).length > 0 ? payload : undefined;
}

export function buildItemCustomizationKey(value: unknown): string {
  const normalized = normalizeItemCustomization(value);
  return normalized ? JSON.stringify(stableNormalize(normalized)) : "";
}

export function sameItemCustomization(left: unknown, right: unknown): boolean {
  return buildItemCustomizationKey(left) === buildItemCustomizationKey(right);
}

export function summarizeItemCustomization(value: unknown): {
  chips: string[];
  note: string | null;
} {
  const normalized = normalizeItemCustomization(value);
  if (!normalized) return { chips: [], note: null };

  const chips: string[] = [];
  if (normalized.spiceLevel) {
    chips.push(SPICE_LABELS[normalized.spiceLevel]);
  }
  for (const preference of normalized.preferences ?? []) {
    chips.push(PREFERENCE_LABELS[preference]);
  }

  return {
    chips,
    note: normalized.note?.trim() || null,
  };
}
