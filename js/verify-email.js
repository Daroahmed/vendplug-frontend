console.log("✅ verify-email.js loaded");

// Global variables
let BACKEND_URL = null;
let token = null;
let prefillEmail = null;
let prefillUserType = null;

// DOM elements
let statusDiv = null;
let loginLink = null;
let debugInfo = null;
let debugContent = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 DOM loaded, starting verification process...");
  
  // Get DOM elements
  statusDiv = document.getElementById('verificationStatus');
  loginLink = document.getElementById('loginLink');
  debugInfo = document.getElementById('debugInfo');
  debugContent = document.getElementById('debugContent');
  
  // Get token from URL - try multiple methods
  const urlParams = new URLSearchParams(window.location.search);
  token = urlParams.get('token');
  prefillEmail = urlParams.get('prefill');
  prefillUserType = urlParams.get('userType');
  
  // Fallback method if URLSearchParams fails
  if (!token) {
    const url = new URL(window.location.href);
    token = url.searchParams.get('token');
    console.log("🔍 Fallback token extraction:", token);
  }
  
  // Another fallback - manual parsing
  if (!token) {
    const searchString = window.location.search;
    const tokenMatch = searchString.match(/[?&]token=([^&]+)/);
    if (tokenMatch) {
      token = decodeURIComponent(tokenMatch[1]);
      console.log("🔍 Manual token extraction:", token);
    }
  }
  
  console.log("🔍 Full URL:", window.location.href);
  console.log("🔍 Search params:", window.location.search);
  console.log("🔍 URLSearchParams object:", urlParams);
  console.log("🔍 Token from URL:", token);
  console.log("🔍 Status div:", statusDiv);
  console.log("🔍 Login link:", loginLink);
  
  // Show debug info
  showDebugInfo(`Token: ${token || 'NOT FOUND'}`);
  
  if (!token) {
    // Don't show error immediately - wait a bit to see if token arrives
    console.log("⏳ No token found, waiting for token...");
    showDebugInfo("No token found, waiting for token...");
    
    // Wait a bit to see if token arrives (e.g., from email link)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check again after waiting
    const urlParams2 = new URLSearchParams(window.location.search);
    token = urlParams2.get('token');
    
    if (!token) {
      // Still no token - show helpful message
      showError('Please click the verification link from your email. If you don\'t have the email, check your spam folder or request a new verification email.');
      showLoginLink();
      return;
    }
    
    console.log("✅ Token found after waiting:", token);
    showDebugInfo(`Token found after waiting: ${token.substring(0, 20)}...`);
  }
  
  // Wait for config to load
  await waitForConfig();
  
  // Start verification
  await verifyEmail();
  // If redirected here without token, auto-resend to prefilled email
  if (!token && prefillEmail && prefillUserType) {
    showDebugInfo(`No token present. Auto-sending a new verification email to ${prefillEmail} (${prefillUserType}).`);
    try {
      await resendVerification(prefillEmail, prefillUserType);
      showSuccess('A new verification email has been sent. Please check your inbox.');
    } catch (e) {
      showError(e.message || 'Failed to resend verification email.');
    }
  }
});

// Wait for config.js to load
async function waitForConfig() {
  console.log("⏳ Waiting for config to load...");
  showDebugInfo("Waiting for config to load...");
  
  let attempts = 0;
  const maxAttempts = 50; // 5 seconds max
  
  while (!window.BACKEND_URL && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  if (window.BACKEND_URL) {
    BACKEND_URL = window.BACKEND_URL;
    console.log("✅ Config loaded:", BACKEND_URL);
    showDebugInfo(`Config loaded: ${BACKEND_URL}`);
  } else {
    throw new Error("Config failed to load after 5 seconds");
  }
}

// Main verification function
async function verifyEmail() {
  try {
    console.log("🔍 Starting email verification...");
    showDebugInfo("Starting email verification...");
    
    const verificationUrl = `${BACKEND_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    console.log("🌐 Verification URL:", verificationUrl);
    showDebugInfo(`Verification URL: ${verificationUrl}`);
    
    // Make the request
    const res = await fetch(verificationUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log("📡 Response status:", res.status);
    showDebugInfo(`Response status: ${res.status}`);
    
    const data = await res.json();
    console.log("📡 Response data:", data);
    showDebugInfo(`Response data: ${JSON.stringify(data, null, 2)}`);
    
    if (res.ok) {
      showSuccess(data.message || 'Email verified successfully! You can now log in to your account.');
    } else {
      // Offer resend option if we know the email/type
      if ((data && /invalid|expired/i.test(data.message || '')) && prefillEmail && prefillUserType) {
        await showResendCta();
      }
      throw new Error(data.message || `Verification failed with status ${res.status}`);
    }
    
  } catch (error) {
    console.error("❌ Verification error:", error);
    showError(`Error verifying email: ${error.message}`);
  }
  
  // Always show login link
  showLoginLink();
}

async function resendVerification(email, userType) {
  const res = await fetch(`${BACKEND_URL}/api/auth/send-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, userType })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Resend failed');
  }
  return true;
}

async function showResendCta() {
  if (!statusDiv) return;
  const btn = document.createElement('button');
  btn.textContent = 'Resend Verification Email';
  btn.style.marginTop = '10px';
  btn.className = 'link';
  btn.addEventListener('click', async () => {
    try {
      btn.disabled = true;
      await resendVerification(prefillEmail, prefillUserType);
      showSuccess('A new verification email has been sent. Please check your inbox.');
    } catch (e) {
      showError(e.message || 'Failed to resend verification email.');
    } finally {
      btn.disabled = false;
    }
  });
  statusDiv.appendChild(btn);
}

// Helper functions
function showDebugInfo(message) {
  if (debugInfo && debugContent) {
    debugInfo.style.display = 'block';
    debugContent.textContent = message;
  }
  console.log("🔍 Debug:", message);
}

function showSuccess(message) {
  if (statusDiv) {
    statusDiv.innerHTML = `
      <div class="message success">
        ${message}
      </div>
    `;
  }
  console.log("✅ Success:", message);
}

function showError(message) {
  if (statusDiv) {
    statusDiv.innerHTML = `
      <div class="message error">
        ${message}
      </div>
    `;
  }
  console.log("❌ Error:", message);
}

function showLoginLink() {
  if (loginLink) {
    loginLink.style.display = 'inline-block';
  }
}

// Test function to check if everything is working
window.testVerification = function() {
  console.log("🧪 Testing verification system...");
  console.log("Backend URL:", BACKEND_URL);
  console.log("Token:", token);
  console.log("Status div:", statusDiv);
  console.log("Login link:", loginLink);
  
  if (debugInfo) {
    debugInfo.style.display = 'block';
    debugContent.textContent = 'Test function called - check console for details';
  }
};
