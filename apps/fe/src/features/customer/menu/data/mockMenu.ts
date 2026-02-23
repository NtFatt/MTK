import type { MenuCategory, MenuItem } from "../types";

export const CATEGORIES: MenuCategory[] = [
  { id: "all", name: "Tất cả" },
  { id: "lau", name: "Lẩu" },
  { id: "nuong", name: "Đồ nướng" },
  { id: "hai-san", name: "Hải sản" },
  { id: "thit", name: "Thịt" },
  { id: "rau", name: "Rau & Nấm" },
  { id: "nuoc", name: "Đồ uống" },
  { id: "com", name: "Cơm & Mì" },
  { id: "trang-mieng", name: "Tráng miệng" },
];

const placeholder = "https://placehold.co/400x300/e8e4e0/c4bfb8?text=Hadilao";

export const ITEMS: MenuItem[] = [
  { id: "1", name: "Lẩu Tứ Xuyên", price: 299000, imageUrl: placeholder, categoryId: "lau", tags: ["Đặc sản"], isAvailable: true },
  { id: "2", name: "Lẩu Thái chua cay", price: 279000, imageUrl: placeholder, categoryId: "lau", tags: ["Bán chạy"], isAvailable: true },
  { id: "3", name: "Lẩu Nấm thanh đạm", price: 259000, categoryId: "lau", tags: [], isAvailable: true },
  { id: "4", name: "Lẩu Tom Yum", price: 289000, imageUrl: placeholder, categoryId: "lau", tags: [], isAvailable: true },
  { id: "5", name: "Bò Mỹ nhúng lẩu", price: 189000, imageUrl: placeholder, categoryId: "thit", tags: ["Premium"], isAvailable: true },
  { id: "6", name: "Ba chỉ bò Mỹ", price: 169000, imageUrl: placeholder, categoryId: "thit", tags: [], isAvailable: true },
  { id: "7", name: "Sườn non nướng", price: 129000, imageUrl: placeholder, categoryId: "nuong", tags: [], isAvailable: true },
  { id: "8", name: "Tôm sú nướng", price: 159000, imageUrl: placeholder, categoryId: "hai-san", tags: [], isAvailable: true },
  { id: "9", name: "Mực lá nướng", price: 139000, imageUrl: placeholder, categoryId: "hai-san", tags: [], isAvailable: true },
  { id: "10", name: "Rau cải thìa", price: 35000, categoryId: "rau", tags: [], isAvailable: true },
  { id: "11", name: "Nấm kim châm", price: 45000, categoryId: "rau", tags: [], isAvailable: true },
  { id: "12", name: "Nấm đùi gà", price: 55000, imageUrl: placeholder, categoryId: "rau", tags: [], isAvailable: true },
  { id: "13", name: "Trà đào", price: 29000, categoryId: "nuoc", tags: [], isAvailable: true },
  { id: "14", name: "Trà chanh", price: 25000, categoryId: "nuoc", tags: [], isAvailable: true },
  { id: "15", name: "Bia Tiger", price: 18000, categoryId: "nuoc", tags: [], isAvailable: true },
  { id: "16", name: "Cơm trắng", price: 15000, categoryId: "com", tags: [], isAvailable: true },
  { id: "17", name: "Mì tôm", price: 25000, categoryId: "com", tags: [], isAvailable: true },
  { id: "18", name: "Bánh tráng nướng", price: 35000, categoryId: "trang-mieng", tags: [], isAvailable: true },
  { id: "19", name: "Chè ba màu", price: 32000, categoryId: "trang-mieng", tags: [], isAvailable: false },
  { id: "20", name: "Lẩu Cua gạch", price: 399000, imageUrl: placeholder, categoryId: "lau", tags: ["Đặc sản", "Premium"], isAvailable: true },
  { id: "21", name: "Sườn bò nướng", price: 179000, imageUrl: placeholder, categoryId: "nuong", tags: [], isAvailable: true },
  { id: "22", name: "Hàu nướng mỡ hành", price: 89000, imageUrl: placeholder, categoryId: "hai-san", tags: [], isAvailable: true },
  { id: "23", name: "Đùi gà nướng", price: 79000, categoryId: "nuong", tags: [], isAvailable: true },
  { id: "24", name: "Rau muống", price: 30000, categoryId: "rau", tags: [], isAvailable: true },
];
