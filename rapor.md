# Proje Context Raporu

## Proje Kimliği
- **Ne yapar**: Restoranlar için QR kod tabanlı dijital menü çözümü. Müşterilerin QR kodu okutarak menüye erişmesini, restoran sahiplerinin ise menülerini, kategorilerini ve ürünlerini yönetmesini sağlar. Sistem ayrıca kullanıcı yönetimi ve temel istatistikler sunar.
- **Teknolojiler**:
  - **Backend**: C#, .NET 8, ASP.NET Core Web API, Entity Framework Core, MediatR (CQRS pattern'i için), AutoMapper, FluentValidation, JWT (JSON Web Token) ile kimlik doğrulama.
  - **Frontend**: TypeScript, React, Axios (API istekleri için), React Router (sayfa yönlendirme için).
  - **Veritabanı**: Microsoft SQL Server.
- **Mimari Yaklaşım**: **Clean Architecture** Proje; `Domain`, `Application`, `Infrastructure` ve `API` (Presentation) olmak üzere dört ana katmana ayrılmıştır. Bu yapı, bağımlılıkların merkezden (Domain) dışa doğru olmasını sağlar.

## Kod Yapısı ve Organizasyon
- **Dizin yapısı**:
  - `backend/`: .NET çözümünü ve katmanlı mimariyi barındırır.
    - `QRMenu.API`: ASP.NET Core Web API projesi. Controller'lar, middleware'ler ve başlangıç konfigürasyonlarını içerir.
    - `QRMenu.Application`: Uygulamanın iş mantığını içerir. CQRS (Commands/Queries), DTO'lar, validasyon kuralları ve dış dünya ile iletişim kuracak servislerin arayüzleri (interface) burada tanımlanır.
    - `QRMenu.Domain`: Projenin çekirdeğidir. Veritabanı tablolarına karşılık gelen Varlıklar (Entities) ve domaine özgü istisnalar (exceptions) bulunur.
    - `QRMenu.Infrastructure`: `Application` katmanındaki arayüzlerin somut implementasyonlarını barındırır. Veritabanı erişimi (Entity Framework Core `DbContext`), JWT servisleri, dosya depolama gibi altyapısal kodlar buradadır.
  - `frontend/`: React tabanlı kullanıcı arayüzü projesidir.
    - `src/components`: Tekrar kullanılabilir React bileşenleri (örneğin, `LoginPage`, `MenuPage`).
    - `src/services`: Backend API'si ile iletişimi yöneten kodlar (özellikle `api.ts`).
    - `src/contexts`: Uygulama genelinde state yönetimi için React Context'leri (örneğin, `AuthContext`).
    - `src/types`: TypeScript tip tanımlamaları (`index.ts`).
- **Dosya isimlendirme**: Backend'de C# standartlarına uygun olarak `PascalCase` (örn: `RestaurantsController.cs`). Frontend'de React component'leri için `PascalCase` (örn: `AdminPage.tsx`).
- **Kod stili**: Backend'de .NET platformu standartları ve Dependency Injection yoğun kullanımı. Frontend'de fonksiyonel component'ler, hook'lar (useState, useEffect) ve TypeScript ile tip güvenliği sağlanmış modern React kullanımı.

## Temel Bileşenler
- **Ana modüller**: `User`, `Restaurant`, `Menu`, `Category`, `MenuItem`, `Table`. Bu modüllerin her biri için backend'de `Application/Features` altında Command (veri yazma) ve Query (veri okuma) operasyonları bulunur.
- **Veri modelleri**:
  - Backend: `QRMenu.Domain/Entities` klasöründeki C# sınıfları (POCOs).
  - Frontend: `frontend/src/types/index.ts` dosyasında backend'deki modellere karşılık gelen TypeScript `interface`'leri.
- **API/Interface'ler**: Backend, dış dünyaya `QRMenu.API/Controllers` içindeki sınıflar aracılığıyla bir RESTful API sunar. Frontend'deki `services/api.ts` dosyası, bu API'ye istek atmak için merkezi bir nokta görevi görür.

## İş Mantığı
- **Ana akışlar**:
  1.  **Kayıt/Giriş**: Restoran sahibi sisteme giriş yapar (`AuthController`). JWT tabanlı bir token alır.
  2.  **Yönetim**: Restoran sahibi, kendi restoran bilgilerini, menülerini (kategori ve ürünler) ve masalarını yönetir. Bu işlemler yetkilendirme gerektiren endpoint'ler üzerinden yapılır.
  3.  **Müşteri Erişimi**: Müşteri, masadaki QR kodu telefonuna okutur. Bu QR kod, ilgili restoranın menüsünü getiren bir URL içerir. Müşterinin menüyü görmesi için giriş yapması gerekmez.
- **Veri işleme**: Bir HTTP isteği API katmanına ulaştığında:
  1.  İstek, MediatR pipeline'ına yönlendirilir.
  2.  `ValidationBehavior` gibi davranışlar (behaviors) ile gelen DTO'lar doğrulanır.
  3.  İlgili Command veya Query handler'ı tetiklenir.
  4.  Handler, `ApplicationDbContext` üzerinden veritabanı işlemlerini gerçekleştirir.
  5.  Sonuç, AutoMapper kullanılarak bir DTO'ya maplenir ve API katmanına geri döndürülür.
- **Bağımlılıklar**: Bağımlılık kuralı nettir: `API` -> `Application` -> `Infrastructure`. `Domain` katmanı merkezdedir ve hiçbir dış katmana bağımlılığı yoktur. Tüm katmanlar `Domain`'e bağımlı olabilir.

## Konfigürasyon ve Ayarlar
- **Config dosyaları**: `backend/QRMenu.API/appsettings.json` ve geliştirme ortamına özel `appsettings.Development.json`. Bu dosyalar veritabanı bağlantı dizesi (Connection String), JWT ayarları (Issuer, Audience, Secret Key) gibi hassas ve ortama göre değişen verileri tutar.
- **Environment değişkenleri**: `ASPNETCORE_ENVIRONMENT` değişkeni, hangi `appsettings` dosyasının kullanılacağını belirler (örn: "Development" veya "Production").
- **Sabit değerler**: Belirlenemedi, ancak kod içinde JWT claim tipleri, roller veya belirli konfigürasyon anahtarları gibi sabitler bulunabilir.

## Kod Kalitesi ve Standartlar
- **Kullanılan pattern'ler**: Clean Architecture, CQRS (Command Query Responsibility Segregation), Dependency Injection, Middleware (Hata yönetimi için), Repository Pattern (DbContext ve DbSet'ler aracılığıyla dolaylı olarak), DTO (Data Transfer Object).
- **Hata yönetimi**: `GlobalExceptionHandlerMiddleware` adında bir middleware, tüm uygulama genelinde meydana gelen ve yakalanmayan istisnaları (exceptions) merkezi bir yerden yönetir. Bu, hem kod tekrarını önler hem de tutarlı bir hata yanıt formatı sağlar. `NotFoundException` gibi özel istisna türleri de kullanılır.
- **Logging**: Standart ASP.NET Core logging altyapısı kullanılır. `ILogger` arayüzü, Dependency Injection ile sınıflara enjekte edilerek loglama yapılır.

## Değişiklik Yapma Rehberi
- **Yeni özellik eklemek için**:
  1.  **Domain**: Gerekliyse yeni bir entity sınıfı oluştur.
  2.  **Application**: `Features` altında yeni özellik için bir klasör aç. İçine `Commands`, `Queries`, `DTOs` ve `Validators` ekle. `IApplicationDbContext` arayüzüne yeni `DbSet`'i ekle.
  3.  **Infrastructure**: `ApplicationDbContext` içinde yeni entity için `DbSet`'i implemente et ve konfigürasyonunu yap. `dotnet ef migrations add <MigrationName>` ile yeni bir veritabanı migration'ı oluştur.
  4.  **API**: Yeni özelliği dış dünyaya açmak için bir `Controller` ve ilgili `endpoint`'leri (metotları) oluştur.
  5.  **Frontend**: `types`'a yeni DTO'lar için interface ekle, `services/api.ts`'e yeni API çağrılarını ekle, bu özelliği kullanacak yeni React component'leri ve sayfaları oluştur, ve `App.tsx`'e routing'i ekle.
- **Mevcut özellik değiştirmek için**: Değişikliğin mantıksal konumu neresiyse o katmandaki dosyalar düzenlenmelidir. Örneğin, bir menü ürününün fiyat hesaplaması değişiyorsa, bu bir iş kuralı olduğu için `Application` katmanındaki ilgili Query/Command handler'ı düzenlenmelidir. Eğer sadece görüntüyle ilgili bir değişiklikse `frontend` tarafındaki component düzenlenir.
- **Dikkat edilmesi gerekenler**:
  - **Migration'lar**: Veritabanı şemasını etkileyen her `Domain` veya `Infrastructure` değişikliğinden sonra EF Core migration oluşturulmalı ve veritabanına uygulanmalıdır.
  - **Clean Architecture Kuralları**: Katmanlar arası bağımlılık kurallarına kesinlikle uyulmalıdır. Örneğin, `Application` katmanı asla `Infrastructure` katmanından bir sınıfa doğrudan referans vermemelidir; her zaman arayüzler üzerinden iletişim kurmalıdır.
  - **DTO ve Mapping**: API'den asla `Domain` entity'lerini doğrudan dışarıya sızdırma. Her zaman `AutoMapper` veya manuel mapping ile DTO'lara dönüştürerek veri döndür.

## Proje Kuralları
- **Uyulması gereken standartlar**: Clean Architecture prensipleri, CQRS pattern'i ve RESTful API tasarım kurallarına sıkı sıkıya bağlı kalınmalıdır.
- **Değiştirilmemesi gerekenler**: Projenin temel mimari yapısı (katmanlar), ana bağımlılıkları (MediatR, EF Core) ve merkezi hata yönetimi mekanizması gibi temel iskelet değiştirilmemelidir.
- **Esnek olan kısımlar**: Yeni özelliklerin eklenmesi, mevcut iş mantığının `Application` katmanında güncellenmesi ve `frontend`'deki UI/UX değişiklikleri projenin esnek ve geliştirilebilir alanlarıdır.
