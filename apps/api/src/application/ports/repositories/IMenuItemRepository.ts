export interface IMenuItemRepository {
  getUnitPrice(itemId: string): Promise<number | null>;
}
