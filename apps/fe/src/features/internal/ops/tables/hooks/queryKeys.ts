export type OpsTablesParams = { branchId: string | number };

/** Local query key until contracts exposes qk.ops.tables.* */
export function opsTablesQueryKey(params: OpsTablesParams): readonly [
  "admin",
  "ops",
  "tables",
  OpsTablesParams
] {
  return ["admin", "ops", "tables", params];
}
