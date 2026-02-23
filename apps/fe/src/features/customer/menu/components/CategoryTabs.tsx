import type { MenuCategory } from "../types";
import { Tabs, TabsList, TabsTrigger } from "../../../../shared/ui/tabs";
import { cn } from "../../../../shared/utils/cn";

type CategoryTabsProps = {
  categories: MenuCategory[];
  activeCategoryId: string;
  onChange: (categoryId: string) => void;
  countByCategoryId?: Record<string, number>;
};

export function CategoryTabs({
  categories,
  activeCategoryId,
  onChange,
  countByCategoryId,
}: CategoryTabsProps) {
  return (
    <Tabs value={activeCategoryId} onValueChange={onChange} className="w-full">
      <TabsList className={cn("flex w-full flex-wrap justify-start gap-1 bg-muted/60 p-1")}>
        {categories.map((cat) => {
          const count = countByCategoryId?.[cat.id];
          return (
            <TabsTrigger key={cat.id} value={cat.id} className="flex items-center gap-1.5">
              <span>{cat.name}</span>
              {count !== undefined && (
                <span className="rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-xs text-muted-foreground">
                  {count}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
