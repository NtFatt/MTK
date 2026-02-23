import { Button } from "../../../../shared/ui/button";
import { cn } from "../../../../shared/utils/cn";

export function MenuEmpty() {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-border bg-card/50 py-16 text-center")}>
      <p className="text-muted-foreground">Chưa có món phù hợp</p>
      <Button variant="outline" className="mt-4" type="button">
        Thử lại
      </Button>
    </div>
  );
}
