import { Skeleton } from "../../../../shared/ui/skeleton";

const CARD_COUNT = 9;

export function MenuSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: CARD_COUNT }).map((_, index) => (
        <div key={index} className="customer-hotpot-receipt overflow-hidden rounded-[28px] p-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-[#eadcc0]">
            <div className="absolute left-1/2 top-1/2 h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f8f3ea]" />
            <Skeleton className="absolute left-1/2 top-1/2 h-[56%] w-[56%] -translate-x-1/2 -translate-y-1/2 rounded-full" />
          </div>

          <div className="mt-5 space-y-3">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-8 w-4/5 rounded-xl" />
            <Skeleton className="h-5 w-2/5 rounded-full" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-11 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
