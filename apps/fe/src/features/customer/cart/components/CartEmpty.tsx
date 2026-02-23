import { Link } from "react-router-dom";
import { Card, CardContent } from "../../../../shared/ui/card";
import { buttonVariants } from "../../../../shared/ui/button";

export function CartEmpty() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Giỏ hàng trống.</p>
        <Link to="/c/menu" className={buttonVariants({ variant: "outline" }) + " mt-4 inline-block"}>
          Xem thực đơn
        </Link>
      </CardContent>
    </Card>
  );
}
