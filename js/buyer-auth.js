console.log("✅ buyer-auth.js loaded");

const BACKEND = window.BACKEND_URL || "";

// Toggle logic (you must have 2 buttons or tabs with IDs below)
document.getElementById("showLoginBtn").addEventListener("click", () => {
  document.getElementById("buyerLoginForm").style.display = "block";
  document.getElementById("buyerRegisterForm").style.display = "none";
});

document.getElementById("showRegisterBtn").addEventListener("click", () => {
  document.getElementById("buyerLoginForm").style.display = "none";
  document.getElementById("buyerRegisterForm").style.display = "block";
});

// 🔐 LOGIN
document.getElementById("buyerLoginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  showLoading && showLoading();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const messageEl = document.getElementById("loginMessage");

  try {
    const res = await fetch(`${BACKEND}/api/buyers/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok && data.token) {
        localStorage.setItem("vendplug-buyer-token", data.token);
        // Store only the buyer object, not the entire response
        const buyerData = {
          _id: data._id,
          fullName: data.fullName,
          email: data.email,
          phoneNumber: data.phoneNumber,
          virtualAccount: data.virtualAccount,
          role: data.role || "buyer"
        };
        localStorage.setItem("vendplugBuyer", JSON.stringify(buyerData));
        
        // Clean up conflicting tokens after successful buyer login
        if (typeof cleanupAfterLogin === 'function') {
          cleanupAfterLogin('buyer');
        }
        
      messageEl.textContent = "Login successful!";
      messageEl.style.color = "green";
      setTimeout(() => (window.location.href = "public-buyer-home.html"), 1000);
    } else {
      // Handle specific error cases
      let errorMessage = data.message || "Login failed.";
      
      // Handle specific error codes from backend
      if (data.code === 'EMAIL_NOT_VERIFIED') {
        errorMessage = "Please verify your email to continue. Check your inbox for the verification link.";
        messageEl.innerHTML = `${errorMessage}<br><a href="verify-email.html" style="color: #00cc99; text-decoration: underline;">Resend verification email</a>`;
      } else if (res.status === 401) {
        errorMessage = "Invalid email or password. Please check your credentials.";
      } else if (res.status === 404) {
        errorMessage = "Account not found. Please check your email or register for a new account.";
      } else if (res.status === 403) {
        errorMessage = "Account access denied. Please contact support.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      }
      
      messageEl.textContent = errorMessage;
      messageEl.style.color = "red";
    }
  } catch (err) {
    console.error("❌ Login error:", err);
    
    // Handle network errors
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      messageEl.textContent = "Network error. Please check your connection and try again.";
    } else if (err.name === 'SyntaxError') {
      messageEl.textContent = "Server response error. Please try again.";
    } else {
      messageEl.textContent = "An unexpected error occurred. Please try again.";
    }
    messageEl.style.color = "red";
  } finally { hideLoading && hideLoading(); }
});

// 📝 REGISTER
document.getElementById("buyerRegisterForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  showLoading && showLoading();
  const fullName = document.getElementById("registerFullName").value;
  const email = document.getElementById("registerEmail").value;
  const phoneNumber = document.getElementById("registerPhone").value;
  const password = document.getElementById("registerPassword").value;
  const messageEl = document.getElementById("registerMessage");

  try {
    const res = await fetch(`${BACKEND}/api/buyers/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, phoneNumber, password }),
    });

    const data = await res.json();

    if (res.status === 201) {
      // Store email for verification (same as vendor/agent flow)
      localStorage.setItem('pendingVerificationEmail', email);
      localStorage.setItem('pendingVerificationRole', 'buyer');

      // Send verification email
      try {
        const verifyRes = await fetch(`${BACKEND}/api/auth/send-verification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, userType: 'buyer' })
        });

        if (verifyRes.ok) {
          messageEl.textContent = "Registration successful! Please check your email to verify your account.";
          messageEl.style.color = "green";
          setTimeout(() => (window.location.href = "verify-email.html"), 1000);
        } else {
          messageEl.textContent = "Registration successful but couldn't send verification email. Please try again.";
          messageEl.style.color = "orange";
        }
      } catch (verifyErr) {
        console.error("❌ Verification email error:", verifyErr);
        messageEl.textContent = "Registration successful but couldn't send verification email. Please try again.";
        messageEl.style.color = "orange";
      }
    } else {
      // Handle specific registration error cases
      let errorMessage = data.message || "Registration failed.";
      
      // Handle specific error cases
      if (data.message && data.message.includes("already exists")) {
        errorMessage = "An account with this email already exists. Please try logging in instead.";
      } else if (res.status === 400) {
        errorMessage = "Please check your information and try again.";
      } else if (res.status === 409) {
        errorMessage = "Account already exists. Please try logging in instead.";
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      }
      
      messageEl.textContent = errorMessage;
      messageEl.style.color = "red";
    }
  } catch (err) {
    console.error("❌ Registration error:", err);
    
    // Handle network errors
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      messageEl.textContent = "Network error. Please check your connection and try again.";
    } else if (err.name === 'SyntaxError') {
      messageEl.textContent = "Server response error. Please try again.";
    } else {
      messageEl.textContent = "An unexpected error occurred. Please try again.";
    }
    messageEl.style.color = "red";
  } finally { hideLoading && hideLoading(); }
});
