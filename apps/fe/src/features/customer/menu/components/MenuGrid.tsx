import type { MenuItem } from "../types";
import { MenuCard } from "./MenuCard";
import { cn } from "../../../../shared/utils/cn";

type MenuGridProps = {
  items: MenuItem[];
};

export function MenuGrid({ items }: MenuGridProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3")}>
      {items.map((item, index) => (
        <div
          key={item.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${Math.min(index * 70, 420)}ms` }}
        >
          <MenuCard item={item} />
        </div>
      ))}
    </div>
  );
}
