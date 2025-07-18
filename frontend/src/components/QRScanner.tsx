import React, { useState, useEffect, useRef } from 'react';
import QrScanner from 'qr-scanner';

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  onError: (error: string) => void;
  onClose: () => void;
  isActive: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError, onClose, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [qrScanner, setQrScanner] = useState<QrScanner | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<number>(0);

  useEffect(() => {
    if (isActive && videoRef.current) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isActive]);

  const startScanner = async () => {
    if (!videoRef.current) return;

    try {
      setError(null);
      setHasPermission(null);
      setIsScanning(true);
      
      console.log('Kamera erişimi isteniyor...');

      // 10 saniye timeout ekle
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Kamera erişimi zaman aşımına uğradı')), 10000);
      });

      // Önce basit kamera erişimi dene
      const streamPromise = navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Arka kamera tercih et
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      const stream = await Promise.race([streamPromise, timeoutPromise]) as MediaStream;

      console.log('Kamera stream alındı:', stream);
      
      // Video element'e stream'i ata
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setHasPermission(true);
        
        // QR Scanner'ı stream hazır olduktan sonra başlat
        setTimeout(() => {
          if (videoRef.current && stream.active) {
            try {
              const scanner = new QrScanner(
                videoRef.current,
                (result) => {
                  const currentTime = Date.now();
                  const qrCode = result.data;
                  
                  // Aynı QR kod 3 saniye içinde tekrar okunursa ignore et
                  if (lastScannedCode === qrCode && (currentTime - lastScanTime) < 3000) {
                    console.log('Duplicate QR kod ignore edildi:', qrCode);
                    return;
                  }
                  
                  console.log('QR kod bulundu:', qrCode);
                  setLastScannedCode(qrCode);
                  setLastScanTime(currentTime);
                  onScan(qrCode);
                  stopScanner();
                },
                {
                  onDecodeError: (err) => {
                    // QR kod bulunamadığında sessiz geç
                    console.debug('QR decode error:', err);
                  },
                  highlightScanRegion: true,
                  highlightCodeOutline: true,
                }
              );
              
              setQrScanner(scanner);
              scanner.start();
              console.log('QR Scanner başlatıldı');
            } catch (scannerErr) {
              console.error('QR Scanner oluşturma hatası:', scannerErr);
              // Scanner hata verse bile kamera çalışır, manuel giriş kullanılabilir
            }
          }
        }, 1000);
      }
      
    } catch (err: any) {
      console.error('Kamera erişim hatası:', err);
      setHasPermission(false);
      setIsScanning(false);
      
      if (err.name === 'NotAllowedError') {
        setError('Kamera izni verilmedi. Lütfen tarayıcı ayarlarından kamera iznini etkinleştirin.');
      } else if (err.name === 'NotFoundError') {
        setError('Kamera bulunamadı. Cihazınızda kamera olduğundan emin olun.');
      } else if (err.name === 'NotSupportedError') {
        setError('Tarayıcınız kamera erişimini desteklemiyor. Lütfen güncel bir tarayıcı kullanın.');
      } else if (err.message === 'Kamera erişimi zaman aşımına uğradı') {
        setError('Kamera erişimi çok uzun sürdü. Lütfen manuel giriş kullanın veya tekrar deneyin.');
      } else {
        setError('Kamera erişiminde hata oluştu: ' + err.message);
      }
      
      onError(error || 'Kamera erişim hatası');
    }
  };

  const stopScanner = () => {
    try {
      // QR Scanner'ı durdur
      if (qrScanner) {
        qrScanner.stop();
        qrScanner.destroy();
        setQrScanner(null);
      }
      
      // Video stream'i durdur
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('Kamera track durduruldu:', track.kind);
        });
        videoRef.current.srcObject = null;
      }
      
      setIsScanning(false);
      setHasPermission(null);
      console.log('Scanner tamamen durduruldu');
    } catch (err) {
      console.error('Scanner durdurma hatası:', err);
    }
  };

  const handleManualInput = () => {
    const qrCode = prompt('QR kod değerini manuel olarak girin (örn: TABLE001):');
    if (qrCode && qrCode.trim()) {
      onScan(qrCode.trim().toUpperCase());
    }
  };

  const handleTestScan = (testCode: string) => {
    onScan(testCode);
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-modal">
        <div className="qr-scanner-header">
          <h3>📱 QR Kod Okuyucu</h3>
          <button onClick={onClose} className="close-button">
            ✕
          </button>
        </div>

        <div className="qr-scanner-content">
          {hasPermission === false && (
            <div className="qr-scanner-error">
              <div className="error-icon">📷</div>
              <h4>Kamera Erişimi Gerekli</h4>
              <p>{error}</p>
              <div className="qr-scanner-actions">
                <button onClick={startScanner} className="btn btn-primary">
                  🔄 Tekrar Dene
                </button>
                <button onClick={handleManualInput} className="btn btn-secondary">
                  ⌨️ Manuel Giriş
                </button>
              </div>
            </div>
          )}

          {hasPermission === true && (
            <div className="qr-scanner-camera">
              <div className="camera-container">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="camera-video"
                  style={{ width: '100%', maxWidth: '400px', height: 'auto' }}
                />
              </div>

              <div className="qr-scanner-info">
                <p>QR kodu kamera görüş alanına getirin</p>
                <div className="scanning-indicator">
                  {isScanning && <div className="scanning-line"></div>}
                </div>
              </div>

              <div className="qr-scanner-actions">
                <button onClick={handleManualInput} className="btn btn-secondary">
                  ⌨️ Manuel Giriş
                </button>
              </div>

              {/* Test butonları - geliştirme amaçlı */}
              <div className="qr-test-buttons">
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                  Test için örnek QR kodları:
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {['TABLE001', 'TABLE002', 'TABLE003', 'TABLE004', 'TABLE005'].map(code => (
                    <button
                      key={code}
                      onClick={() => handleTestScan(code)}
                      className="btn btn-test"
                      style={{
                        fontSize: '12px',
                        padding: '6px 12px',
                        background: '#e9ecef',
                        color: '#495057',
                        border: '1px solid #ced4da'
                      }}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {hasPermission === null && (
            <div className="qr-scanner-loading">
              <div className="loading-spinner"></div>
              <p>Kamera erişimi isteniyor...</p>
              <div style={{ marginTop: '20px' }}>
                <button onClick={handleManualInput} className="btn btn-secondary">
                  ⌨️ Manuel Giriş
                </button>
              </div>
              <div className="qr-test-buttons" style={{ marginTop: '20px' }}>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                  Veya test QR kodlarını kullanın:
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {['TABLE001', 'TABLE002', 'TABLE003', 'TABLE004', 'TABLE005'].map(code => (
                    <button
                      key={code}
                      onClick={() => handleTestScan(code)}
                      className="btn btn-test"
                      style={{
                        fontSize: '12px',
                        padding: '6px 12px',
                        background: '#e9ecef',
                        color: '#495057',
                        border: '1px solid #ced4da'
                      }}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner; 