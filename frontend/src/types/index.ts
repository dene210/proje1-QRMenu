export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
  displayOrder: number;
  categoryId: number;
  categoryName: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
  menuItems: MenuItem[];
}

export interface Restaurant {
  id: number;
  name: string;
  slug: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
  categories: Category[];
}

export interface QRCodeStats {
  date: string;
  totalAccesses: number;
  tableAccessCounts: { [key: number]: number };
  hourlyAccessCounts: { [key: number]: number };
}

export interface QRCodeAccessStats {
  date: string;
  accessCount: number;
}

export interface UserDto {
  id: number;
  username: string;
  email: string;
  restaurantId?: number;
  restaurantName?: string;
  restaurantSlug?: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
} 