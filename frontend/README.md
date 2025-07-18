# QR Menu System - Frontend

This project is the frontend for the QR Menu System, built with React and TypeScript.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (which includes npm) version 18.x or higher.
- A running instance of the [backend API](../backend/README.md).

### 1. Configure the API Endpoint

1.  Open `src/services/api.ts`.
2.  Ensure the `baseURL` constant points to the correct address of your running backend API. By default, it is set to `http://localhost:5092`.

    ```typescript
    const apiClient = axios.create({
      baseURL: 'http://localhost:5092/api',
    });
    ```

### 2. Install Dependencies

1.  Open a terminal in the `frontend` directory.
2.  Run the following command to install the necessary packages:
    ```sh
    npm install
    ```

### 3. Run the Application

1.  After the installation is complete, run the development server:
    ```sh
    npm start
    ```
2.  The application will open automatically in your default web browser at `http://localhost:3000`.

## 🏗️ Project Structure

The project is structured to separate concerns and make development scalable.

-   **`src/components`**: Contains reusable React components like `LoginPage.tsx`, `MenuPage.tsx`, etc.
-   **`src/contexts`**: Holds React Context providers for managing global state, such as `AuthContext.tsx` for authentication.
-   **`src/services`**: Manages communication with the backend API. `api.ts` centralizes the Axios configuration.
-   **`src/types`**: Contains TypeScript type definitions (`index.ts`) that correspond to the DTOs used by the backend API.
-   **`src/App.tsx`**: The main component that sets up the application's routing using `react-router-dom`.
