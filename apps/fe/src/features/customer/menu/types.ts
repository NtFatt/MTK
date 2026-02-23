export interface MenuCategory {
  id: string;
  name: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  categoryId: string;
  tags?: string[];
  isAvailable: boolean;
}
