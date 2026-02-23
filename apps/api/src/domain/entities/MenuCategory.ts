export class MenuCategory {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly sortOrder: number,
    public readonly isActive: boolean,
  ) {}
}
