import { Card, CardContent, CardHeader } from "../../../../shared/ui/card";
import { Skeleton } from "../../../../shared/ui/skeleton";
import { cn } from "../../../../shared/utils/cn";

const CARD_COUNT = 9;

export function MenuSkeleton() {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3")}>
      {Array.from({ length: CARD_COUNT }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent className="pb-2">
            <Skeleton className="h-6 w-1/3" />
            <div className="mt-2 flex gap-1">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <Skeleton className="h-9 w-full rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
