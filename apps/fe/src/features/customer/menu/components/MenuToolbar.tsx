import { Input } from "../../../../shared/ui/input";

export type MenuSortMode =
  | "featured"
  | "available-first"
  | "price-asc"
  | "price-desc"
  | "name-asc";

type MenuToolbarProps = {
  searchTerm: string;
  sortMode: MenuSortMode;
  onlyAvailable: boolean;
  resultCount: number;
  totalCount: number;
  onSearchTermChange: (value: string) => void;
  onSortModeChange: (value: MenuSortMode) => void;
  onOnlyAvailableChange: (value: boolean) => void;
  onClearFilters: () => void;
};

export function MenuToolbar({
  searchTerm,
  sortMode,
  onlyAvailable,
  resultCount,
  totalCount,
  onSearchTermChange,
  onSortModeChange,
  onOnlyAvailableChange,
  onClearFilters,
}: MenuToolbarProps) {
  const hasFilters = Boolean(searchTerm.trim()) || onlyAvailable || sortMode !== "featured";

  return (
    <div className="customer-hotpot-receipt mt-4 rounded-[26px] px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-[1.3fr_0.8fr_auto]">
          <label className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.24em] text-[#8b643e]">Tìm món nhanh</div>
            <Input
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="Tìm theo tên món, combo, tag..."
              className="h-12 rounded-[20px] border-[#dcc09a]/80 bg-[#fffaf2] px-4 text-[#623821] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] placeholder:text-[#a18772]"
            />
          </label>

          <label className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.24em] text-[#8b643e]">Sắp xếp</div>
            <select
              value={sortMode}
              onChange={(event) => onSortModeChange(event.target.value as MenuSortMode)}
              className="h-12 w-full rounded-[20px] border border-[#dcc09a]/80 bg-[#fffaf2] px-4 text-sm text-[#623821] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition focus:border-[#c6654c] focus:ring-2 focus:ring-[#e7b191]/45"
            >
              <option value="featured">Mặc định của quán</option>
              <option value="available-first">Còn hàng trước</option>
              <option value="price-asc">Giá tăng dần</option>
              <option value="price-desc">Giá giảm dần</option>
              <option value="name-asc">Tên A-Z</option>
            </select>
          </label>

          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.24em] text-[#8b643e]">Lọc nhanh</div>
            <button
              type="button"
              onClick={() => onOnlyAvailableChange(!onlyAvailable)}
              className={`h-12 w-full rounded-[20px] border px-4 text-sm font-medium transition ${
                onlyAvailable
                  ? "border-[#5f7a35] bg-[#6f9342] text-[#f8ffe8]"
                  : "border-[#dcc09a]/80 bg-[#fffaf2] text-[#623821] hover:bg-[#fff0dd]"
              }`}
            >
              {onlyAvailable ? "Đang lọc món còn hàng" : "Chỉ hiện món còn hàng"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <div className="rounded-full border border-[#e1c49f]/80 bg-[#fff8ed] px-4 py-2 text-sm text-[#734a2a]">
            {resultCount}/{totalCount} món đang hiện
          </div>

          {hasFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-full border border-[#dcc09a]/80 bg-[#fffaf2] px-4 py-2 text-sm font-medium text-[#6a3b20] transition hover:bg-[#fff0dd]"
            >
              Bỏ lọc
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
