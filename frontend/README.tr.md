# QR Menü Sistemi - Frontend

Bu proje, React ve TypeScript ile oluşturulmuş QR Menü Sistemi'nin frontend uygulamasıdır.

## 🚀 Başlarken

### Ön Gereksinimler

- [Node.js](https://nodejs.org/) (npm içerir) sürüm 18.x veya üstü.
- Çalışır durumda bir [backend API](../backend/README.md) örneği.

### 1. API Endpoint'ini Yapılandırın

1.  `src/services/api.ts` dosyasını açın.
2.  `baseURL` sabitinin, çalışan backend API'nizin doğru adresini gösterdiğinden emin olun. Varsayılan olarak `http://localhost:5092` olarak ayarlanmıştır.

    ```typescript
    const apiClient = axios.create({
      baseURL: 'http://localhost:5092/api',
    });
    ```

### 2. Bağımlılıkları Yükleyin

1.  `frontend` dizininde bir terminal açın.
2.  Gerekli paketleri yüklemek için aşağıdaki komutu çalıştırın:
    ```sh
    npm install
    ```

### 3. Uygulamayı Çalıştırın

1.  Yükleme tamamlandıktan sonra, geliştirme sunucusunu çalıştırın:
    ```sh
    npm start
    ```
2.  Uygulama, varsayılan web tarayıcınızda `http://localhost:3000` adresinde otomatik olarak açılacaktır.

## 🏗️ Proje Yapısı

Proje, sorumlulukları ayırmak ve geliştirmeyi ölçeklenebilir kılmak için yapılandırılmıştır.

-   **`src/components`**: `LoginPage.tsx`, `MenuPage.tsx` gibi yeniden kullanılabilir React bileşenlerini içerir.
-   **`src/contexts`**: Kimlik doğrulama için `AuthContext.tsx` gibi genel state'i yönetmek için React Context provider'larını tutar.
-   **`src/services`**: Backend API ile iletişimi yönetir. `api.ts` dosyası, Axios yapılandırmasını merkezileştirir.
-   **`src/types`**: Backend API tarafından kullanılan DTO'lara karşılık gelen TypeScript tip tanımlamalarını (`index.ts`) içerir.
-   **`src/App.tsx`**: `react-router-dom` kullanarak uygulamanın yönlendirmesini (routing) ayarlayan ana bileşendir.
