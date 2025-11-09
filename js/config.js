// js/config.js
// Always prefer same-origin in production so cookies/paths match Nginx
(function () {
  const isLocal = window.location.hostname === "localhost";
  let backend = isLocal ? "http://localhost:5000" : window.location.origin;

  // Dev override: ?backend=http://host:port or localStorage BACKEND_URL_OVERRIDE
  try {
    const qs = new URLSearchParams(window.location.search);
    const qsBackend = qs.get('backend');
    const lsBackend = window.localStorage ? localStorage.getItem('BACKEND_URL_OVERRIDE') : null;
    if (qsBackend && /^https?:\/\//i.test(qsBackend)) backend = qsBackend;
    else if (lsBackend && /^https?:\/\//i.test(lsBackend)) backend = lsBackend;
  } catch (_) {}

  window.BACKEND_URL = backend;

  // Frontend URL for email verification links
  window.FRONTEND_URL = isLocal ? "http://localhost:5000" : window.location.origin;

  // Socket.IO configuration - always use same-origin
  window.SOCKET_URL = window.location.origin;

  // Paystack configuration
  window.PAYSTACK_PUBLIC_KEY = isLocal
    ? "pk_test_your_test_public_key_here"
    : "pk_live_your_live_public_key_here";
})();