// auth-utils.js - Smart Authentication Token Management
console.log("✅ auth-utils.js loaded");

/**
 * Get the appropriate authentication token based on current user context
 * @returns {string|null} The authentication token or null if not found
 */
function getAuthToken() {
  // Try user-specific tokens first (recommended approach)
  const buyerToken = localStorage.getItem("vendplug-buyer-token");
  const agentToken = localStorage.getItem("vendplug-agent-token");
  const vendorToken = localStorage.getItem("vendplug-vendor-token");
  const staffToken = localStorage.getItem("vendplug-staff-token");
  const adminToken = localStorage.getItem("vendplug-admin-token");
  
  // Return the first available token
  const token = buyerToken || agentToken || vendorToken || staffToken || adminToken;
  
  if (token) {
    return token;
  }
  
  // Fallback to generic token (for backward compatibility)
  const genericToken = localStorage.getItem("vendplug-token");
  if (genericToken) {
    console.log("⚠️ Using fallback generic token");
    return genericToken;
  }
  
  console.warn("❌ No authentication token found");
  return null;
}

/**
 * Get the current user type based on available tokens
 * @returns {string|null} The user type or null if not found
 */
function getCurrentUserType() {
  // Check higher privilege tokens first (admin, staff)
  if (localStorage.getItem("vendplug-admin-token")) {
    console.log("🔍 Detected admin token");
    return "admin";
  }
  if (localStorage.getItem("vendplug-staff-token")) {
    console.log("🔍 Detected staff token");
    return "staff";
  }
  // Then check regular user tokens
  if (localStorage.getItem("vendplug-buyer-token")) {
    console.log("🔍 Detected buyer token");
    return "buyer";
  }
  if (localStorage.getItem("vendplug-agent-token")) {
    console.log("🔍 Detected agent token");
    return "agent";
  }
  if (localStorage.getItem("vendplug-vendor-token")) {
    console.log("🔍 Detected vendor token");
    return "vendor";
  }
  console.log("🔍 No tokens detected");
  return null;
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is authenticated
 */
function isAuthenticated() {
  return getAuthToken() !== null;
}

/**
 * Redirect to appropriate login page based on user type
 */
function redirectToLogin() {
  const userType = getCurrentUserType();
  const loginPages = {
    buyer: "buyer-auth.html",
    agent: "agent-auth.html", 
    vendor: "vendor-auth.html",
    staff: "staff-login.html",
    admin: "admin-login.html"
  };
  
  const loginPage = loginPages[userType] || "buyer-auth.html";
  window.location.href = loginPage;
}

/**
 * Get user data from localStorage
 * @returns {Object|null} User data or null if not found
 */
function getCurrentUser() {
  const userType = getCurrentUserType();
  if (!userType) return null;
  
  // Handle different storage patterns for different user types
  let userData = null;
  if (userType === 'staff') {
    userData = localStorage.getItem('staff-info');
  } else if (userType === 'admin') {
    userData = localStorage.getItem('vendplugAdmin');
  } else {
    userData = localStorage.getItem(`vendplug${userType.charAt(0).toUpperCase() + userType.slice(1)}`);
  }
  
  return userData ? JSON.parse(userData) : null;
}

/**
 * Clear all authentication data
 */
function clearAuth() {
  localStorage.removeItem("vendplug-buyer-token");
  localStorage.removeItem("vendplug-agent-token");
  localStorage.removeItem("vendplug-vendor-token");
  localStorage.removeItem("vendplug-staff-token");
  localStorage.removeItem("vendplug-admin-token");
  localStorage.removeItem("vendplug-token"); // fallback
  localStorage.removeItem("vendplugBuyer");
  localStorage.removeItem("vendplugAgent");
  localStorage.removeItem("vendplugVendor");
  localStorage.removeItem("vendplugStaff");
  localStorage.removeItem("vendplugAdmin");
  localStorage.removeItem("staff-info"); // staff data
  localStorage.removeItem("role");
}

/**
 * Clear tokens for other user types to prevent conflicts
 * @param {string} currentUserType - The current user type to keep
 */
function clearOtherUserTokens(currentUserType) {
  const tokensToRemove = {
    buyer: ["vendplug-agent-token", "vendplug-vendor-token", "vendplug-staff-token", "vendplug-admin-token"],
    agent: ["vendplug-buyer-token", "vendplug-vendor-token", "vendplug-staff-token", "vendplug-admin-token"],
    vendor: ["vendplug-buyer-token", "vendplug-agent-token", "vendplug-staff-token", "vendplug-admin-token"],
    staff: ["vendplug-buyer-token", "vendplug-agent-token", "vendplug-vendor-token", "vendplug-admin-token"],
    admin: ["vendplug-buyer-token", "vendplug-agent-token", "vendplug-vendor-token", "vendplug-staff-token"]
  };
  
  const userDataToRemove = {
    buyer: ["vendplugAgent", "vendplugVendor", "vendplugStaff", "vendplugAdmin", "staff-info"],
    agent: ["vendplugBuyer", "vendplugVendor", "vendplugStaff", "vendplugAdmin", "staff-info"],
    vendor: ["vendplugBuyer", "vendplugAgent", "vendplugStaff", "vendplugAdmin", "staff-info"],
    staff: ["vendplugBuyer", "vendplugAgent", "vendplugVendor", "vendplugAdmin"],
    admin: ["vendplugBuyer", "vendplugAgent", "vendplugVendor", "staff-info"]
  };
  
  if (tokensToRemove[currentUserType]) {
    tokensToRemove[currentUserType].forEach(token => {
      localStorage.removeItem(token);
    });
  }
  
  if (userDataToRemove[currentUserType]) {
    userDataToRemove[currentUserType].forEach(data => {
      localStorage.removeItem(data);
    });
  }
  
  console.log(`🧹 Cleared tokens for other user types, keeping: ${currentUserType}`);
}

// Export functions for global use
window.getAuthToken = getAuthToken;
window.getCurrentUserType = getCurrentUserType;
window.isAuthenticated = isAuthenticated;
window.redirectToLogin = redirectToLogin;
window.getCurrentUser = getCurrentUser;
window.clearAuth = clearAuth;
window.clearOtherUserTokens = clearOtherUserTokens;

// Lightweight global loading overlay
;(function(){
  try {
    if (!document.getElementById('global-loading-overlay')) {
      const style = document.createElement('style');
      style.textContent = `
        .loading-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);backdrop-filter:blur(2px);display:none;align-items:center;justify-content:center;z-index:9999}
        .loading-spinner{width:56px;height:56px;border:4px solid rgba(255,255,255,0.25);border-top-color:var(--primary, #00cc99);border-radius:50%;animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
      `;
      document.head.appendChild(style);
      const overlay = document.createElement('div');
      overlay.id = 'global-loading-overlay';
      overlay.className = 'loading-overlay';
      overlay.innerHTML = '<div class="loading-spinner"></div>';
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(overlay);
      });
    }
  } catch(_){}
  window.showLoading = function(){ const el = document.getElementById('global-loading-overlay'); if (el) el.style.display = 'flex'; };
  window.hideLoading = function(){ const el = document.getElementById('global-loading-overlay'); if (el) el.style.display = 'none'; };
})();

// Minimal Web Push client helper (permission + subscribe)
window.enablePushIfPossible = async function() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const reg = await navigator.serviceWorker.ready;
    // Get server public key
    const keyRes = await fetch('/api/notifications/push/vapid-public-key');
    const { publicKey } = await keyRes.json();
    if (!publicKey) return; // push not configured

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
    const token = getAuthToken();
    await fetch('/api/notifications/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
      body: JSON.stringify(sub)
    });
  } catch (e) { console.warn('Push subscribe skipped:', e.message); }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}