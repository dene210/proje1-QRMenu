# QR Menu System - Backend

This project contains the backend API for the QR Menu System, built with .NET 8, Clean Architecture, and CQRS.

## 🚀 Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- SQL Server (e.g., SQL Server Express, Docker container, etc.)

### 1. Configure the Database

1.  Open `QRMenu.API/appsettings.json`.
2.  Verify that the `DefaultConnection` connection string points to your SQL Server instance. 


## 🏛️ Architecture

The project follows the principles of **Clean Architecture**.

-   **QRMenu.Domain:** Contains all entities, enums, and custom exceptions. It has no dependencies on other layers.
-   **QRMenu.Application:** Contains all application logic, including CQRS commands/queries (MediatR), DTOs, validation (FluentValidation), and interfaces for infrastructure services.
-   **QRMenu.Infrastructure:** Contains data access logic (Entity Framework Core), implementations for external services (like `FileStorageService`), and data seeding.
-   **QRMenu.API:** The presentation layer. It exposes the RESTful API endpoints and is responsible for handling HTTP requests and responses. It depends on `Application` and `Infrastructure` for dependency injection and startup configuration. 