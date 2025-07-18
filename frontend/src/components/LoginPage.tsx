import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(usernameOrEmail, password, rememberMe);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Giriş yapılamadı');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left Side - Branding */}
        <div className="login-brand-side">
          <div className="brand-content">
            <div className="brand-logo">
              <div className="logo-icon">🍽️</div>
              <h1 className="brand-title">QR Menü</h1>
            </div>
            <h2 className="brand-subtitle">Restoran Yönetim Sistemi</h2>
            <p className="brand-description">
              Modern QR kod teknolojisi ile restoranınızı dijital çağa taşıyın. 
              Menü yönetimi, sipariş takibi ve analitik raporlama tek platformda.
            </p>
            <div className="brand-features">
              <div className="feature-item">
                <span className="feature-icon">📱</span>
                <span>QR Kod Menü</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span>Analitik Raporlar</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⚡</span>
                <span>Hızlı Yönetim</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-side">
          <div className="form-content">
            <div className="form-header">
              <h3 className="form-title">Admin Paneli</h3>
              <p className="form-subtitle">Hesabınıza giriş yapın</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="input-group">
                <label htmlFor="usernameOrEmail" className="input-label">
                  Kullanıcı Adı veya E-posta
                </label>
                <input
                  id="usernameOrEmail"
                  name="usernameOrEmail"
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="form-input"
                  placeholder="admin@example.com"
                />
              </div>

              <div className="input-group">
                <label htmlFor="password" className="input-label">
                  Şifre
                </label>
                <div className="password-wrapper">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="checkbox-input"
                  />
                  <span className="checkbox-label">Beni hatırla</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="submit-button"
              >
                {isLoading ? (
                  <div className="loading-content">
                    <div className="loading-spinner"></div>
                    <span>Giriş yapılıyor...</span>
                  </div>
                ) : (
                  'Giriş Yap'
                )}
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="demo-section">
              <h4 className="demo-title">Demo Hesapları</h4>
              <div className="demo-list">
                <div className="demo-item">
                  <span className="demo-role">SuperAdmin</span>
                  <span className="demo-credentials">superadmin / QRMenu2024!</span>
                </div>
                <div className="demo-item">
                  <span className="demo-role">Lezzet Sarayı</span>
                  <span className="demo-credentials">lezzet-admin / LezzetAdmin123!</span>
                </div>
                <div className="demo-item">
                  <span className="demo-role">Denizden Gelen</span>
                  <span className="demo-credentials">deniz-admin / DenizAdmin123!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 