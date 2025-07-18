import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { statisticsService, menuService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { QRCodeAccessStats, Restaurant } from '../types';
import QRCode from 'qrcode';
import ImageUploader from './ImageUploader';

interface NewCategory {
  name: string;
  description: string;
  displayOrder: number;
}

interface NewMenuItem {
  name: string;
  description: string;
  price: number;
  categoryId: number;
  imageUrl: string;
  displayOrder: number;
  isAvailable: boolean;
}

interface QuarterStats {
  quarterNumber: number;
  startDate: string;
  endDate: string;
  totalAccess: number;
  days: DailyStats[];
}

interface DailyStats {
  date: string;
  dayName: string;
  accessCount: number;
}

interface HourlyStats {
  hour: number;
  accessCount: number;
}

interface MonthlyStats {
  year: number;
  month: number;
  monthName: string;
  totalAccess: number;
  quarters: QuarterStats[];
}

const AdminPage: React.FC = () => {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'stats' | 'categories' | 'qr-generator' | 'tables'>('stats');

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  
  // İstatistik filtreleme için yeni state'ler
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null); // null = Tümü
  const [tables, setTables] = useState<{ id: number; tableNumber: string; isActive: boolean }[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterStats | null>(null);
  const [selectedDay, setSelectedDay] = useState<DailyStats | null>(null);
  const [hourlyStats, setHourlyStats] = useState<HourlyStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
    const [hourlyLoading, setHourlyLoading] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState<string>('');
  
  // Modal states
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddMenuItemModal, setShowAddMenuItemModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [showEditMenuItemModal, setShowEditMenuItemModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{
    id: number;
    name: string;
    description: string;
    displayOrder: number;
  } | null>(null);
  const [editingMenuItem, setEditingMenuItem] = useState<{
    id: number;
    name: string;
    description: string;
    price: number;
    categoryId: number;
    imageUrl: string;
    displayOrder: number;
    isAvailable: boolean;
  } | null>(null);
  

  
  // Categories tab states
  const [selectedCategoryForView, setSelectedCategoryForView] = useState<number | null>(null);
  
  // QR Generator states
  const [selectedTableForQR, setSelectedTableForQR] = useState<number | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [qrGenerating, setQrGenerating] = useState(false);
  
  // Category details kartına scroll için ref
  const categoryDetailsRef = useRef<HTMLDivElement>(null);
  
  // Günlük detaylar kartına scroll için ref
  const dailyDetailsRef = useRef<HTMLDivElement>(null);
  // Saatlik detaylar kartına scroll için ref
  const hourlyDetailsRef = useRef<HTMLDivElement>(null);
  // Çeyrek kartına scroll için ref  
  const quarterCardRef = useRef<HTMLDivElement>(null);
  
  // Form states
  const [newCategory, setNewCategory] = useState<NewCategory>({
    name: '',
    description: '',
    displayOrder: 1
  });
  
  const [newMenuItem, setNewMenuItem] = useState<NewMenuItem>({
    name: '',
    description: '',
    price: 0,
    categoryId: 0,
    imageUrl: '',
    displayOrder: 1,
    isAvailable: true
  });

  // Modal açıldığında başlangıç resim URL'lerini takip et
  const [initialImageUrl, setInitialImageUrl] = useState<string>('');
  const [initialEditImageUrl, setInitialEditImageUrl] = useState<string>('');

  useEffect(() => {
    // Check restaurant access
    if (user && !user.isSuperAdmin && user.restaurantSlug !== restaurantSlug) {
      navigate('/login');
      return;
    }
    loadData();
  }, [user, restaurantSlug, navigate]);

  useEffect(() => {
    // Masaları sadece gerekli tab'larda yükle
    if (activeTab === 'stats' || activeTab === 'qr-generator' || activeTab === 'tables') {
      loadTables();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'stats') {
      loadMonthlyStats();
    }
  }, [selectedYear, selectedMonth, selectedTableId, activeTab]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!restaurantSlug) {
        throw new Error('Restaurant slug bulunamadı');
      }
      
      // Admin için özel endpoint kullan (istatistiklere dahil edilmez)
      const menuData = await menuService.getRestaurantForAdmin(restaurantSlug);
      setRestaurant(menuData);
      
      // İlk kategoriyi seç
      if (menuData.categories && menuData.categories.length > 0) {
        setNewMenuItem(prev => ({ ...prev, categoryId: menuData.categories[0].id }));
      }
      
    } catch (err: any) {
      console.error('Veri yüklenirken hata:', err);
      setError('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async () => {
    try {
      console.log('Masalar yükleniyor... Aktif tab:', activeTab);
      const tablesData = await statisticsService.getTables(restaurantSlug!);
      console.log('API\'den gelen masa verisi:', tablesData);
      
      const activeTables = tablesData
        .filter(table => table.isActive)
        .sort((a, b) => {
          const numA = parseInt(a.tableNumber, 10);
          const numB = parseInt(b.tableNumber, 10);
          if (isNaN(numA) || isNaN(numB)) return a.tableNumber.localeCompare(b.tableNumber);
          return numA - numB;
        });
      console.log('Aktif masalar (sıralı):', activeTables);
      setTables(activeTables);
    } catch (error) {
      console.error('Masalar yüklenemedi:', error);
      setTables([]);
    }
  };

  const loadMonthlyStats = async () => {
    try {
      setStatsLoading(true);
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      // endDate'i ayın son günü saat 23:59:59.999 olarak ayarla
      const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
      const dailyStats = await statisticsService.getQRCodeStats(restaurantSlug!, startDate, endDate, selectedTableId || undefined);
      const monthlyData = calculateMonthlyStats(startDate, endDate, dailyStats);
      setMonthlyStats(monthlyData);
      setSelectedQuarter(null);
    } catch (error) {
      setMonthlyStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const calculateMonthlyStats = (startDate: Date, endDate: Date, dailyStats: QRCodeAccessStats[]): MonthlyStats => {
    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    
    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    
    // Ayın tüm günlerini oluştur
    const allDays: DailyStats[] = [];
    let totalMonthAccess = 0;
    
    // Basit döngü ile ayın her günü için
    const year = selectedYear;
    const month = selectedMonth;
    const daysInMonth = new Date(year, month, 0).getDate(); // Ayın gün sayısı
    
    for (let day = 1; day <= daysInMonth; day++) {
      // Her gün için tarih objesi oluştur
      const currentDate = new Date(year, month - 1, day);
      
      // Tarih string'ini oluştur (YYYY-MM-DD formatında)
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const stat = dailyStats.find(s => s.date.split('T')[0] === dateStr);
      const accessCount = stat?.accessCount || 0;
      
      allDays.push({
        date: dateStr,
        dayName: dayNames[currentDate.getDay()],
        accessCount: accessCount
      });
      
      totalMonthAccess += accessCount;
    }
    
    // Çeyrekleri oluştur (ilk 3 çeyrek 7'şer gün, 4. çeyrek kalan tüm günler)
    const quarters: QuarterStats[] = [];
    
    for (let quarterNum = 1; quarterNum <= 4; quarterNum++) {
      const startIndex = (quarterNum - 1) * 7;
      
      if (startIndex >= allDays.length) {
        break; // Eğer başlangıç indeksi toplam gün sayısını aşarsa dur
      }
      
      let quarterDays: DailyStats[];
      
      if (quarterNum <= 3) {
        // İlk 3 çeyrek: tam 7 gün
        quarterDays = allDays.slice(startIndex, startIndex + 7);
      } else {
        // 4. çeyrek: kalan tüm günler
        quarterDays = allDays.slice(startIndex);
      }
      
      if (quarterDays.length > 0) {
        const quarterTotal = quarterDays.reduce((sum, d) => sum + d.accessCount, 0);
        
        quarters.push({
          quarterNumber: quarterNum,
          startDate: quarterDays[0].date,
          endDate: quarterDays[quarterDays.length - 1].date,
          totalAccess: quarterTotal,
          days: [...quarterDays]
        });
      }
    }
    
    return {
      year: selectedYear,
      month: selectedMonth,
      monthName: monthNames[selectedMonth - 1],
      totalAccess: totalMonthAccess,
      quarters: quarters
    };
  };

  const handleQuarterClick = (quarter: QuarterStats) => {
    const isAlreadySelected = selectedQuarter?.quarterNumber === quarter.quarterNumber;
    setSelectedQuarter(isAlreadySelected ? null : quarter);
    
    // Çeyrek değiştiğinde veya kapatıldığında günü ve saatlik verileri sıfırla
    setSelectedDay(null);
    setHourlyStats([]);
    
    // Eğer yeni bir çeyrek seçildiyse, çeyrek kartının altına scroll yap
    if (!isAlreadySelected) {
      setTimeout(() => {
        // Günlük detaylar kartının pozisyonuna scroll yap
        const adminMain = document.querySelector('.admin-main');
        if (adminMain && dailyDetailsRef.current) {
          // Kartın admin-main container içindeki pozisyonunu hesapla
          const adminMainRect = adminMain.getBoundingClientRect();
          const cardRect = dailyDetailsRef.current.getBoundingClientRect();
          
          // Kartın admin-main içindeki relative pozisyonu
          const cardTopInContainer = cardRect.top - adminMainRect.top + adminMain.scrollTop;
          
          // Kartın üst kısmına scroll yap (biraz margin bırak)
          const targetScroll = cardTopInContainer - 90;
          

          
          adminMain.scrollTo({ top: targetScroll, behavior: 'smooth' });
        } else {
          // Fallback: sabit miktar scroll
          const currentScroll = adminMain ? adminMain.scrollTop : window.scrollY;
          const targetScroll = currentScroll + 200;
          
          if (adminMain) {
            adminMain.scrollTo({ top: targetScroll, behavior: 'smooth' });
          } else {
            window.scrollTo({ top: targetScroll, behavior: 'smooth' });
          }
        }
        
        // Sonra smooth ile de dene
        // window.scrollTo({
        //   top: targetScroll,
        //   behavior: 'smooth'
        // });
      }, 100);
    }
  };

  const handleDayClick = async (day: DailyStats) => {
    const isAlreadySelected = selectedDay?.date === day.date;
    setSelectedDay(isAlreadySelected ? null : day);
    
        if (!isAlreadySelected && day.accessCount > 0) {
      // Saatlik verileri yükle
      await loadHourlyStats(day.date);
      
      // Günlük detay kartının altına scroll yap
      setTimeout(() => {
        // Saatlik detaylar kartının pozisyonuna scroll yap
        const adminMain = document.querySelector('.admin-main');
        if (adminMain && hourlyDetailsRef.current) {
          // Kartın admin-main container içindeki pozisyonunu hesapla
          const adminMainRect = adminMain.getBoundingClientRect();
          const cardRect = hourlyDetailsRef.current.getBoundingClientRect();
          
          // Kartın admin-main içindeki relative pozisyonu
          const cardTopInContainer = cardRect.top - adminMainRect.top + adminMain.scrollTop;
          
          // Kartın üst kısmına scroll yap (biraz margin bırak)
          const targetScroll = cardTopInContainer - 90;
          

          
          adminMain.scrollTo({ top: targetScroll, behavior: 'smooth' });
        } else {
          // Fallback: sabit miktar scroll
          const currentScroll = adminMain ? adminMain.scrollTop : window.scrollY;
          const targetScroll = currentScroll + 250;
          
          if (adminMain) {
            adminMain.scrollTo({ top: targetScroll, behavior: 'smooth' });
          } else {
            window.scrollTo({ top: targetScroll, behavior: 'smooth' });
          }
        }
        
        // Sonra smooth ile de dene
        // window.scrollTo({
        //   top: targetScroll,
        //   behavior: 'smooth'
        // });
      }, 100);
    } else {
      setHourlyStats([]);
    }
  };

  const loadHourlyStats = async (date: string) => {
    try {
      setHourlyLoading(true);
      
      // Seçilen günün Date objesi
      const targetDate = new Date(date);
      
      // API'den o günün saatlik verilerini al (masa filtresi ile)
      const hourlyData = await statisticsService.getHourlyStats(restaurantSlug!, targetDate, selectedTableId || undefined);
      
      // Saatlik istatistikleri formatla
      const formattedHourlyData = formatHourlyStats(hourlyData);
      setHourlyStats(formattedHourlyData);
      
    } catch (error) {
      console.warn('Saatlik istatistikler yüklenemedi:', error);
      setHourlyStats([]);
    } finally {
      setHourlyLoading(false);
    }
  };

  const formatHourlyStats = (hourlyData: { [key: number]: number }): HourlyStats[] => {
    const hours: HourlyStats[] = [];
    
    // 24 saat için array oluştur
    for (let hour = 0; hour < 24; hour++) {
      hours.push({
        hour,
        accessCount: hourlyData[hour] || 0
      });
    }
    
    return hours;
  };

  const formatDate = (dateString: string) => {
    // Timezone sorunlarını önlemek için local tarih kullan
    const dateParts = dateString.split('-');
    const localDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    return localDate.toLocaleDateString('tr-TR');
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    // Timezone sorunlarını önlemek için local tarih kullan
    const startParts = startDate.split('-');
    const endParts = endDate.split('-');
    const start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
    const end = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));
    
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}-${end.getDate()} ${start.toLocaleDateString('tr-TR', { month: 'long' })}`;
    } else {
      return `${start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}`;
    }
  };

  const getCurrentYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years;
  };

  const getMonthOptions = () => {
    const months = [
      { value: 1, name: 'Ocak' },
      { value: 2, name: 'Şubat' },
      { value: 3, name: 'Mart' },
      { value: 4, name: 'Nisan' },
      { value: 5, name: 'Mayıs' },
      { value: 6, name: 'Haziran' },
      { value: 7, name: 'Temmuz' },
      { value: 8, name: 'Ağustos' },
      { value: 9, name: 'Eylül' },
      { value: 10, name: 'Ekim' },
      { value: 11, name: 'Kasım' },
      { value: 12, name: 'Aralık' }
    ];
    return months;
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // API çağrısı
      await menuService.addCategory(restaurantSlug!, {
        name: newCategory.name,
        description: newCategory.description,
        displayOrder: newCategory.displayOrder
      });
      
      // Form temizle
      setNewCategory({ name: '', description: '', displayOrder: 1 });
      
      // Modal'ı kapat
      setShowAddCategoryModal(false);
      
      // Veriyi yeniden yükle
      await loadData();
      
      alert('Kategori başarıyla eklendi!');
    } catch (err) {
      console.error('Kategori eklenirken hata:', err);
      alert('Kategori eklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // API çağrısı
      await menuService.addMenuItem(restaurantSlug!, {
        name: newMenuItem.name,
        description: newMenuItem.description,
        price: newMenuItem.price,
        categoryId: newMenuItem.categoryId,
        imageUrl: newMenuItem.imageUrl,
        displayOrder: newMenuItem.displayOrder,
        isAvailable: newMenuItem.isAvailable
      });
      
      // Form temizle
      setNewMenuItem({
        name: '',
        description: '',
        price: 0,
        categoryId: restaurant?.categories[0]?.id || 0,
        imageUrl: '',
        displayOrder: 1,
        isAvailable: true
      });
      
      // Modal'ı kapat
      setShowAddMenuItemModal(false);
      
      // Veriyi yeniden yükle
      await loadData();
      
      alert('Menü öğesi başarıyla eklendi!');
    } catch (err) {
      console.error('Menü öğesi eklenirken hata:', err);
      alert('Menü öğesi eklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    
    try {
      setLoading(true);
      
      // API çağrısı
      await menuService.updateCategory(restaurantSlug!, editingCategory.id, {
        name: editingCategory.name,
        description: editingCategory.description,
        displayOrder: editingCategory.displayOrder
      });
      
      // Modal'ı kapat
      setShowEditCategoryModal(false);
      setEditingCategory(null);
      
      // Veriyi yeniden yükle
      await loadData();
      
      alert('Kategori başarıyla güncellendi!');
    } catch (err) {
      console.error('Kategori düzenlenirken hata:', err);
      alert('Kategori düzenlenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleEditMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMenuItem) return;
    
    try {
      setLoading(true);
      
      // Eğer resim silinmişse (boş string) ve başlangıçta resim varsa, eski resmi sil
      if (!editingMenuItem.imageUrl && initialEditImageUrl && initialEditImageUrl.startsWith('/images/')) {
        try {
          const oldFileName = menuService.getFileNameFromUrl(initialEditImageUrl);
          if (oldFileName) {
            await menuService.deleteImage(oldFileName);
            console.log('Eski resim silindi:', oldFileName);
          }
        } catch (deleteError) {
          console.warn('Eski resim silinirken hata:', deleteError);
        }
      }
      
      // API çağrısı
      await menuService.updateMenuItem(restaurantSlug!, editingMenuItem.id, {
        name: editingMenuItem.name,
        description: editingMenuItem.description,
        price: editingMenuItem.price,
        categoryId: editingMenuItem.categoryId,
        imageUrl: editingMenuItem.imageUrl,
        displayOrder: editingMenuItem.displayOrder,
        isAvailable: editingMenuItem.isAvailable
      });
      
      // Modal'ı kapat
      setShowEditMenuItemModal(false);
      setEditingMenuItem(null);
      setInitialEditImageUrl('');
      
      // Veriyi yeniden yükle
      await loadData();
      
      alert('Menü öğesi başarıyla güncellendi!');
    } catch (err) {
      console.error('Menü öğesi düzenlenirken hata:', err);
      alert('Menü öğesi düzenlenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number, categoryName: string) => {
    // Kategorideki menü öğesi sayısını kontrol et
    const allMenuItems = restaurant?.categories?.flatMap(cat => cat.menuItems) || [];
    const menuItemsInCategory = allMenuItems.filter((item: any) => item.categoryId === categoryId);
    const menuItemCount = menuItemsInCategory.length;
    
    let confirmMessage = `"${categoryName}" kategorisini silmek istediğinizden emin misiniz?`;
    if (menuItemCount > 0) {
      confirmMessage = `"${categoryName}" kategorisini silmek istediğinizden emin misiniz?\n\nBu kategoride ${menuItemCount} adet menü öğesi bulunmaktadır. İlgili tüm menü öğeleri de silinecektir.`;
    }
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      setLoading(true);
      
      // API çağrısı
      await menuService.deleteCategory(restaurantSlug!, categoryId);
      
      // Veriyi yeniden yükle
      await loadData();
      
      alert('Kategori başarıyla silindi!');
    } catch (err: any) {
      console.error('Kategori silinirken hata:', err);
      const errorMessage = err?.response?.data?.message || err?.response?.data || 'Kategori silinirken bir hata oluştu';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMenuItem = async (itemId: number, itemName: string) => {
    if (!window.confirm(`"${itemName}" menü öğesini silmek istediğinizden emin misiniz?`)) return;
    
    try {
      setLoading(true);
      
      // API çağrısı
      await menuService.deleteMenuItem(restaurantSlug!, itemId);
      
      // Veriyi yeniden yükle
      await loadData();
      
      alert('Menü öğesi başarıyla silindi!');
    } catch (err) {
      console.error('Menü öğesi silinirken hata:', err);
      alert('Menü öğesi silinirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const openEditCategoryModal = (category: {
    id: number;
    name: string;
    description: string;
    displayOrder: number;
  }) => {
    setEditingCategory({
      id: category.id,
      name: category.name,
      description: category.description,
      displayOrder: category.displayOrder
    });
    setShowEditCategoryModal(true);
  };

  const openEditMenuItemModal = (item: {
    id: number;
    name: string;
    description: string;
    price: number;
    categoryId: number;
    imageUrl: string;
    displayOrder: number;
    isAvailable: boolean;
  }) => {
    setInitialEditImageUrl(item.imageUrl || ''); // Başlangıç resim URL'ini kaydet
    setEditingMenuItem({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      categoryId: item.categoryId,
      imageUrl: item.imageUrl,
      displayOrder: item.displayOrder,
      isAvailable: item.isAvailable
    });
    setShowEditMenuItemModal(true);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(price);
  };

  const getSeasonEmoji = (month: number) => {
    // Türkiye mevsimlerine göre
    if (month >= 3 && month <= 5) return '🌸'; // İlkbahar (Mart-Mayıs)
    if (month >= 6 && month <= 8) return '☀️'; // Yaz (Haziran-Ağustos)
    if (month >= 9 && month <= 11) return '🍂'; // Sonbahar (Eylül-Kasım)
    return '❄️'; // Kış (Aralık-Şubat)
  };

  // Modal kapatma işlemlerinde gereksiz resim temizleme
  const cleanupUnusedImage = async (currentImageUrl: string, initialImageUrl: string) => {
    // Eğer yeni resim yüklenmişse ama başlangıçtaki ile farklıysa
    if (currentImageUrl && 
        currentImageUrl !== initialImageUrl && 
        currentImageUrl.startsWith('/images/')) {
      try {
        const fileName = menuService.getFileNameFromUrl(currentImageUrl);
        if (fileName) {
          await menuService.deleteImage(fileName);
          console.log('Modal kapatılırken gereksiz resim silindi:', fileName);
        }
      } catch (error) {
        console.warn('Modal kapatılırken resim silinirken hata:', error);
      }
    }
  };

  // Menü öğesi ekleme modalını aç
  const openAddMenuItemModal = () => {
    setInitialImageUrl(''); // Yeni ekleme için başlangıç boş
    setShowAddMenuItemModal(true);
  };

  // Menü öğesi ekleme modalını kapat
  const closeAddMenuItemModal = async () => {
    await cleanupUnusedImage(newMenuItem.imageUrl, initialImageUrl);
    setShowAddMenuItemModal(false);
    // Form'u sıfırla
    setNewMenuItem({
      name: '',
      description: '',
      price: 0,
      categoryId: restaurant?.categories?.[0]?.id || 0,
      imageUrl: '',
      displayOrder: 1,
      isAvailable: true
    });
    setInitialImageUrl('');
  };

  // Menü öğesi düzenleme modalını kapat
  const closeEditMenuItemModal = async () => {
    if (editingMenuItem) {
      await cleanupUnusedImage(editingMenuItem.imageUrl, initialEditImageUrl);
      
      // Eğer staging modunda resim silinmişse, eski resmi geri yükle
      if (!editingMenuItem.imageUrl && initialEditImageUrl) {
        setEditingMenuItem(prev => prev ? { ...prev, imageUrl: initialEditImageUrl } : null);
      }
    }
    setShowEditMenuItemModal(false);
    setEditingMenuItem(null);
    setInitialEditImageUrl('');
  };

  const generateQRCode = async (tableId: number) => {
    try {
      setQrGenerating(true);
      
      // Seçilen masanın bilgilerini al
      const selectedTable = tables.find(t => t.id === tableId);
      if (!selectedTable) {
        alert('Masa bulunamadı');
        return;
      }

      // QR kod URL'ini oluştur => http://domain.com/{restaurantSlug}/TABLE001 formatı
      const baseUrl = window.location.origin; // http://localhost:3000 veya production domain
      const qrCode = `TABLE${selectedTable.tableNumber.padStart(3, '0')}`;
      const qrUrl = `${baseUrl}/${restaurantSlug}/${qrCode}`;
      
      // Gerçek QR kod oluştur
      const qrCodeOptions = {
        width: 300,
        height: 300,
        color: {
          dark: '#000000',  // QR kod rengi
          light: '#FFFFFF'  // Arka plan rengi
        },
        margin: 2,
        errorCorrectionLevel: 'M' as const
      };
      
      // QR kod oluştur ve data URL al
      const dataUrl = await QRCode.toDataURL(qrUrl, qrCodeOptions);
      
      // Canvas oluşturup QR kodu üzerine masa bilgisi ekle
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Canvas boyutları (QR kod + alt kısımda yazı için yer)
        canvas.width = 300;
        canvas.height = 350;
        
        // Beyaz arka plan
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 300, 350);
        
        // QR kodu çiz
        const qrImage = new Image();
        qrImage.onload = () => {
          ctx.drawImage(qrImage, 0, 0, 300, 300);
          
          // Masa bilgisi yazısı
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 18px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`Masa ${selectedTable.tableNumber}`, 150, 330);
          
          // QR kod ID'si
          ctx.font = '12px Arial';
          ctx.fillText(`QR: TABLE${selectedTable.tableNumber.padStart(3, '0')}`, 150, 345);
          
          // Final data URL'i al
          const finalDataUrl = canvas.toDataURL('image/png');
          setQrCodeDataUrl(finalDataUrl);
        };
        qrImage.src = dataUrl;
      } else {
        // Canvas desteklenmiyorsa sadece QR kodu kullan
        setQrCodeDataUrl(dataUrl);
      }
      
      console.log('Gerçek QR kod oluşturuldu:', qrUrl);
      
    } catch (error) {
      console.error('QR kod oluşturulurken hata:', error);
      alert('QR kod oluşturulurken bir hata oluştu');
    } finally {
      setQrGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl || !selectedTableForQR) return;
    
    const selectedTable = tables.find(t => t.id === selectedTableForQR);
    if (!selectedTable) return;
    
    // Download link oluştur
    const link = document.createElement('a');
    link.download = `QR_Masa_${selectedTable.tableNumber}.png`;
    link.href = qrCodeDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  const getPageTitle = () => {
    switch (activeTab) {
      case 'stats':
        return { icon: '📊', title: 'İstatistikler' };
      case 'categories':
        return { icon: '🍽️', title: 'Menüyü Düzenle' };
      case 'qr-generator':
        return { icon: '📱', title: 'QR Kod Oluştur' };
      case 'tables':
        return { icon: '🪑', title: 'Masa Ekle / Sil' };
      default:
        return { icon: '📊', title: 'Dashboard' };
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            Admin Paneli
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <button
            onClick={() => {
              setActiveTab('stats');
              setSidebarOpen(false);
            }}
            className={`sidebar-nav-item ${activeTab === 'stats' ? 'active' : ''}`}
          >
            <span className="sidebar-nav-icon">📊</span>
            İstatistikler
          </button>
          
          <button
            onClick={() => {
              setActiveTab('categories');
              setSidebarOpen(false);
            }}
            className={`sidebar-nav-item ${activeTab === 'categories' ? 'active' : ''}`}
          >
            <span className="sidebar-nav-icon">🍽️</span>
            Menüyü Düzenle
          </button>
          
          <button
            onClick={() => {
              setActiveTab('tables');
              setSidebarOpen(false);
            }}
            className={`sidebar-nav-item ${activeTab === 'tables' ? 'active' : ''}`}
          >
            <span className="sidebar-nav-icon">🪑</span>
            Masa Ekle / Sil
          </button>
          
          <button
            onClick={() => {
              setActiveTab('qr-generator');
              setSidebarOpen(false);
            }}
            className={`sidebar-nav-item ${activeTab === 'qr-generator' ? 'active' : ''}`}
          >
            <span className="sidebar-nav-icon">📱</span>
            QR Kod Oluştur
          </button>
          
          <div style={{ height: '1px', background: '#e9ecef', margin: '20px 0' }} />
          
          <a
            href="/menu"
            className="sidebar-nav-item"
            style={{ textDecoration: 'none' }}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="sidebar-nav-icon">👁️</span>
            Menüyü Görüntüle
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div className="admin-header-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  className="sidebar-toggle"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  title="Menüyü Aç/Kapat"
                  style={{ 
                    display: isMobile ? 'flex' : 'none',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ☰
                </button>
                <h1 className="admin-page-title">
                  <span>{getPageTitle().icon}</span>
                  {getPageTitle().title}
                </h1>
                
                {/* User Info */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  marginLeft: '20px',
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                  borderRadius: '12px',
                  border: '1px solid #e9ecef',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'flex-start'
                  }}>
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      color: '#2c3e50' 
                    }}>
                      {user?.username}
                    </span>
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#6c757d' 
                    }}>
                      {user?.isSuperAdmin ? 'SuperAdmin' : user?.restaurantName || 'Admin'}
                    </span>
                  </div>
                  
                  <button
                    onClick={logout}
                    style={{
                      padding: '6px 12px',
                      background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    🚪 Çıkış
                  </button>
                </div>
              </div>
              
              {/* Header Right Content */}
              <div>
                {activeTab === 'stats' && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '20px',
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    border: '1px solid #e9ecef',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '16px',
                      color: '#ff6b35',
                      fontWeight: '600',
                      fontSize: '16px'
                    }}>
                      🏷️ Filtrele
                    </div>
                    
                    <div style={{ 
                      width: '1px', 
                      height: '24px', 
                      background: 'linear-gradient(180deg, transparent 0%, #e9ecef 50%, transparent 100%)' 
                    }} />
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <label style={{ 
                        fontWeight: '600', 
                        fontSize: '15px', 
                        color: '#2c3e50',
                        minWidth: '35px'
                      }}>
                        Masa:
                      </label>
                      <select
                        value={selectedTableId || ''}
                        onChange={(e) => setSelectedTableId(e.target.value ? parseInt(e.target.value) : null)}
                        style={{
                          padding: '8px 12px',
                          border: '2px solid #e9ecef',
                          borderRadius: '8px',
                          fontSize: '15px',
                          minWidth: '120px',
                          background: 'white',
                          color: '#2c3e50',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#ff6b35';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(255, 107, 53, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e9ecef';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                        }}
                      >
                        <option value="">Tümü</option>
                        {tables.map(table => (
                          <option key={table.id} value={table.id}>{table.tableNumber}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div style={{ 
                      width: '1px', 
                      height: '24px', 
                      background: 'linear-gradient(180deg, transparent 0%, #e9ecef 50%, transparent 100%)' 
                    }} />
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <label style={{ 
                        fontWeight: '600', 
                        fontSize: '15px', 
                        color: '#2c3e50',
                        minWidth: '30px'
                      }}>
                        Yıl:
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        style={{
                          padding: '8px 12px',
                          border: '2px solid #e9ecef',
                          borderRadius: '8px',
                          fontSize: '15px',
                          minWidth: '85px',
                          background: 'white',
                          color: '#2c3e50',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#ff6b35';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(255, 107, 53, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e9ecef';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                        }}
                      >
                        {getCurrentYearOptions().map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div style={{ 
                      width: '1px', 
                      height: '24px', 
                      background: 'linear-gradient(180deg, transparent 0%, #e9ecef 50%, transparent 100%)' 
                    }} />
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <label style={{ 
                        fontWeight: '600', 
                        fontSize: '15px', 
                        color: '#2c3e50',
                        minWidth: '25px'
                      }}>
                        Ay:
                      </label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        style={{
                          padding: '8px 12px',
                          border: '2px solid #e9ecef',
                          borderRadius: '8px',
                          fontSize: '15px',
                          minWidth: '130px',
                          background: 'white',
                          color: '#2c3e50',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#ff6b35';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(255, 107, 53, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e9ecef';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                        }}
                      >
                        {getMonthOptions().map(month => (
                          <option key={month.value} value={month.value}>{month.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                
                {activeTab === 'categories' && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    color: '#6c757d',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}>
                    <span>📁</span>
                    <span>{restaurant?.categories?.length || 0} Kategori</span>
                  </div>
                )}
                

              </div>
            </div>
          </div>
        </header>



        {/* Content Area */}
        <div className="admin-content">

        {error && (
          <div className="card" style={{ background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' }}>
            <p style={{ margin: 0 }}>❌ {error}</p>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <>
            {/* Mobil Filtreleme Card */}
            {isMobile && (
              <div className="card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '20px' }}>🏷️</span>
                  <h3 style={{ margin: 0, color: '#ff6b35', fontSize: '18px' }}>Filtreleme Seçenekleri</h3>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '14px', 
                      color: '#6c757d', 
                      marginBottom: '8px',
                      fontWeight: '600'
                    }}>
                      Masa
                    </label>
                    <select
                      value={selectedTableId || ''}
                      onChange={(e) => setSelectedTableId(e.target.value ? parseInt(e.target.value) : null)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e9ecef',
                        borderRadius: '8px',
                        fontSize: '16px',
                        background: 'white',
                        color: '#2c3e50',
                        fontWeight: '500'
                      }}
                    >
                      <option value="">Tümü</option>
                      {tables.map(table => (
                        <option key={table.id} value={table.id}>{table.tableNumber}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '14px', 
                        color: '#6c757d', 
                        marginBottom: '8px',
                        fontWeight: '600'
                      }}>
                        Yıl
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '2px solid #e9ecef',
                          borderRadius: '8px',
                          fontSize: '16px',
                          background: 'white',
                          color: '#2c3e50',
                          fontWeight: '500'
                        }}
                      >
                        {getCurrentYearOptions().map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '14px', 
                        color: '#6c757d', 
                        marginBottom: '8px',
                        fontWeight: '600'
                      }}>
                        Ay
                      </label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '2px solid #e9ecef',
                          borderRadius: '8px',
                          fontSize: '16px',
                          background: 'white',
                          color: '#2c3e50',
                          fontWeight: '500'
                        }}
                      >
                        {getMonthOptions().map(month => (
                          <option key={month.value} value={month.value}>{month.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aylık İstatistikler */}
            {statsLoading ? (
              <div className="card">
                <div className="loading">
                  <div className="spinner"></div>
                  <p>İstatistikler yükleniyor...</p>
                </div>
              </div>
            ) : !monthlyStats ? (
              <div className="card">
                <div style={{ textAlign: 'center', color: '#6c757d', padding: '60px 20px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
                  <p>Seçilen ay için istatistik verisi bulunmuyor.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Çeyreklik Görünüm */}
                <div className="card" ref={quarterCardRef} style={{ backgroundColor: '#e9ecef' }}>
                  <div style={{ marginBottom: '16px' }}>
                    {/* Masaüstü başlık */}
                    {!isMobile ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: '#212529', fontSize: '20px' }}>
                          {getSeasonEmoji(monthlyStats.month)} {monthlyStats.monthName} {monthlyStats.year}
                        </h3>
                        <div style={{ color: '#212529', fontSize: '18px' }}>
                          Toplam Erişim: <span style={{ color: '#ff6b35', fontWeight: 'bold' }}>{monthlyStats.totalAccess}</span>
                        </div>
                      </div>
                    ) : (
                      /* Mobil başlık */
                      <div style={{ color: '#212529', fontSize: '16px' }}>
                        Toplam Erişim: <span style={{ color: '#ff6b35', fontWeight: 'bold' }}>{monthlyStats.totalAccess}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="menu-grid">
                    {monthlyStats.quarters.map((quarter) => (
                      <div 
                        key={quarter.quarterNumber} 
                        className={`menu-item ${selectedQuarter?.quarterNumber === quarter.quarterNumber ? 'selected' : ''}`}
                        onClick={() => handleQuarterClick(quarter)}
                        style={{ 
                          cursor: 'pointer',
                          border: selectedQuarter?.quarterNumber === quarter.quarterNumber ? '2px solid #ff6b35' : '2px solid #e9ecef',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div className="menu-item-content" style={{ backgroundColor: '#f8f9fa' }}>
                          <div className="menu-item-header">
                            <h3 className="menu-item-name" style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              📅 {quarter.quarterNumber}. Çeyrek
                            </h3>
                            <span className="menu-item-price">
                              {quarter.totalAccess} erişim
                            </span>
                          </div>
                          <p className="menu-item-description">
                            {formatDateRange(quarter.startDate, quarter.endDate)} ({quarter.days.length} gün)
                          </p>
                          <p style={{ color: '#6c757d', fontSize: '12px', margin: '8px 0 0 0' }}>
                            Detay için tıklayın
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Günlük Detay Görünüm */}
                {selectedQuarter && (
                  <div className="card" ref={dailyDetailsRef} style={{ backgroundColor: '#e9ecef' }}>
                    <h3 style={{ marginTop: '20px', marginBottom: '16px', color: '#212529', fontSize: '22px' }}>
                      {selectedQuarter.quarterNumber}. Çeyrek Günlük Detayları 
                      <span style={{ fontSize: '14px', fontWeight: 'normal', marginLeft: '8px' }}>
                        ({formatDateRange(selectedQuarter.startDate, selectedQuarter.endDate)} - {selectedQuarter.days.length} gün)
                      </span>
                    </h3>
                    
                    <div className="menu-grid">
                      {selectedQuarter.days.map((day, index) => (
                        <div 
                          key={index} 
                          className={`menu-item ${selectedDay?.date === day.date ? 'selected' : ''} ${day.accessCount > 0 ? 'clickable' : ''}`}
                          onClick={() => day.accessCount > 0 && handleDayClick(day)}
                          style={{ 
                            cursor: day.accessCount > 0 ? 'pointer' : 'default',
                            border: selectedDay?.date === day.date ? '2px solid #ff6b35' : '2px solid #e9ecef',
                            opacity: day.accessCount === 0 ? 0.6 : 1
                          }}
                        >
                          <div className="menu-item-content">
                            <div className="menu-item-header">
                              <h3 className="menu-item-name" style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {day.dayName}
                              </h3>
                              <span className="menu-item-price">
                                {day.accessCount} erişim
                              </span>
                            </div>
                            <p className="menu-item-description">
                              {formatDate(day.date)}
                            </p>
                            {day.accessCount > 0 && (
                              <p style={{ color: '#6c757d', fontSize: '12px', margin: '8px 0 0 0' }}>
                                Saatlik detay için tıklayın
                              </p>
                            )}
                            <div style={{ 
                              marginTop: '8px',
                              height: '4px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '2px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                height: '100%',
                                backgroundColor: day.accessCount > 0 ? '#ff6b35' : '#e9ecef',
                                width: `${Math.max(5, (day.accessCount / Math.max(...selectedQuarter.days.map(d => d.accessCount), 1)) * 100)}%`,
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div style={{ 
                      marginTop: '16px', 
                      padding: '16px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '8px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '16px'
                    }}>
                      <div>
                        <strong>{selectedQuarter.quarterNumber}. Çeyrek Toplamı:</strong> {selectedQuarter.totalAccess} erişim
                      </div>
                      <div>
                        <strong>Günlük Ortalama:</strong> {Math.round(selectedQuarter.totalAccess / selectedQuarter.days.length)} erişim
                      </div>
                      <div>
                        <strong>En Yoğun Gün:</strong> {
                          selectedQuarter.days.reduce((max, day) => 
                            day.accessCount > max.accessCount ? day : max
                          ).dayName
                        }
                      </div>
                    </div>
                  </div>
                )}

                {/* Saatlik Detay Görünüm */}
                {selectedQuarter && selectedDay && (
                  <div className="card" ref={hourlyDetailsRef} style={{ backgroundColor: '#ffffff' }}>
                    <h3 style={{ marginTop: '20px', marginBottom: '16px', color: '#212529', fontSize: '22px' }}>
                      ⏰ {selectedDay.dayName} - Saatlik Erişim Grafiği
                      <span style={{ fontSize: '14px', fontWeight: 'normal', marginLeft: '8px' }}>
                        ({formatDate(selectedDay.date)} - {selectedDay.accessCount} toplam erişim)
                      </span>
                    </h3>
                    
                    {hourlyLoading ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
                        <p>Saatlik veriler yükleniyor...</p>
                      </div>
                    ) : hourlyStats.length > 0 ? (
                      <>
                        {/* Saatlik Bar Chart */}
                        <div style={{ 
                          marginBottom: '24px',
                          padding: '20px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '12px'
                        }}>

                          
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'end', 
                            gap: isMobile ? '2px' : '4px',
                            height: '200px',
                            padding: isMobile ? '8px' : '10px',
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            border: '1px solid #e9ecef',
                            overflowX: isMobile ? 'auto' : 'visible',
                            minWidth: isMobile ? '100%' : 'auto'
                          }}>
                            {hourlyStats.map((hourStat) => {
                              const maxAccess = Math.max(...hourlyStats.map(h => h.accessCount), 1);
                              const height = (hourStat.accessCount / maxAccess) * 160; // Max 160px
                              
                              return (
                                <div
                                  key={hourStat.hour}
                                  style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '4px',
                                    minWidth: isMobile ? '12px' : 'auto'
                                  }}
                                >
                                  {/* Bar */}
                                  <div
                                    style={{
                                      width: '100%',
                                      height: `${Math.max(height, 2)}px`,
                                      backgroundColor: hourStat.accessCount > 0 ? '#ff6b35' : '#e9ecef',
                                      borderRadius: '2px 2px 0 0',
                                      transition: 'all 0.3s ease',
                                      position: 'relative'
                                    }}
                                    title={`${hourStat.hour}:00 - ${hourStat.accessCount} erişim`}
                                  >
                                    {hourStat.accessCount > 0 && (
                                      <div style={{
                                        position: 'absolute',
                                        top: '-20px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        fontSize: isMobile ? '8px' : '10px',
                                        color: '#ff6b35',
                                        fontWeight: 'bold'
                                      }}>
                                        {hourStat.accessCount}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Hour Label */}
                                  <div style={{
                                    fontSize: isMobile ? '8px' : '10px',
                                    color: '#6c757d',
                                    transform: 'rotate(-45deg)',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {hourStat.hour}:00
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Saatlik Grid Görünüm */}
                        <div className="menu-grid">
                          {hourlyStats
                            .filter(hour => hour.accessCount > 0)
                            .sort((a, b) => b.accessCount - a.accessCount)
                            .map((hourStat) => (
                              <div key={hourStat.hour} className="menu-item">
                                <div className="menu-item-content">
                                  <div className="menu-item-header">
                                    <h3 className="menu-item-name" style={{
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}>
                                      {hourStat.hour.toString().padStart(2, '0')}:00 - {(hourStat.hour + 1).toString().padStart(2, '0')}:00
                                    </h3>
                                    <span className="menu-item-price">
                                      {hourStat.accessCount} erişim
                                    </span>
                                  </div>
                                  <p className="menu-item-description">
                                    {hourStat.hour < 6 ? '🌙 Gece' :
                                     hourStat.hour < 12 ? '🌅 Sabah' :
                                     hourStat.hour < 18 ? '☀️ Öğleden Sonra' : '🌆 Akşam'}
                                  </p>
                                  <div style={{ 
                                    marginTop: '8px',
                                    height: '4px',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '2px',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      height: '100%',
                                      backgroundColor: '#ff6b35',
                                      width: `${(hourStat.accessCount / Math.max(...hourlyStats.map(h => h.accessCount), 1)) * 100}%`,
                                      transition: 'width 0.3s ease'
                                    }} />
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>

                        {hourlyStats.filter(h => h.accessCount > 0).length === 0 && (
                          <div style={{ textAlign: 'center', color: '#6c757d', padding: '40px' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '16px' }}>📊</div>
                            <p>Bu gün için saatlik erişim verisi bulunmuyor.</p>
                          </div>
                        )}

                        {/* Özet Bilgiler */}
                        {hourlyStats.filter(h => h.accessCount > 0).length > 0 && (
                          <div style={{ 
                            marginTop: '16px', 
                            padding: '16px', 
                            backgroundColor: '#f8f9fa', 
                            borderRadius: '8px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '16px'
                          }}>
                            <div>
                              <strong>En Yoğun Saat:</strong> {
                                hourlyStats.reduce((max, hour) => 
                                  hour.accessCount > max.accessCount ? hour : max
                                ).hour
                              }:00
                            </div>
                            <div>
                              <strong>Aktif Saat Sayısı:</strong> {hourlyStats.filter(h => h.accessCount > 0).length} saat
                            </div>
                            <div>
                              <strong>Saatlik Ortalama:</strong> {Math.round(selectedDay.accessCount / hourlyStats.filter(h => h.accessCount > 0).length)} erişim
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', color: '#6c757d', padding: '40px' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '16px' }}>📊</div>
                        <p>Bu gün için saatlik veri yüklenemedi.</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* QR Generator Tab */}
        {activeTab === 'qr-generator' && (
          <>
            <div className="card">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <h2 style={{ margin: 0 }}>📱 QR Kod Oluşturucu</h2>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '32px' }}>
                {/* Sol Panel - Masa Seçimi */}
                <div>
                  <h3 style={{ marginBottom: '16px', color: '#212529' }}>🏷️ Masa Seçimi</h3>
                  
                  <div style={{ marginBottom: '20px' }}>
                                         <select
                       value={selectedTableForQR || ''}
                       onChange={(e) => {
                         const tableId = e.target.value ? parseInt(e.target.value) : null;
                         setSelectedTableForQR(tableId);
                         setQrCodeDataUrl(null); // Masa değiştiğinde QR'ı temizle
                       }}
                       style={{
                         width: '100%',
                         padding: '12px 16px',
                         border: '2px solid #e9ecef',
                         borderRadius: '8px',
                         fontSize: '16px',
                         background: 'white',
                         color: '#2c3e50',
                         fontWeight: '500'
                       }}
                     >
                       <option value="">
                         {tables.length === 0 ? 'Masalar yükleniyor...' : 'Masa seçin...'}
                       </option>
                       {tables.map(table => (
                         <option key={table.id} value={table.id}>
                           Masa {table.tableNumber}
                         </option>
                       ))}
                     </select>
                  </div>

                  {selectedTableForQR && (
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '8px',
                      marginBottom: '20px'
                    }}>
                      <h4 style={{ margin: '0 0 8px 0', color: '#212529' }}>📋 Seçilen Masa Bilgileri</h4>
                                             {(() => {
                         const selectedTable = tables.find(t => t.id === selectedTableForQR);
                         const baseUrl = window.location.origin;
                         const qrCode = `TABLE${selectedTable?.tableNumber.padStart(3, '0')}`;
                         const qrUrl = `${baseUrl}/${restaurantSlug}/${qrCode}`;
                         
                         return (
                           <>
                             <p style={{ margin: '4px 0', color: '#6c757d' }}>
                               <strong>Masa Numarası:</strong> {selectedTable?.tableNumber}
                             </p>
                             <p style={{ margin: '4px 0', color: '#6c757d' }}>
                               <strong>QR Kod:</strong> {qrCode}
                             </p>
                             <p style={{ margin: '4px 0', color: '#6c757d', wordBreak: 'break-all' }}>
                               <strong>URL:</strong> {qrUrl}
                             </p>
                           </>
                         );
                       })()}
                    </div>
                                      )}
                </div>

                {/* Sağ Panel - QR Kod Önizleme */}
                <div>
                  <h3 style={{ marginBottom: '16px', color: '#212529' }}>👁️ QR Kod Önizleme</h3>
                  
                  <div style={{ 
                    border: '2px dashed #e9ecef',
                    borderRadius: '12px',
                    padding: '40px 20px',
                    textAlign: 'center',
                    backgroundColor: '#f8f9fa',
                    minHeight: '300px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {qrCodeDataUrl ? (
                      <>
                        <img 
                          src={qrCodeDataUrl} 
                          alt="QR Kod" 
                          style={{ 
                            maxWidth: '250px',
                            maxHeight: '250px',
                            border: '1px solid #dee2e6',
                            borderRadius: '8px',
                            marginBottom: '16px'
                          }} 
                        />
                        <p style={{ color: '#6c757d', margin: '8px 0' }}>
                          QR kod başarıyla oluşturuldu!
                        </p>
                        <button
                          onClick={downloadQRCode}
                          className="btn btn-success"
                          style={{ 
                            fontSize: '14px',
                            padding: '10px 20px'
                          }}
                        >
                          📥 QR Kodu İndir
                        </button>
                      </>
                    ) : (
                                              <>
                          <div style={{ fontSize: '4rem', marginBottom: '16px', color: '#dee2e6' }}>📱</div>
                          {selectedTableForQR ? (
                            <button
                              onClick={() => generateQRCode(selectedTableForQR)}
                              disabled={qrGenerating}
                              className="btn btn-primary"
                              style={{ 
                                fontSize: '16px',
                                padding: '12px 20px'
                              }}
                            >
                              {qrGenerating ? '⏳ QR Kod Oluşturuluyor...' : '📱 QR Kod Oluştur'}
                            </button>
                          ) : (
                            <p style={{ color: '#6c757d', margin: 0 }}>
                              Önce bir masa seçin
                            </p>
                          )}
                        </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <>
            {/* Existing Categories */}
            <div className="card">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <h2 style={{ margin: 0 }}>📁 Mevcut Kategoriler</h2>
                <button
                  onClick={() => setShowAddCategoryModal(true)}
                  className="btn btn-primary"
                  style={{ 
                    fontSize: '14px',
                    padding: '10px 20px',
                    minHeight: 'auto'
                  }}
                >
                  ➕ Yeni Kategori Ekle
                </button>
              </div>
              
              {restaurant?.categories && restaurant.categories.length > 0 ? (
                <div className="menu-grid">
                  {restaurant.categories
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((category) => (
                      <div 
                        key={category.id} 
                        className={`menu-item ${selectedCategoryForView === category.id ? 'selected' : ''} clickable`}
                        onClick={() => {
                          const newSelectedCategory = selectedCategoryForView === category.id ? null : category.id;
                          setSelectedCategoryForView(newSelectedCategory);
                          
                          // Kategori seçildiğinde smooth scroll
                          if (newSelectedCategory) {
                            setTimeout(() => {
                              // Kategori detayları kartının pozisyonuna scroll yap
                              const adminMain = document.querySelector('.admin-main');
                              if (adminMain && categoryDetailsRef.current) {
                                // Kartın admin-main container içindeki pozisyonunu hesapla
                                const adminMainRect = adminMain.getBoundingClientRect();
                                const cardRect = categoryDetailsRef.current.getBoundingClientRect();
                                
                                // Kartın admin-main içindeki relative pozisyonu
                                const cardTopInContainer = cardRect.top - adminMainRect.top + adminMain.scrollTop;
                                
                                // Kartın üst kısmına scroll yap (biraz margin bırak)
                                const targetScroll = cardTopInContainer - 90;
                                
                                adminMain.scrollTo({ top: targetScroll, behavior: 'smooth' });
                              } else {
                                // Fallback: scrollIntoView kullan
                                categoryDetailsRef.current?.scrollIntoView({ 
                                  behavior: 'smooth', 
                                  block: 'start' 
                                });
                              }
                            }, 100);
                          }
                        }}
                        style={{ 
                          cursor: 'pointer',
                          border: selectedCategoryForView === category.id ? '2px solid #ff6b35' : '2px solid #e9ecef',
                          opacity: 1
                        }}
                      >
                        <div className="menu-item-content">
                          <div className="menu-item-header">
                            <h3 className="menu-item-name" style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '200px'
                            }}>{category.name}</h3>
                            <span className="menu-item-price">
                              #{category.displayOrder}
                            </span>
                          </div>
                          {category.menuItems && category.menuItems.length > 0 ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 0 0' }}>
                              <p style={{ color: '#6c757d', fontSize: '12px', margin: 0 }}>
                                Menüler için tıklayın
                              </p>
                              <span style={{ color: '#6c757d', fontSize: '12px' }}>
                                {category.menuItems?.length || 0} öğe
                              </span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 0 0' }}>
                              <p style={{ color: '#ff6b35', fontSize: '12px', margin: 0 }}>
                                Yeni öğe eklemek için tıklayın
                              </p>
                              <span style={{ color: '#6c757d', fontSize: '12px' }}>
                                {category.menuItems?.length || 0} öğe
                              </span>
                            </div>
                          )}
                          
                          {/* Edit/Delete Buttons */}
                          <div style={{ 
                            display: 'flex', 
                            gap: '8px', 
                            marginTop: '12px',
                            paddingTop: '12px',
                            borderTop: '1px solid #e9ecef'
                          }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditCategoryModal(category);
                              }}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              ✏️ Düzenle
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCategory(category.id, category.name);
                              }}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              🗑️ Sil
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#6c757d', padding: '60px 20px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📁</div>
                  <p>Henüz kategori bulunmuyor.</p>
                </div>
              )}
            </div>

            {/* Selected Category Menu Items */}
            {selectedCategoryForView && (
              <div className="card" ref={categoryDetailsRef} style={{ backgroundColor: '#ffffff' }}>
                {(() => {
                  const category = restaurant?.categories?.find(c => c.id === selectedCategoryForView);
                  if (!category) return null;
                  
                  return (
                    <>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginTop: '20px', 
                        marginBottom: '16px',
                        flexWrap: 'wrap',
                        gap: '16px'
                      }}>
                        <h3 style={{ margin: 0, color: '#212529', fontSize: '22px' }}>
                          🍽️ {category.name}
                          <span style={{ fontSize: '14px', fontWeight: 'normal', marginLeft: '8px' }}>
                            ({category.menuItems?.length || 0} öğe)
                          </span>
                        </h3>
                        <button
                          onClick={() => {
                            // Modal açılırken seçili kategoriye göre form'u set et
                            setNewMenuItem(prev => ({ ...prev, categoryId: category.id }));
                            openAddMenuItemModal();
                          }}
                          className="btn btn-primary"
                          style={{ 
                            fontSize: '14px',
                            padding: '10px 20px',
                            minHeight: 'auto'
                          }}
                        >
                          ➕ Yeni Öğe Ekle
                        </button>
                      </div>
                      
                      {category.menuItems && category.menuItems.length > 0 ? (
                        <div className="menu-grid">
                          {category.menuItems
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .map((item) => (
                              <div key={item.id} className={`menu-item ${!item.isAvailable ? 'unavailable' : ''}`}>
                                <div className="menu-item-image">
                                  {item.imageUrl ? (
                                    <div style={{ 
                                      width: '100%', 
                                      height: '100%',
                                      backgroundImage: `url(${item.imageUrl})`,
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center'
                                    }} />
                                  ) : (
                                    <div style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center',
                                      height: '100%',
                                      fontSize: '3rem',
                                      color: '#dee2e6'
                                    }}>
                                      🍽️
                                    </div>
                                  )}
                                </div>
                                
                                <div className="menu-item-content">
                                  <div className="menu-item-header">
                                    <h3 className="menu-item-name" style={{
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      maxWidth: '180px'
                                    }}>
                                      {item.name}
                                      {!item.isAvailable && (
                                        <span style={{ color: '#dc3545', fontSize: '12px', marginLeft: '8px' }}>
                                          (Mevcut Değil)
                                        </span>
                                      )}
                                    </h3>
                                    <span className="menu-item-price">
                                      {formatPrice(item.price)}
                                    </span>
                                  </div>
                                  
                                  {item.description && (
                                    <p className="menu-item-description">
                                      {item.description}
                                    </p>
                                  )}
                                  
                                  <p style={{ color: '#6c757d', fontSize: '12px', margin: '8px 0 0 0' }}>
                                    Sıra: #{item.displayOrder}
                                  </p>
                                  
                                  {/* Edit/Delete Buttons */}
                                  <div style={{ 
                                    display: 'flex', 
                                    gap: '8px', 
                                    marginTop: '12px',
                                    paddingTop: '12px',
                                    borderTop: '1px solid #e9ecef'
                                  }}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditMenuItemModal(item);
                                      }}
                                      style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        backgroundColor: '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      ✏️ Düzenle
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMenuItem(item.id, item.name);
                                      }}
                                      style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        backgroundColor: '#dc3545',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      🗑️ Sil
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', color: '#6c757d', padding: '40px 20px' }}>
                          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🍽️</div>
                          <p>Bu kategoride henüz menü öğesi bulunmuyor.</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </>
        )}

        {activeTab === 'tables' && (
          <div className="card">
            <h2 style={{ marginBottom: '20px' }}>Masa Listesi</h2>

            {/* Add Table Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newTableNumber.trim()) return;
                try {
                  const added = await statisticsService.addTable(restaurantSlug!, newTableNumber.trim());
                  setTables(prev => [...prev, { id: added.id, tableNumber: added.tableNumber, isActive: true }]);
                  setNewTableNumber('');
                } catch (err: any) {
                  alert(err?.response?.data?.message || 'Masa eklenirken hata oluştu');
                }
              }}
              style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}
            >
              <input
                type="text"
                placeholder="Masa No (örn: 6)"
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                style={{ flex: '0 0 160px', padding: '10px', border: '2px solid #e9ecef', borderRadius: '8px' }}
              />
              <button type="submit" className="btn btn-primary">➕ Ekle</button>
            </form>

            {/* Table List */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 0' }}>Masa No</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table) => (
                  <tr key={table.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px 0' }}>{table.tableNumber}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '14px' }}
                        onClick={async () => {
                          if (window.confirm(`${table.tableNumber} masasını silmek istediğinize emin misiniz?`)) {
                            try {
                              await statisticsService.deleteTable(restaurantSlug!, table.id);
                              setTables(prev => prev.filter(t => t.id !== table.id));
                            } catch (err) {
                              alert('Masa silinirken hata oluştu');
                            }
                          }
                        }}
                      >
                        🗑️ Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        </div>

        {/* Footer */}
        <footer style={{ 
          background: 'white', 
          borderTop: '1px solid #e9ecef', 
          padding: '40px 0',
          marginTop: '40px',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 30px' }}>
            <p style={{ color: '#6c757d', margin: 0 }}>
              © 2024 QR Menü Sistemi - Admin Paneli
            </p>
          </div>
        </footer>
      </main>

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1003,
          padding: '20px'
        }} onClick={() => setShowAddCategoryModal(false)}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ margin: 0 }}>➕ Yeni Kategori Ekle</h2>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d',
                  padding: '8px',
                  borderRadius: '50%',
                  width: '45px',
                  height: '45px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.color = '#343a40';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#6c757d';
                }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddCategory}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Kategori Adı *
                  </label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e9ecef',
                      borderRadius: '8px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Örn: Ana Yemekler"
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Açıklama
                  </label>
                  <textarea
                    value={newCategory.description}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e9ecef',
                      borderRadius: '8px',
                      fontSize: '16px',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Kategori açıklaması (opsiyonel)"
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Sıralama
                  </label>
                  <input
                    type="number"
                    value={newCategory.displayOrder}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, displayOrder: parseInt(e.target.value) }))}
                    min="1"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e9ecef',
                      borderRadius: '8px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  justifyContent: 'flex-end',
                  marginTop: '16px'
                }}>
                  <button
                    type="button"
                    onClick={() => setShowAddCategoryModal(false)}
                    className="btn btn-secondary"
                    style={{ minHeight: 'auto' }}
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !newCategory.name.trim()}
                    className="btn btn-primary"
                    style={{ minHeight: 'auto' }}
                  >
                    {loading ? '⏳ Ekleniyor...' : '➕ Kategori Ekle'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Menu Item Modal */}
      {showAddMenuItemModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1003,
          padding: '20px'
        }} onClick={() => closeAddMenuItemModal()}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ margin: 0 }}>➕ Yeni Menü Öğesi Ekle</h2>
              <button
                onClick={() => closeAddMenuItemModal()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d',
                  padding: '8px',
                  borderRadius: '50%',
                  width: '45px',
                  height: '45px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.color = '#343a40';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#6c757d';
                }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddMenuItem}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Öğe Adı *
                  </label>
                  <input
                    type="text"
                    value={newMenuItem.name}
                    onChange={(e) => setNewMenuItem(prev => ({ ...prev, name: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e9ecef',
                      borderRadius: '8px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Örn: Adana Kebap"
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Açıklama
                  </label>
                  <textarea
                    value={newMenuItem.description}
                    onChange={(e) => setNewMenuItem(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e9ecef',
                      borderRadius: '8px',
                      fontSize: '16px',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Öğe açıklaması"
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Fiyat (₺) *
                    </label>
                    <input
                      type="number"
                      value={newMenuItem.price}
                      onChange={(e) => setNewMenuItem(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                      min="0"
                      step="0.01"
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e9ecef',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Sıralama
                    </label>
                    <input
                      type="number"
                      value={newMenuItem.displayOrder}
                      onChange={(e) => setNewMenuItem(prev => ({ ...prev, displayOrder: parseInt(e.target.value) }))}
                      min="1"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e9ecef',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
                
                <ImageUploader
                  currentImageUrl={newMenuItem.imageUrl}
                  onImageChange={(imageUrl) => setNewMenuItem(prev => ({ ...prev, imageUrl }))}
                />
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
                  <input
                    type="checkbox"
                    id="isAvailableModal"
                    checked={newMenuItem.isAvailable}
                    onChange={(e) => setNewMenuItem(prev => ({ ...prev, isAvailable: e.target.checked }))}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="isAvailableModal" style={{ fontWeight: '600' }}>
                    Şu an mevcut
                  </label>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  justifyContent: 'flex-end',
                  marginTop: '16px'
                }}>
                  <button
                    type="button"
                    onClick={() => closeAddMenuItemModal()}
                    className="btn btn-secondary"
                    style={{ minHeight: 'auto' }}
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !newMenuItem.name.trim() || newMenuItem.price <= 0 || newMenuItem.categoryId === 0}
                    className="btn btn-primary"
                    style={{ minHeight: 'auto' }}
                  >
                    {loading ? '⏳ Ekleniyor...' : '➕ Menü Öğesi Ekle'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditCategoryModal && editingCategory && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1003,
          padding: '20px'
        }} onClick={() => {
          setShowEditCategoryModal(false);
          setEditingCategory(null);
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ margin: 0 }}>✏️ Kategori Düzenle</h2>
              <button
                onClick={() => {
                  setShowEditCategoryModal(false);
                  setEditingCategory(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d',
                  padding: '8px',
                  borderRadius: '50%',
                  width: '45px',
                  height: '45px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.color = '#343a40';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#6c757d';
                }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleEditCategory}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Kategori Adı *
                  </label>
                  <input
                    type="text"
                    value={editingCategory.name}
                    onChange={(e) => {
                      if (editingCategory) {
                        setEditingCategory({
                          ...editingCategory,
                          name: e.target.value
                        });
                      }
                    }}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e9ecef',
                      borderRadius: '8px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Örn: Ana Yemekler"
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Açıklama
                  </label>
                  <textarea
                    value={editingCategory.description}
                    onChange={(e) => {
                      if (editingCategory) {
                        setEditingCategory({
                          ...editingCategory,
                          description: e.target.value
                        });
                      }
                    }}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e9ecef',
                      borderRadius: '8px',
                      fontSize: '16px',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Kategori açıklaması (opsiyonel)"
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Sıralama
                  </label>
                  <input
                    type="number"
                    value={editingCategory.displayOrder}
                    onChange={(e) => {
                      if (editingCategory) {
                        setEditingCategory({
                          ...editingCategory,
                          displayOrder: parseInt(e.target.value)
                        });
                      }
                    }}
                    min="1"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e9ecef',
                      borderRadius: '8px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  justifyContent: 'flex-end',
                  marginTop: '16px'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditCategoryModal(false);
                      setEditingCategory(null);
                    }}
                    className="btn btn-secondary"
                    style={{ minHeight: 'auto' }}
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !editingCategory.name.trim()}
                    className="btn btn-primary"
                    style={{ minHeight: 'auto' }}
                  >
                    {loading ? '⏳ Güncelleniyor...' : '✏️ Kategori Güncelle'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Menu Item Modal */}
      {showEditMenuItemModal && editingMenuItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1003,
          padding: '20px'
        }} onClick={() => closeEditMenuItemModal()}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ margin: 0 }}>✏️ Menü Öğesi Düzenle</h2>
              <button
                onClick={() => closeEditMenuItemModal()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d',
                  padding: '8px',
                  borderRadius: '50%',
                  width: '45px',
                  height: '45px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.color = '#343a40';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#6c757d';
                }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleEditMenuItem}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Öğe Adı *
                  </label>
                  <input
                    type="text"
                    value={editingMenuItem.name}
                    onChange={(e) => {
                      if (editingMenuItem) {
                        setEditingMenuItem({
                          ...editingMenuItem,
                          name: e.target.value
                        });
                      }
                    }}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e9ecef',
                      borderRadius: '8px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Örn: Adana Kebap"
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Açıklama
                  </label>
                  <textarea
                    value={editingMenuItem.description}
                    onChange={(e) => {
                      if (editingMenuItem) {
                        setEditingMenuItem({
                          ...editingMenuItem,
                          description: e.target.value
                        });
                      }
                    }}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e9ecef',
                      borderRadius: '8px',
                      fontSize: '16px',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Öğe açıklaması"
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Fiyat (₺) *
                    </label>
                    <input
                      type="number"
                      value={editingMenuItem.price}
                      onChange={(e) => {
                        if (editingMenuItem) {
                          setEditingMenuItem({
                            ...editingMenuItem,
                            price: parseFloat(e.target.value)
                          });
                        }
                      }}
                      min="0"
                      step="0.01"
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e9ecef',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Sıralama
                    </label>
                    <input
                      type="number"
                      value={editingMenuItem.displayOrder}
                      onChange={(e) => {
                        if (editingMenuItem) {
                          setEditingMenuItem({
                            ...editingMenuItem,
                            displayOrder: parseInt(e.target.value)
                          });
                        }
                      }}
                      min="1"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e9ecef',
                        borderRadius: '8px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
                
                <ImageUploader
                  currentImageUrl={editingMenuItem.imageUrl}
                  onImageChange={(imageUrl) => {
                    if (editingMenuItem) {
                      setEditingMenuItem({
                        ...editingMenuItem,
                        imageUrl
                      });
                    }
                  }}
                  stagingMode={true}
                  initialImageUrl={initialEditImageUrl}
                />
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
                  <input
                    type="checkbox"
                    id="isAvailableEditModal"
                    checked={editingMenuItem.isAvailable}
                    onChange={(e) => {
                      if (editingMenuItem) {
                        setEditingMenuItem({
                          ...editingMenuItem,
                          isAvailable: e.target.checked
                        });
                      }
                    }}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="isAvailableEditModal" style={{ fontWeight: '600' }}>
                    Şu an mevcut
                  </label>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  justifyContent: 'flex-end',
                  marginTop: '16px'
                }}>
                  <button
                    type="button"
                    onClick={() => closeEditMenuItemModal()}
                    className="btn btn-secondary"
                    style={{ minHeight: 'auto' }}
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !editingMenuItem.name.trim() || editingMenuItem.price <= 0}
                    className="btn btn-primary"
                    style={{ minHeight: 'auto' }}
                  >
                    {loading ? '⏳ Güncelleniyor...' : '✏️ Menü Öğesi Güncelle'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage; 