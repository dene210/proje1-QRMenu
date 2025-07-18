import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MenuPage from './components/MenuPage';
import AdminPage from './components/AdminPage';
import RestaurantPage from './components/RestaurantPage';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Restaurant slug ile menü erişimi (public) */}
            <Route path="/:restaurantSlug/:qrCode" element={<MenuPage />} />
            
            {/* Protected Routes */}
            
            {/* SuperAdmin Routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute requireSuperAdmin>
                  <RestaurantPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/restaurants" 
              element={
                <ProtectedRoute requireSuperAdmin>
                  <RestaurantPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin Routes (Restaurant specific) */}
            <Route 
              path="/admin/:restaurantSlug" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Eski URL'ler için fallback (backward compatibility) */}
            <Route 
              path="/menu" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPage />
                </ProtectedRoute>
              } 
            />
            <Route path="/qr/:qrCode" element={<MenuPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App; 