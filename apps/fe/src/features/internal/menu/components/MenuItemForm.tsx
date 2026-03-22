import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { Label } from "../../../../shared/ui/label";
import type { AdminMenuCategory } from "../services/adminMenuApi";

export type MenuItemFormValues = {
  categoryId: string;
  name: string;
  price: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
};

type MenuItemFormProps = {
  title: string;
  submitLabel: string;
  values: MenuItemFormValues;
  categories: AdminMenuCategory[];
  disabled?: boolean;
  errorMessage?: string | null;
  onChange: (patch: Partial<MenuItemFormValues>) => void;
  onSubmit: () => void;
  onCancel?: () => void;
};

export function MenuItemForm({
  title,
  submitLabel,
  values,
  categories,
  disabled = false,
  errorMessage = null,
  onChange,
  onSubmit,
  onCancel,
}: MenuItemFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>

      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="menu-category">Danh mục</Label>
              <select
                id="menu-category"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={values.categoryId}
                onChange={(e) => onChange({ categoryId: e.target.value })}
                disabled={disabled}
              >
                <option value="">Chọn danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.isActive === false ? " (đã ẩn)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu-name">Tên món</Label>
              <Input
                id="menu-name"
                value={values.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="Ví dụ: Bò Mỹ sốt tiêu đen"
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu-price">Giá</Label>
              <Input
                id="menu-price"
                value={values.price}
                onChange={(e) => onChange({ price: e.target.value })}
                placeholder="Ví dụ: 129000"
                inputMode="decimal"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="menu-image">Image URL</Label>
            <Input
              id="menu-image"
              value={values.imageUrl}
              onChange={(e) => onChange({ imageUrl: e.target.value })}
              placeholder="https://..."
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="menu-description">Mô tả</Label>
            <textarea
              id="menu-description"
              className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              value={values.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Mô tả ngắn về món ăn"
              disabled={disabled}
            />
          </div>

          <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(e) => onChange({ isActive: e.target.checked })}
              disabled={disabled}
            />
            <span>Kích hoạt món ngay sau khi lưu</span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={disabled}>
              {disabled ? "Đang lưu..." : submitLabel}
            </Button>

            {onCancel && (
              <Button type="button" variant="secondary" onClick={onCancel} disabled={disabled}>
                Hủy
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
