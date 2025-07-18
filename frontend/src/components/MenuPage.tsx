import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { menuService } from '../services/api';
import { Restaurant, MenuItem } from '../types';
import QRScanner from './QRScanner';

const MenuPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { restaurantSlug, qrCode: qrCodeFromParams } = useParams<{ restaurantSlug: string; qrCode: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedQRCode, setScannedQRCode] = useState<string | null>(null);
  
  // Refs
  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const isManualScroll = useRef(false);

  useEffect(() => {
    // Restaurant yüklendiğinde ilk kategoriyi seç
    if (restaurant && restaurant.categories && restaurant.categories.length > 0 && !selectedCategory) {
      const firstCategory = restaurant.categories
        .sort((a, b) => a.displayOrder - b.displayOrder)[0];
      setSelectedCategory(firstCategory.id);
      
      // İlk kategoriyi ortala
      setTimeout(() => {
        scrollTabToCenter(firstCategory.id);
      }, 100);
    }
  }, [restaurant, selectedCategory]);

  useEffect(() => {
    // URL parametresinden QR kod al (path param veya query param)
    const qrCodeFromUrl = qrCodeFromParams || searchParams.get('qr');
    
    if (qrCodeFromUrl) {
      // URL'den QR kod varsa ve henüz yüklenmemişse
      if (qrCodeFromUrl !== scannedQRCode) {
        setScannedQRCode(qrCodeFromUrl);
        fetchMenu(qrCodeFromUrl);
      }
    } else if (!qrCodeFromUrl && !scannedQRCode && !restaurant) {
      // QR kod yoksa scanner'ı göster
      setShowQRScanner(true);
    }
  }, [qrCodeFromParams, searchParams]);

  // Intersection Observer ile scroll tracking
  useEffect(() => {
    if (!restaurant || !restaurant.categories || restaurant.categories.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScroll.current) return;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const categoryId = parseInt(entry.target.getAttribute('data-category-id') || '0');
            if (categoryId && categoryId !== selectedCategory) {
              setSelectedCategory(categoryId);
              
              // Kategori tabını ortala
              setTimeout(() => {
                scrollTabToCenter(categoryId);
              }, 100);
            }
          }
        });
      },
      {
        rootMargin: '-150px 0px -50% 0px', // Header offset ve yarı sayfa
        threshold: 0.1
      }
    );

    // Tüm kategori bölümlerini observe et
    Object.values(categoryRefs.current).forEach((ref) => {
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [restaurant, selectedCategory]);

  const scrollTabToCenter = (categoryId: number) => {
    if (categoryTabsRef.current) {
      const tabsContainer = categoryTabsRef.current;
      const selectedTab = tabsContainer.querySelector(`[data-category-id="${categoryId}"]`) as HTMLElement;
      
      if (selectedTab) {
        const containerWidth = tabsContainer.offsetWidth;
        const tabOffsetLeft = selectedTab.offsetLeft;
        const tabWidth = selectedTab.offsetWidth;
        
        // Tab'ı tam ortaya getir
        const scrollLeft = tabOffsetLeft - (containerWidth / 2) + (tabWidth / 2);
        
        tabsContainer.scrollTo({
          left: Math.max(0, scrollLeft), // Negatif değerleri engelle
          behavior: 'smooth'
        });
      }
    }
  };

  const fetchMenu = async (qrCode: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('QR kod ile menü getiriliyor:', qrCode, 'Restaurant:', restaurantSlug);
      
      if (!restaurantSlug) {
        throw new Error('Restaurant slug bulunamadı');
      }
      
      const data = await menuService.getMenuByQRCode(restaurantSlug, qrCode);
      setRestaurant(data);
      
      if (data.categories && data.categories.length > 0) {
        setSelectedCategory(data.categories[0].id);
      }
      
      setShowQRScanner(false);
    } catch (err: any) {
      // Duplicate request error'unu ignore et
      if (err.message === 'Duplicate request prevented') {
        console.log('Duplicate request engellendi, mevcut veri kullanılıyor');
        return;
      }
      
      console.error('Menü yüklenirken hata:', err);
      setError(`QR kod "${qrCode}" için menü bulunamadı. Lütfen geçerli bir QR kod okutun.`);
      setRestaurant(null);
      setScannedQRCode(null);
      setShowQRScanner(true);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(price);
  };

  const handleQRScan = (qrCode: string) => {
    console.log('QR kod okundu:', qrCode);
    setScannedQRCode(qrCode);
    fetchMenu(qrCode);
  };

  const handleQRError = (error: string) => {
    console.error('QR okuma hatası:', error);
    setError(error);
  };

  const handleCloseScanner = () => {
    setShowQRScanner(false);
    if (!restaurant) {
      setError('Menüyü görüntülemek için QR kod okutun.');
    }
  };

  const handleOpenScanner = () => {
    setError(null);
    setShowQRScanner(true);
  };

  // Kategori tabına tıklandığında o kategoriye scroll yap
  const handleCategoryClick = (categoryId: number) => {
    const element = categoryRefs.current[categoryId];
    if (element) {
      isManualScroll.current = true;
      setSelectedCategory(categoryId);
      
      // Tıklanan tab'ı ortala
      scrollTabToCenter(categoryId);
      
      // Basit scroll - element'in pozisyonuna git
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      
      // Manual scroll flag'ini temizle
      setTimeout(() => {
        isManualScroll.current = false;
      }, 1000);
    }
  };

  if (loading) {
    return (
      <div className="App">
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
            <p>Menü yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !restaurant) {
    return (
      <div className="App">
        <div className="container">
          <div className="error">
            <h3>❌ Hata</h3>
            <p>{error}</p>
            <button onClick={handleOpenScanner} className="btn btn-primary" style={{ marginTop: '16px' }}>
              📱 QR Kod Okut
            </button>
          </div>
        </div>
        {showQRScanner && (
          <QRScanner
            onScan={handleQRScan}
            onError={handleQRError}
            onClose={handleCloseScanner}
            isActive={showQRScanner}
          />
        )}
      </div>
    );
  }

  if (!restaurant && !showQRScanner) {
    return (
      <div className="App">
        <div className="container">
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '24px' }}>📱</div>
            <h3>QR Menü Sistemi</h3>
            <p style={{ color: '#6c757d', marginBottom: '32px' }}>
              Menüyü görüntülemek için QR kodunu okutun
            </p>
            <button onClick={handleOpenScanner} className="btn btn-primary">
              📱 QR Kod Okut
            </button>
          </div>
        </div>
        {showQRScanner && (
          <QRScanner
            onScan={handleQRScan}
            onError={handleQRError}
            onClose={handleCloseScanner}
            isActive={showQRScanner}
          />
        )}
      </div>
    );
  }

  // QR Scanner'ı göster
  if (showQRScanner) {
    return (
      <div className="App">
        <QRScanner
          onScan={handleQRScan}
          onError={handleQRError}
          onClose={handleCloseScanner}
          isActive={showQRScanner}
        />
      </div>
    );
  }

  // Restaurant null kontrolü
  if (!restaurant) {
    return null;
  }

  return (
    <div className={`App ${restaurant.categories && restaurant.categories.length > 0 ? 'has-fixed-tabs' : ''}`}>
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <div>🍽️ {restaurant.name}</div>
              {scannedQRCode && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6c757d', 
                  marginTop: '4px',
                  fontWeight: 'normal'
                }}>
                  📍 Masa: {scannedQRCode}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={handleOpenScanner} className="btn btn-secondary" style={{ fontSize: '14px', padding: '6px 10px' }}>
                📱 Yeni QR Okut
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Fixed Category Tabs */}
      {restaurant.categories && restaurant.categories.length > 0 && (
        <div className="category-tabs-fixed">
          <div className="container">
            <div className="category-tabs" ref={categoryTabsRef}>
              {restaurant.categories
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((category) => (
                  <button
                    key={category.id}
                    data-category-id={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    className={`category-tab ${selectedCategory === category.id ? 'active' : ''}`}
                  >
                    {category.name}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      <div className="container">
        {/* Error message */}
        {error && (
          <div className="error">
            <p>{error}</p>
            <button onClick={handleOpenScanner} className="btn btn-primary" style={{ marginTop: '12px' }}>
              📱 QR Kod Okut
            </button>
          </div>
        )}

        {/* Menu Content - Tüm kategoriler tek sayfada */}
        {restaurant.categories && restaurant.categories.length > 0 && (
          <div>
            {restaurant.categories
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((category) => (
                <div
                  key={category.id}
                  ref={(el) => (categoryRefs.current[category.id] = el)}
                  data-category-id={category.id}
                  className="category-section"
                  style={{ marginBottom: '40px', paddingTop: '20px' }}
                >
                  {/* Kategori Başlığı */}
                  <div className="category-header" style={{ 
                    marginBottom: '24px',
                    paddingBottom: '12px',
                    borderBottom: '2px solid #e9ecef'
                  }}>
                    <h2 style={{ 
                      fontSize: '24px',
                      fontWeight: '600',
                      color: '#212529',
                      margin: 0
                    }}>
                      {category.name}
                    </h2>
                    {category.description && (
                      <p style={{ 
                        color: '#6c757d',
                        fontSize: '14px',
                        margin: '8px 0 0 0',
                        fontStyle: 'italic'
                      }}>
                        {category.description}
                      </p>
                    )}
                  </div>

                  {/* Kategori Menü Öğeleri */}
                  {category.menuItems && category.menuItems.length > 0 ? (
                    <div className="menu-list">
                      {category.menuItems
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((item) => (
                          <div
                            key={item.id}
                            className="menu-item-row"
                            style={{
                              display: 'flex',
                              padding: '16px 0',
                              borderBottom: '1px solid #f0f0f0',
                              opacity: !item.isAvailable ? 0.6 : 1
                            }}
                          >
                            <div className="menu-item-info" style={{ flex: 1 }}>
                              <h3 style={{ 
                                fontSize: '18px',
                                fontWeight: '600',
                                color: '#212529',
                                margin: '0 0 8px 0'
                              }}>
                                {item.name}
                              </h3>
                              
                              {item.description && (
                                <p style={{ 
                                  color: '#6c757d',
                                  fontSize: '14px',
                                  margin: '0 0 12px 0',
                                  lineHeight: '1.4'
                                }}>
                                  {item.description}
                                </p>
                              )}
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ 
                                  fontSize: '18px',
                                  fontWeight: 'bold',
                                  color: '#28a745'
                                }}>
                                  {formatPrice(item.price)}
                                </span>
                                {!item.isAvailable && (
                                  <span style={{ 
                                    fontSize: '12px',
                                    color: '#dc3545',
                                    fontWeight: '500'
                                  }}>
                                    Tükendi
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Ürün Resmi */}
                            <div className="menu-item-image" style={{ 
                              width: '80px',
                              height: '80px',
                              marginLeft: '16px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              backgroundColor: '#f8f9fa',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {item.imageUrl ? (
                                <img 
                                  src={item.imageUrl.startsWith('/') ? `${process.env.REACT_APP_API_URL || 'http://localhost:5092'}${item.imageUrl}` : item.imageUrl} 
                                  alt={item.name}
                                  style={{ 
                                    width: '100%', 
                                    height: '100%',
                                    objectFit: 'cover'
                                  }} 
                                />
                              ) : (
                                <span style={{ 
                                  fontSize: '32px',
                                  color: '#dee2e6'
                                }}>
                                  🍽️
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      color: '#6c757d', 
                      padding: '40px 20px',
                      fontStyle: 'italic'
                    }}>
                      Bu kategoride henüz ürün bulunmuyor.
                    </div>
                  )}
                </div>
              ))}
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
        <div className="container">
          <p style={{ color: '#6c757d', margin: 0 }}>
            © 2024 QR Menü Sistemi. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MenuPage; 