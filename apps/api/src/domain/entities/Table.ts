export type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "OUT_OF_SERVICE";

export class Table {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly status: TableStatus,
    public readonly directionId: string,
    public readonly seats: number,
    public readonly areaName?: string | null,
    public readonly branchId?: string | null,
  ) {}
}
