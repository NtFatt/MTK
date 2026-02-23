export type ComboLine = {
  itemId: string;
  itemName: string;
  price: number;
  quantity: number;
  groupName: string | null;
  isRequired: boolean;
  sortOrder: number;
};

export class ComboDetail {
  constructor(
    public readonly comboId: string,
    public readonly comboItemId: string,
    public readonly serveFor: number,
    public readonly allowCustomization: boolean,
    public readonly lines: ComboLine[],
  ) {}
}
