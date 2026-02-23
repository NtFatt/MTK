export class MenuItem {
  constructor(
    public readonly id: string,
    public readonly categoryId: string,
    public readonly name: string,
    public readonly price: number,
    public readonly description?: string | null,
    public readonly imageUrl?: string | null,
    public readonly isActive: boolean = true,
    public readonly stockQty?: number | null,
    public readonly categoryName?: string | null,
    public readonly isCombo?: boolean,
    public readonly isMeat?: boolean,
  ) {}
}
