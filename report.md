# Project Context Report

## Project Identity
- **What it does**: A QR code-based digital menu solution for restaurants. It allows customers to access the menu by scanning a QR code, and restaurant owners to manage their menus, categories, and products. The system also provides user management and basic statistics.
- **Technologies**:
  - **Backend**: C#, .NET 8, ASP.NET Core Web API, Entity Framework Core, MediatR (for CQRS pattern), AutoMapper, FluentValidation, JWT (JSON Web Token) for authentication.
  - **Frontend**: TypeScript, React, Axios (for API requests), React Router (for page routing).
  - **Database**: Microsoft SQL Server.
- **Architectural Approach**: **Clean Architecture** (or Onion Architecture). The project is divided into four main layers: `Domain`, `Application`, `Infrastructure`, and `API` (Presentation). This structure ensures that dependencies flow from the outside (e.g., API) to the center (Domain).

## Code Structure and Organization
- **Directory structure**:
  - `backend/`: Contains the .NET solution and its layered architecture.
    - `QRMenu.API`: The ASP.NET Core Web API project. It includes controllers, middleware, and startup configurations.
    - `QRMenu.Application`: Contains the application's business logic. CQRS (Commands/Queries), DTOs, validation rules, and interfaces for services that communicate with the outside world are defined here.
    - `QRMenu.Domain`: The core of the project. It contains the Entities corresponding to database tables and domain-specific exceptions.
    - `QRMenu.Infrastructure`: Hosts the concrete implementations of interfaces from the `Application` layer. Infrastructural code like database access (Entity Framework Core `DbContext`), JWT services, and file storage is located here.
  - `frontend/`: The React-based user interface project.
    - `src/components`: Reusable React components (e.g., `LoginPage`, `MenuPage`).
    - `src/services`: Code that manages communication with the backend API (especially `api.ts`).
    - `src/contexts`: React Contexts for global state management (e.g., `AuthContext`).
    - `src/types`: TypeScript type definitions (`index.ts`).
- **File naming**: In the backend, `PascalCase` is used in accordance with C# standards (e.g., `RestaurantsController.cs`). In the frontend, `PascalCase` is used for React components (e.g., `AdminPage.tsx`).
- **Code style**: The backend follows .NET platform standards with heavy use of Dependency Injection. The frontend uses modern React with functional components, hooks (useState, useEffect), and type safety provided by TypeScript.

## Core Components
- **Main modules**: `User`, `Restaurant`, `Menu`, `Category`, `MenuItem`, `Table`. For each of these modules, there are Command (write data) and Query (read data) operations under `Application/Features` in the backend.
- **Data models**:
  - Backend: C# classes (POCOs) in the `QRMenu.Domain/Entities` folder.
  - Frontend: TypeScript `interface`s in the `frontend/src/types/index.ts` file, corresponding to the backend models.
- **API/Interfaces**: The backend exposes a RESTful API to the outside world through classes in `QRMenu.API/Controllers`. The `services/api.ts` file in the frontend serves as a central point for making requests to this API.

## Business Logic
- **Main flows**:
  1.  **Registration/Login**: The restaurant owner logs into the system (`AuthController`) and receives a JWT-based token.
  2.  **Management**: The restaurant owner manages their restaurant information, menus (categories and products), and tables. These operations are performed through authorized endpoints.
  3.  **Customer Access**: The customer scans the QR code on the table with their phone. This QR code contains a URL that fetches the menu for the respective restaurant. The customer does not need to log in to view the menu.
- **Data processing**: When an HTTP request reaches the API layer:
  1.  The request is directed to the MediatR pipeline.
  2.  Incoming DTOs are validated by behaviors like `ValidationBehavior`.
  3.  The relevant Command or Query handler is triggered.
  4.  The handler performs database operations via `ApplicationDbContext`.
  5.  The result is mapped to a DTO using AutoMapper and returned to the API layer.
- **Dependencies**: The dependency rule is clear: `API` -> `Application` <- `Infrastructure`. The `Domain` layer is at the center and has no dependencies on any outer layer. All layers can depend on `Domain`.

## Configuration and Settings
- **Config files**: `backend/QRMenu.API/appsettings.json` and the environment-specific `appsettings.Development.json`. These files store sensitive and environment-dependent data such as the database connection string and JWT settings (Issuer, Audience, Secret Key).
- **Environment variables**: The `ASPNETCORE_ENVIRONMENT` variable determines which `appsettings` file to use (e.g., "Development" or "Production").
- **Constant values**: Undetermined, but constants for JWT claim types, roles, or specific configuration keys may exist within the code.

## Code Quality and Standards
- **Patterns used**: Clean Architecture, CQRS (Command Query Responsibility Segregation), Dependency Injection, Middleware (for error handling), Repository Pattern (implicitly via DbContext and DbSets), DTO (Data Transfer Object).
- **Error handling**: A middleware named `GlobalExceptionHandlerMiddleware` centrally manages unhandled exceptions across the entire application. This prevents code duplication and ensures a consistent error response format. Custom exception types like `NotFoundException` are also used.
- **Logging**: The standard ASP.NET Core logging infrastructure is used. The `ILogger` interface is injected into classes via Dependency Injection for logging.

## Guide to Making Changes
- **To add a new feature**:
  1.  **Domain**: Create a new entity class if necessary.
  2.  **Application**: Create a new folder for the feature under `Features`. Add `Commands`, `Queries`, `DTOs`, and `Validators` inside. Add the new `DbSet` to the `IApplicationDbContext` interface.
  3.  **Infrastructure**: Implement the `DbSet` for the new entity in `ApplicationDbContext` and configure it. Create a new database migration with `dotnet ef migrations add <MigrationName>`.
  4.  **API**: Create a `Controller` and the relevant `endpoint` methods to expose the new feature to the outside world.
  5.  **Frontend**: Add interfaces for new DTOs in `types`, add new API calls in `services/api.ts`, create new React components and pages to use this feature, and add the routing in `App.tsx`.
- **To modify an existing feature**: The files in the layer corresponding to the logical location of the change should be edited. For example, if the price calculation for a menu item changes, the relevant Query/Command handler in the `Application` layer should be modified. If it is only a visual change, the component in the `frontend` is edited.
- **Things to watch out for**:
  - **Migrations**: After any `Domain` or `Infrastructure` change that affects the database schema, an EF Core migration must be created and applied to the database.
  - **Clean Architecture Rules**: The dependency rules between layers must be strictly followed. For example, the `Application` layer should never directly reference a class from the `Infrastructure` layer; it must always communicate through interfaces.
  - **DTO and Mapping**: Never expose `Domain` entities directly from the API. Always return data by converting them to DTOs using `AutoMapper` or manual mapping.

## Project Rules
- **Standards to be followed**: The principles of Clean Architecture, the CQRS pattern, and RESTful API design rules must be strictly adhered to.
- **What should not be changed**: The core architectural structure of the project (layers), its main dependencies (MediatR, EF Core), and the central error handling mechanism should not be altered.
- **Flexible parts**: Adding new features, updating existing business logic in the `Application` layer, and UI/UX changes in the `frontend` are the flexible and extensible areas of the project.
