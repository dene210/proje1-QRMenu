# QR Menü Sistemi - Backend

Bu proje, .NET 8, Clean Architecture ve CQRS ile oluşturulmuş QR Menü Sistemi'nin backend API'sini içerir.

## 🚀 Başlarken

### Ön Gereksinimler

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- SQL Server (örneğin, SQL Server Express, Docker container, vb.)

### 1. Veritabanını Yapılandırın

1.  `QRMenu.API/appsettings.json` dosyasını açın.
2.  `DefaultConnection` bağlantı dizesinin SQL Server örneğinize işaret ettiğinden emin olun. 

## 🏛️ Mimari

Proje, **Clean Architecture** prensiplerini takip eder.

-   **QRMenu.Domain:** Tüm varlıkları (entities), enum'ları ve özel istisnaları (custom exceptions) içerir. Diğer katmanlara bağımlılığı yoktur.
-   **QRMenu.Application:** CQRS komutları/sorguları (MediatR), DTO'lar, doğrulama (FluentValidation) ve altyapı servisleri için arayüzler (interfaces) dahil olmak üzere tüm uygulama mantığını içerir.
-   **QRMenu.Infrastructure:** Veri erişim mantığını (Entity Framework Core), harici servislerin implementasyonlarını (örneğin, `FileStorageService`) ve başlangıç verilerini (data seeding) içerir.
-   **QRMenu.API:** Sunum katmanıdır (presentation layer). RESTful API endpoint'lerini sunar ve HTTP isteklerini ve yanıtlarını işlemekten sorumludur. Bağımlılıkların enjeksiyonu (dependency injection) ve başlangıç yapılandırması için `Application` ve `Infrastructure` katmanlarına bağımlıdır.
