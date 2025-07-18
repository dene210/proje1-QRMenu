import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { restaurantService, userService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Restaurant, UserDto } from '../types';

const RestaurantPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    address: '',
    phone: '',
    email: '',
    isActive: true
  });
  const [adminUserData, setAdminUserData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  // Düzenleme modalı için yeni state'ler
  const [restaurantUsers, setRestaurantUsers] = useState<UserDto[]>([]);
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserData, setEditUserData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [editUserError, setEditUserError] = useState<string | null>(null);

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await restaurantService.getAllForAdmin();
      setRestaurants(data);
    } catch (err: any) {
      const errorMessage = err.userFriendlyMessage || err.message || 'Bir hata oluştu';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadRestaurantUsers = async (restaurantId: number) => {
    try {
      const users = await restaurantService.getRestaurantUsers(restaurantId);
      setRestaurantUsers(users);
    } catch (err: any) {
      console.error('Restaurant kullanıcıları yüklenirken hata:', err);
      setError('Restaurant kullanıcıları yüklenirken hata oluştu: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setModalError(null);
      setError(null);
      
      // Yeni restoran ekleme için admin kullanıcı bilgilerini kontrol et
      if (!editingRestaurant) {
        if (!adminUserData.username || !adminUserData.email || !adminUserData.password || !adminUserData.confirmPassword) {
          throw new Error('Admin kullanıcı bilgileri zorunludur.');
        }
        
        if (adminUserData.password !== adminUserData.confirmPassword) {
          throw new Error('Admin şifreleri eşleşmiyor.');
        }
        
        if (adminUserData.password.length < 8) {
          throw new Error('Admin şifresi en az 8 karakter olmalıdır.');
        }
      }
      
      if (editingRestaurant) {
        // Güncelleme
        await restaurantService.update(editingRestaurant.id, formData);
      } else {
        // Yeni ekleme - restaurant ve admin kullanıcısını birlikte oluştur
        await restaurantService.create({
          name: formData.name,
          slug: formData.slug,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          adminUsername: adminUserData.username,
          adminEmail: adminUserData.email,
          adminPassword: adminUserData.password,
          adminConfirmPassword: adminUserData.confirmPassword,
          isActive: formData.isActive
        });
      }
      
      // Form'u temizle ve modal'ı kapat
      setFormData({
        name: '',
        slug: '',
        address: '',
        phone: '',
        email: '',
        isActive: true
      });
      setAdminUserData({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      setShowAddModal(false);
      setEditingRestaurant(null);
      setModalError(null);
      
      // Listeyi yenile
      await loadRestaurants();
    } catch (err: any) {
      const errorMessage = err.userFriendlyMessage || err.message || 'Bir hata oluştu';
      setModalError(errorMessage);
    }
  };

  const handleEdit = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setFormData({
      name: restaurant.name,
      slug: restaurant.slug,
      address: restaurant.address,
      phone: restaurant.phone,
      email: restaurant.email,
      isActive: restaurant.isActive
    });
    
    // Restaurant kullanıcılarını yükle
    loadRestaurantUsers(restaurant.id);
    
    setShowAddModal(true);
  };

  const handleDelete = async (restaurant: Restaurant) => {
    if (window.confirm(`"${restaurant.name}" restoranını silmek istediğinizden emin misiniz?`)) {
      try {
        await restaurantService.delete(restaurant.id);
        await loadRestaurants();
      } catch (err: any) {
        const errorMessage = err.userFriendlyMessage || err.message || 'Restoran silinirken hata oluştu';
        setError(errorMessage);
      }
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '')
      .replace(/\s+/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: editingRestaurant ? prev.slug : generateSlug(name)
    }));
  };

  const goToAdmin = (slug: string) => {
    navigate(`/admin/${slug}`);
  };

  const goToMenu = (slug: string) => {
    // Örnek QR kod ile menüye git
    navigate(`/${slug}/TABLE001`);
  };

  const handleEditUser = (user: UserDto) => {
    setEditingUser(user);
    setEditUserData({
      username: user.username,
      email: user.email,
      password: '',
      confirmPassword: ''
    });
    setEditUserError(null);
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setEditUserError(null);
      setError(null);
      // Şifre kontrolü
      if (editUserData.password && editUserData.password !== editUserData.confirmPassword) {
        throw new Error('Şifreler eşleşmiyor');
      }
      await userService.updateUser(editingUser.id, {
        username: editUserData.username,
        email: editUserData.email,
        password: editUserData.password || undefined,
        confirmPassword: editUserData.confirmPassword || undefined,
        restaurantId: editingUser.restaurantId,
        isAdmin: editingUser.isAdmin,
        isSuperAdmin: editingUser.isSuperAdmin
      });
      // Modal'ı kapat ve kullanıcıları yenile
      setShowEditUserModal(false);
      setEditingUser(null);
      setEditUserData({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      setEditUserError(null);
      if (editingRestaurant) {
        await loadRestaurantUsers(editingRestaurant.id);
      }
    } catch (err: any) {
      const errorMessage = err.userFriendlyMessage || err.message || 'Kullanıcı güncellenirken hata oluştu';
      setEditUserError(errorMessage);
    }
  };

  const handleDeleteUser = async (user: UserDto) => {
    if (!window.confirm(`"${user.username}" kullanıcısını silmek istediğinizden emin misiniz?`)) return;
    
    try {
      await userService.deleteUser(user.id);
      
      if (editingRestaurant) {
        await loadRestaurantUsers(editingRestaurant.id);
      }
      
    } catch (err: any) {
      const errorMessage = err.userFriendlyMessage || err.message || 'Kullanıcı silinirken hata oluştu';
      setError(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Restoranlar yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="restaurant-page">
      {/* Header */}
      <div className="restaurant-header">
        <div className="restaurant-header-content">
          <div>
            <h1>🏢 Restoran Yönetimi</h1>
            <p>Restoranlarınızı yönetin ve admin panellerine erişin</p>
          </div>
          
          <div className="header-actions">
            {/* User Info */}
            <div className="user-info">
              <span className="user-greeting">
                Merhaba, <strong>{user?.username}</strong>
              </span>
              {user?.isSuperAdmin && (
                <span className="user-badge superadmin">SuperAdmin</span>
              )}
              {user?.isAdmin && !user?.isSuperAdmin && (
                <span className="user-badge admin">Admin</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="header-buttons">
              <button
                onClick={() => {
                  setEditingRestaurant(null);
                  setFormData({
                    name: '',
                    slug: '',
                    address: '',
                    phone: '',
                    email: '',
                    isActive: true
                  });
                  setAdminUserData({
                    username: '',
                    email: '',
                    password: '',
                    confirmPassword: ''
                  });
                  setShowAddModal(true);
                }}
                className="btn btn-primary"
              >
                <span>➕</span>
                Yeni Restoran
              </button>
              
              <button
                onClick={logout}
                className="btn btn-secondary"
              >
                <span>🚪</span>
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="restaurant-content">
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {/* Restaurant Grid */}
        <div className="restaurant-grid">
          {restaurants.map((restaurant) => (
            <div key={restaurant.id} className={`restaurant-card ${!restaurant.isActive ? 'restaurant-card-inactive' : ''}`}>
              <div className="restaurant-card-content">
                <div className="restaurant-card-header">
                  <div>
                    <h3>{restaurant.name}</h3>
                    <p>/{restaurant.slug}</p>
                  </div>
                  <span className={`restaurant-card-status ${
                    restaurant.isActive ? 'status-active' : 'status-passive'
                  }`}>
                    {restaurant.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>

                <div className="restaurant-card-details">
                  <p>
                    <span>📍</span> {restaurant.address}
                  </p>
                  <p>
                    <span>📞</span> {restaurant.phone}
                  </p>
                  <p>
                    <span>✉️</span> {restaurant.email}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="restaurant-card-actions">
                  <button
                    onClick={() => goToAdmin(restaurant.slug)}
                    className="btn btn-primary"
                  >
                    <span>⚙️</span>
                    Admin Paneli
                  </button>
                  
                  <button
                    onClick={() => goToMenu(restaurant.slug)}
                    className="btn btn-success"
                  >
                    <span>📱</span>
                    Menüyü Görüntüle
                  </button>

                  <div className="btn-group">
                    <button
                      onClick={() => handleEdit(restaurant)}
                      className="btn btn-warning"
                    >
                      <span>✏️</span>
                      Düzenle
                    </button>
                    
                    <button
                      onClick={() => handleDelete(restaurant)}
                      className="btn btn-danger"
                    >
                      <span>🗑️</span>
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="restaurant-modal-overlay" onClick={() => { setShowAddModal(false); setModalError(null); }}>
          <div className="restaurant-modal" onClick={(e) => e.stopPropagation()}>
            <div className="restaurant-modal-header">
              <h2>{editingRestaurant ? 'Restoranı Düzenle' : 'Yeni Restoran Ekle'}</h2>
              <button onClick={() => { setShowAddModal(false); setModalError(null); }} className="btn-close">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="restaurant-modal-form">
              <div className="form-group">
                <label>Restoran Adı *</label>
                <input
                  type="text"
                  placeholder="Lezzet Durağı"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>URL (Slug)</label>
                <input
                  type="text"
                  placeholder="lezzet-duragi"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  readOnly={!!editingRestaurant}
                  style={{ opacity: editingRestaurant ? 0.7 : 1 }}
                  required
                />
              </div>

              <div className="form-group">
                <label>Adres</label>
                <input
                  type="text"
                  placeholder="Atatürk Caddesi No:123, Ankara"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Telefon</label>
                <input
                  type="text"
                  placeholder="+90 312 123 45 67"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              
              <div className="form-group">
                <label>E-posta</label>
                <input
                  type="email"
                  placeholder="info@lezzetduragi.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              {/* Aktif/Pasif seçeneği (her iki mod için) */}
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                />
                <label htmlFor="isActive">Aktif</label>
              </div>

              {/* Admin User Fields - Only for new restaurants */}
              {!editingRestaurant && (
                <>
                  <div className="form-section-divider">
                    <h3>Admin Kullanıcısı</h3>
                    <p>Bu restoran için yönetici hesabı oluşturun</p>
                  </div>

                  <div className="form-group">
                    <label>Admin Kullanıcı Adı *</label>
                    <input
                      type="text"
                      placeholder="lezzet-admin"
                      value={adminUserData.username}
                      onChange={(e) => setAdminUserData(prev => ({ ...prev, username: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Admin E-posta *</label>
                    <input
                      type="email"
                      placeholder="admin@lezzetduragi.com"
                      value={adminUserData.email}
                      onChange={(e) => setAdminUserData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Admin Şifre *</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={adminUserData.password}
                      onChange={(e) => setAdminUserData(prev => ({ ...prev, password: e.target.value }))}
                      required
                      minLength={8}
                    />
                    <small className="form-hint">En az 8 karakter olmalıdır</small>
                  </div>

                  <div className="form-group">
                    <label>Şifre Tekrar *</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={adminUserData.confirmPassword}
                      onChange={(e) => setAdminUserData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>
                </>
              )}

              {/* Admin Users List - Only for editing restaurants */}
              {editingRestaurant && (
                <>
                  <div className="form-section-divider">
                    <h3>Admin Kullanıcıları</h3>
                    <p>Bu restorana bağlı yönetici kullanıcıları</p>
                  </div>

                  <div className="admin-users-list">
                    {restaurantUsers.length === 0 ? (
                      <p style={{ textAlign: 'center', color: '#6c757d', fontStyle: 'italic' }}>
                        Bu restoranda henüz admin kullanıcısı bulunmuyor.
                      </p>
                    ) : (
                      restaurantUsers.map((user) => (
                        <div key={user.id} className="admin-user-item">
                          <div className="admin-user-info">
                            <div className="admin-user-details">
                              <h4>{user.username}</h4>
                              <p>{user.email}</p>
                              <div className="admin-user-badges">
                                {user.isAdmin && <span className="user-badge admin">Admin</span>}
                                {user.isSuperAdmin && <span className="user-badge superadmin">SuperAdmin</span>}
                                {!user.isActive && <span className="user-badge inactive">Pasif</span>}
                              </div>
                            </div>
                          </div>
                          <div className="admin-user-actions">
                            <button
                              type="button"
                              onClick={() => handleEditUser(user)}
                              className="btn btn-sm btn-warning"
                            >
                              ✏️ Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              className="btn btn-sm btn-danger"
                            >
                              🗑️ Sil
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* Hata mesajı butonların hemen üstünde */}
              {modalError && (
                <div style={{ 
                  backgroundColor: '#f8d7da', 
                  color: '#721c24', 
                  padding: '12px', 
                  borderRadius: '4px', 
                  marginBottom: '16px',
                  border: '1px solid #f5c6cb'
                }}>
                  {modalError}
                </div>
              )}
              <div className="restaurant-modal-footer">
                <button type="button" onClick={() => { setShowAddModal(false); setModalError(null); }} className="btn btn-secondary">
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingRestaurant ? '💾 Güncelle' : '➕ Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Edit Modal */}
      {showEditUserModal && editingUser && (
        <div className="restaurant-modal-overlay" onClick={() => { setShowEditUserModal(false); setEditUserError(null); }}>
          <div className="restaurant-modal" onClick={(e) => e.stopPropagation()}>
            <div className="restaurant-modal-header">
              <h2>Kullanıcıyı Düzenle</h2>
              <button onClick={() => { setShowEditUserModal(false); setEditUserError(null); }} className="btn-close">✕</button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="restaurant-modal-form">
              <div className="form-group">
                <label>Kullanıcı Adı *</label>
                <input
                  type="text"
                  placeholder="kullanici-adi"
                  value={editUserData.username}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>E-posta *</label>
                <input
                  type="email"
                  placeholder="kullanici@email.com"
                  value={editUserData.email}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>Yeni Şifre</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={editUserData.password}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, password: e.target.value }))}
                />
                <small className="form-hint">Boş bırakırsanız şifre değiştirilmez</small>
              </div>

              <div className="form-group">
                <label>Şifre Tekrar</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={editUserData.confirmPassword}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <div style={{ marginBottom: '8px' }}>
                  <strong>Kullanıcı Bilgileri:</strong>
                </div>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                  <p>• Restoran: {editingUser.restaurantName}</p>
                  <p>• Admin: {editingUser.isAdmin ? 'Evet' : 'Hayır'}</p>
                  <p>• SuperAdmin: {editingUser.isSuperAdmin ? 'Evet' : 'Hayır'}</p>
                  <p>• Durum: {editingUser.isActive ? 'Aktif' : 'Pasif'}</p>
                </div>
              </div>

              {editUserError && (
                <div style={{ 
                  backgroundColor: '#f8d7da', 
                  color: '#721c24', 
                  padding: '12px', 
                  borderRadius: '4px', 
                  marginBottom: '16px',
                  border: '1px solid #f5c6cb'
                }}>
                  {editUserError}
                </div>
              )}

              <div className="restaurant-modal-footer">
                <button type="button" onClick={() => { setShowEditUserModal(false); setEditUserError(null); }} className="btn btn-secondary">
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  💾 Kullanıcıyı Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantPage; 