import React, { useState, useRef } from 'react';
import { menuService } from '../services/api';

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
      // Görsel oluştur
      const img = new Image();
      img.src = URL.createObjectURL(file);

      img.onload = () => {
          // Görsel boyutları
          let width = img.width;
          let height = img.height;

          // Dosya boyutuna göre kalite ayarı
          const fileSizeKB = file.size / 1024;
          let quality, maxWidth, maxHeight;

          if (fileSizeKB <= 100) {
              quality = 1.0; // %100
              maxWidth = 3840; // 4K
              maxHeight = 2160;
          } else if (fileSizeKB <= 200) {
              quality = 0.9; // %90
              maxWidth = 2560;
              maxHeight = 1440;
          } else {
              quality = 0.85; // %85
              maxWidth = 1920;
              maxHeight = 1080;
          }

          // En-boy oranını koru
          if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
          }

          // Canvas oluştur
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            return reject(new Error('Canvas context alınamadı.'));
          }

          // Görseli çiz
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, width, height);

          // Canvas'ı Blob olarak dışa aktar
          canvas.toBlob((blob) => {
              if (blob) {
                  // Blob'u File nesnesine dönüştür
                  const compressedFile = new File([blob], file.name, {
                      type: 'image/jpeg',
                      lastModified: new Date().getTime()
                  });
                  resolve(compressedFile);
              } else {
                  reject(new Error('Görsel sıkıştırma başarısız oldu.'));
              }
          }, 'image/jpeg', quality);
      };

      img.onerror = (error) => {
          reject(error);
      };
  });
}

interface ImageUploaderProps {
  currentImageUrl?: string;
  onImageChange: (imageUrl: string) => void;
  disabled?: boolean;
  stagingMode?: boolean; // Düzenleme modunda gerçek silme işlemi yapma
  initialImageUrl?: string; // Başlangıç resim URL'i (yeni yüklenen vs eski ayrımı için)
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  currentImageUrl,
  onImageChange,
  disabled = false,
  stagingMode = false,
  initialImageUrl = ''
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRemovedInStaging, setIsRemovedInStaging] = useState(false); // Staging modunda silinmiş gibi göster
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Dosya tipi kontrolü
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Sadece JPG, PNG, GIF ve WebP formatları desteklenir.');
      return;
    }

    try {
      setUploading(true);

      // Resmi sıkıştır
      const compressedFile = await compressImage(file);
      
      // "Eski resim gizlendi" durumunu sıfırla, çünkü artık yeni bir resim var.
      setIsRemovedInStaging(false);

      // Preview için local URL oluştur
      const localPreviewUrl = URL.createObjectURL(compressedFile);
      setPreviewUrl(localPreviewUrl);

      // Önceki resmi sil (sadece normal modda veya staging modunda yeni yüklenen resimse)
      if (currentImageUrl && currentImageUrl.startsWith('/images/')) {
        if (!stagingMode || (stagingMode && currentImageUrl !== initialImageUrl)) {
          // Normal mod VEYA staging modunda yeni yüklenen resim - sil
          try {
            const oldFileName = menuService.getFileNameFromUrl(currentImageUrl);
            if (oldFileName) {
              await menuService.deleteImage(oldFileName);
              console.log('Önceki resim silindi:', oldFileName);
            }
          } catch (deleteError) {
            console.warn('Önceki resim silinirken hata:', deleteError);
          }
        }
      }

      // Sıkıştırılmış dosyayı sunucuya yükle
      const result = await menuService.uploadImage(compressedFile);
      
      onImageChange(result.imageUrl);
      
      URL.revokeObjectURL(localPreviewUrl);
      setPreviewUrl(null);
      
    } catch (error: any) {
      console.error('Dosya yükleme hatası:', error);
      alert('Dosya yüklenirken hata oluştu: ' + (error.response?.data?.message || error.message));
      
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    if (stagingMode) {
      // Staging modunda: Eğer yeni yüklenen resimse hemen sil, eski resimse sadece gizle
      if (currentImageUrl && currentImageUrl !== initialImageUrl && currentImageUrl.startsWith('/images/')) {
        // Yeni yüklenen resim - hemen sil
        try {
          const fileName = menuService.getFileNameFromUrl(currentImageUrl);
          if (fileName) {
            await menuService.deleteImage(fileName);
            console.log('Yeni yüklenen resim hemen silindi:', fileName);
          }
        } catch (deleteError) {
          console.warn('Yeni resim silinirken hata:', deleteError);
        }
      } else {
        // Eski resim - sadece UI'da gizle
        setIsRemovedInStaging(true);
      }
      
      onImageChange(''); // Parent'a boş string gönder
      setPreviewUrl(null);
    } else {
      // Normal modda gerçek silme yap (yeni ekleme için)
      if (currentImageUrl && currentImageUrl.startsWith('/images/')) {
        try {
          const fileName = menuService.getFileNameFromUrl(currentImageUrl);
          if (fileName) {
            await menuService.deleteImage(fileName);
          }
        } catch (deleteError) {
          // Dosya silme hatası - işlem devam etsin
          console.warn('Dosya silinirken hata:', deleteError);
        }
      }
      
      onImageChange('');
      setPreviewUrl(null);
    }
  };

  const getDisplayImageUrl = () => {
    // 1. Öncelik: Her zaman yeni yüklenen bir önizleme varsa onu göster.
    if (previewUrl) return previewUrl;
    
    // 2. Öncelik: Eğer eski resim "gizlendi" olarak işaretlenmişse, hiçbir şey gösterme.
    if (stagingMode && isRemovedInStaging) return null;
    
    // 3. Öncelik: Yukarıdakiler yoksa, mevcut (orijinal) resmi göster.
    if (currentImageUrl) {
      if (currentImageUrl.startsWith('/')) {
        return `${process.env.REACT_APP_API_URL || 'http://localhost:5092'}${currentImageUrl}`;
      }
      return currentImageUrl;
    }
    
    return null;
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ 
        display: 'block', 
        fontSize: '14px', 
        fontWeight: '500', 
        color: '#374151', 
        marginBottom: '8px' 
      }}>
        Ürün Resmi
      </label>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Mevcut/Yüklenen Resim Önizlemesi */}
        {getDisplayImageUrl() && (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={getDisplayImageUrl()!}
              alt="Ürün resmi"
              style={{
                width: '128px',
                height: '128px',
                objectFit: 'cover',
                borderRadius: '8px',
                border: '1px solid #d1d5db'
              }}
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemoveImage}
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  border: 'none',
                  cursor: 'pointer'
                }}
                title="Resmi kaldır"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Dosya Seçme Butonu */}
        {!disabled && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={uploading}
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: uploading ? '#f3f4f6' : 'white',
                color: uploading ? '#9ca3af' : '#374151',
                cursor: uploading ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!uploading) {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }
              }}
              onMouseLeave={(e) => {
                if (!uploading) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
            >
              {uploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Yükleniyor...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Resim Seç
                </>
              )}
            </button>
            
            <p style={{ 
              marginTop: '4px', 
              fontSize: '12px', 
              color: '#6b7280' 
            }}>
              JPG, PNG, GIF, WebP formatları desteklenir. Maksimum 5MB.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader; 