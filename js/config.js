// js/config.js
window.BACKEND_URL = window.location.hostname === "localhost"
  ? "http://localhost:5015"
  : "https://api.vendplug.com.ng";

// Paystack configuration
window.PAYSTACK_PUBLIC_KEY = window.location.hostname === "localhost"
  ? "pk_test_your_test_public_key_here"
  : "pk_live_your_live_public_key_here";