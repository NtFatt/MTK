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
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-3 bg-transparent p-0">
        {categories.map((cat) => {
          const count = countByCategoryId?.[cat.id];
          const active = cat.id === activeCategoryId;

          return (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              data-active={active ? "true" : "false"}
              className={cn(
                "customer-hotpot-bamboo-tag flex items-center gap-2 !bg-transparent px-4 py-3 text-sm data-[state=active]:!bg-transparent"
              )}
            >
              <span>{cat.name}</span>
              {count !== undefined ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                    active ? "bg-white/20 text-[#fff7ef]" : "bg-[#fff6ea] text-[#93633c]"
                  )}
                >
                  {count}
                </span>
              ) : null}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
