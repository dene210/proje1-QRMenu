import axios, { AxiosInstance } from 'axios';
import { Restaurant, QRCodeStats, QRCodeAccessStats, UserDto } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5092/api';

// Request cache for preventing duplicates
const requestCache = new Map<string, { timestamp: number; promise: Promise<any> }>();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add authentication token
    const token = localStorage.getItem('qrmenu_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Duplicate GET isteğini YALNIZCA herkese açık menü endpoint'i için engelle
    // Örn: /menu/{restaurantSlug}/{qrCode}
    if (config.method === 'get') {
      const url = config.url ?? '';
      const isPublicMenuRequest = /^\/menu\/[^/]+\/[^/]+$/.test(url);

      if (isPublicMenuRequest) {
        const requestKey = `${config.method}:${url}`;
        const cached = requestCache.get(requestKey);

        if (cached && Date.now() - cached.timestamp < 2000) {
          // Aynı istek 2 sn içinde tekrarlandı → öncekini yeniden kullan
          return cached.promise.then(r => {
            // Axios config'e uyumlu cloned response döndür
            return Promise.resolve({ ...r });
          });
        }
      }
    }
    

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Başarılı response'da cache'i güncelle
    if (response.config.method === 'get') {
      const requestKey = `${response.config.method}:${response.config.url}`;
      requestCache.set(requestKey, {
        timestamp: Date.now(),
        promise: Promise.resolve(response)
      });
    }
    

    return response;
  },
  (error) => {
    // Handle 401 responses (token expired)
    if (error.response?.status === 401) {
      // Token expired or invalid, clear auth data
      localStorage.removeItem('qrmenu_token');
      localStorage.removeItem('qrmenu_auth');
      localStorage.removeItem('qrmenu_refresh_token');
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Hata mesajlarını daha kullanıcı dostu hale getir
    if (error.response?.data) {
      const errorData = error.response.data;
      
      // Backend'den gelen hata formatını kontrol et
      if (errorData.message || errorData.details) {
        const mainMessage = errorData.message || 'Bir hata oluştu';
        const details = errorData.details;
        
        // Eğer details varsa, ana mesaj + detayları birleştir
        const fullMessage = details ? `${mainMessage}\n\nDetaylar: ${details}` : mainMessage;
        
        // Error objesini güncelle
        error.message = fullMessage;
        error.userFriendlyMessage = fullMessage;
      }
    }

    // Eğer duplicate request engellendiyse ama cache'te promise varsa onu döndür
    if (error.message === 'Duplicate request prevented') {
      const cfg = error.config;
      const requestKey = `${cfg?.method}:${cfg?.url}`;
      const cached = requestCache.get(requestKey);
      if (cached) {
        return cached.promise;
      }
      return Promise.reject(error);
    }
    

    return Promise.reject(error);
  }
);

// Menu Services
export const menuService = {
  getMenuByQRCode: async (restaurantSlug: string, qrCode: string): Promise<Restaurant> => {
    const response = await api.get(`/menu/${restaurantSlug}/${qrCode}`);
    return response.data;
  },

  // Admin için ayrı endpoint (istatistiklere dahil edilmez)
  getRestaurantForAdmin: async (restaurantSlug: string): Promise<Restaurant> => {
    const response = await api.get(`/menu/admin/${restaurantSlug}`, {
      headers: {
        'X-Admin-Request': 'true'
      }
    });
    return response.data;
  },

  // Admin Services
  addCategory: async (restaurantSlug: string, categoryData: {
    name: string;
    description: string;
    displayOrder: number;
  }) => {
    const response = await api.post(`/menu/admin/${restaurantSlug}/categories`, categoryData);
    return response.data;
  },

  addMenuItem: async (restaurantSlug: string, menuItemData: {
    name: string;
    description: string;
    price: number;
    categoryId: number;
    imageUrl: string;
    displayOrder: number;
    isAvailable: boolean;
  }) => {
    const response = await api.post(`/menu/admin/${restaurantSlug}/menu-items`, menuItemData);
    return response.data;
  },

  updateCategory: async (restaurantSlug: string, categoryId: number, categoryData: {
    name: string;
    description: string;
    displayOrder: number;
  }) => {
    const response = await api.put(`/menu/admin/${restaurantSlug}/categories/${categoryId}`, categoryData);
    return response.data;
  },

  deleteCategory: async (restaurantSlug: string, categoryId: number) => {
    const response = await api.delete(`/menu/admin/${restaurantSlug}/categories/${categoryId}`);
    return response.data;
  },

  updateMenuItem: async (restaurantSlug: string, menuItemId: number, menuItemData: {
    name: string;
    description: string;
    price: number;
    categoryId: number;
    imageUrl: string;
    displayOrder: number;
    isAvailable: boolean;
  }) => {
    const response = await api.put(`/menu/admin/${restaurantSlug}/menu-items/${menuItemId}`, menuItemData);
    return response.data;
  },

  deleteMenuItem: async (restaurantSlug: string, menuItemId: number) => {
    const response = await api.delete(`/menu/admin/${restaurantSlug}/menu-items/${menuItemId}`);
    return response.data;
  },

  // Dosya yükleme servisleri
  uploadImage: async (file: File): Promise<{ imageUrl: string; fileName: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/file/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteImage: async (fileName: string) => {
    const response = await api.delete(`/file/delete-image/${fileName}`);
    return response.data;
  },

  // URL'den dosya adını çıkarma yardımcı fonksiyonu
  getFileNameFromUrl: (imageUrl: string): string | null => {
    if (!imageUrl || !imageUrl.startsWith('/images/')) return null;
    return imageUrl.split('/').pop() || null;
  },
};

// Statistics Services
export const statisticsService = {
  // Tüm masaları getir
  getTables: async (restaurantSlug: string): Promise<{ id: number; tableNumber: string; isActive: boolean }[]> => {
    try {
      const response = await api.get(`/menu/admin/${restaurantSlug}/tables`);
      return response.data;
    } catch (error) {
      console.warn('Masalar alınamadı:', error);
      return [];
    }
  },

  getQRCodeStats: async (restaurantSlug: string, startDate?: Date, endDate?: Date, tableId?: number): Promise<QRCodeAccessStats[]> => {
    try {
      // Eğer tarih belirtilmemişse son 30 günü al
      const end = endDate || new Date();
      const start = startDate || new Date();
      if (!startDate) {
        start.setDate(end.getDate() - 29);
      }
      
      const tableParam = tableId ? `&tableId=${tableId}` : '';
      const response = await api.get(`/statistics/${restaurantSlug}/daily-access?startDate=${start.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}${tableParam}`);
      
      // Backend'den gelen veriyi frontend formatına çevir
      return response.data.map((item: any) => ({
        date: item.Date || item.date,
        accessCount: item.TotalAccesses || item.totalAccesses || 0
      }));
    } catch (error) {
      console.warn('İstatistikler alınamadı:', error);
      return [];
    }
  },

  // Saatlik istatistikler için ayrı endpoint
  getHourlyStats: async (restaurantSlug: string, date: Date, tableId?: number): Promise<{ [key: number]: number }> => {
    try {
      const tableParam = tableId ? `&tableId=${tableId}` : '';
      const response = await api.get(`/statistics/${restaurantSlug}/qr-access?date=${date.toISOString().split('T')[0]}${tableParam}`);
      
      // Backend'den gelen saatlik veriyi döndür
      return response.data.HourlyAccessCounts || response.data.hourlyAccessCounts || {};
    } catch (error) {
      console.warn('Saatlik istatistikler alınamadı:', error);
      return {};
    }
  },

  // Masa ekle
  addTable: async (restaurantSlug: string, tableNumber: string): Promise<{ id: number; tableNumber: string; isActive: boolean; qrCode?: string }> => {
    const response = await api.post(`/menu/admin/${restaurantSlug}/tables`, { tableNumber });
    return response.data;
  },

  // Masa sil
  deleteTable: async (restaurantSlug: string, tableId: number): Promise<void> => {
    await api.delete(`/menu/admin/${restaurantSlug}/tables/${tableId}`);
  },
};

// Restaurant Services
export const restaurantService = {
  getAll: async (): Promise<Restaurant[]> => {
    const response = await api.get('/restaurants');
    return response.data;
  },

  getAllForAdmin: async (): Promise<Restaurant[]> => {
    const response = await api.get('/restaurants/admin/all');
    return response.data;
  },

  getBySlug: async (slug: string): Promise<Restaurant> => {
    const response = await api.get(`/restaurants/${slug}`);
    return response.data;
  },

  create: async (restaurantData: {
    name: string;
    slug: string;
    address: string;
    phone: string;
    email: string;
    adminUsername: string;
    adminEmail: string;
    adminPassword: string;
    adminConfirmPassword: string;
    isActive?: boolean;
  }): Promise<number> => {
    const response = await api.post('/restaurants', restaurantData);
    return response.data;
  },

  update: async (id: number, restaurantData: {
    name: string;
    slug: string;
    address: string;
    phone: string;
    email: string;
    isActive: boolean;
  }): Promise<Restaurant> => {
    const response = await api.put(`/restaurants/${id}`, restaurantData);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/restaurants/${id}`);
  },

  getRestaurantUsers: async (id: number): Promise<UserDto[]> => {
    const response = await api.get(`/restaurants/${id}/users`);
    return response.data;
  },
};

// Authentication Services
export const authService = {
  login: async (usernameOrEmail: string, password: string, rememberMe: boolean = false) => {
    const response = await api.post('/auth/login', {
      usernameOrEmail,
      password,
      rememberMe
    });
    return response.data;
  },

  logout: async (refreshToken: string) => {
    const response = await api.post('/auth/logout', { refreshToken });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    const response = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword
    });
    return response.data;
  },

  validateToken: async (token: string) => {
    const response = await api.post('/auth/validate-token', token);
    return response.data;
  },
};

// User Management Services (SuperAdmin only)
export const userService = {
  getUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  createUser: async (userData: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    restaurantId?: number;
    isAdmin: boolean;
    isSuperAdmin: boolean;
  }) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  getUser: async (id: number) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  updateUser: async (id: number, userData: {
    username: string;
    email: string;
    password?: string;
    confirmPassword?: string;
    restaurantId?: number;
    isAdmin: boolean;
    isSuperAdmin: boolean;
  }) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id: number) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

export default api; 