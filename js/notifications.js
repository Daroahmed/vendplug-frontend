console.log("✅ notifications.js loaded");

const BACKEND = window.BACKEND_URL || "";

class NotificationManager {
  constructor() {
    this.socket = io(BACKEND);
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
      this.notifications.unshift(notification);
      this.unreadCount++;
      this.updateUI();
      this.showToast(notification);
    });

    // Handle connection errors
    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });
  }

  setupUIElements() {
    // Create notification container if it doesn't exist
    if (!document.getElementById('notification-container')) {
      const container = document.createElement('div');
      container.id = 'notification-container';
      container.innerHTML = `
        <div class="notification-icon" id="notification-icon">
          <i class="fas fa-bell"></i>
          <span class="notification-badge" id="notification-badge">0</span>
        </div>
        <div class="notification-dropdown" id="notification-dropdown">
          <div class="notification-header">
            <h3>Notifications</h3>
            <button id="mark-all-read">Mark all as read</button>
          </div>
          <div class="notification-list" id="notification-list"></div>
        </div>
      `;
      document.body.appendChild(container);

      // Add styles
      const styles = document.createElement('style');
      styles.textContent = `
        #notification-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
        }

        .notification-icon {
          background: #00cc99;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
        }

        .notification-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: red;
          color: white;
          border-radius: 50%;
          padding: 2px 6px;
          font-size: 12px;
          display: none;
        }

        .notification-dropdown {
          position: absolute;
          top: 50px;
          right: 0;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          width: 300px;
          max-height: 400px;
          overflow-y: auto;
          display: none;
        }

        .notification-header {
          padding: 15px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .notification-header h3 {
          margin: 0;
          color: #333;
        }

        #mark-all-read {
          background: none;
          border: none;
          color: #00cc99;
          cursor: pointer;
        }

        .notification-list {
          padding: 0;
        }

        .notification-item {
          padding: 15px;
          border-bottom: 1px solid #eee;
          cursor: pointer;
        }

        .notification-item:hover {
          background: #f9f9f9;
        }

        .notification-item.unread {
          background: #f0f9ff;
        }

        .notification-title {
          font-weight: bold;
          color: #333;
          margin-bottom: 5px;
        }

        .notification-message {
          color: #666;
          font-size: 14px;
        }

        .notification-time {
          color: #999;
          font-size: 12px;
          margin-top: 5px;
        }

        .notification-toast {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #00cc99;
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          z-index: 1000;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `;
      document.head.appendChild(styles);

      // Add event listeners
      const icon = document.getElementById('notification-icon');
      const dropdown = document.getElementById('notification-dropdown');
      const markAllRead = document.getElementById('mark-all-read');

      icon.addEventListener('click', () => {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      });

      markAllRead.addEventListener('click', () => {
        this.markAllAsRead();
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
          dropdown.style.display = 'none';
        }
      });
    }
  }

  getCurrentUserData() {
    // Check for user data in localStorage based on role
    const roles = ['Buyer', 'Vendor', 'Agent'];
    for (const role of roles) {
      const userData = localStorage.getItem(`vendplug${role}`);
      if (userData) {
        const parsed = JSON.parse(userData);
        return {
          id: parsed._id,
          role: role.toLowerCase()
        };
      }
    }
    return null;
  }

  async loadNotifications() {
    try {
      const userData = this.getCurrentUserData();
      if (!userData) return;

      const token = localStorage.getItem('vendplug-token');
      const res = await fetch(`${BACKEND}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to load notifications');

      const data = await res.json();
      this.notifications = data;
      this.unreadCount = data.filter(n => !n.read).length;
      this.updateUI();
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
    }
  }

  async markAsRead(notificationId) {
    try {
      const token = localStorage.getItem('vendplug-token');
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
      const token = localStorage.getItem('vendplug-token');
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

    // Update badge
    if (this.unreadCount > 0) {
      badge.style.display = 'block';
      badge.textContent = this.unreadCount;
    } else {
      badge.style.display = 'none';
    }

    // Update list
    list.innerHTML = this.notifications.length ? 
      this.notifications.map(n => this.renderNotification(n)).join('') :
      '<div class="notification-item">No notifications</div>';
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

// Initialize notification manager
const notificationManager = new NotificationManager();

// Load existing notifications
notificationManager.loadNotifications();

// Export for global use
window.notificationManager = notificationManager;
