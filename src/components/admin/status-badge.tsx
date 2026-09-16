import { Badge } from "@/components/ui/badge";
import type { ProductStatus } from "@/lib/types/product";

export function StatusBadge({ status }: { status: ProductStatus }) {
  if (status === "PUBLISHED") {
    return (
      <Badge className="border-green-200 bg-green-50 text-green-700 hover:bg-green-50">
        Published
      </Badge>
    );
  }
  return <Badge variant="secondary">Draft</Badge>;
}
