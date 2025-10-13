/**
 * Token Manager - Handles JWT token refresh and authentication
 */
class TokenManager {
  constructor() {
    this.refreshEndpoint = '/api/auth/refresh';
    this.isRefreshing = false;
    this.failedQueue = [];
  }

  /**
   * Get the current token from localStorage
   */
  getToken() {
    const role = this.getUserRole();
    if (!role) return null;
    
    return localStorage.getItem(`vendplug-${role}-token`);
  }

  /**
   * Get user role from localStorage
   */
  getUserRole() {
    // Check for admin token
    if (localStorage.getItem('vendplug-admin-token')) return 'admin';
    if (localStorage.getItem('vendplug-vendor-token')) return 'vendor';
    if (localStorage.getItem('vendplug-agent-token')) return 'agent';
    if (localStorage.getItem('vendplug-buyer-token')) return 'buyer';
    return null;
  }

  /**
   * Set token in localStorage
   */
  setToken(token, role) {
    localStorage.setItem(`vendplug-${role}-token`, token);
  }

  /**
   * Clear all tokens
   */
  clearTokens() {
    localStorage.removeItem('vendplug-admin-token');
    localStorage.removeItem('vendplug-vendor-token');
    localStorage.removeItem('vendplug-agent-token');
    localStorage.removeItem('vendplug-buyer-token');
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token) {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  /**
   * Refresh the current token
   */
  async refreshToken() {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const response = await fetch(this.refreshEndpoint, {
        method: 'POST',
        credentials: 'include', // Include cookies for refresh token
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      // Update token in localStorage
      const role = data.role || this.getUserRole();
      this.setToken(data.token, role);

      // Process failed queue
      this.processQueue(null, data.token);
      
      return data.token;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.processQueue(error, null);
      this.clearTokens();
      this.redirectToLogin();
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Process the failed request queue
   */
  processQueue(error, token = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  /**
   * Make an authenticated request with automatic token refresh
   */
  async authenticatedFetch(url, options = {}) {
    let token = this.getToken();
    
    // Check if token is expired
    if (this.isTokenExpired(token)) {
      try {
        token = await this.refreshToken();
      } catch (error) {
        console.error('Failed to refresh token:', error);
        this.redirectToLogin();
        return;
      }
    }

    // Add authorization header
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include' // Include cookies for refresh token
    });

    // If token expired during request, try to refresh and retry once
    if (response.status === 401 && !url.includes(this.refreshEndpoint)) {
      try {
        const newToken = await this.refreshToken();
        headers.Authorization = `Bearer ${newToken}`;
        
        return fetch(url, {
          ...options,
          headers,
          credentials: 'include'
        });
      } catch (error) {
        console.error('Failed to refresh token on 401:', error);
        this.redirectToLogin();
        return response;
      }
    }

    return response;
  }

  /**
   * Redirect to appropriate login page
   */
  redirectToLogin() {
    const role = this.getUserRole();
    
    // Clear tokens first
    this.clearTokens();
    
    // Redirect based on role
    switch (role) {
      case 'admin':
        window.location.href = '/admin-login.html';
        break;
      case 'vendor':
        window.location.href = '/vendor-login.html';
        break;
      case 'agent':
        window.location.href = '/agent-login.html';
        break;
      case 'buyer':
        window.location.href = '/buyer-login.html';
        break;
      default:
        window.location.href = '/';
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
      this.redirectToLogin();
    }
  }
}

// Create global instance
window.tokenManager = new TokenManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TokenManager;
}
