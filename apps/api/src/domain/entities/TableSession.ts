export type TableSessionStatus = "OPEN" | "CLOSED";

export class TableSession {
  constructor(
    public readonly id: string,
    public readonly sessionKey: string,
    public readonly tableId: string,
    public readonly status: TableSessionStatus,
    public readonly openedAt: Date,
    public readonly closedAt: Date | null = null,
  ) {}
}
