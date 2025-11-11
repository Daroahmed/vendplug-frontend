console.log("✅ notifications.js loaded");

const BACKEND = window.BACKEND_URL || "";

class NotificationManager {
  constructor() {
    this.socket = io(window.SOCKET_URL || window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true
    });
    this.notifications = [];
    this.unreadCount = 0;
    this.setupSocketListeners();
    this.setupUIElements();
  }

  setupSocketListeners() {
    // Connect to socket
    this.socket.on('connect', () => {
      console.log('✅ Connected to notification system');
      
      // Register for notifications based on user type and ID
      const userData = this.getCurrentUserData();
      if (userData) {
        this.socket.emit('register', userData.id);
      }
    });

    // Listen for new notifications
    this.socket.on('new-notification', (notification) => {
      // Only process notifications for the current user (strict match by ID)
      const currentUser = this.getCurrentUserData();
      const nid = notification.userId || notification.recipientId;
      const matchesId = currentUser && nid && String(nid) === String(currentUser.id);

      if (matchesId) {
        // De-dup if already present (can happen if also loaded via GET or pending replays)
        if (this.notifications.find(n => String(n._id) === String(notification._id))) {
          return;
        }
        this.notifications.unshift(notification);
        this.unreadCount++;
        this.updateUI();
        this.showToast(notification);
      }
    });

    // Handle connection errors
    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });
  }

  setupUIElements() {
    // Try to find header actions container (different for different pages)
    const headerActions = document.querySelector('.header-actions') || document.querySelector('.user-menu');
    console.log('🔍 Looking for header container:', headerActions);
    console.log('🔍 Notification icon already exists:', document.getElementById('notification-icon'));
    
    if (headerActions && !document.getElementById('notification-icon')) {
      // Create notification icon
      const notificationIcon = document.createElement('a');
      notificationIcon.href = '#';
      notificationIcon.className = 'notification-icon';
      notificationIcon.id = 'notification-icon';
      notificationIcon.setAttribute('aria-label', 'Notifications');
      notificationIcon.title = 'Notifications';
      notificationIcon.innerHTML = `
        <span class="bell-icon" aria-hidden="true" style="display:inline-flex;align-items:center;justify-content:center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M12 2C10.343 2 9 3.343 9 5V5.29C6.718 6.15 5 8.39 5 11V16L3 18V19H21V18L19 16V11C19 8.39 17.282 6.15 15 5.29V5C15 3.343 13.657 2 12 2ZM12 22C13.657 22 15 20.657 15 19H9C9 20.657 10.343 22 12 22Z"/>
          </svg>
        </span>
        <span class="notification-badge" id="notification-badge">0</span>
      `;
      // Ensure it sits above other header elements
      notificationIcon.style.position = 'relative';
      notificationIcon.style.zIndex = '1002';
      
      // Insert before the closing div of header-actions
      headerActions.appendChild(notificationIcon);
      
      console.log('✅ Notification icon injected successfully');
      console.log('🔍 Header actions now contains:', headerActions.innerHTML);

      // If the icon ends up not visible (width/height 0 or offscreen), add a floating fallback
      setTimeout(() => {
        const rect = notificationIcon.getBoundingClientRect();
        const notVisible = rect.width < 10 || rect.height < 10 || rect.right < 0 || rect.bottom < 0 || rect.left > window.innerWidth;
        if (notVisible && !document.getElementById('notification-fab')) {
          const fab = document.createElement('button');
          fab.id = 'notification-fab';
          fab.setAttribute('aria-label', 'Notifications');
          fab.title = 'Notifications';
          fab.style.position = 'fixed';
          fab.style.top = '16px';
          fab.style.right = '16px';
          fab.style.width = '44px';
          fab.style.height = '44px';
          fab.style.borderRadius = '50%';
          fab.style.border = 'none';
          fab.style.background = '#2c3e50';
          fab.style.color = '#fff';
          fab.style.display = 'flex';
          fab.style.alignItems = 'center';
          fab.style.justifyContent = 'center';
          fab.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
          fab.style.cursor = 'pointer';
          fab.style.zIndex = '1100';
          fab.innerHTML = `
            <span class="bell-icon" aria-hidden="true" style="display:inline-flex;align-items:center;justify-content:center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 2C10.343 2 9 3.343 9 5V5.29C6.718 6.15 5 8.39 5 11V16L3 18V19H21V18L19 16V11C19 8.39 17.282 6.15 15 5.29V5C15 3.343 13.657 2 12 2ZM12 22C13.657 22 15 20.657 15 19H9C9 20.657 10.343 22 12 22Z"/>
              </svg>
            </span>
            <span id="notification-badge-fab" style="position:absolute; top:8px; right:8px; background:#ff4444; color:#fff; font-size:12px; font-weight:700; min-width:18px; height:18px; line-height:18px; border-radius:9px; display:none; padding:0 4px; text-align:center;">0</span>
          `;
          document.body.appendChild(fab);

          // Hook up same toggle behavior
          const dropdown = document.getElementById('notification-dropdown');
          if (dropdown) {
            fab.addEventListener('click', () => {
              dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            });
          }
        }
      }, 50);
    } else {
      console.log('❌ Cannot inject notification icon - headerActions:', !!headerActions, 'icon exists:', !!document.getElementById('notification-icon'));
    }

    // Create notification dropdown if it doesn't exist
    if (!document.getElementById('notification-dropdown')) {
      const dropdown = document.createElement('div');
      dropdown.id = 'notification-dropdown';
      dropdown.className = 'notification-dropdown';
      dropdown.innerHTML = `
        <div class="notification-header">
          <h3>Notifications</h3>
          <div class="notification-header-actions">
            <button id="mark-all-read">Mark all as read</button>
            <button id="close-notifications" class="close-btn" aria-label="Close notifications">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        <div class="notification-list" id="notification-list"></div>
      `;
      document.body.appendChild(dropdown);

      // Add styles for notification dropdown only
      const styles = document.createElement('style');
      styles.textContent = `
        .notification-dropdown {
          position: fixed;
          top: 60px;
          right: 20px;
          width: 350px;
          max-height: 400px;
          background: var(--bg-card, #1e1e1e);
          border: 1px solid var(--bg-secondary, #2c2c2c);
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          z-index: 1000;
          display: none;
          overflow: hidden;
        }

        .notification-header {
          padding: 1rem;
          border-bottom: 1px solid var(--bg-secondary, #2c2c2c);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .notification-header h3 {
          margin: 0;
          color: var(--text-light, #fff);
          font-size: 1.1rem;
        }

        .notification-header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        #mark-all-read {
          background: var(--primary, #00cc99);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }

        #mark-all-read:hover {
          opacity: 0.9;
        }

        .close-btn {
          background: transparent;
          color: var(--text-light, #fff);
          border: none;
          padding: 0.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          transition: background-color 0.2s, opacity 0.2s;
        }

        .close-btn:hover {
          background-color: rgba(255, 255, 255, 0.1);
          opacity: 0.8;
        }

        .close-btn:active {
          opacity: 0.6;
        }

        @media (max-width: 768px) {
          .close-btn {
            width: 36px;
            height: 36px;
            font-size: 1.3rem;
          }
        }

        .notification-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .notification-item {
          padding: 1rem;
          border-bottom: 1px solid var(--bg-secondary, #2c2c2c);
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .notification-item:hover {
          background-color: var(--bg-secondary, #2c2c2c);
        }

        .notification-item.unread {
          background-color: rgba(0, 204, 153, 0.1);
        }

        .notification-title {
          font-weight: bold;
          color: var(--text-light, #fff);
          margin-bottom: 0.25rem;
        }

        .notification-message {
          color: var(--muted, #aaa);
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }

        .notification-time {
          color: var(--muted, #aaa);
          font-size: 0.8rem;
        }

        .notification-toast {
          position: fixed;
          top: 20px;
          right: 20px;
          background: var(--primary, #00cc99);
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          z-index: 1001;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `;
      document.head.appendChild(styles);
    }

    // Add event listeners (outside the if block to avoid scope issues)
    const icon = document.getElementById('notification-icon');
    const dropdown = document.getElementById('notification-dropdown');
    const markAllRead = document.getElementById('mark-all-read');
    const closeBtn = document.getElementById('close-notifications');

    if (icon && dropdown && markAllRead) {
      icon.addEventListener('click', () => {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      });

      markAllRead.addEventListener('click', () => {
        this.markAllAsRead();
      });

      // Close button functionality
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.style.display = 'none';
        });
      }

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !icon.contains(e.target)) {
          dropdown.style.display = 'none';
        }
      });
    }
  }

  getCurrentUserData() {
    // Use smart auth utility to get current user
    const userData = getCurrentUser();
    const userType = getCurrentUserType();
    
    if (userData && userType) {
      // Handle different ID field names for different user types
      const userId = userData._id || userData.id;
      console.log(`✅ Found ${userType} user:`, userId);
      return {
        id: userId,
        role: userType
      };
    }
    
    console.log('❌ No user data found');
    return null;
  }

  async loadNotifications() {
    try {
      const userData = this.getCurrentUserData();
      if (!userData) return;

      // Get the correct token using smart auth utility
      const token = getAuthToken();
      
      if (!token) {
        console.log('❌ No token found for role:', userData.role);
        return;
      }
      
      console.log(`🔑 Using smart auth token for ${userData.role}`);

      const res = await fetch(`${BACKEND}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const text = await res.text().catch(()=>'');
        throw new Error(`Failed to load notifications (${res.status}) ${text}`);
      }

      const data = await res.json();
      this.notifications = data;
      this.unreadCount = data.filter(n => !n.read).length;
      this.updateUI();
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
      try { if (window.showToast) showToast('Failed to load notifications'); } catch(_) {}
    }
  }

  async markAsRead(notificationId) {
    try {
      const userData = this.getCurrentUserData();
      if (!userData) return;

      const token = getAuthToken();
      
      if (!token) {
        console.log('❌ No token found for role:', userData.role);
        return;
      }

      const res = await fetch(`${BACKEND}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to mark notification as read');

      // Update local state
      const notification = this.notifications.find(n => n._id === notificationId);
      if (notification && !notification.read) {
        notification.read = true;
        this.unreadCount--;
        this.updateUI();
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  }

  async markAllAsRead() {
    try {
      const userData = this.getCurrentUserData();
      if (!userData) return;

      const token = getAuthToken();
      
      if (!token) {
        console.log('❌ No token found for role:', userData.role);
        return;
      }

      const res = await fetch(`${BACKEND}/api/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to mark all notifications as read');

      // Update local state
      this.notifications.forEach(n => n.read = true);
      this.unreadCount = 0;
      this.updateUI();
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
    }
  }

  updateUI() {
    const badge = document.getElementById('notification-badge');
    const list = document.getElementById('notification-list');
    const fabBadge = document.getElementById('notification-badge-fab');
    const icon = document.getElementById('notification-icon');

    // Update badge if it exists
    if (badge) {
      if (this.unreadCount > 0) {
        badge.style.display = 'block';
        badge.textContent = this.unreadCount;
      } else {
        badge.style.display = 'none';
      }
    }

    // Update floating badge if present
    if (fabBadge) {
      if (this.unreadCount > 0) {
        fabBadge.style.display = 'inline-block';
        fabBadge.textContent = this.unreadCount;
      } else {
        fabBadge.style.display = 'none';
      }
    }

    // Accessible title with count
    if (icon) {
      icon.title = this.unreadCount > 0 ? `Notifications (${this.unreadCount} unread)` : 'Notifications';
      icon.setAttribute('aria-label', icon.title);
    }

    // Update list if it exists
    if (list) {
      list.innerHTML = this.notifications.length ? 
        this.notifications.map(n => this.renderNotification(n)).join('') :
        '<div class="notification-item">No notifications</div>';
    }
  }

  renderNotification(notification) {
    const time = new Date(notification.createdAt).toLocaleString();
    return `
      <div class="notification-item ${notification.read ? '' : 'unread'}" 
           onclick="notificationManager.markAsRead('${notification._id}')">
        <div class="notification-title">${notification.title}</div>
        <div class="notification-message">${notification.message}</div>
        <div class="notification-time">${time}</div>
      </div>
    `;
  }

  showToast(notification) {
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.textContent = notification.title;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// Initialize notification manager when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 DOM Content Loaded - Initializing notification manager');
  const notificationManager = new NotificationManager();
  
  // Load existing notifications
  notificationManager.loadNotifications();
  
  // Export for global use
  window.notificationManager = notificationManager;
  
  // Fallback: try again after a short delay if icon wasn't injected
  setTimeout(() => {
    if (!document.getElementById('notification-icon')) {
      console.log('🔄 Retrying notification icon injection...');
      notificationManager.setupUIElements();
    }
  }, 1000);
});
