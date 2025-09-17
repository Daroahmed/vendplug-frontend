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
    console.log("🔑 Token found:", token.substring(0, 10) + "...");
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
  if (localStorage.getItem("vendplug-buyer-token")) return "buyer";
  if (localStorage.getItem("vendplug-agent-token")) return "agent";
  if (localStorage.getItem("vendplug-vendor-token")) return "vendor";
  if (localStorage.getItem("vendplug-staff-token")) return "staff";
  if (localStorage.getItem("vendplug-admin-token")) return "admin";
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

// Export functions for global use
window.getAuthToken = getAuthToken;
window.getCurrentUserType = getCurrentUserType;
window.isAuthenticated = isAuthenticated;
window.redirectToLogin = redirectToLogin;
window.getCurrentUser = getCurrentUser;
window.clearAuth = clearAuth;
