export type MeatKind = "BEEF" | "PORK" | "LAMB" | "CHICKEN" | "SEAFOOD" | "OTHER";

export class MeatProfile {
  constructor(
    public readonly itemId: string,
    public readonly meatKind: MeatKind,
    public readonly cut: string,
    public readonly origin?: string | null,
    public readonly portionGrams?: number | null,
    public readonly marblingLevel?: number | null,
  ) {}
}
