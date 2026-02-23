import { useParams } from "react-router-dom";

/**
 * Stub for /i/:branchId/tables to prove RequireAuth + branch param.
 */
export function InternalTablesStubPage() {
  const { branchId } = useParams<{ branchId: string }>();

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">
        Bàn — Chi nhánh {branchId}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Stub. Tables list in later PR.
      </p>
    </main>
  );
}
