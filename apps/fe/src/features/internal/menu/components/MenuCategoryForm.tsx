import { Alert, AlertDescription } from "../../../../shared/ui/alert";
import { Button } from "../../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/ui/card";
import { Input } from "../../../../shared/ui/input";
import { Label } from "../../../../shared/ui/label";

export type MenuCategoryFormValues = {
  name: string;
  sortOrder: string;
  isActive: boolean;
};

type MenuCategoryFormProps = {
  title: string;
  submitLabel: string;
  values: MenuCategoryFormValues;
  disabled?: boolean;
  errorMessage?: string | null;
  onChange: (patch: Partial<MenuCategoryFormValues>) => void;
  onSubmit: () => void;
  onCancel?: () => void;
};

export function MenuCategoryForm({
  title,
  submitLabel,
  values,
  disabled = false,
  errorMessage = null,
  onChange,
  onSubmit,
  onCancel,
}: MenuCategoryFormProps) {
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="menu-category-name">Tên danh mục</Label>
              <Input
                id="menu-category-name"
                value={values.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="Ví dụ: Thịt bò"
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu-category-sort">Thứ tự hiển thị</Label>
              <Input
                id="menu-category-sort"
                value={values.sortOrder}
                onChange={(e) => onChange({ sortOrder: e.target.value })}
                inputMode="numeric"
                placeholder="0"
                disabled={disabled}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(e) => onChange({ isActive: e.target.checked })}
              disabled={disabled}
            />
            <span>Hiển thị danh mục này ở menu khách hàng</span>
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
