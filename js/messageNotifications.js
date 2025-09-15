console.log("✅ messageNotifications.js loaded");

class MessageNotificationManager {
  constructor() {
    this.socket = io(window.BACKEND_URL || "");
    this.unreadCount = 0;
    this.setupSocketListeners();
    this.setupUIElements();
    this.loadUnreadCount();
  }

  setupSocketListeners() {
    // Connect to socket
    this.socket.on('connect', () => {
      console.log('✅ Connected to message notification system');
      
      // Register for notifications based on user type and ID
      const userData = this.getCurrentUserData();
      if (userData) {
        this.socket.emit('register', userData.id);
      }
    });

    // Listen for new messages
    this.socket.on('new_message', (data) => {
      console.log('📨 New message received:', data);
      this.unreadCount++;
      this.updateMessageBadge();
      this.showMessageToast(data.message);
    });

    // Handle connection errors
    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });
  }

  setupUIElements() {
    // Find message badge elements
    this.messageBadge = document.getElementById('messageBadge') || document.getElementById('messageCount');
    this.messageIcon = document.getElementById('messageIcon') || document.querySelector('.message-icon');
    
    if (this.messageBadge) {
      this.updateMessageBadge();
    }
  }

  getCurrentUserData() {
    // Check multiple possible storage keys
    const buyerData = JSON.parse(localStorage.getItem('vendplugBuyer') || 'null');
    const vendorData = JSON.parse(localStorage.getItem('vendplugVendor') || 'null');
    const agentData = JSON.parse(localStorage.getItem('vendplugAgent') || 'null');
    
    // Return the first available user data
    return buyerData || vendorData || agentData;
  }

  async loadUnreadCount() {
    try {
      const userData = this.getCurrentUserData();
      if (!userData) return;

      const token = this.getUserToken(userData);
      if (!token) return;

      const response = await fetch(`${window.BACKEND_URL || ""}/api/chats/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.unreadCount = data.unreadCount || 0;
        this.updateMessageBadge();
      }
    } catch (error) {
      console.error('❌ Error loading unread count:', error);
    }
  }

  getUserToken(userData) {
    // Check for separate token storage first
    const buyerToken = localStorage.getItem('vendplug-buyer-token');
    const vendorToken = localStorage.getItem('vendplug-vendor-token');
    const agentToken = localStorage.getItem('vendplug-agent-token');
    
    if (buyerToken && userData.role === 'buyer') return buyerToken;
    if (vendorToken && userData.role === 'vendor') return vendorToken;
    if (agentToken && userData.role === 'agent') return agentToken;
    
    // Fallback to embedded token
    return userData.token;
  }

  updateMessageBadge() {
    if (this.messageBadge) {
      this.messageBadge.textContent = this.unreadCount;
      this.messageBadge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
    }
  }

  showMessageToast(message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'message-toast';
    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas fa-comments"></i>
        <div class="toast-text">
          <strong>New Message</strong>
          <p>${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}</p>
        </div>
      </div>
    `;
    
    // Add toast styles
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--bg-card, #1e1e1e);
      color: var(--text-light, #fff);
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1000;
      max-width: 300px;
      animation: slideIn 0.3s ease;
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .message-toast .toast-content {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .message-toast .toast-text strong {
        display: block;
        color: var(--primary, #00cc99);
        margin-bottom: 5px;
      }
      .message-toast .toast-text p {
        margin: 0;
        font-size: 0.9rem;
        opacity: 0.8;
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(toast);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 5000);
  }

  // Method to mark messages as read (call this when user opens chat)
  markAsRead() {
    this.unreadCount = 0;
    this.updateMessageBadge();
  }
}

// Initialize message notification manager
const messageNotificationManager = new MessageNotificationManager();

// Export for use in other scripts
window.messageNotificationManager = messageNotificationManager;
